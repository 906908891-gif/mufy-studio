import {
  buildMiniMaxVisionPrompt,
  inspectImageDataUrl,
  parseMiniMaxVisionContent,
} from "../../minimax-vision";
import type { MiniMaxSuggestedPreset } from "../../minimax-vision";
import {
  buildMiniMaxRevisionPrompt,
  parseMiniMaxRevisionContent,
  validateMiniMaxRevisionRequest,
} from "../../minimax-revision";
import type { MiniMaxRevisionRequest } from "../../minimax-revision";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 11_500_000;
const GLOBAL_HOST = "https://api.minimax.io";
const MAINLAND_HOST = "https://api.minimaxi.com";

const attempts = new Map<string, number[]>();

type FailureStage = "upstream-http" | "provider-code" | "provider-json" | "provider-content" | "validation" | "timeout" | "network";

function reportFailure(stage: FailureStage, details: {
  traceId?: string | null;
  httpStatus?: number;
  providerCode?: number | string;
  reason?: string;
}) {
  // Keep production diagnostics useful without ever logging the key, image,
  // prompt, or MiniMax's raw response body.
  console.warn("minimax_vlm_failure", {
    stage,
    traceId: details.traceId ?? undefined,
    httpStatus: details.httpStatus,
    providerCode: details.providerCode,
    reason: details.reason?.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 180),
  });
}

function failureResponse(error: string, stage: FailureStage, status: number, details: {
  traceId?: string | null;
  providerCode?: number | string;
  retryable?: boolean;
} = {}) {
  return response({
    error,
    failureStage: stage,
    providerCode: details.providerCode,
    retryable: Boolean(details.retryable),
    traceId: details.traceId ?? undefined,
  }, status);
}

function providerFailure(code: number | string) {
  if (code === 1004 || code === 2049) {
    return {
      error: `MiniMax API ${code}：Token Plan Key 无效、已停用，或与 Global / Mainland Host 不匹配`,
      retryable: false,
    };
  }
  if (code === 2056) {
    return {
      error: "MiniMax API 2056：本个 5 小时用量窗口已达到上限，请等待下个窗口释放",
      retryable: true,
    };
  }
  if (code === 1002) {
    return { error: "MiniMax API 1002：上游请求过于频繁，请稍后重试", retryable: true };
  }
  if (code === 1008) {
    return { error: "MiniMax API 1008：账户余额不足，请检查 Token Plan 与 Credits", retryable: false };
  }
  if ([1000, 1001, 1024, 1033].includes(Number(code))) {
    return { error: `MiniMax API ${code}：上游暂时异常，请稍后重试`, retryable: true };
  }
  return { error: `MiniMax API ${code}：请在 MiniMax 控制台检查密钥状态、套餐与额度`, retryable: false };
}

function response(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function configuration() {
  let bindings: { MINIMAX_API_KEY?: string; MINIMAX_API_HOST?: string };
  try {
    const runtime = await import("cloudflare:workers");
    bindings = runtime.env as unknown as typeof bindings;
  } catch {
    // The production Worker resolves cloudflare:workers. This fallback keeps
    // local Node previews and artifact verification usable without a secret.
    bindings = {
      MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
      MINIMAX_API_HOST: process.env.MINIMAX_API_HOST,
    };
  }
  const key = String(bindings.MINIMAX_API_KEY ?? "").trim();
  const requestedHost = String(bindings.MINIMAX_API_HOST ?? GLOBAL_HOST).replace(/\/$/, "");
  const host = requestedHost === MAINLAND_HOST ? MAINLAND_HOST : GLOBAL_HOST;
  return {
    key,
    host,
    status: {
      configured: Boolean(key),
      capability: "token-vlm",
      region: host === MAINLAND_HOST ? "mainland" : "global",
    },
  } as const;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (!origin || origin === new URL(request.url).origin) && (!fetchSite || fetchSite === "same-origin");
}

function authenticated(request: Request) {
  if (request.headers.get("oai-authenticated-user-email")) return true;
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function rateLimited(request: Request) {
  const identity = request.headers.get("oai-authenticated-user-email")
    ?? request.headers.get("cf-connecting-ip")
    ?? "owner";
  const now = Date.now();
  const recent = (attempts.get(identity) ?? []).filter((time) => now - time < 10 * 60_000);
  if (recent.length >= 10) return true;
  recent.push(now);
  attempts.set(identity, recent);
  return false;
}

export async function GET(request: Request) {
  if (!authenticated(request)) return response({ error: "请先登录站点" }, 401);
  const { status } = await configuration();
  return response(status);
}

export async function POST(request: Request) {
  if (!authenticated(request)) return response({ error: "请先登录站点" }, 401);
  if (!sameOrigin(request)) return response({ error: "请求来源不受信任" }, 403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) return response({ error: "请求必须使用 application/json" }, 415);
  if (rateLimited(request)) return response({ error: "MiniMax 调用过于频繁，请稍后再试" }, 429);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_REQUEST_BYTES) return response({ error: "请求图片过大" }, 413);

  const { key, host, status } = await configuration();
  if (!key) return response({ error: "尚未配置 MINIMAX_API_KEY", status }, 503);

  let input: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_REQUEST_BYTES) return response({ error: "请求图片过大" }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("请求格式无效");
    input = parsed as Record<string, unknown>;
  } catch (reason) {
    return response({ error: reason instanceof Error ? reason.message : "请求 JSON 无效" }, 400);
  }

  let revision: MiniMaxRevisionRequest | null = null;
  if (input.operation === "revise") {
    try {
      revision = validateMiniMaxRevisionRequest(input);
    } catch (reason) {
      return response({ error: reason instanceof Error ? reason.message : "修订请求无效" }, 400);
    }
  } else if (input.operation !== undefined) {
    return response({ error: "不支持的 MiniMax 操作" }, 400);
  }

  let image: ReturnType<typeof inspectImageDataUrl>;
  try {
    image = inspectImageDataUrl(revision?.imageDataUrl ?? input.imageDataUrl);
  } catch (reason) {
    return response({ error: reason instanceof Error ? reason.message : "图片无效" }, 400);
  }

  let prompt: string;
  let preset: MiniMaxSuggestedPreset;
  if (revision) {
    preset = revision.preset;
    prompt = buildMiniMaxRevisionPrompt(revision);
  } else {
    const mode = input.mode === "style" ? "style" : "recreate";
    const allowedPresets = new Set<MiniMaxSuggestedPreset>(["status", "message", "social", "memo", "news", "profile", "scene"]);
    preset = allowedPresets.has(input.preset as MiniMaxSuggestedPreset) ? input.preset as MiniMaxSuggestedPreset : "status";
    const local = input.localSignature && typeof input.localSignature === "object" && !Array.isArray(input.localSignature)
      ? input.localSignature as Record<string, unknown>
      : {};
    const localPalette = Array.isArray(local.palette)
      ? local.palette.filter((item): item is string => typeof item === "string" && /^#[0-9a-f]{6}$/i.test(item)).slice(0, 5)
      : [];
    prompt = buildMiniMaxVisionPrompt({
      mode,
      preset,
      width: typeof local.width === "number" ? Math.round(local.width) : undefined,
      height: typeof local.height === "number" ? Math.round(local.height) : undefined,
      localPalette,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const upstream = await fetch(`${host}/v1/coding_plan/vlm`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "mm-api-source": "Minimax-MCP",
      },
      body: JSON.stringify({ prompt, image_url: image.dataUrl }),
      signal: controller.signal,
    });
    const traceId = upstream.headers.get("trace-id");
    let data: Record<string, unknown>;
    try {
      const rawResponse = await upstream.text();
      if (rawResponse.length > 65_536) {
        reportFailure("provider-content", { traceId, reason: "response too large" });
        return failureResponse("MiniMax 返回内容过长", "provider-content", 502, { traceId });
      }
      data = JSON.parse(rawResponse) as Record<string, unknown>;
    } catch {
      reportFailure("provider-json", { traceId, httpStatus: upstream.status });
      return failureResponse(`MiniMax 返回了不可解析的响应${traceId ? `（Trace-Id: ${traceId}）` : ""}`, "provider-json", 502, { traceId, retryable: true });
    }
    if (!upstream.ok) {
      reportFailure("upstream-http", { traceId, httpStatus: upstream.status });
      const credentialFailure = upstream.status === 401 || upstream.status === 403;
      const retryable = upstream.status === 408 || upstream.status === 429 || upstream.status >= 500;
      const message = credentialFailure
        ? `MiniMax 拒绝了当前 Token Plan Key（HTTP ${upstream.status}），请确认密钥仍有效且属于国际站`
        : `MiniMax 请求失败（HTTP ${upstream.status}）${retryable ? "，请稍后重试" : ""}`;
      return failureResponse(`${message}${traceId ? `，Trace-Id: ${traceId}` : ""}`, "upstream-http", 502, { traceId, retryable });
    }
    const base = data.base_resp && typeof data.base_resp === "object" ? data.base_resp as Record<string, unknown> : {};
    if (base.status_code !== 0) {
      const code = typeof base.status_code === "number" ? base.status_code : "unknown";
      const failure = providerFailure(code);
      reportFailure("provider-code", { traceId, providerCode: code });
      return failureResponse(`${failure.error}${traceId ? `（Trace-Id: ${traceId}）` : ""}`, "provider-code", 502, {
        traceId,
        providerCode: code,
        retryable: failure.retryable,
      });
    }
    if (typeof data.content !== "string") {
      reportFailure("provider-content", { traceId, reason: "missing content" });
      return failureResponse(revision ? "MiniMax 没有返回修订内容" : "MiniMax 没有返回视觉分析内容", "provider-content", 502, { traceId, retryable: true });
    }
    if (revision) {
      try {
        return response(parseMiniMaxRevisionContent(data.content, preset));
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "MiniMax 修订结果未通过安全校验";
        reportFailure("validation", { traceId, reason: message });
        return failureResponse(`MiniMax 已连接，但修订结果未通过安全校验：${message}`, "validation", 502, { traceId, retryable: true });
      }
    }
    try {
      const spec = parseMiniMaxVisionContent(data.content);
      return response({ provider: "minimax", transmitted: true, spec, traceId: traceId ?? undefined });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "MiniMax 视觉结果未通过安全校验";
      reportFailure("validation", { traceId, reason: message });
      return failureResponse(`MiniMax 已连接，但视觉结果未通过安全校验：${message}`, "validation", 502, { traceId, retryable: true });
    }
  } catch (reason) {
    if (reason instanceof Error && reason.name === "AbortError") {
      reportFailure("timeout", { reason: "45 second timeout" });
      return failureResponse("MiniMax 图片分析超过 45 秒，请稍后重试", "timeout", 504, { retryable: true });
    }
    reportFailure("network", { reason: reason instanceof Error ? reason.message : "unknown network failure" });
    return failureResponse("网络请求未能到达 MiniMax 图片理解服务", "network", 502, { retryable: true });
  } finally {
    clearTimeout(timeout);
  }
}

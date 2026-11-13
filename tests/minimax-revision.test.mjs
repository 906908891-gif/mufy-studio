import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMiniMaxRevisionPrompt,
  parseMiniMaxRevisionContent,
  validateMiniMaxRevisionRequest,
  validateMiniMaxRevisionResult,
} from "../app/minimax-revision.ts";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2dQAAAABJRU5ErkJggg==";

function block(id, kind, field, x, y, width, height, extra = {}) {
  return {
    id, kind, field, label: "", x, y, width, height, layer: 3,
    align: "left", valign: "center", size: "md", weight: "regular",
    tone: "text", fill: "transparent", border: "none", radius: 0, icon: "none",
    ...extra,
  };
}

function socialSpec() {
  return {
    schemaVersion: 2,
    suggestedPreset: "social",
    layout: "stacked",
    typography: "modern-sans",
    density: "balanced",
    borderStyle: "hairline",
    palette: { background: "#050507", surface: "#242529", accent: "#c8c8cc", text: "#f1f1f2", muted: "#98989e", border: "#5e5e63" },
    radius: 18,
    shadowStrength: 0.64,
    styleName: "黑色磨砂动态卡",
    material: "半透明灰黑玻璃",
    summary: "左侧玻璃社交卡覆盖右侧人物素材。",
    visibleHierarchy: ["玻璃主卡", "正文", "元信息", "底部导航"],
    textRoles: ["作者", "账号", "正文", "天气", "地点温度", "时间"],
    interactionHints: ["底部导航看起来可点击"],
    limitations: ["隐藏页面无法由单张图确认"],
    confidence: 0.9,
    blueprint: {
      canvas: { aspectRatio: 1.38, minHeight: 300, maxWidth: 620, outerPadding: 6 },
      backdrop: { kind: "image-placeholder", imageSide: "right", overlay: 0.28, angle: 125 },
      blocks: [
        block("card", "panel", 0, 8, 3, 68, 94, { layer: 2, fill: "glass", border: "hairline", radius: 18 }),
        block("author", "title", 1, 12, 9, 36, 7, { size: "lg", weight: "bold" }),
        block("handle", "subtitle", 2, 12, 17, 36, 6, { size: "xs", tone: "muted" }),
        block("post", "body", 3, 12, 30, 56, 28, { valign: "top" }),
        block("weather", "meta", 4, 12, 65, 18, 6),
        block("location", "meta", 5, 42, 65, 14, 6),
        block("temperature", "meta", 6, 57, 65, 12, 6),
        block("timestamp", "meta", 7, 12, 74, 32, 6),
        block("navigation", "nav", 0, 8, 86, 68, 9, { label: "喜欢 / 上一页 / 下一页", align: "center", size: "sm" }),
      ],
      missingAssets: ["头像原图", "背景人物原图"],
    },
  };
}

function firstPage() {
  return {
    title: "动态",
    values: ["無怜", "@yunxiao", "夜里的风把没有说完的话吹回了窗边。", "大雨", "A市", "16℃", "2025-05-23 18:40"],
  };
}

function revisionRequest() {
  return {
    operation: "revise",
    imageDataUrl: png,
    currentSpec: socialSpec(),
    pages: [firstPage()],
    message: "增加第二页，点击下一页后显示人物近况；同时把卡片稍微变窄。",
    preset: "social",
  };
}

function revisionResult() {
  const spec = socialSpec();
  spec.blueprint.blocks[0].width = 62;
  return {
    schemaVersion: 1,
    reply: "已缩窄卡片并增加人物近况页，字段协议保持不变。",
    spec,
    pages: [
      firstPage(),
      {
        title: "人物近况",
        values: ["無怜", "@yunxiao", "她刚刚结束夜班，正站在旧车站的雨棚下。", "小雨", "南岸车站", "15℃", "2025-05-23 19:05"],
      },
    ],
  };
}

test("validates a bounded revision request and never puts the image bytes in the prompt", () => {
  const request = validateMiniMaxRevisionRequest(revisionRequest());
  const prompt = buildMiniMaxRevisionPrompt(request);

  assert.equal(request.preset, "social");
  assert.equal(request.pages[0].values.length, 7);
  assert.match(prompt, /同一张原图/);
  assert.match(prompt, /字段顺序固定为：1\.作者；2\.账号；3\.正文/);
  assert.match(prompt, /禁止返回 HTML、CSS、JavaScript/);
  assert.match(prompt, /增加第二页/);
  assert.doesNotMatch(prompt, /iVBORw0KGgo/);

  const withIntentionalBlank = revisionRequest();
  withIntentionalBlank.pages[0].values[3] = "";
  assert.equal(validateMiniMaxRevisionRequest(withIntentionalBlank).pages[0].values[3], "");

  const withParagraphs = revisionRequest();
  withParagraphs.pages[0].values[2] = "第一段。\n\n第二段。";
  assert.equal(validateMiniMaxRevisionRequest(withParagraphs).pages[0].values[2], "第一段。\n\n第二段。");

  const withEditorLimits = revisionRequest();
  withEditorLimits.pages[0].title = "页".repeat(40);
  withEditorLimits.pages[0].values[2] = "文".repeat(500);
  assert.equal(Array.from(validateMiniMaxRevisionRequest(withEditorLimits).pages[0].values[2]).length, 500);
});

test("parses only the strict revision result and preserves the preset protocol", () => {
  const result = revisionResult();
  const parsed = parseMiniMaxRevisionContent(`\n\`\`\`json\n${JSON.stringify(result)}\n\`\`\``, "social");

  assert.deepEqual(Object.keys(parsed), ["schemaVersion", "reply", "spec", "pages"]);
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.spec.suggestedPreset, "social");
  assert.equal(parsed.pages.length, 2);
  assert.equal(parsed.pages[1].values.length, 7);
  assert.equal(JSON.stringify(parsed).includes("<script"), false);
});

test("rejects source code, extra keys, field-count changes, and preset changes", () => {
  const valid = revisionResult();
  assert.throws(
    () => validateMiniMaxRevisionResult({ ...valid, html: "<div>bad</div>" }, "social"),
    /白名单/,
  );
  assert.throws(
    () => validateMiniMaxRevisionResult({ ...valid, pages: [{ title: "坏页面", values: ["only one"] }] }, "social"),
    /必须包含 7 个字段/,
  );
  assert.throws(
    () => validateMiniMaxRevisionResult({ ...valid, pages: [{ ...firstPage(), values: ["<script>alert(1)</script>", ...firstPage().values.slice(1)] }] }, "social"),
    /不允许的代码/,
  );
  assert.throws(
    () => validateMiniMaxRevisionResult({ ...valid, spec: { ...socialSpec(), suggestedPreset: "memo" } }, "social"),
    /不能改变组件字段协议|布局蓝图必须/,
  );
  assert.throws(
    () => validateMiniMaxRevisionRequest({ ...revisionRequest(), debug: true }),
    /白名单/,
  );
});

test("reuses the verified VLM endpoint and returns only the validated revision payload", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.MINIMAX_API_KEY;
  const originalHost = process.env.MINIMAX_API_HOST;
  try {
    process.env.MINIMAX_API_KEY = "sk-cp-test-only";
    process.env.MINIMAX_API_HOST = "https://api.minimax.io";
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "https://api.minimax.io/v1/coding_plan/vlm");
      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer sk-cp-test-only");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.image_url, png);
      assert.match(body.prompt, /受限视觉修订器/);
      assert.match(body.prompt, /增加第二页/);
      assert.doesNotMatch(body.prompt, /iVBORw0KGgo/);
      return new Response(JSON.stringify({
        content: JSON.stringify(revisionResult()),
        base_resp: { status_code: 0, status_msg: "" },
      }), {
        status: 200,
        headers: { "content-type": "application/json", "trace-id": "revision-trace" },
      });
    };
    // Vinext captures the native fetch while the built worker is imported, so
    // install the deterministic upstream stub before importing that worker.
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("revision-test", `${process.pid}-${Date.now()}`);
    const { default: worker } = await import(workerUrl.href);

    const response = await worker.fetch(new Request("http://localhost/api/minimax-vision", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify(revisionRequest()),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(Object.keys(payload), ["schemaVersion", "reply", "spec", "pages"]);
    assert.equal(payload.pages.length, 2);
    assert.equal(payload.spec.blueprint.blocks[0].width, 62);
    assert.equal(JSON.stringify(payload).includes("revision-trace"), false);
    assert.equal(JSON.stringify(payload).includes("sk-cp-test-only"), false);
    assert.equal(JSON.stringify(payload).includes(png), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.MINIMAX_API_KEY; else process.env.MINIMAX_API_KEY = originalKey;
    if (originalHost === undefined) delete process.env.MINIMAX_API_HOST; else process.env.MINIMAX_API_HOST = originalHost;
  }
});

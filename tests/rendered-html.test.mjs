import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  encryptedPayloadStatus,
  mufyXmlByteLength,
  serializeMufyCharacter,
} from "../app/mufy-character-xml.ts";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  for (const label of [
    "建卡蓝图",
    "基础信息",
    "人物内核",
    "开场设计",
    "剧情世界",
    "输出设置",
    "样例与作者注",
    "Mufy XML",
    "AI 创建",
    "MiniMax 深度识图",
    "全局美化",
    "正则",
    "小剧场",
  ]) {
    assert.match(html, new RegExp(label));
  }
});

test("keeps both AI workbench side rails equal-height on desktop and fluid on smaller screens", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media\(min-width:1041px\)\{\.ai-reference-controls,\.ai-reference-results,\.ai-results-empty\{height:min\(720px,calc\(100dvh - 115px\)\);max-height:min\(720px,calc\(100dvh - 115px\)\)/);
  assert.match(css, /@media\(max-width:1040px\).*\.ai-reference-controls,\.ai-reference-results,\.ai-results-empty\{height:auto;min-height:0;max-height:none;overflow:visible\}/);
});

test("protects the MiniMax route and reports configuration without exposing secrets", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("api-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const runtime = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    MINIMAX_API_KEY: "",
  };
  const context = { waitUntil() {}, passThroughOnException() {} };

  const unauthorized = await worker.fetch(new Request("https://studio.example/api/minimax-vision"), runtime, context);
  assert.equal(unauthorized.status, 401);

  const status = await worker.fetch(new Request("https://studio.example/api/minimax-vision", {
    headers: { "oai-authenticated-user-email": "owner@example.com" },
  }), runtime, context);
  assert.equal(status.status, 200);
  const payload = await status.json();
  assert.deepEqual(payload, { configured: false, capability: "token-vlm", region: "global" });
  assert.equal(JSON.stringify(payload).includes("MINIMAX_API_KEY"), false);

  const crossOrigin = await worker.fetch(new Request("https://studio.example/api/minimax-vision", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://evil.example",
      "oai-authenticated-user-email": "owner@example.com",
    },
    body: "{}",
  }), { ...runtime, MINIMAX_API_KEY: "not-returned" }, context);
  assert.equal(crossOrigin.status, 403);
});

test("calls the official MiniMax Token Plan VLM contract and returns only a validated spec", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("vlm-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.MINIMAX_API_KEY;
  const originalHost = process.env.MINIMAX_API_HOST;
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2dQAAAABJRU5ErkJggg==";
  const providerSpec = {
    schemaVersion: 2,
    suggestedPreset: "status",
    layout: "dashboard",
    typography: "modern-sans",
    density: "balanced",
    borderStyle: "hairline",
    palette: { background: "#111018", surface: "#221f2c", accent: "#a984f4", text: "#fffaff", muted: "#aaa0b2", border: "#685477" },
    radius: 14,
    shadowStrength: 0.5,
    styleName: "夜色状态板",
    material: "玻璃层叠与细线分区",
    summary: "顶部标题，下方两列状态信息。",
    visibleHierarchy: ["眉题", "标题", "状态卡"],
    textRoles: ["小号眉题", "大标题", "正文"],
    interactionHints: ["状态卡可能可展开，但截图无法验证"],
    limitations: ["隐藏交互未知"],
    confidence: 0.8,
    blueprint: {
      canvas: { aspectRatio: 1.2, minHeight: 320, maxWidth: 620, outerPadding: 8 },
      backdrop: { kind: "gradient", imageSide: "none", overlay: 0.3, angle: 120 },
      blocks: [
        { id: "panel", kind: "panel", field: 0, label: "", x: 5, y: 5, width: 90, height: 90, layer: 1, align: "left", valign: "top", size: "md", weight: "regular", tone: "text", fill: "glass", border: "hairline", radius: 14, icon: "none" },
        { id: "portrait", kind: "image", field: 0, label: "人物素材位", x: 66, y: 0, width: 34, height: 84, layer: 1, align: "center", valign: "center", size: "md", weight: "regular", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "portrait" },
        { id: "social-mark", kind: "symbol", field: 0, label: "", x: 6, y: 34, width: 8, height: 10, layer: 3, align: "center", valign: "center", size: "lg", weight: "regular", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "instagram" },
        { id: "plus", kind: "symbol", field: 0, label: "", x: 58, y: 20, width: 8, height: 10, layer: 3, align: "center", valign: "center", size: "lg", weight: "regular", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "none" },
        { id: "character", kind: "title", field: 1, label: "", x: 10, y: 12, width: 52, height: 12, layer: 2, align: "left", valign: "center", size: "xl", weight: "bold", tone: "text", fill: "transparent", border: "none", radius: 0, icon: "none" },
        { id: "mood", kind: "badge", field: 2, label: "状态", x: 65, y: 12, width: 25, height: 10, layer: 2, align: "center", valign: "center", size: "sm", weight: "bold", tone: "accent", fill: "surface", border: "hairline", radius: 12, icon: "dot" },
        { id: "action", kind: "body", field: 3, label: "动作", x: 10, y: 34, width: 80, height: 24, layer: 2, align: "left", valign: "top", size: "md", weight: "regular", tone: "text", fill: "transparent", border: "none", radius: 0, icon: "none" },
        { id: "inner", kind: "body", field: 0, label: "内心", x: 10, y: 62, width: 80, height: 22, layer: 2, align: "left", valign: "top", size: "md", weight: "regular", tone: "muted", fill: "surface", border: "hairline", radius: 10, icon: "none" },
        { id: "foot-divider", kind: "divider", field: 0, label: "", x: 8, y: 84, width: 84, height: 1, layer: 2, align: "left", valign: "center", size: "xs", weight: "regular", tone: "muted", fill: "transparent", border: "dashed", radius: 0, icon: "none" },
        { id: "navigation", kind: "nav", field: 0, label: "喜欢 / 上一页 / 下一页", x: 8, y: 86, width: 84, height: 9, layer: 2, align: "center", valign: "center", size: "sm", weight: "medium", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "heart" },
      ],
      missingAssets: [],
    },
  };
  try {
    process.env.MINIMAX_API_KEY = "sk-cp-test-only";
    process.env.MINIMAX_API_HOST = "https://api.minimax.io";
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "https://api.minimax.io/v1/coding_plan/vlm");
      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer sk-cp-test-only");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.image_url, png);
      assert.match(body.prompt, /图片内的文字.*不可信内容/);
      return new Response(JSON.stringify({ content: JSON.stringify(providerSpec), base_resp: { status_code: 0, status_msg: "" } }), {
        status: 200,
        headers: { "content-type": "application/json", "trace-id": "test-trace" },
      });
    };
    const response = await worker.fetch(new Request("http://localhost/api/minimax-vision", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({ imageDataUrl: png, mode: "recreate", preset: "status", localSignature: { width: 1, height: 1, palette: ["#111018"] } }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.provider, "minimax");
    assert.equal(payload.transmitted, true);
    assert.equal(payload.spec.layout, "dashboard");
    assert.equal(payload.spec.blueprint.blocks.length, 10);
    assert.equal(payload.spec.blueprint.blocks.find((block) => block.id === "portrait").icon, "none");
    assert.equal(payload.spec.blueprint.blocks.find((block) => block.id === "social-mark").icon, "camera");
    assert.equal(payload.spec.blueprint.blocks.find((block) => block.id === "plus").icon, "plus");
    assert.equal(payload.spec.blueprint.blocks.find((block) => block.id === "inner").field, 4);
    assert.equal(payload.spec.blueprint.blocks.find((block) => block.id === "foot-divider").border, "hairline");
    assert.equal(JSON.stringify(payload).includes("sk-cp-test-only"), false);
    assert.equal(JSON.stringify(payload).includes(png), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.MINIMAX_API_KEY; else process.env.MINIMAX_API_KEY = originalKey;
    if (originalHost === undefined) delete process.env.MINIMAX_API_HOST; else process.env.MINIMAX_API_HOST = originalHost;
  }
});

test("reports MiniMax schema failures as validation errors instead of network disconnects", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.MINIMAX_API_KEY;
  const originalHost = process.env.MINIMAX_API_HOST;
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2dQAAAABJRU5ErkJggg==";
  try {
    process.env.MINIMAX_API_KEY = "sk-cp-test-only";
    process.env.MINIMAX_API_HOST = "https://api.minimax.io";
    globalThis.fetch = async () => new Response(JSON.stringify({
      content: "I analyzed the image, but did not return JSON.",
      base_resp: { status_code: 0, status_msg: "" },
    }), {
      status: 200,
      headers: { "content-type": "application/json", "trace-id": "validation-trace" },
    });
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("validation-test", `${process.pid}-${Date.now()}`);
    const { default: worker } = await import(workerUrl.href);
    const response = await worker.fetch(new Request("http://localhost/api/minimax-vision", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({ imageDataUrl: png, mode: "recreate", preset: "status" }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, 502);
    const payload = await response.json();
    assert.equal(payload.failureStage, "validation");
    assert.equal(payload.retryable, true);
    assert.match(payload.error, /MiniMax 已连接/);
    assert.doesNotMatch(payload.error, /无法连接|未能到达/);
    assert.equal(payload.traceId, "validation-trace");
    assert.equal(JSON.stringify(payload).includes("sk-cp-test-only"), false);
    assert.equal(JSON.stringify(payload).includes(png), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.MINIMAX_API_KEY; else process.env.MINIMAX_API_KEY = originalKey;
    if (originalHost === undefined) delete process.env.MINIMAX_API_HOST; else process.env.MINIMAX_API_HOST = originalHost;
  }
});

test("serializes the verified Mufy v1 character shape deterministically", () => {
  const payload = Buffer.from(JSON.stringify({
    salt: "a".repeat(32),
    iv: "b".repeat(32),
    ciphertext: "c".repeat(32),
  })).toString("base64");
  const xml = serializeMufyCharacter({
    version: "1",
    type: "single",
    metadata: {
      name: "莫与他 ]]> 测试",
      genderCode: "1",
      genderText: "男性",
      age: "25",
      nsfw: false,
      oc: true,
      ai: false,
      cardType: "single",
      contentType: "OC",
      camera: false,
    },
    tags: ["动作/冒险", "A,B"],
    introduction: "角色介绍",
    greeting: "招呼语",
    cognition: "默认认知",
    authorTitle: "标题",
    authorNote: "作者的话",
    theaterPayload: payload,
    persona: "人设",
    adversity: "逆境处理",
    visibility: "2",
    stylePayload: payload,
  });

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<mufy-character version="1" type="single">/);
  assert.match(xml, /<名称><!\[CDATA\[莫与他 \]\]\]\]><!\[CDATA\[> 测试\]\]><\/名称>/);
  assert.ok(xml.indexOf("<小剧场>") < xml.indexOf("<人设>"));
  assert.ok(xml.indexOf("<可见性>") < xml.indexOf("<美化>"));
  assert.match(xml, /<NSFW>false<\/NSFW>/);
  assert.match(xml, /<OC>true<\/OC>/);
  assert.equal(xml.endsWith("\n"), true);
  assert.equal(encryptedPayloadStatus(payload), "preserved");
  assert.equal(encryptedPayloadStatus(Buffer.from("not an envelope").toString("base64")), "invalid");
  assert.equal(mufyXmlByteLength("角色"), 6);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMiniMaxVisionPrompt,
  inspectImageDataUrl,
  mergeMiniMaxVisionSignature,
  parseMiniMaxVisionContent,
  validateMiniMaxVisionSpec,
} from "../app/minimax-vision.ts";

const validSpec = {
  schemaVersion: 2,
  suggestedPreset: "profile",
  layout: "split",
  typography: "serif-editorial",
  density: "airy",
  borderStyle: "hairline",
  palette: {
    background: "#121119",
    surface: "#221d31",
    accent: "#8f70ea",
    text: "#f5f1ff",
    muted: "#aaa0be",
    border: "#55436f",
  },
  radius: 18,
  shadowStrength: 0.62,
  styleName: "暗夜杂志",
  material: "半透明玻璃与细线分区",
  summary: "左侧视觉锚点，右侧标题与正文形成清晰两栏层级。",
  visibleHierarchy: ["英文眉题", "大号姓名", "正文信息"],
  textRoles: ["小号元信息", "大标题", "两段正文"],
  interactionHints: ["右上角圆点看起来可能可点击"],
  limitations: ["单张图无法确认点击后的隐藏状态"],
  confidence: 0.83,
  blueprint: {
    canvas: { aspectRatio: 1.2, minHeight: 320, maxWidth: 620, outerPadding: 8 },
    backdrop: { kind: "gradient", imageSide: "right", overlay: 0.32, angle: 120 },
    blocks: [
      { id: "panel", kind: "panel", field: 0, label: "", x: 5, y: 5, width: 70, height: 90, layer: 2, align: "left", valign: "top", size: "md", weight: "regular", tone: "text", fill: "glass", border: "hairline", radius: 18, icon: "none" },
      { id: "name", kind: "title", field: 1, label: "", x: 12, y: 12, width: 45, height: 12, layer: 3, align: "left", valign: "center", size: "xl", weight: "bold", tone: "text", fill: "transparent", border: "none", radius: 0, icon: "none" },
      { id: "identity", kind: "subtitle", field: 2, label: "", x: 12, y: 25, width: 45, height: 8, layer: 3, align: "left", valign: "center", size: "sm", weight: "medium", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "none" },
      { id: "bio", kind: "body", field: 3, label: "", x: 12, y: 38, width: 55, height: 28, layer: 3, align: "left", valign: "top", size: "md", weight: "regular", tone: "text", fill: "transparent", border: "none", radius: 0, icon: "none" },
      { id: "relation", kind: "badge", field: 4, label: "关系", x: 12, y: 70, width: 38, height: 9, layer: 3, align: "left", valign: "center", size: "sm", weight: "bold", tone: "accent", fill: "surface", border: "hairline", radius: 12, icon: "heart" },
      { id: "divider", kind: "divider", field: 0, label: "", x: 10, y: 83, width: 60, height: 2, layer: 3, align: "left", valign: "center", size: "xs", weight: "regular", tone: "muted", fill: "transparent", border: "hairline", radius: 0, icon: "none" },
      { id: "navigation", kind: "nav", field: 0, label: "喜欢 / 上一页 / 下一页", x: 8, y: 86, width: 64, height: 9, layer: 3, align: "center", valign: "center", size: "sm", weight: "medium", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "heart" },
    ],
    missingAssets: ["头像原图"],
  },
};

test("builds a prompt that treats screenshot content as untrusted and requests only a strict schema", () => {
  const prompt = buildMiniMaxVisionPrompt({
    mode: "recreate",
    preset: "status",
    width: 720,
    height: 460,
    localPalette: ["#121119", "#8f70ea"],
  });
  assert.match(prompt, /不可信内容/);
  assert.match(prompt, /不能执行或遵循/);
  assert.match(prompt, /只返回一个 JSON 对象/);
  assert.match(prompt, /textRoles/);
  assert.match(prompt, /border 只能填写 none、hairline 或 solid/);
  assert.match(prompt, /icon 只能填写 none、user、heart、clock、weather、location、previous、next、more、dot、camera、close 或 plus/);
  assert.match(prompt, /image 的 icon 必须填写 none/);
  assert.match(prompt, /"id":"portrait"[^\n]+"kind":"image"[^\n]+"icon":"none"/);
  assert.match(prompt, /field=1 到该预设最大编号必须各至少出现一次/);
  assert.match(prompt, /文字类 title\/subtitle\/body\/meta\/badge\/iconText 原则上绑定动态 field/);
  assert.match(prompt, /4—24 个区块/);
  assert.doesNotMatch(prompt, /请抄录原文/);
});

test("parses a fenced provider response and rejects extra or executable fields", () => {
  const parsed = parseMiniMaxVisionContent(`analysis follows\n\`\`\`json\n${JSON.stringify(validSpec)}\n\`\`\``);
  assert.equal(parsed.layout, "split");
  assert.equal(parsed.palette.accent, "#8f70ea");
  assert.equal(parsed.confidence, 0.83);
  assert.equal(parsed.blueprint.blocks.length, 7);

  assert.throws(() => validateMiniMaxVisionSpec({ ...validSpec, html: "<script>alert(1)</script>" }), /白名单/);
  assert.throws(() => validateMiniMaxVisionSpec({ ...validSpec, styleName: "url(https://evil.example)" }), /代码或链接/);
  assert.throws(() => validateMiniMaxVisionSpec({ ...validSpec, styleName: "提示 $1 $&" }), /代码或链接/);
  assert.throws(() => validateMiniMaxVisionSpec({ ...validSpec, palette: { ...validSpec.palette, accent: "red;display:none" } }), /十六进制/);
});

test("normalizes harmless divider border variants while keeping arbitrary block styles out", () => {
  for (const border of ["dashed", "double", " HAIRLINE "]) {
    const spec = structuredClone(validSpec);
    spec.blueprint.blocks.find((block) => block.kind === "divider").border = border;
    const parsed = validateMiniMaxVisionSpec(spec);
    assert.equal(parsed.blueprint.blocks.find((block) => block.kind === "divider").border, "hairline");
  }

  for (const border of ["dashed", "double", "groove", "1px solid red", "url(https://evil.example)"]) {
    const spec = structuredClone(validSpec);
    spec.blueprint.blocks[0].border = border;
    assert.throws(() => validateMiniMaxVisionSpec(spec), /panel\.border 不受支持/);
  }
});

test("canonicalizes bounded icon aliases without admitting arbitrary icon code", () => {
  for (const icon of ["portrait", "profile", "avatar", "photo", "image", "picture", "media", "instagram", " USER "]) {
    const spec = structuredClone(validSpec);
    Object.assign(spec.blueprint.blocks[0], { id: "portrait", kind: "image", label: "人物素材位", icon });
    const parsed = validateMiniMaxVisionSpec(spec);
    assert.equal(parsed.blueprint.blocks.find((block) => block.id === "portrait").icon, "none");
  }

  for (const icon of ["portrait", "profile", "avatar", "person", "account", " USER-CIRCLE "]) {
    const spec = structuredClone(validSpec);
    Object.assign(spec.blueprint.blocks[0], { id: "avatar", kind: "avatar", label: "头像素材位", icon });
    const parsed = validateMiniMaxVisionSpec(spec);
    assert.equal(parsed.blueprint.blocks.find((block) => block.id === "avatar").icon, "user");
  }

  for (const [raw, canonical] of [["instagram", "camera"], ["social", "camera"], ["cross", "close"], ["x", "close"], ["add", "plus"], ["+", "plus"]]) {
    const spec = structuredClone(validSpec);
    Object.assign(spec.blueprint.blocks[0], { id: "fixed-symbol", kind: "symbol", label: "", icon: raw });
    const parsed = validateMiniMaxVisionSpec(spec);
    assert.equal(parsed.blueprint.blocks.find((block) => block.id === "fixed-symbol").icon, canonical);
  }

  for (const [id, label, canonical] of [["plus", "", "plus"], ["cross-mark", "", "close"], ["social-mark", "", "camera"], ["fixed-symbol", "+", "plus"]]) {
    const inferredSymbol = structuredClone(validSpec);
    Object.assign(inferredSymbol.blueprint.blocks[0], { id, kind: "symbol", label, icon: "none" });
    const parsed = validateMiniMaxVisionSpec(inferredSymbol);
    assert.equal(parsed.blueprint.blocks.find((block) => block.id === id).icon, canonical);
  }

  const unknownEmptySymbol = structuredClone(validSpec);
  Object.assign(unknownEmptySymbol.blueprint.blocks[0], { id: "fixed-symbol", kind: "symbol", label: "", icon: "none" });
  assert.throws(() => validateMiniMaxVisionSpec(unknownEmptySymbol), /fixed-symbol\.icon 必须是可见固定符号/);

  const nearMatchSymbol = structuredClone(validSpec);
  Object.assign(nearMatchSymbol.blueprint.blocks[0], { id: "plus-note", kind: "symbol", label: "plus more", icon: "none" });
  assert.throws(() => validateMiniMaxVisionSpec(nearMatchSymbol), /plus-note\.icon 必须是可见固定符号/);

  for (const icon of ["sparkle", "url(https://evil.example)", "</i><script>alert(1)</script>", "plus;background:red"]) {
    const maliciousSymbol = structuredClone(validSpec);
    Object.assign(maliciousSymbol.blueprint.blocks[0], { id: "plus", kind: "symbol", label: "", icon });
    assert.throws(() => validateMiniMaxVisionSpec(maliciousSymbol), /plus\.icon 不受支持/);
  }

  for (const icon of ["sparkle", "url(https://evil.example)", "</i><script>alert(1)</script>", "user;background:red"]) {
    const spec = structuredClone(validSpec);
    Object.assign(spec.blueprint.blocks[0], { id: "portrait", kind: "image", label: "人物素材位", icon });
    assert.throws(() => validateMiniMaxVisionSpec(spec), /portrait\.icon 不受支持/);
  }
});

test("repairs missing fields from safe visible text blocks in visual order", () => {
  const spec = structuredClone(validSpec);
  const originalOrder = spec.blueprint.blocks.map((block) => block.id);
  const identity = spec.blueprint.blocks.find((block) => block.id === "identity");
  const relation = spec.blueprint.blocks.find((block) => block.id === "relation");
  Object.assign(identity, { field: 0, label: "身份", y: 70 });
  Object.assign(relation, { field: 0, label: "关系", y: 20 });

  const first = validateMiniMaxVisionSpec(spec);
  const second = validateMiniMaxVisionSpec(spec);
  assert.deepEqual(first, second);
  assert.deepEqual(first.blueprint.blocks.map((block) => block.id), originalOrder);
  assert.equal(first.blueprint.blocks.find((block) => block.id === "relation").field, 2);
  assert.equal(first.blueprint.blocks.find((block) => block.id === "identity").field, 4);
  assert.equal(identity.field, 0);
  assert.equal(relation.field, 0);
  assert.deepEqual([...new Set(first.blueprint.blocks.map((block) => block.field).filter(Boolean))].sort(), [1, 2, 3, 4]);

  const withoutCandidate = structuredClone(validSpec);
  withoutCandidate.blueprint.blocks = withoutCandidate.blueprint.blocks.filter((block) => block.id !== "relation");
  assert.throws(() => validateMiniMaxVisionSpec(withoutCandidate), /缺少 \$4，且没有足够的可复用可见文字区块/);
});

test("accepts detailed blueprints up to twenty-four bounded blocks", () => {
  const detailed = structuredClone(validSpec);
  for (let index = 0; index < 17; index += 1) {
    detailed.blueprint.blocks.push({
      id: `decoration-${index}`,
      kind: "decoration",
      field: 0,
      label: "",
      x: index % 10,
      y: 88 + index % 4,
      width: 2,
      height: 2,
      layer: 1,
      align: "left",
      valign: "center",
      size: "xs",
      weight: "regular",
      tone: "muted",
      fill: "transparent",
      border: "none",
      radius: 0,
      icon: "none",
    });
  }
  assert.equal(detailed.blueprint.blocks.length, 24);
  assert.equal(validateMiniMaxVisionSpec(detailed).blueprint.blocks.length, 24);

  detailed.blueprint.blocks.push({ ...detailed.blueprint.blocks.at(-1), id: "decoration-over-limit" });
  assert.throws(() => validateMiniMaxVisionSpec(detailed), /4—24 个区块（收到 25 个）/);
});

test("validates an actual PNG data URL by magic bytes and dimensions", () => {
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2dQAAAABJRU5ErkJggg==";
  const inspected = inspectImageDataUrl(png);
  assert.equal(inspected.mime, "image/png");
  assert.equal(inspected.width, 1);
  assert.equal(inspected.height, 1);
  assert.throws(() => inspectImageDataUrl(png.replace("image/png", "image/jpeg")), /声明格式/);
  assert.throws(() => inspectImageDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="), /PNG、JPEG 或 WebP/);
});

test("merges only validated MiniMax tokens into a local signature", () => {
  const signature = {
    palette: ["#000000"],
    background: "#000000",
    surface: "#111111",
    accent: "#ffffff",
    text: "#ffffff",
    muted: "#999999",
    border: "#333333",
    radius: 8,
    styleName: "本地",
    material: "本地材质",
  };
  const merged = mergeMiniMaxVisionSignature(signature, validateMiniMaxVisionSpec(validSpec));
  assert.equal(merged.layout, undefined);
  assert.equal(merged.vision.layout, "split");
  assert.equal(merged.accent, "#8f70ea");
  assert.equal(merged.radius, 18);
});

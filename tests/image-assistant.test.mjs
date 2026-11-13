import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzePixelData,
  buildImageAssistantArtifact,
  createGlobalBeautyCss,
  previewImageAssistantArtifact,
} from "../app/image-assistant.ts";
import { createMufyRegexImportFile } from "../app/mufy-regex-json.ts";
import { isMufyReplacementReady } from "../app/mufy-regex-format.ts";
import { generatePattern } from "../app/mufy-regex-pattern.ts";
import { mergeMiniMaxVisionSignature, validateMiniMaxVisionSpec } from "../app/minimax-vision.ts";

function darkReferencePixels() {
  const colors = [
    [18, 15, 27, 255], [18, 15, 27, 255], [125, 54, 211, 255], [200, 255, 90, 255],
    [18, 15, 27, 255], [35, 29, 43, 255], [125, 54, 211, 255], [18, 15, 27, 255],
    [18, 15, 27, 255], [35, 29, 43, 255], [200, 255, 90, 255], [18, 15, 27, 255],
    [18, 15, 27, 255], [18, 15, 27, 255], [35, 29, 43, 255], [18, 15, 27, 255],
  ];
  return new Uint8ClampedArray(colors.flat());
}

function blueprintBlock(id, kind, field, x, y, width, height, extra = {}) {
  return {
    id, kind, field, label: "", x, y, width, height, layer: 3,
    align: "left", valign: "center", size: "md", weight: "regular",
    tone: "text", fill: "transparent", border: "none", radius: 0, icon: "none",
    ...extra,
  };
}

function fourFieldBlueprint() {
  return {
    canvas: { aspectRatio: 1.2, minHeight: 320, maxWidth: 620, outerPadding: 8 },
    backdrop: { kind: "gradient", imageSide: "right", overlay: 0.3, angle: 120 },
    blocks: [
      blueprintBlock("panel", "panel", 0, 5, 5, 70, 90, { layer: 2, fill: "glass", border: "hairline", radius: 16 }),
      blueprintBlock("primary", "title", 1, 12, 12, 50, 10, { size: "xl", weight: "bold" }),
      blueprintBlock("secondary", "subtitle", 2, 12, 25, 48, 8, { size: "sm", tone: "muted" }),
      blueprintBlock("content", "body", 3, 12, 38, 54, 28, { valign: "top" }),
      blueprintBlock("extra", "badge", 4, 12, 70, 40, 9, { label: "状态", tone: "accent", fill: "surface", border: "hairline", radius: 12 }),
      blueprintBlock("divider", "divider", 0, 10, 82, 60, 2, { border: "hairline" }),
      blueprintBlock("navigation", "nav", 0, 8, 86, 64, 9, { label: "喜欢 / 上一页 / 下一页", align: "center", size: "sm" }),
    ],
    missingAssets: ["头像原图"],
  };
}

function socialPagedVision() {
  return validateMiniMaxVisionSpec({
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
    summary: "两页社交动态卡，共用同一套安全布局。",
    visibleHierarchy: ["玻璃主卡", "身份栏", "正文", "元信息", "三栏导航"],
    textRoles: ["作者", "账号", "正文", "天气", "地点温度", "时间"],
    interactionHints: ["底部操作栏看起来可以翻页"],
    limitations: ["第二页内容需要用户补充"],
    confidence: 0.9,
    blueprint: {
      canvas: { aspectRatio: 1.38, minHeight: 300, maxWidth: 620, outerPadding: 6 },
      backdrop: { kind: "image-placeholder", imageSide: "right", overlay: 0.28, angle: 125 },
      blocks: [
        blueprintBlock("card", "panel", 0, 8, 3, 68, 94, { layer: 2, fill: "glass", border: "hairline", radius: 18 }),
        blueprintBlock("author", "title", 1, 12, 9, 36, 7, { size: "lg", weight: "bold" }),
        blueprintBlock("handle", "subtitle", 2, 12, 17, 36, 6, { size: "xs", tone: "muted" }),
        blueprintBlock("post", "body", 3, 12, 30, 56, 28, { valign: "top" }),
        blueprintBlock("weather", "meta", 4, 12, 65, 18, 6, { tone: "muted" }),
        blueprintBlock("location", "meta", 5, 42, 65, 14, 6, { tone: "muted" }),
        blueprintBlock("temperature", "meta", 6, 57, 65, 12, 6, { tone: "muted" }),
        blueprintBlock("timestamp", "meta", 7, 12, 74, 32, 6, { tone: "muted" }),
        blueprintBlock("navigation", "nav", 0, 8, 86, 64, 9, { label: "喜欢 / 上一页 / 下一页", align: "center", size: "sm" }),
      ],
      missingAssets: ["头像原图"],
    },
  });
}

test("extracts a stable visual signature from local image pixels", () => {
  const signature = analyzePixelData(darkReferencePixels(), 4, 4);
  assert.equal(signature.width, 4);
  assert.equal(signature.height, 4);
  assert.equal(signature.background.startsWith("#"), true);
  assert.equal(signature.palette.length >= 3, true);
  assert.equal(signature.radius >= 10 && signature.radius <= 24, true);
  assert.match(signature.styleName, /暗夜|深色/);
});

test("builds a safe source-identical image artifact with ordered captures", () => {
  const signature = analyzePixelData(darkReferencePixels(), 4, 4);
  const artifact = buildImageAssistantArtifact({
    mode: "recreate",
    preset: "status",
    signature,
    referenceName: "reference.png",
    timing: "每次回复结束时",
  });
  const pattern = generatePattern(artifact.draft.target, "component");
  const match = new RegExp(pattern).exec(artifact.draft.sample);

  assert.ok(match);
  assert.equal(match.length, 5);
  assert.deepEqual(match.slice(1), ["许知遥", "克制的期待", "倚在窗边等待末班车", "希望今晚能把没说完的话说完。"]);
  assert.match(artifact.draft.target, /^<CharacterStatus>/);
  assert.match(artifact.draft.variableMap, /\$1 \| <Character>/);
  assert.match(artifact.draft.instruction, /高级|输出|标签名称/);
  assert.match(artifact.draft.beautifierInvocation, /不是 JavaScript 或可执行脚本/);
  assert.match(artifact.globalBeautifierInvocation, /全局美化助手/);
  assert.match(artifact.globalBeautifierInvocation, /不修改正则、XML/);
  assert.doesNotMatch(artifact.draft.name, /高还原|一模一样/);
  assert.match(artifact.fidelityNote, /未识别或还原原布局/);
  assert.match(artifact.fidelityNote, /动态字段仍依赖 AI 遵守纯文本约束/);

  const replacement = artifact.draft.replacement;
  assert.equal((replacement.match(/```/g) ?? []).length, 2);
  assert.doesNotMatch(replacement, /<script\b|<iframe\b|<form\b|\son\w+\s*=|javascript:|window\.parent/i);
  assert.doesNotMatch(replacement, /<[^>]*\$[1-9]/);
  assert.match(replacement, /@media\(max-width:520px\)/);
  assert.match(replacement, /prefers-reduced-motion/);

  const preview = previewImageAssistantArtifact(artifact);
  assert.match(preview, /Content-Security-Policy/);
  assert.match(preview, /许知遥/);
  assert.doesNotMatch(preview, /\$[1-4]/);
});

test("materializes editor text into a safe fixed-theater document without dynamic tokens", () => {
  const signature = analyzePixelData(darkReferencePixels(), 4, 4);
  const artifact = buildImageAssistantArtifact({
    mode: "recreate",
    preset: "status",
    signature,
    pages: [{
      id: "page-1",
      title: "固定页",
      values: [
        "A&B <img src=x onerror=alert(1)>",
        "原样 $1 / $10 / $& / $$",
        "第一行\n\n第二行",
        "```html\nBAD\n``` 与 `反引号`",
      ],
    }],
  });

  assert.equal(isMufyReplacementReady(artifact.fixedReplacement), true);
  assert.equal((artifact.fixedReplacement.match(/^```html$/gm) ?? []).length, 1);
  assert.equal((artifact.fixedReplacement.match(/^```$/gm) ?? []).length, 1);
  assert.doesNotMatch(artifact.fixedReplacement, /\$\d+|```html\nBAD|<img\b/i);
  assert.match(artifact.fixedReplacement, /A&amp;B &lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(artifact.fixedReplacement, /&#36;1 \/ &#36;10 \/ &#36;&amp; \/ &#36;&#36;/);
  assert.match(artifact.fixedReplacement, /&#96;&#96;&#96;html/);
  assert.match(artifact.fixedReplacement, /第一行\n\n第二行/);
  assert.match(artifact.fixedReplacement, /white-space:pre-wrap/);

  const fixedPreview = previewImageAssistantArtifact(artifact, "fixed");
  assert.match(fixedPreview, /Content-Security-Policy/);
  assert.doesNotMatch(fixedPreview, /\$\d+|<img\b/i);
});

test("exports the verified seven-field Mufy JSON without assistant-only metadata", () => {
  const signature = analyzePixelData(darkReferencePixels(), 4, 4);
  const artifact = buildImageAssistantArtifact({ mode: "style", preset: "memo", signature });
  const file = createMufyRegexImportFile({
    name: artifact.draft.name,
    pattern: generatePattern(artifact.draft.target, "component"),
    flags: "g",
    replacement: artifact.draft.replacement,
    enabled: true,
    visibility: false,
    target: artifact.draft.target,
  });
  assert.equal(Array.isArray(file), true);
  assert.deepEqual(Object.keys(file[0]), ["ruleName", "regexPattern", "replaceString", "enabled", "visibility", "mode", "targetSymbol"]);
  assert.equal(file[0].mode, 1);
  assert.equal(file[0].visibility, false);
  assert.equal(file[0].replaceString, artifact.draft.replacement);
});

test("compiles MiniMax vision into allowlisted layout CSS without changing the four-field protocol", () => {
  const local = analyzePixelData(darkReferencePixels(), 4, 4);
  const vision = validateMiniMaxVisionSpec({
    schemaVersion: 2,
    suggestedPreset: "status",
    layout: "editorial",
    typography: "serif-editorial",
    density: "dense",
    borderStyle: "double",
    palette: { background: "#101018", surface: "#221f2c", accent: "#d7b8ff", text: "#fffaff", muted: "#aaa0b2", border: "#685477" },
    radius: 12,
    shadowStrength: 0.55,
    styleName: "暗夜编辑部",
    material: "双线边框和纸感分区",
    summary: "纵向编辑式层级，标题左对齐。",
    visibleHierarchy: ["眉题", "主标题", "信息卡"],
    textRoles: ["英文眉题", "大号中文标题"],
    interactionHints: ["卡片看起来可展开，但无法从截图验证"],
    limitations: ["隐藏状态未知"],
    confidence: 0.78,
    blueprint: fourFieldBlueprint(),
  });
  const artifact = buildImageAssistantArtifact({
    mode: "recreate",
    preset: "status",
    signature: mergeMiniMaxVisionSignature(local, vision),
  });
  const replacement = artifact.draft.replacement;
  assert.match(replacement, /mufy-recon-v2--status/);
  assert.match(replacement, /mufy-recon-v2__block--primary/);
  assert.match(replacement, /aspect-ratio:1\.2/);
  assert.match(replacement, /mufy-recon-v2__align-right\{text-align:right;justify-content:flex-end\}/);
  assert.match(replacement, /mufy-recon-v2__valign-top\{align-items:flex-start\}/);
  assert.doesNotMatch(replacement, /@media\(max-width:520px\)[^}]*min-height/);
  assert.doesNotMatch(replacement, /REFERENCE \/|mufy-vision-v1__memo/);
  assert.match(artifact.visionReport, /MiniMax 结论/);
  assert.match(artifact.fidelityNote, /分析置信度 78%/);
  assert.equal(new RegExp(generatePattern(artifact.draft.target, "component")).exec(artifact.draft.sample)?.length, 5);
  assert.doesNotMatch(replacement, /隐藏状态未知|卡片看起来可展开/);
  assert.deepEqual(Array.from(replacement.matchAll(/\$([1-9]\d*)/g), (match) => match[1]).sort(), ["1", "2", "3", "4"]);
  assert.doesNotMatch(replacement, /\$[&`']/);
  assert.doesNotMatch(replacement, /<script\b|javascript:|window\.parent/i);
});

test("keeps the selected component family when style-mode auto adoption is off", () => {
  const local = analyzePixelData(darkReferencePixels(), 4, 4);
  const socialVision = validateMiniMaxVisionSpec({
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
    summary: "社交动态卡结构。",
    visibleHierarchy: ["主卡"],
    textRoles: ["正文"],
    interactionHints: ["无"],
    limitations: ["素材待补"],
    confidence: 0.9,
    blueprint: {
      canvas: { aspectRatio: 1.38, minHeight: 300, maxWidth: 620, outerPadding: 6 },
      backdrop: { kind: "image-placeholder", imageSide: "right", overlay: 0.28, angle: 125 },
      blocks: [
        blueprintBlock("card", "panel", 0, 8, 3, 68, 94, { layer: 2, fill: "glass", border: "hairline", radius: 18 }),
        blueprintBlock("author", "title", 1, 12, 9, 36, 7),
        blueprintBlock("handle", "subtitle", 2, 12, 17, 36, 6),
        blueprintBlock("post", "body", 3, 12, 30, 56, 28),
        blueprintBlock("weather", "meta", 4, 12, 65, 18, 6),
        blueprintBlock("location", "meta", 5, 42, 65, 14, 6),
        blueprintBlock("temperature", "meta", 6, 57, 65, 12, 6),
        blueprintBlock("timestamp", "meta", 7, 12, 74, 32, 6),
      ],
      missingAssets: ["头像原图"],
    },
  });
  const artifact = buildImageAssistantArtifact({
    mode: "style",
    preset: "memo",
    signature: mergeMiniMaxVisionSignature(local, socialVision),
  });

  assert.equal(artifact.preset, "memo");
  assert.match(artifact.draft.target, /^<StoryMemo>/);
  assert.match(artifact.draft.replacement, /mufy-vision-v1__memo/);
  assert.doesNotMatch(artifact.draft.replacement, /mufy-recon-v2|\$5/);
  assert.match(artifact.fidelityNote, /没有被静默覆盖/);
});

test("reconstructs a social glass card from geometry instead of falling back to the memo preset", () => {
  const local = analyzePixelData(darkReferencePixels(), 4, 4);
  const vision = validateMiniMaxVisionSpec({
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
    material: "半透明灰黑玻璃与竖向高光",
    summary: "左侧玻璃社交卡覆盖右侧人物素材，分为身份、正文、元信息与底部导航。",
    visibleHierarchy: ["背景人物", "玻璃主卡", "身份栏", "正文", "元信息", "三栏导航"],
    textRoles: ["作者", "账号", "正文", "天气", "地点温度", "时间"],
    interactionHints: ["底部三个项目看起来可点击，但截图不能证明行为"],
    limitations: ["头像与人物原图需要用户补充"],
    confidence: 0.9,
    blueprint: {
      canvas: { aspectRatio: 1.38, minHeight: 300, maxWidth: 620, outerPadding: 6 },
      backdrop: { kind: "image-placeholder", imageSide: "right", overlay: 0.28, angle: 125 },
      blocks: [
        blueprintBlock("portrait", "image", 0, 66, 0, 34, 88, { layer: 1, label: "人物素材位", tone: "muted", icon: "portrait" }),
        blueprintBlock("card", "panel", 0, 8, 3, 68, 94, { layer: 2, fill: "glass", border: "hairline", radius: 18 }),
        blueprintBlock("avatar", "avatar", 0, 12, 9, 10, 13, { layer: 4, label: "头像素材位", fill: "surface", border: "hairline", radius: 40, icon: "profile" }),
        blueprintBlock("social-mark", "symbol", 0, 4, 34, 8, 10, { layer: 4, align: "center", size: "lg", tone: "muted", icon: "instagram" }),
        blueprintBlock("close-mark", "symbol", 0, 58, 23, 8, 10, { layer: 4, align: "center", size: "lg", tone: "muted", icon: "cross" }),
        blueprintBlock("plus", "symbol", 0, 52, 10, 8, 10, { layer: 4, align: "center", size: "lg", tone: "muted", icon: "none" }),
        blueprintBlock("author", "title", 1, 24, 9, 36, 7, { layer: 4, size: "lg", weight: "bold" }),
        blueprintBlock("handle", "subtitle", 2, 24, 16, 40, 5, { layer: 4, size: "xs", tone: "muted" }),
        blueprintBlock("head-divider", "divider", 0, 8, 25, 68, 2, { layer: 3, border: "hairline" }),
        blueprintBlock("post", "body", 3, 12, 31, 60, 28, { layer: 4, valign: "top", weight: "medium" }),
        blueprintBlock("weather", "iconText", 4, 12, 66, 22, 6, { layer: 4, size: "sm", tone: "muted", icon: "weather" }),
        blueprintBlock("location", "meta", 5, 48, 66, 13, 6, { layer: 4, align: "right", size: "sm", tone: "muted", icon: "location" }),
        blueprintBlock("temperature", "meta", 6, 61, 66, 11, 6, { layer: 4, label: "/", align: "right", size: "sm", tone: "muted" }),
        blueprintBlock("timestamp", "iconText", 0, 12, 73, 35, 6, { layer: 4, label: "时间", size: "sm", tone: "muted", icon: "clock" }),
        blueprintBlock("foot-divider", "divider", 0, 8, 82, 68, 2, { layer: 3, border: "hairline" }),
        blueprintBlock("navigation", "nav", 0, 8, 84, 68, 12, { layer: 4, label: "喜欢 / 上一页 / 下一页", align: "center", size: "sm", tone: "muted", icon: "heart" }),
      ],
      missingAssets: ["头像原图", "背景人物原图"],
    },
  });
  assert.equal(vision.blueprint.blocks.find((block) => block.id === "timestamp")?.field, 7);
  const artifact = buildImageAssistantArtifact({
    mode: "recreate",
    preset: "memo",
    signature: mergeMiniMaxVisionSignature(local, vision),
  });
  const replacement = artifact.draft.replacement;
  const match = new RegExp(generatePattern(artifact.draft.target, "component")).exec(artifact.draft.sample);

  assert.equal(artifact.preset, "social");
  assert.match(artifact.draft.target, /^<SocialPost>/);
  assert.equal(match?.length, 8);
  assert.match(replacement, /mufy-recon-v2__block--avatar/);
  assert.match(replacement, /mufy-recon-v2__block--portrait/);
  assert.match(replacement, /mufy-recon-v2__block--social-mark[^>]+mufy-recon-v2__icon-camera/);
  assert.match(replacement, /mufy-recon-v2__block--close-mark[^>]+mufy-recon-v2__icon-close/);
  assert.match(replacement, /mufy-recon-v2__block--plus[^>]+mufy-recon-v2__icon-plus/);
  assert.match(replacement, />◎</);
  assert.match(replacement, />×</);
  assert.match(replacement, />＋</);
  assert.match(replacement, /mufy-recon-v2__block--weather/);
  assert.match(replacement, /mufy-recon-v2__block--timestamp/);
  assert.match(replacement, /mufy-recon-v2__block--navigation/);
  assert.match(replacement, /喜欢/);
  assert.doesNotMatch(replacement, /mufy-vision-v1__memo|<details|REFERENCE \/|<script\b|https?:\/\/|instagram|profile/i);
  assert.deepEqual(Array.from(replacement.matchAll(/\$([1-9]\d*)/g), (capture) => capture[1]).sort(), ["1", "2", "3", "4", "5", "6", "7"]);
  assert.match(artifact.visionReport, /头像原图；背景人物原图/);
});

test("exports a script-free two-page social card with fourteen ordered captures and valid CSS controls", () => {
  const local = analyzePixelData(darkReferencePixels(), 4, 4);
  const pages = [
    {
      id: "page-1",
      title: "雨夜 <& $1 ``` 动态",
      values: ["PAGE_ONE_AUTHOR", "@page-one", "第一页正文", "大雨", "A市", "16℃", "2026-08-15 18:40"],
    },
    {
      id: "page-2",
      title: "下一页动态",
      values: ["PAGE_TWO_AUTHOR", "@page-two", "PAGE_TWO_TENTH", "小雨", "南岸", "14℃", "2026-08-15 21:10"],
    },
  ];
  const artifact = buildImageAssistantArtifact({
    mode: "recreate",
    preset: "social",
    signature: mergeMiniMaxVisionSignature(local, socialPagedVision()),
    pages,
    loopPages: false,
  });
  const replacement = artifact.draft.replacement;
  const pattern = generatePattern(artifact.draft.target, "component");
  const match = new RegExp(pattern).exec(artifact.draft.sample);

  assert.equal(artifact.pages.length, 2);
  assert.equal(artifact.previewValues.length, 14);
  assert.equal(match?.slice(1).length, 14);
  assert.deepEqual(match?.slice(1), pages.flatMap((page) => page.values));
  assert.match(artifact.draft.target, /^<SocialPostPages>/);
  assert.match(artifact.draft.target, /<Page1Author>/);
  assert.match(artifact.draft.target, /<Page2Timestamp>/);
  assert.match(artifact.draft.target, /填写雨夜 &lt;&amp; \$1 ``` 动态 · 作者/);
  assert.doesNotMatch(artifact.draft.target, /填写雨夜 <&/);
  assert.match(replacement, /aria-label="雨夜 &lt;&amp; &#36;1 &#96;&#96;&#96; 动态"/);
  assert.doesNotMatch(replacement, /aria-label="[^"]*\$1|aria-label="[^"]*```/);
  assert.deepEqual(
    Array.from(replacement.matchAll(/\$(\d+)\b/g), (capture) => Number(capture[1])).sort((a, b) => a - b),
    Array.from({ length: 14 }, (_, index) => index + 1),
  );

  const ids = new Set(Array.from(replacement.matchAll(/\bid="([^"]+)"/g), (item) => item[1]));
  const labelTargets = Array.from(replacement.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g), (item) => item[1]);
  assert.ok(labelTargets.some((target) => target.endsWith("-page-1")), "missing previous-page label");
  assert.ok(labelTargets.some((target) => target.endsWith("-page-2")), "missing next-page label");
  assert.ok(labelTargets.some((target) => target.endsWith("-liked")), "missing like label");
  for (const target of labelTargets) assert.ok(ids.has(target), `label target does not exist: ${target}`);

  assert.match(replacement, /class="mufy-recon-v2__state" type="checkbox"/);
  assert.match(replacement, /\.mufy-recon-v2__page-state:checked~\.mufy-recon-v2__pages>\.mufy-recon-v2__page\{display:none\}/);
  assert.doesNotMatch(replacement, /\.mufy-recon-v2__state:checked~\.mufy-recon-v2__pages>\.mufy-recon-v2__page\{display:none\}/);
  assert.match(replacement, /-liked:checked~\.mufy-recon-v2__pages \.mufy-recon-v2__like/);
  assert.equal((replacement.match(/\schecked(?:\s|>)/g) ?? []).length, 1);
  assert.doesNotMatch(replacement, /<script\b|<iframe\b|<form\b|\son[a-z]+\s*=|javascript:|window\.parent/i);

  const preview = previewImageAssistantArtifact(artifact);
  assert.match(preview, /PAGE_TWO_TENTH/);
  assert.doesNotMatch(preview, /PAGE_ONE_AUTHOR0/);
  assert.doesNotMatch(preview, /\$(?:[1-9]|1[0-4])\b/);

  assert.equal(isMufyReplacementReady(artifact.fixedReplacement), true);
  assert.doesNotMatch(artifact.fixedReplacement, /\$(?:[1-9]|1[0-4])\b/);
  assert.match(artifact.fixedReplacement, /PAGE_ONE_AUTHOR/);
  assert.match(artifact.fixedReplacement, /PAGE_TWO_TENTH/);
  assert.match(artifact.fixedReplacement, /mufy-recon-v2__page--2/);
  const fixedPreview = previewImageAssistantArtifact(artifact, "fixed");
  assert.match(fixedPreview, /PAGE_ONE_AUTHOR/);
  assert.match(fixedPreview, /PAGE_TWO_TENTH/);
  assert.doesNotMatch(fixedPreview, /\$(?:[1-9]|1[0-4])\b/);

  const officialImport = createMufyRegexImportFile({
    name: artifact.draft.name,
    pattern,
    flags: "g",
    replacement,
    enabled: true,
    visibility: false,
    target: artifact.draft.target,
  });
  assert.deepEqual(Object.keys(officialImport[0]), [
    "ruleName",
    "regexPattern",
    "replaceString",
    "enabled",
    "visibility",
    "mode",
    "targetSymbol",
  ]);
  assert.equal(Object.keys(officialImport[0]).length, 7);
  assert.equal(officialImport[0].replaceString, replacement);
});

test("creates valid global beauty CSS without the old diff-marker selectors", () => {
  const signature = analyzePixelData(darkReferencePixels(), 4, 4);
  const css = createGlobalBeautyCss(signature);
  assert.match(css, /^<style>/);
  assert.match(css, /#mufy_chat_input_container/);
  assert.match(css, /#mufy_chat_input_box/);
  assert.match(css, /#mufy_chat_input_box textarea/);
  assert.match(css, /img\[src='\/chat-star\.png'\]/);
  assert.doesNotMatch(css, /(?:^|\n)\+/);
  assert.doesNotMatch(css, /<script\b|javascript:/i);
});

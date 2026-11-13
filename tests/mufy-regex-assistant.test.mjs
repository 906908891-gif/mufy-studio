import assert from "node:assert/strict";
import test from "node:test";

import {
  MUFY_ASSISTANT_GREETING,
  buildAssistantRegex,
  parseAssistantFields,
} from "../app/mufy-regex-assistant.ts";
import {
  isMufyReplacementReady,
  previewMufyReplacement,
} from "../app/mufy-regex-format.ts";
import { generatePattern } from "../app/mufy-regex-pattern.ts";

const expectedGreeting = `你好！我是正则美化组件助手 ✨

请告诉我：
1. 你想创建什么类型的组件？（如：状态面板、新闻播报、对话气泡等）
2. 你想要什么视觉风格/交互？（如：赛博朋克、复古、游戏UI等）
3. 你想要在AI对话的什么时机输出该组件？

描述得越详细，我生成的效果越贴合你的需求！`;

test("preserves the attachment greeting verbatim", () => {
  assert.equal(MUFY_ASSISTANT_GREETING, expectedGreeting);
});

test("parses Chinese and Unicode field tags, de-duplicates them, and caps the result at eight", () => {
  assert.deepEqual(
    parseAssistantFields("生命值，金币\n天气、生命值;地点|心情；任务,进度,备注,第9项"),
    ["生命值", "金币", "天气", "生命值2", "地点", "心情", "任务", "进度"],
  );
  assert.deepEqual(parseAssistantFields("État,魔法值,🧨危险字段"), ["État", "魔法值", "危险字段"]);
});

test("builds a two-field Chinese status panel with strict two-level XML and ordered captures", () => {
  const draft = buildAssistantRegex({
    componentType: "状态面板",
    style: "赛博朋克",
    interaction: "点击展开详情",
    fields: ["生命值", "金币"],
    timing: "每次对话结束时",
  });

  assert.equal(draft.name, "状态面板 · AI自定义正则");
  assert.equal(
    draft.target,
    `<状态面板>\n  <生命值>填写生命值内容</生命值>\n  <金币>填写金币内容</金币>\n</状态面板>`,
  );
  assert.equal(
    draft.sample,
    `<状态面板>\n  <生命值>生命值示例1</生命值>\n  <金币>金币示例2</金币>\n</状态面板>`,
  );

  const targetTags = [...draft.target.matchAll(/<\/?([^>]+)>/gu)].map((match) => match[1]);
  assert.deepEqual(targetTags, ["状态面板", "生命值", "生命值", "金币", "金币", "状态面板"]);
  assert.equal((draft.target.match(/<生命值>/g) ?? []).length, 1);
  assert.equal((draft.target.match(/<金币>/g) ?? []).length, 1);

  const html = previewMufyReplacement(draft.replacement);
  assert.ok(html.indexOf("$1") < html.indexOf("$2"));
  assert.equal((html.match(/\$1/g) ?? []).length, 1);
  assert.equal((html.match(/\$2/g) ?? []).length, 1);
  assert.match(draft.variableMap, /\| \$1 \| <生命值> \|/);
  assert.match(draft.variableMap, /\| \$2 \| <金币> \|/);
  assert.ok(draft.variableMap.indexOf("$1") < draft.variableMap.indexOf("$2"));
  assert.match(draft.instruction, /^在每次对话结束时，严格按照以下XML结构输出状态面板组件/);
  assert.match(draft.instruction, /只输出XML结构，不要有任何开场白、解释或其他文字/);
  assert.match(draft.instruction, /保持标签名称完全一致，不要修改/);
  assert.match(draft.beautifierInvocation, /不是 JavaScript 或可执行脚本/);
  assert.match(draft.beautifierInvocation, /只改视觉、排版和无脚本交互/);
  assert.match(draft.beautifierInvocation, /<状态面板>[\s\S]*<生命值>/);
  assert.match(draft.beautifierInvocation, /\| \$1 \| <生命值> \|/);
  assert.match(draft.beautifierInvocation, /\| \$2 \| <金币> \|/);
  assert.match(draft.beautifierInvocation, /不得交换、跳号或新增不存在的占位符/);
  assert.match(draft.beautifierInvocation, /不要粘贴到 Mufy|直接作为正则替换字符串/);

  const pattern = generatePattern(draft.target, "component");
  const match = draft.sample.match(new RegExp(pattern));
  assert.deepEqual(match?.slice(1), ["生命值示例1", "金币示例2"]);
  const rendered = draft.sample.replace(new RegExp(pattern), previewMufyReplacement(draft.replacement));
  assert.match(rendered, /<strong>生命值示例1<\/strong>/);
  assert.match(rendered, /<strong>金币示例2<\/strong>/);
});

test("emits one official html fence around a complete responsive and script-free document", () => {
  const { replacement } = buildAssistantRegex({
    componentType: "新闻播报",
    style: "复古报纸",
    interaction: "收起展开",
    fields: ["标题", "正文", "日期"],
    timing: "重要事件发生后",
  });
  const html = previewMufyReplacement(replacement);

  assert.equal(isMufyReplacementReady(replacement), true);
  assert.equal((replacement.match(/^```html$/gm) ?? []).length, 1);
  assert.equal((replacement.match(/^```$/gm) ?? []).length, 1);
  assert.match(replacement, /^```html\n<!DOCTYPE html>/);
  assert.match(replacement, /<html lang="zh-CN">[\s\S]*<head>[\s\S]*<body>[\s\S]*<\/body>[\s\S]*<\/html>\n```$/);
  assert.match(html, /\.mufy-ai-component\s*\{[\s\S]*?width:\s*100%/);
  assert.match(html, /flex-direction:\s*column/);
  assert.match(html, /<details[^>]* open>[\s\S]*<summary>/);
  assert.doesNotMatch(html, /max-width\s*:/i);
  assert.doesNotMatch(html, /\bbackground(?:-color|-image)?\s*:/i);
  assert.doesNotMatch(html, /<(?:script|iframe|form)\b/i);
  assert.doesNotMatch(html, /<[^>]+\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /https?:\/\/|@import|url\s*\(/i);
});

test("turns the requested interaction into real component structure", () => {
  const pages = buildAssistantRegex({
    componentType: "角色档案",
    style: "暗黑游戏 UI",
    interaction: "多个子页面",
    fields: ["姓名", "状态", "正文"],
    timing: "进入新场景时",
  });
  const pagesHtml = previewMufyReplacement(pages.replacement);
  assert.equal((pagesHtml.match(/class="mufy-ai-page"/g) ?? []).length, 3);
  assert.match(pagesHtml, /PAGE 01 · 姓名/);
  assert.match(pagesHtml, /PAGE 03 · 正文/);

  const hover = buildAssistantRegex({
    componentType: "物品卡",
    style: "赛博朋克",
    interaction: "悬停聚焦",
    fields: ["名称", "描述"],
    timing: "获得物品时",
  });
  const hoverHtml = previewMufyReplacement(hover.replacement);
  assert.equal((hoverHtml.match(/class="mufy-ai-field mufy-ai-hover"/g) ?? []).length, 2);
  assert.match(hoverHtml, /tabindex="0"/);
  assert.match(hoverHtml, /:focus/);
});

test("writes field-specific length and format requirements", () => {
  const draft = buildAssistantRegex({
    componentType: "任务状态",
    style: "清透",
    interaction: "收起展开",
    fields: ["日期", "时间", "进度", "金币", "正文"],
    timing: "每轮结束时",
  });
  assert.match(draft.instruction, /YYYY-MM-DD/);
  assert.match(draft.instruction, /24 小时制 HH:mm/);
  assert.match(draft.instruction, /0—100/);
  assert.match(draft.instruction, /非负整数/);
  assert.match(draft.instruction, /10—200 个字/);
});

test("neutralizes unknown and malicious input while retaining escaped user text", () => {
  const draft = buildAssistantRegex({
    componentType: `<script>alert("type")</script>`,
    style: `</style><script>alert("style")</script>`,
    interaction: `<img src=x onerror=alert("interaction")>`,
    fields: ["1非法", "<img onerror=x>", "xmlData", "", "名字✨"],
    timing: "结束时\n</textarea><script>alert(1)</script>",
  });
  const html = previewMufyReplacement(draft.replacement);

  assert.match(html, /&lt;script&gt;alert\(&quot;type&quot;\)&lt;\/script&gt;/);
  assert.match(html, /&lt;\/style&gt;&lt;script&gt;alert\(&quot;style&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<(?:script|iframe|form|img)\b/i);
  assert.doesNotMatch(html, /<[^>]+\son[a-z]+\s*=/i);
  assert.doesNotMatch(draft.target, /[<](?:script|img)\b/i);
  assert.doesNotMatch(draft.target, /<\/?(?:xmlData|1非法)>/);
  assert.match(draft.target, /<字段1非法>/);
  assert.match(draft.target, /<字段xmlData>/);
  assert.equal(isMufyReplacementReady(draft.replacement), true);
});

test("falls back safely for empty requests", () => {
  const draft = buildAssistantRegex({
    componentType: "",
    style: "",
    interaction: "",
    fields: [],
    timing: "",
  });

  assert.equal(draft.name, "自定义组件 · AI自定义正则");
  assert.equal(draft.target, `<自定义组件>\n  <内容>填写内容内容</内容>\n</自定义组件>`);
  assert.match(draft.instruction, /^在每次对话结束时/);
  assert.match(draft.beautifierInvocation, /组件：自定义组件/);
  assert.equal(isMufyReplacementReady(draft.replacement), true);
});

test("protects reserved markup names and tolerates missing runtime fields", () => {
  const draft = buildAssistantRegex({
    componentType: "script",
    style: "unknown",
    interaction: "unknown",
    fields: undefined,
    timing: "unknown",
  });

  assert.doesNotMatch(draft.target, /<\/?script>/i);
  assert.match(draft.target, /^<字段script>/);
  assert.match(draft.target, /<内容>/);
});

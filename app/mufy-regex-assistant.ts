// @ts-expect-error Node's type-stripping test runner requires the explicit extension.
import { mufyReplacement } from "./mufy-regex-format.ts";

export type AssistantRequest = {
  componentType: string;
  style: string;
  interaction: string;
  fields: string[];
  timing: string;
};

export type AssistantRuleDraft = {
  name: string;
  target: string;
  replacement: string;
  sample: string;
  variableMap: string;
  instruction: string;
  beautifierInvocation: string;
};

export const MUFY_ASSISTANT_GREETING = `你好！我是正则美化组件助手 ✨

请告诉我：
1. 你想创建什么类型的组件？（如：状态面板、新闻播报、对话气泡等）
2. 你想要什么视觉风格/交互？（如：赛博朋克、复古、游戏UI等）
3. 你想要在AI对话的什么时机输出该组件？

描述得越详细，我生成的效果越贴合你的需求！`;

const MAX_FIELDS = 8;
const MAX_TAG_LENGTH = 32;
const FIELD_SEPARATOR = /[\r\n,，、;；|｜]+/u;
const XML_NAME_START = /[\p{L}_]/u;
const XML_NAME_PART = /[\p{L}\p{N}\p{M}_.-]/u;
const RESERVED_MARKUP_TAG = /^(?:html|head|body|script|style|iframe|form|img|object|embed|link|meta)$/i;

type Palette = {
  border: string;
  accent: string;
  text: string;
  muted: string;
};

const palettes: Record<"cyber" | "vintage" | "nature" | "modern", Palette> = {
  cyber: {
    border: "#6658a8",
    accent: "#7ee7ef",
    text: "#f6f4ff",
    muted: "#b8b0d1",
  },
  vintage: {
    border: "#9b764f",
    accent: "#7d3f32",
    text: "#352b24",
    muted: "#715f50",
  },
  nature: {
    border: "#668c73",
    accent: "#a7d489",
    text: "#f2f8f0",
    muted: "#b7c7b9",
  },
  modern: {
    border: "#676b7f",
    accent: "#c8ff5a",
    text: "#fafbff",
    muted: "#b5b8c6",
  },
};

function humanText(value: string, fallback: string, limit = 80) {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(normalized || fallback).slice(0, limit).join("");
}

function promptText(value: string, fallback: string, limit = 80) {
  return humanText(value, fallback, limit)
    .replace(/[<>`]/g, "")
    .replace(/\s+/g, " ")
    .trim() || fallback;
}

export function createBeautifierInvocation(input: {
  componentType: string;
  style: string;
  interaction: string;
  target: string;
  variableMap: string;
  replacement: string;
}) {
  const componentType = promptText(input.componentType, "自定义组件", 80);
  const style = promptText(input.style, "简洁现代", 120);
  const interaction = promptText(input.interaction, "纯 HTML/CSS 展示", 120);
  return [
    "请作为「Mufy 正则组件美化助手」继续完成下面的组件。",
    "",
    "这是一段调用提示词，不是 JavaScript 或可执行脚本；不要声称你能直接操作 Mufy。",
    "",
    "【当前任务】",
    "- 组件：" + componentType,
    "- 目标风格：" + style,
    "- 交互要求：" + interaction,
    "- 只改视觉、排版和无脚本交互，不改变触发条件、XML 协议或变量含义。",
    "",
    "【不可改变的协议】",
    "- 必须原样保留外层与内层 XML 标签名称、层级和出现顺序。",
    "- $1、$2……严格按内层标签出现顺序映射，不得交换、跳号或新增不存在的占位符。",
    "- 动态占位符只放在文本内容位置，不放进 style、class、id、src、href 或 data 属性。",
    "- 不把普通正文关键词当作触发词，不擅自改写正则表达式。",
    "",
    "【Mufy 兼容要求】",
    "- 输出一个完整的 \u0060\u0060\u0060html 围栏，包含可直接作为正则替换字符串使用的 HTML/CSS。",
    "- 组件 width:100%，移动端优先；避免固定宽度、position:fixed 和 min-height:100vh。",
    "- 所有类名使用独立命名空间，禁止用未限定的 body、details、summary、button 等选择器污染官网。",
    "- 默认不使用 JavaScript；折叠、切换等优先使用 details、radio、checkbox 与 CSS。",
    "- 需要宿主发送、持久化、跨轮记忆或父页面 DOM 的能力必须标成「官网待验证」，并给出静态降级。",
    "- 不复制参考作者的人物图片、文字、品牌或私有素材，只学习结构和视觉气质。",
    "",
    "【AI 输出 XML · 原样保留】",
    input.target,
    "",
    "【变量对应表 · 原样保留】",
    input.variableMap,
    "",
    "【当前替换代码 · 在此基础上美化】",
    input.replacement,
    "",
    "【请按顺序交付】",
    "1. 一句话说明视觉方案",
    "2. 美化后的完整替换字符串（单一 \u0060\u0060\u0060html 围栏）",
    "3. $1……变量核对结果",
    "4. 手机窄屏与长文本检查",
    "5. Mufy 兼容边界与需要官网实测的项目",
  ].join("\n");
}

function xmlTag(value: string, fallback: string) {
  const normalized = String(value ?? "").normalize("NFKC");
  let tag = Array.from(normalized)
    .filter((character) => XML_NAME_PART.test(character))
    .slice(0, MAX_TAG_LENGTH)
    .join("");

  if (!tag) tag = fallback;
  if (!XML_NAME_START.test(Array.from(tag)[0] ?? "")) tag = `字段${tag}`;
  if (/^xml/i.test(tag) || RESERVED_MARKUP_TAG.test(tag)) tag = `字段${tag}`;
  return Array.from(tag).slice(0, MAX_TAG_LENGTH).join("");
}

function uniqueTags(values: string[]) {
  const used = new Set<string>();
  const result: string[] = [];

  for (const [index, value] of values.entries()) {
    const base = xmlTag(value, `字段${index + 1}`);
    let tag = base;
    let suffix = 2;
    while (used.has(tag)) {
      const ending = String(suffix++);
      tag = `${Array.from(base).slice(0, MAX_TAG_LENGTH - ending.length).join("")}${ending}`;
    }
    used.add(tag);
    result.push(tag);
    if (result.length === MAX_FIELDS) break;
  }

  return result;
}

export function parseAssistantFields(value: string) {
  const pieces = String(value ?? "")
    .split(FIELD_SEPARATOR)
    .map((field) => field.trim())
    .filter(Boolean);
  return uniqueTags(pieces);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paletteFor(style: string) {
  if (/赛博|科幻|霓虹|cyber|sci[- ]?fi/i.test(style)) return palettes.cyber;
  if (/复古|报纸|羊皮|古典|vintage|retro/i.test(style)) return palettes.vintage;
  if (/自然|森林|森系|植物|nature|forest/i.test(style)) return palettes.nature;
  return palettes.modern;
}

function xmlDocument(outerTag: string, fields: string[], valueFor: (field: string, index: number) => string) {
  const inner = fields
    .map((field, index) => `  <${field}>${valueFor(field, index)}</${field}>`)
    .join("\n");
  return `<${outerTag}>\n${inner}\n</${outerTag}>`;
}

function fieldRequirement(field: string) {
  if (/日期|date/i.test(field)) return `填写“${field}”对应的日期；使用 YYYY-MM-DD 格式，不要嵌套XML标签。`;
  if (/时间|时刻|time/i.test(field)) return `填写“${field}”对应的时间；使用 24 小时制 HH:mm 格式，不要嵌套XML标签。`;
  if (/百分比|进度|好感|生命值|体力|魔法值|hp|mp|percent/i.test(field)) return `填写“${field}”的当前数值；只写 0—100 的数字，需要百分号时写成“85%”，不要嵌套XML标签。`;
  if (/金币|数量|次数|等级|分数|score|level/i.test(field)) return `填写“${field}”的当前值；使用非负整数并保留必要单位，不要嵌套XML标签。`;
  if (/标题|名称|姓名|角色名|name|title/i.test(field)) return `填写“${field}”对应的名称；使用纯文本，建议 1—30 个字，不要嵌套XML标签。`;
  if (/正文|描述|内容|回忆|独白|说明|description|content/i.test(field)) return `填写“${field}”对应的完整内容；使用纯文本，建议 10—200 个字，不要嵌套XML标签。`;
  if (/地点|天气|情绪|状态|标签|location|weather|mood|status/i.test(field)) return `填写“${field}”对应的简短信息；使用纯文本，建议 1—30 个字，不要嵌套XML标签。`;
  return `填写“${field}”对应的当前动态内容；使用纯文本，建议 1—80 个字，不要嵌套XML标签。`;
}

type InteractionMode = "accordion" | "pages" | "hover";

function interactionModeFor(value: string): InteractionMode {
  if (/多个?子页面|分页|标签页|tab|切换|导航|pages?/i.test(value)) return "pages";
  if (/悬停|hover|浮动|聚焦/i.test(value)) return "hover";
  return "accordion";
}

export function buildAssistantRegex(request: AssistantRequest): AssistantRuleDraft {
  const componentDisplay = humanText(request.componentType, "自定义组件");
  const componentTag = xmlTag(request.componentType, "自定义组件");
  const visualStyle = humanText(request.style, "简洁现代");
  const interaction = humanText(request.interaction, "点击展开详情");
  const timing = promptText(request.timing, "每次对话结束时");
  const interactionMode = interactionModeFor(interaction);
  const requestFields = Array.isArray(request.fields) ? request.fields : [];
  const parsedFields = uniqueTags(
    requestFields.flatMap((field) => parseAssistantFields(String(field ?? ""))),
  );
  const fields = parsedFields.length ? parsedFields : ["内容"];
  const palette = paletteFor(visualStyle);

  const target = xmlDocument(
    componentTag,
    fields,
    (field) => `填写${field}内容`,
  );
  const sample = xmlDocument(
    componentTag,
    fields,
    (field, index) => `${field}示例${index + 1}`,
  );

  const fieldCards = fields.map((field, index) => {
    const fieldName = escapeHtml(field);
    if (interactionMode === "pages") return `      <details class="mufy-ai-page"${index === 0 ? " open" : ""}>
        <summary>PAGE ${String(index + 1).padStart(2, "0")} · ${fieldName}</summary>
        <section class="mufy-ai-field">
          <span>${fieldName}</span>
          <strong>$${index + 1}</strong>
        </section>
      </details>`;
    if (interactionMode === "hover") return `        <section class="mufy-ai-field mufy-ai-hover" tabindex="0">
          <span>${fieldName} · HOVER / FOCUS</span>
          <strong>$${index + 1}</strong>
        </section>`;
    return `      <details class="mufy-ai-page"${index === 0 ? " open" : ""}>
        <summary>${fieldName}</summary>
        <section class="mufy-ai-field">
          <span>动态内容</span>
          <strong>$${index + 1}</strong>
        </section>
      </details>`;
  }).join("\n");

  const interactiveContent = interactionMode === "hover"
    ? `    <details open>
      <summary>组件内容 · 悬停或聚焦卡片</summary>
      <div class="mufy-ai-fields">
${fieldCards}
      </div>
    </details>`
    : `    <section class="mufy-ai-pages" aria-label="${escapeHtml(interactionMode === "pages" ? "多个子页面" : "可折叠字段")}">
${fieldCards}
    </section>`;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(componentDisplay)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { color: ${palette.text}; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
    .mufy-ai-component {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      border: 1px solid ${palette.border};
      border-radius: 18px;
      color: ${palette.text};
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.18);
    }
    .mufy-ai-header { display: flex; flex-direction: column; gap: 5px; }
    .mufy-ai-header small { color: ${palette.accent}; font-size: 11px; letter-spacing: 0.08em; }
    .mufy-ai-header h2 { margin: 0; font-size: 21px; line-height: 1.35; }
    .mufy-ai-header p { margin: 0; color: ${palette.muted}; font-size: 13px; line-height: 1.65; }
    .mufy-ai-component details {
      width: 100%;
      overflow: hidden;
      border: 1px solid ${palette.border};
      border-radius: 13px;
    }
    .mufy-ai-component summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      color: ${palette.text};
      cursor: pointer;
      font-weight: 700;
      list-style: none;
    }
    .mufy-ai-component summary::-webkit-details-marker { display: none; }
    .mufy-ai-component summary::after { content: "+"; color: ${palette.accent}; }
    .mufy-ai-component details[open] summary::after { content: "−"; }
    .mufy-ai-fields, .mufy-ai-pages { display: flex; flex-direction: column; gap: 8px; }
    .mufy-ai-fields { padding: 0 12px 12px; }
    .mufy-ai-page > .mufy-ai-field { margin: 0 12px 12px; }
    .mufy-ai-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 11px 12px;
      border-left: 3px solid ${palette.accent};
      border-radius: 9px;
    }
    .mufy-ai-field span { color: ${palette.muted}; font-size: 11px; }
    .mufy-ai-field strong { color: ${palette.text}; font-size: 15px; line-height: 1.6; overflow-wrap: anywhere; }
    .mufy-ai-hover { transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease; outline: none; }
    .mufy-ai-hover:hover, .mufy-ai-hover:focus { transform: translateY(-2px); border-color: ${palette.accent}; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16); }
    .mufy-ai-notes { display: flex; flex-direction: column; gap: 6px; padding: 0 14px 13px; }
    .mufy-ai-notes p { margin: 0; color: ${palette.muted}; font-size: 12px; line-height: 1.65; }
    .mufy-ai-notes b { color: ${palette.accent}; }
  </style>
</head>
<body>
  <main class="mufy-ai-component">
    <header class="mufy-ai-header">
      <small>AI REGEX COMPONENT</small>
      <h2>${escapeHtml(componentDisplay)}</h2>
      <p>${escapeHtml(visualStyle)} · ${escapeHtml(interaction)}</p>
    </header>
${interactiveContent}
    <details>
      <summary>输出说明</summary>
      <div class="mufy-ai-notes">
        <p><b>交互：</b>${escapeHtml(interaction)}</p>
        <p><b>时机：</b>${escapeHtml(timing)}</p>
      </div>
    </details>
  </main>
</body>
</html>`;

  const variableMap = [
    "| 占位符 | XML标签 | 说明 |",
    "|---|---|---|",
    ...fields.map(
      (field, index) => `| $${index + 1} | <${field}> | ${fieldRequirement(field)} |`,
    ),
  ].join("\n");

  const instructionXml = xmlDocument(
    componentTag,
    fields,
    (field) => fieldRequirement(field),
  );
  const instruction = `在${timing}，严格按照以下XML结构输出${componentTag}组件，不要输出任何其他内容：

${instructionXml}

【字段说明】
${fields.map((field) => `- <${field}>：${fieldRequirement(field)}`).join("\n")}

【重要约束】
- 只输出XML结构，不要有任何开场白、解释或其他文字
- XML结构严格保持两层：一个外层组件标签和以上内层字段标签
- 保持标签名称完全一致，不要修改
- 每个标签内容按照需求输出`;

  const replacement = mufyReplacement(html);
  const beautifierInvocation = createBeautifierInvocation({
    componentType: componentDisplay,
    style: visualStyle,
    interaction,
    target,
    variableMap,
    replacement,
  });

  return {
    name: `${componentTag} · AI自定义正则`,
    target,
    replacement,
    sample,
    variableMap,
    instruction,
    beautifierInvocation,
  };
}

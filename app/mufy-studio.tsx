"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import officialMufyCaseCopy from "./official-mufy-case-copy.json";
import officialMufyReplacements from "./official-mufy-replacements.json";
import { appendMufyReplacementToken, isMufyReplacementReady, mufyReplacement, previewMufyReplacement } from "./mufy-regex-format";
import { generatePattern, hasXmlTag } from "./mufy-regex-pattern";
import { createMufyRegexImportFile, mufyRegexImportFilename } from "./mufy-regex-json";
import { fillOfficialPhonePreviewCaptures, officialPreviewScriptsEnabledByDefault, prepareOfficialPreviewDocument } from "./official-preview";
import type { AssistantRuleDraft } from "./mufy-regex-assistant";
import { AiCreatorStudio } from "./ai-creator-studio";
import { BeautifyStudio, CardBlueprint, TheaterStudio } from "./studio-workspaces";
import {
  BLOG_WIDGET_KINDS,
  blogWidgetDefaults,
  blogWidgetMarkup,
  blogWidgetMeta,
  blogWidgetXml,
  isBlogWidgetKind,
} from "./blog-widgets";
import type { BlogWidgetKind } from "./blog-widgets";
import { createBeautifierInvocation } from "./mufy-regex-assistant";

type Mode = "blueprint" | "assistant" | "beautify" | "widget" | "regex" | "theater";
type PersistedMode = Mode | "component";
type LegacyKind = "environment" | "bond" | "phone" | "chapter" | "emotion" | "quest" | "memory" | "inventory" | "soundtrack" | "fate" | "map" | "schedule" | "officialStatus" | "officialMemory" | "officialMap" | "officialSticker" | "officialPhone";
type Kind = LegacyKind | BlogWidgetKind;
type Scenario = "component" | "symbol" | "text" | "filter";
type OfficialVariant = "original" | "studio";
type Copy = { primary: string; secondary: string; description: string; extra: string };
type Style = { palette: number; radius: number; glass: number; compact: boolean; motion: boolean };
type WidgetMeta = {
  name: string;
  sub: string;
  icon: string;
  labels: [string, string, string, string];
  fields?: 1 | 2 | 3 | 4;
  officialUrl?: string;
  compatibility?: "native" | "script";
  collection?: "blog";
};
type Draft = {
  studioVersion?: number;
  workspace?: PersistedMode;
  widget?: { kind?: Kind; copy?: Partial<Copy>; style?: Partial<Style>; officialVariant?: OfficialVariant };
  regex?: { name?: string; scenario?: Scenario; target?: string; replacement?: string; sample?: string; flags?: string; manual?: boolean; pattern?: string; enabled?: boolean; visible?: boolean; instruction?: string; variableMap?: string; beautifierPrompt?: string };
  name?: string; targetText?: string; replacement?: string; pattern?: string; testInput?: string; enabled?: boolean; visibleToUser?: boolean;
};

const MAX_DRAFT_BYTES=2_000_000;
const draftModes:PersistedMode[]=["blueprint","assistant","beautify","widget","regex","theater","component"];
const draftKinds:Kind[]=["environment","bond","phone","chapter","emotion","quest","memory","inventory","soundtrack","fate","map","schedule","officialStatus","officialMemory","officialMap","officialSticker","officialPhone",...BLOG_WIDGET_KINDS];
const draftScenarios:Scenario[]=["component","symbol","text","filter"];
const recordValue=(value:unknown):Record<string,unknown>|null=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
const draftString=(value:unknown)=>typeof value==="string"&&new TextEncoder().encode(value).byteLength<=500_000?value:undefined;

function normalizeDraft(value:unknown):Draft{
  const input=recordValue(value);if(!input)return{};
  const draft:Draft={};
  if(typeof input.studioVersion==="number"&&Number.isFinite(input.studioVersion))draft.studioVersion=input.studioVersion;
  if(typeof input.workspace==="string"&&draftModes.includes(input.workspace as PersistedMode))draft.workspace=input.workspace as PersistedMode;
  const widgetInput=recordValue(input.widget);
  if(widgetInput){const widget:NonNullable<Draft["widget"]>={};if(typeof widgetInput.kind==="string"&&draftKinds.includes(widgetInput.kind as Kind))widget.kind=widgetInput.kind as Kind;if(widgetInput.officialVariant==="original"||widgetInput.officialVariant==="studio")widget.officialVariant=widgetInput.officialVariant;const copyInput=recordValue(widgetInput.copy);if(copyInput){const next:Partial<Copy>={};for(const key of ["primary","secondary","description","extra"] as const){const candidate=draftString(copyInput[key]);if(candidate!==undefined)next[key]=candidate;}if(Object.keys(next).length)widget.copy=next;}const styleInput=recordValue(widgetInput.style);if(styleInput){const next:Partial<Style>={};if(typeof styleInput.palette==="number"&&Number.isFinite(styleInput.palette))next.palette=styleInput.palette;if(typeof styleInput.radius==="number"&&Number.isFinite(styleInput.radius))next.radius=styleInput.radius;if(typeof styleInput.glass==="number"&&Number.isFinite(styleInput.glass))next.glass=styleInput.glass;if(typeof styleInput.compact==="boolean")next.compact=styleInput.compact;if(typeof styleInput.motion==="boolean")next.motion=styleInput.motion;if(Object.keys(next).length)widget.style=next;}if(Object.keys(widget).length)draft.widget=widget;}
  const regexInput=recordValue(input.regex);
  if(regexInput){const regex:NonNullable<Draft["regex"]>={};for(const key of ["name","target","replacement","sample","pattern","instruction","variableMap","beautifierPrompt"] as const){const candidate=draftString(regexInput[key]);if(candidate!==undefined)regex[key]=candidate;}if(typeof regexInput.scenario==="string"&&draftScenarios.includes(regexInput.scenario as Scenario))regex.scenario=regexInput.scenario as Scenario;if(typeof regexInput.flags==="string")regex.flags=Array.from(new Set(regexInput.flags.match(/[gims]/g)??[])).join("");if(typeof regexInput.manual==="boolean")regex.manual=regexInput.manual;if(typeof regexInput.enabled==="boolean")regex.enabled=regexInput.enabled;if(typeof regexInput.visible==="boolean")regex.visible=regexInput.visible;if(Object.keys(regex).length)draft.regex=regex;}
  for(const key of ["name","targetText","replacement","pattern","testInput"] as const){const candidate=draftString(input[key]);if(candidate!==undefined)draft[key]=candidate;}
  if(typeof input.enabled==="boolean")draft.enabled=input.enabled;if(typeof input.visibleToUser==="boolean")draft.visibleToUser=input.visibleToUser;
  return draft;
}

const palettes = [
  { name: "夜航紫", bg: "#191328", surface: "#29203d", accent: "#c8ff5a", ink: "#faf7ff", muted: "#aaa0bc" },
  { name: "蜜桃汽水", bg: "#fff0e8", surface: "#fffaf5", accent: "#ff625f", ink: "#3e2731", muted: "#956d79" },
  { name: "深海蓝", bg: "#071d2b", surface: "#0e3347", accent: "#65e5ff", ink: "#effcff", muted: "#85adba" },
  { name: "抹茶纸", bg: "#e9edda", surface: "#f8f4e7", accent: "#526c2d", ink: "#273018", muted: "#757e61" },
];

const meta: Record<Kind, WidgetMeta> = {
  environment: { name: "环境状态栏", sub: "时间 · 天气 · 氛围", icon: "☁", labels: ["当前时间", "天气", "环境描述", "地点"] },
  bond: { name: "关系感知器", sub: "好感 · 情绪 · 心声", icon: "♡", labels: ["角色名", "关系阶段", "内心活动", "好感度"] },
  phone: { name: "静态消息摘要", sub: "消息 · 备忘 · 只展示", icon: "▣", labels: ["联系人", "消息状态", "最新消息", "未读数"] },
  chapter: { name: "章节转场卡", sub: "章节 · 地点 · 旁白", icon: "✦", labels: ["章节编号", "章节名", "场景旁白", "地点"] },
  emotion: { name: "情绪罗盘", sub: "情绪 · 来源 · 强度", icon: "◉", labels: ["角色名", "当前情绪", "情绪来源", "情绪强度"] },
  quest: { name: "剧情任务卡", sub: "目标 · 提示 · 进度", icon: "✓", labels: ["任务目标", "当前阶段", "提示信息", "完成度"] },
  memory: { name: "记忆拍立得", sub: "日期 · 片段 · 地点", icon: "▧", labels: ["记忆标题", "发生日期", "记忆片段", "地点"] },
  inventory: { name: "随身物件簿", sub: "物件 · 故事 · 状态", icon: "◇", labels: ["持有者", "物件名称", "物件故事", "当前状态"] },
  soundtrack: { name: "氛围唱片机", sub: "曲目 · 注释 · 进度", icon: "♫", labels: ["曲名", "演唱者", "氛围注释", "播放进度"] },
  fate: { name: "命运抽签卡", sub: "签文 · 吉凶 · 提示", icon: "✶", labels: ["签文名称", "吉凶", "命运提示", "幸运数字"] },
  map: { name: "场景导航仪", sub: "起点 · 终点 · 路线", icon: "⌖", labels: ["当前地点", "目的地", "路线描述", "距离"] },
  schedule: { name: "今日行程轴", sub: "现在 · 下一站 · 进度", icon: "◷", labels: ["日期", "当前事项", "下一安排", "完成度"] },
  officialStatus: { name: "官方·简单状态栏", sub: "时间 · 天气 · 环境", icon: "◌", labels: ["Time / 时间", "Weather / 天气", "Description / 环境描述", ""], fields: 3, officialUrl: "https://docs.mufy.ai/documentation/guan-yu-zheng-ze/you-qu-an-li/jian-dan-zhuang-tai-lan", compatibility: "native" },
  officialMemory: { name: "官方·动态记忆区", sub: "里程碑 · 长期 · 短期", icon: "▦", labels: ["KeyMilestones / 关键里程碑", "LongTermMemory / 长期记忆", "ShortTermMemory / 短期记忆", ""], fields: 3, officialUrl: "https://docs.mufy.ai/documentation/guan-yu-zheng-ze/you-qu-an-li/dong-tai-ji-yi-qu", compatibility: "native" },
  officialMap: { name: "官方·剧情地图", sub: "固定地点 · 动态高亮", icon: "⌘", labels: ["CurrentLocation / 当前地点", "EnvironmentDesc / 地点描述", "", ""], fields: 2, officialUrl: "https://docs.mufy.ai/documentation/guan-yu-zheng-ze/you-qu-an-li/di-tu-zu-jian", compatibility: "native" },
  officialSticker: { name: "官方·表情包映射", sub: "[名称] · 图片映射", icon: "☺", labels: ["表情包名称", "", "", ""], fields: 1, officialUrl: "https://docs.mufy.ai/documentation/guan-yu-zheng-ze/you-qu-an-li/biao-qing-bao-an-li", compatibility: "native" },
  officialPhone: { name: "官方·MUMU 小手机", sub: "用户消息 · 角色回复", icon: "▤", labels: ["UserInput / 用户消息（||| 分隔）", "AiInput / 角色回复（||| 分隔）", "", ""], fields: 2, officialUrl: "https://docs.mufy.ai/documentation/guan-yu-zheng-ze/you-qu-an-li/mumu-xiao-shou-ji", compatibility: "script" },
  ...blogWidgetMeta,
};

const defaults: Record<Kind, Copy> = {
  environment: { primary: "22:18", secondary: "小雨转晴", description: "雨水沿着玻璃滑落，空气里有潮湿的栀子香。", extra: "临港旧街" },
  bond: { primary: "林雾", secondary: "试探期", description: "她把没说出口的话，藏进了第二杯温热的咖啡里。", extra: "72" },
  phone: { primary: "许知遥", secondary: "刚刚 · 2 条新消息", description: "到家以后告诉我，别又忘了带伞。", extra: "2" },
  chapter: { primary: "CHAPTER 07", secondary: "雨停之前", description: "有些答案，只有在城市安静下来以后才听得见。", extra: "南岸车站" },
  emotion: { primary: "林雾", secondary: "克制的期待", description: "她听见门锁转动，紧绷了一晚的肩膀终于放松。", extra: "78" },
  quest: { primary: "找到遗失的车票", secondary: "进行中 · 第 2 阶段", description: "最后一次被看见是在旧站台的长椅附近。", extra: "64" },
  memory: { primary: "海风吹来的那天", secondary: "2025.08.17", description: "你们在末班渡轮靠岸前分享了同一副耳机。", extra: "白沙码头" },
  inventory: { primary: "许知遥", secondary: "磨旧的银色打火机", description: "底部刻着一行很浅的字：别忘记回家。", extra: "随身携带" },
  soundtrack: { primary: "After the Rain", secondary: "Northbound", description: "低声的钢琴像雨停后仍未散去的潮气。", extra: "01:42 / 03:28" },
  fate: { primary: "第十七签 · 回声", secondary: "小吉", description: "迟到的回答仍会抵达，但你需要先推开那扇门。", extra: "7" },
  map: { primary: "临港旧街", secondary: "南岸车站", description: "沿河堤向东，在第二盏坏掉的路灯处右转。", extra: "1.8 km" },
  schedule: { primary: "08 / 17 · 周日", secondary: "22:30 等待末班车", description: "23:10 抵达南岸 · 记得买两杯热咖啡", extra: "58" },
  officialStatus: { primary: "13:37:33", secondary: "多云转小雨", description: "空气中飘着柳絮伴随着樱花香，春天到了。", extra: "" },
  officialMemory: { primary: "第一次共同完成委托；在雨夜坦白彼此的秘密", secondary: "你们已经建立稳定信任，并约定不再独自承担危险。", description: "本轮在旧车站找到关键车票，确认下一站是灰烬荒原。", extra: "" },
  officialMap: { primary: "灰烬荒原", secondary: "枯黑的风卷起细碎余烬，远处只剩半座倾斜的钟塔。", description: "", extra: "" },
  officialSticker: { primary: "开心", secondary: "", description: "", extra: "" },
  officialPhone: { primary: "干嘛|||怎么喂不饱", secondary: "罐头！|||要吃罐头！|||多多的罐头！", description: "", extra: "" },
  ...blogWidgetDefaults,
};

const scenarioMeta: Record<Scenario, { name: string; sub: string; icon: string }> = {
  component: { name: "代码组件", sub: "固定 XML → 动态组件", icon: "</>" },
  symbol: { name: "符号匹配", sub: "引号、括号与特殊标记", icon: "“”" },
  text: { name: "文本样式", sub: "关键词高亮或内容替换", icon: "Aa" },
  filter: { name: "内容过滤", sub: "移除不需要的输出", icon: "⌫" },
};

const presets: Record<Scenario, { target: string; replacement: string; sample: string }> = {
  component: {
    target: `<EnvironmentData>\n  <Time>22:18</Time>\n  <Weather>小雨转晴</Weather>\n  <Description>雨水沿着玻璃滑落</Description>\n  <Location>临港旧街</Location>\n</EnvironmentData>`,
    replacement: `<div class="mufy-status"><b>$1</b><span>$2</span><p>$3</p><small>⌖ $4</small></div><style>.mufy-status{width:100%;padding:18px;border-radius:20px;color:#faf7ff;background:linear-gradient(145deg,#29203d,#191328);box-sizing:border-box}.mufy-status b{font-size:26px}.mufy-status span{float:right;color:#c8ff5a}.mufy-status p{clear:both;color:#aaa0bc;line-height:1.7}.mufy-status small{color:#c8ff5a}</style>`,
    sample: `窗外的霓虹在雨里晕开。\n\n<EnvironmentData>\n  <Time>23:07</Time>\n  <Weather>阵雨</Weather>\n  <Description>潮湿的风吹动半掩的窗帘</Description>\n  <Location>南岸公寓</Location>\n</EnvironmentData>`,
  },
  symbol: { target: "「要被强调的话」", replacement: `<span style="color:#9f7aea;font-weight:700">$1</span>`, sample: "她垂下眼睛，轻声说：「你真的会回来吗？」" },
  text: { target: "关键线索", replacement: `<mark style="background:#e8ffad;padding:1px 5px;border-radius:5px">关键线索</mark>`, sample: "抽屉夹层里藏着一张关键线索，纸角已经泛黄。" },
  filter: { target: "作为一个人工智能模型", replacement: "", sample: "作为一个人工智能模型，我无法真正感受雨夜。" },
};

function widgetVariableMap(kind: Kind) {
  const count = fieldCount(kind);
  const openTags = kind === "officialSticker" ? [] : Array.from(xml(kind, defaults[kind]).matchAll(/<([A-Za-z_][\w.-]*)>/g), (match) => match[1]).slice(1, count + 1);
  const rows = meta[kind].labels.slice(0, count).map((label, index) => {
    const tag = openTags[index] ? "<" + openTags[index] + ">" : label || "字段 " + (index + 1);
    return "| $" + (index + 1) + " | " + tag + " | " + (label || "第 " + (index + 1) + " 个动态内容") + " |";
  });
  return ["| 占位符 | XML 标签 / 字段 | 说明 |", "|---|---|---|", ...rows].join("\n");
}

function captures(pattern: string) { return (pattern.match(/(^|[^\\])\((?!\?)/g) || []).length; }
function risky(pattern: string) { return pattern.length > 1800 || /\([^)]*[+*][^)]*\)[+*{]/.test(pattern) || /(\.\*){2,}/.test(pattern); }

function runReplace(sample: string, pattern: string, flags: string, replacement: string) {
  if (!pattern) return { output: sample, error: "请先生成正则表达式。", matches: 0 };
  if (risky(pattern)) return { output: sample, error: "表达式可能造成性能问题，请减少嵌套量词。", matches: 0 };
  try {
    const clean = Array.from(new Set(flags.replace(/[^gimsu]/g, "").split(""))).join("");
    const countFlags = clean.includes("g") ? clean : `${clean}g`;
    let count = 0;
    for (const item of sample.matchAll(new RegExp(pattern, countFlags))) { if (item.index !== undefined) count += 1; if (count > 200) break; }
    return { output: sample.replace(new RegExp(pattern, clean), replacement), error: "", matches: count };
  } catch (error) { return { output: sample, error: error instanceof Error ? error.message : "表达式无效", matches: 0 }; }
}

const copyFields = ["primary", "secondary", "description", "extra"] as const;
const officialKinds = ["officialStatus", "officialMemory", "officialMap", "officialSticker", "officialPhone"] as const satisfies readonly Kind[];
type OfficialKind = typeof officialKinds[number];
const isOfficialKind = (kind: Kind) => (officialKinds as readonly Kind[]).includes(kind);
const officialOriginalSource = (kind: Kind) => isOfficialKind(kind) ? officialMufyReplacements[kind as OfficialKind] : "";
const fieldCount = (kind: Kind) => meta[kind].fields ?? 4;
const captureLabel = (kind: Kind) => fieldCount(kind) === 1 ? "$1" : `$1—$${fieldCount(kind)}`;
const widgetScenario = (kind: Kind): Scenario => kind === "officialSticker" ? "symbol" : "component";
function officialPattern(kind: Kind) {
  if (kind === "officialStatus") return "<EnvironmentData>\\s*<Time>([\\s\\S]*?)<\\/Time>\\s*<Weather>([\\s\\S]*?)<\\/Weather>\\s*<Description>([\\s\\S]*?)<\\/Description>\\s*<\\/EnvironmentData>";
  if (kind === "officialMemory") return "<MemoryArea>\\s*<KeyMilestones>([\\s\\S]*?)<\\/KeyMilestones>\\s*<LongTermMemory>([\\s\\S]*?)<\\/LongTermMemory>\\s*<ShortTermMemory>([\\s\\S]*?)<\\/ShortTermMemory>\\s*<\\/MemoryArea>";
  if (kind === "officialMap") return "<FantasyMap>\\s*<CurrentLocation>([\\s\\S]*?)<\\/CurrentLocation>\\s*<EnvironmentDesc>([\\s\\S]*?)<\\/EnvironmentDesc>\\s*<\\/FantasyMap>";
  if (kind === "officialSticker") return "\\[(开心|愤怒|无语|震惊)\\]";
  if (kind === "officialPhone") return "<Phone>\\s*<UserInput>([\\s\\S]*?)<\\/UserInput>\\s*<AiInput>([\\s\\S]*?)<\\/AiInput>\\s*<\\/Phone>";
  return "";
}
function officialCompatibilityLabel(kind: Kind) {
  return /<script\b/i.test(officialOriginalSource(kind)) ? "原版含 JS" : "原版无 JS";
}
function exportLevel(kind: Kind, variant: OfficialVariant) {
  if (isOfficialKind(kind) && variant === "original") return "官方原版 · HTML/CSS/JS/CDN 逐字保留";
  if (isBlogWidgetKind(kind)) return "博客挂件 · 纯 HTML/CSS · 源码同源预览";
  if (kind === "officialPhone") return "Studio 设计版 · 非官方外观 · DOM 桥接实验";
  if (kind === "officialSticker") return "Studio 设计版 · 非官方外观 · 无 JS";
  if (isOfficialKind(kind)) return "官方结构 · HTML/CSS 高兼容";
  return (["environment","bond","phone","quest","memory","fate"] as Kind[]).includes(kind) ? "无 JS 折叠可移植" : "静态展示可移植";
}

function xml(kind: Kind, copy: Copy) {
  if (isBlogWidgetKind(kind)) return blogWidgetXml(kind, copy);
  if (kind === "officialStatus") return `<EnvironmentData>\n  <Time>${copy.primary}</Time>\n  <Weather>${copy.secondary}</Weather>\n  <Description>${copy.description}</Description>\n</EnvironmentData>`;
  if (kind === "officialMemory") return `<MemoryArea>\n  <KeyMilestones>${copy.primary}</KeyMilestones>\n  <LongTermMemory>${copy.secondary}</LongTermMemory>\n  <ShortTermMemory>${copy.description}</ShortTermMemory>\n</MemoryArea>`;
  if (kind === "officialMap") return `<FantasyMap>\n  <CurrentLocation>${copy.primary}</CurrentLocation>\n  <EnvironmentDesc>${copy.secondary}</EnvironmentDesc>\n</FantasyMap>`;
  if (kind === "officialSticker") return `[${copy.primary}]`;
  if (kind === "officialPhone") return `<Phone>\n  <UserInput>${copy.primary}</UserInput>\n  <AiInput>${copy.secondary}</AiInput>\n</Phone>`;
  const names: Record<LegacyKind, [string, string, string, string, string]> = {
    environment: ["EnvironmentData", "Time", "Weather", "Description", "Location"],
    bond: ["BondData", "Character", "Stage", "Thought", "Affinity"],
    phone: ["PhoneMessage", "Contact", "Status", "Message", "Unread"],
    chapter: ["ChapterData", "Number", "Title", "Narration", "Location"],
    emotion: ["EmotionData", "Character", "Mood", "Trigger", "Intensity"],
    quest: ["QuestData", "Goal", "Stage", "Hint", "Progress"],
    memory: ["MemoryData", "Title", "Date", "Moment", "Location"],
    inventory: ["ItemData", "Owner", "Item", "Story", "Status"],
    soundtrack: ["SoundtrackData", "Track", "Artist", "Note", "Progress"],
    fate: ["FortuneData", "Fortune", "Level", "Message", "LuckyNumber"],
    map: ["RouteData", "Origin", "Destination", "Direction", "Distance"],
    schedule: ["ScheduleData", "Date", "Current", "Next", "Progress"],
    officialStatus: ["EnvironmentData", "Time", "Weather", "Description", "Unused"],
    officialMemory: ["MemoryArea", "KeyMilestones", "LongTermMemory", "ShortTermMemory", "Unused"],
    officialMap: ["FantasyMap", "CurrentLocation", "EnvironmentDesc", "UnusedA", "UnusedB"],
    officialSticker: ["Sticker", "Name", "UnusedA", "UnusedB", "UnusedC"],
    officialPhone: ["Phone", "UserInput", "AiInput", "UnusedA", "UnusedB"],
  };
  const [root, a, b, c, d] = names[kind];
  return `<${root}>\n  <${a}>${copy.primary}</${a}>\n  <${b}>${copy.secondary}</${b}>\n  <${c}>${copy.description}</${c}>\n  <${d}>${copy.extra}</${d}>\n</${root}>`;
}

function instruction(kind: Kind, copy: Copy) {
  if (kind === "officialSticker") return `在每次回复结尾，根据角色当前状态只输出以下四种标记之一：\n\n[开心]、[愤怒]、[无语]、[震惊]\n\n当前测试标记：${xml(kind, copy)}\n\n【重要约束】\n- 中括号与名称必须完全一致。\n- 不要在括号内添加解释或其他文字。\n- 本预设按官方“符号匹配”案例生成；本站用等价 CSS 图片映射替代官方案例脚本，提高可移植性。`;
  if (kind === "officialMap") return `当玩家抵达新地点、探索环境或查看地图时，请在回复末尾严格输出以下 XML：\n\n${xml(kind, copy)}\n\n【重要约束】\n- <CurrentLocation> 只能从：血色修道院、灰烬荒原、沉沦之城、黑石深渊、叹息之门 中选择。\n- 地点字词必须完全一致，否则地图不会高亮。\n- XML 前后不要添加解释、Markdown 围栏或其他文字。`;
  if (kind === "officialMemory") return `每轮对话结束时更新记忆区，并严格输出以下 XML：\n\n${xml(kind, copy)}\n\n【字段规则】\n- <KeyMilestones>：只记录改变关系或剧情走向的重大事件。\n- <LongTermMemory>：约每五条短期记忆归纳一条长期记忆。\n- <ShortTermMemory>：每轮新增一条简短事实总结。\n- 多条记忆可分别用 <span class="evt">记忆内容</span> 包裹。\n\n【重要约束】\n- 三个标签必须全部保留且顺序不变。\n- XML 前后不要添加解释、Markdown 围栏或其他文字。`;
  if (kind === "officialPhone") return `严格按照以下 XML 输出手机聊天组件，不要输出任何其他内容：\n\n${xml(kind, copy)}\n\n【字段规则】\n- <UserInput>：汇总用户消息，每条用 ||| 分隔。\n- <AiInput>：汇总角色回复，每条用 ||| 分隔。\n\n【重要约束】\n- 严格保留 <Phone><UserInput><AiInput> 标签。\n- 不删减、不润色原消息；最后一条后不必添加 |||。\n- 官方案例中的“发送到 Mufy”依赖页面脚本与 DOM，需实机验证。`;
  if (kind === "officialStatus") return `在每次对话开始时，按照剧情需要更新环境信息，并严格输出以下 XML：\n\n${xml(kind, copy)}\n\n【字段规则】\n- <Time>：当前场景具体时间，建议 HH:MM:SS。\n- <Weather>：简短天气描述。\n- <Description>：一句带感官细节的环境描述。\n\n【重要约束】\n- 标签名称与层级必须完全一致。\n- XML 前后不要添加解释、Markdown 围栏或其他文字。`;
  return `在剧情需要更新「${meta[kind].name}」时，严格按照以下 XML 结构输出：\n\n${xml(kind, copy)}\n\n【重要约束】\n- 标签名称与层级必须完全一致，不要翻译、增删或改写标签。\n- 每个标签内只填写对应的纯文本内容，不要嵌套标签或重复标签。\n- XML 前后不要添加解释、Markdown 代码围栏或额外文字。`;
}

function markup(kind: Kind, style: Style) {
  const p = palettes[style.palette];
  if (isBlogWidgetKind(kind)) return blogWidgetMarkup(kind, style, p);
  const pad = style.compact ? 12 : 18, blur = Math.round(style.glass * .22);
  const cls=`mufy-${kind}-p${style.palette}-r${Math.round(style.radius)}-g${Math.round(style.glass)}-${style.compact?"c":"n"}-${style.motion?"m":"s"}`;
  const shared = `<style>.${cls}{width:100%;box-sizing:border-box;padding:${pad}px;border-radius:${style.radius}px;color:${p.ink};background:${p.bg};background:linear-gradient(145deg,${p.surface}f2,${p.bg}f2);border:1px solid ${p.ink}1c;box-shadow:0 18px 48px ${p.bg}40;backdrop-filter:blur(${blur}px);font-family:system-ui,'Noto Sans SC',sans-serif;${style.motion ? `animation:${cls}-rise .5s ease both` : ""}}.${cls} *{box-sizing:border-box}.${cls} summary{list-style:none;cursor:pointer}.${cls} summary::-webkit-details-marker{display:none}.${cls} .mufy-accent{color:${p.accent}}.${cls} .mufy-muted{color:${p.muted}}@keyframes ${cls}-rise{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}</style>`;
  if (kind === "officialStatus") return `${shared}<div class="${cls}" style="display:flex;flex-direction:column;gap:11px"><div style="display:grid;grid-template-columns:1.2fr 1fr;gap:11px"><section style="padding:12px;border:1px solid ${p.accent}55;border-bottom:2px solid ${p.accent};border-radius:10px;background:${p.ink}0a"><small class="mufy-muted" style="display:block;letter-spacing:.16em">CHRONO</small><b style="display:block;margin-top:5px;font:700 18px ui-monospace,monospace">$1</b></section><section style="padding:12px;border:1px solid ${p.accent}55;border-bottom:2px solid ${p.accent};border-radius:10px;background:${p.ink}0a"><small class="mufy-muted" style="display:block;letter-spacing:.16em">SKY</small><b style="display:block;margin-top:5px">$2</b></section></div><section style="padding:12px;border:1px solid ${p.accent}55;border-bottom:2px solid ${p.accent};border-radius:10px;background:${p.ink}0a"><span style="display:flex;align-items:center;gap:7px"><i style="width:6px;height:6px;border-radius:50%;background:${p.accent};box-shadow:0 0 9px ${p.accent};animation:${cls}-pulse 2s infinite"></i><small class="mufy-muted" style="letter-spacing:.16em">ATMOSPHERE</small></span><p style="margin:7px 0 0;line-height:1.65">$3</p></section></div><style>@keyframes ${cls}-pulse{50%{opacity:.25;transform:scale(.75)}}.${cls} section{transition:transform .25s ease,background .25s ease}.${cls} section:hover{transform:translateY(-2px);background:${p.ink}12}</style>`;
  if (kind === "officialMemory") return `${shared}<details class="${cls}" open style="border:3px solid ${p.accent};box-shadow:inset 3px 3px 0 ${p.ink}30,inset -3px -3px 0 ${p.bg}"><summary style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;margin:-${pad}px -${pad}px 14px;background:${p.accent};color:${p.bg};font-weight:900;letter-spacing:.08em"><span>MEMORY AREA</span><span>[ + / − ]</span></summary><div style="display:grid;gap:10px"><details open style="border:2px solid ${p.accent}77;background:${p.ink}08"><summary style="padding:9px 11px;font-weight:800">◆ 关键里程碑</summary><div style="padding:11px;border-top:1px solid ${p.accent}55;line-height:1.65">$1</div></details><details open style="border:2px solid ${p.accent}77;background:${p.ink}08"><summary style="padding:9px 11px;font-weight:800">◈ 长期记忆</summary><div style="padding:11px;border-top:1px solid ${p.accent}55;line-height:1.65">$2</div></details><details open style="border:2px solid ${p.accent}77;background:${p.ink}08"><summary style="padding:9px 11px;font-weight:800">◇ 短期记忆</summary><div style="padding:11px;border-top:1px solid ${p.accent}55;line-height:1.65">$3</div></details></div></details><style>.${cls} .evt{display:block;position:relative;margin:7px 0;padding-left:13px;border-left:2px solid ${p.accent}77}.${cls} .evt:before{content:"";position:absolute;left:-5px;top:.55em;width:7px;height:7px;border-radius:2px;background:${p.accent}}</style>`;
  if (kind === "officialMap") return `${shared}<div class="${cls}" data-location="$1" style="border:3px solid #6d0c16;background:#090707;color:#d8c9c9"><header style="text-align:center;border-bottom:1px solid #8b111f;padding-bottom:10px"><b style="display:block;color:#ff3349;letter-spacing:.22em;font-family:serif">REALM OF DESPAIR</b><small style="color:#79686a;letter-spacing:.16em">LOCATION TRACKING SYSTEM</small></header><div class="mufy-official-map-grid" style="position:relative;height:230px;margin-top:13px;border:1px solid #382326;background:radial-gradient(circle,#2a080c,#050505);overflow:hidden"><i data-name="血色修道院">血色修道院</i><i data-name="灰烬荒原">灰烬荒原</i><i data-name="沉沦之城">沉沦之城</i><i data-name="黑石深渊">黑石深渊</i><i data-name="叹息之门">叹息之门</i></div><footer style="margin-top:13px;padding:12px;border:1px solid #6d0c16"><b style="display:block;color:#ff4d5e;font-size:12px">▶ CURRENT LOCATION: $1</b><p style="margin:8px 0 0;color:#c1aeb0;line-height:1.65;font-family:serif;font-style:italic">$2</p></footer></div><style>.${cls} .mufy-official-map-grid i{position:absolute;display:grid;place-items:center;background:#171313;border:1px solid #3c3031;color:#6f6263;font-style:normal;font-size:12px;transition:.35s;filter:brightness(.65)}.${cls} .mufy-official-map-grid i:nth-child(1){left:5%;top:8%;width:43%;height:34%;clip-path:polygon(0 0,100% 0,82% 90%,5% 100%)}.${cls} .mufy-official-map-grid i:nth-child(2){right:5%;top:9%;width:42%;height:37%;clip-path:polygon(12% 0,100% 10%,90% 95%,0 82%)}.${cls} .mufy-official-map-grid i:nth-child(3){left:8%;bottom:5%;width:40%;height:47%;clip-path:polygon(8% 5%,95% 0,100% 90%,5% 100%)}.${cls} .mufy-official-map-grid i:nth-child(4){right:6%;bottom:5%;width:39%;height:43%;clip-path:polygon(5% 10%,95% 5%,90% 100%,0 90%)}.${cls} .mufy-official-map-grid i:nth-child(5){left:36%;top:34%;width:28%;height:29%;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);z-index:2}.${cls}[data-location="血色修道院"] [data-name="血色修道院"],.${cls}[data-location="灰烬荒原"] [data-name="灰烬荒原"],.${cls}[data-location="沉沦之城"] [data-name="沉沦之城"],.${cls}[data-location="黑石深渊"] [data-name="黑石深渊"],.${cls}[data-location="叹息之门"] [data-name="叹息之门"]{background:linear-gradient(145deg,#5c000a,#b00016);border-color:#ff4d5e;color:#fff;filter:brightness(1.1);z-index:5;box-shadow:0 0 18px #e0001d;animation:${cls}-map-pulse 2s infinite alternate}@keyframes ${cls}-map-pulse{to{box-shadow:0 0 28px #ff203b}}.${cls} .mufy-official-map-grid i:hover{filter:brightness(1.2)}</style>`;
  if (kind === "officialSticker") return `${shared}<div class="${cls}" data-meme="$1" style="display:inline-grid;width:auto;padding:8px"><span data-key="开心" role="img" aria-label="开心"><b>😄</b><img src="https://cdn.mufy.ai/images/bcd519fc-3e9a-43dd-2bec-0426750e3e00/public" alt=""></span><span data-key="愤怒" role="img" aria-label="愤怒"><b>😠</b><img src="https://cdn.mufy.ai/images/362712d1-92d3-4690-98d4-cd30d52ab000/public" alt=""></span><span data-key="无语" role="img" aria-label="无语"><b>😑</b><img src="https://cdn.mufy.ai/images/71ae5d8a-b7e5-46f5-28c5-8a3453d0f500/public" alt=""></span><span data-key="震惊" role="img" aria-label="震惊"><b>😲</b><img src="https://cdn.mufy.ai/images/240ee01c-c11f-44a5-260e-14872d0da100/public" alt=""></span><small class="mufy-muted" style="text-align:center;margin-top:6px">[$1]</small></div><style>.${cls}[data-meme] [data-key]{display:none;position:relative;width:168px;height:168px;overflow:hidden;border-radius:${Math.max(10,style.radius-5)}px;background:${p.surface}}.${cls}[data-meme] [data-key]>b{position:absolute;inset:0;display:grid;place-items:center;font-size:62px}.${cls}[data-meme] [data-key]>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;color:transparent}.${cls}[data-meme="开心"] [data-key="开心"],.${cls}[data-meme="愤怒"] [data-key="愤怒"],.${cls}[data-meme="无语"] [data-key="无语"],.${cls}[data-meme="震惊"] [data-key="震惊"]{display:block}</style>`;
  if (kind === "officialPhone") return `${shared}<div class="${cls}" data-mufy-phone style="max-width:330px;margin:auto;padding:8px;border-radius:38px;background:linear-gradient(#344052,#10131a);border:1px solid ${p.ink}33"><div style="height:535px;display:flex;flex-direction:column;overflow:hidden;border-radius:31px;background:#090a0d;border:1px solid #000"><header style="padding:18px 14px 12px;text-align:center;border-bottom:1px solid #ffffff12;font-weight:800">MUMU 🐱 <small class="mufy-muted" style="display:block;margin-top:3px">官方结构 · 本地聊天预览</small></header><div class="mufy-phone-stream" style="flex:1;overflow:auto;padding:13px;display:flex;flex-direction:column;gap:10px"></div><div hidden data-phone-source="user">$1</div><div hidden data-phone-source="ai">$2</div><form class="mufy-phone-form" style="display:flex;gap:7px;padding:10px;border-top:1px solid #ffffff12"><input aria-label="手机消息" placeholder="输入并回车预览" style="min-width:0;flex:1;border:1px solid #ffffff16;border-radius:10px;background:#171920;color:#fff;padding:9px"><button type="submit" style="border:0;border-radius:10px;background:${p.accent};color:${p.bg};padding:0 12px;font-weight:800">加入</button></form><button type="button" class="mufy-phone-bridge" style="margin:0 10px 12px;border:1px solid ${p.accent}66;border-radius:10px;background:transparent;color:${p.accent};padding:9px;font-weight:800">结束发送到 Mufy（实验）</button><small class="mufy-phone-note" style="display:block;padding:0 12px 12px;color:${p.muted};text-align:center">父页面桥接依赖 Mufy DOM，可能不可用</small></div></div><script>(function(){var script=document.currentScript;var root=script&&script.previousElementSibling;if(!root||!root.hasAttribute('data-mufy-phone'))return;var stream=root.querySelector('.mufy-phone-stream');var form=root.querySelector('.mufy-phone-form');var input=form.querySelector('input');var bridge=root.querySelector('.mufy-phone-bridge');var note=root.querySelector('.mufy-phone-note');var pending=[];function add(text,side){if(!text||!text.trim())return;var row=document.createElement('div');row.textContent=text.trim();row.style.cssText='max-width:78%;padding:9px 11px;border-radius:14px;line-height:1.45;font-size:13px;overflow-wrap:anywhere;'+(side==='user'?'align-self:flex-end;background:#07c160;color:#fff;border-bottom-right-radius:4px':'align-self:flex-start;background:#24272f;color:#f4f4f5;border-bottom-left-radius:4px');stream.appendChild(row);}function source(name,side){var node=root.querySelector('[data-phone-source="'+name+'"]');String(node?node.textContent:'').split('|||').forEach(function(text){add(text,side);});}source('user','user');source('ai','ai');stream.scrollTop=stream.scrollHeight;form.addEventListener('submit',function(event){event.preventDefault();var value=input.value.trim();if(!value)return;add(value,'user');pending.push(value);input.value='';stream.scrollTop=stream.scrollHeight;});bridge.addEventListener('click',function(){if(!pending.length){note.textContent='请先在输入框加入至少一条新消息';return;}try{var parentDoc=window.parent.document;var textarea=parentDoc.querySelector('#mufy_chat_input textarea')||parentDoc.querySelector('textarea[placeholder*="Enter"]')||parentDoc.querySelector('textarea');if(!textarea)throw new Error('not found');var value=pending.join('|||');var setter=Object.getOwnPropertyDescriptor(window.parent.HTMLTextAreaElement.prototype,'value');if(setter&&setter.set)setter.set.call(textarea,value);else textarea.value=value;textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.dispatchEvent(new Event('change',{bubbles:true}));textarea.focus();note.textContent='已回填 Mufy 输入框；请确认后发送';}catch(error){note.textContent='桥接不可用：请复制本地消息后手动发送';}});})();</script>`;
  if (kind === "bond") return `${shared}<details class="${cls}" open><summary class="mufy-accent" style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;letter-spacing:.14em"><span>BOND SIGNAL</span><span>♥ 点击收起</span></summary><div style="display:flex;align-items:end;gap:12px;margin:14px 0 10px"><strong style="font-size:27px">$1</strong><span class="mufy-muted">$2</span><b style="margin-left:auto;font-size:23px">$4 / 100</b></div><div style="height:7px;border-radius:8px;background:${p.ink}18;overflow:hidden"><i style="display:block;width:72%;height:100%;background:${p.accent}"></i></div><p class="mufy-muted" style="line-height:1.65">$3</p></details>`;
  if (kind === "phone") return `${shared}<details class="${cls}" open><summary style="display:flex;justify-content:space-between"><span class="mufy-accent" style="font-weight:800;letter-spacing:.14em">MESSAGES</span><span class="mufy-muted">点击展开/收起</span></summary><div style="display:grid;grid-template-columns:42px 1fr auto;gap:11px;align-items:center;margin-top:15px"><i style="width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:${p.accent};color:${p.bg};font-style:normal">✦</i><span><b style="display:block">$1</b><small class="mufy-muted">$2</small></span><em style="font-style:normal;background:${p.accent};color:${p.bg};padding:2px 7px;border-radius:999px">$4</em></div><p style="padding:11px;background:${p.ink}0d;border-radius:12px;line-height:1.6">$3</p></details>`;
  if (kind === "chapter") return `${shared}<div class="${cls}" style="text-align:center;padding:${style.compact ? 22 : 32}px"><span class="mufy-accent" style="font-size:11px;font-weight:800;letter-spacing:.15em">$1 · $4</span><i style="display:block;width:34px;height:1px;background:${p.accent};margin:14px auto"></i><strong style="display:block;font-size:28px;letter-spacing:.08em">$2</strong><p class="mufy-muted" style="font-family:serif;line-height:1.8">$3</p></div>`;
  if (kind === "emotion") return `${shared}<div class="${cls}"><div style="display:flex;justify-content:space-between;align-items:start"><span><small class="mufy-accent" style="font-weight:800;letter-spacing:.14em">EMOTION COMPASS</small><b style="display:block;font-size:22px;margin-top:6px">$1</b></span><strong class="mufy-accent" style="font-size:32px">$4</strong></div><div style="margin:14px 0;height:9px;border-radius:99px;background:${p.ink}18;overflow:hidden"><i style="display:block;width:78%;height:100%;background:linear-gradient(90deg,${p.muted},${p.accent})"></i></div><b>$2</b><p class="mufy-muted" style="line-height:1.7;margin-bottom:0">$3</p></div>`;
  if (kind === "quest") return `${shared}<details class="${cls}" open><summary style="display:flex;justify-content:space-between;align-items:center"><span class="mufy-accent" style="font-weight:800;letter-spacing:.14em">ACTIVE QUEST</span><b>$4%</b></summary><h3 style="margin:15px 0 5px;font-size:20px">$1</h3><small class="mufy-muted">$2</small><div style="height:6px;margin:13px 0;border-radius:99px;background:${p.ink}18;overflow:hidden"><i style="display:block;width:64%;height:100%;background:${p.accent}"></i></div><p style="margin:0;padding:11px;border-radius:11px;background:${p.ink}0d;line-height:1.65">◇ $3</p></details>`;
  if (kind === "memory") return `${shared}<details class="${cls}" open style="padding-bottom:${style.compact ? 16 : 24}px"><summary style="min-height:112px;border-radius:${Math.max(7,style.radius-7)}px;background:radial-gradient(circle at 72% 24%,${p.accent}55,transparent 25%),linear-gradient(140deg,${p.bg},${p.surface});display:grid;place-items:center;align-content:center;gap:8px;border:1px solid ${p.ink}17"><span class="mufy-accent" style="font-size:28px">◫</span><small class="mufy-muted">点击展开 / 收起记忆</small></summary><div style="padding:13px 5px 0"><small class="mufy-accent">$2 · $4</small><h3 style="margin:7px 0;font-family:serif;font-size:21px">$1</h3><p class="mufy-muted" style="margin:0;line-height:1.7">$3</p></div></details>`;
  if (kind === "inventory") return `${shared}<div class="${cls}"><div style="display:grid;grid-template-columns:58px 1fr;gap:14px;align-items:center"><i style="width:58px;height:58px;display:grid;place-items:center;border-radius:17px;background:${p.accent};color:${p.bg};font-style:normal;font-size:24px">◇</i><span><small class="mufy-muted">$1 的随身物</small><b style="display:block;font-size:19px;margin:4px 0">$2</b><em class="mufy-accent" style="font-style:normal;font-size:10px">● $4</em></span></div><div style="height:1px;background:${p.ink}18;margin:15px 0"></div><p class="mufy-muted" style="line-height:1.7;margin:0">$3</p></div>`;
  if (kind === "soundtrack") return `${shared}<div class="${cls}"><div style="display:flex;align-items:center;gap:14px"><i style="width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,${p.accent} 0 12%,${p.bg} 13% 25%,${p.accent} 27% 31%,${p.bg} 33%);font-style:normal;color:${p.ink}">♪</i><span style="min-width:0;flex:1"><small class="mufy-accent">NOW PLAYING</small><b style="display:block;margin:4px 0;font-size:18px">$1</b><em class="mufy-muted" style="font-style:normal">$2</em></span><b>Ⅱ</b></div><div style="height:4px;margin:14px 0 7px;border-radius:9px;background:${p.ink}18"><i style="display:block;width:49%;height:100%;background:${p.accent}"></i></div><small class="mufy-muted">$4</small><p style="margin:11px 0 0;line-height:1.6">$3</p></div>`;
  if (kind === "fate") return `${shared}<details class="${cls}" open style="text-align:center"><summary class="mufy-accent" style="font-size:11px;font-weight:800;letter-spacing:.16em">✶ FATE DRAW ✶</summary><div style="width:58px;height:58px;display:grid;place-items:center;margin:15px auto 10px;border:1px solid ${p.accent};border-radius:50%;font-size:24px">$4</div><h3 style="font-family:serif;font-size:22px;margin:7px 0">$1</h3><b class="mufy-accent">$2</b><p class="mufy-muted" style="line-height:1.8;margin-bottom:0">$3</p></details>`;
  if (kind === "map") return `${shared}<div class="${cls}"><div style="display:flex;align-items:center;gap:9px"><span style="flex:1"><small class="mufy-muted">CURRENT</small><b style="display:block">$1</b></span><i class="mufy-accent" style="font-style:normal">•••→</i><span style="flex:1;text-align:right"><small class="mufy-muted">DESTINATION</small><b style="display:block">$2</b></span></div><div style="margin:15px 0;padding:15px;border-radius:13px;background:linear-gradient(135deg,${p.ink}0b 25%,transparent 25%) 0 0/18px 18px,${p.bg}66"><div style="height:2px;background:${p.accent};position:relative"><i style="position:absolute;left:0;top:-4px;width:10px;height:10px;border-radius:50%;background:${p.accent}"></i><i style="position:absolute;right:0;top:-4px;width:10px;height:10px;border-radius:50%;background:${p.accent}"></i></div></div><p class="mufy-muted" style="line-height:1.65;margin:0">$3</p><small class="mufy-accent" style="display:block;margin-top:8px">⌖ $4</small></div>`;
  if (kind === "schedule") return `${shared}<div class="${cls}"><div style="display:flex;justify-content:space-between"><span class="mufy-accent" style="font-weight:800;letter-spacing:.13em">TODAY · $1</span><b>$4%</b></div><div style="display:grid;grid-template-columns:15px 1fr;gap:9px;margin-top:16px"><span style="display:flex;flex-direction:column;align-items:center"><i style="width:11px;height:11px;border:3px solid ${p.accent};border-radius:50%"></i><i style="width:1px;flex:1;background:${p.ink}22"></i><i style="width:7px;height:7px;background:${p.muted};border-radius:50%"></i></span><span><small class="mufy-accent">NOW</small><b style="display:block;margin:4px 0 18px">$2</b><small class="mufy-muted">NEXT</small><p style="margin:4px 0 0;line-height:1.65">$3</p></span></div></div>`;
  return `${shared}<details class="${cls}" open><summary style="display:flex;justify-content:space-between;align-items:start"><span><small class="mufy-accent" style="font-weight:800;letter-spacing:.14em">SCENE SIGNAL</small><b style="display:block;font-size:28px;margin-top:5px">$1</b></span><span style="text-align:right"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.accent};box-shadow:0 0 12px ${p.accent}"></i><b style="display:block;margin-top:7px">$2</b></span></summary><div style="height:1px;background:${p.ink}18;margin:15px 0"></div><p class="mufy-muted" style="line-height:1.7">$3</p><small class="mufy-accent">⌖ $4</small></details>`;
}

function widgetVars(style: Style): CSSProperties {
  const p = palettes[style.palette];
  return { "--w-bg": p.bg, "--w-surface": p.surface, "--w-accent": p.accent, "--w-ink": p.ink, "--w-muted": p.muted, "--w-radius": `${style.radius}px`, "--w-pad": `${style.compact ? 13 : 20}px`, "--w-blur": `${Math.round(style.glass * .22)}px` } as CSSProperties;
}

function escapePreviewValue(value: string) {
  return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function fillCaptures(value: string, copy: Copy) {
  const values = [copy.primary, copy.secondary, copy.description, copy.extra].map(escapePreviewValue);
  return value.replace(/\$([1-4])/g, (_, index: string) => values[Number(index) - 1] ?? "");
}

function fillOfficialOriginalPreview(kind: Kind, value: string, copy: Copy) {
  if (kind === "officialStatus") return value;
  if (kind === "officialMemory") return value.replace(/\$([1-3])/g, (_, index: string) => escapePreviewValue([copy.primary,copy.secondary,copy.description][Number(index)-1] ?? ""));
  if (kind === "officialMap") {
    const locations=["血色修道院","灰烬荒原","沉沦之城","黑石深渊","叹息之门"];
    const location=locations.includes(copy.primary)?copy.primary:defaults.officialMap.primary;
    return value.replace(/\$1/g,()=>location).replace(/\$2/g,()=>escapePreviewValue(copy.secondary));
  }
  if (kind === "officialSticker") {
    const sticker=["开心","愤怒","无语","震惊"].includes(copy.primary)?copy.primary:"开心";
    return value.replace(/\$1/g,()=>sticker);
  }
  if (kind === "officialPhone") {
    return fillOfficialPhonePreviewCaptures(value,copy.primary,copy.secondary);
  }
  return value;
}

function WidgetPreview({ kind, copy, style, source, officialVariant }: { kind: Kind; copy: Copy; style: Style; source: string; officialVariant: OfficialVariant }) {
  const [open, setOpen] = useState(true); const [tab, setTab] = useState<"消息" | "备忘">("消息");
  const [runScripts, setRunScripts] = useState(officialPreviewScriptsEnabledByDefault(kind));
  const shell = `widget-preview ${style.motion ? "motion" : ""}`;
  if (isOfficialKind(kind)) {
    const rendered=officialVariant==="original"?fillOfficialOriginalPreview(kind,source,copy):fillCaptures(source,copy);
    const previewRendered=officialVariant==="original"?prepareOfficialPreviewDocument(kind,rendered):rendered;
    const completeDocument=/^\s*(?:<!doctype\s+html|<html\b)/i.test(previewRendered);
    const hasScripts=/<script\b/i.test(rendered);
    return <div className="official-preview-stack">
      {hasScripts&&<div className="official-script-consent"><span>{runScripts?"脚本已在隔离预览中运行；仍无法读取本站页面":"脚本已停用，官方样式与交互会降级"}</span><button type="button" aria-pressed={runScripts} onClick={()=>setRunScripts(value=>!value)}>{runScripts?"停用脚本":"恢复官方效果"}</button></div>}
      {kind==="officialPhone"&&runScripts&&officialVariant==="original"&&<p className="official-preview-runtime-note"><b>本站预览说明</b><span>回车加入消息后，“结束发送”会生成一条明确标注的模拟回复；导出的仍是未经修改的官方源码，在 Mufy 内由角色继续回复。</span></p>}
      {kind==="officialSticker"&&runScripts&&officialVariant==="original"&&<p className="official-preview-runtime-note"><b>官方图片映射已启用</b><span>当前预览运行官方 Tailwind 与图片脚本；导出的图片地址、尺寸和圆角均保持官方原文。</span></p>}
      <iframe key={`${kind}-${officialVariant}-${runScripts?"scripts-on":"scripts-off"}`} className={`official-widget-preview ${kind === "officialPhone" ? "official-phone-preview" : ""}`} title={`${meta[kind].name} ${officialVariant==="original"?"官方原版":"Studio 设计版"}预览`} sandbox={hasScripts&&runScripts?"allow-scripts":""} srcDoc={completeDocument?previewRendered:previewDoc(previewRendered)}/>
    </div>;
  }
  if (isBlogWidgetKind(kind)) {
    const rendered = fillCaptures(source, copy);
    return <div className="blog-widget-preview-stack">
      <p><b>官网同源预览</b><span>这里直接渲染将要复制的 HTML/CSS；点击折叠等原生交互可用，不含脚本。</span></p>
      <iframe className="blog-widget-preview" title={meta[kind].name + " 官网同源预览"} sandbox="" srcDoc={previewDoc(rendered)}/>
    </div>;
  }
  if (kind === "bond") return <article className={shell} style={widgetVars(style)}><button className="widget-head" aria-expanded={open} onClick={() => setOpen(!open)}><span>BOND SIGNAL</span><b>♥ {open ? "收起" : "展开"}</b></button>{open && <><div className="bond-line"><strong>{copy.primary}</strong><span>{copy.secondary}</span><b>{copy.extra}<small> / 100</small></b></div><div className="meter"><i style={{width:`${Math.min(100, Math.max(0, Number(copy.extra)||0))}%`}} /></div><p>{copy.description}</p></>}</article>;
  if (kind === "phone") return <article className={shell} style={widgetVars(style)}><div className="phone-tabs"><b>MESSAGES</b>{(["消息","备忘"] as const).map(x=><button className={tab===x?"active":""} key={x} onClick={()=>setTab(x)}>{x}</button>)}</div>{tab==="消息"?<div className="message"><i>✦</i><span><b>{copy.primary}</b><small>{copy.secondary}</small><p>{copy.description}</p></span><em>{copy.extra}</em></div>:<div className="memo"><small>置顶备忘</small><p>{copy.description}</p></div>}</article>;
  if (kind === "chapter") return <article className={`${shell} chapter`} style={widgetVars(style)}><span>{copy.primary} · {copy.extra}</span><i/><strong>{copy.secondary}</strong><p>{copy.description}</p></article>;
  if (kind === "emotion") { const level=Math.min(100,Math.max(0,Number(copy.extra)||0)); return <article className={`${shell} emotion-card`} style={widgetVars(style)}><div className="widget-kicker"><span>EMOTION COMPASS</span><b>{level}</b></div><strong>{copy.primary}</strong><div className="emotion-scale"><i style={{width:`${level}%`}}/></div><b>{copy.secondary}</b><p>{copy.description}</p></article>; }
  if (kind === "quest") { const level=Math.min(100,Math.max(0,Number(copy.extra)||0)); return <article className={`${shell} quest-card`} style={widgetVars(style)}><button className="widget-head" aria-expanded={open} onClick={()=>setOpen(!open)}><span>ACTIVE QUEST</span><b>{level}% {open?"−":"+"}</b></button><h3>{copy.primary}</h3><small>{copy.secondary}</small>{open&&<><div className="meter"><i style={{width:`${level}%`}}/></div><p>◇ {copy.description}</p></>}</article>; }
  if (kind === "memory") return <article className={`${shell} memory-card`} style={widgetVars(style)}><button className="memory-photo" onClick={()=>setOpen(!open)} aria-expanded={open} aria-label="展开或收起记忆卡"><span>{open?"◫":"↶"}</span><small>{open?"轻触收起记忆":"轻触展开记忆"}</small></button>{open&&<div className="memory-copy"><small>{copy.secondary} · {copy.extra}</small><strong>{copy.primary}</strong><p>{copy.description}</p></div>}</article>;
  if (kind === "inventory") return <article className={`${shell} inventory-card`} style={widgetVars(style)}><div className="inventory-top"><i>◇</i><span><small>{copy.primary} 的随身物</small><strong>{copy.secondary}</strong><em>● {copy.extra}</em></span></div><p>{copy.description}</p></article>;
  if (kind === "soundtrack") return <article className={`${shell} soundtrack-card ${open?"playing":"paused"}`} style={widgetVars(style)}><div className="soundtrack-top"><button onClick={()=>setOpen(!open)} aria-pressed={open} aria-label={open?"暂停播放动画":"播放唱片动画"}>♪</button><span><small>NOW PLAYING</small><strong>{copy.primary}</strong><em>{copy.secondary}</em></span><b>{open?"Ⅱ":"▶"}</b></div><div className="soundtrack-progress"><i/></div><small>{copy.extra}</small><p>{copy.description}</p></article>;
  if (kind === "fate") return <article className={`${shell} fate-card`} style={widgetVars(style)}><button aria-expanded={open} onClick={()=>setOpen(!open)}><small>✶ {open?"收起签文":"揭示签文"} ✶</small><i>{open?copy.extra:"?"}</i></button><strong>{open?copy.primary:"命运仍未翻面"}</strong><b>{open?copy.secondary:"轻触揭晓"}</b>{open&&<p>{copy.description}</p>}</article>;
  if (kind === "map") return <article className={`${shell} map-card`} style={widgetVars(style)}><div className="route-head"><span><small>CURRENT</small><b>{copy.primary}</b></span><i>•••→</i><span><small>DESTINATION</small><b>{copy.secondary}</b></span></div><div className="route-map"><i/><b/></div><p>{copy.description}</p><small>⌖ {copy.extra}</small></article>;
  if (kind === "schedule") { const level=Math.min(100,Math.max(0,Number(copy.extra)||0)); return <article className={`${shell} schedule-card`} style={widgetVars(style)}><div className="widget-kicker"><span>TODAY · {copy.primary}</span><b>{level}%</b></div><div className="timeline"><span><i/><b/><i/></span><div><small>NOW</small><strong>{copy.secondary}</strong><small>NEXT</small><p>{copy.description}</p></div></div></article>; }
  return <article className={shell} style={widgetVars(style)}><button className="widget-head" aria-expanded={open} onClick={()=>setOpen(!open)}><span><small>SCENE SIGNAL</small><strong>{copy.primary}</strong></span><span><i/>{copy.secondary}<b>{open?"−":"+"}</b></span></button>{open&&<div className="environment-detail"><p>{copy.description}</p><small>⌖ {copy.extra}</small></div>}</article>;
}

function CopyButton({ value, label="复制" }: { value: string; label?: string }) {
  const [done,setDone]=useState(false);
  async function copy(){ try{await navigator.clipboard.writeText(value);setDone(true);setTimeout(()=>setDone(false),1400);}catch{/* browser may deny clipboard */} }
  return <button className={`copy-btn ${done?"done":""}`} onClick={copy}>{done?"已复制 ✓":label}</button>;
}

function download(value: unknown, filename="mufy-studio-project.json") {
  const blob=new Blob([JSON.stringify(value,null,2)],{type:"application/json;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}

function previewDoc(value:string){return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{background:#15121b;color-scheme:dark}body{min-height:100vh;margin:0;padding:18px;display:grid;place-items:center;box-sizing:border-box;color:#fff;font-family:system-ui,'Noto Sans SC',sans-serif}body>*{max-width:100%}</style></head><body>${value}</body></html>`;}
function previewResultDoc(value:string){const rendered=previewMufyReplacement(value)||"<p>内容已被过滤</p>";return /^\s*(?:<!doctype\s+html|<html\b)/i.test(rendered)?rendered:previewDoc(rendered);}

function warnings(scenario:Scenario, pattern:string, replacement:string, captureCount:number){const list:string[]=[];const refs=Array.from(replacement.matchAll(/\$(\d+)/g),m=>Number(m[1]));if(refs.some(x=>x>captureCount))list.push("替换代码引用了不存在的捕获变量");if(!isMufyReplacementReady(replacement))list.push("HTML 替换字符串需要完整的 ```html 围栏");if(scenario==="component"&&(!hasXmlTag(pattern)||captureCount===0))list.push("代码组件需要两层 XML，并至少包含 1 个可捕获的内层标签");if(/min-height\s*:\s*100vh/i.test(replacement))list.push("min-height: 100vh 可能导致 Mufy 输入框异常");if(/<(?:script|iframe|object|embed|form)\b|\son\w+\s*=|javascript:/i.test(replacement))list.push("检测到脚本或高风险标签，放入 Mufy 前请人工确认");if(/window\.parent\.document/.test(replacement))list.push("父页面 DOM 操作可能随 Mufy 更新失效");return list;}

export default function MufyStudio(){
  const [mode,setMode]=useState<Mode>("blueprint"),[kind,setKind]=useState<Kind>("environment"),[copy,setCopy]=useState<Copy>(defaults.environment),[style,setStyle]=useState<Style>({palette:0,radius:22,glass:58,compact:false,motion:true});
  const [officialVariant,setOfficialVariant]=useState<OfficialVariant>("original");
  const [panel,setPanel]=useState<"content"|"style">("content"),[viewport,setViewport]=useState<"wide"|"phone">("wide"),[codeTab,setCodeTab]=useState<"replacement"|"xml"|"instruction"|"beautifier">("replacement");
  const [previewNonce,setPreviewNonce]=useState(0);
  const [scenario,setScenario]=useState<Scenario>("component"),[name,setName]=useState("代码组件"),[target,setTarget]=useState(presets.component.target),[replacement,setReplacement]=useState(mufyReplacement(presets.component.replacement)),[sample,setSample]=useState(presets.component.sample),[flags,setFlags]=useState("g"),[manual,setManual]=useState(false),[customPattern,setCustomPattern]=useState(""),[enabled,setEnabled]=useState(true),[visible,setVisible]=useState(false),[resultView,setResultView]=useState<"preview"|"source">("preview"),[refresh,setRefresh]=useState(0),[allowScripts,setAllowScripts]=useState(false);
  const [outputSetting,setOutputSetting]=useState(""),[variableMap,setVariableMap]=useState(""),[beautifierPrompt,setBeautifierPrompt]=useState("");
  const [saved,setSaved]=useState(true),[notice,setNotice]=useState("");const hydrated=useRef(false),fileInput=useRef<HTMLInputElement>(null),regexRulePane=useRef<HTMLElement>(null),regexTestPane=useRef<HTMLElement>(null);
  const kinds=Object.keys(meta) as Kind[];
  const widgetSample=useMemo(()=>xml(kind,copy),[kind,copy]);
  const officialOriginal=isOfficialKind(kind)&&officialVariant==="original"?officialMufyCaseCopy[kind as OfficialKind]:null;
  const targetXml=officialOriginal?.target??widgetSample;
  const studioMarkup=useMemo(()=>markup(kind,style),[kind,style]);
  const widgetMarkup=useMemo(()=>isOfficialKind(kind)&&officialVariant==="original"?officialOriginalSource(kind):studioMarkup,[kind,officialVariant,studioMarkup]);
  const studioInstruction=useMemo(()=>instruction(kind,copy),[kind,copy]);
  const widgetInstruction=officialOriginal?.instruction??studioInstruction;
  const widgetBeautifierPrompt=useMemo(()=>createBeautifierInvocation({
    componentType:meta[kind].name,
    style:palettes[style.palette].name,
    interaction:exportLevel(kind,officialVariant),
    target:targetXml,
    variableMap:widgetVariableMap(kind),
    replacement:mufyReplacement(widgetMarkup),
  }),[kind,officialVariant,style.palette,targetXml,widgetMarkup]);
  const generated=useMemo(()=>generatePattern(target,scenario),[target,scenario]),pattern=manual?customPattern:generated,result=useMemo(()=>runReplace(sample,pattern,flags,replacement),[sample,pattern,flags,replacement]),captureCount=useMemo(()=>captures(pattern),[pattern]),warningList=useMemo(()=>warnings(scenario,pattern,replacement,captureCount),[scenario,pattern,replacement,captureCount]);
  const replacementReady=isMufyReplacementReady(replacement);

  useEffect(()=>{const raw=localStorage.getItem("mufy-studio-draft");if(raw&&new TextEncoder().encode(raw).byteLength<=MAX_DRAFT_BYTES){try{restore(normalizeDraft(JSON.parse(raw)),false);}catch{/* ignore invalid local draft */}}hydrated.current=true;// eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{if(!hydrated.current)return;setSaved(false);const timer=setTimeout(()=>{try{localStorage.setItem("mufy-studio-draft",JSON.stringify(makeDraft()));}catch{/* manual export remains available */}setSaved(true);},450);return()=>clearTimeout(timer);// eslint-disable-next-line react-hooks/exhaustive-deps
  },[mode,kind,copy,style,officialVariant,name,scenario,target,replacement,sample,flags,manual,customPattern,enabled,visible,outputSetting,variableMap,beautifierPrompt]);
  useEffect(()=>{if(mode!=="regex")return;const frame=requestAnimationFrame(()=>{if(regexRulePane.current)regexRulePane.current.scrollTop=0;if(regexTestPane.current)regexTestPane.current.scrollTop=0;});return()=>cancelAnimationFrame(frame);},[mode]);

  function makeDraft():Draft{return{studioVersion:9,workspace:mode,widget:{kind,copy,style,officialVariant},regex:{name,scenario,target,replacement:mufyReplacement(replacement),sample,flags,manual,pattern:customPattern,enabled,visible,instruction:outputSetting,variableMap,beautifierPrompt}};}
  function toast(text:string){setNotice(text);setTimeout(()=>setNotice(""),2500);}
  function restore(draft:Draft,show=true){setAllowScripts(false);setPreviewNonce(value=>value+1);const autoRestoringOfficial=!show&&draft.widget?.kind&&isOfficialKind(draft.widget.kind);setOfficialVariant(autoRestoringOfficial?"original":draft.widget?.officialVariant==="studio"?"studio":"original");if(draft.widget){const nextKind=draft.widget.kind&&meta[draft.widget.kind]?draft.widget.kind:kind;if(draft.widget.kind&&meta[draft.widget.kind])setKind(draft.widget.kind);if(draft.widget.copy)setCopy({...defaults[nextKind],...draft.widget.copy});if(draft.widget.style){const next=draft.widget.style;const palette=typeof next.palette==="number"&&Number.isInteger(next.palette)&&palettes[next.palette]?next.palette:0;setStyle({palette,radius:Math.min(36,Math.max(8,Number(next.radius)||22)),glass:Math.min(100,Math.max(0,Number(next.glass)||0)),compact:Boolean(next.compact),motion:Boolean(next.motion)});}}const r=draft.regex;if(r){if(r.name)setName(r.name);if(r.scenario&&scenarioMeta[r.scenario])setScenario(r.scenario);if(typeof r.target==="string")setTarget(r.target);if(typeof r.replacement==="string")setReplacement(mufyReplacement(r.replacement));if(typeof r.sample==="string")setSample(r.sample);if(typeof r.flags==="string")setFlags(r.flags);if(typeof r.manual==="boolean")setManual(r.manual);if(typeof r.pattern==="string")setCustomPattern(r.pattern);if(typeof r.enabled==="boolean")setEnabled(r.enabled);if(typeof r.visible==="boolean")setVisible(r.visible);setOutputSetting(typeof r.instruction==="string"?r.instruction:"");setVariableMap(typeof r.variableMap==="string"?r.variableMap:"");setBeautifierPrompt(typeof r.beautifierPrompt==="string"&&r.beautifierPrompt.trim()?r.beautifierPrompt:typeof r.target==="string"&&typeof r.variableMap==="string"&&typeof r.replacement==="string"?createBeautifierInvocation({componentType:r.name||"自定义组件",style:"沿用当前视觉风格",interaction:"保留现有交互",target:r.target,variableMap:r.variableMap,replacement:mufyReplacement(r.replacement)}):"");}else if(typeof draft.targetText==="string"&&typeof draft.replacement==="string"){setName(draft.name||"导入的正则");setTarget(draft.targetText);setReplacement(mufyReplacement(draft.replacement));setSample(draft.testInput||draft.targetText);setManual(Boolean(draft.pattern));setCustomPattern(draft.pattern||"");setOutputSetting("");setVariableMap("");setBeautifierPrompt("");if(typeof draft.enabled==="boolean")setEnabled(draft.enabled);if(typeof draft.visibleToUser==="boolean")setVisible(draft.visibleToUser);setMode("regex");}if(draft.workspace)setMode(draft.workspace==="component"?"widget":draft.workspace);if(show)toast("工作稿已恢复，可以继续编辑");}
  function chooseKind(next:Kind){setKind(next);setCopy(defaults[next]);if(isOfficialKind(next))setOfficialVariant("original");}
  function chooseOfficialVariant(next:OfficialVariant){setOfficialVariant(next);if(next==="original")setPanel("content");}
  function chooseScenario(next:Scenario){const p=presets[next];setScenario(next);setName(scenarioMeta[next].name);setTarget(p.target);setReplacement(mufyReplacement(p.replacement));setSample(p.sample);setOutputSetting("");setVariableMap("");setBeautifierPrompt("");setAllowScripts(false);setManual(false);setCustomPattern("");}
  function handoff(){const exactPattern=kind==="officialSticker"&&officialVariant==="original"?"\\[([\\s\\S]*?)\\]":officialPattern(kind);setMode("regex");setScenario(widgetScenario(kind));setName(`${meta[kind].name}${isOfficialKind(kind)?officialVariant==="original"?" · 官方原版":" · Studio 设计版":""}`);setTarget(targetXml);setReplacement(mufyReplacement(widgetMarkup));setSample(widgetSample);setOutputSetting(widgetInstruction);setVariableMap(widgetVariableMap(kind));setBeautifierPrompt(widgetBeautifierPrompt);setAllowScripts(false);setManual(Boolean(exactPattern));setCustomPattern(exactPattern);}
  function applyAssistant(draft:AssistantRuleDraft){setMode("regex");setScenario("component");setName(draft.name);setTarget(draft.target);setReplacement(draft.replacement);setSample(draft.sample);setOutputSetting(draft.instruction);setVariableMap(draft.variableMap);setBeautifierPrompt(draft.beautifierInvocation);setFlags("g");setManual(false);setCustomPattern("");setAllowScripts(false);setResultView("preview");setPreviewNonce(value=>value+1);toast("配置已送入规则实验室，表达式已由 XML 自动生成");}
  async function copyRegexFields(){
    if(!name.trim()){toast("请先填写正则名称");return;}
    if(!pattern||result.error){toast("请先修正正则表达式");return;}
    if(!replacementReady){toast("请先把 HTML 替换字符串修正为一层完整围栏");return;}
    const fields=[
      `正则名称：\n${name.trim()}`,
      `启用：${enabled?"是":"否"}`,
      `可见性：${visible?"对用户可见":"仅创建者可见"}`,
      `目标字符：\n${target}`,
      `正则表达式：\n${pattern}`,
      `替换字符串：\n${mufyReplacement(replacement)}`,
      ...(variableMap?[`变量对应表：\n${variableMap}`]:[]),
      ...(outputSetting?[`输出设定：\n${outputSetting}`]:[]),
      ...(beautifierPrompt?[`美化助手调用语句：\n${beautifierPrompt}`]:[]),
    ].join("\n\n");
    try{await navigator.clipboard.writeText(fields);toast("正则字段已复制；请粘贴到 Mufy，本页不会自动写入");}catch{toast("复制失败，请使用各字段右侧的复制按钮");}
  }
  async function importFile(file:File){try{if(file.size>MAX_DRAFT_BYTES)throw new Error("too large");restore(normalizeDraft(JSON.parse(await file.text())));}catch{toast("导入失败：请选择 2 MB 以内的本站 JSON 工作稿");}}
  function makeOfficialImport(){return createMufyRegexImportFile({name,pattern,flags,replacement:mufyReplacement(replacement),enabled,visibility:visible,target});}
  function exportOfficialImport(){if(scenario!=="component"){toast("当前附件只验证了代码组件 mode 1；请切换到代码组件后导出");return;}if(!name.trim()||!pattern||result.error||!replacementReady){toast("请先完成并修正规则，再导出官网 JSON");return;}download(makeOfficialImport(),mufyRegexImportFilename());toast("官网导入 JSON 已下载");}
  const code=codeTab==="replacement"?mufyReplacement(widgetMarkup):codeTab==="xml"?targetXml:codeTab==="instruction"?widgetInstruction:widgetBeautifierPrompt;

  const regexMode=mode==="widget"||mode==="regex";
  return <main className="studio-shell">
    <header className="topbar"><a className="brand" href="#"><i>M</i><span><b>Mufy Studio</b><small>一站式角色创作工坊</small></span></a><nav className="mode-switch primary-modes"><button className={mode==="blueprint"?"active":""} onClick={()=>setMode("blueprint")}><span>◇</span> 建卡</button><button className={mode==="assistant"?"active":""} onClick={()=>setMode("assistant")}><span>✦</span> AI 创建</button><button className={mode==="beautify"?"active":""} onClick={()=>setMode("beautify")}><span>◫</span> 美化</button><button className={regexMode?"active":""} onClick={()=>setMode("regex")}><span>.*</span> 正则</button><button className={mode==="theater"?"active":""} onClick={()=>setMode("theater")}><span>▶</span> 小剧场</button></nav><div className="top-actions"><span className={`save-state ${saved?"saved":""}`}><i/>{saved?"本地草稿":"保存中"}</span><a href="https://docs.mufy.ai/" target="_blank" rel="noreferrer">官方文档 ↗</a>{regexMode&&<><input ref={fileInput} type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];if(f)void importFile(f);e.target.value=""}}/><button className="import-btn" onClick={()=>fileInput.current?.click()}>导入工作稿</button><button className="export-btn" onClick={()=>{download(makeDraft());toast("工作稿已导出")}}>导出工作稿</button></>}</div></header>

    {regexMode&&<nav className="regex-subnav"><div><span><small>REGEX WORKSPACE</small><b>正则负责识别与替换，不是小剧场运行时</b></span><span className="regex-subtabs"><button className={mode==="widget"?"active":""} onClick={()=>setMode("widget")}>{kinds.length} 个组件模板</button><button className={mode==="regex"?"active":""} onClick={()=>setMode("regex")}>规则实验室</button></span></div></nav>}

    <div className="ai-creator-host" hidden={mode!=="assistant"}><AiCreatorStudio onApply={applyAssistant} enabled={enabled} visibility={visible}/></div>
    {mode==="assistant"?null:mode==="blueprint"?<CardBlueprint/>:mode==="beautify"?<BeautifyStudio/>:mode==="theater"?<TheaterStudio/>:mode==="widget"?<section className="workspace">
      <aside className="panel library">
        <div className="panel-head"><span><small>01 / 正则组件</small><b>选择目标字符渲染模板</b></span><i>{kinds.length}</i></div>
        <div className="official-case-summary"><b>官方有趣案例 · 5</b><span>默认展示并导出官方原版；Studio 设计版属于非官方外观</span></div>
        <div className="blog-widget-summary"><b>博客时代挂件 · {BLOG_WIDGET_KINDS.length}</b><span>轻巧、好看、无 JS；本站预览与复制源码完全同源</span></div>
        <div className="template-list">{kinds.map((item,index)=><button key={item} className={`${kind===item?"active":""} ${isOfficialKind(item)?"official-template":""} ${meta[item].collection==="blog"?"blog-template":""}`} onClick={()=>chooseKind(item)}><small>{String(index+1).padStart(2,"0")}</small><i>{meta[item].icon}</i><span><b>{meta[item].name}</b><em>{meta[item].sub}</em>{isOfficialKind(item)&&<mark className={/<script\b/i.test(officialOriginalSource(item))?"script":""}>含官方原版 · {officialCompatibilityLabel(item)}</mark>}{meta[item].collection==="blog"&&<mark className="blog">博客挂件 · 无 JS</mark>}</span><strong>↗</strong></button>)}</div>
        <div className="tip truth-tip"><b>与官方是否完全一样？</b><p>变量顺序与目标结构遵循文档；本站用浏览器正则模拟，Mufy 未公开运行引擎、flags、清洗器与多规则顺序，因此不承诺底层完全同构。</p></div>
      </aside>
      <section className="canvas">
        <div className="canvas-bar"><span><small>02 / 数据驱动预览</small><b>{meta[kind].name}</b>{meta[kind].officialUrl&&<a className="official-source-link" href={meta[kind].officialUrl} target="_blank" rel="noreferrer">官方来源 ↗</a>}</span><div><button aria-label="上一个组件" onClick={()=>chooseKind(kinds[(kinds.indexOf(kind)-1+kinds.length)%kinds.length])}>←</button><span><button className={viewport==="wide"?"active":""} onClick={()=>setViewport("wide")}>宽屏</button><button className={viewport==="phone"?"active":""} onClick={()=>setViewport("phone")}>手机</button></span><button aria-label="下一个组件" onClick={()=>chooseKind(kinds[(kinds.indexOf(kind)+1)%kinds.length])}>→</button></div></div>
        {isOfficialKind(kind)&&<div className="official-version-row"><div><b>输出版本</b><span>{officialVariant==="original"?"官方文档源码逐字保留，并按官方依赖运行预览":"本站重新设计的可换肤版本，外观不会与官网一致"}</span></div><div className="official-version-switch" role="group" aria-label="官方案例输出版本"><button type="button" className={officialVariant==="original"?"active":""} aria-pressed={officialVariant==="original"} onClick={()=>chooseOfficialVariant("original")}>官方原版 <small>默认</small></button><button type="button" className={officialVariant==="studio"?"active":""} aria-pressed={officialVariant==="studio"} onClick={()=>chooseOfficialVariant("studio")}>Studio 设计版 <small>非官方外观</small></button></div></div>}
        <div className={`stage ${officialVariant==="original"&&kind==="officialPhone"?"official-phone-stage":""}`}><div className="grid-bg"/><div className={`device ${viewport} ${officialVariant==="original"&&(kind==="officialPhone"||kind==="officialSticker")?`official-source-device official-source-${kind}`:""}`}>{!(officialVariant==="original"&&(kind==="officialPhone"||kind==="officialSticker"))&&<div className="narrator"><small>NARRATOR · 22:17</small><p>街灯在积水里碎成一片。你刚推开门，口袋里的手机轻轻震了一下。</p></div>}<WidgetPreview key={`${kind}-${officialVariant}-${previewNonce}`} kind={kind} copy={copy} style={style} source={widgetMarkup} officialVariant={officialVariant}/>{!(officialVariant==="original"&&(kind==="officialPhone"||kind==="officialSticker"))&&<div className="reply"><i/><i/><i/></div>}</div><footer><span><i/> {isOfficialKind(kind)?officialVariant==="original"?"官方文档替换源码预览":"Studio 设计版实际导出预览":isBlogWidgetKind(kind)?"官网同源预览":"本页互动预览"}</span><p>导出等级 · {exportLevel(kind,officialVariant)}</p></footer></div>
        <div className="code panel"><div className="code-tabs"><button className={codeTab==="replacement"?"active":""} onClick={()=>setCodeTab("replacement")}>替换字符串</button><button className={codeTab==="xml"?"active":""} onClick={()=>setCodeTab("xml")}>{kind==="officialSticker"?"AI 输出标记":"AI 输出格式"}</button><button className={codeTab==="instruction"?"active":""} onClick={()=>setCodeTab("instruction")}>输出约束</button><button className={codeTab==="beautifier"?"active":""} onClick={()=>setCodeTab("beautifier")}>美化助手调用</button><CopyButton value={code} label="复制当前"/></div><pre>{code}</pre><footer><span>{isOfficialKind(kind)&&officialVariant==="original"?<>官方文档原文 · <b>未经改写</b></>:<>已映射 <b>{captureLabel(kind)}</b></>}</span><span>{isOfficialKind(kind)&&officialVariant==="original"?codeTab==="replacement"?"HTML / CSS / JS / CDN 均按文档保留":codeTab==="xml"?"官方目标字符按文档保留":codeTab==="instruction"?"官方输出设定按文档保留":"提示词 · 发送给美化助手，不粘贴到 Mufy":codeTab==="beautifier"?"提示词 · 发送给美化助手，不粘贴到 Mufy":"这才是实际复制到 Mufy 的产物"}</span></footer></div>
      </section>
      <aside className="panel inspector">
        <div className="inspector-head"><small>03 / 调整</small><span><button className={panel==="content"?"active":""} onClick={()=>setPanel("content")}>内容</button><button className={panel==="style"?"active":""} disabled={isOfficialKind(kind)&&officialVariant==="original"} title={isOfficialKind(kind)&&officialVariant==="original"?"官方原版不可换肤；请切换 Studio 设计版":""} onClick={()=>setPanel("style")}>样式</button></span></div>
        {isOfficialKind(kind)&&officialVariant==="original"&&<div className="official-source-lock"><b>只读官方源码</b><span>替换字符串逐字取自官方文档。下方测试字段不会改写 HTML / CSS / JS / CDN；需要换肤请切换 Studio 设计版（非官方外观）。</span>{kind==="officialStatus"&&<em>注意：官方状态栏源码原文写死了“时间部分 / 今日天气 / 环境描述内容”，没有引用 $1—$3；这里按你的要求保留该原文。</em>}</div>}
        {panel==="content"?<div className="inspector-body">{copyFields.slice(0,fieldCount(kind)).map((field,index)=><label key={field}><span>{meta[kind].labels[index]}<b>${index+1}</b></span>{field==="description"||copy[field].length>70?<textarea value={copy[field]} onChange={e=>setCopy({...copy,[field]:e.target.value})}/>:<input value={copy[field]} onChange={e=>setCopy({...copy,[field]:e.target.value})}/>}</label>)}<button className="soft" onClick={()=>setCopy(defaults[kind])}>恢复示例内容</button><div className="mapping"><small>变量映射 · {fieldCount(kind)} 个捕获</small>{meta[kind].labels.slice(0,fieldCount(kind)).map((x,i)=><p key={`${i}-${x}`}><code>${i+1}</code><i/>{x}</p>)}</div>{meta[kind].officialUrl&&<a className="official-case-note" href={meta[kind].officialUrl} target="_blank" rel="noreferrer"><b>{officialVariant==="original"?"官方原版 · 源码未经改写":kind==="officialPhone"?"脚本案例 · 需 Mufy 实机验证":kind==="officialSticker"?"符号案例 · 无 JS 稳定降级":"HTML/CSS 案例 · 高兼容"}</b><span>查看官方目标字符、替换示例与输出设定 ↗</span></a>}</div>:<div className="inspector-body"><fieldset><legend>配色方案</legend><div className="palettes">{palettes.map((p,i)=><button key={p.name} className={style.palette===i?"active":""} onClick={()=>setStyle({...style,palette:i})}><i style={{background:p.bg}}/><i style={{background:p.surface}}/><i style={{background:p.accent}}/><span>{p.name}</span></button>)}</div></fieldset><label className="range"><span>圆角 <b>{style.radius}px</b></span><input type="range" min="8" max="36" value={style.radius} onChange={e=>setStyle({...style,radius:Number(e.target.value)})}/></label><label className="range"><span>玻璃模糊 <b>{style.glass}%</b></span><input type="range" min="0" max="100" value={style.glass} onChange={e=>setStyle({...style,glass:Number(e.target.value)})}/></label><label className="toggle"><span><b>紧凑布局</b><small>减少内边距，适合手机</small></span><input type="checkbox" checked={style.compact} onChange={e=>setStyle({...style,compact:e.target.checked})}/></label><label className="toggle"><span><b>入场动效</b><small>淡入并轻微上移</small></span><input type="checkbox" checked={style.motion} onChange={e=>setStyle({...style,motion:e.target.checked})}/></label></div>}
        <div className="handoff"><b>继续生成完整规则</b><p>{isOfficialKind(kind)&&officialVariant==="original"?"官方替换字符串会不经改写地同步；规则实验室仍默认停用脚本。":kind==="officialSticker"?"符号标记、捕获表达式与图片替换会同步到规则实验室。":"组件的目标字符、捕获表达式与替换字符串会同步到规则实验室。"}</p><button onClick={handoff}>送去规则实验室 <b>→</b></button></div>
      </aside>
    </section>:<section className="regex-create-shell" aria-label="新建正则">
      <header className="regex-create-head">
        <div><h1>新建正则</h1><a href="https://docs.mufy.ai/documentation/zheng-ze-xiang-qing/chuang-jian-zheng-ze-tiao-mu/gong-ju-mo-shi-xia-chuang-jian-zheng-ze" target="_blank" rel="noreferrer">▣ 教程</a><button type="button" className="regex-ai-launch" onClick={()=>setMode("assistant")}>✦ AI 创建助手</button></div>
        <button type="button" aria-label="关闭正则创建面板" onClick={()=>setMode("widget")}>×</button>
      </header>
      <div className="regex-create-body">
        <section ref={regexRulePane} className="regex-rule-pane" aria-label="正则规则字段">
          <label className="regex-name-field"><span>正则名称</span><input aria-label="正则名称" placeholder="请输入正则名称" value={name} onChange={e=>setName(e.target.value)}/></label>
          <div className="regex-meta-toggles">
            <label className="toggle"><span><b>启用</b><small>创建后在 Mufy 中启用</small></span><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/></label>
            <label className="toggle"><span><b>可见性</b><small>是否对用户可见</small></span><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/></label>
          </div>

          <section className="regex-scenario-block" aria-label="自动生成场景">
            <header><span><small>工具模式</small><b>选择目标字符场景</b></span><em>用于自动生成表达式</em></header>
            <div className="regex-scenario-chips">{(Object.keys(scenarioMeta) as Scenario[]).map(item=><button type="button" key={item} aria-pressed={scenario===item} className={scenario===item?"active":""} onClick={()=>chooseScenario(item)}><i>{scenarioMeta[item].icon}</i><span><b>{scenarioMeta[item].name}</b><small>{scenarioMeta[item].sub}</small></span></button>)}</div>
          </section>

          <div className="regex-field-stack">
            <section className="regex-entry-field">
              <header><span><i>A</i><b>目标字符</b></span><button type="button" onClick={()=>setTarget(presets[scenario].target)}>载入示例</button></header>
              <textarea aria-label="目标字符" placeholder={"<标识符>\n  <变量名>动态变量</变量名>\n</标识符>"} value={target} onChange={e=>setTarget(e.target.value)} spellCheck={false}/>
              <footer><span>{target.length} 字符</span><small>AI 将输出的原始结构</small></footer>
            </section>
            <section className="regex-entry-field regex-pattern-field">
              <header><span><i>B</i><b>正则表达式</b></span><div><button type="button" onClick={()=>setManual(false)}>自动生成</button><label><input type="checkbox" checked={manual} onChange={e=>{setManual(e.target.checked);if(e.target.checked&&!customPattern)setCustomPattern(generated)}}/>手动编辑</label></div></header>
              <textarea aria-label="正则表达式" placeholder="请输入正则表达式" readOnly={!manual} value={pattern} onChange={e=>setCustomPattern(e.target.value)} spellCheck={false}/>
              <footer><span>{captureCount} 个捕获变量</span><CopyButton value={pattern}/></footer>
            </section>
            <section className="regex-entry-field regex-replacement-field">
              <header><span><i>C</i><b>替换字符串</b></span><a href="https://docs.mufy.ai/documentation/zheng-ze-xiang-qing/chuang-jian-zheng-ze-tiao-mu/shi-yong-dai-ma-zu-jian" target="_blank" rel="noreferrer">如何编写和回填?</a></header>
              <textarea aria-label="替换字符串" placeholder={"要替换成什么样的字符串呢...\nhtml 代码请使用\n```html\n代码内容\n```"} value={replacement} onChange={e=>setReplacement(e.target.value)} onBlur={e=>setReplacement(mufyReplacement(e.currentTarget.value))} spellCheck={false}/>
              <footer><span className={replacementReady?"mufy-format-ready":"mufy-format-pending"}>{replacementReady?"✓ 官网可直接粘贴":"待补全 ```html 围栏"} · {replacement.length} 字符</span><CopyButton value={mufyReplacement(replacement)} label="复制到官网"/></footer>
            </section>
          </div>

          <details className="regex-advanced">
            <summary><span><b>高级信息</b><small>捕获变量、测试 flags 与兼容性检查</small></span><em>{captureCount} 个变量</em></summary>
            <div className="regex-advanced-body">
              <section><header><b>捕获变量</b><small>点击插入替换字符串末尾</small></header><div className="regex-captures">{captureCount?Array.from({length:captureCount},(_,i)=><button type="button" key={i} onClick={()=>setReplacement(appendMufyReplacementToken(replacement,`$${i+1}`))}><code>${i+1}</code><span>{scenario==="component"?`第 ${i+1} 个动态字段`:"匹配到的动态内容"}</span><b>＋</b></button>):<p>当前规则没有捕获变量。</p>}</div></section>
              <section><header><b>本站测试 flags</b><small>不会另存为 Mufy 字段</small></header><div className="regex-flags">{["g","i","m","s"].map(f=><button type="button" key={f} className={flags.includes(f)?"active":""} onClick={()=>setFlags(flags.includes(f)?flags.replace(f,""):`${flags}${f}`)}>{f}</button>)}</div></section>
              <section className="regex-compatibility"><header><b>兼容性检查</b></header><p className={pattern?"done":""}><i>{pattern?"✓":""}</i>表达式已生成</p><p className={!result.error&&result.matches?"done":""}><i>{!result.error&&result.matches?"✓":""}</i>样例成功命中</p><p className={scenario!=="component"||captureCount?"done":""}><i>{scenario!=="component"||captureCount?"✓":""}</i>动态字段已映射</p></section>
              {warningList.length>0&&<section className="regex-advanced-warnings"><header><b>建议修正</b></header>{warningList.map(x=><p key={x}>! {x}</p>)}</section>}
              <div className="regex-advanced-actions"><CopyButton value={JSON.stringify(makeDraft(),null,2)} label="复制工作稿 JSON"/><button type="button" onClick={()=>{download(makeDraft());toast("工作稿已导出")}}>导出工作稿</button></div>
            </div>
          </details>
          {(variableMap||outputSetting||beautifierPrompt)&&<details className="regex-ai-deliverables" open>
            <summary><span><b>AI 助手交付清单</b><small>官网 JSON、变量核对、角色卡输出设定分开处理</small></span><em>可直接完成官网配置</em></summary>
            <div className="regex-ai-deliverable-grid">
              {scenario==="component"?<section className="regex-ai-export-card"><header><span><b>官网导入 JSON</b><small>严格按参考文件的 7 字段数组生成</small></span><div><CopyButton value={JSON.stringify(makeOfficialImport(),null,2)} label="复制 JSON"/><button type="button" onClick={exportOfficialImport}>下载 JSON</button></div></header><p>在 Mufy 正则页面点击“导入”，选择 <code>regex-rules-时间戳.json</code>。当前按已验证的代码组件样本导出为 mode 1。</p></section>:<section className="regex-ai-export-card unavailable"><header><span><b>官网 JSON 暂不开放</b><small>上传样本只验证了代码组件 mode 1</small></span></header><p>切换到“代码组件”后才能安全导出；本站不会猜测其他模式的 mode 编号。</p></section>}
              <section><header><span><b>变量对应表 · 仅供核对</b><small>$1、$2…按内层 XML 标签出现顺序</small></span><CopyButton value={variableMap} label="复制变量表"/></header><p className="regex-deliverable-tip">不需要粘贴到官网；更改目标 XML 的标签顺序后，必须重新核对并测试。</p><textarea aria-label="变量对应表" value={variableMap} onChange={event=>setVariableMap(event.target.value)} spellCheck={false}/></section>
              <section className="regex-ai-output-card"><header><span><b>输出设定 · 必须另行粘贴</b><small>创建/编辑角色 → 高级设置 → 输出设定</small></span><CopyButton value={outputSetting} label="复制到高级设置"/></header><p className="regex-deliverable-tip">若原本已有输出设定，请添加分隔标题后追加，不要直接覆盖。</p><textarea aria-label="输出设定" value={outputSetting} onChange={event=>setOutputSetting(event.target.value)} spellCheck={false}/></section>
              <section className="regex-ai-beautifier-card"><header><span><b>美化助手调用语句</b><small>发送给美化助手 · 不是 Mufy 执行脚本</small></span><CopyButton value={beautifierPrompt} label="复制调用语句"/></header><p className="regex-deliverable-tip">它会携带当前 XML、变量表和替换代码，并要求助手只换肤、不改标签与 $1…顺序。不要粘贴到“高级设置 → 输出设定”。</p><textarea aria-label="美化助手调用语句" value={beautifierPrompt} onChange={event=>setBeautifierPrompt(event.target.value)} spellCheck={false}/></section>
            </div>
          </details>}
        </section>

        <section ref={regexTestPane} className="regex-test-pane" aria-label="测试面板">
          <header className="regex-test-head"><h2>测试面板</h2><span className={result.error?"bad":""}>{result.error?"表达式错误":`${result.matches} 处匹配`}</span></header>
          <label className="regex-test-field"><span><b>测试字符</b><a href="https://docs.mufy.ai/documentation/zheng-ze-xiang-qing/chuang-jian-zheng-ze-tiao-mu/gong-ju-mo-shi-xia-chuang-jian-zheng-ze" target="_blank" rel="noreferrer">如何测试?</a></span><textarea placeholder="粘贴一段 AI 实际输出..." value={sample} onChange={e=>setSample(e.target.value)} spellCheck={false}/></label>
          <button type="button" className="regex-test-button" onClick={()=>{setResultView("preview");setRefresh(x=>x+1)}}>测试</button>
          <section className="regex-test-preview">
            <header><h3>{resultView==="preview"?"效果预览":"替换后源码"}</h3><span className="view-switch">{/<script\b/i.test(result.output)&&<button type="button" className={allowScripts?"script-active":""} onClick={()=>setAllowScripts(value=>!value)}>{allowScripts?"脚本已隔离运行":"运行脚本"}</button>}<button type="button" className={resultView==="preview"?"active":""} onClick={()=>setResultView("preview")}>效果</button><button type="button" className={resultView==="source"?"active":""} onClick={()=>setResultView("source")}>源码</button></span></header>
            <div>{!sample.trim()?<p className="regex-preview-empty">测试结果将显示在这里...</p>:result.error?<p className="error-message">{result.error}</p>:resultView==="preview"?<iframe key={`${refresh}-${allowScripts}`} title="替换效果预览" sandbox={allowScripts?"allow-scripts":""} srcDoc={previewResultDoc(result.output)}/>:<pre>{result.output||"（内容已被过滤）"}</pre>}</div>
          </section>
        </section>
      </div>
      <footer className="regex-create-footer">
        <p><b>本地辅助工具</b><span>“创建正则”只生成并复制字段，不会登录或写入 Mufy。</span></p>
        <div><button type="button" onClick={()=>setMode("widget")}>取消</button><button type="button" className="official-json-footer" title={scenario!=="component"?"目前只按已验证的代码组件 mode 1 导出":""} disabled={scenario!=="component"||!name.trim()||!pattern||Boolean(result.error)||!replacementReady} onClick={exportOfficialImport}>导出官网 JSON <span>↓</span></button><button type="button" disabled={!name.trim()||!pattern||Boolean(result.error)||!replacementReady} onClick={()=>void copyRegexFields()}>复制全部字段 <span>✣</span></button></div>
      </footer>
    </section>}
    {notice&&<div className="toast" role="status">{notice}</div>}
    <footer className="site-footer"><span>MUFY CREATOR TOOL · LOCAL FIRST</span><p>草稿只保存在当前浏览器 · 依据 Mufy 官方创作文档</p><a href="https://docs.mufy.ai/" target="_blank" rel="noreferrer">docs.mufy.ai ↗</a></footer>
  </main>;
}

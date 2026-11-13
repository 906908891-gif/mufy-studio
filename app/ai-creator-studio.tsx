"use client";

/* eslint-disable @next/next/no-img-element -- user-selected data URLs are previewed without creating an external asset */

import { useEffect, useMemo, useRef, useState } from "react";
import { RegexAiAssistant } from "./regex-ai-assistant";
import type { AssistantRuleDraft } from "./mufy-regex-assistant";
import { createMufyRegexImportFile, mufyRegexImportFilename } from "./mufy-regex-json";
import { generatePattern } from "./mufy-regex-pattern";
import {
  analyzePixelData,
  buildImageAssistantArtifact,
  IMAGE_COMPONENT_PRESETS,
  previewImageAssistantArtifact,
} from "./image-assistant";
import type {
  ImageAssistantArtifact,
  ImageAssistantDeliveryMode,
  ImageComponentPreset,
  ImageCreationMode,
  VisualSignature,
} from "./image-assistant";
import {
  createImageAssistantPages,
  duplicateImageAssistantPage,
  normalizeImageAssistantPages,
} from "./image-assistant-project";
import type { ImageAssistantPage } from "./image-assistant-project";
import {
  mergeMiniMaxVisionSignature,
  validateMiniMaxVisionSpec,
} from "./minimax-vision";
import type { MiniMaxVisionSpec, MiniMaxVisionStatus } from "./minimax-vision";
import { validateMiniMaxRevisionResult } from "./minimax-revision";

type Props = {
  onApply: (draft: AssistantRuleDraft) => void;
  enabled: boolean;
  visibility: boolean;
};

const MAX_IMAGE_BYTES = 8_000_000;
const MAX_IMAGE_PIXELS = 36_000_000;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const DEMO_SIGNATURE: VisualSignature = {
  width: 654,
  height: 470,
  aspectRatio: 1.391,
  averageLightness: 39.4,
  contrast: 58.8,
  saturation: 9.2,
  edgeDensity: .16,
  palette: ["#050507", "#242529", "#c8c8cc", "#f1f1f2", "#98989e"],
  background: "#050507",
  surface: "#242529",
  accent: "#c8c8cc",
  text: "#f1f1f2",
  muted: "#98989e",
  border: "#5e5e63",
  radius: 18,
  styleName: "黑色磨砂动态卡",
  material: "半透明灰黑玻璃与人物素材层",
};
const DEMO_VISION_SPEC = validateMiniMaxVisionSpec({
  schemaVersion: 2,
  suggestedPreset: "social",
  layout: "stacked",
  typography: "modern-sans",
  density: "balanced",
  borderStyle: "hairline",
  palette: { background: "#050507", surface: "#242529", accent: "#c8c8cc", text: "#f1f1f2", muted: "#98989e", border: "#5e5e63" },
  radius: 18,
  shadowStrength: .64,
  styleName: "黑色磨砂动态卡",
  material: "半透明灰黑玻璃与竖向高光",
  summary: "左侧玻璃社交卡覆盖右侧人物素材，分为身份、正文、元信息与底部导航。",
  visibleHierarchy: ["背景人物", "玻璃主卡", "身份栏", "正文", "元信息", "三栏导航"],
  textRoles: ["作者", "账号", "正文", "天气", "地点温度", "时间"],
  interactionHints: ["底部三个项目看起来可点击，但截图不能证明行为"],
  limitations: ["头像与人物原图需要用户补充"],
  confidence: .9,
  blueprint: {
    canvas: { aspectRatio: 1.38, minHeight: 300, maxWidth: 620, outerPadding: 6 },
    backdrop: { kind: "image-placeholder", imageSide: "right", overlay: .28, angle: 125 },
    blocks: [
      { id: "portrait", kind: "image", field: 0, label: "人物素材位", x: 66, y: 0, width: 34, height: 88, layer: 1, align: "center", valign: "center", size: "sm", weight: "regular", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "user" },
      { id: "card", kind: "panel", field: 0, label: "", x: 8, y: 3, width: 68, height: 94, layer: 2, align: "left", valign: "top", size: "md", weight: "regular", tone: "text", fill: "glass", border: "hairline", radius: 18, icon: "none" },
      { id: "avatar", kind: "avatar", field: 0, label: "头像素材位", x: 12, y: 9, width: 10, height: 13, layer: 4, align: "center", valign: "center", size: "md", weight: "bold", tone: "inverse", fill: "surface", border: "hairline", radius: 40, icon: "user" },
      { id: "author", kind: "title", field: 1, label: "", x: 24, y: 9, width: 36, height: 7, layer: 4, align: "left", valign: "center", size: "lg", weight: "bold", tone: "text", fill: "transparent", border: "none", radius: 0, icon: "none" },
      { id: "handle", kind: "subtitle", field: 2, label: "", x: 24, y: 16, width: 40, height: 5, layer: 4, align: "left", valign: "center", size: "xs", weight: "regular", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "none" },
      { id: "head-divider", kind: "divider", field: 0, label: "", x: 8, y: 25, width: 68, height: 2, layer: 3, align: "left", valign: "center", size: "xs", weight: "regular", tone: "muted", fill: "transparent", border: "hairline", radius: 0, icon: "none" },
      { id: "post", kind: "body", field: 3, label: "", x: 12, y: 31, width: 60, height: 28, layer: 4, align: "left", valign: "top", size: "md", weight: "medium", tone: "text", fill: "transparent", border: "none", radius: 0, icon: "none" },
      { id: "weather", kind: "iconText", field: 4, label: "", x: 12, y: 66, width: 22, height: 6, layer: 4, align: "left", valign: "center", size: "sm", weight: "medium", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "weather" },
      { id: "location", kind: "meta", field: 5, label: "", x: 48, y: 66, width: 13, height: 6, layer: 4, align: "right", valign: "center", size: "sm", weight: "medium", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "location" },
      { id: "temperature", kind: "meta", field: 6, label: "/", x: 61, y: 66, width: 11, height: 6, layer: 4, align: "right", valign: "center", size: "sm", weight: "medium", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "none" },
      { id: "timestamp", kind: "iconText", field: 7, label: "", x: 12, y: 73, width: 35, height: 6, layer: 4, align: "left", valign: "center", size: "sm", weight: "regular", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "clock" },
      { id: "foot-divider", kind: "divider", field: 0, label: "", x: 8, y: 82, width: 68, height: 2, layer: 3, align: "left", valign: "center", size: "xs", weight: "regular", tone: "muted", fill: "transparent", border: "hairline", radius: 0, icon: "none" },
      { id: "navigation", kind: "nav", field: 0, label: "喜欢 / 上一页 / 下一页", x: 8, y: 84, width: 68, height: 12, layer: 4, align: "center", valign: "center", size: "sm", weight: "medium", tone: "muted", fill: "transparent", border: "none", radius: 0, icon: "heart" },
    ],
    missingAssets: ["头像原图", "背景人物原图"],
  },
});
const DEMO_IMAGE_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="654" height="470" viewBox="0 0 654 470"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#050507"/><stop offset="1" stop-color="#242529"/></linearGradient><linearGradient id="glass" x2="1"><stop stop-color="#151619" stop-opacity=".94"/><stop offset="1" stop-color="#6a6a6d" stop-opacity=".62"/></linearGradient></defs><rect width="654" height="470" fill="url(#g)"/><ellipse cx="550" cy="130" rx="42" ry="58" fill="#b6b6b8" opacity=".62"/><path d="M480 450 Q500 205 556 194 Q626 220 646 450Z" fill="#7d7d80" opacity=".54"/><rect x="72" y="12" width="392" height="440" rx="26" fill="url(#glass)" stroke="#777"/><circle cx="120" cy="69" r="29" fill="#e5e5e7"/><text x="164" y="61" fill="#f1f1f2" font-family="sans-serif" font-size="20" font-weight="700">無怜</text><text x="164" y="84" fill="#98989e" font-family="sans-serif" font-size="11">@yunxiao</text><line x1="72" y1="119" x2="464" y2="119" stroke="#777" opacity=".5"/><text x="96" y="166" fill="#f1f1f2" font-family="sans-serif" font-size="17">夜里的风把没有说完的话</text><text x="96" y="194" fill="#f1f1f2" font-family="sans-serif" font-size="17">吹回了窗边。</text><text x="96" y="330" fill="#98989e" font-family="sans-serif" font-size="13">☂ 大雨</text><text x="346" y="330" fill="#98989e" font-family="sans-serif" font-size="13">A市 / 16℃</text><text x="96" y="360" fill="#98989e" font-family="sans-serif" font-size="13">◷ 2025-05-23 18:40</text><line x1="72" y1="390" x2="464" y2="390" stroke="#777" opacity=".5"/><text x="113" y="425" fill="#b8b8bb" font-family="sans-serif" font-size="13">♡ 喜欢</text><text x="255" y="425" fill="#8a8a8d" font-family="sans-serif" font-size="13">‹ 上一页</text><text x="382" y="425" fill="#d4d4d6" font-family="sans-serif" font-size="13">下一页 ›</text></svg>`)}`;

type RevisionMessage = { id: string; role: "user" | "assistant"; text: string };
type PendingRevision = { reply: string; spec: MiniMaxVisionSpec; pages: ImageAssistantPage[] };
type RevisionSnapshot = { spec: MiniMaxVisionSpec; pages: ImageAssistantPage[] };

function presetSamples(preset: ImageComponentPreset) {
  return IMAGE_COMPONENT_PRESETS[preset].fields.map((field) => field.sample);
}

function demoPages() {
  const pages = createImageAssistantPages(presetSamples("social"), 2);
  pages[0].title = "雨夜动态";
  pages[1].title = "下一页动态";
  pages[1].values = ["無怜", "@yunxiao", "雨停以后，去旧站台等第一班电车。", "小雨", "南岸", "14℃", "2025-05-23 21:10"];
  return pages;
}

function CopyAction({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      setDone(false);
    }
  }
  return <button type="button" onClick={copy}>{done ? "已复制 ✓" : label}</button>;
}

function downloadJson(value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = mufyRegexImportFilename();
  anchor.click();
  URL.revokeObjectURL(url);
}

async function readImageFile(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("无法读取图片文件。"));
    reader.onerror = () => reject(new Error(`无法读取图片文件（${reader.error?.name ?? "unknown"}）。`));
    reader.onabort = () => reject(new Error("图片读取被中止，请重新选择。"));
    reader.readAsDataURL(file);
  });
  const image = document.createElement("img");
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("图片解码失败，请重新导出为标准 PNG、JPEG 或 WebP。"));
    image.src = dataUrl;
  });
  if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) {
    throw new Error("图片像素过大，请将长边缩小到约 6000px 以内后重试。");
  }
  const scale = Math.min(1, 420 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("当前浏览器无法读取图片像素");
  }
  context.drawImage(image, 0, 0, width, height);
  const uploadScale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
  const uploadCanvas = document.createElement("canvas");
  uploadCanvas.width = Math.max(1, Math.round(image.naturalWidth * uploadScale));
  uploadCanvas.height = Math.max(1, Math.round(image.naturalHeight * uploadScale));
  const uploadContext = uploadCanvas.getContext("2d");
  if (!uploadContext) throw new Error("当前浏览器无法创建去元数据图片");
  uploadContext.drawImage(image, 0, 0, uploadCanvas.width, uploadCanvas.height);
  const uploadDataUrl = uploadCanvas.toDataURL("image/webp", .9);
  const uploadBytes = Math.floor((uploadDataUrl.split(",")[1]?.length ?? 0) * 3 / 4);
  if (!uploadDataUrl.startsWith("data:image/webp;base64,") || uploadBytes > MAX_IMAGE_BYTES) {
    throw new Error("压缩后的图片仍然过大，请先裁剪到主要组件区域。" );
  }
  return {
    signature: analyzePixelData(context.getImageData(0, 0, width, height).data, width, height),
    dataUrl,
    uploadDataUrl,
  };
}

function DeliveryModeSelector({ mode, pages, onMode }: {
  mode: ImageAssistantDeliveryMode;
  pages: number;
  onMode: (mode: ImageAssistantDeliveryMode) => void;
}) {
  return <section className="ai-delivery-mode panel" aria-label="选择导出方式">
    <header><span><small>03 / DELIVERY TYPE</small><b>这些文字以后要不要随剧情变化？</b></span><em>{mode === "dynamic" ? "内容随 AI 更新" : "内容固定，交互保留"}</em></header>
    <div role="group" aria-label="导出方式">
      <button type="button" aria-pressed={mode === "fixed"} className={mode === "fixed" ? "active" : ""} onClick={() => onMode("fixed")}>
        <i>▣</i><span><b>固定小剧场 · 推荐</b><small>把中间栏文字原样写进 HTML；{pages > 1 ? `共 ${pages} 页，可点上一页/下一页` : "保留组件原有的 CSS 交互"}</small></span>
      </button>
      <button type="button" aria-pressed={mode === "dynamic"} className={mode === "dynamic" ? "active" : ""} onClick={() => onMode("dynamic")}>
        <i>↻</i><span><b>动态正则</b><small>聊天时由 AI 更新内容；完整 JSON 会自动管理内部变量</small></span>
      </button>
    </div>
    <p>{mode === "dynamic" ? "适合人物状态、时间、新闻等需要每轮变化的内容；需要导入正则 JSON，并把输出设定复制到高级设置。" : pages > 1 ? `适合开场页、人物档案和固定展示；“固定”只指文字不会被 AI 改写，当前 ${pages} 页可点击翻页。` : "适合开场页、人物档案和固定展示；“固定”只指文字不会被 AI 改写，组件原本具备的 CSS 交互会保留。"}</p>
  </section>;
}

function ArtifactResults({ artifact, deliveryMode, enabled, visibility, onApply }: {
  artifact: ImageAssistantArtifact;
  deliveryMode: ImageAssistantDeliveryMode;
  enabled: boolean;
  visibility: boolean;
  onApply: (draft: AssistantRuleDraft) => void;
}) {
  const pattern = generatePattern(artifact.draft.target, "component");
  const officialImport = createMufyRegexImportFile({
    name: artifact.draft.name,
    pattern,
    flags: "g",
    replacement: artifact.draft.replacement,
    enabled,
    visibility,
    target: artifact.draft.target,
  });

  return <section className="ai-reference-results panel" aria-label="图片生成结果">
    <header><span><small>READY TO MUFY</small><b>可落地交付包</b></span><em>{deliveryMode === "dynamic" ? "动态正则" : "固定小剧场"}</em></header>
    <p className="ai-fidelity-note">{deliveryMode === "dynamic" ? artifact.fidelityNote : "固定小剧场已经使用中间编辑区的当前文字生成独立完整 HTML；外观来自当前识图蓝图或风格预设，头像、背景人物等原素材仍需另行补充。"}</p>
    {artifact.visionReport && <details className="ai-vision-result" open><summary><b>MiniMax 深度识图报告</b><span>受限规格 · 不含原图</span></summary><pre>{artifact.visionReport}</pre></details>}
    {deliveryMode === "dynamic" ? <>
    <section className="ai-result-primary dynamic">
      <span><small>OFFICIAL JSON · MODE 1</small><b>官网正则导入文件</b><p>下载后进入官网“正则管理”并导入 JSON；不要把 JSON 粘贴到替换字符串。</p></span>
      <div><button type="button" onClick={() => downloadJson(officialImport)}>下载 JSON（推荐）</button><CopyAction value={JSON.stringify(officialImport, null, 2)} label="复制 JSON（仅备份）"/></div>
    </section>
    <div className="ai-result-grid">
      <details open><summary><b>输出设定</b><CopyAction value={artifact.draft.instruction} label="复制到高级设置"/></summary><p>粘贴到：角色编辑 → 高级设置 → 输出设定。已有内容时分段追加。</p><pre>{artifact.draft.instruction}</pre></details>
      <details className="dynamic-install-advanced"><summary><b>高级手动安装 · 不要只复制其中一项</b><span>默认请导入上方完整 JSON</span></summary><p>以下三项必须属于同一条正则规则。若只粘贴替换模板，内部变量会原样显示。</p><section><header><b>目标 XML</b><CopyAction value={artifact.draft.target} label="复制"/></header><pre>{artifact.draft.target}</pre></section><section><header><b>正则表达式</b><CopyAction value={pattern} label="复制"/></header><pre>{pattern}</pre></section><section><header><b>动态替换模板</b><CopyAction value={artifact.draft.replacement} label="复制（须配合正则）"/></header><pre>{artifact.draft.replacement}</pre></section></details>
      <details><summary><b>变量对应表</b><CopyAction value={artifact.draft.variableMap} label="复制核对"/></summary><p>仅供核对 `$1…` 顺序，不需要粘贴到 Mufy。</p><pre>{artifact.draft.variableMap}</pre></details>
      <details className="component-invocation"><summary><b>组件美化调用语句</b><CopyAction value={artifact.draft.beautifierInvocation} label="复制给助手"/></summary><p>只继续调整当前正则组件；不可改 XML 和变量顺序。</p><pre>{artifact.draft.beautifierInvocation}</pre></details>
      <details open className="global-invocation"><summary><b>全局美化调用语句</b><CopyAction value={artifact.globalBeautifierInvocation} label="复制给助手"/></summary><p>{artifact.visionReport ? "与正则平行使用；MiniMax 视觉摘要已写入语句，原图只需在你希望外部助手进一步观察时再手动上传。" : "与正则平行使用；发给外部美化助手时，请手动把同一张参考图一并上传，本站不会自动发送图片。"}</p><pre>{artifact.globalBeautifierInvocation}</pre></details>
      <details className="global-css"><summary><b>本地生成的基础全局 CSS</b><CopyAction value={artifact.globalCss} label="复制 CSS"/></summary><p>按参考色板即时生成基础外观；不包含参考图或外链素材，完整细节可继续交给美化助手扩展。</p><pre>{artifact.globalCss}</pre></details>
    </div>
    <button type="button" className="ai-apply-button" onClick={() => onApply(artifact.draft)}>送入规则实验室继续测试 <span>→</span></button>
    </> : <>
      <section className="ai-result-primary fixed">
        <span><small>FIXED THEATER · EXACT COPY</small><b>固定小剧场完整代码</b><p>已经写入中间栏当前文字；不需要正则 JSON、XML 或输出设定。</p></span>
        <div><CopyAction value={artifact.fixedReplacement} label="复制小剧场代码"/></div>
      </section>
      <div className="ai-result-grid fixed">
        <details open className="fixed-theater-source"><summary><b>固定小剧场 HTML / CSS</b><CopyAction value={artifact.fixedReplacement} label="复制"/></summary><p>粘贴到：角色编辑 → 小剧场 → 打开或新建目标模块 → 将完整代码放进该模块的代码/内容输入区。代码使用中间栏当前文字，并保留组件原本具备的 CSS 交互。</p><pre>{artifact.fixedReplacement}</pre></details>
        <details open className="global-invocation"><summary><b>全局美化调用语句</b><CopyAction value={artifact.globalBeautifierInvocation} label="复制给助手"/></summary><p>用于继续制作与这个小剧场同风格的 Mufy 页面外壳，不会改动小剧场文字。</p><pre>{artifact.globalBeautifierInvocation}</pre></details>
        <details className="global-css"><summary><b>本地生成的基础全局 CSS</b><CopyAction value={artifact.globalCss} label="复制 CSS"/></summary><p>与固定小剧场平行使用；只改变 Mufy 页面外观。</p><pre>{artifact.globalCss}</pre></details>
      </div>
      <p className="ai-fixed-delivery-note"><b>固定内容 ≠ 静态图片。</b>{artifact.pages.length > 1 ? `当前 ${artifact.pages.length} 页可点击上一页/下一页；` : "组件原本具备的 CSS 交互会保留；"}只是文字不会随新回复自动变化。</p>
    </>}
  </section>;
}

function RefinementPanel(props: {
  preset: ImageComponentPreset;
  pages: ImageAssistantPage[];
  activePage: ImageAssistantPage;
  activePageId: string;
  canEditPages: boolean;
  loopPages: boolean;
  deliveryMode: ImageAssistantDeliveryMode;
  tab: "text" | "ai";
  revisionMessages: RevisionMessage[];
  revisionInput: string;
  revisionBusy: boolean;
  revisionError: string;
  pendingRevision: PendingRevision | null;
  canUseAi: boolean;
  canUndo: boolean;
  onTab: (tab: "text" | "ai") => void;
  onActivePage: (id: string) => void;
  onLoopPages: (value: boolean) => void;
  onPageTitle: (value: string) => void;
  onPageValue: (fieldIndex: number, value: string) => void;
  onDuplicatePage: () => void;
  onRemovePage: () => void;
  onRevisionInput: (value: string) => void;
  onRequestRevision: () => void;
  onApplyRevision: () => void;
  onDiscardRevision: () => void;
  onUndoRevision: () => void;
}) {
  const fields = IMAGE_COMPONENT_PRESETS[props.preset].fields;
  const captureCount = fields.length * props.pages.length;
  return <section className="ai-refinement-panel panel">
    <header>
      <span><small>04 / REFINE & INTERACT</small><b>继续修改这个组件</b></span>
      <nav aria-label="修改方式"><button type="button" aria-pressed={props.tab === "text"} className={props.tab === "text" ? "active" : ""} onClick={() => props.onTab("text")}>文字与页面</button><button type="button" aria-pressed={props.tab === "ai"} className={props.tab === "ai" ? "active" : ""} onClick={() => props.onTab("ai")}>和 AI 继续改</button></nav>
    </header>
    {props.tab === "text" ? <div className="ai-page-editor">
      <div className="ai-page-tabs" role="group" aria-label="组件页面">
        {props.pages.map((page, index) => <button type="button" aria-pressed={page.id === props.activePageId} className={page.id === props.activePageId ? "active" : ""} key={page.id} onClick={() => props.onActivePage(page.id)}><i>{index + 1}</i><span>{page.title || `第 ${index + 1} 页`}</span></button>)}
        <button type="button" className="add" disabled={!props.canEditPages || props.pages.length >= 4} onClick={props.onDuplicatePage}>＋ 复制为下一页</button>
      </div>
      <div className="ai-page-editor-head"><label><span>页面名称</span><input value={props.activePage.title} maxLength={40} onChange={(event) => props.onPageTitle(event.target.value)}/></label>{props.pages.length > 1 && <button type="button" onClick={props.onRemovePage}>删除本页</button>}</div>
      <div className="ai-page-fields">
        {fields.map((field, index) => <label key={field.tag}><span><b>{field.label}</b><small>{field.requirement}</small></span><textarea rows={index === 2 ? 3 : 2} maxLength={500} value={props.activePage.values[index] ?? ""} onChange={(event) => props.onPageValue(index, event.target.value)}/></label>)}
      </div>
      <footer><label className="ai-loop-toggle"><input type="checkbox" checked={props.loopPages} disabled={props.pages.length < 2} onChange={(event) => props.onLoopPages(event.target.checked)}/><span>末页“下一页”循环回第一页</span></label><p>{props.deliveryMode === "dynamic" ? <><b>{props.pages.length} 页 · {captureCount} 个动态变量</b>每页文字会作为预览样例，同时重建 XML、正则、变量表、输出设定与官网 JSON。</> : <><b>{props.pages.length} 页 · 固定内容</b>每页文字会原样写入小剧场 HTML，不包含内部动态变量。</>} {props.pages.length > 1 ? "页面切换是无脚本的真实 CSS 交互；刷新或新回复后回到第一页。" : "组件若含折叠、喜欢等控件，会保留原有 CSS 交互。"}</p></footer>
    </div> : <div className="ai-revision-chat">
      <div className="ai-revision-stream" aria-live="polite">
        {props.revisionMessages.length === 0 ? <div className="ai-revision-welcome"><i>✦</i><b>告诉 MiniMax 还要怎么改</b><p>它只能修改受限布局、色板、字号、区块位置和分页文字，不能把脚本、URL 或任意源码塞进组件。</p></div> : props.revisionMessages.map((message) => <article key={message.id} className={message.role}><small>{message.role === "user" ? "你" : "MiniMax"}</small><p>{message.text}</p></article>)}
        {props.revisionBusy && <article className="assistant thinking"><small>MiniMax</small><p>正在结合原图和当前组件生成修改建议…</p></article>}
      </div>
      <div className="ai-revision-prompts" aria-label="快捷修改"><button type="button" onClick={() => props.onRevisionInput("卡片再窄一点，玻璃感更强，文字保持清晰")}>卡片更窄、更通透</button><button type="button" onClick={() => props.onRevisionInput("增加第二页，写一条与第一页连续的动态")}>生成连续第二页</button><button type="button" onClick={() => props.onRevisionInput("放大正文区域，弱化天气和时间等元信息")}>突出正文</button></div>
      {props.pendingRevision && <section className="ai-revision-proposal"><span><b>AI 修改建议已就绪</b><p>{props.pendingRevision.reply}</p></span><div><button type="button" onClick={props.onApplyRevision}>应用修改</button><button type="button" className="secondary" onClick={props.onDiscardRevision}>放弃</button></div></section>}
      {props.revisionError && <p className="ai-reference-error" role="alert">{props.revisionError}</p>}
      <div className="ai-revision-compose"><textarea rows={3} maxLength={1000} value={props.revisionInput} placeholder="例如：下一页做成同一作者的第二条动态；卡片再窄一点；头像再小一些……" onChange={(event) => props.onRevisionInput(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") props.onRequestRevision(); }}/><footer><small>{props.canUseAi ? "Ctrl / ⌘ + Enter 发送 · 先看建议，再决定是否应用" : "请上传真实图片并完成深度识图后使用；内置示例可手动修改"}</small><span>{props.canUndo && <button type="button" className="secondary" onClick={props.onUndoRevision}>撤销上次 AI 修改</button>}<button type="button" disabled={!props.canUseAi || props.revisionBusy || !props.revisionInput.trim()} onClick={props.onRequestRevision}>{props.revisionBusy ? "修改中…" : "发送修改要求"}</button></span></footer></div>
    </div>}
  </section>;
}

function ImageReferenceCreator({ onApply, enabled, visibility }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const analysisRequest = useRef(0);
  const visionRequest = useRef(0);
  const visionController = useRef<AbortController | null>(null);
  const revisionRequest = useRef(0);
  const revisionController = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<ImageCreationMode>("recreate");
  const [deliveryMode, setDeliveryMode] = useState<ImageAssistantDeliveryMode>("fixed");
  const [preset, setPreset] = useState<ImageComponentPreset>("status");
  const [timing, setTiming] = useState("每次对话结束时");
  const [pages, setPages] = useState<ImageAssistantPage[]>(() => createImageAssistantPages(presetSamples("status")));
  const [activePageId, setActivePageId] = useState("page-1");
  const [loopPages, setLoopPages] = useState(false);
  const [refinementTab, setRefinementTab] = useState<"text" | "ai">("text");
  const [signature, setSignature] = useState<VisualSignature | null>(null);
  const [localSignature, setLocalSignature] = useState<VisualSignature | null>(null);
  const [fileName, setFileName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadImageUrl, setUploadImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visionStatus, setVisionStatus] = useState<MiniMaxVisionStatus | null>(null);
  const [visionStatusError, setVisionStatusError] = useState("");
  const [visionSpec, setVisionSpec] = useState<MiniMaxVisionSpec | null>(null);
  const [visionBusy, setVisionBusy] = useState(false);
  const [visionError, setVisionError] = useState("");
  const [autoPreset, setAutoPreset] = useState(true);
  const [revisionMessages, setRevisionMessages] = useState<RevisionMessage[]>([]);
  const [revisionInput, setRevisionInput] = useState("");
  const [revisionBusy, setRevisionBusy] = useState(false);
  const [revisionError, setRevisionError] = useState("");
  const [pendingRevision, setPendingRevision] = useState<PendingRevision | null>(null);
  const [revisionUndo, setRevisionUndo] = useState<RevisionSnapshot | null>(null);
  const artifact = useMemo(() => signature ? buildImageAssistantArtifact({ mode, preset, signature, referenceName: fileName, timing, pages, loopPages }) : null, [fileName, loopPages, mode, pages, preset, signature, timing]);
  const isDemoVision = fileName === "Studio 内置结构重建示例";
  const blueprintApplied = Boolean(visionSpec && (mode === "recreate" || visionSpec.suggestedPreset === preset));
  const editorPages = pages.slice(0, artifact?.pages.length ?? pages.length);
  const activePage = editorPages.find((page) => page.id === activePageId) ?? editorPages[0] ?? createImageAssistantPages(presetSamples(preset))[0];
  const canEditPages = Boolean(blueprintApplied && visionSpec);

  async function checkVisionStatus() {
    try {
      const response = await fetch("/api/minimax-vision", { cache: "no-store" });
      const result = await response.json() as MiniMaxVisionStatus & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "无法读取 MiniMax 配置");
      setVisionStatusError("");
      setVisionStatus(result);
    } catch (reason) {
      setVisionStatusError(reason instanceof Error ? reason.message : "配置检查失败");
    }
  }

  useEffect(() => {
    return () => {
      visionController.current?.abort();
      revisionController.current?.abort();
    };
  }, []);

  function invalidateRevisionProposal() {
    revisionRequest.current += 1;
    revisionController.current?.abort();
    revisionController.current = null;
    setRevisionBusy(false);
    setRevisionError("");
    setPendingRevision(null);
    setRevisionUndo(null);
  }

  function resetRevision() {
    invalidateRevisionProposal();
    setRevisionMessages([]);
    setRevisionInput("");
  }

  function resetVision(nextLocal = localSignature) {
    visionRequest.current += 1;
    visionController.current?.abort();
    visionController.current = null;
    setVisionBusy(false);
    setVisionError("");
    setVisionSpec(null);
    if (nextLocal) setSignature(nextLocal);
    resetRevision();
  }

  function openPicker() {
    if (busy || !input.current) return;
    input.current.value = "";
    input.current.click();
  }

  async function chooseFile(file: File) {
    const request = ++analysisRequest.current;
    setError("");
    if (!IMAGE_TYPES.has(file.type)) { setError("请选择 PNG、JPEG 或 WebP 图片。"); setBusy(false); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError("图片不能超过 8 MB；请先裁剪到主要组件区域。"); setBusy(false); return; }
    setBusy(true);
    resetVision(null);
    setImageUrl("");
    setUploadImageUrl("");
    setFileName("");
    setLocalSignature(null);
    setSignature(null);
    const initialPages = createImageAssistantPages(presetSamples(preset));
    setPages(initialPages);
    setActivePageId(initialPages[0].id);
    setLoopPages(false);
    try {
      const image = await readImageFile(file);
      if (request !== analysisRequest.current) return;
      setImageUrl(image.dataUrl);
      setUploadImageUrl(image.uploadDataUrl);
      setFileName(file.name);
      setLocalSignature(image.signature);
      setSignature(image.signature);
      void checkVisionStatus();
    } catch (reason) {
      if (request !== analysisRequest.current) return;
      setError(reason instanceof Error ? reason.message : "图片分析失败，请换一张图片重试。");
    } finally {
      if (request === analysisRequest.current) setBusy(false);
    }
  }

  function clearImage() {
    analysisRequest.current += 1;
    setBusy(false);
    if (input.current) input.current.value = "";
    setImageUrl("");
    setUploadImageUrl("");
    setFileName("");
    setLocalSignature(null);
    setSignature(null);
    resetVision(null);
    const initialPages = createImageAssistantPages(presetSamples(preset));
    setPages(initialPages);
    setActivePageId(initialPages[0].id);
    setLoopPages(false);
    setError("");
  }

  function loadDemo() {
    analysisRequest.current += 1;
    setBusy(false);
    if (input.current) input.current.value = "";
    setImageUrl(DEMO_IMAGE_URL);
    setUploadImageUrl("");
    setFileName("Studio 内置结构重建示例");
    setLocalSignature(DEMO_SIGNATURE);
    resetVision(DEMO_SIGNATURE);
    setVisionSpec(DEMO_VISION_SPEC);
    setSignature(mergeMiniMaxVisionSignature(DEMO_SIGNATURE, DEMO_VISION_SPEC));
    setPreset("social");
    const nextPages = demoPages();
    setPages(nextPages);
    setActivePageId(nextPages[0].id);
    setLoopPages(false);
    setError("");
    void checkVisionStatus();
  }

  async function analyzeWithMiniMax() {
    if (!uploadImageUrl || !localSignature || !visionStatus?.configured || visionBusy) return;
    const request = ++visionRequest.current;
    visionController.current?.abort();
    const controller = new AbortController();
    visionController.current = controller;
    setVisionBusy(true);
    setVisionError("");
    resetRevision();
    try {
      const response = await fetch("/api/minimax-vision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageDataUrl: uploadImageUrl, mode, preset, localSignature }),
        signal: controller.signal,
      });
      const result = await response.json() as { spec?: unknown; error?: string };
      if (!response.ok) throw new Error(result.error ?? "MiniMax 图片分析失败");
      const spec = validateMiniMaxVisionSpec(result.spec);
      if (request !== visionRequest.current) return;
      const nextPreset = mode === "recreate" || autoPreset ? spec.suggestedPreset : preset;
      const samples = presetSamples(nextPreset);
      const hasPager = spec.blueprint.blocks.some((block) => block.kind === "nav");
      const preservePages = nextPreset === preset ? normalizeImageAssistantPages(pages, samples) : createImageAssistantPages(samples);
      const nextPages = !visionSpec && hasPager && preservePages.length === 1
        ? createImageAssistantPages(samples, 2)
        : preservePages;
      setVisionSpec(spec);
      setSignature(mergeMiniMaxVisionSignature(localSignature, spec));
      setPreset(nextPreset);
      setPages(nextPages);
      setActivePageId(nextPages[0].id);
      resetRevision();
    } catch (reason) {
      if (request !== visionRequest.current || (reason instanceof Error && reason.name === "AbortError")) return;
      setVisionError(reason instanceof Error ? reason.message : "MiniMax 图片分析失败");
      setSignature(localSignature);
      setVisionSpec(null);
    } finally {
      if (request === visionRequest.current) setVisionBusy(false);
    }
  }

  function selectPreset(nextPreset: ImageComponentPreset) {
    setPreset(nextPreset);
    const nextPages = createImageAssistantPages(presetSamples(nextPreset));
    setPages(nextPages);
    setActivePageId(nextPages[0].id);
    setLoopPages(false);
    resetRevision();
  }

  function updatePage(pageId: string, updater: (page: ImageAssistantPage) => ImageAssistantPage) {
    setPages((current) => current.map((page) => page.id === pageId ? updater(page) : page));
    invalidateRevisionProposal();
  }

  function duplicateActivePage() {
    if (!activePage || pages.length >= 4) return;
    const next = duplicateImageAssistantPage(pages, activePage.id, presetSamples(preset));
    const activeIndex = next.findIndex((page) => page.id === activePage.id);
    setPages(next);
    setActivePageId(next[Math.min(activeIndex + 1, next.length - 1)].id);
    invalidateRevisionProposal();
  }

  function removeActivePage() {
    if (!activePage || pages.length <= 1) return;
    const activeIndex = pages.findIndex((page) => page.id === activePage.id);
    const next = pages.filter((page) => page.id !== activePage.id);
    setPages(next);
    setActivePageId(next[Math.max(0, activeIndex - 1)]?.id ?? next[0].id);
    if (next.length === 1) setLoopPages(false);
    invalidateRevisionProposal();
  }

  async function requestRevision() {
    const message = revisionInput.trim();
    if (!message || revisionBusy) return;
    if (!uploadImageUrl || !visionSpec || !localSignature || !visionStatus?.configured || visionSpec.suggestedPreset !== preset) {
      setRevisionError("请先上传真实图片并完成一次 MiniMax 深度识图；内置示例只能手动编辑。");
      return;
    }
    const request = ++revisionRequest.current;
    revisionController.current?.abort();
    const controller = new AbortController();
    revisionController.current = controller;
    setRevisionBusy(true);
    setRevisionError("");
    setPendingRevision(null);
    setRevisionMessages((current) => [...current, { id: `u-${request}`, role: "user", text: message }]);
    setRevisionInput("");
    try {
      const response = await fetch("/api/minimax-vision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "revise",
          imageDataUrl: uploadImageUrl,
          currentSpec: visionSpec,
          pages: pages.map(({ title, values }) => ({ title, values })),
          message,
          preset,
        }),
        signal: controller.signal,
      });
      const payload = await response.json() as unknown;
      if (!response.ok) {
        const errorPayload = payload && typeof payload === "object" ? payload as { error?: string } : {};
        throw new Error(errorPayload.error ?? "MiniMax 修改失败");
      }
      const result = validateMiniMaxRevisionResult(payload, preset);
      if (request !== revisionRequest.current) return;
      const nextPages = normalizeImageAssistantPages(result.pages, presetSamples(preset));
      setPendingRevision({ reply: result.reply, spec: result.spec, pages: nextPages });
      setRevisionMessages((current) => [...current, { id: `a-${request}`, role: "assistant", text: result.reply }]);
    } catch (reason) {
      if (request !== revisionRequest.current || (reason instanceof Error && reason.name === "AbortError")) return;
      setRevisionError(reason instanceof Error ? reason.message : "MiniMax 修改失败");
    } finally {
      if (request === revisionRequest.current) setRevisionBusy(false);
    }
  }

  function applyPendingRevision() {
    if (!pendingRevision || !visionSpec || !localSignature) return;
    setRevisionUndo({ spec: visionSpec, pages: pages.map((page) => ({ ...page, values: [...page.values] })) });
    setVisionSpec(pendingRevision.spec);
    setSignature(mergeMiniMaxVisionSignature(localSignature, pendingRevision.spec));
    setPages(pendingRevision.pages);
    setActivePageId(pendingRevision.pages[0].id);
    setPendingRevision(null);
  }

  function undoRevision() {
    if (!revisionUndo || !localSignature) return;
    setVisionSpec(revisionUndo.spec);
    setSignature(mergeMiniMaxVisionSignature(localSignature, revisionUndo.spec));
    setPages(revisionUndo.pages);
    setActivePageId(revisionUndo.pages[0].id);
    setRevisionUndo(null);
    setPendingRevision(null);
  }

  return <div className="ai-reference-layout">
    <aside className="ai-reference-controls panel">
      <header><span><small>01 / INPUT MODE</small><b>图片要怎么用？</b></span><i>✦</i></header>
      <div className="ai-reference-mode" role="group" aria-label="图片创建模式">
        <button type="button" className={mode === "recreate" ? "active" : ""} onClick={() => { if (mode === "recreate") return; setMode("recreate"); resetVision(); }}><i>▧</i><span><b>截图结构重建</b><small>MiniMax 生成可编译布局蓝图</small></span></button>
        <button type="button" className={mode === "style" ? "active" : ""} onClick={() => { if (mode === "style") return; setMode("style"); resetVision(); }}><i>✦</i><span><b>参考图风格转译</b><small>提取气质，生成原创小组件</small></span></button>
      </div>
      <label className="ai-control-field"><span>组件类型</span><select value={preset} onChange={(event) => selectPreset(event.target.value as ImageComponentPreset)}>{(Object.keys(IMAGE_COMPONENT_PRESETS) as ImageComponentPreset[]).map((key) => <option key={key} value={key}>{IMAGE_COMPONENT_PRESETS[key].name} · {IMAGE_COMPONENT_PRESETS[key].sub}</option>)}</select></label>
      <label className="ai-control-field"><span>AI 输出时机</span><input value={timing} maxLength={120} onChange={(event) => setTiming(event.target.value)} /></label>
      {mode === "style" ? <label className="ai-vision-auto"><input type="checkbox" checked={autoPreset} onChange={(event) => setAutoPreset(event.target.checked)}/><span>深度识图后自动采用推荐组件类型</span></label> : <div className="ai-vision-auto"><span>重建模式会自动采用识别到的组件结构，避免手选预设覆盖截图布局。</span></div>}
      <div className="ai-truth-card"><b>两层图片分析</b><p><span>✓</span> 本地层：主色、明暗、对比、饱和与边缘密度</p><p><span>✦</span> MiniMax 层：生成坐标化区块、分区、素材位与操作栏</p><p><span>!</span> 原头像和人物图保留素材位；不伪造隐藏脚本或触发词</p></div>
      <div className="ai-privacy-card"><b>由你决定是否外发</b><p>上传后默认只在浏览器分析。仅点击“使用 MiniMax 深度识图”时，压缩并去元数据的图片才会发送至 MiniMax；本站不写入存储，MiniMax 按其服务政策处理。</p></div>
    </aside>

    <section className="ai-reference-stage">
      <header className="ai-reference-stage-head"><span><small>02 / REFERENCE</small><b>{mode === "recreate" ? "上传成品组件截图" : "上传任意风格参考图"}</b></span>{imageUrl && <button type="button" onClick={clearImage}>移除图片</button>}</header>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        if (file) void chooseFile(file);
      }} />
      {!imageUrl ? <div className="ai-dropzone-shell" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file) void chooseFile(file); }}><button type="button" className="ai-dropzone" disabled={busy} onClick={openPicker}>
        <i>{busy ? "…" : "＋"}</i><b>{busy ? "正在分析图片" : "点击或拖入参考图片"}</b><span>PNG / JPEG / WebP · 最大 8 MB</span><small>截图建议先裁剪到单个组件，取色与明暗分析会更聚焦</small>
      </button><button type="button" className="ai-dropzone-demo" onClick={loadDemo}>先用内置示例体验 →</button></div> : <div className="ai-image-comparison">
        <figure><img src={imageUrl} alt="上传的视觉参考"/><figcaption><span><b>REFERENCE</b><small>{fileName}</small></span><button type="button" onClick={openPicker}>更换</button></figcaption></figure>
        {signature && <section className="ai-visual-readout"><header><span><small>{visionSpec ? "MINIMAX VISION + LOCAL COLOR" : "LOCAL COLOR ANALYSIS"}</small><b>{signature.styleName}</b></span><em>{signature.material}</em></header><div className="ai-palette">{signature.palette.map((color) => <span key={color} style={{ background: color }} title={color}/>)}</div><dl><div><dt>画面</dt><dd>{signature.width} × {signature.height}</dd></div><div><dt>明度</dt><dd>{signature.averageLightness}</dd></div><div><dt>对比</dt><dd>{signature.contrast}</dd></div><div><dt>建议圆角</dt><dd>{signature.radius}px</dd></div></dl></section>}
      </div>}
      {imageUrl && <section className={`ai-minimax-panel panel ${visionSpec ? "done" : ""}`} aria-live="polite"><header><span><small>OPTIONAL DEEP VISION</small><b>MiniMax 深度识图</b></span><em>{isDemoVision ? "内置结构示例" : visionStatusError ? "配置检查失败" : visionStatus === null ? "检查配置…" : visionStatus.configured ? `${visionStatus.region === "mainland" ? "大陆站" : "国际站"}${visionSpec ? "本次调用已验证" : "服务端已有密钥 · 尚未验证"}` : "未填服务端密钥"}</em></header><p>识别卡片边界、头像/媒体位、正文、元信息和操作栏，返回受限布局蓝图；XML、正则与 HTML 仍由本站安全编译。</p><div className="ai-minimax-actions"><button type="button" disabled={!uploadImageUrl || !visionStatus?.configured || visionBusy} aria-busy={visionBusy} onClick={() => void analyzeWithMiniMax()}>{visionBusy ? "MiniMax 分析中…" : visionSpec ? "重新生成结构蓝图" : "✦ 使用 MiniMax 深度识图"}</button>{visionBusy && <button type="button" className="secondary" onClick={() => resetVision()}>取消分析</button>}{!visionBusy && visionSpec && <button type="button" className="secondary" onClick={() => resetVision()}>恢复本地取色</button>}{!isDemoVision && !visionBusy && (visionStatusError || visionStatus?.configured === false) && <button type="button" className="secondary" onClick={() => { setVisionStatus(null); setVisionStatusError(""); void checkVisionStatus(); }}>重新检查配置</button>}</div>{!uploadImageUrl && <small>内置示例展示结构蓝图效果；请上传 PNG、JPEG 或 WebP 让 MiniMax 分析你的图片。</small>}{!isDemoVision && visionStatus && !visionStatus.configured && <small>需要在站点服务端配置 Token Plan 的 MINIMAX_API_KEY；不要把密钥粘贴到网页或聊天。</small>}{!isDemoVision && visionStatusError && <small>{visionStatusError}。本地取色仍可继续使用。</small>}{!isDemoVision && visionError && <div className="ai-minimax-diagnostic" role="alert"><b>本次深度识图没有应用</b><p>{visionError}</p><small>1004 / 2049 表示密钥无效、停用或区域不匹配；2056 表示本个 5 小时用量窗口已满。若提示“已连接但未通过安全校验”，可直接重新生成。</small></div>}{visionSpec && <dl><div><dt>推荐结构</dt><dd>{IMAGE_COMPONENT_PRESETS[visionSpec.suggestedPreset].name}</dd></div><div><dt>布局区块</dt><dd>{visionSpec.blueprint.blocks.length} 个</dd></div><div><dt>待补素材</dt><dd>{visionSpec.blueprint.missingAssets.length || "无"}</dd></div><div><dt>分析置信</dt><dd>{Math.round(visionSpec.confidence * 100)}% · 非相似度</dd></div></dl>}</section>}
      {artifact && <DeliveryModeSelector mode={deliveryMode} pages={artifact.pages.length} onMode={setDeliveryMode}/>}
      {artifact && <RefinementPanel
        preset={artifact.preset}
        pages={editorPages}
        activePage={activePage}
        activePageId={activePageId}
        canEditPages={canEditPages}
        loopPages={loopPages}
        deliveryMode={deliveryMode}
        tab={refinementTab}
        revisionMessages={revisionMessages}
        revisionInput={revisionInput}
        revisionBusy={revisionBusy}
        revisionError={revisionError}
        pendingRevision={pendingRevision}
        canUseAi={Boolean(uploadImageUrl && visionSpec && visionSpec.suggestedPreset === preset && visionStatus?.configured && !isDemoVision)}
        canUndo={Boolean(revisionUndo)}
        onTab={setRefinementTab}
        onActivePage={setActivePageId}
        onLoopPages={(value) => { setLoopPages(value); invalidateRevisionProposal(); }}
        onPageTitle={(value) => updatePage(activePage.id, (page) => ({ ...page, title: value }))}
        onPageValue={(fieldIndex, value) => updatePage(activePage.id, (page) => ({ ...page, values: page.values.map((current, index) => index === fieldIndex ? value : current) }))}
        onDuplicatePage={duplicateActivePage}
        onRemovePage={removeActivePage}
        onRevisionInput={setRevisionInput}
        onRequestRevision={() => void requestRevision()}
        onApplyRevision={applyPendingRevision}
        onDiscardRevision={() => setPendingRevision(null)}
        onUndoRevision={undoRevision}
      />}
      {error && <p className="ai-reference-error" role="alert">{error}</p>}
      {artifact ? <section className="ai-export-preview panel"><header><span><small>04 / EXPORT-CODE PREVIEW</small><b>{deliveryMode === "dynamic" ? "动态正则 · 样例预览" : "固定小剧场 · 导出预览"}</b></span><em>{artifact.analysisSummary}</em></header><iframe title={deliveryMode === "dynamic" ? "动态正则的样例运行预览" : "固定小剧场的实际导出预览"} sandbox="" srcDoc={previewImageAssistantArtifact(artifact, deliveryMode)}/><footer><span><i/> {deliveryMode === "dynamic" ? "以中间栏文字模拟一次成功触发；每轮实际文字可变化" : artifact.pages.length > 1 ? "这就是粘贴后的文字和分页效果" : "这就是粘贴后的文字和组件外观"}</span><small>{deliveryMode === "fixed" ? "复制源码不含内部动态变量" : blueprintApplied && visionSpec ? `结构蓝图 ${visionSpec.blueprint.blocks.length} 区块；原素材需另补` : visionSpec ? "已应用视觉令牌，保留手选组件结构" : "未深度识图时仅生成风格预设"}</small></footer></section> : <section className="ai-preview-empty panel"><i>◇</i><b>上传图片后生成安全适配稿</b><p>本地层先取色；点击 MiniMax 后才会进一步生成可编译结构蓝图。</p></section>}
    </section>

    {artifact ? <ArtifactResults artifact={artifact} deliveryMode={deliveryMode} enabled={enabled} visibility={visibility} onApply={onApply}/> : <aside className="ai-results-empty panel"><small>OUTPUT PACKAGE</small><h2>一张图，<br/>三种使用方式。</h2><ol><li><i>1</i><span><b>固定小剧场</b><small>直接写入当前文字，复制完整 HTML 即可</small></span></li><li><i>2</i><span><b>动态正则</b><small>XML、正则、变量表、输出设定、官网 JSON</small></span></li><li><i>3</i><span><b>全局美化</b><small>基础 CSS + 可继续发给美化助手的调用语句</small></span></li></ol><p>先生成同一套外观，再决定内容由 AI 动态更新，还是固定为你在中间栏填写的文字。</p></aside>}
  </div>;
}

export function AiCreatorStudio(props: Props) {
  const [tab, setTab] = useState<"image" | "text">("image");
  return <section className="ai-creator-workspace">
    <header className="ai-creator-hero">
      <div><small>AI CREATION STUDIO</small><h1>上传参考，生成真正<br/><em>能落地的 Mufy 配置。</em></h1><p>截图用于结构重建，风格图用于原创转译；正则与全局美化分别输出。</p></div>
      <div className="ai-creator-capabilities"><span><i/> 本地取色</span><span><i/> MiniMax 深度识图</span><span><i/> 官网 JSON</span><span><i/> 导出代码预览</span></div>
    </header>
    <nav className="ai-creator-tabs" aria-label="AI 创建方式"><button type="button" className={tab === "image" ? "active" : ""} onClick={() => setTab("image")}><i>▧</i><span><b>图片创建</b><small>截图结构重建 / 风格转译</small></span></button><button type="button" className={tab === "text" ? "active" : ""} onClick={() => setTab("text")}><i>✦</i><span><b>文字创建</b><small>四步生成完整正则包</small></span></button></nav>
    {tab === "image" ? <ImageReferenceCreator {...props}/> : <div className="ai-guided-shell"><RegexAiAssistant open embedded onClose={() => undefined} onApply={props.onApply} enabled={props.enabled} visibility={props.visibility}/></div>}
  </section>;
}

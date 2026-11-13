"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { MAX_MUFY_XML_BYTES, encryptedPayloadStatus, mufyXmlByteLength, parseMufyCharacter, serializeMufyCharacter } from "./mufy-character-xml";
import type { MufyCharacterData } from "./mufy-character-xml";
import { kingBeautyCss } from "./reference-templates";
import { mufyReplacement, previewMufyReplacement } from "./mufy-regex-format";
import { createTheaterPortableDocument, theaterStatusRecords, theaterStatusThought } from "./theater-portable";
import type { TheaterCopy, TheaterModule } from "./theater-portable";

type CopyActionProps = { value: string; label?: string; className?: string };

function CopyAction({ value, label = "复制", className = "" }: CopyActionProps) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 1400);
    } catch {
      setDone(false);
    }
  }
  return <button className={`workspace-action ${done ? "done" : ""} ${className}`} onClick={copy}>{done ? "已复制 ✓" : label}</button>;
}

function saveFile(name: string, value: string, type: string) {
  const blob = new Blob([value], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Capability({ tone, children }: { tone: "live" | "portable" | "host"; children: ReactNode }) {
  return <span className={`capability ${tone}`}><i />{children}</span>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="work-field"><span><b>{label}</b>{hint && <small>{hint}</small>}</span>{children}</label>;
}

type CardStep = "identity" | "persona" | "opening" | "world" | "output" | "samples" | "xml";
type CardDraft = {
  name: string;
  subtitle: string;
  genderCode: string;
  gender: string;
  age: string;
  tags: string;
  image: string;
  unrestricted: boolean;
  oc: boolean;
  ai: boolean;
  contentType: string;
  camera: boolean;
  persona: string;
  adversity: string;
  cognition: string;
  opening: string;
  moment: string;
  world: string;
  plot: string;
  output: string;
  sample: string;
  authorTitle: string;
  authorNote: string;
  visibility: string;
  theaterPayload: string;
  stylePayload: string;
};

const defaultCard: CardDraft = {
  name: "许知遥",
  subtitle: "雨夜电台的最后一位听众",
  genderCode: "1",
  gender: "男性",
  age: "26",
  tags: "都市\n慢热\n悬疑",
  image: "",
  unrestricted: false,
  oc: true,
  ai: false,
  contentType: "OC",
  camera: false,
  persona: "表面冷静克制，擅长把关心藏进不经意的提醒里。对旧车站和失踪的末班车有一段不愿提起的往事。",
  adversity: "遭遇无法确认的危险时，他会先保护现场与同伴，再验证线索；不会突然失去判断力，也不会替玩家作出关键选择。",
  cognition: "他知道玩家是今晚临时接班的电台编辑；双方此前只通过三封匿名来信联系。他不会无缘无故知道玩家未说出口的想法。",
  opening: `<narration>雨水敲在直播间的玻璃上，零点报时刚刚结束。</narration>
<message>“你终于接电话了。”</message>
<scenario>桌上的红色线路灯重新亮起。</scenario>`,
  moment: "时间：凌晨 00:07\n地点：临港电台 B 直播间\n关系：第一次真正通话",
  world: "临港是一座被旧铁路分成南北两岸的海港城市。十年前，南岸末班车在暴雨夜停运后再也没有恢复。",
  plot: "主线围绕一张被撕成四份的车票展开。每次推进只揭示一条可验证的新线索，避免一次性说完真相。",
  output: "使用第二人称沉浸叙事；每轮 450—700 字；对白与动作交替；需要 UI 时输出约定的英文 XML 标签；不要替玩家决定行动。",
  sample: "许知遥停顿了两秒，像是在确认窗外的雨声。\n“别回头。”他说，“至少在我数到七以前。”",
  authorTitle: "创作说明",
  authorNote: "这是一个慢节奏的都市悬疑角色。建议从电台来电开始，允许线索自然发酵。",
  visibility: "2",
  theaterPayload: "",
  stylePayload: "",
};

const cardSteps: Record<CardStep, { icon: string; name: string; sub: string }> = {
  identity: { icon: "01", name: "基础信息", sub: "名称、标签与封面" },
  persona: { icon: "02", name: "人物内核", sub: "设定与默认认知" },
  opening: { icon: "03", name: "开场设计", sub: "问候、场景与时刻" },
  world: { icon: "04", name: "剧情世界", sub: "世界观与推进规则" },
  output: { icon: "05", name: "输出设置", sub: "文风、长度与结构" },
  samples: { icon: "06", name: "样例与作者注", sub: "校准表达与说明" },
  xml: { icon: "07", name: "Mufy XML", sub: "导入、兼容与密文附件" },
};

function splitCardTags(value: string) {
  return value.split(/\n/).map((tag) => tag.trim()).filter(Boolean);
}

const CARD_STRING_KEYS: (keyof CardDraft)[] = [
  "name", "subtitle", "genderCode", "gender", "age", "tags", "image", "contentType",
  "persona", "adversity", "cognition", "opening", "moment", "world", "plot", "output",
  "sample", "authorTitle", "authorNote", "visibility", "theaterPayload", "stylePayload",
];
const CARD_BOOLEAN_KEYS: (keyof CardDraft)[] = ["unrestricted", "oc", "ai", "camera"];

function sanitizeCardDraft(value: unknown): CardDraft {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const next = { ...defaultCard };
  for (const key of CARD_STRING_KEYS) {
    const candidate = input[key];
    const limit = key === "theaterPayload" || key === "stylePayload" ? MAX_MUFY_XML_BYTES : 250_000;
    if (typeof candidate === "string" && mufyXmlByteLength(candidate) <= limit) (next[key] as string) = candidate;
  }
  for (const key of CARD_BOOLEAN_KEYS) {
    const candidate = input[key];
    if (typeof candidate === "boolean") (next[key] as boolean) = candidate;
  }
  return next;
}

function cardToMufyData(card: CardDraft): MufyCharacterData {
  return {
    version: "1",
    type: "single",
    metadata: {
      name: card.name,
      genderCode: card.genderCode,
      genderText: card.gender,
      age: card.age,
      nsfw: card.unrestricted,
      oc: card.oc,
      ai: card.ai,
      cardType: "single",
      contentType: card.contentType || "OC",
      camera: card.camera,
    },
    tags: splitCardTags(card.tags),
    introduction: card.subtitle,
    greeting: card.opening,
    cognition: card.cognition,
    authorTitle: card.authorTitle,
    authorNote: card.authorNote,
    theaterPayload: card.theaterPayload,
    persona: card.persona,
    adversity: card.adversity,
    visibility: card.visibility,
    stylePayload: card.stylePayload,
  };
}

function cardFromMufyData(data: MufyCharacterData): CardDraft {
  return {
    ...defaultCard,
    name: data.metadata.name,
    subtitle: data.introduction,
    genderCode: data.metadata.genderCode,
    gender: data.metadata.genderText,
    age: data.metadata.age,
    tags: data.tags.join("\n"),
    image: "",
    unrestricted: data.metadata.nsfw,
    oc: data.metadata.oc,
    ai: data.metadata.ai,
    contentType: data.metadata.contentType,
    camera: data.metadata.camera,
    persona: data.persona,
    adversity: data.adversity,
    cognition: data.cognition,
    opening: data.greeting,
    moment: "",
    world: "",
    plot: "",
    output: "",
    sample: "",
    authorTitle: data.authorTitle,
    authorNote: data.authorNote,
    visibility: data.visibility,
    theaterPayload: data.theaterPayload,
    stylePayload: data.stylePayload,
  };
}

function safeCardFilename(value: string) {
  const clean = value.replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-").trim().slice(0, 60);
  return `mufy-${clean || "character"}.xml`;
}

function PayloadStatus({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  const status = encryptedPayloadStatus(value);
  const copy = status === "preserved" ? "封套结构匹配，未验证可解密" : status === "empty" ? "新卡未附加" : "封套结构不匹配";
  return <article className={`xml-payload-card ${status}`}><span><i>{status === "preserved" ? "✓" : status === "empty" ? "—" : "!"}</i><span><b>{label}</b><small>{copy} · {value.length.toLocaleString()} 字符</small></span></span>{value && <button type="button" onClick={onClear}>清除</button>}</article>;
}

export function CardBlueprint() {
  const [step, setStep] = useState<CardStep>("identity");
  const [card, setCard] = useState<CardDraft>(defaultCard);
  const [ready, setReady] = useState(false);
  const [importNotice, setImportNotice] = useState("");
  const [payloadSource, setPayloadSource] = useState<{ theater: string; style: string; file: string } | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem("mufy-card-blueprint-v2") ?? localStorage.getItem("mufy-card-blueprint-v1");
        if (raw && mufyXmlByteLength(raw) <= MAX_MUFY_XML_BYTES) setCard(sanitizeCardDraft(JSON.parse(raw)));
      } catch { /* keep safe defaults */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("mufy-card-blueprint-v2", JSON.stringify(card));
    } catch {
      /* Storage may be unavailable or full; manual JSON export remains available. */
    }
  }, [card, ready]);

  const xmlOutput = useMemo(() => serializeMufyCharacter(cardToMufyData(card)), [card]);
  const theaterPayloadState = encryptedPayloadStatus(card.theaterPayload);
  const stylePayloadState = encryptedPayloadStatus(card.stylePayload);
  const payloadsUntouched = Boolean(payloadSource && payloadSource.theater === card.theaterPayload && payloadSource.style === card.stylePayload);
  const xmlWithinLimit = mufyXmlByteLength(xmlOutput) <= MAX_MUFY_XML_BYTES;
  const exactXmlReady = payloadsUntouched && theaterPayloadState === "preserved" && stylePayloadState === "preserved" && xmlWithinLimit;
  const checks = [card.name.trim().length > 0, card.subtitle.trim().length > 8, card.persona.trim().length > 20, card.adversity.trim().length > 20, card.cognition.trim().length > 20, card.opening.trim().length > 20, card.authorNote.trim().length > 8, exactXmlReady];
  const score = Math.round(checks.filter(Boolean).length / checks.length * 100);
  const set = <K extends keyof CardDraft>(key: K, value: CardDraft[K]) => setCard((old) => ({ ...old, [key]: value }));
  const coverStyle: CSSProperties = card.image ? { backgroundImage: `linear-gradient(180deg,transparent 20%,rgba(14,12,21,.92)),url(${JSON.stringify(card.image)})` } : {};

  async function importCard(file: File) {
    try {
      if (file.size > MAX_MUFY_XML_BYTES) throw new Error("文件超过 2 MB 安全上限");
      const source = await file.text();
      if (file.name.toLowerCase().endsWith(".xml") || /^\s*(?:<\?xml[^>]*>\s*)?<mufy-character\b/.test(source)) {
        const imported = parseMufyCharacter(source);
        setCard(cardFromMufyData(imported));
        setPayloadSource({ theater: imported.theaterPayload, style: imported.stylePayload, file: file.name });
        setStep("xml");
        setImportNotice(`已导入 ${file.name}；卡片字段已映射，两段加密负载保持原文。`);
      } else {
        setCard(sanitizeCardDraft(JSON.parse(source)));
        setPayloadSource(null);
        setImportNotice(`已恢复本站 JSON 草稿 ${file.name}。`);
      }
    } catch (error) {
      setImportNotice(`导入失败：${error instanceof Error ? error.message : "文件格式不受支持"}`);
    }
  }

  return <section className="creator-workspace blueprint-workspace">
    <aside className="work-rail panel">
      <header><span><small>建卡蓝图</small><b>从设定走到开场</b></span><strong>{score}%</strong></header>
      <div className="step-list">{(Object.keys(cardSteps) as CardStep[]).map((item) => <button key={item} className={step === item ? "active" : ""} onClick={() => setStep(item)}><i>{cardSteps[item].icon}</i><span><b>{cardSteps[item].name}</b><small>{cardSteps[item].sub}</small></span><em>{step === item ? "●" : "→"}</em></button>)}</div>
      <div className="rail-note"><b>角色卡 XML ≠ 正则</b><p>参考文件没有正则节点。这里导出整张角色卡；正则仍在独立工作区生成。</p></div>
    </aside>

    <section className="work-main">
      <header className="work-hero"><div><small>01 / CHARACTER BLUEPRINT</small><h1>角色不是一段提示词，<br /><em>而是一套可检查、可导出的运行规则。</em></h1></div><div className="capability-row"><Capability tone="portable">Mufy 角色卡 XML v1</Capability><Capability tone="host">正则单独导出，不混入角色卡</Capability></div></header>
      <div className="blueprint-grid">
        <section className="panel form-card">
          <header><span><i>{cardSteps[step].icon}</i><b>{cardSteps[step].name}</b></span><small>{importNotice || "自动保存于当前浏览器"}</small></header>
          <div className="form-fields">
            {step === "identity" && <>
              <div className="field-row"><Field label="角色名"><input value={card.name} onChange={(e) => set("name", e.target.value)} /></Field><Field label="年龄"><input value={card.age} onChange={(e) => set("age", e.target.value)} /></Field></div>
              <Field label="角色介绍" hint="对应 XML 的角色介绍，可使用多行"><textarea rows={4} value={card.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></Field>
              <div className="field-row"><Field label="性别文本"><input value={card.gender} onChange={(e) => set("gender", e.target.value)} /></Field><Field label="性别编码" hint="参考文件仅确认 1=男性；其他值需实机验证"><input inputMode="numeric" pattern="[0-9]*" value={card.genderCode} onChange={(e) => set("genderCode", e.target.value)} /></Field></div>
              <Field label="标签" hint="每行一个；标签本身可安全包含 / 或逗号"><textarea rows={3} value={card.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
              <Field label="封面图片 URL" hint="仅用于本站预览与 JSON 工作稿，不写入参考 XML"><input placeholder="https://…" value={card.image} onChange={(e) => set("image", e.target.value)} /></Field>
              <label className="work-toggle"><span><b>非限制级角色</b><small>仅记录建卡选择，请遵循平台规范</small></span><input type="checkbox" checked={card.unrestricted} onChange={(e) => set("unrestricted", e.target.checked)} /></label>
            </>}
            {step === "persona" && <><Field label="角色设定" hint={`${card.persona.length} 字 · 对应 XML 人设`}><textarea rows={8} value={card.persona} onChange={(e) => set("persona", e.target.value)} /></Field><Field label="逆境处理" hint="参考 XML 中的独立字段"><textarea rows={6} value={card.adversity} onChange={(e) => set("adversity", e.target.value)} /></Field><Field label="默认认知" hint="明确知道什么，也明确不知道什么"><textarea rows={7} value={card.cognition} onChange={(e) => set("cognition", e.target.value)} /></Field></>}
            {step === "opening" && <><Field label="开场设计" hint="对应 XML 招呼语；支持 message / narration / scenario / system 结构"><textarea rows={10} value={card.opening} onChange={(e) => set("opening", e.target.value)} /></Field><Field label="开场时刻" hint="本站工作稿字段，不会擅自写入未知 XML 节点"><textarea rows={5} value={card.moment} onChange={(e) => set("moment", e.target.value)} /></Field></>}
            {step === "world" && <><Field label="世界观" hint="保存在 JSON 工作稿；需要时手动整合进人设"><textarea rows={8} value={card.world} onChange={(e) => set("world", e.target.value)} /></Field><Field label="剧情设置" hint="参考 XML 没有此独立节点，本站不会伪造标签"><textarea rows={8} value={card.plot} onChange={(e) => set("plot", e.target.value)} /></Field></>}
            {step === "output" && <Field label="输出设置" hint="保存在 JSON 工作稿；参考 XML 没有此独立节点"><textarea rows={16} value={card.output} onChange={(e) => set("output", e.target.value)} /></Field>}
            {step === "samples" && <><Field label="样例对话与文风" hint="保存在 JSON 工作稿；不会自动拼进人设"><textarea rows={9} value={card.sample} onChange={(e) => set("sample", e.target.value)} /></Field><Field label="作者注标题" hint="对应 XML 作者的话标题"><input value={card.authorTitle} onChange={(e) => set("authorTitle", e.target.value)} /></Field><Field label="作者注内容" hint="对应 XML 作者的话"><textarea rows={6} value={card.authorNote} onChange={(e) => set("authorNote", e.target.value)} /></Field></>}
            {step === "xml" && <div className="xml-editor">
              <div className="xml-trust-note"><i>i</i><span><b>已按你提供的可导入文件复刻字段层级与顺序</b><p>标注为“对应 XML”的字段会写入；小剧场和美化是平台加密负载。本站只无损回存本次 XML 导入值，不能把新明文伪装成平台密文。正则不在这个 XML 里。</p></span></div>
              <div className={`xml-readiness ${exactXmlReady ? "ready" : "waiting"}`}><i>{exactXmlReady ? "✓" : "!"}</i><span><b>{exactXmlReady ? `已锁定 ${payloadSource?.file ?? "导入文件"} 的原始负载` : !xmlWithinLimit ? "XML 超过 2 MB 安全上限" : "先导入一份原始 Mufy 角色卡 XML"}</b><p>{exactXmlReady ? "两段负载来自本次导入且未改动；下载将按参考顺序回存。封套结构可核验，可解密性仍以 Mufy 实机为准。" : "手贴或 JSON 恢复的字符串不会解锁完整导出，避免把伪造负载误报为平台可识别内容。"}</p></span></div>
              <div className="field-row"><Field label="XML 版本"><input value="1" readOnly /></Field><Field label="根类型"><input value="single" readOnly /></Field></div>
              <div className="field-row"><Field label="卡片类型"><input value="single" readOnly /></Field><Field label="内容类型"><input value={card.contentType} onChange={(e) => set("contentType", e.target.value)} /></Field></div>
              <Field label="可见性原值" hint="参考文件为 2；完整枚举未公开"><input inputMode="numeric" pattern="[0-9]*" value={card.visibility} onChange={(e) => set("visibility", e.target.value)} /></Field>
              <div className="xml-toggle-grid">
                <label className="work-toggle"><span><b>OC</b><small>原创角色标记</small></span><input type="checkbox" checked={card.oc} onChange={(e) => set("oc", e.target.checked)} /></label>
                <label className="work-toggle"><span><b>AI</b><small>AI 内容标记</small></span><input type="checkbox" checked={card.ai} onChange={(e) => set("ai", e.target.checked)} /></label>
                <label className="work-toggle"><span><b>启用摄像头</b><small>按 XML 原值回写</small></span><input type="checkbox" checked={card.camera} onChange={(e) => set("camera", e.target.checked)} /></label>
              </div>
              <div className="xml-payload-grid"><PayloadStatus label="小剧场加密负载" value={card.theaterPayload} onClear={() => { set("theaterPayload", ""); setPayloadSource(null); }} /><PayloadStatus label="美化样式加密负载" value={card.stylePayload} onClear={() => { set("stylePayload", ""); setPayloadSource(null); }} /></div>
              <details className="xml-payload-details"><summary>查看负载或粘贴草稿值（手贴不会解锁下载）</summary><Field label="小剧场 payload" hint="完整导出只认本次 XML 导入且未改动的 Base64"><textarea rows={3} spellCheck={false} value={card.theaterPayload} onChange={(e) => { set("theaterPayload", e.target.value.trim()); setPayloadSource(null); }} /></Field><Field label="美化样式 payload" hint="不会在本站解密或执行"><textarea rows={3} spellCheck={false} value={card.stylePayload} onChange={(e) => { set("stylePayload", e.target.value.trim()); setPayloadSource(null); }} /></Field></details>
              <pre className="xml-structure-preview">{xmlOutput.slice(0, 1400)}{xmlOutput.length > 1400 ? "\n…（下载文件包含完整内容）" : ""}</pre>
            </div>}
          </div>
          <footer><input ref={importInput} className="card-import-input" type="file" accept=".xml,.json,application/xml,text/xml,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCard(file); event.target.value = ""; }} /><button className="ghost-action" onClick={() => { setCard(defaultCard); setPayloadSource(null); setImportNotice("已恢复示例；加密负载已清空。"); }}>恢复示例</button><button className="ghost-action" onClick={() => importInput.current?.click()}>导入 Mufy XML</button><CopyAction value={xmlOutput} label={exactXmlReady ? "复制严格结构 XML" : "复制结构草稿"} /><button className="workspace-action" onClick={() => saveFile("mufy-card-blueprint.json", JSON.stringify(card, null, 2), "application/json;charset=utf-8")}>JSON 工作稿</button><button className="dark-action" disabled={!exactXmlReady} title={exactXmlReady ? "回存本次导入且未改动的两段负载；请在 Mufy 实机验证" : "请先导入含小剧场与美化负载的原始 Mufy XML"} onClick={() => saveFile(safeCardFilename(card.name), xmlOutput, "application/xml;charset=utf-8")}>{exactXmlReady ? "下载严格结构 XML" : !xmlWithinLimit ? "XML 超过 2 MB" : "等待原始 XML 负载"}</button></footer>
        </section>

        <aside className="card-preview-column">
          <div className="character-preview" style={coverStyle}><div className="portrait-orbit"><i /><i /><i /><span>{card.name.slice(0, 1) || "M"}</span></div><div className="character-copy"><small>CHARACTER / {card.unrestricted ? "UNRESTRICTED" : "STANDARD"}</small><h2>{card.name || "未命名角色"}</h2><p>{card.subtitle || "写下一句让人想点开的介绍。"}</p><div>{splitCardTags(card.tags).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div></div></div>
          <div className="panel blueprint-health"><header><b>导出健康度</b><span>{score}%</span></header><div><i style={{ width: `${score}%` }} /></div><ul><li className={card.cognition.length > 20 ? "done" : ""}>默认认知边界</li><li className={card.adversity.length > 20 ? "done" : ""}>逆境处理</li><li className="done">XML v1 固定结构</li><li className={payloadsUntouched ? "done" : ""}>导入负载保持原文</li></ul></div>
          <div className="panel xml-export-summary"><header><span><small>STRICT CHARACTER XML</small><b>角色卡 XML</b></span><em>v1</em></header><p>固定输出 12 个顶层节点、CDATA 文本与 UTF-8 声明；参考样本已通过逐字节回写核验。</p><div><span><i />建卡主体</span><b>已生成</b></div><div><span><i className={theaterPayloadState} />小剧场</span><b>{theaterPayloadState === "preserved" ? payloadsUntouched ? "导入原文" : "仅结构匹配" : theaterPayloadState === "empty" ? "未附加" : "结构异常"}</b></div><div><span><i className={stylePayloadState} />美化</span><b>{stylePayloadState === "preserved" ? payloadsUntouched ? "导入原文" : "仅结构匹配" : stylePayloadState === "empty" ? "未附加" : "结构异常"}</b></div></div>
        </aside>
      </div>
    </section>
  </section>;
}

type BeautifyModule = "background" | "header" | "messages" | "composer" | "author" | "status" | "code";
type BeautyTheme = {
  name: string;
  sub: string;
  background: string;
  surface: string;
  accent: string;
  ink: string;
  muted: string;
  reference?: boolean;
};

const beautyThemes: BeautyTheme[] = [
  { name: "午夜放映厅", sub: "金色电影感", background: "#111015", surface: "#242029", accent: "#e9c77b", ink: "#fffaf0", muted: "#aaa0ad" },
  { name: "夜航信号", sub: "紫色霓虹", background: "#171225", surface: "#2c2042", accent: "#c8ff5a", ink: "#faf7ff", muted: "#aaa0bc" },
  { name: "雾港来信", sub: "冷蓝玻璃", background: "#071d2b", surface: "#10384c", accent: "#65e5ff", ink: "#effcff", muted: "#8eb7c4" },
  { name: "旧纸手记", sub: "柔和纸张", background: "#e9e4d5", surface: "#fbf7ea", accent: "#687a3d", ink: "#2c2d20", muted: "#777664" },
  { name: "King 暗墨血红", sub: "用户参考源码", background: "#06060c", surface: "#141224", accent: "#ff4d6d", ink: "#e8e8f5", muted: "#8888a8", reference: true },
];

const beautyModules: Record<BeautifyModule, { name: string; sub: string; icon: string }> = {
  background: { name: "背景与遮罩", sub: "整页底图、暗角和层次", icon: "◫" },
  header: { name: "聊天标题栏", sub: "标题、返回与顶部控制", icon: "⌁" },
  messages: { name: "消息与正文", sub: "AI 气泡、重点与叙事", icon: "✦" },
  composer: { name: "输入与按钮", sub: "底部输入框和操作区", icon: "⌨" },
  author: { name: "作者注", sub: "说明卡与章节注记", icon: "¶" },
  status: { name: "状态组件", sub: "details、summary 与列表", icon: "▤" },
  code: { name: "代码与强调", sub: "代码块、mark 和高亮", icon: "</>" },
};

function beautyCss(theme: BeautyTheme, settings: { radius: number; blur: number; overlay: number; font: number; image: string; modules: Record<BeautifyModule, boolean> }) {
  const { radius, blur, overlay, font, modules } = settings;
  const image = settings.image.trim().replace(/["\\\n\r)]/g, "");
  const blocks = [
    `/* Mufy Studio · ${theme.name}\n   全局美化只改聊天页面外观，不负责正则匹配或剧情状态。 */\n:root{\n  --ms-bg:${theme.background};--ms-surface:${theme.surface};--ms-accent:${theme.accent};\n  --ms-ink:${theme.ink};--ms-muted:${theme.muted};--ms-radius:${radius}px;--ms-blur:${blur}px;\n}\nimg[src='/chat-star.png']{display:none!important;}`,
    modules.background ? `#mufy_background_image{${image ? `background-image:url("${image}")!important;` : ""}background-color:var(--ms-bg)!important;background-size:cover!important;background-position:center!important;}\n#mufy_background_overlay{background:linear-gradient(180deg,rgba(8,7,11,${Math.max(0, overlay - .18)}),rgba(8,7,11,${overlay}))!important;backdrop-filter:blur(${Math.round(blur / 4)}px);}` : "",
    modules.header ? `#mufy_chat_header{margin:10px!important;border:1px solid color-mix(in srgb,var(--ms-ink) 14%,transparent)!important;border-radius:calc(var(--ms-radius) + 2px)!important;background:color-mix(in srgb,var(--ms-surface) 82%,transparent)!important;color:var(--ms-ink)!important;backdrop-filter:blur(var(--ms-blur));box-shadow:0 16px 42px rgba(0,0,0,.18)!important;}\n#mufy_back_button{border-radius:50%!important;background:color-mix(in srgb,var(--ms-accent) 16%,transparent)!important;color:var(--ms-accent)!important;}` : "",
    modules.messages ? `.mufy_ai_message_bubble{font-size:${font}px!important;line-height:1.86!important;color:var(--ms-ink)!important;background:color-mix(in srgb,var(--ms-surface) 84%,transparent)!important;border:1px solid color-mix(in srgb,var(--ms-ink) 11%,transparent)!important;border-radius:var(--ms-radius)!important;box-shadow:0 16px 45px rgba(0,0,0,.14)!important;backdrop-filter:blur(var(--ms-blur));}\n.mufy_emphasis_text{color:var(--ms-accent)!important;font-weight:780!important;text-shadow:0 0 22px color-mix(in srgb,var(--ms-accent) 35%,transparent);}\n.mufy_message_actions{opacity:.62;transition:opacity .2s ease}.mufy_message_actions:hover{opacity:1}` : "",
    modules.composer ? `#mufy_chat_input_container{margin:10px!important;padding:8px!important;border:1px solid color-mix(in srgb,var(--ms-ink) 13%,transparent)!important;border-radius:calc(var(--ms-radius) + 5px)!important;background:color-mix(in srgb,var(--ms-surface) 88%,transparent)!important;backdrop-filter:blur(var(--ms-blur));box-shadow:0 18px 48px rgba(0,0,0,.22)!important;}\n#mufy_chat_input_box,#mufy_chat_input_box textarea{color:var(--ms-ink)!important;background:transparent!important;}\n#mufy_chat_input_container button{color:var(--ms-accent)!important;border-radius:12px!important;}` : "",
    modules.author ? `.mufy_author_note{padding:16px!important;border-left:3px solid var(--ms-accent)!important;border-radius:4px var(--ms-radius) var(--ms-radius) 4px!important;background:color-mix(in srgb,var(--ms-surface) 88%,transparent)!important;color:var(--ms-muted)!important;}` : "",
    modules.status ? `.mufy_ai_message_bubble details{margin:14px 0!important;border:1px solid color-mix(in srgb,var(--ms-accent) 25%,transparent)!important;border-radius:var(--ms-radius)!important;background:color-mix(in srgb,var(--ms-bg) 48%,transparent)!important;overflow:hidden}.mufy_ai_message_bubble details summary{padding:13px 15px!important;color:var(--ms-accent)!important;cursor:pointer!important;font-weight:760!important}.mufy_ai_message_bubble details li{margin:8px 14px!important;color:var(--ms-muted)!important;}` : "",
    modules.code ? `.mufy_code_block{border-radius:calc(var(--ms-radius) - 5px)!important;background:color-mix(in srgb,var(--ms-bg) 88%,#000 12%)!important;color:var(--ms-ink)!important;border:1px solid color-mix(in srgb,var(--ms-accent) 20%,transparent)!important;}\n.mufy_ai_message_bubble mark{padding:1px 6px;border-radius:6px;background:color-mix(in srgb,var(--ms-accent) 24%,transparent);color:var(--ms-ink);}` : "",
  ];
  return blocks.filter(Boolean).join("\n\n");
}

export function BeautifyStudio() {
  const [themeIndex, setThemeIndex] = useState(0);
  const [radius, setRadius] = useState(22);
  const [blur, setBlur] = useState(18);
  const [overlay, setOverlay] = useState(.68);
  const [font, setFont] = useState(15);
  const [image, setImage] = useState("");
  const [modules, setModules] = useState<Record<BeautifyModule, boolean>>({ background: true, header: true, messages: true, composer: true, author: true, status: true, code: true });
  const [codeOpen, setCodeOpen] = useState(true);
  const theme = beautyThemes[themeIndex];
  const generatedCss = useMemo(() => beautyCss(theme, { radius, blur, overlay, font, image, modules }), [theme, radius, blur, overlay, font, image, modules]);
  const css = theme.reference ? kingBeautyCss : generatedCss;
  const previewStyle = { "--beauty-bg": theme.background, "--beauty-surface": theme.surface, "--beauty-accent": theme.accent, "--beauty-ink": theme.ink, "--beauty-muted": theme.muted, "--beauty-radius": `${radius}px`, "--beauty-blur": `${blur}px`, "--beauty-overlay": overlay, "--beauty-font": `${font}px`, ...(image ? { "--beauty-image": `url(${JSON.stringify(image)})` } : {}) } as CSSProperties;

  function toggleModule(key: BeautifyModule) { setModules((old) => ({ ...old, [key]: !old[key] })); }

  return <section className="creator-workspace beauty-workspace">
    <aside className="work-rail panel beauty-rail">
      <header><span><small>全局美化</small><b>选择要接管的界面</b></span><strong>{Object.values(modules).filter(Boolean).length}/7</strong></header>
      <div className="module-list">{(Object.keys(beautyModules) as BeautifyModule[]).map((item) => <button key={item} className={modules[item] ? "active" : ""} onClick={() => toggleModule(item)}><i>{beautyModules[item].icon}</i><span><b>{beautyModules[item].name}</b><small>{beautyModules[item].sub}</small></span><em>{modules[item] ? "✓" : "+"}</em></button>)}</div>
      <div className="rail-note distinction"><b>它不经过正则</b><p>全局美化直接作用于 Mufy 聊天页面已有选择器；它改变“壳”，不识别 AI 输出。</p></div>
    </aside>

    <section className="work-main">
      <header className="work-hero"><div><small>02 / GLOBAL BEAUTIFICATION</small><h1>先定整页气质，<br /><em>再设计每一条消息。</em></h1></div><div className="capability-row"><Capability tone="live">本页实时预览</Capability><Capability tone="portable">导出 Mufy CSS</Capability></div></header>
      <div className="beauty-builder">
        <section className="panel beauty-controls">
          <header><span><small>STYLE SYSTEM</small><b>主题与材质</b></span><button onClick={() => { setThemeIndex(0); setRadius(22); setBlur(18); setOverlay(.68); }}>重置</button></header>
          <div className="theme-grid">{beautyThemes.map((item, index) => <button key={item.name} className={themeIndex === index ? "active" : ""} onClick={() => setThemeIndex(index)}><span><i style={{ background: item.background }} /><i style={{ background: item.surface }} /><i style={{ background: item.accent }} /></span><b>{item.name}</b><small>{item.sub}</small></button>)}</div>
          {theme.reference && <div className="reference-source-note"><b>已载入你提供的 King 美化源码</b><p>代码原样作为独立美化模板输出；它不会被当成正则，也不会伪装写入角色卡的加密字段。</p></div>}
          <Field label="背景图片 URL" hint="留空使用主题渐变"><input placeholder="https://…" value={image} onChange={(e) => setImage(e.target.value)} /></Field>
          <div className="slider-list">
            <label><span>圆角 <b>{radius}px</b></span><input type="range" min="8" max="36" value={radius} onChange={(e) => setRadius(Number(e.target.value))} /></label>
            <label><span>玻璃模糊 <b>{blur}px</b></span><input type="range" min="0" max="30" value={blur} onChange={(e) => setBlur(Number(e.target.value))} /></label>
            <label><span>遮罩浓度 <b>{Math.round(overlay * 100)}%</b></span><input type="range" min="20" max="90" value={overlay * 100} onChange={(e) => setOverlay(Number(e.target.value) / 100)} /></label>
            <label><span>正文字号 <b>{font}px</b></span><input type="range" min="13" max="19" value={font} onChange={(e) => setFont(Number(e.target.value))} /></label>
          </div>
        </section>

        <section className="beauty-preview-wrap">
          <div className="beauty-preview" style={previewStyle}>
            <div className="beauty-bg" /><div className="beauty-overlay" />
            {modules.header && <header className="beauty-header"><button>‹</button><span><b>午夜来电</b><small>许知遥 · 在线</small></span><div><i /><i /></div></header>}
            <div className="beauty-messages">
              <small className="beauty-time">AUG 17 · 00:07</small>
              {modules.messages && <><article className="beauty-narration">雨滴沿着玻璃缓慢下坠，红色线路灯在沉默里亮了起来。</article><article className="beauty-bubble"><small>许知遥</small><p>“你终于接电话了。”她的声音很轻，背景里传来一声遥远的列车鸣笛。</p><strong className="beauty-emphasis">别回头，至少在我数到七以前。</strong></article></>}
              {modules.author && <aside className="beauty-author"><b>作者注 · 声音线索</b><p>耳机里偶尔出现的电流声不是故障。</p></aside>}
              {modules.status && <details className="beauty-status" open><summary>SCENE SIGNAL <span>00:07 / 临港电台</span></summary><ul><li>天气：暴雨</li><li>线路：未知来电已接通</li></ul></details>}
              {modules.code && <code className="beauty-code">&lt;RadioSignal&gt;CONNECTED&lt;/RadioSignal&gt;</code>}
            </div>
            {modules.composer && <footer className="beauty-composer"><button>＋</button><span>输入回复或行动…</span><button className="send">↑</button></footer>}
          </div>
          <footer className="preview-legend"><span><i className="live" />当前 CSS 实时映射</span><small>预览模拟官方选择器，实际页面仍可能受版本影响</small></footer>
        </section>

        <section className={`panel beauty-code-panel ${codeOpen ? "open" : ""}`}>
          <header><span><small>OUTPUT</small><b>{theme.reference ? "King 全局美化源码" : "全局美化 CSS"}</b></span><div><button onClick={() => setCodeOpen((old) => !old)}>{codeOpen ? "收起" : "展开"}</button><CopyAction value={css} label="复制 CSS" /><button className="dark-action" onClick={() => saveFile(theme.reference ? "mufy-king-global-beauty.css" : "mufy-global-beauty.css", css, "text/css;charset=utf-8")}>下载 .css</button></div></header>
          {codeOpen && <pre>{css}</pre>}
          <footer><span>{theme.reference ? "参考源码原样保留 · 需在当前 Mufy 页面实测选择器" : "使用官方页面选择器"}</span><span>未包含脚本 · 不依赖正则</span></footer>
        </section>
      </div>
    </section>
  </section>;
}

const theaterModules: Record<TheaterModule, { name: string; sub: string; icon: string; portable: boolean }> = {
  scene: { name: "剧情舞台", sub: "正文、段落与分支", icon: "✦", portable: true },
  profile: { name: "角色资料", sub: "身份、状态与关系", icon: "◎", portable: true },
  status: { name: "人物状态", sub: "穿搭、动作、心情与数值", icon: "◉", portable: true },
  kingStatus: { name: "King 快捷状态", sub: "任务、武器、赌约与心情", icon: "K", portable: true },
  gallery: { name: "媒体图廊", sub: "画廊切换与场景照", icon: "▧", portable: false },
  inventory: { name: "物品展柜", sub: "选中、查看与本地操作", icon: "◇", portable: false },
  phone: { name: "手机摘要", sub: "热搜、相册、备忘与推送", icon: "▣", portable: true },
  group: { name: "多人聊天室", sub: "多角色气泡与回复", icon: "❞", portable: false },
  forum: { name: "剧内论坛", sub: "帖子、评论与 AU 脑洞", icon: "#", portable: true },
  news: { name: "实时短讯", sub: "事件、警报与数据流", icon: "⌁", portable: true },
  memory: { name: "长短记忆", sub: "S-T / L-T MEMORY", icon: "⌘", portable: true },
  tools: { name: "互动工具坞", sub: "音乐、表情包与指令", icon: "⌗", portable: false },
};

const defaultTheater: TheaterCopy = {
  title: "雨停之前",
  subtitle: "CHAPTER 07 · 最后一班车",
  narration: "红色线路灯亮起时，许知遥的声音从旧式耳机里传来。她说，南岸车站的钟比整座城市慢了七分钟。",
  choiceA: "接通备用线路",
  choiceB: "先检查窗外站台",
  location: "临港电台 · B 直播间",
};

function theaterPrompt(copy: TheaterCopy, included: Record<TheaterModule, boolean>) {
  const modules = (Object.keys(included) as TheaterModule[]).filter((key) => included[key]).map((key) => theaterModules[key].name).join("、");
  return `【小剧场场景包】\n标题：${copy.title}\n章节：${copy.subtitle}\n地点：${copy.location}\n\n场景：${copy.narration}\n\n可用模块：${modules}\n玩家选择：\nA. ${copy.choiceA}\nB. ${copy.choiceB}\n\n运行规则：\n- 小剧场是剧情与状态编排，不是正则规则。\n- 需要样式化模块时，严格输出对应英文 XML，再交由独立正则渲染。\n- 每轮只推进一个可观察事件，并保留玩家决定权。\n- 不要声称浏览器按钮已在 Mufy 中持久改变状态。`;
}

function ModuleScene({ copy, act, onChoose }: { copy: TheaterCopy; act: number; onChoose: (choice: string) => void }) {
  return <section className="theater-scene-module"><small>{copy.subtitle}</small><h2>{act === 1 ? copy.title : act === 2 ? "备用线路已接通" : "列车正在进站"}</h2><i /><p>{act === 1 ? copy.narration : act === 2 ? "耳机里的杂音忽然停止。一个不属于许知遥的声音，准确说出了你的名字。" : "站台尽头亮起两盏相隔七分钟的车灯，广播却仍在重复同一段报时。"}</p><div className="scene-choices"><button onClick={() => onChoose(copy.choiceA)}><b>A</b><span>{copy.choiceA}</span><em>→</em></button><button onClick={() => onChoose(copy.choiceB)}><b>B</b><span>{copy.choiceB}</span><em>→</em></button></div></section>;
}

function ModuleProfile() {
  const [index, setIndex] = useState(0);
  const facts = [
    { title: "夜间电台主持", line: "声音档案 / 失踪记录 / 七分钟时差" },
    { title: "南岸列车乘客", line: "十年前的车票仍夹在证件页里" },
    { title: "匿名来信者", line: "与你交换过三封没有寄件地址的信" },
  ];
  return <section className="theater-profile"><div className={`profile-portrait portrait-${index}`}><span>XZ</span><button onClick={() => setIndex((index + 2) % 3)}>‹</button><button onClick={() => setIndex((index + 1) % 3)}>›</button></div><div><small>CHARACTER FILE · {index + 1}/3</small><h3>许知遥</h3><b>{facts[index].title}</b><p>{facts[index].line}</p><dl><div><dt>关系</dt><dd>试探期 · 72</dd></div><div><dt>状态</dt><dd>通话中</dd></div></dl></div></section>;
}

function ModuleStatus({ day, onDay }: { day: number; onDay: (day: number) => void }) {
  const item = theaterStatusRecords[day];
  return <section className="theater-status"><header><span><small>CHARACTER STATUS</small><h3>许知遥</h3></span><div>{theaterStatusRecords.map((record, index) => <button key={record.date} className={day === index ? "active" : ""} onClick={() => onDay(index)}>{record.date}</button>)}</div></header><div className="status-dashboard"><article><small>OOTD</small><b>{item.outfit}</b><i>◌</i></article><article><small>MOOD</small><b>{item.mood}</b><i>☂</i></article><article className="wide"><small>CURRENT ACTION</small><b>{item.action}</b><i>→</i></article><article className="score"><small>追夫值</small><strong>{item.score}<em>/100</em></strong><div><i style={{ width: `${Number(item.score)}%` }} /></div></article><article className="wide thought"><small>INNER VOICE</small><p>“{theaterStatusThought}”</p></article></div></section>;
}

function ModuleKingStatus() {
  const [mood, setMood] = useState("炸毛");
  const moods = ["炸毛", "小哭包", "被撩"];
  return <section className="king-status-preview"><div className="king-status-card"><header><span><small>墨影集团 · STATUS FEED</small><b>King 快捷状态</b></span><svg viewBox="0 0 120 120" width="72" height="72" aria-label="King 徽记"><defs><radialGradient id="king-preview-gradient" cx="60" cy="60" r="50"><stop offset="0%" stopColor="#ff8aa3" /><stop offset="60%" stopColor="#ff4d6d" /><stop offset="100%" stopColor="#06060c" /></radialGradient></defs><circle cx="60" cy="60" r="56" fill="url(#king-preview-gradient)" opacity=".85" /><circle cx="60" cy="60" r="35" fill="none" stroke="#ff8aa3" strokeWidth="1.5" /><circle cx="60" cy="60" r="3" fill="#ff8aa3" /><text x="60" y="65" textAnchor="middle" fontFamily="monospace" fontSize="14" fill="#fff" fontWeight="700">K</text></svg></header><div className="king-row"><span>任务</span><b>已完成 23 / 24</b><i><em /></i></div><div className="king-row"><span>武器</span><b>夜枭 + King-I 在线</b></div><div className="king-row"><span>赌约</span><b>本轮 King 对 鲨鱼</b><strong>0 : 7</strong></div><div className="king-row"><span>旧伤</span><b>左肩锁骨 · 阴天疼</b></div><div className="king-moods"><span>心情</span>{moods.map((item) => <button key={item} className={mood === item ? "active" : ""} onClick={() => setMood(item)}>{item}</button>)}</div><footer><i />当前选择：{mood} · 本页按钮可真实切换</footer></div></section>;
}

function ModuleGallery() {
  const [active, setActive] = useState(0);
  const shots = ["南岸站台 · 00:14", "直播间红灯 · 00:07", "旧车票背面 · 未知"];
  return <section className="theater-gallery"><div className={`gallery-shot shot-${active}`}><small>FRAME 0{active + 1}</small><span>{active === 0 ? "▥" : active === 1 ? "◉" : "⌁"}</span><p>{shots[active]}</p></div><div>{shots.map((shot, index) => <button key={shot} className={active === index ? "active" : ""} onClick={() => setActive(index)}><i>0{index + 1}</i><span>{shot}</span></button>)}</div></section>;
}

function ModuleInventory() {
  const [selected, setSelected] = useState(0);
  const [action, setAction] = useState("尚未操作");
  const items = [
    { icon: "🎫", name: "残缺车票", type: "关键道具", description: "票面终点被水渍模糊，背面有一串比报站晚七分钟的时间。", actions: ["翻到背面", "加入线索"] },
    { icon: "📼", name: "旧录音带", type: "声音档案", description: "标签只写了 00:07。倒放时，能听见一段不存在的站名。", actions: ["试听片段", "交给许知遥"] },
    { icon: "🗝️", name: "B 室钥匙", type: "场景权限", description: "齿痕已经磨平一半，却仍能打开直播间最里面的铁柜。", actions: ["查看刻字", "尝试开锁"] },
    { icon: "📻", name: "袖珍收音机", type: "互动工具", description: "只能收到 FM 97.3；旋钮拨过零点时会自己回弹。", actions: ["调整频率", "贴近窗户"] },
    { icon: "☕", name: "第二杯咖啡", type: "关系物品", description: "已经凉了。杯套上是许知遥熟悉却故意写错的名字。", actions: ["递给她", "保留"] },
    { icon: "✉️", name: "第三封来信", type: "人物档案", description: "邮戳日期仍在明天，信纸边缘留有临港电台的水印。", actions: ["拆开", "对照笔迹"] },
  ];
  const item = items[selected];
  return <section className="theater-inventory"><div className="inventory-shelf">{items.map((entry, index) => <button key={entry.name} className={selected === index ? "active" : ""} onClick={() => { setSelected(index); setAction("尚未操作"); }}><i>{entry.icon}</i><span>{entry.name}</span></button>)}</div><div className="inventory-detail"><small>ITEM 0{selected + 1} / {item.type}</small><i>{item.icon}</i><h3>{item.name}</h3><p>{item.description}</p><div>{item.actions.map((label) => <button key={label} onClick={() => setAction(`已选择：${label}`)}>{label}<span>→</span></button>)}</div><em>{action} · 仅本地模拟，不会改动 Mufy 物品状态</em></div></section>;
}

function ModulePhone() {
  const [tab, setTab] = useState<"trend" | "album" | "memo" | "push">("trend");
  const labels = { trend: "热搜", album: "相册", memo: "备忘", push: "推送" };
  return <section className="theater-phone"><header><span><small>00:17</small><b>手机小摘要</b></span><i>72%</i></header><nav>{(Object.keys(labels) as (keyof typeof labels)[]).map((key) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{labels[key]}</button>)}</nav>{tab === "trend" && <div className="phone-feed"><article><b># 南岸车站神秘灯光 #</b><small>临港 · 7.2w</small></article><article><b># 午夜电台空号来电 #</b><small>本地 · 4.8w</small></article></div>}{tab === "album" && <div className="deleted-grid"><span>已删除 27 天</span><span>已删除 12 天</span><span>刚刚删除</span></div>}{tab === "memo" && <div className="memo-paper"><small>备忘录 · 置顶</small><p>不要在零点七分之后说出完整的站名。</p></div>}{tab === "push" && <div className="push-list"><article><i>♫</i><span><b>网易云音乐</b><small>After the Rain · 正在播放</small></span></article><article><i>!</i><span><b>临港交通</b><small>南岸线临时恢复运行</small></span></article></div>}</section>;
}

function ModuleGroup({ messages, onSend }: { messages: string[]; onSend: (value: string) => void }) {
  const [value, setValue] = useState("");
  return <section className="theater-group"><header><span><b>南岸夜行组</b><small>4 人在线</small></span><i /><i /><i /></header><div className="group-chat"><article className="left"><b>林雾</b><p>你们有没有听见第二遍报站？</p></article><article className="right"><b>许知遥</b><p>别在群里打出车站全名。</p></article>{messages.map((message, index) => <article className="user" key={`${message}-${index}`}><b>你</b><p>{message}</p></article>)}</div><footer><input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) { onSend(value.trim()); setValue(""); } }} placeholder="输入一条本地模拟消息…" /><button onClick={() => { if (value.trim()) { onSend(value.trim()); setValue(""); } }}>发送</button></footer></section>;
}

function ModuleForum() {
  const [tab, setTab] = useState<"forum" | "comments" | "au">("forum");
  const [likes, setLikes] = useState<Record<number, number>>({ 0: 217, 1: 84, 2: 33 });
  const posts = tab === "forum" ? ["有人也在 00:07 收到南岸线报站吗？", "十年前末班车的乘客名单为什么少了一页", "直播间窗外的灯不是列车，是倒影"] : tab === "comments" ? ["楼主别再调到 97.3 了，真的。", "我把录音降噪后听见了两个人的名字。", "第七分钟时把耳机摘下来。​"] : ["AU｜如果末班车从未停运", "番外｜许知遥的第三封匿名信", "脑洞｜所有人都记得不存在的明天"];
  return <section className="theater-forum"><header><span><small>INSIDE FORUM</small><b>临港夜话</b></span><nav><button className={tab === "forum" ? "active" : ""} onClick={() => setTab("forum")}>论坛</button><button className={tab === "comments" ? "active" : ""} onClick={() => setTab("comments")}>评论</button><button className={tab === "au" ? "active" : ""} onClick={() => setTab("au")}>AU / 番外</button></nav></header><div>{posts.map((post, index) => <article key={post}><span><small>0{index + 1} · {index === 0 ? "置顶" : "刚刚"}</small><h3>{post}</h3><p>{tab === "au" ? "这是剧内延展灵感，不会自动写入当前主线。" : "来自剧中角色与 NPC 的虚构内容，由场景设定驱动。"}</p></span><button onClick={() => setLikes((old) => ({ ...old, [index]: (old[index] || 0) + 1 }))}>♡ {likes[index] || 0}</button></article>)}</div><footer>剧情资讯 · 非真实联网论坛</footer></section>;
}

function ModuleNews() {
  const [selected, setSelected] = useState(0);
  const news = [
    ["交通警报", "南岸线在停运十年后出现短暂供电", "00:19"],
    ["天气记录", "临港北岸雨量计连续七分钟归零", "00:16"],
    ["频率异常", "FM 97.3 收到来自未来时刻的报站", "00:07"],
  ];
  return <section className="theater-news"><header><span>LIVE BULLETIN</span><i>REC</i></header><div>{news.map((item, index) => <button key={item[0]} className={selected === index ? "active" : ""} onClick={() => setSelected(index)}><small>{item[2]}</small><b>{item[0]}</b><p>{item[1]}</p><em>0{index + 1}</em></button>)}</div><footer><span>DATA STREAM</span><i /><i /><i /><i /></footer></section>;
}

function ModuleMemory() {
  const [long, setLong] = useState(false);
  return <section className="theater-memory"><header><span><small>MEMORY NOTEBOOK</small><b>{long ? "L-T-MEMORY" : "S-T-MEMORY"}</b></span><button onClick={() => setLong((old) => !old)}>{long ? "查看短期" : "查看长期"}</button></header>{long ? <div><article><small>10 YEARS AGO</small><h4>失踪的末班车</h4><p>许知遥是当晚唯一留下有效录音的人，但档案里没有她的乘车记录。</p></article><article><small>3 LETTERS</small><h4>匿名来信</h4><p>每封信的邮戳都比收到日期晚七分钟。</p></article></div> : <div><article><small>00:07 · NEW</small><h4>未知来电</h4><p>线路另一端能听见已经停运的南岸线报站。</p></article><article><small>00:14 · UPDATED</small><h4>窗外灯光</h4><p>站台方向出现两盏缓慢靠近的车灯。</p></article></div>}</section>;
}

function ModuleTools({ onSticker }: { onSticker: (value: string) => void }) {
  const [tab, setTab] = useState<"music" | "stickers" | "commands">("stickers");
  const [playing, setPlaying] = useState(true);
  const stickers = ["🌧️", "📻", "🚉", "🎫", "🕯️", "🫧", "🦋", "🌙", "🪞", "📼", "🗝️", "☕"];
  return <section className="theater-tools"><nav><button className={tab === "music" ? "active" : ""} onClick={() => setTab("music")}>音乐</button><button className={tab === "stickers" ? "active" : ""} onClick={() => setTab("stickers")}>表情包</button><button className={tab === "commands" ? "active" : ""} onClick={() => setTab("commands")}>指令</button></nav>{tab === "music" && <div className="tool-music"><button className={playing ? "playing" : ""} onClick={() => setPlaying((old) => !old)}>♫</button><span><small>NOW PLAYING</small><b>After the Rain</b><em>Northbound · 01:42</em></span><button onClick={() => setPlaying((old) => !old)}>{playing ? "Ⅱ" : "▶"}</button></div>}{tab === "stickers" && <div className="sticker-grid">{stickers.map((sticker) => <button key={sticker} onClick={() => onSticker(sticker)}>{sticker}</button>)}</div>}{tab === "commands" && <div className="command-list">{["查看当前状态", "整理线索", "回顾长期记忆", "打开角色档案"].map((command) => <button key={command} onClick={() => onSticker(`/${command}`)}><code>/</code>{command}<span>＋</span></button>)}</div>}</section>;
}

export function TheaterStudio() {
  const [module, setModule] = useState<TheaterModule>("scene");
  const [included, setIncluded] = useState<Record<TheaterModule, boolean>>({ scene: true, profile: true, status: true, kingStatus: true, gallery: true, inventory: true, phone: true, group: true, forum: true, news: true, memory: true, tools: true });
  const [copy, setCopy] = useState<TheaterCopy>(defaultTheater);
  const [act, setAct] = useState(1);
  const [events, setEvents] = useState<string[]>(["00:07 · 未知来电接通"]);
  const [messages, setMessages] = useState<string[]>([]);
  const [statusDay, setStatusDay] = useState(0);
  const [view, setView] = useState<"simulator" | "package">("simulator");
  const prompt = useMemo(() => theaterPrompt(copy, included), [copy, included]);
  const portableDocument = useMemo(() => createTheaterPortableDocument(module, copy, statusDay), [module, copy, statusDay]);
  const portableSource = useMemo(() => mufyReplacement(portableDocument), [portableDocument]);
  const portablePreview = useMemo(() => previewMufyReplacement(portableSource), [portableSource]);
  const set = <K extends keyof TheaterCopy>(key: K, value: TheaterCopy[K]) => setCopy((old) => ({ ...old, [key]: value }));

  function choose(choice: string) {
    setAct((old) => Math.min(3, old + 1));
    setEvents((old) => [...old.slice(-3), `${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} · 选择：${choice}`]);
  }
  function addMessage(value: string) { setMessages((old) => [...old.slice(-3), value]); setEvents((old) => [...old.slice(-3), `群聊发送：${value}`]); }
  function reset() { setAct(1); setEvents(["00:07 · 未知来电接通"]); setMessages([]); setStatusDay(0); }

  let content: ReactNode;
  if (module === "profile") content = <ModuleProfile />;
  else if (module === "status") content = <ModuleStatus day={statusDay} onDay={setStatusDay} />;
  else if (module === "kingStatus") content = <ModuleKingStatus />;
  else if (module === "gallery") content = <ModuleGallery />;
  else if (module === "inventory") content = <ModuleInventory />;
  else if (module === "phone") content = <ModulePhone />;
  else if (module === "group") content = <ModuleGroup messages={messages} onSend={addMessage} />;
  else if (module === "forum") content = <ModuleForum />;
  else if (module === "news") content = <ModuleNews />;
  else if (module === "memory") content = <ModuleMemory />;
  else if (module === "tools") content = <ModuleTools onSticker={addMessage} />;
  else content = <ModuleScene copy={copy} act={act} onChoose={choose} />;

  return <section className="creator-workspace theater-workspace">
    <aside className="work-rail panel theater-rail">
      <header><span><small>小剧场</small><b>场景模块编排</b></span><strong>{Object.values(included).filter(Boolean).length}</strong></header>
      <div className="theater-module-list">{(Object.keys(theaterModules) as TheaterModule[]).map((item) => <div key={item} className={`${module === item ? "active" : ""} ${included[item] ? "included" : ""}`}><button onClick={() => setModule(item)}><i>{theaterModules[item].icon}</i><span><b>{theaterModules[item].name}</b><small>{theaterModules[item].sub}</small></span></button><button aria-label={`${included[item] ? "移除" : "加入"}${theaterModules[item].name}`} onClick={() => setIncluded((old) => ({ ...old, [item]: !old[item] }))}>{included[item] ? "✓" : "+"}</button></div>)}</div>
      <div className="rail-note distinction"><b>小剧场 ≠ 正则</b><p>小剧场负责剧情、回合、选择与记忆；正则只负责把它输出的结构化文本渲染成组件。</p></div>
    </aside>

    <section className="work-main theater-main">
      <header className="work-hero"><div><small>03 / INTERACTIVE THEATER</small><h1>把剧情做成一个<br /><em>可以点击、推进、回看的舞台。</em></h1></div><div className="capability-row"><Capability tone="live">本页真实互动</Capability><Capability tone="portable">静态快照可移植</Capability><Capability tone="host">持续状态需宿主</Capability></div></header>
      <nav className="theater-view-switch"><button className={view === "simulator" ? "active" : ""} onClick={() => setView("simulator")}>互动模拟器</button><button className={view === "package" ? "active" : ""} onClick={() => setView("package")}>导出与边界</button><span>{theaterModules[module].name}</span></nav>

      {view === "simulator" ? <div className="theater-grid">
        <section className="theater-stage">
          <div className="theater-backdrop"><i /><i /><i /></div>
          <header><button>‹</button><span><b>{copy.title}</b><small>{copy.location}</small></span><div><button onClick={() => setModule("tools")}>⌗</button><button onClick={() => setModule("profile")}>◎</button></div></header>
          <div className="theater-runtime">{content}</div>
          <footer><button onClick={() => setModule("gallery")}>＋</button><span>本地运行时 · ACT {act}/3</span><button onClick={() => setModule("tools")}>⌘</button><button className="theater-send" onClick={() => setModule("scene")}>↑</button></footer>
        </section>

        <aside className="panel theater-inspector">
          <header><span><small>SCENE CONTROL</small><b>内容与运行状态</b></span><button onClick={reset}>重置回合</button></header>
          <div className="theater-fields"><Field label="场景标题"><input value={copy.title} onChange={(e) => set("title", e.target.value)} /></Field><Field label="章节标记"><input value={copy.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></Field><Field label="地点"><input value={copy.location} onChange={(e) => set("location", e.target.value)} /></Field><Field label="场景正文"><textarea rows={6} value={copy.narration} onChange={(e) => set("narration", e.target.value)} /></Field><div className="field-row"><Field label="选择 A"><input value={copy.choiceA} onChange={(e) => set("choiceA", e.target.value)} /></Field><Field label="选择 B"><input value={copy.choiceB} onChange={(e) => set("choiceB", e.target.value)} /></Field></div></div>
          <div className="event-log"><header><b>本轮事件</b><span>{events.length}</span></header>{events.map((event, index) => <p key={`${event}-${index}`}><i />{event}</p>)}</div>
        </aside>
      </div> : <div className="theater-package-grid">
        <section className="panel package-card"><header><span><small>01 / PROMPT PACKAGE</small><b>剧情运行指令</b></span><Capability tone="portable">可复制到设定</Capability></header><pre>{prompt}</pre><footer><CopyAction value={prompt} label="复制剧情包" /><button className="dark-action" onClick={() => saveFile("mufy-theater-scene.json", JSON.stringify({ version: 1, copy, included }, null, 2), "application/json")}>导出场景 JSON</button></footer></section>
        <section className="panel package-card theater-export-code"><header><span><small>02 / CURRENT MODULE</small><b>{theaterModules[module].name} · 完整代码</b></span><Capability tone="portable">单一 HTML 围栏</Capability></header><pre>{portableSource}</pre><footer><CopyAction value={portableSource} label={`复制${theaterModules[module].name}完整代码`} /></footer></section>
        <section className="panel package-card theater-export-preview"><header><span><small>03 / EXACT OUTPUT PREVIEW</small><b>官网粘贴效果预览</b></span><Capability tone={theaterModules[module].portable ? "portable" : "host"}>{theaterModules[module].portable ? "外观可移植" : "交互需宿主"}</Capability></header><iframe key={`${module}-${statusDay}-${portableSource.length}`} title={`${theaterModules[module].name}官网粘贴效果预览`} sandbox="" srcDoc={portablePreview} /><footer><span>这里直接渲染复制源码，不再使用 React 模拟器代替导出结果</span></footer></section>
        <section className="panel boundary-card"><header><small>04 / CAPABILITY MAP</small><b>什么会真的带到 Mufy？</b></header><div><article><Capability tone="live">Studio 互动原型</Capability><h3>标签切换、画廊、音乐开关、发消息、分支推进</h3><p>这些由本站 React 运行时执行；上方官网效果预览才是实际复制结果。</p></article><article><Capability tone="portable">Mufy 可移植</Capability><h3>当前模块 DOM、命名空间 CSS、完整 HTML 与 CSS 原生交互</h3><p>人物状态的日期切换已改为无 JS 的 radio + CSS；仍应在真实角色卡中复核。</p></article><article><Capability tone="host">需要宿主能力</Capability><h3>跨回合持久状态、自动发送、AI 流式回复、会话记忆</h3><p>官方未公开稳定前端运行 API，不在导出代码里伪造兼容性。</p></article></div></section>
      </div>}
    </section>
  </section>;
}

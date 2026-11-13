"use client";

import { useMemo, useState } from "react";
import {
  buildAssistantRegex,
  MUFY_ASSISTANT_GREETING,
  parseAssistantFields,
} from "./mufy-regex-assistant";
import type { AssistantRuleDraft } from "./mufy-regex-assistant";
import { generatePattern } from "./mufy-regex-pattern";
import { createMufyRegexImportFile, mufyRegexImportFilename } from "./mufy-regex-json";

type AssistantAnswers = {
  componentType: string;
  style: string;
  interaction: string;
  fieldsText: string;
  timing: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (draft: AssistantRuleDraft) => void;
  enabled: boolean;
  visibility: boolean;
  embedded?: boolean;
};

const initialAnswers: AssistantAnswers = {
  componentType: "",
  style: "",
  interaction: "",
  fieldsText: "",
  timing: "",
};

const steps = [
  {
    title: "组件类型",
    prompt: "我们先确认第 1 步：你想创建什么类型的组件？",
    chips: ["状态面板", "新闻播报", "角色对话气泡", "复古数字时钟", "胶带手账便签", "访客留言簿", "航空信封", "像素宠物"],
  },
  {
    title: "风格与交互",
    prompt: "第 2 步：它要是什么视觉风格，并且需要哪些真实交互？",
    chips: ["赛博朋克", "复古报纸", "Y2K 博客", "奶油手账", "像素复古", "清透玻璃", "折叠展开", "多个子页面"],
  },
  {
    title: "动态字段",
    prompt: "第 3 步：列出需要由 AI 每次填写的动态字段，按逗号或换行分隔。",
    chips: ["生命值、金币", "时间、天气、地点、环境描述", "标题、正文、来源、发布时间", "角色名、台词、情绪"],
  },
  {
    title: "输出时机",
    prompt: "第 4 步：这个 XML 应该在对话的什么时机输出？",
    chips: ["每次对话结束时", "角色状态发生变化时", "进入新场景时", "用户主动查询时"],
  },
] as const;

function CopyResult({ value, label = "复制" }: { value: string; label?: string }) {
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

export function RegexAiAssistant({ open, onClose, onApply, enabled, visibility, embedded = false }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AssistantAnswers>(initialAnswers);
  const [result, setResult] = useState<AssistantRuleDraft | null>(null);
  const [error, setError] = useState("");
  const fields = useMemo(() => parseAssistantFields(answers.fieldsText), [answers.fieldsText]);
  const officialImport = useMemo(() => result ? createMufyRegexImportFile({
    name: result.name,
    pattern: generatePattern(result.target, "component"),
    flags: "g",
    replacement: result.replacement,
    enabled,
    visibility,
    target: result.target,
  }) : null, [enabled, result, visibility]);

  if (!open) return null;

  function set<K extends keyof AssistantAnswers>(key: K, value: AssistantAnswers[K]) {
    setAnswers((old) => ({ ...old, [key]: value }));
    setError("");
  }

  function next() {
    if (step === 0 && !answers.componentType.trim()) { setError("请先告诉我组件类型。"); return; }
    if (step === 1 && (!answers.style.trim() || !answers.interaction.trim())) { setError("请同时填写视觉风格与交互方式。"); return; }
    if (step === 2 && fields.length === 0) { setError("至少需要 1 个动态字段。"); return; }
    if (step === 3 && !answers.timing.trim()) { setError("请说明组件的输出时机。"); return; }
    if (step < 3) {
      setStep((old) => old + 1);
      return;
    }
    setResult(buildAssistantRegex({
      componentType: answers.componentType,
      style: answers.style,
      interaction: answers.interaction,
      fields,
      timing: answers.timing,
    }));
    setStep(4);
  }

  function reset() {
    setAnswers(initialAnswers);
    setResult(null);
    setError("");
    setStep(0);
  }

  const completed = [
    answers.componentType,
    `${answers.style}${answers.interaction ? ` · ${answers.interaction}` : ""}`,
    fields.join("、"),
    answers.timing,
  ];

  return <div className={embedded ? "regex-ai-embedded" : "regex-ai-overlay"} role="presentation">
    <aside className="regex-ai-dialog" role={embedded ? "region" : "dialog"} aria-modal={embedded ? undefined : true} aria-label="AI 正则美化组件助手">
      <header>
        <span><i>✦</i><span><small>LOCAL ASSISTANT</small><b>AI 正则美化组件助手</b></span></span>
        <div><em>本地模板推理 · 不联网</em>{!embedded && <button type="button" aria-label="关闭 AI 正则助手" onClick={onClose}>×</button>}</div>
      </header>

      <div className="regex-ai-progress" aria-label="生成进度">
        {steps.map((item, index) => <span key={item.title} className={step === index ? "active" : step > index ? "done" : ""}><i>{step > index ? "✓" : index + 1}</i>{item.title}</span>)}
      </div>

      <div className="regex-ai-layout">
        <section className="regex-ai-chat" aria-label="助手对话">
          <article className="assistant"><b>助手</b><p>{MUFY_ASSISTANT_GREETING}</p></article>
          {completed.slice(0, Math.min(step, 4)).map((value, index) => value && <article className="user" key={`${index}-${value}`}><b>你 · {steps[index].title}</b><p>{value}</p></article>)}
          {step < 4 && <article className="assistant"><b>助手</b><p>{steps[step].prompt}</p></article>}
          {step === 4 && <article className="assistant success"><b>助手</b><p>官网导入包与五项配置已生成。JSON 只包含官网样本中的 7 个字段；变量表、输出设定和美化助手调用语句需要分别使用。</p></article>}
        </section>

        <section className="regex-ai-compose" aria-label="回答与生成结果">
          {step === 0 && <>
            <label><span>组件类型</span><input autoFocus maxLength={80} value={answers.componentType} onChange={(event) => set("componentType", event.target.value)} placeholder="例如：角色状态面板" /></label>
            <div className="regex-ai-chips">{steps[0].chips.map((chip) => <button type="button" key={chip} onClick={() => set("componentType", chip)}>{chip}</button>)}</div>
          </>}
          {step === 1 && <>
            <label><span>视觉风格</span><input autoFocus maxLength={120} value={answers.style} onChange={(event) => set("style", event.target.value)} placeholder="例如：暗黑赛博、霓虹红紫、游戏 UI" /></label>
            <label><span>交互方式</span><input maxLength={120} value={answers.interaction} onChange={(event) => set("interaction", event.target.value)} placeholder="例如：整体折叠，每个字段可展开" /></label>
            <div className="regex-ai-chips">{steps[1].chips.map((chip) => <button type="button" key={chip} onClick={() => /折叠|子页面/.test(chip) ? set("interaction", chip) : set("style", chip)}>{chip}</button>)}</div>
          </>}
          {step === 2 && <>
            <label><span>动态字段 <em>{fields.length}/8</em></span><textarea autoFocus maxLength={500} rows={5} value={answers.fieldsText} onChange={(event) => set("fieldsText", event.target.value)} placeholder="生命值、金币、当前任务、角色心情" /></label>
            <div className="regex-ai-chips wide">{steps[2].chips.map((chip) => <button type="button" key={chip} onClick={() => set("fieldsText", chip)}>{chip}</button>)}</div>
            {parseAssistantFields(answers.fieldsText).length >= 8 && <small className="regex-ai-limit">最多生成 8 个动态字段，超出内容不会写入规则。</small>}
          </>}
          {step === 3 && <>
            <label><span>输出时机</span><textarea autoFocus maxLength={200} rows={4} value={answers.timing} onChange={(event) => set("timing", event.target.value)} placeholder="例如：每次对话结束时；角色状态发生变化时立即更新" /></label>
            <div className="regex-ai-chips">{steps[3].chips.map((chip) => <button type="button" key={chip} onClick={() => set("timing", chip)}>{chip}</button>)}</div>
          </>}

          {step === 4 && result && <div className="regex-ai-results">
            <div className="regex-ai-result-head"><span><small>GENERATION COMPLETE</small><b>官网导入包 + 五项配置</b></span><button type="button" onClick={() => setStep(3)}>返回调整</button></div>
            {officialImport && <section className="regex-ai-official-export">
              <span><small>MUFY IMPORT JSON</small><b>官网可导入的正则文件</b><p>按你上传的官网样本生成：数组结构、7 个字段、代码组件 mode 1。当前导出为{enabled ? "启用" : "停用"}、{visibility ? "用户可见" : "仅创建者可见"}。</p></span>
              <div><CopyResult value={JSON.stringify(officialImport, null, 2)} label="复制 JSON"/><button type="button" className="download" onClick={() => downloadJson(officialImport)}>下载官网 JSON</button></div>
            </section>}
            <ol className="regex-ai-import-guide">
              <li><i>1</i><span><b>导入规则</b><small>前往 Mufy 正则页面，点击“导入”并选择刚下载的 JSON。</small></span></li>
              <li><i>2</i><span><b>核对变量</b><small>$1 是第一个内层 XML 标签的内容，$2 是第二个；按出现顺序继续。变量表不用粘贴到官网。</small></span></li>
              <li><i>3</i><span><b>粘贴输出设定</b><small>进入角色编辑 → 高级设置 → 输出设定；已有内容时请分段追加，不要直接覆盖。</small></span></li>
              <li><i>4</i><span><b>继续美化</b><small>把“美化助手调用语句”发送给美化助手；它是提示词，不是粘贴到 Mufy 的脚本。</small></span></li>
            </ol>
            <details open><summary><b>1. AI 输出结构</b><CopyResult value={result.target} /></summary><pre>{result.target}</pre></details>
            <details><summary><b>2. 美化代码</b><CopyResult value={result.replacement} /></summary><pre>{result.replacement}</pre></details>
            <details open><summary><b>3. 变量对应表 · 仅供核对</b><CopyResult value={result.variableMap} label="复制变量表" /></summary><p className="regex-ai-result-note">对应关系取决于目标 XML 内层标签的出现顺序。调整标签顺序后，请重新生成并测试；这张表不需要填入 Mufy。</p><pre>{result.variableMap}</pre></details>
            <details open className="output-setting"><summary><b>4. 输出设定 · 必须另行粘贴</b><CopyResult value={result.instruction} label="复制到高级设置" /></summary><p className="regex-ai-result-note"><strong>粘贴位置：</strong>创建/编辑角色 → 高级设置 → 输出设定。若已有设定，请加分隔标题后追加。</p><pre>{result.instruction}</pre></details>
            <details open className="beautifier-invocation"><summary><b>5. 美化助手调用语句 · 发送给助手</b><CopyResult value={result.beautifierInvocation} label="复制调用语句" /></summary><p className="regex-ai-result-note"><strong>使用方式：</strong>复制后发送给你使用的美化助手，让它在不改变 XML 标签与 $1…变量顺序的前提下继续换肤。这是提示词，不是执行脚本，也不要粘贴到“高级设置 → 输出设定”。</p><pre>{result.beautifierInvocation}</pre></details>
          </div>}

          {error && <p className="regex-ai-error" role="alert">{error}</p>}
          <footer>
            {step > 0 && step < 4 ? <button type="button" onClick={() => setStep((old) => old - 1)}>上一步</button> : <button type="button" onClick={reset}>重新开始</button>}
            {step < 4 ? <button type="button" className="primary" onClick={next}>{step === 3 ? "生成完整配置" : "下一步"} <span>→</span></button> : <button type="button" className="primary" onClick={() => result && onApply(result)}>回填并覆盖 A / B / C 字段 <span>→</span></button>}
          </footer>
        </section>
      </div>
    </aside>
  </div>;
}

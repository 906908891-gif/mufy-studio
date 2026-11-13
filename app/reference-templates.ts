export const kingBeautyCss = String.raw`/* ===== MUFY 全局美化 - 莫与他 / King ===== */
/* 主题:暗墨 + 血红 + 紫晶 + 玻璃质感 */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=JetBrains+Mono:wght@400;600&display=swap');

:root {
  --ink-bg: #06060c;
  --ink-2: #0c0c18;
  --king-blood: #ff4d6d;
  --king-blood-2: #ff8aa3;
  --shark-cyan: #7dcfff;
  --mufy: #a282ff;
  --gold: #ffba6a;
  --text: #e8e8f5;
  --text-dim: #8888a8;
  --border: rgba(162, 130, 255, 0.30);
  --border-blood: rgba(255, 77, 109, 0.40);
}

#mufy_chat_input {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px !important;
  background: linear-gradient(180deg, rgba(20, 18, 36, 0.92), rgba(12, 12, 24, 0.94)) !important;
  border: 1px solid var(--border) !important;
  border-radius: 12px !important;
  backdrop-filter: blur(16px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.50), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
#mufy_chat_input textarea {
  flex: 1;
  background: transparent !important;
  color: var(--text) !important;
  border: none !important;
  font-family: PingFang SC, Microsoft YaHei, sans-serif;
  font-size: 14px;
  line-height: 1.55;
  resize: none;
}
#mufy_chat_input textarea::placeholder { color: var(--text-dim); font-style: italic; }

#mufy_chat_input_replay_btn {
  position: relative;
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #1a1828, #0c0c18) !important;
  border: 1px solid var(--border-blood) !important;
  color: var(--king-blood-2) !important;
  border-radius: 4px !important;
  clip-path: polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%);
  transition: all 0.2s ease;
  font-weight: 600;
}
#mufy_chat_input_replay_btn:hover {
  background: var(--king-blood) !important;
  color: var(--ink-bg) !important;
  transform: scale(1.05);
  filter: drop-shadow(0 0 12px rgba(255, 77, 109, 0.55));
}
#mufy_chat_input_replay_btn:active { animation: bloodspatter 0.4s ease-out; }
@keyframes bloodspatter {
  0% { filter: drop-shadow(0 0 0 rgba(255, 77, 109, 0)); transform: scale(1); }
  50% { filter: drop-shadow(0 0 18px rgba(255, 77, 109, 0.85)); transform: scale(0.96); }
  100% { filter: drop-shadow(0 0 8px rgba(255, 77, 109, 0.45)); transform: scale(1); }
}

#mufy_chat_input_model_btn {
  background: rgba(20, 18, 32, 0.7) !important;
  border: 1px solid var(--border) !important;
  color: var(--mufy) !important;
  border-radius: 8px !important;
  font-family: JetBrains Mono, monospace;
  font-size: 11px;
  letter-spacing: 1px;
  padding: 6px 12px !important;
  transition: all 0.2s ease;
}
#mufy_chat_input_model_btn:hover {
  background: linear-gradient(90deg, rgba(255, 77, 109, 0.12), rgba(162, 130, 255, 0.18)) !important;
  color: var(--king-blood-2) !important;
}

#mufy_author_note {
  background: linear-gradient(180deg, rgba(255, 186, 106, 0.04), transparent) !important;
  border: 1px solid rgba(255, 186, 106, 0.25) !important;
  border-left: 3px solid var(--gold) !important;
  border-radius: 8px !important;
  color: var(--text) !important;
  padding: 12px 14px !important;
  position: relative;
}
#mufy_author_note::before {
  content: "CREATORS NOTE · 任务补充";
  position: absolute;
  top: -8px;
  left: 12px;
  background: var(--ink-bg);
  padding: 0 8px;
  font-family: JetBrains Mono, monospace;
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--gold);
}

.mufy_message_narration {
  font-family: JetBrains Mono, monospace !important;
  font-size: 12px !important;
  color: var(--text-dim) !important;
  background: rgba(255, 77, 109, 0.04) !important;
  background-image: none !important;
  border-left: 2px dashed var(--king-blood) !important;
  padding: 6px 12px !important;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.mufy_message_narration::before { content: "// "; color: var(--king-blood); }

.mufy_code_block {
  background: var(--ink-2) !important;
  background-image: none !important;
  border: 1px solid var(--border) !important;
  border-radius: 0 !important;
  padding: 14px 16px !important;
  font-family: JetBrains Mono, monospace !important;
  font-size: 12px !important;
  color: var(--text) !important;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(162, 130, 255, 0.10);
}
.mufy_code_block::before {
  content: ".terminal · 任务日志";
  position: absolute;
  top: -10px;
  left: 12px;
  background: var(--ink-2);
  padding: 0 8px;
  font-size: 9px;
  letter-spacing: 1.5px;
  color: var(--mufy);
}
.mufy_code_block::after {
  content: "[ USER @ ] SHARK // LEVEL ∞";
  display: block;
  margin-top: 8px;
  font-size: 9px;
  color: var(--king-blood);
  text-align: right;
  letter-spacing: 1.5px;
}
.mufy_code_block svg { display: none !important; }

.mufy_emphasis_text {
  background: rgba(255, 77, 109, 0.10) !important;
  background-image: none !important;
  color: var(--king-blood-2) !important;
  font-weight: 700 !important;
  padding: 0 4px;
  border-radius: 2px;
  text-shadow: 0 0 6px rgba(255, 77, 109, 0.45);
}

#mufy_message_actions_btn {
  background: rgba(20, 18, 32, 0.7) !important;
  border: 1px solid var(--border) !important;
  color: var(--mufy) !important;
  border-radius: 4px !important;
  transition: all 0.2s ease;
}
#mufy_message_actions_btn:hover { background: var(--king-blood) !important; color: var(--ink-bg) !important; }
#mufy_message_actions_box {
  background: linear-gradient(180deg, rgba(20, 18, 36, 0.92), rgba(12, 12, 24, 0.94)) !important;
  border: 1px solid var(--border) !important;
  border-radius: 8px !important;
  backdrop-filter: blur(18px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.50);
}
#mufy_message_actions_delete {
  background: rgba(255, 77, 109, 0.10) !important;
  color: var(--king-blood-2) !important;
  border: 1px solid var(--border-blood) !important;
}
#mufy_message_actions_delete:hover { background: var(--king-blood) !important; color: var(--ink-bg) !important; }
#mufy_message_actions_edit { background: transparent !important; color: var(--text-dim) !important; border: 1px solid var(--border) !important; }

details {
  background: rgba(20, 18, 32, 0.7) !important;
  border: 1px solid var(--border) !important;
  border-radius: 6px !important;
  padding: 0 !important;
  margin: 6px 0;
  overflow: hidden;
}
details summary {
  padding: 8px 14px !important;
  background: linear-gradient(90deg, rgba(162, 130, 255, 0.10), transparent) !important;
  color: var(--mufy) !important;
  cursor: pointer;
  font-weight: 600;
  letter-spacing: 0.5px;
  list-style: none;
  position: relative;
}
details summary::before { content: "▼ "; color: var(--king-blood); }
details summary::-webkit-details-marker { display: none; }
details[open] summary::before { content: "▲ "; }
details li { padding: 5px 16px !important; border-top: 1px solid rgba(162, 130, 255, 0.10); color: var(--text); font-size: 13px; }

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); border-radius: 4px; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg, var(--king-blood), var(--mufy)); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, var(--king-blood-2), var(--mufy)); }
::selection { background: rgba(255, 77, 109, 0.35); color: #fff; }`;

export const kingBeautySource = `<style>\n${kingBeautyCss}\n</style>`;

export const kingQuickStatusSource = String.raw`<div class="king-quickstatus">
  <div class="k-row"><span class="k-tag">任务</span><span class="k-val">已完成 23 / 24</span><span class="k-bar"><i style="width:96%"></i></span></div>
  <div class="k-row"><span class="k-tag">武器</span><span class="k-val">夜枭 + King-I 在线</span></div>
  <div class="k-row"><span class="k-tag">赌约</span><span class="k-val">本轮 King 对 鲨鱼</span><span class="k-score">0 : 7</span></div>
  <div class="k-row"><span class="k-tag">旧伤</span><span class="k-val">左肩锁骨 阴天疼</span></div>
  <div class="k-row k-mood"><span class="k-tag">心情</span><span class="k-emo">炸毛</span><span class="k-emo">小哭包</span><span class="k-emo">被撩</span></div>
</div>
<style>
.king-quickstatus { background: linear-gradient(180deg, rgba(20,8,12,0.94), rgba(10,6,14,0.95)); border: 1px solid rgba(255,77,109,0.32); border-radius: 4px; padding: 14px; font-family: PingFang SC, sans-serif; color: #e8e8f5; margin: 10px 0; box-shadow: 0 4px 22px rgba(255,77,109,0.16); }
.king-quickstatus .k-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px dashed rgba(255,77,109,0.18); }
.king-quickstatus .k-row:last-child { border-bottom: none; }
.king-quickstatus .k-tag { background: rgba(255,77,109,0.12); border: 1px solid rgba(255,77,109,0.32); color: #ff8aa3; font-family: monospace; font-size: 10px; padding: 2px 7px; border-radius: 8px; min-width: 36px; text-align: center; }
.king-quickstatus .k-val { color: #e8e8f5; font-size: 12px; }
.king-quickstatus .k-bar { display: inline-block; width: 70px; height: 4px; background: rgba(255,255,255,0.10); border-radius: 2px; overflow: hidden; }
.king-quickstatus .k-bar i { display: block; height: 100%; background: linear-gradient(90deg, #ff4d6d, #ff8aa3); }
.king-quickstatus .k-score { font-family: monospace; font-size: 11px; color: #ff8aa3; letter-spacing: 1px; margin-left: auto; }
.king-quickstatus .k-emo { background: rgba(255,77,109,0.08); border: 1px solid rgba(255,77,109,0.22); color: #ff8aa3; font-size: 11px; padding: 2px 8px; border-radius: 12px; margin-right: 4px; }
</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="80" height="80" aria-label="King 徽记">
  <defs><radialGradient id="kg" cx="60" cy="60" r="50"><stop offset="0%" stop-color="#ff8aa3"/><stop offset="60%" stop-color="#ff4d6d"/><stop offset="100%" stop-color="#06060c"/></radialGradient></defs>
  <circle cx="60" cy="60" r="56" fill="url(#kg)" opacity="0.85"/><circle cx="60" cy="60" r="35" fill="none" stroke="#ff8aa3" stroke-width="1.5"/>
  <line x1="60" y1="4" x2="60" y2="30" stroke="#ff8aa3" stroke-width="1.5"/><line x1="60" y1="90" x2="60" y2="116" stroke="#ff8aa3" stroke-width="1.5"/><line x1="4" y1="60" x2="30" y2="60" stroke="#ff8aa3" stroke-width="1.5"/><line x1="90" y1="60" x2="116" y2="60" stroke="#ff8aa3" stroke-width="1.5"/>
  <circle cx="60" cy="60" r="3" fill="#ff8aa3"/><text x="60" y="65" text-anchor="middle" font-family="monospace" font-size="14" fill="#fff" font-weight="700">K</text>
</svg>`;

export type OfficialInteractivePreviewKind = "officialSticker" | "officialPhone";

export function officialPreviewScriptsEnabledByDefault(kind: string) {
  return kind === "officialSticker" || kind === "officialPhone";
}

function escapePhoneCapture(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

export function fillOfficialPhonePreviewCaptures(source: string, userInput: string, aiInput: string) {
  return source
    .replace(/\$1/g, () => escapePhoneCapture(userInput))
    .replace(/\$2/g, () => escapePhoneCapture(aiInput));
}

const PHONE_PREVIEW_SHIM = `<script data-mufy-studio-preview-bridge>
(function () {
    window.smartFill = function () {
        var note = document.createElement('div');
        note.setAttribute('data-mufy-studio-preview-reply', '');
        note.className = 'flex flex-row items-start gap-2.5 message-anim';
        note.innerHTML = '<div class="w-9 h-9 rounded-[10px] bg-zinc-800 border border-white/10 shadow-md overflow-hidden shrink-0"><div class="w-full h-full grid place-items-center text-emerald-400">M</div></div><div class="max-w-[75%] px-3.5 py-2.5 rounded-2xl rounded-tl-[4px] bg-zinc-800/80 text-zinc-100 border border-white/5 text-[13px] leading-[1.4]">本站模拟回复：消息已接收。复制到 Mufy 后，实际回复由角色对话生成。</div>';
        window.setTimeout(function () {
            var stream = document.getElementById('chat-container');
            if (stream) {
                stream.appendChild(note);
                stream.scrollTop = stream.scrollHeight;
            }
        }, 280);
        try { newUserMessages = []; } catch (error) {}
    };
})();
</script>`;

export function prepareOfficialPreviewDocument(kind: string, source: string) {
  if (kind !== "officialPhone" || source.includes("data-mufy-studio-preview-bridge")) return source;
  if (/<\/body>/i.test(source)) return source.replace(/<\/body>/i, `${PHONE_PREVIEW_SHIM}\n</body>`);
  return `${source}\n${PHONE_PREVIEW_SHIM}`;
}

const HTML_MARKUP = /(?:<[A-Za-z][\w-]*(?:\s|>|\/)|<!doctype\b|<!--[\s\S]*?-->)/i;
const COMPLETE_HTML_FENCE = /^```html[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/i;
const FENCE_MARKER = /```/;

function hasOneCompleteHtmlFence(value: string) {
  const match = value.trim().match(COMPLETE_HTML_FENCE);
  if (!match) return false;

  // A second line-level fence means the outer match greedily swallowed a
  // sibling/nested block. MUFY expects one complete html fence per field.
  return !/(?:^|\r?\n)[ \t]*```/.test(match[1]);
}

export function isMufyReplacementReady(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (hasOneCompleteHtmlFence(value)) return true;
  if (FENCE_MARKER.test(value)) return false;
  return !HTML_MARKUP.test(trimmed);
}

export function mufyReplacement(value: string) {
  const trimmed = value.trim();
  if (!trimmed || hasOneCompleteHtmlFence(value)) return value;

  // Never hide a malformed user-authored fence inside another fence. Keeping
  // it unchanged lets the readiness check surface the exact problem instead.
  if (FENCE_MARKER.test(value)) return value;

  return HTML_MARKUP.test(trimmed)
    ? `\`\`\`html\n${value}\n\`\`\``
    : value;
}

export function previewMufyReplacement(value: string) {
  return value.replace(
    /(^|\r?\n)```html[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*(?=$|\r?\n)/gim,
    "$1$2",
  );
}

export function appendMufyReplacementToken(value: string, token: string) {
  const closing = value.match(/\r?\n```[ \t]*$/);
  return closing && closing.index !== undefined
    ? `${value.slice(0, closing.index)}${token}${value.slice(closing.index)}`
    : `${value}${token}`;
}

import assert from "node:assert/strict";
import test from "node:test";

import {
  appendMufyReplacementToken,
  isMufyReplacementReady,
  mufyReplacement,
  previewMufyReplacement,
} from "../app/mufy-regex-format.ts";

test("wraps HTML in exactly one official MUFY html fence", () => {
  const source = '<div class="card">$1</div>\n<style>.card{color:red}</style>';
  const ready = `\`\`\`html\n${source}\n\`\`\``;
  assert.equal(mufyReplacement(source), ready);
  assert.equal(mufyReplacement(ready), ready);
  assert.equal(isMufyReplacementReady(source), false);
  assert.equal(isMufyReplacementReady(ready), true);
});

test("does not fence plain-text and empty replacements", () => {
  assert.equal(mufyReplacement("替换成普通文字 $1"), "替换成普通文字 $1");
  assert.equal(mufyReplacement(""), "");
  assert.equal(mufyReplacement("a < b / <3"), "a < b / <3");
  assert.equal(isMufyReplacementReady("替换成普通文字 $1"), true);
  assert.equal(isMufyReplacementReady(""), true);
});

test("recognizes doctype and comment-only HTML as markup", () => {
  assert.equal(mufyReplacement("<!DOCTYPE html>"), "```html\n<!DOCTYPE html>\n```");
  assert.equal(mufyReplacement("<!-- MUFY component -->"), "```html\n<!-- MUFY component -->\n```");
});

test("preserves source line endings and trailing whitespace while wrapping", () => {
  const source = "<div>$1</div>\r\n<style>\r\n.x{}\r\n</style>  ";
  assert.equal(mufyReplacement(source), `\`\`\`html\n${source}\n\`\`\``);
});

test("preview removes only MUFY html fences", () => {
  const output = "剧情前文\n```html\n<div>$1</div>\n```\n剧情后文";
  assert.equal(previewMufyReplacement(output), "剧情前文\n<div>$1</div>\n剧情后文");
  assert.equal(previewMufyReplacement("普通文本"), "普通文本");
});

test("rejects malformed, inline, nested, and sibling fences without wrapping them again", () => {
  const cases = [
    "```html\n<div>$1</div>",
    "```html<div>$1</div>```",
    "```html\n<div>$1</div>\n```\n尾注",
    "```html\n<div>one</div>\n```\n```html\n<div>two</div>\n```",
    "```html\n<div>one</div>\n```css\n.x{}\n```\n```",
  ];

  for (const value of cases) {
    assert.equal(mufyReplacement(value), value);
    assert.equal(isMufyReplacementReady(value), false);
  }
});

test("capture tokens are inserted before the closing html fence", () => {
  assert.equal(
    appendMufyReplacementToken("```html\n<div>$1</div>\n```", "$2"),
    "```html\n<div>$1</div>$2\n```",
  );
  assert.equal(
    appendMufyReplacementToken("```html\r\n<div>$1</div>\r\n```", "$2"),
    "```html\r\n<div>$1</div>$2\r\n```",
  );
});

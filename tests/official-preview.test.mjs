import assert from "node:assert/strict";
import test from "node:test";

import replacements from "../app/official-mufy-replacements.json" with { type: "json" };
import {
  fillOfficialPhonePreviewCaptures,
  officialPreviewScriptsEnabledByDefault,
  prepareOfficialPreviewDocument,
} from "../app/official-preview.ts";

test("runs only the two official script-dependent previews by default", () => {
  assert.equal(officialPreviewScriptsEnabledByDefault("officialPhone"), true);
  assert.equal(officialPreviewScriptsEnabledByDefault("officialSticker"), true);
  assert.equal(officialPreviewScriptsEnabledByDefault("officialMap"), false);
  assert.equal(officialPreviewScriptsEnabledByDefault("phone"), false);
});

test("adds a preview-only phone reply shim without changing the official source", () => {
  const official = replacements.officialPhone;
  const prepared = prepareOfficialPreviewDocument("officialPhone", official);

  assert.notEqual(prepared, official);
  assert.equal(official.includes("data-mufy-studio-preview-bridge"), false);
  assert.match(prepared, /data-mufy-studio-preview-bridge/);
  assert.match(prepared, /本站模拟回复：消息已接收/);
  assert.equal((prepared.match(/data-mufy-studio-preview-bridge/g) ?? []).length, 1);
  assert.equal(prepareOfficialPreviewDocument("officialPhone", prepared), prepared);
});

test("does not rewrite the official sticker or non-phone documents", () => {
  assert.equal(
    prepareOfficialPreviewDocument("officialSticker", replacements.officialSticker),
    replacements.officialSticker,
  );
  assert.equal(prepareOfficialPreviewDocument("officialMap", "<html></html>"), "<html></html>");
});

test("keeps hostile phone preview text inside the message string", () => {
  const filled = fillOfficialPhonePreviewCaptures(
    "const user = `$1`; const ai = `$2`;",
    "` ${alert(1)} <img src=x onerror=alert(2)> $&",
    "</script><script>alert(3)</script>",
  );

  assert.doesNotMatch(filled, /<img|<script|<\/script/i);
  assert.match(filled, /&lt;img/);
  assert.match(filled, /&lt;\/script&gt;/);
  assert.match(filled, /\\` \\\$\{/);
  assert.match(filled, /\$&/);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  createMufyRegexImportFile,
  mufyRegexImportFilename,
  normalizeMufyRegexFlags,
  toMufyRegexLiteral,
} from "../app/mufy-regex-json.ts";
import { buildAssistantRegex } from "../app/mufy-regex-assistant.ts";
import { generatePattern } from "../app/mufy-regex-pattern.ts";

function parseRegexLiteral(literal) {
  const delimiter = literal.lastIndexOf("/");
  assert.ok(delimiter > 0);
  return new RegExp(literal.slice(1, delimiter), literal.slice(delimiter + 1));
}

test("creates the exact seven-field array shape used by the uploaded Mufy export", () => {
  const draft = buildAssistantRegex({
    componentType: "状态面板",
    style: "赛博朋克",
    interaction: "折叠展开",
    fields: ["生命值", "金币"],
    timing: "每次对话结束时",
  });
  const file = createMufyRegexImportFile({
    name: draft.name,
    pattern: generatePattern(draft.target, "component"),
    flags: "g",
    replacement: draft.replacement,
    enabled: true,
    visibility: false,
    target: draft.target,
  });

  assert.equal(Array.isArray(file), true);
  assert.equal(file.length, 1);
  assert.deepEqual(Object.keys(file[0]), [
    "ruleName",
    "regexPattern",
    "replaceString",
    "enabled",
    "visibility",
    "mode",
    "targetSymbol",
  ]);
  assert.equal(file[0].ruleName, draft.name);
  assert.equal(file[0].replaceString, draft.replacement);
  assert.equal(file[0].enabled, true);
  assert.equal(file[0].visibility, false);
  assert.equal(file[0].mode, 1);
  assert.equal(file[0].targetSymbol, draft.target);
  assert.match(file[0].regexPattern, /^\/.+\/g$/s);

  const match = parseRegexLiteral(file[0].regexPattern).exec(draft.sample);
  assert.deepEqual(match?.slice(1), ["生命值示例1", "金币示例2"]);
});

test("escapes only unescaped regex literal delimiters and normalizes flags", () => {
  assert.equal(toMufyRegexLiteral(String.raw`<A>([\s\S]*?)</A>`, "ssgixg"), String.raw`/<A>([\s\S]*?)<\/A>/gis`);
  assert.equal(toMufyRegexLiteral(String.raw`https:\/\/example.com\/x`, "g"), String.raw`/https:\/\/example.com\/x/g`);
  assert.equal(normalizeMufyRegexFlags("smigggx"), "gims");
});

test("uses the same timestamp filename pattern as the attached official export", () => {
  assert.equal(mufyRegexImportFilename(1786677842109), "regex-rules-1786677842109.json");
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  BLOG_WIDGET_KINDS,
  blogWidgetDefaults,
  blogWidgetMarkup,
  blogWidgetMeta,
  blogWidgetXml,
  isBlogWidgetKind,
} from "../app/blog-widgets.ts";
import { previewMufyReplacement, mufyReplacement } from "../app/mufy-regex-format.ts";
import { generatePattern } from "../app/mufy-regex-pattern.ts";
import { createMufyRegexImportFile } from "../app/mufy-regex-json.ts";

const style = { palette: 0, radius: 22, glass: 58, compact: false, motion: true };
const palette = { bg: "#191328", surface: "#29203d", accent: "#c8ff5a", ink: "#faf7ff", muted: "#aaa0bc" };

test("registers twelve stable and complete blog-era widgets", () => {
  assert.equal(BLOG_WIDGET_KINDS.length, 12);
  assert.equal(new Set(BLOG_WIDGET_KINDS).size, BLOG_WIDGET_KINDS.length);
  for (const kind of BLOG_WIDGET_KINDS) {
    assert.equal(isBlogWidgetKind(kind), true);
    assert.equal(blogWidgetMeta[kind].collection, "blog");
    assert.equal(blogWidgetMeta[kind].labels.length, 4);
    assert.deepEqual(Object.keys(blogWidgetDefaults[kind]), ["primary", "secondary", "description", "extra"]);
    assert.ok(Object.values(blogWidgetDefaults[kind]).every((value) => typeof value === "string" && value.length > 0));
  }
  assert.equal(isBlogWidgetKind("environment"), false);
});

test("builds ordered two-level XML that the component pattern captures", () => {
  for (const kind of BLOG_WIDGET_KINDS) {
    const copy = blogWidgetDefaults[kind];
    const xml = blogWidgetXml(kind, copy);
    const pattern = generatePattern(xml, "component");
    const match = xml.match(new RegExp(pattern));
    assert.deepEqual(match?.slice(1), [copy.primary, copy.secondary, copy.description, copy.extra], kind);
    assert.equal((xml.match(/<[^/][^>]*>/g) ?? []).length, 5, kind);
  }
});

test("exports script-free responsive namespaced markup from the same source used for preview", () => {
  for (const kind of BLOG_WIDGET_KINDS) {
    const markup = blogWidgetMarkup(kind, style, palette);
    const replacement = mufyReplacement(markup);
    assert.equal(previewMufyReplacement(replacement), markup, kind);
    assert.equal((replacement.match(/^\x60{3}html$/gm) ?? []).length, 1, kind);
    assert.equal((replacement.match(/^\x60{3}$/gm) ?? []).length, 1, kind);
    assert.match(markup, /class="mufy-blog-/i, kind);
    assert.match(markup, /width:100%/, kind);
    assert.match(markup, /@media\(max-width:420px\)/, kind);
    assert.match(markup, /prefers-reduced-motion/, kind);
    assert.doesNotMatch(markup, /<(?:script|iframe|object|embed|form|img|audio|video)\b/i, kind);
    assert.doesNotMatch(markup, /\son[a-z]+\s*=|javascript:|window\.parent|position:fixed|100vh|@import|https?:\/\//i, kind);
    assert.doesNotMatch(markup, /<[^>]+(?:class|id|style|src|href|data-[\w-]+|title)="[^"]*\$[1-9]/i, kind);
    const refs = [...markup.matchAll(/\$([1-4])/g)].map((match) => Number(match[1]));
    assert.deepEqual([...new Set(refs)].sort(), [1, 2, 3, 4], kind);
  }
});

test("creates an official seven-field mode 1 JSON rule for a blog widget", () => {
  const kind = "blogClock";
  const target = blogWidgetXml(kind, blogWidgetDefaults[kind]);
  const source = blogWidgetMarkup(kind, style, palette);
  const file = createMufyRegexImportFile({
    name: blogWidgetMeta[kind].name,
    pattern: generatePattern(target, "component"),
    flags: "g",
    replacement: mufyReplacement(source),
    enabled: true,
    visibility: false,
    target,
  });
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
  assert.equal(file[0].mode, 1);
  assert.equal(file[0].targetSymbol, target);
  assert.equal(file[0].replaceString, mufyReplacement(source));
});

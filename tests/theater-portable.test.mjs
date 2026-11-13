import assert from "node:assert/strict";
import test from "node:test";

import { mufyReplacement, previewMufyReplacement } from "../app/mufy-regex-format.ts";
import { createTheaterPortableDocument, theaterStatusRecords } from "../app/theater-portable.ts";

const copy = {
  title: "雨停之前",
  subtitle: "CHAPTER 07 · 最后一班车",
  narration: "红色线路灯亮起时，许知遥的声音从旧式耳机里传来。",
  choiceA: "接通备用线路",
  choiceB: "先检查窗外站台",
  location: "临港电台 · B 直播间",
};

test("exports the selected status module instead of the generic scene snapshot", () => {
  const source = createTheaterPortableDocument("status", copy, 1);
  assert.match(source, /data-mufy-theater-module="status"/);
  assert.match(source, /CHARACTER STATUS/);
  assert.match(source, /OOTD/);
  assert.match(source, /MOOD/);
  assert.match(source, /CURRENT ACTION/);
  assert.match(source, /追夫值/);
  assert.match(source, /INNER VOICE/);
  assert.match(source, /id="mts-status-1" checked/);
  assert.match(source, new RegExp(theaterStatusRecords[1].outfit));
  assert.doesNotMatch(source, /SCENE STATUS/);
});

test("every theater selection receives its own complete standalone document", () => {
  const modules = ["scene", "profile", "status", "kingStatus", "gallery", "inventory", "phone", "group", "forum", "news", "memory", "tools"];
  const documents = modules.map((module) => createTheaterPortableDocument(module, copy));
  for (const [index, source] of documents.entries()) {
    assert.match(source, /^<!DOCTYPE html>/);
    assert.match(source, /<meta name="viewport"/);
    assert.match(source, new RegExp(`data-mufy-theater-module="${modules[index]}"`));
    assert.match(source, /<style>/);
  }
  assert.equal(new Set(documents).size, modules.length);
});

test("wraps the complete theater document in exactly one Mufy html fence", () => {
  const source = createTheaterPortableDocument("status", copy);
  const wrapped = mufyReplacement(source);
  assert.match(wrapped, /^```html\n<!DOCTYPE html>/);
  assert.equal((wrapped.match(/```/g) ?? []).length, 2);
  assert.equal(previewMufyReplacement(wrapped), source);
});

test("escapes editable scene copy before putting it into portable HTML", () => {
  const source = createTheaterPortableDocument("scene", { ...copy, title: "<img src=x onerror=alert(1)>" });
  assert.doesNotMatch(source, /<img/);
  assert.match(source, /&lt;img/);
});

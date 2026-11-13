import assert from "node:assert/strict";
import test from "node:test";

import { componentRegex, generatePattern } from "../app/mufy-regex-pattern.ts";

test("derives captures from the uploaded assistant's Chinese two-layer XML example", () => {
  const target = `<状态面板>\n  <生命值>85</生命值>\n  <金币>1200</金币>\n</状态面板>`;
  const pattern = componentRegex(target);
  const match = target.match(new RegExp(pattern));
  assert.ok(match);
  assert.deepEqual(match.slice(1), ["85", "1200"]);
});

test("keeps Unicode XML field order when generating the component pattern", () => {
  const target = `<角色状态>\n  <当前心情>期待</当前心情>\n  <所在地点>旧车站</所在地点>\n</角色状态>`;
  const pattern = generatePattern(target, "component");
  const match = target.match(new RegExp(pattern));
  assert.deepEqual(match?.slice(1), ["期待", "旧车站"]);
});

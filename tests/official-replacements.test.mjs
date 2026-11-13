import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mufyReplacement } from "../app/mufy-regex-format.ts";

const replacements = JSON.parse(
  readFileSync(
    new URL("../app/official-mufy-replacements.json", import.meta.url),
    "utf8",
  ),
);
const officialCaseCopy = JSON.parse(
  readFileSync(
    new URL("../app/official-mufy-case-copy.json", import.meta.url),
    "utf8",
  ),
);

const officialCopySnapshots = {
  officialStatus: { targetBytes: 187, instructionBytes: 1033, sha256: "14abe63c0e4d1d19c1240471de2181e8e89e12ef9901506c171bc6b0ab7f0e08" },
  officialMemory: { targetBytes: 218, instructionBytes: 1975, sha256: "a659dd134d78d22605c90ba809be5354203d311a5554ce756e938b8709dae6ca" },
  officialMap: { targetBytes: 172, instructionBytes: 577, sha256: "270767cf4a9d33fe1805493edac7f722d99ab98fa7a63601d3f801c33752bf86" },
  officialSticker: { targetBytes: 17, instructionBytes: 128, sha256: "8dd1984193aea88eab2a6f28b7836e66142dd6ffdec2b09ec1312c11bcb6f067" },
  officialPhone: { targetBytes: 242, instructionBytes: 859, sha256: "08be08122e587e2fc73cfb61ca1b5c62536de169e04915660ddaf7da7fce88d7" },
};

const officialSnapshots = {
  officialStatus: {
    bytes: 7282,
    sha256: "01742b4b4ce8211c18e49e06db7a9689a202c7a7eb484ea2233d1feed7acd528",
    payloadBytes: 7294,
    payloadSha256: "1797bb13bf00c269f98796ee5b9fc6d9e048b5165486c0a1dd8dccb4004b66e9",
    markers: [
      "<!DOCTYPE html>",
      "<title>Midnight Gummy Ultra Panel</title>",
      '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&family=Quicksand:wght@500;700&family=Noto+Sans+SC:wght@300;500&display=swap" rel="stylesheet">',
      '<div class="ultra-panel">',
      '<div class="data-card item-weather">',
      'id="current-time"',
      "环境描述内容",
    ],
  },
  officialMemory: {
    bytes: 5432,
    sha256: "5b8e2f420a87a069895e538055cf5279987062f5750fb8b72e990fc3761747df",
    payloadBytes: 5444,
    payloadSha256: "abc35bd9db2948545d17088dd385273d8e2a280ee8855538e09ea387aa7cc23a",
    markers: [
      "<!DOCTYPE html>",
      "<title>粉色像素风UI</title>",
      '<link href="https://fonts.googleapis.com/css2?family=DotGothic16&family=VT323&display=swap" rel="stylesheet">',
      '<details class="box c3">',
      "document.querySelectorAll('details.box')",
      "$1",
      "$2",
      "$3",
    ],
  },
  officialMap: {
    bytes: 6019,
    sha256: "6d6a9c156c63c2f69225a0d99770141a51e93d80b25e3c1f6c50a1f28add2588",
    payloadBytes: 6031,
    payloadSha256: "625705af45c111968a518bb2913ef7607cdca82c9c2c45bafd1a12533538e6d0",
    markers: [
      '<div class="grim-container" data-location="$1">',
      '<div class="map-block block-5" data-name="叹息之门">',
      "@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap');",
      '<div class="loc-desc">$2</div>',
    ],
  },
  officialSticker: {
    bytes: 2624,
    sha256: "0fdedb2b439da8bee7e12ddae52e663adbb018fcb574af54d8c6fad6ce289d9e",
    payloadBytes: 2636,
    payloadSha256: "3a4e9e454eeb53e3013091b0b2adcc5ac52f6b2865a03bff427f4fb1fe9fc141",
    markers: [
      "<!DOCTYPE html>",
      '<script src="https://cdn.tailwindcss.com"></script>',
      "https://cdn.mufy.ai/images/bcd519fc-3e9a-43dd-2bec-0426750e3e00/public",
      'id="memeDisplay"',
      'const inputValue = "$1";',
      "function displayMeme()",
    ],
  },
  officialPhone: {
    bytes: 11365,
    sha256: "d3ed12aa9deb245fe70348d86b2f6fdd772de2a7c25a4ae857e672fa068eaed3",
    payloadBytes: 11377,
    payloadSha256: "d1d65fafa3ea6b24f17d7145d1efd15ec0180da260eb9d9a0f8b172fdf01e47a",
    markers: [
      "<!DOCTYPE html>",
      '<script src="https://cdn.tailwindcss.com"></script>',
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
      "https://cdn.mufy.ai/images/9b350667-10e5-43ea-efd8-aac249556d00/public",
      "const userInput = `$1`;",
      "const aiInput = `$2`;",
      "function smartFill(text, autoSend)",
      "window.onload = initChat;",
    ],
  },
};

const studioRewriteMarkers = [
  "mufy-officialStatus-",
  "mufy-officialMemory-",
  "mufy-officialMap-",
  "mufy-officialSticker-",
  "mufy-officialPhone-",
  "mufy-official-map-grid",
  "mufy-phone-stream",
  "mufy-phone-bridge",
  "mufy-accent",
  "mufy-muted",
  "data-mufy-phone",
];

test("official replacement manifest contains exactly the five documented cases", () => {
  assert.deepEqual(Object.keys(replacements), Object.keys(officialSnapshots));
  assert.deepEqual(Object.keys(officialCaseCopy), Object.keys(officialSnapshots));
});

test("official target and output-setting text is preserved byte-for-byte", () => {
  for (const [name, snapshot] of Object.entries(officialCopySnapshots)) {
    const source = officialCaseCopy[name];
    assert.equal(Buffer.byteLength(source.target, "utf8"), snapshot.targetBytes);
    assert.equal(Buffer.byteLength(source.instruction, "utf8"), snapshot.instructionBytes);
    assert.equal(
      createHash("sha256").update(`${source.target}\0${source.instruction}`, "utf8").digest("hex"),
      snapshot.sha256,
    );
  }
  assert.match(officialCaseCopy.officialMemory.instruction, /短期记忆积累满 10 条/);
  assert.equal(officialCaseCopy.officialSticker.target, "[表情包名称]");
});

for (const [name, snapshot] of Object.entries(officialSnapshots)) {
  test(`${name} preserves the official UTF-8 body byte-for-byte`, () => {
    const source = replacements[name];
    assert.equal(typeof source, "string");
    assert.equal(Buffer.byteLength(source, "utf8"), snapshot.bytes);
    assert.equal(
      createHash("sha256").update(source, "utf8").digest("hex"),
      snapshot.sha256,
    );
    const payload = mufyReplacement(source);
    assert.equal(Buffer.byteLength(payload, "utf8"), snapshot.payloadBytes);
    assert.equal(
      createHash("sha256").update(payload, "utf8").digest("hex"),
      snapshot.payloadSha256,
    );

    for (const marker of snapshot.markers) {
      assert.ok(source.includes(marker), `${name} is missing official marker: ${marker}`);
    }
    for (const marker of studioRewriteMarkers) {
      assert.equal(
        source.includes(marker),
        false,
        `${name} unexpectedly contains Studio rewrite marker: ${marker}`,
      );
    }
  });
}

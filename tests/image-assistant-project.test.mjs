import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_IMAGE_ASSISTANT_PAGES,
  createImageAssistantPages,
  duplicateImageAssistantPage,
  escapeImageAssistantXmlText,
  flattenImageAssistantPageValues,
  imageAssistantPageFieldTag,
  imageAssistantPagedRoot,
  normalizeImageAssistantPages,
} from "../app/image-assistant-project.ts";

const socialSamples = ["無怜", "@yunxiao", "夜里的风", "大雨", "A市", "16℃", "2025-05-23 18:40"];

test("creates one to four independent pages from caller-supplied field samples", () => {
  const pages = createImageAssistantPages(socialSamples, 2);
  assert.equal(pages.length, 2);
  assert.deepEqual(pages.map((page) => page.id), ["page-1", "page-2"]);
  assert.deepEqual(pages[0].values, socialSamples);
  assert.deepEqual(pages[1].values, socialSamples);
  assert.notEqual(pages[0].values, pages[1].values);

  pages[0].values[0] = "改过的名字";
  assert.equal(pages[1].values[0], "無怜");
  assert.equal(createImageAssistantPages(socialSamples, 99).length, MAX_IMAGE_ASSISTANT_PAGES);
  assert.equal(createImageAssistantPages(socialSamples, 0).length, 1);
  assert.throws(() => createImageAssistantPages([]), /fieldSamples/);
});

test("normalizes untrusted persisted pages with bounded fields and unique safe ids", () => {
  const pages = normalizeImageAssistantPages([
    { id: "Page One<script>", title: "  第一页\n<script>  ", values: ["", "账号\u0000", "正文\r\n第二行", ...Array(10).fill("额外字段")] },
    { id: "page-2", title: "", values: ["第二位作者"] },
    { id: "page-2", title: "第三页", values: "not-an-array" },
    { id: "valid-page", title: "第四页", values: socialSamples },
    { id: "page-5", title: "不得保留", values: socialSamples },
  ], socialSamples);

  assert.equal(pages.length, 4);
  assert.deepEqual(pages.map((page) => page.id), ["page-1", "page-2", "page-3", "valid-page"]);
  assert.equal(pages[0].title, "第一页 <script>");
  assert.equal(pages[0].values[0], "", "an intentional blank remains blank");
  assert.equal(pages[0].values[1], "账号");
  assert.equal(pages[0].values[2], "正文\n第二行");
  assert.equal(pages[0].values.length, socialSamples.length);
  assert.equal(pages[1].title, "第 2 页");
  assert.equal(pages[1].values[1], socialSamples[1]);
  assert.deepEqual(Object.keys(pages[0]), ["id", "title", "values"]);
  assert.equal("imageUrl" in pages[0], false);
});

test("duplicates a selected page without sharing values and respects the page cap", () => {
  const original = createImageAssistantPages(socialSamples, 2);
  original[0].title = "雨夜";
  original[0].values[2] = "第一页正文";
  const duplicated = duplicateImageAssistantPage(original, "page-1", socialSamples);

  assert.equal(duplicated.length, 3);
  assert.equal(duplicated[1].title, "雨夜 副本");
  assert.equal(duplicated[1].values[2], "第一页正文");
  assert.notEqual(duplicated[0].values, duplicated[1].values);
  duplicated[1].values[2] = "副本正文";
  assert.equal(duplicated[0].values[2], "第一页正文");

  const capped = duplicateImageAssistantPage(createImageAssistantPages(socialSamples, 4), "page-1", socialSamples);
  assert.equal(capped.length, 4);
  const missing = duplicateImageAssistantPage(original, "missing", socialSamples);
  assert.deepEqual(missing, normalizeImageAssistantPages(original, socialSamples));
});

test("flattens page fields in page-major capture order", () => {
  const pages = createImageAssistantPages(socialSamples, 2);
  pages[1].values[0] = "第二页作者";
  const flattened = flattenImageAssistantPageValues(pages, socialSamples);

  assert.equal(flattened.length, 14);
  assert.deepEqual(flattened.map((field) => field.capture), Array.from({ length: 14 }, (_, index) => index + 1));
  assert.equal(flattened[6].pageNumber, 1);
  assert.equal(flattened[6].fieldIndex, 6);
  assert.equal(flattened[7].pageNumber, 2);
  assert.equal(flattened[7].fieldIndex, 0);
  assert.equal(flattened[7].value, "第二页作者");
});

test("derives flat XML names without embedding image data", () => {
  assert.equal(imageAssistantPagedRoot("SocialPost", 1), "SocialPost");
  assert.equal(imageAssistantPagedRoot("SocialPost", 2), "SocialPostPages");
  assert.equal(imageAssistantPageFieldTag("Author", 0, 1), "Author");
  assert.equal(imageAssistantPageFieldTag("Author", 0, 2), "Page1Author");
  assert.equal(imageAssistantPageFieldTag("Author", 1, 2), "Page2Author");
  assert.equal(escapeImageAssistantXmlText(`A&B <雨> \"夜\" '城'`), "A&amp;B &lt;雨&gt; &quot;夜&quot; &apos;城&apos;");
});

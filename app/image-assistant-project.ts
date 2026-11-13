export type ImageAssistantPage = {
  id: string;
  title: string;
  values: string[];
};

export type ImageAssistantFlatField = {
  capture: number;
  pageIndex: number;
  pageNumber: number;
  pageId: string;
  pageTitle: string;
  fieldIndex: number;
  value: string;
};

export const MIN_IMAGE_ASSISTANT_PAGES = 1;
export const MAX_IMAGE_ASSISTANT_PAGES = 4;
export const MAX_IMAGE_ASSISTANT_FIELDS = 8;

const MAX_PAGE_ID_LENGTH = 40;
const MAX_PAGE_TITLE_LENGTH = 40;
const MAX_PAGE_VALUE_LENGTH = 500;
const SAFE_PAGE_ID = /^[a-z][a-z0-9-]{0,39}$/;

function unicodeSlice(value: string, maximum: number) {
  return Array.from(value).slice(0, maximum).join("");
}

function cleanSingleLine(value: unknown, fallback: string, maximum: number) {
  if (typeof value !== "string") return fallback;
  const cleaned = unicodeSlice(
    value
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    maximum,
  );
  return cleaned || fallback;
}

function cleanPageValue(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  return unicodeSlice(
    value
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, ""),
    MAX_PAGE_VALUE_LENGTH,
  );
}

function normalizeFieldSamples(fieldSamples: readonly string[]) {
  if (!Array.isArray(fieldSamples) || fieldSamples.length < 1 || fieldSamples.length > MAX_IMAGE_ASSISTANT_FIELDS) {
    throw new RangeError(`fieldSamples 必须包含 1—${MAX_IMAGE_ASSISTANT_FIELDS} 个字段`);
  }
  return fieldSamples.map((sample) => cleanPageValue(sample, ""));
}

function normalizedPageCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return MIN_IMAGE_ASSISTANT_PAGES;
  return Math.min(MAX_IMAGE_ASSISTANT_PAGES, Math.max(MIN_IMAGE_ASSISTANT_PAGES, Math.round(value)));
}

function nextPageId(used: Set<string>, preferredIndex: number) {
  let suffix = Math.max(1, preferredIndex + 1);
  let candidate = `page-${suffix}`;
  while (used.has(candidate)) candidate = `page-${++suffix}`;
  used.add(candidate);
  return candidate;
}

function normalizedId(value: unknown, used: Set<string>, preferredIndex: number) {
  if (typeof value === "string") {
    const candidate = unicodeSlice(value.trim().toLowerCase(), MAX_PAGE_ID_LENGTH);
    if (SAFE_PAGE_ID.test(candidate) && !used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  return nextPageId(used, preferredIndex);
}

function cloneValues(fieldSamples: readonly string[]) {
  return fieldSamples.map((sample) => sample);
}

/**
 * Creates one to four independent pages from trusted preset samples. Image
 * bytes and URLs intentionally are not part of this portable editor model.
 */
export function createImageAssistantPages(fieldSamples: readonly string[], count = 1): ImageAssistantPage[] {
  const samples = normalizeFieldSamples(fieldSamples);
  return Array.from({ length: normalizedPageCount(count) }, (_, index) => ({
    id: `page-${index + 1}`,
    title: `第 ${index + 1} 页`,
    values: cloneValues(samples),
  }));
}

/**
 * Converts local-storage or provider data into a bounded, deterministic page
 * array. Missing fields use the supplied preset samples; extra fields/pages
 * are discarded. Deliberately blank field values remain blank.
 */
export function normalizeImageAssistantPages(value: unknown, fieldSamples: readonly string[]): ImageAssistantPage[] {
  const samples = normalizeFieldSamples(fieldSamples);
  if (!Array.isArray(value) || value.length === 0) return createImageAssistantPages(samples);

  const used = new Set<string>();
  return value.slice(0, MAX_IMAGE_ASSISTANT_PAGES).map((item, index) => {
    const source = item && typeof item === "object" && !Array.isArray(item)
      ? item as Record<string, unknown>
      : {};
    const inputValues = Array.isArray(source.values) ? source.values : [];
    return {
      id: normalizedId(source.id, used, index),
      title: cleanSingleLine(source.title, `第 ${index + 1} 页`, MAX_PAGE_TITLE_LENGTH),
      values: samples.map((sample, fieldIndex) => cleanPageValue(inputValues[fieldIndex], sample)),
    };
  });
}

/** Returns a new page list with a deep copy inserted after the selected page. */
export function duplicateImageAssistantPage(
  pages: unknown,
  pageId: string,
  fieldSamples: readonly string[],
): ImageAssistantPage[] {
  const normalized = normalizeImageAssistantPages(pages, fieldSamples);
  if (normalized.length >= MAX_IMAGE_ASSISTANT_PAGES) return normalized;
  const sourceIndex = normalized.findIndex((page) => page.id === pageId);
  if (sourceIndex < 0) return normalized;

  const used = new Set(normalized.map((page) => page.id));
  const source = normalized[sourceIndex];
  const copy: ImageAssistantPage = {
    id: nextPageId(used, normalized.length),
    title: cleanSingleLine(`${source.title} 副本`, `第 ${sourceIndex + 2} 页`, MAX_PAGE_TITLE_LENGTH),
    values: cloneValues(source.values),
  };
  return [...normalized.slice(0, sourceIndex + 1), copy, ...normalized.slice(sourceIndex + 1)];
}

/**
 * Flattens fields page-first, matching the capture order used by generated
 * XML and replacement placeholders: page 1 fields, then page 2 fields, etc.
 */
export function flattenImageAssistantPageValues(
  pages: unknown,
  fieldSamples: readonly string[],
): ImageAssistantFlatField[] {
  const normalized = normalizeImageAssistantPages(pages, fieldSamples);
  const fieldsPerPage = normalizeFieldSamples(fieldSamples).length;
  return normalized.flatMap((page, pageIndex) => page.values.map((value, fieldIndex) => ({
    capture: pageIndex * fieldsPerPage + fieldIndex + 1,
    pageIndex,
    pageNumber: pageIndex + 1,
    pageId: page.id,
    pageTitle: page.title,
    fieldIndex,
    value,
  })));
}

export function imageAssistantPagedRoot(root: string, pageCount: number) {
  return normalizedPageCount(pageCount) === 1 ? root : `${root}Pages`;
}

export function imageAssistantPageFieldTag(baseTag: string, pageIndex: number, pageCount: number) {
  return normalizedPageCount(pageCount) === 1 ? baseTag : `Page${Math.max(0, Math.round(pageIndex)) + 1}${baseTag}`;
}

export function escapeImageAssistantXmlText(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

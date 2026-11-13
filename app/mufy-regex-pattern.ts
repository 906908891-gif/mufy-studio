export type MufyRegexScenario = "component" | "symbol" | "text" | "filter";

const XML_NAME_SOURCE = String.raw`[\p{L}_][\p{L}\p{N}_.:-]*`;
const XML_TAG_PATTERN = new RegExp(`<${XML_NAME_SOURCE}>`, "u");
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const flexible = (value: string) => escapeRegex(value).replace(/\s+/g, "\\s*");

function xmlLeafMatcher() {
  return new RegExp(`<(${XML_NAME_SOURCE})>([^<]*)<\\/\\1>`, "gu");
}

export function hasXmlTag(pattern: string) {
  return XML_TAG_PATTERN.test(pattern);
}

export function componentRegex(target: string) {
  const leaf = xmlLeafMatcher();
  let out = "", cursor = 0, found = false, match: RegExpExecArray | null;
  while ((match = leaf.exec(target)) !== null) {
    found = true;
    out += flexible(target.slice(cursor, match.index));
    out += `${escapeRegex(`<${match[1]}>`)}([\\s\\S]*?)${escapeRegex(`</${match[1]}>`)}`;
    cursor = match.index + match[0].length;
  }
  out += flexible(target.slice(cursor));
  return found ? out : flexible(target);
}

export function generatePattern(target: string, scenario: MufyRegexScenario) {
  if (!target) return "";
  if (scenario === "component") return componentRegex(target);
  if (scenario === "symbol" && target.length > 1) return `${escapeRegex(target[0])}([\\s\\S]*?)${escapeRegex(target.at(-1) || "")}`;
  return escapeRegex(target.trim());
}

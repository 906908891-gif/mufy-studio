export type MufyRegexImportRule = {
  ruleName: string;
  regexPattern: string;
  replaceString: string;
  enabled: boolean;
  visibility: boolean;
  mode: 1;
  targetSymbol: string;
};

export type MufyRegexImportInput = {
  name: string;
  pattern: string;
  flags: string;
  replacement: string;
  enabled: boolean;
  visibility: boolean;
  target: string;
};

const FLAG_ORDER = "gims";

function escapeRegexLiteralDelimiter(source: string) {
  let output = "";

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "\n") { output += "\\n"; continue; }
    if (character === "\r") { output += "\\r"; continue; }
    if (character === "\u2028") { output += "\\u2028"; continue; }
    if (character === "\u2029") { output += "\\u2029"; continue; }

    if (character === "/") {
      let precedingBackslashes = 0;
      for (let cursor = index - 1; cursor >= 0 && source[cursor] === "\\"; cursor -= 1) {
        precedingBackslashes += 1;
      }
      if (precedingBackslashes % 2 === 0) output += "\\";
    }
    output += character;
  }

  return output;
}

export function normalizeMufyRegexFlags(flags: string) {
  const requested = new Set(String(flags ?? "").match(/[gims]/g) ?? []);
  return Array.from(FLAG_ORDER).filter((flag) => requested.has(flag)).join("");
}

export function toMufyRegexLiteral(pattern: string, flags = "g") {
  return `/${escapeRegexLiteralDelimiter(String(pattern ?? ""))}/${normalizeMufyRegexFlags(flags)}`;
}

export function createMufyRegexImportFile(input: MufyRegexImportInput): MufyRegexImportRule[] {
  return [{
    ruleName: input.name.trim() || "未命名正则",
    regexPattern: toMufyRegexLiteral(input.pattern, input.flags),
    replaceString: input.replacement,
    enabled: Boolean(input.enabled),
    visibility: Boolean(input.visibility),
    mode: 1,
    targetSymbol: input.target,
  }];
}

export function mufyRegexImportFilename(now = Date.now()) {
  return `regex-rules-${now}.json`;
}

export type MufyCharacterData = {
  version: string;
  type: string;
  metadata: {
    name: string;
    genderCode: string;
    genderText: string;
    age: string;
    nsfw: boolean;
    oc: boolean;
    ai: boolean;
    cardType: string;
    contentType: string;
    camera: boolean;
  };
  tags: string[];
  introduction: string;
  greeting: string;
  cognition: string;
  authorTitle: string;
  authorNote: string;
  theaterPayload: string;
  persona: string;
  adversity: string;
  visibility: string;
  stylePayload: string;
};

export const MAX_MUFY_XML_BYTES = 2_000_000;
const MAX_PAYLOAD_SIZE = 1_500_000;

export function mufyXmlByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function cleanXmlText(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "");
}

function scalar(value: string) {
  return cleanXmlText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value: string) {
  return `<![CDATA[${cleanXmlText(value).replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function bool(value: boolean) {
  return value ? "true" : "false";
}

export function serializeMufyCharacter(data: MufyCharacterData) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<mufy-character version="1" type="single">',
    "  <元信息>",
    `    <名称>${cdata(data.metadata.name)}</名称>`,
    `    <性别>${scalar(data.metadata.genderCode)}</性别>`,
    `    <性别文本>${cdata(data.metadata.genderText)}</性别文本>`,
    `    <年龄>${scalar(data.metadata.age)}</年龄>`,
    `    <NSFW>${bool(data.metadata.nsfw)}</NSFW>`,
    `    <OC>${bool(data.metadata.oc)}</OC>`,
    `    <AI>${bool(data.metadata.ai)}</AI>`,
    "    <卡片类型>single</卡片类型>",
    `    <内容类型>${scalar(data.metadata.contentType || "OC")}</内容类型>`,
    `    <启用摄像头>${bool(data.metadata.camera)}</启用摄像头>`,
    "  </元信息>",
    "  <标签>",
    ...data.tags.map((tag) => `    <tag>${cdata(tag)}</tag>`),
    "  </标签>",
    `  <角色介绍>${cdata(data.introduction)}</角色介绍>`,
    `  <招呼语>${cdata(data.greeting)}</招呼语>`,
    `  <默认认知>${cdata(data.cognition)}</默认认知>`,
    `  <作者的话标题>${cdata(data.authorTitle)}</作者的话标题>`,
    `  <作者的话>${cdata(data.authorNote)}</作者的话>`,
    `  <小剧场>${cdata(data.theaterPayload)}</小剧场>`,
    `  <人设>${cdata(data.persona)}</人设>`,
    `  <逆境处理>${cdata(data.adversity)}</逆境处理>`,
    `  <可见性>${scalar(data.visibility)}</可见性>`,
    "  <美化>",
    `    <样式代码>${cdata(data.stylePayload)}</样式代码>`,
    "  </美化>",
    "</mufy-character>",
  ];
  return `${lines.join("\n")}\n`;
}

function directChild(parent: Element, name: string) {
  return Array.from(parent.children).find((child) => child.tagName === name) ?? null;
}

function requiredChild(parent: Element, name: string) {
  const node = directChild(parent, name);
  if (!node) throw new Error(`缺少 <${name}> 节点`);
  return node;
}

function text(parent: Element, name: string, trim = false) {
  const value = requiredChild(parent, name).textContent ?? "";
  return trim ? value.trim() : value;
}

function parseBool(value: string, field: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`<${field}> 必须是 true 或 false`);
}

function findMarkupEnd(source: string, start: number) {
  let quote = "";
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") return index;
  }
  return -1;
}

/**
 * Reject DTDs and processing instructions before DOMParser sees them.
 * This deliberately walks markup boundaries instead of stripping comments or
 * CDATA with regular expressions, so fake delimiters cannot hide active XML.
 */
function assertSafeXmlMarkup(source: string) {
  let index = 0;
  let declarationSeen = false;
  while (index < source.length) {
    const open = source.indexOf("<", index);
    if (open === -1) return;

    if (source.startsWith("<!--", open)) {
      const end = source.indexOf("-->", open + 4);
      if (end === -1) throw new Error("XML 注释未闭合");
      index = end + 3;
      continue;
    }

    if (source.startsWith("<![CDATA[", open)) {
      const end = source.indexOf("]]>", open + 9);
      if (end === -1) throw new Error("XML CDATA 未闭合");
      index = end + 3;
      continue;
    }

    if (source.startsWith("<?", open)) {
      const end = source.indexOf("?>", open + 2);
      if (end === -1) throw new Error("XML 处理指令未闭合");
      const instruction = source.slice(open, end + 2);
      const prefix = source.slice(0, open).replace(/^\uFEFF/, "");
      const isDeclaration = /^<\?xml\s+version\s*=\s*(["'])1\.0\1(?:\s+encoding\s*=\s*(["'])UTF-8\2)?(?:\s+standalone\s*=\s*(["'])(?:yes|no)\3)?\s*\?>$/i.test(instruction);
      if (declarationSeen || prefix.trim() || !isDeclaration) {
        throw new Error("XML 不允许包含处理指令");
      }
      declarationSeen = true;
      index = end + 2;
      continue;
    }

    if (/^<!/i.test(source.slice(open, open + 10))) {
      throw new Error("XML 不允许包含 DOCTYPE、ENTITY 或其他声明");
    }

    const end = findMarkupEnd(source, open + 1);
    if (end === -1) throw new Error("XML 标签未闭合");
    const markup = source.slice(open, end + 1);
    if (/^<\s*xi:include\b/i.test(markup)) throw new Error("XML 不允许包含 XInclude");
    index = end + 1;
  }
}

function assertExactChildren(parent: Element, names: string[], label: string) {
  const actual = Array.from(parent.children).map((child) => child.tagName);
  if (actual.length !== names.length || actual.some((name, index) => name !== names[index])) {
    throw new Error(`${label}节点或顺序与 Mufy v1 格式不一致`);
  }
}

function assertContainerTextIsWhitespace(parent: Element, label: string) {
  if (Array.from(parent.childNodes).some((node) => (node.nodeType === 3 || node.nodeType === 4) && (node.textContent ?? "").trim())) {
    throw new Error(`${label}容器不能包含散落文本`);
  }
}

export function parseMufyCharacter(source: string): MufyCharacterData {
  const normalizedSource = source.replace(/^\uFEFF/, "");
  if (mufyXmlByteLength(normalizedSource) > MAX_MUFY_XML_BYTES) throw new Error("XML 文件超过 2 MB 安全上限");
  assertSafeXmlMarkup(normalizedSource);
  const document = new DOMParser().parseFromString(normalizedSource, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new Error("XML 语法无效");
  if (document.doctype) throw new Error("XML 不允许包含 DOCTYPE");
  const walker = document.createTreeWalker(document, 64);
  if (walker.nextNode()) throw new Error("XML 不允许包含处理指令");
  const root = document.documentElement;
  if (root.tagName !== "mufy-character") throw new Error("根节点必须是 <mufy-character>");
  if (root.namespaceURI) throw new Error("Mufy v1 XML 不使用命名空间");
  const rootAttributes = Array.from(root.attributes).map((attribute) => attribute.name).sort().join(",");
  if (rootAttributes !== "type,version") throw new Error("根节点只能包含 version 与 type 属性");
  const version = root.getAttribute("version") ?? "";
  const type = root.getAttribute("type") ?? "";
  if (!version || !type) throw new Error("根节点缺少 version 或 type 属性");
  if (version !== "1" || type !== "single") throw new Error("当前仅支持 version=1、type=single 的 Mufy 角色卡");

  assertExactChildren(root, ["元信息", "标签", "角色介绍", "招呼语", "默认认知", "作者的话标题", "作者的话", "小剧场", "人设", "逆境处理", "可见性", "美化"], "顶层");

  const metadata = requiredChild(root, "元信息");
  const tagsNode = requiredChild(root, "标签");
  const beauty = requiredChild(root, "美化");
  assertExactChildren(metadata, ["名称", "性别", "性别文本", "年龄", "NSFW", "OC", "AI", "卡片类型", "内容类型", "启用摄像头"], "元信息");
  if (Array.from(tagsNode.children).some((child) => child.tagName !== "tag")) throw new Error("<标签> 只能包含 <tag>");
  assertExactChildren(beauty, ["样式代码"], "美化");
  for (const [container, label] of [[root, "顶层"], [metadata, "元信息"], [tagsNode, "标签"], [beauty, "美化"]] as const) {
    assertContainerTextIsWhitespace(container, label);
  }
  const descendants = Array.from(root.querySelectorAll("*"));
  if (descendants.some((element) => element.attributes.length > 0)) {
    throw new Error("Mufy v1 子节点不允许包含属性");
  }
  if (descendants.some((element) => element.namespaceURI === "http://www.w3.org/2001/XInclude")) {
    throw new Error("XML 不允许包含 XInclude");
  }
  if (descendants.some((element) => !["元信息", "标签", "美化"].includes(element.tagName) && element.children.length > 0)) {
    throw new Error("Mufy v1 叶节点不能包含嵌套元素");
  }
  const cardType = text(metadata, "卡片类型", true);
  if (cardType !== "single") throw new Error("当前仅支持 single 卡片类型");
  return {
    version,
    type,
    metadata: {
      name: text(metadata, "名称"),
      genderCode: text(metadata, "性别", true),
      genderText: text(metadata, "性别文本"),
      age: text(metadata, "年龄", true),
      nsfw: parseBool(text(metadata, "NSFW", true), "NSFW"),
      oc: parseBool(text(metadata, "OC", true), "OC"),
      ai: parseBool(text(metadata, "AI", true), "AI"),
      cardType,
      contentType: text(metadata, "内容类型", true),
      camera: parseBool(text(metadata, "启用摄像头", true), "启用摄像头"),
    },
    tags: Array.from(tagsNode.children)
      .filter((node) => node.tagName === "tag")
      .map((node) => node.textContent ?? ""),
    introduction: text(root, "角色介绍"),
    greeting: text(root, "招呼语"),
    cognition: text(root, "默认认知"),
    authorTitle: text(root, "作者的话标题"),
    authorNote: text(root, "作者的话"),
    theaterPayload: text(root, "小剧场").trim(),
    persona: text(root, "人设"),
    adversity: text(root, "逆境处理"),
    visibility: text(root, "可见性", true),
    stylePayload: text(beauty, "样式代码").trim(),
  };
}

export function encryptedPayloadStatus(value: string) {
  if (!value.trim()) return "empty" as const;
  if (value.length > MAX_PAYLOAD_SIZE || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return "invalid" as const;
  try {
    const decoded = atob(value);
    if (decoded.length > MAX_PAYLOAD_SIZE) return "invalid" as const;
    const envelope = JSON.parse(decoded) as Record<string, unknown>;
    const keys = Object.keys(envelope).sort().join(",");
    if (keys !== "ciphertext,iv,salt") return "invalid" as const;
    if (typeof envelope.salt !== "string" || !/^[0-9a-f]{32}$/.test(envelope.salt)) return "invalid" as const;
    if (typeof envelope.iv !== "string" || !/^[0-9a-f]{32}$/.test(envelope.iv)) return "invalid" as const;
    if (typeof envelope.ciphertext !== "string" || !/^[0-9a-f]+$/.test(envelope.ciphertext) || envelope.ciphertext.length % 32 !== 0) return "invalid" as const;
    return "preserved" as const;
  } catch {
    return "invalid" as const;
  }
}

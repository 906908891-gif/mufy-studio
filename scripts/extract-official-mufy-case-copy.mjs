import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [sourceDirectory, outputFile] = process.argv.slice(2);

if (!sourceDirectory || !outputFile) {
  throw new Error("Usage: node scripts/extract-official-mufy-case-copy.mjs <markdown-dir> <output-json>");
}

const cases = {
  officialStatus: "jian-dan-zhuang-tai-lan.md",
  officialMemory: "dong-tai-ji-yi-qu.md",
  officialMap: "di-tu-zu-jian.md",
  officialSticker: "biao-qing-bao-an-li.md",
  officialPhone: "mumu-xiao-shou-ji.md",
};

function fencedSection(markdown, heading) {
  const marker = `#### ${heading}`;
  const start = markdown.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${marker}`);
  const nextHeading = markdown.indexOf("\n#### ", start + marker.length);
  const section = markdown.slice(start + marker.length, nextHeading < 0 ? undefined : nextHeading);
  const match = section.match(/^```(?:xml)?[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/m);
  if (!match) throw new Error(`Missing fenced block below ${marker}`);
  return match[1].replace(/\r\n/g, "\n");
}

const copy = {};
for (const [key, filename] of Object.entries(cases)) {
  const markdown = await readFile(path.join(sourceDirectory, filename), "utf8");
  const target = fencedSection(markdown, "目标字符");
  const instruction = fencedSection(markdown, "输出设定");
  copy[key] = { target, instruction };
  const hash = createHash("sha256").update(`${target}\0${instruction}`).digest("hex");
  process.stdout.write(`${key}\t${Buffer.byteLength(target)}\t${Buffer.byteLength(instruction)}\t${hash}\n`);
}

await writeFile(outputFile, `${JSON.stringify(copy, null, 2)}\n`, "utf8");

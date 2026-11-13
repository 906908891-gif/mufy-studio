import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [sourceDirectory, outputFile] = process.argv.slice(2);

if (!sourceDirectory || !outputFile) {
  throw new Error("Usage: node scripts/extract-official-mufy-replacements.mjs <markdown-dir> <output-json>");
}

const cases = {
  officialStatus: "jian-dan-zhuang-tai-lan.md",
  officialMemory: "dong-tai-ji-yi-qu.md",
  officialMap: "di-tu-zu-jian.md",
  officialSticker: "biao-qing-bao-an-li.md",
  officialPhone: "mumu-xiao-shou-ji.md",
};

const replacements = {};

for (const [key, filename] of Object.entries(cases)) {
  const markdown = await readFile(path.join(sourceDirectory, filename), "utf8");
  const match = markdown.match(/````html\r?\n```html\r?\n([\s\S]*?)\r?\n```\r?\n````/);
  if (!match) throw new Error(`Official replacement block was not found in ${filename}`);
  const source = match[1].replace(/\r\n/g, "\n");
  replacements[key] = source;
  const hash = createHash("sha256").update(source).digest("hex");
  process.stdout.write(`${key}\t${source.length}\t${hash}\n`);
}

await writeFile(outputFile, `${JSON.stringify(replacements, null, 2)}\n`, "utf8");

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const pngPath = path.join(projectRoot, "public", "og-wormifi.png");
const htmlPath = path.join(projectRoot, "index.html");

function fail(message) {
  throw new Error(`OG verification failed: ${message}`);
}

function readMetadata(html) {
  const metadata = new Map();
  for (const match of html.matchAll(/<meta\b[^>]*>/giu)) {
    const attributes = new Map();
    for (const attribute of match[0].matchAll(/([:\w-]+)\s*=\s*"([^"]*)"/gu)) {
      attributes.set(attribute[1].toLowerCase(), attribute[2]);
    }
    const key = attributes.get("property") ?? attributes.get("name");
    const content = attributes.get("content");
    if (key && content !== undefined) metadata.set(key, content);
  }
  return metadata;
}

const png = await readFile(pngPath).catch(() => fail(`${pngPath} is missing`));
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (png.length < 24 || !png.subarray(0, 8).equals(signature)) {
  fail("og-wormifi.png is not a valid PNG");
}
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width !== 1200 || height !== 630) {
  fail(`expected 1200x630, received ${width}x${height}`);
}

const html = await readFile(htmlPath, "utf8");
const metadata = readMetadata(html);
const imageUrl = "https://wormifi.com/og-wormifi.png";
const expected = new Map([
  ["og:title", "Wormifi — Every Chain Has a Story"],
  ["og:description", "Collect living sparks. Grow your crew. Make rivals crash. Play instantly."],
  ["og:type", "website"],
  ["og:url", "https://wormifi.com/"],
  ["og:site_name", "Wormifi"],
  ["og:locale", "en_US"],
  ["og:image", imageUrl],
  ["og:image:secure_url", imageUrl],
  ["og:image:type", "image/png"],
  ["og:image:width", "1200"],
  ["og:image:height", "630"],
  ["og:image:alt", "Wormifi living-chain arena shown using actual rendered gameplay."],
  ["twitter:card", "summary_large_image"],
  ["twitter:title", "Wormifi — Every Chain Has a Story"],
  ["twitter:description", "Collect living sparks. Grow your crew. Make rivals crash. Play instantly."],
  ["twitter:image", imageUrl],
  ["twitter:image:alt", "Wormifi living-chain arena shown using actual rendered gameplay."],
]);

for (const [key, value] of expected) {
  if (metadata.get(key) !== value) {
    fail(`${key} must equal ${JSON.stringify(value)}`);
  }
}
if (!/<link\s+rel="canonical"\s+href="https:\/\/wormifi\.com\/"\s*\/?>/iu.test(html)) {
  fail("canonical URL must point to https://wormifi.com/");
}

process.stdout.write(`OG_OK image=${width}x${height} metadata=${expected.size}\n`);

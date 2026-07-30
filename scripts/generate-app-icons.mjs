import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const outputs = [
  { source: "public/icon.svg", target: "public/icons/wormifi-180.png", size: 180 },
  { source: "public/icon.svg", target: "public/icons/wormifi-192.png", size: 192 },
  { source: "public/icon.svg", target: "public/icons/wormifi-512.png", size: 512 },
  { source: "public/icons/wormifi-maskable.svg", target: "public/icons/wormifi-maskable-192.png", size: 192 },
  { source: "public/icons/wormifi-maskable.svg", target: "public/icons/wormifi-maskable-512.png", size: 512 },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const output of outputs) {
    const svg = await readFile(resolve(output.source), "utf8");
    const page = await browser.newPage({
      viewport: { width: output.size, height: output.size },
      deviceScaleFactor: 1,
    });
    await page.setContent(`<!doctype html><style>*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden}img{display:block;width:100%;height:100%}</style><img alt="" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}">`);
    await page.locator("img").screenshot({
      path: resolve(output.target),
      animations: "disabled",
      omitBackground: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

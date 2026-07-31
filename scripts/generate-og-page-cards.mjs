// Per-page social share cards. Every static page previously shipped the SAME
// homepage card, so every link pasted into WhatsApp/Discord/Reddit looked
// identical. This renders a branded 1200x630 card per page (same design
// language as og-card.template.html) over one fresh gameplay capture, writes
// public/og/<slug>.jpg, and points each page's og:image/twitter:image at it.
// The homepage keeps its bespoke hand-tuned card.
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDir = path.join(projectRoot, "public", "og");

function categoryFor(slug) {
  if (slug.startsWith("devlog")) return "DEVLOG";
  if (slug.includes("-vs-") || slug.startsWith("games-like")) return "COMPARISON";
  if (slug === "press") return "PRESS KIT";
  if (slug === "faq") return "ANSWERS";
  if (slug === "glossary") return "GLOSSARY";
  if (slug === "changelog" || slug === "roadmap") return "SHIP LOG";
  if (slug === "install") return "GET THE GAME";
  if (slug === "guides") return "GUIDE HUB";
  return "GUIDE";
}

function cardHtml(gameplayDataUrl, title, category) {
  const size = title.length > 62 ? 46 : title.length > 44 ? 54 : 62;
  const esc = title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box}html,body{width:1200px;height:630px;margin:0;overflow:hidden;
      color:#f6ffff;background:#061022;font-family:"Trebuchet MS","Segoe UI",Arial,sans-serif}
    .card{position:relative;width:1200px;height:630px;overflow:hidden;background:#061022;isolation:isolate}
    .gameplay{position:absolute;top:0;right:-92px;bottom:0;left:92px;
      background-image:url("${gameplayDataUrl}");background-size:cover;background-position:50% 50%;z-index:0}
    .wash{position:absolute;inset:0;background:
      linear-gradient(90deg,rgba(3,11,27,.98) 0%,rgba(4,17,37,.92) 40%,rgba(4,18,37,.55) 62%,rgba(2,9,22,.06) 82%),
      linear-gradient(0deg,rgba(1,7,18,.78),transparent 32%,rgba(1,8,20,.16));z-index:1}
    .grid{position:absolute;inset:0;opacity:.12;background-image:
      linear-gradient(rgba(106,230,255,.18) 1px,transparent 1px),
      linear-gradient(90deg,rgba(106,230,255,.18) 1px,transparent 1px);background-size:42px 42px;z-index:2}
    .content{position:absolute;left:66px;top:74px;width:640px;z-index:10}
    .eyebrow{display:inline-flex;align-items:center;gap:10px;margin-bottom:18px;color:#9beee1;
      font-size:15px;font-weight:900;letter-spacing:.19em}
    .eyebrow::before{content:"";width:11px;height:11px;
      clip-path:polygon(50% 0,100% 38%,76% 100%,24% 100%,0 38%);background:#63f7db;box-shadow:0 0 20px #5affe0}
    h1{margin:0;width:620px;font-size:${size}px;font-weight:900;line-height:1.02;letter-spacing:-.035em;
      color:#f2ffff;text-wrap:balance;text-shadow:0 4px 24px rgba(0,0,0,.55)}
    .brand{margin:34px 0 0;font-size:34px;font-weight:900;letter-spacing:-.05em;color:transparent;
      background:linear-gradient(105deg,#f2ffff 0%,#66f5dd 30%,#52b9ff 65%,#ff71ae 96%);
      background-clip:text;-webkit-background-clip:text}
    .trust{display:flex;gap:10px;margin-top:22px}
    .trust span{padding:9px 13px;border:1px solid rgba(123,240,228,.32);border-radius:999px;color:#c9fff4;
      background:rgba(9,48,59,.68);box-shadow:inset 0 1px rgba(255,255,255,.09);
      font-size:11px;font-weight:900;letter-spacing:.09em}
    .domain{position:absolute;right:42px;bottom:32px;color:rgba(218,246,255,.84);font-size:14px;
      font-weight:900;letter-spacing:.18em;text-shadow:0 2px 8px #000;z-index:10}
    .frame{position:absolute;inset:15px;border:1px solid rgba(151,229,255,.25);border-radius:27px;
      box-shadow:inset 0 0 0 7px rgba(28,131,184,.035);pointer-events:none;z-index:20}
  </style></head><body><main class="card">
    <div class="gameplay"></div><div class="wash"></div><div class="grid"></div>
    <section class="content">
      <div class="eyebrow">${category}</div>
      <h1>${esc}</h1>
      <p class="brand">WORMIFI</p>
      <div class="trust"><span>FREE BROWSER GAME</span><span>NO PAY-TO-WIN</span></div>
    </section>
    <div class="domain">WORMIFI.COM</div><div class="frame"></div>
  </main></body></html>`;
}

let server;
let browser;
try {
  let baseUrl = process.env.WORMIFI_OG_BASE_URL;
  if (!baseUrl) {
    server = await createServer({ root: projectRoot, server: { host: "127.0.0.1", port: 0, strictPort: false } });
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === "string") throw new Error("no local Vite address");
    baseUrl = `http://127.0.0.1:${address.port}`;
  }
  browser = await chromium.launch({ headless: true, args: ["--disable-gpu", "--disable-gpu-compositing"] });

  // One clean gameplay capture (same proven flow as og-card generation), reused for every card.
  const gameplayContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, serviceWorkers: "block",
  });
  const gameplayPage = await gameplayContext.newPage();
  await gameplayPage.goto(baseUrl, { waitUntil: "networkidle" });
  await gameplayPage.getByLabel("Your arena name").fill("YOU");
  await gameplayPage.getByTestId("solo-run-button").click();
  await gameplayPage.getByTestId("player-chain").waitFor({ state: "visible" });
  await gameplayPage.keyboard.press("ArrowRight");
  await gameplayPage.waitForTimeout(2_500);
  const gameplayPng = await gameplayPage.screenshot({ type: "png" });
  await gameplayContext.close();
  const gameplayDataUrl = `data:image/png;base64,${gameplayPng.toString("base64")}`;

  await mkdir(outputDir, { recursive: true });
  const cardContext = await browser.newContext({
    viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, serviceWorkers: "block",
  });
  const cardPage = await cardContext.newPage();

  const pages = (await readdir(projectRoot)).filter((f) => f.endsWith(".html") && f !== "index.html" && f !== "404.html");
  let generated = 0;
  for (const file of pages) {
    const slug = file.replace(/\.html$/, "");
    const filePath = path.join(projectRoot, file);
    let html = await readFile(filePath, "utf8");
    const ogTitle = /property="og:title" content="([^"]+)"/.exec(html)?.[1]
      ?? /<title>([^<]+)<\/title>/.exec(html)?.[1];
    if (!ogTitle) { console.warn(`skip ${file}: no title`); continue; }

    await cardPage.setContent(cardHtml(gameplayDataUrl, ogTitle, categoryFor(slug)), { waitUntil: "networkidle" });
    await cardPage.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    await cardPage.screenshot({ path: path.join(outputDir, `${slug}.jpg`), type: "jpeg", quality: 82 });

    const cardUrl = `https://wormifi.com/og/${slug}.jpg`;
    const alt = `Wormifi — ${ogTitle}`.replace(/"/g, "&quot;");
    html = html
      .replace(/(property="og:image" content=")[^"]+(")/, `$1${cardUrl}$2`)
      .replace(/(property="og:image:secure_url" content=")[^"]+(")/, `$1${cardUrl}$2`)
      .replace(/(property="og:image:type" content=")[^"]+(")/, `$1image/jpeg$2`)
      .replace(/(property="og:image:alt" content=")[^"]+(")/, `$1${alt}$2`)
      .replace(/(name="twitter:image" content=")[^"]+(")/, `$1${cardUrl}$2`)
      .replace(/(name="twitter:image:alt" content=")[^"]+(")/, `$1${alt}$2`);
    await writeFile(filePath, html);
    generated += 1;
  }
  await cardContext.close();
  console.log(`Generated ${generated} page cards into public/og/ and rewired their meta tags.`);
} finally {
  await browser?.close();
  await server?.close();
}

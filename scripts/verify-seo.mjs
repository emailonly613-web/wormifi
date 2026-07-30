import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  ["index.html", "https://wormifi.com/"],
  ["how-to-play.html", "https://wormifi.com/how-to-play.html"],
  ["multiplayer.html", "https://wormifi.com/multiplayer.html"],
  ["pirate-treasure.html", "https://wormifi.com/pirate-treasure.html"],
  ["guides.html", "https://wormifi.com/guides.html"],
  ["games-like-slither-io.html", "https://wormifi.com/games-like-slither-io.html"],
  ["worm-games.html", "https://wormifi.com/worm-games.html"],
  ["how-to-win-worm-arena-games.html", "https://wormifi.com/how-to-win-worm-arena-games.html"],
  ["install.html", "https://wormifi.com/install.html"],
  ["press.html", "https://wormifi.com/press.html"],
  ["privacy.html", "https://wormifi.com/privacy.html"],
];
const staticGuidePages = new Set(pages.slice(1).map(([filename]) => filename));

function fail(message) {
  throw new Error(`SEO verification failed: ${message}`);
}

function attribute(html, tagName, identityName, identityValue, resultName) {
  for (const match of html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "giu"))) {
    const attributes = new Map();
    for (const item of match[0].matchAll(/([:\w-]+)\s*=\s*"([^"]*)"/gu)) {
      attributes.set(item[1].toLowerCase(), item[2]);
    }
    if (attributes.get(identityName) === identityValue) return attributes.get(resultName);
  }
  return undefined;
}

function title(html) {
  return html.match(/<title>([^<]+)<\/title>/iu)?.[1]?.trim();
}

function jsonLd(html, filename) {
  const blocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/giu)];
  if (blocks.length === 0) fail(`${filename} has no JSON-LD`);
  for (const block of blocks) {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      fail(`${filename} has invalid JSON-LD: ${error.message}`);
    }
  }
}

const titles = new Set();
const descriptions = new Set();
const canonicals = [];

for (const [filename, expectedCanonical] of pages) {
  const html = await readFile(path.join(projectRoot, filename), "utf8");
  const pageTitle = title(html);
  const description = attribute(html, "meta", "name", "description", "content");
  const robots = attribute(html, "meta", "name", "robots", "content");
  const canonical = attribute(html, "link", "rel", "canonical", "href");
  const ogTitle = attribute(html, "meta", "property", "og:title", "content");
  const ogDescription = attribute(html, "meta", "property", "og:description", "content");
  const ogUrl = attribute(html, "meta", "property", "og:url", "content");
  const ogImage = attribute(html, "meta", "property", "og:image", "content");
  const ogImageAlt = attribute(html, "meta", "property", "og:image:alt", "content");
  const twitterCard = attribute(html, "meta", "name", "twitter:card", "content");
  const manifest = attribute(html, "link", "rel", "manifest", "href");

  if (!pageTitle || pageTitle.length < 20 || pageTitle.length > 65) fail(`${filename} title length is not useful`);
  if (!description || description.length < 90 || description.length > 165) fail(`${filename} description length is not useful`);
  if (titles.has(pageTitle)) fail(`${filename} repeats a page title`);
  if (descriptions.has(description)) fail(`${filename} repeats a description`);
  if (canonical !== expectedCanonical) fail(`${filename} canonical must be ${expectedCanonical}`);
  if (!robots?.startsWith("index,follow")) fail(`${filename} must explicitly allow indexing`);
  if (!ogTitle || !ogDescription || ogUrl !== expectedCanonical) fail(`${filename} Open Graph metadata is incomplete`);
  if (ogImage !== "https://wormifi.com/og-wormifi-sea-serpent-v2.png") fail(`${filename} must use the versioned absolute social image URL`);
  if (!ogImageAlt?.includes("sea-serpent") || /\bchains?\b/iu.test(ogImageAlt)) {
    fail(`${filename} social image alt must describe the current sea-serpent artwork`);
  }
  if (twitterCard !== "summary_large_image") fail(`${filename} must request a large Twitter card`);
  if (manifest !== "/manifest.webmanifest") fail(`${filename} must link the shared PWA manifest`);

  if (staticGuidePages.has(filename)) {
    if (!/<a\b[^>]*class="seo-skip-link"[^>]*href="#main-content"/iu.test(html)) {
      fail(`${filename} must provide a skip-to-main link`);
    }
    if (!/<main\b[^>]*id="main-content"[^>]*tabindex="-1"/iu.test(html)) {
      fail(`${filename} main landmark must be a programmatic skip target`);
    }
  }

  jsonLd(html, filename);
  titles.add(pageTitle);
  descriptions.add(description);
  canonicals.push(canonical);
}

const sitemap = await readFile(path.join(projectRoot, "public", "sitemap.xml"), "utf8");
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => match[1]);
for (const canonical of canonicals) {
  if (!sitemapLocations.includes(canonical)) fail(`sitemap is missing ${canonical}`);
}
if (new Set(sitemapLocations).size !== sitemapLocations.length) fail("sitemap contains duplicate URLs");

const robots = await readFile(path.join(projectRoot, "public", "robots.txt"), "utf8");
if (!/^User-agent:\s*\*$/mu.test(robots) || !/^Allow:\s*\/$/mu.test(robots)) {
  fail("robots.txt must allow public crawling");
}
if (!/^Sitemap:\s*https:\/\/wormifi\.com\/sitemap\.xml$/mu.test(robots)) {
  fail("robots.txt must advertise the canonical sitemap");
}

const analytics = await readFile(path.join(projectRoot, "src", "analytics.ts"), "utf8");
for (const required of [
  "VITE_GA4_MEASUREMENT_ID",
  "send_page_view: false",
  "allow_google_signals: false",
  "allow_ad_personalization_signals: false",
  "sanitizePageLocation(window.location)",
  "analytics_storage: \"denied\"",
]) {
  if (!analytics.includes(required)) fail(`analytics guard is missing ${required}`);
}

const seoPage = await readFile(path.join(projectRoot, "src", "seo-page.ts"), "utf8");
for (const required of [
  "registerWormifiServiceWorker",
  "wormifi-privacy-choices",
  "Review optional analytics",
]) {
  if (!seoPage.includes(required)) fail(`static-page browser shell is missing ${required}`);
}

const serviceWorker = await readFile(path.join(projectRoot, "public", "sw.js"), "utf8");
if (!serviceWorker.includes("CANONICAL_PAGE_URLS")) {
  fail("service worker must maintain an explicit canonical-page cache list");
}
for (const [, canonical] of pages) {
  const pathname = new URL(canonical).pathname;
  if (!serviceWorker.includes(JSON.stringify(pathname))) {
    fail(`service worker canonical cache is missing ${pathname}`);
  }
}
for (const required of ["cacheKey(pathname)", "canonicalPage", "status: 503"]) {
  if (!serviceWorker.includes(required)) fail(`service worker offline routing is missing ${required}`);
}
if (/G-[A-Z0-9]{8,}/u.test(analytics.replace("G-[A-Z0-9]", ""))) {
  fail("analytics source must not hard-code a Measurement ID");
}

for (const [filename] of pages) {
  const built = path.join(projectRoot, "dist", filename);
  await stat(built).catch(() => fail(`built SEO page is missing: dist/${filename}`));
}
for (const filename of ["robots.txt", "sitemap.xml"]) {
  await stat(path.join(projectRoot, "dist", filename)).catch(() => fail(`built crawler file is missing: dist/${filename}`));
}

process.stdout.write(`SEO_OK pages=${pages.length} sitemap_urls=${sitemapLocations.length} analytics=consent-gated\n`);

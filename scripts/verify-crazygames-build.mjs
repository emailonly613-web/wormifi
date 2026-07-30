import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(repositoryRoot, "Wormifi_CrazyGames_Ready");
const proofRoot = path.join(repositoryRoot, "proof", "crazygames");
const maximumMobileHomepageBytes = 20 * 1024 * 1024;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function filesUnder(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(absolute, relative));
    else if (entry.isFile()) files.push({ relative, absolute });
  }
  return files;
}

const files = await filesUnder(outputRoot);
assert(files.some((file) => file.relative === "index.html"), "index.html must be at the ZIP root");
assert(files.length <= 1500, `CrazyGames file limit exceeded: ${files.length}`);
for (const requiredAsset of [
  "assets/sprites/pirate-atlas/ground-treasure-rotations-1x.png",
  "assets/sprites/pirate-atlas/ground-treasure-rotations-2x.png",
]) {
  assert(
    files.some((file) => file.relative === requiredAsset),
    `required pirate treasure atlas missing: ${requiredAsset}`,
  );
}

let totalBytes = 0;
const manifest = [];
for (const file of files) {
  const details = await stat(file.absolute);
  const bytes = await readFile(file.absolute);
  totalBytes += details.size;
  manifest.push({
    path: file.relative,
    bytes: details.size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
assert(
  totalBytes <= maximumMobileHomepageBytes,
  `Portable build is ${(totalBytes / 1024 / 1024).toFixed(2)}MB; mobile-homepage target is 20MB`,
);

const index = await readFile(path.join(outputRoot, "index.html"), "utf8");
const scripts = (await Promise.all(
  files.filter((file) => file.relative.endsWith(".js")).map((file) => readFile(file.absolute, "utf8")),
)).join("\n");
const styles = (await Promise.all(
  files.filter((file) => file.relative.endsWith(".css")).map((file) => readFile(file.absolute, "utf8")),
)).join("\n");

assert(index.includes("https://sdk.crazygames.com/crazygames-sdk-v3.js"), "official CrazyGames SDK v3 script missing");
assert(index.includes('data-wormifi-crazygames-sdk="v3"'), "CrazyGames SDK marker missing");
assert(index.includes('content="noindex,nofollow"'), "portable build must not compete with Wormifi.com canonicals");
assert(!index.includes("wormifi.com"), "portable index contains an external Wormifi.com promotion");
assert(!index.includes("application/ld+json"), "owned-site structured data leaked into portable build");
assert(!index.includes("manifest.webmanifest"), "PWA manifest leaked into portable build");
assert(!scripts.includes("gameplay.adBreak"), "nonexistent gameplay.adBreak API found");
assert(!scripts.includes("rewardedAdBreak"), "nonexistent rewardedAdBreak API found");
assert(scripts.includes("crazygames-v3"), "compiled runtime is not configured for CrazyGames distribution");
for (const required of ["requestAd", "midgame", "rewarded", "gameplayStart", "gameplayStop", "loadingStart", "loadingStop"]) {
  assert(scripts.includes(required), `compiled SDK adapter is missing ${required}`);
}
assert(!scripts.includes("googletagmanager.com"), "owned-site GA4 must stay out of the CrazyGames package");
assert(!styles.includes("fonts.googleapis.com"), "portable build must not depend on Google Fonts");
assert(!files.some((file) => file.relative.endsWith(".map")), "source maps must not ship in the optimized package");
assert(!files.some((file) => /source|transparent/iu.test(file.relative)), "source atlas leaked into package");
for (const excluded of ["robots.txt", "sitemap.xml", "privacy.html", "how-to-play.html", "multiplayer.html", "pirate-treasure.html", "sw.js"]) {
  assert(!files.some((file) => file.relative === excluded), `${excluded} must not ship in the platform package`);
}

await mkdir(proofRoot, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  status: "PASS",
  platform: "CrazyGames HTML5 SDK v3",
  distributionRuntime: "crazygames-v3",
  fileCount: files.length,
  totalBytes,
  totalMegabytes: Number((totalBytes / 1024 / 1024).toFixed(3)),
  underCrazyGamesMobileHomepageTarget: true,
  sdkLifecycle: ["loadingStart", "loadingStop", "gameplayStart", "gameplayStop"],
  ads: {
    api: 'SDK.ad.requestAd("midgame" | "rewarded", callbacks)',
    rewardedEnabledInBasicLaunchBuild: false,
    externalAdSdks: 0,
  },
  analytics: "CrazyGames SDK/dashboard; owned-site GA4 intentionally excluded",
  files: manifest,
};
await writeFile(
  path.join(proofRoot, "crazygames-build-verification.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(`CRAZYGAMES_BUILD_OK files=${files.length} size_mb=${report.totalMegabytes} index=root sdk=v3`);

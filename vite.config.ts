import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { normalizeBuildRevision } from "./src/buildRevision";

const page = (filename: string) => fileURLToPath(new URL(filename, import.meta.url));
const CRAZYGAMES_OUT_DIR = "Wormifi_CrazyGames_Ready";
const CRAZYGAMES_SDK_V3_URL = "https://sdk.crazygames.com/crazygames-sdk-v3.js";

function copyCrazyGamesRuntimeAssets() {
  const outputRoot = page(CRAZYGAMES_OUT_DIR);
  const spriteSource = page("public/assets/sprites/pirate-atlas");
  const spriteOutput = `${outputRoot}/assets/sprites/pirate-atlas`;
  mkdirSync(spriteOutput, { recursive: true });

  for (const filename of readdirSync(spriteSource)) {
    if (!filename.endsWith(".png")) continue;
    if (filename.includes("source") || filename.includes("transparent")) continue;
    copyFileSync(`${spriteSource}/${filename}`, `${spriteOutput}/${filename}`);
  }

  for (const filename of ["cut-jewel-v1.png"]) {
    const destination = `${outputRoot}/art/${filename}`;
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(page(`public/art/${filename}`), destination);
  }
}

function crazyGamesHtml(html: string): string {
  const loadingShell = `
    <div id="root">
      <main style="min-height:100dvh;display:grid;place-items:center;padding:32px;color:#effffd;background:#071326;font:700 18px/1.5 system-ui,sans-serif;text-align:center">
        <div><h1 style="margin:0 0 12px;font-size:clamp(44px,10vw,88px);line-height:1">WORMIFI</h1><p>Loading the pirate-serpent arena…</p></div>
      </main>
    </div>`;

  return html
    .replace(/<meta name="robots"[^>]*>/gu, '<meta name="robots" content="noindex,nofollow" />')
    .replace(/\s*<meta name="googlebot"[^>]*>/gu, "")
    .replace(/\s*<meta property="og:[^"]+"[^>]*>/gu, "")
    .replace(/\s*<meta name="twitter:[^"]+"[^>]*>/gu, "")
    .replace(/\s*<link rel="(?:canonical|alternate|manifest|icon|apple-touch-icon)"[^>]*>/gu, "")
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gu, "")
    .replace(
      /<meta name="description"[^>]*>/u,
      '<meta name="description" content="Wormifi is an original pirate-serpent treasure arena built for instant browser play." />',
    )
    .replace(/<title>[\s\S]*?<\/title>/u, "<title>Wormifi — Pirate-Serpent Arena</title>")
    .replace(/<div id="root">[\s\S]*?<\/div>\s*<script type="module"/u, `${loadingShell}\n    <script type="module"`);
}

function ownedWebBuildIdentity(): Plugin {
  const buildRevision = normalizeBuildRevision(
    process.env.VITE_WORMIFI_BUILD_REVISION ?? process.env.WORMIFI_COMMIT_HASH,
  );

  return {
    name: "wormifi-owned-web-build-identity",
    transformIndexHtml: {
      order: "pre",
      handler() {
        return [{
          tag: "meta",
          attrs: {
            name: "wormifi-build-revision",
            content: buildRevision,
          },
          injectTo: "head",
        }];
      },
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "build-info.json",
        source: `${JSON.stringify({
          product: "wormifi",
          buildRevision,
          protocolVersion: 5,
        }, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isCrazyGames = mode === "crazygames";
  const rollupInput: Record<string, string> = isCrazyGames
    ? { game: page("index.html") }
    : {
        game: page("index.html"),
        howToPlay: page("how-to-play.html"),
        multiplayer: page("multiplayer.html"),
        pirateTreasure: page("pirate-treasure.html"),
        guides: page("guides.html"),
        devlogCaptainCenteredLauncher: page("devlog-captain-centered-launcher.html"),
        wormifiVsSnakeIo: page("wormifi-vs-snake-io.html"),
        snakeIoVsSlitherIo: page("snake-io-vs-slither-io.html"),
        wormifiVsWormate: page("wormifi-vs-wormate.html"),
        snakeWarsGames: page("snake-wars-games.html"),
        wormGamesWithFriends: page("worm-games-with-friends.html"),
        blackPearlRelay: page("black-pearl-relay.html"),
        gameSpeedsHarborClassicTempest: page("game-speeds-harbor-classic-tempest.html"),
        whatIsAnIoGame: page("what-is-an-io-game.html"),
        devlog: page("devlog.html"),
        devlogOneServerAuthority: page("devlog-one-server-authority.html"),
        devlogConservedMass: page("devlog-conserved-mass.html"),
        devlogAnimatedMaterials: page("devlog-animated-materials.html"),
        devlog60fpsBudget: page("devlog-60fps-budget.html"),
        devlogNoAppStore: page("devlog-no-app-store.html"),
        devlogSkinsStayCosmetic: page("devlog-skins-stay-cosmetic.html"),
        roadmap: page("roadmap.html"),
        wormifiVsSlitherIo: page("wormifi-vs-slither-io.html"),
        gamesLikeWormate: page("games-like-wormate.html"),
        gamesLikeWormsZone: page("games-like-worms-zone.html"),
        gamesLikeLittleBigSnake: page("games-like-little-big-snake.html"),
        snakeGames: page("snake-games.html"),
        multiplayerSnakeGame: page("multiplayer-snake-game.html"),
        offlineWormGames: page("offline-worm-games.html"),
        browserGamesNoDownload: page("browser-games-no-download.html"),
        mobileWormGameControls: page("mobile-worm-game-controls.html"),
        wormGameSkins: page("worm-game-skins.html"),
        wormGameGlossary: page("worm-game-glossary.html"),
        faq: page("faq.html"),
        changelog: page("changelog.html"),
        gamesLikeSlitherIo: page("games-like-slither-io.html"),
        wormGames: page("worm-games.html"),
        howToWinWormArenas: page("how-to-win-worm-arena-games.html"),
        install: page("install.html"),
        press: page("press.html"),
        privacy: page("privacy.html"),
      };

  return {
    base: isCrazyGames ? "./" : "/",
    publicDir: isCrazyGames ? false : "public",
    plugins: isCrazyGames
      ? [
          {
            name: "wormifi-crazygames-html5-package",
            transformIndexHtml: {
              order: "pre" as const,
              handler(html: string) {
                return {
                  html: crazyGamesHtml(html),
                  tags: [
                    {
                      tag: "script",
                      attrs: {
                        src: CRAZYGAMES_SDK_V3_URL,
                        "data-wormifi-crazygames-sdk": "v3",
                      },
                      injectTo: "head-prepend" as const,
                    },
                  ],
                };
              },
            },
            closeBundle: copyCrazyGamesRuntimeAssets,
          },
        ]
      : [ownedWebBuildIdentity()],
    server: {
      port: 4173,
      strictPort: true,
      watch: {
        // Browser-proof artifacts are written while other isolated Playwright
        // pages are active. They must never trigger a dev-server reload that
        // resets an in-progress deterministic run.
        ignored: ["**/proof/**", "**/test-results/**", "**/playwright-report/**"],
      },
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    build: {
      target: "es2022",
      outDir: isCrazyGames ? CRAZYGAMES_OUT_DIR : "dist",
      emptyOutDir: true,
      sourcemap: !isCrazyGames,
      rollupOptions: {
        input: rollupInput,
      },
    },
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
      exclude: ["tests/e2e/**", "node_modules/**", "dist/**", `${CRAZYGAMES_OUT_DIR}/**`],
      coverage: {
        reporter: ["text", "json-summary"],
      },
    },
  };
});

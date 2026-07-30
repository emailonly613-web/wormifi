import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { preloadPirateSpriteAtlas } from "./game/pirateSpriteAtlas";
import {
  gamePlatform,
  reportPlatformError,
} from "./platform/runtime";
import "./styles.css";
import "./accessibility.css";

const CRAZYGAMES_BUILD = import.meta.env.VITE_DISTRIBUTION_CHANNEL === "crazygames";

async function bootstrap() {
  if (CRAZYGAMES_BUILD) {
    try {
      await gamePlatform.initialize();
      await gamePlatform.loadingStart();
      document.documentElement.dataset.platform = "crazygames-v3";
    } catch (error) {
      // The game stays playable during local/ad-block tests, while the portal
      // preview exposes a precise integration failure for QA.
      reportPlatformError("sdk-initialization", error);
    }
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  preloadPirateSpriteAtlas();

  if (CRAZYGAMES_BUILD) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        void gamePlatform.loadingStop().catch((error) => {
          reportPlatformError("loading-stop", error);
        });
      });
    });
    return;
  }

  const { startOwnedWebRuntime } = await import("./ownedWebRuntime");
  startOwnedWebRuntime();
}

void bootstrap();

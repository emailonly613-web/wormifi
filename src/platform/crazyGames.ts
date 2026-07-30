export const CRAZYGAMES_SDK_V3_URL =
  "https://sdk.crazygames.com/crazygames-sdk-v3.js" as const;

export type DistributionChannel = "owned-web" | "crazygames";
export type CrazyGamesAdType = "midgame" | "rewarded";

export interface CrazyGamesAdError {
  code: string;
  message: string;
}

export interface CrazyGamesAdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: CrazyGamesAdError | unknown) => void;
}

export interface CrazyGamesSdkV3 {
  init(): Promise<void>;
  game: {
    loadingStart(): void | Promise<void>;
    loadingStop(): void | Promise<void>;
    gameplayStart(): void | Promise<void>;
    gameplayStop(): void | Promise<void>;
  };
  ad: {
    requestAd(
      type: CrazyGamesAdType,
      callbacks: CrazyGamesAdCallbacks,
    ): void | Promise<void>;
  };
}

export interface CrazyGamesWindow {
  CrazyGames?: {
    SDK?: CrazyGamesSdkV3;
  };
}

interface ScriptElementLike {
  async: boolean;
  src: string;
  type: string;
  dataset: Record<string, string | undefined>;
  addEventListener(
    type: "load" | "error",
    listener: () => void,
    options?: { once?: boolean },
  ): void;
}

interface DocumentLike {
  head: {
    appendChild(script: ScriptElementLike): unknown;
  };
  createElement(tagName: "script"): ScriptElementLike;
  querySelector(selector: string): ScriptElementLike | null;
}

export interface AdLifecycleHooks {
  pauseGameplay(): void;
  muteAudio(): void;
  resumeGameplay(): void;
  unmuteAudio(): void;
  /** Used only by requestRewardedAd, and only after rewarded adFinished. */
  grantReward?(): void;
}

export type AdRequestResult =
  | { status: "finished" }
  | { status: "error"; error: unknown }
  | { status: "unavailable" };

export interface GamePlatformAdapter {
  readonly channel: DistributionChannel;
  initialize(): Promise<void>;
  loadingStart(): Promise<void>;
  loadingStop(): Promise<void>;
  gameplayStart(): Promise<void>;
  gameplayStop(): Promise<void>;
  requestMidgameAd(hooks: AdLifecycleHooks): Promise<AdRequestResult>;
  requestRewardedAd(hooks: AdLifecycleHooks): Promise<AdRequestResult>;
}

export interface CreatePlatformAdapterOptions {
  /** Test/server override. Production should rely on VITE_DISTRIBUTION_CHANNEL. */
  channel?: string;
  window?: CrazyGamesWindow;
  document?: DocumentLike;
}

const SCRIPT_SELECTOR = 'script[data-wormifi-crazygames-sdk="v3"]';
const sdkLoadPromises = new WeakMap<object, Promise<CrazyGamesSdkV3>>();

function configuredChannel(value: string | undefined): DistributionChannel {
  return value === "crazygames" ? "crazygames" : "owned-web";
}

function defaultWindow(): CrazyGamesWindow | undefined {
  return typeof window === "undefined"
    ? undefined
    : window as unknown as CrazyGamesWindow;
}

function defaultDocument(): DocumentLike | undefined {
  return typeof document === "undefined"
    ? undefined
    : document as unknown as DocumentLike;
}

function readSdk(targetWindow: CrazyGamesWindow): CrazyGamesSdkV3 | undefined {
  return targetWindow.CrazyGames?.SDK;
}

function loadOfficialSdk(
  targetWindow: CrazyGamesWindow,
  targetDocument: DocumentLike,
): Promise<CrazyGamesSdkV3> {
  const existingSdk = readSdk(targetWindow);
  if (existingSdk) return Promise.resolve(existingSdk);

  const cacheKey = targetWindow as object;
  const pending = sdkLoadPromises.get(cacheKey);
  if (pending) return pending;

  const loading = new Promise<CrazyGamesSdkV3>((resolve, reject) => {
    const script = targetDocument.querySelector(SCRIPT_SELECTOR) ??
      targetDocument.createElement("script");
    const isNewScript = !targetDocument.querySelector(SCRIPT_SELECTOR);

    const onLoad = (): void => {
      const sdk = readSdk(targetWindow);
      if (!sdk) {
        reject(new Error("CrazyGames SDK v3 loaded without exposing window.CrazyGames.SDK"));
        return;
      }
      resolve(sdk);
    };
    const onError = (): void => {
      reject(new Error("Failed to load the official CrazyGames SDK v3 script"));
    };
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (isNewScript) {
      script.type = "text/javascript";
      script.async = true;
      script.src = CRAZYGAMES_SDK_V3_URL;
      script.dataset.wormifiCrazygamesSdk = "v3";
      targetDocument.head.appendChild(script);
    }
  });
  sdkLoadPromises.set(cacheKey, loading);
  void loading.catch(() => sdkLoadPromises.delete(cacheKey));
  return loading;
}

function safely(callback: (() => void) | undefined): void {
  try {
    callback?.();
  } catch {
    // Platform callbacks must never leave gameplay paused because a consumer's
    // presentation hook threw. Product telemetry may observe hook failures at
    // the call site without changing the ad settlement contract.
  }
}

class OwnedWebAdapter implements GamePlatformAdapter {
  readonly channel = "owned-web" as const;

  async initialize(): Promise<void> {}
  async loadingStart(): Promise<void> {}
  async loadingStop(): Promise<void> {}
  async gameplayStart(): Promise<void> {}
  async gameplayStop(): Promise<void> {}

  async requestMidgameAd(_hooks: AdLifecycleHooks): Promise<AdRequestResult> {
    return { status: "unavailable" };
  }

  async requestRewardedAd(_hooks: AdLifecycleHooks): Promise<AdRequestResult> {
    return { status: "unavailable" };
  }
}

class CrazyGamesAdapter implements GamePlatformAdapter {
  readonly channel = "crazygames" as const;
  private initialization?: Promise<CrazyGamesSdkV3>;

  constructor(
    private readonly targetWindow: CrazyGamesWindow,
    private readonly targetDocument: DocumentLike,
  ) {}

  async initialize(): Promise<void> {
    await this.sdk();
  }

  async loadingStart(): Promise<void> {
    await (await this.sdk()).game.loadingStart();
  }

  async loadingStop(): Promise<void> {
    await (await this.sdk()).game.loadingStop();
  }

  async gameplayStart(): Promise<void> {
    await (await this.sdk()).game.gameplayStart();
  }

  async gameplayStop(): Promise<void> {
    await (await this.sdk()).game.gameplayStop();
  }

  requestMidgameAd(hooks: AdLifecycleHooks): Promise<AdRequestResult> {
    return this.requestAd("midgame", hooks);
  }

  requestRewardedAd(hooks: AdLifecycleHooks): Promise<AdRequestResult> {
    return this.requestAd("rewarded", hooks);
  }

  private sdk(): Promise<CrazyGamesSdkV3> {
    this.initialization ??= loadOfficialSdk(this.targetWindow, this.targetDocument)
      .then(async (sdk) => {
        await sdk.init();
        return sdk;
      });
    return this.initialization;
  }

  private async requestAd(
    type: CrazyGamesAdType,
    hooks: AdLifecycleHooks,
  ): Promise<AdRequestResult> {
    const sdk = await this.sdk();
    return new Promise<AdRequestResult>((resolve) => {
      let settled = false;
      let rewardGranted = false;

      const resume = (): void => {
        safely(hooks.unmuteAudio);
        safely(hooks.resumeGameplay);
      };
      const finish = (): void => {
        if (settled) return;
        settled = true;
        if (type === "rewarded" && !rewardGranted) {
          rewardGranted = true;
          safely(hooks.grantReward);
        }
        resume();
        resolve({ status: "finished" });
      };
      const fail = (error: unknown): void => {
        if (settled) return;
        settled = true;
        // adError must always return control. It never grants a reward, even
        // when the SDK fails after adStarted.
        resume();
        resolve({ status: "error", error });
      };

      try {
        const request = sdk.ad.requestAd(type, {
          adStarted: () => {
            if (settled) return;
            safely(hooks.pauseGameplay);
            safely(hooks.muteAudio);
          },
          adFinished: finish,
          adError: fail,
        });
        void Promise.resolve(request).catch(fail);
      } catch (error) {
        fail(error);
      }
    });
  }
}

export function createGamePlatformAdapter(
  options: CreatePlatformAdapterOptions = {},
): GamePlatformAdapter {
  const channel = configuredChannel(
    options.channel ?? import.meta.env.VITE_DISTRIBUTION_CHANNEL,
  );
  if (channel !== "crazygames") return new OwnedWebAdapter();

  const targetWindow = options.window ?? defaultWindow();
  const targetDocument = options.document ?? defaultDocument();
  if (!targetWindow || !targetDocument) {
    throw new Error("CrazyGames distribution requires a browser window and document");
  }
  return new CrazyGamesAdapter(targetWindow, targetDocument);
}

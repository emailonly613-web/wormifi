import { describe, expect, it, vi } from "vitest";
import {
  CRAZYGAMES_SDK_V3_URL,
  createGamePlatformAdapter,
  type AdLifecycleHooks,
  type CrazyGamesAdCallbacks,
  type CrazyGamesAdType,
  type CrazyGamesSdkV3,
  type CrazyGamesWindow,
} from "../src/platform/crazyGames";

class FakeScript {
  async = false;
  src = "";
  type = "";
  dataset: Record<string, string | undefined> = {};
  private readonly listeners = new Map<"load" | "error", Array<() => void>>();

  addEventListener(type: "load" | "error", listener: () => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type: "load" | "error"): void {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

class FakeDocument {
  readonly scripts: FakeScript[] = [];
  readonly created: FakeScript[] = [];
  onAppend?: (script: FakeScript) => void;
  readonly head = {
    appendChild: (script: FakeScript): FakeScript => {
      this.scripts.push(script);
      this.onAppend?.(script);
      return script;
    },
  };

  createElement(tagName: "script"): FakeScript {
    expect(tagName).toBe("script");
    const script = new FakeScript();
    this.created.push(script);
    return script;
  }

  querySelector(selector: string): FakeScript | null {
    expect(selector).toBe('script[data-wormifi-crazygames-sdk="v3"]');
    return this.scripts.find((script) =>
      script.dataset.wormifiCrazygamesSdk === "v3"
    ) ?? null;
  }
}

interface SdkFixture {
  sdk: CrazyGamesSdkV3;
  calls: string[];
  request?: {
    type: CrazyGamesAdType;
    callbacks: CrazyGamesAdCallbacks;
  };
}

function sdkFixture(
  requestImplementation?: (
    type: CrazyGamesAdType,
    callbacks: CrazyGamesAdCallbacks,
  ) => void | Promise<void>,
): SdkFixture {
  const calls: string[] = [];
  const fixture: SdkFixture = {
    calls,
    sdk: {
      init: vi.fn(async () => {
        calls.push("init");
      }),
      game: {
        loadingStart: vi.fn(() => {
          calls.push("loadingStart");
        }),
        loadingStop: vi.fn(() => {
          calls.push("loadingStop");
        }),
        gameplayStart: vi.fn(() => {
          calls.push("gameplayStart");
        }),
        gameplayStop: vi.fn(() => {
          calls.push("gameplayStop");
        }),
      },
      ad: {
        requestAd: vi.fn((type, callbacks) => {
          calls.push(`request:${type}`);
          fixture.request = { type, callbacks };
          return requestImplementation?.(type, callbacks);
        }),
      },
    },
  };
  return fixture;
}

function hooks(log: string[]): AdLifecycleHooks {
  return {
    pauseGameplay: () => log.push("pause"),
    muteAudio: () => log.push("mute"),
    unmuteAudio: () => log.push("unmute"),
    resumeGameplay: () => log.push("resume"),
    grantReward: () => log.push("reward"),
  };
}

describe("CrazyGames HTML5 SDK v3 platform adapter", () => {
  it("is a safe no-op and never loads any SDK on the owned web channel", async () => {
    const fixture = sdkFixture();
    const targetWindow: CrazyGamesWindow = { CrazyGames: { SDK: fixture.sdk } };
    const targetDocument = new FakeDocument();
    const log: string[] = [];
    const adapter = createGamePlatformAdapter({
      channel: "owned-web",
      window: targetWindow,
      document: targetDocument as never,
    });

    await adapter.initialize();
    await adapter.loadingStart();
    await adapter.loadingStop();
    await adapter.gameplayStart();
    await adapter.gameplayStop();
    expect(await adapter.requestMidgameAd(hooks(log))).toEqual({ status: "unavailable" });
    expect(await adapter.requestRewardedAd(hooks(log))).toEqual({ status: "unavailable" });

    expect(adapter.channel).toBe("owned-web");
    expect(targetDocument.created).toHaveLength(0);
    expect(targetDocument.scripts).toHaveLength(0);
    expect(fixture.calls).toEqual([]);
    expect(log).toEqual([]);
  });

  it("loads only the official v3 script and awaits init before game lifecycle calls", async () => {
    const fixture = sdkFixture();
    let releaseInit!: () => void;
    fixture.sdk.init = vi.fn(() => {
      fixture.calls.push("init:start");
      return new Promise<void>((resolve) => {
        releaseInit = () => {
          fixture.calls.push("init:end");
          resolve();
        };
      });
    });
    const targetWindow: CrazyGamesWindow = {};
    const targetDocument = new FakeDocument();
    targetDocument.onAppend = (script) => {
      targetWindow.CrazyGames = { SDK: fixture.sdk };
      script.emit("load");
    };
    const adapter = createGamePlatformAdapter({
      channel: "crazygames",
      window: targetWindow,
      document: targetDocument as never,
    });

    let initialized = false;
    const initialization = adapter.initialize().then(() => {
      initialized = true;
    });
    await Promise.resolve();
    expect(targetDocument.scripts).toHaveLength(1);
    expect(targetDocument.scripts[0]).toMatchObject({
      src: CRAZYGAMES_SDK_V3_URL,
      type: "text/javascript",
      async: true,
      dataset: { wormifiCrazygamesSdk: "v3" },
    });
    expect(initialized).toBe(false);

    releaseInit();
    await initialization;
    await adapter.loadingStart();
    await adapter.loadingStop();
    await adapter.gameplayStart();
    await adapter.gameplayStop();
    await adapter.initialize();

    expect(fixture.sdk.init).toHaveBeenCalledTimes(1);
    expect(fixture.calls).toEqual([
      "init:start",
      "init:end",
      "loadingStart",
      "loadingStop",
      "gameplayStart",
      "gameplayStop",
    ]);
  });

  it("pauses and mutes a midgame ad, then resumes without granting a reward", async () => {
    const fixture = sdkFixture();
    const adapter = createGamePlatformAdapter({
      channel: "crazygames",
      window: { CrazyGames: { SDK: fixture.sdk } },
      document: new FakeDocument() as never,
    });
    await adapter.initialize();
    const log: string[] = [];
    const result = adapter.requestMidgameAd(hooks(log));
    await Promise.resolve();

    expect(fixture.request?.type).toBe("midgame");
    fixture.request?.callbacks.adStarted?.();
    fixture.request?.callbacks.adFinished?.();

    await expect(result).resolves.toEqual({ status: "finished" });
    expect(log).toEqual(["pause", "mute", "unmute", "resume"]);
  });

  it("grants a rewarded result exactly once and only from rewarded adFinished", async () => {
    const fixture = sdkFixture();
    const adapter = createGamePlatformAdapter({
      channel: "crazygames",
      window: { CrazyGames: { SDK: fixture.sdk } },
      document: new FakeDocument() as never,
    });
    await adapter.initialize();
    const log: string[] = [];
    const result = adapter.requestRewardedAd(hooks(log));
    await Promise.resolve();

    expect(fixture.request?.type).toBe("rewarded");
    fixture.request?.callbacks.adStarted?.();
    fixture.request?.callbacks.adFinished?.();
    fixture.request?.callbacks.adFinished?.();
    fixture.request?.callbacks.adError?.({ code: "late", message: "ignored" });

    await expect(result).resolves.toEqual({ status: "finished" });
    expect(log).toEqual(["pause", "mute", "reward", "unmute", "resume"]);
  });

  it("always resumes on adError and never rewards an unavailable rewarded ad", async () => {
    const fixture = sdkFixture();
    const adapter = createGamePlatformAdapter({
      channel: "crazygames",
      window: { CrazyGames: { SDK: fixture.sdk } },
      document: new FakeDocument() as never,
    });
    await adapter.initialize();
    const log: string[] = [];
    const error = { code: "unfilled", message: "No ad available" };
    const result = adapter.requestRewardedAd(hooks(log));
    await Promise.resolve();

    fixture.request?.callbacks.adStarted?.();
    fixture.request?.callbacks.adError?.(error);

    await expect(result).resolves.toEqual({ status: "error", error });
    expect(log).toEqual(["pause", "mute", "unmute", "resume"]);
  });

  it("recovers from a synchronous requestAd failure without granting a reward", async () => {
    const thrown = new Error("request failed");
    const fixture = sdkFixture(() => {
      throw thrown;
    });
    const adapter = createGamePlatformAdapter({
      channel: "crazygames",
      window: { CrazyGames: { SDK: fixture.sdk } },
      document: new FakeDocument() as never,
    });
    await adapter.initialize();
    const log: string[] = [];

    await expect(adapter.requestRewardedAd(hooks(log))).resolves.toEqual({
      status: "error",
      error: thrown,
    });
    expect(log).toEqual(["unmute", "resume"]);
  });
});

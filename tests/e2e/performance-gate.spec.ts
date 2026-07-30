import { mkdir, writeFile } from "node:fs/promises";
import { cpus, freemem, platform, release, totalmem } from "node:os";
import path from "node:path";
import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { AuthoritativeArenaServer } from "../../server/src/server";
import { LIVE_SPATIAL_PROFILE } from "../../src/game/spatialFeel";

const sceneSeconds = boundedNumber(
  process.env.WORMIFI_PERF_SCENE_SECONDS,
  60,
  15,
  21_600,
);
const cpuProfileEnabled = process.env.WORMIFI_PERF_CPU_PROFILE === "1";
const reusedPrebuiltBundle = process.env.WORMIFI_PERF_REUSE_BUILD === "1";
const rawHeapSeriesEnabled = sceneSeconds >= 3_600;
const practiceScreenshotPath = process.env.WORMIFI_PERF_PRACTICE_SCREENSHOT
  ? path.resolve(process.env.WORMIFI_PERF_PRACTICE_SCREENSHOT)
  : undefined;
const liveScreenshotPath = process.env.WORMIFI_PERF_LIVE_SCREENSHOT
  ? path.resolve(process.env.WORMIFI_PERF_LIVE_SCREENSHOT)
  : undefined;
const reportPath = path.resolve(
  process.env.WORMIFI_PERF_REPORT ?? (
    cpuProfileEnabled
      ? "proof/performance/live-longtask-profile-latest.json"
      : "proof/performance/smoothness-gate-latest.json"
  ),
);

const thresholds = {
  averageCanvasFramesPerSecondMinimum: 55,
  canvasFrameGapP95MsMaximum: 22,
  canvasFrameGapP99MsMaximum: 40,
  slowCanvasFrameRatioMaximum: 0.02,
  slowCanvasFrameThresholdMs: 34,
  animationCallbackP95MsMaximum: 12,
  animationCallbackP99MsMaximum: 20,
  inputToNextCanvasPaintP95MsMaximum: 34,
  inputToNextCanvasPaintP99MsMaximum: 50,
  longTaskCountPerMinuteMaximum: 2,
  longTaskBlockingMsPerMinuteMaximum: 100,
  retainedHeapGrowthMiBMaximum: 12,
  sampledHeapSlopeMiBPerMinuteMaximum: 8,
  liveSnapshotsPerSecondMinimum: 14.7,
  liveSnapshotGapP95MsMaximum: 100,
  liveSnapshotGapP99MsMaximum: 135,
  liveGroundDropsMinimum:
    LIVE_SPATIAL_PROFILE.targetDropCount -
    LIVE_SPATIAL_PROFILE.maximumDropRefillDeficit,
  liveGroundDropsMaximum: 1_500,
} as const;

const environmentDiagnostics = {
  minimumCanvasFramesPerSecond: 28,
  canvasFrameGapP95MsMaximum: 35,
  canvasFrameGapP99MsMaximum: 50,
} as const;

interface BrowserSamples {
  label: string;
  measuredForMs: number;
  displayFrameGapsMs: number[];
  canvasFrameGapsMs: number[];
  animationCallbackDurationsMs: number[];
  inputToNextCanvasPaintMs: number[];
  longTasks: Array<{ duration: number; startTime: number }>;
  lifecycleMarks: Array<{ name: string; startTime: number }>;
  snapshotArrivalAtMs: number[];
  liveDropCounts: Array<{ atMs: number; count: number }>;
  canvasPaints: number;
  websocketMessages: number;
  websocketMessageHandlerDurationsMs: number[];
  longAnimationFrames: Array<{
    duration: number;
    blockingDuration: number;
    scripts: Array<{
      duration: number;
      functionName: string;
      sourceURL: string;
    }>;
  }>;
  longAnimationFrameObserverSupported: boolean;
  performanceObserverSupported: boolean;
}

interface HeapSample {
  elapsedMs: number;
  usedMiB: number;
}

interface Summary {
  count: number;
  min: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

interface SceneReport {
  scene: "crowded-practice" | "authoritative-live";
  configuredSeconds: number;
  actualMeasuredSeconds: number;
  canvasFramesPerSecond: number;
  displayFrameGapMs: Summary;
  canvasFrameGapMs: Summary;
  animationCallbackDurationMs: Summary;
  inputToNextCanvasPaintMs: Summary;
  slowCanvasFrames: {
    thresholdMs: number;
    count: number;
    ratio: number;
  };
  longTasks: {
    supported: boolean;
    count: number;
    countPerMinute: number;
    totalDurationMs: number;
    durationMs: Summary;
    blockingMs: number;
    blockingMsPerMinute: number;
    entries: Array<{ duration: number; startTime: number }>;
    longAnimationFrames: {
      supported: boolean;
      count: number;
      durationMs: Summary;
      blockingDurationMs: Summary;
      topAttributedScripts: Array<{
        durationMs: number;
        functionName: string;
        sourceURL: string;
      }>;
    };
  };
  heap: {
    samplingMode: "post-gc-endpoints" | "raw-heap-series";
    startAfterGcMiB: number;
    endAfterGcMiB: number;
    retainedGrowthMiB: number;
    peakSampleMiB: number | null;
    sampleSlopeMiBPerMinute: number | null;
    sampleSlopeGateEligible: boolean;
    samples: HeapSample[];
  };
  session: {
    restarts: number;
    canvasPaints: number;
    lifecycleMarks: Array<{ name: string; startTime: number }>;
  };
  environmentDiagnostic: {
    pass: boolean;
    note: string;
  };
  live?: {
    websocketMessages: number;
    snapshots: number;
    snapshotsPerSecond: number;
    snapshotInterArrivalMs: Summary;
    groundDropCount: Summary;
    messageHandlerDurationMs: Summary;
  };
  gates: Record<string, boolean>;
  pass: boolean;
}

interface CpuProfileSummary {
  measuredMs: number;
  samples: number;
  topSelfTime: Array<{
    functionName: string;
    url: string;
    line: number;
    selfMs: number;
    sampleCount: number;
  }>;
  performanceMetricDelta: Record<string, number>;
}

interface BrowserErrorRecord {
  scene: "crowded-practice" | "authoritative-live" | "setup";
  kind: "pageerror" | "console-error";
  message: string;
  source?: string;
}

interface PerformanceState {
  reset(label: string): void;
  armInput(label: string): void;
  markLifecycle(name: string): void;
  markNextCanvas(name: string): void;
  snapshot(): BrowserSamples;
}

type InstrumentedWindow = Window & typeof globalThis & {
  __wormifiPerf: PerformanceState;
  __wormifiPerfSteerTimer?: number;
};

let arenaServer: AuthoritativeArenaServer;
let arenaUrl: string;
let practiceCpuProfile: CpuProfileSummary | undefined;
let liveCpuProfile: CpuProfileSummary | undefined;
const requestedArenaPort = Number(process.env.WORMIFI_PERF_ARENA_PORT ?? 8_791);
const performanceArenaPort = Number.isInteger(requestedArenaPort) &&
    requestedArenaPort >= 1_024 && requestedArenaPort <= 49_151
  ? requestedArenaPort
  : 8_791;

test.beforeAll(async () => {
  arenaServer = new AuthoritativeArenaServer({
    host: "127.0.0.1",
    // The production proof bundle embeds this run's dedicated endpoint.
    port: performanceArenaPort,
    targetPopulation: LIVE_SPATIAL_PROFILE.targetPopulation,
    targetDropCount: LIVE_SPATIAL_PROFILE.targetDropCount,
    arenaRadius: LIVE_SPATIAL_PROFILE.arenaRadius,
    fixedStepHz: 30,
    snapshotHz: 15,
    reconnectGraceMs: 15_000,
  });
  arenaUrl = (await arenaServer.start()).websocketUrl;
});

test.afterAll(async () => {
  await arenaServer.stop();
});

test("crowded Practice and authoritative Live stay inside the local smoothness budget", async ({
  browser,
}, testInfo) => {
  test.setTimeout(Math.max(240_000, sceneSeconds * 2_000 + 90_000));
  practiceCpuProfile = undefined;
  liveCpuProfile = undefined;
  const browserVersion = browser.version();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const browserErrors: BrowserErrorRecord[] = [];
  let activeScene: BrowserErrorRecord["scene"] = "setup";
  page.on("pageerror", (error) => {
    browserErrors.push({
      scene: activeScene,
      kind: "pageerror",
      message: error.stack ?? error.message,
    });
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location();
    browserErrors.push({
      scene: activeScene,
      kind: "console-error",
      message: message.text(),
      source: location.url
        ? `${location.url}:${location.lineNumber}:${location.columnNumber}`
        : undefined,
    });
  });
  await installPerformanceProbe(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");

  let practice: SceneReport | undefined;
  let live: SceneReport | undefined;
  let runError: string | undefined;
  try {
    activeScene = "crowded-practice";
    practice = await measurePractice(page, cdp);
    const practiceBrowserClean = !browserErrors.some((error) => error.scene === "crowded-practice");
    practice.gates.browserErrors = practiceBrowserClean;
    practice.pass = practice.pass && practiceBrowserClean;
    activeScene = "authoritative-live";
    live = await measureLive(page, cdp, arenaUrl);
    const liveBrowserClean = !browserErrors.some((error) => error.scene === "authoritative-live");
    live.gates.browserErrors = liveBrowserClean;
    live.pass = live.pass && liveBrowserClean;
  } catch (error) {
    runError = error instanceof Error ? error.stack ?? error.message : String(error);
  } finally {
    if (cpuProfileEnabled) {
      await cdp.send("Profiler.stop").catch(() => undefined);
      await cdp.send("Profiler.disable").catch(() => undefined);
    }
  }

  const machineCpus = cpus();
  const scenes = [practice, live].filter((scene): scene is SceneReport => Boolean(scene));
  const report = {
    verdict: runError
      ? "LOCAL_SMOOTHNESS_GATE_ERROR"
      : scenes.length === 2 && scenes.every((scene) => scene.pass)
        ? "LOCAL_SMOOTHNESS_GATE_PASS"
        : "LOCAL_SMOOTHNESS_GATE_MISS",
    claim: "bounded-local-chromium-smoothness-proof-only",
    measuredAtUtc: new Date().toISOString(),
    candidate: {
      baseUrl: testInfo.project.use.baseURL,
      browser: "chromium",
      browserVersion,
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      headless: true,
    },
    configuration: {
      secondsPerScene: sceneSeconds,
      cpuProfileEnabled,
      bundleBuild: reusedPrebuiltBundle ? "prebuilt-exact-candidate" : "rebuilt-for-run",
      heapSamplingMode: rawHeapSeriesEnabled
        ? "raw-heap-series"
        : "post-gc-endpoints",
      practice: { labeledBots: 28, targetGroundDrops: 1_050 },
      live: {
        authority: "in-process-local-server",
        actors: LIVE_SPATIAL_PROFILE.targetPopulation,
        targetGroundDrops: LIVE_SPATIAL_PROFILE.targetDropCount,
        simulationHz: 30,
        snapshotHz: 15,
      },
    },
    thresholds,
    environmentDiagnostics,
    scenes,
    diagnostics: {
      practiceCpuProfile,
      liveCpuProfile,
      browserErrors,
      warning: cpuProfileEnabled
        ? "CPU profiling adds observer overhead; use this artifact for attribution, never as the release verdict."
        : undefined,
    },
    error: runError,
    environment: {
      node: process.version,
      platform: platform(),
      release: release(),
      architecture: process.arch,
      logicalCpuCount: machineCpus.length,
      cpuModel: machineCpus[0]?.model ?? "unknown",
      totalMemoryGiB: round(totalmem() / 1024 / 1024 / 1024),
      freeMemoryGiBAtReport: round(freemem() / 1024 / 1024 / 1024),
    },
    assertions: [
      "The real Canvas2D renderer was measured at 1440x900 in full-motion Chromium.",
      "Crowded Practice used the product's 28 labeled bots and 1,050-drop target.",
      `Live used a real authoritative WebSocket room with ${LIVE_SPATIAL_PROFILE.targetPopulation} actors and a ${LIVE_SPATIAL_PROFILE.targetDropCount}-drop target.`,
      "Frame gaps, animation callback cost, input-event-to-next-canvas-paint, long tasks, and post-GC retained heap were measured.",
      rawHeapSeriesEnabled
        ? "Two-second raw JavaScript heap samples were collected for the 60-minute+ trend gate."
        : "The short timing gate collected only post-GC heap endpoints so external CDP polling could not perturb frame pacing.",
      "Live snapshot arrival cadence and the browser's applied ground-drop set were measured throughout the soak.",
      "Page errors and browser console errors were captured for both scenes and are release-blocking.",
    ],
    caveats: [
      "This is a repeatable local regression gate, not a public-WAN, mobile-device, every-browser, or every-hardware performance certification.",
      "Headless Chromium timing on this machine cannot establish the experience on low-end phones, high-refresh displays, background tabs, thermal-throttled devices, or congested networks.",
      "Input latency is measured from a real keyboard event to the next canvas paint call. It does not prove photon latency or input-to-authoritative acknowledgement.",
      "The default one-minute-per-scene soak detects obvious progressive growth but does not replace the required 60-minute preview and six-hour public-launch soak.",
      "JavaScript heap is collected after explicit Chromium garbage collection. Browser GPU memory, native canvas allocations, audio buffers, and operating-system memory are not included.",
      "Server and client run on the same machine in this gate. Use the separate impairment and load gates for WAN delay, loss, jitter, reconnect, room isolation, and service capacity.",
      "Passing this gate does not prove player fun, retention, virality, monetization, or superiority over another game.",
    ],
  };

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await context.close();

  expect(runError, "performance harness must complete both scenes").toBeUndefined();
  expect(scenes).toHaveLength(2);
  expect(
    scenes.flatMap((scene) =>
      Object.entries(scene.gates)
        .filter(([, pass]) => !pass)
        .map(([gate]) => `${scene.scene}: ${gate}`),
    ),
    `smoothness misses are recorded in ${reportPath}`,
  ).toEqual([]);
});

async function measurePractice(page: Page, cdp: CDPSession): Promise<SceneReport> {
  await page.goto("/");
  await page.getByRole("button", { name: /practice with labeled bots/i }).click();
  const arena = page.getByTestId("arena-canvas");
  await expect(arena).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(arena).toHaveAttribute("data-tutorial-stage", "spark");

  // Practice can legitimately end during the warm-up or input samples. Keep
  // the expected replay loop active before either phase so a result dialog
  // cannot strand an armed input with no subsequent canvas paint.
  await page.evaluate(() => {
    type PracticeRestartController = {
      count: number;
      disconnect: () => void;
    };
    const instrumentedWindow = window as typeof window & {
      __wormifiPracticeRestart?: PracticeRestartController;
    };
    const seenResults = new WeakSet<Element>();
    const restartWhenReady = () => {
      const result = document.querySelector('[data-testid="results-panel"]');
      const restart = document.querySelector<HTMLButtonElement>('[data-testid="restart-button"]');
      if (!result || !restart || seenResults.has(result)) return;
      seenResults.add(result);
      if (instrumentedWindow.__wormifiPracticeRestart) {
        instrumentedWindow.__wormifiPracticeRestart.count += 1;
      }
      const performanceState = (window as InstrumentedWindow).__wormifiPerf;
      performanceState.markLifecycle("result-mounted");
      performanceState.markLifecycle("restart-click");
      performanceState.markNextCanvas("first-canvas-after-restart");
      restart.click();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", {
          key: "ArrowDown",
          code: "ArrowDown",
          bubbles: true,
        }));
      }));
    };
    const observer = new MutationObserver(restartWhenReady);
    observer.observe(document.body, { childList: true, subtree: true });
    instrumentedWindow.__wormifiPracticeRestart = {
      count: 0,
      disconnect: () => observer.disconnect(),
    };
    restartWhenReady();
  });
  await page.waitForTimeout(3_000);
  if (practiceScreenshotPath) {
    await mkdir(path.dirname(practiceScreenshotPath), { recursive: true });
    await page.screenshot({
      path: practiceScreenshotPath,
      fullPage: false,
      type: "png",
    });
  }
  await page.evaluate(() =>
    (window as InstrumentedWindow).__wormifiPerf.reset("crowded-practice-input"),
  );
  const inputSamples = await collectInputSamples(page, "arena-canvas");
  await collectGarbage(cdp);
  const startHeap = await readHeapMiB(cdp);
  const profileMetricsBefore = cpuProfileEnabled
    ? await readPerformanceMetrics(cdp)
    : undefined;
  if (cpuProfileEnabled) {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.start");
  }
  await page.evaluate(() => {
    const instrumentedWindow = window as typeof window & {
      __wormifiPracticeRestart?: { count: number };
    };
    if (!instrumentedWindow.__wormifiPracticeRestart) {
      throw new Error("Practice restart controller was not installed");
    }
    instrumentedWindow.__wormifiPracticeRestart.count = 0;
    (window as InstrumentedWindow).__wormifiPerf.reset("crowded-practice");
  });
  const heapSamples: HeapSample[] = [{ elapsedMs: 0, usedMiB: startHeap }];
  const startedAt = Date.now();
  let nextHeapAt = rawHeapSeriesEnabled
    ? startedAt + 2_000
    : Number.POSITIVE_INFINITY;
  await startAutopilot(page, "arena-canvas");

  while (Date.now() - startedAt < sceneSeconds * 1_000) {
    if (Date.now() >= nextHeapAt) {
      heapSamples.push({
        elapsedMs: Date.now() - startedAt,
        usedMiB: await readHeapMiB(cdp),
      });
      nextHeapAt += 2_000;
    }
    await page.waitForTimeout(250);
  }

  const restarts = await page.evaluate(() => {
    const instrumentedWindow = window as typeof window & {
      __wormifiPracticeRestart?: { count: number; disconnect: () => void };
    };
    const count = instrumentedWindow.__wormifiPracticeRestart?.count ?? 0;
    instrumentedWindow.__wormifiPracticeRestart?.disconnect();
    delete instrumentedWindow.__wormifiPracticeRestart;
    return count;
  });
  await stopAutopilot(page);
  const samples = await page.evaluate(() => (window as InstrumentedWindow).__wormifiPerf.snapshot());
  samples.inputToNextCanvasPaintMs = inputSamples;
  if (cpuProfileEnabled && profileMetricsBefore) {
    const stopped = await cdp.send("Profiler.stop") as unknown as {
      profile: {
        startTime: number;
        endTime: number;
        nodes: Array<{
          id: number;
          callFrame: {
            functionName: string;
            url: string;
            lineNumber: number;
          };
        }>;
        samples?: number[];
        timeDeltas?: number[];
      };
    };
    practiceCpuProfile = summarizeCpuProfile(
      stopped.profile,
      profileMetricsBefore,
      await readPerformanceMetrics(cdp),
    );
    await cdp.send("Profiler.disable");
  }
  await collectGarbage(cdp);
  const endHeap = await readHeapMiB(cdp);
  heapSamples.push({ elapsedMs: Date.now() - startedAt, usedMiB: endHeap });
  const report = buildSceneReport("crowded-practice", samples, heapSamples, startHeap, endHeap, restarts);
  return report;
}

async function measureLive(
  page: Page,
  cdp: CDPSession,
  websocketUrl: string,
): Promise<SceneReport> {
  const room = `smoothness-${Date.now().toString(36)}`;
  await page.goto(`/?room=${room}&arena_ws=${encodeURIComponent(websocketUrl)}`);
  await page.getByLabel("Your arena name").fill("Smoothness Proof");
  await page.getByTestId("live-lab-button").click();
  const arena = page.getByTestId("live-arena-canvas");
  await expect(page.getByTestId("live-status")).toHaveText("LIVE · SERVER AUTHORITATIVE");
  await expect(arena).toHaveAttribute("data-authority", "server-confirmed");
  await expect(arena).toHaveAttribute(
    "data-player-count",
    String(LIVE_SPATIAL_PROFILE.targetPopulation),
  );
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(3_000);
  if (liveScreenshotPath) {
    await mkdir(path.dirname(liveScreenshotPath), { recursive: true });
    await page.screenshot({
      path: liveScreenshotPath,
      fullPage: false,
      type: "png",
    });
  }
  await page.evaluate(() =>
    (window as InstrumentedWindow).__wormifiPerf.reset("authoritative-live-input"),
  );
  const inputSamples = await collectInputSamples(page, "live-arena-canvas");
  await collectGarbage(cdp);
  const startHeap = await readHeapMiB(cdp);
  const profileMetricsBefore = cpuProfileEnabled
    ? await readPerformanceMetrics(cdp)
    : undefined;
  if (cpuProfileEnabled) {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.start");
  }
  await page.evaluate(() => (window as InstrumentedWindow).__wormifiPerf.reset("authoritative-live"));
  const heapSamples: HeapSample[] = [{ elapsedMs: 0, usedMiB: startHeap }];
  const startedAt = Date.now();
  let nextHeapAt = rawHeapSeriesEnabled
    ? startedAt + 2_000
    : Number.POSITIVE_INFINITY;
  await startAutopilot(page, "live-arena-canvas");

  while (Date.now() - startedAt < sceneSeconds * 1_000) {
    if (Date.now() >= nextHeapAt) {
      heapSamples.push({
        elapsedMs: Date.now() - startedAt,
        usedMiB: await readHeapMiB(cdp),
      });
      nextHeapAt += 2_000;
    }
    await page.waitForTimeout(250);
  }

  await stopAutopilot(page);
  const samples = await page.evaluate(() => (window as InstrumentedWindow).__wormifiPerf.snapshot());
  samples.inputToNextCanvasPaintMs = inputSamples;
  if (cpuProfileEnabled && profileMetricsBefore) {
    const stopped = await cdp.send("Profiler.stop") as unknown as {
      profile: {
        startTime: number;
        endTime: number;
        nodes: Array<{
          id: number;
          callFrame: {
            functionName: string;
            url: string;
            lineNumber: number;
          };
        }>;
        samples?: number[];
        timeDeltas?: number[];
      };
    };
    liveCpuProfile = summarizeCpuProfile(
      stopped.profile,
      profileMetricsBefore,
      await readPerformanceMetrics(cdp),
    );
    await cdp.send("Profiler.disable");
  }
  await collectGarbage(cdp);
  const endHeap = await readHeapMiB(cdp);
  heapSamples.push({ elapsedMs: Date.now() - startedAt, usedMiB: endHeap });
  const report = buildSceneReport("authoritative-live", samples, heapSamples, startHeap, endHeap, 0);
  return report;
}

async function collectInputSamples(page: Page, arenaTestId: string): Promise<number[]> {
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
  const before = await page.evaluate(() =>
    (window as InstrumentedWindow).__wormifiPerf.snapshot().inputToNextCanvasPaintMs.length,
  );
  for (let index = 0; index < 24; index += 1) {
    await page.evaluate((label) =>
      (window as InstrumentedWindow).__wormifiPerf.armInput(label),
    `${arenaTestId}-${index}`);
    await page.keyboard.press(keys[index % keys.length]);
    await expect.poll(async () =>
      await page.evaluate(() =>
        (window as InstrumentedWindow).__wormifiPerf.snapshot().inputToNextCanvasPaintMs.length,
      ),
    ).toBeGreaterThan(before + index);
    await page.waitForTimeout(35);
  }
  const samples = await page.evaluate(() =>
    (window as InstrumentedWindow).__wormifiPerf.snapshot().inputToNextCanvasPaintMs,
  );
  return samples.slice(before);
}

async function startAutopilot(page: Page, arenaTestId: string): Promise<void> {
  await page.evaluate((testId) => {
    const instrumented = window as InstrumentedWindow;
    if (instrumented.__wormifiPerfSteerTimer !== undefined) {
      window.clearInterval(instrumented.__wormifiPerfSteerTimer);
    }
    let step = 0;
    instrumented.__wormifiPerfSteerTimer = window.setInterval(() => {
      const arena = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
      if (!arena) return;
      const rect = arena.getBoundingClientRect();
      const angle = step * 0.16;
      step += 1;
      arena.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        pointerType: "mouse",
        clientX: rect.left + rect.width / 2 + Math.cos(angle) * Math.min(280, rect.width * 0.34),
        clientY: rect.top + rect.height / 2 + Math.sin(angle) * Math.min(280, rect.height * 0.34),
      }));
    }, 250);
  }, arenaTestId);
}

async function stopAutopilot(page: Page): Promise<void> {
  await page.evaluate(() => {
    const instrumented = window as InstrumentedWindow;
    if (instrumented.__wormifiPerfSteerTimer !== undefined) {
      window.clearInterval(instrumented.__wormifiPerfSteerTimer);
      delete instrumented.__wormifiPerfSteerTimer;
    }
  });
}

function buildSceneReport(
  scene: SceneReport["scene"],
  samples: BrowserSamples,
  heapSamples: HeapSample[],
  startHeap: number,
  endHeap: number,
  restarts: number,
): SceneReport {
  const seconds = samples.measuredForMs / 1_000;
  const canvasGap = summarize(samples.canvasFrameGapsMs);
  const callbackDuration = summarize(samples.animationCallbackDurationsMs);
  const inputToPaint = summarize(samples.inputToNextCanvasPaintMs);
  const slowCanvasCount = samples.canvasFrameGapsMs.filter(
    (value) => value > thresholds.slowCanvasFrameThresholdMs,
  ).length;
  const slowCanvasRatio = slowCanvasCount / Math.max(1, samples.canvasFrameGapsMs.length);
  const blockingMs = samples.longTasks.reduce(
    (total, entry) => total + Math.max(0, entry.duration - 50),
    0,
  );
  const minuteScale = 60 / Math.max(1, seconds);
  const canvasFramesPerSecond = samples.canvasPaints / Math.max(0.001, seconds);
  const heapSlope = rawHeapSeriesEnabled
    ? linearSlopePerMinute(heapSamples)
    : null;
  const attributedScripts = new Map<string, {
    durationMs: number;
    functionName: string;
    sourceURL: string;
  }>();
  for (const frame of samples.longAnimationFrames) {
    for (const script of frame.scripts) {
      const key = `${script.sourceURL}\u0000${script.functionName}`;
      const current = attributedScripts.get(key) ?? {
        durationMs: 0,
        functionName: script.functionName,
        sourceURL: script.sourceURL,
      };
      current.durationMs += script.duration;
      attributedScripts.set(key, current);
    }
  }
  const gates: Record<string, boolean> = {
    canvasFramesPerSecond:
      canvasFramesPerSecond >= thresholds.averageCanvasFramesPerSecondMinimum,
    canvasFrameGapP95:
      canvasGap.p95 <= thresholds.canvasFrameGapP95MsMaximum,
    canvasFrameGapP99:
      canvasGap.p99 <= thresholds.canvasFrameGapP99MsMaximum,
    slowCanvasFrameRatio:
      slowCanvasRatio <= thresholds.slowCanvasFrameRatioMaximum,
    animationCallbackP95:
      callbackDuration.p95 <= thresholds.animationCallbackP95MsMaximum,
    animationCallbackP99:
      callbackDuration.p99 <= thresholds.animationCallbackP99MsMaximum,
    inputToNextPaintP95:
      inputToPaint.p95 <= thresholds.inputToNextCanvasPaintP95MsMaximum,
    inputToNextPaintP99:
      inputToPaint.p99 <= thresholds.inputToNextCanvasPaintP99MsMaximum,
    longTaskCount:
      !samples.performanceObserverSupported ||
      samples.longTasks.length * minuteScale <= thresholds.longTaskCountPerMinuteMaximum,
    longTaskBlockingTime:
      !samples.performanceObserverSupported ||
      blockingMs * minuteScale <= thresholds.longTaskBlockingMsPerMinuteMaximum,
    retainedHeapGrowth:
      endHeap - startHeap <= thresholds.retainedHeapGrowthMiBMaximum,
    // Short raw-heap samples are GC-phase sensitive. The slope becomes a gate
    // only for the documented 60-minute+ soak; post-GC retained growth is
    // still enforced on every run.
    sampledHeapSlope:
      heapSlope === null || heapSlope <= thresholds.sampledHeapSlopeMiBPerMinuteMaximum,
  };

  let live: SceneReport["live"];
  if (scene === "authoritative-live") {
    const snapshotGaps = successiveGaps(samples.snapshotArrivalAtMs);
    const snapshotSummary = summarize(snapshotGaps);
    const dropSummary = summarize(samples.liveDropCounts.map((entry) => entry.count));
    const snapshotsPerSecond = samples.snapshotArrivalAtMs.length / Math.max(0.001, seconds);
    gates.snapshotDeliveryRate = snapshotsPerSecond >= thresholds.liveSnapshotsPerSecondMinimum;
    gates.snapshotGapP95 = snapshotSummary.p95 <= thresholds.liveSnapshotGapP95MsMaximum;
    gates.snapshotGapP99 = snapshotSummary.p99 <= thresholds.liveSnapshotGapP99MsMaximum;
    gates.groundDropFloor = dropSummary.min >= thresholds.liveGroundDropsMinimum;
    gates.groundDropCeiling = dropSummary.max <= thresholds.liveGroundDropsMaximum;
    live = {
      websocketMessages: samples.websocketMessages,
      snapshots: samples.snapshotArrivalAtMs.length,
      snapshotsPerSecond: round(snapshotsPerSecond),
      snapshotInterArrivalMs: snapshotSummary,
      groundDropCount: dropSummary,
      messageHandlerDurationMs: summarize(samples.websocketMessageHandlerDurationsMs),
    };
  }

  return {
    scene,
    configuredSeconds: sceneSeconds,
    actualMeasuredSeconds: round(seconds),
    canvasFramesPerSecond: round(canvasFramesPerSecond),
    displayFrameGapMs: summarize(samples.displayFrameGapsMs),
    canvasFrameGapMs: canvasGap,
    animationCallbackDurationMs: callbackDuration,
    inputToNextCanvasPaintMs: inputToPaint,
    slowCanvasFrames: {
      thresholdMs: thresholds.slowCanvasFrameThresholdMs,
      count: slowCanvasCount,
      ratio: round(slowCanvasRatio),
    },
    longTasks: {
      supported: samples.performanceObserverSupported,
      count: samples.longTasks.length,
      countPerMinute: round(samples.longTasks.length * minuteScale),
      totalDurationMs: round(samples.longTasks.reduce((sum, entry) => sum + entry.duration, 0)),
      durationMs: summarize(samples.longTasks.map((entry) => entry.duration)),
      blockingMs: round(blockingMs),
      blockingMsPerMinute: round(blockingMs * minuteScale),
      entries: samples.longTasks.map((entry) => ({
        duration: round(entry.duration),
        startTime: round(entry.startTime),
      })),
      longAnimationFrames: {
        supported: samples.longAnimationFrameObserverSupported,
        count: samples.longAnimationFrames.length,
        durationMs: summarize(samples.longAnimationFrames.map((entry) => entry.duration)),
        blockingDurationMs: summarize(
          samples.longAnimationFrames.map((entry) => entry.blockingDuration),
        ),
        topAttributedScripts: [...attributedScripts.values()]
          .sort((first, second) => second.durationMs - first.durationMs)
          .slice(0, 12)
          .map((entry) => ({ ...entry, durationMs: round(entry.durationMs) })),
      },
    },
    heap: {
      samplingMode: rawHeapSeriesEnabled
        ? "raw-heap-series"
        : "post-gc-endpoints",
      startAfterGcMiB: round(startHeap),
      endAfterGcMiB: round(endHeap),
      retainedGrowthMiB: round(endHeap - startHeap),
      peakSampleMiB: rawHeapSeriesEnabled
        ? round(Math.max(...heapSamples.map((sample) => sample.usedMiB)))
        : null,
      sampleSlopeMiBPerMinute: heapSlope === null ? null : round(heapSlope),
      sampleSlopeGateEligible: rawHeapSeriesEnabled,
      samples: heapSamples.map((sample) => ({
        elapsedMs: sample.elapsedMs,
        usedMiB: round(sample.usedMiB),
      })),
    },
    session: {
      restarts,
      canvasPaints: samples.canvasPaints,
      lifecycleMarks: samples.lifecycleMarks.map((mark) => ({
        name: mark.name,
        startTime: round(mark.startTime),
      })),
    },
    environmentDiagnostic: {
      pass:
        canvasFramesPerSecond >= environmentDiagnostics.minimumCanvasFramesPerSecond &&
        canvasGap.p95 <= environmentDiagnostics.canvasFrameGapP95MsMaximum &&
        canvasGap.p99 <= environmentDiagnostics.canvasFrameGapP99MsMaximum,
      note: "Diagnostic only; it never changes the release verdict or its 55 FPS / 22 ms p95 budget.",
    },
    live,
    gates,
    pass: Object.values(gates).every(Boolean),
  };
}

async function installPerformanceProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const nativeRaf = window.requestAnimationFrame.bind(window);
    const nativeSetTransform = CanvasRenderingContext2D.prototype.setTransform;
    const NativeWebSocket = window.WebSocket;
    const nativeJsonParse = JSON.parse;
    let active = false;
    let label = "idle";
    let measurementStartedAt = performance.now();
    let lastDisplayFrameAt: number | undefined;
    let lastCanvasPaintAt: number | undefined;
    let armedInputLabel: string | undefined;
    let pendingInputAt: number | undefined;
    let displayFrameGapsMs: number[] = [];
    let canvasFrameGapsMs: number[] = [];
    let animationCallbackDurationsMs: number[] = [];
    let inputToNextCanvasPaintMs: number[] = [];
    let longTasks: Array<{ duration: number; startTime: number }> = [];
    let lifecycleMarks: Array<{ name: string; startTime: number }> = [];
    let pendingCanvasLifecycleName: string | undefined;
    let snapshotArrivalAtMs: number[] = [];
    let liveDropCounts: Array<{ atMs: number; count: number }> = [];
    let canvasPaints = 0;
    let websocketMessages = 0;
    let websocketMessageHandlerDurationsMs: number[] = [];
    let longAnimationFrames: BrowserSamples["longAnimationFrames"] = [];
    const longAnimationFrameObserverSupported =
      PerformanceObserver.supportedEntryTypes.includes("long-animation-frame");
    let currentDropIds = new Set<string>();
    let performanceObserverSupported = false;

    const cap = (values: number[], maximum = 1_500_000) => {
      if (values.length > maximum) values.splice(0, values.length - maximum);
    };
    const isArenaCanvas = (canvas: HTMLCanvasElement) =>
      Boolean(canvas.closest('[data-testid="arena-canvas"], [data-testid="live-arena-canvas"]'));

    const patchedSetTransform = function (
      this: CanvasRenderingContext2D,
      ...args: unknown[]
    ) {
      if (active && isArenaCanvas(this.canvas)) {
        const now = performance.now();
        canvasPaints += 1;
        if (lastCanvasPaintAt !== undefined) canvasFrameGapsMs.push(now - lastCanvasPaintAt);
        lastCanvasPaintAt = now;
        if (pendingInputAt !== undefined) {
          inputToNextCanvasPaintMs.push(now - pendingInputAt);
          pendingInputAt = undefined;
          armedInputLabel = undefined;
        }
        if (pendingCanvasLifecycleName !== undefined) {
          lifecycleMarks.push({ name: pendingCanvasLifecycleName, startTime: now });
          pendingCanvasLifecycleName = undefined;
        }
        cap(canvasFrameGapsMs);
      }
      return Reflect.apply(nativeSetTransform, this, args);
    };
    CanvasRenderingContext2D.prototype.setTransform =
      patchedSetTransform as typeof nativeSetTransform;

    window.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      nativeRaf((timestamp) => {
        const startedAt = performance.now();
        callback(timestamp);
        if (active && document.querySelector('[data-testid="arena-canvas"], [data-testid="live-arena-canvas"]')) {
          animationCallbackDurationsMs.push(performance.now() - startedAt);
          cap(animationCallbackDurationsMs);
        }
      })) as typeof window.requestAnimationFrame;

    const displayProbe = (timestamp: number) => {
      if (active) {
        if (lastDisplayFrameAt !== undefined) displayFrameGapsMs.push(timestamp - lastDisplayFrameAt);
        lastDisplayFrameAt = timestamp;
        cap(displayFrameGapsMs);
      }
      nativeRaf(displayProbe);
    };
    nativeRaf(displayProbe);

    window.addEventListener("keydown", () => {
      if (active && armedInputLabel && pendingInputAt === undefined) pendingInputAt = performance.now();
    }, { capture: true });
    window.addEventListener("pointermove", () => {
      if (active && armedInputLabel && pendingInputAt === undefined) pendingInputAt = performance.now();
    }, { capture: true, passive: true });

    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          if (!active) return;
          for (const entry of list.getEntries()) {
            longTasks.push({ duration: entry.duration, startTime: entry.startTime });
          }
        });
        observer.observe({ entryTypes: ["longtask"] });
        performanceObserverSupported = true;
      } catch {
        performanceObserverSupported = false;
      }
      try {
        if (!longAnimationFrameObserverSupported) throw new Error("unsupported");
        const animationObserver = new PerformanceObserver((list) => {
          if (!active) return;
          for (const entry of list.getEntries()) {
            const animationFrame = entry as PerformanceEntry & {
              blockingDuration?: number;
              scripts?: Array<{
                duration?: number;
                functionName?: string;
                sourceURL?: string;
              }>;
            };
            longAnimationFrames.push({
              duration: animationFrame.duration,
              blockingDuration: animationFrame.blockingDuration ?? 0,
              scripts: (animationFrame.scripts ?? []).map((script) => ({
                duration: script.duration ?? 0,
                functionName: script.functionName ?? "(anonymous)",
                sourceURL: script.sourceURL ?? "",
              })),
            });
          }
        });
        animationObserver.observe({ type: "long-animation-frame" });
      } catch {
        // Optional attribution; the broadly supported longtask entry remains the gate.
      }
    }

    const observeParsedMessage = (parsed: unknown) => {
      if (!parsed || typeof parsed !== "object") return;
      const message = parsed as {
        type?: string;
        authority?: string;
        drops?: Array<{ id?: string }>;
        dropUpserts?: Array<{ id?: string }>;
        removedDropIds?: string[];
      };
      if (message.authority !== "server") return;
      if (active) websocketMessages += 1;
      if (message.type === "world" && Array.isArray(message.drops)) {
        currentDropIds = new Set(message.drops.flatMap((drop) =>
          typeof drop.id === "string" ? [drop.id] : [],
        ));
        if (active) {
          liveDropCounts.push({ atMs: performance.now(), count: currentDropIds.size });
        }
      }
      if (message.type === "snapshot") {
        if (active) snapshotArrivalAtMs.push(performance.now());
        for (const id of message.removedDropIds ?? []) currentDropIds.delete(id);
        for (const drop of message.dropUpserts ?? []) {
          if (typeof drop.id === "string") currentDropIds.add(drop.id);
        }
        if (active) {
          liveDropCounts.push({ atMs: performance.now(), count: currentDropIds.size });
        }
      }
    };
    const patchedJsonParse = function (...args: unknown[]) {
      const parsed = Reflect.apply(nativeJsonParse, JSON, args) as unknown;
      observeParsedMessage(parsed);
      return parsed;
    };
    JSON.parse = patchedJsonParse as typeof nativeJsonParse;

    const socketPrototype = NativeWebSocket.prototype as unknown as {
      addEventListener: (...args: unknown[]) => void;
    };
    const nativeSocketAddEventListener = socketPrototype.addEventListener;
    socketPrototype.addEventListener = function (
      this: WebSocket,
      type: unknown,
      listener: unknown,
      options?: unknown,
    ) {
      if (type !== "message" || !listener) {
        Reflect.apply(nativeSocketAddEventListener, this, [type, listener, options]);
        return;
      }
      const wrapped = (event: MessageEvent) => {
        const startedAt = performance.now();
        try {
          if (typeof listener === "function") {
            Reflect.apply(listener, this, [event]);
          } else {
            const objectListener = listener as { handleEvent?: (value: Event) => void };
            objectListener.handleEvent?.(event);
          }
        } finally {
          if (active) {
            websocketMessageHandlerDurationsMs.push(performance.now() - startedAt);
          }
        }
      };
      Reflect.apply(nativeSocketAddEventListener, this, [type, wrapped, options]);
    };

    const state: PerformanceState = {
      reset(nextLabel) {
        active = true;
        label = nextLabel;
        measurementStartedAt = performance.now();
        lastDisplayFrameAt = undefined;
        lastCanvasPaintAt = undefined;
        armedInputLabel = undefined;
        pendingInputAt = undefined;
        displayFrameGapsMs = [];
        canvasFrameGapsMs = [];
        animationCallbackDurationsMs = [];
        inputToNextCanvasPaintMs = [];
        longTasks = [];
        lifecycleMarks = [];
        pendingCanvasLifecycleName = undefined;
        snapshotArrivalAtMs = [];
        liveDropCounts = currentDropIds.size > 0
          ? [{ atMs: measurementStartedAt, count: currentDropIds.size }]
          : [];
        canvasPaints = 0;
        websocketMessages = 0;
        websocketMessageHandlerDurationsMs = [];
        longAnimationFrames = [];
      },
      armInput(nextLabel) {
        armedInputLabel = nextLabel;
        pendingInputAt = undefined;
      },
      markLifecycle(name) {
        if (active) lifecycleMarks.push({ name, startTime: performance.now() });
      },
      markNextCanvas(name) {
        if (active) pendingCanvasLifecycleName = name;
      },
      snapshot() {
        return {
          label,
          measuredForMs: performance.now() - measurementStartedAt,
          displayFrameGapsMs: [...displayFrameGapsMs],
          canvasFrameGapsMs: [...canvasFrameGapsMs],
          animationCallbackDurationsMs: [...animationCallbackDurationsMs],
          inputToNextCanvasPaintMs: [...inputToNextCanvasPaintMs],
          longTasks: [...longTasks],
          lifecycleMarks: [...lifecycleMarks],
          snapshotArrivalAtMs: [...snapshotArrivalAtMs],
          liveDropCounts: [...liveDropCounts],
          canvasPaints,
          websocketMessages,
          websocketMessageHandlerDurationsMs: [...websocketMessageHandlerDurationsMs],
          longAnimationFrames: [...longAnimationFrames],
          longAnimationFrameObserverSupported,
          performanceObserverSupported,
        };
      },
    };
    (window as InstrumentedWindow).__wormifiPerf = state;
  });
}

async function collectGarbage(cdp: CDPSession): Promise<void> {
  await cdp.send("HeapProfiler.collectGarbage");
}

async function readHeapMiB(cdp: CDPSession): Promise<number> {
  const metrics = await readPerformanceMetrics(cdp);
  const bytes = metrics.JSHeapUsedSize;
  if (bytes === undefined) throw new Error("Chromium did not expose JSHeapUsedSize.");
  return bytes / 1024 / 1024;
}

async function readPerformanceMetrics(cdp: CDPSession): Promise<Record<string, number>> {
  const response = await cdp.send("Performance.getMetrics") as {
    metrics: Array<{ name: string; value: number }>;
  };
  return Object.fromEntries(response.metrics.map((metric) => [metric.name, metric.value]));
}

function summarizeCpuProfile(
  profile: {
    startTime: number;
    endTime: number;
    nodes: Array<{
      id: number;
      callFrame: { functionName: string; url: string; lineNumber: number };
    }>;
    samples?: number[];
    timeDeltas?: number[];
  },
  metricsBefore: Record<string, number>,
  metricsAfter: Record<string, number>,
): CpuProfileSummary {
  const samples = profile.samples ?? [];
  const deltas = profile.timeDeltas ?? [];
  const selfMicroseconds = new Map<number, number>();
  const sampleCounts = new Map<number, number>();
  for (let index = 0; index < samples.length; index += 1) {
    const id = samples[index];
    if (id === undefined) continue;
    selfMicroseconds.set(id, (selfMicroseconds.get(id) ?? 0) + (deltas[index] ?? 0));
    sampleCounts.set(id, (sampleCounts.get(id) ?? 0) + 1);
  }
  const metricNames = [
    "TaskDuration",
    "ScriptDuration",
    "LayoutDuration",
    "RecalcStyleDuration",
    "V8CompileDuration",
    "JSHeapUsedSize",
    "Nodes",
    "JSEventListeners",
  ];
  return {
    measuredMs: round((profile.endTime - profile.startTime) / 1_000),
    samples: samples.length,
    topSelfTime: profile.nodes
      .map((node) => ({
        functionName: node.callFrame.functionName || "(anonymous)",
        url: node.callFrame.url,
        line: node.callFrame.lineNumber + 1,
        selfMs: round((selfMicroseconds.get(node.id) ?? 0) / 1_000),
        sampleCount: sampleCounts.get(node.id) ?? 0,
      }))
      .filter((entry) => entry.selfMs > 0)
      .sort((first, second) => second.selfMs - first.selfMs)
      .slice(0, 20),
    performanceMetricDelta: Object.fromEntries(metricNames.flatMap((name) => {
      const before = metricsBefore[name];
      const after = metricsAfter[name];
      return before === undefined || after === undefined
        ? []
        : [[name, round(after - before)]];
    })),
  };
}

function summarize(values: readonly number[]): Summary {
  if (values.length === 0) {
    return { count: 0, min: 0, mean: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (ratio: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0;
  return {
    count: sorted.length,
    min: round(sorted[0] ?? 0),
    mean: round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    p50: round(percentile(0.5)),
    p95: round(percentile(0.95)),
    p99: round(percentile(0.99)),
    max: round(sorted.at(-1) ?? 0),
  };
}

function successiveGaps(values: readonly number[]): number[] {
  const gaps: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    gaps.push((values[index] ?? 0) - (values[index - 1] ?? 0));
  }
  return gaps;
}

function linearSlopePerMinute(samples: readonly HeapSample[]): number {
  if (samples.length < 2) return 0;
  const xs = samples.map((sample) => sample.elapsedMs / 60_000);
  const ys = samples.map((sample) => sample.usedMiB);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const numerator = xs.reduce(
    (sum, value, index) => sum + (value - meanX) * ((ys[index] ?? meanY) - meanY),
    0,
  );
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  return denominator === 0 ? 0 : numerator / denominator;
}

function boundedNumber(
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

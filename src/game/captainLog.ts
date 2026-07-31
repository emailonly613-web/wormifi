import type { CaptainRunSource, CaptainRunSummary } from "./captainProgression";

export const CAPTAIN_LOG_STORAGE_KEY = "wormifi.captain-log.v1";
const MAX_RECENT_RUNS = 8;

export type CaptainOrderId =
  | "complete-run"
  | "score-750"
  | "score-2000"
  | "cut-rival"
  | "top-three"
  | "deep-growth"
  | "live-water";

export interface CaptainDailyStats {
  dayKey: string;
  runs: number;
  bestScore: number;
  kills: number;
  bestRank: number;
  peakMass: number;
  liveRuns: number;
}

export interface CaptainLogRun extends CaptainRunSummary {
  endedAtMs: number;
}

export interface CaptainLogState {
  version: 1;
  totalRuns: number;
  totalScore: number;
  totalKills: number;
  bestScore: number;
  bestRank: number;
  bestPeakMass: number;
  liveRuns: number;
  soloRuns: number;
  daily: CaptainDailyStats;
  recentRuns: CaptainLogRun[];
  updatedAtMs: number;
}

export interface CaptainOrderDefinition {
  id: CaptainOrderId;
  label: string;
  detail: string;
  metric: keyof Omit<CaptainDailyStats, "dayKey"> | "topThree";
  target: number;
}

export interface CaptainOrderProgress extends CaptainOrderDefinition {
  current: number;
  percent: number;
  complete: boolean;
}

export interface CaptainMasteryProgress {
  id: string;
  label: string;
  detail: string;
  current: number;
  target: number;
  percent: number;
  earned: boolean;
}

export interface CaptainLogAward {
  state: CaptainLogState;
  newlyEarnedMasteries: CaptainMasteryProgress[];
  newlyCompletedOrders: CaptainOrderProgress[];
  nextOrder?: CaptainOrderProgress;
}

export interface CaptainDepthRunUpdate {
  xpAwarded: number;
  level: number;
  leveledUp: boolean;
  newlyEarnedMasteries: string[];
  newlyCompletedOrders: string[];
  nextOrder?: string;
  verifiedXpPending: boolean;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const EMPTY_DAILY: CaptainDailyStats = Object.freeze({
  dayKey: "",
  runs: 0,
  bestScore: 0,
  kills: 0,
  bestRank: 0,
  peakMass: 0,
  liveRuns: 0,
});

const EMPTY_LOG: CaptainLogState = Object.freeze({
  version: 1,
  totalRuns: 0,
  totalScore: 0,
  totalKills: 0,
  bestScore: 0,
  bestRank: 0,
  bestPeakMass: 0,
  liveRuns: 0,
  soloRuns: 0,
  daily: EMPTY_DAILY,
  recentRuns: [],
  updatedAtMs: 0,
});

const ORDER_DEFINITIONS: Readonly<Record<CaptainOrderId, CaptainOrderDefinition>> = Object.freeze({
  "complete-run": Object.freeze({
    id: "complete-run",
    label: "LEAVE A WAKE",
    detail: "Complete one arena run",
    metric: "runs",
    target: 1,
  }),
  "score-750": Object.freeze({
    id: "score-750",
    label: "TREASURE RUN",
    detail: "Score 750 in one run",
    metric: "bestScore",
    target: 750,
  }),
  "score-2000": Object.freeze({
    id: "score-2000",
    label: "GILDED WAKE",
    detail: "Score 2,000 in one run",
    metric: "bestScore",
    target: 2_000,
  }),
  "cut-rival": Object.freeze({
    id: "cut-rival",
    label: "CHAIN CUTTER",
    detail: "Cut one rival crew",
    metric: "kills",
    target: 1,
  }),
  "top-three": Object.freeze({
    id: "top-three",
    label: "TOP TIDE",
    detail: "Finish a run in the top three",
    metric: "topThree",
    target: 1,
  }),
  "deep-growth": Object.freeze({
    id: "deep-growth",
    label: "DEEP HULL",
    detail: "Reach 75 peak size",
    metric: "peakMass",
    target: 75,
  }),
  "live-water": Object.freeze({
    id: "live-water",
    label: "OPEN WATER",
    detail: "Complete one live-room life",
    metric: "liveRuns",
    target: 1,
  }),
});

function browserStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function safeWhole(value: unknown, maximum = Number.MAX_SAFE_INTEGER): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(0, Math.trunc(value)))
    : 0;
}

function safeRank(value: unknown): number {
  const rank = safeWhole(value, 1_000_000);
  return rank > 0 ? rank : 0;
}

function safeSource(value: unknown): CaptainRunSource {
  return value === "live" || value === "rush" || value === "endless" || value === "practice"
    ? value
    : "practice";
}

export function captainDayKey(nowMs = Date.now()): string {
  const date = new Date(Number.isFinite(nowMs) ? nowMs : 0);
  return date.toISOString().slice(0, 10);
}

function emptyDaily(dayKey: string): CaptainDailyStats {
  return { ...EMPTY_DAILY, dayKey };
}

function normalizeDaily(value: unknown): CaptainDailyStats {
  if (typeof value !== "object" || value === null) return { ...EMPTY_DAILY };
  const candidate = value as Partial<CaptainDailyStats>;
  return {
    dayKey: typeof candidate.dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(candidate.dayKey)
      ? candidate.dayKey
      : "",
    runs: safeWhole(candidate.runs, 10_000),
    bestScore: safeWhole(candidate.bestScore),
    kills: safeWhole(candidate.kills, 10_000),
    bestRank: safeRank(candidate.bestRank),
    peakMass: safeWhole(candidate.peakMass, 1_000_000),
    liveRuns: safeWhole(candidate.liveRuns, 10_000),
  };
}

function normalizeRun(value: unknown): CaptainLogRun | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Partial<CaptainLogRun>;
  return {
    source: safeSource(candidate.source),
    score: safeWhole(candidate.score),
    kills: safeWhole(candidate.kills, 100),
    rank: Math.max(1, safeRank(candidate.rank)),
    peakMass: safeWhole(candidate.peakMass, 1_000_000),
    endedAtMs: safeWhole(candidate.endedAtMs),
  };
}

export function normalizeCaptainLog(value: unknown): CaptainLogState {
  if (typeof value !== "object" || value === null) return structuredClone(EMPTY_LOG);
  const candidate = value as Partial<CaptainLogState>;
  if (candidate.version !== 1) return structuredClone(EMPTY_LOG);
  const recentRuns = Array.isArray(candidate.recentRuns)
    ? candidate.recentRuns
        .map(normalizeRun)
        .filter((run): run is CaptainLogRun => run !== undefined)
        .slice(0, MAX_RECENT_RUNS)
    : [];
  return {
    version: 1,
    totalRuns: safeWhole(candidate.totalRuns, 1_000_000),
    totalScore: safeWhole(candidate.totalScore),
    totalKills: safeWhole(candidate.totalKills, 1_000_000),
    bestScore: safeWhole(candidate.bestScore),
    bestRank: safeRank(candidate.bestRank),
    bestPeakMass: safeWhole(candidate.bestPeakMass, 1_000_000),
    liveRuns: safeWhole(candidate.liveRuns, 1_000_000),
    soloRuns: safeWhole(candidate.soloRuns, 1_000_000),
    daily: normalizeDaily(candidate.daily),
    recentRuns,
    updatedAtMs: safeWhole(candidate.updatedAtMs),
  };
}

export function readCaptainLog(
  storage: StorageLike | undefined = browserStorage(),
): CaptainLogState {
  try {
    const raw = storage?.getItem(CAPTAIN_LOG_STORAGE_KEY);
    return raw ? normalizeCaptainLog(JSON.parse(raw)) : structuredClone(EMPTY_LOG);
  } catch {
    return structuredClone(EMPTY_LOG);
  }
}

function orderSeed(dayKey: string): number {
  return [...dayKey].reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

export function dailyCaptainOrders(dayKey = captainDayKey()): readonly CaptainOrderDefinition[] {
  const seed = orderSeed(dayKey);
  const skill: readonly CaptainOrderId[] = ["score-750", "cut-rival", "deep-growth"];
  const ambition: readonly CaptainOrderId[] = ["top-three", "live-water", "score-2000"];
  return [
    ORDER_DEFINITIONS["complete-run"],
    ORDER_DEFINITIONS[skill[seed % skill.length]],
    ORDER_DEFINITIONS[ambition[(seed + 1) % ambition.length]],
  ];
}

function dailyForDay(state: CaptainLogState, dayKey: string): CaptainDailyStats {
  return state.daily.dayKey === dayKey ? state.daily : emptyDaily(dayKey);
}

export function captainOrderProgress(
  state: CaptainLogState,
  nowMs = Date.now(),
): CaptainOrderProgress[] {
  const dayKey = captainDayKey(nowMs);
  const daily = dailyForDay(state, dayKey);
  return dailyCaptainOrders(dayKey).map((order) => {
    const current = order.metric === "topThree"
      ? daily.bestRank > 0 && daily.bestRank <= 3 ? 1 : 0
      : daily[order.metric];
    return {
      ...order,
      current,
      percent: Math.min(100, Math.round((current / order.target) * 100)),
      complete: current >= order.target,
    };
  });
}

function progress(
  id: string,
  label: string,
  detail: string,
  current: number,
  target: number,
): CaptainMasteryProgress {
  return {
    id,
    label,
    detail,
    current,
    target,
    percent: Math.min(100, Math.round((current / target) * 100)),
    earned: current >= target,
  };
}

export function captainMasteryProgress(state: CaptainLogState): CaptainMasteryProgress[] {
  const topThree = state.bestRank > 0 && state.bestRank <= 3 ? 1 : 0;
  const crown = state.bestRank === 1 ? 1 : 0;
  return [
    progress("first-wake", "FIRST WAKE", "Complete your first run", state.totalRuns, 1),
    progress("sea-legs", "SEA LEGS", "Complete five runs", state.totalRuns, 5),
    progress("long-voyage", "LONG VOYAGE", "Complete twenty runs", state.totalRuns, 20),
    progress("treasure-mark", "TREASURE MARK", "Score 1,000 in one run", state.bestScore, 1_000),
    progress("gilded-wake", "GILDED WAKE", "Score 5,000 in one run", state.bestScore, 5_000),
    progress("chain-cutter", "CHAIN CUTTER", "Cut your first rival", state.totalKills, 1),
    progress("broadside", "BROADSIDE", "Cut ten rivals", state.totalKills, 10),
    progress("top-tide", "TOP TIDE", "Finish in the top three", topThree, 1),
    progress("crown-tide", "CROWN TIDE", "Finish a run in first place", crown, 1),
    progress("open-water", "OPEN WATER", "Complete three live-room lives", state.liveRuns, 3),
  ];
}

export function awardCaptainLogRun(
  summary: CaptainRunSummary,
  current: CaptainLogState = readCaptainLog(),
  storage: StorageLike | undefined = browserStorage(),
  nowMs = Date.now(),
): CaptainLogAward {
  const normalized = normalizeCaptainLog(current);
  const dayKey = captainDayKey(nowMs);
  const daily = dailyForDay(normalized, dayKey);
  const beforeOrders = new Set(
    captainOrderProgress({ ...normalized, daily }, nowMs)
      .filter((order) => order.complete)
      .map((order) => order.id),
  );
  const beforeMasteries = new Set(
    captainMasteryProgress(normalized)
      .filter((mastery) => mastery.earned)
      .map((mastery) => mastery.id),
  );
  const score = safeWhole(summary.score);
  const kills = safeWhole(summary.kills, 100);
  const rank = Math.max(1, safeRank(summary.rank));
  const peakMass = safeWhole(summary.peakMass, 1_000_000);
  const run: CaptainLogRun = {
    source: safeSource(summary.source),
    score,
    kills,
    rank,
    peakMass,
    endedAtMs: safeWhole(nowMs),
  };
  const nextDaily: CaptainDailyStats = {
    dayKey,
    runs: daily.runs + 1,
    bestScore: Math.max(daily.bestScore, score),
    kills: daily.kills + kills,
    bestRank: daily.bestRank === 0 ? rank : Math.min(daily.bestRank, rank),
    peakMass: Math.max(daily.peakMass, peakMass),
    liveRuns: daily.liveRuns + (summary.source === "live" ? 1 : 0),
  };
  const next: CaptainLogState = {
    version: 1,
    totalRuns: Math.min(1_000_000, normalized.totalRuns + 1),
    totalScore: Math.min(Number.MAX_SAFE_INTEGER, normalized.totalScore + score),
    totalKills: Math.min(1_000_000, normalized.totalKills + kills),
    bestScore: Math.max(normalized.bestScore, score),
    bestRank: normalized.bestRank === 0 ? rank : Math.min(normalized.bestRank, rank),
    bestPeakMass: Math.max(normalized.bestPeakMass, peakMass),
    liveRuns: Math.min(1_000_000, normalized.liveRuns + (summary.source === "live" ? 1 : 0)),
    soloRuns: Math.min(1_000_000, normalized.soloRuns + (summary.source === "live" ? 0 : 1)),
    daily: nextDaily,
    recentRuns: [run, ...normalized.recentRuns].slice(0, MAX_RECENT_RUNS),
    updatedAtMs: safeWhole(nowMs),
  };
  try {
    storage?.setItem(CAPTAIN_LOG_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Browser storage is optional. Play remains available even when the log
    // cannot persist on this device.
  }
  const orders = captainOrderProgress(next, nowMs);
  const masteries = captainMasteryProgress(next);
  return {
    state: next,
    newlyCompletedOrders: orders.filter((order) => order.complete && !beforeOrders.has(order.id)),
    newlyEarnedMasteries: masteries.filter((mastery) => mastery.earned && !beforeMasteries.has(mastery.id)),
    nextOrder: orders.find((order) => !order.complete),
  };
}

export const CAPTAIN_PROGRESSION_STORAGE_KEY = "wormifi.captain-progression.v1";
export const MAX_CAPTAIN_LEVEL = 20;

export type CaptainRunSource = "live" | "rush" | "endless" | "practice";

export interface CaptainRunSummary {
  source: CaptainRunSource;
  score: number;
  kills: number;
  rank: number;
  peakMass: number;
}

export interface CaptainProgression {
  version: 1;
  xp: number;
  completedRuns: number;
  totalScore: number;
  lastAwardXp: number;
  updatedAtMs: number;
}

export interface CaptainLevelProgress {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpForLevel: number;
  percent: number;
  maxed: boolean;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const EMPTY_PROGRESSION: CaptainProgression = Object.freeze({
  version: 1,
  xp: 0,
  completedRuns: 0,
  totalScore: 0,
  lastAwardXp: 0,
  updatedAtMs: 0,
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

/** Total XP required to enter a level. Level 1 starts at zero. */
export function captainXpFloor(level: number): number {
  const boundedLevel = Math.min(MAX_CAPTAIN_LEVEL, Math.max(1, Math.trunc(level)));
  let total = 0;
  for (let nextLevel = 2; nextLevel <= boundedLevel; nextLevel += 1) {
    total += 100 + (nextLevel - 2) * 35;
  }
  return total;
}

export const MAX_CAPTAIN_XP = captainXpFloor(MAX_CAPTAIN_LEVEL);

export function captainLevelProgress(xp: number): CaptainLevelProgress {
  const boundedXp = safeWhole(xp, MAX_CAPTAIN_XP);
  let level = 1;
  while (level < MAX_CAPTAIN_LEVEL && boundedXp >= captainXpFloor(level + 1)) level += 1;
  const currentLevelXp = captainXpFloor(level);
  const maxed = level === MAX_CAPTAIN_LEVEL;
  const nextLevelXp = maxed ? currentLevelXp : captainXpFloor(level + 1);
  const xpForLevel = Math.max(1, nextLevelXp - currentLevelXp);
  const xpIntoLevel = maxed ? xpForLevel : boundedXp - currentLevelXp;
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpForLevel,
    percent: maxed ? 100 : Math.round((xpIntoLevel / xpForLevel) * 100),
    maxed,
  };
}

export function normalizeCaptainProgression(value: unknown): CaptainProgression {
  if (typeof value !== "object" || value === null) return { ...EMPTY_PROGRESSION };
  const candidate = value as Partial<CaptainProgression>;
  if (candidate.version !== 1) return { ...EMPTY_PROGRESSION };
  return {
    version: 1,
    xp: safeWhole(candidate.xp, MAX_CAPTAIN_XP),
    completedRuns: safeWhole(candidate.completedRuns, 1_000_000),
    totalScore: safeWhole(candidate.totalScore),
    lastAwardXp: safeWhole(candidate.lastAwardXp, 300),
    updatedAtMs: safeWhole(candidate.updatedAtMs),
  };
}

export function readCaptainProgression(
  storage: StorageLike | undefined = browserStorage(),
): CaptainProgression {
  try {
    const raw = storage?.getItem(CAPTAIN_PROGRESSION_STORAGE_KEY);
    return raw ? normalizeCaptainProgression(JSON.parse(raw)) : { ...EMPTY_PROGRESSION };
  } catch {
    return { ...EMPTY_PROGRESSION };
  }
}

export function calculateCaptainRunXp(summary: CaptainRunSummary): number {
  const score = safeWhole(summary.score);
  const kills = safeWhole(summary.kills, 100);
  const peakMass = safeWhole(summary.peakMass, 1_000_000);
  if (score < 50 && kills === 0 && peakMass < 20) return 0;
  const participation = 30;
  const scoreXp = Math.min(160, Math.floor(score / 40));
  const cutXp = Math.min(90, kills * 30);
  const rankXp = summary.rank === 1 ? 45 : summary.rank <= 3 ? 20 : 0;
  const liveBonus = summary.source === "live" ? 10 : 0;
  return Math.min(300, participation + scoreXp + cutXp + rankXp + liveBonus);
}

export function awardCaptainRun(
  summary: CaptainRunSummary,
  current: CaptainProgression = readCaptainProgression(),
  storage: StorageLike | undefined = browserStorage(),
  nowMs = Date.now(),
): CaptainProgression {
  const award = calculateCaptainRunXp(summary);
  const next: CaptainProgression = {
    version: 1,
    xp: Math.min(MAX_CAPTAIN_XP, current.xp + award),
    completedRuns: Math.min(1_000_000, current.completedRuns + 1),
    totalScore: Math.min(Number.MAX_SAFE_INTEGER, current.totalScore + safeWhole(summary.score)),
    lastAwardXp: award,
    updatedAtMs: safeWhole(nowMs),
  };
  try {
    storage?.setItem(CAPTAIN_PROGRESSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // A blocked browser store never blocks play; this remains a preview until
    // the account-backed progression and entitlement service is built.
  }
  return next;
}

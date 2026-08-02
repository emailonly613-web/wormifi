import { describe, expect, it } from "vitest";
import {
  CAPTAIN_LOG_STORAGE_KEY,
  awardCaptainLogRun,
  captainDayKey,
  captainMasteryProgress,
  captainOrderProgress,
  dailyCaptainOrders,
  normalizeCaptainLog,
  readCaptainLog,
  reconcileCaptainLogHistory,
} from "../src/game/captainLog";
import { CAPTAIN_PROGRESSION_STORAGE_KEY } from "../src/game/captainProgression";

function memoryStorage(raw?: string) {
  const values = new Map<string, string>();
  if (raw !== undefined) values.set(CAPTAIN_LOG_STORAGE_KEY, raw);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

const STRONG_RUN = {
  source: "live" as const,
  score: 6_000,
  kills: 2,
  rank: 1,
  peakMass: 100,
};

describe("Captain's Log depth loop", () => {
  it("selects three deterministic, distinct daily orders", () => {
    const first = dailyCaptainOrders("2026-07-31");
    const second = dailyCaptainOrders("2026-07-31");
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(new Set(first.map((order) => order.id)).size).toBe(3);
    expect(first[0].id).toBe("complete-run");
  });

  it("records a voyage, clears orders, earns masteries, and persists it", () => {
    const storage = memoryStorage();
    const nowMs = Date.UTC(2026, 6, 31, 12, 0, 0);
    const award = awardCaptainLogRun(STRONG_RUN, readCaptainLog(storage), storage, nowMs);

    expect(award.state).toMatchObject({
      totalRuns: 1,
      totalScore: 6_000,
      totalKills: 2,
      bestScore: 6_000,
      bestRank: 1,
      bestPeakMass: 100,
      liveRuns: 1,
      soloRuns: 0,
    });
    expect(award.state.daily.dayKey).toBe("2026-07-31");
    expect(award.state.recentRuns[0]).toMatchObject(STRONG_RUN);
    expect(award.newlyCompletedOrders).toHaveLength(3);
    expect(award.newlyEarnedMasteries.map((mastery) => mastery.id)).toEqual(expect.arrayContaining([
      "first-wake",
      "treasure-mark",
      "gilded-wake",
      "chain-cutter",
      "top-tide",
      "crown-tide",
    ]));
    expect(readCaptainLog(storage)).toEqual(award.state);
  });

  it("resets daily progress without losing the lifetime record", () => {
    const firstDay = Date.UTC(2026, 6, 30, 18, 0, 0);
    const secondDay = Date.UTC(2026, 6, 31, 18, 0, 0);
    const first = awardCaptainLogRun(STRONG_RUN, undefined, undefined, firstDay).state;
    const next = awardCaptainLogRun({
      source: "rush",
      score: 100,
      kills: 0,
      rank: 8,
      peakMass: 20,
    }, first, undefined, secondDay).state;

    expect(next.totalRuns).toBe(2);
    expect(next.totalScore).toBe(6_100);
    expect(next.bestScore).toBe(6_000);
    expect(next.daily).toMatchObject({
      dayKey: "2026-07-31",
      runs: 1,
      bestScore: 100,
      bestRank: 8,
      kills: 0,
    });
    expect(captainOrderProgress(next, secondDay)[0].complete).toBe(true);
    expect(captainDayKey(firstDay)).not.toBe(captainDayKey(secondDay));
  });

  it("keeps only the eight newest voyage records", () => {
    let state = readCaptainLog(memoryStorage());
    const start = Date.UTC(2026, 6, 31, 1, 0, 0);
    for (let index = 0; index < 11; index += 1) {
      state = awardCaptainLogRun({
        source: "practice",
        score: index,
        kills: 0,
        rank: 10,
        peakMass: 10,
      }, state, undefined, start + index).state;
    }
    expect(state.recentRuns).toHaveLength(8);
    expect(state.recentRuns[0].score).toBe(10);
    expect(state.recentRuns[7].score).toBe(3);
  });

  it("carries truthful legacy run and score totals into the newer log", () => {
    const storage = memoryStorage();
    storage.setItem(CAPTAIN_PROGRESSION_STORAGE_KEY, JSON.stringify({
      version: 1,
      xp: 7_885,
      completedRuns: 295,
      totalScore: 94_200,
      lastAwardXp: 30,
      updatedAtMs: 2_000,
    }));
    const newerLog = awardCaptainLogRun(STRONG_RUN, readCaptainLog(storage), storage, 1_000).state;
    const reconciled = reconcileCaptainLogHistory(newerLog, {
      version: 1,
      xp: 7_885,
      completedRuns: 295,
      totalScore: 94_200,
      lastAwardXp: 30,
      updatedAtMs: 2_000,
    }, storage);

    expect(reconciled).toMatchObject({
      totalRuns: 295,
      totalScore: 94_200,
      totalKills: 2,
      bestScore: 6_000,
      updatedAtMs: 2_000,
    });
    expect(reconciled.recentRuns).toHaveLength(1);
    expect(readCaptainLog(storage)).toEqual(reconciled);
    expect(awardCaptainLogRun(STRONG_RUN, reconciled, storage, 3_000).state.totalRuns).toBe(296);
  });

  it("fails closed on malformed, future, or hostile browser data", () => {
    expect(readCaptainLog(memoryStorage("{broken"))).toMatchObject({ totalRuns: 0, recentRuns: [] });
    expect(normalizeCaptainLog({ version: 2, totalRuns: 900 })).toMatchObject({ totalRuns: 0 });
    const normalized = normalizeCaptainLog({
      version: 1,
      totalRuns: -5,
      totalScore: Number.POSITIVE_INFINITY,
      totalKills: "many",
      bestScore: -1,
      bestRank: -8,
      bestPeakMass: 99,
      liveRuns: 2,
      soloRuns: 3,
      daily: { dayKey: "not-a-day", runs: -3 },
      recentRuns: Array.from({ length: 10 }, (_, index) => ({
        source: "unknown",
        score: index,
        kills: -2,
        rank: 0,
        peakMass: -5,
        endedAtMs: -4,
      })),
      updatedAtMs: -10,
    });
    expect(normalized).toMatchObject({
      totalRuns: 0,
      totalScore: 0,
      totalKills: 0,
      bestScore: 0,
      bestRank: 0,
      bestPeakMass: 99,
      updatedAtMs: 0,
    });
    expect(normalized.daily.dayKey).toBe("");
    expect(normalized.recentRuns).toHaveLength(8);
    expect(captainMasteryProgress(normalized).every((mastery) => !mastery.earned)).toBe(true);
  });
});

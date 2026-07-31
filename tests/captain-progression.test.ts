import { describe, expect, it } from "vitest";
import {
  CAPTAIN_PROGRESSION_STORAGE_KEY,
  MAX_CAPTAIN_LEVEL,
  MAX_CAPTAIN_XP,
  awardCaptainRun,
  calculateCaptainRunXp,
  captainLevelProgress,
  captainXpFloor,
  normalizeCaptainProgression,
  readCaptainProgression,
} from "../src/game/captainProgression";

function memoryStorage(raw?: string) {
  const values = new Map<string, string>();
  if (raw !== undefined) values.set(CAPTAIN_PROGRESSION_STORAGE_KEY, raw);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("Captain progression preview", () => {
  it("uses a monotonic 20-level XP curve", () => {
    expect(captainXpFloor(1)).toBe(0);
    expect(captainXpFloor(2)).toBe(100);
    for (let level = 2; level <= MAX_CAPTAIN_LEVEL; level += 1) {
      expect(captainXpFloor(level)).toBeGreaterThan(captainXpFloor(level - 1));
    }
    expect(captainXpFloor(MAX_CAPTAIN_LEVEL)).toBe(MAX_CAPTAIN_XP);
    expect(captainLevelProgress(MAX_CAPTAIN_XP)).toMatchObject({
      level: MAX_CAPTAIN_LEVEL,
      percent: 100,
      maxed: true,
    });
  });

  it("awards bounded XP from completed play without accepting negative fields", () => {
    const ordinary = calculateCaptainRunXp({
      source: "rush",
      score: 1_200,
      kills: 2,
      rank: 2,
      peakMass: 48,
    });
    const live = calculateCaptainRunXp({
      source: "live",
      score: 1_200,
      kills: 2,
      rank: 2,
      peakMass: 48,
    });
    expect(ordinary).toBeGreaterThan(0);
    expect(live).toBe(ordinary + 10);
    expect(live).toBeLessThanOrEqual(300);
    expect(calculateCaptainRunXp({
      source: "practice",
      score: -10,
      kills: -3,
      rank: 99,
      peakMass: -8,
    })).toBe(0);
  });

  it("persists a completed run and advances the displayed level", () => {
    const storage = memoryStorage();
    const initial = readCaptainProgression(storage);
    const next = awardCaptainRun({
      source: "endless",
      score: 4_000,
      kills: 3,
      rank: 1,
      peakMass: 90,
    }, initial, storage, 1_700_000_000_000);
    expect(next.completedRuns).toBe(1);
    expect(next.lastAwardXp).toBeGreaterThan(0);
    expect(next.totalScore).toBe(4_000);
    expect(readCaptainProgression(storage)).toEqual(next);
    expect(captainLevelProgress(next.xp).level).toBeGreaterThan(1);
  });

  it("fails closed on malformed or future-version browser data", () => {
    expect(readCaptainProgression(memoryStorage("{broken"))).toMatchObject({ xp: 0, completedRuns: 0 });
    expect(normalizeCaptainProgression({ version: 2, xp: MAX_CAPTAIN_XP })).toMatchObject({ xp: 0 });
    expect(normalizeCaptainProgression({
      version: 1,
      xp: Number.POSITIVE_INFINITY,
      completedRuns: -5,
      totalScore: "a lot",
      lastAwardXp: 9000,
      updatedAtMs: -1,
    })).toEqual({
      version: 1,
      xp: 0,
      completedRuns: 0,
      totalScore: 0,
      lastAwardXp: 300,
      updatedAtMs: 0,
    });
  });
});

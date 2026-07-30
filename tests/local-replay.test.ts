import { describe, expect, it } from "vitest";
import {
  LOCAL_PLAYER_ID,
  advanceLocalReplayPreparation,
  buildLocalArena,
  checksumLocalArena,
  finalizeLocalRun,
  createLocalReplayPreparation,
  prepareLocalReplay,
  rebuildLocalRun,
  sanitizeLocalInput,
  stepLocalArena,
  type LocalRunDraft,
} from "../src/game/localArena";

function recordDeterministicRun(maximumTicks = 210) {
  const seed = "local-replay-proof-seed";
  const mode = "practice" as const;
  const playerName = "Replay Proof";
  const session = buildLocalArena(seed, playerName, mode);
  const draft: LocalRunDraft = { seed, mode, playerName, inputs: [] };

  for (let tick = 1; tick <= maximumTicks; tick += 1) {
    const player = session.state.players[LOCAL_PLAYER_ID];
    if (!player?.alive) break;
    const angle = tick * 0.027;
    const input = sanitizeLocalInput(
      tick,
      { x: Math.cos(angle) * 4, y: Math.sin(angle) * 4 },
      tick >= 24 && tick < 52,
      player.direction,
    );
    draft.inputs.push(input);
    stepLocalArena(session, input);
  }

  return {
    recording: finalizeLocalRun(draft, session.state),
    originalChecksum: checksumLocalArena(session.state),
    originalState: session.state,
  };
}

describe("deterministic local run replay", () => {
  it("stores finite normalized per-tick input and fails safely to the prior direction", () => {
    const normalized = sanitizeLocalInput(
      1,
      { x: 3, y: 4 },
      true,
      { x: 1, y: 0 },
    );
    expect(normalized.tick).toBe(1);
    expect(normalized.direction.x).toBeCloseTo(0.6, 12);
    expect(normalized.direction.y).toBeCloseTo(0.8, 12);
    expect(normalized.boost).toBe(true);
    expect(
      sanitizeLocalInput(
        2,
        { x: Number.NaN, y: Number.POSITIVE_INFINITY },
        false,
        { x: 0, y: -1 },
      ),
    ).toEqual({
      tick: 2,
      direction: { x: 0, y: -1 },
      boost: false,
    });
  });

  it("rebuilds the exact seed, bots, inputs, terminal state, and checksum", () => {
    const run = recordDeterministicRun();
    const first = rebuildLocalRun(run.recording);
    const second = rebuildLocalRun(run.recording);

    expect(run.recording.inputs).toHaveLength(run.recording.terminalTick);
    expect(first.checksum).toBe(run.originalChecksum);
    expect(second.checksum).toBe(first.checksum);
    expect(first.checksum).toBe(run.recording.terminalChecksum);
    expect(first.state.players[LOCAL_PLAYER_ID].position).toEqual(
      run.originalState.players[LOCAL_PLAYER_ID].position,
    );
    expect(first.state.randomState).toBe(run.originalState.randomState);
  });

  it("fast-forwards through the same simulation, then verifies the final replay window", () => {
    const run = recordDeterministicRun();
    const prepared = prepareLocalReplay(run.recording, 2);

    expect(prepared.state.tick).toBe(prepared.startTick);
    expect(prepared.endTick - prepared.startTick).toBeLessThanOrEqual(60);
    while (prepared.nextInputIndex < run.recording.inputs.length) {
      stepLocalArena(
        prepared,
        run.recording.inputs[prepared.nextInputIndex],
      );
      prepared.nextInputIndex += 1;
    }

    expect(prepared.state.tick).toBe(run.recording.terminalTick);
    expect(checksumLocalArena(prepared.state)).toBe(
      run.recording.terminalChecksum,
    );
  });

  it("bounds browser preparation work to the declared per-frame tick budget", () => {
    const run = recordDeterministicRun(210);
    const prepared = createLocalReplayPreparation(run.recording, 2);
    let yields = 0;

    while (prepared.nextInputIndex < prepared.startTick) {
      const before = prepared.nextInputIndex;
      const ready = advanceLocalReplayPreparation(prepared, 7);
      const advanced = prepared.nextInputIndex - before;
      expect(advanced).toBeGreaterThan(0);
      expect(advanced).toBeLessThanOrEqual(7);
      yields += 1;
      if (ready) break;
    }

    expect(yields).toBeGreaterThan(1);
    expect(prepared.state.tick).toBe(prepared.startTick);
  });

  it("rejects a recording whose tick stream cannot honestly reproduce the run", () => {
    const run = recordDeterministicRun(30);
    const corrupt = {
      ...run.recording,
      inputs: run.recording.inputs.map((input) => ({
        ...input,
        direction: { ...input.direction },
      })),
    };
    corrupt.inputs[12].tick = 99;

    expect(() => rebuildLocalRun(corrupt)).toThrow(/contiguous/u);
  });
});

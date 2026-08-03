import { describe, expect, it } from "vitest";

import {
  createGameState,
  spawnPlayer,
  stepGame,
} from "../src/game/core";
import {
  buildLocalArena,
  checksumLocalArena,
  finalizeLocalRun,
  LOCAL_PLAYER_ID,
  rebuildLocalRun,
  sanitizeLocalInput,
  stepLocalArena,
  type LocalRunDraft,
} from "../src/game/localArena";
import {
  GILDED_LEDGER_GROUND_COUNT,
  INITIAL_PIRATE_RELIC_KINDS,
  PIRATE_RELIC_RESPAWN_SECONDS,
  PirateRelicDirector,
  TREASURE_TIER_SEQUENCE,
} from "../src/game/relicDirector";
import {
  getDropRelicKind,
  getPirateRelicSpec,
} from "../src/game/relics";
import type {
  DropState,
  GameState,
  PirateRelicKind,
} from "../src/game/types";

function relicDrops(state: Readonly<GameState>): DropState[] {
  return state.drops.filter((drop) => getDropRelicKind(drop) !== undefined);
}

function groundRelic(
  state: Readonly<GameState>,
  relicKind: PirateRelicKind,
): DropState | undefined {
  return state.drops.find((drop) => getDropRelicKind(drop) === relicKind);
}

function groundRelics(
  state: Readonly<GameState>,
  relicKind: PirateRelicKind,
): DropState[] {
  return state.drops.filter((drop) => getDropRelicKind(drop) === relicKind);
}

describe("local pirate Relic parity", () => {
  it("seeds every Relic deterministically plus five visible multiplier tiers", () => {
    const first = buildLocalArena(
      "local-relic-seed",
      "Relic Captain",
      "practice",
      "black-pearl-relay",
    );
    const second = buildLocalArena(
      "local-relic-seed",
      "Relic Captain",
      "practice",
      "black-pearl-relay",
    );
    const summarize = (state: Readonly<GameState>) => relicDrops(state).map((drop) => ({
      id: drop.id,
      kind: getDropRelicKind(drop),
      position: drop.position,
      specialist: drop.specialist,
      specialistDurationTicks: drop.specialistDurationTicks,
      relicKind: drop.relicKind,
      relicDurationTicks: drop.relicDurationTicks,
    }));

    expect(summarize(first.state)).toEqual(summarize(second.state));
    for (const relicKind of INITIAL_PIRATE_RELIC_KINDS) {
      expect(groundRelics(first.state, relicKind)).toHaveLength(
        relicKind === "gilded-ledger" ? GILDED_LEDGER_GROUND_COUNT : 1,
      );
    }
    // The ground tiers derive from the director's own rarity sequence so a
    // tuning change can never silently pass a stale pin.
    expect(groundRelics(first.state, "gilded-ledger").map((drop) => drop.relicTier))
      .toEqual(TREASURE_TIER_SEQUENCE.slice(0, GILDED_LEDGER_GROUND_COUNT));
    // The 10x jackpot stays rare: exactly one per rarity cycle.
    expect(TREASURE_TIER_SEQUENCE.filter((tier) => tier === 10)).toHaveLength(1);
    expect(groundRelic(first.state, "loot-compass")).toMatchObject({
      id: "collector-beacon-launch",
      specialist: "collector",
      relicKind: undefined,
    });
    expect(groundRelic(first.state, "emerald-spyglass")).toMatchObject({
      id: "emerald-spyglass-relic-1",
      specialist: undefined,
      relicKind: "emerald-spyglass",
    });
    expect(groundRelic(first.state, "pepper-cutlass")).toMatchObject({
      id: "pepper-cutlass-relic-1",
      specialist: undefined,
      relicKind: "pepper-cutlass",
    });
    expect(groundRelic(first.state, "storm-battery")).toMatchObject({
      id: "storm-battery-relic-1",
      relicKind: "storm-battery",
    });
  });

  it("routes local steps through the director after a named Relic pickup", () => {
    const session = buildLocalArena("local-relic-step", "Relic Captain", "practice");
    const player = session.state.players[LOCAL_PLAYER_ID];
    const spyglass = groundRelic(session.state, "emerald-spyglass");
    expect(player).toBeDefined();
    expect(spyglass).toBeDefined();

    for (const playerId of Object.keys(session.state.players)) {
      if (playerId !== LOCAL_PLAYER_ID) delete session.state.players[playerId];
    }
    session.state.config.baseSpeed = 0;
    session.state.config.boostSpeed = 0;
    player!.position = { ...spyglass!.position };
    player!.previousPosition = { ...spyglass!.position };

    const result = stepLocalArena(session);

    expect(result.events).toContainEqual(expect.objectContaining({
      type: "specialistActivated",
      playerId: LOCAL_PLAYER_ID,
      relicKind: "emerald-spyglass",
    }));
    expect(player!.specialist?.relicKind).toBe("emerald-spyglass");
    expect(groundRelic(session.state, "emerald-spyglass")).toBeUndefined();
  });

  it("collects, expires, and respawns every initial Relic on exact deterministic ticks", () => {
    // The Treasure Multiplier lives a stacking-boost life now — it has its
    // own deterministic lifecycle test below.
    for (const relicKind of INITIAL_PIRATE_RELIC_KINDS.filter((kind) => kind !== "gilded-ledger")) {
      const state = createGameState(`local-${relicKind}-lifecycle`, {
        fixedStepSeconds: 1,
        arenaRadius: 600,
        baseSpeed: 0,
        boostSpeed: 0,
        spawnShieldSeconds: 0,
      });
      const player = spawnPlayer(state, {
        id: "local-relic-runner",
        position: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        shieldSeconds: 0,
      });
      const director = new PirateRelicDirector(state, [relicKind]);
      const initial = groundRelic(state, relicKind);
      expect(initial, relicKind).toBeDefined();
      player.position = { ...initial!.position };
      player.previousPosition = { ...initial!.position };

      let result = stepGame(state);
      director.reconcile(result.events);
      const activated = result.events.find((event) =>
        event.type === "specialistActivated"
      );
      const durationTicks = getPirateRelicSpec(relicKind).durationSeconds;
      expect(activated, relicKind).toMatchObject({
        type: "specialistActivated",
        tick: 1,
        playerId: player.id,
        durationTicks,
        ...(relicKind === "loot-compass" ? {} : { relicKind }),
      });
      if (relicKind === "loot-compass") {
        expect(activated).not.toHaveProperty("relicKind");
      }
      const desiredGroundCount = 1;
      expect(groundRelics(state, relicKind), relicKind)
        .toHaveLength(desiredGroundCount - 1);

      const expiryTick = 1 + durationTicks;
      while (state.tick < expiryTick) {
        result = stepGame(state);
        director.reconcile(result.events);
      }
      expect(player.specialist, relicKind).toBeUndefined();
      expect(result.events, relicKind).toContainEqual(expect.objectContaining({
        type: "specialistExpired",
        tick: expiryTick,
        playerId: player.id,
      }));

      const respawnTick = expiryTick + PIRATE_RELIC_RESPAWN_SECONDS;
      while (state.tick < respawnTick - 1) {
        result = stepGame(state);
        director.reconcile(result.events);
      }
      expect(groundRelics(state, relicKind), relicKind)
        .toHaveLength(desiredGroundCount - 1);
      result = stepGame(state);
      director.reconcile(result.events);
      expect(state.tick, relicKind).toBe(respawnTick);
      expect(groundRelics(state, relicKind), relicKind).toHaveLength(desiredGroundCount);
      expect(groundRelics(state, relicKind), relicKind).toContainEqual(
        expect.objectContaining({
          id: `${relicKind}-relic-2`,
        }),
      );
    }
  });

  it("grants, lapses, and respawns Treasure Multiplier tokens deterministically", () => {
    const state = createGameState("local-gilded-ledger-lifecycle", {
      fixedStepSeconds: 1,
      arenaRadius: 600,
      baseSpeed: 0,
      boostSpeed: 0,
      spawnShieldSeconds: 0,
    });
    const player = spawnPlayer(state, {
      id: "local-relic-runner",
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      shieldSeconds: 0,
    });
    const director = new PirateRelicDirector(state, ["gilded-ledger"]);
    const tokens = groundRelics(state, "gilded-ledger");
    expect(tokens).toHaveLength(GILDED_LEDGER_GROUND_COUNT);
    const firstToken = tokens.find((drop) => drop.id === "gilded-ledger-relic-1")!;
    expect(firstToken.relicTier).toBe(TREASURE_TIER_SEQUENCE[0]);
    player.position = { ...firstToken.position };
    player.previousPosition = { ...firstToken.position };

    let result = stepGame(state);
    director.reconcile(result.events);
    // The token feeds the stacking boost bag, never the specialist slot.
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "treasureBoostGranted",
      tick: 1,
      playerId: player.id,
      relicTier: TREASURE_TIER_SEQUENCE[0],
    }));
    expect(player.specialist).toBeUndefined();
    const boostExpiry = player.treasureBoosts[TREASURE_TIER_SEQUENCE[0]]!;
    // 2x lasts 20 seconds (fixedStepSeconds=1 makes ticks seconds here).
    expect(boostExpiry).toBe(1 + 20);
    expect(groundRelics(state, "gilded-ledger"))
      .toHaveLength(GILDED_LEDGER_GROUND_COUNT - 1);

    // The ground refills on the standard respawn cadence, boost still running.
    const respawnTick = 1 + PIRATE_RELIC_RESPAWN_SECONDS;
    while (state.tick < respawnTick) {
      result = stepGame(state);
      director.reconcile(result.events);
    }
    expect(groundRelics(state, "gilded-ledger")).toHaveLength(GILDED_LEDGER_GROUND_COUNT);
    expect(groundRelics(state, "gilded-ledger")).toContainEqual(
      expect.objectContaining({
        id: `gilded-ledger-relic-${GILDED_LEDGER_GROUND_COUNT + 1}`,
      }),
    );

    // The boost lapses on its own clock (the stack prune sweeps at tick 30).
    while (state.tick < 30) {
      result = stepGame(state);
      director.reconcile(result.events);
    }
    expect(state.tick).toBeGreaterThanOrEqual(boostExpiry);
    expect(player.treasureBoosts[TREASURE_TIER_SEQUENCE[0]]).toBeUndefined();
  });

  it("rebuilds a board-bound v2 run with identical Relic state and checksum", () => {
    const seed = "board-relic-replay";
    const mode = "practice" as const;
    const playerName = "Replay Relic Captain";
    const session = buildLocalArena(seed, playerName, mode, "black-pearl-relay");
    const draft: LocalRunDraft = {
      seed,
      mode,
      playerName,
      boardId: "black-pearl-relay",
      inputs: [],
    };

    for (let tick = 1; tick <= 75; tick += 1) {
      const player = session.state.players[LOCAL_PLAYER_ID];
      const input = sanitizeLocalInput(
        tick,
        { x: 1, y: Math.sin(tick * 0.04) * 0.16 },
        false,
        player.direction,
      );
      draft.inputs.push(input);
      stepLocalArena(session, input);
    }

    const recording = finalizeLocalRun(draft, session.state);
    const rebuilt = rebuildLocalRun(recording);

    expect(recording).toMatchObject({
      version: 3,
      boardId: "black-pearl-relay",
      paceId: "harbor",
      terminalChecksum: checksumLocalArena(session.state),
    });
    expect(rebuilt.checksum).toBe(recording.terminalChecksum);
    expect(rebuilt.state.board).toEqual(session.state.board);
    expect(relicDrops(rebuilt.state)).toEqual(relicDrops(session.state));
    expect(rebuilt.state.players[LOCAL_PLAYER_ID].specialist).toEqual(
      session.state.players[LOCAL_PLAYER_ID].specialist,
    );
  });
});

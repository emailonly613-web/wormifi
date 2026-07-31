import { describe, expect, it } from "vitest";
import {
  createGameState,
  getBodyRadius,
  spawnPlayer,
  stepGame,
} from "../src/game/core";
import {
  BLACK_PEARL_RELAY_BOARD,
  evaluateChargingWrap,
  getChargingDockPosition,
  OPEN_SEAS_BOARD,
} from "../src/game/chargingStations";
import type {
  ChargingStationConfig,
  GameState,
  PlayerState,
} from "../src/game/types";

function placeValidCoil(
  state: GameState,
  player: PlayerState,
  station: ChargingStationConfig,
  direction: -1 | 1 = -1,
): void {
  const dock = getChargingDockPosition(station);
  const spacing =
    getBodyRadius(player, state.config) * 2 * state.config.segmentSpacingFactor;
  const angularStep = 2 * Math.asin(
    Math.min(0.99, spacing / (2 * station.wrapRadius)),
  );

  player.position = { ...dock };
  player.previousPosition = { ...dock };
  player.body = player.body.map((_, index) => {
    const angle = station.dockAngleRadians + direction * angularStep * (index + 1);
    return {
      x: station.position.x + Math.cos(angle) * station.wrapRadius,
      y: station.position.y + Math.sin(angle) * station.wrapRadius,
    };
  });
  player.previousBody = player.body.map((point) => ({ ...point }));
}

function placeOnHarborPad(
  player: PlayerState,
  station: ChargingStationConfig,
  xOffset = 0,
): void {
  player.position = {
    x: station.position.x + xOffset,
    y: station.position.y,
  };
  player.previousPosition = { ...player.position };
}

function holdHarborPad(
  state: GameState,
  player: PlayerState,
  station: ChargingStationConfig,
  ticks = state.chargingStations[station.id].requiredTicks,
) {
  const events = [];
  placeOnHarborPad(player, station);
  for (let tick = 0; tick < ticks; tick += 1) {
    events.push(...stepGame(state).events);
  }
  return events;
}

function setup(fixedStepSeconds = 0.1) {
  const state = createGameState(
    "black-pearl-charge",
    {
      arenaRadius: 1_850,
      fixedStepSeconds,
      baseSpeed: 0,
    },
    BLACK_PEARL_RELAY_BOARD,
  );
  const station = state.board.chargingStations[0];
  const player = spawnPlayer(state, {
    id: "captain",
    // The slower 30-size follower economy reaches the same wrap-capable
    // 18-segment geometry at 420 mass that the prior 20-size curve reached at
    // 300. Charging itself remains unchanged.
    mass: 420,
    position: getChargingDockPosition(station),
    direction: { x: 0, y: 1 },
    shieldSeconds: 60,
  });
  placeValidCoil(state, player, station);
  return { state, station, player };
}

describe("authoritative body-wrap charging", () => {
  it("requires a docked, contiguous, same-direction physical coil", () => {
    const { state, station, player } = setup();
    const valid = evaluateChargingWrap(player, station);

    expect(valid).toMatchObject({
      docked: true,
      valid: true,
      windingDirection: -1,
    });
    expect(valid.wrappedSegments).toBeGreaterThanOrEqual(
      station.minimumWrappedSegments,
    );
    expect(valid.windingRadians).toBeGreaterThanOrEqual(station.requiredWrapRadians);
    expect(valid.directionConsistency).toBeCloseTo(1, 8);

    player.position.x += station.dockRadius + 1;
    expect(evaluateChargingWrap(player, station)).toMatchObject({
      docked: false,
      valid: false,
    });

    placeValidCoil(state, player, station);
    player.body[6] = {
      x: station.position.x,
      y: station.position.y,
    };
    expect(evaluateChargingWrap(player, station).valid).toBe(false);
  });

  it("charges for the disclosed duration and awards exactly +24 mass", () => {
    const { state, station, player } = setup();
    const startingMass = player.mass;
    const first = stepGame(state);
    const chargingState = state.chargingStations[station.id];

    expect(first.events).toContainEqual(expect.objectContaining({
      type: "chargingStarted",
      stationId: station.id,
      playerId: player.id,
      requiredTicks: Math.ceil(
        station.chargeDurationSeconds / state.config.fixedStepSeconds,
      ),
    }));
    expect(chargingState.phase).toBe("charging");

    const dockedPosition = { ...player.position };
    state.config.baseSpeed = 100;

    let completion = first.events.find((event) => event.type === "chargingCompleted");
    for (let tick = 1; tick < chargingState.requiredTicks; tick += 1) {
      const result = stepGame(state);
      completion ??= result.events.find((event) => event.type === "chargingCompleted");
    }

    expect(completion).toMatchObject({
      type: "chargingCompleted",
      stationId: station.id,
      playerId: player.id,
      massAwarded: station.massReward,
    });
    expect(player.mass).toBeCloseTo(startingMass + station.massReward, 8);
    expect(player.stats.peakMass).toBeCloseTo(player.mass, 8);
    expect(player.position).toEqual(dockedPosition);
    expect(chargingState.phase).toBe("cooldown");
    expect(chargingState.cooldownTicksRemaining).toBe(
      Math.ceil(station.completionCooldownSeconds / state.config.fixedStepSeconds),
    );
  });

  it("resumes inside the grace window without reminting prior progress", () => {
    const { state, station, player } = setup();
    const startingMass = player.mass;
    stepGame(state);
    const chargingState = state.chargingStations[station.id];
    const firstAward = chargingState.massAwarded;

    player.position = { x: 0, y: 0 };
    player.previousPosition = { ...player.position };
    stepGame(state);
    expect(chargingState.phase).toBe("interrupted");

    placeValidCoil(state, player, station);
    const resumed = stepGame(state);

    expect(resumed.events).toContainEqual(expect.objectContaining({
      type: "chargingResumed",
      stationId: station.id,
      playerId: player.id,
      progressTicks: 1,
    }));
    expect(chargingState.progressTicks).toBe(2);
    expect(chargingState.massAwarded).toBeCloseTo(firstAward * 2, 8);
    expect(player.mass).toBeCloseTo(startingMass + firstAward * 2, 8);
  });

  it("interrupts an invalid coil, honors grace, then resets deterministically", () => {
    const { state, station, player } = setup();
    const startingMass = player.mass;
    stepGame(state);
    const chargingState = state.chargingStations[station.id];
    const partialAward = chargingState.massAwarded;

    player.position = { x: 0, y: 0 };
    player.previousPosition = { ...player.position };
    const interrupted = stepGame(state);
    expect(interrupted.events).toContainEqual(expect.objectContaining({
      type: "chargingInterrupted",
      stationId: station.id,
      playerId: player.id,
    }));
    expect(chargingState.phase).toBe("interrupted");

    const graceTicks = Math.ceil(
      station.interruptionGraceSeconds / state.config.fixedStepSeconds,
    );
    const laterEvents = [];
    for (let tick = 0; tick <= graceTicks; tick += 1) {
      laterEvents.push(...stepGame(state).events);
    }

    expect(laterEvents).toContainEqual(expect.objectContaining({
      type: "chargingReset",
      stationId: station.id,
      playerId: player.id,
      massAwarded: partialAward,
    }));
    expect(chargingState.phase).toBe("cooldown");
    expect(player.mass).toBeCloseTo(startingMass + partialAward, 8);
  });

  it("uses boost as a universal cast-off input", () => {
    const { state, station, player } = setup();
    stepGame(state);

    const result = stepGame(state, {
      [player.id]: {
        sequence: 1,
        direction: { ...player.direction },
        boost: true,
      },
    });

    expect(result.events).toContainEqual(expect.objectContaining({
      type: "chargingInterrupted",
      stationId: station.id,
      playerId: player.id,
    }));
  });

  it("resolves simultaneous valid contenders by stable player id", () => {
    const { state, station } = setup();
    const firstById = spawnPlayer(state, {
      id: "admiral",
      mass: 420,
      position: getChargingDockPosition(station),
      direction: { x: 0, y: 1 },
      shieldSeconds: 60,
    });
    placeValidCoil(state, firstById, station);

    const result = stepGame(state);
    expect(result.events.filter((event) => event.type === "chargingStarted")).toEqual([
      expect.objectContaining({ playerId: "admiral", stationId: station.id }),
    ]);
    expect(state.chargingStations[station.id].playerId).toBe("admiral");
  });

  it("ships two orbit rings plus one staged x1/x2/x3 Open Seas harbor", () => {
    const state = createGameState(
      "open-seas-harbors",
      { baseSpeed: 0, fixedStepSeconds: 1 / 30 },
      OPEN_SEAS_BOARD,
    );
    const player = spawnPlayer(state, { id: "captain", shieldSeconds: 60 });

    expect(state.board.id).toBe("open-seas");
    expect(state.board.chargingStations.map((station) => ({
      id: station.id,
      kind: station.kind,
      seconds: station.chargeDurationSeconds,
      reward: station.massReward,
    }))).toEqual([
      { id: "coin-cay", kind: "capstan", seconds: 1.5, reward: 9 },
      { id: "coral-key", kind: "capstan", seconds: 2.25, reward: 20 },
      { id: "kraken-atoll", kind: "harbor", seconds: 7, reward: 42 },
    ]);

    const krakenAtoll = state.board.chargingStations[2];
    const startingMass = player.mass;
    const chargingState = state.chargingStations[krakenAtoll.id];
    const stageTicks = chargingState.requiredTicks / 3;
    const firstStageEvents = holdHarborPad(state, player, krakenAtoll, stageTicks);
    const afterX1 = player.mass;
    expect(afterX1).toBeGreaterThan(startingMass);
    holdHarborPad(state, player, krakenAtoll, stageTicks);
    const afterX2 = player.mass;
    const finalStageEvents = holdHarborPad(state, player, krakenAtoll, stageTicks);

    expect(afterX1 - startingMass).toBeCloseTo(7, 8);
    expect(afterX2 - afterX1).toBeCloseTo(14, 8);
    expect(player.mass - afterX2).toBeCloseTo(21, 8);
    expect([...firstStageEvents, ...finalStageEvents]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "chargingStarted",
        stationId: krakenAtoll.id,
        playerId: player.id,
      }),
      expect.objectContaining({
        type: "chargingCompleted",
        stationId: krakenAtoll.id,
        playerId: player.id,
        massAwarded: 42,
      }),
    ]));
    expect(player.mass).toBeCloseTo(startingMass + 42, 8);
    expect(chargingState.phase).toBe("cooldown");
  });

  it("keeps partial growth, stops outside the pad, and never remints decayed progress", () => {
    const state = createGameState(
      "open-seas-repeat-lap",
      { baseSpeed: 0, fixedStepSeconds: 1 / 30 },
      OPEN_SEAS_BOARD,
    );
    const krakenAtoll = state.board.chargingStations[2];
    const player = spawnPlayer(state, { id: "captain", shieldSeconds: 60 });
    const chargingState = state.chargingStations[krakenAtoll.id];
    holdHarborPad(state, player, krakenAtoll, chargingState.requiredTicks / 3);
    const partialMass = player.mass;
    expect(chargingState.massAwarded).toBeCloseTo(7, 8);

    placeOnHarborPad(
      player,
      krakenAtoll,
      krakenAtoll.wrapRadius + krakenAtoll.wrapTolerance + 5,
    );
    const interrupted = stepGame(state);
    expect(interrupted.events).toContainEqual(expect.objectContaining({
      type: "chargingInterrupted",
      stationId: krakenAtoll.id,
      playerId: player.id,
    }));

    const resetEvents = [];
    for (let tick = 0; tick < chargingState.requiredTicks; tick += 1) {
      resetEvents.push(...stepGame(state).events);
      if (resetEvents.some((event) => event.type === "chargingReset")) break;
    }
    expect(resetEvents).toContainEqual(expect.objectContaining({
      type: "chargingReset",
      stationId: krakenAtoll.id,
      playerId: player.id,
      massAwarded: expect.closeTo(7, 8),
    }));
    expect(player.mass).toBeCloseTo(partialMass, 8);

    while (chargingState.phase !== "ready") stepGame(state);
    const secondChargeEvents = holdHarborPad(state, player, krakenAtoll);
    expect(secondChargeEvents).toContainEqual(expect.objectContaining({
      type: "chargingCompleted",
      stationId: krakenAtoll.id,
      playerId: player.id,
      massAwarded: krakenAtoll.massReward,
    }));
    expect(player.mass).toBeCloseTo(partialMass + krakenAtoll.massReward, 8);
  });

  it("resolves simultaneous harbor-pad contenders by stable player id", () => {
    const state = createGameState(
      "open-seas-pad-contention",
      { baseSpeed: 0, fixedStepSeconds: 1 / 30 },
      OPEN_SEAS_BOARD,
    );
    const krakenAtoll = state.board.chargingStations[2];
    const scriptedBot = spawnPlayer(state, {
      id: "aardvark-bot",
      kind: "bot",
      shieldSeconds: 60,
    });
    const zulu = spawnPlayer(state, { id: "zulu", shieldSeconds: 60 });
    const alpha = spawnPlayer(state, { id: "alpha", shieldSeconds: 60 });
    placeOnHarborPad(scriptedBot, krakenAtoll);
    placeOnHarborPad(zulu, krakenAtoll);
    placeOnHarborPad(alpha, krakenAtoll);

    const result = stepGame(state);
    expect(result.events.filter((event) => event.type === "chargingStarted")).toEqual([
      expect.objectContaining({ stationId: krakenAtoll.id, playerId: "alpha" }),
    ]);
    expect(state.chargingStations[krakenAtoll.id].playerId).toBe("alpha");
  });

  it("requires a real body orbit before either small Open Seas ring can pay", () => {
    const state = createGameState(
      "open-seas-orbit-rings",
      { baseSpeed: 0, fixedStepSeconds: 0.1 },
      OPEN_SEAS_BOARD,
    );
    for (const [index, station] of state.board.chargingStations.slice(0, 2).entries()) {
      const player = spawnPlayer(state, {
        id: `ring-captain-${index}`,
        mass: index === 0 ? 210 : 420,
        shieldSeconds: 60,
      });
      placeValidCoil(state, player, station);
      const geometry = evaluateChargingWrap(player, station);
      expect(geometry.valid, station.id).toBe(true);
      const result = stepGame(state);
      expect(result.events).toContainEqual(expect.objectContaining({
        type: "chargingStarted",
        stationId: station.id,
        playerId: player.id,
      }));
    }
  });
});

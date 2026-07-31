import { describe, expect, it } from "vitest";

import {
  HUNTER_ROTATION_SECONDS,
  MAX_HUNTERS_PER_HUMAN,
  selectHumanHunterAssignments,
} from "../src/game/botPressure";
import { spawnBotRoster } from "../src/game/bots";
import { createGameState, spawnPlayer } from "../src/game/core";
import type { BotInputContext, BotInputProvider, GameState, PlayerState } from "../src/game/types";

function contextFor(
  state: GameState,
  self: PlayerState,
  assignedHumanTargetId?: string,
): BotInputContext {
  return {
    tick: 1,
    deltaSeconds: state.config.fixedStepSeconds,
    config: state.config,
    self,
    players: Object.values(state.players).sort((a, b) => a.id.localeCompare(b.id)),
    drops: state.drops,
    assignedHumanTargetId,
  };
}

function populatedPressureState(seed: string, bots: number) {
  const state = createGameState(seed, { arenaRadius: 5_000 });
  const roster = spawnBotRoster(state, bots);
  const human = spawnPlayer(state, {
    id: "human-1",
    name: "Human Captain",
    kind: "human",
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    shieldSeconds: 0,
  });
  roster.ids.forEach((id, index) => {
    const angle = index / Math.max(1, bots) * Math.PI * 2;
    state.players[id].position = {
      x: Math.cos(angle) * (500 + index * 4),
      y: Math.sin(angle) * (500 + index * 4),
    };
  });
  return { state, roster, human };
}

describe("capped rotating human pressure", () => {
  it("assigns exactly three of 199 AI seats to one human", () => {
    const { state, human } = populatedPressureState("one-human-199-ai", 199);
    const assignments = selectHumanHunterAssignments(
      Object.values(state.players),
      1,
      state.config.fixedStepSeconds,
    );
    expect(assignments.size).toBe(MAX_HUNTERS_PER_HUMAN);
    expect([...assignments.values()]).toEqual(Array(MAX_HUNTERS_PER_HUMAN).fill(human.id));
  });

  it("rotates the nearby hunter trio and gives the previous trio a cooldown epoch", () => {
    const { state } = populatedPressureState("rotating-pressure", 12);
    const rotationTicks = Math.round(HUNTER_ROTATION_SECONDS / state.config.fixedStepSeconds);
    const first = selectHumanHunterAssignments(
      Object.values(state.players),
      1,
      state.config.fixedStepSeconds,
    );
    const second = selectHumanHunterAssignments(
      Object.values(state.players),
      rotationTicks + 1,
      state.config.fixedStepSeconds,
    );
    expect(first.size).toBe(3);
    expect(second.size).toBe(3);
    expect([...second.keys()].filter((id) => first.has(id))).toEqual([]);
  });

  it("never assigns one bot twice and caps pressure independently around multiple humans", () => {
    const state = createGameState("two-human-pressure", { arenaRadius: 5_000 });
    const roster = spawnBotRoster(state, 20);
    spawnPlayer(state, {
      id: "human-a",
      kind: "human",
      position: { x: -1_000, y: 0 },
      shieldSeconds: 0,
    });
    spawnPlayer(state, {
      id: "human-b",
      kind: "human",
      position: { x: 1_000, y: 0 },
      shieldSeconds: 0,
    });
    roster.ids.forEach((id, index) => {
      state.players[id].position = {
        x: index < 10 ? -900 - index * 8 : 900 + (index - 10) * 8,
        y: (index % 5) * 20,
      };
    });
    const assignments = selectHumanHunterAssignments(
      Object.values(state.players),
      1,
      state.config.fixedStepSeconds,
    );
    expect(assignments.size).toBe(6);
    expect([...assignments.values()].filter((id) => id === "human-a")).toHaveLength(3);
    expect([...assignments.values()].filter((id) => id === "human-b")).toHaveLength(3);
    expect(new Set(assignments.keys()).size).toBe(assignments.size);
  });

  it("makes only an assigned bot pursue a human and still prioritizes immediate evasion", () => {
    const createScenario = (seed: string, humanX: number) => {
      const state = createGameState(seed, { arenaRadius: 5_000 });
      const roster = spawnBotRoster(state, 1);
      const bot = state.players[roster.ids[0]];
      bot.position = { x: 0, y: 0 };
      bot.direction = { x: 1, y: 0 };
      const human = spawnPlayer(state, {
        id: "human-1",
        kind: "human",
        position: { x: humanX, y: 0 },
        direction: { x: 1, y: 0 },
        shieldSeconds: 0,
      });
      return {
        state,
        bot,
        human,
        provider: roster.providers[bot.id] as BotInputProvider & { tacticalState: string },
      };
    };

    const ordinary = createScenario("unassigned-human", 500);
    ordinary.provider.nextInput(contextFor(ordinary.state, ordinary.bot));
    expect(ordinary.provider.tacticalState).toBe("forage");

    const assigned = createScenario("assigned-human", 500);
    assigned.provider.nextInput(contextFor(assigned.state, assigned.bot, assigned.human.id));
    expect(assigned.provider.tacticalState).toBe("hunt");

    const danger = createScenario("assigned-danger", 20);
    danger.provider.nextInput(contextFor(danger.state, danger.bot, danger.human.id));
    expect(danger.provider.tacticalState).toBe("evade");
  });
});

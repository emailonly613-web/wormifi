import { describe, expect, it } from "vitest";
import { BOT_NAMES, spawnBotRoster } from "../src/game/bots";
import { createGameState, spawnDrop, stepGame } from "../src/game/core";
import type {
  BotInputContext,
  BotInputProvider,
  GameState,
  PlayerState,
} from "../src/game/types";

function contextFor(state: GameState, self: PlayerState, tick: number): BotInputContext {
  return {
    tick,
    deltaSeconds: state.config.fixedStepSeconds,
    config: state.config,
    self,
    players: Object.values(state.players).sort((a, b) => a.id.localeCompare(b.id)),
    drops: state.drops,
  };
}

describe("deterministic legal bot roster", () => {
  it("spawns 24 uniquely named bots with legal PlayerInput providers", () => {
    const state = createGameState("full-roster");
    const roster = spawnBotRoster(state, 24);

    expect(roster.ids).toHaveLength(24);
    expect(new Set(roster.ids).size).toBe(24);
    expect(BOT_NAMES).toHaveLength(24);
    expect(Object.keys(roster.providers)).toEqual(roster.ids);

    for (const id of roster.ids) {
      const player = state.players[id];
      const input = roster.providers[id]?.nextInput(contextFor(state, player, 1));
      expect(player.kind).toBe("bot");
      expect(input).toMatchObject({ sequence: 1, clientTick: 1 });
      expect(Number.isFinite(input?.direction.x)).toBe(true);
      expect(Number.isFinite(input?.direction.y)).toBe(true);
      expect(Math.hypot(input?.direction.x ?? 0, input?.direction.y ?? 0)).toBeCloseTo(1, 8);
      expect(typeof input?.boost).toBe("boolean");
    }
  });

  it("replays the same seeded 24-bot match exactly", () => {
    const first = createGameState("same-match");
    const second = createGameState("same-match");
    const firstRoster = spawnBotRoster(first, 24);
    const secondRoster = spawnBotRoster(second, 24);

    for (let tick = 0; tick < 90; tick += 1) {
      stepGame(first, {}, firstRoster.providers);
      stepGame(second, {}, secondRoster.providers);
    }

    expect(second).toEqual(first);
  });

  it("models reaction delay and ignores drops outside imperfect vision", () => {
    const state = createGameState("reaction");
    const roster = spawnBotRoster(state, 1);
    const bot = state.players[roster.ids[0]];
    bot.position = { x: 0, y: 0 };
    bot.direction = { x: 1, y: 0 };
    spawnDrop(state, { id: "visible", position: { x: 100, y: 0 }, mass: 5 });

    const provider = roster.providers[bot.id] as BotInputProvider;
    const first = provider.nextInput(contextFor(state, bot, 1));
    state.drops[0].position = { x: -100, y: 0 };
    const delayed = provider.nextInput(contextFor(state, bot, 2));
    expect(delayed.direction).toEqual(first.direction);

    const withFarDrop = createGameState("limited-vision");
    const withoutFarDrop = createGameState("limited-vision");
    const farRoster = spawnBotRoster(withFarDrop, 1);
    const emptyRoster = spawnBotRoster(withoutFarDrop, 1);
    const farBot = withFarDrop.players[farRoster.ids[0]];
    const emptyBot = withoutFarDrop.players[emptyRoster.ids[0]];
    for (const candidate of [farBot, emptyBot]) {
      candidate.position = { x: 0, y: 0 };
      candidate.direction = { x: 1, y: 0 };
    }
    spawnDrop(withFarDrop, { id: "unseen", position: { x: 2_000, y: 0 }, mass: 999 });

    expect(
      farRoster.providers[farBot.id]?.nextInput(contextFor(withFarDrop, farBot, 1)),
    ).toEqual(
      emptyRoster.providers[emptyBot.id]?.nextInput(contextFor(withoutFarDrop, emptyBot, 1)),
    );
  });

  it("escapes the boundary before pursuing food or rivals", () => {
    const state = createGameState("boundary", { arenaRadius: 1_000 });
    const roster = spawnBotRoster(state, 1);
    const bot = state.players[roster.ids[0]];
    bot.position = { x: 900, y: 0 };
    bot.direction = { x: 1, y: 0 };
    const provider = roster.providers[bot.id] as BotInputProvider & {
      tacticalState: string;
    };

    const input = provider.nextInput(contextFor(state, bot, 1));
    expect(provider.tacticalState).toBe("boundary-escape");
    expect(input.direction.x).toBeLessThan(-0.99);
    expect(input.boost).toBe(false);
  });
});

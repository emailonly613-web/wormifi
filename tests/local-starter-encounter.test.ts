import { describe, expect, it } from "vitest";
import { getBodyRadius, getPlayerRadius } from "../src/game/core";
import {
  LOCAL_BOT_COUNT,
  LOCAL_ONBOARDING_SHIELD_SECONDS,
  LOCAL_PLAYER_ID,
  LOCAL_STARTER_RIVAL_IDS,
  buildLocalArena,
  checksumLocalArena,
  sanitizeLocalInput,
  stepLocalArena,
} from "../src/game/localArena";
import type { GameState, PlayerState, Vec2 } from "../src/game/types";

function distance(first: Vec2, second: Vec2): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function solidChain(player: PlayerState, state: GameState) {
  return [
    {
      point: player.position,
      radius: getPlayerRadius(player, state.config),
    },
    ...player.body.map((point) => ({
      point,
      radius: getBodyRadius(player, state.config),
    })),
  ];
}

function minimumChainClearance(
  first: PlayerState,
  second: PlayerState,
  state: GameState,
): number {
  return Math.min(
    ...solidChain(first, state).flatMap((firstCircle) =>
      solidChain(second, state).map((secondCircle) =>
        distance(firstCircle.point, secondCircle.point) -
        firstCircle.radius -
        secondCircle.radius,
      ),
    ),
  );
}

describe("local first-session encounter composition", () => {
  it("opens every mode with 28 bots and two visible parallel rivals outside the safe launch corridor", () => {
    for (const mode of ["rush", "endless", "practice"] as const) {
      const session = buildLocalArena(`starter-${mode}`, "Starter Proof", mode);
      const player = session.state.players[LOCAL_PLAYER_ID];
      const bots = Object.values(session.state.players).filter(
        (candidate) => candidate.kind === "bot",
      );

      expect(bots).toHaveLength(LOCAL_BOT_COUNT);
      expect(player.body).toHaveLength(6);
      expect(player.mass).toBe(48);
      const starterRelic = session.state.drops.find(
        (drop) => drop.id === "collector-beacon-launch",
      );
      expect(starterRelic).toBeDefined();
      expect(distance(player.position, starterRelic!.position)).toBeGreaterThan(250);

      for (const id of LOCAL_STARTER_RIVAL_IDS) {
        const rival = session.state.players[id];
        expect(rival).toMatchObject({
          alive: true,
          kind: "bot",
          direction: { x: 1, y: 0 },
        });
        expect(Math.abs(rival.position.x)).toBeLessThanOrEqual(180);
        expect(Math.abs(rival.position.y)).toBeLessThanOrEqual(190);
        expect(minimumChainClearance(player, rival, session.state)).toBeGreaterThan(90);
      }

      expect(
        minimumChainClearance(
          session.state.players[LOCAL_STARTER_RIVAL_IDS[0]],
          session.state.players[LOCAL_STARTER_RIVAL_IDS[1]],
          session.state,
        ),
      ).toBeGreaterThan(135);
    }
  });

  it("is seed-repeatable and protects the local learner through the opening lesson", () => {
    const first = buildLocalArena("starter-repeat", "Starter Proof", "practice");
    const second = buildLocalArena("starter-repeat", "Starter Proof", "practice");

    expect(checksumLocalArena(second.state)).toBe(checksumLocalArena(first.state));

    const protectedTicks = Math.ceil(
      LOCAL_ONBOARDING_SHIELD_SECONDS / first.state.config.fixedStepSeconds,
    );
    for (let tick = 1; tick <= protectedTicks; tick += 1) {
      for (const session of [first, second]) {
        const player = session.state.players[LOCAL_PLAYER_ID];
        const angle = tick * 0.018;
        const input = sanitizeLocalInput(
          tick,
          { x: Math.cos(angle), y: Math.sin(angle) },
          false,
          player.direction,
        );
        const result = stepLocalArena(session, input);
        expect(
          result.events.some(
            (event) =>
              event.type === "playerDied" && event.playerId === LOCAL_PLAYER_ID,
          ),
        ).toBe(false);
        expect(player.alive).toBe(true);
      }
      expect(checksumLocalArena(second.state)).toBe(checksumLocalArena(first.state));
    }

    expect(first.state.players[LOCAL_PLAYER_ID].shieldTicksRemaining).toBe(0);
  });
});

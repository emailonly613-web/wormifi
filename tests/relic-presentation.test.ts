import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RelicStatus } from "../src/components/RelicStatus";
import {
  createRelicStatusModel,
  getActiveRelicPresentation,
  getGroundRelicPresentation,
  isPirateRelicKind,
  RELIC_PRESENTATIONS,
  resolveRelicPresentation,
} from "../src/game/relicPresentation";
import type { ActiveSpecialist, PirateRelicKind } from "../src/game/types";

function active(
  relicKind: PirateRelicKind | undefined,
  overrides: Partial<ActiveSpecialist> = {},
): ActiveSpecialist {
  return {
    kind: "collector",
    ...(relicKind ? { relicKind } : {}),
    activatedAtTick: 10,
    expiresAtTick: 110,
    durationTicks: 100,
    ...overrides,
  };
}

describe("Relic presentation contract", () => {
  it("maps absent protocol identity only to Treasure Magnet and keeps all seven distinct", () => {
    expect(resolveRelicPresentation()).toBe(RELIC_PRESENTATIONS["loot-compass"]);
    expect(getActiveRelicPresentation(active(undefined))?.label).toBe("Treasure Magnet");

    const presentations = [
      RELIC_PRESENTATIONS["loot-compass"],
      RELIC_PRESENTATIONS["emerald-spyglass"],
      RELIC_PRESENTATIONS["pepper-cutlass"],
      RELIC_PRESENTATIONS["gale-pennant"],
      RELIC_PRESENTATIONS["maelstrom-wheel"],
      RELIC_PRESENTATIONS["storm-battery"],
      RELIC_PRESENTATIONS["gilded-ledger"],
    ];
    expect(new Set(presentations.map((entry) => entry.label)).size).toBe(7);
    expect(new Set(presentations.map((entry) => entry.ground.spriteName)).size).toBe(7);
    expect(new Set(presentations.map((entry) => entry.ground.assetPath)).size).toBe(7);
    expect(presentations.map((entry) => entry.publishedDurationSeconds))
      .toEqual([12, 10, 8, 8, 8, 7, 8]);
    expect(RELIC_PRESENTATIONS["emerald-spyglass"]).toMatchObject({
      label: "Emerald Spyglass",
      effectText: "25% FARTHER VIEW + DANGER BEARINGS",
      carrierTone: "emerald-watch",
      ground: {
        spriteName: "emerald-spyglass",
        assetPath: "/assets/sprites/pirate-atlas/emerald-spyglass.png",
      },
    });
    expect(RELIC_PRESENTATIONS["pepper-cutlass"].effectText).toContain("SAME TOP SPEED");
    expect(RELIC_PRESENTATIONS["maelstrom-wheel"]).toMatchObject({
      shortLabel: "ZERO TURN",
      effectText: "ZERO-CLEARANCE TURNS · REPEAT FOR 8S",
      rivalDisclosure: "ZERO-TURN ACTIVE",
    });
    expect(RELIC_PRESENTATIONS["storm-battery"]).toMatchObject({
      shortLabel: "2× TANKS",
      publishedDurationSeconds: 7,
      effectText: "7S ZERO-COST TURBO · TWO FULL STARTING TANKS",
      ground: { spriteName: "storm-battery" },
    });
  });

  it("recognizes legacy and named ground silhouettes without treating treasure as a Relic", () => {
    expect(getGroundRelicPresentation({ specialist: "collector" })?.relicKind)
      .toBe("loot-compass");
    expect(getGroundRelicPresentation({ relicKind: "emerald-spyglass" })?.label)
      .toBe("Emerald Spyglass");
    expect(getGroundRelicPresentation({ relicKind: "pepper-cutlass" })?.ground)
      .toMatchObject({
        spriteName: "pepper-cutlass",
        accessibleLabel: "Pepper Cutlass Relic on the arena floor",
        reducedMotionEquivalent: "static-high-contrast-outline",
      });
    expect(getGroundRelicPresentation({})).toBeUndefined();
    expect(isPirateRelicKind("loot-compass")).toBe(true);
    expect(isPirateRelicKind("collector")).toBe(false);
  });

  it("derives an exact accessible timer and disappears on the authoritative expiry tick", () => {
    const spyglass = active("emerald-spyglass", {
      activatedAtTick: 20,
      expiresAtTick: 120,
      durationTicks: 100,
    });
    expect(createRelicStatusModel(spyglass, 21, 0.1)).toMatchObject({
      remainingSeconds: 9.9,
      roundedSeconds: 10,
      durationSeconds: 10,
      timerRatio: 0.99,
      timerLabel: "10 seconds remaining",
      statusLabel: "Emerald Spyglass active. 25% FARTHER VIEW + DANGER BEARINGS.",
    });
    expect(createRelicStatusModel(spyglass, 119, 0.1)?.timerLabel)
      .toBe("1 second remaining");
    expect(createRelicStatusModel(spyglass, 120, 0.1)).toBeUndefined();
    expect(createRelicStatusModel(spyglass, 21, 0)).toBeUndefined();
  });

  it("renders the explicit Relic, atlas image, stable live status, and non-live timer", () => {
    const markup = renderToStaticMarkup(createElement(RelicStatus, {
      active: active("pepper-cutlass", {
        activatedAtTick: 10,
        expiresAtTick: 90,
        durationTicks: 80,
      }),
      currentTick: 11,
      fixedStepSeconds: 0.1,
    }));

    expect(markup).toContain('data-relic-kind="pepper-cutlass"');
    expect(markup).toContain('data-carrier-tone="pepper-fire"');
    expect(markup).toContain('data-ground-sprite="pepper-cutlass"');
    expect(markup).toContain('data-parent-ability-id="3"');
    expect(markup).toContain('<canvas class="relic-status__icon"');
    expect(markup).toContain('aria-label="Pepper Cutlass. BOOST COST -25% · SAME TOP SPEED.');
    expect(markup).toContain("BOOST COST -25% · SAME TOP SPEED");
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-live="off"');
    expect(markup).toContain('class="relic-status__chest"');
    expect(markup).toContain('class="relic-status__chest-lid"');
    expect(markup).toContain('class="relic-status__chest-base"');
    expect(markup).toContain("<progress");
    expect(markup).not.toContain("LOOT COMPASS");
  });

  it("renders an active multiplier as a number, never a coin image", () => {
    const markup = renderToStaticMarkup(createElement(RelicStatus, {
      active: active("gilded-ledger", {
        relicTier: 5,
        activatedAtTick: 10,
        expiresAtTick: 90,
        durationTicks: 80,
      }),
      currentTick: 11,
      fixedStepSeconds: 0.1,
    }));

    expect(markup).toContain("5×");
    expect(markup).toContain("5× ALL TREASURE");
    expect(markup).toContain('data-ground-sprite="treasure-multiplier"');
    expect(markup).toContain('class="relic-status__chest"');
    expect(markup).not.toContain("doubloon-stack");
    expect(markup).not.toContain("doubloon-stack.png");
    expect(markup).not.toContain("<img");
  });

  it("uses a static high-contrast equivalent under reduced motion", () => {
    const markup = renderToStaticMarkup(createElement(RelicStatus, {
      active: active("emerald-spyglass"),
      currentTick: 11,
      fixedStepSeconds: 0.1,
      reducedMotion: true,
    }));
    expect(markup).toContain('data-reduced-motion="true"');
    expect(markup).toContain('data-motion="static"');
    expect(markup).toContain('aria-label="Emerald Spyglass.');
    expect(markup).not.toContain("relic-status__copy");
    expect(markup).not.toContain("relic-status__rival-disclosure");
    expect(markup).not.toContain("LOOT COMPASS");
  });

  it("renders nothing for a missing or expired authoritative slot", () => {
    expect(renderToStaticMarkup(createElement(RelicStatus, {
      currentTick: 10,
      fixedStepSeconds: 0.1,
    }))).toBe("");
    expect(renderToStaticMarkup(createElement(RelicStatus, {
      active: active("loot-compass", { expiresAtTick: 10 }),
      currentTick: 10,
      fixedStepSeconds: 0.1,
    }))).toBe("");
  });
});

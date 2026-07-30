import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChargingStationStatus } from "../src/components/ChargingStationStatus";
import { PirateRadar } from "../src/components/PirateRadar";
import type { ChargingStationPresentation } from "../src/game/chargingStationRender";

describe("charging station HUD and radar equivalents", () => {
  it("exposes phase, icon, readable instructions, and native progress semantics", () => {
    const status: ChargingStationPresentation = {
      stationId: "port-capstan",
      stationName: "Port Capstan",
      kind: "capstan",
      phase: "interrupted",
      icon: "⚠",
      heading: "Port Capstan · Coil Broken",
      detail: "RESUME WITHIN 0.3S · 50% HELD",
      progressRatio: 0.5,
      progressLabel: "50% HELD",
      active: true,
      ownedByViewer: true,
    };
    const markup = renderToStaticMarkup(createElement(ChargingStationStatus, {
      status,
      testId: "station-proof",
    }));

    expect(markup).toContain('data-testid="station-proof"');
    expect(markup).toContain('data-phase="interrupted"');
    expect(markup).toContain("⚠");
    expect(markup).toContain("RESUME WITHIN 0.3S");
    expect(markup).toContain("<progress");
    expect(markup).toContain('value="0.5"');
    expect(markup).toContain("Port Capstan 50% HELD");
    expect(markup).not.toContain("<strong>");
    expect(markup).not.toContain("<small>");
  });

  it("renders configured station markers through the existing radar hook", () => {
    const markup = renderToStaticMarkup(createElement(PirateRadar, {
      scopeLabel: "RELAY",
      arenaRadius: 1_850,
      position: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      alive: true,
      landmarks: [],
      stations: [
        { id: "port-capstan", position: { x: -620, y: 300 }, active: true },
        { id: "starboard-capstan", position: { x: 620, y: -300 } },
      ],
    }));

    expect(markup).toContain('data-station-count="2"');
    expect(markup.match(/data-testid="radar-station"/g)).toHaveLength(2);
    expect(markup).toContain("radar-station active");
    expect(markup).toContain("and 2 stations");
  });
});

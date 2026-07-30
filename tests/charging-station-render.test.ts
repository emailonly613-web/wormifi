import { describe, expect, it } from "vitest";
import {
  BLACK_PEARL_RELAY_BOARD,
  cloneAndValidateBoard,
  OPEN_SEAS_BOARD,
} from "../src/game/chargingStations";
import {
  describeChargingStation,
  drawChargingStationField,
  selectChargingStationPresentation,
  type ChargingStationView,
} from "../src/game/chargingStationRender";
import type { ChargingStationState } from "../src/game/types";

function recordingContext() {
  const arcs: number[] = [];
  const text: string[] = [];
  const target: Record<PropertyKey, unknown> = {};
  const context = new Proxy(target, {
    get: (object, property) => {
      if (property === "arc") {
        return (_x: number, _y: number, radius: number) => arcs.push(radius);
      }
      if (property === "fillText") {
        return (value: string) => text.push(value);
      }
      if (property in object) return object[property];
      return () => undefined;
    },
    set: (object, property, value) => {
      object[property] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { context, arcs, text };
}

function stationFixture() {
  const prepared = cloneAndValidateBoard(BLACK_PEARL_RELAY_BOARD, 0.1, 1_850);
  const station = { ...prepared.board.chargingStations[0], position: { x: 0, y: 0 } };
  const ready = prepared.states[station.id];
  return { station, ready };
}

describe("charging station client presentation", () => {
  it("describes ready, winding, interruption, and cooldown without client prediction", () => {
    const { station, ready } = stationFixture();
    const readyView = describeChargingStation(station, ready, 0.1, "captain");
    expect(readyView).toMatchObject({
      phase: "ready",
      icon: "⚓",
      progressRatio: 0,
      active: false,
    });
    expect(readyView.detail).toContain(`WRAP ${station.minimumWrappedSegments}+ CREW`);
    expect(readyView.detail).toContain(`+${station.massReward} SIZE`);

    const charging: ChargingStationState = {
      ...ready,
      phase: "charging",
      playerId: "captain",
      windingDirection: -1,
      progressTicks: 12,
      requiredTicks: 24,
      massAwarded: 12,
    };
    expect(describeChargingStation(station, charging, 0.1, "captain")).toMatchObject({
      phase: "charging",
      icon: "↺",
      progressRatio: 0.5,
      progressLabel: "50% CHARGED",
      ownedByViewer: true,
    });
    expect(describeChargingStation(station, charging, 0.1, "captain").detail)
      .toContain("COUNTERCLOCKWISE");

    const interrupted: ChargingStationState = {
      ...charging,
      phase: "interrupted",
      graceTicksRemaining: 3,
    };
    expect(describeChargingStation(station, interrupted, 0.1, "captain")).toMatchObject({
      phase: "interrupted",
      icon: "⚠",
      progressLabel: "50% HELD",
    });
    expect(describeChargingStation(station, interrupted, 0.1, "captain").detail)
      .toContain("RESUME WITHIN 0.3S");

    const cooldown: ChargingStationState = {
      ...ready,
      phase: "cooldown",
      cooldownTicksRemaining: 100,
      massAwarded: station.massReward,
    };
    expect(describeChargingStation(station, cooldown, 0.1)).toMatchObject({
      phase: "cooldown",
      icon: "⌛",
      progressRatio: 0.5,
      progressLabel: "10S COOLDOWN",
    });
  });

  it("prioritizes the viewer's active authoritative station over distance", () => {
    const { station, ready } = stationFixture();
    const near: ChargingStationView = {
      station: { ...station, id: "near", position: { x: 5, y: 0 } },
      state: { ...ready, stationId: "near" },
    };
    const owned: ChargingStationView = {
      station: { ...station, id: "owned", position: { x: 900, y: 0 } },
      state: {
        ...ready,
        stationId: "owned",
        phase: "charging",
        playerId: "captain",
        windingDirection: 1,
      },
    };
    expect(selectChargingStationPresentation(
      [near, owned],
      0.1,
      "captain",
      { x: 0, y: 0 },
    )?.stationId).toBe("owned");
  });

  it("draws the exact core, wrap tolerance boundaries, center lane, and dock", () => {
    const { station, ready } = stationFixture();
    const state: ChargingStationState = {
      ...ready,
      phase: "charging",
      playerId: "captain",
      windingDirection: 1,
      progressTicks: 6,
      requiredTicks: 24,
    };
    const { context, arcs, text } = recordingContext();
    drawChargingStationField(context, {
      views: [{ station, state }],
      worldToScreen: (point) => ({ x: 400 + point.x, y: 300 + point.y }),
      zoom: 1,
      width: 800,
      height: 600,
      fixedStepSeconds: 0.1,
      viewerPlayerId: "captain",
      now: 1_000,
    });

    expect(arcs).toContain(station.coreRadius);
    expect(arcs).toContain(station.wrapRadius);
    expect(arcs).toContain(station.wrapRadius - station.wrapTolerance);
    expect(arcs).toContain(station.wrapRadius + station.wrapTolerance);
    expect(arcs).toContain(station.dockRadius);
    expect(text).toContain("⚓");
    expect(text).toContain("↻");
    expect(text.some((entry) => entry.includes("YOUR CHARGE"))).toBe(true);
    expect(text.some((entry) => entry.includes("CLOCKWISE"))).toBe(true);
  });

  it("renders a mini-island harbor with one-lap copy and exact reward truth", () => {
    const prepared = cloneAndValidateBoard(OPEN_SEAS_BOARD, 1 / 30, 1_450);
    const station = { ...prepared.board.chargingStations[0], position: { x: 0, y: 0 } };
    const ready = prepared.states[station.id];
    const presentation = describeChargingStation(station, ready, 1 / 30, "captain");
    expect(presentation).toMatchObject({
      stationId: "coin-cay",
      heading: "Coin Cay · LOOP READY",
      icon: "↻",
    });
    expect(presentation.detail).toBe("CIRCLE ISLAND · RETURN HEAD TO BUOY · +2.5 SIZE");

    const { context, arcs, text } = recordingContext();
    drawChargingStationField(context, {
      views: [{ station, state: ready }],
      worldToScreen: (point) => ({ x: 400 + point.x, y: 300 + point.y }),
      zoom: 2,
      width: 800,
      height: 600,
      fixedStepSeconds: 1 / 30,
      viewerPlayerId: "captain",
      now: 1_000,
    });

    expect(arcs).toContain(station.wrapRadius * 2);
    expect(arcs).toContain(station.dockRadius * 2);
    expect(text).toContain("⚓");
    expect(text.some((entry) => entry.includes("COIN CAY"))).toBe(false);
    expect(text.some((entry) => entry.includes("RETURN HEAD TO BUOY"))).toBe(false);
  });
});

import {
  drawGroundTreasureSpriteField,
  type GroundTreasureSpriteItem,
} from "./pirateSpriteAtlas";
import { drawWormateParentPortionField } from "./wormateParentRender";
import type { PickupThemeId } from "./worldCosmetics";

const parentPickupScratch: GroundTreasureSpriteItem[] = [];
const piratePickupScratch: GroundTreasureSpriteItem[] = [];

export function drawWorldPickupField(
  context: CanvasRenderingContext2D,
  items: readonly GroundTreasureSpriteItem[],
  worldToScreen: (point: { x: number; y: number }) => { x: number; y: number },
  zoom: number,
  width: number,
  height: number,
  now: number,
  themeId: PickupThemeId,
): void {
  if (themeId === "parent-sweet-feast") {
    if (!drawWormateParentPortionField(context, items, worldToScreen, zoom, width, height)) {
      drawGroundTreasureSpriteField(context, items, worldToScreen, zoom, width, height, now, "dense");
    }
    return;
  }

  if (themeId === "pirate-hoard") {
    drawGroundTreasureSpriteField(context, items, worldToScreen, zoom, width, height, now, "dense");
    return;
  }

  parentPickupScratch.length = 0;
  piratePickupScratch.length = 0;
  for (const item of items) {
    const target = Math.abs(Math.trunc(item.seed)) % 2 === 0
      ? parentPickupScratch
      : piratePickupScratch;
    target.push(item);
  }
  if (!drawWormateParentPortionField(
    context,
    parentPickupScratch,
    worldToScreen,
    zoom,
    width,
    height,
  )) {
    drawGroundTreasureSpriteField(
      context,
      parentPickupScratch,
      worldToScreen,
      zoom,
      width,
      height,
      now,
      "dense",
    );
  }
  drawGroundTreasureSpriteField(
    context,
    piratePickupScratch,
    worldToScreen,
    zoom,
    width,
    height,
    now,
    "dense",
  );
}

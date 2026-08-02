import {
  drawGroundTreasureSpriteField,
  type GroundTreasureSpriteItem,
} from "./pirateSpriteAtlas";
import type { PickupThemeId } from "./worldCosmetics";

/**
 * Every pickup in the arena is drawn from Wormifi's own treasure atlas.
 *
 * The parent company's portion art was imported for reference, not for
 * shipping: this division's food and treasure has to be its own. Until this
 * change the default theme drew the parent's sweets outright, and "mixed
 * bounty" split the field in half by seed - which is why an arena showed
 * doughnuts and watermelon sitting next to doubloons and ruby skulls, reading
 * as two games overlaid.
 *
 * `detail` is the one lever the atlas exposes, so themes differ in how densely
 * the hoard is packed rather than in whose art it is. Giving each theme its own
 * authored Wormifi pickup set is the follow-up; nothing here should ever reach
 * back into the parent atlas for it.
 */
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
  // "full" spends more per sprite on the sparser hoard themes; "dense" is the
  // cheaper path for a field packed edge to edge.
  const detail = themeId === "pirate-hoard" ? "full" : "dense";
  drawGroundTreasureSpriteField(
    context,
    items,
    worldToScreen,
    zoom,
    width,
    height,
    now,
    detail,
  );
}

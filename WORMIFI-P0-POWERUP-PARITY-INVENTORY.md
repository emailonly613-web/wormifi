# Wormifi P0 power-up function and presentation inventory

Checked: 2026-07-30

Scope: functional benchmarking only. Wormifi keeps original pirate-fantasy names, silhouettes, colors, animation, mechanics, and art. Nothing in this inventory authorizes copying another game's artwork, branded presentation, or trade dress.

## Public reference set

- [Wormate.io's current public power-up description](https://wormate.io/) describes the green speed, blue maneuverability, red-blue attraction, and orange x2/x5/x10 families, with limited durations.
- [The common player-maintained potion inventory](https://itswormateiotime.fandom.com/wiki/Potions) additionally documents random growth and zoomed-out view and distinguishes quick turning from straight speed.
- Current public gameplay/store screenshots were used only to confirm the presentation pattern: ground pickups contrast strongly with the field and active effects remain visible in the HUD. No external visual design is reused.

## Function-by-function inventory

| Status | External function/effect | Wormifi equivalent | Implemented and server-authoritative? | Clearly visible on the ground? | Clearly visible while carried? | Understandable without documentation? | Missing behavior or presentation | Proof path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **MISSING** | Random immediate growth award | No exact Relic | No. Rare treasure has deterministic mass and is not a random-growth power-up. | No | No | No | Decide whether an original pirate-fantasy random-growth mechanic belongs in Wormifi; implement only as a separately tested server mechanic. | `src/game/treasureEconomy.ts`; `src/game/relics.ts` |
| **PARTIAL** | Temporary faster movement with lower boost consumption | **Gale Pennant** (+18% movement) plus **Pepper Cutlass** (-25% Turbo size cost) | Yes. The external combined function is deliberately split into two server-simulated Relics. Collision rules and top Turbo speed remain truthful. | Partial: each has a labeled beacon, but their current silhouettes and motion are not yet unmistakable in a 600-drop room. | Partial: timer and copy exist; the two carried effects need visibly different motion languages. | Copy is clear; the visual distinction is not yet strong enough. | Large unique ground art, distinct pickup moments, wind-versus-ember carrier effects, and real mobile/desktop proof. | `src/game/relics.ts`; `src/game/core.ts` (`getMovementSpeedMultiplier`, `getBoostMassCostMultiplier`); `server/src/room.ts`; `tests/relics.test.ts`; `server/tests/integration/relics.test.ts` |
| **PARTIAL** | Instant or much sharper turning | **Maelstrom Wheel** (repeatable zero-clearance turns for 8 seconds) | Yes. The authoritative simulation raises the turn allowance to π radians while active. | Partial: label and orbit exist, but the astrolabe is still too close to ordinary pickup scale. | Partial: timer, badge, and copy exist; the carried effect currently shares too much language with other Relics. | The copy is clear; the turn state needs a unique vortex/wheel read at speed. | Large wheel silhouette, pickup whirl, carried wake curl, and proof of repeated 180/360-degree turns. | `src/game/core.ts` (`maximumTurn`); `src/game/relics.ts`; `src/game/relicCanvasRender.ts`; `tests/relics.test.ts`; `server/tests/integration/relics.test.ts` |
| **PARTIAL** | Attract nearby food/loot | **Loot Compass** (pulls neutral treasure and the carrier's own wake loot for 12 seconds) | Yes. Eligibility and extended reach are resolved in the authoritative drop-collection step. | Partial: the labeled compass beacon reads better than ordinary loot, but still needs a larger premium silhouette and stronger pickup moment. | Mostly: active reach, timer, badge, and plain-language copy exist; attraction motion needs stronger visual pull lines. | Yes in the HUD; partially in world-only play. | Larger compass art, converging loot trails, and crowded-room proof without implying attraction of rival-owned loot. | `src/game/core.ts` (`activeCollectors`, `collectorMayExtendReach`); `src/game/relics.ts`; `src/game/relicCanvasRender.ts`; `tests/relics.test.ts`; `server/tests/integration/relics.test.ts` |
| **PARTIAL** | Temporary score/value multiplier (x2/x5/x10 externally) | **Gilded Ledger** (x2/x3/x5 neutral treasure for 8 seconds) | Yes. Tier is attached to the server drop/active state and applied only to neutral arena treasure. | Partial: the tier appears in the label, but a coin stack is not yet an unmistakable enchanted ledger. | Partial: exact tier and timer appear in the HUD; carried world effect is not yet uniquely “value multiplied.” | HUD copy is clear; the in-world state is not. | Original ledger silhouette, tier-specific coin/jewel cadence, x2/x3/x5 pickup burst, and visibly different carried value trail. External x10 is intentionally not claimed. | `src/game/relics.ts` (`GILDED_LEDGER_TIERS`, `getTreasureMassMultiplier`); `src/game/core.ts` (`awardedMass`); `src/game/relicPresentation.ts`; `tests/relics.test.ts`; `server/tests/integration/relics.test.ts` |
| **PARTIAL** | Zoomed-out or enlarged field view | **Emerald Spyglass** (25% farther view plus coarse off-screen danger bearings for 10 seconds) | Yes for activation/state; the camera and privacy-preserving bearing presentation are derived from the server-authoritative active Relic and public rival state. | Partial: the spyglass object is recognizable, but still undersized beside the new ordinary-treasure field. | Partial: timer, badge, wider camera, scanning ring, and danger bearings exist; the transition and active view frame are not yet dramatic enough to be unmistakable. | The HUD copy is clear; a first-session player may not attribute the camera change to the Spyglass quickly enough. | Larger ground spyglass, lens pickup flash, explicit “VIEW +25%” transition, distinctive scope edge treatment, and desktop/mobile before/after proof. | `src/game/relics.ts` (`SPYGLASS_CAMERA_ZOOM_MULTIPLIER`, `getSpyglassDangerBearings`); `src/components/ArenaCanvas.tsx`; `src/components/LiveArenaCanvas.tsx`; `tests/relics.test.ts`; `tests/relic-presentation.test.ts` |

## Current Wormifi Relic acceptance ledger

| Relic | Mechanical state | Ground state | Carried/HUD state | P0 result |
| --- | --- | --- | --- | --- |
| Loot Compass | PASS | PARTIAL | PARTIAL | PARTIAL |
| Emerald Spyglass | PASS | PARTIAL | PARTIAL | PARTIAL |
| Pepper Cutlass | PASS | PARTIAL | PARTIAL | PARTIAL |
| Gale Pennant | PASS | PARTIAL | PARTIAL | PARTIAL |
| Maelstrom Wheel | PASS | PARTIAL | PARTIAL | PARTIAL |
| Gilded Ledger | PASS | PARTIAL | PARTIAL | PARTIAL |

`PASS` requires fresh desktop and landscape-mobile play proof. A source path or passing mechanic test alone cannot upgrade presentation to PASS.

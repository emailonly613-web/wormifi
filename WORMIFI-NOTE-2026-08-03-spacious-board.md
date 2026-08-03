# Note for the next session — spacious board + wheel zoom shipped 2026-08-03

Owner orders executed this session (live at `4460c8e`, verified on the public domain):

- **Default board is 2.7x the area**: `LIVE_SPATIAL_PROFILE` = radius **2,400** (was 1,450),
  drops **1,100**, population unchanged at 32. Camera base zoom 1.45 → **1.26**, follow
  half-life 0.055 → **0.09 s**.
- **Mouse-wheel / pinch zoom**: `src/game/cameraZoomControl.ts` — 0.72–1.45x, eased
  (`advanceZoomMotion`), persisted (`wormifi.camera-zoom.v1`). Both canvases wire it; steering
  reads the presented (eased) zoom so aim never bends mid-glide.
- **No zoom out-sees the server**: final zoom is floored at `MAX_VISIBLE_WORLD_RADIUS` (1,500)
  and `DEFAULT_PLAYER_INTEREST_RADIUS` rose to 1,600 — the pair is test-pinned together
  (`tests/spatial-feel.test.ts`).
- **Face + tail** (owner: "not aligned… tail getting smaller"): the face now sits on the DRAWN
  neck axis (input direction swings ahead of the pose mid-turn — that was the slide); the tail
  is a short quarter-circle cap (last ~10%, floor 0.5x), not the 22% cone. Proven in motion,
  eight headings, local + live.

## ⚠ The trap that almost kept it all invisible

`deploy/deploy.ps1` **pinned ARENA_RADIUS=1450 / TARGET_DROP_COUNT=600 as env vars**, which
override the code defaults — the first deploy shipped the new bundle while the live room stayed
tight, and the verify step "proved" the stale numbers it had just pinned. The wrapper now
**parses the profile out of `src/game/spatialFeel.ts`** for both the env pins and the verify.
If you add a profile field the server reads, keep it out of the spec or derive it the same way.

Boundary-death tests derive their out-of-bounds spawn from the profile now
(`LIVE_SPATIAL_PROFILE.arenaRadius + 650`) — hardcoded "outside" coordinates go stale when the
board grows.

Suites at push time: root 359/359, server integration green, both typechecks clean.

# Wormifi Pirate Power and Pace Contract

Status: **LOCAL CANDIDATE INTEGRATED — FULL BROWSER, EXTERNAL AND SOAK ACCEPTANCE PENDING**

Owner amendment date: **2026-07-31**

This contract makes Wormifi's pre-run pace choice and temporary-power baseline
explicit. The goal is functional category completeness expressed as original,
readable pirate play—not copied names, art, tuning or presentation.

## 1. Pre-run pace choice

Every new run offers three clear pace profiles before play:

| Pace | ID | Normal speed | Sprint speed | Intended feel |
| --- | --- | ---: | ---: | --- |
| **Harbor** | `harbor` | 100 | 170 | Patient long-run default; roughly half the previous normal pace |
| **Classic** | `classic` | 212 | 330 | Previous Wormifi pace preserved as a faster opt-in room |
| **Tempest** | `tempest` | 235 | 365 | Fast, deliberate high-pressure room |

Rules:

- A live room has one server-authoritative pace. The first successful join
  locks it; later captains see and accept that room's pace or receive a clear
  mismatch response. A client can never select a private speed advantage.
- Practice and solo use the local selection. Challenges and newly recorded
  replays bind the selected pace so the same inputs rebuild the same run.
- Missing/unknown new-run selection means `harbor`. Legacy recordings that
  predate pace selection still mean `classic` exactly so saved runs do not
  silently change speed.
- Pace changes movement and sprint speed only. It never changes collision
  circles, treasure value, spawn protection, paid power or matchmaking rank.
- The launcher and in-arena room identity both disclose the effective pace.

## 2. Required pirate power set

Wormifi keeps one visible, timed power slot. Collecting a new power replaces the
current one; durations and effects never stack.

| Wormifi power | Duration | Functional promise | Hard boundary |
| --- | ---: | --- | --- |
| **Treasure Magnet** | 12 s | Pulls neutral treasure and the carrier's own wake loot from 35% farther away; magnetic face rays appear only while this timer is active | Never pulls rival crash loot, objectives or other powers; ordinary heads never show magnet rays |
| **Gale Pennant** | 8 s | Raises the carrier's normal and sprint movement by 18% within the authoritative simulation | No teleport, immunity or collision change |
| **Maelstrom Wheel** | 8 s | Grants repeated zero-clearance steering for the entire timer: every requested heading resolves in one fixed simulation step, so the carrier can reverse 180 degrees or draw consecutive tight 360-degree loops, including while sprinting | It is not a one-use flip; it does not turn automatically, alter rivals' input, remove sprint cost or skip collision along the travelled path |
| **Emerald Spyglass** | 10 s | Pulls the camera back to show 25% farther in each screen direction and retains coarse off-screen danger bearings | No hidden exact coordinates, collision change or server-only information |
| **Treasure Multiplier** | 8 s | Activates a disclosed `2×`, `3×`, `4×`, `5×` or rare `10×` tier for every positive-mass treasure pickup eaten while active | Never multiplies charging-pad rewards, kills, power pickups, subscriptions or paid rewards |
| **Pepper Cutlass** | 8 s | Reduces sprint mass cost by 25% | Never raises top speed, makes sprint free or grants immunity |
| **Twin Turbo Lightning** | 7 s | Makes Turbo mass cost zero for seven seconds, equal to two full launch-size 3.5-second tanks | Never raises top speed, changes collision or grants immunity |

The required functional baseline therefore covers temporary attraction, speed,
agile/instant turning, camera pullback, bounded growth multiplication and a
finite two-tank Turbo reserve. The item identities, presentation, tuning,
safeguards and pirate decision-making are Wormifi's own.

The Maelstrom Wheel's eight seconds are a continuous steering state, not eight
seconds in which one stored turn may be spent. While its timer is active, every
new pointer, thumb or keyboard direction can use the zero-clearance law. Normal
mass-dependent turn radius returns on the exact authoritative expiry tick.

## 3. Multiplier rules

- Normal treasure is unmultiplied. A Treasure Multiplier ground item visibly
  declares one server-chosen tier: `2×`, `3×`, `4×`, `5×` or rare `10×`.
- The deterministic ten-drop launch cadence is
  `2×, 3×, 4×, 5×, 10×, 2×, 3×, 2×, 4×, 2×`. This makes `10×` one tenth of
  multiplier drops without client-side random rolls.
- The tier is part of the authoritative ground item, activation event, active
  slot and reconnect snapshot. A client never rolls or upgrades its own tier.
- Every positive-mass pickup the carrier eats while active is multiplied,
  including neutral treasure, Sprint Echoes and visible Rival Hoard jewels.
  Stored Echo-bank mass remains exact; only each visible collected portion is
  multiplied at collection time.
- The highest legal result is the rare `10×`. A second multiplier replaces the
  active slot; it does not stack with the first multiplier.

## 4. Presentation and comprehension

- Every ground power has a distinct pirate name, silhouette or badge, color,
  short effect label and high-contrast fallback that does not rely on color.
- Treasure Multipliers are standalone floating `2×`, `3×`, `4×`, `5×` and `10×` number
  glyphs kept near the ordinary-treasure scale, with no coin, medallion,
  square, card or treasure sprite behind them.
- Tier color is redundant identification, not decoration alone; the printed
  number remains the authoritative cue for color-vision accessibility.
- Treasure values are not printed across the arena. After a pickup is eaten,
  its final already-multiplied `+amount` appears briefly at the worm and fades.
- The top-center timed-power HUD is an open treasure chest. Its raised prize is
  the actual Magnet, Lightning or multiplier tier, with an authoritative
  seconds countdown and progress bar. It disappears at the expiry tick.
- The carrier, rivals and HUD disclose the active advantage and remaining time.
- Treasure Magnet rays are a state signal, not permanent decoration. They
  render on the carrier's face only while the authoritative Magnet is active.
- Reduced-motion mode preserves the same information without pulsing or spin.
- The first-use callout states the actual effect in plain language. External
  player testing must confirm that newcomers can explain each effect after one
  encounter without coaching.

## 5. Authority, compatibility and proof gates

- Spawn, tier, collection, activation, replacement, expiry, movement, turning
  and awarded mass are authoritative simulation state.
- Additive protocol-v5 fields may preserve old clients only when they fail
  safely. No compatibility fallback may silently grant the wrong power.
- The finished candidate needs deterministic unit/replay coverage; two-client
  authority, reconnect and room-lock coverage; browser presentation and
  accessibility coverage; impairment and bounded-load passes; then actual
  desktop and phone play at all three paces.
- The exact feature-complete build must pass 60-minute, 6-hour and 24-hour room
  soaks. Earlier fresh-room or pre-power results do not prove this candidate.
- Until those gates pass, the honest state is **local candidate**, never
  feature-complete, fair, launch-ready or competitor-superior.

## 6. Invisibility decision

Full invisibility is **not accepted into the current candidate**. A collision
game becomes unreadable if an opponent can be entirely absent while retaining
an ordinary lethal body. A later rare **Ghost Veil** experiment may reduce body
opacity only if opponents still see a clear collision wake/outline, the head
remains target-readable at close range, the timer is server-authoritative, and
external tests show that deaths remain understandable. No client may hide an
authoritative collision body on its own.

## 7. Compatibility naming

The public power is **Treasure Magnet**. Protocol v5 deliberately retains the
legacy internal ID `loot-compass`, and an absent legacy Relic identity still
maps to that ID, so recorded replays and older clients do not silently change.
The legacy ID is a compatibility seam, not player-facing copy.

# Wormifi Pirate Power and Pace Contract

Status: **OWNER-REQUIRED LAUNCH CONTRACT — IMPLEMENTATION AND ACCEPTANCE PENDING**

Owner amendment date: **2026-07-30**

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
| **Loot Compass** | 12 s | Pulls neutral treasure and the carrier's own wake loot from 35% farther away | Never pulls rival crash loot, objectives or other powers |
| **Gale Pennant** | 8 s | Raises the carrier's normal and sprint movement by 18% within the authoritative simulation | No teleport, immunity or collision change |
| **Maelstrom Wheel** | 8 s | Grants repeated zero-clearance steering for the entire timer: every requested heading resolves in one fixed simulation step, so the carrier can reverse 180 degrees or draw consecutive tight 360-degree loops, including while sprinting | It is not a one-use flip; it does not turn automatically, alter rivals' input, remove sprint cost or skip collision along the travelled path |
| **Emerald Spyglass** | 10 s | Pulls the camera back to show 25% farther in each screen direction and retains coarse off-screen danger bearings | No hidden exact coordinates, collision change or server-only information |
| **Gilded Ledger** | 8 s | Activates a disclosed `x2`, `x3` or `x5` neutral-treasure growth tier; ordinary play is `x1` | Never multiplies crash loot, sprint Echoes, charging rewards, powers, kills or paid rewards |
| **Pepper Cutlass** | 8 s | Reduces sprint mass cost by 25% | Never raises top speed, makes sprint free or grants immunity |

The required functional baseline therefore covers temporary attraction, speed,
agile/instant turning, camera pullback and bounded growth multiplication. The
item identities, presentation, tuning, safeguards and pirate decision-making
are Wormifi's own.

The Maelstrom Wheel's eight seconds are a continuous steering state, not eight
seconds in which one stored turn may be spent. While its timer is active, every
new pointer, thumb or keyboard direction can use the zero-clearance law. Normal
mass-dependent turn radius returns on the exact authoritative expiry tick.

## 3. Multiplier rules

- `x1` is the default state. A Gilded Ledger ground item visibly declares one
  server-chosen tier: `x2`, `x3` or `x5`.
- The tier is part of the authoritative ground item, activation event, active
  slot and reconnect snapshot. A client never rolls or upgrades its own tier.
- Only the visible mass of ordinary neutral `arena` treasure is multiplied.
  Echo-bank conservation remains exact and entirely outside the multiplier.
- The highest legal result is `x5`. A second Ledger replaces the active slot;
  it does not multiply the first multiplier.

## 4. Presentation and comprehension

- Every ground power has a distinct pirate name, silhouette or badge, color,
  short effect label and high-contrast fallback that does not rely on color.
- The carrier, rivals and HUD disclose the active advantage and remaining time.
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

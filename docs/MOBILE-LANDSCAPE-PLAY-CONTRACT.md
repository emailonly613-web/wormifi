# Wormifi Mobile Landscape Play Contract

Status: **OWNER-REQUIRED STANDARD — PHYSICAL-DEVICE ACCEPTANCE PENDING**

Owner clarification date: **2026-07-30**

Wormifi mobile gameplay is a horizontal, wide-arena experience. Portrait may
remain available for the launcher and settings, but no Solo, Practice,
Challenge or Live run may begin or continue as supported portrait gameplay.

## Runtime behavior

- Pressing Play on a touch-capable portrait viewport opens a branded rotate
  gate instead of starting the run.
- The browser requests a landscape orientation lock when that API is available.
  A visible rotate gate remains the fallback when a browser or embed denies it.
- Rotating to landscape starts the pending run automatically.
- Rotating back to portrait during local play pauses and hides the arena. Live
  play disconnects from the visible arena and uses the existing reconnect token
  when landscape returns; the UI never pretends that a server-owned room paused.
- The PWA manifest declares landscape orientation.
- Desktop play is unaffected. A narrow desktop browser is not treated as a
  phone unless the environment exposes touch or coarse-pointer capability.

## Landscape composition

- Touch steering, Sprint, Exit, run HUD, tutorial, room identity, radar and
  active Relic status remain reachable and inside 320-high and 390-high
  landscape viewports.
- The wider camera is the supported mobile gameplay composition. Portrait HUD
  layouts and portrait gameplay screenshots are not release evidence.
- Safe-area insets remain respected on both handed control layouts.

## Acceptance

- Browser proof shows 320x568 and 390x844 portrait starts blocked, followed by
  automatic successful play at 568x320 and 844x390.
- The complete mobile browser journey runs in a landscape phone profile.
- Physical Android and iPhone testing confirms orientation lock/fallback,
  mid-run rotation, touch steering, reconnect and thermal behavior before the
  mobile gate is called complete.

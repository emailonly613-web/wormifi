# Captain Rooms viral-first launch contract

Status: **FREE-LAUNCH PRODUCT AND AUTHORITY FOUNDATION**

Owner requirement date: **2026-07-31**

## Locked launch rule

Captain Rooms are 100% free during the viral-growth launch phase.

- The host pays nothing.
- Every invited player pays nothing.
- Creating, copying, sending, opening, joining, dying, retrying, and replaying
  inside the room consume no credit and trigger no checkout.
- A Captain Passport is optional and cannot appear as a barrier before joining.
- The host receives privacy and capacity only, never a competitive advantage.
- No launch UI may show the parked `$4.99`/10-credit concept.

The room link is a distribution engine. Charging before the link is generated
would interrupt the host-to-friends loop before the new players ever reach
Wormifi.

## Free room choices

| Room choice | Human seats | Launch price | Dedicated board |
| --- | ---: | ---: | --- |
| `captain-room-10-session-v1` | 10 | Free | `captain-cove-10` |
| `captain-room-20-session-v1` | 20 | Free | `captain-cove-20` |
| `captain-room-30-session-v1` | 30 | Free | `captain-cove-30` |

Rooms live while they are active and retire under the ordinary server idle-room
policy. There is no user-facing 60-minute meter or purchase window at launch.

## One-tap URL contract

1. The host selects 10, 20, or 30 seats.
2. Wormifi uses browser cryptographic randomness to create an opaque id:
   `captain-{10|20|30}-{20 lowercase hexadecimal characters}`.
3. The clean production link is:
   `https://wormifi.com/?room={opaque-room-id}`.
4. The link contains no checkout, email, account, token, board, pace, ad,
   campaign, or local-server parameter.
5. Creating the room attempts to copy the link immediately and always opens the
   visible Copy Link/Share surface as a deterministic fallback.
6. A player opening that exact link receives a guest name and enters Live play
   immediately. No Play button or login pop-up stands between the invite and
   the arena.
7. The opaque id binds every participant to the same authoritative room.

Local previews preserve the local origin instead of accidentally sharing a
public production URL. On `wormifi.com`, the same builder naturally produces
the canonical production link above.

## Server authority

1. Only a room id matching the strict Captain Room pattern activates a Captain
   room.
2. The server derives 10/20/30 capacity from that validated id and constructs
   the corresponding board itself.
3. A client cannot enlarge the capacity or override the board/pace through a
   query string or join message.
4. Captain Cove boards remain absent from the public board catalog.
5. No bots masquerade as invited players.
6. Reconnect-grace reservations count against the human-seat cap.
7. The 11th, 21st, or 31st new captain fails closed with `ROOM_FULL`.
8. Ordinary public matchmaking and existing friend-room links remain separate.
9. Server-wide room and connection limits still apply. “Free” does not mean an
   unbounded resource allocation or a promise of infinite capacity.

## Friction budget

The target host path is:

`Captain Rooms → choose size → Create Free Room & Copy Link → send`

The target guest path is:

`open link → same live arena`

No account creation, email confirmation, room-credit explanation, price table,
purchase receipt, lobby code transcription, or second join click is permitted
in those paths.

The test must record:

- time from Captain Rooms open to link copied;
- copy success and visible fallback success;
- time from guest link open to first authoritative arena frame;
- exact room identity equality across host and guest;
- login/payment interruptions, which must be zero;
- invite sends, opens, joins, both-played completion, replay, D1, and D7.

## Monetization separation

Free rooms can create valuable traffic, but traffic is not automatically
revenue. Monetization must happen after Wormifi demonstrates that the room loop
adds players and retention.

Allowed future research lanes:

- independently served between-run ads after a meaningful play session;
- optional rewarded ads that unlock cosmetic choices;
- deeper cosmetic catalog and Captain Passport restoration;
- later premium room cosmetics, presentation, or organizer tools that do not
  block the basic free room link.

Not allowed without separate approval and evidence:

- an ad before the first play;
- an ad or payment wall before an invite link or join;
- forced rewarded ads;
- pay-to-win power, speed, collision, score, rank, treasure odds, or size;
- targeted advertising or commerce that has not passed age/privacy/legal review;
- an ad SDK added merely because a room link exists;
- a launch promise that ad views or shop browsing will occur.

The parked `$4.99`/10-credit concept is future research only. It cannot return
to the launch surface unless free rooms have already established the viral
baseline and a new owner decision explicitly reopens pricing.

## Host and player safety gates

Before broad public scale, the host still needs clear room naming limits,
invite reset, remove/ban, report, mute, leave, capacity, and expiry controls.
Abuse handling, age/legal review, privacy retention, uptime policy, and customer
support must be approved. A private room cannot imply secret or unmoderated
conduct.

## Evidence required before launch claims

- 10/20/30 multi-client tests prove exact capacity enforcement;
- a generated URL contains only the validated room parameter;
- two independent browser contexts opening the same link enter the same room;
- invited guests enter without Passport or payment UI;
- the host can copy on one tap and recover through the visible copy field;
- room creation, reconnect, idle retirement, and closure survive intended
  server lifecycle behavior;
- rate limiting prevents cheap room links from becoming a resource-exhaustion
  path;
- the 20-first-time-player/five-friend-pair pilot measures completion and
  retention without coaching;
- real low-end mobile and public-WAN proof pass.

This contract proves a local free-room foundation only. It does not prove
public capacity, virality, retention, ad revenue, store conversion, moderation,
or legal readiness.

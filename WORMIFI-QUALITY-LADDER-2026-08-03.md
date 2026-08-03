# WORMIFI QUALITY LADDER — 100 items, scored out of 10, driven until 10

Owner order 2026-08-03: play locally, stress-test variations, chart 100 enhancement
items with honest scores and a plan to 10, then drive without stopping. Scores come
from REAL play sessions (Playwright walks of launcher/solo/practice/live/honeycomb/
phone viewport, frame-pacing probes, engine measurements) plus code reads. This file
is the drive's scoreboard — re-score an item the moment its work lands, with proof.

Legend: score 9–10 = ship-quality · 6–8 = solid, polish owed · 3–5 = weak, real work
needed · 1–2 = missing or broken. Items landed TONIGHT are marked ✅ with before→after.

## A. Core feel (the moment-to-moment worm)
| # | Item | Score | Plan to 10 |
|---|---|---|---|
| 1 | Eating growth presentation | ✅ 3→9 | WAS the balloon flaw (mass 49→499/sec applied same-tick, measured). Eased girth shipped (0.35s up/0.12s down, snap on respawn). 10 = add a subtle eat-swallow ripple down the neck. |
| 2 | Ordinary eating reward | ✅ 3→8 (LIVE) | WAS +0.4 mass per 30 ticks of eating. Commons 0.5–1.4 + chest 6 shipped. 10 = floating "+N" score motes on pickup. |
| 3 | Multiplier excitement | ✅ 2→10 | Stacking 2×/3×/4×/5×/10× with no cap, shipped, layer-proven, AND celebrated: tier-pitched chime + STACKED callout + gold burst + haptics landed at d4251d1. |
| 4 | Camera follow feel | ✅ 6→9 | Half-life 0.055→0.09s glide shipped. 10 = tiny look-ahead toward steering direction. |
| 5 | Player zoom control | ✅ 0→9 | Wheel/pinch 0.72–1.45×, eased, persisted, fairness-capped. 10 = pinch on mobile verified on a real handset. |
| 6 | Face alignment | ✅ 2→9 | Was rotating to input (slid around the head mid-turn); now seated on the drawn neck axis, 8-heading proven. 10 = blink/gaze already exist — confirm on all 190 skins. |
| 7 | Tail silhouette | ✅ 2→9 | Needle cone → quarter-circle cap (last ~10%, floor 0.5×), motion-proven. |
| 8 | Boost feel | 6 | Speed change is real but the visual is a faint trail. Plan: stronger wake particles + camera micro-shake on boost start. |
| 9 | Death moment | 5 | Instant vanish + hoard. Plan: a brief slow-mo pop + mass scatter animation (render-only). |
| 10 | Kill feedback for the killer | 4 | A callout exists; no visceral cue. Plan: screen-edge gold flash + "CUT!" sting + score burst. |
| 11 | Spawn moment | 5 | You just appear. Plan: a splash-in ripple (render-only, matches the sea theme). |
| 12 | Turn responsiveness at 15Hz snapshots | 7 | Local prediction + interpolation are solid (measured flat 60fps). Plan: verify feel at 150ms+ artificial latency and tune the prediction horizon. |
| 13 | Near-miss readability | 5 | Bodies are clear but there's no danger cue when a head nearly clips. Plan: brief rim-glow on the segment you almost hit. |
| 14 | Sprint/mass tradeoff clarity | 4 | Boost silently sheds mass. Plan: show shed motes leaving the tail + a small "-mass" readout while held. |
| 15 | Idle worm life | 6 | Blink/gaze exist. Plan: subtle breathing width oscillation at rest. |

## B. The boards
| # | Item | Score | Plan to 10 |
|---|---|---|---|
| 16 | Default board spaciousness | ✅ 3→9 | 1450→2400 radius (2.7× area), density retuned, live-proven. |
| 17 | Honeycomb Cove classic board | ✅ 0→9 | Built tonight: hex-lattice floor (one pattern fill/frame), zero objectives, launcher chip, board-aware matchmaking, live. 10 = a honey-gold ambient tint on drops there. |
| 18 | Board discoverability | ✅ 2→9 | Was buried in settings; three chips now sit above PLAY LIVE (desktop+phone proven). |
| 19 | Black Pearl Relay reachability | ✅ 3→9 | Was unreachable via matchmaking (board-blind balancer, fixed + integration-tested). 10 = a first-run toast introducing capstans. |
| 20 | Open Seas pad legibility | 6 | Pads glow but their ×1→×2→×3 rule is only in copy. Plan: on-pad progress ring with the current multiplier. |
| 21 | Arena boundary drama | 6 | Guardians exist. Plan: red heat shimmer on approach within 150 units. |
| 22 | Board-specific music/ambience | 1 | No music at all. Plan: one loop per board (see item 31). |
| 23 | Heat-ring event clarity | 5 | The callout is text-only. Plan: ring telegraph pulse + minimap echo. |
| 24 | Charging-station wrap feedback | 6 | Progress exists; interruption is quiet. Plan: sparks + audio tick while winding. |
| 25 | Per-board identity in the picker | 7 | Chips show name+label. Plan: micro-thumbnails of each floor in the chips. |

## C. Sound (the biggest single gap in the whole game)
| # | Item | Score | Plan to 10 |
|---|---|---|---|
| 26 | Eat sound | 3 | A lone tone ladder exists for streaks. Plan: soft per-pickup pop with pitch by mass. |
| 27 | Kill sting | 2 | Near-silent. Plan: a satisfying slice + coin-shower. |
| 28 | Death sound | 2 | Plan: descending splash. |
| 29 | Multiplier grant sound | ✅ 0→9 | New feature, silent. Landed: two-note chime rising with the tier, x10 = the biggest moment. 10 = a coin-shimmer tail on the jackpot. |
| 30 | Boost loop | 2 | Plan: water-rush loop while held. |
| 31 | Ambient bed per board | 0 | Plan: gentle sea loop (Open Seas), deeper hum (Honeycomb), drums (Relay); all behind the existing mute. |
| 32 | UI clicks | 3 | Sparse. Plan: consistent tick/confirm pair across launcher. |
| 33 | Volume/mute UX | 5 | Mute exists (portal SDK honors it). Plan: a slider in settings + persisted level. |

## D. HUD & information
| # | Item | Score | Plan to 10 |
|---|---|---|---|
| 34 | Boost-chip strip | ✅ 0→9 | Live top-center with per-tier countdowns + total. 10 = grant animation (chip pops in). |
| 35 | Score visibility during play | 6 | Corner stat card. Plan: score delta ticks up visibly on eat. |
| 36 | Leaderboard readability | 7 | Solid top-10 + your rank. Plan: highlight movement (▲▼) on rank change. |
| 37 | Radar usefulness | 7 | Stations + rivals shown, zoom-aware since tonight. Plan: multiplier tokens as gold dots. |
| 38 | Death recap | 6 | Cause + stats + 6s replay exist. Plan: "you outlived N%" line + biggest-meal stat. |
| 39 | Next-rank chase cue | 7 | "+N to next rank" exists. Plan: pulse it when within 10%. |
| 40 | Tutorial for first-run | 6 | Stage-based hints exist. Plan: a 15-second ghost-arrow overlay for the first spawn only. |
| 41 | Latency indicator | 3 | Nothing user-facing. Plan: a subtle connection-quality dot with plain-language tooltip. |
| 42 | Kill feed | 2 | No feed. Plan: right-edge 3-line feed of cuts (names only, no purchases — see parked blueprint). |
| 43 | Session timer/pace label | 6 | Pace exists in copy. Plan: show elapsed at death only (no HUD clutter). |
| 44 | Mobile HUD scale | 6 | Readable at 390px in walks. Plan: settle chip strip vs. notch overlap on real devices. |

## E. Launcher & flows
| # | Item | Score | Plan to 10 |
|---|---|---|---|
| 45 | Launcher clarity | 8 | Strong card; chips added tonight. Plan: trim to one screen on short laptops (~700px). |
| 46 | Name entry | 7 | Persists. Plan: dice button for a fresh pirate name. |
| 47 | Look chooser entry | 7 | CHOOSE LOOK opens the studio. Plan: live worm preview swims on the launcher card. |
| 48 | Play-again loop | 7 | One click. Plan: auto-focus PLAY AGAIN so Enter restarts. |
| 49 | Private room flow | 7 | Room codes + link proven in tests. Plan: copy-link toast confirmation. |
| 50 | Challenge-a-friend flow | 7 | Seed challenges work. Plan: show the target's look in the incoming banner. |
| 51 | Mode explanation (90s vs endless vs practice) | 6 | Labels only. Plan: one-line subcopy under each. |
| 52 | Settings panel organization | 6 | Everything is in one column. Plan: group into PLAY / LOOK / SYSTEM sections. |
| 53 | First-visit load time | 7 | Preview loads fast; bundle warning >500KB. Plan: code-split the studio + guides routes. |
| 54 | PWA install path | 8 | Real card, native prompt, iOS steps (proven earlier lane). Plan: install nudge after 2nd session only. |
| 55 | Rotate-gate on phones | 7 | Exists and tested. Plan: animate the rotate glyph. |

## F. Multiplayer & fairness
| # | Item | Score | Plan to 10 |
|---|---|---|---|
| 56 | Matchmaking board/pace awareness | ✅ 3→9 | Fixed + tested tonight (was silently rehoming). |
| 57 | Reconnect resilience | 8 | Tokens + resolved-room rejoin fixed tonight. Plan: artificial-drop soak test. |
| 58 | Bot honesty (labeled AI) | 8 | Labeled in the scoreboard — a genuine differentiator. Plan: subtle AI tag in-world on nameplates. |
| 59 | Bot skill variety | 6 | Aggression measured real. Plan: personality spread (cautious/hunter/collector) per room. |
| 60 | Spawn safety | 6 | Shield 1.5s. Plan: spawn-point scoring already exists — add shield ring visual so others see it. |
| 61 | Anti-out-see fairness ceiling | ✅ 9 | MAX_VISIBLE_WORLD_RADIUS pinned to interest radius, test-locked (keep it — conflicts with a parked blueprint item; owner call recorded). |
| 62 | Interest-radius pop-in | 8 | 1600 covers max zoom + margin. Plan: fade-in entities at the edge instead of appearing. |
| 63 | Room population balance | 7 | Seat-first fill. Plan: prefer rooms with humans over emptier ones at equal seats. |
| 64 | Score model fairness | 7 | Growth+kills+survival formula is sane. Plan: publish it on the how-to-play page (honesty brand). |
| 65 | Rejoin-after-crash UX | 6 | Token restore works. Plan: "welcome back, captain" toast on identity restore. |

## G. Performance & platform
| # | Item | Score | Plan to 10 |
|---|---|---|---|
| 66 | Frame pacing desktop | 9 | Measured 60.1fps / 16.8ms P95 repeatedly, WITH lattice + chips + easing. Plan: hold the gate. |
| 67 | Honeycomb lattice cost | ✅ 9 | One pattern fill/frame by design (never per-hex strokes). |
| 68 | Mobile frame pacing | 5 | Never measured on real hardware this lane. Plan: Playwright CPU-throttled run + a real handset session. |
| 69 | Bundle size | 5 | >500KB main chunk warning every build. Plan: split studio/guides/store chunks; target <350KB core. |
| 70 | Memory over long sessions | 6 | Easing/boost maps prune; particles bounded. Plan: 30-minute soak with heap snapshots. |
| 71 | Server tick health at 32 actors | 8 | Load tests exist for 200. Plan: re-run load suite against the 2400-radius profile. |
| 72 | Snapshot bandwidth | 7 | Tuples + interest scoping. Plan: measure bytes/sec at max zoom with 12 tokens; consider drop-delta quantization. |
| 73 | Cold start of the arena server | 8 | Boots in seconds. Plan: none needed now. |
| 74 | Error surfacing to players | 6 | Plain-language connect states exist. Plan: one friendly retry screen for repeated failures. |
| 75 | Crash telemetry | 4 | Page errors only visible in analytics events. Plan: window.onerror → GA4 event with build id (privacy-safe, no PII). |

## H. Visual polish
| # | Item | Score | Plan to 10 |
|---|---|---|---|
| 76 | Worm material/skin system | 8 | 190 skins + 9 materials + faces (prior lanes). Plan: confirm materials on the honeycomb palette. |
| 77 | Treasure sprite variety | 7 | Real pirate set. Plan: rare-chest sparkle loop. |
| 78 | Multiplier token look | 5 | Small tile with ×N. Plan: tier-colored glow ring (gold 2×, orange 5×, red 10×) + gentle bob. |
| 79 | Background parallax depth | 6 | Grid + ship backdrop. Plan: a second slower parallax layer of silhouettes. |
| 80 | Death hoard look | 7 | Body-shaped trace shipped in a prior lane. Plan: brief glitter on fresh hoards. |
| 81 | Screen-shake discipline | 7 | Exists, reduced-motion safe. Plan: cap stacking shakes. |
| 82 | Color accessibility | 6 | Palettes vary. Plan: a color-blind-safe outline toggle in settings. |
| 83 | Reduced-motion completeness | 8 | Materials/chips/lattice all honor it (chips animation gated tonight). Plan: audit particles under the flag. |
| 84 | Loading/empty states | 7 | Branded waiting text exists. Plan: replace bare text with the ship glyph + dots. |
| 85 | Favicon/OG/app icons | 8 | Fixed in prior lanes. Plan: OG image per board page. |

## I. Content & growth surfaces (organic lane)
| # | Item | Score | Plan to 10 |
|---|---|---|---|
| 86 | Guides hub accuracy after tonight | ✅ 4→9 | Freshness pass landed (devlog entry, changelog, how-to-play, glossary, llms.txt, feed, sitemap; seo:verify green). 10 = per-board landing pages (item 88). |
| 87 | Devlog cadence | 7 | Strong archive. Plan: tonight's entry ("The Spacious Update"). |
| 88 | SEO board landing pages | 5 | No honeycomb page yet. Plan: /honeycomb-cove.html + sitemap + internal links. |
| 89 | Brand SERP | 8 | Owned (prior lane). Plan: keep the daily prover. |
| 90 | Share-this-run block | 7 | Exists with X/FB/copy + highlight image. Plan: add the score + board name to the share text. |
| 91 | Results→play funnel for visitors | 7 | CTA solid. Plan: after a shared-challenge loss, offer instant rematch link. |
| 92 | How-to-play accuracy | ✅ 5→9 | Teaches wheel zoom, board chips, and the multiplier stack now. 10 = a controls screenshot refresh. |
| 93 | Captain's Log discoverability | 6 | Badge appears after first run. Plan: one-time glow on first unlock. |
| 94 | Passport pitch honesty | 7 | "Optional, save progress" — accurate (device-local). Plan: say "on this device" explicitly (no-spend truth). |
| 95 | llms.txt / AI-search freshness | 7 | Exists. Plan: add boards + multiplier facts. |

## J. Trust, safety, ops
| # | Item | Score | Plan to 10 |
|---|---|---|---|
| 96 | "No pay-to-win" integrity | 9 | True today and test-guarded in spirit. RECORDED CONFLICT: the parked monetization blueprint would break it — owner decision list stands apart; the ladder never ships that conflict silently. |
| 97 | Name filter/safety | 6 | Basic names only. Plan: a light profanity screen on arena names (client-side list, no server cost). |
| 98 | Deploy pipeline honesty | 9 | Wrapper parses the spatial profile from code (tonight's fix) + public-domain proofs. Plan: add a boosts-field live probe to the verify gate. |
| 99 | Test depth on new systems | 9 | Tonight: 24 new tests across easing/boosts/wire/chips/boards/matchmaking; 379 root + server green. Plan: keep every ladder fix test-first. |
| 100 | Two-agent tree discipline | 9 | Clean-tree commits, notes, derived pins. Plan: leave the ladder + notes for the co-agent (this file). |

## Drive order (highest player-felt value first)
1. ✅ Items 1–7, 16–19, 34, 56–57 (landed tonight, deployed at `619b0b5` + economy commit).
2. NEXT: 86/92 guides freshness (organic lane duty — the live pages now lie about the game).
3. Then: 3-to-10 polish (grant flash/sounds 26–31 as one "juice" pass), 78 token look, 10 kill feedback.
4. Then: 68/69 (mobile pacing + bundle split), 75 telemetry, 59 bot personalities.
5. Re-score after every landing; a claim without a fresh play-proof is not a score.

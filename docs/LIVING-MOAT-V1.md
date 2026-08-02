# Living Moat V1

**Status:** Implemented and browser-verified locally on desktop and mobile. This is visual presentation, not a gameplay rule or public-WAN proof.

## Product promise

Every arena visual skin owns the dangerous water outside its authoritative circular wall. Quiet guardians patrol the moat; when any worm reaches the boundary, the nearest guardian lunges toward the final legal contact point. The wall remains the clear gameplay signal and is painted last above every creature and effect.

| Arena visual skin | Living moat | Idle roster |
| --- | --- | --- |
| Midnight Navigator | Shark & Kraken Moat | Reef sharks and ancient kraken sentries |
| Emerald Kraken Depths | Abyssal Leviathan Moat | Cold-water leviathans and emerald kraken |
| Candy Nebula | Candy Leviathan Moat | Gummy leviathans and candy sharks |
| Dragon's Volcanic Vault | Magma Dragon Moat | Magma dragons and fire wyrms |

## Hard boundaries

- Guardians are deterministic Canvas presentation and never enter collision, spawning, rewards, rank, or server authority.
- Every idle and lunging guardian center remains strictly outside the playable radius.
- The renderer runs only while the expanded boundary annulus intersects the viewport.
- Idle motion is slow and translucent; one short boundary-death lunge is the only high-emphasis beat.
- Reduced-motion players receive the same themed moat in a frozen state with no lunge.
- Local and authoritative Live use the same visual roster and geometry constraints.
- Arena themes remain independently selectable from food/treasure fields and never change the room's authoritative board ID.

## Verification contract

- Unit tests map all four arena themes to one named roster and assert every patrol slot stays outside the arena.
- Browser tests load all four themes through the real Live canvas, trigger a server-shaped boundary death, verify theme/roster attributes, and capture desktop and mobile proof.
- The ordinary wall, worm, growth, collision, and performance gates remain separately required.

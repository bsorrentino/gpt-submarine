# Depthwatch

A playable TypeScript browser game implementing `.agent/specs/F001_GAME.md` and its four sketches. Command one destroyer against five submarines in an isometric ocean cutaway.

## Run

Requires Node.js 22.18+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use `npm run build` for a production build in `dist/`, and `npm run preview` to serve that build.

## Controls

| Action | Keyboard |
| --- | --- |
| Move left / right | A / D or arrow keys |
| Fire port / starboard launcher | Q / E |
| Fire both launchers | Space |
| Set fuse to 90 / 160 / 230 meters | 1 / 2 / 3 |
| Pause / resume | P or Escape |

On-screen controls also support holding with a mouse or touch. Sound is opt-in. Switching tabs or losing window focus pauses the battle.

Lead moving submarines: charges inherit some ship velocity, follow an arc, lose speed on water entry, and sink under drag. A direct hit or a nearby depth-fuse explosion destroys a submarine. Orange surface markers indicate incoming torpedoes. Keep moving: a single torpedo hit destroys your ship. Sink all five submarines and survive the remaining ordnance to win. Restart from the mission result screen.

## Implementation

- Canvas 2D with a true isometric world projection and transparent ocean section; no external art assets or rendering dependencies.
- Fixed 120 Hz simulation, acceleration and inertia, air gravity, water-entry momentum loss, underwater terminal velocity, and swept charge collisions.
- Separate water-entry splashes, torpedo surface eruptions, underwater pressure bursts, and ship fireballs. Spray falls back into the water; bubbles rise; wreck debris sinks.
- Twin independently reloading launchers, rotating radar, submarine propellers, depth selection and submarine patrol/torpedo AI.
- Destroyed submarines split and descend. The destroyer lists and sinks after a hit.
- Responsive interface, keyboard and pointer controls, pause, replay, and synthesized optional audio.

Physics and destruction are stylized game approximations rather than a naval engineering simulation. Combat follows the sketches' single horizontal patrol corridor; the ocean volume provides the isometric presentation. Google Fonts are optional, with local system fallbacks.

## Verification

```sh
npm test
npm run build
npm run test:browser
```

Simulation tests exercise launch physics, splash transitions, fuse detonation, direct hits, wreck descent, torpedo outcomes, victory, movement limits, and population bounds. Browser tests exercise desktop keyboard controls, pause/resume, mobile pointer controls, and horizontal overflow; screenshots go to `test-results/`.

Browser tests use an installed Google Chrome. To use Playwright's bundled Chromium instead, remove `channel: 'chrome'` from `playwright.config.ts` and run `npx playwright install chromium`.

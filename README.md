# Makhluk Kecil 3D — playtest build

A small creature-raising game that runs entirely in the browser. This repository is the
static build served through GitHub Pages: open the Pages URL on your phone and play.

Build: **v42**. The game clock runs in real time (one real day = one game day), so a
creature grows over weeks, not minutes.

## For testers

- Keep playing in **one browser** on one device. The save lives in that browser's
  storage; there is no account and no server.
- Don't clear the browser's site data for this page, or the family is gone.
- The **Family** sheet has a **Back up** button that gives you a copy of the save
  (and **Restore** to load it on another browser or device).
- If the egg "does nothing", that is expected: eggs hatch on real time.

## Layout

- `index.html` — the game (UI and 3D scene)
- `*.js` — game modules (engine, storylets, town, cosmetics, ...)
- `lib/` — three.js r128 (MIT, see `lib/LICENSE.three.txt`)
- `.github/workflows/pages.yml` — publishes the folder to GitHub Pages on every push to `main`

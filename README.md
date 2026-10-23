# Makhluk Kecil 3D — playtest build

A small creature-raising game that runs entirely in the browser. This repository is the
static build served through GitHub Pages. Play it at
https://irf4n-muhammad.github.io/simul-game/ on your phone.

Build: **v44**. The game clock runs in real time (one real day = one game day), so a
creature grows over weeks, not minutes.

## Install it like an app

- Android (Chrome): open the link, then menu ⋮ → **Install app** (or **Add to Home screen**).
- iPhone (Safari): open the link, then Share → **Add to Home Screen**.

Install first, then always play from that icon: the installed app and the browser tab
keep separate saves. If you already started in the browser, use **Back up** there and
**I have a backup** in the installed app.

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

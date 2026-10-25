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

This repository is now the **source** of the game; GitHub Pages serves the build.

- `index.html` — page shell (markup and CSS); loads the modules and `ui.js`
- `ui/*.js` — the UI script in 31 fragments, stitched into one `ui.js` by `tools/build_ui.py` (generated, not committed)
- `*.js` — game modules (engine, storylets, town, cosmetics, ...); see `MODULES.md`
- `today.js` — the "Today" line, a pure module with tests
- `sim/` — Node simulators and browser harnesses, with last results in `sim/last/` (see `sim/README.md`)
- `test/` — unit tests for pure functions (`npm test`)
- `tools/` — `build_ui.py` (stitch UI, `--release` strips Dev code) and `build_site.py` (assemble `_site/`)
- `lib/` — three.js r128 (MIT, see `lib/LICENSE.three.txt`)
- `.github/workflows/pages.yml` — lint, test and build on every push and PR; deploys `_site/` from `main`

## Untuk pengembang

Dokumen pengembang ditulis dalam bahasa Indonesia; teks yang dilihat pemain tetap bahasa Inggris.

```
npm install            # eslint, terser, globals
npm run lint           # gabung ui.js lalu ESLint (no-undef = error, no-unused-vars = peringatan)
npm test               # tes unit Node (node --test test/*.test.js)
npm run build          # _site/   : situs seperti yang di-deploy Pages (CDN three.js diganti lib/)
npm run build:release  # _release/: build tanpa kode Dev; ditolak kalau masih ada jejak Dev
npm run check          # keempatnya berurutan
```

Fragmen UI ada di `ui/`; `ui.js` adalah hasil gabungan dan tidak di-commit. Peta modul, penanda blok Dev, dan catatan penamaan ada
di `MODULES.md`; simulator dan angka terakhirnya di `sim/README.md`; penjelasan untuk orang awam ada di dokumen
"Cara Kerja Makhluk Kecil" (tautan di `peta/README.md` proyek).

# Panduan singkat buat AI assistant (dan orang baru)

Baca `ARCHITECTURE.md` dulu. Ringkasnya:

- **Save = catatan aksi yang diputar ulang dari hari 0.** Modul simulasi (`engine.js`, `storylets.js`, `status.js`, `game.js`, dst.) harus
  deterministik: acak hanya lewat `seed_rng`, tanpa `Math.random`, `Date.now()`, DOM, atau `localStorage`.
- Perubahan logika simulasi yang mengubah cerita save lama harus dipagari flag `*_from` (lihat ARCHITECTURE.md bagian 3).
  `test/golden_replay.test.js` gagal kalau replay save contoh berubah. Jangan perbarui golden-nya untuk refactor; perbarui hanya kalau
  perubahannya disengaja, dan tulis alasannya.
- `ui/*.js` digabung jadi satu lingkup (`ui.js`, hasil build, jangan diedit). Urutan nama file = urutan eksekusi. Sebelum mengubah nama
  atau variabel bersama, cek `docs/PETA-UI.md` (siapa memakai apa).
- Teks yang dilihat pemain: bahasa Inggris. Komentar dan dokumen: bahasa Indonesia.
- Teks dari pemain/Claude masuk HTML lewat `esc()`.
- Modul baru: `index.html` (`<script src>`), `MODULES` di `eslint.config.js`, baris di `MODULES.md`, tes di `test/`.

Perintah:
```
npm run check            # lint + peta + tes + build + build rilis (sama dengan CI)
python3 tools/peta.py    # perbarui docs/PETA-UI.md dan kolom Baris di MODULES.md (lint gagal kalau basi)
npm run build && node sim/uisweep.js sim/fixtures/state_akun-biz0.json   # uji semua layar di browser (Playwright)
```
Merge ke `main` langsung deploy ke GitHub Pages (game live).

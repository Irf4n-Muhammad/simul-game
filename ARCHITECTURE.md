# Arsitektur Makhluk Kecil

Dokumen ini buat siapa pun (orang atau AI) yang mau **memperbaiki, mengedit, atau menambah** sesuatu di game ini. Baca bagian 1–3 sekali;
bagian 5 (resep) dipakai tiap kali kerja. Detail per file ada di dua peta:

- `MODULES.md`: tiap modul game (`*.js` di akar): tugas, API, data yang dipegang, hook. Kolom "Baris" diperbarui otomatis.
- `docs/PETA-UI.md`: tiap fragmen UI (`ui/*.js`): isi, siapa memakai siapa, state UI bersama. **Dibuat otomatis** (`python3 tools/peta.py`).

## 1. Gambaran besar

Game ini situs statis (GitHub Pages) tanpa server game. Semua jalan di browser pemain, save di `localStorage`.

```
index.html  (markup + CSS, urutan <script>)
  │
  ├─ lib/three.min.js r128 ..................... 3D
  ├─ modul game (*.js di akar) ................. aturan dunia, MURNI: tanpa DOM, deterministik, jalan juga di Node
  │     engine.js      Creature, Household, World, storylet registry, sutradara, simulate_day, HOOKS
  │     storylets.js   ±120 kejadian cerita (syarat + bobot + hasil)
  │     status.js, career.js, venture.js, bank.js, money.js, ...   sistem (kerja, bisnis, uang, skill)
  │     tonggak.js, anak.js, remaja.js                              kalender fase hidup
  │     game.js        lapisan pemain: state save, aksi pemain, replay, dilema
  │     today.js, soon.js, rekom.js, ...                            "potret masuk, teks keluar" buat HUD
  │     town.js, kota.js, globe.js, konser3d.js, liar.js, ...       dunia 3D (kulit; tidak dibaca simulasi)
  │
  └─ ui.js = gabungan ui/*.js .................. layar: rumah 3D, HUD, lembar, HP + app, kota, mini game
```

Aturan emas pembagian lapisan:

| Lapisan | Boleh | Tidak boleh |
|---|---|---|
| Modul simulasi (engine, storylets, status, game, ...) | baca/tulis state makhluk, pakai `seed_rng` | sentuh DOM, `Math.random`, `Date.now()`, `localStorage` |
| Modul murni pembantu UI (today, soon, rekom, kabar, ...) | baca potret yang diberikan UI, balikin teks/data | ubah state |
| Modul 3D (town, kota, rumah, liar, konser3d, ...) | baca jam/cuaca/state buat tampilan | ubah state simulasi |
| UI (`ui/*.js`) | semua di atas + DOM + `localStorage` | ubah makhluk langsung; perubahan dunia harus lewat `game.act(...)` |

## 2. Alur satu hari

1. **Jam** (`ui/01-save-clock.js`): `liveDay()` = hari game dari jam nyata (1 hari game = 1 hari nyata; Dev bisa mempercepat). Jam dijaga monoton
   dan lompatan dipotong `EconConfig.CATCHUP_DAYS`.
2. **Tick** (`ui/15-game-loop.js`): `game.advance(liveDay(), liveDay())` memajukan rumah tangga hari demi hari.
3. **Simulasi** (`engine.js` → `Household.view` → `simulate_day`): kebutuhan turun, agenda (`agenda.js`, `jadwal.js`), kejadian paksa (`FORCED`,
   mis. tonggak/kalender sekolah), sutradara memilih storylet (`director_pick` dengan anggaran drama mingguan), HOOKS dipanggil
   (`status`, `keinginan`, `akhir_hidup`, ...). Hasilnya log hari (`x.say(...)`).
4. **Dilema**: storylet yang memanggil `x.ask(...)` melempar `NeedInput` kalau pemain belum menjawab. `game.advance` mengembalikan rumah ke
   snapshot sebelum hari itu, menyimpan `game.pending`, lalu UI menampilkan `showDilemma()` (`ui/09-sheets.js`). Jawaban: `game.answer(...)`.
5. **Aksi pemain** (tombol makan, belajar, beli, daftar sekolah, ...): `game.act(cid, "jenis:arg")` → `Game._act` (atau `HOOKS.act` di modul
   sistem) → kalau diterima, dicatat ke `state.aksi`.
6. **Gambar**: `refresh()` memperbarui HUD; `frame(t)` (`ui/29a-render-loop.js`) menggambar satu adegan 3D tiap animation frame.

## 3. Save dan replay (paling penting)

Save (`localStorage["makhluk-kecil-3d-v2"]`) **bukan** potret keadaan makhluk. Isinya: pengaturan (`akun`, `nama`, `aturan`, `jam`, ...), hari yang
dihadiri pemain (`hadir`), jawaban dilema (`jawaban`), dan catatan aksi (`aksi: [[hari, cid, jenis, setengah?], ...]`).
Setiap kali game dibuka, `new Game(state)` **memutar ulang semua hari dari hari 0**. Akibatnya:

- **Simulasi harus deterministik.** Acak hanya lewat `seed_rng(...)` dengan benih dari akun/hari/makhluk. Jangan pakai `Math.random`, jam HP,
  cuaca asli, atau apa pun yang beda antar HP di modul simulasi.
- **Mengubah logika simulasi bisa mengubah cerita save lama.** Hari ke-300 di HP pemain bisa jadi cerita lain setelah update. Cara aman:
  pagari logika baru dengan flag "mulai hari X" yang ditulis ke state saat pemain pertama kali memakai versi baru. Contoh yang sudah ada:
  `state.ilmu_from`, `kerja1_from`, `pindah_from` (diteruskan ke `home.*_from` di konstruktor `Game`). Save lama tidak punya flag itu, jadi
  logika lama tetap jalan untuk hari-hari lamanya.
- **Pengamannya `test/golden_replay.test.js`**: memutar ulang tiga save contoh (`sim/fixtures/`) 1.200–1.400 hari dan membandingkan sidiknya
  dengan `test/golden/replay.json`. Kalau gagal setelah refactor, berarti ada perilaku yang berubah: cari penyebabnya. Kalau memang
  disengaja, perbarui dengan `UPDATE_GOLDEN=1 node --test test/golden_replay.test.js` dan tulis alasannya di PR.
- **Data yang bukan simulasi tidak masuk `aksi`.** Dompet koin dapur (`state.dapur`), jawaban "rawat terbalik" (`state.balik`), izin notifikasi
  (`state.kabar`), brand override, cache cuaca: disimpan di state/`localStorage` biasa, tidak diputar ulang, tidak menyentuh makhluk.
- **Kunci aksi menyimpan semua yang dibutuhkan replay.** Contoh: `trip:<kota>` menyimpan nama kota, bukan indeks, supaya replay tidak
  bergantung pada data peta versi mana pun.
- **Nama field adalah format save.** Jangan rename field `c.info.*`, `c.st.*`, atau jenis aksi tanpa migrasi (lihat "Catatan penamaan" di `MODULES.md`).

## 4. Cara kerja `ui/`

- `ui/*.js` **bukan** modul terpisah. `tools/build_ui.py` menggabungkannya urut nama file ke dalam satu fungsi `(() => { ... })();` = `ui.js`
  (file hasil, tidak di-commit). Nama top-level satu fragmen terlihat oleh semua fragmen lain.
- **Urutan nama file = urutan eksekusi.** `const`/`let` top-level harus sudah dideklarasikan sebelum dipakai saat inisialisasi; fungsi aman
  karena di-hoist. `39-start.js` harus tetap terakhir (dia yang menjalankan semuanya).
- Nomor fragmen: `00–15` inti (helper, save/jam, HUD, adegan 3D, makhluk, lembar, loop game), `16–28` app dan lembar fitur, `29*` kota/konser/
  wilayah liar + loop render, `31–37` agenda/fase hidup, `38*` fitur sesudah v48 (obrolan, notifikasi, mini game, kamar desktop), `39–40` start dan buku.
  Fragmen baru: pilih nomor + huruf di dekat fitur yang paling mirip (mis. `38m-...`).
- **Sebelum mengubah sesuatu yang dipakai bersama**, buka `docs/PETA-UI.md`: kolom "Dipakai oleh" dan tabel "State UI bersama" menunjukkan
  fragmen mana yang ikut kena. Variabel global yang paling sering dipakai: `state`, `game`, `cur`, `selected`, `feed`, `PH` (HP yang terbuka), `K` (makhluk 3D).
- Kode khusus Dev dibungkus `// DEV-BEGIN` ... `// DEV-END` (atau `// DEV-NEXT`); build rilis membuangnya. Lihat `MODULES.md`.
- Teks dari pemain atau Claude **selalu** lewat `esc()` sebelum masuk `innerHTML`. Untuk HUD yang diperbarui berkala pakai `setHtml`/`setText`
  (menulis DOM hanya kalau berubah).

## 5. Resep

### Menambah kejadian cerita (storylet)
1. Tulis di `storylets.js` (atau modul fase: `anak.js`, `remaja.js`, `tonggak.js` untuk kejadian berjadwal):
   ```js
   storylet("id_unik", ["anak", "remaja"], "kecil" /* kecil | sedang | besar */, {
     cooldown: 14, once: false,
     cond: x => x.c.needs.lapar < 30,      // kapan boleh muncul
     weight: x => 2,                        // seberapa sering dibanding yang lain
   }, x => {
     x.say(`${x.n} ...`);                   // teks pemain: bahasa Inggris
     x.need("mood", -5);                    // efek
   });
   ```
2. Pilihan pemain = `x.ask(...)` (jadi dilema; jawaban tersimpan di save, ikut replay).
3. Storylet baru **mengubah peluang** storylet lain di save lama (sutradara memilih dari kumpulan yang berubah). Kalau perlu save lama tetap
   sama, tambahkan `cond` yang memeriksa flag `*_from` (bagian 3). Jalankan `npm test`; golden replay akan memberi tahu.
4. Cek ritmenya: `node sim/sim_rhythm.js`.

### Menambah aksi pemain
1. Logika di `game.js` `_act` (aksi umum) atau di `HOOKS.act` modul sistemnya (`status.js`, `venture.js`, `ilmu.js`, ...), dengan kunci
   `"jenis:arg1:arg2"` yang memuat semua yang dibutuhkan replay.
2. UI memanggil `game.act(cid, "jenis:...")`, lalu `save()` dan `refresh()`.
3. Tes Node: panggil `game.act` lalu putar ulang dari `state` yang sama dan pastikan hasilnya identik (contoh pola: `test/jalan.test.js`).

### Menambah app di HP
1. Daftarkan di `PH_APPS` (`ui/18-phone.js`): `id`, `name`, `bg`, opsional `adult` / `young`.
2. Gambar layarnya di fragmen baru (pola: `ui/22-paws.js`, `ui/25-chirp.js`), lewat `phGo(id, arg)`.
3. Kalau app muncul lewat cerita: pintu di `wants.js` (`DOORS`) atau rak "Later" (`Remaja.LATER`).

### Menambah lembar (sheet) atau layar
`openSheet("jenis", html)` / `closeSheet()` (`ui/09-sheets.js`). Pasang handler sesudah `openSheet`. Lembar setengah layar otomatis membuat
adegan 3D di belakangnya digambar lebih jarang.

### Menambah mini game
Ikuti pola `ui/38f-game-baru.js`: objek di `FC.k`, langkah per frame, skor lewat `mgAdd`, hadiah lewat `FC.drop`/`mgPick`. Koin dapur dan
batasnya diatur `dapur.js` (bukan simulasi, tidak di-replay).

### Menambah adegan 3D sendiri (seperti konser, wilayah liar)
Buat modul di akar dengan `create(...)` yang mengembalikan `{ on, scene, camera, frame(t, dt), resize(w, h), dispose() }`, lalu tambahkan cabangnya
di `frame()` dan `resize()` (`ui/29a-render-loop.js`). Bebaskan geometri/material di `dispose()` saat keluar.

### Menambah modul game baru
1. File di akar dengan pola:
   ```js
   const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
   const NamaModul = (() => { ...; return { api }; })();
   if (typeof module !== "undefined") module.exports = NamaModul; else globalThis.NamaModul = NamaModul;
   ```
2. Tambah `<script src="nama.js">` di `index.html` (sesuai urutan dependensi; `tools/build_site.py` ikut menyalinnya otomatis).
3. Tambah nama global di `MODULES` (`eslint.config.js`) dan satu baris di tabel `MODULES.md`.
4. Tes di `test/nama.test.js`.

## 6. Sebelum PR

```
npm run check          # lint (termasuk peta basi?) + tes (termasuk golden replay) + build + build rilis
python3 tools/peta.py  # kalau lint bilang peta basi
```
Untuk perubahan UI besar, uji juga di browser: `npm run build && node sim/uisweep.js sim/fixtures/state_akun-biz0.json` (buka semua lembar/app
dari save contoh dan melaporkan error halaman; perlu Playwright).

## 7. Utang teknis yang diketahui (urut prioritas)

1. **State UI global** (`let` top-level di `ui/`, lihat `docs/PETA-UI.md`): sebaiknya dikumpulkan per fitur (`Kamar = {...}`, `Town = {...}`) supaya
   jelas siapa pemiliknya. Lakukan per fitur, dengan uisweep sebagai pengaman.
2. **Biaya replay tumbuh dengan umur save** (±0,4 detik untuk 1.400 hari di laptop, beberapa kali lipat di HP). Opsi: snapshot berkala
   yang divalidasi dengan replay di latar belakang.
3. **Modul tanpa tes unit**: `venture.js`, `work.js`, `pets.js`, `net.js`, `cosmetics.js` (sebagian dicakup simulator di `sim/`, tapi itu tidak
   jalan di CI).
4. **Catatan versi di komentar** (`v46.1: ...`, ratusan): komentar baru sebaiknya menjelaskan *kenapa* kode sekarang begini; sejarahnya cukup
   di pesan commit/PR.
5. three.js r128 (2021) dimuat penuh di awal bersama `town-assets.js` (±500 KB) walaupun kota belum dibuka.

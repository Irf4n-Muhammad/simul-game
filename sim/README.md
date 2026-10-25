# Simulator dan harness

Semua skrip di sini membaca modul game dari folder induk (`require("../engine.js")`, dst.) dan **tidak mengubah kode game**.
Jalankan dari akar repo, misalnya `node sim/sim_biz.js`; knob lewat variabel lingkungan (`N=4 DAYS=900 node sim/sim_biz.js`).
Setiap simulator yang memakai `Game` juga memeriksa **replay**: keadaan yang dihitung ulang dari aksi tersimpan harus identik
dengan keadaan yang dijalani ("replay same: true").

Hasil terakhir ada di `sim/last/` (satu `.out` per skrip) dan ringkasannya di `sim/last/_summary.txt` (kode keluar, detik, jumlah baris).
Angka di bawah dari jalan ulang pada **v44, perapian L9, 25 Oktober 2026**, dengan knob bawaan.

## Simulator Node (`sim_*.js`, `chaos.js`)

| Skrip | Mengukur | Knob | Angka terakhir |
|---|---|---|---|
| `sim_apps.js` | Bisnis keluarga dengan aplikasi kerja per jenis: buka/tutup/dijual/diwariskan, level, per template; replay | N=8 DAYS=1600 POLICY=fund L DIFF PLAY | 8/8 replay sama; open 18, sold 6, heir 3; level 0/1/2 = 12/3/3 |
| `sim_bake.js` | Satu jenis saja (bakery): aksi pemilik, omzet dan laba per hari, rep; replay | N DAYS L PLAY | 4/4 replay sama; contoh Little Bakery total 7.580 rep 59, Fifi's Bakery lv1 total 14.091 rep 56 |
| `sim_biz.js` | Bisnis keluarga semua jenis (tanpa app kerja): ringkasan sama seperti sim_apps | N=8 DAYS=1600 POLICY=fund | 8/8 replay sama; open 18, sold 6, heir 3; level 12/3/3 |
| `sim_care.js` | Rawat pagi/malam: mode full / morning / none → kondisi harian dan kalimat hasil; replay | — | none → kondisi −6 "Short on sleep, went to bed hungry, skipped breakfast"; replay sama |
| `sim_focus.js` | Fokus satu bakat lewat agenda dan pohon: skill dan poin yang didapat per 100 hari | — | umur 1400: skill 94, poin 64 (umur 24, latihan 7, momen 10, mastery 21) |
| `sim_jobs.js` | Kerja kantoran: hari kerja, nilai bulanan A/B/C/D, dipecat, burnout, insiden/hari, kepuasan, stres | JOB=office N=4 DAYS=1300 REPLAY | 828 hari kerja; A11 B4 C11 D6; dipecat 2, burnout 0; inc/hari 0,106; sat 71,6; stres 49,4 |
| `sim_jobs_b.js` | Varian sim_jobs dengan knob BOOST (bawaan: identik) | + BOOST | sama dengan sim_jobs |
| `sim_kd.js` | Kindred: beberapa keluarga di satu "server" tiruan; cinta jalan sendiri, pemain kadang menyarankan; replay | DAYS NAMES POLICY | Nana–Mochi menikah; replay sama; anggota Nana, Nini, Fifi |
| `sim_kendali.js` | Audit kontingensi: seed sama, perilaku wali beda (base, absen, belajar, rencana, tanpa_dadu, tanpa_rawat) → kuis, bond, IQ, mood, kesehatan | DAYS SEEDS | belajar: kuis great 34/40; tanpa_rawat: mood 6,1 kesehatan 2,1 (base 99,9/100); bond hari 900: 96,8–100 |
| `sim_mkt.js` | Pasar bisnis: tiap akun, bisnis mana yang bertahan/dijual dan alasannya, krisis, edge | N=8 DAYS=1600 EV REPLAY | akun-biz7: Acorn Wholesale total 11.831, dijual (niche), krisis 0, edge 10 |
| `sim_net.js` | Kindred dua akun: kenal → pacaran → nikah → anak gen3 dengan talenta gabungan; replay | — | Cici gen3 talent logic 7 fitness 10 charm 4 creativity 3; replay sama |
| `sim_nurse.js` | Profil kerja perawat (shift, kartu keputusan): nilai, dipecat, burnout, promosi, hari kerja; replay | N=4 DAYS=1400 PLAY=1 I L | 4/4 replay sama; A12 B12 C26 D11; dipecat 2, burnout 0, promo 18; 2.017 hari perawat |
| `sim_pets.js` | Hewan peliharaan: kenyang/senang/sehat, adopsi atas saran, mati, umur, ikatan, trik, pita | N=6 DAYS=1500 OFF ADOPT ADV REPLAY | kenyang 93 % senang 94 sehat 95; 20 hewan, mati tua 11 sakit 2; umur rata 503 hari; ikatan 79; trik 20; pita 48 |
| `sim_pts.js` | Poin pohon bakat per makhluk: umur, puncak, skill, talenta, capaian | — | Kiko umur 1141 puncak 47 skill 58/35/75/32 capaian 6 |
| `sim_refuse.js` | Penolakan saran per akun: patuh, ditolak/total, coba lagi, replay | — | Mumu patuh 58: 40/177 ditolak; Rara 58: 39/177; Bubu 61: 47/177; replay sama |
| `sim_rhythm.js` | Ritme kejadian per fase per minggu (dilema, sedang, kecil, capaian, hasil) dan jenis kejadian terbanyak | — | tua: dilema 1,39/minggu, sedang 0,78, kecil 1,54; terbanyak keinginan_baru 695, kencan 411 |
| `sim_svc.js` | Bisnis jasa: lama hidup, total, rep, alasan tutup/jual | N=8 DAYS=1600 EV OFF REPLAY | akun-biz7: wholesale 730 hari, total 11.831, rep 64 |
| `sim_unlock.js` | Ide bisnis yang terbuka ("new idea") dan yang jadi dibuka per jenis; replay | N=8 DAYS=1600 | dibuka cafe 5, tutoring 3, cleaning 2, salon 2, courier/farm/bakery/quant 1; replay 8/8 |
| `sim_wait.js` | Tumpukan penantian per hari per fase (hari ini / sebentar lagi / suatu hari / ketidakpastian / hal baru); analisis saja | DAYS SEEDS DUMP | hal baru: majalah_baru 2.389, drop:print 1.097; ketidakpastian: kerja_hari_ini 3.504, lahir 240 |
| `chaos.js` | Akun acak dengan aksi acak selama DAYS hari: ukuran snapshot, replay identik, aksi yang gagal ("BAD"), ok/coba per jenis aksi | N DAYS CODE DUMP FIND ONLY OFF | N=2 DAYS=900: replay true ×2, BAD 0, snapshot 32/26 KB, replay 207/135 ms |

## Harness browser (Playwright)

Keduanya membuka build situs (`_site/`, atau folder lain lewat `SITE=`), bukan sumber langsung, karena `ui.js` baru ada setelah build.
Playwright dipakai dari pemasangan global (`npm root -g`), jadi tidak ada di `package.json`.

| Skrip | Mengukur | Cara | Angka terakhir |
|---|---|---|---|
| `uisweep.js` | Buka save contoh, jawab semua dilema, buka setiap lembar dan app (chat, chirp, burrow, bazaar, stars, calendar, photos, wallet, homes, mag, ventures, kindred, ward/biz, paws), kumpulkan error halaman | `SITE=$PWD/_site node sim/uisweep.js sim/fixtures/*.json` | `_site`: 3 save, 5 makhluk, 0 error halaman (`uisweep-site.out`). `_release`: tidak bisa disapu lewat nama fungsi karena terser menyatukan fungsi sekali pakai (`showPhone` tidak ada lagi); yang dicek: halaman memuat tanpa error, dilema terjawab, lembar Family tanpa tombol Dev (lihat `uisweep-release.out`) |
| `ui_replaycheck.js` | Rawat pagi lalu muat ulang halaman: catatan rawat dan kebutuhan harus sama setelah replay | `SITE=$PWD/_site node sim/ui_replaycheck.js` | SAME after reload, 0 error (`ui_replaycheck-site.out`) |
| `_probe.js` | Pembantu: menulis `preview.html` + `ui.probe.js` (ui.js dengan kait `__e` untuk eval di dalam IIFE UI) di folder situs | dipanggil kedua harness | — |

`fixtures/` berisi tiga save contoh (`state_akun-biz0/1/4.json`) untuk harness UI.

## Menjalankan semua

```
for f in sim/sim_*.js; do n=$(basename $f .js); timeout 150 node $f > sim/last/$n.out 2>&1; echo "$n exit=$?"; done
N=2 DAYS=900 node sim/chaos.js > sim/last/chaos.out 2>&1
```

# Peta modul Makhluk Kecil

Dibuat saat perapian kode L9 (v44, Oktober 2026) dari tabel L3 peta pengembang (`peta/index.html`). Angka baris adalah
perkiraan saat v44; yang penting kolom tugas, API, data, dan hook. Semua modul adalah skrip klasik yang saling kenal lewat
nama global (`Engine`, `Status`, ...). Modul bertanda ✓ di kolom Node bisa di-`require` dari Node (simulator dan tes) lewat pola
`const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;`.

## Urutan muat (index.html)

three.js r128 (`lib/`) → brands → telemetry → moments → town-assets → town → engine → storylets → agenda → status → tree →
cosmetics → career → market → venture → work → pets → mag → wants → tonggak → anak → game → net → today → soon → weather → balik → **ui.js** (hasil gabungan `ui/*.js`).
Urutan ini juga urutan `<script src>` di `index.html`; `tools/build_site.py` menyalin tepat daftar itu ke `_site/`.

## Modul

| File | Baris | Tugas | API | Data yang dipegang | Hook | Node |
|---|---:|---|---|---|---|:---:|
| `brands.js` | 58 | Registry nama merek: perusahaan (Burrow), pesaing bisnis, media Chirp, tempat kota, barang Bazaar. Nama fiksi sekarang; nanti slot bisa disewa dan namanya ganti di semua layar tanpa nyentuh simulasi. | `Brands { reg, name, base, partner, meta, list, set, apply, clear, bind, stats, pilotOn, pilot, PILOT, KINDS }` | localStorage mk-brands (override Dev) | — | ✓ |
| `telemetry.js` | 101 | Catatan kejadian per sesi, lokal (maks 3.000). Tidak mencatat isi chat, nama makhluk, atau apa pun yang nunjuk orang. payload() siap buat server. | `Tele { ev, layar, intro, dilema, teknis, notif, cari, end, brand, payload… }` | localStorage mk-tele, mk-tele-off | — | ✓ |
| `moments.js` | 105 | Deteksi momen greget dari log hari (puncak, sedih, nyaris, tegang, lega) buat simulator dan telemetry; sumbernya cuma log, jadi sama di HP dan server. | `Moments { TAG, LINES, detect, scan, KINDS }` | — | — | ✓ |
| `town-assets.js` | 2 | Data aset kota (model). | `—` | — | — | — |
| `town.js` | 611 | Kota 3D: lima lingkungan dari Old Town sampai Royal Heights, rumah tiap keluarga sesuai yang dibeli, tetangga NPC ikut kekayaan, bangunan baru pakai waktu nyata (perancah). | `Town { create, HOODS, CIVIC }` | player.build (left) | — | — |
| `engine.js` | 600 | Mesin inti: Creature, Household, World, seed_rng, fase (PHASES), kebutuhan, aturan rumah, bekas luka, event dunia, sutradara (director_pick), registry storylet, konteks x (say/ask/need/trait/bond/remember), GuardianBot, simulate_day. | `Engine { storylet, simulate_day, Household, Creature, seed_rng, phase_of, PHASES, YEAR, OLD_AGE, START_DATE, HOOKS, FORCED, AMBIENT, SCARS, make_ctx, make_log, GuardianBot, world_active… }` | c.stats/needs/traits/bond/info/flags/cooldowns/fired/memory/relations/director; world.npcs/events | mendefinisikan HOOKS: agenda, status, keinginan, care_on, care_night, cover, rumah_kosong, akhir_hidup | ✓ |
| `storylets.js` | 1746 | 126 storylet + FORCED + AMBIENT: bayi (kata pertama, demam), sekolah dan ujian, bakat, remaja (pacaran, pesta, bolos), lulus/kampus, kerja, nikah, anak, besan, pindah, krisis paruh baya, tua (pensiun, memoar, kebun), telur warisan. v46: `ujian_diumumkan` dan `lomba` cuma remaja (di fase anak ikut kalender anak.js), `bakat_ketahuan` harinya dari benih (85–110), skor ujian disimpan di c.info.nilai. | `lewat E.storylet(id, fase, drama, {cooldown, once, priority, cond, weight}, run)` | c.info.* (ujian, lahir_hari, menikah, maraton, kelas, bekas, lulus, pensiun…) | FORCED, HOOKS.rumah_kosong (telur) | ✓ |
| `agenda.js` | 124 | Kegiatan harian per fase (main, belajar, teman, bebas, kerja keras, sosial, pasangan, hobi, cucu…). Rencana wali atau pilihan sendiri; nurut/bosan/kabur. | `Agenda { AGENDA, options }` | c.info.rencana, agenda_hari, agenda_streak | HOOKS.agenda | ✓ |
| `status.js` | 750 | Skill, genetik, hoki keluarga, dadu harian (bank 2), momen terjadwal (wawancara, review, kompetisi) dan hasilnya, karier dasar, ekonomi, barang gengsi, saingan NPC, ranking (boards), pencapaian. | `Status { fam, schedule, pendingFor, canWork, salary, title, estimateFor, boards, luck, achieve, memberView, JOBS, SKILLS… }` | c.st (wallet, job, skills, ach, tree, pet, ward, biz…), world.st (dice, moments, results, house, fortune) | HOOKS.status, act, akhir_hidup | ✓ |
| `tree.js` | 538 | Pohon bakat: 4 akar, 12 cabang, 36 ranting, 72 panggilan, 38 kombinasi, 20 rahasia. Poin dari umur, latihan, momen; buka simpul = tindakan pohon:<id>. Efek: belajar lebih cepat, skor momen, peluang kejadian, aksesori. | `Tree { NODES, ORDER, ROOTS, COMBOS, SECRETS, COST, canUnlock, cost, view, points, fxLines, callings, setDev… }` | c.st.tree | dibaca status buat skor | ✓ |
| `cosmetics.js` | 172 | Slot kosmetik per permukaan, inventaris, edisi/era, tradable, toko rotasi mingguan, mata uang Buttons. Tidak pernah dibaca engine/game. | `Cosmetics` | state.kosmetik | — | ✓ |
| `career.js` | 319 | Perusahaan per kota tetap (lintas generasi), jabatan dan gaji per perusahaan, lowongan datang-pergi, PHK dan tutup, Burrow (profil + feed). Murni dari hari + seed. | `Career { COS, CO, IND, coName, alive, companiesAt, openings, fit, feed, profile, canWork, npcCareer, layoffDay }` | c.st.job (lewat status) | HOOKS.status, act (apply:) | ✓ |
| `market.js` | 308 | Bazaar: barang dengan kondisi yang turun, servis, kotak, dealer bekas, drop terbatas tiap 12 hari dengan stok kota, vintage/antik. Murni dari hari + seed. | `Market { LINES, LINE, CATS, drops, dropLeft, findDrop, canBuyNew, usedListings, valuation, owned, catalog, outlook… }` | c.st barang | HOOKS.status, act, akhir_hidup | ✓ |
| `venture.js` | 1357 | Bisnis keluarga: template jenis (bakery, salon, tutoring, cleaning, courier…), ekonomi kota (siklus, resesi, bursa NPC), karyawan, pasar, krisis, level, mitra. Makhluk yang buka dan jalanin; pemain modal + saran. | `Venture { CATS, TPLS, econ, recession, trend, rivals, market, fit, family, ideas, ownerBiz, active, view, clients… }` | c.st.biz, world.st (ekonomi) | HOOKS.status, act (biz:), akhir_hidup | ✓ |
| `work.js` | 588 | Shift harian 10 profil kerja: tugas, kesalahan, kepuasan, stres, rekan bernama (bos, mentor, saingan, teman), kartu keputusan, target mingguan, nilai bulanan → review. | `Work { CERTS, PROFILES, JOBS, view, careQ, working, demo, demoNext, demoAct }` | c.st.ward | HOOKS.status, act (kerja:) | ✓ |
| `pets.js` | 354 | Hewan peliharaan: lapar/senang/sehat/bersih/ikatan, trik, sakit, vet, pameran Sabtu, hilang. Pemilik ngerawat sesuai sifat; umur per jenis. | `Pets { KINDS, PERS, TRICKS, STRAY, SHELTER_FEE, adopt, shelter, view, demo, demoNext, demoAct, lifeOf }` | c.st.pet | HOOKS.status, act (pet:) | ✓ |
| `mag.js` | 232 | Majalah OLD TOWN: terbit tanggal 1 waktu nyata, sama buat semua pemain, dihitung dari hari + seed + keluarga (tidak disimpan). Cover ke keluarga kalau ada kejadian besar. | `Mag { issueDay, latest, issue, monthName, yearly }` | — | — | ✓ |
| `wants.js` | 307 | Pintu minggu pertama (DOORS: dadu, rencana, kota, Chirp, bintang, majalah, v46 School hari 60, Burrow, Bazaar) dan 35 keinginan (muncul, kemajuan, tercapai, kedaluwarsa). | `Wants { DOORS, STORY, CATALOG, doors, doorOf, doorLabel, active, doneCount, recent, labelFor, afterAct, daily, tick }` | K.aktif / K.selesai di c.st | HOOKS.keinginan, status | ✓ |
| `tonggak.js` | 278 | v45 tonggak tumbuh bayi: 19 tonggak berjendela (hari dari benih makhluk, satu per hari, tiga tanggal klinik tetap); v45.1: enam pengamatan watak (c.info.watak, sifatnya cuma dibaca), sakit ringan (ruam, rewel gigi, pilek), orang (tetangga, bayi lain, cemas ditinggal), timbang di hari klinik (c.info.timbang). | `Tonggak { LIST, EXTRA, KESAYANGAN, dayOf, view, watak, timbang, upcoming, next }` | c.info.tonggak / watak / timbang / kesayangan / kata_pertama | FORCED | ✓ |
| `anak.js` | 254 | v46 fase anak (60–180): kalender sekolah tetap (hari pertama 60, ulangan 95/150 diumumkan 3 hari sebelumnya, rapor 120/178, libur 121, pentas 165; tanggalnya sama buat semua yang seumur, isinya dari makhluk), 8 tonggak anak berjendela (gigi copot, baca sendiri, sepeda, berenang, nginep, uang jajan, jalan sendiri, garis pintu), sahabat (kenal 65–90 dari kenalan_bayi, ribut lalu baikan, pindah 140–172, sahabat baru), Sabtu bareng. Belum ada dilema (v46.1). | `Anak { KALENDER, LIST, ORANG, GRADE, dayOf, tinggi, view, calendar, upcoming, next, sahabatOf }` | c.info.ujian / nilai / rapor / pentas / sahabat / sahabat_lama / ribut / garis / buku_pertama / uang_jajan / tonggak | FORCED, 2 storylet | ✓ |
| `game.js` | 687 | Lapisan pemain: state = pengaturan + catatan aksi; HumanGuardian (hadir, jawaban), advance/act/answer, rawat pagi/malam (CARE, noon), _refuse buat saran ke dewasa, event dunia dan kabar Kindred ke state.net, netRecord. | `Game` | state.aksi/hadir/jawaban/rawat_from/net; c.info.nolak/siang | HOOKS.act, care_on, care_night, cover | ✓ |
| `net.js` | 366 | Kindred: kenalan → jadian → tunangan → nikah antar keluarga pemain; tiap pemain nulis dokumen net/<uid> di db artifact; semua tawaran; disepakati → game.netRecord. | `Net { init, sync, view, setOpen, introduce, answer, bless, hold, breakUp, GAP, state }` | state.net, db artifact | — | — |
| `today.js` | 45 | Baris "Today" di layar utama: satu kalimat per hari dari urutan prioritas tetap (dilema, pintu baru, momen hari ini, rawat, momen terjadwal, keinginan, selesai, sepi). Dipindah dari skrip UI saat perapian L9; teks dan urutan sama dengan v44. | `Today { line }` | — (hanya membaca potret yang diberikan UI) | — | ✓ |
| `soon.js` | 121 | Baris "Soon" dan "Someday" (v44.1, daftar-saran 2–4): mengumpulkan tanggal yang sudah ada (ujian, review, kompetisi, kelahiran, kelas, maraton, ganti fase, ulang tahun, momen terjadwal, event dunia, drop Bazaar, majalah, bangunan, Kindred), yang terdekat ≤60 hari jadi satu kalimat dengan rutinitasnya; pasti vs mungkin; satu harapan tanpa tanggal. v46: tanggal sekolah (kunci `sekolah`, ketuk buka app School); yang pasti dan ≤3 hari selalu di depan. | `Soon { items, line, someday, HORIZON }` | — (potret dari UI) | — | ✓ |
| `weather.js` | 61 | Cuaca asli jadi kulit langit (v44.1, daftar-saran 33): kode WMO → 6 kulit, zona waktu → kota, URL Open-Meteo, umur cache. Kulit saja; tidak ada yang di engine/game/replay membacanya. | `Weather { SKINS, skin, place, cityOf, url, parse, fresh, label, round1 }` | — (cache di localStorage `mk-cuaca`, bukan save) | — | ✓ |
| `balik.js` | 74 | Rawat terbalik (v44.1, daftar-saran 32): seminggu sekali makhluk bertanya tentang pemain (8 pertanyaan bergilir), reaksi ikut sifat yang menonjol. Teks ditulis manusia. | `Balik { Q, due, react, EVERY, TRAITS }` | — (jawaban di state.balik, bukan aksi) | — | ✓ |

`town-assets.js` adalah data (model kota) dan tidak di-lint. `net.js` dan `town.js` butuh browser (db artifact, three.js).

## Skrip UI: ui/*.js → ui.js

Skrip UI v44 adalah satu `<script>` sepanjang 5.914 baris di dalam satu IIFE `(() => { ... })();`, jadi semua fungsinya
berbagi satu lingkup. Supaya bisa dipecah tanpa mengubah lingkup, fragmen `ui/*.js` **tidak** dimuat sendiri-sendiri: `tools/build_ui.py`
menggabungkannya (urut nama file) dan membungkusnya lagi dengan IIFE yang sama menjadi `ui.js`. Hasil gabungan identik byte
dengan skrip inline v44. `ui.js` adalah file hasil (di-gitignore); yang diedit adalah fragmennya.

| Fragmen | Baris v44 | Isi |
|---|---:|---|
| `ui/00-helpers.js` | 1077–1083 | pembantu dasar: $(id), app, canvas, deteksi reduce-motion |
| `ui/01-save-clock.js` | 1084–1107 | **save + jam** (1084): SAVE_KEY, jam nyata ↔ hari, flag DEV (?dev=1 / 7 ketuk), tombol uji |
| `ui/02-hud-needs.js` | 1108–1136 | **HUD: needs** (1108): bar kebutuhan, strip rawat |
| `ui/03-scene.js` | 1137–1469 | **three.js scene** (1137): ruangan, kamera, cahaya, renderer swiftshader-friendly |
| `ui/04-creature.js` | 1470–1633 | **makhluk dari gen** (1470): bentuk tubuh dari rupa (warna, telinga, pola); kosmetik di body space |
| `ui/05-floating-ui.js` | 1634–1740 | **UI mengapung** (1634): gelembung, pet di ruangan |
| `ui/06-animation.js` | 1741–1761 | **animasi** (1741): state animasi (makan, mandi, tidur, geleng) |
| `ui/07-rooms-actions.js` | 1762–1933 | **ruangan + aksi** (1762): rawat pagi/malam (CARE), tur pertama |
| `ui/08-input.js` | 1934–1975 | **input** (1934): ketuk, drag, gestur |
| `ui/09-sheets.js` | 1976–2112 | **lembar (sheets)** (1976): setup, dilema (2018), rencana + belajar (2049), diary (2069), rekap (2098) |
| `ui/10-chat-claude.js` | 2113–2197 | **chat dengan Claude** (2113): obrolan opsional (sample capability) |
| `ui/11-status-sheets.js` | 2198–2427 | **status** (2198): dadu, momen besar, karier, toko, ranking, pohon keluarga |
| `ui/12-closet-family.js` | 2428–2523 | closet (kosmetik) + lembar Family (backup, Dev); **closet** (2428): kosmetik, rupa saja |
| `ui/13-away-backup-dev.js` | 2524–2730 | **pergi/penitipan** (2524): keluarga ngurus tanpa penalti; **backup** (2545): ekspor/impor save; **Dev tools** (2558): bintang terbuka, kecepatan waktu, registry brand, log telemetry. Build rilis: buang; **kronik keluarga** (2698): semua generasi satu garis waktu |
| `ui/14-doors-today-wants.js` | 2731–2888 | **v43: pintu, Today, tur, keinginan** (2731): todayLine (2741), tur pintu (2772), intro HP (2821), gelembung keinginan (2851) |
| `ui/15-game-loop.js` | 2889–2950 | **game loop** (2889): tick: advance, noon, pending, hasil momen, autosave |
| `ui/16-stars.js` | 2951–3267 | **rasi bakat** (2951): langit malam pohon bakat |
| `ui/17-burrow.js` | 3268–3443 | **Burrow** (3268): profil kerja, lowongan, feed |
| `ui/18-phone.js` | 3444–3674 | **HP** (3444): layar kunci + notifikasi, home, app |
| `ui/19-kindred.js` | 3675–3748 | **Kindred** (3675): kenalan, pacaran, nikah antar pemain (net.js) |
| `ui/20-ventures.js` | 3749–3838 | **Ventures** (3749): bisnis keluarga; ops per jenis (3910), pasar (3977), orang (4004), uang (4023), tumbuh (4041), mitra (4053) |
| `ui/21-work-apps.js` | 3839–4219 | **Work apps** (3839): app per bisnis/pekerjaan; bakery Today (4099), jasa (4154), Paws (4220), Ward (4328) |
| `ui/22-paws.js` | 4220–4327 | Paws: app hewan peliharaan (adopsi, rawat, vet, pameran) |
| `ui/23-ward.js` | 4328–4615 | Ward: app shift kerja perawat/kerja harian (tugas, kartu, nilai) |
| `ui/24-nest.js` | 4616–4980 | **Nest** (4669): chat keluarga/teman, grup hari besar (4669), look 'paper' (4792) |
| `ui/25-chirp.js` | 4981–5408 | **Chirp** (4994): akun fam/npc/pal/org, kabar kota dari kejadian (5020), layar (5197) |
| `ui/26-magazine.js` | 5409–6286 | **Majalah OLD TOWN** (5409): edisi tanggal 1, cover ilustrasi (5547), editorial (5733), hero 3D (5830); **foto produk** (6044): model 3D barang, studio kecil, cache gambar |
| `ui/27-bazaar.js` | 6287–6467 | **Bazaar** (6287): toko kota: barang baru, drop terbatas, bekas |
| `ui/28-photos.js` | 6468–6755 | **foto kenangan** (6468): foto = kejadian nyata (siapa, di mana, kenapa); studio (6565) |
| `ui/29-town.js` | 6756–6987 | **kota** (6756): masuk/keluar kota, HUD disembunyiin (#app.in-town) |
| `ui/31-ahead.js` | baru (v44.1) | **Soon/Someday** di HUD: potret untuk soon.js, baris #soon/#someday, lembar "What's ahead", tur `ahead`; `EXTRA_TOURS` (tur non-pintu) + `aheadTourMaybe` |
| `ui/32-focus.js` | baru (v44.1) | **sesi fokus** 25 menit (belajar/kerja bareng): timer di localStorage, HP terkunci, selesai = satu ketukan `belajar` (mekanik lama); tur `fokus` |
| `ui/33-weather.js` | baru (v44.1) | **cuaca asli** jadi kulit: ambil Open-Meteo per 10 menit (cache 1 jam), `wxApply` → `applyLight`, lembar "Sky & weather" (zona waktu / lokasi / mati); tur `cuaca` |
| `ui/35-tonggak.js` | baru (v45) | **tonggak tumbuh**: tangga "Growing up" di profil (tanggal klinik + angka timbang), v45.1 kartu "Getting to know" (`watakBox`, tur `watak` lewat `EXTRA_TOURS`), rak "Later" di tablet/HP; v46 tangga ikut fase (anak: 8 tonggak anak + satu baris ringkasan bayi) |
| `ui/36-anak.js` | baru (v46) | **app School** di tablet/HP (`phSchool`: kalender tahun ini, ulangan, rapor, sahabat, bakat; cuma baca), `scNext` buat lencana app dan notifikasi lock screen; kartu intro dan tur `school` ada di 14/18 |
| `ui/34-balik.js` | baru (v44.1) | **rawat terbalik**: potret untuk balik.js, lembar tiga pilihan, jawaban ke `state.balik`; tur `balik` |
| `ui/39-start.js` | 6988–6990 | pemanggilan boot() (dulu `30-start.js`; dinomori 39 supaya tetap terakhir) |

## Penanda blok Dev (build rilis)

Kode Dev (Test mode, Dev tools, bintang tak terbatas, kecepatan waktu) hidup di fragmen UI di belakang `const DEV`.
Build rilis (`npm run build:release` → `_release/`) membuangnya dengan dua cara:

- **Penanda komentar** di fragmen: `// DEV-BEGIN` ... `// DEV-END` membuang blok, `// DEV-NEXT` membuang satu baris berikutnya.
  Blok yang ditandai: definisi `DEV_DUNIA` + `showDev` (13), `DEV_PTS`/`devStars`/hook `_dev` (15), `bindVerTap` + pemanggilnya (09, 12),
  `Tree.setDev` di boot (15). Pada build normal penanda hanyalah komentar, hasilnya tetap sama dengan v44.
- **terser** `--define DEV=false` dengan dead-code elimination untuk sisa percabangan `DEV && ...` / `DEV ? a : b`.

Setelah itu `build_ui.py --release` memeriksa jejak (`DEV`, `showDev`, `Dev tools`, `Test mode (Dev)`, `mk-dev`, `devStars`, `DEV_DUNIA`,
`bindVerTap`, `DEV_PTS`, `devBtn`, `SPEEDS`, `dev_stars`) dan **menolak** (exit 1) kalau masih ada. Yang sengaja dibiarkan karena bukan
pintu masuk Dev: pembacaan `state.dev_pintu` di `doorsNow` (nilainya hanya bisa diisi lewat Dev tools yang sudah tidak ada), id
elemen `verTap`/`verTapS` (label versi biasa), dan teks toast "Test mode" di handler Kindred/Ward yang tidak terjangkau tanpa tombol Dev.

## Catatan penamaan (usulan 6, tanpa rename)

- Bahasa: komentar dan dokumen **Indonesia**, teks yang dilihat pemain **Inggris**, nama kode campur (`kecerdasan`, `patuh`, `impulsif`,
  `rawat`, `pintu` di samping `wallet`, `skills`, `tree`, `ward`). Campuran ini tidak di-rename pada perapian ini: nama field adalah
  bentuk simpanan di `localStorage` (`makhluk-kecil-3d-v2`) dan kunci aksi di log replay, jadi mengganti nama berarti migrasi
  save lama dan semua aksi tersimpan. Risikonya tidak sebanding dengan rapinya.
- Kalau nanti ingin menyatukan: cara aman adalah alias saat load (baca dua nama, tulis dua nama selama satu versi), lalu buang nama
  lama di versi berikutnya setelah semua save tester tersentuh. Itu pekerjaan tersendiri dengan simulator replay sebagai jaring pengaman.
- Nama global modul adalah daftar di `eslint.config.js` (`MODULES`); menambah modul baru = menambah satu nama di sana dan satu
  `<script src>` di `index.html`.

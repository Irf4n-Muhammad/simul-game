# Peta UI (dibuat otomatis)

> File ini ditulis `python3 tools/peta.py`. **Jangan diedit tangan**: ubah fragmennya, lalu jalankan skripnya.
> `npm run lint` (dan CI) gagal kalau peta ini belum diperbarui.

Semua `ui/*.js` digabung jadi satu fungsi (`ui.js`, lihat `tools/build_ui.py`), jadi nama top-level satu fragmen
bisa dipakai fragmen lain tanpa import. Tabel di bawah menjawab: fragmen ini isinya apa, dan kalau diubah, siapa yang kena.
Penjelasan arsitektur dan resep nambah fitur ada di `ARCHITECTURE.md`.

Ringkasan: 62 fragmen, 14,404 baris, 1,524 nama top-level, 552 dipakai lintas fragmen, 149 variabel `let`/`var` bersama.

## Fragmen

| Fragmen | Baris | Isi (komentar pertama) | Nama top-level | Memakai | Dipakai oleh |
|---|---:|---|---:|---|---|
| `00-helpers.js` | 16 | pembantu dasar: $(id), esc/md (amankan teks sebelum masuk innerHTML), setHtml/setText (tulis DOM cuma kalau berubah) | 11 | — | 52 fragmen |
| `01-save-clock.js` | 44 | save + clock | 25 | 00-helpers, 07-rooms-actions | 52 fragmen |
| `02-hud-needs.js` | 62 | HUD: needs | 7 | 14 fragmen | 07-rooms-actions, 08-input, 14-doors-today-wants, 15-game-loop, 28-photos |
| `03-scene.js` | 239 | three.js scene | 65 | 00-helpers, 07-rooms-actions, 15-game-loop, 16-stars, 26-magazine, 29a-render-loop, 33-weather, 38k-kamar-hangat | 36 fragmen |
| `03b-perabot.js` | 480 | Tata Rumah: model perabot (perabot.js) + palet cat | 15 | 03-scene, 03c-denah, 29-town, 40-book | 03c-denah |
| `03c-denah.js` | 310 | Tata Rumah tahap 2: rumah dibangun dari denah (denah.js) | 37 | 01-save-clock, 03-scene, 03b-perabot, 07-rooms-actions, 11-status-sheets, 27-bazaar, 27b-tata-rumah, 29a-render-loop | 12 fragmen |
| `04-creature.js` | 165 | the creature, built from its genes | 21 | 01-save-clock, 03-scene, 11-status-sheets, 14-doors-today-wants | 29 fragmen |
| `05-floating-ui.js` | 108 | floating UI | 13 | 00-helpers, 01-save-clock, 03-scene, 04-creature, 06-animation, 09-sheets | 35 fragmen |
| `06-animation.js` | 22 | animation state | 19 | — | 26 fragmen |
| `07-rooms-actions.js` | 210 | rooms + actions | 25 | 19 fragmen | 43 fragmen |
| `08-input.js` | 49 | input | 9 | 14 fragmen | 19 fragmen |
| `09-sheets.js` | 166 | sheets | 20 | 20 fragmen | 29 fragmen |
| `10-chat-claude.js` | 89 | chat with Claude | 12 | 10 fragmen | 09-sheets, 17-burrow, 22-paws, 24-nest, 25-chirp, 38-obrolan, 38j-kamar, 38k-kamar-hangat |
| `11-status-sheets.js` | 233 | status: dice, big moments, career, shop, rankings, family tree | 31 | 9 fragmen | 40 fragmen |
| `12-closet-family.js` | 108 | closet: cosmetics. Looks only; nothing here is read by the simulation | 4 | 21 fragmen | 09-sheets, 13-away, 13c-chronicle-devclock, 14-doors-today-wants, 31-ahead |
| `13-away.js` | 23 | pergi (titip): keluarga yang jaga, tanpa penalti | 2 | 00-helpers, 01-save-clock, 05-floating-ui, 11-status-sheets, 12-closet-family | 12-closet-family |
| `13b-backup-dev.js` | 175 | backup ke file + lembar Dev (worldRecord, showDev, simpan telemetry) | 16 | 12 fragmen | 9 fragmen |
| `13c-chronicle-devclock.js` | 89 | kronik keluarga (semua generasi satu garis waktu) + jam Dev | 6 | 10 fragmen | 09-sheets, 12-closet-family, 28-photos |
| `14-doors-today-wants.js` | 195 | v43: doors, the Today line, door tours, wants | 25 | 15 fragmen | 15 fragmen |
| `15-game-loop.js` | 75 | game loop | 5 | 14 fragmen | 25 fragmen |
| `16-stars.js` | 349 | talent constellations: the star map inside the book (Buku Bintang, ui/40-book.js). Every talent is a star; | 32 | 15 fragmen | 12 fragmen |
| `17-burrow.js` | 188 | Burrow: the town's work network. Your creature's profile, jobs that come and go, and news from everyone you know. | 29 | 14 fragmen | 14 fragmen |
| `18-phone.js` | 244 | the phone: the creature's own phone (or the family tablet for kids). Lock screen with notifications, a home screen | 27 | 24 fragmen | 27 fragmen |
| `19-kindred.js` | 75 | Kindred: meet, date and marry creatures from other players' families. Every step is an offer the other side can turn down. | 13 | 00-helpers, 01-save-clock, 05-floating-ui, 11-status-sheets, 15-game-loop, 18-phone, 28-photos | 15-game-loop, 18-phone, 20-ventures, 21-work-apps, 22-paws, 23-ward, 31-ahead |
| `20-ventures.js` | 91 | Ventures: family businesses. The creature opens and runs them; you fund, bless, and advise. | 9 | 12 fragmen | 18-phone, 21-work-apps, 22-paws, 23-ward |
| `21-work-apps.js` | 384 | Work apps: every family business has its own app on the phone of whoever runs it or works there. | 42 | 13 fragmen | 17-burrow, 18-phone, 20-ventures, 22-paws, 23-ward |
| `22-paws.js` | 109 | Paws: the pet app (every creature, kids too) | 14 | 13 fragmen | 18-phone |
| `23-ward.js` | 304 | Ward: the nurse's work app | 29 | 19 fragmen | 18-phone, 20-ventures, 25-chirp |
| `24-nest.js` | 366 | Nest: the family's chat app. A family group and a friends group fill up on their own when something big happens, | 53 | 14 fragmen | 12-closet-family, 18-phone, 25-chirp |
| `25-chirp.js` | 417 | Chirp: Old Town's public timeline. The town talks about what really happened (drops selling out, companies | 51 | 17 fragmen | 12-closet-family, 13b-backup-dev, 18-phone |
| `26-magazine.js` | 862 | OLD TOWN, the town magazine. A new issue every 1st of the month (real time), the same one for every player. | 75 | 14 fragmen | 03-scene, 18-phone, 21-work-apps, 23-ward, 24-nest, 25-chirp, 27-bazaar, 38k-kamar-hangat |
| `27-bazaar.js` | 183 | Bazaar: the town's store. Looks and works like a real online shop: new things, limited drops that sell out | 19 | 13 fragmen | 03c-denah, 18-phone, 26-magazine, 27b-tata-rumah, 29a-render-loop, 31-ahead, 38h-kart |
| `27b-tata-rumah.js` | 483 | Tata Rumah: mode bangun (denah.js + ui/03c-denah.js). Ketuk nama ruangan buat masuk. | 43 | 15 fragmen | 03c-denah, 08-input, 09-sheets, 27-bazaar, 29a-render-loop, 38j-kamar |
| `28-photos.js` | 333 | photo memories: a photo is a memory of something that really happened (who, where, why) | 33 | 18 fragmen | 19 fragmen |
| `29-town.js` | 358 | the town | 49 | 16 fragmen | 11 fragmen |
| `29a-render-loop.js` | 173 | loop render utama + resize (dipindah dari 29-town.js) | 11 | 22 fragmen | 20 fragmen |
| `29b-konser.js` | 111 | v78: konser live (orang ketiga) | 22 | 9 fragmen | 24-nest, 25-chirp, 26-magazine, 27-bazaar, 29-town, 29a-render-loop |
| `29c-liar.js` | 81 | v80: wilayah liar | 13 | 9 fragmen | 29-town, 29a-render-loop |
| `31-ahead.js` | 85 | v44.1: Soon and Someday rows, and the "what's ahead" sheet | 10 | 13 fragmen | 02-hud-needs, 31b-agenda, 32-focus, 33-weather, 34-balik, 35-tonggak, 36-anak, 37-remaja |
| `31b-agenda.js` | 211 | v80: Agenda, layar pertama tiap hari | 25 | 15 fragmen | 02-hud-needs, 09-sheets, 15-game-loop, 28-photos, 31c-les |
| `31c-les.js` | 104 | v82: les (ilmu.js) | 10 | 12 fragmen | 02-hud-needs, 16-stars, 31b-agenda, 31d-jadwal |
| `31d-jadwal.js` | 79 | v83: blok waktu bebas (jadwal.js) | 9 | 00-helpers, 01-save-clock, 07-rooms-actions, 09-sheets, 11-status-sheets, 15-game-loop, 31c-les | 31b-agenda, 31c-les |
| `32-focus.js` | 92 | v44.1: focus session (daftar-saran 31): 25 minutes side by side | 17 | 14 fragmen | 14-doors-today-wants, 23-ward, 31b-agenda, 38j-kamar, 38k-kamar-hangat |
| `33-weather.js` | 67 | v44.1: real weather as a skin (daftar-saran 33) | 15 | 00-helpers, 01-save-clock, 03-scene, 05-floating-ui, 07-rooms-actions, 09-sheets, 31-ahead | 03-scene, 12-closet-family, 13b-backup-dev, 29-town, 38j-kamar, 38k-kamar-hangat |
| `34-balik.js` | 34 | v44.1: reverse care (daftar-saran 32): once a week they ask about you | 3 | 10 fragmen | 14-doors-today-wants |
| `35-tonggak.js` | 70 | v45: tonggak tumbuh bayi (tonggak.js) dan v46 tonggak anak (anak.js): tangga di profil, rak "Later" di tablet | 7 | 00-helpers, 01-save-clock, 05-floating-ui, 11-status-sheets, 14-doors-today-wants, 18-phone, 31-ahead | 12-closet-family, 18-phone |
| `36-anak.js` | 48 | v46: fase anak (anak.js): app School di tablet, catatan kunci, kalender | 4 | 00-helpers, 01-save-clock, 04-creature, 11-status-sheets, 18-phone, 31-ahead, 37-remaja | 18-phone, 23-ward, 37-remaja, 38-obrolan |
| `37-remaja.js` | 67 | v47: fase remaja (remaja.js): app School remaja, kartu "gw siapa" di profil, tur aturan rumah | 4 | 00-helpers, 01-save-clock, 04-creature, 11-status-sheets, 18-phone, 31-ahead, 36-anak | 12-closet-family, 36-anak |
| `38-obrolan.js` | 142 | v48: perhatian, kedekatan, pertanyaan harian di Ngobrol | 18 | 12 fragmen | 02-hud-needs, 07-rooms-actions, 08-input, 10-chat-claude, 12-closet-family, 14-doors-today-wants, 38b-kabar, 38j-kamar |
| `38b-kabar.js` | 80 | v48: notifikasi (kabar.js yang mutusin isinya, di sini cuma jadwal + izin) | 10 | 10 fragmen | 02-hud-needs, 07-rooms-actions, 12-closet-family, 39-start |
| `38c-dapur.js` | 946 | v49: koin dapur dan mini game (dapur.js yang ngatur harga dan batas) | 87 | 19 fragmen | 14 fragmen |
| `38d-dunia.js` | 313 | dunia tiap mini game (v59, diskusi 31 Okt: "terlalu polos", pilihan "dunia kartun, efek neon") | 31 | 00-helpers, 03-scene, 07-rooms-actions, 17-burrow, 38c-dapur | 38c-dapur, 38f-game-baru, 38g-kuis, 38h-kart, 38i-brawl |
| `38e-suara.js` | 105 | suara mini game (v63): semua disintesis pakai WebAudio, tanpa file audio. | 2 | 06-animation | 38c-dapur, 38f-game-baru, 38g-kuis, 38h-kart, 38i-brawl |
| `38f-game-baru.js` | 462 | tiga game baru (v67): Frog hop, Memory match, Town run. Pola sama kayak game lain: FC.k, langkah per frame, | 33 | 03-scene, 07-rooms-actions, 29a-render-loop, 38c-dapur, 38d-dunia, 38e-suara | 38c-dapur, 38i-brawl |
| `38g-kuis.js` | 213 | Quiz rush (v71): game pertama yang ada lawannya. Lu lawan 3 CPU (Kiko, Bolt, Mimi dari Kitab Dunia Arcade) | 22 | 03-scene, 07-rooms-actions, 17-burrow, 28-photos, 38c-dapur, 38d-dunia, 38e-suara | 38c-dapur, 38i-brawl |
| `38h-kart.js` | 918 | Kart cup (v83, diskusi 9 Nov: "bikin satu game serius, mirip kart racing"): balapan kart 3D pertama di Games. | 84 | 12 fragmen | 27b-tata-rumah, 38c-dapur |
| `38i-brawl.js` | 1465 | v84: Bonk brawl, mini game adu jotos di pulau melayang | 102 | 13 fragmen | 38c-dapur |
| `38j-kamar.js` | 194 | v88: Kamar panjang (desktop): satu kamar memanjang selebar layar, buat ditemenin | 22 | 18 fragmen | 08-input, 29-town, 29a-render-loop, 29c-liar, 38k-kamar-hangat, 38l-kamar-hd |
| `38k-kamar-hangat.js` | 384 | v89: Kamar hangat (desktop, dalam kamar panjang ui/38j-kamar.js) | 40 | 17 fragmen | 03-scene, 08-input, 38j-kamar, 38l-kamar-hd |
| `38l-kamar-hd.js` | 197 | v90: Kamar HD (desktop, dalam kamar panjang + kamar hangat) | 21 | 10 fragmen | 29a-render-loop, 32-focus, 38j-kamar |
| `39-start.js` | 7 | start: HARUS fragmen terakhir. Semua fragmen lain cuma mendefinisikan; | 0 | 01-save-clock, 03-scene, 03c-denah, 07-rooms-actions, 15-game-loop, 29a-render-loop, 38b-kabar | — |
| `40-book.js` | 152 | Buku Bintang (rasi.js): rapor + skill dalam bentuk buku. Sampai umur 30 hari bukunya buku catatan pensil; | 16 | 00-helpers, 01-save-clock, 03-scene, 09-sheets, 11-status-sheets, 14-doors-today-wants, 16-stars, 18-phone | 03b-perabot, 09-sheets, 16-stars, 24-nest, 29a-render-loop |

## State UI bersama (`let`/`var` top-level)

Variabel ini bisa diubah dari mana saja di `ui.js`. Sebelum mengubah artinya, cek semua fragmen di kolom kanan.

| Nama | Pemilik | Dipakai di |
|---|---|---|
| `chats` | 01-save-clock | 10-chat-claude, 12-closet-family, 24-nest, 38-obrolan |
| `cur` | 01-save-clock | 02-hud-needs, 03c-denah, 05-floating-ui, 07-rooms-actions, 08-input, 09-sheets, 10-chat-claude, 11-status-sheets, 12-closet-family, 14-doors-today-wants, 15-game-loop, 16-stars, 17-burrow, 18-phone, 19-kindred, 20-ventures, 21-work-apps, 22-paws, 23-ward, 27-bazaar, 27b-tata-rumah, 28-photos, 29-town, 29a-render-loop, 29b-konser, 29c-liar, 31-ahead, 31b-agenda, 31c-les, 31d-jadwal, 32-focus, 33-weather, 34-balik, 35-tonggak, 36-anak, 37-remaja, 38-obrolan, 38b-kabar, 38c-dapur, 38h-kart, 38j-kamar, 38k-kamar-hangat, 40-book |
| `feed` | 01-save-clock | 09-sheets, 10-chat-claude, 11-status-sheets, 14-doors-today-wants, 15-game-loop, 22-paws, 24-nest, 28-photos, 29-town |
| `game` | 01-save-clock | 02-hud-needs, 03c-denah, 04-creature, 05-floating-ui, 07-rooms-actions, 08-input, 09-sheets, 10-chat-claude, 11-status-sheets, 12-closet-family, 13-away, 13b-backup-dev, 13c-chronicle-devclock, 14-doors-today-wants, 15-game-loop, 16-stars, 17-burrow, 18-phone, 19-kindred, 20-ventures, 21-work-apps, 22-paws, 23-ward, 24-nest, 25-chirp, 26-magazine, 27-bazaar, 27b-tata-rumah, 28-photos, 29-town, 29a-render-loop, 29b-konser, 31-ahead, 31b-agenda, 31c-les, 31d-jadwal, 32-focus, 34-balik, 35-tonggak, 36-anak, 37-remaja, 38-obrolan, 38b-kabar, 38c-dapur, 38j-kamar, 39-start, 40-book |
| `selected` | 01-save-clock | 07-rooms-actions, 08-input, 09-sheets, 10-chat-claude, 15-game-loop, 18-phone, 31-ahead, 31b-agenda, 38-obrolan, 38b-kabar, 38j-kamar |
| `state` | 01-save-clock | 03c-denah, 04-creature, 07-rooms-actions, 09-sheets, 12-closet-family, 13b-backup-dev, 13c-chronicle-devclock, 14-doors-today-wants, 15-game-loop, 18-phone, 26-magazine, 28-photos, 31-ahead, 31b-agenda, 31c-les, 32-focus, 34-balik, 38-obrolan, 38b-kabar, 38c-dapur, 39-start, 40-book |
| `timer` | 01-save-clock | 12-closet-family, 15-game-loop |
| `LIT` | 03-scene | 29-town, 29a-render-loop, 38j-kamar, 38k-kamar-hangat |
| `litKey` | 03-scene | — (cuma pemiliknya) |
| `litName` | 03-scene | 29-town, 29c-liar, 38j-kamar, 38k-kamar-hangat, 38l-kamar-hd |
| `qBefore` | 03-scene | — (cuma pemiliknya) |
| `qDone` | 03-scene | — (cuma pemiliknya) |
| `qFrom` | 03-scene | — (cuma pemiliknya) |
| `qFull` | 03-scene | 29a-render-loop |
| `qLevel` | 03-scene | 38l-kamar-hd |
| `qN` | 03-scene | — (cuma pemiliknya) |
| `qPrev` | 03-scene | — (cuma pemiliknya) |
| `qSlow` | 03-scene | — (cuma pemiliknya) |
| `qSum` | 03-scene | — (cuma pemiliknya) |
| `DN_DRAFT` | 03c-denah | 27b-tata-rumah, 38j-kamar |
| `HOUSE_GEN` | 03c-denah | 38c-dapur |
| `HOUSE_KEY` | 03c-denah | — (cuma pemiliknya) |
| `HOUSE_MODE` | 03c-denah | — (cuma pemiliknya) |
| `HOUSE_PLAN` | 03c-denah | — (cuma pemiliknya) |
| `ROOM_HALF` | 03c-denah | 29a-render-loop |
| `K` | 04-creature | 05-floating-ui, 07-rooms-actions, 08-input, 15-game-loop, 16-stars, 22-paws, 23-ward, 24-nest, 27b-tata-rumah, 29-town, 29a-render-loop, 31b-agenda, 31c-les, 36-anak, 37-remaja, 38b-kabar, 38c-dapur, 38h-kart, 38i-brawl, 38j-kamar, 38k-kamar-hangat |
| `PT3` | 05-floating-ui | 38j-kamar, 38k-kamar-hangat |
| `alertEl` | 05-floating-ui | 09-sheets, 28-photos, 29a-render-loop |
| `bubble` | 05-floating-ui | 10-chat-claude, 29a-render-loop, 38j-kamar, 38k-kamar-hangat, 38l-kamar-hd |
| `bubbleUntil` | 05-floating-ui | 29a-render-loop |
| `anim` | 06-animation | 29a-render-loop, 38i-brawl, 38k-kamar-hangat |
| `blinkAt` | 06-animation | 29a-render-loop |
| `chewUntil` | 06-animation | 07-rooms-actions, 29a-render-loop |
| `idle` | 06-animation | 29a-render-loop, 38i-brawl |
| `idleAt` | 06-animation | 29a-render-loop |
| `idleLook` | 06-animation | 29a-render-loop, 38j-kamar |
| `joyUntil` | 06-animation | 07-rooms-actions, 08-input, 16-stars, 28-photos, 29a-render-loop |
| `lookX` | 06-animation | 08-input, 29a-render-loop, 38j-kamar, 38l-kamar-hd |
| `lookY` | 06-animation | 08-input, 29a-render-loop, 38l-kamar-hd |
| `mouthOpen` | 06-animation | 07-rooms-actions, 29a-render-loop |
| `napUntil` | 06-animation | 07-rooms-actions, 08-input, 29a-render-loop, 38k-kamar-hangat |
| `rubbing` | 06-animation | 08-input |
| `snapEl` | 06-animation | 29a-render-loop |
| `surpriseUntil` | 06-animation | 08-input, 28-photos, 29a-render-loop |
| `talkUntil` | 06-animation | 05-floating-ui, 10-chat-claude, 29a-render-loop, 38j-kamar, 38k-kamar-hangat |
| `coachEl` | 07-rooms-actions | 31-ahead, 38b-kabar |
| `coachRing` | 07-rooms-actions | — (cuma pemiliknya) |
| `roomIx` | 07-rooms-actions | 02-hud-needs, 03-scene, 03c-denah, 08-input, 15-game-loop, 27b-tata-rumah, 38c-dapur, 38j-kamar |
| `down` | 08-input | 20-ventures, 21-work-apps, 24-nest, 25-chirp, 27b-tata-rumah, 29-town, 32-focus, 38h-kart, 38i-brawl |
| `pokeN` | 08-input | — (cuma pemiliknya) |
| `draft` | 09-sheets | 23-ward |
| `sheetKind` | 09-sheets | 07-rooms-actions, 27b-tata-rumah, 28-photos, 29a-render-loop, 31-ahead, 31b-agenda, 31c-les, 32-focus, 33-weather, 38b-kabar, 38j-kamar, 40-book |
| `storyBusy` | 09-sheets | — (cuma pemiliknya) |
| `storyText` | 09-sheets | — (cuma pemiliknya) |
| `chatBusy` | 10-chat-claude | 38j-kamar, 38k-kamar-hangat |
| `chatCtl` | 10-chat-claude | — (cuma pemiliknya) |
| `sampleFn` | 10-chat-claude | 09-sheets, 24-nest, 25-chirp, 38-obrolan, 38j-kamar |
| `dieHide` | 11-status-sheets | — (cuma pemiliknya) |
| `firmTab` | 11-status-sheets | — (cuma pemiliknya) |
| `lifeTab` | 11-status-sheets | — (cuma pemiliknya) |
| `rankTab` | 11-status-sheets | — (cuma pemiliknya) |
| `closetTab` | 12-closet-family | — (cuma pemiliknya) |
| `DL` | 13b-backup-dev | 13c-chronicle-devclock |
| `bubbleKey` | 14-doors-today-wants | 04-creature |
| `todayCache` | 14-doors-today-wants | 34-balik |
| `todayKey` | 14-doors-today-wants | — (cuma pemiliknya) |
| `tour` | 14-doors-today-wants | 07-rooms-actions, 09-sheets, 18-phone, 29-town, 31-ahead, 38b-kabar, 40-book |
| `sky` | 16-stars | 03-scene, 18-phone, 23-ward, 26-magazine, 28-photos, 29a-render-loop, 38h-kart, 38k-kamar-hangat, 40-book |
| `skyLay` | 16-stars | — (cuma pemiliknya) |
| `bw` | 17-burrow | 18-phone, 26-magazine, 29a-render-loop, 38c-dapur, 38d-dunia, 38g-kuis, 38i-brawl, 38k-kamar-hangat, 38l-kamar-hd |
| `bwClaps` | 17-burrow | — (cuma pemiliknya) |
| `srchN` | 17-burrow | 18-phone, 23-ward, 24-nest, 25-chirp, 26-magazine, 27-bazaar |
| `PH` | 18-phone | 07-rooms-actions, 09-sheets, 15-game-loop, 16-stars, 17-burrow, 19-kindred, 20-ventures, 21-work-apps, 22-paws, 23-ward, 24-nest, 25-chirp, 26-magazine, 27-bazaar, 28-photos, 29a-render-loop, 31-ahead, 31b-agenda, 31c-les, 35-tonggak, 38b-kabar, 40-book |
| `kdLast` | 19-kindred | 18-phone |
| `kdNet` | 19-kindred | 15-game-loop, 31-ahead |
| `PW_DEMO` | 22-paws | — (cuma pemiliknya) |
| `WD_DEMO` | 23-ward | — (cuma pemiliknya) |
| `WA` | 24-nest | 12-closet-family, 25-chirp |
| `waBusy` | 24-nest | — (cuma pemiliknya) |
| `CH` | 25-chirp | 12-closet-family, 18-phone |
| `bz` | 27-bazaar | 03c-denah, 18-phone, 26-magazine, 27b-tata-rumah, 29a-render-loop, 38h-kart |
| `BD_G` | 27b-tata-rumah | — (cuma pemiliknya) |
| `PB_MODE` | 27b-tata-rumah | 03c-denah, 09-sheets, 29a-render-loop, 38j-kamar |
| `albumTab` | 28-photos | — (cuma pemiliknya) |
| `opsCache` | 28-photos | 29a-render-loop |
| `studio` | 28-photos | — (cuma pemiliknya) |
| `CONT` | 29-town | 08-input, 29a-render-loop, 29c-liar |
| `GLOBE` | 29-town | 08-input, 29a-render-loop |
| `KONSER` | 29-town | 08-input, 29a-render-loop, 29b-konser |
| `LIAR` | 29-town | 08-input, 29a-render-loop, 29c-liar |
| `SND` | 29-town | 29b-konser, 38j-kamar, 38k-kamar-hangat, 38l-kamar-hd |
| `TOWN` | 29-town | 08-input, 09-sheets, 18-phone, 29a-render-loop, 29b-konser |
| `bellMin` | 29-town | — (cuma pemiliknya) |
| `fairC` | 29-town | — (cuma pemiliknya) |
| `fairSaid` | 29-town | — (cuma pemiliknya) |
| `findLine` | 29-town | — (cuma pemiliknya) |
| `wantCity` | 29-town | — (cuma pemiliknya) |
| `coverDrawn` | 29a-render-loop | — (cuma pemiliknya) |
| `coverT` | 29a-render-loop | — (cuma pemiliknya) |
| `homeShT` | 29a-render-loop | — (cuma pemiliknya) |
| `homeT` | 29a-render-loop | — (cuma pemiliknya) |
| `inputT` | 29a-render-loop | — (cuma pemiliknya) |
| `last` | 29a-render-loop | 03c-denah, 07-rooms-actions, 11-status-sheets, 13b-backup-dev, 14-doors-today-wants, 15-game-loop, 23-ward, 24-nest, 26-magazine, 27b-tata-rumah, 28-photos, 34-balik, 38-obrolan, 38c-dapur, 38f-game-baru, 38i-brawl |
| `townT` | 29a-render-loop | — (cuma pemiliknya) |
| `kSayT` | 29b-konser | — (cuma pemiliknya) |
| `kUpright` | 29b-konser | — (cuma pemiliknya) |
| `lfN` | 29c-liar | — (cuma pemiliknya) |
| `lfT` | 29c-liar | — (cuma pemiliknya) |
| `liarExp` | 29c-liar | — (cuma pemiliknya) |
| `liarFn` | 29c-liar | — (cuma pemiliknya) |
| `aheadCache` | 31-ahead | — (cuma pemiliknya) |
| `aheadKey` | 31-ahead | — (cuma pemiliknya) |
| `somedayCache` | 31-ahead | — (cuma pemiliknya) |
| `agMon` | 31b-agenda | 09-sheets |
| `agRecap` | 31b-agenda | — (cuma pemiliknya) |
| `agSel` | 31b-agenda | 09-sheets |
| `lesOpen` | 31c-les | — (cuma pemiliknya) |
| `focus` | 32-focus | 23-ward, 31b-agenda, 38j-kamar, 38k-kamar-hangat |
| `focusLineAt` | 32-focus | — (cuma pemiliknya) |
| `focusLock` | 32-focus | — (cuma pemiliknya) |
| `focusTimer` | 32-focus | — (cuma pemiliknya) |
| `WX` | 33-weather | 03-scene, 12-closet-family, 29-town, 38j-kamar, 38k-kamar-hangat |
| `WX_FORCE` | 33-weather | 38j-kamar |
| `wxBusy` | 33-weather | — (cuma pemiliknya) |
| `wxCfg` | 33-weather | 12-closet-family |
| `wxReal` | 33-weather | 38j-kamar |
| `wxShown` | 33-weather | — (cuma pemiliknya) |
| `phLaterKey` | 35-tonggak | — (cuma pemiliknya) |
| `talkOpen` | 38-obrolan | 10-chat-claude, 38j-kamar |
| `tanyaAi` | 38-obrolan | — (cuma pemiliknya) |
| `tanyaShown` | 38-obrolan | 10-chat-claude |
| `kabarTimers` | 38b-kabar | — (cuma pemiliknya) |
| `ARC` | 38c-dapur | 29a-render-loop |
| `FC` | 38c-dapur | 29a-render-loop, 38d-dunia, 38f-game-baru, 38g-kuis, 38h-kart, 38i-brawl |
| `FIRE_SPR` | 38c-dapur | — (cuma pemiliknya) |
| `trophyG` | 38c-dapur | — (cuma pemiliknya) |
| `trophyKey` | 38c-dapur | — (cuma pemiliknya) |
| `WK` | 38d-dunia | 38f-game-baru |
| `mgQ` | 38d-dunia | 38c-dapur |
| `mgqBefore` | 38d-dunia | — (cuma pemiliknya) |
| `mgqDone` | 38d-dunia | — (cuma pemiliknya) |
| `mgqN` | 38d-dunia | — (cuma pemiliknya) |
| `mgqSlow` | 38d-dunia | — (cuma pemiliknya) |
| `mgqSum` | 38d-dunia | — (cuma pemiliknya) |
| `KR` | 38h-kart | — (cuma pemiliknya) |
| `KT_BZ` | 38h-kart | — (cuma pemiliknya) |
| `KT_FS` | 38h-kart | — (cuma pemiliknya) |
| `KT_PI` | 38h-kart | — (cuma pemiliknya) |
| `bk` | 40-book | 03b-perabot, 24-nest, 29a-render-loop |

## Pembantu yang paling banyak dipakai

Nama top-level dengan pemakai terbanyak. Mengubah tanda tangannya = cek semua pemakai.

| Nama | Pemilik | Jumlah fragmen pemakai |
|---|---|---:|
| `$` | 00-helpers | 48 |
| `game` | 01-save-clock | 47 |
| `cur` | 01-save-clock | 43 |
| `esc` | 00-helpers | 39 |
| `today` | 11-status-sheets | 37 |
| `say` | 05-floating-ui | 35 |
| `save` | 01-save-clock | 31 |
| `now` | 07-rooms-actions | 29 |
| `closeSheet` | 09-sheets | 24 |
| `PH` | 18-phone | 22 |
| `state` | 01-save-clock | 22 |
| `K` | 04-creature | 21 |
| `refresh` | 15-game-loop | 21 |
| `fmtDate` | 01-save-clock | 19 |
| `sheet` | 09-sheets | 19 |
| `F` | 03-scene | 18 |
| `openSheet` | 09-sheets | 18 |
| `M` | 03-scene | 17 |
| `canCare` | 07-rooms-actions | 17 |
| `coins` | 11-status-sheets | 17 |
| `last` | 29a-render-loop | 16 |
| `play` | 06-animation | 15 |
| `burst` | 05-floating-ui | 14 |
| `app` | 00-helpers | 13 |
| `reduce` | 00-helpers | 13 |
| `canvas` | 00-helpers | 12 |
| `scene` | 03-scene | 12 |
| `sheetKind` | 09-sheets | 12 |
| `selected` | 01-save-clock | 11 |
| `vm` | 01-save-clock | 11 |

## Modul game → fragmen UI yang memakainya

Kalau mengubah API sebuah modul (`Engine`, `Status`, ...), fragmen ini yang perlu dicek.

| Modul | Dipakai di |
|---|---|
| `Engine` | 00-helpers, 01-save-clock, 13c-chronicle-devclock, 15-game-loop, 18-phone, 20-ventures, 24-nest, 25-chirp, 26-magazine, 29-town, 29b-konser, 31-ahead, 31b-agenda, 31c-les, 35-tonggak, 38-obrolan |
| `EconConfig` | 01-save-clock |
| `Money` | — |
| `Makro` | — |
| `Bank` | 20-ventures |
| `Storylets` | — |
| `Agenda` | 09-sheets |
| `Status` | 10-chat-claude, 11-status-sheets, 16-stars, 17-burrow, 20-ventures, 21-work-apps, 23-ward, 25-chirp, 27-bazaar, 29-town, 31-ahead |
| `Tree` | 10-chat-claude, 12-closet-family, 13b-backup-dev, 15-game-loop, 16-stars, 17-burrow, 31c-les, 31d-jadwal, 40-book |
| `Rasi` | 16-stars, 40-book |
| `Cosmetics` | 12-closet-family, 13b-backup-dev |
| `Career` | 11-status-sheets, 16-stars, 17-burrow, 18-phone, 21-work-apps, 23-ward, 24-nest, 25-chirp |
| `Market` | 11-status-sheets, 18-phone, 23-ward, 25-chirp, 26-magazine, 27-bazaar, 31-ahead |
| `Venture` | 11-status-sheets, 17-burrow, 18-phone, 20-ventures, 21-work-apps, 23-ward |
| `Work` | 18-phone, 20-ventures, 23-ward |
| `Pets` | 05-floating-ui, 18-phone, 22-paws |
| `Mag` | 18-phone, 23-ward, 25-chirp, 26-magazine, 31-ahead, 38b-kabar |
| `Wants` | 14-doors-today-wants, 28-photos, 31-ahead, 35-tonggak |
| `Tonggak` | 31-ahead, 35-tonggak |
| `Anak` | 23-ward, 31-ahead, 31b-agenda, 35-tonggak, 36-anak, 37-remaja, 38b-kabar |
| `Remaja` | 18-phone, 31-ahead, 35-tonggak, 36-anak, 37-remaja, 38b-kabar |
| `Today` | 11-status-sheets, 14-doors-today-wants, 21-work-apps, 31-ahead, 38c-dapur |
| `Soon` | 27b-tata-rumah, 31-ahead, 31b-agenda |
| `Weather` | 12-closet-family, 13b-backup-dev, 33-weather |
| `Balik` | 34-balik |
| `Obrolan` | 38-obrolan |
| `Kabar` | 38b-kabar |
| `Dapur` | 07-rooms-actions, 13c-chronicle-devclock, 38c-dapur, 38d-dunia, 38f-game-baru, 38h-kart, 38i-brawl |
| `Perabot` | 27b-tata-rumah |
| `Denah` | 03c-denah, 27b-tata-rumah, 38c-dapur |
| `Rekom` | 31b-agenda |
| `Ilmu` | 16-stars, 31b-agenda, 31c-les, 31d-jadwal |
| `Jadwal` | 31c-les, 31d-jadwal |
| `GameLayer` | 13-away, 13c-chronicle-devclock, 15-game-loop, 29-town |
| `Net` | 15-game-loop, 18-phone, 19-kindred, 28-photos, 31-ahead |
| `Moments` | 15-game-loop, 28-photos |
| `Brands` | 07-rooms-actions, 13b-backup-dev, 25-chirp |
| `Tele` | 01-save-clock, 03-scene, 07-rooms-actions, 09-sheets, 12-closet-family, 13b-backup-dev, 14-doors-today-wants, 15-game-loop, 16-stars, 17-burrow, 18-phone, 21-work-apps, 24-nest, 25-chirp, 27-bazaar, 27b-tata-rumah, 28-photos, 29-town, 29b-konser, 29c-liar, 31-ahead, 31b-agenda, 31c-les, 31d-jadwal, 32-focus, 33-weather, 34-balik, 35-tonggak, 36-anak, 37-remaja, 38-obrolan, 38b-kabar, 38c-dapur, 38d-dunia, 38j-kamar, 40-book |
| `Town` | 11-status-sheets, 13b-backup-dev, 14-doors-today-wants, 16-stars, 17-burrow, 18-phone, 21-work-apps, 23-ward, 24-nest, 25-chirp, 26-magazine, 27-bazaar, 29-town, 33-weather |
| `Look` | 29-town, 29c-liar |
| `Rumah` | — |
| `Liar` | 29c-liar |
| `Kota` | 29-town |
| `Bumi` | 29-town, 29c-liar |
| `Globe` | 29-town |
| `Region` | 29-town, 29c-liar |
| `Continent` | 29-town |
| `Suara` | 29-town |
| `Konser` | 29b-konser |
| `Konser3D` | 29b-konser |

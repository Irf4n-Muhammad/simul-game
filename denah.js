// denah.js: Tata Rumah tahap 2 (November 2026). Denah bebas di atas petak: ruangan persegi dengan ukuran sendiri-sendiri,
// pintu, jendela, dan perabot yang ditaruh bebas di petak (bukan slot lagi). Fungsi murni seperti perabot.js; gambarnya di
// ui/03c-denah.js, editornya di ui/27c-bangun.js.
//
// Diskusi 10 Nov: "literally like the sims, ukuran ruangan yang beda2". Supaya tetap enak di HP, ruangan berbentuk persegi
// (geser, tarik sisi, tambah, hapus) dan nggak boleh tumpang tindih. Tiap ruangan punya jenis (dapur, kamar mandi, kamar tidur,
// ruang main); boleh lebih dari satu kamar tidur. Tiap jenis wajib ada minimal satu, dan tiap ruangan wajib punya satu barang
// utamanya (meja makan, bak, kasur, mainan besar).
//
// Denah (home.world.denah, ikut snapshot) hanya berubah lewat satu aksi yang dicatat, jadi replay sama:
//   "denah:simpan:<json>"   simpan seluruh denah sekaligus (editor bikin draf, tombol Save mengirimnya)
// json = { v: 1, R: [[jenis, x, z, w, d]...], D: ["h3,6"...] pintu, N: [...] jendela, I: [[id, x, z, r]...], C: [[cat dinding, cat lantai]...] }
// Sisi petak: "h<x>,<z>" garis datar di atas petak (x, z); "v<x>,<z>" garis tegak di kiri petak (x, z). r = 0..3: barang menghadap
// +z (punggung ke utara), 1 punggung ke barat, 2 ke selatan, 3 ke timur. Barang dinding menempel ke sisi r petaknya.
//
// Rumah tanpa denah tersimpan memakai denah bawaan (empat ruangan lama) yang diisi dari slot tahap 1, dan efek rawatnya tetap
// dihitung lewat slot (perabot.js). Jadi save lama nggak berubah sama sekali sampai denah pertama kali disimpan.
"use strict";
(() => {
  const P = (typeof module !== "undefined") ? require("./perabot.js") : globalThis.Perabot;
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;

  const CELL = 1.2;   // satu petak = 1,2 satuan dunia (dipakai ui)
  // tahap 3: ruang tamu, ruang kerja, taman. Nggak wajib ada, tapi kalau ada wajib punya barang utamanya. Rawatnya ikut "main".
  const TYPES = ["makan", "mandi", "tidur", "peluk", "tamu", "kerja", "taman"];
  const REQUIRED = ["makan", "mandi", "tidur", "peluk"];
  const TYPE_NAME = { makan: "Kitchen", mandi: "Bathroom", tidur: "Bedroom", peluk: "Playroom", tamu: "Living room", kerja: "Study", taman: "Garden" };
  const MAIN_NEED = { makan: "a table", mandi: "a tub", tidur: "a bed", peluk: "something big to play on", tamu: "a sofa", kerja: "a desk", taman: "a bench or a swing" };
  // jenis ruangan yang dipakai tiap rawat
  const CARE_TYPES = { makan: ["makan"], mandi: ["mandi"], tidur: ["tidur"], peluk: ["peluk", "tamu", "kerja", "taman"] };
  const OUTDOOR = t => t === "taman";
  // ukuran kavling per tingkat rumah (world.st.house, status.js)
  const LOT = { rented: [14, 12], flat: [16, 12], house: [18, 14], villa: [22, 16], mansion: [26, 20] };
  const MAX_ROOMS = 14, MAX_ITEMS = 220, MIN_SIDE = 2, MAX_SIDE = 16;

  // ---------------------------------------------------------------- ukuran barang di petak
  // fp: [lebar, dalam] dalam petak waktu r = 0. m: floor (berdiri di lantai), wall (nempel dinding, nggak makan lantai), rug (karpet:
  // boleh di bawah barang lain, nggak boleh numpuk sesama karpet). back: jarak punggung model ke titik nolnya (barang yang nempel dinding).
  const FP = {
    cafe_table: [1, 1], family_table: [2, 2], harvest_table: [2, 2],
    jar_shelf: [2, 1, "wall", 0.17], herb_shelf: [2, 1, "wall", 0.18], coffee_shelf: [2, 1, "wall", 0.19],
    clawfoot_tub: [1, 2, "floor", 1.17], bubble_tub: [1, 2, "floor", 1.17], spa_tub: [2, 2, "floor", 1.2],
    pedestal_sink: [1, 1, "floor", 0.4], vanity: [1, 1, "floor", 0.38], plant_wall: [1, 1, "floor", 0.4],
    pine_bed: [2, 2, "floor", 1.24], cloud_bed: [2, 2, "floor", 1.23], canopy_bed: [2, 2, "floor", 1.2],
    bookshelf: [1, 1, "floor", 0.24], study_desk: [2, 1, "floor", 0.3], reading_nook: [2, 1, "floor", 0.3],
    play_tent: [2, 2], climb_frame: [1, 3, "floor", 0.66], ball_pit: [2, 2],
    toy_shelf: [2, 1, "floor", 0.3], easel: [1, 1], piano: [2, 2, "floor", 0.35],
    plant_kitchen: [1, 1], plant_bathroom: [1, 1], plush_bedroom: [1, 1], beanbag_playroom: [1, 1],
    plant_fiddle: [1, 1], cactus_trio: [1, 1, "floor", 0.22], floor_lamp: [1, 1], paper_lantern: [1, 1], globe_stand: [1, 1], aquarium: [1, 1, "floor", 0.27],
    rug_kitchen: [2, 1, "rug"], rug_bathroom: [1, 1, "rug"], rug_bedroom: [2, 2, "rug"], rug_playroom: [3, 3, "rug"],
    rug_stripe: [3, 2, "rug"], rug_shaggy: [2, 2, "rug"], rug_patch: [3, 2, "rug"], rug_persian: [3, 2, "rug"],
    // bawaan baru tahap 2 (dulu ditempel langsung di ruangan, sekarang barang biasa yang bisa digeser)
    sofa: [3, 1, "floor", 0.45], corner_sofa: [3, 2, "floor", 0.5], velvet_sofa: [3, 1, "floor", 0.45], tv_stand: [2, 1, "floor", 0.3],
    record_player: [1, 1, "floor", 0.28], board_games: [2, 1, "floor", 0.28],
    work_desk: [2, 1, "floor", 0.3], paper_shelf: [1, 1, "floor", 0.25], standing_desk: [2, 1, "floor", 0.3], drafting_table: [2, 1, "floor", 0.45],
    library_wall: [3, 1, "floor", 0.24], whiteboard: [2, 1, "wall", 0.06],
    garden_bench: [2, 1, "floor", 0.3], planter_box: [2, 1, "floor", 0.28], swing_seat: [2, 2], hammock: [3, 1, "floor", 0.3], veg_patch: [2, 2], fountain: [2, 2],
    moon_lamp: [1, 1], gilded_mirror: [1, 1, "wall", 0.05], koi_rug: [3, 2, "rug"],
    kitchen_counter: [3, 1, "floor", 0.52], fridge: [1, 1, "floor", 0.5], nightstand: [1, 1, "floor", 0.32], rubber_duck: [1, 1],
    shelf_jars: [2, 1, "wall", 0.17], shelf_bath: [2, 1, "wall", 0.17], shelf_books: [2, 1, "wall", 0.17], towel_rail: [1, 1, "wall", 0.14], garland: [3, 1, "wall", 0.1],
  };
  function meta(id) {
    const x = P.item(id); if (!x) return null;
    const f = FP[id] || (id.startsWith("art_") ? [1, 1, "wall", 0.04] : [1, 1]);
    return { x, w: f[0], d: f[1], m: f[2] || "floor", back: f[3] == null ? null : f[3] };
  }
  const isMain = (x, t) => !!x && x.slot === "utama" && x.room === t;
  // barang fungsi cuma di ruangan jenisnya; hiasan di mana saja
  const okType = (x, t) => x.room == null || x.room === t;

  // ---------------------------------------------------------------- geometri petak
  const ek = (o, x, z) => o + x + "," + z;   // kunci sisi
  function parseEdge(k) { const m = /^([hv])(-?\d+),(-?\d+)$/.exec(String(k)); return m ? { o: m[1], x: +m[2], z: +m[3] } : null; }
  // dua petak di kedua sisi garis: h -> (x, z-1) dan (x, z); v -> (x-1, z) dan (x, z)
  const sidesOf = e => e.o === "h" ? [[e.x, e.z - 1], [e.x, e.z]] : [[e.x - 1, e.z], [e.x, e.z]];
  // tahap 3: ruangan bentuk L = ruangan induk + sayap. Sayap = baris R dengan elemen ke-6 (indeks induknya). roomAt selalu
  // mengembalikan indeks induk, jadi garis antara induk dan sayap bukan dinding dan barang boleh melintas.
  const rootOf = (plan, i) => (plan.R[i] && plan.R[i].length > 5) ? plan.R[i][5] : i;
  const isRoot = (plan, i) => !!plan.R[i] && plan.R[i].length === 5;
  const roomAt = (plan, x, z) => { for (let i = 0; i < plan.R.length; i++) { const [, rx, rz, w, d] = plan.R[i]; if (x >= rx && x < rx + w && z >= rz && z < rz + d) return rootOf(plan, i); } return -1; };
  const partsOf = (plan, ri) => plan.R.map((_, i) => i).filter(i => rootOf(plan, i) === ri);
  const rootsOf = (plan, t) => plan.R.map((_, i) => i).filter(i => isRoot(plan, i) && (!t || plan.R[i][0] === t));
  const areaOf = (plan, ri) => partsOf(plan, ri).reduce((s, i) => s + plan.R[i][3] * plan.R[i][4], 0);
  const cellsOfRoom = (plan, ri) => { const out = []; for (const i of partsOf(plan, ri)) { const [, x, z, w, d] = plan.R[i]; for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) out.push([x + a, z + b]); } return out; };
  const dims = (m, r) => r % 2 ? [m.d, m.w] : [m.w, m.d];
  // petak yang dipakai barang (untuk barang dinding: petak tempat ia nempel)
  function cellsOf(m, it) {
    const [, x, z, r] = it, [w, d] = dims(m, r), out = [];
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) out.push([x + i, z + j]);
    return out;
  }
  // sisi dinding yang ditempeli barang dinding
  function wallEdges(m, it) {
    const r = it[3];
    return cellsOf(m, it).map(([x, z]) => r === 0 ? ek("h", x, z) : r === 2 ? ek("h", x, z + 1) : r === 1 ? ek("v", x, z) : ek("v", x + 1, z));
  }
  // ---------------------------------------------------------------- denah bawaan
  // Empat ruangan lama dengan ukuran beda-beda, di pojok kiri atas kavling (sisanya halaman buat nambah ruangan).
  // Tiap barang bawaan yang dulu ada di slot dicatat ruangan dan slotnya, supaya isi slot tahap 1 bisa dipindah ke sini.
  const OX = 1, OZ = 1;
  const DEF_ROOMS = [["makan", 0, 0, 6, 5], ["mandi", 6, 0, 4, 5], ["tidur", 0, 5, 5, 5], ["peluk", 5, 5, 5, 5]];
  // [id, x, z, r, slot asal]
  const DEF_ITEMS = [
    // dapur (0..5, 0..4)
    ["kitchen_counter", 0, 0, 0], ["fridge", 0, 2, 1], ["jar_shelf", 0, 0, 0, "samping"], ["cafe_table", 3, 2, 0, "utama"],
    ["shelf_jars", 4, 0, 0], ["art_kitchen", 0, 3, 1, "dinding"], ["rug_kitchen", 2, 3, 0, "lantai"], ["plant_kitchen", 5, 0, 0, "sudut"],
    // kamar mandi (6..9, 0..4)
    ["clawfoot_tub", 6, 1, 1, "utama"], ["shelf_bath", 6, 0, 0], ["pedestal_sink", 8, 0, 0, "samping"], ["towel_rail", 9, 1, 3],
    ["rug_bathroom", 8, 2, 0, "lantai"], ["plant_bathroom", 9, 4, 0, "sudut"], ["rubber_duck", 7, 4, 0],
    // kamar tidur (0..4, 5..9)
    ["pine_bed", 2, 5, 0, "utama"], ["nightstand", 4, 5, 0], ["shelf_books", 2, 5, 0], ["bookshelf", 0, 8, 1, "samping"],
    ["art_bedroom", 4, 7, 3, "dinding"], ["rug_bedroom", 2, 7, 0, "lantai"], ["plush_bedroom", 0, 5, 0, "sudut"],
    // ruang main (5..9, 5..9)
    ["play_tent", 5, 7, 0, "utama"], ["toy_shelf", 7, 5, 0, "samping"], ["garland", 6, 5, 0], ["art_playroom", 9, 7, 3, "dinding"],
    ["rug_playroom", 6, 6, 0, "lantai"], ["beanbag_playroom", 9, 5, 0, "sudut"],
  ];
  const DEF_DOORS = [["v", 6, 3], ["h", 1, 5], ["h", 5, 5], ["h", 8, 10]];   // mandi-dapur, dapur-tidur, dapur-main, pintu depan
  const DEF_WINDOWS = [["h", 2, 0], ["v", 0, 6], ["v", 10, 6], ["h", 8, 0]];

  // tahap 3: rumah yang lebih besar punya denah bawaan yang lebih besar. Empat ruangan lama tetap sama persis (supaya isi slot
  // tahap 1 tetap pindah ke tempatnya); ruangan tambahan ditempel di timur dan selatan. Koordinat di sini sudah mutlak (termasuk OX/OZ).
  // Tiap tingkat = tingkat sebelumnya + tambahannya. drop = pintu/jendela tingkat sebelumnya yang jadi dinding dalam.
  const BED2 = { R: [["tidur", 11, 6, 4, 5]], D: ["v11,9"], N: ["v15,8"], drop: ["v11,7"],
    I: [["pine_bed", 12, 6, 0], ["nightstand", 14, 6, 0], ["shelf_books", 12, 6, 0], ["rug_bedroom", 12, 8, 0]] };
  const LIVING = { R: [["tamu", 1, 11, 14, 3]], D: ["h12,11", "h8,14"], N: ["h3,14", "h12,14", "v1,12", "v15,12"], drop: [],
    I: [["sofa", 5, 13, 2], ["tv_stand", 5, 11, 0], ["rug_playroom", 5, 11, 0], ["plant_kitchen", 1, 11, 0], ["nightstand", 4, 13, 0]] };
  // villa: ruang tamu jadi bentuk L (sayap naik di sisi timur), ruang kerja dan kamar tidur kecil nempel ke sayapnya
  const VILLA = { R: [["tamu", 1, 11, 16, 4], ["tamu", 17, 1, 4, 14, "L"], ["kerja", 11, 1, 6, 5], ["tidur", 15, 6, 2, 5]],
    D: ["h12,11", "h8,15", "v17,3", "v17,9"], N: ["h3,15", "h12,15", "v1,12", "v21,4", "v21,10", "h13,1", "h19,1"], drop: ["v15,8"],
    I: [["sofa", 5, 14, 2], ["tv_stand", 5, 11, 0], ["rug_playroom", 5, 12, 0], ["plant_kitchen", 1, 11, 0], ["nightstand", 4, 14, 0], ["plant_bathroom", 20, 1, 0], ["rug_kitchen", 18, 6, 1],
      ["work_desk", 13, 1, 0], ["paper_shelf", 11, 1, 0], ["shelf_books", 14, 5, 2], ["pine_bed", 15, 6, 0]] };
  const MANSION = { R: [["taman", 1, 15, 16, 4], ["tidur", 21, 1, 4, 5]], D: ["h8,19", "v21,3"], N: ["v25,3"], drop: ["v21,4"],
    I: [["garden_bench", 4, 18, 2], ["planter_box", 11, 15, 0], ["planter_box", 13, 18, 2], ["plant_kitchen", 15, 15, 0], ["pine_bed", 22, 1, 0], ["nightstand", 24, 1, 0]] };
  const TIERS = { rented: [], flat: [BED2], house: [BED2, LIVING], villa: [BED2, VILLA], mansion: [BED2, VILLA, MANSION] };
  const tierOf = home => { const st = home && home.world && home.world.st; return (st && TIERS[st.house]) ? st.house : "rented"; };
  const tierLot = home => LOT[tierOf(home)].slice();

  function lotOf(home) {
    const L = tierLot(home);
    const D = home && home.world && home.world.denah;
    if (!D) return L;
    // rumah pindah ke yang lebih kecil: kavling ikut melebar sampai denah yang ada muat
    let W = L[0], H = L[1];
    for (const [, x, z, w, d] of D.R) { W = Math.max(W, x + w); H = Math.max(H, z + d); }
    return [W, H];
  }
  function defaultPlan(home, fresh = false) {
    const plan = {
      v: 1, R: DEF_ROOMS.map(([t, x, z, w, d]) => [t, x + OX, z + OZ, w, d]),
      D: DEF_DOORS.map(([o, x, z]) => ek(o, x + OX, z + OZ)), N: DEF_WINDOWS.map(([o, x, z]) => ek(o, x + OX, z + OZ)),
      I: DEF_ITEMS.map(([id, x, z, r]) => [id, x + OX, z + OZ, r]), C: DEF_ROOMS.map(() => ["", ""]),
    };
    for (const X of TIERS[tierOf(home)]) {
      plan.D = plan.D.filter(k => !X.drop.includes(k)); plan.N = plan.N.filter(k => !X.drop.includes(k));
      const at = plan.R.length;
      for (const r of X.R) { plan.R.push(r.length > 5 ? [r[0], r[1], r[2], r[3], r[4], at] : r.slice()); plan.C.push(["", ""]); }
      plan.D.push(...X.D); plan.N.push(...X.N);
      plan.I.push(...X.I.map(it => it.slice()));
    }
    // isi slot tahap 1: barang yang dibeli dan dipasang di slot pindah ke tempat barang bawaannya (kalau muat)
    if (fresh || !home || saved(home) || !P.touched(home)) return plan;
    const L = P.layout(home), lot = lotOf(home);
    DEF_ITEMS.forEach((d, k) => {
      const s = d[4]; if (!s) return;
      const r = DEF_ROOMS.findIndex(R => {
        const x = P.item(d[0]); return x && (x.room === R[0] || x.home === R[0]);
      });
      const now = L[DEF_ROOMS[r][0]][s];
      if (now === d[0]) return;
      if (!now) { plan.I[k] = null; return; }
      const old = plan.I[k];
      plan.I[k] = [now, old[1], old[2], old[3]];
      if (fitsAt(plan, k, lot)) return;
      // geser sampai muat di ruangan yang sama; kalau tetap nggak muat, barang lama balik dan yang baru di gudang
      const [, rx, rz, w, h] = plan.R[r];
      for (const rr of [old[3], 0, 1, 2, 3]) for (let z = rz; z < rz + h; z++) for (let x = rx; x < rx + w; x++) {
        plan.I[k] = [now, x, z, rr];
        if (fitsAt(plan, k, lot)) return;
      }
      plan.I[k] = old;
    });
    plan.I = plan.I.filter(Boolean);
    return plan;
  }
  const plan = home => (home && home.world && home.world.denah) || defaultPlan(home);
  function saved(home) { return !!(home && home.world && home.world.denah); }

  // ---------------------------------------------------------------- persediaan
  // punya = gudang + yang terpasang (di denah kalau sudah ada, kalau belum di slot tahap 1). Bawaan nggak dihitung: gratis, nggak terbatas.
  function own(home) {
    const out = P.storage(home), add = id => { const x = P.item(id); if (x && !x.def) out[id] = (out[id] || 0) + 1; };
    if (saved(home)) for (const it of home.world.denah.I) add(it[0]);
    else if (P.touched(home)) { const L = P.layout(home); for (const r of P.ROOM_IDS) for (const s of P.SLOT_IDS) if (L[r][s]) add(L[r][s]); }
    return out;
  }
  const countIn = pl => { const out = {}; for (const it of pl.I) { const x = P.item(it[0]); if (x && !x.def) out[it[0]] = (out[it[0]] || 0) + 1; } return out; };

  // ---------------------------------------------------------------- periksa
  // Hasil: daftar masalah { msg, r?: ruangan, i?: barang, e?: sisi }. Kosong = boleh disimpan.
  const isInt = n => Number.isInteger(n) && Math.abs(n) < 1000;
  function shape(pl) {
    if (!pl || typeof pl !== "object" || !Array.isArray(pl.R) || !Array.isArray(pl.D) || !Array.isArray(pl.N) || !Array.isArray(pl.I)) return false;
    if (pl.R.length < 1 || pl.R.length > MAX_ROOMS || pl.I.length > MAX_ITEMS || pl.D.length > 60 || pl.N.length > 80) return false;
    if (!pl.R.every(r => Array.isArray(r) && (r.length === 5 || r.length === 6) && TYPES.includes(r[0]) && r.slice(1).every(isInt))) return false;
    // sayap: induknya ruangan biasa (bukan sayap lain), jenisnya sama
    if (!pl.R.every((r, i) => r.length === 5 || (r[5] >= 0 && r[5] < pl.R.length && r[5] !== i && pl.R[r[5]].length === 5 && pl.R[r[5]][0] === r[0]))) return false;
    // pembagian kamar tidur (tahap 3, boleh nggak ada): [[id makhluk, indeks kamar]]
    if (pl.A != null && !(Array.isArray(pl.A) && pl.A.length <= 40 && pl.A.every(a => Array.isArray(a) && a.length === 2 && typeof a[0] === "string" && a[0].length <= 40 && isInt(a[1])))) return false;
    if (!pl.I.every(it => Array.isArray(it) && it.length === 4 && typeof it[0] === "string" && isInt(it[1]) && isInt(it[2]) && [0, 1, 2, 3].includes(it[3]))) return false;
    if (![...pl.D, ...pl.N].every(k => typeof k === "string" && parseEdge(k))) return false;
    if (pl.C != null && !(Array.isArray(pl.C) && pl.C.length === pl.R.length && pl.C.every(c => Array.isArray(c) && c.length === 2 && c.every(s => typeof s === "string" && s.length <= 16)))) return false;
    return true;
  }
  // nama per baris R; sayap memakai nama induknya, nomor dihitung dari ruangan induk saja
  function names(pl) {
    const n = {}, tot = {}, out = [];
    pl.R.forEach((r, i) => { if (r.length === 5) tot[r[0]] = (tot[r[0]] || 0) + 1; });
    pl.R.forEach((r, i) => { if (r.length !== 5) return; n[r[0]] = (n[r[0]] || 0) + 1; out[i] = TYPE_NAME[r[0]] + (tot[r[0]] > 1 ? " " + n[r[0]] : ""); });
    return pl.R.map((r, i) => out[rootOf(pl, i)] || TYPE_NAME[r[0]]);
  }
  // dua persegi berbagi sisi sepanjang minimal n petak?
  function touch(a, b, n = 2) {
    const [, ax, az, aw, ad] = a, [, bx, bz, bw, bd] = b;
    const ov = (p0, p1, q0, q1) => Math.min(p1, q1) - Math.max(p0, q0);
    if (ax + aw === bx || bx + bw === ax) return ov(az, az + ad, bz, bz + bd) >= n;
    if (az + ad === bz || bz + bd === az) return ov(ax, ax + aw, bx, bx + bw) >= n;
    return false;
  }
  // satu barang muat di tempatnya? (dipakai juga waktu memindah isi slot lama)
  function fitsAt(pl, k, lot) {
    const it = pl.I[k], m = meta(it[0]); if (!m) return false;
    const cells = cellsOf(m, it), ri = roomAt(pl, cells[0][0], cells[0][1]);
    if (ri < 0 || !okType(m.x, pl.R[ri][0])) return false;
    if (!cells.every(([x, z]) => x >= 0 && z >= 0 && x < lot[0] && z < lot[1] && roomAt(pl, x, z) === ri)) return false;
    const doorCells = doorCellSet(pl);
    if (m.m === "floor" && cells.some(([x, z]) => doorCells.has(x + "," + z))) return false;
    if (m.m === "wall") {
      const es = wallEdges(m, it), open = new Set([...pl.D, ...pl.N]);
      if (!es.every(e => isWallOf(pl, parseEdge(e), ri) && !open.has(e))) return false;
    }
    const mine = new Set(m.m === "wall" ? wallEdges(m, it) : cells.map(c => c.join(",")));
    for (let j = 0; j < pl.I.length; j++) {
      if (j === k || !pl.I[j]) continue;
      const o = pl.I[j], mo = meta(o[0]); if (!mo || mo.m !== m.m) continue;
      const theirs = mo.m === "wall" ? wallEdges(mo, o) : cellsOf(mo, o).map(c => c.join(","));
      if (theirs.some(c => mine.has(c))) return false;
    }
    return true;
  }
  // garis ini dinding ruangan ri? (petak di satu sisi milik ri, sisi lain bukan)
  function isWallOf(pl, e, ri) {
    const [a, b] = sidesOf(e).map(([x, z]) => roomAt(pl, x, z));
    return a !== b && (a === ri || b === ri);
  }
  function doorCellSet(pl) {
    const s = new Set();
    for (const k of pl.D) { const e = parseEdge(k); if (e) for (const [x, z] of sidesOf(e)) s.add(x + "," + z); }
    return s;
  }
  function check(pl, opt = {}) {
    if (!shape(pl)) return [{ msg: "This plan can't be read." }];
    const lot = opt.lot || LOT.rented, errs = [], nm = names(pl);
    pl.R.forEach(([, x, z, w, d], i) => {
      if (w < MIN_SIDE || d < MIN_SIDE) errs.push({ r: i, msg: `${nm[i]} is too small (at least ${MIN_SIDE} by ${MIN_SIDE}).` });
      else if (w > MAX_SIDE || d > MAX_SIDE) errs.push({ r: i, msg: `${nm[i]} is too big.` });
      if (x < 0 || z < 0 || x + w > lot[0] || z + d > lot[1]) errs.push({ r: i, msg: `${nm[i]} goes past the edge of the lot.` });
      for (let j = 0; j < i; j++) {
        const [, x2, z2, w2, d2] = pl.R[j];
        if (x < x2 + w2 && x2 < x + w && z < z2 + d2 && z2 < z + d) errs.push({ r: i, msg: `${nm[i]} overlaps ${nm[j]}.` });
      }
    });
    pl.R.forEach((r, i) => { if (r.length > 5 && !touch(r, pl.R[r[5]])) errs.push({ r: i, msg: `The extra part of ${nm[i]} has to touch the room along at least 2 squares.` }); });
    for (const t of REQUIRED) if (!pl.R.some(r => r[0] === t)) errs.push({ msg: `The house needs a ${TYPE_NAME[t].toLowerCase()}.` });
    if (errs.length) return errs;   // ruangan dulu: sisanya baru masuk akal kalau ruangannya beres
    // pintu dan jendela
    const seen = new Set(), adj = pl.R.map(() => new Set());   // -1 = luar
    let front = 0;
    for (const k of pl.D) {
      const e = parseEdge(k), [a, b] = sidesOf(e).map(([x, z]) => roomAt(pl, x, z));
      if (seen.has(k)) { errs.push({ e: k, msg: "Two doors in the same spot." }); continue; }
      seen.add(k);
      if (a === b) { errs.push({ e: k, msg: "A door has no wall to sit in." }); continue; }
      if (a < 0 || b < 0) front++;
      if (a >= 0) adj[a].add(b); if (b >= 0) adj[b].add(a);
    }
    for (const k of pl.N) {
      const e = parseEdge(k), [a, b] = sidesOf(e).map(([x, z]) => roomAt(pl, x, z));
      if (seen.has(k)) { errs.push({ e: k, msg: "A window is in the same spot as a door or another window." }); continue; }
      seen.add(k);
      // jendela: satu sisi ruangan dalam, sisi lain luar atau taman
      const inside = v => v >= 0 && !OUTDOOR(pl.R[v][0]), open = v => v < 0 || OUTDOOR(pl.R[v][0]);
      if (!((inside(a) && open(b)) || (inside(b) && open(a)))) errs.push({ e: k, msg: "Windows go on outside walls." });
    }
    if (!front) errs.push({ msg: "The house needs a front door." });
    else {
      // semua ruangan bisa dicapai dari luar lewat pintu
      const got = new Set(), q = [];
      pl.R.forEach((_, i) => { if (adj[i].has(-1)) { got.add(i); q.push(i); } });
      while (q.length) { const i = q.shift(); for (const j of adj[i]) if (j >= 0 && !got.has(j)) { got.add(j); q.push(j); } }
      pl.R.forEach((_, i) => { if (isRoot(pl, i) && !got.has(i)) errs.push({ r: i, msg: `${nm[i]} has no door.` }); });
    }
    // barang
    pl.I.forEach((it, k) => {
      const m = meta(it[0]);
      if (!m) return errs.push({ i: k, msg: "Unknown item." });
      const c0 = cellsOf(m, it)[0], ri = roomAt(pl, c0[0], c0[1]);
      if (ri < 0) return errs.push({ i: k, msg: `${m.x.name} is outside the house.` });
      if (!okType(m.x, pl.R[ri][0])) return errs.push({ i: k, msg: `${m.x.name} belongs in a ${TYPE_NAME[m.x.room].toLowerCase()}.` });
      if (!fitsAt(pl, k, lot)) errs.push({ i: k, msg: `${m.x.name} doesn't fit there.` });
    });
    pl.R.forEach((r, i) => {
      if (!isRoot(pl, i)) return;
      if (!pl.I.some(it => { const m = meta(it[0]); if (!m || !isMain(m.x, r[0])) return false; const c = cellsOf(m, it)[0]; return roomAt(pl, c[0], c[1]) === i; }))
        errs.push({ r: i, msg: `${nm[i]} needs ${MAIN_NEED[r[0]]}.` });
    });
    if (opt.own) {
      const n = countIn(pl);
      for (const id of Object.keys(n)) if (n[id] > (opt.own[id] || 0)) errs.push({ msg: `Only ${opt.own[id] || 0} ${P.item(id).name.toLowerCase()} at home.` });
    }
    return errs;
  }

  // ---------------------------------------------------------------- aksi (dari Game._act0)
  const PREFIX = "denah:simpan:";
  function act(home, c, kind, day) {
    if (!kind.startsWith(PREFIX)) return false;
    let pl; try { pl = JSON.parse(kind.slice(PREFIX.length)); } catch (e) { return false; }
    if (!shape(pl)) return false;
    const pl0 = pl;
    pl = { v: 1, R: pl.R, D: pl.D, N: pl.N, I: pl.I, C: pl.C || pl.R.map(() => ["", ""]) };
    if (Array.isArray(pl0.A) && pl0.A.length) pl.A = pl0.A.filter(([, ri]) => isRoot(pl, ri) && pl.R[ri][0] === "tidur");
    const have = own(home);
    if (check(pl, { lot: lotOf(home), own: have }).length) return false;
    const n = countIn(pl), Pk = home.world.perabot || (home.world.perabot = P.fresh());
    const G = {};
    for (const id of Object.keys(have)) { const left = have[id] - (n[id] || 0); if (left > 0) G[id] = left; }
    Pk.gudang = G;
    home.world.denah = pl;
    return true;
  }
  const encode = pl => PREFIX + JSON.stringify(Object.assign({ v: 1, R: pl.R, D: pl.D, N: pl.N, I: pl.I, C: pl.C }, pl.A && pl.A.length ? { A: pl.A } : {}));

  // ---------------------------------------------------------------- efek waktu rawat (rumah yang sudah punya denah)
  const fxVal = f => !f ? 0 : (f.mood || 0) + (f.kes || 0) * 20 + (f.bond || 0) * 15 + (f.skill ? f.skill.n * 15 : 0);
  function inRoom(pl, ri) {
    return pl.I.filter(it => { const m = meta(it[0]); if (!m) return false; const c = cellsOf(m, it)[0]; return roomAt(pl, c[0], c[1]) === ri; }).map(it => P.item(it[0]));
  }
  // barang fungsi terbaik buat rawat ini: satu dari kelas utama, satu dari kelas samping (seperti dua slot dulu)
  function best(xs, t, when) {
    const out = [];
    for (const s of ["utama", "samping"]) {
      let b = null;
      for (const x of xs) if (x.slot === s && x.room === t && x.fx && !(x.fx.when && when && x.fx.when !== when) && fxVal(x.fx) > fxVal(b && b.fx)) b = x;
      if (b) out.push(b);
    }
    return out;
  }
  function ambienceOf(pl, c, ri) {
    const xs = inRoom(pl, ri), area = areaOf(pl, ri);
    let v = 0, n = 0;
    for (const x of xs) { if (x.def) continue; v += x.hias + P.likes(c, x); if (x.slot === "dinding" || x.slot === "lantai" || x.slot === "sudut") n++; }
    const T = c ? P.taste(c) : {};
    if (n >= Math.max(3, Math.ceil(area / 10)) && (T.rapi || 0) > 0) v -= 2;
    return Math.max(0, Math.min(10, v));
  }
  // ruangan tempat rawat jenis t buat makhluk ini: yang paling enak (perabot fungsi + suasana), seri = yang lebih dulu.
  // Tidur: kalau sl (hasil sleepers) diberikan dan makhluknya ada di situ, kamarnya sendiri (-1 = nggak kebagian kasur).
  function careRoom(pl, c, t, when, sl) {
    if (t === "tidur" && sl && c && c.id in sl) return sl[c.id];
    const types = CARE_TYPES[t] || [t];
    let bi = -1, bv = -1;
    pl.R.forEach((r, i) => {
      if (!isRoot(pl, i) || !types.includes(r[0])) return;
      const v = best(inRoom(pl, i), r[0], when).reduce((s, x) => s + fxVal(x.fx), 0) + P.moodOf(ambienceOf(pl, c, i)) - (r[0] === t ? 0 : 0.01);
      if (v > bv) { bv = v; bi = i; }
    });
    return bi;
  }

  // ---------------------------------------------------------------- kamar tidur (tahap 3)
  // Satu kasur = dua tempat. Remaja dan dewasa makan satu kasur penuh, kecuali pasangan (satu kasur berdua); anak (60-180 hari)
  // cuma separuh, jadi dua anak bisa satu kasur. Bayi tidur di kamar orang tuanya, nggak butuh kasur.
  // Urutan: pembagian dari pemain (plan.A) dulu, lalu pasangan, lalu yang paling tua duluan milih: kamar kosong terbaik, kalau
  // nggak ada ya berbagi. Yang nggak kebagian = -1. Murni dari denah dan anggota rumah, jadi sama tiap replay.
  const COUPLE = ["pasangan", "tunangan", "suami-istri"];
  const isCouple = (a, b) => !!(a.relations && a.relations[b.id] && COUPLE.includes(a.relations[b.id].tipe));
  function bedsIn(pl, ri) {
    return pl.I.filter(it => { const m = meta(it[0]); if (!m || !isMain(m.x, "tidur")) return false; const c = cellsOf(m, it)[0]; return roomAt(pl, c[0], c[1]) === ri; }).length;
  }
  function roomRank(pl, ri) { return best(inRoom(pl, ri), pl.R[ri][0]).reduce((s, x) => s + fxVal(x.fx), 0) + areaOf(pl, ri) / 10; }
  function sleepers(home, day, pl = plan(home)) {
    const out = {};
    if (!home || typeof home.living !== "function") return out;
    const rooms = rootsOf(pl, "tidur").sort((a, b) => roomRank(pl, b) - roomRank(pl, a) || a - b);
    const cap = {}, occ = {};
    for (const ri of rooms) { cap[ri] = 2 * bedsIn(pl, ri); occ[ri] = []; }
    const mem = home.living(day), age = c => c.age(day);
    const babies = mem.filter(c => age(c) < 60), rest = mem.filter(c => age(c) >= 60).sort((a, b) => a.born - b.born || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const used = ri => { let n = 0; for (const o of occ[ri]) n += age(o) < 180 ? 1 : occ[ri].some(p => p !== o && isCouple(o, p)) ? 1 : 2; return n; };
    const cost = (c, ri) => age(c) < 180 ? 1 : occ[ri].some(p => isCouple(c, p)) ? 0 : 2;   // pasangan: kasurnya sudah dihitung penuh
    const fits = (c, ri) => used(ri) + cost(c, ri) <= cap[ri];
    const put = (c, ri) => { out[c.id] = ri; if (ri >= 0) occ[ri].push(c); };
    for (const [cid, ri] of (pl.A || [])) {
      const c = rest.find(m => m.id === cid);
      if (c && out[c.id] == null && ri in cap && fits(c, ri)) put(c, ri);
    }
    for (const c of rest) {
      if (out[c.id] != null) continue;
      const p = rest.find(m => m !== c && isCouple(c, m));
      if (!p) continue;
      if (out[p.id] != null) { if (out[p.id] >= 0 && fits(c, out[p.id])) put(c, out[p.id]); continue; }
      const ri = rooms.find(r => !occ[r].length && cap[r] >= 2) ?? rooms.find(r => used(r) + 2 <= cap[r]);
      if (ri != null) { put(c, ri); put(p, ri); }
    }
    for (const c of rest) {
      if (out[c.id] != null) continue;
      const ri = rooms.find(r => !occ[r].length && fits(c, r)) ?? rooms.find(r => fits(c, r));
      put(c, ri == null ? -1 : ri);
    }
    for (const b of babies) { const p = (b.parents || []).map(id => out[id]).find(v => v != null && v >= 0); out[b.id] = p ?? -1; }
    return out;
  }
  // teman sekamar yang saudara kandung (anak dari orang tua yang sama)
  function roommates(home, c, day, sl = sleepers(home, day)) {
    const ri = sl[c.id]; if (ri == null || ri < 0) return [];
    return home.living(day).filter(m => m !== c && sl[m.id] === ri && m.age(day) >= 60);
  }
  const sibling = (a, b) => (a.parents || []).some(p => (b.parents || []).includes(p));
  const sharesWithSibling = (home, c, day, sl) => roommates(home, c, day, sl).some(m => sibling(c, m));

  function onCare(home, c, x, care, day) {
    const pl = home.world.denah, t = { makan_p: "makan", makan_m: "makan", mandi: "mandi", tidur: "tidur", peluk: "peluk" }[care];
    if (!pl || !t) return null;
    const when = care === "makan_p" ? "pagi" : care === "makan_m" ? "malam" : null;
    const D = c.info.perabot || (c.info.perabot = { d: null, r: [], lihat: [] });
    if (D.d !== day) { D.d = day; D.r = []; }
    if (D.r.includes(t)) return null;
    D.r.push(t);
    const sl = t === "tidur" ? sleepers(home, day) : null;
    const ri = careRoom(pl, c, t, when, sl);
    if (ri < 0) return t === "tidur" && sl && sl[c.id] === -1 ? `No bed for ${c.name} tonight. A blanket on the sofa will have to do.` : null;
    const xs = inRoom(pl, ri);
    for (const it of best(xs, pl.R[ri][0], when)) {
      // tahap 3: barang aus. Efeknya ikut kondisi (100 = penuh, 0 = separuh), lalu kondisinya turun sedikit
      const f = it.fx, k = P.condMul(P.cond(home, it.id));
      if (f.mood) x.need("mood", f.mood * k);
      if (f.kes) x.stat("kesehatan", f.kes * k);
      if (f.bond) c.bond = Math.min(100, c.bond + f.bond * k * (1 - c.bond / 100));
      if (f.skill && c.st && c.st.skills && f.skill.k in c.st.skills) c.st.skills[f.skill.k] = Math.min(100, c.st.skills[f.skill.k] + f.skill.n * k);
      P.wear(home, it.id);
    }
    const m = P.moodOf(ambienceOf(pl, c, ri));
    if (m) x.need("mood", m);
    for (const x2 of xs) {
      if (x2.def || D.lihat.includes(x2.id)) continue;
      D.lihat.push(x2.id);
      if (D.lihat.length > 60) D.lihat.splice(0, D.lihat.length - 60);
      const v = P.likes(c, x2), n = c.name;
      return v > 0 ? `${n} loves the new ${x2.name.toLowerCase()} and keeps looking at it.`
        : v < 0 ? `${n} gives the new ${x2.name.toLowerCase()} a long look. Not really their thing.`
          : `${n} notices the new ${x2.name.toLowerCase()}.`;
    }
    return null;
  }

  // ---------------------------------------------------------------- pindah rumah (tahap 3, dari status.js)
  // Rumah yang sudah punya denah pindah ke denah bawaan rumah barunya. Perabot ikut: barang utama/samping menggantikan bawaan di
  // ruangan sejenis, hiasan dicarikan tempat di ruangan sejenis; yang nggak muat masuk gudang. Pembagian kamar dan cat mulai dari nol.
  function move(home) {
    if (!saved(home)) return null;
    const old = home.world.denah, have = own(home), lot = tierLot(home);
    const pl = defaultPlan(home, true);
    let placed = 0, stored = 0;
    for (const it of old.I) {
      const x = P.item(it[0]); if (!x || x.def) continue;
      const m = meta(it[0]), c0 = cellsOf(m, it)[0], oi = roomAt(old, c0[0], c0[1]), t = oi >= 0 ? old.R[oi][0] : x.room;
      const same = rootsOf(pl, t), rooms = x.room ? rootsOf(pl, x.room) : [...same, ...rootsOf(pl).filter(i => !same.includes(i))];
      let done = false;
      if (x.room && (x.slot === "utama" || x.slot === "samping")) {
        for (const ri of rooms) {
          const k = pl.I.findIndex(o => { const y = P.item(o[0]), mo = meta(o[0]); if (!y || !y.def || y.slot !== x.slot || y.room !== x.room) return false; const c = cellsOf(mo, o)[0]; return roomAt(pl, c[0], c[1]) === ri; });
          if (k < 0) continue;
          const was = pl.I.splice(k, 1)[0], spot = findSpot(pl, x.id, ri, lot, [was[1], was[2], was[3]]);
          if (spot) { pl.I.push([x.id, ...spot]); done = true; break; }
          pl.I.splice(k, 0, was);
        }
      }
      if (!done) for (const ri of rooms) { const spot = findSpot(pl, x.id, ri, lot); if (spot) { pl.I.push([x.id, ...spot]); done = true; break; } }
      if (done) placed++; else stored++;
    }
    const n = countIn(pl), Pk = home.world.perabot || (home.world.perabot = P.fresh()), G = {};
    for (const id of Object.keys(have)) { const left = have[id] - (n[id] || 0); if (left > 0) G[id] = left; }
    Pk.gudang = G;
    home.world.denah = pl;
    return { placed, stored };
  }

  // ---------------------------------------------------------------- cerita (storylets). Cuma jalan di rumah yang denahnya sudah disimpan,
  // jadi save lama nggak kena (storylet yang cond-nya salah nggak masuk undian sutradara).
  if (E && E.storylet) {
    const { storylet, FORCED } = E;
    const has = (x, t) => saved(x.home) && x.home.world.denah.R.some(r => r[0] === t);
    const inHome = x => x.home && typeof x.home.living === "function" && x.home.living(x.day).includes(x.c);
    storylet("kamar_rebutan", ["anak", "remaja"], "kecil", { cooldown: 21, cond: x => saved(x.home) && inHome(x) && sharesWithSibling(x.home, x.c, x.day), weight: x => 0.5 + x.t("impulsif") / 100 }, x => {
      const o = roommates(x.home, x.c, x.day).find(m => sibling(x.c, m));
      const why = x.pick(["the side by the window", "the light: on or off", "whose turn it is to tidy", "a drawer that used to be empty", "the top bunk, even though there isn't one"]);
      x.need("mood", -3);
      x.say(`${x.n} and ${o.name} share a room, and tonight they fight over ${why}. It ends with a line of tape down the middle of the floor.`);
    });
    storylet("minta_kamar", ["remaja"], "sedang", { cooldown: 90, cond: x => saved(x.home) && inHome(x) && !x.c.info.minta_kamar && sharesWithSibling(x.home, x.c, x.day) }, x => {
      const o = roommates(x.home, x.c, x.day).find(m => sibling(x.c, m));
      const [, fin] = x.ask(`${x.n} still shares a room with ${o.name} and asks for a room of their own.`,
        ["Promise them their own room", "Ask them to keep sharing for now"], { suportif: 0, tegas: 1 }, 0);
      if (fin === 0) {
        x.c.info.minta_kamar = { d: x.day };
        x.need("mood", 4);
        x.say(`${x.n} is already planning where the desk will go. (Build a bedroom with a bed in Decorate, or move ${o.name} to another room.)`);
      } else {
        x.need("mood", -4); x.trait("patuh", 0.4);
        x.say(`${x.n} nods and puts headphones on. The tape line on the floor stays.`);
      }
    });
    FORCED.push({ id: "kamar_sendiri", cond: x => !!x.c.info.minta_kamar && saved(x.home) && inHome(x) && (() => { const sl = sleepers(x.home, x.day); return sl[x.c.id] >= 0 && !roommates(x.home, x.c, x.day, sl).length; })(),
      run: x => {
        delete x.c.info.minta_kamar; x.need("mood", 10); x.bond(1); x.remember("Got a room of their own.");
        return `${x.n} has a room of their own at last. The door stays shut for an hour, and then it's open again, with a sign on it: KNOCK FIRST.`;
      } });
    FORCED.push({ id: "kamar_janji", cond: x => !!x.c.info.minta_kamar && x.day >= x.c.info.minta_kamar.d + 45 && saved(x.home) && inHome(x),
      run: x => {
        delete x.c.info.minta_kamar; x.need("mood", -6); x.bond(-1);
        return `It's been six weeks since ${x.n} was promised a room of their own. They stop asking. That's worse than asking.`;
      } });
    storylet("tanpa_kasur", ["anak", "remaja", "dewasa", "tua"], "kecil", { cooldown: 10, cond: x => saved(x.home) && inHome(x) && x.age >= 60 && sleepers(x.home, x.day)[x.c.id] === -1, weight: () => 2 }, x => {
      x.need("mood", -4);
      x.say(x.pick([`${x.n} sleeps on the sofa again. There's no bed for them in this house.`,
        `${x.n} wakes up stiff from a night on the floor cushions. The house needs another bed.`]));
    });
    storylet("malam_film", ["anak", "remaja", "dewasa", "tua"], "kecil", { cooldown: 10, cond: x => has(x, "tamu") && inHome(x) && x.home.living(x.day).length >= 3 }, x => {
      x.need("mood", 4); x.bond(0.5);
      x.say(x.pick([`Film night in the living room. ${x.n} falls asleep before the end and claims they saw all of it.`,
        `Everyone squeezes onto the sofa for a film. ${x.n} is in charge of the popcorn and eats most of it.`]));
    });
    storylet("ruang_kerja", ["remaja", "dewasa"], "kecil", { cooldown: 8, cond: x => has(x, "kerja") && inHome(x) && !!(x.c.st && x.c.st.skills) }, x => {
      const k = x.t("kreatif") >= 60 ? "creativity" : "logic";
      x.c.st.skills[k] = Math.min(100, x.c.st.skills[k] + 0.3);
      x.say(`${x.n} spends a quiet evening in the study. ${k === "logic" ? "A page of notes, then another." : "Sketches cover the desk by bedtime."}`);
    });
    storylet("berkebun", ["anak", "remaja", "dewasa", "tua"], "kecil", { cooldown: 9, cond: x => has(x, "taman") && inHome(x) }, x => {
      x.need("mood", 3); x.stat("kesehatan", 0.3);
      x.say(x.pick([`${x.n} spends the afternoon in the garden and comes in with dirt up to the elbows.`,
        `The first tomato in the garden is ripe. ${x.n} eats it standing right there.`]));
    });
  }

  // ---------------------------------------------------------------- bantuan editor
  // tempat kosong pertama buat barang di ruangan ri (dicoba semua arah); null kalau nggak ada
  function findSpot(pl, id, ri, lot, pref) {
    const k = pl.I.length, cells = cellsOfRoom(pl, ri).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const tryAt = (x, z, r) => { pl.I.push([id, x, z, r]); const ok = fitsAt(pl, k, lot); pl.I.pop(); return ok; };
    if (pref && tryAt(...pref)) return pref;
    for (const r of [0, 1, 3, 2]) for (const [x, z] of cells) if (tryAt(x, z, r)) return [x, z, r];
    return null;
  }
  // tempat kosong buat ruangan baru w x d (di kavling, nggak numpuk); null kalau penuh
  function findRoomSpot(pl, w, d, lot) {
    for (let z = 0; z + d <= lot[1]; z++) for (let x = 0; x + w <= lot[0]; x++) {
      if (!pl.R.some(([, x2, z2, w2, d2]) => x < x2 + w2 && x2 < x + w && z < z2 + d2 && z2 < z + d)) return [x, z];
    }
    return null;
  }
  const clone = pl => JSON.parse(JSON.stringify(pl));

  const API = { CELL, TYPES, REQUIRED, TYPE_NAME, MAIN_NEED, CARE_TYPES, OUTDOOR, LOT, TIERS, FP, PREFIX, meta, isMain, okType, ek, parseEdge, sidesOf, roomAt, rootOf, isRoot, partsOf, rootsOf, areaOf, cellsOfRoom, dims, cellsOf, wallEdges,
    lotOf, tierLot, defaultPlan, plan, saved, own, countIn, shape, names, touch, fitsAt, isWallOf, doorCellSet, check, act, encode,
    fxVal, inRoom, best, ambienceOf, careRoom, bedsIn, sleepers, roommates, sharesWithSibling, onCare, move, findSpot, findRoomSpot, clone };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Denah = API;
})();

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

  const CELL = 1.2;   // satu petak = 1,2 satuan dunia (dipakai ui)
  const TYPES = ["makan", "mandi", "tidur", "peluk"];
  const TYPE_NAME = { makan: "Kitchen", mandi: "Bathroom", tidur: "Bedroom", peluk: "Playroom" };
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
  const roomAt = (plan, x, z) => { for (let i = 0; i < plan.R.length; i++) { const [, rx, rz, w, d] = plan.R[i]; if (x >= rx && x < rx + w && z >= rz && z < rz + d) return i; } return -1; };
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

  function lotOf(home) {
    const st = home && home.world && home.world.st, L = LOT[(st && st.house) || "rented"] || LOT.rented;
    const D = home && home.world && home.world.denah;
    if (!D) return L.slice();
    // rumah pindah ke yang lebih kecil: kavling ikut melebar sampai denah yang ada muat
    let W = L[0], H = L[1];
    for (const [, x, z, w, d] of D.R) { W = Math.max(W, x + w); H = Math.max(H, z + d); }
    return [W, H];
  }
  function defaultPlan(home) {
    const plan = {
      v: 1, R: DEF_ROOMS.map(([t, x, z, w, d]) => [t, x + OX, z + OZ, w, d]),
      D: DEF_DOORS.map(([o, x, z]) => ek(o, x + OX, z + OZ)), N: DEF_WINDOWS.map(([o, x, z]) => ek(o, x + OX, z + OZ)),
      I: DEF_ITEMS.map(([id, x, z, r]) => [id, x + OX, z + OZ, r]), C: DEF_ROOMS.map(() => ["", ""]),
    };
    // isi slot tahap 1: barang yang dibeli dan dipasang di slot pindah ke tempat barang bawaannya (kalau muat)
    if (!home || !P.touched(home)) return plan;
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
  const saved = home => !!(home && home.world && home.world.denah);

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
    if (!pl.R.every(r => Array.isArray(r) && r.length === 5 && TYPES.includes(r[0]) && r.slice(1).every(isInt))) return false;
    if (!pl.I.every(it => Array.isArray(it) && it.length === 4 && typeof it[0] === "string" && isInt(it[1]) && isInt(it[2]) && [0, 1, 2, 3].includes(it[3]))) return false;
    if (![...pl.D, ...pl.N].every(k => typeof k === "string" && parseEdge(k))) return false;
    if (pl.C != null && !(Array.isArray(pl.C) && pl.C.length === pl.R.length && pl.C.every(c => Array.isArray(c) && c.length === 2 && c.every(s => typeof s === "string" && s.length <= 16)))) return false;
    return true;
  }
  function names(pl) {
    const n = {}, tot = {};
    for (const r of pl.R) tot[r[0]] = (tot[r[0]] || 0) + 1;
    return pl.R.map(r => { n[r[0]] = (n[r[0]] || 0) + 1; return TYPE_NAME[r[0]] + (tot[r[0]] > 1 ? " " + n[r[0]] : ""); });
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
    for (const t of TYPES) if (!pl.R.some(r => r[0] === t)) errs.push({ msg: `The house needs a ${TYPE_NAME[t].toLowerCase()}.` });
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
      if (!((a < 0) !== (b < 0))) errs.push({ e: k, msg: "Windows go on outside walls." });
    }
    if (!front) errs.push({ msg: "The house needs a front door." });
    else {
      // semua ruangan bisa dicapai dari luar lewat pintu
      const got = new Set(), q = [];
      pl.R.forEach((_, i) => { if (adj[i].has(-1)) { got.add(i); q.push(i); } });
      while (q.length) { const i = q.shift(); for (const j of adj[i]) if (j >= 0 && !got.has(j)) { got.add(j); q.push(j); } }
      pl.R.forEach((_, i) => { if (!got.has(i)) errs.push({ r: i, msg: `${nm[i]} has no door.` }); });
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
      if (!pl.I.some(it => { const m = meta(it[0]); if (!m || !isMain(m.x, r[0])) return false; const c = cellsOf(m, it)[0]; return roomAt(pl, c[0], c[1]) === i; }))
        errs.push({ r: i, msg: `${nm[i]} needs ${{ makan: "a table", mandi: "a tub", tidur: "a bed", peluk: "something big to play on" }[r[0]]}.` });
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
    pl = { v: 1, R: pl.R, D: pl.D, N: pl.N, I: pl.I, C: pl.C || pl.R.map(() => ["", ""]) };
    const have = own(home);
    if (check(pl, { lot: lotOf(home), own: have }).length) return false;
    const n = countIn(pl), Pk = home.world.perabot || (home.world.perabot = P.fresh());
    const G = {};
    for (const id of Object.keys(have)) { const left = have[id] - (n[id] || 0); if (left > 0) G[id] = left; }
    Pk.gudang = G;
    home.world.denah = pl;
    return true;
  }
  const encode = pl => PREFIX + JSON.stringify({ v: 1, R: pl.R, D: pl.D, N: pl.N, I: pl.I, C: pl.C });

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
    const xs = inRoom(pl, ri), [, , , w, d] = pl.R[ri];
    let v = 0, n = 0;
    for (const x of xs) { if (x.def) continue; v += x.hias + P.likes(c, x); if (x.slot === "dinding" || x.slot === "lantai" || x.slot === "sudut") n++; }
    const T = c ? P.taste(c) : {};
    if (n >= Math.max(3, Math.ceil(w * d / 10)) && (T.rapi || 0) > 0) v -= 2;
    return Math.max(0, Math.min(10, v));
  }
  // ruangan tempat rawat jenis t buat makhluk ini: yang paling enak (perabot fungsi + suasana), seri = yang lebih dulu
  function careRoom(pl, c, t, when) {
    let bi = -1, bv = -1;
    pl.R.forEach((r, i) => {
      if (r[0] !== t) return;
      const v = best(inRoom(pl, i), t, when).reduce((s, x) => s + fxVal(x.fx), 0) + P.moodOf(ambienceOf(pl, c, i));
      if (v > bv) { bv = v; bi = i; }
    });
    return bi;
  }
  function onCare(home, c, x, care, day) {
    const pl = home.world.denah, t = { makan_p: "makan", makan_m: "makan", mandi: "mandi", tidur: "tidur", peluk: "peluk" }[care];
    if (!pl || !t) return null;
    const when = care === "makan_p" ? "pagi" : care === "makan_m" ? "malam" : null;
    const D = c.info.perabot || (c.info.perabot = { d: null, r: [], lihat: [] });
    if (D.d !== day) { D.d = day; D.r = []; }
    if (D.r.includes(t)) return null;
    D.r.push(t);
    const ri = careRoom(pl, c, t, when); if (ri < 0) return null;
    const xs = inRoom(pl, ri);
    for (const it of best(xs, t, when)) {
      const f = it.fx;
      if (f.mood) x.need("mood", f.mood);
      if (f.kes) x.stat("kesehatan", f.kes);
      if (f.bond) c.bond = Math.min(100, c.bond + f.bond * (1 - c.bond / 100));
      if (f.skill && c.st && c.st.skills && f.skill.k in c.st.skills) c.st.skills[f.skill.k] = Math.min(100, c.st.skills[f.skill.k] + f.skill.n);
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

  // ---------------------------------------------------------------- bantuan editor
  // tempat kosong pertama buat barang di ruangan ri (dicoba semua arah); null kalau nggak ada
  function findSpot(pl, id, ri, lot, pref) {
    const [, rx, rz, w, d] = pl.R[ri], k = pl.I.length;
    const tryAt = (x, z, r) => { pl.I.push([id, x, z, r]); const ok = fitsAt(pl, k, lot); pl.I.pop(); return ok; };
    if (pref && tryAt(...pref)) return pref;
    for (const r of [0, 1, 3, 2]) for (let z = rz; z < rz + d; z++) for (let x = rx; x < rx + w; x++) if (tryAt(x, z, r)) return [x, z, r];
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

  const API = { CELL, TYPES, TYPE_NAME, LOT, FP, PREFIX, meta, isMain, okType, ek, parseEdge, sidesOf, roomAt, dims, cellsOf, wallEdges,
    lotOf, defaultPlan, plan, saved, own, countIn, shape, names, fitsAt, isWallOf, doorCellSet, check, act, encode,
    fxVal, inRoom, best, ambienceOf, careRoom, onCare, findSpot, findRoomSpot, clone };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Denah = API;
})();

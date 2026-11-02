// Kota (v73): peta kota buat dijelajah dari bird view, rute jalan kaki, dan kehidupan harian warga.
// Murni (tanpa three.js) biar bisa dites dari Node. town.js yang gambar, file ini yang mutusin apa ada di mana dan siapa lagi ngapain.
//
// Tata letak: Main Street (x = 0) tetap jadi tulang punggung, lima lingkungan berderet ke selatan (z negatif) kayak dulu.
// Di sekitarnya sekarang ada kota: dua avenue sejajar, jalan silang di batas lingkungan, rel di barat, sungai di timur
// (semua jalan silang punya jembatan), dan jalan, rel, sungai nerus keluar peta. Tempat yang punya nama (sekolah, kantor,
// taman, stasiun, Bazaar) posisinya tetap dan sama buat semua pemain.
//
// Kehidupan kota dihitung dari benih + hari + jam asli (games-arah §12): warga punya jadwal harian (berangkat kerja,
// sekolah, makan siang, sore di taman, malam pulang), jadi kota yang sama kelihatan sama di semua HP pada jam yang sama.
// Makhluk pemain ikut aturan yang sama, jadwalnya dari fase, sekolah pilihan, kerja, dan agenda hari ini.
"use strict";
(function () {
  const HOODS = [
    { id: "rented", name: "Old Town", lot: 2.3, per: 4, ground: 0xcdbfae, kind: "apartment" },
    { id: "flat", name: "Suburb", lot: 2.3, per: 4, ground: 0xb3b897, kind: "flat" },
    { id: "house", name: "Downtown", lot: 3.3, per: 3, ground: 0xa6b18d, kind: "house" },
    { id: "villa", name: "Hillside", lot: 4.4, per: 2, ground: 0x9cad86, kind: "villa" },
    { id: "mansion", name: "Royal Heights", lot: 5.6, per: 2, ground: 0x93a77f, kind: "mansion" },
  ];
  const ROAD_W = 2, WALK = 0.9, GAP = 2.4, PLAZA = 15;
  // batas tiap lingkungan di sepanjang Main Street (sama persis dengan yang dipakai town.js buat kavling)
  const BANDS = (() => { let z = 0; return HOODS.map(H => { const len = H.per * H.lot + GAP, b = { id: H.id, name: H.name, z0: z, z1: z - len, zc: z - len / 2 }; z -= len; return b; }); })();
  const ZMIN = BANDS[BANDS.length - 1].z1;
  const STRIP = 10.2;   // setengah lebar deretan kavling Main Street: blok kota mulai di luar ini

  // ---------------------------------------------------------------- jalan, rel, sungai
  const r1 = v => Math.round(v * 10) / 10;
  const STREETS = [
    { id: "main", name: "Main Street", v: true, at: 0 },
    { id: "west", name: "West Avenue", v: true, at: -22 },
    { id: "east", name: "East Avenue", v: true, at: 22 },
    { id: "river", name: "Riverside Road", v: true, at: 51 },
    { id: "north", name: "North Road", v: false, at: PLAZA },
    { id: "station", name: "Station Road", v: false, at: 0 },
    { id: "market", name: "Market Street", v: false, at: r1(BANDS[1].z1) },
    { id: "hill", name: "Hill Road", v: false, at: r1(BANDS[3].z1) },
    { id: "crown", name: "Crown Road", v: false, at: r1(ZMIN) },
  ];
  const VX = STREETS.filter(s => s.v).map(s => s.at), HZ = STREETS.filter(s => !s.v).map(s => s.at);
  const RIVER = { x0: 38, x1: 46 };            // sungai lurus utara–selatan, jembatan di tiap jalan silang
  const RAIL = { x: -40 };                      // rel utara–selatan, perlintasan di tiap jalan silang
  const REACH = 420;                            // jalan, rel, sungai digambar sampai sini: lewat kabut, kesannya nerus
  const BOUNDS = { x0: -70, x1: 78, z0: -100, z1: 48 };   // kamera boleh geser sampai sini

  // ---------------------------------------------------------------- tempat yang punya nama
  // out: ada yang nongkrong di luar (bangku taman, peron, halaman); spot = titik kumpul di luar, door = pintu di trotoar
  const PLACES = [
    { id: "station", name: "Old Town Station", kind: "station", x: -32, z: 6, w: 9, d: 5, h: 3.2, out: true, spot: { x: -37.6, z: 6 }, about: "Trains north and south every few minutes. The line runs off the map both ways." },
    { id: "bazaar", name: "Bazaar", kind: "market", x: -30, z: -11, w: 11, d: 8, h: 3, out: true, spot: { x: -26.2, z: -11 }, about: "The covered market. Stalls out front from morning till evening." },
    { id: "tower1", name: "Commerce Tower", kind: "office", x: -16, z: -6, w: 7, d: 7, h: 13, about: "Offices. Most of Old Town's desk jobs are in the three towers on this side of town." },
    { id: "tower2", name: "Harbor Point", kind: "office", x: -16, z: -33, w: 7, d: 6, h: 10, about: "Offices, a lobby café, a lot of lanyards." },
    { id: "tower3", name: "The Exchange", kind: "office", x: -16, z: -52, w: 7, d: 6, h: 15, about: "The tallest building in town. Banks and the bigger companies." },
    { id: "primary", name: "Old Town Primary", kind: "school", x: 15.5, z: -7, w: 9, d: 8, h: 3.4, out: true, spot: { x: 18.4, z: -7 }, school: "dekat", about: "The school round the corner. The neighbours' kids go here." },
    { id: "middle", name: "Hillside Middle School", kind: "school", x: 15.5, z: -38, w: 9, d: 9, h: 4, out: true, spot: { x: 18.4, z: -38 }, school: "smp", about: "Middle school, up the hill. Every creature goes here from day 180." },
    { id: "arts", name: "Hillside Arts & Sport", kind: "school", x: -30, z: -38, w: 9, d: 8, h: 3.6, track: { x: -30, z: -30, w: 12.4, d: 7.6 }, out: true, spot: { x: -27.2, z: -38 }, school: "seni", about: "A studio and a running track at the top of the hill." },
    { id: "academy", name: "Riverside Academy", kind: "school", x: 61, z: -12, w: 11, d: 9, h: 4.4, out: true, spot: { x: 57.6, z: -12 }, school: "favorit", about: "Across the bridge, the long way round. The best report cards in town." },
    { id: "park", name: "Riverside Park", kind: "park", x: 30, z: -31, w: 12, d: 26, h: 0, out: true, spot: { x: 30, z: -31 }, about: "Lawns down to the river, a pond and benches. Busy after school. (The playground park on the square opens when the town grows.)" },
    { id: "square", name: "Town Square", kind: "square", x: -4, z: 5.4, w: 4, d: 6, h: 0, out: true, spot: { x: -4.2, z: 8.6 }, about: "The clock tower. Where everyone meets." },
  ];
  // Kafe, gym, taman bermain, dan sekolah di Town Square tetap dibuka lewat jumlah rumah (Town.CIVIC); di sini cuma tempat yang sudah ada dari awal.
  const PLACE = Object.fromEntries(PLACES.map(p => [p.id, p]));
  const SCHOOL_OF = { dekat: "primary", seni: "arts", favorit: "academy", smp: "middle" };
  const TOWERS = ["tower1", "tower2", "tower3"];

  // pintu = titik di trotoar paling dekat dari bangunan
  const sidewalk = ROAD_W / 2 + WALK * 0.5;
  function doorOf(p) {
    if (p.door) return p.door;
    let best = null;
    for (const x of VX) { const d = Math.abs(p.x - x) - p.w / 2; if (Math.abs(p.z) < 400 && (!best || d < best.d)) best = { d, x: x + Math.sign(p.x - x || 1) * sidewalk, z: p.z }; }
    for (const z of HZ) { const d = Math.abs(p.z - z) - p.d / 2; if (!best || d < best.d) best = { d, x: p.x, z: z + Math.sign(p.z - z || 1) * sidewalk }; }
    p.door = { x: best.x, z: best.z }; return p.door;
  }
  // stasiun pintunya di Station Road, Bazaar di West Avenue: di sini pintu terdekat sudah benar semua

  // ---------------------------------------------------------------- acak yang bisa diulang
  const rng = seed => { let s = 2166136261; for (const ch of String(seed)) s = Math.imul(s ^ ch.charCodeAt(0), 16777619) >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];

  // ---------------------------------------------------------------- bangunan pengisi (sama buat semua pemain)
  // blok di antara jalan; tiap blok punya rasa sendiri: menara kantor di barat dalam, gudang dekat rel, rumah di timur,
  // rumah seberang sungai, dan pinggiran yang makin jarang.
  const XS = [-90, RAIL.x, -22, -STRIP, 0, STRIP, 22, RIVER.x0, RIVER.x1, 51, 96];
  const ZS = [52, PLAZA, 0, r1(BANDS[1].z1), r1(BANDS[3].z1), r1(ZMIN), -104];
  function flavour(x0, x1, zc) {
    const xc = (x0 + x1) / 2;
    if (xc < RAIL.x) return { kind: "home", fill: 0.42, h: [1.4, 2.4], size: [2.4, 3.4] };
    if (xc < -22) return { kind: "shed", fill: 0.75, h: [1.8, 3], size: [4, 6.5] };
    if (xc < 0) return zc > PLAZA || zc < ZMIN ? { kind: "home", fill: 0.6, h: [1.6, 2.6], size: [2.6, 3.6] } : { kind: "tower", fill: 0.85, h: [4, 9], size: [3.4, 4.6] };
    if (xc < 22) return { kind: "shop", fill: 0.8, h: [1.8, 3.4], size: [2.8, 3.8] };
    if (xc < RIVER.x0) return { kind: "home", fill: 0.7, h: [1.6, 2.6], size: [2.6, 3.4] };
    if (xc < 51) return null;   // sungai
    return { kind: "home", fill: 0.5, h: [1.5, 2.5], size: [2.6, 3.6] };
  }
  let _fill = null;
  function fillers() {
    if (_fill) return _fill;
    const r = rng("kota-isi"), out = [], trees = [];
    const clear = (x, z, w, d) => {
      for (const p of PLACES) for (const q of p.track ? [p, p.track] : [p]) if (Math.abs(x - q.x) < (w + q.w) / 2 + 1 && Math.abs(z - q.z) < (d + q.d) / 2 + 1) return false;
      if (Math.abs(x) < STRIP && z < PLAZA + 1 && z > ZMIN - 1) return false;
      if (x + w / 2 > RIVER.x0 - 1 && x - w / 2 < RIVER.x1 + 1) return false;
      if (Math.abs(x - RAIL.x) < w / 2 + 2) return false;
      return true;
    };
    const m = ROAD_W / 2 + WALK + 0.5;
    for (let i = 0; i < XS.length - 1; i++) for (let j = 0; j < ZS.length - 1; j++) {
      const x0 = XS[i] + m, x1 = XS[i + 1] - m, z1 = ZS[j] - m, z0 = ZS[j + 1] + m;   // z turun ke selatan
      if (x1 - x0 < 3 || z1 - z0 < 3) continue;
      const F = flavour(XS[i], XS[i + 1], (z0 + z1) / 2); if (!F) continue;
      const far = Math.max(0, Math.hypot((x0 + x1) / 2, (z0 + z1) / 2 + 20) - 60) / 50;   // pinggiran makin jarang
      for (let z = z1; z > z0 + 1.5;) {
        const d = F.size[0] + r() * (F.size[1] - F.size[0]);
        if (z - d < z0) break;
        for (let x = x0; x < x1 - 1.5;) {
          const w = F.size[0] + r() * (F.size[1] - F.size[0]);
          if (x + w > x1) break;
          const cx = x + w / 2, cz = z - d / 2;
          const edge = cx - x0 < 6 || x1 - cx < 6 || z1 - cz < 6 || cz - z0 < 6;   // bangunan ngadep jalan, tengah blok halaman
          if (r() < F.fill * (edge ? 1 : 0.35) * Math.max(0.25, 1 - far) && clear(cx, cz, w, d)) {
            const h = F.h[0] + r() * (F.h[1] - F.h[0]) * (F.kind === "tower" ? Math.max(0.4, 1 - Math.abs(cz + 25) / 60) : 1);
            out.push({ x: r1(cx), z: r1(cz), w: r1(w - 0.5), d: r1(d - 0.5), h: r1(h), kind: F.kind, tint: Math.floor(r() * 6) });
          } else if (r() < 0.5 && clear(cx, cz, 1, 1)) trees.push({ x: r1(cx + (r() - 0.5) * w * 0.6), z: r1(cz + (r() - 0.5) * d * 0.6), s: r1(0.8 + r() * 0.7) });
          x += w + 0.4;
        }
        z -= d + 0.4;
      }
    }
    // taman: pohon di pinggir, kolam di tengah (kolamnya digambar town.js)
    const P = PLACE.park, rp = rng("taman");
    for (let k = 0; k < 26; k++) { const a = k / 26 * Math.PI * 2; trees.push({ x: r1(P.x + Math.cos(a) * (P.w / 2 - 0.9) * (0.8 + rp() * 0.2)), z: r1(P.z + Math.sin(a) * (P.d / 2 - 1) * (0.85 + rp() * 0.15)), s: r1(1 + rp() * 0.6) }); }
    // tepi sungai dan hutan di luar kota
    for (let z = 46; z > -100; z -= 3.2) for (const x of [RIVER.x0 - 0.9, RIVER.x1 + 0.9]) if (rp() < 0.55 && !HZ.some(h => Math.abs(h - z) < 2.2)) trees.push({ x: r1(x), z: r1(z), s: r1(0.9 + rp() * 0.5) });
    for (let k = 0; k < 340; k++) {
      const a = rp() * Math.PI * 2, rr = 105 + rp() * 120, x = r1(4 + Math.cos(a) * rr * 1.1), z = r1(-26 + Math.sin(a) * rr);
      if (x > RIVER.x0 - 2 && x < RIVER.x1 + 2) continue;
      if (Math.abs(x - RAIL.x) < 3 || VX.some(v => Math.abs(v - x) < 2.4) || HZ.some(h => Math.abs(h - z) < 2.4)) continue;
      trees.push({ x, z, s: r1(1.2 + rp() * 1.2) });
    }
    _fill = { buildings: out, trees };
    return _fill;
  }

  // ---------------------------------------------------------------- rute: jalan kaki lewat trotoar, belok di persimpangan
  function snap(p) {
    let best = null;
    for (const x of VX) { const d = Math.abs(p.x - x); if (!best || d < best.d) best = { d, x, z: p.z, v: true }; }
    for (const z of HZ) { const d = Math.abs(p.z - z); if (d < best.d) best = { d, x: p.x, z, v: false }; }
    return best;
  }
  function bestVia(lines, a, b) { let m = null; for (const l of lines) { const c = Math.abs(a - l) + Math.abs(b - l); if (!m || c < m.c) m = { l, c }; } return m.l; }
  // titik-titik jalan dari pintu a ke pintu b; side = trotoar kiri/kanan (-1/1) biar orang nggak jalan di tengah jalan
  function route(a, b, side = 1) {
    const A = snap(a), B = snap(b), mid = [{ x: A.x, z: A.z }];
    if (A.v && B.v) { if (A.x !== B.x) { const z = bestVia(HZ, A.z, B.z); mid.push({ x: A.x, z }, { x: B.x, z }); } }
    else if (!A.v && !B.v) { if (A.z !== B.z) { const x = bestVia(VX, A.x, B.x); mid.push({ x, z: A.z }, { x, z: B.z }); } }
    else if (A.v) mid.push({ x: A.x, z: B.z }); else mid.push({ x: B.x, z: A.z });
    mid.push({ x: B.x, z: B.z });
    const off = sidewalk * side;
    const pts = [{ x: a.x, z: a.z }];
    for (const p of mid) pts.push({ x: VX.includes(p.x) ? p.x + off : p.x, z: HZ.includes(p.z) ? p.z + off : p.z });
    pts.push({ x: b.x, z: b.z });
    // buang titik kembar
    return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z) > 0.01);
  }
  const pathLen = pts => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); return s; };
  function along(pts, dist) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.z - a.z);
      if (dist <= l || i === pts.length - 1) { const k = l ? Math.min(1, dist / l) : 1; return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, dir: Math.atan2(b.x - a.x, b.z - a.z) }; }
      dist -= l;
    }
    return { x: pts[0].x, z: pts[0].z, dir: 0 };
  }

  // ---------------------------------------------------------------- warga
  const WALK_SPEED = 1.15;           // unit per detik nyata
  const H = h => Math.round(h * 3600);  // jam → detik dalam sehari
  const KINDS = [["worker", 0.42], ["student", 0.2], ["retiree", 0.16], ["shop", 0.1], ["owl", 0.12]];
  let _people = null;
  function people(n = 120) {
    if (_people && _people.length === n) return _people;
    const r = rng("warga"), homes = fillers().buildings.filter(b => b.kind === "home");
    _people = Array.from({ length: n }, (_, i) => {
      let x = r(), kind = "worker"; for (const [k, w] of KINDS) { if ((x -= w) < 0) { kind = k; break; } }
      const hb = homes[Math.floor(r() * homes.length)];
      return { id: i, kind, home: doorOf({ x: hb.x, z: hb.z, w: hb.w, d: hb.d }), tower: pick(r, TOWERS), school: pick(r, ["primary", "primary", "middle", "arts", "academy"]), side: r() < 0.5 ? -1 : 1, tint: Math.floor(r() * 6) };
    });
    return _people;
  }
  // jadwal sehari satu warga: daftar singgah { at, from, to, mode } (mode: in = di dalam, out = nongkrong di luar, stroll = mondar-mandir)
  function plan(p, day, dow) {
    const r = rng(`hari${day}:${p.id}`), weekend = dow === 0 || dow === 6, S = [];
    const stay = (at, from, to, mode = "in") => { if (to > from) S.push({ at, from: H(from), to: H(to), mode }); };
    const j = s => (r() - 0.5) * s;       // geser sedikit biar nggak semua berangkat di menit yang sama
    if (weekend) {
      const am = pick(r, ["park", "square", "bazaar", "bazaar", "home", "home"]), pm = pick(r, ["park", "park", "square", "bazaar", "home"]);
      if (am !== "home") stay(am, 9.5 + j(1.5), 12 + j(1), am === "bazaar" ? "stroll" : "out");
      if (pm !== "home") stay(pm, 15 + j(1.5), 18 + j(1), pm === "bazaar" ? "stroll" : "out");
      if (r() < 0.25) stay("square", 19 + j(0.5), 21 + j(0.6), "out");
    } else if (p.kind === "worker") {
      const s = 8.3 + j(1.2), e = 17.2 + j(1.2);
      if (r() < 0.4) { stay(p.tower, s, 12 + j(0.3)); stay(p.tower, 12.2 + j(0.2), 12.9 + j(0.2), "stroll"); stay(p.tower, 13, e); }
      else stay(p.tower, s, e);
      const ev = r(); if (ev < 0.22) stay("park", e + 0.6, e + 2 + j(0.5), "out"); else if (ev < 0.4) stay("square", 19 + j(0.6), 21 + j(0.6), "out");
    } else if (p.kind === "student") {
      const se = p.school === "middle" ? 14.5 : 14;
      stay(p.school, 7.7 + j(0.4), 8, "out"); stay(p.school, 8, se + j(0.3));
      const ev = r(); if (ev < 0.45) stay("park", se + 0.6, 17.5 + j(1), "out"); else if (ev < 0.65) stay("square", se + 0.8, 17 + j(1), "out");
    } else if (p.kind === "retiree") {
      if (r() < 0.75) stay("park", 8 + j(1), 10.5 + j(0.8), r() < 0.5 ? "out" : "stroll");
      if (r() < 0.6) stay("bazaar", 11 + j(0.6), 12.4 + j(0.4), "stroll");
      if (r() < 0.5) stay("square", 15 + j(1), 17 + j(0.8), "out");
    } else if (p.kind === "shop") {
      stay("bazaar", 8 + j(0.5), 13 + j(0.5), "out"); stay("bazaar", 13.5, 18 + j(0.6), r() < 0.5 ? "out" : "in");
    } else {   // owl: bangun siang, keluar malam
      stay("bazaar", 11 + j(1), 13.5 + j(0.8)); if (r() < 0.6) stay("bazaar", 14 + j(0.6), 15.5 + j(0.6), "stroll");
      stay(pick(r, ["square", "station", "park"]), 20 + j(1), 23 + j(0.8), "out");
    }
    return S;
  }
  // garis waktu: singgah + perjalanan di antaranya. Perjalanan mulai pas singgah sebelumnya selesai; singgah berikutnya nunggu orangnya sampai.
  function timeline(S, home, side, placeOf = id => PLACE[id]) {
    const T = []; let at = "home", pos = home, t = 0;
    const doorAt = id => id === "home" ? home : doorOf(placeOf(id));
    const go = (id, start) => {
      const to = doorAt(id); if (at === id) return start;
      const pts = route(pos, to, side), dur = Math.max(4, pathLen(pts) / WALK_SPEED);
      T.push({ mode: "walk", from: start, to: start + dur, pts, dest: id, origin: at });
      at = id; pos = to; return start + dur;
    };
    for (const s of S) {
      // jeda panjang: pulang dulu. Jeda pendek: langsung ke tempat berikutnya dan nunggu di sana.
      if (at !== "home" && s.at !== at && s.from > t + H(1.5)) t = go("home", t);
      if (at === "home" && s.from > t) { T.push({ mode: "home", at: "home", from: t, to: s.from }); t = s.from; }
      t = go(s.at, t);
      if (s.to > t) { T.push({ mode: s.mode, at: s.at, from: t, to: s.to }); t = s.to; }
    }
    if (at !== "home") t = go("home", t);
    T.push({ mode: "home", at: "home", from: t, to: H(24) + 1 });
    return T;
  }
  const seg = (T, sec) => T.find(s => sec >= s.from && sec < s.to) || T[T.length - 1];
  // di mana orangnya sekarang: { x, z, dir, show, at, mode }. show = kelihatan di jalan (jalan kaki, nongkrong, mondar-mandir)
  function locate(T, sec, wobble = 0) {
    const s = seg(T, sec);
    if (s.mode === "walk") { const q = along(s.pts, (sec - s.from) * WALK_SPEED); return { x: q.x, z: q.z, dir: q.dir, show: true, at: s.dest, mode: "walk", s }; }
    if (s.mode === "home" || s.mode === "in") return { show: false, at: s.at, mode: s.mode, s };
    const P = PLACE[s.at], sp = P.spot || doorOf(P);
    if (s.mode === "out") {
      const ang = wobble * 6.283, rad = P.kind === "park" ? 2.5 + (wobble * 97 % 1) * 3.5 : 0.8 + (wobble * 31 % 1) * 1.6;
      const sway = Math.sin(sec / 40 + wobble * 20) * 0.25;
      return { x: sp.x + Math.cos(ang) * rad + sway, z: sp.z + Math.sin(ang) * rad, dir: ang + Math.PI + Math.sin(sec / 9 + wobble * 50) * 0.6, show: true, at: s.at, mode: "out", s };
    }
    // stroll: bolak-balik di trotoar depan tempatnya
    const d = doorOf(P), A = snap(d), L = 9, ph = ((sec - s.from) * WALK_SPEED * 0.6 / L + wobble) % 2, k = ph < 1 ? ph : 2 - ph;
    const off = (k - 0.5) * L, dirSign = ph < 1 ? 1 : -1;
    return A.v ? { x: d.x, z: d.z + off, dir: dirSign > 0 ? 0 : Math.PI, show: true, at: s.at, mode: "stroll", s }
      : { x: d.x + off, z: d.z, dir: dirSign > 0 ? Math.PI / 2 : -Math.PI / 2, show: true, at: s.at, mode: "stroll", s };
  }

  // ---------------------------------------------------------------- makhluk pemain: jadwal dari fase, sekolah, kerja, agenda hari ini
  // o = { fase, umur, dow, agenda, school, job: { co } | null, libur, studyTour, sambilan, away }
  function creaturePlan(o, day) {
    if (!o || !o.fase || o.fase === "meninggal") return null;
    if (o.fase === "merantau" || o.away) return { away: o.away || "Moved away" };
    if (o.studyTour) return { away: "On the study tour" };
    const S = [], r = rng(`makhluk${day}`), weekend = o.dow === 0 || o.dow === 6, a = o.agenda || "";
    const stay = (at, from, to, mode = "in", doing = "") => S.push({ at, from: H(from), to: H(to), mode, doing });
    const play = (am) => {   // jam main di luar dari agenda
      if (a === "teman" || a === "main" || a === "bebas" || a === "hobi") stay(a === "bebas" ? "square" : "park", am ? 10 : 15.5, am ? 12 : 17.5, "out", a === "teman" ? "Playing with friends" : "Out playing");
      else if (a === "olahraga") stay("park", am ? 9 : 16, am ? 10 : 17, "stroll", "Running laps");
      else if (a === "jalan") stay("park", 10, 11.5, "stroll", "On a stroll with the family");
      else if (a === "sosial") stay("square", 19, 21, "out", "Meeting people");
      else if (a === "pasangan") stay("park", 19, 20.5, "stroll", "A walk with their partner");
      else if (a === "jalan_pagi") stay("park", 7.5, 9, "stroll", "Morning walk");
      else if (a === "cucu" || a === "keluarga") stay("park", 15, 17, "out", "At the park with the little ones");
    };
    if (o.fase === "bayi") play(true);
    else if (o.fase === "anak" || o.fase === "remaja") {
      const teen = o.fase === "remaja", sid = teen ? "middle" : SCHOOL_OF[o.school] || "primary";
      const lessons = !weekend && !o.libur && !(teen && o.umur >= 265);
      if (lessons) {
        stay(sid, teen ? 7.75 : 7.7, 8, "out", "Before the bell");
        stay(sid, 8, teen ? 14.5 : 14, "in", "In class");
        if (a === "kerja_sambilan" && o.sambilan) stay("bazaar", 15.5, 19, "out", "Part-time shift at a stall");
        else if (teen && a === "teman") stay("square", 15.3, 18.3, "out", "Hanging out with friends");
        else play(false);
      } else { play(true); if (a === "teman" || a === "bebas") play(false); }
    } else if (o.fase === "dewasa") {
      if (o.job && !weekend) {
        const tw = o.job.tower || TOWERS[Math.abs([...String(o.job.co || "x")].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 3];
        const late = a === "kerja_keras" ? 19 : 17;
        stay(tw, 9, 12.2, "in", "At work"); stay(tw, 12.2, 12.9, "stroll", "Lunch break"); stay(tw, 12.9, late, "in", a === "kerja_keras" ? "Working late" : "At work");
        if (a === "olahraga") stay("park", late + 0.5, late + 1.5, "stroll", "Evening run");
        else if (a !== "kerja_keras") play(false);
      } else if (a === "cari_kerja") { stay("tower1", 10, 11.5, "in", "Job interview"); stay("bazaar", 12, 13, "stroll", "Lunch from the stalls"); }
      else if (a === "olahraga") stay("park", 10, 11, "stroll", "Running laps");
      else { play(true); if (weekend) stay("bazaar", 15, 16.5, "stroll", "Browsing the stalls"); }
    } else if (o.fase === "tua") {
      play(true); if (r() < 0.5) stay("bazaar", 12, 13, "stroll", "Lunch from the stalls");
      if (a === "cucu") play(false);
    }
    S.sort((x, y) => x.from - y.from);
    return { S };
  }
  // posisi dan kalimat makhluk sekarang. home = pintu rumahnya (dari town.js), sec = detik dalam hari
  function creatureNow(o, day, sec, home) {
    const P = creaturePlan(o, day);
    if (!P) return null;
    if (P.away) return { away: true, show: false, at: null, mode: "away", line: P.away };
    const T = timeline(P.S, home, 1);
    const L = locate(T, sec, 0.37);
    const st = P.S.find(s => s.at === L.at && sec >= s.from - 1 && sec < s.to + 1);
    const nm = id => id === "home" ? "home" : PLACE[id].name;
    const asleep = sec < H(7) || sec >= H(21.5);
    L.line = L.mode === "walk" ? (L.at === "home" ? "Walking home" : `On the way to ${nm(L.at)}`)
      : L.mode === "home" ? (asleep ? "Asleep at home" : "At home")
        : `${(st && st.doing) || "At"}${st && st.doing ? " · " : " "}${nm(L.at)}`;
    L.T = T; L.plan = P.S;
    return L;
  }

  // ---------------------------------------------------------------- kereta: tiap 4 menit nyata, berhenti 12 detik di stasiun
  const TRAIN = { every: 240, run: 36, stop: 12 };
  function trainAt(sec) {
    const ph = sec % TRAIN.every, south = Math.floor(sec / TRAIN.every) % 2 === 0;
    if (ph > TRAIN.run + TRAIN.stop) return null;
    const half = TRAIN.run / 2, st = PLACE.station.z;
    let z;   // jarak 260 ditempuh: pelan masuk stasiun, berhenti, lalu jalan lagi
    if (ph < half) { const k = ph / half; z = 130 - (130 - st) * (1 - (1 - k) * (1 - k)); }
    else if (ph < half + TRAIN.stop) z = st;
    else { const k = (ph - half - TRAIN.stop) / half; z = st - 130 * k * k; }
    if (!south) z = 2 * st - z;
    return { z, dir: south ? -1 : 1, stopped: ph >= half && ph < half + TRAIN.stop };
  }

  // berapa warga ada di tiap tempat sekarang (buat lembar info tempat)
  function crowd(day, dow, sec, n) {
    const c = {};
    for (const p of people(n)) { const s = seg(timeline(plan(p, day, dow), p.home, p.side), sec); if (s.mode !== "walk" && s.at !== "home") c[s.at] = (c[s.at] || 0) + 1; }
    return c;
  }

  const API = { HOODS, BANDS, ZMIN, PLAZA, ROAD_W, WALK, GAP, STRIP, STREETS, VX, HZ, RIVER, RAIL, REACH, BOUNDS, PLACES, PLACE, SCHOOL_OF, TOWERS,
    WALK_SPEED, TRAIN, doorOf, fillers, snap, route, pathLen, along, rng, people, plan, timeline, seg, locate, creaturePlan, creatureNow, trainAt, crowd, H };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Kota = API;
})();

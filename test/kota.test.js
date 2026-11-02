// Peta kota dan kehidupan harian (kota.js) + bumi fiksi (bumi.js): tata letak, rute, jadwal warga, jadwal makhluk, kereta, benua.
const test = require("node:test");
const assert = require("node:assert/strict");
const K = require("../kota.js");
const B = require("../bumi.js");
const H = h => h * 3600;

test("tata letak: lingkungan sama dengan Main Street lama, tempat bernama nggak numpuk dan nggak di sungai/rel", () => {
  assert.deepEqual(K.HOODS.map(h => h.id), ["rented", "flat", "house", "villa", "mansion"]);
  assert.ok(Math.abs(K.ZMIN - -60.3) < 0.01, `ZMIN ${K.ZMIN}`);
  for (const a of K.PLACES) {
    assert.ok(a.x + a.w / 2 < K.RIVER.x0 || a.x - a.w / 2 > K.RIVER.x1, `${a.id} di sungai`);
    if (a.kind !== "square") assert.ok(Math.abs(a.x) - a.w / 2 > K.STRIP - 0.5, `${a.id} di deretan kavling Main Street`);
    for (const b of K.PLACES) if (a !== b) assert.ok(Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.z - b.z) >= (a.d + b.d) / 2, `${a.id} numpuk ${b.id}`);
  }
  // tiga sekolah pilihan anak.js + SMP remaja.js ada semua
  for (const s of ["dekat", "seni", "favorit", "smp"]) assert.ok(K.PLACE[K.SCHOOL_OF[s]], s);
});

test("bangunan pengisi: sama buat semua (benih tetap), nggak di jalan, sungai, atau rel", () => {
  const F = K.fillers();
  assert.ok(F.buildings.length > 150, `cuma ${F.buildings.length} bangunan`);
  for (const b of F.buildings) {
    for (const x of K.VX) assert.ok(Math.abs(b.x - x) >= b.w / 2 + K.ROAD_W / 2, `bangunan di ${b.x},${b.z} kena jalan x=${x}`);
    for (const z of K.HZ) assert.ok(Math.abs(b.z - z) >= b.d / 2 + K.ROAD_W / 2, `bangunan di ${b.x},${b.z} kena jalan z=${z}`);
    assert.ok(b.x + b.w / 2 < K.RIVER.x0 || b.x - b.w / 2 > K.RIVER.x1);
    assert.ok(Math.abs(b.x - K.RAIL.x) > b.w / 2 + 1);
  }
  assert.ok(F.buildings.some(b => b.kind === "home") && F.buildings.some(b => b.kind === "tower"));
});

test("rute: lewat jalan (tiap belokan siku), mulai dan selesai di pintu", () => {
  const a = K.doorOf(K.PLACE.station), b = K.doorOf(K.PLACE.academy);
  const r = K.route(a, b, 1);
  assert.deepEqual(r[0], a); assert.deepEqual(r[r.length - 1], b);
  for (let i = 1; i < r.length; i++) assert.ok(Math.abs(r[i].x - r[i - 1].x) < 1e-6 || Math.abs(r[i].z - r[i - 1].z) < 1e-6, `segmen ${i} miring`);
  const len = K.pathLen(r); assert.ok(len >= Math.abs(a.x - b.x) && len < 200, `panjang ${len}`);
  const mid = K.along(r, len / 2); assert.ok(Number.isFinite(mid.x) && Number.isFinite(mid.z));
});

test("warga: jadwal dari benih + hari (sama di semua HP), malam sepi, sore ramai", () => {
  const P = K.people();
  assert.equal(P.length, 120);
  const plan1 = JSON.stringify(K.plan(P[5], 20000, 2)), plan2 = JSON.stringify(K.plan(P[5], 20000, 2));
  assert.equal(plan1, plan2);
  const out = (sec, dow) => P.filter(p => K.locate(K.timeline(K.plan(p, 20000, dow), p.home, p.side), sec, 0.3).show).length;
  const night = out(H(3), 2), afternoon = out(H(16), 2), weekend = out(H(10.5), 6);
  assert.ok(night <= 3, `jam 3 pagi ${night} orang di luar`);
  assert.ok(afternoon >= 20, `jam 4 sore cuma ${afternoon}`);
  assert.ok(weekend >= 20, `Sabtu pagi cuma ${weekend}`);
  // jam kerja: kantor ada isinya
  const c = K.crowd(20000, 2, H(11));
  assert.ok((c.tower1 || 0) + (c.tower2 || 0) + (c.tower3 || 0) >= 20, JSON.stringify(c));
});

test("garis waktu: urut, nyambung, dan nutup hari di rumah", () => {
  for (const p of K.people().slice(0, 40)) for (const dow of [1, 6]) {
    const T = K.timeline(K.plan(p, 20001, dow), p.home, p.side);
    for (let i = 1; i < T.length; i++) assert.ok(T[i].from >= T[i - 1].to - 1e-6, `orang ${p.id} loncat mundur`);
    assert.equal(T[T.length - 1].mode, "home");
    assert.ok(T[T.length - 1].to > H(24));
  }
});

test("makhluk: anak di sekolah pilihannya, sore di taman kalau main sama teman, malam tidur", () => {
  const home = { x: 1.45, z: -4 };
  const kid = { fase: "anak", umur: 75, dow: 2, agenda: "teman", school: "favorit" };
  assert.equal(K.creatureNow(kid, 75, H(10), home).at, "academy");
  assert.match(K.creatureNow(kid, 75, H(10), home).line, /Riverside Academy/);
  assert.equal(K.creatureNow(kid, 75, H(16), home).at, "park");
  assert.match(K.creatureNow(kid, 75, H(23), home).line, /Asleep/);
  assert.equal(K.creatureNow({ ...kid, dow: 6 }, 75, H(10), home).at !== "academy", true);   // Sabtu nggak sekolah
  assert.equal(K.creatureNow({ ...kid, libur: true }, 75, H(10), home).at !== "academy", true);
  // perjalanan kelihatan: sebelum bel jalan kaki ke sekolah
  const plan = K.creatureNow(kid, 75, H(9), home).T, walk = plan.find(s => s.mode === "walk" && s.dest === "academy");
  assert.ok(walk, "ada jalan ke sekolah"); assert.equal(K.locate(plan, (walk.from + walk.to) / 2).show, true);
});

test("makhluk: remaja SMP, dewasa kerja di menara, study tour dan merantau = pergi, meninggal = nggak ada", () => {
  const home = { x: -1.45, z: -10 };
  assert.equal(K.creatureNow({ fase: "remaja", umur: 200, dow: 3, agenda: "belajar" }, 200, H(11), home).at, "middle");
  const adult = K.creatureNow({ fase: "dewasa", umur: 400, dow: 3, agenda: "kerja_keras", job: { co: "burrow" } }, 400, H(18), home);
  assert.ok(K.TOWERS.includes(adult.at), adult.at); assert.match(adult.line, /Working late/);
  assert.equal(K.creatureNow({ fase: "remaja", umur: 226, dow: 3, studyTour: true }, 226, H(11), home).away, true);
  assert.equal(K.creatureNow({ fase: "merantau", umur: 300 }, 300, H(11), home).away, true);
  assert.equal(K.creatureNow({ fase: "meninggal" }, 900, H(11), home), null);
  assert.equal(K.creatureNow({ fase: "bayi", umur: 20, dow: 1, agenda: "tidur_siang" }, 20, H(12), home).at, "home");
});

test("kereta: lewat tiap 4 menit, berhenti di stasiun", () => {
  const seen = [], stops = [];
  for (let s = 0; s < 480; s++) { const t = K.trainAt(s); if (t) { seen.push(s); if (t.stopped) stops.push(t.z); } }
  assert.ok(seen.length > 60 && seen.length < 120, `${seen.length} detik kelihatan`);
  assert.ok(stops.length >= 20 && stops.every(z => Math.abs(z - K.PLACE.station.z) < 1e-6));
  assert.equal(K.trainAt(K.TRAIN.every - 1), null);
});

test("bumi: 5 benua, tiap kota di daratan benuanya sendiri, cuma satu kota hidup", () => {
  assert.equal(B.CONTINENTS.length, 5);
  for (const c of B.CITIES) { const L = B.landAt(c.lat, c.lon); assert.ok(L.h > 0.2, c.id); assert.equal(L.cont.id, c.cont, c.id); }
  assert.deepEqual(B.CITIES.filter(c => c.live).map(c => c.id), [B.HOME_CITY]);
  // laut lebih banyak dari darat, tapi daratan cukup kelihatan
  let land = 0, n = 0;
  for (let lat = -80; lat <= 80; lat += 5) for (let lon = -180; lon < 180; lon += 5) { n++; if (B.landAt(lat, lon).h > 0) land++; }
  assert.ok(land / n > 0.15 && land / n < 0.4, `darat ${(land / n).toFixed(2)}`);
  const p = B.toXYZ(0, 90); assert.ok(Math.abs(p.x - 1) < 1e-9 && Math.abs(p.z) < 1e-9);
});

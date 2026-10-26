// Baris "Soon" dan "Someday" (soon.js): tanggal yang sudah ada di simulasi, dari sudut pandang makhluk, pasti vs mungkin.
const test = require("node:test");
const assert = require("node:assert/strict");
const Soon = require("../soon.js");
const { PHASES } = require("../engine.js");

const D = 700;
const mochi = { id: "m1", nama: "Mochi", fase: "dewasa", umur: 400, born: 300, kid: false, info: {}, st: null };
const kiko = { id: "m2", nama: "Kiko", fase: "anak", umur: 100, born: 600, kid: true, info: {}, st: null };
const base = (over = {}) => ({
  d: D, cur: { id: "m1", nama: "Mochi" }, members: [mochi, kiko], moments: [], world: [], drops: [], mag: null, build: null, kindred: [],
  phases: PHASES, prize: () => false, wants: [], cita: null, nameOf: cid => cid === "m1" ? "Mochi" : "Kiko",
  ...over,
});
const only = (S, prefix) => Soon.items(S).filter(i => i.k.startsWith(prefix));

test("rumah tanpa apa-apa: hanya ganti fase dan ulang tahun (dari umur dan born yang sudah ada)", () => {
  const ks = Soon.items(base()).map(i => i.k);
  assert.deepEqual(ks, ["fase:m2", "ultah:m2", "ultah:m1", "fase:m1"]);
});

test("ganti fase: hari dari batas PHASES, kata-kata per fase berikutnya", () => {
  const [f] = only(base(), "fase:m2");
  assert.equal(f.day, D + 80); assert.equal(f.tx, "Kiko becomes a teen in 80 days."); assert.equal(f.sure, true);
  const [g] = only(base(), "fase:m1");
  assert.equal(g.tx, `Mochi becomes an elder in ${PHASES[3][2] - 400} days.`);
  // yang sudah tua tidak punya fase berikutnya
  assert.equal(only(base({ members: [{ ...mochi, umur: 1000 }] }), "fase:").length, 0);
});

test("ulang tahun: born + 365k berikutnya", () => {
  const [u] = only(base(), "ultah:m1");
  assert.equal(u.day, 300 + 2 * 365); assert.equal(u.tx, "Mochi turns 2 in 330 days.");
});

test("ujian: jenis, hitungan malam belajar, belajar sendiri di kalimat kedua", () => {
  const S = base({ members: [{ ...kiko, info: { ujian: { hari: D + 3, belajar: 2, sendiri: 1, jenis: "ulangan" } } }] });
  const [u] = only(S, "ujian:");
  assert.equal(u.tx, "Kiko has a quiz in 3 days. Two study evenings so far."); assert.equal(u.sure, true); assert.equal(u.go, "plan");
  assert.match(u.sub, /studied alone once/);
  const akhir = only(base({ members: [{ ...kiko, info: { ujian: { hari: D + 1, belajar: 0, jenis: "akhir" } } }] }), "ujian:")[0];
  assert.equal(akhir.tx, "Kiko has final exams tomorrow. No study evenings so far.");
  // ujian yang sudah lewat tidak muncul
  assert.equal(only(base({ members: [{ ...kiko, info: { ujian: { hari: D, belajar: 1, jenis: "ulangan" } } }] }), "ujian:").length, 0);
});

test("kelahiran, kelas malam, maraton, review, kompetisi: tanggal pasti dari info dan st", () => {
  const m = { ...mochi, info: { lahir_hari: D + 12, kelas: { label: "Pottery", end: D + 6 }, maraton: { day: D + 9 } }, st: { next_review: D + 20, next_comp: D + 15, job: { id: "designer", level: 1 } } };
  const S = base({ members: [m], prize: id => id === "designer" });
  const by = Object.fromEntries(Soon.items(S).map(i => [i.k.split(":")[0], i]));
  assert.equal(by.lahir.tx, "Mochi's babies are due in 12 days.");
  assert.equal(by.kelas.tx, "Mochi's last pottery class is in 6 days.");
  assert.equal(by.maraton.tx, "The Old Town Marathon is in 9 days. Mochi trains before work.");
  assert.equal(by.review.tx, "Mochi's promotion review is in 20 days.");
  assert.equal(by.comp.tx, "Mochi's next competition is in 15 days.");
  for (const k of ["lahir", "kelas", "maraton", "review", "comp"]) assert.equal(by[k].sure, true, k);
  // review yang sudah dijadwalkan sebagai momen tidak dobel; level 3 tidak punya review; FOREVER tidak dihitung
  assert.equal(only(base({ members: [m], moments: [{ id: "r", day: D + 20, cid: "m1", label: "Promotion review", kind: "review" }] }), "review:").length, 0);
  assert.equal(only(base({ members: [{ ...m, st: { ...m.st, job: { id: "designer", level: 3 } } }] }), "review:").length, 0);
  assert.equal(only(base({ members: [{ ...m, st: { ...m.st, next_review: 1e9 } }] }), "review:").length, 0);
  assert.equal(only(base({ members: [m] }), "comp:").length, 0, "tanpa prize tidak ada kompetisi");
});

test("momen terjadwal, kejadian dunia, majalah, bangunan: pasti; drop dan Kindred: mungkin", () => {
  const S = base({
    moments: [{ id: "iv1", day: D + 2, cid: "m1", label: "Job interview: Baker", kind: "interview" }],
    world: [{ mulai: D + 4, selesai: D + 6, nama: "Lantern Festival", ikon: "🏮" }, { mulai: D - 1, selesai: D + 1, nama: "Rain week", ikon: "🌧" }],
    mag: D + 5, build: { done: D + 8, label: "cottage" },
    drops: [{ start: D + 3, label: "Print", soon: true }, { start: D - 2, label: "Old", soon: false }],
    kindred: [{ cid: "m1", nama: "Nana", label: "Could get engaged", wait: 12, asked: false }, { cid: "m1", nama: "Lala", label: "Could get married", wait: 5, asked: true }],
  });
  const it = Soon.items(S), by = Object.fromEntries(it.map(i => [i.k.split(":")[0], i]));
  assert.equal(by.momen.tx, "Mochi: Job interview: Baker in 2 days."); assert.equal(by.momen.go, "momen"); assert.equal(by.momen.m.id, "iv1");
  assert.equal(by.dunia.tx, "Lantern Festival begins in 4 days."); assert.equal(it.filter(i => i.k.startsWith("dunia:")).length, 1, "yang sudah berjalan tidak masuk Soon");
  assert.equal(by.mag.tx, "A new issue of Old Town in 5 days.");
  assert.equal(by.bangun.tx, "The cottage is ready in 8 days.");
  assert.equal(by.drop.tx, "Print drops in 3 days, if someone is quick."); assert.equal(by.drop.sure, false);
  assert.equal(by.kindred.tx, "Mochi could ask Nana in 12 days about getting engaged."); assert.equal(by.kindred.sure, false);
  assert.equal(it.filter(i => i.k.startsWith("kindred:")).length, 1, "yang sudah ditanya tidak masuk");
  // urut hari; drop (mungkin) di hari yang sama kalah dari yang pasti
  const days = it.map(i => i.day); assert.deepEqual(days, days.slice().sort((a, b) => a - b));
  const same = Soon.items(base({ drops: [{ start: D + 5, label: "Print", soon: true }], mag: D + 5 })).filter(i => i.day === D + 5).map(i => i.k);
  assert.deepEqual(same, ["mag", "drop:Print"]);
});

test("drop hanya kalau ada yang sudah boleh ke Bazaar", () => {
  const S = base({ members: [kiko], drops: [{ start: D + 3, label: "Print", soon: true }] });
  assert.equal(only(S, "drop:").length, 0);
});

test("baris Soon: yang terdekat dalam HORIZON hari, kosong kalau semua masih jauh", () => {
  const S = base({ moments: [{ id: "iv1", day: D + 2, cid: "m1", label: "Job interview", kind: "interview" }] });
  assert.equal(Soon.line(S).k, "momen:iv1");
  const far = base({ members: [{ ...mochi, umur: 400, born: 300 }] }); // ulang tahun 330 hari, tua 512 hari
  assert.equal(Soon.line(far), null);
  assert.equal(Soon.line(base({ cur: null })), null);
});

test("Someday: Kindred tanpa tanggal > keinginan besar > cita-cita; kosong kalau tidak ada", () => {
  assert.equal(Soon.someday(base()), null);
  assert.equal(Soon.someday(base({ cita: "doctor" })).tx, "Mochi wants to be a doctor one day. No date, just the dream.");
  assert.equal(Soon.someday(base({ cita: "illustrator" })).tx, "Mochi wants to be an illustrator one day. No date, just the dream.");
  const w = Soon.someday(base({ cita: "x", wants: [{ id: "sepatu", ic: "👟", label: "new shoes", besar: false }, { id: "rumah", ic: "🏠", label: "a house by the river", besar: true }] }));
  assert.equal(w.k, "ingin:rumah"); assert.equal(w.tx, "Mochi really wants a house by the river. One day.");
  const k = Soon.someday(base({ cita: "x", kindred: [{ cid: "m1", nama: "Nana", label: "Could get married", wait: 0, asked: false }] }));
  assert.equal(k.tx, "Mochi is thinking about getting married with Nana. No date yet.");
  assert.equal(k.k, "kindred:Nana");
  // Kindred pasangan makhluk lain tidak jadi Someday makhluk ini
  assert.equal(Soon.someday(base({ kindred: [{ cid: "m2", nama: "Nana", label: "Could get married", wait: 0, asked: false }] })), null);
});

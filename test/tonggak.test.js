// Tonggak tumbuh bayi (tonggak.js, v45): jendela per tonggak, hari dari benih makhluk, satu per hari, ikut replay,
// rawatan tidak mengubah harinya, dan baris Soon (soon.js): jendela = mungkin, tanggal klinik = pasti.
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); require("../wants.js");
const Tonggak = require("../tonggak.js");
const Soon = require("../soon.js");

const home = (akun, attend = 1) => { const h = new E.Household(akun, new E.GuardianBot("suportif", attend)); h.found("m1", "Mochi"); return h; };
const run = (akun, days, attend) => { const h = home(akun, attend), sink = []; h.view(days, sink); return { h, c: h.members[0], sink }; };

test("daftar: jendela masuk akal, urut lo, semua di fase bayi, id unik", () => {
  let last = 0;
  for (const t of Tonggak.LIST) { assert.ok(t.lo <= t.hi && t.lo >= 1 && t.hi < 60, t.id); assert.ok(t.lo >= last, t.id); last = t.lo; }
  assert.equal(new Set(Tonggak.LIST.map(t => t.id)).size, Tonggak.LIST.length);
  assert.equal(Tonggak.LIST.filter(t => t.lo === t.hi).length, 3);
});

test("hari dari benih: tetap, di dalam jendela, beda antar makhluk; tanggal klinik sama buat semua", () => {
  const a = { id: "akun/x" }, b = { id: "akun/y" };
  let differ = 0;
  for (const t of Tonggak.LIST) {
    const d1 = Tonggak.dayOf(a, t), d2 = Tonggak.dayOf(a, t.id);
    assert.equal(d1, d2); assert.ok(d1 >= t.lo && d1 <= t.hi, t.id);
    if (Tonggak.dayOf(b, t) !== d1) differ++;
  }
  assert.ok(differ >= 5, `beda ${differ}`);
  assert.equal(Tonggak.dayOf(a, "suntik_1"), 5); assert.equal(Tonggak.dayOf(b, "suntik_1"), 5);
  assert.equal(Tonggak.dayOf(a, "zzz"), null);
});

test("60 hari: semua tonggak terjadi sekali di jendelanya, maksimal satu berjendela per hari, kalimatnya di catatan hari", () => {
  const { c, sink } = run("akun-a", 60);
  const got = c.info.tonggak;
  for (const t of Tonggak.LIST) {
    assert.ok(got[t.id] != null, t.id);
    const age = got[t.id] - c.born;
    assert.ok(age >= t.lo && age <= t.hi, `${t.id} umur ${age}`);
    assert.equal(c.fired[t.id], 1);
    const logs = sink.filter(l => l.events.includes(t.id));
    assert.equal(logs.length, 1, t.id);
    assert.ok(logs[0].lineAt[t.id] && logs[0].lineAt[t.id].includes("Mochi"), t.id);
  }
  const perDay = {};
  for (const t of Tonggak.LIST) if (t.lo !== t.hi) perDay[got[t.id]] = (perDay[got[t.id]] || 0) + 1;
  assert.ok(Object.values(perDay).every(n => n === 1), JSON.stringify(perDay));
  assert.ok(c.info.kesayangan && c.info.kata_pertama);
  assert.ok(c.memory.some(m => /First tooth/.test(m.teks)));
});

test("replay: akun sama -> hari tonggak sama persis; akun lain -> beda", () => {
  const a = run("akun-a", 60).c.info.tonggak, b = run("akun-a", 60).c.info.tonggak, z = run("akun-z", 60).c.info.tonggak;
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, z);
});

test("rawatan tidak mengubah harinya: wali hadir tiap hari vs tidak pernah", () => {
  const a = run("akun-a", 60, 1).c.info.tonggak, b = run("akun-a", 60, 0).c.info.tonggak;
  assert.deepEqual(a, b);
});

test("kata pertama ngikut keinginan yang pernah dipenuhi; kalimat pertama memakainya; save lama tanpa tanggal tetap dianggap selesai", () => {
  const h = home("akun-k"), c = h.members[0];
  c.info.keinginan = { aktif: [], terakhir: 0, selesai: { peluk: 1, dongeng: 0 }, riwayat: [] };  // yang paling dulu dipenuhi yang menang
  h.view(60);
  assert.equal(c.info.kata_pertama, "book");
  assert.ok(c.memory.some(m => m.teks === 'First sentence: "book now!"'));
  assert.ok(Tonggak.view(c, 60).every(v => v.done));
  const c2 = home("akun-l").members[0]; c2.fired.senyum_pertama = 1;
  const v2 = Tonggak.view(c2, 3).find(v => v.id === "senyum_pertama");
  assert.equal(v2.done, true); assert.equal(v2.at, -1);
});

test("save lama yang tonggaknya kelewat: menyusul satu per hari, tidak dobel", () => {
  const h = home("akun-m"), c = h.members[0];
  // 30 hari jalan tanpa modul (tiru dengan menghapus catatan dan flag), lalu lanjut
  h.view(30); for (const t of Tonggak.LIST) { delete c.fired[t.id]; } delete c.info.tonggak; delete c.info.tg_hari;
  h.view(36);
  const days = Tonggak.LIST.filter(t => t.lo !== t.hi).map(t => (c.info.tonggak || {})[t.id]).filter(d => d != null);
  assert.equal(days.length, 6);  // enam hari, enam tonggak berjendela: satu per hari, sisanya menyusul
  assert.equal(new Set(days).size, 6);
  assert.ok(days.every(d => d >= 31 && d <= 36));
  assert.equal(c.info.tonggak.suntik_1, 31);  // tanggal klinik yang kelewat boleh bareng tonggak lain
});

test("upcoming: tonggak berikutnya + tanggal klinik berikutnya, hanya saat bayi; soon.js: mungkin vs pasti, dekat menang", () => {
  const c = home("akun-s").members[0];
  const U = Tonggak.upcoming(c, 3);
  assert.equal(U.length, 2);
  assert.equal(U[0].id, "senyum_pertama"); assert.equal(U[0].fixed, false); assert.equal(U[0].lo, 2); assert.equal(U[0].hi, 5);
  assert.equal(U[1].id, "suntik_1"); assert.equal(U[1].fixed, true); assert.equal(U[1].lo, 5);
  assert.deepEqual(Tonggak.upcoming(c, 70), []);
  const mem = { id: c.id, nama: "Mochi", fase: "bayi", umur: 3, born: 0, kid: true, info: {}, st: null };
  const S = { d: 3, cur: { id: c.id, nama: "Mochi" }, members: [mem], phases: E.PHASES, tonggak: U, nameOf: () => "Mochi" };
  const items = Soon.items(S);
  const tg = items.find(i => i.k.startsWith("tonggak:")), ck = items.find(i => i.k.startsWith("cek:"));
  assert.equal(tg.tx, "Mochi's first smile could come any day now."); assert.equal(tg.sure, false); assert.equal(tg.any, true); assert.equal(tg.day, 4); assert.equal(tg.lbl, "FIRST SMILE"); assert.equal(tg.go, "profil");
  assert.equal(ck.tx, "Mochi's first shots at the clinic in 2 days."); assert.equal(ck.sure, true); assert.equal(ck.day, 5); assert.equal(ck.lbl, "CHECKUP");
  assert.equal(Soon.line(S).k, ck.k);   // v46: tanggal pasti yang tinggal <= 3 hari menang dari "any day now"
  const S2 = { ...S, d: 1, members: [{ ...mem, umur: 1 }], tonggak: Tonggak.upcoming(c, 1) };
  const tg2 = Soon.items(S2).find(i => i.k.startsWith("tonggak:"));
  assert.equal(Soon.line(S2).k, tg2.k);   // klinik masih 4 hari: jendela duluan
  assert.equal(tg2.tx, "Mochi's first smile usually comes in 1 to 4 days."); assert.equal(tg2.any, false); assert.equal(tg2.day, 2);
  // tanggal klinik hari ini sudah lewat (sudah terjadi pagi itu): tidak muncul
  assert.equal(Soon.items({ ...S, d: 5, tonggak: [{ cid: c.id, id: "suntik_1", lbl: "CHECKUP", label: "first shots", ic: "🩹", lo: 5, hi: 5, fixed: true }] }).some(i => i.k.startsWith("cek:")), false);
});

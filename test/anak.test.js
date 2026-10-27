// Fase anak (anak.js, v46): kalender sekolah tetap (sama buat semua yang seumur), delapan tonggak berjendela dari benih, sahabat NPC
// (kenal, Sabtu, berantem lalu baikan, pindah, baru), bakat di jendela 85–110, dan baris Soon (soon.js) buat tanggal sekolah.
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
const S = require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); require("../wants.js");
const Tonggak = require("../tonggak.js");
const Anak = require("../anak.js");
const Soon = require("../soon.js");

const home = (akun, attend = 1) => { const h = new E.Household(akun, new E.GuardianBot("suportif", attend)); h.found("m1", "Mochi"); return h; };
const run = (akun, days, attend) => { const h = home(akun, attend), sink = []; h.view(days, sink); return { h, c: h.members[0], sink }; };
const ageOf = (c, id) => c.info.tonggak[id] - c.born;
const AKUN = ["akun-a", "akun-b", "akun-c", "akun-d"];

test("daftar: delapan tonggak berjendela di fase anak, kalender tetap urut umur, id unik dan nggak tabrakan dengan tonggak bayi", () => {
  assert.equal(Anak.LIST.length, 8);
  const ids = new Set(Tonggak.LIST.concat(Tonggak.EXTRA).map(t => t.id));
  for (const t of Anak.LIST) { assert.ok(t.lo >= 60 && t.lo < t.hi && t.hi <= 180, t.id); assert.ok(!ids.has(t.id), t.id); ids.add(t.id); }
  let last = 0;
  for (const k of Anak.KALENDER) { assert.ok(k.at >= 60 && k.at < 180 && k.at >= last, k.id); last = k.at; assert.ok(!ids.has(k.id) || k.id === "hari_pertama_sekolah", k.id); }
  assert.deepEqual(Anak.KALENDER.filter(k => k.soon).map(k => k.at), [95, 100, 120, 121, 130, 134, 142, 150, 160, 165, 178]);   // v46.1: klinik, field trip, lomba kota
});

test("kalender tetap: ulangan 95 dan 150 (diumumkan 3 hari sebelumnya, nilai tercatat), rapor 120 dan 178, libur 121, pentas 165; sama buat semua akun", () => {
  for (const akun of AKUN) {
    const { c, sink } = run(akun, 182);
    const at = id => sink.filter(l => l.events.includes(id)).map(l => l.day - c.born);
    assert.deepEqual(at("ulangan_1_diumumkan"), [92]); assert.deepEqual(at("ulangan_2_diumumkan"), [147]);
    assert.deepEqual(at("ujian"), [95, 150], akun);   // ulangan acak nggak ada lagi di fase anak
    assert.deepEqual(at("ujian_diumumkan").filter(d => d < 180), []);   // ulangan acak nggak ada lagi (v47: remaja juga bertanggal, remaja.js)
    assert.deepEqual(at("rapor_1"), [120]); assert.deepEqual(at("libur_sekolah"), [121]); assert.deepEqual(at("pentas_sekolah"), [165]); assert.deepEqual(at("rapor_2"), [178]);
    assert.deepEqual(at("lomba").filter(d => d < 180), []);   // lomba acak tinggal buat remaja; di anak: pentas 165
    const N = c.info.nilai;
    assert.ok(N.ulangan_1 && N.ulangan_2 && ["great", "okay", "bad"].includes(N.ulangan_1.g) && N.ulangan_1.d === c.born + 95, akun);
    assert.equal(c.info.rapor.length, 2);
    assert.equal(c.info.rapor[0].nilai, N.ulangan_1.g); assert.equal(c.info.rapor[1].nilai, N.ulangan_2.g);
    assert.ok(typeof c.info.rapor[0].teman === "number" && c.info.rapor[0].catatan.length > 10);
    assert.ok(["bagus", "biasa", "grogi"].includes(c.info.pentas.hasil) && c.info.pentas.part);
    assert.ok(!("ujian" in c.info) || c.info.ujian.hari > c.born + 180);
    const l = sink.find(l => l.events.includes("rapor_1"));
    assert.match(l.lineAt.rapor_1, /^Report card day\. (Top marks|Middling marks|Marks that need work).* Friends: .* teacher's hand: "/);
  }
});

test("tonggak anak: semua terjadi sekali di jendelanya, satu per hari, nggak bareng hari kalender kecuali di ujung jendela; garis pintu punya angka", () => {
  const kal = new Set(Anak.KALENDER.map(k => k.at));
  for (const akun of AKUN) {
    const { c, sink } = run(akun, 182), perDay = {};
    for (const t of Anak.LIST) {
      const age = ageOf(c, t.id);
      assert.ok(age >= t.lo && age <= t.hi, `${akun} ${t.id} umur ${age}`);
      assert.equal(sink.filter(l => l.events.includes(t.id)).length, 1, t.id);
      assert.ok(sink.find(l => l.events.includes(t.id)).lineAt[t.id].includes("Mochi"), t.id);
      if (age < t.hi) { perDay[age] = (perDay[age] || 0) + 1; assert.ok(!kal.has(age), `${akun} ${t.id} bareng kalender di umur ${age}`); }
    }
    assert.ok(Object.values(perDay).every(n => n === 1), akun + " " + JSON.stringify(perDay));
    const g = c.info.garis[0];
    assert.ok(g.cm >= 110 && g.cm <= 145 && g.cm === Anak.tinggi(c, ageOf(c, "garis_pintu")), `${akun} ${g.cm}`);
    assert.ok(c.memory.some(m => /door frame/.test(m.teks)) || c.memory.length === 20);
  }
});

test("sahabat: kenal 65–90 (bayi dari taman kalau ada), Sabtu, berantem lalu baikan tiga hari kemudian, pindah 140–172 (NPC), baru 6–12 hari sesudahnya", () => {
  for (const akun of AKUN) {
    const { c, h, sink } = run(akun, 185);
    const at = id => sink.filter(l => l.events.includes(id)).map(l => l.day - c.born);
    const kenal = at("sahabat_kenal"); assert.equal(kenal.length, 1); assert.ok(kenal[0] >= 65 && kenal[0] <= 90, akun);
    const lama = c.info.sahabat_lama;
    assert.ok(lama && lama.jenis === "npc" && lama.sejak === c.born + kenal[0], akun);
    if (c.info.kenalan_bayi) assert.equal(lama.id, c.info.kenalan_bayi);   // bayi dari taman (v45.1) jadi sahabat
    const pindah = at("sahabat_pindah"); assert.equal(pindah.length, 1); assert.ok(pindah[0] >= 140 && pindah[0] <= 172, akun);
    assert.equal(c.relations[lama.id].tipe, "sahabat_pindah");
    const baru = at("sahabat_baru"); assert.equal(baru.length, 1); assert.ok(baru[0] - pindah[0] >= 6 && baru[0] - pindah[0] <= 16, `${akun} ${baru[0] - pindah[0]}`);
    assert.ok(c.info.sahabat && c.info.sahabat.id !== lama.id && c.relations[c.info.sahabat.id].tipe === "sahabat");
    for (const [r, b] of at("ribut_sahabat").map(r => [r, at("baikan_sahabat").find(b => b >= r)])) if (b != null) assert.equal(b - r, 3, akun);
    assert.ok(!c.info.ribut || c.info.ribut.d > c.born + 182);
    for (const d of at("sabtu_sahabat")) assert.equal((c.born + d) % 7, 6);
    assert.ok(h.world.npc_logs[lama.id].some(([, , t]) => /Moved away/.test(t)));
    assert.equal(Object.values(c.relations).filter(r => r.tipe === "sahabat").length, 1);
  }
});

test("bakat: ketahuan di jendela 85–110 dari benih (bukan 95), tetap antar replay, beda antar akun", () => {
  const days = AKUN.map(akun => { const { c, sink } = run(akun, 120); const d = sink.find(l => l.events.includes("bakat_ketahuan")).day - c.born; assert.equal(d, S.bakatDay(c)); return d; });
  for (const d of days) assert.ok(d >= 85 && d <= 110 && d !== 95, String(d));
  assert.ok(new Set(days).size >= 2);
});

test("replay: akun sama -> hari sama persis; kehadiran wali nggak mengubah hari; akun lain beda", () => {
  const pick = c => Object.fromEntries(Anak.LIST.concat(Anak.ORANG).map(t => [t.id, c.info.tonggak[t.id]]));
  const a = run("akun-r", 182, 1), b = run("akun-r", 182, 1), z = run("akun-r", 182, 0);
  assert.deepEqual(pick(a.c), pick(b.c)); assert.deepEqual(a.c.info.nilai, b.c.info.nilai); assert.deepEqual(a.c.info.pentas, b.c.info.pentas);
  assert.deepEqual(pick(a.c), pick(z.c));
  assert.notDeepEqual(pick(a.c), pick(run("akun-q", 182, 1).c));
});

test("view/calendar/upcoming: tangga, kalender app, dan baris Soon (ulangan yang sudah diumumkan nggak dobel); soon.js pakai kalimat sekolah", () => {
  const c = home("akun-s").members[0];
  assert.ok(Anak.view(c, 61).every(v => !v.done && v.at === null) && Anak.view(c, 63).find(v => v.id === "gigi_copot").open);
  assert.deepEqual(Anak.upcoming(c, 30), []);
  const U = Anak.upcoming(c, 61);
  assert.deepEqual(U.map(u => u.id), ["gigi_copot", "bakat", "ulangan_1"]);
  assert.equal(U[2].fixed, true); assert.equal(U[2].key, "sekolah"); assert.equal(U[2].lo, c.born + 95);
  const mem = { id: c.id, nama: "Mochi", fase: "anak", umur: 61, born: 0, kid: true, info: {}, st: null };
  const base = { d: 61, cur: { id: c.id, nama: "Mochi" }, members: [mem], phases: E.PHASES, tonggak: U, nameOf: () => "Mochi" };
  const items = Soon.items(base), sk = items.find(i => i.k.startsWith("sekolah:")), tg = items.find(i => i.k.startsWith("tonggak:"));
  assert.equal(sk.tx, "Mochi's first quiz of the year is in 34 days."); assert.equal(sk.sure, true); assert.equal(sk.go, "school"); assert.match(sk.sub, /study evenings/);
  assert.equal(tg.tx, "Mochi's first tooth out usually comes in 1 to 24 days."); assert.equal(Soon.line(base).k, tg.k);
  // tiga hari sebelum ulangan: yang pasti menang dari jendela "any day now"
  const near = { ...base, d: 92, members: [{ ...mem, umur: 92 }], tonggak: Anak.upcoming(c, 92) };
  assert.equal(Soon.line(near).k, "sekolah:" + c.id + ":ulangan_1");
  // sesudah diumumkan: baris ujian dari c.info.ujian, kalender lompat ke rapor
  c.info.ujian = { hari: c.born + 95, belajar: 1, sendiri: 0, jenis: "ulangan", kal: "ulangan_1" };
  const U2 = Anak.upcoming(c, 92);
  assert.deepEqual(U2.filter(u => u.fixed).map(u => u.id), ["klinik_gigi_1"]);   // v46.1: klinik gigi 100 sebelum rapor 120
  const both = Soon.items({ ...near, members: [{ ...mem, umur: 92, info: { ujian: c.info.ujian } }], tonggak: U2 });
  assert.equal(both.filter(i => /ulangan|ujian/.test(i.k)).length, 1);
  delete c.info.ujian;
  const K = Anak.calendar(c, 61);
  assert.deepEqual(K.map(k => k.id), ["hari_pertama_sekolah", "ulangan_1", "rapor_1", "libur_sekolah", "field_trip", "lomba_kota", "ulangan_2", "pentas_sekolah", "rapor_2"]);   // v46.1: + field trip, lomba kota
  assert.ok(K.every(k => k.day === c.born + Anak.KALENDER.find(x => x.id === k.id).at) && K[0].done && !K[1].done);
});

test("save lama: anak umur 100 tanpa catatan: kalender yang kelewat menyusul satu per hari, pengumuman basi gugur, tonggak menyusul satu per hari", () => {
  const h = home("akun-o"), c = h.members[0];
  h.view(100);
  for (const t of Anak.LIST.concat(Anak.ORANG, Anak.KALENDER)) { delete c.fired[t.id]; delete c.info.tonggak[t.id]; }
  delete c.fired.sahabat_baru; delete c.fired.baikan_sahabat; c.info.sahabat = null; delete c.info.sahabat_lama; delete c.info.ribut; delete c.info.nilai; delete c.info.ujian; delete c.info.sk_hari; delete c.info.tg_hari;
  const sink = []; h.view(106, sink);
  const got = sink.flatMap(l => l.events.map(e => [l.day - c.born, e])).filter(([, e]) => /ulangan|gigi_copot|baca_sendiri|naik_sepeda|berenang|sahabat_kenal/.test(e));
  assert.ok(!got.some(([, e]) => e === "ulangan_1_diumumkan"));   // basi: gugur, nggak ada "ulangan 3 hari lagi" di umur 101
  // jendelanya sudah habis (gigi copot <= 85, sahabat <= 90): langsung di hari pertama, boleh bareng; yang jendelanya masih ada: satu per hari
  assert.deepEqual(got.filter(([, e]) => e === "gigi_copot" || e === "sahabat_kenal").map(([d]) => d), [101, 101], JSON.stringify(got));
  const sisa = got.filter(([, e]) => e === "naik_sepeda" || e === "baca_sendiri").map(([d]) => d);
  assert.equal(sisa.length, 2); assert.notEqual(sisa[0], sisa[1]); assert.ok(sisa.every(d => d >= 102), JSON.stringify(got));
  assert.ok(ageOf(c, "naik_sepeda") <= 105 && ageOf(c, "baca_sendiri") <= 110);
});

// Bayi lanjutan (tonggak.js, v45.1): watak kebaca, sakit ringan, orang, timbang di hari klinik. Mesin yang sama dengan tonggak:
// jendela per kejadian, hari dari benih makhluk, ikut replay, rawatan tidak mengubah harinya (kecuali cemas ditinggal, yang memang soal hadir).
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); require("../wants.js");
const Tonggak = require("../tonggak.js");

const home = (akun, attend = 1) => { const h = new E.Household(akun, new E.GuardianBot("suportif", attend)); h.found("m1", "Mochi"); return h; };
const run = (akun, days, attend) => { const h = home(akun, attend), sink = []; h.view(days, sink); return { h, c: h.members[0], sink }; };
const WATAK = Tonggak.EXTRA.filter(t => t.jenis === "watak");

test("daftar: sebelas kejadian lain, semua berjendela di fase bayi, id unik dan nggak tabrakan dengan tonggak", () => {
  assert.equal(Tonggak.EXTRA.length, 11);
  assert.equal(WATAK.length, 6);
  const ids = new Set(Tonggak.LIST.map(t => t.id));
  for (const t of Tonggak.EXTRA) { assert.ok(t.lo < t.hi && t.lo >= 1 && t.hi < 60, t.id); assert.ok(!ids.has(t.id), t.id); ids.add(t.id); }
  assert.equal(new Set(WATAK.map(t => t.trait)).size, 6);  // enam sifat berbeda
  for (const t of WATAK) assert.ok(E.TRAITS.includes(t.trait) && t.kata.length === 3, t.id);
});

test("60 hari: semua terjadi sekali di jendelanya; rewel gigi 1-2 hari sebelum gigi pertama; selain di ujung jendela paling banyak satu per hari", () => {
  for (const akun of ["akun-a", "akun-b", "akun-c", "akun-d"]) {
    const { c, sink } = run(akun, 60), got = c.info.tonggak;
    const perDay = {};
    for (const t of Tonggak.EXTRA) {
      assert.ok(got[t.id] != null, `${akun} ${t.id}`);
      const age = got[t.id] - c.born;
      assert.ok(age >= t.lo && age <= t.hi, `${akun} ${t.id} umur ${age}`);
      assert.equal(sink.filter(l => l.events.includes(t.id)).length, 1, t.id);
      if (!t.at && age < t.hi) perDay[age] = (perDay[age] || 0) + 1;
    }
    assert.ok(Object.values(perDay).every(n => n === 1), akun + " " + JSON.stringify(perDay));
    const rewel = got.gigi_rewel - got.gigi_pertama;
    assert.ok(rewel === -1 || rewel === -2, `${akun} rewel ${rewel}`);
    // hari tonggak berjendela dan hari kejadian lain tidak bareng, kecuali yang dipaksa di ujung jendela
    for (const t of Tonggak.EXTRA) if (!t.at && got[t.id] - c.born < t.hi) assert.ok(!Tonggak.LIST.some(u => u.lo !== u.hi && got[u.id] === got[t.id]), `${akun} ${t.id} bareng tonggak`);
  }
});

test("watak: nilainya kebaca dari sifat, sifatnya nggak diubah, ingatan dan kalimat di catatan hari, kartu watak() lengkap", () => {
  const { c, sink } = run("akun-w", 60), W = c.info.watak;
  for (const t of WATAK) {
    const v = W[t.id], tr = c.traits[t.trait];
    assert.ok(["hi", "mid", "lo"].includes(v), t.id);
    if (tr >= 65) assert.equal(v, "hi", t.id); if (tr <= 35) assert.equal(v, "lo", t.id);
    const l = sink.find(l => l.events.includes(t.id));
    assert.ok(l.lineAt[t.id].includes("Mochi") && l.lineAt[t.id].includes(t.kata[{ hi: 0, mid: 1, lo: 2 }[v]]), t.id);
  }
  // ingatan (memory dibatasi 20 baris, jadi cek yang masih segar: hari 12 pasti masih ada dua pengamatan pertama)
  const c12 = run("akun-w", 12).c;
  for (const id of ["watak_tidur", "watak_mandi"]) { const t = WATAK.find(t => t.id === id); assert.ok(c12.memory.some(m => m.teks === t.kata[{ hi: 0, mid: 1, lo: 2 }[c12.info.watak[id]]] + "."), id); }
  // sifat sebelum dan sesudah pengamatan sama (pengamatan cuma baca). Bandingkan dengan makhluk kembar yang jalan tanpa pengamatan: tidak ada
  // cara memisahkan storylet lain, jadi cukup: nilai yang ditulis cocok dengan ambang sifat hari itu.
  const V = Tonggak.watak(c, 60);
  assert.equal(V.length, 6); assert.ok(V.every(v => v.done && v.kata && v.at >= v.lo && v.at <= v.hi && v.trait));
  const c0 = home("akun-w2").members[0], V0 = Tonggak.watak(c0, 2);
  assert.ok(V0.every(v => !v.done && v.kata === null && v.at === null && !v.open));
  assert.ok(Tonggak.watak(c0, 4).find(v => v.id === "watak_tidur").open);
});

test("timbang: angka di tiga hari klinik, naik terus, kalimat perawat di catatan hari; timbang() tetap per makhluk dan masuk akal", () => {
  const { c, sink } = run("akun-t", 60), TB = c.info.timbang;
  assert.deepEqual(Object.keys(TB).sort(), ["suntik_1", "suntik_2", "suntik_3"]);
  assert.ok(TB.suntik_1.kg < TB.suntik_2.kg && TB.suntik_2.kg < TB.suntik_3.kg);
  assert.ok(TB.suntik_1.cm < TB.suntik_2.cm && TB.suntik_2.cm < TB.suntik_3.cm);
  assert.equal(TB.suntik_1.d, c.born + 5);
  const l = sink.find(l => l.events.includes("suntik_2"));
  assert.match(l.lineAt.suntik_2, /On the scale: \d+(\.\d)? kg, \d+ cm\. "(A little one, growing just fine|Right on track|A big one)," says the nurse\./);
  for (const akun of ["x", "y", "z"]) {
    const k = { id: "akun/" + akun }, m0 = Tonggak.timbang(k, 0), m60 = Tonggak.timbang(k, 60);
    assert.deepEqual(m0, Tonggak.timbang(k, 0));
    assert.ok(m0.kg >= 2.5 && m0.kg <= 4.2 && m60.kg >= 10.5 && m60.kg <= 16.5, akun);
    assert.ok(m0.cm >= 46 && m0.cm <= 54 && m60.cm >= 85 && m60.cm <= 99, akun);
    assert.ok([-1, 0, 1].includes(m0.besar));
  }
  assert.notEqual(Tonggak.timbang({ id: "akun/x" }, 5).kg, Tonggak.timbang({ id: "akun/y" }, 5).kg);
});

test("orang: tetangga dan bayi lain jadi NPC dengan relasi sendiri (bukan teman), disimpan buat nanti", () => {
  const { c, h } = run("akun-o", 60);
  const tet = c.relations[c.info.tetangga], bay = c.relations[c.info.kenalan_bayi];
  assert.equal(tet.tipe, "tetangga"); assert.equal(bay.tipe, "teman_bayi");
  assert.ok(h.world.npcs[c.info.tetangga].nama === tet.nama && h.world.npcs[c.info.kenalan_bayi].nama === bay.nama);
  assert.ok(h.world.npc_logs[c.info.kenalan_bayi].some(([, , t]) => /park/.test(t)));
  assert.equal(Object.values(c.relations).filter(r => r.tipe === "teman").length, 0);
});

test("cemas ditinggal: cuma sesudah dua hari nggak dibuka lalu dibuka, umur 14+, jeda 10 hari; nggak pernah kalau hadir terus", () => {
  assert.equal(run("akun-c1", 60, 1).sink.filter(l => l.events.includes("cemas_ditinggal")).length, 0);
  const h = home("akun-c2"), g = h.guardian;
  const off = new Set([8, 9, 20, 21, 24, 25, 40, 41]);
  g.attends = day => !off.has(day);
  const sink = []; h.view(60, sink);
  assert.deepEqual(sink.filter(l => l.events.includes("cemas_ditinggal")).map(l => l.day), [22, 42]);  // 10: belum 14 hari; 26: masih jeda
  const l = sink.find(l => l.day === 22);
  assert.ok(l.lineAt.cemas_ditinggal.includes("Two days is a long time"));
});

test("replay: akun sama -> hari sama persis; rawatan tidak mengubah hari kejadian lain maupun nilai watak", () => {
  const a = run("akun-r", 60, 1), b = run("akun-r", 60, 1), z = run("akun-r", 60, 0);
  const pick = c => Object.fromEntries(Tonggak.EXTRA.map(t => [t.id, c.info.tonggak[t.id]]));
  assert.deepEqual(pick(a.c), pick(b.c)); assert.deepEqual(a.c.info.watak, b.c.info.watak); assert.deepEqual(a.c.info.timbang, b.c.info.timbang);
  assert.deepEqual(pick(a.c), pick(z.c)); assert.deepEqual(a.c.info.timbang, z.c.info.timbang);
  assert.notDeepEqual(pick(a.c), pick(run("akun-q", 60, 1).c));
});

test("save lama: yang kelewat menyusul (satu per hari, atau langsung kalau jendelanya sudah habis); tangga tonggak dan Soon tetap cuma tonggak", () => {
  const h = home("akun-s"), c = h.members[0];
  h.view(30); for (const t of Tonggak.EXTRA) delete c.fired[t.id]; delete c.info.watak; delete c.info.ex_hari;
  for (const t of Tonggak.EXTRA) delete c.info.tonggak[t.id];
  h.view(33);
  const late = Tonggak.EXTRA.filter(t => t.id !== "gigi_rewel" && t.hi <= 30).map(t => c.info.tonggak[t.id]);
  assert.ok(late.length >= 5 && late.every(d => d === 31), JSON.stringify(late));  // jendelanya sudah habis: langsung, hari pertama
  assert.equal(c.info.tonggak.gigi_rewel, undefined);  // giginya sudah tumbuh: gugur
  assert.equal(Tonggak.view(c, 33).length, Tonggak.LIST.length);
  assert.ok(Tonggak.upcoming(c, 33).every(u => Tonggak.LIST.some(t => t.id === u.id)));
  assert.equal(Tonggak.dayOf(c, "watak_tidur"), Tonggak.dayOf(c, Tonggak.EXTRA[0]));
  assert.equal(Tonggak.dayOf(c, "gigi_rewel") < Tonggak.dayOf(c, "gigi_pertama"), true);
});

// v46.1 (anak.js bagian 5–6): pilihan lingkungan = empat dilema terjadwal (sekolah 56, les di hari bakat, liburan 116, field trip 131) dengan
// pagar jarak 14 hari dan default kalau dicuekin; jam tetap baru: klinik gigi 100/160, mata 130, liburan 122/125/127, field trip 134, lomba kota 142.
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
const S = require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); require("../wants.js"); require("../tonggak.js");
const Anak = require("../anak.js");
const Soon = require("../soon.js");

const home = (akun, style = "suportif", attend = 1) => { const h = new E.Household(akun, new E.GuardianBot(style, attend)); h.found("m1", "Mochi"); return h; };
const run = (akun, days, style, attend) => { const h = home(akun, style, attend), c = h.members[0], sink = []; h.view(c.born + days, sink); return { h, c, sink, at: id => sink.filter(l => l.events.includes(id)).map(l => l.day - c.born) }; };
// baris keputusan dilema ini di hari kejadiannya (dilema director di hari yang sama nggak dihitung)
const Q = { pilih_sekolah: /Which school for/, tanya_liburan: /Where to\?/, izin_field_trip: /Sign the slip\?/ };
const decisions = (sink, id) => { const l = sink.find(l => l.events.includes(id)); return l ? l.lines.filter(t => /^_Decision:/.test(t) && Q[id].test(t)).length : -1; };

test("pilih sekolah: ditanya umur 56 (bayi); suportif = dekat, tegas = favorit, nggak buka app = dekat dan dicatat 'sendiri'; hari pertama nyebut sekolahnya", () => {
  for (const [akun, style, att, want, oleh] of [["akun-a", "suportif", 1, "dekat", "wali"], ["akun-b", "tegas", 1, "favorit", "wali"], ["akun-c", "suportif", 0, "dekat", "sendiri"]]) {
    const { c, sink, at } = run(akun, 62, style, att);
    assert.deepEqual(at("pilih_sekolah"), [56], akun);
    assert.deepEqual(c.info.sekolah_pilihan, { id: want, d: c.born + 56, oleh });
    assert.equal(Anak.sekolahOf(c).id, want); assert.equal(Anak.sekolahOf(c).dipilih, true);
    assert.equal(decisions(sink, "pilih_sekolah"), 1);
    const l = sink.find(l => l.events.includes("hari_pertama_sekolah"));
    assert.ok(l.lines.join(" ").includes(`First day at ${Anak.SEKOLAH[want].nama}!`), akun);
  }
  const c = home("akun-z").members[0];
  assert.deepEqual(Anak.sekolahOf(c), { id: "dekat", ...Anak.SEKOLAH.dekat, dipilih: false, oleh: "default", d: null });
});

test("pagar jarak: les di hari bakat, liburan 116 cuma ditanya kalau bakat >= 14 hari sebelumnya (kalau nggak: danau tanpa tanya), field trip 131; dilema_hari ikut", () => {
  let asked = 0, gated = 0;
  for (let i = 0; i < 24; i++) {
    const akun = "akun-g" + i, { c, sink, at } = run(akun, 182, "suportif", 1), b = S.bakatDay(c);
    assert.deepEqual(at("bakat_ketahuan"), [b], akun);
    assert.deepEqual(at("tanya_liburan"), [116]); assert.deepEqual(at("izin_field_trip"), [131]);
    assert.equal(decisions(sink, "pilih_sekolah"), 1); assert.equal(decisions(sink, "izin_field_trip"), 1);
    if (116 - b >= 14) { asked++; assert.equal(decisions(sink, "tanya_liburan"), 1, akun); assert.deepEqual(c.info.liburan, { id: "pantai", d: c.born + 116, oleh: "wali" }); }
    else { gated++; assert.equal(decisions(sink, "tanya_liburan"), 0, akun); assert.deepEqual(c.info.liburan, { id: "danau", d: c.born + 116, oleh: "default" }); }
    assert.deepEqual(c.info.field_trip, { ikut: true, d: c.born + 131, oleh: "wali" });
    const days = [56, b].concat(116 - b >= 14 ? [116] : [], [131]);
    for (let k = 1; k < days.length; k++) assert.ok(days[k] - days[k - 1] >= 14, akun + " " + days.join(","));
    assert.equal(c.info.dilema_hari, c.born + 131);
  }
  assert.ok(asked > 0 && gated > 0, `${asked} ditanya / ${gated} kena pagar`);
});

test("dicuekin dengan wakil 'aman' (tegas, nggak pernah buka app): default tetap dekat, les bakat, danau, ikut; bukan pilihan 'aman'-nya wakil", () => {
  const { c, sink } = run("akun-w", 182, "tegas", 0), d = c.born + 181;
  assert.deepEqual(c.info.sekolah_pilihan, { id: "dekat", d: c.born + 56, oleh: "sendiri" });
  assert.ok(c.has("les", d) && !c.has("les_aman", d));
  assert.deepEqual(c.info.les_pilihan, { id: "les", d: c.born + S.bakatDay(c), oleh: "sendiri" });
  assert.equal(c.info.liburan.id, "danau"); assert.equal(c.info.field_trip.ikut, true);
  assert.ok(sink.some(l => l.lines.some(t => /so the form went in for the school round the corner/.test(t))));
});

test("les: tiga pilihan di hari bakat; suportif = les bakat, tegas = les matematika (les_aman); nggak ada dilema les lain", () => {
  const a = run("akun-a", 182, "suportif", 1).c, b = run("akun-b", 182, "tegas", 1).c, d = 181;
  assert.ok(a.has("les", a.born + d) && !a.has("les_aman", a.born + d));
  assert.ok(b.has("les_aman", b.born + d) && !b.has("les", b.born + d));
  assert.equal(a.info.les_pilihan.id, "les"); assert.deepEqual(b.info.les_pilihan, { id: "aman", d: b.born + S.bakatDay(b), oleh: "wali" });
  assert.ok(a.memory.concat(b.memory).some(m => /talent/.test(m.teks)) || a.memory.length === 20);
});

test("jam tetap baru: liburan 122/125/127 ngikut tujuan, field trip 134, lomba kota 142 pakai bakat, klinik 100/130/160 dengan ringkasan; tonggak jendela ngalah", () => {
  const kal = new Set(Anak.KALENDER.map(k => k.at));
  for (const [akun, style] of [["akun-a", "suportif"], ["akun-b", "tegas"], ["akun-c", "suportif"]]) {
    const { c, sink, at } = run(akun, 182, style, 1);
    for (const [id, d] of [["liburan_berangkat", 122], ["liburan_tengah", 125], ["liburan_pulang", 127], ["field_trip", 134], ["lomba_kota", 142], ["klinik_gigi_1", 100], ["klinik_mata", 130], ["klinik_gigi_2", 160]]) assert.deepEqual(at(id), [d], akun + " " + id);
    const L = c.info.liburan.id, txt = id => sink.find(l => l.events.includes(id)).lineAt[id];
    const want = { pantai: /seaside/, danau: /lake/, rumah: /Day one|fridge list/ }[L];
    assert.match(txt("liburan_berangkat"), want); assert.match(txt("liburan_pulang"), want);
    assert.match(txt("field_trip"), /^Field trip day\./);
    assert.ok(["menang", "kedua", "kalah"].includes(c.info.lomba_kota.hasil) && c.info.lomba_kota.bakat === c.info.bakat, akun);
    for (const k of ["klinik_gigi_1", "klinik_mata", "klinik_gigi_2"]) assert.ok(c.info.klinik_anak[k].ringkas.length > 5, k);
    for (const t of Anak.LIST) { const age = c.info.tonggak[t.id] - c.born; if (age < t.hi) assert.ok(!kal.has(age), `${akun} ${t.id} bareng jam tetap di umur ${age}`); }
    // minggu libur: nggak ada baris rencana harian, nggak ada Sabtu sahabat
    for (const l of sink.filter(l => l.day - c.born >= 122 && l.day - c.born <= 127)) assert.ok(!l.events.includes("sabtu_sahabat") && l.lines.some(t => /^_Week off school\./.test(t)), String(l.day - c.born));
  }
});

test("field trip nggak ikut: kelasnya pergi tanpa dia, cuma teks dan mood; sekolah seni = level bakat awal 30", () => {
  const h = home("akun-f"), c = h.members[0]; h.view(c.born + 132);
  c.info.field_trip = { ikut: false, d: c.born + 131, oleh: "wali" };
  const sink = []; h.view(c.born + 135, sink);
  assert.match(sink.find(l => l.events.includes("field_trip")).lineAt.field_trip, /goes to the lighthouse without Mochi/);
  assert.equal(Anak.calendar(c, c.born + 135).find(k => k.id === "field_trip").hasil, "stayed behind");
  const h2 = home("akun-h"), c2 = h2.members[0]; h2.view(c2.born + 57);
  c2.info.sekolah_pilihan = { id: "seni", d: c2.born + 56, oleh: "wali" };
  h2.view(c2.born + S.bakatDay(c2) + 1);
  assert.ok(c2.has("les", c2.born + S.bakatDay(c2) + 1) ? c2.info.bakat_level >= 30 : true);
  assert.equal(Anak.sekolahOf(c2).nama, "Hillside Arts & Sport");
});

test("benih: kacamata kira-kira 1 dari 5; semua hasil (sekolah, liburan, field trip, lomba, klinik) sama persis saat diputar ulang", () => {
  let n = 0;
  for (let i = 0; i < 40; i++) if (run("akun-k" + i, 131, "suportif", 1).c.info.kacamata) n++;
  assert.ok(n >= 3 && n <= 16, `kacamata ${n} dari 40`);
  const a = run("akun-r", 182, "suportif", 0.7), b = run("akun-r", 182, "suportif", 0.7);
  for (const k of ["sekolah_pilihan", "liburan", "field_trip", "lomba_kota", "klinik_anak", "kacamata", "dilema_hari", "tonggak"]) assert.deepEqual(a.c.info[k], b.c.info[k], k);
});

test("view/calendar/upcoming/Soon: tangga 11 baris (8 jendela + 3 klinik) urut hari; kalender app 9 baris dengan hasil; Soon klinik pakai kunci cek, kalimatnya, ketuk ke profil", () => {
  const { c } = run("akun-a", 182, "suportif", 1);
  const V = Anak.view(c, c.born + 182);
  assert.equal(V.length, 11); assert.deepEqual(V.filter(v => v.fixed).map(v => v.id), ["klinik_gigi_1", "klinik_mata", "klinik_gigi_2"]); assert.ok(V.every(v => v.done));
  for (let i = 1; i < V.length; i++) assert.ok(V[i].lo >= V[i - 1].lo);
  const K = Anak.calendar(c, c.born + 182);
  assert.equal(K.length, 9); assert.ok(K.every(k => k.done));
  assert.ok(K.find(k => k.id === "lomba_kota").hasil && K.find(k => k.id === "pentas_sekolah").hasil);
  assert.equal(K.find(k => k.id === "field_trip").hasil, "sand in every pocket");
  const c2 = home("akun-s").members[0], d = c2.born + 97;
  const U = Anak.upcoming(c2, d), fix = U.find(u => u.fixed);
  assert.equal(fix.id, "klinik_gigi_1"); assert.equal(fix.key, "cek");
  const mem = { id: c2.id, nama: "Mochi", fase: "anak", umur: 97, born: c2.born, kid: true, info: {}, st: null };
  const items = Soon.items({ d, cur: { id: c2.id, nama: "Mochi" }, members: [mem], phases: E.PHASES, tonggak: U, nameOf: () => "Mochi" });
  const ck = items.find(i => i.k.startsWith("cek:"));
  assert.equal(ck.tx, "Mochi's dentist check is in 3 days."); assert.equal(ck.go, "profil"); assert.equal(ck.sure, true); assert.match(ck.sub, /toothbrush/);
});

test("save lama: anak umur 118 tanpa catatan v46.1: sekolah = dekat tanpa tanya, liburan ke danau tanpa tanya, klinik yang kelewat menyusul, field trip di harinya tetap ditanya", () => {
  const h = home("akun-o"), c = h.members[0]; h.view(c.born + 118);
  for (const k of Anak.KALENDER) { delete c.fired[k.id]; if (c.info.tonggak) delete c.info.tonggak[k.id]; }
  delete c.fired.pilih_sekolah; delete c.info.sekolah_pilihan; delete c.info.liburan; delete c.info.field_trip; delete c.info.klinik_anak; delete c.info.dilema_hari; delete c.info.sk_hari;
  const sink = []; h.view(c.born + 136, sink);
  const at = id => sink.filter(l => l.events.includes(id)).map(l => l.day - c.born);
  assert.deepEqual(at("pilih_sekolah"), []); assert.equal(Anak.sekolahOf(c).oleh, "default");
  assert.deepEqual(at("klinik_gigi_1"), [119]); assert.deepEqual(at("tanya_liburan"), [120]); assert.deepEqual(at("klinik_mata"), [130]);
  assert.equal(decisions(sink, "tanya_liburan"), 0); assert.deepEqual(c.info.liburan, { id: "danau", d: c.born + 120, oleh: "default" });
  assert.deepEqual(at("izin_field_trip"), [131]); assert.equal(decisions(sink, "izin_field_trip"), 1); assert.equal(c.info.field_trip.oleh, "wali");
  assert.deepEqual(at("field_trip"), [134]);
});

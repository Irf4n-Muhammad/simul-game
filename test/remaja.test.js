// Fase remaja (remaja.js, v47): jam tetap angkatan (sama buat semua yang seumur), tujuh tonggak berjendela dari benih, aturan rumah 180
// (tiga paket, default tengah, dibaca x.rule() sebelum aturan penjaga), izin kerja sambilan bersyarat, pesta pertama ngikut jam malam,
// uang jajan Senin dengan angka, pagar dilema 14 hari, dan penolakan saran kira-kira 1 dari 5 (engine.js obey_chance, pengali remaja 1,1).
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); require("../wants.js");
const Tonggak = require("../tonggak.js");
const Anak = require("../anak.js");
const Remaja = require("../remaja.js");
const Soon = require("../soon.js");

const home = (akun, style = "suportif", attend = 1) => { const h = new E.Household(akun, new E.GuardianBot(style, attend)); h.found("m1", "Mochi"); return h; };
const run = (akun, days, style, attend) => { const h = home(akun, style, attend), sink = []; h.view(days, sink); return { h, c: h.members[0], sink }; };
const ageOf = (c, id) => c.info.tonggak[id] - c.born;
const at = (sink, c, id) => sink.filter(l => l.events.includes(id)).map(l => l.day - c.born);
const AKUN = ["akun-a", "akun-b", "akun-c", "akun-d"];
const JAM_TETAP = { smp_hari_pertama: 180, aturan_rumah: 180, ulangan_3_diumumkan: 202, rapor_3: 215, study_tour_berangkat: 225, study_tour_tengah: 226, study_tour_pulang: 227,
  ulangan_4_diumumkan: 232, ujian_akhir_diumumkan: 248, rapor_4: 250, pekan_ujian: 258, pengumuman_lulus: 265, setelah_lulus: 266, pesta_kelulusan: 268 };
// hitung jawaban yang ditolak vs diikuti di baris _Decision:/_House rule: selama remaja
function tolak(sink, c) {
  let ya = 0, tidak = 0;
  for (const l of sink) { const age = l.day - c.born; if (age < 180 || age >= 270) continue;
    for (const t of l.lines) {
      if (/^_Decision:/.test(t)) { if (/they didn't listen/.test(t)) tidak++; else if (/they listened/.test(t)) ya++; }
      if (/^_House rule:/.test(t)) { if (/They broke it/.test(t)) tidak++; else if (/They obeyed/.test(t)) ya++; }
    } }
  return { ya, tidak };
}

test("daftar: tujuh tonggak berjendela 183–260 + dua bersyarat, kalender tetap urut umur 180–268, id unik dan nggak tabrakan dengan bayi/anak; rak Later bertahap", () => {
  assert.equal(Remaja.LIST.length, 7);
  const ids = new Set(Tonggak.LIST.concat(Tonggak.EXTRA, Anak.LIST, Anak.ORANG, Anak.KALENDER).map(t => t.id));
  for (const t of Remaja.LIST.concat([Remaja.IZIN, Remaja.PESTA])) { assert.ok(t.lo >= 180 && t.lo < t.hi && t.hi <= 270, t.id); assert.ok(!ids.has(t.id), t.id); ids.add(t.id); }
  let last = 0;
  for (const k of Remaja.KALENDER) { assert.ok(k.at >= 180 && k.at < 270 && k.at >= last, k.id); last = k.at; assert.ok(!ids.has(k.id), k.id); ids.add(k.id); }
  assert.deepEqual(Remaja.KALENDER.filter(k => k.soon).map(k => k.at), [205, 215, 225, 235, 250, 265, 268]);
  assert.deepEqual(Remaja.KALENDER.filter(k => k.app).length, 10);
  assert.deepEqual(Remaja.LATER.map(l => [l.id, l.from]), [["work", 270], ["wallet", 270], ["homes", 300], ["kindred", 330], ["paws", 360], ["ventures", 400]]);
  assert.equal(Remaja.laterFrom("work"), 270); assert.equal(Remaja.laterFrom("photos"), 0);
  assert.deepEqual(Object.keys(Remaja.PAKET), ["longgar", "tengah", "ketat"]);
  assert.deepEqual(Remaja.JAJAN, { besar: 15, kecil: 8 });
});

test("kalender tetap: SMP 180, ulangan 205 dan 235 (diumumkan 3 hari sebelumnya), rapor 215 dan 250, study tour 225–227, ujian akhir 248→262, lulus 265, jalur 266, pesta 268; sama buat semua akun", () => {
  for (const akun of AKUN) {
    const { c, sink } = run(akun, 272);
    for (const [id, d] of Object.entries(JAM_TETAP)) assert.deepEqual(at(sink, c, id), [d], `${akun} ${id}`);
    assert.deepEqual(at(sink, c, "ujian").filter(d => d >= 180), [205, 235, 262], akun);
    assert.deepEqual(at(sink, c, "ujian_diumumkan"), [], akun);   // pengumuman ujian acak nggak ada lagi
    const N = c.info.nilai;
    for (const k of ["ulangan_3", "ulangan_4", "ujian_akhir"]) assert.ok(N[k] && ["great", "okay", "bad"].includes(N[k].g) && typeof N[k].skor === "number", `${akun} ${k}`);
    assert.equal(N.ulangan_3.d, c.born + 205); assert.equal(N.ulangan_4.d, c.born + 235); assert.equal(N.ujian_akhir.d, c.born + 262);
    assert.equal(c.info.lulus, N.ujian_akhir.skor > 55 ? "great" : "just okay"); assert.equal(c.info.lulus_hari, c.born + 265);
    assert.ok(["kuliah", "kerja", "gap"].includes(c.info.jalur) && c.info.jalur_oleh === "wali", akun);
    const R = c.info.rapor.filter(r => /rapor_[34]/.test(r.kal));
    assert.equal(R.length, 2); assert.equal(R[0].nilai, N.ulangan_3.g); assert.equal(R[1].nilai, N.ulangan_4.g); assert.ok(R[0].catatan.length > 10 && typeof R[0].teman === "number");
    assert.match(sink.find(l => l.events.includes("rapor_3")).lineAt.rapor_3, /^Report day, mid-year\. (Top marks|Middling marks|Marks that need work).* Friends: .* form tutor's line/);
    assert.match(sink.find(l => l.events.includes("rapor_4")).lineAt.rapor_4, /^Report day, the last one before the exams\./);
    assert.match(sink.find(l => l.events.includes("pengumuman_lulus")).lineAt.pengumuman_lulus, /^Results day\. Mochi passed their final exams with (great|just okay) grades\./);
    assert.match(sink.find(l => l.events.includes("ujian") && l.day === c.born + 262).lineAt.ujian, /^Last paper done\./);
    assert.ok(c.info.smp && c.info.smp.d === c.born + 180);
    assert.ok(c.info.pesta_kelulusan && ["nine", "the last song"].includes(c.info.pesta_kelulusan.pulang));
    // agenda ngisi hari di jalan dan pekan ujian (flag study_tour, ujian_pekan)
    assert.ok(sink.some(l => l.day - c.born === 226 && l.lines.some(t => /^_Study tour\./.test(t))), akun);
    assert.ok(sink.some(l => l.day - c.born >= 259 && l.day - c.born <= 261 && l.lines.some(t => /^_Exam week\./.test(t))), akun);
    assert.equal(c.memory.filter(m => /middle school|study tour|Finished school/.test(m.teks)).length >= 2, true);
  }
});

test("aturan rumah 180: wali suportif → longgar, tegas → ketat, wali absen → tengah sendiri; x.rule() baca paket sebelum aturan penjaga, cuma selama remaja; uang jajan Senin 15 atau 8 coins", () => {
  const cek = (akun, style, attend, want, oleh) => {
    const h = home(akun, style, attend), c = h.members[0], sink = []; h.view(180, sink);
    assert.deepEqual(at(sink, c, "aturan_rumah"), [180]);
    const a = c.info.aturan_rumah; assert.ok(a && a.d === c.born + 180 && a.rules, akun);
    if (a.oleh === "default") { assert.ok(c.born + 180 - c.info.dilema_hari < 14, `${akun} ${style}: default padahal pagar lolos`); return null; }   // kena pagar dilema anak terakhir
    assert.equal(a.id, want, `${akun} ${style}`); assert.equal(a.oleh, oleh);
    assert.deepEqual(a.rules, Remaja.PAKET[want].rules);
    const A = Remaja.aturanOf(c); assert.equal(A.id, want); assert.equal(A.dipilih, true); assert.equal(A.short, Remaja.PAKET[want].short);
    const x = Object.create(E.Ctx.prototype); x.c = c; x.home = h;
    x.phase = "remaja"; assert.equal(x.rule("jam_malam"), Remaja.PAKET[want].rules.jam_malam); assert.equal(x.rule("jajan"), Remaja.PAKET[want].rules.jajan);
    x.phase = "dewasa"; assert.equal(x.rule("jam_malam"), h.guardian.rules.jam_malam);
    const line = sink.find(l => l.events.includes("aturan_rumah")).lines;
    assert.ok(line.some(t => (oleh === "wali" ? /^_Decision: Mochi is a teen now\. House rules\? You chose: / : /didn't open the app.*usual rules/).test(t)), akun + " " + JSON.stringify(line));
    assert.ok(c.memory.some(m => m.teks.startsWith(`House rules, ${Remaja.PAKET[want].short}:`)));
    h.view(272, sink);
    const mon = sink.filter(l => l.day >= c.born + 180 && l.day < c.born + 270 && l.events.includes("uang_jajan_senin"));
    assert.equal(mon.length, 13, akun); assert.ok(mon.every(l => l.day % 7 === 1));
    const n = Remaja.JAJAN[Remaja.PAKET[want].rules.jajan];
    for (const l of mon) assert.match(l.lineAt.uang_jajan_senin, new RegExp(`^_Monday\\. ${n} coins pocket money into the jar: \\d+ coins now\\._$`));
    assert.ok(c.st.wallet >= 0 && c.stats.uang === Math.min(5000, c.st.wallet / 50));
    return c;
  };
  const got = { longgar: 0, ketat: 0, tengah: 0 };
  for (const akun of AKUN) {
    if (cek(akun, "suportif", 1, "longgar", "wali")) got.longgar++;
    if (cek(akun, "tegas", 1, "ketat", "wali")) got.ketat++;
    if (cek(akun, "suportif", 0, "tengah", "sendiri")) got.tengah++;
  }
  assert.ok(got.longgar >= 2 && got.ketat >= 2 && got.tengah >= 2, JSON.stringify(got));
});

test("pesta pertama 200–230 ngikut jam malam lewat by_rule: longgar → sampai habis tanpa ribut; ketat → pulang jam 9 atau kabur (dicatat); ekornya besoknya", () => {
  for (const akun of AKUN) for (const style of ["suportif", "tegas"]) {
    const { c, sink } = run(akun, 240, style, 1);
    const d = at(sink, c, "pesta_pertama"); assert.equal(d.length, 1, akun); assert.ok(d[0] >= 200 && d[0] <= 230, `${akun} ${d}`);
    const P = c.info.pesta_pertama, rule = c.info.aturan_rumah.rules.jam_malam, lines = sink.find(l => l.events.includes("pesta_pertama")).lines;
    assert.equal(c.info.pesta_hari, c.born + d[0]);
    assert.ok(!lines.some(t => /^_Decision: Everyone's staying till the end/.test(t)), "pesta nggak jadi dilema kalau ada aturan jam malam");
    if (rule === "longgar") { assert.deepEqual([P.pulang, P.nurut], ["larut", true]); assert.ok(lines.some(t => t === "_House rule: curfew is eleven._"), JSON.stringify(lines)); }
    else { assert.ok(lines.some(t => /^_House rule: curfew is nine\. (They obeyed|They broke it: stay till the end)\._$/.test(t)), JSON.stringify(lines)); assert.equal(P.pulang, P.nurut ? "pulang" : "larut"); }
    const ekor = ["pesta_aman", "masalah_di_pesta"].flatMap(id => at(sink, c, id));
    if (P.pulang === "larut") { assert.equal(ekor.length, 1, akun); assert.equal(ekor[0], d[0] + 1); } else assert.deepEqual(ekor, []);
    assert.equal(Remaja.view(c, c.born + 240).find(v => v.id === "pesta_pertama").note, P.pulang === "pulang" ? "home by nine" : P.nurut === false ? "stayed past curfew" : "stayed till the end");
  }
});

test("tonggak remaja: sekali di jendelanya, satu per hari, ngalah ke hari jam tetap kecuali di ujung jendela; tinggi nyambung dari garis anak; benih beda antar akun; replay sama persis", () => {
  const kal = new Set(Remaja.KALENDER.map(k => k.at)), all = [];
  for (const akun of AKUN) {
    const { c, sink } = run(akun, 272), perDay = {};
    for (const t of Remaja.LIST.concat([Remaja.IZIN, Remaja.PESTA])) {
      if (!c.fired[t.id]) { assert.ok(t === Remaja.IZIN, t.id); continue; }
      const age = ageOf(c, t.id);
      assert.ok(age >= t.lo && age <= t.hi && age >= Remaja.dayOf(c, t), `${akun} ${t.id} umur ${age}`);
      assert.equal(at(sink, c, t.id).length, 1, t.id);
      assert.ok(sink.find(l => l.events.includes(t.id)).lineAt[t.id].includes("Mochi"), t.id);
      if (age < t.hi) { perDay[age] = (perDay[age] || 0) + 1; assert.ok(!kal.has(age), `${akun} ${t.id} bareng kalender di umur ${age}`); }
    }
    assert.ok(Object.values(perDay).every(n => n === 1), akun + " " + JSON.stringify(perDay));
    all.push(Remaja.LIST.map(t => ageOf(c, t.id)).join(","));
    const g = c.info.garis.find(g => g.d === c.info.tonggak.suara_berubah), umur = ageOf(c, "suara_berubah");
    assert.ok(g && g.cm === Remaja.tinggi(c, umur) && g.cm === Anak.tinggi(c, 180) + Math.round((umur - 180) * 0.3) + 4, `${akun} ${JSON.stringify(g)}`);
    assert.ok(Remaja.tinggi(c, 269) > g.cm && Remaja.tinggi(c, 400) === Remaja.tinggi(c, 270));
    assert.ok(typeof c.info.cita === "string" && c.info.hobi.label && c.info.gaya.label, akun);
    const B = c.info.beli_pertama; assert.ok(B && B.item && B.harga >= 12 && B.harga <= 25 && B.sisa >= 0, `${akun} ${JSON.stringify(B)}`);
    assert.equal(Remaja.view(c, c.born + 272).filter(v => v.done).length >= 8, true);
    assert.equal(Remaja.view(c, c.born + 272).find(v => v.id === "beli_pertama").note, `${B.item}, ${B.harga} coins`);
  }
  assert.ok(new Set(all).size >= 2, all.join(" | "));
  const pick = c => Object.fromEntries(Remaja.LIST.map(t => [t.id, c.info.tonggak[t.id]]));
  const a = run("akun-r", 272), b = run("akun-r", 272);
  assert.deepEqual(pick(a.c), pick(b.c)); assert.deepEqual(a.c.info.nilai, b.c.info.nilai); assert.deepEqual(a.c.info.beli_pertama, b.c.info.beli_pertama);
  for (const t of Remaja.LIST) assert.equal(Remaja.dayOf(a.c, t), Remaja.dayOf(run("akun-r", 1, "tegas", 0).c, t));   // benih: nggak peduli wali
  assert.notDeepEqual(pick(a.c), pick(run("akun-q", 272).c));
});

test("izin kerja sambilan (ambisius > 40, 215–240): disetujui → shift pertama 3 hari kemudian, 20 coins; ditunda wali tegas → mulai 266; nggak ambisius → nggak ada formulir", () => {
  for (const [style, want] of [["suportif", "boleh"], ["tegas", "tidak"]]) {
    const h = home("akun-kerja", style, 1), c = h.members[0]; c.traits.ambisius = 70; const sink = []; h.view(250, sink);
    if (c.info.sambilan && !c.fired.kerja_sambilan) assert.equal(Remaja.siapa(c, c.born + 250).rows.find(r => r.id === "kerja_sambilan").sub, "starts after the exams");
    h.view(272, sink);
    const izin = at(sink, c, "izin_kerja_sambilan"); assert.equal(izin.length, 1, style); assert.ok(izin[0] >= 215 && izin[0] <= 240, `${style} ${izin}`);
    const I = c.info.sambilan_izin; assert.ok(I && I.tempat === c.info.sambilan && I.d === c.born + izin[0], style);
    if (I.oleh === "default") assert.ok(izin[0] === 240 && I.id === "boleh", "default cuma di ujung jendela kalau kena pagar");
    else { assert.equal(I.oleh, "wali"); assert.equal(I.id, want); }
    const mulai = I.id === "boleh" ? izin[0] + 3 : 266;
    assert.equal(c.info.sambilan_mulai, c.born + mulai);
    assert.deepEqual(at(sink, c, "kerja_sambilan"), [mulai], style);
    const l = sink.find(l => l.events.includes("kerja_sambilan"));
    assert.match(l.lineAt.kerja_sambilan, new RegExp(`^First shift at the ${I.tempat}: four hours, one spilled tray, 20 coins in an envelope with Mochi's name on it\\. Mochi spends 6 of it .* \\d+ coins now\\.$`));
    const V = Remaja.view(c, c.born + 272);
    assert.equal(V.find(v => v.id === "izin_kerja_sambilan").note, I.id === "boleh" ? `signed, the ${I.tempat}` : "after the exams");
    assert.equal(V.find(v => v.id === "kerja_sambilan").note, `the ${I.tempat}`);
    const W = Remaja.siapa(c, c.born + 272).rows.find(r => r.id === "kerja_sambilan"); assert.equal(W.done, true); assert.equal(W.val, `the ${I.tempat}, Saturdays and two evenings`);
  }
  const h = home("akun-kerja", "suportif", 1), c = h.members[0]; c.traits.ambisius = 20; const sink = []; h.view(272, sink);
  assert.deepEqual(at(sink, c, "izin_kerja_sambilan").concat(at(sink, c, "kerja_sambilan")), []);
  assert.ok(!c.info.sambilan && !Remaja.view(c, c.born + 272).some(v => /sambilan/.test(v.id)));
  assert.equal(Remaja.siapa(c, c.born + 250).rows.find(r => r.id === "kerja_sambilan").sub, "not this year");
  assert.ok(!Remaja.upcoming(c, c.born + 214).some(u => u.id === "izin_kerja_sambilan"));
});

test("pagar: dilema terjadwal remaja (aturan rumah, izin kerja, rambut, jalur sesudah lulus) jaraknya >= 14 hari; dicuekin semua = default tanpa hukuman", () => {
  const orig = E.Ctx.prototype.ask;
  for (const akun of AKUN) for (const style of ["suportif", "tegas"]) {
    const h = home(akun, style, 0.85), c = h.members[0]; c.traits.ambisius = 70; const sink = [], gated = [];
    E.Ctx.prototype.ask = function (...a) { const d = this.day - this.c.born; if (this.c.info.dilema_hari === this.day && !gated.includes(d)) gated.push(d); return orig.apply(this, a); };   // ask lain di hari yang sama (acak) nggak dihitung
    try { h.view(272, sink); } finally { E.Ctx.prototype.ask = orig; }
    const g = gated.filter(d => d >= 180);
    assert.ok(g.includes(266) && g.length >= 2, `${akun} ${style} ${g}`);
    for (let i = 1; i < g.length; i++) assert.ok(g[i] - g[i - 1] >= 14, `${akun} ${style} ${g}`);
    assert.ok(g.every(d => d < 270), `${akun} ${g}`);
  }
  const h = home("akun-cuek", "suportif", 0), c = h.members[0]; c.traits.ambisius = 70; const bond = []; const sink = [];
  h.view(179, sink); bond.push(c.bond); h.view(272, sink);
  assert.ok(["tengah"].includes(c.info.aturan_rumah.id) && ["sendiri", "default"].includes(c.info.aturan_rumah.oleh));
  assert.equal(c.info.sambilan_izin.id, "boleh"); assert.ok(["sendiri", "default"].includes(c.info.sambilan_izin.oleh));
  assert.equal(c.info.jalur_oleh, "sendiri");
  assert.ok(!sink.some(l => l.lines.some(t => /punish|grounded/i.test(t))));
});

test("view/siapa/calendar/upcoming: tangga, kartu \"gw siapa\" (judul Class of sesudah lulus), kalender app School, baris Soon pakai kalimat sekolah (ulangan yang sudah diumumkan nggak dobel)", () => {
  const c = home("akun-s").members[0];
  assert.deepEqual(Remaja.upcoming(c, 100), []); assert.deepEqual(Remaja.upcoming(c, 270), []);
  const V = Remaja.view(c, 181); assert.equal(V.length, 7); assert.ok(V.every(v => !v.done && v.at === null && v.note === ""));
  assert.equal(V[0].id, "suara_berubah"); assert.equal(V[0].open, false); assert.equal(Remaja.view(c, 190).find(v => v.id === "suara_berubah").open, true);
  assert.equal(Remaja.next(c, 181).id, "suara_berubah");
  const U = Remaja.upcoming(c, 181);
  assert.deepEqual(U.map(u => u.id), ["suara_berubah", "ulangan_3"]);
  assert.equal(U[1].fixed, true); assert.equal(U[1].key, "sekolah"); assert.equal(U[1].lo, c.born + 205); assert.equal(U[0].lo, c.born + 183); assert.equal(U[0].hi, c.born + 215);
  const mem = { id: c.id, nama: "Mochi", fase: "remaja", umur: 181, born: 0, kid: false, info: {}, st: null };
  const base = { d: 181, cur: { id: c.id, nama: "Mochi" }, members: [mem], phases: E.PHASES, tonggak: U, nameOf: () => "Mochi" };
  const items = Soon.items(base), sk = items.find(i => i.k.startsWith("sekolah:")), tg = items.find(i => i.k.startsWith("tonggak:"));
  assert.equal(sk.tx, "Mochi's first quiz of middle school is in 24 days."); assert.equal(sk.sure, true); assert.equal(sk.go, "school"); assert.match(sk.sub, /whole year group/);
  assert.equal(tg.tx, "Mochi's growth spurt, and a new voice usually comes in 2 to 34 days.");
  // sesudah diumumkan: baris ujian dari c.info.ujian, kalender lompat ke rapor 215
  c.info.ujian = { hari: c.born + 205, belajar: 1, sendiri: 0, jenis: "ulangan", kal: "ulangan_3" };
  const U2 = Remaja.upcoming(c, 203);
  assert.deepEqual(U2.filter(u => u.fixed).map(u => u.id), ["rapor_3"]);
  const both = Soon.items({ ...base, d: 203, members: [{ ...mem, umur: 203, info: { ujian: c.info.ujian } }], tonggak: U2 });
  assert.equal(both.filter(i => /ulangan|ujian/.test(i.k)).length, 1);
  delete c.info.ujian;
  const K = Remaja.calendar(c, 181);
  assert.deepEqual(K.map(k => k.id), ["smp_hari_pertama", "ulangan_3", "rapor_3", "study_tour_berangkat", "ulangan_4", "rapor_4", "pekan_ujian", "ujian_akhir", "pengumuman_lulus", "pesta_kelulusan"]);
  assert.ok(K.every(k => k.day === c.born + Remaja.KALENDER.find(x => x.id === k.id).at && !k.done && k.nilai === null && k.rapor === null));
  // kartu "gw siapa": kosong di awal, keisi dari tonggak, judul angkatan sesudah lulus
  const S0 = Remaja.siapa(c, 181);
  assert.equal(S0.title, "Who Mochi is"); assert.equal(S0.n, 0); assert.equal(S0.teen, true); assert.equal(S0.lulus, null);
  assert.deepEqual(S0.rows.map(r => r.id), ["cita_cita", "hobi_sendiri", "gaya_sendiri", "kota_sendiri", "sahabat", "crew", "kerja_sambilan", "beli_pertama"]);
  assert.equal(S0.rows[0].sub, "usually at 190–215 days old"); assert.equal(S0.rows[4].sub, "none right now");
  c.info.cita = "musician"; (c.info.tonggak ||= {}).cita_cita = c.born + 200; c.fired.kota_sendiri = 1; c.info.tonggak.kota_sendiri = c.born + 210;
  const S1 = Remaja.siapa(c, 220);
  assert.equal(S1.n, 2); assert.deepEqual([S1.rows[0].val, S1.rows[0].sub, S1.rows[3].val], ["future musician", "at 200 days old", "knows the way in, alone"]);
  c.info.lulus = "great"; c.info.jalur = "kuliah";
  const S2 = Remaja.siapa(c, 266);
  assert.equal(S2.title, "Class of 2027: Mochi, future musician"); assert.deepEqual(S2.lulus, { tahun: 2027, nilai: "great", jalur: "kuliah" });
  assert.equal(Remaja.classOf(c), 2027); assert.equal(Remaja.siapa(c, 300).teen, false);
  assert.equal(Remaja.calendar(c, 266).find(k => k.id === "pengumuman_lulus").hasil, "");   // belum fired di objek tiruan ini
});

test("save lama: remaja tanpa catatan: hari pertama SMP dan aturan rumah (tengah, tanpa tanya) menyusul, tonggak menyusul satu per hari di hari kosong, pengumuman basi gugur, rapor tanpa nilai", () => {
  const reset = c => {
    for (const t of Remaja.LIST.concat([Remaja.IZIN, Remaja.PESTA], Remaja.KALENDER)) { delete c.fired[t.id]; delete c.info.tonggak[t.id]; }
    for (const k of ["aturan_rumah", "smp", "cita", "hobi", "gaya", "lonjakan", "pesta_pertama", "pesta_hari", "sambilan", "sambilan_izin", "sambilan_mulai", "sk_hari", "tg_hari", "ujian", "nilai", "jajan_hari"]) delete c.info[k];
    delete c.fired.aturan_rumah; delete c.fired.kerja_sambilan; c.info.dilema_hari = c.born + 100;
  };
  const h = home("akun-o"), c = h.members[0]; h.view(200); reset(c);
  const sink = []; h.view(208, sink);
  const got = sink.flatMap(l => l.events.map(e => [l.day - c.born, e]));
  const of = id => got.filter(([, e]) => e === id).map(([d]) => d);
  assert.deepEqual(of("smp_hari_pertama"), [201]); assert.deepEqual(of("aturan_rumah"), [201]);
  assert.equal(c.info.aturan_rumah.id, "tengah"); assert.equal(c.info.aturan_rumah.oleh, "default");
  assert.ok(!sink.find(l => l.events.includes("aturan_rumah")).lines.some(t => /_Decision:/.test(t)));
  assert.deepEqual(of("ulangan_3_diumumkan"), [202]); assert.deepEqual(of("ujian"), [205]);   // tepat harinya, bukan basi
  const tg = got.filter(([, e]) => Remaja.LIST.some(t => t.id === e) || e === "pesta_pertama"), days = tg.map(([d]) => d);
  assert.equal(new Set(days).size, days.length, JSON.stringify(tg)); assert.ok(days.every(d => d >= 201 && d !== 202 && d !== 205), JSON.stringify(tg));
  const due = Remaja.LIST.concat([Remaja.PESTA]).filter(t => Remaja.dayOf(c, t) <= 203);
  assert.ok(due.length >= 2 && due.every(t => c.fired[t.id]), JSON.stringify(due.map(t => [t.id, Remaja.dayOf(c, t)])));
  // save lama di 206: pengumuman ulangan 3 basi (until 205) gugur, nggak ada ulangan, rapor 215 tanpa nilai
  const h2 = home("akun-o2"), c2 = h2.members[0]; h2.view(206); reset(c2);
  const sink2 = []; h2.view(216, sink2);
  const got2 = sink2.flatMap(l => l.events.map(e => [l.day - c2.born, e]));
  assert.ok(!got2.some(([, e]) => e === "ulangan_3_diumumkan" || e === "ujian"), JSON.stringify(got2));
  assert.deepEqual(got2.filter(([, e]) => e === "smp_hari_pertama").map(([d]) => d), [207]);
  assert.deepEqual(got2.filter(([, e]) => e === "rapor_3").map(([d]) => d), [215]);
  const r = c2.info.rapor.find(r => r.kal === "rapor_3"); assert.equal(r.nilai, null);
  assert.match(sink2.find(l => l.events.includes("rapor_3")).lineAt.rapor_3, /No quiz on record this term/);
  assert.equal(Remaja.calendar(c2, c2.born + 216).find(k => k.id === "ulangan_3").done, false);
});

test("penolakan saran remaja: wali tegas (selalu beda pendapat) ditolak kira-kira 1 dari 5 (15–35%), wali suportif hampir nggak pernah ribut; dashboard nyatet saran_diikuti/saran_ditolak", () => {
  let ya = 0, tidak = 0, dashboard = { saran_diikuti: 0, saran_ditolak: 0 };
  for (let i = 0; i < 24; i++) {
    const { h, c, sink } = run("ukur-" + i, 272, "tegas", 0.85), t = tolak(sink, c);
    ya += t.ya; tidak += t.tidak; dashboard.saran_diikuti += h.stats.saran_diikuti || 0; dashboard.saran_ditolak += h.stats.saran_ditolak || 0;
  }
  const r = tidak / (ya + tidak);
  assert.ok(ya + tidak >= 60, `cuma ${ya + tidak} keputusan`);
  assert.ok(r >= 0.15 && r <= 0.35, `tolak ${Math.round(r * 100)}% (${tidak}/${ya + tidak})`);
  assert.ok(dashboard.saran_diikuti > 0 && dashboard.saran_ditolak > 0 && dashboard.saran_diikuti + dashboard.saran_ditolak >= ya + tidak, JSON.stringify(dashboard));
  let s = { ya: 0, tidak: 0 };
  for (let i = 0; i < 8; i++) { const { c, sink } = run("ukur-s-" + i, 272, "suportif", 0.85), t = tolak(sink, c); s.ya += t.ya; s.tidak += t.tidak; }
  assert.ok(s.tidak <= 2, `suportif ribut ${s.tidak}x`);
});

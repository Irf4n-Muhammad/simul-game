// v82 ilmu.js: pohon jalur (Junior cabang, Intermediate les, Senior panggilan), pengali level match, les tercatat, bintang nyala sendiri.
const test = require("node:test");
const assert = require("node:assert/strict");
require("../engine.js");
require("../storylets.js"); require("../status.js"); const Tree = require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); require("../wants.js"); require("../tonggak.js");
const Ilmu = require("../ilmu.js");
const G = require("../game.js");

const fresh = (akun, from = 0) => ({ akun, nama: "Mochi", aturan: { sekolah: "wajib" }, hadir: [], jawaban: {}, aksi: [], dilihat: -1, tur_pintu: {}, rawat_from: 0, rawat_half: 0, ilmu_from: from, jam: { base_ts: 0, base_day: 0, ms: 86400000 } });
const I0 = v => ({ v, minat: {}, kursus: [], selesai: [] });

test("nilai jalur: cabang yang nggak dipilih berhenti di titik cabangnya", () => {
  const I = I0({ science: 25, lab: 40 });
  assert.equal(Ilmu.eff(I, "lab"), 40);
  assert.equal(Ilmu.eff(I, "science"), 25, "induk mentok di 25");
  assert.equal(Ilmu.eff(I, "medicine"), 25, "Biology tetap 25");
  assert.equal(Ilmu.eff(I, "surgeon"), 25, "panggilan di bawah Biology juga 25");
  assert.equal(Ilmu.eff(I, "data"), 0, "jalur lain nggak kebawa");
  const J = I0({ lab: 30, inventor: 70 });
  assert.equal(Ilmu.eff(J, "science"), 25);
  assert.equal(Ilmu.eff(J, "lab"), 55, "Intermediate kebawa sampai 55 dari panggilannya");
  assert.equal(Ilmu.deepest(J, "science"), "inventor");
});

test("pengali: kelas di bawah tingkat hampir nol (diputusin 8 Nov)", () => {
  assert.equal(Ilmu.matchOf(1, 1), 1);
  assert.equal(Ilmu.matchOf(2, 1), 0.5);
  assert.equal(Ilmu.matchOf(2, 0), 0.2);
  assert.equal(Ilmu.matchOf(1, 2), 0.05);
  assert.equal(Ilmu.matchOf(0, 2), 0);
  assert.equal(Ilmu.matchOf(2, 3), 1, "Master tetap belajar di kelas Senior");
});

test("les: daftar, 8 sesi tiap gelombang, poin masuk ke jalurnya, bintang nyala sendiri, replay sama", () => {
  const st = fresh("akun-il1"), g = new G.Game(st), c = g.home.members[0];
  const d0 = c.born + 70;
  g.advance(d0, null);
  assert.equal(g.act(c.id, "les:science"), true);
  assert.equal(g.act(c.id, "les:science"), false, "sudah daftar");
  const K = c.st.ilmu.kursus[0];
  assert.equal(K.mulai, Ilmu.nextWave(d0));
  // makhluk yang dirawat (kebutuhan dijaga) supaya nggak bolos karena capek
  const run = (gm, cc) => { for (let d = d0 + 1; d <= K.mulai + 30; d++) { Object.assign(cc.needs, { lapar: 80, energi: 80, kebersihan: 80, mood: 80 }); gm.advance(d, null); } };
  run(g, c);
  assert.equal(K.n, 8); assert.equal(K.bolos, 0);
  const v = Ilmu.eff(c.st.ilmu, "science");
  assert.ok(v > 8 && v <= 25, `Science naik: ${v}`);
  assert.ok(c.st.tree.have.includes("science") && c.st.tree.have.includes("mind"), "cabang dan akar nyala tanpa poin");
  const g2 = new G.Game(JSON.parse(JSON.stringify(st))), c2 = g2.home.members[0]; g2.advance(d0, null); run(g2, c2);
  assert.deepEqual(g2.home.members[0].st.ilmu.v, c.st.ilmu.v);
});

test("save lama: sebelum ilmu_from nggak ada yang berubah", () => {
  const a = new G.Game({ ...fresh("akun-il2"), ilmu_from: null }), b = new G.Game(fresh("akun-il2", 400));
  a.advance(300, null); b.advance(300, null);
  assert.deepEqual(a.home.members[0].st.tree.have, b.home.members[0].st.tree.have);
  assert.equal(b.act(b.home.members[0].id, "les:science"), false, "les belum hidup");
});

test("katalog: Senior belum kelihatan buat Junior, rekomendasi kelas yang pas", () => {
  const g = new G.Game(fresh("akun-il3")), c = g.home.members[0];
  g.advance(c.born + 70, null);
  const cat = Ilmu.catalog(c, c.born + 70);
  assert.ok(cat.some(k => k.id === "science") && cat.some(k => k.id === "lab"));
  assert.ok(!cat.some(k => k.lvl === 2), "panggilan belum muncul");
  const R = Ilmu.recommend(c, c.born + 70);
  assert.ok(R.length && R.every(k => k.lvl === 0));
  assert.equal(Object.keys(Ilmu.COURSES).length, 10 + 20, "les cuma sampai Intermediate");
  assert.equal(Tree.NODES.inventor.label, "Organic chemist");
});

test("Organic chemist ikut les Chemistry: nggak dapat apa-apa (les berhenti di Intermediate); les Science ×0; les Biology jalan sendiri", () => {
  const c = { id: "x", st: { genes: { talent: { logic: 5, fitness: 5, charm: 5, creativity: 5 } }, ilmu: I0({ science: 25, lab: 30, inventor: 60 }) } };
  const a = Ilmu.preview(c, "lab");
  assert.equal(a.target, null); assert.equal(a.per, 0);
  assert.equal(Ilmu.preview(c, "science").match, 0);
  const b = Ilmu.preview(c, "medicine");
  assert.equal(b.target, "medicine", "Biology jalan sendiri dari 25"); assert.equal(b.v, 25);
  assert.equal(Ilmu.COURSES.inventor, undefined, "nggak ada les Senior");
});

test("dilema berhenti les: minat jatuh, makhluk minta keluar sekali per kursus; berhenti = sisa sesi hangus", () => {
  const go = () => {
    const st = fresh("akun-il4"), g = new G.Game(st), c = g.home.members[0], d0 = c.born + 120;
    g.advance(d0, null);
    assert.equal(g.act(c.id, "les:science"), true);
    const K = c.st.ilmu.kursus[0];
    for (let d = d0 + 1; d <= K.mulai + 30; d++) {
      Object.assign(c.needs, { lapar: 80, energi: 80, kebersihan: 80, mood: 80 });
      c.st.ilmu.minat.science = Math.min(c.st.ilmu.minat.science ?? 10, 10);
      g.advance(d, null);
    }
    return { c, K };
  };
  const { c, K } = go();
  assert.ok(K.tanya, "dilemanya muncul");
  assert.equal(K.n, 8);
  const quit = c.st.ilmu.selesai.find(s => s.id === "science");
  if (K.stop) assert.ok(quit.stop && K.stop === K.tanya);
  else assert.ok(!quit.stop, "kalau lanjut, kursusnya selesai biasa");
  const b = go();
  assert.deepEqual(b.K, K, "replay sama");
});

test("Senior dari kuliah dan kerja: pilih jurusan dari jalur yang dijalani, kuliah naik pelan, kerja dan promosi nambah", () => {
  const c = { id: "y", info: {}, st: { genes: { talent: { logic: 7, fitness: 5, charm: 5, creativity: 5 } }, ilmu: I0({ science: 25, lab: 55, data: 30 }) } };
  const M = Ilmu.majors(c);
  assert.equal(M[0].spec, "lab"); assert.equal(M.length, 3);
  assert.ok(["inventor", "naturalist"].includes(M[0].id));
  c.st.ilmu.jur = M[0].id;
  assert.equal(Ilmu.workNiche(c, "software") !== null, true);
});

test("pilih_jurusan muncul sekali waktu kuliah, nilai jurusan naik selama kuliah, replay sama", () => {
  const go = () => {
    const st = fresh("akun-il5"), g = new G.Game(st), c = g.home.members[0];
    g.advance(c.born + 280, null);
    c.st.ilmu = c.st.ilmu || I0({}); Object.assign(c.st.ilmu.v, { science: 25, lab: 55 });
    c.info.kuliah_aktif = true; c.info.siap_kerja = c.born + 600;
    for (let d = c.born + 281; d <= c.born + 380; d++) { Object.assign(c.needs, { lapar: 80, energi: 80, kebersihan: 80, mood: 80 }); g.advance(d, null); }
    return c.st.ilmu;
  };
  const I = go();
  assert.ok(I.jur, "jurusan kepilih");
  assert.ok(I.v[I.jur] > 60 && I.v[I.jur] <= 84, `naik dari kuliah: ${I.v[I.jur]}`);
  assert.deepEqual(go().v, I.v);
});

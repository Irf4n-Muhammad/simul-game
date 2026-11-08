// v83 jadwal.js: pemain ngisi blok waktu bebas; makhluk bisa nolak; topik nambah sedikit ke jalurnya; replay sama.
const test = require("node:test");
const assert = require("node:assert/strict");
require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); require("../wants.js"); require("../tonggak.js");
const Ilmu = require("../ilmu.js");
const J = require("../jadwal.js");
const G = require("../game.js");

const fresh = (akun, from = 0) => ({ akun, nama: "Mochi", aturan: { sekolah: "wajib" }, hadir: [], jawaban: {}, aksi: [], dilihat: -1, tur_pintu: {}, rawat_from: 0, rawat_half: 0, ilmu_from: from, jam: { base_ts: 0, base_day: 0, ms: 86400000 } });
const care = c => Object.assign(c.needs, { lapar: 80, energi: 80, kebersihan: 80, mood: 80 });

test("pasang rencana: cuma blok bebas, kegiatan yang ada", () => {
  const g = new G.Game(fresh("akun-j1")), c = g.home.members[0], d0 = c.born + 100;
  g.advance(d0, null);
  assert.equal(g.act(c.id, "jadwal:6pagi:t.gambar"), true);
  assert.equal(g.act(c.id, "jadwal:2sore:t.catur"), true);
  assert.equal(g.act(c.id, "jadwal:2pagi:t.catur"), false, "Selasa pagi sekolah");
  assert.equal(g.act(c.id, "jadwal:6sore:t.nggakada"), false);
  assert.equal(g.act(c.id, "jadwal:6pagi:"), true, "kosongin = terserah makhluknya");
  assert.deepEqual(c.info.jadwal, { "2sore": "t.catur" });
});

test("rencana jalan tiap minggu, kadang ditolak, gambar naik sedikit dan mentok 35; replay sama", () => {
  const go = () => {
    const g = new G.Game(fresh("akun-j2")), c = g.home.members[0], d0 = c.born + 100;
    g.advance(d0, null);
    for (const k of ["6pagi", "6siang", "6sore", "0pagi", "0siang", "0sore", "1sore", "3sore"]) g.act(c.id, `jadwal:${k}:t.gambar`);
    for (let d = d0 + 1; d <= d0 + 140; d++) { care(c); g.advance(d, null); }
    return c;
  };
  const c = go(), I = c.st.ilmu;
  assert.ok(I.v.painting > 8 && I.v.painting <= J.CAP, `Drawing naik: ${I.v.painting}`);
  assert.deepEqual(go().st.ilmu.v, I.v);
});

test("blok les nggak bisa diisi kegiatan: les yang jalan", () => {
  const g = new G.Game(fresh("akun-j3")), c = g.home.members[0], d0 = c.born + 120;
  g.advance(d0, null);
  g.act(c.id, "les:science");
  g.act(c.id, "jadwal:1sore:t.gambar");
  const S = Ilmu.schedule(c.st.ilmu.kursus[0]);
  for (let d = d0 + 1; d <= S[0]; d++) { care(c); g.advance(d, null); }
  assert.equal(c.info.agenda_hari.id, "les");
  assert.equal(c.st.ilmu.kursus[0].n, 1);
});

test("rekomendasi: topik yang lagi diles naik ke atas", () => {
  const g = new G.Game(fresh("akun-j4")), c = g.home.members[0], d0 = c.born + 120;
  g.advance(d0, null);
  g.act(c.id, "les:art");
  const R = J.recommend(c, d0 + 6, "pagi", 3);
  assert.equal(R.length, 3);
  assert.ok(R.some(r => ["t.gambar", "t.desain"].includes(r.id)), JSON.stringify(R.map(r => r.id)));
});

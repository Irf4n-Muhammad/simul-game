// Pertanyaan harian (obrolan.js, v48): pembuka per fase, bayi lewat keadaan, sekali sehari, aksi tanya:… di-replay sama.
const test = require("node:test");
const assert = require("node:assert/strict");
require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const O = require("../obrolan.js");
const G = require("../game.js");

const S = (over = {}) => ({ d: 120, cid: "m1", nama: "Mochi", fase: "anak", seed: "akun-1", traits: {}, last: null, ctx: { ujian: null, sahabat: null, dunia: null }, ...over });

test("daftar: id unik, tiap pilihan menggeser satu sifat yang dikenal dan punya reaksi", () => {
  const all = Object.values(O.BANK).flat().concat(O.CTX);
  const ids = all.map(q => q.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const q of all) {
    assert.ok(q.opts.length >= 2 && q.opts.length <= 3, q.id);
    for (const x of q.opts) { assert.match(x.t, /^[a-z]+[+-]$/, q.id); assert.ok(O.TRAITS.includes(x.t.slice(0, -1)), `${q.id}.${x.k}`); assert.ok(x.r && x.label, `${q.id}.${x.k}`); }
  }
  for (const f of ["bayi", "anak", "remaja", "dewasa", "tua"]) assert.ok(O.size(f) >= 6, f);
});

test("bayi nggak ngomong: pembukanya keadaan, reaksinya tindakan dalam bintang", () => {
  for (let d = 0; d < 30; d++) {
    const q = O.opener(S({ d, fase: "bayi" }));
    assert.equal(q.mode, "keadaan"); assert.ok(!/\?$/.test(q.text), q.text);
    for (const x of q.opts) assert.match(O.react(S({ fase: "bayi" }), q.id, x.k), /^\*.*\*$/);
  }
});

test("sekali sehari, dan satu siklus daftar nggak ada yang terulang", () => {
  assert.equal(O.opener(S({ last: 120 })), null);
  const n = O.size("anak"), seen = new Set();
  let ctx = 0;
  for (let d = 0; d < 60 && seen.size < n; d++) { const q = O.opener(S({ d })); if (q.id.startsWith("x_")) { ctx++; continue; } seen.add(q.id); }
  assert.equal(seen.size, n);
  assert.equal(ctx, 0);   // tanpa konteks, pertanyaan konteks nggak muncul
});

test("pertanyaan konteks: ujian dekat dan sahabat muncul sebagian hari", () => {
  let u = 0, s = 0;
  for (let d = 0; d < 100; d++) {
    const q = O.opener(S({ d, ctx: { ujian: { hari: d + 2, label: "spelling quiz" }, sahabat: "Pip", dunia: null } }));
    if (q.id === "x_ujian") { u++; assert.ok(q.text.includes("spelling quiz")); }
    if (q.id === "x_sahabat") { s++; assert.ok(q.text.includes("Pip")); }
  }
  assert.ok(u > 15 && u < 70, `ujian ${u}`); assert.ok(s > 5, `sahabat ${s}`);
});

test("aksi: act -> parse bolak-balik, kunci asing ditolak", () => {
  const q = O.opener(S());
  const k = O.act(q.id, q.opts[0]);
  const P = O.parse(k);
  assert.equal(P.id, q.id); assert.equal(P.trait + (P.sign > 0 ? "+" : "-"), q.opts[0].t);
  assert.equal(O.parse("tanya:x:galak+"), null); assert.equal(O.parse("ngobrol"), null);
});

test("game.js: jawaban menggeser sifat sedikit, sekali sehari, dan replay sama persis", () => {
  const st = () => ({ akun: "akun-uji", nama: "Mochi", aturan: { sekolah: "wajib" }, hadir: [], jawaban: {}, aksi: [], dilihat: -1, tur_pintu: {}, rawat_from: 0, rawat_half: 0, jam: { base_ts: 0, base_day: 0, ms: 86400000 } });
  const s1 = st(), g = new G.Game(s1);
  g.advance(100, null);   // tanpa hari hidup: dilema nggak menunggu
  const c = g.home.members[0], before = c.traits.ramah;
  assert.equal(g.act(c.id, "tanya:a_pr:ramah+"), true);
  assert.equal(g.act(c.id, "tanya:a_pr:ramah+"), false);   // sekali sehari
  assert.ok(Math.abs(c.traits.ramah - before - O.STEP) < 1e-9, `${before} -> ${c.traits.ramah}`);
  g.advance(130, null);
  const g2 = new G.Game(JSON.parse(JSON.stringify(s1)));
  g2.advance(130, null);
  assert.deepEqual(g2.home.members[0].traits, g.home.members[0].traits);
  assert.deepEqual(g2.home.members[0].info.tanya_log, g.home.members[0].info.tanya_log);
});

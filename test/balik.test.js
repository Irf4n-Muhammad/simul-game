// Rawat terbalik (balik.js): kapan makhluk bertanya, pertanyaan bergilir, reaksi ikut sifat.
const test = require("node:test");
const assert = require("node:assert/strict");
const Balik = require("../balik.js");

const S = (over = {}) => ({ d: 100, cur: { nama: "Mochi", fase: "anak" }, since: 0, last: null, seed: "akun-1", traits: {}, ...over });

test("daftar pertanyaan: id unik, tiga pilihan, reaksi base untuk tiap pilihan", () => {
  const ids = Balik.Q.map(q => q.id);
  assert.equal(new Set(ids).size, ids.length); assert.ok(Balik.Q.length >= 6);
  for (const q of Balik.Q) {
    assert.equal(q.opts.length, 3, q.id); assert.ok(q.ic && q.q("Mochi").startsWith("Mochi asks: "), q.id);
    for (const [k] of q.opts) { assert.ok(q.react[k] && typeof q.react[k].base === "function", `${q.id}.${k}`); assert.ok(q.react[k].base("Mochi").length > 3); }
    for (const R of Object.values(q.react)) for (const k of Object.keys(R)) assert.ok(k === "base" || Balik.TRAITS.includes(k), `${q.id}: ${k}`);
  }
});

test("belum waktunya: minggu pertama, bayi, makhluk pergi, baru dijawab", () => {
  assert.equal(Balik.due(S({ d: 6 })), null);
  assert.equal(Balik.due(S({ d: 20, since: 15 })), null);
  assert.equal(Balik.due(S({ cur: { nama: "Mochi", fase: "bayi" } })), null);
  for (const fase of ["meninggal", "merantau"]) assert.equal(Balik.due(S({ cur: { nama: "Mochi", fase } })), null);
  assert.equal(Balik.due(S({ last: 95 })), null);
  assert.equal(Balik.due(S({ cur: null })), null);
});

test("waktunya: tiap 7 hari sejak jawaban terakhir; pertanyaan bergilir per minggu dan beda per akun", () => {
  const a = Balik.due(S()); assert.ok(a && a.id && a.opts.length === 3 && a.q.startsWith("Mochi asks: "));
  assert.ok(Balik.due(S({ last: 93 })));
  const b = Balik.due(S({ d: 107 }));
  assert.notEqual(a.id, b.id, "minggu berikutnya pertanyaan lain");
  const seen = new Set(); for (let w = 0; w < Balik.Q.length; w++) seen.add(Balik.due(S({ d: 100 + 7 * w })).id);
  assert.equal(seen.size, Balik.Q.length, "semua pertanyaan kebagian dalam satu putaran");
  const other = Balik.due(S({ seed: "akun-2" })), same = Balik.due(S({ seed: "akun-1" }));
  assert.equal(same.id, a.id);
  assert.ok(other.id !== a.id || Balik.due(S({ seed: "akun-3" })).id !== a.id, "urutan beda per akun");
  // opts adalah salinan: mengubahnya tidak merusak daftar
  a.opts[0][1] = "x"; assert.notEqual(Balik.due(S()).opts[0][1], "x");
});

test("reaksi: base kalau sifat biasa, varian kalau satu sifat menonjol, null kalau id/jawaban salah", () => {
  assert.equal(Balik.react(S(), "makan", "ya"), "Good. Me too.");
  assert.equal(Balik.react(S({ traits: { ramah: 80 } }), "makan", "ya"), "Good. Next time tell me what you had.");
  assert.equal(Balik.react(S({ traits: { ramah: 55 } }), "makan", "ya"), "Good. Me too.", "55 belum menonjol");
  assert.equal(Balik.react(S({ traits: { ramah: 70, kreatif: 90 } }), "makan", "ya"), "Good. I'm imagining something with noodles.", "yang paling tinggi menang");
  assert.equal(Balik.react(S({ traits: { ambisius: 99 } }), "makan", "belum"), "Go eat something. I'll wait here.", "sifat tanpa varian: base");
  assert.equal(Balik.react(S(), "makan", "apa"), null); assert.equal(Balik.react(S(), "x", "ya"), null);
});

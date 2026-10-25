// Daftar keinginan aktif untuk UI (wants.js Wants.active): Bagian 9 dokumen awam.
const test = require("node:test");
const assert = require("node:assert/strict");
const Wants = require("../wants.js");

const plain = Wants.CATALOG.find(w => !w.label2 && !w.measure);
const big = Wants.CATALOG.find(w => w.besar && !w.label2);

test("katalog punya isi, dan ada keinginan besar", () => {
  assert.ok(Wants.CATALOG.length >= 30, `katalog ${Wants.CATALOG.length}`);
  assert.ok(plain && big);
});

test("tanpa keinginan: daftar kosong", () => {
  assert.deepEqual(Wants.active({ info: {} }, 10, null), []);
});

test("keinginan aktif dipetakan: label, umur hari, hit, besar, n", () => {
  const c = { info: { keinginan: { aktif: [{ id: plain.id, sejak: 10, hit: 2 }, { id: big.id, sejak: 12, hit: 0 }], selesai: {}, riwayat: [] } } };
  const [a, b] = Wants.active(c, 15, null);
  assert.equal(a.id, plain.id); assert.equal(a.label, plain.label); assert.equal(a.ic, plain.ic);
  assert.equal(a.days, 5); assert.equal(a.hit, 2); assert.equal(a.besar, !!plain.besar); assert.equal(a.n, plain.n || 1);
  assert.equal(b.id, big.id); assert.equal(b.besar, true); assert.equal(b.days, 3);
});

test("id yang tidak ada di katalog tetap tampil apa adanya", () => {
  const c = { info: { keinginan: { aktif: [{ id: "zzz", sejak: 1, hit: 0 }], selesai: {}, riwayat: [] } } };
  const [a] = Wants.active(c, 4, null);
  assert.equal(a.label, "zzz"); assert.equal(a.ic, "✨"); assert.equal(a.n, 1); assert.equal(a.besar, false);
});

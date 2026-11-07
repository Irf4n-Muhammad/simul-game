// Tes Buku Bintang (rasi.js): 12 bintang unik, urutan bakat, seri, tahap buku, segel.
const test = require("node:test");
const assert = require("node:assert");
const R = require("../rasi.js");

const st = (t, s = {}) => ({ genes: { talent: { fitness: 5, logic: 5, creativity: 5, charm: 5, ...t } }, skills: { fitness: 0, logic: 0, creativity: 0, charm: 0, ...s } });

test("ada 12 bintang, satu per pasangan akar berurutan, nama dan id unik", () => {
  const keys = [];
  for (const a of R.ORDER) for (const b of R.ORDER) if (a !== b) keys.push(a + ">" + b);
  assert.strictEqual(keys.length, 12);
  for (const k of keys) assert.ok(R.STARS[k], k);
  assert.strictEqual(new Set(Object.values(R.STARS).map(s => s.id)).size, 12);
  assert.strictEqual(new Set(Object.values(R.STARS).map(s => s.fig)).size, 12);
});

test("bintang = dua bakat tertinggi, urutan dihitung", () => {
  assert.strictEqual(R.starOf(st({ logic: 9, creativity: 7 })).name, "Canopus");
  assert.strictEqual(R.starOf(st({ creativity: 9, logic: 7 })).name, "Deneb");
  assert.strictEqual(R.starOf(st({ charm: 8, fitness: 6 })).name, "Capella");
});

test("seri dipecah oleh skill, lalu urutan tetap", () => {
  assert.strictEqual(R.starOf(st({ logic: 8, charm: 8 }, { charm: 20 })).key, "heart>mind");
  assert.strictEqual(R.starOf(st({ logic: 8, charm: 8 })).key, "mind>heart");
  assert.strictEqual(R.starOf(st({})).key, "body>mind");
});

test("buku catatan sampai umur 30, lalu dibaca", () => {
  assert.strictEqual(R.stage(10, 39), "notebook");
  assert.strictEqual(R.stage(10, 40), "read");
  assert.strictEqual(R.stage(10, 280), "called");
  assert.ok(R.isRead(10, 280) && !R.isRead(10, 39));
  assert.strictEqual(R.daysToReading(10, 25), 15);
  assert.strictEqual(R.daysToReading(10, 90), 0);
});

test("segel: akar bintang pertama dan kedua, sisanya masih hangat; tidak ada segel sebelum pembacaan", () => {
  const s = st({ logic: 9, creativity: 7 });
  assert.strictEqual(R.seal(s, "mind", 0, 5), "none");
  assert.strictEqual(R.seal(s, "mind", 0, 30), "first");
  assert.strictEqual(R.seal(s, "spark", 0, 30), "second");
  assert.strictEqual(R.seal(s, "body", 0, 30), "warm");
});

test("angka romawi", () => {
  assert.strictEqual(R.roman(61), "LXI");
  assert.strictEqual(R.roman(84), "LXXXIV");
  assert.strictEqual(R.roman(270), "CCLXX");
});

test("panggilan: bintang paling dalam, seri dipecah oleh yang terakhir ditulis", () => {
  const N = { a: { tier: "field" }, b: { tier: "spec" }, c: { tier: "niche" }, d: { tier: "niche" }, r: { tier: "root" } };
  assert.strictEqual(R.callingOf({ tree: { have: ["r", "a", "b"], days: { r: 1, a: 2, b: 3 } } }, N), "b");
  assert.strictEqual(R.callingOf({ tree: { have: ["c", "d", "a"], days: { c: 9, d: 5, a: 1 } } }, N), "c");
  assert.strictEqual(R.callingOf({ tree: { have: ["r"], days: {} } }, N), null);
});

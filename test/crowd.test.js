// Tes keramaian bidang (career.js): pelan, dibatasi, bereaksi ke pendatang nyata, gaji awal dikunci saat diterima.
const test = require("node:test");
const assert = require("node:assert");
const C = require("../career.js");
const ST = require("../status.js");

test("tingkat cuma -1, 0, 1 dan paling banyak geser satu langkah per bulan", () => {
  for (const ind of Object.keys(C.IND)) {
    let prev = C.crowdLevel(ind, 30);
    for (let m = 2; m < 60; m++) {
      const l = C.crowdLevel(ind, m * 30);
      assert.ok([-1, 0, 1].includes(l), ind);
      assert.ok(Math.abs(l - prev) <= 1, `${ind} bulan ${m}`);
      prev = l;
    }
  }
});

test("tetap sepanjang satu bulan", () => {
  for (const ind of Object.keys(C.IND)) for (let m = 1; m < 20; m++) assert.strictEqual(C.crowdLevel(ind, m * 30), C.crowdLevel(ind, m * 30 + 29));
});

test("pendatang nyata mendorong bidang jadi ramai", () => {
  const base = Array.from({ length: 30 }, (_, m) => C.crowdLevel("teacher", (m + 1) * 30)).reduce((a, b) => a + b, 0);
  C.setCrowdFeed(ind => ind === "teacher" ? 4 : 0);
  const pushed = Array.from({ length: 30 }, (_, m) => C.crowdLevel("teacher", (m + 1) * 30)).reduce((a, b) => a + b, 0);
  C.setCrowdFeed(null);
  assert.ok(pushed > base, `${pushed} > ${base}`);
});

test("gaji awal ikut keramaian dan terkunci di pekerjaan", () => {
  const job = { id: "nurse", level: 0, co: null };
  assert.strictEqual(ST.salary({ ...job, crowd: 1.2 }), Math.round(ST.salary(job) * 1.2));
  assert.strictEqual(ST.salary({ ...job, level: 1, crowd: 0.9 }), Math.round(ST.salary({ ...job, level: 1 }) / 1 * 0.9));
});

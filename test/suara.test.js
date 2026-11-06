// v77: suara kota (suara.js): campuran volume dari cuaca, jam, zoom, dan jarak ke pasar. Bunyinya sendiri butuh browser.
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../suara.js");

test("campuran: hujan cuma pas hujan, burung pagi, jangkrik malam, pasar cuma dekat pasar, peta lebih sepi", () => {
  const m = (o) => S.mixOf(Object.assign({ wx: "clear", period: "day", zoom: 0.25, fair: 0 }, o));
  assert.equal(m({}).rain, 0); assert.ok(m({ wx: "rain" }).rain > 0.4); assert.ok(m({ wx: "storm" }).rain > m({ wx: "rain" }).rain);
  assert.ok(m({ period: "morning" }).birds > m({}).birds); assert.equal(m({ wx: "rain", period: "morning" }).birds, 0);
  assert.equal(m({}).crickets, 0); assert.ok(m({ period: "night" }).crickets > 0);
  assert.equal(m({}).crowd, 0); assert.ok(m({ fair: 1 }).crowd > 0.5);
  assert.ok(m({ zoom: 0.95 }).traffic < m({}).traffic); assert.ok(m({ period: "night" }).traffic < m({}).traffic);
  for (const k of Object.keys(m({}))) for (const o of [{}, { wx: "storm", fair: 1 }, { period: "night", zoom: 0 }]) { const v = m(o)[k]; assert.ok(v >= 0 && v <= 1, k); }
});

test("bel sekolah: jam 8 dan jam 2 hari sekolah, bukan akhir pekan", () => {
  assert.equal(S.bellDue(new Date(2026, 10, 2, 8, 0)), true);    // Senin
  assert.equal(S.bellDue(new Date(2026, 10, 2, 14, 0)), true);
  assert.equal(S.bellDue(new Date(2026, 10, 2, 8, 1)), false);
  assert.equal(S.bellDue(new Date(2026, 10, 1, 8, 0)), false);   // Minggu
});

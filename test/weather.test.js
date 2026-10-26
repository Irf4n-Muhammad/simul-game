// Cuaca nyata sebagai kulit (weather.js): kode WMO -> kulit, zona waktu -> kota, URL, bentuk jawaban, cache.
const test = require("node:test");
const assert = require("node:assert/strict");
const W = require("../weather.js");

test("kode WMO -> enam kulit langit; yang tidak dikenal jadi cerah", () => {
  const S = Object.fromEntries([[0, "clear"], [1, "clear"], [2, "cloud"], [3, "cloud"], [45, "fog"], [48, "fog"], [51, "rain"], [61, "rain"], [67, "rain"], [80, "rain"], [82, "rain"],
    [71, "snow"], [77, "snow"], [85, "snow"], [86, "snow"], [95, "storm"], [99, "storm"], [123, "clear"], [-1, "clear"], ["x", "clear"], [undefined, "clear"]]);
  for (const [code, skin] of Object.entries(S)) assert.equal(W.skin(code === "undefined" ? undefined : code), skin, `kode ${code}`);
  for (const s of W.SKINS) assert.ok(W.LABEL[s], s);
  assert.equal(W.label("rain"), "Rain"); assert.equal(W.label("apa"), "Clear");
});

test("zona waktu -> kota: Jakarta ada, nama kota dari zona, yang tidak ada null", () => {
  assert.deepEqual(W.place("Asia/Jakarta"), [-6.2, 106.8]);
  assert.equal(W.cityOf("America/Argentina/Buenos_Aires"), "Buenos Aires");
  assert.equal(W.place("Mars/Olympus"), null); assert.equal(W.cityOf("Mars/Olympus"), null); assert.equal(W.cityOf(null), null);
  // place memberi salinan, bukan tabelnya
  const p = W.place("Asia/Tokyo"); p[0] = 0; assert.equal(W.ZONES["Asia/Tokyo"][0], 35.7);
  for (const [tz, [lat, lon]] of Object.entries(W.ZONES)) { assert.ok(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180, tz); assert.match(tz, /^[A-Za-z]+\/[A-Za-z_]+(\/[A-Za-z_]+)?$/); }
});

test("URL Open-Meteo: koordinat dibulatkan satu desimal, minta kode cuaca dan siang/malam", () => {
  assert.equal(W.url(-6.2088, 106.8456), "https://api.open-meteo.com/v1/forecast?latitude=-6.2&longitude=106.8&current=weather_code,is_day");
  assert.equal(W.round1(51.4567), 51.5);
});

test("jawaban: bentuk Open-Meteo dibaca, yang lain null", () => {
  assert.deepEqual(W.parse({ current: { weather_code: 61, is_day: 1 } }), { code: 61, isDay: true });
  assert.deepEqual(W.parse({ current: { weather_code: "3", is_day: 0 } }), { code: 3, isDay: false });
  assert.deepEqual(W.parse({ current: { weather_code: 0 } }), { code: 0, isDay: null });
  assert.equal(W.parse({ current: {} }), null); assert.equal(W.parse(null), null); assert.equal(W.parse({ error: true }), null);
});

test("cache segar kalau umurnya di bawah TTL dan tidak dari masa depan", () => {
  const T = 1000000;
  assert.equal(W.fresh({ t: T - 10 }, T, 3600000), true);
  assert.equal(W.fresh({ t: T - 3600001 }, T, 3600000), false);
  assert.equal(W.fresh({ t: T + 5 }, T, 3600000), false, "jam mundur: anggap basi");
  assert.equal(W.fresh(null, T, 3600000), false); assert.equal(W.fresh({}, T, 3600000), false);
});

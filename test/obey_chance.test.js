// Peluang menurut (engine.js Ctx.obey_chance): angka yang dipakai Bagian 5 dokumen awam.
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");

function obey(bond, patuh, phase) {
  const x = Object.create(E.Ctx.prototype);
  x.c = { bond, traits: { patuh } };
  x.phase = phase;
  return x.obey_chance();
}

test("ikatan 50, patuh 50: bayi 83%, anak 66%, remaja 49%, dewasa 40,5%, tua 36,25%", () => {
  const exp = { bayi: 0.83, anak: 0.66, remaja: 0.49, dewasa: 0.405, tua: 0.3625 };
  for (const [ph, v] of Object.entries(exp)) assert.ok(Math.abs(obey(50, 50, ph) - v) < 1e-9, `${ph}: ${obey(50, 50, ph)}`);
});

test("ikatan 90, patuh 50, dewasa: sekitar 52%", () => {
  assert.equal(Math.round(obey(90, 50, "dewasa") * 100), 52);
});

test("rumus: 15% + 85% x (ikatan 55% + patuh 45%) x pengali umur, dijepit 0..1", () => {
  const mult = { bayi: 1.6, anak: 1.2, remaja: 0.8, dewasa: 0.6, tua: 0.5 };
  for (const ph of Object.keys(mult)) for (const b of [0, 30, 50, 80, 100]) for (const p of [0, 50, 100]) {
    const want = Math.min(1, 0.15 + 0.85 * (b / 100 * 0.55 + p / 100 * 0.45) * mult[ph]);
    assert.ok(Math.abs(obey(b, p, ph) - want) < 1e-9, `${ph} ikatan ${b} patuh ${p}`);
  }
});

test("tidak pernah di bawah 15%, dan ikatan selalu menaikkan peluang", () => {
  for (const ph of ["bayi", "anak", "remaja", "dewasa", "tua"]) {
    assert.ok(obey(0, 0, ph) >= 0.15 - 1e-12);
    assert.ok(obey(80, 50, ph) > obey(20, 50, ph));
  }
});

// Jadwal majalah (mag.js Mag.issueDay / latest): edisi baru setiap tanggal 1, Bagian 14 dokumen awam.
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
const Mag = require("../mag.js");

test("edisi 0 terbit hari 0; edisi 1 pada tanggal 1 bulan berikutnya", () => {
  assert.equal(Mag.issueDay(0), 0);
  assert.equal(Mag.issueDay(-3), 0);
  const S0 = new Date(E.START_DATE);
  const first = Math.round((Date.UTC(S0.getUTCFullYear(), S0.getUTCMonth() + 1, 1) - E.START_DATE) / 864e5);
  assert.equal(Mag.issueDay(1), first);
});

test("jarak antar edisi 28 sampai 31 hari dan selalu naik", () => {
  for (let k = 1; k < 60; k++) {
    const gap = Mag.issueDay(k + 1) - Mag.issueDay(k);
    assert.ok(gap >= 28 && gap <= 31, `edisi ${k}: jarak ${gap}`);
  }
});

test("latest(hari) = edisi terakhir yang sudah terbit", () => {
  for (const d of [0, 1, 15, 31, 60, 100, 365, 730, 1000, 1460]) {
    const k = Mag.latest(d);
    assert.ok(Mag.issueDay(k) <= d && d < Mag.issueDay(k + 1), `hari ${d}: edisi ${k}`);
  }
});

// Tabel penolakan saran untuk makhluk dewasa (game.js Game._refuse): angka yang dipakai Bagian 6 dokumen awam.
// Undian ditanam dari (id makhluk, hari, jenis saran), jadi tabel diukur dengan menyapu banyak hari dan membandingkan frekuensinya.
const test = require("node:test");
const assert = require("node:assert/strict");
require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const G = require("../game.js");

const TRAITS = { patuh: 50, impulsif: 50, ambisius: 50, rajin: 50, penakut: 50, ramah: 50 };
function creature(id, over = {}) {
  return { id, name: "Uji", born: 0, alive: () => true, bond: 50, traits: { ...TRAITS }, info: {}, st: null, ...over };
}
// frekuensi penolakan untuk satu jenis saran, 4 makhluk x 600 hari dewasa (umur 300-899)
function rate(kind, over = {}) {
  let n = 0, no = 0;
  for (const id of ["a", "b", "c", "d"]) {
    const c = creature("uji-" + id, over);
    const fake = { home: { get: () => c } };
    for (let d = 300; d < 900; d++) {
      c.info = { ...(over.info || {}) };
      n++;
      if (G.Game.prototype._refuse.call(fake, c.id, kind, d)) no++;
    }
  }
  return no / n;
}
const TOL = 0.04; // 2400 undian: simpangan baku sekitar 1%

test("tabel Bagian 6 (ikatan 50, patuh 50, sifat rata-rata)", () => {
  const table = {
    "rencana:hobi": 0.375,          // rencana harian dewasa  38%
    "apply:nurse": 0.35,            // lamar kerja            35%
    "pasar:beli:lamp": 0.383,       // beli barang            38%
    "biz:suggest:cafe": 0.35,       // buka bisnis            35%
    "biz:price:premium": 0.18,      // keputusan di bisnisnya 18%
    "kerja:shift:day": 0.16,        // urusan di tempat kerja 16%
    "pet:adopt:fish@shelter": 0.275,// adopsi hewan           28%
    "pet:food:premium": 0.125,      // merawat hewan          13%
  };
  for (const [k, p] of Object.entries(table)) {
    const r = rate(k);
    assert.ok(Math.abs(r - p) < TOL, `${k}: terukur ${r.toFixed(3)}, tabel ${p}`);
  }
});

test("sudah punya kerja: lamar kerja lebih sering ditolak (+10%)", () => {
  const r = rate("apply:nurse", { st: { job: { id: "nurse", level: 0 } } });
  assert.ok(Math.abs(r - 0.45) < TOL, r.toFixed(3));
});

test("luka bangkrut: beli dan buka bisnis +15%; luka PHK: lamar kerja -12%", () => {
  assert.ok(Math.abs(rate("pasar:beli:lamp", { info: { bekas: { bangkrut: true } } }) - 0.533) < TOL);
  assert.ok(Math.abs(rate("biz:suggest:cafe", { info: { bekas: { bangkrut: true } } }) - 0.5) < TOL);
  assert.ok(Math.abs(rate("apply:nurse", { info: { bekas: { phk: true } } }) - 0.23) < TOL);
});

test("hasil selalu dijepit 3%..80%", () => {
  // ikatan dan patuh penuh: penolakan rencana turun ke 0,45 - 0,4 + 50/400 = 17,5% (bukan 0)
  assert.ok(Math.abs(rate("rencana:hobi", { bond: 100, traits: { ...TRAITS, patuh: 100 } }) - 0.175) < TOL);
  // tidak ada ikatan, tidak patuh, penakut penuh, tanpa ambisi: buka bisnis mentok di 80%
  assert.ok(Math.abs(rate("biz:suggest:cafe", { bond: 0, traits: { ...TRAITS, patuh: 0, penakut: 100, ambisius: 0 } }) - 0.8) < TOL);
});

test("saran yang sama di hari yang sama: ditolak lagi tanpa undian baru", () => {
  const c = creature("uji-again"), fake = { home: { get: () => c } };
  let seen = false;
  for (let d = 300; d < 900 && !seen; d++) {
    c.info = {};
    if (G.Game.prototype._refuse.call(fake, c.id, "rencana:hobi", d)) {
      assert.equal(G.Game.prototype._refuse.call(fake, c.id, "rencana:hobi", d), "again");
      seen = true;
    }
  }
  assert.ok(seen, "harus ada hari yang ditolak");
});

test("belum dewasa atau jenis saran tak dikenal: tidak pernah menolak", () => {
  const c = creature("uji-anak"), fake = { home: { get: () => c } };
  assert.equal(G.Game.prototype._refuse.call(fake, c.id, "rencana:hobi", 100), null); // umur 100 hari = anak
  assert.equal(G.Game.prototype._refuse.call(fake, c.id, "ngobrol", 400), null);        // bukan saran yang bisa ditolak
});

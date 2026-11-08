// v85: semua kartu keputusan punya angka (fx). Rumah simulasi jalan lama, tiap ask() dicatat: harus ada fx dan tiap pilihan punya
// paling nggak satu baris. Ngitung fx nggak boleh ngubah jalan cerita (nggak pakai dadu), jadi rumah yang sama hasilnya sama.
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../ilmu.js"); require("../agenda.js"); require("../career.js");
require("../market.js"); require("../wants.js"); require("../tonggak.js"); require("../anak.js"); require("../remaja.js");

test("tiap kartu keputusan punya angka buat semua pilihannya", () => {
  const kinds = new Set(), bad = [];
  const orig = E.Ctx.prototype.ask;
  E.Ctx.prototype.ask = function (q, options, prefs, self, o = {}) {
    kinds.add(q.replace(/[A-Z][a-z]+/g, "N").slice(0, 30));
    if (!o.fx) bad.push(q);
    else for (const k of Object.keys(options)) if (!Array.isArray(o.fx[k]) || !o.fx[k].length) bad.push(`${q} [${k}]`);
    return orig.call(this, q, options, prefs, self, o);
  };
  try {
    for (let i = 0; i < 12; i++) {
      const h = new E.Household("fx-" + i, new E.GuardianBot(i % 2 ? "suportif" : "tegas", 0.7));
      h.agensi_from = 0; h.found("m1", "Mochi"); h.view(2200, []);
    }
  } finally { E.Ctx.prototype.ask = orig; }
  assert.deepEqual([...new Set(bad)], []);
  assert.ok(kinds.size >= 35, `cuma ${kinds.size} jenis kartu kesapu`);
});

test("satuan angka: hari kerja, tanda minus asli, sifat pakai kata Inggris", () => {
  assert.equal(E.FX.money(-300), "−" + E.FX.wd(300));
  assert.equal(E.FX.num(2), "+2"); assert.equal(E.FX.num(-0.5), "−0.5"); assert.equal(E.FX.num(12.4), "+12");
  assert.equal(E.FX.trait(["penakut", -1], ["patuh", 2]), "timid −1, obedient +2");
  assert.equal(E.FX.pct(0.555), "56%");
});

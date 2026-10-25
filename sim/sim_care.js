const E = require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const G = require("../game.js");
function run(mode) {
  const state = { akun: "akun-c1", nama: "Mochi", aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: 1600 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, res_seen: [], rawat_from: 0, jam: { base_ts: 0, base_day: 0, ms: 86400000 } };
  const g = new G.Game(state); const h = g.home; const conds = [];
  for (let d = 0; d < 900; d++) {
    g.half_now = 0; g.advance(d, d);
    while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); g.advance(d, d); }
    const c = h.members[0]; if (!c.alive(d)) break;
    if (mode !== "none") { g.act(c.id, "rawat:makan_p:power"); g.act(c.id, "rawat:mandi"); }
    g.half_now = 1; g.noon(d);
    if (mode === "full") { g.act(c.id, "rawat:makan_m:light"); g.act(c.id, "rawat:tidur:early"); }
    if (d % 150 === 149) { const k = ST.EXT.care(c, d); conds.push([d, JSON.stringify(c.needs), k && k.v, k && k.note]); }
  }
  const F = ST.fam(h);
  return { g, conds, res: F.results.map(r => r.parts.cond + "|" + r.parts.condNote) };
}
for (const m of ["full", "morning", "none"]) { const r = run(m); console.log(m, r.conds.map(x => x.join(" ")).join("\n  "), "\n  results:", r.res.slice(-5).join(" ; ")); 
  // replay check
  const g2 = new G.Game(JSON.parse(JSON.stringify(r.g.state))); g2.half_now = 1; g2.advance(r.g.home.last_day, null);
  console.log("  replay same:", g2.home.snapshot() === r.g.home.snapshot());
}

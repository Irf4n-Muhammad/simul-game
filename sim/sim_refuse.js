const E = require("../engine.js"); require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const G = require("../game.js");
for (const akun of ["akun-aaa", "akun-bbb", "akun-ccc"]) {
  const g = new G.Game({ akun, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: 900 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, rawat_from: null, jam: {} });
  let no = 0, n = 0, again = 0; const ex = [];
  for (let d = 0; d < 800; d++) { g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); g.advance(d, d); }
    const c = g.home.members[0]; if (!c.alive(d) || E.phase_of(d - c.born) !== "dewasa") continue;
    if (d % 3) continue; n++; const r = g.act(c.id, "rencana:hobi"); if (!r && g.refused) { no++; if (ex.length < 2) ex.push(g.refused.log); if (g.act(c.id, "rencana:hobi")) again++; } }
  const c = g.home.members[0];
  const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.advance(g.home.last_day, null);
  console.log(akun, c.name, "patuh", Math.round(c.traits.patuh), "refused", no, "/", n, "retry ok", again, "replay", g2.home.snapshot() === g.home.snapshot(), ex);
}

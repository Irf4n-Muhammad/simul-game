const E = require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); const T = require("../tree.js"); require("../agenda.js");
const G = require("../game.js");
const PREF = { creativity: ["latihan", "hobi", "bebas", "main"], fitness: ["olahraga", "jalan", "jalan_pagi"], logic: ["belajar", "dongeng"], charm: ["teman", "sosial"] };
const [seed, skill, tal] = [process.argv[2] || "f1", process.argv[3] || "creativity", +(process.argv[4] || 10)];
const state = { akun: "akun-" + seed, nama: "Mochi", aturan: { sekolah: "wajib" }, wakil: "aman", hadir: [], jawaban: {}, aksi: [], dilihat: 1e9, res_seen: [], jam: { base_ts: 0, base_day: 0, ms: 86400000 } };
const g = new G.Game(state); const h = g.home; let c0 = null;
for (let d = 1; d < 1600; d++) {
  g.advance(d);
  const c = h.members[0]; if (!c.st) continue;
  if (!c0) { c0 = c; c.st.genes.talent[skill] = tal; }
  if (!c.alive(d)) break;
  const opts = g.agendaOptions(c, d).map(o => o[0]); const pick = PREF[skill].find(p => opts.includes(p));
  c.info.rencana = pick || null;
  const PATH = { creativity: ["spark","art","painting","painter","painter_legend","painting_master","art_icon","spark_crown"], fitness: ["body","sport","track","sprinter","sprinter_legend","track_master","sport_icon","body_crown"] }[skill];
  for (const id of PATH) if (!c.st.tree || !c.st.tree.have.includes(id)) { if (g.act(c.id, "pohon:" + id)) console.log("  lit", id, "day", d, "age", d - c.born); break; }
  if (d % 100 === 0) { const v = T.view(c, h, d); console.log(d, "age", d - c.born, "skill", Math.round(c.st.skills[skill]), "earned", v.earned, JSON.stringify(v.parts)); }
}

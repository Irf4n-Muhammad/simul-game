const E = require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); const T = require("../tree.js");
try { require("../agenda.js"); } catch (e) {}
const G = require("../game.js");
const seeds = process.argv.slice(2).length ? process.argv.slice(2) : ["a1","a2","a3","a4","a5","a6"];
for (const s of seeds) {
  const state = { akun: "akun-" + s, nama: "Mochi", aturan: { sekolah: "wajib" }, wakil: "aman", hadir: [], jawaban: {}, aksi: [], dilihat: 1e9, res_seen: [], jam: { base_ts: 0, base_day: 0, ms: 86400000 } };
  const g = new G.Game(state); g.advance(2600);
  for (const c of g.home.members) { if (!c.st) continue; const d = Math.min(c.death_day, g.home.last_day);
    const st = c.st, tv = st.tree ? st.tree.peak : 0;
    console.log(s, c.name, "age", d - c.born, "peak", tv, "skills", Object.values(st.skills).map(Math.round).join("/"), "talent", Object.values(st.genes.talent).join("/"), st.genes.rares.join(","), "ach", st.ach.length); }
}

require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); const V = require("../venture.js");
const G = require("../game.js");
const N = +(process.env.N || 8), DAYS = +(process.env.DAYS || 1600);
for (let i = 0; i < N; i++) {
  const akun = "akun-biz" + i;
  const g = new G.Game({ akun, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: DAYS + 5 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, rawat_from: null, jam: {} });
  const ev = [];
  for (let d = 0; d < DAYS; d++) {
    const L = g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); L.push(...g.advance(d, d)); }
    for (const l of L) for (const s of l.lines) if (/closes its doors|shuts down|made it through|Margin call|runs out of money/.test(s)) ev.push(d + " " + s.slice(0, 110));
    for (const m of g.home.members) if (m.st && m.st.bizWish && m.alive(d)) { g.act(m.id, "biz:fund") || g.act(m.id, "biz:loan"); }
    for (const b of V.active(g.home)) if (b.wish) g.act(b.owner, "biz:go");
  }
  const S = ST.fam(g.home).biz || { list: [] };
  let rep = "";
  if (process.env.REPLAY) { const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.advance(g.home.last_day, null); rep = " replay " + (g2.home.snapshot() === g.home.snapshot()); }
  console.log("=== " + akun + rep);
  for (const b of S.list) { console.log(`  ${b.tpl} ${b.name} lvl${b.level} total ${Math.round(b.total||0)} why ${b.why||"open"} niche ${b.niche||"-"} crises ${b.crises||0} edge ${Math.round(b.edge||0)}`); }
  if (process.env.EV) for (const e of ev.slice(0, 12)) console.log("   ", e);
}

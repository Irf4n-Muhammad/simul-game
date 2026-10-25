const E = require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); require("../tree.js"); require("../agenda.js"); const CR = require("../career.js"); require("../market.js"); const V = require("../venture.js"); const WK = require("../work.js");
const G = require("../game.js");
const J = process.env.JOB || "office", N = +(process.env.N || 4), DAYS = +(process.env.DAYS || 1300);
const tot = { g: {}, fired: 0, burn: 0, inc: 0, days: 0, done: 0, sat: 0, stress: 0 };
let allSame = true;
for (let i = 0; i < N; i++) {
  const akun = "akun-" + J + i;
  const g = new G.Game({ akun, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: DAYS + 5 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, rawat_from: null, jam: {} });
  const WAS = new Set(), FC = new Set();
  for (let d = 0; d < DAYS; d++) {
    const L = g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); L.push(...g.advance(d, d)); }
    for (const l of L) for (const s of l.lines) { if (/burned out/.test(s)) tot.burn++; if (/three warnings/.test(s) && L.some(l2 => 1)) tot.fired += 0; }
    if (d % 10 === 0) for (const m of g.home.members) if (m.st && m.alive(d) && CR.canWork(m, d) && !(m.st.job && m.st.job.id === J) && !ST.pendingFor(g.home, m.id).some(o => o.kind === "interview")) {
      if (process.env.BOOST) for (const k in m.st.skills) m.st.skills[k] = Math.max(m.st.skills[k], +process.env.BOOST); const o = CR.openings(d).find(o => o.ind === J && o.level === 0); if (o) g.act(m.id, "apply:" + o.id);
    }
    for (const m of g.home.members) if (m.st && m.alive(d) && WAS.has(m.id) && !(m.st.ward && m.st.ward.job === J) && m.st.lastWhy === "Let go" && !FC.has(m.id)) { FC.add(m.id); tot.fired++; }
    for (const m of g.home.members) if (m.st && m.st.ward && m.alive(d) && m.st.ward.job === J) { WAS.add(m.id);
      const W = m.st.ward, T = W.today;
      if (T && T.d === d && T.work) { tot.days++; tot.inc += T.inc; tot.done += T.disc.length; tot.sat += T.sat; tot.stress += T.stress; }
      const lg = W.grades[W.grades.length - 1]; if (lg && lg.d === d) tot.g[lg.g] = (tot.g[lg.g] || 0) + 1;
    }
  }
  if (process.env.REPLAY) { const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.advance(g.home.last_day, null); if (g2.home.snapshot() !== g.home.snapshot()) allSame = false; }
}
const D = Math.max(1, tot.days);
console.log(J, "workdays", tot.days, "grades", JSON.stringify(tot.g), "fired", tot.fired, "burn", tot.burn, "inc/day", (tot.inc / D).toFixed(3), "done/day", (tot.done / D).toFixed(2), "sat", (tot.sat / D).toFixed(1), "stress", (tot.stress / D).toFixed(1), process.env.REPLAY ? "replay " + allSame : "");

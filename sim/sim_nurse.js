const E = require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); require("../tree.js"); require("../agenda.js"); const CR = require("../career.js"); require("../market.js"); const V = require("../venture.js"); const WK = require("../work.js");
const G = require("../game.js");
const N = +(process.env.N || 4), DAYS = +(process.env.DAYS || 1400), PLAY = +(process.env.PLAY ?? 1);
const tot = { grades: {}, fired: 0, burn: 0, promo: 0 };
for (let i = +(process.env.I0 || 0); i < N; i++) {
  const akun = "akun-nurse" + i;
  const g = new G.Game({ akun, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: DAYS + 5 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, rawat_from: null, jam: {} });
  const lines = [], acts = { ok: 0, no: 0 }; let nd = 0; tot.nd = tot.nd || 0;
  for (let d = 0; d < DAYS; d++) {
    const L = g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); L.push(...g.advance(d, d)); }
    for (const l of L) for (const s of l.lines) if (/ward|nurse|Nurse|burned|review|promoted|warning|let .* go|course|shift/i.test(s)) { lines.push(d + " " + s.slice(0, 170)); if (/promoted/.test(s)) tot.promo++; if (/burned out/.test(s)) tot.burn++; if (/three warnings/.test(s)) tot.fired++; const gm = s.match(/grade ([ABCD])\./); if (gm) tot.grades[gm[1]] = (tot.grades[gm[1]] || 0) + 1; if (/A mistake/.test(s)) tot.inc = (tot.inc || 0) + 1; }
    if (d % 10 === 0) for (const m of g.home.members) if (m.st && m.alive(d) && CR.canWork(m, d) && !(m.st.job && m.st.job.id === "nurse") && !ST.pendingFor(g.home, m.id).some(o => o.kind === "interview")) {
      const o = CR.openings(d).find(o => o.ind === "nurse" && o.level === 0); if (o && g.act(m.id, "apply:" + o.id)) lines.push(d + " APPLY " + m.name + " " + o.title);
    }
    for (const m of g.home.members) if (m.st && m.st.ward && m.alive(d)) {
      nd++; tot.nd++;
      if (!PLAY) continue;
      const r = ((d * 7919 + m.id.length * 13 + d % 11) % 100) / 100, W = m.st.ward;
      let k = null;
      if (W.card && r < 0.7) k = "kerja:card:" + W.card.o[Math.floor(r * 10) % W.card.o.length][0];
      else if (r > 0.96) k = "kerja:shift:" + (d % 2 ? "night" : "day");
      else if (r > 0.92) k = "kerja:ot:" + ["never", "some", "always"][d % 3];
      else if (r > 0.88) k = "kerja:style:" + (d % 2 ? "extra" : "book");
      else if (W.stress > 75 && r < 0.9) k = "kerja:rest";
      if (k) { const ok = g.act(m.id, k); ok ? acts.ok++ : acts.no++; }
    }
  }
  
  const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.advance(g.home.last_day, null);
  const same = g2.home.snapshot() === g.home.snapshot();
  if (!same) { const A = JSON.parse(g.home.snapshot()), B2 = JSON.parse(g2.home.snapshot()); let n = 0; const diff = (a, b, p) => { if (n > 12 || JSON.stringify(a) === JSON.stringify(b)) return; if (a && b && typeof a === "object" && typeof b === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], p + "." + k); } else { n++; console.log("DIFF", p, JSON.stringify(a)?.slice(0, 120), "|", JSON.stringify(b)?.slice(0, 120)); } }; diff(A, B2, ""); }
  console.log("=== " + akun, "replay same:", same, "acts", JSON.stringify(acts), "nurse-days", nd);
  console.log(lines.slice(0, +(process.env.L || 30)).join("\n"));
  for (const m of g.home.members) if (m.st && m.st.ward) { const v = WK.view(m, g.home, g.home.last_day); console.log("  VIEW", m.name, v.title, v.co, "pay", v.pay, "stress", Math.round(v.stress), "rep", v.rep, "warn", v.warn, "grades", v.grades.map(o => o.g + o.sc).join(","), "q", v.prev.now.q, "boss", v.boss.rel, v.mates.map(o => o.role + o.rel).join(" ")); }
}
console.log(JSON.stringify(tot));

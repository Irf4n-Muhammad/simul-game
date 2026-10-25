const E = require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); const V = require("../venture.js");
try { require("../work.js"); } catch (e) { if (!/Cannot find module/.test(e.message)) throw e; }
const G = require("../game.js");
const N = +(process.env.N || 4), DAYS = +(process.env.DAYS || 1500), PLAY = +(process.env.PLAY ?? 1);
for (let i = 0; i < N; i++) {
  const akun = "akun-bake" + i;
  const g = new G.Game({ akun, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: DAYS + 5 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, rawat_from: null, jam: {} });
  const lines = []; let tries = 0, acts = { ok: 0, no: 0 }, sums = { rev: 0, profit: 0, days: 0, lost: 0, left: 0 };
  for (let d = 0; d < DAYS; d++) {
    const L = g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); L.push(...g.advance(d, d)); }
    for (const l of L) for (const s of l.lines) if (/Bakery|wedding|inspector|festival|butter|raise/i.test(s)) lines.push(d + " " + s.slice(0, 160));
    if (!V.active(g.home).some(b => b.tpl === "bakery") && d % 20 === 0) for (const m of g.home.members) if (m.st && m.alive(d) && !V.ownerBiz(g.home, m.id) && tries < 40) { tries++; if (g.act(m.id, "biz:suggest:bakery")) { lines.push(d + " OPEN by " + m.name); break; } }
    for (const b of V.active(g.home)) if (b.tpl === "bakery") {
      if (b.today && b.today.d === d) { sums.rev += b.today.rev; sums.profit += b.today.profit; sums.days++; if (b.bake) { sums.lost += b.bake.lost; sums.left += b.bake.left; } }
      if (!PLAY) continue;
      const r = ((d * 7919 + d % 13) % 100) / 100, o = b.owner;
      let k = null;
      if (b.card && r < 0.6) { const v = V.view(b, g.home, d); k = "biz:card:" + v.cardOpts[Math.floor(r * 10) % v.cardOpts.length][0]; }
      else if (r < 0.15 && b.bake) { const i2 = Math.floor(r * 40) % b.bake.rows.length, row = b.bake.rows[i2]; k = `biz:bake:${i2}=${Math.round((b.dem7 && b.dem7[row.p] || row.dem) * 1.1)}`; }
      else if (r > 0.97) k = "biz:open:" + ["6", "7", "9"][d % 3];
      else if (r > 0.94) k = "biz:dayold:" + (d % 2 ? "on" : "off");
      else if (r > 0.90 && b.bake) k = "biz:plan:" + b.bake.rows.map((row, j) => j % 2 ? "a" : Math.round(row.dem * 1.05)).join(",");
      if (k) { const ok = g.act(o, k); ok ? acts.ok++ : acts.no++; }
    }
  }
  const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.advance(g.home.last_day, null);
  const same = g2.home.snapshot() === g.home.snapshot();
  if (!same) { const A = JSON.parse(g.home.snapshot()), B2 = JSON.parse(g2.home.snapshot()); let n = 0; const diff = (a, b, p) => { if (n > 12 || JSON.stringify(a) === JSON.stringify(b)) return; if (a && b && typeof a === "object" && typeof b === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], p + "." + k); } else { n++; console.log("DIFF", p, JSON.stringify(a)?.slice(0, 120), "|", JSON.stringify(b)?.slice(0, 120)); } }; diff(A, B2, ""); }
  console.log("=== " + akun, "replay same:", same, "acts", JSON.stringify(acts), "avg/day rev", Math.round(sums.rev / Math.max(1, sums.days)), "profit", Math.round(sums.profit / Math.max(1, sums.days)), "lost", (sums.lost / Math.max(1, sums.days)).toFixed(1), "left", (sums.left / Math.max(1, sums.days)).toFixed(1), "days", sums.days);
  console.log(lines.slice(0, +(process.env.L || 25)).join("\n"));
  const S = ST.fam(g.home).biz || { list: [] };
  console.log(S.list.map(b => `  ${b.name} [${b.tpl}] lv${b.level} since ${b.since} ${b.closed ? "closed " + b.closed + " " + b.why : "open"} total ${Math.round(b.total || 0)} rep ${Math.round(b.rep)}`).join("\n"));
}

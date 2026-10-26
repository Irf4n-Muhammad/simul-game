require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); const V = require("../venture.js");
const G = require("../game.js");
const N = +(process.env.N || 8), DAYS = +(process.env.DAYS || 1600), POLICY = process.env.POLICY || "fund";
const stats = { open: 0, bank: 0, sold: 0, heir: 0, levels: {}, byTpl: {} };
for (let i = 0; i < N; i++) {
  const akun = "akun-biz" + i;
  const g = new G.Game({ akun, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: DAYS + 5 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, rawat_from: null, jam: {} });
  const lines = [];
  for (let d = 0; d < DAYS; d++) {
    const L = g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); L.push(...g.advance(d, d)); }
    for (const l of L) if (l.events.some(e => e.startsWith("biz"))) lines.push(d + " " + l.name + ": " + l.lines.filter(s => /biz|business|open|Bakery|Caf|shop|fund|Capital|sell|hands|bankrupt|closes|grow|viral|launch|signature|wants to open|shelves/i.test(s)).join(" ").slice(0, 200));
    if (POLICY === "fund") for (const m of g.home.members) if (m.st && m.st.bizWish && m.alive(d)) { const tp = m.st.bizWish.tpl; const ok = g.act(m.id, "biz:fund") ? "fund" : g.act(m.id, "biz:loan") ? "loan" : "no"; lines.push(d + " PARENT " + m.name + " " + tp + " -> " + ok); }
    if (POLICY === "fund") for (const b of V.active(g.home)) if (b.wish) { g.act(b.owner, "biz:go"); }
    if (d % 200 === 199) for (const b of V.active(g.home)) { const v = V.view(b, g.home, d); lines.push(`  [${d}] ${v.name} (${v.t.label}, ${v.lvl}) owner ${v.owner} fit ${v.fitNow.toFixed(2)} q ${b.q} rep ${Math.round(b.rep)} cash ${Math.round(b.cash)} 30d profit ${v.profit30} cust/day ${v.cust30}`); }
  }
  const S = ST.fam(g.home).biz || { list: [] };
  for (const b of S.list) { stats.open++; stats.byTpl[b.tpl] = (stats.byTpl[b.tpl] || 0) + 1; if (b.why === "bankrupt") stats.bank++; if (b.why === "sold") stats.sold++; if (b.owners.length > 1) stats.heir++; stats.levels[b.level] = (stats.levels[b.level] || 0) + 1; }
  const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.advance(g.home.last_day, null);
  console.log("=== " + akun, "replay same:", g2.home.snapshot() === g.home.snapshot());
  console.log(lines.slice(0, 60).join("\n"));
  console.log(S.list.map(b => `  ${b.name} [${b.tpl}] lv${b.level} since ${b.since} ${b.closed ? "closed " + b.closed + " " + b.why : "open"} total ${Math.round(b.total || 0)} best ${b.best} owners ${b.owners.map(o => o[1]).join(">")}`).join("\n"));
}
console.log(JSON.stringify(stats));

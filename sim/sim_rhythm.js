const E = require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const G = require("../game.js");
const agg = {}; const seeds = ["r1","r2","r3","r4","r5","r6","r7","r8"];
const bump = (ph, k, v = 1) => { (agg[ph] ||= { days: 0 })[k] = (agg[ph][k] || 0) + v; };
const kinds = {};
for (const s of seeds) {
  const state = { akun: "akun-" + s, nama: "Mochi", aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: 1600 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, res_seen: [], jam: { base_ts: 0, base_day: 0, ms: 86400000 } };
  const g = new G.Game(state); const h = g.home;
  let prevD = 0, prevRes = 0;
  for (let d = 1; d < 1500; d++) {
    const logs = g.advance(d);
    const c = h.members[0]; if (!c.alive(d)) break; for (const k of ["makan","mandi","tidur"]) g.act(c.id, k); g.act(c.id, "dadu");
    const ph = E.phase_of(d - c.born); bump(ph, "days");
    const dl = (h.stats.dilema || 0) - prevD; prevD = h.stats.dilema || 0; bump(ph, "dilema", dl);
    for (const L of logs) { if (L.cid && L.cid !== c.id) continue; for (const dr of L.dramas || []) bump(ph, dr); for (const e of L.events || []) { kinds[e] = (kinds[e] || 0) + 1; } if ((L.ach||[]).length) bump(ph, "ach", L.ach.length); }
    const F = ST.fam(h); const nr = F.results ? F.results.length : 0; if (nr > prevRes) { for (const r of F.results.slice(prevRes)) bump(ph, "res_" + r.kind); } prevRes = nr;
    if (c.info.ujian && c.info.ujian.hari === d) bump(ph, "ujian");
  }
}
for (const [ph, a] of Object.entries(agg)) { const o = {}; for (const [k, v] of Object.entries(a)) if (k !== "days") o[k] = +(v / a.days * 7).toFixed(2); console.log(ph, "days", a.days / seeds.length, "per WEEK", JSON.stringify(o)); }
console.log(Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => k + ":" + v).join(" "));

const E = require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); require("../tree.js"); require("../agenda.js"); const CR = require("../career.js"); require("../market.js"); const V = require("../venture.js"); require("../work.js");
const G = require("../game.js");
const N = +(process.env.N || 8), DAYS = +(process.env.DAYS || 1600);
const U = {}, opened = {}; let same = 0;
for (let i = 0; i < N; i++) {
  const g = new G.Game({ akun: "akun-ul" + i, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: DAYS + 5 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, rawat_from: null, jam: {} });
  for (let d = 0; d < DAYS; d++) {
    const L = g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); L.push(...g.advance(d, d)); }
    for (const l of L) for (const s of l.lines) if (/new idea/.test(s)) { console.log(i, d, s); }
    for (const m of g.home.members) if (m.st && m.st.bizWish && m.alive(d)) { g.act(m.id, "biz:fund") || g.act(m.id, "biz:loan"); }
  }
  for (const m of g.home.members) for (const t of (m.st && m.st.unlocked) || []) U[t] = (U[t] || 0) + 1;
  for (const b of (ST.fam(g.home).biz || { list: [] }).list) opened[b.tpl] = (opened[b.tpl] || 0) + 1;
  const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.advance(g.home.last_day, null);
  if (g2.home.snapshot() === g.home.snapshot()) same++;
}
console.log("unlocked", JSON.stringify(U)); console.log("opened", JSON.stringify(opened)); console.log("replay same", same, "/", N);

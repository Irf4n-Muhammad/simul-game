const E = require("../engine.js"); require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); require("../venture.js"); require("../work.js"); const PT = require("../pets.js");
const G = require("../game.js");
const N = +(process.env.N || 6), DAYS = +(process.env.DAYS || 1500), OFF = +(process.env.OFF || 0);
const tot = { pets: 0, died: {}, life: [], ages: [], bond: [], tricks: 0, ribbons: 0, cards: {}, adopt: 0, refused: 0 };
for (let i = OFF; i < OFF + N; i++) {
  const g = new G.Game({ akun: "akun-pet" + i, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: DAYS + 5 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, rawat_from: null, jam: {} });
  const seen = new Set();
  for (let d = 0; d < DAYS; d++) {
    g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); g.advance(d, d); }
    for (const m of g.home.members) if (m.st && m.alive(d)) {
      const P = m.st.pet;
      if (process.env.ADV && P) { if (d % 50 === 0) { g.act(m.id, "pet:walk:daily"); g.act(m.id, "pet:food:premium"); g.act(m.id, "pet:vet:monthly"); } }
      if (process.env.ADOPT && !P && d % 30 === 0 && m.st.wallet > 1000 && ["dewasa", "tua"].includes(E.phase_of(d - m.born))) { const k = PT.shelter(d)[0]; if (g.act(m.id, `pet:adopt:${k}@shelter`)) tot.adopt++; }
      if (P && !seen.has(P.id)) { seen.add(P.id); tot.pets++; }
      if (P && P.today && P.today.d === d) { tot.fd = (tot.fd || 0) + 1; tot.fed = (tot.fed || 0) + (P.today.fed ? 1 : 0); tot.jy = (tot.jy || 0) + P.joy; tot.hl = (tot.hl || 0) + P.health; }
    }
  }
  for (const m of g.home.members) if (m.st) for (const p of m.st.petsPast || []) { tot.died[p.why] = (tot.died[p.why] || 0) + 1; tot.life.push(p.died - p.born); tot.bond.push(p.bond); tot.tricks += p.tricks; tot.ribbons += p.ribbons; }
  for (const m of g.home.members) if (m.st && m.st.pet && m.alive(DAYS - 1)) { tot.bond.push(Math.round(m.st.pet.bond)); }
  if (process.env.REPLAY) { const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.advance(g.home.last_day, null); console.log("replay", g2.home.snapshot() === g.home.snapshot()); }
}
const avg = a => a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : 0;
console.log("fed%", Math.round(tot.fed / tot.fd * 100), "joy", Math.round(tot.jy / tot.fd), "health", Math.round(tot.hl / tot.fd), "petdays", tot.fd);
console.log("pets", tot.pets, "adopted by advice", tot.adopt, "died", JSON.stringify(tot.died), "avg life days", avg(tot.life), "avg bond", avg(tot.bond), "tricks", tot.tricks, "ribbons", tot.ribbons);

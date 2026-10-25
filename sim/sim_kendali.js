// sim_kendali.js: audit kontingensi. Seberapa besar tindakan wali mengubah hasil? Seed yang sama, perilaku wali yang beda.
const E = require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
require("../wants.js"); require("../work.js"); const G = require("../game.js");
const SEEDS = (process.env.SEEDS || "k1,k2,k3,k4,k5,k6,k7,k8").split(","), DAYS = +(process.env.DAYS || 1200);
const VARIANTS = {
  base:        { attend: true,  care: true,  dice: true,  study: false, plan: null },
  absen:       { attend: false, care: false, dice: false, study: false, plan: null },
  belajar:     { attend: true,  care: true,  dice: true,  study: true,  plan: null },
  rencana:     { attend: true,  care: true,  dice: true,  study: false, plan: "belajar" },
  tanpa_dadu:  { attend: true,  care: true,  dice: false, study: false, plan: null },
  tanpa_rawat: { attend: true,  care: false, dice: true,  study: false, plan: null },
};
const out = {};
for (const [vn, V] of Object.entries(VARIANTS)) {
  const M = out[vn] = { n: 0, quiz: { great: 0, okay: 0, bad: 0 }, final: { great: 0, okay: 0 }, bond: {}, iq180: [], rajin180: [], iq270: [], rajin270: [], mood: 0, health: 0, days: 0, listened: 0, ignored: 0, obeyed: 0, broke: 0, res: {}, stats: {}, dead: [] };
  for (const s of SEEDS) {
    const state = { akun: "akun-" + s, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: V.attend ? Array.from({ length: DAYS + 100 }, (_, i) => i) : [], jawaban: {}, aksi: [], dilihat: 1e9, res_seen: [], jam: { base_ts: 0, base_day: 0, ms: 86400000 } };
    const g = new G.Game(state), h = g.home; const seen = new Set();
    for (let d = 1; d < DAYS; d++) {
      let logs = g.advance(d, d); let guard = 0;
      while (V.attend && g.pending && guard++ < 5) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); logs = logs.concat(g.advance(d, d)); }
      const c = h.members[0]; if (!c.alive(d)) { M.dead.push(d); break; }
      const age = d - c.born, ph = E.phase_of(age);
      if (V.attend) {
        if (V.care) for (const k of ["makan", "mandi", "tidur"]) g.act(c.id, k);
        if (V.dice) g.act(c.id, "dadu");
        if (V.study && c.info.ujian) g.act(c.id, "belajar");
        if (V.plan && ph === "anak" && c.info.rencana !== V.plan) g.act(c.id, "rencana:" + V.plan);
        if (V.plan && ph !== "anak" && c.info.rencana === V.plan) g.act(c.id, "rencana:");
      }
      M.days++; M.mood += c.needs.mood; M.health += Object.values(c.needs).reduce((a, b) => a + b, 0) / Object.keys(c.needs).length;
      for (const a of [60, 180, 270, 600, 900]) if (age === a) (M.bond[a] ||= []).push(c.bond);
      if (age === 180) { M.iq180.push(c.stats.kecerdasan); M.rajin180.push(c.traits.rajin); }
      if (age === 270) { M.iq270.push(c.stats.kecerdasan); M.rajin270.push(c.traits.rajin); }
      for (const L of logs) { if (L.cid && L.cid !== c.id) continue; for (const t of (L.lines || [])) {
        if (/90-something on the quiz/.test(t)) M.quiz.great++; else if (/quiz score is just okay/.test(t)) M.quiz.okay++; else if (/hides the quiz paper/.test(t)) M.quiz.bad++;
        if (/passed their final exams with great/.test(t)) M.final.great++; else if (/passed their final exams with just okay/.test(t)) M.final.okay++;
        if (/they listened/.test(t)) M.listened++; if (/they didn't listen/.test(t)) M.ignored++;
        if (/They obeyed\./.test(t)) M.obeyed++; if (/They broke it/.test(t)) M.broke++; } }
      const F = ST.fam(h); for (const r of F.results) { if (seen.has(r.id)) continue; seen.add(r.id); const k = r.kind || "?"; const R = (M.res[k] ||= { n: 0, pass: 0, none: 0 }); R.n++; if (r.pass) R.pass++; if (r.parts && r.parts.src === "none") R.none++; }
    }
    for (const [k, v] of Object.entries(h.stats)) M.stats[k] = (M.stats[k] || 0) + v; if (g.pending) M.pend = (M.pend || 0) + 1;
    M.n++;
  }
}
const avg = xs => xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null;
for (const [vn, M] of Object.entries(out)) {
  const bond = {}; for (const [a, xs] of Object.entries(M.bond)) bond[a] = avg(xs);
  const res = {}; for (const [k, R] of Object.entries(M.res)) res[k] = `${R.pass}/${R.n}${R.none ? ` (tanpa dadu ${R.none})` : ""}`;
  console.log(vn.padEnd(12), JSON.stringify({ quiz: M.quiz, final: M.final, bond, iq180: avg(M.iq180), rajin180: avg(M.rajin180), iq270: avg(M.iq270), rajin270: avg(M.rajin270), mood: +(M.mood / M.days).toFixed(1), health: +(M.health / M.days).toFixed(1), listened: M.listened, ignored: M.ignored, obeyed: M.obeyed, broke: M.broke, res, dead: M.dead.length, st: { dijawab: M.stats.dijawab_penjaga, sendiri: M.stats.diputus_sendiri, wakil: M.stats.diputus_wakil, dilema: M.stats.dilema, pending_akhir: M.pend, tap_belajar: M.stats.tap_temani_belajar } }));
}

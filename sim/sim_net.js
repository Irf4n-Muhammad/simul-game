const E = require("../engine.js"); require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const G = require("../game.js");
const mk = (akun, nama) => new G.Game({ akun, nama, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: 1600 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, res_seen: [], rawat_from: 0, jam: { base_ts: 0, base_day: 0, ms: 86400000 } });
const A = mk("akun-aaa", "Mochi"), B = mk("akun-bbb", "Tofu");
const step = (g, d) => { g.half_now = 0; let L = g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); L = L.concat(g.advance(d, d)); }
  const c = g.home.members[0]; if (c.alive(d)) { g.act(c.id, "rawat:makan_p:power"); g.act(c.id, "rawat:mandi"); } g.half_now = 1; g.noon(d); if (c.alive(d)) { g.act(c.id, "rawat:makan_m:light"); g.act(c.id, "rawat:tidur:early"); }
  L = L.concat(g.noon_logs || []); g.noon_logs = []; return L.filter(l => l.events.some(e => /net_|kelahiran|kabar_bayi|pernikahan|kenalan|jadian|lamaran/.test(e))); };
const snap = g => { const c = g.home.members[0]; return { nama: c.name, traits: c.traits, rupa: c.rupa, genes: c.st.genes }; };
const key = g => g.state.akun + "~" + g.home.members[0].id;
let stage = 0, since = 0, pubA = 0, pubB = 0;
const show = (who, L) => L.forEach(l => console.log(who, l.day, l.name, l.events.join(","), "|", l.lines.join(" ").slice(0, 160)));
for (let d = 0; d < 1500; d++) {
  show("A", step(A, d)); show("B", step(B, d));
  const a = A.home.members[0], b = B.home.members[0], pa = "p:" + key(B), pb = "p:" + key(A);
  const single = c => !c.partner() && c.rel_of("calon")[0] === null && E.phase_of(d - c.born) === "dewasa";
  if (stage === 0 && single(a) && single(b)) {
    const hostA = key(A) < key(B);
    const okA = A.netRecord(a.id, "kenal-1", { t: "kenal", pid: pa, fam: "Tofu", host: hostA, ...snap(B) });
    const okB = B.netRecord(b.id, "kenal-1", { t: "kenal", pid: pb, fam: "Mochi", host: !hostA, ...snap(A) });
    console.log("kenal", d, okA, okB); if (okA && okB) { stage = 1; since = d; }
  }
  const both = (t, extra = {}) => { const r = [A.netRecord(a.id, t + "-1", { t, pid: pa, fam: "Tofu", ...extra }), B.netRecord(b.id, t + "-1", { t, pid: pb, fam: "Mochi", ...extra })]; console.log(t, d, r); };
  if (stage === 1 && d - since >= 21) { both("jadian"); stage = 2; since = d; }
  else if (stage === 2 && d - since >= 120) { both("tunangan"); stage = 3; since = d; }
  else if (stage === 3 && d - since >= 30) { both("nikah", { style: "kecil" }); stage = 4; since = d; }
  // sisi host menerbitkan kabar; sisi lain mencatat
  for (const [H, O, oc, pid, pub] of [[A, B, b, pb, "A"], [B, A, a, pa, "B"]]) {
    const out = H.home.members[0].info.net_out || [];
    let i = pub === "A" ? pubA : pubB;
    for (; i < out.length; i++) { const o = out[i]; const r = O.netRecord(oc.id, `${o.t}-${pub}-${i}`, { ...o, pid }); console.log("relay", o.t, d, r); }
    if (pub === "A") pubA = i; else pubB = i;
  }
  for (const g of [A, B]) (g.snaps ||= {})[d] = g.home.snapshot();
}
for (const g of [A, B]) {
  console.log(g.state.akun, g.home.members.map(m => `${m.id} ${m.name} gen${m.gen} p=${m.parents} talent=${m.st && JSON.stringify(m.st.genes.talent)}`).join("\n  "));
  const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.half_now = 1;
  for (let d = 0; d <= g.home.last_day; d++) { g2.advance(d, null); if (g2.home.snapshot() !== g.snaps[d]) { console.log("  first diff day", d); const x = JSON.parse(g2.home.snapshot()), y = JSON.parse(g.snaps[d]); const df = (a, b, p) => { if (JSON.stringify(a) === JSON.stringify(b)) return; if (typeof a !== "object" || !a || !b) { console.log("   ", p, JSON.stringify(a)?.slice(0,200), "|", JSON.stringify(b)?.slice(0,200)); return; } for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) df(a[k], b[k], p + "." + k); }; df(x, y, ""); break; } }
  console.log("  replay same:", g2.home.snapshot() === g.home.snapshot());
}

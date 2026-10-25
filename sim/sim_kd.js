// beberapa keluarga di satu "server" tiruan; makhluk yang jalanin cinta sendiri, pemain cuma kadang ngasih saran
const fs = require("fs"), vm = require("vm");
const E = require("../engine.js"); require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const G = require("../game.js");
const DAY = 864e5; let clock = 1.7e12;
const STORE = {}, listeners = [];
const fire = () => listeners.forEach(f => f({ docs: Object.entries(STORE).map(([id, d]) => ({ id, exists: true, data: () => JSON.parse(JSON.stringify(d)) })) }));
const db = { collection: () => ({ onSnapshot(next) { listeners.push(next); return () => {}; } }), doc: path => ({ set: body => { STORE[path.split("/")[1]] = JSON.parse(JSON.stringify(body)); return Promise.resolve(); } }) };
const src = fs.readFileSync("net.js", "utf8");
const mk = (akun, nama) => new G.Game({ akun, nama, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: 2000 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, res_seen: [], rawat_from: 0, jam: { base_ts: 0, base_day: 0, ms: DAY } });
const NAMES = (process.env.NAMES || "Mochi,Tofu,Kiki,Bubu,Lulu,Nana").split(","), DAYS = +(process.env.DAYS || 1000), POLICY = process.env.POLICY || "mixed";
const P = NAMES.map((n, i) => {
  const g = mk("akun-" + n.toLowerCase(), n), ctx = vm.createContext({ Engine: E, Date: { now: () => clock }, Math, JSON, Object, Promise, Set, Array, String, Number, console, __netmock: { uid: "u_" + n.toLowerCase(), db } });
  vm.runInContext(src, ctx);
  return { n, g, Net: ctx.Net, ctx, hits: [] };
});
const step = (g, d) => { g.half_now = 0; let L = g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); L = L.concat(g.advance(d, d)); }
  const c = g.home.members[0]; if (c.alive(d)) { g.act(c.id, "rawat:makan_p:power"); g.act(c.id, "rawat:mandi"); } g.half_now = 1; g.noon(d); if (c.alive(d)) { g.act(c.id, "rawat:makan_m:light"); g.act(c.id, "rawat:tidur:early"); }
  L = L.concat(g.noon_logs || []); g.noon_logs = []; return L; };
(async () => {
  for (const p of P) { await p.Net.init({ game: () => p.g, changed() {}, recorded() {} }); }
  for (const p of P) { const c = p.g.home.members[0]; console.log(p.n, "setia", c.traits.setia, "ramah", c.traits.ramah, "patuh", c.traits.patuh, "cap", G.Game.flingCap(c)); }
  const rnd = E.seed_rng("sim"); const counts = {};
  for (let d = 0; d < DAYS; d++) {
    clock = 1.7e12 + d * DAY;
    for (const p of P) {
      const L = step(p.g, d);
      for (const l of L) for (const e of l.events) if (e.startsWith("net_")) { counts[e] = (counts[e] || 0) + 1; console.log(d, p.n, e, "|", l.lines.join(" ").slice(0, 150)); }
    }
    await new Promise(r => setImmediate(r)); fire(); await new Promise(r => setImmediate(r)); fire();
    if (d % 100 === 0) for (const p of P) { const c = p.g.home.members[0], V = p.Net.view(c); console.log("dbg", d, p.n, E.phase_of(d - c.born), JSON.stringify(c.partner()), V.ready, V.canOpen, V.open, V.room, (V.others||[]).length); }
    // the parents, sometimes: switch on Open to meet, answer advice now and then, suggest someone
    for (const p of P) {
      const c = p.g.home.members[0]; if (!c.alive(d)) continue;
      const V = p.Net.view(c); if (!V.ready) continue;
      if (V.canOpen && !V.open) { p.Net.setOpen(c, true); }
      if (POLICY === "mixed") {
        for (const w of V.wishes) if (rnd.random() < 0.3) { const r = rnd.random() < 0.8 ? p.Net.bless(c, w.id, "kecil") : p.Net.hold(c, w.id); console.log(d, p.n, "parent on wish", w.t, JSON.stringify(r)); }
        for (const o of V.inbox) if (rnd.random() < 0.3) { const r = p.Net.answer(c, o.id, rnd.random() < 0.7); console.log(d, p.n, "parent on", o.t, JSON.stringify(r)); }
        if (V.room && V.others.length && V.suggests && rnd.random() < 0.05) { const o = V.others[Math.floor(rnd.random() * V.others.length)]; console.log(d, p.n, "suggest", o.nama, JSON.stringify(p.Net.introduce(c, o.key))); }
      }
    }
    await new Promise(r => setImmediate(r)); fire();
  }
  console.log(counts);
  for (const p of P) {
    const c = p.g.home.members[0];
    console.log(p.n, "rels", JSON.stringify(Object.values(c.relations).filter(r => r.remote).map(r => r.nama + ":" + r.tipe)), "notes", JSON.stringify((p.Net.state.me.notes[c.id.split("/").pop()] || []).map(x => x.t)));
    const g2 = new G.Game(JSON.parse(JSON.stringify(p.g.state))); g2.half_now = 1; g2.advance(p.g.home.last_day, null);
    console.log("  replay same:", g2.home.snapshot() === p.g.home.snapshot(), "members", p.g.home.members.map(m => m.name).join(","));
  }
})();

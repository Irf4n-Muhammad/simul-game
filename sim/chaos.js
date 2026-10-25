const D = (process.env.CODE || __dirname + "/../") .replace(/\/?$/, "/");
const E = require(D+"engine.js"); require(D+"storylets.js"); require(D+"agenda.js"); const ST = require(D+"status.js"); const TR=require(D+"tree.js"); const CR = require(D+"career.js"); const MK=require(D+"market.js"); const V=require(D+"venture.js"); const W=require(D+"work.js"); const PT = require(D+"pets.js");
const G = require(D+"game.js");
const N = +(process.env.N || 4), DAYS = +(process.env.DAYS || 1400), OFF=+(process.env.OFF||0);
let r = 12345; const rnd = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648; const pick = a => a[Math.floor(rnd() * a.length)];
const bad = []; const okCount = {}, tryCount = {};
function scan(o, path, depth = 0) { if (depth > 12 || bad.length > 20) return; if (typeof o === "number") { if (!isFinite(o)) bad.push(path + "=" + o); return; } if (o && typeof o === "object") for (const k of Object.keys(o)) scan(o[k], path + "." + k, depth + 1); }
for (let i = OFF; i < OFF+N; i++) {
  const g = new G.Game({ akun: "chaos" + i, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: DAYS + 5 }, (_, k) => k).filter(k => rnd() < 0.8), jawaban: {}, aksi: [], dilihat: 1e9, rawat_from: null, jam: {} });
  for (let d = 0; d < DAYS; d++) {
    try { g.advance(d, d); let q = 0; while (g.pending && q++ < 30) { const o = Object.keys(g.pending.options); g.answer(g.pending.key, pick(o), 0); g.advance(d, d); } } catch (e) { bad.push(`acct${i} d${d} advance: ${e.stack.split("\n").slice(0,3).join(" | ")}`); break; }
    if (rnd() < 0.5) continue;
    for (const m of g.home.members) { if (!m.alive(d) || "keluar" in m.info || !m.st) continue;
      const kinds = ["dadu", "simpan_dadu", "pakai_dadu:0", "ngobrol", "peluk"];
      try {
        for (const o of CR.openings(d).slice(0, 3)) kinds.push("apply:" + o.id);
        for (const id of TR.ORDER) if (TR.canUnlock(m, id, g.home, d)) kinds.push("pohon:" + id);
        for (const L of MK.LINES.slice(0, 6)) kinds.push("pasar:beli:" + L.id);
        kinds.push(...["kerja:shift:day","kerja:shift:night","kerja:ot:some","kerja:ot:always","kerja:ot:never","kerja:style:book","kerja:style:extra","kerja:rest","kerja:card:0","kerja:card:1"]);
        kinds.push(...PT.shelter(d).map(k => "pet:adopt:" + k + "@shelter"), "pet:adopt:turtle@breeder", "pet:food:premium", "pet:food:normal", "pet:walk:daily", "pet:walk:some", "pet:vet:monthly", "pet:card:0", "pet:card:1");
        for (const t of V.TPLS) kinds.push("biz:suggest:" + (t.id||t) , "biz:suggest:" + (t.id||t) + "@loan");
        kinds.push(...["biz:fund","biz:loan","biz:nofund","biz:go","biz:wait","biz:price:premium","biz:price:budget","biz:focus:growth","biz:hire","biz:post","biz:pick:a1","biz:fire:0","biz:raise:0","biz:train:0","biz:borrow:small","biz:repay","biz:invest:yes","biz:promo","biz:product","biz:grow","biz:contract","biz:bail:200","biz:mode:fast","biz:extra:on","biz:card:0","biz:card:1","biz:plan:10,10,a","biz:dayold:on","biz:seat:cozy","biz:music:on","biz:open:7","biz:bake:1"]);
        if (rnd() < 0.01) kinds.push("biz:close");
        for (const b of V.active(g.home)) if (b.post) kinds.push("apply:fb:" + b.id);
      } catch (e) { bad.push(`acct${i} d${d} build kinds: ${e.message}`); }
      const KK = process.env.ONLY ? kinds.filter(k => k.startsWith(process.env.ONLY)) : kinds; if (!KK.length) continue; for (let a = 0; a < 3; a++) { const k = pick(KK); const p = k.split(":").slice(0, 2).join(":"); tryCount[p] = (tryCount[p] || 0) + 1;
        try { if (g.act(m.id, k)) okCount[p] = (okCount[p] || 0) + 1; } catch (e) { bad.push(`acct${i} d${d} act ${k}: ${e.stack.split("\n").slice(0,3).join(" | ")}`); }
      }
    }
    if (process.env.FIND) (g._snaps ||= [])[d] = g.home.snapshot();
    if (d % 100 === 0) for (const m of g.home.members) scan(m, `a${i}d${d}.${m.name}`);
    if (bad.length > 20) break;
  }
  scan(g.home.members, "members"); scan(g.home.world, "world"); scan(g.home.stats, "stats");
  const snap = g.home.snapshot();
  if (process.env.DUMP) require("fs").writeFileSync("state" + i + ".json", JSON.stringify(g.state));
  const t0=Date.now(); const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.advance(g.home.last_day, null);
  if (process.env.FIND && g2.home.snapshot() !== snap) { const g3 = new G.Game(JSON.parse(JSON.stringify(g.state)));
    for (let d = 0; d < DAYS; d++) { g3.advance(d, null); const s3 = g3.home.snapshot(); if (g._snaps[d] && s3 !== g._snaps[d]) { console.log("FIRST DIFF day", d, "actions", JSON.stringify(g.state.aksi.filter(a => a[0] === d)), "prev", JSON.stringify(g.state.aksi.filter(a => a[0] === d-1)));
      const A = s3, B = g._snaps[d]; let k = 0; while (A[k] === B[k]) k++; console.log("replay:", A.slice(Math.max(0,k-300), k+200)); console.log("live:  ", B.slice(Math.max(0,k-300), k+200)); break; } } }
  console.log("acct", i, "members", g.home.members.length, "alive", g.home.living(g.home.last_day).length, "aksi", g.state.aksi.length, "snapKB", Math.round(snap.length / 1024), "replay", g2.home.snapshot() === snap, "replayMs", Date.now()-t0,
    "biz", V.active(g.home).length, "wallets", g.home.members.filter(m=>m.st&&m.alive(g.home.last_day)).map(m=>Math.round(m.st.wallet)).join(","));
}
console.log("BAD", bad.length, bad.slice(0, 20).join("\n"));
console.log("ok/try", Object.keys(tryCount).sort().map(k => `${k} ${okCount[k] || 0}/${tryCount[k]}`).join("; "));

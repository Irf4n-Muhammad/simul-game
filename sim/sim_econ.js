// Aliran uang per keluarga: dari mana koin masuk dan ke mana keluar sepanjang DAYS hari, plus kekayaan dan rumah tiap 250 hari.
// Membungkus Money.move (tanpa mengubah kode game) supaya semua alasan terjumlah seumur simulasi, bukan cuma 90 hari buku besar.
// Wali otomatis; POLICY=fund ikut mendanai keinginan buka bisnis (sama dengan sim_biz). Replay dicek di akhir tiap akun.
require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); const V = require("../venture.js"); require("../work.js"); require("../pets.js"); require("../wants.js");
const G = require("../game.js"), M = require("../money.js");
const N = +(process.env.N || 6), DAYS = +(process.env.DAYS || 1500), POLICY = process.env.POLICY || "none";
let tot = {};
const _move = M.move;
M.move = (c, n, why, day, mode) => { const b = c && c.st ? c.st.wallet : 0, r = _move(c, n, why, day, mode); const d = c && c.st ? c.st.wallet - b : 0; if (d && !(c.demo)) { const e = tot[why] || (tot[why] = [0, 0]); if (d > 0) e[0] += d; else e[1] -= d; } return r; };
const all = {};
for (let i = 0; i < N; i++) {
  tot = {};
  const g = new G.Game({ akun: "akun-econ" + i, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: DAYS + 5 }, (_, k) => k), jawaban: {}, aksi: [], dilihat: 1e9, rawat_from: null, jam: {} });
  const snap = [];
  for (let d = 0; d < DAYS; d++) {
    g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); g.advance(d, d); }
    if (POLICY === "fund") { for (const m of g.home.members) if (m.st && m.st.bizWish && m.alive(d)) g.act(m.id, "biz:fund") || g.act(m.id, "biz:loan"); for (const b of V.active(g.home)) if (b.wish) g.act(b.owner, "biz:go"); }
    if (d % 250 === 249) snap.push(`${d}:${Math.round(g.home.members.filter(m => m.st && m.alive(d)).reduce((s, m) => s + m.st.wallet, 0))}/${ST.fam(g.home).house}`);
  }
  const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.advance(g.home.last_day, null);
  console.log(`=== akun-econ${i} replay same: ${g2.home.snapshot() === g.home.snapshot()}  kekayaan/rumah: ${snap.join("  ")}`);
  console.log("   " + Object.entries(tot).sort((a, b) => (b[1][0] + b[1][1]) - (a[1][0] + a[1][1])).map(([k, [a, b]]) => `${k} +${Math.round(a)} -${Math.round(b)}`).join(" | "));
  for (const [k, [a, b]] of Object.entries(tot)) { const e = all[k] || (all[k] = [0, 0]); e[0] += a; e[1] += b; }
}
const IN = Object.values(all).reduce((s, e) => s + e[0], 0), OUT = Object.values(all).reduce((s, e) => s + e[1], 0);
console.log(`\nSEMUA AKUN: masuk ${Math.round(IN)}, keluar ${Math.round(OUT)}, rasio masuk/keluar ${(IN / Math.max(1, OUT)).toFixed(2)}`);
console.log("masuk:  " + Object.entries(all).filter(e => e[1][0] > 0).sort((a, b) => b[1][0] - a[1][0]).map(([k, [a]]) => `${k} ${(100 * a / IN).toFixed(1)}%`).join(", "));
console.log("keluar: " + Object.entries(all).filter(e => e[1][1] > 0).sort((a, b) => b[1][1] - a[1][1]).map(([k, [, b]]) => `${k} ${(100 * b / OUT).toFixed(1)}%`).join(", "));

// Bank (bank.js): keluarga yang selalu pakai pinjaman. Buka usaha lewat pinjaman tiap ada keinginan, pinjam modal kerja tiap 60 hari kalau bisa.
// Tahap 5: menabung separuh dompet tiap 30 hari (SAVE=0 mematikan) dan ambil KPR rumah satu tingkat di atas begitu bisa (KPR=0).
// Laporan: pinjaman disetujui/ditolak, bunga dibayar, bisnis tutup dengan sisa utang, utang pribadi, gagal bayar, replay.
require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); const V = require("../venture.js");
const G = require("../game.js");
const N = +(process.env.N || 8), DAYS = +(process.env.DAYS || 1600), SAVE = process.env.SAVE !== "0", KPR = process.env.KPR !== "0";
const prevP = new Map(), kprLive = new Map();
const T = { kpr_open: 0, kpr_done: 0, kpr_foreclose: 0, save_total_end: 0, save_earned: 0, open_ok: 0, open_no: 0, borrow_ok: 0, borrow_no: 0, repay: 0, interest: 0, closed_with_debt: 0, personal_max: 0, defaults: 0, replay: 0 };
for (let i = 0; i < N; i++) {
  const akun = "akun-bank" + i;
  const g = new G.Game({ akun, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: DAYS + 5 }, (_, k) => k), jawaban: {}, aksi: [], dilihat: 1e9, rawat_from: null, jam: {} });
  for (let d = 0; d < DAYS; d++) {
    g.advance(d, d); while (g.pending) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); g.advance(d, d); }
    for (const m of g.home.members) if (m.st && m.st.bizWish && m.alive(d)) { if (g.act(m.id, "biz:loan")) T.open_ok++; else { T.open_no++; g.act(m.id, "biz:nofund"); } }
    for (const b of V.active(g.home)) {
      if (b.wish) g.act(b.owner, "biz:go");
      // bunga hari ini = cicilan - turunnya pokok (catatan di luar state, supaya replay tetap sama)
      const k = akun + b.id, p0 = prevP.get(k);
      if (b.today && b.today.d === d && b.today.loan && p0 != null) T.interest += b.today.loan - (p0 - (b.loan ? b.loan.p : 0));
      prevP.set(k, b.loan ? b.loan.p : null);
      if (!b.loan && d % 60 === 30 && !V.TPL[b.tpl].fund) { if (g.act(b.owner, "biz:borrow:1")) T.borrow_ok++; else T.borrow_no++; }
    }
    // tabungan: tiap 30 hari anggota dewasa menabung separuh dompet
    if (SAVE && d % 30 === 15) for (const m of g.home.members) if (m.st && m.alive(d) && m.age(d) >= 270 && m.st.wallet > 200) g.act(m.id, "bank:simpan:" + Math.floor(m.st.wallet / 2));
    // KPR: begitu bisa, ambil KPR untuk rumah satu tingkat di atas rumah sekarang
    if (KPR && d % 10 === 5 && !g.home.world.kpr) {
      const F = ST.fam(g.home), order = ["flat", "house", "villa", "mansion"], next = order[order.indexOf(F.house) + 1];
      const adults = g.home.members.filter(m => m.st && m.alive(d) && m.age(d) >= 270 && !("keluar" in m.info)).sort((a, b) => b.st.wallet - a.st.wallet);
      if (next && next !== "flat" && adults[0] && !F.build) { const q = ST.kprQuote(adults[0], g.home, next, d); if (q) { const k = q.ok ? "ok" : q.why; (T.kpr_why ||= {})[k] = (T.kpr_why[k] || 0) + 1; } if (q && q.ok && g.act(adults[0].id, "kpr:" + next + "@-1,0,0")) { T.kpr_open++; kprLive.set(akun, true); } }
    }
    if (kprLive.get(akun) && !g.home.world.kpr) { kprLive.delete(akun); if (ST.fam(g.home).house === "rented") T.kpr_foreclose++; else T.kpr_done++; }
    for (const m of g.home.members) if (m.st && m.st.utang) T.personal_max = Math.max(T.personal_max, m.st.utang.p);
  }
  const S = ST.fam(g.home).biz || { list: [] };
  T.defaults += (g.home.world.kredit || { n: 0 }).n;
  for (const m of g.home.members) if (m.st) { T.save_total_end += Math.round(m.st.tab || 0); T.save_earned += Math.round(m.st.tabEarn || 0); }
  for (const m of g.home.members) for (const [, R] of (m.st && m.st.led ? m.st.led.b : [])) if (R.utang) T.utang_paid_last90 = (T.utang_paid_last90 || 0) + R.utang[1];
  const g2 = new G.Game(JSON.parse(JSON.stringify(g.state))); g2.advance(g.home.last_day, null);
  const same = g2.home.snapshot() === g.home.snapshot(); if (same) T.replay++;
  console.log(akun, "replay", same, "biz", S.list.map(b => `${b.tpl}${b.closed ? "(" + b.why + ")" : ""}`).join(","), "kredit", JSON.stringify(g.home.world.kredit || null), "rumah", ST.fam(g.home).house, "kpr", g.home.world.kpr ? Math.round(g.home.world.kpr.p) : 0);
}
T.interest = Math.round(T.interest);
console.log(JSON.stringify(T));

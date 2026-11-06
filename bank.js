// Bank NPC (tahap 4 rencana ekonomi, November 2026): satu sistem pinjaman untuk bisnis dan utang pribadi.
// - bunga mengambang: suku bunga acuan dunia (Makro.rate) + spread menurut jenis + hukuman kredit jelek; dihitung harian dari sisa pokok
// - cicilan harian = bunga hari ini + pokok / sisa hari tenor, jadi pinjaman selalu lunas di akhir tenor
// - persetujuan murni dari keadaan (riwayat 90 hari, buku besar, umur, riwayat kredit), tidak acak: coba ulang = hasil sama (celah #12)
// - batas cicilan per rumah tangga dari pemasukan rutin 90 hari, bukan per makhluk (celah #4 dan #5)
// - utang tidak hilang: bisnis tutup rugi = utang pribadi pemilik (#3), meninggal = dibayar dari harta dulu (#2),
//   sisanya dihapus tapi riwayat kredit keluarga jelek dan ikut lintas generasi (#7)
// - lunas dipercepat bayar 2% lebih dan jeda 30 hari sebelum pinjam lagi (#9)
// Objek pinjaman: { p, amt, from, term, kind, left, pay }. left (= sisa pokok) dan pay (cicilan hari ini) dipakai UI lama.
"use strict";
(function () {
  const CFG = (typeof module !== "undefined") ? require("./econ-config.js") : globalThis.EconConfig;
  const MK = (typeof module !== "undefined") ? require("./makro.js") : globalThis.Makro;
  const Money = (typeof module !== "undefined") ? require("./money.js") : globalThis.Money;
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const K = CFG.BANK;
  const r2 = v => Math.round(v * 100) / 100;
  const ROUTINE = ["gaji", "pensiun", "bisnis_ambil"];

  // ---- riwayat kredit keluarga (di world, jadi ikut snapshot dan diwariskan ke generasi berikutnya)
  // baca saja (tampilan dan cek tidak boleh mengubah keadaan, supaya replay sama); dibuat baru saat gagal bayar pertama
  const NONE = Object.freeze({ bad: 0, pen: 0, n: 0 });
  const credit = home => home.world.kredit || NONE;
  const blocked = (home, day) => credit(home).bad > day;
  const penalty = (home, day) => credit(home).pen > day ? K.BAD_SPREAD : 0;
  function markBad(home, day, amt) {
    const C = home.world.kredit || (home.world.kredit = { bad: 0, pen: 0, n: 0 });
    C.n += 1; C.bad = Math.max(C.bad, day + K.BAD_BLOCK); C.pen = Math.max(C.pen, day + K.BAD_PEN); C.last = { d: day, amt: Math.round(amt) };
  }

  // ---- suku bunga per tahun untuk satu jenis pinjaman
  const rate = (kind, day, home) => r2((MK.rate(day) + K.SPREAD[kind] + (home ? penalty(home, day) : 0)) * 10000) / 10000;

  // ---- cicilan hari ini dari sisa pokok
  function due(L, day, home) {
    const p = L.p ?? L.left;
    if (!(p > 0)) return 0;
    const daysLeft = Math.max(1, L.from + L.term - day);
    return Math.max(1, Math.round(p * rate(L.kind || "biz", day, home) / 365 + p / daysLeft));
  }
  // bayar cicilan sejumlah n (sudah dipotong dari kas/dompet oleh pemanggil); bunga dulu, sisanya pokok
  function applyPay(L, n, day, home) {
    const p = L.p ?? L.left, interest = Math.round(p * rate(L.kind || "biz", day, home) / 365);
    L.p = Math.max(0, Math.round(p - Math.max(0, n - interest)));
    L.left = L.p; L.pay = L.p > 0 ? due(L, day + 1, home) : 0;
    L.paid = (L.paid || 0) + n;
    return L.p <= 0;
  }
  // pinjaman lama (sebelum bank.js): left sudah termasuk bunga tetap; dipakai apa adanya sebagai pokok
  function upgrade(L) { if (L && L.p == null) { L.p = L.left; L.kind = L.kind || "biz"; } return L; }

  function make(kind, amt, day, term, home) {
    const L = { p: Math.round(amt), amt: Math.round(amt), from: day, term, kind };
    L.left = L.p; L.pay = due(L, day, home); L.rate = rate(kind, day, home);
    return L;
  }
  // perkiraan total bayar kalau bunga hari ini tidak berubah (cuma buat tampilan)
  function estTotal(amt, term, r) {
    let p = amt, tot = 0;
    for (let d = 0; d < term; d++) { const pay = p * r / 365 + p / (term - d); tot += pay; p -= pay - p * r / 365; }
    return Math.round(tot);
  }

  // ---- pemasukan rutin rumah tangga per hari, rata-rata dari buku besar (maks 90 hari)
  function income(home, day) {
    let sum = 0, first = Infinity;
    for (const m of home.members) {
      if (!m.st || !m.st.led || ("keluar" in m.info) || !m.alive(day)) continue;
      for (const [k, R] of m.st.led.b) { first = Math.min(first, k); for (const w of ROUTINE) if (R[w]) sum += R[w][0]; }
    }
    if (!isFinite(first)) return 0;
    const span = Math.max(30, Math.min(Money.BUCKET * Money.KEEP, day - first * Money.BUCKET + 1));
    return sum / span;
  }
  // semua cicilan yang ditanggung rumah tangga hari ini: utang pribadi + pinjaman buka usaha yang dijamin keluarga
  function burden(home, day, bizList) {
    let s = 0;
    for (const m of home.members) if (m.st && m.st.utang && m.alive(day)) s += due(m.st.utang, day, home);
    for (const b of bizList || []) if (b.loan && !b.closed && b.loan.kind === "open") s += due(b.loan, day, home);
    return s;
  }
  // sisa ruang cicilan harian rumah tangga
  const room = (home, day, bizList) => Math.max(0, income(home, day) * K.HOUSEHOLD_SHARE - burden(home, day, bizList));
  // pokok terbesar yang cicilan hariannya muat di ruang itu
  const maxFor = (roomDay, kind, term, day, home) => Math.floor(roomDay / (rate(kind, day, home) / 365 + 1 / term) / 100) * 100;

  const isOld = (c, day) => !!c && E.phase_of(c.age(day)) === "tua";

  // ---- pinjaman buka usaha (dijamin rumah tangga): boleh atau tidak, dan berapa
  function openCheck(home, c, short, day, bizList) {
    if (blocked(home, day)) return { ok: false, why: "credit" };
    const T = isOld(c, day) ? Math.min(K.OPEN_TERM, K.OLD_TERM) : K.OPEN_TERM;
    const max = maxFor(room(home, day, bizList), "open", T, day, home) * (isOld(c, day) ? 0.5 : 1);
    return short <= max ? { ok: true, term: T, max } : { ok: false, why: "income", max };
  }
  // ---- pinjaman modal kerja bisnis yang sudah jalan: plafon dari riwayat 90 hari bisnis itu
  function bizOffers(home, b, t, day, owner) {
    if (t.fund) return { max: 0, offers: [], why: "fund" };
    if (blocked(home, day)) return { max: 0, offers: [], why: "credit" };
    if ((b.repaid || -Infinity) > day - K.COOLDOWN) return { max: 0, offers: [], why: "cooldown", until: b.repaid + K.COOLDOWN };
    const h = (b.hist || []).slice(-90), n = Math.max(30, h.length);
    const rev = h.reduce((s, r) => s + r[1], 0) / n * 30, prof = h.reduce((s, r) => s + r[2], 0) / n * 30;
    let max = Math.max(t.cap * 0.5, rev * 1.2 + Math.max(0, prof)) * Math.max(0.4, Math.min(1.4, (b.rep || 30) / 55));
    if (isOld(owner, day)) max *= 0.5;
    max = Math.round(max / 100) * 100;
    const terms = CFG.LOANS.filter(L => !isOld(owner, day) || L.term <= K.OLD_TERM);
    const r = rate("biz", day, home);
    return { max, rate: r, offers: terms.map((L) => ({ i: CFG.LOANS.indexOf(L), term: L.term, label: L.label, rate: r, amt: max, total: estTotal(max, L.term, r), pay: due({ p: max, from: day, term: L.term, kind: "biz" }, day, home) })) };
  }
  // ---- lunas dipercepat
  const payoff = L => Math.round((L.p ?? L.left) * K.EARLY_FEE);

  // ---- utang pribadi: sisa pinjaman bisnis yang tutup rugi pindah ke dompet pemilik
  function toPersonal(home, c, amt, day) {
    if (!c || !c.st || !(amt > 0)) return;
    const U = c.st.utang;
    if (U) { U.p = Math.round(U.p + amt); U.left = U.p; U.amt += Math.round(amt); U.term = Math.max(U.term, day - U.from + K.PERSONAL_TERM); U.pay = due(U, day, home); }
    else c.st.utang = make("personal", amt, day, K.PERSONAL_TERM, home);
  }
  // cicilan utang pribadi harian dari dompet; nggak cukup = bayar sebisanya, tunggakan dicatat, bunga tetap jalan
  function payPersonal(home, c, day) {
    const U = c.st && c.st.utang;
    if (!U || U.last === day) return null;
    U.last = day;
    const want = due(U, day, home), got = Math.max(0, Math.min(want, Math.floor(c.st.wallet)));
    if (got > 0) Money.move(c, -got, "utang", day);
    if (got < want) {
      U.late = (U.late || 0) + 1;
      // bayaran dipakai untuk bunga dulu; bunga yang tak terbayar ditambahkan ke pokok
      const interest = Math.round(U.p * rate("personal", day, home) / 365);
      U.p = Math.max(0, Math.round(U.p - (got - interest)));
      U.left = U.p; U.pay = due(U, day + 1, home);
      // macet lama: dianggap gagal bayar, riwayat kredit keluarga jelek (utangnya tetap ada)
      if (U.late >= K.LATE_BAD && !U.flagged) { U.flagged = true; markBad(home, day, U.p); }
      return { late: true };
    }
    U.late = 0;
    if (applyPay(U, got, day, home)) { c.st.utang = null; return { done: true }; }
    return { paid: got };
  }
  // meninggal: utang dibayar dari harta dulu; sisanya dihapus dan riwayat kredit keluarga jadi jelek
  function settle(home, c, day) {
    const U = c.st && c.st.utang;
    if (!U) return null;
    const p = U.p ?? U.left, pay = Math.min(p, Math.max(0, Math.floor(c.st.wallet)));
    if (pay > 0) Money.move(c, -pay, "utang", day);
    c.st.utang = null;
    if (p - pay > 0) markBad(home, day, p - pay);
    return { paid: pay, lost: p - pay };
  }

  const Bank = { credit, blocked, rate, due, applyPay, upgrade, make, estTotal, income, burden, room, openCheck, bizOffers, payoff, toPersonal, payPersonal, settle, markBad };
  if (typeof module !== "undefined") module.exports = Bank;
  else globalThis.Bank = Bank;
})();

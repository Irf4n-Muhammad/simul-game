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
    if (home.world.kpr) s += due(home.world.kpr, day, home);
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
    const want = due(U, day, home);
    cover(c, want, day);
    const got = Math.max(0, Math.min(want, Math.floor(c.st.wallet)));
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
    if (c.st && c.st.tab > 0) { Money.move(c, c.st.tab, "tabungan", day); c.st.tab = 0; }
    const U = c.st && c.st.utang;
    if (!U) return null;
    const p = U.p ?? U.left, pay = Math.min(p, Math.max(0, Math.floor(c.st.wallet)));
    if (pay > 0) Money.move(c, -pay, "utang", day);
    c.st.utang = null;
    if (p - pay > 0) markBad(home, day, p - pay);
    return { paid: pay, lost: p - pay };
  }

  // ---------------------------------------------------------------- tabungan (tahap 5)
  // Bunga tabungan mengambang juga, selalu jauh di bawah pinjaman termurah (celah #1): 40% suku bunga acuan, 1–10%.
  // Inilah pengganti inflasi: uang yang diam di dompet tidak tumbuh, yang ditabung tumbuh pelan.
  const saveRate = day => r2(Math.max(0.01, Math.min(0.1, MK.rate(day) * K.SAVE_SHARE)) * 10000) / 10000;
  const cheapest = day => MK.rate(day) + Math.min(...Object.values(K.SPREAD));
  function accrue(c, day) {
    const st = c.st;
    if (!st || !(st.tab > 0) || st.tabD === day) return 0;
    st.tabD = day;
    const i = r2(st.tab * saveRate(day) / 365);
    st.tab = r2(st.tab + i); st.tabEarn = r2((st.tabEarn || 0) + i);
    return i;
  }
  function deposit(c, n, day) {
    n = Math.floor(Math.min(n, c.st.wallet));
    if (!(n > 0) || !Money.move(c, -n, "tabungan", day, "need")) return false;
    c.st.tab = r2((c.st.tab || 0) + n);
    return true;
  }
  function withdraw(c, n, day) {
    n = Math.min(n, c.st.tab || 0);
    if (!(n > 0)) return false;
    c.st.tab = r2(c.st.tab - n); Money.move(c, n, "tabungan", day);
    return true;
  }
  // dompet kurang untuk tagihan wajib: ambil dari tabungan dulu
  function cover(c, need, day) { const gap = need - Math.max(0, c.st.wallet); if (gap > 0 && c.st.tab > 0) withdraw(c, Math.ceil(gap), day); }

  // ---------------------------------------------------------------- KPR (tahap 5)
  // Pinjaman rumah milik keluarga (home.world.kpr), dijamin rumahnya sendiri: satu rumah satu pinjaman, dan selama masih ada
  // KPR keluarga tidak bisa beli rumah lain (celah #6). Uang muka 30%, cicilan masuk batas 40% rumah tangga.
  // Dibayar harian oleh anggota dewasa terkaya (dompet lalu tabungan). Menunggak terlalu lama: rumah disita (status.js).
  // Pembayar meninggal tidak menghapusnya, karena utangnya milik keluarga, bukan makhluk.
  const kpr = home => home.world.kpr || null;
  function kprCheck(home, c, cost, day, bizList) {
    if (kpr(home)) return { ok: false, why: "kpr" };
    if (blocked(home, day)) return { ok: false, why: "credit" };
    const down = Math.ceil(cost * K.KPR_DOWN / 100) * 100, amt = cost - down;
    if (c.st.wallet + (c.st.tab || 0) < down) return { ok: false, why: "down", down, amt };  // uang muka boleh dari tabungan
    const term = isOld(c, day) ? K.OLD_TERM : K.KPR_TERM;
    const max = maxFor(room(home, day, bizList), "kpr", term, day, home) * (isOld(c, day) ? 0.5 : 1);
    const pay = due({ p: amt, from: day, term, kind: "kpr" }, day, home);
    return amt <= max ? { ok: true, down, amt, term, pay, rate: rate("kpr", day, home), max } : { ok: false, why: "income", down, amt, term, pay, max };
  }
  function kprOpen(home, c, ok, houseId, day) {
    cover(c, ok.down, day);
    Money.move(c, -ok.down, "rumah", day);
    const L = make("kpr", ok.amt, day, ok.term, home);
    L.house = houseId; L.by = c.id;
    home.world.kpr = L;
    return L;
  }
  // cicilan harian; hasil: { paid } | { done } | { late, foreclose? }
  function kprPay(home, payer, day) {
    const L = kpr(home);
    if (!L || L.last === day || !payer) return null;
    L.last = day;
    const want = due(L, day, home);
    cover(payer, want, day);
    const got = Math.max(0, Math.min(want, Math.floor(payer.st.wallet)));
    if (got > 0) Money.move(payer, -got, "kpr", day);
    if (got < want) {
      const interest = Math.round(L.p * rate("kpr", day, home) / 365);
      L.p = Math.max(0, Math.round(L.p - (got - interest))); L.left = L.p; L.pay = due(L, day + 1, home);
      L.late = (L.late || 0) + 1;
      return { late: L.late, foreclose: L.late >= K.KPR_LATE };
    }
    L.late = 0;
    if (applyPay(L, got, day, home)) { home.world.kpr = null; return { done: true }; }
    return { paid: got };
  }
  // rumah disita: dijual murah, hasilnya melunasi KPR; lebihnya ke pembayar, kurangnya jadi utang pribadi pembayar. Kredit keluarga jelek.
  function foreclose(home, payer, value, day) {
    const L = kpr(home);
    if (!L) return null;
    const sale = Math.round(value * K.KPR_FIRE_SALE), rest = sale - L.p;
    home.world.kpr = null;
    if (rest > 0) Money.move(payer, rest, "rumah", day);
    else toPersonal(home, payer, -rest, day);
    markBad(home, day, Math.max(0, -rest));
    return { sale, rest };
  }
  function kprPayoff(home, c, day) {
    const L = kpr(home);
    if (!L) return false;
    const n = payoff(L);
    if (!Money.move(c, -n, "kpr", day, "need")) return false;
    home.world.kpr = null;
    return true;
  }

  const Bank = { saveRate, cheapest, accrue, deposit, withdraw, cover, kpr, kprCheck, kprOpen, kprPay, foreclose, kprPayoff, credit, blocked, rate, due, applyPay, upgrade, make, estTotal, income, burden, room, openCheck, bizOffers, payoff, toPersonal, payPersonal, settle, markBad };
  if (typeof module !== "undefined") module.exports = Bank;
  else globalThis.Bank = Bank;
})();

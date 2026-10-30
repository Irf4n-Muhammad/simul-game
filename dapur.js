// dapur.js: dompet koin dapur dan harga makanan (v49). Fungsi murni seperti kabar.js: menerima/mengubah objek dompet, tidak menyentuh
// simulasi. Diskusi 28 Okt: makanan enak dibeli pakai uang dari mini game; makanan dasar (basic) selalu gratis supaya rawat wajib tetap
// di bawah semenit dan pemain santai nggak bikin anaknya kelaparan. Koin bukan Buttons (cosmetics.js): ini dari main, bukan dibeli.
//
//   Dapur.fresh()                 -> dompet baru { v, koin, hari, dapat, main, best: { game: skor } } (modal awal START)
//   Dapur.price(opt)              -> harga pilihan makan (0 = gratis; null = bukan makanan)
//   Dapur.can(W, opt)             -> cukup koinnya atau nggak
//   Dapur.spend(W, opt)           -> true kalau berhasil (koin dipotong)
//   Dapur.earn(W, game, skor, d)  -> { got, left, best } koin yang masuk; per hari dibatasi CAP, sisanya cuma ngejar skor terbaik
//   Dapur.left(W, d)              -> sisa koin yang masih bisa didapat hari d
//   Dapur.coinsFor(skor)          -> koin dari satu ronde (sebelum batas harian)
//   Dapur.tier(game, skor)        -> peringkat rekor { ix, name, next, need } (v52): Rookie, Bronze, Silver, Gold, Diamond, Legend.
//                                    next/need = peringkat berikutnya dan berapa poin lagi (null kalau udah Legend)
//
// Batas harian: cukup buat dua makan enak sehari kalau main 2-3 ronde; main lebih banyak tetap boleh (seru, rekor), koinnya nggak nambah.
"use strict";
(() => {
  const START = 50, CAP = 60;
  const PRICE = { power: 12, comfort: 15, fruit: 12, light: 12, family: 18, treat: 20, basic: 0 };
  const fresh = () => ({ v: 1, koin: START, hari: null, dapat: 0, main: 0, best: {} });
  const roll = (W, d) => { if (W.hari !== d) { W.hari = d; W.dapat = 0; W.main = 0; } };
  const price = opt => (opt in PRICE ? PRICE[opt] : null);
  const can = (W, opt) => price(opt) === null || W.koin >= price(opt);
  function spend(W, opt) {
    const p = price(opt); if (p === null || p === 0) return true;
    if (W.koin < p) return false;
    W.koin -= p; return true;
  }
  const coinsFor = skor => Math.max(0, Math.round(skor));
  const left = (W, d) => W.hari === d ? Math.max(0, CAP - W.dapat) : CAP;
  function earn(W, game, skor, d) {
    roll(W, d);
    const got = Math.min(coinsFor(skor), CAP - W.dapat);
    W.dapat += got; W.koin += got; W.main += 1;
    const best = skor > (W.best[game] || 0);
    if (best) W.best[game] = skor;
    return { got, left: CAP - W.dapat, best };
  }
  // ambang tiap game (skor minimum buat Bronze..Legend); disetel dari main uji, nanti dari telemetri
  const TIERS = ["Rookie", "Bronze", "Silver", "Gold", "Diamond", "Legend"];
  const BAR = { potong: [10, 25, 40, 60, 85], buah: [10, 20, 30, 45, 60], stack: [5, 12, 20, 30, 45], pisau: [6, 15, 25, 40, 60] };
  function tier(game, skor) {
    const b = BAR[game] || BAR.buah, s = skor || 0;
    let ix = 0; while (ix < b.length && s >= b[ix]) ix++;
    return { ix, name: TIERS[ix], next: ix < b.length ? TIERS[ix + 1] : null, need: ix < b.length ? b[ix] - s : null };
  }
  const api = { START, CAP, PRICE, TIERS, fresh, price, can, spend, earn, left, coinsFor, tier };
  if (typeof module !== "undefined") module.exports = api;
  else globalThis.Dapur = api;
})();

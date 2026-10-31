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
//   Dapur.SKINS[game]             -> daftar skin (v53): { id, name, tier } kebuka dari peringkat, { id, name, stat, n } dari milestone total, { id, name, puzzle } dari puzzle (v61)
//   Dapur.track(W, stat, n)       -> nambah hitungan milestone (W.stat[stat])
//   Dapur.unlocked(W, game)       -> id skin yang udah kebuka
//   Dapur.skinOf(W, game)         -> skin yang dipakai (pilihan pemain kalau udah kebuka, kalau nggak "dasar")
//   Dapur.wear(W, game, id)       -> pakai skin (false kalau masih kekunci)
//   Dapur.harian(d)               -> game tantangan hari d (v56); Dapur.rng(d) -> angka acak berbenih (level sama buat semua)
//   Dapur.daily(W, d, skor)       -> catat main tantangan: { first, streak, bonus, best }; bonus koin cuma di main pertama hari itu,
//                                    nggak kepotong batas harian (CAP). Dapur.streakNow(W, d) -> streak yang masih hidup
// Skin cuma dari main (diskusi 31 Okt): skin peringkat nggak pernah dijual, koin tetap khusus makhluk.
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
  const SKINS = {
    pisau: [{ id: "dasar", name: "Kitchen knife" }, { id: "perunggu", name: "Bronze blade", tier: 1 }, { id: "perak", name: "Silver blade", tier: 2 },
      { id: "emas", name: "Golden blade", tier: 3 }, { id: "berlian", name: "Crystal blade", tier: 4 }, { id: "legenda", name: "Dragon blade", tier: 5 },
      { id: "tukang", name: "Carpenter's knife", stat: "pisau", n: 500 }, { id: "ninja", name: "Ninja blade", puzzle: "ninja" }],
    stack: [{ id: "dasar", name: "Pastel" }, { id: "perunggu", name: "Clay", tier: 1 }, { id: "perak", name: "Stone", tier: 2 },
      { id: "emas", name: "Gold bars", tier: 3 }, { id: "berlian", name: "Ice", tier: 4 }, { id: "legenda", name: "Rainbow", tier: 5 },
      { id: "permen", name: "Candy", stat: "perfect", n: 25 }, { id: "galaksi", name: "Galaxy", puzzle: "galaksi" }],
    // v65: Fruit slash = warna jejak goresan, Fruit catch = wadah penangkap
    potong: [{ id: "dasar", name: "Plain swipe" }, { id: "perunggu", name: "Bronze swipe", tier: 1 }, { id: "perak", name: "Silver swipe", tier: 2 },
      { id: "emas", name: "Golden swipe", tier: 3 }, { id: "berlian", name: "Ice swipe", tier: 4 }, { id: "legenda", name: "Rainbow swipe", tier: 5 },
      { id: "katana", name: "Katana", stat: "iris", n: 500 }, { id: "neon", name: "Neon swipe", puzzle: "neon" }],
    buah: [{ id: "dasar", name: "Basket" }, { id: "perunggu", name: "Bucket", tier: 1 }, { id: "perak", name: "Bowl", tier: 2 },
      { id: "emas", name: "Trophy cup", tier: 3 }, { id: "berlian", name: "Shopping cart", tier: 4 }, { id: "legenda", name: "UFO", tier: 5 },
      { id: "topi", name: "Magic hat", stat: "tangkap", n: 500 }, { id: "gurita", name: "Octopus", puzzle: "gurita" }],
  };
  const stats = W => (W.stat = W.stat || {});
  function track(W, stat, n) { const S = stats(W); S[stat] = (S[stat] || 0) + n; return S[stat]; }
  function unlocked(W, game) {
    const t = tier(game, (W.best || {})[game]).ix, S = stats(W);
    return (SKINS[game] || []).filter(k => k.tier ? t >= k.tier : k.stat ? (S[k.stat] || 0) >= k.n : k.puzzle ? solved(W, k.puzzle) : true).map(k => k.id);
  }
  const skinOf = (W, game) => { const id = (W.skin || {})[game]; return id && unlocked(W, game).includes(id) ? id : "dasar"; };
  function wear(W, game, id) { if (!unlocked(W, game).includes(id)) return false; W.skin = W.skin || {}; W.skin[game] = id; return true; }
  // peti misteri dan puzzle (v61, diskusi 31 Okt: yang bikin nagih itu nemu sesuatu pas main, bukan misi atau achievement).
  // Peti/kepingan muncul di tengah permainan (paling banyak BOX_DAY sehari); peti dibuka di kartu akhir.
  // Kepingan ngisi puzzle yang lagi jalan; puzzle lengkap = skin khusus yang cuma bisa dari puzzle.
  const BOX_DAY = 6;
  const PUZZLES = [{ id: "ninja", game: "pisau", need: 6 }, { id: "galaksi", game: "stack", need: 6 }, { id: "neon", game: "potong", need: 6 }, { id: "gurita", game: "buah", need: 6 }];
  const puz = W => (W.puzzle = W.puzzle || { ix: 0, n: 0 });
  const solved = (W, id) => { const i = PUZZLES.findIndex(p => p.id === id); return i >= 0 && puz(W).ix > i; };
  const canDrop = (W, d) => !(W.peti && W.peti.d === d && W.peti.n >= BOX_DAY);
  function found(W, d) { if (!(W.peti && W.peti.d === d)) W.peti = { d, n: 0 }; W.peti.n += 1; return W.peti.n; }
  function puzzleNow(W) { const P = puz(W), p = PUZZLES[P.ix]; return p ? { ...p, have: P.n } : null; }
  function addPiece(W) {
    const P = puz(W), p = PUZZLES[P.ix];
    if (!p) { W.koin += 20; return { kind: "coin", n: 20 }; }   // semua puzzle udah lengkap: kepingan jadi koin
    P.n += 1;
    if (P.n < p.need) return { kind: "piece", id: p.id, game: p.game, have: P.n, need: p.need };
    P.ix += 1; P.n = 0;
    return { kind: "piece", id: p.id, game: p.game, have: p.need, need: p.need, done: true };
  }
  // r1, r2 acak 0..1 dari pemanggil (biar bisa dites): 30% kepingan, 5% jackpot, sisanya koin 8–22
  function openBox(W, r1, r2) {
    if (r1 < 0.3) return addPiece(W);
    const n = r1 < 0.35 ? 50 : 8 + Math.floor(r2 * 15);
    W.koin += n; return { kind: "coin", n, jackpot: n === 50 };
  }
  const DAILY = ["pisau", "potong", "stack", "buah"];
  // mulberry32: cepat, cukup acak buat susunan level
  function rng(seed) {
    let a = (seed * 2654435761) >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const harian = d => DAILY[((d % DAILY.length) + DAILY.length) % DAILY.length];
  const streakNow = (W, d) => { const S = W.streak; return S && (S.last === d || S.last === d - 1) ? S.n : 0; };
  function daily(W, d, skor) {
    const first = !(W.harian && W.harian.d === d);
    if (first) W.harian = { d, best: 0, n: 0 };
    W.harian.n += 1; W.harian.best = Math.max(W.harian.best, skor);
    let bonus = 0;
    if (first) {
      const S = W.streak || { n: 0, last: null };
      W.streak = { n: S.last === d - 1 ? S.n + 1 : 1, last: d };
      bonus = Math.min(5 * W.streak.n, 25); W.koin += bonus;
    }
    return { first, streak: W.streak.n, bonus, best: W.harian.best };
  }
  const api = { START, CAP, PRICE, TIERS, SKINS, fresh, price, can, spend, earn, left, coinsFor, tier, track, unlocked, skinOf, wear, harian, rng, daily, streakNow, BOX_DAY, PUZZLES, canDrop, found, puzzleNow, addPiece, openBox };
  if (typeof module !== "undefined") module.exports = api;
  else globalThis.Dapur = api;
})();

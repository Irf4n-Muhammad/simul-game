// Ekonomi dunia (lapis 2 rencana ekonomi, November 2026): satu indeks dan satu suku bunga, sama untuk semua pemain.
// Dulu cuma hidup di venture.js dan cuma menggerakkan bisnis. Sekarang semua sektor membaca dari sini:
// bisnis (venture), PHK dan lowongan (career), promosi (status), harga rumah (status), bunga bank (bank).
// Semua murni dari hari + hash, jadi bisa diputar ulang. Siklusnya bisa dihitung dari kode: itu diterima sebagai
// "almanak" (celah #8 di doc); yang penting bunga mengambang, jadi kunci bunga murah tidak abadi.
"use strict";
(function () {
  const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const r2 = v => Math.round(v * 100) / 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // resesi: ~14% peluang per blok 240 hari, panjang 60–130 hari, dalam 18–32%
  function recession(day) {
    for (let b = Math.floor(day / 240) - 1; b <= Math.floor(day / 240); b++) {
      if (hash("resesi" + b) >= 0.14) continue;
      const start = b * 240 + Math.floor(hash("resesi-m" + b) * 150), len = 60 + Math.floor(hash("resesi-l" + b) * 70);
      if (day >= start && day < start + len) return { start, len, depth: 0.18 + hash("resesi-d" + b) * 0.14 };
    }
    return null;
  }
  // indeks dunia: 1 = normal, ~1,14 puncak boom, ~0,7 dasar resesi
  const _econ = new Map();
  function econ(day) {
    if (_econ.has(day)) return _econ.get(day);
    let v = 1 + 0.1 * Math.sin(2 * Math.PI * day / 720 + 1.3) + 0.04 * Math.sin(2 * Math.PI * day / 170 + 0.4);
    const R = recession(day);
    if (R) { const t = (day - R.start) / R.len; v *= 1 - R.depth * Math.sin(Math.PI * Math.min(1, t * 1.4)); }
    v = r2(v * 1000) / 1000;
    if (_econ.size > 4000) _econ.clear();
    _econ.set(day, v);
    return v;
  }
  const econLabel = v => v >= 1.08 ? "Booming" : v >= 0.98 ? "Steady" : v >= 0.88 ? "Slowing" : "Recession";

  // rata-rata indeks 60 hari terakhir: yang lambat (harga rumah, bunga) ikut ini, bukan angka harian
  const _slow = new Map();
  function slow(day) {
    if (_slow.has(day)) return _slow.get(day);
    let s = 0; for (let d = day - 59; d <= day; d++) s += econ(d);
    const v = Math.round(s / 60 * 1000) / 1000;
    if (_slow.size > 4000) _slow.clear();
    _slow.set(day, v);
    return v;
  }

  // suku bunga acuan per tahun: murah saat boom, mahal saat resesi (bank lebih hati-hati)
  // 1,10 → ~8%, 1,00 → 12%, 0,80 → ~20%
  const rate = day => r2(clamp(0.12 + (1 - slow(day)) * 0.4, 0.06, 0.24) * 100) / 100;

  // efek ke sektor lain
  // PHK: peluang per perusahaan per 30 hari dikali ini
  const layoffMult = day => { const v = econ(day); return v < 0.88 ? 2.5 : v < 0.98 ? 1.5 : 1; };
  // lowongan: jumlah lowongan dikali ini
  const hireMult = day => clamp(econ(day), 0.6, 1.1);
  // review promosi: tambahan skor yang dibutuhkan saat ekonomi lesu (perusahaan menahan kenaikan)
  const promoHarder = day => { const v = econ(day); return v < 0.88 ? 8 : v < 0.98 ? 3 : 0; };
  // harga rumah: ikut indeks lambat dan bunga, ±15%
  const housePrice = day => r2(clamp(1 + (slow(day) - 1) * 1.2 - (rate(day) - 0.12) * 0.8, 0.85, 1.15));

  const Makro = { recession, econ, econLabel, slow, rate, layoffMult, hireMult, promoHarder, housePrice };
  if (typeof module !== "undefined") module.exports = Makro;
  else globalThis.Makro = Makro;
})();

// Angka ekonomi di satu tempat (tahap 1 rencana "Ekonomi game: peta dan struktur top-down", November 2026).
// Jangkar: 1 HK (Hari Kerja) = gaji harian pekerjaan pemula median. Angka baru sebaiknya ditulis dalam HK lalu dikali HK,
// supaya selalu terbaca "setara berapa hari kerja". Angka lama di bawah masih dalam koin, nilainya persis sama dengan v73,
// jadi memindahkannya ke sini tidak mengubah permainan. Modul lain membaca dari sini, bukan menyimpan angka sendiri.
"use strict";
(function () {
  const HK = 60;
  const EconConfig = {
    HK,
    // hidup sehari-hari (status.js)
    LIVING_COST: 15,            // koin per hari untuk makhluk dewasa/tua yang tidak sedang kuliah
    START_BONUS: 300,           // sekali, saat pertama kali dewasa
    PENSION_RATE: 0.4,          // pensiun = 40% gaji terakhir (pemilik bisnis: 40% rata-rata ambilan)
    STAT_UANG_COINS: 50,        // storylet lama: 1 poin stat "uang" = 50 koin
    STAT_UANG_MAX: 5000,        // batas stat "uang" yang ditampilkan ke cerita lama
    // keluarga (game.js)
    DIVORCE_FEE: 0.25,          // bagian dompet yang habis saat cerai
    // bank (venture.js): pinjaman modal kerja bisnis yang sudah berjalan
    LOANS: [{ term: 120, rate: 0.06, label: "4 months" }, { term: 240, rate: 0.13, label: "8 months" }, { term: 480, rate: 0.26, label: "16 months" }],
    // pinjaman saat buka bisnis kalau modal kurang
    OPEN_LOAN: { term: 240, rate: 0.15 },
    EARLY_REPAY: 0.97,          // lunas dipercepat: bayar 97% sisa tagihan
    // rumah (status.js): biaya pegang per tahun (pajak, perawatan, listrik) dari harga beli, dibayar harian oleh anggota dewasa terkaya
    HOUSE_UPKEEP: { flat: 0.02, house: 0.03, villa: 0.05, mansion: 0.07 },
    // jam (ui/01-save-clock.js): hari yang boleh lewat sekaligus saat app dibuka lagi (jam nyata saja)
    CATCHUP_DAYS: 30,
  };
  if (typeof module !== "undefined") module.exports = EconConfig;
  else globalThis.EconConfig = EconConfig;
})();

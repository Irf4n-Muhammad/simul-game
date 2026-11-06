// Satu pintu untuk semua perubahan dompet koin (tahap 1 rencana ekonomi, November 2026).
// Tiap perubahan c.st.wallet lewat Money.move(c, n, why, day, mode) supaya ada catatan kenapa uang masuk dan keluar.
// Hasil permainan sama persis dengan menulis wallet langsung; yang bertambah cuma buku besar ringkas di c.st.led.
//
// mode:
//   (kosong)  wallet += n, boleh jadi negatif (sama dengan kode lama yang menulis langsung)
//   "floor"   wallet = max(0, wallet + n): yang tercatat adalah perubahan yang benar-benar terjadi
//   "need"    cuma jalan kalau dompet cukup (wallet >= -n); kalau tidak, dompet tidak berubah dan hasilnya false
// Hasil: perubahan yang terjadi (angka), atau true/false untuk mode "need".
//
// Buku besar: per 30 hari, per alasan, [masuk, keluar]; disimpan 3 periode terakhir (90 hari).
// Alasan ditulis pendek dan tetap (lihat WHY) supaya bisa dijumlah lintas save, telemetry, dan simulator.
"use strict";
(function () {
  const BUCKET = 30, KEEP = 3;
  const WHY = {
    gaji: "Salary", pensiun: "Pension", mulai: "Start-of-adult bonus", hidup: "Living costs", cerita: "Life events",
    hadiah: "Prize money", lembur: "Overtime and extras", kursus: "Courses",
    barang: "Purchases", pasar_beli: "Bazaar purchases", pasar_jual: "Bazaar sales",
    founder: "Founder capital", bisnis_ambil: "Business draw", bisnis_tutup: "Covering business losses",
    bisnis_modal: "Business start-up capital", bisnis_jual: "Business sale", urunan: "Family chip-in",
    warisan: "Inheritance", hewan: "Pets", cerai: "Divorce settlement", demo: "Test mode",
  };
  const r2 = v => Math.round(v * 100) / 100;

  function note(c, n, why, day) {
    if (!n || day == null || !isFinite(day)) return;
    const k = Math.floor(day / BUCKET), L = c.st.led || (c.st.led = { b: [] });
    let B = L.b.length ? L.b[L.b.length - 1] : null;
    if (!B || B[0] !== k) {
      if (B && B[0] > k) { B = L.b.find(e => e[0] === k); if (!B) return; }  // hari lama (jarang): masuk ke periodenya kalau masih disimpan
      else { B = [k, {}]; L.b.push(B); while (L.b.length > KEEP) L.b.shift(); }
    }
    const e = B[1][why] || (B[1][why] = [0, 0]);
    if (n > 0) e[0] = r2(e[0] + n); else e[1] = r2(e[1] - n);
  }

  function move(c, n, why, day, mode) {
    if (!c || !c.st) return mode === "need" ? false : 0;
    const st = c.st, before = st.wallet;
    if (mode === "need") {
      if (n < 0 && before < -n) return false;
      st.wallet = before + n;
    } else if (mode === "floor") st.wallet = Math.max(0, before + n);
    else st.wallet = before + n;
    const d = st.wallet - before;
    note(c, d, why, day);
    return mode === "need" ? true : d;
  }
  // set dompet ke nilai tertentu (mode uji, warisan habis dibagi): dicatat sebagai selisihnya
  function set(c, v, why, day) { return c && c.st ? move(c, v - c.st.wallet, why, day) : 0; }

  // ringkasan buku besar satu makhluk: { why: [masuk, keluar] } untuk periode yang disimpan
  function ledger(c) {
    const out = {};
    for (const [, R] of (c && c.st && c.st.led ? c.st.led.b : [])) for (const [k, [i, o]] of Object.entries(R)) {
      const e = out[k] || (out[k] = [0, 0]); e[0] = r2(e[0] + i); e[1] = r2(e[1] + o);
    }
    return out;
  }
  // ringkasan satu rumah (semua anggota yang punya dompet)
  function household(home) {
    const out = {};
    for (const m of home.members) for (const [k, [i, o]] of Object.entries(ledger(m))) {
      const e = out[k] || (out[k] = [0, 0]); e[0] = r2(e[0] + i); e[1] = r2(e[1] + o);
    }
    return out;
  }

  const Money = { move, set, ledger, household, WHY, BUCKET, KEEP };
  if (typeof module !== "undefined") module.exports = Money;
  else globalThis.Money = Money;
})();

// today.js: baris "Today" di layar utama (v43). Dipindah dari skrip UI (v44 inline, fungsi todayLine) tanpa
// mengubah urutan keputusan, supaya bisa di-require dan diuji di Node. Fungsi murni: menerima potret keadaan
// hari ini, mengembalikan satu baris { k, ic, tx, go, id?, m?, now?, quiet? } atau null. `go` berupa kunci aksi;
// UI (ui/14-doors-today-wants.js) yang memetakannya ke fungsi layar:
//   dilema -> showDilemma, tur -> tourStart(id, true), diary -> showDiary, rawat -> klik tombol strip rawat id,
//   momen -> showMoment(m), profil -> showProfile(cur.id).
//
// Urutan prioritas (sama persis dengan v44):
//   1. makhluk pergi (meninggal/merantau)               -> null (baris disembunyikan)
//   2. ada dilema menunggu                              -> "<nama> needs an answer"              (now)
//   2b. (v44.1) sesi fokus sedang jalan                  -> "Focus with <nama>: 12:30 left"       (now)
//   3. pintu baru terbuka hari ini                      -> "New today: <pintu>"                  (now)
//   4. momen greget hari ini (skor >= 2, ada kalimat)   -> kalimat momen
//   5. rawat yang masih terbuka                         -> "<item> for <nama> · N to do"
//   5a. (v48) pertanyaan harian makhluk (obrolan.js)    -> "<nama> wants to ask you something" / bayi "<nama> needs you" (now)
//   5b. (v44.1) pertanyaan mingguan makhluk ke pemain   -> "<nama> asks: have you eaten today?"  (now)
//   6. momen terjadwal <= 2 hari                        -> "<kapan>: <siapa>, <momen>"
//   7. keinginan aktif pertama                          -> "<nama> wants <keinginan>"
//   8. rawat selesai                                    -> "All done for today..." / "Morning done..." (quiet)
//   9. tidak ada apa-apa                                -> "A quiet day in Old Town."             (quiet)
//
// Potret S yang diterima:
//   cur       { id, fase, nama }   makhluk yang sedang dilihat
//   pending   dilema yang menunggu (game.pending) atau null
//   fokus     (v44.1) sesi fokus yang sedang jalan { min, left } atau null/undefined
//   feed      daftar log hari (l.day, l.cid, l.events, ...); yang dibaca hanya hari ini
//   d         hari ini (today())
//   doors()   peta pintu terbuka { id: true } (doorsNow)
//   care()    tampilan rawat { half, items: [{ id, label, open, done }] } atau null kalau belum bisa dirawat
//   tanya()   (v48) pertanyaan harian yang belum dijawab { id, mode } atau null; boleh tidak ada
//   balik()   (v44.1) pertanyaan rawat terbalik yang jatuh tempo { id, ic, q } atau null; boleh tidak ada
//   next()    momen terjadwal berikutnya { id, day, cid, label } atau null
//   wants()   keinginan aktif [{ id, ic, label }] (Wants.active)
//   fmtWhen(day), nameOf(cid)   pemformat teks dari UI
// Yang berbentuk fungsi dipanggil hanya kalau urutan sampai ke sana, sama seperti versi inline.
"use strict";
(() => {
  const Wants = (typeof module !== "undefined") ? require("./wants.js") : globalThis.Wants;
  const Moments = (typeof module !== "undefined") ? require("./moments.js") : globalThis.Moments;

  function line(S) {
    const cur = S.cur; if (!cur) return null;
    const gone = cur.fase === "meninggal" || cur.fase === "merantau";
    if (gone) return null;
    const d = S.d, n = cur.nama;
    if (S.pending) return { k: "dilema", ic: "💬", tx: `${S.pending.name} needs an answer`, go: "dilema", now: true };
    // v44.1: sesi fokus yang sedang jalan (ui/32-focus.js); kunci ikut menit tersisa supaya teksnya ganti tiap menit
    if (S.fokus) return { k: "fokus:" + S.fokus.min, ic: "⏳", tx: `Focus with ${n}: ${S.fokus.left} left`, go: "fokus", now: true };
    const logsToday = S.feed.filter(l => l.day === d), P = S.doors();
    for (const l of logsToday) for (const e of l.events) { const D = Wants.doorOf(e); if (D && P[D.id]) return { k: "pintu:" + D.id, ic: "✨", tx: `New today: ${D.label}`, go: "tur", id: D.id, now: true }; }
    const mom = logsToday.filter(l => l.cid === cur.id).flatMap(l => Moments.detect(l)).filter(m => m.i >= 2 && m.line).sort((a, b) => b.i - a.i)[0];
    if (mom) return { k: "momen:" + mom.tag, ic: mom.kind === "sedih" ? "🌧" : mom.kind === "tegang" ? "⏳" : "✨", tx: mom.line, go: "diary" };
    const v = S.care();
    if (v) { const open = v.items.filter(i => i.open && !i.done); if (open.length) { const i = open[0]; return { k: "rawat:" + i.id + ":" + v.half, ic: v.half ? "☾" : "☀", tx: `${i.label} for ${n}${open.length > 1 ? ` · ${open.length} to do` : ""}`, go: "rawat", id: i.id }; } }
    // v48: pertanyaan harian (obrolan.js): sesudah rawat, makhluk yang buka obrolan; ketuk = buka Ngobrol
    const Q = S.tanya ? S.tanya() : null; if (Q) return { k: "tanya:" + Q.id, ic: Q.mode === "keadaan" ? "👶" : "💬", tx: Q.mode === "keadaan" ? `${n} needs you` : `${n} wants to ask you something`, go: "tanya", now: true };
    // v44.1: rawat terbalik (balik.js): sesudah rawat hari ini beres, makhluk gantian nanya tentang pemain
    const B = S.balik ? S.balik() : null; if (B) return { k: "balik:" + B.id, ic: B.ic, tx: B.q, go: "balik", now: true };
    const m = S.next(); if (m && m.day - d <= 2) return { k: "momen:" + m.id, ic: "📌", tx: `${S.fmtWhen(m.day)}: ${S.nameOf(m.cid)}, ${m.label}`, go: "momen", m };
    const wants = S.wants(); if (wants.length) { const w = wants[0]; return { k: "ingin:" + w.id, ic: w.ic, tx: `${n} wants ${w.label}`, go: "profil" }; }
    if (v) return { k: "beres:" + v.half, ic: "✓", tx: v.half ? `All done for today. ${n} is settled.` : `Morning done. Come back this evening.`, quiet: true };
    return { k: "sepi", ic: "·", tx: "A quiet day in Old Town.", quiet: true };
  }

  const API = { line };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Today = API;
})();

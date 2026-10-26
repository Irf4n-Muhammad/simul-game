// soon.js: baris "Soon" dan "Someday" di layar utama (v44.1; daftar-saran 1–4 dan 6, 26 Okt). Pola sama dengan today.js:
// fungsi murni yang menerima potret keadaan dan mengembalikan teks, supaya bisa di-require dan diuji di Node. Tidak membaca
// dunia langsung, tidak menulis apa pun, dan tidak menambah konten simulasi: semua tanggal di sini SUDAH ADA di mesin
// (ujian, momen terjadwal, kelahiran, kelas malam, maraton, review promosi, ganti fase, ulang tahun, majalah, drop Bazaar,
// rumah yang sedang dibangun, kejadian dunia, langkah Kindred; v45: tonggak bayi dan tanggal klinik dari tonggak.js). Saran 2: tampilkan dulu yang ada sebelum nulis konten baru.
//
//   Soon.items(S)   -> semua hal bertanggal setelah hari ini, urut hari (yang pasti duluan kalau harinya sama):
//                      [{ k, day, lbl, ic, tx, sub, sure, go, cid, id?, m? }]
//                      lbl = satu kata konteks besar dalam huruf kapital ("PROMOTION", "QUIZ", "BIRTHDAY") di depan kalimat,
//                      supaya yang malas baca langsung tahu ini soal apa (permintaan Muhammad 26 Okt);
//                      tx dari sudut pandang makhluk ("Mochi has a quiz in 3 days. Two study evenings so far.");
//                      sure: true = tanggalnya pasti (saran 3), false = mungkin (drop terbatas, langkah Kindred yang makhluk putuskan);
//                      sub = kalimat kedua buat lembar (apa yang pasti dan apa yang belum).
//   Soon.line(S)    -> satu baris HUD: hal terdekat dalam HORIZON hari, atau null.
//   Soon.someday(S) -> satu hal tanpa tanggal yang diharapkan (langkah Kindred tanpa tanggal, keinginan besar, cita-cita), atau null.
//
// Potret S:
//   d          hari ini
//   cur        { id, nama }  makhluk yang sedang dilihat (keinginan dan cita-cita dibaca dari sini)
//   members    semua anggota di rumah: [{ id, nama, fase, umur, born, kid, info: { ujian, lahir_hari, kelas, maraton }, st: { next_review, next_comp, job } | null }]
//              kid = masih pakai tablet (belum boleh ke Bazaar), sama dengan aturan kalender HP
//   moments    momen terjadwal seluruh keluarga: [{ id, day, cid, label, kind }]
//   world      kejadian dunia yang sudah diumumkan: [{ mulai, selesai, nama, ikon, jenis }]
//   drops      Market.drops(d): [{ start, label, soon }]
//   mag        hari terbit majalah berikutnya, atau null
//   build      { done, label } rumah atau barang yang sedang dibangun, atau null
//   kindred    [{ cid, nama, label, wait, asked }]  langkah Kindred berikutnya per pasangan (label dari UI, mis. "Could get engaged")
//   phases     Engine.PHASES
//   prize      jobId => true kalau pekerjaan itu punya kompetisi (Status.JOBS[id].prize)
//   wants      keinginan aktif makhluk yang dilihat: [{ id, ic, label, besar }]
//   cita       cita-cita makhluk yang dilihat, atau null
//   tonggak    (v45) tonggak bayi berikutnya per makhluk dari Tonggak.upcoming: [{ cid, id, lbl, label, ic, lo, hi, fixed }], hari absolut;
//              fixed = tanggal klinik (pasti), selain itu jendela (mungkin: "any day now" begitu lo lewat);
//              (v46) juga dari Anak.upcoming: tonggak anak, bakat, dan tanggal sekolah (fixed dengan key "sekolah", tx(n, kapan), sub)
//   nameOf     cid => nama
"use strict";
(() => {
  const HORIZON = 60, FAR = 1e8;
  const PHASE_WORD = { anak: "a child", remaja: "a teen", dewasa: "an adult", tua: "an elder" };
  const COUNT = ["No", "One", "Two", "Three"];
  const MOMENT_LBL = { review: "PROMOTION", comp: "COMPETITION", interview: "INTERVIEW" };
  const WORLD_LBL = { festival: "FESTIVAL", cuaca: "WEATHER", musim: "SEASON", kabar: "TOWN NEWS" };
  const when = (d, day) => day === d ? "today" : day === d + 1 ? "tomorrow" : `in ${day - d} days`;
  // label langkah Kindred dari UI ("Could get engaged") -> bentuk -ing ("getting engaged")
  const gerund = l => String(l || "the next step").replace(/^Could /, "").replace(/^(make|get) /, (_, v) => (v === "make" ? "making" : "getting") + " ");
  const gone = m => m.fase === "meninggal" || m.fase === "merantau";

  function items(S) {
    const d = S.d, out = [], nameOf = S.nameOf || (cid => (S.members.find(m => m.id === cid) || {}).nama || "Someone");
    const pending = kind => cid => (S.moments || []).some(m => m.cid === cid && m.kind === kind);
    for (const m of S.members || []) {
      if (gone(m)) continue;
      const n = m.nama, I = m.info || {}, st = m.st || null;
      const u = I.ujian;
      if (u && u.hari > d) {
        const sendiri = u.sendiri || 0;
        out.push({ k: "ujian:" + m.id, day: u.hari, lbl: u.jenis === "akhir" ? "FINAL EXAMS" : "QUIZ", ic: "📚", cid: m.id, sure: true, go: "plan",
          tx: `${n} has ${u.jenis === "akhir" ? "final exams" : "a quiz"} ${when(d, u.hari)}. ${COUNT[Math.min(3, u.belajar || 0)]} study evening${(u.belajar || 0) === 1 ? "" : "s"} so far.`,
          sub: `The date is set. How it goes depends on the studying${sendiri ? `, and ${n} has studied alone ${sendiri === 1 ? "once" : sendiri === 2 ? "twice" : `${sendiri} times`}` : ""}.` });
      }
      if (I.lahir_hari != null && I.lahir_hari > d) out.push({ k: "lahir:" + m.id, day: I.lahir_hari, lbl: "BABIES", ic: "🍼", cid: m.id, sure: true, go: "profil", tx: `${n}'s babies are due ${when(d, I.lahir_hari)}.`, sub: "The day is set. Who they take after is not." });
      if (I.kelas && I.kelas.end > d) out.push({ k: "kelas:" + m.id, day: I.kelas.end, lbl: "CLASS", ic: "🎓", cid: m.id, sure: true, go: "profil", tx: `${n}'s last ${String(I.kelas.label || "evening").toLowerCase()} class is ${when(d, I.kelas.end)}.`, sub: "Six weeks of evening classes, then it's done." });
      if (I.maraton && I.maraton.day > d) out.push({ k: "maraton:" + m.id, day: I.maraton.day, lbl: "MARATHON", ic: "🏃", cid: m.id, sure: true, go: "profil", tx: `The Old Town Marathon is ${when(d, I.maraton.day)}. ${n} trains before work.`, sub: "The race day is set. The finish time is up to the training." });
      if (st && st.job) {
        if (st.job.level < 3 && st.next_review != null && st.next_review > d && st.next_review < FAR && !pending("review")(m.id))
          out.push({ k: "review:" + m.id, day: st.next_review, lbl: "PROMOTION", ic: "📈", cid: m.id, sure: true, go: "profil", tx: `${n}'s promotion review is ${when(d, st.next_review)}.`, sub: "The review is on the calendar. The outcome is not." });
        if (S.prize && S.prize(st.job.id) && st.next_comp != null && st.next_comp > d && st.next_comp < FAR && !pending("comp")(m.id))
          out.push({ k: "comp:" + m.id, day: st.next_comp, lbl: "COMPETITION", ic: "🏆", cid: m.id, sure: true, go: "profil", tx: `${n}'s next competition is ${when(d, st.next_comp)}.`, sub: "The date is set. The rival is not known yet." });
      }
      if (m.umur != null && S.phases) {
        const cur = S.phases.find(([, lo, hi]) => lo <= m.umur && m.umur < hi), ix = cur ? S.phases.indexOf(cur) : -1, nx = ix >= 0 ? S.phases[ix + 1] : null;
        if (cur && nx && cur[2] < FAR && PHASE_WORD[nx[0]]) out.push({ k: "fase:" + m.id, day: d + (cur[2] - m.umur), lbl: "GROWING UP", ic: "🌱", cid: m.id, sure: true, go: "profil", tx: `${n} becomes ${PHASE_WORD[nx[0]]} ${when(d, d + (cur[2] - m.umur))}.`, sub: "Growing up is on a fixed clock. What they do with it is not." });
      }
      if (m.born != null && m.umur != null) {
        const y = Math.floor(m.umur / 365) + 1, bday = m.born + y * 365;
        if (bday > d) out.push({ k: "ultah:" + m.id, day: bday, lbl: "BIRTHDAY", ic: "🎂", cid: m.id, sure: true, go: "profil", tx: `${n} turns ${y} ${when(d, bday)}.`, sub: "A birthday a year, on the real calendar." });
      }
    }
    // v45: tonggak bayi (tonggak.js). Jendela = mungkin: sebelum jendela "in lo to hi days", di dalam jendela "any day now" (day = besok,
    // any: true buat lembar; win: true = item jendela, lembar menulis "it will come" bukan "maybe"). Tanggal klinik = pasti, seperti tanggal lain.
    for (const T of S.tonggak || []) {
      const n = nameOf(T.cid);
      // v46: tanggal tetap lain (kalender sekolah, anak.js) bawa kunci, kalimat, dan baris keduanya sendiri
      if (T.fixed) { if (T.lo > d) out.push({ k: (T.key || "cek") + ":" + T.cid + ":" + T.id, day: T.lo, lbl: T.lbl, ic: T.ic || "🩹", cid: T.cid, sure: true, go: T.key === "sekolah" ? "school" : "profil", tx: T.tx ? T.tx(n, when(d, T.lo)) : `${n}'s ${T.label} ${when(d, T.lo)}.`, sub: T.sub || "A clinic date on the calendar. Expect one cry and a sticker." }); continue; }
      const open = d >= T.lo;
      out.push({ k: "tonggak:" + T.cid + ":" + T.id, day: open ? d + 1 : T.lo, lbl: T.lbl, ic: T.ic || "🌱", cid: T.cid, sure: false, any: open, win: true, go: "profil",
        tx: open ? `${n}'s ${T.label} could come any day now.` : `${n}'s ${T.label} usually comes in ${T.lo - d} to ${T.hi - d} days.`,
        sub: "Every creature has its own day for this one. Care doesn't hurry it, and it can't be missed." });
    }
    for (const m of S.moments || []) if (m.day > d) out.push({ k: "momen:" + m.id, day: m.day, lbl: MOMENT_LBL[m.kind] || String(m.label || "moment").toUpperCase(), ic: "📌", cid: m.cid, sure: true, go: "momen", m, tx: `${nameOf(m.cid)}: ${m.label} ${when(d, m.day)}.`, sub: "The day is set. How it goes is not: dice, skill and condition decide." });
    for (const w of S.world || []) if (w.mulai > d) out.push({ k: "dunia:" + w.nama, day: w.mulai, lbl: WORLD_LBL[w.jenis] || "TOWN", ic: w.ikon || "🎪", cid: null, sure: true, go: "kalender", tx: `${w.nama} ${w.selesai > w.mulai ? "begins " : ""}${when(d, w.mulai)}.`, sub: w.selesai > w.mulai ? `${w.selesai - w.mulai + 1} days in Old Town, announced already.` : "One day in Old Town, announced already." });
    if (S.mag != null && S.mag > d) out.push({ k: "mag", day: S.mag, lbl: "MAGAZINE", ic: "📰", cid: null, sure: true, go: "mag", tx: `A new issue of Old Town ${when(d, S.mag)}.`, sub: "It comes out on the 1st, same for everyone. The cover is not decided yet." });
    if (S.build && S.build.done > d) out.push({ k: "bangun", day: S.build.done, lbl: "BUILDING", ic: "🏗️", cid: null, sure: true, go: "family", tx: `The ${S.build.label || "new place"} is ready ${when(d, S.build.done)}.`, sub: "Building takes real days. Moving in is automatic." });
    const grown = (S.members || []).some(m => !gone(m) && !m.kid);
    if (grown) for (const D of S.drops || []) if (D.soon && D.start > d) out.push({ k: "drop:" + D.label, day: D.start, lbl: "DROP", ic: "🛍️", cid: null, sure: false, go: "bazaar", tx: `${D.label} drops ${when(d, D.start)}, if someone is quick.`, sub: "A Bazaar drop: the day is set, the stock runs out, so getting one is not." });
    for (const K of S.kindred || []) if (K.wait > 0 && !K.asked) out.push({ k: "kindred:" + K.cid + ":" + K.nama, day: d + K.wait, lbl: "KINDRED", ic: "💞", cid: K.cid, sure: false, go: "kindred", tx: `${nameOf(K.cid)} could ask ${K.nama} ${when(d, d + K.wait)} about ${gerund(K.label)}.`, sub: `${nameOf(K.cid)} decides when, and the other family has to say yes.` });
    // v46: yang pasti dan tinggal <= 3 hari menang dari jendela "any day now" (hari = besok), supaya ulangan/rapor sempat kelihatan di HUD
    const near = i => i.sure && i.day - d <= 3 ? 0 : 1;
    return out.sort((a, b) => near(a) - near(b) || a.day - b.day || (b.sure - a.sure));
  }

  function line(S) {
    if (!S || !S.cur) return null;
    const it = items(S).find(x => x.day - S.d <= HORIZON);
    return it || null;
  }

  function someday(S) {
    if (!S || !S.cur) return null;
    const n = S.cur.nama, nameOf = S.nameOf || (() => n);
    for (const K of S.kindred || []) if (K.cid === S.cur.id && K.wait === 0 && !K.asked && K.label) return { k: "kindred:" + K.nama, lbl: "KINDRED", ic: "💞", go: "kindred", cid: K.cid, tx: `${nameOf(K.cid)} is thinking about ${gerund(K.label)} with ${K.nama}. No date yet.` };
    const big = (S.wants || []).find(w => w.besar);
    if (big) return { k: "ingin:" + big.id, lbl: "WISH", ic: big.ic || "✨", go: "profil", cid: S.cur.id, tx: `${n} really wants ${big.label}. One day.` };
    if (S.cita) return { k: "cita", lbl: "DREAM", ic: "🌠", go: "profil", cid: S.cur.id, tx: `${n} wants to be ${/^[aeiou]/i.test(S.cita) ? "an" : "a"} ${S.cita} one day. No date, just the dream.` };
    return null;
  }

  const API = { items, line, someday, HORIZON };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Soon = API;
})();

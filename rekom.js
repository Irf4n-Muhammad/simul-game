// rekom.js (v80): isi Agenda, layar pertama tiap hari. Fungsi murni: potret keadaan masuk, kartu keluar.
// Suara kartu = dunia di sekitar orang tua (sekolah, kalender), bukan makhluknya: makhluk cuma ngomong sebagai dirinya sendiri.
// Kartu "now" = kesempatan yang lagi kebuka, dengan batas waktu dan pilihan (satu ditandai rekomendasi). "soon" = yang bakal kebuka.
// Sumber v80: pendaftaran sekolah (anak.js DAFTAR) dan belajar bareng sebelum ulangan (c.info.ujian). Les menyusul.
"use strict";
(function () {
  const A = (typeof module !== "undefined") ? require("./anak.js") : globalThis.Anak;
  const URGENT = 3;   // sisa hari yang dianggap mepet: titik merah di tombol Agenda dan pengingat
  const STUDY_MAX = 3;

  // rekomendasi sekolah dari bakat yang paling cepat dipelajari (genes.talent), bukan dari sifat: alasan yang bisa dicek orang tua
  function pickSchool(st) {
    const t = st && st.genes && st.genes.talent;
    if (!t) return "dekat";
    const top = Object.entries(t).sort((a, b) => b[1] - a[1])[0];
    if (!top || top[1] < 6) return "dekat";
    return top[0] === "logic" ? "favorit" : (top[0] === "creativity" || top[0] === "fitness") ? "seni" : "dekat";
  }
  const WHY_SCHOOL = {
    dekat: "Two streets away, where the neighbours' kids go. Easy mornings.",
    seni: "A studio and a running track. Small boost at contests.",
    favorit: "Best report cards in town. A long trip each day, and quizzes feel heavier.",
  };

  // S = { d, members: [{ id, nama, born, alive, info, st }] }
  function cards(S) {
    const now = [], soon = [];
    for (const m of S.members || []) {
      if (m.alive === false) continue;
      const info = m.info || {}, age = S.d - m.born;
      // ---- pendaftaran sekolah
      if (A) {
        const D = A.DAFTAR, close = m.born + D.tutup, open = m.born + D.buka, start = m.born + D.masuk;
        if (age >= D.kabar && age < D.buka) {
          soon.push({ k: "sekolah:" + m.id, cid: m.id, lbl: "SCHOOL", tx: `School enrolment for ${m.nama} opens`, day: open, sub: `school starts ${fmt(start)}` });
        } else if (age >= D.buka && age <= D.tutup) {
          const P = info.sekolah_pilihan, star = pickSchool(m.st), left = close - S.d;
          now.push({
            k: "sekolah:" + m.id, cid: m.id, lbl: "SCHOOL",
            tx: P ? `${m.nama} is enrolled at ${A.SEKOLAH[P.id].nama}` : `Enrol ${m.nama} in a school`,
            why: P ? `You can still switch until enrolment closes.` : `${m.nama} starts school ${fmt(start)}. If no form goes in, it's the school round the corner.`,
            day: close, from: open, left, done: !!P, urgent: !P && left <= URGENT,
            opts: Object.keys(A.SEKOLAH).map(id => ({ id, label: A.SEKOLAH[id].nama, sub: WHY_SCHOOL[id], act: "daftar:sekolah:" + id, star: id === star, picked: !!P && P.id === id })),
          });
        }
      }
      // ---- belajar bareng sebelum ulangan / ujian
      const u = info.ujian;
      if (u && S.d < u.hari) {
        const left = u.hari - S.d, b = u.belajar || 0;
        now.push({
          k: "ujian:" + m.id, cid: m.id, lbl: u.jenis === "ulangan" ? "QUIZ" : "TEST",
          tx: b >= STUDY_MAX ? `${m.nama} is ready for the ${u.jenis === "ulangan" ? "quiz" : "test"}` : `${u.jenis === "ulangan" ? "Quiz" : "Test"} for ${m.nama} ${left === 1 ? "tomorrow" : `in ${left} days`}`,
          why: `Each evening you study together helps. Studied together ${b}/${STUDY_MAX}.`,
          day: u.hari, left, done: b >= STUDY_MAX, urgent: b < STUDY_MAX && left <= 1,
          opts: b >= STUDY_MAX ? [] : [{ id: "belajar", label: "Study together", act: "belajar", star: true }],
        });
      }
    }
    now.sort((a, b) => (a.done - b.done) || (a.left - b.left));
    soon.sort((a, b) => a.day - b.day);
    return { now, soon };
  }
  // titik merah di tombol Agenda: ada kartu yang belum dikerjakan
  const pending = R => R.now.filter(c => !c.done).length;
  const urgent = R => R.now.some(c => c.urgent);
  // tanggal ditulis "day N" (hari ke-N, mulai 1) kalau UI tidak memasang pemformat sendiri
  let fmt = d => `on day ${d + 1}`;
  const setFormat = f => { fmt = f; };

  const API = { cards, pending, urgent, pickSchool, setFormat, URGENT, STUDY_MAX };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Rekom = API;
})();

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
  const TALENT = { logic: "Logic", fitness: "Fitness", charm: "Charm", creativity: "Creativity" };
  function schoolPick(st) {
    const t = st && st.genes && st.genes.talent;
    if (!t) return { id: "dekat", top: null, val: 0 };
    const top = Object.entries(t).sort((a, b) => b[1] - a[1])[0];
    if (!top || top[1] < 6) return { id: "dekat", top: top ? top[0] : null, val: top ? top[1] : 0 };
    return { id: top[0] === "logic" ? "favorit" : (top[0] === "creativity" || top[0] === "fitness") ? "seni" : "dekat", top: top[0], val: top[1] };
  }
  const pickSchool = st => schoolPick(st).id;
  // kenapa direkomendasikan: satu kalimat yang bisa dicek di profil (bakat 1–10)
  function schoolWhy(P, n) {
    if (!P.top) return `Nothing stands out yet, so the closest school keeps mornings easy.`;
    const T = `${n} learns ${TALENT[P.top]} fastest (talent ${P.val}/10)`;
    if (P.id === "favorit") return `${T}. Riverside's quiz bonus pays off most for a quick thinker.`;
    if (P.id === "seni") return `${T}. Hillside's studio and track feed that talent, and its contest edge helps.`;
    return P.val >= 6 ? `${T}. Charm grows with friends nearby, so the neighbourhood school fits.` : `${T}, but no talent is strong yet (6+ needed), so the closest school keeps it simple.`;
  }
  // detail tiap sekolah: di mana, seperti apa, dan angka yang benar-benar dipakai simulasi (anak.js, storylets.js)
  const SCHOOL_INFO = {
    dekat: { ic: "🏫", where: "Round the corner from home · 5-minute walk", like: "Small and friendly. The neighbours' kids go here, so friends live on the same street.",
      gets: [["+", "Friendly +1 when enrolled"], ["+", "Easy mornings: no extra cost to mood"], ["=", "Standard quiz scores and contest chances"]] },
    seni: { ic: "🎨", where: "Up the hill · 15 minutes by school bus", like: "An art studio and a running track. Lots of shows, races and contests.",
      gets: [["+", "+8% chance to win the city Young Talents contest"], ["+", "Talent lessons start further ahead (level 30, not 25)"], ["=", "Standard quiz scores"]] },
    favorit: { ic: "🎓", where: "Across the bridge · 25 minutes the long way round", like: "Strict and serious, with the best report cards in town.",
      gets: [["+", "+6 on every quiz score"], ["−", "Mood −2 every time a quiz is announced"], ["=", "Standard contest chances"]] },
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
          soon.push({ k: "sekolah:" + m.id, cid: m.id, nama: m.nama, ic: "🏫", startDay: start, lbl: "SCHOOL", short: "Enrol opens", tx: `School enrolment for ${m.nama} opens`, day: open, close, sub: `school starts ${fmt(start)}` });
        } else if (age >= D.buka && age <= D.tutup) {
          const P = info.sekolah_pilihan, pick = schoolPick(m.st), star = pick.id, left = close - S.d;
          now.push({
            k: "sekolah:" + m.id, cid: m.id, nama: m.nama, ic: "🏫", lbl: "SCHOOL",
            tx: P ? `${m.nama} is enrolled at ${A.SEKOLAH[P.id].nama}` : `Choose a school for ${m.nama}`,
            why: P ? `You can still switch until enrolment closes.` : `${m.nama} starts school ${fmt(start)}. If no form goes in, it's the school round the corner.`,
            short: P ? "Enrolled" : "Enrol by", startDay: start, starWhy: schoolWhy(pick, m.nama), pickLabel: "Choose this school",
            day: close, from: open, left, done: !!P, urgent: !P && left <= URGENT,
            opts: Object.keys(A.SEKOLAH).map(id => ({ id, label: A.SEKOLAH[id].nama, ...SCHOOL_INFO[id], act: "daftar:sekolah:" + id, star: id === star, picked: !!P && P.id === id })),
          });
        }
      }
      // ---- belajar bareng sebelum ulangan / ujian
      const u = info.ujian;
      if (u && S.d < u.hari) {
        const left = u.hari - S.d, b = u.belajar || 0;
        now.push({
          k: "ujian:" + m.id, cid: m.id, nama: m.nama, ic: "📚", lbl: u.jenis === "ulangan" ? "QUIZ" : "TEST",
          tx: b >= STUDY_MAX ? `${m.nama} is ready for the ${u.jenis === "ulangan" ? "quiz" : "test"}` : `${u.jenis === "ulangan" ? "Quiz" : "Test"} for ${m.nama} ${left === 1 ? "tomorrow" : `in ${left} days`}`,
          why: `Each evening you study together helps. Studied together ${b}/${STUDY_MAX}.`,
          short: u.jenis === "ulangan" ? "Quiz" : "Test", study: b,
          day: u.hari, left, done: b >= STUDY_MAX, urgent: b < STUDY_MAX && left <= 1,
          opts: b >= STUDY_MAX ? [] : [{ id: "belajar", label: "Study together tonight", ic: "📚", like: `Sit with ${m.nama} for one evening of revision.`, gets: [["+", "+7 on the quiz score per evening (max 3)"]], act: "belajar", star: false }],
          pickLabel: "Study together",
        });
      }
      // ---- les (v82, ilmu.js): gelombang kelas tiap 2 minggu; daftar paling lambat sehari sebelum mulai, kelewat = gelombang berikutnya
      const IL = S.ilmu && (typeof module !== "undefined" ? require("./ilmu.js") : globalThis.Ilmu);
      if (IL && m.st && age >= IL.MIN_AGE) {
        const I = IL.il(m.st), wave = IL.nextWave(S.d), last = wave - 1;
        const going = I.kursus.filter(k => k.n < IL.SESI.length && k.mulai <= S.d), next = I.kursus.filter(k => k.mulai === wave);
        if (!going.length) {
          const rec = IL.recommend(m, S.d, 3);
          if (rec.length || next.length) now.push({
            k: "les:" + m.id, cid: m.id, nama: m.nama, ic: "📘", lbl: "CLASSES",
            tx: next.length ? `${m.nama} starts ${next.map(k => IL.COURSES[k.id].name).join(" and ")} ${fmt(wave)}` : `New classes start ${fmt(wave)}`,
            why: next.length ? `You can add another class until the day before.` : `Miss it and the next round starts two weeks later.`,
            short: "Classes", day: last, left: last - S.d, done: !!next.length, urgent: false, starWhy: rec[0] ? `Right level for ${m.nama}, and the fastest progress of the classes open now.` : "",
            pickLabel: "Enrol",
            opts: rec.map((k, j) => ({ id: k.id, label: k.name, ic: ["🌱", "📘", "🎓"][k.lvl], where: `${IL.TIER[k.lvl]} class on ${k.flabel} · 8 sessions over 4 weeks`, price: k.price,
              like: `${m.nama} on this topic: ${IL.MINAT_WORD(k.minat)}.`,
              gets: [["+", `About +${k.per} ${k.tlabel} per session (up to +${k.total} over the course)`], ["−", `Energy −${k.sport ? 12 : 8} and mood −2 each session`]],
              act: "les:" + k.id, star: j === 0, picked: false, btn: `Enrol · 🪙 ${k.price}` })),
            more: "les",
          });
        }
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

  const API = { cards, pending, urgent, pickSchool, schoolWhy, schoolPick, SCHOOL_INFO, setFormat, URGENT, STUDY_MAX };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Rekom = API;
})();

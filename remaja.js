// remaja.js: fase remaja (v47, 180–270 hari). Aturan yang sama dengan bayi (tonggak.js) dan anak (anak.js), dari riset/fase-kehidupan.md
// bagian 7 dan "Rencana v47 remaja, versi rapi": jam tetap = kota, rentang = tubuh; kapan = benih, apa = pemain.
// Peran pemain ganti: di anak milih lingkungan, di remaja PASANG PAGAR LALU MINGGIR. Aturan rumah ditanya sekali, sisanya makhluk yang
// mutusin; pemain dimintai saran dan kira-kira 1 dari 5 ditolak (engine.js obey_chance, pengali remaja; diukur test/remaja.test.js).
//   1. ATURAN RUMAH (umur 180, dilema terjadwal): tiga paket (longgar / tengah / ketat) = jam malam, pacaran, uang jajan. Default tengah
//      (dicuekin, save lama, kena pagar). Disimpan c.info.aturan_rumah dan dibaca x.rule() (engine.js) sebelum aturan penjaga selama
//      remaja, jadi storylet lama (jajan, pacaran diam-diam) dan pesta pertama ngikut paket ini lewat by_rule ("House rule: … They obeyed /
//      They broke it"). Bisa dilanggar: peluang nurut dari patuh + ikatan.
//   2. KALENDER TETAP ANGKATAN (sama buat semua makhluk seumur): hari pertama SMP 180, ulangan 205 dan 235 (diumumkan 3 hari sebelumnya,
//      diselesaikan storylet `ujian` di storylets.js), rapor 215 dan 250, study tour 225–227, ujian akhir diumumkan 248 buat semua, pekan
//      ujian 258–262 (ujian akhir = ulangan terakhir, nilainya c.info.nilai.ujian_akhir), pengumuman lulus 265 (c.info.lulus), pesta
//      kelulusan 268, 270 dewasa. Jalur sesudah lulus tetap storylet `setelah_lulus` (266).
//   3. TONGGAK REMAJA BERJENDELA, tujuh, harinya dari benih (seed_rng(id, "remaja", id)), satu per hari, ngalah ke hari jam tetap: suara
//      berubah / tumbuh tinggi 183–215, jerawat pertama 190–230, cita-cita 190–215, hobi sendiri 195–240, gaya sendiri 200–250, pergi
//      sendiri ke kota 205–245, beli pertama pakai uang sendiri 210–260. "Apa"-nya dari bakat dan sifat. Bersyarat (nggak semua dapat,
//      tapi kalau dapat harinya dari benih, bahan beda-bedaan antar pemain): izin kerja sambilan 215–240 (ambisius > 40; dilema; kerja
//      mulai 3 hari kemudian, atau sesudah ujian kalau ditunda), pesta pertama 200–230 (ngikut aturan jam malam; dilema cuma kalau nggak
//      ada aturan sama sekali).
//   4. UANG JAJAN SENIN: tiap Senin (hari 0 = Minggu 11 Okt 2026) 15 atau 8 coins ngikut aturan jajan [angka umum], satu kalimat dengan
//      angka (keputusan Muhammad: uang tetep uang). Beli pertama dan hadiah dari gaji pertama motong/nambah jar yang sama (c.st.wallet).
//   5. PAGAR (bagian 7): dilema terjadwal jarak >= 14 hari dari yang sebelumnya (c.info.dilema_hari, dipakai bareng anak.js); yang kena
//      pagar nunggu di jendelanya atau jalan sendiri pakai default; dicuekin = default. Nggak ada hukuman, nggak ada yang nunggu pemain.
// UI membaca view() (tangga di profil), siapa() (kartu "gw siapa"), upcoming() (baris Soon lewat S.tonggak di soon.js), calendar() (app
// School), aturanOf() (aturan rumah di app School), LATER (rak Later bertahap: Work + Wallet 270, Homes 300, Kindred 330, Paws 360,
// Ventures 400; keputusan Muhammad 26 Okt).
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const Anak = (typeof module !== "undefined") ? require("./anak.js") : globalThis.Anak;
  const { FORCED, seed_rng, phase_of, RULESETS, START_DATE } = E;
  const sahabatOf = c => c.info.sahabat || null;
  // jar coins = dompet status.js (c.st.wallet, 1 poin stats.uang = 50 coins); tanpa status.js (tes mesin murni) cuma stats.uang yang gerak
  const wallet = c => Math.round(c.st ? c.st.wallet : (c.stats.uang || 0) * 50);
  function coins(x, n) {
    const c = x.c;
    if (c.st) { c.st.wallet = Math.max(0, c.st.wallet + n); c.stats.uang = Math.min(5000, c.st.wallet / 50); }
    else c.stats.uang = Math.max(0, Math.min(5000, (c.stats.uang || 0) + n / 50));
  }
  // pagar jarak (sama dengan anak.js): dilema terjadwal berikutnya cuma ditanya kalau yang sebelumnya >= 14 hari lalu
  const GAP = 14;
  const gateOk = x => x.day - (x.c.info.dilema_hari ?? -GAP) >= GAP;
  function tanya(x, q, opts, prefs, self, o) { x.c.info.dilema_hari = x.day; return x.ask(q, opts, prefs, self, o); }
  const oleh = g => g === null ? "sendiri" : "wali";

  // ---------------------------------------------------------------- 1. aturan rumah
  const JAJAN = { besar: 15, kecil: 8 };   // coins tiap Senin [angka umum]
  const PAKET = {
    longgar: { label: "Easy going: in by 11, dating's fine, 15 coins a week", short: "easy going", rules: { ...RULESETS.suportif } },
    tengah: { label: "In between: in by 9, dating's fine if we know, 15 coins a week", short: "in between", rules: { sekolah: "wajib", jam_malam: "ketat", pacaran: "boleh", jajan: "besar" } },
    ketat: { label: "Firm: in by 9, dating waits till they're grown, 8 coins a week", short: "firm", rules: { ...RULESETS.tegas } },
  };
  const KATA = {   // kata buat app School, kartu, dan ingatan
    jam_malam: { longgar: "in by 11", ketat: "in by 9" },
    pacaran: { boleh: "fine, as long as we know", tunggu_dewasa: "waits till they're grown" },
    jajan: { besar: "15 coins on Mondays", kecil: "8 coins on Mondays" },
  };
  const TEKS_ATURAN = {
    longgar: n => `Easy going, then: in by eleven, dating's fine, fifteen coins on Mondays. ${n} shakes on it, solemnly, and is out of the door before the handshake is over.`,
    tengah: n => `In between, then: in by nine, dating's fine as long as we know, fifteen coins on Mondays. ${n} says "nine?", and then "fine", and writes it on the fridge so there's no arguing later. There will be arguing later.`,
    ketat: n => `Firm, then: in by nine, dating waits till they're grown, eight coins on Mondays. ${n} says nothing, which is its own answer, and keeps the list anyway. Rules are made to be tested. Mostly.`,
  };
  // aturan rumah makhluk ini: paket yang dipilih, atau tengah kalau belum pernah ditanya (save lama, belum 180)
  const aturanOf = c => { const a = c.info.aturan_rumah, id = a && PAKET[a.id] ? a.id : "tengah"; return { id, ...PAKET[id], rules: a && a.rules ? a.rules : PAKET[id].rules, dipilih: !!a, oleh: a ? a.oleh : "default", d: a ? a.d : null }; };
  const setAturan = (x, id, by) => { x.c.info.aturan_rumah = { id, d: x.day, oleh: by, rules: { ...PAKET[id].rules } }; };
  // tepat umur 180 kalau pagarnya lolos; lewat 183 (save lama) atau kena pagar: tengah tanpa tanya
  const ATURAN = { id: "aturan_rumah",
    cond: x => x.phase === "remaja" && !x.c.fired.aturan_rumah && !x.c.info.aturan_rumah,
    run: x => {
      x.c.fired.aturan_rumah = 1;
      const n = x.n;
      if (x.age > 183 || !gateOk(x)) { setAturan(x, "tengah", "default"); return `${n} is a teen now, with a phone of their own. The house keeps its usual rules: in by nine, dating's fine as long as we know, pocket money on Mondays.`; }
      x.say(`A phone of their own, a school up the hill, and a question at the dinner table that wasn't there yesterday: what are the rules now?`);
      const [g, final] = tanya(x, `${n} is a teen now. House rules?`, Object.fromEntries(Object.entries(PAKET).map(([k, p]) => [k, p.label])),
        { suportif: "longgar", tegas: "ketat" }, "tengah", { obey: false, safe: "tengah", alone: "so the house keeps its usual rules: in by nine, dating's fine as long as we know, pocket money on Mondays." });
      setAturan(x, final, oleh(g));
      x.remember(`House rules, ${PAKET[final].short}: ${KATA.jam_malam[PAKET[final].rules.jam_malam]}, dating ${KATA.pacaran[PAKET[final].rules.pacaran]}.`);
      return TEKS_ATURAN[final](n);
    } };

  // ---------------------------------------------------------------- 2. kalender tetap angkatan
  // at = umur (hari) kejadian, sama buat semua. soon = tampil di baris Soon; app = baris di app School; until = pengumuman cuma jalan
  // selama [at, until) (save lama yang kelewat nggak dapat pengumuman basi). run null = penanda: diselesaikan storylet `ujian`.
  const K = (id, at, lbl, label, ic, run, o = {}) => Object.assign({ id, at, lbl, label, ic, run, fixed: true, soon: true, app: true }, o);
  const GRADE = Anak.GRADE;
  const umumkan = (k, n) => x => {
    const hari = x.c.born + k;
    x.c.info.ujian = { hari, belajar: 0, sendiri: 0, jenis: "ulangan", kal: "ulangan_" + n };
    return `School news: the ${n === 3 ? "first" : "second"} quiz of middle school is in ${hari - x.day} days, the same morning for the whole year group. ${x.n} says it's "fine", which means it isn't, yet. A study evening still counts.`;
  };
  const umumkanAkhir = x => {
    x.c.info.ujian = { hari: x.c.born + 262, belajar: 0, sendiri: 0, jenis: "akhir", kal: "ujian_akhir" };
    return `The letter every family in Old Town gets this week: final exams for the year group in fourteen days, four papers across exam week. ${x.n} sticks a timetable on the fridge and a note on the bathroom mirror that says BREATHE.`;
  };
  // catatan wali kelas: dari sifat yang paling menonjol (>= 58); nggak ada yang menonjol: anak yang tenang
  const NOTE = [["rajin", "Does the work, then the extra work. Could ease up a little."], ["ramah", "Knows everyone in the year. Talks through the register."],
    ["kreatif", "Sketches in every margin. Some of it is very good."], ["impulsif", "Quick answers, quicker apologies. Learning to wait."],
    ["penakut", "Says little in class; the written work says plenty."], ["ambisius", "Wants the top mark and asks what it takes. Then does it."], ["setia", "The one the others go to when something goes wrong."]];
  function catatan(x) {
    let best = null;
    for (const [t, s] of NOTE) { const v = x.t(t); if (v >= 58 && (!best || v > best[0])) best = [v, s]; }
    return best ? best[1] : "Steady, and quietly funny. A good year.";
  }
  function rapor(x, k) {
    const q = (x.c.info.nilai || {})["ulangan_" + k], g = q ? q.g : null, note = catatan(x);
    const teman = Object.values(x.c.relations).filter(r => r.tipe === "teman" || r.tipe === "sahabat").length;
    (x.c.info.rapor ||= []).push({ d: x.day, kal: "rapor_" + k, nilai: g, teman, catatan: note });
    x.need("mood", g === "great" ? 8 : g === "bad" ? -5 : 2);
    if (g === "great") x.stat("reputasi", 1);
    x.remember(`${k === 3 ? "Mid-year" : "Last"} report of middle school: ${g ? GRADE[g].toLowerCase() : "no quiz on record"}. "${note}"`);
    const belajar = q && q.belajar ? `, after ${q.belajar} study evening${q.belajar > 1 ? "s" : ""}` : "";
    const friends = teman === 0 ? "none the tutor has seen, which the tutor doubts" : teman === 1 ? "one, a close one" : String(teman);
    return `Report day, ${k === 3 ? "mid-year" : "the last one before the exams"}. ${g ? GRADE[g] : "No quiz on record this term"}${belajar}. Friends: ${friends}. The form tutor's line, in a hurry: "${note}"${x.attended ? "" : ` ${x.n} leaves it on the table for you.`}`;
  }
  function smpHariPertama(x) {
    const s = sahabatOf(x.c); x.c.info.smp = { d: x.day }; x.need("mood", 4); x.remember("First day of middle school, up the hill.");
    return `First day at Old Town Middle School, up the hill. ${x.t("penakut") > 55 ? `${x.n} finds the right room on the third try and says nothing all morning, then everything at dinner.` : `${x.n} finds the right room, the wrong desk, and three people who know where the good bench is.`}${s ? ` ${s.nama} is in the same form, which helps.` : ""} Nine subjects on the timetable, two of them new, and a phone in the bag that's finally ${x.n}'s own.`;
  }
  // study tour 3 hari: flag study_tour bikin agenda.js ngisi dua hari berikutnya tanpa rencana
  const TOUR = {
    berangkat: x => { const s = sahabatOf(x.c); x.flag("study_tour", 2); x.need("mood", 6); return `Three days away with the whole year group: a coach at seven, the coast road, a hostel by the old harbour. ${x.n} ${s ? `bags the back seat with ${s.nama}` : "bags the back seat"} and is asleep before the ring road.`; },
    tengah: x => { x.need("mood", 4); x.trait("ramah", 1); return `Day two of the study tour: the lighthouse museum in the morning, the harbour wall in the afternoon, a dorm where nobody sleeps before one. ${x.t("penakut") > 55 ? `${x.n} phones home from the hostel steps "just to say hi".` : `${x.n} doesn't phone. That's rather the point.`}`; },
    pulang: x => { x.bond(2); x.need("mood", 4); x.trait("penakut", -1); x.remember("The year-group study tour: three days by the harbour."); return `Home from the study tour at dusk: sunburnt, hoarse, a bag of damp clothes and a jar of sea glass for the windowsill. ${x.n} talks for an hour straight, then sleeps for twelve.`; },
  };
  function pekanUjian(x) {
    x.flag("ujian_pekan", 4); x.need("mood", -3);
    const k = x.c.info.kesayangan;
    return `Exam week. Four papers in five days, the same papers on the same mornings for every creature in the year group. ${x.n} lays out three pens, a ruler and ${k ? `${k}, for luck` : "a lucky coin"}, and goes quiet in a new way.`;
  }
  // pengumuman lulus: dari skor ujian akhir (storylet `ujian`, c.info.nilai.ujian_akhir). Kalimatnya "passed their final exams" dibaca
  // moments.js jadi momen `lulus` (puncak 3), dan `setelah_lulus` (storylets.js) nunggu c.info.lulus
  function lulus(x) {
    const q = (x.c.info.nilai || {}).ujian_akhir, skor = q ? q.skor : 50;
    if (!x.c.info.lulus) x.c.info.lulus = skor > 55 ? "great" : "just okay";
    const L = x.c.info.lulus; x.c.info.lulus_hari = x.day;
    x.need("mood", L === "great" ? 14 : 8); if (L === "great") x.stat("reputasi", 2);
    x.remember(`Finished school with ${L} grades.`);
    const b = q ? q.belajar || 0 : 0, s = q ? q.sendiri || 0 : 0;
    const ev = n => `${n} study evening${n > 1 ? "s" : ""}`;
    const belajar = b && s ? ` ${ev(b)} together and ${s} alone, and it shows.` : b ? ` ${ev(b)} together, and it shows.` : s ? ` ${ev(s)} alone, and it shows.` : "";
    return `Results day. ${x.n} passed their final exams with ${L} grades.${belajar} The whole year group is on the school steps, somebody throws a cap into the sky, and then everybody does.`;
  }
  function pestaKelulusan(x) {
    const ketat = x.rule("jam_malam") === "ketat", s = sahabatOf(x.c), p = x.c.partner();
    x.need("mood", 10); x.bond(1); x.stat("reputasi", 1); x.remember("The leavers' party in the school hall.");
    x.c.info.pesta_kelulusan = { d: x.day, pulang: ketat ? "nine" : "the last song" };
    return `The leavers' party, in the school hall with the lights down: a playlist the year group argued about for a month, a slow song nobody admits to requesting${p ? `, ${p.nama} on ${x.n}'s arm for it` : ""}${s ? `, ${s.nama} on the table by the speakers` : ""}. ${ketat ? `In by nine, as agreed; ${x.n} is the first to leave, and minds, a little, and says so.` : `${x.n} stays till the last song and walks home with the whole street, singing.`}`;
  }
  const KALENDER = [
    K("smp_hari_pertama", 180, "SCHOOL", "first day of middle school", "🏫", smpHariPertama, { soon: false }),
    K("ulangan_3_diumumkan", 202, "QUIZ", "quiz announced", "📚", umumkan(205, 3), { soon: false, app: false, until: 205 }),
    K("ulangan_3", 205, "QUIZ", "first quiz of middle school", "📚", null, { tx: (n, w) => `${n}'s first quiz of middle school is ${w}.`, sub: "A fixed morning for the whole year group. The marks depend on the study evenings, and on the day." }),
    K("rapor_3", 215, "REPORT", "mid-year report", "📋", x => rapor(x, 3), { tx: (n, w) => `${n}'s mid-year report comes home ${w}.`, sub: "Marks, friends, and a line from the form tutor. None of it is written yet." }),
    K("study_tour_berangkat", 225, "STUDY TOUR", "the year-group study tour", "🚌", TOUR.berangkat, { tx: (n, w) => `The year-group study tour leaves ${w}. ${n} is going.`, sub: "Three days by the old harbour, the same three days for every creature in the year." }),
    K("study_tour_tengah", 226, "STUDY TOUR", "day two of the study tour", "🚌", TOUR.tengah, { soon: false, app: false }),
    K("study_tour_pulang", 227, "STUDY TOUR", "home from the study tour", "🏠", TOUR.pulang, { soon: false, app: false }),
    K("ulangan_4_diumumkan", 232, "QUIZ", "quiz announced", "📚", umumkan(235, 4), { soon: false, app: false, until: 235 }),
    K("ulangan_4", 235, "QUIZ", "second quiz of middle school", "📚", null, { tx: (n, w) => `${n}'s second quiz of middle school is ${w}.`, sub: "A fixed morning for the whole year group. The marks depend on the study evenings, and on the day." }),
    K("ujian_akhir_diumumkan", 248, "FINAL EXAMS", "final exams announced", "📝", umumkanAkhir, { soon: false, app: false, until: 262 }),
    K("rapor_4", 250, "REPORT", "the last report card", "📋", x => rapor(x, 4), { tx: (n, w) => `${n}'s last report card comes home ${w}.`, sub: "Marks, friends, and a line from the form tutor. None of it is written yet." }),
    K("pekan_ujian", 258, "EXAM WEEK", "exam week", "📝", pekanUjian, { soon: false }),
    K("ujian_akhir", 262, "FINAL EXAMS", "the last exam paper", "📝", null, { soon: false }),
    K("pengumuman_lulus", 265, "RESULTS", "exam results", "🎓", lulus, { tx: (n, w) => `${n}'s exam results come out ${w}.`, sub: "The day is set for the whole year group. The grades are not." }),
    K("pesta_kelulusan", 268, "LEAVERS' PARTY", "the leavers' party", "🎉", pestaKelulusan, { tx: (n, w) => `The leavers' party is ${w}. ${n} has been planning the outfit for a week.`, sub: "In the school hall, lights down. Home by the hour on the fridge." }),
  ];
  const fixedDay = age => KALENDER.some(k => k.at === age);

  // ---------------------------------------------------------------- 3. tonggak remaja berjendela
  const T = (id, lo, hi, lbl, label, ic, run) => ({ id, lo, hi, lbl, label, ic, run, fixed: false });
  // tinggi: dari garis anak (anak.js), +0,3 cm sehari sesudah 180 sampai dewasa, lonjakan +4 cm di tonggak suara berubah [angka umum]
  const tinggi = (c, age) => Anak.tinggi(c, Math.min(age, 180)) + Math.round(Math.max(0, Math.min(age, 270) - 180) * 0.3) + (c.info.lonjakan != null && age >= c.info.lonjakan ? 4 : 0);
  // cita-cita (dulu storylet cita_cita): dari bakat yang diasah (> 35), kalau nggak dari sifat. Nama bakat lama (Indonesia) tetap dikenal.
  const CITA = { drawing: "illustrator", music: "musician", sports: "athlete", science: "scientist", menggambar: "illustrator", musik: "musician", olahraga: "athlete", sains: "scientist" };
  const citaOf = c => { const b = c.info.bakat, t = c.traits; return (b && (c.info.bakat_level ?? 0) > 35 && CITA[b]) || (t.ambisius > 60 ? "business owner" : t.rajin > 55 ? "doctor" : "youtuber"); };
  const HOBI = { drawing: "a sketchbook, filled front to back", music: "a second-hand guitar, two chords and a third coming", sports: "the skate park at the edge of town", science: "a box of lenses and a notebook of star names" };
  const hobiOf = c => { const t = c.traits; return HOBI[c.info.bakat] || (t.kreatif > 55 ? "a camera that takes film" : t.ramah > 55 ? "the school radio, Thursday lunchtimes" : t.rajin > 55 ? "baking, mostly bread" : "a stack of comics and a plan to draw one"); };
  const gayaOf = c => { const t = c.traits; return t.kreatif > 55 ? "paint on everything, the shoes included" : t.impulsif > 55 ? "a jacket from the second-hand rail, three sizes too big, worn with total conviction" : t.penakut > 55 ? "black, all of it, so as not to be looked at, which gets them looked at" : t.ramah > 55 ? "whatever the crew is wearing this week, a day early" : "a hat. Just the one, every day, indoors too"; };
  const BELI = { drawing: "a tin of proper pencils", music: "a second-hand record", sports: "a sheet of grip tape and stickers for the board", science: "a star map for the ceiling" };
  const LIST = [
    T("suara_berubah", 183, 215, "GROWTH SPURT", "growth spurt, and a new voice", "📏", x => {
      x.c.info.lonjakan = x.age; const cm = tinggi(x.c, x.age);
      (x.c.info.garis ||= []).push({ d: x.day, cm }); x.stat("kesehatan", 1); x.remember(`A growth spurt: ${cm} cm, and a new voice.`);
      return `${x.n} comes down to breakfast a hand taller than last week's trousers, and the voice that asks for toast isn't the one that went up to bed. ${x.attended ? "You pretend not to notice. You notice." : "The neighbour notices first, and says so."} A new pencil line on the door frame: ${cm} cm.`;
    }),
    T("jerawat_pertama", 190, 230, "FIRST SPOT", "first spot", "🪞", x => {
      const s = sahabatOf(x.c); x.need("mood", -2); x.remember("The first spot. A fringe appeared the same day.");
      return `A spot. One, on the chin, the day before ${s ? `the Saturday at ${s.nama}'s` : "school photos"}. ${x.n} spends forty minutes in the bathroom and comes out with a fringe. ${x.t("penakut") > 55 ? "Nobody says a word, by arrangement." : "It is the only thing anyone is allowed to talk about at breakfast, by decree."}`;
    }),
    T("cita_cita", 190, 215, "DREAM", "dream job", "🌠", x => {
      const cita = citaOf(x.c), b = x.c.info.bakat; x.c.info.cita = cita; x.trait("ambisius", 1); x.remember(`Dream job: ${cita}.`);
      return `${x.n} writes it on the wall above the bed, in letters you can read from the door: FUTURE ${cita.toUpperCase()}. ${b && (x.c.info.bakat_level ?? 0) > 35 ? `The ${b} has something to do with it.` : "Nobody saw it coming, least of all the wall."}`;
    }),
    T("hobi_sendiri", 195, 240, "HOBBY", "hobby of their own", "🎧", x => {
      const h = hobiOf(x.c); x.c.info.hobi = { d: x.day, label: h }; x.need("mood", 5); x.trait("kreatif", 1); x.remember(`A hobby of their own: ${h}.`);
      return `${x.n} has a hobby now, and it's ${h}. Not the talent the teacher spotted, or not only that. It fills the hours after school and most of Saturday, and ${x.attended ? "you get a running commentary" : "nobody at home hears a word about it until something's finished"}.`;
    }),
    T("gaya_sendiri", 200, 250, "A LOOK", "look of their own", "🧢", x => {
      const g = gayaOf(x.c); x.c.info.gaya = { d: x.day, label: g }; x.trait("kreatif", 0.5); x.remember(`A look of their own: ${g}.`);
      return `${x.n} comes down with a look: ${g}. ${x.attended ? "You say nothing. Good call." : "The neighbour says \"very nice\", which is worse."} It lasts, which is the surprising part.`;
    }),
    T("kota_sendiri", 205, 245, "INTO TOWN", "first trip into town alone", "🚍", x => {
      x.trait("penakut", -2); x.need("mood", 5); x.remember("Took the bus into town alone for the first time.");
      return `${x.n} takes the bus into town alone for the first time: the market square, the record shop, a bench by the fountain for an hour doing nothing in particular. Back on the four o'clock bus${x.rule("jam_malam") === "ketat" ? ", hours before nine" : ""}, with a paper bag and a new idea of how big the town is.`;
    }),
    T("beli_pertama", 210, 260, "FIRST BUY", "first buy with their own money", "🛍️", x => {
      const r = seed_rng(x.c.id, "remaja", "beli").random(), w = wallet(x.c);
      const item = BELI[x.c.info.bakat] || ["a phone case with a cat on it", "a jar of sea glass from the harbour stall", "a hat from the market", "a comic nobody else at school has"][Math.floor(r * 4)];
      const harga = Math.min(w, 12 + Math.floor(r * 14)); coins(x, -harga); const sisa = wallet(x.c);
      x.c.info.beli_pertama = { d: x.day, item, harga, sisa }; x.need("mood", 6); x.trait("ambisius", 0.5); x.remember(`First thing bought with their own money: ${item}, ${harga} coins.`);
      return harga >= 5 ? `${x.n} counts out ${harga} coins at the Bazaar, mostly in small change, for ${item}. The first thing that's theirs because they paid for it. ${sisa} coins left in the jar, and the receipt kept.`
        : `${x.n} walks the Bazaar with ${w} coins and comes home with ${item}, ${harga ? `for ${harga} coins` : "which the stallholder lets go for nothing, this once"}, the jar being what it is. The first thing that's theirs, and a plan to save properly, starting Monday.`;
    }),
  ];
  // bersyarat: izin kerja sambilan (ambisius > 40), kerja 3 hari kemudian (atau 266 kalau ditunda sampai sesudah ujian); pesta pertama
  const TEMPAT = ["ice cream shop", "bookshop", "car wash", "café by the station"];
  const GAJI = 20;   // coins amplop shift pertama [angka umum]; hari kerja berikutnya lewat agenda "Part-time job" (agenda.js)
  const IZIN = T("izin_kerja_sambilan", 215, 240, "PART-TIME JOB", "part-time job form", "☕", x => {
    const r = seed_rng(x.c.id, "remaja", "sambilan").random(), tempat = TEMPAT[Math.floor(r * TEMPAT.length)], n = x.n;
    if (!gateOk(x)) { x.c.info.sambilan_izin = { id: "boleh", d: x.day, oleh: "default", tempat }; x.c.info.sambilan = tempat; x.c.info.sambilan_mulai = x.day + 3; return `A form from the ${tempat} comes home: Saturdays and two evenings, a signature on the dotted line. It goes back signed the same evening. ${n} starts in three days.`; }
    x.say(`${n} comes home with a form from the ${tempat}: Saturdays and two evenings, ${GAJI} coins a week, and a parent's signature on the dotted line.`);
    const [g, final] = tanya(x, `${n} wants a part-time job at the ${tempat}. Sign the form?`, { boleh: "Sign it", tidak: "Not till after the exams" },
      { suportif: "boleh", tegas: "tidak" }, "boleh", { obey: false, safe: "boleh", alone: `so the form went back signed, and ${n} starts in three days.` });
    x.c.info.sambilan_izin = { id: final, d: x.day, oleh: oleh(g), tempat };
    x.c.info.sambilan = tempat;
    if (final === "boleh") { x.c.info.sambilan_mulai = x.day + 3; x.need("mood", 5); return `Signed. ${n} starts at the ${tempat} in three days, and spends the three days practising a work face in the mirror.`; }
    x.c.info.sambilan_mulai = x.c.born + 266; x.need("mood", -4); x.trait("ambisius", 1);
    return `Not till after the exams. ${n} folds the form into the drawer and says "fine" in the voice that means later. The ${tempat} says the offer stands till summer.`;
  });
  const KERJA = { id: "kerja_sambilan",
    cond: x => x.phase === "remaja" && !x.c.fired.kerja_sambilan && !!x.c.info.sambilan && x.day >= (x.c.info.sambilan_mulai ?? x.day),
    run: x => {
      mark(x, "kerja_sambilan");   // boleh bareng tonggak lain di hari yang sama (bukan tg_hari)
      const tempat = x.c.info.sambilan, hadiah = 6, n = x.n;
      coins(x, GAJI - hadiah); x.bond(3); x.trait("rajin", 1); x.remember(`First part-time job, at the ${tempat}.`);
      return `First shift at the ${tempat}: four hours, one spilled tray, ${GAJI} coins in an envelope with ${n}'s name on it. ${n} spends ${hadiah} of it on a small something for you and hides the rest in the jar: ${wallet(x.c)} coins now.`;
    } };
  const PESTA = T("pesta_pertama", 200, 230, "FIRST PARTY", "first real party", "🎈", x => {
    const s = sahabatOf(x.c), n = x.n, options = { pulang: "Home by nine", larut: "Stay till the end" }, rule = x.rule("jam_malam");
    x.say(`${n} is invited to ${s ? `${s.nama}'s` : "a"} birthday party, the first real one: a hall, a playlist, "everyone's going", and everyone's staying till the end.`);
    let final, followed;
    if (rule) [final, followed] = x.by_rule("curfew is " + (rule === "ketat" ? "nine" : "eleven"), rule === "ketat" ? "pulang" : "larut", "larut", options);
    else [, final, followed] = tanya(x, "Everyone's staying till the end. Let them?", options, { suportif: "larut", tegas: "pulang" }, "larut", { safe: "pulang", alone: `so ${n} stayed till the end without waiting for your OK.` });
    x.c.info.pesta_pertama = { d: x.day, pulang: final, nurut: followed }; x.c.info.pesta_hari = x.day;   // ekornya (masalah_di_pesta / pesta_aman) besok
    if (final === "pulang") { x.need("mood", 4); x.bond(1); return `${n} goes, dances badly and well, and is home by nine as agreed: first to leave, and minds, a little, and doesn't say so till morning.`; }
    x.flag("di_pesta", 1); x.need("mood", 8);
    if (followed === false) { x.flag("kabur_ke_pesta", 1); x.bond(-3); x.trait("impulsif", 1); return `${n} goes. At nine a text arrives: "leaving now". ${n} is not leaving now. The music, apparently, has only just got good.`; }
    return `${n} goes, and stays till the lights come up, and walks home with half the party, singing. ${rule ? "In by eleven, as agreed, give or take." : "It's past eleven when the key turns."}`;
  });
  const ALL = [...KALENDER, ...LIST, IZIN, PESTA], BY_ID = Object.fromEntries(ALL.map(t => [t.id, t]));

  // hari (umur) kejadian ini buat makhluk ini: jam tetap = sama buat semua; jendela = dari benih, ditarik dari [lo, hi-2] supaya ada dua
  // hari buat ngalah ke hari jam tetap atau tonggak lain tanpa lewat dari jendelanya
  function dayOf(c, t) {
    if (typeof t === "string") t = BY_ID[t];
    if (!t) return null;
    if (t.fixed) return t.at;
    return t.lo + Math.floor(seed_rng(c.id, "remaja", t.id).random() * Math.max(1, t.hi - t.lo - 1));
  }
  const mark = (x, id) => { x.c.fired[id] = 1; (x.c.info.tonggak ||= {})[id] = x.day; };
  // satu kejadian berjendela per hari (c.info.tg_hari, dipakai bareng tonggak.js dan anak.js), ngalah ke hari jam tetap selama jendelanya ada
  const free = x => x.c.info.tg_hari !== x.day && !fixedDay(x.age);

  // jam tetap: tepat di harinya. Save lama yang kelewat: menyusul satu per hari (c.info.sk_hari); pengumuman basi gugur (until).
  for (const k of KALENDER) if (k.run) FORCED.push({ id: k.id,
    cond: x => x.phase === "remaja" && !x.c.fired[k.id] && x.age >= k.at && (k.until == null || x.age < k.until) && (x.age === k.at || x.c.info.sk_hari !== x.day),
    run: x => { mark(x, k.id); x.c.info.sk_hari = x.day; return k.run(x); } });
  FORCED.push(ATURAN);   // sesudah hari pertama SMP di catatan hari 180
  // berjendela: urut jendela yang paling cepat habis, di hari terakhir jendela tetap jalan
  for (const t of [...LIST].sort((a, b) => a.hi - b.hi)) FORCED.push({ id: t.id,
    cond: x => x.phase === "remaja" && !x.c.fired[t.id] && x.age >= dayOf(x.c, t) && (x.age >= t.hi || free(x)),
    run: x => { mark(x, t.id); x.c.info.tg_hari = x.day; return t.run(x); } });
  // bersyarat: izin kerja nunggu pagar dilema selama jendelanya masih ada; makhluk yang sudah punya kerja (save lama) nggak ditanya
  FORCED.push({ id: IZIN.id,
    cond: x => x.phase === "remaja" && !x.c.fired[IZIN.id] && !x.c.info.sambilan && x.t("ambisius") > 40 && x.age >= dayOf(x.c, IZIN) && (x.age >= IZIN.hi || (free(x) && gateOk(x))),
    run: x => { mark(x, IZIN.id); x.c.info.tg_hari = x.day; return IZIN.run(x); } });
  FORCED.push(KERJA);
  FORCED.push({ id: PESTA.id,
    cond: x => x.phase === "remaja" && !x.c.fired[PESTA.id] && x.age >= dayOf(x.c, PESTA) && (x.age >= PESTA.hi || free(x)),
    run: x => { mark(x, PESTA.id); x.c.info.tg_hari = x.day; return PESTA.run(x); } });
  // ---------------------------------------------------------------- 4. uang jajan Senin (hari 0 = Minggu, jadi Senin = day % 7 === 1)
  FORCED.push({ id: "uang_jajan_senin",
    cond: x => x.phase === "remaja" && x.day % 7 === 1 && x.c.info.jajan_hari !== x.day,
    run: x => { const n = JAJAN[x.rule("jajan")] ?? JAJAN.besar; x.c.info.jajan_hari = x.day; coins(x, n); return `_Monday. ${n} coins pocket money into the jar: ${wallet(x.c)} coins now._`; } });

  // ---------------------------------------------------------------- untuk UI
  // catatan kecil di tangga buat tonggak yang sudah terjadi ("apa"-nya)
  function note(c, id) {
    const I = c.info, T = I.tonggak || {};
    if (id === "suara_berubah") { const g = (I.garis || []).find(g => g.d === T.suara_berubah); return g ? `${g.cm} cm` : ""; }
    if (id === "cita_cita") return I.cita ? `future ${I.cita}` : "";
    if (id === "hobi_sendiri") return I.hobi ? I.hobi.label : "";
    if (id === "gaya_sendiri") return I.gaya ? I.gaya.label : "";
    if (id === "beli_pertama") return I.beli_pertama ? `${I.beli_pertama.item}, ${I.beli_pertama.harga} coins` : "";
    if (id === "izin_kerja_sambilan") return I.sambilan_izin ? (I.sambilan_izin.id === "boleh" ? `signed, the ${I.sambilan_izin.tempat}` : "after the exams") : "";
    if (id === "kerja_sambilan") return I.sambilan ? `the ${I.sambilan}` : "";
    if (id === "pesta_pertama") return I.pesta_pertama ? (I.pesta_pertama.pulang === "pulang" ? "home by nine" : I.pesta_pertama.nurut === false ? "stayed past curfew" : "stayed till the end") : "";
    return "";
  }
  // Tangga: tujuh tonggak remaja + yang bersyarat kalau terjadi (bentuk sama dengan Tonggak.view / Anak.view; note = "apa"-nya)
  function view(c, day) {
    const age = c.age(day), done = c.info.tonggak || {};
    const row = (t, lo, hi) => { const at = done[t.id] != null ? done[t.id] - c.born : (c.fired[t.id] ? -1 : null); return { id: t.id, label: t.label, lbl: t.lbl, ic: t.ic, lo, hi, fixed: false, done: at != null, at, open: at == null && age >= lo, note: at != null ? note(c, t.id) : "" }; };
    const extra = [IZIN, PESTA].filter(t => c.fired[t.id]).map(t => row(t, t.lo, t.hi));
    if (c.fired.kerja_sambilan) extra.push(row({ id: "kerja_sambilan", label: "first part-time job", lbl: "PART-TIME JOB", ic: "☕" }, IZIN.lo + 3, IZIN.hi + 3));
    return LIST.map(t => row(t, t.lo, t.hi)).concat(extra).sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  }
  // Kartu "gw siapa": keisi sepanjang fase dari tonggak; sesudah lulus judulnya "Class of 2027: Tutu, future musician". Tanpa angka,
  // bahan banding antar pemain (bagian 7 usulan 4). Tahun angkatan = tahun kalender nyata di hari pengumuman lulus (umur 265).
  const classOf = c => new Date(START_DATE + (c.born + 265) * 86400000).getUTCFullYear();
  function siapa(c, day) {
    const age = c.age(day), I = c.info, s = sahabatOf(c), T = I.tonggak || {}, teman = Object.values(c.relations).filter(r => r.tipe === "teman").length;
    const at = id => T[id] != null ? `at ${T[id] - c.born} days old` : "";
    const win = id => { const t = BY_ID[id]; return t ? `usually at ${t.lo}–${t.hi} days old` : ""; };
    const row = (id, label, ic, val, sub) => ({ id, label, ic, done: !!val, val: val || "", sub: val ? (sub || at(id)) : (sub || win(id)) });
    const rows = [
      row("cita_cita", "Dream", "🌠", I.cita ? `future ${I.cita}` : ""),
      row("hobi_sendiri", "Hobby", "🎧", I.hobi ? I.hobi.label : ""),
      row("gaya_sendiri", "Look", "🧢", I.gaya ? I.gaya.label : ""),
      row("kota_sendiri", "Town", "🚍", c.fired.kota_sendiri ? "knows the way in, alone" : ""),
      { id: "sahabat", label: "Best friend", ic: "🧑‍🤝‍🧑", done: !!s, val: s ? s.nama : "", sub: s ? `since ${s.sejak - c.born} days old` : I.sahabat_lama ? `${I.sahabat_lama.nama} moved away` : "none right now" },
      { id: "crew", label: "Crew", ic: "🛹", done: teman > 0, val: teman ? `${teman} friend${teman > 1 ? "s" : ""} beyond the best one` : "", sub: teman ? "from school, the crew, the Saturday table" : "the best friend, so far" },
      row("kerja_sambilan", "Work", "☕", c.fired.kerja_sambilan && I.sambilan ? `the ${I.sambilan}, Saturdays and two evenings` : "", c.fired.kerja_sambilan ? "" : I.sambilan ? "starts after the exams" : c.traits.ambisius > 40 && age < 240 ? "if a form comes home: between 215 and 240 days old" : "not this year"),
      row("beli_pertama", "First buy", "🛍️", I.beli_pertama ? `${I.beli_pertama.item}, ${I.beli_pertama.harga} coins of their own` : ""),
    ];
    const lulus = I.lulus ? { tahun: classOf(c), nilai: I.lulus, jalur: I.jalur || null } : null;
    const title = lulus ? `Class of ${lulus.tahun}: ${c.name}${I.cita ? `, future ${I.cita}` : ""}` : `Who ${c.name} is`;
    return { title, rows, n: rows.filter(r => r.done).length, lulus, teen: phase_of(age) === "remaja" };
  }
  // Kalender sekolah buat app School: hari absolut, status, nilai (ulangan dan ujian akhir lewat c.info.nilai), rapor, hasil singkat
  const HASIL = (c, id) => {
    const I = c.info;
    if (id === "study_tour_berangkat") return c.fired.study_tour_pulang ? "sea glass on the sill" : "away by the harbour";
    if (id === "pekan_ujian") return "four papers";
    if (id === "pengumuman_lulus" && I.lulus) return `${I.lulus} grades`;
    if (id === "pesta_kelulusan" && I.pesta_kelulusan) return `home by ${I.pesta_kelulusan.pulang}`;
    return "";
  };
  function calendar(c, day) {
    const N = c.info.nilai || {}, R = c.info.rapor || [];
    return KALENDER.filter(k => k.app).map(k => {
      const d = c.born + k.at, done = k.run ? !!c.fired[k.id] : !!N[k.id];
      return { id: k.id, day: d, lbl: k.lbl, label: k.label, ic: k.ic, done, past: d < day, nilai: N[k.id] || null, rapor: R.find(r => r.kal === k.id) || null, hasil: done ? HASIL(c, k.id) : "" };
    });
  }
  // Buat baris Soon: tonggak berjendela berikutnya (termasuk yang bersyarat kalau makhluk ini bakal dapat), tanggal sekolah berikutnya;
  // ujian yang sudah diumumkan nggak dobel (soon.js punya baris ujian dari c.info.ujian). Hanya selama remaja.
  function upcoming(c, day) {
    const age = c.age(day);
    if (phase_of(age) !== "remaja") return [];
    const out = [], u = c.info.ujian;
    const cands = LIST.filter(t => !c.fired[t.id]).concat(!c.fired[IZIN.id] && !c.info.sambilan && c.traits.ambisius > 40 ? [IZIN] : [], !c.fired[PESTA.id] ? [PESTA] : []).sort((a, b) => a.lo - b.lo || a.hi - b.hi);
    const rng = cands[0];
    if (rng) out.push({ cid: c.id, id: rng.id, lbl: rng.lbl, label: rng.label, ic: rng.ic, lo: c.born + rng.lo, hi: c.born + rng.hi, fixed: false });
    const fix = KALENDER.find(k => k.soon && c.born + k.at > day && !(u && k.id === u.kal));
    if (fix) out.push({ cid: c.id, id: fix.id, lbl: fix.lbl, label: fix.label, ic: fix.ic, lo: c.born + fix.at, hi: c.born + fix.at, fixed: true, key: "sekolah", tx: fix.tx, sub: fix.sub });
    return out;
  }
  const next = (c, day) => view(c, day).find(v => !v.done) || null;
  // Rak Later (ui/35-tonggak.js, ui/18-phone.js): app dewasa kebuka satu-satu di umur tetap, sama buat semua; kelihatan dari remaja
  const LATER = [{ id: "work", from: 270, name: "Work" }, { id: "wallet", from: 270 }, { id: "homes", from: 300 }, { id: "kindred", from: 330 }, { id: "paws", from: 360 }, { id: "ventures", from: 400 }];
  const laterFrom = id => { const L = LATER.find(l => l.id === id); return L ? L.from : 0; };

  const API = { KALENDER, LIST, IZIN, PESTA, PAKET, KATA, JAJAN, GAJI, LATER, GRADE, dayOf, tinggi, view, siapa, calendar, upcoming, next, aturanOf, sahabatOf, classOf, citaOf, laterFrom };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Remaja = API;
})();

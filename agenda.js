// Agenda harian: tiap makhluk punya satu kegiatan per hari.
// Penjaga pasang rencana (berlaku terus sampai diganti, seperti aturan rumah). Makhluk bisa nurut,
// bisa bosan kalau rencananya sama terus, dan kalau tidak ada rencana dia memilih sendiri sesuai sifatnya.
// Kegiatan memberi efek kecil tiap hari dan membuat cerita tertentu lebih mungkin muncul.
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const S = (typeof module !== "undefined") ? require("./storylets.js") : globalThis.Storylets;
  const { HOOKS } = E;

  // id: [label, teks (pakai {n}), syarat, efek, cerita yang dibuat lebih mungkin, bobot pilihan sendiri]
  const A = (label, text, effect, boost, self, cond) => ({ label, text, effect, boost: boost || {}, self, cond: cond || (() => true) });
  const hasKids = x => S.kids_here(x).some(k => k.age(x.day) < 270);

  const AGENDA = {
    bayi: {
      main: A("Play", "{n} rolls around on the rug, giggling.", x => { x.need("mood", 4); x.trait("kreatif", 0.04); },
        { main_mainan: 2.5 }, x => 1),
      dongeng: A("Storybook", "{n} flips through a picture book, babbling away.", x => { x.stat("kecerdasan", 0.12); x.bond(0.1); },
        {}, x => 0.4),
      jalan: A("Stroll", "{n} goes for a stroll around the park, eyes looking everywhere.", x => { x.trait("ramah", 0.04); x.trait("penakut", -0.04); },
        { takut_petir: 0.5 }, x => 0.6),
      tidur_siang: A("Nap", "{n} takes a super long nap.", x => { x.need("energi", 20); },
        {}, x => 0.8),
    },
    anak: {
      belajar: A("Study", "{n} studies at the dining table.", x => { x.stat("kecerdasan", 0.15); x.trait("rajin", 0.04); x.need("mood", -2); },
        { ujian: 1.5, pertanyaan_besar: 2 }, x => x.t("rajin") / 50),
      teman: A("Play with friends", "{n} plays with friends until evening.", x => { x.trait("ramah", 0.05); x.need("mood", 4); },
        { teman_baru: 3, berantem_sekolah: 1.5 }, x => x.t("ramah") / 40),
      latihan: A("Practice talent", "{n} practices alone in their room.", x => {
        if (x.c.info.bakat) x.c.info.bakat_level = Math.min(100, x.c.info.bakat_level + 0.3); else x.trait("kreatif", 0.05);
      }, { bakat_ketahuan: 3, latihan_bakat: 2, lomba: 2 }, x => x.t("kreatif") / 50),
      olahraga: A("Exercise", "{n} runs laps around the neighborhood.", x => { x.stat("kesehatan", 0.3); x.need("energi", -8); },
        {}, x => 0.5),
      bantu_rumah: A("Help at home", "{n} helps water the plants and fold the laundry.", x => { x.trait("patuh", 0.04); x.bond(0.1); },
        {}, x => x.t("patuh") / 70),
      bebas: A("Free day", "{n} has a free day to do whatever they want.", x => { x.need("mood", 6); x.trait("impulsif", 0.04); },
        { bolos_diam_diam: 2, pet_nyasar: 3 }, x => x.t("impulsif") / 35),
    },
    dewasa: {
      kerja_keras: A("Work hard", "{n} focuses on work all day.", x => { x.stat("karier", 0.05); x.need("mood", -3); },
        { naik_jabatan: 2, dimarahi_bos: 0.5, karya_besar: 1.5 }, x => x.t("ambisius") / 40, x => !!x.c.info.kerja),
      cari_kerja: A("Job hunt", "{n} sends job applications here, there and everywhere.", x => { x.need("mood", -1); },
        { cari_kerja: 3 }, x => 1.5, x => !x.c.info.kerja && !x.c.info.pensiun),
      sosial: A("Meet people", "{n} hangs out and meets new people.", x => { x.trait("ramah", 0.03); x.need("mood", 4); },
        { kenalan_menarik: 2.5, teman_baru: 2, party_kantor: 1.5, reuni: 2 }, x => x.t("ramah") / 40),
      pasangan: A("Couple time", "{n} spends time with their partner.", x => {
        const p = x.c.partner(); if (p) p.skor = Math.min(100, p.skor + 0.3); x.need("mood", 3);
      }, { kencan: 2.5, lamaran: 2, berantem_rumah_tangga: 0.5, kabar_bayi: 1.5 }, x => x.t("setia") / 40, x => !!x.c.partner()),
      keluarga: A("Kid time", "{n} spends the whole day with the kids.", x => {
        for (const k of S.kids_here(x)) if (k.age(x.day) < 270) k.bond = Math.min(100, k.bond + 0.15);
      }, { jadi_orang_tua: 2.5, urusan_anak_sekolah: 1.5 }, x => 1.2, hasKids),
      hobi: A("Hobby", "{n} gets lost in their hobby.", x => {
        x.need("mood", 5); x.trait("kreatif", 0.03);
        if (x.c.info.bakat) x.c.info.bakat_level = Math.min(100, x.c.info.bakat_level + 0.15);
      }, { hobi_baru: 3, karya_besar: 2, latihan_bakat: 2, usaha_sampingan: 1.5 }, x => x.t("kreatif") / 45),
      olahraga: A("Exercise", "{n} does a morning workout.", x => { x.stat("kesehatan", 0.3); x.need("energi", -8); },
        { kecelakaan_kecil: 1.3 }, x => 0.5),
      istirahat: A("Rest", "{n} lazes around all day.", x => { x.need("energi", 15); x.stat("kesehatan", 0.1); },
        {}, x => 0.6),
    },
    tua: {
      jalan_pagi: A("Morning walk", "{n} takes a slow morning walk around the neighborhood.", x => { x.stat("kesehatan", 0.2); },
        { senam_lansia: 2 }, x => 1),
      cucu: A("Grandkid time", "{n} waits for the grandkids to come home from school.", x => { x.need("mood", 5); },
        { main_sama_cucu: 3 }, x => 1.5, x => S.grandkids_here(x).length > 0),
      kenangan: A("Old photo album", "{n} looks through an old photo album.", x => { x.need("mood", 3); },
        { kenangan: 3 }, x => 0.8),
      istirahat: A("Rest", "{n} naps in the rocking chair.", x => { x.need("energi", 15); x.stat("kesehatan", 0.1); },
        { sakit_tua: 0.7 }, x => 0.8),
    },
  };
  AGENDA.remaja = Object.assign({}, AGENDA.anak, {
    teman: A("Hang out with friends", "{n} hangs out with their crew.", x => { x.trait("ramah", 0.05); x.need("mood", 4); },
      { teman_baru: 2.5, cinta_monyet: 2, pesta_pertama: 2, jadian_remaja: 1.5 }, x => x.t("ramah") / 40),
    kerja_sambilan: A("Part-time job", "{n} works a part-time job after school.", x => { x.stat("uang", 0.5); x.trait("rajin", 0.03); x.need("energi", -6); },
      { kerja_sambilan: 3 }, x => x.t("ambisius") / 60),
  });

  function options(x) {
    const table = AGENDA[x.phase] || {};
    return Object.entries(table).filter(([, a]) => a.cond(x));
  }

  function selfPick(x, opts) {
    return x.rng.choices(opts, opts.map(([, a]) => Math.max(0.05, a.self(x))))[0];
  }

  HOOKS.agenda = x => {
    const c = x.c, opts = options(x);
    if (!opts.length) return;
    const plan = c.info.rencana;
    const planned = opts.find(([id]) => id === plan);
    const streak = c.info.agenda_terakhir === plan ? (c.info.agenda_streak || 0) : 0;
    let chosen, how;
    if (planned) {
      // Makin lama rencananya sama, makin bosan dan makin susah disuruh
      const bored = streak >= 5;
      const ob = x.obey_chance() * (bored ? 0.55 : 1);
      if (x.chance(Math.min(0.97, ob + 0.25))) { chosen = planned; how = bored ? "bosan" : "nurut"; }
      else { chosen = selfPick(x, opts.filter(([id]) => id !== plan)) || planned; how = "kabur"; }
    } else {
      chosen = selfPick(x, opts); how = "sendiri";
    }
    const [id, act] = chosen;
    c.info.agenda_streak = c.info.agenda_terakhir === id ? (c.info.agenda_streak || 0) + 1 : 1;
    c.info.agenda_terakhir = id;
    c.info.agenda_hari = { hari: x.day, id, label: act.label, how };
    act.effect(x);
    if (how === "bosan") x.need("mood", -3);
    x.boost = act.boost;
    const text = act.text.replace("{n}", x.n);
    const note = how === "kabur" ? ` The plan was "${lower(planned[1].label)}", but they picked this instead.`
      : how === "bosan" ? " They're starting to look bored of the same old routine." : "";
    if (how === "kabur" || how === "bosan") x.say(`_${text}${note}_`);
    else x.say(`_${text}_`);
  };
  const lower = s => s.toLowerCase();

  const API = { AGENDA, options };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Agenda = API;
})();

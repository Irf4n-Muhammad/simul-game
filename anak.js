// anak.js: fase anak (v46, 60–180 hari). Aturan yang sama dengan bayi (tonggak.js), dari riset/fase-kehidupan.md bagian 6:
//   jam tetap = kota, rentang = tubuh; kapan = benih, apa = pemain.
//   1. KALENDER SEKOLAH TETAP (sama buat semua makhluk seumur = angkatan): ulangan umur 95 dan 150 (diumumkan 3 hari sebelumnya,
//      diselesaikan storylet `ujian` di storylets.js yang mencatat nilainya di c.info.nilai), rapor 120 dan 178 (nilai, teman,
//      catatan guru -> c.info.rapor), libur sekolah 121–127, pentas sekolah 165 (lomba terjadwal, hasilnya nggak pasti).
//      Ulangan acak (`ujian_diumumkan`) dan lomba acak (`lomba`) pindah ke remaja; di anak semuanya bertanggal.
//   2. TONGGAK ANAK BERJENDELA, delapan, harinya dari benih (seed_rng(id, "anak", id)), satu per hari, ngalah ke hari jam tetap
//      selama jendelanya masih ada: gigi copot, baca sendiri, naik sepeda, berenang, nginep, uang jajan, berangkat sekolah sendiri,
//      garis di pintu. Yang "apa"-nya dari pemain: buku pertama ngikut keinginan bacaan, sepeda dari tetangga (v45.1), nginep di rumah sahabat.
//   3. SAHABAT: satu slot c.info.sahabat = { jenis: "npc" | "pemain", id, nama, sejak }. Kenal di jendela 65–90 (bayi dari taman v45.1
//      kalau ada), ritme Sabtu, berantem lalu baikan tiga hari kemudian (tanpa dilema; cuma sama NPC), pindah kota di 140–172 (NPC saja),
//      sahabat baru 6–12 hari sesudahnya. Slot "pemain" nunggu backend (C1): yang pindah cuma NPC, jadi slotnya kebuka buat teman pemain.
//   4. Bakat ketahuan tetap storylet (storylets.js), tapi harinya rentang 85–110 dari benih (Storylets.bakatDay), bukan dadu director.
//   5. (v46.1) PILIHAN LINGKUNGAN: peran pemain di fase anak = milih lingkungan, bukan ngatur anaknya. Empat dilema terjadwal: pilih
//      sekolah (umur 56, sebelum hari pertama), pilih les (di `bakat_ketahuan`, storylets.js, tiga pilihan), tujuan liburan (116, lima
//      hari sebelum libur), izin field trip (131, tiga hari sebelum). Pagar (bagian 7): jarak minimal 14 hari dari dilema terjadwal
//      sebelumnya (c.info.dilema_hari; yang kena pagar jalan sendiri pakai default, tanpa tanya), dan kalau dicuekin semua jalan sendiri:
//      sekolah dekat rumah, les ngikut bakat, ikut field trip, liburan ke danau. Nggak ada pilihan yang salah: yang berubah teks
//      hari-harinya; angkanya cuma sedikit (ulangan +6 di sekolah favorit, lomba +8% di sekolah seni/olahraga, les matematika +5 ulangan).
//      Bayaran les nunggu keputusan uang (dompet rumah), jadi belum dipotong dari mana-mana.
//   6. (v46.1) JAM TETAP LAIN: klinik gigi 100 dan 160, mata 130 (hasil dari benih: celah gigi, tambalan kecil, kacamata 1 dari 5;
//      tercatat di c.info.klinik_anak buat tangga profil), lomba kota 142 (Young Talents, hasil dari latihan lawan satu angka benih),
//      field trip 134, cerita liburan 122/125/127 ngikut tujuan yang dipilih.
// UI membaca view() (tangga di profil), upcoming() (baris Soon lewat S.tonggak di soon.js), calendar() (app School, kalender HP).
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const Tg = (typeof module !== "undefined") ? require("./tonggak.js") : globalThis.Tonggak;
  const { FORCED, seed_rng, phase_of, storylet } = E;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const sahabatOf = c => c.info.sahabat || null;

  // ---------------------------------------------------------------- 1. kalender sekolah tetap
  // at = umur (hari) kejadian, sama buat semua. soon = tampil di baris Soon; app = baris di app School; until = pengumuman cuma jalan
  // selama [at, until) (save lama yang kelewat nggak dapat "ulangan 3 hari lagi" yang basi). run null = penanda: diselesaikan modul lain.
  const K = (id, at, lbl, label, ic, run, o = {}) => Object.assign({ id, at, lbl, label, ic, run, fixed: true, soon: true, app: true }, o);
  const umumkan = (k, n) => x => {
    const hari = x.c.born + k;
    x.c.info.ujian = { hari, belajar: 0, sendiri: 0, jenis: "ulangan", kal: "ulangan_" + n };
    if (sekolahOf(x.c).id === "favorit") x.need("mood", -2);   // v46.1: sekolah favorit = ulangannya kerasa
    return `School news: ${n === 1 ? "the first quiz of the year" : "the second quiz"} is in ${hari - x.day} days, the same morning for every class in Old Town. You can help ${x.n} study any evening before then.`;
  };
  const GRADE = { great: "Top marks", okay: "Middling marks", bad: "Marks that need work" };
  // catatan guru: dari sifat yang paling menonjol (>= 58), kalau nggak ada yang menonjol: anak yang tenang
  const NOTE = [["rajin", "Works hard and finishes everything, even the boring bits."], ["ramah", "Everyone's friend. Talks a little too much."],
    ["kreatif", "Draws on everything, including the desk."], ["impulsif", "Quick to act, quick to say sorry."],
    ["penakut", "Quiet at first; opens up by lunchtime."], ["ambisius", "Wants to be first in line for everything."], ["setia", "Sticks by a friend, no matter what."]];
  function catatan(x) {
    let best = null;
    for (const [t, s] of NOTE) { const v = x.t(t); if (v >= 58 && (!best || v > best[0])) best = [v, s]; }
    return best ? best[1] : "A steady one. No surprises, in a good way.";
  }
  function rapor(x, k) {
    const q = (x.c.info.nilai || {})["ulangan_" + k], g = q ? q.g : null, note = catatan(x);
    const teman = Object.values(x.c.relations).filter(r => r.tipe === "teman" || r.tipe === "sahabat").length;
    (x.c.info.rapor ||= []).push({ d: x.day, kal: "rapor_" + k, nilai: g, teman, catatan: note });
    x.need("mood", g === "great" ? 8 : g === "bad" ? -5 : 2);
    if (g === "great") x.stat("reputasi", 1);
    x.remember(`${k === 1 ? "First" : "Second"} report card: ${g ? GRADE[g].toLowerCase() : "no quiz on record"}. "${note}"`);
    const belajar = q && q.belajar ? `, after ${q.belajar} study evening${q.belajar > 1 ? "s" : ""}` : "";
    const friends = teman === 0 ? "none yet, says the teacher, kindly" : teman === 1 ? "one, a close one" : String(teman);
    return `Report card day. ${g ? GRADE[g] : "No quiz on record this term"}${belajar}. Friends: ${friends}. And a line in the teacher's hand: "${note}"`;
  }
  // Pentas: bagiannya ngikut bakat; hasilnya dari latihan (bakat_level, rajin, les) lawan satu angka dari benih. Nggak pakai dadu harian
  // supaya urutan rng director nggak bergeser dan hasilnya tetap di replay.
  const PART = { drawing: "a painting on the big wall", music: "a verse to sing alone", sports: "the last leg of the relay", science: "the volcano in the science corner" };
  function pentas(x) {
    const n = x.n, part = PART[x.c.info.bakat] || "a part in the class play";
    const p = 0.3 + (x.c.info.bakat_level || 0) / 200 + x.t("rajin") / 400 + (x.has("les") ? 0.1 : 0) - x.t("penakut") / 500;
    const r = seed_rng(x.c.id, "anak", "pentas").random();
    const hasil = r < p ? "bagus" : r < p + 0.35 ? "biasa" : "grogi";
    x.c.info.pentas = { d: x.day, part, hasil };
    if (hasil === "bagus") { x.stat("reputasi", 4); x.need("mood", 12); x.remember(`Shone at the school show: ${part}.`); return `The school show. ${n} has ${part}, and gets the loudest clap of the afternoon. ${x.attended ? "You were in the second row." : "They looked for you in the second row."}`; }
    if (hasil === "biasa") { x.need("mood", 6); x.remember(`The school show: ${part}. Fine, mostly.`); return `The school show. ${n} has ${part}. It goes fine, mostly: one wobble that nobody but you noticed. They want to do it again next year.`; }
    x.need("mood", -4); x.trait("ambisius", 1); x.remember(`Froze at the school show. "Next year."`);
    return `The school show. ${n} has ${part}, walks out, and freezes. A long five seconds. On the way home: "Next year." Said like a promise.`;
  }
  // ---------------------------------------------------------------- 5. pilihan lingkungan (v46.1)
  const SEKOLAH = {
    dekat: { nama: "Old Town Primary", di: "round the corner", teks: n => `${n} is enrolled at Old Town Primary, two streets away. The neighbours' kids go there; now so does ${n}.` },
    seni: { nama: "Hillside Arts & Sport", di: "up the hill", teks: n => `${n} is enrolled at Hillside Arts & Sport. A bus up the hill every morning, a studio and a running track at the top.` },
    favorit: { nama: "Riverside Academy", di: "across the bridge", teks: n => `${n} is enrolled at Riverside Academy: the long way round, across the bridge, and the best report cards in town. We'll see.` },
  };
  // sekolah makhluk ini: yang dipilih, atau yang dekat kalau nggak pernah ditanya (save lama, atau kena pagar)
  const sekolahOf = c => { const p = c.info.sekolah_pilihan, id = p && SEKOLAH[p.id] ? p.id : "dekat"; return { id, ...SEKOLAH[id], dipilih: !!p, oleh: p ? p.oleh : "default", d: p ? p.d : null }; };
  const TUJUAN = { danau: "the lake cabins", pantai: "the seaside", rumah: "home, with day trips" };
  const liburanOf = c => { const p = c.info.liburan; return p && TUJUAN[p.id] ? p : { id: "danau", d: null, oleh: "default" }; };
  // pagar jarak: dilema terjadwal berikutnya cuma ditanya kalau yang sebelumnya >= 14 hari lalu; kalau nggak, jalan sendiri pakai default
  const GAP = 14;
  const gateOk = x => x.day - (x.c.info.dilema_hari ?? -GAP) >= GAP;
  function tanya(x, q, opts, prefs, self, o) { x.c.info.dilema_hari = x.day; return x.ask(q, opts, prefs, self, o); }
  // ask(): penjaga nggak buka app = default (self_pick) yang jalan; `safe` disamain dengan default supaya wakil "aman" nggak milih yang lain
  const oleh = g => g === null ? "sendiri" : "wali";
  const SEKOLAH_Q = n => `Which school for ${n}? Three letters came.`;
  // pilih sekolah: umur 56–59 (bayi), di hari yang nggak ada tonggak bayi; lewat 60 nggak ditanya lagi (sekolahOf = dekat)
  FORCED.push({ id: "pilih_sekolah",
    cond: x => !x.c.fired.pilih_sekolah && !x.c.info.sekolah_pilihan && x.age >= 56 && x.age < 60 && x.c.info.tg_hari !== x.day && x.c.info.ex_hari !== x.day,
    run: x => {
      x.c.fired.pilih_sekolah = 1;
      x.say(`Three letters on the mat, one from each school that takes creatures born this week. ${x.n} chews the corner of one. Enrolment closes tomorrow.`);
      const [g, final] = tanya(x, SEKOLAH_Q(x.n), { dekat: "Old Town Primary, round the corner", seni: "Hillside Arts & Sport, up the hill", favorit: "Riverside Academy, across the bridge" },
        { suportif: "dekat", tegas: "favorit" }, "dekat", { obey: false, safe: "dekat", alone: "so the form went in for the school round the corner, where the neighbours' kids go." });
      x.c.info.sekolah_pilihan = { id: final, d: x.day, oleh: oleh(g) };
      if (final === "dekat") x.trait("ramah", 1);
      x.remember(`Enrolled at ${SEKOLAH[final].nama}.`);
      return SEKOLAH[final].teks(x.n);
    } });
  // tujuan liburan: ditanya tepat umur 116 kalau pagarnya lolos; selain itu (save lama, kena pagar) ke danau tanpa tanya
  function tanyaLiburan(x) {
    if (x.age !== 116 || !gateOk(x)) { x.c.info.liburan = { id: "danau", d: x.day, oleh: "default" }; return `A week off school starts in five days. The lake cabins again, booked without much discussion. ${x.n} is already packing the fishing net.`; }
    x.say(`${x.n} brings home a note: a week off school, starting in five days. The whole class is already trading plans.`);
    const [g, final] = tanya(x, "A week off school starts in five days. Where to?", { danau: "The lake cabins, an hour away", pantai: "The seaside, a long drive", rumah: "Stay home, day trips" },
      { suportif: "pantai", tegas: "rumah" }, "danau", { obey: false, safe: "danau", alone: "so it's the lake cabins, an hour away, like most years." });
    x.c.info.liburan = { id: final, d: x.day, oleh: oleh(g) };
    return { danau: `The lake cabins, then. ${x.n} starts packing that evening, five days early: net, torch, three books, no socks.`,
      pantai: `The seaside, then. ${x.n} digs out the bucket from last summer and sleeps with it next to the bed.`,
      rumah: `Home, then, with day trips. ${x.n} writes a list of seven places and tapes it to the fridge.` }[final];
  }
  const LIBURAN = {
    berangkat: { danau: n => `Off to the lake. ${n} falls asleep in the car and wakes up to water on both sides of the road.`, pantai: n => `The long drive to the seaside. ${n} asks "are we there yet" eleven times, then goes quiet at the first sight of the sea.`, rumah: n => `Day one of the week at home: the pool in the morning, the library after, and then nothing at all, gloriously.` },
    tengah: { danau: (n, t) => t ? `${n} won't go in the lake past the knees, so builds a harbour on the shore instead, with a lighthouse made of a torch.` : `${n} jumps off the jetty before anyone has checked the depth. Fine, as it turns out. Twelve more times.`,
      pantai: (n, t) => t ? `${n} keeps to the rock pools all afternoon, naming every crab, and waves at the sea from a safe distance.` : `${n} is in the sea before the towels are down, and out only when their lips go blue, and in again.`,
      rumah: (n, t) => t ? `Day four at home: ${n} spends it on the sofa with the three library books, and declares it the best day so far.` : `Day four: ${n} crosses off "the big slide" and "the market" in one morning and asks what's next.` },
    pulang: { danau: n => `Home from the lake, smelling of woodsmoke, with a jar of pebbles and a sunburnt nose. ${n} sleeps eleven hours.`, pantai: n => `Home from the seaside with sand in the car for the rest of the year. ${n} puts a shell on the windowsill, "to hear it".`, rumah: n => `Last day of the week off. ${n} has done all seven things on the fridge list and adds an eighth: "same again next year".` },
  };
  // izin field trip: ditanya tepat umur 131 kalau pagarnya lolos; selain itu dianggap ditandatangani
  function izinFieldTrip(x) {
    if (x.age !== 131 || !gateOk(x)) { x.c.info.field_trip = { ikut: true, d: x.day, oleh: "default" }; return `A permission slip for the class trip to the lighthouse comes home, and goes back signed the same evening.`; }
    x.say(`A permission slip comes home, crumpled: the class trip to the lighthouse and the rock pools, in three days. Lunch not provided.`);
    const [g, final] = tanya(x, "Class trip to the lighthouse in three days. Sign the slip?", { ikut: "Sign it, pack a lunch", tidak: "Not this time" },
      { suportif: "ikut", tegas: "ikut" }, "ikut", { obey: false, safe: "ikut", alone: `so the slip went back signed, and ${x.n} packed the lunch.` });
    x.c.info.field_trip = { ikut: final === "ikut", d: x.day, oleh: oleh(g) };
    return final === "ikut" ? `Signed. ${x.n} plans the lunch for three days: two sandwiches, an apple "for the crabs", and a biscuit that won't survive the bus.`
      : `Not this time. ${x.n} nods, then asks four more times before bed, then stops asking, which is worse.`;
  }
  function fieldTrip(x) {
    const ft = x.c.info.field_trip || { ikut: true }, s = sahabatOf(x.c);
    if (!ft.ikut) { x.need("mood", -4); return `The class goes to the lighthouse without ${x.n}. A day in the library corner with the two others who stayed, and a long, quiet evening.`; }
    x.need("mood", 8); x.stat("kesehatan", 1); x.remember("Class trip to the lighthouse. Sand in every pocket.");
    const bus = s ? ` ${s.nama} saves the window seat on the bus.` : "";
    const core = x.t("penakut") > 55 ? `${x.n} holds the teacher's hand on the headland path, then runs the whole length of the beach with everyone, shrieking.`
      : x.t("ramah") > 55 ? `${x.n} shares the big lunchbox with the whole bus before it even reaches the headland.`
      : `${x.n} finds a crab, names it, and is talked out of bringing it home in a jar.`;
    return `Field trip day.${bus} ${core} Home with sand in every pocket and the tide times by heart.`;
  }
  // lomba kota (Young Talents, balai kota): hasil dari latihan (bakat_level, rajin, les, sekolah seni) lawan satu angka dari benih
  function lombaKota(x) {
    const b = x.c.info.bakat;
    if (!b) { x.need("mood", 3); return `The Old Town Young Talents contest, in the town hall. ${x.n} goes to watch, and comes home having decided to be in it next year.`; }
    const p = 0.25 + (x.c.info.bakat_level || 0) / 200 + x.t("rajin") / 400 + (x.has("les") ? 0.1 : 0) + (sekolahOf(x.c).id === "seni" ? 0.08 : 0) - x.t("penakut") / 600;
    const r = seed_rng(x.c.id, "anak", "lomba_kota").random();
    const hasil = r < p ? "menang" : r < p + 0.3 ? "kedua" : "kalah";
    x.c.info.lomba_kota = { d: x.day, bakat: b, hasil };
    if (hasil === "menang") { x.stat("reputasi", 5); x.need("mood", 12); x.c.info.menang_lomba = (x.c.info.menang_lomba ?? 0) + 1; x.remember(`Won the city ${b} contest, under-tens.`); return `The Old Town Young Talents contest, in the town hall. ${x.n} wins the under-tens for ${b}. A ribbon, a handshake from the mayor, and a photo on the School feed by teatime.`; }
    if (hasil === "kedua") { x.need("mood", 6); x.remember(`Second at the city ${b} contest.`); return `The Old Town Young Talents contest. ${x.n} comes second in ${b}, by a whisker, to a creature a head taller. The ribbon goes on the wall anyway.`; }
    x.need("mood", -3); x.trait("ambisius", 1); x.remember(`The city ${b} contest: not this year.`);
    return `The Old Town Young Talents contest. ${x.n} goes out in the first round of ${b}, and is very quiet on the bus, and then says "next year", and then "I mean it".`;
  }
  // klinik anak (jam tetap): hasil dari benih, nggak pernah bikin cemas; ringkasannya ke tangga profil (c.info.klinik_anak)
  function klinik(x, id) {
    const r = seed_rng(x.c.id, "anak", "klinik", id).random(), n = x.n;
    let teks, ringkas;
    if (id === "klinik_gigi_1") {
      const gaps = x.c.fired.gigi_copot ? 1 + (r < 0.5 ? 1 : 0) : 0, tambal = r > 0.75, warna = ["green", "orange", "purple"][Math.floor(r * 3)];
      ringkas = `${gaps ? `${gaps} gap${gaps > 1 ? "s" : ""}` : "no gaps yet"}, ${tambal ? "one tiny filling" : "no fillings"}`;
      teks = `Dentist check at Old Town General. ${gaps ? `${gaps === 1 ? "One gap" : "Two gaps"} counted and admired` : "One wobbly tooth, no gaps yet"}, ${tambal ? "and one tiny filling that takes four minutes and a lot of bravery" : "and nothing to fix"}. A sticker, and a new toothbrush in ${warna}.`;
    } else if (id === "klinik_mata") {
      const kacamata = r < 0.2, warna = ["red", "blue", "tortoiseshell"][Math.floor(r * 15) % 3];
      if (kacamata) { x.c.info.kacamata = { d: x.day, warna }; x.remember(`Glasses: the ${warna} frames. "Leaves have edges."`); }
      ringkas = kacamata ? `glasses, ${warna} frames` : "sharp eyes";
      teks = kacamata ? `Eye test at Old Town General. ${n} reads down to the fourth line and stops. Glasses, then: ${n} picks the ${warna} frames and spends the walk home pointing at trees. "The leaves have edges."`
        : `Eye test at Old Town General. ${n} reads the bottom line without squinting, then the poster on the wall, then the nurse's badge.`;
    } else {
      const k = 2 + Math.floor(r * 4), tambal = r > 0.85;
      ringkas = `${k} grown-up teeth, ${tambal ? "one more small filling" : "nothing to fix"}`;
      teks = `Second dentist check of the year. ${k} grown-up teeth through, ${tambal ? "and one more small filling" : "and nothing to fix"}. "See you in sixty days," says the dentist, as if that's soon.`;
    }
    (x.c.info.klinik_anak ||= {})[id] = { d: x.day, ringkas };
    return teks;
  }
  const CEK = (id, at, lbl, label, ic, tx, sub) => K(id, at, lbl, label, ic, x => klinik(x, id), { key: "cek", app: false, tx, sub });

  const KALENDER = [
    K("hari_pertama_sekolah", 60, "SCHOOL", "first day of school", "🏫", null, { soon: false }),   // storylet di storylets.js
    K("ulangan_1_diumumkan", 92, "QUIZ", "quiz announced", "📚", umumkan(95, 1), { soon: false, app: false, until: 95 }),
    K("ulangan_1", 95, "QUIZ", "first quiz of the year", "📚", null, { tx: (n, w) => `${n}'s first quiz of the year is ${w}.`, sub: "A fixed morning for every class in town. The marks depend on the study evenings, and on the day." }),
    CEK("klinik_gigi_1", 100, "DENTIST", "a dentist check", "🦷", (n, w) => `${n}'s dentist check is ${w}.`, "A fixed date at Old Town General. Expect a count, a sticker and a new toothbrush."),
    K("tanya_liburan", 116, "WEEK OFF", "where to for the week off", "🧳", tanyaLiburan, { soon: false, app: false }),
    K("rapor_1", 120, "REPORT CARD", "first report card", "📋", x => rapor(x, 1), { tx: (n, w) => `${n}'s first report card comes home ${w}.`, sub: "Three lines in the teacher's hand: marks, friends, and a note. None of it is written yet." }),
    K("libur_sekolah", 121, "WEEK OFF", "a week off school", "🏖️", x => { x.flag("libur", 7); x.need("mood", 5); return `School's out for a week. ${x.n} is up at six anyway, out of habit, and spends the morning deciding what to do with a whole free day.`; },
      { tx: (n, w) => `A week off school starts ${w} for ${n}.`, sub: "Seven days with no plan on the fridge." }),
    K("liburan_berangkat", 122, "WEEK OFF", "the week off begins", "🧳", x => { x.need("mood", 6); return LIBURAN.berangkat[liburanOf(x.c).id](x.n); }, { soon: false, app: false }),
    K("liburan_tengah", 125, "WEEK OFF", "the middle of the week off", "🧳", x => { x.need("mood", 4); return LIBURAN.tengah[liburanOf(x.c).id](x.n, x.t("penakut") > 55); }, { soon: false, app: false }),
    K("liburan_pulang", 127, "WEEK OFF", "home from the week off", "🏠", x => { const L = liburanOf(x.c); x.bond(2); x.need("mood", 4); x.remember(`A week off: ${TUJUAN[L.id]}.`); return LIBURAN.pulang[L.id](x.n); }, { soon: false, app: false }),
    CEK("klinik_mata", 130, "EYE TEST", "an eye test", "👓", (n, w) => `${n}'s eye test is ${w}.`, "A fixed date. One creature in five comes home with frames to choose; the rest read the nurse's badge."),
    K("izin_field_trip", 131, "FIELD TRIP", "the permission slip", "🚌", izinFieldTrip, { soon: false, app: false }),
    K("field_trip", 134, "FIELD TRIP", "the class trip to the lighthouse", "🚌", fieldTrip, { tx: (n, w) => `${n}'s class trip to the lighthouse is ${w}.`, sub: "The slip comes home three days before. Unanswered means signed; the bus leaves either way." }),
    K("lomba_kota", 142, "CITY CONTEST", "the city contest", "🏆", lombaKota, { tx: (n, w) => `The Old Town Young Talents contest is ${w}. ${n} is entered.`, sub: "Under-tens, in the town hall. Practice and lessons tilt it; nothing settles it." }),
    K("ulangan_2_diumumkan", 147, "QUIZ", "quiz announced", "📚", umumkan(150, 2), { soon: false, app: false, until: 150 }),
    K("ulangan_2", 150, "QUIZ", "second quiz", "📚", null, { tx: (n, w) => `${n}'s second quiz is ${w}.`, sub: "A fixed morning for every class in town. The marks depend on the study evenings, and on the day." }),
    CEK("klinik_gigi_2", 160, "DENTIST", "the second dentist check", "🦷", (n, w) => `${n}'s second dentist check is ${w}.`, "A fixed date at Old Town General. Grown-up teeth get counted this time."),
    K("pentas_sekolah", 165, "SCHOOL SHOW", "the school show", "🎭", pentas, { tx: (n, w) => `The school show is ${w}. ${n} has a part.`, sub: "The day is set; the applause isn't. Practice helps." }),
    K("rapor_2", 178, "REPORT CARD", "end-of-year report card", "📋", x => rapor(x, 2), { tx: (n, w) => `${n}'s end-of-year report card comes home ${w}.`, sub: "Three lines in the teacher's hand: marks, friends, and a note. None of it is written yet." }),
  ];
  const fixedDay = age => KALENDER.some(k => k.at === age);   // termasuk hari ulangan (storylet `ujian`) dan hari pertama

  // ---------------------------------------------------------------- 2. tonggak anak berjendela
  const T = (id, lo, hi, lbl, label, ic, run) => ({ id, lo, hi, lbl, label, ic, run, fixed: false });
  // tinggi: dari angka klinik umur 60 (tonggak.js), lalu ±0,35 cm sehari (anak 60–180 hari ~ umur 6–12 tahun) [angka umum]
  const tinggi = (c, age) => Tg.timbang(c, 60).cm + Math.round(Math.max(0, age - 60) * 0.35);
  const LIST = [
    T("gigi_copot", 62, 85, "WOBBLY TOOTH", "first tooth out", "🦷", x => {
      x.need("mood", 4); x.remember("First tooth out. Under the pillow it went.");
      return `${x.n}'s first wobbly tooth finally comes out, in an apple, at lunch. Under the pillow it goes. In the morning: one shiny coin, and a gap-toothed grin for the whole week.`;
    }),
    T("baca_sendiri", 70, 110, "READING", "first book read alone", "📖", x => {
      const done = (x.c.info.keinginan || {}).selesai || {};
      const book = done.bacaan != null || done.dongeng != null ? "the picture book you've read them a hundred times" : "a comic from the school library";
      x.c.info.buku_pertama = book; x.stat("kecerdasan", 2); x.remember(`Read ${book} alone, start to finish.`);
      return `${x.n} reads ${book} alone, start to finish, lips moving, one finger under every word. Then reads it again, out loud, to you.`;
    }),
    T("naik_sepeda", 75, 105, "BIKE", "first ride without stabilisers", "🚲", x => {
      const tet = x.c.info.tetangga && x.c.relations[x.c.info.tetangga];
      const bike = tet ? `the old bike ${tet.nama} from next door dug out of the shed` : "a bike with the stabilisers just taken off";
      x.stat("kesehatan", 2); x.trait("penakut", -1); x.remember("Rode a bike. Fell twice first.");
      return `${x.n} rides ${bike}, falls twice, cries once, and then goes, wobbling, all the way to the corner and back. ${x.attended ? "You ran alongside, one hand hovering." : "The whole street cheered."}`;
    }),
    T("berenang", 90, 130, "SWIMMING", "first swim", "🏊", x => {
      x.stat("kesehatan", 2); x.need("mood", 5); x.remember("First swim, at the Old Town pool.");
      return `First swim at the Old Town pool. ${x.t("penakut") > 55 ? `${x.n} holds the edge for half an hour, then lets go for three whole strokes.` : `${x.n} jumps in before anyone says go.`} Smells of chlorine all evening and doesn't mind one bit.`;
    }),
    T("nginep", 100, 150, "SLEEPOVER", "first sleepover", "🛏️", x => {
      const s = sahabatOf(x.c), where = s ? `at ${s.nama}'s` : "at a cousin's", k = x.c.info.kesayangan;
      if (s) x.with_npc(s.id, `${x.n} stayed the night.`);
      x.need("mood", 6); x.bond(2); x.remember(`First sleepover, ${where}.`);
      return `${x.n}'s first sleepover, ${where}.${k ? ` ${cap(k)} comes along, hidden at the bottom of the bag.` : ""} Nobody sleeps before midnight. ${x.attended ? "The house is very quiet without them." : "They come home full of stories."}`;
    }),
    T("uang_jajan", 110, 140, "POCKET MONEY", "first pocket money", "🪙", x => {
      x.c.info.uang_jajan = x.day; x.trait("ambisius", 0.5); x.remember("First pocket money: 5 coins a week.");
      return `${x.n}'s first pocket money: 5 coins a week, counted twice and kept in a jar with a label. The label says DO NOT TOUCH, in capitals.`;
    }),
    T("sekolah_sendiri", 130, 170, "WALKING ALONE", "first walk to school alone", "🎒", x => {
      x.trait("penakut", -2); x.need("mood", 3); x.bond(1); x.remember("Walked to school alone for the first time.");
      return x.t("penakut") > 55 ? `${x.n} walks to school alone for the first time, looking back at every corner. ${x.attended ? "You wave from the window at every corner." : "The neighbour waves from her step."} They make it.`
        : `${x.n} walks to school alone for the first time, bag bouncing, without looking back once. ${x.attended ? "You watch from the window until the corner." : "The neighbour waves them round the corner."}`;
    }),
    T("garis_pintu", 150, 178, "DOOR FRAME", "a line on the door frame", "📏", x => {
      const cm = tinggi(x.c, x.age);
      (x.c.info.garis ||= []).push({ d: x.day, cm }); x.remember(`A pencil line on the door frame: ${cm} cm.`);
      return `Measuring day. ${x.n} stands very straight against the door frame, heels in, chin up. A pencil line and a date: ${cm} cm. Next year's line goes above it.`;
    }),
  ];

  // ---------------------------------------------------------------- 3. sahabat
  const ORANG = [
    T("sahabat_kenal", 65, 90, "BEST FRIEND", "a best friend", "🧑‍🤝‍🧑", x => {
      const old = x.c.info.kenalan_bayi, rel = old && x.c.relations[old];
      let nid, nama;
      if (rel) { nid = old; nama = rel.nama; rel.tipe = "sahabat"; rel.skor = Math.max(rel.skor || 0, 60); }
      else { const [id, npc] = x.world.make_npc(x.c, x.day, "sahabat"); nid = id; nama = npc.nama; x.c.relations[nid] = { nama, tipe: "sahabat", skor: 60, sejak: x.day }; }
      x.c.info.sahabat = { jenis: "npc", id: nid, nama, sejak: x.day };
      x.with_npc(nid, `Best friends with ${x.n}, since today.`); x.need("mood", 6); x.bond(1); x.remember(`Best friends with ${nama}.`);
      return rel ? `${nama}, the baby from the park, turns out to be in ${x.n}'s class. By lunchtime they've swapped sandwiches, and by home time they're best friends.`
        : `${x.n} comes home talking about ${nama}, and only ${nama}: who sits next to them, who has the same lunchbox, who's coming over on Saturday. A best friend.`;
    }),
    T("sahabat_pindah", 140, 172, "MOVING AWAY", "a goodbye", "📦", x => {
      const s = sahabatOf(x.c), rel = x.c.relations[s.id];
      if (rel) rel.tipe = "sahabat_pindah";
      x.c.info.sahabat_lama = { ...s, pergi: x.day }; x.c.info.sahabat = null; delete x.c.info.ribut;
      x.with_npc(s.id, `Moved away. ${x.n} waved until the van turned the corner.`);
      x.need("mood", -8); x.remember(`${s.nama} moved away.`);
      return `${s.nama}'s family is moving to the city. ${x.n} helps carry boxes to the van and waves until it turns the corner, then doesn't say anything for the rest of the day.${x.attended ? " You leave the light on in the hall." : ""}`;
    }),
  ];
  const ALL = [...KALENDER, ...LIST, ...ORANG], BY_ID = Object.fromEntries(ALL.map(t => [t.id, t]));
  const sahabatBaru = c => 6 + Math.floor(seed_rng(c.id, "anak", "sahabat_baru").random() * 7);   // 6–12 hari sesudah yang lama pindah

  // hari (umur) kejadian ini buat makhluk ini: jam tetap = sama buat semua; jendela = dari benih, ditarik dari [lo, hi-2] supaya ada dua
  // hari buat ngalah ke hari jam tetap atau tonggak lain tanpa lewat dari jendelanya
  function dayOf(c, t) {
    if (typeof t === "string") t = BY_ID[t];
    if (!t) return null;
    if (t.fixed) return t.at;
    return t.lo + Math.floor(seed_rng(c.id, "anak", t.id).random() * Math.max(1, t.hi - t.lo - 1));
  }
  const mark = (x, id) => { x.c.fired[id] = 1; (x.c.info.tonggak ||= {})[id] = x.day; };
  // satu kejadian berjendela per hari (c.info.tg_hari, dipakai bareng tonggak.js), dan ngalah ke hari jam tetap selama jendelanya masih ada
  const free = x => x.c.info.tg_hari !== x.day && !fixedDay(x.age);

  // jam tetap: tepat di harinya. Save lama yang kelewat: menyusul satu per hari (c.info.sk_hari); pengumuman yang basi gugur (until).
  for (const k of KALENDER) if (k.run) FORCED.push({ id: k.id,
    cond: x => x.phase === "anak" && !x.c.fired[k.id] && x.age >= k.at && (k.until == null || x.age < k.until) && (x.age === k.at || x.c.info.sk_hari !== x.day),
    run: x => { mark(x, k.id); x.c.info.sk_hari = x.day; return k.run(x); } });
  // berjendela: urut jendela yang paling cepat habis, di hari terakhir jendela tetap jalan
  for (const t of [...LIST].sort((a, b) => a.hi - b.hi)) FORCED.push({ id: t.id,
    cond: x => x.phase === "anak" && !x.c.fired[t.id] && x.age >= dayOf(x.c, t) && (x.age >= t.hi || free(x)),
    run: x => { mark(x, t.id); x.c.info.tg_hari = x.day; return t.run(x); } });
  // sahabat: kenal cuma kalau slotnya kosong; pindah cuma NPC (teman pemain nggak pernah "dipindahin" sama mesin)
  const [KENAL, PINDAH] = ORANG;
  FORCED.push({ id: KENAL.id,
    cond: x => x.phase === "anak" && !x.c.fired[KENAL.id] && !sahabatOf(x.c) && x.age >= dayOf(x.c, KENAL) && (x.age >= KENAL.hi || free(x)),
    run: x => { mark(x, KENAL.id); x.c.info.tg_hari = x.day; return KENAL.run(x); } });
  FORCED.push({ id: PINDAH.id,
    cond: x => x.phase === "anak" && !x.c.fired[PINDAH.id] && !!sahabatOf(x.c) && sahabatOf(x.c).jenis === "npc" && x.age >= dayOf(x.c, PINDAH) && (x.age >= PINDAH.hi || free(x)),
    run: x => { mark(x, PINDAH.id); x.c.info.tg_hari = x.day; return PINDAH.run(x); } });
  FORCED.push({ id: "sahabat_baru",
    cond: x => (x.phase === "anak" || x.phase === "remaja") && !x.c.fired.sahabat_baru && !sahabatOf(x.c) && !!x.c.info.sahabat_lama
      && x.day >= x.c.info.sahabat_lama.pergi + sahabatBaru(x.c) && (free(x) || x.day >= x.c.info.sahabat_lama.pergi + sahabatBaru(x.c) + 4),
    run: x => {
      mark(x, "sahabat_baru"); x.c.info.tg_hari = x.day;
      const [nid, npc] = x.world.make_npc(x.c, x.day, "sahabat");
      x.c.relations[nid] = { nama: npc.nama, tipe: "sahabat", skor: 55, sejak: x.day };
      x.c.info.sahabat = { jenis: "npc", id: nid, nama: npc.nama, sejak: x.day };
      x.with_npc(nid, `New in class. Sat next to ${x.n}.`); x.need("mood", 6); x.remember(`A new best friend: ${npc.nama}.`);
      return `Someone new in class: ${npc.nama}, who gets the empty seat next to ${x.n}. By Friday the seat isn't empty at all. ${x.c.info.sahabat_lama.nama} still gets a letter, sometimes.`;
    } });
  // berantem lalu baikan: storylet biasa (director), tiga hari kemudian baikan lewat mesin. Nggak ada dilema: anak-anak nyelesain sendiri.
  storylet("ribut_sahabat", ["anak"], "sedang", { cooldown: 60, cond: x => !!sahabatOf(x.c) && x.age >= 95 && x.day - sahabatOf(x.c).sejak >= 10 && !x.c.info.ribut && !x.has("libur"), weight: x => 0.6 + x.t("impulsif") / 100 }, x => {
    const s = sahabatOf(x.c), why = x.pick(["who got to be the dragon", "a broken pencil case", "a secret that wasn't kept", "the last seat on the bus"]);
    x.c.info.ribut = { d: x.day, why }; x.need("mood", -6);
    x.say(`${x.n} and ${s.nama} aren't speaking. Over ${why}. ${x.n} eats dinner in silence and says it doesn't matter. It matters.`);
    x.remember(`Fell out with ${s.nama} over ${why}.`);
  });
  FORCED.push({ id: "baikan_sahabat", cond: x => !!x.c.info.ribut && !!sahabatOf(x.c) && x.day >= x.c.info.ribut.d + 3,
    run: x => {
      const s = sahabatOf(x.c), why = x.c.info.ribut.why, rel = x.c.relations[s.id];
      delete x.c.info.ribut; x.need("mood", 8); x.bond(1);
      if (rel) rel.skor = Math.min(100, (rel.skor || 50) + 5);
      x.with_npc(s.id, `Made up with ${x.n}.`); x.remember(`Made up with ${s.nama}. Three days was enough.`);
      return x.t("ramah") >= 50 ? `${x.n} walks up to ${s.nama} at the gate and says sorry first, about ${why}. ${s.nama} was coming over to say the same. Three days: that's how long it lasts at this age.`
        : `${s.nama} leaves a folded note in ${x.n}'s desk: "still friends?" ${x.n} writes "yes" and underlines it twice. Three days: that's how long it lasts at this age.`;
    } });
  // ritme Sabtu: hari 0 = Minggu 11 Okt 2026, jadi Sabtu = day % 7 === 6. Kecil, nggak masuk diary; cukup kerasa di baris cerita.
  storylet("sabtu_sahabat", ["anak"], "kecil", { cooldown: 6, cond: x => !!sahabatOf(x.c) && x.day % 7 === 6 && !x.c.info.ribut && !x.has("libur"), weight: () => 2.5 }, x => {
    const s = sahabatOf(x.c);
    x.say(x.pick([`Saturday at ${s.nama}'s. ${x.n} comes home with grass stains and a plan for next Saturday.`,
      `${s.nama} comes over for the day. The living room becomes a fort, then a ship, then a fort again.`,
      `${x.n} and ${s.nama} spend the whole Saturday on one puzzle and finish it at dusk, triumphant.`,
      `Saturday: ${x.n} and ${s.nama} at the park until the lights come on. Twenty more minutes, pleaded for, granted.`]));
    x.need("mood", 4); x.trait("ramah", 0.3); x.with_npc(s.id, `Saturday with ${x.n}.`);
  });

  // ---------------------------------------------------------------- untuk UI
  // Tangga: delapan tonggak anak dengan status (bentuk sama dengan Tonggak.view). at = umur saat terjadi, -1 = terjadi tanpa tanggal, null = belum
  const KLINIK = KALENDER.filter(k => k.key === "cek");
  function view(c, day) {
    const age = c.age(day), done = c.info.tonggak || {};
    const row = (t, lo, hi, fixed) => { const at = done[t.id] != null ? done[t.id] - c.born : (c.fired[t.id] ? -1 : null); return { id: t.id, label: t.label, lbl: t.lbl, ic: t.ic, lo, hi, fixed, done: at != null, at, open: at == null && age >= lo }; };
    return LIST.map(t => row(t, t.lo, t.hi, false)).concat(KLINIK.map(k => row(k, k.at, k.at, true))).sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  }
  // Kalender sekolah buat app School dan kalender HP: hari absolut, status, nilai (buat ulangan). Penanda (run null) selesai kalau modul
  // lainnya sudah mencatat: hari pertama lewat storylet, ulangan lewat c.info.nilai.
  const HASIL = (c, id) => {
    const P = c.info.pentas, L = c.info.lomba_kota, F = c.info.field_trip;
    if (id === "pentas_sekolah" && P) return { bagus: "the loudest clap", biasa: "fine, mostly", grogi: "froze; next year" }[P.hasil] || "";
    if (id === "lomba_kota" && L) return { menang: "first, under-tens", kedua: "second", kalah: "first round" }[L.hasil] || "";
    if (id === "field_trip" && F) return F.ikut ? "sand in every pocket" : "stayed behind";
    return "";
  };
  function calendar(c, day) {
    const N = c.info.nilai || {}, R = c.info.rapor || [];
    return KALENDER.filter(k => k.app).map(k => {
      const d = c.born + k.at, done = k.run ? !!c.fired[k.id] : k.id === "hari_pertama_sekolah" ? !!c.fired[k.id] || c.age(day) > 60 : !!N[k.id];
      return { id: k.id, day: d, lbl: k.lbl, label: k.label, ic: k.ic, done, past: d < day, nilai: N[k.id] || null, rapor: R.find(r => r.kal === k.id) || null, hasil: done ? HASIL(c, k.id) : "" };
    });
  }
  // Buat baris Soon: tonggak berjendela berikutnya, bakat kalau belum ketahuan (jendela Storylets.bakatDay), tanggal sekolah berikutnya;
  // ulangan yang sudah diumumkan nggak dobel (soon.js sudah punya baris ujian dari c.info.ujian). Hanya selama anak.
  function upcoming(c, day) {
    const age = c.age(day);
    if (phase_of(age) !== "anak") return [];
    const out = [], u = c.info.ujian;
    const rng = LIST.find(t => !c.fired[t.id]);
    if (rng) out.push({ cid: c.id, id: rng.id, lbl: rng.lbl, label: rng.label, ic: rng.ic, lo: c.born + rng.lo, hi: c.born + rng.hi, fixed: false });
    if (!c.info.bakat && !c.fired.bakat_ketahuan && age < 110) out.push({ cid: c.id, id: "bakat", lbl: "TALENT", label: "talent", ic: "✨", lo: c.born + 85, hi: c.born + 110, fixed: false });
    const fix = KALENDER.find(k => k.soon && c.born + k.at > day && !(u && k.id === u.kal));
    if (fix) out.push({ cid: c.id, id: fix.id, lbl: fix.lbl, label: fix.label, ic: fix.ic, lo: c.born + fix.at, hi: c.born + fix.at, fixed: true, key: fix.key || "sekolah", tx: fix.tx, sub: fix.sub });
    return out;
  }
  const next = (c, day) => view(c, day).find(v => !v.done) || null;

  const API = { KALENDER, LIST, ORANG, GRADE, SEKOLAH, TUJUAN, dayOf, tinggi, view, calendar, upcoming, next, sahabatOf, sekolahOf, liburanOf };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Anak = API;
})();

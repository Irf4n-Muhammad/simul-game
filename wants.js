// Minggu pertama dan keinginan (v43). Dua hal yang jalan di mesin, bukan di UI, supaya ikut replay:
//  1. Pintu: fitur muncul lewat cerita, satu per hari di minggu pertama (dadu, rencana, kota, Chirp, bintang, majalah, lalu Burrow dan Bazaar
//     saat sudah cukup umur). Ceritanya storylet FORCED di umur tertentu, dan UI membaca `doors()` untuk tahu mana yang sudah terbuka.
//  2. Keinginan: makhluk minta sesuatu (1–2 aktif), pemain yang memutuskan mau menuruti atau tidak. Tidak ada panah, daftar centang, timer,
//     uang, atau bintang. Hadiahnya ikatan, mood, ingatan, dan foto untuk yang besar. Keinginan kedaluwarsa diam-diam.
// Rancangan: riset/minggu-pertama-dan-keinginan.md
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const S = (typeof module !== "undefined") ? require("./storylets.js") : globalThis.Storylets;
  const { HOOKS, FORCED, seed_rng } = E;
  const VENT = () => { try { return (typeof module !== "undefined") ? require("./venture.js") : globalThis.Venture; } catch (e) { return null; } };

  // ---------------------------------------------------------------- pintu
  // id dipakai UI (tombol/app yang disembunyikan), story = id event di catatan hari, hari = umur makhluk pertama saat pintunya terbuka
  const DOORS = [
    { id: "dadu", story: "pintu_dadu", hari: 1, label: "the die" },
    { id: "plan", story: "pintu_rencana", hari: 2, label: "the daily plan" },
    { id: "town", story: "pintu_kota", hari: 4, label: "the town" },
    { id: "chirp", story: "pintu_chirp", hari: 7, label: "Chirp" },
    { id: "stars", story: "pintu_bintang", hari: 10, label: "the Stars" },
    { id: "mag", story: "pintu_majalah", hari: 30, label: "the Magazine" },
    { id: "burrow", story: "pintu_burrow", hari: 180, label: "Burrow" },
    { id: "bazaar", story: "pintu_bazaar", hari: 200, label: "the Bazaar" },
  ];
  const STORY = {
    pintu_dadu: n => `A tiny wooden die rolls out from under the crib. ${n} stares at it like it's magic.`,
    pintu_rencana: n => `${n} wakes up early and looks at you, waiting. Their days are yours to shape, a little.`,
    pintu_kota: n => `${n} presses their nose against the window. There's a whole town out there.`,
    pintu_chirp: n => `The family tablet buzzes. Somebody in town set ${n} up with a Chirp feed.`,
    pintu_bintang: n => `${n} did something today that surprised everyone. Talents are starting to show, one star at a time.`,
    pintu_majalah: n => `The first issue of the Old Town magazine lands on the doormat. ${n} chews the corner.`,
    pintu_burrow: n => `${n} is old enough for a phone of their own. Burrow, where the town's jobs live, already wants a profile.`,
    pintu_bazaar: n => `${n} walks past the Bazaar and comes home with a wish list.`,
  };
  // Cerita pintu hanya untuk makhluk pertama di rumah (telur awal). Tidak pakai rng, jadi urutan cerita lain hari itu tidak bergeser.
  for (const D of DOORS) FORCED.push({ id: D.story,
    cond: x => x.age === D.hari && x.home.members[0] === x.c && !x.c.fired[D.story],
    run: x => { x.c.fired[D.story] = 1; return STORY[D.story](x.n); } });
  const ALL_OPEN = Object.fromEntries(DOORS.map(D => [D.id, true]).concat([["wallet", true]]));
  // Mana yang sudah terbuka. Save lama atau makhluk pertama sudah lewat 60 hari: semua terbuka. Jaring pengaman: 3 hari setelah harinya.
  function doors(home, day, all) {
    const c0 = home && home.members[0];
    if (all || !c0) return ALL_OPEN;
    const age = c0.age(day);
    if (age >= 60) return ALL_OPEN;
    const out = {};
    for (const D of DOORS) out[D.id] = age >= D.hari + 3 || !!c0.fired[D.story];
    out.wallet = out.burrow;
    return out;
  }
  const doorOf = eventId => DOORS.find(D => D.story === eventId) || null;
  const doorLabel = id => (DOORS.find(D => D.id === id) || {}).label || id;

  // ---------------------------------------------------------------- keinginan
  // Satu entri: fase, label (yang dilihat pemain), ikon gelembung, bobot pilih, syarat muncul, kemajuan harian (prog) atau ukuran (measure),
  // n hari yang dibutuhkan, besar = hadiah lebih dan foto, say = kalimat saat muncul, ok = kalimat saat tercapai.
  const agendaIs = (c, day, ...ids) => { const a = c.info.agenda_hari; return !!a && a.hari === day && ids.includes(a.id); };
  const fired = (c, ...ids) => ids.reduce((s, id) => s + (c.fired[id] || 0), 0);
  const firedToday = (out, ...ids) => !!out && (out.events || []).some(e => ids.includes(e));
  const kidsHere = (c, day, home) => S.kids_here({ home, c, day }).filter(k => k.age(day) < 270);
  const grandkidsHere = (c, day, home) => S.grandkids_here({ home, c, day });
  const festivalNow = (home, day) => E.world_active(home.world, day).find(e => e.jenis === "festival") || null;
  const t = (c, k) => c.traits[k] ?? 50;
  const W = (id, phases, label, ic, o) => Object.assign({ id, phases, label, ic, w: () => 1, cond: () => true, n: 1, ulang: 90 }, o);

  const CATALOG = [
    // bayi: hal kecil, cepat tercapai. Mengajari bahwa dia punya kemauan sendiri.
    W("dongeng", ["bayi"], "a storybook", "📖", { w: c => 1 + t(c, "kreatif") / 100,
      prog: (c, A, day) => agendaIs(c, day, "dongeng"),
      say: n => `${n} keeps patting the picture book.`, ok: n => `${n} squeals at every single page.` }),
    W("peluk", ["bayi", "anak"], "a cuddle", "🤗", { w: c => 1 + t(c, "setia") / 80,
      prog: (c, A) => !!A.peluk || A["rawat:tidur"] === "cuddle",
      say: n => `${n} holds up both arms. A cuddle, please.`, ok: n => `${n} melts into the cuddle.` }),
    W("jalan", ["bayi"], "a stroll outside", "🌳", { w: c => 1 + (100 - t(c, "penakut")) / 100,
      prog: (c, A, day) => agendaIs(c, day, "jalan"),
      say: n => `${n} keeps crawling toward the front door.`, ok: n => `${n} points at every bird on the stroll.` }),
    W("suara", ["bayi"], "to hear your voice", "💬", { n: 3,
      prog: (c, A) => !!A.ngobrol,
      say: n => `${n} babbles at you and waits for an answer.`, ok: n => `${n} knows your voice now.` }),
    W("mandi", ["bayi"], "bubbles in the bath", "🫧", { n: 2,
      prog: (c, A) => !!A["rawat:mandi"],
      say: n => `${n} splashes the water bowl. Bath time?`, ok: n => `${n} laughs at every bubble.` }),
    W("tidur_siang", ["bayi"], "a long nap", "💤", {
      prog: (c, A, day) => agendaIs(c, day, "tidur_siang") || !!A["rawat:tidur"],
      say: n => `${n} yawns and rubs their eyes.`, ok: n => `${n} sleeps like a stone.` }),
    // anak: teman, latihan, sedikit kebebasan
    W("teman", ["anak"], "a friend", "🧸", { n: 2, besar: true, w: c => 1 + t(c, "ramah") / 60,
      prog: (c, A, day, home, out) => agendaIs(c, day, "teman") || firedToday(out, "teman_baru"),
      say: n => `${n} watches the neighbour kids from the window.`, ok: n => `${n} came home with a friend's name to tell you.` }),
    W("latihan", ["anak"], "to practice", "🎵", { n: 3, w: c => 1 + t(c, "kreatif") / 60,
      prog: (c, A, day) => agendaIs(c, day, "latihan"),
      say: n => `${n} keeps humming the same tune. They want to practice.`, ok: n => `${n} finally got it right, and did a little bow.` }),
    W("bebas", ["anak", "remaja"], "a free day", "🪁", { w: c => 1 + t(c, "impulsif") / 60,
      prog: (c, A, day) => agendaIs(c, day, "bebas"),
      say: n => `${n} asks for one day with no plans at all.`, ok: n => `${n} did absolutely nothing, happily.` }),
    W("bantu_rumah", ["anak"], "to help at home", "🧹", { n: 2, w: c => 1 + t(c, "patuh") / 80,
      prog: (c, A, day) => agendaIs(c, day, "bantu_rumah"),
      say: n => `${n} follows you around with a tiny broom.`, ok: n => `${n} folded the laundry. Sort of.` }),
    W("olahraga", ["anak", "remaja"], "to run around", "⚽", { n: 2,
      prog: (c, A, day) => agendaIs(c, day, "olahraga"),
      say: n => `${n} is bouncing off the walls.`, ok: n => `${n} ran until the sun went down.` }),
    W("tenang", ["anak", "remaja"], "a week with no plan", "🌤️", { n: 5, ulang: 120, w: c => 0.6 + (60 - t(c, "patuh")) / 100,
      cond: c => !!c.info.rencana,
      prog: c => !c.info.rencana,
      say: n => `${n} sighs at the plan on the fridge.`, ok: n => `${n} got a week to breathe and came out fine.` }),
    W("bacaan", ["anak"], "a bedtime story", "🌙", { n: 2,
      prog: (c, A) => A["rawat:tidur"] === "story",
      say: n => `${n} drags a book to bed every night.`, ok: n => `${n} fell asleep mid-chapter.` }),
    W("belajar_bareng", ["anak", "remaja"], "to study together", "✏️", { ulang: 30,
      cond: (c, day) => !!c.info.ujian && day < c.info.ujian.hari && c.info.ujian.belajar < 3,
      prog: (c, A) => !!A.belajar,
      say: n => `${n} has a test coming up and keeps glancing at you.`, ok: n => `${n} feels ready for the test now.` }),
    // remaja: uang sendiri, hobi, hati
    W("uang", ["remaja"], "pocket money of their own", "🪙", { ulang: 120, w: c => 1 + t(c, "ambisius") / 80,
      cond: c => !!c.st, measure: c => c.st ? c.st.wallet : 0, delta: 100,
      say: n => `${n} is saving up for something. Won't say what.`, ok: n => `${n} counted the coins twice. Enough.` }),
    W("hobi", ["remaja"], "a hobby of their own", "🎨", { n: 3, w: c => 1 + t(c, "kreatif") / 60,
      prog: (c, A, day, home, out) => agendaIs(c, day, "latihan") || firedToday(out, "hobi_baru", "bakat_ketahuan"),
      say: n => `${n} keeps doodling in the margins of everything.`, ok: n => `${n} found a thing that's theirs.` }),
    W("cinta", ["remaja"], "someone to like them back", "💌", { besar: true, ulang: 150, w: c => 1 + t(c, "ramah") / 80,
      measure: c => fired(c, "jadian_remaja", "cinta_monyet"), delta: 1,
      say: n => `${n} keeps checking the tablet. Someone's on their mind.`, ok: n => `${n} came home grinning and won't say why.` }),
    W("sendiri", ["remaja"], "to run their own week", "🎧", { n: 5, ulang: 120, w: c => 0.6 + t(c, "impulsif") / 100,
      cond: c => !!c.info.rencana,
      prog: c => !c.info.rencana,
      say: n => `${n} wants to run their own week for once.`, ok: n => `${n} ran their own week. Nothing caught fire.` }),
    W("kerja_sambilan", ["remaja"], "a part-time job", "☕", { n: 2, w: c => 1 + t(c, "ambisius") / 80,
      prog: (c, A, day, home, out) => agendaIs(c, day, "kerja_sambilan") || !!A.lamar || !!A.apply || firedToday(out, "kerja_sambilan"),
      say: n => `${n} eyes the help-wanted sign at the café.`, ok: n => `${n} earned their first money and showed everyone.` }),
    W("teman_remaja", ["remaja"], "a crew to hang out with", "🛹", { n: 3, w: c => 1 + t(c, "ramah") / 60,
      prog: (c, A, day) => agendaIs(c, day, "teman"),
      say: n => `${n} wants a crew.`, ok: n => `${n} has a crew now. The kitchen is never quiet.` }),
    // dewasa: hal besar yang sudah ada di permainan (rumah, hewan, usaha, maraton, festival) dan hari-hari kecil
    W("rumah", ["dewasa"], "a place of their own", "🏡", { besar: true, ulang: 400, w: c => 1 + t(c, "ambisius") / 100,
      cond: c => !c.info.punya_rumah && ((!!c.st && c.st.wallet >= 12000) || c.stats.uang > 200),
      measure: c => fired(c, "pindah_rumah") + (c.info.punya_rumah ? 1 : 0) + ((c.info.keinginan || {}).beli_rumah || 0), delta: 1,
      say: n => `${n} keeps browsing Homes late at night.`, ok: n => `${n} has keys of their own.` }),
    W("pet", ["dewasa"], "a pet", "🐾", { besar: true, ulang: 400, w: c => 1 + t(c, "ramah") / 100,
      cond: c => !!c.st && !c.st.pet, measure: c => c.st && c.st.pet ? 1 : 0, delta: 1,
      say: n => `${n} stops to greet every dog in the park.`, ok: n => `${n} came home with a new family member.` }),
    W("toko", ["dewasa"], "a shop with their name on it", "🏪", { besar: true, ulang: 400, w: c => 0.6 + t(c, "ambisius") / 60,
      cond: (c, day, home) => !!c.st && (c.st.newIdeas || []).length > 0 && !hasBiz(c, home),
      measure: (c, home) => hasBiz(c, home) ? 1 : 0, delta: 1,
      say: n => `${n} sketches a shop sign on a napkin.`, ok: n => `${n} opened the doors. Their own doors.` }),
    W("maraton", ["dewasa", "tua"], "to finish the marathon", "🏃", { besar: true, ulang: 400,
      cond: c => !!c.info.maraton, measure: c => fired(c, "maraton_hari_h"), delta: 1,
      say: n => `${n} laces up every morning now.`, ok: n => `${n} crossed the line.` }),
    W("festival", ["anak", "remaja", "dewasa", "tua"], "to go to the festival", "🎪", { ulang: 20,
      cond: (c, day, home) => !!festivalNow(home, day), label2: (c, day, home) => { const f = festivalNow(home, day); return f ? `to go to ${f.nama}` : "to go to the festival"; },
      prog: (c, A, day, home, out, x) => !!festivalNow(home, day) && !!(x && x.attended),
      say: (n, c, day, home) => { const f = festivalNow(home, day); return `${n} wants to go to ${f ? f.nama : "the festival"}. With you.`; },
      ok: n => `${n} came home from the festival with a sunburn and a grin.` }),
    W("santai", ["dewasa"], "a day off", "🛋️", { w: c => 1 + (100 - t(c, "rajin")) / 100,
      cond: c => !!c.info.kerja || !!(c.st && c.st.job),
      prog: (c, A, day) => agendaIs(c, day, "istirahat") || !!A["kerja:rest"],
      say: n => `${n} is running on fumes. A day off would do.`, ok: n => `${n} slept in till noon and regrets nothing.` }),
    W("teman_dewasa", ["dewasa"], "an evening with friends", "🍻", { n: 2, w: c => 1 + t(c, "ramah") / 80,
      prog: (c, A, day) => agendaIs(c, day, "sosial"),
      say: n => `${n} hasn't seen their friends in ages.`, ok: n => `${n} laughed all evening.` }),
    W("hobi_dewasa", ["dewasa"], "time for the hobby", "🎸", { n: 2, w: c => 1 + t(c, "kreatif") / 80,
      prog: (c, A, day) => agendaIs(c, day, "hobi"),
      say: n => `${n} keeps looking at the dusty hobby corner.`, ok: n => `${n} lost a whole day to the hobby. Worth it.` }),
    W("keluarga", ["dewasa"], "a day with the kids", "🧒", { w: () => 1.4,
      cond: (c, day, home) => kidsHere(c, day, home).length > 0,
      prog: (c, A, day) => agendaIs(c, day, "keluarga"),
      say: n => `${n} wants one whole day with the kids.`, ok: n => `${n} and the kids built a fort in the living room.` }),
    W("pasangan", ["dewasa"], "a night out together", "🕯️", { w: c => 1 + t(c, "setia") / 80,
      cond: c => !!c.partner(), label2: c => { const p = c.partner(); return p ? `a night out with ${p.nama}` : "a night out together"; },
      prog: (c, A, day) => agendaIs(c, day, "pasangan"),
      say: (n, c) => { const p = c.partner(); return `${n} wants a night out with ${p ? p.nama : "their partner"}.`; }, ok: n => `${n} stayed out late and came home humming.` }),
    // tua: cerita, cucu, resep, jalan pagi
    W("memoar", ["tua"], "to write it all down", "📜", { besar: true, ulang: 400,
      cond: c => c.memory.length >= 6 && !fired(c, "tulis_memoar"), measure: c => fired(c, "tulis_memoar"), delta: 1,
      say: n => `${n} has stories nobody has heard yet.`, ok: n => `${n} started writing it all down.` }),
    W("cucu", ["tua"], "the grandkids over", "🍪", { n: 2, besar: true,
      cond: (c, day, home) => grandkidsHere(c, day, home).length > 0,
      prog: (c, A, day) => agendaIs(c, day, "cucu"),
      say: n => `${n} keeps baking too many cookies.`, ok: n => `${n}'s house was loud all afternoon. Perfect.` }),
    W("resep", ["tua"], "to pass down the recipe", "🥘", { ulang: 400,
      cond: (c, day, home) => kidsHere(c, day, home).length + grandkidsHere(c, day, home).length > 0 || S.kids_here({ home, c, day }).length > 0,
      measure: c => fired(c, "warisan_resep"), delta: 1,
      say: n => `${n} wants to teach someone the family recipe.`, ok: n => `${n} wrote the recipe in the back of the book.` }),
    W("jalan_pagi", ["tua"], "morning walks", "🌅", { n: 3,
      prog: (c, A, day) => agendaIs(c, day, "jalan_pagi"),
      say: n => `${n} misses the morning air.`, ok: n => `${n} knows every dog on the morning route now.` }),
    W("cerita", ["tua"], "someone to listen", "🫖", { n: 4,
      prog: (c, A) => !!A.ngobrol,
      say: n => `${n} has a story to tell, if you have the time.`, ok: n => `${n} told the whole story. Twice.` }),
  ];
  const BY_ID = Object.fromEntries(CATALOG.map(w => [w.id, w]));
  function hasBiz(c, home) { const V = VENT(); try { return !!(V && V.ownerBiz && V.ownerBiz(home, c.id)); } catch (e) { return false; } }

  const stateOf = c => (c.info.keinginan ||= { aktif: [], terakhir: -99, selesai: {}, riwayat: [] });
  const labelOf = (w, c, day, home) => w.label2 ? w.label2(c, day, home) : w.label;
  function note(K, day, id, apa) { K.riwayat.push([day, id, apa]); if (K.riwayat.length > 30) K.riwayat.splice(0, K.riwayat.length - 30); }

  // apakah keinginan ini boleh muncul sekarang
  function eligible(w, c, day, home, K) {
    const ph = E.phase_of(c.age(day));
    if (!w.phases.includes(ph)) return false;
    if (K.aktif.some(a => a.id === w.id)) return false;
    const last = K.selesai[w.id];
    if (last != null && day - last < w.ulang) return false;
    try { return !!w.cond(c, day, home); } catch (e) { return false; }
  }

  // catat kemajuan hari ini; A = tindakan pemain hari ini ({} saat pagi). Return daftar yang tercapai.
  function tick(c, day, home, A, out, x) {
    const K = stateOf(c), done = [];
    for (const a of K.aktif) {
      const w = BY_ID[a.id]; if (!w) continue;
      let ok = false;
      if (w.measure) { let v = 0; try { v = w.measure(c, home, day); } catch (e) {} ok = v >= a.base + (w.delta || 1); }
      else {
        let p = false; try { p = !!w.prog(c, A, day, home, out, x); } catch (e) {}
        if (p && a.last !== day) { a.hit += 1; a.last = day; }
        ok = a.hit >= (w.n || 1);
      }
      if (ok) done.push(a);
    }
    return done;
  }

  function fulfil(x, a, out) {
    const c = x.c, K = stateOf(c), w = BY_ID[a.id], day = x.day;
    K.aktif = K.aktif.filter(b => b !== a);
    K.selesai[a.id] = day;
    note(K, day, a.id, "tercapai");
    const label = labelOf(w, c, day, x.home);
    x.drama = "sedang";
    x.remember(`Wanted ${label}. Got it.`);
    x.bond(w.besar ? 4 : 2);
    x.need("mood", w.besar ? 10 : 6);
    const n0 = x.log.length, ev = w.besar ? "keinginan_besar" : "keinginan_tercapai";
    x.say(w.ok(x.n, c, day, x.home));
    out.events.push(ev); out.dramas.push("sedang");
    if (out.lineAt) out.lineAt[ev] = x.log[n0];
  }

  // Pagi: kedaluwarsa, kemajuan dari agenda hari ini, lalu mungkin keinginan baru. Dipanggil engine sesudah HOOKS.status.
  function daily(x, out) {
    const c = x.c, day = x.day, home = x.home, K = stateOf(c);
    // kedaluwarsa diam-diam: yang impulsif cepat lupa
    const ttl = (c.traits.impulsif ?? 50) > 60 ? 10 : 18;
    for (const a of K.aktif.slice()) {
      if (day - a.sejak < ttl) continue;
      K.aktif = K.aktif.filter(b => b !== a);
      const ul = (BY_ID[a.id] || {}).ulang || 90;
      K.selesai[a.id] = day - ul + Math.max(30, Math.round(ul / 3));  // boleh muncul lagi: 30 hari (biasa) sampai 130 hari (yang besar)
      note(K, day, a.id, "lewat");
      x.say(`${x.n} has stopped talking about ${labelOf(BY_ID[a.id] || { label: a.id }, c, day, home)}.`);
      out.events.push("keinginan_lewat");
    }
    for (const a of tick(c, day, home, {}, out, x)) fulfil(x, a, out);
    // keinginan baru: satu di dua minggu pertama, lalu paling banyak dua, dengan jeda
    const age = c.age(day), cap = age < 14 ? 1 : 2, gap = age < 14 ? 2 : 4;
    if (age < 1 || K.aktif.length >= cap || day - K.terakhir < gap) return;
    const rng = seed_rng(c.id, day, "keinginan");
    if (rng.random() > 0.6) return;
    const pool = CATALOG.filter(w => eligible(w, c, day, home, K));
    if (!pool.length) return;
    const w = rng.choices(pool, pool.map(w => Math.max(0.05, w.w(c))))[0];
    const a = { id: w.id, sejak: day, hit: 0, last: -1, base: 0 };
    if (w.measure) { try { a.base = w.measure(c, home, day); } catch (e) {} }
    K.aktif.push(a); K.terakhir = day;
    note(K, day, w.id, "muncul");
    x.say(w.say(x.n, c, day, home));
    out.events.push("keinginan_baru");
    if (out.lineAt) out.lineAt.keinginan_baru = x.log[x.log.length - 1];
  }
  HOOKS.keinginan = daily;

  // Sesudah tindakan pemain (dipanggil game.js, juga saat replay): catat jenisnya, cek keinginan yang tercapai karenanya.
  function afterAct(game, c, kind, day) {
    const R = c.info.aksi && c.info.aksi.d === day ? c.info.aksi : (c.info.aksi = { d: day, k: {} });
    const parts = kind.split(":");
    if (parts[0] === "rawat") R.k["rawat:" + parts[1]] = parts[2] || 1;
    else if (parts[0] === "rencana") R.k.rencana = parts[1] || "";
    else if (parts[0] === "kerja" && parts[1] === "rest") R.k["kerja:rest"] = 1;
    else R.k[parts[0]] = (R.k[parts[0]] || 0) + 1;
    if (parts[0] === "beli" && ["flat", "house", "villa", "mansion"].includes((parts[1] || "").split("@")[0])) { const K0 = stateOf(c); K0.beli_rumah = (K0.beli_rumah || 0) + 1; }
    const K = c.info.keinginan;
    if (!K || !K.aktif.length) return;
    const x = new E.Ctx(c, day, seed_rng("keinginan", c.id, day), game.home, true);
    const out = { events: [], dramas: [], lineAt: {} };
    for (const a of tick(c, day, game.home, R.k, out, x)) fulfil(x, a, out);
    if (!out.events.length) return;
    (game._sink || (game.noon_logs ||= [])).push(E.make_log(c, day, x, x.phase, true, x.log, out.dramas, out.events, [], [], out.lineAt));
  }

  // ---------------------------------------------------------------- untuk UI
  function active(c, day, home) {
    const K = c.info.keinginan; if (!K) return [];
    return K.aktif.map(a => { const w = BY_ID[a.id] || { label: a.id, ic: "✨", n: 1 };
      return { id: a.id, label: labelOf(w, c, day, home), ic: w.ic, sejak: a.sejak, days: day - a.sejak, hit: a.hit, n: w.measure ? 1 : (w.n || 1), besar: !!w.besar }; });
  }
  const doneCount = c => Object.keys((c.info.keinginan || {}).selesai || {}).length;
  const recent = (c, day) => ((c.info.keinginan || {}).riwayat || []).filter(r => r[0] === day);
  const labelFor = (id, c, day, home) => labelOf(BY_ID[id] || { label: id }, c, day, home);

  const API = { DOORS, STORY, CATALOG, doors, doorOf, doorLabel, active, doneCount, recent, labelFor, afterAct, daily, tick };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Wants = API;
})();

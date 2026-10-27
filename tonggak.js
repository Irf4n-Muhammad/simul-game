// tonggak.js: tonggak tumbuh bayi (v45). Yang ditunggu di fase bayi: senyum pertama, gigi pertama, kata pertama, langkah pertama, dst.
// Dua aturan dari diskusi 26 Okt (riset/fase-kehidupan.md, bagian bayi):
//   1. KAPAN datang dari benih makhluk sendiri. Tiap tonggak punya jendela umur [lo, hi] hari; harinya ditarik sekali dari
//      seed_rng(id makhluk, "tonggak", id), tidak dipengaruhi rawatan. Jadi beda tiap makhluk (bahan obrolan antar pemain), tidak bisa
//      di-reroll, tidak bisa dipercepat, dan tidak bisa terlewat. Jalan di mesin (FORCED, seperti pintu di wants.js), jadi ikut replay.
//   2. APA boleh dibentuk pemain: kata pertama ngikut keinginan yang pernah dipenuhi (buku -> "book"), benda kesayangan dibawa sampai gede.
// Jam tetap cuma buat kota: tiga tanggal suntik di klinik, sama buat semua, tampil sebagai "CHECKUP" yang pasti di baris Soon.
// Catatan: c.info.tonggak[id] = hari kejadian; c.info.kesayangan dan c.info.kata_pertama dipakai teks sesudahnya.
// UI membaca view() (tangga di profil) dan upcoming() (baris Soon lewat potret S.tonggak di soon.js).
// v45.1 (bagian 5 poin 3-5): yang lain di fase bayi lewat mesin yang sama: watak kebaca (enam pengamatan, c.info.watak), sakit ringan,
// orang (tetangga, bayi lain, cemas ditinggal), dan timbang di tiga hari klinik (c.info.timbang). UI: watak() dan timbang().
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const { FORCED, seed_rng, phase_of } = E;

  const KESAYANGAN = ["the blue blanket", "a sock with a hole in it", "the rabbit with one ear", "a wooden spoon", "a tin cup", "the yellow duck"];
  // keinginan yang pernah dipenuhi (wants.js) -> kata pertama. Yang paling dulu dipenuhi yang menang
  const KATA = { dongeng: "book", peluk: "hug", jalan: "bird", suara: "hi", mandi: "bubble", tidur_siang: "nap" };
  const KATA_LAIN = ["ball", "nom nom", "uwu", "more"];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  function kataPertama(x) {
    const done = ((x.c.info.keinginan || {}).selesai) || {};
    const from = Object.keys(KATA).filter(id => done[id] != null).sort((a, b) => done[a] - done[b])[0];
    return from ? { kata: KATA[from], dari: from } : { kata: seed_rng(x.c.id, "tonggak", "kata").choice(KATA_LAIN), dari: null };
  }

  // id = id event (moments.js, foto, telemetri), lo/hi = jendela umur dalam hari (lo === hi: tanggal tetap, pasti),
  // lbl = konteks kapital di baris Soon, label = frasa kecil ("first tooth"), ic = ikon, run(x) = efek + kalimat di catatan hari
  const T = (id, lo, hi, lbl, label, ic, run) => ({ id, lo, hi, lbl, label, ic, run });
  const LIST = [
    T("senyum_pertama", 2, 5, "FIRST SMILE", "first smile", "😊", x => {
      if (x.attended) x.bond(3);
      x.need("mood", 6); x.remember("First smile.");
      return x.attended ? `${x.n} looks up at you mid-yawn and smiles. A real one, gums and all. First smile!`
        : `${x.n} smiled for the first time today, at the ceiling fan. You'll get the next one.`;
    }),
    T("suntik_1", 5, 5, "CHECKUP", "first shots at the clinic", "🩹", x => {
      x.stat("kesehatan", 1); x.need("mood", -2); x.remember("First shots. Got a sticker.");
      return `${x.n}'s first shots at the clinic. One sharp cry, one sticker, and asleep before you're home.`;
    }),
    T("ketawa_pertama", 5, 9, "FIRST LAUGH", "first laugh", "😆", x => {
      const how = x.pick(["a game of peekaboo", "a sneeze", "the sound of the kettle", "their own hiccups"]);
      x.need("mood", 8); if (x.attended) x.bond(2); x.remember(`First laugh, at ${how}.`);
      return `${x.n} laughs out loud for the first time, at ${how}. Then they laugh at themselves laughing.`;
    }),
    T("kenal_nama", 8, 13, "THEIR NAME", "first time answering to their name", "👂", x => {
      x.stat("kecerdasan", 1); x.remember("Knew their own name.");
      return x.attended ? `You say "${x.n}" from across the room and a little head turns. They know their name now.`
        : `${x.n} turns their head when the neighbor says their name. They know it now.`;
    }),
    T("gigi_pertama", 9, 16, "FIRST TOOTH", "first tooth", "🦷", x => {
      x.need("mood", -3); x.remember("First tooth.");
      return `${x.n} has a tooth! One tiny white edge, found the hard way: first the table leg, then your finger.`;
    }),
    T("makan_padat", 10, 14, "FIRST FOOD", "first real food", "🥣", x => {
      const food = x.pick(["banana", "pumpkin", "sweet potato", "pear", "carrot"]);
      x.need("lapar", 10); x.remember(`First real food: mashed ${food}.`);
      return `${x.n}'s first real food: mashed ${food}. Half of it goes in. The rest goes everywhere.`;
    }),
    T("duduk_sendiri", 11, 16, "SITTING UP", "first time sitting up", "🪑", x => {
      const toy = x.pick(["the rubber ball", "a wooden spoon", "your sock"]);
      x.stat("kesehatan", 1); x.remember("Sat up on their own.");
      return `${x.n} sits up all by themselves, wobbles, and grabs ${toy} to celebrate. Sitting up: done.`;
    }),
    T("benda_kesayangan", 12, 20, "A FAVOURITE", "favourite thing", "🧸", x => {
      const thing = x.pick(KESAYANGAN);
      x.c.info.kesayangan = thing; x.bond(1); x.remember(`Chose a favourite: ${thing}.`);
      return `${x.n} has picked a favourite: ${thing}. It goes everywhere now, and bedtime doesn't happen without it.`;
    }),
    T("merangkak", 13, 19, "CRAWLING", "first crawl", "🐛", x => {
      x.stat("kesehatan", 1); x.remember("Started crawling.");
      return `${x.n} crawls for the first time, straight toward the one thing in the room they're not allowed to have.`;
    }),
    T("berdiri", 16, 22, "STANDING", "first time standing", "🧍", x => {
      x.stat("kesehatan", 1); x.remember("Stood up for the first time.");
      return `${x.n} pulls themselves up on the edge of the basket and stands there, wobbling and extremely pleased.`;
    }),
    T("kata_pertama", 17, 26, "FIRST WORD", "first word", "💬", x => {
      const { kata, dari } = kataPertama(x);
      x.c.info.kata_pertama = kata; x.stat("kecerdasan", 2); x.remember(`First word: "${kata}".`);
      return `${x.n} says their very first word: "${kata}"! Then they giggle and say it again until they're all worn out.${dari ? " You know exactly where that one came from." : ""}`;
    }),
    T("suntik_2", 19, 19, "CHECKUP", "second round of shots", "🩹", x => {
      x.stat("kesehatan", 1); x.need("mood", -2); x.remember("Second shots. Brave face.");
      return `Second round of shots. ${x.n} sees the nurse's cap and knows exactly what's coming. Brave face, mostly.`;
    }),
    T("langkah_pertama", 20, 30, "FIRST STEPS", "first steps", "👣", x => {
      x.remember("First steps.");
      if (x.attended) { x.bond(4); return `${x.n} stands up, wobbles, then takes three steps toward you before plopping down. First steps!`; }
      return `${x.n} walked for the first time today. Too bad you missed it; they walked to the door, waiting for you.`;
    }),
    T("potong_rambut", 24, 34, "FIRST HAIRCUT", "first haircut", "✂️", x => {
      x.remember("First haircut. A curl in an envelope.");
      return `${x.n}'s first haircut. Two snips, a lot of wriggling, and one curl kept in an envelope.`;
    }),
    T("kalimat_pertama", 30, 40, "FIRST SENTENCE", "first sentence", "🗣️", x => {
      const k = String(x.c.info.kata_pertama || "more").replace(/[!.]/g, "");
      x.stat("kecerdasan", 1); x.remember(`First sentence: "${k} now!"`);
      return `${x.n}'s first whole sentence, delivered with a pointed finger: "${k} now!"`;
    }),
    T("lompat_pertama", 30, 42, "FIRST JUMP", "first jump", "🦘", x => {
      x.stat("kesehatan", 1); x.need("mood", 4); x.remember("First jump.");
      return `${x.n} jumps with both feet off the ground for the first time, lands on their bottom, and does it again.`;
    }),
    T("pispot", 36, 50, "POTTY", "potty days", "🚽", x => {
      x.stat("kesehatan", 0.5); x.remember("Potty: done.");
      return `${x.n} used the potty, all by themselves, and announced it to the whole house.`;
    }),
    T("suntik_3", 40, 40, "CHECKUP", "last of the baby shots", "🩹", x => {
      x.stat("kesehatan", 1); x.remember("Last baby shots. Picked the sticker.");
      return `The last of the baby shots. ${x.n} walks in on their own feet and picks the sticker themselves.`;
    }),
    T("kasur_sendiri", 40, 54, "BIG BED", "first night in a real bed", "🛏️", x => {
      const k = x.c.info.kesayangan;
      x.need("energi", 5); x.remember("Out of the basket, into a bed.");
      return `${x.n} sleeps in a proper bed tonight, out of the basket for good.${k ? ` ${cap(k)} comes along, of course.` : ""}`;
    }),
  ];
  const BY_ID = Object.fromEntries(LIST.map(t => [t.id, t]));
  const fixed = t => t.lo === t.hi;

  // ---------------------------------------------------------------- v45.1: watak kebaca, sakit ringan, orang
  // Watak: tiap pengamatan membaca SATU sifat (traits) dan menulis c.info.watak[id] = "hi" | "mid" | "lo". Sifatnya tidak diubah:
  // pemain cuma baca. Ini pertama kalinya pemain kenal watak makhluknya; nanti kepake waktu makhluknya mulai nolak saran (bagian 10).
  // kata = kalimat pendek di kartu profil per tingkat [hi, mid, lo]. Ambang 58/42: sepertiga makhluk di tengah, biar "biasa" juga ada.
  // Ingatannya kecil (x.drama = "kecil" sebelum remember): nggak masuk kronik keluarga, dan terbuang duluan dari 20 baris ingatan,
  // supaya "First tooth." nggak kegeser sama "Inspects every spoon.". Kartunya sendiri baca c.info.watak, bukan ingatan.
  const lvl = (x, trait) => { const v = x.t(trait); return v >= 58 ? "hi" : v <= 42 ? "lo" : "mid"; };
  const IX = { hi: 0, mid: 1, lo: 2 };
  const kecil = (x, text) => { x.drama = "kecil"; x.remember(text); };
  const W = (id, lo, hi, topic, trait, ic, kata, lines) => ({ id, lo, hi, jenis: "watak", topic, trait, ic, kata, run: x => {
    const v = lvl(x, trait); (x.c.info.watak ||= {})[id] = v;
    x.need("mood", 2); kecil(x, kata[IX[v]] + ".");
    return lines(x.n)[IX[v]];
  } });
  const X = (id, lo, hi, jenis, run, at) => ({ id, lo, hi, jenis, run, at });
  const EXTRA = [
    W("watak_tidur", 3, 10, "Sleep", "penakut", "🌙", ["A light sleeper", "Sleeps like most babies", "Sleeps through anything"], n => [
      `The neighbour's drill starts at nine and ${n} is awake at the first buzz, eyes wide. A light sleeper, this one.`,
      `The neighbour's drill starts at nine. ${n} stirs, grumbles, and goes back to sleep. Sleeps like most babies.`,
      `The neighbour's drill runs all morning. ${n} sleeps through every minute of it, one ear twitching. Sleeps through anything.`]),
    W("watak_mandi", 6, 14, "Bath time", "patuh", "🛁", ["Easy at bath time", "Puts up with the bath", "Hates the bath"], n => [
      `Bath time. ${n} sits still in the warm water and lets you wash behind the ears, humming. Easy at bath time.`,
      `Bath time. ${n} complains for a minute, then forgets to. Puts up with the bath, mostly.`,
      `Bath time. ${n} goes stiff as a board, howls, and soaks the whole bathroom. Hates the bath, no doubt about it.`]),
    W("watak_orang", 14, 26, "Strangers", "ramah", "👋", ["Smiles at strangers", "Warms up slowly", "Hides from strangers"], n => [
      `The postman waves through the window and ${n} laughs out loud and waves both arms back. Smiles at strangers.`,
      `The postman waves through the window. ${n} stares, and after a long minute, waves back. Warms up slowly.`,
      `The postman waves through the window and ${n} buries their face in your shoulder until he's gone. Hides from strangers.`]),
    W("watak_makan", 15, 24, "Food", "impulsif", "🥄", ["Eats anything, fast", "Eats most things", "Inspects every spoon"], n => [
      `Lunch. ${n} grabs the spoon out of your hand and eats everything in reach, fast, including a corner of the bib. Eats anything.`,
      `Lunch. ${n} eats most of it, pushes the peas to the edge of the bowl, and that's that. Eats most things.`,
      `Lunch. ${n} looks at each spoonful from both sides before letting it anywhere near. Inspects every spoon.`]),
    W("watak_gigih", 18, 30, "Trying", "rajin", "🎯", ["Keeps trying", "Tries a few times", "Tries once, moves on"], n => [
      `The ball rolls under the chair. ${n} reaches, misses, reaches, misses, and keeps at it until it's theirs. Keeps trying.`,
      `The ball rolls under the chair. ${n} reaches three times, then finds a spoon that's just as good. Tries a few times.`,
      `The ball rolls under the chair. ${n} reaches once, shrugs, and finds a spoon instead. Tries once, moves on.`]),
    W("watak_balok", 26, 38, "Blocks", "kreatif", "🧱", ["Builds strange things", "Stacks and knocks down", "Lines them up"], n => [
      `${n} and the blocks: a leaning tower, then a bridge, then a hat. Builds strange things.`,
      `${n} and the blocks: a stack, a crash, a stack, a crash, all afternoon. Stacks and knocks down.`,
      `${n} and the blocks: a straight line, sorted by colour, every single time. Lines them up.`]),
    // sakit ringan: satu hari, nggak ada keputusan (demam dengan dilemanya tetap di storylets.js). Rewel gigi = 1-2 hari sebelum gigi pertama
    X("ruam_popok", 8, 20, "sakit", x => {
      x.need("mood", -4); x.stat("kesehatan", -0.5);
      return `${x.n} has a nappy rash: a red bottom and a cross face. A day without nappies, some cream, and a lot of air. Better by tomorrow.`;
    }),
    X("gigi_rewel", 7, 15, "sakit", x => {
      x.need("mood", -3);
      return `${x.n} drools on everything, chews the table leg, and is cross all day for no reason you can find. Something is on its way.`;
    }, c => dayOf(c, "gigi_pertama") - 1 - Math.floor(seed_rng(c.id, "tonggak", "gigi_rewel").random() * 2)),
    X("pilek_pertama", 20, 48, "sakit", x => {
      x.need("mood", -3); x.stat("kesehatan", -1); kecil(x, "First cold. A cough like a tiny seal.");
      return `${x.n}'s first cold: a red nose, a cough like a tiny seal, and a lot of sleep. Two days of cuddles and it's gone.`;
    }),
    // orang: tetangga dan bayi lain jadi NPC (bisa muncul lagi nanti: bayi lain = calon sahabat di fase anak, v46)
    X("tetangga_nengok", 3, 12, "orang", x => {
      const [nid, npc] = x.world.make_npc(x.c, x.day, "tetangga");
      const gift = x.pick(["a knitted hat two sizes too big", "a jar of home-made jam, for you", "a rattle that once belonged to her own kids", "a tiny pair of socks"]);
      x.c.relations[nid] = { nama: npc.nama, tipe: "tetangga", skor: 50, sejak: x.day }; x.c.info.tetangga = nid;
      x.with_npc(nid, `Came by to meet ${x.n}. Brought ${gift}.`); x.need("mood", 3); kecil(x, `${npc.nama} from next door came by with ${gift}.`);
      return `${npc.nama} from next door comes by to meet ${x.n}, with ${gift}. ${x.n} stares at the visitor's hat the entire time.`;
    }),
    X("bayi_lain", 24, 48, "orang", x => {
      const [nid, npc] = x.world.make_npc(x.c, x.day, "teman_bayi");
      x.c.relations[nid] = { nama: npc.nama, tipe: "teman_bayi", skor: 40, sejak: x.day }; x.c.info.kenalan_bayi = nid;
      x.with_npc(nid, `Met ${x.n} at the park. Traded a leaf.`); x.need("mood", 4); kecil(x, `Met ${npc.nama} at the park.`);
      return `At the park, another baby named ${npc.nama} crawls over and hands ${x.n} a leaf. ${x.t("ramah") >= 50 ? `${x.n} hands it back, and they trade it ten more times.` : `${x.n} holds it tight and looks at you.`} A first friend, maybe.`;
    }),
  ];
  const EX_BY = Object.fromEntries(EXTRA.map(t => [t.id, t]));

  // hari (umur) tonggak ini buat makhluk ini: tetap seumur hidup, dari benih, bukan dari rawatan
  function dayOf(c, t) {
    if (typeof t === "string") t = BY_ID[t] || EX_BY[t];
    if (!t) return null;
    if (t.at) return t.at(c);
    // yang lain (v45.1) ditarik dari [lo, hi-2]: sisa dua hari buat ngalah ke hari tonggak tanpa lewat dari jendelanya
    const span = t.jenis ? Math.max(1, t.hi - t.lo - 1) : t.hi - t.lo + 1;
    return fixed(t) ? t.lo : t.lo + Math.floor(seed_rng(c.id, "tonggak", t.id).random() * span);
  }

  // Timbang di hari klinik: angka dari benih (lahir 2,7-4,0 kg, umur 60 hari 11-16 kg), cepat di awal lalu melandai. Buat dibandingin
  // antar pemain ("punya gw 6,1 kg"), bukan buat dinilai: kalimat perawat nggak pernah bikin cemas, tiga versinya cuma soal ukuran.
  function timbang(c, age) {
    const r = seed_rng(c.id, "tonggak", "timbang");
    const kg0 = 2.7 + r.random() * 1.3, kg60 = 11 + r.random() * 5, cm0 = 47 + r.random() * 6, cm60 = 86 + r.random() * 12;
    const f = Math.sqrt(Math.min(1, Math.max(0, age) / 60)), j = seed_rng(c.id, "tonggak", "timbang", age).random() - 0.5;
    return { kg: Math.round((kg0 + (kg60 - kg0) * f + j * 0.3) * 10) / 10, cm: Math.round(cm0 + (cm60 - cm0) * f), besar: kg60 >= 14.5 ? 1 : kg60 < 12 ? -1 : 0 };
  }
  const NURSE = ["A little one, growing just fine", "Right on track", "A big one"];

  // Di mesin: FORCED per tonggak. Tonggak berjendela paling banyak satu per hari (c.info.tg_hari), tanggal klinik boleh bareng.
  // Save lama yang tonggaknya sudah lewat tanpa tercatat: menyusul satu per hari (cond pakai >=, bukan ===).
  // Urutan cek per hari: yang jendelanya paling cepat habis duluan, supaya yang tergeser (satu per hari) jarang lewat dari hi-nya.
  for (const t of [...LIST].sort((a, b) => a.hi - b.hi)) FORCED.push({ id: t.id,
    cond: x => x.phase === "bayi" && !x.c.fired[t.id] && x.age >= dayOf(x.c, t) && (fixed(t) || x.c.info.tg_hari !== x.day),
    run: x => {
      x.c.fired[t.id] = 1;
      (x.c.info.tonggak ||= {})[t.id] = x.day;
      if (!fixed(t)) { x.c.info.tg_hari = x.day; return t.run(x); }
      const m = timbang(x.c, x.age);
      (x.c.info.timbang ||= {})[t.id] = { d: x.day, kg: m.kg, cm: m.cm };
      return `${t.run(x)} On the scale: ${m.kg} kg, ${m.cm} cm. "${NURSE[m.besar + 1]}," says the nurse.`;
    } });

  // v45.1: yang lain. Paling banyak satu per hari (c.info.ex_hari), dan ngalah ke hari tonggak (c.info.tg_hari) selama jendelanya masih ada;
  // di hari terakhir jendela tetap jalan, jadi tidak pernah lewat dari hi. Rewel gigi (punya `at`) jalan tepat di harinya tanpa ngalah,
  // dan gugur kalau giginya keburu tumbuh (biar urutannya benar).
  for (const t of [...EXTRA].sort((a, b) => a.hi - b.hi)) FORCED.push({ id: t.id,
    cond: x => x.phase === "bayi" && !x.c.fired[t.id] && x.age >= dayOf(x.c, t)
      && (t.at ? !x.c.fired.gigi_pertama : x.age >= t.hi || (x.c.info.ex_hari !== x.day && x.c.info.tg_hari !== x.day)),
    run: x => {
      x.c.fired[t.id] = 1;
      (x.c.info.tonggak ||= {})[t.id] = x.day;
      x.c.info.ex_hari = x.day;
      return t.run(x);
    } });
  // Cemas ditinggal: bukan jendela, tapi keadaan: dua hari nggak dibuka, lalu dibuka. Teks saja, bukan hukuman (ikatan sudah diurus mesin).
  FORCED.push({ id: "cemas_ditinggal",
    cond: x => x.phase === "bayi" && x.age >= 14 && x.attended && !x.has("cemas") && !x.guardian.attends(x.day - 1) && !x.guardian.attends(x.day - 2),
    run: x => {
      x.flag("cemas", 10); x.need("mood", 4);
      return `${x.n} spots you and crawls over at top speed, then holds on to your leg for the whole morning. Two days is a long time when you're small.`;
    } });

  // ---------------------------------------------------------------- untuk UI
  // Tangga: semua tonggak dengan status. at = umur (hari) saat terjadi; -1 = terjadi tapi harinya tidak tercatat (save lama); null = belum
  function view(c, day) {
    const age = c.age(day), done = c.info.tonggak || {};
    return LIST.map(t => {
      const at = done[t.id] != null ? done[t.id] - c.born : (c.fired[t.id] ? -1 : null);
      return { id: t.id, label: t.label, lbl: t.lbl, ic: t.ic, lo: t.lo, hi: t.hi, fixed: fixed(t), done: at != null, at, open: at == null && age >= t.lo };
    });
  }
  // Buat baris Soon: tonggak berjendela berikutnya dan tanggal klinik berikutnya (hari absolut), hanya selama bayi
  function upcoming(c, day) {
    if (phase_of(c.age(day)) !== "bayi") return [];
    const out = [], V = view(c, day);
    const rng = V.find(v => !v.done && !v.fixed), fix = V.find(v => !v.done && v.fixed);
    for (const v of [rng, fix]) if (v) out.push({ cid: c.id, id: v.id, lbl: v.lbl, label: v.label, ic: v.ic, lo: c.born + v.lo, hi: c.born + v.hi, fixed: v.fixed });
    return out;
  }
  const next = (c, day) => view(c, day).find(v => !v.done && !v.fixed) || null;
  // Kartu "Getting to know": enam pengamatan watak dengan statusnya. kata = kalimat pendek hasilnya (null kalau belum), at = umur saat kebaca
  function watak(c, day) {
    const age = c.age(day), done = c.info.tonggak || {}, got = c.info.watak || {};
    return EXTRA.filter(t => t.jenis === "watak").map(t => {
      const v = got[t.id] || null, at = done[t.id] != null ? done[t.id] - c.born : null;
      return { id: t.id, topic: t.topic, trait: t.trait, ic: t.ic, lo: t.lo, hi: t.hi, done: !!v, v, kata: v ? t.kata[IX[v]] : null, at, open: !v && age >= t.lo };
    });
  }

  const API = { LIST, EXTRA, KESAYANGAN, dayOf, view, watak, timbang, upcoming, next };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Tonggak = API;
})();

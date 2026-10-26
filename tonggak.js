// tonggak.js: tonggak tumbuh bayi (v45). Yang ditunggu di fase bayi: senyum pertama, gigi pertama, kata pertama, langkah pertama, dst.
// Dua aturan dari diskusi 26 Okt (riset/fase-kehidupan.md, bagian bayi):
//   1. KAPAN datang dari benih makhluk sendiri. Tiap tonggak punya jendela umur [lo, hi] hari; harinya ditarik sekali dari
//      seed_rng(id makhluk, "tonggak", id), tidak dipengaruhi rawatan. Jadi beda tiap makhluk (bahan obrolan antar pemain), tidak bisa
//      di-reroll, tidak bisa dipercepat, dan tidak bisa terlewat. Jalan di mesin (FORCED, seperti pintu di wants.js), jadi ikut replay.
//   2. APA boleh dibentuk pemain: kata pertama ngikut keinginan yang pernah dipenuhi (buku -> "book"), benda kesayangan dibawa sampai gede.
// Jam tetap cuma buat kota: tiga tanggal suntik di klinik, sama buat semua, tampil sebagai "CHECKUP" yang pasti di baris Soon.
// Catatan: c.info.tonggak[id] = hari kejadian; c.info.kesayangan dan c.info.kata_pertama dipakai teks sesudahnya.
// UI membaca view() (tangga di profil) dan upcoming() (baris Soon lewat potret S.tonggak di soon.js).
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

  // hari (umur) tonggak ini buat makhluk ini: tetap seumur hidup, dari benih, bukan dari rawatan
  function dayOf(c, t) {
    if (typeof t === "string") t = BY_ID[t];
    if (!t) return null;
    return fixed(t) ? t.lo : t.lo + Math.floor(seed_rng(c.id, "tonggak", t.id).random() * (t.hi - t.lo + 1));
  }

  // Di mesin: FORCED per tonggak. Tonggak berjendela paling banyak satu per hari (c.info.tg_hari), tanggal klinik boleh bareng.
  // Save lama yang tonggaknya sudah lewat tanpa tercatat: menyusul satu per hari (cond pakai >=, bukan ===).
  // Urutan cek per hari: yang jendelanya paling cepat habis duluan, supaya yang tergeser (satu per hari) jarang lewat dari hi-nya.
  for (const t of [...LIST].sort((a, b) => a.hi - b.hi)) FORCED.push({ id: t.id,
    cond: x => x.phase === "bayi" && !x.c.fired[t.id] && x.age >= dayOf(x.c, t) && (fixed(t) || x.c.info.tg_hari !== x.day),
    run: x => {
      x.c.fired[t.id] = 1;
      (x.c.info.tonggak ||= {})[t.id] = x.day;
      if (!fixed(t)) x.c.info.tg_hari = x.day;
      return t.run(x);
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

  const API = { LIST, KESAYANGAN, dayOf, view, upcoming, next };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Tonggak = API;
})();

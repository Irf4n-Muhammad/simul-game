// Isi cerita v2 versi JavaScript: port 1:1 dari storylets.py (storylet per fase, aturan rumah, jalur setelah lulus,
// nikah, anak, besan, tua). Setiap storylet = syarat + bobot + hasil + cooldown + level drama.
// Nama dan urutan sengaja sama dengan versi Python supaya mudah dicocokkan.
"use strict";
const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
(function () {
const { AMBIENT, FORCED, HOOKS, NAMES, YEAR, adult_age: AA, OLD_AGE, FOREVER, Creature, inherit, make_ctx, make_log, seed_rng, storylet, inc } = E;

const ALL = ["bayi", "anak", "remaja", "dewasa", "tua"];
const GROWN = ["dewasa", "tua"];
const FOREVER_ = FOREVER;

function married(x) {
  return x.c.info.menikah != null && x.c.partner() !== null;
}

function kids_here(x) {
  return x.home.children_of(x.c).filter(m => m.alive(x.day) && !("keluar" in m.info));
}

function grandkids_here(x) {
  const kid_ids = new Set(x.home.children_of(x.c).map(k => k.id));
  return x.home.members.filter(m => m.alive(x.day) && m.parents.some(p => kid_ids.has(p)));
}

function count_teman(x) {
  return Object.values(x.c.relations).filter(r => r.tipe === "teman").length;
}

// ---------------------------------------------------------------- semua fase

storylet("lapar_rewel", ALL, "kecil", { cooldown: 3,
  cond: x => x.c.needs.lapar < 30, weight: x => 4 }, x => {
  x.say(x.pick([`${x.n} is cranky all day, tummy rumbling nonstop. They keep looking for you near the fridge.`,
    `${x.n} is so hungry they snack on cookie crumbs from under the sofa. A little sad to watch.`]));
  x.need("mood", -8);
});

storylet("kotor_dekil", ALL, "kecil", { cooldown: 4,
  cond: x => x.c.needs.kebersihan < 30, weight: x => 3 }, x => {
  x.say(`${x.n} is covered in mud and nobody gave them a bath. Their friends keep a little distance today.`);
  x.stat("reputasi", -1);
  x.need("mood", -5);
});

// ---------------------------------------------------------------- bayi


storylet("demam", ["bayi", "anak"], "sedang", { cooldown: 60,
  weight: x => 0.1 + (100 - x.c.stats.kesehatan) / 50 }, x => {
  x.say(x.pick([`${x.n} feels warm and floppy, and only wants cuddles.`,
    `${x.n} has been sneezing since morning and their nose is all red.`,
    `${x.n} won't eat and just keeps sleeping. Their forehead is hot.`]));
  const [, final] = x.ask("Go to the doctor, or a cool cloth at home?",
    { dokter: "Go to the doctor", rumah: "Cool cloth at home" },
    { suportif: "dokter", tegas: "rumah" }, "rumah", { obey: false, safe: "dokter" });
  if (final === "dokter") {
    x.say(x.pick(["The doctor says it's just a mild cold. By tomorrow morning they're bouncing around again.",
      `The doctor gives them a dinosaur sticker. ${x.n} is happier about the sticker than about getting better.`]));
    x.stat("kesehatan", 6);
    x.bond(2);
  } else if (x.chance(0.7)) {
    x.say("A cool cloth all night, and by morning the fever is gone.");
    x.stat("kesehatan", 2);
  } else {
    x.say("The fever just won't go down. For three days they're weak and don't want to play.");
    x.stat("kesehatan", -8);
    x.remember("Had a fever for three days as a little one.");
  }
});

storylet("main_mainan", ["bayi"], "kecil", { cooldown: 5 }, x => {
  const mainan = x.pick(["rubber ball", "stacking blocks", "fish plushie", "old cardboard box"]);
  x.say(mainan === "old cardboard box"
    ? `${x.n} finds an old cardboard box and plays with it all day. The box is more fun than the toys, as usual.`
    : `${x.n} plays with the ${mainan} until they fall asleep right on top.`);
  x.trait("kreatif", 0.5);
});

storylet("takut_petir", ["bayi", "anak"], "kecil", { cooldown: 25, weight: x => x.t("penakut") / 40 }, x => {
  if (x.attended) {
    x.say(`Thunder tonight! ${x.n} hides under the blanket until you open the app, then calms down.`);
    x.bond(2);
  } else {
    x.say(`Thunder tonight! ${x.n} hides under the blanket all alone until morning.`);
    x.trait("penakut", 1);
  }
});

storylet("nangis_tengah_malam", ["bayi"], "kecil", { cooldown: 8 }, x => {
  const [, final] = x.ask(`${x.n} is crying at 2 a.m.`, { gendong: "Hold them until they sleep", biarin: "Let them learn to sleep alone" },
    { suportif: "gendong", tegas: "biarin" }, "gendong", { obey: false });
  if (final === "gendong") {
    x.bond(1);
    x.say(`${x.n} goes quiet in your arms right away and falls asleep holding your shirt.`);
  } else {
    x.trait("penakut", 0.3);
    x.trait("patuh", 0.2);
    x.say(`${x.n} cries for ten minutes, then gets tired and falls asleep.`);
  }
});

storylet("makanan_baru", ["bayi"], "kecil", { cooldown: 10 }, x => {
  const sayur = x.pick(["steamed carrots", "spinach mush", "mashed pumpkin"]);
  const [, final] = x.ask(`Mealtime! Try ${sayur}, or their favorite porridge?`,
    { coba: `Try ${sayur}`, favorit: "Favorite porridge" }, { suportif: "favorit", tegas: "coba" }, "favorit", { obey: false });
  if (final === "coba") {
    if (x.chance(0.5)) {
      x.stat("kesehatan", 1);
      x.say(`${x.n} chews the ${sayur} slowly, then opens wide for more.`);
    } else {
      x.need("mood", -4);
      x.say(`${x.n} spits ${sayur} all over your face. Half the bowl is on the floor.`);
    }
  } else {
    x.need("mood", 4);
    x.say(`${x.n} finishes the porridge, happily kicking their little feet.`);
  }
});

storylet("ngompol_heboh", ["bayi"], "kecil", { cooldown: 10 }, x => {
  x.say(`${x.n} wet the bed, then pretends it wasn't them. Such an innocent face.`);
});

// ---------------------------------------------------------------- anak

storylet("hari_pertama_sekolah", ["anak"], "sedang", { once: true, priority: true }, x => {
  x.c.info.sekolah = true;
  if (x.t("penakut") > 55) {
    x.say(`First day of school! ${x.n} cries at the gate, holding their bag tight. They come home bragging about a gold star sticker.`);
  } else {
    x.say(`First day of school! ${x.n} runs into class without looking back. They come home with three new friends.`);
  }
  x.remember("First day of school.");
});

storylet("teman_baru", ["anak", "remaja", "dewasa"], "kecil", { cooldown: 20,
  cond: x => count_teman(x) < 1 + Math.floor(x.t("ramah") / 18),
  weight: x => x.t("ramah") / 40 }, x => {
  const [nid, npc] = x.world.make_npc(x.c, x.day, "teman");
  x.c.relations[nid] = { nama: npc.nama, tipe: "teman", skor: 50, sejak: x.day };
  x.say(x.pick(x.phase === "anak"
    ? [`${x.n} walks home with a new friend named ${npc.nama}. They swap lunches.`,
      `${x.n} met ${npc.nama} while fighting over the swing. Now they're best buddies.`]
    : [`${x.n} is getting close to ${npc.nama}, a new friend with the same taste in music.`,
      `${x.n} meets ${npc.nama} at a hangout spot. They click right away.`]));
  x.with_npc(nid, `Met ${x.n} and became friends.`);
  x.stat("reputasi", 1);
});

storylet("berantem_sekolah", ["anak"], "sedang", { cooldown: 50, weight: x => x.t("impulsif") / 60 }, x => {
  x.say(x.pick([`${x.n} comes home with a torn shirt. They say they got into a fight at school.`,
    `${x.n}'s teacher sends a message: they pushed a classmate down at recess.`,
    `${x.n} comes home with a scraped cheek and won't say why.`]));
  const [, final] = x.ask("What do you say?",
    { marahi: "Scold them", tanya: "Ask gently", bela: "Take their side" },
    { suportif: "tanya", tegas: "marahi" }, "tanya", { obey: false });
  if (final === "marahi") {
    x.say(`${x.n} says nothing and goes to their room. They skip dinner that night.`);
    x.trait("patuh", 2);
    x.trait("rajin", 1);
    x.bond(-4);
    x.need("mood", -12);
  } else if (final === "tanya") {
    if (x.has("diejek") || x.chance(0.5)) {
      x.say(x.pick([`Turns out ${x.n} was standing up for a friend who got teased. They say sorry for the trouble.`,
        `Turns out it was a fight over a ball. ${x.n} admits they started it and promises to say sorry tomorrow.`]));
      x.trait("setia", 2);
    } else {
      x.say(`Slowly ${x.n} tells you: kids often tease them about their ${x.c.rupa.telinga} ears. They hug you for a long time.`);
      x.flag("diejek", 30);
      x.remember("Told you about getting teased at school.");
    }
    x.bond(5);
  } else {
    x.say(`"Yeah, they're so annoying!" ${x.n} grins wide. The next day they're a little too cocky at school.`);
    x.bond(4);
    x.trait("impulsif", 2);
  }
});

storylet("ujian_diumumkan", ["anak", "remaja"], "kecil", { cooldown: 35,
  cond: x => !("ujian" in x.c.info) && x.age < 245 }, x => {
  x.c.info.ujian = { hari: x.day + 3, belajar: 0, jenis: "ulangan" };
  x.say(`School news: ${x.n} has a quiz in 3 days. You can help them study anytime before then.`);
});

storylet("ujian_akhir_diumumkan", ["remaja"], "kecil", { once: true, priority: true,
  cond: x => x.age >= 250 && !("ujian" in x.c.info) }, x => {
  x.c.info.ujian = { hari: x.day + 10, belajar: 0, jenis: "akhir" };
  x.say(`${x.n}'s final exams are in 10 days. They start sticking notes on the bathroom mirror.`);
});

storylet("ujian", ["anak", "remaja"], "sedang", { priority: true, cooldown: 1,
  cond: x => "ujian" in x.c.info && x.day >= x.c.info.ujian.hari }, x => {
  const u = x.c.info.ujian;
  delete x.c.info.ujian;
  const skor = (x.c.stats.kecerdasan * 0.6 + x.t("rajin") * 0.4 + u.belajar * 7 + (u.sendiri || 0) * 4 + x.rng.uniform(-12, 12));
  const bantu = (u.belajar ? ` You studied together ${u.belajar} time${u.belajar > 1 ? "s" : ""} before.` : "")
    + (u.sendiri ? ` ${x.n} also studied alone ${u.sendiri} time${u.sendiri > 1 ? "s" : ""}.` : "");
  if (u.jenis === "akhir") {
    x.c.info.lulus = skor > 55 ? "great" : "just okay";
    x.say(`${x.n} passed their final exams with ${x.c.info.lulus} grades.${bantu} They throw their cap into the sky!`);
    x.remember(`Graduated school with ${x.c.info.lulus} grades.`);
    return;
  }
  if (skor > 58) {
    x.say(`${x.n} got a 90-something on the quiz!${bantu} They stick it on the fridge themselves.`);
    x.need("mood", 10);
  } else if (skor > 38) {
    x.say(`${x.n}'s quiz score is just okay.${bantu} They say question 5 was "not fair".`);
  } else {
    x.say(`${x.n} hides the quiz paper under the bed. Bad score.${bantu}`);
    x.need("mood", -8);
  }
});

const BAKAT_SKILL = { drawing: "creativity", music: "creativity", sports: "fitness", science: "logic" };
storylet("bakat_ketahuan", ["anak"], "sedang", { once: true, cond: x => x.age >= 90 }, x => {
  const t = x.c.traits, G = x.c.st ? x.c.st.genes.talent : null, gt = k => G ? G[k] * 6 : 0;
  const cands = [["drawing", t.kreatif + x.rng.uniform(0, 20) + gt("creativity")],
    ["music", (t.kreatif + t.ramah) / 2 + x.rng.uniform(0, 20) + gt("creativity")],
    ["sports", (t.ambisius + t.impulsif) / 2 + x.rng.uniform(0, 20) + gt("fitness")],
    ["science", x.c.stats.kecerdasan + t.rajin / 2 + x.rng.uniform(0, 20) + gt("logic")]];
  let best = cands[0];
  for (const b of cands) if (b[1] > best[1]) best = b;
  const bakat = best[0], skill = BAKAT_SKILL[bakat];
  x.c.info.bakat = bakat;
  x.c.info.bakat_level = 10;
  const gifted = G && G[skill] >= 9;
  x.say(gifted ? `The teacher pulls you aside, almost whispering: ${x.n} has the kind of gift for ${bakat} they see once in a generation.`
    : `The teacher says ${x.n} has a talent for ${bakat}. Their eyes sparkle as they tell you.`);
  const [, final] = x.ask(`Sign them up for ${bakat} lessons?`, { les: "Sign them up", nanti: "Maybe later" },
    { suportif: "les", tegas: "nanti" },
    x.t("ambisius") > 45 ? "les" : "nanti");
  if (final === "les") {
    x.c.info.bakat_level = 25;
    x.flag("les");
    x.say(`${x.n} starts ${bakat} lessons every week.`);
  } else {
    x.say(`${x.n} only practices ${bakat} alone when they feel like it.`);
    // bakat yang tidak dirawat meredup sedikit
    if (G && G[skill] > 1) {
      G[skill] -= 1;
      x.say(`Without lessons, the spark dims a little. ${x.n}'s talent for ${bakat} settles at ${G[skill]}/10.`);
    }
  }
  x.remember(`Found a talent for ${bakat}.`);
});

storylet("latihan_bakat", ["anak", "remaja", "dewasa"], "kecil", { cooldown: 14,
  cond: x => "bakat" in x.c.info && x.age < AA(3 * YEAR),
  weight: x => 0.3 + (x.has("les") ? 0.3 : 0) }, x => {
  const b = x.c.info.bakat;
  x.c.info.bakat_level = Math.min(100, x.c.info.bakat_level + (x.has("les") ? 4 : 2) + x.t("rajin") / 50);
  x.say(x.pick([`${x.n} practices ${b} until evening. Getting better and better!`,
    `${x.n} shows you their ${b} practice, super proud.`]));
});

storylet("bolos_diam_diam", ["anak", "remaja"], "sedang", { cooldown: 45,
  cond: x => x.t("impulsif") > 45 && x.t("rajin") < 55,
  weight: x => (x.t("impulsif") - x.t("rajin") + 40) / 50
    * (x.rule("sekolah") === "wajib" ? 1 - 0.7 * x.obey_chance() : 1) }, x => {
  x.say(`${x.n} says they have group study at a friend's house today. They come home late with shoes full of sand.`);
  x.flag("rahasia_bolos", 21);
});

storylet("ketahuan_bolos", ["anak", "remaja"], "sedang", { cooldown: 10,
  cond: x => x.has("rahasia_bolos"), weight: x => 2.5 }, x => {
  x.c.clear_flag("rahasia_bolos");
  x.say(`The teacher sends a letter: ${x.n} skipped school last week. The "group study" was at the beach.`);
  const [, final] = x.ask("How do you react?",
    { hukum: "Punish them, no playing for a week", ngobrol: "Have a talk" },
    { suportif: "ngobrol", tegas: "hukum" }, "ngobrol", { obey: false });
  if (final === "hukum") {
    x.say(`${x.n} sulks for a week, but their quiz scores go up.`);
    x.trait("rajin", 3);
    x.bond(-3);
  } else {
    x.say(`${x.n} admits class is boring. You both agree they can join a club they like.`);
    x.bond(3);
  }
  x.remember("Got caught skipping school to go to the beach.");
});

storylet("lomba", ["anak", "remaja"], "sedang", { cooldown: 60,
  cond: x => "bakat" in x.c.info, weight: x => 0.5 + x.c.info.bakat_level / 50 }, x => {
  const b = x.c.info.bakat;
  if (x.chance((x.c.info.bakat_level + x.t("rajin") / 2) / 140)) {
    x.say(`${x.n} wins the city ${b} contest! Their photo is on the school feed.`);
    x.stat("reputasi", 6);
    x.need("mood", 15);
    x.c.info.menang_lomba = (x.c.info.menang_lomba ?? 0) + 1;
    x.remember(`Won the city ${b} contest.`);
  } else {
    x.say(x.pick([`${x.n} loses the ${b} contest. Quiet all the way home, then says "next year".`,
      `${x.n} only gets an honorable mention at the ${b} contest. Tiny trophy, but it still goes on the shelf.`,
      `${x.n} gets nervous at the ${b} contest and messes up the start. They practice again that same night.`]));
    x.trait("ambisius", 2);
  }
});

storylet("pet_nyasar", ["anak", "remaja"], "kecil", { once: true, cond: x => x.age >= 120 }, x => {
  const pet = x.pick(["tiny winged lizard", "fluffball that sneezes", "fish that walks on land"]);
  x.say(`A lost ${pet} shows up outside the house. ${x.n} has named it before you can even answer.`);
  const [, final] = x.ask("Can we keep it?", { boleh: "Yes", jangan: "No" },
    { suportif: "boleh", tegas: "jangan" }, "boleh");
  if (final === "boleh") {
    x.c.info.pet = pet;
    x.say(`The ${pet} now sleeps at the foot of ${x.n}'s bed.`);
    x.remember(`Adopted a ${pet}.`);
  } else {
    x.say(`${x.n} takes the ${pet} to the park, crying a little.`);
    x.need("mood", -10);
  }
});

storylet("pertanyaan_besar", ["anak"], "kecil", { cooldown: 20 }, x => {
  const q = x.pick(["why is the sky blue", "where do you go when you die", "why can't I fly",
    "who is the guardian, really"]);
  if (x.attended) {
    x.say(`At bedtime ${x.n} asks: "${q}?" You talk for a long time, and they fall asleep smiling.`);
    x.stat("kecerdasan", 1.5);
    x.bond(1);
  } else {
    x.say(`At bedtime ${x.n} asks their fish plushie: "${q}?"`);
  }
});

// ---------------------------------------------------------------- remaja

storylet("cita_cita", ["remaja"], "sedang", { once: true, priority: true, cond: x => x.age >= 190 }, x => {
  const t = x.c.traits, b = x.c.info.bakat;
  // older saves may still hold the Indonesian talent names, so they are kept as aliases
  const pilihan = { drawing: "illustrator", music: "musician", sports: "athlete", science: "scientist",
    menggambar: "illustrator", musik: "musician", olahraga: "athlete", sains: "scientist" };
  const cita = (b && (x.c.info.bakat_level ?? 0) > 35) ? (pilihan[b] ?? null) : (
    t.ambisius > 60 ? "business owner" : t.rajin > 55 ? "doctor" : "youtuber");
  x.c.info.cita = cita;
  x.say(`${x.n} writes in big letters on their bedroom wall: "FUTURE ${cita.toUpperCase()}!"`);
  x.remember(`Dream job: ${cita}.`);
});

storylet("cinta_monyet", ["remaja"], "sedang", { cooldown: 60,
  cond: x => x.c.rel_of("gebetan")[0] === null && x.c.partner() === null && !x.has("patah_hati"),
  weight: x => x.t("ramah") / 45 }, x => {
  const [nid, npc] = x.world.make_npc(x.c, x.day, "gebetan");
  x.say(`${x.n} keeps smiling at their phone. The name on the screen: ${npc.nama}.`);
  const options = { boleh: "Okay, just be honest", larang: "Not yet" };
  const rule = x.rule("pacaran");
  let final, followed;
  if (rule) {
    [final, followed] = x.by_rule("dating " + (rule === "boleh" ? "is allowed" : "waits until grown up"),
      rule === "boleh" ? "boleh" : "larang", "boleh", options);
  } else {
    [, final, followed] = x.ask(`Can they get close to ${npc.nama}?`, options,
      { suportif: "boleh", tegas: "larang" }, "boleh");
  }
  if (final === "boleh") {
    x.c.relations[nid] = { nama: npc.nama, tipe: "gebetan", skor: 55, sejak: x.day };
    x.with_npc(nid, `Started getting close to ${x.n}.`);
    if (followed === false) {
      x.flag("pacaran_diam", 40);
      x.bond(-2);
    }
  } else {
    x.say(`${x.n} says "okay" and deletes their number. Probably.`);
  }
  x.remember(`Had a crush on ${npc.nama}.`);
});

storylet("jadian_remaja", ["remaja"], "sedang", { cooldown: 30,
  cond: x => x.c.rel_of("gebetan")[0] !== null && x.day - x.c.rel_of("gebetan")[1].sejak >= 14,
  weight: x => 0.35 }, x => {
  const [nid, rel] = x.c.rel_of("gebetan");
  Object.assign(rel, { tipe: "pasangan", skor: 50, remaja: true, sejak: x.day });
  x.say(`${x.n} and ${rel.nama} are a couple now! They wear matching bracelets from the night market.`);
  x.with_npc(nid, `Started dating ${x.n}.`);
  x.remember(`First love: ${rel.nama}.`);
});

storylet("ketahuan_pacaran_diam", ["remaja", "dewasa"], "sedang", { cooldown: 20,
  cond: x => x.has("pacaran_diam"), weight: x => 1.5 }, x => {
  x.c.clear_flag("pacaran_diam");
  const [, rel] = x.c.rel_of("gebetan");
  const nama = rel ? rel.nama : "someone";
  x.say(`You see a photo of ${x.n} and ${nama} on a classmate's feed. Turns out they've been dating for a month.`);
  const [, final] = x.ask("Your reaction?", { marah: "Get angry", terima: "Accept it, ask for honesty from now on" },
    { suportif: "terima", tegas: "marah" }, "terima", { obey: false });
  if (final === "marah") {
    x.say(`${x.n} slams the door. For two days they only answer "hm".`);
    x.bond(-6);
  } else {
    x.say(`${x.n} is relieved. That night they tell you all about ${nama}.`);
    x.bond(4);
    x.trait("setia", 1);
  }
});

storylet("membantah", ["remaja"], "kecil", { cooldown: 12,
  weight: x => (100 - x.t("patuh")) / 50 * (120 - x.c.bond) / 70 }, x => {
  x.say(x.pick([`Asked to clean their room, ${x.n} says "later" five times.`,
    x.rule("jam_malam") === "ketat" ? `${x.n} complains their curfew is too early. "All my friends can stay out until 10!"`
      : `${x.n} puts on headphones when you try to talk.`]));
  x.bond(-1.5);
});

storylet("pesta_pertama", ["remaja"], "sedang", { cooldown: 50, cond: x => x.age >= 200 }, x => {
  x.say(`${x.n} is invited to a friend's birthday party. They say "everyone is going".`);
  const options = { boleh: "Yes, home by 10", larang: "No" };
  const rule = x.rule("jam_malam");
  let final, followed;
  if (rule) {
    [final, followed] = x.by_rule("curfew " + (rule === "ketat" ? "is 9 p.m., no night parties" : "is 11 p.m."),
      rule === "ketat" ? "larang" : "boleh", "boleh", options);
  } else {
    [, final, followed] = x.ask("Can they go?", options, { suportif: "boleh", tegas: "larang" },
      "boleh", { alone: `so ${x.n} went without waiting for your OK.` });
  }
  if (final === "boleh") {
    x.flag("di_pesta", 1);
    if (followed === false) {
      x.say(`At 8 p.m. ${x.n}'s room is empty. The window is wide open.`);
      x.flag("kabur_ke_pesta", 1);
      x.bond(-3);
    }
  } else {
    x.say(`${x.n} stays in their room all night, watching their friends' stories.`);
    x.need("mood", -10);
  }
});

storylet("masalah_di_pesta", ["remaja", "dewasa"], "besar", { cooldown: 30, priority: true,
  cond: x => x.has("di_pesta") && x.t("impulsif") > 55 }, x => {
  const r = x.rng.random();
  if (r < 0.45) {
    x.say(`At 1 a.m. a friend brings ${x.n} home, dizzy and smelling of drinks. They say sorry while half asleep.`);
    x.stat("kesehatan", -5);
    x.stat("reputasi", -3);
    x.remember("Came home from a party at 1 a.m., tipsy.");
  } else if (r < 0.8) {
    x.say(`A video of ${x.n} dancing on a table is all over the feed. The whole school has seen it.`);
    x.stat("reputasi", -6);
    x.remember("Table-dancing video went viral.");
  } else {
    x.say(`A fight breaks out at the party. ${x.n} breaks it up and comes home with a split lip, but now they're a little hero.`);
    x.stat("reputasi", 4);
    x.remember("Broke up a fight at a party.");
  }
  for (const f of ["di_pesta", "kabur_ke_pesta"]) x.c.clear_flag(f);
});

storylet("pesta_aman", ["remaja", "dewasa"], "kecil", { cooldown: 1, priority: true,
  cond: x => x.has("di_pesta") && x.t("impulsif") <= 55 }, x => {
  const kabur = x.has("kabur_ke_pesta");
  x.say(`${x.n} comes home from the party` + (kabur ? " through the window, thinking nobody noticed." : " right on time, talking about a three-layer birthday cake."));
  for (const f of ["di_pesta", "kabur_ke_pesta"]) x.c.clear_flag(f);
});

storylet("patah_hati", ["remaja", "dewasa"], "sedang", { cooldown: 60,
  cond: x => x.c.rel_of("gebetan")[0] !== null && x.day - x.c.rel_of("gebetan")[1].sejak >= 20,
  weight: x => 0.5 }, x => {
  const [nid, rel] = x.c.rel_of("gebetan");
  const ke = x.c.info.patah_hati = (x.c.info.patah_hati ?? 0) + 1;
  delete x.c.relations[nid];
  x.say(`${rel.nama} started dating someone else. ${x.n} acts like it's fine, but keeps playing sad songs on repeat.`);
  x.with_npc(nid, `Drifted away from ${x.n}.`);
  x.need("mood", -25);
  x.flag("patah_hati", 14);
  x.remember(`${ke === 1 ? "First heartbreak" : "Heartbreak #" + String(ke)}: ${rel.nama}.`);
});

storylet("curhat_malam", ["remaja", "dewasa", "tua"], "kecil", { cooldown: 10,
  cond: x => x.has("patah_hati") || x.has("berduka") || x.has("bersalah") || x.c.needs.mood < 40, weight: x => 2 }, x => {
  if (x.attended) {
    x.say(`Late at night ${x.n} talks for a long time. At the end they say, "thanks for checking on me so often."`);
    x.bond(4);
    x.need("mood", 12);
  } else {
    x.say(`${x.n} can't sleep and sits by the window until dawn.`);
  }
});

storylet("kerja_sambilan", ["remaja"], "sedang", { once: true,
  cond: x => x.age >= 220 && x.t("ambisius") > 40 }, x => {
  const tempat = x.pick(["ice cream shop", "bookstore", "car wash"]);
  x.c.info.sambilan = tempat;
  x.say(`${x.n} gets a part-time job at the ${tempat}. They spend their first paycheck on a little gift for you.`);
  x.stat("uang", 30);
  x.bond(3);
  x.remember(`First part-time job at the ${tempat}.`);
});

// ---------------------------------------------------------------- setelah lulus: jalur berbeda

storylet("setelah_lulus", ["remaja", "dewasa"], "sedang", { once: true, priority: true,
  cond: x => "lulus" in x.c.info && x.age >= 258 }, x => {
  const t = x.c.traits;
  const pref = (x.c.stats.kecerdasan + t.rajin / 2 > 75 ? "kuliah"
    : t.impulsif > 60 || t.kreatif > 65 ? "gap" : "kerja");
  x.say(`${x.n} is thinking about what to do after graduation.`);
  const [, final] = x.ask("What do you suggest?",
    { kuliah: "College first", kerja: "Start working", gap: "Gap year, go explore" },
    { suportif: "SELF", tegas: "kuliah" }, pref, { safe: "kuliah" });
  x.c.info.jalur = final;
  if (final === "kuliah") {
    x.c.info.kuliah_aktif = true;
    x.c.info.siap_kerja = x.day + x.rng.randint(150, 240);
    x.say(`${x.n} got into college! They buy a new bag and pretend not to be nervous.`);
    x.remember("Started college.");
  } else if (final === "gap") {
    x.c.info.siap_kerja = x.day + x.rng.randint(60, 150);
    const tujuan = x.pick(["the northern mountains", "the southern islands", "the old western towns"]);
    x.say(`${x.n} sets off on a gap year to ${tujuan}, with a backpack that's way too big.`);
    x.remember(`Gap year in ${tujuan}.`);
  } else {
    x.c.info.siap_kerja = x.day + x.rng.randint(5, 30);
    x.say(`${x.n} starts sending job applications everywhere.`);
  }
});

storylet("kehidupan_kampus", ["dewasa"], "kecil", { cooldown: 12, cond: x => x.c.info.kuliah_aktif }, x => {
  x.say(x.pick([`${x.n} stays up late on a group project where they're the only one doing any work.`,
    `${x.n} joins a campus club and comes home with a staff T-shirt.`,
    `${x.n} falls asleep in the library until the guard wakes them up.`]));
  x.stat("kecerdasan", 0.5);
});

storylet("wisuda", ["dewasa"], "sedang", { priority: true, once: true,
  cond: x => x.c.info.kuliah_aktif && x.day >= x.c.info.siap_kerja }, x => {
  x.c.info.kuliah_aktif = false;
  x.c.info.sarjana = true;
  x.say(`${x.n} graduates! ` + (x.attended ? "They spot you in the crowd and wave and wave."
    : "They send a photo in their cap and gown, asking if you saw."));
  x.remember("Graduation day.");
});

storylet("cerita_perjalanan", ["dewasa"], "kecil", { cooldown: 15,
  cond: x => x.c.info.jalur === "gap" && x.day < (x.c.info.siap_kerja ?? 0) }, x => {
  x.say(x.pick([`${x.n} sends a photo of the sunrise from a hilltop.`,
    `${x.n} runs out of money and works a week at a corner shop to pay for the trip home.`,
    `${x.n} meets creatures from other countries and learns their songs.`]));
  x.trait("ramah", 1);
});

storylet("cari_kerja", ["dewasa"], "sedang", { cooldown: 15, weight: x => 3,
  cond: x => !x.c.info.kerja && !x.c.info.kuliah_aktif
    && !x.c.info.pensiun && x.day >= (x.c.info.siap_kerja ?? FOREVER_) }, x => {
  const i = x.c.info;
  const p = 0.3 + x.t("rajin") / 250 + (i.sarjana ? 0.25 : 0) + (i.lulus === "great" ? 0.1 : 0);
  if (!x.chance(Math.min(0.9, p))) {
    i.ditolak = (i.ditolak ?? 0) + 1;
    x.say(x.pick([`${x.n}'s job application got turned down again. They cross one more company off the list.`,
      `${x.n} has a job interview, but they hear "not enough experience". They ride the last bus home.`]));
    x.need("mood", -6);
    return;
  }
  const cita = i.cita ?? "something";
  x.say(`${x.n} gets two offers: a steady office job, or a low-paid ${cita} internship.`);
  const pref = x.t("ambisius") > 55 ? "cita" : "aman";
  const [, final] = x.ask("Which one do you suggest?",
    { aman: "The steady office job", cita: `Chase the ${cita} dream` },
    { suportif: "SELF", tegas: "aman" }, pref);
  if (final === "aman") {
    Object.assign(i, { kerja: "office worker", gaji: 6 + (i.sarjana ? 2 : 0), level: 1 });
    if (!("kerja_sejak" in i)) i.kerja_sejak = x.age;
    x.say(`${x.n} wears a work shirt for the first time. Looks so grown up!`);
  } else {
    Object.assign(i, { kerja: `intern ${cita}`, gaji: 3 + (i.sarjana ? 1 : 0), level: 1 });
    if (!("kerja_sejak" in i)) i.kerja_sejak = x.age;
    x.stat("karier", 5);
    x.say(`${x.n} starts their ${cita} internship. The pay is tiny, but they come home all excited.`);
  }
  i.mulai_kerja = x.day;
  x.remember(`First job: ${i.kerja}` + (i.ditolak ? `, after ${i.ditolak} rejections.` : "."));
});

storylet("nganggur_lama", ["dewasa"], "sedang", { cooldown: 60,
  cond: x => !x.c.info.kerja && (x.c.info.ditolak ?? 0) >= 3 && !x.c.info.pensiun }, x => {
  x.say(`${x.n} has been out of work for a while. They start helping at the neighbor's corner shop to keep busy.`);
  const [, final] = x.ask("What do you say?", { semangat: "Cheer them on, help with the CV", kritik: "Tell them to get serious" },
    { suportif: "semangat", tegas: "kritik" }, "semangat", { obey: false });
  if (final === "semangat") {
    x.bond(3);
    x.trait("rajin", 1);
  } else {
    x.trait("rajin", 3);
    x.bond(-3);
  }
});

// ---------------------------------------------------------------- kerja

storylet("hari_kerja", GROWN, "kecil", { cooldown: 12, cond: x => x.c.info.kerja, weight: x => 0.6 }, x => {
  x.say(x.pick([`${x.n} works late and falls asleep still in their work clothes.`,
    `${x.n}'s coworkers praise their presentation from this morning.`,
    `${x.n} has lunch with the team, laughing about the boss getting someone's name wrong.`,
    `${x.n} is stuck in traffic for two hours and finishes a whole podcast.`]));
  x.stat("karier", 0.5);
});

storylet("dimarahi_bos", GROWN, "kecil", { cooldown: 30,
  cond: x => x.c.info.kerja, weight: x => (100 - x.t("rajin")) / 40 }, x => {
  x.say(`${x.n} gets scolded by the boss for a late report. On the way home they buy two ice creams.`);
  x.need("mood", -10);
  x.stat("karier", -1);
});

storylet("naik_jabatan", GROWN, "sedang", { cooldown: 120,
  cond: x => x.c.info.kerja && x.c.stats.karier > 5 + 9 * (x.c.info.level ?? 1),
  weight: x => 2 }, x => {
  const i = x.c.info;
  i.level = (i.level ?? 1) + 1;
  i.gaji = (i.gaji ?? 3) + 2;
  // "magang " is the old Indonesian prefix, still found in older saves
  const intern = ["intern ", "magang "].find(pre => i.kerja.startsWith(pre));
  if (intern && i.level >= 2) {
    i.kerja = i.kerja.split(intern).join("");
    x.say(`${x.n} is officially a real ${i.kerja} now! They call you first, before anyone else.`);
  } else {
    x.say(`${x.n} gets promoted to level ${i.level}. Their desk is by the window now.`);
  }
  x.bond(2);
  x.remember(`Promoted to level ${i.level} as ${i.kerja}.`);
});

storylet("dipecat", ["dewasa"], "sedang", { cooldown: 150,
  cond: x => x.c.info.kerja && x.t("rajin") < 45 && x.day - (x.c.info.mulai_kerja ?? 0) > 120,
  weight: x => (50 - x.t("rajin")) / 40 }, x => {
  const lama = x.c.info.kerja;
  Object.assign(x.c.info, { kerja: null, siap_kerja: x.day + 10 });
  x.say(`${x.n} got fired from their job as ${lama}. They come home carrying a box with their little desk plant.`);
  x.need("mood", -25);
  x.remember(`Fired from the job as ${lama}.`);
});

storylet("tawaran_pindah_kerja", ["dewasa"], "sedang", { cooldown: 150,
  cond: x => x.c.info.kerja && (x.c.info.level ?? 1) >= 2 && x.t("ambisius") > 50 }, x => {
  const kota = x.pick(["the capital", "the port city", "the next country over"]);
  x.say(`${x.n} gets a job offer in ${kota}. Double the pay, but far from home.`);
  const [, final] = x.ask("Take it?", { ambil: "Take it", tetap: "Stay here" },
    { suportif: "SELF", tegas: "tetap" }, x.t("ambisius") > 65 ? "ambil" : "tetap");
  if (final === "ambil") {
    x.c.info.gaji = (x.c.info.gaji ?? 3) * 2;
    x.c.info.kota = kota;
    x.say(`${x.n} moves to ${kota}. They promise a video call every Sunday.`);
    x.bond(-2);
    x.remember(`Moved to ${kota} for work.`);
  } else {
    x.say(`${x.n} turns down the offer. "There's something more important here," they say.`);
    x.bond(2);
  }
});

storylet("karya_besar", GROWN, "sedang", { cooldown: 120,
  cond: x => (x.c.info.bakat_level ?? 0) > 55 && x.age > AA(YEAR) }, x => {
  const b = x.c.info.bakat;
  const acara = { drawing: "solo art show", music: "small concert", sports: "national tournament",
    science: "conference talk", menggambar: "solo art show", musik: "small concert",
    olahraga: "national tournament", sains: "conference talk" }[b];
  if (x.chance(x.c.info.bakat_level / 120)) {
    x.say(`${x.n} holds their first ${acara} and it's packed! The whole town feed starts to know their name.`);
    x.stat("reputasi", 10);
    x.remember(`First ${acara}, and a big success.`);
  } else {
    x.say(`Hardly anyone comes to ${x.n}'s ${acara}. But one person stays until the end and asks for an autograph.`);
    x.trait("ambisius", 1);
  }
});

// ---------------------------------------------------------------- cinta dewasa

storylet("party_kantor", ["dewasa"], "kecil", { cooldown: 60, cond: x => x.c.info.kerja }, x => {
  x.say(`There's an office party tonight. ${x.n} puts on their fanciest jacket.`);
  x.flag("di_party", 1);
});

storylet("kenalan_menarik", ["dewasa"], "sedang", { cooldown: 75,
  cond: x => x.c.partner() === null && x.c.rel_of("calon")[0] === null && !x.has("patah_hati")
    && x.age < AA(5 * YEAR),
  weight: x => (x.t("ramah") / 60 + (x.has("di_party") ? 1.5 : 0)) * (x.c.info.minat_cinta ?? 1) * ((x.c.info.bekas || {}).hati ? 0.55 : 1) }, x => {
  const [nid, npc] = x.world.make_npc(x.c, x.day, "calon");
  const tempat = x.has("di_party") ? "at the office party" : x.pick(["at a coffee shop", "at the bus stop", "at yoga class", "on campus"]);
  x.c.relations[nid] = { nama: npc.nama, tipe: "calon", skor: 50, sejak: x.day };
  x.say(`${x.n} meets ${npc.nama} ${tempat}. They talk so easily they lose track of time.`);
  x.with_npc(nid, `Met ${x.n} ${tempat}.`);
});

storylet("jadian", ["dewasa"], "sedang", { cooldown: 20,
  cond: x => x.c.rel_of("calon")[0] !== null && !x.c.rel_of("calon")[1].remote && x.day - x.c.rel_of("calon")[1].sejak >= 21,
  weight: x => 1.5 }, x => {
  const [nid, rel] = x.c.rel_of("calon");
  const npc = x.world.npcs[nid];
  const cocok = 1 - Math.abs(npc.traits.ramah - x.t("ramah")) / 150 - Math.abs(npc.traits.ambisius - x.t("ambisius")) / 200;
  if (x.chance(cocok * 0.75)) {
    Object.assign(rel, { tipe: "pasangan", skor: 60, sejak: x.day });
    x.say(`${x.n} and ${rel.nama} are officially dating. Their feed is full of couple photos.`);
    x.with_npc(nid, `Started officially dating ${x.n}.`);
    x.remember(`Started dating ${rel.nama}.`);
  } else {
    delete x.c.relations[nid];
    x.say(`${rel.nama} says they only see ${x.n} as a friend. ${x.n} smiles, then walks home slowly.`);
    x.with_npc(nid, `Turned down ${x.n}.`);
    x.flag("patah_hati", 20);
  }
});

storylet("kencan", GROWN, "kecil", { cooldown: 10, cond: x => x.c.partner() !== null,
  weight: x => x.c.partner().tipe === "pasangan" ? 2.0 : 0.7 }, x => {
  const p = x.c.partner();
  p.skor = Math.min(100, p.skor + 5 + x.t("setia") / 25);
  if (p.tipe === "suami-istri") {
    x.say(x.pick([`${x.n} and ${p.nama} go for a morning walk together, fighting over the umbrella.`,
      `${x.n} cooks dinner for ${p.nama}. Grandma's recipe, but it tastes like a science experiment.`]));
  } else {
    x.say(x.pick([`${x.n} and ${p.nama} have a picnic in the city park.`,
      `${x.n} cooks for ${p.nama}. It's burnt, but they eat it all anyway.`]));
  }
});

storylet("putus", ["remaja", "dewasa"], "sedang", { cooldown: 90,
  cond: x => x.c.partner() !== null && x.c.partner().tipe === "pasangan" && !x.c.partner().remote
    && x.c.partner().skor < 70 && x.day - (x.c.partner().sejak ?? 0) > 30,
  weight: x => (100 - x.c.partner().skor) / 200 + (100 - x.t("setia")) / 500
    + (x.phase === "dewasa" && x.c.partner().remaja ? 0.6 : 0) }, x => {
  const [nid, p] = x.c.rel_of("pasangan");
  delete x.c.relations[nid];
  const alasan = x.pick(["they say they want different things now", "too many fights about little things",
    `${p.nama} moved to another city`]);
  x.say(`${x.n} and ${p.nama} broke up: ${alasan}. ${x.n} deletes their couple photos one by one.`);
  x.with_npc(nid, `Broke up with ${x.n}.`);
  x.flag("patah_hati", 30);
  x.need("mood", -20);
  x.remember(`Broke up with ${p.nama}.`);
});

storylet("selingkuh_di_party", ["dewasa"], "besar", { cooldown: 180, priority: true,
  cond: x => x.has("di_party") && x.c.partner() !== null && !x.c.partner().remote && x.t("setia") < 30 }, x => {
  const p = x.c.partner();
  const r = x.rng.random();
  if (r < 0.6) {
    x.say(`${x.n} comes home at 3 a.m. and quickly deletes some chats. Something feels off.`);
    x.flag("rahasia_selingkuh", 60);
  } else if (r < 0.9) {
    x.say(`${x.n} comes home from the party a bit restless, but doesn't say anything.`);
  } else {
    x.say(`At the party someone asks ${x.n} to sneak off together. ${x.n} says no and goes home, missing ${p.nama}.`);
    x.trait("setia", 5);
  }
  x.c.clear_flag("di_party");
});

storylet("ketahuan_selingkuh", GROWN, "besar", { cooldown: 30,
  cond: x => x.has("rahasia_selingkuh") && x.c.partner() !== null && !x.c.partner().remote, weight: x => 1.2 }, x => {
  x.c.clear_flag("rahasia_selingkuh");
  const [nid, p] = Object.entries(x.c.relations).find(([, r]) => ["pasangan", "tunangan", "suami-istri"].includes(r.tipe));
  x.say(`${p.nama} finds some chats on ${x.n}'s phone. The house is so, so quiet that night.`);
  const [, final] = x.ask("What do you suggest?", { jujur: "Be honest and say sorry", diam: "Stay quiet" },
    { suportif: "jujur", tegas: "jujur" }, "diam");
  if (final === "jujur" && x.chance(0.5)) {
    p.skor = Math.max(10, p.skor - 30);
    x.say(`${x.n} confesses everything. ${p.nama} needs time, but hasn't left yet.`);
    x.trait("setia", 6);
  } else {
    delete x.c.relations[nid];
    const cerai = p.tipe === "suami-istri";
    x.c.info.menikah = null;
    x.say(`${p.nama} leaves with a suitcase.` + (cerai ? " Divorce papers arrive a month later." : "")
      + ` ${x.n} sits on the floor until morning.`);
    x.with_npc(nid, `${cerai ? "Divorced" : "Broke up with"} ${x.n} for cheating.`);
    x.flag("patah_hati", 60);
    x.stat("reputasi", -5);
  }
  x.remember(`Got caught cheating on ${p.nama}.`);
});

storylet("lamaran", GROWN, "besar", { cooldown: 90,
  cond: x => (x.c.partner() || {}).tipe === "pasangan" && !x.c.partner().remote && x.c.partner().skor > 75
    && (x.c.info.minat_cinta ?? 1) >= 0.5 && x.age >= 400 && x.day - (x.c.partner().sejak ?? 0) > 120,
  weight: x => 0.6 }, x => {
  const [nid, p] = x.c.rel_of("pasangan");
  x.say(`${x.n} shows you a ring hidden in their sock drawer. They want to propose to ${p.nama}!`);
  const [, final, followed] = x.ask("Do you give your blessing?", { restu: "Give your blessing", tunggu: "Wait a bit" },
    { suportif: "restu", tegas: p.skor > 90 ? "restu" : "tunggu" },
    "restu", { alone: `so ${x.n} proposed without waiting for your blessing.` });
  if (final === "restu") {
    Object.assign(p, { tipe: "tunangan", sejak: x.day });
    x.say(`${p.nama} says yes, happy-crying. ${p.nama}'s guardian sends a message: "congrats, future in-law!"`);
    x.with_npc(nid, `Got engaged to ${x.n}.`);
    x.remember(`Got engaged to ${p.nama}` + (followed === false ? " without the guardian's blessing." : "."));
    if (followed === false) x.bond(-8);
  } else {
    x.say(`${x.n} puts the ring away again. "Okay, maybe later."`);
    p.skor -= 10;
  }
});

storylet("pernikahan", GROWN, "besar", { priority: true, cooldown: 7,
  cond: x => (x.c.partner() || {}).tipe === "tunangan" && !x.c.partner().remote && x.day - x.c.partner().sejak >= 30 }, x => {
  const [nid, p] = x.c.rel_of("tunangan");
  const [, final] = x.ask("What kind of wedding?", { besar: "Big party", kecil: "Simple, save money for a home" },
    { suportif: "SELF", tegas: "kecil" },
    x.t("ramah") > 55 ? "besar" : "kecil", { obey: false });
  const biaya = final === "besar" ? 120 : 30;
  x.stat("uang", -biaya);
  Object.assign(p, { tipe: "suami-istri", sejak: x.day });
  Object.assign(x.c.info, { menikah: x.day, pasangan_id: nid, besan: `${p.nama}'s guardian` });
  if (!("menikah_hari" in x.c.info)) x.c.info.menikah_hari = x.age;
  if (final === "besar") {
    x.say(`${x.n} and ${p.nama} get married! The party is lively, all their friends come, and someone is crying in the corner.`);
  } else {
    x.say(`${x.n} and ${p.nama} get married in the garden, just close family. The cake is small but sooo good.`);
  }
  x.with_npc(nid, `Married ${x.n}.`);
  x.bond(3);
  x.remember(`Married ${p.nama}.`);
});

storylet("berantem_rumah_tangga", GROWN, "sedang", { cooldown: 150, cond: married,
  weight: x => (110 - x.c.partner().skor) / 60 }, x => {
  const p = x.c.partner();
  const soal = x.pick(["money", "who does the dishes", "where to go on vacation", "how to raise the kids"]);
  x.say(`${x.n} and ${p.nama} fight about ${soal}. ${x.n} comes to you to vent.`);
  const [, final] = x.ask("What do you say?", { baikan: "Tell them to apologize first", bela: "Take their side" },
    { suportif: "baikan", tegas: "baikan" }, "bela", { obey: true });
  if (final === "baikan") {
    p.skor = Math.min(100, p.skor + 8);
    x.say(`${x.n} apologizes first. That night they watch a movie together again.`);
  } else {
    p.skor -= 8;
    x.say(`${x.n} feels supported. But the house stays chilly for a week.`);
    x.bond(2);
  }
});

storylet("ulang_tahun_pernikahan_pasangan_sakit", GROWN, "sedang", { cooldown: 180, cond: x => married(x) && !x.c.partner().remote,
  weight: x => 0.2 + Math.max(0, x.age - AA(6 * YEAR)) / 200 }, x => {
  const p = x.c.partner();
  x.say(`${p.nama} goes to the hospital with a bad fever. ${x.n} sleeps in the chair by the bed for three nights.`);
  p.skor = Math.min(100, p.skor + 10);
  x.remember(`Looked after ${p.nama} in the hospital.`);
});

// ---------------------------------------------------------------- anak dan cucu

storylet("kabar_bayi", GROWN, "sedang", { cooldown: 60,
  cond: x => married(x) && !(x.c.partner().remote && !x.c.partner().host) && x.day - x.c.info.menikah >= 40 && x.age < AA(6 * YEAR)
    && (x.c.info.subur ?? true) && (x.c.info.litter ?? 0) < 2 && !("lahir_hari" in x.c.info)
    && x.day - (x.c.info.litter_terakhir ?? -FOREVER_) > 150,
  weight: x => (x.c.info.litter ?? 0) === 0 ? 0.8 : 0.25 }, x => {
  const p = x.c.partner();
  x.c.info.lahir_hari = x.day + 30;
  if (p.remote) (x.c.info.net_out ||= []).push({ t: "hamil", day: x.day, pid: x.c.info.pasangan_id });
  x.say(`Great news: ${x.n} and ${p.nama} are expecting babies! ${x.n} buys a baby name book right away.`);
});

storylet("kelahiran", GROWN, "sedang", { priority: true, cooldown: 1,
  cond: x => "lahir_hari" in x.c.info && x.day >= x.c.info.lahir_hari }, x => {
  const c = x.c, home = x.home;
  delete c.info.lahir_hari;
  const sp_id = c.info.pasangan_id ?? null;
  const sp = (sp_id != null ? x.world.npcs[sp_id] : null) || { nama: "their partner", traits: c.traits, rupa: c.rupa };
  const size = x.rng.choices([1, 2, 3, 4], [3, 4, 2, 1])[0];
  const no = c.info.litter = (c.info.litter ?? 0) + 1;
  c.info.litter_terakhir = x.day;
  const taken = new Set([...home.members.map(m => m.name), c.name, sp.nama]);
  const ours = [], besan = [], adopt = [];
  let full = false;
  for (let i = 0; i < size; i++) {
    const kid_id = `${c.id}-${no}${i}`;
    const rng = seed_rng(kid_id, "lahir");
    const [traits, rupa] = inherit(rng, c.traits, sp.traits, c.rupa, sp.rupa);
    const pool = NAMES.filter(n => !taken.has(n));
    const name = rng.choice(pool.length ? pool : NAMES);
    taken.add(name);
    if (i === 0 && home.free_slots(x.day) > 0) {
      const kid = Creature.new(kid_id, { born: x.day, gen: c.gen + 1, parents: [c.id, sp_id || ""],
        traits, rupa, name });
      home.members.push(kid);
      ours.push(kid);
    } else if (i === 1) {
      besan.push(name);
      home.besan_kids.push([x.day, name, c.name]);
      // pasangannya makhluk pemain lain: anak kedua beneran pindah ke rumah mereka
      if (sp.remote) (c.info.net_out ||= []).push({ t: "anak", day: x.day, pid: sp_id, kid: { n: no * 10 + i, name, traits, rupa } });
    } else {
      full = full || i === 0;
      adopt.push(name);
      home.adopted_out.push([x.day, name, c.name]);
    }
  }
  inc(home.stats, "lahir", size);
  (c.info.anak ||= []).push(
    ...ours.map(k => [k.name, x.day, "kamu"]), ...besan.map(n => [n, x.day, "besan"]), ...adopt.map(n => [n, x.day, "adopsi"]));
  const babies = size === 1 ? "a baby" : `${size} babies`;
  const parts = [`${x.n} and ${sp.nama} have ${babies}!`];
  if (ours.length) {
    const k = ours[0];
    parts.push(`${k.name} (${k.describe()}) stays with you.`);
  }
  if (besan.length) parts.push(`${besan[0]} is raised by ${c.info.besan ?? "the in-laws"}.`);
  if (adopt.length) {
    parts.push((full ? "Your home is full, so " : "") + `${adopt.join(", ")} can be adopted by other players through a link. Anyone not taken within a week goes to the shelter, and anyone can adopt them from there.`);
  }
  x.say(parts.join(" "));
  x.remember(`Had ${babies}: ` + [...ours.map(k => k.name), ...besan, ...adopt].join(", ") + ".");
});

storylet("jadi_orang_tua", GROWN, "kecil", { cooldown: 14,
  cond: x => (x.c.info.anak || []).some(([, born]) => x.day - born < 270) }, x => {
  const nama = x.pick(x.c.info.anak.filter(([, born]) => x.day - born < 270).map(([n]) => n));
  x.say(x.pick([`${x.n} stays up all night with ${nama}, who is teething.`,
    `${x.n} tears up watching ${nama} ride a bike for the first time.`,
    `${x.n} pretends to lose at hide-and-seek to ${nama}.`]));
});

storylet("besan_hadiah", GROWN, "kecil", { cooldown: 60, cond: married }, x => {
  x.say(`${x.c.info.besan} sends a gift box to ${x.n}'s family: cookies and knitted socks.`);
  inc(x.home.stats, "aksi_besan");
});

storylet("besan_protes", GROWN, "sedang", { cooldown: 100,
  cond: x => married(x) && (x.c.info.anak || []).length > 0 }, x => {
  const soal = x.pick(["the grandkids hardly ever visit them", "the grandkids eat too much candy",
    "the grandkids' names aren't nice enough"]);
  x.say(`${x.c.info.besan} sends a long message saying ${soal}.`);
  inc(x.home.stats, "aksi_besan");
  const [, final] = x.ask("How do you reply?", { sopan: "Reply politely", hadiah: "Send a gift back", cuek: "Ignore it" },
    { suportif: "sopan", tegas: "cuek" }, "sopan", { obey: false });
  if (final === "cuek") {
    x.say(`The message goes unanswered. The next week ${x.c.info.besan} sends an even longer one.`);
    x.flag("besan_kesal", 120);
  } else {
    x.say("Things calm down again. Next month the grandkids get a sleepover at the in-laws' place.");
  }
});

storylet("anak_dewasa_pergi", GROWN, "sedang", { cooldown: 30,
  cond: x => (x.c.info.anak || []).some(([, born, w]) => 270 <= x.day - born && x.day - born < 290 && w === "kamu") }, x => {
  const nama = x.c.info.anak.find(([, born, w]) => 270 <= x.day - born && x.day - born < 290 && w === "kamu")[0];
  x.say(`${nama} is all grown up. ${x.n} helps carry boxes to their new home, then sits in the empty room for a long time.`);
  x.remember(`${nama} moved out.`);
});

storylet("main_sama_cucu", GROWN, "kecil", { cooldown: 20, cond: x => grandkids_here(x).length > 0 }, x => {
  const cucu = x.pick(grandkids_here(x)).name;
  x.say(x.pick([`${x.n} teaches ${cucu} to fish in the river out back.`,
    `${x.n} tells ${cucu} stories about their younger days, half of them made up.`,
    `${cucu} falls asleep on ${x.n}'s lap during cartoons.`]));
  x.need("mood", 8);
});

// ---------------------------------------------------------------- hidup dewasa

storylet("pindah_rumah", GROWN, "sedang", { cooldown: 270,
  cond: x => x.c.stats.uang > 250 && !x.c.info.punya_rumah }, x => {
  x.say(`${x.n} finds a small house with a yard. Their savings cover the down payment.`);
  const [, final] = x.ask("Buy the house?", { beli: "Buy it", sewa: "Keep renting for now" },
    { suportif: "SELF", tegas: "beli" }, x.t("rajin") > 45 ? "beli" : "sewa");
  if (final === "beli") {
    x.stat("uang", -200);
    x.c.info.punya_rumah = true;
    x.say(`${x.n} holds the keys to their very first home. The first thing they hang up: a photo of you.`);
    x.remember("Bought a first home.");
  } else {
    x.say(`${x.n} keeps renting. The money is saved for other things.`);
  }
});

storylet("liburan", GROWN, "kecil", { cooldown: 90, cond: x => x.c.stats.uang > 60 }, x => {
  const tujuan = x.pick(["the east coast beach", "a mountain lake", "an old town full of cafes"]);
  const ikut = x.c.partner() ? ` with ${x.c.partner().nama}` : "";
  x.say(`${x.n} goes on vacation to ${tujuan}${ikut}. Souvenirs: the same keychain for everyone.`);
  x.stat("uang", -40);
  x.need("mood", 20);
});

storylet("reuni", GROWN, "kecil", { cooldown: 120, cond: x => x.age > AA(2 * YEAR) }, x => {
  x.say(x.pick([`${x.n} goes to a school reunion. The old class president is now a birthday party clown.`,
    `${x.n}'s class reunion: everyone shows off kid photos, ${x.n} shows off food photos.`]));
});

storylet("hobi_baru", GROWN, "kecil", { cooldown: 100 }, x => {
  const hobi = x.pick(["gardening", "knitting", "online chess", "morning runs", "baking bread"]);
  x.c.info.hobi = hobi;
  x.say(`${x.n} has a new hobby: ${hobi}. Their room is slowly filling up with ${hobi} stuff.`);
});

storylet("sahabat_pinjam_uang", GROWN, "sedang", { cooldown: 150,
  cond: x => x.c.stats.uang > 80 && x.c.rel_of("teman")[0] !== null }, x => {
  const [nid, t] = x.c.rel_of("teman");
  x.say(`${t.nama}, ${x.n}'s old best friend, wants to borrow money for their mom's hospital bill.`);
  const [, final] = x.ask("Lend it?", { pinjam: "Lend it", tolak: "Kindly say no" },
    { suportif: "pinjam", tegas: "tolak" }, x.t("setia") > 45 ? "pinjam" : "tolak");
  if (final === "pinjam") {
    x.stat("uang", -50);
    if (x.chance(0.7)) {
      x.say(`Three months later ${t.nama} pays it all back, and brings a big box of snacks too.`);
      x.stat("uang", 50);
    } else {
      x.say(`The money never comes back. ${t.nama} gets harder and harder to reach.`);
      delete x.c.relations[nid];
    }
    x.with_npc(nid, `Borrowed money from ${x.n}.`);
  } else {
    x.say(`${t.nama} says they understand, but their chats slowly fade.`);
    t.skor -= 20;
  }
});

storylet("krisis_paruh_baya", ["dewasa"], "sedang", { once: true,
  cond: x => AA(4 * YEAR) <= x.age && x.age < AA(7 * YEAR), weight: x => 0.15 }, x => {
  x.say(`${x.n} suddenly dyes their hair and says they want to learn electric guitar.`);
  const [, final] = x.ask("Support it?", { dukung: "Support it", ingatkan: "Remind them of their age" },
    { suportif: "dukung", tegas: "ingatkan" }, "dukung", { obey: false });
  if (final === "dukung") {
    x.say(`Three months later ${x.n} plays a show at a cafe near home. Off-key, but so happy.`);
    x.need("mood", 20);
    x.remember("Played electric guitar on stage in middle age.");
  } else {
    x.say(`${x.n} puts the guitar in the closet. Some nights you can still hear soft strumming.`);
  }
});

storylet("kecelakaan_kecil", ["remaja", "dewasa", "tua"], "sedang", { cooldown: 200,
  weight: x => 0.1 + x.t("impulsif") / 200 }, x => {
  x.say(x.pick([`${x.n} gets bumped by a bike while crossing the street on their phone. Their knee is all bandaged up.`,
    `${x.n} falls off a scooter. Sprained arm, now in a sling.`,
    `${x.n} slips in the bathroom. Big bump on the head, but they can still laugh about it.`]));
  x.stat("kesehatan", -12);
  x.remember("Had a small accident.");
});

storylet("sakit_parah", ["remaja", "dewasa", "tua"], "besar", { cooldown: 180,
  cond: x => x.c.stats.kesehatan < 40, weight: x => (40 - x.c.stats.kesehatan) / 8 }, x => {
  x.say(`${x.n} faints on the street. The doctor says they're worn out and their body is getting weak.`);
  const [, final] = x.ask("Stay in the hospital for a week?", { rawat: "Stay in the hospital", rumah: "Rest at home" },
    { suportif: "rawat", tegas: "rawat" }, "rumah", { obey: false, safe: "rawat" });
  x.stat("kesehatan", final === "rawat" ? 30 : 12);
  x.remember(final === "rawat" ? "Stayed in the hospital for exhaustion." : "Fainted from exhaustion.");
});

storylet("usaha_sampingan", ["dewasa"], "sedang", { cooldown: 180,
  cond: x => x.t("ambisius") > 60 && x.c.stats.uang > 60 }, x => {
  const ide = x.pick(["a coffee cart", "an online sticker shop", "private tutoring", "a late-night noodle stall"]);
  x.say(`${x.n} wants to start a side business: ${ide}, paid for with their savings.`);
  const [, final] = x.ask("Support it?", { gas: "Go for it", tahan: "Hold off for now" },
    { suportif: "gas", tegas: "tahan" }, "gas");
  if (final === "gas") {
    x.stat("uang", -40);
    if (x.chance(0.4 + x.t("rajin") / 300)) {
      x.c.info.gaji = (x.c.info.gaji ?? 3) + 3;
      x.say(`${x.n}'s side business (${ide}) is a hit in the first month!`);
      x.remember(`Started a side business (${ide}). It was a hit.`);
    } else {
      x.say(`${x.n}'s side business (${ide}) is too quiet. It closes after a month, but they learned a lot.`);
      x.trait("ambisius", -2);
      x.remember(`Started a side business (${ide}). It didn't work out.`);
    }
  }
});

// ---------------------------------------------------------------- tua

// ---------------------------------------------------------------- bentuk keluarga yang beda-beda

storylet("hidup_sendiri", ["dewasa"], "sedang", { once: true,
  cond: x => x.age > AA(2 * YEAR) && x.c.partner() === null && !("menikah_hari" in x.c.info)
    && (x.c.info.minat_cinta ?? 1) < 0.5 }, x => {
  x.say(`Tonight ${x.n} cooks dinner for one, then tells you: "I don't think I need to get married to be happy."`);
  const [, final] = x.ask("What do you say?", { dukung: "Your choice, I support you", dorong: "Try opening your heart again" },
    { suportif: "dukung", tegas: "dorong" }, "dukung", { obey: true });
  if (final === "dukung") {
    x.c.info.minat_cinta = 0.05;
    x.need("mood", 10);
    x.say(`${x.n} smiles, relieved. That weekend they sign up for a pottery class solo and come home with a wonky bowl.`);
    x.remember("Chose to live single, and happy.");
  } else {
    x.c.info.minat_cinta = 1.0;
    x.say(`${x.n} shrugs, but the next week they download a dating app.`);
  }
});

storylet("adopsi_sendiri", GROWN, "besar", { once: true,
  cond: x => x.c.partner() === null && !("menikah_hari" in x.c.info) && !x.home.children_of(x.c).length
    && AA(2.5 * YEAR) <= x.age && x.age < AA(7 * YEAR) && x.home.free_slots(x.day) > 0,
  weight: x => (x.home.living(x.day).length <= 2 ? 3.0 : 0.6) }, x => {
  x.say(`${x.n} comes home from the shelter where they volunteer, quiet for a long time, then asks: `
    + `"Do you think I could be a parent on my own?"`);
  const [, final] = x.ask("What do you answer?", { adopsi: "You can, let's adopt", jangan: "Your life is full enough" },
    { suportif: "SELF", tegas: "adopsi" },
    x.t("ramah") + x.t("setia") > 80 ? "adopsi" : "jangan", { obey: false });
  if (final === "adopsi" && x.home.free_slots(x.day) > 0) {
    const taken = x.home.members.map(m => m.name);
    const kid = Creature.new(`${x.c.id}-adopsi`, { born: x.day - 20, gen: x.c.gen + 1, parents: [x.c.id, ""], avoid: taken });
    kid.info.diadopsi = true;
    kid.last_day = x.day;
    x.home.members.push(kid);
    inc(x.home.stats, "adopsi_dari_panti");
    (x.c.info.anak ||= []).push([kid.name, x.day, "kamu"]);
    x.say(`A week later ${x.n} comes home carrying ${kid.name} (${kid.describe()}). Nervous, but won't let go.`);
    x.remember(`Adopted ${kid.name} as a single parent.`);
  } else {
    x.say(`${x.n} nods slowly. They still go to the shelter every Saturday, and the kids there love them most.`);
  }
});

storylet("sulit_punya_anak", GROWN, "besar", { once: true,
  cond: x => married(x) && !(x.c.info.subur ?? true) && x.day - x.c.info.menikah > 200
    && x.age < AA(6 * YEAR) }, x => {
  const p = x.c.partner();
  x.say(`${x.n} and ${p.nama} have waited a long time for baby news. The doctor says the chances are small.`);
  const [, final] = x.ask("What now?", { adopsi: "Adopt from the shelter", berdua: "Just the two of us" },
    { suportif: "SELF", tegas: "adopsi" },
    x.t("ramah") > 50 ? "adopsi" : "berdua", { obey: false });
  const home = x.home;
  if (final === "adopsi" && home.free_slots(x.day) > 0) {
    const kid_id = `${x.c.id}-adopsi`;
    const taken = [...new Set([...home.members.map(m => m.name), x.c.name, p.nama])];
    const kid = Creature.new(kid_id, { born: x.day - 20, gen: x.c.gen + 1,
      parents: [x.c.id, x.c.info.pasangan_id ?? ""], avoid: taken });
    kid.info.diadopsi = true;
    kid.last_day = x.day; // mulai hidup di rumahmu besok
    home.members.push(kid);
    inc(home.stats, "adopsi_dari_panti");
    (x.c.info.anak ||= []).push([kid.name, x.day, "kamu"]);
    x.say(`They come home from the shelter with ${kid.name} (${kid.describe()}), a baby nobody had picked before. `
      + `${kid.name} falls asleep on ${x.n}'s chest right away.`);
    x.remember(`Adopted ${kid.name} from the shelter.`);
  } else if (final === "adopsi") {
    x.say(`Your home is full, so ${x.n} can only be a volunteer big sibling at the shelter every Saturday.`);
  } else {
    x.say(`${x.n} and ${p.nama} share a long hug. They decide to travel the world, just the two of them.`);
    x.remember("Decided it's just the two of us.");
  }
});

storylet("pindah_keluar", ["dewasa"], "sedang", { once: true,
  cond: x => x.c.info.merantau && x.c.parents.some(pid => x.home.get(pid))
    && 300 <= x.age && x.age < AA(2 * YEAR) && x.home.living(x.day).length >= 3,
  weight: x => Math.max(0.0, (x.t("ambisius") + 100 - x.c.bond) / 150 - 0.5) }, x => {
  const kota = x.pick(["the port city", "the capital", "the island across the sea"]);
  x.say(`${x.n} has a chance to live in ${kota}. They want to move out and start fresh on their own.`);
  const [, final] = x.ask("Will you let them go?", { lepas: "Let them go, with love", tahan: "Ask them to stay home" },
    { suportif: "lepas", tegas: "tahan" }, "lepas", { obey: true });
  if (final === "lepas") {
    x.c.info.keluar = x.day;
    inc(x.home.stats, "pindah_keluar");
    x.say(`${x.n} leaves for ${kota}. Their room is empty, but they promise to keep in touch. `
      + "They stay in your family tree and drop by now and then.");
    x.remember(`Moved to ${kota}.`);
  } else {
    x.bond(-3);
    x.say(`${x.n} decides not to go. Quiet for a week, then starts helping around the house again.`);
  }
});

// ---------------------------------------------------------------- dilema kecil sehari-hari

storylet("minta_jajan", ["anak", "remaja"], "kecil", { cooldown: 12 }, x => {
  const barang = x.pick(["triple-scoop ice cream", "a hologram sticker", "a cat keychain", "level-5 spicy noodles"]);
  const aturan = x.rule("jajan");
  const opsi = { kasih: "Sure", tolak: "Not today" };
  let final;
  if (aturan) {
    [final] = x.by_rule(`pocket money is ${aturan === "besar" ? "generous" : "small"}`, aturan === "besar" ? "kasih" : "tolak", "kasih", opsi);
  } else {
    [, final] = x.ask(`${x.n} asks for ${barang}. Okay?`, opsi, { suportif: "kasih", tegas: "tolak" },
      "kasih");
  }
  if (final === "kasih") {
    x.stat("uang", -2);
    x.need("mood", 6);
    x.say(`${x.n} comes home with ${barang}, grinning ear to ear.`);
  } else {
    x.trait("rajin", 0.3);
    x.say(`${x.n} pouts, then drops their coins into the piggy bank.`);
  }
});

storylet("main_game_kelamaan", ["anak", "remaja"], "kecil", { cooldown: 14 }, x => {
  const [, final] = x.ask(`It's 10 p.m. and ${x.n} is still playing games. Bedtime?`, { tidur: "Bedtime, now",
    lanjut: "One more round" }, { suportif: "lanjut", tegas: "tidur" }, "lanjut");
  if (final === "tidur") {
    x.need("energi", 15);
    x.say(`${x.n} turns off the console, grumbling. They wake up fresh in the morning.`);
  } else {
    x.need("energi", -15);
    x.need("mood", 5);
    x.say(`${x.n} wins the last round and does a tiny quiet cheer. They yawn all through class the next day.`);
  }
});

storylet("takut_gelap", ["anak"], "kecil", { cooldown: 20, weight: x => x.t("penakut") / 50 }, x => {
  const [, final] = x.ask(`${x.n} begs you not to turn off the bedroom light.`, { nyala: "Leave it on",
    latih: "Practice sleeping in the dark" }, { suportif: "nyala", tegas: "latih" }, "nyala");
  if (final === "latih") {
    x.trait("penakut", -1);
    x.say(`${x.n} sleeps hugging their pillow tight. But they did it!`);
  } else {
    x.say(`${x.n} sleeps soundly under a little moon-shaped lamp.`);
  }
});

storylet("gaya_rambut", ["remaja"], "kecil", { cooldown: 40 }, x => {
  const warna = x.pick(["purple", "neon green", "half shaved"]);
  const [, final] = x.ask(`${x.n} wants their hair ${warna}.`, { boleh: "Sure", jangan: "No way" },
    { suportif: "boleh", tegas: "jangan" }, "boleh");
  if (final === "boleh") {
    x.trait("kreatif", 0.5);
    x.say(`${x.n}'s hair is ${warna} now. They take 40 selfies.`);
  } else {
    x.say(`${x.n} wears a hat all day in protest.`);
  }
});

storylet("beli_barang_mahal", ["dewasa"], "kecil", { cooldown: 45, cond: x => x.c.stats.uang > 40 }, x => {
  const barang = x.pick(["racing bike", "used camera", "comfy sofa", "new phone"]);
  const [, final] = x.ask(`${x.n} really wants a ${barang}. Buy it now?`, { beli: "Buy it", nabung: "Save up first" },
    { suportif: "beli", tegas: "nabung" }, x.t("impulsif") > 50 ? "beli" : "nabung",
    { obey: false });
  if (final === "beli") {
    x.stat("uang", -25);
    x.need("mood", 8);
    x.say(`${x.n} buys the ${barang} and shows it off to everyone for a week.`);
  } else {
    x.say(`${x.n} sticks a photo of the ${barang} on the fridge as a savings goal.`);
  }
});

storylet("lembur_atau_nongkrong", ["dewasa"], "kecil", { cooldown: 20, cond: x => x.c.info.kerja }, x => {
  const [, final] = x.ask(`Friends invite ${x.n} to hang out, but work is piling up.`,
    { nongkrong: "Hang out", lembur: "Work late" }, { suportif: "nongkrong", tegas: "lembur" },
    x.t("ramah") > x.t("rajin") ? "nongkrong" : "lembur", { obey: false });
  if (final === "lembur") {
    x.stat("karier", 0.8);
    x.need("mood", -4);
    x.say(`${x.n} works until 9 p.m. The boss sends a thumbs-up.`);
  } else {
    x.need("mood", 8);
    x.say(`${x.n} hangs out until late and comes home with a hoarse voice from laughing too much.`);
  }
});

storylet("urusan_anak_sekolah", GROWN, "kecil", { cooldown: 25,
  cond: x => kids_here(x).some(k => 60 <= k.age(x.day) && k.age(x.day) < 270) }, x => {
  const k = x.pick(kids_here(x).filter(k => 60 <= k.age(x.day) && k.age(x.day) < 270));
  const [, final] = x.ask(`There's a parent meeting at ${k.name}'s school, and it clashes with ${x.n}'s work.`,
    { datang: "Go to the school", kerja: "Stay at work" }, { suportif: "datang", tegas: "datang" },
    x.t("setia") > 45 ? "datang" : "kerja", { obey: false });
  if (final === "datang") {
    k.bond = Math.min(100.0, k.bond + 1);
    x.say(`${x.n} goes to the meeting. ${k.name} acts embarrassed, but brags about it to friends.`);
  } else {
    x.stat("karier", 0.5);
    x.say(`${x.n} doesn't make it. ${k.name} comes home and goes straight to their room.`);
  }
});

storylet("senam_lansia", ["tua"], "kecil", { cooldown: 30 }, x => {
  const [, final] = x.ask(`A neighbor invites ${x.n} to morning exercise in the park.`, { ikut: "Join in", rumah: "Stay home" },
    { suportif: "ikut", tegas: "ikut" }, x.t("penakut") > 55 ? "rumah" : "ikut",
    { obey: false });
  if (final === "ikut") {
    x.stat("kesehatan", 2);
    x.say(`${x.n} keeps getting the moves wrong, but makes two new friends.`);
  } else {
    x.say(`${x.n} watches the exercise class from the window, sipping tea.`);
  }
});

storylet("pensiun", ["tua"], "sedang", { once: true, priority: true, cond: x => x.c.info.kerja }, x => {
  const lama = x.c.info.kerja;
  Object.assign(x.c.info, { kerja: null, pensiun: true, gaji: 2 });
  x.say(`${x.n} retires from their job as ${lama}. Their coworkers give them a cake and a wall clock.`);
  x.c.info.gaji = 2;
  x.remember(`Retired as ${lama}.`);
});

storylet("kenangan", ["tua"], "kecil", { cooldown: 40, cond: x => x.c.memory.length >= 5 }, x => {
  const m = x.pick(x.c.memory.slice(0, -1));
  const tahun = Math.floor((x.day - m.hari) / YEAR);
  x.say(`${x.n} opens an old photo album and smiles at one page. "${m.teks}" That was ${tahun} years ago.`);
  x.bond(0.5);
});

storylet("sakit_tua", ["tua"], "sedang", { cooldown: 150, weight: x => 0.5 + (x.age - OLD_AGE) / 120 }, x => {
  const keluhan = x.pick(["sore knees when it rains", "blurry eyes", "always losing their glasses"]);
  x.say(`${x.n} starts grumbling about ${keluhan}. They still take morning walks, just slower.`);
  x.stat("kesehatan", -4);
});

storylet("kehilangan_sahabat", ["tua"], "sedang", { once: true, cond: x => x.c.rel_of("teman")[0] !== null }, x => {
  const [nid, t] = x.c.rel_of("teman");
  delete x.c.relations[nid];
  x.say(`${t.nama}, ${x.n}'s best friend since childhood, has passed away. ${x.n} goes to the funeral wearing the scarf ${t.nama} gave them.`);
  x.with_npc(nid, `Passed away; ${x.n} came to the funeral.`);
  x.flag("berduka", 30);
  x.remember(`Lost a best friend, ${t.nama}.`);
});

storylet("tanda_menua", ["tua"], "sedang", { once: true, priority: true,
  cond: x => x.c.death_day - x.day <= 120 }, x => {
  x.say(`The doctor says ${x.n}'s heart is getting tired. They aren't sad; they just ask for all the grandkids to visit next month.`);
  x.remember("Learned their time is short.");
});

function _farewell(c, day, home) {
  const x = make_ctx(c, day, home);
  const years = (day - c.born) / YEAR;
  const kids = home.children_of(c).filter(k => k.alive(day));
  const rank = { kecil: 0, sedang: 1, besar: 2 };
  let top = null;
  for (const m of c.memory) {
    if (top === null || rank[m.drama] > rank[top.drama] || (rank[m.drama] === rank[top.drama] && m.hari > top.hari)) top = m;
  }
  const text = (`${c.name} passed away peacefully at ${years.toFixed(1)} years old. `
    + (top ? `The memory they told most often: "${top.teks}" ` : "")
    + (kids.length ? `Their savings go to ${kids.map(k => k.name).join(", ")}.` : ""));
  if (kids.length && c.stats.uang > 0) {
    const share = c.stats.uang / kids.length;
    for (const k of kids) {
      k.stats.uang += share;
      k.set_flag("berduka", day, 45);
      k.memory.push({ hari: day, teks: `${c.name} passed away.`, drama: "besar" });
    }
  }
  inc(home.stats, "meninggal");
  return make_log(c, day, x, "akhir", x.attended, [text], ["besar"], ["akhir_hidup"]);
}

HOOKS.akhir_hidup = _farewell;

function _empty_home(home, day) {
  // Dipanggil saat tidak ada lagi yang tinggal di rumah. Game tidak pernah tamat.
  const back = home.members.filter(c => "keluar" in c.info && c.alive(day + 1));
  if (back.length) {
    const c = back.reduce((a, b) => (b.born < a.born ? b : a));
    const years = (day - c.info.keluar) / YEAR;
    delete c.info.keluar;
    c.last_day = day; // tahun-tahun di rantau tidak disimulasikan, dia lanjut hidup mulai besok
    c.set_flag("berduka", day, 45);
    inc(home.stats, "pulang_kampung");
    const text = `The house is quiet. ${c.name} hears the news and comes home after ${years.toFixed(1)} years away. `
      + `They open the window of their old room and tell you: "I'm here now."`;
    c.memory.push({ hari: day, teks: "Came back home to look after the house.", drama: "besar" });
    return [make_log(c, day, { age: day - c.born }, "pulang", true, [text], ["besar"], ["pulang_kampung"])];
  }
  const gen = Math.max(...home.members.map(m => m.gen)) + 1;
  const egg = Creature.new(`${home.id}/telur-${day}`, { born: day + 1, gen, avoid: home.members.map(m => m.name) });
  Object.assign(egg.info, { minat_cinta: 1.0, subur: true, merantau: false, telur_warisan: true });
  egg.last_day = day;
  const last = home.members.reduce((a, b) => (b.death_day > a.death_day ? b : a));
  home.members.push(egg);
  inc(home.stats, "telur_warisan");
  const text = `A few days after ${last.name} is gone, a little egg appears at the door, warm and wrapped in an old `
    + `family blanket. The next morning it hatches: ${egg.name} (${egg.describe()}). The story goes on.`;
  egg.memory.push({ hari: day + 1, teks: "Hatched from an egg left at the door.", drama: "besar" });
  return [make_log(egg, day, { age: 0 }, "telur", true, [text], ["besar"], ["telur_warisan"])];
}

HOOKS.rumah_kosong = _empty_home;

// ---------------------------------------------------------------- wajib & hari sepi

function _birthday(x) {
  x.remember(`Turned ${Math.floor(x.age / YEAR)}.`);
  const p = x.c.partner();
  const friends = count_teman(x);
  return (`Happy birthday, ${x.n}! Turning ${Math.floor(x.age / YEAR)} today! `
    + (p ? `${p.nama} brings a cake. ` : "")
    + `${friends} ${friends === 1 ? "friend helps" : "friends help"} blow out the candles.`);
}

FORCED.push({ id: "ulang_tahun", cond: x => x.age > 0 && x.age % YEAR === 0, run: _birthday });
FORCED.push({
  id: "ulang_tahun_pernikahan",
  cond: x => married(x) && x.day > x.c.info.menikah && (x.day - x.c.info.menikah) % YEAR === 0,
  run: x => `${x.n} and ${x.c.partner().nama} celebrate their ${Math.floor((x.day - x.c.info.menikah) / YEAR)}-year wedding anniversary.`,
});

const _AMB = {
  bayi: ["{n} takes a long nap, snoring softly.", "{n} chases their own shadow.",
    "{n} learns a new sound: \"brrrr\".", "{n} tries to chew on the table leg."],
  anak: ["{n} plays hide-and-seek with the neighbor kids.", "{n} draws our house with crayons.",
    "{n} does homework while snacking.", "{n} watches cartoons until they doze off."],
  remaja: ["{n} listens to music in their room all day.", "{n} hangs out at the mini-mart with friends.",
    "{n} changes their hairstyle. Again.", "{n} stays up late playing games."],
  dewasa: ["{n} works as usual, then makes noodles at home.", "{n} cleans the house on Sunday.",
    "{n} takes an evening walk around the neighborhood.", "{n} watches a series until midnight.",
    "{n} does the weekly shopping and forgets the most important thing."],
  tua: ["{n} waters the plants early in the morning.", "{n} naps in the rocking chair.",
    "{n} chats with the neighbor about chili prices.", "{n} finishes a whole crossword puzzle."],
};
for (const [_ph, _lines] of Object.entries(_AMB)) {
  AMBIENT[_ph] = (lines => x => x.pick(lines).split("{n}").join(x.n))(_lines);
}

// ---------------------------------------------------------------- masa dewasa: kerja, rumah, dan tujuan pribadi
// Masa dewasa itu setengah hidup. Cerita di sini memberi keputusan yang terasa: kerja vs rumah, uang vs waktu,
// dan tujuan beberapa minggu (kelas malam, maraton) yang punya hari H sendiri.
const STX = () => (typeof module !== "undefined") ? require("./status.js") : globalThis.Status;
const working = x => !!(x.c.st && x.c.st.job);
const coins = (x, n) => x.stat("uang", n / 50);
const wallet = x => (x.c.st ? x.c.st.wallet : 0);
const mainSkill = x => { const J = STX().JOBS[x.c.st.job.id]; return Object.entries(J.w).sort((a, b) => b[1] - a[1])[0][0]; };
const skillUp = (x, k, v) => { if (x.c.st) x.c.st.skills[k] = Math.min(100, x.c.st.skills[k] + v); };
const SKILL_EN = { logic: "Logic", fitness: "Fitness", charm: "Charm", creativity: "Creativity" };

storylet("proyek_besar", ["dewasa"], "sedang", { cooldown: 60, cond: working, weight: x => 0.6 + x.t("ambisius") / 80 }, x => {
  const k = mainSkill(x);
  const [, final] = x.ask(`${x.n}'s boss offers them the lead on a big new project. It means long weeks.`,
    { ambil: "Take the lead", tolak: "Pass this time" }, { suportif: "ambil", tegas: "ambil" },
    x.t("ambisius") > 50 ? "ambil" : "tolak");
  if (final === "ambil") {
    skillUp(x, k, 2.5); x.need("mood", -6); x.need("energi", -15);
    if (x.chance(0.35 + x.c.st.skills[k] / 200)) {
      coins(x, 800); x.stat("karier", 1.5);
      x.say(`The project ships on time. ${x.n} gets a bonus of 800 coins and a lot of new respect at work.`);
      x.remember("Led a big project at work, and it worked.");
    } else {
      x.say(`The project drags past its deadline. ${x.n} learned a lot, but nobody is celebrating.`);
      x.remember("Led a big project at work. It was rough.");
    }
  } else {
    x.need("mood", 3);
    x.say(`${x.n} lets a coworker take it. Evenings stay free for now.`);
  }
});

storylet("rekan_curang", ["dewasa"], "sedang", { cooldown: 90, cond: working }, x => {
  const who = x.pick(NAMES);
  x.say(`In a meeting, ${who} presents ${x.n}'s idea as their own.`);
  const [, final] = x.ask(`What should ${x.n} do?`,
    { hadapi: "Talk to them directly", bos: "Tell the boss", diam: "Let it go" },
    { suportif: "hadapi", tegas: "bos" }, x.t("penakut") > 55 ? "diam" : x.t("impulsif") > 55 ? "bos" : "hadapi");
  if (final === "hadapi") {
    x.trait("penakut", -1); skillUp(x, "charm", 1);
    x.say(`${x.n} catches ${who} after the meeting. ${who} goes red and credits ${x.n} in the next email.`);
  } else if (final === "bos") {
    x.stat("karier", 0.8); x.need("mood", -2);
    x.say(`The boss sorts it out quietly. ${x.n} gets the credit, but the office feels a little colder.`);
  } else {
    x.need("mood", -6); x.trait("penakut", 1);
    x.say(`${x.n} says nothing and stews about it all evening.`);
  }
});

storylet("disuruh_curang", ["dewasa"], "sedang", { cooldown: 160, cond: working, weight: () => 0.6 }, x => {
  const [, final] = x.ask(`${x.n}'s boss asks them to make the quarterly numbers look "a bit nicer". Nobody would know.`,
    { tolak: "Refuse", ikut: "Do it" }, { suportif: "tolak", tegas: "tolak" }, x.t("patuh") > 60 ? "ikut" : "tolak");
  if (final === "tolak") {
    x.trait("patuh", -1); x.need("mood", -3);
    x.say(`${x.n} says no. The boss is cold for a week, then quietly finds someone else.`);
    x.remember("Refused to fudge the numbers at work.");
  } else {
    coins(x, 400); x.flag("rasa_bersalah", 30);
    x.say(`${x.n} changes a few numbers and gets a 400-coin bonus. They sleep badly that night.`);
  }
});

storylet("mentor_junior", ["dewasa", "tua"], "kecil", { cooldown: 40, cond: x => working(x) && x.c.st.job.level >= 1 }, x => {
  const who = x.pick(NAMES);
  skillUp(x, "charm", 0.8); x.need("mood", 4);
  x.say(`${x.n} spends lunch showing the new hire, ${who}, how things really work. ${who} takes notes on a napkin.`);
});

storylet("burnout", ["dewasa"], "sedang", { cooldown: 120, cond: x => working(x) && x.c.needs.mood < 45, weight: () => 1.5 }, x => {
  x.say(`${x.n} has been tired for weeks. Monday mornings feel heavy.`);
  const [, final] = x.ask(`Take a week off?`, { cuti: "Take the week off", lanjut: "Push through" },
    { suportif: "cuti", tegas: "lanjut" }, x.t("rajin") > 60 ? "lanjut" : "cuti");
  if (final === "cuti") {
    x.need("mood", 18); x.need("energi", 30); coins(x, -300);
    x.say(`${x.n} sleeps in, cooks, and walks a lot. They come back lighter, 300 coins poorer.`);
  } else {
    x.stat("karier", 0.6); x.need("mood", -5); x.stat("kesehatan", -1.5);
    x.say(`${x.n} pushes through. The work gets done, but the dark circles stay.`);
  }
});

storylet("kelas_malam", ["dewasa"], "sedang", { cooldown: 150, cond: x => !!x.c.st && !x.c.info.kelas && wallet(x) >= 300 }, x => {
  const opts = { logic: "Coding class", creativity: "Pottery class", charm: "Public speaking", fitness: "Boxing gym" };
  const low = Object.keys(opts).sort((a, b) => x.c.st.skills[a] - x.c.st.skills[b])[0];
  x.say(`The community center has evening classes this season. 300 coins for six weeks.`);
  const [, final] = x.ask(`Which class should ${x.n} take?`, { ...opts, tidak: "None this time" },
    { suportif: low, tegas: "logic" }, x.t("ambisius") > 45 ? low : "tidak");
  if (final === "tidak") { x.say(`${x.n} keeps their evenings free.`); return; }
  coins(x, -300);
  x.c.info.kelas = { skill: final, label: opts[final], end: x.day + 42 };
  skillUp(x, final, 1);
  x.say(`${x.n} signs up for ${opts[final].toLowerCase()}. First class is Tuesday.`);
});

storylet("kelas_selesai", ["dewasa", "tua"], "sedang", { priority: true, cond: x => !!x.c.info.kelas && x.day >= x.c.info.kelas.end }, x => {
  const K = x.c.info.kelas; delete x.c.info.kelas;
  const done = x.chance(0.55 + x.t("rajin") / 200);
  if (done) {
    skillUp(x, K.skill, 5); x.need("mood", 8);
    x.say(`${x.n} finishes ${K.label.toLowerCase()} and gets a little certificate. ${SKILL_EN[K.skill]} went up a lot.`);
    x.remember(`Finished ${K.label.toLowerCase()}.`);
  } else {
    skillUp(x, K.skill, 1.5);
    x.say(`${x.n} stopped going to ${K.label.toLowerCase()} halfway through. Still picked up a few things.`);
  }
});

storylet("maraton_daftar", ["dewasa"], "sedang", { cooldown: 200, cond: x => !!x.c.st && !x.c.info.maraton }, x => {
  x.say(`Posters are up all over town: the Old Town Marathon is in three weeks.`);
  const [, final] = x.ask(`Should ${x.n} sign up?`, { daftar: "Sign up and train", nonton: "Cheer from the side" },
    { suportif: "daftar", tegas: "daftar" }, x.t("ambisius") > 50 ? "daftar" : "nonton");
  if (final === "daftar") {
    x.c.info.maraton = { day: x.day + 21 };
    x.say(`${x.n} buys new running shoes and starts training before work.`);
  } else x.say(`${x.n} says they'll bring snacks for the runners.`);
});

storylet("maraton_hari_h", ["dewasa", "tua"], "sedang", { priority: true, cond: x => !!x.c.info.maraton && x.day >= x.c.info.maraton.day }, x => {
  delete x.c.info.maraton;
  const f = x.c.st.skills.fitness + x.c.st.genes.talent.fitness * 3 + x.rng.uniform(-10, 10);
  if (f > 85) {
    x.say(`${x.n} finishes the Old Town Marathon in the top ten! Strangers high-five them at the finish.`);
    STX().achieve(x, "maraton_top_" + x.day, "Top ten at the Old Town Marathon.");
    x.need("mood", 15);
  } else if (f > 45) {
    x.say(`${x.n} finishes the marathon, slow and proud. The medal goes on the fridge.`);
    x.remember("Finished the Old Town Marathon."); x.need("mood", 10);
  } else {
    x.say(`${x.n} walks the last five kilometers but crosses the line. Their legs hurt for three days.`);
    x.need("energi", -20); x.need("mood", 4);
  }
  skillUp(x, "fitness", 2);
});

storylet("tawaran_investasi", ["dewasa", "tua"], "sedang", { cooldown: 180, cond: x => wallet(x) >= 1500 }, x => {
  const who = x.pick(NAMES), idea = x.pick(["a bubble tea chain", "a phone app for pets", "a mushroom farm", "a tiny cinema"]);
  const [, final] = x.ask(`An old friend, ${who}, wants 1,000 coins to start ${idea}.`,
    { invest: "Invest 1,000", tolak: "Politely say no" }, { suportif: "invest", tegas: "tolak" },
    x.t("impulsif") > 55 ? "invest" : "tolak");
  if (final === "invest") {
    coins(x, -1000);
    if (x.chance(0.35)) { coins(x, 2600); x.say(`${idea[0].toUpperCase() + idea.slice(1)} takes off. ${x.n} gets 2,600 coins back.`); x.remember(`Invested in ${who}'s ${idea}. It paid off.`); }
    else { x.say(`${who}'s ${idea} closes after a few months. The money is gone, the friendship survives.`); }
  } else x.say(`${who} understands. They still send ${x.n} a postcard.`);
});

storylet("mobil_mogok", ["dewasa", "tua"], "kecil", { cooldown: 120, cond: x => wallet(x) >= 200 }, x => {
  coins(x, -Math.min(wallet(x), 250)); x.need("mood", -3);
  x.say(x.pick([`The fridge dies on the hottest day of the year. A new one costs ${x.n} 250 coins.`,
    `The roof leaks during a storm. Fixing it costs 250 coins and a whole Saturday.`]));
});

storylet("relawan", ["dewasa", "tua"], "kecil", { cooldown: 45 }, x => {
  skillUp(x, "charm", 0.6); x.need("mood", 6); x.stat("reputasi", 1);
  x.say(x.pick([`${x.n} spends Saturday helping at the animal shelter and comes home covered in fur.`,
    `${x.n} volunteers at the town library sale. They buy three books they didn't need.`]));
});

storylet("lomba_hobi", ["dewasa", "tua"], "sedang", { cooldown: 100, cond: x => !!x.c.st && x.c.st.skills.creativity > 30 }, x => {
  const what = x.pick(["the neighborhood baking contest", "the street photo contest", "the autumn craft fair"]);
  const [, final] = x.ask(`${x.n} could enter ${what}.`, { ikut: "Enter", skip: "Skip it" },
    { suportif: "ikut", tegas: "ikut" }, x.t("penakut") > 60 ? "skip" : "ikut");
  if (final === "skip") return x.say(`${x.n} goes to look, and quietly thinks they could have won.`);
  const s = x.c.st.skills.creativity + x.c.st.genes.talent.creativity * 3 + x.rng.uniform(-15, 15);
  if (s > 75) { coins(x, 300); x.say(`${x.n} wins first place at ${what}! 300 coins and a ribbon.`); x.remember(`Won ${what}.`); x.need("mood", 12); }
  else if (s > 50) { x.say(`${x.n} gets an honorable mention at ${what}.`); x.need("mood", 6); }
  else { x.say(`${x.n} doesn't place at ${what}, but meets two people who share the hobby.`); }
  skillUp(x, "creativity", 1);
});

storylet("tetangga_baru", ["dewasa", "tua"], "kecil", { cooldown: 60, cond: x => count_teman(x) < 4 }, x => {
  const [nid, npc] = x.world.make_npc(x.c, x.day, "teman");
  x.c.relations[nid] = { nama: npc.nama, tipe: "teman", skor: 45, sejak: x.day };
  x.say(`A new neighbor, ${npc.nama}, moves in next door. ${x.n} brings over a plate of cookies.`);
  x.with_npc(nid, `Moved in next to ${x.n}.`);
});

storylet("ribut_pasangan", GROWN, "sedang", { cooldown: 70, cond: x => married(x) }, x => {
  const p = x.c.partner(), topic = x.pick(["money", "whose turn it is to do the dishes", "where to spend the holidays", "being home too late"]);
  x.say(`${x.n} and ${p.nama} have a real argument about ${topic}.`);
  const [, final] = x.ask(`How should ${x.n} handle it?`, { minta_maaf: "Apologize first", bicara: "Talk it through", diam: "Give it a day" },
    { suportif: "bicara", tegas: "bicara" }, x.t("setia") > 60 ? "minta_maaf" : x.t("impulsif") > 60 ? "diam" : "bicara");
  if (final === "minta_maaf") { p.skor = Math.min(100, p.skor + 4); x.need("mood", -1); x.say(`${x.n} apologizes. ${p.nama} hugs them and apologizes too.`); }
  else if (final === "bicara") { p.skor = Math.min(100, p.skor + 6); x.say(`They talk until midnight and make a plan together. It feels better than before.`); }
  else { p.skor = Math.max(0, p.skor - 5); x.say(`The house is quiet for a day. Things go back to normal, mostly.`); }
});

storylet("hari_jadi", GROWN, "kecil", { cooldown: 120, cond: x => married(x) }, x => {
  const p = x.c.partner();
  const [, final] = x.ask(`It's ${x.n} and ${p.nama}'s anniversary.`, { mewah: "Fancy dinner (200 coins)", rumah: "Cook at home" },
    { suportif: "rumah", tegas: "rumah" }, x.t("impulsif") > 55 ? "mewah" : "rumah");
  if (final === "mewah" && wallet(x) >= 200) { coins(x, -200); p.skor = Math.min(100, p.skor + 6); x.say(`Candles, tiny portions, and a lot of laughing. ${p.nama} keeps the receipt as a souvenir.`); }
  else { p.skor = Math.min(100, p.skor + 4); x.say(`${x.n} cooks ${p.nama}'s favorite. It's a little burnt and perfect.`); }
});

storylet("anak_sakit_malam", GROWN, "sedang", { cooldown: 60, cond: x => working(x) && kids_here(x).some(k => k.age(x.day) < 180) }, x => {
  const k = x.pick(kids_here(x).filter(k => k.age(x.day) < 180));
  const [, final] = x.ask(`${k.name} wakes up with a fever. ${x.n} has an important meeting this morning.`,
    { rumah: "Stay home with them", kerja: "Go to the meeting" }, { suportif: "rumah", tegas: "kerja" },
    x.t("setia") > 50 ? "rumah" : "kerja");
  if (final === "rumah") { k.bond = Math.min(100, k.bond + 1.5); x.stat("karier", -0.4); x.say(`${x.n} stays home making soup. ${k.name} falls asleep on their lap.`); }
  else { x.stat("karier", 0.6); k.bond = Math.max(0, k.bond - 1); x.say(`${x.n} goes to the meeting and calls home three times. ${k.name} is fine, but asked where they were.`); }
});

// ---------------------------------------------------------------- tambalan ritme (Blok A nomor 8)
// Sim ritme nunjukin tiga lubang: 17 hari pertama tanpa momen positif (cuma 6 storylet bayi yang muter),
// masa kuliah (hari ~330–480) hampir tanpa kejadian berarti, dan fase tua yang 71% harinya cuma ambient.
// Tonggak bayi: malam pertama tetap di sini (hari 1). Senyum, ketawa, kenal nama, duduk, kata dan langkah pertama pindah ke tonggak.js (v45):
// jendela umur per tonggak, harinya dari benih makhluk, tampil di baris Soon dan tangga profil.
storylet("malam_pertama", ["bayi"], "sedang", { once: true, priority: true, cond: x => x.age >= 1 }, x => {
  const t = x.t("penakut") > 55;
  x.say(x.attended
    ? `${x.n}'s first night home. ${t ? "They wake up twice, blinking at the dark, and settle only when they hear your voice." : "They sleep straight through, curled up in the corner of the basket like they've always lived here."}`
    : `${x.n}'s first night home. They slept with their nose pressed against the side of the basket, facing the door.`);
  if (x.attended) x.bond(2);
  x.remember("First night home.");
});



// variasi hari biasa bayi, supaya enam storylet lama nggak muter terus
storylet("cermin", ["bayi"], "kecil", { cooldown: 12 }, x => {
  x.say(x.pick([`${x.n} finds the mirror and spends the morning trying to befriend the baby in it.`,
    `${x.n} discovers the mirror, gets startled, then boops noses with their reflection.`]));
  x.trait("ramah", 0.3);
});

storylet("tidur_aneh", ["bayi"], "kecil", { cooldown: 9 }, x => {
  const spot = x.pick(["the laundry basket", "a shoe", "the cat's spot by the window", "a drawer that was left open"]);
  x.say(`${x.n} falls asleep in ${spot}. You take a photo before moving them.`);
  x.need("energi", 10);
});

storylet("ngejar_kupu", ["bayi"], "kecil", { cooldown: 10, cond: x => x.age >= 20 }, x => {
  x.say(x.pick([`${x.n} crawls after a butterfly across the whole yard and loses it at the fence. Furious.`,
    `A butterfly lands on ${x.n}'s nose. They go cross-eyed trying to see it.`]));
  x.trait("kreatif", 0.3);
});

// Masa kuliah: dulu cuma satu storylet kecil. Sekarang ada ujian (keputusan), klub, kerja paruh waktu, dan skripsi.
const kuliah = x => !!x.c.info.kuliah_aktif;
storylet("kampus_ujian", ["dewasa"], "sedang", { cooldown: 40, cond: kuliah, weight: () => 1.6 }, x => {
  x.say(`Exam week at college. ${x.n} has three papers and one night.`);
  const [, final] = x.ask("What should they do the night before?", { begadang: "Pull an all-nighter", tidur: "Sleep, trust the notes" },
    { suportif: "tidur", tegas: "begadang" }, x.t("rajin") > 55 ? "tidur" : "begadang");
  const base = x.c.stats.kecerdasan / 100 * 0.6 + x.t("rajin") / 100 * 0.3 + (final === "tidur" ? 0.1 : 0.02);
  if (x.chance(base)) {
    x.say(final === "tidur" ? `${x.n} walks in rested and aces all three. The notes were enough.` : `${x.n} aces the papers on four hours of sleep and sleeps through the whole next day.`);
    x.stat("kecerdasan", 1.5); x.need("mood", 6);
  } else {
    x.say(final === "tidur" ? `${x.n} scrapes through two papers and has to retake the third next month.` : `${x.n} falls asleep in the second paper and has to retake it next month.`);
    x.stat("kecerdasan", 0.5); x.need("mood", -6);
  }
});

storylet("kampus_organisasi", ["dewasa"], "sedang", { once: true, cond: kuliah, weight: () => 1.4 }, x => {
  const t = x.c.traits;
  const club = t.kreatif > 60 ? ["the theater club", "kreatif"] : t.ramah > 60 ? ["the student council", "ramah"] : t.ambisius > 60 ? ["the debate team", "ambisius"] : ["the hiking club", "penakut"];
  x.say(`${x.n} joins ${club[0]} and comes home with a lanyard, a group chat, and no free evenings.`);
  x.trait(club[1], club[1] === "penakut" ? -1 : 1);
  x.remember(`Joined ${club[0]} at college.`);
});

storylet("kampus_kerja_sambilan", ["dewasa"], "sedang", { cooldown: 200, cond: x => kuliah(x) && !!x.c.st }, x => {
  x.say(`The campus café is hiring students for weekend shifts. 90 coins a week.`);
  const [, final] = x.ask(`Should ${x.n} take it?`, { ambil: "Take the shifts", fokus: "Focus on studying" },
    { suportif: "ambil", tegas: "fokus" }, x.t("rajin") > 50 ? "ambil" : "fokus");
  if (final === "ambil") {
    coins(x, 360); skillUp(x, "charm", 1);
    x.say(`${x.n} works four weekends at the café. Tips are small, the regulars are not.`);
    x.remember("First part-time job, at the campus café.");
  } else x.say(`${x.n} keeps the weekends for the library and the occasional nap.`);
});

storylet("kampus_skripsi", ["dewasa"], "sedang", { once: true, priority: true, cond: x => kuliah(x) && x.day >= (x.c.info.siap_kerja ?? 0) - 35 }, x => {
  const topic = x.pick(["why Old Town's river changes color", "the economics of the Bazaar drops", "how the town's bread got so good", "what makes a song stick in your head"]);
  x.say(`Thesis crunch. ${x.n} is writing about ${topic} and has rewritten the first page nine times.`);
  x.need("mood", -4);
  x.remember(`Wrote a thesis on ${topic}.`);
});

storylet("kampus_teman_sekamar", ["dewasa"], "kecil", { cooldown: 18, cond: kuliah }, x => {
  x.say(x.pick([`${x.n}'s roommate cooks instant noodles at 3 a.m. and offers to share. ${x.n} accepts.`,
    `${x.n} and the roommate argue about the thermostat, then make up over dumplings.`,
    `${x.n} borrows the roommate's notes and returns them with doodles in the margins.`]));
  x.trait("ramah", 0.3);
});

// Gap year: dulu cuma cerita_perjalanan (kecil). Sekarang ada puncak perjalanan dan satu keputusan uang.
const gap = x => x.c.info.jalur === "gap" && x.day < (x.c.info.siap_kerja ?? 0);
storylet("gap_puncak", ["dewasa"], "sedang", { once: true, cond: gap, weight: () => 1.5 }, x => {
  const sight = x.pick(["a lake so still it looks like a second sky", "a village where every roof is painted blue", "a night market that goes on until sunrise", "a lighthouse at the end of the world"]);
  x.say(`${x.n} reaches ${sight}. They sit there for an hour and don't take a single photo. Then they take forty.`);
  x.need("mood", 10); x.trait("kreatif", 1);
  x.remember(`Saw ${sight} on the gap year.`);
});
storylet("gap_pilihan", ["dewasa"], "sedang", { cooldown: 45, cond: x => gap(x) && !!x.c.st }, x => {
  x.say(`${x.n} finds a boat trip to the far islands. 150 coins, five days, no phone signal.`);
  const [, final] = x.ask("Go, or save the money?", { pergi: "Go, you only get one gap year", hemat: "Save it, the islands will wait" },
    { suportif: "pergi", tegas: "hemat" }, x.t("impulsif") > 50 ? "pergi" : "hemat");
  if (final === "pergi" && wallet(x) >= 150) { coins(x, -150); x.need("mood", 8); x.say(`Five days of salt, sunburn, and the best sleep of ${x.n}'s life.`); x.remember("Took the boat to the far islands."); }
  else if (final === "pergi") { x.say(`${x.n} counts the coins twice. Not enough. They watch the boat leave from the pier.`); x.need("mood", -4); }
  else x.say(`${x.n} keeps the money and swims at the public beach instead. Also good.`);
});

// Fase tua: dulu 71% harinya cuma ambient. Sekarang ada memoar (dua babak), resep keluarga, dan kebun.
storylet("tulis_memoar", ["tua"], "sedang", { once: true, cond: x => x.c.memory.length >= 6, weight: () => 1.3 }, x => {
  x.c.info.memoar = { day: x.day + 45 };
  x.say(`${x.n} buys a thick notebook and starts writing things down, from the very beginning. "Before I forget."`);
  x.remember("Started writing a memoir.");
});

storylet("memoar_selesai", ["tua"], "sedang", { priority: true, cond: x => !!x.c.info.memoar && x.day >= x.c.info.memoar.day }, x => {
  delete x.c.info.memoar;
  const fam = kids_here(x).concat(grandkids_here(x));
  x.say(fam.length
    ? `${x.n} finishes the memoir and reads the first chapter out loud after dinner. ${fam[0].name} asks for the next one tomorrow.`
    : `${x.n} finishes the memoir and reads the first chapter out loud to the empty kitchen. Then to you, on the phone.`);
  x.need("mood", 10);
  x.remember("Finished the memoir.");
  if (STX()) STX().achieve(x, "memoar", "Wrote a memoir.");
});

storylet("warisan_resep", ["tua"], "sedang", { cooldown: 150, cond: x => kids_here(x).length + grandkids_here(x).length > 0 }, x => {
  const who = kids_here(x).concat(grandkids_here(x))[0], dish = x.pick(["the Sunday stew", "the sticky ginger cake", "the pickled radish", "the rain-day soup"]);
  x.say(`${x.n} teaches ${who.name} how to make ${dish}, the real way, with the step nobody writes down.`);
  x.bond(1);
  x.remember(`Passed ${dish} down to ${who.name}.`);
});

storylet("kebun_tua", ["tua"], "kecil", { cooldown: 25 }, x => {
  x.say(x.pick([`${x.n}'s tomatoes finally come in. They give half of them away and brag about the other half.`,
    `${x.n} spends the morning arguing with a snail over the lettuce.`,
    `${x.n} plants a tree they know they'll never see full grown, and says so, cheerfully.`]));
  x.need("mood", 3);
});

const Storylets = { ALL, GROWN, married, kids_here, grandkids_here, _farewell };
if (typeof module !== "undefined") module.exports = Storylets;
else globalThis.Storylets = Storylets;
})();

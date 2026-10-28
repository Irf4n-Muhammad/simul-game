// obrolan.js (v48): pertanyaan harian makhluk ke pemain, yang membuka Ngobrol. Makhluk yang mulai duluan; pemain jawab satu ketukan.
// Fungsi murni seperti balik.js: menerima potret, mengembalikan pembuka atau reaksi. Bedanya dengan balik.js: ini tentang hidup
// MAKHLUK (sekolah, teman, takut gelap), muncul tiap hari, dan jawabannya jadi aksi `tanya:<id>:<sifat><+|->` yang di-replay
// (game.js), jadi tiap jawaban menggeser satu sifat sedikit. Setelah ratusan hari, sifat anak itu kumpulan jawaban pemain.
//
//   Obrolan.opener(S)        -> { id, mode: "kata"|"keadaan", text, opts: [{ k, label, t }] } atau null kalau hari ini sudah dijawab
//   Obrolan.react(S, id, k)  -> satu kalimat reaksi (bayi: aksi dalam *bintang*)
//   Obrolan.act(id, opt)     -> kunci aksi "tanya:<id>:<sifat><+|->" (opt dari opener)
//   Obrolan.parse(kind)      -> { id, trait, sign } atau null; dipakai game.js
//   Obrolan.describe(id, t, nama) -> "pertanyaan -> jawaban" buat konteks Ngobrol AI (tanya_log)
//   Potret S: d hari ini, cid, nama, fase, seed (akun), traits { ... } 0..100, last hari terakhir dijawab (c.info.tanya_hari) atau null,
//             ctx { ujian: { hari, label } | null, sahabat: nama | null, dunia: nama event aktif | null, sekolah: label | null }
//
// Bayi tidak bicara: pembukanya keadaan ("*Tutu is crying in the middle of the night.*") dan jawabannya tindakan pemain.
// Pertanyaan konteks (ujian ≤ 3 hari, sahabat, event dunia) didahulukan di hari yang benihnya cocok, sisanya dari daftar per fase.
// Urutan daftar = permutasi per siklus dari benih makhluk, jadi dalam satu siklus tidak ada yang terulang.
"use strict";
(() => {
  const TRAITS = ["rajin", "impulsif", "setia", "ambisius", "ramah", "penakut", "patuh", "kreatif"];
  const STEP = 0.4;   // geseran sifat per jawaban (sifat 5..95); dipakai game.js
  const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  // o(k, label, t, r): t = "<sifat><+|->" yang digeser, r = reaksi
  const o = (k, label, t, r) => ({ k, label, t, r });
  const BANK = {
    bayi: [
      { id: "b_malam", q: n => `${n} is crying in the middle of the night.`, opts: [o("gendong", "Pick them up and rock", "setia+", "*snuggles in and goes quiet*"), o("nyanyi", "Sing softly from the door", "kreatif+", "*hiccups, listens, then sighs*"), o("biar", "Let them settle on their own", "penakut-", "*fusses a little, then sleeps*")] },
      { id: "b_bola", q: n => `${n} keeps reaching for the ball on the shelf.`, opts: [o("kasih", "Hand it over", "impulsif+", "*squeals and hugs the ball*"), o("coba", "Let them try to reach it", "rajin+", "*stretches, wobbles, grabs it!*"), o("main", "Roll it back and forth together", "ramah+", "*giggles every time it comes back*")] },
      { id: "b_sendok", q: n => `${n} pushes the spoon away at lunch.`, opts: [o("nanti", "Try again in a bit", "patuh+", "*opens wide the second time*"), o("pesawat", "Make the spoon a little plane", "kreatif+", "*watches the plane, mouth open*"), o("lain", "Offer something else", "impulsif+", "*grabs the banana instead*")] },
      { id: "b_tamu", q: n => `${n} is staring at a stranger at the door.`, opts: [o("peluk", "Hold them close", "penakut+", "*hides their face in your shoulder*"), o("dadah", "Wave together", "ramah+", "*waves with the whole arm*"), o("lihat", "Let them watch", "setia-", "*stares, then smiles a tiny smile*")] },
      { id: "b_gelas", q: n => `${n} drops a cup on purpose and looks right at you.`, opts: [o("jangan", "Say no, gently", "patuh+", "*pouts, then lets it go*"), o("ketawa", "Laugh", "ramah+", "*laughs back and drops it again*"), o("balikin", "Hand it back", "impulsif+", "*drops it again, delighted*")] },
      { id: "b_burung", q: n => `${n} babbles at the window, pointing at the birds.`, opts: [o("nama", "Name the birds", "rajin+", "*\"bu... bur...\"*"), o("ngoceh", "Babble back", "ramah+", "*babbles louder, very serious*"), o("keluar", "Take them outside to look", "kreatif+", "*goes completely still, watching*")] },
      { id: "b_jari", q: n => `${n} won't let go of your finger.`, opts: [o("tunggu", "Stay a while", "setia+", "*holds on, eyes closing*"), o("gelitik", "Tickle them", "ramah+", "*shrieks with joy*"), o("lepas", "Gently let go", "penakut-", "*looks surprised, then grabs a toy*")] },
      { id: "b_balok", q: n => `${n} is banging two blocks together. Loudly.`, opts: [o("menara", "Build a tower with them", "rajin+", "*knocks it down, proud*"), o("musik", "Clap along like it's music", "kreatif+", "*bangs to the beat, sort of*"), o("biar", "Let them bang away", "impulsif+", "*BANG. BANG. BANG.*")] },
      { id: "b_merangkak", q: n => `${n} is crawling toward the stairs.`, opts: [o("angkat", "Scoop them up", "penakut+", "*protests, kicking*"), o("jaga", "Let them explore, close behind", "ambisius+", "*reaches the first step, triumphant*"), o("alih", "Roll a toy the other way", "impulsif+", "*turns around for the toy*")] },
      { id: "b_cermin", q: n => `${n} found the mirror and is talking to the baby in it.`, opts: [o("itu_kamu", "Say \"that's you!\"", "rajin+", "*pats the mirror, puzzled*"), o("muka", "Make funny faces together", "kreatif+", "*copies your face, badly*"), o("biar", "Let them chat", "ramah+", "*babbles a long story to the mirror*")] },
    ],
    anak: [
      { id: "a_pr", q: (n, S) => `${(S && S.ctx && S.ctx.sahabat) || "My friend"} wants to play, but my homework isn't done.`, opts: [o("pr", "Homework first", "rajin+", "Okay... I'll be quick."), o("main", "Go play, homework after", "impulsif+", "Yesss! I'll do it after. Promise."), o("bareng", "Do homework together first", "ramah+", "Ooh, good idea. Then we play!")] },
      { id: "a_gelap", q: n => `I'm scared of the dark tonight.`, opts: [o("lampu", "We'll leave a light on", "penakut+", "Just a small one. Thank you."), o("temani", "I'll stay until you fall asleep", "setia+", "Don't go yet, okay?"), o("berani", "You're braver than the dark", "penakut-", "...Really? Okay. I'll try.")] },
      { id: "a_langit", q: n => `Why is the sky blue?`, opts: [o("jelasin", "Explain how light works", "rajin+", "So the blue bounces the most? Whoa."), o("cerita", "Make up a story about it", "kreatif+", "A giant painted it? I knew it!"), o("cari", "Let's find out together", "ambisius+", "Can we look it up right now?")] },
      { id: "a_gambar", q: n => `Someone at school said my drawing is ugly.`, opts: [o("terus", "Keep drawing what you like", "kreatif+", "I'll draw a dragon. A BIG one."), o("guru", "Tell the teacher", "patuh+", "Okay. Tomorrow I'll tell her."), o("hadiah", "Draw them one as a gift", "ramah+", "Then they can't say it's ugly!")] },
      { id: "a_pecah", q: n => `I broke a cup. Are you mad?`, opts: [o("beresin", "Not mad. Let's clean it up", "setia+", "I'll hold the dustpan."), o("hati2", "Be more careful next time", "patuh+", "I will. Sorry."), o("kenapa", "What happened?", "rajin+", "I was trying to carry three at once...")] },
      { id: "a_cita", q: n => `I want to be a superhero when I grow up.`, opts: [o("bisa", "You can be anything", "ambisius+", "Then I'll be the strongest one."), o("kekuatan", "What's your power?", "kreatif+", "Talking to animals. And flying. Both."), o("belajar", "Heroes study hard too", "rajin+", "Even Captain Tail? ...Okay.")] },
      { id: "a_sekolah", q: n => `I don't want to go to school today.`, opts: [o("tetap", "We go anyway", "patuh+", "Fine. But I'm sitting by the window."), o("kenapa", "What's wrong?", "setia+", "Nothing. Okay, a little something."), o("semangat", "Find one fun thing there today", "ambisius+", "Art class! I forgot about art class.")] },
      { id: "a_begadang", q: n => `Can I stay up late tonight?`, opts: [o("tidak", "No, bedtime is bedtime", "patuh+", "Hmph. Okay."), o("10menit", "Ten more minutes", "impulsif+", "Twenty? ...Ten. Okay, ten."), o("cerita", "One more story, then bed", "kreatif+", "A long one, please.")] },
      { id: "a_bekal", q: n => `I gave my snack to a kid who had none.`, opts: [o("bangga", "I'm proud of you", "ramah+", "It was a really good snack, too."), o("bilang", "Next time tell me, I'll pack two", "setia+", "Two tomorrow? Yes!"), o("lapar", "Weren't you hungry?", "ambisius-", "A little. But she looked sadder.")] },
      { id: "a_sepeda", q: n => `I fell off my bike. It hurts.`, opts: [o("lagi", "Let's try again tomorrow", "penakut-", "Tomorrow. With you holding the back."), o("obat", "Let me see. Plaster time", "setia+", "The dinosaur plaster, please."), o("pelan", "Go slower next time", "patuh+", "Slower. Okay. Slower.")] },
      { id: "a_hewan", q: n => `Can we get a dog?`, opts: [o("nanti", "Maybe when you're older", "patuh+", "How much older? Like, next week?"), o("nama", "What would you name it?", "kreatif+", "Sir Biscuit the Third."), o("rawat", "Only if you help take care of it", "rajin+", "I'd walk it every day. Every. Day.")] },
      { id: "a_teman_baru", q: n => `There's a new kid in class. Nobody talks to her.`, opts: [o("sapa", "Go say hi tomorrow", "ramah+", "What if she doesn't like me?"), o("ajak", "Invite her to sit with you", "setia+", "I'll save her a seat."), o("biar", "She'll find her friends", "penakut+", "Yeah... maybe.")] },
    ],
    remaja: [
      { id: "r_sepatu", q: n => `Everyone's buying new shoes. I want some too.`, opts: [o("beli", "Okay, let's get them", "impulsif+", "Wait, really? You're the best."), o("nabung", "Save up from your pocket money", "rajin+", "Ugh. Fine. Three weeks, maybe."), o("perlu", "You don't need them to fit in", "patuh+", "Easy for you to say.")] },
      { id: "r_debat", q: n => `I want to join the debate club, but I'm scared of losing.`, opts: [o("ikut", "Just sign up", "penakut-", "Okay. Okay. I'm signing up."), o("latihan", "Practise with me first", "rajin+", "You'd do that? Tonight?"), o("nanti", "Wait till you feel ready", "penakut+", "Yeah. Next term, maybe.")] },
      { id: "r_pesta", q: n => `Can I go to a party on Saturday?`, opts: [o("boleh", "Yes, have fun", "ramah+", "Thank you thank you thank you."), o("jam9", "Yes, home by nine", "patuh+", "Nine?! ...Fine. Nine."), o("tidak", "Not this time", "patuh+", "Everyone else is going.")] },
      { id: "r_bingung", q: n => `I don't know what I want to be.`, opts: [o("gpp", "That's okay at your age", "penakut-", "Okay. Good. I thought I was behind."), o("coba", "Try lots of things", "kreatif+", "Like... pottery? Coding? Both?"), o("uang", "Think about what pays well", "ambisius+", "Hm. Fair. Maybe.")] },
      { id: "r_belajar", q: n => `My friends think studying is lame.`, opts: [o("salah", "They're wrong", "rajin+", "I know. I just don't want to be weird."), o("seimbang", "You can do both", "ramah+", "Study, then hang out. I can do that."), o("teman", "Maybe find friends who get it", "setia-", "...That's kind of harsh. But maybe.")] },
      { id: "r_rambut", q: n => `I dyed my hair. Don't be mad.`, opts: [o("keren", "It looks great", "kreatif+", "Really? I wasn't sure about the green."), o("tanya", "Ask me first next time", "patuh+", "Okay. Sorry. But you like it, right?"), o("hakmu", "It's your hair", "impulsif+", "Exactly. Thank you.")] },
      { id: "r_chirp", q: n => `Someone posted something mean about me on Chirp.`, opts: [o("cuekin", "Ignore it, it'll pass", "penakut-", "I'll try. It's hard."), o("lapor", "Tell a teacher", "patuh+", "Okay. Will you come with me?"), o("balas", "Post something back", "impulsif+", "Oh, I have the perfect reply.")] },
      { id: "r_capek", q: n => `Do you ever get tired of me?`, opts: [o("nggak", "Never", "setia+", "Okay. Just checking."), o("sayang", "Sometimes. I love you anyway", "ramah+", "Ha. Fair. Same, honestly."), o("ngambek", "Only when you sulk", "patuh+", "I don't sulk. ...Okay, sometimes.")] },
      { id: "r_kota", q: n => `I want to go to the city on my own.`, opts: [o("boleh", "Okay, text me when you get there", "penakut-", "I will. Every hour. Maybe."), o("teman", "Take a friend", "ramah+", "I'll ask around. We'll be fine."), o("belum", "Not yet", "patuh+", "When, then? Give me a date.")] },
      { id: "r_hp", q: n => `Can I keep my phone in my room at night?`, opts: [o("boleh", "Yes, I trust you", "setia+", "I won't stay up. Much."), o("dapur", "It charges in the kitchen", "patuh+", "Like a little kid. Great."), o("jam", "Yes, but off by ten", "rajin+", "Ten. Deal.")] },
      { id: "r_band", q: n => `A friend asked me to start a band.`, opts: [o("ayo", "Do it!", "kreatif+", "I'm the drummer. Obviously."), o("nilai", "Only if grades stay up", "rajin+", "They will. Mostly."), o("ribut", "As long as it's not in our garage", "patuh+", "...So, about the garage.")] },
      { id: "r_curhat", q: n => `Can I tell you something without you freaking out?`, opts: [o("dengar", "Always. I'm listening", "setia+", "Okay. I like someone. That's it. Don't."), o("tenang", "I'll try my best", "ramah+", "That's not very reassuring. But okay."), o("nanti", "Is it bad?", "penakut+", "Forget it. It's nothing.")] },
    ],
    dewasa: [
      { id: "d_kerja", q: n => `Work was rough today.`, opts: [o("cerita", "Tell me about it", "setia+", "Long story. Pour me some tea first."), o("istirahat", "Take the evening off", "impulsif+", "Yeah. Nothing tonight. Just soup."), o("lanjut", "Push through, it'll pay off", "rajin+", "I know. I'm going back at it tomorrow.")] },
      { id: "d_pindah", q: n => `I'm thinking about changing jobs.`, opts: [o("gas", "Go for it", "ambisius+", "You think so? I'm updating my profile."), o("nabung", "Save up first", "rajin+", "Smart. Three months of savings, then."), o("aman", "Stay where it's safe", "penakut+", "Yeah. Safe is good. For now.")] },
      { id: "d_uang", q: n => `Save or spend this month?`, opts: [o("simpan", "Save it", "rajin+", "Boring. Correct, but boring."), o("jajan", "Treat yourself a little", "impulsif+", "Just one nice dinner. I earned it."), o("investasi", "Put it to work", "ambisius+", "I've been reading about that.")] },
      { id: "d_teman", q: n => `An old friend messaged me out of nowhere.`, opts: [o("telepon", "Call them back", "ramah+", "We talked for an hour. It was nice."), o("hati2", "Careful, people change", "penakut+", "True. I'll keep it light."), o("pelan", "Take your time replying", "patuh+", "I'll reply this weekend.")] },
      { id: "d_belajar", q: n => `I want to learn something new.`, opts: [o("lukis", "Painting", "kreatif+", "My first one will be terrible. Good."), o("bahasa", "A new language", "rajin+", "Fifteen minutes a day. I can do that."), o("kerja", "Something for your career", "ambisius+", "A certificate. Practical. Yes.")] },
      { id: "d_okay", q: n => `Do you think I'm doing okay?`, opts: [o("hebat", "You're doing great", "setia+", "Thanks. I needed that today."), o("lebih", "Better than you think", "penakut-", "Huh. Maybe I am."), o("dorong", "Keep pushing, you're close", "ambisius+", "Close to what? ...Okay. Pushing.")] },
      { id: "d_kecil", q: n => `I miss being little sometimes.`, opts: [o("sama", "Me too", "setia+", "Remember the blanket fort?"), o("main", "Go play a bit today", "impulsif+", "There's a swing in the park. Don't judge me."), o("masih", "You still are, a bit", "kreatif+", "Ha. Don't tell my boss.")] },
      { id: "d_ide", q: n => `Someone at work took credit for my idea.`, opts: [o("bicara", "Speak up", "penakut-", "Tomorrow, first thing. Politely."), o("biar", "Let it go this time", "patuh+", "Fine. But I'm writing things down now."), o("lebih", "Come back with a better one", "ambisius+", "Oh, I have a better one.")] },
    ],
    tua: [
      { id: "t_kecil", q: n => `Do you remember when I was little?`, opts: [o("tiap", "Every day", "setia+", "I was a handful, wasn't I."), o("favorit", "Tell me your favourite memory", "ramah+", "The first snow. I tried to eat all of it."), o("nakal", "You were trouble", "impulsif+", "Ha! Still am.")] },
      { id: "t_lutut", q: n => `My knees hurt in the mornings now.`, opts: [o("pelan", "Take it slow", "penakut+", "Slow is my speed now anyway."), o("jalan", "A short walk every day", "rajin+", "Around the block. Every day. Fine."), o("dokter", "Let's see the doctor", "patuh+", "If you come with me.")] },
      { id: "t_cerita", q: n => `I want to write down our family stories.`, opts: [o("tulis", "Do it", "kreatif+", "Chapter one: the egg."), o("lucu", "Start with the funny ones", "ramah+", "The cake disaster, then."), o("bantu", "I'll help", "setia+", "Sunday afternoons. You and me.")] },
      { id: "t_kebun", q: n => `The garden needs work again.`, opts: [o("bantu", "I'll help this weekend", "setia+", "Bring gloves. The roses bite."), o("baru", "Plant something new", "kreatif+", "Tomatoes. Big ones."), o("liar", "Let it grow wild", "impulsif+", "Wild it is. The bees will thank us.")] },
      { id: "t_ingat", q: n => `Do you think they'll remember me?`, opts: [o("selalu", "Always", "setia+", "That's all I want."), o("pastikan", "Let's make sure of it", "ambisius+", "Then I'd better finish that photo album."), o("sayang", "They already love you", "ramah+", "They do, don't they.")] },
      { id: "t_kawan", q: n => `I saw an old friend in town today.`, opts: [o("undang", "Invite them over", "ramah+", "Tea on Thursday. I'll bake."), o("ngobrol", "What did you talk about?", "setia+", "The old days. And our knees."), o("lagi", "Go see them again", "impulsif+", "Tomorrow, then. Why wait.")] },
    ],
  };
  // pertanyaan konteks: dibuat dari potret, didahulukan kalau cocok
  const CTX = [
    { id: "x_ujian", when: S => S.ctx && S.ctx.ujian && S.ctx.ujian.hari - S.d >= 0 && S.ctx.ujian.hari - S.d <= 3 && (S.fase === "anak" || S.fase === "remaja"),
      q: S => `There's ${S.ctx.ujian.label} ${S.ctx.ujian.hari === S.d ? "today" : S.ctx.ujian.hari - S.d === 1 ? "tomorrow" : `in ${S.ctx.ujian.hari - S.d} days`}. I'm nervous.`,
      opts: [o("belajar", "Let's study together tonight", "rajin+", "Can you quiz me? Not too hard."), o("tenang", "You'll be fine", "penakut-", "Okay. Deep breath. I'll be fine."), o("terbaik", "Just do your best, that's enough", "ambisius-", "My best. I can do my best.")] },
    { id: "x_sahabat", when: S => S.ctx && S.ctx.sahabat && (S.fase === "anak" || S.fase === "remaja"),
      q: S => `${S.ctx.sahabat} and I had a fight.`,
      opts: [o("maaf", "Say sorry first", "ramah+", "Even if it was half their fault?"), o("tunggu", "Give it a day", "patuh+", "One day. Then I'll talk to them."), o("kenapa", "What happened?", "setia+", "It's dumb. It was about a pencil.")] },
    { id: "x_dunia", when: S => S.ctx && S.ctx.dunia && S.fase !== "bayi",
      q: S => `Everyone's talking about ${S.ctx.dunia}. Can we go?`,
      opts: [o("ayo", "Let's go together", "ramah+", "Yes! I'll get my shoes."), o("nanti", "If your chores are done", "rajin+", "Doing them right now."), o("lihat", "We'll see", "patuh+", "\"We'll see\" means no. I know that one.")] },
  ];

  const bankFor = fase => BANK[fase] || (fase === "meninggal" || fase === "merantau" ? null : BANK.dewasa);
  function pick(S) {
    const L = bankFor(S.fase); if (!L) return null;
    const salt = hash((S.seed || "") + "|" + (S.cid || "")), d = S.d;
    // konteks: kira-kira 2 dari 5 hari kalau cocok, supaya nggak tiap hari soal ujian
    for (const C of CTX) if (C.when(S) && (hash(salt + C.id + d) % 5) < 2) return { id: C.id, text: C.q(S), opts: C.opts };
    // daftar: permutasi per siklus, jadi dalam satu siklus panjang daftar tidak ada yang terulang
    const n = L.length, cycle = Math.floor(d / n), pos = d % n;
    const order = L.map((q, i) => [hash(salt + ":" + cycle + ":" + i), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const q = L[order[pos]];
    return { id: q.id, text: q.q(S.nama, S), opts: q.opts };
  }
  function opener(S) {
    if (!S || !S.nama || S.last === S.d) return null;
    const P = pick(S); if (!P) return null;
    return { id: P.id, mode: S.fase === "bayi" ? "keadaan" : "kata", text: P.text, opts: P.opts.map(x => ({ k: x.k, label: x.label, t: x.t })) };
  }
  function find(id) { for (const L of Object.values(BANK)) for (const q of L) if (q.id === id) return q; return CTX.find(c => c.id === id) || null; }
  function react(S, id, k) {
    const q = find(id), x = q && q.opts.find(p => p.k === k); if (!x) return null;
    const t = (S && S.traits) || {};
    // anak keras kepala nggak langsung nurut: jawaban yang minta patuh dapet ekor "*doesn't look convinced*"
    if (S && S.fase !== "bayi" && x.t === "patuh+" && (t.patuh ?? 50) < 35) return x.r + " *doesn't look convinced*";
    return x.r;
  }
  const act = (id, opt) => `tanya:${id}:${opt.t}`;
  function parse(kind) {
    const m = /^tanya:([a-z0-9_]+):([a-z]+)([+-])$/.exec(kind || "");
    if (!m || !TRAITS.includes(m[2])) return null;
    return { id: m[1], trait: m[2], sign: m[3] === "+" ? 1 : -1 };
  }
  const size = fase => (bankFor(fase) || []).length;
  // buat konteks Ngobrol AI: "pertanyaan → jawaban pemain" dari satu baris tanya_log [hari, id, "<sifat><+|->"]
  function describe(id, t, nama) {
    const q = find(id), x = q && q.opts.find(p => p.t === t); if (!q || !x) return null;
    const text = typeof q.q === "function" && q.when ? null : q.q(nama || "They", null);
    return text ? `${text} -> ${x.label}` : x.label;
  }

  const API = { BANK, CTX, TRAITS, STEP, opener, react, act, parse, size, describe };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Obrolan = API;
})();

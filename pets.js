// Hewan peliharaan. Tiap makhluk boleh punya satu hewan (c.st.pet). Hewannya punya lapar, senang, sehat, bersih, dan ikatan
// sama pemiliknya. Pemiliknya yang ngerawat tiap hari sesuai sifatnya; pemain cuma kasih saran ("pet:<op>:<arg>") dan
// makhluk dewasa bisa nolak (game._refuse). Hewan mati karena tua atau sakit; kalau pemiliknya meninggal, hewannya pindah
// ke keluarga. Semua acak dari seed, jadi replay sama.
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const ST = (typeof module !== "undefined") ? require("./status.js") : globalThis.Status;
  const { HOOKS, seed_rng, clamp, YEAR } = E;
  const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const r1 = v => Math.round(v * 10) / 10;

  // ---------------------------------------------------------------- jenis hewan
  // life: umur rata-rata (hari), sick: peluang sakit per hari, food: koin makan per hari, smart: cepat belajar trik,
  // roam: suka kabur, shy: gampang stres, price: harga di breeder
  const KINDS = {
    fluff: { label: "Fluffball", ic: "🐹", life: 1.5 * YEAR, sick: 0.006, food: 4, smart: 0.8, roam: 0.3, shy: 0.5, price: 600, color: "#F3D6B0", about: "Sneezes when happy. Cuddly, and catches colds easily." },
    lizard: { label: "Winged lizard", ic: "🦎", life: 2 * YEAR, sick: 0.003, food: 5, smart: 1, roam: 1, shy: 0.3, price: 900, color: "#7BC47F", about: "Curious about everything. Loves an open window a little too much." },
    fish: { label: "Walking fish", ic: "🐟", life: 1 * YEAR, sick: 0.004, food: 2, smart: 0.5, roam: 0.4, shy: 0.4, price: 300, color: "#6FB7E0", about: "Waddles around the house. Calm, cheap, and easy to care for." },
    bunny: { label: "Moss bunny", ic: "🐇", life: 1.5 * YEAR, sick: 0.004, food: 4, smart: 0.7, roam: 0.5, shy: 1, price: 700, color: "#A9C98B", about: "Shy, soft, and smells like a forest. Gets stressed by loud days." },
    turtle: { label: "Pebble turtle", ic: "🐢", life: 6 * YEAR, sick: 0.002, food: 3, smart: 0.4, roam: 0.1, shy: 0.4, price: 1500, color: "#9A8F7C", about: "Slow and steady. Often outlives its owner and stays in the family." },
    owlcat: { label: "Owl-cat", ic: "🦉", life: 2.5 * YEAR, sick: 0.003, food: 6, smart: 2, roam: 0.6, shy: 0.6, price: 1200, color: "#B99BD6", about: "Clever and a little smug. Learns tricks faster than any other pet." },
  };
  const PERS = {
    playful: ["Playful", "Always wants to play. Gets bored fast."],
    lazy: ["Lazy", "Naps all day. Doesn't need much exercise."],
    shy: ["Shy", "Takes a while to trust someone."],
    greedy: ["Greedy", "Will do anything for a snack."],
    loyal: ["Loyal", "Follows their owner everywhere."],
  };
  const NAMES = ["Biscuit", "Pebble", "Nugget", "Puff", "Ziggy", "Tofu", "Bean", "Pickle", "Waffle", "Sprout", "Noodle", "Clove", "Button", "Mango", "Dumpling", "Pip", "Mochi", "Socks", "Juno", "Toast"];
  const TRICKS = ["sit", "roll over", "high five", "fetch the slippers", "play dead", "spin in a circle", "wave hello", "ring a little bell"];
  const ILL = [["a cold", 1], ["an upset tummy", 1], ["a sore paw", 1], ["itchy skin", 1], ["a bad cough", 2], ["a fever", 2], ["a nasty infection", 3]];
  const SHELTER_FEE = 150, VET = 40;
  // dari cerita hewan nyasar (storylets.js)
  const STRAY = { "tiny winged lizard": "lizard", "fluffball that sneezes": "fluff", "fish that walks on land": "fish" };

  const grown = (c, day) => ["dewasa", "tua"].includes(E.phase_of(Math.max(0, day - c.born)));
  const ageOf = (P, day) => day - P.born;
  const lifeOf = P => Math.round(KINDS[P.kind].life * (0.85 + hash(P.id + "life") * 0.3));

  // ---------------------------------------------------------------- dapat hewan
  function make(c, home, day, kind, from, nameHint) {
    const id = "pet-" + c.id + "-" + kind + "-" + day, used = new Set(home.members.filter(m => m.st && m.st.pet).map(m => m.st.pet.name).concat(home.members.map(m => m.name)));
    let name = nameHint || NAMES[Math.floor(hash(id + "n") * NAMES.length)];
    for (let i = 1; used.has(name) && i < 30; i++) name = NAMES[Math.floor(hash(id + "n" + i) * NAMES.length)];
    const pk = Object.keys(PERS);
    return { id, kind, name, from, born: day - (from === "breeder" ? 60 : Math.round(30 + hash(id + "age") * 120)), since: day, owner: c.id,
      pers: pk[Math.floor(hash(id + "p") * pk.length)], hunger: 80, joy: 70, health: 92, clean: 80, bond: from === "stray" ? 30 : 15,
      food: "normal", walk: "some", vet: "sick", tricks: [], sick: null, lost: null, lastVet: day, ribbons: 0,
      card: null, cardD: day, cardLast: null, today: null, hist: [], mem: [] };
  }
  function adopt(c, home, day, kind, from, nameHint) {
    if (!c || !c.st || c.st.pet || !KINDS[kind]) return null;
    const P = make(c, home, day, kind, from, nameHint);
    c.st.pet = P;
    note(P, day, from === "stray" ? "Showed up outside the house and never left." : from === "shelter" ? "Came home from the Old Town shelter." : "Came home from a breeder.");
    return P;
  }
  // shelter: tiga hewan yang ganti tiap minggu (sama buat semua pemain)
  function shelter(day) {
    const w = Math.floor(day / 7), ks = Object.keys(KINDS).filter(k => k !== "turtle"), out = [];
    for (let i = 0; out.length < 3 && i < 20; i++) { const k = ks[Math.floor(hash("shelter" + w + i) * ks.length)]; if (!out.includes(k)) out.push(k); }
    return out;
  }
  const note = (P, day, t) => { P.mem.push([day, t]); if (P.mem.length > 12) P.mem.shift(); };

  // ---------------------------------------------------------------- yang bayar: pemilik, atau orang dewasa terkaya di rumah
  function pay(home, c, day, n) {
    if (n <= 0) return true;
    if (c.st.wallet >= n) { c.st.wallet -= n; return true; }
    if (c.demo) return false;  // mode tes nggak boleh nyentuh dompet keluarga yang asli
    const m = home.members.filter(o => o !== c && o.id !== c.id && o.st && o.alive(day) && !("keluar" in o.info) && grown(o, day)).sort((a, b) => b.st.wallet - a.st.wallet)[0];
    if (m && m.st.wallet >= n) { m.st.wallet -= n; return true; }
    return false;
  }

  // ---------------------------------------------------------------- satu hari
  function day1(x, P) {
    const c = x.c, day = x.day, home = x.home, K = KINDS[P.kind], rng = seed_rng(home.id, c.id, day, "pet"), tr = k => x.t(k) ?? 50;
    const T = { d: day, fed: false, walk: false, vet: 0, cost: 0, line: null };
    if (P.lost) {
      // kabur: tiap hari ada peluang pulang sendiri, makin dekat makin besar
      if (rng.random() < 0.15 + P.bond / 400) { P.lost = null; P.hunger = 35; P.joy = 60; T.line = `${P.name} came home on their own, hungry and muddy. ${c.name} won't let them out of sight.`; x.say(T.line); note(P, day, "Ran away, and came back."); x.need("mood", 12); }
      else if (day >= P.lost.until) return gone(x, P, "lost");
      else { x.need("mood", -2); P.today = { ...T, lost: true }; return; }
    }
    // makan: yang rajin nggak pernah lupa, yang malas kadang lupa
    const busy = (c.st.ward && c.st.ward.today && c.st.ward.today.d === day && c.st.ward.today.work ? 0.04 : 0) + (x.has("sakit") || x.has("dirawat") ? 0.25 : 0);
    const forget = P.hunger < 40 ? 0.01 : clamp((100 - tr("rajin")) / 450 + busy - (P.bond > 60 ? 0.03 : 0), 0.01, 0.6);
    const fc = Math.round(K.food * (P.food === "premium" ? 2 : 1));
    P.hunger = clamp(P.hunger - (P.pers === "greedy" ? 50 : 45), 0, 100);
    if (rng.random() >= forget) {
      if (pay(home, c, day, fc)) { P.hunger = clamp(P.hunger + 52, 0, 100); T.fed = true; T.cost += fc; }
      // nggak ada yang punya uang: dikasih sisa makanan rumah
      else { P.hunger = clamp(P.hunger + 35, 0, 100); T.fed = true; T.scraps = true; }
    }
    // main dan jalan-jalan
    const lazy = P.pers === "lazy", playful = P.pers === "playful";
    // main sebentar di rumah tiap hari, jalan-jalan kadang (atau tiap hari kalau disaranin)
    P.joy = clamp(P.joy - (lazy ? 3 : playful ? 7 : 5) + 2 - (K.shy > 0.8 && x.drama === "besar" ? 6 : 0), 0, 100);
    const walkDay = P.walk === "daily" ? rng.random() < 0.9 - (x.c.needs.energi < 25 ? 0.4 : 0) : rng.random() < 0.45;
    if (walkDay) {
      T.walk = true;
      P.joy = clamp(P.joy + (lazy ? 8 : playful ? 16 : 13), 0, 100);
      P.bond = clamp(P.bond + 0.4 * (P.pers === "loyal" ? 1.3 : P.pers === "shy" ? 0.7 : 1) * (1 + (tr("ramah") - 50) / 200), 0, 100);
      if (P.walk === "daily") x.need("energi", -3);
      if (c.st.skills) c.st.skills.fitness = Math.min(100, Math.round((c.st.skills.fitness + 0.01) * 1000) / 1000);
    } else P.bond = clamp(P.bond + 0.06, 0, 100);
    if (P.hunger < 25) P.bond = clamp(P.bond - 0.4, 0, 100);
    // bersih
    P.clean = clamp(P.clean - 4, 0, 100);
    if (day % (tr("rajin") > 60 ? 3 : 7) === 0) P.clean = 95;
    // sehat
    const old = ageOf(P, day) / lifeOf(P);
    let dH = (P.hunger < 30 ? -2 : 0) + (P.clean < 30 ? -1.5 : 0) + (P.joy < 20 ? -0.5 : 0) + (P.food === "premium" ? 0.6 : 0);
    dH += 1;
    if (old > 0.8) dH -= (old - 0.8) * 8;
    if (P.sick) dH -= P.sick.sev * 2.2;
    P.health = clamp(P.health + dH, 0, old > 0.8 ? Math.max(30, 100 - (old - 0.8) * 250) : 100);
    // sakit
    if (P.sick) {
      if (P.sick.vet) { if (day >= P.sick.vet) { P.sick = null; P.health = clamp(P.health + 10, 0, 100); T.line = `${P.name} is all better.`; } }
      else if (rng.random() < 0.18 * P.health / 100 / P.sick.sev) { P.sick = null; T.line = `${P.name} got over it without the vet.`; }
    } else if (rng.random() < K.sick * (P.food === "premium" ? 0.6 : 1) * (P.vet === "monthly" ? 0.5 : 1) * (P.health < 50 ? 2 : 1) * (old > 0.8 ? 2 : 1)) {
      const ill = ILL[Math.floor(rng.random() * ILL.length)];
      P.sick = { d: day, what: ill[0], sev: ill[1], vet: null };
      T.line = `${P.name} has ${ill[0]}.`;
      x.say(`${c.name}'s ${K.label.toLowerCase()} ${P.name} has ${ill[0]}.`);
      // yang hati-hati langsung bawa ke dokter
      if (P.vet === "monthly" || tr("penakut") > 60) vetVisit(x, P, T, "owner");
      else if (!P.card) P.card = { k: "sick", d: day, t: `${P.name} has ${ill[0]} and isn't eating much.` };
    }
    // cek rutin
    if (P.vet === "monthly" && day - P.lastVet >= 30 && pay(home, c, day, VET)) { P.lastVet = day; P.health = clamp(P.health + 5, 0, 100); T.vet += VET; T.cost += VET; }
    // trik baru
    if (P.tricks.length < TRICKS.length && rng.random() < 0.004 * K.smart * (P.bond / 60) * (P.walk === "daily" ? 1.5 : 1) * (P.pers === "lazy" ? 0.6 : 1)) {
      const t = TRICKS.slice().sort((a, b) => hash(P.id + a) - hash(P.id + b)).find(o => !P.tricks.includes(o));
      P.tricks.push(t);
      T.line = `${P.name} learned to ${t}!`;
      x.say(`${P.name} learned to ${t}. ${c.name} shows everyone who visits.`);
      note(P, day, `Learned to ${t}.`);
      x.need("mood", 4);
    }
    // efek ke pemilik: hewan yang senang dan dekat bikin hari lebih ringan
    const warm = (P.joy / 100) * (P.bond / 100);
    x.need("mood", r1(warm * 1.6 - (P.sick ? 0.5 : 0)));
    if (c.st.ward && warm > 0.3) c.st.ward.stress = clamp(c.st.ward.stress - warm * 1.2, 0, 100);
    if (!grown(c, day) && T.fed) { x.trait("ramah", 0.006 * P.bond / 50); x.trait("rajin", 0.004); }
    P.today = { ...T, joy: Math.round(P.joy), health: Math.round(P.health), hunger: Math.round(P.hunger), bond: Math.round(P.bond) };
    P.hist.push([day, Math.round(P.joy), Math.round(P.health), Math.round(P.bond)]);
    if (P.hist.length > 60) P.hist.splice(0, P.hist.length - 60);
    // mati
    if (P.health <= 0) return gone(x, P, P.sick ? "sick" : "neglect");
    if (ageOf(P, day) >= lifeOf(P)) return gone(x, P, "old");
  }
  function vetVisit(x, P, T, by) {
    const cost = 60 + P.sick.sev * 60;
    if (!pay(x.home, x.c, x.day, cost)) return false;
    P.sick.vet = x.day + P.sick.sev * 2; P.lastVet = x.day; T.vet += cost; T.cost += cost;
    note(P, x.day, `Saw the vet for ${P.sick.what}.`);
    return true;
  }
  function gone(x, P, why) {
    const c = x.c, day = x.day, K = KINDS[P.kind], yrs = r1(ageOf(P, day) / YEAR);
    const line = { old: `${P.name} the ${K.label.toLowerCase()} died peacefully in their sleep, ${yrs} years old. ${c.name} sat with them until the end.`,
      sick: `${P.name} didn't get better from ${P.sick ? P.sick.what : "being sick"}. ${c.name} is heartbroken.`,
      neglect: `${P.name} got weaker and weaker and passed away. ${c.name} wishes they had done more.`,
      lost: `${P.name} never came home. ${c.name} still leaves the porch light on.` }[why];
    x.say(line); x.remember(line.split(".")[0] + ".");
    x.need("mood", -(10 + P.bond / 4));
    if (P.bond > 35) x.flag("berduka", Math.round(10 + P.bond / 3));
    if (P.bond > 60) x.drama = "besar";
    (c.st.petsPast ||= []).push({ name: P.name, kind: P.kind, born: P.born, since: P.since, died: day, why, bond: Math.round(P.bond), tricks: P.tricks.length, ribbons: P.ribbons });
    if (c.st.petsPast.length > 6) c.st.petsPast.shift();
    c.st.pet = null;
  }

  // ---------------------------------------------------------------- kartu mingguan
  const CARDS = {
    sick: { o: [["vet", "Take them to the vet", "Costs coins, gets better fast"], ["wait", "Rest at home", "Free, might get worse"]] },
    lost: { t: "{p} slipped out the door this morning and hasn't come back.", o: [["search", "Search the whole town", "A tiring day, best chance"], ["poster", "Put up posters", "30 coins, people call in sightings"], ["wait", "Wait for them to come home", "Free, and a long wait"]] },
    chew: { t: "{p} chewed a big hole in the sofa.", o: [["toy", "Buy a chew toy", "40 coins, {p} is happy"], ["scold", "Tell them off", "Stops it, {p} sulks"], ["ignore", "Let it go", "Free, but the sofa is ruined"]] },
    show: { t: "The Old Town pet show is this Saturday.", o: [["enter", "Enter {p}", "Ribbons for the best. Happy pets with tricks do well"], ["skip", "Skip it", "Nothing changes"]] },
    treat: { t: "{p} keeps begging for snacks at dinner.", o: [["give", "Share a little", "{p} loves it, a bit less healthy"], ["no", "Stick to their food", "Healthier, {p} sulks"]] },
  };
  const fill = (s, V) => s.replace(/\{(\w+)\}/g, (_, k) => V[k] ?? "");
  function drawCard(x, P) {
    const day = x.day, rng = seed_rng(x.home.id, x.c.id, day, "petcard"), K = KINDS[P.kind];
    if (P.card || P.lost || day - P.cardD < 7 || rng.random() > 0.11) return;
    const ks = ["chew", "show", "treat", "lost"].filter(k => k !== P.lastK && (k !== "lost" || rng.random() < K.roam * (P.joy < 60 ? 0.8 : 0.35)) && (k !== "chew" || P.kind !== "fish") && (k !== "treat" || P.pers === "greedy" || rng.random() < 0.5));
    if (!ks.length) return;
    const k = ks[Math.floor(rng.random() * ks.length)];
    P.card = { k, d: day, t: fill(CARDS[k].t, { p: P.name }) };
    P.cardD = day; P.lastK = k;
    if (k === "lost") P.lost = { d: day, until: day + 10 };
    x.say(`${x.c.name}: ${P.card.t}`);
  }
  const cardOpts = P => P.card ? CARDS[P.card.k].o.map(o => [o[0], fill(o[1], { p: P.name }), fill(o[2], { p: P.name })]) : null;
  function answer(home, c, P, opt, day, by) {
    const C = P.card;
    if (!C || !CARDS[C.k].o.some(o => o[0] === opt)) return false;
    P.card = null;
    const r = hash(P.id + C.d + opt), x = new E.Ctx(c, day, seed_rng(c.id, day, "petans"), home, true), K = KINDS[P.kind];
    let t = "";
    if (C.k === "sick") {
      if (!P.sick) t = `${P.name} was already feeling better.`;
      else if (opt === "vet") { const T = { vet: 0, cost: 0 }; t = vetVisit(x, P, T, by) ? `The vet gave ${P.name} medicine. ${T.cost} coins.` : "Not enough coins for the vet this week."; }
      else t = `${P.name} rests at home.`;
    }
    if (C.k === "lost") {
      const p = opt === "search" ? 0.6 + P.bond / 400 : opt === "poster" ? 0.5 + P.bond / 400 : 0.3 + P.bond / 300;
      if (opt === "search") c.needs.energi = clamp(c.needs.energi - 20);
      if (opt === "poster" && !pay(home, c, day, 30)) t = "Couldn't afford the posters. ";
      if (r < p) { P.lost = null; P.joy = clamp(P.joy + 10, 0, 100); P.bond = clamp(P.bond + 3, 0, 100); t += opt === "search" ? `Found ${P.name} hiding behind the bakery after hours of searching.` : opt === "poster" ? `A neighbor saw the poster and brought ${P.name} home.` : `${P.name} wandered back home that evening.`; note(P, day, "Ran away, and came back."); }
      else t += `No sign of ${P.name} yet.`;
    }
    if (C.k === "chew") {
      if (opt === "toy") { if (pay(home, c, day, 40)) { P.joy = clamp(P.joy + 10, 0, 100); t = `${P.name} loves the new chew toy and leaves the sofa alone.`; } else t = "Couldn't afford a toy this week."; }
      else if (opt === "scold") { P.joy = clamp(P.joy - 12, 0, 100); P.bond = clamp(P.bond - 2, 0, 100); t = `${P.name} sulks under the bed, but the sofa is safe.`; }
      else { c.needs.mood = clamp(c.needs.mood - 5); t = "The sofa has a big hole in it now. Everyone sits on the floor."; }
    }
    if (C.k === "show") {
      if (opt === "skip") t = "Skipped the pet show.";
      else {
        const sc = P.joy * 0.3 + P.health * 0.3 + P.bond * 0.3 + P.tricks.length * 9 + (P.clean > 70 ? 6 : 0) + r * 30;
        const place = sc > 135 ? 1 : sc > 124 ? 2 : sc > 114 ? 3 : 0;
        if (place) { P.ribbons++; c.needs.mood = clamp(c.needs.mood + 8); t = `${P.name} won ${["", "first", "second", "third"][place]} place at the pet show! A ${["", "blue", "red", "yellow"][place]} ribbon hangs above their bed.`; note(P, day, `Won ${["", "first", "second", "third"][place]} place at the Old Town pet show.`);
          if (place === 1) ST.achieve(x, "pet_show_" + P.id, `${P.name} won the Old Town pet show.`); }
        else t = `${P.name} didn't place at the pet show, but got lots of pats.`;
        P.joy = clamp(P.joy + 6, 0, 100);
      }
    }
    if (C.k === "treat") {
      if (opt === "give") { P.joy = clamp(P.joy + 8, 0, 100); P.bond = clamp(P.bond + 1.5, 0, 100); P.health = clamp(P.health - 4, 0, 100); t = `${P.name} got a bit of everyone's dinner and is very pleased.`; }
      else { P.joy = clamp(P.joy - 5, 0, 100); t = `${P.name} sulked through dinner, but stayed on their own food.`; }
    }
    P.cardLast = { d: day, t, by };
    return true;
  }
  // tanpa saran dua hari: pemiliknya mutusin sendiri sesuai sifatnya
  function autoAnswer(x, P) {
    const C = P.card, tr = k => x.t(k) ?? 50;
    if (!C || x.day - C.d < (C.k === "lost" || C.k === "sick" ? 1 : 2)) return;
    const pick = { sick: tr("ramah") > 45 || tr("penakut") > 55 ? "vet" : "wait", lost: tr("rajin") > 55 ? "search" : tr("ramah") > 50 ? "poster" : "wait",
      chew: tr("ramah") > 60 ? "toy" : tr("impulsif") > 60 ? "scold" : "ignore", show: tr("ambisius") > 50 || tr("ramah") > 60 ? "enter" : "skip", treat: tr("ramah") > 55 ? "give" : "no" }[C.k];
    answer(x.home, x.c, P, pick, x.day, "owner");
    if (P.cardLast) x.say(`${x.c.name} decided about ${P.name}: ${P.cardLast.t}`);
  }

  // ---------------------------------------------------------------- warisan: hewan yang pemiliknya meninggal pindah ke keluarga
  function inherit(home, day, x) {
    for (const d of home.members) {
      if (!d.st || !d.st.pet || d.alive(day)) continue;
      const P = d.st.pet, kids = home.children_of(d).filter(m => m.alive(day) && m.st && !m.st.pet && !("keluar" in m.info));
      const heir = kids.sort((a, b) => a.born - b.born)[0] || home.members.find(m => m !== d && m.alive(day) && m.st && !m.st.pet && !("keluar" in m.info));
      d.st.pet = null;
      if (!heir) {  // nggak ada yang bisa nampung: dibawa keluarga lain, tetap tercatat
        (d.st.petsPast ||= []).push({ name: P.name, kind: P.kind, born: P.born, since: P.since, died: day, why: "rehomed", bond: Math.round(P.bond), tricks: P.tricks.length, ribbons: P.ribbons });
        if (d.st.petsPast.length > 6) d.st.petsPast.shift();
        continue;
      }
      heir.st.pet = P; P.owner = heir.id; P.since = day; P.bond = Math.round(P.bond * 0.5 + 10);
      note(P, day, `Went to live with ${heir.name} after ${d.name} passed away.`);
      if (x) x.say(`${heir.name} takes in ${d.name}'s ${KINDS[P.kind].label.toLowerCase()}, ${P.name}.`);
    }
  }

  // ---------------------------------------------------------------- hook harian
  const _status = HOOKS.status;
  HOOKS.status = (x, dramas, events) => {
    _status(x, dramas, events);
    const c = x.c, day = x.day;
    if (!c.st) return;
    inherit(x.home, day, x);
    // dari cerita lama: hewan nyasar yang dipelihara tapi belum jadi hewan beneran
    if (!c.st.pet && c.info.pet && STRAY[c.info.pet] && !c.st.petFrom) { c.st.petFrom = c.info.pet; adopt(c, x.home, day, STRAY[c.info.pet], "stray"); }
    // orang dewasa yang ramah dan longgar kadang adopsi sendiri
    if (!c.st.pet && grown(c, day) && !("keluar" in c.info) && c.st.wallet > 1500 && !(c.st.petsPast || []).some(p => day - p.died < 120)) {
      const p = 0.0008 + Math.max(0, (x.t("ramah") ?? 50) - 55) / 30000;
      if (seed_rng(x.home.id, c.id, day, "petself").random() < p) {
        const k = shelter(day)[Math.floor(hash(c.id + day) * 3)];
        if (pay(x.home, c, day, SHELTER_FEE) && adopt(c, x.home, day, k, "shelter")) x.say(`${c.name} came home from the shelter with a ${KINDS[k].label.toLowerCase()} named ${c.st.pet.name}.`);
      }
    }
    const P = c.st.pet;
    if (!P) return;
    autoAnswer(x, P);
    day1(x, P);
    if (c.st.pet) drawCard(x, c.st.pet);
  };

  // ---------------------------------------------------------------- saran pemain: "pet:<op>:<arg>"
  const _act = HOOKS.act;
  HOOKS.act = (home, cid, kind, day) => {
    if (!kind.startsWith("pet:")) return _act(home, cid, kind, day);
    const c = home.get(cid);
    if (!c || !c.st || !c.alive(day)) return false;
    const [, op, arg] = kind.split(":");
    return applyAct(home, c, op, arg, day);
  };
  function applyAct(home, c, op, arg, day) {
    const P = c.st.pet;
    if (op === "adopt") {
      // "fluff@shelter" atau "owlcat@breeder"
      const [k, src] = String(arg || "").split("@");
      if (P || !KINDS[k] || !grown(c, day) || !["shelter", "breeder"].includes(src) || (src === "shelter" && !shelter(day).includes(k))) return false;
      const cost = src === "shelter" ? SHELTER_FEE : KINDS[k].price;
      if (c.st.wallet < cost) return false;
      c.st.wallet -= cost;
      return !!adopt(c, home, day, k, src);
    }
    if (!P) return false;
    if (op === "food" && ["normal", "premium"].includes(arg) && P.food !== arg) { P.food = arg; return true; }
    if (op === "walk" && ["some", "daily"].includes(arg) && P.walk !== arg) { P.walk = arg; return true; }
    if (op === "vet" && ["sick", "monthly"].includes(arg) && P.vet !== arg) { P.vet = arg; return true; }
    if (op === "card") return answer(home, c, P, arg, day, "you");
    return false;
  }

  // ---------------------------------------------------------------- tampilan
  function view(c, home, day) {
    const P = c && c.st && c.st.pet, K = P && KINDS[P.kind];
    const past = ((c && c.st && c.st.petsPast) || []).map(o => ({ ...o, K: KINDS[o.kind] }));
    if (!P) return { pet: null, past, shelter: shelter(day).map(k => ({ k, ...KINDS[k] })), breeder: Object.entries(KINDS).map(([k, o]) => ({ k, ...o })), fee: SHELTER_FEE, wallet: c && c.st ? Math.round(c.st.wallet) : 0, canAdopt: !!(c && c.st && grown(c, day)) };
    const life = lifeOf(P), age = ageOf(P, day);
    return { pet: { ...P, K, persV: PERS[P.pers], age, life, ageY: r1(age / YEAR), lifeLeft: Math.max(0, life - age), old: age / life > 0.8, food1: Math.round(K.food * (P.food === "premium" ? 2 : 1)), cardOpts: cardOpts(P) }, past, vetCost: VET };
  }

  // mode uji: hewan contoh yang sudah dipelihara beberapa minggu di makhluk tiruan, nggak nyentuh save
  function demo(home, c, day, kind = "fluff") {
    if (!c || !c.st || !KINDS[kind]) return null;
    const cc = Object.create(c);
    Object.assign(cc, { st: JSON.parse(JSON.stringify(c.st)), needs: { ...c.needs }, traits: { ...c.traits }, info: JSON.parse(JSON.stringify(c.info)), stats: { ...c.stats }, memory: [], flags: { ...(c.flags || {}) }, demo: true });
    cc.st.wallet = Math.max(cc.st.wallet, 3000); cc.st.pet = null; cc.st.petsPast = [];
    const since = day - 50;
    adopt(cc, home, since, kind, "shelter");
    for (let d = since + 1; d <= day && cc.st.pet; d++) demoDay(home, cc, d);
    cc.vday = day;
    if (cc.st.pet && !cc.st.pet.card) { const P = cc.st.pet; P.card = { k: "show", d: day, t: fill(CARDS.show.t, { p: P.name }) }; }
    return cc;
  }
  function demoDay(home, cc, d) {
    const x = new E.Ctx(cc, d, seed_rng(cc.id, d, "pdemo"), home, true);
    cc.needs.mood = Math.max(cc.needs.mood, 50); cc.needs.energi = Math.max(cc.needs.energi, 60);
    autoAnswer(x, cc.st.pet); day1(x, cc.st.pet); if (cc.st.pet) drawCard(x, cc.st.pet);
  }
  function demoNext(home, cc) { if (cc.st.pet) demoDay(home, cc, ++cc.vday); return cc; }
  const demoAct = (home, cc, op, arg) => applyAct(home, cc, op, arg, cc.vday);

  const API = { KINDS, PERS, TRICKS, STRAY, SHELTER_FEE, adopt, shelter, view, demo, demoNext, demoAct, lifeOf };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Pets = API;
})();

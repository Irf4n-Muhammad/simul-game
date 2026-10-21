// Sistem status: skill, genetik, hoki keluarga, dadu harian, momen penting, karier, ekonomi,
// barang gengsi, saingan NPC, ranking, dan pencapaian. Desainnya ada di riset/desain-status.md.
// Semua acak pakai seed_rng supaya game tetap bisa diputar ulang dari catatan tindakan pemain.
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const S = (typeof module !== "undefined") ? require("./storylets.js") : globalThis.Storylets;
  const { HOOKS, REGISTRY, seed_rng, clamp, FOREVER, phase_of, Ctx, OLD_AGE } = E;

  // ---------------------------------------------------------------- data
  const SKILLS = ["logic", "fitness", "charm", "creativity"];
  const SKILL_LABEL = { logic: "Logic", fitness: "Fitness", charm: "Charm", creativity: "Creativity" };
  const NORMAL_COLORS = ["krem", "abu", "oranye", "biru muda", "hitam", "pink pucat"];
  const NORMAL_PATTERNS = ["polos", "totol", "belang", "bintik pipi"];

  const RARES = {
    golden_fur: { label: "Golden fur", p: 0.01, look: { warna: "emas" }, desc: "Shiny golden fur." },
    starry: { label: "Starry pattern", p: 0.02, look: { pola: "bintang" }, desc: "Tiny stars all over the fur." },
    genius: { label: "Genius", p: 0.015, skill: "logic", desc: "Logic talent 9+ and learns faster." },
    iron_body: { label: "Iron body", p: 0.015, skill: "fitness", desc: "Fitness talent 9+ and rarely sick." },
    born_star: { label: "Born star", p: 0.015, skill: "charm", desc: "Charm talent 9+." },
    prodigy: { label: "Prodigy", p: 0.015, skill: "creativity", desc: "Creativity talent 9+." },
    long_life: { label: "Long life", p: 0.02, desc: "Lives 2 to 4 months longer." },
  };

  const JOBS = {
    fastfood: { label: "Fast food crew", w: { fitness: 0.5, charm: 0.5 }, req: 15, pay: 30, pop: 0.18, pts: 2,
      ladder: ["Crew", "Shift lead", "Store manager", "Area manager"] },
    office: { label: "Office staff", w: { logic: 0.5, charm: 0.5 }, req: 30, pay: 50, pop: 0.28, pts: 4,
      ladder: ["Junior clerk", "Senior clerk", "Team lead", "Head of office"] },
    teacher: { label: "Teacher", w: { charm: 0.6, logic: 0.4 }, req: 40, pay: 60, pop: 0.12, pts: 6,
      ladder: ["Teacher", "Senior teacher", "Vice principal", "Principal"] },
    nurse: { label: "Nurse", w: { logic: 0.4, charm: 0.3, fitness: 0.3 }, req: 45, pay: 70, pop: 0.09, pts: 7,
      ladder: ["Nurse", "Senior nurse", "Charge nurse", "Head nurse"] },
    designer: { label: "Designer", w: { creativity: 1 }, req: 50, pay: 75, pop: 0.07, pts: 9, prize: "art",
      ladder: ["Junior designer", "Designer", "Lead designer", "Creative director"] },
    software: { label: "Software engineer", w: { logic: 0.7, creativity: 0.3 }, req: 60, pay: 110, pop: 0.07, pts: 14, prize: "science",
      ladder: ["Junior engineer", "Engineer", "Staff engineer", "CTO"] },
    influencer: { label: "Influencer", w: { charm: 0.6, creativity: 0.4 }, req: 62, pay: 100, pop: 0.025, pts: 16,
      ladder: ["Micro influencer", "Influencer", "Celebrity", "Icon"] },
    athlete: { label: "Pro athlete", w: { fitness: 1 }, req: 65, pay: 120, pop: 0.03, pts: 16, prize: "sport",
      ladder: ["Rookie", "Starter", "Captain", "Legend"] },
    doctor: { label: "Doctor", w: { logic: 0.7, charm: 0.3 }, req: 72, pay: 150, pop: 0.035, pts: 20, prize: "science",
      ladder: ["Resident", "Doctor", "Specialist", "Chief of medicine"] },
    quant: { label: "Quant engineer", w: { logic: 1 }, req: 82, pay: 220, pop: 0.004, pts: 30, prize: "science",
      ladder: ["Quant", "Senior quant", "Lead quant", "Head of trading"] },
    founder: { label: "Founder", w: { logic: 0.5, charm: 0.5 }, req: 70, pay: 90, pop: 0.01, pts: 25, mult: 1.8, capital: 5000,
      ladder: ["Startup founder", "Scaleup CEO", "Unicorn founder", "Tycoon"] },
  };
  const PRIZES = {
    sport: { label: "Championship", win: "Champion", coins: 3000 },
    art: { label: "Art prize", win: "Art prize winner", coins: 2500 },
    science: { label: "Golden Acorn prize", win: "Golden Acorn laureate", coins: 5000 },
  };

  const ITEMS = [
    { id: "tee", cat: "Fashion", label: "Basic tee", price: 100, pts: 1 },
    { id: "jacket", cat: "Fashion", label: "Designer jacket", price: 2000, pts: 6 },
    { id: "couture", cat: "Fashion", label: "Couture outfit", price: 15000, pts: 15 },
    { id: "phone", cat: "Phone", label: "Basic phone", price: 200, pts: 1 },
    { id: "flagship", cat: "Phone", label: "Flagship phone", price: 3000, pts: 6 },
    { id: "canvas", cat: "Bag", label: "Canvas bag", price: 150, pts: 1 },
    { id: "luxbag", cat: "Bag", label: "Luxury bag", price: 8000, pts: 10 },
    { id: "scooter", cat: "Car", label: "Scooter", price: 1500, pts: 4 },
    { id: "sedan", cat: "Car", label: "Sedan", price: 12000, pts: 12 },
    { id: "sports", cat: "Car", label: "Sports car", price: 80000, pts: 30 },
    { id: "supercar", cat: "Car", label: "Supercar", price: 300000, pts: 60 },
    { id: "flat", cat: "House", label: "Small flat", price: 20000, pts: 15, hood: "Suburb" },
    { id: "house", cat: "House", label: "Family house", price: 80000, pts: 35, hood: "Downtown" },
    { id: "villa", cat: "House", label: "Villa", price: 400000, pts: 80, hood: "Hillside" },
    { id: "mansion", cat: "House", label: "Mansion", price: 1500000, pts: 150, hood: "Royal Heights" },
  ];
  const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  const RENTED = { id: "rented", cat: "House", label: "Rented room", price: 0, pts: 0, hood: "Old Town" };

  // Rumah dibangun pakai waktu nyata (hari game = hari asli). Tiap tier punya beberapa model dan warna.
  const BUILD_DAYS = { flat: 1, house: 3, villa: 7, mansion: 30 };
  const MODELS = { flat: ["Garden unit", "Corner unit"], house: ["Classic", "Modern", "Cottage"],
    villa: ["Modern", "Mediterranean", "Tropical"], mansion: ["Classic", "Contemporary", "Chateau"] };
  const PAINTS = [["Cream", 0xefe6d6], ["Sand", 0xd9c7ae], ["Sage", 0xc9d1c6], ["Blush", 0xe3cfc4], ["Slate", 0xb9c0c6]];

  const DICE_BONUS = [0, 2, 4, 6, 9, 12, 15];
  const BANK_MAX = 2;
  const BANK_DAYS = 5; // dadu simpanan pudar setelah 5 hari, jadi hoki tetap terasa
  const LIVING_COST = 15;
  const POP_N = 5000;

  // ---------------------------------------------------------------- keadaan keluarga (disimpan di world supaya ikut snapshot)
  function fam(home) {
    const w = home.world;
    if (!w.st) w.st = { fortune: 0, dice: { bank: [], days: {} }, moments: [], results: [], house: "rented", seq: 0 };
    return w.st;
  }

  function npcGenes(id) {
    const rng = seed_rng(id || "npc", "gen-npc");
    const talent = {};
    for (const k of SKILLS) talent[k] = Math.round(clamp(rng.gauss(5, 1.8), 1, 10));
    const rares = Object.keys(RARES).filter(r => rng.random() < RARES[r].p);
    return { talent, rares };
  }

  function familyWealth(home, day) {
    return home.members.filter(m => m.alive(day) && m.st).reduce((s, m) => s + m.st.wallet, 0);
  }

  function initSt(c, home, day) {
    const F = fam(home);
    const rng = seed_rng(c.id, "status");
    const luckBoost = Math.max(0, -F.fortune); // keluarga yang lagi apes dapat anak yang lebih beruntung
    const parent = c.parents[0] ? home.get(c.parents[0]) : null;
    const pa = parent && parent.st ? parent.st.genes : null;
    // pasangan dari keluarga pemain lain membawa gen aslinya
    const remote = c.parents[1] && (home.world.npcs[c.parents[1]] || {}).genes;
    const pb = pa ? remote || npcGenes(c.parents[1] || c.id + "-pasangan") : null;
    const talent = {};
    for (const k of SKILLS) {
      let v = pa ? (pa.talent[k] + pb.talent[k]) / 2 + rng.gauss(0, 1.3) : rng.gauss(5, 1.8);
      if (rng.random() < 0.05 + 0.05 * luckBoost) v += rng.choice([-3, 3, 4]);
      v += luckBoost * 0.8;
      talent[k] = Math.round(clamp(v, 1, 10));
    }
    const rares = [];
    for (const [id, r] of Object.entries(RARES)) {
      const inherited = pa && (pa.rares.includes(id) || pb.rares.includes(id));
      const p = inherited ? 0.35 : r.p * (1 + 2 * luckBoost);
      if (rares.length < 2 && rng.random() < p) rares.push(id);
    }
    for (const id of rares) if (RARES[id].skill) talent[RARES[id].skill] = Math.max(9, talent[RARES[id].skill]);
    if (rares.includes("long_life")) c.death_day += rng.randint(60, 120);
    // Rupa langka cuma muncul kalau gennya ada, bukan sekadar diwarisi dari rupa orang tua
    if (c.rupa.warna === "emas" && !rares.includes("golden_fur")) c.rupa.warna = rng.choice(NORMAL_COLORS);
    if (c.rupa.pola === "bintang" && !rares.includes("starry")) c.rupa.pola = rng.choice(NORMAL_PATTERNS);
    c.st = {
      skills: { logic: 2, fitness: 2, charm: 2, creativity: 2 },
      genes: { talent, rares },
      reveal: { top: false, all: false, rare: false, rare_day: c.born + rng.randint(120, 240) },
      wallet: 0, job: null, best: null, pension: 0, items: [], ach: [],
      born_wealth: Math.round(familyWealth(home, day)), born_fortune: Math.round(F.fortune * 100) / 100,
      ready_since: null, fails: 0, next_review: null, next_comp: null, last_rich_check: 0,
    };
  }

  // ---------------------------------------------------------------- dadu
  function diceDay(F, day) { return F.dice.days[day] || null; }
  function luck(F, day) {
    const r = diceDay(F, day);
    if (!r) return { value: 2, src: "none" };
    if (r.used != null) return { value: r.used, src: "saved" };
    if (r.saved) return { value: 2, src: "saved_away" };  // disimpan = hari ini biasa; bukan cara buang dadu jelek
    if (r.v != null) return { value: r.v, src: "roll" };
    return { value: 2, src: "none" };
  }
  function rollDie(home, day) {
    const F = fam(home);
    const rng = seed_rng(home.id, day, "dadu");
    let v = rng.randint(1, 6);
    // Meteran nasib: keluarga yang lagi apes kadang dapat lempar dua kali ambil tertinggi, yang lagi hoki sebaliknya
    if (F.fortune < 0 && rng.random() < -F.fortune * 0.6) v = Math.max(v, rng.randint(1, 6));
    else if (F.fortune > 0 && rng.random() < F.fortune * 0.4) v = Math.min(v, rng.randint(1, 6));
    F.fortune = Math.round(clamp(F.fortune * 0.92 + (v - 3.5) * 0.07, -1, 1) * 1000) / 1000;
    return v;
  }

  // ---------------------------------------------------------------- skor momen penting
  // Titik sambung untuk pohon bakat (tree.js): kecepatan belajar dan bonus skor momen
  const EXT = { care: null, gain: null, score: null, title: null, pay: null, pick: null, coName: null, itemPts: null };
  function talentMult(st, k) {
    let m = 0.6 + (st.genes.talent[k] - 1) / 9;
    if (k === "logic" && st.genes.rares.includes("genius")) m *= 1.25;
    if (EXT.gain) m *= EXT.gain(st, k);
    return m;
  }
  function mix(st, w, field) {
    let s = 0;
    for (const [k, v] of Object.entries(w)) s += v * (field === "skill" ? st.skills[k] : st.genes.talent[k]);
    return s;
  }
  // Kondisi: kalau rawat pagi dan malam sudah berlaku, kondisi datang dari rawat semalam dan pagi itu (game.js), ditambah sedikit mood
  function condition(c, day) {
    const k = EXT.care ? EXT.care(c, day ?? c.last_day) : null;
    if (!k) return { v: Math.round(clamp((c.needs.mood - 50) / 10 + (c.needs.energi - 50) / 20, -7, 7)), note: "" };
    return { v: Math.round(clamp((c.needs.mood - 50) / 20 + k.v, -7, 7)), note: k.note };
  }
  function estimate(c, w, m) {
    const k = condition(c, m && m.day);
    return { skill: Math.round(mix(c.st, w, "skill")), talent: Math.round(mix(c.st, w, "talent")), cond: k.v, condNote: k.note,
      tree: m && EXT.score ? EXT.score(c, m) : 0 };
  }
  function mainSkill(w) { return Object.entries(w).sort((a, b) => b[1] - a[1])[0][0]; }

  function advice(c, w, gap, diceBonus) {
    if (gap <= 0) return "";
    const tips = [];
    if (gap <= DICE_BONUS[6] - diceBonus) tips.push("A saved 6 would have been enough.");
    const k = mainSkill(w);
    const perDay = 0.22 * talentMult(c.st, k) * Math.max(0.15, 1 - c.st.skills[k] / 120) * w[k];
    const days = Math.ceil(gap / Math.max(0.01, perDay));
    if (days <= 200) tips.push(`About ${days} days of focused ${SKILL_LABEL[k]} practice would close the gap.`);
    else tips.push("This one is a long shot right now. An easier step first might be smarter.");
    return tips.join(" ");
  }

  // ---------------------------------------------------------------- karier
  // perusahaan (career.js) bisa punya nama jabatan dan gaji sendiri
  function salary(job) { const J = JOBS[job.id]; return Math.round(J.pay * Math.pow(J.mult || 1.4, job.level) * (job.co && EXT.pay ? EXT.pay(job) : 1)); }
  function title(job, level = job.level) { return job.co && EXT.title ? EXT.title(job, level) : JOBS[job.id].ladder[level]; }
  function reviewReq(job) { return JOBS[job.id].req + 8 * (job.level + 1); }

  function setJob(x, id, day, m) {
    const c = x.c, st = c.st, prev = st.job;
    st.job = { id, level: (m && m.level) || 0, since: day, co: (m && m.co) || (EXT.pick ? EXT.pick(id, day, x.home.id + c.id) : null) };
    st.next_review = day + 75;
    st.next_comp = JOBS[id].prize ? day + 100 : null;
    Object.assign(c.info, { kerja: title(st.job), level: 1, gaji: 0, mulai_kerja: day });
    if (!("kerja_sejak" in c.info)) c.info.kerja_sejak = x.age;
    bestJob(st);
    if (!prev) achieve(x, "first_job", `First job: ${JOBS[id].label}.`);
    if (JOBS[id].pop < 0.05) achieve(x, "job_" + id, `Became a ${JOBS[id].label}. Only ${pct(JOBS[id].pop)} of creatures get there.`);
    if (id === "founder") achieve(x, "founded", "Founded a company.");
  }
  function bestJob(st) {
    const j = st.job;
    const score = j ? JOBS[j.id].pts + j.level * 8 : 0;
    if (j && (!st.best || score >= st.best.score)) st.best = { id: j.id, level: j.level, title: title(j), label: JOBS[j.id].label, score };
  }

  function schedule(home, m) {
    const F = fam(home);
    if (F.moments.some(o => o.cid === m.cid && o.kind === m.kind && o.day >= m.day - 3)) return null;
    m.id = `${m.cid}|${m.day}|${m.kind}|${F.seq++}`;
    F.moments.push(m);
    return m;
  }
  function pendingFor(home, cid) { return fam(home).moments.filter(m => m.cid === cid); }

  function canWork(c, day) {
    const ph = phase_of(c.age(day));
    return ph === "dewasa" && !c.info.kuliah_aktif && !c.info.pensiun;
  }

  // ---------------------------------------------------------------- dunia NPC (fungsi murni dari hari)
  let _pop = null;
  function population() {
    if (_pop) return _pop;
    const ids = Object.keys(JOBS).filter(id => !JOBS[id].internal), weights = ids.map(id => JOBS[id].pop);
    const none = 1 - weights.reduce((a, b) => a + b, 0);
    _pop = [];
    for (let i = 0; i < POP_N; i++) {
      const rng = seed_rng("dunia", i);
      const job = rng.random() < none ? null : rng.choices(ids, weights)[0];
      const level = job ? rng.choices([0, 1, 2, 3], [55, 25, 13, 7])[0] : 0;
      const pay = job ? salary({ id: job, level }) : 8;
      const w0 = Math.exp(rng.gauss(7.3, 1.45));
      const name = rng.choice(E.NAMES) + " " + rng.choice(["Ash", "Bloom", "Clove", "Dune", "Ember", "Fern", "Gale", "Hollow",
        "Ivy", "Juniper", "Kestrel", "Lark", "Maple", "Nettle", "Oak", "Pebble", "Quill", "Reed", "Sorrel", "Thistle"]);
      const athlete = job === "athlete" ? Math.round(60 + level * 8 + rng.random() * 22) : 0;
      _pop.push({ name, job, level, pay, w0, rate: pay * 0.25, athlete });
    }
    return _pop;
  }
  const npcWealth = (p, day) => Math.round(p.w0 + p.rate * (day + 200));
  function npcPrestige(p, day) {
    const w = npcWealth(p, day);
    let pts = p.job ? JOBS[p.job].pts + p.level * 8 : 0;
    for (const cat of ["Fashion", "Phone", "Bag", "Car", "House"]) {
      const best = ITEMS.filter(i => i.cat === cat && w >= i.price * (cat === "House" ? 1.5 : 2.5)).pop();
      if (best) pts += best.pts;
    }
    return pts;
  }
  function jobStats() {
    const pop = population(), employed = pop.filter(p => p.job);
    const avgPay = employed.reduce((s, p) => s + p.pay, 0) / employed.length;
    const out = {};
    for (const id of Object.keys(JOBS)) {
      const n = pop.filter(p => p.job === id).length;
      out[id] = { share: n / POP_N, payX: JOBS[id].pay / avgPay };
    }
    return out;
  }
  let _jobStats = null;
  const jobInfo = () => (_jobStats ||= jobStats());
  function itemShare(item, day) {
    const k = item.cat === "House" ? 1.5 : 2.5;
    return population().filter(p => npcWealth(p, day) >= item.price * k).length / POP_N;
  }
  const pct = v => v >= 0.1 ? `${Math.round(v * 100)}%` : v >= 0.01 ? `${(v * 100).toFixed(1)}%` : v >= 0.0001 ? `${(v * 100).toFixed(2)}%` : `${(v * 100).toFixed(3)}%`;

  // ---------------------------------------------------------------- gengsi + kekayaan pemain
  function houseOf(home) { return ITEM[fam(home).house] || RENTED; }
  function netWorth(c, home) { return Math.round(c.st.wallet); }
  function prestige(c, home, day) {
    const st = c.st;
    let pts = st.best ? st.best.score : 0;
    if (EXT.itemPts) pts += EXT.itemPts(c, day);
    else {
      const cats = {};
      for (const id of st.items) { const it = ITEM[id]; if (it) cats[it.cat] = Math.max(cats[it.cat] || 0, it.pts); }
      pts += Object.values(cats).reduce((a, b) => a + b, 0);
    }
    pts += houseOf(home).pts;
    pts += st.ach.length * 3 + st.genes.rares.length * 10;
    return pts;
  }
  // Batas masuk top 10 terkaya, dihitung sekali per minggu dan dipakai semua keluarga
  const _richCut = new Map();
  function richCut(day) {
    const wk = Math.floor(day / 7);
    if (!_richCut.has(wk)) {
      const vals = population().map(p => npcWealth(p, wk * 7)).sort((a, b) => b - a);
      _richCut.set(wk, vals[9]);
    }
    return _richCut.get(wk);
  }
  let _bestAth = null;
  const bestNpcAthlete = () => (_bestAth ??= Math.max(...population().map(p => p.athlete)));
  function rankOf(value, list) { return list.filter(v => v > value).length + 1; }

  function boards(home, day) {
    const pop = population();
    const mine = home.members.filter(m => m.st && m.alive(day) && !("keluar" in m.info) && m.age(day) >= 180);
    const rich = pop.map(p => ({ name: p.name, value: npcWealth(p, day), sub: p.job ? JOBS[p.job].ladder[p.level] : "Heir" }))
      .concat(mine.map(m => ({ name: m.name, value: netWorth(m, home), sub: m.st.job ? title(m.st.job) : "Your family", you: m.id })));
    const pres = pop.map(p => ({ name: p.name, value: npcPrestige(p, day), sub: p.job ? JOBS[p.job].ladder[p.level] : "" }))
      .concat(mine.map(m => ({ name: m.name, value: prestige(m, home, day), sub: m.st.job ? title(m.st.job) : "Your family", you: m.id })));
    const ath = pop.filter(p => p.job === "athlete").map(p => ({ name: p.name, value: p.athlete, sub: JOBS.athlete.ladder[p.level] }))
      .concat(mine.filter(m => m.st.job && m.st.job.id === "athlete")
        .map(m => ({ name: m.name, value: Math.round(m.st.skills.fitness + m.st.genes.talent.fitness + m.st.job.level * 8), sub: title(m.st.job), you: m.id })));
    const top = list => {
      list.sort((a, b) => b.value - a.value);
      const t = list.slice(0, 10).map((e, i) => Object.assign({ rank: i + 1 }, e));
      const yours = list.map((e, i) => Object.assign({ rank: i + 1 }, e)).filter(e => e.you && e.rank > 10);
      return { top: t, yours, total: list.length };
    };
    return { richest: top(rich), prestige: top(pres), athletes: top(ath) };
  }

  // ---------------------------------------------------------------- pencapaian
  function achieve(x, id, label) {
    const st = x.c.st;
    if (st.ach.some(a => a.id === id)) return false;
    st.ach.push({ id, label, day: x.day });
    x.remember(label);
    return true;
  }
  function selfMade(x) {
    if (x.c.st.born_wealth < 1000) achieve(x, "self_made", "Self-made: rose to the top from a family that started with little.");
  }

  // ---------------------------------------------------------------- momen penting
  function resolve(x, m, dramas, events) {
    const c = x.c, st = c.st, home = x.home, F = fam(home);
    const L = luck(F, m.day);
    const e = estimate(c, m.w, m);
    const bonus = DICE_BONUS[L.value];
    const total = e.skill + e.talent + e.cond + e.tree + bonus;
    const pass = total >= m.req;
    const res = { id: m.id, day: m.day, kind: m.kind, label: m.label, cid: c.id, name: c.name, by: m.by, req: m.req,
      parts: { skill: e.skill, talent: e.talent, cond: e.cond, condNote: e.condNote, tree: e.tree, dice: L.value, bonus, src: L.src }, total, pass,
      tip: pass ? "" : advice(c, m.w, m.req - total, bonus) };
    let big = false, line;
    // pekerjaannya sudah berubah (pindah kantor, dipecat, pensiun): review dan lomba lama hangus
    const stale = !st.job || st.job.id !== m.job || (m.since != null && st.job.since !== m.since) || (m.co !== undefined && st.job.co !== m.co);
    if ((m.kind === "review" || m.kind === "comp") && stale) return;
    // keburu pensiun atau nggak bisa kerja lagi: wawancara batal, modal pendiri dikembalikan
    if (m.kind === "interview" && !canWork(c, x.day)) { if (m.job === "founder" && JOBS.founder.capital) st.wallet += JOBS.founder.capital; return; }
    if (m.kind === "interview") {
      if (pass) {
        const J = JOBS[m.job];
        if (m.job === "founder") st.wallet = Math.max(0, st.wallet); // modal sudah dibayar saat mendaftar
        setJob(x, m.job, x.day, m);
        st.fails = 0;
        line = `${c.name} got the job: ${st.job.co && EXT.coName ? `${title(st.job)} at ${EXT.coName(st.job.co)}` : J.label}! Score ${total} vs ${m.req} needed.`;
        big = J.pop < 0.05;
      } else {
        st.fails += 1;
        c.info.ditolak = (c.info.ditolak ?? 0) + 1;
        st.retry_after = x.day + 7;
        line = `${c.name} didn't get the ${m.co && EXT.coName ? `${m.title} job at ${EXT.coName(m.co)}` : JOBS[m.job].label + " job"}. Score ${total} vs ${m.req} needed.`;
        x.need("mood", -6);
      }
    } else if (m.kind === "review") {
      if (pass) {
        st.job.level += 1;
        Object.assign(c.info, { kerja: title(st.job), level: st.job.level + 1 });
        bestJob(st);
        line = `${c.name} got promoted to ${title(st.job)}! Score ${total} vs ${m.req} needed.`;
        if (st.job.level >= 3) {
          big = true;
          achieve(x, "top_" + st.job.id, `Reached the top: ${title(st.job)}.`);
          if (JOBS[st.job.id].pop < 0.05) selfMade(x);
        }
        else achieve(x, "promo_" + st.job.id + st.job.level, `Promoted to ${title(st.job)}.`);
        st.next_review = st.job.level < 3 ? x.day + 75 : null;
      } else {
        line = `${c.name}'s promotion review didn't go through. Score ${total} vs ${m.req} needed.`;
        st.next_review = x.day + 45;
      }
    } else if (m.kind === "comp") {
      const P = PRIZES[m.prize];
      if (pass) {
        st.wallet += P.coins;
        big = true;
        line = `${c.name} won the ${P.label}, beating ${m.rival}! Score ${total} vs ${m.req}. Prize: ${P.coins.toLocaleString("en")} coins.`;
        achieve(x, "prize_" + m.prize + "_" + x.day, `${P.win} (beat ${m.rival}).`);
        selfMade(x);
      } else {
        line = `${c.name} lost the ${P.label} to ${m.rival}. Score ${total} vs ${m.req}.`;
      }
      st.next_comp = st.job ? x.day + 100 : null;
    }
    const diceNote = L.src === "none" ? " (no dice rolled that day)" : L.src === "saved" ? ` (used a saved ${L.value})` : ` (rolled ${L.value})`;
    x.say(line + diceNote);
    res.line = line;
    F.results.push(res);
    if (F.results.length > 30) F.results.splice(0, F.results.length - 30);
    dramas.push(big ? "besar" : "sedang");
    events.push("momen_" + m.kind);
  }

  // ---------------------------------------------------------------- kejadian harian per makhluk
  const GAIN = {
    belajar: { logic: 0.22 }, dongeng: { logic: 0.12 }, main: { creativity: 0.1, fitness: 0.05 },
    jalan: { fitness: 0.08, charm: 0.04 }, teman: { charm: 0.22 }, latihan: { creativity: 0.25 },
    olahraga: { fitness: 0.25 }, bantu_rumah: { fitness: 0.08, charm: 0.05 }, bebas: { creativity: 0.12, charm: 0.05 },
    cari_kerja: { charm: 0.05 }, sosial: { charm: 0.2 }, pasangan: { charm: 0.08 }, keluarga: { charm: 0.08 },
    hobi: { creativity: 0.18 }, kerja_sambilan: { charm: 0.08, fitness: 0.08 }, jalan_pagi: { fitness: 0.06 },
    cucu: { charm: 0.05 },
  };

  function train(x) {
    const c = x.c, st = c.st, ph = x.phase;
    const g = {};
    const add = (k, v) => { g[k] = (g[k] || 0) + v; };
    const today = c.info.agenda_hari && c.info.agenda_hari.hari === x.day ? c.info.agenda_hari.id : null;
    if (today === "kerja_keras" && st.job) for (const [k, v] of Object.entries(JOBS[st.job.id].w)) add(k, 0.2 * v);
    else if (today && GAIN[today]) for (const [k, v] of Object.entries(GAIN[today])) add(k, v);
    if (ph === "anak" || ph === "remaja") { add("logic", 0.05); add("charm", 0.03); }
    if (c.info.kuliah_aktif) add("logic", 0.12);
    if (st.job) for (const [k, v] of Object.entries(JOBS[st.job.id].w)) add(k, 0.06 * v);
    for (const k of SKILLS) {
      if (g[k]) st.skills[k] = Math.min(100, st.skills[k] + g[k] * talentMult(st, k) * Math.max(0.1, 1 - st.skills[k] / 120));
      else if ((ph === "dewasa" || ph === "tua") && st.skills[k] > 30) st.skills[k] -= 0.015;
      st.skills[k] = Math.round(st.skills[k] * 1000) / 1000;
    }
    if (ph === "tua") st.skills.fitness = Math.max(0, st.skills.fitness - 0.04);
  }

  function reveal(x, dramas, events) {
    const c = x.c, st = c.st, R = st.reveal, t = st.genes.talent;
    if (!R.top && x.age >= 60) {
      R.top = true;
      const k = SKILLS.slice().sort((a, b) => t[b] - t[a])[0];
      x.say(`${c.name} is showing a knack for ${SKILL_LABEL[k]}. Talent: ${t[k]}/10.`);
      dramas.push("sedang"); events.push("bakat_terlihat");
    }
    if (!R.all && x.age >= 180) {
      R.all = true;
      x.say(`${c.name}'s grown-up fur came in, and all their talents are clear now: `
        + SKILLS.map(k => `${SKILL_LABEL[k]} ${t[k]}`).join(", ") + ".");
      dramas.push("sedang"); events.push("bakat_lengkap");
    }
    if (!R.rare && x.day >= R.rare_day) {
      R.rare = true;
      for (const id of st.genes.rares) {
        const r = RARES[id];
        if (r.look) Object.assign(c.rupa, r.look);
        x.say(`Something rare: ${c.name} has ${r.label}! Only about ${pct(r.p)} of creatures are born with it. ${r.desc}`);
        achieve(x, "rare_" + id, `Born with ${r.label}.`);
      }
      if (st.genes.rares.length) { dramas.push("besar"); events.push("sifat_langka"); }
    }
  }

  function economy(x) {
    const c = x.c, st = c.st, ph = x.phase;
    if (st.job && !c.info.kerja) {
      // dipecat atau pensiun lewat cerita
      // pemilik bisnis nggak punya gaji tetap: pensiunnya dari rata-rata ambilan hariannya
      if (c.info.pensiun) st.pension = Math.round((st.job.id === "owner" ? Math.max(0, st.drawAvg || 0) : salary(st.job)) * 0.4);
      st.job = null; st.next_review = null; st.next_comp = null;
    }
    if (ph === "dewasa" || ph === "tua") {
      if (!st.started) { st.started = true; st.wallet += 300; }
      if (st.job) st.wallet += salary(st.job);
      else if (c.info.pensiun) st.wallet += st.pension;
      if (!c.info.kuliah_aktif) {  // selama kuliah biaya hidup ditanggung keluarga
        if (st.wallet < LIVING_COST) x.need("mood", -1);
        st.wallet = Math.max(0, st.wallet - LIVING_COST);
      }
    }
    c.stats.uang = Math.min(5000, st.wallet / 50);
    finishBuild(x);
  }
  // Pembangunan selesai: keluarga pindah ke rumah baru
  function finishBuild(x) {
    const F = fam(x.home), b = F.build;
    if (!b || x.day < b.done) return;
    const by = x.home.get(b.by);
    if (x.c.id !== b.by && by && by.alive(x.day) && !("keluar" in by.info)) return;
    F.house = b.id; F.lot = { lot: b.lot, model: b.model, paint: b.paint, since: b.done, paid: ITEM[b.id].price }; F.build = null;
    const it = ITEM[b.id];
    achieve(x, "house_" + b.id, `Moved the family into a new ${it.label} in ${it.hood}.`);
  }

  function career(x) {
    const c = x.c, st = c.st, home = x.home, day = x.day;
    if (!canWork(c, day)) { st.ready_since = null; return; }
    const pend = pendingFor(home, c.id);
    // pemain dikasih waktu 5 hari buat milih kerjaan; setelah itu makhluknya ngelamar sendiri
    if (!st.job && day >= (c.info.siap_kerja ?? 0) && !pend.some(m => m.kind === "interview")) {
      if (st.ready_since == null) st.ready_since = day;
      if (day - st.ready_since >= 5 && day >= (st.retry_after ?? 0)) {
        const amb = x.t("ambisius");
        const options = Object.keys(JOBS).filter(id => id !== "founder" && !JOBS[id].internal).map(id => {
          const e = estimate(c, JOBS[id].w, { kind: "interview", job: id });
          return { id, gap: JOBS[id].req - (e.skill + e.talent + e.cond + e.tree + DICE_BONUS[2]) };
        });
        // yang ambisius nekat ke atas, yang santai main aman; tiap gagal dia turunin target
        const reach = (amb > 60 ? 4 : amb < 35 ? -6 : -2) - 4 * Math.min(3, st.fails);
        const ok = options.filter(o => o.gap <= reach).sort((a, b) => JOBS[b.id].req - JOBS[a.id].req);
        const pick = (ok[0] || { id: "fastfood" }).id;
        const J = JOBS[pick], co = EXT.pick ? EXT.pick(pick, day, home.id + c.id) : null;
        const where = co && EXT.coName ? ` at ${EXT.coName(co)}` : "";
        schedule(home, { cid: c.id, kind: "interview", day: day + 2, req: J.req, w: J.w, job: pick, by: "self", co, level: 0,
          title: co ? title({ id: pick, level: 0, co }) : J.label, label: `Job interview: ${co ? title({ id: pick, level: 0, co }) : J.label}${where}` });
        x.say(`${c.name} applied for a ${J.label} job${where} on their own. The interview is in 2 days.`);
        st.ready_since = day;
      }
    }
    if (st.job && st.next_review != null && day >= st.next_review - 3 && st.job.level < 3 && !pend.some(m => m.kind === "review")) {
      schedule(home, { cid: c.id, kind: "review", day: Math.max(day + 1, st.next_review), req: reviewReq(st.job),
        w: JOBS[st.job.id].w, job: st.job.id, co: st.job.co, since: st.job.since, by: "work", label: `Promotion review: ${title(st.job, st.job.level + 1)}` });
      st.next_review = FOREVER;
    }
    const J = st.job ? JOBS[st.job.id] : null;
    if (J && J.prize && st.next_comp != null && day >= st.next_comp - 4 && !pend.some(m => m.kind === "comp")) {
      const rng = seed_rng(c.id, day, "saingan");
      const rival = rng.choice(population().filter(p => p.job === st.job.id)).name;
      const req = 70 + rng.randint(0, 25) + st.job.level * 3;
      const P = PRIZES[J.prize];
      schedule(home, { cid: c.id, kind: "comp", day: Math.max(day + 1, st.next_comp), req, w: J.w, prize: J.prize, rival,
        job: st.job.id, co: st.job.co, since: st.job.since, by: "work", label: `${P.label} vs ${rival}` });
      st.next_comp = FOREVER;
    }
  }

  function milestones(x) {
    const c = x.c, st = c.st, home = x.home, day = x.day;
    if (x.phase === "tua") achieve(x, "elder", "Lived to old age.");
    if (S.grandkids_here && S.grandkids_here(x).length) achieve(x, "grandparent", "Became a grandparent.");
    if ((x.phase === "dewasa" || x.phase === "tua") && day - st.last_rich_check >= 7) {
      st.last_rich_check = day;
      if (netWorth(c, home) > richCut(day)) { achieve(x, "rich10", "Made the top 10 richest in the world."); selfMade(x); }
      if (st.job && st.job.id === "athlete" && st.skills.fitness + st.genes.talent.fitness + st.job.level * 8 > bestNpcAthlete())
        achieve(x, "best_athlete", "Ranked the best athlete in the world.");
    }
  }

  HOOKS.status = (x, dramas, events) => {
    const c = x.c, home = x.home, day = x.day, F = fam(home);
    if (!c.st) initSt(c, home, day);
    for (const k of Object.keys(F.dice.days)) if (Number(k) < day - 6) delete F.dice.days[k];
    F.dice.bank = F.dice.bank.filter(b => b.day > day - BANK_DAYS);
    const due = F.moments.filter(m => m.cid === c.id && m.day < day);
    if (due.length) {
      F.moments = F.moments.filter(m => !due.includes(m));
      for (const m of due) resolve(x, m, dramas, events);
    }
    if (x.has("bersalah")) x.need("mood", -0.8);  // rasa bersalah habis mutusin atau ketahuan selingkuh
    reveal(x, dramas, events);
    train(x);
    economy(x);
    career(x);
    milestones(x);
  };

  // Uang lama (stats.uang) dari cerita dialihkan ke dompet coins: 1 poin = 50 coins
  const _stat = Ctx.prototype.stat;
  Ctx.prototype.stat = function (key, delta) {
    if (key === "uang" && this.c.st) {
      this.c.st.wallet = Math.max(0, this.c.st.wallet + delta * 50);
      this.c.stats.uang = Math.min(5000, this.c.st.wallet / 50);
      return;
    }
    return _stat.call(this, key, delta);
  };

  // Karier lama digantikan sistem wawancara dan review
  for (const s of REGISTRY) if (["cari_kerja", "naik_jabatan", "tawaran_pindah_kerja"].includes(s.id)) s.cond = () => false;

  // Warisan: dompet dibagi ke anak yang masih hidup, kalau nggak ada ke anggota rumah lain
  const _farewell = HOOKS.akhir_hidup;
  HOOKS.akhir_hidup = (c, day, home) => {
    const log = _farewell(c, day, home);
    if (c.st && c.st.wallet > 0) {
      const at = m => m.alive(day + 1) && !("keluar" in m.info) && m.st;
      let heirs = home.children_of(c).filter(at);
      if (!heirs.length) heirs = home.members.filter(m => m !== c && at(m));
      if (heirs.length) {
        const share = Math.floor(c.st.wallet / heirs.length);
        for (const h of heirs) h.st.wallet += share;
        log.lines.push(`${c.name} left ${(share * heirs.length).toLocaleString("en")} coins to ${heirs.map(h => h.name).join(", ")}.`);
        c.st.wallet = 0;
      }
    }
    return log;
  };

  // ---------------------------------------------------------------- tindakan pemain (dicatat dan diputar ulang)
  HOOKS.act = (home, cid, kind, day) => {
    const F = fam(home);
    if (kind === "dadu") {
      const r = F.dice.days[day] || (F.dice.days[day] = { v: null, saved: false, used: null });
      if (r.v != null) return false;
      r.v = rollDie(home, day);
      return true;
    }
    if (kind === "simpan_dadu") {
      const r = F.dice.days[day];
      if (!r || r.v == null || r.saved || r.used != null || F.dice.bank.length >= BANK_MAX) return false;
      F.dice.bank.push({ v: r.v, day }); r.saved = true;
      return true;
    }
    if (kind.startsWith("pakai_dadu:")) {
      const i = Number(kind.slice(11)), b = F.dice.bank[i], r0 = F.dice.days[day];
      if (!b || b.day <= day - BANK_DAYS || (r0 && r0.used != null)) return false;
      const r = r0 || (F.dice.days[day] = { v: null, saved: false, used: null });
      const v = b.v;
      F.dice.bank.splice(i, 1); r.used = v;
      return true;
    }
    const c = home.get(cid);
    if (!c || !c.st || !c.alive(day) || "keluar" in c.info) return undefined;
    if (kind.startsWith("lamar:")) {
      const id = kind.slice(6), J = JOBS[id];
      if (!J || J.internal || !canWork(c, day) || pendingFor(home, cid).some(m => m.kind === "interview")) return false;
      if (c.st.job && c.st.job.id === id) return false;
      if (J.capital) {
        if (c.st.wallet < J.capital) return false;
        c.st.wallet -= J.capital;
      }
      const m = schedule(home, { cid, kind: "interview", day: day + 2, req: J.req, w: J.w, job: id, by: "you",
        label: id === "founder" ? "Investor pitch: your own company" : `Job interview: ${J.label}` });
      if (!m && J.capital) c.st.wallet += J.capital;
      return !!m;
    }
    if (kind.startsWith("beli:")) {
      const it = ITEM[kind.slice(5).split("@")[0]];
      if (!it || c.age(day) < 180 || c.st.wallet < it.price) return false;
      if (it.cat === "House") {
        // "beli:villa@lot,model,paint": beli kavling lalu bangun, keluarga pindah begitu selesai
        if (houseOf(home).price >= it.price || F.build) return false;
        const [lot, model, paint] = (kind.split("@")[1] || "-1,0,0").split(",").map(Number);
        F.build = { id: it.id, lot, model: Math.max(0, Math.min(MODELS[it.id].length - 1, model || 0)),
          paint: Math.max(0, Math.min(PAINTS.length - 1, paint || 0)), start: day, done: day + BUILD_DAYS[it.id], by: cid };
      } else {
        if (c.st.items.includes(it.id)) return false;
        c.st.items.push(it.id);
      }
      c.st.wallet -= it.price;
      c.stats.uang = Math.min(5000, c.st.wallet / 50);
      const x = new Ctx(c, day, seed_rng(cid, day, "beli"), home, true);
      x.drama = "sedang";
      if (it.cat === "Car" && it.price >= 80000) achieve(x, "car_" + it.id, `Bought a ${it.label}.`);
      if (it.cat === "House") x.remember(`Bought a lot in ${it.hood}. Building a ${it.label} starts today.`);
      if (it.id === "couture" || it.id === "luxbag") achieve(x, "lux_" + it.id, `Bought a ${it.label}.`);
      return true;
    }
    return undefined;
  };

  // ---------------------------------------------------------------- tampilan untuk UI
  function memberView(c, home, day) {
    const st = c.st;
    if (!st) return null;
    const R = st.reveal, t = st.genes.talent;
    const topK = SKILLS.slice().sort((a, b) => t[b] - t[a])[0];
    const talents = {};
    for (const k of SKILLS) talents[k] = R.all || (R.top && k === topK) ? t[k] : null;
    const jobs = jobInfo();
    return {
      skills: Object.fromEntries(SKILLS.map(k => [k, Math.round(st.skills[k])])), talents,
      rares: R.rare ? st.genes.rares.map(id => ({ id, label: RARES[id].label, share: pct(RARES[id].p), desc: RARES[id].desc })) : [],
      rare_hidden: !R.rare,
      wallet: Math.round(st.wallet),
      job: st.job ? { id: st.job.id, label: JOBS[st.job.id].label, title: title(st.job), co: st.job.co || null, level: st.job.level, pay: salary(st.job),
        share: pct(jobs[st.job.id].share), payX: jobs[st.job.id].payX.toFixed(1) } : null,
      best: st.best, pension: st.pension,
      items: st.items.map(id => ITEM[id]).filter(Boolean),
      ach: st.ach.slice(), prestige: prestige(c, home, day),
      moments: pendingFor(home, c.id).map(m => ({ id: m.id, kind: m.kind, label: m.label, day: m.day, req: m.req, by: m.by, co: m.co || null,
        est: estimate(c, m.w, m) })),
      can_work: canWork(c, day), born_wealth: st.born_wealth,
      note: c.info.kuliah_aktif ? `At university until ${E.make_log(c, c.info.siap_kerja ?? day, { age: 0 }, "", false, [], [], []).date.toUTCString().slice(5, 16)}.`
        : c.info.pensiun ? `Retired. Pension: ${st.pension} coins a day.` : phase_of(c.age(day)) === "tua" ? "Enjoying old age." : null,
    };
  }
  function familyView(home, day) {
    const F = fam(home), r = diceDay(F, day);
    return {
      dice: { today: r ? { rolled: r.v, saved: r.saved, used: r.used } : null, luck: luck(F, day), bank: F.dice.bank.filter(b => b.day > day - BANK_DAYS).map(b => ({ v: b.v, left: b.day + BANK_DAYS - day })), max: BANK_MAX },
      house: houseOf(home), lot: F.lot || null, build: F.build ? { ...F.build, item: ITEM[F.build.id], left: Math.max(0, F.build.done - day) } : null, moments: F.moments.slice().sort((a, b) => a.day - b.day), results: F.results.slice(),
    };
  }
  function jobList(c, day) {
    const info = jobInfo();
    return Object.entries(JOBS).filter(([, J]) => !J.internal).map(([id, J]) => {
      const e = c && c.st ? estimate(c, J.w, { kind: "interview", job: id }) : null;
      return { id, label: J.label, req: J.req, pay: J.pay, share: pct(info[id].share), payX: info[id].payX.toFixed(1),
        skills: Object.keys(J.w).map(k => SKILL_LABEL[k]).join(" + "), capital: J.capital || 0,
        est: e ? e.skill + e.talent + e.cond + e.tree : null };
    });
  }
  function shop(c, home, day) {
    const have = c && c.st ? c.st.items : [];
    const h = houseOf(home);
    const b = fam(home).build;
    return ITEMS.map(it => ({ ...it, owned: it.cat === "House" ? h.price >= it.price : have.includes(it.id), building: !!b && b.id === it.id,
      share: pct(itemShare(it, day)), days: BUILD_DAYS[it.id] || 0 }));
  }

  // Untuk kota: rumah dan kendaraan tiap NPC mengikuti kekayaannya hari ini (aturan sama dengan npcPrestige)
  // NPC ikut aturan pemain: begitu mampu beli tier baru, rumahnya dibangun dulu selama BUILD_DAYS, baru pindah.
  function npcTown(day) {
    const houses = ITEMS.filter(i => i.cat === "House"), cars = ITEMS.filter(i => i.cat === "Car");
    return population().map((p, i) => {
      const w = npcWealth(p, day);
      let hi = -1; houses.forEach((h, k) => { if (w >= h.price * 1.5) hi = k; });
      let house = hi >= 0 ? houses[hi] : RENTED, build = null, bought = null;
      if (hi >= 0) {
        const reach = Math.ceil((houses[hi].price * 1.5 - p.w0) / p.rate - 200), done = reach + BUILD_DAYS[houses[hi].id];
        bought = { id: houses[hi].id, day: reach, done };
        if (day < done) { build = { id: houses[hi].id, start: reach, done, left: done - day }; house = hi > 0 ? houses[hi - 1] : RENTED; }
      }
      const r = seed_rng("rumah", i);
      return { i, name: p.name, sub: p.job ? JOBS[p.job].ladder[p.level] : "Heir", wealth: w, house: house.id, build, bought,
        model: r.randint(0, 2), paint: r.randint(0, PAINTS.length - 1),
        car: (cars.filter(c => w >= c.price * 2.5).pop() || {}).id || null };
    });
  }
  function bestItem(c, cat) { return c && c.st ? c.st.items.map(id => ITEM[id]).filter(it => it && it.cat === cat).sort((a, b) => b.price - a.price)[0] || null : null; }

  const estimateFor = (c, m) => estimate(c, m.w, m);
  const API = { EXT, achieve, salary, title, estimateFor, schedule, pendingFor, canWork, SKILLS, SKILL_LABEL, RARES, JOBS, PRIZES, ITEMS, DICE_BONUS, BANK_MAX, BANK_DAYS, fam, luck, boards, memberView,
    familyView, jobList, shop, pct, population, prestige, salary, npcTown, bestItem, RENTED, BUILD_DAYS, MODELS, PAINTS };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Status = API;
})();

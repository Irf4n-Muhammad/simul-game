// Mesin simulasi versi JavaScript: port 1:1 dari engine.py supaya prototipe jalan langsung di browser.
// Nama fungsi dan field sengaja sama dengan versi Python (snake_case) supaya mudah dicocokkan.
"use strict";

const FOREVER = 1e9;
const YEAR = 365;
// Umur dipendekin: hidup 3–4 tahun nyata, tua mulai 2,5 tahun. Masa kecil tetap 270 hari.
const OLD_AGE = Math.round(2.5 * YEAR);
const PHASES = [["bayi", 0, 60], ["anak", 60, 180], ["remaja", 180, 270], ["dewasa", 270, OLD_AGE], ["tua", OLD_AGE, FOREVER]];
const LIFESPAN = [3 * YEAR, 4 * YEAR];
// Umur dewasa versi lama (hidup 10–12 tahun) dipetakan ke skala baru: 270 hari tetap, 8 tahun lama = OLD_AGE
function adult_age(old_days) { return Math.round(270 + (old_days - 270) * (OLD_AGE - 270) / (8 * YEAR - 270)); }
const ADULT_SCALE = (OLD_AGE - 270) / (8 * YEAR - 270);
const DRAMA_COST = { kecil: 1, sedang: 2, besar: 5 };
const DRAMA_WEIGHT = { kecil: 1.0, sedang: 0.8, besar: 0.5 };
const TRAITS = ["rajin", "impulsif", "setia", "ambisius", "ramah", "penakut", "patuh", "kreatif"];
const NAMES = ["Momo", "Kiko", "Lulu", "Bobo", "Pipi", "Nana", "Toto", "Rara", "Dudu", "Cici",
  "Gogo", "Mimi", "Kuku", "Zaza", "Fifi", "Jojo", "Wawa", "Yoyo", "Sasa", "Bubu",
  "Pupu", "Tata", "Lolo", "Didi", "Koko", "Nini", "Rere", "Mumu", "Titi", "Fafa"];
const NPC_NAMES = ["Ari", "Beni", "Cika", "Dodo", "Eli", "Fani", "Gita", "Hani", "Ipul", "Juju",
  "Kara", "Leli", "Mona", "Nuri", "Oki", "Pita", "Qiqi", "Rani", "Sofi", "Tomi",
  "Uli", "Vivi", "Wulan", "Yudi", "Zizi", "Bima", "Dewi", "Gilang", "Intan", "Lala"];
const RUPA = {
  warna: ["krem", "abu", "oranye", "biru muda", "hitam", "pink pucat"],
  telinga: ["bulat", "lancip", "panjang terkulai"],
  pola: ["polos", "totol", "belang", "bintik pipi"],
};
const START_DATE = Date.UTC(2026, 9, 11);

const WEEKLY_BUDGET = 6;
const BESAR_GAP = 21;
const CALM_AFTER_BESAR = 3;
const EVENT_CHANCE = { bayi: 0.5, anak: 0.45, remaja: 0.45, dewasa: 0.4, tua: 0.28 };
const QUIET_BOOST = { bayi: 0.12, anak: 0.12, remaja: 0.12, dewasa: 0.05, tua: 0.04 };
const WINDOW = { kecil: 0, sedang: 1, besar: 3 };
const RULESETS = {
  suportif: { sekolah: "wajib", jam_malam: "longgar", pacaran: "boleh", jajan: "besar" },
  tegas: { sekolah: "wajib", jam_malam: "ketat", pacaran: "tunggu_dewasa", jajan: "kecil" },
};
const STRICT = { sekolah: "wajib", jam_malam: "ketat", pacaran: "tunggu_dewasa", jajan: "kecil" };

// ---------------------------------------------------------------- RNG deterministik

function hash128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

class Rng {
  constructor(seed) {
    [this.a, this.b, this.c, this.d] = seed;
    for (let i = 0; i < 12; i++) this.random();
  }
  random() { // sfc32
    let { a, b, c, d } = this;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    Object.assign(this, { a, b, c, d });
    return (t >>> 0) / 4294967296;
  }
  randint(lo, hi) { return lo + Math.floor(this.random() * (hi - lo + 1)); }
  uniform(lo, hi) { return lo + (hi - lo) * this.random(); }
  choice(arr) { return arr[Math.floor(this.random() * arr.length)]; }
  choices(pop, weights) {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = this.random() * total;
    for (let i = 0; i < pop.length; i++) {
      r -= weights[i];
      if (r < 0) return [pop[i]];
    }
    return [pop[pop.length - 1]];
  }
  gauss(mu, sigma) {
    const u = 1 - this.random(), v = this.random();
    return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

function seed_rng(...parts) { return new Rng(hash128(parts.map(String).join(":"))); }
function clamp(v, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }
function round2(v) { return Math.round(v * 100) / 100; }
function phase_of(age) {
  for (const [name, lo, hi] of PHASES) if (lo <= age && age < hi) return name;
  return "tua";
}
function random_traits(rng) {
  const t = {};
  for (const k of TRAITS) t[k] = Math.round(clamp(rng.gauss(50, 18), 5, 95));
  return t;
}
function random_rupa(rng) {
  const r = {};
  for (const k of Object.keys(RUPA)) r[k] = rng.choice(RUPA[k]);
  return r;
}
function inherit(rng, a_traits, b_traits, a_rupa, b_rupa) {
  const traits = {}, rupa = {};
  for (const t of TRAITS) traits[t] = Math.round(clamp((a_traits[t] + b_traits[t]) / 2 + rng.gauss(0, 10), 5, 95));
  for (const k of Object.keys(RUPA)) rupa[k] = rng.random() < 0.08 ? rng.choice(RUPA[k]) : rng.choice([a_rupa[k], b_rupa[k]]);
  return [traits, rupa];
}
function inc(counter, key, n = 1) { counter[key] = (counter[key] || 0) + n; }
function lower(s) { return String(s).toLowerCase(); }

// ---------------------------------------------------------------- makhluk dan dunia

class Creature {
  constructor(o) {
    Object.assign(this, {
      gen: 1, parents: [], death_day: FOREVER,
      stats: { kecerdasan: 10.0, kesehatan: 85.0, karier: 0.0, uang: 0.0, reputasi: 0.0 },
      needs: { lapar: 100.0, energi: 100.0, kebersihan: 100.0, mood: 80.0 },
      bond: 50.0, flags: {}, cooldowns: {}, fired: {}, memory: [], relations: {}, info: {},
      director: { spent: {}, last_besar: -FOREVER, quiet: 0 }, last_day: -1,
    }, o);
  }
  static new(cid, { born = 0, gen = 1, parents = [], traits = null, rupa = null, name = null, avoid = [] } = {}) {
    const rng = seed_rng(cid, "genetik");
    traits = traits || random_traits(rng);
    rupa = rupa || random_rupa(rng);
    const pool = NAMES.filter(n => !avoid.includes(n));
    name = name || rng.choice(pool.length ? pool : NAMES);
    const death = born + rng.randint(LIFESPAN[0], LIFESPAN[1]);
    const fate = seed_rng(cid, "takdir");
    const info = { minat_cinta: fate.random() < 0.25 ? 0.03 : 1.0, subur: fate.random() > 0.15, merantau: fate.random() < 0.3 };
    return new Creature({ id: cid, name, born, traits, rupa, gen, parents: [...parents], death_day: death, last_day: born - 1, info });
  }
  clone() { return new Creature(JSON.parse(JSON.stringify(this))); }
  age(day) { return day - this.born; }
  alive(day) { return this.born <= day && day < this.death_day; }
  has(flag, day) { return (this.flags[flag] ?? -1) >= day; }
  set_flag(flag, day, ttl = FOREVER) { this.flags[flag] = ttl >= FOREVER ? FOREVER : day + ttl; }
  clear_flag(flag) { delete this.flags[flag]; }
  partner() {
    return Object.values(this.relations).find(r => ["pasangan", "tunangan", "suami-istri"].includes(r.tipe)) || null;
  }
  rel_of(tipe) {
    const e = Object.entries(this.relations).find(([, r]) => r.tipe === tipe);
    return e ? e : [null, null];
  }
  describe() {
    const r = this.rupa, en = { "krem": "cream", "abu": "grey", "oranye": "orange", "biru muda": "light blue", "hitam": "black",
      "pink pucat": "pale pink", "emas": "golden", "bulat": "round", "lancip": "pointy", "panjang terkulai": "long floppy",
      "polos": "plain", "totol": "spotted", "belang": "striped", "bintik pipi": "freckled", "bintang": "starry" };
    return `${en[r.warna] || r.warna}, ${en[r.telinga] || r.telinga} ears, ${en[r.pola] || r.pola}`;
  }
}

class World {
  // events: kejadian dunia dari server (festival, cuaca), masuk lewat aksi net:ref jadi ikut replay (game.js _dunia)
  constructor() { this.npcs = {}; this.npc_logs = {}; this.events = []; }
  make_npc(owner, day, role) {
    const nid = `npc-${owner.id}-${day}-${role}`;
    if (!(nid in this.npcs)) {
      const rng = seed_rng(nid);
      const used = new Set(Object.values(this.npcs).map(v => v.nama));
      const pool = NPC_NAMES.filter(n => !used.has(n));
      this.npcs[nid] = { nama: rng.choice(pool.length ? pool : NPC_NAMES), traits: random_traits(rng), rupa: random_rupa(rng) };
    }
    return [nid, this.npcs[nid]];
  }
}

// ---------------------------------------------------------------- konteks satu makhluk satu hari

class Ctx {
  constructor(c, day, rng, home, attended) {
    this.c = c; this.day = day; this.rng = rng; this.home = home; this.attended = attended;
    this.log = []; this.drama = "kecil";
    this.age = c.age(day);
    this.phase = phase_of(this.age);
  }
  get world() { return this.home.world; }
  get guardian() { return this.home.guardian; }
  get n() { return this.c.name; }
  t(trait) { return this.c.traits[trait]; }
  say(text) { this.log.push(text); }
  pick(options) { return this.rng.choice(options); }
  chance(p) { return this.rng.random() < p; }
  stat(key, delta) { this.c.stats[key] = clamp(this.c.stats[key] + delta, 0, key === "uang" ? 5000 : 100); }
  trait(key, delta) { this.c.traits[key] = round2(clamp(this.c.traits[key] + delta, 1, 99)); }
  need(key, delta) { this.c.needs[key] = clamp(this.c.needs[key] + delta); }
  bond(delta) {
    if (delta > 0) delta *= Math.max(0.1, 1 - this.c.bond / 110);
    this.c.bond = clamp(this.c.bond + delta);
  }
  flag(name, ttl = FOREVER) {
    this.c.set_flag(name, this.day, ttl);
    const S = SCAR_FLAG[name];
    if (S && ttl >= S.min) this.scar(S.k);
  }
  // Bekas: kejadian besar yang mengubah dia seterusnya. Sebabnya diisi dari ingatan yang dicatat hari itu.
  scar(k, why = null) {
    const B = (this.c.info.bekas ||= {});
    if (B[k]) { B[k].n = (B[k].n || 1) + 1; return; }
    B[k] = { d: this.day, why };
  }
  has(name) { return this.c.has(name, this.day); }
  remember(text) {
    const mem = this.c.memory;
    mem.push({ hari: this.day, teks: text, drama: this.drama });
    for (const b of Object.values(this.c.info.bekas || {})) if (b.d === this.day && b.why == null) b.why = text;
    // kronik keluarga: kejadian sedang dan besar disimpan di rumah, nggak ikut terbuang dari ingatan pribadi
    if (this.home && this.home.kronik && this.drama !== "kecil") {
      this.home.kronik.push({ d: this.day, id: this.c.id, t: text, b: this.drama === "besar" ? 1 : 0 });
      if (this.home.kronik.length > 1500) this.home.kronik.splice(this.home.kronik.findIndex(e => !e.b), 1);
    }
    if (mem.length > 20) {
      const rank = { kecil: 0, sedang: 1, besar: 2 };
      let drop = 0;
      for (let i = 1; i < mem.length; i++) {
        const a = mem[i], b = mem[drop];
        if (rank[a.drama] < rank[b.drama] || (rank[a.drama] === rank[b.drama] && a.hari < b.hari)) drop = i;
      }
      mem.splice(drop, 1);
    }
  }
  with_npc(npc_id, text) { (this.world.npc_logs[npc_id] ||= []).push([this.day, this.c.id, text]); }
  obey_chance() {
    const mult = { bayi: 1.6, anak: 1.2, remaja: 0.8, dewasa: 0.6, tua: 0.5 }[this.phase];
    const base = this.c.bond / 100 * 0.55 + this.t("patuh") / 100 * 0.45;
    return clamp(0.15 + 0.85 * base * mult, 0, 1);
  }
  rule(topic) { return this.guardian.rules[topic] ?? null; }
  by_rule(text, wanted, self_pick, options) {
    inc(this.home.stats, "diputus_aturan_rumah");
    if (wanted === self_pick) {
      this.say(`_House rule: ${text}._`);
      return [wanted, true];
    }
    const followed = this.chance(this.obey_chance());
    this.say(`_House rule: ${text}. ` + (followed ? "They obeyed._" : `They broke it: ${lower(options[self_pick])}._`));
    return [followed ? wanted : self_pick, followed];
  }
  // Dilema dengan jendela keputusan. Return [pilihan_penjaga, pilihan_akhir, nurut].
  ask(question, options, prefs, self_pick, { obey = true, alone = null, safe = null } = {}) {
    const g = this.guardian, stats = this.home.stats;
    inc(stats, "dilema");
    const w = WINDOW[this.drama];
    let late = null, human_choice = null;
    if (g.decide) {
      const got = g.decide(this, question, options, w);
      if (got) [late, human_choice] = got;
    } else {
      for (let k = 0; k <= w; k++) if (g.attends(this.day + k)) { late = k; break; }
    }
    if (late === null) {
      safe = safe || prefs.tegas;
      if (g.proxy === "aman" && safe in options && safe !== self_pick) {
        inc(stats, "diputus_wakil");
        const followed = obey ? this.chance(this.obey_chance() * 0.8) : true;
        const final = followed ? safe : self_pick;
        this.say(`_Decision: ${question} You didn't open the app within ${w + 1} day${w ? "s" : ""}, so your helper picked the safe choice: `
          + lower(options[safe]) + (followed ? "" : `; they didn't listen and chose: ${lower(options[self_pick])}`) + "._");
        return [safe, final, followed];
      }
      inc(stats, "diputus_sendiri");
      this.say(`_Decision: ${question} You didn't open the app within ${w + 1} day${w ? "s" : ""}, `
        + (alone || `so ${this.n} decided alone: ${lower(options[self_pick])}.`) + "_");
      return [null, self_pick, null];
    }
    inc(stats, "dijawab_penjaga");
    const when = late === 0 ? "" : ` (answered ${late} day${late > 1 ? "s" : ""} later)`;
    if (late) inc(stats, "dijawab_telat");
    const choice = human_choice !== null ? human_choice : g.choose(this.rng, options, prefs, self_pick);
    if (!obey || choice === self_pick) {
      this.say(`_Decision: ${question} You chose: ${options[choice]}${when}._`);
      return [choice, choice, true];
    }
    const followed = this.chance(this.obey_chance());
    const final = followed ? choice : self_pick;
    const note = followed ? "they listened" : `they didn't listen and chose: ${lower(options[self_pick])}`;
    this.say(`_Decision: ${question} You chose: ${options[choice]}${when}; ${note}._`);
    return [choice, final, followed];
  }
}

// ---------------------------------------------------------------- storylet dan sutradara

const REGISTRY = [];
const AMBIENT = {};
const FORCED = [];
const HOOKS = {};

// ---------------------------------------------------------------- bekas
const SCAR_FLAG = { patah_hati: { k: "hati", min: 14 }, berduka: { k: "duka", min: 30 } };
const SCARS = {
  hati: { label: "Guarded heart", note: "slower to fall for someone new" },
  duka: { label: "Holds family close", note: "family dinners mean more" },
  bangkrut: { label: "Careful with money", note: "says no to spending more often" },
  phk: { label: "Job worries", note: "takes any decent job, rarely takes a day off" },
};
// sesekali kebawa lagi: hari peringatan tiap tahun, dan kadang di malam yang sepi
function scar_days(x) {
  const B = x.c.info.bekas;
  if (!B) return;
  for (const [k, b] of Object.entries(B)) {
    const since = x.day - b.d, why = b.why ? b.why.replace(/\.$/, "") : null;
    if (since <= 0 || !why) continue;
    if (since % YEAR === 0) {
      x.need("mood", -4);
      const yrs = since / YEAR;
      x.say(`${yrs === 1 ? "One year" : yrs + " years"} ago today: ${why}. ${x.n} is quiet all evening.`);
      x.remember(`Remembered: ${why}.`);
    } else if (since > 14 && since < 2 * YEAR) {
      // makin lama makin jarang kebawa
      const r = seed_rng(x.c.id, x.day, "bekas", k);
      if (r.random() >= 1 / (90 + since / 4)) continue;
      x.need("mood", -2);
      const n = x.n, L = {
        hati: [`A song on the radio makes ${n} go quiet. (${why}.)`, `${n} scrolls back through old messages, then puts the phone away. (${why}.)`],
        duka: [`${n} finds an old photo and sits with it for a while. (${why}.)`, `${n} sets out one cup too many, out of habit, then puts it back. (${why}.)`],
        bangkrut: [`${n} checks the bank balance twice before bed. An old habit, ever since: ${why}.`, `${n} walks past a shop for sale and doesn't look at it. (${why}.)`],
        phk: [`${n} stays late at work again. Since the layoff, they never feel quite safe.`, `${n} reads the company news first thing, just in case. (${why}.)`],
      }[k];
      x.say(L ? r.choice(L) : `${n} thinks about it again: ${why}.`);
    }
  }
}

// Kejadian dunia yang sedang berlangsung hari itu. Isinya dari server dan sama buat semua pemain; efeknya kecil (mood paling besar 3)
// dan barisnya dipilih dari rng sendiri supaya urutan rng harian storylet tidak bergeser.
function world_active(world, day) { return (world.events || []).filter(e => e.mulai <= day && day <= e.selesai); }
function world_days(x) {
  for (const e of world_active(x.world, x.day)) {
    if (e.efek && e.efek.mood) x.need("mood", e.efek.mood);
    if (e.baris && e.baris.length) {
      const r = seed_rng(x.c.id, x.day, "dunia", e.id);
      if (r.random() < 0.3) x.say(r.choice(e.baris).replace(/\{n\}/g, x.n));
    }
  }
}

function storylet(id, phases, drama, opts, run) {
  const { cooldown = 14, once = false, priority = false, cond = () => true, weight = () => 1.0 } = opts || {};
  REGISTRY.push({ id, phases, drama, run, cond, weight, cooldown, once, priority });
}

const _BY_PHASE = {};
function by_phase(ph) { return (_BY_PHASE[ph] ||= REGISTRY.filter(s => s.phases.includes(ph))); }

function eligible(x, s) {
  const c = x.c;
  if (s.once && c.fired[s.id]) return false;
  if ((c.cooldowns[s.id] ?? -1) > x.day) return false;
  return !!s.cond(x);
}

function director_pick(x) {
  const d = x.c.director;
  const week = String(Math.floor(x.day / 7));
  const left = WEEKLY_BUDGET - (d.spent[week] || 0);
  const since_besar = x.day - d.last_besar;
  const allowed = s => {
    if (DRAMA_COST[s.drama] > left && !s.priority) return false;
    if (s.drama === "besar" && (since_besar < BESAR_GAP || !x.attended)) return false;
    if (s.drama !== "kecil" && since_besar <= CALM_AFTER_BESAR && !s.priority) return false;
    return true;
  };
  const pool = by_phase(x.phase).filter(s => allowed(s) && eligible(x, s));
  const urgent = pool.filter(s => s.priority);
  if (urgent.length) return x.rng.choice(urgent);
  const ph = x.phase;
  const chance = Math.min(0.95, EVENT_CHANCE[ph] + QUIET_BOOST[ph] * d.quiet);
  if (!pool.length || x.rng.random() > chance) return null;
  const boost = x.boost || {};
  const weights = pool.map(s => Math.max(0, s.weight(x)) * DRAMA_WEIGHT[s.drama] * (boost[s.id] || 1));
  if (weights.reduce((a, b) => a + b, 0) <= 0) return null;
  return x.rng.choices(pool, weights)[0];
}

function make_log(c, day, x, phase, attended, lines, dramas, events, who = [], ach = [], lineAt = {}) {
  return { day, date: new Date(START_DATE + day * 86400000), cid: c.id, name: c.name, gen: c.gen, age: x.age,
    phase, attended, lines, dramas, events, who, ach, lineAt };
}

function daily_rules(x) {
  if (x.phase !== "anak" && x.phase !== "remaja") return;
  const rules = x.guardian.rules;
  let strict = 0, lenient = 0;
  for (const [k, v] of Object.entries(STRICT)) {
    if (rules[k] === v) strict++;
    else if (rules[k] != null) lenient++;
  }
  const ob = x.obey_chance();
  x.trait("rajin", 0.03 * strict * ob);
  x.trait("patuh", 0.012 * strict * ob);
  x.bond(-0.004 * strict * (1 - ob));
  x.trait("ramah", 0.008 * lenient);
  x.trait("kreatif", 0.006 * lenient);
}

function simulate_day(c, day, home) {
  const rng = seed_rng(c.id, day);
  const g = home.guardian;
  const attended = g.attends(day);
  const x = new Ctx(c, day, rng, home, attended);

  const decay = { lapar: 35, energi: 25, kebersihan: 30 };
  const manual = !!g.manual_care;
  // Rawat pagi dan malam (pemain): tengah malam hanya separuh hari yang lewat. Energi tidak turun kalau semalam ditidurkan.
  const careOn = manual && HOOKS.care_on && HOOKS.care_on(c, day);
  const night = careOn ? HOOKS.care_night(x) : null;
  for (const [k, v] of Object.entries(decay)) x.need(k, -(night ? night[k] : v) * rng.uniform(0.8, 1.2));
  if (attended) {
    if (!manual) for (const k of Object.keys(decay)) c.needs[k] = 100.0;
    x.need("mood", 6);
    x.bond(0.08);
  } else {
    // dititip, atau hari pertama nggak buka: keluarga yang ngurus, ikatan nggak turun
    const cover = HOOKS.cover ? HOOKS.cover(c, day) : null;
    const floor = Math.max({ remaja: 40.0, dewasa: 65.0, tua: 55.0 }[x.phase] || 0.0, cover ? 60.0 : 0.0);
    for (const k of Object.keys(decay)) c.needs[k] = Math.max(c.needs[k], floor);
    if (!cover) x.bond({ bayi: -0.15, anak: -0.15, remaja: -0.08 }[x.phase] ?? -0.03);
  }
  const low = Object.keys(decay).filter(k => c.needs[k] < 30);
  if (low.length) {
    x.need("mood", -6 * low.length);
    x.stat("kesehatan", -0.6 * low.length);
  } else {
    x.stat("kesehatan", 0.15);
    x.need("mood", 2);
  }
  if (x.phase === "tua") x.stat("kesehatan", -0.03);

  daily_rules(x);
  scar_days(x);
  world_days(x);
  if (HOOKS.agenda) HOOKS.agenda(x);  // kegiatan harian: rencana penjaga atau pilihan makhluk sendiri

  const ujian = c.info.ujian;
  if (ujian && attended && !manual && day < ujian.hari && ujian.belajar < 3 && rng.random() < g.tap) {
    ujian.belajar += 1;
    inc(home.stats, "tap_temani_belajar");
  } else if (ujian && day < ujian.hari && (ujian.sendiri || 0) < 3 && seed_rng(c.id, day, "belajar").random() < x.t("rajin") / 120) {
    // belajar sendiri sesuai rajinnya, walau penjaganya nggak datang (efeknya lebih kecil dari belajar bareng)
    ujian.sendiri = (ujian.sendiri || 0) + 1;
  }

  // who was part of today: anyone met, or whose place in this creature's life changed (for photo memories)
  const relBefore = Object.fromEntries(Object.entries(c.relations).map(([k, r]) => [k, r.tipe]));
  const achBefore = c.st && c.st.ach ? c.st.ach.length : 0;
  const dramas = [], events = [], lineAt = {};
  for (const forced of FORCED) {
    if (forced.cond(x)) {
      x.drama = "sedang";
      const n0 = x.log.length;
      x.say(forced.run(x));
      lineAt[forced.id] = x.log[n0];
      dramas.push("sedang");
      events.push(forced.id);
    }
  }

  const s = director_pick(x);
  const d = c.director;
  if (s) {
    x.drama = s.drama;
    const n0 = x.log.length;
    const text = s.run(x);
    if (text) x.say(text);
    if (x.log.length > n0) lineAt[s.id] = x.log[n0];
    c.fired[s.id] = (c.fired[s.id] || 0) + 1;
    c.cooldowns[s.id] = day + s.cooldown;
    const week = String(Math.floor(day / 7));
    d.spent[week] = (d.spent[week] || 0) + DRAMA_COST[s.drama];
    if (s.drama === "besar") d.last_besar = day;
    d.quiet = 0;
    dramas.push(s.drama);
    events.push(s.id);
  } else {
    d.quiet += 1;
    if (!events.length && !x.boost) x.say(AMBIENT[x.phase](x));
  }
  if (HOOKS.status) HOOKS.status(x, dramas, events);  // skill, karier, momen penting, dadu (status.js)

  const ph = x.phase;
  if (ph === "anak" || ph === "remaja") x.stat("kecerdasan", 0.08 + x.t("rajin") / 1500);
  if (c.info.kuliah_aktif) x.stat("kecerdasan", 0.06);
  if ((ph === "dewasa" || ph === "tua") && c.info.kerja && !c.st) {
    x.stat("uang", (c.info.gaji ?? 3) / 30);
    x.stat("karier", 0.004 + x.t("ambisius") / 10000 + x.t("rajin") / 4000);
  }
  if (x.age === adult_age(2 * YEAR)) c.info.ikatan_umur2 = Math.round(c.bond * 10) / 10;
  if (x.age === adult_age(5 * YEAR)) {
    c.info.karier_umur5 = Math.round(c.stats.karier * 10) / 10;
    c.info.uang_umur5 = Math.round(c.stats.uang);
  }
  x.need("mood", (60 - c.needs.mood) * 0.05);

  for (const [k, v] of Object.entries(c.flags)) if (v < day) delete c.flags[k];
  for (const k of Object.keys(d.spent)) if (Number(k) < Math.floor(day / 7) - 1) delete d.spent[k];

  c.last_day = day;
  const who = Object.entries(c.relations).filter(([k, r]) => relBefore[k] !== r.tipe)
    .map(([k, r]) => ({ id: k, nama: r.nama, tipe: r.tipe, rupa: (home.world.npcs[k] || {}).rupa || null }));
  const ach = c.st && c.st.ach ? c.st.ach.slice(achBefore).map(a => ({ id: a.id, label: a.label })) : [];
  return make_log(c, day, x, ph, attended, x.log, dramas, events, who, ach, lineAt);
}

// ---------------------------------------------------------------- rumah tangga

class Household {
  constructor(account_id, guardian, slots = 6) {
    this.id = account_id; this.guardian = guardian; this.slots = slots;
    guardian.account = account_id;
    this.world = new World();
    this.members = [];
    this.stats = {};
    this.adopted_out = []; this.besan_kids = [];
    this.kronik = [];
    this.last_day = -1;
  }
  found(cid, name = null) {
    const c = Creature.new(`${this.id}/${cid}`, { born: 0, gen: 1, name });
    Object.assign(c.info, { minat_cinta: 1.0, subur: true, merantau: false });
    this.members.push(c);
    return c;
  }
  living(day) { return this.members.filter(c => c.alive(day) && !("keluar" in c.info)); }
  free_slots(day) { return this.slots - this.living(day).length; }
  get(cid) { return this.members.find(c => c.id === cid) || null; }
  children_of(c) { return this.members.filter(m => m.parents.includes(c.id)); }
  view(day, sink = null) {
    for (let d = this.last_day + 1; d <= day; d++) {
      for (const c of [...this.members]) {
        if ("keluar" in c.info) continue;
        let log;
        if (c.born <= d && d < c.death_day && c.last_day < d) log = simulate_day(c, d, this);
        else if (d === c.death_day && c.last_day < d) { log = HOOKS.akhir_hidup(c, d, this); c.last_day = d; }
        else continue;
        if (sink) sink.push(log);
      }
      // Rumah tidak boleh kosong: anak rantau pulang, atau datang telur baru
      if (this.members.length && !this.living(d).length && HOOKS.rumah_kosong) {
        for (const log of HOOKS.rumah_kosong(this, d)) if (sink) sink.push(log);
      }
      this.last_day = d;
    }
  }
  snapshot() {
    return JSON.stringify({ members: this.members, world: this.world, stats: this.stats,
      adopted_out: this.adopted_out, besan_kids: this.besan_kids, kronik: this.kronik, last_day: this.last_day });
  }
  restore(snap) {
    const o = JSON.parse(snap);
    this.members = o.members.map(m => new Creature(m));
    this.world = Object.assign(new World(), o.world);
    Object.assign(this, { stats: o.stats, adopted_out: o.adopted_out, besan_kids: o.besan_kids, kronik: o.kronik || [], last_day: o.last_day });
  }
}

function make_ctx(c, day, home, drama = "besar") {
  const x = new Ctx(c, day, seed_rng(c.id, day, "khusus"), home, home.guardian.attends(day));
  x.drama = drama;
  return x;
}

class GuardianBot {
  constructor(style = "suportif", attend = 0.85) {
    this.style = style; this.attend = attend; this.account = "akun";
    const rng = seed_rng("aturan", style, attend);
    if (RULESETS[style]) this.rules = { ...RULESETS[style] };
    else {
      this.rules = {};
      for (const [k, v] of Object.entries(STRICT)) this.rules[k] = rng.choice([v, null, RULESETS.suportif[k]]);
    }
    this.proxy = { suportif: "ikut_dia", tegas: "aman" }[style] || rng.choice(["aman", "ikut_dia"]);
    this.tap = { suportif: 0.8, tegas: 0.9 }[style] ?? 0.4;
  }
  attends(day) { return seed_rng(this.account, day, "hadir").random() < this.attend; }
  choose(rng, options, prefs, self_pick) {
    const pick = prefs[this.style];
    if (pick === "SELF") return self_pick;
    if (pick in options) return pick;
    return rng.choice(Object.keys(options));
  }
}

const Engine = { make_log, FOREVER, YEAR, PHASES, OLD_AGE, LIFESPAN, adult_age, ADULT_SCALE, NAMES, RUPA, TRAITS, START_DATE, WINDOW, RULESETS, STRICT,
  seed_rng, clamp, phase_of, inherit, inc, lower, Creature, World, Ctx, REGISTRY, AMBIENT, FORCED, HOOKS,
  storylet, simulate_day, SCARS, Household, make_ctx, make_log, GuardianBot, world_active };
if (typeof module !== "undefined") module.exports = Engine;
else globalThis.Engine = Engine;

// ilmu.js (v82): ilmu per jalur di pohon bintang, les berbayar, minat per topik, dan bintang yang nyala sendiri.
// Rancangan "Les, ilmu, dan HUD" (8 Nov): satu angka 0–100 per jalur, dan tingkat = seberapa dalam makhluknya masuk ke pohon.
//   Junior (0–24)        = cabang di buku bintang (Science, Sport, ...): topik umum.
//   Intermediate (25–54) = ranting (Chemistry, Swimming, ...): les. Di 25 jalurnya cabang lewat kursus yang diambil.
//   Senior (55–84)       = panggilan (Organic chemist, Pro swimmer, ...): pekerjaan nyata. Master mulai 85.
// Cabang yang nggak dipilih berhenti di titik cabangnya (ambil Chemistry, Biology tetap 25). Poin cuma masuk ke satu tempat:
// simpul les itu sendiri, atau kalau makhluknya sudah lebih dalam, cabang terdalamnya (pakai pengali level match).
// Les di luar jalur nggak ngaruh. Nggak ada transfer antar topik.
//
// Semua jalan di simulasi dan tercatat lewat aksi "les:<kursus>" (koin dapur dipotong UI) atau "les:<kursus>:dompet" (dompet sendiri,
// dewasa). Biar save lama nggak berubah waktu diputar ulang, sistem ini baru hidup mulai home.ilmu_from (diisi game.js dari state).
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const T = (typeof module !== "undefined") ? require("./tree.js") : globalThis.Tree;
  const Money = (typeof module !== "undefined") ? require("./money.js") : globalThis.Money;
  const { HOOKS, seed_rng, phase_of, storylet } = E;
  const N = T.NODES;

  // ---------------------------------------------------------------- tingkat dan pengali
  const TIER = ["Junior", "Intermediate", "Senior", "Master"];
  const LEVEL = { field: 0, spec: 1, niche: 2 };          // tingkat kelas simpul itu
  const LO = [0, 25, 55], HI = [25, 55, 100];             // jalur masuk simpul di LO, mentok di HI sampai cabang berikutnya diambil
  const MASTER = 85;
  const tierOf = v => v >= MASTER ? 3 : v >= 55 ? 2 : v >= 25 ? 1 : 0;
  // kelas dibanding tingkat makhluk: di atas = basic belum kuat, lambat; di bawah = hampir nggak dapat apa-apa (diputusin 8 Nov)
  const MATCH = { 2: 0.2, 1: 0.5, 0: 1, "-1": 0.05 };
  const matchOf = (cls, lrn) => { const d = cls - Math.min(lrn, 2); return d >= 2 ? MATCH[2] : d <= -2 ? 0 : MATCH[d]; };

  // ---------------------------------------------------------------- kursus
  // Junior: satu kursus per cabang (topik umum). Intermediate: 20 les. Senior: dua panggilan di bawah tiap les.
  const JUNIOR = { sport: "Junior sports club", vital: "Junior first aid", hands: "Little makers", science: "Junior science", numbers: "Junior maths",
    words: "Junior reading & writing", art: "Junior art class", music: "Junior music", media: "Junior film club", lead: "Junior scouts" };
  const LES = { water: "Swimming", ball: "Football", track: "Athletics", cooking: "Cooking class", building: "Woodwork", firstaid: "First aid",
    data: "Math", lab: "Chemistry", medicine: "Biology", engineering: "Coding", strategy: "Chess", writing: "Writing", law: "Debate",
    painting: "Drawing", instrument: "Music", voice: "Singing", rhythm: "Dance", film: "Film club", public: "Public speaking", team: "Scouts" };
  const PRICE = [60, 120, 200], BASE = [3, 3, 2.5];   // Senior lebih pelan; di atas 85 (Master) setengahnya lagi
  const SESI = [0, 3, 7, 10, 14, 17, 21, 24];             // 8 sesi, 2× seminggu, 4 minggu
  const WAVE = 14, MIN_AGE = 60;                          // kursus mulai tiap 2 minggu; mulai umur sekolah
  const fieldOf = id => { const n = N[id]; return n.tier === "field" ? id : n.field; };
  const kidsOf = id => N[id].kids.filter(k => LEVEL[N[k].tier] === LEVEL[N[id].tier] + 1 && N[k].req[0] === id);
  const COURSES = {};
  const addC = (id, name, lvl) => { COURSES[id] = { id, node: id, name, lvl, price: PRICE[lvl], field: fieldOf(id), root: N[id].root, sport: N[id].root === "body" && fieldOf(id) === "sport" }; };
  for (const [id, name] of Object.entries(JUNIOR)) addC(id, name, 0);
  for (const [id, name] of Object.entries(LES)) { addC(id, name, 1); for (const k of kidsOf(id)) addC(k, N[k].label, 2); }
  const SKILL_OF = { body: "fitness", mind: "logic", spark: "creativity", heart: "charm" };

  // kegiatan sehari-hari yang dipilih makhluknya sendiri (agenda.js) ngasih sedikit ilmu ke simpul yang nyambung.
  // Ranting yang nggak punya les (Circle, Network, Family, ...) cuma tumbuh dari sini.
  const LIFE = { belajar: [["numbers", 0.3], ["science", 0.2]], olahraga: [["sport", 0.3]], teman: [["circle", 0.4]], bantu_rumah: [["cooking", 0.25]],
    latihan: [["art", 0.2], ["music", 0.2]], bebas: [["games", 0.3]], sosial: [["network", 0.4]], pasangan: [["devotion", 0.4]],
    keluarga: [["family", 0.4]], hobi: [["art", 0.2], ["gardening", 0.3]], kerja_keras: [["business", 0.3]], istirahat: [], cucu: [["family", 0.3]],
    jalan_pagi: [["outdoors", 0.3]], kenangan: [["writing", 0.15]], kerja_sambilan: [["business", 0.25]], dongeng: [["words", 0.2]], main: [["art", 0.15]] };

  // ---------------------------------------------------------------- data per makhluk
  function il(st) { return st.ilmu ||= { v: {}, minat: {}, kursus: [], selesai: [], ucap: null }; }
  // nilai jalur di simpul id: angka sendiri, atau yang terbawa dari cabang di bawahnya (mentok di HI), atau warisan dari induk (mentok di LO)
  function down(I, id) {
    const L = LEVEL[N[id].tier]; let b = I.v[id];
    for (const k of kidsOf(id)) { const d = down(I, k); if (d != null) b = Math.max(b ?? 0, Math.min(d, HI[L])); }
    return b;
  }
  function eff(I, id) {
    const n = N[id], L = LEVEL[n.tier]; if (L == null) return 0;
    const d = down(I, id); if (d != null) return d;
    return L === 0 ? 0 : Math.min(eff(I, L === 1 ? n.field : n.spec), LO[L]);
  }
  // cabang terdalam yang sudah dimasuki di bawah id (buat poin dari kelas di bawah tingkat)
  function deepest(I, id) {
    let best = null;
    for (const k of kidsOf(id)) {
      const d = I.v[k] != null ? deepest(I, k) || k : deepest(I, k);
      if (d && (!best || (I.v[d] ?? 0) > (I.v[best] ?? 0))) best = d;
    }
    return best;
  }
  const r1 = v => Math.round(v * 10) / 10;
  // minat per topik umum (cabang): awal dari bakat akar dan sedikit undian berbenih, lalu naik-turun dari pengalaman les
  function minatOf(c, field) {
    const I = il(c.st);
    if (I.minat[field] == null) {
      const t = c.st.genes.talent[SKILL_OF[N[field].root]] || 5, rng = seed_rng(c.id, "minat", field);
      I.minat[field] = Math.max(5, Math.min(95, Math.round(28 + t * 4 + rng.randint(-10, 10))));
    }
    return I.minat[field];
  }
  const MINAT_WORD = v => v >= 75 ? "loves it" : v >= 55 ? "likes it" : v >= 35 ? "it's okay" : v >= 20 ? "bored of it" : "hates it";
  const talentF = (c, id) => 0.6 + ((c.st.genes.talent[SKILL_OF[N[id].root]] || 5) - 1) / 9;
  const minatF = v => 0.5 + v / 100 * 0.7;

  // perkiraan buat UI: gain per sesi dan ke mana poinnya masuk kalau ikut kursus ini sekarang
  function preview(c, cid) {
    const K = COURSES[cid], I = il(c.st), v = eff(I, K.node);
    const capped = v >= HI[K.lvl] - 0.001, deep = capped ? deepest(I, K.node) : null;
    // tingkat makhluk di jalur ini = yang paling dalam (Organic chemist 60 di kelas Science tetap dihitung Senior)
    const lrn = tierOf(deep ? eff(I, deep) : v), m = matchOf(K.lvl, lrn);
    const target = deep || (capped ? null : K.node);
    const mi = minatOf(c, K.field);
    const per = target ? BASE[K.lvl] * talentF(c, K.node) * m * minatF(mi) * ((I.v[target] ?? 0) >= MASTER ? 0.5 : 1) : 0;
    const room = target ? HI[LEVEL[N[target].tier]] - (I.v[target] ?? eff(I, target)) : 0;
    return { v: r1(v), tier: lrn, cls: K.lvl, match: m, per: r1(per), total: r1(Math.min(per * SESI.length, room)), target, tlabel: target ? N[target].label : null, capped: capped && !deep, minat: mi };
  }

  // ---------------------------------------------------------------- jadwal
  const nextWave = d => Math.floor(d / WAVE) * WAVE + WAVE;   // gelombang berikutnya yang mulai sesudah hari d
  const ageOk = (c, day) => c.age(day) >= MIN_AGE;
  const active = (c, day) => c.st && c.st.ilmu ? c.st.ilmu.kursus.filter(k => k.n < SESI.length && day <= k.mulai + SESI[SESI.length - 1]) : [];
  function canEnrol(c, cid, day) {
    const K = COURSES[cid];
    if (!K || !c.st || !c.alive(day) || !ageOk(c, day)) return false;
    const I = il(c.st);
    if (I.kursus.some(k => k.id === cid && k.n < SESI.length)) return false;   // lagi diambil atau sudah daftar
    return true;
  }
  function enrol(home, c, cid, day, pay) {
    const K = COURSES[cid], I = il(c.st);
    if (pay === "dompet") {
      if (c.st.wallet < K.price) return false;
      Money.move(c, -K.price, "les", day);
    }
    I.kursus.push({ id: cid, d: day, mulai: nextWave(day), n: 0, bolos: 0, gain: 0, pay: pay || "dapur", v0: r1(eff(I, K.node)) });
    return true;
  }

  // satu sesi les: energi, mood, minat, poin
  function sesi(x, k) {
    const c = x.c, K = COURSES[k.id], I = il(c.st), rng = seed_rng(c.id, x.day, "les", k.id);
    const mi = minatOf(c, K.field);
    k.n += 1;
    if (x.c.needs.mood < 15 || (mi < 25 && rng.random() < 0.35)) {
      k.bolos += 1;
      I.ucap = { d: x.day, field: K.field, tx: mi < 25 ? `Do I have to go to ${K.name}? I'm staying home.` : `Too tired for ${K.name} today...`, mood: -1 };
      x.say(`_${x.n} skips ${K.name} today (${k.n}/${SESI.length})._`);
      return;
    }
    const v = eff(I, K.node), capped = v >= HI[K.lvl] - 0.001, target = capped ? deepest(I, K.node) : K.node;
    const lrn = tierOf(capped && target ? eff(I, target) : v), m = matchOf(K.lvl, lrn);
    let g = target ? BASE[K.lvl] * talentF(c, K.node) * m * minatF(mi) : 0;
    if (target && (I.v[target] ?? 0) >= MASTER) g *= 0.5;
    if (c.needs.energi < 30) g *= 0.6;
    if (c.needs.mood < 30) g *= 0.7;
    if (target) {
      const L = LEVEL[N[target].tier], cur = I.v[target] ?? eff(I, target);
      I.v[target] = r1(Math.min(HI[L], cur + g));
      g = I.v[target] - cur; I.ver = (I.ver || 0) + 1;
    }
    k.gain = r1(k.gain + g);
    x.need("energi", K.sport ? -12 : -8); x.need("mood", -2);
    const sk = SKILL_OF[K.root]; if (c.st.skills && sk in c.st.skills) c.st.skills[sk] = Math.min(100, c.st.skills[sk] + 0.15);
    // minat: maju di kelas yang pas bikin suka, kelas yang nggak pas atau capek bikin bosan
    const dm = m >= 1 && g >= 1.5 ? 2 : m <= 0.2 ? -3 : c.needs.mood < 30 ? -1 : 0.5;
    I.minat[K.field] = Math.max(0, Math.min(100, mi + dm));
    const lv = I.minat[K.field];
    I.ucap = { d: x.day, field: K.field, tx: lv >= 70 ? `${K.name} was so much fun today!` : lv >= 45 ? `${K.name} was good today.` : lv >= 25 ? `${K.name} again... okay.` : `Ugh, ${K.name} again...`, mood: lv >= 45 ? 1 : -1 };
    x.say(`_${x.n} goes to ${K.name} (${k.n}/${SESI.length})._`);
  }
  function selesai(x, k) {
    const c = x.c, K = COURSES[k.id], I = il(c.st), v = eff(I, K.node);
    I.selesai.push({ id: k.id, d: x.day, gain: k.gain, bolos: k.bolos });
    const t0 = tierOf(k.v0), t1 = tierOf(v);
    const where = k.gain > 0 ? labelAt(I, K.node) : null;
    const up = t1 > t0 ? ` That's ${TIER[t1]} now: ${x.n} passes the end-of-course test.` : v >= HI[K.lvl] - 0.001 && !deepest(I, K.node) && K.lvl < 2 ? ` To keep growing, ${x.n} needs one of the next courses: ${kidsOf(K.node).filter(id => COURSES[id]).map(id => COURSES[id].name).join(" or ")}.` : "";
    x.say(`${x.n} finishes ${K.name}: ${k.gain > 0 ? `+${r1(k.gain)} ${where.label}, now ${Math.round(where.v)} · ${TIER[tierOf(where.v)]}` : "no progress this time"}${k.bolos ? `, after skipping ${k.bolos} of ${SESI.length}` : ""}.${up}`);
    x.remember(`Finished ${K.name}${up ? `, ${TIER[t1]}` : ""}.`);
  }
  // nama dan nilai jalur yang paling dalam di bawah simpul ini (buat kalimat dan buku skill)
  function labelAt(I, id) {
    const d = deepest(I, id) || id;
    return { id: d, label: N[d].label, v: eff(I, d) };
  }

  // ---------------------------------------------------------------- bintang nyala sendiri
  // Cabang nyala di 10, ranting di 25 (Intermediate), panggilan di 55 (Senior), legenda di 85 (Master).
  // Lingkar luar (master, icon, crown), kombinasi, dan rahasia tetap pakai syarat lamanya, tapi nyala sendiri tanpa poin.
  const LIGHT = { field: 10, spec: 25, niche: 55 };
  const GATE = { master: 7, icon: 8, crown: 9 };
  function light(c, home, day) {
    const S = c.st, TR = S.tree || (S.tree = { have: [], days: {}, peak: 0, spent: 0, legacy: null, seen: [] }), I = il(S);
    const have = new Set(TR.have), got = [];
    const on = id => { if (!have.has(id)) { have.add(id); TR.have.push(id); TR.days[id] = day; got.push(id); if (N[id].fx.life) c.death_day += N[id].fx.life; } };
    for (const id of T.ORDER) {
      const n = N[id];
      if (n.tier in LIGHT) { if (eff(I, id) >= LIGHT[n.tier] && (I.v[id] != null || down(I, id) != null)) { if (n.root) on(n.root); if (n.field && n.tier !== "field") on(n.field); if (n.spec) on(n.spec); on(id); } }
      else if (n.tier === "legend") { if (eff(I, n.req[0]) >= MASTER && have.has(n.req[0])) on(id); }
      else if (n.reqAny) { const t = S.genes.talent[SKILL_OF[n.root]] + (Math.max((TR.top || {})[SKILL_OF[n.root]] || 0, S.skills[SKILL_OF[n.root]] || 0) >= 90 ? 1 : 0); if (n.reqAny.some(r => have.has(r)) && t >= GATE[n.tier]) on(id); }
      else if (n.tier === "combo") { if (n.req.every(r => have.has(r))) on(id); }
      else if (n.tier === "secret") { const ok = n.req.length ? n.req.every(r => have.has(r)) : have.size > 0; if (ok && n.cond(c, S, home, day)) on(id); }
    }
    return got;
  }
  const on = (home, day) => home.ilmu_from != null && day >= home.ilmu_from;

  // ---------------------------------------------------------------- hook harian
  const _status = HOOKS.status;
  HOOKS.status = (x, dramas, events) => {
    _status(x, dramas, events);
    const c = x.c;
    if (!c.st || !on(x.home, x.day)) return;
    const I = il(c.st);
    // kegiatan yang dipilih sendiri hari ini
    const A = c.info.agenda_hari;
    if (A && A.hari === x.day && LIFE[A.id]) for (const [id, g] of LIFE[A.id]) {
      if (!N[id]) continue;
      const L = LEVEL[N[id].tier], cur = I.v[id] ?? eff(I, id);
      if (cur < HI[L]) { I.v[id] = r1(Math.min(HI[L], cur + g)); I.ver = (I.ver || 0) + 1; }
    }
    // les yang jadwalnya hari ini
    for (const k of I.kursus) {
      if (k.n >= SESI.length) continue;
      if (x.day - k.mulai === SESI[k.n]) { sesi(x, k); if (k.n >= SESI.length) selesai(x, k); }
      else if (x.day > k.mulai + SESI[k.n]) { k.n += 1; k.bolos += 1; if (k.n >= SESI.length) selesai(x, k); }   // hari yang kelewat (misal sakit)
    }
    // nyalain bintang cuma kalau ilmunya berubah (rahasia dan kombinasi dicek seminggu sekali)
    if (I.ver === I.lit && x.day % 7) return;
    I.lit = I.ver;
    const got = light(c, x.home, x.day);
    const big = got.filter(id => ["spec", "niche", "legend"].includes(N[id].tier));
    if (big.length) x.say(`_A new star lights up in ${x.n}'s star book: ${big.map(id => N[id].label).join(", ")}._`);
  };

  // tindakan pemain "les:<kursus>" atau "les:<kursus>:dompet"
  const _act = HOOKS.act;
  HOOKS.act = (home, cid, kind, day) => {
    if (!kind.startsWith("les:")) return _act ? _act(home, cid, kind, day) : undefined;
    const c = home.get(cid), [, id, pay] = kind.split(":");
    if (!c || !on(home, day) || !canEnrol(c, id, day)) return false;
    if (pay === "dompet" && !["dewasa", "tua"].includes(phase_of(c.age(day)))) return false;
    return enrol(home, c, id, day, pay === "dompet" ? "dompet" : "dapur");
  };

  // ---------------------------------------------------------------- dilema: mau berhenti les
  // Minat jatuh di bawah 25 sesudah paling nggak 2 sesi: makhluknya minta keluar. Sekali per kursus.
  // Lanjut = selesaiin kursusnya (bisa nggak nurut). Berhenti = sisa sesi hangus, uang nggak balik, lega.
  const quitOf = (c, day) => {
    if (!c.st || !c.st.ilmu) return null;
    const I = c.st.ilmu;
    return I.kursus.find(k => k.n >= 2 && k.n < SESI.length - 1 && !k.tanya && day >= k.mulai && minatOf(c, COURSES[k.id].field) < 25) || null;
  };
  storylet("les_berhenti", ["anak", "remaja", "dewasa", "tua"], "sedang", { cooldown: 10,
    cond: x => on(x.home, x.day) && x.day - (x.c.info.dilema_hari ?? -7) >= 7 && !!quitOf(x.c, x.day), weight: () => 3 }, x => {
    const k = quitOf(x.c, x.day), K = COURSES[k.id], I = il(x.c.st);
    k.tanya = x.day;
    x.c.info.dilema_hari = x.day;
    x.say(`${x.n} pushes their ${K.name} bag under the bed. "Can I stop going? I really don't like it."`);
    const [, final] = x.ask(`${x.n} wants to quit ${K.name} (${k.n}/${SESI.length} sessions done).`,
      { lanjut: "Finish the course", berhenti: "Okay, you can stop" },
      { suportif: "berhenti", tegas: "lanjut" }, "berhenti", { safe: "lanjut" });
    if (final === "lanjut") {
      x.need("mood", -3);
      I.minat[K.field] = Math.max(0, I.minat[K.field] - 2);
      x.say(`${x.n} sighs and keeps going to ${K.name}.`);
      return;
    }
    const left = SESI.length - k.n;
    k.n = SESI.length; k.stop = x.day;
    I.selesai.push({ id: k.id, d: x.day, gain: k.gain, bolos: k.bolos, stop: true });
    I.minat[K.field] = Math.min(100, I.minat[K.field] + 3);
    x.need("mood", 5);
    x.say(`${x.n} stops ${K.name}, ${left} session${left === 1 ? "" : "s"} early. The fee doesn't come back, but ${x.n} looks lighter${k.gain > 0 ? `, and keeps the +${r1(k.gain)} from the sessions they went to` : ""}.`);
    x.remember(`Quit ${K.name}.`);
  });

  // ---------------------------------------------------------------- tampilan
  // buku skill: tiap cabang yang sudah disentuh, jalur terdalamnya, tingkat, minat, kalimat terakhir soal topik itu
  function book(c) {
    if (!c.st) return [];
    const I = il(c.st), out = [];
    for (const rid of T.ROOTS) for (const fid of N[rid].kids.filter(k => N[k].tier === "field")) {
      const v = eff(I, fid), touched = down(I, fid) != null;
      const hasLes = !!COURSES[fid] || kidsOf(fid).some(k => COURSES[k]);
      if (!touched && !hasLes) continue;
      const deep = labelAt(I, fid), paths = [];
      for (const s of kidsOf(fid)) if (down(I, s) != null) { const L = labelAt(I, s); paths.push({ id: L.id, label: L.label, v: r1(L.v), tier: tierOf(L.v) }); }
      paths.sort((a, b) => b.v - a.v);
      out.push({ field: fid, label: N[fid].label, root: rid, v: r1(Math.max(v, deep.v)), top: touched ? deep.label : N[fid].label, tier: tierOf(Math.max(v, deep.v)), paths, touched,
        minat: hasLes ? minatOf(c, fid) : null, word: hasLes ? MINAT_WORD(minatOf(c, fid)) : null, ucap: I.ucap && I.ucap.field === fid ? I.ucap.tx : null });
    }
    return out.sort((a, b) => (b.touched - a.touched) || (b.v - a.v));
  }
  // daftar kursus yang masuk akal buat makhluk ini: di jalurnya, paling banyak satu tingkat di atas, dan bukan yang sudah lewat jauh
  function catalog(c, day) {
    const I = il(c.st), out = [];
    for (const K of Object.values(COURSES)) {
      const p = preview(c, K.id);
      if (K.lvl > p.tier + 1) continue;                      // Senior buat yang masih Junior: belum kelihatan
      if (K.lvl === 2 && eff(I, N[K.node].spec) < 40) continue;   // panggilan kelihatan menjelang Senior
      if (p.match === 0) continue;                           // dua tingkat di bawah: nggak ada gunanya
      out.push({ ...K, ...p, flabel: N[K.field].label, taking: I.kursus.some(k => k.id === K.id && k.n < SESI.length), parent: K.lvl ? COURSES[K.lvl === 1 ? K.field : N[K.node].spec] : null });
    }
    return out;
  }
  // rekomendasi: kelas yang pas tingkatnya, dari topik yang paling disukai dan paling berbakat
  function recommend(c, day, n = 3) {
    // jalur yang sudah dimulai didahulukan (lanjut lebih dalam), sesudah itu yang paling cepat maju
    const score = k => k.per + (k.v >= 10 ? 1.5 : 0) + k.lvl * 0.5;
    return catalog(c, day).filter(k => !k.taking && !k.capped && k.match >= 1).sort((a, b) => (score(b) - score(a)) || (b.minat - a.minat)).slice(0, n);
  }
  function schedule(k) { return SESI.map(s => k.mulai + s); }

  const API = { TIER, LEVEL, LO, HI, MASTER, MATCH, COURSES, JUNIOR, LES, PRICE, SESI, WAVE, MIN_AGE, tierOf, matchOf, eff, down, deepest, il, preview,
    minatOf, MINAT_WORD, nextWave, active, canEnrol, book, catalog, recommend, schedule, labelAt, light, kidsOf };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Ilmu = API;
})();

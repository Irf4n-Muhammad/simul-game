// Karier ala dunia nyata: perusahaan tetap per kota (sama untuk semua pemain, bertahan lintas generasi), tiap
// perusahaan punya nama jabatan dan gaji sendiri, lowongan datang dan pergi, ada PHK dan perusahaan yang tutup.
// Plus "Burrow": profil kerja dan feed kabar dari makhluk lain. Semua fungsi murni dari hari + seed, jadi
// game tetap bisa diputar ulang dari catatan tindakan pemain.
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const ST = (typeof module !== "undefined") ? require("./status.js") : globalThis.Status;
  const B = (typeof module !== "undefined") ? require("./brands.js") : globalThis.Brands;
  const { HOOKS, seed_rng, phase_of } = E;
  const JOBS = ST.JOBS;
  const CITY = "old-town";
  const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };

  // ---------------------------------------------------------------- perusahaan
  const IND = {
    fastfood: { n: 4, names: ["Golden Bites", "Toasty Burger", "Rapid Noodle Bar", "Sunny Fry House", "Crunchy Taco Hut", "Happy Dumpling", "Mapleleaf Diner", "Pocket Pizza"],
      ladders: [["Crew", "Shift lead", "Store manager", "Area manager"], ["Kitchen hand", "Line cook", "Kitchen lead", "Operations manager"]] },
    office: { n: 6, names: ["Northbank", "Granite Insurance", "Harborline Logistics", "Silverpine Holdings", "Brightfield Group", "Oakline Trading", "Meadow & Finch", "Copperleaf Partners", "Riverstone Co."],
      ladders: [["Junior clerk", "Senior clerk", "Team lead", "Head of office"], ["Associate", "Senior associate", "Manager", "Director"], ["Analyst I", "Analyst II", "Lead analyst", "Vice president"]] },
    teacher: { n: 3, names: ["Willowbrook School", "Old Town Academy", "Hilltop College", "Pebble Lane School", "Fernhill Institute"],
      ladders: [["Teacher", "Senior teacher", "Vice principal", "Principal"], ["Tutor", "Lecturer", "Head of department", "Dean"]] },
    nurse: { n: 3, names: ["St. Clover Hospital", "Brightwater Clinic", "Old Town Care Home", "Riverside Medical", "Hazel Health"],
      ladders: [["Nurse", "Senior nurse", "Charge nurse", "Head nurse"], ["Care assistant", "Staff nurse", "Ward manager", "Director of nursing"]] },
    designer: { n: 4, names: ["Pinecone Studio", "Paperkite Design", "Bluemoss Agency", "Lantern & Co.", "Foxglove Studio", "Inkwell Works"],
      ladders: [["Junior designer", "Designer", "Lead designer", "Creative director"], ["Design intern", "Product designer", "Design lead", "Head of design"]] },
    software: { n: 5, names: ["Burrowsoft", "Quillbyte", "Acornware", "Mosslight Labs", "Tinybolt", "Hedgehog Systems", "Cloudberry Tech", "Thistle AI"],
      ladders: [["Junior engineer", "Engineer", "Staff engineer", "CTO"], ["Developer", "Senior developer", "Tech lead", "VP of engineering"], ["Software engineer I", "Software engineer II", "Principal engineer", "Chief architect"]] },
    influencer: { n: 3, names: ["Glimmer Media", "Pawprint Network", "Starling Talent", "Bubbletea TV", "Echo Creators"],
      ladders: [["Micro influencer", "Influencer", "Celebrity", "Icon"], ["Content creator", "Creator", "Lead creator", "Head of content"]] },
    athlete: { n: 3, names: ["Old Town Otters FC", "Hill Hares", "River Runners Club", "Thunder Moles", "Pinewood Panthers"],
      ladders: [["Rookie", "Starter", "Captain", "Legend"], ["Reserve", "First team", "Vice captain", "Club legend"]] },
    doctor: { n: 3, names: ["St. Clover Hospital", "Old Town General", "Kestrel Heart Center", "Riverside Medical", "Linden Children's"],
      ladders: [["Resident", "Doctor", "Specialist", "Chief of medicine"], ["Junior doctor", "Registrar", "Consultant", "Medical director"]] },
    quant: { n: 2, names: ["Hollow Capital", "Acorn Quant Partners", "Ridgeback Trading", "Sablefin Fund"],
      ladders: [["Quant", "Senior quant", "Lead quant", "Head of trading"], ["Junior trader", "Trader", "Portfolio manager", "Chief investment officer"]] },
  };
  const SIZES = [
    { id: "Startup", pay: [0.9, 1.35], req: -3, layoff: 0.07, fold: 0.55, hire: 0.5 },
    { id: "Small company", pay: [0.85, 1.1], req: -1, layoff: 0.04, fold: 0.3, hire: 0.45 },
    { id: "Mid-size company", pay: [0.95, 1.2], req: 2, layoff: 0.03, fold: 0.12, hire: 0.6 },
    { id: "Large company", pay: [1.05, 1.4], req: 5, layoff: 0.025, fold: 0.05, hire: 0.8 },
  ];
  const CULTURE = ["Fast and scrappy.", "Calm, steady hours.", "Big on teamwork.", "Pays well, works hard.", "Known for long lunches.",
    "Everyone knows everyone.", "Loves a good office party.", "Strict but fair.", "Lots of room to grow.", "Old-fashioned and proud of it."];
  const COLORS = ["#E07A5F", "#3D405B", "#81B29A", "#F2CC8F", "#5B7FB8", "#C96B86", "#8C74B8", "#D9874A", "#4C9F9F", "#A0785A"];

  const COS = [], CO = {};
  for (const [ind, D] of Object.entries(IND)) {
    const used = new Set();
    let nameIx = Math.floor(hash(CITY + ind) * D.names.length);
    const nextName = () => { for (let k = 0; k < D.names.length * 2; k++) { const nm = D.names[(nameIx++) % D.names.length]; if (!used.has(nm) || k >= D.names.length) { used.add(nm); return nm; } } return D.names[0]; };
    for (let slot = 0; slot < D.n; slot++) {
      let founded = -Math.round(300 + hash(CITY + ind + slot + "f") * 2800);
      for (let g = 0; founded < 6000 && g < 12; g++) {
        const id = `${ind}${slot}g${g}`, h = k => hash(CITY + id + k);
        const size = SIZES[Math.min(3, Math.floor(h("s") * 4))];
        const folds = h("fold") < size.fold;
        const closes = folds ? Math.max(founded + 120, Math.round(80 + h("c") * 3200)) : Infinity;
        const co = { id, ind, size: size.id, sz: size, founded, closes,
          payMult: Math.round((size.pay[0] + h("p") * (size.pay[1] - size.pay[0])) * 100) / 100,
          reqAdj: size.req + Math.round((h("r") - 0.5) * 4), ladder: D.ladders[Math.floor(h("l") * D.ladders.length)],
          culture: CULTURE[Math.floor(h("cu") * CULTURE.length)], color: COLORS[Math.floor(h("co") * COLORS.length)] };
        // nama lewat registry brand: slot "co:<id>" bisa diganti brand mitra tanpa ngubah angka
        B.bind(co, B.reg("co:" + id, nextName(), "co", ind));
        COS.push(co); CO[id] = co;
        if (!folds) break;
        founded = closes + Math.round(20 + h("n") * 80);
      }
    }
  }
  const alive = (co, day) => co.founded <= day && day < co.closes;
  const companiesAt = (day, ind) => COS.filter(co => alive(co, day) && (!ind || co.ind === ind));
  function layoffDay(co, day) {
    const p = Math.floor(day / 30), h = hash(co.id + "lo" + p);
    return h < co.sz.layoff ? p * 30 + Math.floor(hash(co.id + "lod" + p) * 30) : null;
  }
  const coName = id => (CO[id] ? CO[id].name : "");

  // ---------------------------------------------------------------- lowongan
  function listing(co, level, posted, dur, extra) {
    const J = JOBS[co.ind];
    return { id: `${co.id}-${posted}-${level}`, co: co.id, ind: co.ind, level, title: co.ladder[level], posted, until: posted + dur,
      req: J.req + level * 10 + co.reqAdj, pay: ST.salary({ id: co.ind, level, co: co.id }),
      applicants: 3 + Math.floor(hash(co.id + posted + level) * (co.sz.id === "Large company" ? 240 : 70)), ...extra };
  }
  const _open = new Map();
  function openings(day) {
    if (_open.has(day)) return _open.get(day);
    const out = [], w0 = Math.floor(day / 7);
    for (const co of COS) for (let w = w0 - 2; w <= w0; w++) for (let k = 0; k < 2; k++) {
      const h = hash(co.id + "job" + w + "-" + k);
      if (h > co.sz.hire * 0.42) continue;
      const posted = w * 7 + Math.floor(hash(co.id + "pd" + w + k) * 7), dur = 6 + Math.floor(hash(co.id + "du" + w + k) * 7);
      if (posted > day || day >= posted + dur || !alive(co, posted) || !alive(co, day)) continue;
      const lh = hash(co.id + "lv" + w + k), level = lh < 0.62 ? 0 : lh < 0.88 ? 1 : 2;
      out.push(listing(co, level, posted, dur));
    }
    out.sort((a, b) => b.posted - a.posted);
    if (_open.size > 60) _open.clear();
    _open.set(day, out);
    return out;
  }

  // ---------------------------------------------------------------- kecocokan
  function canWork(c, day) {
    return phase_of(c.age(day)) === "dewasa" && !c.info.kuliah_aktif && !c.info.pensiun && !("keluar" in c.info);
  }
  function fit(c, L) {
    if (!c || !c.st) return null;
    const m = { kind: "interview", job: L.ind, w: JOBS[L.ind].w };
    const e = ST.estimateFor(c, m);
    const base = e.skill + e.talent + e.cond + e.tree, gap = L.req - base;
    // peluang lolos dengan dadu yang belum dilempar (1..6 sama rata)
    const chance = ST.DICE_BONUS.slice(1).filter(b => base + b >= L.req).length / 6;
    return { base, gap, chance, label: chance >= 0.67 ? "Good fit" : chance >= 0.17 ? "A stretch" : "Long shot" };
  }

  // ---------------------------------------------------------------- riwayat, PHK, tawaran recruiter (tiap hari)
  function pick(ind, day, key) {
    const list = companiesAt(day, ind);
    if (!list.length) return null;
    return list[Math.floor(hash(key + "pick" + ind + day) * list.length)].id;
  }
  function loseJob(x, why, line) {
    const c = x.c, st = c.st;
    st.lastWhy = why;
    st.job = null; st.next_review = null; st.next_comp = null; st.ready_since = x.day; st.retry_after = x.day + 4;
    delete c.info.kerja; delete c.info.level;
    x.say(line); x.need("mood", -10);
    x.drama = "sedang";
    if (why === "Laid off" || why === "Company closed") x.scar("phk");
    x.remember(line);
  }
  function track(c, day) {
    const st = c.st, H = st.history || (st.history = []);
    const last = H.length ? H[H.length - 1] : null, open = last && last.to == null ? last : null, j = st.job;
    if (open && (!j || j.co !== open.co || j.level !== open.level || j.id !== open.ind)) {
      open.to = day;
      open.why = j && j.co === open.co && j.level > open.level ? "Promoted" : st.lastWhy || (c.info.pensiun ? "Retired" : j ? "Moved on" : "Left");
      st.lastWhy = null;
    }
    if (j && (!open || open.to != null)) {
      const prevSame = open && open.co === j.co && j.level > open.level;
      H.push({ co: j.co, ind: j.id, level: j.level, title: ST.title(j), from: day, to: null, how: prevSame ? "promoted" : "hired" });
    }
  }
  const _status = HOOKS.status;
  HOOKS.status = (x, dramas, events) => {
    _status(x, dramas, events);
    const c = x.c, st = c.st, day = x.day;
    if (!st) return;
    if (st.job && !st.job.co && st.job.id !== "founder") st.job.co = pick(st.job.id, day, x.home.id + c.id);
    if (st.job && st.job.co && CO[st.job.co]) {
      const co = CO[st.job.co];
      if (day >= co.closes) {
        loseJob(x, "Company closed", `${co.name} shut down for good. ${c.name} lost their job as ${ST.title(st.job)}.`);
        dramas.push("sedang"); events.push("perusahaan_tutup");
      } else if (layoffDay(co, day) === day && hash(x.home.id + c.id + co.id + day) < 0.35) {
        loseJob(x, "Laid off", `${co.name} cut jobs today, and ${c.name} was one of them.`);
        dramas.push("sedang"); events.push("phk");
      }
    }
    if (st.job) c.info.kerja = ST.title(st.job);
    // recruiter kadang menghubungi duluan, lebih sering kalau keahliannya menonjol
    if (canWork(c, day)) {
      st.offers = (st.offers || []).filter(o => o.until > day);
      const r = seed_rng(x.home.id, c.id, day, "rekrut");
      if (r.random() < 1 / 30 && st.offers.length < 3) {
        const cand = Object.keys(IND).map(ind => {
          const lvl = st.job && st.job.id === ind ? Math.min(3, st.job.level + 1) : 0;
          const co = companiesAt(day, ind).filter(k => !st.job || k.id !== st.job.co);
          if (!co.length) return null;
          const L = listing(co[Math.floor(r.random() * co.length)], lvl, day, 7, { offer: true, recruiter: r.choice(E.NAMES) + " " + r.choice(["Ash", "Bloom", "Fern", "Lark", "Reed", "Wren"]) });
          L.id = "of-" + c.id + "-" + day; L.fitGap = fit(c, L).gap;
          return L;
        }).filter(Boolean).sort((a, b) => a.fitGap - b.fitGap);
        const L = cand[0];
        if (L && L.fitGap <= 8) {
          st.offers.push(L);
          x.say(`${L.recruiter}, a recruiter at ${coName(L.co)}, messaged ${c.name} about a ${L.title} role.`);
        }
      }
    }
    track(c, day);
  };

  // tindakan pemain "apply:<id lowongan>"
  const _act = HOOKS.act;
  HOOKS.act = (home, cid, kind, day) => {
    if (!kind.startsWith("apply:")) return _act(home, cid, kind, day);
    const c = home.get(cid), id = kind.slice(6);
    if (!c || !c.st || !c.alive(day) || !canWork(c, day)) return false;
    const L = openings(day).find(o => o.id === id) || (c.st.offers || []).find(o => o.id === id && o.until > day);
    if (!L || !alive(CO[L.co], day)) return false;
    if (c.st.job && c.st.job.co === L.co && c.st.job.level >= L.level) return false;
    if (ST.pendingFor(home, cid).some(m => m.kind === "interview")) return false;
    if ((c.st.applied || []).includes(L.id)) return false;
    const m = ST.schedule(home, { cid, kind: "interview", day: day + 2, req: L.req, w: JOBS[L.ind].w, job: L.ind, by: "you",
      co: L.co, level: L.level, title: L.title, label: `Interview: ${L.title} at ${coName(L.co)}` });
    if (!m) return false;
    (c.st.applied ||= []).push(L.id);
    if (c.st.applied.length > 40) c.st.applied.splice(0, 10);
    if (L.offer) c.st.offers = c.st.offers.filter(o => o.id !== L.id);
    return true;
  };

  ST.EXT.title = (job, level) => { const co = CO[job.co]; return co ? co.ladder[Math.min(3, level)] : JOBS[job.id].ladder[level]; };
  ST.EXT.pay = job => (CO[job.co] ? CO[job.co].payMult : 1);
  ST.EXT.pick = (ind, day, key) => (ind === "founder" ? null : pick(ind, day, key));
  ST.EXT.coName = coName;

  // ---------------------------------------------------------------- jaringan dan feed
  // Karier NPC: rangkaian pekerjaan yang dibangkitkan dari nama mereka, dipotong kalau perusahaannya tutup
  const _npc = new Map();
  function npcCareer(key) {
    if (_npc.has(key)) return _npc.get(key);
    const T = [], inds = Object.keys(IND), wts = inds.map(i => JOBS[i].pop);
    const r = seed_rng("karier", key);
    let day = -900 + Math.floor(r.random() * 500), ind = r.choices(inds, wts)[0], level = r.choices([0, 1, 2], [60, 30, 10])[0];
    while (day < 5000 && T.length < 40) {
      const list = companiesAt(day, ind);
      if (!list.length) { ind = r.choices(inds, wts)[0]; day += 10; continue; }
      const co = r.choice(list), len = 120 + Math.floor(r.random() * 380);
      let end = day + len, why;
      if (co.closes <= end) { end = co.closes; why = "closed"; }
      else { const q = r.random(); why = q < 0.36 ? "promoted" : q < 0.66 ? "moved" : q < 0.76 ? "switched" : q < 0.88 ? "laidoff" : "left"; }
      T.push({ co: co.id, ind, level, title: co.ladder[level], from: day, to: end, why });
      if (why === "promoted" && level < 3) {
        // promosi di perusahaan yang sama: jabatan baru dimulai hari itu juga
        let lv = level + 1, at = end;
        while (true) {
          const len2 = 150 + Math.floor(r.random() * 400), end2 = Math.min(co.closes, at + len2);
          const q = r.random(), w2 = end2 === co.closes ? "closed" : q < 0.3 && lv < 3 ? "promoted" : q < 0.7 ? "moved" : q < 0.85 ? "laidoff" : "left";
          T.push({ co: co.id, ind, level: lv, title: co.ladder[lv], from: at, to: end2, why: w2, how: "promoted" });
          at = end2; level = lv;
          if (w2 !== "promoted") { why = w2; end = end2; break; }
          lv += 1;
        }
      }
      if (why === "switched") { ind = r.choices(inds, wts)[0]; level = 0; day = end + 10 + Math.floor(r.random() * 40); }
      else if (why === "laidoff" || why === "closed" || why === "left") { day = end + 20 + Math.floor(r.random() * 70); if (r.random() < 0.15) { ind = r.choices(inds, wts)[0]; level = 0; } }
      else { level = Math.min(3, level + (r.random() < 0.4 ? 1 : 0)); day = end; }
    }
    _npc.set(key, T);
    if (_npc.size > 400) _npc.delete(_npc.keys().next().value);
    return T;
  }
  const REL = { teman: "Friend", sahabat: "Best friend", pacar: "Partner", pasangan: "Partner", mantan: "Ex", rival: "Rival", saingan: "Rival" };
  function network(c, home) {
    const out = [];
    for (const [nid, r] of Object.entries(c.relations || {})) if (r && r.nama) out.push({ key: nid, name: r.nama, rel: REL[r.tipe] || "Knows you" });
    for (const m of home.members) if (m !== c && m.st) out.push({ key: m.id, name: m.name, rel: "Family", member: m });
    const pop = ST.population();
    for (let i = 0; i < 28; i++) { const k = Math.floor(hash(home.id + c.id + "net" + i) * pop.length); out.push({ key: "pop" + k, name: pop[k].name, rel: "Old Town" }); }
    return out;
  }
  const head = (st, day) => {
    const s = st.find(t => t.from <= day && day < t.to);
    return s ? `${s.title} at ${coName(s.co)}` : "Open to work";
  };
  function postsOf(p, from, to) {
    const out = [];
    if (p.member) {
      for (const h of p.member.st.history || []) {
        if (h.from > from && h.from <= to) out.push({ day: h.from, kind: h.how === "promoted" ? "promo" : "job", text: h.how === "promoted" ? `got promoted to ${h.title} at ${coName(h.co)}.` : `started a new position as ${h.title} at ${coName(h.co)}.`, co: h.co });
        if (h.to != null && h.to > from && h.to <= to && (h.why === "Laid off" || h.why === "Company closed")) out.push({ day: h.to, kind: "otw", text: h.why === "Laid off" ? `was laid off from ${coName(h.co)} and is open to work.` : `lost their job when ${coName(h.co)} closed. Open to work.`, co: h.co });
      }
      return out;
    }
    const T = npcCareer(p.key);
    for (let i = 0; i < T.length; i++) {
      const t = T[i];
      if (t.from > from && t.from <= to) out.push({ day: t.from, kind: t.how === "promoted" ? "promo" : "job",
        text: t.how === "promoted" ? `got promoted to ${t.title} at ${coName(t.co)}.` : i && T[i - 1].ind !== t.ind ? `changed careers! Now ${t.title} at ${coName(t.co)}.` : `started a new position as ${t.title} at ${coName(t.co)}.`, co: t.co });
      if (t.to > from && t.to <= to && (t.why === "laidoff" || t.why === "closed")) out.push({ day: t.to, kind: "otw",
        text: t.why === "laidoff" ? `was laid off from ${coName(t.co)}. Open to work, any leads appreciated!` : `${coName(t.co)} closed its doors. Looking for a new role.`, co: t.co });
      for (let y = 1; y < 6; y++) { const d = t.from + y * 365; if (d < t.to && d > from && d <= to) out.push({ day: d, kind: "anniv", text: `is celebrating ${y} year${y > 1 ? "s" : ""} at ${coName(t.co)}.`, co: t.co }); }
    }
    return out;
  }
  function feed(c, home, day, span = 40) {
    const from = day - span, out = [];
    for (const p of network(c, home)) for (const e of postsOf(p, from, day)) {
      const T = p.member ? null : npcCareer(p.key);
      out.push({ ...e, who: p.name, rel: p.rel, head: p.member ? (p.member.st.job ? `${ST.title(p.member.st.job)} at ${coName(p.member.st.job.co)}` : "Your family") : head(T, e.day),
        likes: 2 + Math.floor(hash(p.key + e.day + e.kind) * (e.kind === "promo" ? 90 : 40)), id: `${p.key}-${e.day}-${e.kind}` });
    }
    // kabar perusahaan: tutup dan PHK
    for (const co of COS) {
      if (co.closes > from && co.closes <= day) out.push({ day: co.closes, kind: "news", who: co.name, rel: "Company", head: `${co.size} · ${JOBS[co.ind].label}`, text: `After ${Math.max(1, Math.round((co.closes - co.founded) / 365))} years, we are closing our doors. Thank you, Old Town.`, co: co.id, likes: 10 + Math.floor(hash(co.id) * 200), id: co.id + "-close" });
      for (let d = Math.floor(from / 30) * 30; d <= day; d += 30) {
        const ld = layoffDay(co, d);
        if (ld != null && ld > from && ld <= day && alive(co, ld)) out.push({ day: ld, kind: "news", who: co.name, rel: "Company", head: `${co.size} · ${JOBS[co.ind].label}`, text: `We made the hard decision to reduce our team today.`, co: co.id, likes: 3 + Math.floor(hash(co.id + ld) * 40), id: co.id + "-lo-" + ld });
      }
    }
    for (const co of COS) if (co.founded > from && co.founded <= day) out.push({ day: co.founded, kind: "news", who: co.name, rel: "Company", head: `${co.size} · ${JOBS[co.ind].label}`, text: `We just opened in Old Town and we're hiring!`, co: co.id, likes: 20 + Math.floor(hash(co.id + "o") * 150), id: co.id + "-open" });
    // kabar sendiri
    for (const h of c.st ? c.st.history || [] : []) {
      if (h.from > from && h.from <= day) out.push({ day: h.from, kind: h.how === "promoted" ? "promo" : "job", self: true, who: c.name, rel: "You", head: "",
        text: h.how === "promoted" ? `got promoted to ${h.title} at ${coName(h.co)}.` : `started a new position as ${h.title} at ${coName(h.co)}.`, co: h.co, likes: 5 + Object.keys(c.relations || {}).length * 3 + Math.floor(hash(c.id + h.from) * 30), id: `self-${h.from}` });
    }
    out.sort((a, b) => b.day - a.day || (a.self ? -1 : 1));
    return out.slice(0, 60);
  }

  function profile(c, home, day) {
    const st = c.st, ph = phase_of(c.age(day));
    const j = st && st.job;
    const headline = j ? `${j.role || ST.title(j)} at ${j.co ? coName(j.co) : j.biz && ST.EXT.bizName ? ST.EXT.bizName(home, j.biz) : `${c.name}'s own company`}` : canWork(c, day) ? "Open to work"
      : c.info.kuliah_aktif ? "University student" : c.info.pensiun ? "Retired" : ph === "anak" || ph === "remaja" ? "Student" : ph === "bayi" ? "Too little for work" : "Enjoying life";
    return { headline, open: !j && canWork(c, day), history: (st && st.history || []).slice().reverse(),
      connections: network(c, home).length + 40 + Math.floor(hash(c.id + "conn") * 260), offers: st ? (st.offers || []).filter(o => o.until > day) : [] };
  }

  const API = { COS, CO, IND, coName, alive, companiesAt, openings, fit, feed, profile, canWork, npcCareer, layoffDay };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Career = API;
})();

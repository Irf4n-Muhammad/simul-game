// Majalah kota ("OLD TOWN"): terbit tiap tanggal 1 (waktu nyata), satu majalah yang sama untuk semua pemain.
// Isinya dihitung ulang dari hari + seed + keadaan keluarga, jadi tidak ada yang disimpan. Cover jatuh ke anggota
// keluarga kalau bulan itu ada kejadian besar; kalau tidak, ke tokoh kota. Edisi Oktober memuat "The Old Town 10".
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const ST = (typeof module !== "undefined") ? require("./status.js") : globalThis.Status;
  const CR = (typeof module !== "undefined") ? require("./career.js") : globalThis.Career;
  const MK = (typeof module !== "undefined") ? require("./market.js") : globalThis.Market;
  const { seed_rng, YEAR } = E;
  const DAY = 86400000;
  const S0 = new Date(E.START_DATE);

  // ---------------------------------------------------------------- kalender terbit
  // edisi 0 terbit hari pertama; edisi k terbit tanggal 1 bulan ke-k setelahnya
  const issueDay = k => k <= 0 ? 0 : Math.round((Date.UTC(S0.getUTCFullYear(), S0.getUTCMonth() + k, 1) - E.START_DATE) / DAY);
  function latest(day) { let k = 0; while (issueDay(k + 1) <= day) k++; return k; }
  const monthOf = k => new Date(Date.UTC(S0.getUTCFullYear(), S0.getUTCMonth() + k, 1));
  const monthName = k => monthOf(k).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const yearly = k => monthOf(k).getUTCMonth() === 9; // Oktober: ulang tahun majalah
  const fmtC = n => Math.round(n).toLocaleString("en");

  const BGS = ["#E9D8C4", "#C9D6CF", "#E7C9C3", "#D3D0E4", "#E8DDB5", "#C8D3DE", "#DCC7B0", "#D9E2C8"];
  const TOPICS = ["on building something that lasts", "on long lunches and longer days", "on why Old Town never sleeps",
    "on failing twice before it worked", "on family, work and the space between", "on the one decision that changed everything",
    "on staying curious after the top", "on what money can't buy (and what it can)"];

  // ---------------------------------------------------------------- tokoh kota (NPC)
  const pop = () => ST.population();
  function npcNow(i, day) {
    const p = pop()[i], key = "mag:" + p.name + ":" + i;
    const T = CR.npcCareer(key), cur = T.find(t => t.from <= day && day < t.to);
    return { i, key, name: p.name, p, job: cur, title: cur ? `${cur.title} at ${CR.coName(cur.co)}` : p.job ? ST.JOBS[p.job].ladder[p.level] : "Old Town local", T };
  }
  // tokoh cover: jabatan tinggi, dan bukan nama yang sudah tampil di sampul enam bulan terakhir
  function townStar(k, day, deep = true) {
    const r = seed_rng("majalah", "cover", k);
    const seen = deep ? new Set(Array.from({ length: 6 }, (_, j) => k - 1 - j).filter(j => j >= 0).map(j => townStar(j, issueDay(j), false).name)) : new Set();
    for (let t = 0; t < 80; t++) {
      const i = Math.floor(r.random() * pop().length), n = npcNow(i, day);
      if (n.job && n.job.level >= 2 && !seen.has(n.name)) return n;
    }
    return npcNow(Math.floor(r.random() * pop().length), day);
  }

  // ---------------------------------------------------------------- kejadian keluarga dalam satu bulan
  const ACH_W = [["rich10", 12], ["top_", 10], ["best_athlete", 9], ["prize_", 9], ["job_", 8], ["house_mansion", 9], ["house_villa", 9],
    ["house_", 6], ["founded", 7], ["antique", 6], ["tree_", 5], ["car_", 5], ["lux_", 5], ["self_made", 4], ["limited", 4], ["flip", 3], ["rare_", 3]];
  const achW = id => (ACH_W.find(([p]) => id.startsWith(p)) || [0, 1])[1];
  function famEvents(home, a, b) {
    const out = [];
    for (const c of home.members) {
      if (c.born >= a && c.born < b && c.parents.length) {
        const ps = c.parents.map(id => home.get(id)).filter(Boolean);
        out.push({ day: c.born, kind: "birth", w: 3, c, text: `${ps.length ? ps.map(p => p.name).join(" and ") + " welcomed" : "Welcome to"} ${c.name}.` });
      }
      if (c.info.menikah != null && c.info.menikah >= a && c.info.menikah < b) {
        const p = c.relations[c.info.pasangan_id], pn = p ? p.nama : "their sweetheart";
        out.push({ day: c.info.menikah, kind: "wedding", w: 5, c, partner: pn, text: `${c.name} married ${pn}.` });
      }
      if (c.death_day >= a && c.death_day < b && c.death_day < 1e8) {
        const yrs = Math.floor((c.death_day - c.born) / YEAR);
        out.push({ day: c.death_day, kind: "passing", w: 4, c, text: `${c.name}, ${yrs} year${yrs === 1 ? "" : "s"} old.${c.st && c.st.best ? ` Remembered as ${c.st.best.label || ""}`.trimEnd() + "." : ""}`.replace(/ \.$/, ".") });
      }
      if (!c.st) continue;
      for (const x of c.st.ach) if (x.day >= a && x.day < b) out.push({ day: x.day, kind: "ach", id: x.id, w: achW(x.id), c, text: x.label });
    }
    return out.sort((x, y) => y.w - x.w || x.day - y.day);
  }
  const jobLine = c => c.st && c.st.job ? `${ST.title(c.st.job)}${c.st.job.co ? " at " + CR.coName(c.st.job.co) : ""}` : null;

  // judul cover untuk anggota keluarga, sesuai jenis kejadiannya
  function famCover(ev, home, day) {
    const c = ev.c, n = c.name, id = ev.id || ev.kind, jl = jobLine(c);
    const base = { who: { name: n, cid: c.id, rupa: c.rupa, ind: c.st && c.st.job ? c.st.job.id : null }, fam: true };
    if (id === "rich10") return { ...base, kicker: "THE NEW MONEY", dek: `${n} just joined the ten richest creatures in Old Town. How did it happen?`, face: "joy" };
    if (id.startsWith("top_")) return { ...base, kicker: "AT THE TOP", dek: `${n} is now ${jl || "at the top"}. The climb, in their own words.`, face: "joy" };
    if (id.startsWith("prize_") || id === "best_athlete") return { ...base, kicker: "CHAMPION", dek: `${ev.text.replace(/\.$/, "")}. Inside the win everyone is talking about.`, face: "joy" };
    if (id.startsWith("job_")) return { ...base, kicker: "RARE AIR", dek: `${ev.text.split(".")[0]}. Very few make it this far.`, face: "calm" };
    if (id.startsWith("house_")) { const it = ST.ITEMS.find(i => "house_" + i.id === id); return { ...base, kicker: "NEW ADDRESS", dek: `The family moves into a ${it ? it.label.toLowerCase() : "new home"} in ${it ? it.hood : "a new neighbourhood"}. We got a look inside.`, face: "joy" }; }
    if (id === "founded") return { ...base, kicker: "THE FOUNDER", dek: `${n} started a company. Brave, or a little mad?`, face: "calm" };
    if (id === "antique") return { ...base, kicker: "THE COLLECTOR", dek: `${ev.text.replace(/^Owns/, `${n} owns`)} Collectors are paying attention.`, face: "calm" };
    if (id.startsWith("tree_")) return { ...base, kicker: "A CALLING", dek: `${ev.text} The family line shows it.`, face: "calm" };
    if (id.startsWith("car_") || id.startsWith("lux_")) return { ...base, kicker: "SPOTTED", dek: `${n} ${ev.text.charAt(0).toLowerCase() + ev.text.slice(1)} Old Town noticed.`, face: "joy" };
    if (id === "wedding") return { ...base, kicker: "JUST MARRIED", dek: `${n} and ${ev.partner} said yes. The party, the guests, the cake.`, face: "joy" };
    return { ...base, kicker: "PROFILE", dek: ev.text, face: "calm" };
  }

  // tulisan utama: beberapa paragraf yang dirakit dari fakta
  function famStory(ev, cover, home, day) {
    const c = ev.c, n = c.name, r = seed_rng("majalah", "story", c.id, ev.day);
    const ps = c.parents.map(id => home.get(id)).filter(Boolean), age = Math.floor((day - c.born) / 30);
    const paras = [];
    const ageS = age >= 24 ? `${Math.floor(age / 12)} years` : `${age} months`;
    const fact = ev.text.startsWith(n) ? ev.text : `${n}, at ${ageS} old, ${ev.text.charAt(0).toLowerCase() + ev.text.slice(1)}`;
    paras.push(`${fact} ${r.choice(["Nobody in the family saw it coming this soon.", "The news went around Old Town by lunch.", "The neighbours heard the celebration.", "It took a long time, and then it happened all at once."])}`);
    if (ps.length) paras.push(`${n} grew up in ${ST.familyView(home, day).house.hood} as the ${c.gen > 2 ? `${c.gen}${["", "st", "nd", "rd"][c.gen] || "th"}-generation` : "child"} of ${ps.map(p => p.name).join(" and ")}. ${r.choice(["Friends say nothing came easy.", "Neighbours remember a quiet, stubborn kid.", "Family members call it luck. Nobody else does.", "The family had hoped for this for a long time."])}`);
    else paras.push(`${n} is the first of the family line in Old Town. ${r.choice(["Everything since started there.", "There was no one to copy.", "That makes this one count twice."])}`);
    const jl = jobLine(c);
    if (jl) paras.push(`Today ${n} works as ${jl}. ${r.choice(["Colleagues describe the hours as long and the coffee as bad.", "Ask about the job and you get a shrug and a smile.", "The plan, apparently, is to keep going."])}`);
    paras.push(`"${r.choice(["Honestly? I didn't think anyone would notice.", "My family made this possible. Put that in.", "I just kept showing up.", "Ask me again next year."])}"`);
    return { title: cover.dek, paras };
  }
  function townStory(n, k, day, topic) {
    const r = seed_rng("majalah", "tstory", k);
    const T = n.T.filter(t => t.from <= day), first = T[0], cos = new Set(T.map(t => t.co)).size;
    const paras = [
      `${n.name} works as ${n.title}. ${first ? `It started ${Math.max(1, Math.round((day - first.from) / 365))} years ago as ${first.title} at ${CR.coName(first.co)}.` : ""}`.trim(),
      `${cos > 1 ? `Since then: ${cos} companies, ${((p) => p === 0 ? "no promotions" : p === 1 ? "one promotion" : p + " promotions")(T.filter(t => t.how === "promoted").length)}${T.some(t => t.why === "laidoff") ? ", and one layoff nobody likes to mention" : ""}.` : "One company, the whole way. That is rare in Old Town."}`,
      `"${r.choice(["You don't get here by being the smartest. You get here by staying.", "Every Monday I still feel like the new kid.", "Old Town rewards patience. Not much else.", "I tell young ones: pick a ladder you actually like climbing."])}"`,
    ];
    return { title: `${n.name} ${topic}`, paras };
  }

  // ---------------------------------------------------------------- rubrik kota
  function townSociety(k, a, b) {
    const r = seed_rng("majalah", "soc", k), P = pop(), out = [];
    const nm = () => P[Math.floor(r.random() * P.length)].name;
    out.push({ kind: "wedding", text: `${nm()} married ${nm()} ${r.choice(["at the old chapel", "in the park, in the rain", "with three hundred guests", "with nobody watching but family"])}.` });
    out.push({ kind: "birth", text: `${nm()} welcomed ${r.choice(["a baby", "twins", "a litter of three"])}.` });
    if (r.random() < 0.6) out.push({ kind: "passing", text: `${nm()}, ${r.randint(3, 4)} years old. ${r.choice(["A fixture of the morning market.", "Taught half of Old Town to swim.", "Never missed a town fair."])}` });
    return out;
  }
  function townCareers(k, a, b) {
    const r = seed_rng("majalah", "car", k), out = [];
    for (let t = 0; t < 400 && out.length < 3; t++) {
      const n = npcNow(Math.floor(r.random() * pop().length), b);
      const pr = n.T.find(x => x.how === "promoted" && x.from >= a && x.from < b);
      if (pr) out.push({ text: `${n.name} was promoted to ${pr.title} at ${CR.coName(pr.co)}.` });
    }
    return out;
  }
  function companyNews(a, b) {
    const out = [];
    for (const co of CR.COS) {
      if (co.founded >= a && co.founded < b) out.push({ kind: "open", day: co.founded, text: `${co.name} opened its doors. ${co.size}, ${ST.JOBS[co.ind].label.toLowerCase()}.` });
      if (co.closes >= a && co.closes < b) out.push({ kind: "close", day: co.closes, text: `${co.name} closed after ${Math.max(1, Math.round((co.closes - co.founded) / 365))} years.` });
    }
    return out.sort((x, y) => x.day - y.day).slice(0, 4);
  }
  function townProperty(a, b) {
    const H = ST.ITEMS.filter(i => i.cat === "House").reverse(), out = [];
    for (const h of H) {
      const thr = h.price * 1.5;
      const movers = pop().filter(p => Math.round(p.w0 + p.rate * (a + 200)) < thr && Math.round(p.w0 + p.rate * (b + 200)) >= thr);
      for (const p of movers.slice(0, 2)) out.push({ text: `${p.name} bought a ${h.label.toLowerCase()} in ${h.hood}.`, hood: h.hood });
      if (out.length >= 3) break;
    }
    return out.slice(0, 3);
  }
  function market(k, a, b) {
    const ks = [], out = { drops: [], next: [], collector: null };
    for (let i = Math.floor(a / 12) - 1; i <= Math.floor(b / 12) + 3; i++) ks.push(i);
    for (const i of ks) {
      const D = MK.findDrop("d" + i);
      if (D.start >= a && D.start < b) {
        let out0 = null;
        for (let d = D.start; d < D.start + 30; d++) if (MK.dropLeft(D, d) <= 0) { out0 = d - D.start; break; }
        out.drops.push({ ...D, soldIn: out0 });
      } else if (D.start >= b && D.start < b + 30) out.next.push(D);
    }
    // pojok kolektor: dari beberapa barang lama, tampilkan yang nilainya paling menarik
    const r = seed_rng("majalah", "kol", k), cands = [];
    for (let t = 0; t < 4; t++) {
      const L = MK.LINE[r.choice(["goldwatch", "steelwatch", "print", "luxbag", "sports", "supercar", "boots", "couture", "jacket", "sedan"])];
      const yrs = r.choice([4, 5, 6, 7]), rel = b - yrs * YEAR, made = Math.max(5, Math.round(L.made * (0.1 + r.random() * 0.4)));
      const v = MK.valuation({ id: L.id, price: L.price, made, rel, cond: 80 + r.randint(0, 15) }, b);
      cands.push({ line: L.id, label: L.label, year: MK.yearOf(rel), made, price: L.price, value: v.value, kind: v.kind, x: v.value / L.price });
    }
    out.collector = cands.sort((p, q) => q.x - p.x)[0];
    return out;
  }

  // ---------------------------------------------------------------- satu edisi
  const _cache = new Map();
  function issue(home, k) {
    const day = issueDay(k), a = issueDay(k - 1), b = day;
    const sig = k + ":" + home.members.map(m => m.id + (m.st ? m.st.ach.length : 0)).join(",");
    if (_cache.has(sig)) return _cache.get(sig);
    const fam = k > 0 ? famEvents(home, a, b) : [];
    const top = fam.find(e => e.w >= 5 && e.kind !== "passing");
    let cover, story;
    if (top) { cover = famCover(top, home, day); story = famStory(top, cover, home, day); }
    else {
      const n = townStar(k, day), r = seed_rng("majalah", "ck", k), topic = r.choice(TOPICS);
      cover = { who: { name: n.name, npc: n.key, ind: n.job ? n.job.ind : null }, fam: false, kicker: r.choice(["POWER ISSUE", "THE PROFILE", "WHO RUNS OLD TOWN", "IN CONVERSATION"]), dek: `${n.title}, ${topic}.`, face: r.random() < 0.5 ? "joy" : "calm" };
      story = townStory(n, k, day, topic);
    }
    cover.bg = BGS[k % BGS.length];
    const mk = market(k, a, b), list = yearly(k) ? ST.boards(home, day).richest : null;
    // jenis cover: foto makhluk, berdua (pernikahan), barang, atau tipografi saja
    cover.kind = top ? (top.kind === "wedding" ? "couple" : "portrait") : "portrait";
    if (top && top.kind === "wedding") cover.partner = top.partner;
    if (!top) {
      const r = seed_rng("majalah", "jenis-cover", String(k * 7919)); r.random(); r.random(); const q = r.random();
      const rare = mk.drops.slice().sort((x, y) => x.made - y.made)[0];
      if (list) Object.assign(cover, { kind: "type", big: "10", kicker: "ONCE A YEAR", title: "The Old Town 10", dek: "The ten richest creatures in town. Who's in, who's out, and how much." });
      else if (q < 0.2 && rare) Object.assign(cover, { kind: "object", item: { id: rare.line, label: rare.label }, kicker: "THE DROP", title: rare.label,
        dek: `Only ${rare.made} were made.${rare.soldIn != null ? ` ${rare.soldIn <= 1 ? "Gone in a day" : `Gone in ${rare.soldIn} days`}.` : " A few are still out there."}` });
      else if (q < 0.3) Object.assign(cover, { kind: "object", item: { id: mk.collector.line, label: mk.collector.label, seed: mk.collector.year }, kicker: "THE COLLECTOR'S ISSUE", title: `The ${mk.collector.year} ${mk.collector.label.toLowerCase()}`,
        dek: mk.collector.x >= 1.05 ? `Bought for ${fmtC(mk.collector.price)}. Worth ${fmtC(mk.collector.value)} today.` : `Is it treasure, or just old? We asked the dealers.` });
      else if (q < 0.48) {
        const T = [["MONEY", "Who got rich this month, and what they spent it on."], ["WORK", "Promotions, new companies, and the ones that closed."], ["HOME", "Who moved where, and what a house costs now."], ["STYLE", "The drops, the collectors, and what to wear next."]][k % 4]; // bergiliran supaya tema tidak berulang berdekatan
        Object.assign(cover, { kind: "type", big: T[0], kicker: "THIS MONTH", title: `The ${T[0].charAt(0) + T[0].slice(1).toLowerCase()} Issue`, dek: T[1] });
      }
    }
    const famSoc = fam.filter(e => ["birth", "wedding", "passing"].includes(e.kind));
    const famCar = fam.filter(e => e.kind === "ach" && /^(top_|promo_|job_|first_job|founded|prize_|best_athlete)/.test(e.id));
    const famProp = fam.filter(e => e.kind === "ach" && e.id.startsWith("house_"));
    const lines = [];
    if (list) lines.push("THE OLD TOWN 10: who's richest this year");
    if (mk.drops.length) lines.push(`${mk.drops.length} limited drop${mk.drops.length > 1 ? "s" : ""}, and how fast they sold`);
    if (famSoc.length || famCar.length) lines.push(`Your family, in the news`);
    lines.push(`What a ${mk.collector.year} ${mk.collector.label.toLowerCase()} is worth now`);
    const I = {
      k, no: k + 1, day, month: monthName(k), yearly: yearly(k), cover, story, lines: lines.slice(0, 3),
      society: famSoc.map(e => ({ kind: e.kind, text: e.text, fam: true, cid: e.c.id })).concat(townSociety(k, a, b)),
      careers: famCar.map(e => ({ text: `${e.c.name}: ${e.text}`, fam: true, cid: e.c.id })).concat(k > 0 ? townCareers(k, a, b) : []),
      companies: companyNews(k > 0 ? a : -30, b),
      property: famProp.map(e => ({ text: `${e.c.name}: ${e.text}`, fam: true, cid: e.c.id })).concat(townProperty(k > 0 ? a : -30, b)),
      market: mk, list,
      family: fam.length,
    };
    _cache.set(sig, I);
    if (_cache.size > 40) _cache.delete(_cache.keys().next().value);
    return I;
  }

  const API = { issueDay, latest, issue, monthName, yearly };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Mag = API;
})();

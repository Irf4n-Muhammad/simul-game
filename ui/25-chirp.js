// Chirp: Old Town's public timeline. The town talks about what really happened (drops selling out, companies
// opening and closing, the magazine, the Old Town 10, the family's big days), and the player posts as whoever
// owns the phone. Every post already has a handle, a permalink and a share card, so the same posts can go to a
// public website later; for now they stay inside the game. Claude writes the replies to the player's posts.
const CH_KEY = SAVE_KEY + "-chirp", CH_HOST = "chirp.oldtown.app";
const chFresh = () => ({ mine: [], likes: {}, rps: {}, seen: 0, cm: {} });
let CH = (() => { try { const c = JSON.parse(localStorage.getItem(CH_KEY)); return c && c.mine ? c : null; } catch (e) { return null; } })() || chFresh();
const chSave = () => { try { localStorage.setItem(CH_KEY, JSON.stringify(CH, (k, v) => k === "a" ? undefined : v)); } catch (e) { /* plays on without saving */ } };
// a well-mixed 0..1 from any keys (the raw string hash barely changes when only the last character does)
const chH = (...k) => { let h = hashStr(k.join("|")); h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const chSlug = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const chFmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e4 ? Math.round(n / 1e3) + "K" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K" : String(n);
const chNow = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
// ---- accounts: "fam:<id>" the family, "npc:<i>" a townsfolk, "pal:<Name>" a friend or partner, "org:<slug>" a company or outlet
const CH_ORG = { daily: { name: "Old Town Daily", bio: "News from every street in Old Town.", col: "#1E1B16" }, mag: { name: "Old Town Magazine", bio: "The monthly. Covers, careers, and who's on top.", col: "#C8102E" },
  bazaar: { name: "Bazaar", bio: "Limited drops. When they're gone, they're gone.", col: "#111111" }, ten: { name: "The Old Town 10", bio: "Who's on top in Old Town, every week.", col: "#B8860B" } };
// akun media di Chirp lewat registry brand (slot "org:<id>"), biar inventaris namanya lengkap di satu tempat
for (const [k, o] of Object.entries(CH_ORG)) Brands.bind(o, Brands.reg("org:" + k, o.name, "media", "chirp"));
function chAcct(key) {
  const [kind, ...rest] = key.split(":"), id = rest.join(":");
  if (kind === "fam") {
    const h = game.home.get(id), m = member(id), pr = h && h.st ? Status.prestige(h, game.home, today()) : 0;
    return { key, kind, name: h ? h.name : "Someone", handle: chSlug(h ? h.name : "x") + (h && h.gen > 1 ? h.gen : ""), rupa: h && h.rupa, fam: true,
      bio: h && h.st ? Career.profile(h, game.home, today()).headline : PHASE_EN[m && m.fase] || "", joined: h ? h.born : 0,
      followers: Math.round(12 + pr * 9 + chH(key) * 40 + Object.keys(h ? h.relations : {}).length * 6), following: 40 + Math.floor(chH(key, "f") * 160), pr };
  }
  if (kind === "npc") {
    const p = Status.population()[+id], pr = p.job ? Status.JOBS[p.job].pts + p.level * 8 : 4;
    return { key, kind, name: p.name, handle: chSlug(p.name), rupa: rupaFor({ nama: p.name }), bio: p.job ? Status.JOBS[p.job].ladder[p.level] : "Old Town local",
      joined: -Math.floor(chH(key, "j") * 900), followers: Math.round(8 + pr * 6 + Math.pow(chH(key), 4) * 4000), following: 30 + Math.floor(chH(key, "f") * 400), pr };
  }
  if (kind === "par") { const h = game.home.get(id); return { key, kind, name: "You", handle: chSlug(h ? h.name : "x") + "_guardian", rupa: rupaFor({ nama: "Guardian" }), bio: `${h ? h.name + "'s" : "The"} guardian`, joined: 0, followers: 12, following: game.home.members.length }; }
  if (kind === "pal") return { key, kind, name: id, handle: chSlug(id) + "_", rupa: rupaFor({ nama: id }), bio: "Old Town local", joined: -Math.floor(chH(key) * 600), followers: 30 + Math.floor(chH(key) * 300), following: 80 + Math.floor(chH(key, "f") * 200), pr: 10 };
  if (kind === "co") { const co = Career.CO[id]; return { key, kind, name: co.name, handle: chSlug(co.name), org: true, col: co.color || "#555", bio: `${co.size} · ${Career.IND[co.ind] ? Career.IND[co.ind].label || co.ind : co.ind}`, joined: co.founded, followers: 200 + Math.floor(chH(key) * 9000), following: 12, pr: 40 }; }
  const O = CH_ORG[id] || CH_ORG.daily;
  return { key, kind: "org", name: O.name, handle: chSlug(O.name), org: true, col: O.col, bio: O.bio, joined: -1200, followers: { daily: 48200, mag: 31700, bazaar: 64100, ten: 22900 }[id] || 9000, following: 3, pr: 60 };
}
const chPeople = () => Status.population();
const chNpc = (...k) => "npc:" + Math.floor(chH(...k) * chPeople().length);
// ---- what the town says, built from what happened
const CH_TALK = {
  any: ["coffee first, opinions later ☕", "who else is up way too early", "Old Town sunsets are unreal tonight 🌇", "thinking about getting a hobby. any ideas?", "my neighbour is learning the trumpet. send help 🎺",
    "a stranger complimented my ears today and honestly it carried me", "is it just me or is everyone moving to the hill", "took the long way home on purpose 🍂", "weekend plans: absolutely nothing. can't wait",
    "the bakery on the square sold out of buns by 9. again.", "reminder to drink water and call your parents", "what's the best street in Old Town? wrong answers only"],
  work: { office: ["meeting that could've been an email: part 4", "spreadsheet finally balanced. I'm a genius (for today)"], teacher: ["the kids made me a card today 🥹", "grading until midnight, send snacks"],
    nurse: ["12 hour shift done. bed.", "be nice to nurses. that's the post."], doctor: ["wash your hands, Old Town 🙏", "long night at the clinic. everyone's okay."], software: ["it works and I don't know why", "shipped it on a Friday. pray for me"],
    designer: ["kerning is a lifestyle", "client said 'make it pop'. it popped."], fastfood: ["the lunch rush was INSANE today", "free fries for whoever guesses my favourite sauce"], athlete: ["5am training. no excuses 💪", "legs: destroyed"],
    influencer: ["new post up, go look 💅", "brand deal or friendship? why not both"], founder: ["we're hiring!! dm me", "day 400 of building. still love it"], quant: ["markets were wild today 📈", "numbers don't lie (they just mislead)"] },
  drop: ["I need the {d} so bad 😩 #Drop", "set 3 alarms for the {d} drop", "{d} or rent? asking for a friend #Drop"],
  sold: ["missed the {d} AGAIN 😭 #SoldOut", "{d} gone in {n} days. who ARE these people #SoldOut", "saw someone wearing the {d} downtown. jealous #SoldOut"],
  mag: ["the new Old Town Magazine cover 😮 #NewIssue", "read the whole {m} issue in one sitting #NewIssue"],
  close: ["can't believe {c} is closing 💔", "so many people lost their jobs at {c} today. sending love"], open: ["{c} just opened and they're hiring! #Jobs"],
  ten: ["the Old Town 10 is out. some surprises this week #OldTown10", "one day I'll be on the #OldTown10. one day."],
};
const chPick = (arr, ...k) => arr[Math.floor(chH(...k) * arr.length)];
const chFill = (s, o) => s.replace(/\{(\w)\}/g, (_, k) => o[k] ?? "");
function chDropShot(D) {
  const L = Market.LINE[D.line], bg = ["#F2E6D0", "#E9D8C4", "#D3D0E4", "#C9D6CF"][hashStr(D.key) % 4];
  const spec = { obj: true, id: D.line, cat: L.cat, color: shotTint(D.line, D.label), accent: 0xC4502E, seed: D.label, bg, dark: false };
  spec.key = ["chobj", D.key, bg].join("|"); MG.specs.set(spec.key, spec); return spec.key;
}
function chFamShot(cid, d, k, tone) {
  const h = game.home.get(cid); if (!h) return null;
  const fase = Engine.phase_of(Math.max(0, d - h.born)), pal = MG_PAL[hashStr(k) % MG_PAL.length];
  const spec = { key: `chf|${k}`, id: "chf-" + cid, fase: fase === "bayi" ? "anak" : fase, rupa: h.rupa, gear: [], layout: "classic", bg: pal[0], floor: pal[1], pose: ({ joy: "wave", down: "soft", loss: "soft" })[tone] || "glance", props: [], turn: 0, crop: "pol", mono: tone === "loss" };
  MG.specs.set(spec.key, spec); return spec.key;
}
const _chDay = new Map();
const CH_OWN = {
  joy: ["Still can't believe this happened 🥹", "Best. Day. Ever. ✨", "Pinch me 😭❤️", "Okay I'm allowed to be proud today 🎉", "Smiling like an idiot rn 😁", "Saving this day forever 📸", "Worth every bit of the wait 🙌", "Grateful. That's it. That's the post. 💛"],
  down: ["Rough one. Tomorrow's a new day.", "Not my best week tbh", "Taking it slow today 🫶", "Could've gone better ngl", "Hug your people today."],
  loss: ["Missing you already. 🕊️", "Some days are just heavy."], news: ["Big news, Old Town 👀", "New chapter starts now 📖", "Well, that happened 😅", "Life update, kind of a big one", "Didn't see this coming tbh", "Plot twist 🌀", "You heard it here first 👀"],
};
const CH_SELF = {
  remaja: ["school should be illegal", "who's going to the night market tonight 👀", "my playlist is a personality", "can't sleep. again.", "lowkey proud of my new haircut", "parents just don't get it 🙄"],
  dewasa: ["Coffee first, then everything else ☕", "Old Town sunsets hit different 🌇", "Monday again?? already??", "Finally fixed the leaky tap. I'm basically an engineer now 🔧", "Grocery prices are wild lately", "Cozy night in. Zero regrets.", "Who else walks the long way home just because?"],
  tua: ["The bakery on the corner still makes the best bread. Some things never change. 🍞", "Watered the plants and watched the clouds. A good day.", "When I was young, we walked everywhere. Just saying.", "Grandkids visiting this weekend 🥰"],
};
function chDay(d) {
  const sig = d + ":" + (d === today() ? "t" : "") + game.home.members.length + ":" + (game.home.world.events || []).length + ":" + ((Brands.stats().food || {}).partner || 0);
  if (_chDay.has(sig)) return _chDay.get(sig);
  const out = [], P = (by, m, t, x = {}) => out.push({ id: `${d}-${out.length}-${hashStr(by + t) % 9973}`, by, d, m: Math.max(0, Math.min(1439, Math.round(m))), t, ...x });
  // barang partner (tingkat 2): satu post media tiap 30 hari per slot, ditandai Partner. Kulit aja: nama dari registry, nggak nyentuh simulasi
  if (d > 0 && (d - 7) % 30 === 0) for (const e of Brands.list("food")) if (e.partner && e.meta) P("org:daily", 585 + (hashStr(e.key) % 90), `New at the corner shop: ${e.meta.name}. ${e.meta.about || ""}`.trim(), { partner: e.key });
  // townsfolk chatter
  const n = 4 + Math.floor(chH("n", d) * 4);
  for (let i = 0; i < n; i++) {
    const who = chNpc("talk", d, i), p = chPeople()[+who.slice(4)], work = p.job && CH_TALK.work[p.job];
    P(who, 420 + chH("m", d, i) * 960, work && chH("w", d, i) < 0.4 ? chPick(work, d, i) : CH_TALK.any[(Math.floor(chH("b", d) * CH_TALK.any.length) + i * 5) % CH_TALK.any.length]);
  }
  // drops: the launch, the buzz, and the sell-out
  for (const D of Market.drops(d)) {
    if (D.start === d) {
      P("org:bazaar", 600, `${D.label} drops today. Only ${D.made} made, ${coins(D.price)} each. #Drop`, { img: chDropShot(D) });
      for (let i = 0; i < 2; i++) P(chNpc("dr", D.key, i), 640 + i * 90, chFill(chPick(CH_TALK.drop, D.key, i), { d: D.label }));
    }
    if (!D.soon && D.left === 0 && Market.dropLeft(D, d - 1) > 0) {
      const sold = d - D.start;
      P("org:bazaar", 560, `SOLD OUT. All ${D.made} ${D.label} found a home in ${sold <= 1 ? "a single day" : sold + " days"}. #SoldOut`);
      for (let i = 0; i < 3; i++) P(chNpc("so", D.key, i), 700 + i * 140, chFill(chPick(CH_TALK.sold, D.key, i, "s"), { d: D.label, n: Math.max(1, sold) }));
    }
  }
  // companies
  for (const co of Career.COS) {
    if (co.founded === d) { P("co:" + co.id, 540, `We just opened in Old Town and we're hiring! 🎉 #Jobs`); P(chNpc("op", co.id), 760, chFill(CH_TALK.open[0], { c: co.name })); }
    if (co.closes === d) { P("co:" + co.id, 980, `After ${Math.max(1, Math.round((co.closes - co.founded) / 365))} years, we are closing our doors. Thank you, Old Town.`); P("org:daily", 1010, `${co.name} closes for good. Staff were told this morning.`); P(chNpc("cl", co.id), 1100, chFill(chPick(CH_TALK.close, co.id), { c: co.name })); }
    else if (co.founded <= d && d < co.closes && Career.layoffDay(co, Math.floor(d / 30) * 30) === d) P("org:daily", 900, `${co.name} cuts jobs. Some of the team were let go today.`);
  }
  // kejadian dunia: korannya ngumumin, warga ikut ngobrol selama berlangsung, dan ada penutupnya
  for (const w of game.home.world.events || []) {
    const ic = w.ikon ? w.ikon + " " : "", talk = w.obrolan || [];
    if (w.dicatat === d) P("org:daily", (w.sore ? 780 : 480) + chH("wa", w.id) * 240, `${ic}${w.teks} #OldTown`, { world: w.id });
    if (w.mulai <= d && d <= w.selesai && talk.length) {
      const n = d === w.mulai ? 2 : chH("wn", w.id, d) < 0.5 ? 1 : 0;
      for (let i = 0; i < n; i++) P(chNpc("wt", w.id, d, i), 560 + chH("wm", w.id, d, i) * 800, chPick(talk, w.id, d, i));
    }
    if (w.selesai === d && w.selesai > w.mulai) P("org:daily", 1020, `${ic}${w.nama} wraps up today. Thank you, Old Town.`, { world: w.id });
  }
  // the magazine
  const k = Mag.latest(d);
  if (k > 0 && Mag.issueDay(k) === d) {
    const I = Mag.issue(game.home, k), C = I.cover;
    P("org:mag", 480, `The ${I.month} issue is out. ${C.title ? `“${C.title}”. ` : `On the cover: ${C.who.name}. `}${C.dek} #NewIssue`, { issue: k });
    P(chNpc("mg", k), 620, chFill(chPick(CH_TALK.mag, k), { m: I.month }));
  }
  // the Old Town 10, every Monday
  if (phDayDate(d).getUTCDay() === 1 && d <= today()) {
    const B = Status.boards(game.home, d).prestige, top = B.top.slice(0, 5), mine = B.top.concat(B.yours).filter(e => e.you);
    P("org:ten", 540, `This week's most admired in Old Town:\n${top.map(e => `${e.rank}. ${e.name}${e.you ? " ⭐" : ""}`).join("\n")}\n#OldTown10`);
    for (const e of mine.filter(e => e.rank <= 100)) P("org:ten", 545, `${e.name} is No. ${e.rank} of ${B.total.toLocaleString("en")} in Old Town this week. ${e.rank <= 10 ? "Welcome to the top 10. 👑" : "One to watch."} #OldTown10`, { about: "fam:" + e.you });
    P(chNpc("tn", d), 760, chPick(CH_TALK.ten, d));
  }
  // the family's big days, as the town heard them
  waSync();
  for (const m of (WA.groups.group || { msgs: [] }).msgs.filter(m => m.sys && m.d === d && m.c)) {
    const h = game.home.get(m.c); if (!h) continue;
    P("org:daily", 600 + chH(m.k) * 500, `${m.x || m.t.replace(/^\S+\s/, "")}`, { about: "fam:" + m.c, img: chFamShot(m.c, d, m.k, m.tone), tone: m.tone });
  }
  // the family posting for themselves. Nobody writes these for them: the big days in their own words, and now and then just life.
  const phoneAge = h => h.alive(d) && !("keluar" in h.info) && d - h.born >= Market.MIN_AGE;
  for (const m of (WA.groups.group || { msgs: [] }).msgs.filter(m => m.sys && m.d === d && m.c)) {
    const h = game.home.get(m.c); if (!h || !phoneAge(h) || chH("own", m.k) < 0.25) continue;
    P("fam:" + m.c, 660 + chH(m.k, "o") * 500, chPick(CH_OWN[m.tone] || CH_OWN.news, m.k, "t"), { img: chFamShot(m.c, d, m.k, m.tone), tone: m.tone });
  }
  for (const h of game.home.members) {
    if (!phoneAge(h) || d > today()) continue;
    const social = (h.traits.ramah ?? 50) / 100, ph = Engine.phase_of(d - h.born);
    if (chH("self", h.id, d) > 0.06 + social * 0.22) continue;
    P("fam:" + h.id, 480 + chH("selfm", h.id, d) * 900, chPick(CH_SELF[ph] || CH_SELF.dewasa, h.id, d, "s"));
  }
  out.forEach(p => { p.a = chAcct(p.by); });
  _chDay.set(sig, out); if (_chDay.size > 120) _chDay.delete(_chDay.keys().next().value);
  return out;
}
// numbers: the town's reach for the account, and for the player's posts, how long the post has been out
function chStats(p) {
  const a = p.a || chAcct(p.by), base = a.followers * (0.03 + chH(p.id, "l") * 0.12) * (p.img ? 1.6 : 1) * (p.about ? 2.2 : 1);
  let f = 1;
  if (p.ts) f = 1 - Math.exp(-(Date.now() - p.ts) / 3.6e6 / 5);
  else if (p.d === today()) f = Math.min(1, Math.max(0.05, (chNow() - p.m) / 600));
  const likes = Math.round(base * f) + (CH.likes[p.id] ? 1 : 0), rps = Math.round(likes * (0.08 + chH(p.id, "r") * 0.2)) + (CH.rps[p.id] ? 1 : 0);
  const replies = p.re ? p.re.filter(r => r.ts <= Date.now()).length : Math.round(likes * (0.03 + chH(p.id, "c") * 0.06));
  return { likes, rps, replies, views: Math.round((likes + 3) * (28 + chH(p.id, "v") * 40)) };
}
function chTimeline(from, to) {
  const out = [];
  for (let d = from; d <= to; d++) out.push(...chDay(d));
  const now = chNow(), day = today();
  for (const p of CH.mine) if (p.d >= from && p.d <= to) out.push(Object.assign(p, { a: chAcct(p.by) }));
  return out.filter(p => p.ts || p.d < day || p.m <= now).sort((a, b) => (b.d * 1440 + b.m) - (a.d * 1440 + a.m) || (b.ts || 0) - (a.ts || 0));
}
function chAgo(p) {
  const day = today();
  let mins = p.ts ? (Date.now() - p.ts) / 60000 : p.d === day ? chNow() - p.m : (day - p.d) * 1440;
  if (mins < 1) return "now"; if (mins < 60) return Math.floor(mins) + "m"; if (mins < 1440) return Math.floor(mins / 60) + "h";
  const dd = Math.floor(mins / 1440);
  return dd < 7 ? dd + "d" : phDayDate(p.d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
const chRich = t => esc(t).replace(/(#\w+)/g, `<i class="ch-tag" data-chtag="$1">$1</i>`).replace(/(@\w+)/g, `<i class="ch-tag">$1</i>`).replace(/\n/g, "<br>");
function chAva(a, size = 42) {
  if (a.org) return `<span class="ch-ava org" style="width:${size}px;height:${size}px;background:${a.col}"><b style="font-size:${size * 0.36}px">${esc(a.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2))}</b></span>`;
  const bg = WA_BG[hashStr(a.name) % WA_BG.length], h = a.kind === "fam" ? game.home.get(a.key.slice(4)) : null;
  const fase = h ? (({ meninggal: "dewasa", merantau: "dewasa", bayi: "anak" })[member(h.id)?.fase] || member(h.id)?.fase || "dewasa") : "dewasa";
  const spec = { key: `cha|${a.key}|${fase}`, id: "cha-" + a.key, fase, rupa: a.rupa || rupaFor({ nama: a.name }), gear: [], layout: "classic", bg, floor: bg, pose: "joy", props: [], turn: 0, crop: "ava" };
  MG.specs.set(spec.key, spec);
  const u = MG.photos.get(spec.key);
  return `<span class="ch-ava" style="width:${size}px;height:${size}px;background:${bg}"><b style="font-size:${size * 0.4}px">${esc(a.name[0])}</b><img data-mgc="${esc(spec.key)}" alt="" ${u ? `src="${u}"` : ""}></span>`;
}
const CH_SEAL = `<svg class="ch-seal" viewBox="0 0 24 24" width="16" height="16" aria-label="Verified"><path d="M12 1.8l2.3 1.9 3-.3 1 2.8 2.7 1.4-.6 2.9 1.6 2.5-2.1 2.1.2 3-2.9.8-1.3 2.7-2.9-.7L12 22.2l-2.3-1.9-2.9.7-1.3-2.7-2.9-.8.2-3L.7 12.4l1.6-2.5-.6-2.9 2.7-1.4 1-2.8 3 .3z" fill="#F5B82E"/><path d="M7.6 12.3l3 3 5.8-6" fill="none" stroke="#1E1B16" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CH_IC = {
  reply: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 5.5h16v10H9.5L5 19.5v-4H4z"/></svg>`,
  rp: `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10V8a2 2 0 0 1 2-2h11l-3-3M19 14v2a2 2 0 0 1-2 2H6l3 3"/></svg>`,
  like: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></svg>`,
  views: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M5 19v-6M10 19V9M15 19v-9M20 19V5"/></svg>`,
  share: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 13v6h14v-6"/></svg>`,
};
function chImg(key) {
  if (!key) return "";
  const u = MG.photos.get(key), sp = MG.specs.get(key);
  return `<span class="ch-img${sp && sp.mono ? " mono" : ""}"><img data-mgc="${esc(key)}" alt="" ${u ? `src="${u}"` : ""}></span>`;
}
function chPost(p, big) {
  const a = p.a, s = chStats(p), liked = CH.likes[p.id];
  const ptag = p.partner ? `<small class="ch-ptag">Partner</small>` : "";
  if (p.partner) Tele.brand(p.partner + ":chirp", "tampil", 2);
  const head = `<span class="ch-name"><b data-chu="${esc(a.key)}">${esc(a.name)}</b>${a.org ? CH_SEAL : ""}<small>@${esc(a.handle)}${big ? "" : ` · ${chAgo(p)}`}</small></span>`;
  const acts = `<div class="ch-acts"><span>${CH_IC.reply}${s.replies ? chFmt(s.replies) : ""}</span><span>${CH_IC.rp}${s.rps ? chFmt(s.rps) : ""}</span>
    <button data-chlike="${esc(p.id)}" class="${liked ? "on like" : ""}">${CH_IC.like}${s.likes ? chFmt(s.likes) : ""}</button><span>${CH_IC.views}${chFmt(s.views)}</span><button data-chshare="${esc(p.id)}">${CH_IC.share}</button></div>`;
  if (big) {
    const when = p.ts ? new Date(p.ts) : null, hm = when ? `${when.getHours()}:${String(when.getMinutes()).padStart(2, "0")}` : `${Math.floor(p.m / 60)}:${String(p.m % 60).padStart(2, "0")}`;
    return `<article class="ch-big"><header>${chAva(a, 46)}${head}</header><p>${chRich(p.t)}</p>${ptag}${chImg(p.img)}
      <small class="ch-when">${hm} · ${fmtDate(p.d)} · <b>${chFmt(s.views)}</b> views</small>
      <div class="ch-counts"><span><b>${chFmt(s.rps)}</b> Rechirps</span><span><b>${chFmt(s.likes)}</b> Likes</span></div>${acts}</article>`;
  }
  return `<article class="ch-p" data-chp="${esc(p.id)}">${p.rpBy ? `<small class="ch-rpby">${CH_IC.rp} You rechirped</small>` : ""}<div class="ch-p-row"><span data-chu="${esc(a.key)}">${chAva(a)}</span><div class="ch-p-body">${head}<p>${chRich(p.t)}</p>${ptag}${chImg(p.img)}${acts}</div></div></article>`;
}
// ---- the screens
const chTop = (title, back) => `<header class="ch-top">${back ? `<button class="ch-back" data-chback="${back}" aria-label="Back"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>` : ""}${title}</header>`;
function chNav(on) {
  const unread = chNotes(PH.c).filter(n => n.ts > (CH.seen || 0)).length;
  const it = (id, ic, lbl) => `<button data-chgo="${id}" class="${on === id ? "on" : ""}" aria-label="${lbl}">${ic}${id === "chirpn" && unread ? `<i>${unread}</i>` : ""}</button>`;
  return `<nav class="ch-nav">${it("chirp", `<svg viewBox="0 0 24 24" width="25" height="25" fill="${on === "chirp" ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3.5 11L12 4l8.5 7v9h-6v-6h-5v6h-6z"/></svg>`, "Home")}
    ${it("chirps", `<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="${on === "chirps" ? 2.8 : 2}"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l5 5" stroke-linecap="round"/></svg>`, "Search")}
    ${it("chirpn", `<svg viewBox="0 0 24 24" width="25" height="25" fill="${on === "chirpn" ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5h4" stroke-linecap="round"/></svg>`, "Notifications")}
    ${it("chirpu", chAva(chAcct("fam:" + PH.c.id), 28), "Profile")}</nav>`;
}
function phChirp(c) {
  const S = PH.ch || (PH.ch = { tab: "town" }), day = today();
  let list = chTimeline(day - 10, day);
  if (S.tab === "fam") list = list.filter(p => p.a.kind === "fam" || p.about);
  return `<div class="ch"><header class="ch-home"><div class="ch-bar">${chAva(chAcct("fam:" + c.id), 32)}<b class="ch-logo">Chirp</b><span></span></div>
    <div class="ch-tabs"><button data-chtab="town" class="${S.tab === "town" ? "on" : ""}">Old Town</button><button data-chtab="fam" class="${S.tab === "fam" ? "on" : ""}">Your family</button></div></header>
    <div class="ch-feed">${list.slice(0, 60).map(p => chPost(p)).join("") || `<p class="ch-empty">Nothing here yet.</p>`}</div>
    ${false ? `<button class="ch-fab" data-chnew aria-label="New post"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>` : ""}${chNav("chirp")}</div>`;
}
function chFind(id) {
  const p = CH.mine.find(x => x.id === id); if (p) return Object.assign(p, { a: chAcct(p.by) });
  const d = +String(id).split("-")[0]; return isFinite(d) ? chDay(d).find(x => x.id === id) : null;
}
function phChirpPost(c, id) {
  const p = chFind(id); if (!p) return phChirp(c);
  const replies = (p.re ? p.re.filter(r => r.ts <= Date.now()) : chFakeReplies(p)).concat((CH.cm[p.id] || []).filter(r => r.ts <= Date.now()));
  const ours = p.by.startsWith("fam:") && game.home.get(p.by.slice(4));
  return `<div class="ch">${chTop("<b>Post</b>", PH.ch && PH.ch.back || "chirp")}<div class="ch-feed">${chPost(p, true)}
    ${replies.map(r => { const a = chAcct(r.by); return `<article class="ch-p ch-re"><div class="ch-p-row"><span data-chu="${esc(a.key)}">${chAva(a, 36)}</span><div class="ch-p-body"><span class="ch-name"><b data-chu="${esc(a.key)}">${esc(a.name)}</b><small>@${esc(a.handle)}</small></span><small class="ch-to">Replying to @${esc(p.a.handle)}</small><p>${chRich(r.t)}</p></div></div></article>`; }).join("")}
    ${p.re && p.re.length > replies.length ? `<p class="ch-empty">More replies are on the way…</p>` : ""}</div>
    ${ours ? `<form class="ch-reply" data-chreply="${esc(p.id)}"><input placeholder="Comment as ${esc(ours.name)}'s guardian" maxlength="200" autocomplete="off"><button>Comment</button></form>` : ""}</div>`;
}
// replies under town posts: a few short ones from the town, picked from the post's own words
function chFakeReplies(p) {
  const s = chStats(p), n = Math.min(3, s.replies), out = [];
  const pool = /#SoldOut/.test(p.t) ? ["literally refreshing every hour", "next time 🙏", "resale prices are going to be crazy"] : /closing|cuts jobs/.test(p.t) ? ["so sad 💔", "hope everyone lands somewhere good", "end of an era"]
    : p.about ? ["congrats!! 🎉", "love this for them", "Old Town is proud 🥹", "well deserved"] : /#NewIssue/.test(p.t) ? ["grabbing a copy today", "that cover 🔥"] : ["real", "lol same", "this 👆", "needed this today"];
  for (let i = 0; i < n; i++) out.push({ by: chNpc("re", p.id, i), t: chPick(pool, p.id, i) });
  return out;
}
function phChirpUser(c, key) {
  key = key || "fam:" + c.id;
  const a = chAcct(key), day = today(), posts = chTimeline(day - 45, day).filter(p => p.by === key || p.about === key).slice(0, 30);
  const col = a.org ? a.col : artShade("#" + (FUR[(a.rupa || {}).warna] || 0xE5BFBF).toString(16).padStart(6, "0"), 0.9);
  return `<div class="ch">${chTop(`<span class="ch-tt"><b>${esc(a.name)}</b><small>${posts.filter(p => p.by === key).length} posts</small></span>`, PH.ch && PH.ch.back || "chirp")}<div class="ch-feed">
    <div class="ch-prof"><div class="ch-banner" style="background:linear-gradient(135deg, ${col}, ${artShade(col, 1.35)})"></div>${chAva(a, 76)}
      <h2>${esc(a.name)}${a.org ? CH_SEAL : ""}</h2><small>@${esc(a.handle)}</small><p>${esc(a.bio)}</p>
      <small class="ch-meta">📍 Old Town · Joined ${a.joined <= 0 ? "before you arrived" : bwMonth(a.joined)}</small>
      <div class="ch-follow"><span><b>${chFmt(a.following)}</b> Following</span><span><b>${chFmt(a.followers)}</b> Followers</span></div></div>
    ${posts.map(p => chPost(p)).join("") || `<p class="ch-empty">No posts yet.</p>`}</div>${key === "fam:" + c.id ? chNav("chirpu") : ""}</div>`;
}
function chTrends() {
  const day = today(), n = {};
  for (const p of chTimeline(day - 3, day)) for (const t of p.t.match(/#\w+/g) || []) n[t] = (n[t] || 0) + chStats(p).likes + 40;
  return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 8);
}
function phChirpSearch(c) {
  const S = PH.ch || (PH.ch = { tab: "town" }), q = S.q || "";
  return `<div class="ch"><header class="ch-home"><div class="ch-sbar">${srchBox("Search Chirp", q, "ch-srch")}</div></header><div class="ch-feed" data-chres>${chSearchBody(q)}</div>${chNav("chirps")}</div>`;
}
function chSearchBody(q) {
  const day = today();
  if (!q) return `<h3 class="ch-h">Trending in Old Town</h3>` + chTrends().map(([t, v], i) => `<button class="ch-trend" data-chtag="${esc(t)}"><small>${i + 1} · Trending</small><b>${esc(t)}</b><small>${chFmt(Math.round(v / 3))} posts</small></button>`).join("");
  const posts = chTimeline(day - 30, day).filter(p => srchHit(q, p.t, p.a.name, "@" + p.a.handle));
  srchN = posts.length;
  return posts.length ? posts.slice(0, 40).map(p => chPost(p)).join("") : `<p class="ch-empty">No posts match “${esc(q)}”.</p>`;
}
function chNotes(c) {
  const out = [];
  for (const p of CH.mine.filter(p => p.by === "fam:" + c.id)) {
    for (const r of (p.re || []).filter(r => r.ts <= Date.now())) out.push({ ts: r.ts, by: r.by, kind: "reply", t: r.t, id: p.id });
    const s = chStats(Object.assign(p, { a: chAcct(p.by) }));
    if (s.likes >= 5) out.push({ ts: p.ts + 6e5, kind: "like", n: s.likes, t: p.t, id: p.id });
  }
  return out.sort((a, b) => b.ts - a.ts);
}
function phChirpNotes(c) {
  const N = chNotes(c);
  const html = N.map(n => n.kind === "reply" ? (a => `<button class="ch-note" data-chopen="${esc(n.id)}">${chAva(a, 36)}<span><b>${esc(a.name)}</b> replied<small>${esc(n.t)}</small></span></button>`)(chAcct(n.by))
    : `<button class="ch-note" data-chopen="${esc(n.id)}"><span class="ch-heart">${CH_IC.like}</span><span><b>${chFmt(n.n)} creatures</b> liked your post<small>${esc(n.t)}</small></span></button>`).join("");
  CH.seen = Date.now(); chSave();
  return `<div class="ch">${chTop("<b>Notifications</b>")}<div class="ch-feed">${html || `<p class="ch-empty">When the town replies to you, it shows up here.</p>`}</div>${chNav("chirpn")}</div>`;
}
// the share card: what a post looks like when it's shared outside the game (ready for when Chirp goes public)
function chShare(id) {
  const p = chFind(id); if (!p) return;
  const box = PH.el.querySelector(".ch"); if (!box) return;
  box.querySelector(".ch-sheet")?.remove();
  box.insertAdjacentHTML("beforeend", `<div class="ch-sheet"><div class="ch-card"><div class="ch-card-in"><header>${chAva(p.a, 40)}<span class="ch-name"><b>${esc(p.a.name)}</b>${p.a.org ? CH_SEAL : ""}<small>@${esc(p.a.handle)}</small></span></header><p>${chRich(p.t)}</p>${chImg(p.img)}
      <footer><b class="ch-logo sm">Chirp</b><small>${fmtDate(p.d)}</small></footer></div></div>
    <code>${CH_HOST}/@${esc(p.a.handle)}/${esc(p.id)}</code><small class="ch-soon">Public links open when Chirp goes live.</small><button class="ch-close" data-chclose>Done</button></div>`);
  box.querySelector("[data-chclose]").onclick = () => box.querySelector(".ch-sheet").remove();
  mgFill(box);
}
function chCompose() {
  const box = PH.el.querySelector(".ch"); if (!box) return;
  const c = PH.c, a = chAcct("fam:" + c.id);
  box.insertAdjacentHTML("beforeend", `<div class="ch-sheet ch-new"><header><button data-chclose>Cancel</button><button class="ch-post" data-chpost disabled>Post</button></header>
    <div class="ch-p-row">${chAva(a)}<textarea maxlength="280" placeholder="What's happening in Old Town?"></textarea></div><small class="ch-left">280</small></div>`);
  const S = box.querySelector(".ch-new"), ta = S.querySelector("textarea"), go = S.querySelector("[data-chpost]"), left = S.querySelector(".ch-left");
  ta.oninput = () => { go.disabled = !ta.value.trim(); left.textContent = 280 - ta.value.length; };
  S.querySelector("[data-chclose]").onclick = () => S.remove();
  go.onclick = () => { const t = ta.value.trim(); if (!t) return; S.remove(); chPublish(c, t); };
  setTimeout(() => ta.focus(), 50);
}
async function chPublish(c, t) {
  const day = today(), id = `${day}-me-${Date.now().toString(36)}`, p = { id, by: "fam:" + c.id, d: day, m: chNow(), ts: Date.now(), t, re: [] };
  CH.mine.push(p); chSave(); phGo("chirp");
  const a = chAcct(p.by), n = Math.min(4, 1 + Math.floor(a.followers / 120)), who = [];
  // who answers: friends and partner first, then the town
  for (const r of waRels(game.home.get(c.id), ["pasangan", "tunangan", "suami-istri", "teman"])) who.push("pal:" + r.nama);
  for (let i = 0; who.length < n + 1; i++) who.push(chNpc("rep", id, i));
  const pick = who.slice(0, n), at = i => p.ts + (40 + i * 70 + chH(id, i) * 90) * 1000;
  let texts = null;
  if (sampleFn) {
    try {
      const r = await sampleFn.json(`Old Town is a cozy life game about small creatures, with its own social network called Chirp. ${c.name} (@${a.handle}, ${a.bio}) just posted:\n"${t}"\n\n`
        + `Write one short reply (under 20 words, casual social-media style, emojis ok) from each of these accounts, in the language the post is written in:\n${pick.map(k => { const x = chAcct(k); return `- ${x.name}: ${x.kind === "pal" ? `${c.name}'s ${(WA_PTYPE[(Object.values(game.home.get(c.id).relations).find(r => r.nama === x.name) || {}).tipe] || "friend").toLowerCase()}` : x.bio}`; }).join("\n")}\n`
        + `Stay kind but real; no invented big life events; never mention being an AI. Reply only JSON {"replies":[{"who":string,"text":string}]}.`, { modelTier: "quick", cache: false });
      const byName = new Map(pick.map(k => [chAcct(k).name.toLowerCase(), k]));
      texts = ((r && r.replies) || []).filter(x => x && typeof x.text === "string" && byName.has(String(x.who).toLowerCase())).map(x => ({ by: byName.get(String(x.who).toLowerCase()), t: x.text.trim().slice(0, 200) }));
    } catch (e) { failHard(e); }
  }
  if (!texts || !texts.length) texts = pick.map((k, i) => ({ by: k, t: chPick(k.startsWith("pal:") ? ["haha love this 😄", "omg yes", "this is so you 😂", "❤️"] : ["real", "so true", "lol", "big if true 👀", "Old Town needed to hear this"], id, i) }));
  p.re = texts.map((x, i) => ({ ...x, ts: at(i) })); chSave();
  if (PH && PH.view === "chirpp" && PH.ch.id === id) phGo("chirpp", id);
}
// a parent's comment under their creature's post; the creature answers in its own voice (embarrassed, sweet or blunt, as it likes)
async function chComment(id, t) {
  const p = chFind(id), h = p && game.home.get(p.by.slice(4)); if (!h) return;
  const L = (CH.cm ||= {})[id] ||= [];
  L.push({ by: "par:" + h.id, t, ts: Date.now() }); chSave(); phGo("chirpp", id);
  const m = member(h.id);
  let back = null;
  if (sampleFn) { try { back = (await sampleFn(`You are ${h.name} on Chirp, the social network of Old Town, a cozy life game about small creatures. ${VOICE[m.fase] || VOICE.dewasa} You posted: "${p.t}". Your guardian (the player, like a parent) just commented in public: "${t}". `
    + `Write your one short public reply (under 20 words, casual, emojis ok, same language as the comment). React the way your personality would to a parent commenting on your post. Never say you are an AI.\n\nFacts about you:\n${facts(m)}`, { modelTier: "quick", cache: false })).text.trim().replace(/^"|"$/g, ""); } catch (e) { failHard(e); } }
  L.push({ by: "fam:" + h.id, t: back || chPick(m.fase === "remaja" ? ["omg stop 😭", "MOM.", "why are you here 💀"] : ["❤️", "Love you too 🥹", "Haha thank you!"], id, t), ts: Date.now() + 30000 }); chSave();
}
function chBind(v) {
  const S = PH.ch || (PH.ch = { tab: "town" });
  v.querySelectorAll("[data-chtab]").forEach(b => b.onclick = () => { S.tab = b.dataset.chtab; phGo("chirp"); });
  v.querySelectorAll("[data-chgo]").forEach(b => b.onclick = () => { S.back = null; phGo(b.dataset.chgo); });
  v.querySelectorAll("[data-chback]").forEach(b => b.onclick = () => phGo(b.dataset.chback, b.dataset.chback === "chirpu" ? S.user : undefined));
  v.querySelectorAll("[data-chp]").forEach(b => b.onclick = e => { if (e.target.closest("button,[data-chu],[data-chtag]")) return; S.back = PH.view; S.id = b.dataset.chp; phGo("chirpp", b.dataset.chp); });
  v.querySelectorAll("[data-chopen]").forEach(b => b.onclick = () => { S.back = "chirpn"; S.id = b.dataset.chopen; phGo("chirpp", b.dataset.chopen); });
  v.querySelectorAll("[data-chu]").forEach(b => b.onclick = e => { e.stopPropagation(); S.back = PH.view === "chirpu" ? "chirp" : PH.view; S.user = b.dataset.chu; phGo("chirpu", b.dataset.chu); });
  v.querySelectorAll("[data-chtag]").forEach(b => b.onclick = e => { e.stopPropagation(); S.q = b.dataset.chtag; phGo("chirps"); });
  v.querySelectorAll("[data-chlike]").forEach(b => b.onclick = e => { e.stopPropagation(); const id = b.dataset.chlike; CH.likes[id] ? delete CH.likes[id] : (CH.likes[id] = 1); chSave(); const p = chFind(id); b.classList.toggle("on", !!CH.likes[id]); b.classList.toggle("like", !!CH.likes[id]); b.lastChild.nodeValue = chFmt(chStats(p).likes); });
  v.querySelectorAll("[data-chrp]").forEach(b => b.onclick = e => { e.stopPropagation(); const id = b.dataset.chrp; CH.rps[id] ? delete CH.rps[id] : (CH.rps[id] = 1); chSave(); const p = chFind(id); b.classList.toggle("on", !!CH.rps[id]); b.classList.toggle("rp", !!CH.rps[id]); b.lastChild.nodeValue = chFmt(chStats(p).rps); });
  v.querySelectorAll("[data-chshare]").forEach(b => b.onclick = e => { e.stopPropagation(); chShare(b.dataset.chshare); });
  const nw = v.querySelector("[data-chnew]"); if (nw) nw.onclick = chCompose;
  const s = v.querySelector(".ch-srch input"), res = v.querySelector("[data-chres]");
  if (s && res) s.oninput = () => { S.q = s.value.trim(); res.innerHTML = chSearchBody(S.q); Tele.cari("chirp", S.q, srchN); chBind(res); mgFill(v); };
  const rf = v.querySelector("[data-chreply]");
  if (rf) rf.onsubmit = e => { e.preventDefault(); const i = rf.querySelector("input"), t = i.value.trim(); if (!t) return; i.value = ""; chComment(rf.dataset.chreply, t); };
}
function phHomes(c) {
  const day = today(), items = Status.shop(c, game.home, day).filter(i => i.cat === "House"), F = famStatus(), house = F.house, old = c.age(day) >= 180;
  const T = hmTown(day, F), mine = T.hood[house.id], lot = F.lot || {};
  const kindOf = id => Town.HOODS.find(h => h.id === id).kind;
  const near = T.npcs.filter(n => n.house === house.id).slice(0, 6);
  const dot = n => `<span class="hm-face" style="background:#${(FUR[rupaFor({ nama: n.name }).warna] || 0xE5BFBF).toString(16).padStart(6, "0")}">${esc(n.name[0])}</span>`;
  const recent = T.npcs.filter(n => n.bought && n.bought.day <= day && day - n.bought.day <= 60).sort((a, b) => b.bought.day - a.bought.day);
  const sold = [...new Map(recent.map(n => [n.bought.id, n])).values()].concat(recent).filter((n, i, a) => a.indexOf(n) === i).slice(0, 6).sort((a, b) => b.bought.day - a.bought.day);
  const ago = d => d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
  const card = i => {
    const t = T.hood[i.id], full = false;
    const btn = i.id !== "flat" && !i.owned && !i.building ? `<button class="hm-btn" data-lot="${i.id}" ${full ? "disabled" : ""}>${full ? "No lots left" : "Pick a lot"}</button>`
      : `<button class="hm-btn" data-buy="${i.id}" ${i.owned || i.building || !old || s_wallet(c) < i.price || !canCare() || F.build || full ? "disabled" : ""}>${i.building ? "Building" : i.owned ? "Owned" : full ? "No lots left" : "Buy"}</button>`;
    return `<article class="hm-card">${hmPhoto(kindOf(i.id), i.id, hashStr(i.id) % 3, hashStr(i.id + "p") % 5, "list-" + i.id)}
      <span class="hm-tag${t.owners < 3 ? " hot" : ""}">${t.owners ? `${t.owners.toLocaleString("en")} famil${t.owners === 1 ? "y" : "ies"} here` : "Nobody lives here yet"}</span>
      <div class="hm-body"><b class="hm-price">${coins(i.price)}</b><span class="hm-name">${esc(i.label)} · ${esc(i.hood)}</span>
        <span class="hm-meta">${i.days ? `Ready in ${i.days} day${i.days > 1 ? "s" : ""}` : "Move in now"} · prestige +${i.pts}</span>
        <span class="hm-row"><small>${i.share} of creatures own one</small>${btn}</span></div></article>`;
  };
  return `${phHead("Homes", "Old Town real estate")}${srchBox("Search homes, streets, who lives where", PH.q.homes, "pa-srch")}
    <div data-srch="homes">${PH.q.homes ? hmFound(c, PH.q.homes) : ""}</div><div class="hm-main"${PH.q.homes ? " hidden" : ""}>
    <article class="hm-card hm-mine">${hmPhoto(kindOf(house.id), house.id, lot.model || 0, lot.paint || 0, "mine-" + house.id + (lot.lot ?? ""))}
      <span class="hm-tag dark">Your home</span>
      <div class="hm-body"><b class="hm-price">${esc(house.label)}</b><span class="hm-name">${esc(house.hood)}${lot.since != null ? ` · since ${esc(fmtDate(lot.since))}` : ""}</span>
        <span class="hm-meta">${lot.paid ? `Paid ${coins(lot.paid)} · ` : house.id === "rented" ? "Rented · " : ""}prestige +${house.pts}</span>
        ${F.build ? `<span class="hm-build">Building a ${esc(F.build.item.label)} in ${esc(F.build.item.hood)} · ${F.build.left ? `${F.build.left} day${F.build.left > 1 ? "s" : ""} left` : "moving in today"}</span>` : ""}
        ${near.length ? `<span class="hm-nb"><span class="hm-faces">${near.map(dot).join("")}</span><small>Neighbours: ${near.slice(0, 3).map(n => esc(n.name)).join(", ")}${near.length > 3 ? ` and ${mine.owners > near.length ? "others" : near.length - 3 + " more"}` : ""}</small></span>` : ""}</div></article>
    <h4 class="pa-h">For sale</h4>${items.map(card).join("")}
    ${sold.length ? `<h4 class="pa-h">Recently sold</h4><div class="pa-list">${sold.map(n => { const it = Status.ITEMS.find(x => x.id === n.bought.id); return `<div class="pa-row hm-sold">${dot(n)}<span class="pa-grow"><b>${esc(n.name)}</b><small>Bought a ${esc(it.label)} in ${esc(it.hood)} · ${ago(day - n.bought.day)}${day < n.bought.done ? " · building" : ""}</small></span><em>${coins(it.price)}</em></div>`; }).join("")}</div>` : ""}
    <p class="pa-note">Homes belong to the whole family. Picking a lot takes you to town.</p></div>`;
}
// find a home type, a street, or where somebody in town lives
function hmFound(c, q) {
  const day = today(), F = famStatus(), npcs = Status.npcTown(day), item = id => Status.ITEMS.find(x => x.id === id) || Status.RENTED;
  const homes = Status.ITEMS.filter(i => i.cat === "House" && srchHit(q, i.label, i.hood, "for sale buy"));
  const fam = vm().anggota.filter(a => a.fase !== "meninggal" && srchHit(q, a.nama)).map(a => ({ name: a.nama, sub: "Your family", house: F.house.id, you: true }));
  const people = fam.concat(npcs.filter(n => srchHit(q, n.name, n.sub, item(n.house).hood, item(n.house).label))).slice(0, 25);
  srchN = homes.length + people.length;
  const dot = n => `<span class="hm-face" style="background:#${(FUR[rupaFor({ nama: n.name }).warna] || 0xE5BFBF).toString(16).padStart(6, "0")}">${esc(n.name[0])}</span>`;
  if (!homes.length && !people.length) return `<p class="pa-note">Nobody and nothing in Old Town matches “${esc(q)}”.</p>`;
  return `${homes.length ? `<h4 class="pa-h">Homes</h4><div class="pa-list">${homes.map(i => `<div class="pa-row"><span class="pa-grow"><b>${esc(i.label)}</b><small>${esc(i.hood)} · ${coins(i.price)}</small></span></div>`).join("")}</div>` : ""}
    ${people.length ? `<h4 class="pa-h">Who lives where</h4><div class="pa-list">${people.map(n => { const h = item(n.house); return `<div class="pa-row hm-sold">${dot(n)}<span class="pa-grow"><b>${esc(n.name)}</b><small>${esc(n.sub || "")} · ${esc(h.label)} in ${esc(h.hood)}${n.build ? ` · building a ${esc(item(n.build.id).label)}` : ""}</small></span></div>`; }).join("")}</div>` : ""}`;
}
const s_wallet = c => c.st ? c.st.wallet : 0;

// Nest: the family's chat app. A family group and a friends group fill up on their own when something big happens,
// and there are one-to-one chats with family, a partner, friends and recruiters. Claude writes the messages
// (once per event, then they're kept) and answers what the player types; without Claude the game uses written lines.
// Everything here is cosmetic: nothing said in Chat changes the simulation.
// People are creature ids, or "npc:Name" for someone who lives outside the house (partners, friends, recruiters).
const WA_KEY = SAVE_KEY + "-wa";
const waFresh = () => ({ groups: {}, t: {}, seen: {} });
let WA = (() => { try { const w = JSON.parse(localStorage.getItem(WA_KEY)); return w && w.groups ? w : null; } catch (e) { return null; } })() || waFresh();
const waSave = () => { try { localStorage.setItem(WA_KEY, JSON.stringify(WA)); } catch (e) { /* plays on without saving */ } };
let waBusy = false;
const waName = w => w === "you" ? "You" : String(w).startsWith("npc:") ? String(w).slice(4) : nameOf(w);
const waPlain = s => String(s || "").replace(/[_*]/g, "").replace(/\s+/g, " ").trim();
const waHour = seed => { const h = hashStr(seed), hr = 7 + h % 16, mi = (h >>> 5) % 60; return `${hr}:${String(mi).padStart(2, "0")}`; };
const waG = id => WA.groups[id] || (WA.groups[id] = { keys: {}, msgs: [] });
// who can text: alive, not a baby
const waCan = (h, day = today()) => !!h && h.alive(day) && Engine.phase_of(day - h.born) !== "bayi";
const waFam = (day = today()) => game.home.members.filter(h => waCan(h, day));
const waRels = (h, types) => Object.entries(h.relations).filter(([k, r]) => types.includes(r.tipe) && !game.home.get(k)).map(([, r]) => r);
const WA_PTYPE = { pasangan: "Partner", tunangan: "Fiancé", "suami-istri": "Spouse", gebetan: "Crush", calon: "Date", teman: "Friend" };
function waRel(a, b) { // what b is to a
  if (a.parents.includes(b.id)) return "Parent";
  if (b.parents.includes(a.id)) return "Child";
  if (a.parents.some(p => p && b.parents.includes(p))) return "Sibling";
  if (a.parents.some(id => (game.home.get(id) || { parents: [] }).parents.includes(b.id))) return "Grandparent";
  if (b.parents.some(id => (game.home.get(id) || { parents: [] }).parents.includes(a.id))) return "Grandchild";
  return "Family";
}
// the members of a group on a given day
function waPeople(gid, day = today()) {
  if (gid === "group") {
    const fam = waFam(day), out = fam.map(h => h.id);
    for (const h of fam) for (const r of waRels(h, ["pasangan", "tunangan", "suami-istri"])) out.push("npc:" + r.nama);
    return [...new Set(out)];
  }
  const h = game.home.get(gid.slice(3));
  return h ? [h.id, ...waRels(h, ["teman"]).map(r => "npc:" + r.nama)] : [];
}
const waFriendsOf = h => waRels(h, ["teman"]).length >= 2;
// how someone writes: a creature by its life stage; people outside the house like the one they're close to
function waPhase(w, day, ref) {
  const h = String(w).startsWith("npc:") ? null : game.home.get(w);
  if (h) return Engine.phase_of(day - h.born);
  return ref ? Engine.phase_of(day - ref.born) : "dewasa";
}
function waWho(w, about) { // one line about a member, for Claude
  if (String(w).startsWith("npc:")) {
    const n = w.slice(4), h = game.home.members.find(m => Object.values(m.relations).some(r => r.nama === n));
    const r = h && Object.values(h.relations).find(r => r.nama === n);
    return `- ${n}: ${h ? `${h.name}'s ${(WA_PTYPE[r.tipe] || "friend").toLowerCase()}` : "a friend"}, lives elsewhere in Old Town`;
  }
  const m = member(w), h = game.home.get(w);
  return `- ${m.nama}: ${PHASE_EN[m.fase] || m.fase}${m.fase === "meninggal" ? " (passed away, cannot write)" : ""}, ${traitText(m.sifat)}${m.kerja ? ", works as " + m.kerja : ""}${about && about.id !== w ? `, ${about.name}'s ${waRel(about, h).toLowerCase()}` : ""}`;
}
// ---- groups fill up on big days: a notice, then everyone's messages about it
// the story line of a day, without the ambient line, the decision prompt or the dice maths
const waLine = l => waPlain(l.lines.filter(x => !/^_[^_]*_$/.test(x.trim())).join(" ").replace(/_?Decision:[^_]*(_|$)/g, "").replace(/Score \d+ vs \d+ needed\.?/g, "").replace(/\([^)]*dice[^)]*\)/g, ""));
function waBig(l) { return (l.dramas.some(d => d !== "kecil") || l.ach.length || l.events.some(e => ["akhir_hidup", "pulang_kampung", "telur_warisan"].includes(e))) && waLine(l).length > 8; }
function waTone(l) {
  const t = waLine(l);
  if (l.events.includes("akhir_hidup") || /\b(died|passed away|funeral)\b/i.test(t)) return "loss";
  if (l.ach.length || /(promot|got the job|reached the top|\bwon\b|\bwins?\b|married|engag|hatch|born|graduat|award|hired|new job|first|bought|moved in|egg|talent|best buddies)/i.test(t)) return "joy";
  if (/(sick|ill\b|hurt|fever|forehead is hot|won.t eat|fired|laid off|let go|failed|bad score|broke up|lost|fight|argu|pushed|cried|cries|sad|closed)/i.test(t)) return "down";
  return "news";
}
const WA_FB = {
  joy: { anak: ["YAYYY {n}!!! 🎉🎉", "so cool!!! 🤩", "{n} is the BEST"], remaja: ["ok that's actually sick 🔥", "W {n}", "congrats lol 🎉"],
    dewasa: ["Congrats {n}!! 🎉", "So proud of you ❤️", "Knew you could do it 💪", "Dinner's on you then 😄", "Okay this is HUGE 🥳"], tua: ["So proud of you, dear. ❤️", "Wonderful news. Well done, {n}.", "This made my whole day 🥹"] },
  down: { anak: ["are you ok {n}? 🥺", "i can give you a hug"], remaja: ["that sucks, sorry {n}", "u ok?"],
    dewasa: ["Oh no. Call me if you want to talk 🫶", "We're here for you, {n}.", "It'll be okay. One day at a time."], tua: ["Come by for tea, dear. We'll talk.", "Hard days pass, {n}. I promise."] },
  loss: { anak: ["i miss {n} 😢", "where did {n} go?"], remaja: ["can't believe it 💔", "rest easy {n}"],
    dewasa: ["I can't believe it. 💔", "Rest well, {n}. We love you.", "We'll miss you so much."], tua: ["{n} had a good life. We were lucky.", "Rest now, {n}. 🕊️"] },
  news: { anak: ["whoa!!", "tell me more!!"], remaja: ["wait what", "huh nice"], dewasa: ["Oh! Keep us posted.", "Good to know, thanks {n}!", "👀"], tua: ["Thank you for telling us, dear.", "Well, well! 😊"] },
};
const WA_SELF = { joy: ["Thank you everyone 🥹", "Love you all ❤️", "Still can't believe it 😭"], down: ["Thanks. Means a lot.", "I'll be okay 🫶"], news: ["Will do!", "😄"] };
function waFallback(l, key, people) {
  const day = l.day, tone = waTone(l), subj = game.home.get(l.cid), r = artRng(key), pick = a => a[Math.floor(r() * a.length)];
  const others = people.filter(w => w !== l.cid);
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  const out = [], n = subj ? subj.name : l.name;
  for (const w of others.slice(0, 1 + Math.floor(r() * 3))) {
    const ph = waPhase(w, day, subj), lines = WA_FB[tone][ph] || WA_FB[tone].dewasa;
    out.push({ w, t: pick(lines).replace(/\{n\}/g, n) });
  }
  if (tone !== "loss" && people.includes(l.cid) && out.length) out.push({ w: l.cid, t: pick(WA_SELF[tone]) });
  return out;
}
function waSync() {
  let added = 0;
  const post = (gid, l) => {
    const G = waG(gid), key = l.cid + ":" + l.day;
    if (G.keys[key]) return;
    const people = waPeople(gid, l.day); if (people.filter(w => w !== l.cid).length < 1) return;
    G.keys[key] = 1; added++;
    const tone = waTone(l), line = waLine(l), icon = { joy: "🎉", down: "🫶", loss: "🕊️", news: "📌" }[tone];
    G.msgs.push({ sys: true, d: l.day, k: key, c: l.cid, tone, x: line.slice(0, 400), t: `${icon} ${line.length > 180 ? line.slice(0, 178) + "…" : line}` });
    waFallback(l, key, people).forEach((m, i) => G.msgs.push({ ...m, d: l.day, k: key, fb: true, h: waHour(key + i) }));
    if (G.msgs.length > 500) G.msgs = G.msgs.slice(-400);
  };
  for (const l of feed) {
    if (!waBig(l)) continue;
    post("group", l);
    const h = game.home.get(l.cid); if (h && waFriendsOf(h)) post("fr:" + h.id, l);
  }
  if (added) waSave();
}
// replace the written fallback lines of a group's latest few events with messages Claude writes, once
async function waUpgrade(gid, c) {
  if (!sampleFn || waBusy) return;
  const G = waG(gid), day = today(), keys = [...new Set(G.msgs.filter(m => m.fb && m.d >= day - 30).map(m => m.k))].slice(-3);
  if (!keys.length) return;
  waBusy = true; waTyping(true);
  const people = [...new Set(keys.flatMap(k => waPeople(gid, G.msgs.find(m => m.k === k).d)))];
  const ev = keys.map(k => { const s = G.msgs.find(m => m.sys && m.k === k); return `${k} | ${fmtDate(s.d)} | ${s.x || s.t.replace(/^\S+\s/, "")}`; }).join("\n");
  try {
    const r = await sampleFn.json(`You write a phone group chat (${gid === "group" ? "the family group" : "a group of friends"}) for a cozy life game about small creatures. The members (use exact names, only these may write):\n${people.map(w => waWho(w, c)).join("\n")}\n\n`
      + `For each event below, write what they text each other right after it: 2 to 5 short messages, casual phone texting, emojis ok, English. `
      + `Each member sounds like their personality and life stage: children excited and simple, teens casual, adults warm, elders gentle. The one the event is about may answer. `
      + `Stick to the facts given; never invent new big life events. Reply only JSON {"chats":[{"key":string,"msgs":[{"who":string,"text":string}]}]}.\n\nEvents (key | date | what happened):\n${ev}`,
      { modelTier: "quick", cache: false });
    const byName = new Map(people.map(w => [waName(w).toLowerCase(), w]));
    for (const ch of (r && r.chats) || []) {
      if (!keys.includes(ch.key)) continue;
      const msgs = (ch.msgs || []).filter(m => m && typeof m.text === "string" && m.text.trim() && byName.has(String(m.who).toLowerCase())).slice(0, 6);
      if (!msgs.length) continue;
      const at = G.msgs.findIndex(m => m.k === ch.key && m.fb), d = G.msgs[at].d;
      G.msgs = G.msgs.filter(m => !(m.k === ch.key && m.fb));
      G.msgs.splice(at, 0, ...msgs.map((m, i) => ({ w: byName.get(String(m.who).toLowerCase()), t: m.text.trim().slice(0, 300), d, k: ch.key, h: waHour(ch.key + i) })));
    }
    waSave();
  } catch (e) { failHard(e); }
  waBusy = false; waTyping(false);
  if (PH && PH.view === "chatt" && PH.wa.id === gid) waDraw();
}
// ---- the chats on whoever owns the phone
function waThreads(c) {
  const day = today(), out = [], kid = phKind(c) === "tablet";
  if (waCan(c)) out.push({ id: "home:" + c.id, name: "You", sub: "Your guardian", parent: true, pin: true,
    msgs: (chats[c.id] || []).map(t => ({ w: t.role === "user" ? "you" : c.id, t: t.content, d: t.d ?? day, h: t.h || "" })) });
  const fam = waPeople("group");
  if (fam.length > 1 || waG("group").msgs.length) out.push({ id: "group", name: "Family 🏡", sub: fam.map(w => w === c.id ? "You" : waName(w)).join(", "), group: true, msgs: waG("group").msgs });
  if (waFriendsOf(c) || (WA.groups["fr:" + c.id] || { msgs: [] }).msgs.length) {
    const fr = waPeople("fr:" + c.id);
    out.push({ id: "fr:" + c.id, name: `${c.name}'s besties ✨`, sub: fr.map(w => w === c.id ? "You" : waName(w)).join(", "), group: true, msgs: waG("fr:" + c.id).msgs });
  }
  for (const h of waFam()) {
    if (h.id === c.id) continue;
    const id = "dm:" + [c.id, h.id].sort().join("|");
    out.push({ id, name: h.name, sub: waRel(c, h), who: h.id, msgs: WA.t[id] || [] });
  }
  for (const r of waRels(c, ["pasangan", "tunangan", "suami-istri", "gebetan", "calon", "teman"])) {
    const id = "dm:" + c.id + "|npc:" + r.nama;
    out.push({ id, name: r.nama, sub: WA_PTYPE[r.tipe] || "Friend", npc: { name: r.nama, kind: r.tipe === "teman" ? "friend" : "partner", tipe: r.tipe }, msgs: WA.t[id] || [] });
  }
  if (!kid) for (const L of Career.profile(c, game.home, day).offers) {
    const id = "dm:" + c.id + "|npc:" + L.recruiter;
    out.push({ id, name: L.recruiter, sub: `Recruiter · ${Career.coName(L.co)}`, npc: { name: L.recruiter, kind: "recruiter", L }, msgs: WA.t[id] || [] });
  }
  // a first message so a new chat isn't empty
  for (const T of out) if (!T.group && !T.parent && !T.msgs.length) {
    const from = T.who || "npc:" + T.npc.name, r = artRng(T.id + day), pick = a => a[Math.floor(r() * a.length)];
    const K = T.npc ? T.npc.kind : T.sub;
    const t = K === "recruiter" ? [`Hi ${c.name}! I'm ${T.npc.name}, a recruiter at ${Career.coName(T.npc.L.co)}. Are you open to a ${T.npc.L.title} role? Would love to chat. 🙂`]
      : ({ partner: ["Miss you ❤️", "Thinking about you today 🥰", "Dinner this week?"], friend: ["lol you have to see this", "free this weekend? 👀", "hey stranger 😄"],
        Parent: ["Have you eaten yet? 🍲", "Call me when you're free ❤️", "How's everything, sweetie?"], Child: ["can you pick me up later?", "guess what happened today!!", "i miss you 🥺"],
        Sibling: ["lol did you see the group chat", "you still have my charger 👀", "hey what's up"], Grandparent: ["Come visit your old grandparent soon. 😊", "I baked too much again. Come by!"],
        Grandchild: ["hi!!! 👋", "i drew you something"] })[K] || ["Hey! How are you? 😊"];
    WA.t[T.id] = T.msgs = [{ w: from, t: pick(t), d: T.npc && T.npc.L ? T.npc.L.posted : Math.max(0, day - Math.floor(r() * 4)), h: waHour(T.id) }];
    waSave();
  }
  return out.sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || ((waLast(b) || {}).d || 0) - ((waLast(a) || {}).d || 0));
}
const waLast = T => T.msgs[T.msgs.length - 1];
function waUnread(c, T) {
  const seen = WA.seen[c.id + "|" + T.id] || 0;
  return T.msgs.filter((m, i) => i >= seen && !m.sys && m.w !== (T.parent ? "you" : c.id) && m.d >= today() - 3).length;
}
// ---- look: "Nest". Paper, not wallpaper; every bubble wears the fur colour of whoever sent it,
// and big days arrive as polaroids from the 3D studio instead of a strip of text.
const waFur = w => { const h = String(w).startsWith("npc:") ? null : game.home.get(w); const r = h ? h.rupa : rupaFor({ nama: waName(w) }); return "#" + (FUR[r.warna] || 0xE5BFBF).toString(16).padStart(6, "0"); };
const waTint = w => artShade(waFur(w), 1.62);
const WA_BG = ["#F6D7B0", "#CFE3D3", "#F3C7C0", "#D7D3EE", "#F4E3A6", "#C9DCEB", "#E9D2E4"];
const WA_PAW = `<svg class="wa-paw" viewBox="0 0 20 20" width="13" height="13" aria-label="read"><ellipse cx="10" cy="13.2" rx="4.4" ry="3.6"/><circle cx="4.6" cy="8.6" r="1.9"/><circle cx="8" cy="5.4" r="1.9"/><circle cx="12" cy="5.4" r="1.9"/><circle cx="15.4" cy="8.6" r="1.9"/></svg>`;
function waAva(id, size = 48) {
  const h = String(id).startsWith("npc:") ? null : game.home.get(id), name = waName(id);
  const fase = h ? (({ meninggal: "dewasa", merantau: "dewasa" })[member(h.id)?.fase] || member(h.id)?.fase || "dewasa") : "dewasa";
  const bg = WA_BG[hashStr(name) % WA_BG.length];
  const spec = { key: `ava4|${id}|${fase}`, id: "ava-" + id, fase, rupa: h ? h.rupa : rupaFor({ nama: name }), gear: [], layout: "classic", bg, floor: bg, pose: "joy", props: [], turn: 0, crop: "ava" };
  MG.specs.set(spec.key, spec);
  const u = MG.photos.get(spec.key);
  return `<span class="wa-ava" style="width:${size}px;height:${size}px;background:${bg}"><b style="font-size:${size * 0.42}px">${esc(name[0] || "?")}</b><img data-mgc="${esc(spec.key)}" alt="" ${u ? `src="${u}"` : ""}></span>`;
}
// a group's picture: its members huddled together
function waAvaGroup(T, size = 52, c) {
  const who = waPeople(T.id).filter(w => !c || w !== c.id).slice(0, 3);
  if (!who.length) who.push(...new Set(T.msgs.filter(m => !m.sys).map(m => m.w)));
  const s = Math.round(size * (who.length > 1 ? 0.64 : 1)), pos = [[0, 0], [size - s, size * 0.12], [size * 0.22, size - s]];
  return `<span class="wa-huddle" style="width:${size}px;height:${size}px">${who.slice(0, 3).map((w, i) => `<span style="left:${pos[i][0]}px;top:${pos[i][1]}px;z-index:${3 - i}">${waAva(w, s)}</span>`).join("")}</span>`;
}
const waAvaOf = T => T.group ? T.id : T.who || "npc:" + T.npc.name;
const waPic = (T, size, c) => T.parent ? `<span class="wa-ava" style="width:${size}px;height:${size}px;background:#F6D7B0"><b style="font-size:${size * 0.46}px">🏠</b></span>` : T.group ? waAvaGroup(T, size, c) : waAva(waAvaOf(T), size);
function waWhen(d) { const n = today() - d; return n <= 0 ? "Today" : n === 1 ? "Yesterday" : n < 7 ? phDayDate(d).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) : fmtDate(d); }
function waRow(c, T) {
  const m = waLast(T), un = waUnread(c, T), d = m ? today() - m.d : 0;
  const when = !m ? "" : d <= 0 ? (m.h || "") : d === 1 ? "Yesterday" : d < 7 ? phDayDate(m.d).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }) : phDayDate(m.d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const who = !m || m.sys ? "" : T.parent && m.w === "you" ? "You: " : !T.parent && m.w === c.id ? `${esc(c.name)}: ` : T.group ? `${esc(waName(m.w))}: ` : "";
  return `<button class="wa-row${un ? " new" : ""}" data-wa="${esc(T.id)}">${waPic(T, 52, c)}<span class="wa-mid"><b>${esc(T.name)}</b><small>${who}${m ? esc(m.sys ? m.t.replace(/^\S+\s/, "") : m.t) : esc(T.sub)}</small></span>
    <span class="wa-side"><small>${when}</small>${un ? `<i class="wa-un">${un}</i>` : m && m.w === c.id ? WA_PAW : "<i></i>"}</span></button>`;
}
function phChat(c) {
  waSync();
  const W = PH.wa || (PH.wa = { f: "all", q: "" });
  return `<div class="wa"><header class="wa-top"><div class="wa-brand"><h1>Nest</h1><small>${esc(c.name)}'s chats</small></div>${srchBox("Search chats and messages", W.q, "wa-srch")}
    <div class="wa-chips">${[["all", "All"], ["unread", "New"], ["groups", "Groups"]].map(([k, l]) => `<button data-waf="${k}" class="${W.f === k ? "on" : ""}">${l}</button>`).join("")}</div></header>
    <div class="wa-list" data-walist>${waRows(c)}</div></div>`;
}
function waRows(c) {
  const W = PH.wa, q = W.q, all = waThreads(c);
  let list = all.filter(T => W.f === "all" || (W.f === "unread" ? waUnread(c, T) : T.group));
  if (q) list = all.filter(T => srchHit(q, T.name, T.sub, ...T.msgs.map(m => m.t)));
  srchN = list.length;
  if (!list.length) return `<p class="wa-empty">${q ? `No chats or messages match “${esc(q)}”.` : W.f === "unread" ? "You're all caught up." : "No chats yet."}</p>`;
  return list.map(T => waRow(c, T)).join("");
}
function phChatThread(c, id) {
  const T = waThreads(c).find(t => t.id === id); if (!T) return phChat(c);
  PH.wa = Object.assign(PH.wa || { f: "all", q: "" }, { id });
  WA.seen[c.id + "|" + id] = T.msgs.length; waSave();
  return `<div class="wa wa-t"><header class="wa-bar"><button class="wa-back" data-waback aria-label="Back"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
      ${waPic(T, 40, c)}<span class="wa-who"><b>${esc(T.name)}</b><small data-wasub>${esc(T.group || (T.npc && T.npc.kind === "recruiter") ? T.sub : T.sub + " · around")}</small></span>
      ${T.npc && T.npc.kind === "recruiter" ? `<button class="wa-job" data-wajob>View job</button>` : ""}</header>
    <div class="wa-wall" data-wamsgs>${waMsgs(c, T)}</div>
    ${T.parent ? `<form class="wa-in" data-waform><input placeholder="Write to ${esc(c.name)}…" autocomplete="off" maxlength="300" enterkeyhint="send"><button aria-label="Send"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg></button></form>`
      : `<p class="wa-peek">You're reading ${esc(c.name)}'s chats. Only ${esc(c.name)} writes here.</p>`}</div>`;
}
// a big day as a polaroid: the one it's about, posed for the mood, with the story written underneath
const WA_POSE = { joy: "wave", news: "glance", down: "soft", loss: "soft" };
function waPolaroid(m) {
  const h = m.c && game.home.get(m.c), tone = m.tone || "news", rot = ((hashStr(m.k) % 7) - 3) * 0.7;
  let pic = "";
  if (h) {
    const fase = Engine.phase_of(Math.max(0, m.d - h.born)), pal = MG_PAL[hashStr(m.k) % MG_PAL.length];
    const spec = { key: `pol2|${m.k}`, id: "pol-" + h.id, fase: fase === "bayi" ? "anak" : fase, rupa: h.rupa, gear: [], layout: "classic", bg: pal[0], floor: pal[1], pose: WA_POSE[tone], props: [], turn: 0, crop: "pol" };
    MG.specs.set(spec.key, spec);
    const u = MG.photos.get(spec.key);
    pic = `<span class="wa-pol-pic${tone === "loss" ? " mono" : ""}" style="background:${pal[0]}"><img data-mgc="${esc(spec.key)}" alt="" ${u ? `src="${u}"` : ""}></span>`;
  }
  return `<div class="wa-pol" style="--r:${rot}deg">${pic}<p>${esc((m.x || m.t.replace(/^\S+\s/, "")).replace(/\s*…$/, ""))}</p><small>${fmtDate(m.d)}</small></div>`;
}
function waMsgs(c, T) {
  let html = "", lastD = null, lastW = null;
  const ms = T.msgs;
  ms.forEach((m, i) => {
    if (m.d !== lastD) { html += `<div class="wa-day"><span>${waWhen(m.d)}</span></div>`; lastD = m.d; lastW = null; }
    if (m.sys) { html += waPolaroid(m); lastW = null; return; }
    const me = T.parent ? m.w === "you" : m.w === c.id, first = m.w !== lastW, next = ms[i + 1], last = !next || next.sys || next.w !== m.w || next.d !== m.d; lastW = m.w;
    const col = waTint(m.w);
    html += `<div class="wa-r${me ? " me" : ""}${first ? " first" : ""}${last ? " last" : ""}">${me ? "" : `<span class="wa-r-ava">${last ? waAva(m.w, 30) : ""}</span>`}
      <div class="wa-b" style="background:${col}">${T.group && !me && first ? `<b style="color:${artShade(waFur(m.w), 0.55)}">${esc(waName(m.w))}</b>` : ""}<span>${esc(m.t)}</span><small>${m.h || ""}${me ? WA_PAW : ""}</small></div></div>`;
  });
  return html + `<div class="wa-dots" hidden><i></i><i></i><i></i></div>`;
}
function waDraw() {
  const box = PH && PH.el.querySelector("[data-wamsgs]"); if (!box) return;
  const T = waThreads(PH.c).find(t => t.id === PH.wa.id); if (!T) return;
  box.innerHTML = waMsgs(PH.c, T); box.scrollTop = box.scrollHeight;
  WA.seen[PH.c.id + "|" + T.id] = T.msgs.length; waSave();
}
function waTyping(on, label) {
  const box = PH && PH.el.querySelector("[data-wamsgs]"); if (!box) return;
  const d = box.querySelector(".wa-dots"); if (d) d.hidden = !on;
  const s = PH.el.querySelector("[data-wasub]"); if (s) { if (on) { s.dataset.was = s.dataset.was || s.textContent; s.textContent = label || "typing…"; } else if (s.dataset.was) { s.textContent = s.dataset.was; delete s.dataset.was; } }
  if (on) box.scrollTop = box.scrollHeight;
}
// what the other side knows when Claude writes as them
function waPersona(c, T) {
  if (T.who) { const m = member(T.who); return `You are ${m.nama}, texting with ${c.name}, who is your ${waRel(game.home.get(T.who), c).toLowerCase()}. ${VOICE[m.fase] || VOICE.dewasa}\n\nFacts about you:\n${facts(m)}`; }
  if (T.npc.kind === "recruiter") { const L = T.npc.L; return `You are ${T.npc.name}, a friendly recruiter at ${Career.coName(L.co)}. You reached out to ${c.name} about a ${L.title} role paying ${coins(L.pay)} a day; the offer is open until ${fmtDate(L.until)}. You can't hire anyone over chat: if they want it, tell them to accept it in the Burrow app. Professional but warm.`; }
  const rel = (WA_PTYPE[T.npc.tipe] || "friend").toLowerCase();
  return `You are ${T.npc.name}, ${c.name}'s ${rel}. You live elsewhere in Old Town. ${T.npc.kind === "friend" ? "A close friend: jokey, honest, loyal." : "Loving, playful, a little teasing."} Talk like someone their age. What you know about ${c.name}:\n${facts(member(c.id))}`;
}
const WA_REPLY = { anak: ["ok!! 😆", "yay", "hehe"], remaja: ["lol ok", "fr", "k 👍"], dewasa: ["Haha, sounds good!", "❤️", "Okay! Talk later?", "Really? Tell me more later 😄"], tua: ["That's lovely, dear. 😊", "Take care of yourself. ❤️"] };
async function waSend(text) {
  const c = PH.c, T = waThreads(c).find(t => t.id === PH.wa.id); if (!T) return;
  const list = () => T.group ? waG(T.id).msgs : (WA.t[T.id] ||= []);
  list().push({ w: c.id, t: text, d: today(), h: phClock() }); waSave(); waDraw();
  if (waBusy) return;
  // who answers: the other side, or one or two people in the group
  const others = T.group ? waPeople(T.id).filter(w => w !== c.id) : [T.who || "npc:" + T.npc.name];
  if (!others.length) return;
  waBusy = true;
  const tid = T.id, push = (w, t) => { list().push({ w, t: t.slice(0, 400), d: today(), h: phClock() }); waSave(); if (PH && PH.wa && PH.wa.id === tid) waDraw(); };
  const transcript = list().filter(m => !m.sys).slice(-14).map(m => `${m.w === c.id ? c.name : waName(m.w)}: ${m.t}`).join("\n");
  setTimeout(() => { if (waBusy) waTyping(true, T.group ? `${waName(others[0])} is typing…` : "typing…"); }, 500);
  try {
    if (!sampleFn) throw { code: "offline" };
    if (T.group) {
      const r = await sampleFn.json(`This is a phone group chat in a cozy life game about small creatures. ${c.name} just wrote the last message. Members who may answer (exact names):\n${others.map(w => waWho(w, c)).join("\n")}\n\n`
        + `Write 1 or 2 replies from the members it makes sense to hear from, short casual texting, emojis ok, in the language ${c.name} wrote in. Stay in character; never invent big life events; never say you are an AI. `
        + `Reply only JSON {"msgs":[{"who":string,"text":string}]}.\n\nChat so far:\n${transcript}`, { modelTier: "quick", cache: false });
      const byName = new Map(others.map(w => [waName(w).toLowerCase(), w]));
      const ms = ((r && r.msgs) || []).filter(m => m && typeof m.text === "string" && m.text.trim() && byName.has(String(m.who).toLowerCase())).slice(0, 2);
      if (!ms.length) throw { code: "empty" };
      for (const m of ms) push(byName.get(String(m.who).toLowerCase()), m.text.trim());
    } else {
      const { text: reply } = await sampleFn(`${waPersona(c, T)}\n\nThis is a phone chat. Write ONLY your next text message: short (1 or 2 sentences), casual texting, emojis ok. Reply in the language ${c.name} last wrote in. `
        + `Never say you are an AI or a game, and don't invent big life events.\n\nChat so far:\n${transcript}\n${T.name}:`, { modelTier: "quick", cache: false });
      const t = reply.trim().replace(new RegExp("^" + T.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":\\s*"), "").replace(/^"|"$/g, "");
      if (!t) throw { code: "empty" };
      push(others[0], t);
    }
  } catch (e) {
    failHard(e);
    // written lines when Claude isn't there
    await new Promise(r => setTimeout(r, 1300));
    const w = others[hashStr(text) % others.length];
    const lines = T.npc && T.npc.kind === "recruiter" ? ["Thanks! You can accept the offer in Burrow whenever you're ready. 🙂"] : WA_REPLY[waPhase(w, today(), c)] || WA_REPLY.dewasa;
    push(w, lines[hashStr(text + list().length) % lines.length]);
  }
  waBusy = false; waTyping(false);
}
async function waParent(text) {
  const c = PH.c, tid = "home:" + c.id, redraw = () => { if (PH && PH.wa && PH.wa.id === tid) waDraw(); };
  if (!sampleFn) { (chats[c.id] ||= []).push({ role: "user", content: text, d: today(), h: phClock() }); saveChats(); redraw(); return; }
  setTimeout(() => { redraw(); waTyping(true); }, 0);
  try { await guardianSay(c.id, text); } catch (e) { if (e && e.code === "busy") return; }
  waTyping(false); redraw();
}
// a chat whose last word isn't theirs: the creature answers on its own, in character, while you watch
async function waAnswer(c, tid) {
  const T = waThreads(c).find(t => t.id === tid), last = T && waLast(T);
  if (!T || !last || last.sys || last.w === c.id || waBusy || !waCan(c) || last.d < today() - 2) return;
  if (T.msgs.filter(x => x.w === c.id && x.d === today()).length >= 3) return; // a few texts a day, not a feed
  const m = member(c.id), list = WA.t[T.id] ||= [];
  waBusy = true;
  setTimeout(() => { if (waBusy) waTyping(true, `${c.name} is typing…`); }, 700);
  let text = null;
  try {
    if (!sampleFn) throw { code: "offline" };
    const transcript = list.filter(x => !x.sys).slice(-12).map(x => `${waName(x.w)}: ${x.t}`).join("\n");
    const { text: r } = await sampleFn(`You are ${c.name}, a small creature in a cozy life game, texting ${T.name} (your ${String(T.sub).toLowerCase()}). ${VOICE[m.fase] || VOICE.dewasa} `
      + `Your personality decides what you say and do; nobody tells you what to write. Write ONLY your next text message: short (1 or 2 sentences), casual texting, emojis ok. Never say you are an AI or a game, and don't invent big life events.\n\nFacts about you:\n${facts(m)}\n\nChat so far:\n${transcript}\n${c.name}:`, { modelTier: "quick", cache: false });
    text = r.trim().replace(new RegExp("^" + c.name + ":\\s*"), "").replace(/^"|"$/g, "");
  } catch (e) { failHard(e); const L = WA_REPLY[m.fase] || WA_REPLY.dewasa; text = L[hashStr(last.t) % L.length]; }
  waBusy = false; waTyping(false);
  if (!text) return;
  await new Promise(r => setTimeout(r, 900));
  waSend(text);
}
function waBind(v) {
  const W = PH.wa;
  const rows = () => v.querySelectorAll("[data-wa]").forEach(b => b.onclick = () => phGo("chatt", b.dataset.wa));
  rows();
  v.querySelectorAll("[data-waf]").forEach(b => b.onclick = () => { W.f = b.dataset.waf; phGo("chat"); });
  const s = v.querySelector(".wa-srch input"), list = v.querySelector("[data-walist]");
  if (s && list) s.oninput = () => { W.q = s.value.trim(); list.innerHTML = waRows(PH.c); Tele.cari("nest", W.q, srchN); rows(); mgFill(v); };
  const bk = v.querySelector("[data-waback]"); if (bk) bk.onclick = () => phGo("chat");
  const jb = v.querySelector("[data-wajob]"); if (jb) jb.onclick = () => phOpen("burrow", ["jobs"]);
  const f = v.querySelector("[data-waform]");
  if (f) {
    f.onsubmit = e => { e.preventDefault(); const i = f.querySelector("input"), t = i.value.trim(); if (!t) return; i.value = ""; waParent(t); };
  }
  const box = v.querySelector("[data-wamsgs]"); if (box) box.scrollTop = box.scrollHeight;
  if (W.id && (W.id === "group" || W.id.startsWith("fr:"))) waUpgrade(W.id, PH.c);
  else if (W.id && W.id.startsWith("dm:")) waAnswer(PH.c, W.id);
}

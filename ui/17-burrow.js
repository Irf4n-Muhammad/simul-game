// ---- Burrow: the town's work network. Your creature's profile, jobs that come and go, and news from everyone you know.
let bw = null;
// search: every word typed has to appear somewhere in the text, in any order, ignoring case
const srchHit = (q, ...parts) => { const t = parts.filter(Boolean).join(" ").toLowerCase(); return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => t.includes(w)); };
let srchN = 0; // jumlah hasil pencarian terakhir, buat telemetry
const srchBox = (ph, val, cls = "") => `<label class="srch ${cls}"><svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><input type="search" placeholder="${esc(ph)}" value="${esc(val || "")}" autocomplete="off" spellcheck="false"></label>`;
const BW_IND = { fastfood: "Food", office: "Office", teacher: "Teaching", nurse: "Care", designer: "Design", software: "Tech", influencer: "Media", athlete: "Sports", doctor: "Medicine", quant: "Finance" };
const bwAgo = d => { const n = today() - d; return n <= 0 ? "Today" : n < 7 ? `${n}d` : n < 60 ? `${Math.floor(n / 7)}w` : `${Math.floor(n / 30)}mo`; };
const bwSpan = (a, b) => { const n = Math.max(1, b - a); return n < 30 ? `${n} day${n > 1 ? "s" : ""}` : n < 365 ? `${Math.floor(n / 30)} mo` : `${Math.floor(n / 365)} yr${n >= 730 ? "s" : ""} ${Math.floor((n % 365) / 30) ? Math.floor((n % 365) / 30) + " mo" : ""}`.trim(); };
const bwMonth = d => fmtDate(d).split(" ").slice(1).join(" ");
const bwInit = s => s.split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const bwHue = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ["#E07A5F", "#3D405B", "#81B29A", "#5B7FB8", "#C96B86", "#8C74B8", "#D9874A", "#4C9F9F", "#A0785A"][h % 9]; };
const bwLogo = (co, size = 44) => { const C = Career.CO[co]; return `<span class="bw-logo" style="width:${size}px;height:${size}px;background:${C ? C.color : "#999"};font-size:${size * 0.36}px">${esc(bwInit(C ? C.name : "?"))}</span>`; };
const bwFace = (name, color, size = 44) => `<span class="bw-face" style="width:${size}px;height:${size}px;background:${color || bwHue(name)};font-size:${size * 0.4}px">${esc(name[0] || "?")}</span>`;
let bwClaps = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY + "-claps")) || {}; } catch (e) { return {}; } })();

function showBurrow(tab = "feed", back = null) {
  if (!cur) return;
  closeSheet(); Tele.layar("app", "burrow:" + tab);
  if (bw) bw.el.remove();
  const el = document.createElement("div"); el.className = "bw"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Burrow");
  el.innerHTML = `<div class="bw-top"><button class="bw-back" aria-label="Back">‹</button><span class="bw-mark">burrow</span>
      ${srchBox("Search jobs, companies, people", "", "bw-search")}</div>
    <div class="bw-body" id="bwBody"></div>
    <nav class="bw-nav">${[["feed", "Home", `<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>`], ["jobs", "Jobs", `<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`], ["me", "Profile", `<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>`]]
      .map(([k, l, d]) => `<button data-tab="${k}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${d}</svg><span>${l}</span><i class="bw-badge" hidden></i></button>`).join("")}</nav>`;
  (PH ? PH.screen : $("app")).appendChild(el);
  bw = { el, c: game.home.get(cur.id), tab, back, view: null, filter: "all" };
  el.querySelector(".bw-back").onclick = () => bw.q ? (el.querySelector(".bw-search input").value = "", bw.q = "", bwShow(bw.tab)) : bw.view ? bwShow(bw.tab) : closeBurrow();
  el.querySelectorAll(".bw-nav [data-tab]").forEach(b => b.onclick = () => bwShow(b.dataset.tab));
  const sq = el.querySelector(".bw-search input");
  sq.oninput = () => { bw.q = sq.value.trim(); if (bw.q) { const body = $("bwBody"); body.innerHTML = bwSearch(bw.q); Tele.cari("burrow", bw.q, srchN); body.scrollTop = 0; bwBind(body); } else bwShow(bw.tab); };
  bwShow(tab);
  requestAnimationFrame(() => el.classList.add("on"));
}
function closeBurrow() {
  if (!bw) return;
  const s = bw; s.el.classList.remove("on"); bw = null;
  setTimeout(() => s.el.remove(), 320);
  if (s.back === "phone") phGo("home"); else if (s.back) showLife(s.back);
}
function bwShow(tab, view = null) {
  bw.tab = tab; bw.view = view; bw.c = game.home.get(cur.id);
  bw.el.querySelectorAll(".bw-nav [data-tab]").forEach(b => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
  const offers = Career.profile(bw.c, game.home, today()).offers.length, badge = bw.el.querySelector('.bw-nav [data-tab="jobs"] .bw-badge');
  badge.hidden = !offers; badge.textContent = offers;
  const body = $("bwBody");
  body.innerHTML = view ? bwJob(view) : tab === "jobs" ? bwJobs() : tab === "me" ? bwMe() : bwFeed();
  body.scrollTop = 0;
  bwBind(body);
}
function bwBind(body) {
  body.querySelectorAll("[data-job]").forEach(b => b.onclick = () => bwShow(bw.tab, b.dataset.job));
  body.querySelectorAll("[data-filter]").forEach(b => b.onclick = () => { bw.filter = b.dataset.filter; bwShow("jobs"); });
  body.querySelectorAll("[data-clap]").forEach(b => b.onclick = () => {
    const id = b.dataset.clap; bwClaps[id] = !bwClaps[id];
    try { localStorage.setItem(SAVE_KEY + "-claps", JSON.stringify(bwClaps)); } catch (e) {}
    b.classList.toggle("on", !!bwClaps[id]); const n = b.querySelector("b"); n.textContent = +n.dataset.n + (bwClaps[id] ? 1 : 0);
  });
  body.querySelectorAll("[data-moment]").forEach(b => b.onclick = () => { const m = famStatus().moments.find(x => x.id === b.dataset.moment); if (m) showMoment(m); });
  body.querySelectorAll("[data-go]").forEach(b => b.onclick = () => bwShow(b.dataset.go));
  const ap = body.querySelector("#bwApply");
  if (ap) ap.onclick = () => {
    if (game.act(cur.id, "apply:" + ap.dataset.id)) { save(); refresh(); say("Wish me luck!"); burst(["✉"], 6, "#1F7A6B"); bwShow("jobs"); }
  };
  const fd = body.querySelector("#bwFound");
  if (fd) fd.onclick = () => { if (game.act(cur.id, "lamar:founder")) { save(); refresh(); say("Here goes everything!"); bwShow("jobs"); } };
  const st = body.querySelector("#bwStars"); if (st) st.onclick = () => { const b = bw.back; closeBurrow(); showTree(cur.id, b); };
}
function bwPost(p) {
  const on = !!bwClaps[p.id], col = p.self ? colorOf(cur) : null;
  const face = p.kind === "news" ? bwLogo(p.co, 44) : bwFace(p.who, col);
  const icon = { promo: "🎉", job: "💼", otw: "🌱", anniv: "🎂", news: "📣" }[p.kind] || "";
  return `<article class="bw-card bw-post${p.self ? " self" : ""}">
    <header>${face}<div><b>${esc(p.who)}</b>${p.rel ? `<span class="bw-rel">${esc(p.rel)}</span>` : ""}<small>${esc(p.head || "")}</small><small>${bwAgo(p.day)}</small></div></header>
    <p>${icon} ${p.kind === "news" ? "" : `<b>${esc(p.who.split(" ")[0])}</b> `}${esc(p.text)}</p>
    ${p.kind !== "news" && p.co && !p.self && Career.alive(Career.CO[p.co], today()) ? `<div class="bw-mini">${bwLogo(p.co, 28)}<span>${esc(Career.coName(p.co))}<small>${esc(Career.CO[p.co].size)} · ${BW_IND[Career.CO[p.co].ind]}</small></span></div>` : ""}
    <footer><button class="bw-clap${on ? " on" : ""}" data-clap="${esc(p.id)}">👏 <b data-n="${p.likes}">${p.likes + (on ? 1 : 0)}</b></button>${p.kind === "otw" && !p.self ? `<span class="bw-sub">Send them a lead when you see one</span>` : ""}</footer>
  </article>`;
}
function bwSearch(q) {
  const c = bw.c, day = today(), P = Career.profile(c, game.home, day);
  const jobs = Career.openings(day).concat(P.offers).filter(L => srchHit(q, L.title, Career.coName(L.co), BW_IND[L.ind], L.recruiter));
  const cos = Object.values(Career.CO).filter(co => co.founded <= day && Career.alive(co, day) && srchHit(q, co.name, BW_IND[co.ind], co.size)).slice(0, 8);
  const posts = Career.feed(c, game.home, day).filter(p => srchHit(q, p.who, p.head, p.text, Career.coName(p.co))).slice(0, 8);
  const open = id => Career.openings(day).filter(L => L.co === id).length;
  const none = !jobs.length && !cos.length && !posts.length;
  srchN = jobs.length + cos.length + posts.length;
  return none ? `<p class="bw-empty">Nothing in Old Town matches “${esc(q)}”.</p>`
    : `${jobs.length ? `<h4 class="bw-h">Jobs <small>${jobs.length}</small></h4>${jobs.map(L => bwJobCard(L, c)).join("")}` : ""}
    ${cos.length ? `<h4 class="bw-h">Companies</h4>${cos.map(co => `<div class="bw-card bw-jobrow">${bwLogo(co.id)}<span class="grow"><b>${esc(co.name)}</b><span>${esc(BW_IND[co.ind])} · ${esc(co.size)}</span><small>${open(co.id) ? `${open(co.id)} open job${open(co.id) > 1 ? "s" : ""}` : "Not hiring right now"} · ${co.founded < 0 ? `around for ${Math.max(1, Math.round((day - co.founded) / 365))} years` : `opened ${bwAgo(co.founded).toLowerCase()} ago`}</small></span></div>`).join("")}` : ""}
    ${posts.length ? `<h4 class="bw-h">Posts</h4>${posts.map(bwPost).join("")}` : ""}`;
}
function bwFeed() {
  const c = bw.c, P = Career.profile(c, game.home, today()), posts = Career.feed(c, game.home, today());
  return `<section class="bw-card bw-me-mini">${bwFace(c.name, colorOf(cur), 52)}<div><b>${esc(c.name)}</b><small>${esc(P.headline)}</small><small>${P.connections} connections · Old Town</small></div>
      <button class="bw-btn ghost" data-go="me">Profile</button></section>
    ${P.offers.length ? `<button class="bw-card bw-alert" data-go="jobs">✉ ${P.offers.length} recruiter message${P.offers.length > 1 ? "s" : ""} waiting</button>` : ""}
    ${posts.length ? posts.map(bwPost).join("") : `<p class="bw-empty">Quiet week in Old Town. News from people ${esc(c.name)} knows shows up here.</p>`}`;
}
function bwJobCard(L, c) {
  const f = Career.fit(c, L), co = Career.CO[L.co];
  return `<button class="bw-card bw-jobrow" data-job="${esc(L.id)}">${bwLogo(L.co)}<span class="grow"><b>${esc(L.title)}</b><span>${esc(co.name)}</span>
      <small>${coins(L.pay)}/day · ${BW_IND[L.ind]} · ${L.offer ? `from ${esc(L.recruiter)}` : `${bwAgo(L.posted)} · ${L.applicants} applied`}</small></span>
      <span class="bw-fit ${f.label === "Good fit" ? "good" : f.label === "A stretch" ? "mid" : "low"}">${f.label}</span></button>`;
}
function bwFamCard(L, c) {
  const f = Venture.fit(c, L.tpl), T = baTheme(L.tpl);
  return `<button class="bw-card bw-jobrow" data-job="${esc(L.id)}"><span class="bw-logo" style="background:${T.col};width:44px;height:44px;font-size:22px">${T.ic}</span><span class="grow"><b>${esc(L.title)}</b><span>${esc(L.name)}</span>
      <small>about ${coins(L.pay)}/day · run by ${esc(L.owner)} · ${L.applicants} applied</small></span><span class="bw-fit ${f >= 0.48 ? "good" : f >= 0.36 ? "mid" : "low"}">${Venture.fitLabel(f)}</span></button>`;
}
function bwFamJob(L) {
  const c = bw.c, f = Venture.fit(c, L.tpl), T = baTheme(L.tpl), b = baBiz(L.biz), can = Career.canWork(c, today());
  const done = b && b.post && b.post.apps.some(a => a.fam === c.id), here = b && (b.staff || []).some(s => s.fam === c.id);
  const why = !can ? `${c.name} can't work right now.` : here ? `${c.name} already works here.` : done ? "Already applied." : !canCare() ? "Not right now." : "";
  return `<section class="bw-card bw-jobhead"><span class="bw-logo" style="background:${T.col};width:60px;height:60px;font-size:30px">${T.ic}</span><h2>${esc(L.title)}</h2><span>${esc(L.name)} · family business</span>
      <small>Posted ${bwAgo(L.posted).toLowerCase()} ago · ${L.applicants} applied · closes in ${Math.max(1, L.until - today())} days</small>
      <div class="bw-facts"><span>💰 about ${coins(L.pay)} a day</span><span>👤 ${esc(L.owner)} decides</span><span>${L.cat.icon} ${esc(L.cat.label)}</span></div></section>
    <section class="bw-card"><h4>How ${esc(c.name)} fits</h4><div class="bw-meter"><i style="width:${Math.round(f * 100)}%"></i></div><p><b>${Venture.fitLabel(f)}.</b> Family gets a small head start, but ${esc(L.owner)} still picks the best person.</p></section>
    <div class="bw-apply"><button class="bw-btn big" id="bwApply" data-id="${esc(L.id)}" ${why ? "disabled" : ""}>${done ? "Applied" : "Easy apply"}</button>${why ? `<small class="bw-sub">${esc(why)}</small>` : `<small class="bw-sub">${esc(L.owner)} picks within a few days.</small>`}</div>`;
}
function bwFindJob(id) {
  const c = bw.c;
  return Career.openings(today()).find(o => o.id === id) || Career.profile(c, game.home, today()).offers.find(o => o.id === id) || null;
}
function bwJobs() {
  const c = bw.c, s = statusOf(c.id), P = Career.profile(c, game.home, today());
  const can = Career.canWork(c, today()), busy = s.moments.some(m => m.kind === "interview");
  let list = Career.openings(today()).filter(L => !(c.st.job && c.st.job.co === L.co && c.st.job.level >= L.level));
  const withFit = list.map(L => [L, Career.fit(c, L)]);
  const f = bw.filter;
  list = withFit.filter(([L, x]) => f === "all" || (f === "good" ? x.label === "Good fit" : f === "stretch" ? x.label !== "Good fit" : L.ind === f)).map(([L]) => L);
  if (f === "all") list.sort((a, b) => Career.fit(c, b).chance - Career.fit(c, a).chance || b.pay - a.pay);
  const inds = [...new Set(withFit.map(([L]) => L.ind))];
  return `${!can ? `<p class="bw-note">${esc(c.name)} can't work yet: ${esc(P.headline.toLowerCase())}. You can still look around.</p>` : busy ? `<p class="bw-note">${esc(c.name)} has an interview coming. One at a time.</p>` : ""}
    ${s.moments.length ? `<h4 class="bw-h">Coming up</h4>${s.moments.map(m => `<button class="bw-card bw-jobrow" data-moment="${esc(m.id)}">${m.co ? bwLogo(m.co) : `<span class="bw-logo" style="background:#1F7A6B">★</span>`}<span class="grow"><b>${esc(m.label)}</b><small>${fmtWhen(m.day)} · needs ${m.req} · now ${m.est.skill + m.est.talent + m.est.cond + (m.est.tree || 0)} + dice</small></span></button>`).join("")}` : ""}
    ${P.offers.length ? `<h4 class="bw-h">Recruiter messages</h4>${P.offers.map(L => bwJobCard(L, c)).join("")}` : ""}
    ${(() => { const F = Venture.postings(game.home, today()).filter(L => (Venture.ownerBiz(game.home, c.id) || {}).id !== L.biz); return F.length ? `<h4 class="bw-h">Family businesses <small>${F.length} hiring</small></h4>${F.map(L => bwFamCard(L, c)).join("")}` : ""; })()}
    <h4 class="bw-h">Jobs in Old Town <small>${withFit.length} open</small></h4>
    <div class="bw-chips">${[["all", "All"], ["good", "Good fit"], ["stretch", "Stretch"], ...inds.map(i => [i, BW_IND[i]])].map(([k, l]) => `<button class="bw-chip" data-filter="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
    ${list.length ? list.map(L => bwJobCard(L, c)).join("") : `<p class="bw-empty">Nothing here today. New jobs show up every few days.</p>`}
    <div class="bw-card bw-found"><b>Start your own company</b><small>Costs ${coins(Status.JOBS.founder.capital)}. Investors decide at a pitch in 2 days. Lose it all if they say no.</small>
      <button class="bw-btn" id="bwFound" ${!can || busy || c.st.wallet < Status.JOBS.founder.capital || c.st.job?.id === "founder" || !canCare() ? "disabled" : ""}>Pitch investors</button></div>`;
}
function bwJob(id) {
  const c = bw.c;
  if (id.startsWith("fb:")) { const F = Venture.postings(game.home, today()).find(o => o.id === id); return F ? bwFamJob(F) : `<p class="bw-empty">This job was filled or taken down.</p>`; }
  const L = bwFindJob(id);
  if (!L) return `<p class="bw-empty">This job was filled or taken down.</p>`;
  const co = Career.CO[L.co], f = Career.fit(c, L), s = statusOf(c.id);
  const can = Career.canWork(c, today()), busy = s.moments.some(m => m.kind === "interview"), done = (c.st.applied || []).includes(L.id);
  const why = !can ? `${c.name} can't work right now.` : done ? "Already applied." : busy ? "Wait for the interview that's coming first." : !canCare() ? "Not right now." : "";
  const skills = Object.keys(Status.JOBS[L.ind].w).map(k => Status.SKILL_LABEL[k]).join(", ");
  return `<section class="bw-card bw-jobhead">${bwLogo(L.co, 60)}<h2>${esc(L.title)}</h2><span>${esc(co.name)} · Old Town</span>
      <small>${L.offer ? `${esc(L.recruiter)} reached out to ${esc(c.name)}` : `Posted ${bwAgo(L.posted).toLowerCase()} ago · ${L.applicants} applied`} · closes in ${Math.max(1, L.until - today())} day${L.until - today() > 1 ? "s" : ""}</small>
      <div class="bw-facts"><span>💰 ${coins(L.pay)} a day</span><span>🏢 ${esc(co.size)}</span><span>🧭 ${BW_IND[L.ind]}</span></div></section>
    <section class="bw-card"><h4>How ${esc(c.name)} fits</h4>
      <div class="bw-meter"><i style="width:${Math.round(f.chance * 100)}%"></i></div>
      <p><b>${f.label}.</b> ${f.chance >= 1 ? "Any roll of the dice gets it." : f.chance <= 0 ? "Even a 6 on the dice won't be enough yet." : `About ${Math.round(f.chance * 6)} in 6 dice rolls would get it.`} Score now ${f.base}, needs ${L.req}, dice adds 2 to 15 on the day.</p>
      <small class="bw-sub">Looks for: ${esc(skills)}</small></section>
    <section class="bw-card"><h4>About ${esc(co.name)}</h4><p>${esc(co.culture)} ${co.founded < 0 ? `Around for ${Math.max(1, Math.round((today() - co.founded) / 365))} years.` : `Opened ${bwAgo(co.founded).toLowerCase()} ago.`}</p></section>
    <div class="bw-apply"><button class="bw-btn big" id="bwApply" data-id="${esc(L.id)}" ${why ? "disabled" : ""}>${done ? "Applied" : "Easy apply"}</button>${why ? `<small class="bw-sub">${esc(why)}</small>` : `<small class="bw-sub">Interview in 2 days. Save a good dice roll for it.</small>`}</div>`;
}
function bwMe() {
  const c = bw.c, P = Career.profile(c, game.home, today()), s = statusOf(c.id), callings = Tree.pathOf(c);
  return `<section class="bw-card bw-prof"><div class="bw-cover"></div>${bwFace(c.name, colorOf(cur), 84)}
      <h2>${esc(c.name)}</h2><p>${esc(P.headline)}</p><small>Old Town · ${P.connections} connections</small>
      ${P.open ? `<span class="bw-otw">Open to work</span>` : ""}</section>
    <section class="bw-card"><h4>About</h4><p>${esc(habitsOf(c.id).map(h => HABITS[h].label).join(". "))}. ${esc(traitText(cur.sifat).replace(/^./, ch => ch.toUpperCase()))}.</p></section>
    <section class="bw-card"><h4>Experience</h4>${P.history.length ? P.history.map(h => `<div class="bw-exp">${bwLogo(h.co, 44)}<div><b>${esc(h.title)}</b><span>${esc(Career.coName(h.co) || h.bizName || `${c.name}'s own company`)}</span>
        <small>${bwMonth(h.from)} – ${h.to == null ? "Present" : bwMonth(h.to)} · ${bwSpan(h.from, h.to ?? today())}</small>${h.why && h.why !== "Promoted" ? `<small class="bw-why">${esc(h.why)}</small>` : ""}</div></div>`).join("")
      : `<p class="bw-sub">No jobs yet. Every career starts somewhere.</p>`}</section>
    <section class="bw-card"><h4>Skills</h4>${skillRows(s)}</section>
    <section class="bw-card"><h4>Callings</h4>${callings.length ? `<div class="bw-tags">${callings.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : `<p class="bw-sub">None found yet.</p>`}<button class="bw-btn ghost" id="bwStars">Open constellations</button></section>
    ${s.ach.length ? `<section class="bw-card"><h4>Honors</h4>${s.ach.slice().reverse().slice(0, 8).map(a => `<div class="bw-hon"><b>${esc(a.label)}</b><small>${fmtDate(a.day)}</small></div>`).join("")}</section>` : ""}`;
}

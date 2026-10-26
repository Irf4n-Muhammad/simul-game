// ---- the phone: the creature's own phone (or the family tablet for kids). Lock screen with notifications, a home screen
// of apps, and every app opens inside it. Its look follows the phone bought in Bazaar.
let PH = null;
const PH_ICON = {
  burrow: `<b class="pi-txt" style="font-size:30px;letter-spacing:-.04em">b</b>`,
  bazaar: `<b class="pi-txt" style="font-family:'Bodoni Moda',Didot,Georgia,serif;font-weight:500;font-size:26px">B</b>`,
  stars: `<svg viewBox="0 0 24 24" width="32" height="32" fill="#FFE7A3"><path d="M12 2.5l1.9 5.6 5.9.1-4.7 3.6 1.7 5.7L12 14.1l-4.8 3.4 1.7-5.7-4.7-3.6 5.9-.1z"/><circle cx="19" cy="18" r="1.3"/><circle cx="5" cy="19" r="1"/></svg>`,
  mag: `<b class="pi-txt" style="font-family:'Bodoni Moda',Didot,Georgia,serif;font-weight:600;font-size:21px;letter-spacing:.02em">OT</b>`,
  wallet: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.3" fill="#fff"/></svg>`,
  photos: `<svg viewBox="0 0 40 40" width="40" height="40">${[["#F4B63F", 0], ["#F08A3C", 45], ["#E5534B", 90], ["#C9509E", 135], ["#8D5CC7", 180], ["#4C8EDA", 225], ["#4FB6A7", 270], ["#8BC34A", 315]].map(([c, a]) => `<ellipse cx="20" cy="11.5" rx="5" ry="8.5" fill="${c}" opacity=".85" transform="rotate(${a} 20 20)"/>`).join("")}</svg>`,
  chirp: `<svg viewBox="0 0 24 24" width="32" height="32"><path d="M5 13.5c0-4.4 3.1-8 7.3-8 3.4 0 5.9 2.3 6.4 5.3l2.3 1.2-2.4 1.1C18.1 17 15.4 19.5 11.8 19.5 7.9 19.5 5 16.9 5 13.5z" fill="#1E1B16"/><circle cx="14.6" cy="10.2" r="1.25" fill="#F5B82E"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" width="32" height="32"><path d="M4.2 12.6c.4 3.9 3.7 6.6 7.8 6.6s7.4-2.7 7.8-6.6z" fill="#fff"/><path d="M3.6 12.2c2.8-.9 5.6.6 8.4-.2 2.8.8 5.6-.7 8.4.2" fill="none" stroke="#8A3E1F" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="9.4" cy="9.4" rx="2.3" ry="2.9" fill="#FFF4E6"/><ellipse cx="14.4" cy="8.6" rx="2.5" ry="3.1" fill="#fff"/><path d="M6.5 15.6q5.5 2 11 0" fill="none" stroke="#E9B48F" stroke-width="1" stroke-linecap="round"/></svg>`,
  homes: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9H3z"/><path d="M10 20v-5h4v5"/></svg>`,
  ventures: `<svg viewBox="0 0 24 24" width="32" height="32"><path d="M4 10h16v10H4z" fill="#fff" opacity=".95"/><path d="M3 10l2-5h14l2 5z" fill="#FFD27A"/><path d="M3 10h18v1.6a2.2 2.2 0 0 1-4.5 0 2.2 2.2 0 0 1-4.5 0 2.2 2.2 0 0 1-4.5 0 2.2 2.2 0 0 1-4.5 0z" fill="#E8574A"/><rect x="10" y="14" width="4" height="6" rx=".6" fill="#2E8A66"/></svg>`,
  kindred: `<svg viewBox="0 0 24 24" width="32" height="32"><circle cx="9" cy="11" r="5" fill="#fff" opacity=".9"/><circle cx="15" cy="11" r="5" fill="#FFE1E7" opacity=".9"/><path d="M12 19.5l-1-1C8 15.8 6.3 14.2 6.3 12.4c0-1.4 1.1-2.5 2.5-2.5.8 0 1.6.4 2.1 1h.3c.5-.6 1.3-1 2.1-1 1.4 0 2.5 1.1 2.5 2.5 0 1.8-1.7 3.4-4.7 6.1z" fill="#D9466A"/></svg>`,
};
const PH_APPS = [
  { id: "chat", name: "Nest", bg: "linear-gradient(160deg,#F2A766,#C8643B)" },
  { id: "chirp", name: "Chirp", bg: "#F5B82E" },
  { id: "burrow", name: "Burrow", bg: "#1F7A6B", adult: true },
  { id: "bazaar", name: "Bazaar", bg: "#111", adult: true },
  { id: "stars", name: "Stars", bg: "linear-gradient(160deg,#1a1f4d,#04050f)" },
  { id: "calendar", name: "Calendar", bg: "#fff" },
  { id: "photos", name: "Photos", bg: "#fff" },
  { id: "wallet", name: "Wallet", bg: "#1d1d1b", adult: true },
  { id: "homes", name: "Homes", bg: "#E07A5F", adult: true },
  { id: "mag", name: "Magazine", bg: "#C8102E" },
  { id: "ventures", name: "Ventures", bg: "linear-gradient(160deg,#4CB386,#1E6B52)", adult: true },
  { id: "kindred", name: "Kindred", bg: "linear-gradient(160deg,#FF9AA8,#D9466A)", adult: true },
];
const phDayDate = d => new Date(Engine.START_DATE + d * 86400000);
const phClock = () => { const n = new Date(); return `${n.getHours()}:${String(n.getMinutes()).padStart(2, "0")}`; };
function phKind(c) {
  if (!c || !c.st || c.age(today()) < Market.MIN_AGE) return "tablet";
  return (c.st.items || []).includes("flagship") ? "flagship" : "basic";
}
function phIcon(a) {
  if (a.id === "calendar") { const d = phDayDate(today()); return `<span class="pi" style="background:#fff"><small class="pi-cal">${d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase()}</small><b class="pi-day">${d.getUTCDate()}</b></span>`; }
  return `<span class="pi${a.old ? " old" : ""}" style="background:${a.bg}">${a.html || PH_ICON[a.id] || ""}</span>`;
}
function phWall(c) {
  const ph = albumOf(c.id).slice(-1)[0];
  const col = colorOf(member(c.id) || { rupa: c.rupa });
  return ph ? `url(${ph.img}) center/cover, ${col}` : `radial-gradient(circle at 30% 20%, ${col}, transparent 60%), radial-gradient(circle at 80% 90%, #2D3A63, transparent 55%), #1b1a24`;
}
function phApps(c) { const kid = phKind(c) === "tablet", P = doorsNow(); return PH_APPS.filter(a => !(kid && a.adult) && P[a.id] !== false).concat(kid ? [] : baApps(c), kid || !globalThis.Work ? [] : wdApp(c), globalThis.Pets ? pwApp(c) : []); }
function pwApp(c) { const P = c.st && c.st.pet; return [{ id: "paws", name: "Paws", bg: PW_COL, html: `<b class="pi-txt" style="font-size:27px">${P ? Pets.KINDS[P.kind].ic : "🐾"}</b>` }]; }
function wdApp(c) { const v = Work.view(c, game.home, today()); return v ? [{ id: "ward", name: v.P.app, bg: v.P.color, html: `<b class="pi-txt" style="font-size:27px">${v.P.ic}</b>`, adult: true }] : []; }
function phBadge(id, c) {
  const day = today();
  if (id === "burrow") return Career.profile(c, game.home, day).offers.length;
  if (id.startsWith("biz:")) return baBadge(c, id.slice(4));
  if (id === "ward") return c.st.ward && c.st.ward.card ? 1 : 0;
  if (id === "paws") return c.st.pet && (c.st.pet.card || c.st.pet.lost) ? 1 : 0;
  if (id === "ventures") return (c.st.newIdeas || []).filter(o => day - o.d <= 3).length;
  if (id === "bazaar") return Market.drops(day).filter(D => !D.soon && D.left > 0 && !Market.owned(c, day).drops.includes(D.key)).length;
  if (id === "stars") return treeReady(c) ? "•" : 0;
  if (id === "calendar") return statusOf(c.id).moments.filter(m => m.day - day <= 2).length;
  if (id === "mag") return mgFresh() ? 1 : 0;
  if (id === "chirp") return chNotes(c).filter(n => n.ts > (CH.seen || 0)).length;
  if (id === "chat") { waSync(); return waThreads(c).reduce((a, T) => a + waUnread(c, T), 0); }
  if (id === "kindred") { const V = globalThis.Net ? Net.view(c) : null; return V && V.ready ? V.inbox.length : 0; }
  return 0;
}
function phNotes(c) { const P = doorsNow(); return phNotes0(c).filter(n => P[n.app] !== false); }
function phNotes0(c) {
  const day = today(), out = [];
  if (mgFresh()) {
    const I = Mag.issue(game.home, Mag.latest(day));
    out.push({ app: "mag", title: I.cover.fam ? `${I.cover.who.name} is on the cover!` : `New issue · ${I.month}`, text: I.cover.fam ? `${I.cover.kicker.charAt(0) + I.cover.kicker.slice(1).toLowerCase()}. ${I.cover.dek}` : (A => `On the cover: “${A.title}”, ${A.about}.`)(artPick(I)), go: ["issue", I.k] });
  }
  if (phKind(c) !== "tablet") {
    for (const L of Career.profile(c, game.home, day).offers) out.push({ app: "burrow", title: `${L.recruiter} · ${Career.coName(L.co)}`, text: `Hi ${c.name}! Are you open to a ${L.title} role? Would love to chat.`, go: ["jobs"] });
    const D = Market.drops(day).find(d => !d.soon && d.left > 0 && !Market.owned(c, day).drops.includes(d.key));
    if (D) out.push({ app: "bazaar", title: "Limited drop", text: `${D.label}. Only ${D.left} of ${D.made} left in Old Town.`, go: ["limited", "drop:" + D.key] });
    const S = Market.drops(day).find(d => d.soon && d.start - day <= 2);
    if (S) out.push({ app: "bazaar", title: "Coming soon", text: `${S.label} drops ${S.start - day === 1 ? "tomorrow" : `in ${S.start - day} days`}. Only ${S.made} will be made.`, go: ["limited"] });
    const post = Career.feed(c, game.home, day, 3).find(p => !p.self && p.kind !== "news");
    if (post) out.push({ app: "burrow", title: post.who, text: post.text.charAt(0).toUpperCase() + post.text.slice(1), go: ["feed"] });
    for (const o of (c.st.newIdeas || []).filter(o => day - o.d <= 3)) out.unshift({ app: "ventures", title: "New idea", text: `${c.name} is dreaming about opening ${/^[AEIOU]/.test(Venture.TPL[o.tpl].label) ? "an" : "a"} ${Venture.TPL[o.tpl].label.toLowerCase()}.` });
    if (c.st.ward && c.st.ward.card) out.unshift({ app: "ward", title: "At work", text: c.st.ward.card.t });
    if (c.st.pet && c.st.pet.card) out.unshift({ app: "paws", title: c.st.pet.name, text: c.st.pet.card.t });
    for (const w of Venture.workApps(game.home, c, day)) { const b = w.live && baBiz(w.biz); if (b && b.card && b.owner === c.id) out.unshift({ app: "biz:" + b.id, title: b.name, text: b.card.t }); }
    if (c.st.wallet < 60 && Career.canWork(c, day)) out.push({ app: "wallet", title: "Balance is low", text: `${coins(c.st.wallet)} left. Living costs ${coins(15)} a day.` });
  }
  // the two chats with the newest unread messages
  waSync();
  out.unshift(...waThreads(c).filter(T => waUnread(c, T) && waLast(T) && !waLast(T).sys).slice(0, 2).map(T => { const m = waLast(T), un = waUnread(c, T);
    return { app: "chat", title: T.name, text: (T.group ? waName(m.w) + ": " : "") + m.t + (un > 1 ? ` (+${un - 1} more)` : ""), go: ["chatt", T.id] }; }));
  for (const m of statusOf(c.id).moments.filter(m => m.day - day <= 3)) out.push({ app: "calendar", title: fmtWhen(m.day), text: m.label, moment: m.id });
  if (treeReady(c)) out.push({ app: "stars", title: "New stars to light", text: `${c.name} has enough points for a new star.` });
  if (phKind(c) !== "tablet" && globalThis.Net) { const V = Net.view(c); if (V.ready) for (const o of V.inbox) out.unshift({ app: "kindred", title: (o.card || {}).nama || "Someone", text: kdLine(o, c) }); }
  return out;
}
function showPhone(view = "lock") {
  if (!cur || !game) return;
  closeSheet();
  const c = game.home.get(cur.id); if (!c || !c.st) return;
  if (PH) PH.el.remove();
  const kind = phKind(c);
  const el = document.createElement("div"); el.className = "ph-back";
  el.innerHTML = `<div class="ph ph-${kind}" role="dialog" aria-label="${esc(c.name)}'s ${kind === "tablet" ? "tablet" : "phone"}">
    <div class="ph-screen" id="phScreen"><div class="ph-status"><span id="phTime"></span>${kind === "flagship" ? `<i class="ph-isl"></i>` : ""}<span class="ph-sig"><svg viewBox="0 0 18 12" width="17" height="11"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg viewBox="0 0 26 12" width="25" height="12"><rect x=".5" y=".5" width="22" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="${Math.max(3, Math.round(19 * Math.min(1, cur.energi != null ? cur.energi / 100 : 0.8)))}" height="8" rx="2"/><rect x="23.5" y="4" width="1.5" height="4" rx=".7" opacity=".5"/></svg></span></div>
      <div class="ph-view" id="phView"></div><button class="ph-bar" id="phBar" aria-label="Home"><i></i></button></div></div>`;
  $("app").appendChild(el);
  PH = { el, c, kind, screen: el.querySelector("#phScreen"), view: null, app: null, q: { photos: "", calendar: "", mag: "", homes: "" } };
  if (tour) tourEnd("lanjut"); coachHide(); if (state && COACH[state.tut]?.phone) { state.tut += 1; save(); }
  el.addEventListener("click", e => { if (e.target === el) closePhone(); });
  el.querySelector("#phBar").onclick = () => PH.view === "lock" ? phGo("home") : phHome();
  phSwipe(el.querySelector("#phScreen"));
  phTime(); PH.timer = setInterval(phTime, 15000);
  phGo(view);
  requestAnimationFrame(() => el.classList.add("on"));
}
function phTime() { if (!PH) return; const t = PH.el.querySelector("#phTime"); if (t) t.textContent = phClock(); const big = PH.el.querySelector(".ph-clock"); if (big) big.textContent = phClock(); }
function phSwipe(scr) {
  let y0 = null;
  scr.addEventListener("pointerdown", e => { if (e.clientY > scr.getBoundingClientRect().bottom - 70 || PH.view === "lock") y0 = e.clientY; });
  scr.addEventListener("pointerup", e => { if (y0 != null && y0 - e.clientY > 50) { PH.view === "lock" ? phGo("home") : phHome(); } y0 = null; });
}
function closePhone(instant) {
  if (!PH) return;
  const s = PH; PH = null; clearInterval(s.timer);
  if (state && state.tut < COACH.length) setTimeout(coachShow, 400);
  if (bw && s.screen.contains(bw.el)) bw = null;
  if (bz && s.screen.contains(bz.el)) bz = null;
  if (sky && s.screen.contains(sky.el)) { cancelAnimationFrame(sky.raf); sky = null; }
  if (instant) return s.el.remove();
  s.el.classList.remove("on"); setTimeout(() => s.el.remove(), 300);
}
// leave whatever app is open and show the home screen
function phHome() {
  if (!PH) return;
  for (const [ref, kill] of [[bw, () => { bw = null; }], [bz, () => { bz = null; }], [sky, () => { cancelAnimationFrame(sky.raf); sky = null; }]])
    if (ref && PH.screen.contains(ref.el)) { const e = ref.el; kill(); e.classList.remove("on"); e.classList.add("ph-leave"); setTimeout(() => e.remove(), 260); }
  phGo("home");
}
function phGo(view, arg) {
  if (!PH) return;
  PH.c = game.home.get(cur.id); PH.view = view;
  Tele.layar("hp", view);
  PH.screen.querySelectorAll(":scope > .ba-intro, :scope > .ph-q").forEach(e => e.remove()); PH.introKey = null;
  const v = PH.el.querySelector("#phView"), c = PH.c;
  PH.screen.classList.toggle("dark", view === "lock" || view === "home" || view === "photo" || view === "biz" || view === "ward" || view === "paws");
  v.className = "ph-view ph-" + view;
  if (view === "lock") v.innerHTML = phLock(c);
  else if (view === "home") v.innerHTML = phHomeScreen(c);
  else if (view === "mag" || view === "issue") v.innerHTML = (view === "mag" ? phMag : phIssue)(c, arg);
  else if (view.startsWith("chirp")) v.innerHTML = ({ chirp: phChirp, chirpp: phChirpPost, chirpu: phChirpUser, chirps: phChirpSearch, chirpn: phChirpNotes })[view](c, arg);
  else if (view === "chat" || view === "chatt") v.innerHTML = view === "chat" ? phChat(c) : phChatThread(c, arg);
  else v.innerHTML = `<div class="pa${view === "calendar" ? " gc" : view === "biz" || view === "ward" || view === "paws" ? " ba-wrap" : ""}">${({ biz: phBizApp, ward: phWard, paws: phPaws, wallet: phWallet, calendar: phCalendar, photos: phPhotos, homes: phHomes, photo: phPhoto, kindred: phKindred, ventures: phVentures, venturesm: phMarket })[view](c, arg)}</div>`;
  v.style.background = view === "lock" || view === "home" ? phWall(c) : "";
  if (view === "kindred") kdLast = v.querySelector(".pa").innerHTML;
  if (view.startsWith("ventures")) vnBind(v);
  if (view === "biz") baBind(v);
  if (view === "ward") wdBind(v);
  if (view === "paws") pwBind(v);
  phBind(v);
  if (view === "mag" || view === "issue") { mgFill(v); shotFill(v); }
  if (view === "chat" || view === "chatt") { waBind(v); mgFill(v); }
  if (view.startsWith("chirp")) { chBind(v); mgFill(v); }
  if (view === "homes") townInit().ready().then(() => { if (PH && PH.view === "homes") mgFill(v); });
  phIntroAfter(view, arg);
}
function phOpen(id, go) {
  const c = PH.c;
  if (id.startsWith("biz:")) { PH.ba = { id: id.slice(4), tab: (go && go[0]) || "ops" }; phGo("biz", PH.ba); }
  else if (id === "ward") { PH.wd = { tab: "today" }; phGo("ward", PH.wd); }
  else if (id === "paws") { PH.pw = { tab: "today" }; phGo("paws", PH.pw); }
  else if (id === "burrow") { phGo("home"); showBurrow(go ? go[0] : Career.profile(c, game.home, today()).offers.length ? "jobs" : "feed", "phone"); phIntroFor("burrow"); }
  else if (id === "bazaar") { phGo("home"); showBazaar(go ? go[0] : "new", "phone"); if (go && go[1]) bzShow(go[0], go[1]); phIntroFor("bazaar"); }
  else if (id === "stars") { phGo("home"); showTree(c.id, "phone"); phIntroFor("stars"); }
  else phGo(go ? go[0] : id, go ? go[1] : undefined);
}
function phBindIn(v) {
  v.querySelectorAll("[data-moment]").forEach(b => b.onclick = () => { const m = famStatus().moments.find(x => x.id === b.dataset.moment); closePhone(true); if (m) showMoment(m); });
  v.querySelectorAll("[data-issue]").forEach(b => b.onclick = () => phGo("issue", b.dataset.issue));
  v.querySelectorAll("[data-ph]").forEach(b => b.onclick = () => phGo("photo", b.dataset.ph));
}
function phBind(v) {
  v.querySelectorAll("[data-app]").forEach(b => b.onclick = () => phOpen(b.dataset.app));
  v.querySelectorAll("[data-later]").forEach(b => b.onclick = () => phLaterTap(b.dataset.later, v));
  v.querySelectorAll("[data-note]").forEach(b => b.onclick = () => {
    const n = phNotes(PH.c)[+b.dataset.note]; if (!n) return;
    Tele.notif("klik", n.app, +b.dataset.note);
    if (n.moment) { const m = famStatus().moments.find(x => x.id === n.moment); closePhone(true); if (m) showMoment(m); return; }
    phOpen(n.app, n.go);
  });
  v.querySelectorAll("[data-moment]").forEach(b => b.onclick = () => { const m = famStatus().moments.find(x => x.id === b.dataset.moment); closePhone(true); if (m) showMoment(m); });
  // like Google: the month in the header follows the schedule as you scroll
  const gl = v.querySelector(".pa.gc"); if (gl && !PH.gc.open && !PH.gc.find) gl.onscroll = () => {
    const t = v.querySelector(".gc-title"), y = gl.scrollTop + 110; let mo = +t.dataset.now;
    for (const el of gl.querySelectorAll("[data-mo]")) { if (el.offsetTop > y) break; mo = +el.dataset.mo; }
    t.firstChild.nodeValue = PH_MONTHS[mo] + " ";
  };
  const sb = v.querySelector(".srch input"), out = v.querySelector("[data-srch]");
  if (sb && out) sb.oninput = () => {
    const key = out.dataset.srch, q = sb.value.trim(); PH.q[key] = q;
    out.innerHTML = key === "photos" ? phPhotoGrid(PH.c, q) : key === "calendar" ? gcFound(PH.c, q) : !q ? "" : key === "homes" ? hmFound(PH.c, q) : mgFound(q);
    Tele.cari(key, q, srchN);
    const main = v.querySelector(".mg-main, .hm-main"); if (main) main.hidden = !!q;
    phBindIn(out);
  };
  v.querySelectorAll("[data-gcfind]").forEach(b => b.onclick = () => { PH.gc.find = !PH.gc.find; PH.gc.open = false; PH.q.calendar = ""; phGo("calendar"); if (PH.gc.find) PH.el.querySelector(".gc-srch input").focus(); });
  v.querySelectorAll("[data-gcopen]").forEach(b => b.onclick = () => { PH.gc.open = !PH.gc.open; const d = phDayDate(today()); PH.gc.ym = [d.getUTCFullYear(), d.getUTCMonth()]; phGo("calendar"); });
  v.querySelectorAll("[data-gcmon]").forEach(b => b.onclick = () => { let [y, m] = PH.gc.ym; m += +b.dataset.gcmon; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } PH.gc.ym = [y, m]; phGo("calendar"); });
  v.querySelectorAll("[data-gcday]").forEach(b => b.onclick = () => { const x = +b.dataset.gcday; PH.gc.open = false; phGo("calendar"); gcJump(x); });
  v.querySelectorAll("[data-gctoday]").forEach(b => b.onclick = () => { PH.gc.open = false; phGo("calendar"); });
  v.querySelectorAll("[data-issue]").forEach(b => b.onclick = () => phGo("issue", b.dataset.issue));
  v.querySelectorAll("[data-ph]").forEach(b => b.onclick = () => phGo("photo", b.dataset.ph));
  v.querySelectorAll("[data-back]").forEach(b => b.onclick = () => phGo(b.dataset.back));
  v.querySelectorAll("[data-lot]").forEach(b => b.onclick = async () => { closePhone(true); await enterTown(); TOWN.focusHood(b.dataset.lot); say("Tap an empty lot to build."); });
  v.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { if (game.act(selected, "beli:" + b.dataset.buy)) { save(); refresh(); burst(["★"], 6, "#D4A853"); say("Ooh, fancy!"); phGo("homes"); } });
  const u = v.querySelector(".ph-unlock"); if (u) u.onclick = () => phGo("home");
  v.querySelectorAll("[data-kd]").forEach(b => b.onclick = () => kdDo(b.dataset.kd, b));
}
function phLock(c) {
  const d = phDayDate(today()), notes = phNotes(c);
  if (notes.length) Tele.notif("tampil", notes.slice(0, 5).map(n => n.app).join(","));
  const app = id => PH_APPS.find(a => a.id === id);
  return `<div class="ph-lock"><small class="ph-date">${d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</small><b class="ph-clock">${phClock()}</b>
    <div class="ph-notes">${notes.slice(0, 5).map((n, i) => `<button class="ph-note" data-note="${i}"><span class="ph-note-ic">${phIcon(app(n.app))}</span><span class="ph-note-t"><span><b>${esc(n.title)}</b><small>${esc(app(n.app).name)}</small></span><span>${esc(n.text)}</span></span></button>`).join("")}
      ${notes.length > 5 ? `<small class="ph-more">${notes.length - 5} more</small>` : notes.length ? "" : `<small class="ph-more">No notifications</small>`}</div>
    <button class="ph-unlock">Swipe up to open</button></div>`;
}
function phHomeScreen(c) {
  const s = statusOf(c.id), P = Career.profile(c, game.home, today()), kid = phKind(c) === "tablet", later = phLater(c);
  phLaterSeen(later);
  return `<div class="ph-home"><div class="ph-widget"><span class="ph-face" style="background:${colorOf(cur)}">${esc(c.name[0])}</span><span><b>${esc(c.name)}</b><small>${esc(kid ? (PHASE_EN[cur.fase] || "") + " · " + fmtAge(cur.umur) : P.headline)}</small>${kid ? "" : `<small>${coins(s.wallet)}</small>`}</span></div>
    <div class="ph-grid">${phApps(c).map(a => { const n = phBadge(a.id, c); return `<button class="ph-app" data-app="${a.id}">${phIcon(a)}${n ? `<i class="ph-badge">${n}</i>` : ""}<span>${a.name}</span></button>`; }).join("")}</div>
    ${later.length ? `<div class="ph-later"><small class="ph-later-h">Later</small><div class="ph-grid">${later.map(a => `<button class="ph-app locked" data-later="${a.id}" aria-label="${esc(a.name)} opens ${esc(phLaterWhen(a.day))}">${phIcon(a)}<span>${a.name}</span><small>${esc(phLaterWhen(a.day))}</small></button>`).join("")}</div></div>` : ""}
    ${kid ? `<p class="ph-kid">Family tablet. ${esc(c.name)} gets a phone of their own in the teen years.</p>` : ""}</div>`;
}
const phHead = (title, sub = "") => `<header class="pa-head"><h1>${esc(title)}</h1>${sub ? `<small>${sub}</small>` : ""}</header>`;

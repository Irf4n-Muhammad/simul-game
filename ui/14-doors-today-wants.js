// ================================================================ v43: doors, the Today line, door tours, wants
// Pintu (wants.js): fitur muncul lewat cerita, satu per hari di minggu pertama. Yang belum terbuka disembunyikan, bukan dikunci.
const doorsNow = () => game ? Wants.doors(game.home, today(), !!(state && state.dev_pintu)) : {};
function drawDoors() {
  const P = doorsNow();
  $("diceBtn").hidden = !P.dadu; $("planBtn").hidden = !P.plan; $("townBtn").hidden = !P.town;
}
// ---- the Today line: one sentence about what matters right now, in a fixed order. Computed from the state every time, never saved.
let todayKey = null, todayCache = null;
const twSeen = new Set();
function todayLine() {
  // Keputusan ada di today.js (Today.line, bisa diuji di Node); di sini hanya potret keadaan + pemetaan kunci aksi -> fungsi layar.
  if (!cur || !game) return null;
  const d = today();
  const L = Today.line({
    cur, pending: game.pending, feed, d,
    fokus: focusView(),
    balik: balikView,
    doors: doorsNow,
    care: () => canCare() ? careView() : null,
    next: nextMoment,
    wants: () => { const c = game.home.get(cur.id); return c ? Wants.active(c, d, game.home) : []; },
    fmtWhen, nameOf,
  });
  if (!L || !L.go) return L;
  const GO = {
    dilema: () => showDilemma,
    fokus: () => showFocus,
    balik: () => showBalik,
    tur: () => () => tourStart(L.id, true),
    diary: () => showDiary,
    rawat: () => () => { const b = $("careStrip").querySelector(`[data-care="${L.id}"]`); if (b) b.click(); },
    momen: () => () => showMoment(L.m),
    profil: () => () => showProfile(cur.id),
  };
  return { ...L, go: GO[L.go]() };
}
function drawToday() {
  const el = $("today"); if (!el || !state) return;
  const L = state.tut < COACH.length || (TOWN && TOWN.on) ? null : todayLine();
  el.hidden = !L;
  if (!L) { todayKey = null; todayCache = null; return; }
  if (L.k !== todayKey) {
    todayKey = L.k; $("todayIc").textContent = L.ic || ""; $("todayTx").textContent = L.tx;
    el.classList.toggle("new", !!L.now); el.classList.toggle("quiet", !!L.quiet);
    Tele.ev("today", { k: L.k.split(":")[0], a: "tampil" });
  }
  todayCache = L;
}
$("today").onclick = () => { const L = todayCache; if (!L || !L.go) return; Tele.ev("today", { k: L.k.split(":")[0], a: "ketuk" }); hideHint(); L.go(); };

// ---- door tours: one to three coach bubbles the first time a door opens. Skippable; the "?" on a sheet, in town, or on the phone replays one.
const TOURS = {
  dadu: { el: () => $("diceBtn"), steps: n => [`This is the <b>die</b>. Roll it once a day. A high roll helps on ${n}'s big days.`, `Keep up to two good rolls for a day that matters. Luck can't be bought, and there's no second roll.`] },
  plan: { el: () => $("planBtn"), steps: n => [`The <b>daily plan</b>. Pick what ${n}'s days look like, or let them choose.`, `They get bored of the same thing after five days. The older they get, the more they decide on their own.`] },
  town: { el: () => (TOWN && TOWN.on) ? $("homeBtn") : $("townBtn"), steps: n => [`The <b>town</b>. Walk the street and tap a place to look inside.`, `A few places are open now. More open as the town grows, and ${n} will have reasons to go.`] },
  chirp: { el: () => $("lifeBtn"), steps: n => [`<b>Chirp</b> is on the phone now: the town's feed. Neighbours, news, and one day ${n}'s own posts.`] },
  stars: { el: () => $("lifeBtn"), steps: n => [`<b>Stars</b> is on the phone: ${n}'s talents, drawn as constellations.`, `Points come from what ${n} actually does. You choose which star to light next.`] },
  mag: { el: () => $("lifeBtn"), steps: () => [`The <b>Magazine</b> is on the phone: a new issue every month about the town, and sometimes about your family.`] },
  // v46: app School (anak.js): pintu umur 60, kartu intro di app, "?" di app
  school: { el: () => $("lifeBtn"), steps: n => [`<b>School</b> is on the tablet now: ${n}'s timetable, quizzes and report cards. The dates are the same for every creature born the same week.`, `The dates are set; the marks aren't. A study evening before a quiz still counts, and so does who ${n} sits next to.`] },
  burrow: { el: () => $("lifeBtn"), steps: n => [`${n} has a phone of their own now. <b>Burrow</b> is where the town's jobs are: a profile, offers, and news from people they know.`, `You can suggest a job. ${n} decides whether to apply.`] },
  bazaar: { el: () => $("lifeBtn"), steps: n => [`The <b>Bazaar</b> is open on the phone: things to buy, new and second-hand, and limited drops.`, `It's ${n}'s money. You can suggest; they can say no.`] },
  // v44.1: bukan pintu, tapi tur yang sama: baris Soon/Someday (muncul sendiri saat barisnya pertama tampil, diulang lewat "?" di lembar What's ahead)
  fokus: { el: () => $("planBtn"), steps: n => [`<b>Focus together</b> is in the daily plan now: ${FOCUS_MIN} minutes, your work next to ${n}'s. Put the phone down; ${n} stays on screen.`, `Finish the clock before a quiz and it counts as a study evening, the same as the Study button. No quiz? Then it's just company.`] },
  balik: { el: () => $("today"), steps: n => [`Once a week ${n} turns it around and asks about <b>you</b>. One tap to answer, nothing to get right.`, `It's not for points. ${n} just wants to know, and reacts the way ${n} would. Your answers stay on this phone.`] },
  cuaca: { el: () => null, steps: n => [`The sky in the window follows the real weather where you are. Rain outside, rain over Old Town.`, `It's only the sky: nothing in ${n}'s life changes with it. Change or turn it off in <b>Family → Sky & weather</b>.`] },
  ahead: { el: () => $("soon").hidden ? $("someday") : $("soon"), steps: n => [`<b>Soon</b> is what ${n}'s family is counting the days to: a quiz, a review, a birthday. Those are real days on your calendar.`, `A dotted line is a <i>maybe</i>: the day is set, getting it is not. <b>Someday</b> is a hope with no date yet. Tap either line to see everything ahead.`] },
  // v45: tonggak bayi (tonggak.js): muncul sendiri saat baris Soon pertama kali menampilkan tonggak; diulang lewat "?" di profil bayi
  tonggak: { el: () => $("soon"), steps: n => [`<b>Growing up</b>: ${cur && cur.fase === "anak" ? `${n}'s first wobbly tooth, first bike ride, first sleepover` : `${n}'s first tooth, first word, first steps`}. Each one comes inside a window that is ${n}'s alone, so no two creatures match.`, `"Any day now" means the window is open. Nothing you do hurries it, and it can't be missed: it lands in the diary and on ${n}'s page.`] },
  // v45.1: watak kebaca (tonggak.js): muncul sendiri saat baris Today pertama kali menampilkan pengamatan watak; diulang lewat "?" di kartu profil
  watak: { el: () => (todayCache && /^momen:watak_/.test(todayCache.k)) ? $("today") : $("diaryBtn"), steps: n => [`<b>Getting to know ${n}</b>: six small things over the first weeks that say who ${n} is.${tour && tour.ulang ? "" : " The first one just happened; it's in the diary."}`, `Each one goes on ${n}'s page. It's not something you choose, it's something you get to know, and it will matter when ${n} starts saying no.`] },
};
const TOUR_VIS = { burrow: () => cur && phKind(game.home.get(cur.id)) !== "tablet", bazaar: () => cur && phKind(game.home.get(cur.id)) !== "tablet" };
let tour = null;
function tourMaybe() {
  if (!state || !game || !cur || tour || sheetKind || PH || (TOWN && TOWN.on) || $("townBtn").disabled || coachEl || state.tut < COACH.length || game.pending) return;
  if (cur.fase === "meninggal" || cur.fase === "merantau") return;
  const P = doorsNow(), T = (state.tur_pintu ||= {});
  for (const D of Wants.DOORS) if (P[D.id] && !T[D.id] && TOURS[D.id] && (!TOUR_VIS[D.id] || TOUR_VIS[D.id]())) { tourStart(D.id, false); return; }
}
function tourStart(id, ulang) {
  const T = TOURS[id]; if (!T || !cur) return;
  if (sheetKind) closeSheet(); if (PH) closePhone(true); coachHide();
  tour = { id, i: 0, ulang: !!ulang };
  Tele.intro("pintu", id, ulang ? "ulang" : "tampil");
  tourShow();
}
function tourShow() {
  if (!tour || !cur) { coachHide(); return; }
  const T = TOURS[tour.id], steps = T.steps(esc(cur.nama)), target = T.el(), last = tour.i >= steps.length - 1;
  hideHint(); coachMake();
  coachEl.innerHTML = `<div class="bub">${steps[tour.i]}<div class="row2"><small>${steps.length > 1 ? `${tour.i + 1} of ${steps.length}` : ""}</small><span>${last ? "" : `<button class="skip" data-c="skip">Skip</button>`}<button data-c="ok">${last ? "Got it" : "Next"}</button></span></div></div>`;
  coachEl.querySelectorAll("[data-c]").forEach(b => b.onclick = e => { if (e.target.dataset.c === "skip") return tourEnd("lewat"); if (last) return tourEnd("lanjut"); tour.i += 1; tourShow(); });
  coachPlace(target);
}
function tourEnd(how) {
  if (!tour) return;
  Tele.intro("pintu", tour.id, how);
  (state.tur_pintu ||= {})[tour.id] = 1; save();
  tour = null; coachHide();
}
const SHEET_TOUR = { plan: "plan", dice: "dadu", ahead: "ahead", fokus: "fokus", sky: "cuaca", balik: "balik" };
function sheetQ(kind, force) {
  const id = force || SHEET_TOUR[kind]; if (!id || !TOURS[id]) return;
  const old = sheet.querySelector(".card > .qmark"); if (old) old.remove();
  const b = document.createElement("button"); b.className = "qmark"; b.textContent = "?"; b.setAttribute("aria-label", "How this works");
  b.onclick = () => tourStart(id, true);
  const card = sheet.querySelector(".card"); if (card) card.appendChild(b);
}
$("townQ").onclick = () => tourStart("town", true);

// ---- phone: intro cards for the apps that open through a door, and the "?" that replays whichever card this screen has
const PH_INTRO = {
  chirp: n => [["🐦", "Chirp", "The town's feed. Neighbours post here, and news lands here first."], ["💬", "Your family too", `One day ${n} will post here. What they say is up to them.`]],
  stars: n => [["✨", "Stars", `${n}'s talents, drawn as constellations.`], ["🔭", "Light one up", `Points come from what ${n} actually does. Tap a star next to a lit one to light it.`]],
  mag: () => [["📰", "The Magazine", "A new issue every month: the town, its people, and sometimes your family."]],
  burrow: n => [["🐾", "Burrow", `The town's work network: a profile, job offers, and news from people ${n} knows.`], ["🤝", "You suggest, they decide", `Point ${n} at a job. They apply if they like it.`]],
  bazaar: n => [["🛍️", "The Bazaar", "New things, second-hand finds and limited drops."], ["🪙", "Their money", `It's ${n}'s wallet. Suggest a buy; they can say no.`]],  // v45: rak "Later" di layar depan tablet/HP (ui/35-tonggak.js)
  later: n => [["🔒", "Later", `The grey apps open when ${n} is older. The day is written under each one. Nothing to buy, just time.`]],
  // v46: app School (anak.js)
  school: n => [["🏫", "School", `${n}'s timetable for the year: quizzes, report cards, a week off, the school show. The same days for every creature born the same week.`], ["📝", "What's not written", `The dates are set. The marks, the friends and the teacher's note are up to ${n}, and a little to you: study evenings count.`]],
};
const PH_INTRO_COL = { chirp: ["#D99A12", "#FFF1CC"], stars: ["#2B3270", "#E6E8F5"], mag: ["#C8102E", "#FBE3E6"], burrow: ["#1F7A6B", "#DDF0EC"], bazaar: ["#222", "#ECECEC"], later: ["#5B5650", "#ECE9E4"], school: ["#3B7DD8", "#DCE8F8"] };
function phIntroFor(id) {
  if (!PH || !PH_INTRO[id]) return;
  const html = baIntro(id, PH_INTRO[id](cur ? cur.nama : "they"));
  if (html) { const tmp = document.createElement("div"); tmp.innerHTML = html; baIntroBind(tmp); const [col, soft] = PH_INTRO_COL[id] || ["#C2704F", "#F6E8E0"]; PH.screen.querySelectorAll(":scope > .ba-intro").forEach(e => { e.style.zIndex = 97; e.style.setProperty("--ba", col); e.style.setProperty("--ba-soft", soft); }); }
  phQ(id, () => phIntroFor(id));
}
function phIntroAfter(view, arg) {
  if (!PH) return;
  if (view === "chirp" || view === "mag" || view === "school") return phIntroFor(view);
  if (view === "home" && PH.el.querySelector(".ph-later")) return phIntroFor("later");
  if (PH.introKey) phQ(PH.introKey, () => phGo(view, arg));
}
const PH_Q_TOP = { stars: 108, mag: 84, burrow: 5, bazaar: 6, later: 70, school: 84 };
function phQ(k, again) {
  if (!PH) return;
  PH.screen.querySelectorAll(":scope > .ph-q").forEach(e => e.remove());
  const b = document.createElement("button"); b.className = "ph-q"; b.textContent = "?"; b.setAttribute("aria-label", "How this app works");
  if (PH_Q_TOP[k] != null) b.style.top = PH_Q_TOP[k] + "px";
  b.onclick = () => { try { localStorage.removeItem("intro:" + k); } catch (e) {} Tele.intro("app", k, "ulang"); again(); };
  PH.screen.appendChild(b);
}

// ---- wants: what the creature is asking for. The list in the profile, and a thought bubble above their head in the room.
function wantsBox(id, here) {
  const c = game.home.get(id); if (!c) return "";
  const W = here ? Wants.active(c, today(), game.home) : [], done = Wants.doneCount(c), cita = c.info.cita;
  if (!W.length && !done && !cita) return "";
  return `<div class="fieldset"><span class="lbl">Wants</span>
    ${W.length ? `<div class="list">${W.map(w => `<div class="line"><i class="want-ic">${w.ic}</i><span class="grow"><b>${esc(w.label)}</b><small class="sub">${w.days ? `Since ${w.days} day${w.days > 1 ? "s" : ""} ago.` : "Since today."}${w.besar ? " A big one." : ""}</small></span></div>`).join("")}</div>` : here ? `<span class="sub">Nothing in particular right now.</span>` : ""}
    ${cita ? `<span class="sub">Dream: ${esc(cita)}.</span>` : ""}${done ? `<span class="sub">${done} wish${done > 1 ? "es" : ""} come true so far.</span>` : ""}</div>`;
}
let bubbleKey = null;
function bubbleSync() {
  if (!K || !cur || !game) return;
  const gone = cur.fase === "meninggal" || cur.fase === "merantau", c = game.home.get(cur.id);
  const w = !gone && c ? Wants.active(c, today(), game.home)[0] : null, key = w ? w.id : null;
  if (key === bubbleKey && !!K.bubble === !!w) return;
  if (K.bubble) { K.root.remove(K.bubble); K.bubble.material.map.dispose(); K.bubble.material.dispose(); K.bubble = null; }
  bubbleKey = key;
  if (!w) return;
  const tex = canvasTex((g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(255,253,248,.97)"; g.strokeStyle = "rgba(60,40,20,.14)"; g.lineWidth = 4;
    const bump = (x, y, r, stroke = true) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); if (stroke) g.stroke(); };
    bump(W * 0.36, H * 0.26, W * 0.2); bump(W * 0.64, H * 0.24, W * 0.21); bump(W * 0.24, H * 0.5, W * 0.17); bump(W * 0.76, H * 0.5, W * 0.17); bump(W * 0.5, H * 0.56, W * 0.26);
    g.beginPath(); g.ellipse(W / 2, H * 0.42, W * 0.36, H * 0.26, 0, 0, Math.PI * 2); g.fill();
    bump(W * 0.36, H * 0.26, W * 0.18, false); bump(W * 0.64, H * 0.24, W * 0.19, false); bump(W * 0.5, H * 0.56, W * 0.24, false);
    bump(W * 0.2, H * 0.84, W * 0.055); bump(W * 0.11, H * 0.93, W * 0.032);
    g.font = `${Math.round(H * 0.36)}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#2E2A26"; g.fillText(w.ic, W / 2, H * 0.44);
  }, 256, 256);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  sp.scale.set(1.3, 1.3, 1); sp.position.set(1.0, 3.4, 0.3); sp.renderOrder = 20;
  K.root.add(sp); K.bubble = sp;
}

$("diceBtn").onclick = () => { if (game) rollDice(); };
$("momentPill").onclick = () => { const m = game && nextMoment(); if (m) showMoment(m); };
$("lifeBtn").onclick = () => { hideHint(); if (game) showPhone(); };


// ---- Ward: the nurse's work app
let WD_DEMO = null;
function wdDemo(job = "nurse") {
  const c = game.home.get(cur.id), cc = Work.demo(game.home, c, today(), job);
  if (!cc || !cc.st.ward) return kdToast("Grown-ups only.");
  WD_DEMO = cc; PH.wd = { tab: "today", demo: true }; phGo("ward", PH.wd);
}
const wdRel = r => r >= 70 ? "Close" : r >= 50 ? "Good" : r >= 30 ? "Cool" : "Tense";
const WD_ROLE = { mentor: ["Mentor", "Teaches the tricks. Good to ask on hard cases."], rival: ["Rival", "Competes for credit with the boss."], friend: ["Work friend", "Covers shifts and speaks up for them."] };
function phWard(c, arg) {
  const demo = arg && arg.demo, cc = demo ? WD_DEMO : c, day = demo && cc ? cc.vday : today();
  const v = cc && globalThis.Work ? Work.view(cc, game.home, day) : null;
  if (!v) return phHead("Work", "Not available");
  const P = v.P, jl = Status.JOBS[v.job].label.toLowerCase();
  const tabs = [["today", "Today"], ["team", "Team"], ["career", "Career"]], tab = tabs.some(x => x[0] === (arg && arg.tab)) ? arg.tab : "today";
  const body = { today: wdToday, team: wdTeam, career: wdCareer }[tab](cc, v, day);
  return `<div class="ba" style="--ba:${P.color};--ba-soft:${P.soft}">
    <header class="ba-head">${demo ? `<button class="ba-x" data-vn-demo="1" aria-label="Back">‹</button>` : ""}<span class="ba-ic">${P.ic}</span><span class="pa-grow"><b>${esc(v.co)}</b><small>${demo ? `Test mode · sample ${esc(jl)}` : `${esc(P.app)} · ${esc(v.title)}`}</small></span>${demo ? `<button class="ba-next" data-wd="next">Next day ›</button>` : ""}</header>
    <div class="ba-body">${body}</div>
    <nav class="ba-tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? "on" : ""}" data-wd="tab:${k}">${esc(l)}</button>`).join("")}</nav>
    ${baIntro("work-" + v.job, [[P.ic, `${cc.name} is ${/^[aeiou]/i.test(jl) ? "an" : "a"} ${jl} at ${v.co}`, P.intro[0]],
      ["📋", "Today shows the shift", `${P.intro[1].replace("{n}", cc.name)} Your advice changes tomorrow, not today.`],
      ["🎯", "Grades lead to promotions", "Every 30 days the boss gives a grade from A to D. Good grades mean raises and an easier promotion review. Three warnings and they're let go."]])}</div>`;
}
function wdToday(c, v, day) {
  const L = v.lastShift, Td = v.today || {}, n = c.name, P = v.P, S = P.shift, sk = Object.keys(S);
  const incTxt = k => k ? `${k} ${P.inc}${k > 1 ? "s" : ""}` : `no ${P.inc}s`;
  let hero;
  if (!Td.work && Td.d === day) hero = `<div class="ba-hero"><small class="ba-lbl">Today</small><b>${Td.why === "burnout" ? `${esc(n)} is home recovering from burnout.` : Td.why === "leave" ? `${esc(n)} took the day off.` : `Day off.`}</b><small>Stress is down to ${Td.stress}.${L ? ` Last shift: ${L.sat} ${P.metricShort}, ${incTxt(L.inc)}.` : ""}</small></div>`;
  else if (L) hero = `<div class="ba-hero"><small class="ba-lbl">${L.d === day ? "Today's shift" : "Last shift"}${v.shift !== sk[0] ? " · " + esc(S[v.shift][0].toLowerCase()) : ""}</small><b>${L.served != null ? `${L.served} ${P.count[0]}, ${incTxt(L.inc)}.` : `${L.n} ${P.items.toLowerCase()}, ${incTxt(L.inc)}.`}</b>
      <small>${L.disc.length ? `${esc(L.disc.length > 2 ? L.disc.slice(0, -1).join(", ") + " and " + L.disc[L.disc.length - 1] : L.disc.join(" and "))} ${P.doneVerb} today.` : `Nothing ${P.doneVerb} yet today.`}${L.inc ? ` ${esc(P.incLine(L.incP[0]))}` : ""}${L.note ? " " + esc(L.note) : ""}</small></div>`;
  else hero = `<div class="ba-hero"><b>The first shift is tomorrow.</b></div>`;
  const kp = baKpis([[P.metric, L ? L.sat : "—", L && L.sat >= 80 ? "up" : L && L.sat < 60 ? "down" : ""], ["Stress", Math.round(v.stress), v.stress >= 70 ? "down" : ""], [P.qual, v.prev.now.q]]);
  let att = "";
  if (v.card) att = baCard(v.card.t, v.card.o, "card", n).replace(/data-ba=/g, "data-wd=");
  else if (v.burn > day) att = baResult("Burnout", `${n} needs ${v.burn - day} more day${v.burn - day > 1 ? "s" : ""} at home. Lighter shifts and less overtime help stop it happening again.`, false);
  else if (v.cardLast && day - v.cardLast.d <= 2) att = baResult(v.cardLast.by === "you" ? "You decided" : v.cardLast.by === "ward" || v.cardLast.by === "work" ? "At work" : `${n} decided`, v.cardLast.t, v.cardLast.good);
  else if (v.stress >= 75) att = baResult("Warning", `${n} is very stressed. Above 90 they burn out and miss five days. Try fewer hours or a day off.`, false);
  const wg = v.weekGoal;
  const goal = wg ? `<div class="vn-card"><div class="vn-row"><span>This week: <b>${esc(wg.label)}</b></span><small>day ${wg.day + 1} of 7</small></div>
      ${wg.k === "safe" ? `<p class="vn-fact">${wg.prog ? `<span class="warn">${incTxt(wg.prog)} already.</span> Missed this week.` : `No ${P.inc}s so far. Keep it up.`}</p>`
      : wg.k === "happy" ? `<div class="vn-meter"><span>Average</span>${vnBar((wg.prog || 0) / 100, "var(--ba)")}<small>${wg.prog ?? "—"} / 80</small></div>`
      : `<div class="vn-meter"><span>${esc(P.doneLbl)}</span>${vnBar(wg.prog / Math.max(1, wg.need), "var(--ba)")}<small>${wg.prog} / ${wg.need}</small></div>`}<p class="vn-fact">Hitting it makes the boss happier, which lifts the monthly grade.</p></div>` : "";
  const pts = `<h4 class="pa-h">${esc(P.items)}</h4><div class="pa-list">${v.pts.map(p => `<div class="pa-row"><span class="wd-sev">${"●".repeat(p.sev)}${"○".repeat(3 - p.sev)}</span><span class="pa-grow"><b>${esc(p.name)}</b><small>${esc(p.cond)} · ${p.sat >= 75 ? "going well" : p.sat >= 55 ? "okay" : "going badly"}</small>${vnBar(p.hp / 100, "var(--ba)")}</span><small class="wd-rec">${Math.round(p.hp)}%</small></div>`).join("") || `<div class="pa-row">Nothing on the list right now.</div>`}</div>
    <p class="ba-note">${v.job === "nurse" ? "Dots show how serious it is. The bar is recovery. At 100% they go home." : `Dots show how hard it is. The bar is progress. At 100% it's ${P.doneVerb}.`}</p>`;
  const Pv = v.prev, ql = P.qual.toLowerCase(), eff = (o, pay) => `${pay ? `+${vnCoins(pay)} coins a shift · ` : ""}${ql} ${o.q} · stress ${o.s >= 0 ? "+" : ""}${o.s}/day`;
  const adv = `<h4 class="pa-h">Your advice</h4><div class="vn-card"><small class="ba-lbl">${P.where ? "Where" : "Shift"}</small>
      ${sk.map(k => baOpt("shift:" + k, S[k][0], eff(Pv.shift[k], Pv.shift[k].pay) + (S[k][1] ? " · " + S[k][1] : ""), v.shift === k)).join("")}
      <small class="ba-lbl" style="margin-top:12px">Overtime</small>
      ${baOpt("ot:never", "Go home on time", eff(Pv.ot.never, 0), v.ot === "never")}${baOpt("ot:some", "Stay late sometimes", eff(Pv.ot.some, Pv.ot.some.pay), v.ot === "some")}${baOpt("ot:always", "Always stay late", eff(Pv.ot.always, Pv.ot.always.pay) + " · misses family time", v.ot === "always")}
      <small class="ba-lbl" style="margin-top:12px">How they work</small>
      ${baOpt("style:book", P.style.book[0], eff(Pv.style.book, 0) + (P.style.book[1] ? " · " + P.style.book[1] : ""), v.style === "book")}${baOpt("style:extra", P.style.extra[0], eff(Pv.style.extra, 0) + " · " + P.style.extra[1], v.style === "extra")}
      <span class="vn-btns" style="margin-top:10px"><button data-wd="rest" ${v.restOk && v.tomorrow ? "" : "disabled"}>Take tomorrow off</button></span><p class="vn-fact">Stress −9 and the boss minds a little. Once every two weeks.</p>
      <p class="ba-note">You suggest, ${esc(n)} decides. Changes start tomorrow.</p></div>`;
  const wk = `<h4 class="pa-h">Next 7 days</h4><div class="wd-week">${v.offNext.map((off, i) => `<span class="${off ? "off" : ""}"><small>${i ? fmtDate(day + i).split(" ")[0] : "Today"}</small><b>${off ? "Off" : (S[v.shift] || S[sk[0]])[3]}</b></span>`).join("")}</div>`;
  return hero + kp + att + goal + pts + adv + wk;
}
function wdTeam(c, v) {
  const row = (name, role, desc, rel) => `<div class="pa-row ba-person"><span class="ba-face" style="background:${bwHue(name)}">${esc(name[0])}</span><span class="pa-grow"><b>${esc(name)}</b><small>${esc(role)} · ${esc(desc)}</small>${vnBar(rel / 100, rel >= 50 ? "var(--ba)" : "#E07A5F")}</span><small class="wd-rec">${wdRel(rel)}</small></div>`;
  return `<div class="ba-hero"><b>${esc(c.name)} gets on ${v.boss.rel >= 60 ? "well" : v.boss.rel >= 40 ? "okay" : "badly"} with the boss.</b><small>The boss's mood feeds the monthly grade. Colleagues change how hard cases, shift swaps and office politics go.</small></div>
    <h4 class="pa-h">Boss</h4><div class="pa-list">${row(v.boss.name, v.P.bossRole, "Hands out grades and warnings.", v.boss.rel)}</div>
    <h4 class="pa-h">Colleagues</h4><div class="pa-list">${v.mates.map(m => row(m.name, WD_ROLE[m.role][0], WD_ROLE[m.role][1], m.rel)).join("")}</div>`;
}
function wdCareer(c, v, day) {
  const g = v.lastGrade, rv = v.review, adj = { A: -8, B: -3, C: 0, D: 6 };
  const ladder = `<div class="vn-card"><div class="ba-ladder">${v.ladder.map((x, i) => `<span class="${i < v.level ? "done" : i === v.level ? "on" : ""}"><i></i>${esc(x)}</span>`).join("")}</div>
    ${v.next ? `<p class="vn-fact">${rv ? `Promotion review for <b>${esc(v.next)}</b> on ${fmtDate(rv.day)}.` : `Next step: ${esc(v.next)}.`} ${g ? `The last grade (${g.g}) makes it ${adj[g.g] < 0 ? `${-adj[g.g]} points easier` : adj[g.g] > 0 ? `${adj[g.g]} points harder` : "no easier or harder"}.` : "Monthly grades will make the review easier or harder."}${v.certs.length ? ` Each certificate helps too.` : ""}</p>` : `<p class="vn-fact">The top of the ladder.</p>`}</div>`;
  const month = `<h4 class="pa-h">This month · day ${v.monthDay + 1} of 30</h4>${baKpis([[v.P.metric, v.monthAvg ?? "—"], [v.P.inc.charAt(0).toUpperCase() + v.P.inc.slice(1) + "s", v.monthInc, v.monthInc ? "down" : "up"], [v.P.doneLbl, v.monthDisc]])}
    <div class="vn-card"><div class="vn-row"><span>Weekly goals hit</span><b>${v.monthHits}</b></div><div class="vn-row"><span>Warnings</span><b class="${v.warn ? "down" : ""}">${v.warn} of 3</b></div>
    <p class="vn-fact">The grade comes from ${esc(v.P.gradeFrom)}.</p></div>`;
  const grades = `<h4 class="pa-h">Grades</h4><div class="vn-card">${v.grades.length ? `<div class="wd-grades">${v.grades.map(o => `<span class="g${o.g}"><b>${o.g}</b><small>${fmtDate(o.d).split(" ").slice(0, 2).join(" ")}</small></span>`).join("")}</div>` : `<p class="vn-fact">The first grade comes after 30 days.</p>`}
    <p class="vn-fact">A: 8% raise. B: 3% raise. C: nothing. D: a warning.</p></div>`;
  const pay = `<h4 class="pa-h">Pay and skills</h4><div class="vn-card"><div class="vn-row"><span>Pay per day</span><b>${vnCoins(v.pay)}</b></div>${v.raisePct ? `<div class="vn-row"><span>From raises</span><b class="up">+${v.raisePct}%</b></div>` : ""}
    <div class="vn-row"><span>Certificates</span><b>${v.certsV.length ? esc(v.certsV.join(", ")) : "None yet"}</b></div>${v.studyV ? `<div class="vn-row"><span>Studying ${esc(v.studyV.label)}</span><b>${v.studyV.left} evenings left</b></div>` : ""}
    <div class="vn-meter"><span>Reputation</span>${vnBar(v.rep / 100, "#F5B82E")}<small>${v.rep}</small></div><p class="vn-fact">${esc(v.P.repNote)}</p></div>`;
  return ladder + month + grades + pay;
}
function wdBind(v) {
  v.querySelectorAll("[data-wd]").forEach(el => el.onclick = () => wdDo(el.dataset.wd));
  v.querySelectorAll("[data-vn-demo]").forEach(el => el.onclick = () => phGo("ventures"));
  baIntroBind(v);
}
function wdDo(cmd) {
  const A = PH.wd || {}, [op, arg] = cmd.split(":"), keep = () => { const sc = PH.el.querySelector("#phView .pa")?.scrollTop || 0; phGo("ward", PH.wd); const bd = PH.el.querySelector("#phView .pa"); if (bd) bd.scrollTop = sc; };
  if (op === "tab") { PH.wd = { ...A, tab: arg }; phGo("ward", PH.wd); return; }
  if (A.demo) {
    if (op === "next") { Work.demoNext(game.home, WD_DEMO); PH.wd = { ...A, tab: "today" }; phGo("ward", PH.wd); return kdToast("A day passes at work."); }
    const ok = Work.demoAct(game.home, WD_DEMO, op, arg); keep();
    return kdToast(ok ? "Test mode: applied. Tap Next day to see what happens." : "Nothing changed.");
  }
  const c = game.home.get(cur.id), kind = arg != null ? `kerja:${op}:${arg}` : `kerja:${op}`;
  const prev = game.onRefuse; let said = null;
  game.onRefuse = t => { said = t.quote; };
  const ok = game.act(c.id, kind);
  game.onRefuse = prev;
  drainNoon(); save(); refresh(); keep();
  if (said) return kdToast(`${c.name}: “${said}”`);
  if (!ok) return kdToast("That's already the plan.");
  const W = (game.home.get(c.id).st || {}).ward || {};
  kdToast(op === "card" ? (W.cardLast ? W.cardLast.t : "Done.") : op === "rest" ? "Tomorrow is a day off. 🛌" : `${c.name} will try that from tomorrow.`);
}

function baBind(v) { v.querySelectorAll("[data-ba]").forEach(el => el.onclick = () => baDo(el.dataset.ba)); v.querySelectorAll("[data-vn-demo]").forEach(el => el.onclick = () => phGo("ventures")); baIntroBind(v); }
function baDo(cmd) {
  const A = PH.ba || {}, b = baBiz(A.id); if (!b) return;
  const [op, arg] = cmd.split(":");
  if (op === "tab") { PH.ba = { ...A, tab: arg }; phGo("biz", PH.ba); return; }
  const keep = () => { const sc = PH.el.querySelector("#phView .pa")?.scrollTop || 0; phGo("biz", PH.ba); const bd = PH.el.querySelector("#phView .pa"); if (bd) bd.scrollTop = sc; };
  // tomorrow's bake: change the draft on the phone first, send it as one suggestion
  if (op === "dq") { const [, i, d] = cmd.split(":"), Bk = b.bake;
    const base = A.draft[+i] ?? (Bk && Bk.rows[+i] ? Bk.rows[+i].plan : 20); A.draft[+i] = Math.max(0, Math.min(400, base + +d)); keep(); return; }
  if (op === "planauto") { A.draft = A.draft.map(() => null); }
  let kind = arg != null ? `biz:${op}:${arg}` : `biz:${op}`;
  if (op === "plansend" || op === "planauto") kind = "biz:plan:" + A.draft.map(q => q == null ? "a" : q).join(",");
  if (b.demo) {
    if (op === "demonext") { Venture.demoNext(game.home, b); PH.ba = { ...A, tab: "ops", draft: null }; phGo("biz", PH.ba); return kdToast(`A day passes at ${b.name}.`); }
    const [, op2, arg2] = kind.split(":");
    if (["plan", "open", "dayold", "card", "rnd", "niche", "seat", "music", "mode", "extra"].includes(op2)) { const ok = Venture.demoAct(game.home, b, op2, arg2); keep(); return kdToast(ok ? "Test mode: applied. Tap Next day to see what happens." : "Nothing changed."); }
    return kdToast("Test mode: in the real game this goes to the owner as a suggestion.");
  }
  const oid = b.owner;
  const prev = game.onRefuse; let said = null;
  game.onRefuse = t => { said = t.quote; };
  const ok = game.act(oid, kind);
  game.onRefuse = prev;
  drainNoon(); save(); refresh();
  const sc = PH.el.querySelector("#phView .pa")?.scrollTop || 0;
  phGo("biz", PH.ba); const body = PH.el.querySelector("#phView .pa"); if (body) body.scrollTop = sc;
  const n = (game.home.get(oid) || {}).name || "They";
  if (said) return kdToast(`${n}: “${said}”`);
  if (!ok) return kdToast("Not enough cash for that right now.");
  const after = baBiz(A.id) || {};
  kdToast({ post: "Posted on Burrow. 📮", unpost: "Post taken down.", pick: `${n} hires them. 🤝`, raise: "They're happy about that. 😊", train: "Off to training. 📚", fire: `${n} lets them go.`,
    borrow: "The bank says yes. 🏦", repay: "Loan paid off. 🎉", invest: arg === "yes" ? "Deal signed. 🤝" : "Offer declined.", supplier: "Switching suppliers.", promo: "Promo is live on Chirp. 📣",
    product: after.ev && after.ev.k === "sig" ? `It's a hit: ${after.sig}! ⭐` : "It didn't catch on this time.", grow: `${after.name} is growing! 🎉`, contract: after.contract && after.contract.d === today() ? `Signed with ${after.contract.name}! ✍️` : "No one signed this time.",
    go: "Done. 👍", wait: `${n} will wait.`, plansend: `${n} will bake that tomorrow. 🥐`, planauto: `${n} will make their own guess.`, open: `${n} will try those hours.`, dayold: `${n} will try that.`, card: after.cardLast ? after.cardLast.t : "Done.", price: `${n} will try that.`, focus: `${n} will try that.`, close: `${n} closed it.`, bail: "Cash added." }[op] || `${n} will try that.`);
}

function phWallet(c) {
  const s = statusOf(c.id), day = today(), o = Market.owned(c, day), worth = o.goods.reduce((a, g) => a + g.sell, 0);
  const pay = s.job ? s.job.pay : 0, pen = c.st.pension && c.info.pensiun ? c.st.pension : 0, live = Career.canWork(c, day) || pay || pen ? 15 : 0;
  const net = pay + pen - live;
  return `${phHead("Wallet")}
    <div class="pa-card"><small>${esc(c.name.toUpperCase())} · OLD TOWN BANK</small><b>${coins(s.wallet)}</b><span>${net >= 0 ? "+" : "−"}${coins(Math.abs(net))} a day</span></div>
    <h4 class="pa-h">Every day</h4><div class="pa-list">
      ${pay ? `<div class="pa-row"><span class="pa-grow"><b>Salary</b><small>${esc(s.job.title)}${s.job.co ? " at " + esc(Career.coName(s.job.co)) : ""}</small></span><span class="pa-val plus">+${coins(pay)}</span></div>` : ""}
      ${pen ? `<div class="pa-row"><span class="pa-grow"><b>Pension</b></span><span class="pa-val plus">+${coins(pen)}</span></div>` : ""}
      ${live ? `<div class="pa-row"><span class="pa-grow"><b>Living costs</b><small>Food, bills, the usual</small></span><span class="pa-val">−${coins(live)}</span></div>` : `<div class="pa-row"><span class="pa-grow"><b>No income yet</b><small>${c.info.kuliah_aktif ? "At university. The family covers living costs." : "Money starts with the first job."}</small></span></div>`}</div>
    <h4 class="pa-h">What ${esc(c.name)} owns</h4><div class="pa-list">
      <div class="pa-row"><span class="pa-grow"><b>Things</b><small>${o.goods.length} item${o.goods.length === 1 ? "" : "s"} · the dealer would pay</small></span><span class="pa-val">${coins(worth)}</span></div>
      <div class="pa-row"><span class="pa-grow"><b>Family home</b><small>${esc(famStatus().house.label)} · ${esc(famStatus().house.hood)}</small></span><span class="pa-val">Shared</span></div>
      <div class="pa-row"><span class="pa-grow"><b>Net worth</b></span><span class="pa-val"><b>${coins(s.wallet + worth)}</b></span></div></div>
    <p class="pa-note">Coins come from work, prizes and inheritance.</p>`;
}
// Calendar, in the style of Google Calendar: a schedule list with a big illustrated banner for each month,
// a week label above each week, the date on the left and coloured event chips on the right.
// Tapping the month name opens a small month grid; tapping a day there jumps to it.
const GC_COL = { moment: "#039BE5", offer: "#33B679", drop: "#8E24AA", mag: "#D50000", bday: "#F4511E", anniv: "#E67C73", world: "#7CB342", school: "#3B7DD8" };
const GC_SEASON = [ // per calendar month: sky, ground, accent, and what's in the picture
  ["#CFE3F2", "#F4F7FA", "#8DB3D6", "snow"], ["#E9D3E0", "#F6EEF2", "#C98FB0", "hearts"], ["#D8EBC8", "#9CC27A", "#F2C94C", "sprout"],
  ["#CDE7E4", "#8DC0A4", "#F4A7B9", "rain"], ["#F9E0B8", "#A9C97E", "#E86F5A", "flowers"], ["#BFE3F5", "#F2D49B", "#F2A33A", "sun"],
  ["#9FD3E8", "#F0D6A0", "#2B8CBE", "sea"], ["#FFD9A8", "#E9B872", "#E8743B", "sun"], ["#E8D7B8", "#C7A56B", "#B5652B", "leaves"],
  ["#F3C892", "#B86B3C", "#7E3B1E", "leaves"], ["#D5CFC6", "#9C8F7E", "#6B5B4B", "rain"], ["#1E3354", "#E9EEF5", "#F2C94C", "stars"],
];
function gcBanner(month, year) {
  const [sky, ground, acc, kind] = GC_SEASON[month], r = artRng("gc" + month + year), N = (a, b) => a + r() * (b - a);
  let art = "";
  if (kind === "snow" || kind === "stars") for (let i = 0; i < 26; i++) art += `<circle cx="${N(0, 400)}" cy="${N(4, 70)}" r="${N(1.2, 2.6)}" fill="${kind === "snow" ? "#fff" : "#F7E7A6"}" opacity="${N(.6, 1)}"/>`;
  if (kind === "stars") art += `<circle cx="330" cy="30" r="15" fill="#F7E7A6"/><circle cx="337" cy="25" r="13" fill="${sky}"/>`;
  if (kind === "sun") art += `<circle cx="320" cy="42" r="22" fill="${acc}"/>`;
  if (kind === "rain") for (let i = 0; i < 22; i++) { const x = N(0, 400), y = N(0, 60); art += `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + 11}" stroke="${acc}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`; }
  if (kind === "hearts") for (let i = 0; i < 7; i++) { const x = N(170, 390), y = N(10, 60), s = N(.5, 1); art += `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6 C-8 -4 -16 4 0 16 C16 4 8 -4 0 6Z" fill="${acc}" opacity=".85"/>`; }
  if (kind === "sea") art += `<circle cx="320" cy="34" r="18" fill="#F7D774"/><path d="M0 92 Q50 84 100 92 T200 92 T300 92 T400 92 V112 H0Z" fill="${acc}"/>`;
  const hills = `<path d="M0 ${kind === "sea" ? 100 : 86} Q90 ${N(58, 70)} 190 86 T400 ${N(70, 82)} V120 H0Z" fill="${ground}"/><path d="M0 104 Q120 ${N(84, 92)} 240 102 T400 98 V120 H0Z" fill="${artShade(ground, .9)}"/>`;
  let fg = "";
  if (kind === "sprout" || kind === "flowers") for (let i = 0; i < 9; i++) { const x = N(140, 390), y = N(96, 112); fg += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 10}" stroke="#5E8C4A" stroke-width="2"/><circle cx="${x}" cy="${y - 11}" r="${kind === "flowers" ? 4 : 2.6}" fill="${kind === "flowers" ? [acc, "#fff", "#F2C94C"][i % 3] : "#7DB35A"}"/>`; }
  if (kind === "leaves") for (let i = 0; i < 14; i++) { const x = N(150, 400), y = N(8, 104); fg += `<ellipse cx="${x}" cy="${y}" rx="5" ry="2.6" transform="rotate(${N(0, 180)} ${x} ${y})" fill="${[acc, "#D99A3E", "#9C3D1C"][i % 3]}"/>`; }
  if (kind === "snow") fg += `<g transform="translate(330 76)"><circle r="13" cy="14" fill="#fff"/><circle r="9" cy="-6" fill="#fff"/><circle cx="-3" cy="-8" r="1.3" fill="#333"/><circle cx="3" cy="-8" r="1.3" fill="#333"/><path d="M0 -5 l6 2 l-6 1z" fill="#F08A3C"/></g>`;
  if (kind === "sun" && month === 7) fg += `<g transform="translate(300 94)"><line x1="0" y1="0" x2="0" y2="-28" stroke="#6B4B2E" stroke-width="2"/><path d="M-22 -26 Q0 -44 22 -26Z" fill="#E8743B"/></g>`;
  return `<div class="gc-banner" data-mo="${month}"><svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice"><rect width="400" height="120" fill="${sky}"/>${art}${hills}${fg}</svg><b style="color:${month === 11 ? "#fff" : "#1f1f1f"}">${PH_MONTHS[month]} ${year}</b></div>`;
}
const PH_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function gcEvents(c, from, to) {
  const F = famStatus(), kid = phKind(c) === "tablet", ev = [];
  for (const m of F.moments) ev.push({ day: m.day, title: m.label, sub: (member(m.cid) || {}).nama || "", moment: m.id, col: GC_COL.moment });
  if (!kid) {
    for (const D of Market.drops(from).filter(D => D.soon)) ev.push({ day: D.start, title: `${D.label} drops`, sub: "Bazaar", col: GC_COL.drop });
    for (const L of Career.profile(c, game.home, from).offers) ev.push({ day: L.until, title: `Offer from ${Career.coName(L.co)} ends`, sub: "Burrow", col: GC_COL.offer });
  }
  for (let k = Mag.latest(from) + 1, d; (d = Mag.issueDay(k)) <= to; k++) ev.push({ day: d, title: "New issue of Old Town", sub: "Magazine", col: GC_COL.mag });
  // v46: kalender sekolah tetap (anak.js), selama masih sekolah
  if (globalThis.Anak && c.age(from) < 270) for (const k of Anak.calendar(c, from)) if (k.day >= from && k.day <= to) ev.push({ day: k.day, title: `${k.ic} ${scCap(k.label)}`, sub: "School", col: GC_COL.school });
  // kejadian dunia (festival, cuaca) yang sudah diumumkan: hari mulai dan, kalau lebih dari sehari, hari selesainya
  for (const w of game.home.world.events || []) {
    const days = w.selesai - w.mulai + 1, ic = w.ikon ? w.ikon + " " : "";
    ev.push({ day: w.mulai, title: `${ic}${w.nama}${days > 1 ? " begins" : ""}`, sub: days > 1 ? `${days} days · Old Town` : "Old Town", col: GC_COL.world });
    if (days > 1) ev.push({ day: w.selesai, title: `${ic}${w.nama} ends`, sub: "Old Town", col: GC_COL.world });
  }
  // birthdays of everyone still at home
  for (const a of vm().anggota) {
    const h = game.home.get(a.id); if (!h || a.fase === "meninggal" || a.fase === "merantau" || h.born == null) continue;
    for (let y = 1; y < 6; y++) { const d = h.born + y * 365; if (d >= from && d <= to) ev.push({ day: d, title: `${a.nama}'s birthday`, sub: `Turns ${y}`, col: GC_COL.bday }); }
    const wed = h.info && h.info.menikah, who = h.info && h.relations && h.relations[h.info.pasangan_id];
    if (wed != null) for (let y = 1; y < 6; y++) { const d = wed + y * 365; if (d >= from && d <= to) ev.push({ day: d, title: `${a.nama}${who ? " & " + who.nama : ""}: ${y} year${y > 1 ? "s" : ""} married`, sub: "Anniversary", col: GC_COL.anniv }); }
  }
  return ev.filter(e => e.day >= from && e.day <= to).sort((a, b) => a.day - b.day);
}
function gcMini(day, ev, ym) {
  const [y, m] = ym, first = Date.UTC(y, m, 1), lead = new Date(first).getUTCDay(), len = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d0 = phDayDate(day), dayOf = dt => day + Math.round((dt - Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate())) / 86400000);
  const has = new Set(ev.map(e => e.day));
  let cells = Array.from({ length: lead }, () => `<span></span>`).join("");
  for (let i = 1; i <= len; i++) { const gd = dayOf(Date.UTC(y, m, i)); cells += `<button data-gcday="${gd}" class="${gd === day ? "on" : ""}${gd < day ? " past" : ""}">${i}${has.has(gd) ? "<i></i>" : ""}</button>`; }
  return `<div class="gc-mini"><div class="gc-mini-nav"><button data-gcmon="-1">‹</button><b>${PH_MONTHS[m]} ${y}</b><button data-gcmon="1">›</button></div>
    <div class="gc-mini-grid">${["S", "M", "T", "W", "T", "F", "S"].map(x => `<small>${x}</small>`).join("")}${cells}</div></div>`;
}
// scroll the schedule to a day, or to the first day after it that has something on
function gcJump(x) {
  const L = PH.el.querySelector(".pa.gc"); if (!L) return;
  const rows = [...L.querySelectorAll(".gc-day")], t = rows.find(r => +r.id.slice(2) >= x);
  if (t) L.scrollTop = t.offsetTop - 120; else L.scrollTop = L.scrollHeight;
}
// search the coming year, grouped by day like the schedule
function gcFound(c, q) {
  if (!q) return `<p class="gc-end">Search for interviews, drops, town events, birthdays, anniversaries or a name.</p>`;
  const day = today(), ev = gcEvents(c, day, day + 365).filter(e => srchHit(q, e.title, e.sub, PH_MONTHS[phDayDate(e.day).getUTCMonth()]));
  srchN = ev.length;
  if (!ev.length) return `<p class="gc-end">No events match “${esc(q)}” in the next year.</p>`;
  const fmt = (x, o) => phDayDate(x).toLocaleDateString("en-US", Object.assign({ timeZone: "UTC" }, o));
  return [...new Set(ev.map(e => e.day))].map(x => `<div class="gc-day"><span class="gc-date${x === day ? " on" : ""}"><small>${fmt(x, { month: "short" })}</small><b>${phDayDate(x).getUTCDate()}</b></span><span class="gc-evs">${ev.filter(e => e.day === x).map(e => `<${e.moment ? `button data-moment="${esc(e.moment)}"` : "div"} class="gc-ev" style="background:${e.col}"><b>${esc(e.title)}</b><small>${esc(e.sub)} · ${fmt(x, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</small></${e.moment ? "button" : "div"}>`).join("")}</span></div>`).join("");
}
function phCalendar(c) {
  const day = today(), d = phDayDate(day), to = day + 180, ev = gcEvents(c, day, to);
  const G = PH.gc || (PH.gc = { open: false, ym: [d.getUTCFullYear(), d.getUTCMonth()] });
  const fmt = (x, o) => phDayDate(x).toLocaleDateString("en-US", Object.assign({ timeZone: "UTC" }, o));
  let body = "", lastMonth = -1, lastWeek = -1;
  for (let x = day; x <= to; x++) {
    const dd = phDayDate(x), mo = dd.getUTCMonth(), dow = dd.getUTCDay(), list = ev.filter(e => e.day === x);
    if (mo !== lastMonth) { if (lastMonth !== -1 || dd.getUTCDate() === 1) body += gcBanner(mo, dd.getUTCFullYear()); lastMonth = mo; }
    const wk = x - dow;
    if (wk !== lastWeek && (list.length || x === day || dow === 0)) { const a = wk, b = wk + 6; body += `<div class="gc-week">${fmt(a, { month: "short", day: "numeric" })} – ${phDayDate(b).getUTCMonth() !== phDayDate(a).getUTCMonth() ? fmt(b, { month: "short", day: "numeric" }) : fmt(b, { day: "numeric" })}</div>`; lastWeek = wk; }
    if (!list.length && x !== day) continue;
    body += `<div class="gc-day" id="gc${x}" data-mo="${mo}"><span class="gc-date${x === day ? " on" : ""}"><small>${fmt(x, { weekday: "short" })}</small><b>${dd.getUTCDate()}</b></span><span class="gc-evs">${list.length ? list.map(e => `<${e.moment ? `button data-moment="${esc(e.moment)}"` : "div"} class="gc-ev" style="background:${e.col}"><b>${esc(e.title)}</b><small>${esc(e.sub)}</small></${e.moment ? "button" : "div"}>`).join("")
      : `<div class="gc-none">Nothing planned today</div>`}</span></div>`;
  }
  const face = colorOf(cur);
  if (G.find) return `<div class="gc-top gc-find"><button class="gc-x" data-gcfind aria-label="Close search">←</button>${srchBox("Search", PH.q.calendar, "gc-srch")}</div>
    <div data-srch="calendar">${gcFound(c, PH.q.calendar)}</div>`;
  return `<div class="gc-top"><span class="gc-burger"><i></i><i></i><i></i></span><button class="gc-title" data-gcopen data-now="${d.getUTCMonth()}">${PH_MONTHS[G.open ? G.ym[1] : d.getUTCMonth()]} <em>${G.open ? "▴" : "▾"}</em></button>
      <button class="gc-ic" data-gcfind aria-label="Search"><svg viewBox="0 0 24 24" width="21" height="21"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="#444746" stroke-width="2"/><path d="M15 15l5 5" stroke="#444746" stroke-width="2" stroke-linecap="round"/></svg></button>
      <button class="gc-today" data-gctoday><b>${d.getUTCDate()}</b></button><span class="gc-me" style="background:${face}">${esc(c.name[0])}</span></div>
    ${G.open ? gcMini(day, ev, G.ym) : ""}
    <div class="gc-list">${body}<p class="gc-end">Interviews, reviews, drops, town events and birthdays show up here.</p></div>`;
}
function phPhotos(c) {
  const all = albumOf(c.id).sort((a, b) => a.day - b.day);
  return `${phHead("Photos", `${all.length} photo${all.length === 1 ? "" : "s"}`)}
    ${all.length ? `${srchBox("Search people, places, years", PH.q.photos, "pa-srch")}<div data-srch="photos">${phPhotoGrid(c, PH.q.photos)}</div>`
      : `<p class="pa-note">No photos yet. When something worth remembering happens, a camera shows up next to ${esc(c.name)}.</p>`}`;
}
function phPhotoGrid(c, q) {
  const all = albumOf(c.id).sort((a, b) => a.day - b.day).filter(a => !q || srchHit(q, a.caption, a.line, a.place, a.who.map(w => w.nama).join(" "), fmtDate(a.day)));
  srchN = all.length;
  return all.length ? `<div class="pa-photos">${all.map(a => `<button data-ph="${esc(a.key)}"><img src="${a.img}" alt="${esc(a.caption)}"></button>`).join("")}</div>`
    : `<p class="pa-note">No photos match “${esc(q)}”.</p>`;
}
function phPhoto(c, key) {
  const a = albumOf(c.id).find(x => x.key === key);
  if (!a) return phPhotos(c);
  return `<div class="pa-viewer"><button class="pa-x" data-back="photos">‹ Photos</button><img src="${a.img}" alt="${esc(a.caption)}">
    <div><b>${esc(a.caption)}</b><small>${esc(fmtDate(a.day))} · ${esc(fmtAge(a.age))} old${a.who.length ? " · with " + esc(a.who.map(w => w.nama).join(" & ")) : ""}</small><p>${md(a.line)}</p></div></div>`;
}
// Homes, in the style of a property app: a photo of every home, how many lots are left on each street,
// your own place with its neighbours, and who bought what lately.
const HM_SKY = { rented: "#E9DED0", flat: "#DCE6EE", house: "#D7E7F0", villa: "#E4EEDC", mansion: "#EFE6D2" };
function hmPhoto(kind, hoodId, model, paint, seed, cls = "") {
  const H = Town.HOODS.find(h => h.id === hoodId), key = ["house", kind, model, paint, seed].join("|");
  MG.specs.set(key, { house: { kind, model, paint, seed, ground: H.ground, sky: HM_SKY[hoodId] } });
  const u = MG.photos.get(key);
  return `<img class="hm-img ${cls}" data-mgc="${esc(key)}" alt="" ${u ? `src="${u}"` : ""}>`;
}
function hmTown(day, F) {
  const npcs = Status.npcTown(day), out = {};
  for (const H of Town.HOODS) {
    const slots = H.per * 2, live = npcs.filter(n => n.house === H.id).length, build = npcs.filter(n => n.build && n.build.id === H.id).length;
    const you = (F.house.id === H.id) + (!!F.build && F.build.id === H.id);
    out[H.id] = { H, slots, owners: live + (F.house.id === H.id ? 1 : 0), left: H.id === "rented" ? null : Math.max(0, slots - Math.min(slots, live + Math.min(build, Math.max(1, Math.floor(slots / 3))) + you)) };
  }
  return { npcs, hood: out };
}

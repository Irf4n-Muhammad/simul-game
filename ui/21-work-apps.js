// ---- Work apps: every family business has its own app on the phone of whoever runs it or works there.
// Built from shared parts (people, money, growth, partners) plus one screen that only that kind of business has.
// Leave after 90+ days and it stays as a read-only "alumni" app.
const BA_THEME = {
  bakery: { app: "Oven", col: "#C8763A", soft: "#FFF4E8", ic: "🥐", ops: "Oven" },
  quant: { app: "Terminal", col: "#12B886", soft: "#0F1720", ic: "📈", ops: "Terminal", dark: true },
  courier: { app: "Routes", col: "#E2552B", soft: "#FFF1EB", ic: "🛵", ops: "Routes" },
  salon: { app: "Chairs", col: "#B0568E", soft: "#FAEFF6", ic: "💇", ops: "Chairs" },
  tutoring: { app: "Classes", col: "#3E8E5E", soft: "#EDF6F0", ic: "📚", ops: "Classes" },
  cleaning: { app: "Crew", col: "#3E6FB0", soft: "#EEF3FA", ic: "🧽", ops: "Crew" },
};
const BA_CAT = { raw: ["Field", "#5E9C43", "#F1F7EC"], make: ["Workshop", "#7A6A58", "#F5F1EC"], dist: ["Routes", "#E2552B", "#FFF1EB"], svc: ["Clients", "#3E6FB0", "#EEF3FA"],
  shop: ["Shop", "#C8763A", "#FFF4E8"], care: ["Bookings", "#B0568E", "#FAEFF6"], media: ["Studio", "#7A4FC2", "#F3EFFA"], tech: ["Dev board", "#2F80ED", "#EEF4FD"], fin: ["Desk", "#1E6B52", "#EAF6F0"] };
function baTheme(tpl) {
  if (BA_THEME[tpl]) return BA_THEME[tpl];
  const t = Venture.TPL[tpl], [ops, col, soft] = BA_CAT[t.cat];
  return { app: t.label.split(" ").slice(-1)[0].replace(/^./, ch => ch.toUpperCase()), col, soft, ic: Venture.CATS[t.cat].icon, ops: t.hits ? "Dev board" : ops };
}
function baApps(c) {
  if (!c || !c.st || !globalThis.Venture) return [];
  return Venture.workApps(game.home, c, today()).map(w => { const T = baTheme(w.tpl); return { id: "biz:" + w.biz, name: w.live ? T.app : "Old " + T.app, bg: w.live ? T.col : "#9a9a9f", html: `<b class="pi-txt" style="font-size:27px">${T.ic}</b>`, w, adult: true, old: !w.live }; });
}
const BA_DEMO = {};
const baBiz = id => BA_DEMO[id] || (Status.fam(game.home).biz || { list: [] }).list.find(b => b.id === id);
// test mode: open any business app with a sample business that ran for a few months (nothing is saved)
function baDemo(tpl) {
  const c = game.home.get(cur.id), b = Venture.demo(game.home, c, tpl, today());
  if (!b) return kdToast("Grown-ups only.");
  BA_DEMO[b.id] = b; PH.ba = { id: b.id, tab: "ops" }; phGo("biz", PH.ba);
}
function baBadge(c, id) {
  const b = baBiz(id); if (!b || b.closed || b.owner !== c.id) return 0;
  return (b.offer ? 1 : 0) + (b.wish ? 1 : 0) + (b.card ? 1 : 0) + (b.post && b.post.by === "you" ? b.post.apps.length : 0);
}
const baTabs = v => { const t = v.t, T = baTheme(t.id), out = [["ops", T.ops], ["people", "People"], ["money", "Money"]];
  if (!t.fund) out.push(["growth", "Growth"]);
  if (t.inputs.length || t.b2b) out.push(["partners", "Partners"]);
  return out; };
const baPct = v => `${Math.round(v * 100)}%`;
const baMood = m => m >= 75 ? "😄" : m >= 55 ? "🙂" : m >= 35 ? "😐" : "😟";
function phBizApp(c, arg) {
  const id = arg && arg.id, b = baBiz(id), day = today();
  if (!b) return phHead("App", "Not available");
  const T = baTheme(b.tpl), v = Venture.view(b, game.home, day), owner = b.owner === c.id && !b.closed, staffMe = !owner && c.st.job && c.st.job.biz === b.id && !b.closed;
  if (!owner && !staffMe) return baAlumni(c, b, v, T);
  const svc = !!Venture.SVC[b.tpl], bake = b.tpl === "bakery" || b.tpl === "cafe" || svc;
  const tabs = bake ? (owner ? [["ops", "Today"], ["people", "Team"], ["money", "Money"]] : [["ops", "Today"], ["people", "Team"]]) : owner ? baTabs(v) : [["ops", T.ops], ["people", "Team"]], tab = tabs.some(x => x[0] === arg.tab) ? arg.tab : "ops";
  const body = (bake ? { ops: svc ? baSvcToday : baBakeToday, people: baPeople, money: baBakeMoney } : { ops: baOps, people: baPeople, money: baMoney, growth: baGrowth, partners: baPartners })[tab](c, b, v, T, owner);
  return `<div class="ba${T.dark ? " dark" : ""}" style="--ba:${T.col};--ba-soft:${T.soft}">
    <header class="ba-head">${b.demo ? `<button class="ba-x" data-vn-demo="1" aria-label="Back">‹</button>` : ""}<span class="ba-ic">${T.ic}</span><span class="pa-grow"><b>${esc(b.name)}</b><small>${b.demo ? "Test mode · sample business" : `${esc(T.app)} · ${esc(v.lvl)} · ${owner ? "you're the owner" : esc(c.st.job.role || "Staff")}`}</small></span>${b.demo ? `<button class="ba-next" data-ba="demonext">Next day ›</button>` : ""}</header>
    <div class="ba-body">${body}</div>
    <nav class="ba-tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? "on" : ""}" data-ba="tab:${k}">${esc(l)}</button>`).join("")}</nav>
    ${b.tpl === "bakery" ? baIntro("bakery", [["🥐", `${v.owner} runs ${b.name}`, `Every morning ${v.owner} bakes, sells, and counts what's left. You're the advisor.`],
      ["🧺", "Today shows how the bake went", "Sold out means customers walked away. Leftovers mean money in the bin. The trick is neither."],
      ["💬", "You suggest, they decide", `Plan tomorrow's bake, pick the opening time, answer the weekly decisions. ${v.owner} might say no.`]])
    : b.tpl === "cafe" ? baIntro("cafe", [["☕", `${v.owner} runs ${b.name}`, `Coffee is made when it's ordered. Food is made each morning, and whatever's left at closing goes in the bin.`],
      ["🧁", "Today shows the day", "Cups poured, food sold and wasted, and anyone who gave up on the line. Get the food right and keep the line short."],
      ["💬", "You suggest, they decide", `Plan tomorrow's food, choose seats or takeaway, try live music. ${v.owner} might say no.`]])
    : svc ? baIntro(b.tpl, [[T.ic, `${v.owner} runs ${b.name}`, SVC_UI[b.tpl].intro[0]], ["📋", "Today shows the day", SVC_UI[b.tpl].intro[1]],
      ["💬", "You suggest, they decide", `${SVC_UI[b.tpl].intro[2]} ${v.owner} might say no.`]]) : ""}</div>`;
}
const baAdv = (n, k, opts, cur) => `<div class="vn-seg">${opts.map(([val, l]) => `<button class="${cur === val ? "on" : ""}" data-ba="${k}:${val}">${l}</button>`).join("")}</div>`;
const baNote = (c, b) => `<p class="ba-note">You suggest, ${esc((game.home.get(b.owner) || c).name)} decides.</p>`;
function baKpis(items) { return `<div class="ba-kpis">${items.map(([l, val, cls]) => `<span><small>${l}</small><b class="${cls || ""}">${val}</b></span>`).join("")}</div>`; }
function baEvent(b, day) { return b.ev && day - b.ev.d < 14 ? `<p class="ba-ev">${esc(b.ev.t)}</p>` : ""; }
function baWish(b, v) {
  if (!b.wish) return "";
  return `<div class="vn-ask"><p>${b.wish.k === "expand" ? `${esc(v.owner)} wants to grow it into a ${esc(v.next ? v.next.label.toLowerCase() : "bigger place")} for ${vnCoins(b.wish.cost)} coins.` : `${esc(v.owner)} is thinking about closing it.`}</p>
    <span class="kd-two"><button class="kd-btn" data-ba="go">${b.wish.k === "expand" ? "Bless it" : "Agree"}</button><button class="kd-btn alt" data-ba="wait">${b.wish.k === "expand" ? "Not yet" : "Keep going"}</button></span></div>`;
}

// ---- ops: the one screen each kind of business has to itself
function baOps(c, b, v, T, owner) {
  const day = today(), Td = b.today || {};
  const adv = owner ? `<h4 class="pa-h">Your advice</h4><div class="vn-card">${v.t.fund ? baAdv(c, "focus", [["quality", "Play safe"], ["steady", "Balanced"], ["growth", "Go big"]], b.focus)
    : baAdv(c, "price", [["budget", "Cheap"], ["normal", "Normal"], ["premium", "Premium"]], b.price) + baAdv(c, "focus", [["quality", "Quality"], ["steady", "Steady"], ["growth", "Growth"]], b.focus)}${baNote(c, b)}</div>` : "";
  const top = baWish(b, v) + baEvent(b, day);
  if (b.tpl === "bakery") return top + baOven(b, v, Td) + adv;
  if (b.tpl === "quant") return top + baTerminal(b, v, Td, day) + adv;
  if (b.tpl === "courier") return top + baRoutes(b, v, Td) + adv;
  const t = v.t;
  const hit = t.hits ? (b.ship && b.ship.hit != null ? `<div class="vn-card"><div class="vn-row"><span>${esc(b.prodName)}</span><b>${vnCoins(Td.cust || 0)} ${t.unit}</b></div>${vnSpark((b.hist || []).slice(-30).map(r => r[3]), 300, 46, "var(--ba)")}</div>`
    : `<div class="vn-card"><div class="vn-row"><span>Building ${esc(b.prodName)}</span><b>${Math.min(99, Math.round((day - b.since) / Math.max(1, (b.ship ? b.ship.at : b.since + 50) - b.since) * 100))}%</b></div>${vnBar((day - b.since) / Math.max(1, (b.ship ? b.ship.at : b.since + 50) - b.since), "var(--ba)")}<p class="vn-fact">Launch day decides everything. Quality and the team's skill matter most.</p></div>`) : "";
  return top + baKpis([[t.hits ? t.unit : `${t.unit} today`, vnCoins(Td.cust || 0)], ["Revenue", vnCoins(Td.rev || 0)], ["Profit", (Td.profit >= 0 ? "+" : "") + vnCoins(Td.profit || 0), Td.profit >= 0 ? "up" : "down"]])
    + hit + `<div class="vn-card"><div class="vn-row"><span>Last 30 days</span><b class="${v.profit30 >= 0 ? "up" : "down"}">${v.profit30 >= 0 ? "+" : ""}${vnCoins(v.profit30)}</b></div>${vnSpark(v.spark, 300, 40)}
      <div class="vn-meter"><span>Quality</span>${vnBar(b.q || 0, "var(--ba)")}</div><div class="vn-meter"><span>Reputation</span>${vnBar((b.rep || 0) / 100, "#F5B82E")}</div>
      ${b.sig ? `<p class="vn-fact">Known for <b>${esc(b.sig)}</b></p>` : ""}</div>` + adv;
}
function baOven(b, v, Td) {
  const prods = [...new Set([b.sig, ...v.t.prod].filter(Boolean))].slice(0, 4), cust = Td.cust || 0, cap = b.capN || cust || 1;
  const wts = prods.map((p, i) => (p === b.sig ? 2.2 : 1) * (0.6 + hashStr(b.id + p) % 100 / 100)), W = wts.reduce((a, x) => a + x, 0);
  const rows = prods.map((p, i) => { const sold = Math.round(cust * wts[i] / W * 1.4), baked = Math.round(cap * wts[i] / W * 1.4); return { p, sold: Math.min(sold, baked), baked, out: sold >= baked }; });
  const stars = n => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  const revs = [0, 1, 2].map(i => { const h = hashStr(b.id + today() + "r" + i) % 100, s = Math.max(1, Math.min(5, Math.round((b.q || 0.5) * 5 + (h / 100 - 0.5) * 1.6)));
    return { s, t: s >= 5 ? ["Best bread in Old Town.", "I come back every morning.", "The " + prods[0] + " is unreal."][i] : s >= 4 ? ["Lovely and warm.", "Friendly, fresh, good value.", "Get there early!"][i] : s >= 3 ? ["Fine, nothing special.", "A bit pricey.", "Sold out by noon again."][i] : ["Stale today.", "Long wait, cold bun.", "Not like it used to be."][i] }; });
  return `<div class="ba-oven"><div class="ba-oven-top"><span>🔥 Morning bake</span><b>${cust} customers</b></div>
      ${rows.map(r => `<div class="ba-tray"><span class="pa-grow"><b>${esc(r.p)}${r.p === b.sig ? " ⭐" : ""}</b><small>${r.sold} sold of ${r.baked}</small></span>${r.out ? `<i class="ba-tag">Sold out</i>` : ""}<i class="vn-bar ba-trbar"><b style="width:${Math.round(r.sold / Math.max(1, r.baked) * 100)}%;background:var(--ba)"></b></i></div>`).join("")}
      <div class="vn-meter"><span>Oven</span>${vnBar(cust / Math.max(1, cap), "var(--ba)")}<small>${Math.round(cust / Math.max(1, cap) * 100)}% full</small></div></div>
    ${baKpis([["Takings", vnCoins(Td.rev || 0)], ["Flour & butter", vnCoins(Td.mat || 0)], ["Profit", (Td.profit >= 0 ? "+" : "") + vnCoins(Td.profit || 0), Td.profit >= 0 ? "up" : "down"]])}
    <h4 class="pa-h">Reviews</h4><div class="pa-list">${revs.map(r => `<div class="pa-row"><span class="ba-stars">${stars(r.s)}</span><span class="pa-grow">${esc(r.t)}</span></div>`).join("")}</div>`;
}
function baTerminal(b, v, Td, day) {
  const live = Career.COS.filter(co => Career.alive(co, day) && Career.alive(co, day - 1));
  const pick = live.map(co => [co, hashStr(b.id + Math.floor(day / 14) + co.id) % 1000]).sort((a, z) => z[1] - a[1]).slice(0, 5);
  const wt = co => 0.3 + Math.pow(hashStr(co.id + "w" + b.id) % 1000 / 1000, 2) * 3, W = pick.reduce((a, [co]) => a + wt(co), 0);
  const pos = pick.map(([co, h]) => { const p = Venture.price(co, day), p0 = Venture.price(co, day - 1); return { name: co.name, w: wt(co) / W, p, chg: p0 ? (p / p0 - 1) * 100 : 0 }; });
  let eq = 0; const curve = (b.hist || []).map(r => (eq += r[2]));
  const lev = 1 + ((game.home.get(b.owner) || {}).traits?.ambisius ?? 50) / 100 + (b.focus === "growth" ? 0.5 : b.focus === "quality" ? -0.3 : 0);
  return `<div class="ba-term"><small>ASSETS UNDER MANAGEMENT</small><b class="ba-aum">${vnCoins(b.cash)}</b><span class="${(b.ret || 0) >= 0 ? "up" : "down"}">${(b.ret || 0) >= 0 ? "▲" : "▼"} ${Math.abs(b.ret || 0)}% today · ${(Td.profit || 0) >= 0 ? "+" : ""}${vnCoins(Td.profit || 0)}</span>
      ${vnSpark(curve, 300, 70, (curve[curve.length - 1] || 0) >= 0 ? "#12B886" : "#FF6B6B")}<small>${curve.length} days of P&amp;L</small></div>
    <h4 class="pa-h">Positions</h4><div class="ba-pos">${pos.map(o => `<div><span class="pa-grow"><b>${esc(o.name)}</b><small>${baPct(o.w)} of the book</small></span><span class="ba-px">${o.p.toFixed(2)}<em class="${o.chg >= 0 ? "up" : "down"}">${o.chg >= 0 ? "+" : ""}${o.chg.toFixed(2)}%</em></span></div>`).join("")}</div>
    ${baKpis([["Leverage", lev.toFixed(1) + "×"], ["Model", esc((b.prodName || "").replace(/^the /, "").replace(/ model$/, ""))], ["Market", `${Venture.market(day, 1).today >= 0 ? "+" : ""}${Venture.market(day, 1).today}%`]])}
    ${b.split ? `<div class="vn-card"><div class="vn-row"><span>Today from luck (the market)</span><b class="${b.split.luck >= 0 ? "up" : "down"}">${b.split.luck >= 0 ? "+" : ""}${b.split.luck.toFixed(2)}%</b></div><div class="vn-row"><span>Today from edge (the model)</span><b class="${b.split.edge >= 0 ? "up" : "down"}">${b.split.edge >= 0 ? "+" : ""}${b.split.edge.toFixed(2)}%</b></div><p class="vn-fact">Luck swings big and evens out. Edge is small and adds up every day.</p></div>` : ""}`;
}
function baRoutes(b, v, Td) {
  const Sv = b.svc, n = Math.min(24, Td.cust || 0), riders = 1 + (b.staff || []).filter(s => /Rider|Driver/.test(s.role)).length, ontime = Sv && Sv.cust ? Math.round((Sv.cust - Sv.bad) / Sv.cust * 100) : Math.round(62 + (b.q || 0.5) * 36);
  const R = artRng("rt" + b.id + today());
  let streets = ""; for (let i = 1; i < 6; i++) streets += `<line x1="0" x2="320" y1="${i * 36}" y2="${i * 36}" class="ba-st"/><line y1="0" y2="210" x1="${i * 54}" x2="${i * 54}" class="ba-st"/>`;
  // drop-offs snap to street corners, each rider takes every n-th one, sorted around the depot
  const P = Array.from({ length: n }, () => ({ x: 54 * (1 + Math.floor(R() * 5)), y: 36 * (1 + Math.floor(R() * 5)), late: R() * 100 > ontime }));
  const routes = Array.from({ length: riders }, (_, k) => { const mine = P.filter((_, i) => i % riders === k).sort((a, z) => Math.atan2(a.y - 108, a.x - 162) - Math.atan2(z.y - 108, z.x - 162));
    if (!mine.length) return ""; let d = "M162 108", cy = 108; for (const q of mine) { d += ` L${q.x} ${cy} L${q.x} ${q.y}`; cy = q.y; } d += ` L162 ${cy} L162 108`;
    return `<path d="${d}" fill="none" stroke="${["#E2552B", "#2F80ED", "#9B51E0", "#F2C94C"][k % 4]}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity=".75"/>`; }).join("");
  const pins = P.map(q => `<g transform="translate(${q.x} ${q.y})"><circle r="6" fill="${q.late ? "#F2994A" : "#27AE60"}" stroke="#fff" stroke-width="2"/></g>`).join("");
  return `<div class="ba-map"><svg viewBox="0 0 320 210">${streets}<rect x="58" y="40" width="46" height="28" rx="5" fill="#CFE8C6"/><text x="81" y="58" class="ba-park">Park</text>${routes}${pins}<g transform="translate(162 108)"><rect x="-13" y="-13" width="26" height="26" rx="7" fill="#1d1d1f"/><text y="5" text-anchor="middle" font-size="14">🏠</text></g></svg>
      <div class="ba-legend"><span><i style="background:#27AE60"></i>On time</span><span><i style="background:#F2994A"></i>Running late</span></div></div>
    ${baKpis([["Deliveries", Td.cust || 0], ["On time", ontime + "%"], ["Riders out", riders]])}
    <div class="vn-card"><div class="vn-row"><span>Today</span><b class="${(Td.profit || 0) >= 0 ? "up" : "down"}">${(Td.profit || 0) >= 0 ? "+" : ""}${vnCoins(Td.profit || 0)}</b></div><div class="vn-row"><span>Businesses that could book us</span><b>${v.clients}</b></div>${b.contract ? `<div class="vn-row"><span>Contract with ${esc(b.contract.name)}</span><b>${b.contract.until - today()} days left</b></div>` : ""}</div>`;
}

// ---- edge and track record: what builds up over years
const BA_EDGE = { fund: "Model", shop: "Recipes", tech: "Codebase", media: "Craft", raw: "Know-how", make: "Know-how", dist: "Network", svc: "Know-how", care: "Know-how" };
function baEdge(c, b, v, owner) {
  const nm = BA_EDGE[v.t.fund ? "fund" : v.t.cat] || "Know-how", cur = b.rnd || v.rndNow;
  return `<h4 class="pa-h">Edge · ${esc(nm)}</h4><div class="vn-card"><div class="vn-row"><span>What ${esc(b.name)} knows that newcomers don't</span><b>${v.edge}/100</b></div>${vnBar(v.edge / 100, "var(--ba)")}
    <p class="vn-fact">Grows slowly with time, the owner's skill, a good team and research. ${v.t.fund ? "A better model earns more on any market day." : "Raises quality every day."} Most of it passes on if the family takes over. A new rival starts at 0.</p>
    ${owner ? `<small class="ba-lbl" style="margin-top:10px">Research budget</small>${v.rndList.map(o => baOpt("rnd:" + o.k, o.label, o.k === "none" ? "Free. Edge only grows from experience, and slowly fades." : `${vnCoins(o.cost)} a day. Edge grows ${o.k === "heavy" ? "much " : ""}faster.`, cur === o.k)).join("")}` : ""}</div>`;
}
// ---- market: equal firms split town demand, niches crowd separately, crises clear out the weak
const BA_STYLE = { momentum: "Rides trends. Big swings both ways.", meanrev: "Bets that prices snap back. Steadier.", neutral: "Hedged against the market. Small swings, survives crashes." };
function baMarket(c, b, v, owner) {
  const M = v.market;
  if (!M) return "";
  const N = Object.fromEntries(M.niches.map(o => [o.k, o.label])), you = { name: b.name, niche: M.niche, s: M.me, same: true, you: true };
  const rows = [...M.rows, you].sort((a, z) => z.s - a.s).slice(0, 7), mx = Math.max(...rows.map(r => r.s));
  const plural = v.t.fund ? "funds" : v.t.label.toLowerCase().replace(/y$/, "ie") + "s";
  const news = [M.recession ? `Recession. The weakest ${plural} are closing.` : "", M.shut ? `${M.shut} rival${M.shut > 1 ? "s" : ""} closed in the downturn. ${v.t.fund ? "Their investors" : "Their customers"} are up for grabs.` : "",
    M.crises ? `${esc(b.name)} has made it through ${M.crises} recession${M.crises > 1 ? "s" : ""}.` : ""].filter(Boolean);
  return `<h4 class="pa-h">Market · ${esc(plural)} in town</h4><div class="vn-card">
    <div class="vn-row"><span>${v.t.fund ? "Share of the edge in your style" : "Share of town demand"}</span><b>${M.share}%</b></div>${vnBar(M.share / 100, "var(--ba)")}
    <div class="ba-mk">${rows.map(r => `<div class="${r.you ? "you" : r.same ? "" : "far"}"><span class="pa-grow"><b>${esc(r.name)}${r.you ? " · you" : r.fam ? ` <i class="ba-fam">family</i>` : ""}</b><small>${M.multi ? esc(N[r.niche] || "") : ""}</small></span>${vnBar(r.s / mx, r.you ? "var(--ba)" : "#b9b9be")}</div>`).join("")}</div>
    ${news.length ? `<p class="vn-fact"><b>${news.join(" ")}</b></p>` : ""}
    ${M.multi && owner ? `<small class="ba-lbl" style="margin-top:10px">${v.t.fund ? "Style" : "Niche"}</small>${M.niches.map(o => baOpt("niche:" + o.k, o.label, `${v.t.fund ? BA_STYLE[o.k] + " " : ""}${o.you ? (o.n ? `${o.n} other${o.n > 1 ? "s" : ""} here.` : "Nobody else here.") : `${o.n || "No"} rival${o.n === 1 ? "" : "s"} here. Switching loses some Edge.`}`, o.you)).join("")}` : ""}
    <p class="vn-fact">Firms that are just as good split the ${v.t.fund ? "opportunities" : "customers"}. Being stronger, or in a quieter ${v.t.fund ? "style" : "niche"}, gets a bigger slice.</p></div>`;
}
function baTrack(b, v) {
  const T = v.track, next = b.since + 365 * ((T.n || 0) + 1);
  if (!T.n) return `<h4 class="pa-h">Track record</h4><div class="vn-card"><p class="vn-fact">No full year yet. The first one ends ${fmtDate(next)}. ${v.t.fund ? "Outside investors only put money in after a year of results." : "Serious investors want to see at least one good year."}</p></div>`;
  const key = T.fund ? "r" : "p", mx = Math.max(1, ...T.years.map(o => Math.abs(o[key])));
  return `<h4 class="pa-h">Track record · ${T.n} year${T.n > 1 ? "s" : ""}</h4><div class="vn-card"><div class="ba-yrs">${T.years.map(o => `<span><i class="${o[key] >= 0 ? "up" : "down"}" style="height:${Math.max(4, Math.round(Math.abs(o[key]) / mx * 46))}px"></i><small>Y${o.y}</small></span>`).join("")}</div>
    <div class="vn-row"><span>Average a year</span><b class="${T.avg >= 0 ? "up" : "down"}">${T.fund ? `${T.avg >= 0 ? "+" : ""}${T.avg}%` : `${T.avg >= 0 ? "+" : ""}${vnCoins(T.avg)}`}</b></div>
    <div class="vn-row"><span>Worst year</span><b>${T.fund ? `${T.worst}%` : vnCoins(T.worst)}</b></div><div class="vn-row"><span>Good years</span><b>${T.good} of ${T.n}</b></div>
    <p class="vn-fact">Investors follow the record, not one lucky month. Steady years bring more money in.</p></div>`;
}

// ---- people: hire through Burrow, look after the team
function baPeople(c, b, v, T, owner) {
  const day = today(), staff = v.staffV;
  const boss = owner ? "" : `<div class="pa-row ba-person"><span class="ba-face" style="background:${colorOf(member(b.owner) || {})}">${esc(v.owner[0])}</span><span class="pa-grow"><b>${esc(v.owner)}</b><small>Owner</small></span></div>`;
  const list = staff.length ? `<div class="pa-list">${boss}${staff.map(s => `<div class="pa-row ba-person"><span class="ba-face" style="background:${s.fam ? colorOf(member(s.fam) || {}) : bwHue(s.name)}">${esc(s.name[0])}</span>
      <span class="pa-grow"><b>${esc(s.name)}${s.fam ? ` <i class="ba-fam">family</i>` : ""}</b><small>${esc(s.role)} · ${s.trait ? esc(s.trait) + " · " : ""}${vnCoins(s.payNow)}/day</small>${vnBar(s.skill, "var(--ba)")}</span>
      <span class="ba-moodv" title="Mood">${baMood(s.mood)}</span></div>
      ${owner ? `<div class="ba-acts"><button data-ba="raise:${s.id}">${s.fam ? "Promote" : "Raise"}</button><button data-ba="train:${s.id}" ${s.trained > day - 30 ? "disabled" : ""}>Train · ${vnCoins(v.trainCost)}</button><button class="vn-x" data-ba="fire:${s.id}">Let go</button></div>` : ""}`).join("")}</div>`
    : `<p class="pa-note">${v.t.fund ? "No analysts yet. The owner runs the model alone." : `Nobody else yet. ${esc(v.owner)} does everything.`}</p>`;
  const P = b.post;
  const hiring = !owner ? "" : P ? `<h4 class="pa-h">Hiring: ${esc(P.role)}</h4><div class="vn-card"><p class="vn-fact">Posted on Burrow ${day - P.d ? `${day - P.d} day${day - P.d > 1 ? "s" : ""} ago` : "today"}${P.by === "owner" ? ` by ${esc(v.owner)}` : ""}. ${P.apps.length ? "Recommend someone, or the owner picks in a few days." : "Waiting for applicants."}</p>
      ${P.apps.map(a => `<div class="ba-app"><span class="pa-grow"><b>${esc(a.name)}${a.fam ? ` <i class="ba-fam">family</i>` : ""}</b><small>${esc(a.trait || "")} · asks ${vnCoins(a.ask)}/day</small>${vnBar(a.skill, "var(--ba)")}</span><button class="kd-btn" data-ba="pick:${a.id}">Recommend</button></div>`).join("")}
      <span class="vn-btns"><button class="vn-x" data-ba="unpost">Take the post down</button></span></div>`
    : `<h4 class="pa-h">Post a job on Burrow</h4><div class="vn-card">${staff.length >= v.slots ? `<p class="vn-fact">The team is full for a ${esc(v.lvl.toLowerCase())} (${v.slots} people). Grow the business to hire more.</p>`
      : `<span class="vn-btns">${v.roles.map((r, i) => `<button data-ba="post:${i}">${esc(r)}</button>`).join("")}</span><p class="vn-fact">NPCs and your own family can apply from Burrow.</p>`}</div>`;
  return `${baKpis([["Team", `${staff.length}/${v.slots}`], ["Wages a day", vnCoins(staff.reduce((a, s) => a + s.payNow, 0))], ["Mood", staff.length ? baMood(staff.reduce((a, s) => a + s.mood, 0) / staff.length) : "—"]])}
    ${hiring}<h4 class="pa-h">${owner ? "Team" : "Your team"}</h4>${list}${owner ? baNote(c, b) : ""}`;
}

// ---- money: cash flow, loans, investors
function baMoney(c, b, v, T, owner) {
  const Td = b.today || {}, t = v.t;
  if (t.fund) return `${baKpis([["Fund size", vnCoins(b.cash)], [`${esc(v.owner)}'s stake`, vnCoins(b.mine || 0)], ["Fee today", vnCoins(b.fee || 0)]])}
    <div class="vn-card"><div class="vn-row"><span>Outside investors' money</span><b>${vnCoins(Math.max(0, b.cash - (b.mine || 0)))}</b></div><div class="vn-row"><span>Reputation with investors</span><b>${Math.round(b.rep || 0)}/100</b></div>
    <p class="vn-fact">Good years bring in investors, bad ones send them away. ${esc(v.owner)} keeps a small fee plus 20% of what investors earn.</p></div>${baTrack(b, v)}${baEdge(c, b, v, owner)}${baMarket(c, b, v, owner)}`;
  const flow = [["Sales", Td.rev - (Td.con || 0), "plus"], ["Contract", Td.con, "plus"], ["Rent", -(Td.rent || 0)], ["Wages", -(Td.wages || 0)], ["Materials", -(Td.mat || 0)], ["Research", -(Td.rnd || 0)], ["Loan payment", -(Td.loan || 0)]].filter(r => r[1]);
  const L = b.loan, bank = v.bank, off = b.offer;
  const inv = off ? `<div class="vn-ask"><p>${esc(off.who.charAt(0).toUpperCase() + off.who.slice(1))} offers <b>${vnCoins(off.amt)}</b> for <b>${baPct(off.pct)}</b> of ${esc(b.name)}.</p><span class="kd-two"><button class="kd-btn" data-ba="invest:yes">Take it</button><button class="kd-btn alt" data-ba="invest:no">Say no</button></span></div>` : "";
  return `${inv}${baKpis([["Cash", vnCoins(b.cash)], ["Today", (Td.profit >= 0 ? "+" : "") + vnCoins(Td.profit || 0), Td.profit >= 0 ? "up" : "down"], ["30 days", (v.profit30 >= 0 ? "+" : "") + vnCoins(v.profit30), v.profit30 >= 0 ? "up" : "down"]])}
    ${baTrack(b, v)}<h4 class="pa-h">Today's money</h4><div class="pa-list">${flow.map(([l, n, cls]) => `<div class="pa-row"><span class="pa-grow">${l}</span><span class="pa-val ${n > 0 ? "plus" : ""}">${n > 0 ? "+" : "−"}${vnCoins(Math.abs(n))}</span></div>`).join("")}</div>
    <h4 class="pa-h">Who owns it</h4><div class="vn-card"><div class="vn-row"><span>${esc(v.owner)}</span><b>${baPct(v.equity)}</b></div>${(b.investors || []).map(i => `<div class="vn-row"><span>${esc(i.who)}</span><small>${baPct(i.pct)} · put in ${vnCoins(i.amt)}</small></div>`).join("")}</div>
    <h4 class="pa-h">Bank</h4>${L ? `<div class="vn-card"><div class="vn-row"><span>Loan left</span><b>${vnCoins(L.left)}</b></div><div class="vn-row"><span>Paid back</span><b>${vnCoins(L.pay)} a day</b></div>
      ${owner ? `<span class="vn-btns"><button data-ba="repay" ${b.cash < Math.round(L.left * 0.97) ? "disabled" : ""}>Pay it all off · ${vnCoins(Math.round(L.left * 0.97))}</button></span>` : ""}</div>`
    : `<div class="pa-list">${bank.offers.map(o => `<div class="pa-row"><span class="pa-grow"><b>${vnCoins(o.amt)} over ${o.label}</b><small>Pay back ${vnCoins(o.total)} · ${vnCoins(o.pay)} a day</small></span>${owner ? `<button class="kd-btn" data-ba="borrow:${o.i}">Suggest</button>` : ""}</div>`).join("")}</div>`}
    ${owner && b.cash < t.cap * 0.15 ? `<span class="vn-btns"><button data-ba="bail:1000">Family puts in 1,000</button></span>` : ""}${owner ? baNote(c, b) : ""}`;
}

// ---- growth: levels, promotion, new products
function baGrowth(c, b, v, T, owner) {
  const day = today(), L = Venture.LEVELS;
  return `${baWish(b, v)}${baEdge(c, b, v, owner)}${baMarket(c, b, v, owner)}<h4 class="pa-h">Size</h4><div class="vn-card"><div class="ba-ladder">${L.map((x, i) => `<span class="${i < b.level ? "done" : i === b.level ? "on" : ""}"><i></i>${x.label}</span>`).join("")}</div>
      ${v.next ? `<p class="vn-fact">Next: a ${esc(v.next.label.toLowerCase())} for ${vnCoins(v.next.cost)} from the business. Bigger team, more ${esc(v.t.unit)}, higher rent.</p>${owner ? `<span class="vn-btns"><button data-ba="grow" ${b.cash < v.next.cost || b.wish ? "disabled" : ""}>Suggest growing</button></span>` : ""}` : `<p class="vn-fact">As big as it gets.</p>`}</div>
    <h4 class="pa-h">Get the word out</h4><div class="vn-card"><div class="vn-row"><span>Promotion on Chirp</span><b>${vnCoins(v.promoCost)}</b></div><p class="vn-fact">${b.buzz > day ? `Running now, ${b.buzz - day} more day${b.buzz - day > 1 ? "s" : ""}.` : "More customers for about a week."}</p>
      ${owner ? `<span class="vn-btns"><button data-ba="promo" ${b.buzz > day || b.cash < v.promoCost ? "disabled" : ""}>Suggest a promo</button></span>` : ""}</div>
    <h4 class="pa-h">Something new</h4><div class="vn-card"><div class="vn-row"><span>${v.t.hits ? "New feature" : v.t.cat === "shop" ? "New menu item" : "New product"}</span><b>${vnCoins(v.labCost)}</b></div><p class="vn-fact">${b.sig ? `Known for ${esc(b.sig)} now. ` : ""}It might become a signature, or flop.${b.lab > day - 20 ? ` Next try in ${b.lab + 20 - day} days.` : ""}</p>
      ${owner ? `<span class="vn-btns"><button data-ba="product" ${b.lab > day - 20 || b.cash < v.labCost ? "disabled" : ""}>Suggest trying it</button></span>` : ""}</div>
    ${owner ? `<span class="vn-btns ba-end"><button class="vn-x" data-ba="close">Suggest closing</button></span>${baNote(c, b)}` : ""}`;
}

// ---- partners: who supplies it, who buys from it
function baPartners(c, b, v, T, owner) {
  const day = today();
  const sup = v.supplyList.length ? `<h4 class="pa-h">Suppliers</h4><div class="pa-list">${v.supplyList.map(s => `<div class="pa-row"><span class="pa-grow"><b>${esc(s.name)}</b><small>${esc(s.label)}${s.fam ? " · family, cheaper and better" : ""}</small></span></div>`).join("")}</div>
    ${owner ? `<div class="vn-card"><small class="ba-lbl">Materials quality</small>${baAdv(c, "supplier", Object.entries(Venture.SUPPLY).map(([k, x]) => [k, x.label]), b.supply || "standard")}<p class="vn-fact">Cheap saves money but customers notice. Premium costs more and lifts quality.</p></div>` : ""}` : "";
  const cl = v.t.b2b ? `<h4 class="pa-h">Clients</h4><div class="pa-list">${v.clientList.slice(0, 8).map(o => `<div class="pa-row"><span class="pa-grow"><b>${esc(o.name)}</b><small>${esc(o.kind)}${o.fam ? " · family" : ""}</small></span></div>`).join("") || `<div class="pa-row">No clients in town right now.</div>`}</div>
    <div class="vn-card">${b.contract && b.contract.until > day ? `<div class="vn-row"><span>Contract with ${esc(b.contract.name)}</span><b>+${vnCoins(b.contract.per)}/day</b></div><p class="vn-fact">${b.contract.until - day} days left.</p>`
      : `<div class="vn-row"><span>A 90-day contract</span><b>steady orders</b></div><p class="vn-fact">Charm and reputation decide if someone signs.${b.pitched > day - 20 ? ` Next pitch in ${b.pitched + 20 - day} days.` : ""}</p>${owner ? `<span class="vn-btns"><button data-ba="contract" ${b.pitched > day - 20 ? "disabled" : ""}>Suggest pitching</button></span>` : ""}`}</div>` : "";
  return sup + cl + (owner ? baNote(c, b) : "");
}

// ---- alumni: read-only memory of a place they used to work
function baAlumni(c, b, v, T) {
  const a = (c.st.alumni || []).filter(x => x.biz === b.id).slice(-1)[0] || {};
  return `<div class="ba old" style="--ba:#8e8e93;--ba-soft:#f2f2f7"><header class="ba-head"><span class="ba-ic">${T.ic}</span><span class="pa-grow"><b>${esc(a.name || b.name)}</b><small>Alumni · read only</small></span></header>
    <div class="ba-body"><div class="vn-card"><div class="vn-row"><span>${esc(c.name)} was</span><b>${esc(a.role || "Staff")}</b></div><div class="vn-row"><span>From</span><b>${fmtDate(a.from)}</b></div><div class="vn-row"><span>Until</span><b>${fmtDate(a.to)}</b></div><div class="vn-row"><span>Why it ended</span><b>${esc(a.why || "Moved on")}</b></div></div>
    <div class="vn-card"><div class="vn-row"><span>The place now</span><b>${b.closed ? "Closed" : `${esc(v.lvl)}, run by ${esc(v.owner)}`}</b></div>${!b.closed ? `<div class="vn-row"><span>Reputation</span><b>${Math.round(b.rep || 0)}/100</b></div>` : ""}</div>
    <p class="pa-note">Old work apps are memories. Nothing here can be changed.</p></div></div>`;
}

// ---- first open: three short cards that say what the app is for (once per app kind, per device)
function baIntro(k, steps) {
  if (PH) PH.introKey = k;  // the "?" on this screen replays this card
  try { if (localStorage.getItem("intro:" + k)) return ""; } catch (e) { return ""; }
  Tele.intro("app", k, "tampil");
  return `<div class="ba-intro" data-intro="${k}"><div class="ba-intro-card">${steps.map((s, i) => `<section class="${i ? "" : "on"}"><span class="ba-intro-ic">${s[0]}</span><b>${esc(s[1])}</b><p>${esc(s[2])}</p></section>`).join("")}
    <div class="ba-intro-dots">${steps.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div><button class="kd-btn" data-intro-next="1">Next</button></div></div>`;
}
function baIntroBind(v) {
  // lives on the phone screen itself so it covers what's visible, not the whole scroll
  const boxes = [...v.querySelectorAll(".ba-intro")];
  for (const box of boxes) { const ba = v.querySelector(".ba"); if (ba) box.style.cssText = ba.style.cssText; PH.screen.appendChild(box); }
  boxes.forEach(box => box.querySelectorAll("[data-intro-next]").forEach(btn => btn.onclick = () => {
    const box = btn.closest(".ba-intro"), S = [...box.querySelectorAll("section")], D = [...box.querySelectorAll(".ba-intro-dots i")], i = S.findIndex(s => s.classList.contains("on"));
    if (i >= S.length - 1) { Tele.intro("app", box.dataset.intro, "selesai"); try { localStorage.setItem("intro:" + box.dataset.intro, "1"); } catch (e) {} box.remove(); return; }
    S[i].classList.remove("on"); S[i + 1].classList.add("on"); D[i].classList.remove("on"); D[i + 1].classList.add("on");
    if (i + 1 === S.length - 1) btn.textContent = "Got it";
  }));
}
// one option row: what it is and what it will probably do, before it's tapped
const baOpt = (cmd, label, eff, on) => `<button class="ba-opt${on ? " on" : ""}" data-ba="${cmd}"><i></i><span class="pa-grow"><b>${esc(label)}</b><small>${eff}</small></span></button>`;
// a decision card: the question plus each answer's consequence
const baCard = (t, opts, pre, who) => `<div class="ba-att ask"><small class="ba-lbl">Needs a decision${who ? ` · ${esc(who)} decides tomorrow if you don't` : ""}</small><p>${esc(t)}</p>
  ${opts.map(([k, l, eff]) => `<button class="ba-ans" data-ba="${pre}:${k}"><b>${esc(l)}</b><small>${esc(eff)}</small></button>`).join("")}</div>`;
const baResult = (lbl, t, good) => `<div class="ba-att ${good === true ? "good" : good === false ? "bad" : ""}"><small class="ba-lbl">${esc(lbl)}</small><p>${esc(t)}</p></div>`;

// ---- bakery: Today
function baBakeToday(c, b, v, T, owner) {
  const day = b.demo ? b.vday : today(), Bk = b.bake, Td = b.today || {}, who = v.owner;
  let hero;
  const isCafe = b.tpl === "cafe";
  if (!Bk) hero = `<div class="ba-hero"><b>${isCafe ? "The café opens tomorrow morning." : "The first bake is tomorrow morning."}</b><small>${esc(who)} will guess how much to make. You can suggest a plan below.</small></div>`;
  else {
    const out = Bk.rows.filter(r => r.lost > 0).sort((a, z) => z.lost - a.lost)[0], over = Bk.rows.filter(r => r.left > 0).sort((a, z) => z.left - a.left)[0];
    const outs = Bk.rows.filter(r => r.lost > 0), lostC = Math.max(1, Math.round(Bk.lost / 1.4));
    const sub = outs.length > 1 && Bk.lost >= 3 ? `${outs.length} of ${Bk.rows.length} breads sold out. About ${lostC} customers left without what they came for.${over && over.left >= 4 ? ` ${over.left} ${esc(over.p)} were thrown out.` : ""}`
      : out && out.lost >= 3 ? `${esc(out.p)} sold out early. About ${lostC} customers left without one.` : over && over.left >= 4 ? `${over.left} ${esc(over.p)} were left over and thrown out.` : "Almost nothing wasted and nobody turned away. A good bake.";
    const cafe = Bk.cups != null, sub2 = cafe ? `${Bk.food} bought food.${Bk.walk ? ` <span class="warn">${Bk.walk} gave up on the line.</span>` : ""}${Bk.music ? " Live music tonight." : ""} ${sub.replace("breads", "foods").replace("A good bake.", "A good day.")}` : sub;
    hero = `<div class="ba-hero"><small class="ba-lbl">${Bk.d === day ? (cafe ? "Today" : "This morning") : (cafe ? "Last day" : "Last bake")}</small><b>${cafe ? `${Bk.cups} cups poured` : `${Bk.cust} customers`}, ${(Td.profit || 0) >= 0 ? "+" : ""}${vnCoins(Td.profit || 0)} coins profit.</b><small>${sub2}</small>
      <div class="ba-trays">${Bk.rows.map(r => `<div><span class="pa-grow">${esc(r.p)}${r.p === b.sig ? " ⭐" : ""}</span><em>${r.sold}/${r.plan}</em>${r.lost ? `<i class="ba-tag">Sold out</i>` : r.left ? `<i class="ba-tag left">${r.left} left</i>` : `<i class="ba-tag ok">Just right</i>`}</div>`).join("")}</div></div>`;
  }
  // the one thing that needs attention
  let att = baWish(b, v);
  if (!att && b.card && v.cardOpts) att = baCard(b.card.t, v.cardOpts, "card", owner ? who : "");
  if (!att && b.adv && day - b.adv.d <= 1) att = baResult("How your plan went", b.adv.t, b.adv.ok);
  if (!att && b.cardLast && day - b.cardLast.d <= 2) att = baResult(b.cardLast.by === "you" ? "You decided" : `${who} decided`, b.cardLast.t, null);
  // tomorrow's bake: a draft you can change before sending it as one suggestion
  const A = PH.ba || {}, P = v.bakeProds || [];
  if (!A.draft || A.draft.length !== P.length || A.draftB !== b.id) { A.draft = P.map(p => b.plan && b.plan[p] != null ? b.plan[p] : null); A.draftB = b.id; }
  const usual = P.map((p, i) => Bk && Bk.rows[i] ? (Bk.rows[i].mine ? null : Bk.rows[i].plan) : null);
  const want = P.map((p, i) => Math.round((b.dem7 && b.dem7[p]) || (Bk && Bk.rows[i] ? Bk.rows[i].dem : 0)));
  const rows = P.map((p, i) => {
    const q = A.draft[i], val = q == null ? usual[i] : q, D = want[i];
    const eff = val == null || !D ? "" : val > D * 1.12 ? `≈ ${val - D} left over` : val < D * 0.92 ? `≈ ${D - val} people miss out` : "≈ about right";
    return `<div class="ba-step"><span class="pa-grow"><b>${esc(p)}</b><small>Usually ${D || "?"} wanted · <span class="${/left|miss/.test(eff) ? "warn" : "okc"}">${eff}</span></small></span>
      <button data-ba="dq:${i}:-5" aria-label="Less">−</button><em>${val == null ? "?" : val}${q == null ? `<small>${esc(who)}'s guess</small>` : `<small>your plan</small>`}</em><button data-ba="dq:${i}:5" aria-label="More">+</button></div>`;
  }).join("");
  const dirty = A.draft.some((q, i) => q !== (b.plan && b.plan[P[i]] != null ? b.plan[P[i]] : null));
  const plan = owner ? `<h4 class="pa-h">${isCafe ? "Tomorrow's food" : "Tomorrow's bake"}</h4><div class="vn-card">${rows}
      <p class="vn-fact">${isCafe ? `The kitchen makes about ${Bk ? Bk.cap : "?"} a morning. Leftovers go in the bin. Running out means fewer people stay for food.` : `The oven fits about ${Bk ? Bk.cap : "?"} a morning. Leftovers cost flour and butter. Missed customers hurt the reputation.`}</p>
      <span class="vn-btns"><button data-ba="plansend" ${dirty ? "" : "disabled"}>Suggest this plan</button><button data-ba="planauto">Let ${esc(who)} guess</button></span></div>` : "";
  const op = b.open || "7", seat = b.seat || "mix";
  const hours = owner && isCafe ? `<h4 class="pa-h">Seats</h4><div class="vn-card">${v.seatList.map(o => baOpt("seat:" + o.k, o.label, { takeaway: "About 10% more customers, fewer stay for food.", mix: "Normal.", seats: "About 8% fewer customers, but they spend more and eat more." }[o.k], seat === o.k)).join("")}</div>
    <h4 class="pa-h">Live music</h4><div class="vn-card">${baOpt("music:on", "Friday and Saturday nights", `About 35% more customers those nights, and people talk about it. ${vnCoins(v.musicCost)} coins a night for the band.`, !!b.music)}${baOpt("music:off", "No music", "Quiet evenings, no extra cost.", !b.music)}</div>
    <h4 class="pa-h">Yesterday's food</h4><div class="vn-card">${baOpt("dayold:on", "Sell it at half price", "A little extra money from leftovers. Some regulars think it looks cheap.", !!b.dayold)}${baOpt("dayold:off", "Throw it away", "No extra money. Reputation stays clean.", !b.dayold)}</div>`
    : owner ? `<h4 class="pa-h">Opening time</h4><div class="vn-card">
      ${baOpt("open:6", "6 am", "About 15% more customers (early commuters). Tiring if they're not hard-working.", op === "6")}
      ${baOpt("open:7", "7 am", "Normal.", op === "7")}
      ${baOpt("open:9", "9 am", "About 16% fewer customers. Everyone is rested.", op === "9")}</div>
    <h4 class="pa-h">Yesterday's bread</h4><div class="vn-card">${baOpt("dayold:on", "Sell it at half price", "A little extra money from leftovers. Some regulars think it looks cheap.", !!b.dayold)}${baOpt("dayold:off", "Throw it away", "No extra money. Reputation stays clean.", !b.dayold)}</div>` : "";
  const g = v.goal;
  const goal = g ? `<h4 class="pa-h">Goal</h4><div class="vn-card"><div class="vn-row"><span>Grow into a <b>${esc(g.label.toLowerCase())}</b></span></div>
      <div class="vn-meter"><span>Cash</span>${vnBar(b.cash / g.cash, "var(--ba)")}<small>${vnCoins(b.cash)} / ${vnCoins(g.cash)}</small></div>
      <div class="vn-meter"><span>Reputation</span>${vnBar((b.rep || 0) / g.rep, "#F5B82E")}<small>${Math.round(b.rep || 0)} / ${g.rep}</small></div></div>` : "";
  return hero + att + plan + hours + goal + (owner ? baNote(c, b) : "");
}
// bakery money tab: money, growing, suppliers in one place
function baBakeMoney(c, b, v, T, owner) {
  return baMoney(c, b, v, T, owner).replace(baNote(c, b), "") + `<h4 class="pa-h">Grow</h4>` + baGrowth(c, b, v, T, owner).replace(baNote(c, b), "") + baPartners(c, b, v, T, owner);
}

// ---- service businesses: salon, tutoring, cleaning, courier
const SVC_UI = {
  salon: { unit: "customers", lever: "Bookings", modes: { walkin: ["Walk-ins only", "No no-shows. Chairs sit empty between rushes, and long queues send people away."], mix: ["Bookings and walk-ins", "Normal."], booked: ["Bookings only", "Chairs stay full and it feels a bit fancier. Fewer walk-ins, and more no-shows."] },
    extra: ["Reminder texts", "Send a reminder the day before", "Far fewer no-shows. Half a coin per booking.", "No reminders", "Free."],
    intro: ["Every day the chairs fill up with bookings and walk-ins. Some booked customers never show up.", "Who came, who walked out of the queue, and who didn't show.", "Choose bookings or walk-ins, send reminders, answer the weekly decisions."] },
  tutoring: { unit: "students", lever: "Class size", modes: { solo: ["One-on-one", "Almost twice the price and the best results, but only half as many students fit."], small: ["Small groups", "Normal."], big: ["Big classes", "Cheaper, so more families sign up and more fit in. Results drop."] },
    extra: ["Progress notes to parents", "Write a weekly note home", "Parents trust it more and results improve. Writing them takes a little teaching time.", "No notes", "More time for teaching."],
    intro: ["Every day students come for lessons. Good results bring more families. Bad ones send them away.", "How many came, how many are improving, and who was turned away.", "Pick the class size, write notes to parents, answer the weekly decisions."] },
  cleaning: { unit: "jobs", lever: "How they clean", modes: { quick: ["Quick clean", "More jobs a day at a lower price. More complaints."], standard: ["Standard clean", "Normal."], deep: ["Deep clean", "Fewer jobs a day at a 30% higher price. Almost no complaints."] },
    extra: ["Supplies", "Eco supplies", "Some clients pick you for it, and it's kinder to the town. Supplies cost 40% more.", "Regular supplies", "Cheaper."],
    intro: ["Every day the crew cleans offices, shops and homes. A sloppy job means a complaint.", "Which sites were cleaned, and which clients complained.", "Choose quick or deep cleaning, try eco supplies, answer the weekly decisions."] },
  courier: { unit: "deliveries", lever: "Delivery promise", modes: { nextday: ["Next day", "Cheaper and easy to plan. More parcels fit, and hardly any arrive late."], sameday: ["Same day", "Normal."], express: ["Within two hours", "Pays 55% more, but riders carry fewer and more arrive late."] },
    extra: ["Live tracking", "Live tracking for customers", "A little more business, and late parcels annoy people half as much. 0.6 coins a parcel.", "No tracking", "Free."],
    intro: ["Every day the riders carry parcels across town. Late ones cost the reputation.", "The routes, what arrived on time, and what was turned away.", "Choose the delivery promise, try live tracking, answer the weekly decisions."] },
};
const SVC_NAMES = ["Mrs. Hazel", "Mr. Quill", "Little Pip", "Granny Moss", "Miss Clover", "Mr. Bramble", "Mrs. Fennel", "Young Rowan", "Mr. Tumble", "Mrs. Thistle", "Old Mr. Burr", "Juniper"];
function baSvcList(b, v, S, day) {
  const h = k => hashStr(b.id + S.d + k);
  if (b.tpl === "salon") {
    const servs = [...new Set([b.sig, ...v.t.prod, "Cut and style", "Colour", "Trim", "Wash and blow-dry"].filter(Boolean))], n = Math.min(7, S.cust + S.noshow + Math.min(2, S.turned));
    const rows = Array.from({ length: n }, (_, i) => { const m = 9 * 60 + i * 50, st = i < S.noshow ? "noshow" : i >= S.cust + S.noshow ? "left" : h("w" + i) % 100 < (1 - (Venture.SVC.salon.opts[S.mode].booked || 0)) * 100 ? "walk" : "booked";
      return `<div><em>${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}</em><span class="pa-grow">${esc(SVC_NAMES[h("n" + i) % SVC_NAMES.length])} · ${esc(servs[h("s" + i) % servs.length])}</span>${st === "noshow" ? `<i class="ba-tag left">No-show</i>` : st === "left" ? `<i class="ba-tag">Left the queue</i>` : st === "walk" ? `<i class="ba-tag ok">Walk-in</i>` : `<i class="ba-tag ok">Booked</i>`}</div>`; });
    return `<div class="ba-trays">${rows.join("")}</div>`;
  }
  if (b.tpl === "tutoring") {
    const per = { solo: 1, small: 5, big: 14 }[S.mode], subj = ["Maths", "Reading", "Science", "Languages", "Exam prep", "Writing"], groups = Math.max(1, Math.round(S.cust / per)), n = Math.min(6, groups);
    const rows = Array.from({ length: n }, (_, i) => { const k = per === 1 ? 1 : Math.max(1, Math.round(S.cust / groups)), imp = Math.round(k * S.pass);
      if (per === 1) return `<div><span class="pa-grow">${esc(SVC_NAMES[h("n" + i) % SVC_NAMES.length].replace(/^(Mrs?\.|Miss|Granny|Old Mr\.|Young) /, ""))} · ${esc(subj[(h("s") + i) % subj.length])}</span>${h("p" + i) % 100 < S.pass * 100 ? `<i class="ba-tag ok">Improving</i>` : `<i class="ba-tag left">Struggling</i>`}</div>`;
      return `<div><span class="pa-grow">${esc(subj[(h("s") + i) % subj.length])}</span><em>${k} students · ${imp} improving</em></div>`; });
    return `<div class="ba-trays">${rows.join("")}${groups > n ? `<div><span class="pa-grow">and ${groups - n} more ${per === 1 ? "students" : groups - n > 1 ? "classes" : "class"}</span></div>` : ""}</div>`;
  }
  if (b.tpl === "cleaning") {
    const cl = (v.clientList || []).filter(o => !o.many), kinds = ["A family home", "A corner shop", "An office floor", "A dentist", "A school hall", "A gym"], n = Math.min(7, S.cust);
    const rows = Array.from({ length: n }, (_, i) => { const nm = cl.length && i < cl.length ? cl[i].name : kinds[(h("k") + i) % kinds.length];
      return `<div><span class="pa-grow">${esc(nm)}</span>${i < S.bad ? `<i class="ba-tag left">Complaint</i>` : `<i class="ba-tag ok">Spotless</i>`}</div>`; });
    return `<div class="ba-trays">${rows.join("")}${S.cust > n ? `<div><span class="pa-grow">and ${S.cust - n} more</span></div>` : ""}</div>`;
  }
  return "";
}
function baSvcToday(c, b, v, T, owner) {
  const day = b.demo ? b.vday : today(), S = b.svc, Td = b.today || {}, who = v.owner, U = SVC_UI[b.tpl], pl = (n, w) => `${n} ${n === 1 ? w.replace(/s$/, "") : w}`;
  let hero;
  if (!S) hero = `<div class="ba-hero"><b>${esc(b.name)} opens tomorrow.</b><small>${esc(who)} will run it the usual way. You can suggest how below.</small></div>`;
  else {
    const bits = [];
    if (b.tpl === "salon") { if (S.noshow) bits.push(`${pl(S.noshow, "customers")} booked and didn't show.`); if (S.turned) bits.push(`<span class="warn">${S.turned} walked out of the queue.</span>`); if (!bits.length) bits.push("Every chair was put to good use."); }
    if (b.tpl === "tutoring") { bits.push(`${Math.round(S.pass * 100)}% of students are improving.`); if (S.turned) bits.push(`<span class="warn">${pl(S.turned, "families")} heard the classes are full.</span>`); }
    if (b.tpl === "cleaning") { bits.push(S.bad ? `<span class="warn">${pl(S.bad, "clients")} complained.</span>` : "No complaints."); if (S.turned) bits.push(`${pl(S.turned, "jobs")} turned down, the crew was full.`); }
    if (b.tpl === "courier") { bits.push(S.bad ? `<span class="warn">${pl(S.bad, "parcels")} arrived late.</span>` : "Everything arrived on time."); if (S.turned) bits.push(`${pl(S.turned, "parcels")} turned away, the riders were full.`); }
    if (S.fest) bits.push(b.tpl === "tutoring" ? "Exam season." : "Holiday rush.");
    hero = `<div class="ba-hero"><small class="ba-lbl">${S.d === day ? "Today" : "Last day"} · ${esc(U.modes[S.mode][0].toLowerCase())}</small><b>${pl(S.cust, U.unit)}, ${(Td.profit || 0) >= 0 ? "+" : ""}${vnCoins(Td.profit || 0)} coins profit.</b><small>${bits.join(" ")}</small>
      ${baSvcList(b, v, S, day)}</div>`;
    if (b.tpl === "courier") hero += baRoutes(b, v, Td);
  }
  let att = baWish(b, v);
  if (!att && b.card && v.cardOpts) att = baCard(b.card.t, v.cardOpts, "card", owner ? who : "");
  if (!att && b.cardLast && day - b.cardLast.d <= 2) att = baResult(b.cardLast.by === "you" ? "You decided" : `${who} decided`, b.cardLast.t, null);
  const mode = v.svc.mode, adv = owner ? `<h4 class="pa-h">${esc(U.lever)}</h4><div class="vn-card">${v.svc.opts.map(k => baOpt("mode:" + k, U.modes[k][0], U.modes[k][1], mode === k)).join("")}</div>
    <h4 class="pa-h">${esc(U.extra[0])}</h4><div class="vn-card">${baOpt("extra:on", U.extra[1], U.extra[2], !!b.extra)}${baOpt("extra:off", U.extra[3], U.extra[4], !b.extra)}</div>` : "";
  const g = v.goal;
  const goal = g ? `<h4 class="pa-h">Goal</h4><div class="vn-card"><div class="vn-row"><span>Grow into a <b>${esc(g.label.toLowerCase())}</b></span></div>
      <div class="vn-meter"><span>Cash</span>${vnBar(b.cash / g.cash, "var(--ba)")}<small>${vnCoins(b.cash)} / ${vnCoins(g.cash)}</small></div>
      <div class="vn-meter"><span>Reputation</span>${vnBar((b.rep || 0) / g.rep, "#F5B82E")}<small>${Math.round(b.rep || 0)} / ${g.rep}</small></div></div>` : "";
  return hero + att + adv + goal + (owner ? baNote(c, b) : "");
}


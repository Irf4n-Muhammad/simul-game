// ---- Bazaar: the town's store. Looks and works like a real online shop: new things, limited drops that sell out
// for everyone, pre-owned goods from a dealer, and the things your creature owns.
let bz = null;
const BZ_CATS = [["all", "All"], ["Fashion", "Clothing"], ["Shoes", "Shoes"], ["Bag", "Bags"], ["Watch", "Watches"], ["Phone", "Phones"], ["Car", "Cars"], ["Collectible", "Collectibles"], ["Classes", "Classes"]];
const BZ_COPY = {
  tee: "Soft cotton tee in a relaxed fit. The one you reach for every day.", jacket: "Tailored designer jacket with a notch collar and a hidden zip.",
  couture: "One-off couture gown, cut and finished by hand in Old Town.", sneakers: "Low-top leather sneakers on a cushioned sole.",
  boots: "Full-grain leather boots that soften and darken with wear.", phone: "A simple, reliable phone with a long battery life.",
  flagship: "This year's flagship. Titanium frame, three cameras, the brightest screen yet.", canvas: "Heavy canvas tote with a woven stripe. Holds a whole day.",
  luxbag: "Structured top-handle bag in smooth leather with a gold clasp.", steelwatch: "Stainless steel watch with a sunburst dial. Built for decades.",
  goldwatch: "Solid gold watch on a leather strap. Few are made each year.", scooter: "A cheerful city scooter. Easy to park, fun to ride.",
  sedan: "Comfortable family sedan with room for everyone.", sports: "Two doors, a long hood and a lot of power.",
  supercar: "Hand-built supercar. Only a handful reach Old Town each year.", vinyl: "A pressing on heavy vinyl with an art sleeve.",
  comic: "This month's issue of Burrow Comics.", figurine: "A hand-painted vinyl figure on a display base.", print: "A signed art print, framed and ready to hang.",
  gym: "A month at the Old Town gym.", coding: "A month-long coding course in the evenings.", artclass: "A month of art classes at the studio.", drama: "A month at the drama club.",
};
const bzUp = s => esc(String(s).toUpperCase());
const bzAge = n => n <= 0 ? "today" : `in ${n} day${n > 1 ? "s" : ""}`;
const bzKindTag = k => k === "antique" ? "Antique" : k === "vintage" ? "Vintage" : "";

function showBazaar(tab = "new", back = null) {
  if (!cur) return;
  closeSheet(); Tele.layar("app", "bazaar:" + tab);
  if (bz) bz.el.remove();
  const el = document.createElement("div"); el.className = "bz2"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Bazaar");
  el.innerHTML = `<header class="bz2-top"><button class="bz2-back" aria-label="Back">‹</button><span class="bz2-mark">BAZAAR</span><span class="bz2-right"><button class="bz2-find" aria-label="Search"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><span class="bz2-coins" id="bzWallet"></span></span></header>
    <div class="bz2-sbar" hidden>${srchBox("Search Bazaar", "", "bz2-srch")}<button class="bz2-cancel">CANCEL</button></div>
    <nav class="bz2-tabs">${[["new", "New"], ["limited", "Limited"], ["used", "Pre-owned"], ["mine", "My things"]].map(([k, l]) => `<button data-tab="${k}">${l}<i hidden></i></button>`).join("")}</nav>
    <div class="bz2-body" id="bzBody"></div>`;
  (PH ? PH.screen : $("app")).appendChild(el);
  bz = { el, c: game.home.get(cur.id), tab, back, view: null, cat: "all" };
  el.querySelector(".bz2-back").onclick = () => bz.view ? bzShow(bz.tab) : closeBazaar();
  const bar = el.querySelector(".bz2-sbar"), bq = bar.querySelector("input");
  const run = () => { bz.q = bq.value.trim(); if (!bz.q) return bzShow(bz.tab); const body = $("bzBody"); body.innerHTML = bzSearch(bz.q); Tele.cari("bazaar", bz.q, srchN); body.scrollTop = 0; bzBind(body); shotFill(body); };
  el.querySelector(".bz2-find").onclick = () => { bar.hidden = false; el.classList.add("searching"); bq.focus(); };
  el.querySelector(".bz2-cancel").onclick = () => { bar.hidden = true; el.classList.remove("searching"); bq.value = ""; bz.q = ""; bzShow(bz.tab); };
  bq.oninput = run;
  el.querySelectorAll(".bz2-tabs [data-tab]").forEach(b => b.onclick = () => bzShow(b.dataset.tab));
  bzShow(tab);
  requestAnimationFrame(() => el.classList.add("on"));
}
function closeBazaar() {
  if (!bz) return;
  const s = bz; s.el.classList.remove("on"); bz = null;
  setTimeout(() => s.el.remove(), 320);
  if (s.back === "phone") phGo("home"); else if (s.back) showLife(s.back);
}
function bzShow(tab, view = null) {
  bz.tab = tab; bz.view = view; bz.c = game.home.get(cur.id);
  bz.el.querySelectorAll(".bz2-tabs [data-tab]").forEach(b => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
  const day = today(), live = Market.drops(day).filter(D => !D.soon && D.left > 0 && !Market.owned(bz.c, day).drops.includes(D.key)).length;
  const dot = bz.el.querySelector('.bz2-tabs [data-tab="limited"] i'); dot.hidden = !live;
  $("bzWallet").textContent = `${Math.round(bz.c.st ? bz.c.st.wallet : 0).toLocaleString("en")} C`;
  bz.el.classList.toggle("detail", !!view);
  const body = $("bzBody");
  if (!view && bz.q) { body.innerHTML = bzSearch(bz.q); body.scrollTop = 0; bzBind(body); shotFill(body); return; }
  body.innerHTML = view ? bzItem(view) : tab === "limited" ? bzLimited() : tab === "used" ? bzUsed() : tab === "mine" ? bzMine() : bzNew();
  body.scrollTop = 0;
  bzBind(body); shotFill(body);
}
function bzBind(body) {
  body.querySelectorAll("[data-item]").forEach(b => b.onclick = () => bzShow(bz.tab, b.dataset.item));
  body.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { bz.cat = b.dataset.cat; bzShow("new"); });
  body.querySelectorAll("[data-go]").forEach(b => b.onclick = () => bzShow(b.dataset.go));
  body.querySelectorAll("[data-do]").forEach(b => b.onclick = () => {
    const [verb, arg] = b.dataset.do.split("|");
    const line = { beli: "Ooh, new!", drop: "Got one! So lucky.", bekas: "A little piece of history.", jual: "Sold!", servis: "Good as new.", simpan: b.dataset.boxed === "1" ? "Back in use." : "Stored safely.", buang: "Gave it away." }[verb];
    if (!game.act(cur.id, `pasar:${verb}:${arg}`)) return say("Can't do that right now.");
    save(); refresh(); say(line);
    if (verb === "servis" || verb === "simpan") return bzShow(bz.tab, bz.view);
    bz.toast = verb === "jual" ? "Sold to the dealer." : verb === "buang" ? "Given away." : "Added to My things.";
    bzShow("mine");
  });
}
// one product tile in a grid
function bzTile(o) {
  return `<button class="bz2-tile" data-item="${esc(o.view)}"><div class="bz2-ph">${shotImg(o.shot)}${o.flag ? `<span class="bz2-flag">${bzUp(o.flag)}</span>` : ""}</div>
    <span class="bz2-name">${bzUp(o.title)}</span>${o.sub ? `<span class="bz2-sub">${o.sub}</span>` : ""}<span class="bz2-price">${o.price}</span></button>`;
}
const bzC = n => `${Math.round(n).toLocaleString("en")} C`;
function bzHero(D, day) {
  const st = D.soon ? `Drops ${bzAge(D.start - day)}` : D.left ? `${D.left} of ${D.made} left` : "Sold out";
  return `<button class="bz2-hero" data-item="drop:${esc(D.key)}">${shotImg({ id: D.line, label: D.label, dark: 1 })}
    <span class="bz2-hero-txt"><small>LIMITED EDITION · ONLY ${D.made} MADE</small><b>${esc(D.label)}</b><span>${bzUp(st)}</span></span></button>`;
}
function bzNew() {
  const c = bz.c, day = today(), mine = Market.owned(c, day);
  const D = Market.drops(day).find(d => !d.soon && d.left > 0) || Market.drops(day).find(d => d.soon);
  const lines = Market.catalog(day).filter(L => bz.cat === "all" || L.cat === bz.cat);
  return `${bz.toast ? "" : ""}${D && bz.cat === "all" ? bzHero(D, day) : ""}
    <div class="bz2-cats">${BZ_CATS.map(([k, l]) => `<button data-cat="${k}" aria-pressed="${bz.cat === k}">${bzUp(l)}</button>`).join("")}</div>
    ${c.st && c.age(day) >= Market.MIN_AGE ? "" : `<p class="bz2-note">${esc(c.name)} can shop from the teen years.</p>`}
    <div class="bz2-grid">${lines.map(L => bzTile({ view: "new:" + L.id, shot: { id: L.id, label: L.label, seed: Market.yearOf(day) }, title: L.label,
      flag: L.cat === "Classes" && mine.pass[L.skill] > day ? "Active" : L.cat === "Classes" ? "" : L.made <= 100 ? "Rare" : "",
      price: bzC(L.price) })).join("")}</div>`;
}
function bzSearch(q) {
  const c = bz.c, day = today(), o = Market.owned(c, day);
  const tile = (view, shot, title, sub, price, flag) => bzTile({ view, shot, title, sub, price, flag });
  const out = [];
  for (const g of o.goods) if (srchHit(q, g.label, Market.LINE[g.id] && Market.LINE[g.id].cat, "mine owned")) out.push(["Yours", tile("mine:" + g.u, { id: g.id, label: g.label, seed: g.ed || Market.yearOf(g.rel) }, g.label, `${g.year} · ${bzUp(g.condLabel)}`, g.trade ? `Dealer pays ${bzC(g.sell)}` : "Not resellable", "Yours")]);
  for (const D of Market.drops(day)) if (srchHit(q, D.label, Market.LINE[D.line].cat, "limited drop edition")) out.push(["Limited", tile("drop:" + D.key, { id: D.line, label: D.label, dark: 1 }, D.label, D.soon ? `Drops ${bzAge(D.start - day)}` : D.left ? `${D.left} of ${D.made} left` : "Sold out", bzC(D.price), "Limited")]);
  for (const L of Market.catalog(day)) if (srchHit(q, L.label, L.cat, "new")) out.push(["New", tile("new:" + L.id, { id: L.id, label: L.label, seed: Market.yearOf(day) }, L.label, bzUp(L.cat), bzC(L.price), L.made <= 100 ? "Rare" : "")]);
  for (const u of Market.usedListings(day, c)) if (srchHit(q, u.it.label, Market.LINE[u.it.id] && Market.LINE[u.it.id].cat, "pre-owned used vintage", String(Market.yearOf(u.it.rel)))) out.push(["Pre-owned", tile("used:" + u.lid, { id: u.it.id, label: u.it.label, seed: u.lid }, u.it.label, `${Market.yearOf(u.it.rel)} · ${bzUp(Market.condLabel(u.it.cond))}`, bzC(u.ask), bzKindTag(u.kind) || "Pre-owned")]);
  srchN = out.length;
  return out.length ? `<p class="bz2-count">${out.length} RESULT${out.length > 1 ? "S" : ""} FOR “${esc(q.toUpperCase())}”</p><div class="bz2-grid">${out.map(x => x[1]).join("")}</div>`
    : `<p class="bz2-note">Nothing matches “${esc(q)}”. Try a category, like bag, phone or car.</p>`;
}
function bzLimited() {
  const c = bz.c, day = today(), mine = Market.owned(c, day);
  return `<div class="bz2-intro"><h2>LIMITED EDITIONS</h2><p>A new drop every 12 days. Only a few are made, and other creatures in Old Town are buying too. When it's gone, it's gone for everyone.</p></div>
    ${Market.drops(day).map(D => {
      const got = mine.drops.includes(D.key), pct = Math.round(100 * D.left / D.made);
      const st = got ? "You got one" : D.soon ? `Drops ${bzAge(D.start - day)}` : D.left ? `${D.left} of ${D.made} left` : "Sold out";
      return `<button class="bz2-wide${!D.soon && !D.left ? " out" : ""}" data-item="drop:${esc(D.key)}"><div class="bz2-ph">${shotImg({ id: D.line, label: D.label, dark: 1 })}</div>
        <span class="bz2-name">${bzUp(D.label)}</span><span class="bz2-price">${bzC(D.price)}</span>
        ${!D.soon && !got ? `<span class="bz2-bar"><i style="width:${pct}%"></i></span>` : ""}<span class="bz2-sub">${bzUp(st)}</span></button>`;
    }).join("")}`;
}
function bzUsed() {
  const c = bz.c, day = today(), U = Market.usedListings(day, c);
  const until = U[0] ? U[0].until - day : 3;
  return `<div class="bz2-intro"><h2>PRE-OWNED</h2><p>Things people in Old Town sold. Most cost less than new. A few are old and rare, and those are worth more every year they survive.</p><small>NEW STOCK ${bzUp(bzAge(until))}</small></div>
    <div class="bz2-grid">${U.sort((a, b) => (b.kind !== "used") - (a.kind !== "used") || b.ask - a.ask).map(u => bzTile({ view: "used:" + u.lid, shot: { id: u.it.id, label: u.it.label, seed: u.lid }, title: u.it.label,
      flag: bzKindTag(u.kind) || (u.it.ed ? "Limited" : ""), sub: `${Market.yearOf(u.it.rel)} · ${bzUp(Market.condLabel(u.it.cond))}`, price: bzC(u.ask) })).join("")}</div>
    ${U.length ? "" : `<p class="bz2-note">Everything's sold. Come back when new stock arrives.</p>`}`;
}
function bzMine() {
  const c = bz.c, day = today(), o = Market.owned(c, day);
  const total = o.goods.reduce((s, g) => s + g.sell, 0), passes = Object.entries(o.pass).filter(([, u]) => u > day);
  const toast = bz.toast; bz.toast = null;
  return `${toast ? `<p class="bz2-toast">${esc(toast)}</p>` : ""}
    <div class="bz2-sum"><div><small>DEALER WOULD PAY</small><b>${bzC(total)}</b></div><div><small>PRESTIGE</small><b>+${o.pts}</b></div><div><small>ITEMS</small><b>${o.goods.length}</b></div></div>
    ${passes.map(([k, u]) => `<div class="bz2-row"><span>${bzUp(Status.SKILL_LABEL[k])} GROWS 25% FASTER</span><span>${u - day} DAYS LEFT</span></div>`).join("")}
    ${o.goods.length ? `<div class="bz2-grid">${o.goods.map(g => bzTile({ view: "mine:" + g.u, shot: { id: g.id, label: g.label, seed: g.ed || Market.yearOf(g.rel) }, title: g.label,
      flag: bzKindTag(g.kind) || (g.boxed ? "Stored" : ""), sub: `${g.year} · ${bzUp(g.condLabel)}`, price: g.trade ? `Dealer pays ${bzC(g.sell)}` : "Not resellable" })).join("")}</div>`
      : `<p class="bz2-note">${esc(c.name)} doesn't own anything yet.</p>`}
    <p class="bz2-note">Things wear out slowly when used. Storage keeps them like new, but nobody sees them. Collections count even in storage. Servicing fixes wear, but collectors pay most for things that were never restored.</p>`;
}
function bzItem(view) {
  const c = bz.c, day = today(), [type, id] = view.split(/:(.*)/s), can = canCare() && c.st && c.age(day) >= Market.MIN_AGE, wallet = c.st ? c.st.wallet : 0;
  const rows = a => `<div class="bz2-rows">${a.filter(Boolean).map(([k, v]) => `<div class="bz2-row"><span>${bzUp(k)}</span><span>${v}</span></div>`).join("")}</div>`;
  const outlook = it => {
    if (!Market.LINE[it.id].trade) return rows([["Resale", "Not resellable"]]);
    return `<h4 class="bz2-h">VALUE OVER TIME</h4><p class="bz2-p">If it's kept in good shape. Most things only lose value. Old things are worth more only when few are left.</p>
      ${rows([["In 1 year", bzC(Market.outlook(it, day, 1))], ["In 4 years", bzC(Market.outlook(it, day, 4))], ["In 6 years", bzC(Market.outlook(it, day, 6))]])}`;
  };
  const buy = (label, act, why) => `<button class="bz2-buy" data-do="${esc(act)}" ${why ? "disabled" : ""}>${bzUp(label)}</button>${why ? `<p class="bz2-why">${esc(why)}</p>` : ""}`;
  const page = (shot, kicker, title, price, copy, body) => `<div class="bz2-hero-img">${shotImg(shot)}</div>
    <section class="bz2-info"><small class="bz2-kick">${bzUp(kicker)}</small><h1>${bzUp(title)}</h1><span class="bz2-cost">${price}</span>${copy ? `<p class="bz2-p">${esc(copy)}</p>` : ""}${body}</section>`;
  if (type === "new") {
    const L = Market.LINE[id], ok = Market.canBuyNew(c, id, day);
    const why = !can ? `${c.name} can't shop right now.` : !ok ? (L.cat === "Classes" ? "Already signed up." : `${c.name} already has one in fine shape.`) : wallet < L.price ? "Not enough coins." : "";
    return page({ id, label: L.label, seed: Market.yearOf(day) }, L.cat === "Classes" ? "Classes" : `${Market.yearOf(day)} collection`, L.label, bzC(L.price), BZ_COPY[id] + (L.desc ? " " + L.desc : ""),
      buy(`Buy · ${bzC(L.price)}`, `beli|${id}`, why) + (L.cat === "Classes" ? "" : rows([["Made this year", L.made.toLocaleString("en")], ["Prestige", `+${L.pts}`], ["Wear", L.wear >= 0.15 ? "Wears fast" : L.wear >= 0.07 ? "Wears slowly" : "Built to last"], ["Resale", L.trade ? "Yes, to the dealer" : "No"]]) + outlook({ id, made: L.made, price: L.price, rel: day, cond: 100 })));
  }
  if (type === "drop") {
    const D = Market.findDrop(id), left = Market.dropLeft(D, day), got = Market.owned(c, day).drops.includes(D.key), L = Market.LINE[D.line];
    const why = D.start > day ? `Drops ${bzAge(D.start - day)}.` : got ? "You got one already." : !left ? "Sold out. Maybe one shows up pre-owned someday." : !can ? `${c.name} can't shop right now.` : wallet < D.price ? "Not enough coins." : "";
    return page({ id: D.line, label: D.label, dark: 1 }, `Limited edition · only ${D.made} made`, D.label, bzC(D.price), BZ_COPY[D.line],
      (D.start <= day ? `<span class="bz2-bar big"><i style="width:${Math.round(100 * left / D.made)}%"></i></span><p class="bz2-why left">${left} of ${D.made} left in Old Town</p>` : "")
      + buy(`Buy · ${bzC(D.price)}`, `drop|${D.key}`, why) + rows([["Edition", `${D.made} made, ever`], ["Prestige", `+${L.pts}`], ["Resale", "Yes, to the dealer"]]) + outlook({ id: D.line, made: D.made, price: D.price, rel: D.start, cond: 100 }));
  }
  if (type === "used") {
    const u = Market.usedListings(day, c).find(x => x.lid === id);
    if (!u) return `<p class="bz2-note">Someone already bought this.</p>`;
    const L = Market.LINE[u.it.id], why = !can ? `${c.name} can't shop right now.` : wallet < u.ask ? "Not enough coins." : "";
    return page({ id: u.it.id, label: u.it.label, seed: u.lid }, [bzKindTag(u.kind) || "Pre-owned", `${Market.yearOf(u.it.rel)} model`].join(" · "), u.it.label, bzC(u.ask), `Sold by ${u.seller}. ${BZ_COPY[u.it.id]}`,
      buy(`Buy · ${bzC(u.ask)}`, `bekas|${u.lid}`, why) + rows([["Condition", Market.condLabel(u.it.cond)], u.it.ed ? ["Edition", `${u.it.made} made`] : null, ["Left in Old Town", u.left <= 1 ? "Maybe the last one" : `About ${u.left.toLocaleString("en")}`], ["Price when new", bzC(u.it.price)], ["Prestige", `+${L.pts}`]]) + outlook(u.it));
  }
  const g = Market.owned(c, day).goods.find(x => x.u === id);
  if (!g) return `<p class="bz2-note">Not here anymore.</p>`;
  const L = Market.LINE[g.id], storable = L.cat !== "Classes" && L.cat !== "Collectible";
  return page({ id: g.id, label: g.label, seed: g.ed || Market.yearOf(g.rel) }, [bzKindTag(g.kind) || "Owned", `${g.year} model`, g.from ? `from ${g.from}` : ""].filter(Boolean).join(" · "), g.label, g.trade ? `Dealer pays ${bzC(g.sell)}` : "Not resellable", "",
    `<span class="bz2-bar big"><i style="width:${Math.round(g.cond)}%"></i></span><p class="bz2-why left">${g.boxed ? "In storage it barely ages, but nobody sees it." : g.cond >= 65 ? "Looking good." : "Worn things give less prestige."}</p>`
    + (g.trade ? buy(`Sell to the dealer · ${bzC(g.sell)}`, `jual|${g.u}`, can ? "" : `${c.name} can't sell right now.`) : buy("Give it away", `buang|${g.u}`, can ? "" : "Not right now."))
    + (g.service ? `<button class="bz2-ghost" data-do="servis|${esc(g.u)}" ${can && wallet >= g.service ? "" : "disabled"}>SERVICE · ${bzC(g.service)}</button>` : "")
    + (storable ? `<button class="bz2-ghost" data-do="simpan|${esc(g.u)}" data-boxed="${g.boxed ? 1 : 0}" ${can ? "" : "disabled"}>${g.boxed ? "TAKE IT OUT AND USE IT" : "PUT IN STORAGE"}</button>` : "")
    + rows([["Condition", g.condLabel + (g.restored ? " · restored" : "")], g.ed ? ["Edition", `${g.made} made`] : null, g.trade ? ["Left in Old Town", g.left <= 1 ? "Maybe the last one" : `About ${g.left.toLocaleString("en")}`] : null, g.trade ? ["Market value", bzC(g.value)] : null, ["Prestige", `+${g.pts}`]])
    + (g.trade ? outlook(g) : ""));
}

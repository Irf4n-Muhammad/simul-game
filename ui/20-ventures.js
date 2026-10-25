// ---- Ventures: family businesses. The creature opens and runs them; you fund, bless, and advise.
const vnCoins = n => `${Math.round(n) < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("en")}`;
function vnSpark(vals, w = 120, h = 32, col) {
  if (!vals.length) return "";
  const mn = Math.min(...vals), mx = Math.max(...vals), lo = mn, hi = mx > mn ? mx : mn + 1, y = v => h - 2 - (v - lo) / (hi - lo || 1) * (h - 4);
  const pts = vals.map((v, i) => `${(i / Math.max(1, vals.length - 1) * w).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const c2 = col || (vals.slice(-7).reduce((a, b) => a + b, 0) >= 0 ? "#248A3D" : "#C9392B");
  return `<svg class="vn-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${lo < 0 && hi > 0 ? `<line x1="0" x2="${w}" y1="${y(0)}" y2="${y(0)}" stroke="#ddd" stroke-dasharray="3 3"/>` : ""}<polyline points="${pts}" fill="none" stroke="${c2}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
const vnBar = (v, col) => `<i class="vn-bar"><b style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%;background:${col}"></b></i>`;
const VN_WHY = { sold: "Sold", bankrupt: "Went bankrupt", closed: "Closed" };
function vnBizCard(b, day) {
  const t = b.t, T = b.today || {}, fund = t.fund, wish = b.wish;
  const head = `<div class="vn-top"><span class="vn-ic">${b.cat.icon}</span><span class="pa-grow"><b>${esc(b.name)}</b><small>${esc(t.label)} · ${esc(b.lvl)} · run by ${esc(b.owner)}</small></span></div>`;
  const today = fund ? `<div class="vn-row"><span>Fund size</span><b>${vnCoins(b.cash)}</b></div><div class="vn-row"><span>${esc(b.owner)}'s own money in it</span><b>${vnCoins(b.mine || 0)}</b></div><div class="vn-row"><span>Today</span><b class="${(b.ret || 0) >= 0 ? "up" : "down"}">${(b.ret || 0) >= 0 ? "+" : ""}${b.ret || 0}%</b></div>`
    : `<div class="vn-row"><span>Today</span><b>${t.hits ? `${vnCoins(T.cust || 0)} ${t.unit}` : `${T.cust || 0} ${t.unit}`} · <em class="${(T.profit || 0) >= 0 ? "up" : "down"}">${(T.profit || 0) >= 0 ? "+" : ""}${vnCoins(T.profit || 0)}</em></b></div>
       <div class="vn-row"><span>Cash in the business</span><b>${vnCoins(b.cash)}</b></div>`;
  const last30 = `<div class="vn-row"><span>Last 30 days</span><b class="${b.profit30 >= 0 ? "up" : "down"}">${b.profit30 >= 0 ? "+" : ""}${vnCoins(b.profit30)}</b></div>${vnSpark(b.spark, 260, 36)}`;
  const meters = fund ? "" : `<div class="vn-meter"><span>Quality</span>${vnBar(b.q || 0, "#4CB386")}</div><div class="vn-meter"><span>Reputation</span>${vnBar((b.rep || 0) / 100, "#F5B82E")}</div>`;
  const extra = [b.sig ? `Signature: <b>${esc(b.sig)}</b>` : t.hits && b.prodName ? `Working on <b>${esc(b.prodName)}</b>` : "",
    b.suppliers.length ? `Gets supplies from ${esc(b.suppliers.join(", "))} (family)` : "",
    t.b2b ? `${b.clients} businesses in town could buy from it` : "",
    b.loan ? `Bank loan: ${vnCoins(b.loan.left)} left` : "",
    b.ev && day - b.ev.d < 14 ? `<em>${esc(b.ev.t)}</em>` : ""].filter(Boolean).map(x => `<p class="vn-fact">${x}</p>`).join("");
  const ask = wish ? `<div class="vn-ask"><p>${wish.k === "expand" ? `${esc(b.owner)} wants to grow it into a ${esc(b.next ? b.next.label.toLowerCase() : "bigger place")} for ${vnCoins(wish.cost)} coins from the business.` : `${esc(b.owner)} is thinking about closing it.`}</p>
    <span class="kd-two"><button class="kd-btn" data-vn="go:${b.ownerId}">${wish.k === "expand" ? "Bless it" : "Agree"}</button><button class="kd-btn alt" data-vn="wait:${b.ownerId}">${wish.k === "expand" ? "Not yet" : "Keep going"}</button></span></div>` : "";
  const seg = (k, opts, cur) => `<div class="vn-seg">${opts.map(([v, l]) => `<button class="${cur === v ? "on" : ""}" data-vn="${k}:${b.ownerId}:${v}">${l}</button>`).join("")}</div>`;
  const mine = PH && PH.c && PH.c.id === b.ownerId, AT = baTheme(b.tpl);
  return `<div class="vn-card">${head}${today}${last30}${meters}${extra}${ask}<span class="vn-btns">${mine ? `<button class="ba-open" style="background:${AT.col}" data-vn="open:${b.id}">${AT.ic} Open ${esc(AT.app)}</button>` : `<small class="vn-sub">Managed from ${esc(b.owner)}'s phone, in the ${esc(AT.app)} app.</small>`}</span></div>`;
  const advice = `<div class="vn-adv"><small>Your advice (${esc(b.owner)} decides)</small>
    ${fund ? seg("focus", [["quality", "Play safe"], ["steady", "Balanced"], ["growth", "Go big"]], b.focus) : seg("price", [["budget", "Cheap"], ["normal", "Normal"], ["premium", "Premium"]], b.price) + seg("focus", [["quality", "Quality"], ["steady", "Steady"], ["growth", "Growth"]], b.focus)}
    <span class="vn-btns">${!fund ? `<button data-vn="hire:${b.ownerId}">Hire one more</button>` : ""}${b.cash < 0 || b.debt ? `<button data-vn="bail:${b.ownerId}:1000">Put in 1,000</button>` : ""}<button class="vn-x" data-vn="close:${b.ownerId}">Suggest closing</button></span></div>`;
  return `<div class="vn-card">${head}${today}${last30}${meters}${extra}${ask}${advice}</div>`;
}
function phVentures(c) {
  const day = today(), F = Venture.family(game.home, day), M = Venture.market(day, 30), rows = [];
  rows.push(`<button class="vn-town" data-vn="market"><span class="pa-grow"><small>OLD TOWN ECONOMY</small><b>${M.mood}${M.recession ? " 📉" : ""}</b><small>Market today ${M.today >= 0 ? "+" : ""}${M.today}%</small></span>${vnSpark(M.pts, 110, 34, "#fff")}<i>›</i></button>`);
  for (const w of F.wishes) {
    const m = game.home.get(w.cid), short = Math.max(0, w.need - w.wallet), fam = Venture.famCash(game.home, m, day), canFund = fam >= short;
    rows.push(`<div class="vn-card vn-wish"><div class="vn-top"><span class="vn-ic">${Venture.CATS[w.t.cat].icon}</span><span class="pa-grow"><b>${esc(w.name)} wants to open a ${esc(w.t.label.toLowerCase())}</b><small>${Venture.fitLabel(w.fit)} for ${esc(w.name)} · needs ${vnCoins(w.need)} coins</small></span></div>
      <p class="vn-fact">${short ? `${esc(w.name)} has ${vnCoins(w.wallet)}. The family can chip in the other ${vnCoins(short)}${canFund ? "" : `, but only has ${vnCoins(fam)} to spare`}.` : `${esc(w.name)} can pay for it alone, and would like your blessing.`}</p>
      <span class="kd-two">${short ? `<button class="kd-btn" data-vn="fund:${w.cid}" ${canFund ? "" : "disabled"}>Chip in</button>${w.t.fund ? "" : `<button class="kd-btn" data-vn="loan:${w.cid}">Bank loan</button>`}` : `<button class="kd-btn" data-vn="fund:${w.cid}">Bless it</button>`}<button class="kd-btn alt" data-vn="nofund:${w.cid}">Not now</button></span></div>`);
  }
  if (F.active.length) rows.push(`<h4 class="pa-h">Family businesses</h4>` + F.active.map(b => vnBizCard(b, day)).join(""));
  const grown = c.st && Engine.phase_of(c.age(day)) === "dewasa" && !c.info.pensiun && !("keluar" in c.info);
  if (grown && !Venture.ownerBiz(game.home, c.id) && !c.st.bizWish) {
    const fam = Venture.famCash(game.home, c, day), ideas = Venture.ideas(c, game.home, day).filter(o => !o.taken);
    rows.push(`<h4 class="pa-h">Ideas for ${esc(c.name)}</h4><div class="pa-list">${ideas.map(o => { const short = Math.max(0, o.t.cap - c.st.wallet), viaLoan = short > fam;
      return `<div class="pa-row vn-idea"><span class="vn-ic sm">${Venture.CATS[o.t.cat].icon}</span><span class="pa-grow"><b>${esc(o.t.label)}${o.fresh ? ` <i class="vn-new">New idea</i>` : ""}</b><small>${Venture.fitLabel(o.f)} · ${vnCoins(o.t.cap)} to start${o.t.b2b ? " · sells to businesses" : ""}${o.demand >= 1.08 ? " · hot right now" : o.demand < 0.9 ? " · slow right now" : ""}</small></span>
        <button class="kd-btn" data-vn="suggest:${c.id}:${o.t.id}${viaLoan ? "@loan" : ""}" ${viaLoan && o.t.fund ? "disabled" : ""}>${viaLoan ? "Suggest + loan" : "Suggest"}</button></div>`; }).join("")}</div>
      <p class="pa-note">Life opens up new ideas: the jobs ${esc(c.name)} has had, what they're good at, what the family runs. Nobody tells you how.</p>
      <p class="pa-note">You suggest, ${esc(c.name)} decides. Money comes from ${esc(c.name)}'s savings first, then the family${ideas.some(o => o.t.cap - c.st.wallet > fam) ? ", then a bank loan paid back from the business" : ""}.</p>`);
  } else if (!grown && !F.active.length && !F.wishes.length) rows.push(`<p class="pa-note">Grown-ups in the family can open a business. They'll tell you when they want to.</p>`);
  if (F.closed.length) rows.push(`<h4 class="pa-h">Before</h4><div class="pa-list">${F.closed.map(b => `<div class="pa-row"><span class="vn-ic sm">${b.cat.icon}</span><span class="pa-grow"><b>${esc(b.name)}</b><small>${esc(b.t.label)} · ${VN_WHY[b.why] || "Closed"} · ${b.owners.map(o => esc(o[1])).join(" → ")}</small></span><span class="pa-val ${b.total >= 0 ? "plus" : ""}">${b.total >= 0 ? "+" : ""}${vnCoins(b.total || 0)}</span></div>`).join("")}</div>`);
  if (DEV && (grown || c.st.job)) rows.push(`<h4 class="pa-h">Test mode (Dev): try every app</h4><div class="vn-card"><p class="vn-fact">Opens a sample business run by ${esc(c.name)} for a few months. Nothing is saved.</p>
    <small class="ba-lbl" style="margin-top:10px">🩺 Jobs</small><span class="vn-btns">${Work.JOBS.map(j => `<button data-wd-try="${j}">${esc(Status.JOBS[j].label)} (${esc(Work.PROFILES[j].app)})</button>`).join("")}</span>
    ${Object.entries(Venture.CATS).map(([k, cat]) => `<small class="ba-lbl" style="margin-top:10px">${cat.icon} ${esc(cat.label)}</small><span class="vn-btns">${Venture.TPLS.filter(t => t.cat === k).map(t => `<button data-vn-try="${t.id}">${esc(t.label)}</button>`).join("")}</span>`).join("")}</div>`);
  return `${phHead("Ventures", "Family businesses")}${rows.join("")}`;
}
function phMarket(c) {
  const day = today(), M = Venture.market(day, 90);
  return `${phHead("Old Town Market", `Economy: ${M.mood}`)}<button class="pa-row vn-back" data-vn="back">‹ Ventures</button>
    <div class="vn-card"><div class="vn-row"><span>Old Town index, 90 days</span><b class="${M.today >= 0 ? "up" : "down"}">${M.pts[M.pts.length - 1].toLocaleString("en")} (${M.today >= 0 ? "+" : ""}${M.today}%)</b></div>${vnSpark(M.pts, 300, 60, "#1E6B52")}
    <p class="vn-fact">${M.recession ? "Old Town is in a recession. Shops get fewer customers and stocks fall." : M.econ >= 1.08 ? "Business is booming. Shoppers are spending." : "Prices move with the town: openings, layoffs and closures."}</p></div>
    <h4 class="pa-h">Listed companies</h4><div class="pa-list">${M.movers.slice(0, 30).map(m => `<div class="pa-row"><i class="vn-dot" style="background:${m.color}"></i><span class="pa-grow"><b>${esc(m.name)}</b><small>${esc(m.size)} · ${esc((Status.JOBS[m.ind] || {}).label || m.ind)}</small></span><span class="pa-val">${m.price.toFixed(2)} <em class="${m.chg >= 0 ? "up" : "down"}">${m.chg >= 0 ? "+" : ""}${m.chg}%</em></span></div>`).join("")}</div>
    <p class="pa-note">Quant funds in the family trade this market. Families can't invest in each other yet.</p>`;
}
function vnBind(v) {
  v.querySelectorAll("[data-vn]").forEach(b => b.onclick = () => vnDo(b.dataset.vn));
  v.querySelectorAll("[data-vn-try]").forEach(b => b.onclick = () => baDemo(b.dataset.vnTry));
  v.querySelectorAll("[data-wd-try]").forEach(b => b.onclick = () => wdDemo(b.dataset.wdTry));
}
function vnDo(cmd) {
  const [op, cid, arg] = cmd.split(":");
  if (op === "market") return phGo("venturesm");
  if (op === "back") return phGo("ventures");
  if (op === "open") return phOpen("biz:" + cid);
  const kind = op === "suggest" ? `biz:suggest:${arg}` : arg != null ? `biz:${op}:${arg}` : `biz:${op}`;
  const prev = game.onRefuse; let said = null;
  game.onRefuse = t => { said = t.quote; };
  const ok = game.act(cid, kind);
  game.onRefuse = prev;
  drainNoon(); save(); refresh();
  phGo("ventures");
  const n = (game.home.get(cid) || {}).name || "They";
  if (said) kdToast(`${n}: “${said}”`);
  else if (!ok) kdToast(op === "fund" || op === "suggest" ? "Not enough money for that right now." : "That didn't work.");
  else kdToast({ fund: `${n} is opening up! 🎉`, loan: `${n} got the loan and is opening up! 🎉`, suggest: `${n} loves the idea! 🎉`, go: "Done. 👍", wait: `${n} will wait.`, nofund: `${n} puts the idea aside.`, hire: `${n} is hiring.`, bail: "Cash added.", close: `${n} closed it.` }[op] || `${n} will try that.`);
}


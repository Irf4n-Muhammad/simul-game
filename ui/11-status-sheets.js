// ================================================================ status: dice, big moments, career, shop, rankings, family tree
const coins = n => `${Math.round(n).toLocaleString("en")} coins`;
const today = () => game.home.last_day;
const fmtWhen = d => d === today() ? "Today" : d === today() + 1 ? "Tomorrow" : `In ${d - today()} days`;
const statusOf = id => { const c = game.home.get(id); return c ? Status.memberView(c, game.home, today()) : null; };
const famStatus = () => Status.familyView(game.home, today());
const nameOf = id => game.home.get(id)?.name || "Someone";
const DIE_FACE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const bonusOf = v => Status.DICE_BONUS[v];

// --- the 3D die
function pipTexture(n) {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#F7F2EA"; g.fillRect(0, 0, 128, 128); g.fillStyle = n === 1 ? "#C2704F" : "#2E2A26";
  const P = { 1: [[64, 64]], 2: [[34, 34], [94, 94]], 3: [[30, 30], [64, 64], [98, 98]], 4: [[34, 34], [94, 34], [34, 94], [94, 94]],
    5: [[30, 30], [98, 30], [64, 64], [30, 98], [98, 98]], 6: [[34, 28], [94, 28], [34, 64], [94, 64], [34, 100], [94, 100]] }[n];
  for (const [x, y] of P) { g.beginPath(); g.arc(x, y, n === 1 ? 18 : 12, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
const die = new THREE.Mesh(RB(0.6, 0.6, 0.6, 0.09), [3, 4, 2, 5, 1, 6].map(n => new THREE.MeshStandardMaterial({ map: pipTexture(n), roughness: 0.35, envMapIntensity: 0.6 })));
die.castShadow = true; die.visible = false; scene.add(die);
const FACE_ROT = { 1: [0, 0], 6: [0, Math.PI], 3: [0, -Math.PI / 2], 4: [0, Math.PI / 2], 2: [Math.PI / 2, 0], 5: [-Math.PI / 2, 0] };
let dieHide = 0;
function tossDie(v, done) {
  const t0 = now(), [rx, ry] = FACE_ROT[v], dur = reduce ? 200 : 1100;
  die.visible = true; play("jump", 600); say(["Come on...", "Lucky, lucky!", "Here goes!"][v % 3], 1000);
  (function step() {
    const p = Math.min(1, (now() - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    die.position.set(0.7 + 0.4 * p, 2.1 * (1 - p) + 0.35 + Math.sin(p * Math.PI) * 1.6, 0.9 + 1.5 * p);
    die.rotation.set(rx + (1 - e) * Math.PI * 4, ry + (1 - e) * Math.PI * 6, (1 - e) * Math.PI * 2);
    if (p < 1) requestAnimationFrame(step);
    else {
      burst(v >= 5 ? ["★", "♥"] : ["★"], v >= 5 ? 8 : 3, "#D4A853");
      say(v >= 5 ? "WOW!" : v <= 2 ? "Aww..." : "Not bad!", 1400);
      clearTimeout(dieHide); dieHide = setTimeout(() => { die.visible = false; }, 6000);
      setTimeout(done, 700);
    }
  })();
}

// --- dice sheet
function rollDice() {
  hideHint();
  const before = famStatus().dice.today;
  if (before && before.rolled != null) return showDice();
  if (!game.act("home", "dadu")) return showDice();
  save(); drawDice();
  tossDie(famStatus().dice.today.rolled, showDice);
}
function showDice() {
  const F = famStatus(), d = F.dice, t = d.today, L = d.luck;
  const momentsToday = F.moments.filter(m => m.day === today());
  const rolled = t && t.rolled != null;
  const canSave = rolled && !t.saved && t.used == null && d.bank.length < d.max;
  const usable = t?.used == null;
  openSheet("dice", `
    <span class="ribbon" style="background: var(--sky)">TODAY'S LUCK</span>
    <h2>${!rolled && !t?.used ? "Roll once a day. Save the good ones for big days." : `Today's luck: ${L.value} <small class="sub">(+${bonusOf(L.value)} on big moments)</small>`}</h2>
    ${rolled ? `<p>You rolled <b>${t.rolled}</b>${t.saved ? ", and saved it. Today counts as a 3." : "."}${t.used != null ? ` You're using a saved ${t.used} today.` : ""}</p>` : `<p>If you don't roll, today counts as a 2.</p>`}
    ${momentsToday.length ? `<div class="box"><h3>Big moment today</h3>${momentsToday.map(m => `<small>${esc(nameOf(m.cid))}: ${esc(m.label)} · needs ${m.req}</small>`).join("")}</div>` : ""}
    <div class="fieldset"><span class="lbl">Saved dice (${d.bank.length}/${d.max})</span>
      <div class="slots">${Array.from({ length: d.max }, (_, i) => d.bank[i] != null
        ? `<button class="slot full" data-use="${i}" ${usable ? "" : "disabled"} aria-label="Use saved ${d.bank[i].v} today, fades in ${d.bank[i].left} days">${d.bank[i].v}</button>`
        : `<span class="slot"></span>`).join("")}</div>
      ${d.bank.length ? `<span class="sub">${d.bank.map(b => `Your ${b.v} fades in ${b.left} day${b.left > 1 ? "s" : ""}.`).join(" ")}${usable ? " Tap one to use it as today's luck." : ""}</span>` : `<span class="sub">Saved dice fade after ${Status.BANK_DAYS} days.</span>`}</div>
    <div class="row2">
      ${!rolled ? `<button class="big" id="rollBtn">Roll!</button>` : ""}
      ${canSave ? `<button class="secondary" id="saveDie">Save this ${t.rolled} for later</button>` : ""}
    </div>
    <p class="muted">Luck can't be bought or re-rolled. Families with a bad streak tend to get luckier later.</p>
    <button class="close" data-close="1">Close</button>`);
  const rb = $("rollBtn"); if (rb) rb.onclick = () => { closeSheet(); rollDice(); };
  const sb = $("saveDie"); if (sb) sb.onclick = () => { if (game.act("home", "simpan_dadu")) { save(); drawDice(); say("Saved it for a big day!"); showDice(); } };
  sheet.querySelectorAll("[data-use]").forEach(b => b.onclick = () => { if (game.act("home", "pakai_dadu:" + b.dataset.use)) { save(); drawDice(); burst(["★"], 4, "#D4A853"); showDice(); } });
  sheet.querySelector("[data-close]").onclick = closeSheet;
}
function drawDice() {
  if (!game) return;
  const d = famStatus().dice, t = d.today;
  const shown = t?.used != null ? t.used : t?.rolled != null ? (t.saved ? 3 : t.rolled) : null;
  $("diceBtn").innerHTML = (shown ? DIE_FACE[shown] : "?") + (shown ? "" : '<span class="badge"></span>');
  $("diceBtn").setAttribute("aria-label", shown ? `Today's luck: ${shown}` : "Roll today's dice");
}

// --- big moments
function nextMoment() {
  const ms = famStatus().moments;
  return ms.find(m => m.cid === selected) || ms[0] || null;
}
function drawMoment() {
  const m = nextMoment(), el = $("momentPill");
  el.hidden = !m;
  if (m) el.textContent = `${fmtWhen(m.day)} · ${nameOf(m.cid)}: ${m.label}`;
}
function scoreRows(p, req) {
  const total = p.skill + p.talent + p.cond + (p.tree || 0) + (p.bonus ?? 0);
  const open = p.bonus == null;
  return `<div class="score">
    <span>Skill</span><span>${p.skill}</span>
    <span>Talent</span><span>+${p.talent}</span>
    <span>Condition${p.condNote ? `<small class="sub" style="display:block;font-weight:600;opacity:.7">${esc(p.condNote)}</small>` : " (mood, energy)"}</span><span>${p.cond >= 0 ? "+" : ""}${p.cond}</span>
    ${p.tree ? `<span>Constellations</span><span>+${p.tree}</span>` : ""}
    <span>Dice ${p.dice ? DIE_FACE[p.dice] : ""}</span><span>${open ? "+2 to +15" : "+" + p.bonus}</span>
    <span class="tot">Total</span><span class="tot">${open ? `${total + 2}–${total + 15}` : total}</span>
    <span>Needed</span><span>${req}</span></div>`;
}
function showMoment(m) {
  const c = game.home.get(m.cid); if (!c) return;
  const v = statusOf(m.cid).moments.find(x => x.id === m.id) || m;
  const L = famStatus().dice.luck, isToday = m.day === today();
  const dv = isToday ? L.value : null;
  const e = v.est || { skill: 0, talent: 0, cond: 0 };
  openSheet("moment", `
    <span class="ribbon">BIG MOMENT · ${esc(fmtWhen(m.day).toUpperCase())}</span>
    <h2>${esc(c.name)}: ${esc(m.label)}</h2>
    <p>${m.by === "self" ? `${esc(c.name)} applied on their own.` : m.by === "you" ? "You set this up." : "Comes with the job."} It's decided at the end of that day.</p>
    ${scoreRows({ skill: e.skill, talent: e.talent, cond: e.cond, condNote: e.condNote, tree: e.tree || 0, dice: dv, bonus: dv ? bonusOf(dv) : null }, m.req)}
    <p>${isToday ? `Today's luck counts: ${L.value} (+${bonusOf(L.value)}).` : "Dice adds +2 to +15 on the day. Save a good roll for it."}</p>
    <div class="row2"><button class="big" id="mDice">${isToday ? "Today's dice" : "Dice"}</button><button class="close" data-close="1">Close</button></div>`);
  $("mDice").onclick = showDice;
  sheet.querySelector("[data-close]").onclick = closeSheet;
}
function showResult(r) {
  openSheet("result", `
    <span class="ribbon" style="background:${r.pass ? "var(--mint)" : "var(--plum)"}">${r.pass ? "YOU DID IT" : "NOT THIS TIME"}</span>
    <h2>${esc(r.line || r.label)}</h2>
    ${r.by === "self" ? `<p>${esc(r.name)} had applied on their own.</p>` : ""}
    ${scoreRows(r.parts, r.req)}
    ${r.parts.src === "none" ? `<p>No dice was rolled that day, so it counted as a 2.</p>` : ""}
    ${r.tip ? `<div class="box"><h3>Next time</h3><small>${esc(r.tip)}</small></div>` : ""}
    <button class="big" data-close="1">${r.pass ? "Yay!" : "Okay"}</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  if (r.pass) burst(["★", "♥"], 10, "#D4A853");
}
function nextUnseenResult() {
  state.res_seen ||= [];
  return famStatus().results.find(r => !state.res_seen.includes(r.id)) || null;
}
function markSeen(r) { state.res_seen.push(r.id); if (state.res_seen.length > 80) state.res_seen.splice(0, 20); save(); }

// --- life hub: career, shop, rankings
let lifeTab = "career", rankTab = "richest", firmTab = null;
function lifeHead(tab) {
  return `<div class="tabs">${[["career", "Career"], ["tree", "Stars"], ["shop", "Shop"], ["ranks", "Rankings"]].map(([k, l]) =>
    `<button class="chip" data-tab="${k}" aria-pressed="${tab === k}">${l}</button>`).join("")}</div>`;
}
function bindLife() {
  sheet.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => showLife(b.dataset.tab));
  sheet.querySelector("[data-close]").onclick = closeSheet;
}
function skillRows(s) {
  return Status.SKILLS.map(k => `<div class="skill"><span>${Status.SKILL_LABEL[k]}</span><span class="bar"><i style="width:${s.skills[k]}%"></i></span>
    <small>${s.skills[k]} · ${s.talents[k] == null ? "talent ?" : "talent " + s.talents[k]}</small></div>`).join("");
}
function showLife(tab = lifeTab) {
  if (!cur) return;
  // the stars open full screen; closing them comes back to the tab you were on
  if (tab === "tree") return showTree(cur.id, lifeTab === "tree" ? "career" : lifeTab);
  lifeTab = tab;
  const s = statusOf(cur.id);
  if (!s) return;
  if (tab === "career") {
    const c = game.home.get(cur.id), P = Career.profile(c, game.home, today()), feed = Career.feed(c, game.home, today()).slice(0, 2);
    openSheet("life", `${lifeHead(tab)}
      <div class="row"><h2>${esc(cur.nama)}</h2><span class="coins">${coins(s.wallet)}</span></div>
      <div class="box"><h3>${esc(P.headline)}</h3><small>${s.job ? `${coins(s.job.pay)}/day · ${s.job.share} of creatures do this kind of work` : P.open ? `If you don't pick a job, ${esc(cur.nama)} applies somewhere alone after a few days.` : "Skills grow from the daily plan. Pick it with the calendar button."}</small></div>
      ${s.moments.map(m => `<button class="line" data-moment="${esc(m.id)}"><span class="grow"><b>${esc(m.label)}</b><small class="sub">${fmtWhen(m.day)} · needs ${m.req} · now ${m.est.skill + m.est.talent + m.est.cond + (m.est.tree || 0)} + dice</small></span></button>`).join("")}
      ${P.offers.length ? `<div class="box"><h3>✉ ${P.offers.length} recruiter message${P.offers.length > 1 ? "s" : ""}</h3><small>Waiting in Burrow.</small></div>` : ""}
      ${feed.length ? `<div class="fieldset"><span class="lbl">On Burrow</span>${feed.map(p => `<div class="line"><span class="grow"><b>${esc(p.who)}</b><small class="sub">${esc(p.text)}</small></span></div>`).join("")}</div>` : ""}
      <button class="big bw-open" id="openBurrow">Open Burrow</button>
      <button class="close" data-close="1">Close</button>`);
    $("openBurrow").onclick = () => showBurrow(P.offers.length ? "jobs" : "feed", "career");
    sheet.querySelectorAll("[data-moment]").forEach(b => b.onclick = () => { const m = famStatus().moments.find(x => x.id === b.dataset.moment); if (m) showMoment(m); });
  } else if (tab === "shop") {
    const items = Status.shop(game.home.get(cur.id), game.home, today()).filter(i => i.cat === "House"), house = famStatus().house;
    const live = Market.drops(today()).filter(D => !D.soon && D.left > 0)[0];
    const cats = [...new Set(items.map(i => i.cat))];
    const old = cur.umur >= 180 && cur.fase !== "meninggal" && cur.fase !== "merantau";
    openSheet("life", `${lifeHead(tab)}
      <div class="row"><h2>${esc(cur.nama)}'s money</h2><span class="coins">${coins(s.wallet)}</span></div>
      <div class="box"><h3>Family home: ${esc(house.label)}</h3><small>${esc(house.hood)} neighborhood · prestige +${house.pts}</small>
        ${famStatus().build ? `<small>Building a ${esc(famStatus().build.item.label)} in ${esc(famStatus().build.item.hood)} · ${famStatus().build.left ? `${famStatus().build.left} day${famStatus().build.left > 1 ? "s" : ""} left` : "moving in today"}</small>` : ""}</div>
      ${old ? "" : `<p>Shopping opens in the teen years.</p>`}
      ${cats.map(cat => `<div class="fieldset"><span class="lbl">${cat}</span><div class="list">${items.filter(i => i.cat === cat).map(i => `<div class="line"><span class="grow"><b>${esc(i.label)}</b>
        <small class="sub">${coins(i.price)} · ${i.share} own one · prestige +${i.pts}${i.hood ? " · " + esc(i.hood) : ""}${i.days ? ` · ready in ${i.days} day${i.days > 1 ? "s" : ""}` : ""}</small></span>
        ${i.cat === "House" && i.id !== "flat" && !i.owned && !i.building
          ? `<button class="mini" data-lot="${i.id}">Pick a lot</button>`
          : `<button class="mini" data-buy="${i.id}" ${i.owned || i.building || !old || s.wallet < i.price || !canCare() || (i.cat === "House" && famStatus().build) ? "disabled" : ""}>${i.building ? "Building" : i.owned ? "Owned" : "Buy"}</button>`}</div>`).join("")}</div></div>`).join("")}
      <p class="muted">Coins only come from work, prizes and inheritance. Houses belong to the whole family.</p>
      ${live ? `<div class="box"><h3>Limited drop: ${esc(live.label)}</h3><small>Only ${live.left} of ${live.made} left in Old Town.</small></div>` : ""}
      <button class="big bw-open bz-open" id="openBazaar">Open Bazaar</button>
      <button class="close" data-close="1">Close</button>`);
    $("openBazaar").onclick = () => showBazaar("new", "shop");
    sheet.querySelectorAll("[data-lot]").forEach(b => b.onclick = async () => { closeSheet(); await enterTown(); TOWN.focusHood(b.dataset.lot); say("Tap an empty lot to build."); });
    sheet.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
      if (game.act(selected, "beli:" + b.dataset.buy)) { save(); refresh(); burst(["★"], 6, "#D4A853"); say("Ooh, fancy!"); showLife("shop"); }
    });
  } else if (rankTab === "firms") {
    // Top firms: the strongest businesses of one kind in Old Town, NPC rivals and your family side by side
    const day = today(), types = Venture.firmTypes(game.home, day), own = Venture.active(game.home)[0];
    if (!types.some(x => x.id === firmTab)) firmTab = (own && types.some(x => x.id === own.tpl) ? own.tpl : (types[0] || {}).id) || null;
    const F = firmTab && Venture.topFirms(game.home, day, firmTab);
    const row = e => `<div class="line ${e.you ? "you" : ""}"><span class="rank">${e.rank}</span><span class="grow"><b>${esc(e.name)}</b><small class="sub">${esc(e.sub || "")}</small></span><span class="sub">${e.value}</span></div>`;
    openSheet("life", `${lifeHead(tab)}
      <div class="tabs">${[["richest", "Richest"], ["prestige", "Prestige"], ["athletes", "Athletes"], ["firms", "Firms"]].map(([k, l]) =>
        `<button class="chip" data-rank="${k}" aria-pressed="${rankTab === k}">${l}</button>`).join("")}</div>
      <div class="tabs rk-types">${types.map(x => `<button class="chip" data-firm="${x.id}" aria-pressed="${firmTab === x.id}">${esc(x.label)}</button>`).join("")}</div>
      ${F ? `<div class="list">${F.top.map(row).join("")}</div>
      <p class="muted">Ranked by strength: quality, reputation, Edge and size.${F.shut ? ` ${F.shut} closed in the last downturn.` : ""} Other players' firms will join these lists later.</p>` : `<p class="muted">No firms to show yet.</p>`}
      <button class="close" data-close="1">Close</button>`);
    sheet.querySelectorAll("[data-rank]").forEach(b => b.onclick = () => { rankTab = b.dataset.rank; showLife("ranks"); });
    sheet.querySelectorAll("[data-firm]").forEach(b => b.onclick = () => { firmTab = b.dataset.firm; showLife("ranks"); });
    const on = sheet.querySelector('[data-firm][aria-pressed="true"]'); if (on) on.parentNode.scrollLeft = on.offsetLeft - 40;
  } else {
    const B = Status.boards(game.home, today())[rankTab];
    const fmtV = v => rankTab === "richest" ? coins(v) : rankTab === "prestige" ? `${v} pts` : `${v}`;
    const row = e => `<div class="line ${e.you ? "you" : ""}"><span class="rank">${e.rank}</span><span class="grow"><b>${esc(e.name)}</b><small class="sub">${esc(e.sub || "")}</small></span><span class="sub">${fmtV(e.value)}</span></div>`;
    openSheet("life", `${lifeHead(tab)}
      <div class="tabs">${[["richest", "Richest"], ["prestige", "Prestige"], ["athletes", "Athletes"], ["firms", "Firms"]].map(([k, l]) =>
        `<button class="chip" data-rank="${k}" aria-pressed="${rankTab === k}">${l}</button>`).join("")}</div>
      <div class="list">${B.top.map(row).join("")}${B.yours.length ? `<span class="sub" style="text-align:center">· · ·</span>${B.yours.map(row).join("")}` : ""}</div>
      <p class="muted">Out of ${B.total.toLocaleString("en")} creatures in the world. Other players will join these lists later.</p>
      <button class="close" data-close="1">Close</button>`);
    sheet.querySelectorAll("[data-rank]").forEach(b => b.onclick = () => { rankTab = b.dataset.rank; showLife("ranks"); });
  }
  bindLife();
}

// --- family tree + profile
const colorOf = m => "#" + (COLOR[m.rupa.warna] || 0xcccccc).toString(16).padStart(6, "0");

// ---- Paws: the pet app (every creature, kids too)
const PW_COL = "#2E9C8F", PW_SOFT = "#ECF7F5";
let PW_DEMO = null;
function pwDemo(kind) {
  const c = game.home.get(cur.id), cc = Pets.demo(game.home, c, today(), kind);
  if (!cc || !cc.st.pet) return kdToast("That pet didn't make it in test mode. Try again.");
  PW_DEMO = cc; PH.pw = { tab: "today", demo: true }; phGo("paws", PH.pw);
}
const pwAge = d => d < 60 ? `${Math.max(1, Math.round(d / 7))} weeks` : d < 365 ? `${Math.round(d / 30)} months` : `${(Math.round(d / 36.5) / 10).toFixed(1)} years`;
function pwFace(P, K, size = 64) { return `<span class="pw-face" style="--pw:${K.color};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.55)}px">${K.ic}</span>`; }
function pwMood(P) {
  if (P.lost) return `${P.name} is missing.`;
  if (P.sick) return `${P.name} has ${P.sick.what}${P.sick.vet ? " and is on medicine from the vet" : ""}.`;
  if (P.hunger < 30) return `${P.name} is hungry and keeps staring at the food bowl.`;
  if (P.joy < 30) return `${P.name} is bored and a little sad.`;
  if (P.old) return `${P.name} is getting old and sleeps most of the day.`;
  if (P.bond >= 75) return `${P.name} follows their owner from room to room.`;
  if (P.joy >= 80) return { playful: `${P.name} zooms around the house.`, lazy: `${P.name} is napping in a sunbeam.`, shy: `${P.name} is curled up nearby, calm and content.`, greedy: `${P.name} is happy and hoping for a snack.`, loyal: `${P.name} is waiting by the door, tail going.` }[P.pers];
  return `${P.name} is doing fine.`;
}
function phPaws(c, arg) {
  const demo = arg && arg.demo, cc = demo ? PW_DEMO : c, day = demo && cc ? cc.vday : today();
  const v = cc && globalThis.Pets ? Pets.view(cc, game.home, day) : null;
  if (!v) return phHead("Paws", "Not available");
  const P = v.pet;
  const tabs = P ? [["today", "Today"], ["care", "Care"], ["life", "Life"]] : [["today", "Find a pet"], ["life", "Remember"]], tab = tabs.some(x => x[0] === (arg && arg.tab)) ? arg.tab : "today";
  const body = P ? { today: pwToday, care: pwCare, life: pwLife }[tab](cc, v, day, demo) : { today: pwFind, life: pwLife }[tab](cc, v, day, demo);
  return `<div class="ba" style="--ba:${PW_COL};--ba-soft:${PW_SOFT}">
    <header class="ba-head">${demo ? `<button class="ba-x" data-pw="home" aria-label="Back">‹</button>` : ""}<span class="ba-ic">${P ? P.K.ic : "🐾"}</span><span class="pa-grow"><b>${P ? esc(P.name) : "Paws"}</b><small>${demo ? `Test mode · sample ${esc(P ? P.K.label.toLowerCase() : "pet")}` : P ? `${esc(cc.name)}'s ${esc(P.K.label.toLowerCase())}` : `${esc(cc.name)} has no pet`}</small></span>${demo ? `<button class="ba-next" data-pw="next">Next day ›</button>` : ""}</header>
    <div class="ba-body">${body}</div>
    <nav class="ba-tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? "on" : ""}" data-pw="tab:${k}">${esc(l)}</button>`).join("")}</nav>
    ${P ? baIntro("paws", [["🐾", `${P.name} lives with ${cc.name}`, `${P.name} has their own needs: food, play, a clean bed, and a vet when sick. ${cc.name} does the looking after.`],
      ["❤️", "Bond is everything", "The closer they are, the happier both of them. A loved pet makes hard days lighter."],
      ["💬", "You suggest, they decide", `Food, walks and vet visits are your advice. ${cc.name} might do it their own way.`]]) : ""}</div>`;
}
function pwToday(c, v, day, demo) {
  const P = v.pet, K = P.K, T = P.today && P.today.d === day ? P.today : null, who = c.name;
  const met = (l, val, col, warn) => `<div class="vn-meter"><span>${l}</span>${vnBar(val / 100, warn && val < 35 ? "#E5534B" : col)}<small>${Math.round(val)}</small></div>`;
  const hero = `<div class="ba-hero pw-hero">${pwFace(P, K, 72)}<div class="pa-grow"><small class="ba-lbl">${esc(K.label)} · ${pwAge(P.age)} · ${esc(P.persV[0].toLowerCase())}</small><b>${esc(pwMood(P))}</b></div></div>
    <div class="vn-card">${met("Full", P.hunger, PW_COL, true)}${met("Happy", P.joy, "#F5B82E", true)}${met("Health", P.health, "#4CB386", true)}${met("Bond", P.bond, "#E46C8C")}</div>`;
  let att = "";
  if (P.card && P.cardOpts) att = baCard(P.card.t, P.cardOpts, "card", demo ? "" : who).replace(/data-ba=/g, "data-pw=");
  else if (P.cardLast && day - P.cardLast.d <= 2) att = baResult(P.cardLast.by === "you" ? "You decided" : `${who} decided`, P.cardLast.t, null);
  const facts = T ? `<h4 class="pa-h">Today</h4><div class="pa-list">
      <div class="pa-row"><span class="pa-grow">${T.fed ? (T.scraps ? "Ate leftovers from the family dinner. Nobody had coins for pet food." : `Fed on time (${P.food1} coins)`) : P.lost ? "Nobody to feed" : `<span class="warn">${esc(who)} forgot to feed ${esc(P.name)}</span>`}</span><b>${T.fed ? "🍽️" : "—"}</b></div>
      <div class="pa-row"><span class="pa-grow">${T.walk ? "Went for a walk and played outside" : "Stayed in and played a little"}</span><b>${T.walk ? "🌳" : "🏠"}</b></div>
      ${T.vet ? `<div class="pa-row"><span class="pa-grow">Vet visit</span><b>${T.vet} coins</b></div>` : ""}
      ${T.line ? `<div class="pa-row"><span class="pa-grow">${esc(T.line)}</span></div>` : ""}</div>` : "";
  return hero + att + facts;
}
function pwCare(c, v, day, demo) {
  const P = v.pet, K = P.K, f = K.food;
  const monthly = Math.round(f * (P.food === "premium" ? 2 : 1) * 30 + (P.vet === "monthly" ? v.vetCost : 0));
  return `<h4 class="pa-h">Food</h4><div class="vn-card">${baOpt("food:normal", "Regular food", `${f} coins a day.`, P.food === "normal").replace(/data-ba=/g, "data-pw=")}${baOpt("food:premium", "Good food", `${f * 2} coins a day. Healthier, and gets sick less often.`, P.food === "premium").replace(/data-ba=/g, "data-pw=")}</div>
    <h4 class="pa-h">Walks and play</h4><div class="vn-card">${baOpt("walk:some", "When there's time", "A walk every few days. Less tiring.", P.walk === "some").replace(/data-ba=/g, "data-pw=")}${baOpt("walk:daily", "Every day", `Happier, and the bond grows faster. A little tiring for ${esc(c.name)}.`, P.walk === "daily").replace(/data-ba=/g, "data-pw=")}</div>
    <h4 class="pa-h">Vet</h4><div class="vn-card">${baOpt("vet:sick", "Only when sick", "No cost until something goes wrong.", P.vet === "sick").replace(/data-ba=/g, "data-pw=")}${baOpt("vet:monthly", "Monthly checkup", `${v.vetCost} coins a month. Catches illness early, and sick visits happen straight away.`, P.vet === "monthly").replace(/data-ba=/g, "data-pw=")}</div>
    <div class="vn-card"><div class="vn-row"><span>About ${monthly.toLocaleString("en")} coins a month</span><b>${esc(c.name)} pays</b></div><p class="vn-fact">Kids' pets are paid for by the grown-ups.</p></div>
    <p class="ba-note">You suggest, ${esc(c.name)} decides.</p>`;
}
function pwLife(c, v, day, demo) {
  const P = v.pet, out = [];
  if (P) {
    out.push(`<h4 class="pa-h">Life</h4><div class="vn-card"><div class="vn-row"><span>${pwAge(P.age)} old</span><b>${P.old ? "Getting old" : "In their prime"}</b></div>${vnBar(P.age / P.life, PW_COL)}
      <p class="vn-fact">${esc(P.K.label)}s live about ${pwAge(Pets.KINDS[P.kind].life)}. ${esc(P.K.about)}</p>
      <div class="vn-row"><span>Personality</span><b>${esc(P.persV[0])}</b></div><p class="vn-fact">${esc(P.persV[1])}</p>
      <div class="vn-row"><span>Tricks</span><b>${P.tricks.length ? esc(P.tricks.join(", ")) : "None yet"}</b></div>
      <div class="vn-row"><span>Pet show ribbons</span><b>${P.ribbons ? "🎀".repeat(Math.min(5, P.ribbons)) + (P.ribbons > 5 ? ` ×${P.ribbons}` : "") : "None yet"}</b></div></div>
      <h4 class="pa-h">Memories</h4><div class="pa-list">${P.mem.slice().reverse().map(([d, t]) => `<div class="pa-row"><span class="pa-grow">${esc(t)}<small>${pwAge(Math.max(1, day - d))} ago</small></span></div>`).join("")}</div>`);
  }
  if (v.past.length) out.push(`<h4 class="pa-h">Pets before</h4><div class="pa-list">${v.past.slice().reverse().map(o => `<div class="pa-row">${pwFace(o, o.K, 34)}<span class="pa-grow"><b>${esc(o.name)}</b><small>${esc(o.K.label)} · ${pwAge(o.died - o.born)} · ${{ old: "died of old age", sick: "died of an illness", neglect: "died from neglect", lost: "ran away and never came back", rehomed: "went to live with another family" }[o.why]}</small></span>${o.ribbons ? `<b>🎀${o.ribbons}</b>` : ""}</div>`).join("")}</div>`);
  else if (!P) out.push(`<p class="pa-note">No pets yet.</p>`);
  return out.join("");
}
function pwFind(c, v, day, demo) {
  const out = [];
  if (!v.canAdopt) out.push(`<div class="ba-hero"><b>${esc(c.name)} doesn't have a pet.</b><small>Kids can't adopt on their own. Sometimes a stray turns up at the door, and grown-ups in the family can adopt one.</small></div>`);
  else {
    out.push(`<div class="ba-hero"><b>${esc(c.name)} doesn't have a pet.</b><small>Suggest one, and ${esc(c.name)} decides. A pet costs food every day and lives a year or more. ${esc(c.name)} has ${vnCoins(v.wallet)} coins.</small></div>
      <h4 class="pa-h">Old Town shelter this week</h4><div class="pa-list">${v.shelter.map(o => `<div class="pa-row">${pwFace(o, o, 40)}<span class="pa-grow"><b>${esc(o.label)}</b><small>${esc(o.about)} About ${o.food} coins a day.</small></span><button class="kd-btn" data-pw="adopt:${o.k}@shelter" ${v.wallet < v.fee ? "disabled" : ""}>Adopt · ${v.fee}</button></div>`).join("")}</div>
      <p class="pa-note">Different pets wait at the shelter each week.</p>
      <h4 class="pa-h">Breeder</h4><div class="pa-list">${v.breeder.map(o => `<div class="pa-row">${pwFace(o, o, 40)}<span class="pa-grow"><b>${esc(o.label)}</b><small>${esc(o.about)}</small></span><button class="kd-btn alt" data-pw="adopt:${o.k}@breeder" ${v.wallet < o.price ? "disabled" : ""}>${vnCoins(o.price)}</button></div>`).join("")}</div>`);
  }
  if (DEV && !demo) out.push(`<h4 class="pa-h">Test mode (Dev): try every pet</h4><div class="vn-card"><p class="vn-fact">Opens a sample pet that has lived with ${esc(c.name)} for a few weeks. Nothing is saved.</p><span class="vn-btns">${Object.entries(Pets.KINDS).map(([k, o]) => `<button data-pw="try:${k}">${o.ic} ${esc(o.label)}</button>`).join("")}</span></div>`);
  return out.join("");
}
function pwBind(v) { v.querySelectorAll("[data-pw]").forEach(el => el.onclick = () => pwDo(el.dataset.pw)); baIntroBind(v); }
function pwDo(cmd) {
  const A = PH.pw || {}, [op, arg] = cmd.split(":"), keep = () => { const sc = PH.el.querySelector("#phView .pa")?.scrollTop || 0; phGo("paws", PH.pw); const bd = PH.el.querySelector("#phView .pa"); if (bd) bd.scrollTop = sc; };
  if (op === "tab") { PH.pw = { ...A, tab: arg }; phGo("paws", PH.pw); return; }
  if (op === "try") return pwDemo(arg);
  if (op === "home") { PH.pw = { tab: "today" }; phGo("paws", PH.pw); return; }
  if (A.demo) {
    if (op === "next") { Pets.demoNext(game.home, PW_DEMO); PH.pw = { ...A, tab: A.tab || "today" }; keep(); return kdToast(PW_DEMO.st.pet ? "A day passes." : "A day passes. The sample pet has died."); }
    const ok = Pets.demoAct(game.home, PW_DEMO, op, arg); keep();
    return kdToast(ok ? "Test mode: applied. Tap Next day to see what happens." : "Nothing changed.");
  }
  const c = game.home.get(cur.id), kind = `pet:${op}:${arg}`;
  const prev = game.onRefuse; let said = null;
  game.onRefuse = t => { said = t.quote; };
  const ok = game.act(c.id, kind);
  game.onRefuse = prev;
  drainNoon(); save(); refresh(); keep();
  if (said) return kdToast(`${c.name}: “${said}”`);
  if (!ok) return kdToast(op === "adopt" ? "Not enough coins for that." : "That's already the plan.");
  const P = (game.home.get(c.id).st || {}).pet;
  kdToast(op === "adopt" && P ? `Welcome home, ${P.name}! 🐾` : op === "card" ? (P && P.cardLast ? P.cardLast.t : "Done.") : `${c.name} will try that from tomorrow.`);
}


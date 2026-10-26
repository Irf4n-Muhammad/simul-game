// ================================================================ closet: cosmetics. Looks only; nothing here is read by the simulation
let closetTab = "wear";
function showCloset(tab = closetTab) {
  if (!cur || !game || !globalThis.Cosmetics) return;
  closetTab = tab;
  const C = Cosmetics, c = game.home.get(cur.id), saldo = C.saldo(state), own = C.owned(state, c, game.home), W = C.wearing(state, cur.id, c, game.home), H = C.homeLook(state);
  const sw = x => x.look && x.look.color != null && !x.look.shape ? `<i class="ck-sw" style="background:#${x.look.color.toString(16).padStart(6, "0")}"></i>` : "";
  const chip = (attr, s, x, on) => `<button class="chip ck ${x && x.ed !== "reguler" ? "ck-" + x.ed : ""}" data-${attr}="${s}:${x ? x.id : ""}" aria-pressed="${on}">${x ? sw(x) + esc(x.label) : "None"}${x && C.tags(x).length ? `<i class="ck-tag">${C.tags(x)[0]}</i>` : ""}</button>`;
  const row = (attr, s, now) => { const L = C.SLOTS[s], ids = Object.keys(own).filter(id => C.item(id).slot === s); return `<div class="fieldset"><span class="lbl">${L.label}${L.soon ? " · later" : ""}</span>${L.soon ? `<span class="muted">Not in this build yet.</span>` : `<div class="chips">${chip(attr, s, null, !now)}${ids.map(id => chip(attr, s, C.item(id), now === id)).join("")}</div>`}${L.note ? `<small class="sub">${L.note}</small>` : ""}</div>`; };
  const slots = on => Object.keys(C.SLOTS).filter(s => C.SLOTS[s].on === on);
  let body = "";
  if (tab === "wear") body = `<p class="muted">Looks only. Nothing here changes how ${esc(cur.nama)} lives, and the eyes, ears and tail stay the way they were born.</p>${slots("makhluk").map(s => row("wear", s, W[s])).join("")}`;
  else if (tab === "home") body = `<p class="muted">One home for the whole family: walls and floor change in every room.</p>${slots("rumah").map(s => row("home", s, H[s])).join("")}${slots("pet").map(s => row("home", s, null)).join("")}`;
  else {
    const sh = C.shop(Date.now(), state), left = Math.max(1, Math.ceil((sh.ends - Date.now()) / 86400000));
    body = `<p class="muted">New picks every week. This week's shop closes in ${left} day${left === 1 ? "" : "s"}.</p>
      <div class="list">${sh.items.map(e => `<div class="line"><span class="grow"><b>${sw(e.item)}${esc(e.item.label)}</b><small class="sub">${C.SLOTS[e.item.slot].label}${C.tags(e.item).length ? " · " + C.tags(e.item).join(" · ") : ""}</small></span><button class="mini" data-cbuy="${e.item.id}" ${e.owned || !e.can ? "disabled" : ""}>${e.owned ? "Owned" : `${C.CURRENCY.ic} ${e.item.harga}`}</button></div>`).join("")}</div>
      <p class="muted">${C.CURRENCY.label} come from the ${C.CURRENCY.label} shop and rewarded ads, both coming later. They never buy luck, coins, dice or time.</p>`;
  }
  openSheet("closet", `<span class="ribbon">CLOSET · ERA ${C.ERA}</span>
    <div class="row"><h2>${esc(cur.nama)}'s closet</h2><span class="coins">${C.CURRENCY.ic} ${saldo}</span></div>
    <div class="tabs">${[["wear", "Wear"], ["home", "Home"], ["shop", "Shop"]].map(([k, l]) => `<button class="chip" data-ctab="${k}" aria-pressed="${tab === k}">${l}</button>`).join("")}</div>
    ${body}
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelectorAll("[data-ctab]").forEach(b => b.onclick = () => showCloset(b.dataset.ctab));
  sheet.querySelector("[data-close]").onclick = closeSheet;
  sheet.querySelectorAll("[data-wear]").forEach(b => b.onclick = () => {
    const [s, id] = b.dataset.wear.split(":");
    if (!C.wear(state, cur.id, s, id || null, c, game.home)) return;
    Tele.ev("kosmetik", { a: id ? "pakai" : "lepas", i: id || W[s] || "", s }); save(); refresh(); showCloset("wear");
  });
  sheet.querySelectorAll("[data-home]").forEach(b => b.onclick = () => {
    const [s, id] = b.dataset.home.split(":");
    if (!C.setHome(state, s, id || null)) return;
    Tele.ev("kosmetik", { a: id ? "pakai" : "lepas", i: id || H[s] || "", s }); save(); applyHome(); showCloset("home");
  });
  sheet.querySelectorAll("[data-cbuy]").forEach(b => b.onclick = () => {
    const id = b.dataset.cbuy, x = C.item(id), r = C.buy(state, id);
    if (!r.ok) { say(r.why === "saldo" ? `Not enough ${C.CURRENCY.label}.` : "That one is not in the shop right now."); return; }
    Tele.ev("kosmetik", { a: "beli", i: id, s: x.slot, h: x.harga, saldo: C.saldo(state) }); save(); burst([C.CURRENCY.ic], 6, "#D4A853"); say(`Yours. Find it under ${C.SLOTS[x.slot].on === "makhluk" ? "Wear" : "Home"}.`); showCloset("shop");
  });
}
function showFamily() {
  const v = vm(), gens = [...new Set(v.anggota.map(m => m.gen))].sort((a, b) => a - b);
  openSheet("family", `
    <span class="ribbon" style="background: var(--plum)">FAMILY TREE · ${v.anggota.filter(m => m.fase !== "meninggal" && m.fase !== "merantau").length} AT HOME</span>
    <div class="box"><h3>${esc(famStatus().house.label)}</h3><small>${esc(famStatus().house.hood)} neighborhood</small></div>
    ${gens.map(g => `<span class="gen">GENERATION ${g}</span><div class="tree">${v.anggota.filter(m => m.gen === g).map(m => {
      const s = statusOf(m.id);
      return `<button class="node ${m.fase === "meninggal" ? "gone" : ""}" data-prof="${esc(m.id)}" aria-current="${m.id === selected}">
        <span class="dot" style="background:${colorOf(m)}"></span><b>${esc(m.nama)}</b>
        <span>${PHASE_EN[m.fase] || m.fase}</span><span>${esc(s?.best?.title || (s?.ach.length ? s.ach.length + " achievements" : ""))}</span></button>`;
    }).join("")}</div>`).join("")}
    ${awayBox()}
    <button class="secondary" id="closetBtn">${esc(cur.nama)}'s closet · ${Cosmetics.CURRENCY.ic} ${Cosmetics.saldo(state)}</button>
    <div class="row2"><button class="secondary" id="chronBtn">Family chronicle</button><button class="secondary" id="bkBtn">Back up${backupDue() ? " ⚠︎" : ""}</button></div>
    <button class="secondary" id="skyBtn">Sky & weather${WX ? ` · ${Weather.label(WX)}` : wxCfg.on ? "" : " · off"}</button>
    ${DEV ? `<button class="secondary" id="devBtn">Dev tools${state.dev_stars ? " · stars open" : ""}</button>` : ""}
    <div class="row2"><button class="secondary" id="resetBtn">Start over</button><button class="close" data-close="1">Close</button></div>
    ${verLabel("verTap")}`);
  sheet.querySelectorAll("[data-prof]").forEach(b => b.onclick = () => showProfile(b.dataset.prof));
  sheet.querySelector("[data-close]").onclick = closeSheet;
  sheet.querySelectorAll("[data-titip]").forEach(b => b.onclick = () => goAway(b.dataset.titip));
  $("chronBtn").onclick = () => showChronicle(false);
  $("bkBtn").onclick = showBackup;
  $("closetBtn").onclick = () => showCloset("wear");
  $("skyBtn").onclick = showSky;
  if (DEV) $("devBtn").onclick = () => showDev();
  // DEV-NEXT
  bindVerTap("verTap");
  $("resetBtn").onclick = () => {
    const b = $("resetBtn");
    if (b.dataset.armed) { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(CHAT_KEY); localStorage.removeItem(WA_KEY); localStorage.removeItem(CH_KEY); } catch (e) {} state = null; game = null; chats = {}; WA = waFresh(); CH = chFresh(); clearInterval(timer); closeSheet(); showSetup(); return; }
    b.dataset.armed = "1"; b.textContent = "Tap again: delete this family";
  };
}
function showProfile(id) {
  const m = member(id), s = statusOf(id);
  if (!m) return;
  const parents = m.orang_tua.map(p => game.home.get(p)?.name || game.home.world.npcs[p]?.nama).filter(Boolean);
  const here = m.fase !== "meninggal" && m.fase !== "merantau";
  openSheet("profile", `
    <span class="ribbon" style="background: var(--plum)">GEN ${m.gen} · ${esc((PHASE_EN[m.fase] || m.fase).toUpperCase())}</span>
    <div class="row"><h2>${esc(m.nama)}</h2><span class="dot" style="width:40px;height:40px;border-radius:50%;background:${colorOf(m)}"></span></div>
    <p>${fmtAge(m.umur)} old${parents.length ? ` · child of ${esc(parents.join(" & "))}` : ""}${m.pasangan ? ` · with ${esc(m.pasangan)}` : ""}</p>
    <div>${habitsOf(id).map(h => `<span class="tag">${esc(HABITS[h].label)}</span>`).join("")}</div>
    ${tasteLine(m)}
    ${wantsBox(id, here)}
    ${tonggakBox(id)}
    ${watakBox(id)}
    ${m.bekas.length ? `<div class="fieldset"><span class="lbl">Shaped by</span><div class="list">${m.bekas.map(b => `<div class="line"><span class="grow"><b>${esc(b.label)}</b><small class="sub">${esc(b.why || "")}${b.why ? " · " : ""}${fmtDate(b.d)}. Since then: ${esc(b.note)}.</small></span></div>`).join("")}</div></div>` : ""}
    ${s ? `<div class="box"><h3>${esc(s.best ? s.best.title : "No career yet")}</h3><small>${s.best ? esc(s.best.label) + " · " : ""}${coins(s.wallet)} · prestige ${s.prestige}</small></div>
      ${s.rares.length ? `<div>${s.rares.map(r => `<span class="tag rare">${esc(r.label)} · ${r.share}</span>`).join("")}</div>` : ""}
      <div class="fieldset"><span class="lbl">Skills</span>${skillRows(s)}</div>
      <div class="fieldset"><span class="lbl">Achievements</span>${s.ach.length ? `<div class="list">${s.ach.slice().reverse().map(a => `<div class="line"><span class="grow"><b>${esc(a.label)}</b><small class="sub">${fmtDate(a.day)}</small></span></div>`).join("")}</div>` : `<span class="sub">Nothing yet. Every life writes its own list.</span>`}</div>` : ""}
    ${s && Tree.view(game.home.get(id), game.home, today()).have.length ? `<button class="close" id="seeTree">Constellations: ${esc(Tree.pathOf(game.home.get(id)).slice(-2).join(", ") || Tree.view(game.home.get(id), game.home, today()).have.length + " stars lit")}</button>` : ""}
    <div class="row2">${here ? `<button class="big" id="goTo">Go to ${esc(m.nama)}</button>` : ""}<button class="close" id="backTree">Back</button></div>`);
  if ($("tonggakBox")) sheetQ("profile", "tonggak");
  sheet.querySelectorAll("[data-tour]").forEach(b => b.onclick = () => tourStart(b.dataset.tour, true));  // v45.1: "?" di kartu watak
  const g = $("goTo"); if (g) g.onclick = () => { select(id); closeSheet(); };
  const st = $("seeTree"); if (st) st.onclick = () => showTree(id);
  $("backTree").onclick = showFamily;
}

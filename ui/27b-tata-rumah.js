// ---- Tata Rumah (perabot.js + ui/03b-perabot.js): ketuk nama ruangan buat menata. Pasang/ganti/simpan, cat per ruangan, beli.
const PB_KIND_LBL = { fungsi: "Useful", hias: "Decor", dua: "Useful + decor" };
const pbC = n => `${Math.round(n).toLocaleString("en")} C`;
const pbLike = (v, n) => v > 0 ? ` <i class="pb-like">♥ ${esc(n)}</i>` : v < 0 ? ` <i class="pb-meh">${esc(n)}: meh</i>` : "";
function pbCreature() { return cur && game ? game.home.get(cur.id) : null; }
function pbFx(x) {
  if (!x) return "";
  return x.note || "";
}
function showDecor() {
  const c = pbCreature(); if (!c) return;
  const r = ROOMS[roomIx], v = Perabot.view(game.home, c, r.act), P = roomPaint(r.act);
  const dots = Array.from({ length: 4 }, (_, i) => `<i class="${i < v.mood ? "on" : ""}"></i>`).join("");
  openSheet("decor", `<span class="ribbon">Decorate</span>
    <h2>${esc(r.name)}</h2>
    <p class="pb-amb"><span class="pb-dots" aria-hidden="true">${dots}</span>${v.mood ? `Cozy for ${esc(cur.nama)}: <b>+${v.mood} mood</b> at ${esc(r.action)}` : `Add things ${esc(cur.nama)} likes to make it cozier.`}</p>
    <div class="pb-slots">${v.slots.map(s => `<button class="choice pb-slot" data-slot="${s.slot}"><small>${esc(s.name.toUpperCase())}</small><b>${s.item ? esc(s.item.name) : "Empty"}${pbLike(s.likes, cur.nama)}</b>${s.item && !s.item.def ? `<span>${esc(PB_KIND_LBL[s.item.kind])}</span>` : ""}</button>`).join("")}</div>
    <h3 class="pb-h">Walls</h3>
    <div class="pb-sw">${[null, ...PB_WALLS].map(w => `<button class="pb-swatch${(P.w && w && P.w.id === w.id) || (!P.w && !w) ? " on" : ""}" data-pw="${w ? w.id : ""}" aria-label="${w ? esc(w.name) : "Original"}" style="${w ? `background: linear-gradient(180deg, ${css(w.top)} 55%, ${css(w.low)} 55%)` : ""}">${w ? "" : "↺"}</button>`).join("")}</div>
    <h3 class="pb-h">Floor</h3>
    <div class="pb-sw">${[null, ...PB_FLOORS].map(f => `<button class="pb-swatch${(P.f && f && P.f.id === f.id) || (!P.f && !f) ? " on" : ""}" data-pf="${f ? f.id : ""}" aria-label="${f ? esc(f.name) : "Original"}" style="${f ? `background: linear-gradient(135deg, ${css(f.a)} 50%, ${css(f.b)} 50%)` : ""}">${f ? "" : "↺"}</button>`).join("")}</div>
    <div class="pb-foot"><button class="chip" id="pbShop">Shop furniture</button><button class="close" data-close="1">Done</button></div>`);
  sheet.querySelectorAll("[data-slot]").forEach(b => b.onclick = () => showDecorSlot(b.dataset.slot));
  sheet.querySelectorAll("[data-pw]").forEach(b => b.onclick = () => { setRoomPaint(r.act, "w", b.dataset.pw || null); save(); Tele.ev("perabot", { a: "cat", r: r.act, w: b.dataset.pw || "" }); showDecor(); });
  sheet.querySelectorAll("[data-pf]").forEach(b => b.onclick = () => { setRoomPaint(r.act, "f", b.dataset.pf || null); save(); Tele.ev("perabot", { a: "cat", r: r.act, f: b.dataset.pf || "" }); showDecor(); });
  $("pbShop").onclick = () => { closeSheet(); showBazaar("home"); };
  sheet.querySelector("[data-close]").onclick = closeSheet;
}
function pbDo(kind, ok) {
  if (!game.act(cur.id, kind)) return false;
  save(); refresh(); applyFurniture();
  if (ok) say(ok);
  return true;
}
function showDecorSlot(slot) {
  const c = pbCreature(); if (!c) return;
  const r = ROOMS[roomIx], v = Perabot.view(game.home, c, r.act), s = v.slots.find(x => x.slot === slot), day = today();
  const canBuy = canCare() && Perabot.canBuy(c, day), wallet = c.st ? c.st.wallet : 0;
  const row = (o, btn) => `<div class="pb-item"><div><b>${esc(o.item.name)}${pbLike(o.likes, cur.nama)}</b><small>${esc(PB_KIND_LBL[o.item.kind])}${o.item.def ? " · came with the house" : ""}${o.n ? ` · ${o.n} in storage` : ""}${o.have ? ` · you have ${o.have}` : ""}</small><p>${esc(pbFx(o.item))}</p></div>${btn}</div>`;
  openSheet("decor-slot", `<span class="ribbon">${esc(r.name)} · ${esc(s.name)}</span>
    <h2>${s.item ? esc(s.item.name) : "Empty"}</h2>
    ${s.item ? `<p>${esc(pbFx(s.item))}</p>` : ""}
    ${s.empty && s.item ? `<button class="chip" id="pbAway">Put it in storage</button>` : ""}
    ${s.options.length ? `<h3 class="pb-h">At home</h3>${s.options.map(o => row(o, `<button class="chip" data-put="${o.item.id}">Place</button>`)).join("")}` : ""}
    <h3 class="pb-h">Shop</h3>
    ${canBuy ? `<p class="pb-note">${esc(cur.nama)} pays from their own coins: <b>${pbC(wallet)}</b></p>` : `<p class="pb-note">Buying furniture takes a grown-up's coins. ${esc(cur.nama)} can shop from the teen years.</p>`}
    ${s.shop.map(o => row(o, `<button class="chip pb-buy" data-buy="${o.item.id}" ${canBuy && wallet >= o.item.price ? "" : "disabled"}>${pbC(o.item.price)}</button>`)).join("")}
    <button class="close" data-close="1">Back</button>`);
  sheet.querySelectorAll("[data-put]").forEach(b => b.onclick = () => {
    const x = Perabot.item(b.dataset.put), lk = Perabot.likes(c, x);
    if (pbDo(`perabot:pasang:${r.act}:${slot}:${x.id}`, lk > 0 ? "Ooh, I love it!" : lk < 0 ? "Hmm..." : "New look!")) { Tele.ev("perabot", { a: "pasang", r: r.act, s: slot, i: x.id }); showDecor(); }
  });
  sheet.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
    const x = Perabot.item(b.dataset.buy);
    if (!game.act(cur.id, "perabot:beli:" + x.id)) { if (!game.refused) say("Can't buy that right now."); return; }
    Tele.ev("perabot", { a: "beli", i: x.id, harga: x.price });
    const lk = Perabot.likes(c, x);
    if (pbDo(`perabot:pasang:${r.act}:${slot}:${x.id}`, lk > 0 ? "Ooh, I love it!" : lk < 0 ? "Hmm..." : "New!")) showDecor(); else { save(); refresh(); showDecorSlot(slot); }
  });
  if ($("pbAway")) $("pbAway").onclick = () => { if (pbDo(`perabot:simpan:${r.act}:${slot}`, "Stored.")) showDecor(); };
  sheet.querySelector("[data-close]").onclick = () => showDecor();
}
$("roomName").setAttribute("role", "button"); $("roomName").setAttribute("tabindex", "0"); $("roomName").setAttribute("aria-label", "Decorate this room");
$("roomName").onclick = () => { if (cur && !app.classList.contains("in-town")) showDecor(); };

// ---- tab Home di Bazaar: semua perabot, beli masuk gudang, tata lewat Decorate
function bzHome() {
  const c = bz.c, day = today(), can = canCare() && Perabot.canBuy(c, day), wallet = c.st ? c.st.wallet : 0, G = Perabot.storage(game.home);
  const toast = bz.toast; bz.toast = null;
  const groups = {};
  for (const x of Perabot.catalog()) (groups[Perabot.where(x)] ||= []).push(x);
  return `${toast ? `<p class="bz2-toast">${esc(toast)}</p>` : ""}<div class="bz2-intro"><h2>HOME</h2><p>Furniture for the family home. Useful pieces make care in that room work better; decor makes a room cozier, and everyone has their own taste. Things you buy wait in storage. Tap the room name at home to place them.</p></div>
    ${can ? "" : `<p class="bz2-note">${esc(c.name)} can buy furniture from the teen years.</p>`}
    ${Object.entries(groups).map(([where, xs]) => `<h4 class="pb-h2">${bzUp(where)}</h4>${xs.map(x => {
      const lk = Perabot.likes(c, x);
      return `<div class="pb-item bz"><div><b>${esc(x.name)}${pbLike(lk, c.name)}</b><small>${esc(PB_KIND_LBL[x.kind])}${x.tags.length ? " · " + esc(Perabot.tagNames(x).join(", ")) : ""}${G[x.id] ? ` · ${G[x.id]} in storage` : ""}</small><p>${esc(x.note)}</p></div>
        <button class="chip pb-buy" data-pbb="${x.id}" ${can && wallet >= x.price ? "" : "disabled"}>${pbC(x.price)}</button></div>`;
    }).join("")}`).join("")}`;
}
function bzHomeBind(body) {
  body.querySelectorAll("[data-pbb]").forEach(b => b.onclick = () => {
    const x = Perabot.item(b.dataset.pbb);
    if (!game.act(cur.id, "perabot:beli:" + x.id)) { if (!game.refused) say("Can't do that right now."); return; }
    Tele.ev("perabot", { a: "beli", i: x.id, harga: x.price });
    save(); refresh(); say("Ooh, new!");
    bz.toast = `${x.name} is in storage. Tap the room name at home to place it.`;
    bzShow("home");
  });
}

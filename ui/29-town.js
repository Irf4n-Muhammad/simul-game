// ================================================================ the town
// v73: tampilan luar bertingkat. Tombol kota buka globe (5 benua); zoom ke Old Town = masuk peta kota; zoom terus = jalan.
// Dari peta kota zoom keluar = balik ke globe. Pindah lapisan pakai tirai awan (#veil) biar kerasa satu gerakan.
let TOWN = null, GLOBE = null, CONT = null, KONSER = null, LIAR = null;   // v80: LIAR = wilayah liar (ui/29c-liar.js)   // v78: KONSER = arena konser orang ketiga (ui/29b-konser.js)   // v75: CONT = peta benua di antara globe dan kota
function townData() {
  const day = today(), fv = famStatus();
  const members = game.home.members.filter(m => m.st && m.alive(day) && !("keluar" in m.info));
  const car = members.map(m => Status.bestItem(m, "Car")).filter(Boolean).sort((a, b) => b.price - a.price)[0] || null;
  const prices = Object.fromEntries(Status.ITEMS.filter(i => i.cat === "House").map(i => [i.id, `${i.label} · ${coins(i.price)}`]));
  return { npcs: Status.npcTown(day), prices,
    player: { name: `${cur ? cur.nama : "Your"}'s family`, title: fv.house.label + (car ? ` · ${car.label}` : ""), house: fv.house.id, car: car ? car.id : null, color: FUR[cur?.rupa.warna] || 0xE5BFBF,
      lot: fv.lot, build: fv.build },
    you: youData() };
}
// makhluk di kota: jadwalnya dihitung kota.js dari fase, sekolah pilihan, kerja, dan agenda hari ini
function youData() {
  if (!cur || !game) return null;
  const c = game.home.get(cur.id); if (!c) return null;
  const day = today(), s = statusOf(cur.id), ag = c.info.agenda_hari && c.info.agenda_hari.hari === day ? c.info.agenda_hari.id : null;
  return { name: cur.nama, color: FUR[cur.rupa.warna] || 0xE5BFBF, day,
    o: { fase: cur.fase, umur: cur.umur, dow: new Date().getDay(), agenda: ag, school: (c.info.sekolah_pilihan || {}).id || "dekat",
      job: s && s.job ? { co: s.job.co || s.job.id, label: s.job.title } : null, libur: c.has("libur", day), studyTour: c.has("study_tour", day), sambilan: !!c.info.sambilan } };
}
function townInit() {
  if (!TOWN) TOWN = Town.create({ THREE, renderer, canvas, M, F, RB, SPH, CYL, canvasTex, environment: scene.environment,
    getLit: () => LIT, getPeriod: () => litName, bgColor: () => townSky()[1], getWeather: () => (typeof WX === "string" ? WX : "clear"), getFair: () => fairInfo(), onBolt: () => SND && SND.thunder(), reduce, showLot,
    now: () => dayFloat(), PAINTS: Status.PAINTS, toGlobe: () => toRegion() });
  return TOWN;
}
function globeInit() {
  if (!GLOBE && globalThis.Globe) GLOBE = Globe.create({ THREE, renderer, canvas, canvasTex, F, reduce,
    enterCity: () => cityFromGlobe(), enterRegion: C => regionFromGlobe(C.id), showContinent, showCity, soonHint: C => say(`${C.name} opens later. Old Town is the live city for now.`) });
  return GLOBE;
}
function contInit() {
  if (!CONT && globalThis.Continent) CONT = Continent.create({ THREE, renderer, canvas, canvasTex, F, reduce,
    enterCity: () => cityFromRegion(), toGlobe: () => toGlobe(CONT.id), showTown, showWild: (w, C) => showWild(w, C) });
  return CONT;
}
const veil = (on) => new Promise(res => { const v = $("veil"); v.classList.toggle("on", on); setTimeout(res, on ? 380 : 0); });
function outMode(m) {
  app.classList.toggle("in-town", !!m); app.classList.toggle("in-globe", m === "globe"); $("townUI").hidden = !m || m === "konser" || m === "liar";
  app.classList.toggle("in-konser", m === "konser"); $("konserUI").hidden = m !== "konser";
  app.classList.toggle("in-region", m === "region");
  app.classList.toggle("in-liar", m === "liar"); $("liarUI").hidden = m !== "liar";
  $("townHint").textContent = m === "globe" ? "Drag to spin · pinch to zoom in · tap a continent" : m === "region" ? "Drag to move · zoom in on Old Town · tap a town" : "Drag to move · pinch to zoom · tap a place";
  paintBg();
}
// tombol kota: mulai dari globe
async function enterWorld() {
  sndInit();
  if (!game || !globalThis.Globe) return enterTown();
  hideHint(); closeSheet(); if (tour) tourEnd("lanjut"); Tele.layar("app", "globe");
  globeInit(); if (TOWN) TOWN.exit();
  GLOBE.enter(); GLOBE.resize(app.clientWidth, app.clientHeight); outMode("globe");
}
async function cityFromGlobe() {
  closeSheet(); await veil(true);
  townInit(); Tele.layar("app", "town");   // globe tetap "on" sampai kota siap, biar tur dan pengingat nggak nongol di tengah tirai
  await TOWN.enter(townData(), false, { map: true }); TOWN.resize(app.clientWidth, app.clientHeight);
  GLOBE.exit(); outMode("town"); veil(false); fairHint();
}
async function toGlobe(cont) {
  closeSheet(); await veil(true);
  if (TOWN) TOWN.exit(); if (CONT) CONT.exit(); globeInit(); Tele.layar("app", "globe");
  GLOBE.enter({ back: true, at: cont && Bumi.CONT[cont] }); GLOBE.resize(app.clientWidth, app.clientHeight); outMode("globe"); veil(false);
}
// v75: peta benua. Dari globe (zoom dekat atau tombol), dari kota (zoom keluar), dan ke kota (zoom masuk di atas Old Town).
let wantCity = false;
async function regionFromGlobe(id) {
  if (!contInit()) return cityFromGlobe();
  closeSheet(); await veil(true); Tele.layar("app", "benua");
  CONT.enter(id, "globe"); CONT.resize(app.clientWidth, app.clientHeight);
  if (GLOBE) GLOBE.exit(); if (TOWN) TOWN.exit(); outMode("region"); veil(false);
  if (wantCity) { wantCity = false; CONT.goLive(); }
}
async function toRegion() {
  if (!contInit()) return toGlobe();
  closeSheet(); await veil(true); Tele.layar("app", "benua");
  if (TOWN) TOWN.exit(); CONT.enter(Bumi.CONT[Bumi.CITIES.find(c => c.live).cont].id, "city"); CONT.resize(app.clientWidth, app.clientHeight);
  outMode("region"); veil(false);
}
async function cityFromRegion() {
  closeSheet(); await veil(true);
  townInit(); Tele.layar("app", "town");
  await TOWN.enter(townData(), false, { map: true }); TOWN.resize(app.clientWidth, app.clientHeight);
  CONT.exit(); outMode("town"); veil(false); fairHint();
}
function showTown(t, C) {
  sheet.classList.add("clear");
  const body = t.live ? `<p>Your home city. Zoom in on it to go down to the streets.</p><button class="big" id="goCity">Go to ${esc(t.name)}</button>`
    : t.main ? `<p>${esc(C.look)}. The big city of ${esc(C.name)}, coming soon.</p><p class="muted">For now every creature lives in Old Town.</p>`
    : `<p>A small town in ${esc(C.name)}. ${esc(C.look)}.</p><p class="muted">Small towns open later. One day your creature might move here, or visit for the ${esc(C.festival)}.</p>`;
  openSheet("lot", `<span class="ribbon">${esc(C.name)}</span><h2>${esc(t.name)}</h2>${body}<button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  const g = $("goCity"); if (g) g.onclick = () => { closeSheet(); CONT.goLive(); };
  CONT.flyTo(t.x, t.z + 4, t.live ? 0.25 : 0.3);
}
function showContinent(C) {
  sheet.classList.add("clear");
  const city = Bumi.CITIES.find(c => c.cont === C.id);
  openSheet("lot", `<span class="ribbon">Continent</span><h2>${esc(C.name)}</h2><p>${esc(C.look)}.</p>
    <div class="facts"><span>Climate</span><span>${esc(C.climate)}</span><span>Festival</span><span>${esc(C.festival)}</span><span>Main city</span><span>${esc(city.name)}${city.live ? "" : " · coming soon"}</span></div>
    ${city.live ? `<button class="big" id="goCity">Go to ${esc(city.name)}</button>` : `<p class="muted">Every continent starts with one big city. ${esc(city.name)} opens later; new towns arrive each season.</p>`}
    ${globalThis.Continent ? `<button class="big" id="goMap">Open the map of ${esc(C.name)}</button>` : ""}
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  const gm = $("goMap"); if (gm) gm.onclick = () => { closeSheet(); regionFromGlobe(C.id); };
  if (city.live) $("goCity").onclick = () => { closeSheet(); wantCity = true; GLOBE.goHome(); }; else GLOBE.goContinent(C);
}
function showCity(C) {
  const K = Bumi.CONT[C.cont];
  if (C.live) { wantCity = true; GLOBE.goHome(); return; }
  sheet.classList.add("clear");
  openSheet("lot", `<span class="ribbon">${esc(K.name)}</span><h2>${esc(C.name)}</h2><p>${esc(K.look)}. Coming soon.</p>
    <p class="muted">For now every creature lives in Old Town. Later, new creatures are born all over the world, and moving away is how you get somewhere else.</p>
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  GLOBE.flyTo(C.lat, C.lon, 1.7);
}
// v77: suara kota (suara.js). Mulai waktu tombol kota dipencet (butuh sentuhan dulu buat bunyi), diam di luar kota.
let SND = null, bellMin = -1;
function sndInit() { if (!SND && globalThis.Suara) SND = Suara.create(); if (SND) { SND.start(); sndBtn(); } return SND; }
function sndBtn() { const b = $("soundBtn"); if (!b || !SND) return; b.classList.toggle("off", !SND.on); b.setAttribute("aria-pressed", String(SND.on)); b.setAttribute("aria-label", SND.on ? "Town sounds on" : "Town sounds off"); }
function sndTick() {
  if (!SND || !SND.started) return;
  const wx = typeof WX === "string" ? WX : "clear";
  if (KONSER && KONSER.on) return SND.set({ rain: 0, traffic: 0, birds: 0, crickets: 0, crowd: KONSER.crowd() });
  if (GLOBE && GLOBE.on) return SND.set({ rain: 0, traffic: 0, birds: 0, crickets: 0, crowd: 0 });
  if (CONT && CONT.on) return SND.set(Object.assign(Suara.mixOf({ wx, period: litName, zoom: 1, fair: 0 }), { traffic: 0 }));
  if (!(TOWN && TOWN.on)) return SND.silence();
  const F = fairInfo(), P = Kota.PLACE[Kota.FAIR.place], f = TOWN.focus();
  const fair = F && F.on ? Math.max(0, 1 - Math.hypot(f.x - P.x, f.z - (P.z - 10)) / 30) : 0;
  SND.set(Suara.mixOf({ wx, period: litName, zoom: TOWN.zoomLevel(), fair }));
  const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
  if (m !== bellMin) { bellMin = m; if (Suara.bellDue(d) && TOWN.zoomLevel() < 0.6) SND.bell(); }
}
setInterval(sndTick, 1000);
$("soundBtn").onclick = () => { sndInit(); SND.mute(SND.on); sndBtn(); };
// v77: naik kereta ke kota kecil di Meridia (akhir pekan atau hari libur). Tiga kota terdekat lewat jalan dari Old Town.
function tripTowns() {
  if (!globalThis.Region) return [];
  const R = Region.region(Bumi.CITIES.find(c => c.live).cont), home = R.towns.find(t => t.live);
  return R.towns.filter(t => !t.main).map(t => ({ t, d: Math.hypot(t.x - home.x, t.z - home.z) })).sort((a, b) => a.d - b.d).slice(0, 3).map(o => Object.assign({ d: o.d }, o.t));
}
function tripState() {
  const W = walkState(); if (!W.ok) return W;
  const c = game.home.get(cur.id), dow = new Date().getDay();
  if (!(dow === 0 || dow === 6 || (c && c.has && c.has("libur", today())))) return { ok: false, why: `Day trips are for weekends and school holidays.` };
  return { ok: true };
}
function tripHtml() {
  const T = tripTowns(); if (!T.length) return "";
  const S = tripState(), mins = t => Math.round(10 + t.d / 3);
  return `<p><b>Day trips by train</b></p>${S.ok ? T.map(t => `<button class="big" data-trip="${esc(t.id)}">Train to ${esc(t.name)} with ${esc(cur.nama)} · ${mins(t)} min</button>`).join("") : S.why ? `<p class="muted">${esc(S.why)}</p>` : ""}`;
}
function bindTrips() {
  sheet.querySelectorAll("[data-trip]").forEach(b => b.onclick = async () => {
    const t = tripTowns().find(x => x.id === b.dataset.trip); if (!t) return;
    const wx = typeof WX === "string" && GameLayer.WALK_WX[WX] ? ":" + WX : "";
    if (!game.act(cur.id, "trip:" + t.name + wx)) return say("Not today.");
    drainNoon(); save(); refresh(); closeSheet(); Tele.ev("kota", { a: "trip", p: t.name });
    const line = (feed.slice().reverse().find(l => l.events.includes("trip")) || { lines: [] }).lines.slice(-1)[0] || "";
    await veil(true); contInit(); if (TOWN) TOWN.exit();
    CONT.enter(Bumi.CITIES.find(c => c.live).cont, "city"); CONT.resize(app.clientWidth, app.clientHeight); outMode("region"); veil(false);
    CONT.trip(t.id, () => {
      sheet.classList.add("clear");
      openSheet("lot", `<span class="ribbon">Day trip</span><h2>${esc(cur.nama)} in ${esc(t.name)}</h2><p>${esc(line)}</p>
        <p class="muted">Small towns get their own streets later. For now you can look around the map, or head home.</p>
        <button class="big" id="tripHome">Train back to Old Town</button><button class="close" data-close="1">Stay on the map</button>`);
      sheet.querySelector("[data-close]").onclick = closeSheet;
      $("tripHome").onclick = () => { closeSheet(); cityFromRegion(); };
    });
  });
}
// v76: pasar akhir pekan / festival di Riverside Park (kota.js), dihitung ulang paling sering tiap 20 detik
let fairC = { t: 0, v: null };
function fairInfo() {
  const t = Date.now(); if (t - fairC.t < 20000) return fairC.v;
  const fest = game ? (Engine.world_active(game.home.world, today()) || []).find(e => e.jenis === "festival") : null;
  fairC = { t, v: Kota.fairNow(new Date(), fest ? { nama: fest.nama, ikon: fest.ikon } : null) };
  return fairC.v;
}
let fairSaid = "";
function fairHint() { const F = fairInfo(), k = F && F.on ? today() + F.name : ""; if (k && k !== fairSaid) { fairSaid = k; setTimeout(() => say(`${F.ikon} ${F.name} is on at Riverside Park until ${F.to}:00.`, 4000), 1200); } }
// v75: ajak jalan. Bisa kalau makhluknya lagi senggang (di rumah atau nongkrong, bukan tidur/sekolah/kerja/pergi) dan belum jalan hari ini.
function walkState() {
  if (!cur || !TOWN || !TOWN.you) return { ok: false, why: "" };
  const Y = TOWN.you, c = game.home.get(cur.id), day = game.home.last_day;
  if (TOWN.walking()) return { ok: false, why: `${cur.nama} is already out with you.` };
  if (c && c.info.jalan === day) return { ok: false, why: `You already went out with ${cur.nama} today.` };
  if (Y.away) return { ok: false, why: `${cur.nama} is away.` };
  if (WX === "storm") return { ok: false, why: `It's stormy out there. Better stay in with ${cur.nama} for now.` };
  if (/Asleep|Napping/i.test(Y.line)) return { ok: false, why: `${cur.nama} is asleep. Maybe later.` };
  if (!["home", "park", "square"].includes(Y.at)) return { ok: false, why: `${cur.nama} is busy right now (${Y.line.toLowerCase()}).` };
  return { ok: true };
}
const walkBtn = (dest) => { const W = walkState(), F = dest === "fair" ? fairInfo() : null; return W.ok ? `<button class="big" id="goWalk" data-dest="${dest}">${F ? `Go to ${F.kind === "festival" ? esc(F.name) : "the market"} with ${esc(cur.nama)}` : `Walk here with ${esc(cur.nama)}`}</button>` : W.why ? `<p class="muted">${esc(W.why)}</p>` : ""; };
function bindWalk() {
  const b = $("goWalk"); if (!b) return;
  b.onclick = () => {
    const dest = b.dataset.dest;
    const wx = typeof WX === "string" && GameLayer.WALK_WX[WX] ? ":" + WX : "";
    if (!game.act(cur.id, "jalan:" + dest + wx)) return say("Not today.");
    drainNoon(); save(); refresh(); closeSheet();
    TOWN.walkWith(dest, (game.home.get(cur.id).info.sekolah_pilihan || {}).id || "dekat");
    Tele.ev("kota", { a: "jalan", p: dest });
  };
}
// a named place in the city: what it is, who's there now
function showPlace(l) {
  const P = l.place, c = new Date(), sec = c.getHours() * 3600 + c.getMinutes() * 60;
  const day = Math.floor((c.getTime() - c.getTimezoneOffset() * 60000) / 864e5), n = Kota.crowd(day, c.getDay(), sec)[P.id] || 0;
  const Y = TOWN.you, here = Y && Y.at === P.id;
  sheet.classList.add("clear");
  openSheet("lot", `<span class="ribbon">Old Town</span><h2>${esc(P.name)}</h2><p>${esc(P.about)}</p>
    ${here ? `<p><b>${esc(cur.nama)} is here.</b> ${esc(Y.line)}.</p>` : ""}
    <div class="facts"><span>Right now</span><span>${n ? `${n} townsfolk` : "Quiet"}</span>${P.school ? `<span>Pupils</span><span>${P.school === "smp" ? "Every creature, day 180 to 265" : "From day 60"}</span>` : ""}</div>
    ${P.id === "park" && fairInfo() ? `<p><b>${esc(fairInfo().ikon)} ${esc(fairInfo().name)}</b> · ${fairInfo().on ? `on now, until ${fairInfo().to}:00` : fairInfo().soon ? `opens at ${fairInfo().from}:00 today` : "finished for today"}. Stalls, music and half the town by the pond.</p>` : ""}
    ${P.id === "park" && fairInfo() && fairInfo().on ? walkBtn("fair") : P.id === "park" || P.id === "bazaar" ? walkBtn(P.id) : P.school && P.id === Kota.SCHOOL_OF[(game.home.get(cur.id).info.sekolah_pilihan || {}).id || "dekat"] ? walkBtn("school") : ""}
    ${P.id === "park" ? konserHtml() : ""}
    ${P.id === "station" ? tripHtml() : ""}
    ${TOWN.canEnter(l) ? `<button class="big" id="goIn">${here ? `Look in on ${esc(cur.nama)}` : "Go inside"}</button>` : ""}
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  bindWalk(); bindTrips(); bindKonser();
  const gi = $("goIn"); if (gi) gi.onclick = () => { closeSheet(); TOWN.enterPlace(l); Tele.ev("kota", { a: "masuk", p: P.id }); };
}
async function enterTown() {
  sndInit();
  if (!game || !globalThis.Town) return;
  hideHint(); closeSheet(); if (tour) tourEnd("lanjut"); Tele.layar("app", "town");
  townInit();
  $("townBtn").disabled = true;
  await TOWN.enter(townData());
  $("townBtn").disabled = false;
  TOWN.resize(app.clientWidth, app.clientHeight);
  if (GLOBE) GLOBE.exit(); outMode("town"); fairHint();
}
function exitTown() { if (LIAR && LIAR.on) liarOff(); if (KONSER && KONSER.on) konserLeave(); if (SND) SND.silence(); if (TOWN) TOWN.exit(); if (GLOBE) GLOBE.exit(); if (CONT) CONT.exit(); outMode(null); $("veil").classList.remove("on"); closeSheet(); }
const daysLeft = n => n > 0 ? `${n} day${n > 1 ? "s" : ""} left` : "Moving in today";
const liveLeft = b => Math.max(0, b.done - today());
const buildFrac = b => Math.max(0.04, Math.min(1, (dayFloat() - b.start) / Math.max(0.01, b.done - b.start)));
function showLot(l) {
  if (l.place) return showPlace(l);
  if (l.square || l.civic) return showCivic(l);
  const H = l.hood, w = l.who, house = Status.ITEMS.find(i => i.id === H.id) || Status.RENTED;
  const carOf = id => (Status.ITEMS.find(i => i.id === id) || {}).label || "No car";
  const MODELS = Status.MODELS[H.id] || [];
  const bar = b => `<div class="progress"><i style="width:${Math.round(buildFrac(b) * 100)}%"></i></div>`;
  sheet.classList.add("clear");
  if (w && w.you && l.build) {
    openSheet("lot", `<span class="ribbon">${esc(H.name)} · Lot ${l.i + 1}</span><h2>Your new ${esc(house.label.toLowerCase())}</h2>
      ${bar(l.build)}<p>${daysLeft(liveLeft(l.build))}. The family moves in as soon as it's finished.</p>
      <div class="facts"><span>Model</span><span>${esc(MODELS[l.build.model] || "")}</span><span>Colour</span><span>${esc(Status.PAINTS[l.build.paint][0])}</span></div>
      <button class="close" data-close="1">Close</button>`);
  } else if (w && w.you) {
    const fb = famStatus().build;
    openSheet("lot", `<span class="ribbon">${esc(H.name)}</span><h2>Your family's home</h2>
      <div class="facts"><span>Home</span><span>${esc(house.label)}</span><span>Car</span><span>${esc(carOf(w.car))}</span></div>
      ${fb ? `<p>A new ${esc(fb.item.label.toLowerCase())} is going up in ${esc(fb.item.hood)}. ${daysLeft(fb.left)}.</p>` : ""}
      <button class="big" id="goIn">Go inside</button><button class="close" data-close="1">Close</button>`);
    $("goIn").onclick = exitTown;
  } else if (w && l.build) {
    openSheet("lot", `<span class="ribbon">${esc(H.name)} · Lot ${l.i + 1}</span><h2>${esc(w.name)} is building a ${esc(house.label.toLowerCase())}</h2>
      ${bar(l.build)}<p>${daysLeft(liveLeft(l.build))}. ${esc(w.sub)}.</p>
      <div class="facts"><span>Wealth</span><span>${coins(w.wealth)}</span><span>Model</span><span>${esc(MODELS[w.model % MODELS.length] || "")}</span></div>
      <button class="close" data-close="1">Close</button>`);
  } else if (w) {
    openSheet("lot", `<span class="ribbon">${esc(H.name)}</span><h2>${esc(w.name)}</h2><p>${esc(w.sub)}</p>
      <div class="facts"><span>Wealth</span><span>${coins(w.wealth)}</span><span>Home</span><span>${esc(house.label)}</span><span>Car</span><span>${esc(carOf(w.car))}</span></div>
      <button class="close" data-close="1">Close</button>`);
  } else if (H.id === "rented" || H.id === "flat") {
    openSheet("lot", `<span class="ribbon">${esc(H.name)}</span><h2>${esc(house.label)}s</h2><p>${H.id === "rented" ? "Rooms here are rented, nothing to build." : "Flats are bought from the shop. Your family moves in the next day."}</p>
      <button class="close" data-close="1">Close</button>`);
  } else return pickLot(l, house);
  sheet.querySelector("[data-close]").onclick = closeSheet;
}
// The town square and public places: what's open, and how many homes the next one needs
function showCivic(l) {
  sheet.classList.add("clear");
  const all = Town.CIVIC, next = all.filter(c => l.homes < c.need).sort((a, b) => a.need - b.need)[0];
  if (l.square) {
    openSheet("lot", `<span class="ribbon">Town Square</span><h2>The heart of town</h2>
      <p>The clock on the tower shows your real time. Public places open as more families in town own a home.</p>
      <div class="facts">${all.map(c => `<span>${esc(c.name)}</span><span>${l.homes >= c.need ? "Open" : `Opens at ${c.need} homes`}</span>`).join("")}</div>
      <p class="muted">${l.homes.toLocaleString("en")} families own a home now.${next ? ` ${(next.need - l.homes).toLocaleString("en")} more and the ${esc(next.name.toLowerCase())} opens.` : ""}</p>
      ${walkBtn("square")}
      <button class="close" data-close="1">Close</button>`);
    bindWalk();
  } else {
    const c = l.civic, frac = Math.min(1, l.homes / c.need);
    openSheet("lot", `<span class="ribbon">Town Square</span><h2>${esc(c.name)}</h2><p>${esc(c.about)}</p>
      ${l.open ? `<p>Open for everyone. Visiting with your creature comes later.</p>`
        : `<div class="progress"><i style="width:${Math.round(frac * 100)}%"></i></div><p>Opens when ${c.need.toLocaleString("en")} families in town own a home. ${l.homes.toLocaleString("en")} do now.</p>`}
      <button class="close" data-close="1">Close</button>`);
  }
  sheet.querySelector("[data-close]").onclick = closeSheet;
}
// An empty lot: choose a model and colour, see it on the lot, then build it in real time
function pickLot(l, house) {
  const H = l.hood, MODELS = Status.MODELS[H.id], s = cur ? statusOf(cur.id) : null, fv = famStatus();
  const it = Status.shop(cur && game.home.get(cur.id), game.home, today()).find(i => i.id === H.id);
  let model = 0, paint = 0;
  const why = !cur || !s ? "Hatch a creature first."
    : cur.umur < 180 ? `${cur.nama} can buy land in the teen years.`
    : fv.build ? `Your ${fv.build.item.label.toLowerCase()} in ${fv.build.item.hood} is still being built.`
    : it.owned ? "Your family already lives in a home this nice or nicer."
    : fv.kpr ? "The family is still paying off a mortgage. Pay it off first."
    : s.wallet < house.price ? `${cur.nama} has ${coins(s.wallet)}. This lot and home cost ${coins(house.price)}.`
    : !canCare() ? (game.pending ? "Answer the question that's waiting first." : "Not right now.") : "";
  // KPR: uang muka 30%, sisanya pinjaman keluarga (bank.js); cuma ditawarkan kalau uang tunainya kurang
  const q = cur && s && !fv.build && !it.owned && !fv.kpr && s.wallet < house.price && canCare() ? Status.kprQuote(game.home.get(cur.id), game.home, H.id, today()) : null;
  const qNote = !q ? "" : q.ok ? `Or take a mortgage: ${coins(q.down)} down, then about ${coins(q.pay)} a day for ${Math.round(q.term / 30)} months at ${(q.rate * 100).toFixed(1)}% a year (floating). Miss 60 days of payments and the bank takes the house.`
    : q.why === "down" ? `A mortgage needs ${coins(q.down)} down.` : q.why === "income" ? `The bank says the family's steady income is too low for a mortgage this size.` : q.why === "credit" ? "The bank won't lend to this family for now." : q.why === "age" ? `${cur.nama} can take a mortgage as an adult.` : "";
  const draw = () => {
    openSheet("lot", `<span class="ribbon">${esc(H.name)} · Lot ${l.i + 1}</span><h2>Empty lot</h2>
      <p>Pick a ${esc(house.label.toLowerCase())} and it gets built here in real time: ${Status.BUILD_DAYS[H.id]} days. ${it && parseFloat(it.share) > 0 ? `${it.share} of creatures can afford one.` : "No other creature in the world can afford one yet."}</p>
      <div class="fieldset"><span class="lbl">Model</span><div class="row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap">${MODELS.map((m, k) => `<button class="chip" data-model="${k}" aria-pressed="${k === model}">${esc(m)}</button>`).join("")}</div></div>
      <div class="fieldset"><span class="lbl">Colour</span><div class="swatches">${Status.PAINTS.map(([n, c], k) => `<button class="swatch" data-paint="${k}" aria-label="${n}" aria-pressed="${k === paint}" style="background:#${c.toString(16).padStart(6, "0")}"></button>`).join("")}</div></div>
      ${why ? `<p class="muted">${esc(why)}</p>` : ""}
      ${qNote ? `<p class="muted">${esc(qNote)}</p>` : ""}
      ${q && q.ok ? `<button class="big" id="kprIt">Build with a mortgage · ${coins(q.down)} down</button>` : `<button class="big" id="buildIt" ${why ? "disabled" : ""}>Build here · ${coins(house.price)}</button>`}
      <button class="close" data-close="1">Close</button>`);
    sheet.querySelectorAll("[data-model]").forEach(b => b.onclick = () => { model = +b.dataset.model; draw(); });
    sheet.querySelectorAll("[data-paint]").forEach(b => b.onclick = () => { paint = +b.dataset.paint; draw(); });
    sheet.querySelector("[data-close]").onclick = closeSheet;
    const go = async kind => {
      if (!game.act(cur.id, `${kind}:${H.id}@${l.i},${model},${paint}`)) return say("Couldn't buy it.");
      save(); refresh(); closeSheet();
      await TOWN.enter(townData(), true);
      const nl = TOWN.lots.find(x => x.who && x.who.you && x.build); if (nl) TOWN.focusLot(nl);
      burst(["★"], 6, "#D4A853"); say("Construction starts today!");
    };
    if ($("buildIt")) $("buildIt").onclick = () => go("beli");
    if ($("kprIt")) $("kprIt").onclick = () => go("kpr");
    sheet.classList.add("clear");
    TOWN.preview(l, model, paint);
  };
  TOWN.focusLot(l); draw();
}
$("townBtn").onclick = () => { if (outView()) exitTown(); else enterWorld(); };
$("homeBtn").onclick = exitTown;
$("zoomIn").onclick = () => { if (GLOBE && GLOBE.on) GLOBE.zoomBy(0.78); else if (CONT && CONT.on) CONT.zoomBy(-0.14); else if (TOWN && TOWN.on) TOWN.zoomBy(-0.14); };
$("zoomOut").onclick = () => { if (GLOBE && GLOBE.on) GLOBE.zoomBy(1.28); else if (CONT && CONT.on) CONT.zoomBy(0.14); else if (TOWN && TOWN.on) TOWN.zoomBy(0.14); };
$("toGlobe").onclick = () => { if (GLOBE && GLOBE.on) { wantCity = true; GLOBE.goHome(); } else if (CONT && CONT.on) toGlobe(CONT.id); else toRegion(); };
$("findYou").onclick = () => { if (TOWN && TOWN.on && !TOWN.findYou() && TOWN.you) say(TOWN.you.line); };
// baris "makhluk lagi di mana" di bawah, diperbarui pelan (bukan tiap frame)
let findLine = "";
function townChips() {
  const fy = $("findYou"), inTown = TOWN && TOWN.on, Y = inTown && TOWN.you;
  fy.hidden = !Y; if (Y) { const t = `${cur ? cur.nama : ""} · ${Y.line}`; if (t !== findLine) { findLine = t; fy.querySelector("span").textContent = t; } }
  $("toGlobe").setAttribute("aria-label", GLOBE && GLOBE.on ? "Go to Old Town" : CONT && CONT.on ? "Zoom out to the globe" : "Zoom out to the continent");
  $("toGlobe").classList.toggle("on", !!(GLOBE && GLOBE.on));
}

function resize() {
  const w = app.clientWidth, h = app.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; if (TOWN) TOWN.resize(w, h); if (GLOBE) GLOBE.resize(w, h); if (CONT) CONT.resize(w, h); if (KONSER) KONSER.resize(w, h); if (LIAR) LIAR.resize(w, h);
  // face the creature straight on; fit about 5 units of width at the creature
  camera.fov = 44;
  const half = 2.75, dist = half / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(0.75, camera.aspect));
  camera.position.set(CAM_LOOK.x, CAM_LOOK.y + dist * 0.12, CAM_LOOK.z + dist);
  camera.lookAt(CAM_LOOK); camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize();

let last = now(), townT = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t; const ts = t / 1000;
  requestAnimationFrame(frame);
  if (FC || ARC) return;   // v49/v51: mini game dan layar Games nutupin layar; adegan 3D nggak usah digambar
  if (LIAR && LIAR.on) { renderer.shadowMap.autoUpdate = true; LIAR.frame(t); renderer.render(LIAR.scene, LIAR.camera); liarFps(t); return; }
  if (KONSER && KONSER.on) { KONSER.frame(t, dt); renderer.render(KONSER.scene, KONSER.camera); if (Math.floor(ts * 4) !== Math.floor((ts - dt) * 4)) konserHud(); return; }
  if (GLOBE && GLOBE.on) {
    GLOBE.frame(t, dt); renderer.render(GLOBE.scene, GLOBE.camera);
    const hn = GLOBE.where(); if ($("hoodName").textContent !== hn) $("hoodName").textContent = hn;
    if (Math.floor(ts * 2) !== Math.floor((ts - dt) * 2)) townChips();
    return;
  }
  if (CONT && CONT.on) {
    CONT.frame(t, dt); renderer.render(CONT.scene, CONT.camera);
    const hn = CONT.where(); if ($("hoodName").textContent !== hn) $("hoodName").textContent = hn;
    if (Math.floor(ts * 2) !== Math.floor((ts - dt) * 2)) townChips();
    return;
  }
  renderer.shadowMap.autoUpdate = true;   // v79: kota boleh mematikannya di peta; adegan lain selalu hitung bayangan
  if (TOWN && TOWN.on) {
    // v79: kamera diam > 1,5 detik = kota digambar 30 kali per detik, bukan 60 (HP lebih adem, baterai lebih awet)
    if (TOWN.calm && TOWN.calm(t) && t - townT < 31) return;
    const tdt = Math.min(0.05, (t - townT) / 1000); townT = t;
    if (Math.floor(ts / 30) !== Math.floor((ts - tdt) / 30)) applyLight();
    TOWN.frame(t, tdt); renderer.render(TOWN.scene, TOWN.camera);
    const hn = TOWN.hoodAt(); if ($("hoodName").textContent !== hn) $("hoodName").textContent = hn;
    if (Math.floor(ts * 2) !== Math.floor((ts - dt) * 2)) townChips();
    return;
  }
  if (!K) { renderer.render(scene, camera); return; }
  const napping = t < napUntil, gone = cur && (cur.fase === "meninggal" || cur.fase === "merantau");
  K.root.visible = !gone;
  const lights = napping ? 0.3 : 1; hemi.intensity += (LIT.hemi * lights - hemi.intensity) * 0.1; sun.intensity += (LIT.sunI * lights - sun.intensity) * 0.1;
  if (Math.floor(ts / 30) !== Math.floor((ts - dt) / 30)) applyLight();
  const lampOn = napping ? Math.max(LIT.lamp, 0.4) : LIT.lamp;
  for (const r of ROOMS) if (r.g.visible) for (const { l, strength } of r.g.userData.lamps || []) l.intensity += (lampOn * strength - l.intensity) * 0.1;
  let y = 0, sx = 1, sy = 1, rz = 0;
  const breathe = reduce ? 0 : Math.sin(ts * (cur?.fase === "tua" ? 1.4 : 2.2)) * 0.025;
  sy += breathe; sx -= breathe * 0.5;
  if (anim) {
    const p = (t - anim.t0) / anim.dur;
    if (p >= 1) anim = null;
    else if (anim.type === "jump") { y = Math.sin(p * Math.PI) * 1.1; if (p < 0.15 || p > 0.85) { sy -= 0.15; sx += 0.1; } }
    else if (anim.type === "squash") { const k = Math.sin(p * Math.PI); sy -= 0.22 * k; sx += 0.16 * k; }
    else if (anim.type === "wiggle") rz = Math.sin(p * Math.PI * 8) * 0.12 * (1 - p);
    else if (anim.type === "shake") K.body.rotation.y = Math.sin(p * Math.PI * 6) * 0.35 * (1 - p);
  } else K.body.rotation.y *= 0.9;
  const s = K.scale;
  K.root.position.y = y; K.root.scale.set(s * sx, s * sy, s * sx); K.root.rotation.z = rz;
  K.body.rotation.x += ((lookY * -0.08) - K.body.rotation.x) * 0.1;
  K.root.rotation.y += ((lookX * 0.35) - K.root.rotation.y) * 0.08;
  // a memory worth keeping happened today: the camera shows up until you take it or let it go
  const ops = opsCache;
  if (ops.length && !snapEl && !gone) { snapEl = document.createElement("div"); snapEl.className = "float"; snapEl.innerHTML = `<button class="snap" aria-label="A moment worth a photo"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/></svg></button>`; floats.appendChild(snapEl); snapEl.querySelector("button").onclick = () => showPhotoOp(opsCache[0]); }
  if ((!ops.length || gone) && snapEl) { snapEl.remove(); snapEl = null; }
  // small things it does on its own when nobody is touching it
  if (!anim && !napping && !gone && t > idleAt) {
    const w = { look: 2, twitch: 1, flick: 1, stretch: 1, hop: 1 };
    for (const hb of habitsOf(cur.id)) for (const [k, n] of Object.entries(HABITS[hb].idle || {})) w[k] = (w[k] || 0) + n;
    let r = Math.random() * Object.values(w).reduce((x, y) => x + y, 0), kind = "look";
    for (const [k, n] of Object.entries(w)) { if ((r -= n) < 0) { kind = k; break; } }
    idle = { kind, t0: t, dur: { look: 1600, twitch: 450, flick: 900, stretch: 1300, hop: 600, spin: 1200, hum: 1800 }[kind], side: Math.random() < 0.5 ? -1 : 1, x: (Math.random() - 0.5) * 1.6, y: (Math.random() - 0.5) * 0.8 };
    if (kind === "hop") play("jump", 600);
    if (kind === "hum" && !bubble) say(["♪ hm hm hmm ♪", "♪ la la ♪", "♪ mm-hmm ♪"][Math.floor(Math.random() * 3)], 1800);
    if (kind === "stretch" && habitsOf(cur.id).includes("dozy") && !bubble) say("*yaaawn*", 1300);
    idleAt = t + 5000 + Math.random() * 9000;
  }
  const ip = idle ? (t - idle.t0) / idle.dur : 1; if (ip >= 1) idle = null;
  const ik = idle ? Math.sin(Math.min(1, ip) * Math.PI) : 0;
  idleLook.x += ((idle?.kind === "look" ? idle.x : 0) - idleLook.x) * 0.06; idleLook.y += ((idle?.kind === "look" ? idle.y : 0) - idleLook.y) * 0.06;
  if (idle?.kind === "stretch") { sy += 0.12 * ik; sx -= 0.06 * ik; K.root.scale.set(s * sx, s * sy, s * sx); }
  K.root.rotation.y += idleLook.x * 0.02;
  if (idle?.kind === "spin") { const e = ip < 0.5 ? 2 * ip * ip : 1 - 2 * (1 - ip) * (1 - ip); let a = e * Math.PI * 2; if (a > Math.PI) a -= Math.PI * 2; K.body.rotation.y = a; }
  const follow = cur && habitsOf(cur.id).includes("follower") ? HABITS.follower.follow : 1;
  K.pupils.forEach(p => { p.position.x += ((lookX * follow + idleLook.x) * 0.07 - p.position.x) * 0.2; p.position.y += (-(lookY * follow + idleLook.y) * 0.06 - 0.02 - p.position.y) * 0.2; });
  const ex = napping ? "sleep" : t < surpriseUntil ? "surprise" : t < joyUntil ? "joy" : cur && cur.needs.mood < 35 ? "sad" : "calm";
  K.eyes.forEach((e, i) => { const shut = ex === "joy"; e.userData.arc.visible = shut; K.pupils[i].visible = !shut; e.scale.x += ((ex === "surprise" ? 1.25 : 1) - e.scale.x) * 0.4; });
  K.ears.forEach((e, i) => { const tw = idle?.kind === "twitch" && (i === (idle.side < 0 ? 0 : 1)) ? Math.sin(ip * Math.PI * 3) * 0.35 : 0; const tgt = (ex === "sad" ? -0.55 : ex === "joy" || ex === "surprise" ? 0.18 : ex === "sleep" ? -0.25 : 0) + tw; e.rotation.x += (tgt - e.rotation.x) * 0.2; const rz = e.userData.rz0 - e.userData.sx * (ex === "sad" ? 0.5 : ex === "sleep" ? 0.25 : 0); e.rotation.z += (rz - e.rotation.z) * 0.2; });
  K.arms.forEach(a => { const up = ex === "joy" ? 0.9 : idle?.kind === "stretch" ? 1.3 * ik : 0; const tgt = a.userData.sx * (0.4 + up); a.rotation.z += (tgt - a.rotation.z) * 0.2; });
  let eyeOpen = 1;
  if (napping || idle?.kind === "stretch") eyeOpen = 0.08; else if (ex === "surprise") eyeOpen = 1.3; else if (cur && cur.needs.energi < 30) eyeOpen = 0.45; else if (ex === "sad") eyeOpen = 0.75;
  if (t > blinkAt) { if (t > blinkAt + 120) blinkAt = t + 2000 + Math.random() * 3000; else eyeOpen = 0.08; }
  K.eyes.forEach(e => e.scale.y += (eyeOpen - e.scale.y) * 0.4);
  let mo = 0;
  if (t < talkUntil) mo = 0.3 + Math.abs(Math.sin(ts * 18)) * 0.7;
  if (t < chewUntil) mo = Math.abs(Math.sin(ts * 14)) * 0.6;
  if (ex === "surprise") mo = Math.max(mo, 0.5);
  mo = Math.max(mo, mouthOpen); mouthOpen *= 0.9;
  K.mouth.scale.y += (0.05 + mo * 0.6 - K.mouth.scale.y) * 0.4; K.smile.visible = mo < 0.15;
  K.smile.rotation.z = cur && cur.needs.mood < 35 ? 0 : Math.PI;
  K.smile.position.y = cur && cur.needs.mood < 35 ? K.smileY - 0.14 : K.smileY;
  const happy = cur ? (cur.needs.mood + cur.ikatan) / 200 : 0.5;
  const wag = ex === "joy" ? 4.5 : ex === "sad" ? 0.6 : 1.2 + happy * 2.4, flick = idle?.kind === "flick" ? Math.sin(ip * Math.PI * 2) * 0.35 : 0;
  K.tail.rotation.z += ((reduce ? 0 : Math.sin(ts * wag) * (ex === "joy" ? 0.22 : 0.05 + happy * 0.1)) + flick - K.tail.rotation.z) * 0.3;
  K.tail.rotation.x += ((ex === "sad" ? -0.35 : 0) - K.tail.rotation.x) * 0.1;
  K.twinkle.forEach((d, i) => d.scale.setScalar(0.75 + 0.35 * Math.sin(ts * 3 + i * 1.7)));
  petFrame(t, ts, napping, gone);
  blob.position.x = K.root.position.x; blob.scale.setScalar(K.scale * Math.max(0.5, 1 - y * 0.25)); blob.visible = K.root.visible;
  const dirty = cur ? Math.max(0, (60 - cur.needs.kebersihan) / 60) : 0;
  K.dirtMat.opacity = dirty; K.dirt.forEach(d => d.visible = dirty > 0.02);
  K.root.getWorldPosition(head); head.y += 3.0 * K.root.scale.y;
  flies.forEach((f, i) => { f.visible = !gone && !!cur && cur.needs.kebersihan < 35; const a = ts * (2.5 + i * 0.7) + i * 2; f.position.set(Math.cos(a) * (1.4 + i * 0.15), head.y + Math.sin(a * 1.7) * 0.3, Math.sin(a) * 1.1 + 0.4); });
  const top = screenOf(new THREE.Vector3(0, head.y + 0.4, 0));
  if (bubble) { bubble.style.left = top.x + "px"; bubble.style.top = top.y + "px"; if (t > bubbleUntil) { bubble.remove(); bubble = null; } }
  // engine dilemma waiting? show the "!" above the head
  if (game && game.pending && !alertEl) {
    alertEl = document.createElement("div"); alertEl.className = "float";
    alertEl.innerHTML = `<button class="alert" aria-label="A decision is waiting">!</button>`; floats.appendChild(alertEl);
    alertEl.querySelector("button").onclick = showDilemma;
  }
  if (alertEl && (!game || !game.pending)) { alertEl.remove(); alertEl = null; }
  if (alertEl) { alertEl.style.left = top.x + 90 + "px"; alertEl.style.top = top.y + 20 + "px"; }
  if (snapEl) { snapEl.style.left = top.x - 90 + "px"; snapEl.style.top = top.y + 40 + "px"; }
  if (napping && Math.floor(ts * 1.2) !== Math.floor((ts - dt) * 1.2)) burst(["Z"], 1, "#fff", 30, "zzz");
  if (cur && !gone && !napping && !anim && !bubble && Math.random() < dt * 0.06) {
    if (cur.needs.lapar < 30) say("I'm hungry...", 1800); else if (cur.needs.kebersihan < 30) say("I smell funny", 1800); else if (cur.needs.energi < 25) say("So sleepy...", 1800);
  }
  renderer.render(scene, camera);
}

// ---- going away: the family looks after everyone, no penalties
function awayBox() {
  const d = today(), on = game.titipNow(d), left = game.titipLeft(d);
  if (on) return `<div class="box away"><h3>Away until ${fmtDate(on.to)}</h3><small>The family is looking after everyone. Nothing bad happens while you're away.</small><button class="secondary" id="titipEnd">I'm back early</button></div>`;
  return `<div class="box away"><h3>Going away?</h3><small>Tell them before you go and the family looks after everyone, with no penalties. Starts tomorrow. ${left} of ${GameLayer.TITIP_MAX} days left this month.</small>
    <div class="row2">${[1, 3, 5, 7].map(n => `<button class="chip" data-titip="${n}" ${n > left ? "disabled" : ""}>${n} day${n > 1 ? "s" : ""}</button>`).join("")}</div></div>`;
}
function goAway(n) {
  const who = vm().anggota.find(m => m.fase !== "meninggal" && m.fase !== "merantau");
  if (!who || !game.act(who.id, "titip:" + n)) return say("Can't do that right now.");
  save(); showFamily();
  const on = game.titipNow(today());
  story("Family", `got it. Everyone is looked after until ${fmtDate(on.to)}. Have a good trip!`, false);
}
document.addEventListener("click", e => {
  if (e.target && e.target.id === "titipEnd") {
    const who = vm().anggota.find(m => m.fase !== "meninggal" && m.fase !== "merantau");
    if (who && game.act(who.id, "titip:batal")) { save(); showFamily(); say("You're back!"); }
  }
});

// ---- backup: the family lives in this browser, so let people keep a copy
const BK_KEY = SAVE_KEY + "-backup", BK_NAG = SAVE_KEY + "-bknag";
let DL = null;
try { if (globalThis.claude && claude.use) claude.use("downloads").then(d => { DL = d; }).catch(() => {}); } catch (e) {}
function backupText() {
  const keys = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(SAVE_KEY) && k !== BK_NAG) keys[k] = localStorage.getItem(k); } } catch (e) {}
  return JSON.stringify({ app: "oldtown-family", v: 1, at: Date.now(), name: (game.home.members[0] || {}).name || "", day: today(), keys });
}
function lastBackup() { try { return +localStorage.getItem(BK_KEY) || 0; } catch (e) { return 0; } }
function markBackup() { try { localStorage.setItem(BK_KEY, Date.now()); } catch (e) {} }
function backupDue() { return state && state.hadir.length >= 3 && Date.now() - lastBackup() > 14 * 864e5; }
function ago(ts) { const d = Math.floor((Date.now() - ts) / 864e5); return d < 1 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; }
// ---- Dev tools (cuma kalau DEV nyala): bintang terbuka, kecepatan waktu, registry brand, log telemetry. Build rilis: buang.
// Kejadian dunia (festival, cuaca, kabar kota) datang dari server dan masuk lewat jalur yang sama dengan kabar Kindred: game.netRecord
// dengan ref unik, isinya disimpan utuh di save, jadi ikut replay tanpa server. Servernya baru ada di Blok B; sekarang jalurnya diuji lewat Dev.
function worldRecord(ref, P) {
  if (!game) return false;
  const d = game.home.last_day, c = game.home.living(d)[0] || game.home.members[0];
  if (!c) return false;
  const ok = game.netRecord(c.id, ref, P);
  if (ok) { Tele.ev("dunia", { id: ref, j: P.jenis, lama: P.lama }); _chDay.clear(); drainNoon(); save(); refresh(); }
  return ok;
}
// DEV-BEGIN
const DEV_DUNIA = [
  { t: "dunia", jenis: "cuaca", nama: "Rain Week", ikon: "🌧️", tunda: 1, lama: 7, efek: { mood: -1 }, hadiah: "rain_umbrella",
    teks: "A week of rain is on its way to Old Town. Umbrellas out, everyone.",
    baris: ["{n} splashes through every puddle on the way home. Shoes soaked, mood fine.", "Rain all day. {n} watches it from the window with a warm drink.", "{n} forgets the umbrella and comes home dripping. Again."],
    obrolan: ["third day of rain and my socks have given up", "the river path is a lake now. send boats", "rain week means soup week. that's the rule", "umbrella count this week: 3 bought, 2 lost"] },
  { t: "dunia", jenis: "festival", nama: "Lantern Night", ikon: "🏮", tunda: 2, lama: 3, efek: { mood: 2 }, hadiah: "lantern_halo",
    teks: "Lantern Night is back this weekend: three evenings of lights along the river, food stalls from the square to the bridge.",
    baris: ["{n} carries a paper lantern down to the river with half the town.", "The whole street smells of grilled corn. {n} eats two.", "{n} stays out late watching the lanterns drift. Nobody minds."],
    obrolan: ["lantern night!! who's coming", "my lantern caught fire. twice. still the best night of the year", "the bridge at 9pm is the spot. trust me", "grilled corn line was 40 minutes. worth it"] },
];
function showDev(tab = "main") {
  if (!state || !game) return;
  const S = Tele.summary(), B = Brands.stats(), kinds = Object.entries(Brands.KINDS);
  const brandRows = kind => Brands.list(kind).map(e => `<label class="dev-row"><span><b>${esc(e.base)}</b><small>${esc(e.key)}${e.cat ? " · " + esc(e.cat) : ""}</small></span><input class="text-in" data-brand="${esc(e.key)}" value="${esc(e.partner ? e.name : "")}" placeholder="Partner name" maxlength="40"></label>`).join("");
  openSheet("dev", `<span class="ribbon" style="background: var(--plum)">DEV · ${APP_VER}</span>
    <h2>Dev tools</h2>
    <div class="chips">${[["main", "Game"], ["brands", "Brands"], ["tele", "Telemetry"]].map(([k, l]) => `<button class="chip" data-devtab="${k}" aria-pressed="${tab === k}">${l}</button>`).join("")}</div>
    ${tab === "main" ? `<button class="secondary" id="devStarBtn">All stars open ${state.dev_stars ? "(on)" : "(off)"}</button>
      <div class="fieldset"><span class="lbl">Time speed (from now on; the past stays)</span><div class="chips">${SPEEDS.map(([l, ms]) => `<button class="chip" data-devms="${ms}" aria-pressed="${state.jam.ms === ms}">${l}</button>`).join("")}</div></div>
      <button class="secondary" id="devIntroBtn">Show the app intro cards again</button>
      <div class="row2"><button class="secondary" id="devDoorBtn">Open every door ${state.dev_pintu ? "(on)" : "(off)"}</button><button class="secondary" id="devTourBtn">Replay door tours</button></div>
      <button class="secondary" id="devWorldBtn">Fire a test world event (${(game.home.world.events || []).length} so far)</button>
      <div class="fieldset"><span class="lbl">Sky preview (weather skin, until the next check)</span><div class="chips">${["", ...Weather.SKINS].map(s => `<button class="chip" data-devwx="${s}" aria-pressed="${(WX || "") === s}">${s ? Weather.label(s) : "Real"}</button>`).join("")}</div></div>
      <div class="row2"><button class="secondary" id="devBtnTop">+100 ${Cosmetics.CURRENCY.label} (${Cosmetics.saldo(state)})</button><button class="secondary" id="devCosAll">Own every cosmetic</button></div>
      <button class="secondary" id="devCosClear">Reset the closet</button>
      <p class="muted">Day ${liveDay()} · ${state.hadir.length} days visited · ${state.aksi.length} actions · save ${Math.round(JSON.stringify(state).length / 1024)} KB</p>` : ""}
    ${tab === "brands" ? `<p class="muted">Every brand name in town comes from one registry. A partner name replaces the fictional one everywhere (town signs after a reload). Numbers never change.</p>
      <button class="secondary" id="devPilotBtn">Pilot partner: ${esc(Brands.PILOT["food:treat"].name)} ${Brands.pilotOn() ? "(on)" : "(off)"}</button>
      ${kinds.map(([k, l]) => `<details class="more"><summary>${l} · ${(B[k] || {}).n || 0}${(B[k] || {}).partner ? ` · ${B[k].partner} partner` : ""}</summary>${brandRows(k)}</details>`).join("")}
      <button class="secondary" id="devBrandClear">Clear all partner names</button>` : ""}
    ${tab === "tele" ? `<p class="muted">${S.event} events · ${S.sesi} sessions · stored on this device only (no server yet)</p>
      <div class="dev-tbl">${Object.entries(S.per).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span>${esc(k)}</span><b>${v}</b>`).join("")}</div>
      <textarea class="bk-code" id="devTele" readonly placeholder="Tap Show log to see the JSON"></textarea>
      <div class="row2"><button class="secondary" id="devTeleCopy">Show log JSON</button><button class="secondary" id="devTeleClear">Clear log</button></div>
      <button class="secondary" id="devTeleFile">Save log file (for the team dashboard)</button>` : ""}
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  sheet.querySelectorAll("[data-devtab]").forEach(b => b.onclick = () => showDev(b.dataset.devtab));
  if (tab === "main") {
    $("devStarBtn").onclick = () => {
      state.dev_stars = !state.dev_stars; save(); Tree.setDev(state.dev_stars);
      if (state.dev_stars) game.home.members.forEach(c => { if (c.st) { Tree.points(c); devStars(c); } });
      refresh(); showDev("main"); say(state.dev_stars ? "Stars unlocked for testing." : "Back to normal points (after a reload).");
    };
    sheet.querySelectorAll("[data-devms]").forEach(b => b.onclick = () => {
      const ms = Number(b.dataset.devms); if (ms === state.jam.ms) return;
      if (ms === 86400000) { const d0 = new Date(); d0.setHours(0, 0, 0, 0); state.jam = { base_ts: d0.getTime(), base_day: liveDay(), ms, mid: true }; }
      else state.jam = { base_ts: Date.now(), base_day: dayFloat(), ms };
      save(); showDev("main"); tick();
    });
    $("devDoorBtn").onclick = () => { state.dev_pintu = !state.dev_pintu; save(); refresh(); showDev("main"); };
    $("devTourBtn").onclick = () => { state.tur_pintu = {}; save(); closeSheet(); say("The door tours will show again."); };
    $("devIntroBtn").onclick = () => { try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith("intro:")) localStorage.removeItem(k); } } catch (e) {} say("The intro cards will show again."); };
    $("devBtnTop").onclick = () => { Cosmetics.topUp(state, 100, "dev"); save(); showDev("main"); };
    $("devCosAll").onclick = () => { let n = 0; for (const x of Cosmetics.ITEMS) if (Cosmetics.grant(state, x.id, "dev")) n++; save(); say(`${n} items added to the closet.`); showDev("main"); };
    $("devCosClear").onclick = () => { Cosmetics.reset(state); save(); applyHome(); refresh(); showDev("main"); };
    sheet.querySelectorAll("[data-devwx]").forEach(b => b.onclick = () => { if (b.dataset.devwx) wxApply(b.dataset.devwx); else wxSync(true); showDev("main"); });
    $("devWorldBtn").onclick = () => {
      const n = (game.home.world.events || []).length, P = DEV_DUNIA[n % DEV_DUNIA.length];
      const ok = worldRecord(`dev-dunia-${n}-${liveDay()}`, P);
      say(ok ? `${P.nama} is on its way. Check Chirp and the calendar.` : "That event could not be recorded.");
      showDev("main");
    };
  }
  if (tab === "brands") {
    sheet.querySelectorAll("[data-brand]").forEach(i => i.onchange = () => { Brands.set(i.dataset.brand, i.value); refresh(); });
    $("devBrandClear").onclick = () => { Brands.clear(); showDev("brands"); refresh(); };
    $("devPilotBtn").onclick = () => { Brands.pilot(!Brands.pilotOn()); _chDay.clear(); showDev("brands"); refresh(); };
  }
  if (tab === "tele") {
    $("devTeleCopy").onclick = () => { const t = $("devTele"); t.value = Tele.dump(); t.select(); try { navigator.clipboard.writeText(t.value).then(() => say("Copied!"), () => {}); } catch (e) {} };
    $("devTeleClear").onclick = () => { Tele.clear(); showDev("tele"); };
    $("devTeleFile").onclick = saveTeleFile;
  }
}
// log telemetry jadi file (buat agregator tim: tools/tele_agregat.py). Isinya Tele.payload(): tanpa nama, tanpa isi chat
async function saveTeleFile() {
  const data = Tele.dump(), d = new Date(), akun = String(state.akun || "anon").slice(-6);
  const name = `old-town-tele-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${akun}.json`;
  if (DL) {
    try { await DL.save({ filename: name, data }); return say("Log saved."); }
    catch (e) { if (e && (e.code === "declined" || e.code === "rate_limited")) return; }
  }
  try {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: "application/json" })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    say("Log saved.");
  } catch (e) { $("devTeleCopy").click(); }
}
// DEV-END
function showBackup(msg) {
  const last = lastBackup(), has = !!game;
  openSheet("backup", `<span class="ribbon" style="background: var(--sky)">BACKUP</span>
    <h2>Keep your family safe</h2>
    <p>${has ? "Your family lives in this browser. Clearing browser data or switching phones would lose them. A backup file brings everyone back, exactly as they were." : "Pick your backup file, or paste the backup code, and your family comes back exactly as they were."}</p>
    ${has ? `<small class="sub">Last backup: ${last ? ago(last) : "never"}</small>` : ""}
    ${msg ? `<p><b>${esc(msg)}</b></p>` : ""}
    ${has ? `<button class="big" id="bkSave">Save a backup file</button>
    <button class="secondary" id="bkCopy">Show backup code</button>` : ""}
    <div class="fieldset"><span class="lbl">Restore</span>
      <input type="file" id="bkFile" accept=".json,application/json,text/plain">
      <textarea class="bk-code" id="bkPaste" placeholder="…or paste a backup code here"></textarea>
      <button class="secondary" id="bkLoad">Restore this backup</button></div>
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = has ? closeSheet : showSetup;
  if (!has) { $("bkFile").onchange = e => { const f = e.target.files[0]; if (f) f.text().then(t => { $("bkPaste").value = t; }); }; $("bkLoad").onclick = () => restoreBackup($("bkPaste").value); return; }
  $("bkSave").onclick = saveBackupFile;
  $("bkCopy").onclick = () => { Tele.teknis("backup", { cara: "kode" }); const t = $("bkPaste"); t.value = backupText(); t.select(); try { navigator.clipboard.writeText(t.value).then(() => say("Copied!"), () => {}); } catch (e) {} markBackup(); };
  $("bkFile").onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { $("bkPaste").value = t; }); };
  $("bkLoad").onclick = () => restoreBackup($("bkPaste").value);
}
async function saveBackupFile() {
  Tele.teknis("backup", { cara: "file" });
  const data = backupText(), d = new Date(), name = `old-town-family-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;
  if (DL) {
    try { await DL.save({ filename: name, data }); markBackup(); return showBackup("Backup saved."); }
    catch (e) { if (e && (e.code === "declined" || e.code === "rate_limited")) return; }
  }
  try {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: "application/json" })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    markBackup(); showBackup("Backup saved.");
  } catch (e) { $("bkCopy").click(); }
}
function restoreBackup(text) {
  let o = null;
  try { o = JSON.parse(String(text || "").trim()); } catch (e) {}
  const main = o && o.app === "oldtown-family" && o.keys && o.keys[SAVE_KEY];
  let st = null; try { st = JSON.parse(main); } catch (e) {}
  if (!st || !Array.isArray(st.aksi) || !Array.isArray(st.hadir)) return showBackup("That doesn't look like a family backup.");
  const b = $("bkLoad");
  if (game && !b.dataset.armed) { b.dataset.armed = "1"; b.textContent = `Tap again: replace this family with ${o.name || "the backup"}`; return; }
  try {
    const old = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(SAVE_KEY)) old.push(k); }
    old.forEach(k => localStorage.removeItem(k));
    for (const [k, v] of Object.entries(o.keys)) if (k.startsWith(SAVE_KEY) && typeof v === "string") localStorage.setItem(k, v);
    markBackup(); Tele.teknis("restore"); Tele.end("restore");
  } catch (e) { return showBackup("This browser wouldn't save the backup. Try freeing some space."); }
  location.reload();
}
function backupNag() {
  if (!backupDue()) return;
  let last = 0; try { last = +localStorage.getItem(BK_NAG) || 0; } catch (e) {}
  if (Date.now() - last < 3 * 864e5) return;
  try { localStorage.setItem(BK_NAG, Date.now()); } catch (e) {}
  setTimeout(() => story("Family", "it's been a while since your last backup. Open _Family_ and tap _Back up_ to keep everyone safe.", false), 5000);
}

// ---- family chronicle: every generation on one timeline
function chronicleText(list) {
  const fam = (game.home.members[0] || {}).name || "Our";
  return [`The ${fam} family chronicle`, ""].concat(list.map(e => `${fmtDate(e.d)}  ${e.t.startsWith(e.name) ? "" : e.name + ": "}${e.t}`)).join("\n");
}
function showChronicle(bigOnly = true) {
  const all = game.chronicle(), list = bigOnly ? all.filter(e => e.b) : all, mm = {};
  for (const m of vm().anggota) mm[m.id] = m;
  let yr = null;
  const rows = list.map(e => {
    const y = new Date(Engine.START_DATE + e.d * 86400000).getUTCFullYear(), head = y !== yr ? `<div class="yr">${y}</div>` : "";
    yr = y;
    const m = mm[e.id];
    return `${head}<div class="cev ${e.b ? "cbig" : ""}"><small>${fmtDate(e.d).replace(/ \d{4}$/, "")}</small><i class="dot" style="background:${m ? colorOf(m) : "#ccc"}"></i><span>${e.t.startsWith(e.name) ? md(e.t) : `<b>${esc(e.name)}</b>: ${md(e.t)}`}</span></div>`;
  }).join("");
  openSheet("chronicle", `<span class="ribbon" style="background: var(--plum)">FAMILY CHRONICLE · ${new Set(all.map(e => e.gen)).size} GENERATION${new Set(all.map(e => e.gen)).size > 1 ? "S" : ""}</span>
    <div class="tabs"><button class="chip" aria-pressed="${bigOnly}" data-big="1">Big moments</button><button class="chip" aria-pressed="${!bigOnly}" data-big="0">Everything</button></div>
    <div class="chron">${rows || `<span class="sub">The story starts here.</span>`}</div>
    <div class="row2"><button class="secondary" id="chShare">Share as text</button><button class="close" id="chBack">Back</button></div>`);
  sheet.querySelectorAll("[data-big]").forEach(b => b.onclick = () => showChronicle(b.dataset.big === "1"));
  $("chBack").onclick = showFamily;
  $("chShare").onclick = async () => {
    const t = chronicleText(list);
    try { if (navigator.share) { await navigator.share({ title: "Family chronicle", text: t }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(t); return say("Copied! Paste it anywhere."); } catch (e) {}
    if (DL) { try { await DL.save({ filename: "family-chronicle.txt", data: t }); } catch (e) {} }
  };
}
function tasteLine(m) {
  const S = m.selera || {}, F = GameLayer.FOOD, like = Object.keys(S).filter(k => S[k] > 0), no = Object.keys(S).filter(k => S[k] < 0);
  if (!like.length && !no.length) return "";
  return `<p class="sub">${like.length ? `Loves ${like.map(k => F[k]).join(" and ")}.` : ""}${no.length ? ` Not a fan of ${no.map(k => F[k]).join(" or ")}.` : ""}</p>`;
}

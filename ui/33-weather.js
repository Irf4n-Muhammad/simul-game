// ================================================================ v44.1: real weather as a skin (daftar-saran 33)
// Langit di jendela (dan warna latar, lapisan hujan/salju) ikut cuaca asli kota pemain. Kulit saja: tidak ada yang di engine,
// game, replay, atau RNG yang membacanya. Sumber: Open-Meteo (tanpa kunci), kota dari zona waktu HP (tanpa izin lokasi),
// atau lokasi persis kalau pemain memilihnya. Pengaturan dan cache di localStorage (mk-cuaca), bukan di save.
// Kalau fetch diblokir (artifact, offline) langitnya tetap cerah dan tidak ada pesan apa pun. Aturan dan tabel: weather.js.
const WX_KEY = "mk-cuaca", WX_TTL = 60 * 60 * 1000, WX_EVERY = 10 * 60 * 1000;
let WX = null, wxShown = null, wxBusy = false;
let wxCfg = (() => { try { return JSON.parse(localStorage.getItem(WX_KEY)) || null; } catch (e) { return null; } })() || { on: true, src: "tz" };
const wxSave = () => { try { localStorage.setItem(WX_KEY, JSON.stringify(wxCfg)); } catch (e) { /* tanpa simpanan: tetap jalan */ } };
function wxZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) { return null; } }
// [lat, lon, dari mana] atau null kalau mati / zona tidak dikenal
function wxWhere() {
  if (!wxCfg.on) return null;
  if (wxCfg.src === "geo" && wxCfg.lat != null && wxCfg.lon != null) return [wxCfg.lat, wxCfg.lon, "your location"];
  const tz = wxZone(), p = tz ? Weather.place(tz) : null;
  return p ? [p[0], p[1], Weather.cityOf(tz)] : null;
}
function wxApply(skin) {
  const s = skin && Weather.SKINS.includes(skin) ? skin : null;
  if (s === WX) return;
  WX = s; $("app").dataset.wx = s || ""; applyLight(true);
  if (s && s !== wxShown) { wxShown = s; Tele.ev("cuaca", { k: s, a: "tampil" }); }
}
async function wxSync(force) {
  const w = wxWhere(); if (!w) { wxApply(null); return; }
  const c = wxCfg.cache, same = c && c.lat === w[0] && c.lon === w[1];
  if (!force && same && Weather.fresh(c, Date.now(), WX_TTL)) { wxApply(Weather.skin(c.code)); return; }
  if (typeof fetch !== "function" || wxBusy) return;
  wxBusy = true;
  try {
    const r = await fetch(Weather.url(w[0], w[1]), { cache: "no-store" }); if (!r.ok) throw new Error("http " + r.status);
    const P = Weather.parse(await r.json()); if (!P) throw new Error("bentuk");
    wxCfg.cache = { t: Date.now(), code: P.code, lat: w[0], lon: w[1] }; wxSave();
    wxApply(Weather.skin(P.code));
  } catch (e) { if (same) wxApply(Weather.skin(c.code)); /* offline, CSP, API tumbang: langit terakhir atau cerah, tanpa pesan */ }
  wxBusy = false;
}
function showSky() {
  const w = wxWhere(), tz = wxZone(), city = tz ? Weather.cityOf(tz) : null, n = esc(cur ? cur.nama : "the family");
  openSheet("sky", `
    <span class="ribbon" style="background: var(--sky)">SKY & WEATHER</span>
    <h2>${WX ? `Over Old Town right now: ${Weather.label(WX).toLowerCase()}.` : wxCfg.on ? "The window follows the weather where you are." : "The sky runs on its own clock."}</h2>
    <p>${w ? `Weather comes from ${esc(w[2])}, checked about once an hour.` : wxCfg.on ? "Your time zone isn't on the city list yet. Use your exact location, or leave the sky as it is." : "Turn it on and the window shows your real weather."}</p>
    <div class="fieldset"><span class="lbl">Where the weather comes from</span><div class="chips">
      <button class="chip" data-wx="tz" aria-pressed="${wxCfg.on && wxCfg.src !== "geo"}">My time zone${city ? ` (${esc(city)})` : ""}</button>
      <button class="chip" data-wx="geo" aria-pressed="${wxCfg.on && wxCfg.src === "geo"}">My exact location</button>
      <button class="chip" data-wx="off" aria-pressed="${!wxCfg.on}">Off</button></div></div>
    <p class="muted">Only the sky changes. Nothing in the house, the town or ${n}'s life looks at the weather. Your location is rounded to about 10 km and only sent to the weather service.</p>
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  sheet.querySelectorAll("[data-wx]").forEach(b => b.onclick = () => {
    const k = b.dataset.wx;
    Tele.ev("cuaca", { k, a: "atur" });
    if (k === "off") { wxCfg = { on: false }; wxSave(); wxApply(null); showSky(); return; }
    if (k === "tz") { wxCfg = { on: true, src: "tz" }; wxSave(); wxSync(true).then(showSky); showSky(); return; }
    const fail = () => { say("Location wasn't allowed. Using your time zone.", 2200); wxCfg = { on: true, src: "tz" }; wxSave(); wxSync(true).then(() => { if (sheetKind === "sky") showSky(); }); };
    try {
      navigator.geolocation.getCurrentPosition(pos => { wxCfg = { on: true, src: "geo", lat: Weather.round1(pos.coords.latitude), lon: Weather.round1(pos.coords.longitude) }; wxSave(); wxSync(true).then(() => { if (sheetKind === "sky") showSky(); }); }, fail, { maximumAge: 3600000, timeout: 10000 });
    } catch (e) { fail(); }
  });
}
EXTRA_TOURS.push({ id: "cuaca", when: () => !!WX });
setInterval(() => wxSync(false), WX_EVERY);
wxSync(false);

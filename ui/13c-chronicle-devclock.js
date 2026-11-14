// ================================================================ kronik keluarga (semua generasi satu garis waktu) + jam Dev
// ---- family chronicle: every generation on one timeline
function chronicleText(list) {
  const fam = (game.home.members[0] || {}).name || "Our";
  return [`The ${fam} family chronicle`, ""].concat(list.map(e => `${fmtDate(e.d)}  ${e.t.startsWith(e.name) ? "" : e.name + ": "}${e.t}`)).join("\n");
}
// v70: naik peringkat dan rekor mini game ikut masuk kronik, atas nama makhluk yang lagi dirawat waktu itu
function gamesChronicle() {
  const W = state && state.dapur, by = {}; if (!W || !W.riwayat || typeof MG_GAMES === "undefined") return [];
  for (const c of game.home.members) by[c.id] = c;
  return W.riwayat.filter(e => by[e.id] && MG_GAMES[e.k]).map(e => {
    const g = MG_GAMES[e.k].name, c = by[e.id];
    return { d: e.d, id: e.id, name: c.name, gen: c.gen, b: e.j === "naik" ? 1 : 0, k: "games",
      t: e.j === "naik" ? `cheered you to ${Dapur.TIERS[e.t]} in ${g} (${e.s}).` : `watched you set a new ${g} record: ${e.s}.` };
  });
}
function showChronicle(bigOnly = true) {
  const all = game.chronicle().concat(gamesChronicle()).sort((a, b) => a.d - b.d || b.b - a.b), list = bigOnly ? all.filter(e => e.b) : all, mm = {};
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
// DEV-BEGIN
// pil jam Dev di layar (kiri, di atas panah kamar): jeda/lanjut, ketuk kecepatan buat ganti, "+1 day" buat lompat sehari,
// jadi nggak perlu buka lembar Dev tiap kali. Jeda = state.jam.pause (hari dibekukan), dibaca dayFloat, jadi seluruh game ikut diam.
const devJamSet = (ms, from) => {
  if (ms === 86400000) { const d0 = new Date(); d0.setHours(0, 0, 0, 0); state.jam = { base_ts: d0.getTime(), base_day: Math.floor(from), ms, mid: true }; }
  else state.jam = { base_ts: Date.now(), base_day: from, ms };
};
function devClock() {
  let el = $("devClock");
  if (!el) {
    const st = document.createElement("style");
    st.textContent = `#devClock{position:absolute;left:12px;bottom:calc(150px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:2px;padding:3px;border-radius:999px;font-size:12px;font-weight:700;pointer-events:auto}
#devClock[data-paused="1"]{background:rgba(255,222,170,.94)}
#devClock button{border:0;background:transparent;color:inherit;font:inherit;padding:5px 9px;border-radius:999px;min-width:30px;box-shadow:none;display:inline-flex;align-items:center;justify-content:center}
#devClock button[aria-pressed="true"]{background:#2b2420;color:#fff}
#app.in-town #devClock{display:none}`;
    document.head.appendChild(st);
    el = document.createElement("div"); el.id = "devClock"; el.className = "glass";
    el.innerHTML = `<button id="devPause" aria-label="Pause time"></button><button id="devSpeed" aria-label="Change time speed"></button><button id="devStep" aria-label="Skip one day">+1 day</button>`;
    const top = document.querySelector(".hud-top"); top.parentNode.insertBefore(el, top.nextSibling);
    $("devPause").onclick = () => {
      if (state.jam.pause != null) devJamSet(state.jam.ms, state.jam.pause); else state.jam.pause = dayFloat();
      save(); tick();
    };
    $("devSpeed").onclick = () => {
      const i = SPEEDS.findIndex(s => s[1] === state.jam.ms), ms = SPEEDS[(i + 1) % SPEEDS.length][1];
      if (state.jam.pause != null) state.jam.ms = ms; else devJamSet(ms, dayFloat());
      save(); tick();
    };
    $("devStep").onclick = () => { if (state.jam.pause != null) state.jam.pause += 1; else state.jam.base_day += 1; save(); tick(); };
  }
  el.hidden = !game || !DEV;
  if (el.hidden) return;
  const paused = state.jam.pause != null, sp = SPEEDS.find(s => s[1] === state.jam.ms);
  el.dataset.paused = paused ? "1" : "0";
  const pb = $("devPause");
  if (pb.dataset.on !== String(paused)) {
    pb.dataset.on = String(paused); pb.setAttribute("aria-pressed", String(paused)); pb.setAttribute("aria-label", paused ? "Resume time" : "Pause time");
    pb.innerHTML = paused ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`
      : `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`;
  }
  $("devSpeed").textContent = (paused ? "Paused · " : "") + (sp ? sp[0] : `1 day = ${state.jam.ms} ms`);
}
// DEV-END

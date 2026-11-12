// ================================================================ sheets
const sheet = $("sheet");
let sheetKind = null;
function openSheet(kind, html) { if (PB_MODE && !kind.startsWith("decor")) exitDecor(); if (PH) closePhone(true); if (tour) tourEnd("lanjut"); coachHide(); sheetKind = kind; Tele.layar("lembar", kind); sheet.innerHTML = `<div class="card" role="dialog" aria-modal="true">${html}</div>`; sheet.hidden = false; sheetQ(kind); }
function closeSheet() { sheet.classList.remove("clear"); if (PB_MODE) exitDecor(); if (TOWN) TOWN.clearPreview(); sheet.hidden = true; sheet.innerHTML = ""; sheetKind = null; if (state && state.tut < COACH.length) setTimeout(coachShow, 400); }
sheet.addEventListener("click", e => { if (e.target === sheet && sheetKind !== "setup") closeSheet(); });

// ---- label versi: ketuk 7 kali buat nyalain atau matiin Dev (muat ulang)
const verLabel = id => `<small class="sub ver" id="${id}">Old Town ${APP_VER}${DEV ? " · dev" : ""}</small>`;
// DEV-NEXT
function bindVerTap(id) { let taps = 0; const el = $(id); if (el) el.onclick = () => { if (++taps < 7) return; try { localStorage.setItem("mk-dev", DEV ? "0" : "1"); } catch (e) {} say(DEV ? "Dev off. Reloading…" : "Dev on. Reloading…", 1500); setTimeout(() => location.reload(), 900); }; }
// ---- setup
let draft = { nama: "", ms: 86400000, wakil: "aman" };
function showSetup() {
  Tele.intro("telur", "setup", "tampil");
  openSheet("setup", `
    <span class="ribbon">NEW EGG</span>
    <h2>An egg is about to hatch in your room.</h2>
    <div class="fieldset"><label for="nm">Name</label><input class="text-in" id="nm" maxlength="16" placeholder="Leave empty for a random name" value="${esc(draft.nama)}"></div>
    <p class="muted">Time here runs like real time. A day is a day, and your creature lives about three to four years. Visit in the morning and in the evening to take care of them.</p>
    <details class="more" ${draft.open ? "open" : ""}><summary>More options</summary>
    <div class="fieldset"><span class="lbl">If you miss a decision</span><div class="chips">
      <button class="chip" data-wakil="aman" aria-pressed="${draft.wakil === "aman"}">A helper picks the safe choice</button>
      <button class="chip" data-wakil="ikut_dia" aria-pressed="${draft.wakil === "ikut_dia"}">Let them decide</button></div></div>
    ${DEV ? `<div class="fieldset"><span class="lbl">Time speed (Dev)</span><div class="chips">${SPEEDS.map(([l, ms]) => `<button class="chip" data-ms="${ms}" aria-pressed="${draft.ms === ms}">${l}</button>`).join("")}</div></div>` : ""}
    </details>
    <button class="big" id="hatch">Hatch!</button>
    <button class="secondary" id="hasBackup">I have a backup</button>${verLabel("verTapS")}`);
  // DEV-NEXT
  bindVerTap("verTapS");
  // DEV-NEXT
  if (DEV) devClock();
  $("hasBackup").onclick = () => { draft.nama = $("nm").value; showBackup(); };
  sheet.querySelectorAll("[data-ms]").forEach(b => b.onclick = () => { draft.nama = $("nm").value; draft.ms = Number(b.dataset.ms); draft.open = true; showSetup(); });
  sheet.querySelectorAll("[data-wakil]").forEach(b => b.onclick = () => { draft.nama = $("nm").value; draft.wakil = b.dataset.wakil; draft.open = true; showSetup(); });
  $("hatch").onclick = () => {
    state = { akun: "akun-" + Math.random().toString(36).slice(2, 10), nama: $("nm").value.trim() || null,
      aturan: { sekolah: "wajib", jam_malam: null, pacaran: null, jajan: null }, wakil: draft.wakil,
      hadir: [], jawaban: {}, aksi: [], dilihat: -1, tur_pintu: {}, jam: { base_ts: Date.now(), base_day: 0, ms: DEV ? draft.ms : 86400000 } };
    Tele.intro("telur", "setup", "menetas", { nama: state.nama ? 1 : 0, wakil: state.wakil, ms: state.jam.ms });
    save(); closeSheet(); boot();
    setTimeout(() => { play("jump", 800); burst(["★", "♥"], 8, "#D4A853"); say(`Hi! I'm ${cur?.nama}!`, 2500); }, 300);
    setTimeout(() => coachShow(), 2600);
  };
}

// ---- dilemma (from the engine)
function countdownText(p) {
  const df = dayFloat(), left = Math.max(0, (p.day + p.window + 1 - df) * state.jam.ms), secs = Math.ceil(left / 1000);
  const wait = secs >= 172800 ? `${Math.ceil(secs / 86400)} days` : secs >= 7200 ? `${Math.ceil(secs / 3600)} hours` : secs >= 120 ? `${Math.ceil(secs / 60)} min` : `${secs} sec`;
  const who = state.wakil === "aman" ? "a helper picks the safe choice" : `${p.name} decides alone`;
  return { frac: left / ((p.window + 1) * state.jam.ms), text: `${wait} left. If you don't answer, ${who}. Time in the house waits for you.` };
}
// v83: kartu keputusan berangka. Tiap pilihan nulis hasilnya (🪙 ⚡ 😊 ⭐ 💗 ...), dan pilihan yang bukan maunya makhluk nulis harganya.
// Pilihan pemain selalu jalan (engine.js ask), jadi nggak ada lagi "mungkin dia nggak nurut".
// v84: kartu keputusan jadi tabel perbandingan. Pilihan = kolom, hasil = baris pendek (⏳ 🪙 ⭐ 😊 💗 ...).
// Pilihan yang bukan maunya makhluk dapet harga di baris 😊/💗 (merah). fx._note jadi catatan kecil di bawah.
const DL_ROWS = [["⏳","Time"],["🪙","Money"],["⭐","Path"],["🎓","Later"],["📈","Career"],["🏠","Home"],["🎉","Party"],["👫","Friends"],["⚡","Energy"],["😊","Mood"],["💗","Bond"]];
function dlTable(p) {
  const opts = Object.entries(p.options), fx = p.fx || {};
  const cell = (k, ic) => (fx[k] || []).find(([i]) => i === ic) || [];
  const seen = new Set(); opts.forEach(([k]) => (fx[k] || []).forEach(([i]) => seen.add(i)));
  if (p.wish && p.cost) { seen.add("😊"); seen.add("💗"); }
  const rows = [...DL_ROWS.filter(([i]) => seen.has(i)), ...[...seen].filter(i => !DL_ROWS.some(([j]) => j === i)).map(i => [i, ""])];
  const costOf = (k, ic) => p.wish && p.wish !== k && p.cost ? (ic === "😊" ? p.cost.mood : ic === "💗" ? p.cost.bond : 0) : 0;
  const td = (k, ic) => {
    const [, tx, sub] = cell(k, ic), c = costOf(k, ic);
    const mine = !tx && p.wish === k && p.cost && (ic === "😊" || ic === "💗") ? "no cost" : "";
    const parts = [tx ? esc(tx) : mine, c ? `<b class="cost">−${c}</b>` : "", sub ? `<small>${esc(sub)}</small>` : ""].filter(Boolean);
    return `<td>${parts.length ? parts.join(" ") : '<span class="nil">—</span>'}</td>`;
  };
  const head = opts.map(([k, l]) => `<th${p.wish === k ? ' class="want"' : ""}>${esc(l)}${p.wish === k ? `<em>♥ ${esc(p.name)}'s pick</em>` : ""}</th>`).join("");
  const body = rows.map(([ic, lbl]) => `<tr><th scope="row"><i>${ic}</i>${lbl ? `<small>${lbl}</small>` : ""}</th>${opts.map(([k]) => td(k, ic)).join("")}</tr>`).join("");
  const lines = [...(p.wish && p.cost ? [`♥ = what ${esc(p.name)} would pick on their own`, `<b class="cost">−</b> red = ${esc(p.name)} is sad you overruled them`] : []),
    ...[].concat(fx._note || []).map(esc)];
  const note = lines.length ? `<ul class="dl-note" hidden>${lines.map(l => `<li>${l}</li>`).join("")}</ul>` : "";
  const btns = opts.map(([k, l]) => `<button class="dl-pick${p.wish === k ? " want" : ""}" data-opt="${esc(k)}">${esc(l)}</button>`).join("");
  // v85: catatan "?" jadi pop up yang nempel di tombolnya (nggak ndorong tabel ke bawah)
  return `<div class="dl-box">${note}<div class="dl-wrap"><table class="dl-tbl"><thead><tr><th>${lines.length ? '<button class="dl-help" aria-label="What do these mean?" aria-expanded="false">?</button>' : ""}</th>${head}</tr></thead><tbody>${body}</tbody></table></div></div><div class="dl-picks" style="--n:${opts.length}">${btns}</div>`;
}
const LEVEL = { kecil: "SMALL DECISION", sedang: "DECISION", besar: "BIG DECISION" };
function showDilemma() {
  const p = game.pending; if (!p) return;
  const cd = countdownText(p), shownAt = Date.now();
  Tele.dilema("tampil", p.key, { lvl: p.drama });
  openSheet("dilemma", `
    <span class="ribbon" ${p.drama === "kecil" ? 'style="background: var(--plum)"' : ""}>${LEVEL[p.drama] || "DECISION"} · ${esc(p.name)}</span>
    <h2>${esc(p.question)}</h2>
    ${p.fx || p.wish ? dlTable(p)
      : Object.entries(p.options).map(([k, l], i) => `<button class="choice ${i ? "no" : "yes"}" data-opt="${esc(k)}">${esc(l)}</button>`).join("")}
    <div class="meter"><i id="cdBar" style="width:${cd.frac * 100}%"></i></div>
    <div class="timer" id="cdText">${esc(cd.text)}</div>
    <button class="close" data-later="1">Decide later</button>`);
  const help = sheet.querySelector(".dl-help"), note = sheet.querySelector(".dl-note");
  if (help && note) {
    const set = open => { note.hidden = !open; help.setAttribute("aria-expanded", String(open)); help.classList.toggle("on", open); };
    help.onclick = e => { e.stopPropagation(); set(note.hidden); };
    note.onclick = () => set(false);
    sheet.addEventListener("click", e => { if (!note.hidden && !note.contains(e.target)) set(false); });
  }
  sheet.querySelectorAll("[data-opt]").forEach(b => b.onclick = () => {
    const late = Math.min(p.window, Math.max(0, liveDay() - p.day));
    Tele.dilema("jawab", p.key, { opt: b.dataset.opt, detik: Math.round((Date.now() - shownAt) / 1000), telat: late });
    game.answer(p.key, b.dataset.opt, late); closeSheet();
    if (alertEl) { alertEl.remove(); alertEl = null; }
    if (p.cid !== selected) select(p.cid);
    play("jump", 700); burst(["♥"], 4);
    tick();
  });
  sheet.querySelector("[data-later]").onclick = () => { Tele.dilema("nanti", p.key); closeSheet(); };
}

// ---- v81: Daily plan dihapus. Makhluknya ngisi harinya sendiri (agenda.js, "Let them choose"); belajar bareng ada di kartu Agenda,
// sesi fokus di tombol bawah Agenda. showPlan tetap ada buat tautan lama (Soon, tur) dan sekarang membuka Agenda.
function showPlan() { if (game) showAgenda(null); }
// rencana dari save lama dicabut sekali lewat aksi biasa (tercatat, jadi replay tetap sama)
function planClear() {
  if (!game || !state) return;
  for (const m of vm().anggota) { const c = game.home.get(m.id); if (c && c.info.rencana && c.alive(today())) game.act(m.id, "rencana:"); }
}

// ---- diary: the household's story, newest first
let storyText = null, storyBusy = false;
function showDiary() {
  const items = feed.filter(l => l.dramas.some(d => d !== "kecil") || l.events.some(e => ["akhir_hidup", "pulang_kampung", "telur_warisan"].includes(e))).slice(-25).reverse();
  openSheet("diary", `
    <span class="ribbon" style="background: var(--plum)">FAMILY DIARY</span>
    <button class="secondary" id="albumBtn">${cur ? esc(cur.nama) + "'s album" : "Album"} · ${albumOf(cur && cur.id).length} photo${albumOf(cur && cur.id).length === 1 ? "" : "s"}</button>
    ${sampleFn && items.length ? `<button class="secondary" id="tellBtn" ${storyBusy ? "disabled" : ""}>${storyBusy ? "Writing..." : "Tell me the story so far"}</button>` : ""}
    ${storyText ? `<div class="diary-entry"><div><h3>The story so far</h3><p>${esc(storyText)}</p></div></div>` : ""}
    ${items.length ? items.map(l => `<div class="diary-entry"><span class="day">Day ${l.day + 1}</span><div><h3>${esc(l.name)}</h3><p>${md(l.lines.join(" "))}</p></div></div>`).join("")
      : `<p>Nothing big has happened yet. Big moments and decisions will be kept here.</p>`}
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  const tb = $("tellBtn"); if (tb) tb.onclick = tellStory;
  $("albumBtn").onclick = showAlbum;
}
async function tellStory() {
  if (!sampleFn || storyBusy) return;
  storyBusy = true; showDiary();
  const big = feed.filter(l => l.dramas.some(d => d !== "kecil") || l.events.includes("akhir_hidup")).slice(-20);
  const facts = big.map(l => `- ${fmtDate(l.day)}, ${l.name} (${l.phase}): ${l.lines.join(" ").replace(/_/g, "")}`).join("\n");
  try {
    const { text } = await sampleFn(`These are events from a virtual pet family game. Retell them as one warm paragraph (4-6 sentences) in English, like a friend catching the player up. Use ONLY these facts, invent nothing:\n${facts}`,
      { modelTier: "quick", cache: { gcTime: 86400000 } });
    storyText = text.trim();
  } catch (e) { storyText = errText(e); failHard(e); }
  storyBusy = false; if (sheetKind === "diary") showDiary();
}

// ---- welcome back recap
function showRecap(days, logs) {
  const big = logs.filter(l => l.dramas.some(d => d !== "kecil") || l.events.includes("akhir_hidup")).slice(-8);
  openSheet("recap", `
    <span class="ribbon">WELCOME BACK</span>
    <h2>You were away for ${days} days.</h2>
    ${big.length ? big.map(l => `<div class="diary-entry"><span class="day">Day ${l.day + 1}</span><div><h3>${esc(l.name)}</h3><p>${md(l.lines.join(" "))}</p></div></div>`).join("") : "<p>It was quiet. Everyone just lived their days.</p>"}
    <button class="big" data-close="1">Go home</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
}

$("famBtn").onclick = () => { hideHint(); if (game) showFamily(); };
$("planBtn").onclick = () => { hideHint(); if (game) { agMon = 0; agSel = null; showAgenda(null); } };   // v80: tombol kalender = Agenda
$("diaryBtn").onclick = () => { hideHint(); if (game) showBook(); };


// ================================================================ v44.1: Soon and Someday rows, and the "what's ahead" sheet
// Dua baris di bawah Today (daftar-saran 1–4, 6): Soon = hal bertanggal terdekat, Someday = harapan tanpa tanggal.
// Keputusan dan teksnya di soon.js (Soon.items/line/someday, diuji di Node); di sini hanya potret keadaan, gambar, dan pemetaan `go`.
// Semua tanggal sudah ada di simulasi; tidak ada yang disimpan, dihitung ulang dari keadaan tiap refresh seperti baris Today.
function aheadSnap() {
  if (!cur || !game) return null;
  const d = today(), F = famStatus(), v = vm(), c = game.home.get(cur.id);
  const members = v.anggota.map(m => { const h = game.home.get(m.id); return { id: m.id, nama: m.nama, fase: m.fase, umur: m.umur, born: m.born, kid: !h || phKind(h) === "tablet", info: h ? h.info : {}, st: h && h.st ? h.st : null }; });
  const kindred = [];
  if (globalThis.Net && kdNet) for (const m of members) {
    if (m.fase === "meninggal" || m.fase === "merantau") continue;
    try { const V = Net.view(game.home.get(m.id)); if (V.ready) for (const P of V.rels) if (P.next) kindred.push({ cid: m.id, nama: P.nama, label: KD_SOON[P.next], wait: P.wait, asked: P.asked }); } catch (e) { /* Kindred belum siap: tanpa baris Kindred */ }
  }
  return {
    d, cur, members, moments: F.moments, world: game.home.world.events || [], drops: Market.drops(d),
    mag: Mag.issueDay(Mag.latest(d) + 1), build: F.build ? { done: F.build.done, label: F.build.item ? F.build.item.label : "" } : null,
    kindred, phases: Engine.PHASES, prize: id => !!(Status.JOBS[id] && Status.JOBS[id].prize),
    wants: c ? Wants.active(c, d, game.home) : [], cita: c ? c.info.cita || null : null, nameOf,
  };
}
let aheadKey = null, aheadCache = null, somedayCache = null;
function drawAhead() {
  const el = $("soon"), el2 = $("someday"); if (!el || !state) return;
  const off = !cur || !game || state.tut < COACH.length || (TOWN && TOWN.on) || cur.fase === "meninggal" || cur.fase === "merantau";
  const S = off ? null : aheadSnap();
  const L = S ? Soon.line(S) : null, M = S ? Soon.someday(S) : null;
  el.hidden = !L; el2.hidden = !M;
  if (L) $("momentPill").hidden = true; // the Soon row already names the nearest big moment
  const key = (L ? `${L.k}@${L.day - S.d}` : "-") + "|" + (M ? M.k : "-"); // the distance is part of the key: "in 4 days" has to become "in 3 days" overnight
  if (key !== aheadKey) {
    aheadKey = key;
    if (L) { $("soonIc").textContent = L.ic || ""; $("soonTx").textContent = L.tx; el.classList.toggle("maybe", !L.sure); Tele.ev("soon", { k: L.k.split(":")[0], a: "tampil", hari: L.day - S.d, pasti: L.sure ? 1 : 0 }); }
    if (M) { $("somedayIc").textContent = M.ic || ""; $("somedayTx").textContent = M.tx; Tele.ev("soon", { k: "someday:" + M.k.split(":")[0], a: "tampil" }); }
  }
  aheadCache = L; somedayCache = M;
  aheadTourMaybe();
}
// v44.1: tutorial fitur yang bukan pintu (aturan v43: tiap fitur baru punya tutorial, bisa diulang lewat "?"). Dicek setelah tur pintu;
// fragmen lain menambah { id, when } ke daftar ini. Yang sudah dilihat tercatat di state.tur_pintu seperti tur pintu.
const EXTRA_TOURS = [{ id: "ahead", when: () => !$("soon").hidden || !$("someday").hidden }];
function aheadTourMaybe() {
  if (!state || !game || !cur || tour || sheetKind || PH || (TOWN && TOWN.on) || coachEl || state.tut < COACH.length || game.pending) return;
  if (cur.fase === "meninggal" || cur.fase === "merantau") return;
  const T = (state.tur_pintu ||= {});
  for (const X of EXTRA_TOURS) if (!T[X.id] && TOURS[X.id] && X.when()) { tourStart(X.id, false); return; }
}
$("soon").onclick = () => { const L = aheadCache; if (!L) return; Tele.ev("soon", { k: L.k.split(":")[0], a: "ketuk" }); hideHint(); showAhead(); };
$("someday").onclick = () => { const M = somedayCache; if (!M) return; Tele.ev("soon", { k: "someday:" + M.k.split(":")[0], a: "ketuk" }); hideHint(); showAhead(); };

// where a row in the sheet goes: the same keys soon.js hands out
function aheadGo(it) {
  if (!it) return;
  if (it.cid && it.cid !== selected && ["plan", "profil"].includes(it.go)) select(it.cid);
  const GO = {
    plan: () => showPlan(), profil: () => showProfile(it.cid || cur.id), momen: () => showMoment(it.m), family: () => showFamily(),
    kalender: () => { showPhone("home"); phOpen("calendar"); }, mag: () => { showPhone("home"); phOpen("mag"); },
    kindred: () => { showPhone("home"); phOpen("kindred"); }, bazaar: () => { closeSheet(); showBazaar("new"); },
  };
  (GO[it.go] || (() => {}))();
}
const AHEAD_DAYS = 180;
function showAhead() {
  const S = aheadSnap(); if (!S) return;
  const soon = Soon.items(S).filter(i => i.day - S.d <= AHEAD_DAYS), some = Soon.someday(S);
  const row = (i, ix) => `<button class="line ahead${i.sure ? "" : " maybe"}" data-ahead="${ix}"><i class="want-ic">${i.ic || "·"}</i><span class="grow"><b>${esc(i.tx)}</b><small class="sub">${esc(fmtDate(i.day))} · ${i.sure ? "a set day" : "maybe"}${i.sub ? " · " + esc(i.sub) : ""}</small></span></button>`;
  openSheet("ahead", `
    <span class="ribbon" style="background: var(--sky)">WHAT'S AHEAD</span>
    <h2>Soon</h2>
    ${soon.length ? `<div class="list">${soon.map(row).join("")}</div>` : `<p>Nothing with a date in the next ${AHEAD_DAYS} days. Quiet times are when ${esc(cur.nama)} picks up new habits.</p>`}
    <p class="muted">A set day is a real day on your calendar. <i>Maybe</i> means the day is set but getting it is not.</p>
    <h2>Someday</h2>
    ${some ? `<div class="list"><button class="line ahead" data-someday="1"><i class="want-ic">${some.ic || "·"}</i><span class="grow"><b>${esc(some.tx)}</b><small class="sub">A hope without a date yet.</small></span></button></div>` : `<p>No big hope on the horizon right now. Dreams and big wishes show up here when ${esc(cur.nama)} has one.</p>`}
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  sheet.querySelectorAll("[data-ahead]").forEach(b => b.onclick = () => { const it = soon[+b.dataset.ahead]; Tele.ev("soon", { k: it.k.split(":")[0], a: "buka" }); aheadGo(it); });
  const sb = sheet.querySelector("[data-someday]"); if (sb) sb.onclick = () => { Tele.ev("soon", { k: "someday:" + some.k.split(":")[0], a: "buka" }); aheadGo(some); };
}

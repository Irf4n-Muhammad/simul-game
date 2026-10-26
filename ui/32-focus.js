// ================================================================ v44.1: focus session (daftar-saran 31): 25 minutes side by side
// Sesi fokus adalah tombol "Study together" yang sudah ada, dibungkus timer: 25 menit selesai = satu ketukan belajar
// (game.act "belajar", mekanik lama, maks 3 per ujian), jadi tidak ada angka simulasi baru. Tanpa ujian, sesi tetap bisa
// jalan sebagai kerja bareng: makhluk nemenin di layar, tidak ada efek apa pun. Sesi yang sedang jalan disimpan di
// localStorage (bukan di save, tidak di-replay) supaya tahan muat ulang. HP dalam game dikunci selama sesi.
const FOCUS_KEY = SAVE_KEY + "-fokus", FOCUS_MIN = 25;
const FOCUS_LINES = ["Still here.", "Page three.", "Don't look at your phone.", "Halfway there.", "Nearly done."];
let focus = (() => { try { return JSON.parse(localStorage.getItem(FOCUS_KEY)) || null; } catch (e) { return null; } })();
let focusTimer = null, focusLock = null, focusLineAt = 0;
const focusSave = () => { try { if (focus) localStorage.setItem(FOCUS_KEY, JSON.stringify(focus)); else localStorage.removeItem(FOCUS_KEY); } catch (e) {} };
const focusLeftMs = () => focus ? Math.max(0, focus.t0 + focus.min * 60000 - Date.now()) : 0;
const focusClock = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
// potret buat baris Today (today.js): kunci ikut menit tersisa supaya teksnya ganti tiap menit
const focusView = () => focus ? { min: Math.ceil(focusLeftMs() / 60000), left: focusClock(focusLeftMs()) } : null;
function focusExam(c) { const u = c && c.info.ujian; return !!(u && today() < u.hari && u.belajar < 3); }
function focusStart() {
  if (focus || !cur || !game || !canCare()) return;
  const c = game.home.get(cur.id), exam = focusExam(c);
  focus = { t0: Date.now(), min: FOCUS_MIN, cid: cur.id, nama: cur.nama, exam };
  focusSave(); focusLineAt = Date.now();
  Tele.ev("fokus", { a: "mulai", ujian: exam ? 1 : 0, menit: FOCUS_MIN });
  try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(l => { focusLock = l; }, () => {}); } catch (e) { /* layar boleh mati; timernya jam dinding */ }
  say(exam ? "Okay. Books out." : "Okay. Let's get to it.", 2000);
  focusTick(); showFocus();
}
// how: "selesai" (timer habis) atau "batal" (berhenti lebih awal, tanpa kredit)
function focusEnd(how) {
  if (!focus) return null;
  const F = focus; focus = null; focusSave();
  try { if (focusLock) { focusLock.release(); focusLock = null; } } catch (e) {}
  let credited = false, after = null;
  if (how === "selesai" && F.exam && game) {
    // sama persis dengan tombol "Study together" di rencana harian: satu ketukan belajar, dicatat sebagai aksi biasa
    credited = !!game.act(F.cid, "belajar");
    if (credited) { save(); refresh(); const c = game.home.get(F.cid); after = c && c.info.ujian ? c.info.ujian.belajar : null; }
  }
  Tele.ev("fokus", { a: how, ujian: F.exam ? 1 : 0, menit: Math.min(F.min, Math.round((Date.now() - F.t0) / 60000)), kredit: credited ? 1 : 0 });
  drawToday();
  return { ...F, how, credited, after };
}
function focusTick() {
  if (!focus) { clearInterval(focusTimer); focusTimer = null; return; }
  if (!focusTimer) focusTimer = setInterval(focusTick, 1000);
  const left = focusLeftMs();
  if (left <= 0) { const r = focusEnd("selesai"); if (r) showFocusDone(r); return; }
  if (sheetKind === "fokus") { const el = $("focusClock"); if (el) el.textContent = focusClock(left); const m = $("focusBar"); if (m) m.style.width = `${(1 - left / (focus.min * 60000)) * 100}%`; }
  // the creature keeps you company: a small movement every now and then, a word every five minutes
  if (Date.now() - focusLineAt > 5 * 60000) { focusLineAt = Date.now(); const ix = Math.floor((focus.min * 60000 - left) / (5 * 60000)) - 1; say(FOCUS_LINES[Math.max(0, Math.min(FOCUS_LINES.length - 1, ix))], 2200); play("wiggle", 700); }
  else if (Math.floor(left / 1000) % 20 === 0 && !reduce) play("wiggle", 500);
}
function showFocus() {
  if (!cur || !game) return;
  const c = game.home.get(cur.id), n = esc(cur.nama), exam = focusExam(c), u = cur.ujian;
  if (focus) {
    const F = focus, left = focusLeftMs();
    openSheet("fokus", `
      <span class="ribbon" style="background: var(--sky)">FOCUS · ${esc(F.nama)}</span>
      <div class="focus-clock" id="focusClock">${focusClock(left)}</div>
      <div class="meter"><i id="focusBar" style="width:${(1 - left / (F.min * 60000)) * 100}%"></i></div>
      <p>${F.exam ? `Books out. When the clock hits zero it counts as a study evening for ${esc(F.nama)}.` : `${esc(F.nama)} is keeping you company. Nothing to earn here, just the two of you getting something done.`}</p>
      <p class="muted">The phone in the game is off until the session ends. The clock keeps running if you leave the app.</p>
      <div class="row2"><button class="secondary" id="focusStop">Stop early</button><button class="close" data-close="1">Keep going</button></div>`);
    sheet.classList.add("clear"); // the room stays visible: they're keeping you company
    $("focusStop").onclick = () => { const r = focusEnd("batal"); closeSheet(); if (r) say(r.exam ? "Next time, then." : "Okay. Another time.", 2000); };
    sheet.querySelector("[data-close]").onclick = closeSheet;
    return;
  }
  openSheet("fokus", `
    <span class="ribbon" style="background: var(--sky)">FOCUS TOGETHER · ${n}</span>
    <h2>${exam ? `${n} has ${u && u.jenis === "akhir" ? "final exams" : "a quiz"} on ${esc(fmtDate(u.hari))}.` : `Sit down with ${n} for ${FOCUS_MIN} minutes.`}</h2>
    <p>${exam ? `Sit down together for ${FOCUS_MIN} minutes: you with your work, ${n} with theirs. When the clock ends it counts as a study evening, the same as the Study button (${u.belajar}/3 so far).` : `You bring your own work. ${n} stays on screen and keeps you company. There is nothing to earn, and nothing changes in their life.`}</p>
    <p class="muted">Put the phone down. The phone in the game is off until the session ends. The clock keeps running if you leave the app.</p>
    <div class="row2"><button class="big" id="focusGo" ${canCare() ? "" : "disabled"}>Start ${FOCUS_MIN} minutes</button><button class="close" data-close="1">Not now</button></div>`);
  $("focusGo").onclick = focusStart;
  sheet.querySelector("[data-close]").onclick = closeSheet;
}
function showFocusDone(r) {
  const n = esc(r.nama);
  openSheet("fokus_done", `
    <span class="ribbon" style="background: var(--mint)">${r.min} MINUTES TOGETHER</span>
    <h2>${r.credited ? `That counts as a study evening. ${r.after != null ? `${r.after}/3 so far.` : ""}` : r.exam ? `The clock ran out, but the quiz had already passed.` : `Done. ${n} liked the company.`}</h2>
    <p>${r.credited ? `${n} sat with you the whole time. Study evenings add up on the day of the quiz.` : r.exam ? `Nothing to count this time. The time together was still real.` : `No exam, so nothing to count. Come back for another one whenever you need company.`}</p>
    <button class="big" data-close="1">Nice</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  play("jump", 800); burst(["★"], r.credited ? 6 : 3, "#D4A853");
}
// the phone in the game stays off during a session (same handler as before, with the lock in front of it)
$("lifeBtn").onclick = () => { hideHint(); if (!game) return; if (focus) { say("Phone's off till the session ends.", 1800); Tele.ev("fokus", { a: "hp" }); return; } showPhone(); };
EXTRA_TOURS.push({ id: "fokus", when: () => doorsNow().plan && (state.tur_pintu || {}).plan });
if (focus) focusTick();

// ================================================================ v48: notifikasi (kabar.js yang mutusin isinya, di sini cuma jadwal + izin)
// Pilihan pemain (opt-in, ditawarkan sekali sesudah tur) disimpan di state.kabar { on, asked }. Bukan aksi, tidak di-replay.
// Cara sampai ke pemain, dari yang paling bisa diandalkan:
//   1. Notification Triggers (TimestampTrigger, Chrome Android kalau tersedia): dijadwalkan ke sistem, muncul walau app ditutup.
//   2. Antrian di service worker (sw.js, Cache Storage) + periodicsync: muncul waktu browser membangunkan SW (app terpasang).
//   3. Timer di halaman: muncul selama tab masih hidup di belakang.
// Notifikasi yang benar-benar pasti waktu app ditutup butuh server push; itu bagian backend (Blok B), belum diputuskan.
const KABAR_OK = typeof Notification !== "undefined" && "serviceWorker" in navigator;
let kabarTimers = [];
const kabarReg = () => KABAR_OK ? navigator.serviceWorker.getRegistration().catch(() => null) : Promise.resolve(null);
const kabarUrl = () => location.origin + location.pathname + "?from=kabar";
const kabarTs = at => state.jam.base_ts + (at - state.jam.base_day) * state.jam.ms;
function kabarSnap() {
  const m = vm().anggota.find(x => x.id === selected && x.fase !== "meninggal" && x.fase !== "merantau") || vm().anggota.find(x => x.fase !== "meninggal" && x.fase !== "merantau");
  if (!m) return null;
  const c = game.home.get(m.id), d = today(), v = c ? game.careView(c) : null;
  const K = c && c.age(d) < 270 ? (c.age(d) >= 180 && globalThis.Remaja ? Remaja.calendar(c, d) : globalThis.Anak ? Anak.calendar(c, d) : []) : [];
  const L = Mag.latest(d);
  return { d, now: dayFloat(), nama: m.nama, fase: m.fase,
    done: { malam: !!(v && v.items.filter(i => i.half).every(i => i.done)) },
    tanya: m.id === selected && !!tanyaView(), away: !!game.titipNow(d),
    school: K.filter(k => k.day >= d && !k.done).slice(0, 3).map(k => ({ day: k.day, label: k.label })),
    mag: Mag.issueDay(L) === d ? d : Mag.issueDay(L + 1) };
}
async function kabarSync() {
  kabarTimers.forEach(clearTimeout); kabarTimers = [];
  const reg = await kabarReg(); if (!reg) return;
  // buka app = semua kabar yang sudah tampil ditutup, dan jadwal lama dibuang (dihitung ulang dari keadaan sekarang)
  try { (await reg.getNotifications({ includeTriggered: true })).forEach(n => n.close()); } catch (e) { /* ignore */ }
  const on = state && game && state.kabar && state.kabar.on && Notification.permission === "granted";
  const S = on ? kabarSnap() : null, list = S ? Kabar.plan(S).map(x => ({ ts: kabarTs(x.at), tag: x.tag, title: x.title, body: x.body })) : [];
  reg.active && reg.active.postMessage({ type: "kabar", list });
  if (!list.length) return;
  const TT = globalThis.TimestampTrigger, trig = typeof TT === "function" && "showTrigger" in Notification.prototype;
  for (const x of list) {
    const opt = { body: x.body, tag: "kabar-" + x.tag + "-" + Math.floor(x.ts / 3600000), icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: kabarUrl() } };
    if (trig) { try { await reg.showNotification(x.title, { ...opt, showTrigger: new TT(x.ts) }); continue; } catch (e) { /* jatuh ke timer */ } }
    const wait = x.ts - Date.now();
    if (wait > 0 && wait < 864e5) kabarTimers.push(setTimeout(() => { if (document.visibilityState !== "visible") reg.showNotification(x.title, opt).catch(() => {}); }, wait));
  }
  try { if (reg.periodicSync) await reg.periodicSync.register("kabar", { minInterval: 3 * 3600000 }); } catch (e) { /* butuh app terpasang */ }
}
async function kabarSet(on) {
  if (on && Notification.permission !== "granted") {
    let p = "denied"; try { p = await Notification.requestPermission(); } catch (e) { /* ignore */ }
    if (p !== "granted") { state.kabar = { on: false, asked: true }; save(); Tele.ev("kabar", { a: "ditolak" }); return false; }
  }
  state.kabar = { on, asked: true }; save(); Tele.ev("kabar", { a: on ? "nyala" : "mati" });
  kabarSync();
  return true;
}
function showKabar(first) {
  const n = esc(cur.nama), on = !!(state.kabar && state.kabar.on) && KABAR_OK && Notification.permission === "granted";
  const blocked = KABAR_OK && Notification.permission === "denied";
  openSheet("kabar", `<span class="ribbon" style="background: var(--sky)">NOTIFICATIONS</span>
    <h2>${first ? `Want ${n} to let you know?` : "Notifications"}</h2>
    <p>At most two a day: in the morning, what's on for ${n} today (a quiz, the magazine, a question for you), and in the evening, only if bedtime isn't done yet. Nothing between 9:30 pm and 8 am.</p>
    ${!KABAR_OK ? `<p class="sub">This browser can't show notifications.</p>` : blocked ? `<p class="sub">Notifications are blocked for this site. Turn them on in your browser's site settings, then come back here.</p>`
      : `<small class="sub">Works best when the game is added to your home screen. If the browser is fully closed, some may not arrive yet.</small>`}
    ${KABAR_OK && !blocked ? `<button class="${on ? "secondary" : "choice yes"}" id="kbOn">${on ? "Turn off" : "Turn on"}</button>` : ""}
    ${on ? `<button class="secondary" id="kbTest">Send a test</button>` : ""}
    <button class="close" data-close="1">${first ? "Not now" : "Close"}</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  if ($("kbOn")) $("kbOn").onclick = async () => { await kabarSet(!on); showKabar(false); };
  if ($("kbTest")) $("kbTest").onclick = async () => {
    const reg = await kabarReg();
    if (reg) reg.showNotification(`${cur.nama} says hi`, { body: "This is how a notification from Old Town looks.", tag: "kabar-test", icon: "icons/icon-192.png", data: { url: kabarUrl() } }).catch(() => say("Couldn't show it. Check the browser's notification settings.", 3000));
  };
}
// ditawarkan sekali, sesudah tur selesai (save lama: di pembukaan berikutnya)
function kabarOffer() {
  if (!KABAR_OK || !state || state.kabar || state.tut == null || state.tut < COACH.length || sheetKind || PH || tour || coachEl || game.pending || !cur) return;
  if (Notification.permission === "denied") { state.kabar = { on: false, asked: true }; save(); return; }
  state.kabar = { on: false, asked: true }; save();
  Tele.ev("kabar", { a: "tawar" });
  setTimeout(() => { if (!sheetKind && !tour && !coachEl && !PH) showKabar(true); else state.kabar = null; }, 2500);
}
// tiap kali app dibuka atau ditinggal, jadwal dihitung ulang dari keadaan terbaru
document.addEventListener("visibilitychange", () => { if (state && game) kabarSync(); });

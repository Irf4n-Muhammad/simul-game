// ================================================================ v78: konser live (orang ketiga)
// Jadwal dan timeline dari konser.js, arena dari konser3d.js, musik dari suara.js (SND.band). Masuknya dari sheet Riverside Park:
// pas pintu dibuka (15 menit sebelum) ada tombol konser live; latihan (rehearsal) bisa kapan aja buat nyobain. Tahap 1: belum ada
// hadiah atau catatan di hidup makhluk, jadi masuk konser nggak ngubah simpanan.
function festToday() { const f = game ? (Engine.world_active(game.home.world, today()) || []).find(e => e.jenis === "festival") : null; return f ? { nama: f.nama, ikon: f.ikon } : null; }
function konserStatus() { return globalThis.Konser ? Konser.status(new Date(), festToday()) : null; }
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function konserHtml() {
  if (!globalThis.Konser3D) return "";
  const S = konserStatus(); if (!S) return "";
  const d = new Date(S.start), open = S.phase !== "soon", who = cur ? esc(cur.nama) : "your creature";
  const when = S.phase === "live" ? `on now, ${Konser.clock(S.sec)} in` : S.phase === "doors" ? `doors are open, starts in ${S.wait}` : `${DAYS[d.getDay()]} ${d.getHours()}:00, in ${S.wait}`;
  return `<p><b>🎤 ${esc(S.name)}</b> · ${when}. A stadium show at Riverside Arena next to the park, and everyone in town sees it at the same second.</p>
    ${open ? `<button class="big" id="goKonser">Go to the concert with ${who}</button>` : ""}
    <button class="big" id="tryKonser">Try a rehearsal now</button>`;
}
function bindKonser() {
  const g = $("goKonser"), r = $("tryKonser");
  if (g) g.onclick = () => { const S = konserStatus(); if (S && S.phase !== "soon") konserEnter({ start: S.start, live: true, name: S.name }); };
  if (r) r.onclick = () => konserEnter({ start: Date.now() + 10000, live: false, name: Konser.BAND });
}
function konserInit() {
  if (!KONSER && globalThis.Konser3D) KONSER = Konser3D.create({ THREE, renderer, canvas, M, F, RB, SPH, CYL, canvasTex, environment: scene.environment, reduce,
    makeKiko: p => (cur && cur.fase !== "meninggal" && cur.fase !== "merantau" ? makeCreature(cur, p) : null), say: konserSay, onEnd: konserEnd });
  return KONSER;
}
async function konserEnter(o) {
  sndInit(); closeSheet(); await veil(true);
  konserInit(); if (TOWN) TOWN.exit();
  KONSER.enter(o); KONSER.resize(app.clientWidth, app.clientHeight);
  outMode("konser"); Tele.layar("app", "konser"); Tele.ev("kota", { a: "konser", p: o.live ? "live" : "latihan" });
  if (SND) SND.band(() => KONSER.sec(), Konser.step, Konser.STEP);
  $("kTitle").textContent = o.name; $("kLive").textContent = o.live ? "● LIVE" : "Rehearsal"; $("kLive").classList.toggle("on", !!o.live);
  const touch = matchMedia("(pointer: coarse)").matches, h = $("kHelp");
  h.textContent = touch ? "Joystick to walk · drag to look around · tap the buttons to jump and dance" : "WASD to walk · drag to look around · Space to jump · 1 to 4 for emotes";
  h.classList.add("on"); setTimeout(() => h.classList.remove("on"), 7000);
  konserHud(); konserSnd(); veil(false);
}
async function konserLeave() {
  if (!KONSER || !KONSER.on) return;
  closeSheet(); await veil(true);
  if (SND) SND.bandStop(); KONSER.exit(); joyReset();
  if (TOWN) { TOWN.resume(); TOWN.resize(app.clientWidth, app.clientHeight); outMode("town"); Tele.layar("app", "town"); } else outMode(null);
  veil(false);
}
let kSayT = 0;
function konserSay(t) { const el = $("kSay"); el.textContent = t; el.classList.add("on"); clearTimeout(kSayT); kSayT = setTimeout(() => el.classList.remove("on"), 2600); }
function konserHud() {
  if (!KONSER || !KONSER.on) return;
  const { s, A } = KONSER.state();
  const txt = A.phase === "before" ? `Starts in ${A.left > 60 ? Konser.wait(A.left * 1000) : Math.ceil(A.left) + "s"}` : A.phase === "after" ? "That's the show" : `${A.name} · ${Konser.clock(s)} / ${Konser.clock(Konser.LEN)}`;
  if ($("kAct").textContent !== txt) $("kAct").textContent = txt;
  $("kProg").style.width = `${Math.max(0, Math.min(1, s / Konser.LEN)) * 100}%`;
}
function konserEnd() {
  const live = KONSER.live(), who = cur ? esc(cur.nama) : "Your creature";
  sheet.classList.add("clear");
  openSheet("lot", `<span class="ribbon">${live ? "Live concert" : "Rehearsal"}</span><h2>That was ${esc(Konser.BAND)}!</h2>
    <p>${who} is still humming the last song.</p>
    <p class="muted">${live ? "The next show is next Saturday at 20:00." : "The real show is every Saturday at 20:00 at Riverside Arena."} Memories and keepsakes from concerts come later.</p>
    <button class="big" id="kAgain">Watch the rehearsal again</button><button class="big" id="kHome">Back to Old Town</button>`);
  $("kAgain").onclick = () => { closeSheet(); KONSER.enter({ start: Date.now() + 10000, live: false, name: Konser.BAND }); if (SND) SND.band(() => KONSER.sec(), Konser.step, Konser.STEP); $("kLive").textContent = "Rehearsal"; $("kLive").classList.remove("on"); };
  $("kHome").onclick = konserLeave;
}
function konserSnd() { const b = $("kSnd"); if (!b || !SND) return; b.classList.toggle("off", !SND.on); b.setAttribute("aria-pressed", String(SND.on)); }
// joystick (HP): geser dari tengah lingkaran, maksimal 46 px
const joy = { id: null, cx: 0, cy: 0 };
function joyReset() { joy.id = null; if (KONSER) KONSER.input.x = KONSER.input.y = 0; $("kKnob").style.transform = ""; }
$("kJoy").addEventListener("pointerdown", e => { const r = $("kJoy").getBoundingClientRect(); joy.id = e.pointerId; joy.cx = r.left + r.width / 2; joy.cy = r.top + r.height / 2; $("kJoy").setPointerCapture(e.pointerId); joyMove(e); });
function joyMove(e) {
  if (e.pointerId !== joy.id || !KONSER) return;
  let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const d = Math.hypot(dx, dy), R = 46;
  if (d > R) { dx *= R / d; dy *= R / d; }
  KONSER.input.x = dx / R; KONSER.input.y = -dy / R; $("kKnob").style.transform = `translate(${dx}px, ${dy}px)`;
}
$("kJoy").addEventListener("pointermove", joyMove);
for (const ev of ["pointerup", "pointercancel"]) $("kJoy").addEventListener(ev, e => { if (e.pointerId === joy.id) joyReset(); });
$("kJump").onclick = () => KONSER && KONSER.jump();
document.querySelectorAll("[data-emote]").forEach(b => b.onclick = () => KONSER && KONSER.emote(+b.dataset.emote));
$("kExit").onclick = konserLeave;
$("kSnd").onclick = () => { sndInit(); SND.mute(SND.on); konserSnd(); sndBtn(); };
const KEYS = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
addEventListener("keydown", e => {
  if (!KONSER || !KONSER.on || e.target.tagName === "INPUT") return;
  if (KEYS.includes(e.code)) { KONSER.key(e.code, true); e.preventDefault(); }
  else if (e.code === "Space") { KONSER.jump(); e.preventDefault(); }
  else if (/^Digit[1-4]$/.test(e.code)) KONSER.emote(+e.code.slice(5));
  else if (e.code === "Escape") konserLeave();
});
addEventListener("keyup", e => { if (KONSER && KEYS.includes(e.code)) KONSER.key(e.code, false); });
addEventListener("blur", () => { if (KONSER) for (const k of KEYS) KONSER.key(k, false); });

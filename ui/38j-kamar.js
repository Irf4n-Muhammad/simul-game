// ================================================================ v88: Kamar panjang (desktop): satu kamar memanjang selebar layar, buat ditemenin
// Layar lebar saja (tombol #kamarBtn di HUD muncul lewat CSS). Isinya kamar tidur 10 x 3 petak dari denah sendiri (KP_PLAN), bukan denah rumah:
// rumah asli nggak disentuh, keluar = denah lama dibangun lagi. Kamera depan, sudut kecil (fov 18), seluruh kamar kelihatan, dinding samping
// disembunyikan, lantai kayu disambung ke arah kamera sampai bawah layar. Barang lantai dikecilkan (KP_FS), makhluk dan pet juga (KP_CS, KP_PS).
// Makhluk jalan kanan kiri sendiri, berhenti sebentar di beberapa titik; pet ngikut di belakangnya; bubble ngikut kepala.
// Tombol: hujan (langit jendela + suara hujan, kulit saja seperti cuaca asli), lampu kamar, suara. Kolom chat = guardianSay (ui/10-chat-claude.js).
// UI memudar sendiri kalau mouse diam, jadi bisa dibiarkan layar penuh. Esc = balik ke game.
const KP_PLAN = { v: 1, R: [["tidur", 1, 1, 10, 3]], D: [], N: ["h3,1", "h8,1"],
  I: [["plush_bedroom", 1, 1, 0], ["pine_bed", 2, 1, 0], ["nightstand", 4, 1, 0], ["bookshelf", 5, 1, 0], ["sofa", 6, 1, 0], ["shelf_books", 6, 1, 0], ["work_desk", 9, 1, 0], ["rug_bedroom", 3, 2, 0], ["rug_playroom", 6, 2, 0]],
  C: [["", ""]] };
const KP_FS = 0.8, KP_CS = 0.52, KP_PS = 0.5, KP_FIT = 0.84, KP_SPEED = 0.85;
const KP = { on: false, prevRoom: 0, prevDraft: null, lamp: null, b: null, x: 0, z: 0, tx: 0, dir: 1, wait: 2, rot: 0, walking: false, px: 0, ui: null, moveT: 0, alert: "" };
const kamarOn = () => app.classList.contains("kamar");
const kpBusy = () => kamarOn() && KP.walking;

// ---- kamar: rapikan ruangan yang baru dibangun (sekali per grup)
function kpDress(r) {
  const G = r.g.position, x0 = G.x + CELL, x1 = G.x + 11 * CELL, zF = G.z + 4 * CELL;
  const box = o => new THREE.Box3().setFromObject(o);
  r.g.updateMatrixWorld(true);
  // lantai bawaan menjorok jauh ke depan: dipotong sampai tepi depan kamar
  for (const o of r.g.children) {
    if (!o.isMesh || o.geometry.type !== "BoxGeometry") continue;
    const b = box(o); if (b.max.y > 0.05 || b.max.z - zF < 1) continue;
    const d1 = zF + 0.15 - b.min.z; o.scale.z *= d1 / (b.max.z - b.min.z); o.position.z = b.min.z + d1 / 2 - G.z;
  }
  r.g.updateMatrixWorld(true);
  // dinding kiri/kanan (tinggi, tipis, dalam) dan apa pun di ujung kamar: disembunyikan, jadi kamarnya kelihatan memanjang tanpa sekat samping
  for (const o of r.g.children) { if (!o.isMesh || o.geometry.type !== "BoxGeometry") continue; const b = box(o); if (b.max.y > 3 && b.max.x - b.min.x < 0.6 && b.max.z - b.min.z > 1) o.visible = false; }
  r.g.traverse(o => { if (!o.isMesh || !o.visible) return; const b = box(o); if ((b.max.x < x0 + 0.5 || b.min.x > x1 - 0.5) && b.min.y > -0.3) o.visible = false; });
  // barang lantai dikecilkan, kaki tetap di tempat (tengah bawah, sisi belakang)
  const walk = o => {
    for (const c of [...o.children]) {
      if (!c.visible) continue; const b = box(c); if (b.isEmpty()) continue;
      if (b.max.x - b.min.x > 4.6 || b.max.y > 6) { walk(c); continue; }
      if (b.min.y < -0.1 || b.min.y > 0.3) continue;
      const cx = (b.min.x + b.max.x) / 2; c.scale.multiplyScalar(KP_FS); c.updateMatrixWorld(true);
      const b2 = box(c); c.position.x += cx - (b2.min.x + b2.max.x) / 2; c.position.y += b.min.y - b2.min.y; c.position.z += b.min.z - b2.min.z;
    }
  };
  walk(r.g);
  // lantai disambung ke arah kamera (tekstur papan diulang, bukan ditarik) supaya bawah layar tetap lantai, tanpa tepi
  const slab = r.g.children.find(o => o.isMesh && o.geometry.type === "BoxGeometry" && (() => { const b = box(o); return b.max.y <= 0.05 && b.min.y < -0.2 && b.max.x - b.min.x > 5; })());
  if (slab) {
    const b = box(slab), W = b.max.x - b.min.x, d = b.max.z - b.min.z, L = 8;
    const ms = (Array.isArray(slab.material) ? slab.material : [slab.material]).map(m => { const c = m.clone(); if (m.map) { c.map = m.map.clone(); c.map.needsUpdate = true; c.map.repeat.set(m.map.repeat.x, m.map.repeat.y * L / d); } return c; });
    const f = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, L), ms); f.receiveShadow = true;
    f.position.set((b.min.x + b.max.x) / 2 - G.x, b.max.y - 0.01, b.max.z + L / 2 - 0.001 - G.z); r.g.add(f);
    r.g.userData.kpBottom = b.min.y - 0.1;
  }
  r.g.userData.kp = true;
}

// ---- kamera: lebar kamar pas layar (KP_FIT), tepi bawah lantai kamar di bawah layar
function kpCam() {
  const r = ROOMS[0]; if (!r) return;
  const G = r.g.position, x0 = G.x + CELL, x1 = G.x + 11 * CELL, zB = G.z + CELL, zF = G.z + 4 * CELL;
  KP.b = { x0, x1, zB, zF };
  KP.z = zF - 0.6;
  if (!r.g.userData.kp) { kpDress(r); khDress(r); hdDress(r); }   // v89: lampu kecil, gorden, titik kegiatan (ui/38k-kamar-hangat.js)
  camera.fov = 18;
  const t = Math.tan(THREE.MathUtils.degToRad(9)), el = 0.12, zM = (zB + zF) / 2;
  const dist = ((x1 - x0) * KP_FIT / 2) / (t * camera.aspect) + (zF - zM);
  const look = new THREE.Vector3((x0 + x1) / 2, 3.2, zM);
  camera.position.set(look.x, look.y + dist * Math.sin(el), look.z + dist * Math.cos(el)); camera.lookAt(look); camera.updateProjectionMatrix();
  const bottom = r.g.userData.kpBottom ?? -0.6;
  for (let k = 0; k < 6; k++) {
    camera.updateMatrixWorld();
    const p = new THREE.Vector3(look.x, bottom, zF + 0.15).project(camera), dy = (p.y + 1) * dist * t * 0.95;
    camera.position.y += dy; look.y += dy; camera.lookAt(look);
  }
  camera.updateProjectionMatrix();
  KP.cam = { p: camera.position.clone(), l: look.clone() };   // titik tengah parallax (hdFrame)
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, far: 34 }); sun.shadow.camera.updateProjectionMatrix();
}

// ---- tiap frame (dipanggil frame() di ui/29-town.js setelah gerak makhluk dihitung, sebelum bubble ditaruh)
function kpFrame(t, dt, ts, napping) {
  if (!K || !KP.b) return;
  if (!K.__kp) { K.__kp = true; K.scale *= KP_CS; K.root.scale.multiplyScalar(KP_CS); }   // makhluk baru dibangun: frame ini juga sudah kecil
  if (PT3 && !PT3.__kp) { PT3.__kp = true; PT3.sc *= KP_PS; }
  // v89: ke mana dan ngapain diatur kegiatan ikut jam (khStep, ui/38k-kamar-hangat.js): jalan, baca di sofa, meja, jendela, tidur
  const face = khStep(t, dt, napping);
  // jalan = hadap samping + loncat kecil; berhenti = hadap depan (ikut kursor sedikit), atau arah kegiatan (meja/jendela = membelakangi)
  const want = KP.walking ? KP.dir * 1.2 : face !== null && face !== undefined ? face : lookX * 0.3;
  KP.rot += (want - KP.rot) * 0.12;
  K.root.rotation.y = KP.rot + idleLook.x * 0.02 * (1 - KH.lie);
  if (KP.walking && !reduce) K.root.position.y += Math.abs(Math.sin(ts * 8)) * 0.12;
  // rebahan di kasur: miring ke arah bantal (kiri), badan sedikit turun ke kasur
  K.root.rotation.z = KH.lie * 1.45;
  K.root.position.y += KH.y + KH.lie * 0.4;
  K.root.position.x = KP.x + KH.lie * 0.5; K.root.position.z = KH.z; blob.position.z = KH.z + 0.1; blob.position.y = 0.03 + KH.y;
  khFrame(t, dt, ts); hdFrame(t, dt, ts);
  if (PT3) {
    const want2 = KP.x - KP.dir * 1.1;
    KP.px += (want2 - KP.px) * Math.min(1, dt * 1.6);
    PT3.root.position.x = KP.px; PT3.root.position.z = KP.z - 0.35;
  }
}
// lampu bawaan ruangan ikut lampu berdiri (khMain): nyala sore/malam, mati siang dan waktu tidur, tombol/klik menimpa. Meredup pelan (KH.mainV).
function kpLamp() { return KH.mainV * Math.max(LIT.lamp, 1.2); }

// ---- suara di dalam kamar: hujan diredam, jangkrik malam, burung pagi, sedikit jalanan
function kpMix(wx) {
  const wet = { rain: 0.38, storm: 0.6 }[wx] || 0, dry = !wet && wx !== "snow";
  const H = khH(), fire = H ? H.candles.reduce((a, C) => Math.max(a, C.v), 0) : 0;
  return { rain: wet, traffic: 0.04, birds: dry && litName === "morning" ? 0.25 : 0, crickets: dry && litName === "night" ? 0.45 : 0, crowd: 0, glass: wet ? 0.6 + wet * 0.4 : 0, fire: fire * 0.6 };
}

// ---- tombol dan chat
const KP_IC = {
  rain: '<path d="M7 15a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 8.5a3.5 3.5 0 0 1 .5 6.5"/><path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2"/>',
  lamp: '<path d="M8 3h8l3 8H5Z"/><path d="M12 11v8M8 21h8"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  snd: '<path d="M11 5 6 9H3v6h3l5 4z"/><path class="wave" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path class="x" d="M16 9l5 6M21 9l-5 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
};
const kpSvg = k => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${KP_IC[k]}</svg>`;
function kpUi() {
  const el = document.createElement("div"); el.id = "kpUI";
  el.innerHTML = `<div class="kp-top"><div class="kp-who"><b id="kpName"></b><span id="kpClock"></span></div>
      <div class="kp-row"><button class="kp-round" id="kpFull" aria-label="Full screen">${kpSvg("full")}</button><button class="kp-round" id="kpExit" aria-label="Back to the game">${kpSvg("x")}</button></div></div>
    <button class="kp-alert" id="kpAlert" hidden></button>
    <div class="kp-amb"><button id="kpRain" aria-pressed="false">${kpSvg("rain")}Rain</button><button id="kpLamp" aria-pressed="false">${kpSvg("lamp")}Lamp</button><button id="kpFocus" aria-pressed="false">${kpSvg("focus")}<span>Focus</span></button><button id="kpSnd" aria-pressed="true" aria-label="Room sounds">${kpSvg("snd")}</button></div>
    <form class="kp-talk" id="kpTalk"><input id="kpIn" autocomplete="off" maxlength="300"><button>Send</button></form>`;
  app.appendChild(el); KP.ui = el;
  $("kpExit").onclick = kpExit;
  $("kpFull").onclick = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* browser nolak: tetap di jendela */ } };
  $("kpRain").onclick = () => { const on = !kpRaining(); WX_FORCE = on ? "rain" : "clear"; wxApply(wxReal); kpSync(); };
  $("kpLamp").onclick = () => { KP.lamp = !kpLampOn(); kpSync(); };
  $("kpFocus").onclick = () => { if (focus) focusEnd("batal"); else focusStart(); kpSync(); };
  $("kpSnd").onclick = () => { if (!SND) sndInit(); else SND.mute(SND.on); kpSync(); };
  $("kpAlert").onclick = () => { kpExit(); if (game && game.pending) setTimeout(showDilemma, 250); };
  $("kpTalk").addEventListener("submit", async e => {
    e.preventDefault();
    const inp = $("kpIn"), text = inp.value.trim();
    if (!text || chatBusy || !cur) return;
    if (!sampleFn) { say("...?", 1500); return; }
    inp.value = ""; say("...", 30000);
    try {
      const reply = await guardianSay(selected, text, tx => { if (bubble) bubble.firstChild.textContent = tx; talkUntil = now() + 600; });
      say(reply, 3500 + reply.length * 45);
    } catch (err) { say(err?.code === "cancelled" ? "..." : errText(err), 3000); }
  });
  kpSync();
}
const kpRaining = () => WX === "rain" || WX === "storm";
const kpLampOn = () => khMain() > 0.5;
function kpSync() {
  if (!KP.ui) return;
  const set = (id, on) => { const b = $(id); b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); };
  set("kpRain", kpRaining()); set("kpLamp", kpLampOn()); set("kpFocus", !!focus);
  $("kpFocus").lastChild.textContent = focus ? `Focus ${focusClock(focusLeftMs())}` : "Focus";
  const s = $("kpSnd"), on = !!(SND && SND.on); s.classList.toggle("off", !on); s.setAttribute("aria-pressed", String(on));
  const n = cur ? cur.nama : "";
  $("kpName").textContent = n; $("kpIn").placeholder = n ? `Say something to ${n}…` : "Say something…";
  $("kpClock").textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  // keputusan yang nunggu, atau lembar hasil yang muncul selama di sini (disembunyikan): satu tombol kecil, ketuk = balik ke game
  const pend = !!(game && game.pending), al = $("kpAlert"), t = pend ? `${n} needs you to decide something` : sheetKind && sheetKind !== "fokus" ? `Something new for ${n}` : "";
  al.hidden = !t; if (t && KP.alert !== t) { KP.alert = t; al.textContent = t; }
  KP.ui.classList.toggle("quiet", now() - KP.moveT > 5000 && document.activeElement !== $("kpIn"));
}
addEventListener("pointermove", () => { if (!kamarOn()) return; KP.moveT = now(); if (KP.ui && KP.ui.classList.contains("quiet")) kpSync(); }, { passive: true });
setInterval(() => { if (kamarOn()) kpSync(); }, 1000);

// ---- masuk / keluar
function kpEnter() {
  if (kamarOn() || PB_MODE || outView() || !game || !K) return;
  KP.prevRoom = roomIx; KP.prevDraft = DN_DRAFT; KP.lamp = null; KP.moveT = now();
  if (sheetKind) closeSheet();
  if (talkOpen) closeTalk();
  app.classList.add("kamar"); kpUi();
  DN_DRAFT = KP_PLAN; houseSync(); setRoom(0, true);
  KP.x = KP.px = (KP.b.x0 + KP.b.x1) / 2; KP.tx = KP.x + 3; KP.wait = 1.5; KP.rot = 0; khEnter();
  sndInit(); applyLight(true); kpSync();
  try { document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* tanpa layar penuh juga jalan */ }
  Tele.ev("kamar", { a: "masuk" });
}
function kpExit() {
  if (!kamarOn()) return;
  khExit(); hdExit();
  app.classList.remove("kamar"); if (KP.ui) { KP.ui.remove(); KP.ui = null; }
  WX_FORCE = null; wxApply(wxReal);
  if (K) { if (K.__kp) { K.scale /= KP_CS; K.__kp = false; } K.root.position.set(0, 0, 0); K.root.rotation.y = 0; } blob.position.z = 0.1;
  if (PT3) { if (PT3.__kp) { PT3.sc /= KP_PS; PT3.__kp = false; } PT3.root.position.set(1.65, 0, 1.5); }
  KP.walking = false; KP.b = null;
  DN_DRAFT = KP.prevDraft; houseSync(); setRoom(Math.min(KP.prevRoom, ROOMS.length - 1), true); applyLight(true);
  if (SND) SND.silence();
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* abaikan */ }
}
$("kamarBtn").onclick = kpEnter;
addEventListener("keydown", e => { if (e.key === "Escape" && kamarOn()) kpExit(); });

// ================================================================ loop render utama + resize (dipindah dari 29-town.js)
// frame(t) dipanggil tiap requestAnimationFrame (mulai di 39-start.js) dan memilih SATU adegan yang digambar, urut prioritas:
// mini game/layar Games (FC/ARC: tidak menggambar) → wilayah liar (LIAR) → konser (KONSER) → globe (GLOBE) → benua (CONT)
// → kota (TOWN) → rumah (scene + makhluk K). Pengirit baterai: adegan diam = 30 fps, di balik lembar blur = ~20 fps,
// layar penuh yang menutup adegan (coveredUp) = tidak digambar. Fitur 3D baru yang punya adegan sendiri: tambah cabang
// di sini (punya .on, .frame(t, dt), .scene, .camera, .resize(w, h)) dan daftarkan resize-nya di resize().
function resize() {
  if (PB_MODE) pbOrient();
  const w = app.clientWidth, h = app.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; if (TOWN) TOWN.resize(w, h); if (GLOBE) GLOBE.resize(w, h); if (CONT) CONT.resize(w, h); if (KONSER) KONSER.resize(w, h); if (LIAR) LIAR.resize(w, h);
  // face the creature straight on; fit about 5 units of width at the creature
  camera.fov = 44;
  const half = ROOM_HALF, dist = half / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(0.75, camera.aspect));
  camera.position.set(CAM_LOOK.x, CAM_LOOK.y + dist * 0.12, CAM_LOOK.z + dist);
  camera.lookAt(CAM_LOOK); camera.updateProjectionMatrix();
  if (PB_MODE) pbCamera(w, h);   // Tata Rumah: mode dekor melintang (ui/27b-tata-rumah.js)
  if (app.classList.contains("kamar")) kpCam();   // v88: kamar panjang desktop (ui/38j-kamar.js)
}
addEventListener("resize", resize); resize();

let last = now(), townT = 0, coverT = 0, homeT = 0, homeShT = 0, inputT = 0, coverDrawn = false;
// v87: sentuhan terakhir ke adegan 3D (bukan ke lembar atau tombol); rumah yang diam dan nggak disentuh digambar 30 kali per detik (lihat frame())
canvas.addEventListener("pointerdown", () => { inputT = now(); }, { passive: true });
canvas.addEventListener("pointermove", () => { inputT = now(); }, { passive: true });
// Layar penuh yang menutupi adegan 3D (HP, Burrow, Bazaar, langit bintang, buku). Selama terbuka, adegan nggak digambar:
// kanvas tetap menampilkan gambar terakhir, GPU bebas buat scroll dan blur di atasnya.
const isUp = o => !!(o && o.el && o.el.isConnected);   // elemen yang sudah dicopot nggak pernah membekukan adegan
const coveredUp = () => isUp(PH) || isUp(bw) || isUp(bz) || isUp(sky) || isUp(bk);
function frame(t) {
  requestAnimationFrame(frame);
  qMeter(t);
  if (FC || ARC) return;   // v49/v51: mini game dan layar Games nutupin layar; adegan 3D nggak usah digambar
  const game3d = (LIAR && LIAR.on) || (KONSER && KONSER.on);   // konser dan wilayah liar punya jam sendiri: jangan dijeda
  if (!game3d && coveredUp()) { last = t; return; }
  // lembar (sheet) setengah layar dengan latar blur: adegan di belakangnya cukup 20 kali per detik
  // v88: di kamar panjang lembar disembunyikan (muncul lagi waktu keluar), jadi adegannya tetap jalan penuh
  const sheetUp = sheetKind && !sheet.classList.contains("clear") && !kamarOn();
  if (!game3d && sheetUp) { if (t - coverT < 48) return; coverT = t; }
  const dt = Math.min(0.05, (t - last) / 1000); last = t; const ts = t / 1000;
  qFull = !sheetKind;
  renderer.shadowMap.autoUpdate = true;   // v79: kota (dan rumah yang diam, v87) boleh mematikannya; adegan lain selalu hitung bayangan
  if (LIAR && LIAR.on) { renderer.shadowMap.autoUpdate = true; LIAR.frame(t, dt); renderer.render(LIAR.scene, LIAR.camera); liarFps(t); return; }
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
  if (TOWN && TOWN.on) {
    // v79: kamera diam > 1,5 detik = kota digambar 30 kali per detik, bukan 60 (HP lebih adem, baterai lebih awet)
    if (TOWN.calm && TOWN.calm(t)) { qFull = false; if (t - townT < 31) return; }
    const tdt = Math.min(0.05, (t - townT) / 1000); townT = t;
    if (Math.floor(ts / 30) !== Math.floor((ts - tdt) / 30)) applyLight();
    TOWN.frame(t, tdt); renderer.render(TOWN.scene, TOWN.camera);
    const hn = TOWN.hoodAt(); if ($("hoodName").textContent !== hn) $("hoodName").textContent = hn;
    if (Math.floor(ts * 2) !== Math.floor((ts - dt) * 2)) townChips();
    return;
  }
  if (!K) { renderer.render(scene, camera); return; }
  // v87: makhluk diam (nggak ada animasi, ngomong, makan, atau sentuhan > 2,5 detik) = 30 fps dan bayangan dihitung ulang
  // ~8 kali per detik; begitu ada gerakan atau disentuh, balik 60 fps. HP lebih adem, jadi nggak makin lambat karena panas.
  const calm = !anim && !idle && !bubble && t > inputT + 2500 && t > talkUntil && t > chewUntil && t > joyUntil && t > surpriseUntil && !kpBusy();
  if (calm) {
    qFull = false;
    // di balik lembar berlatar blur, gambar yang diam nggak usah digambar ulang sama sekali: blur-nya nggak perlu dihitung ulang tiap frame,
    // jadi scroll lembarnya mulus. Begitu makhluknya gerak (iseng, animasi), digambar lagi.
    if (sheetUp) { if (coverDrawn) return; coverDrawn = true; }
    if (t - homeT < 31) return;
  }
  if (!calm || !sheetUp) coverDrawn = false;
  const hdt = Math.min(0.05, (t - homeT) / 1000); homeT = t;
  renderer.shadowMap.autoUpdate = false;
  if (!calm || t - homeShT > 120) { renderer.shadowMap.needsUpdate = true; homeShT = t; }
  const napping = t < napUntil, gone = cur && (cur.fase === "meninggal" || cur.fase === "merantau");
  K.root.visible = !gone && !PB_MODE;
  const lights = napping ? 0.3 : 1; hemi.intensity += (LIT.hemi * lights - hemi.intensity) * 0.1; sun.intensity += (LIT.sunI * lights - sun.intensity) * 0.1;
  if (Math.floor(ts / 30) !== Math.floor((ts - hdt) / 30)) applyLight();
  let lampOn = napping ? Math.max(LIT.lamp, 0.4) : LIT.lamp;
  if (kamarOn()) lampOn = kpLamp(lampOn);
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
  if (kamarOn()) kpFrame(t, hdt, ts, napping);   // v88: jalan kanan kiri di kamar panjang
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
  flies.forEach((f, i) => { f.visible = !gone && !PB_MODE && !!cur && cur.needs.kebersihan < 35; const a = ts * (2.5 + i * 0.7) + i * 2; f.position.set(head.x + Math.cos(a) * (1.4 + i * 0.15), head.y + Math.sin(a * 1.7) * 0.3, head.z + Math.sin(a) * 1.1 + 0.4); });
  const top = screenOf(new THREE.Vector3(head.x, head.y + 0.4, head.z));
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
  if (napping && Math.floor(ts * 1.2) !== Math.floor((ts - hdt) * 1.2)) burst(["Z"], 1, "#fff", 30, "zzz");
  if (cur && !gone && !napping && !anim && !bubble && Math.random() < hdt * 0.06) {
    if (cur.needs.lapar < 30) say("I'm hungry...", 1800); else if (cur.needs.kebersihan < 30) say("I smell funny", 1800); else if (cur.needs.energi < 25) say("So sleepy...", 1800);
  }
  if (kamarOn() && hdRender()) return;   // v90: kamar HD (bloom, grading) di ui/38l-kamar-hd.js
  renderer.render(scene, camera);
}

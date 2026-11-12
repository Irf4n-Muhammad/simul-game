// ================================================================ three.js scene
// Cozy diorama: each room is a small cut-away corner seen from above, in muted colors.
// The light follows the player's real clock: morning, day, evening, night.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new THREE.RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
const CAM_LOOK = new THREE.Vector3(-0.15, 2.45, 0);
const hemi = new THREE.HemisphereLight(0xfff4e6, 0x6e5e52, 0.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2c0, 1.6);
sun.position.set(-4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); sun.shadow.radius = 5; scene.add(sun);

// ---- kualitas adaptif: HP yang nggak kuat 60 fps diturunkan bertahap (resolusi kanvas; langkah pertama juga bayangan rumah 2048 -> 1024).
// Tingkatnya diingat di browser ini, jadi buka berikutnya langsung lancar. Kalau turun satu tingkat nggak bikin lebih cepat
// (mis. HP dikunci 30 fps oleh mode hemat baterai), tingkat itu dibatalkan dan penurunan berhenti: gambar nggak dibikin buram percuma.
const QUALITY = [[2, 2048], [1.5, 1024], [1.25, 1024], [1, 1024]];   // [batas rasio piksel, ukuran peta bayangan rumah]
const Q_KEY = "mk-q";
let qLevel = (() => { try { return Math.min(QUALITY.length - 1, Math.max(0, Math.floor(+localStorage.getItem(Q_KEY) || 0))); } catch (e) { return 0; } })();
const qSame = (a, b) => Math.min(devicePixelRatio, QUALITY[a][0]) === Math.min(devicePixelRatio, QUALITY[b][0]) && QUALITY[a][1] === QUALITY[b][1];
function applyQuality(boot) {
  const [pr, sh] = QUALITY[qLevel];
  // resize() (ui/29-town.js) baru boleh dipanggil sesudah semua modul jalan; waktu boot cukup set rasio, resize() awal yang menerapkannya
  if (renderer.getPixelRatio() !== Math.min(devicePixelRatio, pr)) { renderer.setPixelRatio(Math.min(devicePixelRatio, pr)); if (!boot) resize(); }
  if (sun.shadow.mapSize.x !== sh) { sun.shadow.mapSize.set(sh, sh); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
}
applyQuality(true);
// qFull: frame sebelumnya menggambar adegan dengan kecepatan penuh (bukan dijeda/diperlambat); cuma jeda antar frame seperti itu yang diukur
let qFull = false, qPrev = 0, qN = 0, qSlow = 0, qSum = 0, qBefore = 0, qFrom = -1, qDone = false;
function qMeter(t) {
  const d = t - qPrev, was = qFull; qPrev = t; qFull = false;
  if (!was || qDone || d > 1000 || document.visibilityState !== "visible") return;
  qN++; qSum += d; if (d > 24) qSlow++;   // > 24 ms = di bawah ~42 fps
  if (qN < 20 || (qN < 180 && qSum < 3000)) return;   // ~3 detik atau 180 frame
  const avg = qSum / qN, slow = qSlow > qN * 0.5;
  qN = qSlow = qSum = 0;
  if (!slow) { qBefore = 0; return; }
  if (qBefore && avg > qBefore * 0.9) {
    // turun terakhir nggak menolong: balikkan, berhenti
    qLevel = qFrom; qDone = true;
  } else {
    let n = qLevel + 1; while (n < QUALITY.length && qSame(n, qLevel)) n++;
    if (n >= QUALITY.length) { qDone = true; return; }
    qFrom = qLevel; qLevel = n; qBefore = avg;
  }
  applyQuality();
  try { localStorage.setItem(Q_KEY, String(qLevel)); } catch (e) { /* ignore */ }
  if (globalThis.Tele && Tele.teknis) Tele.teknis("kualitas", { lv: qLevel, ms: Math.round(avg) });
}

const M = (c, o = {}) => {
  const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0, envMapIntensity: 0.45 }, o));
  m.color.convertSRGBToLinear(); if (o.emissive !== undefined) m.emissive.convertSRGBToLinear(); return m;
};
const F = (c, o = {}) => { const m = new THREE.MeshBasicMaterial(Object.assign({ color: c }, o)); m.color.convertSRGBToLinear(); return m; };
const mesh = (geo, mat, x = 0, y = 0, z = 0, parent) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = !mat.transparent && !mat.isMeshBasicMaterial; (parent || scene).add(m); return m;
};
const RB = (w, h, d, r = 0.08, s = 3) => new THREE.RoundedBoxGeometry(w, h, d, s, r);
const SPH = (r, w = 32, h = 24) => new THREE.SphereGeometry(r, w, h);
const CYL = (a, b, h, n = 32) => new THREE.CylinderGeometry(a, b, h, n);
function canvasTex(draw, w = 256, h = 256, rx = 1, ry = 1) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  if (rx !== 1 || ry !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
  return t;
}
const TM = (map, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map, roughness: 0.9, envMapIntensity: 0.4 }, o));
const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return c.getHex(); };
const tint = (hex, k) => { const c = new THREE.Color(hex); c.lerp(new THREE.Color(0xffffff), k); return c.getHex(); };
const lum = hex => { const c = new THREE.Color(hex); return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; };
const mix = (a, b, k) => { const c = new THREE.Color(a); c.lerp(new THREE.Color(b), k); return c.getHex(); };
const css = hex => "#" + hex.toString(16).padStart(6, "0");
const noise = (g, w, h, a = 0.05, n = 1400) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } };

// --- surfaces
// two-tone wall: plaster above, painted panel or tiles below
const wallTex = (top, low, kind) => canvasTex((g, w, h) => {
  g.fillStyle = css(top); g.fillRect(0, 0, w, h); noise(g, w, h, 0.035);
  const y0 = h * (1 - 1.75 / WALL_H);
  g.fillStyle = css(low); g.fillRect(0, y0, w, h - y0);
  if (kind === "panel") { g.strokeStyle = "rgba(0,0,0,.10)"; g.lineWidth = 3; for (let x = 0; x < w; x += 64) { g.strokeRect(x + 10, y0 + 14, 44, h - y0 - 28); } }
  if (kind === "tile") { g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2; for (let x = 0; x <= w; x += 21) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, h); g.stroke(); } for (let y = y0; y <= h; y += 11) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } noise(g, w, h - y0, 0.06, 600); }
  if (kind === "plain") noise(g, w, h, 0.03);
  g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, y0 - 5, w, 5); g.fillStyle = "rgba(0,0,0,.08)"; g.fillRect(0, y0, w, 3);
}, 256, 256, 2, 1);
const floorTex = (kind, a, b) => canvasTex((g, w, h) => {
  if (kind === "planks") {
    for (let i = 0; i < 8; i++) { g.fillStyle = css(mix(a, b, (i * 37 % 10) / 10)); g.fillRect(0, i * 32, w, 32); g.fillStyle = "rgba(40,20,10,.18)"; g.fillRect(0, i * 32, w, 2); g.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32); }
    g.globalAlpha = 0.06; for (let i = 0; i < 60; i++) { g.fillStyle = "#3a2010"; g.fillRect(0, Math.random() * h, w, 1); } g.globalAlpha = 1;
  } else if (kind === "terra") {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = css(mix(a, b, ((i * 7 + j * 3) % 5) / 5)); g.fillRect(i * 64 + 1, j * 64 + 1, 62, 62); }
    g.fillStyle = "rgba(255,240,220,.6)"; for (let i = 0; i <= 4; i++) { g.fillRect(i * 64 - 1, 0, 2, h); g.fillRect(0, i * 64 - 1, w, 2); }
  } else {
    g.fillStyle = css(a); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = css(mix(b, a, Math.random() * 0.6)); g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 0, 7); g.fill(); }
  }
  noise(g, w, h, 0.04);
}, 256, 256, 2, 2);
const aoTex = canvasTex((g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(30,20,10,.38)"); gr.addColorStop(1, "rgba(30,20,10,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 16, 64);
const blobTex = canvasTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(30,20,10,.45)"); gr.addColorStop(1, "rgba(30,20,10,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 128, 128);

// --- ukuran lama ruangan (sebelum denah tahap 2). WALL_H dan SLAB masih dipakai dinding dan lantai di ui/03c-denah.js.
const WALL_H = 12, SLAB = 0.5;
const SKY = {
  morning: ["#F6D7B8", "#BFD7E6", 0], day: ["#9CC3DD", "#DCEAF2", 0], evening: ["#E9A27C", "#6D6A8E", 1], night: ["#1F2540", "#3B4467", 2],
};
const windows = [];
function win(g, x, z, y, w, h, onLeft, curtain) {
  const grp = new THREE.Group(); grp.position.set(x, y, z); if (onLeft) grp.rotation.y = Math.PI / 2; g.add(grp);
  const frameM = M(0xf3ede4);
  mesh(RB(w + 0.24, h + 0.24, 0.12, 0.03), frameM, 0, 0, 0.0, grp);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(w, h), F(0xffffff)); sky.position.z = 0.065; grp.add(sky); windows.push(sky);
  mesh(RB(0.06, h, 0.06, 0.02), frameM, 0, 0, 0.08, grp); mesh(RB(w, 0.06, 0.06, 0.02), frameM, 0, 0, 0.08, grp);
  mesh(RB(w + 0.5, 0.08, 0.32, 0.03), frameM, 0, -h / 2 - 0.12, 0.14, grp);
  if (curtain) {
    for (const sx of [-1, 1]) { const c = mesh(RB(0.36, h + 0.6, 0.08, 0.04), M(curtain, { roughness: 1 }), sx * (w / 2 + 0.25), -0.15, 0.2, grp); c.scale.x = 1; }
    mesh(CYL(0.025, 0.025, w + 1.1, 10), M(0x3a332d, { metalness: 0.4, roughness: 0.5 }), 0, h / 2 + 0.28, 0.22, grp).rotation.z = Math.PI / 2;
  }
}
// v44.1: langit per kulit cuaca (ui/33-weather.js): warna siang/malam, awan, garis hujan, titik salju, kilat. Tanpa cuaca = langit lama.
const WX_SKY = {
  cloud: { day: ["#A9B4BF", "#DDE3E8"], night: ["#232838", "#3A4252"], cloud: "rgba(255,255,255,.55)", n: 4 },
  rain: { day: ["#7F8A98", "#B3BCC6"], night: ["#1B2030", "#2F3648"], cloud: "rgba(90,98,110,.6)", n: 4, rain: true },
  snow: { day: ["#C9D3DC", "#EEF2F5"], night: ["#2A3040", "#4A5266"], cloud: "rgba(255,255,255,.8)", n: 3, snow: true },
  fog: { day: ["#CFD4D8", "#E6E9EC"], night: ["#2C3038", "#454A54"], cloud: "rgba(255,255,255,.35)", n: 2, fog: true },
  storm: { day: ["#4A515F", "#7A8290"], night: ["#141824", "#2A3040"], cloud: "rgba(40,44,56,.7)", n: 5, rain: true, bolt: true },
};
const skyTexCache = {};
function skyTex(period, wx) {
  const key = period + "|" + (wx || "");
  if (skyTexCache[key]) return skyTexCache[key];
  const [top0, bottom0, kind] = SKY[period], X = wx && WX_SKY[wx], night = period === "night";
  const [top, bottom] = X ? X[night ? "night" : "day"] : [top0, bottom0];
  return skyTexCache[key] = canvasTex((g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (!X && kind === 2) { g.fillStyle = "rgba(255,246,220,.9)"; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc((i * 71) % w, (i * 53) % (h * 0.8) + 6, 1 + (i % 3) * 0.7, 0, 7); g.fill(); } g.beginPath(); g.arc(w * 0.7, h * 0.3, 18, 0, 7); g.fillStyle = "#F4EBD0"; g.fill(); }
    else if (!X) { g.fillStyle = kind === 1 ? "rgba(255,210,170,.5)" : "rgba(255,255,255,.75)"; for (const [x, y, s] of [[50, 80, 1], [170, 140, 0.8]]) { g.beginPath(); g.ellipse(x, y, 40 * s, 12 * s, 0, 0, 7); g.ellipse(x + 20 * s, y - 8 * s, 26 * s, 12 * s, 0, 0, 7); g.fill(); } }
    else {
      g.fillStyle = X.cloud;
      for (let i = 0; i < X.n; i++) { const x = (i * 97 + 30) % w, y = 50 + (i * 61) % 110, s = 0.8 + (i % 3) * 0.25; g.beginPath(); g.ellipse(x, y, 46 * s, 13 * s, 0, 0, 7); g.ellipse(x + 24 * s, y - 9 * s, 30 * s, 13 * s, 0, 0, 7); g.ellipse(x - 20 * s, y - 5 * s, 24 * s, 10 * s, 0, 0, 7); g.fill(); }
      if (X.rain) { g.strokeStyle = night ? "rgba(200,210,230,.35)" : "rgba(255,255,255,.5)"; g.lineWidth = 1.5; for (let i = 0; i < 40; i++) { const x = (i * 53) % w, y = (i * 37) % h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4, y + 14); g.stroke(); } }
      if (X.snow) { g.fillStyle = "rgba(255,255,255,.9)"; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 59) % w, (i * 43) % h, 1.2 + (i % 3) * 0.6, 0, 7); g.fill(); } }
      if (X.bolt) { g.fillStyle = "#FFE28A"; g.beginPath(); g.moveTo(150, 40); g.lineTo(132, 96); g.lineTo(150, 92); g.lineTo(136, 150); g.lineTo(172, 84); g.lineTo(154, 88); g.lineTo(168, 40); g.closePath(); g.fill(); }
      if (X.fog) { g.fillStyle = night ? "rgba(70,76,90,.6)" : "rgba(225,228,232,.75)"; g.fillRect(0, h * 0.45, w, h * 0.55); }
    }
    // distant rooftops
    g.fillStyle = kind === 2 ? "#2a2f4a" : kind === 1 ? "#7b6a78" : X ? "#8f99a6" : "#a7b8c4";
    for (let i = 0; i < 6; i++) g.fillRect(i * 46, h - 30 - (i % 3) * 14, 40, 40 + (i % 3) * 14);
  }, 256, 256);
}
function plant(g, x, z, s = 1, pot = 0xc98e6b, leaf = 0x7d9470) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(s); g.add(p);
  mesh(CYL(0.3, 0.24, 0.55, 28), M(pot), 0, 0.275, 0, p); mesh(CYL(0.28, 0.28, 0.03, 24), M(0x4a3a2c), 0, 0.54, 0, p);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, l = 0.55 + (i % 3) * 0.2;
    const lf = mesh(SPH(0.16, 14, 10), M(shade(leaf, 0.85 + (i % 3) * 0.1)), Math.cos(a) * 0.18, 0.75 + l * 0.6, Math.sin(a) * 0.18, p);
    lf.scale.set(0.7, 1.9, 0.25); lf.rotation.set(Math.sin(a) * 0.6, a, Math.cos(a) * 0.6);
  }
  return p;
}
function lampLight(g, x, y, z, strength = 1) {
  const l = new THREE.PointLight(0xffc68a, 0, 7, 1.6); l.position.set(x, y, z); g.add(l);
  (g.userData.lamps = g.userData.lamps || []).push({ l, strength });
  return l;
}
const glowM = () => M(0xfff1d6, { emissive: 0xffd9a0, emissiveIntensity: 0.6 });

function highShelf(g, x, y, items, z0 = 0) {
  mesh(RB(1.8, 0.06, 0.34, 0.02), M(0xc9a27a, { roughness: 0.7 }), x, y, z0, g);
  items.forEach(([col, kind], i) => {
    const ix = x - 0.6 + i * 0.6, z = z0 + 0.01;
    if (kind === "jar") mesh(CYL(0.12, 0.12, 0.3, 18), M(col, { roughness: 0.4 }), ix, y + 0.18, z, g);
    else if (kind === "pot") mesh(SPH(0.17, 18, 12), M(col, { roughness: 0.5 }), ix, y + 0.17, z, g).scale.y = 0.9;
    else if (kind === "plate") { const p = mesh(CYL(0.22, 0.22, 0.03, 24), M(col), ix, y + 0.24, z - 0.06, g); p.rotation.x = Math.PI / 2 - 0.2; }
    else if (kind === "books") for (let k = 0; k < 4; k++) mesh(RB(0.08, 0.3 + (k % 2) * 0.06, 0.24, 0.01), M([0xb86f52, 0x6d7790, col, 0x8fa287][k]), ix - 0.15 + k * 0.1, y + 0.18 + (k % 2) * 0.03, z, g);
    else if (kind === "plant") { const p = plant(g, ix, z, 0.45, 0xe9dfcf, col); p.position.y = y + 0.03; }
  });
}
// ruangan rumah: dibangun dari denah (ui/03c-denah.js). Isi: { name, action, act, bg, g, ... }
const ROOMS = [];
const wood = 0xa47a55, cream = 0xf3ede4, ink = 0x3a332d, brass = 0xb8945a;

// --- light that follows the player's real clock
const PERIODS = {
  morning: { env: 0.55, sun: 0xffcfa3, sunI: 1.15, hemi: 0.38, lamp: 0.2, exp: 0.9, pos: [-6, 6, 5], tint: ["#F3E3D0", "#DCC7B0"] },
  day: { env: 0.6, sun: 0xffeedb, sunI: 1.25, hemi: 0.4, lamp: 0.0, exp: 0.9, pos: [-3, 10, 6], tint: null },
  evening: { env: 0.45, sun: 0xffa86e, sunI: 1.1, hemi: 0.28, lamp: 1.3, exp: 0.92, pos: [-7, 4.5, 3], tint: ["#E8CDB8", "#A99098"] },
  night: { env: 0.28, sun: 0x9fb0d9, sunI: 0.35, hemi: 0.14, lamp: 2.6, exp: 0.95, pos: [-4, 8, 6], tint: ["#3B4158", "#232738"] },
};
const periodOf = (h = new Date().getHours()) => h >= 5 && h < 10 ? "morning" : h < 16 ? (h >= 10 ? "day" : "night") : h < 20 ? "evening" : "night";
let LIT = PERIODS.day, litName = "", litKey = "";
function applyLight(force) {
  const p = periodOf(), wx = typeof WX === "string" ? WX : null, key = p + "|" + (wx || "");
  if (key === litKey && !force) return;
  litName = p; litKey = key; LIT = PERIODS[p];
  sun.color.setHex(LIT.sun); sun.position.set(...LIT.pos); renderer.toneMappingExposure = LIT.exp;
  windows.forEach(w => { w.material.map = skyTex(p, wx); w.material.needsUpdate = true; });
  scene.traverse(envScale);
  paintBg();
}
// the reflected room light fades at night so the lamps carry the room
function envScale(o) {
  const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  for (const m of ms) if (m.isMeshStandardMaterial) { if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; m.envMapIntensity = m.userData.env0 * LIT.env; }
}
// v75: langit kota (di luar rumah): gradasi atas → cakrawala, ikut jam dan cuaca asli. Kabut kota pakai warna cakrawala.
const TOWN_SKY = { morning: ["#E9C3A6", "#F3E1CE"], day: ["#9DC0DA", "#DDE7EC"], evening: ["#6F638A", "#E2AE8C"], night: ["#10152A", "#262C44"] };
function townSky() {
  const p = litName || "day", X = typeof WX === "string" && WX !== "clear" ? WX_SKY[WX] : null;
  if (!X) return TOWN_SKY[p];
  const n = p === "night", c = X[n ? "night" : "day"];
  return p === "evening" || p === "morning" ? [artShade(c[0], 0.82), artShade(c[1], 0.86)] : c;
}
function paintBg() {
  if (app.classList.contains("in-town") && !app.classList.contains("in-globe")) {
    const [a, b] = townSky(), stars = litName === "night" && (typeof WX !== "string" || WX === "clear");
    const dots = stars ? "radial-gradient(1.2px 1.2px at 23px 31px, #fff 60%, transparent), radial-gradient(1px 1px at 141px 77px, #dfe6ff 60%, transparent), radial-gradient(1.4px 1.4px at 87px 143px, #fff 60%, transparent), radial-gradient(1px 1px at 189px 18px, #fff 60%, transparent), " : "";
    app.style.background = `${dots}linear-gradient(180deg, ${a} 0%, ${b} 42%, ${b} 100%)`;
    if (stars) app.style.backgroundSize = "211px 167px, 173px 199px, 229px 181px, 197px 223px, auto";
    else app.style.backgroundSize = "";
    document.body.style.background = b; app.classList.toggle("night", litName === "night");
    return;
  }
  app.style.backgroundSize = "";
  // v44.1: latar sedikit mengabu saat cuaca mendung/hujan (kulit saja)
  const X = typeof WX === "string" && WX !== "clear" ? WX_SKY[WX] : null, r = ROOMS[roomIx] || ROOMS[0], t0 = LIT.tint || r.bg, t = X ? [artShade(t0[0], 0.92), artShade(t0[1], 0.9)] : t0;
  app.style.background = `radial-gradient(120% 80% at 50% 40%, ${t[0]} 0%, ${t[1]} 100%)`;
  document.body.style.background = t[1]; app.classList.toggle("night", litName === "night");
}


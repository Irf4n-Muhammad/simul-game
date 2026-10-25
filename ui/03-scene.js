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

// --- the room box: floor slab plus back and left walls, open toward the camera
// The camera faces the creature straight on, so the room is a box open toward the viewer:
// back wall, two side walls and a floor that runs past the bottom of the screen.
const R0 = -3.6, R1 = 2.8, FRONT = 9, WALL_H = 12, SLAB = 0.5;
const ROOM_C = (R0 + R1) / 2, ROOM_S = R1 - R0, DEPTH = FRONT - R0, DEPTH_C = (R0 + FRONT) / 2;
function shell(g, wall, floor, edge, trim) {
  const ft = floor.clone(); ft.needsUpdate = true; ft.repeat.set(3, 3 * DEPTH / ROOM_S);
  const fl = mesh(new THREE.BoxGeometry(ROOM_S, SLAB, DEPTH), [M(edge), M(edge), TM(ft), M(edge), M(edge), M(edge)], ROOM_C, -SLAB / 2, DEPTH_C, g);
  fl.castShadow = false;
  const wt = 0.25;
  const back = mesh(new THREE.BoxGeometry(ROOM_S + 2 * wt, WALL_H, wt), [M(trim), M(trim), M(trim), M(trim), TM(wall), M(trim)], ROOM_C, WALL_H / 2, R0 - wt / 2, g);
  const lt = wall.clone(); lt.needsUpdate = true; lt.repeat.set(2 * DEPTH / ROOM_S, 1);
  const sideM = TM(lt, { color: 0xe9e1d6 }), trimM = M(trim);
  const left = mesh(new THREE.BoxGeometry(wt, WALL_H, DEPTH), [sideM, trimM, trimM, trimM, trimM, trimM], R0 - wt / 2, WALL_H / 2, DEPTH_C, g);
  const right = mesh(new THREE.BoxGeometry(wt, WALL_H, DEPTH), [trimM, sideM, trimM, trimM, trimM, trimM], R1 + wt / 2, WALL_H / 2, DEPTH_C, g);
  back.castShadow = left.castShadow = right.castShadow = false;
  // the closet can re-tint these: walls keep their paper, the floor swaps to a plain color (see applyHome)
  g.userData.shell = { walls: [back.material[4], sideM], floor: fl.material[2] };
  for (const mm of [back.material[4], sideM, fl.material[2]]) { mm.userData.color0 = mm.color.getHex(); mm.userData.map0 = mm.map; }
  const a3 = mesh(new THREE.PlaneGeometry(DEPTH, 0.9), F(0xffffff, { map: aoTex, transparent: true, depthWrite: false }), R1 - 0.45, 0.013, DEPTH_C, g); a3.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  mesh(RB(0.06, 0.22, DEPTH, 0.02), M(trim), R1 - 0.03, 0.11, DEPTH_C, g);
  // soft dark band where walls meet the floor
  const ao = F(0xffffff, { map: aoTex, transparent: true, depthWrite: false });
  const a1 = mesh(new THREE.PlaneGeometry(ROOM_S, 0.9), ao, ROOM_C, 0.012, R0 + 0.45, g); a1.rotation.x = -Math.PI / 2;
  const a2 = mesh(new THREE.PlaneGeometry(DEPTH, 0.9), ao, R0 + 0.45, 0.013, DEPTH_C, g); a2.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
  mesh(RB(ROOM_S, 0.22, 0.06, 0.02), M(trim), ROOM_C, 0.11, R0 + 0.03, g);
  mesh(RB(0.06, 0.22, DEPTH, 0.02), M(trim), R0 + 0.03, 0.11, DEPTH_C, g);
}
// walls and floor picked in the closet, in every room; without a pick each room goes back to its own paper
function applyHome() {
  const C = globalThis.Cosmetics, H = C && state ? C.homeLook(state) : {}, w = H.dinding && C.item(H.dinding), f = H.lantai && C.item(H.lantai);
  for (const r of ROOMS) {
    const S = r.g.userData.shell; if (!S) continue;
    for (const mm of S.walls) { if (w) mm.color.setHex(w.look.color).convertSRGBToLinear(); else mm.color.setHex(mm.userData.color0); }
    const fm = S.floor; fm.map = f ? null : fm.userData.map0; if (f) fm.color.setHex(f.look.color).convertSRGBToLinear(); else fm.color.setHex(fm.userData.color0); fm.needsUpdate = true;
  }
}
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
const skyTexCache = {};
function skyTex(period) {
  if (skyTexCache[period]) return skyTexCache[period];
  const [top, bottom, kind] = SKY[period];
  return skyTexCache[period] = canvasTex((g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (kind === 2) { g.fillStyle = "rgba(255,246,220,.9)"; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc((i * 71) % w, (i * 53) % (h * 0.8) + 6, 1 + (i % 3) * 0.7, 0, 7); g.fill(); } g.beginPath(); g.arc(w * 0.7, h * 0.3, 18, 0, 7); g.fillStyle = "#F4EBD0"; g.fill(); }
    else { g.fillStyle = kind === 1 ? "rgba(255,210,170,.5)" : "rgba(255,255,255,.75)"; for (const [x, y, s] of [[50, 80, 1], [170, 140, 0.8]]) { g.beginPath(); g.ellipse(x, y, 40 * s, 12 * s, 0, 0, 7); g.ellipse(x + 20 * s, y - 8 * s, 26 * s, 12 * s, 0, 0, 7); g.fill(); } }
    // distant rooftops
    g.fillStyle = kind === 2 ? "#2a2f4a" : kind === 1 ? "#7b6a78" : "#a7b8c4";
    for (let i = 0; i < 6; i++) g.fillRect(i * 46, h - 30 - (i % 3) * 14, 40, 40 + (i % 3) * 14);
  }, 256, 256);
}
function wallArt(g, x, z, y, w, h, onLeft, draw, col = 0x3a332d) {
  const grp = new THREE.Group(); grp.position.set(x, y, z); if (onLeft) grp.rotation.y = Math.PI / 2; g.add(grp);
  mesh(RB(w + 0.12, h + 0.12, 0.06, 0.02), M(col, { roughness: 0.6 }), 0, 0, 0, grp);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M(0xffffff, { map: canvasTex((c, cw, ch) => { c.fillStyle = "#EFE6D8"; c.fillRect(0, 0, cw, ch); draw(c, cw, ch); noise(c, cw, ch, 0.04, 300); }, 128, 128) }));
  p.position.z = 0.035; grp.add(p);
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

function highShelf(g, x, y, items) {
  mesh(RB(1.8, 0.06, 0.34, 0.02), M(0xc9a27a, { roughness: 0.7 }), x, y, R0 + 0.17, g);
  items.forEach(([col, kind], i) => {
    const ix = x - 0.6 + i * 0.6, z = R0 + 0.18;
    if (kind === "jar") mesh(CYL(0.12, 0.12, 0.3, 18), M(col, { roughness: 0.4 }), ix, y + 0.18, z, g);
    else if (kind === "pot") mesh(SPH(0.17, 18, 12), M(col, { roughness: 0.5 }), ix, y + 0.17, z, g).scale.y = 0.9;
    else if (kind === "plate") { const p = mesh(CYL(0.22, 0.22, 0.03, 24), M(col), ix, y + 0.24, z - 0.06, g); p.rotation.x = Math.PI / 2 - 0.2; }
    else if (kind === "books") for (let k = 0; k < 4; k++) mesh(RB(0.08, 0.3 + (k % 2) * 0.06, 0.24, 0.01), M([0xb86f52, 0x6d7790, col, 0x8fa287][k]), ix - 0.15 + k * 0.1, y + 0.18 + (k % 2) * 0.03, z, g);
    else if (kind === "plant") { const p = plant(g, ix, z, 0.45, 0xe9dfcf, col); p.position.y = y + 0.03; }
  });
}
function hangPlant(g, x, z) {
  mesh(CYL(0.008, 0.008, 2.6, 4), M(0x3a332d), x, 6.3, z, g);
  mesh(SPH(0.26, 20, 14), M(0xd8c3a5, { roughness: 1 }), x, 5.0, z, g).scale.y = 0.8;
  for (let i = 0; i < 7; i++) { const a = i * 0.9; const l = mesh(SPH(0.1, 10, 8), M(0x6f8a68), x + Math.cos(a) * 0.25, 4.85 - (i % 3) * 0.25, z + Math.sin(a) * 0.25, g); l.scale.set(0.8, 2.2, 0.3); }
}
const ROOMS = [];
function room(name, action, act, bg, build) {
  const g = new THREE.Group(); scene.add(g); g.visible = false; build(g);
  ROOMS.push({ name, action, act, bg, g });
}
const wood = 0xa47a55, oat = 0xe7dccb, cream = 0xf3ede4, ink = 0x3a332d, brass = 0xb8945a;
room("Kitchen", "Feed", "makan", ["#EFE4D2", "#D9C9B0"], g => {
  shell(g, wallTex(0xeee4d4, 0x9dae95, "panel"), floorTex("terra", 0xc58b67, 0xb47657), 0x8c6a4f, cream);
  win(g, -0.6, R0 + 0.06, 2.9, 1.5, 1.2, false, 0xd8c7ae);
  // counter along the back wall
  const c = new THREE.Group(); c.position.set(-1.9, 0, R0 + 0.55); g.add(c);
  mesh(RB(2.6, 1.2, 1.0, 0.04), M(0x8fa287), 0, 0.6, 0, c);
  mesh(RB(2.75, 0.1, 1.08, 0.03), M(0xc9a27a, { roughness: 0.6 }), 0, 1.25, 0.02, c);
  for (const dx of [-0.88, 0, 0.88]) { mesh(RB(0.8, 1.0, 0.04, 0.02), M(0x9bb093), dx, 0.58, 0.51, c); mesh(RB(0.22, 0.03, 0.03, 0.01), M(brass, { metalness: 0.7, roughness: 0.35 }), dx, 0.98, 0.55, c); }
  mesh(CYL(0.32, 0.28, 0.32, 28), M(0xc8674f, { roughness: 0.5 }), 0.7, 1.46, 0.05, c); mesh(CYL(0.34, 0.34, 0.04, 28), M(0xb25a44), 0.7, 1.64, 0.05, c);
  mesh(RB(0.55, 0.04, 0.38, 0.02), M(0xd8b48c), -0.6, 1.32, 0.1, c);
  // open shelf with jars
  mesh(RB(2.3, 0.06, 0.32, 0.02), M(0xc9a27a), -1.9, 2.45, R0 + 0.17, g);
  [[0xe9dfcf, 0.3], [0xc8674f, 0.24], [0x9dae95, 0.34], [cream, 0.26]].forEach(([col, hh], i) => mesh(CYL(0.12, 0.12, hh, 18), M(col, { roughness: 0.4 }), -2.8 + i * 0.5, 2.48 + hh / 2, R0 + 0.17, g));
  // retro fridge on the left wall
  mesh(RB(1.0, 2.4, 0.95, 0.18), M(0xefe6d6, { roughness: 0.45 }), R0 + 0.55, 1.2, 0.35, g);
  mesh(RB(0.06, 0.5, 0.06, 0.02), M(brass, { metalness: 0.7, roughness: 0.35 }), R0 + 1.07, 1.75, 0.0, g);
  // small table with fruit
  const t = new THREE.Group(); t.position.set(1.7, 0, -1.9); g.add(t);
  mesh(CYL(0.6, 0.6, 0.06, 36), M(0xc9a27a, { roughness: 0.6 }), 0, 1.05, 0, t); mesh(CYL(0.05, 0.07, 1.0, 12), M(ink), 0, 0.52, 0, t); mesh(CYL(0.3, 0.32, 0.04, 24), M(ink), 0, 0.02, 0, t);
  mesh(CYL(0.28, 0.18, 0.14, 24), M(cream), 0, 1.15, 0, t);
  [[0xd9893f, -0.08, 0], [0xc0504d, 0.1, 0.06], [0xa3b36a, 0, -0.1]].forEach(([col, x, z]) => mesh(SPH(0.11, 16, 12), M(col, { roughness: 0.5 }), x, 1.27, z, t));
  plant(g, 2.2, R0 + 0.5, 1.1);
  // pendant lamp
  mesh(CYL(0.012, 0.012, 1.4, 6), M(ink), 0.2, 4.1, -0.6, g);
  mesh(new THREE.ConeGeometry(0.38, 0.32, 32, 1, true), M(ink, { side: THREE.DoubleSide, metalness: 0.3, roughness: 0.5 }), 0.2, 3.3, -0.6, g);
  mesh(SPH(0.1, 12, 10), glowM(), 0.2, 3.18, -0.6, g); lampLight(g, 0.2, 3.0, -0.6, 1.2);
  wallArt(g, R0 + 0.04, -1.6, 2.9, 0.7, 0.9, true, (c) => { c.fillStyle = "#C8674F"; c.beginPath(); c.arc(64, 72, 30, 0, 7); c.fill(); c.fillStyle = "#7D9470"; c.fillRect(60, 22, 8, 22); });
  const rug = mesh(RB(1.8, 0.02, 1.2, 0.01), M(0xd8c3a5, { roughness: 1 }), 0.1, 0.01, 0.8, g); rug.castShadow = false;
  highShelf(g, 1.5, 4.3, [[0xe9dfcf, "jar"], [0x9dae95, "jar"], [0xc8674f, "pot"]]);
  wallArt(g, -2.2, R0 + 0.04, 4.6, 0.8, 1.0, false, (c) => { c.fillStyle = "#9DAE95"; c.fillRect(20, 20, 88, 88); c.fillStyle = "#EEE4D4"; c.beginPath(); c.arc(64, 64, 26, 0, 7); c.fill(); });
});
room("Bathroom", "Wash", "mandi", ["#E3E8EA", "#C5CFD3"], g => {
  shell(g, wallTex(0xf0ebe3, 0x9fb2bc, "tile"), floorTex("terrazzo", 0xe6e0d6, 0x9a8f84), 0x8f8a84, cream);
  // clawfoot tub along the left wall
  const tb = new THREE.Group(); tb.position.set(-2.2, 0, R0 + 0.75); tb.rotation.y = Math.PI / 2; g.add(tb);
  mesh(RB(1.2, 0.85, 2.3, 0.4), M(0xf7f3ec, { roughness: 0.35 }), 0, 0.68, 0, tb);
  mesh(RB(1.0, 0.06, 2.05, 0.03), M(0xa9c4cf, { roughness: 0.1, transparent: true, opacity: 0.85 }), 0, 1.0, 0, tb);
  for (const [x, z] of [[-0.42, 0.9], [0.42, 0.9], [-0.42, -0.9], [0.42, -0.9]]) mesh(SPH(0.09, 12, 10), M(brass, { metalness: 0.8, roughness: 0.3 }), x, 0.12, z, tb);
  for (let i = 0; i < 7; i++) mesh(SPH(0.14 + (i % 3) * 0.05, 16, 12), M(0xffffff, { roughness: 0.3 }), -0.2 + (i % 3) * 0.2, 1.08, -0.6 + i * 0.2, tb);
  mesh(CYL(0.03, 0.03, 0.7, 10), M(brass, { metalness: 0.8, roughness: 0.3 }), 0, 1.35, -1.08, tb);
  // pedestal sink with round mirror on the back wall
  const sk = new THREE.Group(); sk.position.set(1.6, 0, R0 + 0.4); g.add(sk);
  mesh(CYL(0.14, 0.2, 1.2, 20), M(0xf7f3ec, { roughness: 0.35 }), 0, 0.6, 0, sk); mesh(RB(0.9, 0.22, 0.6, 0.1), M(0xf7f3ec, { roughness: 0.35 }), 0, 1.25, 0.05, sk);
  mesh(CYL(0.025, 0.025, 0.25, 10), M(brass, { metalness: 0.8, roughness: 0.3 }), 0, 1.45, -0.18, sk);
  const mir = new THREE.Group(); mir.position.set(1.6, 2.5, R0 + 0.04); g.add(mir);
  mesh(new THREE.TorusGeometry(0.5, 0.04, 12, 48), M(brass, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0, mir);
  mesh(new THREE.CircleGeometry(0.48, 40), M(0xdfe7ea, { roughness: 0.05, metalness: 0.9 }), 0, 0, 0.0, mir);
  // towel and plant
  mesh(CYL(0.02, 0.02, 0.9, 8), M(brass, { metalness: 0.8, roughness: 0.3 }), -0.3, 2.2, R0 + 0.1, g).rotation.z = Math.PI / 2;
  mesh(RB(0.65, 0.95, 0.06, 0.03), M(0xd6b8a3, { roughness: 1 }), -0.3, 1.75, R0 + 0.14, g);
  plant(g, 2.35, -1.6, 0.95, 0xe6e0d6, 0x6f8a68);
  // candle
  mesh(CYL(0.08, 0.08, 0.2, 16), M(cream), -1.2, 1.45, R0 + 0.75, g); mesh(SPH(0.035, 8, 6), F(0xffd08a), -1.2, 1.6, R0 + 0.75, g); lampLight(g, -1.2, 1.9, R0 + 1.0, 0.6);
  const mat = mesh(RB(1.1, 0.02, 0.7, 0.01), M(0xb7c5c0, { roughness: 1 }), -0.2, 0.01, 0.9, g); mat.castShadow = false;
  // duck
  const dk = new THREE.Group(); dk.position.set(1.7, 0, 1.6); dk.rotation.y = -0.6; g.add(dk);
  mesh(SPH(0.22, 20, 14), M(0xe8c35a, { roughness: 0.4 }), 0, 0.17, 0, dk).scale.set(1.1, 0.75, 1.3);
  mesh(SPH(0.14, 16, 12), M(0xe8c35a, { roughness: 0.4 }), 0, 0.4, 0.14, dk); mesh(new THREE.ConeGeometry(0.05, 0.12, 10), M(0xd9893f), 0, 0.38, 0.3, dk).rotation.x = Math.PI / 2;
  highShelf(g, -1.6, 4.2, [[0xf3ede4, "jar"], [0xa9c4cf, "jar"], [0x7d9470, "plant"]]);
  hangPlant(g, 0.6, R0 + 0.6);
});
room("Bedroom", "Sleep", "tidur", ["#DCD6DE", "#B9B0BF"], g => {
  shell(g, wallTex(0x8e97a8, 0x6d7790, "plain"), floorTex("planks", 0xb48a64, 0x9c7552), 0x7a5a41, 0xe9e2d6);
  win(g, -1.7, R0 + 0.06, 2.9, 1.3, 1.3, false, 0xcbb8a0);
  // bed against the back wall
  const b = new THREE.Group(); b.position.set(1.55, 0, R0 + 1.25); g.add(b);
  mesh(RB(2.2, 0.45, 2.4, 0.06), M(wood), 0, 0.3, 0, b);
  mesh(RB(2.1, 0.35, 2.3, 0.15), M(0xf2ede4), 0, 0.68, 0, b);
  mesh(RB(2.22, 0.22, 1.5, 0.12), M(0xe2d5c0, { roughness: 1 }), 0, 0.88, 0.42, b);
  mesh(RB(2.24, 0.06, 0.55, 0.03), M(0xb86f52, { roughness: 1 }), 0, 1.0, 0.9, b);
  for (const sx of [-0.5, 0.5]) mesh(RB(0.85, 0.24, 0.45, 0.12), M(0xf7f2ea), sx, 0.98, -0.85, b);
  mesh(RB(2.35, 1.5, 0.12, 0.06), M(wood), 0, 0.95, -1.18, b);
  // nightstand + lamp
  const n = new THREE.Group(); n.position.set(-0.15, 0, R0 + 0.45); g.add(n);
  mesh(RB(0.7, 0.75, 0.6, 0.04), M(wood), 0, 0.375, 0, n); mesh(RB(0.55, 0.02, 0.02, 0.01), M(shade(wood, 0.7)), 0, 0.5, 0.31, n);
  mesh(CYL(0.1, 0.14, 0.35, 16), M(0xc8674f, { roughness: 0.5 }), 0, 0.93, 0, n);
  const shadeMesh = mesh(CYL(0.16, 0.26, 0.3, 24, 1), M(0xf3e6cf, { emissive: 0xffc98a, emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 1 }), 0, 1.25, 0, n);
  g.userData.shade = shadeMesh; lampLight(g, -0.15, 1.5, R0 + 0.6, 1.5);
  // bookshelf on the left wall
  const sh = new THREE.Group(); sh.position.set(R0 + 0.3, 0, -1.4); sh.rotation.y = Math.PI / 2; g.add(sh);
  for (const sx of [-1, 1]) mesh(RB(0.06, 1.9, 0.45, 0.02), M(wood), sx * 0.6, 0.95, 0, sh);
  for (const y of [0.03, 0.65, 1.25, 1.87]) mesh(RB(1.26, 0.06, 0.45, 0.02), M(wood), 0, y, 0, sh);
  const bk = [0xb86f52, 0x8fa287, 0xd9b36c, 0x6d7790, 0xe2d5c0, 0x9c7f9a];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) { const hh = 0.38 + ((i * 3 + row) % 4) * 0.05; mesh(RB(0.12, hh, 0.34, 0.01), M(bk[(i + row * 2) % 6]), -0.48 + i * 0.15, 0.06 + row * 0.62 + hh / 2, 0, sh); }
  mesh(SPH(0.14, 16, 12), M(0x9dae95), 0.2, 1.42, 0, sh);
  // rug and plush
  const rug = mesh(CYL(1.25, 1.25, 0.02, 48), M(0xb86f52, { roughness: 1 }), 0.1, 0.01, 0.6, g); rug.scale.z = 0.75; rug.castShadow = false;
  const pl = new THREE.Group(); pl.position.set(1.9, 0, 1.4); pl.rotation.y = -0.7; g.add(pl);
  mesh(SPH(0.26, 20, 14), M(0xc9a27a, { roughness: 1 }), 0, 0.26, 0, pl).scale.set(1, 0.95, 0.85); mesh(SPH(0.2, 20, 14), M(0xc9a27a, { roughness: 1 }), 0, 0.62, 0, pl);
  for (const sx of [-1, 1]) { mesh(SPH(0.08, 12, 8), M(0xc9a27a, { roughness: 1 }), sx * 0.13, 0.79, 0, pl); mesh(SPH(0.022, 8, 6), M(ink), sx * 0.07, 0.65, 0.18, pl); }
  highShelf(g, 1.5, 4.4, [[0xd9b36c, "books"], [0x9dae95, "plant"], [cream, "jar"]]);
  wallArt(g, 1.55, R0 + 0.04, 2.75, 1.1, 0.75, false, (c) => { c.fillStyle = "#6D7790"; c.fillRect(0, 70, 128, 58); c.fillStyle = "#D9B36C"; c.beginPath(); c.arc(84, 50, 16, 0, 7); c.fill(); c.fillStyle = "#8FA287"; c.beginPath(); c.moveTo(0, 90); c.lineTo(40, 55); c.lineTo(80, 90); c.fill(); });
});
room("Playroom", "Play", "peluk", ["#EDE5D8", "#D6C8B4"], g => {
  shell(g, wallTex(0xe9dfcf, 0xd2b48a, "panel"), floorTex("planks", 0xd2b48f, 0xc3a27b), 0x8c6a4f, cream);
  const rug = mesh(CYL(1.6, 1.6, 0.02, 56), M(0xd9b36c, { roughness: 1 }), 0, 0.01, 0.2, g); rug.castShadow = false;
  mesh(CYL(1.2, 1.2, 0.022, 56), M(0xe3c487, { roughness: 1 }), 0, 0.012, 0.2, g).castShadow = false;
  // low toy shelf on the back wall
  const sh = new THREE.Group(); sh.position.set(-1.6, 0, R0 + 0.35); g.add(sh);
  mesh(RB(2.2, 0.06, 0.55, 0.02), M(cream), 0, 0.03, 0, sh); mesh(RB(2.2, 0.06, 0.55, 0.02), M(cream), 0, 0.75, 0, sh); mesh(RB(2.2, 0.06, 0.55, 0.02), M(cream), 0, 1.45, 0, sh);
  for (const sx of [-1.07, 0, 1.07]) mesh(RB(0.06, 1.48, 0.55, 0.02), M(cream), sx, 0.74, 0, sh);
  const toyC = [0xb86f52, 0x8fa287, 0x7e9cb3, 0xd9b36c];
  for (let i = 0; i < 3; i++) mesh(RB(0.28, 0.28, 0.28, 0.04), M(toyC[i]), -0.8 + i * 0.3, 0.2, 0, sh);
  mesh(SPH(0.22, 20, 14), M(0xb86f52), 0.55, 0.28, 0, sh); mesh(new THREE.ConeGeometry(0.17, 0.45, 18), M(0x7e9cb3), -0.55, 1.0, 0, sh);
  mesh(RB(0.4, 0.3, 0.3, 0.06), M(0xe2d5c0), 0.5, 0.93, 0, sh);
  for (let i = 0; i < 4; i++) mesh(RB(0.1, 0.42, 0.3, 0.01), M(toyC[(i + 1) % 4]), -0.75 + i * 0.12, 1.69, 0, sh);
  // play tent in the corner
  const tn = new THREE.Group(); tn.position.set(R0 + 0.95, 0, R0 + 2.4); tn.rotation.y = 0.6; g.add(tn);
  mesh(new THREE.ConeGeometry(0.85, 2.1, 5, 1, true), M(0xf1e7d6, { side: THREE.DoubleSide, roughness: 1 }), 0, 1.05, 0, tn);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const s = mesh(CYL(0.02, 0.02, 2.5, 6), M(wood), Math.cos(a) * 0.5, 1.15, Math.sin(a) * 0.5, tn); s.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); }
  // beanbag and ball
  const bb = mesh(SPH(0.75, 32, 24), M(0x8c8b5e, { roughness: 1 }), 1.7, 0.42, -1.9, g); bb.scale.set(1.1, 0.62, 1);
  const ball = mesh(SPH(0.32), M(0x7e9cb3, { roughness: 0.55 }), 1.5, 0.32, 1.3, g);
  mesh(new THREE.TorusGeometry(0.322, 0.035, 8, 40), M(0xf3ede4), 0, 0, 0, ball);
  g.userData.ball = ball; g.userData.ballHome = ball.position.clone();
  // garland
  for (let i = 0; i < 7; i++) { const f = mesh(new THREE.ConeGeometry(0.16, 0.34, 3), M(toyC[i % 4], { roughness: 1 }), -3.1 + i * 0.75, 3.7 - Math.sin(i / 6 * Math.PI) * 0.35, R0 + 0.1, g); f.rotation.x = Math.PI; f.scale.z = 0.25; }
  wallArt(g, 1.4, R0 + 0.04, 2.6, 0.9, 0.9, false, (c) => { c.fillStyle = "#D9B36C"; c.beginPath(); c.arc(40, 40, 16, 0, 7); c.fill(); c.fillStyle = "#8FA287"; c.fillRect(0, 96, 128, 32); c.fillStyle = "#B86F52"; c.fillRect(54, 62, 30, 34); c.beginPath(); c.moveTo(48, 62); c.lineTo(69, 44); c.lineTo(90, 62); c.fill(); });
  mesh(SPH(0.09, 12, 10), glowM(), R0 + 0.15, 3.2, 1.2, g); lampLight(g, R0 + 0.4, 3.0, 1.2, 1.0);
  wallArt(g, -0.4, R0 + 0.04, 4.7, 1.0, 0.75, false, (c) => { c.fillStyle = "#7E9CB3"; c.beginPath(); c.arc(64, 70, 30, Math.PI, 0); c.fill(); c.fillStyle = "#B86F52"; c.beginPath(); c.arc(64, 70, 18, Math.PI, 0); c.fill(); }, 0xc9a27a);
});

// --- light that follows the player's real clock
const PERIODS = {
  morning: { env: 0.55, sun: 0xffcfa3, sunI: 1.15, hemi: 0.38, lamp: 0.2, exp: 0.9, pos: [-6, 6, 5], tint: ["#F3E3D0", "#DCC7B0"] },
  day: { env: 0.6, sun: 0xffeedb, sunI: 1.25, hemi: 0.4, lamp: 0.0, exp: 0.9, pos: [-3, 10, 6], tint: null },
  evening: { env: 0.45, sun: 0xffa86e, sunI: 1.1, hemi: 0.28, lamp: 1.3, exp: 0.92, pos: [-7, 4.5, 3], tint: ["#E8CDB8", "#A99098"] },
  night: { env: 0.28, sun: 0x9fb0d9, sunI: 0.35, hemi: 0.14, lamp: 2.6, exp: 0.95, pos: [-4, 8, 6], tint: ["#3B4158", "#232738"] },
};
const periodOf = (h = new Date().getHours()) => h >= 5 && h < 10 ? "morning" : h < 16 ? (h >= 10 ? "day" : "night") : h < 20 ? "evening" : "night";
let LIT = PERIODS.day, litName = "";
function applyLight(force) {
  const p = periodOf();
  if (p === litName && !force) return;
  litName = p; LIT = PERIODS[p];
  sun.color.setHex(LIT.sun); sun.position.set(...LIT.pos); renderer.toneMappingExposure = LIT.exp;
  windows.forEach(w => { w.material.map = skyTex(p); w.material.needsUpdate = true; });
  scene.traverse(envScale);
  paintBg();
}
// the reflected room light fades at night so the lamps carry the room
function envScale(o) {
  const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  for (const m of ms) if (m.isMeshStandardMaterial) { if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; m.envMapIntensity = m.userData.env0 * LIT.env; }
}
function paintBg() {
  const r = ROOMS[roomIx] || ROOMS[0], t = LIT.tint || r.bg;
  app.style.background = `radial-gradient(120% 80% at 50% 40%, ${t[0]} 0%, ${t[1]} 100%)`;
  document.body.style.background = t[1]; app.classList.toggle("night", litName === "night");
}


// ---- Kart cup (v83, diskusi 9 Nov: "bikin satu game serius, mirip kart racing"): balapan kart 3D pertama di Games.
// Lu lawan 4 CPU (Kiko, Bolt, Mimi, Pip) di satu sirkuit, 3 lap. Kontrol satu jempol: geser kiri-kanan buat belok,
// tahan belokan tajam = drift (percikan biru → oranye → ungu), lepas jari = turbo. Ketuk = pakai item.
// Item dari kotak "?" di lintasan (turbo, bola pantul, tumpahan oli, lebah pengejar, perisai), makin di belakang makin bagus itemnya. Koin di lintasan = skor + sedikit kecepatan.
// Skor: koin +1, kena-in lawan +2, posisi akhir (1st +12, 2nd +8, 3rd +5, 4th +3, 5th +1).
// Adegan 3D punya renderer sendiri (dibikin sekali, dipakai ulang). Kanvas 2D game (mgCv) jadi HUD di atasnya.
// Nanti kalau ada server, kursi CPU diisi teman (pola sama kayak Quiz rush).
const KT_N = 900, KT_HW = 7, KT_WALL = 15, KT_LAPS = 3;
const KT_PTS = [12, 8, 5, 3, 1];
const KT_ORD = ["1st", "2nd", "3rd", "4th", "5th"];
// watak CPU: v = kecepatan dasar, wob = goyang di jalur, brake = ngerem di tikungan, aim = suka nembak item
const KT_CPU = [
  { name: "Kiko", col: "#E8506A", v: 30.75, wob: 1.8, brake: 1.0, aim: 0.6, lane: -2 },
  { name: "Bolt", col: "#4A7BE0", v: 30.15, wob: 0.5, brake: 0.75, aim: 0.4, lane: 1.5 },
  { name: "Mimi", col: "#F3A93C", v: 29.55, wob: 0.8, brake: 0.35, aim: 0.3, lane: 0 },
  { name: "Pip", col: "#3FA34D", v: 30.35, wob: 1.2, brake: 0.8, aim: 0.9, lane: -1 },
];
const KT_ITEM = { turbo: "🚀", ball: "🥎", goo: "🛢️", bee: "🐝", shield: "🛡️" };
// bobot item per posisi (0 = paling depan): yang depan dapet alat bertahan, yang belakang dapet alat ngejar
const KT_ODDS = [
  { goo: 4, ball: 3, shield: 3, turbo: 1 },
  { ball: 3, goo: 2, shield: 2, turbo: 2, bee: 1 },
  { ball: 3, turbo: 3, bee: 2, goo: 1, shield: 1 },
  { turbo: 4, bee: 3, ball: 2, shield: 1 },
  { turbo: 4, bee: 4, ball: 1, shield: 1 },
];
// kart pemain (v84): kebuka seiring peringkat Kart cup. v = kecepatan puncak, ac = tarikan, tn = belok, grip = setir nempel (kecil = licin),
// dc = cepat ngisi percikan drift, wt = berat (tahan senggol, dinding, dan item), off = kecepatan di rumput/pasir
const KT_KARTS = [
  { id: "classic", name: "Classic", icon: "🏎️", tier: 0, v: 30, ac: 1, tn: 1, grip: 1, dc: 1, wt: 1, off: 0.55, desc: "All-rounder. Good at everything.", st: [3, 3, 3, 3] },
  { id: "swirl", name: "Swirl", icon: "🌀", tier: 1, v: 29.6, ac: 1.12, tn: 1.07, grip: 1.05, dc: 1.3, wt: 0.9, off: 0.55, desc: "Drift sparks charge fast. Light and nimble.", st: [2, 4, 5, 2] },
  { id: "dart", name: "Dart", icon: "⚡", tier: 2, v: 31.1, ac: 0.92, tn: 0.92, grip: 0.62, dc: 0.95, wt: 0.9, off: 0.5, desc: "Top speed king, but slippery in turns.", st: [5, 2, 3, 2] },
  { id: "boulder", name: "Boulder", icon: "🪨", tier: 3, v: 30.3, ac: 0.78, tn: 0.95, grip: 1.1, dc: 0.95, wt: 1.6, off: 0.68, desc: "Heavy. Shrugs off bumps, walls and grass.", st: [3, 3, 2, 5] },
];
const KT_STAT = ["Speed", "Handling", "Drift", "Weight"];
// pilihan terakhir (sirkuit + kart) disimpan di HP; tantangan harian sirkuitnya ikut tanggal
const KT_PICK_KEY = "mk-kart-pick";
function ktPick() { let P = {}; try { P = JSON.parse(localStorage.getItem(KT_PICK_KEY)) || {}; } catch (e) { /* tanpa storage */ } return { c: KT_COURSES.some(c => c.id === P.c) ? P.c : KT_COURSES[0].id, k: KT_KARTS.some(k => k.id === P.k) ? P.k : "classic", seen: +P.seen || 0 }; }
function ktPickSave(P) { try { localStorage.setItem(KT_PICK_KEY, JSON.stringify(P)); } catch (e) { /* abaikan */ } }
const ktKartOpen = (kt, best) => Dapur.tier("kart", best || 0).ix >= kt.tier;
function ktDailyCourse(d) { let h = 0; for (const ch of String(d)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return KT_COURSES[h % KT_COURSES.length].id; }
let KR = null;   // renderer + adegan yang dipakai ulang antar ronde
// tingkat kesulitan ikut peringkat Kart cup (Rookie..Legend): kecepatan CPU (m/s) dan rajin pakai item.
// Tantangan harian selalu pakai tingkat Silver biar sama buat semua.
const KT_DIFF = [{ v: -2.0, aim: -0.3 }, { v: -1.0, aim: -0.15 }, { v: 0, aim: 0 }, { v: 0.5, aim: 0.1 }, { v: 1.0, aim: 0.2 }, { v: 1.4, aim: 0.3 }];
const KT_TUT = 3;   // petunjuk drift muncul sampai pemain berhasil turbo dari drift sebanyak ini
// hantu: balapan terbaik lu (dan rekor tantangan hari ini) disimpan per 0,1 detik di localStorage
const KT_GHOST_KEY = "mk-kart-ghost", KT_GHOST_DT = 0.1;
function ktGhostLoad() { try { return JSON.parse(localStorage.getItem(KT_GHOST_KEY)) || {}; } catch (e) { return {}; } }
function ktGhostSave(G) { try { localStorage.setItem(KT_GHOST_KEY, JSON.stringify(G)); } catch (e) { /* tanpa storage: hantu nggak disimpan */ } }

// dua sirkuit (v84, diskusi 9 Nov "kerjain semua"): titik kontrol [x, z, tinggi], skala, suasana, letak bantalan/kotak/koin
const KT_COURSES = [
  { id: "meadow", name: "Meadow ring", icon: "🌳", S: 1.25, P: [[0, 0, 0], [80, 0, 0], [122, 18, 0], [132, 60, 1], [106, 92, 3.5], [62, 82, 6], [32, 102, 7], [12, 140, 4.5], [-28, 152, 1.5], [-56, 122, 0], [-44, 82, 0], [-72, 50, 0], [-62, 14, 0]],
    sky: ["#3D7FD9", "#8EC5F0", "#F6E3C4"], fog: ["#DDE6EA", 70, 340], hemi: [0xdff1ff, 0x5a7a3a, 0.95], sun: [0xfff1d6, 0.85, 60, 120, 40], bg: "#8EC5F0",
    ground: "#6AA947", verge: ["#6DB04A", "40,90,30", "160,210,110"], wall: "#2F6FD0", curb: "#E0453A", banner: "#6C3EE6", hills: "#7E8FB5",
    pads: [[0.3, -2.5], [0.63, 2.5], [0.88, 0]], boxes: [0.18, 0.5, 0.76], coins: [[0.08, 0, 0], [0.26, -4, 0.5], [0.4, 3, -0.6], [0.58, -3, 0], [0.7, 4, -0.8], [0.93, 0, 0.6]] },
  // pantai sore: pasir, laut di selatan, pohon kelapa, payung pantai, matahari terbenam; ada tikungan tusuk konde sebelum garis finish
  { id: "bay", name: "Sunset bay", icon: "🌅", S: 1.12, P: [[0, 0, 0], [95, 0, 0], [135, 20, 0], [140, 58, 1], [112, 78, 3], [110, 110, 5], [132, 140, 6], [110, 172, 4], [60, 168, 2], [30, 138, 1], [-10, 150, 0], [-52, 130, 0], [-60, 92, 0], [-42, 62, 0], [-64, 30, 0], [-48, 4, 0]],
    sky: ["#3A3F8F", "#E77A5C", "#FFD08A"], fog: ["#F2B48A", 80, 360], hemi: [0xffd9b8, 0x8a6a4a, 0.9], sun: [0xffb070, 1.0, 40, 50, -120], bg: "#F2A07A",
    ground: "#E3C68E", verge: ["#E8CF98", "170,130,80", "255,245,215"], wall: "#F07A2E", curb: "#2F8FD0", banner: "#E0453A", hills: "#8A6A9E", sea: -48, cpu: -0.6,
    pads: [[0.24, 2.5], [0.56, -2.5], [0.95, 0]], boxes: [0.14, 0.45, 0.7], coins: [[0.06, 0, 0], [0.2, 4, -0.6], [0.34, -3, 0.5], [0.52, 3, 0], [0.64, -4, 0.7], [0.9, 0, -0.6]] },
];
// ---------- lintasan: kurva tertutup, dicuplik jadi KT_N titik (posisi, arah, normal, tinggi)
function ktTrack(C) {
  const P = C.P, S = C.S, curve = new THREE.CatmullRomCurve3(P.map(([x, z, y]) => new THREE.Vector3(x * S, y, z * S)), true, "centripetal");
  const pts = curve.getSpacedPoints(KT_N), T = { len: curve.getLength(), x: new Float32Array(KT_N), y: new Float32Array(KT_N), z: new Float32Array(KT_N), tx: new Float32Array(KT_N), tz: new Float32Array(KT_N), nx: new Float32Array(KT_N), nz: new Float32Array(KT_N), h: new Float32Array(KT_N) };
  T.seg = T.len / KT_N;
  for (let i = 0; i < KT_N; i++) { T.x[i] = pts[i].x; T.y[i] = pts[i].y; T.z[i] = pts[i].z; }
  for (let i = 0; i < KT_N; i++) {
    const a = (i + KT_N - 1) % KT_N, b = (i + 1) % KT_N; let tx = T.x[b] - T.x[a], tz = T.z[b] - T.z[a]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    T.tx[i] = tx; T.tz[i] = tz; T.nx[i] = tz; T.nz[i] = -tx; T.h[i] = Math.atan2(tx, tz);
  }
  return T;
}
const ktWrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
function ktNear(T, x, z, i0, span = 30) {
  let best = i0, bd = 1e12;
  for (let k = -span; k <= span; k++) { const i = (i0 + k + KT_N) % KT_N, dx = x - T.x[i], dz = z - T.z[i], d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } }
  return best;
}
const ktLat = (T, i, x, z) => (x - T.x[i]) * T.nx[i] + (z - T.z[i]) * T.nz[i];
const ktAt = (T, i, lat) => ({ x: T.x[i] + T.nx[i] * lat, y: T.y[i], z: T.z[i] + T.nz[i] * lat });

// ---------- bahan 3D
const ktMat = (c, o = {}) => { const m = new THREE.MeshLambertMaterial(Object.assign({ color: c }, o)); m.color.convertSRGBToLinear(); if (o.emissive !== undefined) m.emissive.convertSRGBToLinear(); return m; };
function ktTex(draw, w, h, rep) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
// pita di sepanjang lintasan: dari jarak a ke b (meter dari tengah), tinggi ya/yb relatif ke jalan; v = meter / rep
function ktRibbon(T, a, b, ya, yb, mat, rep, side, absB) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= KT_N; i++) {
    const k = i % KT_N, v = i * T.seg / rep;
    for (const [d, y, u, ab] of [[a, ya, 0, false], [b, yb, 1, absB]]) { const s = d * side; pos.push(T.x[k] + T.nx[k] * s, ab ? y : T.y[k] + y, T.z[k] + T.nz[k] * s); uv.push(u, v); }
    if (i < KT_N) { const o = i * 2; side > 0 ? idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3) : idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
// renderer, kamera, lampu, dan barang yang dipakai semua sirkuit (partikel, jejak ban, bayangan); sirkuitnya dibikin pas dipilih
function ktBuild() {
  const dpr = Math.min(1.5, window.devicePixelRatio || 1), cv = document.createElement("canvas");
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: "high-performance" });
  r.setPixelRatio(dpr); r.outputEncoding = THREE.sRGBEncoding;
  const sc = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xdff1ff, 0x5a7a3a, 0.95); sc.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 0.85); sun.position.set(60, 120, 40); sc.add(sun);
  sc.fog = new THREE.Fog(0xffffff, 70, 340);
  const cam = new THREE.PerspectiveCamera(70, 1, 0.3, 700);
  // partikel (percikan drift, debu, api turbo): sprite dipakai ulang
  const dot = ktTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 32, 32);
  const PM = {}; for (const [k, c] of [["b", "#5FC8FF"], ["o", "#FF9A2E"], ["p", "#C45CFF"], ["d", "#C9B79A"], ["f", "#FFC14A"], ["w", "#FFFFFF"]]) { PM[k] = new THREE.SpriteMaterial({ map: dot, color: new THREE.Color(c), transparent: true, opacity: k === "w" ? 0.6 : k === "d" ? 0.7 : 0.85, depthWrite: false, blending: k === "d" ? THREE.NormalBlending : THREE.AdditiveBlending }); }
  const parts = []; for (let i = 0; i < 140; i++) { const s = new THREE.Sprite(PM.w); s.visible = false; sc.add(s); parts.push({ s, t: 0, life: 0 }); }
  const shadowT = ktTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(0,0,0,.45)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 64, 64);
  // jejak ban: kotak gelap tipis di aspal, dipakai bergiliran
  const markM = new THREE.MeshBasicMaterial({ color: 0x1a1620, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const markG = new THREE.PlaneGeometry(0.32, 0.9); markG.rotateX(-Math.PI / 2);
  const marks = []; for (let i = 0; i < 260; i++) { const m = new THREE.Mesh(markG, markM); m.visible = false; sc.add(m); marks.push(m); }
  KR = { r, cv, sc, cam, hemi, sun, dot, courses: {}, cur: null, marks, mi: 0, pr: dpr, prMax: dpr, parts, PM, shadowM: new THREE.MeshBasicMaterial({ map: shadowT, transparent: true, depthWrite: false }), karts: [], projG: new THREE.Group() };
  sc.add(KR.projG);
  ktCourseUse(KT_COURSES[0].id);
  return KR;
}
// pasang sirkuit: dibikin sekali per sesi, lalu tinggal ditukar (grup adegan, langit, kabut, lampu)
function ktCourseUse(id) {
  const C = KT_COURSES.find(c => c.id === id) || KT_COURSES[0];
  if (KR.cur && KR.cur.id === C.id) return KR.cur;
  if (KR.cur) KR.sc.remove(KR.cur.grp);
  const R = KR.courses[C.id] || (KR.courses[C.id] = ktCourse(C));
  KR.sc.add(R.grp); KR.cur = R;
  KR.sc.background = R.sky; KR.sc.fog.color.set(C.fog[0]).convertSRGBToLinear(); KR.sc.fog.near = C.fog[1]; KR.sc.fog.far = C.fog[2];
  KR.hemi.color.setHex(C.hemi[0]); KR.hemi.groundColor.setHex(C.hemi[1]); KR.hemi.intensity = C.hemi[2];
  KR.sun.color.setHex(C.sun[0]); KR.sun.intensity = C.sun[1]; KR.sun.position.set(C.sun[2], C.sun[3], C.sun[4]);
  Object.assign(KR, { T: R.T, pads: R.pads, boxes: R.boxes, coins: R.coins, mm: null });
  return R;
}
function ktCourse(C) {
  const T = ktTrack(C), grp = new THREE.Group(), add = o => { grp.add(o); return o; };
  const sky = ktTex((g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, C.sky[0]); gr.addColorStop(0.55, C.sky[1]); gr.addColorStop(1, C.sky[2]); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 4, 256);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < KT_N; i++) { x0 = Math.min(x0, T.x[i]); x1 = Math.max(x1, T.x[i]); z0 = Math.min(z0, T.z[i]); z1 = Math.max(z1, T.z[i]); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  // tanah dan lintasan
  const [vc, d1, d2] = C.verge;
  const vergeT = ktTex((g, w, h) => { g.fillStyle = vc; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? d1 : d2},${Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } }, 128, 128, true);
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), ktMat(C.ground))); ground.rotation.x = -Math.PI / 2; ground.position.set(cx, -1.2, cz);
  const road = ktTex((g, w, h) => {
    g.fillStyle = "#4A4752"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = "#F4F1EA"; g.fillRect(4, 0, 5, h); g.fillRect(w - 9, 0, 5, h);
    g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(w / 2 - 2, 0, 4, h * 0.45);
  }, 128, 256, true);
  const curb = ktTex((g, w, h) => { g.fillStyle = "#F4F1EA"; g.fillRect(0, 0, w, h); g.fillStyle = C.curb; g.fillRect(0, 0, w, h / 2); }, 8, 32, true);
  const wallT = ktTex((g, w, h) => { g.fillStyle = "#F4F1EA"; g.fillRect(0, 0, w, h); g.fillStyle = C.wall; g.fillRect(0, 0, w, h / 2); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, h - 4, w, 4); }, 8, 32, true);
  add(ktRibbon(T, -KT_HW, KT_HW, 0.02, 0.02, ktMat("#ffffff", { map: road }), 12, 1));
  const vergeM = ktMat("#ffffff", { map: vergeT });
  for (const s of [1, -1]) {
    add(ktRibbon(T, KT_HW, KT_HW + 1.3, 0.05, 0.05, ktMat("#ffffff", { map: curb }), 3, s));
    add(ktRibbon(T, KT_HW + 1.3, KT_WALL, 0.0, 0.0, vergeM, 10, s));
    add(ktRibbon(T, KT_WALL, KT_WALL + 26, 0.0, -1.2, vergeM, 10, s, true));
    // dinding: pita tegak (jarak sama, tinggi beda), belang warna sirkuit
    add(ktRibbon(T, KT_WALL, KT_WALL, 0, 1.1, ktMat("#ffffff", { map: wallT, side: THREE.DoubleSide }), 2.5, s));
  }
  // garis start + gapura
  const chk = ktTex((g, w, h) => { const n = 8; for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? "#111" : "#fff"; g.fillRect(i * w / n, j * h / 2, w / n, h / 2); } }, 128, 32);
  const line = add(new THREE.Mesh(new THREE.PlaneGeometry(KT_HW * 2, 2), ktMat("#ffffff", { map: chk }))); line.rotation.x = -Math.PI / 2; line.rotation.z = T.h[0]; line.position.set(T.x[0], T.y[0] + 0.04, T.z[0]);
  const arch = add(new THREE.Group()); arch.position.set(T.x[0], T.y[0], T.z[0]); arch.rotation.y = T.h[0];
  const pil = ktMat("#2B2235");
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7, 0.8), pil); p.position.set(s * (KT_HW + 1.5), 3.5, 0); arch.add(p); }
  const ban = ktTex((g, w, h) => { g.fillStyle = C.banner; g.fillRect(0, 0, w, h); g.fillStyle = "#FFE36B"; g.font = "900 64px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("KART CUP", w / 2, h / 2 + 4); }, 512, 96);
  const bn = new THREE.Mesh(new THREE.BoxGeometry(KT_HW * 2 + 4, 1.6, 0.5), [pil, pil, pil, pil, ktMat("#ffffff", { map: ban }), ktMat("#ffffff", { map: ban })]); bn.position.y = 7; arch.add(bn);
  // hiasan di luar dinding (pohon / kelapa + payung pantai), bukit jauh
  const far = (x, z, m) => { for (let i = 0; i < KT_N; i += 6) { const dx = x - T.x[i], dz = z - T.z[i]; if (dx * dx + dz * dz < m * m) return false; } return true; };
  const spots = (n, m, ok) => { const out = []; let guard = 0; while (out.length < n && guard++ < 5000) { const x = x0 - 75 + Math.random() * (x1 - x0 + 150), z = z0 - 75 + Math.random() * (z1 - z0 + 150); if ((!ok || ok(x, z)) && far(x, z, m)) out.push([x, z, 0.8 + Math.random() * 0.8]); } return out; };
  const o = new THREE.Object3D();
  if (C.sea == null) {
    const trees = spots(170, KT_WALL + 5);
    const tr = add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 6), ktMat("#7A5236"), trees.length));
    const lf = add(new THREE.InstancedMesh(new THREE.ConeGeometry(2.2, 5, 7), ktMat("#3E8A3A"), trees.length));
    trees.forEach(([x, z, s], i) => { o.position.set(x, -0.2, z); o.scale.setScalar(s); o.updateMatrix(); tr.setMatrixAt(i, o.matrix); o.position.y = -0.2 + 3.4 * s; o.updateMatrix(); lf.setMatrixAt(i, o.matrix); });
  } else ktBeach(C, T, add, spots, o, cx);
  const mtM = ktMat(C.hills);
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2, R = 330 + (i % 3) * 30, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
    if (C.sea != null && z < C.sea) continue;   // laut: nggak ada gunung, cuma pulau kecil (ktBeach)
    const m = add(new THREE.Mesh(new THREE.ConeGeometry(60 + (i % 4) * 18, (70 + (i % 5) * 22) * (C.sea != null ? 0.6 : 1), C.sea != null ? 12 : 6), mtM)); m.position.set(x, C.sea != null ? 10 : 20, z);
  }
  // bantalan turbo (panah kuning di jalan)
  const padT = ktTex((g, w, h) => { g.fillStyle = "#FFB52E"; g.fillRect(0, 0, w, h); g.fillStyle = "#FFF3B0"; for (let k = 0; k < 2; k++) { const y = 8 + k * h / 2; g.beginPath(); g.moveTo(w * 0.15, y + 34); g.lineTo(w / 2, y); g.lineTo(w * 0.85, y + 34); g.lineTo(w * 0.85, y + 50); g.lineTo(w / 2, y + 16); g.lineTo(w * 0.15, y + 50); g.fill(); } }, 64, 128);
  const padM = ktMat("#ffffff", { map: padT, emissive: "#664400" });
  const pads = C.pads.map(([f, lat]) => {
    const i = Math.floor(f * KT_N), p = ktAt(T, i, lat), m = add(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5), padM));
    m.rotation.x = -Math.PI / 2; m.rotation.z = T.h[i] + Math.PI; m.position.set(p.x, p.y + 0.05, p.z);
    return { i, lat };
  });
  // kotak item (kubus "?" berputar) dan koin
  const qT = ktTex((g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#FF6BCB"); gr.addColorStop(0.5, "#7FD8F0"); gr.addColorStop(1, "#FFE36B"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = "#fff"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = "#fff"; g.font = "900 44px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", w / 2, h / 2 + 2); }, 64, 64);
  const boxG = new THREE.BoxGeometry(1.3, 1.3, 1.3), boxM = ktMat("#ffffff", { map: qT, transparent: true, opacity: 0.88, emissive: "#333333" });
  const boxes = [];
  for (const f of C.boxes) for (const lat of [-4.5, -1.5, 1.5, 4.5]) { const i = Math.floor(f * KT_N), p = ktAt(T, i, lat), m = add(new THREE.Mesh(boxG, boxM)); m.position.set(p.x, p.y + 1.1, p.z); boxes.push({ m, x: p.x, y: p.y, z: p.z, dead: 0 }); }
  const coinG = new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16), coinM = ktMat("#F2C230", { emissive: "#6A4A00" });
  const coins = [];
  for (const [f, lat0, dl] of C.coins) for (let k = 0; k < 5; k++) {
    const i = Math.floor(f * KT_N) + k * 7, p = ktAt(T, i % KT_N, lat0 + dl * k), m = add(new THREE.Mesh(coinG, coinM)); m.rotation.z = Math.PI / 2; m.position.set(p.x, p.y + 0.9, p.z); coins.push({ m, x: p.x, y: p.y, z: p.z, dead: false });
  }
  return { id: C.id, C, grp, T, sky, pads, boxes, coins, water: grp.userData.water || null };
}
// Sunset bay: laut (riak geser pelan), matahari terbenam, pulau, kelapa, payung pantai warna-warni
function ktBeach(C, T, add, spots, o, cx) {
  const waveT = ktTex((g, w, h) => { g.fillStyle = "#2F8DB5"; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,${200 + Math.random() * 55 | 0},${150 + Math.random() * 80 | 0},${0.15 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 18, 2); } }, 128, 128, true);
  waveT.repeat.set(60, 30);
  const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(1600, 800), ktMat("#ffffff", { map: waveT, emissive: "#3a2030" })));
  sea.rotation.x = -Math.PI / 2; sea.position.set(cx, -0.95, C.sea - 400);
  sea.parent.userData.water = waveT;
  // buih di bibir pantai
  const foam = add(new THREE.Mesh(new THREE.PlaneGeometry(1600, 2.5), new THREE.MeshBasicMaterial({ color: 0xfff4e0, transparent: true, opacity: 0.7, depthWrite: false })));
  foam.rotation.x = -Math.PI / 2; foam.position.set(cx, -0.9, C.sea);
  // matahari: piringan bercahaya di cakrawala selatan, nggak kena kabut
  const sunT = ktTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(255,250,220,1)"); gr.addColorStop(0.28, "rgba(255,214,120,1)"); gr.addColorStop(0.32, "rgba(255,170,90,.55)"); gr.addColorStop(1, "rgba(255,120,80,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 128, 128);
  const sun = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: sunT, transparent: true, depthWrite: false, fog: false })));
  sun.scale.set(150, 150, 1); sun.position.set(cx + 60, 22, C.sea - 560);
  const isl = ktMat("#6E5A86");
  for (const [dx, dz, r, h] of [[-160, -240, 34, 22], [-110, -260, 20, 12], [190, -300, 46, 30], [60, -330, 26, 14]]) { const m = add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), isl)); m.position.set(cx + dx, h / 2 - 2, C.sea + dz); m.scale.y = 1; }
  // kelapa: batang miring + mahkota daun + buah
  const palms = spots(120, KT_WALL + 5, (x, z) => z > C.sea + 6);
  const trunk = add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.38, 7, 6), ktMat("#9A6B42"), palms.length));
  const crown = add(new THREE.InstancedMesh(new THREE.ConeGeometry(3.4, 1.5, 7), ktMat("#3F9A47"), palms.length));
  const nuts = add(new THREE.InstancedMesh(SPH(0.55, 8, 6), ktMat("#6A4524"), palms.length));
  const e = new THREE.Euler();
  palms.forEach(([x, z, s], i) => {
    const lean = 0.12 + Math.random() * 0.2, dir = Math.random() * Math.PI * 2, hx = Math.sin(dir) * lean, hz = Math.cos(dir) * lean;
    e.set(hz, 0, -hx); o.rotation.copy(e); o.scale.setScalar(s); o.position.set(x + hx * 3.5 * s, -0.2 + 3.5 * s, z + hz * 3.5 * s); o.updateMatrix(); trunk.setMatrixAt(i, o.matrix);
    o.rotation.set(0, dir, 0); o.position.set(x + hx * 7 * s, -0.2 + 7 * s, z + hz * 7 * s); o.updateMatrix(); crown.setMatrixAt(i, o.matrix);
    o.position.y -= 0.6 * s; o.updateMatrix(); nuts.setMatrixAt(i, o.matrix);
  });
  o.rotation.set(0, 0, 0);
  // payung pantai di pasir antara dinding dan laut
  const ub = [], cols = ["#E8506A", "#FFD15C", "#4A7BE0", "#3FA34D", "#F07A2E", "#FFFFFF"].map(c => new THREE.Color(c).convertSRGBToLinear());
  for (let x = cx - 260; x < cx + 260; x += 9 + Math.random() * 10) { const z = C.sea + 4 + Math.random() * 10; let ok = true; for (let i = 0; i < KT_N; i += 6) if ((x - T.x[i]) ** 2 + (z - T.z[i]) ** 2 < (KT_WALL + 3) ** 2) { ok = false; break; } if (ok) ub.push([x, z]); }
  const top = add(new THREE.InstancedMesh(new THREE.ConeGeometry(1.9, 0.9, 8), ktMat("#ffffff"), ub.length));
  const pole = add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5), ktMat("#F4F1EA"), ub.length));
  ub.forEach(([x, z], i) => { o.scale.setScalar(1); o.position.set(x, 2.4, z); o.updateMatrix(); top.setMatrixAt(i, o.matrix); top.setColorAt(i, cols[i % cols.length]); o.position.y = 1.1; o.updateMatrix(); pole.setMatrixAt(i, o.matrix); });
  if (top.instanceColor) top.instanceColor.needsUpdate = true;
}
// kart: sasis bulat, 4 roda, sayap belakang, pengemudi pakai helm warna dia
function ktKartMesh(col, type = "classic") {
  const g = new THREE.Group(), b = new THREE.Group(), bd = new THREE.Group(); g.add(b); b.add(bd);
  const c = ktMat(col), dark = ktMat("#2B2235"), tire = ktMat("#1E1A22"), wht = ktMat("#F4F1EA");
  const m = (geo, mat, x, y, z, p = bd) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); p.add(o); return o; };
  const wr = type === "boulder" ? 1.18 : type === "dart" ? 0.92 : 1;
  m(RB(1.7, 0.42, 2.5, 0.16), c, 0, 0.5, 0);
  m(RB(1.2, 0.32, 0.9, 0.12), c, 0, 0.48, 1.35);
  m(RB(1.75, 0.16, 0.5, 0.06), dark, 0, 0.42, 1.75);
  m(RB(1.0, 0.5, 0.7, 0.12), dark, 0, 0.85, -0.55);
  m(RB(type === "dart" ? 2.3 : 1.8, 0.12, type === "dart" ? 0.6 : 0.45, 0.05), c, 0, type === "dart" ? 1.35 : 1.2, -1.25);
  for (const s of [-0.6, 0.6]) m(new THREE.BoxGeometry(0.1, type === "dart" ? 0.65 : 0.45, 0.1), dark, s, type === "dart" ? 1.02 : 0.95, -1.2);
  // tiap jenis punya ciri: Dart moncong runcing, Boulder bemper tebal, Swirl sirip samping
  if (type === "dart") { const n = m(new THREE.ConeGeometry(0.42, 1.1, 4), c, 0, 0.5, 2.25); n.rotation.x = Math.PI / 2; n.rotation.y = Math.PI / 4; n.scale.set(1.4, 1, 0.5); m(RB(0.18, 0.5, 2.2, 0.06), wht, 0, 0.74, 0.2); }
  if (type === "boulder") { m(RB(2.1, 0.36, 0.36, 0.12), dark, 0, 0.55, 2.0); for (const s of [-0.75, 0.75]) m(new THREE.BoxGeometry(0.18, 0.5, 0.18), dark, s, 0.75, 1.95); m(RB(1.5, 0.3, 1.2, 0.1), c, 0, 0.85, 0.6); }
  if (type === "swirl") for (const s of [-1, 1]) { const f = m(RB(0.12, 0.55, 1.2, 0.05), wht, s * 0.92, 0.85, -0.35); f.rotation.z = s * -0.35; }
  const wheels = [];
  for (const [x, z, r] of [[0.92, 0.85, 0.36], [-0.92, 0.85, 0.36], [0.92, -0.85, 0.42], [-0.92, -0.85, 0.42]]) { const rr = r * wr, xx = x * (type === "boulder" ? 1.06 : 1); const w = m(new THREE.CylinderGeometry(rr, rr, 0.38, 14), tire, xx, rr, z); w.rotation.z = Math.PI / 2; wheels.push(w); m(new THREE.CylinderGeometry(rr * 0.45, rr * 0.45, 0.4, 10), wht, xx, rr, z).rotation.z = Math.PI / 2; }
  const helm = m(SPH(0.46, 16, 12), c, 0, 1.45, -0.1); helm.scale.set(1, 0.95, 1.05);
  m(RB(0.62, 0.22, 0.2, 0.08), ktMat("#1B1530"), 0, 1.47, 0.32);
  m(new THREE.BoxGeometry(0.12, 0.1, 0.9), wht, 0, 1.88, -0.1);
  if (type === "dart") bd.scale.set(0.96, 0.9, 1.08); else if (type === "boulder") bd.scale.set(1.1, 1.06, 1.02); else if (type === "swirl") bd.scale.set(0.97, 1, 0.93);
  // api turbo di knalpot
  const flame = new THREE.Group(); flame.position.set(0, 0.55, -1.35); b.add(flame);
  const fm = new THREE.MeshBasicMaterial({ color: 0xffa53a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const s of [-0.38, 0.38]) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.1, 8), fm); f.rotation.x = -Math.PI / 2; f.position.set(s, 0, -0.5); flame.add(f); }
  flame.visible = false;
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), KR.shadowM); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
  const bub = new THREE.Mesh(SPH(1.9, 20, 14), new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.28, depthWrite: false })); bub.position.y = 0.9; bub.visible = false; g.add(bub);
  return { g, b, wheels, flame, bub };
}

// ---------- mulai ronde
function kartInit() {
  if (!KR) ktBuild();
  const P = ktPick(), W0 = wallet(), cid = FC.daily ? ktDailyCourse(today()) : P.c;
  const KT = KT_KARTS.find(k => k.id === P.k && ktKartOpen(k, W0.best.kart)) || KT_KARTS[0];
  ktCourseUse(cid);
  const { T } = KR, el = FC.el, cv = KR.cv;
  el.style.background = KR.cur.C.bg;
  cv.id = "ktGl"; cv.style.zIndex = "0";
  if (cv.parentNode !== el) el.insertBefore(cv, $("mgBg").nextSibling);
  KR.karts.forEach(k => KR.sc.remove(k.g));
  KR.projG.clear(); KR.proj = [];
  KR.boxes.forEach(b => { b.dead = 0; b.m.visible = true; });
  KR.coins.forEach(c => { c.dead = false; c.m.visible = true; });
  KR.parts.forEach(p => { p.s.visible = false; p.life = 0; });
  const lvl = FC.daily ? 2 : Dapur.tier("kart", W0.best.kart).ix, D = KT_DIFF[lvl];
  const who = [{ name: "You", col: "#FFD15C", me: true, v: KT.v, lane: 0, wob: 0.6, brake: 0.6, aim: 0, type: KT.id, ac: KT.ac, tn: KT.tn, grip: KT.grip, dc: KT.dc, wt: KT.wt, off: KT.off }].concat(KT_CPU.map(c => ({ ...c, v: c.v + D.v + (KR.cur.C.cpu || 0), aim: Math.max(0, c.aim + D.aim) })));
  // grid: pemain di posisi ke-4 dari 5, biar ada yang dikejar dari awal
  const slots = [2, 0, 1, 3, 4];
  KR.karts = who.map((w, n) => {
    const s = slots[n], i = (KT_N - 8 - s * 6) % KT_N, lat = (s % 2 ? 1 : -1) * 3, p = ktAt(T, i, lat), mm = ktKartMesh(w.col, w.type);
    KR.sc.add(mm.g);
    return Object.assign(w, mm, { x: p.x, y: p.y, z: p.z, h: T.h[i], vh: T.h[i], v: 0, base: w.v, idx: i, lap: -1, half: true, fin: 0, s: 0, drift: 0, dT: 0, sT: 0, boost: 0, spin: 0, shield: 0, item: null, roll: 0, coins: 0, hop: 0, wallT: 0, ph: FC.rnd() * 6, laneNow: w.lane || 0, itemT: 1 + FC.rnd() * 3, stall: 0, sm: 0, sUse: 0, by: 0, bv: 0, pitch: 0, vPrev: 0, mark: null });
  });
  // intro kamera keliling cuma di balapan pertama sesi ini; main lagi langsung hitung mundur
  // (sirkuit baru = intro lagi, biar kelihatan tempatnya)
  const intro = KR.raced === cid ? 0.25 : 1.4; KR.raced = cid;
  FC.kt = { t: 0, cd: 3 + intro, intro, beep: 4, camH: KR.karts[0].h, punch: 0, slow: 0, ft: 1 / 60, qT: 0, upT: 0, ptr: null, s: 0, hold: false, x0: 0, moved: 0, keyL: false, keyR: false, msg: null, msgT: 0, rocket: null, end: 0, hits: 0, place: null, shake: 0, camP: null, wrong: 0, hint: !(W0.best.kart), lvl, tut: !FC.daily && ((W0.stat || {}).kartDrift || 0) < KT_TUT, tutDone: 0, rec: [], recT: 0, course: cid, kart: KT.id, flash: 0, flashC: null };
  ktGhostInit();
  FC.place = null;
  KR.marks.forEach(m => { m.visible = false; }); KR.mi = 0;
  if (!KR.cur.warm) { KR.r.compile(KR.sc, KR.cam); KR.cur.warm = true; }
  Sfx.motor(null);
}
// disiapin waktu layar Games kebuka, biar start pertama nggak patah-patah (bikin adegan + kompilasi shader)
function ktWarm() {
  if (KR || FC) return;
  try { ktBuild(); KR.r.compile(KR.sc, KR.cam); KR.warm = true; } catch (e) { /* nanti dibikin waktu main */ }
}
function kartStop() { Sfx.motor(null); }
// ---------- landscape: di Android coba layar penuh + kunci miring; kalau nggak bisa (iPhone, browser lain) dan HP masih tegak,
// seluruh layar game diputar 90° lewat CSS (.fcx-rot), jadi pemain tinggal miringin HP-nya
let KT_FS = false;
function ktLock() {
  try {
    const d = document.documentElement;
    if (document.fullscreenElement || !d.requestFullscreen || !(screen.orientation && screen.orientation.lock) || !/Android/i.test(navigator.userAgent)) return;
    d.requestFullscreen({ navigationUI: "hide" }).then(() => { KT_FS = true; return screen.orientation.lock("landscape"); }).catch(() => { /* nggak didukung: pakai putar CSS */ });
  } catch (e) { /* abaikan */ }
}
function ktUnlock() {
  if (!KT_FS) return; KT_FS = false;
  try { screen.orientation.unlock && screen.orientation.unlock(); } catch (e) { /* abaikan */ }
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}
function ktOrient(el) {
  const port = window.innerHeight > window.innerWidth * 1.05;
  el.classList.toggle("fcx-rot", port);
  const w = port ? window.innerHeight : window.innerWidth, h = port ? window.innerWidth : window.innerHeight;
  el.classList.toggle("fcx-land", w > h && h < 560);
}
document.addEventListener("visibilitychange", () => { if (document.hidden) Sfx.motor(null); });

// ---------- input: satu jempol (geser = belok, tahan belok tajam = drift, ketuk = item), jari kedua = item juga
function kartDown(id, x, y) {
  const K = FC.kt; if (!K) return;
  if (K.ptr != null && id !== K.ptr) { ktUse(KR.karts[0]); return; }
  Object.assign(K, { ptr: id, x0: x, xn: x, yn: y, t0: now(), moved: 0, hold: true, s: 0 });
  if (K.cd > 0 && K.rocket == null) K.rocket = K.cd;
}
function kartMove(id, x, y) {
  const K = FC.kt; if (!K || id !== K.ptr) return;
  const R = 58 * FC.dpr; let dx = x - K.x0;
  // jangkar ikut jempol kalau kebablasan, biar balik arah tetap cepat
  if (Math.abs(dx) > R * 1.3) { K.x0 = x - Math.sign(dx) * R * 1.3; dx = x - K.x0; }
  K.moved = Math.max(K.moved, Math.abs(x - K.xn) + Math.abs(y - K.yn)); K.s = Math.max(-1, Math.min(1, dx / R)); K.xn2 = x;
}
function kartUp(id) {
  const K = FC.kt; if (!K || id !== K.ptr) return;
  if (now() - K.t0 < 230 && K.moved < 14 * FC.dpr && K.cd <= 0) ktUse(KR.karts[0]);
  if (K.cd > 0) K.rocket = null;
  Object.assign(K, { ptr: null, hold: false, s: 0 });
}
function kartKey(e, down) {
  const K = FC && FC.kt; if (!K || !FC.run) return;
  const k = e.key;
  if (k === "ArrowLeft" || k === "a" || k === "A") { K.keyL = down; e.preventDefault(); }
  else if (k === "ArrowRight" || k === "d" || k === "D") { K.keyR = down; e.preventDefault(); }
  else if (down && !e.repeat && (k === " " || k === "x" || k === "X" || k === "Enter" || k === "ArrowUp")) { e.preventDefault(); if (K.cd > 0) { if (K.rocket == null) K.rocket = K.cd; K.keyHold = true; } else ktUse(KR.karts[0]); }
  if (!down && (k === " " || k === "x" || k === "X" || k === "Enter" || k === "ArrowUp")) K.keyHold = false;
}

// ---------- item
function ktRank(k) { return [...KR.karts].sort((a, b) => ktProg(b) - ktProg(a)).indexOf(k); }
const ktProg = k => (k.fin ? 1e7 - k.fin : 0) + k.lap * KT_N + k.idx;
function ktRoll(k) {
  const w = KT_ODDS[Math.min(4, ktRank(k))], tot = Object.values(w).reduce((a, b) => a + b, 0);
  let r = FC.rnd() * tot; for (const [n, v] of Object.entries(w)) { r -= v; if (r <= 0) return n; }
  return "turbo";
}
function ktUse(k) {
  if (!k.item || k.roll > 0 || k.spin > 0 || k.fin) return;
  const it = k.item; k.item = null; k.itemT = 2 + FC.rnd() * 4;
  const fx = Math.sin(k.h), fz = Math.cos(k.h);
  if (it === "turbo") { k.boost = Math.max(k.boost, 1.4); if (k.me) { Sfx.play("turbo"); FC.kt.shake = 0.25; } }
  else if (it === "shield") { k.shield = 9; if (k.me) Sfx.play("bintang"); }
  else if (it === "ball") ktShoot(k, "ball", k.x + fx * 2.6, k.z + fz * 2.6, fx * (k.v + 26), fz * (k.v + 26));
  else if (it === "goo") ktShoot(k, "goo", k.x - fx * 2.8, k.z - fz * 2.8, 0, 0);
  else if (it === "bee") {
    const order = [...KR.karts].sort((a, b) => ktProg(b) - ktProg(a)), me = order.indexOf(k);
    const tgt = me > 0 ? order[me - 1] : null;
    ktShoot(k, "bee", k.x + fx * 2.6, k.z + fz * 2.6, fx * 40, fz * 40, tgt);
  }
  if (k.me && it !== "turbo" && it !== "shield") Sfx.play("lempar");
  if (k.me) { ktBuzz(it === "turbo" ? 22 : 12); if (it === "turbo") ktFlash("#FFB52E", 0.5); }
}
function ktShoot(owner, type, x, z, vx, vz, tgt) {
  const { T } = KR, i = ktNear(T, x, z, owner.idx, 12), g = new THREE.Group();
  if (type === "ball") { const s = new THREE.Mesh(SPH(0.55, 14, 10), ktMat("#E8473A", { emissive: "#3a0a00" })); s.position.y = 0.6; g.add(s); const st = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 6, 20), ktMat("#FFF3B0")); st.position.y = 0.6; g.add(st); }
  else if (type === "goo") { const s = new THREE.Mesh(SPH(1.4, 18, 8), ktMat("#1E1A26", { emissive: "#120c1c" })); s.scale.set(1, 0.08, 0.85); s.position.y = 0.06; g.add(s); const sh = new THREE.Mesh(SPH(0.5, 10, 6), new THREE.MeshBasicMaterial({ color: 0x8a6cff, transparent: true, opacity: 0.45 })); sh.scale.set(1, 0.05, 0.6); sh.position.set(0.3, 0.14, 0.2); g.add(sh); }
  else { const s = new THREE.Mesh(SPH(0.5, 14, 10), ktMat("#F7C531", { emissive: "#3a2a00" })); s.position.y = 1; g.add(s); const st = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.1, 6, 18), ktMat("#2B2235")); st.position.y = 1; st.rotation.y = Math.PI / 2; g.add(st); for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); w.position.set(sx * 0.45, 1.45, 0); w.rotation.z = sx * 0.4; g.add(w); } }
  g.position.set(x, T.y[i], z); KR.projG.add(g);
  (KR.proj = KR.proj || []).push({ type, x, z, vx, vz, i, g, t: 0, owner, tgt, life: type === "goo" ? 30 : type === "ball" ? 5 : 7 });
}
function ktHit(k, by) {
  if (k.fin) return;
  if (k.shield > 0) { k.shield = 0; if (k.me) Sfx.play("pas", 6); ktBurst(k, "w", 14); return; }
  k.spin = 1.15 / Math.pow(Math.max(1, k.wt || 1), 0.6); k.drift = 0; k.dT = 0; k.boost = 0;
  ktBurst(k, "w", 10);
  k.bv += 2;
  if (by && by.me && !k.me) { mgAdd(2); FC.kt.hits += 1; ktMsg(`Hit ${k.name}! +2`); FC.kt.slow = 0.12; ktBuzz(20); }
  if (k.me) { FC.kt.slow = 0.15; Sfx.play("spin"); ktBuzz([40, 30, 60]); FC.kt.shake = 0.4; }
}
function ktProjStep(dt) {
  const { T } = KR, P = KR.proj || [];
  for (const p of P) {
    p.t += dt;
    if (p.type === "bee" && p.tgt && !p.tgt.fin) {
      // lebah: nyusur lintasan, lalu belok ke target begitu dekat
      const d = Math.hypot(p.tgt.x - p.x, p.tgt.z - p.z);
      let ax, az;
      if (d < 18) { ax = (p.tgt.x - p.x) / d; az = (p.tgt.z - p.z) / d; }
      else { const j = (p.i + 14) % KT_N; ax = T.x[j] - p.x; az = T.z[j] - p.z; const l = Math.hypot(ax, az) || 1; ax /= l; az /= l; }
      const sp = 46; p.vx += (ax * sp - p.vx) * Math.min(1, dt * 6); p.vz += (az * sp - p.vz) * Math.min(1, dt * 6);
    }
    p.x += p.vx * dt; p.z += p.vz * dt;
    p.i = ktNear(T, p.x, p.z, p.i, 20);
    if (p.type === "ball") {
      const lat = ktLat(T, p.i, p.x, p.z);
      if (Math.abs(lat) > KT_WALL - 0.8) { const nx = T.nx[p.i], nz = T.nz[p.i], dn = p.vx * nx + p.vz * nz; if (dn * lat > 0) { p.vx -= 2 * dn * nx; p.vz -= 2 * dn * nz; } }
      p.g.rotation.y += dt * 8;
    }
    if (p.type === "bee") p.g.rotation.y = Math.atan2(p.vx, p.vz);
    p.g.position.set(p.x, T.y[p.i] + (p.type === "bee" ? Math.sin(p.t * 12) * 0.2 : 0), p.z);
    for (const k of KR.karts) {
      if (k.spin > 0 || k.fin || (k === p.owner && p.t < (p.type === "goo" ? 0.8 : 0.5))) continue;
      if (p.type === "bee" && p.tgt && k !== p.tgt) continue;
      const r = p.type === "goo" ? 2.2 : 1.6;
      if ((k.x - p.x) ** 2 + (k.z - p.z) ** 2 < r * r) { ktHit(k, p.owner); p.life = 0; break; }
    }
  }
  KR.proj = P.filter(p => { if (p.t < p.life) return true; KR.projG.remove(p.g); return false; });
}
function ktBurst(k, col, n) {
  for (let j = 0; j < n; j++) ktPart(col, k.x, k.y + 1, k.z, (Math.random() - 0.5) * 10, 3 + Math.random() * 5, (Math.random() - 0.5) * 10, 0.5, 0.5);
}
let KT_PI = 0;
function ktPart(col, x, y, z, vx, vy, vz, life, sz) {
  const p = KR.parts[KT_PI = (KT_PI + 1) % KR.parts.length];
  p.s.material = KR.PM[col]; p.s.visible = true; p.s.position.set(x, y, z); p.s.scale.setScalar(sz);
  Object.assign(p, { vx, vy, vz, t: 0, life, sz });
}
// getar HP (v84): pendek-pendek biar kerasa "nendang" tanpa ganggu; getaran kecil yang rapat dilewati
let KT_BZ = 0;
function ktBuzz(p) {
  const t = now(), big = Array.isArray(p) || p >= 20;
  if (!big && t - KT_BZ < 70) return;
  KT_BZ = t; try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* nggak didukung */ }
}
// kilat warna di pinggir layar (mini turbo, naik level percikan)
function ktFlash(col, a) { const K = FC.kt; if (reduce) return; K.flash = Math.max(K.flash, a); K.flashC = col; }
function ktMsg(t, dur = 1.4) { FC.kt.msg = t; FC.kt.msgT = dur; }

// ---------- fisika satu kart
function ktDrive(k, dt, s, hold) {
  const { T } = KR;
  if (k.spin > 0) {
    k.spin -= dt; k.v *= Math.max(0, 1 - 2.6 * dt); k.b.rotation.y += dt * 14;
    if (k.spin <= 0) k.b.rotation.y = 0;
  } else if (k.stall > 0) { k.stall -= dt; k.v = 0; }
  else {
    const lat = ktLat(T, k.idx, k.x, k.z), off = Math.abs(lat) > KT_HW + 1.3;
    let vmax = k.base * (1 + 0.01 * Math.min(10, k.coins)) * (k.vk || 1);
    if (off) vmax *= k.off || 0.55;
    if (k.boost > 0) { vmax *= off ? 1.6 : 1.42; k.boost -= dt; }
    if (FC.kt.end && k.me) vmax *= 0.6;
    if (k.v < vmax) k.v += Math.min(vmax - k.v, (10 + (vmax - k.v) * 0.7) * (k.boost > 0 ? 3 : 1) * (k.ac || 1) * dt);
    else k.v += (vmax - k.v) * Math.min(1, (off ? 3 : 1.4) * dt);
    const sf = Math.min(1, k.v / 10) * (1 - 0.2 * Math.min(1, k.v / 40));
    // drift: tahan belok tajam sebentar → mulai; lepas → turbo sesuai muatan
    if (k.me) {
      if (!k.drift) {
        if (hold && Math.abs(s) > 0.55 && k.v > 16) { k.sT += dt; if (k.sT > 0.18) { k.drift = Math.sign(s); k.dT = 0; k.hop = 0.18; Sfx.play("tangkap"); ktBuzz(10); } }
        else k.sT = 0;
      } else if (!hold || k.v < 12) {
        const lv = ktLv(k.dT);
        if (lv) { k.boost = Math.max(k.boost, [0, 0.8, 1.3, 1.9][lv]); FC.kt.mt = (FC.kt.mt || 0) + 1; if (FC.kt.tut) FC.kt.tutDone += 1; Sfx.play("turbo"); FC.kt.shake = 0.15 + lv * 0.05;
          ktBuzz([14, 30, 18 + lv * 12]); ktFlash(["", "#5FC8FF", "#FF9A2E", "#C45CFF"][lv], 0.55 + lv * 0.15); FC.kt.punch = Math.max(FC.kt.punch, 0.7 + lv * 0.25); ktMsg(["", "Mini turbo!", "Super turbo!", "Ultra turbo!"][lv], 0.9); }
        k.drift = 0; k.dT = 0; k.sT = 0;
      }
    }
    let rate;
    if (k.drift) {
      const tight = s * k.drift, lv0 = ktLv(k.dT);
      rate = k.drift * (1.2 + 0.7 * tight) * sf;
      k.dT += dt * (0.75 + 0.6 * Math.max(0, tight)) * (k.dc || 1);
      const lv = ktLv(k.dT); if (lv > lv0) { Sfx.play("pas", lv * 3); k.bv += 1.2; if (k.me) { ktBuzz(8 + lv * 6); ktFlash(["", "#5FC8FF", "#FF9A2E", "#C45CFF"][lv], 0.3); } if (!reduce) for (let j = 0; j < 12; j++) ktPart(["d", "b", "o", "p"][lv], k.x, k.y + 0.4, k.z, (Math.random() - 0.5) * 9, 2 + Math.random() * 4, (Math.random() - 0.5) * 9, 0.4, 0.55); }
    } else rate = 1.95 * s * sf;
    k.h -= rate * (k.tn || 1) * dt; k.sUse = s;
  }
  // kart licin (Dart): arah jalan nyusul arah moncong dengan telat, jadi kerasa ngepot di tikungan
  if (k.grip < 1 && k.spin <= 0) k.vh += ktWrap(k.h - k.vh) * Math.min(1, dt * (3 + 12 * k.grip)); else k.vh = k.h;
  const fx = Math.sin(k.vh), fz = Math.cos(k.vh);
  k.x += fx * k.v * dt; k.z += fz * k.v * dt;
  const prev = k.idx; k.idx = ktNear(T, k.x, k.z, k.idx);
  // dinding: dorong balik, kecepatan turun, arah dibelokin ke jalur
  const lat = ktLat(T, k.idx, k.x, k.z), lim = KT_WALL - 1.1;
  if (Math.abs(lat) > lim) {
    const push = lat - Math.sign(lat) * lim; k.x -= T.nx[k.idx] * push; k.z -= T.nz[k.idx] * push;
    // nabrak miring = cuma nyerempet: kecepatan turun sesuai sudut, arah dibelokin sejajar dinding
    const dh = ktWrap(T.h[k.idx] - k.h), imp = Math.min(1, Math.abs(Math.sin(dh)) * 1.7);
    k.h += dh * (0.18 + 0.3 * imp);
    if (k.wallT <= 0 && imp > 0.15) {
      k.v *= 1 - 0.34 * imp / Math.pow(k.wt || 1, 0.8); k.wallT = 0.35; k.vh = k.h; k.bv -= 2.2 * imp;
      if (k.me) { if (imp > 0.3) Sfx.play("dinding"); FC.kt.shake = 0.08 + 0.18 * imp; if (imp > 0.45) ktBuzz(25); }
    } else k.v *= 1 - 0.35 * dt;
    if (k.me && k.v > 8 && !reduce && Math.random() < 0.6) ktPart("o", k.x + T.nx[k.idx] * Math.sign(lat) * 0.9, k.y + 0.4, k.z + T.nz[k.idx] * Math.sign(lat) * 0.9, (Math.random() - 0.5) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 4, 0.3, 0.35);
  }
  k.wallT -= dt;
  // lap: wajib lewat tengah lintasan dulu biar nggak bisa curang mundur
  if (k.idx > KT_N * 0.45 && k.idx < KT_N * 0.55) k.half = true;
  if (prev > KT_N * 0.9 && k.idx < KT_N * 0.1) { if (k.half) { k.lap += 1; k.half = false; ktLap(k); } }
  else if (prev < KT_N * 0.1 && k.idx > KT_N * 0.9) { k.lap -= 1; k.half = true; }
  // tinggi ikut jalan, lompat kecil waktu mulai drift
  const a = k.idx, b = (a + 1) % KT_N, ty = T.y[a] + (T.y[b] - T.y[a]) * 0.5;
  const hop0 = k.hop; k.hop = Math.max(0, k.hop - dt);
  if (hop0 > 0 && k.hop === 0) k.bv -= 1.6;   // mendarat
  k.y = ty + (k.hop > 0 ? Math.sin((k.hop / 0.18) * Math.PI) * 0.35 : 0);
  // per: badan mantul pelan, digoyang curb dan rumput
  const al = Math.abs(lat);
  if (k.me && al > KT_HW && k.v > 8 && (FC.kt.rumT = (FC.kt.rumT || 0) - dt) <= 0) { FC.kt.rumT = al > KT_HW + 1.3 ? 0.14 : 0.09; ktBuzz(al > KT_HW + 1.3 ? 9 : 5); }
  if (al > KT_HW && k.v > 6) k.bv += (Math.random() - 0.5) * (al > KT_HW + 1.3 ? 9 : 14) * dt * Math.min(1, k.v / 20);
  k.bv += (-k.by * 110 - k.bv * 10) * dt; k.by += k.bv * dt;
  const acc = (k.v - k.vPrev) / Math.max(dt, 1e-3); k.vPrev = k.v;
  k.pitch += (Math.max(-0.08, Math.min(0.06, -acc * 0.006)) - k.pitch) * Math.min(1, dt * 6);
  k.shield = Math.max(0, k.shield - dt);
}
const ktLv = t => t > 2.4 ? 3 : t > 1.45 ? 2 : t > 0.7 ? 1 : 0;
function ktLap(k) {
  if (k.lap >= KT_LAPS && !k.fin) {
    k.fin = FC.kt.t;
    if (k.me) ktFinish();
    return;
  }
  if (k.me && k.lap > 0) { Sfx.play("lap"); ktBuzz(k.lap === KT_LAPS - 1 ? [30, 40, 30, 40, 50] : [25, 40, 25]); ktMsg(k.lap === KT_LAPS - 1 ? "FINAL LAP!" : `Lap ${k.lap + 1}`, 1.6); }
}
// ---------- hantu
// hantu per sirkuit (Meadow ring tetap di "best" biar rekaman lama kepakai)
const ktGhostSlot = () => FC.kt.course === "meadow" ? "best" : "best_" + FC.kt.course;
function ktGhostInit() {
  const K = FC.kt, G = ktGhostLoad(), d = today();
  const g = FC.daily ? (G.daily && G.daily.d === d ? G.daily : null) : G[ktGhostSlot()];
  if (KR.ghost) { KR.sc.remove(KR.ghost.g); KR.ghost = null; }
  if (!g || !g.f || g.f.length < 8) return;
  const mm = ktKartMesh("#ffffff", g.k), gm = new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.32, depthWrite: false });
  mm.g.traverse(o => { if (o.isMesh) o.material = gm; });
  mm.flame.visible = false; mm.bub.visible = false; mm.g.children.filter(o => o.material === KR.shadowM).forEach(o => { o.visible = false; });
  mm.g.children.forEach(o => { if (o.isMesh && o.geometry.type === "PlaneGeometry") o.visible = false; });
  KR.sc.add(mm.g);
  KR.ghost = { g: mm.g, f: g.f, t: g.t };
  K.ghostT = g.t;
}
function ktGhostStep() {
  const K = FC.kt, me = KR.karts[0], gh = KR.ghost;
  // rekam pemain tiap 0,1 detik (x, y, z, arah), dibulatkan biar kecil di storage
  if (K.cd <= 0 && !me.fin && K.t >= K.recT) { K.rec.push(+me.x.toFixed(1), +me.y.toFixed(2), +me.z.toFixed(1), +me.h.toFixed(2)); K.recT += KT_GHOST_DT; }
  if (!gh) return;
  const n = gh.f.length / 4, u = Math.max(0, K.cd > 0 ? 0 : K.t / KT_GHOST_DT), i = Math.min(n - 2, Math.floor(u)), a = Math.min(1, u - i), F = gh.f;
  const at = j => F[i * 4 + j] + (F[(i + 1) * 4 + j] - F[i * 4 + j]) * a;
  gh.g.visible = u < n - 1;
  gh.g.position.set(at(0), at(1), at(2)); gh.g.rotation.y = F[i * 4 + 3] + ktWrap(F[(i + 1) * 4 + 3] - F[i * 4 + 3]) * a;
}
function ktGhostKeep() {
  const K = FC.kt, me = KR.karts[0], G = ktGhostLoad(), d = today(), rec = { t: +me.fin.toFixed(2), k: K.kart, f: K.rec };
  let msg = null;
  if (K.ghostT) msg = me.fin < K.ghostT ? `Ghost beaten by ${(K.ghostT - me.fin).toFixed(1)}s!` : `Ghost was ${(me.fin - K.ghostT).toFixed(1)}s faster`;
  if (FC.daily) { if (!(G.daily && G.daily.d === d && G.daily.t <= rec.t)) G.daily = { d, ...rec }; }
  else { const sl = ktGhostSlot(); if (!(G[sl] && G[sl].t <= rec.t)) G[sl] = rec; }
  ktGhostSave(G);
  return msg;
}
function ktFinish() {
  const K = FC.kt, me = KR.karts[0];
  if (K.mt) Dapur.track(wallet(), "kartDrift", K.mt);
  K.ghostMsg = ktGhostKeep();
  const place = KR.karts.filter(k => k.fin && k.fin < me.fin).length;
  K.end = K.t; K.place = place; FC.place = place; me.drift = 0; K.slow = 0.45;
  mgAdd(KT_PTS[place]); Sfx.play(place === 0 ? "rekor" : "kombo", 5); ktBuzz([40, 40, 80]);
  ktMsg(place === 0 ? "You win!" : `${KT_ORD[place]} place`, 3);
  if (K.ghostMsg) ktMsg2(K.ghostMsg);
}
function ktMsg2(t) { FC.kt.msg2 = t; }

// ---------- otak CPU: ikut jalur dengan goyangan sesuai watak, ngerem di tikungan, karet gelang ke pemain
function ktCpu(k, dt) {
  const { T } = KR, me = KR.karts[0];
  const look = Math.round((9 + k.v * 0.42) / T.seg), j = (k.idx + look) % KT_N;
  k.laneNow += ((k.lane || 0) - k.laneNow) * Math.min(1, dt * 0.5);
  const lat = Math.max(-KT_HW + 1.5, Math.min(KT_HW - 1.5, k.laneNow + Math.sin(FC.kt.t * 0.7 + k.ph) * k.wob));
  const tx = T.x[j] + T.nx[j] * lat, tz = T.z[j] + T.nz[j] * lat;
  const diff = ktWrap(Math.atan2(tx - k.x, tz - k.z) - k.h);
  const s = Math.max(-1, Math.min(1, -diff * 2.4));
  const j2 = (k.idx + Math.round(32 / T.seg)) % KT_N, bend = Math.abs(ktWrap(T.h[j2] - T.h[k.idx]));
  const gap = ktProg(me) - ktProg(k);
  const rb = me.fin ? 0 : Math.max(-0.07, Math.min(0.11, gap / 650));
  k.vk = (1 - k.brake * 0.3 * Math.min(1, bend / 1.3)) * (1 + rb);
  // item: tunggu sebentar, pakai kalau masuk akal
  if (k.item && k.roll <= 0) {
    k.itemT -= dt;
    if (k.itemT <= 0) {
      const ahead = KR.karts.some(o => o !== k && ktProg(o) - ktProg(k) > 0 && ktProg(o) - ktProg(k) < 40 / T.seg * 1.5);
      const behind = KR.karts.some(o => o !== k && ktProg(k) - ktProg(o) > 0 && ktProg(k) - ktProg(o) < 30 / T.seg);
      if (k.item === "ball" ? ahead || FC.rnd() < 0.15 : k.item === "goo" ? behind || FC.rnd() < 0.1 : true) { if (FC.rnd() < k.aim + 0.3) ktUse(k); }
      k.itemT = 0.4 + FC.rnd() * 1.2;
    }
  }
  ktDrive(k, dt, s, false);
}

// ---------- tiap frame
function kartStep(dt) {
  const K = FC.kt, { r, cv } = KR;
  // ukuran kanvas 3D ikut layar
  const W = FC.el.clientWidth, H = FC.el.clientHeight;
  // three.js membulatkan ke bawah (floor): dibandingkan pakai round, rasio 1,25 atau 0,75 bikin setSize (alokasi ulang buffer) tiap frame
  if (cv.width !== Math.floor(W * r.getPixelRatio()) || cv.height !== Math.floor(H * r.getPixelRatio())) { r.setSize(W, H, false); }
  // kualitas adaptif: frame berat terus → resolusi turun; lancar lama → naik lagi pelan-pelan
  K.ft += (dt - K.ft) * 0.05; K.qT += dt;
  if (K.qT > 1.5) {
    K.qT = 0;
    if (K.ft > 1 / 42 && KR.pr > 0.6) { KR.pr = Math.max(0.6, KR.pr - 0.25); r.setPixelRatio(KR.pr); K.upT = 0; }
    else if (K.ft < 1 / 57 && KR.pr < KR.prMax) { K.upT += 1; if (K.upT >= 3) { KR.pr = Math.min(KR.prMax, KR.pr + 0.25); r.setPixelRatio(KR.pr); K.upT = 0; } }
    else K.upT = 0;
  }
  // gerak lambat sesaat (kena item, lewat garis finish)
  if (K.slow > 0) { K.slow -= dt; dt *= 0.35; }
  // langkah fisika dipecah kalau frame panjang, biar tabrakan dinding tetap rapi di HP lambat
  const n = Math.min(3, Math.ceil(dt / (1 / 55)));
  for (let i = 0; i < n; i++) ktSim(dt / n);
  ktDraw(dt, W, H);
}
function ktSim(dt) {
  const K = FC.kt, { T, karts } = KR, me = karts[0];
  K.t += dt;
  // hitung mundur 3-2-1-GO; tahan jari waktu "2" sampai GO = start roket, kecepetan = mesin mogok sebentar
  if (K.cd > 0) {
    K.cd -= dt; const n = Math.ceil(K.cd);
    if (n < K.beep && n >= 1) { K.beep = n; Sfx.play("beep", 0); ktBuzz(12); }
    if (K.cd <= 0) {
      Sfx.play("beep", 1); K.camH = me.h; ktBuzz(40);
      const held = K.hold || K.keyHold;
      if (held && K.rocket != null) { if (K.rocket <= 2) { me.boost = 1.1; ktMsg("Rocket start!", 1); Sfx.play("turbo"); ktBuzz([20, 20, 50]); ktFlash("#FFB52E", 0.6); } else { me.stall = 0.7; ktMsg("Too early!", 1); } }
      karts.forEach((k, n2) => { if (!k.me && FC.rnd() < 0.5) k.boost = 0.4 + 0.15 * n2; });
      K.t = 0;
    }
  }
  const go = K.cd <= 0;
  if (go) {
    const s = K.ptr != null ? K.s : (K.keyR ? 1 : 0) - (K.keyL ? 1 : 0), hold = K.ptr != null || K.keyL || K.keyR;
    // setir dihaluskan dikit: nggak kaku, tapi balik ke tengah tetap cepat
    me.sm += (s - me.sm) * Math.min(1, dt * (Math.abs(s) < Math.abs(me.sm) ? 16 : 10));
    const b0 = me.boost;
    if (me.fin) { ktCpu(me, dt); } else ktDrive(me, dt, me.sm, hold);
    if (b0 <= 0 && me.boost > 0) K.punch = 1;
    for (const k of karts) if (!k.me) ktCpu(k, dt);
    // tabrakan antar kart
    for (let a = 0; a < karts.length; a++) for (let b = a + 1; b < karts.length; b++) {
      const A = karts[a], B = karts[b], dx = B.x - A.x, dz = B.z - A.z, d2 = dx * dx + dz * dz;
      if (d2 < 4.4 && d2 > 1e-4) {
        // senggolan: yang lebih kencang ngedorong, dua-duanya mantul dikit; kart berat (Boulder) lebih susah digeser
        const ma = A.wt || 1, mb = B.wt || 1, fa = 2 * mb / (ma + mb), fb = 2 * ma / (ma + mb);
        const d = Math.sqrt(d2), o = (2.1 - d) / 2, nx = dx / d, nz = dz / d; A.x -= nx * o * fa; A.z -= nz * o * fa; B.x += nx * o * fb; B.z += nz * o * fb;
        const dv = (A.v - B.v) * 0.15; A.v -= dv * fa; B.v += dv * fb; A.bv += 0.8 * fa; B.bv += 0.8 * fb;
        if ((A.me || B.me) && !K.bumpT) { Sfx.play("dinding"); K.bumpT = 0.3; K.shake = Math.max(K.shake, 0.12); ktBuzz(15); }
      }
    }
    K.bumpT = Math.max(0, (K.bumpT || 0) - dt) || 0;
    // kotak item, koin, bantalan turbo
    for (const bx of KR.boxes) {
      if (bx.dead > 0) { bx.dead -= dt; if (bx.dead <= 0) bx.m.visible = true; continue; }
      for (const k of karts) if ((k.x - bx.x) ** 2 + (k.z - bx.z) ** 2 < 3.2) {
        bx.dead = 2.5; bx.m.visible = false;
        if (!k.item && k.roll <= 0) { k.item = ktRoll(k); k.roll = k.me ? 0.9 : 0.5; if (k.me) { Sfx.play("kotak"); ktBuzz(15); } }
        for (let j = 0; j < 8; j++) ktPart("w", bx.x, bx.y + 1, bx.z, (Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8, 0.5, 0.5);
        break;
      }
    }
    for (const c of KR.coins) {
      if (c.dead) continue;
      for (const k of karts) if ((k.x - c.x) ** 2 + (k.z - c.z) ** 2 < 3.0 && Math.abs(k.y - c.y) < 2) {
        c.dead = true; c.m.visible = false; k.coins += 1;
        if (k.me) { mgAdd(1); FC.caught += 1; Sfx.play("koin"); ktBuzz(6); const D = FC.drop; if (D && !D.done && FC.caught >= D.at) { D.done = true; mgPick(D.kind); } }
        break;
      }
    }
    for (const k of karts) for (const p of KR.pads) {
      const di = Math.abs(((k.idx - p.i + KT_N + KT_N / 2) % KT_N) - KT_N / 2);
      if (di < 3 && Math.abs(ktLat(T, k.idx, k.x, k.z) - p.lat) < 2.4 && k.spin <= 0) { if (k.boost < 0.6 && k.me) { Sfx.play("turbo"); ktBuzz(22); ktFlash("#FFB52E", 0.45); } k.boost = Math.max(k.boost, 0.9); }
    }
    for (const k of karts) if (k.roll > 0) k.roll -= dt;
    ktProjStep(dt);
    // salah arah
    K.wrong = Math.abs(ktWrap(T.h[me.idx] - me.h)) > 1.9 && me.v > 4 ? K.wrong + dt : 0;
    // CPU yang belum finish waktu pemain udah selesai lama: urutannya pakai posisi sekarang
    if (K.end && K.t - K.end > 2.8 && !FC.over) { FC.over = now(); FC.cont = true; ktSnap(); kartStop(); }
    if (!K.end && K.t > 240) { const pl = ktRank(me); K.end = K.t; K.place = pl; FC.place = pl; mgAdd(KT_PTS[pl]); ktMsg("Time!", 2); }
    ktMarks();
  }
  ktGhostStep();
}
// jejak ban di roda belakang waktu drift atau muter
function ktMarks() {
  for (const k of KR.karts) {
    if (!((k.drift || k.spin > 0 || Math.abs(ktWrap(k.h - k.vh)) > 0.1) && k.v > 6 && k.hop <= 0)) { k.mark = null; continue; }
    if (k.mark && (k.x - k.mark[0]) ** 2 + (k.z - k.mark[1]) ** 2 < 0.5) continue;
    k.mark = [k.x, k.z];
    const yaw = k.h + k.b.rotation.y, bx = Math.sin(yaw), bz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    for (const sd of [-0.92, 0.92]) {
      const m = KR.marks[KR.mi = (KR.mi + 1) % KR.marks.length];
      m.position.set(k.x - bx * 0.85 + rx * sd, k.y - (k.hop > 0 ? 0.3 : 0) + 0.035, k.z - bz * 0.85 + rz * sd); m.rotation.y = yaw; m.visible = true;
    }
  }
}
function ktDraw(dt, W, H) {
  const K = FC.kt, { T, karts, r, sc, cam } = KR, me = karts[0], go = K.cd <= 0;
  for (const k of karts) {
    k.g.position.set(k.x, k.y, k.z); k.g.rotation.y = k.h;
    const tgtYaw = k.spin > 0 ? k.b.rotation.y : k.drift * 0.42, lean = k.drift ? -k.drift * 0.1 : -(k.sUse || 0) * Math.min(1, k.v / 25) * 0.07;
    if (k.spin <= 0) k.b.rotation.y += (tgtYaw - k.b.rotation.y) * Math.min(1, dt * 10);
    k.b.rotation.z += (lean - k.b.rotation.z) * Math.min(1, dt * 8);
    k.b.rotation.x = k.pitch; k.b.position.y = k.by; k.b.scale.set(1 - k.by * 0.25, 1 + k.by * 0.5, 1 - k.by * 0.25);
    for (const w of k.wheels) w.rotation.x += k.v * dt * 2.4;
    k.flame.visible = k.boost > 0; if (k.boost > 0) k.flame.scale.set(1, 1, 0.7 + Math.random() * 0.6);
    k.bub.visible = k.shield > 0; if (k.shield > 0) k.bub.material.opacity = 0.2 + 0.1 * Math.sin(K.t * 10) + (k.shield < 2 ? 0.15 * Math.sin(K.t * 30) : 0);
    // percikan drift dari roda belakang
    if (k.drift && !reduce) {
      const lv = ktLv(k.dT), col = ["d", "b", "o", "p"][lv], bx = Math.sin(k.h), bz = Math.cos(k.h), rx = Math.cos(k.h), rz = -Math.sin(k.h);
      for (const sd of [-0.9, 0.9]) if (Math.random() < 0.8) ktPart(col, k.x - bx * 1.0 + rx * sd, k.y + 0.3, k.z - bz * 1.0 + rz * sd, (Math.random() - 0.5) * 3 - bx * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 3 - bz * 2, 0.35, lv ? 0.5 : 0.7);
    }
    if (Math.abs(ktLat(T, k.idx, k.x, k.z)) > KT_HW + 1.3 && k.v > 8 && Math.random() < 0.5 && !reduce) ktPart("d", k.x - Math.sin(k.h) * 1.2, k.y + 0.3, k.z - Math.cos(k.h) * 1.2, (Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2, 0.6, 0.9);
  }
  for (const p of KR.parts) {
    if (!p.s.visible) continue;
    p.t += dt; if (p.t >= p.life) { p.s.visible = false; continue; }
    p.vy -= 9 * dt; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
    const f = 1 - p.t / p.life; p.s.scale.setScalar(p.sz * (0.4 + f));
  }
  for (const bx of KR.boxes) { bx.m.rotation.y += dt * 1.6; bx.m.rotation.x = Math.sin(K.t * 1.3) * 0.3; bx.m.position.y = bx.y + 1.1 + Math.sin(K.t * 2.5 + bx.x) * 0.15; }
  for (const c of KR.coins) c.m.rotation.y += dt * 4;
  if (KR.cur.water) { KR.cur.water.offset.x += dt * 0.012; KR.cur.water.offset.y = Math.sin(K.t * 0.5) * 0.02; }
  // kamera: arah kamera ngikut arah kart dengan sedikit telat (kerasa pas belok), intro muter dari depan grid,
  // habis finish muter pelan di sekitar pemain
  K.camH += ktWrap(me.h - K.camH) * Math.min(1, dt * (me.drift ? 3.5 : 5));
  const ch = K.camH, fx = Math.sin(ch), fz = Math.cos(ch), hx = Math.sin(me.h), hz = Math.cos(me.h), aspect = W / Math.max(1, H);
  let px, py, pz, lx, ly, lz, snap = false;
  if (K.end) { const a = me.h + Math.PI * 0.75 + (K.t - K.end) * 0.6; px = me.x + Math.sin(a) * 8.5; pz = me.z + Math.cos(a) * 8.5; py = me.y + 4; lx = me.x; ly = me.y + 1; lz = me.z; }
  else if (K.cd > 3) {
    const u = Math.min(1, (K.cd - 3) / K.intro), e = u * u * (3 - 2 * u), a = me.h + Math.PI * e, R = 7.5 + 7 * e;
    px = me.x - Math.sin(a) * R; pz = me.z - Math.cos(a) * R; py = me.y + 3 + 3 * e; lx = me.x; ly = me.y + 1.2; lz = me.z; snap = true;
  } else if (!go) { px = me.x - hx * 7.5; pz = me.z - hz * 7.5; py = me.y + 3; lx = me.x + hx * 5; ly = me.y + 1.2; lz = me.z + hz * 5; }
  else { const back = 7.2 + Math.min(1, me.v / 30) * 0.8 + K.punch * 0.8; px = me.x - fx * back; pz = me.z - fz * back; py = me.y + 3.1 - K.punch * 0.3; lx = me.x + hx * 6; ly = me.y + 1.2; lz = me.z + hz * 6; }
  if (!K.camP) K.camP = new THREE.Vector3(px, py, pz);
  K.punch = Math.max(0, K.punch - dt * 2);
  const kk = snap ? 1 : 1 - Math.exp(-dt * (K.end ? 3 : 10)); K.camP.x += (px - K.camP.x) * kk; K.camP.y += (py - K.camP.y) * kk; K.camP.z += (pz - K.camP.z) * kk;
  cam.position.copy(K.camP);
  K.shake = Math.max(0, K.shake - dt);
  if (K.shake > 0 && !reduce) { cam.position.x += (Math.random() - 0.5) * K.shake * 1.2; cam.position.y += (Math.random() - 0.5) * K.shake * 0.8; }
  cam.lookAt(lx, ly, lz);
  const fov = (aspect < 1 ? 74 : 62) + (me.boost > 0 ? 8 : 0) + Math.min(1, me.v / 32) * 4 + K.punch * 6;
  if (Math.abs(cam.fov - fov) > 0.05 || cam.aspect !== aspect) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 5); cam.aspect = aspect; cam.updateProjectionMatrix(); }
  r.render(sc, cam);
  // suara mesin ikut kecepatan
  if (go && !FC.over) Sfx.motor(70 + me.v * 4.2 + (me.boost > 0 ? 50 : 0) + (me.drift ? 15 : 0), me.drift || me.spin > 0 ? 0.6 + 0.2 * ktLv(me.dT) : 0);
  ktHud(dt);
}
// gambar terakhir 3D ke kanvas dunia, biar kartu Share punya latar
function ktSnap() {
  const bg = $("mgBg"); if (!bg || !KR) return;
  KR.r.render(KR.sc, KR.cam);
  bg.width = KR.cv.width; bg.height = KR.cv.height; bg.getContext("2d").drawImage(KR.cv, 0, 0);
}

// ---------- HUD 2D di atas adegan
function ktPill(ctx, x, y, w, h, fill) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, h / 2) : ctx.rect(x, y, w, h); ctx.fillStyle = fill; ctx.fill(); }
function ktHud(dt) {
  const { ctx, cv, dpr } = FC, W = cv.width, H = cv.height, K = FC.kt, { karts, T, cam } = KR, me = karts[0];
  const top = 64 * dpr, f = px => `900 ${px * dpr}px system-ui, sans-serif`;
  ctx.save(); ctx.lineJoin = "round"; ctx.textBaseline = "middle";
  const txt = (t, x, y, px, col, al = "center", sw = 5) => { ctx.textAlign = al; ctx.font = f(px); ctx.lineWidth = sw * dpr; ctx.strokeStyle = OUTL; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); };
  // label nama CPU di atas kart yang dekat
  const v = new THREE.Vector3();
  for (const k of karts) {
    if (k.me || K.cd > 3) continue;
    const d = Math.hypot(k.x - me.x, k.z - me.z); if (d > 55) continue;
    v.set(k.x, k.y + 2.6, k.z).project(cam); if (v.z > 1 || v.z < -1) continue;
    const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H, a = Math.max(0, Math.min(1, (55 - d) / 15));
    ctx.globalAlpha = a; ktPill(ctx, x - 26 * dpr, y - 11 * dpr, 52 * dpr, 22 * dpr, k.col); ctx.globalAlpha = a; txt(k.name, x, y + 1 * dpr, 12, "#fff", "center", 3); ctx.globalAlpha = 1;
  }
  // posisi + lap (kiri atas)
  const rank = K.place != null ? K.place : ktRank(me);
  txt(KT_ORD[rank], 18 * dpr, top + 26 * dpr, 44, rank === 0 ? "#FFE36B" : "#FFFFFF", "left", 7);
  ctx.font = f(44); const rw = ctx.measureText(KT_ORD[rank]).width;
  txt(`/${karts.length}`, 22 * dpr + rw, top + 34 * dpr, 18, "#FFFFFF", "left", 4);
  const lapN = Math.max(1, Math.min(KT_LAPS, me.lap + 1));
  ktPill(ctx, 16 * dpr, top + 56 * dpr, 92 * dpr, 26 * dpr, "rgba(20,14,30,.6)");
  txt(`LAP ${lapN}/${KT_LAPS}`, 62 * dpr, top + 69 * dpr, 14, "#FFFFFF", "center", 0.01);
  // skor + koin
  ktPill(ctx, 16 * dpr, top + 88 * dpr, 92 * dpr, 26 * dpr, "rgba(20,14,30,.6)");
  txt(`★ ${FC.score}`, 62 * dpr, top + 101 * dpr, 14, "#FFE36B", "center", 0.01);
  txt(`${FC.daily ? "Daily" : Dapur.TIERS[K.lvl]} cup · ${KR.cur.C.name}${KR.ghost ? " · 👻" : ""}`, 18 * dpr, top + 128 * dpr, 11, "#FFFFFF", "left", 3);
  // slot item (kanan atas, di bawah tombol)
  const ix = W - 56 * dpr, iy = top + 40 * dpr, ir = 34 * dpr;
  if (!K.end) {
  ctx.beginPath(); ctx.arc(ix, iy, ir, 0, 7); ctx.fillStyle = "rgba(255,248,236,.92)"; ctx.fill(); ctx.lineWidth = 4 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
  if (me.roll > 0) { const ks = Object.keys(KT_ITEM); stamp(ctx, KT_ITEM[ks[Math.floor(K.t * 14) % ks.length]], ix, iy, 34 * dpr); }
  else if (me.item) { const p = 1 + 0.06 * Math.sin(K.t * 8); stamp(ctx, KT_ITEM[me.item], ix, iy, 38 * dpr * p); txt("TAP", ix, iy + ir + 12 * dpr, 12, "#FFFFFF", "center", 3); }
  }
  // peta mini (kiri bawah)
  const mw = 96 * dpr, mx0 = 16 * dpr, my0 = H - mw - 22 * dpr;
  if (!KR.mm) { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (let i = 0; i < KT_N; i++) { a = Math.min(a, T.x[i]); b = Math.max(b, T.x[i]); c = Math.min(c, T.z[i]); d = Math.max(d, T.z[i]); } KR.mm = { a, b, c, d, s: 1 / Math.max(b - a, d - c) }; }
  const MM = KR.mm, mp = (x, z) => [mx0 + mw / 2 + (x - (MM.a + MM.b) / 2) * MM.s * mw, my0 + mw / 2 - (z - (MM.c + MM.d) / 2) * MM.s * mw];
  ctx.beginPath(); for (let i = 0; i <= KT_N; i += 6) { const [x, y] = mp(T.x[i % KT_N], T.z[i % KT_N]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
  ctx.lineWidth = 7 * dpr; ctx.strokeStyle = "rgba(20,14,30,.55)"; ctx.stroke(); ctx.lineWidth = 3.5 * dpr; ctx.strokeStyle = "#F4F1EA"; ctx.stroke();
  for (const k of [...karts].reverse()) { const [x, y] = mp(k.x, k.z); ctx.beginPath(); ctx.arc(x, y, (k.me ? 5 : 4) * dpr, 0, 7); ctx.fillStyle = k.col; ctx.fill(); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = OUTL; ctx.stroke(); }
  // speedometer kecil (kanan bawah)
  txt(`${Math.round(me.v * 3.6)}`, W - 22 * dpr, H - 46 * dpr, 30, me.boost > 0 ? "#FFB52E" : "#FFFFFF", "right", 5);
  txt("km/h", W - 22 * dpr, H - 22 * dpr, 12, "#FFFFFF", "right", 3);
  // kilat warna di pinggir layar (mini turbo)
  if (K.flash > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.55);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, K.flashC); ctx.globalAlpha = Math.min(1, K.flash); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    K.flash = Math.max(0, K.flash - dt * 2.4);
  }
  // garis kecepatan waktu turbo (warna ikut kilat terakhir)
  if (me.boost > 0 && !reduce) {
    ctx.strokeStyle = K.flash > 0.05 ? K.flashC : "rgba(255,255,255,.5)"; ctx.globalAlpha = K.flash > 0.05 ? 0.7 : 1; ctx.lineWidth = 2 * dpr;
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, r0 = Math.min(W, H) * (0.35 + Math.random() * 0.2), r1 = r0 + 60 * dpr; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H * 0.55 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * r1, H * 0.55 + Math.sin(a) * r1); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // jempol: tanda arah belok
  if (K.ptr != null && !K.end) {
    const y = H - 70 * dpr, R = 58 * dpr;
    ktPill(ctx, W / 2 - R - 14 * dpr, y - 7 * dpr, (R + 14 * dpr) * 2, 14 * dpr, "rgba(20,14,30,.35)");
    ctx.beginPath(); ctx.arc(W / 2 + K.s * R, y, 16 * dpr, 0, 7); ctx.fillStyle = me.drift ? ["#fff", "#5FC8FF", "#FF9A2E", "#C45CFF"][ktLv(me.dT)] : "#FFF8EC"; ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
  }
  // hitung mundur, pesan, salah arah
  // nama sirkuit + kart waktu kamera intro muter
  if (K.cd > 3 && K.intro > 0.5) {
    const a = Math.min(1, (K.cd - 3) / 0.3), C = KR.cur.C, KT = KT_KARTS.find(k => k.id === K.kart);
    ctx.globalAlpha = a; txt(`${C.icon} ${C.name}`, W / 2, H * 0.22, 34, "#FFFFFF", "center", 7); txt(`${KT.icon} ${KT.name} · ${KT_LAPS} laps`, W / 2, H * 0.22 + 36 * dpr, 15, "#FFE36B", "center", 4); ctx.globalAlpha = 1;
  }
  if (K.cd > 0) {
    const n = Math.ceil(K.cd), p = 1 + (1 - (K.cd % 1)) * 0.3;
    if (n >= 1 && n <= 3) txt(String(n), W / 2, H * 0.36, 96 * p, ["", "#5BD07A", "#FFE36B", "#FF7A85"][n], "center", 10);
    if (K.hint) { ktPill(ctx, W / 2 - 160 * dpr, H * 0.52 - 40 * dpr, 320 * dpr, 92 * dpr, "rgba(20,14,30,.65)"); txt("Drag left/right to steer", W / 2, H * 0.52 - 18 * dpr, 16, "#fff", "center", 0.01); txt("Hold a sharp turn to drift, let go to boost", W / 2, H * 0.52 + 6 * dpr, 13, "#FFE36B", "center", 0.01); txt("Tap to use an item · hold on 2 for a rocket start", W / 2, H * 0.52 + 28 * dpr, 12, "#CDB8FF", "center", 0.01); }
  } else if (K.t < 0.8 && !K.end) txt("GO!", W / 2, H * 0.36, 96 * (1 + K.t * 0.4), "#5BD07A", "center", 10);
  if (K.end && K.msg2) txt(K.msg2, W / 2, (W > H ? H * 0.22 : H * 0.3) + 40 * dpr, 16, K.msg2.startsWith("Ghost beaten") ? "#7FF3A0" : "#CDB8FF", "center", 4);
  if (K.msgT > 0) { K.msgT -= dt; ctx.globalAlpha = Math.min(1, K.msgT * 3); txt(K.msg, W / 2, H * (K.end ? (W > H ? 0.22 : 0.3) : 0.25), K.end ? 46 : 30, "#FFFFFF", "center", 7); ctx.globalAlpha = 1; }
  if (K.wrong > 1) txt("↺ WRONG WAY", W / 2, H * 0.42, 28, "#FF7A85", "center", 6);
  // petunjuk drift (balapan awal): tikungan tajam di depan → "tahan", lagi drift → "terus", muatan cukup → "lepas!"
  if (K.tut && K.cd <= 0 && !K.end && K.tutDone < KT_TUT && K.msgT <= 0 && me.spin <= 0) {
    let line = null, sub = null, col = "#FFFFFF";
    if (me.drift) {
      const lv = ktLv(me.dT);
      if (lv) { line = "LET GO!"; sub = "Lift your thumb for a turbo"; col = ["", "#5FC8FF", "#FF9A2E", "#C45CFF"][lv]; }
      else { line = "Keep holding…"; sub = "Wait for blue sparks"; }
    } else if (me.v > 16) {
      const j = (me.idx + Math.round(26 / T.seg)) % KT_N, dh = ktWrap(T.h[j] - T.h[me.idx]);
      if (Math.abs(dh) > 0.75) { line = dh < 0 ? "Hold & drag right →" : "← Hold & drag left"; sub = "Steer hard into the turn to drift"; col = "#FFE36B"; }
    }
    if (line) {
      const p = me.drift && ktLv(me.dT) ? 1 + 0.08 * Math.sin(K.t * 18) : 1, y = W > H ? H * 0.7 : H * 0.66;
      ktPill(ctx, W / 2 - 150 * dpr, y - 30 * dpr, 300 * dpr, 64 * dpr, "rgba(20,14,30,.6)");
      txt(line, W / 2, y - 8 * dpr, 24 * p, col, "center", 5); txt(sub, W / 2, y + 18 * dpr, 12, "#FFFFFF", "center", 3);
    }
  }
  // urutan akhir
  if (K.end) {
    const order = [...karts].sort((a, b) => ktProg(b) - ktProg(a)), y0 = Math.min(H * 0.5, H - (karts.length * 40 + 16) * dpr), a = Math.min(1, (K.t - K.end) / 0.5);
    order.forEach((k, i) => { const y = y0 + i * 40 * dpr, x = W / 2 - 120 * dpr + (1 - a) * W; ktPill(ctx, x, y, 240 * dpr, 32 * dpr, k.me ? "#FFE36B" : "rgba(255,248,236,.92)"); ctx.textAlign = "left"; ctx.font = f(15); ctx.fillStyle = OUTL; ctx.fillText(`${KT_ORD[i]}   ${k.name}`, x + 16 * dpr, y + 17 * dpr); ctx.textAlign = "right"; ctx.fillText(k.fin ? `${k.fin.toFixed(1)}s` : "…", x + 224 * dpr, y + 17 * dpr); });
  }
  ctx.restore();
}
// ---------- garasi (v84): pilih sirkuit + kart sebelum balapan. Muncul tiap buka Kart cup dan dari tombol Garage di kartu akhir.
// Tantangan harian: sirkuitnya ikut tanggal (sama buat semua), kartnya bebas.
function ktGarage(daily) {
  const P = ktPick(), best = wallet().best.kart || 0, ix = Dapur.tier("kart", best).ix;
  if ((P.seen || 0) < ix) { P.seen = ix; ktPickSave(P); }
  const dc = daily ? ktDailyCourse(today()) : P.c, g = MG_GAMES.kart;
  const kt = KT_KARTS.find(k => k.id === P.k && ktKartOpen(k, best)) || KT_KARTS[0];
  return `<div class="pp-head${daily ? " pp-gold" : ""}">${daily ? "Today's challenge" : "Garage"}</div>
    <div class="kt-gar"><small class="kt-lbl">${daily ? "Today's track" : "Track"}</small>
    <div class="kt-opts">${KT_COURSES.map(c => `<button class="kt-opt${c.id === dc ? " on" : ""}" data-c="${c.id}"${daily && c.id !== dc ? " disabled" : ""}><i>${c.icon}</i><b>${c.name}</b></button>`).join("")}</div>
    <small class="kt-lbl">Kart</small>
    <div class="kt-opts kt-k">${KT_KARTS.map(k => { const open = ktKartOpen(k, best); return `<button class="kt-opt${k.id === kt.id ? " on" : ""}${open ? "" : " lock"}" data-k="${k.id}"><i>${open ? k.icon : "🔒"}</i><b>${k.name}</b></button>`; }).join("")}</div>
    <div class="kt-info" id="ktInfo">${ktInfo(kt, best)}</div></div>
    ${best ? "" : `<small>${g.how}</small>`}<button class="choice yes pp-big" id="mgPlay">▶ Race</button>`;
}
function ktInfo(k, best) {
  if (!ktKartOpen(k, best)) { const T = Dapur.tier("kart", best); return `<b>${k.icon} ${k.name}</b><em>${k.desc}</em><span class="kt-need">🔒 Reach ${Dapur.TIERS[k.tier]} in Kart cup to unlock${T.ix + 1 === k.tier ? ` (${T.need} more points)` : ""}</span>`; }
  return `<b>${k.icon} ${k.name}</b><em>${k.desc}</em><span class="kt-st">${KT_STAT.map((n, i) => `<span>${n}<u>${"<i></i>".repeat(k.st[i])}${"<i class=o></i>".repeat(5 - k.st[i])}</u></span>`).join("")}</span>`;
}
function ktGarageWire() {
  const card = $("mgCard"), best = wallet().best.kart || 0;
  card.querySelectorAll("[data-c]").forEach(b => { b.onclick = () => { if (b.disabled) return; const P = ktPick(); P.c = b.dataset.c; ktPickSave(P); card.querySelectorAll("[data-c]").forEach(x => x.classList.toggle("on", x === b)); Sfx.play("ui"); }; });
  card.querySelectorAll("[data-k]").forEach(b => { b.onclick = () => {
    const k = KT_KARTS.find(x => x.id === b.dataset.k); $("ktInfo").innerHTML = ktInfo(k, best);
    if (!ktKartOpen(k, best)) { b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope"); return; }
    const P = ktPick(); P.k = k.id; ktPickSave(P); card.querySelectorAll("[data-k]").forEach(x => x.classList.toggle("on", x === b));
  }; });
  $("mgPlay").onclick = mgRun;
}
// kart yang baru kebuka dan belum dilihat di garasi (buat chip "New kart" + tombol Garage nyala di kartu akhir)
function ktNewKart(W) { const P = ktPick(), best = W.best.kart || 0; return KT_KARTS.filter(k => k.tier > (P.seen || 0) && ktKartOpen(k, best)).pop() || null; }
function ktGarageShow() { mgCard(ktGarage(FC.daily)); ktGarageWire(); }
// dunia kanvas belakang: kosong, adegan 3D yang jadi dunianya
Object.assign(WORLDS, { kart: () => {} });

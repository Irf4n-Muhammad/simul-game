// ================================================================ v89: Kamar hangat (desktop, dalam kamar panjang ui/38j-kamar.js)
// Malam: kamar gelap, cahaya dari lampu kecil (lampu tali di dinding, lilin di nakas, lampu berdiri, layar laptop), jendela biasa (rumah
// deret Old Town, bukan dinding kaca) dengan pemandangan kota yang ikut jam dan cuaca asli. Hal kecil yang hidup: lilin bergoyang, lampu
// tali berkedip pelan, jendela tetangga nyala-mati, uap dari cangkir, tetes hujan turun di kaca, kilat waktu badai.
// Bisa diklik: lampu berdiri, gorden (atau jendelanya), lilin, makhluk (poke biasa), pet.
// Makhluk ikut jam: baca buku di sofa (sore/malam), duduk di meja (sesi fokus = selalu di meja), lihat hujan dari sofa di bawah jendela,
// jam 23 sampai 6 tutup gorden, nguap, tidur di kasur (lampu meredup); pagi buka gorden, sinar masuk.
// Dipanggil dari: kpCam (khDress, sekali per grup ruangan), kpFrame (khStep + khFrame), applyLight di ui/03-scene.js (khWarm),
// pointerup/pointermove di ui/08-input.js (khTap, khHover), kpExit (khExit).
const KH = { act: null, y: 0, z: 0, lie: 0, flash: 0, boltAt: 0, nbAt: 0, mainV: 0, candle: null, curT: 1, curV: 1, hoverAt: 0, napped: false, wokeSay: false, fakeH: null, book: null, pano: null, panoKey: "" };
// pagi/siang: bukan terang rata dari mana-mana, tapi kamar agak redup yang diterangi sinar matahari hangat dari jendela (khSun)
const KH_MOOD = { night: { hemi: 0.05, sunI: 0.05, exp: 1.0, env: 0.05, lamp: 1.0 }, evening: { hemi: 0.16, sunI: 0.7, exp: 0.88, env: 0.3, lamp: 1.6 },
  morning: { hemi: 0.1, sunI: 0.4, exp: 0.95, env: 0.17, lamp: 0, sun: 0xffb878 }, day: { hemi: 0.12, sunI: 0.45, exp: 0.95, env: 0.2, lamp: 0, sun: 0xffcf98 } };
const KH_WALL = { night: [0.6, 0.6, 0.6], evening: [0.85, 0.85, 0.85], morning: [1.0, 0.84, 0.66], day: [1.0, 0.87, 0.7] };
const KH_SUN = { morning: [0xffb877, 11, 1.2], day: [0xffcf8f, 9, 1], evening: [0xffb27a, 0.6, 0.12], night: [0x6f86c9, 1.4, 0] };   // [warna, kuat sorot, terang berkas+petak lantai]
const khH = () => { const r = ROOMS[0]; return kamarOn() && r ? r.g.userData.kh || null : null; };
const khHour = () => { if (KH.fakeH !== null) return KH.fakeH; const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
const khBed = () => { const h = khHour(); return h >= 23 || h < 6; };
const khDark = () => litName === "night" || litName === "evening";
const khHaloTex = canvasTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 128, 128);
const khBeamTex = canvasTex((g, w, h) => { for (let y = 0; y < h; y++) { const a = Math.pow(y / h, 0.8) * 0.9; const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.25, `rgba(255,255,255,${a})`); gr.addColorStop(0.75, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, h - 1 - y, w, 1); } }, 64, 128);
const khPaneTex = canvasTex((g, w, h) => { g.filter = "blur(6px)"; g.fillStyle = "#fff"; const m = 10, gp = 7; for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.fillRect(m + x * (w / 2 - m + gp / 2), m + y * (h / 2 - m + gp / 2), w / 2 - m - gp, h / 2 - m - gp); }, 128, 128);
const khSteamTex = canvasTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 64, 64);

// ---- pemandangan Old Town: satu panorama selebar kamar (tidak diunggah), tiap jendela dapat potongannya sendiri (kanvas kecil)
const KH_SKY = {
  night: ["#0B1026", "#1B2348", "#3B3256", "#5A3C4E"], nightWet: ["#10141F", "#1D2433", "#283041", "#3A3340"], nightGrey: ["#151A2A", "#252B3D", "#30344A", "#3A3646"],
  evening: ["#3E3A66", "#B9708A", "#F2A774", "#F7C89A"], eveningWet: ["#3B3C52", "#5E5868", "#7A6C74", "#8C7478"], eveningGrey: ["#5A5470", "#8C7888", "#B8968E", "#D8A888"],
  morning: ["#9EC1DE", "#D9D2CC", "#F3D2B4", "#F7E2C8"], day: ["#7FB0DA", "#A6C9E6", "#BCD8EC", "#E4EEF3"], dayWet: ["#6E7886", "#8A939E", "#9AA3AE", "#B8BEC6"], dayGrey: ["#9AA6B2", "#B2BBC4", "#C4CCD4", "#DDE2E6"],
};
const KH_FACADE = ["#C98E6B", "#B9805E", "#D9B48C", "#8E6A5A", "#A98C7A", "#C7A27E", "#9C6B55"];
function khPano(p, wx) {
  const c = document.createElement("canvas"), w = 3072, h = 1024; c.width = w; c.height = h; const g = c.getContext("2d"), rects = [];
  let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const night = p === "night", eve = p === "evening", dark = night || eve, wet = wx === "rain" || wx === "storm", grey = !wet && wx && wx !== "clear";
  const base = night ? "night" : eve ? "evening" : p === "morning" && !wet && !grey ? "morning" : "day";
  const stops = KH_SKY[base + (wet ? "Wet" : grey ? "Grey" : "")] || KH_SKY[base];
  const sky = g.createLinearGradient(0, 0, 0, h); stops.forEach((col, i) => sky.addColorStop([0, 0.5, 0.8, 1][i], col)); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  if (night && !wet && !grey) {
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,248,230,${0.3 + rnd() * 0.6})`; g.beginPath(); g.arc(rnd() * w, rnd() * h * 0.55, 0.8 + rnd() * 1.6, 0, 7); g.fill(); }
    const mx = w * 0.62, my = h * 0.42, halo = g.createRadialGradient(mx, my, 10, mx, my, 160); halo.addColorStop(0, "rgba(255,240,210,.45)"); halo.addColorStop(1, "rgba(255,240,210,0)"); g.fillStyle = halo; g.fillRect(mx - 170, my - 170, 340, 340);
    g.fillStyle = "#FFF4DC"; g.beginPath(); g.arc(mx, my, 30, 0, 7); g.fill();
  }
  if (!wet && !grey && (eve || p === "morning")) { g.fillStyle = eve ? "rgba(255,226,170,.9)" : "rgba(255,240,215,.85)"; g.beginPath(); g.arc(w * (eve ? 0.3 : 0.12), h * 0.6, 50, 0, 7); g.fill(); }
  if (wet || grey) { g.fillStyle = dark ? "rgba(60,66,84,.55)" : "rgba(235,238,242,.5)"; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(rnd() * w, rnd() * h * 0.5, 160 + rnd() * 200, 40 + rnd() * 40, 0, 0, 7); g.fill(); } }
  else if (!night) { g.fillStyle = eve ? "rgba(255,200,170,.45)" : "rgba(255,255,255,.7)"; for (let i = 0; i < 9; i++) { const x = rnd() * w, y = h * (0.2 + rnd() * 0.25); g.beginPath(); g.ellipse(x, y, 90, 22, 0, 0, 7); g.ellipse(x + 50, y - 14, 60, 22, 0, 0, 7); g.fill(); } }
  // tiga lapis rumah deret: gevel runcing / tangga / lonceng, cerobong, jendela kecil (sebagian nyala kalau gelap)
  const lay = dark ? (wet ? ["#1B2030", "#141824", "#0D1018"] : eve ? ["#6B5577", "#4C3B58", "#33283D"] : ["#1A1F3A", "#12152B", "#0B0D1C"]) : null;
  const litP = night ? [0.22, 0.35, 0.4] : eve ? [0.1, 0.18, 0.22] : [0, 0, 0];
  const row = (L, base, hMin, hMax, wMin, wMax, winS) => {
    let x = -40; const fade = [0.72, 0.86, 1][L];
    while (x < w + 40) {
      const bw = wMin + rnd() * (wMax - wMin), bh = hMin + rnd() * (hMax - hMin), top = base - bh, kind = Math.floor(rnd() * 3);
      const col = lay ? lay[L] : artShade(KH_FACADE[Math.floor(rnd() * KH_FACADE.length)], wet || grey ? 0.75 * fade : fade);
      g.fillStyle = col; g.fillRect(x, top, bw, bh + 400);
      g.beginPath();
      if (kind === 0) { g.moveTo(x, top); g.lineTo(x + bw / 2, top - bw * 0.55); g.lineTo(x + bw, top); }
      else if (kind === 1) { for (let k = 0; k < 4; k++) g.rect(x + k * bw / 8, top - (k + 1) * bw * 0.12, bw - k * bw / 4, bw * 0.12 + 1); }
      else { g.moveTo(x, top); g.quadraticCurveTo(x + bw * 0.1, top - bw * 0.5, x + bw / 2, top - bw * 0.62); g.quadraticCurveTo(x + bw * 0.9, top - bw * 0.5, x + bw, top); }
      g.fill();
      if (rnd() < 0.5) g.fillRect(x + bw * 0.7, top - bw * 0.5, bw * 0.1, bw * 0.4);
      const cols = Math.max(2, Math.round(bw / (winS * 2.4))), rows = Math.max(2, Math.round(bh / (winS * 2.6)));
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
        const wx2 = x + (k + 0.5) * bw / cols - winS / 2, wy = top + winS * 0.8 + r * (bh - winS) / rows, lit = rnd() < litP[L];
        if (lit && L > 0) { const gl = g.createRadialGradient(wx2 + winS / 2, wy + winS * 0.7, 2, wx2 + winS / 2, wy + winS * 0.7, winS * 2.2); gl.addColorStop(0, "rgba(255,190,110,.35)"); gl.addColorStop(1, "rgba(255,190,110,0)"); g.fillStyle = gl; g.fillRect(wx2 - winS * 2, wy - winS * 2, winS * 5, winS * 5); }
        const R = { x: wx2, y: wy, w: winS, h: winS * 1.4, lit, warm: rnd() < 0.8 ? "#FFC977" : "#FFE6B0", off: dark ? "rgba(10,12,24,.85)" : "rgba(70,84,104,.8)" };
        khWinRect(g, R); if (dark && L > 0) rects.push(R);
      }
      x += bw + (rnd() < 0.2 ? 10 : 0);
    }
  };
  const spCol = lay ? lay[0] : artShade("#9C8A80", wet || grey ? 0.7 : 0.85), sx = w * 0.22, sb = h * 0.72;
  g.fillStyle = spCol; g.fillRect(sx - 26, sb - 220, 52, 220); g.beginPath(); g.moveTo(sx - 30, sb - 220); g.lineTo(sx, sb - 400); g.lineTo(sx + 30, sb - 220); g.fill();
  if (dark) { g.fillStyle = "rgba(255,214,140,.8)"; g.beginPath(); g.arc(sx, sb - 170, 12, 0, 7); g.fill(); }
  row(0, h * 0.72, 60, 160, 70, 130, 10); row(1, h * 0.84, 120, 240, 120, 200, 18); row(2, h * 0.98, 160, 300, 200, 320, 30);
  for (let i = 0; i < 7; i++) {
    const lx = 200 + i * 440 + rnd() * 80, ly = h * 0.97;
    if (dark) { const gl = g.createRadialGradient(lx, ly, 4, lx, ly, 220); gl.addColorStop(0, night ? "rgba(255,170,80,.75)" : "rgba(255,190,120,.35)"); gl.addColorStop(1, "rgba(255,170,80,0)"); g.fillStyle = gl; g.fillRect(lx - 230, ly - 230, 460, 460); }
    g.fillStyle = dark ? "#FFE2A8" : "#3A3330"; g.beginPath(); g.arc(lx, ly - 30, 7, 0, 7); g.fill();
  }
  if (dark && !wet) for (let k = 0; k < 2; k++) { const y0 = h * (0.8 + k * 0.08); for (let i = 0; i < 46; i++) { const t = i / 45; g.fillStyle = ["#FFD27A", "#FF9E7A", "#9FE0FF", "#FFF0C0"][i % 4]; g.beginPath(); g.arc(t * w, y0 + Math.sin(t * Math.PI * 4) * 30, 4, 0, 7); g.fill(); } }
  if (wet) {
    g.fillStyle = dark ? "rgba(120,130,150,.18)" : "rgba(200,206,214,.25)"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(200,215,240,.28)"; g.lineWidth = 2;
    for (let i = 0; i < 900; i++) { const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + 40); g.stroke(); }
  }
  if (wx === "snow") { g.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 700; i++) { g.beginPath(); g.arc(rnd() * w, rnd() * h, 1.5 + rnd() * 3, 0, 7); g.fill(); } }
  if (wx === "fog") { g.fillStyle = dark ? "rgba(70,76,90,.55)" : "rgba(225,228,232,.6)"; g.fillRect(0, h * 0.4, w, h * 0.6); }
  return { c, rects };
}
function khWinRect(g, R) { g.fillStyle = R.lit ? R.warm : R.off; g.fillRect(R.x, R.y, R.w, R.h); }
// potong panorama untuk satu jendela: tinggi tetap 55% panorama, lebar ikut bentuk jendela (jadi kelihatan agak lebih lebar dari kacanya)
const KH_V0 = 0.37, KH_V1 = 0.92;
function khCrop(W) {
  const P = KH.pano, c = P.c, ch = c.height * (KH_V1 - KH_V0), cw = ch * W.aspect, x = Math.max(0, Math.min(c.width - cw, W.u * c.width - cw / 2));
  W.sx = x; W.sw = cw;
  W.g.drawImage(c, x, c.height * KH_V0, cw, ch, 0, 0, W.cv.width, W.cv.height); W.tex.needsUpdate = true;
}
function khView(H) {
  const p = litName || "day", wx = typeof WX === "string" ? WX : "", key = p + "|" + wx;
  if (KH.panoKey !== key) { KH.pano = khPano(p, wx); KH.panoKey = key; }
  for (const W of H.wins) {
    khCrop(W); W.rects = KH.pano.rects.filter(R => R.x > W.sx && R.x + R.w < W.sx + W.sw && R.y > KH.pano.c.height * KH_V0 && R.y + R.h < KH.pano.c.height * KH_V1);
    W.sky.material.map = W.tex; W.sky.material.needsUpdate = true;
    W.drops.visible = wx === "rain" || wx === "storm";
  }
}

// ---- isi kamar: lampu kecil, lilin, cangkir, gorden, titik kegiatan. Sekali per grup ruangan (dipanggil kpCam setelah kpDress)
function khDress(r) {
  const G = r.g, GP = G.position, X0 = KP.b.x0, zB = KP.b.zB, H = { lights: [], halos: [], bulbs: [], candles: [], steam: [], clicks: [], wins: [], spots: {} };
  G.updateMatrixWorld(true);
  const add = o => { o.position.x -= GP.x; o.position.z -= GP.z; G.add(o); return o; };
  const glow = col => new THREE.MeshBasicMaterial({ color: new THREE.Color(col) });
  const pt = (x, y, z, col, s, dist) => { const l = new THREE.PointLight(col, 0, dist, 1.8); l.position.set(x, y, z); add(l); return { l, s }; };
  const halo = (x, y, z, size, col, op) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: khHaloTex, color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); sp.position.set(x, y, z); sp.scale.setScalar(size); add(sp); return { sp, op }; };
  const cx = c => X0 + (c - 1) * CELL;
  const items = {}; G.traverse(o => { if (o.userData.item && !items[o.userData.item[0]]) items[o.userData.item[0]] = o; });
  const bb = id => items[id] ? new THREE.Box3().setFromObject(items[id]) : null;
  const rc = new THREE.Raycaster();
  const surf = (id, x, z, dflt) => { const o = items[id]; if (!o) return dflt; rc.set(new THREE.Vector3(x, 6, z), new THREE.Vector3(0, -1, 0)); const hit = rc.intersectObject(o, true)[0]; return hit ? hit.point.y : dflt; };
  // lampu tali di dinding belakang: dua untai, bohlam kecil oranye
  const zW = zB + 0.06;
  const fairy = (xa, xb, y, sag) => {
    const n = Math.round((xb - xa) / 0.18), pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector3(xa + (xb - xa) * t, y - Math.sin(t * Math.PI) * sag, zW + 0.04)); }
    add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a2420 })));
    pts.forEach((p, i) => {
      const col = ["#E8892E", "#E07A2A", "#F0A040"][i % 3], m = glow(col), b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), m);
      b.position.copy(p).add(new THREE.Vector3(0, -0.06, 0.02)); add(b);
      H.bulbs.push({ m, c0: new THREE.Color(col), ph: Math.random() * 7, sp: 0.6 + Math.random() * 1.2, h: i % 2 === 0 ? halo(p.x, p.y - 0.06, p.z + 0.03, 0.5, 0xffa040, 0.4) : null });
    });
    // satu lampu titik per untai (bukan per bohlam): tiap lampu titik menambah kerja semua bahan, laptop lemah ikut berat
    H.lights.push({ ...pt((xa + xb) / 2, y - sag - 0.3, zW + 0.4, 0xff9f50, 0.36, 4.5), kind: "fairy" });
  };
  fairy(cx(1.3), cx(5.6), 4.6, 0.35); fairy(cx(6.4), cx(10.8), 4.6, 0.3);
  // lilin di nakas: nyala sendiri waktu sore/malam, bisa ditiup (klik)
  const candleM = new THREE.MeshStandardMaterial({ color: 0xf4ead8, roughness: 0.6 });
  const cL = pt(cx(4.38), 0.72 + 0.35, zB + 0.8, 0xff9a4a, 0.8, 2.8);   // satu cahaya buat dua lilin
  for (const [x, z] of [[cx(4.25), zB + 0.75], [cx(4.5), zB + 0.65]]) {
    const y = 0.72, body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 12), candleM); body.position.set(x, y + 0.07, z); add(body);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), glow("#FFC46A")); f.scale.y = 1.8; f.position.set(x, y + 0.18, z); add(f);
    H.candles.push({ f, L: H.candles.length ? null : cL, h: halo(x, y + 0.2, z + 0.05, 0.7, 0xff9a40, 0.6), ph: Math.random() * 9, v: 0 });
    H.clicks.push({ o: body, fn: khCandle }, { o: f, fn: khCandle });
  }
  // lampu berdiri di antara sofa dan meja = "lampu kamar" (tombol Lamp juga)
  const lx = cx(9.0), lz = zB + 0.45, poleM = new THREE.MeshStandardMaterial({ color: 0x2c2622, metalness: 0.4, roughness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 8), poleM); pole.position.set(lx, 1.05, lz); add(pole);
  const lbase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 16), poleM); lbase.position.set(lx, 0.02, lz); add(lbase);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.36, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xf6e3c2, emissive: 0xffc27a, emissiveIntensity: 0.6, side: THREE.DoubleSide })); shade.position.set(lx, 2.15, lz); add(shade);
  H.lamp = { shade, L: pt(lx, 1.7, lz + 0.4, 0xffa95e, 1.3, 5.5), h: halo(lx, 2.1, lz + 0.05, 2.6, 0xffa050, 0.45), h2: halo(cx(4.5), 1.25, zB + 0.55, 2.2, 0xffa050, 0.4) };
  for (const o of [pole, lbase, shade]) H.clicks.push({ o, fn: khLampClick });
  // laptop di meja: cahaya biru tipis, lebih terang waktu makhluk duduk di meja
  H.lap = { L: pt(cx(10.2), 1.3, zB + 0.9, 0x8fb4ff, 0.35, 2.5), h: halo(cx(10.25), 1.15, zB + 0.5, 1.0, 0x7fa8ff, 0.35), v: 0 };
  // cangkir di ujung kiri meja, uapnya naik pelan
  const d = bb("work_desk"), mx = d ? d.min.x + 0.28 : cx(9.5), mz = d ? Math.min(d.max.z - 0.3, zB + 0.75) : zB + 0.7, my = surf("work_desk", mx, mz, 0.9);
  const mugM = new THREE.MeshStandardMaterial({ color: 0xd8604a, roughness: 0.5 }), mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.15, 16), mugM); mug.position.set(mx, my + 0.075, mz); add(mug);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12), mugM); handle.position.set(mx + 0.08, my + 0.08, mz); add(handle);
  for (let i = 0; i < 4; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: khSteamTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); sp.position.set(mx, my + 0.2, mz); add(sp); H.steam.push({ sp, x: mx - GP.x, y0: my + 0.17, k: i / 4 }); }
  // jendela: kanvas potongan sendiri + lapisan tetes hujan + lampu sorot (dingin malam, hangat pagi) + gorden yang bisa ditutup
  const dropTex = canvasTex((g, w, h) => {
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * w, y = Math.random() * h, rr = 2 + Math.random() * Math.random() * 7;
      if (rr > 4.5 && Math.random() < 0.6) { g.strokeStyle = "rgba(190,205,230,.28)"; g.lineWidth = rr * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 4, y - 20 - Math.random() * 50); g.stroke(); }
      g.fillStyle = "rgba(180,196,224,.35)"; g.beginPath(); g.ellipse(x, y, rr, rr * 1.2, 0, 0, 7); g.fill();
      g.fillStyle = "rgba(255,255,255,.65)"; g.beginPath(); g.arc(x - rr * 0.3, y - rr * 0.35, Math.max(0.8, rr * 0.28), 0, 7); g.fill();
    }
  }, 128, 256);
  dropTex.wrapS = dropTex.wrapT = THREE.RepeatWrapping;
  const inRoom = o => { for (let p = o; p; p = p.parent) if (p === G) return true; return false; };
  for (const sky of windows.filter(inRoom)) {
    const grp = sky.parent, b = new THREE.Box3().setFromObject(sky), ww = sky.geometry.parameters.width, wh = sky.geometry.parameters.height;
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = Math.round(256 * wh / ww);
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    sky.material = sky.material.clone(); sky.userData.khC = sky.material.color.clone();
    const drops = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: dropTex.clone(), transparent: true, depthWrite: false })); drops.material.map.needsUpdate = true; drops.material.map.repeat.set(ww / 0.9, wh / 1.8);
    drops.position.z = 0.07; grp.add(drops);
    const spot = new THREE.SpotLight(0x6f86c9, 0, 10, 0.7, 0.7, 1.4); spot.position.set((b.min.x + b.max.x) / 2 - GP.x, b.max.y, b.max.z + 0.2 - GP.z); spot.target.position.set(spot.position.x, 0, spot.position.z + 3.2); G.add(spot); G.add(spot.target);
    const cur = grp.children.filter(o => o.isMesh && Math.abs(o.position.z - 0.2) < 0.01 && Math.abs(Math.abs(o.position.x) - (ww / 2 + 0.25)) < 0.02).map(o => ({ o, x0: o.position.x, sx: Math.sign(o.position.x), cw: (o.geometry.computeBoundingBox(), o.geometry.boundingBox.max.x - o.geometry.boundingBox.min.x) }));
    const W = { sky, grp, cv, g: cv.getContext("2d"), tex, drops, spot, cur, ww, x: (b.min.x + b.max.x) / 2, u: ((b.min.x + b.max.x) / 2 - X0) / (KP.b.x1 - X0), aspect: ww / wh, rects: [] };
    // sinar matahari: berkas tipis dari jendela turun ke lantai + petak cahaya berbentuk kaca jendela di lantai
    const zw = b.max.z + 0.1 - GP.z, xc = W.x - GP.x, zf = zw + 2.3, sh = 0.35;
    const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute([xc - ww / 2, b.max.y - 0.1, zw, xc + ww / 2, b.max.y - 0.1, zw, xc + ww / 2 + sh, 0.03, zf, xc - ww / 2 + sh, 0.03, zf], 3));
    bg.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2)); bg.setIndex([0, 2, 1, 0, 3, 2]);
    const sunMat = map => new THREE.MeshBasicMaterial({ map, color: 0xffc98a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    W.beam = new THREE.Mesh(bg, sunMat(khBeamTex)); G.add(W.beam);
    W.patch = new THREE.Mesh(new THREE.PlaneGeometry(ww * 1.25, wh * 0.85), sunMat(khPaneTex)); W.patch.rotation.x = -Math.PI / 2; W.patch.position.set(xc + sh, 0.035, zf - 0.15); G.add(W.patch);
    W.spill = halo(W.x, (b.min.y + b.max.y) / 2 - 0.2, b.max.z + 0.15, 4.2, 0xffc27a, 1); W.spill.sp.renderOrder = 2;   // cahaya siang yang memantul di dinding sekitar jendela
    H.wins.push(W);
    for (const o of [sky, drops, ...cur.map(c => c.o)]) H.clicks.push({ o, fn: khCurtain });
  }
  H.wins.sort((a, b) => a.x - b.x);
  // titik kegiatan (koordinat dunia), dari kotak barang + tinggi permukaan (raycast ke bawah)
  const bed = bb("pine_bed"), sofa = bed && bb("sofa");
  if (bed) { const x = (bed.min.x + bed.max.x) / 2 + 0.25, z = (bed.min.z + bed.max.z) / 2 + 0.15; H.spots.bed = { x, z, y: surf("pine_bed", x, z, 0.55) }; }
  if (sofa) { const x = (sofa.min.x + sofa.max.x) / 2 - 0.2, z = sofa.max.z - 0.25; H.spots.sofa = { x, z, y: surf("sofa", x, z, 0.45) }; }
  const wS = H.wins.find(W => sofa && W.x > sofa.min.x && W.x < sofa.max.x), wB = H.wins.find(W => bed && W.x > bed.min.x && W.x < bed.max.x);
  if (wS) { const x = Math.min(wS.x, sofa.max.x - 0.35), z = sofa.max.z - 0.3; H.spots.winS = { x, z, y: surf("sofa", x, z, 0.45) }; }
  if (wB) { const x = Math.max(wB.x, bed.min.x + 0.4), z = bed.min.z + 0.7; H.spots.winB = { x, z, y: surf("pine_bed", x, z, 0.55) }; }
  if (d) H.spots.desk = { x: (d.min.x + d.max.x) / 2 - 0.15, z: d.max.z + 0.1, y: 0 };
  // lampu bawaan ruangan: dicatat kekuatan aslinya, khWarm mengecilkannya waktu gelap
  for (const o of G.userData.lamps || []) o.s0 = o.strength;
  H.curOpen = khBed() ? 0 : 1; KH.curT = KH.curV = H.curOpen;
  G.userData.kh = H;
}

// ---- suasana: dipanggil applyLight (jam/cuaca berubah, atau masuk kamar). LIT diganti salinan yang lebih gelap waktu sore/malam.
function khWarm() {
  const r = ROOMS[0], H = r && r.g.userData.kh; if (!H) return;
  const p = litName, dark = p === "night", eve = p === "evening";
  // hujan/badai/mendung: matahari dan pantulan ikut redup, lampu kecil makin kerasa
  const wet = WX === "rain" || WX === "storm" ? (WX === "storm" ? 0.45 : 0.6) : WX === "cloud" || WX === "fog" ? 0.8 : 1;
  const mood = KH_MOOD[p] || (wet < 1 ? {} : null);
  if (mood) { LIT = Object.assign({}, LIT, mood); sun.color.setHex(LIT.sun); if (wet < 1) LIT = Object.assign(LIT, { sunI: LIT.sunI * wet, hemi: LIT.hemi * (0.5 + wet / 2), env: LIT.env * (0.4 + wet * 0.6) }); renderer.toneMappingExposure = LIT.exp; scene.traverse(envScale); }
  const lift = o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) if (m.isMeshStandardMaterial && m.userData.env0 !== undefined) m.envMapIntensity = m.userData.env0 * (dark ? 0.3 : eve ? 0.5 : LIT.env); };
  if (K) K.root.traverse(lift); if (PT3) PT3.root.traverse(lift);
  for (const o of r.g.userData.lamps || []) if (o.s0 !== undefined) o.strength = o.s0 * (eve ? 0.8 : dark ? (o.s0 > 1.2 ? 0.75 : 0.3) : 1);
  for (const mm of r.mats.walls) { if (!mm.userData.khc) mm.userData.khc = mm.color.clone(); const k = KH_WALL[p] || [1, 1, 1]; mm.color.copy(mm.userData.khc).multiply(new THREE.Color(k[0], k[1], k[2])); }
  const fm = r.mats.floor; if (!fm.userData.khc) fm.userData.khc = fm.color.clone(); fm.color.copy(fm.userData.khc).multiplyScalar(dark ? 0.7 : eve ? 0.9 : 0.88);
  khView(H);
}
function khExit() {
  const r = ROOMS[0], H = r && r.g.userData.kh;
  if (r && H) { for (const mm of r.mats.walls) if (mm.userData.khc) { mm.color.copy(mm.userData.khc); delete mm.userData.khc; } const fm = r.mats.floor; if (fm.userData.khc) { fm.color.copy(fm.userData.khc); delete fm.userData.khc; } }
  if (KH.napped) napUntil = 0;
  if (K) { K.root.rotation.z = 0; if (KH.book) KH.book.visible = false; }
  blob.position.y = 0.03; canvas.style.cursor = "";
  KH.act = null; KH.y = 0; KH.lie = 0; KH.napped = false; KH.candle = null;
}
function khEnter() { KH.act = null; KH.y = 0; KH.z = KP.z; KH.lie = 0; KH.candle = null; KH.mainV = 0; KH.boltAt = now() + 4000; KH.wokeSay = false; }

// ---- lampu: target 0/1 untuk lampu berdiri + lampu bawaan ruangan. Otomatis: nyala sore/malam, mati siang dan waktu tidur.
const khAsleep = () => !!(KH.act && KH.act.kind === "sleep" && KH.lie > 0.5);
function khMain() { return KP.lamp === null ? (khDark() && !khAsleep() ? 1 : 0) : KP.lamp ? 1 : 0; }
function khLampClick() { KP.lamp = !kpLampOn(); if (SND) SND.click(); kpSync(); return true; }
function khCandle() { const on = KH.candle === null ? khDark() && !khAsleep() : KH.candle; KH.candle = !on; if (!on && SND) SND.click(); return true; }
function khCurtain() { KH.curT = KH.curT > 0.5 ? 0 : 1; return true; }

// ---- klik di kamar: barang dulu, pet, baru makhluk (poke biasa di ui/08-input.js)
function khPick3(e) {
  const H = khH(); if (!H) return null;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(H.clicks.map(c => c.o), false), pet = PT3 && PT3.root.visible ? ray.intersectObject(PT3.root, true)[0] : null, kk = K ? ray.intersectObject(K.root, true)[0] : null;
  const best = [hits[0] && { d: hits[0].distance, fn: H.clicks.find(c => c.o === hits[0].object).fn }, pet && { d: pet.distance, fn: khPet }, kk && { d: kk.distance, fn: null }].filter(Boolean).sort((a, b) => a.d - b.d)[0];
  return best || null;
}
function khTap(e) { const b = khPick3(e); return !!(b && b.fn && b.fn()); }
function khPet() { if (!PT3) return false; PT3.hop = now(); PT3.hopAt = now() + 3000; const p = PT3.root.position.clone(); p.y += 0.8; const s = screenOf(p), el = document.createElement("div"); el.className = "particle"; el.textContent = "♥"; Object.assign(el.style, { left: s.x + "px", top: s.y + "px", color: "var(--berry)", fontSize: "22px" }); el.style.setProperty("--dx", "0px"); floats.appendChild(el); setTimeout(() => el.remove(), 1700); return true; }
function khHover(e) { if (now() - KH.hoverAt < 90) return; KH.hoverAt = now(); const b = khPick3(e); canvas.style.cursor = b ? "pointer" : ""; }

// ---- kegiatan: tiap kegiatan punya titik (x, z, tinggi duduk, arah hadap), lama, dan langkah kecilnya sendiri
function khPlan(H) {
  const h = khHour(), S = H.spots, wet = kpRaining(), late = h >= 18 || h < 6, R = Math.random;
  const mk = (kind, sp, dur, extra) => sp ? Object.assign({ kind, x: sp.x, z: sp.z, y: sp.y, rot: 0, left: dur, ph: "go", p: 0, t: 0 }, extra) : null;
  if (focus && S.desk) return mk("desk", S.desk, 1e9, { rot: 2.7, until: () => !!focus });
  if (khBed() && S.bed) return mk("sleep", S.bed, 1e9);
  const w = [["wander", 3], ["read", late ? 4 : 1], ["desk", late ? 1 : 2], ["window", wet ? 4 : 1]];
  let n = R() * w.reduce((a, b) => a + b[1], 0), kind = "wander"; for (const [k, v] of w) if ((n -= v) < 0) { kind = k; break; }
  if (kind === "read") return mk("read", S.sofa, 50 + R() * 70) || khPlanWander();
  if (kind === "desk") return mk("desk", S.desk, 40 + R() * 50, { rot: 2.7 }) || khPlanWander();
  if (kind === "window") { const sp = R() < 0.6 ? S.winS || S.winB : S.winB || S.winS; return mk("window", sp, 15 + R() * 20, { rot: Math.PI }) || khPlanWander(); }
  return khPlanWander();
}
function khPlanWander() {
  const lo = KP.b.x0 + 1.4, hi = KP.b.x1 - 1.4; let n = KP.x;
  for (let k = 0; k < 6 && Math.abs(n - KP.x) < 1.6; k++) n = lo + Math.random() * (hi - lo);
  return { kind: "wander", x: n, z: KP.z, y: 0, rot: null, left: 3 + Math.random() * 9, ph: "go", p: 0, t: 0 };
}
// dipanggil kpFrame setiap frame; mengatur KP.x / KP.walking / KP.dir dan KH.y, KH.z, KH.lie. Mengembalikan arah hadap (atau null).
function khStep(t, dt, napping) {
  const H = khH(); if (!H) return null;
  let A = KH.act;
  if (!A) A = KH.act = khPlan(H);
  const busy = t < talkUntil || chatBusy || (napping && A.kind !== "sleep") || (anim && A.ph !== "up" && A.ph !== "down");
  KP.walking = false;
  // ada yang lebih penting (sesi fokus mulai, jam tidur): kegiatan sekarang selesai
  if ((focus && A.kind !== "desk") || (khBed() && !focus && A.kind !== "sleep")) { if (A.ph === "go") A = KH.act = khPlan(H); else if (A.ph === "on") A.left = 0; }
  const ease = q => q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q), up = A.y > 0.02 || Math.abs(A.z - KP.z) > 0.05;
  if (A.ph === "go") {
    KH.z += (KP.z - KH.z) * Math.min(1, dt * 4);
    if (!busy) {
      const d = A.x - KP.x;
      if (Math.abs(d) < 0.04) { KP.x = A.x; if (up) { A.ph = "up"; A.p = 0; play("jump", 650); } else A.ph = "on"; }
      else { KP.dir = Math.sign(d); KP.x += KP.dir * Math.min(Math.abs(d), KP_SPEED * dt); KP.walking = true; }
    }
  } else if (A.ph === "up" || A.ph === "down") {
    A.p = Math.min(1, A.p + dt / 0.65); const q = ease(A.ph === "up" ? A.p : 1 - A.p);
    KH.z = KP.z + (A.z - KP.z) * q; KH.y = A.y * q;
    if (A.p >= 1) { if (A.ph === "up") { A.ph = "on"; A.t = 0; } else { KH.act = null; KH.y = 0; KH.z = KP.z; } }
  } else if (A.ph === "on") {
    A.t += dt; if (!busy || A.kind === "sleep") A.left -= dt;
    khDo(A, t, dt);
    const done = A.left <= 0 || (A.until && !A.until());
    if (done) { khLeave(A); if (up) { A.ph = "down"; A.p = 0; play("jump", 650); } else KH.act = null; }
  }
  return A.ph === "on" || A.ph === "up" ? A.rot : null;
}
// langkah kecil per kegiatan
function khDo(A, t, dt) {
  if (A.kind === "read" && KH.book) KH.book.visible = true;
  if (A.kind === "window" && kpRaining() && !A.said && A.t > 4) { A.said = true; if (!bubble && Math.random() < 0.5) say(["Listen to it...", "So much rain.", "Cozy in here."][Math.floor(Math.random() * 3)], 2200); }
  if (A.kind === "sleep") {
    // urutan: hadap jendela, tutup gorden, hadap depan, nguap, rebahan. Bangun (jam 6): duduk, buka gorden, peregangan, salam pagi.
    if (khBed()) {
      if (A.t < 1.6) { A.rot = Math.PI; if (A.t > 0.6) KH.curT = 0; }
      else if (A.t < 3.6) { A.rot = 0; if (!A.yawn) { A.yawn = true; if (!bubble) say("*yaaawn*", 1500); play("squash", 900); } }
      else { A.rot = 0; KH.lie += (1 - KH.lie) * Math.min(1, dt * 1.5); napUntil = now() + 1500; KH.napped = true; }
    } else {
      if (!A.wake) { A.wake = t; KH.napped = false; napUntil = 0; }
      KH.lie += (0 - KH.lie) * Math.min(1, dt * 2);
      const w = (t - A.wake) / 1000;
      if (w > 1.2 && w < 3) { A.rot = Math.PI; KH.curT = 1; }
      else if (w >= 3) { A.rot = 0; if (!KH.wokeSay) { KH.wokeSay = true; play("wiggle", 800); if (!bubble) say("Good morning!", 2200); } }
      if (w > 5.5) A.left = 0;
    }
  }
}
function khLeave(A) { if (A.kind === "read" && KH.book) KH.book.visible = false; if (A.kind === "sleep") { KH.lie = 0; KH.napped = false; } }
// buku kecil di tangan (anak K.root, jadi ikut ukuran dan arah makhluk)
function khBook() {
  if (!K) return;
  if (KH.book && KH.book.parent === K.root) return;
  const b = new THREE.Group(), cov = new THREE.MeshStandardMaterial({ color: 0x5f7fa8, roughness: 0.8 }), pg = new THREE.MeshStandardMaterial({ color: 0xf6efe2, roughness: 0.9 });
  for (const s of [-1, 1]) {
    const half = new THREE.Group(); half.rotation.y = s * 0.35; b.add(half);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.03), cov); c.position.x = s * 0.28; half.add(c);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.04), pg); p.position.set(s * 0.27, 0, 0.03); half.add(p);
  }
  b.position.set(0, 0.95, 1.2); b.rotation.x = -0.75; b.visible = false; K.root.add(b); KH.book = b;
}

// ---- hal kecil yang hidup, tiap frame
function khFrame(t, dt, ts) {
  const H = khH(); if (!H) return;
  khBook();
  const dark = khDark(), asleep = khAsleep(), per = litName === "night" ? 1 : litName === "evening" ? 0.8 : 0.35, hk = litName === "night" ? 1 : litName === "evening" ? 0.5 : 0.15;
  KH.mainV += (khMain() - KH.mainV) * Math.min(1, dt * 0.9);
  // lampu berdiri
  const m = KH.mainV;
  H.lamp.L.l.intensity = 1.3 * m; H.lamp.shade.material.emissiveIntensity = 0.05 + 0.6 * m; H.lamp.h.sp.material.opacity = H.lamp.h.op * m * hk; H.lamp.h2.sp.material.opacity = H.lamp.h2.op * m * hk;
  // lampu tali: kedip pelan per bohlam, redup jadi lampu tidur waktu tidur
  const fk = per * (asleep ? 0.4 : 1);
  for (const B of H.bulbs) { const k = reduce ? 1 : 0.75 + 0.25 * Math.sin(ts * B.sp + B.ph) + (Math.sin(ts * 0.37 + B.ph * 3) > 0.985 ? -0.5 : 0); B.m.color.copy(B.c0).multiplyScalar(Math.max(0.15, k * (0.35 + 0.65 * fk))); if (B.h) B.h.sp.material.opacity = B.h.op * k * fk * hk; }
  for (const L of H.lights) if (L.kind === "fairy") L.l.intensity = L.s * fk;
  // lilin: goyang kecil, bisa dimatikan
  const cOn = (KH.candle === null ? dark && !asleep : KH.candle) ? 1 : 0;
  for (const C of H.candles) {
    C.v += (cOn - C.v) * Math.min(1, dt * 3);
    const fl = reduce ? 1 : 0.82 + 0.1 * Math.sin(ts * 9 + C.ph) + 0.08 * Math.sin(ts * 23 + C.ph * 2);
    C.f.visible = C.v > 0.05; C.f.scale.set(1, 1.8 * (0.9 + 0.2 * fl), 1); C.f.rotation.z = reduce ? 0 : Math.sin(ts * 5 + C.ph) * 0.12;
    if (C.L) C.L.l.intensity = C.L.s * fl * C.v; C.h.sp.material.opacity = C.h.op * fl * C.v * (dark ? 1 : 0.3);
  }
  // laptop: lebih terang waktu duduk di meja
  const atDesk = KH.act && KH.act.kind === "desk" && KH.act.ph === "on";
  H.lap.v += ((asleep ? 0 : atDesk ? 1 : 0.45) - H.lap.v) * Math.min(1, dt * 2);
  H.lap.L.l.intensity = 0.6 * H.lap.v; H.lap.h.sp.material.opacity = H.lap.h.op * H.lap.v * hk * 1.4;
  // uap cangkir
  for (const S of H.steam) {
    const k = ((ts * 0.22 + S.k) % 1), on = asleep ? 0 : 1;
    S.sp.position.y = S.y0 + k * 0.5; S.sp.position.x = S.x + Math.sin(ts * 1.3 + S.k * 6) * 0.04 * (1 + k);
    S.sp.scale.setScalar(0.08 + k * 0.18); S.sp.material.opacity = (reduce ? 0 : on) * Math.sin(k * Math.PI) * (dark ? 0.22 : 0.35);
  }
  // gorden
  KH.curV += (KH.curT - KH.curV) * Math.min(1, dt * 2.2);
  for (const W of H.wins) for (const c of W.cur) { const shut = 1 - KH.curV, full = (W.ww / 2 + 0.12) / c.cw; c.o.position.x = c.x0 + (c.sx * W.ww / 4 - c.x0) * shut; c.o.scale.x = 1 + (full - 1) * shut; }
  // kilat waktu badai (langit jendela dan cahaya dari jendela menyala sebentar, guntur menyusul)
  if (WX === "storm" && t > KH.boltAt) { KH.flash = 1; KH.boltAt = t + 7000 + Math.random() * 14000; if (SND) SND.thunder(); }
  KH.flash *= Math.exp(-dt * 5); const fl = KH.flash > 0.02 ? KH.flash * (0.6 + 0.4 * Math.sin(t * 0.06)) : 0;
  const spotK = KH_SUN[litName] || KH_SUN.night, wetK = kpRaining() ? 0.2 : WX === "cloud" || WX === "fog" || WX === "snow" ? 0.5 : 1;
  for (const W of H.wins) {
    W.spot.color.setHex(spotK[0]); W.spot.intensity = spotK[1] * (litName === "night" ? 1 : wetK) * (0.12 + 0.88 * KH.curV) + fl * 9;
    const sunO = W.sunO = spotK[2] * wetK * KH.curV; W.beam.material.opacity = sunO * 0.22; W.patch.material.opacity = Math.min(1, sunO * 0.9); W.spill.sp.material.opacity = sunO * 0.5; W.beam.visible = W.patch.visible = sunO > 0.01;
    W.sky.material.color.copy(W.sky.userData.khC).multiplyScalar(1 + fl * 2.5);
    if (W.drops.visible && !reduce) W.drops.material.map.offset.y += dt * 0.012;
  }
  // jendela tetangga nyala-mati (makin malam makin banyak yang mati)
  if (dark && t > KH.nbAt) {
    KH.nbAt = t + 3000 + Math.random() * 6000;
    const W = H.wins[Math.floor(Math.random() * H.wins.length)];
    if (W && W.rects.length) { const R = W.rects[Math.floor(Math.random() * W.rects.length)], h = khHour(), pOn = h >= 23 || h < 6 ? 0.25 : 0.55; R.lit = Math.random() < pOn; khWinRect(KH.pano.c.getContext("2d"), R); khCrop(W); }
  }
}

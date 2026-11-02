// ---- tiga game baru (v67): Frog hop, Memory match, Town run. Pola sama kayak game lain: FC.k, langkah per frame,
// skor lewat mgAdd, temuan lewat FC.drop/mgPick, "lanjut sekali" lewat MG_REVIVE.

// ========== Frog hop: kodok mantul otomatis, jari geser kiri-kanan buat ngarahin ke awan. Jatuh = selesai.
// Makin tinggi awannya makin jarang; mulai awan ke-15 ada yang rapuh, mulai ke-25 ada yang geser. Pegas (langka) = lompatan super.
function hopInit() {
  const { cv, dpr } = FC, W = cv.width, H = cv.height;
  Object.assign(FC, { fx: W / 2, fy: H - 160 * dpr, fvy: -1150 * dpr, aimX: W / 2, cam: 0, plats: [], hopTop: 0, face: 1 });
  FC.plats.push(hopShape({ x: W / 2, y: H - 120 * dpr, w: 110 * dpr, i: 0, kind: "biasa", v: 0 }, false));
  while (FC.plats.length < 14) hopAdd();
}
function hopAdd() {
  const { cv, dpr } = FC, W = cv.width, last = FC.plats[FC.plats.length - 1], i = last.i + 1;
  const gap = (78 + Math.min(i, 60) * 1.1 + FC.rnd() * 30) * dpr, w = Math.max(62, 96 - i * 0.4) * dpr;
  const kind = i > 25 && FC.rnd() < 0.25 ? "geser" : i > 15 && FC.rnd() < 0.2 ? "rapuh" : "biasa";
  const p = { x: w / 2 + FC.rnd() * (W - w), y: last.y - gap, w, i, kind, v: (FC.rnd() < 0.5 ? -1 : 1) * (60 + i) * dpr };
  if (kind === "biasa" && i > 5 && FC.rnd() < 0.08) p.spring = true;
  // v69: bentuk dan hiasan tiap pijakan beda (acak biasa, bukan acak harian: cuma tampilan)
  hopShape(p); if (p.spring) p.deco = null;
  const D = FC.drop; if (D && !D.done && i >= D.at + 2) { D.done = true; p.find = D.kind; }
  FC.plats.push(p);
}
// bentuk gumpalan awan dan hiasan; dipakai semua pijakan, termasuk awan awal dan awan "lanjut"
function hopShape(p, deco = true) {
  const vr = Math.random, n = Math.max(3, Math.round(p.w / (19 * FC.dpr))) + Math.floor(vr() * 2);
  p.puffs = Array.from({ length: n }, (_, j) => ({ u: j / (n - 1), r: (j && j < n - 1 ? 0.95 : 0.75) + vr() * 0.45 }));
  p.deco = deco && vr() < 0.55 ? ["bunga", "burung", "kilau", "pelangi", "jamur"][Math.floor(vr() * 5)] : null;
  return p;
}
function hopStep(dt) {
  const { cv, ctx, dpr } = FC, W = cv.width, H = cv.height, g = 2300 * dpr;
  if (FC.run && !FC.over) {
    FC.fx += (FC.aimX - FC.fx) * Math.min(1, dt * 10);
    if (Math.abs(FC.aimX - FC.fx) > 2) FC.face = FC.aimX > FC.fx ? 1 : -1;
    FC.fvy += g * dt; FC.fy += FC.fvy * dt;
    for (const p of FC.plats) {
      if (p.kind === "geser") { p.x += p.v * dt; if (p.x < p.w / 2 || p.x > W - p.w / 2) p.v *= -1; }
      if (p.gone || FC.fvy <= 0) continue;
      const foot = FC.fy + 18 * dpr, prev = foot - FC.fvy * dt;
      if (prev <= p.y && foot >= p.y && Math.abs(FC.fx - p.x) < p.w / 2 + 12 * dpr) {
        FC.fvy = -(p.spring ? 1900 : 1150) * dpr; FC.fy = p.y - 18 * dpr; FC.landT = now(); hopPuff(FC.fx, p.y, p.spring);
        Sfx.play(p.spring ? "temu" : "taruh", Math.min(p.i, 24));
        if (p.kind === "rapuh") { p.gone = true; Sfx.play("iris"); }
        if (p.find) { mgPick(p.find); p.find = null; }
        if (p.i > FC.hopTop) { mgAdd(p.i - FC.hopTop); FC.hopTop = p.i; FC.caught = p.i; }
      }
    }
    // kamera naik ngikutin kodok (nggak pernah turun)
    const line = H * 0.42;
    if (FC.fy < line) { const d = line - FC.fy; FC.fy = line; FC.cam += d; FC.plats.forEach(p => { p.y += d; }); }
    FC.plats = FC.plats.filter(p => p.y < H + 60 * dpr);
    while (FC.plats.length < 14) hopAdd();
    if (FC.fy > H + 40 * dpr) { FC.over = now(); Sfx.play("jatuh"); navigator.vibrate && navigator.vibrate(120); }
  }
  // pijakan: tiap zona punya bentuk sendiri (awan siang, awan senja, awan malam bercahaya, batu angkasa)
  for (const p of FC.plats) if (!p.gone) hopPlat(ctx, p, dpr);
  // debu dan kilau waktu mendarat
  FC.puffs = (FC.puffs || []).filter(q => (q.life -= dt) > 0);
  for (const q of FC.puffs) {
    q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dpr * dt;
    ctx.globalAlpha = Math.min(1, q.life * 2.5);
    if (q.star) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.life * 6); hopStar(ctx, 0, 0, q.r, "#FFE36B"); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1.6 - q.life), 0, 7); ctx.fillStyle = "#FFFFFF"; ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // Pip: gepeng waktu baru mendarat, memanjang waktu melesat naik
  const since = (now() - (FC.landT || 0)) / 1000, land = since < 0.12 ? 1 - since / 0.12 : 0;
  const sy = FC.fvy < 0 ? 1 + Math.min(0.12, -FC.fvy / (12000 * dpr)) - land * 0.25 : 1;
  ctx.save(); ctx.translate(FC.fx, FC.fy - 7 * dpr + land * 4 * dpr); ctx.scale(FC.face * (2 - sy), sy);
  pipDraw(ctx, 1.2 * dpr, { vy: FC.fvy / dpr, t: now() / 1000, happy: since < 0.35, over: !!FC.over });
  ctx.restore();
}
function hopPuff(x, y, big) {
  const dpr = FC.dpr; FC.puffs = FC.puffs || [];
  for (let i = 0; i < (big ? 10 : 6); i++) { const a = Math.PI + (i / 5) * Math.PI; FC.puffs.push({ x, y, vx: Math.cos(a) * (60 + Math.random() * 60) * dpr * (i % 2 ? 1 : -1), vy: -Math.random() * 60 * dpr, r: (4 + Math.random() * 4) * dpr, life: 0.45 }); }
  if (big) for (let i = 0; i < 6; i++) FC.puffs.push({ x, y: y - 20 * dpr, vx: (Math.random() - 0.5) * 300 * dpr, vy: -(200 + Math.random() * 200) * dpr, r: 7 * dpr, life: 0.8, star: true });
}
function hopStar(ctx, x, y, r, col) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.strokeStyle = OUTL; ctx.stroke();
}
// zona ketinggian dari skor: 0 siang, 1 senja (20+), 2 malam (40+), 3 luar angkasa (70+). Nilainya halus buat transisi warna.
function hopZone(sc) { return sc < 20 ? sc / 20 : sc < 40 ? 1 + (sc - 20) / 20 : sc < 70 ? 2 + (sc - 40) / 30 : 3; }
function hopPlat(ctx, p, dpr) {
  const z = Math.floor(hopZone(p.i)), t = now() / 1000, x0 = p.x - p.w / 2, yb = p.y + 7 * dpr;
  if (p.kind === "rapuh") {
    // awan mendung retak: abu-abu, ada tetes hujan, jelas beda dari pijakan aman
    hopPuffRow(ctx, p, yb, dpr, "#A9A3B8", "#7D7690");
    ctx.strokeStyle = OUTL; ctx.lineWidth = 2.5 * dpr; ctx.beginPath(); ctx.moveTo(p.x - 10 * dpr, p.y - 2 * dpr); ctx.lineTo(p.x - 2 * dpr, p.y + 7 * dpr); ctx.lineTo(p.x + 4 * dpr, p.y); ctx.lineTo(p.x + 11 * dpr, p.y + 8 * dpr); ctx.stroke();
    ctx.fillStyle = "#7FC4FF"; for (let j = 0; j < 3; j++) { const dx = (j - 1) * p.w * 0.25, dy = ((t * 60 + j * 13) % 22) * dpr; ctx.beginPath(); ctx.ellipse(p.x + dx, yb + 14 * dpr + dy, 1.8 * dpr, 3.2 * dpr, 0, 0, 7); ctx.fill(); }
    return;
  }
  if (z === 3) {
    // pulau batu angkasa: permukaan atas datar, bawahnya runcing bergerigi, ada kristal kecil yang berpendar
    const hw = p.w / 2, ty = yb - 3 * dpr, J = p.puffs;
    ctx.beginPath(); ctx.moveTo(p.x - hw, ty);
    J.forEach((q, j) => { const u = (j + 0.5) / J.length, d = Math.sin(u * Math.PI) * (16 + q.r * 10) * dpr; ctx.lineTo(x0 + p.w * u, ty + 6 * dpr + d); });
    ctx.lineTo(p.x + hw, ty); ctx.closePath();
    ctx.fillStyle = wGrad(ctx, ty, ty + 30 * dpr, [[0, "#8E7FC4"], [1, "#4A3C78"]]); ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(p.x, ty, hw, 7 * dpr, 0, 0, 7); ctx.fillStyle = wGrad(ctx, ty - 7 * dpr, ty + 7 * dpr, [[0, "#D9CCFF"], [1, "#A493DE"]]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(90,70,150,.45)"; J.slice(0, 3).forEach((q, j) => { ctx.beginPath(); ctx.ellipse(x0 + p.w * (0.25 + 0.25 * j), ty + (j % 2 ? 1.5 : -1.5) * dpr, 4 * q.r * dpr, 2 * q.r * dpr, 0, 0, 7); ctx.fill(); });
    if (J.length > 3) { const cx = x0 + p.w * 0.78, cy = ty + 12 * dpr; wGlow(ctx, cx, cy, 14 * dpr, "rgba(120,240,255,.6)"); ctx.beginPath(); ctx.moveTo(cx, cy - 6 * dpr); ctx.lineTo(cx + 3.5 * dpr, cy); ctx.lineTo(cx, cy + 6 * dpr); ctx.lineTo(cx - 3.5 * dpr, cy); ctx.closePath(); ctx.fillStyle = "#8FF3FF"; ctx.fill(); ctx.lineWidth = 1.8 * dpr; ctx.stroke(); }
  } else {
    const top = ["#FFFFFF", "#FFF1E6", "#E9E4FF"][z], bot = ["#CFE6FA", "#F6C9C2", "#9C8FE0"][z];
    if (p.kind === "geser") hopPuffRow(ctx, p, yb, dpr, "#E6F7FF", "#9ED6F2"); else hopPuffRow(ctx, p, yb, dpr, top, bot);
    if (z === 2) wGlow(ctx, p.x, yb, p.w * 0.7, "rgba(190,170,255,.25)");
  }
  if (p.kind === "geser") {
    // garis angin di belakang awan yang geser
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2.5 * dpr; const dir = p.v > 0 ? -1 : 1;
    for (let j = 0; j < 2; j++) { const yy = yb - (4 + j * 8) * dpr, xx = p.x + dir * (p.w / 2 + 6 * dpr); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + dir * (14 + j * 6) * dpr, yy); ctx.stroke(); }
  }
  if (p.spring) {
    // jamur pantul: tudung merah bintik putih
    const mx = p.x, my = p.y - 4 * dpr;
    ctx.fillStyle = "#FFF3DC"; ctx.fillRect(mx - 4 * dpr, my - 2 * dpr, 8 * dpr, 8 * dpr); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = OUTL; ctx.strokeRect(mx - 4 * dpr, my - 2 * dpr, 8 * dpr, 8 * dpr);
    ctx.beginPath(); ctx.ellipse(mx, my - 2 * dpr, 15 * dpr, 10 * dpr, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = "#F0484F"; ctx.fill(); ctx.lineWidth = 2.5 * dpr; ctx.stroke();
    ctx.fillStyle = "#FFFFFF"; [[-7, -6, 2.6], [3, -9, 2.2], [9, -4, 1.8]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(mx + dx * dpr, my + dy * dpr, r * dpr, 0, 7); ctx.fill(); });
  }
  const d = p.deco, dx = x0 + p.w * 0.72, dy = p.y - 3 * dpr;
  if (d === "bunga") [[-10, "#FF7EB6"], [-2, "#FFD45C"], [6, "#FF9F5C"]].forEach(([o, c]) => { const fx = x0 + p.w * 0.3 + o * dpr; ctx.strokeStyle = "#3E9B3A"; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.moveTo(fx, dy + 3 * dpr); ctx.lineTo(fx, dy - 5 * dpr); ctx.stroke(); ctx.beginPath(); ctx.arc(fx, dy - 7 * dpr, 3.2 * dpr, 0, 7); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = OUTL; ctx.stroke(); });
  else if (d === "burung" && z < 2) { const by = dy - 5 * dpr + Math.abs(Math.sin(t * 3 + p.i)) * -2 * dpr; ctx.beginPath(); ctx.ellipse(dx, by, 7 * dpr, 6 * dpr, 0, 0, 7); ctx.fillStyle = "#FFCF4A"; ctx.fill(); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = OUTL; ctx.stroke(); ctx.fillStyle = "#FF8A3D"; ctx.beginPath(); ctx.moveTo(dx + 6 * dpr, by - 1 * dpr); ctx.lineTo(dx + 11 * dpr, by + 1 * dpr); ctx.lineTo(dx + 6 * dpr, by + 2.5 * dpr); ctx.closePath(); ctx.fill(); ctx.fillStyle = OUTL; ctx.beginPath(); ctx.arc(dx + 2.5 * dpr, by - 2 * dpr, 1.3 * dpr, 0, 7); ctx.fill(); }
  else if (d === "kilau" || (d === "burung" && z >= 2)) { const k = 0.7 + 0.3 * Math.sin(t * 4 + p.i); hopStar(ctx, dx, dy - 8 * dpr, 7 * k * dpr, z >= 2 ? "#FFF1A8" : "#FFE36B"); }
  else if (d === "pelangi" && z < 2) { ["#FF6B6B", "#FFB84D", "#FFE66B", "#6BD98A", "#6BB8FF"].forEach((c, j) => { ctx.beginPath(); ctx.arc(x0 + p.w * 0.25, yb, (16 - j * 2.4) * dpr, Math.PI, 0); ctx.lineWidth = 2.4 * dpr; ctx.strokeStyle = c; ctx.stroke(); }); }
  else if (d === "jamur" && z < 3) { ctx.beginPath(); ctx.ellipse(dx, dy - 1 * dpr, 6 * dpr, 4.5 * dpr, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = "#B57BFF"; ctx.fill(); ctx.lineWidth = 1.8 * dpr; ctx.strokeStyle = OUTL; ctx.stroke(); }
  if (p.find) findDraw(ctx, p.find, p.x, p.y - 30 * dpr, 30 * dpr);
}
function hopPuffRow(ctx, p, yb, dpr, top, bot) {
  // awan tebal: badan bulat-pipih, gumpalan besar numpuk di atas, gumpalan kecil di bawah, bayangan lembut di bawahnya.
  // Garis luar tebal digambar dulu, isi gradasi di atasnya, kilau di puncak gumpalan.
  const x0 = p.x - p.w / 2, w = p.w, base = 13 * dpr;
  const pts = p.puffs.map(q => ({ x: x0 + base * 0.9 + (w - base * 1.8) * q.u, y: yb - 3 * dpr - (q.r - 0.75) * 6 * dpr, r: base * q.r }));
  const und = [0.25, 0.5, 0.75].map((u, j) => ({ x: x0 + w * u, y: yb + 8 * dpr, r: (j === 1 ? 8 : 6.5) * dpr }));
  ctx.fillStyle = "rgba(40,30,80,.13)"; ctx.beginPath(); ctx.ellipse(p.x, yb + 20 * dpr, w * 0.42, 5 * dpr, 0, 0, 7); ctx.fill();
  const shape = grow => {
    ctx.beginPath();
    for (const q of pts.concat(und)) { ctx.moveTo(q.x + q.r + grow, q.y); ctx.arc(q.x, q.y, q.r + grow, 0, 7); }
    const h = 16 * dpr, y0 = yb - 4 * dpr;
    ctx.moveTo(x0 + h / 2, y0 - grow);
    ctx.roundRect ? ctx.roundRect(x0 - grow, y0 - grow, w + 2 * grow, h + 2 * grow, h / 2 + grow) : ctx.rect(x0 - grow, y0 - grow, w + 2 * grow, h + 2 * grow);
  };
  shape(3 * dpr); ctx.fillStyle = OUTL; ctx.fill();
  shape(0); ctx.fillStyle = wGrad(ctx, yb - base * 1.6, yb + 16 * dpr, [[0, top], [0.5, top], [1, bot]]); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.85)";
  for (const q of pts) { ctx.beginPath(); ctx.ellipse(q.x - q.r * 0.3, q.y - q.r * 0.5, q.r * 0.32, q.r * 0.17, -0.4, 0, 7); ctx.fill(); }
}
// ikon game yang digambar sendiri (bukan emoji): dipakai di ubin arcade, kartu cara main, dan tantangan harian
const MG_ART = { hop: (ctx, S) => { ctx.translate(S * 0.54, S * 0.5); pipDraw(ctx, S / 64, { vy: 0, t: 1, happy: true }); } };
const MG_ART_C = {};
function mgIconSrc(k, px) {
  const g = MG_GAMES[k];
  if (!MG_ART[k] || typeof document === "undefined") return stickerURL(g.icon, px);
  const id = k + px; if (MG_ART_C[id]) return MG_ART_C[id];
  const c = document.createElement("canvas"); c.width = c.height = px * 2; const ctx = c.getContext("2d");
  if (!ctx) return stickerURL(g.icon, px);
  MG_ART[k](ctx, px * 2); return (MG_ART_C[id] = c.toDataURL());
}
// Pip (v69, kitab dunia arcade): kodok kecil bersyal merah yang pengen sampai ke bulan. Gaya chibi buat anak-anak:
// badan bulat menyatu sama kepala, mata gede berkilau di depan, pipi merah, ekspresi ikut gerakan, kedip sendiri.
// Titik (0,0) = tengah badan, menghadap kanan; bawah kaki sekitar +21 (dikali skala di hopStep supaya pas sama tabrakan +18).
function pipDraw(ctx, k, st) {
  const { vy, t, happy, over } = st;
  const G = (x0, y0, r, a, b) => { const g = ctx.createRadialGradient(x0 * k, y0 * k, 0, x0 * k, y0 * k, r * k); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const oval = (x, y, rx, ry, fill, line = 3) => { ctx.beginPath(); ctx.ellipse(x * k, y * k, rx * k, ry * k, 0, 0, 7); ctx.fillStyle = fill; ctx.fill(); if (line) { ctx.lineWidth = line * k; ctx.strokeStyle = OUTL; ctx.stroke(); } };
  const skin = G(-8, -10, 30, "#B6FF8E", "#3DBB4A"), up = vy < 0, scared = over || vy > 900;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  // ekor syal berkibar ke belakang, keluar dari simpul di sisi belakang leher
  const w = Math.sin(t * 16) * 3;
  ctx.beginPath(); ctx.moveTo(-15 * k, 10 * k); ctx.quadraticCurveTo(-25 * k, (6 + w) * k, -34 * k, (9 - w) * k); ctx.lineTo(-32 * k, (16 - w) * k); ctx.quadraticCurveTo(-24 * k, (15 + w) * k, -15 * k, 15 * k); ctx.closePath();
  ctx.fillStyle = "#E8323F"; ctx.fill(); ctx.lineWidth = 2.5 * k; ctx.strokeStyle = OUTL; ctx.stroke();
  // kaki: lurus ke bawah waktu melesat, menekuk ke samping waktu turun
  if (up) { oval(-8, 18, 4.5, 5.5, "#3DBB4A"); oval(8, 18, 4.5, 5.5, "#3DBB4A"); }
  else { oval(-17, 13, 6.5, 4.5, "#3DBB4A"); oval(17, 13, 6.5, 4.5, "#3DBB4A"); }
  // tonjolan mata di atas kepala (gede, digambar sebelum badan supaya garisnya nyatu)
  oval(-10, -14, 10.5, 10, skin); oval(10, -14, 10.5, 10, skin);
  // badan bulat
  oval(0, 2, 23, 18, skin);
  oval(0, 13, 12, 6.5, "#F2FFD2", 0);
  // syal kain di leher (di bawah mulut, ada garis luar dan lipatan) + simpul di belakang
  ctx.beginPath(); ctx.moveTo(-20 * k, 7 * k); ctx.quadraticCurveTo(0, 14 * k, 20 * k, 7 * k); ctx.lineTo(19 * k, 12 * k); ctx.quadraticCurveTo(0, 19 * k, -19 * k, 12 * k); ctx.closePath();
  ctx.fillStyle = "#E8323F"; ctx.fill(); ctx.lineWidth = 2.5 * k; ctx.strokeStyle = OUTL; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14 * k, 10.5 * k); ctx.quadraticCurveTo(0, 15.5 * k, 14 * k, 10.5 * k); ctx.lineWidth = 1.4 * k; ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.stroke();
  oval(-16, 11, 4, 4, "#C9202E", 2.2);
  // mata: putih besar, pupil gede, dua kilau; kedip tiap ~3 detik
  const blink = (t % 3.2) < 0.12 && !scared, look = up ? -1.5 : 1.5;
  for (const ex of [-10, 10]) {
    if (blink) { ctx.beginPath(); ctx.arc(ex * k, -13 * k, 5 * k, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 2.6 * k; ctx.strokeStyle = OUTL; ctx.stroke(); continue; }
    oval(ex, -14, 7.8, scared ? 8.5 : 7.8, "#FFFFFF", 0);
    oval(ex + 1.6, -14 + look, scared ? 3 : 5, scared ? 3 : 5.4, "#24163A", 0);
    oval(ex + 3.4, -16.4 + look, 1.9, 1.9, "#FFFFFF", 0);
    oval(ex - 0.2, -11.6 + look, 0.9, 0.9, "#FFFFFF", 0);
  }
  // mulut: ketawa lebar habis mendarat, "o" kaget waktu jatuh cepat, senyum kecil biasanya
  ctx.lineWidth = 2.4 * k; ctx.strokeStyle = OUTL;
  if (scared) oval(3, 0, 3.4, 4.2, "#7A2340", 2.2);
  else if (happy) { ctx.beginPath(); ctx.moveTo(-4 * k, -2 * k); ctx.quadraticCurveTo(3 * k, 8 * k, 10 * k, -2 * k); ctx.closePath(); ctx.fillStyle = "#7A2340"; ctx.fill(); ctx.stroke(); oval(3, 2.6, 3, 1.6, "#FF8AA0", 0); }
  else { ctx.beginPath(); ctx.arc(3 * k, -3 * k, 5 * k, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
  // pipi merah dan kilau badan
  oval(-12, -1, 4.2, 2.6, "#FF8FB1", 0); oval(16, -1, 3.6, 2.4, "#FF8FB1", 0);
  oval(-12, -4, 4.5, 2.6, "rgba(255,255,255,.5)", 0);
}
function hopRevive() {
  // lanjut: awan baru tepat di bawah layar tengah, kodok mantul lagi dari situ
  const { cv, dpr } = FC, W = cv.width, H = cv.height;
  FC.fx = FC.aimX = W / 2; FC.fy = H * 0.7; FC.fvy = -1300 * dpr;
  FC.plats.unshift(hopShape({ x: W / 2, y: H * 0.7 + 40 * dpr, w: 120 * dpr, i: FC.hopTop, kind: "biasa", v: 0 }, false));   // di depan: hopAdd tetap nyambung dari awan paling atas
}

// ========== Memory match (30 detik): balik dua kartu, kalau sama +2, berantai nambah bonus. Papan habis = papan baru, +5.
const MEM_FACES = ["🍎", "🍌", "🍇", "🍓", "🥝", "🍍", "🍉", "🍊", "🍐", "🥥", "🍒", "🫐"];
// v72 (biar nggak cepat mentok): papan makin besar (12, 16, 20, lalu 24 kartu), papan tanpa salah +10,
// dan salah dua kali berturut-turut bikin dua kartu tertutup tukeran tempat (ditandai kilat), jadi ingatannya harus diperbarui.
function memInit() { Object.assign(FC, { cards: [], open: [], lock: 0, streak: 0, boards: 0, miss: 0, boardMiss: 0 }); memDeal(); }
function memDeal() {
  const n = Math.min(12, 6 + 2 * FC.boards), faces = MEM_FACES.slice().sort(() => FC.rnd() - 0.5).slice(0, n);
  const deck = faces.concat(faces).map(e => ({ e, up: 0, flip: 0, done: false })).sort(() => FC.rnd() - 0.5);
  FC.cards = deck; FC.open = []; FC.boardMiss = 0; FC.miss = 0; FC.cols = 4; FC.rows = deck.length / 4;
  const D = FC.drop; if (D && !D.done && D.armed) { D.done = true; const e = deck[0].e; deck.forEach(c => { if (c.e === e) c.find = D.kind; }); }
}
function memRect(i) {
  const { cv, dpr } = FC, W = cv.width, H = cv.height, gap = 10 * dpr, top = H * 0.24, bot = H - 40 * dpr;
  const cw = Math.min((W - 40 * dpr - gap * 3) / 4, ((bot - top) - gap * (FC.rows - 1)) / FC.rows / 1.25), ch = cw * 1.25;
  const x0 = (W - (cw * 4 + gap * 3)) / 2, y0 = top + ((bot - top) - (ch * FC.rows + gap * (FC.rows - 1))) / 2;
  return { x: x0 + (i % 4) * (cw + gap), y: y0 + Math.floor(i / 4) * (ch + gap), w: cw, h: ch };
}
function memTap(px, py) {
  if (!FC.run || FC.lock > 0) return;
  const i = FC.cards.findIndex((c, k) => { const r = memRect(k); return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; });
  const c = FC.cards[i];
  if (!c || c.done || c.up || FC.open.length >= 2) return;
  c.up = 1; FC.open.push(i); Sfx.play("ui");
  if (FC.open.length < 2) return;
  const [a, b] = FC.open.map(k => FC.cards[k]);
  if (a.e === b.e) {
    FC.streak += 1; FC.miss = 0; a.done = b.done = true; FC.open = []; FC.caught += 1;
    mgAdd(2 + Math.min(FC.streak - 1, 3)); Sfx.play("pas", FC.streak);
    if (a.find) { mgPick(a.find); a.find = b.find = null; }
    if (FC.cards.every(c => c.done)) { const perfect = !FC.boardMiss; mgAdd(perfect ? 10 : 5); if (perfect) mgNote("Perfect board! +10"); FC.boards += 1; Sfx.play("kombo", 5); FC.lock = 0.6; setTimeout(() => { if (FC && FC.k === "ingat" && FC.run) memDeal(); }, 550); }
  } else { FC.streak = 0; FC.miss += 1; FC.boardMiss += 1; FC.lock = 0.75; Sfx.play("ulat"); if (FC.miss >= 2) { FC.miss = 0; FC.swapDue = true; } }
}
function memStep(dt, el) {
  const { ctx, dpr } = FC;
  const D = FC.drop; if (D && !D.done && el >= D.at) D.armed = true;   // temuan nempel di papan berikutnya
  if (D && D.armed && !D.done) { const rest = FC.cards.filter(c => !c.done && !c.up); if (rest.length >= 2) { D.done = true; const e = rest[0].e; FC.cards.forEach(c => { if (c.e === e && !c.done) c.find = D.kind; }); } }
  if (FC.lock > 0) { FC.lock -= dt; if (FC.lock <= 0 && FC.open.length === 2) { FC.open.forEach(k => { FC.cards[k].up = 0; }); FC.open = []; if (FC.swapDue) memSwap(); } }
  FC.cards.forEach((c, i) => {
    c.flip += ((c.up || c.done ? 1 : 0) - c.flip) * Math.min(1, dt * 14);
    if (c.done && c.flip > 0.98) c.fade = Math.min(1, (c.fade || 0) + dt * 2);
    const r = memRect(i), sx = Math.abs(Math.cos(c.flip * Math.PI)), face = c.flip > 0.5;
    ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(Math.max(0.02, sx), 1);
    ctx.globalAlpha = 1 - (c.fade || 0) * 0.55;
    ctx.fillStyle = face ? "#FFF8EC" : "#6B4BD6"; ctx.strokeStyle = OUTL; ctx.lineWidth = 3 * dpr;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 12 * dpr) : ctx.rect(-r.w / 2, -r.h / 2, r.w, r.h); ctx.fill(); ctx.stroke();
    if (c.swap > 0) { c.swap -= dt; ctx.shadowColor = "#FFE36B"; ctx.shadowBlur = 18 * dpr; ctx.lineWidth = 4 * dpr; ctx.strokeStyle = "#FFE36B"; ctx.stroke(); ctx.shadowBlur = 0; }
    if (face) stamp(ctx, c.e, 0, 0, r.w * 0.55);
    else {
      ctx.fillStyle = "rgba(255,255,255,.18)"; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(k * r.w * 0.2, 0, r.w * 0.06, 0, 7); ctx.fill(); }
      if (c.find) findDraw(ctx, c.find, 0, 0, r.w * 0.45);
    }
    ctx.restore();
  });
  ctx.globalAlpha = 1;
  mgNoteDraw(ctx);
}
function memSwap() {
  // dua kartu tertutup yang belum ketemu pasangannya tukeran tempat
  FC.swapDue = false;
  const idx = FC.cards.map((c, i) => i).filter(i => !FC.cards[i].done && !FC.cards[i].up);
  if (idx.length < 4) return;
  const a = idx[Math.floor(FC.rnd() * idx.length)], rest = idx.filter(i => i !== a && FC.cards[i].e !== FC.cards[a].e), b = rest[Math.floor(FC.rnd() * rest.length)];
  [FC.cards[a], FC.cards[b]] = [FC.cards[b], FC.cards[a]];
  FC.cards[a].swap = FC.cards[b].swap = 0.9;
  mgNote("Two cards swapped!"); Sfx.play("goyang");
}
// tulisan singkat di tengah atas (combo, kartu tukeran, papan sempurna): muncul mental lalu pudar
function mgNote(s) { FC.note = { s, t: 0 }; }
function mgNoteDraw(ctx) {
  const N = FC.note; if (!N) return;
  N.t += 1 / 60; if (N.t > 1.3) { FC.note = null; return; }
  const { cv, dpr } = FC, k = Math.min(1, N.t / 0.15), a = N.t > 1 ? 1 - (N.t - 1) / 0.3 : 1;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(cv.width / 2, cv.height * 0.22); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
  ctx.font = `900 ${24 * dpr}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 6 * dpr; ctx.strokeStyle = OUTL; ctx.lineJoin = "round"; ctx.strokeText(N.s, 0, 0); ctx.fillStyle = "#FFE36B"; ctx.fillText(N.s, 0, 0);
  ctx.restore();
}

// ========== Town run: lari di jalan kota, tap = lompat (bisa dua kali di udara). Nabrak = selesai.
// Skor: +1 tiap rintangan lewat, bintang +3. Makin lama makin cepat.
const RUN_OBS = [{ e: "🚧", w: 40, h: 40 }, { e: "📦", w: 40, h: 40 }, { e: "🛢️", w: 36, h: 46 }, { e: "🚗", w: 70, h: 40 }];
function runInit() {
  const { cv, dpr } = FC;
  Object.assign(FC, { ry: 0, rvy: 0, jumps: 0, speed: 330 * dpr, dist: 0, obs: [], stars: [], nextObs: 1.2, safe: 0, ground: cv.height - 120 * dpr });
}
function runTap() {
  if (!FC.run || FC.over || FC.jumps >= 2) return;
  FC.rvy = -(FC.jumps ? 900 : 1050) * FC.dpr; FC.jumps += 1; Sfx.play("lempar");
}
function runStep(dt) {
  const { cv, ctx, dpr } = FC, W = cv.width, gy = FC.ground, px = W * 0.22, g = 3000 * dpr;
  if (FC.run && !FC.over) {
    FC.speed = Math.min(760 * dpr, FC.speed + dt * 9 * dpr); FC.dist += FC.speed * dt; FC.safe = Math.max(0, FC.safe - dt);
    FC.rvy += g * dt; FC.ry = Math.min(0, FC.ry + FC.rvy * dt); if (FC.ry === 0) { FC.rvy = 0; FC.jumps = 0; }
    FC.nextObs -= dt;
    if (FC.nextObs <= 0) {
      const o = RUN_OBS[Math.floor(FC.rnd() * (FC.dist > 4000 * dpr ? 4 : 3))];
      FC.obs.push({ ...o, x: W + 60 * dpr, passed: false });
      if (FC.rnd() < 0.35) FC.stars.push({ x: W + 60 * dpr + (FC.rnd() < 0.5 ? 0 : 140 * dpr), y: gy - (110 + FC.rnd() * 90) * dpr });
      const D = FC.drop; if (D && !D.done && FC.caught >= D.at) { D.done = true; FC.stars.push({ x: W + 200 * dpr, y: gy - 150 * dpr, find: D.kind }); }
      FC.nextObs = Math.max(0.55, 1.5 - FC.dist / (9000 * dpr)) * (0.75 + FC.rnd() * 0.6);
    }
    for (const o of FC.obs) {
      o.x -= FC.speed * dt;
      const ow = o.w * dpr, oh = o.h * dpr;
      if (!o.passed && o.x + ow / 2 < px - 14 * dpr) { o.passed = true; FC.caught += 1; mgAdd(1); }
      if (!FC.safe && Math.abs(o.x - px) < ow / 2 + 12 * dpr && FC.ry > -oh + 6 * dpr) { FC.over = now(); FC.hitObs = o; Sfx.play("dentang"); navigator.vibrate && navigator.vibrate(120); }
    }
    for (const s of FC.stars) {
      s.x -= FC.speed * dt;
      if (!s.got && Math.abs(s.x - px) < 30 * dpr && Math.abs(s.y - (gy - 26 * dpr + FC.ry)) < 40 * dpr) {
        s.got = true;
        if (s.find) mgPick(s.find); else { mgAdd(3); Sfx.play("bintang"); }
      }
    }
    FC.obs = FC.obs.filter(o => o.x > -80 * dpr); FC.stars = FC.stars.filter(s => s.x > -60 * dpr && !s.got);
  }
  for (const o of FC.obs) stamp(ctx, o.e, o.x, gy - o.h * dpr / 2, Math.max(o.w, o.h) * dpr);
  for (const s of FC.stars) s.find ? findDraw(ctx, s.find, s.x, s.y, 34 * dpr) : stamp(ctx, "⭐", s.x, s.y, 30 * dpr);
  // pelari: emoji menghadap kiri, dibalik biar lari ke kanan; goyang langkah waktu di tanah
  const bob = FC.ry === 0 && FC.run && !FC.over ? Math.abs(Math.sin(FC.dist / (28 * dpr))) * 5 * dpr : 0;
  ctx.save(); ctx.translate(px, gy - 26 * dpr + FC.ry - bob); ctx.scale(-1, 1);
  if (FC.safe) ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now() / 50);
  if (FC.ry < 0) ctx.rotate(-0.15);
  stamp(ctx, "🏃", 0, 0, 52 * dpr); ctx.restore();
}
function runRevive() { FC.obs = FC.obs.filter(o => o !== FC.hitObs && o.x > FC.cv.width * 0.5); FC.safe = 1.5; FC.ry = 0; FC.rvy = 0; FC.jumps = 0; }

// ========== dunia buat tiga game baru
// Frog hop: langit senja yang makin tinggi makin malam, pulau melayang lewat pelan
// v69: langit berzona. Siang biru cerah (balon udara, burung, awan jauh), senja, malam berbintang (bulan makin besar),
// luar angkasa (planet bercincin, bintang jatuh). Zona ngikutin skor, warnanya nyampur halus.
const SKY_Z = [["#4FB3FF", "#8ED6FF", "#DDF5FF"], ["#7B6CF6", "#FF9EB5", "#FFD59E"], ["#141A4A", "#2C2F7A", "#5A4A9A"], ["#07061A", "#1A0F3D", "#2E1660"]];
function wSky(ctx, W, H, dpr, t) {
  const cam = FC.cam || 0;
  FC.zs = (FC.zs || 0) + (hopZone(FC.hopTop || 0) - (FC.zs || 0)) * 0.03;
  const zf = FC.zs, z0 = Math.min(3, Math.floor(zf)), z1 = Math.min(3, z0 + 1), f = zf - z0;
  const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b) => { const A = hx(a), B = hx(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * f)).join(",")})`; };
  ctx.fillStyle = wGrad(ctx, 0, H, SKY_Z[z0].map((c, i) => [i / 2, mix(c, SKY_Z[z1][i])])); ctx.fillRect(0, 0, W, H);
  const night = Math.max(0, Math.min(1, zf - 1.3)), day = Math.max(0, 1 - zf);
  // benda latar ditaruh di "dunia" per lapis: posisi layar = posisi dunia + kamera × parallax, jadi naiknya beda kecepatan
  const layer = (par, gap, seed, draw) => { const off = cam * par, j0 = Math.floor((off - H) / gap) - 1, j1 = Math.floor((off + H) / gap) + 1; for (let j = j0; j <= j1; j++) { const r = Dapur.rng(seed * 977 + j * 131); draw(r, H - j * gap + off, j); } };
  // bintang (malam dan angkasa)
  if (night > 0) layer(0.05, 60 * dpr, 3, (r, y) => { for (let i = 0; i < 4; i++) { const x = r() * W, yy = y + r() * 60 * dpr, k = 0.5 + 0.5 * Math.sin(t * 2 + x); ctx.fillStyle = `rgba(255,250,230,${night * k})`; ctx.beginPath(); ctx.arc(x, yy, (0.8 + r() * 1.4) * dpr, 0, 7); ctx.fill(); } });
  // matahari siang, bulan dari senja ke malam (makin besar)
  // muka imut buat matahari dan bulan: mata lengkung senyum (bulan: mata tidur), pipi merah, senyum kecil
  const face = (x, y, r, sleepy) => {
    ctx.strokeStyle = OUTL; ctx.lineWidth = Math.max(2, r * 0.09); ctx.lineCap = "round";
    for (const sx of [-1, 1]) { ctx.beginPath(); sleepy ? ctx.arc(x + sx * r * 0.32, y - r * 0.08, r * 0.13, 0.15 * Math.PI, 0.85 * Math.PI) : ctx.arc(x + sx * r * 0.32, y - r * 0.02, r * 0.13, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y + r * 0.18, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = "rgba(255,110,110,.45)"; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sx * r * 0.55, y + r * 0.2, r * 0.15, r * 0.09, 0, 0, 7); ctx.fill(); }
  };
  if (day > 0.05) {
    const sx = W * 0.18, sy = H * 0.12, sr = 28 * dpr;
    ctx.globalAlpha = day; wGlow(ctx, sx, sy, 120 * dpr, "rgba(255,240,150,.7)");
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.25); ctx.fillStyle = "#FFC93C"; ctx.strokeStyle = OUTL; ctx.lineWidth = 2.5 * dpr;
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, l = (i % 2 ? 44 : 50) * dpr; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.16) * sr * 0.9, Math.sin(a - 0.16) * sr * 0.9); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.lineTo(Math.cos(a + 0.16) * sr * 0.9, Math.sin(a + 0.16) * sr * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fillStyle = wGrad(ctx, sy - sr, sy + sr, [[0, "#FFF39A"], [1, "#FFC93C"]]); ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
    face(sx, sy, sr, false); ctx.globalAlpha = 1;
  }
  const mo = Math.max(0, Math.min(1, zf - 0.6));
  if (mo > 0 && zf < 3.2) {
    const mr = (20 + 50 * Math.min(1, zf / 3)) * dpr, mx = W * 0.76, my = H * 0.13;
    ctx.globalAlpha = mo; wGlow(ctx, mx, my, mr * 3, "rgba(255,240,200,.45)");
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fillStyle = wGrad(ctx, my - mr, my + mr, [[0, "#FFFBEA"], [1, "#F3DFA8"]]); ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
    ctx.fillStyle = "rgba(200,170,120,.35)"; [[-0.5, -0.45, 0.14], [0.5, -0.5, 0.1], [0.55, 0.45, 0.12]].forEach(([cx, cy, cr]) => { ctx.beginPath(); ctx.arc(mx + cx * mr, my + cy * mr, cr * mr, 0, 7); ctx.fill(); });
    face(mx, my, mr, true); ctx.globalAlpha = 1;
  }
  // planet (angkasa)
  if (zf > 2.4) { ctx.globalAlpha = Math.min(1, (zf - 2.4) * 1.6); layer(0.12, 340 * dpr, 7, (r, y) => { const x = W * (0.1 + r() * 0.8), pr = (18 + r() * 26) * dpr, hue = Math.floor(r() * 360); ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.fillStyle = `hsl(${hue} 65% 62%)`; ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.arc(x - pr * 0.3, y - pr * 0.3, pr * 0.35, 0, 7); ctx.fill(); if (r() < 0.6) { ctx.beginPath(); ctx.ellipse(x, y, pr * 1.7, pr * 0.42, -0.35, 0, 7); ctx.lineWidth = 3.5 * dpr; ctx.strokeStyle = `hsl(${(hue + 40) % 360} 70% 75%)`; ctx.stroke(); } }); ctx.globalAlpha = 1; }
  // awan jauh lembut, dua lapis (siang dan senja)
  const soft = Math.max(0, 1 - Math.max(0, zf - 1.4));
  if (soft > 0) for (const [par, gap, a, sz] of [[0.18, 230, 0.45, 0.8], [0.35, 300, 0.7, 1.15]]) layer(par, gap * dpr, gap, (r, y) => { const x = r() * W, s = (28 + r() * 30) * dpr * sz; ctx.fillStyle = `rgba(255,255,255,${a * soft})`; [[0, 0, 1], [0.9, -0.35, 0.8], [1.8, 0, 0.9], [0.9, 0.25, 0.85]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, rr * s, 0, 7); ctx.fill(); }); });
  // balon udara dan burung (siang ke senja)
  if (soft > 0.2) layer(0.28, 520 * dpr, 11, (r, y, j) => {
    const x = W * (0.12 + r() * 0.76) + Math.sin(t * 0.5 + j) * 12 * dpr, s = (16 + r() * 10) * dpr, cols = [["#FF6B6B", "#FFE66B"], ["#6BB8FF", "#FFFFFF"], ["#B57BFF", "#FFB84D"]][Math.floor(r() * 3)];
    ctx.globalAlpha = soft; ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = OUTL;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x, y, s * (1 - i * 0.24), s * 1.15, 0, 0, 7); ctx.fillStyle = cols[i % 2]; ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(x, y, s, s * 1.15, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - s * 0.5, y + s); ctx.lineTo(x - s * 0.3, y + s * 1.6); ctx.moveTo(x + s * 0.5, y + s); ctx.lineTo(x + s * 0.3, y + s * 1.6); ctx.lineWidth = 1.5 * dpr; ctx.stroke();
    ctx.fillStyle = "#A5683A"; ctx.fillRect(x - s * 0.35, y + s * 1.6, s * 0.7, s * 0.5); ctx.lineWidth = 2 * dpr; ctx.strokeRect(x - s * 0.35, y + s * 1.6, s * 0.7, s * 0.5);
    ctx.globalAlpha = 1;
  });
  if (soft > 0.2) layer(0.4, 420 * dpr, 13, (r, y, j) => {
    const sp = 40 + r() * 30, x = ((r() * W + t * sp * dpr) % (W + 120 * dpr)) - 60 * dpr, n = 3 + Math.floor(r() * 3);
    ctx.strokeStyle = `rgba(60,40,90,${0.7 * soft})`; ctx.lineWidth = 2.2 * dpr;
    for (let i = 0; i < n; i++) { const bx = x - i * 16 * dpr, by = y + (i % 2) * 10 * dpr + i * 4 * dpr, fl = Math.sin(t * 10 + i) * 4 * dpr; ctx.beginPath(); ctx.moveTo(bx - 7 * dpr, by - fl); ctx.quadraticCurveTo(bx - 3 * dpr, by - 4 * dpr, bx, by); ctx.quadraticCurveTo(bx + 3 * dpr, by - 4 * dpr, bx + 7 * dpr, by - fl); ctx.stroke(); }
  });
  // padang awal di bawah (cuma kelihatan di awal): bukit jauh, desa kecil, rumput depan. Nempel ke kamera biar kerasa naik.
  if (cam < H * 1.2) {
    const gy = H - 34 * dpr + cam;
    ctx.fillStyle = "#9ED67A"; ctx.strokeStyle = OUTL; ctx.lineWidth = 3 * dpr;
    ctx.beginPath(); ctx.moveTo(0, H + cam); ctx.lineTo(0, gy - 40 * dpr); ctx.quadraticCurveTo(W * 0.25, gy - 110 * dpr, W * 0.55, gy - 50 * dpr); ctx.quadraticCurveTo(W * 0.8, gy - 120 * dpr, W, gy - 60 * dpr); ctx.lineTo(W, H + cam); ctx.closePath(); ctx.fill(); ctx.stroke();
    const hs = [[0.16, "#FF8A8A"], [0.3, "#FFD36B"], [0.7, "#8AC6FF"], [0.86, "#C59BFF"]];
    for (const [u, c] of hs) { const hx = W * u, hy = gy - 30 * dpr - Math.sin(u * 6) * 10 * dpr, hw = 22 * dpr; ctx.fillStyle = "#FFF6E8"; ctx.fillRect(hx - hw / 2, hy - hw * 0.7, hw, hw * 0.7); ctx.strokeRect(hx - hw / 2, hy - hw * 0.7, hw, hw * 0.7); ctx.beginPath(); ctx.moveTo(hx - hw * 0.7, hy - hw * 0.65); ctx.lineTo(hx, hy - hw * 1.3); ctx.lineTo(hx + hw * 0.7, hy - hw * 0.65); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.stroke(); ctx.fillStyle = "#6B4A3A"; ctx.fillRect(hx - 3 * dpr, hy - 9 * dpr, 6 * dpr, 9 * dpr); }
    for (const u of [0.05, 0.45, 0.6, 0.97]) { const tx = W * u, ty = gy - 22 * dpr; ctx.fillStyle = "#7A5236"; ctx.fillRect(tx - 3 * dpr, ty - 4 * dpr, 6 * dpr, 16 * dpr); ctx.beginPath(); ctx.arc(tx, ty - 12 * dpr, 13 * dpr, 0, 7); ctx.fillStyle = "#4FB45A"; ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = "#6CC46A"; ctx.beginPath(); ctx.moveTo(0, gy); for (let x = 0; x <= W; x += 18 * dpr) ctx.quadraticCurveTo(x + 9 * dpr, gy - 8 * dpr, x + 18 * dpr, gy); ctx.lineTo(W, H + cam + 40 * dpr); ctx.lineTo(0, H + cam + 40 * dpr); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 9; i++) { const fx = (i * 0.113 + 0.04) % 1 * W, fy = gy + (10 + (i * 7) % 18) * dpr; ctx.beginPath(); ctx.arc(fx, fy, 3 * dpr, 0, 7); ctx.fillStyle = ["#FF7EB6", "#FFE36B", "#FFFFFF"][i % 3]; ctx.fill(); }
  }
  // bintang jatuh (angkasa), sesekali
  if (zf > 2.6) { const k = (t * 0.35) % 1, sx = W * (1 - k * 1.3), sy = H * (0.1 + 0.3 * ((Math.floor(t * 0.35) * 0.37) % 1)) + k * H * 0.3; ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2.5 * dpr; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 40 * dpr, sy - 18 * dpr); ctx.stroke(); }
}
// Memory match: meja kayu di bawah lampu gantung yang hangat
function wTable(ctx, W, H, dpr, t) {
  ctx.drawImage(wLayer("meja", W, H, (c, w, h) => {
    c.fillStyle = wGrad(c, 0, h, [[0, "#2A1D33"], [1, "#1A1222"]]); c.fillRect(0, 0, w, h);
    const ty = h * 0.2;
    c.fillStyle = wGrad(c, ty, h, [[0, "#7A4A2A"], [1, "#4A2C18"]]); c.fillRect(0, ty, w, h - ty);
    c.strokeStyle = "rgba(34,24,43,.45)"; c.lineWidth = 2 * dpr; for (let y = ty + 40 * dpr; y < h; y += 46 * dpr) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.lineWidth = 3 * dpr; c.strokeStyle = OUTL; c.beginPath(); c.moveTo(0, ty); c.lineTo(w, ty); c.stroke();
  }), 0, 0);
  // lampu gantung di pojok kiri, biar nggak nabrak angka skor di tengah
  const sw = Math.sin(t * 0.8) * 5 * dpr, lx = W * 0.16 + sw, ly = H * 0.1;
  wGlow(ctx, W / 2, H * 0.58, W * 0.75, "rgba(255,200,120,.3)");
  ctx.strokeStyle = OUTL; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.moveTo(W * 0.16, 0); ctx.lineTo(lx, ly - 18 * dpr); ctx.stroke();
  ctx.fillStyle = "#E8B04A"; ctx.beginPath(); ctx.moveTo(lx - 26 * dpr, ly + 18 * dpr); ctx.lineTo(lx + 26 * dpr, ly + 18 * dpr); ctx.lineTo(lx + 12 * dpr, ly - 18 * dpr); ctx.lineTo(lx - 12 * dpr, ly - 18 * dpr); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2.5 * dpr; ctx.stroke();
  wGlow(ctx, lx, ly + 22 * dpr, 50 * dpr, "rgba(255,240,180,.9)");
}
// Town run: jalan kota senja, rumah dan lampu jalan geser beda kecepatan
function wTown(ctx, W, H, dpr, t) {
  const d = FC.dist || 0, gy = FC.ground || H - 120 * dpr;
  ctx.fillStyle = wGrad(ctx, 0, H, [[0, "#3A2A6E"], [0.5, "#D9708A"], [0.8, "#FFB070"], [1, "#FFD08A"]]); ctx.fillRect(0, 0, W, H);
  wGlow(ctx, W * 0.75, gy - 120 * dpr, W * 0.5, "rgba(255,200,110,.5)");
  for (let i = 0; i < 3; i++) { const s = (16 + i * 4) * dpr, x = ((W + 200 * dpr) - ((d * 0.05 + t * 8 * dpr + i * W * 0.45) % (W + 200 * dpr))) - 100 * dpr; wCloud(ctx, x, H * (0.12 + i * 0.1), s, "#FFD3C0"); }
  const far = wLayer("kotaJ", W * 2, Math.round(H * 0.4), (c, w, h) => wSkyline(c, w, h, 31, "#6A3F78", ["rgba(255,220,150,.55)"], dpr, 0.5));
  const fx = -((d * 0.2) % far.width) ;
  ctx.drawImage(far, fx, gy - far.height + 10 * dpr); ctx.drawImage(far, fx + far.width, gy - far.height + 10 * dpr);
  // rumah depan dan lampu jalan
  const hw = 150 * dpr, off = (d * 0.6) % hw;
  for (let i = -1; i < W / hw + 2; i++) {
    const x = i * hw - off, r = Dapur.rng(Math.floor((d * 0.6) / hw) + i + 1000), hh = (70 + r() * 40) * dpr, col = ["#C8607A", "#5B7BD5", "#E59A2E", "#5E8F3E"][Math.floor(r() * 4)];
    ctx.fillStyle = col; ctx.fillRect(x + 10 * dpr, gy - hh, hw - 30 * dpr, hh); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.strokeRect(x + 10 * dpr, gy - hh, hw - 30 * dpr, hh);
    ctx.fillStyle = "#7A3A3A"; ctx.beginPath(); ctx.moveTo(x + 2 * dpr, gy - hh); ctx.lineTo(x + hw / 2 - 10 * dpr, gy - hh - 34 * dpr); ctx.lineTo(x + hw - 12 * dpr, gy - hh); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FFE07A"; ctx.fillRect(x + 30 * dpr, gy - hh + 18 * dpr, 20 * dpr, 18 * dpr); ctx.strokeRect(x + 30 * dpr, gy - hh + 18 * dpr, 20 * dpr, 18 * dpr);
    ctx.fillStyle = "#4A2C18"; ctx.fillRect(x + hw - 60 * dpr, gy - 40 * dpr, 22 * dpr, 40 * dpr); ctx.strokeRect(x + hw - 60 * dpr, gy - 40 * dpr, 22 * dpr, 40 * dpr);
  }
  const lw = 260 * dpr, lo = (d % lw);
  for (let i = 0; i < W / lw + 2; i++) {
    const x = i * lw - lo + 40 * dpr;
    ctx.fillStyle = "#2E2440"; ctx.fillRect(x, gy - 150 * dpr, 6 * dpr, 150 * dpr);
    wGlow(ctx, x + 3 * dpr, gy - 150 * dpr, 46 * dpr, "rgba(255,220,140,.8)", 0.8 + 0.2 * Math.sin(t * 3 + i));
    ctx.fillStyle = "#FFE9A8"; ctx.beginPath(); ctx.arc(x + 3 * dpr, gy - 152 * dpr, 7 * dpr, 0, 7); ctx.fill(); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
  }
  ctx.fillStyle = "#3A3048"; ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = "#5A4E68"; ctx.fillRect(0, gy, W, 10 * dpr);
  ctx.fillStyle = "#FFD15C"; const dl = 60 * dpr, dof = d % dl; for (let x = -dof; x < W; x += dl) ctx.fillRect(x, gy + 46 * dpr, 30 * dpr, 5 * dpr);
  ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
}
Object.assign(WORLDS, { hop: wSky, ingat: wTable, lari: wTown });
const MG_REVIVE = { stack: () => stackNew(), pisau: () => { FC.bounce = null; }, hop: hopRevive, lari: runRevive };

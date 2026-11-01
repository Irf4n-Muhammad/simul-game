// ---- tiga game baru (v67): Frog hop, Memory match, Town run. Pola sama kayak game lain: FC.k, langkah per frame,
// skor lewat mgAdd, temuan lewat FC.drop/mgPick, "lanjut sekali" lewat MG_REVIVE.

// ========== Frog hop: kodok mantul otomatis, jari geser kiri-kanan buat ngarahin ke awan. Jatuh = selesai.
// Makin tinggi awannya makin jarang; mulai awan ke-15 ada yang rapuh, mulai ke-25 ada yang geser. Pegas (langka) = lompatan super.
function hopInit() {
  const { cv, dpr } = FC, W = cv.width, H = cv.height;
  Object.assign(FC, { fx: W / 2, fy: H - 160 * dpr, fvy: -1150 * dpr, aimX: W / 2, cam: 0, plats: [], hopTop: 0, face: 1 });
  FC.plats.push({ x: W / 2, y: H - 120 * dpr, w: 110 * dpr, i: 0 });
  while (FC.plats.length < 14) hopAdd();
}
function hopAdd() {
  const { cv, dpr } = FC, W = cv.width, last = FC.plats[FC.plats.length - 1], i = last.i + 1;
  const gap = (78 + Math.min(i, 60) * 1.1 + FC.rnd() * 30) * dpr, w = Math.max(62, 96 - i * 0.4) * dpr;
  const kind = i > 25 && FC.rnd() < 0.25 ? "geser" : i > 15 && FC.rnd() < 0.2 ? "rapuh" : "biasa";
  const p = { x: w / 2 + FC.rnd() * (W - w), y: last.y - gap, w, i, kind, v: (FC.rnd() < 0.5 ? -1 : 1) * (60 + i) * dpr };
  if (kind === "biasa" && i > 5 && FC.rnd() < 0.08) p.spring = true;
  const D = FC.drop; if (D && !D.done && i >= D.at + 2) { D.done = true; p.find = D.kind; }
  FC.plats.push(p);
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
        FC.fvy = -(p.spring ? 1900 : 1150) * dpr; FC.fy = p.y - 18 * dpr;
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
  // awan pijakan
  for (const p of FC.plats) {
    if (p.gone) continue;
    const col = p.kind === "rapuh" ? "#E8D7C9" : p.kind === "geser" ? "#BFE8FF" : "#FFFFFF", s = p.w / 2.9;
    wCloud(ctx, p.x - p.w / 2 + s * 0.55, p.y + s * 0.2, s, col);
    if (p.kind === "rapuh") { ctx.strokeStyle = "rgba(34,24,43,.5)"; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.moveTo(p.x - 8 * dpr, p.y - 4 * dpr); ctx.lineTo(p.x, p.y + 6 * dpr); ctx.lineTo(p.x + 9 * dpr, p.y - 2 * dpr); ctx.stroke(); }
    if (p.spring) stamp(ctx, "🌀", p.x, p.y - 14 * dpr, 26 * dpr);
    if (p.find) findDraw(ctx, p.find, p.x, p.y - 30 * dpr, 30 * dpr);
  }
  // kodok: miring ngikutin arah, gepeng dikit waktu mantul
  const sq = FC.fvy < 0 ? 1 + Math.min(0.15, -FC.fvy / (9000 * dpr)) : 1;
  // digambar 1.3x lebih besar dan digeser naik dikit biar kakinya tetap pas di awan
  ctx.save(); ctx.translate(FC.fx, FC.fy - 10 * dpr); ctx.scale(FC.face * (2 - sq), sq); pipDraw(ctx, 1.3 * dpr, FC.fvy < 0, now() / 1000); ctx.restore();
}
// Pip (v68, kitab dunia arcade): kodok kecil bersyal merah yang pengen sampai ke bulan. Digambar sendiri, bukan emoji.
// Titik (0,0) = tengah badan, menghadap kanan; kaki bawah di sekitar +18 (sama kayak kaki di tabrakan awan).
function pipDraw(ctx, k, up, t) {
  const G = (x0, y0, r, a, b) => { const g = ctx.createRadialGradient(x0 * k, y0 * k, 0, x0 * k, y0 * k, r * k); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const oval = (x, y, rx, ry, fill, line = 3) => { ctx.beginPath(); ctx.ellipse(x * k, y * k, rx * k, ry * k, 0, 0, 7); ctx.fillStyle = fill; ctx.fill(); if (line) { ctx.lineWidth = line * k; ctx.strokeStyle = OUTL; ctx.stroke(); } };
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  // ekor syal berkibar ke belakang
  const w = Math.sin(t * 14) * 3;
  ctx.beginPath(); ctx.moveTo(-10 * k, -2 * k); ctx.quadraticCurveTo(-22 * k, (-6 + w) * k, -30 * k, (-1 - w) * k); ctx.lineTo(-29 * k, (5 - w) * k); ctx.quadraticCurveTo(-21 * k, (3 + w) * k, -10 * k, 4 * k); ctx.closePath();
  ctx.fillStyle = "#E8404F"; ctx.fill(); ctx.lineWidth = 2.5 * k; ctx.strokeStyle = OUTL; ctx.stroke();
  // kaki belakang: lurus waktu naik, ditekuk waktu turun
  const legC = "#4FA845";
  if (up) { oval(-9, 19, 4, 7, legC); oval(9, 19, 4, 7, legC); }
  else { oval(-16, 12, 7, 4.5, legC); oval(16, 12, 7, 4.5, legC); }
  // badan
  oval(0, 3, 20, 16, G(-7, -5, 26, "#A8EA74", "#3C9A3A"));
  oval(2, 8, 11, 7.5, "#ECF8BE", 0);
  // syal di leher
  ctx.beginPath(); ctx.moveTo(-15 * k, -3 * k); ctx.quadraticCurveTo(0, 4 * k, 15 * k, -3 * k); ctx.lineWidth = 5 * k; ctx.strokeStyle = "#E8404F"; ctx.stroke();
  // tali kacamata terbang di dahi, mata nongol di atasnya
  ctx.beginPath(); ctx.moveTo(-18 * k, -8 * k); ctx.quadraticCurveTo(0, -14 * k, 18 * k, -8 * k); ctx.lineWidth = 3 * k; ctx.strokeStyle = "#8A5A2B"; ctx.stroke();
  for (const ex of [-8, 8]) {
    oval(ex, -13, 7.5, 7, G(ex - 2, -16, 9, "#A8EA74", "#3C9A3A"));
    oval(ex + 0.5, -13, 4.8, 4.8, "#FFFFFF", 0);
    oval(ex + 2, up ? -14.5 : -12.5, 2.4, 2.6, OUTL, 0);
    oval(ex + 2.8, up ? -15.5 : -13.5, 0.8, 0.8, "#FFFFFF", 0);
  }
  // senyum dan pipi
  ctx.beginPath(); ctx.arc(5 * k, 0, 5 * k, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 2.2 * k; ctx.strokeStyle = OUTL; ctx.stroke();
  oval(14, 1, 3, 2, "rgba(255,120,140,.55)", 0);
  // kilau
  oval(-9, -3, 5, 3, "rgba(255,255,255,.45)", 0);
}
function hopRevive() {
  // lanjut: awan baru tepat di bawah layar tengah, kodok mantul lagi dari situ
  const { cv, dpr } = FC, W = cv.width, H = cv.height;
  FC.fx = FC.aimX = W / 2; FC.fy = H * 0.7; FC.fvy = -1300 * dpr;
  FC.plats.unshift({ x: W / 2, y: H * 0.7 + 40 * dpr, w: 120 * dpr, i: FC.hopTop, kind: "biasa", v: 0 });   // di depan: hopAdd tetap nyambung dari awan paling atas
}

// ========== Memory match (30 detik): balik dua kartu, kalau sama +2, berantai nambah bonus. Papan habis = papan baru, +5.
const MEM_FACES = ["🍎", "🍌", "🍇", "🍓", "🥝", "🍍", "🍉", "🍊", "🍐", "🥥", "🍒", "🫐"];
function memInit() { Object.assign(FC, { cards: [], open: [], lock: 0, streak: 0, boards: 0 }); memDeal(); }
function memDeal() {
  const n = FC.boards === 0 ? 6 : 8, faces = MEM_FACES.slice().sort(() => FC.rnd() - 0.5).slice(0, n);
  const deck = faces.concat(faces).map(e => ({ e, up: 0, flip: 0, done: false })).sort(() => FC.rnd() - 0.5);
  FC.cards = deck; FC.open = []; FC.cols = 4; FC.rows = deck.length / 4;
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
    FC.streak += 1; a.done = b.done = true; FC.open = []; FC.caught += 1;
    mgAdd(2 + Math.min(FC.streak - 1, 3)); Sfx.play("pas", FC.streak);
    if (a.find) { mgPick(a.find); a.find = b.find = null; }
    if (FC.cards.every(c => c.done)) { mgAdd(5); FC.boards += 1; Sfx.play("kombo", 5); FC.lock = 0.6; setTimeout(() => { if (FC && FC.k === "ingat" && FC.run) memDeal(); }, 550); }
  } else { FC.streak = 0; FC.lock = 0.75; Sfx.play("ulat"); }
}
function memStep(dt, el) {
  const { ctx, dpr } = FC;
  const D = FC.drop; if (D && !D.done && el >= D.at) D.armed = true;   // temuan nempel di papan berikutnya
  if (D && D.armed && !D.done) { const rest = FC.cards.filter(c => !c.done && !c.up); if (rest.length >= 2) { D.done = true; const e = rest[0].e; FC.cards.forEach(c => { if (c.e === e && !c.done) c.find = D.kind; }); } }
  if (FC.lock > 0) { FC.lock -= dt; if (FC.lock <= 0 && FC.open.length === 2) { FC.open.forEach(k => { FC.cards[k].up = 0; }); FC.open = []; } }
  FC.cards.forEach((c, i) => {
    c.flip += ((c.up || c.done ? 1 : 0) - c.flip) * Math.min(1, dt * 14);
    if (c.done && c.flip > 0.98) c.fade = Math.min(1, (c.fade || 0) + dt * 2);
    const r = memRect(i), sx = Math.abs(Math.cos(c.flip * Math.PI)), face = c.flip > 0.5;
    ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(Math.max(0.02, sx), 1);
    ctx.globalAlpha = 1 - (c.fade || 0) * 0.55;
    ctx.fillStyle = face ? "#FFF8EC" : "#6B4BD6"; ctx.strokeStyle = OUTL; ctx.lineWidth = 3 * dpr;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 12 * dpr) : ctx.rect(-r.w / 2, -r.h / 2, r.w, r.h); ctx.fill(); ctx.stroke();
    if (face) stamp(ctx, c.e, 0, 0, r.w * 0.55);
    else {
      ctx.fillStyle = "rgba(255,255,255,.18)"; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(k * r.w * 0.2, 0, r.w * 0.06, 0, 7); ctx.fill(); }
      if (c.find) findDraw(ctx, c.find, 0, 0, r.w * 0.45);
    }
    ctx.restore();
  });
  ctx.globalAlpha = 1;
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
function wSky(ctx, W, H, dpr, t) {
  const cam = FC.cam || 0, hi = Math.min(1, cam / (H * 6));
  const mix = (a, b) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * hi)).join(",")})`;
  ctx.fillStyle = wGrad(ctx, 0, H, [[0, mix([90, 70, 170], [12, 10, 40])], [0.6, mix([255, 150, 170], [60, 40, 110])], [1, mix([255, 210, 160], [110, 70, 140])]]);
  ctx.fillRect(0, 0, W, H);
  const r = Dapur.rng(41);
  for (let i = 0; i < 50; i++) { const x = r() * W, y = ((r() * H * 2 + cam * 0.1) % (H * 1.2)) - 20, k = 0.4 + 0.6 * Math.sin(t * 2 + i); ctx.fillStyle = `rgba(255,250,230,${(0.15 + hi * 0.85) * k})`; ctx.fillRect(x, y, 2 * dpr, 2 * dpr); }
  // bulan = tujuan Pip: makin tinggi, makin besar dan terang
  const mr = (22 + 46 * hi) * dpr, mx = W * 0.76, my = H * 0.13;
  wGlow(ctx, mx, my, mr * 3, `rgba(255,240,200,${0.25 + 0.35 * hi})`);
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fillStyle = "#FFF4D6"; ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
  ctx.fillStyle = "rgba(200,180,140,.45)"; [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.4, 0.12]].forEach(([cx, cy, cr]) => { ctx.beginPath(); ctx.arc(mx + cx * mr, my + cy * mr, cr * mr, 0, 7); ctx.fill(); });
  for (let i = 0; i < 3; i++) {
    const y = ((i * H * 0.45 + cam * 0.2) % (H * 1.4)) - H * 0.2, x = W * (0.15 + ((i * 0.37) % 0.7)) + Math.sin(t * 0.3 + i) * 10 * dpr, s = (40 + i * 10) * dpr;
    // pulau jauh: pudar dan tanpa garis, biar nggak dikira pijakan
    ctx.globalAlpha = 0.28; ctx.fillStyle = "#4A3A70"; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * 0.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#3E7A55"; ctx.fillRect(x - s, y - 6 * dpr, s * 2, 8 * dpr); ctx.globalAlpha = 1;
  }
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

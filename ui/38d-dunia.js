// ---- dunia tiap mini game (v59, diskusi 31 Okt: "terlalu polos", pilihan "dunia kartun, efek neon")
// Kanvas #mgBg di paling belakang: di depannya skor, lalu kanvas permainan. Dunianya kartun yang hangat dan agak gelap
// (malam, senja) dengan garis tebel; yang nyala cuma lampu, kunang-kunang, jendela, dan efek. Lapisan diam digambar
// sekali ke kanvas cadangan (WCACHE), yang gerak digambar tiap frame.
const OUTL = "#22182B";
const WCACHE = {};
function wLayer(key, w, h, draw) {
  const id = key + ":" + w + "x" + h;
  if (!WCACHE[id]) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); WCACHE[id] = c; }
  return WCACHE[id];
}
function worldDraw(dt) {
  const cv = $("mgBg");
  if (!cv || !FC) return;
  const dpr = FC.dpr, W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (!W || !H) return;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const t = reduce ? 0 : now() / 1000, ctx = cv.getContext("2d");
  (WORLDS[FC.k] || wOrchard)(ctx, W, H, dpr, t, dt || 0);
}
// alat gambar kecil
const wGrad = (ctx, y0, y1, stops) => { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
function wGlow(ctx, x, y, r, col, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = a; ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
}
function wHills(ctx, w, h, y, amp, col, seed, dpr) {
  // bukit/gunung bergelombang dengan garis atas tebel
  const r = Dapur.rng(seed), n = 5, pts = [];
  for (let i = 0; i <= n; i++) pts.push([w * i / n, y - r() * amp]);
  ctx.beginPath(); ctx.moveTo(-10, h + 10); ctx.lineTo(-10, pts[0][1]);
  for (let i = 0; i < n; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; ctx.quadraticCurveTo(x0 + (x1 - x0) / 2, Math.min(y0, y1) - amp * 0.5, x1, y1); }
  ctx.lineTo(w + 10, h + 10); ctx.closePath();
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
}
function wFlies(ctx, W, H, dpr, t, n, col, area) {
  // kunang-kunang: jalur lissajous tetap, kedip pelan
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996, x = W * (0.5 + 0.45 * Math.sin(t * 0.13 * (1 + i % 3) + a)), y = H * (area[0] + (area[1] - area[0]) * (0.5 + 0.5 * Math.sin(t * 0.17 * (1 + i % 2) + a * 1.7)));
    const k = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.8 + a * 3));
    wGlow(ctx, x, y, 14 * dpr, col, k * 0.8);
    ctx.fillStyle = "#FFFDE8"; ctx.globalAlpha = k; ctx.beginPath(); ctx.arc(x, y, 1.8 * dpr, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
}
function wCloud(ctx, x, y, s, col) {
  // awan kartun: gumpalan bulat, digambar dua kali (garis dulu, isi kemudian) biar garisnya cuma di luar
  const b = [[0, 0, 1], [0.9, -0.35, 0.8], [1.8, 0, 0.9], [0.9, 0.25, 0.85]];
  ctx.fillStyle = OUTL; b.forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s + 3, 0, 7); ctx.fill(); });
  ctx.fillStyle = col; b.forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); ctx.fill(); });
}

// Knife throw: dojo malam. Bulan, gunung, bambu bergoyang, lampion berayun, kunang-kunang, lantai kayu.
function wDojo(ctx, W, H, dpr, t) {
  ctx.drawImage(wLayer("dojo", W, H, (c, w, h) => {
    c.fillStyle = wGrad(c, 0, h, [[0, "#0B1424"], [0.45, "#173236"], [0.8, "#1E2A24"], [1, "#16120E"]]); c.fillRect(0, 0, w, h);
    const r = Dapur.rng(7);
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,250,220,${0.25 + r() * 0.5})`; c.fillRect(r() * w, r() * h * 0.45, 1.5 * dpr, 1.5 * dpr); }
    const mx = w * 0.78, my = h * 0.13, mr = w * 0.1;
    wGlow(c, mx, my, mr * 3.2, "rgba(255,240,190,.35)");
    c.fillStyle = "#FFF1C4"; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill(); c.lineWidth = 3 * dpr; c.strokeStyle = OUTL; c.stroke();
    c.fillStyle = "rgba(210,180,120,.45)"; [[-0.3, -0.2, 0.22], [0.35, 0.25, 0.16], [0.1, 0.45, 0.1]].forEach(([dx, dy, rr]) => { c.beginPath(); c.arc(mx + dx * mr, my + dy * mr, rr * mr, 0, 7); c.fill(); });
    wHills(c, w, h, h * 0.55, h * 0.12, "#1C3442", 3, dpr);
    wHills(c, w, h, h * 0.68, h * 0.08, "#16282A", 11, dpr);
    // lantai kayu
    const fy = h * 0.84;
    c.fillStyle = wGrad(c, fy, h, [[0, "#6B4428"], [1, "#3E2615"]]); c.fillRect(0, fy, w, h - fy);
    c.strokeStyle = "rgba(34,24,43,.55)"; c.lineWidth = 2 * dpr;
    for (let i = 1; i < 5; i++) { const y = fy + (h - fy) * i / 5; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let i = 0; i < 9; i++) { const y = fy + (h - fy) * (i % 5) / 5, x = (i * 0.37 % 1) * w; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + (h - fy) / 5); c.stroke(); }
    c.fillStyle = "#8A5A34"; c.fillRect(0, fy - 4 * dpr, w, 8 * dpr); c.lineWidth = 3 * dpr; c.strokeStyle = OUTL; c.strokeRect(-5, fy - 4 * dpr, w + 10, 8 * dpr);
  }), 0, 0);
  // sorot lampu di belakang kayu
  wGlow(ctx, W / 2, H * 0.34, 190 * dpr, "rgba(255,214,140,.22)");
  // bambu di kiri dan kanan
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const bx = side < 0 ? (10 + i * 22) * dpr : W - (10 + i * 22) * dpr, base = H * 0.86, len = H * (0.7 + 0.12 * ((i * 7) % 3));
    const sway = Math.sin(t * 0.7 + i * 1.3 + side) * 0.025, bw = (13 - i * 2) * dpr;
    ctx.save(); ctx.translate(bx, base); ctx.rotate(sway * (side < 0 ? 1 : -1));
    const seg = len / 6;
    for (let s = 0; s < 6; s++) {
      const y = -seg * (s + 1);
      ctx.fillStyle = i === 1 ? "#4C8F57" : "#3A7346"; ctx.fillRect(-bw / 2, y, bw, seg - 2 * dpr);
      ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(-bw / 2 + 2 * dpr, y + 2 * dpr, 2.5 * dpr, seg - 6 * dpr);
      ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = OUTL; ctx.strokeRect(-bw / 2, y, bw, seg - 2 * dpr);
      if (s % 2 === 1) {
        ctx.save(); ctx.translate(0, y); ctx.rotate(side * (0.9 + Math.sin(t * 1.1 + s) * 0.08));
        ctx.fillStyle = "#5AA764"; ctx.beginPath(); ctx.ellipse(-side * 16 * dpr, 0, 16 * dpr, 4.5 * dpr, 0, 0, 7); ctx.fill(); ctx.lineWidth = 2 * dpr; ctx.stroke(); ctx.restore();
      }
    }
    ctx.restore();
  }
  // lampion berayun
  [[0.2, 0.0], [0.66, 1.7]].forEach(([fx, ph]) => {
    const ax = W * fx, len = H * 0.12, a = Math.sin(t * 1.2 + ph) * 0.09, lx = ax + Math.sin(a) * len, ly = Math.cos(a) * len;
    ctx.strokeStyle = OUTL; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(lx, ly); ctx.stroke();
    const pulse = 0.85 + 0.15 * Math.sin(t * 3 + ph * 2);
    wGlow(ctx, lx, ly + 22 * dpr, 90 * dpr, "rgba(255,120,60,.55)", pulse);
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(a);
    ctx.fillStyle = "#2A1A1A"; ctx.fillRect(-11 * dpr, 0, 22 * dpr, 6 * dpr); ctx.fillRect(-11 * dpr, 40 * dpr, 22 * dpr, 6 * dpr);
    ctx.fillStyle = wGrad(ctx, 4 * dpr, 42 * dpr, [[0, "#FF7A4A"], [0.5, "#FFB45C"], [1, "#E0442E"]]);
    ctx.beginPath(); ctx.ellipse(0, 23 * dpr, 20 * dpr, 19 * dpr, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
    ctx.strokeStyle = "rgba(120,30,20,.5)"; ctx.lineWidth = 1.5 * dpr;
    for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(0, 23 * dpr, 20 * dpr * Math.abs(k) + 1, 19 * dpr, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
  });
  wFlies(ctx, W, H, dpr, t, 12, "rgba(200,255,120,.9)", [0.45, 0.82]);
}

// Stack: kota senja. Makin tinggi menaranya, kamera naik: kota turun pelan (parallax) dan langit berubah jadi malam berbintang.
function wCity(ctx, W, H, dpr, t) {
  const cam = FC.cam || 0, hi = Math.min(1, cam / (H * 2.5));
  const mix = (a, b) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * hi)).join(",")})`;
  ctx.fillStyle = wGrad(ctx, 0, H, [[0, mix([58, 42, 110], [10, 12, 36])], [0.45, mix([214, 96, 120], [40, 30, 80])], [0.75, mix([255, 170, 100], [90, 50, 110])], [1, mix([255, 205, 130], [120, 70, 120])]]);
  ctx.fillRect(0, 0, W, H);
  // bintang muncul waktu udah tinggi
  if (hi > 0.05) { const r = Dapur.rng(5); for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H * 0.8, k = 0.5 + 0.5 * Math.sin(t * 2 + i); ctx.fillStyle = `rgba(255,250,230,${hi * k})`; ctx.fillRect(x, y, 2 * dpr, 2 * dpr); } }
  // matahari tenggelam
  const sy = H * 0.66 + cam * 0.08, sr = W * 0.2;
  if (sy - sr < H) {
    wGlow(ctx, W * 0.5, sy, sr * 2.6, "rgba(255,190,90,.5)", 1 - hi);
    ctx.globalAlpha = 1 - hi * 0.7; ctx.fillStyle = wGrad(ctx, sy - sr, sy + sr, [[0, "#FFE58A"], [1, "#FF7A45"]]);
    ctx.beginPath(); ctx.arc(W * 0.5, sy, sr, 0, 7); ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke(); ctx.globalAlpha = 1;
  }
  // awan jalan pelan
  for (let i = 0; i < 4; i++) {
    const s = (18 + i * 5) * dpr, x = ((t * (6 + i * 3) * dpr + i * W * 0.37) % (W + 120 * dpr)) - 80 * dpr, y = H * (0.12 + i * 0.13) + cam * 0.15;
    if (y < H + 40 * dpr) wCloud(ctx, x, y, s, hi > 0.5 ? "#5A4A86" : "#FFD3C0");
  }
  // gedung jauh dan dekat, turun ngikutin kamera
  const far = wLayer("cityF", W, Math.round(H * 0.5), (c, w, h) => wSkyline(c, w, h, 9, "#6A3F78", ["rgba(255,220,150,.55)"], dpr, 0.55));
  const near = wLayer("cityN", W, Math.round(H * 0.4), (c, w, h) => wSkyline(c, w, h, 21, "#2D1D45", ["#FFE07A", "#7FF3FF", "#FF8AD8"], dpr, 0.75));
  ctx.drawImage(far, 0, H - far.height - 40 * dpr + cam * 0.25);
  const ny = H - near.height + cam * 0.5;
  ctx.drawImage(near, 0, ny);
  // papan neon yang kedip di gedung dekat
  [[0.12, 0.3, "#FF4FD8"], [0.78, 0.18, "#4FF3FF"]].forEach(([fx, fy, col], i) => {
    const x = W * fx, y = ny + near.height * fy, on = Math.sin(t * 5 + i * 2) > -0.7 ? 1 : 0.25;
    wGlow(ctx, x + 18 * dpr, y + 7 * dpr, 50 * dpr, col, 0.6 * on);
    ctx.globalAlpha = on; ctx.fillStyle = col; ctx.fillRect(x, y, 36 * dpr, 14 * dpr); ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = OUTL; ctx.strokeRect(x, y, 36 * dpr, 14 * dpr);
  });
  // jalan di bawah menara
  const gy = H - 110 * dpr + cam;
  if (gy < H) {
    ctx.fillStyle = "#2A2236"; ctx.fillRect(0, gy, W, H - gy + 4);
    ctx.fillStyle = "#3A3048"; ctx.fillRect(0, gy, W, 10 * dpr);
    ctx.fillStyle = "#FFD15C"; for (let x = 10 * dpr; x < W; x += 46 * dpr) ctx.fillRect(x, gy + 40 * dpr, 24 * dpr, 5 * dpr);
    ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }
}
function wSkyline(c, w, h, seed, col, lights, dpr, fill) {
  const r = Dapur.rng(seed);
  let x = -10 * dpr;
  while (x < w) {
    const bw = (34 + r() * 46) * dpr, bh = h * (0.35 + r() * 0.6), y = h - bh;
    c.fillStyle = col; c.fillRect(x, y, bw, bh + 4);
    if (r() < 0.3) c.fillRect(x + bw * 0.4, y - 16 * dpr, 3 * dpr, 16 * dpr);   // antena
    c.lineWidth = 3 * dpr; c.strokeStyle = OUTL; c.strokeRect(x, y, bw, bh + 10);
    for (let wy = y + 10 * dpr; wy < h - 10 * dpr; wy += 16 * dpr) for (let wx = x + 7 * dpr; wx < x + bw - 10 * dpr; wx += 13 * dpr) {
      if (r() > fill) continue;
      c.fillStyle = lights[Math.floor(r() * lights.length)]; c.fillRect(wx, wy, 6 * dpr, 8 * dpr);
    }
    x += bw + (r() < 0.3 ? 6 * dpr : 0);
  }
}

// Fruit slash: dapur malam. Dinding papan kayu, jendela senja, panci tergantung, lampu tali warna-warni, meja.
function wKitchen(ctx, W, H, dpr, t) {
  ctx.drawImage(wLayer("dapur", W, H, (c, w, h) => {
    c.fillStyle = wGrad(c, 0, h, [[0, "#5A341F"], [1, "#3A2013"]]); c.fillRect(0, 0, w, h);
    const r = Dapur.rng(13), pw = 46 * dpr;
    for (let x = 0; x < w; x += pw) {
      c.fillStyle = `rgba(255,220,180,${0.02 + r() * 0.05})`; c.fillRect(x, 0, pw, h);
      c.strokeStyle = "rgba(34,24,43,.6)"; c.lineWidth = 2.5 * dpr; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
      for (let k = 0; k < 3; k++) { const y = r() * h; c.strokeStyle = "rgba(34,24,43,.25)"; c.lineWidth = 1.5 * dpr; c.beginPath(); c.ellipse(x + pw / 2, y, pw * 0.2, 6 * dpr, 0, 0, 7); c.stroke(); }
    }
    // jendela: langit senja + bulan sabit
    const wx = w * 0.22, wy = h * 0.2, ww = w * 0.56, wh = h * 0.22;
    c.fillStyle = wGrad(c, wy, wy + wh, [[0, "#2B2459"], [0.6, "#B4557A"], [1, "#FF9E6B"]]); c.fillRect(wx, wy, ww, wh);
    c.fillStyle = "#FFF1C4"; c.beginPath(); c.arc(wx + ww * 0.75, wy + wh * 0.3, 14 * dpr, 0, 7); c.fill();
    c.fillStyle = "#3A2A63"; c.beginPath(); c.arc(wx + ww * 0.75 + 6 * dpr, wy + wh * 0.3 - 4 * dpr, 12 * dpr, 0, 7); c.fill();
    c.fillStyle = "#2A1F3D"; c.beginPath(); c.moveTo(wx, wy + wh); for (let i = 0; i <= 8; i++) c.lineTo(wx + ww * i / 8, wy + wh * (0.7 + r() * 0.2)); c.lineTo(wx + ww, wy + wh); c.fill();
    c.fillStyle = "#8A5A34"; const fr = 9 * dpr;
    c.fillRect(wx - fr, wy - fr, ww + fr * 2, fr); c.fillRect(wx - fr, wy + wh, ww + fr * 2, fr * 1.6); c.fillRect(wx - fr, wy, fr, wh); c.fillRect(wx + ww, wy, fr, wh); c.fillRect(wx + ww / 2 - fr / 2, wy, fr, wh);
    c.lineWidth = 3 * dpr; c.strokeStyle = OUTL; c.strokeRect(wx - fr, wy - fr, ww + fr * 2, wh + fr * 2.6); c.strokeRect(wx, wy, ww, wh);
    // rak dengan toples
    const sy = h * 0.58;
    c.fillStyle = "#8A5A34"; c.fillRect(-5, sy, w * 0.34, 10 * dpr); c.strokeRect(-5, sy, w * 0.34, 10 * dpr);
    [["#E0483E", 0.04], ["#F3C33A", 0.13], ["#7FC66B", 0.22]].forEach(([col, fx]) => { const jx = w * fx, jh = 34 * dpr; c.fillStyle = "rgba(220,240,255,.35)"; c.fillRect(jx, sy - jh, 24 * dpr, jh); c.fillStyle = col; c.fillRect(jx + 3 * dpr, sy - jh * 0.6, 18 * dpr, jh * 0.6 - 2 * dpr); c.fillStyle = "#B7864F"; c.fillRect(jx - 2 * dpr, sy - jh - 6 * dpr, 28 * dpr, 7 * dpr); c.lineWidth = 2.5 * dpr; c.strokeRect(jx, sy - jh, 24 * dpr, jh); c.strokeRect(jx - 2 * dpr, sy - jh - 6 * dpr, 28 * dpr, 7 * dpr); });
    // meja dapur
    const ty = h * 0.88;
    c.fillStyle = wGrad(c, ty, h, [[0, "#C98E55"], [1, "#8A5A34"]]); c.fillRect(0, ty, w, h - ty);
    c.fillStyle = "#E2AE72"; c.fillRect(0, ty, w, 8 * dpr);
    c.lineWidth = 3 * dpr; c.beginPath(); c.moveTo(0, ty); c.lineTo(w, ty); c.stroke();
  }), 0, 0);
  // panci dan wajan tergantung, goyang dikit
  [[0.88, 0, 26], [0.94, 1.4, 18]].forEach(([fx, ph, rr]) => {
    const ax = W * fx, ay = H * 0.47, a = Math.sin(t * 0.9 + ph) * 0.05, r = rr * dpr;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
    ctx.fillStyle = "#3A3A46"; ctx.fillRect(-2.5 * dpr, 0, 5 * dpr, 30 * dpr);
    ctx.fillStyle = "#4E4E5E"; ctx.beginPath(); ctx.arc(0, 30 * dpr + r, r, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.beginPath(); ctx.arc(-r * 0.3, 30 * dpr + r * 0.7, r * 0.35, 0, 7); ctx.fill();
    ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = OUTL; ctx.beginPath(); ctx.arc(0, 30 * dpr + r, r, 0, 7); ctx.stroke(); ctx.strokeRect(-2.5 * dpr, 0, 5 * dpr, 30 * dpr);
    ctx.restore();
  });
  wBulbs(ctx, W, H, dpr, t, H * 0.07, H * 0.05);
}
function wBulbs(ctx, W, H, dpr, t, y0, sag) {
  // lampu tali: kabel melengkung, bohlam warna neon nyala bergiliran
  const cols = ["#FFD15C", "#FF6BCB", "#6BF0FF", "#9BFF6B"], n = Math.max(6, Math.round(W / (42 * dpr)));
  const yAt = x => y0 + sag * 4 * (x / W) * (1 - x / W);
  ctx.strokeStyle = OUTL; ctx.lineWidth = 2 * dpr; ctx.beginPath();
  for (let i = 0; i <= 20; i++) { const x = W * i / 20; i ? ctx.lineTo(x, yAt(x)) : ctx.moveTo(x, yAt(x)); }
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const x = W * (i + 0.5) / n, y = yAt(x) + 7 * dpr, col = cols[i % cols.length], k = 0.55 + 0.45 * Math.sin(t * 3 - i * 0.8);
    wGlow(ctx, x, y, 26 * dpr, col, k * 0.7);
    ctx.fillStyle = col; ctx.globalAlpha = 0.6 + 0.4 * k; ctx.beginPath(); ctx.ellipse(x, y, 5 * dpr, 7 * dpr, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5 * dpr; ctx.stroke();
  }
}

// Fruit catch: kebun senja. Bukit, pohon buah, rumput, daun jatuh, kunang-kunang.
function wOrchard(ctx, W, H, dpr, t) {
  ctx.drawImage(wLayer("kebun", W, H, (c, w, h) => {
    c.fillStyle = wGrad(c, 0, h, [[0, "#3B2A5A"], [0.35, "#A9547A"], [0.6, "#FFB06B"], [1, "#FFD08A"]]); c.fillRect(0, 0, w, h);
    wGlow(c, w * 0.3, h * 0.6, w * 0.6, "rgba(255,200,110,.6)");
    c.fillStyle = "#FFE08A"; c.beginPath(); c.arc(w * 0.3, h * 0.6, w * 0.13, 0, 7); c.fill(); c.lineWidth = 3 * dpr; c.strokeStyle = OUTL; c.stroke();
    wHills(c, w, h, h * 0.62, h * 0.07, "#6B7A4A", 17, dpr);
    // pohon buah di bukit jauh
    const r = Dapur.rng(23);
    [[0.12, 0.6, 1], [0.86, 0.58, 1.2], [0.62, 0.64, 0.8]].forEach(([fx, fy, s]) => {
      const x = w * fx, y = h * fy, R = 34 * dpr * s;
      c.fillStyle = "#5A3A22"; c.fillRect(x - 5 * dpr * s, y - R * 0.2, 10 * dpr * s, R * 1.4); c.lineWidth = 2.5 * dpr; c.strokeRect(x - 5 * dpr * s, y - R * 0.2, 10 * dpr * s, R * 1.4);
      c.fillStyle = OUTL; [[0, -R * 0.6, R], [-R * 0.7, -R * 0.2, R * 0.7], [R * 0.7, -R * 0.2, R * 0.7]].forEach(([dx, dy, rr]) => { c.beginPath(); c.arc(x + dx, y + dy, rr + 3 * dpr, 0, 7); c.fill(); });
      c.fillStyle = "#3F7A3E"; [[0, -R * 0.6, R], [-R * 0.7, -R * 0.2, R * 0.7], [R * 0.7, -R * 0.2, R * 0.7]].forEach(([dx, dy, rr]) => { c.beginPath(); c.arc(x + dx, y + dy, rr, 0, 7); c.fill(); });
      for (let i = 0; i < 7; i++) { c.fillStyle = r() < 0.5 ? "#FF5A4A" : "#FFB13B"; c.beginPath(); c.arc(x + (r() - 0.5) * R * 1.8, y - R * 0.4 + (r() - 0.5) * R, 4.5 * dpr * s, 0, 7); c.fill(); c.lineWidth = 1.5 * dpr; c.stroke(); }
    });
    wHills(c, w, h, h * 0.78, h * 0.05, "#4C6B3A", 29, dpr);
    // rumput depan
    const gy = h * 0.9;
    c.fillStyle = "#355A2E"; c.fillRect(0, gy, w, h - gy);
    c.fillStyle = "#4E7E3E";
    for (let x = 0; x < w; x += 9 * dpr) { const hh = (6 + r() * 10) * dpr; c.beginPath(); c.moveTo(x, gy + 2); c.lineTo(x + 4 * dpr, gy - hh); c.lineTo(x + 8 * dpr, gy + 2); c.fill(); }
    c.lineWidth = 3 * dpr; c.strokeStyle = OUTL; c.beginPath(); c.moveTo(0, gy); c.lineTo(w, gy); c.stroke();
  }), 0, 0);
  for (let i = 0; i < 3; i++) { const s = (14 + i * 4) * dpr, x = ((t * (5 + i * 2) * dpr + i * W * 0.41) % (W + 100 * dpr)) - 70 * dpr; wCloud(ctx, x, H * (0.1 + i * 0.09), s, "#FFC9B0"); }
  // daun jatuh, meliuk
  for (let i = 0; i < 6; i++) {
    const p = ((t * 0.08 + i * 0.173) % 1), x = W * ((i * 0.31 + 0.1) % 1) + Math.sin(t * 1.3 + i) * 30 * dpr, y = p * H * 1.1 - 20 * dpr;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + i) * 0.8);
    ctx.fillStyle = i % 2 ? "#E8873A" : "#C9C24A"; ctx.beginPath(); ctx.ellipse(0, 0, 7 * dpr, 3.5 * dpr, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = OUTL; ctx.stroke(); ctx.restore();
  }
  wFlies(ctx, W, H, dpr, t, 8, "rgba(255,240,140,.9)", [0.55, 0.88]);
}
const WORLDS = { pisau: wDojo, stack: wCity, potong: wKitchen, buah: wOrchard };

// ================================================================ v49: koin dapur dan mini game (dapur.js yang ngatur harga dan batas)
// Makanan enak dibeli pakai koin; makanan dasar gratis. Koin didapat dari mini game (30 detik): Fruit catch (v49), Fruit slash (v50).
// Dompet disimpan UI di state.dapur (bukan aksi, tidak di-replay): yang masuk simulasi tetap cuma pilihan makannya (rawat:<item>:<opt>).
// v50: tombol koin muncul di semua ruangan (pintu game dari layar utama, diskusi 29 Okt: "pelarian" sesudah ngecek karakter).
const COIN = "🪙";
function wallet() { if (!state) return null; if (!state.dapur) { state.dapur = Dapur.fresh(); save(); } return state.dapur; }
const coinTxt = n => `${COIN} ${n}`;
// tombol koin: saldo + jalan ke mini game
function dapurChip() {
  const b = $("coinBtn"); if (!b) return;
  const on = !!(state && game && cur && cur.fase !== "meninggal" && cur.fase !== "merantau");
  b.hidden = !on; if (!on) return;
  const W = wallet(), t = `${coinTxt(W.koin)} · Play`;
  if (b.textContent !== t) b.textContent = t;
}
// daftar game: id dipakai buat skor terbaik (W.best) dan telemetri. waktu: true = ronde 30 detik, false = sampai gagal.
// v51 (diskusi 30 Okt): mini game itu ruang sendiri, kayak buka HP khusus game. Makhluknya nggak ikut; yang nyambung cuma koin.
// Pindah game cukup lewat "All games"; kartu akhir nggak nyuruh pindah (yang lagi asik pengennya ulang, kata Muhammad 30 Okt).
const MG_GAMES = {
  potong: { name: "Fruit slash", icon: "🍉", color: "#E8506A", timed: true, how: "Swipe across the fruit. Three in one swipe is a combo. Bombs cost five." },
  stack: { name: "Stack", icon: "🧱", color: "#5B7BD5", timed: false, how: "Tap to drop the block. Whatever hangs over falls off. Land it exactly for a bonus." },
  pisau: { name: "Knife throw", icon: "🔪", color: "#5E8F3E", timed: false, how: "Tap to throw a knife into the log. Don't hit another knife." },
  buah: { name: "Fruit catch", icon: "🧺", color: "#E59A2E", timed: true, how: "Move the basket with your finger. Fruit +1, star +3, bug −3." },
};
const MG_ORDER = Object.keys(MG_GAMES);
let ARC = null;   // layar Games (hub); adegan 3D dijeda selama ini ada (ui/29)
function showKitchen() {
  if (ARC) return;
  const el = document.createElement("div");
  el.className = "arc"; el.id = "arcBox";
  document.body.appendChild(el);
  ARC = { el, played: new Set(), rounds: 0, t0: now() };
  arcDraw();
  Tele.ev("minigame", { a: "hub" });
}
function arcDraw() {
  if (!ARC) return;
  const W = wallet(), left = Dapur.left(W, today());
  ARC.el.innerHTML = `<header><b>Games</b><span class="arc-coin">${coinTxt(W.koin)}</span><button class="x" id="arcX" aria-label="Close">✕</button></header>
    <p class="arc-sub">${left ? `Win up to ${coinTxt(left)} more today. Coins go to the kitchen.` : "Today's coins are all won. Play for your best score."}</p>
    <div class="arc-grid">${MG_ORDER.map(k => { const g = MG_GAMES[k]; return `<button class="arc-tile" data-mg="${k}" style="--c: ${g.color}"><i>${g.icon}</i><b>${g.name}</b>${arcRank(k, W.best[k])}</button>`; }).join("")}</div>
    <small class="arc-foot">Basic food is always free. The nice ones cost coins.</small>`;
  ARC.el.querySelector("#arcX").onclick = arcClose;
  ARC.el.querySelectorAll("[data-mg]").forEach(b => { b.onclick = () => mgStart(b.dataset.mg); });
}
// kotak game: rekor dan peringkatnya, bukan lama mainnya (Muhammad 30 Okt: detik bikin orang males main)
const TIER_COL = ["#ffffff55", "#C98A4B", "#C9CED6", "#F2C94C", "#7FD8F0", "#E58AF0"];
function arcRank(k, best) {
  if (!best) return `<span class="arc-rank"><em>New</em></span><small>No record yet</small>`;
  const t = Dapur.tier(k, best);
  return `<span class="arc-rank" style="--t: ${TIER_COL[t.ix]}"><em>${t.name}</em></span><span class="arc-best">${best}</span>`;
}
function arcClose() {
  if (!ARC) return;
  if (FC) mgEnd(true);
  Tele.ev("minigame", { a: "hub_tutup", game: ARC.played.size, ronde: ARC.rounds, dtk: Math.round((now() - ARC.t0) / 1000) });
  ARC.el.remove(); ARC = null;
  dapurChip();
}

// ---- layar mini game bersama: kanvas 2D di atas layar (adegan 3D berhenti selama FC ada, lihat ui/29)
const MG_GOOD = ["🍎", "🍌", "🍓", "🍇", "🥕", "🍊", "🍐"], MG_LEN = 30;
const MG_JUICE = { "🍎": "#E0483E", "🍌": "#F3D34A", "🍓": "#E0483E", "🍇": "#8B5BB5", "🥕": "#F08A2E", "🍊": "#F39A2E", "🍐": "#B5CF52", "🍉": "#E8506A", "🥝": "#8DBA3E", "🍍": "#F3C33A" };
const mgFont = px => `${px}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
let FC = null;
function mgStart(k = "potong") {
  if (FC) return;
  const g = MG_GAMES[k] || MG_GAMES.potong;
  const el = document.createElement("div");
  el.className = "fcx fcx-" + k; el.id = "fcBox";
  el.innerHTML = `<div class="fcx-top"><b id="mgScore">0</b><span id="mgTime"${g.timed ? "" : " hidden"}>${MG_LEN}</span><button class="x" id="mgX" aria-label="Stop">✕</button></div><canvas id="mgCv"></canvas><div class="fcx-card" id="mgCard"></div>`;
  document.body.appendChild(el);
  const cv = $("mgCv"), ctx = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => { cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; };
  size();
  FC = { k, el, cv, ctx, dpr, items: [], bits: [], pops: [], score: 0, caught: 0, bx: cv.width / 2, t0: 0, last: 0, spawn: 0, run: false, shake: 0, size };
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr]; };
  if (k === "buah") {
    const aim = e => { FC.bx = Math.max(0, Math.min(cv.width, pos(e)[0])); };
    cv.addEventListener("pointerdown", aim); cv.addEventListener("pointermove", aim);
    FC.key = e => { if (e.key === "ArrowLeft") FC.bx -= 40 * dpr; if (e.key === "ArrowRight") FC.bx += 40 * dpr; FC.bx = Math.max(0, Math.min(cv.width, FC.bx)); };
    window.addEventListener("keydown", FC.key);
  } else if (!g.timed) {
    // Stack dan Knife throw: satu tap = satu aksi
    cv.addEventListener("pointerdown", e => { e.preventDefault(); if (FC.run) (k === "stack" ? stackTap : knifeTap)(); });
    FC.key = e => { if ((e.key === " " || e.key === "Enter") && FC.run) { e.preventDefault(); (k === "stack" ? stackTap : knifeTap)(); } };
    window.addEventListener("keydown", FC.key);
  } else {
    // goresan jari: tiap ruas baru dicek ke semua buah; satu goresan = satu kombo
    cv.addEventListener("pointerdown", e => { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); FC.trail = [{ p: pos(e), t: now() }]; FC.combo = 0; });
    cv.addEventListener("pointermove", e => { if (FC.trail) slashTo(pos(e)); });
    const up = () => { if (FC && FC.trail) { slashEnd(); FC.trail = null; } };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  }
  window.addEventListener("resize", size);
  $("mgX").onclick = () => mgEnd(true);
  mgCard(`<b>${g.name}</b><small>${g.how}</small><button class="choice yes" id="mgPlay">Start</button>`);
  $("mgPlay").onclick = mgRun;
  Tele.ev("minigame", { k, a: "buka", ke: ARC ? ARC.played.size + 1 : 1 });
  // yang udah pernah dimainkan langsung jalan, tanpa kartu cara main
  if (wallet().best[k]) mgRun();
}
function mgCard(html) { const c = $("mgCard"); c.hidden = !html; c.innerHTML = html || ""; }
function mgRun() {
  Object.assign(FC, { items: [], bits: [], pops: [], score: 0, caught: 0, t0: now(), last: now(), spawn: 0.4, run: true, trail: null, combo: 0, over: 0 });
  if (FC.k === "stack") stackInit(); else if (FC.k === "pisau") knifeInit();
  if (ARC) ARC.played.add(FC.k);
  mgCard(null); $("mgScore").textContent = "0";
  requestAnimationFrame(mgFrame);
}
function mgFrame() {
  if (!FC || !FC.run) return;
  const t = now(), dt = Math.min(0.05, (t - FC.last) / 1000), el = (t - FC.t0) / 1000;
  FC.last = t;
  FC.ctx.clearRect(0, 0, FC.cv.width, FC.cv.height);
  FC.ctx.textAlign = "center"; FC.ctx.textBaseline = "middle";
  const step = { buah: catchStep, potong: slashStep, stack: stackStep, pisau: knifeStep }[FC.k];
  step(dt, el);
  if (MG_GAMES[FC.k].timed) {
    const rest = Math.max(0, MG_LEN - el);
    $("mgTime").textContent = Math.ceil(rest);
    if (rest <= 0) return mgDone();
  } else if (FC.over && now() - FC.over > 900) return mgDone();   // gagal: jeda sebentar biar kelihatan jatuhnya
  requestAnimationFrame(mgFrame);
}
const mgAdd = n => { FC.score = Math.max(0, FC.score + n); $("mgScore").textContent = FC.score; };

// ---- Fruit catch (v49): keranjang ikut jari
function catchStep(dt, el) {
  const { cv, ctx, dpr } = FC, W = cv.width, H = cv.height, S = 44 * dpr, by = H - 70 * dpr, bw = 96 * dpr;
  FC.spawn -= dt;
  if (FC.spawn <= 0) {
    FC.spawn = Math.max(0.28, 0.75 - el * 0.015);
    const r = Math.random(), kind = r < 0.05 ? "star" : r < 0.23 ? "bug" : "fruit";
    FC.items.push({ x: S / 2 + Math.random() * (W - S), y: -S, vy: (170 + Math.random() * 110 + el * 6) * dpr, kind, e: kind === "star" ? "⭐" : kind === "bug" ? "🐛" : MG_GOOD[Math.floor(Math.random() * MG_GOOD.length)] });
  }
  ctx.font = mgFont(S);
  for (const it of FC.items) {
    it.y += it.vy * dt;
    if (!it.done && it.y > by - S * 0.6 && it.y < by + S * 0.3 && Math.abs(it.x - FC.bx) < bw / 2 + S * 0.2) {
      it.done = true;
      if (it.kind === "bug") { mgAdd(-3); FC.shake = 0.3; } else { mgAdd(it.kind === "star" ? 3 : 1); FC.caught += 1; }
    }
    if (!it.done) ctx.fillText(it.e, it.x, it.y);
  }
  FC.items = FC.items.filter(it => !it.done && it.y < H + S);
  FC.shake = Math.max(0, FC.shake - dt);
  const sx = FC.shake ? (Math.random() - 0.5) * 16 * dpr : 0;
  ctx.font = mgFont(S * 1.7);
  ctx.fillText("🧺", FC.bx + sx, by);
}

// ---- Fruit slash (v50): buah dilempar dari bawah, digores jari. Santai: bom cuma −5, nggak ada game over, buah lolos nggak dihukum.
const SL_FRUIT = ["🍉", "🍎", "🍊", "🍍", "🥝", "🍌", "🍐", "🍓", "🍇"];
function slashStep(dt, el) {
  const { cv, ctx, dpr } = FC, W = cv.width, H = cv.height, S = 64 * dpr, g = H * 0.95;
  FC.spawn -= dt;
  if (FC.spawn <= 0) {
    // gelombang: makin lama makin rapat dan makin banyak
    FC.spawn = Math.max(0.55, 1.25 - el * 0.022) * (0.8 + Math.random() * 0.4);
    const n = 1 + (Math.random() < 0.25 + el * 0.02 ? 1 : 0) + (el > 12 && Math.random() < 0.3 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const x = W * (0.15 + Math.random() * 0.7), h = H * (0.5 + Math.random() * 0.3);
      const bomb = el > 3 && Math.random() < 0.13, gold = !bomb && Math.random() < 0.04;
      FC.items.push({ x, y: H + S * 0.6, vx: (W / 2 - x) * (0.3 + Math.random() * 0.5) / 1.6, vy: -Math.sqrt(2 * g * h),
        rot: 0, vr: (Math.random() - 0.5) * 4, kind: bomb ? "bomb" : gold ? "gold" : "fruit",
        e: bomb ? "💣" : gold ? "🌟" : SL_FRUIT[Math.floor(Math.random() * SL_FRUIT.length)], up: true });
    }
  }
  ctx.font = mgFont(S);
  for (const it of FC.items) {
    it.vy += g * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
    if (it.vy > 0) it.up = false;
    ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot); ctx.fillText(it.e, 0, 0); ctx.restore();
  }
  FC.items = FC.items.filter(it => !it.cut && !(it.y > H + S && !it.up));
  // potongan buah: dua belahan yang jatuh berputar
  for (const b of FC.bits) {
    b.vy += g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
    ctx.beginPath(); ctx.rect(b.side < 0 ? -S : 0, -S, S, 2 * S); ctx.clip();
    ctx.fillText(b.e, 0, 0); ctx.restore();
  }
  FC.bits = FC.bits.filter(b => b.y < H + S * 2);
  // cipratan dan angka kecil
  for (const p of FC.pops) {
    p.life -= dt;
    if (p.txt) { ctx.globalAlpha = Math.max(0, p.life / 0.9); ctx.font = `800 ${26 * dpr}px system-ui, sans-serif`; ctx.fillStyle = p.c; ctx.fillText(p.txt, p.x, p.y - (0.9 - p.life) * 40 * dpr); }
    else { p.vy += g * 0.6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; ctx.globalAlpha = Math.max(0, p.life / 0.5); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  FC.pops = FC.pops.filter(p => p.life > 0);
  // jejak goresan
  const tr = FC.trail;
  if (tr) { const cut = now() - 160; while (tr.length > 2 && tr[0].t < cut) tr.shift(); }
  if (tr && tr.length > 1) {
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(255,255,255,.95)";
    for (let i = 1; i < tr.length; i++) { ctx.lineWidth = (2 + 8 * i / tr.length) * dpr; ctx.beginPath(); ctx.moveTo(tr[i - 1].p[0], tr[i - 1].p[1]); ctx.lineTo(tr[i].p[0], tr[i].p[1]); ctx.stroke(); }
  }
  FC.shake = Math.max(0, FC.shake - dt);
  FC.el.style.transform = FC.shake ? `translate(${(Math.random() - 0.5) * 12}px, ${(Math.random() - 0.5) * 12}px)` : "";
}
// jarak titik c ke ruas a-b
function segDist(a, b, c) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const u = L ? Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(a[0] + u * dx - c[0], a[1] + u * dy - c[1]);
}
function slashTo(p) {
  const tr = FC.trail, a = tr[tr.length - 1].p;
  tr.push({ p, t: now() });
  if (!FC.run || Math.hypot(p[0] - a[0], p[1] - a[1]) < 4 * FC.dpr) return;
  const R = 34 * FC.dpr, ang = Math.atan2(p[1] - a[1], p[0] - a[0]);
  for (const it of FC.items) {
    if (it.cut || segDist(a, p, [it.x, it.y]) > R) continue;
    it.cut = true;
    if (it.kind === "bomb") {
      mgAdd(-5); FC.shake = 0.35; navigator.vibrate && navigator.vibrate(120);
      FC.pops.push({ txt: "−5", x: it.x, y: it.y, c: "#B23A3A", life: 0.9 });
      for (let i = 0; i < 14; i++) FC.pops.push({ x: it.x, y: it.y, vx: (Math.random() - 0.5) * 700 * FC.dpr, vy: (Math.random() - 0.8) * 600 * FC.dpr, r: (3 + Math.random() * 4) * FC.dpr, c: i % 2 ? "#3A3A3A" : "#F39A2E", life: 0.5 });
      continue;
    }
    const pts = it.kind === "gold" ? 3 : 1;
    mgAdd(pts); FC.caught += 1; FC.combo += 1;
    if (pts > 1) FC.pops.push({ txt: "+3", x: it.x, y: it.y, c: "#C08A1E", life: 0.9 });
    const sp = 140 * FC.dpr, nx = -Math.sin(ang), ny = Math.cos(ang);
    for (const side of [-1, 1]) FC.bits.push({ e: it.e, side, x: it.x, y: it.y, vx: it.vx * 0.5 + side * sp * (nx || 1), vy: Math.min(it.vy, 0) * 0.3 + side * sp * ny * 0.5, rot: ang + Math.PI / 2, vr: side * 3 });
    const c = MG_JUICE[it.e] || "#F3C33A";
    for (let i = 0; i < 8; i++) FC.pops.push({ x: it.x, y: it.y, vx: (Math.random() - 0.5) * 500 * FC.dpr, vy: (Math.random() - 0.7) * 450 * FC.dpr, r: (2.5 + Math.random() * 3.5) * FC.dpr, c, life: 0.5 });
  }
}
function slashEnd() {
  if (FC.run && FC.combo >= 3) {
    const bonus = FC.combo - 1, tr = FC.trail, p = tr[tr.length - 1].p;
    mgAdd(bonus);
    FC.pops.push({ txt: `Combo +${bonus}`, x: Math.max(80 * FC.dpr, Math.min(FC.cv.width - 80 * FC.dpr, p[0])), y: p[1], c: "#2E7D5B", life: 0.9 });
  }
  FC.combo = 0;
}

// ---- Stack (v51): balok geser kiri-kanan, tap buat jatuhin; yang nggak numpuk kepotong. Sampai meleset total.
function stackInit() {
  const { cv } = FC, w = cv.width * 0.62;
  Object.assign(FC, { tower: [{ x: (cv.width - w) / 2, w }], cam: 0, perfect: 0 });
  stackNew();
}
function stackNew() {
  const { cv, dpr, tower } = FC, top = tower[tower.length - 1], n = tower.length, fromL = n % 2 === 1;
  FC.mov = { x: fromL ? -top.w : cv.width, w: top.w, dir: fromL ? 1 : -1, v: (230 + Math.min(n, 40) * 9) * dpr };
}
function stackTap() {
  const m = FC.mov, top = FC.tower[FC.tower.length - 1], dpr = FC.dpr; if (!m) return;
  let x = m.x, w = m.w;
  const lo = Math.max(x, top.x), hi = Math.min(x + w, top.x + top.w);
  if (hi - lo <= 0) { FC.bits.push({ x, w, y: FC.tower.length, vy: 0, vx: m.dir * 60 * dpr }); FC.mov = null; FC.over = now(); navigator.vibrate && navigator.vibrate(120); return; }
  if (Math.abs(x - top.x) < 6 * dpr) {
    x = top.x; FC.perfect += 1; mgAdd(2);
    FC.pops.push({ txt: FC.perfect > 1 ? `Perfect ×${FC.perfect}` : "Perfect +2", x: x + w / 2, y: FC.tower.length, c: "#FFF6C8", life: 0.9 });
  } else {
    // yang nggantung jatuh
    const cut = x < top.x ? { x, w: top.x - x } : { x: hi, w: x + w - hi };
    FC.bits.push({ ...cut, y: FC.tower.length, vy: 0, vx: (x < top.x ? -1 : 1) * 80 * dpr });
    x = lo; w = hi - lo; FC.perfect = 0; mgAdd(1);
  }
  FC.tower.push({ x, w }); FC.caught = FC.tower.length - 1;
  stackNew();
}
function stackStep(dt) {
  const { cv, ctx, dpr, tower } = FC, W = cv.width, H = cv.height, bh = 30 * dpr, base = H - 110 * dpr;
  const m = FC.mov;
  if (m) { m.x += m.dir * m.v * dt; if (m.x > W - m.w * 0.15 && m.dir > 0) m.dir = -1; if (m.x < -m.w * 0.85 && m.dir < 0) m.dir = 1; }
  // kamera naik ngikutin menara: puncak di sekitar 40% layar
  const want = Math.max(0, tower.length * bh - (base - H * 0.4));
  FC.cam += (want - FC.cam) * Math.min(1, dt * 6);
  const yOf = i => base - i * bh + FC.cam;
  const slab = (x, w, i, alpha = 1) => {
    const y = yOf(i), hue = (200 + i * 11) % 360;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsl(${hue} 55% 58%)`; ctx.fillRect(x, y - bh, w, bh);
    ctx.fillStyle = `hsl(${hue} 65% 72%)`; ctx.fillRect(x, y - bh, w, 7 * dpr);
    ctx.globalAlpha = 1;
  };
  tower.forEach((b, i) => { if (yOf(i) > -bh && yOf(i) - bh < H) slab(b.x, b.w, i); });
  if (m) slab(m.x, m.w, tower.length);
  for (const b of FC.bits) { b.vy += H * 2.2 * dt; b.x += b.vx * dt; b.dy = (b.dy || 0) + b.vy * dt; ctx.save(); ctx.translate(0, b.dy); slab(b.x, b.w, b.y, 0.9); ctx.restore(); }
  FC.bits = FC.bits.filter(b => b.dy < H * 1.5);
  ctx.font = `800 ${22 * dpr}px system-ui, sans-serif`;
  for (const p of FC.pops) { p.life -= dt; ctx.globalAlpha = Math.max(0, p.life / 0.9); ctx.fillStyle = p.c; ctx.fillText(p.txt, p.x, yOf(p.y) - bh * 2 - (0.9 - p.life) * 40 * dpr); }
  ctx.globalAlpha = 1; FC.pops = FC.pops.filter(p => p.life > 0);
}

// ---- Knife throw (v51): kayu berputar, tap buat lempar pisau. Kena pisau lain = selesai. Kayu penuh = +3, kayu baru.
function knifeInit() { Object.assign(FC, { lvl: 0, fly: null, bounce: null, hitT: 0 }); knifeLog(); }
function knifeLog() {
  const L = FC.lvl;
  FC.ang = 0; FC.stuck = []; FC.need = 6 + Math.min(L, 6);
  // mulai kayu kedua ada pisau penghalang
  for (let i = 0; i < Math.min(L, 3); i++) FC.stuck.push({ t: Math.random() * Math.PI * 2, old: true });
  FC.spin = { base: 2.2 + L * 0.25, wob: L >= 2 ? 1.6 : 0, ph: Math.random() * 6 };
}
const knifeNorm = t => ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
function knifeTap() { if (!FC.fly && !FC.bounce && FC.need > 0) FC.fly = { y: FC.cv.height - 150 * FC.dpr }; }
function knifeDraw(ctx, x, y, a, dpr, alpha = 1) {
  // pisau menghadap a: ujung bilah di (x,y), gagang menjauh
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = alpha;
  ctx.fillStyle = "#DDE3EA"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10 * dpr, 6 * dpr); ctx.lineTo(44 * dpr, 6 * dpr); ctx.lineTo(44 * dpr, -6 * dpr); ctx.lineTo(10 * dpr, -6 * dpr); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#3B2A20"; ctx.fillRect(44 * dpr, -5 * dpr, 34 * dpr, 10 * dpr);
  ctx.restore();
}
function knifeStep(dt, el) {
  const { cv, ctx, dpr } = FC, W = cv.width, H = cv.height, cx = W / 2, cy = H * 0.34, R = 78 * dpr;
  const sp = FC.spin, v = sp.base + sp.wob * Math.sin(el * 1.3 + sp.ph);
  if (FC.run) FC.ang += v * dt;
  FC.hitT = Math.max(0, FC.hitT - dt);
  // pisau terbang
  if (FC.fly) {
    FC.fly.y -= 2600 * dpr * dt;
    if (FC.fly.y <= cy + R) {
      const t = knifeNorm(Math.PI / 2 - FC.ang), gap = 0.2;
      const hit = FC.stuck.some(k => { const d = Math.abs(knifeNorm(k.t - t + Math.PI) - Math.PI); return d < gap; });
      FC.fly = null;
      if (hit) { FC.bounce = { y: cy + R, vy: 900 * dpr, rot: 0 }; FC.over = now(); navigator.vibrate && navigator.vibrate(120); }
      else {
        FC.stuck.push({ t }); FC.need -= 1; FC.caught += 1; mgAdd(1); FC.hitT = 0.08;
        if (FC.need === 0) {
          mgAdd(3); FC.pops.push({ txt: "Log cleared +3", x: cx, y: cy, c: "#FFF6C8", life: 1.1 });
          for (let i = 0; i < 16; i++) FC.pops.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 800 * dpr, vy: (Math.random() - 0.7) * 700 * dpr, r: (4 + Math.random() * 5) * dpr, c: i % 2 ? "#A9743F" : "#7A4E2A", life: 0.7 });
          FC.lvl += 1; setTimeout(() => { if (FC && FC.k === "pisau" && FC.run) knifeLog(); }, 450);
        }
      }
    }
  }
  // kayu
  const off = FC.hitT ? -6 * dpr : 0;
  if (FC.need > 0 || !FC.run) {
    for (const k of FC.stuck) { const a = k.t + FC.ang; knifeDraw(ctx, cx + Math.cos(a) * (R - 14 * dpr), cy + off + Math.sin(a) * (R - 14 * dpr), a, dpr); }
    ctx.save(); ctx.translate(cx, cy + off); ctx.rotate(FC.ang);
    ctx.fillStyle = "#A9743F"; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
    ctx.strokeStyle = "#7A4E2A"; ctx.lineWidth = 3 * dpr;
    for (const r of [0.75, 0.5, 0.25]) { ctx.beginPath(); ctx.arc(0, 0, R * r, 0, 7); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(R * 0.1, 0); ctx.lineTo(R * 0.6, R * 0.2); ctx.stroke();
    ctx.restore();
  }
  // pisau yang siap / terbang / mental
  const ky = H - 150 * dpr;
  if (FC.fly) knifeDraw(ctx, cx, FC.fly.y, -Math.PI / 2, dpr);
  else if (!FC.bounce && FC.need > 0 && FC.run) knifeDraw(ctx, cx, ky, -Math.PI / 2, dpr);
  if (FC.bounce) { const b = FC.bounce; b.vy += 2600 * dpr * dt; b.y += b.vy * dt; b.rot += 9 * dt; knifeDraw(ctx, cx + b.rot * 30 * dpr, b.y, -Math.PI / 2 + b.rot, dpr); }
  // sisa pisau buat kayu ini
  for (let i = 0; i < FC.need; i++) { ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillRect(22 * dpr, H - 60 * dpr - i * 18 * dpr, 26 * dpr, 8 * dpr); }
  for (const p of FC.pops) {
    p.life -= dt;
    if (p.txt) { ctx.globalAlpha = Math.max(0, p.life / 1.1); ctx.font = `800 ${24 * dpr}px system-ui, sans-serif`; ctx.fillStyle = p.c; ctx.fillText(p.txt, p.x, p.y - (1.1 - p.life) * 50 * dpr); }
    else { p.vy += 1800 * dpr * dt; p.x += p.vx * dt; p.y += p.vy * dt; ctx.globalAlpha = Math.max(0, p.life / 0.7); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1; FC.pops = FC.pops.filter(p => p.life > 0);
}

function mgDone() {
  FC.run = false; FC.trail = null; FC.el.style.transform = "";
  const W = wallet(), k = FC.k, r = Dapur.earn(W, k, FC.score, today());
  if (ARC) ARC.rounds += 1;
  save(); dapurChip();
  Tele.ev("minigame", { k, a: "selesai", skor: FC.score, koin: r.got, ke: ARC ? ARC.played.size : 1 });
  const what = { buah: `${FC.caught} caught`, potong: `${FC.caught} sliced`, stack: `${FC.caught} high`, pisau: `${FC.caught} knives` }[k];
  const T = Dapur.tier(k, W.best[k]), gap = W.best[k] - FC.score;
  const line = r.best ? (T.next ? `New record · ${T.name} · ${T.need} more for ${T.next}` : `New record · ${T.name}`)
    : gap > 0 && gap <= Math.max(2, W.best[k] * 0.15) ? `So close! ${gap} short of your record (${W.best[k]})` : `Record ${W.best[k] || 0} · ${T.name}`;
  mgCard(`<b>${what} · score ${FC.score}</b><span class="fcx-tier${r.best ? " up" : ""}">${line}</span>
    <small>${r.got ? `+${coinTxt(r.got)} · you have ${coinTxt(W.koin)}` : `You have ${coinTxt(W.koin)}${FC.score && !r.left ? " · today's coins are all won" : ""}`}</small>
    <button class="choice yes fcx-next" id="mgAgain">Play again</button>
    <button class="choice no" id="mgOk">All games</button>`);
  $("mgAgain").onclick = mgRun;
  $("mgOk").onclick = () => mgEnd(false);
}
function mgEnd(quit) {
  if (!FC) return;
  if (quit && FC.run) Tele.ev("minigame", { k: FC.k, a: "berhenti", skor: FC.score });
  FC.run = false;
  if (FC.key) window.removeEventListener("keydown", FC.key);
  window.removeEventListener("resize", FC.size);
  FC.el.remove(); FC = null;
  dapurChip(); arcDraw();
}
$("coinBtn").onclick = () => { hideHint(); if (game && cur) showKitchen(); };

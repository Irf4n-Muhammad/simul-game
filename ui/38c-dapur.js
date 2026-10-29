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
// daftar game: id dipakai buat skor terbaik (W.best) dan telemetri
const MG_GAMES = {
  potong: { name: "Fruit slash", blurb: "Swipe to slice the fruit. Leave the bombs alone.", how: "Swipe across the fruit. Slice three in one swipe for a bonus. Bombs cost you five." },
  buah: { name: "Fruit catch", blurb: "Catch the falling fruit in a basket. Bugs cost you three.", how: "Move the basket with your finger. Fruit +1, star +3, bug −3." },
};
function showKitchen() {
  const W = wallet(), d = today(), left = Dapur.left(W, d), n = esc(cur.nama);
  openSheet("dapur", `<span class="ribbon" style="background: var(--sky)">GAMES · ${coinTxt(W.koin)}</span>
    <h2>Play a little</h2>
    <p>Thirty seconds a round. Every point is a coin for ${n}'s nice food.</p>
    <small class="sub">${left ? `You can still earn ${coinTxt(left)} today.` : "You've earned all the coins for today. You can still play for your best score."}</small>
    ${Object.entries(MG_GAMES).map(([k, g]) => `<button class="choice${k === "potong" ? " yes" : ""}" data-mg="${k}"><b>${g.name}</b><small>${g.blurb}${W.best[k] ? ` Best: ${W.best[k]}.` : ""}</small></button>`).join("")}
    <span class="lbl">Prices</span>
    <small class="sub">Basic food is always free. The nice ones cost coins: ${Object.entries(Dapur.PRICE).filter(([, p]) => p).map(([k, p]) => `${esc(FOOD_WORD[k] || k)} ${p}`).join(", ")}.</small>
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  sheet.querySelectorAll("[data-mg]").forEach(b => { b.onclick = () => { closeSheet(); mgStart(b.dataset.mg); }; });
  Tele.ev("dapur", { a: "buka", koin: W.koin });
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
  el.className = "fcx" + (k === "potong" ? " fcx-slash" : ""); el.id = "fcBox";
  el.innerHTML = `<div class="fcx-top"><b id="mgScore">0</b><span id="mgTime">${MG_LEN}</span><button class="x" id="mgX" aria-label="Stop">✕</button></div><canvas id="mgCv"></canvas><div class="fcx-card" id="mgCard"></div>`;
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
  Tele.ev("minigame", { k, a: "buka" });
}
function mgCard(html) { const c = $("mgCard"); c.hidden = !html; c.innerHTML = html || ""; }
function mgRun() {
  Object.assign(FC, { items: [], bits: [], pops: [], score: 0, caught: 0, t0: now(), last: now(), spawn: 0.4, run: true, trail: null, combo: 0 });
  mgCard(null); $("mgScore").textContent = "0";
  requestAnimationFrame(mgFrame);
}
function mgFrame() {
  if (!FC || !FC.run) return;
  const t = now(), dt = Math.min(0.05, (t - FC.last) / 1000), el = (t - FC.t0) / 1000;
  FC.last = t;
  FC.ctx.clearRect(0, 0, FC.cv.width, FC.cv.height);
  FC.ctx.textAlign = "center"; FC.ctx.textBaseline = "middle";
  if (FC.k === "buah") catchStep(dt, el); else slashStep(dt, el);
  const rest = Math.max(0, MG_LEN - el);
  $("mgTime").textContent = Math.ceil(rest);
  if (rest <= 0) return mgDone();
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

function mgDone() {
  FC.run = false; FC.trail = null; FC.el.style.transform = "";
  const W = wallet(), k = FC.k, r = Dapur.earn(W, k, FC.score, today());
  save(); dapurChip();
  Tele.ev("minigame", { k, a: "selesai", skor: FC.score, koin: r.got });
  const verb = k === "buah" ? "caught" : "sliced";
  mgCard(`<b>${FC.caught} ${verb} · score ${FC.score}${r.best ? " · new best!" : ""}</b>
    <small>${r.got ? `+${coinTxt(r.got)}. You have ${coinTxt(W.koin)}.` : FC.score ? `No more coins today, but nice one. You have ${coinTxt(W.koin)}.` : `No coins this time. You have ${coinTxt(W.koin)}.`}${r.left && r.got ? ` ${coinTxt(r.left)} left to earn today.` : ""}</small>
    <div class="row2"><button class="choice yes" id="mgAgain">Play again</button><button class="choice no" id="mgOk">Done</button></div>`);
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
  dapurChip();
  if (cur) { play("jump", 700); say(wallet().koin >= 12 ? "Something nice to eat?" : "Thanks!", 2200); }
}
$("coinBtn").onclick = () => { hideHint(); if (game && cur) showKitchen(); };

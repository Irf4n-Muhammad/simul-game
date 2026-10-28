// ================================================================ v49: koin dapur dan mini game (dapur.js yang ngatur harga dan batas)
// Makanan enak dibeli pakai koin; makanan dasar gratis. Koin didapat dari mini game "Fruit catch" (30 detik).
// Dompet disimpan UI di state.dapur (bukan aksi, tidak di-replay): yang masuk simulasi tetap cuma pilihan makannya (rawat:<item>:<opt>).
const COIN = "🪙";
function wallet() { if (!state) return null; if (!state.dapur) { state.dapur = Dapur.fresh(); save(); } return state.dapur; }
const coinTxt = n => `${COIN} ${n}`;
// tombol koin di dapur: saldo + jalan ke mini game
function dapurChip() {
  const b = $("coinBtn"); if (!b) return;
  const on = !!(state && game && cur && ROOMS[roomIx] && ROOMS[roomIx].act === "makan" && cur.fase !== "meninggal" && cur.fase !== "merantau");
  b.hidden = !on; if (!on) return;
  const W = wallet(), t = `${coinTxt(W.koin)} · Play`;
  if (b.textContent !== t) b.textContent = t;
}
function showKitchen() {
  const W = wallet(), d = today(), left = Dapur.left(W, d), n = esc(cur.nama);
  openSheet("dapur", `<span class="ribbon" style="background: var(--sky)">KITCHEN · ${coinTxt(W.koin)}</span>
    <h2>Fruit catch</h2>
    <p>Help ${n} catch fruit for 30 seconds. Every fruit is a coin. Bugs cost you three.</p>
    <small class="sub">${left ? `You can still earn ${coinTxt(left)} today.` : "You've earned all the coins for today. You can still play for your best score."}${W.best.buah ? ` Best: ${W.best.buah}.` : ""}</small>
    <button class="choice yes" id="mgGo">Play</button>
    <span class="lbl">Prices</span>
    <small class="sub">Basic food is always free. The nice ones cost coins: ${Object.entries(Dapur.PRICE).filter(([, p]) => p).map(([k, p]) => `${esc(FOOD_WORD[k] || k)} ${p}`).join(", ")}.</small>
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  $("mgGo").onclick = () => { closeSheet(); mgStart(); };
  Tele.ev("dapur", { a: "buka", koin: W.koin });
}

// ---- mini game: tangkap buah. Kanvas 2D di atas layar; keranjang ikut jari.
const MG_GOOD = ["🍎", "🍌", "🍓", "🍇", "🥕", "🍊", "🍐"], MG_LEN = 30;
let FC = null;
function mgStart() {
  if (FC) return;
  const el = document.createElement("div");
  el.className = "fcx"; el.id = "fcBox";
  el.innerHTML = `<div class="fcx-top"><b id="mgScore">0</b><span id="mgTime">${MG_LEN}</span><button class="x" id="mgX" aria-label="Stop">✕</button></div><canvas id="mgCv"></canvas><div class="fcx-card" id="mgCard"></div>`;
  document.body.appendChild(el);
  const cv = $("mgCv"), ctx = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => { cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; };
  size();
  FC = { el, cv, ctx, dpr, items: [], score: 0, caught: 0, bx: cv.width / 2, t0: 0, last: 0, spawn: 0, run: false, shake: 0, size };
  const aim = e => { const r = cv.getBoundingClientRect(); FC.bx = Math.max(0, Math.min(cv.width, (e.clientX - r.left) * dpr)); };
  cv.addEventListener("pointerdown", aim); cv.addEventListener("pointermove", aim);
  FC.key = e => { if (e.key === "ArrowLeft") FC.bx -= 40 * dpr; if (e.key === "ArrowRight") FC.bx += 40 * dpr; FC.bx = Math.max(0, Math.min(cv.width, FC.bx)); };
  window.addEventListener("keydown", FC.key); window.addEventListener("resize", size);
  $("mgX").onclick = () => mgEnd(true);
  mgCard(`<b>Catch the fruit</b><small>Move the basket with your finger. Fruit +1, star +3, bug −3.</small><button class="choice yes" id="mgPlay">Start</button>`);
  $("mgPlay").onclick = mgRun;
  Tele.ev("minigame", { k: "buah", a: "buka" });
}
function mgCard(html) { const c = $("mgCard"); c.hidden = !html; c.innerHTML = html || ""; }
function mgRun() {
  Object.assign(FC, { items: [], score: 0, caught: 0, t0: now(), last: now(), spawn: 0, run: true });
  mgCard(null); $("mgScore").textContent = "0";
  requestAnimationFrame(mgFrame);
}
function mgFrame() {
  if (!FC || !FC.run) return;
  const t = now(), dt = Math.min(0.05, (t - FC.last) / 1000), el = (t - FC.t0) / 1000, { cv, ctx, dpr } = FC;
  FC.last = t;
  const W = cv.width, H = cv.height, S = 44 * dpr, by = H - 70 * dpr, bw = 96 * dpr;
  FC.spawn -= dt;
  if (FC.spawn <= 0) {
    FC.spawn = Math.max(0.28, 0.75 - el * 0.015);
    const r = Math.random(), kind = r < 0.05 ? "star" : r < 0.23 ? "bug" : "fruit";
    FC.items.push({ x: S / 2 + Math.random() * (W - S), y: -S, vy: (170 + Math.random() * 110 + el * 6) * dpr, kind, e: kind === "star" ? "⭐" : kind === "bug" ? "🐛" : MG_GOOD[Math.floor(Math.random() * MG_GOOD.length)] });
  }
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `${S}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  for (const it of FC.items) {
    it.y += it.vy * dt;
    if (!it.done && it.y > by - S * 0.6 && it.y < by + S * 0.3 && Math.abs(it.x - FC.bx) < bw / 2 + S * 0.2) {
      it.done = true;
      if (it.kind === "bug") { FC.score = Math.max(0, FC.score - 3); FC.shake = 0.3; }
      else { FC.score += it.kind === "star" ? 3 : 1; FC.caught += 1; }
      $("mgScore").textContent = FC.score;
    }
    if (!it.done) ctx.fillText(it.e, it.x, it.y);
  }
  FC.items = FC.items.filter(it => !it.done && it.y < H + S);
  FC.shake = Math.max(0, FC.shake - dt);
  const sx = FC.shake ? (Math.random() - 0.5) * 16 * dpr : 0;
  ctx.font = `${S * 1.7}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText("🧺", FC.bx + sx, by);
  const rest = Math.max(0, MG_LEN - el);
  $("mgTime").textContent = Math.ceil(rest);
  if (rest <= 0) return mgDone();
  requestAnimationFrame(mgFrame);
}
function mgDone() {
  FC.run = false;
  const W = wallet(), r = Dapur.earn(W, "buah", FC.score, today());
  save(); dapurChip();
  Tele.ev("minigame", { k: "buah", a: "selesai", skor: FC.score, koin: r.got });
  mgCard(`<b>${FC.caught} caught · score ${FC.score}${r.best ? " · new best!" : ""}</b>
    <small>${r.got ? `+${coinTxt(r.got)}. You have ${coinTxt(W.koin)}.` : FC.score ? `No more coins today, but nice catch. You have ${coinTxt(W.koin)}.` : `No coins this time. You have ${coinTxt(W.koin)}.`}${r.left && r.got ? ` ${coinTxt(r.left)} left to earn today.` : ""}</small>
    <div class="row2"><button class="choice yes" id="mgAgain">Play again</button><button class="choice no" id="mgOk">Done</button></div>`);
  $("mgAgain").onclick = mgRun;
  $("mgOk").onclick = () => mgEnd(false);
}
function mgEnd(quit) {
  if (!FC) return;
  if (quit && FC.run) Tele.ev("minigame", { k: "buah", a: "berhenti", skor: FC.score });
  FC.run = false;
  window.removeEventListener("keydown", FC.key); window.removeEventListener("resize", FC.size);
  FC.el.remove(); FC = null;
  dapurChip();
  if (cur) { play("jump", 700); say(wallet().koin >= 12 ? "Something nice to eat?" : "Thanks!", 2200); }
}
$("coinBtn").onclick = () => { hideHint(); if (game && cur) showKitchen(); };

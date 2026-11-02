// ---- Quiz rush (v71): game pertama yang ada lawannya. Lu lawan 3 CPU (Kiko, Bolt, Mimi dari Kitab Dunia Arcade)
// rebutan jawab 10 soal kilat. Benar +2, benar paling cepat +1, juara 1 di akhir +3. Salah = kekunci sampai soal berikutnya.
// Soalnya dibikin acak tanpa batas (hitung, angka terbesar, hitung benda, warna tinta, mana yang beda), makin lama makin susah.
// CPU punya watak: Kiko cepat tapi ceroboh, Bolt stabil, Mimi pelan tapi teliti. Nanti kalau ada server, kursi CPU diisi teman.
const QZ_N = 10, QZ_TIME = 7, QZ_SHOW = 1.1;
const QZ_CPU = [
  { name: "Kiko", col: "#E8506A", t0: 1.5, ts: 1.6, acc: 0.72 },
  { name: "Bolt", col: "#4A7BE0", t0: 2.1, ts: 1.6, acc: 0.84 },
  { name: "Mimi", col: "#F3A93C", t0: 2.7, ts: 1.8, acc: 0.94 },
];
const QZ_INK = [["RED", "#E8323F"], ["BLUE", "#2F7BE8"], ["GREEN", "#2FA84F"], ["YELLOW", "#F2C230"], ["PURPLE", "#8A4FD8"], ["ORANGE", "#F28A2E"]];
const QZ_CAT = [["🍎", "🍌", "🍇", "🍓", "🍊", "🍐", "🍉"], ["🐶", "🐱", "🐰", "🐻", "🐼", "🦊", "🐸"], ["🚗", "🚌", "🚲", "🚀", "🚂", "🚜", "🛵"], ["⚽", "🏀", "🏈", "🎾", "⚾", "🏐", "🎱"]];
const QZ_HARD = { math: 1, big: 0.9, count: 1.25, ink: 0.85, odd: 0.8 };   // pengali waktu mikir CPU per jenis soal

function qzPick(a) { return a[Math.floor(FC.rnd() * a.length)]; }
function qzInt(a, b) { return a + Math.floor(FC.rnd() * (b - a + 1)); }
function qzShuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(FC.rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// pilihan angka: jawaban + 3 pengecoh dekat, tanpa kembar dan tanpa minus
function qzNums(ans, near) {
  const set = new Set([ans]);
  for (const d of qzShuffle(near.slice())) { if (set.size >= 4) break; if (ans + d >= 0) set.add(ans + d); }
  let k = 3; while (set.size < 4) set.add(ans + k++);
  const opts = qzShuffle([...set]);
  return { opts: opts.map(String), ans: opts.indexOf(ans) };
}
function qzMake(i) {
  // jenis soal acak, nggak sama dua kali berturut-turut; tingkat naik tiap soal
  const kinds = ["math", "big", "count", "ink", "odd"].filter(k => k !== FC.qLast);
  const kind = qzPick(kinds); FC.qLast = kind;
  const lv = i / (QZ_N - 1);
  if (kind === "math") {
    let a, b, sym, ans;
    if (lv < 0.3) { a = qzInt(2, 9); b = qzInt(1, 9); sym = "+"; ans = a + b; }
    else if (lv < 0.65) { if (FC.rnd() < 0.5) { a = qzInt(8, 25); b = qzInt(3, 15); sym = "+"; ans = a + b; } else { a = qzInt(10, 30); b = qzInt(2, a - 1); sym = "−"; ans = a - b; } }
    else { if (FC.rnd() < 0.6) { a = qzInt(3, 9); b = qzInt(3, 9); sym = "×"; ans = a * b; } else { a = qzInt(15, 49); b = qzInt(12, 39); sym = "+"; ans = a + b; } }
    return { kind, prompt: "Quick maths!", big: `${a} ${sym} ${b}`, ...qzNums(ans, [-1, 1, -2, 2, 10, -10]) };
  }
  if (kind === "big") {
    // angka dengan digit yang sama diacak, jadi harus beneran dibaca
    const n = lv < 0.4 ? 2 : 3, ds = []; while (ds.length < n) { const d = qzInt(1, 9); if (!ds.includes(d)) ds.push(d); }
    const set = new Set(); let guard = 0;
    while (set.size < 4 && guard++ < 50) set.add(+qzShuffle(ds.slice()).join(""));
    while (set.size < 4) set.add(qzInt(10 ** (n - 1), 10 ** n - 1));
    const opts = qzShuffle([...set]), mx = Math.max(...opts);
    return { kind, prompt: "Tap the biggest number", opts: opts.map(String), ans: opts.indexOf(mx) };
  }
  if (kind === "count") {
    const cat = qzPick(QZ_CAT), [e, x] = qzShuffle(cat.slice()).slice(0, 2), n = qzInt(lv < 0.5 ? 3 : 6, lv < 0.5 ? 7 : 11), m = Math.round(lv * 6);
    const grid = qzShuffle(Array(n).fill(e).concat(Array(m).fill(x)));
    return { kind, prompt: `How many ${e}?`, grid, ...qzNums(n, [-1, 1, -2, 2]) };
  }
  if (kind === "ink") {
    // kata warna dicat warna lain: yang ditanya warna catnya
    const [w, ink] = qzShuffle(QZ_INK.slice()).slice(0, 2), rest = QZ_INK.filter(c => c !== ink && c !== w);
    const opts = qzShuffle([ink, w, ...qzShuffle(rest).slice(0, 2)]);
    return { kind, prompt: "What colour is the ink?", word: w[0], ink: ink[1], opts: opts.map(c => c[0]), ans: opts.indexOf(ink) };
  }
  const [c1, c2] = qzShuffle(QZ_CAT.slice()).slice(0, 2), three = qzShuffle(c1.slice()).slice(0, 3), odd = qzPick(c2);
  const opts = qzShuffle([...three, odd]);
  return { kind: "odd", prompt: "Which one doesn't belong?", opts, emo: true, ans: opts.indexOf(odd) };
}
function quizInit() {
  FC.ppl = [{ name: "You", col: "#22182B", me: true, pts: 0 }].concat(QZ_CPU.map(c => ({ ...c, pts: 0 })));
  Object.assign(FC, { qi: -1, qLast: null, phase: "next", pt: 0, place: null, tick: -1 });
  qzNext();
}
function qzNext() {
  FC.qi += 1;
  if (FC.qi >= QZ_N) return qzFinish();
  FC.q = qzMake(FC.qi); FC.phase = "ask"; FC.pt = 0; FC.first = null; FC.tick = -1;
  // rencana CPU: kapan jawab dan benar/nggak, dihitung di depan (pakai FC.rnd, jadi tantangan harian sama buat semua)
  const slow = (1 + 0.04 * FC.qi) * (QZ_HARD[FC.q.kind] || 1);
  for (const p of FC.ppl) {
    p.pick = null; p.at = null; p.ok = null; p.fast = false;
    if (p.me) continue;
    p.plan = (p.t0 + p.ts * FC.rnd()) * slow;
    const ok = FC.rnd() < p.acc - 0.02 * FC.qi;
    p.planPick = ok ? FC.q.ans : qzPick([0, 1, 2, 3].filter(k => k !== FC.q.ans));
  }
}
function qzAnswer(p, k) {
  if (FC.phase !== "ask" || p.pick != null) return;
  p.pick = k; p.at = FC.pt; p.ok = k === FC.q.ans;
  if (p.ok) {
    const first = FC.first == null; if (first) { FC.first = p; p.fast = true; }
    p.pts += 2 + (first ? 1 : 0);
    if (p.me) { FC.caught += 1; mgAdd(2); if (first) setTimeout(() => { if (FC && FC.k === "kuis") mgAdd(1); }, 160); Sfx.play(first ? "kombo" : "pas", first ? 3 : 1); navigator.vibrate && navigator.vibrate(25); }
    const D = FC.drop; if (p.me && D && !D.done && FC.caught >= D.at) { D.done = true; mgPick(D.kind); }
  } else if (p.me) { Sfx.play("ulat"); navigator.vibrate && navigator.vibrate(80); FC.qShake = 0.25; }
  if (FC.ppl.every(x => x.pick != null)) { FC.phase = "show"; FC.pt = 0; }
}
function qzFinish() {
  // urutan juara; kalau seri, pemain di depan
  const order = FC.ppl.slice().sort((a, b) => b.pts - a.pts || (b.me ? 1 : 0) - (a.me ? 1 : 0));
  FC.place = order.findIndex(p => p.me);
  FC.phase = "end"; FC.pt = 0;
  if (FC.place === 0) { mgAdd(3); Sfx.play("kombo", 5); }
}
function quizTap(px, py) {
  if (!FC.run || FC.phase !== "ask") return;
  const k = qzBtns().findIndex(r => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
  if (k >= 0) qzAnswer(FC.ppl[0], k);
}
function qzBtns() {
  const { cv, dpr } = FC, W = cv.width, H = cv.height, g = 12 * dpr, bw = (W - 32 * dpr - g) / 2, bh = 74 * dpr, y0 = H - 36 * dpr - bh * 2 - g;
  return [0, 1, 2, 3].map(k => ({ x: 16 * dpr + (k % 2) * (bw + g), y: y0 + Math.floor(k / 2) * (bh + g), w: bw, h: bh }));
}
function qzRR(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function quizStep(dt) {
  const { ctx, cv, dpr } = FC, W = cv.width, H = cv.height;
  FC.pt += dt;
  if (FC.phase === "ask") {
    for (const p of FC.ppl) if (!p.me && p.pick == null && FC.pt >= p.plan) qzAnswer(p, p.planPick);
    const rest = QZ_TIME - FC.pt, s = Math.ceil(rest);
    if (rest <= 3 && s !== FC.tick && s > 0) { FC.tick = s; Sfx.play("detik"); }
    if (rest <= 0) { FC.phase = "show"; FC.pt = 0; }
  } else if (FC.phase === "show" && FC.pt >= QZ_SHOW) qzNext();
  else if (FC.phase === "end" && FC.pt >= 1.8 && !FC.over) { FC.over = now(); FC.cont = true; }
  if (FC.qShake > 0) FC.qShake -= dt;
  const sx = FC.qShake > 0 ? Math.sin(FC.pt * 80) * 6 * dpr : 0;
  ctx.save(); ctx.translate(sx, 0); ctx.lineJoin = "round";
  // deretan pemain: avatar, nama, poin, tanda jawaban
  const sy = 178 * dpr, cw = (W - 32 * dpr) / 4;
  FC.ppl.forEach((p, i) => {
    const x = 16 * dpr + cw * (i + 0.5), r = 21 * dpr, lead = FC.phase === "end" && FC.ppl.every(o => o.pts <= p.pts);
    if (p.pick != null && FC.phase === "ask" && !p.me) wGlow(ctx, x, sy, r * 2.2, "rgba(255,255,255,.35)");
    ctx.beginPath(); ctx.arc(x, sy, r, 0, 7); ctx.fillStyle = p.me ? "#FFF8EC" : p.col; ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
    ctx.fillStyle = p.me ? OUTL : "#FFF"; ctx.font = `900 ${18 * dpr}px system-ui, sans-serif`; ctx.fillText(p.me ? "★" : p.name[0], x, sy + 1 * dpr);
    if (lead) stamp(ctx, "👑", x, sy - r - 8 * dpr, 22 * dpr);
    ctx.fillStyle = "#FFF"; ctx.font = `800 ${12 * dpr}px system-ui, sans-serif`; ctx.fillText(p.name, x, sy + r + 12 * dpr);
    ctx.font = `900 ${15 * dpr}px system-ui, sans-serif`; ctx.fillStyle = "#FFE36B"; ctx.fillText(String(p.pts), x, sy + r + 29 * dpr);
    // tanda: titik waktu nunggu, ✓/✗ waktu soal dibuka, petir buat yang tercepat
    if (p.pick != null && (FC.phase !== "ask" || p.me)) {
      const bx = x + r * 0.8, by = sy - r * 0.8;
      ctx.beginPath(); ctx.arc(bx, by, 10 * dpr, 0, 7); ctx.fillStyle = p.ok ? "#2FA84F" : "#E8323F"; ctx.fill(); ctx.lineWidth = 2 * dpr; ctx.stroke();
      ctx.fillStyle = "#FFF"; ctx.font = `900 ${12 * dpr}px system-ui, sans-serif`; ctx.fillText(p.ok ? (p.fast ? "⚡" : "✓") : "✗", bx, by + 1 * dpr);
    } else if (p.pick != null) {
      ctx.beginPath(); ctx.arc(x + r * 0.8, sy - r * 0.8, 8 * dpr, 0, 7); ctx.fillStyle = "#FFF8EC"; ctx.fill(); ctx.lineWidth = 2 * dpr; ctx.stroke();
      ctx.fillStyle = OUTL; ctx.font = `900 ${10 * dpr}px system-ui, sans-serif`; ctx.fillText("✓", x + r * 0.8, sy - r * 0.8 + 1 * dpr);
    }
  });
  if (FC.phase === "end") { qzEndDraw(ctx, W, H, dpr); ctx.restore(); return; }
  const q = FC.q; if (!q) { ctx.restore(); return; }
  // kartu soal
  const btn = qzBtns(), cy0 = 250 * dpr, cy1 = btn[0].y - 18 * dpr, ch = cy1 - cy0, cx = 16 * dpr, cwid = W - 32 * dpr;
  qzRR(ctx, cx, cy0 + 5 * dpr, cwid, ch, 22 * dpr); ctx.fillStyle = OUTL; ctx.fill();
  qzRR(ctx, cx, cy0, cwid, ch, 22 * dpr); ctx.fillStyle = "#FFF8EC"; ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
  ctx.fillStyle = "#8A7FA0"; ctx.font = `800 ${13 * dpr}px system-ui, sans-serif`; ctx.fillText(`QUESTION ${FC.qi + 1} OF ${QZ_N}`, W / 2, cy0 + 24 * dpr);
  ctx.fillStyle = OUTL; ctx.font = `900 ${21 * dpr}px system-ui, sans-serif`; ctx.fillText(q.prompt, W / 2, cy0 + 54 * dpr);
  const my = cy0 + 54 * dpr + (ch - 54 * dpr - 26 * dpr) / 2 + 8 * dpr;
  if (q.big) { ctx.font = `900 ${Math.min(64, ch / dpr * 0.35) * dpr}px system-ui, sans-serif`; ctx.fillText(q.big, W / 2, my); }
  else if (q.word) { ctx.font = `900 ${54 * dpr}px system-ui, sans-serif`; ctx.lineWidth = 6 * dpr; ctx.strokeStyle = OUTL; ctx.strokeText(q.word, W / 2, my); ctx.fillStyle = q.ink; ctx.fillText(q.word, W / 2, my); }
  else if (q.grid) {
    const n = q.grid.length, cols = Math.min(6, Math.ceil(Math.sqrt(n * 1.6))), rows = Math.ceil(n / cols), sz = Math.min(44 * dpr, (cwid - 40 * dpr) / cols, (ch - 110 * dpr) / rows);
    q.grid.forEach((e, k) => { const c = k % cols, rr = Math.floor(k / cols), inRow = rr === rows - 1 ? n - rr * cols : cols; stamp(ctx, e, W / 2 + (c - (inRow - 1) / 2) * sz, my + (rr - (rows - 1) / 2) * sz, sz * 0.85); });
  } else {
    // soal tanpa gambar (mana yang beda, angka terbesar): ikon besar yang goyang pelan + panah ke tombol
    ctx.save(); ctx.translate(W / 2, my - 10 * dpr); ctx.rotate(Math.sin(FC.pt * 3) * 0.12); stamp(ctx, q.kind === "odd" ? "🤔" : "🔢", 0, 0, 72 * dpr); ctx.restore();
    ctx.fillStyle = "#8A7FA0"; ctx.font = `800 ${14 * dpr}px system-ui, sans-serif`; ctx.fillText("Pick below ↓", W / 2, my + 48 * dpr);
  }
  // sisa waktu: garis di bawah kartu
  const left = FC.phase === "ask" ? Math.max(0, 1 - FC.pt / QZ_TIME) : 0;
  qzRR(ctx, cx + 18 * dpr, cy1 - 20 * dpr, cwid - 36 * dpr, 8 * dpr, 4 * dpr); ctx.fillStyle = "#E6DCEB"; ctx.fill();
  if (left > 0) { qzRR(ctx, cx + 18 * dpr, cy1 - 20 * dpr, (cwid - 36 * dpr) * left, 8 * dpr, 4 * dpr); ctx.fillStyle = left < 0.3 ? "#E8323F" : "#6C3EE6"; ctx.fill(); }
  // tombol jawaban
  const me = FC.ppl[0];
  btn.forEach((r, k) => {
    const reveal = FC.phase === "show", right = k === q.ans, mine = me.pick === k;
    let fill = "#FFFFFF", ink = OUTL;
    if (reveal && right) { fill = "#5BD07A"; ink = "#FFF"; } else if (mine && !right) { fill = "#FF7A85"; ink = "#FFF"; } else if (mine && right) { fill = "#5BD07A"; ink = "#FFF"; } else if (me.pick != null || reveal) { fill = "#E9E2EF"; ink = "#9A90AA"; }
    const press = mine ? 3 * dpr : 0;
    qzRR(ctx, r.x, r.y + 5 * dpr, r.w, r.h, 18 * dpr); ctx.fillStyle = OUTL; ctx.fill();
    qzRR(ctx, r.x, r.y + press, r.w, r.h, 18 * dpr); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
    if (q.emo) stamp(ctx, q.opts[k], r.x + r.w / 2, r.y + r.h / 2 + press, 40 * dpr);
    else { ctx.fillStyle = ink; ctx.font = `900 ${(q.opts[k].length > 4 ? 20 : 28) * dpr}px system-ui, sans-serif`; ctx.fillText(q.opts[k], r.x + r.w / 2, r.y + r.h / 2 + press + 1 * dpr); }
    // siapa aja yang milih jawaban ini (keliatan waktu dibuka)
    if (reveal) FC.ppl.filter(p => !p.me && p.pick === k).forEach((p, j) => { ctx.beginPath(); ctx.arc(r.x + r.w - 16 * dpr - j * 18 * dpr, r.y + 15 * dpr, 8 * dpr, 0, 7); ctx.fillStyle = p.col; ctx.fill(); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = OUTL; ctx.stroke(); });
  });
  ctx.restore();
}
function qzEndDraw(ctx, W, H, dpr) {
  // podium singkat sebelum kartu akhir
  const order = FC.ppl.slice().sort((a, b) => b.pts - a.pts || (b.me ? 1 : 0) - (a.me ? 1 : 0)), k = Math.min(1, FC.pt / 0.5);
  const lab = ["1st", "2nd", "3rd", "4th"], y0 = 290 * dpr;
  ctx.fillStyle = "#FFF"; ctx.font = `900 ${30 * dpr}px system-ui, sans-serif`;
  ctx.fillText(FC.place === 0 ? "You win! +3" : `You came ${lab[FC.place]}`, W / 2, y0);
  order.forEach((p, i) => {
    const y = y0 + (60 + i * 64) * dpr, x = 16 * dpr + (1 - k) * W, w = W - 32 * dpr;
    qzRR(ctx, x, y, w, 52 * dpr, 16 * dpr); ctx.fillStyle = p.me ? "#FFE36B" : "#FFF8EC"; ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
    ctx.textAlign = "left"; ctx.fillStyle = OUTL; ctx.font = `900 ${18 * dpr}px system-ui, sans-serif`; ctx.fillText(`${lab[i]}  ${p.name}`, x + 18 * dpr, y + 27 * dpr);
    ctx.textAlign = "right"; ctx.fillText(String(p.pts), x + w - 18 * dpr, y + 27 * dpr); ctx.textAlign = "center";
  });
}
// dunia Quiz rush: panggung kuis TV, lampu sorot goyang, bohlam pinggir kedip
function wStudio(ctx, W, H, dpr, t) {
  ctx.fillStyle = wGrad(ctx, 0, H, [[0, "#2B1A63"], [0.6, "#1B1046"], [1, "#0F0A2A"]]); ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";
  for (const [x0, ph, col] of [[0.1, 0, "rgba(120,180,255,.10)"], [0.9, 2, "rgba(255,120,200,.10)"], [0.5, 4, "rgba(255,230,120,.08)"]]) {
    const a = Math.PI / 2 + Math.sin(t * 0.6 + ph) * 0.45, L = H * 1.1, sx = W * x0;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + Math.cos(a - 0.14) * L, Math.sin(a - 0.14) * L); ctx.lineTo(sx + Math.cos(a + 0.14) * L, Math.sin(a + 0.14) * L); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  wGlow(ctx, W / 2, H * 0.95, W * 0.7, "rgba(140,90,255,.35)");
  // bohlam di pinggir kiri-kanan, nyala bergantian
  const n = Math.floor(H / (34 * dpr));
  for (let i = 0; i < n; i++) for (const x of [7 * dpr, W - 7 * dpr]) {
    const on = (Math.floor(t * 4) + i) % 3 === 0, y = 17 * dpr + i * 34 * dpr;
    if (on) wGlow(ctx, x, y, 14 * dpr, "rgba(255,220,120,.8)");
    ctx.beginPath(); ctx.arc(x, y, 4 * dpr, 0, 7); ctx.fillStyle = on ? "#FFE9A0" : "#6A5A8A"; ctx.fill();
  }
}
Object.assign(WORLDS, { kuis: wStudio });

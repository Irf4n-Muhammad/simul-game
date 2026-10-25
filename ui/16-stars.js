// ---- talent constellations: a full-screen night sky. Every talent is a star; lighting one traces the line to it.
// Stars nobody has reached yet look like any other speck in the sky until a lit star next to them reveals them.
let skyLay = null, sky = null;
const SKY_R = { root: 120, field: 240, spec: 355, niche: 455, legend: 690, master: 795, icon: 915, crown: 1045 };
const SKY_SIZE = { core: 9, root: 7.5, field: 5.5, spec: 4.2, niche: 3.6, combo: 3.6, secret: 3.4, legend: 4.4, master: 5.6, icon: 7.4, crown: 10 };
const SKY_FONT = { root: 15, field: 12.5, spec: 11, niche: 10.5, combo: 10.5, secret: 10.5, legend: 10.5, master: 11.5, icon: 13, crown: 16 };
const SKY_OUTER = ["legend", "master", "icon", "crown"];
const skyReqs = n => n.req.length ? n.req : n.reqAny || (n.tier === "root" || n.tier === "secret" ? ["core"] : []);
const skyHash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
function layoutSky() {
  if (skyLay) return skyLay;
  const N = Tree.NODES, P = {}, ang = {}, SQ = 1.32;
  const pol = (a, r) => [r * Math.sin(a * Math.PI / 180), -r * Math.cos(a * Math.PI / 180) * SQ];
  const leaves = [];
  Tree.ROOTS.forEach((rid, ri) => N[rid].kids.filter(k => N[k].tier === "field").forEach((fid, fi) =>
    N[fid].kids.filter(k => N[k].tier === "spec").forEach(sid => N[sid].kids.filter(k => N[k].tier === "niche").forEach(nid =>
      leaves.push({ nid, u: leaves.length + ri * 3 + (ri * 3 + fi) * 0.7 })))));
  const span = leaves[leaves.length - 1].u + 3 + 0.7;
  leaves.forEach(l => { ang[l.nid] = -45 + l.u / span * 360; });
  const next = { spec: "niche", field: "spec", root: "field" };
  for (const t of ["spec", "field", "root"]) for (const id of Tree.ORDER) if (N[id].tier === t) {
    const ks = N[id].kids.filter(k => N[k].tier === next[t]); ang[id] = ks.reduce((s, k) => s + ang[k], 0) / ks.length;
  }
  // the outer rings: each one sits beyond the stars it grows out of
  for (const t of SKY_OUTER) for (const id of Tree.ORDER) if (N[id].tier === t) {
    const rs = skyReqs(N[id]); ang[id] = rs.reduce((s, k) => s + ang[k], 0) / rs.length;
  }
  // a little scatter so it reads as a sky, not a chart
  for (const id of Tree.ORDER) { const n = N[id]; if (SKY_R[n.tier]) {
    const a = ang[id] + (skyHash(id + "a") - 0.5) * (n.tier === "niche" || n.tier === "legend" ? 2.2 : n.tier === "crown" || n.tier === "icon" ? 0 : 5), r = SKY_R[n.tier] + (skyHash(id + "r") - 0.5) * (n.tier === "niche" ? 34 : n.tier === "crown" || n.tier === "icon" ? 0 : 26);
    const [x, y] = pol(a, r); P[id] = { x, y, a, r };
  } }
  // crossroads float in the outer sky between the two constellations they join
  const cmean = (a, b) => { let d = ((b - a + 540) % 360) - 180; return a + d / 2; };
  const combos = Tree.ORDER.filter(id => N[id].tier === "combo").map(id => ({ id, a: cmean(P[N[id].req[0]].a, P[N[id].req[1]].a) })).sort((p, q) => p.a - q.a);
  for (let it = 0; it < 120; it++) for (let i = 0; i < combos.length; i++) {
    const p = combos[i], q = combos[(i + 1) % combos.length];
    let gap = ((q.a - p.a) + 360) % 360; if (combos.length > 1 && gap < 9.2) { const d = (9.2 - gap) / 2; p.a -= d; q.a += d; }
  }
  combos.forEach((c, i) => { const r = 560 + (i % 2) * 52 + (skyHash(c.id) - 0.5) * 24; const [x, y] = pol(c.a, r); P[c.id] = { x, y, a: c.a, r }; });
  const per = {};
  for (const id of Tree.ORDER) if (N[id].tier === "secret") {
    const par = N[id].req[0];
    if (!par) { const k = per.core = (per.core || 0) + 1; const [x, y] = pol(k === 1 ? 160 : 200, 52); P[id] = { x, y, a: 0, r: 52 }; continue; }
    const k = per[par] = (per[par] || 0) + 1, side = k % 2 ? 1 : -1;
    const a = P[par].a + side * (6 + Math.floor((k - 1) / 2) * 4), r = P[par].r + 50;
    const [x, y] = pol(a, r); P[id] = { x, y, a, r };
  }
  P.core = { x: 0, y: 0, a: 0, r: 0 };
  // background stars live in the same world so they drift with the sky
  const dust = [];
  for (let i = 0; i < 520; i++) {
    const a = skyHash("da" + i) * Math.PI * 2, r = Math.sqrt(skyHash("dr" + i)) * 900;
    dust.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 1.2, s: 0.4 + skyHash("ds" + i) * 1.1, t: skyHash("dt" + i) * 6.28, d: 0.35 + skyHash("dd" + i) * 0.65 });
  }
  skyLay = { P, dust };
  return skyLay;
}
const skyColor = n => n.tier === "combo" ? "#B59CFF" : n.tier === "secret" ? "#F5CF6B" : n.tier === "crown" ? "#FFD66B" : ({ body: "#7FE0A0", mind: "#7FB2FF", spark: "#FFB36B", heart: "#FF8FB8" })[n.root];
const skyGlow = {};
function glowSprite(col) {
  if (skyGlow[col]) return skyGlow[col];
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, col + "ff"); gr.addColorStop(0.18, col + "aa"); gr.addColorStop(0.45, col + "33"); gr.addColorStop(1, col + "00");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return (skyGlow[col] = c);
}
function skyFit() {
  const { P } = layoutSky(), W = sky.cv.clientWidth, H = sky.cv.clientHeight, ps = Object.values(P);
  const x0 = Math.min(...ps.map(p => p.x)) - 30, x1 = Math.max(...ps.map(p => p.x)) + 30, y0 = Math.min(...ps.map(p => p.y)) - 30, y1 = Math.max(...ps.map(p => p.y)) + 30;
  const top = 96, bottom = 120, s = Math.min(W / (x1 - x0), (H - top - bottom) / (y1 - y0));
  return { s, ox: W / 2 - (x0 + x1) / 2 * s, oy: top + (H - top - bottom) / 2 - (y0 + y1) / 2 * s };
}
function showTree(id = cur && cur.id, back = null) {
  const c = game.home.get(id); if (!c || !c.st) return;
  closeSheet(); Tele.layar("app", "stars");
  if (sky) sky.el.remove();
  const el = document.createElement("div"); el.className = "sky"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", `${c.name}'s constellations`);
  el.innerHTML = `<canvas></canvas>
    <div class="sky-top"><button class="sky-x" aria-label="${back ? "Back" : "Close"}">${back ? "‹" : "✕"}</button>
      <div class="sky-title"><span class="sky-kicker">Constellations</span><b>${esc(c.name)}</b><small id="skySub"></small></div>
      <div class="sky-pts"><b id="skyPts">0</b><small>points</small></div></div>
    <div class="sky-panel" id="skyPanel"></div>
    <div class="sky-zoom"><button data-z="0.7" aria-label="Zoom in">+</button><button data-z="1.4" aria-label="Zoom out">−</button></div>`;
  (PH ? PH.screen : $("app")).appendChild(el);
  const cv = el.querySelector("canvas");
  sky = { el, cv, ctx: cv.getContext("2d"), c, back, sel: null, cam: null, t0: performance.now(), anims: [], parts: [], v: null, raf: 0, closing: 0 };
  skyResize(); sky.fit = skyFit();
  skyRefresh(); sky.cam = skyFitSeen();
  el.querySelector(".sky-x").onclick = closeSky;
  el.querySelectorAll("[data-z]").forEach(b => b.onclick = () => skyZoom(+b.dataset.z, cv.clientWidth / 2, cv.clientHeight / 2));
  skyInput(cv);
  requestAnimationFrame(() => el.classList.add("on"));
  sky.raf = requestAnimationFrame(skyFrame);
}
function closeSky() {
  if (!sky || sky.closing) return;
  sky.closing = performance.now(); sky.el.classList.remove("on");
  const s = sky; setTimeout(() => { cancelAnimationFrame(s.raf); s.el.remove(); if (sky === s) sky = null; }, 420);
  if (s.back === "phone") phGo("home"); else if (s.back) showLife(s.back);
}
function skyFitSeen() {
  const { P } = layoutSky(), v = sky.v, W = sky.cv.clientWidth, H = sky.cv.clientHeight;
  const ps = [P.core, ...Tree.ORDER.filter(id => v.nodes[id].s !== "hidden").map(id => P[id])];
  const x0 = Math.min(...ps.map(p => p.x)) - 60, x1 = Math.max(...ps.map(p => p.x)) + 60, y0 = Math.min(...ps.map(p => p.y)) - 60, y1 = Math.max(...ps.map(p => p.y)) + 60;
  const top = 96, bottom = 120, s = Math.max(sky.fit.s, Math.min(sky.fit.s * 2.6, W / (x1 - x0), (H - top - bottom) / (y1 - y0)));
  return { s, ox: W / 2 - (x0 + x1) / 2 * s, oy: top + (H - top - bottom) / 2 - (y0 + y1) / 2 * s };
}
function skyResize() {
  const d = Math.min(2, window.devicePixelRatio || 1), cv = sky.cv;
  cv.width = Math.round(cv.clientWidth * d); cv.height = Math.round(cv.clientHeight * d); sky.dpr = d;
}
function skyRefresh() {
  const c = sky.c, v = Tree.view(c, game.home, today()); sky.v = v;
  $("skyPts").textContent = v.points;
  $("skySub").textContent = `${v.have.length} of ${Tree.count} stars lit · ${v.hidden} still dark`;
  skyPanel();
}
function skyZoom(f, sx, sy) {
  const cam = sky.cam, s = Math.max(sky.fit.s * 0.8, Math.min(sky.fit.s * 6, cam.s / f));
  cam.ox = sx - (sx - cam.ox) * s / cam.s; cam.oy = sy - (sy - cam.oy) * s / cam.s; cam.s = s;
}
function skyFlyTo(x, y, s) { sky.fly = { from: { ...sky.cam }, s, x, y, t: performance.now() }; }
function skyInput(cv) {
  const pts = new Map(); let moved = 0, pinch = null;
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; sky.fly = null; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } };
  cv.onpointermove = e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId), dx = e.clientX - prev[0], dy = e.clientY - prev[1];
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) { moved += Math.abs(dx) + Math.abs(dy); sky.cam.ox += dx; sky.cam.oy += dy; }
    else if (pts.size === 2) {
      moved += 99; const r = cv.getBoundingClientRect(), [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) skyZoom(pinch / d, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
      pinch = d;
    }
  };
  const up = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
    if (moved > 8 || pts.size) return;
    const r = cv.getBoundingClientRect(), cam = sky.cam, x = (e.clientX - r.left - cam.ox) / cam.s, y = (e.clientY - r.top - cam.oy) / cam.s;
    const { P } = layoutSky();
    let best = null, bd = 26 / cam.s;
    for (const id of Tree.ORDER) { const d = Math.hypot(P[id].x - x, P[id].y - y); if (d < bd) { bd = d; best = id; } }
    sky.sel = best; skyPanel();
    if (best) { const p = P[best]; skyFlyTo(p.x, p.y, Math.max(cam.s, sky.fit.s * 2.4)); }
  };
  cv.onpointerup = up; cv.onpointercancel = up;
  cv.onwheel = e => { e.preventDefault(); const r = cv.getBoundingClientRect(); skyZoom(e.deltaY > 0 ? 1.15 : 0.87, e.clientX - r.left, e.clientY - r.top); };
}
function skyPanel() {
  const c = sky.c, v = sky.v, N = Tree.NODES, panel = $("skyPanel"), alive = c.alive(today()) && !("keluar" in c.info);
  if (!sky.sel) {
    const L = v.legacy;
    panel.innerHTML = `<p class="sky-hint">${v.points ? `Tap a glowing star to light it.` : `Points come from growing up, practice and big moments.`}</p>
      <small class="sky-meta">${v.parts.age} from growing up · ${v.parts.practice} from practice · ${v.parts.moments} from big moments · ${v.parts.mastery} from mastery</small>${L ? `<small class="sky-meta">Family path from ${esc(L.from)}: ${L.path.map(id => esc(Tree.NODES[id].label)).join(" → ")}. Each star on it costs 1 point less.</small>` : ""}`;
    return;
  }
  panel.style.animation = "none"; void panel.offsetWidth; panel.style.animation = "";
  const n = Tree.info(sky.sel), st = v.nodes[sky.sel], col = skyColor(n);
  if (st.s === "hidden") { panel.innerHTML = `<span class="sky-chip" style="--c:#8a93b8">Dark star</span><h3>Not seen yet</h3><p>${n.tier === "secret" ? "Something is hiding here." : "Light a star next to it to see what it is."}</p>`; return; }
  if (st.s === "secret") { panel.innerHTML = `<span class="sky-chip" style="--c:#F5CF6B">Hidden star</span><h3>A secret</h3><p>${esc(n.hint)}</p>`; return; }
  const missing = n.req.filter(r => v.nodes[r].s !== "owned").map(r => N[r].label);
  const need = st.need, sk = need && Status.SKILL_LABEL[need.skill];
  const why = st.s === "owned" ? `Lit on ${fmtDate(st.day)}.` : !alive ? "This life is over." : st.s === "glimpse" ? `Light ${missing.join(" and ")} first.`
    : st.s === "gated" ? `Needs ${sk} talent ${need.talent}. ${esc(c.name)} has ${need.has}.${need.talent - need.has === 1 ? ` Reaching ${sk} 90 counts as one more.` : ""}` : st.cost > v.points ? `Needs ${st.cost} points. ${esc(c.name)} has ${v.points}.` : c.id !== cur.id ? `Go to ${esc(c.name)} to light it.` : !canCare() ? "Not right now." : "";
  panel.innerHTML = `<div class="sky-row"><span class="sky-chip" style="--c:${col}">${n.tierLabel}</span><small>${n.share} of creatures</small></div>
    <h3>${esc(n.label)}</h3>${n.d ? `<p>${esc(n.d)}</p>` : ""}
    ${n.gate ? `<small class="sky-meta">Needs ${Status.SKILL_LABEL[N[n.root].skill]} talent ${n.gate}+${n.gate < 9 ? " (skill 90 counts as +1)" : ""}</small>` : ""}
    ${n.tier === "combo" ? `<small class="sky-meta">Joins ${esc(n.req.map(r => N[r].label).join(" + "))}</small>` : ""}
    ${v.legacy && v.legacy.path.includes(sky.sel) ? `<small class="sky-meta">Family star, from ${esc(v.legacy.from)}</small>` : ""}
    <ul>${n.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
    ${st.s === "owned" ? `<small class="sky-meta">${why}</small>` : `<button class="sky-go" id="skyGo" ${why ? "disabled" : ""}>Light it up · ${st.cost} pt${st.cost === 1 ? "" : "s"}</button>${why ? `<small class="sky-meta">${why}</small>` : ""}`}`;
  const go = $("skyGo"); if (go) go.onclick = skyLight;
}
function skyLight() {
  const id = sky.sel, n = Tree.NODES[id], c = sky.c;
  if (!game.act(c.id, "pohon:" + id)) return;
  save(); refresh(true);
  const t = performance.now(), { P } = layoutSky();
  for (const r of (n.req.length ? n.req : n.reqAny ? n.reqAny.filter(r => sky.v.nodes[r].s === "owned") : ["core"])) sky.anims.push({ from: r, to: id, t });
  const p = P[id], col = skyColor(n);
  for (let i = 0; i < 46; i++) { const a = Math.random() * 6.28, sp = 20 + Math.random() * 90; sky.parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: t + 650, col }); }
  sky.flare = { id, t: t + 650 };
  skyRefresh();
  joyUntil = now() + 2600;
  setTimeout(() => say(n.tier === "crown" ? "I can't believe it. This is who I am." : n.tier === "secret" ? "I found something about myself!" : n.tier === "niche" || n.tier === "combo" ? `${n.label}. That feels like me!` : `${n.label}! I like that.`), 700);
}
function skyFrame(ts) {
  if (!sky) return;
  sky.raf = requestAnimationFrame(skyFrame);
  const { ctx, cv, dpr, v } = sky, W = cv.clientWidth, H = cv.clientHeight, N = Tree.NODES, { P, dust } = layoutSky();
  if (cv.width !== Math.round(W * dpr)) { skyResize(); sky.fit = skyFit(); }
  // opening: the camera drifts in from far away while the sky fades up
  const open = Math.min(1, (ts - sky.t0) / 1400), ease = 1 - Math.pow(1 - open, 3);
  if (sky.fly) {
    const f = sky.fly, k = Math.min(1, (ts - f.t) / 650), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const s = f.from.s + (f.s - f.from.s) * e, tx = W / 2 - f.x * f.s, ty = H * 0.38 - f.y * f.s;
    sky.cam = { s, ox: f.from.ox + (tx - f.from.ox) * e, oy: f.from.oy + (ty - f.from.oy) * e };
    if (k >= 1) sky.fly = null;
  }
  const cam = open < 1 ? { s: sky.cam.s * (0.55 + 0.45 * ease), ox: W / 2 + (sky.cam.ox - W / 2) * (0.55 + 0.45 * ease), oy: H / 2 + (sky.cam.oy - H / 2) * (0.55 + 0.45 * ease) } : sky.cam;
  const X = x => x * cam.s + cam.ox, Y = y => y * cam.s + cam.oy, zoom = cam.s / sky.fit.s;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = ctx.createRadialGradient(X(0), Y(0), 0, X(0), Y(0), Math.max(W, H) * 1.1);
  bg.addColorStop(0, "#1a1f4d"); bg.addColorStop(0.45, "#0d1033"); bg.addColorStop(1, "#04050f");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const S = id => v.nodes[id].s;
  // nebula: each constellation glows more the more of it is lit
  const lit = {}; for (const id of v.have) { const r = N[id].root; if (r) lit[r] = (lit[r] || 0) + 1; }
  ctx.globalCompositeOperation = "lighter";
  for (const r of Tree.ROOTS) {
    const p = P[r], g = glowSprite(skyColor(N[r])), size = (260 + Math.min(24, lit[r] || 0) * 18) * cam.s;
    ctx.globalAlpha = (0.09 + Math.min(0.22, (lit[r] || 0) * 0.025)) * ease;
    ctx.drawImage(g, X(p.x * 1.7) - size, Y(p.y * 1.7) - size, size * 2, size * 2);
  }
  // sky dust, twinkling; it drifts slower than the stars for depth
  for (const d of dust) {
    const x = d.x * cam.s * d.d + (cam.ox - W / 2) * d.d + W / 2, y = d.y * cam.s * d.d + (cam.oy - H / 2) * d.d + H / 2;
    if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
    ctx.globalAlpha = (0.25 + 0.45 * (0.5 + 0.5 * Math.sin(ts / 900 + d.t))) * d.d * ease;
    ctx.fillStyle = "#dfe6ff"; ctx.fillRect(x, y, d.s, d.s);
  }
  if (!sky.shoot || ts > sky.shoot.t + 900) { if (!sky.shoot || ts > sky.shoot.t + 5200 + skyHash(String(sky.shoot.t)) * 4000) sky.shoot = { t: ts, x: W * (0.2 + Math.random() * 0.8), y: H * Math.random() * 0.4, a: 2.5 + Math.random() * 0.5 }; }
  if (ts - sky.shoot.t < 900) {
    const k = (ts - sky.shoot.t) / 900, sx = sky.shoot.x - Math.cos(sky.shoot.a) * -k * 260, sy = sky.shoot.y + Math.sin(sky.shoot.a) * k * 260;
    const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(sky.shoot.a) * -70, sy - Math.sin(sky.shoot.a) * 70);
    g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = Math.sin(k * Math.PI) * ease; ctx.strokeStyle = g; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(sky.shoot.a) * -70, sy - Math.sin(sky.shoot.a) * 70); ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
  // lines: lit lines glow, the next ones are faint dotted traces
  const animating = new Set(sky.anims.map(a => a.to));
  const line = (a, b, col, w, alpha, dash, prog = 1) => {
    ctx.globalAlpha = alpha * ease; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(a.x + (b.x - a.x) * prog), Y(a.y + (b.y - a.y) * prog)); ctx.stroke();
  };
  for (const id of Tree.ORDER) {
    const n = N[id], s = S(id), reqs = skyReqs(n);
    for (const r of reqs) {
      const rs = r === "core" ? "owned" : S(r), col = skyColor(n);
      if (s === "owned" && rs === "owned" && !animating.has(id)) { line(P[r], P[id], col, 3.2, 0.18, null); line(P[r], P[id], "#ffffff", 1, 0.75, null); }
      else if ((s === "open" || s === "glimpse" || s === "gated") && rs === "owned") line(P[r], P[id], col, 1, s === "gated" ? 0.2 : 0.35, [2, 5]);
    }
  }
  ctx.setLineDash([]);
  sky.anims = sky.anims.filter(a => {
    const k = Math.min(1, (ts - a.t) / 650), col = skyColor(N[a.to]);
    line(P[a.from], P[a.to], col, 5, 0.35, null, k); line(P[a.from], P[a.to], "#ffffff", 1.6, 0.95, null, k);
    return k < 1;
  });
  // stars
  ctx.globalCompositeOperation = "lighter";
  const star = (x, y, r, col, a) => { const g = glowSprite(col), s = r * 6; ctx.globalAlpha = a; ctx.drawImage(g, x - s, y - s, s * 2, s * 2); };
  const labels = [];
  for (const id of Tree.ORDER) {
    const n = N[id], s = S(id), p = P[id], x = X(p.x), y = Y(p.y), col = skyColor(n);
    if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
    const tw = 0.5 + 0.5 * Math.sin(ts / 700 + skyHash(id) * 6.28), base = SKY_SIZE[n.tier] * Math.max(0.8, Math.min(1.8, zoom * 0.6));
    if (s === "hidden") { ctx.globalAlpha = (0.35 + 0.3 * tw) * ease; ctx.fillStyle = "#cfd6ff"; ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6); continue; }
    if (s === "secret") { star(x, y, base * 0.7, "#F5CF6B", (0.2 + 0.35 * tw) * ease); if (zoom > 1.6) labels.push([x, y + base + 10, "?", "#F5CF6B", 11, 0.7]); continue; }
    const pending = animating.has(id) || (sky.flare && sky.flare.id === id && ts < sky.flare.t);
    if (s === "owned" && !pending) {
      star(x, y, base * (1.15 + 0.1 * tw), col, (SKY_OUTER.includes(n.tier) || n.tier === "root" ? 1 : 0.7) * ease);
      ctx.globalAlpha = ease; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, base * 0.55, 0, 6.28); ctx.fill();
      if (["root", "niche", "combo", "secret", ...SKY_OUTER].includes(n.tier)) { // four-point sparkle on the big ones
        const L = base * (2.6 + tw) * (n.tier === "crown" ? 1.6 : 1); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.globalAlpha = 0.7 * ease;
        ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
        if (n.tier === "icon" || n.tier === "crown") { // the outermost stars also get a slow diagonal sparkle and a halo
          const D = L * 0.55; ctx.globalAlpha = 0.45 * ease; ctx.beginPath(); ctx.moveTo(x - D, y - D); ctx.lineTo(x + D, y + D); ctx.moveTo(x + D, y - D); ctx.lineTo(x - D, y + D); ctx.stroke();
          ctx.strokeStyle = col; ctx.globalAlpha = (0.35 + 0.25 * tw) * ease; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, base * 2.1, 0, 6.28); ctx.stroke();
        }
      }
    } else {
      const aff = s === "open" && v.nodes[id].cost <= v.points;
      const dim = s === "glimpse" || s === "gated";
      star(x, y, base * (aff ? 0.8 + 0.35 * tw : 0.6), col, (dim ? 0.35 : aff ? 0.75 : 0.5) * ease);
      ctx.globalAlpha = (dim ? 0.4 : 0.85) * ease; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, base * 0.32, 0, 6.28); ctx.fill();
      if (aff) { ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.globalAlpha = (0.3 + 0.5 * tw) * ease; ctx.beginPath(); ctx.arc(x, y, base * (1.4 + 0.5 * tw), 0, 6.28); ctx.stroke(); }
    }
    const show = n.tier === "root" || ((n.tier === "field" || n.tier === "icon" || n.tier === "crown") && zoom > 1.25) || zoom > 2;
    if (show) labels.push([x, y + base + SKY_FONT[n.tier] + 3, n.label + (s === "gated" ? " · talent " + v.nodes[id].need.talent : ""), s === "owned" ? (n.tier === "crown" ? "#FFE39A" : "#ffffff") : "#aab3d9", SKY_FONT[n.tier], s === "glimpse" || s === "gated" ? 0.55 : 1]);
  }
  // the creature's own star at the center
  star(X(0), Y(0), SKY_SIZE.core * (1.2 + 0.1 * Math.sin(ts / 500)), "#ffffff", 0.9 * ease);
  ctx.globalCompositeOperation = "source-over";
  // flare particles when a star is lit
  sky.parts = sky.parts.filter(q => {
    const age = (ts - q.t) / 1000; if (age < 0) return true; if (age > 1) return false;
    ctx.globalAlpha = (1 - age) * ease; ctx.fillStyle = q.col;
    ctx.beginPath(); ctx.arc(X(q.x + q.vx * age), Y(q.y + q.vy * age), 1.8 * (1 - age) + 0.6, 0, 6.28); ctx.fill();
    return true;
  });
  if (sky.flare && ts >= sky.flare.t && ts < sky.flare.t + 700) {
    const p = P[sky.flare.id], k = (ts - sky.flare.t) / 700;
    ctx.globalCompositeOperation = "lighter"; star(X(p.x), Y(p.y), 6 + 26 * k, skyColor(N[sky.flare.id]), (1 - k) * 0.9); ctx.globalCompositeOperation = "source-over";
  }
  if (sky.sel) {
    const p = P[sky.sel], r = 14 + 2 * Math.sin(ts / 300);
    ctx.globalAlpha = 0.9; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -ts / 60;
    ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), r, 0, 6.28); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.textAlign = "center"; ctx.lineJoin = "round";
  for (const [x, y, text, col, size, a] of labels) {
    ctx.font = `700 ${size}px Manrope, system-ui, sans-serif`;
    ctx.globalAlpha = a * ease; ctx.strokeStyle = "rgba(6,8,24,.85)"; ctx.lineWidth = 4; ctx.strokeText(text, x, y); ctx.fillStyle = col; ctx.fillText(text, x, y);
  }
  ctx.globalAlpha = 1;
}
function treeReady(c) {
  if (!c || !c.st || !c.alive(today()) || "keluar" in c.info) return false;
  const v = Tree.view(c, game.home, today());
  return Object.values(v.nodes).some(n => n.s === "open" && n.cost <= v.points);
}

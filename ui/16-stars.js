// ---- talent constellations: the star map inside the book (Buku Bintang, ui/40-book.js). Every talent is a star;
// writing one in draws the line to it. Before the reading at day 30 the map is a pencil sketch, after it gold ink on parchment.
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
  skyLay = { P };
  return skyLay;
}
const skyColor = n => n.tier === "combo" ? "#6A4A9A" : n.tier === "secret" ? "#8A6410" : n.tier === "crown" ? "#9A6E1C" : ({ body: "#3E7A4E", mind: "#3B5F98", spark: "#B05A20", heart: "#A84A66" })[n.root];
function skyFit() {
  const { P } = layoutSky(), W = sky.cv.clientWidth, H = sky.cv.clientHeight, ps = Object.values(P);
  const x0 = Math.min(...ps.map(p => p.x)) - 30, x1 = Math.max(...ps.map(p => p.x)) + 30, y0 = Math.min(...ps.map(p => p.y)) - 30, y1 = Math.max(...ps.map(p => p.y)) + 30;
  const top = 96, bottom = 120, s = Math.min(W / (x1 - x0), (H - top - bottom) / (y1 - y0));
  return { s, ox: W / 2 - (x0 + x1) / 2 * s, oy: top + (H - top - bottom) / 2 - (y0 + y1) / 2 * s };
}
function showTree(id = cur && cur.id, back = null, spread = false) {
  const c = game.home.get(id); if (!c || !c.st) return;
  closeSheet(); Tele.layar("app", "stars");
  if (sky) sky.el.remove();
  // peta bintang di dalam buku: sebelum malam pembacaan masih sketsa pensil, sesudahnya perkamen bertinta emas
  const skin = Rasi.isRead(c.born, today()) ? "ink" : "pencil", star = Rasi.starOf(c.st);
  const el = document.createElement("div"); el.className = `sky book ${skin}`; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", `${c.name}'s star map`);
  el.innerHTML = `<canvas></canvas>
    <div class="sky-top"><button class="sky-x" aria-label="${back ? "Back" : "Close"}">${back ? "‹" : "✕"}</button>
      <div class="sky-title"><span class="sky-kicker">${skin === "ink" ? "Born under" : "Notebook"}</span><b>${esc(skin === "ink" ? star.name : c.name)}</b><small id="skySub"></small></div>
      <div class="sky-pts"><b id="skyPts">0</b><small>${skin === "ink" ? "ink" : "points"}</small></div></div>
    <div class="sky-panel" id="skyPanel"></div>
    <div class="sky-zoom"><button data-z="0.7" aria-label="Zoom in">+</button><button data-z="1.4" aria-label="Zoom out">−</button></div>`;
  (PH ? PH.screen : $("app")).appendChild(el);
  const cv = el.querySelector("canvas");
  // jalur panggilan (sesudah malam kedua): dari panggilan sampai ke inti, digambar lebih tebal
  const call = Rasi.stage(c.born, today()) === "called" ? Rasi.callingOf(c.st, Tree.NODES) : null, callPath = new Set();
  for (let k = call; k; k = (Tree.NODES[k].req[0] || (Tree.NODES[k].reqAny || []).find(r => c.st.tree.have.includes(r)))) callPath.add(k);
  sky = { el, cv, ctx: cv.getContext("2d"), c, back, skin, star, callPath, sel: null, cam: null, t0: performance.now(), anims: [], parts: [], v: null, raf: 0, closing: 0,
    spread: spread && skin === "ink" ? { t: performance.now() + 900, d: 3600 } : null };
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
  $("skyPts").textContent = v.points; $("skyPts").parentElement.hidden = ilmuOn();
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
    const verb = sky.skin === "pencil" ? "write it in" : "ink it";
    if (ilmuOn()) {   // v82: nggak ada poin lagi, bintang nyala sendiri dari ilmu (ilmu.js)
      panel.innerHTML = `<p class="sky-hint">Stars light up on their own as ${esc(c.name)} learns.</p><small class="sky-meta">A topic lights at 10, a class at Intermediate (25), a job at Senior (55), a legend at Master (85). Classes and what ${esc(c.name)} chooses to do each day are what move them. Tap a star to see where ${esc(c.name)} is on that path.</small>${c.age(today()) >= Ilmu.MIN_AGE ? `<button class="sky-diary" id="skyLesAll">Classes</button>` : ""}`;
      const la = $("skyLesAll"); if (la) la.onclick = () => { closeSky(); showLes(c.id); };
      return;
    }
    panel.innerHTML = `<p class="sky-hint">${v.points ? `Tap a red star to ${verb}.` : `Points come from growing up, practice and big moments.`}</p>
      <small class="sky-meta">${v.parts.age} from growing up · ${v.parts.practice} from practice · ${v.parts.moments} from big moments · ${v.parts.mastery} from mastery</small>${L ? `<small class="sky-meta">Family path from ${esc(L.from)}: ${L.path.map(id => esc(Tree.NODES[id].label)).join(" → ")}. Each star on it costs 1 point less.</small>` : ""}<button class="sky-diary" id="skyDiary">Family diary</button>`;
    $("skyDiary").onclick = () => { closeSky(); showDiary(); };
    return;
  }
  panel.style.animation = "none"; void panel.offsetWidth; panel.style.animation = "";
  const n = Tree.info(sky.sel), st = v.nodes[sky.sel], col = skyColor(n);
  if (st.s === "hidden") { panel.innerHTML = `<span class="sky-chip" style="--c:#8A6A3A">Fog</span><h3>Not seen yet</h3><p>${n.tier === "secret" ? "Something is hiding here." : "Learn a star next to it to see what it is."}</p>`; return; }
  if (st.s === "secret") { panel.innerHTML = `<span class="sky-chip" style="--c:#8A6410">Hidden star</span><h3>A secret</h3><p>${esc(n.hint)}</p>`; return; }
  const missing = n.req.filter(r => v.nodes[r].s !== "owned").map(r => N[r].label);
  const erase = st.s === "owned" && alive && c.id === cur.id && canCare() && Tree.canErase(c, sky.sel, today());
  const need = st.need, sk = need && Status.SKILL_LABEL[need.skill];
  const why = st.s === "owned" ? `${sky.skin === "pencil" ? "Written" : "Inked"} on ${fmtDate(st.day)}.` : !alive ? "This life is over." : st.s === "glimpse" ? `Learn ${missing.join(" and ")} first.`
    : st.s === "gated" ? `Needs ${sk} talent ${need.talent}. ${esc(c.name)} has ${need.has}.${need.talent - need.has === 1 ? ` Reaching ${sk} 90 counts as one more.` : ""}` : st.cost > v.points ? `Needs ${st.cost} points. ${esc(c.name)} has ${v.points}.` : c.id !== cur.id ? `Go to ${esc(c.name)} first.` : !canCare() ? "Not right now." : "";
  panel.innerHTML = `<div class="sky-row"><span class="sky-chip" style="--c:${col}">${n.tierLabel}</span><small>${n.share} of creatures</small></div>
    <h3>${esc(n.label)}</h3>${n.d ? `<p>${esc(n.d)}</p>` : ""}
    ${n.gate ? `<small class="sky-meta">Needs ${Status.SKILL_LABEL[N[n.root].skill]} talent ${n.gate}+${n.gate < 9 ? " (skill 90 counts as +1)" : ""}</small>` : ""}
    ${n.tier === "combo" ? `<small class="sky-meta">Joins ${esc(n.req.map(r => N[r].label).join(" + "))}</small>` : ""}
    ${v.legacy && v.legacy.path.includes(sky.sel) ? `<small class="sky-meta">Family star, from ${esc(v.legacy.from)}</small>` : ""}
    <ul>${n.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
    ${skyBend(sky.sel, v)}${skyCrowd(sky.sel)}
    ${st.s === "owned" ? `<small class="sky-meta">${why}</small>${erase ? `<button class="sky-go erase" id="skyErase"><i></i><span>Hold to erase · ${Tree.refundOf(c, sky.sel)} pt${Tree.refundOf(c, sky.sel) === 1 ? "" : "s"} back</span></button><small class="sky-meta">Pencil rubs out until the stars read the book.</small>` : ""}` : `<button class="sky-go" id="skyGo" ${why ? "disabled" : ""}><i></i><span>Hold to ${sky.skin === "pencil" ? "write it in" : "ink it"} · ${st.cost} pt${st.cost === 1 ? "" : "s"}</span></button>${why ? `<small class="sky-meta">${why}</small>` : ""}`}`;
  if (ilmuOn()) {   // v82: angka jalur dan minat tinggal di sini (buku skill dihapus), tanpa tombol tinta/hapus
    const I = Ilmu.il(c.st), LV = { field: [10, "a topic"], spec: [25, "Intermediate"], niche: [55, "Senior"], legend: [85, "Master"] }[n.tier];
    const node = n.tier === "legend" ? n.req[0] : sky.sel, now = LV ? Math.round(Ilmu.eff(I, node)) : null, K = Ilmu.COURSES[node];
    panel.querySelectorAll("#skyGo, #skyErase").forEach(e => e.remove());
    panel.querySelectorAll(".sky-meta").forEach(e => { if (/Pencil rubs out|Needs \d+ points/.test(e.textContent)) e.remove(); });
    const tier = now != null ? Ilmu.TIER[now >= 85 ? 3 : now >= 55 ? 2 : now >= 25 ? 1 : 0] : "";
    const where = LV ? (st.s === "owned" ? `${esc(c.name)} is at ${now} on this path · ${tier}.` : `Lights up on its own at ${LV[0]} (${LV[1]}). ${esc(c.name)} is at ${now} on this path.`)
      : st.s === "owned" ? "" : n.tier === "combo" ? "Lights up on its own once both stars it joins are lit." : n.reqAny ? "Lights up on its own after a star below it, if the talent is there." : "Lights up on its own when the time comes.";
    const mi = K && I.minat[K.field] != null ? `${esc(c.name)} on ${esc(N[K.field].label)}: ${Ilmu.MINAT_WORD(I.minat[K.field])}${I.ucap && I.ucap.field === K.field ? ` · “${esc(I.ucap.tx)}”` : ""}` : "";
    panel.insertAdjacentHTML("beforeend", `${where ? `<small class="sky-meta">${where}</small>` : ""}${mi ? `<small class="sky-meta">${mi}</small>` : ""}${K && alive && c.age(today()) >= Ilmu.MIN_AGE ? `<button class="sky-diary" id="skyLes">${esc(K.name)} classes</button>` : ""}`);
    const lb = $("skyLes"); if (lb) lb.onclick = () => { closeSky(); showLes(c.id); };
    return;
  }
  const go = $("skyGo"); if (go) skyHold(go, skyLight);
  const er = $("skyErase"); if (er) skyHold(er, skyErase);
}
// jalan belok: crossroads yang tumbuh dari bintang ini, jadi tinta di sini tidak terbuang kalau mau pindah arah
function skyBend(id, v) {
  const N = Tree.NODES; if (v.nodes[id].s !== "owned") return "";
  const ways = Tree.ORDER.filter(k => N[k].tier === "combo" && N[k].req.includes(id)).slice(0, 3);
  if (!ways.length) return "";
  return `<small class="sky-meta sky-bend">Can bend toward ${ways.map(k => `<b>${esc(N[k].label)}</b> (with ${esc(N[k].req.filter(r => r !== id).map(r => N[r].label).join(" + "))})`).join(", ")}.</small>`;
}
// keadaan kota sekarang untuk pekerjaan di bintang ini (career.js), hanya yang sudah terjadi
function skyCrowd(id) {
  const jobs = Object.keys(Tree.NODES[id].fx.job || {}); if (!jobs.length || !Career.crowd) return "";
  const cz = Career.crowd(jobs[0], today()); if (cz.id === "steady") return "";
  return `<small class="sky-meta sky-crowd ${cz.id}">${cz.id === "needed" ? `Old Town is short on people in ${esc(BW_IND[jobs[0]].toLowerCase())} right now.` : `Lots of newcomers in ${esc(BW_IND[jobs[0]].toLowerCase())} right now.`}</small>`;
}
function skyErase() {
  const id = sky.sel, c = sky.c;
  if (!game.act(c.id, "hapus:" + id)) return;
  save(); refresh(true); sky.sel = null; skyRefresh();
}
function skyHold(btn, done) {
  let raf = 0, t0 = 0;
  const stop = () => { cancelAnimationFrame(raf); raf = 0; btn.style.setProperty("--p", 0); };
  btn.onpointerdown = e => { if (btn.disabled) return; e.preventDefault(); t0 = performance.now();
    const tick = t => { const k = Math.min(1, (t - t0) / 800); btn.style.setProperty("--p", k); if (k < 1) raf = requestAnimationFrame(tick); else { raf = 0; done(); } };
    raf = requestAnimationFrame(tick); };
  btn.onpointerup = btn.onpointerleave = btn.onpointercancel = () => { if (raf) stop(); };
  btn.onclick = e => { if (e.detail === 0) done(); }; // Enter/Space
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
  const { ctx, cv, dpr } = sky, W = cv.clientWidth, H = cv.clientHeight;
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
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  {
    const sp = sky.spread;
    if (sp && ts < sp.t + sp.d) {
      // malam pembacaan: tinta emas merembes dari bintang si makhluk ke seluruh peta
      skyPaper(ts, cam, "pencil", ease, false);
      const k = Math.max(0, (ts - sp.t) / sp.d), e = k * k * (3 - 2 * k), x0 = cam.ox, y0 = cam.oy, far = 1.15 * Math.max(Math.hypot(x0, y0), Math.hypot(W - x0, y0), Math.hypot(x0, H - y0), Math.hypot(W - x0, H - y0));
      ctx.save(); ctx.beginPath();
      for (let i = 0; i <= 48; i++) { const a = i / 48 * 6.283, w = 1 + 0.08 * Math.sin(a * 5 + ts / 400) + 0.05 * Math.sin(a * 11), r = e * far * w; ctx.lineTo(x0 + Math.cos(a) * r, y0 + Math.sin(a) * r); }
      ctx.closePath(); ctx.clip(); skyPaper(ts, cam, "ink", ease, true); ctx.restore();
    } else { sky.spread = null; skyPaper(ts, cam, sky.skin, ease, true); }
    return;
  }
}

// ---- peta di buku: perkamen bertinta (sesudah umur 30) atau buku catatan pensil (sebelumnya)
const SKY_INK = {
  ink: { paper0: "#F2E2B8", paper1: "#E2C690", paper2: "#B8955A", line: "#B8862A", own: "#D9A93E", ownS: "#5A3A0E", hi: "#FFF3D0", open: "#7A1E14", fog: "#8A6A3A", txt: "#3A2410", halo: "rgba(240,224,180,.92)", font: "Cinzel, Georgia, serif", w: 700, fs: 1 },
  pencil: { paper0: "#F3EFE6", paper1: "#EEE8DC", paper2: "#E2DACB", line: "#57534C", own: "#6A665E", ownS: "#3A3833", hi: "#F3EFE6", open: "#3A3833", fog: "#9A968E", txt: "#3A3833", halo: "rgba(243,239,230,.92)", font: "Caveat, cursive", w: 600, fs: 1.3 },
};
const skyDia = (ctx, x, y, r) => { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); };
const skySpk = (ctx, x, y, r, q = 0.22) => { const k = r * q; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + k, y - k, x + r, y); ctx.quadraticCurveTo(x + k, y + k, x, y + r); ctx.quadraticCurveTo(x - k, y + k, x - r, y); ctx.quadraticCurveTo(x - k, y - k, x, y - r); ctx.closePath(); };
const skyFigs = {};
function skyPaper(ts, cam, skin, ease, main) {
  const { ctx, cv, v } = sky, W = cv.clientWidth, H = cv.clientHeight, N = Tree.NODES, { P } = layoutSky(), C = SKY_INK[skin];
  const X = x => x * cam.s + cam.ox, Y = y => y * cam.s + cam.oy, zoom = cam.s / sky.fit.s, S = id => v.nodes[id].s;
  // kertas
  const bg = ctx.createRadialGradient(X(0), Y(0), 0, X(0), Y(0), Math.max(W, H) * 1.2);
  bg.addColorStop(0, C.paper0); bg.addColorStop(0.55, C.paper1); bg.addColorStop(1, C.paper2);
  ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (skin === "pencil") { ctx.strokeStyle = "#CFC8BA"; ctx.lineWidth = 1; const g = 26, off = ((cam.oy % g) + g) % g; ctx.beginPath(); for (let y = off; y < H; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke(); }
  // bintang besar empat sudut: logonya sekaligus bentuk peta; tiap sudut satu akar
  ctx.globalAlpha = 0.9 * ease; ctx.beginPath();
  const R = 1150, q = 0.3; ctx.moveTo(X(0), Y(-R * 1.32)); ctx.quadraticCurveTo(X(R * q), Y(-R * q * 1.32), X(R), Y(0)); ctx.quadraticCurveTo(X(R * q), Y(R * q * 1.32), X(0), Y(R * 1.32)); ctx.quadraticCurveTo(X(-R * q), Y(R * q * 1.32), X(-R), Y(0)); ctx.quadraticCurveTo(X(-R * q), Y(-R * q * 1.32), X(0), Y(-R * 1.32)); ctx.closePath();
  ctx.fillStyle = skin === "ink" ? "rgba(90,58,24,.05)" : "rgba(0,0,0,0)"; ctx.fill();
  ctx.strokeStyle = skin === "ink" ? "rgba(90,58,24,.22)" : "rgba(87,83,76,.28)"; ctx.lineWidth = 1.6; ctx.setLineDash(skin === "ink" ? [] : [7, 9]); ctx.stroke(); ctx.setLineDash([]);
  // garis: yang sudah dipelajari bertinta, yang bisa dibuka putus-putus merah, sisanya tidak digambar
  const animating = new Set(sky.anims.map(a => a.to)), wz = Math.max(0.8, Math.min(1.6, zoom * 0.7));
  const line = (a, b, col, w, alpha, dash, prog = 1) => { ctx.globalAlpha = alpha * ease; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(a.x + (b.x - a.x) * prog), Y(a.y + (b.y - a.y) * prog)); ctx.stroke(); };
  for (const id of Tree.ORDER) {
    const n = N[id], s = S(id);
    for (const r of skyReqs(n)) {
      const rs = r === "core" ? "owned" : S(r);
      if (s === "owned" && rs === "owned" && !animating.has(id)) { const cp = sky.callPath.has(id) && (r === "core" || sky.callPath.has(r)); if (cp) line(P[r], P[id], "#8E1F1C", 6 * wz, 0.25, null); line(P[r], P[id], C.line, (cp ? 4 : 2.6) * wz, 0.95, null); }
      else if ((s === "open" || s === "glimpse" || s === "gated") && rs === "owned") line(P[r], P[id], s === "open" ? C.open : C.fog, 1.2 * wz, s === "open" ? 0.6 : 0.4, [4, 5]);
    }
  }
  ctx.setLineDash([]);
  const anims = sky.anims.filter(a => { const k = Math.min(1, (ts - a.t) / 900); line(P[a.from], P[a.to], C.line, 3.4 * wz, 1, null, k); return k < 1; });
  if (main) sky.anims = anims;
  // titik
  const labels = [];
  for (const id of Tree.ORDER) {
    const n = N[id], s = S(id), p = P[id], x = X(p.x), y = Y(p.y);
    if (x < -60 || y < -60 || x > W + 60 || y > H + 60) continue;
    const tw = 0.5 + 0.5 * Math.sin(ts / 600 + skyHash(id) * 6.28), base = SKY_SIZE[n.tier] * Math.max(0.9, Math.min(2, zoom * 0.7)) * 1.25;
    const big = ["root", "niche", "combo", "secret", ...SKY_OUTER].includes(n.tier);
    if (s === "hidden") { ctx.globalAlpha = 0.3 * ease; ctx.fillStyle = C.fog; ctx.fillRect(x - 1, y - 1, 2, 2); continue; }
    if (s === "secret") { ctx.globalAlpha = (0.25 + 0.3 * tw) * ease; ctx.fillStyle = C.fog; ctx.font = `${C.w} ${12 * C.fs}px ${C.font}`; ctx.textAlign = "center"; ctx.fillText("?", x, y + 4); continue; }
    const pending = animating.has(id) || (sky.flare && sky.flare.id === id && ts < sky.flare.t);
    if (s === "owned" && !pending) {
      if (skin === "ink") { const g = ctx.createRadialGradient(x, y, 0, x, y, base * 3); g.addColorStop(0, "rgba(255,233,168,.75)"); g.addColorStop(1, "rgba(255,233,168,0)"); ctx.globalAlpha = ease; ctx.fillStyle = g; ctx.fillRect(x - base * 3, y - base * 3, base * 6, base * 6); }
      ctx.globalAlpha = ease; (big ? skySpk(ctx, x, y, base * (n.tier === "root" ? 1.35 : 1.7), 0.26) : skyDia(ctx, x, y, base * 1.25)); ctx.fillStyle = C.own; ctx.fill(); ctx.strokeStyle = C.ownS; ctx.lineWidth = 1.2; ctx.stroke();
      skyDia(ctx, x, y, base * 0.45); ctx.fillStyle = C.hi; ctx.fill();
    } else {
      const aff = s === "open" && v.nodes[id].cost <= v.points && !ilmuOn(), dim = s === "glimpse" || s === "gated";
      ctx.globalAlpha = (dim ? 0.4 : s === "open" ? 0.95 : 0.6) * ease; (big ? skySpk(ctx, x, y, base * (n.tier === "root" ? 1.15 : 1.4), 0.26) : skyDia(ctx, x, y, base * 1.05));
      ctx.fillStyle = C.hi; ctx.fill(); ctx.strokeStyle = s === "open" ? C.open : C.fog; ctx.lineWidth = 1.4; ctx.stroke();
      if (aff) { ctx.globalAlpha = (0.35 + 0.55 * tw) * ease; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(x, y, base * 2.4, 0, 6.28); ctx.stroke(); ctx.setLineDash([]); }
    }
    const known = s === "owned" || s === "open";
    const show = n.tier === "root" || id === sky.sel || (known && (n.tier === "field" || zoom > 1.25)) || ((n.tier === "field" || n.tier === "icon" || n.tier === "crown") && zoom > 1.25) || zoom > 2;
    if (show) labels.push({ id, x, y: y + base * 1.9 + 4, text: n.label + (s === "gated" ? " · talent " + v.nodes[id].need.talent : ""), col: s === "owned" ? C.txt : s === "open" ? C.open : C.fog, size: SKY_FONT[n.tier] * C.fs, a: s === "glimpse" || s === "gated" ? 0.6 : 1,
      rank: id === sky.sel ? 0 : n.tier === "root" ? 1 : s === "owned" ? 2 : s === "open" ? 3 : 4 });
  }
  // pusat: bintang si makhluk (sosok rasinya kalau sudah dibaca, tanda tanya kalau belum)
  const cx = X(0), cy = Y(0), cr = 20 * Math.max(0.9, Math.min(2, zoom * 0.7));
  ctx.globalAlpha = ease; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 6.28); ctx.fillStyle = skin === "ink" ? "#FFF3D0" : C.hi; ctx.fill(); ctx.strokeStyle = skin === "ink" ? "#B8862A" : C.line; ctx.lineWidth = 1.6; ctx.stroke();
  skySpk(ctx, cx, cy, cr * 1.5); ctx.stroke();
  if (skin === "ink") { const f = sky.star.fig, path = skyFigs[f] || (skyFigs[f] = new Path2D(BK_FIG[f])); ctx.save(); ctx.translate(cx - cr * 0.72, cy - cr * 0.72); ctx.scale(cr * 0.0144, cr * 0.0144); ctx.strokeStyle = "#5A3A0E"; ctx.lineWidth = 5; ctx.lineCap = ctx.lineJoin = "round"; ctx.stroke(path); ctx.restore(); }
  else { ctx.fillStyle = C.txt; ctx.font = `600 ${cr * 1.2}px Caveat, cursive`; ctx.textAlign = "center"; ctx.fillText("?", cx, cy + cr * 0.4); }
  // percikan tinta saat satu bintang ditulis
  const parts = sky.parts.filter(q => { const age = (ts - q.t) / 1000; if (age < 0) return true; if (age > 1) return false;
    ctx.globalAlpha = (1 - age) * ease; ctx.fillStyle = skin === "ink" ? "#B8862A" : C.line; ctx.beginPath(); ctx.arc(X(q.x + q.vx * age * 0.6), Y(q.y + q.vy * age * 0.6), 2 * (1 - age) + 0.6, 0, 6.28); ctx.fill(); return true; });
  if (main) sky.parts = parts;
  if (sky.sel) { const p = P[sky.sel], r = 18 + 2 * Math.sin(ts / 300); ctx.globalAlpha = 0.9; ctx.strokeStyle = C.open; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -ts / 60; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), r, 0, 6.28); ctx.stroke(); ctx.setLineDash([]); }
  // nama: yang penting dulu, yang bertabrakan dilewati
  labels.sort((a, b) => a.rank - b.rank);
  const taken = []; ctx.textAlign = "center"; ctx.lineJoin = "round";
  for (const L of labels) {
    ctx.font = `${C.w} ${L.size}px ${C.font}`; const w = ctx.measureText(L.text).width, box = [L.x - w / 2 - 3, L.y - L.size, L.x + w / 2 + 3, L.y + 4];
    if (taken.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    taken.push(box);
    ctx.globalAlpha = L.a * ease; ctx.strokeStyle = C.halo; ctx.lineWidth = 4; ctx.strokeText(L.text, L.x, L.y); ctx.fillStyle = L.col; ctx.fillText(L.text, L.x, L.y);
  }
  ctx.globalAlpha = 1;
}
function treeReady(c) {
  if (!c || !c.st || !c.alive(today()) || "keluar" in c.info || ilmuOn()) return false;
  const v = Tree.view(c, game.home, today());
  return Object.values(v.nodes).some(n => n.s === "open" && n.cost <= v.points);
}

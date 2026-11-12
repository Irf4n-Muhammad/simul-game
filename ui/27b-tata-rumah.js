// ---- Tata Rumah: mode bangun (denah.js + ui/03c-denah.js). Ketuk nama ruangan buat masuk.
// Diskusi 10 Nov: "literally like the sims, ukuran ruangan yang beda2". Seluruh rumah kelihatan dari atas, melintang (seperti mode
// dekor tahap 1: Android layar penuh + kunci miring lewat ktLock, kalau nggak bisa #app diputar 90° lewat CSS .pb-rot).
// Panel kanan punya empat alat: Rooms (geser, tarik sisi, tambah, hapus, ganti jenis), Furniture (taruh, geser, putar, simpan, beli),
// Doors (pintu dan jendela), Paint (cat per ruangan). Semua perubahan cuma draf sampai Save: denah dikirim sebagai satu aksi.
const PB_KIND_LBL = { fungsi: "Useful", hias: "Decor", dua: "Useful + decor" };
const pbC = n => `${Math.round(n).toLocaleString("en")} C`;
const pbLike = (v, n) => v > 0 ? ` <i class="pb-like">♥ ${esc(n)}</i>` : v < 0 ? ` <i class="pb-meh">${esc(n)}: meh</i>` : "";
function pbCreature() { return cur && game ? game.home.get(cur.id) : null; }
let PB_MODE = false;
const PB_PANEL = 0.42;   // bagian lebar layar buat panel
const PB_VIEW = { zoom: 1, px: 0, pz: 0 };
function pbOrient() { app.classList.toggle("pb-rot", PB_MODE && window.innerHeight > window.innerWidth * 1.05); }
function enterDecor() {
  if (PB_MODE) return;
  PB_MODE = true; app.classList.add("pb-mode"); ktLock(); pbOrient(); if (K) K.root.visible = false;
  Object.assign(PB_VIEW, { zoom: 1, px: 0, pz: 0 });
  houseSync(); resize();
  Tele.ev("perabot", { a: "mode", rot: app.classList.contains("pb-rot") ? 1 : 0 });
}
function exitDecor() {
  if (!PB_MODE) return;
  PB_MODE = false; BD.plan = null; DN_DRAFT = null; bdOverlay();
  app.classList.remove("pb-mode", "pb-rot"); ktUnlock(); camera.clearViewOffset();
  houseSync(); setRoom(Math.min(roomIx, ROOMS.length - 1), true);
}
// kamera mode bangun: dari atas agak miring, seluruh kavling muat di bagian kiri (panel di kanan). Geser satu jari, cubit dua jari.
function pbCamera(w, h) {
  const lot = DN_LOT(), hw = lot[0] * CELL / 2 + 0.8, hd = lot[1] * CELL / 2 + 0.8, left = w * (1 - Math.min(PB_PANEL, 400 / w));
  camera.fov = 38;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), el = 1.05;   // sudut pandang ~60°
  const dist = Math.max(hw / (t * (left / h)), hd * 1.15 / t) / PB_VIEW.zoom;
  const look = new THREE.Vector3(PB_VIEW.px, 0, PB_VIEW.pz + hd * 0.08);
  camera.position.set(look.x, look.y + dist * Math.sin(el), look.z + dist * Math.cos(el));
  camera.lookAt(look);
  camera.setViewOffset(w, h, (w - left) / 2, 0, w, h);
  camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------- keadaan editor
const BD = { plan: null, tool: "rooms", sel: null, door: "door", drag: null, msg: null, said: null, last: 0, hover: null };
const bdLot = () => Denah.lotOf(game.home);
const bdErrs = () => Denah.check(BD.plan, { lot: bdLot(), own: Denah.own(game.home) });
function bdOwnLeft() {
  const own = Denah.own(game.home), used = Denah.countIn(BD.plan), out = {};
  for (const id of Object.keys(own)) { const n = own[id] - (used[id] || 0); if (n > 0) out[id] = n; }
  return out;
}
const bdItemRoom = k => { const it = BD.plan.I[k], m = Denah.meta(it[0]), c = Denah.cellsOf(m, it)[0]; return Denah.roomAt(BD.plan, c[0], c[1]); };
// ruangan kerja: yang dipilih, atau ruangan tempat barang terpilih, atau yang terakhir dipilih
function bdRoom() {
  if (BD.sel && BD.sel.k === "room") return BD.sel.i;
  if (BD.sel && BD.sel.k === "item") { const r = bdItemRoom(BD.sel.i); if (r >= 0) return r; }
  return BD.last < BD.plan.R.length ? BD.last : 0;
}
// tiap perubahan: jendela yang jadi dinding dalam dan pintu yang nggak nempel dinding lagi ikut hilang (seperti di game bangun rumah)
function bdChanged() {
  const pl = BD.plan, side = k => Denah.sidesOf(Denah.parseEdge(k)).map(([x, z]) => Denah.roomAt(pl, x, z));
  // sayap selalu ikut jenis induknya
  pl.R.forEach(r => { if (r.length > 5 && pl.R[r[5]]) r[0] = pl.R[r[5]][0]; });
  const inside = v => v >= 0 && !Denah.OUTDOOR(pl.R[v][0]), open = v => v < 0 || Denah.OUTDOOR(pl.R[v][0]);
  pl.N = pl.N.filter(k => { const [a, b] = side(k); return (inside(a) && open(b)) || (inside(b) && open(a)); });
  pl.D = pl.D.filter(k => { const [a, b] = side(k); return a !== b; });
  DN_DRAFT = pl; houseSync(); bdOverlay();
}

// ---------------------------------------------------------------- garis bantu di 3D (ikut LOT_G supaya posisinya sama)
let BD_G = null;
function bdOverlay() {
  if (BD_G) { dnDispose(BD_G); BD_G = null; }
  if (!PB_MODE || !BD.plan) return;
  BD_G = new THREE.Group(); LOT_G.add(BD_G); BD_G.position.y = 0.04;
  // garis tebal: empat batang pipih (garis WebGL cuma 1 piksel)
  const bar = (x, z, w, d, y, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), new THREE.MeshBasicMaterial({ color: col, depthTest: false })); m.position.set(x, y, z); m.renderOrder = 6; BD_G.add(m); };
  const rect = (x, z, w, d, col, y = 0.02, pad = 0, t = 0.09) => {
    const a = x * CELL + pad, b = z * CELL + pad, c = (x + w) * CELL - pad, e = (z + d) * CELL - pad;
    bar((a + c) / 2, b, c - a + t, t, y, col); bar((a + c) / 2, e, c - a + t, t, y, col); bar(a, (b + e) / 2, t, e - b, y, col); bar(c, (b + e) / 2, t, e - b, y, col);
  };
  const fill = (x, z, w, d, col, op) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w * CELL - 0.08, d * CELL - 0.08), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthTest: false })); m.rotation.x = -Math.PI / 2; m.position.set((x + w / 2) * CELL, 0.03, (z + d / 2) * CELL); m.renderOrder = 4; BD_G.add(m); };
  const errs = bdErrs(), badR = new Set(errs.filter(e => e.r != null).map(e => e.r)), badI = new Set(errs.filter(e => e.i != null).map(e => e.i));
  BD.plan.R.forEach(([, x, z, w, d], i) => { if (badR.has(i) || badR.has(Denah.rootOf(BD.plan, i))) { fill(x, z, w, d, 0xd9472e, 0.3); rect(x, z, w, d, 0xd9472e, LOW_H + 0.04, 0.12, 0.1); } });
  BD.plan.I.forEach((it, k) => { if (!badI.has(k)) return; const m = Denah.meta(it[0]); if (!m) return; const [w, d] = Denah.dims(m, it[3]); fill(it[1], it[2], w, d, 0xd9472e, 0.45); });
  const R = BD.sel && BD.sel.k === "room" ? BD.sel.i : (BD.tool === "items" || BD.tool === "paint") ? bdRoom() : -1;
  // garis keliling ruangan terpilih (induk + sayap jadi satu bentuk)
  if (R >= 0 && BD.plan.R[R]) for (const S of dnSides(BD.plan, R)) {
    const [cx, cz, sx, sz] = dnSeg(S, 0, S.n - 1), y = LOW_H + 0.06, t = 0.2;
    bar(cx, cz, S.s % 2 ? t : sx + t, S.s % 2 ? sz + t : t, y, 0xd4a853);
  }
  if (BD.sel && BD.sel.k === "item" && BD.plan.I[BD.sel.i]) {
    const it = BD.plan.I[BD.sel.i], m = Denah.meta(it[0]), [w, d] = Denah.dims(m, it[3]);
    fill(it[1], it[2], w, d, badI.has(BD.sel.i) ? 0xd9472e : 0xd4a853, 0.4); rect(it[1], it[2], w, d, 0xffffff, 0.08, 0.05, 0.07);
    // garis arah depan barang
    const [bx, bz] = BACK[it[3]], cx = (it[1] + w / 2) * CELL, cz = (it[2] + d / 2) * CELL;
    bar(cx - bx * 0.3, cz - bz * 0.3, bx ? 0.6 : 0.07, bz ? 0.6 : 0.07, 0.1, 0xffffff);
  }
  if (BD.tool === "doors" && BD.hover) {
    const e = Denah.parseEdge(BD.hover), y = 1.1;
    if (e.o === "h") bar((e.x + 0.5) * CELL, e.z * CELL, CELL, 0.18, y, 0xffffff); else bar(e.x * CELL, (e.z + 0.5) * CELL, 0.18, CELL, y, 0xffffff);
  }
}

// ---------------------------------------------------------------- sentuhan di kanvas (jadi "tampilan luar" di 08-input.js)
// titik di layar -> petak kavling (pecahan). Kalau #app diputar (.pb-rot), koordinat layar diputar balik dulu.
function bdCell(e) {
  let x, y, w, h;
  if (app.classList.contains("pb-rot")) { x = e.clientY; y = innerWidth - e.clientX; w = app.clientWidth; h = app.clientHeight; }
  else { const r = canvas.getBoundingClientRect(); x = e.clientX - r.left; y = e.clientY - r.top; w = r.width; h = r.height; }
  ndc.set(x / w * 2 - 1, -(y / h) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, dv = ray.ray.direction; if (Math.abs(dv.y) < 1e-6) return null;
  const t = -o.y / dv.y; if (t < 0) return null;
  return { fx: (o.x + dv.x * t - LOT_G.position.x) / CELL, fz: (o.z + dv.z * t - LOT_G.position.z) / CELL };
}
function bdItemAt(cx, cz) {
  let best = -1, bp = -1;
  BD.plan.I.forEach((it, k) => {
    const m = Denah.meta(it[0]); if (!m) return;
    if (!Denah.cellsOf(m, it).some(([x, z]) => x === cx && z === cz)) return;
    const p = { floor: 3, wall: 2, rug: 1 }[m.m]; if (p > bp) { bp = p; best = k; }
  });
  return best;
}
function bdEdgeAt(fx, fz) {
  const hz = Math.round(fz), vx = Math.round(fx), dh = Math.abs(fz - hz), dv = Math.abs(fx - vx);
  if (Math.min(dh, dv) > 0.38) return null;
  return dh < dv ? Denah.ek("h", Math.floor(fx), hz) : Denah.ek("v", vx, Math.floor(fz));
}
const PTR = new Map();
const BUILD = {
  get on() { return PB_MODE && !!BD.plan; },
  down(e) {
    PTR.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (PTR.size === 2) { const [a, b] = [...PTR.values()]; BD.drag = { pinch: Math.hypot(a.x - b.x, a.y - b.y), z0: PB_VIEW.zoom }; return; }
    const p = bdCell(e); if (!p) return;
    const cx = Math.floor(p.fx), cz = Math.floor(p.fz), base = { p0: p, x0: e.clientX, y0: e.clientY, px: PB_VIEW.px, pz: PB_VIEW.pz, moved: false };
    BD.drag = { kind: "pan", ...base };
    if (BD.tool === "rooms") {
      const ri = Denah.roomAt(BD.plan, cx, cz), sel = BD.sel && BD.sel.k === "room" ? BD.sel.i : -1;
      if (sel >= 0) {
        const [, x, z, w, d] = BD.plan.R[sel], near = 0.4, inX = p.fx > x - near && p.fx < x + w + near, inZ = p.fz > z - near && p.fz < z + d + near;
        const edge = !inX || !inZ ? null : Math.abs(p.fx - x) < near ? "w" : Math.abs(p.fx - (x + w)) < near ? "e" : Math.abs(p.fz - z) < near ? "n" : Math.abs(p.fz - (z + d)) < near ? "s" : null;
        if (edge) { BD.drag = { kind: "edge", edge, i: sel, R0: BD.plan.R[sel].slice(), ...base }; return; }
        if (ri === sel) { BD.drag = { kind: "room", i: sel, snap: Denah.clone(BD.plan), ...base }; return; }
      }
      if (ri >= 0) BD.drag = { kind: "tap-room", i: ri, ...base };
    } else if (BD.tool === "items") {
      const k = bdItemAt(cx, cz);
      if (k >= 0) BD.drag = { kind: "item", i: k, it0: BD.plan.I[k].slice(), ...base };
      else { const ri = Denah.roomAt(BD.plan, cx, cz); if (ri >= 0) BD.drag = { kind: "tap-room", i: ri, ...base }; }
    } else if (BD.tool === "doors") {
      const k = bdEdgeAt(p.fx, p.fz); BD.hover = k; bdOverlay();
      if (k) BD.drag = { kind: "edge-tap", e: k, ...base };
    } else if (BD.tool === "paint") {
      const ri = Denah.roomAt(BD.plan, cx, cz);
      if (ri >= 0) BD.drag = { kind: "tap-room", i: ri, ...base };
    }
  },
  move(e) {
    if (!PTR.has(e.pointerId)) return;
    PTR.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const D = BD.drag; if (!D) return;
    if (D.pinch != null) { if (PTR.size < 2) return; const [a, b] = [...PTR.values()]; PB_VIEW.zoom = Math.max(0.7, Math.min(3, D.z0 * Math.hypot(a.x - b.x, a.y - b.y) / D.pinch)); resize(); return; }
    const mx = e.clientX - D.x0, my = e.clientY - D.y0;
    if (!D.moved && Math.hypot(mx, my) < 8) return;
    D.moved = true;
    if (D.kind === "pan" || D.kind === "tap-room" || D.kind === "edge-tap") {
      if (D.kind === "edge-tap") return;
      // geser kamera ikut jari (di layar diputar, sumbunya ikut diputar)
      const rot = app.classList.contains("pb-rot"), ax = rot ? my : mx, ay = rot ? -mx : my, k = camera.position.y / Math.max(300, app.clientHeight) * 0.9;
      PB_VIEW.px = Math.max(-20, Math.min(20, D.px - ax * k)); PB_VIEW.pz = Math.max(-20, Math.min(20, D.pz - ay * k * 1.5)); resize();
      return;
    }
    const p = bdCell(e); if (!p) return;
    const dx = Math.round(p.fx - D.p0.fx), dz = Math.round(p.fz - D.p0.fz);
    if (D.kind === "edge") {
      const R = D.R0.slice();
      if (D.edge === "e") R[3] = Math.max(2, D.R0[3] + dx);
      if (D.edge === "s") R[4] = Math.max(2, D.R0[4] + dz);
      if (D.edge === "w") { const nx = Math.min(D.R0[1] + D.R0[3] - 2, D.R0[1] + dx); R[3] = D.R0[3] + D.R0[1] - nx; R[1] = nx; }
      if (D.edge === "n") { const nz = Math.min(D.R0[2] + D.R0[4] - 2, D.R0[2] + dz); R[4] = D.R0[4] + D.R0[2] - nz; R[2] = nz; }
      if (R.join() !== BD.plan.R[D.i].join()) { BD.plan.R[D.i] = R; bdChanged(); }
      return;
    }
    if (D.kind === "room") {
      const key = dx + "," + dz; if (key === D.key) return; D.key = key;
      BD.plan = bdMoveRoom(D.snap, D.i, dx, dz); bdChanged();
      return;
    }
    if (D.kind === "item") {
      const it = BD.plan.I[D.i], nx = D.it0[1] + dx, nz = D.it0[2] + dz;
      if (it[1] !== nx || it[2] !== nz) { it[1] = nx; it[2] = nz; BD.sel = { k: "item", i: D.i }; bdChanged(); }
    }
  },
  up(e) {
    PTR.delete(e.pointerId);
    const D = BD.drag; if (!D) return;
    if (D.pinch != null) { if (!PTR.size) BD.drag = null; return; }
    BD.drag = null;
    if (D.kind === "pan" && !D.moved) { BD.sel = null; bdPanel(); bdOverlay(); return; }
    if (D.kind === "tap-room" && !D.moved) { BD.sel = BD.tool === "items" ? null : { k: "room", i: D.i }; BD.last = D.i; bdPanel(); bdOverlay(); return; }
    if (D.kind === "edge-tap" && !D.moved) { bdToggleEdge(D.e); return; }
    if (D.kind === "item") { BD.sel = { k: "item", i: D.i }; const r = bdItemRoom(D.i); if (r >= 0) BD.last = r; bdPanel(); bdOverlay(); return; }
    if (D.kind === "edge") { bdFixWallItems(); bdChanged(); }
    if (D.kind === "room" || D.kind === "edge") { bdPanel(); bdOverlay(); }
  },
  cancel(e) { PTR.delete(e.pointerId); BD.drag = null; },
  wheel(e) { PB_VIEW.zoom = Math.max(0.7, Math.min(3, PB_VIEW.zoom * (e.deltaY > 0 ? 0.9 : 1.1))); resize(); },
};
// geser ruangan beserta isinya (barang di dalamnya, pintu dan jendela di dindingnya)
function bdMoveRoom(snap, i, dx, dz) {
  const pl = Denah.clone(snap), parts = Denah.partsOf(pl, i);
  const inside = (cx, cz) => parts.some(j => { const [, x, z, w, d] = snap.R[j]; return cx >= x && cx < x + w && cz >= z && cz < z + d; });
  pl.I.forEach(it => { const m = Denah.meta(it[0]); if (!m) return; const c = Denah.cellsOf(m, it)[0]; if (inside(c[0], c[1])) { it[1] += dx; it[2] += dz; } });
  const onWall = k => { const e = Denah.parseEdge(k); return Denah.sidesOf(e).some(([a, b]) => inside(a, b)); };
  const shift = k => { const e = Denah.parseEdge(k); return Denah.ek(e.o, e.x + dx, e.z + dz); };
  pl.D = pl.D.map(k => onWall(k) ? shift(k) : k); pl.N = pl.N.map(k => onWall(k) ? shift(k) : k);
  for (const j of parts) { pl.R[j][1] += dx; pl.R[j][2] += dz; }
  return pl;
}
function bdToggleEdge(k) {
  const pl = BD.plan, inD = pl.D.indexOf(k), inN = pl.N.indexOf(k);
  if (BD.door === "remove") { if (inD >= 0) pl.D.splice(inD, 1); if (inN >= 0) pl.N.splice(inN, 1); }
  else if (BD.door === "door") { if (inD >= 0) pl.D.splice(inD, 1); else { if (inN >= 0) pl.N.splice(inN, 1); pl.D.push(k); } }
  else { if (inN >= 0) pl.N.splice(inN, 1); else { if (inD >= 0) pl.D.splice(inD, 1); pl.N.push(k); } }
  BD.hover = k; bdChanged(); bdPanel();
}

// ---------------------------------------------------------------- panel kanan
const BD_TOOLS = [["rooms", "Rooms"], ["items", "Furniture"], ["doors", "Doors"], ["paint", "Paint"]];
function showDecor(msg) {
  const c = pbCreature(); if (!c) return;
  if (!BD.plan) {
    BD.plan = Denah.clone(Denah.plan(game.home)); if (!BD.plan.C) BD.plan.C = BD.plan.R.map(() => ["", ""]);
    BD.sel = { k: "room", i: Math.min(roomIx, BD.plan.R.length - 1) }; BD.last = BD.sel.i; BD.tool = "rooms";
  }
  BD.said = msg || null;
  DN_DRAFT = BD.plan;
  enterDecor();
  bdPanel(); bdOverlay();
}
function bdPanel() {
  const c = pbCreature(); if (!c || !BD.plan) return;
  const errs = bdErrs(), body = BD.tool === "rooms" ? bdRoomsHtml() : BD.tool === "items" ? bdItemsHtml(c) : BD.tool === "doors" ? bdDoorsHtml() : bdPaintHtml();
  const said = BD.said || BD.msg; BD.msg = null; BD.said = null;
  const keep = sheet.querySelector(".bd-body"), top = keep ? keep.scrollTop : 0, same = sheetKind === "decor" && keep && keep.dataset.bdtab === BD.tool;
  openSheet("decor", `<div class="pb-top"><span class="ribbon">Build</span><span class="bd-lot">Lot ${bdLot().join(" × ")}</span></div>
    <nav class="bd-tabs">${BD_TOOLS.map(([k, l]) => `<button data-tool="${k}" class="${BD.tool === k ? "on" : ""}">${l}</button>`).join("")}</nav>
    <div class="bd-body">${body}</div>
    <p class="bd-status ${said ? "say" : errs.length ? "bad" : "ok"}">${said ? esc(said) : errs.length ? `${esc(errs[0].msg)}${errs.length > 1 ? ` <small>+${errs.length - 1} more</small>` : ""}` : "Looks good. Save to move in."}</p>
    <div class="pb-foot"><button class="chip" data-bd="cancel">Cancel</button><button class="close" data-bd="save" ${errs.length ? "disabled" : ""}>Save</button></div>`);
  sheet.classList.add("clear");
  const bb = sheet.querySelector(".bd-body"); bb.dataset.bdtab = BD.tool; if (same) bb.scrollTop = top;
  bdBind(c);
}
function bdRoomsHtml() {
  const s = BD.sel && BD.sel.k === "room" ? BD.sel.i : -1, nm = Denah.names(BD.plan);
  const add = `<h3 class="pb-h">Add a room</h3><div class="bd-chips">${Denah.TYPES.map(t => `<button class="chip" data-add="${t}">+ ${esc(Denah.TYPE_NAME[t])}</button>`).join("")}</div>`;
  if (s < 0) return `<p class="pb-note">Tap a room to pick it. Drag a picked room to move it, drag its edge to resize.</p>${add}`;
  const [t, , , w, d] = BD.plan.R[s], wing = BD.plan.R.findIndex(r => r.length > 5 && r[5] === s);
  const wingHtml = wing >= 0 ? `<h3 class="pb-h">L-shape</h3><div class="bd-grid"><span>Width</span><button class="pb-nav" data-wsz="3,-1" aria-label="Narrower">−</button><b>${BD.plan.R[wing][3]}</b><button class="pb-nav" data-wsz="3,1" aria-label="Wider">+</button>
      <span>Depth</span><button class="pb-nav" data-wsz="4,-1" aria-label="Shallower">−</button><b>${BD.plan.R[wing][4]}</b><button class="pb-nav" data-wsz="4,1" aria-label="Deeper">+</button></div>
      <div class="bd-chips"><button class="chip" data-wing="flip">Move the extra part</button><button class="chip" data-wing="del">Make it square again</button></div>`
    : `<div class="bd-chips"><button class="chip" data-wing="add">Make it L-shaped</button></div>`;
  return `<h2>${esc(nm[s])} <small class="bd-size">${Denah.areaOf(BD.plan, s)} squares</small></h2>
    <p class="pb-note">Drag inside to move it (everything moves along). Drag an edge to resize.</p>
    <div class="bd-grid"><span>Width</span><button class="pb-nav" data-sz="w,-1" aria-label="Narrower">−</button><b>${w}</b><button class="pb-nav" data-sz="w,1" aria-label="Wider">+</button>
      <span>Depth</span><button class="pb-nav" data-sz="d,-1" aria-label="Shallower">−</button><b>${d}</b><button class="pb-nav" data-sz="d,1" aria-label="Deeper">+</button></div>
    ${wingHtml}${t === "tidur" ? bdBedsHtml(s) : ""}
    <h3 class="pb-h">Room type</h3><div class="bd-chips">${Denah.TYPES.map(k => `<button class="chip${k === t ? " on" : ""}" data-type="${k}">${esc(Denah.TYPE_NAME[k])}</button>`).join("")}</div>
    <div class="bd-chips"><button class="chip" data-bd="del-room" ${Denah.rootsOf(BD.plan).length <= 1 ? "disabled" : ""}>Remove room</button></div>${add}`;
}
// kamar tidur: siapa tidur di sini (denah.js sleepers). Ketuk nama = pindahkan ke kamar ini; ketuk lagi = biar diatur otomatis.
function bdBedsHtml(ri) {
  const day = today(), sl = Denah.sleepers(game.home, day, BD.plan), beds = Denah.bedsIn(BD.plan, ri), A = BD.plan.A || [];
  const ms = game.home.living(day).filter(m => m.age(day) >= 60);
  const here = ms.filter(m => sl[m.id] === ri), none = ms.filter(m => sl[m.id] === -1);
  return `<h3 class="pb-h">Who sleeps here</h3>
    <p class="pb-note">${beds} bed${beds === 1 ? "" : "s"}. A bed fits one grown-up or teen, a couple, or two little ones.${none.length ? ` <b>No bed: ${esc(none.map(m => m.name).join(", "))}</b>` : ""}</p>
    <div class="bd-chips">${ms.map(m => { const pin = A.some(a => a[0] === m.id && a[1] === ri); return `<button class="chip${here.includes(m) ? " on" : ""}" data-sleep="${esc(m.id)}" aria-pressed="${pin}">${pin ? "📌 " : ""}${esc(m.name)}</button>`; }).join("")}</div>`;
}
function bdItemsHtml(c) {
  const ri = bdRoom(), nm = Denah.names(BD.plan), t = BD.plan.R[ri][0], left = bdOwnLeft(), day = today();
  const canBuy = canCare() && Perabot.canBuy(c, day), wallet = c.st ? c.st.wallet : 0;
  let top;
  if (BD.sel && BD.sel.k === "item") {
    const x = Perabot.item(BD.plan.I[BD.sel.i][0]);
    const k = Perabot.cond(game.home, x.id), fix = !x.def && k < 100;
    top = `<div class="bd-sel"><b>${esc(x.name)}${pbLike(Perabot.likes(c, x), cur.nama)}</b><small>${esc(PB_KIND_LBL[x.kind])}${x.def ? " · came with the house" : ` · ${Perabot.condLabel(k)}${k < 100 ? ` (${Math.round(k)}%)` : ""}`}</small><p>${esc(x.note)}</p>
      ${fix ? `<div class="bd-chips"><button class="chip" data-fix="${x.id}" ${canCare() && wallet >= Perabot.repairCost(x) ? "" : "disabled"}>Repair · ${pbC(Perabot.repairCost(x))}</button></div>` : ""}
      <div class="bd-chips"><button class="chip" data-bd="rot">Rotate</button><button class="chip" data-bd="away">${x.def ? "Remove" : "Put in storage"}</button><button class="chip" data-bd="desel">Done</button></div></div>`;
  } else top = `<p class="pb-note">Drag things to move them. Tap one to rotate or put it away. New things go in <b>${esc(nm[ri])}</b>; tap a room to switch.</p>`;
  const fitsHere = x => x.room == null || x.room === t;
  const own = Object.keys(left).map(Perabot.item).filter(fitsHere);
  const defs = Perabot.ITEMS.filter(x => x.def && fitsHere(x) && Denah.meta(x.id));
  const shop = Perabot.catalog().filter(fitsHere);
  const row = (x, btn, extra = "") => `<div class="pb-item"><div><b>${esc(x.name)}${pbLike(Perabot.likes(c, x), cur.nama)}</b><small>${esc(PB_KIND_LBL[x.kind])}${extra}</small></div>${btn}</div>`;
  return `${top}
    ${own.length ? `<h3 class="pb-h">In storage</h3>${own.map(x => row(x, `<button class="chip" data-put="${x.id}">Place</button>`, ` · ${left[x.id]} left`)).join("")}` : ""}
    <h3 class="pb-h">Shop for ${esc(nm[ri])}</h3>
    ${canBuy ? `<p class="pb-note">${esc(cur.nama)} pays from their own coins: <b>${pbC(wallet)}</b></p>` : `<p class="pb-note">Buying furniture takes a grown-up's coins. ${esc(cur.nama)} can shop from the teen years.</p>`}
    ${shop.map(x => row(x, `<button class="chip pb-buy" data-buy="${x.id}" ${canBuy && wallet >= x.price ? "" : "disabled"}>${pbC(x.price)}</button>`)).join("")}
    <h3 class="pb-h">Came with the house</h3>${defs.map(x => row(x, `<button class="chip" data-put="${x.id}">Place</button>`, " · free")).join("")}`;
}
function bdDoorsHtml() {
  return `<p class="pb-note">Pick what to add, then tap a wall. Windows go on outside walls. Every room needs a way in, and the house needs a front door.</p>
    <div class="bd-chips">${[["door", "Door"], ["window", "Window"], ["remove", "Remove"]].map(([k, l]) => `<button class="chip${BD.door === k ? " on" : ""}" data-door="${k}">${l}</button>`).join("")}</div>
    <p class="pb-note">${BD.plan.D.length} doors · ${BD.plan.N.length} windows</p>`;
}
function bdPaintHtml() {
  const ri = bdRoom(), nm = Denah.names(BD.plan), C = (BD.plan.C && BD.plan.C[ri]) || ["", ""];
  return `<h2>${esc(nm[ri])}</h2><p class="pb-note">Tap a room to pick it.</p>
    <h3 class="pb-h">Walls</h3>
    <div class="pb-sw">${[null, ...PB_WALLS].map(w => `<button class="pb-swatch${(w ? w.id : "") === C[0] ? " on" : ""}" data-pw="${w ? w.id : ""}" aria-label="${w ? esc(w.name) : "Original"}" style="${w ? `background: linear-gradient(180deg, ${css(w.top)} 55%, ${css(w.low)} 55%)` : ""}">${w ? "" : "↺"}</button>`).join("")}</div>
    <h3 class="pb-h">Floor</h3>
    <div class="pb-sw">${[null, ...PB_FLOORS].map(f => `<button class="pb-swatch${(f ? f.id : "") === C[1] ? " on" : ""}" data-pf="${f ? f.id : ""}" aria-label="${f ? esc(f.name) : "Original"}" style="${f ? `background: linear-gradient(135deg, ${css(f.a)} 50%, ${css(f.b)} 50%)` : ""}">${f ? "" : "↺"}</button>`).join("")}</div>`;
}
function bdPlace(id) {
  const ri = bdRoom(), pos = Denah.findSpot(BD.plan, id, ri, bdLot());
  if (!pos) { BD.msg = `No space for that in ${Denah.names(BD.plan)[ri]}. Make some room or pick another room.`; return bdPanel(); }
  BD.plan.I.push([id, ...pos]); BD.sel = { k: "item", i: BD.plan.I.length - 1 };
  bdChanged(); bdPanel();
}
function bdBind(c) {
  const on = (s, f) => sheet.querySelectorAll(s).forEach(b => b.onclick = () => f(b));
  on("[data-tool]", b => {
    if (BD.sel && BD.sel.k === "room") BD.last = BD.sel.i;
    BD.tool = b.dataset.tool; BD.hover = null;
    if (BD.tool === "items" || BD.tool === "doors") BD.sel = null;
    if (BD.tool === "paint") BD.sel = { k: "room", i: BD.last };
    bdPanel(); bdOverlay();
  });
  on("[data-add]", b => {
    const pos = Denah.findRoomSpot(BD.plan, 3, 3, bdLot());
    if (!pos) { BD.msg = "The lot is full. Make a room smaller first."; return bdPanel(); }
    BD.plan.R.push([b.dataset.add, pos[0], pos[1], 3, 3]); BD.plan.C.push(["", ""]);
    BD.sel = { k: "room", i: BD.plan.R.length - 1 }; BD.last = BD.sel.i;
    BD.msg = "New room! Drag it next to the house, then add a door.";
    bdChanged(); bdPanel();
  });
  on("[data-sz]", b => { const [k, n] = b.dataset.sz.split(","), R = BD.plan.R[BD.sel.i], j = k === "w" ? 3 : 4; R[j] = Math.max(2, Math.min(16, R[j] + Number(n))); bdFixWallItems(); bdChanged(); bdPanel(); });
  on("[data-type]", b => { BD.plan.R[BD.sel.i][0] = b.dataset.type; if (b.dataset.type !== "tidur" && BD.plan.A) BD.plan.A = BD.plan.A.filter(a => a[1] !== BD.sel.i); bdChanged(); bdPanel(); });
  on("[data-wing]", b => {
    const ri = BD.sel.i, a = b.dataset.wing, wi = BD.plan.R.findIndex(r => r.length > 5 && r[5] === ri);
    if (a === "del" && wi >= 0) bdRemoveRows([wi]);
    else if (a === "add" || a === "flip") { const from = wi >= 0 ? BD.plan.R[wi].slice() : null; if (wi >= 0) bdRemoveRows([wi]); if (!bdAddWing(ri, from)) { if (from) { BD.plan.R.push(from); BD.plan.C.push(["", ""]); } BD.msg = "No space next to this room for an extra part."; } }
    BD.sel = { k: "room", i: ri }; bdFixWallItems(); bdChanged(); bdPanel();
  });
  on("[data-wsz]", b => { const [j, n] = b.dataset.wsz.split(",").map(Number), wi = BD.plan.R.findIndex(r => r.length > 5 && r[5] === BD.sel.i); if (wi < 0) return; BD.plan.R[wi][j] = Math.max(2, Math.min(16, BD.plan.R[wi][j] + n)); bdFixWallItems(); bdChanged(); bdPanel(); });
  on("[data-sleep]", b => {
    const id = b.dataset.sleep, ri = BD.sel.i, A = (BD.plan.A ||= []), k = A.findIndex(a => a[0] === id), pinned = k >= 0 && A[k][1] === ri;
    if (k >= 0) A.splice(k, 1);
    if (!pinned) A.push([id, ri]);
    if (!A.length) delete BD.plan.A;
    const sl = Denah.sleepers(game.home, today(), BD.plan), m = game.home.get(id);
    if (!pinned && sl[id] !== ri) BD.msg = `There's no free bed here for ${m ? m.name : "them"}. Add a bed first.`;
    bdChanged(); bdPanel();
  });
  on("[data-door]", b => { BD.door = b.dataset.door; bdPanel(); });
  on("[data-put]", b => bdPlace(b.dataset.put));
  on("[data-fix]", b => {
    const x = Perabot.item(b.dataset.fix);
    if (!game.act(cur.id, "perabot:servis:" + x.id)) { BD.msg = "Can't repair that right now."; return bdPanel(); }
    Tele.ev("perabot", { a: "servis", i: x.id }); save(); BD.msg = `${x.name} looks like new again.`; bdPanel();
  });
  on("[data-buy]", b => {
    const x = Perabot.item(b.dataset.buy);
    // dewasa bisa nolak: jawabannya muncul di panel (makhluknya lagi disembunyiin)
    const prev = game.onRefuse; let said = null; game.onRefuse = t => { said = t.quote; };
    const ok = game.act(cur.id, "perabot:beli:" + x.id); game.onRefuse = prev;
    if (!ok) { if (said) save(); BD.msg = said ? `${cur.nama}: ${said}` : "Can't buy that right now."; return bdPanel(); }
    Tele.ev("perabot", { a: "beli", i: x.id, harga: x.price }); save();
    const lk = Perabot.likes(c, x); BD.msg = `${cur.nama}: ${lk > 0 ? "Ooh, I love it!" : lk < 0 ? "Hmm... not really my thing." : "New!"}`;
    bdPlace(x.id);
  });
  on("[data-pw]", b => { BD.plan.C[bdRoom()][0] = b.dataset.pw; bdChanged(); bdPanel(); });
  on("[data-pf]", b => { BD.plan.C[bdRoom()][1] = b.dataset.pf; bdChanged(); bdPanel(); });
  on("[data-bd]", b => {
    const a = b.dataset.bd;
    if (a === "cancel") { closeSheet(); return; }
    if (a === "save") { bdSave(); return; }
    if (a === "del-room") {
      const i = BD.sel.i;
      BD.plan.I = BD.plan.I.filter(it => { const m = Denah.meta(it[0]), cc = m && Denah.cellsOf(m, it)[0]; return !(cc && Denah.roomAt(BD.plan, cc[0], cc[1]) === i); });
      bdRemoveRows(Denah.partsOf(BD.plan, i)); BD.sel = null; BD.last = 0;
    }
    if (a === "rot") { const it = BD.plan.I[BD.sel.i]; it[3] = (it[3] + 1) % 4; }
    if (a === "away") { BD.plan.I.splice(BD.sel.i, 1); BD.sel = null; }
    if (a === "desel") BD.sel = null;
    bdChanged(); bdPanel();
  });
}
// barang dinding yang dindingnya hilang (ruangan jadi L, diperkecil): cari tempat lain di ruangan yang sama, kalau nggak ada balik ke gudang
function bdFixWallItems() {
  const pl = BD.plan, lot = bdLot();
  for (let k = pl.I.length - 1; k >= 0; k--) {
    const it = pl.I[k], m = Denah.meta(it[0]); if (!m || m.m !== "wall" || Denah.fitsAt(pl, k, lot)) continue;
    const c = Denah.cellsOf(m, it)[0], ri = Denah.roomAt(pl, c[0], c[1]);
    pl.I.splice(k, 1);
    const pos = ri >= 0 ? Denah.findSpot(pl, it[0], ri, lot) : null;
    if (pos) pl.I.splice(k, 0, [it[0], ...pos]);
  }
  if (BD.sel && BD.sel.k === "item" && !pl.I[BD.sel.i]) BD.sel = null;
}
// hapus baris R (dan C) lalu betulkan indeks induk sayap dan pembagian kamar
function bdRemoveRows(rows) {
  const pl = BD.plan, gone = new Set(rows), map = [];
  let n = 0; pl.R.forEach((_, i) => { map[i] = gone.has(i) ? -1 : n++; });
  pl.R = pl.R.filter((_, i) => !gone.has(i)).map(r => r.length > 5 ? [...r.slice(0, 5), map[r[5]]] : r).filter(r => r.length === 5 || r[5] >= 0);
  pl.C = pl.C.filter((_, i) => !gone.has(i));
  if (pl.A) { pl.A = pl.A.map(([id, ri]) => [id, map[ri]]).filter(a => a[1] >= 0); if (!pl.A.length) delete pl.A; }
}
// sayap 3x3 di sisi yang masih kosong (atau pindah ke sisi berikutnya: from = sayap lama)
function bdAddWing(ri, from) {
  const pl = BD.plan, [t, x, z, w, d] = pl.R[ri], lot = bdLot(), W = from ? from[3] : 3, D = from ? from[4] : 3;
  const cand = [[x + w, z + d - D], [x + w - W, z + d], [x - W, z + d - D], [x, z + d], [x + w, z], [x - W, z], [x + w - W, z - D], [x, z - D]];
  let k0 = 0;
  if (from) { const k = cand.findIndex(([cx, cz]) => cx === from[1] && cz === from[2]); k0 = k + 1; }
  for (let n = 0; n < cand.length; n++) {
    const [nx, nz] = cand[(k0 + n) % cand.length];
    if (nx < 0 || nz < 0 || nx + W > lot[0] || nz + D > lot[1]) continue;
    if (pl.R.some(([, x2, z2, w2, d2]) => nx < x2 + w2 && x2 < nx + W && nz < z2 + d2 && z2 < nz + D)) continue;
    const r = [t, nx, nz, W, D, ri]; if (!Denah.touch(r, pl.R[ri])) continue;
    pl.R.push(r); pl.C.push(["", ""]);
    return true;
  }
  return false;
}
function bdSave() {
  if (bdErrs().length) return bdPanel();
  const kind = Denah.encode(BD.plan);
  if (Denah.saved(game.home) && Denah.encode(Denah.plan(game.home)) === kind) { closeSheet(); return; }
  const more = Denah.rootsOf(BD.plan).length > Denah.rootsOf(Denah.plan(game.home)).length;
  if (!game.act(cur.id, kind)) { BD.msg = "Couldn't save the plan."; return bdPanel(); }
  Tele.ev("perabot", { a: "denah", r: BD.plan.R.length, i: BD.plan.I.length });
  save(); closeSheet(); refresh();
  say(more ? "We have more room now!" : "Home sweet home!");
}
$("roomName").setAttribute("role", "button"); $("roomName").setAttribute("tabindex", "0"); $("roomName").setAttribute("aria-label", "Build and decorate");
$("roomName").onclick = () => { if (cur && !app.classList.contains("in-town")) showDecor(); };

// ---- tab Home di Bazaar: semua perabot, beli masuk gudang, tata lewat mode bangun.
// Tahap 3: edisi terbatas minggu ini, tiga barang bekas hari ini, dan perabot keluarga (kondisi, servis, jual; yang lama jadi vintage/antik).
function bzHome() {
  const c = bz.c, day = today(), can = canCare() && Perabot.canBuy(c, day), wallet = c.st ? c.st.wallet : 0, G = Perabot.storage(game.home);
  const toast = bz.toast; bz.toast = null;
  const P0 = game.home.world.perabot || {}, L = Perabot.limited(day), gotL = !!(P0.lim || {})[L.k];
  const sold = P0.bekas && P0.bekas.d === day ? P0.bekas.ids : [];
  const groups = {};
  for (const x of Perabot.catalog()) (groups[Perabot.where(x)] ||= []).push(x);
  const btn = (attr, price, ok) => `<button class="chip pb-buy" ${attr} ${can && ok && wallet >= price ? "" : "disabled"}>${pbC(price)}</button>`;
  const row = (x, sub, right, note = x.note) => `<div class="pb-item bz"><div><b>${esc(x.name)}${pbLike(Perabot.likes(c, x), c.name)}</b><small>${sub}</small>${note ? `<p>${esc(note)}</p>` : ""}</div>${right}</div>`;
  const kindSub = x => esc(PB_KIND_LBL[x.kind]) + (x.tags.length ? " · " + esc(Perabot.tagNames(x).join(", ")) : "") + (x.room ? " · " + esc(Perabot.where(x)) : "");
  // edisi terbatas
  const lim = `<h4 class="pb-h2">LIMITED EDITION</h4>${row(L.item, L.open ? `${gotL ? "You got one" : `One per family · ends day ${L.to}`} · ${kindSub(L.item)}` : `Next drop on day ${L.next}`,
    L.open ? (gotL ? `<span class="chip on">Yours</span>` : btn(`data-pbb="${L.id}"`, L.item.price, true)) : `<span class="chip" aria-disabled="true">Soon</span>`, L.item.note + " Worth more once the drop is over.")}`;
  // bekas hari ini
  const used = `<h4 class="pb-h2">PRE-OWNED TODAY</h4><p class="bz2-note" style="margin:4px 16px">New pieces every day. Cheaper, a little worn. Worn things work a bit less until you repair them.</p>
    ${Perabot.usedToday(day).map(u => row(u.item, `${esc(Perabot.condLabel(u.cond))} (${u.cond}%) · was ${pbC(u.item.price)} new · ${kindSub(u.item)}`,
      sold.includes(u.id) ? `<span class="chip on">Sold</span>` : btn(`data-pbu="${u.id}"`, u.price, true), "")).join("")}`;
  // perabot keluarga
  const own = Denah.own(game.home), mine = Object.keys(own).map(Perabot.item).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  const yours = mine.length ? `<h4 class="pb-h2">YOUR FURNITURE</h4>${mine.map(x => {
    const k = Perabot.cond(game.home, x.id), age = Perabot.ageLabel(game.home, x.id, day), inS = G[x.id] || 0, fix = k < 100;
    const sub = `${own[x.id]} owned${inS ? ` · ${inS} in storage` : ""} · ${esc(Perabot.condLabel(k))}${k < 100 ? ` (${Math.round(k)}%)` : ""}${age ? ` · <b class="pb-like">${age}</b>` : ""}${x.lim ? " · Limited" : ""}`;
    const right = `<span class="bd-chips" style="flex-direction:column;align-items:flex-end;margin:0">${fix ? `<button class="chip" data-pbfix="${x.id}" ${canCare() && wallet >= Perabot.repairCost(x) ? "" : "disabled"}>Repair ${pbC(Perabot.repairCost(x))}</button>` : ""}${inS ? `<button class="chip" data-pbsell="${x.id}" ${canCare() ? "" : "disabled"}>Sell ${pbC(Perabot.sellPrice(game.home, x.id, day))}</button>` : ""}</span>`;
    return row(x, sub, right, "");
  }).join("")}<p class="bz2-note" style="margin:4px 16px">Only things in storage can be sold. Furniture kept a year turns vintage, four years antique, and sells for more.</p>` : "";
  return `${toast ? `<p class="bz2-toast">${esc(toast)}</p>` : ""}<div class="bz2-intro"><h2>HOME</h2><p>Furniture for the family home. Useful pieces make care in that room work better; decor makes a room cozier, and everyone has their own taste. Things you buy wait in storage. Tap the room name at home to build and place them.</p></div>
    ${can ? "" : `<p class="bz2-note">${esc(c.name)} can buy furniture from the teen years.</p>`}
    ${lim}${used}${yours}
    ${Object.entries(groups).map(([where, xs]) => `<h4 class="pb-h2">${bzUp(where)}</h4>${xs.map(x => row(x, `${esc(PB_KIND_LBL[x.kind])}${x.tags.length ? " · " + esc(Perabot.tagNames(x).join(", ")) : ""}${G[x.id] ? ` · ${G[x.id]} in storage` : ""}`, btn(`data-pbb="${x.id}"`, x.price, true))).join("")}`).join("")}`;
}
function bzHomeBind(body) {
  const go = (kind, ok, tele) => {
    if (!game.act(cur.id, kind)) { if (!game.refused) say("Can't do that right now."); return; }
    Tele.ev("perabot", tele); save(); refresh(); bz.toast = ok; bzShow("home");
  };
  body.querySelectorAll("[data-pbb]").forEach(b => b.onclick = () => { const x = Perabot.item(b.dataset.pbb); say("Ooh, new!"); go("perabot:beli:" + x.id, `${x.name} is in storage. Tap the room name at home to place it.`, { a: "beli", i: x.id, harga: x.price }); });
  body.querySelectorAll("[data-pbu]").forEach(b => b.onclick = () => { const x = Perabot.item(b.dataset.pbu); go("perabot:bekas:" + x.id, `A pre-owned ${x.name.toLowerCase()} is in storage.`, { a: "bekas", i: x.id }); });
  body.querySelectorAll("[data-pbfix]").forEach(b => b.onclick = () => { const x = Perabot.item(b.dataset.pbfix); go("perabot:servis:" + x.id, `${x.name}: good as new.`, { a: "servis", i: x.id }); });
  body.querySelectorAll("[data-pbsell]").forEach(b => b.onclick = () => { const x = Perabot.item(b.dataset.pbsell), v = Perabot.sellPrice(game.home, x.id, today()); go("perabot:jual:" + x.id, `Sold the ${x.name.toLowerCase()} for ${pbC(v)}.`, { a: "jual", i: x.id, harga: v }); });
}

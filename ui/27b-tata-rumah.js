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
  pl.N = pl.N.filter(k => { const [a, b] = side(k); return (a < 0) !== (b < 0); });
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
  BD.plan.R.forEach(([, x, z, w, d], i) => { if (badR.has(i)) fill(x, z, w, d, 0xd9472e, 0.22); });
  BD.plan.I.forEach((it, k) => { if (!badI.has(k)) return; const m = Denah.meta(it[0]); if (!m) return; const [w, d] = Denah.dims(m, it[3]); fill(it[1], it[2], w, d, 0xd9472e, 0.45); });
  const R = BD.sel && BD.sel.k === "room" ? BD.sel.i : (BD.tool === "items" || BD.tool === "paint") ? bdRoom() : -1;
  if (R >= 0 && BD.plan.R[R]) { const [, x, z, w, d] = BD.plan.R[R]; rect(x, z, w, d, 0xd4a853, LOW_H + 0.06, 0, 0.16); }
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
    if (D.kind === "room" || D.kind === "edge") { bdPanel(); bdOverlay(); }
  },
  cancel(e) { PTR.delete(e.pointerId); BD.drag = null; },
  wheel(e) { PB_VIEW.zoom = Math.max(0.7, Math.min(3, PB_VIEW.zoom * (e.deltaY > 0 ? 0.9 : 1.1))); resize(); },
};
// geser ruangan beserta isinya (barang di dalamnya, pintu dan jendela di dindingnya)
function bdMoveRoom(snap, i, dx, dz) {
  const pl = Denah.clone(snap), [, x, z, w, d] = pl.R[i];
  const inside = (cx, cz) => cx >= x && cx < x + w && cz >= z && cz < z + d;
  pl.I.forEach(it => { const m = Denah.meta(it[0]); if (!m) return; const c = Denah.cellsOf(m, it)[0]; if (inside(c[0], c[1])) { it[1] += dx; it[2] += dz; } });
  const onWall = k => { const e = Denah.parseEdge(k); return Denah.sidesOf(e).some(([a, b]) => inside(a, b)); };
  const shift = k => { const e = Denah.parseEdge(k); return Denah.ek(e.o, e.x + dx, e.z + dz); };
  pl.D = pl.D.map(k => onWall(k) ? shift(k) : k); pl.N = pl.N.map(k => onWall(k) ? shift(k) : k);
  pl.R[i] = [pl.R[i][0], x + dx, z + dz, w, d];
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
  const [t, , , w, d] = BD.plan.R[s];
  return `<h2>${esc(nm[s])} <small class="bd-size">${w} × ${d}</small></h2>
    <p class="pb-note">Drag inside to move it (everything moves along). Drag an edge to resize.</p>
    <div class="bd-grid"><span>Width</span><button class="pb-nav" data-sz="w,-1" aria-label="Narrower">−</button><b>${w}</b><button class="pb-nav" data-sz="w,1" aria-label="Wider">+</button>
      <span>Depth</span><button class="pb-nav" data-sz="d,-1" aria-label="Shallower">−</button><b>${d}</b><button class="pb-nav" data-sz="d,1" aria-label="Deeper">+</button></div>
    <h3 class="pb-h">Room type</h3><div class="bd-chips">${Denah.TYPES.map(k => `<button class="chip${k === t ? " on" : ""}" data-type="${k}">${esc(Denah.TYPE_NAME[k])}</button>`).join("")}</div>
    <div class="bd-chips"><button class="chip" data-bd="del-room" ${BD.plan.R.length <= 1 ? "disabled" : ""}>Remove room</button></div>${add}`;
}
function bdItemsHtml(c) {
  const ri = bdRoom(), nm = Denah.names(BD.plan), t = BD.plan.R[ri][0], left = bdOwnLeft(), day = today();
  const canBuy = canCare() && Perabot.canBuy(c, day), wallet = c.st ? c.st.wallet : 0;
  let top;
  if (BD.sel && BD.sel.k === "item") {
    const x = Perabot.item(BD.plan.I[BD.sel.i][0]);
    top = `<div class="bd-sel"><b>${esc(x.name)}${pbLike(Perabot.likes(c, x), cur.nama)}</b><small>${esc(PB_KIND_LBL[x.kind])}${x.def ? " · came with the house" : ""}</small><p>${esc(x.note)}</p>
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
  on("[data-sz]", b => { const [k, n] = b.dataset.sz.split(","), R = BD.plan.R[BD.sel.i], j = k === "w" ? 3 : 4; R[j] = Math.max(2, Math.min(16, R[j] + Number(n))); bdChanged(); bdPanel(); });
  on("[data-type]", b => { BD.plan.R[BD.sel.i][0] = b.dataset.type; bdChanged(); bdPanel(); });
  on("[data-door]", b => { BD.door = b.dataset.door; bdPanel(); });
  on("[data-put]", b => bdPlace(b.dataset.put));
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
      const i = BD.sel.i, [, x, z, w, d] = BD.plan.R[i];
      BD.plan.I = BD.plan.I.filter(it => { const m = Denah.meta(it[0]), cc = m && Denah.cellsOf(m, it)[0]; return !(cc && cc[0] >= x && cc[0] < x + w && cc[1] >= z && cc[1] < z + d); });
      BD.plan.R.splice(i, 1); BD.plan.C.splice(i, 1); BD.sel = null; BD.last = 0;
    }
    if (a === "rot") { const it = BD.plan.I[BD.sel.i]; it[3] = (it[3] + 1) % 4; }
    if (a === "away") { BD.plan.I.splice(BD.sel.i, 1); BD.sel = null; }
    if (a === "desel") BD.sel = null;
    bdChanged(); bdPanel();
  });
}
function bdSave() {
  if (bdErrs().length) return bdPanel();
  const kind = Denah.encode(BD.plan);
  if (Denah.saved(game.home) && Denah.encode(Denah.plan(game.home)) === kind) { closeSheet(); return; }
  const more = BD.plan.R.length > Denah.plan(game.home).R.length;
  if (!game.act(cur.id, kind)) { BD.msg = "Couldn't save the plan."; return bdPanel(); }
  Tele.ev("perabot", { a: "denah", r: BD.plan.R.length, i: BD.plan.I.length });
  save(); closeSheet(); refresh();
  say(more ? "We have more room now!" : "Home sweet home!");
}
$("roomName").setAttribute("role", "button"); $("roomName").setAttribute("tabindex", "0"); $("roomName").setAttribute("aria-label", "Build and decorate");
$("roomName").onclick = () => { if (cur && !app.classList.contains("in-town")) showDecor(); };

// ---- tab Home di Bazaar: semua perabot, beli masuk gudang, tata lewat mode bangun
function bzHome() {
  const c = bz.c, day = today(), can = canCare() && Perabot.canBuy(c, day), wallet = c.st ? c.st.wallet : 0, G = Perabot.storage(game.home);
  const toast = bz.toast; bz.toast = null;
  const groups = {};
  for (const x of Perabot.catalog()) (groups[Perabot.where(x)] ||= []).push(x);
  return `${toast ? `<p class="bz2-toast">${esc(toast)}</p>` : ""}<div class="bz2-intro"><h2>HOME</h2><p>Furniture for the family home. Useful pieces make care in that room work better; decor makes a room cozier, and everyone has their own taste. Things you buy wait in storage. Tap the room name at home to build and place them.</p></div>
    ${can ? "" : `<p class="bz2-note">${esc(c.name)} can buy furniture from the teen years.</p>`}
    ${Object.entries(groups).map(([where, xs]) => `<h4 class="pb-h2">${bzUp(where)}</h4>${xs.map(x => {
      const lk = Perabot.likes(c, x);
      return `<div class="pb-item bz"><div><b>${esc(x.name)}${pbLike(lk, c.name)}</b><small>${esc(PB_KIND_LBL[x.kind])}${x.tags.length ? " · " + esc(Perabot.tagNames(x).join(", ")) : ""}${G[x.id] ? ` · ${G[x.id]} in storage` : ""}</small><p>${esc(x.note)}</p></div>
        <button class="chip pb-buy" data-pbb="${x.id}" ${can && wallet >= x.price ? "" : "disabled"}>${pbC(x.price)}</button></div>`;
    }).join("")}`).join("")}`;
}
function bzHomeBind(body) {
  body.querySelectorAll("[data-pbb]").forEach(b => b.onclick = () => {
    const x = Perabot.item(b.dataset.pbb);
    if (!game.act(cur.id, "perabot:beli:" + x.id)) { if (!game.refused) say("Can't do that right now."); return; }
    Tele.ev("perabot", { a: "beli", i: x.id, harga: x.price });
    save(); refresh(); say("Ooh, new!");
    bz.toast = `${x.name} is in storage. Tap the room name at home to place it.`;
    bzShow("home");
  });
}

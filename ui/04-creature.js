// ================================================================ the creature, built from its genes
const PHASE_SCALE = { bayi: 0.68, anak: 0.8, remaja: 0.92, dewasa: 1.0, tua: 0.98, meninggal: 0.98, merantau: 1 };
const PET = 0.9; // creature size relative to the room
// softer, more natural versions of the gene colors for the 3D model
const FUR = { "emas": 0xD9AE55, "krem": 0xE8D8BE, "abu": 0xA9ADB3, "oranye": 0xD99A6C, "biru muda": 0x9DB8C9, "hitam": 0x4D4A52, "pink pucat": 0xE5BFBF };
let K = null; // current creature parts
const isYoung = m => { const s = statusOf(m.id); return !!s && Object.values(s.talents).some(v => v == null); };
// what the creature wears: the closet for a family member (star gear by default), or a plain gear list for anyone else in a photo
const wornOf = m => {
  const C = globalThis.Cosmetics; if (!C) return [];
  const c = game && state && game.home.get(m.id);
  if (!c) return (m.gear || []).map(g => C.gearItem(g)).filter(Boolean).map(x => [x.slot, x]);
  return Object.entries(C.wearing(state, m.id, c, game.home)).filter(([, id]) => id).map(([s, id]) => [s, C.item(id)]);
};
const lookKey = m => [m.id, m.fase, m.rupa.warna, m.rupa.pola, isYoung(m), wornOf(m).map(([s, x]) => s + "=" + x.id).join("+")].join("|");
// Puff: a soft pear body, tufted ears and a big curled tail (the tail is the silhouette people recognize)
const BODY_GEO = (() => {
  const r = 1.2, g = SPH(r, 64, 48), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const k = 1 + 0.12 * (-v.y / r);
    v.x *= k; v.z *= 0.92 * k; if (v.y < -0.95) v.y = -0.95 + (v.y + 0.95) * 0.3;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
})();
const BODY_Y = 1.18;
// the tail's curl, its radius along the way, and a tube whose rings follow that radius
const TAIL_AT = t => { const a = t * 4.2; return new THREE.Vector3(0.05 + 0.45 * Math.sin(a) + t * 0.25, t * 1.9 + 0.25 * (1 - Math.cos(a)) * Math.max(0, Math.min(1, (t - 0.5) * 5)), -t * 0.15); };
const TAIL_R = t => 0.48 - t * 0.14 - 0.3 * Math.pow(Math.max(0, t - 0.88) / 0.12, 2);
function tailTube(t0, t1) {
  const curve = new THREE.Curve(); curve.getPoint = u => TAIL_AT(t0 + (t1 - t0) * u);
  const seg = 48, rad = 24, g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position, v = new THREE.Vector3();
  const tu = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const u = Math.floor(i / (rad + 1)) / seg, c = curve.getPointAt(u); tu[i] = t0 + (t1 - t0) * u;
    v.fromBufferAttribute(p, i).sub(c).multiplyScalar(Math.max(0.02, TAIL_R(t0 + (t1 - t0) * u))).add(c); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.setAttribute("tu", new THREE.BufferAttribute(tu, 1)); g.computeVertexNormals(); return g;
}
const TAIL_GEO = tailTube(0, 1), TAIL_BASE = SPH(TAIL_R(0), 24, 18);
// marks laid out for the old body (center 1.4, radius 1.3) mapped onto the Puff body
const onBody = ([x, y, z]) => [x * 0.92, BODY_Y + (y - 1.4) * 0.92, z * 0.92];
const blob = mesh(new THREE.PlaneGeometry(3.0, 3.0), F(0xffffff, { map: blobTex, transparent: true, depthWrite: false }), 0, 0.03, 0.1);
blob.rotation.x = -Math.PI / 2;
function buildCreature(m) {
  if (K) scene.remove(K.root);
  K = makeCreature(m, scene); bubbleKey = null;
}
// builds a creature into any parent (the room, or the photo studio)
function makeCreature(m, parent) {
  // Bayi dan anak bulunya masih pucat; warna dan pola asli keluar saat remaja
  const worn = wornOf(m), dye = (worn.find(([s]) => s === "bulu") || [])[1] || null;
  const young = isYoung(m), gold = !young && m.rupa.warna === "emas";
  // a fur dye replaces the gene color only: the pattern and the gold sparkle still show through (fixed traits)
  const hue = dye ? dye.look.color : (FUR[m.rupa.warna] || 0xE5BFBF);
  const base = young ? tint(hue, 0.35) : hue, dark = !young && (dye ? lum(base) < 0.3 : m.rupa.warna === "hitam");
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); parent.add(root);
  const fur = gold && !dye ? M(0xD9AE55, { metalness: 0.55, roughness: 0.38, envMapIntensity: 1.1 }) : M(base, { roughness: 0.95 });
  const furDark = M(shade(base, dark ? 0.75 : 0.85), { roughness: 0.95 });
  const bellyMat = M(tint(base, dark ? 0.3 : 0.55), { roughness: 1 }), inner = M(dark ? 0xa77d82 : 0xe7aaa3, { roughness: 1 });
  mesh(BODY_GEO, fur, 0, BODY_Y, 0, body);
  const belly = mesh(SPH(0.8), bellyMat, 0, 0.95, 0.55, body); belly.scale.set(1, 0.85, 0.55);
  const ears = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Group(); body.add(e); ears.push(e);
    if (m.rupa.telinga === "bulat") {
      e.position.set(sx * 0.72, 2.12, -0.05);
      mesh(SPH(0.4, 28, 20), fur, 0, 0.15, 0, e).scale.z = 0.6;
      mesh(SPH(0.24, 20, 14), inner, 0, 0.15, 0.15, e).scale.z = 0.4;
    } else {
      // pointy ears with a darker tuft; "terkulai" ones splay out sideways like airplane ears
      const droop = m.rupa.telinga !== "lancip";
      e.position.set(sx * (droop ? 0.78 : 0.68), droop ? 2.0 : 2.1, 0); e.rotation.z = -sx * (droop ? 1.05 : 0.32); if (droop) e.scale.setScalar(0.85);
      mesh(new THREE.ConeGeometry(0.4, 0.95, 32), fur, 0, 0.42, 0, e).scale.z = 0.6;
      mesh(new THREE.ConeGeometry(0.22, 0.55, 24), inner, 0, 0.36, 0.13, e).scale.z = 0.3;
      mesh(new THREE.ConeGeometry(0.14, 0.3, 20), furDark, 0, 0.82, 0, e).scale.z = 0.6;
    }
  }
  ears.forEach((e, i) => { e.userData.rz0 = e.rotation.z; e.userData.sx = i ? 1 : -1; });
  // tail: one smooth tapered tube along a curl rising beside the body; pivots at its base so it can wag
  const tail = new THREE.Group(); tail.position.set(0.95, 0.55, -0.75); body.add(tail);
  // one tube, its color fading to the light tip near the end
  const tg = TAIL_GEO.clone(), tu = tg.attributes.tu, cols = new Float32Array(tu.count * 3), c0 = new THREE.Color(gold && !dye ? 0xD9AE55 : base).convertSRGBToLinear(), c1 = new THREE.Color(tint(base, dark ? 0.35 : 0.6)).convertSRGBToLinear(), c = new THREE.Color();
  for (let i = 0; i < tu.count; i++) { c.copy(c0).lerp(c1, Math.max(0, Math.min(1, (tu.getX(i) - 0.74) / 0.1))); c.toArray(cols, i * 3); }
  tg.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const tailMat = fur.clone(); tailMat.color.setHex(0xffffff); tailMat.vertexColors = true;
  mesh(tg, tailMat, 0, 0, 0, tail); mesh(TAIL_BASE, fur, ...TAIL_AT(0).toArray(), tail);
  const pola = young ? "polos" : m.rupa.pola, twinkle = [];
  const patch = M(shade(base, dark ? 0.72 : 0.84), { roughness: 1 });
  if (pola === "bintang") [[0.9, 2.0, 0.62], [-0.95, 1.8, 0.62], [1.12, 1.0, 0.55], [-0.8, 0.6, 0.85], [0.3, 2.55, 0.5], [-1.15, 1.25, 0.3], [0.72, 0.45, 0.95]].map(onBody).forEach(([x, y, z]) => { const d = mesh(new THREE.OctahedronGeometry(0.12), M(0xF4E3B0, { emissive: 0xE9C978, emissiveIntensity: 0.8 }), x, y, z, body); d.lookAt(x * 3, y, z * 3); twinkle.push(d); });
  if (pola === "belang") for (const sx of [-0.36, 0, 0.36]) { const s = mesh(SPH(0.17, 16, 12), patch, sx, 2.3, 0.3, body); s.scale.set(0.7, 0.4, 1.4); s.rotation.x = -0.6; }
  if (pola === "totol") [[0.92, 2.05, 0.58], [-1.0, 1.85, 0.55], [1.15, 1.0, 0.5], [-0.72, 0.5, 0.9], [0.2, 2.62, 0.35], [-1.2, 1.2, 0.25]].map(onBody).forEach(([x, y, z]) => { const d = mesh(SPH(0.21, 16, 12), patch, x, y, z, body); d.scale.set(1, 1, 0.35); d.lookAt(x * 3, y, z * 3); });
  if (gold) for (let i = 0; i < 6; i++) { const a = i * 1.05, d = mesh(new THREE.OctahedronGeometry(0.06), F(0xfff6dc), Math.cos(a) * 1.0, 0.6 + (i % 3) * 0.7, Math.sin(a) * 0.55 + 0.5, body); twinkle.push(d); }
  // eyes: big glossy beads, set low and wide, two catch-lights
  const eyes = [], pupils = [];
  const eyeM = M(0x221a18, { roughness: 0.12, envMapIntensity: 1.3 });
  for (const sx of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(sx * 0.42, 1.3, 1.02); e.rotation.y = sx * 0.22; body.add(e);
    const p = new THREE.Group(); e.add(p);
    mesh(SPH(0.2, 32, 24), eyeM, 0, 0, 0, p).scale.set(1, 1.18, 0.55);
    mesh(SPH(0.064, 14, 10), F(0xffffff), 0.064, 0.084, 0.1, p).scale.z = 0.4;
    mesh(SPH(0.028, 10, 8), F(0xffffff), -0.06, -0.07, 0.1, p).scale.z = 0.4;
    // happy eyes: a closed "^" arc that replaces the bead
    const arc = mesh(new THREE.TorusGeometry(0.15, 0.048, 10, 24, Math.PI), eyeM, 0, -0.08, 0.06, e); arc.scale.y = 1.35; arc.visible = false; e.userData.arc = arc;
    eyes.push(e); pupils.push(p);
  }
  const cheekMat = F(0xe48c8c, { transparent: true, opacity: 0.45, depthWrite: false });
  const cheeks = [-1, 1].map(sx => { const ch = mesh(SPH(0.16, 20, 14), cheekMat, sx * 0.76, 1.04, 1.0, body); ch.scale.set(1.1, 0.55, 0.3); ch.rotation.y = sx * 0.5; return ch; });
  if (pola === "bintik pipi") for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) mesh(SPH(0.03, 8, 6), patch, sx * (0.7 + i * 0.08), 1.1 - (i % 2) * 0.07, 1.0, body);
  // small cat-like "w" mouth; flipped upside down it reads as a frown
  const ink = F(dark ? 0xe8e0d8 : 0x3a2c28), smile = new THREE.Group(); smile.position.set(0, 1.06, 1.12); body.add(smile);
  for (const sx of [-1, 1]) { const t = mesh(new THREE.TorusGeometry(0.055, 0.017, 8, 20, Math.PI), ink, sx * 0.055, 0, 0, smile); t.rotation.z = Math.PI; }
  const mouth = mesh(SPH(0.11, 20, 14), F(0x7a3a36), 0, 1.0, 1.1, body); mouth.scale.set(1, 0.05, 0.4);
  const arms = [-1, 1].map(sx => { const a = mesh(SPH(0.24, 24, 18), fur, sx * 1.08, 0.9, 0.35, body); a.scale.set(0.7, 1.0, 0.7); a.rotation.z = sx * 0.4; a.userData.sx = sx; return a; });
  for (const sx of [-1, 1]) mesh(SPH(0.3, 24, 18), furDark, sx * 0.5, 0.14, 0.55, root).scale.set(1, 0.45, 1.25);
  if ((m.fase === "tua" || m.fase === "meninggal") && !worn.some(([s]) => s === "muka")) for (const sx of [-1, 1]) mesh(new THREE.TorusGeometry(0.25, 0.022, 8, 30), M(brass, { metalness: 0.8, roughness: 0.3 }), sx * 0.42, 1.3, 1.16, body);
  // everything from the closet: star gear, bought and earned cosmetics (see wearItem below)
  for (const [slot, x] of worn) wearItem(slot, x, { body, root, m, young, dark });
  const dirtMat = M(0x6b5240, { transparent: true, opacity: 1, roughness: 1 });
  const dirt = [[0.8, 1.95, 0.78], [-0.9, 1.0, 0.88], [0.5, 0.7, 1.02], [-0.4, 2.35, 0.82], [1.1, 1.2, 0.55]].map(onBody).map(([x, y, z]) => { const d = mesh(SPH(0.15, 14, 10), dirtMat, x, y, z, body); d.scale.set(1.4, 0.8, 0.3); d.lookAt(x * 3, y, z * 3); return d; });
  root.traverse(envScale);
  return { root, body, belly, eyes, pupils, smile, mouth, dirtMat, dirt, twinkle, tail, ears, arms, cheeks, smileY: 1.06, id: m.id, fase: m.fase, key: lookKey(m), scale: (PHASE_SCALE[m.fase] || 1) * PET };
}
// ---- cosmetics on the body. Every shape lives in body space, so it scales with the life phase. Nothing here is ever read by the game.
function wearItem(slot, x, P) {
  const { body, m } = P, L = x.look || {}, col = L.color ?? 0xC8674F, col2 = L.color2 ?? 0xF2C94C;
  const mat = (c, o) => M(c, Object.assign({ roughness: 0.8 }, o || {}));
  const OCYL = (a, b, h, n = 40) => new THREE.CylinderGeometry(a, b, h, n, 1, true);
  const ring = (r, t, y, c, o) => { const q = mesh(new THREE.TorusGeometry(r, t, 10, 48), mat(c, o), 0, y, 0, body); q.rotation.x = Math.PI / 2; return q; };
  switch (L.shape) {
    case "glasses": { const fm = mat(col, { roughness: 0.4, metalness: 0.2 }); for (const sx of [-1, 1]) mesh(new THREE.TorusGeometry(0.25, 0.03, 8, 30), fm, sx * 0.42, 1.3, 1.16, body); mesh(CYL(0.022, 0.022, 0.34, 8), fm, 0, 1.36, 1.22, body).rotation.z = Math.PI / 2; break; }
    case "sunglasses": { const fm = mat(col, { roughness: 0.4 }), lens = M(col, { transparent: true, opacity: 0.5, roughness: 0.2 }); for (const sx of [-1, 1]) { mesh(new THREE.TorusGeometry(0.25, 0.03, 8, 30), fm, sx * 0.42, 1.3, 1.16, body); mesh(CYL(0.24, 0.24, 0.02, 24), lens, sx * 0.42, 1.3, 1.15, body).rotation.x = Math.PI / 2; } mesh(CYL(0.022, 0.022, 0.34, 8), fm, 0, 1.36, 1.22, body).rotation.z = Math.PI / 2; break; }
    case "monocle": { const fm = mat(col, { roughness: 0.3, metalness: 0.6 }); mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 30), fm, 0.42, 1.3, 1.16, body); mesh(CYL(0.012, 0.012, 0.7, 6), fm, 0.78, 0.95, 1.05, body).rotation.z = 0.35; break; }
    case "headband": { const hm = mat(col); const band = ring(0.84, 0.075, 2.0, col); band.scale.y = 0.9; mesh(SPH(0.11, 12, 10), hm, 0.6, 2.02, -0.56, body); for (const k of [-1, 1]) { const t = mesh(SPH(0.09, 10, 8), hm, 0.7 + k * 0.05, 1.9 - (k + 1) * 0.08, -0.62, body); t.scale.set(0.6, 1.6, 0.5); t.rotation.z = k * 0.5; } break; }
    case "beret": { const bt = new THREE.Group(); bt.position.set(0.12, 2.3, 0.02); bt.rotation.z = -0.28; body.add(bt); mesh(SPH(0.66, 32, 20), mat(col, { roughness: 0.95 }), 0, 0, 0, bt).scale.set(1, 0.3, 1); mesh(CYL(0.03, 0.04, 0.12, 8), mat(col), 0, 0.22, 0, bt); [[0xE0645A, 0.32, 0.4], [0xF2C94C, -0.2, 0.5], [0x5B9BD5, 0.05, 0.6]].forEach(([c, px, pz]) => mesh(SPH(0.06, 10, 8), mat(c, { roughness: 0.6 }), px, 0.12, pz, bt).scale.y = 0.4); break; }
    case "flower": { const fl = new THREE.Group(); fl.position.set(-0.5, 2.1, 0.5); fl.scale.setScalar(1.7); body.add(fl); fl.lookAt(-1.5, 2.5, 1.5); for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; mesh(SPH(0.11, 12, 10), mat(col, { roughness: 0.7 }), Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0, fl).scale.z = 0.35; } mesh(SPH(0.075, 12, 10), mat(0xF6D365, { roughness: 0.6 }), 0, 0, 0.03, fl); break; }
    case "cone": { const h = new THREE.Group(); h.position.set(0.1, 2.33, 0); h.rotation.z = -0.18; body.add(h); mesh(new THREE.ConeGeometry(0.42, 0.95, 24), mat(col), 0, 0.47, 0, h); mesh(SPH(0.12, 12, 10), mat(col2), 0, 0.98, 0, h); for (let k = 0; k < 5; k++) mesh(SPH(0.05, 8, 6), mat(col2), Math.cos(k * 1.3) * 0.3, 0.15 + k * 0.12, Math.sin(k * 1.3) * 0.3, h); break; }
    case "beanie": { mesh(SPH(0.82, 28, 20), mat(col, { roughness: 0.95 }), 0, 2.2, 0, body).scale.set(1, 0.62, 1); ring(0.82, 0.09, 2.2, col2); mesh(SPH(0.17, 12, 10), mat(col2), 0, 2.78, 0, body); break; }
    case "straw": { mesh(CYL(0.56, 0.6, 0.36, 32), mat(col), 0, 2.5, 0, body); mesh(CYL(1.12, 1.15, 0.05, 40), mat(col), 0, 2.32, 0, body); ring(0.6, 0.05, 2.4, col2); break; }
    case "bucket": { mesh(CYL(0.62, 0.72, 0.5, 32), mat(col), 0, 2.48, 0, body); mesh(CYL(0.98, 0.84, 0.08, 40), mat(shade(col, 0.9)), 0, 2.25, 0, body); break; }
    case "tophat": { mesh(CYL(0.5, 0.52, 0.8, 32), mat(col, { roughness: 0.5 }), 0, 2.68, 0, body); mesh(CYL(0.9, 0.9, 0.06, 40), mat(col, { roughness: 0.5 }), 0, 2.3, 0, body); ring(0.52, 0.05, 2.38, col2); break; }
    case "bow": { const b = new THREE.Group(); b.position.set(0.62, 2.32, 0.25); b.rotation.set(0.3, 0.4, -0.5); body.add(b); for (const sx of [-1, 1]) mesh(SPH(0.16, 12, 10), mat(col), sx * 0.17, 0, 0, b).scale.set(1.3, 0.8, 0.5); mesh(SPH(0.08, 10, 8), mat(shade(col, 0.8)), 0, 0, 0.02, b); break; }
    case "flowercrown": { ring(0.82, 0.07, 2.15, col2); for (let k = 0; k < 7; k++) { const a = k * Math.PI * 2 / 7 + 0.3; mesh(SPH(0.1, 10, 8), mat(k % 2 ? col : 0xF6D365, { roughness: 0.7 }), Math.cos(a) * 0.84, 2.18, Math.sin(a) * 0.84, body); } break; }
    case "crown": { const gm = mat(col, { metalness: 0.5, roughness: 0.35 }); mesh(OCYL(0.55, 0.62, 0.34, 8), gm, 0, 2.45, 0, body); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; mesh(new THREE.ConeGeometry(0.1, 0.26, 4), gm, Math.cos(a) * 0.55, 2.72, Math.sin(a) * 0.55, body); if (k % 2 === 0) mesh(SPH(0.055, 8, 6), mat(col2, { roughness: 0.3 }), Math.cos(a) * 0.6, 2.5, Math.sin(a) * 0.6, body); } break; }
    case "halo": { const r = mesh(new THREE.TorusGeometry(0.5, 0.045, 8, 40), F(col), 0, 2.95, -0.1, body); r.rotation.x = Math.PI / 2 + 0.15; break; }
    case "scarf": { ring(1.2, 0.17, 0.74, col, { roughness: 0.95 }).scale.set(1, 0.92, 1); mesh(RB(0.34, 0.6, 0.12, 0.05), mat(col, { roughness: 0.95 }), 0.45, 0.5, 1.12, body).rotation.set(0.25, 0, -0.15); break; }
    case "bowtie": { const b = new THREE.Group(); b.position.set(0, 0.74, 1.18); body.add(b); for (const sx of [-1, 1]) mesh(SPH(0.15, 12, 10), mat(col), sx * 0.16, 0, 0, b).scale.set(1.2, 0.75, 0.45); mesh(SPH(0.07, 10, 8), mat(shade(col, 0.8)), 0, 0, 0.03, b); break; }
    case "bell": { ring(1.2, 0.06, 0.76, col).scale.set(1, 0.92, 1); mesh(SPH(0.13, 12, 10), mat(col2, { metalness: 0.6, roughness: 0.3 }), 0, 0.62, 1.18, body); break; }
    case "pearls": { for (let k = 0; k < 13; k++) { const a = -Math.PI * 0.55 + k * (Math.PI * 1.1 / 12); mesh(SPH(0.065, 10, 8), mat(col, { roughness: 0.25 }), Math.sin(a) * 1.18, 0.72 - 0.12 * Math.cos(a), Math.cos(a) * 1.08, body); } break; }
    case "tee": { mesh(OCYL(1.25, 0.98, 0.66), mat(col, { roughness: 0.95, side: THREE.DoubleSide }), 0, 0.53, 0, body).scale.z = 0.93; if (L.color2 != null) for (const y of [0.3, 0.52]) mesh(OCYL(0.9 + y * 0.55, 0.86 + y * 0.55, 0.09), mat(col2, { roughness: 0.95, side: THREE.DoubleSide }), 0, y, 0, body).scale.z = 0.935; break; }
    case "coat": { mesh(OCYL(1.26, 0.96, 0.72), mat(col, { roughness: 0.5, side: THREE.DoubleSide }), 0, 0.5, 0, body).scale.z = 0.93; for (const sx of [-1, 1]) mesh(SPH(0.07, 8, 6), mat(0xF4F1EC), sx * 0.1, 0.62 - (sx + 1) * 0.1, 1.17, body); break; }
    case "overalls": { mesh(OCYL(1.2, 0.95, 0.5), mat(col, { roughness: 0.9, side: THREE.DoubleSide }), 0, 0.42, 0, body).scale.z = 0.93; mesh(RB(0.6, 0.3, 0.08, 0.03), mat(col, { roughness: 0.9 }), 0, 0.8, 1.12, body); for (const sx of [-1, 1]) mesh(SPH(0.05, 8, 6), mat(0xF2C94C, { metalness: 0.5 }), sx * 0.22, 0.9, 1.17, body); break; }
    case "cape": { const cp = mesh(new THREE.PlaneGeometry(3.2, 2.4), mat(col, { roughness: 0.9, side: THREE.DoubleSide }), 0, 1.0, -0.95, body); cp.rotation.x = 0.1; for (const sx of [-1, 1]) { mesh(SPH(0.12, 10, 8), mat(0xF2C94C, { metalness: 0.5, roughness: 0.4 }), sx * 1.05, 1.75, 0.25, body); mesh(CYL(0.03, 0.03, 1.1, 8), mat(0xF2C94C, { metalness: 0.5, roughness: 0.4 }), sx * 1.15, 1.72, -0.3, body).rotation.x = Math.PI / 2; } break; }
    case "sash": { const r = ring(1.24, 0.08, 1.05, col, { roughness: 0.6, metalness: 0.2 }); r.rotation.z = 0.55; r.scale.set(1, 0.92, 1); break; }
    case "balloon": { mesh(CYL(0.012, 0.012, 2.0, 6), mat(0xF4F1EC), 1.38, 1.95, 0.35, body).rotation.z = -0.12; mesh(SPH(0.36, 20, 16), mat(col, { roughness: 0.35 }), 1.5, 3.25, 0.35, body).scale.set(1, 1.15, 1); break; }
    case "bag": { mesh(RB(0.5, 0.55, 0.26, 0.05), mat(col, { roughness: 0.95 }), -1.3, 0.55, 0.25, body).rotation.z = 0.1; mesh(CYL(0.03, 0.03, 1.4, 8), mat(shade(col, 0.8)), -1.15, 1.25, 0.25, body).rotation.z = 0.28; break; }
    case "badge": { mesh(CYL(0.14, 0.14, 0.05, 20), mat(col, { metalness: 0.5, roughness: 0.4 }), 0.55, 0.8, 1.1, body).rotation.x = Math.PI / 2 - 0.3; mesh(SPH(0.05, 8, 6), F(0xffffff), 0.55, 0.82, 1.16, body); break; }
    case "umbrella": { mesh(CYL(0.025, 0.025, 1.9, 8), mat(0x5A4636), 1.4, 2.0, 0.3, body).rotation.z = -0.1; mesh(new THREE.ConeGeometry(1.05, 0.5, 24, 1, true), mat(col, { roughness: 0.7, side: THREE.DoubleSide }), 1.5, 3.1, 0.3, body); mesh(SPH(0.06, 8, 6), mat(0x5A4636), 1.5, 3.38, 0.3, body); break; }
    default: break; // a dye has no shape: it was applied to the fur above
  }
}
const flies = [0, 1, 2].map(() => mesh(SPH(0.06, 10, 8), M(0x2e2a26), 0, 3, 0));
const head = new THREE.Vector3();


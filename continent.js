// Peta benua (v75): globe → benua → kota. Gambar dari region.js: daratan dengan bayangan bukit, sungai, jalan antar kota,
// gunung, hutan, dan kota-kota kecil. Geser = jalan-jalan, cubit/scroll = zoom. Zoom terus di atas kota yang hidup
// (Old Town) = masuk peta kota; zoom keluar sampai jauh = balik ke globe.
"use strict";
(function () {
  function create(env) {
    const { THREE } = env;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x7fb6cc);
    scene.fog = new THREE.Fog(0x9cc6d6, 200, 900);
    const camera = new THREE.PerspectiveCamera(34, 1, 1, 3000);
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x5d6a5a, 0.85));
    const sun = new THREE.DirectionalLight(0xffe8cc, 1.1); sun.position.set(-120, 200, 140); scene.add(sun);
    const T = { on: false, scene, camera, id: null };
    let R = null, root = null, focusX = 0, focusZ = 0, zoom = 0.6, tgt = null, entering = false, ring = null, labels = [];
    const ZD0 = 18, ZD1 = 620, LZ = Math.log(ZD1 / ZD0), Z_IN = 0.03, Z_OUT = 1.04;
    const hex = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

    // ---------------------------------------------------------------- lukis peta (sekali per benua)
    function paint(R) {
      const C = R.C, N = 320, half = R.half, HF = new Float32Array(N * N), step = 2 * half / (N - 1);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const A = R.at(-half + i * step, -half + j * step); HF[j * N + i] = A.mine || A.h <= 0 ? A.h : Math.min(A.h, 0.05); }
      const S = 1024, cv = document.createElement("canvas"); cv.width = cv.height = S;
      const ctx = cv.getContext("2d"), img = ctx.createImageData(S, S), px = img.data;
      const hAt = (fx, fy) => { const x0 = Math.max(0, Math.min(N - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(N - 2, Math.floor(fy))), tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0)), a = (x, y) => HF[y * N + x]; return (a(x0, y0) * (1 - tx) + a(x0 + 1, y0) * tx) * (1 - ty) + (a(x0, y0 + 1) * (1 - tx) + a(x0 + 1, y0 + 1) * tx) * ty; };
      const lo = hex(C.land), hi = hex(C.high), deep = hex(0x3b77a0), shallow = hex(0x7cc4d6), beach = hex(0xead9a8);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const fx = x / (S - 1) * (N - 1), fy = y / (S - 1) * (N - 1), h = hAt(fx, fy), i = (y * S + x) * 4;
        let c;
        if (h > 0) {
          const k = Math.min(1, h * 1.3), sh = (hAt(fx - 1, fy - 1) - hAt(fx + 1, fy + 1)) * 16;
          c = lo.map((v, j) => (v + (hi[j] - v) * k) * (1 + Math.max(-0.22, Math.min(0.22, sh))));
          if (h < 0.03) c = c.map((v, j) => v + (beach[j] - v) * (1 - h / 0.03) * 0.8);
        } else { const k = Math.min(1, -h * 1.8); c = shallow.map((v, j) => v + (deep[j] - v) * Math.sqrt(k)); }
        px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      const P = (x, z) => [(x + half) / (2 * half) * S, (z + half) / (2 * half) * S];
      const line = (pts, w, col, dash) => { ctx.beginPath(); pts.forEach((p, k) => { const [a, b] = P(p.x, p.z); if (k) ctx.lineTo(a, b); else ctx.moveTo(a, b); }); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.setLineDash(dash || []); ctx.lineCap = ctx.lineJoin = "round"; ctx.stroke(); ctx.setLineDash([]); };
      for (const r of R.rivers) { line(r, 4, "rgba(70,130,170,0.9)"); line(r, 2, "rgba(140,200,225,0.9)"); }
      for (const r of R.roads) { if (r.ferry) line(r.pts, 2.5, "rgba(255,255,255,0.75)", [6, 6]); else { line(r.pts, 5, "rgba(120,96,70,0.55)"); line(r.pts, 2.6, "#efe2c6"); } }
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
      return tex;
    }
    function tag(text, sub, accent, k = 1) {
      const tex = env.canvasTex((c, w, h) => {
        c.fillStyle = accent ? "rgba(255,248,240,0.97)" : "rgba(255,255,255,0.9)";
        const r = 44; c.beginPath(); c.moveTo(r, 4); c.arcTo(w - 4, 4, w - 4, h - 4, r); c.arcTo(w - 4, h - 4, 4, h - 4, r); c.arcTo(4, h - 4, 4, 4, r); c.arcTo(4, 4, w - 4, 4, r); c.fill();
        c.textAlign = "center"; c.fillStyle = accent ? "#B35A36" : "#4B453F"; c.font = "800 40px Manrope, sans-serif"; c.fillText(text, w / 2, sub ? 50 : 62);
        if (sub) { c.fillStyle = "#7A7168"; c.font = "600 24px Manrope, sans-serif"; c.fillText(sub, w / 2, 80); }
      }, 320, 96);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, depthTest: false, transparent: true }));
      s.userData.k = k; s.renderOrder = 10; return s;
    }
    function inst(geo, mat, list, set) {
      if (!list.length) return null;
      const im = new THREE.InstancedMesh(geo, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
      list.forEach((b, i) => { const o = set(b, i); p.set(o.x, o.y || 0, o.z); s.set(o.sx, o.sy, o.sz); q.setFromAxisAngle(up, o.ry || 0); m4.compose(p, q, s); im.setMatrixAt(i, m4); if (o.c !== undefined) { col.setHex(o.c).convertSRGBToLinear(); im.setColorAt(i, col); } });
      root.add(im); return im;
    }
    function build(id) {
      if (root) scene.remove(root);
      root = new THREE.Group(); scene.add(root); labels = []; ring = null;
      R = globalThis.Region.region(id); T.id = id;
      const half = R.half;
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(2 * half, 2 * half), new THREE.MeshStandardMaterial({ map: paint(R), roughness: 0.95, metalness: 0 }));
      ground.rotation.x = -Math.PI / 2; root.add(ground);
      const seaM = new THREE.MeshStandardMaterial({ color: 0x3b77a0, roughness: 0.95, metalness: 0 }); seaM.color.convertSRGBToLinear(); const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), seaM); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.3; root.add(sea);
      // gunung (salju di puncak yang tinggi) dan hutan
      const rock = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
      inst(new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0), rock, R.peaks, (p, i) => ({ x: p.x, z: p.z, sx: p.h * 0.75, sy: p.h, sz: p.h * 0.7, ry: i * 1.7, c: i % 3 ? 0x8a8072 : 0x9a9182 }));
      const tall = R.peaks.filter(p => p.h > 3.6);
      inst(new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xf6f7f8, roughness: 0.9, flatShading: true }), tall, (p, i) => ({ x: p.x, y: p.h * 0.62, z: p.z, sx: p.h * 0.3, sy: p.h * 0.4, sz: p.h * 0.28, ry: R.peaks.indexOf(p) * 1.7, c: 0xffffff }));
      const trees = []; for (const f of R.forests) for (let k = 0; k < 4; k++) trees.push({ x: f.x + Math.cos(k * 2.1 + f.x) * 1.6 * f.s, z: f.z + Math.sin(k * 2.1 + f.z) * 1.6 * f.s, s: f.s * (0.8 + (k % 2) * 0.4) });
      inst(new THREE.ConeGeometry(0.7, 2, 6).translate(0, 1, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), trees, (t, i) => ({ x: t.x, z: t.z, sx: t.s, sy: t.s, sz: t.s, c: [0x4f7a45, 0x5f8a50, 0x3f6a3e][i % 3] }));
      // kota-kota: kumpulan rumah kecil; kota utama lebih besar, ada menara
      const houses = [];
      for (const t of R.towns) {
        const n = t.main ? 26 : t.size === 1 ? 7 : 11, rr = t.main ? 5.5 : 3;
        for (let k = 0; k < n; k++) { const a = k * 2.399, d = Math.sqrt((k + 0.5) / n) * rr; houses.push({ x: t.x + Math.cos(a) * d, z: t.z + Math.sin(a) * d, h: (t.main && k < 4 ? 3.2 : 0.9) + ((k * 7) % 5) * 0.12, w: t.main && k < 4 ? 1.1 : 0.9, c: t.main && k < 4 ? 0xc9d2d8 : [0xe3d4bd, 0xd9b48f, 0xefe6d6, 0xc98b6a][k % 4], ry: a }); }
        const L = tag(t.name, t.main ? (t.live ? "Your home · zoom in" : "Coming soon") : "Small town", t.main && t.live, t.main ? 1.25 : 0.85);
        L.position.set(t.x, t.main ? 9 : 5, t.z); root.add(L); labels.push({ s: L, t });
      }
      inst(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), houses, h => ({ x: h.x, z: h.z, sx: h.w, sy: h.h, sz: h.w, ry: h.ry, c: h.c }));
      inst(new THREE.ConeGeometry(0.8, 0.6, 4).translate(0, 0.3, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true }), houses.filter(h => h.h < 2), (h, i) => ({ x: h.x, y: h.h, z: h.z, sx: h.w, sy: 1, sz: h.w, ry: h.ry + Math.PI / 4, c: [0xa8624a, 0x7a6a5a, 0xc2704f][i % 3] }));
      const live = R.towns.find(t => t.live);
      if (live) { ring = new THREE.Mesh(new THREE.RingGeometry(7, 8.2, 48), env.F(0xe0784f, { transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(live.x, 0.3, live.z); root.add(ring); }
    }

    // ---------------------------------------------------------------- kamera
    const fitK = () => 1 / Math.max(0.55, Math.min(1, camera.aspect) / 0.6);
    const distNow = () => ZD0 * Math.exp(LZ * Math.min(1.1, zoom)) * fitK();
    const pitch = () => (38 + 26 * Math.max(0, Math.min(1, zoom))) * Math.PI / 180;
    function place() {
      const d = distNow(), p = pitch();
      camera.position.set(focusX, d * Math.sin(p), focusZ + d * Math.cos(p)); camera.lookAt(focusX, 0, focusZ);
      scene.fog.near = d * 1.2; scene.fog.far = d * 3.2 + 100;
      for (const L of labels) { const k = Math.max(1.1, d * 0.026) * L.s.userData.k; L.s.scale.set(k * 3.33, k, 1); L.s.position.y = (L.t.main ? 6 : 3.5) + k * 0.6; L.s.material.opacity = L.t.main ? 1 : Math.max(0, Math.min(1, (0.95 - zoom) * 5)); L.s.visible = L.s.material.opacity > 0.02; }
    }
    function setZoom(z) {
      zoom = Math.max(0, Math.min(Z_OUT + 0.02, z));
      if (entering) return;
      if (zoom >= Z_OUT) { entering = true; env.toGlobe(); return; }
      const live = R && R.towns.find(t => t.live);
      if (live && zoom <= Z_IN && Math.hypot(focusX - live.x, focusZ - live.z) < 14) { entering = true; env.enterCity(); }
    }
    const clamp = () => { const h = R ? R.half : 100; focusX = Math.max(-h, Math.min(h, focusX)); focusZ = Math.max(-h, Math.min(h, focusZ)); };
    const ptr = new Map(); let drag = null, moved = 0, pinch = null;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    T.down = e => { ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); tgt = null; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom }; drag = null; moved = 99; return; } drag = { x: e.clientX, y: e.clientY, fx: focusX, fz: focusZ }; moved = 0; };
    T.move = e => {
      if (!ptr.has(e.pointerId)) return; ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptr.size >= 2) { const [a, b] = [...ptr.values()]; setZoom(pinch.zoom - Math.log(Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d) / LZ); return; }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.hypot(dx, dy));
      const k = 2 * distNow() * Math.tan(17 * Math.PI / 180) / env.canvas.clientHeight;
      focusX = drag.fx - dx * k; focusZ = drag.fz - dy * k / Math.sin(pitch()); clamp();
    };
    T.up = e => {
      const tap = drag && moved < 8 && ptr.size === 1; ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; drag = null;
      if (!tap || !R) return;
      const r = env.canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
      // kota yang paling dekat ke ketukan (label atau rumahnya)
      let best = null;
      for (const L of labels) { if (!L.s.visible) continue; for (const w of [L.s.position, new THREE.Vector3(L.t.x, 0, L.t.z)]) { const s = w.clone().project(camera), d = Math.hypot((s.x + 1) / 2 * r.width - (e.clientX - r.left), (1 - s.y) / 2 * r.height - (e.clientY - r.top)); if (d < 44 && (!best || d < best.d)) best = { d, t: L.t }; } }
      if (best) { env.showTown(best.t, R.C); return; }
      const v = new THREE.Vector3(); if (ray.ray.intersectPlane(plane, v)) tgt = { x: v.x, z: v.z, zoom: Math.max(0.15, zoom - 0.15) };
    };
    T.cancel = e => { ptr.delete(e.pointerId); pinch = null; drag = null; };
    T.wheel = e => { tgt = null; setZoom(zoom + e.deltaY * 0.0011); };
    T.zoomBy = dz => { const z0 = tgt ? tgt.zoom : zoom; if (dz > 0 && z0 >= 0.995) return setZoom(Z_OUT); tgt = { x: tgt ? tgt.x : focusX, z: tgt ? tgt.z : focusZ, zoom: Math.max(0, Math.min(1, z0 + dz)), then: true }; };
    T.flyTo = (x, z, zm) => { tgt = { x, z, zoom: zm, then: true }; };
    T.goLive = () => { const t = R && R.towns.find(x => x.live); if (t) T.flyTo(t.x, t.z, 0); return !!t; };
    T.where = () => {
      if (!R) return "";
      const t = R.towns.map(t => ({ t, d: Math.hypot(t.x - focusX, t.z - focusZ) })).sort((a, b) => a.d - b.d)[0];
      return zoom > 0.75 || !t || t.d > 30 ? R.C.name : `${R.C.name} · near ${t.t.name}`;
    };
    T.resize = (w, h) => { camera.aspect = w / h; camera.updateProjectionMatrix(); };
    // from: "globe" (fly down from high up) or "city" (start right above the live city and rise a bit)
    T.enter = (id, from) => {
      if (T.id !== id || !root) build(id);
      entering = false; ptr.clear(); drag = pinch = null;
      const live = R.towns.find(t => t.live) || R.towns[0];
      if (from === "city") { focusX = live.x; focusZ = live.z; zoom = 0.06; tgt = { x: live.x + 6, z: live.z + 10, zoom: 0.42 }; }
      else { focusX = 0; focusZ = 0; zoom = 1.0; tgt = { x: live.x * 0.5, z: live.z * 0.5 + 10, zoom: 0.68 }; }
      T.on = true; place();
    };
    T.exit = () => { T.on = false; };
    T.frame = (t, dt) => {
      if (tgt) {
        const k = 1 - Math.pow(0.03, dt);
        focusX += (tgt.x - focusX) * k; focusZ += (tgt.z - focusZ) * k; const zm = zoom + (tgt.zoom - zoom) * k;
        const done = Math.abs(tgt.x - focusX) + Math.abs(tgt.z - focusZ) < 0.1 && Math.abs(tgt.zoom - zoom) < 0.003;
        if (tgt.then) setZoom(zm); else zoom = zm;
        if (done || entering) tgt = null;
      }
      if (ring) { const s = 1 + ((t / 1400) % 1) * 0.8; ring.scale.setScalar(s); ring.material.opacity = 0.8 * (1 - (t / 1400) % 1); }
      place();
    };
    T.state = () => ({ x: focusX, z: focusZ, zoom });
    return T;
  }
  globalThis.Continent = { create };
})();

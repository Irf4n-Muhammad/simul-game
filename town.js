// Kota: satu jalan utama dengan lima lingkungan berjenjang, dari Old Town sampai Royal Heights.
// Rumah tiap keluarga berdiri di lingkungan sesuai rumah yang dia beli, mobilnya parkir di depan.
// Belum ada server, jadi tetangganya keluarga NPC; rumah dan mobil mereka ikut kekayaan mereka hari ini.
// Kavling yang belum dibeli masih tanah kosong. Rumah baru dibangun pakai waktu nyata, kelihatan dari perancahnya.
// v73: di sekeliling Main Street sekarang ada kotanya (kota.js): jalan silang, sungai, rel dan kereta, sekolah, kantor, Bazaar, taman,
// warga yang jalan sesuai jadwal dari jam asli, dan makhluk kita di tempat dia lagi berada. Kamera bird view: geser ke mana aja,
// zoom dari jalan sampai peta kota, zoom keluar lagi = balik ke globe (globe.js).
"use strict";
(function () {
  // v73: lingkungan dan tata kota pindah ke kota.js (dipakai juga buat jadwal warga dan tes)
  const HOODS = Kota.HOODS;
  const { ROAD_W, WALK, GAP } = Kota;
  const TURN = 0.75;   // homes turn a little toward the viewer so both sides of the street show their fronts
  const PLAZA = Kota.PLAZA;    // length of the town square block before Old Town
  // public places open as more families own a home in town; the mayor will pick the order later
  const CIVIC = [
    { id: "cafe", name: "Café", need: 150, side: -1, z: 12.4, len: 4.2, about: "A spot to meet the neighbours." },
    { id: "park", name: "Park", need: 300, side: 1, z: 3.4, len: 5.2, about: "Trees, a playground and benches for everyone." },
    { id: "gym", name: "Gym", need: 450, side: 1, z: 8.4, len: 4.4, about: "Where creatures keep fit." },
    { id: "school", name: "School", need: 700, side: 1, z: 13.0, len: 4.6, about: "Lessons for the little ones." },
  ];
  // nama tempat umum lewat registry brand (slot "pl:<id>"); papan namanya digambar waktu kota dibangun, jadi ganti nama butuh muat ulang
  if (globalThis.Brands) for (const c of CIVIC) Brands.bind(c, Brands.reg("pl:" + c.id, c.name, "place", "civic"));

  function create(env) {
    const { THREE, renderer } = env;
    const { M, F, RB, SPH, CYL, canvasTex } = env;
    renderer.localClippingEnabled = true;
    const scene = new THREE.Scene();
    scene.environment = env.environment;
    scene.fog = new THREE.Fog(0xe8dccb, 38, 80);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 200);
    const hemi = new THREE.HemisphereLight(0xfff4e6, 0x6e5e52, 0.5); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe2c0, 1.4);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 }); sun.shadow.radius = 4;
    scene.add(sun, sun.target);
    const lit = [];        // window and lamp materials that glow in the evening
    const lots = [];       // tap targets
    const sites = [];      // houses being built: their clip plane rises with the real clock
    const walkers = [];
    const signs = [];
    let previewG = null, lastSite = 0;
    let focusX = 0, built = false, focusZ = 0;
    const T = { on: false, scene, camera };

    // ---------------------------------------------------------------- Kenney models
    const kit = {};
    function loadKit() {
      return new Promise(res => {
        const A = globalThis.TOWN_ASSETS, names = Object.keys(A.glb);
        const mgr = new THREE.LoadingManager();
        mgr.setURLModifier(url => /colormap\.png$/.test(url) ? A.colormap : url);
        const loader = new THREE.GLTFLoader(mgr);
        let left = names.length;
        for (const n of names) {
          const bin = Uint8Array.from(atob(A.glb[n]), c => c.charCodeAt(0)).buffer;
          loader.parse(bin, "", g => {
            g.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material.envMapIntensity = 0.4; o.material.roughness = 0.85; o.material.metalness = 0; } });
            kit[n] = g.scene; if (--left === 0) res();
          }, () => { if (--left === 0) res(); });
        }
      });
    }
    const put = (name, x, y, z, s = 2, ry = 0, parent = scene) => {
      if (!kit[name]) return null;
      const o = kit[name].clone(); o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry; parent.add(o); return o;
    };
    const mesh = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = !mat.transparent && !mat.isMeshBasicMaterial; parent.add(m); return m; };
    const rnd = seed => { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
    const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
    const winMat = () => { const m = M(0x8c9aa3, { roughness: 0.2, emissive: 0xffc98a, emissiveIntensity: 0 }); lit.push(m); return m; };

    // ---------------------------------------------------------------- buildings made here (houses, villas, mansions)
    const ROOFS = [0x8a5a44, 0x6d6460, 0x9b6b52, 0x5f6b72, 0x7a6a5a];
    function gable(w, h, d, mat) {
      const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
      const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
      const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
    }
    const PAINT = i => (env.PAINTS[i % env.PAINTS.length] || env.PAINTS[0])[1];
    const hip = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1), mat); m.rotation.y = Math.PI / 4; m.scale.set(w, h, d); m.castShadow = m.receiveShadow = true; return m; };
    // ---- family houses (Downtown)
    function familyHouse(model, paint, r) {
      const g = new THREE.Group(), wall = M(PAINT(paint)), roof = M(pick(r, ROOFS), { roughness: 0.7 }), door = M(0x6b4f3c);
      if (model === 1) {          // Modern: two stacked boxes, flat roofs, wide glass
        const dark = M(0x4f4a46, { roughness: 0.6 });
        mesh(RB(2.2, 1.2, 1.7, 0.03), wall, 0, 0.6, 0, g); mesh(RB(1.5, 0.95, 1.4, 0.03), wall, -0.3, 1.68, -0.1, g);
        mesh(RB(2.3, 0.07, 1.8, 0.02), dark, 0, 1.22, 0, g); mesh(RB(1.6, 0.07, 1.5, 0.02), dark, -0.3, 2.18, -0.1, g);
        mesh(RB(1.2, 0.7, 0.05, 0.01), winMat(), -0.35, 0.65, 0.86, g); mesh(RB(1.0, 0.5, 0.05, 0.01), winMat(), -0.3, 1.7, 0.61, g);
        mesh(RB(0.5, 0.95, 0.06, 0.02), M(0xa47a55), 0.75, 0.48, 0.86, g);
      } else if (model === 2) {   // Cottage: small body, steep roof, porch, chimney
        mesh(RB(1.8, 1.15, 1.5, 0.04), wall, 0, 0.575, -0.1, g);
        const rf = gable(2.1, 1.25, 1.7, roof); rf.position.set(0, 1.15, -0.1); g.add(rf);
        mesh(RB(0.26, 0.8, 0.26, 0.02), M(0x9b8b7c), -0.5, 1.9, -0.3, g);
        mesh(RB(1.9, 0.06, 0.6, 0.02), roof, 0, 0.95, 0.9, g);
        for (const x of [-0.8, 0.8]) mesh(CYL(0.04, 0.04, 0.92, 8), M(0xf3ede3), x, 0.46, 1.12, g);
        mesh(RB(0.36, 0.66, 0.06, 0.02), door, 0, 0.33, 0.66, g);
        for (const x of [-0.55, 0.55]) mesh(RB(0.36, 0.36, 0.05, 0.02), winMat(), x, 0.66, 0.66, g);
      } else {                    // Classic gable
        mesh(RB(2.1, 1.35, 1.7, 0.04), wall, 0, 0.675, 0, g);
        const rf = gable(2.4, 0.95, 1.9, roof); rf.position.y = 1.35; g.add(rf);
        mesh(RB(0.28, 0.6, 0.28, 0.02), roof, 0.6, 2.0, -0.3, g);
        mesh(RB(0.38, 0.7, 0.06, 0.02), door, 0, 0.35, 0.86, g);
        for (const x of [-0.65, 0.65]) mesh(RB(0.45, 0.4, 0.05, 0.02), winMat(), x, 0.82, 0.86, g);
        mesh(RB(0.4, 0.35, 0.05, 0.02), winMat(), 0, 1.75, 0.86, g);
      }
      return g;
    }
    // ---- villas (Hillside)
    function villa(model, paint, r) {
      const g = new THREE.Group(), wall = M(PAINT(paint), { roughness: 0.6 }), wood = M(0xa47a55);
      const pool = () => { const p = mesh(RB(1.6, 0.06, 0.9, 0.03), M(0x8fb7c4, { roughness: 0.1, metalness: 0.2 }), -0.6, 0.04, 1.45, g); p.castShadow = false; mesh(RB(1.8, 0.04, 1.1, 0.02), M(0xe8e0d2), -0.6, 0.02, 1.45, g); };
      if (model === 1) {          // Mediterranean: terracotta hip roofs, arched openings
        const tile = M(0xb8714f, { roughness: 0.7 }), dark = M(0x5a4636);
        mesh(RB(3.0, 1.25, 2.0, 0.03), wall, -0.2, 0.625, -0.3, g);
        const h1 = hip(3.4, 0.75, 2.4, tile); h1.position.set(-0.2, 1.62, -0.3); g.add(h1);
        mesh(RB(1.3, 1.0, 1.3, 0.03), wall, 1.15, 1.75, -0.5, g);
        const h2 = hip(1.6, 0.6, 1.6, tile); h2.position.set(1.15, 2.55, -0.5); g.add(h2);
        for (const x of [-1.2, -0.5, 0.2]) { mesh(RB(0.45, 0.7, 0.05, 0.02), winMat(), x, 0.5, 0.72, g); mesh(CYL(0.225, 0.225, 0.05, 16, 1, false, 0, Math.PI), dark, x, 0.85, 0.72, g).rotation.x = Math.PI / 2; }
        mesh(RB(0.55, 0.95, 0.06, 0.02), dark, 0.95, 0.48, 0.72, g);
        pool();
      } else if (model === 2) {   // Tropical: wide low roof on posts, wooden deck
        const roofM = M(0x4f4640, { roughness: 0.8 });
        mesh(RB(2.8, 1.1, 1.8, 0.03), wall, -0.2, 0.65, -0.4, g);
        mesh(RB(3.4, 0.12, 2.6, 0.02), wood, -0.2, 0.06, -0.1, g);
        const rf = gable(3.9, 0.85, 3.0, roofM); rf.position.set(-0.2, 1.2, -0.25); g.add(rf);
        for (const x of [-1.75, 1.35]) mesh(CYL(0.05, 0.05, 1.1, 8), wood, x, 0.65, 0.95, g);
        mesh(RB(2.0, 0.75, 0.05, 0.01), winMat(), -0.45, 0.68, 0.51, g);
        mesh(RB(0.55, 0.95, 0.06, 0.02), wood, 0.85, 0.6, 0.51, g);
        pool();
      } else {                    // Modern
        mesh(RB(3.0, 1.2, 2.0, 0.03), wall, -0.3, 0.6, -0.3, g);
        mesh(RB(2.0, 1.0, 1.6, 0.03), wall, 0.6, 1.7, -0.5, g);
        mesh(RB(3.2, 0.08, 2.2, 0.02), M(0x5d5650), -0.3, 1.24, -0.3, g); mesh(RB(2.2, 0.08, 1.8, 0.02), M(0x5d5650), 0.6, 2.24, -0.5, g);
        const glass = winMat(); mesh(RB(2.2, 0.8, 0.04, 0.01), glass, -0.5, 0.6, 0.72, g); mesh(RB(1.5, 0.6, 0.04, 0.01), glass, 0.6, 1.75, 0.32, g);
        mesh(RB(0.9, 1.2, 0.06, 0.02), wood, 1.15, 0.6, 0.72, g);
        pool();
      }
      return g;
    }
    // ---- mansions (Royal Heights)
    function mansion(model, paint, r) {
      const g = new THREE.Group(), wall = M(PAINT(paint), { roughness: 0.6 }), roof = M(0x5f6b72, { roughness: 0.6 }), col = M(0xf7f2ea);
      if (model === 1) {          // Contemporary: long glass boxes
        const dark = M(0x47423e, { roughness: 0.5 });
        mesh(RB(4.4, 1.2, 2.2, 0.03), wall, 0, 0.6, -0.5, g);
        mesh(RB(3.0, 1.1, 2.0, 0.03), wall, 0.6, 1.75, -0.7, g);
        mesh(RB(1.4, 0.9, 1.4, 0.03), wall, -0.9, 2.8, -0.9, g);
        mesh(RB(4.6, 0.08, 2.4, 0.02), dark, 0, 1.24, -0.5, g); mesh(RB(3.2, 0.08, 2.2, 0.02), dark, 0.6, 2.34, -0.7, g); mesh(RB(1.6, 0.08, 1.6, 0.02), dark, -0.9, 3.28, -0.9, g);
        const gl = winMat(); mesh(RB(3.6, 0.8, 0.04, 0.01), gl, -0.2, 0.62, 0.62, g); mesh(RB(2.6, 0.7, 0.04, 0.01), gl, 0.6, 1.75, 0.32, g); mesh(RB(1.0, 0.6, 0.04, 0.01), winMat(), -0.9, 2.8, -0.18, g);
        const p = mesh(RB(2.6, 0.06, 1.0, 0.03), M(0x8fb7c4, { roughness: 0.1, metalness: 0.2 }), 0, 0.04, 1.6, g); p.castShadow = false;
        mesh(RB(2.9, 0.04, 1.3, 0.02), M(0xe8e0d2), 0, 0.02, 1.6, g);
      } else if (model === 2) {   // Chateau: tall body, steep slate roofs, corner towers
        mesh(RB(3.0, 2.3, 2.0, 0.04), wall, 0, 1.15, -0.4, g);
        const h1 = hip(3.3, 1.4, 2.3, roof); h1.position.set(0, 3.0, -0.4); g.add(h1);
        for (const sx of [-1, 1]) {
          mesh(CYL(0.55, 0.55, 2.8, 20), wall, sx * 1.75, 1.4, 0.2, g);
          mesh(new THREE.ConeGeometry(0.68, 1.4, 20), roof, sx * 1.75, 3.5, 0.2, g);
          for (const y of [0.9, 1.9]) mesh(RB(0.3, 0.42, 0.05, 0.02), winMat(), sx * 1.75, y, 0.76, g);
        }
        mesh(RB(0.6, 1.0, 0.06, 0.02), M(0x4a3a2c), 0, 0.5, 0.62, g);
        for (const x of [-0.85, 0.85]) for (const y of [0.7, 1.7]) mesh(RB(0.42, 0.5, 0.05, 0.02), winMat(), x, y, 0.62, g);
        put("pavement-fountain", 0, 0, 1.75, 1.3, 0, g);
      } else {                    // Classic: portico with columns
        mesh(RB(2.6, 2.2, 2.0, 0.04), wall, 0, 1.1, -0.4, g);
        for (const sx of [-1, 1]) { mesh(RB(1.4, 1.5, 1.7, 0.04), wall, sx * 1.95, 0.75, -0.25, g); const rf = gable(1.6, 0.7, 1.9, roof); rf.position.set(sx * 1.95, 1.5, -0.25); g.add(rf); }
        const rf = gable(2.9, 1.1, 2.2, roof); rf.position.set(0, 2.2, -0.4); g.add(rf);
        for (let i = 0; i < 4; i++) mesh(CYL(0.08, 0.08, 1.6, 12), col, -0.75 + i * 0.5, 0.8, 0.8, g);
        const pr = gable(2.0, 0.5, 0.9, M(0xf2ede4)); pr.position.set(0, 1.6, 0.75); g.add(pr);
        mesh(RB(2.0, 0.08, 0.9, 0.02), col, 0, 1.6, 0.75, g);
        mesh(RB(0.5, 0.9, 0.06, 0.02), M(0x4a3a2c), 0, 0.45, 0.62, g);
        for (const x of [-1.95, 1.95]) for (const y of [0.55, 1.1]) mesh(RB(0.5, 0.32, 0.05, 0.02), winMat(), x, y, 0.62, g);
        for (const x of [-0.7, 0.7]) for (const y of [1.0, 1.7]) mesh(RB(0.4, 0.38, 0.05, 0.02), winMat(), x, y, 0.62, g);
        put("pavement-fountain", 0, 0, 1.75, 1.3, 0, g);
      }
      return g;
    }
    // ---- apartment blocks (Old Town rents rooms, Suburb sells flats). Every window is one unit:
    // lived-in windows have curtains by day and glow in the evening, empty ones stay dark.
    const BLOCK_PAINT = { apartment: [0xc49a84, 0xb8a490, 0xd2c2ad, 0xa9a59a], flat: [0xe6dccb, 0xd8cbb8, 0xcfd3c8, 0xe2d0c4] };
    function block(kind, r, occ, youUnit) {
      const g = new THREE.Group(), flat = kind === "flat";
      const floors = flat ? 3 : 4, cols = 3, fh = flat ? 0.78 : 0.68, W = flat ? 1.95 : 1.85, D = 1.55, H = floors * fh + 0.25;
      const wall = M(pick(r, BLOCK_PAINT[kind]), { roughness: 0.9 }), trim = M(0xf1ebe1, { roughness: 0.8 }), dark = M(0x58616a, { roughness: 0.3 });
      mesh(RB(W, H, D, 0.04), wall, 0, H / 2, -0.15, g);
      mesh(RB(W + 0.1, 0.12, D + 0.1, 0.03), trim, 0, H + 0.06, -0.15, g);              // parapet
      for (let f = 1; f < floors; f++) mesh(RB(W + 0.02, 0.04, D + 0.02, 0.01), trim, 0, 0.12 + f * fh, -0.15, g);
      mesh(RB(0.36, 0.55, 0.05, 0.02), M(0x5a4636), 0, 0.3, D / 2 - 0.13, g);           // front door
      mesh(RB(0.6, 0.04, 0.3, 0.01), trim, 0, 0.62, D / 2 - 0.02, g);
      const front = D / 2 - 0.13, units = [];
      for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
        if (f === 0 && c === 1) continue;                                                  // the door takes this spot
        const x = (c - 1) * (W / 3), y = 0.12 + f * fh + fh * 0.5, u = units.length;
        const lived = u === youUnit || (occ ? occ[u] : r() < 0.8);
        let m;
        if (lived) { m = M(0xd9c7a6, { roughness: 0.7, emissive: 0xffc98a, emissiveIntensity: 0 }); lit.push(m); } else m = dark;
        mesh(RB(0.36, fh * 0.48, 0.04, 0.01), m, x, y, front + 0.02, g);
        if (flat && f > 0) { mesh(RB(0.5, 0.04, 0.22, 0.01), trim, x, y - fh * 0.3, front + 0.12, g); mesh(RB(0.5, 0.16, 0.02, 0.01), trim, x, y - fh * 0.2, front + 0.22, g); }
        if (lived && !flat && r() < 0.3) mesh(RB(0.3, 0.07, 0.08, 0.02), M(0x7d9a6c), x, y - fh * 0.28, front + 0.07, g); // window plants
        if (u === youUnit) { const fr = mesh(RB(0.46, fh * 0.6, 0.03, 0.01), F(0xc2704f), x, y, front + 0.005, g); fr.castShadow = false; g.userData.youY = y; }
        units.push(lived);
      }
      if (flat) for (let k = 0; k < 3; k++) mesh(SPH(0.12, 10, 8), M(0x7d9a6c, { roughness: 1 }), -0.6 + k * 0.6, H + 0.2, -0.3, g);  // roof terrace plants
      else mesh(RB(0.4, 0.3, 0.4, 0.02), M(0x8a8f94), 0.45, H + 0.2, -0.5, g);           // water tank
      g.userData.units = units; return g;
    }
    // one home for a lot, set back from the street the right amount for its tier
    function home(kind, model, paint, r) {
      if (kind === "house") { const h = familyHouse(model % 3, paint, r); h.position.z = -0.35; return h; }
      if (kind === "villa") { const h = villa(model % 3, paint, r); h.position.z = -0.5; return h; }
      if (kind === "mansion") { const h = mansion(model % 3, paint, r); h.position.z = -0.9; return h; }
      return block(kind === "flat" ? "flat" : "apartment", r, null, -1);
    }
    // bare land: soil, corner pegs and string, so it reads as a plot waiting for someone
    function emptyLot(H, price, parent) {
      const s = H.lot - 0.5, soil = mesh(RB(s, 0.04, s, 0.03), M(0xb3b48a, { roughness: 1 }), 0, 0.02, 0, parent); soil.castShadow = false;
      const tuft = M(0x8f9c6f, { roughness: 1 }), rr = rnd("rumput" + H.id + price);
      for (let k = 0; k < 7; k++) mesh(new THREE.ConeGeometry(0.07, 0.16, 5), tuft, (rr() - 0.5) * (s - 0.4), 0.1, (rr() - 0.5) * (s - 0.4), parent);
      const peg = M(0xe9e2d6), str = M(0xd9a06f, { roughness: 0.6 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(RB(0.06, 0.3, 0.06, 0.01), peg, sx * s / 2, 0.15, sz * s / 2, parent);
      for (const sz of [-1, 1]) mesh(new THREE.BoxGeometry(s, 0.012, 0.012), str, 0, 0.26, sz * s / 2, parent);
      for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.012, 0.012, s), str, sx * s / 2, 0.26, 0, parent);
      const f = forSale(price); f.position.set(s / 2 - 0.5, 0, s / 2 - 0.25); parent.add(f);
    }
    // a home going up: soil, the house cut off at today's height, scaffolding, bricks and a worker
    function site(H, h, start, done, parent, lx, lz) {
      const s = H.lot - 0.5, soil = mesh(RB(s, 0.05, s, 0.03), M(0xb49a7b, { roughness: 1 }), 0, 0.02, 0, parent); soil.castShadow = false;
      parent.add(h); parent.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(h), top = box.max.y;
      const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.1);
      h.traverse(o => { if (!o.material) return; o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); for (const m of [].concat(o.material)) { m.clippingPlanes = [plane]; m.clipShadows = true; m.side = THREE.DoubleSide; } });
      // scaffolding around the footprint, in local lot space
      const lb = box.clone().applyMatrix4(new THREE.Matrix4().copy(parent.matrixWorld).invert());
      const pole = M(0x8a8f94, { roughness: 0.5, metalness: 0.3 }), plank = M(0xc2a679, { roughness: 0.9 });
      const x0 = lb.min.x - 0.12, x1 = lb.max.x + 0.12, z0 = lb.min.z - 0.12, z1 = lb.max.z + 0.12, H2 = top + 0.25;
      const scaf = new THREE.Group(); parent.add(scaf);
      const nx = Math.max(2, Math.round((x1 - x0) / 0.9)), nz = Math.max(2, Math.round((z1 - z0) / 0.9));
      for (let i = 0; i <= nx; i++) for (const z of [z0, z1]) mesh(CYL(0.018, 0.018, H2, 6), pole, x0 + (x1 - x0) * i / nx, H2 / 2, z, scaf);
      for (let i = 1; i < nz; i++) for (const x of [x0, x1]) mesh(CYL(0.018, 0.018, H2, 6), pole, x, H2 / 2, z0 + (z1 - z0) * i / nz, scaf);
      for (let y = 0.6; y < H2; y += 0.6) { for (const z of [z0, z1]) mesh(RB(x1 - x0, 0.025, 0.1, 0.01), plank, (x0 + x1) / 2, y, z, scaf); for (const x of [x0, x1]) mesh(RB(0.1, 0.025, z1 - z0, 0.01), plank, x, y, (z0 + z1) / 2, scaf); }
      // bricks and a cone or two by the street
      const brick = M(0xb0705a, { roughness: 0.9 });
      mesh(RB(0.5, 0.06, 0.4, 0.01), plank, -s / 2 + 0.45, 0.06, s / 2 - 0.35, parent);
      for (let i = 0; i < 3; i++) mesh(RB(0.44, 0.1, 0.34, 0.01), brick, -s / 2 + 0.45, 0.14 + i * 0.1, s / 2 - 0.35, parent);
      for (const x of [0.1, 0.55]) mesh(new THREE.ConeGeometry(0.07, 0.22, 10), M(0xd08a5a), x, 0.11, s / 2 - 0.15, parent);
      if (H.kind === "mansion") {   // a small crane for the big ones
        const crane = M(0xd4a853, { roughness: 0.6 });
        mesh(RB(0.12, 5.2, 0.12, 0.01), crane, x1 + 0.35, 2.6, z0 + 0.3, parent);
        mesh(RB(3.4, 0.1, 0.1, 0.01), crane, x1 + 0.35 - 1.2, 5.2, z0 + 0.3, parent);
        mesh(CYL(0.01, 0.01, 1.6, 4), pole, x1 + 0.35 - 2.6, 4.4, z0 + 0.3, parent);
      }
      const w = walker(0xe0b07a); scene.remove(w); parent.add(w); w.scale.setScalar(0.85); w.position.set(s / 2 - 0.7, 0, 0.2);
      mesh(CYL(0.15, 0.17, 0.09, 14), M(0xe8b84a, { roughness: 0.4 }), 0, 0.7, 0, w);
      sites.push({ plane, start, done, top, worker: w });
    }
    function siteProgress(S) { const now = env.now(); return Math.max(0.04, Math.min(1, (now - S.start) / Math.max(0.01, S.done - S.start))); }
    function forSale(price) {
      const g = new THREE.Group();
      mesh(CYL(0.04, 0.04, 0.9, 8), M(0x6b4f3c), 0, 0.45, 0, g);
      const tex = canvasTex((c, w, h) => { c.fillStyle = "#F7F2EA"; c.fillRect(0, 0, w, h); c.fillStyle = "#C2704F"; c.fillRect(0, 0, w, 34); c.fillStyle = "#fff"; c.font = "800 22px Manrope, sans-serif"; c.textAlign = "center"; c.fillText("FOR SALE", w / 2, 25); c.fillStyle = "#2E2A26"; c.font = "700 20px Manrope, sans-serif"; c.fillText(price, w / 2, 70); }, 160, 96);
      mesh(new THREE.BoxGeometry(0.75, 0.45, 0.03), [M(0xf7f2ea), M(0xf7f2ea), M(0xf7f2ea), M(0xf7f2ea), M(0xffffff, { map: tex }), M(0xf7f2ea)], 0, 0.85, 0.03, g);
      return g;
    }
    function lamp(x, z) {
      mesh(CYL(0.035, 0.05, 1.5, 8), M(0x3a332d, { roughness: 0.5 }), x, 0.75, z);
      const head = mesh(SPH(0.1, 12, 8), M(0xfff1d6, { emissive: 0xffc98a, emissiveIntensity: 0 }), x, 1.55, z); lit.push(head.material);
    }
    function hedge(w, d, x, z, parent) { mesh(RB(w, 0.35, d, 0.12), M(0x6f8a68, { roughness: 1 }), x, 0.17, z, parent); }
    function tree(x, z, s, parent) { const t = put(pick(Math.random, ["grass-trees", "grass-trees-tall"]), x, 0, z, s, Math.random() * 6, parent); return t; }

    // ---------------------------------------------------------------- town square and public places
    const board = (text, w, h, bg = "#2E2A26", fg = "#F7F2EA") => {
      const tex = canvasTex((c, cw, ch) => {
        c.fillStyle = bg; c.fillRect(0, 0, cw, ch); c.fillStyle = fg; c.textAlign = "center"; c.textBaseline = "middle";
        let fs = Math.round(ch * 0.55); do { c.font = `800 ${fs}px Manrope, sans-serif`; fs -= 2; } while (c.measureText(text).width > cw * 0.9 && fs > 8);
        c.fillText(text, cw / 2, ch / 2 + 2);
      }, 512, Math.round(512 * h / w));
      return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, envMapIntensity: 0.4 }));
    };
    const bench = (x, z, ry, parent) => { const b = new THREE.Group(), wd = M(0xa47a55), ir = M(0x3a332d); mesh(RB(0.6, 0.05, 0.2, 0.01), wd, 0, 0.22, 0, b); mesh(RB(0.6, 0.18, 0.04, 0.01), wd, 0, 0.36, -0.09, b); for (const sx of [-1, 1]) mesh(RB(0.04, 0.22, 0.18, 0.01), ir, sx * 0.26, 0.11, 0, b); b.position.set(x, 0, z); b.rotation.y = ry; parent.add(b); };
    // the clock on the tower shows the player's real time, like everything else in town
    let clockTex = null, clockMin = -1;
    function drawClock() {
      const now = new Date(), m = now.getHours() * 60 + now.getMinutes(); if (m === clockMin || !clockTex) return; clockMin = m;
      const c = clockTex.image.getContext("2d"), w = clockTex.image.width, R = w / 2;
      c.fillStyle = "#F7F2EA"; c.fillRect(0, 0, w, w); c.strokeStyle = "#2E2A26"; c.lineWidth = 8; c.beginPath(); c.arc(R, R, R - 10, 0, 7); c.stroke();
      c.fillStyle = "#2E2A26"; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; c.fillRect(R + Math.sin(a) * (R - 26) - 4, R - Math.cos(a) * (R - 26) - 4, 8, 8); }
      const hand = (a, len, wd) => { c.lineWidth = wd; c.lineCap = "round"; c.beginPath(); c.moveTo(R, R); c.lineTo(R + Math.sin(a) * len, R - Math.cos(a) * len); c.stroke(); };
      hand((m % 720) / 720 * Math.PI * 2, R * 0.45, 10); hand((m % 60) / 60 * Math.PI * 2, R * 0.7, 6);
      clockTex.needsUpdate = true;
    }
    function townSquare(parent) {
      const pave = mesh(RB(5.6, 0.06, 8.6, 0.03), M(0xd8cfc0, { roughness: 1 }), 0, 0.03, 0, parent); pave.castShadow = false;
      for (let k = -3; k <= 3; k++) mesh(new THREE.BoxGeometry(5.6, 0.005, 0.03), M(0xc9bfae), 0, 0.065, k * 1.2, parent);
      put("pavement-fountain", 0.4, 0.05, 1.2, 2.6, 0, parent);
      // clock tower at the back of the square
      const tw = new THREE.Group(); tw.position.set(1.4, 0, -3.0); parent.add(tw);
      const stone = M(0xe6dccb, { roughness: 0.8 }), roofM = M(0x5f6b72, { roughness: 0.6 });
      mesh(RB(1.3, 0.5, 1.3, 0.03), M(0xcfc3b0), 0, 0.25, 0, tw); mesh(RB(1.05, 4.6, 1.05, 0.03), stone, 0, 2.8, 0, tw);
      mesh(RB(1.2, 0.12, 1.2, 0.02), M(0xcfc3b0), 0, 5.1, 0, tw);
      const cap = hip(1.5, 1.2, 1.5, roofM); cap.position.set(0, 5.75, 0); tw.add(cap);
      mesh(CYL(0.02, 0.02, 0.6, 6), M(0x3a332d), 0, 6.6, 0, tw);
      if (!clockTex) { clockTex = canvasTex(() => {}, 256, 256); }
      clockMin = -1; drawClock();
      const face = M(0xffffff, { map: clockTex, roughness: 0.6, emissive: 0xffe2b0, emissiveIntensity: 0, emissiveMap: clockTex }); lit.push(face);
      for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.38, 32), face); const a = k * Math.PI / 2; f.position.set(Math.sin(a) * 0.53, 4.3, Math.cos(a) * 0.53); f.rotation.y = a; tw.add(f); }
      for (const [x, z, ry] of [[2.2, -1.6, -Math.PI / 2], [2.2, 3.4, -Math.PI / 2], [-2.2, 3.4, Math.PI / 2], [-1.2, -3.6, 0]]) bench(x, z, ry, parent);
      for (const [x, z] of [[2.1, -3.7], [-2.2, 1.0], [2.1, 4.0], [-2.2, 4.1]]) tree(x, z, 1.5, parent);
      for (const [x, z] of [[0.4, -1.6], [0.4, 4.0]]) { mesh(RB(1.4, 0.18, 0.6, 0.06), M(0x9b8b7c), x, 0.09, z, parent); for (let k = 0; k < 5; k++) mesh(SPH(0.09, 8, 6), M(pick(Math.random, [0xd9a06f, 0xe3cfc4, 0xc2704f, 0xf1ebe1])), x - 0.5 + k * 0.25, 0.24, z, parent); }
    }
    function facility(c, parent, len) {
      const g = new THREE.Group(); parent.add(g);
      if (c.id === "cafe") {
        mesh(RB(2.2, 1.1, 1.5, 0.03), M(0xe3cfc4), 0, 0.55, -0.6, g); mesh(RB(2.3, 0.1, 1.6, 0.02), M(0x6b4f3c), 0, 1.15, -0.6, g);
        const stripes = canvasTex((cx, w, h) => { for (let k = 0; k < 8; k++) { cx.fillStyle = k % 2 ? "#F7F2EA" : "#C2704F"; cx.fillRect(k * w / 8, 0, w / 8, h); } }, 128, 32);
        const aw = mesh(RB(2.2, 0.05, 0.6, 0.01), M(0xffffff, { map: stripes }), 0, 0.95, 0.38, g); aw.rotation.x = 0.35;
        mesh(RB(1.5, 0.55, 0.04, 0.01), winMat(), -0.25, 0.55, 0.16, g); mesh(RB(0.36, 0.75, 0.05, 0.01), M(0x6b4f3c), 0.8, 0.38, 0.16, g);
        const sg = board("CAFÉ", 1.0, 0.26, "#2E2A26", "#F2D3B3"); sg.position.set(0, 1.3, 0.17); g.add(sg);
        for (const x of [-0.6, 0.6]) { mesh(CYL(0.22, 0.22, 0.03, 16), M(0xf1ebe1), x, 0.36, 1.05, g); mesh(CYL(0.02, 0.02, 0.36, 6), M(0x3a332d), x, 0.18, 1.05, g); mesh(CYL(0.015, 0.015, 0.9, 6), M(0x3a332d), x, 0.6, 1.05, g); mesh(new THREE.ConeGeometry(0.5, 0.22, 12), M(0xe8e0d2), x, 1.05, 1.05, g); bench(x, 1.45, Math.PI, g); }
      } else if (c.id === "park") {
        const gr = mesh(RB(len - 0.3, 0.05, 3.4, 0.03), M(0x9fb487, { roughness: 1 }), 0, 0.03, -0.2, g); gr.castShadow = false;
        mesh(RB(0.5, 0.055, 3.4, 0.02), M(0xddd3c4), 0, 0.035, -0.2, g).castShadow = false;
        for (const [x, z] of [[-1.8, -1.4], [1.9, -1.3], [-1.9, 1.1], [1.8, 1.2], [-0.9, -1.6]]) tree(x, z, 1.6, g);
        const ir = M(0xc2704f, { roughness: 0.5, metalness: 0.2 }), pl = M(0xd4a853, { roughness: 0.6 });
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(CYL(0.03, 0.03, 0.9, 6), ir, 1.0 + sx * 0.45, 0.45, -0.1 + sz * 0.12, g);   // swing
        mesh(CYL(0.03, 0.03, 1.0, 6), ir, 1.0, 0.9, -0.1, g).rotation.z = Math.PI / 2;
        for (const x of [0.8, 1.2]) mesh(RB(0.18, 0.03, 0.12, 0.01), pl, x, 0.32, -0.1, g);
        const sl = mesh(RB(0.3, 0.04, 1.1, 0.01), pl, -1.0, 0.4, 0.0, g); sl.rotation.x = 0.6; mesh(RB(0.36, 0.8, 0.36, 0.02), ir, -1.0, 0.4, -0.55, g);  // slide
        bench(0.6, 1.2, Math.PI, g); bench(-0.6, 1.2, Math.PI, g);
      } else if (c.id === "gym") {
        mesh(RB(3.2, 1.4, 1.9, 0.03), M(0xb9c0c6), 0, 0.7, -0.5, g); mesh(RB(3.3, 0.1, 2.0, 0.02), M(0x47423e), 0, 1.45, -0.5, g);
        mesh(RB(2.6, 0.7, 0.04, 0.01), winMat(), -0.1, 0.65, 0.46, g); mesh(RB(0.45, 0.85, 0.05, 0.01), M(0x47423e), 1.25, 0.43, 0.46, g);
        const sg = board("GYM", 0.9, 0.3, "#C2704F", "#FFFFFF"); sg.position.set(-0.6, 1.2, 0.47); g.add(sg);
      } else {
        const wall = M(0xefe6d6), roofM = M(0xa8624a, { roughness: 0.7 });
        mesh(RB(3.6, 1.5, 1.5, 0.04), wall, 0, 0.75, -0.7, g);
        const rf = gable(3.9, 0.7, 1.7, roofM); rf.rotation.y = Math.PI / 2; rf.scale.set(1, 1, 1); rf.position.set(0, 1.5, -0.7); rf.rotation.y = 0; g.add(rf);
        mesh(RB(0.9, 1.0, 0.5, 0.03), wall, 0, 0.5, 0.2, g); const pr = gable(1.1, 0.45, 0.6, roofM); pr.position.set(0, 1.0, 0.2); g.add(pr);
        mesh(RB(0.4, 0.65, 0.05, 0.01), M(0x6b4f3c), 0, 0.33, 0.46, g);
        for (const x of [-1.4, -0.85, 0.85, 1.4]) for (const y of [0.45, 1.1]) mesh(RB(0.36, 0.38, 0.04, 0.01), winMat(), x, y, 0.06, g);
        const sg = board("SCHOOL", 0.8, 0.18, "#F7F2EA", "#2E2A26"); sg.position.set(0, 0.85, 0.46); g.add(sg);
        mesh(CYL(0.02, 0.02, 2.0, 6), M(0xe9e2d6), 1.9, 1.0, 1.0, g); mesh(RB(0.45, 0.28, 0.01, 0.01), M(0xc2704f), 2.13, 1.82, 1.0, g);
      }
      return g;
    }
    // a public place that hasn't opened yet: fenced plot and a board saying how many homes it needs
    function lockedPlot(c, parent, len, count) {
      const s = mesh(RB(len - 0.4, 0.04, 3.2, 0.03), M(0xb49a7b, { roughness: 1 }), 0, 0.02, -0.2, parent); s.castShadow = false;
      const post = M(0xe9e2d6), rail = M(0xd9a06f, { roughness: 0.6 }), w = len - 0.5, d = 3.2;
      for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 4) for (const z of [-d / 2 - 0.2, d / 2 - 0.2]) mesh(RB(0.06, 0.45, 0.06, 0.01), post, x, 0.22, z, parent);
      for (const z of [-d / 2 - 0.2, d / 2 - 0.2]) mesh(new THREE.BoxGeometry(w, 0.04, 0.03), rail, 0, 0.36, z, parent);
      for (const x of [-w / 2, w / 2]) mesh(new THREE.BoxGeometry(0.03, 0.04, d), rail, x, 0.36, -0.2, parent);
      const sg = board(`${c.name.toUpperCase()} · ${count}/${c.need} HOMES`, 1.5, 0.28, "#F7F2EA", "#2E2A26");
      sg.position.set(0, 0.75, d / 2 - 0.15); parent.add(sg); mesh(RB(0.05, 0.6, 0.05, 0.01), M(0x6b4f3c), 0, 0.3, d / 2 - 0.2, parent);
    }

    // ---------------------------------------------------------------- cars
    const CAR_COLS = [0xb86f52, 0x6d7790, 0xe9e2d6, 0x3a332d, 0x8fa287, 0xa9adb3];
    function car(kind, r) {
      const g = new THREE.Group(), paint = M(kind === "supercar" ? 0xd4a853 : pick(r, CAR_COLS), { roughness: 0.3, metalness: 0.3 });
      const tyre = M(0x2a2624, { roughness: 0.9 }), glass = M(0x3d4650, { roughness: 0.1, metalness: 0.5 });
      const wheel = (x, z, rr = 0.13) => { const w = mesh(CYL(rr, rr, 0.1, 16), tyre, x, rr, z, g); w.rotation.z = Math.PI / 2; };
      if (kind === "scooter") {
        mesh(RB(0.22, 0.28, 0.7, 0.08), paint, 0, 0.3, 0, g); mesh(RB(0.2, 0.08, 0.3, 0.04), M(0x3a332d), 0, 0.48, -0.12, g);
        mesh(CYL(0.02, 0.02, 0.4, 6), M(0x3a332d), 0, 0.55, 0.3, g); wheel(0, 0.28, 0.11); wheel(0, -0.28, 0.11);
      } else if (kind === "sedan") {
        mesh(RB(0.78, 0.32, 1.6, 0.1), paint, 0, 0.3, 0, g); mesh(RB(0.68, 0.3, 0.85, 0.1), glass, 0, 0.58, -0.05, g);
        mesh(RB(0.7, 0.04, 0.8, 0.02), paint, 0, 0.74, -0.05, g);
        for (const x of [-0.37, 0.37]) for (const z of [-0.5, 0.5]) wheel(x, z);
      } else if (kind === "sports") {
        mesh(RB(0.82, 0.24, 1.7, 0.1), paint, 0, 0.24, 0, g); mesh(RB(0.62, 0.22, 0.7, 0.1), glass, 0, 0.44, -0.1, g);
        mesh(RB(0.78, 0.04, 0.12, 0.02), paint, 0, 0.5, -0.78, g);
        for (const x of [-0.39, 0.39]) for (const z of [-0.55, 0.55]) wheel(x, z, 0.12);
      } else {
        mesh(RB(0.9, 0.2, 1.85, 0.08), paint, 0, 0.2, 0, g); mesh(RB(0.6, 0.16, 0.6, 0.08), glass, 0, 0.36, 0.05, g);
        mesh(RB(0.86, 0.03, 0.2, 0.01), M(0x2a2624), 0, 0.42, -0.86, g);
        for (const x of [-0.43, 0.43]) for (const z of [-0.58, 0.6]) wheel(x, z, 0.12);
      }
      return g;
    }

    // ---------------------------------------------------------------- little creatures walking around
    function walker(color, you) {
      const g = new THREE.Group(), fur = M(color, { roughness: 0.95 });
      const b = mesh(SPH(0.32, 20, 14), fur, 0, 0.36, 0, g); b.scale.set(1, 0.95, 0.88);
      for (const sx of [-1, 1]) { mesh(SPH(0.1, 12, 8), fur, sx * 0.2, 0.62, 0, g); mesh(SPH(0.035, 8, 6), M(0x231c1a, { roughness: 0.2 }), sx * 0.1, 0.42, 0.27, g); }
      for (const sx of [-1, 1]) mesh(SPH(0.08, 10, 8), M(new THREE.Color(color).multiplyScalar(0.85).getHex()), sx * 0.13, 0.05, 0.08, g).scale.y = 0.5;
      if (you) { const mk = mesh(new THREE.ConeGeometry(0.1, 0.2, 4), F(0xc2704f), 0, 1.0, 0, g); mk.rotation.x = Math.PI; g.userData.marker = mk; }
      scene.add(g); return g;
    }

    // ---------------------------------------------------------------- labels
    function label(text, sub, x, y, z, accent, k = 1) {
      const tex = canvasTex((c, w, h) => {
        c.fillStyle = "rgba(251,248,243,.92)"; const r = 30; c.beginPath(); c.moveTo(r, 4); c.arcTo(w - 4, 4, w - 4, h - 4, r); c.arcTo(w - 4, h - 4, 4, h - 4, r); c.arcTo(4, h - 4, 4, 4, r); c.arcTo(4, 4, w - 4, 4, r); c.fill();
        c.textAlign = "center"; c.fillStyle = accent ? "#C2704F" : "#2E2A26"; c.font = "800 34px Manrope, sans-serif"; c.fillText(text, w / 2, sub ? 46 : 58);
        if (sub) { c.fillStyle = "#6F675E"; c.font = "600 22px Manrope, sans-serif"; c.fillText(sub, w / 2, 78); }
      }, 360, 96);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: false }));
      s.scale.set(4.6 * k, 1.2 * k, 1); s.position.set(x, y, z); s.renderOrder = 10; scene.add(s); signs.push(s); return s;
    }

    // ---------------------------------------------------------------- v73: the city around Main Street (kota.js)
    // Streets that run off the map, the river with bridges, the railway and station, named places, filler blocks and woods.
    // Everything here is the same for every player; only the homes on Main Street come from the family and the neighbours.
    const mapLabels = [];   // names that stay readable on the city map
    const TINTS = { home: [0xe8d9c4, 0xd9c2a8, 0xc9d1c4, 0xe3cfc1, 0xd5d8dc, 0xefe4d0], shop: [0xe6d3b8, 0xd8b99a, 0xc8d3d8, 0xe9c9b8, 0xd2c5e0, 0xf0dcc0],
      shed: [0xb9b1a6, 0xa8a39a, 0xc2b8a6, 0x9fa6a8, 0xb7a996, 0xaab2b0], tower: [0xbfc8cf, 0xa9b6c0, 0xd2d6d8, 0x9fb0bd, 0xc9c4bc, 0xb4c2c9] };
    const ROOFC = [0x8a5a44, 0x6d6460, 0x9b6b52, 0x5f6b72, 0x7a6a5a, 0x84624e];
    const TREEC = [0x6f8a5a, 0x7f9a62, 0x5f7d55, 0x8aa36a, 0x6a8560];
    let winTex = null;
    const windowsTex = () => winTex || (winTex = canvasTex((c, w, h) => {
      c.fillStyle = "#000"; c.fillRect(0, 0, w, h);
      for (let y = 8; y < h - 4; y += 16) for (let x = 6; x < w - 4; x += 14) { c.fillStyle = Math.random() < 0.6 ? "#ffd59a" : "#2a2622"; c.fillRect(x, y, 8, 10); }
    }, 128, 128));
    function mapLabel(text, sub, x, y, z, k = 0.8) { const s = label(text, sub, x, y, z, false, k); s.userData.map = true; s.userData.base = s.scale.clone(); s.userData.y0 = y; mapLabels.push(s); return s; }
    function inst(geo, mat, list, set) {
      if (!list.length) return null;
      const im = new THREE.InstancedMesh(geo, mat, list.length), m4 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
      list.forEach((b, i) => { const o = set(b); p.set(o.x, o.y || 0, o.z); s.set(o.sx, o.sy, o.sz); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.ry || 0); m4.compose(p, q, s); im.setMatrixAt(i, m4); col.setHex(o.c).convertSRGBToLinear(); im.setColorAt(i, col); });
      im.castShadow = im.receiveShadow = true; scene.add(im); return im;
    }
    const unitBox = () => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g; };
    function buildCity() {
      const roadM = M(0x6a6460, { roughness: 0.95 }), walkM = M(0xddd3c4, { roughness: 1 }), R = Kota.REACH;
      // ground everywhere, a touch under the Main Street blocks
      const gnd = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), M(0xb7b397, { roughness: 1 })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.02; gnd.receiveShadow = true; scene.add(gnd);
      const strip = (x, z, w, d, mat, y, h) => { const m = mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z); m.castShadow = false; return m; };
      for (const S of Kota.STREETS) {
        if (S.v) {
          const segs = S.id === "main" ? [[Kota.PLAZA, R], [Kota.ZMIN, -R]] : [[R, -R]];
          for (const [a, b] of segs) { const zc = (a + b) / 2, len = Math.abs(a - b); strip(S.at, zc, ROAD_W, len, roadM, 0.03, 0.06); for (const sx of [-1, 1]) strip(S.at + sx * (ROAD_W / 2 + WALK / 2), zc, WALK, len, walkM, 0.04, 0.08); }
        } else {
          for (const [a, b] of [[-R, -ROAD_W / 2], [ROAD_W / 2, R]]) { const xc = (a + b) / 2, len = Math.abs(a - b); strip(xc, S.at, len, ROAD_W, roadM, 0.031, 0.06); for (const sz of [-1, 1]) strip(xc, S.at + sz * (ROAD_W / 2 + WALK / 2), len, WALK, walkM, 0.041, 0.08); }
          // bridge rails over the river
          for (const sz of [-1, 1]) strip((Kota.RIVER.x0 + Kota.RIVER.x1) / 2, S.at + sz * (ROAD_W / 2 + WALK), Kota.RIVER.x1 - Kota.RIVER.x0 + 1.2, 0.12, M(0xe9e2d6), 0.3, 0.5);
        }
      }
      // river
      const water = new THREE.Mesh(new THREE.PlaneGeometry(Kota.RIVER.x1 - Kota.RIVER.x0, 2 * R), M(0x6fa9c4, { roughness: 0.25, metalness: 0.1 }));
      water.rotation.x = -Math.PI / 2; water.position.set((Kota.RIVER.x0 + Kota.RIVER.x1) / 2, 0.012, 0); scene.add(water);
      for (const x of [Kota.RIVER.x0, Kota.RIVER.x1]) strip(x, 0, 0.35, 2 * R, M(0xc9bfa8), 0.02, 0.1);
      // railway: ballast, two rails, the station platform
      strip(Kota.RAIL.x, 0, 2.4, 2 * R, M(0x8f857a), 0.035, 0.07);
      for (const sx of [-0.5, 0.5]) strip(Kota.RAIL.x + sx, 0, 0.09, 2 * R, M(0x5b5550, { roughness: 0.4, metalness: 0.4 }), 0.1, 0.06);
      // named places
      for (const P of Kota.PLACES) if (P.kind !== "square") placeModel(P);
      // filler blocks: one draw call per kind
      const F = Kota.fillers(), bl = F.buildings;
      const plain = bl.filter(b => b.kind !== "tower"), towers = bl.filter(b => b.kind === "tower"), roofed = bl.filter(b => b.kind === "home" || b.kind === "shop");
      inst(unitBox(), M(0xffffff, { roughness: 0.9 }), plain, b => ({ x: b.x, z: b.z, sx: b.w, sy: b.h, sz: b.d, c: TINTS[b.kind][b.tint] }));
      const tm = M(0xffffff, { roughness: 0.6, emissive: 0xffc98a, emissiveMap: windowsTex(), emissiveIntensity: 0 }); lit.push(tm);
      inst(unitBox(), tm, towers, b => ({ x: b.x, z: b.z, sx: b.w, sy: b.h, sz: b.d, c: TINTS.tower[b.tint] }));
      const pyr = new THREE.ConeGeometry(0.71, 1, 4); pyr.rotateY(Math.PI / 4); pyr.translate(0, 0.5, 0);
      inst(pyr, M(0xffffff, { roughness: 0.8 }), roofed, b => ({ x: b.x, y: b.h, z: b.z, sx: b.w, sy: 0.4 + Math.min(b.w, b.d) * 0.22, sz: b.d, c: ROOFC[b.tint] }));
      const trunk = new THREE.CylinderGeometry(0.07, 0.1, 0.6, 5); trunk.translate(0, 0.3, 0);
      const crown = new THREE.IcosahedronGeometry(0.55, 0); crown.translate(0, 1.05, 0);
      inst(trunk, M(0xffffff), F.trees, t => ({ x: t.x, z: t.z, sx: t.s, sy: t.s, sz: t.s, c: 0x7a5a44 }));
      inst(crown, M(0xffffff, { roughness: 1, flatShading: true }), F.trees, t => ({ x: t.x, z: t.z, sx: t.s, sy: t.s * 1.1, sz: t.s, ry: t.x * 7, c: TREEC[Math.abs(Math.round(t.x * 3 + t.z)) % TREEC.length] }));
      // street names at the edge of town, district names for the map
      for (const S of Kota.STREETS) { if (S.id === "main") continue; const s = mapLabel(S.name, "", S.v ? S.at + 3 : -54, 0.9, S.v ? 36 : S.at - 1.4, 0.55); s.userData.street = true; }
      for (const B of Kota.BANDS) { const s = mapLabel(HOODS.find(h => h.id === B.id).name, "", 0, 4.2, B.zc, 0.7); s.userData.hood = true; }
      // the train: four cars, comes every few minutes (same moment for everyone, from the real clock)
      train = new THREE.Group(); scene.add(train);
      const body = M(0xefe6d6, { roughness: 0.5 }), band = M(0xc2704f), tw = M(0x8c9aa3, { roughness: 0.2, emissive: 0xffc98a, emissiveIntensity: 0 }); lit.push(tw);
      for (let k = 0; k < 4; k++) {
        const z = k * 4.6; mesh(RB(1.5, 1.4, 4.3, 0.18), body, 0, 0.95, z, train); mesh(new THREE.BoxGeometry(1.52, 0.18, 4.32), band, 0, 0.55, z, train);
        for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.02, 0.45, 3.4), tw, sx * 0.76, 1.15, z, train);
      }
      train.position.set(Kota.RAIL.x, 0, 400); train.userData.len = 4 * 4.6;
    }
    function placeModel(P) {
      const g = new THREE.Group(); g.position.set(P.x, 0, P.z); scene.add(g);
      const door = Kota.doorOf(P), face = Math.atan2(door.x - P.x, door.z - P.z);   // front faces the street with the door
      const front = new THREE.Group(); front.rotation.y = face; g.add(front);
      const W = Math.abs(Math.sin(face)) > 0.5 ? P.d : P.w, D = Math.abs(Math.sin(face)) > 0.5 ? P.w : P.d;   // width along the street
      // gable roof with the ridge along the street; depth = how deep the building is, z = where its middle sits
      const roofOn = (len, h, depth, y, col, z = 0) => { const rf = gable(depth, h, len, M(col, { roughness: 0.7 })); rf.rotation.y = Math.PI / 2; rf.position.set(0, y, z); front.add(rf); return rf; };
      if (P.kind === "office") {
        const m = M(0xffffff, { roughness: 0.5, emissive: 0xffc98a, emissiveMap: windowsTex(), emissiveIntensity: 0 }); m.color.setHex(0xc9d2d8).convertSRGBToLinear(); lit.push(m);
        mesh(new THREE.BoxGeometry(W, P.h, D), m, 0, P.h / 2, 0, front);
        mesh(new THREE.BoxGeometry(W + 0.3, 0.35, D + 0.3), M(0x7d858c), 0, P.h + 0.17, 0, front);
        const sg = board(P.name.toUpperCase(), W * 0.8, 0.5, "#2E2A26", "#F2D3B3"); sg.position.set(0, 1.4, D / 2 + 0.02); front.add(sg);
      } else if (P.kind === "school") {
        const wall = M(P.id === "academy" ? 0xd9c7ae : P.id === "arts" ? 0xe8d6c6 : 0xefe6d6);
        mesh(new THREE.BoxGeometry(W, P.h, D * 0.6), wall, 0, P.h / 2, -D * 0.2, front);
        roofOn(W + 0.4, P.h * 0.4, D * 0.6 + 0.4, P.h, P.id === "academy" ? 0x5f6b72 : 0xa8624a, -D * 0.2);
        const yard = mesh(new THREE.BoxGeometry(W, 0.04, D * 0.4), M(0xd8cdb8, { roughness: 1 }), 0, 0.02, D * 0.3, front); yard.castShadow = false;
        for (let x = -W / 2 + 0.8; x < W / 2 - 0.4; x += 1.1) for (const y of [P.h * 0.32, P.h * 0.72]) mesh(new THREE.BoxGeometry(0.6, 0.6, 0.05), winMat(), x, y, D * 0.1 + 0.01, front);
        const sg = board(P.name.toUpperCase(), Math.min(W * 0.8, 6), 0.42, "#F7F2EA", "#2E2A26"); sg.position.set(0, P.h * 0.92, D * 0.1 + 0.03); front.add(sg);
        mesh(CYL(0.04, 0.04, 3, 6), M(0xe9e2d6), W / 2 - 0.4, 1.5, D / 2 - 0.4, front); mesh(new THREE.BoxGeometry(0.7, 0.42, 0.02), M(0xc2704f), W / 2 - 0.05, 2.7, D / 2 - 0.4, front);
        if (P.track) {
          const tr = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 40), M(0xc0674a, { roughness: 1, side: THREE.DoubleSide })); tr.rotation.x = -Math.PI / 2; tr.scale.set(1.7, 1, 1); tr.position.set(P.track.x, 0.03, P.track.z); tr.receiveShadow = true; scene.add(tr);
          const inF = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), M(0x8fb06a, { roughness: 1 })); inF.rotation.x = -Math.PI / 2; inF.scale.set(1.7, 1, 1); inF.position.set(tr.position.x, 0.025, tr.position.z); scene.add(inF);
        }
      } else if (P.kind === "park") {
        const lawn = mesh(RB(P.w, 0.05, P.d, 0.04), M(0x9cbf7a, { roughness: 1 }), 0, 0.025, 0, g); lawn.castShadow = false;
        const pond = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), M(0x6fa9c4, { roughness: 0.2 })); pond.rotation.x = -Math.PI / 2; pond.scale.set(1, 1.6, 1); pond.position.set(0.6, 0.06, 3); g.add(pond);
        mesh(new THREE.BoxGeometry(0.8, 0.055, P.d - 1), walkM2(), -2.6, 0.04, 0, g).castShadow = false;
        mesh(new THREE.BoxGeometry(P.w - 1, 0.055, 0.8), walkM2(), 0, 0.04, -5, g).castShadow = false;
        for (const [x, z, ry] of [[-1.8, -2, Math.PI / 2], [-1.8, 2, Math.PI / 2], [1, -6, 0], [3, -6, 0], [-3.4, -8, Math.PI / 2]]) bench(x, z, ry, g);
      } else if (P.kind === "market") {
        mesh(new THREE.BoxGeometry(W, P.h, D * 0.62), M(0xe3d4bd), 0, P.h / 2, -D * 0.19, front);
        roofOn(W + 0.6, 1.4, D * 0.62 + 0.6, P.h, 0x7a6a5a, -D * 0.19);
        const cols = [0xc2704f, 0x5f8a6e, 0xd4a853, 0x6d7790, 0xb86f8a];
        for (let k = 0; k < 5; k++) { const x = -W / 2 + 1.1 + k * (W - 2.2) / 4; mesh(RB(1.4, 0.7, 0.8, 0.03), M(0xb08d6a), x, 0.35, D * 0.26, front); const aw = mesh(RB(1.6, 0.06, 1.0, 0.02), M(cols[k]), x, 1.25, D * 0.26, front); aw.rotation.x = 0.25; for (const sx of [-0.7, 0.7]) mesh(CYL(0.03, 0.03, 1.2, 6), M(0x3a332d), x + sx, 0.6, D * 0.26 + 0.4, front); }
        const sg = board("BAZAAR", 3, 0.6, "#2E2A26", "#F2D3B3"); sg.position.set(0, P.h - 0.6, D * 0.12 + 0.02); front.add(sg);
      } else if (P.kind === "station") {
        mesh(new THREE.BoxGeometry(W, P.h, D), M(0xe6dccb), 0, P.h / 2, 0, front);
        roofOn(W + 0.5, 1.3, D + 0.5, P.h, 0x5f6b72);
        const sg = board("STATION", 3.2, 0.55, "#2E2A26", "#F7F2EA"); sg.position.set(0, P.h - 0.5, D / 2 + 0.02); front.add(sg);
        mesh(new THREE.BoxGeometry(1.8, 0.4, 16), M(0xcfc3b0), Kota.RAIL.x + 2.2 - P.x, 0.2, 0, g);   // platform beside the track
        mesh(new THREE.BoxGeometry(1.8, 0.08, 9), M(0x5f6b72), Kota.RAIL.x + 2.2 - P.x, 2.3, 0, g);
        for (const z of [-4, 0, 4]) mesh(CYL(0.05, 0.05, 2.1, 6), M(0x3a332d), Kota.RAIL.x + 2.9 - P.x, 1.25, z, g);
      }
      const hit = new THREE.Mesh(new THREE.BoxGeometry(P.w, Math.max(1.5, P.h), P.d), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(P.x, Math.max(0.75, P.h / 2), P.z); scene.add(hit);
      const entry = { hit, place: P }; lots.push(entry);
      entry.tag = mapLabel(P.name, PLACE_SUB[P.kind] || "", P.x, (P.h || 0.5) + (P.kind === "office" ? 1.2 : 1.8), P.z);
    }
    let _walk2 = null; const walkM2 = () => _walk2 || (_walk2 = M(0xddd3c4, { roughness: 1 }));
    const PLACE_SUB = { office: "Offices", school: "School", park: "Park", market: "Market", station: "Trains" };
    // ---------------------------------------------------------------- v73: townsfolk and your creature, on the real clock
    // Everyone has a day plan (kota.js): who walks, who sits in the park, who is inside. Near the camera they are little
    // creatures; on the city map they are dots. Only the nearest few get a full model ("full AI only for the near ones").
    const FOLK = [0xe8d8be, 0xa9adb3, 0xd99a6c, 0x9db8c9, 0x4d4a52, 0xe5bfbf];
    const folk = Kota.people(120);
    let TL = null, tlKey = "", pool = [], dots = null, train = null;
    let you = null, youG = null, youPin = null, youTag = null, youNow = null, youAt = -1, youLineDrawn = "";
    function clock() {
      const d = new Date(), sec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
      return { sec, dow: d.getDay(), day: Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 864e5) };
    }
    function plans(c) {
      const k = c.day + ":" + c.dow; if (k === tlKey && TL) return TL;
      tlKey = k; TL = folk.map(p => Kota.timeline(Kota.plan(p, c.day, c.dow), p.home, p.side)); return TL;
    }
    function buildLife(data) {
      pool = []; for (let i = 0; i < 26; i++) { const g = walker(FOLK[i % FOLK.length]); g.visible = false; g.userData.who = -1; pool.push(g); }
      dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 8, 6), F(0xf6ead6), folk.length); dots.count = 0; dots.frustumCulled = false; scene.add(dots);
      you = data.you || null; youNow = null; youAt = -1; youLineDrawn = "";
      youG = null; youPin = null; youTag = null;
      if (you) {
        youG = walker(you.color, true); youG.scale.setScalar(1.15); youG.visible = false;
        youPin = new THREE.Group(); scene.add(youPin);
        const pm = F(0xc2704f);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 16), pm); cone.rotation.x = Math.PI; cone.position.y = 0.35; youPin.add(cone);
        const ball = new THREE.Mesh(SPH(0.36, 20, 14), pm); ball.position.y = 0.85; youPin.add(ball);
        const eye = new THREE.Mesh(SPH(0.16, 14, 10), F(0xffffff)); eye.position.set(0, 0.88, 0.25); youPin.add(eye);
        youPin.visible = false;
      }
    }
    function youTagDraw(line) {
      if (youTag) { scene.remove(youTag); const i = signs.indexOf(youTag); if (i >= 0) signs.splice(i, 1); }
      youTag = label(you.name, line, 0, 0, 0, true, 0.8); youTag.userData.base = youTag.scale.clone(); youLineDrawn = line;
    }
    const smooth = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
    function updateLife(t, dt) {
      const c = clock(), T0 = plans(c), near = zoom < 0.56, d = distNow();
      // townsfolk
      const vis = [];
      for (let i = 0; i < folk.length; i++) { const L = Kota.locate(T0[i], c.sec, (i * 0.618) % 1); if (L.show) { L.i = i; L.d = Math.hypot(L.x - focusX, L.z - focusZ); vis.push(L); } }
      T.crowdNow = vis.length;
      if (near) {
        vis.sort((a, b) => a.d - b.d);
        const R = d * 1.1 + 6;
        pool.forEach((g, k) => {
          const L = vis[k]; if (!L || L.d > R) { g.visible = false; return; }
          g.visible = true;
          if (g.userData.who !== L.i) { g.userData.who = L.i; g.children[0].material.color.setHex(FOLK[folk[L.i].tint]).convertSRGBToLinear(); }
          const moving = L.mode !== "out", bob = moving ? Math.abs(Math.sin(t / 160 * 1.1 + L.i)) : Math.abs(Math.sin(t / 900 + L.i)) * 0.3;
          g.position.set(L.x, bob * 0.06, L.z); g.rotation.y = L.dir; g.scale.set(1 + bob * 0.04, 1 - bob * 0.05, 1);
        });
        dots.count = 0;
      } else {
        for (const g of pool) g.visible = false;
        const m4 = new THREE.Matrix4(), s = Math.max(1, d / 110);
        vis.forEach((L, k) => { m4.makeScale(s, s, s); m4.setPosition(L.x, 0.4 * s, L.z); dots.setMatrixAt(k, m4); });
        dots.count = vis.length; dots.instanceMatrix.needsUpdate = true;
      }
      // the train
      if (train) {
        const tr = Kota.trainAt(c.sec);
        train.visible = !!tr;
        if (tr) train.position.z = tr.z - train.userData.len / 2;   // cars sit at 0..len from the group, so this centres the train on tr.z
      }
      // your creature: plan refreshed every few seconds, position every frame
      if (!you) { T.you = null; return; }
      if (!youNow || t - youAt > 4000) { youAt = t; youNow = Kota.creatureNow(you.o, you.day, c.sec, T.homeDoor || Kota.PLACE.square.spot); }
      if (!youNow) { youG.visible = youPin.visible = false; if (youTag) youTag.visible = false; T.you = null; return; }
      const L = youNow.T ? Kota.locate(youNow.T, c.sec, 0.37) : youNow;
      const line = youNow.line;
      T.you = { line, at: L.at, show: !!L.show, away: !!youNow.away };
      if (line !== youLineDrawn) youTagDraw(line);
      const k = Math.max(1, d / 34), pinS = Math.max(1, d / 26);
      let px, pz, py;
      if (youNow.away) { youG.visible = youPin.visible = false; youTag.visible = false; return; }
      if (L.show) {
        const moving = L.mode !== "out", bob = moving ? Math.abs(Math.sin(t / 150)) : 0;
        youG.visible = near; youG.position.set(L.x, bob * 0.07, L.z); youG.rotation.y = L.dir;
        px = L.x; pz = L.z; py = near ? 1.5 : 0.6;
      } else {
        youG.visible = false;
        const P = L.at === "home" ? null : Kota.PLACE[L.at];
        px = P ? P.x : (T.homeX ?? Kota.PLACE.square.x); pz = P ? P.z : (T.homeZ ?? Kota.PLACE.square.z); py = P ? (P.h || 0.5) + 0.8 : (T.homeTall || 3) + 0.6;
      }
      T.youX = px; T.youZ = pz;
      youPin.visible = !near || !L.show;
      youPin.position.set(px, py + Math.sin(t / 320) * 0.12 * pinS, pz); youPin.scale.setScalar(pinS); youPin.rotation.y = t / 900;
      youTag.visible = true; youTag.position.set(px, py + (youPin.visible ? 1.9 * pinS : 1.0) + 0.6 * k, pz); youTag.scale.copy(youTag.userData.base).multiplyScalar(k);
    }
    // ---------------------------------------------------------------- layout
    function build(data) {
      // clear old content but keep lights
      for (const o of scene.children.slice()) if (o !== hemi && o !== sun && o !== sun.target) scene.remove(o);
      lots.length = 0; walkers.length = 0; signs.length = 0; mapLabels.length = 0; train = null; T.homeDoor = undefined; T.homeX = undefined; T.youX = undefined; lit.length = 0; sites.length = 0; T.homeMarker = null; T.homeZ = undefined; T.buildZ = undefined; previewG = null;
      const { npcs, player, prices } = data;
      let z = 0;
      const tierCount = {}; for (const n of npcs) tierCount[n.house] = (tierCount[n.house] || 0) + 1;
      // ---- the town square block, in front of Old Town
      {
        const homes = npcs.filter(n => n.house !== "rented").length + (player.house !== "rented" ? 1 : 0);
        T.homes = homes;
        const gw = 2 * (ROAD_W / 2 + WALK + 6.6), zc = PLAZA / 2;
        const gnd = mesh(new THREE.BoxGeometry(gw, 0.2, PLAZA), M(0xb9b596, { roughness: 1 }), 0, -0.1, zc); gnd.castShadow = false;
        const road = mesh(new THREE.BoxGeometry(ROAD_W, 0.06, PLAZA), M(0x6a6460, { roughness: 0.95 }), 0, 0.03, zc); road.castShadow = false;
        for (let dz = PLAZA - 0.6; dz > 0.3; dz -= 1.4) mesh(new THREE.BoxGeometry(0.07, 0.01, 0.6), F(0xe9e2d6), 0, 0.065, dz);
        for (const sx of [-1, 1]) { const w = mesh(RB(WALK, 0.08, PLAZA, 0.02), M(0xddd3c4, { roughness: 1 }), sx * (ROAD_W / 2 + WALK / 2), 0.04, zc); w.castShadow = false; }
        for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) lamp(sx * (ROAD_W / 2 + 0.12), 1.8 + k * 3.7 + (sx > 0 ? 1.8 : 0));
        const SQX = -(ROAD_W / 2 + WALK + 2.1);
        const sqG = new THREE.Group(); sqG.position.set(SQX, 0, 5.4); sqG.scale.setScalar(0.72); scene.add(sqG); townSquare(sqG);
        label("Town Square", "Clock shows your time", -2.4, 4.4, 8.8, false, 0.72);
        const sqHit = new THREE.Mesh(new THREE.BoxGeometry(4.1, 3, 6.3), new THREE.MeshBasicMaterial({ visible: false })); sqHit.position.set(SQX, 1.5, 5.4); scene.add(sqHit);
        lots.push({ hit: sqHit, square: true, homes });
        for (const c of CIVIC) {
          const open = homes >= c.need, x = c.side * (ROAD_W / 2 + WALK + 1.55);
          const cg = new THREE.Group(); cg.position.set(x, 0, c.z); cg.rotation.y = c.side > 0 ? -Math.PI / 2 + TURN * 0.6 : Math.PI / 2 - TURN * 0.6; cg.scale.setScalar(0.78); scene.add(cg);
          const inner = new THREE.Group(); inner.rotation.y = 0; cg.add(inner);
          if (open) facility(c, inner, c.len); else lockedPlot(c, inner, c.len, homes);
          label(c.name, open ? "Open" : `Opens at ${c.need} homes`, c.side * 2.8, 2.2, c.z, false, 0.62);
          const hit = new THREE.Mesh(new THREE.BoxGeometry(2.9, 3, c.len * 0.8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(x, 1.5, c.z); scene.add(hit);
          lots.push({ hit, civic: c, open, homes });
        }
      }
      HOODS.forEach((H, hi) => {
        const len = H.per * H.lot + GAP;
        const z0 = z, z1 = z - len; H.z0 = z0; H.z1 = z1; H.zc = (z0 + z1) / 2;
        // ground
        const gw = 2 * (ROAD_W / 2 + WALK + H.lot + 1.2);
        const gnd = mesh(new THREE.BoxGeometry(gw, 0.2, len), M(H.ground, { roughness: 1 }), 0, -0.1, (z0 + z1) / 2); gnd.castShadow = false;
        // road and sidewalks
        const road = mesh(new THREE.BoxGeometry(ROAD_W, 0.06, len), M(0x6a6460, { roughness: 0.95 }), 0, 0.03, (z0 + z1) / 2); road.castShadow = false;
        for (let dz = z0 - 0.6; dz > z1 + 0.3; dz -= 1.4) mesh(new THREE.BoxGeometry(0.07, 0.01, 0.6), F(0xe9e2d6), 0, 0.065, dz);
        for (let k = 0; k < H.per; k++) for (const sx of [-1, 1]) lamp(sx * (ROAD_W / 2 + 0.12), z0 - GAP / 2 - k * H.lot - (sx > 0 ? H.lot / 2 : 0));
        for (const sx of [-1, 1]) { const w = mesh(RB(WALK, 0.08, len, 0.02), M(0xddd3c4, { roughness: 1 }), sx * (ROAD_W / 2 + WALK / 2), 0.04, (z0 + z1) / 2); w.castShadow = false; }
        // Who is on which lot. The player's lots are where they chose; NPCs take the rest in order.
        // Homes being built show first so the street always has something going on.
        const slots = H.per * 2, occ = new Array(slots).fill(null);
        const claim = (who, want) => { let k = want >= 0 && want < slots && !occ[want] ? want : occ.findIndex(o => !o); if (k >= 0) occ[k] = who; return k; };
        if (player.house === H.id) claim(Object.assign({ you: true }, player), player.lot ? player.lot.lot : -1);
        if (player.build && player.build.id === H.id) claim(Object.assign({ you: true, building: true }, player), player.build.lot);
        const builders = npcs.filter(n => n.build && n.build.id === H.id).slice(0, Math.max(1, Math.floor(slots / 3)));
        for (const n of builders) claim(Object.assign({ building: true }, n), -1);
        for (const n of npcs) { if (n.house !== H.id) continue; if (claim(n, -1) < 0) break; }
        const anyone = occ.some(Boolean);
        for (let i = 0; i < slots; i++) {
          const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
          const lz = z0 - GAP / 2 - H.lot / 2 - k * H.lot, lx = side * (ROAD_W / 2 + WALK + H.lot / 2 + 0.2);
          const lotG = new THREE.Group(); lotG.position.set(lx, 0, lz); lotG.rotation.y = side > 0 ? -Math.PI / 2 + TURN : Math.PI / 2 - TURN; scene.add(lotG);
          const content = new THREE.Group(); lotG.add(content);
          const who = occ[i], r = rnd((who ? who.name : "kosong") + i + H.id);
          const bld = who && who.building ? (who.you ? player.build : who.build) : null;
          const model = who ? (who.you ? (bld || player.lot || { model: Math.floor(r() * 3) }).model : who.model) : 0;
          const paint = who ? (who.you ? (bld || player.lot || { paint: Math.floor(r() * 5) }).paint : who.paint) : 0;
          if (H.kind === "apartment" || H.kind === "flat") {
            // NPC homes in a block come from how full this tier is in the whole town
            const rb = rnd("blok" + H.id + i), full = H.kind === "apartment" ? 0.86 : Math.min(0.92, 0.45 + tierCount[H.id] / 900);
            const occ = Array.from({ length: 12 }, () => rb() < full);
            const blk = block(H.kind, r, occ, who && who.you ? 4 : -1); content.add(blk);
            if (who && who.you) T.youUnitY = blk.userData.youY;
            if (H.kind === "flat") hedge(1.8, 0.25, 0, 1.0, content);
            if (bld) for (let b2 = 0; b2 < 4; b2++) mesh(RB(0.28, 0.22, 0.28, 0.02), M(0xc9a77c, { roughness: 0.9 }), -0.6 + (b2 % 2) * 0.3, 0.11 + Math.floor(b2 / 2) * 0.22, 1.3, content);
          }
          else if (!anyone && i === 0 && (H.kind === "villa" || H.kind === "mansion")) {
            // nobody here yet: a show home so everyone sees what they are working toward
            content.add(home(H.kind, 0, 0, r));
            hedge(H.lot - 0.4, 0.3, 0, -H.lot / 2 + 0.2, content); const sg = forSale(""); sg.position.set(H.lot / 2 - 0.6, 0, H.lot / 2 - 0.5); content.add(sg);
            label("Show home", "Lot for sale", lx, H.kind === "villa" ? 3.4 : 4.2, lz, true);
          }
          else if (!who) emptyLot(H, prices[H.id], content);
          else if (bld) site(H, home(H.kind, model, paint, r), bld.start, bld.done, content, lx, lz);
          else {
            content.add(home(H.kind, model, paint, r));
            if (H.kind === "house") { hedge(0.25, 1.2, -1.4, 0.6, content); tree(1.2, 0.7, 1.2, content); }
            else if (H.kind === "villa") { hedge(H.lot - 0.4, 0.3, 0, -H.lot / 2 + 0.2, content); tree(-1.7, 1.4, 1.5, content); }
            else for (const sx of [-1, 1]) { hedge(0.3, H.lot - 1.2, sx * (H.lot / 2 - 0.3), 0, content); tree(sx * 2.0, 1.9, 1.5, content); }
          }
          if (who && who.car && !bld) { const c = car(who.car, r); c.position.set(H.lot / 2 - 0.45, 0, H.lot / 2 - 0.9); if (H.kind === "apartment" || H.kind === "flat") c.position.set(0.75, 0, 1.3); c.rotation.y = Math.PI / 2; content.add(c); }
          const tall = H.kind === "apartment" ? 3.6 : H.kind === "flat" ? 3.3 : H.kind === "mansion" ? 4.6 : 3.3;
          if (who && who.you && !bld) { const m = mesh(new THREE.ConeGeometry(0.22, 0.42, 4), F(0xc2704f), 0, tall, 0, lotG); m.rotation.x = Math.PI; T.homeMarker = m; T.homeZ = lz; label("Your home", player.title, lx, tall + 1, lz, true); }
          if (who && who.you && bld) { T.buildZ = lz; label("Your new home", bld.left > 0 ? `Building · ${bld.left} day${bld.left > 1 ? "s" : ""} left` : "Moving in today", lx, tall + 1, lz, true); }
          // tap target
          const hit = new THREE.Mesh(new THREE.BoxGeometry(H.lot, 3, H.lot), new THREE.MeshBasicMaterial({ visible: false }));
          hit.position.set(lx, 1.5, lz); scene.add(hit); lots.push({ hit, hood: H, who, i, build: bld, lotG, content });
        }
        label(H.name, hoodSub(H, npcs, prices), 0, 3.0, z0 - 0.6, false);
        // a little park between neighbourhoods
        const pz = z1 + GAP / 2 - 0.2;
        if (!Kota.HZ.some(h => Math.abs(h - z1) < 0.3)) for (const sx of [-1, 1]) tree(sx * (ROAD_W / 2 + WALK + 0.9), pz, 1.4);   // v73: a cross street runs here
        z = z1;
      });
      // v73: the city around the street, then the people in it
      buildCity();
      const mine = lots.find(l => l.who && l.who.you && !l.build) || lots.find(l => l.who && l.who.you);
      if (mine) { const hx = mine.hit.position.x, hz = mine.hit.position.z; T.homeX = hx; T.homeZ = T.homeZ ?? hz; T.homeDoor = { x: Math.sign(hx) * (ROAD_W / 2 + WALK / 2), z: hz }; T.homeTall = mine.hood && (mine.hood.kind === "mansion" ? 4.6 : 3.4); }
      buildLife(data);
      focusZ = T.buildZ ?? T.homeZ ?? -4;
      applyPeriod(true);
    }
    function hoodSub(H, npcs, prices) {
      if (H.id === "rented") return "Rented rooms";
      return prices[H.id];
    }

    // ---------------------------------------------------------------- light that follows the real clock
    let lastPeriod = "";
    function applyPeriod(force) {
      const L = env.getLit(), p = env.getPeriod();
      if (p === lastPeriod && !force) return; lastPeriod = p;
      sun.color.setHex(L.sun); hemi.intensity = L.hemi; sun.intensity = L.sunI * 1.05;
      const glow = p === "night" ? 1.0 : p === "evening" ? 0.6 : 0;
      for (const m of lit) m.emissiveIntensity = glow;
      scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) if (m.isMeshStandardMaterial) { if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; m.envMapIntensity = m.userData.env0 * L.env; } });
      scene.fog.color.set(env.bgColor());
      for (const w of walkers) w.g.visible = !(w.night && p === "night");
    }

    // ---------------------------------------------------------------- camera and input (v73: bird view over the whole city)
    // Drag = move around, pinch / wheel = zoom from the street to the city map, a little more out = back to the globe.
    // The camera tilts more as it rises ("slightly tilted" up close, almost top-down on the map).
    const ZD0 = 13, ZD1 = 320, LZ = Math.log(ZD1 / ZD0), Z_STREET = 0.26, Z_MAP = 0.62, Z_OUT = 1.06;
    let zoom = Z_STREET, tgt = null, leaving = false, shHalf = 16;
    const fitK = () => 1 / Math.max(0.55, Math.min(1, camera.aspect) / 0.6);
    const distNow = () => ZD0 * Math.exp(LZ * Math.min(1.1, zoom)) * fitK();
    const pitchOf = zm => (33 + 31 * smooth((zm - 0.28) / 0.72)) * Math.PI / 180;
    const clampFocus = () => { const B = Kota.BOUNDS; focusX = Math.max(B.x0, Math.min(B.x1, focusX)); focusZ = Math.max(B.z0, Math.min(B.z1, focusZ)); };
    function place() {
      const d = distNow(), p = pitchOf(zoom), yaw = 0.085;
      camera.position.set(focusX + d * Math.cos(p) * Math.sin(yaw), d * Math.sin(p), focusZ + d * Math.cos(p) * Math.cos(yaw)); camera.lookAt(focusX, 0, focusZ);
      const nf = Math.max(0.5, d * 0.04); if (Math.abs(camera.near - nf) > 0.01) { camera.near = nf; camera.far = d * 6 + 150; camera.updateProjectionMatrix(); }
      scene.fog.near = d * 1.05 + 8; scene.fog.far = d * 2.4 + 50;
      const sh = Math.round(Math.min(110, Math.max(16, d * 0.62)));
      if (sh !== shHalf) { shHalf = sh; Object.assign(sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh, far: sh * 5 + 40 }); sun.shadow.camera.updateProjectionMatrix(); }
      sun.position.set(focusX - sh * 0.5, sh * 1.05, focusZ + sh * 0.65); sun.target.position.set(focusX, 0, focusZ - 2);
      // labels: house labels fade out on the map; place and street names grow so they stay readable
      const kM = Math.max(1, d / 42), fade = 1 - smooth((zoom - 0.4) / 0.1);
      for (const s of signs) {
        if (s === youTag) continue;
        if (s.userData.map) {
          const hood = s.userData.hood, street = s.userData.street;
          s.scale.copy(s.userData.base).multiplyScalar(hood ? Math.max(1, d / 30) : kM);
          s.position.y = s.userData.y0 * (hood ? Math.max(1, d / 30) : 1) + (kM - 1) * 0.8;
          s.material.opacity = street ? smooth((zoom - 0.35) / 0.15) : hood ? smooth((zoom - 0.5) / 0.1) : 1;
        } else s.material.opacity = fade;
        s.visible = s.material.opacity > 0.02;
      }
    }
    const ptr = new Map(); let drag = null, moved = 0, pinch = null;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    function setZoom(z) {
      zoom = Math.max(0, Math.min(Z_OUT + 0.02, z));
      if (zoom >= Z_OUT && !leaving && env.toGlobe) { leaving = true; env.toGlobe(); }
    }
    T.down = e => {
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); tgt = null;
      if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom }; drag = null; moved = 99; return; }
      drag = { x: e.clientX, y: e.clientY, fx: focusX, fz: focusZ }; moved = 0;
    };
    T.move = e => {
      if (!ptr.has(e.pointerId)) return;
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptr.size >= 2) { const [a, b] = [...ptr.values()]; setZoom(pinch.zoom - Math.log(Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d) / LZ); return; }
      if (!drag) return;
      const dy = e.clientY - drag.y, dx = e.clientX - drag.x; moved = Math.max(moved, Math.hypot(dx, dy));
      const k = 2 * distNow() * Math.tan(17 * Math.PI / 180) / env.canvas.clientHeight;
      focusX = drag.fx - dx * k; focusZ = drag.fz - dy * k / Math.sin(pitchOf(zoom)); clampFocus();
    };
    T.up = e => {
      const tap = drag && moved < 8 && ptr.size === 1;
      ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null;
      if (tap) {
        const r = env.canvas.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(lots.map(l => l.hit))[0], l = hit && lots.find(x => x.hit === hit.object);
        if (zoom > Z_MAP) {
          // on the map: tap a place to see it, tap anywhere else to fly down there
          if (l && l.place) { env.showLot(l); T.flyTo(l.place.x, l.place.z, 0.4); }
          else { const v = new THREE.Vector3(); if (ray.ray.intersectPlane(ground, v)) T.flyTo(v.x, v.z, Z_STREET + 0.08); }
        } else if (l) env.showLot(l);
      }
      drag = null;
    };
    T.cancel = e => { ptr.delete(e.pointerId); pinch = null; drag = null; };
    T.wheel = e => { tgt = null; setZoom(zoom + e.deltaY * 0.0011); };
    T.zoomBy = dz => { const z0 = tgt ? tgt.zoom : zoom; if (dz > 0 && z0 >= 0.995) return setZoom(Z_OUT); tgt = { x: tgt ? tgt.x : focusX, z: tgt ? tgt.z : focusZ, zoom: Math.max(0, Math.min(1, z0 + dz)) }; };
    T.flyTo = (x, z, zm) => { tgt = { x, z, zoom: zm ?? zoom }; };
    T.mapView = () => { tgt = zoom > Z_MAP ? { x: T.homeX ?? 0, z: (T.homeZ ?? -4) + 3.6, zoom: Z_STREET } : { x: 6, z: -24, zoom: 0.97 }; };
    T.findYou = () => { if (T.youX === undefined) return false; tgt = { x: T.youX, z: T.youZ + 2, zoom: 0.22 }; return true; };
    T.zoomLevel = () => zoom;
    T.resize = (w, h) => { camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const DISTRICT = x => x < Kota.RAIL.x ? "Westfield" : x < -22 ? "Station Quarter" : x < 0 ? "Office Row" : x < 22 ? "Eastside" : x < Kota.RIVER.x0 ? "Riverside" : x < Kota.RIVER.x1 ? "The river" : "Far Bank";
    T.hoodAt = () => {
      if (zoom > Z_MAP) return "Old Town · city map";
      if (Math.abs(focusX) < Kota.STRIP && focusZ < Kota.PLAZA + 1 && focusZ > Kota.ZMIN - 2)
        return focusZ > 1.5 ? "Town Square" : (HOODS.find(H => focusZ <= H.z0 + 0.5 && focusZ > H.z1) || HOODS[focusZ > 0 ? 0 : HOODS.length - 1]).name;
      const P = Kota.PLACES.filter(p => p.kind !== "square").map(p => ({ p, d: Math.hypot(p.x - focusX, p.z - focusZ) - Math.max(p.w, p.d) / 2 })).sort((a, b) => a.d - b.d)[0];
      return P && P.d < 7 ? P.p.name : DISTRICT(focusX);
    };

    // opt.map: arrive from the globe, high over the city; keepFocus: rebuilt after buying, stay where we were
    T.enter = async (data, keepFocus, opt = {}) => {
      await T.ready();
      const fx = focusX, fz = focusZ, zm = zoom; build(data); leaving = false; tgt = null; ptr.clear(); drag = pinch = null;
      if (keepFocus) { focusX = fx; focusZ = fz; zoom = zm; }
      else if (opt.map) { focusX = 6; focusZ = -24; zoom = 1.04; tgt = { x: T.homeX ?? 0, z: (T.homeZ ?? -4) - 4, zoom: 0.8 }; }
      else { focusX = 0; zoom = Z_STREET; }
      T.on = true; place();
      for (const S of sites) S.plane.constant = 0.05 + siteProgress(S) * (S.top + 0.05);
    };
    T.exit = () => { T.on = false; };
    T.frame = (t, dt) => {
      if (tgt) {
        const k = 1 - Math.pow(0.025, dt);
        focusX += (tgt.x - focusX) * k; focusZ += (tgt.z - focusZ) * k; zoom += (tgt.zoom - zoom) * k;
        if (Math.abs(tgt.x - focusX) + Math.abs(tgt.z - focusZ) < 0.03 && Math.abs(tgt.zoom - zoom) < 0.002) tgt = null;
      }
      applyPeriod(false); updateLife(t, dt); place();
      if (T.homeMarker) T.homeMarker.rotation.y = t / 700;
      drawClock();
      if (t - lastSite > 1000) { lastSite = t; for (const S of sites) S.plane.constant = 0.05 + siteProgress(S) * (S.top + 0.05); }
      for (const S of sites) { S.worker.position.y = Math.abs(Math.sin(t / 220)) * 0.08; S.worker.rotation.y = Math.sin(t / 900) * 1.2; }
    };
    // look at a neighbourhood (from the shop) or a lot
    T.focusHood = id => { const H = HOODS.find(h => h.id === id); if (H) { focusX = 0; focusZ = H.zc; zoom = Z_STREET; tgt = null; } };
    T.focusLot = l => { focusX = l.hit.position.x * 0.6; focusZ = l.hit.position.z + 3.6; zoom = Math.min(zoom, Z_STREET); tgt = null; };
    // show what the chosen model would look like on an empty lot, before buying
    T.preview = (l, model, paint) => {
      T.clearPreview();
      if (!l) return;
      l.content.visible = false;
      previewG = home(l.hood.kind, model, paint, rnd("preview")); previewG.userData.lot = l; l.lotG.add(previewG);
      previewG.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.isMeshStandardMaterial && m.userData.env0 === undefined) { m.userData.env0 = m.envMapIntensity; m.envMapIntensity *= env.getLit().env; } });
    };
    T.clearPreview = () => { if (previewG) { previewG.userData.lot.content.visible = true; previewG.parent.remove(previewG); previewG = null; } };
    T.lots = lots;
    T.HOODS = HOODS;
    // the Homes app photographs single homes; the kit has to be loaded first
    let kitP = null;
    T.ready = () => built ? Promise.resolve() : (kitP = kitP || loadKit().then(() => { built = true; }));
    T.homeModel = (kind, model, paint, seed) => home(kind, model, paint, rnd(seed));
    return T;
  }
  globalThis.Town = { create, HOODS, CIVIC };
})();

// v79: rumah klasik "detail maksimal" (tes gaya diorama hangat). Semua dari kode: bentuk + tekstur canvas (plester, genteng,
// bata, batu, papan kayu), tanpa file aset. Supaya tetap ringan di peta penuh:
// - semua potongan satu rumah digabung per material (merge) → sekitar 10 objek, bukan ratusan
// - versi jauh (lo) cuma kotak + atap, dipakai THREE.LOD kalau kamera jauh
// - tekstur dibagi semua rumah (satu set per halaman)
"use strict";
(function () {
  function create(env) {
    const { THREE, RB, canvasTex } = env;
    const SPH = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
    const CYL = (a, b, h, n = 10) => new THREE.CylinderGeometry(a, b, h, n);
    const noise = (g, w, h, a, n) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } };
    // ---- tekstur (abu-abu terang; warnanya dari material, jadi satu tekstur dipakai semua cat)
    const TX = {};
    const tex = (k, draw, w = 256, h = 256) => TX[k] || (TX[k] = (() => { const t = canvasTex(draw, w, h); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })());
    const plaster = () => tex("plaster", (g, w, h) => {
      g.fillStyle = "#f4f1ec"; g.fillRect(0, 0, w, h); noise(g, w, h, 0.05, 3000);
      for (let k = 0; k < 14; k++) { const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 40, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(120,100,80,0.07)"); gr.addColorStop(1, "rgba(120,100,80,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
      const d = g.createLinearGradient(0, h, 0, h * 0.78); d.addColorStop(0, "rgba(90,80,60,0.22)"); d.addColorStop(1, "rgba(90,80,60,0)"); g.fillStyle = d; g.fillRect(0, h * 0.78, w, h * 0.22);
    });
    const tiles = () => tex("tiles", (g, w, h) => {
      g.fillStyle = "#cfcfcf"; g.fillRect(0, 0, w, h);
      const rows = 8, cols = 8, th = h / rows, tw = w / cols;
      for (let y = 0; y < rows; y++) for (let x = -1; x < cols + 1; x++) {
        const ox = (y % 2) * tw / 2, v = 200 + Math.floor(Math.random() * 45);
        const gr = g.createLinearGradient(0, y * th, 0, (y + 1) * th); gr.addColorStop(0, `rgb(${v - 40},${v - 40},${v - 40})`); gr.addColorStop(0.25, `rgb(${v},${v},${v})`); gr.addColorStop(1, `rgb(${v - 25},${v - 25},${v - 25})`);
        g.fillStyle = gr; g.beginPath(); g.moveTo(x * tw + ox + 2, y * th); g.lineTo(x * tw + ox + tw - 2, y * th); g.lineTo(x * tw + ox + tw - 2, (y + 1) * th - 6); g.quadraticCurveTo(x * tw + ox + tw / 2, (y + 1) * th + 4, x * tw + ox + 2, (y + 1) * th - 6); g.closePath(); g.fill();
      }
      g.fillStyle = "rgba(0,0,0,0.25)"; for (let y = 1; y < rows; y++) g.fillRect(0, y * th - 1, w, 2);
      noise(g, w, h, 0.06, 2000);
      for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(120,140,90,0.12)"; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 6 + Math.random() * 14, 0, 7); g.fill(); }   // a little moss
    });
    const bricks = () => tex("bricks", (g, w, h) => {
      g.fillStyle = "#d8d2cc"; g.fillRect(0, 0, w, h);
      const bh = h / 12, bw = w / 4;
      for (let y = 0; y < 12; y++) for (let x = -1; x < 5; x++) { const v = 170 + Math.floor(Math.random() * 60); g.fillStyle = `rgb(${v},${v - 6},${v - 10})`; g.fillRect(x * bw + (y % 2) * bw / 2 + 3, y * bh + 3, bw - 6, bh - 6); }
      noise(g, w, h, 0.08, 2500);
    });
    const stones = () => tex("stones", (g, w, h) => {
      g.fillStyle = "#b9b4ad"; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 40; k++) { const v = 190 + Math.floor(Math.random() * 50); g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; const x = Math.random() * w, y = Math.random() * h, rx = 14 + Math.random() * 20, ry = 10 + Math.random() * 12; g.beginPath(); g.ellipse(x, y, rx, ry, Math.random(), 0, 7); g.fill(); }
      noise(g, w, h, 0.08, 2500);
    });
    const planks = () => tex("planks", (g, w, h) => {
      for (let i = 0; i < 6; i++) { const v = 200 + Math.floor(Math.random() * 40); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * w / 6, 0, w / 6, h); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(i * w / 6, 0, 2, h); }
      g.globalAlpha = 0.08; for (let i = 0; i < 80; i++) { g.fillStyle = "#000"; g.fillRect(Math.random() * w, Math.random() * h, 1, 20 + Math.random() * 40); } g.globalAlpha = 1;
    });
    const slats = () => tex("slats", (g, w, h) => {
      g.fillStyle = "#e6e6e6"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) { g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(0, y + 12, w, 4); g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(0, y, w, 3); }
      g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    }, 128, 256);
    // ---- material: cat dinding dan atap per rumah, sisanya dibagi
    const MS = {};
    const shared = (k, f) => MS[k] || (MS[k] = f());
    const mat = (color, map, o = {}) => { const m = env.M(color, Object.assign({ roughness: 0.9 }, o)); if (map) m.map = map; return m; };
    // uv: skala ke ukuran benda (dalam meter dunia), biar tekstur nggak melar
    const uvs = (geo, su, sv) => { const a = geo.attributes.uv; if (a) { for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * su, a.getY(i) * sv); } return geo; };
    // potongan kecil (sudut < 2,5 cm) pakai kotak biasa: 12 segitiga, bukan 300
    const box = (w, h, d, r, tile) => { const g = r >= 0.025 ? RB(w, h, d, r, 2) : new THREE.BoxGeometry(w, h, d); return tile ? uvs(g, Math.max(w, d) / tile, h / tile) : g; };

    // ---- gabung semua potongan per material (posisi sudah di ruang rumah)
    function merge(g) {
      g.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), byMat = new Map(), m4 = new THREE.Matrix4();
      g.traverse(o => {
        if (!o.isMesh) return;
        let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        geo.applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld));
        if (!geo.attributes.uv) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
        for (const k of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(k)) geo.deleteAttribute(k);
        if (!byMat.has(o.material)) byMat.set(o.material, []);
        byMat.get(o.material).push(geo);
      });
      const out = new THREE.Group();
      for (const [m, list] of byMat) {
        let n = 0; for (const geo of list) n += geo.attributes.position.count;
        const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o3 = 0, o2 = 0;
        for (const geo of list) { P.set(geo.attributes.position.array, o3); N.set(geo.attributes.normal.array, o3); U.set(geo.attributes.uv.array, o2); o3 += geo.attributes.position.count * 3; o2 += geo.attributes.position.count * 2; geo.dispose(); }
        const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(P, 3)); mg.setAttribute("normal", new THREE.BufferAttribute(N, 3)); mg.setAttribute("uv", new THREE.BufferAttribute(U, 2));
        mg.computeBoundingSphere();
        const mesh = new THREE.Mesh(mg, m); mesh.castShadow = mesh.receiveShadow = !m.transparent; out.add(mesh);
      }
      return out;
    }

    // ---- rumah detail. wallC/roofC = warna cat dan atap, r = rng rumah ini, winMat = material jendela (nyala malam)
    function hi(wallC, roofC, r, winMat, raw) {
      const g = new THREE.Group(), add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
      const pick = a => a[Math.floor(r() * a.length) % a.length];
      const wall = shared("w" + wallC, () => mat(wallC, plaster())), roof = shared("r" + roofC, () => mat(roofC, tiles(), { roughness: 0.8 })), roofDk = shared("rd" + roofC, () => mat(new THREE.Color(roofC).multiplyScalar(0.6).getHex(), null));
      const C = (k, c, map, o) => shared(k + c, () => mat(c, map, o));
      const stone = shared("stone", () => mat(0xc9c1b4, stones(), { roughness: 1 })), brick = shared("brick", () => mat(0xc77b5f, bricks()));
      const trim = shared("trim", () => mat(0xfaf5ec, null, { roughness: 0.7 })), wood = shared("wood", () => mat(0x8a5a3c, planks()));
      const metal = shared("metal", () => mat(0x8b8f93, null, { roughness: 0.45, metalness: 0.5 })), leaf = shared("leaf", () => mat(0x7f9f69, null, { roughness: 1 })), leafDk = shared("leafDk", () => mat(0x5f7f52, null, { roughness: 1 }));
      const shutC = pick([0x7f9a8a, 0x8a9fb5, 0xc9876b, 0x9c8bb0, 0x6f8f9f]), shut = C("s", shutC, slats()), doorM = C("d", pick([0x7a4b36, 0x5f7a6d, 0x8d4f45, 0x4f6178]), planks());
      const curtain = C("c", pick([0xf3e3c9, 0xe9c7c0, 0xd5e0d0]), null, { roughness: 1 });
      const fenceM = shared("fence", () => mat(0xf3eee6, planks())), bloomC = [0xe58c8a, 0xf2c46d, 0xf6efe4, 0xc98bd0, 0xef9f6b];
      const W = 2.1, D = 1.7, H = 1.25, FZ = D / 2;
      // alas batu + dinding
      add(box(W + 0.2, 0.2, D + 0.2, 0.05, 0.6), stone, 0, 0.1, 0);
      add(box(W, H, D, 0.08, 1.2), wall, 0, 0.2 + H / 2, 0);
      add(box(W + 0.06, 0.06, D + 0.06, 0.02), trim, 0, 0.2 + H + 0.02, 0);
      // dinding segitiga + atap dua sisi dengan genteng, lis, talang
      const gs = new THREE.Shape(); gs.moveTo(-W / 2, 0); gs.lineTo(W / 2, 0); gs.lineTo(0, 0.8); gs.closePath();
      const gg = new THREE.ExtrudeGeometry(gs, { depth: D - 0.02, bevelEnabled: false }); gg.translate(0, 0, -(D - 0.02) / 2); uvs(gg, 0.8, 0.8);
      add(gg, wall, 0, 0.2 + H + 0.03, 0);
      const pitch = Math.atan2(0.86, 1.2), RY = 0.2 + H + 0.45;
      for (const sx of [-1, 1]) {
        add(uvs(box(1.62, 0.12, 2.24, 0.03), 1.6 / 0.55, 2.24 / 0.55), roof, sx * 0.62, RY, 0, 0, 0, -sx * pitch);
        add(box(1.6, 0.04, 2.2, 0.01), roofDk, sx * 0.6, RY - 0.07, 0, 0, 0, -sx * pitch);
        for (let k = 0; k < 4; k++) { const t = 0.15 + k * 0.38, x = sx * (0.06 + Math.cos(pitch) * t * 1.2), y = RY + 0.38 - Math.sin(pitch) * t * 1.2 + 0.07; add(CYL(0.018, 0.018, 2.24, 5), roof, x, y, 0, Math.PI / 2); }   // tile row lips
        add(CYL(0.045, 0.045, 2.2, 8), metal, sx * 1.27, RY - 0.48, 0, Math.PI / 2);   // gutter
      }
      add(CYL(0.07, 0.07, 2.28, 8), roofDk, 0, RY + 0.47, 0, Math.PI / 2);   // ridge
      add(CYL(0.025, 0.025, 1.3, 6), metal, 1.25, 0.8, 0.8);                // downpipe
      // cerobong bata
      add(uvs(box(0.34, 0.8, 0.34, 0.03), 1.4, 3), brick, 0.62, RY + 0.4, -0.34);
      add(box(0.42, 0.06, 0.42, 0.02), stone, 0.62, RY + 0.82, -0.34);
      add(CYL(0.06, 0.07, 0.14, 8), C("pot", 0xb8735a, null), 0.62, RY + 0.92, -0.34);
      // jendela: bingkai, kaca, kusen silang, tirai, daun jendela, ambang, pot bunga
      const win = (x, y, w, h, z, box2) => {
        add(box(w + 0.1, h + 0.1, 0.05, 0.015), trim, x, y, z);
        add(box(w, h, 0.03, 0.005), curtain, x, y, z - 0.02);
        add(box(w, h, 0.02, 0.005), winMat, x, y, z + 0.015);
        add(box(0.025, h, 0.04, 0.004), trim, x, y, z + 0.03); add(box(w, 0.025, 0.04, 0.004), trim, x, y, z + 0.03);
        for (const sx of [-1, 1]) add(box(w * 0.44, h + 0.08, 0.03, 0.01), shut, x + sx * (w / 2 + w * 0.26), y, z + 0.005);
        add(box(w + 0.18, 0.05, 0.13, 0.015), trim, x, y - h / 2 - 0.06, z + 0.05);
        if (box2) {
          add(box(w + 0.04, 0.11, 0.13, 0.02), wood, x, y - h / 2 - 0.14, z + 0.09);
          for (let k = 0; k < 5; k++) { const fx = x - w / 2 + 0.05 + k * (w - 0.1) / 4; add(SPH(0.05, 6, 5), leaf, fx, y - h / 2 - 0.07, z + 0.1); add(SPH(0.035, 6, 5), C("b", bloomC[(k + Math.floor(r() * 5)) % 5], null, { roughness: 1 }), fx + 0.02, y - h / 2 - 0.03, z + 0.13); }
        }
      };
      for (const x of [-0.66, 0.66]) win(x, 0.92, 0.36, 0.4, FZ + 0.01, true);
      win(0, 1.86, 0.3, 0.26, FZ - 0.01, false);
      for (const sz of [-0.35, 0.35]) { const s = add(box(0.05, 0.4, 0.36, 0.01), trim, W / 2 + 0.01, 0.92, sz); add(box(0.02, 0.36, 0.32, 0.005), winMat, W / 2 + 0.03, 0.92, sz); s.visible = true; }   // side windows
      // pintu + kanopi kecil di dua tiang + lampu, keset, nomor rumah
      add(box(0.52, 0.86, 0.05, 0.015), trim, 0, 0.63, FZ + 0.01);
      add(uvs(box(0.4, 0.74, 0.05, 0.01), 1, 1), doorM, 0, 0.57, FZ + 0.03);
      add(SPH(0.025, 6, 5), metal, 0.13, 0.58, FZ + 0.07);
      add(box(0.24, 0.09, 0.02, 0.005), trim, 0, 0.84, FZ + 0.06);
      add(box(0.8, 0.07, 0.42, 0.02), stone, 0, 0.215, FZ + 0.2); add(box(0.7, 0.07, 0.3, 0.02), stone, 0, 0.145, FZ + 0.38);
      add(box(0.4, 0.01, 0.26, 0.005), C("mat", 0xa0624a, null), 0, 0.255, FZ + 0.2);
      add(box(0.9, 0.05, 0.5, 0.015), roof, 0, 1.18, FZ + 0.24, 0.22);                 // canopy
      for (const sx of [-1, 1]) add(CYL(0.025, 0.025, 0.95, 6), trim, sx * 0.4, 0.7, FZ + 0.44);
      add(SPH(0.045, 8, 6), C("lamp", 0xfff1cf, null, { emissive: 0xffd9a0, emissiveIntensity: 0.5 }), 0.34, 0.98, FZ + 0.06);
      // tanaman rambat di pojok kiri
      for (let k = 0; k < 16; k++) { const t = k / 15; add(SPH(0.07 + r() * 0.04, 6, 5), r() < 0.5 ? leaf : leafDk, -W / 2 + 0.05 + r() * 0.25, 0.25 + t * 1.15, FZ + 0.03 + r() * 0.03); }
      // halaman: pagar kayu dengan pintu, jalan batu, semak, kotak surat, sepeda, pot
      const fz = FZ + 0.85;
      for (let k = -6; k <= 6; k++) { if (Math.abs(k) <= 1) continue; const x = k * 0.18; add(box(0.07, 0.36, 0.03, 0.01), fenceM, x, 0.18, fz); add(new THREE.ConeGeometry(0.05, 0.07, 4), fenceM, x, 0.39, fz, 0, Math.PI / 4); }
      for (const sx of [-1, 1]) add(box(1.0, 0.04, 0.025, 0.005), fenceM, sx * 0.72, 0.26, fz - 0.02);
      for (let k = 0; k < 3; k++) add(CYL(0.11, 0.12, 0.03, 8), stone, (k % 2 ? 0.04 : -0.04), 0.02, FZ + 0.55 + k * 0.22);
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { add(SPH(0.16, 12, 9), k % 2 ? leaf : leafDk, sx * (0.5 + k * 0.27), 0.13, FZ + 0.62); }
      add(CYL(0.02, 0.02, 0.38, 5), wood, 0.32, 0.19, fz + 0.04); add(box(0.14, 0.1, 0.2, 0.02), C("mb", pick([0xc6584a, 0x4f6178, 0x6b8f5f]), null), 0.32, 0.42, fz + 0.04);   // mailbox
      const bike = new THREE.Group(); bike.position.set(-1.0, 0, FZ + 0.42); bike.rotation.y = 0.35; g.add(bike);
      for (const bx of [-0.17, 0.17]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 5, 14), C("tyre", 0x333333, null)); w.position.set(bx, 0.12, 0); bike.add(w); }
      const fr = new THREE.Mesh(CYL(0.012, 0.012, 0.36, 5), C("bk", pick([0xd9654f, 0x4f86c6, 0x7fb069]), null)); fr.position.set(0, 0.2, 0); fr.rotation.z = Math.PI / 2; bike.add(fr);
      for (const sx of [-1, 1]) { const p = add(CYL(0.07, 0.055, 0.12, 8), C("pot", 0xb8735a, null), sx * 0.45, 0.31, FZ + 0.28); add(SPH(0.09, 7, 5), leaf, p.position.x, 0.42, p.position.z); }
      return raw ? g : merge(g);
    }
    // versi jauh: dinding, atap, dua jendela gelap. Beberapa potong saja
    function lo(wallC, roofC, winMat) {
      const g = new THREE.Group(), add = (geo, m, x, y, z, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.z = rz; g.add(o); };
      const wall = shared("loW" + wallC, () => mat(wallC, null)), roof = shared("loR" + roofC, () => mat(roofC, null));
      add(new THREE.BoxGeometry(2.1, 1.45, 1.7), wall, 0, 0.72, 0);
      const pitch = Math.atan2(0.86, 1.2);
      for (const sx of [-1, 1]) add(new THREE.BoxGeometry(1.62, 0.1, 2.2), roof, sx * 0.62, 1.9, 0, -sx * pitch);
      add(new THREE.BoxGeometry(1.6, 0.4, 0.02), winMat, 0, 0.92, 0.86);
      return merge(g);
    }

    // ================= v79: Suburb, rumah pinggiran gaya Amerika (konsep: konsep/02-suburb-perumahan.png)
    // tiga tipe: "colonial" (2 lantai + garasi), "craftsman" (bungalow, teras dalam), "capecod" (1,5 lantai, jendela atap).
    // Rumah menghadap +z, atap pelana sejajar jalan. Halaman ikut: rumput, jalan mobil, jalan setapak, kotak surat, pohon.
    const siding = () => tex("siding", (g, w, h) => {
      g.fillStyle = "#f2f0ec"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) { g.fillStyle = "rgba(0,0,0,0.13)"; g.fillRect(0, y + 13, w, 3); g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(0, y, w, 2); }
      noise(g, w, h, 0.04, 1500);
    });
    const shingles = () => tex("shingles", (g, w, h) => {
      g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, w, h);
      const rh = h / 10, cw = w / 6;
      for (let y = 0; y < 10; y++) for (let x = -1; x < 7; x++) { const v = 170 + Math.floor(Math.random() * 60); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x * cw + (y % 2) * cw / 2 + 1, y * rh + 1, cw - 2, rh - 2); }
      g.fillStyle = "rgba(0,0,0,0.3)"; for (let y = 1; y < 10; y++) g.fillRect(0, y * rh - 2, w, 3);
      noise(g, w, h, 0.07, 2000);
    });
    const SUB = {
      colonial: { wall: [0xf1ece2, 0xf5efe0, 0xe9e4da], roof: [0x5d6670, 0x6b6460], shut: [0x2f4a5e, 0x3c3c3c, 0x5f7a6d], door: [0x8d3b35, 0x2f4a5e, 0x2f2f2f] },
      craftsman: { wall: [0x9fae8c, 0xb7a68a, 0x8f9fa6], roof: [0x7a5a48, 0x6b5a4e], shut: [0xe7d9b8], door: [0x3f5b6e, 0x7a4b36, 0x8d4f45] },
      capecod: { wall: [0xdfe6ee, 0xf2efe8, 0xe8d9cf], roof: [0x4f565e, 0x5d6670], shut: [0xc9876b, 0x2f4a5e, 0x6f8f9f], door: [0xc6584a, 0x2f4a5e, 0xd9b46a] },
    };
    function suburb(type, r, winMat, raw, wallOver) {
      const T = SUB[type] || SUB.colonial, pick = a => a[Math.floor(r() * a.length) % a.length];
      const g = new THREE.Group(), add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
      const C = (k, c, map, o) => shared(k + c, () => mat(c, map, o));
      const wallC = wallOver != null ? wallOver : pick(T.wall), roofC = pick(T.roof);
      const wall = C("sw", wallC, siding()), roof = C("sr", roofC, shingles(), { roughness: 0.85 }), shut = C("ss", pick(T.shut), slats()), doorM = C("sd", pick(T.door), planks());
      const trim = shared("trim", () => mat(0xfaf5ec, null, { roughness: 0.7 })), brick = shared("brick", () => mat(0xc77b5f, bricks())), stone = shared("stone", () => mat(0xc9c1b4, stones(), { roughness: 1 }));
      const leaf = shared("leaf", () => mat(0x7f9f69, null, { roughness: 1 })), leafDk = shared("leafDk", () => mat(0x5f7f52, null, { roughness: 1 })), wood = shared("wood", () => mat(0x8a5a3c, planks()));
      const lawn = shared("lawn", () => mat(0x8fb26c, null, { roughness: 1 })), conc = shared("conc", () => mat(0xd6d0c4, null, { roughness: 1 })), curtain = C("c", pick([0xf3e3c9, 0xe9c7c0, 0xd5e0d0]), null, { roughness: 1 });
      // dinding + atap pelana sejajar jalan. x0 = tengah, w lebar, d dalam, h tinggi dinding, rh tinggi atap, ov emper
      const body = (x0, w, d, h, rh, ov, wm = wall, rm = roof) => {
        add(box(w, h, d, 0, 1.0), wm, x0, 0.12 + h / 2, 0);
        const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, rh); sh.closePath();
        const tg = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); tg.translate(0, 0, -w / 2); tg.rotateY(Math.PI / 2); uvs(tg, 1, 1);
        add(tg, wm, x0, 0.12 + h, 0);
        const p = Math.atan2(rh, d / 2), L = Math.hypot(d / 2, rh) + ov;
        for (const sz of [-1, 1]) { const sl = add(uvs(box(w + ov * 2, 0.08, L, 0), (w + ov * 2) / 0.6, L / 0.6), rm, x0, 0.12 + h + rh / 2 + 0.03 - ov * Math.sin(p) / 2, sz * (d / 4 + ov * Math.cos(p) / 2)); sl.rotation.x = sz * p; }
        add(box(w + ov * 2 + 0.02, 0.05, 0.08, 0), trim, x0, 0.12 + h + rh + 0.05, 0);
        add(box(w + 0.04, 0.05, d + 0.04, 0), trim, x0, 0.12 + h + 0.01, 0);
        return { top: 0.12 + h, p };
      };
      const win = (x, y, w, h, z, shutters = true) => {
        add(box(w + 0.08, h + 0.08, 0.04, 0), trim, x, y, z);
        add(box(w, h, 0.02, 0), curtain, x, y, z - 0.015);
        add(box(w, h, 0.02, 0), winMat, x, y, z + 0.012);
        for (const k of [-1, 1]) add(box(0.015, h, 0.03, 0), trim, x + k * w / 6, y, z + 0.025);
        add(box(w, 0.02, 0.03, 0), trim, x, y, z + 0.025);
        if (shutters) for (const k of [-1, 1]) add(box(w * 0.45, h + 0.04, 0.025, 0), shut, x + k * (w / 2 + w * 0.27), y, z + 0.005);
        add(box(w + 0.12, 0.035, 0.08, 0), trim, x, y - h / 2 - 0.05, z + 0.03);
      };
      const doorAt = (x, z, h = 0.62) => { add(box(0.4, h + 0.06, 0.04, 0), trim, x, 0.12 + h / 2, z); add(box(0.32, h, 0.04, 0), doorM, x, 0.12 + h / 2 - 0.02, z + 0.015); add(box(0.2, 0.12, 0.02, 0), winMat, x, 0.12 + h * 0.78, z + 0.04); add(SPH(0.02, 6, 5), shared("brass", () => mat(0xd9b46a, null, { metalness: 0.6, roughness: 0.3 })), x + 0.11, 0.12 + h * 0.45, z + 0.05); };
      const chimney = (x, z, y0, hh) => { add(uvs(box(0.26, hh, 0.26, 0), 1, hh / 0.3), brick, x, y0 + hh / 2, z); add(box(0.32, 0.05, 0.32, 0), stone, x, y0 + hh + 0.02, z); };
      const dormer = (x, y, z, p) => { add(box(0.36, 0.34, 0.5, 0, 1), wall, x, y, z); const s2 = new THREE.Shape(); s2.moveTo(-0.22, 0); s2.lineTo(0.22, 0); s2.lineTo(0, 0.2); s2.closePath(); const dg = new THREE.ExtrudeGeometry(s2, { depth: 0.56, bevelEnabled: false }); dg.translate(0, 0, -0.28); add(dg, roof, x, y + 0.17, z); win(x, y, 0.2, 0.2, z + 0.26, false); };
      let W = 2, D = 1.4;
      if (type === "craftsman") {
        D = 1.6; const b = body(0, 2.0, D, 0.95, 0.72, 0.28);
        // front gable dormer with shingles, porch across the front on tapered columns over stone piers
        const s3 = new THREE.Shape(); s3.moveTo(-0.55, 0); s3.lineTo(0.55, 0); s3.lineTo(0, 0.42); s3.closePath();
        const fg = new THREE.ExtrudeGeometry(s3, { depth: 0.7, bevelEnabled: false }); fg.translate(0, 0, -0.35); add(fg, C("cr", 0xe7d9b8, shingles()), 0, b.top + 0.08, D / 2 - 0.25);
        win(0, b.top + 0.22, 0.42, 0.16, D / 2 + 0.11, false);
        add(box(2.4, 0.06, 0.62, 0), roof, 0, b.top - 0.02, D / 2 + 0.28, 0.12);
        add(box(2.4, 0.1, 0.04, 0), C("cr", 0xe7d9b8, null), 0, b.top - 0.08, D / 2 + 0.58);
        for (const x of [-1.05, -0.2, 1.05]) { add(uvs(box(0.18, 0.3, 0.18, 0), 0.6, 1), stone, x, 0.27, D / 2 + 0.5); add(CYL(0.05, 0.08, b.top - 0.47, 4), C("cr", 0xe7d9b8, null), x, 0.42 + (b.top - 0.47) / 2, D / 2 + 0.5, 0, Math.PI / 4); }
        add(box(2.36, 0.12, 0.66, 0), shared("deck", () => mat(0xb69c7c, planks())), 0, 0.12, D / 2 + 0.3);
        win(-0.6, 0.62, 0.46, 0.36, D / 2 + 0.01, false); win(0.62, 0.62, 0.3, 0.36, D / 2 + 0.01, false);
        doorAt(0.18, D / 2 + 0.01);
        chimney(-0.85, -0.3, b.top - 0.2, 1.1);
      } else if (type === "capecod") {
        W = 1.7; const b = body(0, W, D, 0.82, 0.9, 0.08);
        for (const x of [-0.42, 0.42]) dormer(x, b.top + 0.36, D / 4 + 0.06, b.p);
        chimney(W / 2 + 0.05, 0, 0, b.top + 1.1);
        for (const x of [-0.55, 0.55]) win(x, 0.55, 0.24, 0.34, D / 2 + 0.01);
        doorAt(0, D / 2 + 0.01, 0.58);
        add(box(0.6, 0.06, 0.25, 0), stone, 0, 0.1, D / 2 + 0.13);
        // picket fence along the front with a gap for the path
        const pk = shared("pick", () => mat(0xfbf8f2, null));
        for (let k = -10; k <= 7; k++) { if (Math.abs(k) <= 1) continue; add(box(0.05, 0.28, 0.02, 0), pk, k * 0.16, 0.14, D / 2 + 1.0); add(new THREE.ConeGeometry(0.036, 0.05, 4), pk, k * 0.16, 0.3, D / 2 + 1.0, 0, Math.PI / 4); }
        add(box(1.45, 0.03, 0.02, 0), pk, -0.88, 0.2, D / 2 + 0.985); add(box(0.95, 0.03, 0.02, 0), pk, 0.64, 0.2, D / 2 + 0.985);
      } else {
        const b = body(0, 2.0, D, 1.55, 0.62, 0.12);
        for (const x of [-0.72, -0.28, 0.28, 0.72]) win(x, 1.25, 0.24, 0.34, D / 2 + 0.01);
        for (const x of [-0.72, -0.36, 0.72]) win(x, 0.55, 0.24, 0.34, D / 2 + 0.01);
        // portico: two columns, small pediment
        for (const sx of [-1, 1]) add(CYL(0.035, 0.035, 0.72, 10), trim, 0.18 + sx * 0.24, 0.48, D / 2 + 0.28);
        add(box(0.62, 0.06, 0.36, 0), trim, 0.18, 0.86, D / 2 + 0.18);
        const s4 = new THREE.Shape(); s4.moveTo(-0.33, 0); s4.lineTo(0.33, 0); s4.lineTo(0, 0.18); s4.closePath();
        add(new THREE.ExtrudeGeometry(s4, { depth: 0.36, bevelEnabled: false }), trim, 0.18, 0.89, D / 2);
        doorAt(0.18, D / 2 + 0.01);
        add(box(0.62, 0.06, 0.3, 0), stone, 0.18, 0.1, D / 2 + 0.2);
        chimney(-0.7, -0.3, b.top, 0.95);
        // side garage with its own roof and panel door
        const gx = 1.5; body(gx, 0.95, 1.3, 0.78, 0.36, 0.06);
        add(box(0.72, 0.6, 0.03, 0), shared("gdoor", () => mat(0xf6f2ea, siding())), gx, 0.42, 0.66);
        for (let k = 0; k < 4; k++) add(box(0.13, 0.08, 0.02, 0), winMat, gx - 0.25 + k * 0.167, 0.62, 0.68);
        // basketball hoop on the driveway
        add(CYL(0.025, 0.025, 1.1, 6), shared("pole", () => mat(0x55595d, null, { metalness: 0.4, roughness: 0.5 })), gx + 0.5, 0.55, 1.3);
        add(box(0.34, 0.24, 0.02, 0), trim, gx + 0.5, 1.14, 1.28); add(new THREE.TorusGeometry(0.07, 0.008, 4, 12), C("hoop", 0xe58c5a, null), gx + 0.5, 1.03, 1.36, Math.PI / 2);
      }
      // yard: lawn, driveway, path, mailbox, tree, hedges
      add(box(3.6, 0.06, 3.0, 0), lawn, 0.25, 0.03, 0.4);
      add(box(0.85, 0.02, 1.7, 0), conc, 1.5, 0.065, 1.55);
      add(box(0.3, 0.02, 1.0, 0), conc, type === "craftsman" ? 0.18 : type === "capecod" ? 0 : 0.18, 0.065, D / 2 + 0.75);
      add(CYL(0.018, 0.018, 0.36, 5), wood, 0.85, 0.24, 1.8); add(box(0.1, 0.09, 0.18, 0), C("mb", pick([0x2f4a5e, 0xc6584a, 0x3c3c3c]), null), 0.85, 0.44, 1.8);
      add(CYL(0.06, 0.08, 0.9, 6), shared("trunk", () => mat(0x7a5a40, null)), -1.25, 0.5, 1.2);
      for (const [dx, dy, dz, rr] of [[0, 1.15, 0, 0.42], [-0.25, 0.95, 0.1, 0.3], [0.25, 0.98, -0.05, 0.32], [0.05, 1.42, 0.05, 0.28]]) add(SPH(rr, 9, 7), dy > 1.1 ? leaf : leafDk, -1.25 + dx, dy, 1.2 + dz);
      for (let k = 0; k < 4; k++) add(SPH(0.13, 8, 6), k % 2 ? leaf : leafDk, -0.9 + k * 0.24, 0.16, D / 2 + 0.16);
      return raw ? g : merge(g);
    }

    // ================= v79: Old Town, rumah deret gaya Belanda/Belgia (konsep: konsep/01-old-town-rumah-deret.png)
    // Satu lot = dua rumah sempit nempel. Tiap rumah: lantai dasar (pintu melengkung + jendela besar atau kafe berkanopi),
    // tiga lantai atas berjendela tinggi berbingkai putih, dan gevel di puncak: tangga, lonceng, leher, atau runcing.
    // Bata atau plester warna lembut, balok kerekan di puncak gevel, pot bunga di lantai satu.
    // Jendela lantai atas = kamar sewaan (12 per lot): yang dihuni nyala malam (winLit), yang kosong gelap, kamar pemain diberi
    // bingkai oranye (youMat). Rumah menghadap +z.
    const ROW = {
      walls: [[0xb2654c, "brick"], [0x8e4a3a, "brick"], [0xd9b46a, "plaster"], [0xa9bba4, "plaster"], [0xe6d8c0, "plaster"], [0x9fb0bd, "plaster"], [0xc98b6a, "brick"]],
      gables: ["step", "bell", "neck", "point"],
      roof: [0x4f4a48, 0x5d6670, 0x7a4a3a],
      door: [0x3f5b6e, 0x7a3f34, 0x2f4a3a, 0x8d4f45, 0x5f7a6d],
      shut: [0x5f7a6d, 0xf0e7d6, 0x3f5b6e, 0x2f4a3a],
    };
    function gableShape(kind, w, gh) {
      const s = new THREE.Shape(), x0 = -w / 2, x1 = w / 2;
      s.moveTo(x0, 0); s.lineTo(x1, 0);
      if (kind === "step") {   // tiga anak tangga tiap sisi + puncak datar
        const st = 3, sw = w / (2 * st + 1);
        s.lineTo(x1, gh / (st + 1));
        for (let i = 0; i < st; i++) { s.lineTo(x1 - (i + 1) * sw, gh * (i + 1) / (st + 1)); s.lineTo(x1 - (i + 1) * sw, gh * (i + 2) / (st + 1)); }
        for (let i = st - 1; i >= 0; i--) { s.lineTo(x0 + (i + 1) * sw, gh * (i + 2) / (st + 1)); s.lineTo(x0 + (i + 1) * sw, gh * (i + 1) / (st + 1)); }
        s.lineTo(x0, gh / (st + 1));
      } else if (kind === "bell") {
        s.bezierCurveTo(x1, gh * 0.6, w * 0.32, gh * 0.45, w * 0.22, gh * 0.8); s.quadraticCurveTo(0, gh * 1.15, -w * 0.22, gh * 0.8); s.bezierCurveTo(-w * 0.32, gh * 0.45, x0, gh * 0.6, x0, 0);
      } else if (kind === "neck") {
        s.quadraticCurveTo(w * 0.32, gh * 0.4, w * 0.22, gh * 0.45); s.lineTo(w * 0.22, gh * 0.9); s.quadraticCurveTo(0, gh * 1.12, -w * 0.22, gh * 0.9); s.lineTo(-w * 0.22, gh * 0.45); s.quadraticCurveTo(-w * 0.32, gh * 0.4, x0, 0);
      } else s.lineTo(0, gh);
      s.lineTo(x0, 0);
      return s;
    }
    function rowhouse(r, units, youUnit, winLit, winDark, youMat, raw) {
      const pick = a => a[Math.floor(r() * a.length) % a.length];
      const g = new THREE.Group(), add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
      const C = (k, c, map, o) => shared(k + c, () => mat(c, map, o));
      const trim = shared("trim", () => mat(0xfaf5ec, null, { roughness: 0.7 })), sill = C("sill", 0xe9e1d3, null), glassD = winDark;
      const wood = shared("wood", () => mat(0x8a5a3c, planks())), beam = C("beam", 0x5a4030, null), leaf = shared("leaf", () => mat(0x7f9f69, null, { roughness: 1 }));
      const FLW = [0xe58c8a, 0xf2c46d, 0xf6efe4, 0xc98bd0, 0xef9f6b];
      const W = 1.02, D = 1.5, G0 = 0.82, FH = 0.6, FL = 3, HW = G0 + FL * FH + 0.06, GH = 0.72;
      let used = -1, youY = null;
      for (let h = 0; h < 2; h++) {
        const cx = (h - 0.5) * W, [wc, kind] = pick(ROW.walls.filter((_, i) => i !== used)); used = ROW.walls.findIndex(w => w[0] === wc);
        const wall = kind === "brick" ? C("rb", wc, bricks()) : C("rp", wc, plaster());
        const gk = pick(ROW.gables), roof = C("rr", pick(ROW.roof), tiles(), { roughness: 0.8 }), door = C("rd", pick(ROW.door), planks());
        const shut = kind === "plaster" && r() < 0.6 ? C("rs", pick(ROW.shut), slats()) : null;
        // badan, plint batu bawah, pita putih tiap lantai
        add(uvs(new THREE.BoxGeometry(W - 0.01, HW, D), W, HW), wall, cx, HW / 2, 0);
        add(box(W, 0.14, D + 0.02, 0), C("plint", 0x8f877c, null), cx, 0.07, 0);
        for (let f = 0; f <= FL; f++) add(box(W, 0.035, 0.05, 0), trim, cx, G0 + f * FH - 0.02, D / 2 + 0.02);
        // gevel depan (bentuk khas) + gevel belakang runcing, atap pelana di antaranya (bubungan tegak lurus jalan)
        const gf = new THREE.ExtrudeGeometry(gableShape(gk, W, GH), { depth: 0.1, bevelEnabled: false, curveSegments: 6 });
        uvs(gf, 1, 1); add(gf, wall, cx, HW, D / 2 - 0.1);
        const edge = new THREE.ExtrudeGeometry(gableShape(gk, W + 0.04, GH + 0.04), { depth: 0.02, bevelEnabled: false, curveSegments: 6 });
        add(edge, trim, cx, HW - 0.01, D / 2 - 0.115);
        const gb = new THREE.ExtrudeGeometry(gableShape("point", W, GH * 0.8), { depth: 0.08, bevelEnabled: false }); add(gb, wall, cx, HW, -D / 2);
        const pitch = Math.atan2(GH * 0.8, W / 2), slope = Math.hypot(W / 2, GH * 0.8);
        for (const sx of [-1, 1]) add(box(slope + 0.04, 0.05, D - 0.16, 0, 0.5), roof, cx + sx * W / 4, HW + GH * 0.4 + 0.02, -0.02, 0, 0, -sx * pitch);
        // jendela gevel + balok kerekan
        add(box(0.24, 0.3, 0.03, 0), trim, cx, HW + GH * 0.36, D / 2 + 0.005); add(box(0.18, 0.24, 0.03, 0), glassD, cx, HW + GH * 0.36, D / 2 + 0.015);
        add(box(0.05, 0.05, 0.22, 0), beam, cx, HW + GH * (gk === "point" ? 0.66 : 0.78), D / 2 + 0.08);
        // lantai atas: dua jendela tinggi per lantai; tiap jendela = satu kamar
        for (let f = 0; f < FL; f++) for (let c = 0; c < 2; c++) {
          const u = h * 6 + f * 2 + c, x = cx + (c - 0.5) * 0.46, y = G0 + f * FH + FH * 0.48, lived = u === youUnit || units[u];
          add(box(0.3, 0.42, 0.03, 0), trim, x, y, D / 2 + 0.01);
          add(box(0.23, 0.35, 0.03, 0), lived ? winLit : glassD, x, y, D / 2 + 0.02);
          add(box(0.012, 0.35, 0.035, 0), trim, x, y, D / 2 + 0.025); add(box(0.23, 0.012, 0.035, 0), trim, x, y + 0.04, D / 2 + 0.025);
          add(box(0.34, 0.03, 0.07, 0), sill, x, y - 0.22, D / 2 + 0.035);
          if (shut) for (const sx of [-1, 1]) add(box(0.1, 0.36, 0.02, 0), shut, x + sx * 0.2, y, D / 2 + 0.012);
          if (f === 0 && (lived || r() < 0.4)) {   // pot bunga di lantai satu
            add(box(0.28, 0.06, 0.07, 0), wood, x, y - 0.27, D / 2 + 0.06);
            for (let k = 0; k < 3; k++) add(SPH(0.04, 6, 5), k === 1 ? C("fl", pick(FLW), null) : leaf, x - 0.09 + k * 0.09, y - 0.22, D / 2 + 0.07);
          }
          if (u === youUnit) { add(box(0.36, 0.48, 0.02, 0), youMat, x, y, D / 2 + 0.002); youY = y; }
        }
        // lantai dasar: pintu melengkung di satu sisi, jendela besar atau kafe di sisi lain
        const ds = h ? 1 : -1, dx = cx + ds * 0.28;
        add(box(0.32, 0.62, 0.04, 0), trim, dx, 0.31 + 0.1, D / 2 + 0.01);
        add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 12, 1, false, Math.PI / 2, Math.PI), trim, dx, 0.72, D / 2 + 0.01, Math.PI / 2, 0, 0);
        add(box(0.24, 0.52, 0.04, 0), door, dx, 0.4, D / 2 + 0.025);
        add(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10, 1, false, Math.PI / 2, Math.PI), glassD, dx, 0.66, D / 2 + 0.025, Math.PI / 2, 0, 0);
        add(box(0.36, 0.03, 0.14, 0), C("step", 0xcfc6b8, null), dx, 0.155, D / 2 + 0.07);
        const wx = cx - ds * 0.2, cafe = h === 0 && r() < 0.3;
        add(box(0.5, 0.48, 0.03, 0), trim, wx, 0.46, D / 2 + 0.01); add(box(0.44, 0.42, 0.03, 0), cafe ? winLit : glassD, wx, 0.46, D / 2 + 0.02);
        if (cafe) {   // kanopi bergaris
          for (let k = 0; k < 5; k++) add(box(0.12, 0.02, 0.3, 0), C("aw", k % 2 ? 0xf6efe4 : 0xc6584a, null), wx - 0.24 + k * 0.12, 0.76, D / 2 + 0.15, 0.3, 0, 0);
          add(CYL(0.012, 0.012, 0.3, 5), beam, wx - 0.2, 0.15, D / 2 + 0.32); add(box(0.2, 0.02, 0.2, 0), beam, wx - 0.2, 0.3, D / 2 + 0.32);
        } else add(box(0.5, 0.05, 0.08, 0), sill, wx, 0.2, D / 2 + 0.04);
      }
      // batas atap antar rumah
      add(box(0.04, 0.12, D, 0), C("plint", 0x8f877c, null), 0, HW + 0.03, 0);
      const out = raw ? g : merge(g);
      out.userData.youY = youY; out.userData.top = HW + GH;
      return out;
    }
    return { hi, lo, merge, suburb, rowhouse, textures: TX };
  }
  const Rumah = { create };
  if (typeof module !== "undefined") module.exports = Rumah; else globalThis.Rumah = Rumah;
})();

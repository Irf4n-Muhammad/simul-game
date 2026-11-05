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
    return { hi, lo, merge, textures: TX };
  }
  const Rumah = { create };
  if (typeof module !== "undefined") module.exports = Rumah; else globalThis.Rumah = Rumah;
})();

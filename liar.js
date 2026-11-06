// v79: wilayah liar (konsep: konsep/05-wilayah-liar). Tempat luas di antara kota: sepi, satu hal yang bikin penasaran.
// Prototipe: Lautan Pasir (Solenne) dan Hutan Lebat (Thalassa). Pasir: Bukit pasir berlapis sampai cakrawala, kuil setengah terkubur, lengkung batu,
// tulang raksasa kuno, oasis kecil, jejak kaki, dan dinding badai pasir di kejauhan.
// Hemat: tanah satu mesh, batu dan jejak kaki instancing, sisanya digabung per bahan (merge). Murni tampilan.
"use strict";
(function () {
  function create(env) {
    const { THREE, M, canvasTex } = env;
    // gabung potongan per bahan (posisi sudah di ruang grup)
    function merge(g) {
      g.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), m4 = new THREE.Matrix4(), by = new Map();
      g.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh) return;
        const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        geo.applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld));
        if (!geo.attributes.uv) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
        if (!by.has(o.material)) by.set(o.material, []);
        by.get(o.material).push(geo);
      });
      const out = new THREE.Group();
      for (const [m, list] of by) {
        let n = 0; for (const geo of list) n += geo.attributes.position.count;
        const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let a = 0, b = 0;
        for (const geo of list) { P.set(geo.attributes.position.array, a); N.set(geo.attributes.normal.array, a); U.set(geo.attributes.uv.array, b); a += geo.attributes.position.count * 3; b += geo.attributes.position.count * 2; geo.dispose(); }
        const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(P, 3)); mg.setAttribute("normal", new THREE.BufferAttribute(N, 3)); mg.setAttribute("uv", new THREE.BufferAttribute(U, 2)); mg.computeBoundingSphere();
        const mesh = new THREE.Mesh(mg, m); mesh.castShadow = mesh.receiveShadow = true; out.add(mesh);
      }
      return out;
    }
    const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

    // ================= Lautan Pasir
    // tinggi pasir: punggung bukit panjang (sisi landai ke angin, sisi curam di balik), lapis kedua menyilang, riak kecil.
    // Lingkaran tengah (tempat makhluk jalan) dibuat landai.
    function duneH(x, z) {
      const w = x * 0.05 + Math.sin(z * 0.018) * 1.6 + Math.sin(z * 0.041 + 1.3) * 0.5;
      const ph = w - Math.floor(w);   // 0..1 sepanjang satu bukit
      const ridge = ph < 0.72 ? sstep(0, 0.72, ph) : 1 - sstep(0.72, 1, ph);   // naik landai, turun curam
      const big = ridge * (5.5 + 2.5 * Math.sin(z * 0.013 + x * 0.004));
      const cross = (0.5 + 0.5 * Math.sin((x * 0.6 + z * 0.8) * 0.022 + 2.0)) * 2.4;
      const small = Math.sin(x * 0.21 + z * 0.05) * Math.sin(z * 0.17) * 0.25;
      const r = Math.hypot(x, z), flat = 0.18 + 0.82 * sstep(10, 38, r);
      return (big + cross + small) * flat;
    }
    function sandTex() {
      return canvasTex((g, w, h) => {
        g.fillStyle = "#e9cf9a"; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 6) { const o = Math.sin(y * 0.11) * 6; g.fillStyle = "rgba(160,110,60,0.13)"; g.fillRect(0, y + o * 0.2, w, 2); g.fillStyle = "rgba(255,245,220,0.18)"; g.fillRect(0, y + 2 + o * 0.2, w, 1.5); }
        for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "120,80,40" : "255,250,235"},${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
      }, 256, 256, 90, 90);
    }
    function pasir(opt = {}) {
      const g = new THREE.Group(), S = 900, SEG = 160;
      // ---- tanah: satu mesh, warna per titik (punggung terang, lembah agak gelap kemerahan)
      const geo = new THREE.PlaneGeometry(S, S, SEG, SEG); geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cA = new THREE.Color(0xf3dcaa).convertSRGBToLinear(), cB = new THREE.Color(0xc99560).convertSRGBToLinear(), c = new THREE.Color();
      let hmax = 0; for (let i = 0; i < pos.count; i++) { const h = duneH(pos.getX(i), pos.getZ(i)); pos.setY(i, h); hmax = Math.max(hmax, h); }
      for (let i = 0; i < pos.count; i++) { c.copy(cB).lerp(cA, Math.min(1, 0.25 + pos.getY(i) / hmax * 0.9)); col.set([c.r, c.g, c.b], i * 3); }
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
      const sand = M(0xffffff, { roughness: 1, map: sandTex(), vertexColors: true });
      const ground = new THREE.Mesh(geo, sand); ground.receiveShadow = true; ground.castShadow = true; g.add(ground);
      const H = (x, z) => duneH(x, z);

      // ---- benda: dikumpulkan di satu grup lalu digabung per bahan
      const p = new THREE.Group(), add = (gm, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(gm, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); p.add(o); return o; };
      const stoneT = M(0xd9c09a, { roughness: 0.95 }), stoneD = M(0xc4a77e, { roughness: 0.95 }), dark = M(0x3a2c24, { roughness: 1 });
      const sandM = M(0xe2c088, { roughness: 1 });
      const rock = M(0xb9774f, { roughness: 0.95, flatShading: true }), bone = M(0xf1e8d6, { roughness: 0.7 });
      // kuil setengah terkubur (puncaknya saja yang muncul): tangga atas, deretan tiang, atap segitiga, pintu gelap
      const TX = 22, TZ = -46, ty = H(TX, TZ) - 3.4;   // terkubur sampai pinggang tiang
      add(new THREE.BoxGeometry(14, 2.4, 9), stoneD, TX, ty + 0.6, TZ);
      add(new THREE.BoxGeometry(12, 0.6, 7.6), stoneT, TX, ty + 2.1, TZ);
      for (let k = 0; k < 6; k++) { add(new THREE.CylinderGeometry(0.42, 0.48, 4.2, 10), stoneT, TX - 5 + k * 2, ty + 4.5, TZ + 3.2); if (k !== 2 && k !== 3) add(new THREE.CylinderGeometry(0.42, 0.48, 4.2, 10), stoneT, TX - 5 + k * 2, ty + 4.5, TZ - 3.2); }
      add(new THREE.BoxGeometry(12.4, 0.7, 7.8), stoneD, TX, ty + 6.95, TZ);
      const ped = new THREE.Shape(); ped.moveTo(-6.4, 0); ped.lineTo(6.4, 0); ped.lineTo(0, 2.6); ped.lineTo(-6.4, 0);
      add(new THREE.ExtrudeGeometry(ped, { depth: 7.8, bevelEnabled: false }), stoneT, TX, ty + 7.3, TZ - 3.9);
      add(new THREE.BoxGeometry(2.4, 3.4, 4), dark, TX, ty + 3.9, TZ);
      // pasir yang menimbun: gundukan miring di depan dan samping kuil, menutup kaki tiang
      for (const [dx, dz, sx, sy, sz] of [[0, 5.5, 9, 3.6, 4], [-7.5, 1, 4, 3, 6], [6, -4, 6, 2.6, 5]]) add(new THREE.SphereGeometry(1, 16, 10), sandM, TX + dx, ty + 2.2, TZ + dz).scale.set(sx, sy, sz);
      // tiang patah yang tergeletak
      add(new THREE.CylinderGeometry(0.42, 0.42, 3, 10), stoneT, TX + 9, H(TX + 9, TZ + 7) + 0.2, TZ + 7, 0, 0.6, Math.PI / 2);
      // lengkung batu merah
      const AX = -30, AZ = -24, ay = H(AX, AZ) - 0.8, arch = new THREE.Shape();
      arch.moveTo(-7, 0); arch.lineTo(-7, 9); arch.quadraticCurveTo(-7, 15, 0, 15); arch.quadraticCurveTo(7, 15, 7, 9); arch.lineTo(7, 0); arch.lineTo(3.6, 0); arch.lineTo(3.6, 8); arch.quadraticCurveTo(3.6, 11, 0, 11); arch.quadraticCurveTo(-3.6, 11, -3.6, 8); arch.lineTo(-3.6, 0); arch.lineTo(-7, 0);
      add(new THREE.ExtrudeGeometry(arch, { depth: 4, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5, bevelSegments: 1, curveSegments: 8 }), rock, AX, ay, AZ, 0, 0.5, 0);
      // tulang raksasa kuno: tulang punggung dan rusuk melengkung, tengkorak setengah terkubur
      const BX = 14, BZ = 10, by = H(BX, BZ);
      for (let k = 0; k < 7; k++) {
        const z = BZ - 6 + k * 2;
        for (const sx of [-1, 1]) add(new THREE.TorusGeometry(3.2 - Math.abs(k - 3) * 0.3, 0.16, 6, 14, Math.PI * 0.5), bone, BX, by - 0.4, z, 0, sx > 0 ? 0 : Math.PI, 0);
        add(new THREE.SphereGeometry(0.32, 8, 6), bone, BX, by + 2.7 - Math.abs(k - 3) * 0.3, z);
      }
      add(new THREE.SphereGeometry(1.6, 12, 10), bone, BX, by + 0.4, BZ + 9.2).scale.set(1, 0.7, 1.3);
      add(new THREE.SphereGeometry(0.3, 6, 5), dark, BX - 0.6, by + 0.8, BZ + 10.6); add(new THREE.SphereGeometry(0.3, 6, 5), dark, BX + 0.6, by + 0.8, BZ + 10.6);
      // oasis: air, rumput, tiga palem
      const OX = -34, OZ = 30, oy = H(OX, OZ);
      const water = M(0x3f7fa8, { roughness: 0.15, metalness: 0.1 }), grass = M(0x6f9f5e, { roughness: 1 }), trunk = M(0x8a6a48, { roughness: 0.9 }), leaf = M(0x4f9a5e, { roughness: 0.8, side: THREE.DoubleSide });
      add(new THREE.CylinderGeometry(7, 7.6, 0.4, 24), grass, OX, oy - 0.1, OZ).scale.set(1, 1, 0.7);
      add(new THREE.CylinderGeometry(5, 5, 0.2, 24), water, OX, oy + 0.12, OZ).scale.set(1, 1, 0.65);
      for (const [dx, dz, s, lean] of [[-5.5, 2, 1, 0.25], [4.8, -2.6, 0.85, -0.3], [6, 2.4, 1.1, 0.2]]) {
        const x = OX + dx, z = OZ + dz, hT = 7 * s;
        const tr = add(new THREE.CylinderGeometry(0.22 * s, 0.34 * s, hT, 7), trunk, x, oy + hT / 2, z, 0, 0, lean); tr.position.x += Math.sin(-lean) * hT / 2;
        const tx = x - Math.sin(lean) * hT, tyy = oy + hT * Math.cos(lean);
        for (let k = 0; k < 8; k++) {   // daun: pangkal di puncak batang, menjuntai ke bawah
          const a = k / 8 * Math.PI * 2 + s, lg = new THREE.PlaneGeometry(3.2 * s, 0.7 * s, 4, 1); lg.translate(1.6 * s, 0, 0); lg.rotateX(-Math.PI / 2);
          const lp = lg.attributes.position; for (let i = 0; i < lp.count; i++) { const u = lp.getX(i) / (3.2 * s); lp.setY(i, -u * u * 1.6 * s); lp.setZ(i, lp.getZ(i) * (1 - u * 0.7)); } lg.computeVertexNormals();
          const lf = add(lg, leaf, tx, tyy, z); lf.rotation.order = "YXZ"; lf.rotation.set(0, -a, 0.25);
        }
      }
      const props = merge(p); g.add(props);

      // ---- batu kecil berserakan (instancing)
      const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rock, 46), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
      let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < 46; i++) { const a = rnd() * 6.283, r = 14 + rnd() * 150, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.4 + rnd() * (r > 60 ? 3 : 1.4); v.set(x, H(x, z) + s * 0.2, z); q.setFromEuler(e.set(rnd() * 3, rnd() * 3, rnd() * 3)); sc.set(s, s * (0.5 + rnd() * 0.5), s); rocks.setMatrixAt(i, m4.compose(v, q, sc)); }
      rocks.castShadow = rocks.receiveShadow = true; rocks.frustumCulled = false; g.add(rocks);
      // ---- jejak kaki: dari tengah ke arah kuil, berkelok
      const steps = 38, prints = new THREE.InstancedMesh(new THREE.CircleGeometry(0.16, 8).rotateX(-Math.PI / 2), M(0xb8864e, { roughness: 1 }), steps * 2);
      for (let i = 0; i < steps; i++) { const t = i / steps, x = TX * t + Math.sin(t * 7) * 3, z = 2 + (TZ + 6 - 2) * t; for (const sd of [-1, 1]) { const k = i * 2 + (sd > 0 ? 1 : 0), xx = x + sd * 0.22, zz = z + (sd > 0 ? 0.35 : 0); v.set(xx, H(xx, zz) + 0.03, zz); q.identity(); sc.set(1, 1, 1.5); prints.setMatrixAt(k, m4.compose(v, q, sc)); } }
      prints.frustumCulled = false; g.add(prints);

      // ---- dinding badai pasir di kejauhan (bidang transparan, teksturnya bergeser pelan)
      const stormT = canvasTex((cx, w, h) => {
        const gr = cx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(214,160,100,0.5)"); gr.addColorStop(1, "rgba(196,140,84,0.95)"); cx.fillStyle = gr; cx.fillRect(0, 0, w, h);
        for (let i = 0; i < 60; i++) { const x = Math.random() * w, y = h * (0.2 + Math.random() * 0.6), r = 20 + Math.random() * 60, rg = cx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, "rgba(232,190,130,0.35)"); rg.addColorStop(1, "rgba(232,190,130,0)"); cx.fillStyle = rg; cx.fillRect(x - r, y - r, r * 2, r * 2); }
        // pudar di semua tepi kecuali bawah (bawahnya tenggelam di balik bukit)
        cx.globalCompositeOperation = "destination-in";
        const sd = cx.createLinearGradient(0, 0, w, 0); sd.addColorStop(0, "rgba(0,0,0,0)"); sd.addColorStop(0.25, "rgba(0,0,0,1)"); sd.addColorStop(0.75, "rgba(0,0,0,1)"); sd.addColorStop(1, "rgba(0,0,0,0)"); cx.fillStyle = sd; cx.fillRect(0, 0, w, h);
        const tp = cx.createLinearGradient(0, 0, 0, h); tp.addColorStop(0, "rgba(0,0,0,0)"); tp.addColorStop(0.45, "rgba(0,0,0,1)"); cx.fillStyle = tp; cx.fillRect(0, 0, w, h);
        cx.globalCompositeOperation = "source-over";
      }, 512, 256);
      stormT.wrapS = THREE.ClampToEdgeWrapping;
      const storm = new THREE.Mesh(new THREE.PlaneGeometry(260, 100), new THREE.MeshBasicMaterial({ map: stormT, transparent: true, depthWrite: false, fog: false }));
      storm.position.set(90, 28, -230); storm.rotation.y = -0.35; storm.visible = opt.storm !== false; g.add(storm);

      // ---- bintang (malam)
      const starG = new THREE.BufferGeometry(), sp = new Float32Array(900 * 3);
      for (let i = 0; i < 900; i++) { const a = rnd() * 6.283, el = 0.08 + rnd() * 1.4, r = 380; sp.set([Math.cos(a) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(a) * Math.cos(el) * r], i * 3); }
      starG.setAttribute("position", new THREE.BufferAttribute(sp, 3));
      const stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.9, fog: false }));
      stars.visible = false; g.add(stars);

      const spots = { temple: { x: TX, z: TZ, y: ty }, arch: { x: AX, z: AZ }, bones: { x: BX, z: BZ }, oasis: { x: OX, z: OZ } };
      const update = t => { storm.position.x = 90 + Math.sin(t / 40000) * 30; };   // badai bergeser pelan di cakrawala
      return { group: g, height: H, spots, update, storm, stars, sand };
    }

    // ================= Hutan Lebat (Thalassa, tropis)
    // Tanah bergelombang, sungai berkelok di kanan, jalan setapak lurus ke pohon raksasa. Pohon biasa instancing.
    const riverX = z => 15 + Math.sin(z * 0.035) * 8;
    function forestH(x, z) {
      let h = (0.5 + 0.5 * Math.sin(x * 0.045 + 1.1) * Math.sin(z * 0.038)) * 3.2 + (0.5 + 0.5 * Math.sin(x * 0.13 + z * 0.09)) * 0.7;
      h *= 0.25 + 0.75 * sstep(12, 50, Math.hypot(x, z + 15));   // tengah lebih landai
      const d = Math.abs(x - riverX(z));
      return h * sstep(4, 10, d) - 1.3 * (1 - sstep(3.5, 6.5, d));   // alur sungai
    }
    function hutan(opt = {}) {
      const g = new THREE.Group(), S = 520, SEG = 130, H = forestH;
      let seed = 11; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      // ---- tanah: hijau lumut di punggung, coklat tanah di lembah dan tepi sungai
      const geo = new THREE.PlaneGeometry(S, S, SEG, SEG); geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cA = new THREE.Color(0x6f9a4c).convertSRGBToLinear(), cB = new THREE.Color(0x6b5236).convertSRGBToLinear(), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), h = H(x, z); pos.setY(i, h); const path = Math.abs(x) < 2.2 && z > -36 && z < 16 ? 0.55 : 0; c.copy(cB).lerp(cA, Math.max(0, Math.min(1, 0.35 + h * 0.25 + Math.sin(x * 0.3) * Math.sin(z * 0.27) * 0.2 - path))); col.set([c.r, c.g, c.b], i * 3); }
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
      const litter = canvasTex((cx, w, h) => { cx.fillStyle = "#c9c2a4"; cx.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { cx.fillStyle = `rgba(${rnd() < 0.5 ? "70,60,30" : "235,240,200"},${0.08 + rnd() * 0.15})`; cx.beginPath(); cx.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 4, 1 + rnd() * 2, rnd() * 3, 0, 6.3); cx.fill(); } }, 256, 256, 60, 60);
      const ground = new THREE.Mesh(geo, M(0xffffff, { roughness: 1, map: litter, vertexColors: true })); ground.receiveShadow = true; g.add(ground);
      const waterM = M(0x3d7f7a, { roughness: 0.08, metalness: 0.2 });
      const water = new THREE.Mesh(new THREE.PlaneGeometry(S, S).rotateX(-Math.PI / 2), waterM); water.position.y = -0.55; water.receiveShadow = true; g.add(water);

      // ---- pohon biasa: batang + 3 gumpal daun (instancing, warna daun beda-beda)
      const N = 780, trunkM = M(0x6e5440, { roughness: 0.95 }), leafM = M(0xffffff, { roughness: 0.85 });
      const tGeo = new THREE.CylinderGeometry(0.32, 0.55, 1, 7, 1).translate(0, 0.5, 0), cGeo = new THREE.IcosahedronGeometry(1, 1);
      const trunks = new THREE.InstancedMesh(tGeo, trunkM, N), crowns = new THREE.InstancedMesh(cGeo, leafM, N * 3);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), cc = new THREE.Color();
      const greens = [0x3f7a3a, 0x4d8a3c, 0x2f6a3a, 0x5b9142, 0x386f45].map(h => new THREE.Color(h).convertSRGBToLinear());
      const free = (x, z, pad = 0) => !(Math.abs(x) < 5 + pad && z > -48 && z < 20) && Math.abs(x - riverX(z)) > 6 + pad && Math.hypot(x, z + 40) > 13 + pad && Math.hypot(x + 15, z + 20) > 7 + pad;
      let n = 0;
      for (let tries = 0; n < N && tries < 14000; tries++) {
        const a = rnd() * 6.283, r = 6 + Math.sqrt(rnd()) * 170, x = Math.cos(a) * r, z = Math.sin(a) * r - 15; if (!free(x, z)) continue;
        const s = 0.8 + rnd() * 0.9, ht = (9 + rnd() * 9) * s, y = H(x, z) - 0.3;
        trunks.setMatrixAt(n, m4.compose(v.set(x, y, z), q.setFromEuler(e.set((rnd() - 0.5) * 0.12, rnd() * 6, (rnd() - 0.5) * 0.12)), sc.set(s, ht, s)));
        for (let k = 0; k < 3; k++) { const cr = (2.6 + rnd() * 1.6) * s, ox = (rnd() - 0.5) * 3.4 * s, oz = (rnd() - 0.5) * 3.4 * s; crowns.setMatrixAt(n * 3 + k, m4.compose(v.set(x + ox, y + ht - 0.4 + k * 0.9 * s, z + oz), q.setFromEuler(e.set(rnd(), rnd() * 6, rnd())), sc.set(cr, cr * 0.75, cr))); crowns.setColorAt(n * 3 + k, cc.copy(greens[(n + k) % 5]).multiplyScalar(0.85 + rnd() * 0.3)); }
        n++;
      }
      trunks.count = n; crowns.count = n * 3;
      for (const im of [trunks, crowns]) { im.castShadow = im.receiveShadow = true; im.frustumCulled = false; g.add(im); }

      // ---- semak dan pakis (instancing)
      const fernT = canvasTex((cx, w, h) => { cx.clearRect(0, 0, w, h); cx.strokeStyle = "#fff"; cx.fillStyle = "#fff"; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(w / 2, h); cx.quadraticCurveTo(w / 2 + 6, h * 0.4, w / 2 + 18, 4); cx.stroke(); for (let i = 1; i < 14; i++) { const t = i / 14, px = w / 2 + 18 * t * t + 2, py = h - t * (h - 6), L = (1 - t) * w * 0.42 + 6; for (const sd of [-1, 1]) { cx.beginPath(); cx.ellipse(px + sd * L / 2, py - 4, L / 2, 4, sd * -0.35, 0, 6.3); cx.fill(); } } }, 128, 256);
      const fGeo = new THREE.PlaneGeometry(1, 2, 1, 2).translate(0, 1, 0), fp = fGeo.attributes.position; for (let i = 0; i < fp.count; i++) { const t = fp.getY(i) / 2; fp.setZ(i, t * t * 0.9); } fGeo.computeVertexNormals();
      const fernM = M(0x4f8a3e, { roughness: 0.9, map: fernT, alphaTest: 0.5, side: THREE.DoubleSide }), FN = 700, ferns = new THREE.InstancedMesh(fGeo, fernM, FN);
      const bushM = M(0x3e7438, { roughness: 0.9 }), BN = 260, bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), bushM, BN);
      let nf = 0, nb = 0;
      for (let tries = 0; (nf < FN || nb < BN) && tries < 9000; tries++) {
        const a = rnd() * 6.283, r = 3 + Math.sqrt(rnd()) * 90, x = Math.cos(a) * r, z = Math.sin(a) * r - 15; if (Math.abs(x) < 2.6 && z > -36 && z < 18) continue; if (Math.abs(x - riverX(z)) < 4.5) continue; if (Math.hypot(x, z + 40) < 7) continue; if (z > 3 && Math.abs(x) < 8) continue;
        const y = H(x, z);
        if (nf < FN && rnd() < 0.75) { const s = 0.5 + rnd() * 0.8, b0 = rnd() * 6; for (let k = 0; k < 4 && nf < FN; k++) ferns.setMatrixAt(nf++, m4.compose(v.set(x, y - 0.05, z), q.setFromEuler(e.set(-0.25, b0 + k * 1.57, 0, "YXZ")), sc.set(s, s * (0.8 + rnd() * 0.4), s))); }
        else if (nb < BN) { const s = 0.6 + rnd() * 1.2; bushes.setMatrixAt(nb++, m4.compose(v.set(x, y + s * 0.3, z), q.setFromEuler(e.set(rnd(), rnd() * 6, rnd())), sc.set(s * 1.3, s, s * 1.3))); }
      }
      ferns.count = nf; bushes.count = nb; ferns.castShadow = true; bushes.castShadow = bushes.receiveShadow = true; ferns.frustumCulled = bushes.frustumCulled = false; g.add(ferns, bushes);

      // ---- benda khusus, digabung per bahan
      const p = new THREE.Group(), add = (gm, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(gm, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); p.add(o); return o; };
      const bark = M(0x7a5c44, { roughness: 0.95 }), barkD = M(0x5a4232, { roughness: 1 }), dark = M(0x1e1712, { roughness: 1 }), bigLeaf = M(0x2f6b36, { roughness: 0.85 }), bigLeaf2 = M(0x47843a, { roughness: 0.85 });
      const stone = M(0x8e8f80, { roughness: 0.95, flatShading: true }), moss = M(0x5f8f3e, { roughness: 1 }), vine = M(0x3f6b2e, { roughness: 0.9 });
      // pohon raksasa: batang lebar bergelombang, akar papan, lubang di kaki, dahan, kanopi besar, sulur menjuntai
      const GX = 0, GZ = -40, gy = H(GX, GZ) - 0.5, GH = 24;
      const gt = new THREE.CylinderGeometry(2.8, 4.2, GH, 18, 8).translate(0, GH / 2, 0), gp = gt.attributes.position;
      for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), y = gp.getY(i), a = Math.atan2(z, x), k = 1 + Math.sin(a * 5 + y * 0.25) * 0.09 + Math.sin(a * 11) * 0.04; gp.setX(i, x * k); gp.setZ(i, z * k); }
      gt.computeVertexNormals(); add(gt, bark, GX, gy, GZ);
      const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(6.5, 0); fin.quadraticCurveTo(3.2, 1.2, 2.2, 6.5); fin.lineTo(0, 7.5); fin.lineTo(0, 0);
      const finG = new THREE.ExtrudeGeometry(fin, { depth: 0.7, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2, bevelSegments: 1, curveSegments: 6 }).translate(0, 0, -0.35);
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + 0.3; if (Math.abs(Math.sin(a) - 1) < 0.15) continue; const f = add(finG, barkD, GX + Math.cos(a) * 2.6, gy - 0.3, GZ + Math.sin(a) * 2.6); f.rotation.y = -a; f.scale.setScalar(0.85 + (k % 3) * 0.12); }
      const hole = new THREE.Shape(); hole.moveTo(-1.1, 0); hole.lineTo(-1.1, 2.4); hole.quadraticCurveTo(0, 4.1, 1.1, 2.4); hole.lineTo(1.1, 0); hole.lineTo(-1.1, 0);
      add(new THREE.ShapeGeometry(hole, 8), dark, GX, gy + 0.5, GZ + 4.75, -0.06);
      for (const [a, el, L] of [[0.4, 0.75, 11], [2.1, 0.6, 12], [3.6, 0.8, 10], [5.0, 0.65, 12], [1.2, 0.9, 9]]) {
        const br = new THREE.CylinderGeometry(0.6, 1.2, L, 8).translate(0, L / 2, 0), o = add(br, bark, GX + Math.cos(a) * 1.5, gy + GH - 4, GZ + Math.sin(a) * 1.5);
        o.rotation.order = "YZX"; o.rotation.set(0, -a, -el);
        const ex = GX + Math.cos(a) * (1.5 + Math.sin(el) * L), ez = GZ + Math.sin(a) * (1.5 + Math.sin(el) * L), ey = gy + GH - 4 + Math.cos(el) * L;
        add(new THREE.IcosahedronGeometry(1, 1), (a * 10 | 0) % 2 ? bigLeaf : bigLeaf2, ex, ey + 1, ez, a, a, 0).scale.set(7, 4.2, 7);
        for (let k = 0; k < 3; k++) { const vl = 6 + k * 3 + (a * 7 % 3); add(new THREE.CylinderGeometry(0.07, 0.07, vl, 4), vine, ex + (k - 1) * 1.6, ey - 2.5 - vl / 2, ez + (k - 1) * 0.8); }
      }
      add(new THREE.IcosahedronGeometry(1, 1), bigLeaf, GX, gy + GH + 4, GZ, 0.3, 0, 0).scale.set(9, 5.5, 9);
      // reruntuhan batu berlumut di kiri jalan: tangga, tiang patah, balok jatuh
      const RX = -15, RZ = -20, ry0 = H(RX, RZ);
      for (let k = 0; k < 3; k++) { add(new THREE.BoxGeometry(7 - k * 1.6, 0.6, 5 - k * 1.2), stone, RX, ry0 + 0.1 + k * 0.6, RZ, 0, 0.2, 0); add(new THREE.BoxGeometry(7.05 - k * 1.6, 0.12, 5.05 - k * 1.2), moss, RX, ry0 + 0.43 + k * 0.6, RZ, 0, 0.2, 0).scale.set(1, 1, 0.55); }
      for (const [dx, dz, h] of [[-2.2, -1.2, 4.6], [2.2, -1.4, 2.6], [2.4, 1.3, 1.4]]) { add(new THREE.CylinderGeometry(0.55, 0.6, h, 9), stone, RX + dx, ry0 + 1.9 + h / 2, RZ + dz); add(new THREE.CylinderGeometry(0.62, 0.62, 0.25, 9), moss, RX + dx, ry0 + 1.9 + h, RZ + dz); }
      add(new THREE.BoxGeometry(3.6, 0.8, 1), stone, RX + 4.5, ry0 + 0.5, RZ + 2.5, 0.1, 0.7, 0.25);
      add(new THREE.CylinderGeometry(0.55, 0.6, 3.6, 9), stone, RX - 4, ry0 + 0.5, RZ + 3, 0, 0.5, Math.PI / 2);
      // batang kayu jadi jembatan di atas sungai, dan batu pijakan
      const LZ = -6, lx = riverX(LZ);
      add(new THREE.CylinderGeometry(0.55, 0.65, 13, 10), bark, lx, 0.2, LZ, 0, 0.25, Math.PI / 2);
      for (let k = 0; k < 6; k++) { const z = 8 - k * 3.4, x = riverX(z) + (k % 2 ? 1 : -1); add(new THREE.DodecahedronGeometry(0.9, 0), stone, x, -0.55, z, k, k, 0).scale.set(1, 0.45, 1); }
      // batu besar berlumut di tepi sungai
      for (const [z, s] of [[-26, 2.2], [14, 1.6], [-50, 2.8]]) { const x = riverX(z) + 6.5; add(new THREE.DodecahedronGeometry(s, 0), stone, x, H(x, z) + s * 0.4, z, z, z, 0); add(new THREE.SphereGeometry(s * 0.85, 8, 5, 0, 6.3, 0, 1.1), moss, x, H(x, z) + s * 0.55, z); }
      const props = merge(p); g.add(props);

      // ---- jamur (batang + topi; topi menyala lembut di malam hari)
      const capM = M(0xd8644a, { roughness: 0.6, emissive: 0x6fffd0, emissiveIntensity: 0 }), stemM = M(0xf1e6d0, { roughness: 0.8 });
      const MN = 90, stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 6).translate(0, 0.17, 0), stemM, MN), caps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 5, 0, 6.3, 0, 1.4).translate(0, 0.3, 0), capM, MN);
      for (let i = 0; i < MN; i++) {
        const near = i < 50, a = rnd() * 6.283, r = near ? 5 + rnd() * 6 : 3 + rnd() * 40, x = near ? GX + Math.cos(a) * r : (rnd() < 0.5 ? -1 : 1) * (2.8 + rnd() * 3), z = near ? GZ + Math.sin(a) * r : -36 + rnd() * 38;
        if (Math.abs(x - riverX(z)) < 5.5) { stems.setMatrixAt(i, m4.makeScale(0, 0, 0)); caps.setMatrixAt(i, m4); continue; }
        const s = 0.8 + rnd() * 1.6; m4.compose(v.set(x, H(x, z) - 0.05, z), q.setFromEuler(e.set((rnd() - 0.5) * 0.3, 0, (rnd() - 0.5) * 0.3)), sc.set(s, s, s)); stems.setMatrixAt(i, m4); caps.setMatrixAt(i, m4);
      }
      stems.castShadow = caps.castShadow = true; stems.frustumCulled = caps.frustumCulled = false; g.add(stems, caps);

      // ---- berkas cahaya tembus kanopi (siang) dan kunang-kunang (malam)
      const shaftT = canvasTex((cx, w, h) => { const gr = cx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,244,200,0.55)"); gr.addColorStop(1, "rgba(255,244,200,0)"); cx.fillStyle = gr; cx.fillRect(0, 0, w, h); cx.globalCompositeOperation = "destination-in"; const sd = cx.createLinearGradient(0, 0, w, 0); sd.addColorStop(0, "rgba(0,0,0,0)"); sd.addColorStop(0.5, "rgba(0,0,0,1)"); sd.addColorStop(1, "rgba(0,0,0,0)"); cx.fillStyle = sd; cx.fillRect(0, 0, w, h); }, 64, 128);
      const shaftM = new THREE.MeshBasicMaterial({ map: shaftT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.35 });
      const shafts = new THREE.Group();
      for (const [x, z, w] of [[-3, -8, 3], [4, -20, 4], [-6, -30, 3.5], [9, 2, 3], [-2, -46, 5]]) for (const ry of [0, Math.PI / 2]) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(w, 26), shaftM); sh.position.set(x + 3, H(x, z) + 12, z); sh.rotation.set(0, ry + 0.4, 0.22); shafts.add(sh); }
      g.add(shafts);
      const FF = 220, fg = new THREE.BufferGeometry(), fpA = new Float32Array(FF * 3), base = new Float32Array(FF * 3);
      for (let i = 0; i < FF; i++) { const x = (rnd() - 0.5) * 50, z = -50 + rnd() * 66; base.set([x, H(x, z) + 0.4 + rnd() * 3, z], i * 3); }
      fpA.set(base); fg.setAttribute("position", new THREE.BufferAttribute(fpA, 3));
      const dotT = canvasTex((cx, w, h) => { const rg = cx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); rg.addColorStop(0, "rgba(255,255,255,1)"); rg.addColorStop(0.3, "rgba(255,255,255,0.8)"); rg.addColorStop(1, "rgba(255,255,255,0)"); cx.fillStyle = rg; cx.fillRect(0, 0, w, h); }, 32, 32);
      const flies = new THREE.Points(fg, new THREE.PointsMaterial({ map: dotT, color: 0xd8ff7a, size: 0.4, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      flies.visible = false; g.add(flies);
      const setNight = on => { shafts.visible = !on; flies.visible = on; capM.emissiveIntensity = on ? 1.2 : 0; };
      setNight(!!opt.night);
      const update = t => {
        if (!flies.visible) return; const a = fg.attributes.position.array;
        for (let i = 0; i < FF; i++) { const k = i * 3, ph = i * 1.7; a[k] = base[k] + Math.sin(t / 1300 + ph) * 0.6; a[k + 1] = base[k + 1] + Math.sin(t / 900 + ph * 2) * 0.3; a[k + 2] = base[k + 2] + Math.cos(t / 1600 + ph) * 0.6; }
        fg.attributes.position.needsUpdate = true;
      };
      const spots = { giant: { x: GX, z: GZ, y: gy }, ruins: { x: RX, z: RZ }, bridge: { x: lx, z: LZ } };
      return { group: g, height: H, spots, update, setNight, flies, shafts };
    }

    // ================= panggung (v80): satu wilayah liar siap digambar di game. Lampu, langit, kabut, sudut kamera tetap,
    // siang/malam, dan grup `crit` tempat game menaruh makhluknya. Kamera nggak bebas (lebih ringan dan nggak bikin pusing di HP).
    function stage(kind, o = {}) {
      const forest = kind === "hutan", scene = new THREE.Scene(), Z = forest ? hutan({}) : pasir({});
      scene.add(Z.group);
      const hemi = new THREE.HemisphereLight(0xfff4e6, 0x8a6a48, 0.5), sun = new THREE.DirectionalLight(0xffe6c4, 1.6);
      sun.castShadow = true; sun.shadow.mapSize.set(o.shadow || 2048, o.shadow || 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.05;
      Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 }); sun.shadow.camera.updateProjectionMatrix();
      scene.add(hemi, sun, sun.target);
      const sky = c => canvasTex((g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c[0]); gr.addColorStop(0.55, c[1]); gr.addColorStop(1, c[2]); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 16, 256);
      const SKY = forest ? [sky(["#8fc0d8", "#cfe4dc", "#b8d4a6"]), sky(["#060d18", "#14232c", "#1c2c2c"])] : [sky(["#8fb9de", "#cfe0ec", "#f6dfb6"]), sky(["#0e1630", "#2a3358", "#5a4a5e"])];
      const FOG = forest ? [[0xa9c7a4, 18, 150], [0x14232a, 18, 150]] : [[0xf3dcb4, 70, 300], [0x5a4a5e, 70, 300]];
      const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: 0xf6f0dc, fog: false })); moon.position.set(-120, 150, -300); moon.lookAt(0, 0, 0); scene.add(moon);
      const lan = new THREE.PointLight(0xffc98a, 1.4, 8), lanB = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a8 }));
      scene.add(lan, lanB);
      const crit = new THREE.Group(); scene.add(crit);
      // sudut kamera: [nama, posisi kamera, titik lihat, tempat makhluk, arah makhluk, arah matahari dari makhluk]
      const VIEWS = forest ? [
        { name: "The path", cam: [1.2, 2.0, 14], look: [0, 9, -38], crit: [0.4, 7.5], cr: 0.3, sun: [-30, 80, 20] },
        { name: "The giant tree", cam: [6, 3.4, -6], look: [0, 7, -40], crit: [-2.4, -30], cr: 2.2, sun: [-30, 80, 10] },
        { name: "Over the canopy", cam: [-34, 62, 44], look: [2, 0, -30], crit: [0.4, 7.5], cr: 2.6, sun: [-60, 70, 20] },
      ] : [
        { name: "The dunes", cam: [3.2, 2.0, 9.5], look: [6, 2.6, -30], crit: [1.6, 4.2], cr: 0.5, sun: [-40, 80, 30] },
        { name: "The buried temple", cam: [12, 6, -20], look: [22, 5, -46], crit: [16, -27], cr: 0.2, sun: [-50, 40, 20] },
        { name: "From the ridge", cam: [-40, 34, 70], look: [5, 2, -30], crit: [1.6, 4.2], cr: 2.6, sun: [-80, 60, 30] },
      ];
      const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 900);
      const look = o.Look ? o.Look.create(THREE) : null;
      let night = false, vi = 0, V = VIEWS[0];
      const lk = new THREE.Vector3(), cp = new THREE.Vector3(), dv = new THREE.Vector3();
      function setNight(on) {
        night = !!on; scene.background = SKY[+night]; const f = FOG[+night]; scene.fog = new THREE.Fog(f[0], f[1], f[2]);
        sun.color.setHex(night ? 0x9fb4e8 : 0xffe6c4); sun.intensity = night ? 0.35 : 1.6; hemi.color.setHex(0xfff4e6); hemi.groundColor.setHex(0x8a6a48); hemi.intensity = 0.5;
        if (look) look.apply(night ? "night" : "day", "clear", hemi, sun);
        if (night) { hemi.color.setHex(forest ? 0x3d5a66 : 0x5d6d9e); hemi.groundColor.setHex(forest ? 0x1a2420 : 0x3a3440); hemi.intensity = forest ? 0.5 : 0.55; }
        if (Z.storm) Z.storm.visible = !night; if (Z.stars) Z.stars.visible = night; if (Z.setNight) Z.setNight(night);
        moon.visible = night && !forest; lan.visible = lanB.visible = night;
      }
      function setView(i) {
        vi = (i + VIEWS.length) % VIEWS.length; V = VIEWS[vi];
        crit.position.set(V.crit[0], Z.height(V.crit[0], V.crit[1]), V.crit[1]); crit.rotation.y = V.cr;
        sun.position.set(V.crit[0] + V.sun[0], V.sun[1], V.crit[1] + V.sun[2]); sun.target.position.set(V.crit[0], 0, V.crit[1] - 15);
        lan.position.set(V.crit[0] + 0.6, crit.position.y + 1.3, V.crit[1]); lanB.position.copy(lan.position);
        return V.name;
      }
      // makhluk jalan pelan bolak-balik di tempatnya; kamera goyang dikit biar hidup
      function frame(t) {
        Z.update(t);
        const k = Math.sin(t / 2600), x = V.crit[0] + k * 1.1, z = V.crit[1] + Math.sin(t / 5200) * 0.4;
        crit.position.set(x, Z.height(x, z) + Math.abs(Math.sin(t / 180)) * 0.05, z); crit.rotation.y = Math.cos(t / 2600) > 0 ? Math.PI / 2 : -Math.PI / 2;
        lan.position.set(x + 0.6, crit.position.y + 1.3, z); lanB.position.copy(lan.position);
        // HP tegak: kamera mundur sedikit dan titik lihat ditarik ke arah makhluk, biar makhluk dan landmark sama-sama masuk
        const tall = camera.aspect < 1 ? 1 : 0;
        lk.set(...V.look).lerp(cp.set(x, crit.position.y + 0.6, z), tall * 0.3);
        dv.set(V.cam[0] - V.look[0], 0, V.cam[2] - V.look[2]).normalize().multiplyScalar(tall * 3);
        camera.position.set(V.cam[0] + dv.x + Math.sin(t / 4100) * 0.5, V.cam[1] + tall * 0.8 + Math.sin(t / 5300) * 0.15, V.cam[2] + dv.z); camera.lookAt(lk);
      }
      function resize(w, h) { camera.aspect = w / h; camera.fov = w < h ? 58 : 40; camera.updateProjectionMatrix(); }
      function dispose() { scene.traverse(m => { if (m.geometry) m.geometry.dispose(); for (const mt of [].concat(m.material || [])) { for (const k of ["map", "emissiveMap"]) if (mt[k]) mt[k].dispose(); mt.dispose(); } }); for (const t of SKY) t.dispose(); }
      setNight(false); setView(0);
      return { kind, scene, camera, crit, views: VIEWS.map(v => v.name), get view() { return vi; }, get night() { return night; }, setNight, setView, frame, resize, dispose, patch: () => { if (look) look.patchScene(scene); }, zone: Z };
    }
    return { pasir, duneH, hutan, forestH, stage };
  }
  const Liar = { create };
  if (typeof module !== "undefined") module.exports = Liar; else globalThis.Liar = Liar;
})();

// v79: wilayah liar (konsep: konsep/05-wilayah-liar). Tempat luas di antara kota: sepi, satu hal yang bikin penasaran.
// Prototipe pertama: Lautan Pasir (Solenne). Bukit pasir berlapis sampai cakrawala, kuil setengah terkubur, lengkung batu,
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
    return { pasir, duneH };
  }
  const Liar = { create };
  if (typeof module !== "undefined") module.exports = Liar; else globalThis.Liar = Liar;
})();

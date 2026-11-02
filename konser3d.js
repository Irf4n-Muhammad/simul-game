// Arena konser (v78): stadion Riverside Arena di sebelah taman. Kamu yang jalanin Kiko dari belakang (orang ketiga) di lapangan,
// di antara ribuan warga, dengan panggung kosong raksasa di tengah dan tribun penuh di sekeliling.
// Gayanya stadion malam yang gelap dan berkabut: satu warna dominan (merah atau putih), penyanyi sendirian di panggung,
// dan rig lampu seluas lapangan yang turun ke atas penonton. Megahnya dari skala, bukan dari banyaknya warna.
// Semua yang terjadi ikut detik show dari konser.js, jadi semua HP lihat momen yang sama di detik yang sama.
// Biar tetap jalan di HP: penonton dekat pakai InstancedMesh, penonton jauh + tribun pakai Points, tanpa bayangan, tanpa fisika.
"use strict";
(function () {
  const PAL = { intro: [0xff1a14, 0x3a0000], song1: [0xff1e18, 0xffffff], rise: [0xffffff, 0xfff0d8], song2: [0xffffff, 0xff2a20], peak: [0xff3a10, 0xffb040], outro: [0xffffff, 0x8a1a14] };
  // warga di bawah lampu konser: warna kalem gelap, biar jadi lautan siluet (Kiko tetap terang)
  const FOLK = [0x5a4f48, 0x4a4c52, 0x6a5040, 0x46525c, 0x5e4a4a, 0x625238, 0x46564a, 0x54485e, 0x38343e, 0x5a4a40];
  const ST = 18, FIELD_R = 80, SPAWN = { x: 0, z: 46 };
  const STAND0 = 92, TIERS = 30, TD = 3.3, TH = 2.6, ROOF_R = STAND0 + TIERS * TD + 2, ROOF_Y = 1.4 + TIERS * TH + 4;
  const RIG = 54, RN = 9;   // rig: kotak 108 x 108 di atas lapangan, 9 x 9 lampu
  const FIELD = { r: FIELD_R, stage: ST };

  function rng(seed) {
    let a = 0; for (const ch of String(seed)) a = (Math.imul(a, 31) + ch.charCodeAt(0)) | 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function create(env) {
    const { THREE, M, SPH, CYL, canvasTex } = env;
    const K = globalThis.Konser;
    const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
    const scene = new THREE.Scene();
    scene.environment = env.environment || null;
    scene.fog = new THREE.FogExp2(0x0a0204, 0.0055);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1400);
    const T = { on: false, scene, camera, input: { x: 0, y: 0 } };
    const neon = (c, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: lin(c), toneMapped: false }, o));
    const glow = (c, op, o = {}) => neon(c, Object.assign({ transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }, o));
    const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
    const fadeTex = canvasTex((c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }, 8, 128);
    const fadeUp = canvasTex((c, w, h) => { const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }, 8, 128);
    const cA = new THREE.Color(), cB = new THREE.Color(), cT = new THREE.Color(), WHITE = new THREE.Color(1, 1, 1);

    // ---------------------------------------------------------------- langit dan lampu dasar
    const skyU = { top: { value: lin(0x020103) }, bot: { value: lin(0x140406) } };
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
      vertexShader: "varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 bot; varying vec3 p; void main(){ float h = clamp(normalize(p).y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(bot, top, h), 1.0); }",
    })));
    {
      const R = rng("bintang"), n = 260, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, y = 0.45 + R() * 0.55, r = Math.sqrt(1 - y * y) * 950; pos.set([Math.cos(a) * r, y * 950, Math.sin(a) * r], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 2.4, fog: false, transparent: true, opacity: 0.4, toneMapped: false })));
    }
    const hemi = new THREE.HemisphereLight(0xffb0a0, 0x0a0406, 0.22); scene.add(hemi);
    const stageL = new THREE.PointLight(0xff3020, 2, 140, 1.8); stageL.position.set(0, 30, 0); scene.add(stageL);
    const fireL = new THREE.PointLight(0xff7a20, 0, 150, 1.2); fireL.position.set(0, 10, 0); scene.add(fireL);
    const kikoL = new THREE.PointLight(0xfff0e8, 0.6, 7, 2); scene.add(kikoL);   // Kiko selalu kebaca di tengah lautan siluet

    // ---------------------------------------------------------------- lapangan dan tribun stadion
    add(new THREE.CircleGeometry(STAND0, 96), M(0x060405, { roughness: 0.6, metalness: 0.1, envMapIntensity: 0.1 }), 0, 0, 0).rotation.x = -Math.PI / 2;
    {
      // tribun: anak tangga yang naik dari pinggir lapangan sampai atap
      const prof = [new THREE.Vector2(STAND0, 0)];
      for (let k = 0; k < TIERS; k++) { const r = STAND0 + 1 + k * TD, y = 1.4 + k * TH; prof.push(new THREE.Vector2(r, y), new THREE.Vector2(r + TD, y)); }
      prof.push(new THREE.Vector2(ROOF_R, ROOF_Y - 4), new THREE.Vector2(ROOF_R + 2, ROOF_Y - 4), new THREE.Vector2(ROOF_R + 2, 0));
      add(new THREE.LatheGeometry(prof, 128), M(0x120e14, { roughness: 0.8, side: THREE.DoubleSide, envMapIntensity: 0.12 }), 0, 0, 0);
      add(new THREE.CylinderGeometry(STAND0 + 0.2, STAND0 + 0.2, 1.4, 128, 1, true), neon(0xff2a2a, { side: THREE.DoubleSide }), 0, 0.7, 0);
    }
    const barrier = scene.children[scene.children.length - 1];
    // atap: kanopi gelap melingkar (tengahnya terbuka ke langit) dengan lampu sorot yang mengarah ke panggung
    { const c = add(new THREE.RingGeometry(ROOF_R - 46, ROOF_R + 2, 128, 1), M(0x09070b, { side: THREE.DoubleSide, roughness: 0.9, envMapIntensity: 0.05 }), 0, ROOF_Y, 0); c.rotation.x = Math.PI / 2; }
    add(new THREE.TorusGeometry(ROOF_R - 46, 0.9, 8, 160), M(0x2a2630, { metalness: 0.6, roughness: 0.4 }), 0, ROOF_Y, 0).rotation.x = Math.PI / 2;
    const beams = [];
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, piv = new THREE.Group(); piv.position.set(Math.cos(a) * (ROOF_R - 47), ROOF_Y - 1.5, Math.sin(a) * (ROOF_R - 47)); scene.add(piv);
      const geo = new THREE.CylinderGeometry(0.6, 13, 230, 18, 1, true); geo.translate(0, -115, 0); geo.rotateX(-Math.PI / 2);
      const m = glow(0xffffff, 0.1, { map: fadeTex, fog: false }); add(geo, m, 0, 0, 0, piv);
      add(new THREE.SphereGeometry(1.4, 10, 8), neon(0xffffff), 0, 0, 0, piv);
      beams.push({ piv, m, a, ph: i * 0.9 });
    }
    // penonton tribun + penonton jauh di lapangan: puluhan ribu titik (gelang dan lampu HP). Warnanya diatur tiap frame.
    const SN = 30000, FN = 14000, NP = SN + FN, sPos = new Float32Array(NP * 3), sCol = new Float32Array(NP * 3), sMeta = [];
    {
      const R = rng("tribun");
      for (let i = 0; i < SN; i++) {
        const k = Math.floor(R() * TIERS), a = R() * Math.PI * 2, r = STAND0 + 1.6 + k * TD + R() * (TD - 0.8), y = 1.4 + k * TH + 0.9 + R() * 0.2;
        sPos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3); sMeta.push({ a, k, r, base: 0.03 + R() * 0.05, ph: R() * 6.28, phone: R() < 0.35 });
      }
      for (let i = SN; i < NP; i++) {
        let x, z, r; do { x = (R() * 2 - 1) * FIELD_R; z = (R() * 2 - 1) * FIELD_R; r = Math.hypot(x, z); } while (r > FIELD_R - 1 || Math.max(Math.abs(x), Math.abs(z)) < ST + 2.5);
        sPos.set([x, 1.05 + R() * 0.25, z], i * 3); sMeta.push({ a: Math.atan2(z, x), k: -1, r, base: 0.004 + R() * 0.01, ph: R() * 6.28, phone: R() < 0.15 });
      }
    }
    // tribun: titik seukuran orang (mengecil kalau jauh). lapangan: titik kecil seukuran piksel, biar yang dekat kamera tetap jadi gelang, bukan kotak besar
    const sG = new THREE.BufferGeometry(); sG.setAttribute("position", new THREE.BufferAttribute(sPos, 3)); sG.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
    sG.setDrawRange(0, SN);
    const stands = new THREE.Points(sG, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, toneMapped: false, fog: false })); stands.frustumCulled = false; scene.add(stands);
    const fG = new THREE.BufferGeometry(); fG.setAttribute("position", sG.attributes.position); fG.setAttribute("color", sG.attributes.color); fG.setDrawRange(SN, FN);
    const floorDots = new THREE.Points(fG, new THREE.PointsMaterial({ size: 1.7 * Math.min(2, globalThis.devicePixelRatio || 1), sizeAttenuation: false, vertexColors: true, toneMapped: false, fog: false })); floorDots.frustumCulled = false; scene.add(floorDots);
    // kota di luar stadion: cuma gedung tinggi yang kelihatan di atas tribun
    {
      const win = canvasTex((c, w, h) => { c.fillStyle = "#0e0c18"; c.fillRect(0, 0, w, h); const r = rng("jendela"); for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 14) { c.fillStyle = r() < 0.3 ? `rgba(255,${190 + Math.floor(r() * 50)},140,${0.4 + r() * 0.5})` : "#16131f"; c.fillRect(x, y, 8, 9); } }, 128, 256);
      const R2 = rng("gedung:konser"), n = 50, bld = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ map: win, color: 0x6a6276, fog: false }), n);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (R2() - 0.5) * 0.08, r = 340 + R2() * 110, h = 70 + R2() * (i % 3 === 0 ? 130 : 60), w = 24 + R2() * 26;
        m4.compose(new THREE.Vector3(Math.cos(a) * r, h / 2, Math.sin(a) * r), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a), new THREE.Vector3(w, h, w)); bld.setMatrixAt(i, m4);
      }
      scene.add(bld);
    }

    // ---------------------------------------------------------------- panggung kosong raksasa di tengah
    const stage = new THREE.Group(); scene.add(stage);
    add(new THREE.BoxGeometry(ST * 2, 2.6, ST * 2), M(0x0c0a0d, { roughness: 0.5 }), 0, 1.3, 0, stage);
    const edge = [];
    for (const [w, d, x, z] of [[ST * 2, 0.2, 0, ST], [ST * 2, 0.2, 0, -ST], [0.2, ST * 2, ST, 0], [0.2, ST * 2, -ST, 0]]) edge.push(add(new THREE.BoxGeometry(w + 0.1, 0.22, d + 0.1), neon(0xffffff), x, 2.62, z, stage));
    // lantai panggung yang bisa menyala: putih terang di momen besar, jadi penyanyi kelihatan sebagai siluet
    const deck = add(new THREE.PlaneGeometry(ST * 2 - 0.4, ST * 2 - 0.4), neon(0x220606), 0, 2.61, 0, stage); deck.rotation.x = -Math.PI / 2;
    const pool = add(new THREE.CircleGeometry(1, 48), glow(0xffffff, 0.5, { fog: false }), 0, 2.63, 0, stage); pool.rotation.x = -Math.PI / 2;
    // rig: grid lampu seluas lapangan yang turun ke atas penonton waktu "langit turun"
    const rig = new THREE.Group(); scene.add(rig);
    const truss = M(0x1c1a20, { metalness: 0.7, roughness: 0.4 }), rigMat = [neon(0xffffff), neon(0xffffff)];
    const span = RIG * 2, gap = span / (RN - 1);
    for (let i = 0; i < RN; i++) {
      const o = -RIG + i * gap, outer = i === 0 || i === RN - 1, w = outer ? 0.35 : 0.5;
      add(new THREE.BoxGeometry(span + 1, w, w), outer ? rigMat[0] : truss, 0, outer ? 0.6 : 0, o, rig);
      add(new THREE.BoxGeometry(w, w, span + 1), outer ? rigMat[1] : truss, o, outer ? 0.6 : 0, 0, rig);
    }
    const NH = RN * RN, rigPos = [];
    const heads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.8, 0.8, 0.4, 16), neon(0xffffff), NH);
    const rigBeams = new THREE.InstancedMesh((() => { const g = new THREE.CylinderGeometry(0.5, 6.5, 1, 16, 1, true); g.translate(0, -0.5, 0); return g; })(), glow(0xffffff, 0.075, { map: fadeTex, fog: false }), NH);
    { const m4 = new THREE.Matrix4(); let k = 0; for (let i = 0; i < RN; i++) for (let j = 0; j < RN; j++) { const x = -RIG + i * gap, z = -RIG + j * gap; rigPos.push({ x, z, i, j, d: Math.hypot(x, z) }); m4.makeTranslation(x, -0.5, z); heads.setMatrixAt(k, m4); heads.setColorAt(k, WHITE); rigBeams.setColorAt(k++, WHITE); } }
    rig.add(heads); rig.add(rigBeams); rigBeams.frustumCulled = false;
    const spot = add((() => { const g = new THREE.CylinderGeometry(0.5, 4.2, 1, 24, 1, true); g.translate(0, -0.5, 0); return g; })(), glow(0xffffff, 0.3, { map: fadeTex, fog: false }), 0, 0, 0);
    // meriam api di pinggir panggung
    const flames = [];
    for (let i = 0; i < 20; i++) {
      const side = i % 4, t = Math.floor(i / 4) - 2, x = side < 2 ? t * 7.6 : (side === 2 ? 1 : -1) * (ST + 0.6), z = side < 2 ? (side === 0 ? 1 : -1) * (ST + 0.6) : t * 7.6;
      add(new THREE.BoxGeometry(1.6, 1, 1.6), M(0x222026, { metalness: 0.6 }), x, 3.1, z, stage);
      const geo = new THREE.CylinderGeometry(0.2, 1.7, 16, 14, 1, true); geo.translate(0, 8, 0);
      const outer = add(geo, glow(0xff5a10, 0.7, { map: fadeUp }), x, 3.6, z, stage), inner = add(geo, glow(0xffd070, 0.8, { map: fadeUp }), x, 3.6, z, stage);
      inner.scale.set(0.45, 0.8, 0.45); outer.visible = inner.visible = false; flames.push({ outer, inner, ph: i * 0.37 });
    }
    // laser dari pojok panggung ke tribun
    const lasers = [];
    for (let i = 0; i < 16; i++) {
      const geo = new THREE.BoxGeometry(0.14, 0.14, 300); geo.translate(0, 0, 150);
      const cx = i % 4 < 2 ? -ST : ST, cz = i % 2 ? -ST : ST, piv = new THREE.Group(); piv.position.set(cx, 3.2, cz); scene.add(piv);
      const m = glow(i % 3 ? 0xff2a2a : 0xffffff, 0.9, { fog: false }); add(geo, m, 0, 0, 0, piv); piv.visible = false; lasers.push({ piv, m, ph: i * 0.55, a0: Math.atan2(cx, cz) });
    }
    // cincin cahaya yang melebar dari panggung sampai tribun
    const rings = [];
    for (let i = 0; i < 6; i++) { const r = add(new THREE.TorusGeometry(1, 0.003, 6, 160), glow(0xffffff, 0.8, { fog: false }), 0, 6, 0); r.rotation.x = Math.PI / 2; r.visible = false; rings.push(r); }
    // kabut tebal: lapisan-lapisan yang muter pelan dan ikut warna lampu
    const hazeTex = canvasTex((c, w, h) => { const r = rng("kabut"); for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, rad = 20 + r() * 70, g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, "rgba(255,255,255,.22)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); } }, 256, 256);
    const haze = [0, 1, 2, 3].map(i => { const m = add(new THREE.PlaneGeometry(240, 240), glow(0xff3030, 0.16, { map: hazeTex }), 0, 1.2 + i * 2.2, 0); m.rotation.x = -Math.PI / 2; return m; });
    // kembang api dan confetti
    const FW = 16, FWN = 110, fwPos = new Float32Array(FW * FWN * 3), fwCol = new Float32Array(FW * FWN * 3), fwVel = new Float32Array(FW * FWN * 3), fwB = [];
    const fwG = new THREE.BufferGeometry(); fwG.setAttribute("position", new THREE.BufferAttribute(fwPos, 3)); fwG.setAttribute("color", new THREE.BufferAttribute(fwCol, 3));
    const fw = new THREE.Points(fwG, new THREE.PointsMaterial({ size: 3.2, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    fw.frustumCulled = false; scene.add(fw);
    for (let b = 0; b < FW; b++) fwB.push({ t0: -99, c: new THREE.Color() });
    const CN = 1600, cPos = new Float32Array(CN * 3), cCol = new Float32Array(CN * 3), cVel = [];
    { const R = rng("confetti"), C = [0xff2a2a, 0xffffff, 0xffffff, 0xff6a5a]; for (let i = 0; i < CN; i++) { const c = lin(C[i % 4]); cCol.set([c.r, c.g, c.b], i * 3); cVel.push([(R() - 0.5) * 140, (R() - 0.5) * 140, 1.2 + R() * 1.4, R() * 8]); } }
    const cG = new THREE.BufferGeometry(); cG.setAttribute("position", new THREE.BufferAttribute(cPos, 3)); cG.setAttribute("color", new THREE.BufferAttribute(cCol, 3));
    const conf = new THREE.Points(cG, new THREE.PointsMaterial({ size: 0.3, vertexColors: true, toneMapped: false })); conf.frustumCulled = false; conf.visible = false; scene.add(conf);
    const flash = add(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }), 0, 0, -0.2, camera);
    flash.renderOrder = 99; scene.add(camera);

    // ---------------------------------------------------------------- penonton lapangan (ribuan warga) + penyanyi
    const folk = [];
    {
      // padat di depan panggung dan di sekitar tempat Kiko masuk, makin jauh makin jarang (sisanya diisi titik gelang)
      const R = rng("penonton"), NMAX = 3200, near = [], far = [];
      for (let x = -FIELD_R; x <= FIELD_R; x += 1.15) for (let z = -FIELD_R; z <= FIELD_R; z += 1.15) {
        const px = x + (R() - 0.5) * 0.6, pz = z + (R() - 0.5) * 0.6, r = Math.hypot(px, pz), ds = Math.hypot(px - SPAWN.x, pz - SPAWN.z);
        if (r > FIELD_R - 1 || Math.max(Math.abs(px), Math.abs(pz)) < ST + 2.4) continue;
        if (ds < 2.8) continue;
        if (R() > 0.95 - r / FIELD_R * 0.45) continue;
        const f = { x: px, z: pz, dir: Math.atan2(-px, -pz), ph: R() * 6.28, hop: 0.6 + R() * 0.8, c: FOLK[Math.floor(R() * FOLK.length)], s: 1.2 + R() * 0.3, stick: R() < 0.4, copy: 0 };
        (ds < 16 || Math.max(Math.abs(px), Math.abs(pz)) < ST + 9 ? near : far).push(f);
      }
      folk.push(...near.slice(0, NMAX));
      const keep = Math.max(0, NMAX - folk.length) / Math.max(1, far.length); let acc = 0;
      for (const f of far) { acc += keep; if (acc >= 1) { acc -= 1; folk.push(f); } }
    }
    folk.push({ x: 0, z: 0, base: 2.6, dir: 0, ph: 0, hop: 1, c: 0x141214, s: 3.4, stick: false, band: "voice", copy: 0 });
    const NF = folk.length;
    const bodyI = new THREE.InstancedMesh(SPH(0.32, 14, 10), M(0xffffff, { roughness: 0.95, envMapIntensity: 0.15 }), NF);
    const earI = new THREE.InstancedMesh(SPH(0.1, 6, 5), M(0xffffff, { roughness: 0.95, envMapIntensity: 0.15 }), NF * 2);
    const stickI = new THREE.InstancedMesh(CYL(0.025, 0.025, 0.5, 5), neon(0xffffff), NF);
    folk.forEach((f, i) => { const c = lin(f.c); bodyI.setColorAt(i, c); earI.setColorAt(i * 2, c); earI.setColorAt(i * 2 + 1, c); stickI.setColorAt(i, WHITE); });
    for (const im of [bodyI, earI, stickI]) { im.frustumCulled = false; scene.add(im); }
    const OFF = {
      body: new THREE.Matrix4().compose(new THREE.Vector3(0, 0.36, 0), new THREE.Quaternion(), new THREE.Vector3(1, 0.95, 0.88)),
      ear: [-1, 1].map(sx => new THREE.Matrix4().makeTranslation(sx * 0.2, 0.62, 0)),
      stick: new THREE.Matrix4().makeTranslation(0.32, 0.95, 0.12),
    };
    const mic = add(CYL(0.03, 0.03, 2.4, 6), M(0xd8d8e0, { metalness: 0.8, roughness: 0.25 }), 0, 3.8, 1.6, stage);

    // ---------------------------------------------------------------- Kiko (model asli dari rumah)
    const kiko = new THREE.Group(); scene.add(kiko);
    const KS = 0.36;
    let KP = null, stickK = null, kikoH = 1.1;
    const me = { x: SPAWN.x, z: SPAWN.z, y: 0, vy: 0, dir: Math.PI, walk: 0, emote: null, stick: false };
    function buildKiko() {
      kiko.clear(); KP = env.makeKiko ? env.makeKiko(kiko) : null;
      if (!KP) { const b = add(SPH(0.4, 20, 14), M(0xe5bfbf), 0, 0.42, 0, kiko); KP = { root: b, body: b, arms: [], ears: [], scale: 1, fake: true }; }
      else { KP.root.scale.setScalar(KP.scale * KS); KP.arms.forEach(a => { a.userData.p0 = a.position.clone(); }); }
      kikoH = KP.fake ? 0.9 : 3.1 * KP.scale * KS;
      if (!KP.fake) { stickK = add(CYL(0.09, 0.09, 1.5, 8), neon(0xffffff), 1.3, 1.6, 0.6, KP.body); stickK.visible = false; }
    }

    // ---------------------------------------------------------------- kamera orang ketiga
    let yaw = 0, pitch = 0.22, dist = 7, drag = null, pinch = null;
    const ptr = new Map(), look = new THREE.Vector3(), base3 = new THREE.Vector3(), camPos = new THREE.Vector3(), tmp = new THREE.Vector3();
    const STAGE_LOOK = new THREE.Vector3(0, 24, 0), SKY_LOOK = new THREE.Vector3(0, 95, -140);
    T.down = e => { ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist }; drag = null; } else drag = { x: e.clientX, y: e.clientY, yaw, pitch }; };
    T.move = e => {
      if (!ptr.has(e.pointerId)) return; ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptr.size >= 2) { const [a, b] = [...ptr.values()]; dist = Math.max(3.5, Math.min(30, pinch.dist * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)))); return; }
      if (!drag) return;
      yaw = drag.yaw - (e.clientX - drag.x) * 0.006; pitch = Math.max(0.02, Math.min(1.1, drag.pitch + (e.clientY - drag.y) * 0.004));
    };
    T.up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; if (!ptr.size) drag = null; };
    T.cancel = T.up;
    T.wheel = e => { dist = Math.max(3.5, Math.min(30, dist + e.deltaY * 0.008)); };
    const keys = new Set();
    T.key = (code, down) => { if (down) keys.add(code); else keys.delete(code); };
    T.jump = () => { if (me.y <= 0.001) me.vy = 6.2; };
    T.emote = i => {
      if (i === 4) { me.stick = !me.stick; if (stickK) stickK.visible = me.stick; return; }
      me.emote = { kind: ["", "wave", "clap", "dance"][i], t0: performance.now(), dur: i === 3 ? 1600 : 1400 };
      for (const f of folk) if (!f.band && Math.hypot(f.x - me.x, f.z - me.z) < 6) f.copy = performance.now() + 300 + Math.random() * 600;
    };

    // ---------------------------------------------------------------- jam show
    let start = 0, live = false, ended = false, saidSet = new Set(), camReady = false;
    T.sec = () => (Date.now() - start) / 1000;
    T.enter = o => {
      start = o.start; live = !!o.live; ended = false; saidSet = new Set(); T.title = o.name || K.BAND;
      buildKiko(); me.x = SPAWN.x; me.z = SPAWN.z; me.y = 0; me.vy = 0; me.dir = Math.PI; me.stick = false;
      yaw = 0; pitch = 0.34; dist = T.portrait ? 10 : 9; keys.clear(); T.input.x = T.input.y = 0;
      for (const s of K.MOMENTS) if (s.t < T.sec() - 1) saidSet.add(s.id);   // telat masuk: momen yang udah lewat nggak diumumin
      T.on = true; camReady = false;
    };
    T.exit = () => { T.on = false; keys.clear(); };
    T.live = () => live;
    T.resize = (w, h) => { camera.aspect = w / h; T.portrait = w < h; camera.fov = T.portrait ? 72 : 60; camera.updateProjectionMatrix(); };
    // keramaian buat suara.js: ramai pas lagu, sepi di penutup
    T.crowd = () => { const A = K.at(T.sec()); return A.phase === "before" ? 0.45 : A.phase === "after" ? 0.3 : 0.35 + A.energy * 0.6; };

    // ---------------------------------------------------------------- tiap frame
    const m4 = new THREE.Matrix4(), mm = new THREE.Matrix4(), rot = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
    const blocked = (x, z) => Math.hypot(x, z) > FIELD_R || (Math.abs(x) < ST + 0.6 && Math.abs(z) < ST + 0.6);
    T.frame = (t, dt) => {
      const s = T.sec(), A = K.at(s), act = A.act || (A.phase === "before" ? "intro" : "outro"), pal = PAL[act];
      const mom = id => { const m = A.moments.find(x => x.id === id); return m ? m.k : -1; };
      const beatP = A.phase === "show" ? Math.pow(1 - A.beatK, 2.2) : 0;
      const lightsOn = A.phase === "show" && s >= 8, reduce = !!env.reduce;
      for (const m of A.moments) if (!saidSet.has(m.id)) { saidSet.add(m.id); const def = K.MOMENTS.find(x => x.id === m.id); if (def.say && env.say) env.say(def.say); }
      if (A.phase === "after" && s > K.LEN + 3 && !ended) { ended = true; if (env.onEnd) env.onEnd(); }
      cA.copy(lin(pal[0])); cB.copy(lin(pal[1]));

      // langit dan kabut ikut babak (tetap gelap: warnanya cuma rembesan dari lampu)
      const skyK = act === "peak" ? 1 : act === "rise" ? 0.6 : lightsOn ? 0.35 : 0;
      skyU.bot.value.copy(lin(0x140406)).lerp(cA, skyK * 0.18 + beatP * 0.03);
      scene.fog.color.copy(skyU.bot.value).multiplyScalar(0.7);
      haze.forEach((h, i) => { h.rotation.z = t / (9000 + i * 3000) * (i % 2 ? -1 : 1); h.material.color.copy(cA).multiplyScalar(lightsOn ? 0.06 + 0.04 * beatP : 0.03); });
      barrier.material.color.copy(cA).multiplyScalar(lightsOn ? 0.5 + 0.5 * beatP : 0.12);
      edge.forEach(e => e.material.color.copy(cA).multiplyScalar(lightsOn ? 0.6 + beatP : 0.1));
      // lantai panggung: gelap biasanya, putih menyala di momen besar biar penyanyi jadi siluet
      const deckK = !lightsOn ? 0.015 : act === "rise" || act === "outro" ? 0.55 : mom("drop") >= 0 ? 0.8 : act === "peak" ? 0.12 + 0.3 * beatP : 0.04 + 0.08 * beatP;
      deck.material.color.copy(act === "rise" || act === "outro" ? WHITE : cA).multiplyScalar(deckK);

      // rig: melayang tinggi, turun ke atas penonton waktu "langit turun", naik lagi di lagu 2
      const down = s < 120 ? 0 : s < 130 ? (s - 120) / 10 : s < 176 ? 1 : s < 186 ? 1 - (s - 176) / 10 : 0;
      const ease = down * down * (3 - 2 * down);
      rig.position.y = 58 - ease * 40 + (act === "song2" ? Math.sin(s * 0.4) * 3 : 0);
      rig.rotation.y = act === "rise" ? (s - 120) * 0.012 : act === "song2" ? 0.73 + (s - 186) * 0.004 : 0;
      const rigOn = lightsOn || A.phase === "before";
      rigMat.forEach((m, i) => m.color.copy(i ? cA : cB).multiplyScalar(rigOn ? (act === "rise" ? 1.2 : 0.3 + 0.5 * beatP) : 0.02));
      sc.set(1, rig.position.y - 0.8, 1);
      for (let k = 0; k < NH; k++) {
        const P = rigPos[k]; let v;
        if (!lightsOn) v = A.phase === "before" ? 0.03 : (s > 2 && P.d < 1 ? 0.6 : 0);
        else if (act === "intro") v = Math.max(0, Math.sin(s * 1.2 - P.d * 0.06)) * 0.5;
        else if (act === "song1") v = (P.i + P.j + A.beat) % 4 === 0 ? 0.3 + beatP : 0.1;
        else if (act === "rise") v = 0.55 + 0.45 * Math.max(0, Math.sin(s * 1.6 - P.d * 0.08));
        else if (act === "song2") v = 0.25 + 0.6 * Math.max(0, Math.sin(s * 0.9 + P.i * 0.5 - P.j * 0.3));
        else if (act === "peak") v = (P.i + A.beat) % 2 === 0 ? 0.25 + 0.9 * beatP : 0.12;
        else v = P.d < 30 ? 0.5 : 0.08;
        heads.setColorAt(k, cT.copy((P.i + P.j) % 2 ? cA : cB).multiplyScalar(0.25 + v * 1.4));
        rigBeams.setColorAt(k, cT.copy((P.i + P.j) % 2 ? cA : cB).multiplyScalar(v));
        m4.compose(v3.set(P.x, -0.8, P.z), q.identity(), sc); rigBeams.setMatrixAt(k, m4);
      }
      heads.instanceColor.needsUpdate = rigBeams.instanceColor.needsUpdate = rigBeams.instanceMatrix.needsUpdate = true;
      // satu lampu putih ke penyanyi: paling terasa waktu gelap total di awal
      spot.visible = A.phase === "show" && (s < 30 || act === "outro" || act === "rise");
      spot.position.set(0, rig.position.y - 0.8, 0); spot.scale.set(1, rig.position.y - 3.4, 1); spot.rotation.y = 0;
      pool.visible = spot.visible; pool.scale.setScalar(4.4);

      // lampu sorot dari atap: semua ngarah ke panggung, lalu nyapu ke penonton
      beams.forEach((B, i) => {
        B.piv.visible = lightsOn; if (!lightsOn) return;
        const sp = reduce ? 0.25 : 1, a = s * 0.35 * sp + B.ph, sweep = act === "song1" || act === "peak" ? 1 : act === "song2" ? 0.6 : 0.2;
        const tr = 6 + sweep * (40 + Math.sin(a) * 32), ang = B.a + Math.sin(a * 0.7) * 0.5;
        tmp.set(Math.cos(ang) * tr, act === "rise" ? 70 : 0, Math.sin(ang) * tr);
        B.piv.lookAt(tmp); B.m.color.copy(i % 2 ? cA : cB); B.m.opacity = 0.025 + 0.05 * A.energy + 0.025 * beatP;
      });
      // laser
      const lz = mom("lasers") >= 0 || act === "peak" || (s >= 90 && s < 120);
      lasers.forEach((L, i) => { L.piv.visible = lz && !reduce; if (L.piv.visible) L.piv.rotation.set(-0.05 - Math.abs(Math.sin(s * 1.1 + L.ph)) * 0.3, L.a0 + Math.sin(s * 0.8 + L.ph) * 0.9, 0); L.m.color.copy(i % 3 ? cA : WHITE); });
      // api: dentuman pertama, tiap 2 ketukan di finale, tiap bar di reff lagu 1, dan akhir lagu 2
      let fire = 0;
      const dk = mom("drop");
      if (dk >= 0) fire = Math.max(0, 1 - dk);
      else if (act === "peak" && A.beat % 2 === 0) fire = beatP;
      else if (s >= 90 && s < 120 && A.beat % 4 === 0) fire = beatP;
      else if (s >= 262 && s < 270) fire = beatP;
      flames.forEach((f, i) => {
        const on = fire > 0.05 && (dk >= 0 || act !== "song1" || i % 2 === 0);
        f.outer.visible = f.inner.visible = on;
        if (on) { const fl = (0.85 + 0.15 * Math.sin(t / 30 + f.ph * 10)) * fire * (dk >= 0 ? 1.5 : 1); f.outer.scale.set(1, fl, 1); f.inner.scale.set(0.45, fl * 0.8, 0.45); }
      });
      fireL.intensity = fire * 4;
      stageL.color.copy(cA); stageL.intensity = (lightsOn ? 0.9 + 0.8 * beatP * A.energy : 0.25) * (pal[0] === 0xffffff ? 0.45 : 1);
      hemi.intensity = 0.16 + fire * 0.35;
      // cincin
      const rk = mom("rings");
      rings.forEach((r, i) => { const k = rk < 0 ? -1 : ((rk * 5 - i * 0.3) % 1 + 1) % 1; r.visible = rk >= 0 && rk * 5 > i * 0.3; if (r.visible) { r.scale.setScalar(ST + k * 175); r.position.y = 6 + k * 60; r.material.opacity = 0.9 * (1 - k); r.material.color.copy(i % 2 ? cA : WHITE); } });
      // tribun + lapangan jauh: gelap waktu intro (cuma lampu HP), gelang menyala bergelombang mulai momen "sky" dan di lagu 2/finale
      const band = act === "song2" || act === "peak" || mom("sky") >= 0 || mom("lights") >= 0, phones = A.phase !== "show" || s < 8 || act === "outro" || act === "rise";
      for (let i = 0; i < NP; i++) {
        const m = sMeta[i]; let r, g, b;
        if (band && lightsOn) { const wv = 0.5 + 0.5 * Math.sin(m.k < 0 ? m.r * 0.12 - s * 3 : m.a * 3 - s * 2.4 + m.k * 0.2), c = wv > 0.5 ? cA : cB, v = 0.2 + 0.8 * wv * (0.7 + 0.3 * beatP); r = c.r * v; g = c.g * v; b = c.b * v; }
        else if (phones && m.phone) { const v = 0.5 + 0.35 * Math.sin(t / 700 + m.ph); r = v; g = v * 0.95; b = v * 0.85; }
        else { const v = m.base + (lightsOn ? 0.03 * beatP : 0); r = v * 1.4; g = v; b = v; }
        sCol[i * 3] = r; sCol[i * 3 + 1] = g; sCol[i * 3 + 2] = b;
      }
      sG.attributes.color.needsUpdate = true;
      // kembang api di atas atap stadion
      const fk = mom("fireworks");
      if (fk >= 0) {
        const slot = Math.floor(s / 0.3), bi = slot % FW, b = fwB[bi];
        if (b.slot !== slot) {
          const r = rng("fw:" + slot), a = slot % 2 ? r() * Math.PI * 2 : Math.atan2(-me.z, -me.x) + (r() - 0.5) * 1.6, rr = 110 + r() * 90, cx = Math.cos(a) * rr, cy = 110 + r() * 60, cz = Math.sin(a) * rr;
          b.slot = slot; b.t0 = s; b.c.copy(lin([0xff2a2a, 0xffffff, 0xffc04a, 0xffffff, 0xff5a3a][slot % 5]));
          for (let k = 0; k < FWN; k++) { const j = (bi * FWN + k) * 3, u = r() * 2 - 1, aa = r() * Math.PI * 2, sp = 22 + r() * 10, sq = Math.sqrt(1 - u * u); fwPos.set([cx, cy, cz], j); fwVel.set([sq * Math.cos(aa) * sp, u * sp, sq * Math.sin(aa) * sp], j); }
        }
      }
      fwB.forEach((b, bi) => {
        const age = s - b.t0, alive = age >= 0 && age < 2.8, f = alive ? Math.pow(1 - age / 2.8, 1.5) : 0;
        for (let k = 0; k < FWN; k++) {
          const j = (bi * FWN + k) * 3;
          if (alive) { fwVel[j + 1] -= 10 * dt; for (let a = 0; a < 3; a++) { fwVel[j + a] *= 1 - 0.8 * dt; fwPos[j + a] += fwVel[j + a] * dt; } }
          fwCol[j] = b.c.r * f; fwCol[j + 1] = b.c.g * f; fwCol[j + 2] = b.c.b * f;
        }
      });
      fwG.attributes.position.needsUpdate = fwG.attributes.color.needsUpdate = true;
      // confetti di atas lapangan
      const ck = Math.max(mom("confetti"), mom("confetti2"));
      conf.visible = ck >= 0;
      if (conf.visible) {
        const t0 = ck * 8;
        for (let i = 0; i < CN; i++) { const [ox, oz, vy, d] = cVel[i], age = (t0 + d * 0.2) % 8; cPos[i * 3] = ox + Math.sin(age * 2 + i) * 0.8; cPos[i * 3 + 1] = Math.max(0.02, 44 - age * vy * 4.5); cPos[i * 3 + 2] = oz + Math.cos(age * 1.7 + i) * 0.8; }
        cG.attributes.position.needsUpdate = true;
      }
      flash.material.opacity = dk >= 0 && !reduce ? Math.max(0, 0.75 * (1 - dk * 3)) : 0;

      // ---------------------------------------------------------------- Kiko jalan
      let ix = T.input.x, iy = T.input.y;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1; if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
      if (keys.has("KeyW") || keys.has("ArrowUp")) iy += 1; if (keys.has("KeyS") || keys.has("ArrowDown")) iy -= 1;
      const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const mx = (fx * iy + rx * ix) * 6 * dt, mz = (fz * iy + rz * ix) * 6 * dt;
      if (il > 0.08) {
        let nx = me.x + mx, nz = me.z + mz;
        if (blocked(nx, me.z)) nx = me.x; if (blocked(nx, nz)) nz = me.z;
        for (const f of folk) { if (f.band) continue; const dx = nx - f.x, dz = nz - f.z; if (Math.abs(dx) > 0.7 || Math.abs(dz) > 0.7) continue; const d = Math.hypot(dx, dz); if (d < 0.62 && d > 0.001) { nx = f.x + dx / d * 0.62; nz = f.z + dz / d * 0.62; } }
        if (!blocked(nx, nz)) { me.x = nx; me.z = nz; }
        const want = Math.atan2(mx, mz); let d = want - me.dir; d = Math.atan2(Math.sin(d), Math.cos(d)); me.dir += d * Math.min(1, dt * 12);
        me.walk += dt * 11;
      }
      me.vy -= (A.gravity || 1) * 16 * dt; me.y = Math.max(0, me.y + me.vy * dt); if (me.y === 0) me.vy = Math.max(0, me.vy);
      kiko.position.set(me.x, me.y, me.z); kiko.rotation.y = me.dir; kikoL.position.set(me.x, me.y + kikoH + 1.6, me.z);
      if (KP && !KP.fake) {
        const now = performance.now(), em = me.emote && now - me.emote.t0 < me.emote.dur ? me.emote : null, ek = em ? (now - em.t0) / em.dur : 0;
        if (!em) me.emote = null;
        const moving = il > 0.08 && me.y === 0, dance = !moving && A.phase === "show";
        KP.root.position.y = moving ? Math.abs(Math.sin(me.walk)) * 0.25 : dance ? beatP * 0.35 * Math.max(0.3, A.energy) : 0;
        KP.body.rotation.z = moving ? Math.sin(me.walk) * 0.06 : dance ? Math.sin(A.beat * Math.PI) * 0.08 : 0;
        KP.body.rotation.y = em && em.kind === "dance" ? ek * Math.PI * 4 : 0;
        if (em && em.kind === "dance") KP.root.position.y = Math.abs(Math.sin(ek * Math.PI * 4)) * 0.6;
        KP.arms.forEach((a, i) => {
          const sx = a.userData.sx; let rzA = sx * 0.4, px = a.userData.p0.x, py = a.userData.p0.y;
          if (dance || me.stick) rzA = sx * (0.6 + beatP * 0.8);
          if (me.stick && i === 1) rzA = sx * 2.2 + Math.sin(s * Math.PI) * 0.4;
          if (em && em.kind === "wave" && i === 1) rzA = sx * 2.4 + Math.sin(ek * 30) * 0.5;
          if (em && em.kind === "clap") { const c = Math.abs(Math.sin(ek * Math.PI * 7)); px = sx * (1.08 - 0.75 * c); py = 1.35; rzA = sx * 1.2; }
          a.rotation.z += (rzA - a.rotation.z) * 0.35; a.position.x += (px - a.position.x) * 0.4; a.position.y += (py - a.position.y) * 0.4;
        });
        if (stickK) { stickK.material.color.copy(cA).multiplyScalar(1.4); stickK.rotation.z = -0.5 + Math.sin(s * Math.PI) * 0.4; }
        if (KP.tail) KP.tail.rotation.z = Math.sin(t / 120) * (dance ? 0.25 : 0.08);
      }

      // ---------------------------------------------------------------- penonton lapangan dan penyanyi
      const fl = s >= 180 && s < 270 && A.phase === "show";
      const hopBig = dk >= 0 || mom("fireworks") >= 0 || mom("lights") >= 0;
      const nowMs = performance.now(), sticks = (act === "song2" || act === "outro" || act === "peak") && A.phase === "show";
      folk.forEach((f, i) => {
        let y = f.base || 0, tilt = 0, dir = f.dir;
        if (A.phase === "show" && s >= 8) {
          y += beatP * 0.22 * f.hop * Math.max(0.35, A.energy);
          if (hopBig && !f.band) y += Math.max(0, Math.sin((s * 2 + f.ph) * Math.PI)) * 0.5;
          if (fl && !f.band) y += 0.9 + 0.5 * Math.sin(s * 0.9 + f.ph);
          tilt = Math.sin(A.beat * Math.PI + f.ph) * 0.12;
        } else if (!f.band) { y += Math.max(0, Math.sin(t / 400 + f.ph)) * 0.04; tilt = Math.sin(t / 900 + f.ph) * 0.05; }
        if (f.copy && nowMs > f.copy - 300) { const k = (nowMs - f.copy + 300) / 900; if (k > 1) f.copy = 0; else y += Math.sin(Math.min(1, k) * Math.PI) * 0.6; }
        if (f.band) dir = s * 0.35;
        e3.set(0, dir, tilt); q.setFromEuler(e3); m4.compose(v3.set(f.x, y, f.z), q, sc.set(f.s, f.s, f.s));
        bodyI.setMatrixAt(i, mm.multiplyMatrices(m4, OFF.body));
        for (const k of [0, 1]) earI.setMatrixAt(i * 2 + k, mm.multiplyMatrices(m4, OFF.ear[k]));
        if (sticks && f.stick) { mm.multiplyMatrices(m4, OFF.stick); e3.set(0, 0, -0.4 + Math.sin(s * Math.PI + f.ph) * 0.4); mm.multiply(rot.makeRotationFromEuler(e3)); stickI.setColorAt(i, cT.copy(i % 2 ? cA : cB).multiplyScalar(1.3)); }
        else mm.makeScale(0, 0, 0);
        stickI.setMatrixAt(i, mm);
      });
      for (const im of [bodyI, earI, stickI]) im.instanceMatrix.needsUpdate = true;
      stickI.instanceColor.needsUpdate = true;
      mic.position.set(Math.sin(s * 0.35) * 1.6, 3.8, Math.cos(s * 0.35) * 1.6);

      // ---------------------------------------------------------------- kamera: di belakang Kiko, sesekali ditarik ke panggung
      const camM = A.moments.find(m => m.cam && m.k < 0.6);
      const pull = camM && !reduce ? Math.sin(camM.k / 0.6 * Math.PI) : 0;
      look.set(me.x - Math.sin(yaw) * 10, me.y * 0.6 + kikoH + 3.2, me.z - Math.cos(yaw) * 10);
      tmp.copy(look).lerp(camM && camM.id === "fireworks" ? SKY_LOOK : STAGE_LOOK, pull * 0.5);
      const d = dist + pull * 10;
      base3.set(me.x, me.y * 0.6 + kikoH, me.z);
      camPos.set(me.x + Math.sin(yaw) * Math.cos(pitch) * d, base3.y + Math.sin(pitch) * d + pull * 5, me.z + Math.cos(yaw) * Math.cos(pitch) * d);
      camera.position.lerp(camPos, camReady ? Math.min(1, dt * 8) : 1); camReady = true;
      camera.lookAt(tmp);
    };
    T.state = () => { const s = T.sec(), A = K.at(s); return { s, A, live, title: T.title }; };
    return T;
  }

  globalThis.Konser3D = { create, FIELD };
})();

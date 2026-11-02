// Arena konser (v78): stadion Riverside Arena di sebelah taman. Kamu yang jalanin Kiko dari belakang (orang ketiga) di lapangan,
// di antara ratusan warga, dengan panggung raksasa di tengah dan tribun penuh di sekeliling.
// Semua yang terjadi ikut detik show dari konser.js, jadi semua HP lihat momen yang sama di detik yang sama.
// Biar tetap jalan di HP: penonton lapangan pakai InstancedMesh, penonton tribun pakai Points, tanpa bayangan, tanpa fisika
// (panggung itu kotak, warga itu lingkaran).
"use strict";
(function () {
  const PAL = { intro: [0xff2a2a, 0x5a0000], song1: [0xff3b30, 0xffffff], rise: [0xffffff, 0xffd9a0], song2: [0x3a6bff, 0xbfe0ff], peak: [0xff5a1f, 0xffc04a], outro: [0xffe0c0, 0xff8a6a] };
  const FOLK = [0xe8d8be, 0xa9adb3, 0xd99a6c, 0x9db8c9, 0xe5bfbf, 0xd9ae55, 0x8fb39a, 0xc9a7d8, 0x6f6a78, 0xb98e72];
  const ST = 8.4, FIELD_R = 36, SPAWN = { x: 0, z: 25 };
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
    scene.fog = new THREE.FogExp2(0x1a0608, 0.009);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
    const T = { on: false, scene, camera, input: { x: 0, y: 0 } };
    const neon = (c, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: lin(c), toneMapped: false }, o));
    const glow = (c, op, o = {}) => neon(c, Object.assign({ transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }, o));
    const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
    const fadeTex = canvasTex((c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,.3)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }, 8, 128);
    const cA = new THREE.Color(), cB = new THREE.Color(), cT = new THREE.Color(), WHITE = new THREE.Color(1, 1, 1);

    // ---------------------------------------------------------------- langit dan lampu dasar
    const skyU = { top: { value: lin(0x05040a) }, bot: { value: lin(0x2a0a10) } };
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
      vertexShader: "varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 bot; varying vec3 p; void main(){ float h = clamp(normalize(p).y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(bot, top, h), 1.0); }",
    })));
    {
      const R = rng("bintang"), n = 400, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, y = 0.35 + R() * 0.65, r = Math.sqrt(1 - y * y) * 380; pos.set([Math.cos(a) * r, y * 380, Math.sin(a) * r], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, fog: false, transparent: true, opacity: 0.6, toneMapped: false })));
    }
    const hemi = new THREE.HemisphereLight(0xffb0a0, 0x1a0a10, 0.5); scene.add(hemi);
    const stageL = new THREE.PointLight(0xff3020, 1.5, 60, 1.2); stageL.position.set(0, 10, 10); scene.add(stageL);
    const fireL = new THREE.PointLight(0xff7a20, 0, 50, 1.3); fireL.position.set(0, 5, 0); scene.add(fireL);

    // ---------------------------------------------------------------- lapangan dan tribun stadion
    add(new THREE.CircleGeometry(44, 64), M(0x120d10, { roughness: 0.9, envMapIntensity: 0.1 }), 0, 0, 0).rotation.x = -Math.PI / 2;
    const floorRings = [12, 20, 28, 36].map(r => { const m = add(new THREE.RingGeometry(r - 0.08, r + 0.08, 96), neon(0xff2a2a), 0, 0.02, 0); m.rotation.x = -Math.PI / 2; return m; });
    {
      // tribun: anak tangga yang naik dari pinggir lapangan sampai atap
      const prof = [new THREE.Vector2(44, 0)];
      for (let k = 0; k < 14; k++) { const r = 45 + k * 2.6, y = 1.2 + k * 2.2; prof.push(new THREE.Vector2(r, y), new THREE.Vector2(r + 2.6, y)); }
      prof.push(new THREE.Vector2(82, 36), new THREE.Vector2(84, 36), new THREE.Vector2(84, 0));
      add(new THREE.LatheGeometry(prof, 96), M(0x17121a, { roughness: 0.8, side: THREE.DoubleSide, envMapIntensity: 0.15 }), 0, 0, 0);
      add(new THREE.CylinderGeometry(44.2, 44.2, 1.2, 96, 1, true), neon(0xff2a2a, { side: THREE.DoubleSide }), 0, 0.6, 0);
    }
    // atap: cincin besi dengan lampu sorot yang mengarah ke panggung
    add(new THREE.TorusGeometry(82, 0.8, 8, 120), M(0x2a2630, { metalness: 0.6, roughness: 0.4 }), 0, 38, 0).rotation.x = Math.PI / 2;
    const beams = [];
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2, piv = new THREE.Group(); piv.position.set(Math.cos(a) * 80, 37, Math.sin(a) * 80); scene.add(piv);
      const geo = new THREE.CylinderGeometry(0.35, 5.5, 95, 18, 1, true); geo.translate(0, -47.5, 0); geo.rotateX(-Math.PI / 2);
      const m = glow(0xffffff, 0.12, { map: fadeTex, fog: false }); add(geo, m, 0, 0, 0, piv);
      add(new THREE.SphereGeometry(0.9, 10, 8), neon(0xffffff), 0, 0, 0, piv);
      beams.push({ piv, m, a, ph: i * 0.9 });
    }
    // penonton tribun: ribuan titik. Warnanya diatur tiap frame: gelap, gelang menyala bergelombang, atau lampu HP.
    const SN = 9000, sPos = new Float32Array(SN * 3), sCol = new Float32Array(SN * 3), sMeta = [];
    {
      const R = rng("tribun");
      for (let i = 0; i < SN; i++) {
        const k = Math.floor(R() * 14), a = R() * Math.PI * 2, r = 45.6 + k * 2.6 + R() * 2, y = 1.2 + k * 2.2 + 0.7 + R() * 0.2;
        sPos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3); sMeta.push({ a, k, base: 0.05 + R() * 0.07, ph: R() * 6.28, phone: R() < 0.35 });
      }
    }
    const sG = new THREE.BufferGeometry(); sG.setAttribute("position", new THREE.BufferAttribute(sPos, 3)); sG.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
    const stands = new THREE.Points(sG, new THREE.PointsMaterial({ size: 0.75, vertexColors: true, toneMapped: false, fog: false })); stands.frustumCulled = false; scene.add(stands);
    // kota di luar stadion
    {
      const win = canvasTex((c, w, h) => { c.fillStyle = "#0e0c18"; c.fillRect(0, 0, w, h); const r = rng("jendela"); for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 14) { c.fillStyle = r() < 0.35 ? `rgba(255,${190 + Math.floor(r() * 50)},140,${0.5 + r() * 0.5})` : "#1a1726"; c.fillRect(x, y, 8, 9); } }, 128, 256);
      const R2 = rng("gedung:konser"), n = 60, bld = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ map: win, color: 0x8a8296, fog: false }), n);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (R2() - 0.5) * 0.08, r = 150 + R2() * 50, h = 30 + R2() * (i % 4 === 0 ? 90 : 40), w = 12 + R2() * 14;
        m4.compose(new THREE.Vector3(Math.cos(a) * r, h / 2, Math.sin(a) * r), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a), new THREE.Vector3(w, h, w)); bld.setMatrixAt(i, m4);
      }
      scene.add(bld);
    }

    // ---------------------------------------------------------------- panggung tengah, rig lampu raksasa, layar kubus
    const stage = new THREE.Group(); scene.add(stage);
    add(new THREE.BoxGeometry(ST * 2, 2.2, ST * 2), M(0x0f0d12, { roughness: 0.5 }), 0, 1.1, 0, stage);
    const edge = [];
    for (const [w, d, x, z] of [[ST * 2, 0.16, 0, ST], [ST * 2, 0.16, 0, -ST], [0.16, ST * 2, ST, 0], [0.16, ST * 2, -ST, 0]]) edge.push(add(new THREE.BoxGeometry(w + 0.1, 0.18, d + 0.1), neon(0xffffff), x, 2.22, z, stage));
    const deck = add(new THREE.PlaneGeometry(ST * 2 - 0.4, ST * 2 - 0.4), neon(0x220606), 0, 2.21, 0, stage); deck.rotation.x = -Math.PI / 2;
    // rig: bingkai cahaya selebar panggung yang turun ke penonton waktu "langit turun"
    const rig = new THREE.Group(); stage.add(rig);
    const rigBars = [];
    for (const k of [0, 1]) for (const sx of [-1, 1]) rigBars.push(add(new THREE.BoxGeometry(k ? 0.5 : 22, 0.5, k ? 22 : 0.5), neon(0xffffff), k ? sx * 11 : 0, 0, k ? 0 : sx * 11, rig));
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.35, 0.7), neon(0xffffff), 36);
    { const m4 = new THREE.Matrix4(); let k = 0; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { m4.makeTranslation(-8 + i * 3.2, -0.3, -8 + j * 3.2); heads.setMatrixAt(k, m4); heads.setColorAt(k++, WHITE); } }
    rig.add(heads);
    const spot = new THREE.Group(); rig.add(spot);
    { const geo = new THREE.CylinderGeometry(0.3, 2.6, 22, 20, 1, true); geo.translate(0, -11, 0); add(geo, glow(0xffffff, 0.25, { map: fadeTex }), 0, 0, 0, spot); }
    // layar kubus di atas rig, tiap sisi menghadap tribun
    const scr = document.createElement("canvas"); scr.width = 1024; scr.height = 512; const sg = scr.getContext("2d");
    const scrTex = new THREE.CanvasTexture(scr); scrTex.encoding = THREE.sRGBEncoding;
    const cube = new THREE.Group(); cube.position.y = 22; stage.add(cube);
    for (let i = 0; i < 4; i++) { const p = add(new THREE.PlaneGeometry(16, 8), neon(0xffffff, { map: scrTex, fog: false }), Math.sin(i * Math.PI / 2) * 8.02, 0, Math.cos(i * Math.PI / 2) * 8.02, cube); p.rotation.y = i * Math.PI / 2; }
    add(new THREE.BoxGeometry(15.8, 7.8, 15.8), M(0x050408), 0, 0, 0, cube);
    // meriam api di pinggir panggung
    const flames = [];
    for (let i = 0; i < 12; i++) {
      const side = i % 4, t = Math.floor(i / 4) - 1, x = side < 2 ? t * 5.5 : (side === 2 ? 1 : -1) * (ST + 0.4), z = side < 2 ? (side === 0 ? 1 : -1) * (ST + 0.4) : t * 5.5;
      add(new THREE.BoxGeometry(0.9, 0.6, 0.9), M(0x222026, { metalness: 0.6 }), x, 2.5, z, stage);
      const geo = new THREE.ConeGeometry(0.75, 7, 12, 1, true); geo.translate(0, 3.5, 0);
      const outer = add(geo, glow(0xff6a10, 0.85), x, 2.8, z, stage), inner = add(geo, glow(0xffe08a, 0.9), x, 2.8, z, stage);
      inner.scale.set(0.45, 0.8, 0.45); outer.visible = inner.visible = false; flames.push({ outer, inner, ph: i * 0.37 });
    }
    // laser dari pojok panggung ke tribun
    const lasers = [];
    for (let i = 0; i < 12; i++) {
      const geo = new THREE.BoxGeometry(0.07, 0.07, 120); geo.translate(0, 0, 60);
      const cx = i % 4 < 2 ? -ST : ST, cz = i % 2 ? -ST : ST, piv = new THREE.Group(); piv.position.set(cx, 2.6, cz); scene.add(piv);
      const m = glow(i % 3 ? 0xff2a2a : 0xffffff, 0.9, { fog: false }); add(geo, m, 0, 0, 0, piv); piv.visible = false; lasers.push({ piv, m, ph: i * 0.55, a0: Math.atan2(cx, cz) });
    }
    // cincin cahaya yang melebar dari panggung sampai tribun
    const rings = [];
    for (let i = 0; i < 6; i++) { const r = add(new THREE.TorusGeometry(1, 0.08, 6, 96), glow(0xffffff, 0.8, { fog: false }), 0, 4, 0); r.rotation.x = Math.PI / 2; r.visible = false; rings.push(r); }
    // kabut panggung: lapisan tipis yang muter pelan
    const hazeTex = canvasTex((c, w, h) => { const r = rng("kabut"); for (let i = 0; i < 60; i++) { const x = r() * w, y = r() * h, rad = 20 + r() * 60, g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, "rgba(255,255,255,.22)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); } }, 256, 256);
    const haze = [0, 1, 2].map(i => { const m = add(new THREE.PlaneGeometry(90, 90), glow(0xff3030, 0.16, { map: hazeTex }), 0, 0.8 + i * 1.1, 0); m.rotation.x = -Math.PI / 2; return m; });
    // kembang api dan confetti
    const FW = 10, FWN = 90, fwPos = new Float32Array(FW * FWN * 3), fwCol = new Float32Array(FW * FWN * 3), fwVel = new Float32Array(FW * FWN * 3), fwB = [];
    const fwG = new THREE.BufferGeometry(); fwG.setAttribute("position", new THREE.BufferAttribute(fwPos, 3)); fwG.setAttribute("color", new THREE.BufferAttribute(fwCol, 3));
    const fw = new THREE.Points(fwG, new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    fw.frustumCulled = false; scene.add(fw);
    for (let b = 0; b < FW; b++) fwB.push({ t0: -99, c: new THREE.Color() });
    const CN = 900, cPos = new Float32Array(CN * 3), cCol = new Float32Array(CN * 3), cVel = [];
    { const R = rng("confetti"), C = [0xff2a2a, 0xffffff, 0xffc04a, 0xff7a3d]; for (let i = 0; i < CN; i++) { const c = lin(C[i % 4]); cCol.set([c.r, c.g, c.b], i * 3); cVel.push([(R() - 0.5) * 50, (R() - 0.5) * 50, 1.2 + R() * 1.4, R() * 8]); } }
    const cG = new THREE.BufferGeometry(); cG.setAttribute("position", new THREE.BufferAttribute(cPos, 3)); cG.setAttribute("color", new THREE.BufferAttribute(cCol, 3));
    const conf = new THREE.Points(cG, new THREE.PointsMaterial({ size: 0.2, vertexColors: true, toneMapped: false })); conf.frustumCulled = false; conf.visible = false; scene.add(conf);
    const flash = add(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }), 0, 0, -0.2, camera);
    flash.renderOrder = 99; scene.add(camera);

    // ---------------------------------------------------------------- penonton lapangan (ratusan warga) + penyanyi
    const folk = [];
    {
      const R = rng("penonton");
      for (let x = -FIELD_R; x <= FIELD_R; x += 1.1) for (let z = -FIELD_R; z <= FIELD_R; z += 1.1) {
        const px = x + (R() - 0.5) * 0.6, pz = z + (R() - 0.5) * 0.6, r = Math.hypot(px, pz);
        if (r > FIELD_R - 1 || Math.max(Math.abs(px), Math.abs(pz)) < ST + 1.6) continue;
        if (Math.hypot(px - SPAWN.x, pz - SPAWN.z) < 2.6) continue;
        if (R() > 0.95 - r / FIELD_R * 0.6) continue;   // makin dekat panggung makin padat
        folk.push({ x: px, z: pz, dir: Math.atan2(-px, -pz), ph: R() * 6.28, hop: 0.6 + R() * 0.8, c: FOLK[Math.floor(R() * FOLK.length)], s: 1.2 + R() * 0.3, stick: R() < 0.4, copy: 0 });
      }
    }
    if (folk.length > 1100) { const keep = 1100 / folk.length; let acc = 0; const all = folk.splice(0); for (const f of all) { acc += keep; if (acc >= 1) { acc -= 1; folk.push(f); } } }
    folk.push({ x: 0, z: 2.5, base: 2.2, dir: 0, ph: 0, hop: 1, c: 0x2e2a26, s: 3.6, stick: false, band: "voice", copy: 0 });
    const NF = folk.length;
    const bodyI = new THREE.InstancedMesh(SPH(0.32, 14, 10), M(0xffffff, { roughness: 0.95, envMapIntensity: 0.25 }), NF);
    const earI = new THREE.InstancedMesh(SPH(0.1, 6, 5), M(0xffffff, { roughness: 0.95, envMapIntensity: 0.25 }), NF * 2);
    const stickI = new THREE.InstancedMesh(CYL(0.035, 0.035, 0.5, 5), neon(0xffffff), NF);
    folk.forEach((f, i) => { const c = lin(f.c); bodyI.setColorAt(i, c); earI.setColorAt(i * 2, c); earI.setColorAt(i * 2 + 1, c); stickI.setColorAt(i, WHITE); });
    for (const im of [bodyI, earI, stickI]) { im.frustumCulled = false; scene.add(im); }
    const OFF = {
      body: new THREE.Matrix4().compose(new THREE.Vector3(0, 0.36, 0), new THREE.Quaternion(), new THREE.Vector3(1, 0.95, 0.88)),
      ear: [-1, 1].map(sx => new THREE.Matrix4().makeTranslation(sx * 0.2, 0.62, 0)),
      stick: new THREE.Matrix4().makeTranslation(0.32, 0.95, 0.12),
    };
    const mic = add(CYL(0.03, 0.03, 2.4, 6), M(0xd8d8e0, { metalness: 0.8, roughness: 0.25 }), 0, 3.4, 3.6, stage);

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
    const STAGE_LOOK = new THREE.Vector3(0, 12, 0);
    T.down = e => { ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist }; drag = null; } else drag = { x: e.clientX, y: e.clientY, yaw, pitch }; };
    T.move = e => {
      if (!ptr.has(e.pointerId)) return; ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptr.size >= 2) { const [a, b] = [...ptr.values()]; dist = Math.max(3.5, Math.min(16, pinch.dist * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)))); return; }
      if (!drag) return;
      yaw = drag.yaw - (e.clientX - drag.x) * 0.006; pitch = Math.max(0.02, Math.min(1.1, drag.pitch + (e.clientY - drag.y) * 0.004));
    };
    T.up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; if (!ptr.size) drag = null; };
    T.cancel = T.up;
    T.wheel = e => { dist = Math.max(3.5, Math.min(16, dist + e.deltaY * 0.008)); };
    const keys = new Set();
    T.key = (code, down) => { if (down) keys.add(code); else keys.delete(code); };
    T.jump = () => { if (me.y <= 0.001) me.vy = 6.2; };
    T.emote = i => {
      if (i === 4) { me.stick = !me.stick; if (stickK) stickK.visible = me.stick; return; }
      me.emote = { kind: ["", "wave", "clap", "dance"][i], t0: performance.now(), dur: i === 3 ? 1600 : 1400 };
      for (const f of folk) if (!f.band && Math.hypot(f.x - me.x, f.z - me.z) < 6) f.copy = performance.now() + 300 + Math.random() * 600;
    };

    // ---------------------------------------------------------------- jam show
    let start = 0, live = false, ended = false, saidSet = new Set(), lastScr = 0, camReady = false;
    T.sec = () => (Date.now() - start) / 1000;
    T.enter = o => {
      start = o.start; live = !!o.live; ended = false; saidSet = new Set(); T.title = o.name || K.BAND;
      buildKiko(); me.x = SPAWN.x; me.z = SPAWN.z; me.y = 0; me.vy = 0; me.dir = Math.PI; me.stick = false;
      yaw = 0; pitch = 0.22; dist = T.portrait ? 7.5 : 7; keys.clear(); T.input.x = T.input.y = 0;
      for (const s of K.MOMENTS) if (s.t < T.sec() - 1) saidSet.add(s.id);   // telat masuk: momen yang udah lewat nggak diumumin
      T.on = true; lastScr = 0; camReady = false;
    };
    T.exit = () => { T.on = false; keys.clear(); };
    T.live = () => live;
    T.resize = (w, h) => { camera.aspect = w / h; T.portrait = w < h; camera.fov = T.portrait ? 66 : 56; camera.updateProjectionMatrix(); };
    // keramaian buat suara.js: ramai pas lagu, sepi di penutup
    T.crowd = () => { const A = K.at(T.sec()); return A.phase === "before" ? 0.45 : A.phase === "after" ? 0.3 : 0.35 + A.energy * 0.6; };

    // ---------------------------------------------------------------- layar
    function drawScreen(s, A, pal) {
      const w = scr.width, h = scr.height;
      sg.fillStyle = "#050306"; sg.fillRect(0, 0, w, h);
      sg.textAlign = "center"; sg.textBaseline = "middle";
      const c0 = "#" + new THREE.Color(pal[0]).getHexString();
      if (A.phase === "before") {
        sg.fillStyle = "#ff6a6a"; sg.font = "700 44px Manrope, sans-serif"; sg.fillText(T.title.toUpperCase(), w / 2, 110);
        sg.fillStyle = "#fff"; sg.font = "800 170px Manrope, sans-serif"; sg.fillText(A.left > 99 ? K.clock(A.left) : String(Math.ceil(A.left)), w / 2, 280);
        sg.fillStyle = "#a07070"; sg.font = "600 32px Manrope, sans-serif"; sg.fillText(live ? "RIVERSIDE ARENA · OLD TOWN · LIVE" : "RIVERSIDE ARENA · REHEARSAL", w / 2, 440);
      } else if (A.phase === "after") {
        sg.fillStyle = "#fff"; sg.font = "800 76px Manrope, sans-serif"; sg.fillText("THANK YOU, OLD TOWN", w / 2, 240);
      } else if (s < 8) {
        sg.globalAlpha = Math.min(1, s / 6); sg.fillStyle = "#ff2a2a"; sg.font = "800 96px Manrope, sans-serif"; sg.fillText(T.title.toUpperCase(), w / 2, h / 2); sg.globalAlpha = 1;
      } else {
        const k = 1 - A.beatK;
        sg.fillStyle = c0; sg.globalAlpha = 0.12 + 0.3 * k * A.energy; sg.fillRect(0, 0, w, h); sg.globalAlpha = 1;
        const big = A.moments.find(m => ["float", "fireworks", "rings", "lasers", "stairs"].includes(m.id));
        const word = big ? { float: "WEIGHTLESS", fireworks: "FINALE", rings: "RINGS", lasers: "NEON RIVER", stairs: "LOOK UP" }[big.id] : A.act === "outro" ? "GOODNIGHT" : A.act === "rise" ? "THE SKY COMES DOWN" : T.title.toUpperCase();
        sg.fillStyle = "#fff"; sg.font = `800 ${word.length > 14 ? 84 : 120}px Manrope, sans-serif`; sg.fillText(word, w / 2, h / 2 - 20);
        sg.fillStyle = c0; const bw = 600 * A.energy * (0.6 + 0.4 * k); sg.fillRect(w / 2 - bw / 2, h - 90, bw, 10);
        sg.font = "600 30px Manrope, sans-serif"; sg.fillStyle = "rgba(255,255,255,.7)"; sg.fillText(A.name.toUpperCase(), w / 2, h - 44);
      }
      scrTex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- tiap frame
    const m4 = new THREE.Matrix4(), mm = new THREE.Matrix4(), rot = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
    const blocked = (x, z) => Math.hypot(x, z) > FIELD_R || (Math.abs(x) < ST + 0.5 && Math.abs(z) < ST + 0.5);
    T.frame = (t, dt) => {
      const s = T.sec(), A = K.at(s), act = A.act || (A.phase === "before" ? "intro" : "outro"), pal = PAL[act];
      const mom = id => { const m = A.moments.find(x => x.id === id); return m ? m.k : -1; };
      const beatP = A.phase === "show" ? Math.pow(1 - A.beatK, 2.2) : 0;
      const lightsOn = A.phase === "show" && s >= 8, reduce = !!env.reduce;
      for (const m of A.moments) if (!saidSet.has(m.id)) { saidSet.add(m.id); const def = K.MOMENTS.find(x => x.id === m.id); if (def.say && env.say) env.say(def.say); }
      if (A.phase === "after" && s > K.LEN + 3 && !ended) { ended = true; if (env.onEnd) env.onEnd(); }
      cA.copy(lin(pal[0])); cB.copy(lin(pal[1]));

      // langit dan kabut ikut babak
      const skyK = act === "peak" ? 1 : act === "song2" ? 0.5 : lightsOn ? 0.3 : 0;
      skyU.bot.value.copy(lin(0x1a0608)).lerp(cA, skyK * 0.35 + beatP * 0.05);
      scene.fog.color.copy(skyU.bot.value).multiplyScalar(0.8);
      haze.forEach((h, i) => { h.rotation.z = t / (9000 + i * 3000) * (i % 2 ? -1 : 1); h.material.color.copy(i % 2 ? cA : cB).multiplyScalar(lightsOn ? 0.25 + 0.15 * beatP : 0.08); });
      floorRings.forEach((r, i) => r.material.color.copy(cA).multiplyScalar(lightsOn ? 0.15 + 0.85 * Math.pow(Math.max(0, 1 - Math.abs(((A.beatK * 4) % 4) - i)), 2) * A.energy : 0.05));
      edge.forEach(e => e.material.color.copy(cA).multiplyScalar(lightsOn ? 0.6 + beatP : 0.1));
      deck.material.color.copy(cA).multiplyScalar(lightsOn ? 0.05 + 0.08 * beatP : 0.02);

      // layar
      if (t - lastScr > 80) { lastScr = t; drawScreen(s, A, pal); }
      cube.rotation.y = s * 0.05;

      // rig: turun waktu "langit turun", naik lagi waktu lagu 2
      const down = s < 120 ? 0 : s < 128 ? (s - 120) / 8 : s < 176 ? 1 : s < 184 ? 1 - (s - 176) / 8 : 0;
      const ease = down * down * (3 - 2 * down);
      rig.position.y = 15 - ease * 8.5 + (act === "song2" ? Math.sin(s * 0.5) * 1.5 : 0);
      rig.rotation.y = act === "rise" ? (s - 120) * 0.02 : 0;
      const rigOn = lightsOn || A.phase === "before";
      rigBars.forEach((b, i) => b.material.color.copy(i % 2 ? cA : cB).multiplyScalar(rigOn ? (act === "rise" ? 1.6 : 0.5 + beatP) : 0.03));
      for (let k = 0; k < 36; k++) { const wv = Math.max(0, Math.sin(s * 3 - (k % 6) * 0.6 - Math.floor(k / 6) * 0.6)); heads.setColorAt(k, cT.copy(k % 2 ? cA : cB).multiplyScalar(rigOn ? 0.2 + wv * (act === "rise" ? 1.6 : 0.9) : 0.02)); }
      heads.instanceColor.needsUpdate = true;
      // satu lampu putih ke penyanyi: paling terasa waktu gelap total di awal
      spot.visible = A.phase === "show" && (s < 30 || act === "outro" || act === "rise");
      spot.position.set(0, 0, 2.5); spot.scale.y = Math.max(0.3, (rig.position.y - 2.2) / 22);

      // lampu sorot dari atap: semua ngarah ke panggung, lalu nyapu ke penonton
      beams.forEach((B, i) => {
        B.piv.visible = lightsOn; if (!lightsOn) return;
        const sp = reduce ? 0.25 : 1, a = s * 0.45 * sp + B.ph, sweep = act === "song1" || act === "peak" ? 1 : act === "song2" ? 0.6 : 0.25;
        const tr = 4 + sweep * (16 + Math.sin(a) * 14), ang = B.a + Math.sin(a * 0.7) * 0.6;
        tmp.set(Math.cos(ang) * tr, act === "rise" ? 18 : 0, Math.sin(ang) * tr);
        B.piv.lookAt(tmp); B.m.color.copy(i % 2 ? cA : cB); B.m.opacity = 0.05 + 0.1 * A.energy + 0.05 * beatP;
      });
      // laser
      const lz = mom("lasers") >= 0 || act === "peak" || (s >= 90 && s < 120);
      lasers.forEach((L, i) => { L.piv.visible = lz && !reduce; if (L.piv.visible) L.piv.rotation.set(-0.1 - Math.abs(Math.sin(s * 1.1 + L.ph)) * 0.35, L.a0 + Math.sin(s * 0.8 + L.ph) * 0.9, 0); L.m.color.copy(i % 3 ? cA : WHITE); });
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
        if (on) { const fl = (0.85 + 0.15 * Math.sin(t / 30 + f.ph * 10)) * fire * (dk >= 0 ? 1.6 : 1); f.outer.scale.set(1, fl, 1); f.inner.scale.set(0.45, fl * 0.8, 0.45); }
      });
      fireL.intensity = fire * 3.5;
      stageL.color.copy(cA); stageL.intensity = lightsOn ? 1 + beatP * A.energy : 0.3;
      hemi.intensity = 0.4 + fire * 0.4;
      // cincin
      const rk = mom("rings");
      rings.forEach((r, i) => { const k = rk < 0 ? -1 : ((rk * 5 - i * 0.3) % 1 + 1) % 1; r.visible = rk >= 0 && rk * 5 > i * 0.3; if (r.visible) { r.scale.setScalar(ST + k * 80); r.position.y = 4 + k * 20; r.material.opacity = 0.9 * (1 - k); r.material.color.copy(i % 2 ? cA : WHITE); } });
      // tribun: gelap waktu intro (cuma lampu HP), gelang menyala bergelombang mulai momen "sky" dan di lagu 2/finale
      const band = act === "song2" || act === "peak" || mom("sky") >= 0 || mom("lights") >= 0, phones = A.phase !== "show" || s < 8 || act === "outro" || act === "rise";
      for (let i = 0; i < SN; i++) {
        const m = sMeta[i]; let r, g, b;
        if (band && lightsOn) { const wv = 0.5 + 0.5 * Math.sin(m.a * 3 - s * 2.4 + m.k * 0.3), c = wv > 0.5 ? cA : cB, v = 0.25 + 0.75 * wv * (0.7 + 0.3 * beatP); r = c.r * v; g = c.g * v; b = c.b * v; }
        else if (phones && m.phone) { const v = 0.55 + 0.35 * Math.sin(t / 700 + m.ph); r = v; g = v * 0.95; b = v * 0.85; }
        else { const v = m.base + (lightsOn ? 0.04 * beatP : 0); r = v * 1.4; g = v; b = v; }
        sCol[i * 3] = r; sCol[i * 3 + 1] = g; sCol[i * 3 + 2] = b;
      }
      sG.attributes.color.needsUpdate = true;
      // kembang api di atas atap stadion
      const fk = mom("fireworks");
      if (fk >= 0) {
        const slot = Math.floor(s / 0.6), bi = slot % FW, b = fwB[bi];
        if (b.slot !== slot) {
          const r = rng("fw:" + slot), a = r() * Math.PI * 2, rr = 50 + r() * 40, cx = Math.cos(a) * rr, cy = 45 + r() * 30, cz = Math.sin(a) * rr;
          b.slot = slot; b.t0 = s; b.c.copy(lin([0xff2a2a, 0xffffff, 0xffc04a, 0xff7a3d, 0xff4fa3][slot % 5]));
          for (let k = 0; k < FWN; k++) { const j = (bi * FWN + k) * 3, u = r() * 2 - 1, aa = r() * Math.PI * 2, sp = 10 + r() * 5, sq = Math.sqrt(1 - u * u); fwPos.set([cx, cy, cz], j); fwVel.set([sq * Math.cos(aa) * sp, u * sp, sq * Math.sin(aa) * sp], j); }
        }
      }
      fwB.forEach((b, bi) => {
        const age = s - b.t0, alive = age >= 0 && age < 2.6, f = alive ? Math.pow(1 - age / 2.6, 1.5) : 0;
        for (let k = 0; k < FWN; k++) {
          const j = (bi * FWN + k) * 3;
          if (alive) { fwVel[j + 1] -= 6 * dt; for (let a = 0; a < 3; a++) { fwVel[j + a] *= 1 - 0.8 * dt; fwPos[j + a] += fwVel[j + a] * dt; } }
          fwCol[j] = b.c.r * f; fwCol[j + 1] = b.c.g * f; fwCol[j + 2] = b.c.b * f;
        }
      });
      fwG.attributes.position.needsUpdate = fwG.attributes.color.needsUpdate = true;
      // confetti di atas lapangan
      const ck = Math.max(mom("confetti"), mom("confetti2"));
      conf.visible = ck >= 0;
      if (conf.visible) {
        const t0 = ck * 8;
        for (let i = 0; i < CN; i++) { const [ox, oz, vy, d] = cVel[i], age = (t0 + d * 0.2) % 8; cPos[i * 3] = ox + Math.sin(age * 2 + i) * 0.8; cPos[i * 3 + 1] = Math.max(0.02, 22 - age * vy * 2.4); cPos[i * 3 + 2] = oz + Math.cos(age * 1.7 + i) * 0.8; }
        cG.attributes.position.needsUpdate = true;
      }
      flash.material.opacity = dk >= 0 && !reduce ? Math.max(0, 0.75 * (1 - dk * 3)) : 0;

      // ---------------------------------------------------------------- Kiko jalan
      let ix = T.input.x, iy = T.input.y;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1; if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
      if (keys.has("KeyW") || keys.has("ArrowUp")) iy += 1; if (keys.has("KeyS") || keys.has("ArrowDown")) iy -= 1;
      const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const mx = (fx * iy + rx * ix) * 3.6 * dt, mz = (fz * iy + rz * ix) * 3.6 * dt;
      if (il > 0.08) {
        let nx = me.x + mx, nz = me.z + mz;
        if (blocked(nx, me.z)) nx = me.x; if (blocked(nx, nz)) nz = me.z;
        for (const f of folk) { if (f.band) continue; const dx = nx - f.x, dz = nz - f.z; if (Math.abs(dx) > 0.7 || Math.abs(dz) > 0.7) continue; const d = Math.hypot(dx, dz); if (d < 0.62 && d > 0.001) { nx = f.x + dx / d * 0.62; nz = f.z + dz / d * 0.62; } }
        if (!blocked(nx, nz)) { me.x = nx; me.z = nz; }
        const want = Math.atan2(mx, mz); let d = want - me.dir; d = Math.atan2(Math.sin(d), Math.cos(d)); me.dir += d * Math.min(1, dt * 12);
        me.walk += dt * 11;
      }
      me.vy -= (A.gravity || 1) * 16 * dt; me.y = Math.max(0, me.y + me.vy * dt); if (me.y === 0) me.vy = Math.max(0, me.vy);
      kiko.position.set(me.x, me.y, me.z); kiko.rotation.y = me.dir;
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
      mic.position.set(Math.sin(s * 0.35) * 1.1, 3.4, 2.5 + Math.cos(s * 0.35) * 1.1);

      // ---------------------------------------------------------------- kamera: di belakang Kiko, sesekali ditarik ke panggung
      const camM = A.moments.find(m => m.cam && m.k < 0.6);
      const pull = camM && !reduce ? Math.sin(camM.k / 0.6 * Math.PI) : 0;
      look.set(me.x - Math.sin(yaw) * 6, me.y * 0.6 + kikoH + 2.4, me.z - Math.cos(yaw) * 6);
      tmp.copy(look).lerp(STAGE_LOOK, pull * 0.5);
      const d = dist + pull * 4;
      base3.set(me.x, me.y * 0.6 + kikoH, me.z);
      camPos.set(me.x + Math.sin(yaw) * Math.cos(pitch) * d, base3.y + Math.sin(pitch) * d + pull * 2, me.z + Math.cos(yaw) * Math.cos(pitch) * d);
      camera.position.lerp(camPos, camReady ? Math.min(1, dt * 8) : 1); camReady = true;
      camera.lookAt(tmp);
    };
    T.state = () => { const s = T.sec(), A = K.at(s); return { s, A, live, title: T.title }; };
    return T;
  }

  globalThis.Konser3D = { create, FIELD };
})();

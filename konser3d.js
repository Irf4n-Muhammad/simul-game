// Arena konser (v78): kamu yang jalanin Kiko dari belakang (orang ketiga), di depan panggung di Riverside Park.
// Semua yang terjadi di panggung ikut detik show dari konser.js, jadi semua HP lihat momen yang sama di detik yang sama.
// Penonton warga digambar pakai InstancedMesh (beberapa draw call saja) biar tetap ringan di HP. Tanpa bayangan, tanpa fisika:
// pagar dan panggung itu kotak, warga itu lingkaran.
"use strict";
(function () {
  const PAL = { intro: [0x6a5cff, 0x3a2f9a], song1: [0x2fd6c4, 0xff4fa3], rise: [0xffc24a, 0xff7a3d], song2: [0x8a6bff, 0x4fd1ff], peak: [0xff6a3d, 0xffd34f], outro: [0xffb38a, 0xc28aff] };
  const FIELD = { x0: -11.6, x1: 11.6, z0: 1.4, z1: 20.4 };
  const FOLK = [0xe8d8be, 0xa9adb3, 0xd99a6c, 0x9db8c9, 0xe5bfbf, 0xd9ae55, 0x8fb39a, 0xc9a7d8];

  function rng(seed) {
    let a = 0; for (const ch of String(seed)) a = (Math.imul(a, 31) + ch.charCodeAt(0)) | 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function create(env) {
    const { THREE, M, RB, SPH, CYL, canvasTex } = env;
    const K = globalThis.Konser;
    const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
    const scene = new THREE.Scene();
    scene.environment = env.environment || null;
    scene.fog = new THREE.Fog(0x120e22, 40, 130);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
    const T = { on: false, scene, camera, input: { x: 0, y: 0 } };
    const neon = (c, o = {}) => { const m = new THREE.MeshBasicMaterial(Object.assign({ color: lin(c), toneMapped: false }, o)); return m; };
    const glow = (c, op) => neon(c, { transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

    // ---------------------------------------------------------------- langit, bintang, lampu
    const skyU = { top: { value: lin(0x0b0f24) }, bot: { value: lin(0x2a2140) } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
      vertexShader: "varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 bot; varying vec3 p; void main(){ float h = clamp(normalize(p).y * 1.6 + 0.1, 0.0, 1.0); gl_FragColor = vec4(mix(bot, top, h), 1.0); }",
    }));
    scene.add(sky);
    {
      const R = rng("bintang"), n = 500, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, y = 0.15 + R() * 0.85, r = Math.sqrt(1 - y * y) * 180; pos.set([Math.cos(a) * r, y * 180, Math.sin(a) * r], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.1, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.8, toneMapped: false })));
    }
    const hemi = new THREE.HemisphereLight(0x9aa6ff, 0x2a1f30, 0.55); scene.add(hemi);
    const front = new THREE.PointLight(0xffffff, 1.2, 40, 1.4); front.position.set(0, 7, 6); scene.add(front);
    const back = new THREE.PointLight(0xffd9b0, 0.5, 30, 1.6); back.position.set(0, 5, 22); scene.add(back);

    // ---------------------------------------------------------------- tanah, lantai menyala, pagar, pohon, kota di kejauhan, sungai
    add(new THREE.PlaneGeometry(260, 260), M(0x1b2620, { roughness: 1, envMapIntensity: 0.1 }), 0, 0, 0).rotation.x = -Math.PI / 2;
    const TC = 12, TR = 10, tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.7, 1.7), neon(0xffffff), TC * TR);
    const tileXZ = [];
    {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), s = new THREE.Vector3(1, 1, 1);
      let k = 0;
      for (let r = 0; r < TR; r++) for (let c = 0; c < TC; c++) {
        const x = FIELD.x0 + 1 + c * 1.95, z = FIELD.z0 + 1 + r * 1.9;
        m4.compose(new THREE.Vector3(x, 0.012, z), q, s); tiles.setMatrixAt(k, m4); tiles.setColorAt(k, new THREE.Color(0)); tileXZ.push([x, z]); k++;
      }
    }
    scene.add(tiles);
    const fenceM = M(0x2b2833, { roughness: 0.7 }), fenceTop = neon(0xffffff);
    for (const [w, d, x, z] of [[0.18, FIELD.z1 - FIELD.z0 + 1, FIELD.x0 - 0.5, (FIELD.z0 + FIELD.z1) / 2], [0.18, FIELD.z1 - FIELD.z0 + 1, FIELD.x1 + 0.5, (FIELD.z0 + FIELD.z1) / 2], [FIELD.x1 - FIELD.x0 + 1.2, 0.18, 0, FIELD.z1 + 0.6]]) {
      add(new THREE.BoxGeometry(w, 0.9, d), fenceM, x, 0.45, z); add(new THREE.BoxGeometry(w + 0.02, 0.05, d + 0.02), fenceTop, x, 0.92, z);
    }
    {
      const R = rng("pohon:konser"), spots = [];
      for (let i = 0; i < 70; i++) {
        const side = i % 3, x = side === 0 ? -15 - R() * 14 : side === 1 ? 15 + R() * 6 : -14 + R() * 28, z = side === 2 ? 24 + R() * 10 : -12 + R() * 40;
        spots.push([x, z, 1.6 + R() * 1.6]);
      }
      const cone = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.6, 7), M(0x1f3a2a, { roughness: 1, envMapIntensity: 0.15 }), spots.length);
      const trunk = new THREE.InstancedMesh(CYL(0.14, 0.18, 1, 6), M(0x3a2a20), spots.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      spots.forEach(([x, z, s], i) => { m4.compose(new THREE.Vector3(x, 0.5 * s + 1.3 * s, z), q, new THREE.Vector3(s, s, s)); cone.setMatrixAt(i, m4); m4.compose(new THREE.Vector3(x, 0.5 * s * 0.6, z), q, new THREE.Vector3(s, s * 0.6, s)); trunk.setMatrixAt(i, m4); });
      scene.add(cone, trunk);
      // gedung Old Town di kejauhan: jendela menyala
      const win = canvasTex((c, w, h) => { c.fillStyle = "#0e0c18"; c.fillRect(0, 0, w, h); const r = rng("jendela"); for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 14) { c.fillStyle = r() < 0.38 ? `rgba(255,${200 + Math.floor(r() * 40)},140,${0.5 + r() * 0.5})` : "#1a1726"; c.fillRect(x, y, 8, 9); } }, 128, 256);
      const R2 = rng("gedung:konser"), n = 46, bld = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ map: win, color: 0x8a8296, fog: true }), n);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.55 + 1.9 * (i / n)) + (R2() - 0.5) * 0.1, r = 70 + R2() * 25, h = 8 + R2() * (i % 5 === 0 ? 34 : 16), w = 5 + R2() * 6;
        m4.compose(new THREE.Vector3(Math.cos(a) * r, h / 2, Math.sin(a) * r - 10), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a), new THREE.Vector3(w, h, w)); bld.setMatrixAt(i, m4);
      }
      scene.add(bld);
    }
    const river = add(new THREE.PlaneGeometry(22, 240), neon(0x1a2040), 32, 0.02, 0); river.rotation.x = -Math.PI / 2;

    // ---------------------------------------------------------------- panggung, layar besar, menara speaker, truss
    const stage = new THREE.Group(); scene.add(stage);
    add(RB(19, 1.4, 7.2, 0.12), M(0x1c1a24, { roughness: 0.6 }), 0, 0.7, -3.6, stage);
    const lip = add(new THREE.BoxGeometry(19.05, 0.12, 0.12), neon(0xffffff), 0, 1.38, 0.02, stage);
    for (const sx of [-1, 1]) {
      add(new THREE.BoxGeometry(2.4, 11, 2.4), M(0x15141b, { roughness: 0.5 }), sx * 10.8, 5.5, -3.4, stage);
      for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 24), M(0x0a0a0e, { roughness: 0.4 }), sx * 10.8, 2.6 + k * 2.4, -2.15, stage).rotation.x = Math.PI / 2;
    }
    add(new THREE.BoxGeometry(23.8, 0.5, 0.5), M(0x3a3946, { metalness: 0.6, roughness: 0.4 }), 0, 11.2, -1.2, stage);
    // layar: dua belahan yang bisa kebuka ke samping waktu panggung "terbuka"
    const scr = document.createElement("canvas"); scr.width = 1024; scr.height = 512; const sg = scr.getContext("2d");
    const texL = new THREE.CanvasTexture(scr), texR = new THREE.CanvasTexture(scr);
    for (const [t, o] of [[texL, 0], [texR, 0.5]]) { t.encoding = THREE.sRGBEncoding; t.repeat.set(0.5, 1); t.offset.set(o, 0); }
    const halfL = add(new THREE.PlaneGeometry(8, 8), neon(0xffffff, { map: texL }), -4, 5.6, -7.1, stage);
    const halfR = add(new THREE.PlaneGeometry(8, 8), neon(0xffffff, { map: texR }), 4, 5.6, -7.1, stage);
    const frameM = M(0x101016, { roughness: 0.5 });
    add(new THREE.BoxGeometry(17, 0.4, 0.4), frameM, 0, 9.8, -7.2, stage);
    // tangga cahaya di belakang layar, naik ke langit
    const stairs = [];
    for (let i = 0; i < 18; i++) { const s = add(new THREE.BoxGeometry(3.2 - i * 0.08, 0.16, 1.1), neon(0xffe7a8), 0, 2 + i * 1.6, -8.5 - i * 1.5, stage); s.visible = false; stairs.push(s); }
    // band: drum, gitar, mikrofon (warganya ikut InstancedMesh penonton)
    const kit = new THREE.Group(); kit.position.set(0, 1.4, -5.2); stage.add(kit);
    const drumM = M(0xc2704f, { roughness: 0.4 }), chromeM = M(0xd8d8e0, { metalness: 0.8, roughness: 0.25 });
    add(CYL(0.55, 0.55, 0.6, 20), drumM, 0, 0.55, 0.6, kit).rotation.x = Math.PI / 2;
    for (const sx of [-1, 1]) { add(CYL(0.3, 0.3, 0.3, 16), drumM, sx * 0.8, 0.75, 0.5, kit); add(CYL(0.4, 0.4, 0.02, 20), chromeM, sx * 1.1, 1.4, 0.3, kit); }
    add(CYL(0.025, 0.025, 1.4, 6), chromeM, 0, 2.1, -1.6, stage);
    const guitar = add(RB(0.5, 0.18, 1.1, 0.06), M(0x2fd6c4, { roughness: 0.35 }), 4, 2.0, -3.0, stage); guitar.rotation.set(0.2, 0, 0.9);

    // lampu sorot (kerucut cahaya) dari truss
    const beamTex = canvasTex((c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.6, "rgba(255,255,255,.25)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }, 8, 128);
    const beams = [];
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.CylinderGeometry(0.1, 2.2, 18, 20, 1, true); geo.translate(0, -9, 0);
      const m = glow(0xffffff, 0.22); m.map = beamTex;
      const piv = new THREE.Group(); piv.position.set(-9 + i * 3.6, 11, -1.2); scene.add(piv);
      const b = add(geo, m, 0, 0, 0, piv); beams.push({ piv, b, m, ph: i * 1.3 });
      add(CYL(0.3, 0.38, 0.5, 12), M(0x222128), 0, 0, 0, piv);
    }
    // laser dari pojok belakang panggung, nyapu di atas penonton
    const lasers = [];
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.BoxGeometry(0.05, 0.05, 60); geo.translate(0, 0, 30);
      const piv = new THREE.Group(); piv.position.set(i < 4 ? -8 : 8, 1.6, -6.5); scene.add(piv);
      const m = glow(i % 2 ? 0x4fd1ff : 0xff4fa3, 0.9); add(geo, m, 0, 0, 0, piv); piv.visible = false; lasers.push({ piv, m, ph: i * 0.8 });
    }
    // cincin cahaya yang melebar dari panggung
    const rings = [];
    for (let i = 0; i < 5; i++) { const r = add(new THREE.TorusGeometry(1, 0.06, 6, 64), glow(0xffffff, 0.8), 0, 3, -2); r.rotation.x = Math.PI / 2; r.visible = false; rings.push(r); }
    // kembang api dan confetti (Points)
    const FW = 8, FWN = 70, fwPos = new Float32Array(FW * FWN * 3), fwCol = new Float32Array(FW * FWN * 3), fwVel = new Float32Array(FW * FWN * 3), fwB = [];
    const fwG = new THREE.BufferGeometry(); fwG.setAttribute("position", new THREE.BufferAttribute(fwPos, 3)); fwG.setAttribute("color", new THREE.BufferAttribute(fwCol, 3));
    const fw = new THREE.Points(fwG, new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    fw.frustumCulled = false; scene.add(fw);
    for (let b = 0; b < FW; b++) fwB.push({ t0: -99, c: new THREE.Color() });
    const CN = 520, cPos = new Float32Array(CN * 3), cCol = new Float32Array(CN * 3), cVel = [];
    { const R = rng("confetti"); for (let i = 0; i < CN; i++) { const c = lin(FOLK.concat([0xff4fa3, 0x4fd1ff, 0xffd34f])[i % 11]); cCol.set([c.r, c.g, c.b], i * 3); cVel.push([(R() - 0.5) * 0.8, 1.2 + R() * 1.4, R() * 6]); } }
    const cG = new THREE.BufferGeometry(); cG.setAttribute("position", new THREE.BufferAttribute(cPos, 3)); cG.setAttribute("color", new THREE.BufferAttribute(cCol, 3));
    const conf = new THREE.Points(cG, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, toneMapped: false })); conf.frustumCulled = false; conf.visible = false; scene.add(conf);
    const flash = add(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }), 0, 0, -0.2, camera);
    flash.renderOrder = 99; scene.add(camera);

    // ---------------------------------------------------------------- penonton (warga) + band, satu InstancedMesh per bagian tubuh
    const R = rng("penonton");
    const folk = [];
    for (let i = 0; i < 48; i++) {
      let x, z, ok = false;
      for (let tries = 0; tries < 30 && !ok; tries++) {
        x = FIELD.x0 + 0.8 + R() * (FIELD.x1 - FIELD.x0 - 1.6); z = FIELD.z0 + 0.6 + Math.pow(R(), 1.5) * (FIELD.z1 - FIELD.z0 - 2);
        ok = Math.hypot(x, z - 14) > 2.2 && folk.every(f => Math.hypot(f.x - x, f.z - z) > 1.0);
      }
      folk.push({ x, z, y: 0, dir: Math.atan2(-x * 0.6, -4 - z), ph: R() * 6.28, hop: 0.6 + R() * 0.8, c: FOLK[i % FOLK.length], s: 1.25 + R() * 0.3, stick: R() < 0.5, copy: 0 });
    }
    const BANDP = [[0, 1.4, -4.6, "drum"], [4.2, 1.4, -3.2, "guitar"], [0, 1.4, -1.6, "voice"]];
    for (const [x, y, z, role] of BANDP) folk.push({ x, z, y, base: y, dir: 0, ph: 0, hop: 1, c: role === "voice" ? 0xffd34f : role === "drum" ? 0x9db8c9 : 0xe5bfbf, s: 1.6, stick: false, band: role, copy: 0 });
    const NF = folk.length;
    const bodyI = new THREE.InstancedMesh(SPH(0.32, 16, 12), M(0xffffff, { roughness: 0.95, envMapIntensity: 0.3 }), NF);
    const earI = new THREE.InstancedMesh(SPH(0.1, 8, 6), M(0xffffff, { roughness: 0.95, envMapIntensity: 0.3 }), NF * 2);
    const eyeI = new THREE.InstancedMesh(SPH(0.04, 6, 5), new THREE.MeshBasicMaterial({ color: 0x14100e }), NF * 2);
    const stickI = new THREE.InstancedMesh(CYL(0.035, 0.035, 0.5, 6), neon(0xffffff), NF);
    folk.forEach((f, i) => { const c = lin(f.c); bodyI.setColorAt(i, c); earI.setColorAt(i * 2, c); earI.setColorAt(i * 2 + 1, c); stickI.setColorAt(i, new THREE.Color(0xffffff)); });
    for (const im of [bodyI, earI, eyeI, stickI]) { im.frustumCulled = false; scene.add(im); }
    const OFF = {
      body: new THREE.Matrix4().compose(new THREE.Vector3(0, 0.36, 0), new THREE.Quaternion(), new THREE.Vector3(1, 0.95, 0.88)),
      ear: [-1, 1].map(sx => new THREE.Matrix4().makeTranslation(sx * 0.2, 0.62, 0)),
      eye: [-1, 1].map(sx => new THREE.Matrix4().makeTranslation(sx * 0.1, 0.44, 0.27)),
      stick: new THREE.Matrix4().makeTranslation(0.32, 0.95, 0.12),
    };

    // ---------------------------------------------------------------- Kiko (model asli dari rumah)
    const kiko = new THREE.Group(); scene.add(kiko);
    const KS = 0.36;
    let KP = null, stickK = null, kikoH = 1.1;
    const me = { x: 0, z: 14, y: 0, vy: 0, dir: Math.PI, walk: 0, emote: null, stick: false };
    function buildKiko() {
      kiko.clear(); KP = env.makeKiko ? env.makeKiko(kiko) : null;
      if (!KP) { const b = add(SPH(0.4, 20, 14), M(0xe5bfbf), 0, 0.42, 0, kiko); KP = { root: b, body: b, arms: [], ears: [], scale: 1, fake: true }; }
      else { KP.root.scale.setScalar(KP.scale * KS); KP.arms.forEach(a => { a.userData.p0 = a.position.clone(); }); }
      kikoH = (KP.fake ? 0.9 : 3.1 * KP.scale * KS);
      if (!KP.fake) { stickK = add(CYL(0.09, 0.09, 1.5, 8), neon(0xffffff), 1.3, 1.6, 0.6, KP.body); stickK.visible = false; }
    }

    // ---------------------------------------------------------------- kamera orang ketiga
    let yaw = 0, pitch = 0.4, dist = 6.4, drag = null, pinch = null;
    const ptr = new Map(), look = new THREE.Vector3(), base3 = new THREE.Vector3(), camPos = new THREE.Vector3(), tmp = new THREE.Vector3();
    const STAGE_LOOK = new THREE.Vector3(0, 6, -6);
    T.down = e => { ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist }; drag = null; } else drag = { x: e.clientX, y: e.clientY, yaw, pitch }; };
    T.move = e => {
      if (!ptr.has(e.pointerId)) return; ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptr.size >= 2) { const [a, b] = [...ptr.values()]; dist = Math.max(3, Math.min(10, pinch.dist * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)))); return; }
      if (!drag) return;
      yaw = drag.yaw - (e.clientX - drag.x) * 0.006; pitch = Math.max(0.05, Math.min(1.1, drag.pitch + (e.clientY - drag.y) * 0.004));
    };
    T.up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; if (!ptr.size) drag = null; };
    T.cancel = T.up;
    T.wheel = e => { dist = Math.max(3, Math.min(10, dist + e.deltaY * 0.005)); };
    const keys = new Set();
    T.key = (code, down) => { if (down) keys.add(code); else keys.delete(code); };
    T.jump = () => { if (me.y <= 0.001) me.vy = 6.2; };
    T.emote = i => {
      if (i === 4) { me.stick = !me.stick; if (stickK) stickK.visible = me.stick; return; }
      me.emote = { kind: ["", "wave", "clap", "dance"][i], t0: performance.now(), dur: i === 3 ? 1600 : 1400 };
      for (const f of folk) if (!f.band && Math.hypot(f.x - me.x, f.z - me.z) < 5) f.copy = performance.now() + 300 + Math.random() * 500;
    };

    // ---------------------------------------------------------------- jam show
    let start = 0, live = false, ended = false, saidSet = new Set(), lastScr = 0, wasStage = false;
    T.sec = () => (Date.now() - start) / 1000;
    T.enter = o => {
      start = o.start; live = !!o.live; ended = false; saidSet = new Set(); T.title = o.name || K.BAND;
      buildKiko(); me.x = 0; me.z = 14; me.y = 0; me.vy = 0; me.dir = Math.PI; me.stick = false; yaw = 0; pitch = 0.4; dist = T.portrait ? 7.2 : 6.4; keys.clear(); T.input.x = T.input.y = 0;
      for (const s of K.MOMENTS) if (s.t < T.sec() - 1) saidSet.add(s.id);   // telat masuk: momen yang udah lewat nggak diumumin
      T.on = true; lastScr = 0; wasStage = false;
    };
    T.exit = () => { T.on = false; keys.clear(); };
    T.live = () => live;
    T.resize = (w, h) => { camera.aspect = w / h; T.portrait = w < h; camera.fov = T.portrait ? 64 : 52; camera.updateProjectionMatrix(); };
    // keramaian buat suara.js: ramai pas lagu, sepi di penutup
    T.crowd = () => { const A = K.at(T.sec()); return A.phase === "before" ? 0.35 : A.phase === "after" ? 0.2 : 0.25 + A.energy * 0.6; };

    // ---------------------------------------------------------------- layar besar
    function drawScreen(s, A, pal) {
      const w = scr.width, h = scr.height;
      sg.fillStyle = "#07060d"; sg.fillRect(0, 0, w, h);
      sg.textAlign = "center"; sg.textBaseline = "middle";
      const c0 = "#" + new THREE.Color(pal[0]).getHexString(), c1 = "#" + new THREE.Color(pal[1]).getHexString();
      if (A.phase === "before") {
        sg.fillStyle = "#c9c2ff"; sg.font = "700 46px Manrope, sans-serif"; sg.fillText(T.title, w / 2, 120);
        sg.fillStyle = "#fff"; sg.font = "800 150px Manrope, sans-serif"; sg.fillText(A.left > 99 ? K.clock(A.left) : String(Math.ceil(A.left)), w / 2, 280);
        sg.fillStyle = "#8f88b8"; sg.font = "600 34px Manrope, sans-serif"; sg.fillText(live ? "Riverside Park · Old Town · live" : "Riverside Park · rehearsal", w / 2, 430);
      } else if (A.phase === "after") {
        sg.fillStyle = "#fff"; sg.font = "800 72px Manrope, sans-serif"; sg.fillText("Thank you, Old Town!", w / 2, 230);
        sg.fillStyle = "#c9c2ff"; sg.font = "600 36px Manrope, sans-serif"; sg.fillText(T.title, w / 2, 330);
      } else if (s < 8) {
        sg.globalAlpha = Math.min(1, s / 6); sg.fillStyle = "#fff"; sg.font = "800 70px Manrope, sans-serif"; sg.fillText(T.title.toUpperCase(), w / 2, h / 2); sg.globalAlpha = 1;
      } else {
        const g = sg.createLinearGradient(0, 0, 0, h); g.addColorStop(0, c0); g.addColorStop(1, c1); sg.globalAlpha = 0.28 + 0.2 * (1 - A.beatK); sg.fillStyle = g; sg.fillRect(0, 0, w, h); sg.globalAlpha = 1;
        // equalizer
        const n = 32, bw = w / n;
        for (let i = 0; i < n; i++) {
          const v = Math.abs(Math.sin(i * 1.7 + A.beat * 0.9) * Math.cos(i * 0.4 + s * 2.1)) * A.energy * (0.55 + 0.45 * (1 - A.beatK));
          sg.fillStyle = i % 2 ? c0 : c1; sg.fillRect(i * bw + 4, h - 60 - v * 300, bw - 8, v * 300);
        }
        const big = A.moments.find(m => ["float", "fireworks", "rings", "lasers"].includes(m.id));
        sg.fillStyle = "#fff"; sg.font = "800 76px Manrope, sans-serif";
        sg.fillText(big ? { float: "WEIGHTLESS", fireworks: "FINALE", rings: "RINGS", lasers: "NEON RIVER" }[big.id] : A.act === "outro" ? "GOODNIGHT" : A.act === "rise" ? "LOOK UP" : T.title.toUpperCase(), w / 2, 150);
        sg.font = "600 30px Manrope, sans-serif"; sg.fillStyle = "rgba(255,255,255,.75)"; sg.fillText(A.name, w / 2, h - 28);
      }
      texL.needsUpdate = texR.needsUpdate = true;
    }

    // ---------------------------------------------------------------- tiap frame
    const m4 = new THREE.Matrix4(), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
    const cA = new THREE.Color(), cB = new THREE.Color(), cT = new THREE.Color();
    function blockAt(x, z) { return z < FIELD.z0 || z > FIELD.z1 || x < FIELD.x0 || x > FIELD.x1; }
    T.frame = (t, dt) => {
      const s = T.sec(), A = K.at(s), act = A.act || (A.phase === "before" ? "intro" : "outro"), pal = PAL[act];
      const mom = id => { const m = A.moments.find(x => x.id === id); return m ? m.k : -1; };
      const beatP = A.phase === "show" ? Math.pow(1 - A.beatK, 2.2) : 0;
      const lightsOn = A.phase === "show" && s >= 8;
      const reduce = !!env.reduce;
      // pengumuman momen besar
      for (const m of A.moments) if (!saidSet.has(m.id)) { saidSet.add(m.id); const def = K.MOMENTS.find(x => x.id === m.id); if (def.say && env.say) env.say(def.say); }
      if (A.phase === "after" && s > K.LEN + 3 && !ended) { ended = true; if (env.onEnd) env.onEnd(); }

      // langit: berubah warna mulai momen "sky", paling seru di finale
      const skyK = s >= 152 && s < 330 ? Math.min(1, (s - 152) / 20) : s >= 330 ? Math.max(0, 1 - (s - 330) / 25) : 0;
      skyU.top.value.copy(lin(0x0b0f24)).lerp(lin(act === "peak" ? 0x2a0b3a : 0x1a0b3a), skyK);
      skyU.bot.value.copy(lin(0x2a2140)).lerp(lin(act === "peak" ? 0xa83a3a : 0x7a2a6a), skyK);
      river.material.color.copy(skyU.bot.value).multiplyScalar(0.55);

      // lantai menyala: gelombang dari panggung ikut ketukan
      cA.copy(lin(pal[0])); cB.copy(lin(pal[1]));
      tileXZ.forEach(([x, z], i) => {
        let v;
        if (!lightsOn) v = A.phase === "before" ? 0.04 + 0.03 * Math.sin(t / 600 + x * 0.3) : 0.02;
        else { const d = Math.hypot(x, z + 2) * 0.09, p = ((A.beatK - d) % 1 + 1) % 1; v = 0.035 + (reduce ? 0.12 : 0.3) * Math.pow(1 - p, 4) * A.energy; }
        cT.copy(((x + z) | 0) % 2 ? cA : cB).multiplyScalar(v); tiles.setColorAt(i, cT);
      });
      tiles.instanceColor.needsUpdate = true;
      lip.material.color.copy(cA).multiplyScalar(lightsOn ? 0.5 + beatP : 0.15);
      front.color.copy(cA); front.intensity = lightsOn ? 0.8 + beatP * 0.9 * A.energy : 0.25;
      hemi.intensity = lightsOn ? 0.5 : 0.4;

      // layar (12x per detik), buka-tutup
      if (t - lastScr > 80) { lastScr = t; drawScreen(s, A, pal); }
      const open = s < 120 ? 0 : s < 126 ? (s - 120) / 6 : s < 178 ? 1 : s < 182 ? 1 - (s - 178) / 4 : 0;
      const ease = open * open * (3 - 2 * open);
      halfL.position.x = -4 - ease * 6.2; halfR.position.x = 4 + ease * 6.2;
      const stK = mom("stairs");
      stairs.forEach((st, i) => { st.visible = ease > 0.5 && (stK < 0 ? s >= 128 && s < 182 : stK * 1.6 > i / stairs.length); st.material.color.copy(lin(0xffe7a8)).multiplyScalar(0.6 + 0.6 * Math.max(0, Math.sin(t / 200 - i * 0.5))); });

      // lampu sorot
      beams.forEach((B, i) => {
        B.piv.visible = lightsOn;
        if (!lightsOn) return;
        const sp = reduce ? 0.3 : 1, a = s * 0.6 * sp + B.ph;
        B.piv.rotation.set(0.35 + Math.sin(a) * 0.35, 0, Math.cos(a * 0.8) * 0.5);
        B.m.color.copy(i % 2 ? cA : cB); B.m.opacity = 0.1 + 0.16 * A.energy + 0.08 * beatP;
      });
      // laser: momen laser dan finale
      const lz = mom("lasers") >= 0 || act === "peak";
      lasers.forEach((L, i) => { L.piv.visible = lz && !reduce; if (L.piv.visible) { const a = s * 1.4 + L.ph; L.piv.rotation.set(-0.12 - Math.abs(Math.sin(a)) * 0.25, (i < 4 ? 0.2 : -0.2) + Math.sin(a * 0.7) * 0.6, 0); } });
      // cincin
      const rk = mom("rings");
      rings.forEach((r, i) => { const k = rk < 0 ? -1 : ((rk * 6 - i * 0.35) % 1 + 1) % 1; r.visible = rk >= 0 && rk * 6 > i * 0.35; if (r.visible) { r.scale.setScalar(1 + k * 26); r.material.opacity = 0.8 * (1 - k); r.material.color.copy(i % 2 ? cA : cB); } });
      // kembang api: satu ledakan tiap ~1 detik selama finale
      const fk = mom("fireworks");
      if (fk >= 0) { const slot = Math.floor(s / 0.9), b = fwB[slot % FW]; if (b.slot !== slot) { const r = rng("fw:" + slot); b.slot = slot; b.t0 = s; b.c.copy(lin([0xff4fa3, 0x4fd1ff, 0xffd34f, 0xff6a3d, 0x8a6bff, 0xffffff][slot % 6])); const cx = (r() - 0.5) * 40, cy = 16 + r() * 14, cz = -12 - r() * 16; for (let k = 0; k < FWN; k++) { const j = fwB.indexOf(b) * FWN + k, u = r() * 2 - 1, a = r() * Math.PI * 2, sp = 5 + r() * 2.5; fwPos.set([cx, cy, cz], j * 3); fwVel.set([Math.sqrt(1 - u * u) * Math.cos(a) * sp, u * sp, Math.sqrt(1 - u * u) * Math.sin(a) * sp], j * 3); } } }
      fwB.forEach((b, bi) => {
        const age = s - b.t0, alive = age >= 0 && age < 2.2, f = alive ? Math.pow(1 - age / 2.2, 1.5) : 0;
        for (let k = 0; k < FWN; k++) {
          const j = (bi * FWN + k) * 3;
          if (alive) { fwVel[j + 1] -= 3.5 * dt; for (let a = 0; a < 3; a++) { fwVel[j + a] *= 1 - 0.9 * dt; fwPos[j + a] += fwVel[j + a] * dt; } }
          fwCol[j] = b.c.r * f; fwCol[j + 1] = b.c.g * f; fwCol[j + 2] = b.c.b * f;
        }
      });
      fwG.attributes.position.needsUpdate = fwG.attributes.color.needsUpdate = true;
      // confetti: jatuh pelan dari atas penonton
      const ck = Math.max(mom("confetti"), mom("confetti2"), mom("drop") >= 0 ? 0 : -1);
      conf.visible = ck >= 0;
      if (conf.visible) {
        const t0 = ck * 8;
        for (let i = 0; i < CN; i++) { const [vx, vy, d] = cVel[i], age = (t0 + d * 0.15) % 8; cPos[i * 3] = ((i * 7.31) % 24 - 12) + Math.sin(age * 2 + i) * 0.6 + vx * age; cPos[i * 3 + 1] = Math.max(0.02, 14 - age * vy * 1.6); cPos[i * 3 + 2] = FIELD.z0 + ((i * 3.77) % (FIELD.z1 - FIELD.z0)); }
        cG.attributes.position.needsUpdate = true;
      }
      // kilat putih waktu dentuman pertama
      const dk = mom("drop"); flash.material.opacity = dk >= 0 && !reduce ? Math.max(0, 0.7 * (1 - dk * 3)) : 0;

      // ---------------------------------------------------------------- Kiko jalan
      let ix = T.input.x, iy = T.input.y;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1; if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
      if (keys.has("KeyW") || keys.has("ArrowUp")) iy += 1; if (keys.has("KeyS") || keys.has("ArrowDown")) iy -= 1;
      const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const mx = (fx * iy + rx * ix) * 3.4 * dt, mz = (fz * iy + rz * ix) * 3.4 * dt;
      if (il > 0.08) {
        let nx = me.x + mx, nz = me.z + mz;
        if (blockAt(nx, me.z)) nx = me.x; if (blockAt(nx, nz)) nz = me.z;
        for (const f of folk) { if (f.band) continue; const dx = nx - f.x, dz = nz - f.z, d = Math.hypot(dx, dz); if (d < 0.62 && d > 0.001) { nx = f.x + dx / d * 0.62; nz = f.z + dz / d * 0.62; } }
        if (!blockAt(nx, nz)) { me.x = nx; me.z = nz; }
        let want = Math.atan2(mx, mz), d = want - me.dir; d = Math.atan2(Math.sin(d), Math.cos(d)); me.dir += d * Math.min(1, dt * 12);
        me.walk += dt * 11;
      }
      const g = (A.gravity || 1) * 16;
      me.vy -= g * dt; me.y = Math.max(0, me.y + me.vy * dt); if (me.y === 0) me.vy = Math.max(0, me.vy);
      kiko.position.set(me.x, me.y, me.z); kiko.rotation.y = me.dir;
      // gerak badan: jalan, joget di tempat ikut ketukan, emote
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
          if (me.stick && i === 1) { rzA = sx * 2.2 + Math.sin(s * Math.PI) * 0.4; }
          if (em && em.kind === "wave" && i === 1) rzA = sx * 2.4 + Math.sin(ek * 30) * 0.5;
          if (em && em.kind === "clap") { const c = Math.abs(Math.sin(ek * Math.PI * 7)); px = sx * (1.08 - 0.75 * c); py = 1.35; rzA = sx * 1.2; }
          a.rotation.z += (rzA - a.rotation.z) * 0.35; a.position.x += (px - a.position.x) * 0.4; a.position.y += (py - a.position.y) * 0.4;
        });
        if (stickK) { stickK.material.color.copy(cA).multiplyScalar(1.4); stickK.rotation.z = -0.5 + Math.sin(s * Math.PI) * 0.4; }
        if (KP.tail) KP.tail.rotation.z = Math.sin(t / 120) * (dance ? 0.25 : 0.08);
      }

      // ---------------------------------------------------------------- penonton dan band
      const fl = mom("float") >= 0 || (s >= 180 && s < 270);
      const hopBig = mom("drop") >= 0 || mom("fireworks") >= 0 || mom("lights") >= 0;
      const nowMs = performance.now();
      folk.forEach((f, i) => {
        let y = f.base || 0, tilt = 0, dir = f.dir;
        if (A.phase === "show" && s >= 8) {
          y += beatP * 0.22 * f.hop * Math.max(0.35, A.energy);
          if (hopBig && !f.band) y += Math.max(0, Math.sin((s * 2 + f.ph) * Math.PI)) * 0.5;
          if (fl && !f.band) y += 0.9 + 0.5 * Math.sin(s * 0.9 + f.ph);
          tilt = Math.sin(A.beat * Math.PI + f.ph) * 0.12;
        } else if (!f.band) { y += Math.max(0, Math.sin(t / 400 + f.ph)) * 0.04; tilt = Math.sin(t / 900 + f.ph) * 0.05; }
        if (f.copy && nowMs > f.copy - 300) { const k = (nowMs - f.copy + 300) / 900; if (k > 1) f.copy = 0; else y += Math.sin(Math.min(1, k) * Math.PI) * 0.6; }
        if (f.band === "voice") dir = Math.sin(s * 0.4) * 0.5;
        f.y = y;
        e3.set(0, dir, tilt); q.setFromEuler(e3); m4.compose(v3.set(f.x, y, f.z), q, sc.set(f.s, f.s, f.s));
        bodyI.setMatrixAt(i, mm.multiplyMatrices(m4, OFF.body));
        for (const k of [0, 1]) { earI.setMatrixAt(i * 2 + k, mm.multiplyMatrices(m4, OFF.ear[k])); eyeI.setMatrixAt(i * 2 + k, mm.multiplyMatrices(m4, OFF.eye[k])); }
        const stick = f.stick && (act === "song2" || act === "outro" || act === "peak") && A.phase === "show";
        if (stick) { mm.multiplyMatrices(m4, OFF.stick); e3.set(0, 0, -0.4 + Math.sin(s * Math.PI + f.ph) * 0.4); mm.multiply(new THREE.Matrix4().makeRotationFromEuler(e3)); stickI.setColorAt(i, cT.copy(i % 2 ? cA : cB).multiplyScalar(1.3)); }
        else mm.makeScale(0, 0, 0);
        stickI.setMatrixAt(i, mm);
      });
      for (const im of [bodyI, earI, eyeI, stickI]) im.instanceMatrix.needsUpdate = true;
      stickI.instanceColor.needsUpdate = true;

      // ---------------------------------------------------------------- kamera
      const camM = A.moments.find(m => m.cam && m.k < 0.6);
      const pull = camM && !reduce ? Math.sin(camM.k / 0.6 * Math.PI) : 0;
      look.set(me.x - Math.sin(yaw) * 2.2, me.y * 0.6 + kikoH * 1.5, me.z - Math.cos(yaw) * 2.2);
      tmp.copy(look).lerp(STAGE_LOOK, pull * 0.55);
      const d = dist + pull * 3, base = base3.set(me.x, me.y * 0.6 + kikoH, me.z);
      camPos.set(me.x + Math.sin(yaw) * Math.cos(pitch) * d, base.y + Math.sin(pitch) * d + pull * 1.5, me.z + Math.cos(yaw) * Math.cos(pitch) * d);
      camera.position.lerp(camPos, wasStage ? Math.min(1, dt * 8) : 1); wasStage = true;
      camera.lookAt(tmp);
      flash.position.set(0, 0, -0.2); flash.scale.setScalar(1);
    };
    T.state = () => { const s = T.sec(), A = K.at(s); return { s, A, live, title: T.title }; };
    return T;
  }

  globalThis.Konser3D = { create, FIELD };
})();

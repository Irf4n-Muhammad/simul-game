// ================================================================ v90: Kamar HD (desktop, dalam kamar panjang + kamar hangat)
// 1. Gambar pasca-proses sendiri (tanpa file tambahan): adegan digambar ke tekstur HDR, bagian terang "meluber" (bloom: lampu tali, lilin,
//    jendela, lampu berdiri), lalu ACES (sama dengan renderer biasa), color grading per jam, vinyet tipis, butir halus. Mati sendiri kalau
//    kualitas sudah diturunkan (qLevel, ui/03-scene.js) atau browser nggak bisa tekstur float.
// 2. Debu melayang di berkas sinar matahari siang (ikut terang sinar per jendela, W.sunO dari khFrame).
// 3. Parallax: kamera geser sedikit ikut mouse, pemandangan di jendela geser berlawanan (kerasa ada kedalaman).
// 4. Kamar tumbuh ikut fokus: tiap sesi fokus selesai = satu buku di atas rak (jatuh pelan + kilau), tanaman di ambang jendela makin
//    besar ikut streak hari fokus. Hitungan di browser ini (seperti sesi fokus itu sendiri). Klik buku / tanaman = makhluk bilang angkanya.
// Dipanggil dari: frame() di ui/29-town.js (hdRender), kpCam (hdDress, sekali per grup; KP.cam), kpFrame (hdFrame), kpExit (hdExit),
// focusEnd di ui/32-focus.js (hdFocusDone).
const HD = { rt: null, w: 0, h: 0, lv: [], ok: null, on: false, par: { x: 0, y: 0 }, fs: null, mats: null, t0: 0, drop: null };
const HD_FOC_KEY = SAVE_KEY + "-fokus-log";
// grading per jam: lift (warna bayangan), gain (warna terang), saturasi, kontras, kuat bloom
const HD_GRADE = {
  night: { lift: [0.012, 0.02, 0.04], gain: [1.04, 0.99, 0.9], sat: 1.06, con: 1.05, bloom: 0.9 },
  evening: { lift: [0.03, 0.015, 0.02], gain: [1.05, 0.98, 0.9], sat: 1.05, con: 1.03, bloom: 0.75 },
  morning: { lift: [0.03, 0.02, 0.01], gain: [1.04, 1.0, 0.92], sat: 1.02, con: 1.02, bloom: 0.45 },
  day: { lift: [0.02, 0.015, 0.01], gain: [1.03, 1.0, 0.94], sat: 1.03, con: 1.02, bloom: 0.35 },
};
const HD_VS = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
function hdMats() {
  const mk = (fs, u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: HD_VS, fragmentShader: fs, depthTest: false, depthWrite: false });
  return {
    bright: mk(`uniform sampler2D tD; uniform float exp0, thr, knee; varying vec2 vUv;
      void main() { vec3 c = texture2D(tD, vUv).rgb * exp0; float l = max(c.r, max(c.g, c.b)); float s = clamp(l - thr + knee, 0.0, 2.0 * knee); s = s * s / (4.0 * knee + 1e-4);
        gl_FragColor = vec4(c * max(s, l - thr) / max(l, 1e-4), 1.0); }`, { tD: { value: null }, exp0: { value: 1 }, thr: { value: 0.85 }, knee: { value: 0.45 } }),
    blur: mk(`uniform sampler2D tD; uniform vec2 dir; varying vec2 vUv;
      void main() { vec3 c = texture2D(tD, vUv).rgb * 0.227027;
        c += (texture2D(tD, vUv + dir * 1.3846).rgb + texture2D(tD, vUv - dir * 1.3846).rgb) * 0.3162162;
        c += (texture2D(tD, vUv + dir * 3.2308).rgb + texture2D(tD, vUv - dir * 3.2308).rgb) * 0.0702703; gl_FragColor = vec4(c, 1.0); }`, { tD: { value: null }, dir: { value: new THREE.Vector2() } }),
    comp: mk(`uniform sampler2D tD, b1, b2, b3; uniform float exp0, bloom, sat, con, vig, grain, time; uniform vec3 lift, gain; uniform vec2 res; varying vec2 vUv;
      vec3 fit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 aces(vec3 c) { const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
        const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
        return clamp(O * fit(I * (c / 0.6)), 0.0, 1.0); }
      vec3 srgb(vec3 c) { return mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() { vec4 s = texture2D(tD, vUv);
        vec3 c = s.rgb * exp0 + (texture2D(b1, vUv).rgb * 0.6 + texture2D(b2, vUv).rgb * 0.8 + texture2D(b3, vUv).rgb * 1.0) * bloom;
        c = srgb(aces(c));
        c = c * gain + lift * (1.0 - c);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat); c = (c - 0.5) * con + 0.5;
        vec2 q = (vUv - 0.5) * vec2(res.x / res.y, 1.0); c *= 1.0 - vig * smoothstep(0.45, 1.1, length(q));
        c += (hash(vUv * res + fract(time) * 91.7) - 0.5) * grain;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), max(s.a, 0.0)); }`,
    { tD: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, exp0: { value: 1 }, bloom: { value: 0.8 }, sat: { value: 1 }, con: { value: 1 }, vig: { value: 0.28 }, grain: { value: 0.018 }, time: { value: 0 },
      lift: { value: new THREE.Vector3() }, gain: { value: new THREE.Vector3(1, 1, 1) }, res: { value: new THREE.Vector2(1, 1) } }),
  };
}
// bisa tekstur HDR? (WebGL2 + EXT_color_buffer_float/half_float). Kalau nggak, HD mati: tanpa HDR bloom-nya belang.
function hdSupported() {
  if (HD.ok !== null) return HD.ok;
  const e = renderer.extensions, c = renderer.capabilities;
  HD.ok = !!(c.isWebGL2 && (e.has("EXT_color_buffer_float") || e.has("EXT_color_buffer_half_float")));
  return HD.ok;
}
function hdSize() {
  const v = renderer.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(1, v.x), h = Math.max(1, v.y);
  if (HD.rt && HD.w === w && HD.h === h) return;
  HD.w = w; HD.h = h;
  if (HD.rt) { HD.rt.dispose(); HD.lv.forEach(L => { L[0].dispose(); L[1].dispose(); }); }
  const opt = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  HD.rt = new THREE.WebGLMultisampleRenderTarget(w, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat }); HD.rt.samples = 4;
  HD.lv = [2, 4, 8].map(d => [new THREE.WebGLRenderTarget(Math.ceil(w / d), Math.ceil(h / d), opt), new THREE.WebGLRenderTarget(Math.ceil(w / d), Math.ceil(h / d), opt)]);
}
const hdWanted = () => kamarOn() && !HD.off && qLevel < 2 && hdSupported();
// dipanggil frame(): true = sudah digambar (lewat jalur HD), false = gambar biasa saja
function hdRender() {
  if (!hdWanted()) { if (HD.on) hdExit(); return false; }
  if (!HD.on) { HD.on = true; renderer.toneMapping = THREE.NoToneMapping; }
  if (!HD.mats) { HD.mats = hdMats(); HD.fs = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), HD.mats.comp); HD.fs.frustumCulled = false; HD.scene = new THREE.Scene(); HD.scene.add(HD.fs); HD.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); }
  hdSize();
  const M = HD.mats, G = HD_GRADE[litName] || HD_GRADE.day, ex = renderer.toneMappingExposure, pass = (mat, target) => { HD.fs.material = mat; renderer.setRenderTarget(target); renderer.render(HD.scene, HD.cam); };
  renderer.setRenderTarget(HD.rt); renderer.render(scene, camera);
  M.bright.uniforms.tD.value = HD.rt.texture; M.bright.uniforms.exp0.value = ex; pass(M.bright, HD.lv[0][0]);
  let src = HD.lv[0][0];
  HD.lv.forEach((L, i) => {
    const tw = L[0].width, th = L[0].height;
    if (i > 0) { M.blur.uniforms.tD.value = src.texture; M.blur.uniforms.dir.value.set(0, 0); pass(M.blur, L[0]); }
    M.blur.uniforms.tD.value = L[0].texture; M.blur.uniforms.dir.value.set(1 / tw, 0); pass(M.blur, L[1]);
    M.blur.uniforms.tD.value = L[1].texture; M.blur.uniforms.dir.value.set(0, 1 / th); pass(M.blur, L[0]);
    src = L[0];
  });
  const U = M.comp.uniforms, fl = typeof KH !== "undefined" ? KH.flash : 0;
  U.tD.value = HD.rt.texture; U.b1.value = HD.lv[0][0].texture; U.b2.value = HD.lv[1][0].texture; U.b3.value = HD.lv[2][0].texture;
  U.exp0.value = ex; U.bloom.value = G.bloom + fl * 0.6; U.sat.value = G.sat; U.con.value = G.con; U.lift.value.set(...G.lift); U.gain.value.set(...G.gain);
  U.res.value.set(HD.w, HD.h); U.time.value = reduce ? 0 : now() / 1000; U.grain.value = reduce ? 0 : 0.018;
  pass(M.comp, null);
  return true;
}
function hdExit() {
  if (HD.on) { HD.on = false; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setRenderTarget(null); }
  HD.par.x = HD.par.y = 0;
}

// ---- isi tambahan per grup ruangan: debu di berkas sinar, buku hasil fokus, tanaman streak (dipanggil kpCam sesudah khDress)
function hdDress(r) {
  const G = r.g, GP = G.position, H = G.userData.kh; if (!H) return;
  for (const W of H.wins) {
    const b = new THREE.Box3().setFromObject(W.sky), n = 70, pos = new Float32Array(n * 3), seed = [];
    for (let i = 0; i < n; i++) seed.push({ t: Math.random(), u: Math.random(), d: (Math.random() - 0.5) * 0.7, ph: Math.random() * 7, sp: 0.008 + Math.random() * 0.02 });
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: khSteamTex, color: 0xffe2b0, size: 0.075, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; G.add(pts);
    const zw = b.max.z + 0.1 - GP.z, xc = W.x - GP.x;
    W.dust = { pts, seed, top: [xc, b.max.y - 0.1, zw], bot: [xc + 0.35, 0.03, zw + 2.3], ww: W.ww };
    // pemandangan jendela sedikit lebih besar dari kacanya, jadi bisa digeser (parallax)
    W.tex.repeat.set(0.9, 0.9); W.tex.offset.set(0.05, 0.05);
  }
  // titik buku: atas rak buku; titik tanaman: ambang jendela pertama
  let shelf = null; G.traverse(o => { if (!shelf && o.userData.item && o.userData.item[0] === "bookshelf") shelf = o; });
  if (shelf) { const b = new THREE.Box3().setFromObject(shelf); H.bookAt = { x: (b.min.x + b.max.x) / 2 - GP.x, y: b.max.y, z: (b.min.z + b.max.z) / 2 - GP.z, w: b.max.x - b.min.x }; }
  if (H.wins[0]) { const b = new THREE.Box3().setFromObject(H.wins[0].sky); H.plantAt = { x: H.wins[0].x - 0.32 - GP.x, y: b.min.y - 0.08, z: b.max.z + 0.07 - GP.z }; }
  H.grow = new THREE.Group(); G.add(H.grow);
  hdGrow(H);
}
// catatan fokus: { n: jumlah sesi selesai, days: ["2026-11-14", ...] } (hari lokal, 60 terakhir)
function hdLog() { try { const L = JSON.parse(localStorage.getItem(HD_FOC_KEY)); if (L && typeof L.n === "number") return L; } catch (e) { /* rusak: mulai lagi */ } return { n: 0, days: [] }; }
const hdDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function hdStreak(L) {
  const set = new Set(L.days), d = new Date(); let n = 0;
  if (!set.has(hdDay(d))) d.setDate(d.getDate() - 1);   // belum fokus hari ini: streak sampai kemarin masih dihitung
  while (set.has(hdDay(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const HD_BOOK = [0x5f7fa8, 0xb86f52, 0x8fa287, 0xd9b45a, 0x8a6aa0, 0xc96f6f, 0x6d7790, 0xe0a07a];
function hdGrow(H, fresh) {
  if (!H || !H.grow) return;
  for (const c of [...H.grow.children]) H.grow.remove(c);
  H.clicks = H.clicks.filter(c => !c.hd);
  const L = hdLog(), streak = hdStreak(L);
  if (H.bookAt) {
    const A = H.bookAt, n = Math.min(L.n, 24), per = 12, bw = Math.min(0.4, A.w * 0.42);
    for (let i = 0; i < n; i++) {
      const s = Math.floor(i / per), k = i % per, rnd = Math.sin(i * 12.9898) * 43758.5453 % 1;
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw * (0.85 + Math.abs(rnd) * 0.15), 0.055, 0.26), new THREE.MeshStandardMaterial({ color: HD_BOOK[i % HD_BOOK.length], roughness: 0.75 }));
      m.position.set(A.x + (s ? 1 : -1) * A.w * 0.24, A.y + 0.03 + k * 0.057, A.z); m.rotation.y = rnd * 0.25; m.castShadow = true;
      H.grow.add(m); H.clicks.push({ o: m, fn: hdBookClick, hd: true });
      if (fresh && i === n - 1) HD.drop = { m, y: m.position.y, t0: now() };
    }
  }
  if (H.plantAt) {
    const A = H.plantAt, s = 0.16 + 0.05 * Math.min(streak, 6), p = plant(H.grow, A.x, A.z, s, 0xe9dfcf, streak >= 3 ? 0x6f9a5e : 0x8fa77a);
    p.position.y = A.y; p.traverse(o => { if (o.isMesh) H.clicks.push({ o, fn: hdPlantClick, hd: true }); });
    H.plant = p;
  }
  H.grow.traverse(envScale);   // pantulan ruangan ikut redup seperti barang lain (tanpa ini buku baru kelihatan bercahaya)
}
function hdBookClick() { const n = hdLog().n; if (!bubble) say(n === 1 ? "Our first focus session!" : `${n} focus sessions together!`, 2200); play("wiggle", 600); return true; }
function hdPlantClick() { const s = hdStreak(hdLog()); if (!bubble) say(s ? `${s}-day focus streak. It's growing!` : "It grows when we focus every day.", 2400); return true; }
// sesi fokus selesai (focusEnd "selesai"): catat, dan kalau lagi di kamar, buku baru jatuh ke rak + kilau
function hdFocusDone() {
  const L = hdLog(); L.n++; const d = hdDay(); if (!L.days.includes(d)) L.days.push(d); L.days = L.days.slice(-60);
  try { localStorage.setItem(HD_FOC_KEY, JSON.stringify(L)); } catch (e) { /* tanpa simpanan: tetap jalan */ }
  if (kamarOn()) { const H = khH(); hdGrow(H, true); play("jump", 700); setTimeout(() => { if (!bubble) say("One more book!", 2000); }, 600); }
}
function hdSparkle(p) {
  const s = screenOf(p);
  for (let i = 0; i < 7; i++) {
    const el = document.createElement("div"); el.className = "particle"; el.textContent = "✦";
    Object.assign(el.style, { left: s.x + (Math.random() - 0.5) * 50 + "px", top: s.y + "px", color: "#FFD27A", fontSize: 14 + Math.random() * 10 + "px", animationDelay: i * 0.05 + "s" });
    el.style.setProperty("--dx", (Math.random() - 0.5) * 90 + "px"); floats.appendChild(el); setTimeout(() => el.remove(), 1700);
  }
}

// ---- tiap frame (dari kpFrame, sesudah khFrame)
function hdFrame(t, dt, ts) {
  const H = khH(); if (!H) return;
  // parallax: geser pelan ke arah kursor, balik ke tengah kalau mouse lama diam
  const idleM = now() - KP.moveT > 8000, tx = reduce || idleM ? 0 : lookX, ty = reduce || idleM ? 0 : lookY, k = Math.min(1, dt * 1.8);
  HD.par.x += (tx - HD.par.x) * k; HD.par.y += (ty - HD.par.y) * k;
  if (KP.cam) {
    const C = KP.cam, px = HD.par.x, py = HD.par.y;
    camera.position.set(C.p.x + px * 0.55, C.p.y - py * 0.22, C.p.z);
    camera.lookAt(C.l.x + px * 0.12, C.l.y - py * 0.05, C.l.z);
  }
  for (const W of H.wins) {
    W.tex.offset.set(0.05 - HD.par.x * 0.045, 0.05 + HD.par.y * 0.03);
    const D = W.dust; if (!D) continue;
    const o = Math.min(1, (W.sunO || 0) * 1.4); D.pts.material.opacity = o; D.pts.visible = o > 0.02;
    if (!D.pts.visible) continue;
    const a = D.pts.geometry.attributes.position, A = D.top, B = D.bot;
    D.seed.forEach((s, i) => {
      if (!reduce) { s.t += s.sp * dt * 0.6; if (s.t > 1) s.t -= 1; }
      const q = s.t, x0 = A[0] + (B[0] - A[0]) * q, y = A[1] + (B[1] - A[1]) * q, z = A[2] + (B[2] - A[2]) * q;
      a.setXYZ(i, x0 + (s.u - 0.5) * D.ww + Math.sin(ts * 0.4 + s.ph) * 0.05, y + Math.sin(ts * 0.3 + s.ph * 2) * 0.06, z + s.d);
    });
    a.needsUpdate = true;
  }
  // buku baru: jatuh dari atas, mantul kecil, kilau
  if (HD.drop) {
    const D = HD.drop, p = Math.min(1, (t - D.t0) / 650), bounce = p < 0.7 ? 1 - Math.pow(p / 0.7, 2) : Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.12;
    D.m.position.y = D.y + bounce * 0.7;
    if (p >= 1) { const w = new THREE.Vector3(); D.m.getWorldPosition(w); hdSparkle(w); if (SND) SND.click(); HD.drop = null; }
  }
}

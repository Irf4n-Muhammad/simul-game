// Globe (v73): lapisan paling luar tampilan luar. Bumi fiksi 5 benua (bumi.js) yang bisa diputer dan di-zoom.
// Zoom terus ke kota yang hidup (Old Town) = masuk peta kota (town.js); dari peta kota zoom keluar = balik ke sini.
// Tekstur bumi dilukis sekali dari bentuk daratan bumi.js (sama buat semua pemain), awan muter pelan.
"use strict";
(function () {
  const RAD = Math.PI / 180;
  const FAR = 4.6, NEAR = 1.22, ENTER = 1.32;   // jarak kamera dari pusat (radius bumi = 1); di bawah ENTER dekat kota hidup = masuk kota

  function create(env) {
    const { THREE } = env;
    const B = globalThis.Bumi;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x121a2b);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
    scene.add(new THREE.HemisphereLight(0xf4f1ff, 0x403850, 0.75));
    const key = new THREE.DirectionalLight(0xfff1dc, 1.25); key.position.set(-2.5, 2, 3); scene.add(key);
    const G = new THREE.Group(); scene.add(G);
    const T = { on: false, scene, camera };
    let painted = false, earth = null, clouds = null;
    const pins = [], conts = [];
    let lat0 = 24, lon0 = -6, dist = 2.9;                 // pusat pandangan dan jarak kamera
    let goal = null;                                       // terbang otomatis { lat, lon, dist, then }
    let vLon = 0, vLat = 0, idleAt = 0, entering = false;

    // ---------------------------------------------------------------- lukis bumi (sekali)
    function hex(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
    function paint() {
      // tinggi daratan dihitung di grid kasar (mahal), warnanya digambar di kanvas 2x lebih tajam pakai interpolasi + bayangan bukit
      const GW = 1024, GH = 512, HF = new Float32Array(GW * GH), CI = new Int8Array(GW * GH);
      for (let y = 0; y < GH; y++) {
        const lat = 90 - (y + 0.5) * 180 / GH;
        for (let x = 0; x < GW; x++) { const L = B.landAt(lat, -180 + (x + 0.5) * 360 / GW), i = y * GW + x; HF[i] = L.h; CI[i] = L.cont ? B.CONTINENTS.indexOf(L.cont) : (L.h > -0.6 && L.near ? B.CONTINENTS.indexOf(L.near) : -1); }
      }
      const at = (fx, fy) => {   // bilinear, wrap di bujur
        const x0 = Math.floor(fx), y0 = Math.max(0, Math.min(GH - 2, Math.floor(fy))), tx = fx - x0, ty = Math.max(0, Math.min(1, fy - y0));
        const a = (xx, yy) => HF[yy * GW + ((xx % GW) + GW) % GW];
        return (a(x0, y0) * (1 - tx) + a(x0 + 1, y0) * tx) * (1 - ty) + (a(x0, y0 + 1) * (1 - tx) + a(x0 + 1, y0 + 1) * tx) * ty;
      };
      const W = 2048, H = 1024, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d"), img = ctx.createImageData(W, H), px = img.data;
      const deep = hex(0x2c6390), shallow = hex(0x6fbfd3), beach = hex(0xe6d7a8), LO = B.CONTINENTS.map(c => hex(c.land)), HI = B.CONTINENTS.map(c => hex(c.high));
      for (let y = 0; y < H; y++) {
        const lat = 90 - (y + 0.5) * 180 / H, fy = (y + 0.5) * GH / H - 0.5;
        for (let x = 0; x < W; x++) {
          const fx = (x + 0.5) * GW / W - 0.5, h = at(fx, fy), i = (y * W + x) * 4;
          const ci = CI[Math.max(0, Math.min(GH - 1, Math.round(fy))) * GW + ((Math.round(fx) % GW) + GW) % GW];
          let c;
          if (h > 0 && ci >= 0) {
            const k = Math.max(0, Math.min(1, h * 1.4)), lo = LO[ci], hi = HI[ci];
            const sh = (at(fx + 1, fy - 1) - at(fx - 1, fy + 1)) * 9;   // cahaya dari kiri atas
            c = lo.map((v, j) => (v + (hi[j] - v) * k) * (1 + Math.max(-0.18, Math.min(0.18, sh))));
            if (h < 0.035) c = c.map((v, j) => v + (beach[j] - v) * (1 - h / 0.035) * 0.75);
          } else {
            const k = Math.max(0, Math.min(1, -h * 1.6));
            c = shallow.map((v, j) => v + (deep[j] - v) * Math.sqrt(k));
          }
          const pole = Math.max(0, Math.abs(lat) - 74) / 16;    // es kutub tipis
          if (pole > 0) c = c.map(v => v + (240 - v) * Math.min(1, pole * 1.4));
          px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
      earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 }));
      // SphereGeometry: u = 0 di lon -180 dan nempel ke -x; diputer biar lon 0 ngadep +z (sama dengan Bumi.toXYZ)
      earth.rotation.y = -Math.PI / 2;
      G.add(earth);
      // awan
      const cc = document.createElement("canvas"); cc.width = 512; cc.height = 256;
      const c2 = cc.getContext("2d"), ci = c2.createImageData(512, 256), cp = ci.data;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) {
        const lat = 90 - (y + 0.5) * 180 / 256, lon = -180 + (x + 0.5) * 360 / 512, p = B.toXYZ(lat, lon, 4);
        const n = B.fbm(p.x, p.y + 3, p.z, 77), a = Math.max(0, (n - 0.56) * 4.2), i = (y * 512 + x) * 4;
        cp[i] = cp[i + 1] = cp[i + 2] = 255; cp[i + 3] = Math.min(220, a * 255);
      }
      c2.putImageData(ci, 0, 0);
      const ct = new THREE.CanvasTexture(cc); ct.encoding = THREE.sRGBEncoding;
      clouds = new THREE.Mesh(new THREE.SphereGeometry(1.018, 64, 48), new THREE.MeshLambertMaterial({ map: ct, transparent: true, depthWrite: false, opacity: 0.6 }));
      clouds.rotation.y = -Math.PI / 2; G.add(clouds);
      // cahaya tipis di tepi bumi
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: env.canvasTex((g, w, h) => {
        const gr = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w / 2);
        gr.addColorStop(0, "rgba(160,210,255,0.55)"); gr.addColorStop(0.18, "rgba(160,210,255,0.28)"); gr.addColorStop(1, "rgba(160,210,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }, 256, 256), depthWrite: false, transparent: true }));
      glow.scale.set(3.05, 3.05, 1); glow.renderOrder = -1; scene.add(glow);
      // bintang
      const sp = [], rs = B.fbm;
      for (let k = 0; k < 900; k++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 40; sp.push(r * Math.sqrt(1 - u * u) * Math.cos(a), r * u, r * Math.sqrt(1 - u * u) * Math.sin(a)); }
      void rs;
      const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.75 })));
      // kota dan nama benua
      for (const C of B.CITIES) {
        const p = B.toXYZ(C.lat, C.lon, 1.0), g = new THREE.Group(); g.position.set(p.x, p.y, p.z);
        g.lookAt(p.x * 2, p.y * 2, p.z * 2);
        const col = C.live ? 0xe0784f : 0xb9b2a8;
        const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 20), env.F(col)); dot.rotation.x = Math.PI / 2; g.add(dot);
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.05, 6), env.F(col)); stick.rotation.x = Math.PI / 2; stick.position.z = 0.025; g.add(stick);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.011, 14, 10), env.F(col)); head.position.z = 0.052; g.add(head);
        let ring = null;
        if (C.live) { ring = new THREE.Mesh(new THREE.RingGeometry(0.016, 0.022, 32), env.F(col, { transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); ring.position.z = 0.004; g.add(ring); }
        const lbl = tag(C.name, C.live ? "Your home" : "Coming soon", C.live);
        lbl.position.set(p.x * 1.11, p.y * 1.11, p.z * 1.11); G.add(lbl);
        G.add(g); pins.push({ C, g, ring, lbl, head });
      }
      for (const C of B.CONTINENTS) {
        const p = B.toXYZ(C.lat + (C.id === "meridia" ? 9 : 4), C.lon, 1.03), s = word(C.name.toUpperCase());
        s.position.set(p.x, p.y, p.z); G.add(s); conts.push({ C, s, p });
      }
      painted = true;
    }
    function tag(text, sub, accent) {
      const tex = env.canvasTex((c, w, h) => {
        c.fillStyle = accent ? "rgba(255,248,240,0.96)" : "rgba(255,255,255,0.86)";
        const r = 44; c.beginPath(); c.moveTo(r, 4); c.arcTo(w - 4, 4, w - 4, h - 4, r); c.arcTo(w - 4, h - 4, 4, h - 4, r); c.arcTo(4, h - 4, 4, 4, r); c.arcTo(4, 4, w - 4, 4, r); c.fill();
        c.textAlign = "center"; c.fillStyle = accent ? "#B35A36" : "#4B453F"; c.font = "800 40px Manrope, sans-serif"; c.fillText(text, w / 2, 50);
        c.fillStyle = "#7A7168"; c.font = "600 24px Manrope, sans-serif"; c.fillText(sub, w / 2, 80);
      }, 320, 96);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
      s.scale.set(0.2, 0.06, 1); s.renderOrder = 5; return s;
    }
    function word(text) {
      const tex = env.canvasTex((c, w, h) => {
        c.textAlign = "center"; c.font = "800 54px Manrope, sans-serif";
        c.lineWidth = 8; c.strokeStyle = "rgba(30,40,50,0.35)"; c.strokeText(text.split("").join(" "), w / 2, 66);
        c.fillStyle = "rgba(255,255,255,0.95)"; c.fillText(text.split("").join(" "), w / 2, 66);
      }, 512, 96);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
      s.scale.set(0.42, 0.079, 1); s.renderOrder = 4; return s;
    }

    // ---------------------------------------------------------------- kamera
    const wrap = a => ((a + 540) % 360) - 180;
    function place() {
      G.rotation.set(lat0 * RAD, -lon0 * RAD, 0, "XYZ");
      const fit = 1 / Math.min(1, camera.aspect);   // HP tegak: mundur biar bumi muat selebar layar
      camera.position.set(0, 0, 1 + (dist - 1) * fit); camera.lookAt(0, 0, 0);
      const zk = (dist - NEAR) / (FAR - NEAR);   // label ikut ukuran layar
      for (const P of pins) { const k = 0.55 + zk * 0.75; P.lbl.scale.set(0.2 * k, 0.06 * k, 1); P.g.scale.setScalar(0.6 + zk * 0.9); }
      for (const C of conts) { const k = 0.5 + zk * 0.8; C.s.scale.set(0.42 * k, 0.079 * k, 1); }
    }
    function home() { return B.CITIES.find(c => c.id === B.HOME_CITY); }
    T.flyTo = (lat, lon, d, then) => { goal = { lat, lon: lon0 + wrap(lon - lon0), dist: d, then }; vLon = vLat = 0; };

    // ---------------------------------------------------------------- input: geser = puter, cubit/scroll = zoom, ketuk = pilih
    const ptr = new Map(); let drag = null, moved = 0, pinch = null;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    T.down = e => {
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      goal = null; idleAt = performance.now() + 6000;
      if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist }; drag = null; moved = 99; return; }
      drag = { x: e.clientX, y: e.clientY, lat: lat0, lon: lon0, t: performance.now() }; moved = 0; vLon = vLat = 0;
    };
    T.move = e => {
      if (!ptr.has(e.pointerId)) return;
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptr.size >= 2) { const [a, b] = [...ptr.values()]; zoomTo(pinch.dist * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y))); return; }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.hypot(dx, dy));
      const k = 70 * (dist - 0.9) / env.canvas.clientHeight;    // makin dekat makin pelan
      const nl = Math.max(-70, Math.min(70, drag.lat + dy * k)), nn = drag.lon - dx * k / Math.max(0.3, Math.cos(lat0 * RAD));
      const now = performance.now(), dt = Math.max(16, now - (drag.lt || drag.t)) / 1000;
      vLat = (nl - lat0) / dt; vLon = (nn - lon0) / dt; drag.lt = now;
      lat0 = nl; lon0 = nn;
    };
    T.up = e => {
      const wasTap = drag && moved < 8 && ptr.size === 1;
      ptr.delete(e.pointerId);
      if (ptr.size < 2) pinch = null;
      if (wasTap) tap(e);
      if (!wasTap && drag && performance.now() - (drag.lt || 0) > 90) vLat = vLon = 0;   // diam dulu sebelum lepas = nggak muter terus
      if (!wasTap) checkEnter();
      drag = null;
    };
    T.cancel = e => { ptr.delete(e.pointerId); pinch = null; drag = null; };
    T.wheel = e => { goal = null; zoomTo(dist * Math.exp(e.deltaY * 0.0016)); checkEnter(); };
    T.zoomBy = f => { goal = { lat: lat0, lon: lon0, dist: Math.max(NEAR, Math.min(FAR, dist * f)), then: checkEnter }; };
    function zoomTo(d) { dist = Math.max(NEAR, Math.min(FAR, d)); idleAt = performance.now() + 6000; }
    // zoom sampai dekat di atas kota hidup = masuk kota
    function checkEnter() {
      if (entering || !T.on) return;
      const H = home();
      if (dist <= ENTER && B.angDist(lat0, lon0, H.lat, H.lon) < 14) { entering = true; env.enterCity(H); }
      else if (dist <= ENTER + 0.02) { const C = B.contAt(lat0, lon0); if (C && !C.live && env.soonHint) env.soonHint(C); }
    }
    function tap(e) {
      const r = env.canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      // pin kota dulu (ketuk agak meleset tetap kena)
      let best = null;
      for (const P of pins) {
        const w = new THREE.Vector3(); P.head.getWorldPosition(w);
        if (w.clone().normalize().dot(camera.position.clone().normalize()) < 0.15) continue;
        const s = w.clone().project(camera), sx = (s.x + 1) / 2 * r.width, sy = (1 - s.y) / 2 * r.height;
        const d = Math.hypot(sx - (e.clientX - r.left), sy - (e.clientY - r.top));
        if (d < 34 && (!best || d < best.d)) best = { d, P };
        const l = P.lbl.position.clone().applyMatrix4(G.matrixWorld).project(camera), lx = (l.x + 1) / 2 * r.width, ly = (1 - l.y) / 2 * r.height;
        const dl = Math.hypot(lx - (e.clientX - r.left), ly - (e.clientY - r.top));
        if (dl < 40 && (!best || dl < best.d)) best = { d: dl, P };
      }
      if (best) return env.showCity(best.P.C);
      const hit = earth && ray.intersectObject(earth)[0];
      if (!hit) return;
      const p = G.worldToLocal(hit.point.clone()).normalize();
      const lat = Math.asin(p.y) / RAD, lon = Math.atan2(p.x, p.z) / RAD, C = B.contAt(lat, lon);
      if (C) env.showContinent(C);
    }
    T.goHome = () => { const H = home(); T.flyTo(H.lat, H.lon, 1.3, checkEnter); };
    T.goContinent = C => T.flyTo(C.lat, C.lon, 1.9);
    T.resize = (w, h) => { camera.aspect = w / h; camera.updateProjectionMatrix(); };
    T.where = () => {
      const C = B.contAt(lat0, lon0);
      return dist > 3.0 ? "The world" : C ? C.name : "Open sea";
    };
    // masuk dari rumah: bumi muter ke kota kita. back = balik dari peta kota (mulai dekat kota)
    T.enter = (opt = {}) => {
      if (!painted) paint();
      const H = home();
      entering = false; ptr.clear(); drag = pinch = null;
      if (opt.back) { lat0 = H.lat; lon0 = H.lon; dist = ENTER + 0.12; goal = { lat: H.lat - 4, lon: H.lon + 10, dist: 2.6 }; }
      else { lat0 = H.lat - 10; lon0 = H.lon + 70; dist = FAR; goal = { lat: H.lat - 6, lon: H.lon + 8, dist: 3.3 }; }
      idleAt = performance.now() + 9000;
      T.on = true; place();
    };
    T.exit = () => { T.on = false; };
    T.frame = (t, dt) => {
      if (goal) {
        const k = 1 - Math.pow(0.03, dt);
        lat0 += (goal.lat - lat0) * k; lon0 += (goal.lon - lon0) * k; dist += (goal.dist - dist) * k;
        if (Math.abs(goal.lat - lat0) < 0.05 && Math.abs(goal.lon - lon0) < 0.05 && Math.abs(goal.dist - dist) < 0.01) { const th = goal.then; goal = null; if (th) th(); }
      } else if (!drag && !pinch) {
        if (Math.abs(vLon) + Math.abs(vLat) > 0.5) { lon0 += vLon * dt; lat0 = Math.max(-70, Math.min(70, lat0 + vLat * dt)); const f = Math.pow(0.08, dt); vLon *= f; vLat *= f; }
        else if (t > idleAt && dist > 2.8 && !env.reduce) lon0 += dt * 2.2;   // diam lama: bumi muter pelan
      }
      if (clouds) clouds.rotation.y = -Math.PI / 2 + t / 90000;
      for (const P of pins) if (P.ring) { const s = 1 + ((t / 1400) % 1) * 1.6; P.ring.scale.setScalar(s); P.ring.material.opacity = 0.8 * (1 - (t / 1400) % 1); }
      // nama benua cuma kelihatan di sisi depan
      const cam = camera.position.clone().normalize();
      for (const C of conts) { const w = C.s.position.clone().applyMatrix4(G.matrixWorld).normalize(); C.s.material.opacity = Math.max(0, Math.min(1, (w.dot(cam) - 0.25) * 3)) * (dist > 1.6 ? 1 : 0.4); }
      for (const P of pins) { const w = P.lbl.position.clone().applyMatrix4(G.matrixWorld).normalize(); P.lbl.material.opacity = Math.max(0, Math.min(1, (w.dot(cam) - 0.3) * 4)); }
      place();
    };
    T.state = () => ({ lat: lat0, lon: lon0, dist });
    return T;
  }
  globalThis.Globe = { create };
})();

// ================================================================ Tata Rumah: model perabot (perabot.js) + palet cat
// Model dibangun di titik nol menghadap +z (punggung ke -z); denah (ui/03c-denah.js) yang menaruh dan memutarnya.
// Tahap 2: barang yang dulu ditempel langsung di ruangan (konter, kulkas, rak tinggi, handuk, bebek) jadi model biasa di sini.
const PB_TOY = [0xb86f52, 0x8fa287, 0x7e9cb3, 0xd9b36c];
const pbBrass = () => M(brass, { metalness: 0.8, roughness: 0.3 });
const pbFlat = m => { m.castShadow = false; return m; };
// lukisan dinding: gambar kanvas 128x128
const PB_ART = {
  art_kitchen: c => { c.fillStyle = "#C8674F"; c.beginPath(); c.arc(64, 72, 30, 0, 7); c.fill(); c.fillStyle = "#7D9470"; c.fillRect(60, 22, 8, 22); },
  art_bedroom: c => { c.fillStyle = "#6D7790"; c.fillRect(0, 70, 128, 58); c.fillStyle = "#D9B36C"; c.beginPath(); c.arc(84, 50, 16, 0, 7); c.fill(); c.fillStyle = "#8FA287"; c.beginPath(); c.moveTo(0, 90); c.lineTo(40, 55); c.lineTo(80, 90); c.fill(); },
  art_playroom: c => { c.fillStyle = "#D9B36C"; c.beginPath(); c.arc(40, 40, 16, 0, 7); c.fill(); c.fillStyle = "#8FA287"; c.fillRect(0, 96, 128, 32); c.fillStyle = "#B86F52"; c.fillRect(54, 62, 30, 34); c.beginPath(); c.moveTo(48, 62); c.lineTo(69, 44); c.lineTo(90, 62); c.fill(); },
  art_sun: c => { const g = c.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, "#F2C38B"); g.addColorStop(1, "#E9A27C"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); c.fillStyle = "#D9623B"; c.beginPath(); c.arc(64, 84, 30, Math.PI, 0); c.fill(); c.fillStyle = "#B86F52"; c.fillRect(0, 84, 128, 44); },
  art_mountain: c => { c.fillStyle = "#DCE6EC"; c.fillRect(0, 0, 128, 128); c.fillStyle = "#6D7F9A"; c.beginPath(); c.moveTo(0, 100); c.lineTo(42, 34); c.lineTo(70, 76); c.lineTo(94, 46); c.lineTo(128, 100); c.fill(); c.fillStyle = "#F7F7F2"; c.beginPath(); c.moveTo(42, 34); c.lineTo(32, 50); c.lineTo(52, 50); c.fill(); c.fillStyle = "#8FB3C9"; c.fillRect(0, 100, 128, 28); },
  art_abstract: c => { c.fillStyle = "#F3EBDD"; c.fillRect(0, 0, 128, 128); c.fillStyle = "#D9472E"; c.fillRect(10, 14, 54, 70); c.fillStyle = "#2F5D8A"; c.beginPath(); c.arc(86, 80, 32, 0, 7); c.fill(); c.fillStyle = "#E8B83A"; c.fillRect(56, 96, 60, 20); c.strokeStyle = "#222"; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 60); c.lineTo(128, 50); c.stroke(); },
  art_family: c => { c.fillStyle = "#E6D9C4"; c.fillRect(0, 0, 128, 128); c.fillStyle = "#9DB4C8"; c.fillRect(0, 0, 128, 70); const cs = ["#C9A27A", "#B86F52", "#8FA287", "#D9B36C"]; [[30, 74, 22], [62, 70, 26], [96, 76, 20], [76, 92, 14]].forEach(([x, y, r], i) => { c.fillStyle = cs[i]; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = "#3a332d"; c.fillRect(x - r / 3, y - 3, 3, 3); c.fillRect(x + r / 3 - 3, y - 3, 3, 3); }); },
  art_stars: c => { c.fillStyle = "#1F2540"; c.fillRect(0, 0, 128, 128); c.fillStyle = "#F4EBD0"; for (let i = 0; i < 40; i++) { c.beginPath(); c.arc((i * 53) % 128, (i * 37) % 128, 0.6 + (i % 3) * 0.6, 0, 7); c.fill(); } c.strokeStyle = "rgba(244,235,208,.6)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(20, 30); c.lineTo(46, 44); c.lineTo(70, 36); c.lineTo(96, 60); c.lineTo(84, 92); c.stroke(); c.strokeStyle = "rgba(244,235,208,.35)"; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.stroke(); },
  art_tapestry: c => { const cs = ["#C9A27A", "#E3CFC4", "#8FA287", "#D9B36C", "#B86F52"]; for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) { c.fillStyle = cs[((x + y) / 16 + (y / 16) * 2) % 5]; c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x + 8, y); c.lineTo(x + 16, y + 8); c.lineTo(x + 8, y + 16); c.fill(); } },
};
const PB_FRAME = { art_tapestry: 0xc9a27a, art_stars: 0xb8945a, art_family: 0xf3ede4, art_abstract: 0x222222 };
const pbTexMemo = {};
const pbTex = (k, f) => pbTexMemo[k] || (pbTexMemo[k] = f());
function pbRug(g, a, kind) {
  const w = a.w || 1.8, d = a.d || 1.2, r = Math.min(w, d) / 2;
  if (kind === "rug_kitchen") pbFlat(mesh(RB(1.8, 0.02, 1.2, 0.01), M(0xd8c3a5, { roughness: 1 }), 0, 0.01, 0, g));
  else if (kind === "rug_bathroom") pbFlat(mesh(RB(1.1, 0.02, 0.7, 0.01), M(0xb7c5c0, { roughness: 1 }), 0, 0.01, 0, g));
  else if (kind === "rug_bedroom") { const m = pbFlat(mesh(CYL(1.25, 1.25, 0.02, 48), M(0xb86f52, { roughness: 1 }), 0, 0.01, 0, g)); m.scale.z = 0.75; }
  else if (kind === "rug_playroom") { pbFlat(mesh(CYL(1.6, 1.6, 0.02, 56), M(0xd9b36c, { roughness: 1 }), 0, 0.01, 0, g)); pbFlat(mesh(CYL(1.2, 1.2, 0.022, 56), M(0xe3c487, { roughness: 1 }), 0, 0.012, 0, g)); }
  else if (kind === "rug_stripe") {
    const t = pbTex("rug_stripe", () => canvasTex((c, cw, ch) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? "#E9E1D2" : "#7E9CB3"; c.fillRect(i * cw / 8, 0, cw / 8, ch); } noise(c, cw, ch, 0.05, 500); }, 128, 64));
    pbFlat(mesh(RB(w * 0.9, 0.02, d * 0.85, 0.01), [M(0xe9e1d2), M(0xe9e1d2), TM(t, { roughness: 1 }), M(0xe9e1d2), M(0xe9e1d2), M(0xe9e1d2)], 0, 0.01, 0, g));
  } else if (kind === "rug_shaggy") {
    const m = pbFlat(mesh(CYL(r * 1.05, r * 1.05, 0.06, 40), M(0xf0e8da, { roughness: 1 }), 0, 0.03, 0, g)); m.scale.x = w / d > 1.2 ? 1.3 : 1;
    for (let i = 0; i < 26; i++) { const a2 = i * 2.4, rr = r * 0.9 * Math.sqrt((i + 0.5) / 26); pbFlat(mesh(SPH(0.09, 8, 6), M(0xe8dfcf, { roughness: 1 }), Math.cos(a2) * rr * m.scale.x, 0.07, Math.sin(a2) * rr, g)).scale.y = 0.5; }
  } else if (kind === "rug_patch") {
    const t = pbTex("rug_patch", () => canvasTex((c, cw, ch) => { const cs = ["#B86F52", "#8FA287", "#D9B36C", "#7E9CB3", "#E3CFC4", "#C9A27A"]; for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) { c.fillStyle = cs[(x * 5 + y * 3) % 6]; c.fillRect(x * cw / 6 + 1, y * ch / 4 + 1, cw / 6 - 2, ch / 4 - 2); } }, 192, 128));
    pbFlat(mesh(RB(w * 0.9, 0.025, d * 0.85, 0.01), [M(0xc9a27a), M(0xc9a27a), TM(t, { roughness: 1 }), M(0xc9a27a), M(0xc9a27a), M(0xc9a27a)], 0, 0.012, 0, g));
  } else if (kind === "rug_persian") {
    const t = pbTex("rug_persian", () => canvasTex((c, cw, ch) => {
      c.fillStyle = "#8C2F2A"; c.fillRect(0, 0, cw, ch); c.strokeStyle = "#E3C487"; c.lineWidth = 6; c.strokeRect(10, 10, cw - 20, ch - 20); c.strokeStyle = "#2F4A6B"; c.lineWidth = 4; c.strokeRect(22, 22, cw - 44, ch - 44);
      c.fillStyle = "#E3C487"; c.beginPath(); c.ellipse(cw / 2, ch / 2, cw / 5, ch / 4, 0, 0, 7); c.fill(); c.fillStyle = "#2F4A6B"; c.beginPath(); c.ellipse(cw / 2, ch / 2, cw / 9, ch / 8, 0, 0, 7); c.fill();
      for (let i = 0; i < 8; i++) { c.fillStyle = "#D9B36C"; c.beginPath(); c.arc(40 + (i % 4) * (cw - 80) / 3, i < 4 ? 40 : ch - 40, 6, 0, 7); c.fill(); }
      noise(c, cw, ch, 0.06, 800);
    }, 256, 170));
    pbFlat(mesh(RB(w * 0.95, 0.02, d * 0.85, 0.01), [M(0x8c2f2a), M(0x8c2f2a), TM(t, { roughness: 1 }), M(0x8c2f2a), M(0x8c2f2a), M(0x8c2f2a)], 0, 0.01, 0, g));
  }
}
// model per barang. ctx: { a: anchor, lamp(x, y, z, s) }
const PB_MODEL = {
  // ---- dapur
  cafe_table: g => {
    mesh(CYL(0.6, 0.6, 0.06, 36), M(0xc9a27a, { roughness: 0.6 }), 0, 1.05, 0, g); mesh(CYL(0.05, 0.07, 1.0, 12), M(ink), 0, 0.52, 0, g); mesh(CYL(0.3, 0.32, 0.04, 24), M(ink), 0, 0.02, 0, g);
    mesh(CYL(0.28, 0.18, 0.14, 24), M(cream), 0, 1.15, 0, g);
    [[0xd9893f, -0.08, 0], [0xc0504d, 0.1, 0.06], [0xa3b36a, 0, -0.1]].forEach(([col, x, z]) => mesh(SPH(0.11, 16, 12), M(col, { roughness: 0.5 }), x, 1.27, z, g));
  },
  family_table: g => {
    const top = M(0xc9a27a, { roughness: 0.6 });
    mesh(RB(1.9, 0.08, 1.0, 0.03), top, 0, 1.05, 0, g);
    for (const [x, z] of [[-0.85, -0.4], [0.85, -0.4], [-0.85, 0.4], [0.85, 0.4]]) mesh(RB(0.08, 1.0, 0.08, 0.02), M(ink), x, 0.5, z, g);
    for (const sz of [-1, 1]) { mesh(RB(1.7, 0.07, 0.36, 0.03), top, 0, 0.6, sz * 0.82, g); for (const sx of [-0.7, 0.7]) mesh(RB(0.07, 0.58, 0.07, 0.02), M(ink), sx, 0.29, sz * 0.82, g); }
    mesh(CYL(0.26, 0.18, 0.12, 24), M(cream), -0.3, 1.15, 0, g); mesh(CYL(0.05, 0.05, 0.3, 10), M(0xb86f52), 0.35, 1.24, 0, g);
    [[0xd9893f, -0.36, 0], [0xc0504d, -0.22, 0.05]].forEach(([col, x, z]) => mesh(SPH(0.1, 14, 10), M(col, { roughness: 0.5 }), x, 1.26, z, g));
  },
  harvest_table: g => {
    const oak = M(0x9c7552, { roughness: 0.55 });
    mesh(RB(2.2, 0.12, 1.1, 0.03), oak, 0, 1.06, 0, g);
    for (const sx of [-0.9, 0.9]) { mesh(RB(0.14, 1.0, 0.9, 0.03), oak, sx, 0.5, 0, g); }
    mesh(RB(1.7, 0.08, 0.12, 0.02), oak, 0, 0.25, 0, g);
    for (const [x, z, ry] of [[-0.5, 0.85, 0], [0.5, 0.85, 0], [-0.5, -0.85, Math.PI], [0.5, -0.85, Math.PI]]) {
      const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = ry; g.add(ch);
      mesh(RB(0.48, 0.06, 0.44, 0.02), oak, 0, 0.62, 0, ch); mesh(RB(0.48, 0.7, 0.06, 0.02), oak, 0, 0.98, 0.2, ch);
      for (const [lx, lz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) mesh(CYL(0.025, 0.025, 0.62, 8), oak, lx, 0.31, lz, ch);
    }
    mesh(RB(1.6, 0.01, 0.4, 0.005), M(0xe9e1d2, { roughness: 1 }), 0, 1.125, 0, g);
    mesh(CYL(0.14, 0.1, 0.32, 16), M(0xe9dfcf, { roughness: 0.4 }), 0.1, 1.29, 0, g);
    for (let i = 0; i < 4; i++) mesh(SPH(0.07, 10, 8), M([0xd9b36c, 0xb86f52, 0xf3ede4, 0xc8674f][i]), 0.06 + (i % 2) * 0.1, 1.5 + (i > 1 ? 0.06 : 0), (i % 2) * 0.06 - 0.03, g);
    mesh(CYL(0.02, 0.02, 0.24, 8), M(cream), -0.55, 1.24, 0, g); mesh(SPH(0.03, 8, 6), F(0xffd08a), -0.55, 1.39, 0, g);
  },
  jar_shelf: g => {
    mesh(RB(2.3, 0.06, 0.32, 0.02), M(0xc9a27a), 0, 2.45, 0, g);
    [[0xe9dfcf, 0.3], [0xc8674f, 0.24], [0x9dae95, 0.34], [cream, 0.26]].forEach(([col, hh], i) => mesh(CYL(0.12, 0.12, hh, 18), M(col, { roughness: 0.4 }), -0.9 + i * 0.5, 2.48 + hh / 2, 0, g));
  },
  herb_shelf: g => {
    mesh(RB(2.3, 0.06, 0.34, 0.02), M(0xc9a27a), 0, 2.45, 0, g);
    for (let i = 0; i < 4; i++) {
      const x = -0.85 + i * 0.56; mesh(CYL(0.15, 0.12, 0.24, 16), M([0xc98e6b, 0xe9dfcf, 0xc98e6b, 0x9dae95][i], { roughness: 0.6 }), x, 2.6, 0, g);
      for (let k = 0; k < 6; k++) { const a = k * 1.1; const l = mesh(SPH(0.07, 8, 6), M([0x6f8a68, 0x8fa287, 0x5f7d55][k % 3]), x + Math.cos(a) * 0.08, 2.8 + (k % 3) * 0.06, Math.sin(a) * 0.08, g); l.scale.set(0.8, 1.6, 0.6); }
    }
  },
  coffee_shelf: g => {
    mesh(RB(2.3, 0.06, 0.36, 0.02), M(0xc9a27a), 0, 2.45, 0, g);
    mesh(RB(0.55, 0.6, 0.34, 0.06), M(0xb86f52, { roughness: 0.4 }), -0.6, 2.78, 0, g); mesh(RB(0.4, 0.06, 0.2, 0.02), M(ink), -0.6, 2.58, 0.05, g);
    mesh(CYL(0.03, 0.03, 0.12, 8), pbBrass(), -0.6, 2.66, 0.12, g); mesh(CYL(0.05, 0.05, 0.06, 10), pbBrass(), -0.45, 3.1, 0, g);
    for (let i = 0; i < 3; i++) { mesh(CYL(0.08, 0.065, 0.14, 16), M([cream, 0x9dae95, 0xd9b36c][i], { roughness: 0.4 }), 0.2 + i * 0.28, 2.55, 0, g); }
    mesh(CYL(0.12, 0.12, 0.3, 16), M(0xe9dfcf, { roughness: 0.4 }), 0.95, 2.63, 0, g);
  },
  // ---- kamar mandi (lokal: panjang bak di sumbu z)
  clawfoot_tub: g => {
    mesh(RB(1.2, 0.85, 2.3, 0.4), M(0xf7f3ec, { roughness: 0.35 }), 0, 0.68, 0, g);
    mesh(RB(1.0, 0.06, 2.05, 0.03), M(0xa9c4cf, { roughness: 0.1, transparent: true, opacity: 0.85 }), 0, 1.0, 0, g);
    for (const [x, z] of [[-0.42, 0.9], [0.42, 0.9], [-0.42, -0.9], [0.42, -0.9]]) mesh(SPH(0.09, 12, 10), pbBrass(), x, 0.12, z, g);
    for (let i = 0; i < 7; i++) mesh(SPH(0.14 + (i % 3) * 0.05, 16, 12), M(0xffffff, { roughness: 0.3 }), -0.2 + (i % 3) * 0.2, 1.08, -0.6 + i * 0.2, g);
    mesh(CYL(0.03, 0.03, 0.7, 10), pbBrass(), 0, 1.35, -1.08, g);
  },
  bubble_tub: g => {
    mesh(RB(1.25, 0.9, 2.3, 0.45), M(0xbcd5df, { roughness: 0.3 }), 0, 0.45, 0, g);
    mesh(RB(1.05, 0.06, 2.05, 0.03), M(0x9cc7d9, { roughness: 0.1, transparent: true, opacity: 0.85 }), 0, 0.86, 0, g);
    for (let i = 0; i < 16; i++) mesh(SPH(0.1 + (i % 4) * 0.05, 14, 10), M(0xffffff, { roughness: 0.25 }), -0.35 + (i % 4) * 0.23, 0.95 + (i % 3) * 0.06, -0.85 + Math.floor(i / 4) * 0.5, g);
    for (const z of [-0.5, 0.5]) mesh(CYL(0.05, 0.05, 0.03, 12), M(0x7e9cb3, { metalness: 0.5, roughness: 0.3 }), 0.62, 0.6, z, g).rotation.z = Math.PI / 2;
    mesh(CYL(0.03, 0.03, 0.6, 10), M(0xdfe7ea, { metalness: 0.8, roughness: 0.2 }), 0, 1.2, -1.08, g);
  },
  spa_tub: g => {
    const stone = M(0xb9b4ad, { roughness: 0.95 });
    mesh(RB(1.4, 0.9, 2.4, 0.12), stone, 0, 0.45, 0, g);
    mesh(RB(1.1, 0.06, 2.1, 0.03), M(0x8fb8b0, { roughness: 0.1, transparent: true, opacity: 0.85 }), 0, 0.84, 0, g);
    for (let i = 0; i < 6; i++) mesh(SPH(0.1 + (i % 2) * 0.04, 10, 8), M([0x8f8a84, 0xa9a49c, 0x6f6a64][i % 3], { roughness: 1 }), 0.6, 0.94, -0.9 + i * 0.36, g).scale.y = 0.6;
    for (let i = 0; i < 5; i++) { const l = mesh(SPH(0.09, 8, 6), M(0x6f8a68), -0.55 + (i % 2) * 0.1, 1.0 + i * 0.05, 1.0, g); l.scale.set(0.6, 2, 0.4); l.rotation.z = (i - 2) * 0.3; }
    mesh(CYL(0.025, 0.025, 0.5, 10), M(ink, { metalness: 0.6, roughness: 0.4 }), 0, 1.15, -1.12, g);
    mesh(CYL(0.06, 0.06, 0.14, 12), M(cream), -0.6, 0.98, -0.95, g); mesh(SPH(0.025, 8, 6), F(0xffd08a), -0.6, 1.08, -0.95, g);
  },
  pedestal_sink: g => {
    mesh(CYL(0.14, 0.2, 1.2, 20), M(0xf7f3ec, { roughness: 0.35 }), 0, 0.6, 0, g); mesh(RB(0.9, 0.22, 0.6, 0.1), M(0xf7f3ec, { roughness: 0.35 }), 0, 1.25, 0.05, g);
    mesh(CYL(0.025, 0.025, 0.25, 10), pbBrass(), 0, 1.45, -0.18, g);
    const mir = new THREE.Group(); mir.position.set(0, 2.5, -0.36); g.add(mir);
    mesh(new THREE.TorusGeometry(0.5, 0.04, 12, 48), pbBrass(), 0, 0, 0, mir);
    mesh(new THREE.CircleGeometry(0.48, 40), M(0xdfe7ea, { roughness: 0.05, metalness: 0.9 }), 0, 0, 0.0, mir);
  },
  vanity: (g, x) => {
    mesh(RB(1.1, 1.1, 0.6, 0.05), M(0x8fa287, { roughness: 0.5 }), 0, 0.55, 0.05, g); mesh(RB(1.16, 0.06, 0.64, 0.02), M(0xf3ede4, { roughness: 0.3 }), 0, 1.13, 0.05, g);
    mesh(CYL(0.025, 0.025, 0.22, 10), pbBrass(), 0, 1.26, -0.15, g);
    for (const sx of [-0.27, 0.27]) mesh(RB(0.2, 0.03, 0.03, 0.01), pbBrass(), sx, 0.75, 0.37, g);
    mesh(RB(1.0, 1.1, 0.06, 0.04), pbBrass(), 0, 2.45, -0.34, g); mesh(RB(0.9, 1.0, 0.02, 0.01), M(0xdfe7ea, { roughness: 0.05, metalness: 0.9 }), 0, 2.45, -0.3, g);
    for (let i = 0; i < 4; i++) mesh(SPH(0.06, 10, 8), glowM(), -0.55, 2.05 + i * 0.27, -0.28, g), mesh(SPH(0.06, 10, 8), glowM(), 0.55, 2.05 + i * 0.27, -0.28, g);
    x.lamp(0, 2.4, 0.2, 0.7);
  },
  plant_wall: g => {
    PB_MODEL.pedestal_sink(g); g.children[g.children.length - 1].visible = false;   // sink yes, round mirror no
    mesh(RB(1.4, 1.3, 0.08, 0.03), M(0x6b5a48, { roughness: 1 }), 0, 2.55, -0.34, g);
    for (let i = 0; i < 26; i++) { const l = mesh(SPH(0.11, 8, 6), M([0x6f8a68, 0x8fa287, 0x5f7d55, 0x7d9470][i % 4]), -0.55 + (i % 6) * 0.22, 2.0 + Math.floor(i / 6) * 0.26 + (i % 2) * 0.06, -0.26, g); l.scale.set(1.2, 0.7, 0.5); l.rotation.z = (i % 5) * 0.5; }
  },
  // ---- kamar tidur
  pine_bed: g => {
    mesh(RB(2.2, 0.45, 2.4, 0.06), M(wood), 0, 0.3, 0, g);
    mesh(RB(2.1, 0.35, 2.3, 0.15), M(0xf2ede4), 0, 0.68, 0, g);
    mesh(RB(2.22, 0.22, 1.5, 0.12), M(0xe2d5c0, { roughness: 1 }), 0, 0.88, 0.42, g);
    mesh(RB(2.24, 0.06, 0.55, 0.03), M(0xb86f52, { roughness: 1 }), 0, 1.0, 0.9, g);
    for (const sx of [-0.5, 0.5]) mesh(RB(0.85, 0.24, 0.45, 0.12), M(0xf7f2ea), sx, 0.98, -0.85, g);
    mesh(RB(2.35, 1.5, 0.12, 0.06), M(wood), 0, 0.95, -1.18, g);
  },
  cloud_bed: g => {
    mesh(RB(2.3, 0.35, 2.45, 0.15), M(0xe9e1d6), 0, 0.22, 0, g);
    mesh(RB(2.2, 0.45, 2.35, 0.2), M(0xfaf7f2), 0, 0.62, 0, g);
    mesh(RB(2.28, 0.26, 1.55, 0.13), M(0xc9d6e3, { roughness: 1 }), 0, 0.92, 0.4, g);
    for (const sx of [-0.55, 0, 0.55]) mesh(SPH(0.32, 18, 12), M(0xfdfbf7, { roughness: 1 }), sx, 1.0, -0.85, g).scale.set(1, 0.6, 0.7);
    for (let i = 0; i < 5; i++) mesh(SPH(0.42, 16, 12), M(0xf3f1ec, { roughness: 1 }), -0.9 + i * 0.45, 1.3 + (i % 2) * 0.18, -1.2, g).scale.z = 0.35;
  },
  canopy_bed: g => {
    PB_MODEL.pine_bed(g);
    const post = M(0x7a5a41, { roughness: 0.6 });
    for (const [x, z] of [[-1.12, -1.15], [1.12, -1.15], [-1.12, 1.15], [1.12, 1.15]]) mesh(CYL(0.05, 0.05, 3.4, 10), post, x, 1.7, z, g);
    for (const z of [-1.15, 1.15]) mesh(RB(2.3, 0.08, 0.08, 0.02), post, 0, 3.4, z, g);
    for (const x of [-1.12, 1.12]) mesh(RB(0.08, 0.08, 2.35, 0.02), post, x, 3.4, 0, g);
    const veil = M(0xf6efe4, { roughness: 1, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(RB(0.35, 2.9, 0.05, 0.02), veil, sx * 0.9, 1.95, sz * 1.15, g);
    mesh(RB(2.3, 0.3, 2.35, 0.05), veil, 0, 3.25, 0, g);
  },
  bookshelf: g => {
    for (const sx of [-1, 1]) mesh(RB(0.06, 1.9, 0.45, 0.02), M(wood), sx * 0.6, 0.95, 0, g);
    for (const y of [0.03, 0.65, 1.25, 1.87]) mesh(RB(1.26, 0.06, 0.45, 0.02), M(wood), 0, y, 0, g);
    const bk = [0xb86f52, 0x8fa287, 0xd9b36c, 0x6d7790, 0xe2d5c0, 0x9c7f9a];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) { const hh = 0.38 + ((i * 3 + row) % 4) * 0.05; mesh(RB(0.12, hh, 0.34, 0.01), M(bk[(i + row * 2) % 6]), -0.48 + i * 0.15, 0.06 + row * 0.62 + hh / 2, 0, g); }
    mesh(SPH(0.14, 16, 12), M(0x9dae95), 0.2, 1.42, 0, g);
  },
  study_desk: (g, x) => {
    mesh(RB(1.5, 0.07, 0.7, 0.02), M(0xc9a27a, { roughness: 0.6 }), 0, 1.0, 0.05, g);
    for (const sx of [-0.7, 0.7]) mesh(RB(0.06, 1.0, 0.65, 0.02), M(0xc9a27a), sx, 0.5, 0.05, g);
    mesh(RB(0.5, 0.45, 0.6, 0.03), M(0x8fa287), 0.42, 0.72, 0.05, g);
    for (let i = 0; i < 5; i++) mesh(RB(0.1, 0.32, 0.24, 0.01), M([0xb86f52, 0x6d7790, 0xd9b36c, 0x8fa287, 0x9c7f9a][i]), -0.6 + i * 0.11, 1.2, -0.12, g);
    mesh(RB(0.36, 0.02, 0.26, 0.01), M(0xf7f2ea), 0.05, 1.045, 0.15, g);
    mesh(CYL(0.08, 0.1, 0.04, 14), M(ink), 0.5, 1.05, -0.1, g); mesh(CYL(0.015, 0.015, 0.5, 6), M(ink), 0.5, 1.3, -0.1, g);
    mesh(new THREE.ConeGeometry(0.14, 0.16, 18, 1, true), M(0xd9b36c, { side: THREE.DoubleSide }), 0.5, 1.56, -0.05, g);
    x.lamp(0.5, 1.45, 0.1, 0.8);
    const ch = new THREE.Group(); ch.position.set(0, 0, 0.7); g.add(ch);
    mesh(RB(0.5, 0.06, 0.45, 0.02), M(wood), 0, 0.6, 0, ch); mesh(RB(0.5, 0.55, 0.06, 0.02), M(wood), 0, 0.9, 0.2, ch);
    for (const [lx, lz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) mesh(CYL(0.025, 0.025, 0.6, 8), M(wood), lx, 0.3, lz, ch);
  },
  reading_nook: (g, x) => {
    mesh(RB(1.4, 0.3, 0.9, 0.12), M(0xb86f52, { roughness: 1 }), 0, 0.15, 0.25, g);
    for (const [sx, col] of [[-0.4, 0xd9b36c], [0.05, 0x8fa287], [0.45, 0xe2d5c0]]) mesh(SPH(0.28, 16, 12), M(col, { roughness: 1 }), sx, 0.45, -0.05, g).scale.set(1, 0.75, 0.5);
    for (const sx of [-0.6, 0.6]) mesh(RB(0.06, 2.2, 0.35, 0.02), M(wood), sx, 1.1, -0.1, g);
    for (const y of [1.3, 1.85, 2.2]) mesh(RB(1.26, 0.05, 0.35, 0.02), M(wood), 0, y, -0.1, g);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) mesh(RB(0.12, 0.34, 0.26, 0.01), M([0x6d7790, 0xb86f52, 0xd9b36c, 0x8fa287, 0x9c7f9a, 0xe2d5c0][(i + r * 3) % 6]), -0.42 + i * 0.16, 1.5 + r * 0.55, -0.1, g);
    mesh(SPH(0.1, 12, 10), glowM(), 0.4, 2.35, -0.1, g); x.lamp(0.3, 1.9, 0.3, 0.9);
  },
  // ---- ruang main
  play_tent: g => {
    mesh(new THREE.ConeGeometry(0.85, 2.1, 5, 1, true), M(0xf1e7d6, { side: THREE.DoubleSide, roughness: 1 }), 0, 1.05, 0, g);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const s = mesh(CYL(0.02, 0.02, 2.5, 6), M(wood), Math.cos(a) * 0.5, 1.15, Math.sin(a) * 0.5, g); s.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); }
  },
  climb_frame: g => {
    const bar = M(0x7e9cb3, { roughness: 0.45 }), red = M(0xc8674f, { roughness: 0.5 });
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) mesh(CYL(0.04, 0.04, 1.9, 10), bar, x, 0.95, z, g);
    for (const y of [0.6, 1.25, 1.9]) for (const [x, z, r] of [[0, -0.6, 1], [0, 0.6, 1], [-0.6, 0, 0], [0.6, 0, 0]]) { const m = mesh(CYL(0.03, 0.03, 1.2, 8), bar, x, y, z, g); m.rotation.set(r ? 0 : Math.PI / 2, 0, r ? Math.PI / 2 : 0); }
    mesh(RB(1.2, 0.06, 1.2, 0.02), M(0xd9b36c), 0, 1.25, 0, g);
    const sl = mesh(RB(0.55, 0.05, 1.7, 0.02), red, 0, 0.65, 1.3, g); sl.rotation.x = 0.72;
    for (const sx of [-0.28, 0.28]) { const e = mesh(RB(0.04, 0.12, 1.7, 0.02), red, sx, 0.7, 1.3, g); e.rotation.x = 0.72; }
  },
  ball_pit: g => {
    mesh(CYL(0.95, 0.95, 0.55, 36, 1), M(0xe9dfcf, { roughness: 0.6 }), 0, 0.28, 0, g);
    mesh(new THREE.TorusGeometry(0.95, 0.09, 10, 40), M(0x7e9cb3, { roughness: 0.6 }), 0, 0.56, 0, g).rotation.x = Math.PI / 2;
    const cs = [0xc8674f, 0x7e9cb3, 0xd9b36c, 0x8fa287, 0xf3ede4];
    for (let i = 0; i < 40; i++) { const a = i * 2.39996, rr = 0.82 * Math.sqrt((i + 0.5) / 40); mesh(SPH(0.11, 12, 10), M(cs[i % 5], { roughness: 0.4 }), Math.cos(a) * rr, 0.6 + (i % 3) * 0.05, Math.sin(a) * rr, g); }
  },
  toy_shelf: g => {
    mesh(RB(2.2, 0.06, 0.55, 0.02), M(cream), 0, 0.03, 0, g); mesh(RB(2.2, 0.06, 0.55, 0.02), M(cream), 0, 0.75, 0, g); mesh(RB(2.2, 0.06, 0.55, 0.02), M(cream), 0, 1.45, 0, g);
    for (const sx of [-1.07, 0, 1.07]) mesh(RB(0.06, 1.48, 0.55, 0.02), M(cream), sx, 0.74, 0, g);
    for (let i = 0; i < 3; i++) mesh(RB(0.28, 0.28, 0.28, 0.04), M(PB_TOY[i]), -0.8 + i * 0.3, 0.2, 0, g);
    mesh(SPH(0.22, 20, 14), M(0xb86f52), 0.55, 0.28, 0, g); mesh(new THREE.ConeGeometry(0.17, 0.45, 18), M(0x7e9cb3), -0.55, 1.0, 0, g);
    mesh(RB(0.4, 0.3, 0.3, 0.06), M(0xe2d5c0), 0.5, 0.93, 0, g);
    for (let i = 0; i < 4; i++) mesh(RB(0.1, 0.42, 0.3, 0.01), M(PB_TOY[(i + 1) % 4]), -0.75 + i * 0.12, 1.69, 0, g);
  },
  easel: g => {
    const legs = M(0xc9a27a, { roughness: 0.6 });
    for (const sx of [-1, 1]) { const l = mesh(RB(0.06, 2.3, 0.06, 0.02), legs, sx * 0.4, 1.12, 0.25, g); l.rotation.z = -sx * 0.14; }
    const b = mesh(RB(0.06, 2.2, 0.06, 0.02), legs, 0, 1.05, -0.25, g); b.rotation.x = -0.25;
    mesh(RB(0.9, 0.05, 0.12, 0.02), legs, 0, 0.95, 0.3, g);
    const cv = new THREE.Group(); cv.position.set(0, 1.5, 0.27); cv.rotation.x = -0.1; g.add(cv);
    mesh(RB(0.9, 0.95, 0.04, 0.01), M(0xf7f2ea), 0, 0, 0, cv);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.86), M(0xffffff, { map: canvasTex(c => { c.fillStyle = "#F7F2EA"; c.fillRect(0, 0, 128, 128); c.fillStyle = "#9DC0DA"; c.fillRect(0, 0, 128, 70); c.fillStyle = "#D9B36C"; c.beginPath(); c.arc(90, 34, 16, 0, 7); c.fill(); c.fillStyle = "#8FA287"; c.beginPath(); c.moveTo(0, 90); c.quadraticCurveTo(50, 50, 128, 86); c.lineTo(128, 128); c.lineTo(0, 128); c.fill(); c.fillStyle = "#C8674F"; c.beginPath(); c.arc(40, 92, 9, 0, 7); c.fill(); }, 128, 128) }));
    p.position.z = 0.025; cv.add(p);
    for (let i = 0; i < 4; i++) mesh(CYL(0.05, 0.05, 0.08, 10), M([0xc8674f, 0x7e9cb3, 0xd9b36c, 0x8fa287][i], { roughness: 0.4 }), -0.3 + i * 0.2, 1.0, 0.32, g);
  },
  piano: g => {
    const body = M(0x3a332d, { roughness: 0.35 });
    mesh(RB(1.4, 1.2, 0.55, 0.04), body, 0, 0.75, -0.05, g);
    mesh(RB(1.4, 0.08, 0.35, 0.02), body, 0, 0.8, 0.35, g);
    mesh(RB(1.3, 0.04, 0.2, 0.01), M(0xf7f2ea, { roughness: 0.3 }), 0, 0.86, 0.4, g);
    for (let i = 0; i < 9; i++) if (i % 7 !== 2 && i % 7 !== 6) mesh(RB(0.05, 0.04, 0.11, 0.01), body, -0.52 + i * 0.13, 0.89, 0.36, g);
    for (const sx of [-0.62, 0.62]) mesh(RB(0.08, 0.45, 0.08, 0.02), body, sx, 0.22, 0.35, g);
    mesh(RB(0.6, 0.06, 0.32, 0.02), body, 0, 0.5, 0.95, g); for (const sx of [-0.25, 0.25]) mesh(RB(0.05, 0.5, 0.25, 0.02), body, sx, 0.25, 0.95, g);
    mesh(RB(0.36, 0.26, 0.03, 0.01), M(0xf7f2ea), 0, 1.15, 0.24, g).rotation.x = -0.2;
    mesh(CYL(0.08, 0.06, 0.18, 14), M(0xc8674f), 0.45, 1.44, -0.05, g);
  },
  // ---- bawaan tahap 2 (dulu bagian ruangan di ui/03-scene.js)
  kitchen_counter: g => {
    mesh(RB(2.6, 1.2, 1.0, 0.04), M(0x8fa287), 0, 0.6, 0, g);
    mesh(RB(2.75, 0.1, 1.08, 0.03), M(0xc9a27a, { roughness: 0.6 }), 0, 1.25, 0.02, g);
    for (const dx of [-0.88, 0, 0.88]) { mesh(RB(0.8, 1.0, 0.04, 0.02), M(0x9bb093), dx, 0.58, 0.51, g); mesh(RB(0.22, 0.03, 0.03, 0.01), M(brass, { metalness: 0.7, roughness: 0.35 }), dx, 0.98, 0.55, g); }
    mesh(CYL(0.32, 0.28, 0.32, 28), M(0xc8674f, { roughness: 0.5 }), 0.7, 1.46, 0.05, g); mesh(CYL(0.34, 0.34, 0.04, 28), M(0xb25a44), 0.7, 1.64, 0.05, g);
    mesh(RB(0.55, 0.04, 0.38, 0.02), M(0xd8b48c), -0.6, 1.32, 0.1, g);
  },
  fridge: g => {
    mesh(RB(0.95, 2.4, 1.0, 0.18), M(0xefe6d6, { roughness: 0.45 }), 0, 1.2, 0, g);
    mesh(RB(0.06, 0.5, 0.06, 0.02), M(brass, { metalness: 0.7, roughness: 0.35 }), -0.32, 1.75, 0.52, g);
  },
  nightstand: (g, x) => {
    mesh(RB(0.7, 0.75, 0.6, 0.04), M(wood), 0, 0.375, 0, g); mesh(RB(0.55, 0.02, 0.02, 0.01), M(shade(wood, 0.7)), 0, 0.5, 0.31, g);
    mesh(CYL(0.1, 0.14, 0.35, 16), M(0xc8674f, { roughness: 0.5 }), 0, 0.93, 0, g);
    mesh(CYL(0.16, 0.26, 0.3, 24, 1), M(0xf3e6cf, { emissive: 0xffc98a, emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 1 }), 0, 1.25, 0, g);
    x.lamp(0, 1.5, 0.15, 1.5);
  },
  rubber_duck: g => {
    const dk = new THREE.Group(); dk.rotation.y = -0.6; g.add(dk);
    mesh(SPH(0.22, 20, 14), M(0xe8c35a, { roughness: 0.4 }), 0, 0.17, 0, dk).scale.set(1.1, 0.75, 1.3);
    mesh(SPH(0.14, 16, 12), M(0xe8c35a, { roughness: 0.4 }), 0, 0.4, 0.14, dk); mesh(new THREE.ConeGeometry(0.05, 0.12, 10), M(0xd9893f), 0, 0.38, 0.3, dk).rotation.x = Math.PI / 2;
  },
  shelf_jars: g => highShelf(g, 0, 4.3, [[0xe9dfcf, "jar"], [0x9dae95, "jar"], [0xc8674f, "pot"]]),
  shelf_bath: g => highShelf(g, 0, 4.2, [[0xf3ede4, "jar"], [0xa9c4cf, "jar"], [0x7d9470, "plant"]]),
  shelf_books: g => highShelf(g, 0, 4.4, [[0xd9b36c, "books"], [0x9dae95, "plant"], [cream, "jar"]]),
  towel_rail: g => {
    mesh(CYL(0.02, 0.02, 0.9, 8), pbBrass(), 0, 2.2, 0, g).rotation.z = Math.PI / 2;
    mesh(RB(0.65, 0.95, 0.06, 0.03), M(0xd6b8a3, { roughness: 1 }), 0, 1.75, 0.04, g);
  },
  garland: g => {
    mesh(CYL(0.01, 0.01, 3.4, 4), M(ink), 0, 3.82, 0, g).rotation.z = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const f = mesh(new THREE.ConeGeometry(0.16, 0.34, 3), M(PB_TOY[i % 4], { roughness: 1 }), -1.5 + i * 0.6, 3.7 - Math.sin(i / 5 * Math.PI) * 0.3, 0.02, g); f.rotation.x = Math.PI; f.scale.z = 0.25; }
  },
  // ---- sudut (hiasan berdiri)
  plant_kitchen: g => plant(g, 0, 0, 1.1),
  plant_bathroom: g => plant(g, 0, 0, 0.95, 0xe6e0d6, 0x6f8a68),
  plush_bedroom: g => {
    mesh(SPH(0.26, 20, 14), M(0xc9a27a, { roughness: 1 }), 0, 0.26, 0, g).scale.set(1, 0.95, 0.85); mesh(SPH(0.2, 20, 14), M(0xc9a27a, { roughness: 1 }), 0, 0.62, 0, g);
    for (const sx of [-1, 1]) { mesh(SPH(0.08, 12, 8), M(0xc9a27a, { roughness: 1 }), sx * 0.13, 0.79, 0, g); mesh(SPH(0.022, 8, 6), M(ink), sx * 0.07, 0.65, 0.18, g); }
  },
  beanbag_playroom: g => { const bb = mesh(SPH(0.75, 32, 24), M(0x8c8b5e, { roughness: 1 }), 0, 0.42, 0, g); bb.scale.set(1.1, 0.62, 1); },
  plant_fiddle: g => {
    mesh(CYL(0.32, 0.26, 0.6, 24), M(0xe9dfcf, { roughness: 0.6 }), 0, 0.3, 0, g); mesh(CYL(0.04, 0.05, 1.6, 8), M(0x6b5a48), 0, 1.3, 0, g);
    for (let i = 0; i < 12; i++) { const a = i * 2.2, y = 1.3 + (i / 12) * 1.1; const l = mesh(SPH(0.2, 12, 10), M(i % 2 ? 0x5f7d55 : 0x6f8a68, { roughness: 0.55 }), Math.cos(a) * 0.22, y, Math.sin(a) * 0.22, g); l.scale.set(1, 1.3, 0.25); l.rotation.set(Math.sin(a) * 0.5, a, 0.3); }
  },
  cactus_trio: g => {
    mesh(RB(0.9, 0.5, 0.4, 0.04), M(0xc9a27a, { roughness: 0.6 }), 0, 0.25, 0, g);
    for (const [x, h, col] of [[-0.28, 0.5, 0x6f8a68], [0, 0.75, 0x7d9470], [0.28, 0.4, 0x5f7d55]]) {
      mesh(CYL(0.11, 0.1, 0.18, 14), M(0xe9dfcf), x, 0.59, 0, g); mesh(CYL(0.08, 0.09, h, 12), M(col, { roughness: 0.7 }), x, 0.68 + h / 2, 0, g); mesh(SPH(0.08, 12, 8), M(col, { roughness: 0.7 }), x, 0.68 + h, 0, g);
    }
    mesh(SPH(0.04, 8, 6), M(0xe08ca0), 0, 1.47, 0, g);
  },
  floor_lamp: (g, x) => {
    mesh(CYL(0.25, 0.28, 0.05, 24), M(ink), 0, 0.025, 0, g); mesh(CYL(0.02, 0.02, 2.6, 8), pbBrass(), 0, 1.3, 0, g);
    mesh(CYL(0.25, 0.38, 0.45, 24, 1, true), M(0xf3e6cf, { emissive: 0xffc98a, emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 1 }), 0, 2.65, 0, g);
    x.lamp(0, 2.5, 0.2, 1.4);
  },
  paper_lantern: (g, x) => {
    mesh(CYL(0.22, 0.25, 0.05, 20), M(0xc9a27a), 0, 0.025, 0, g); mesh(CYL(0.015, 0.015, 1.0, 6), M(ink), 0, 0.5, 0, g);
    mesh(SPH(0.4, 24, 18), M(0xfff1d6, { emissive: 0xffd9a0, emissiveIntensity: 0.5, roughness: 1 }), 0, 1.35, 0, g);
    for (const y of [1.15, 1.35, 1.55]) mesh(new THREE.TorusGeometry(Math.sqrt(0.16 - (y - 1.35) ** 2) + 0.005, 0.006, 4, 30), M(0xd8c3a5), 0, y, 0, g).rotation.x = Math.PI / 2;
    x.lamp(0, 1.4, 0.3, 1.0);
  },
  globe_stand: g => {
    const w0 = M(0x7a5a41, { roughness: 0.55 });
    for (let i = 0; i < 3; i++) { const a = i * 2.094; const l = mesh(CYL(0.025, 0.03, 0.9, 8), w0, Math.cos(a) * 0.2, 0.43, Math.sin(a) * 0.2, g); l.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); }
    mesh(new THREE.TorusGeometry(0.44, 0.025, 8, 36), pbBrass(), 0, 1.3, 0, g).rotation.y = Math.PI / 2;
    const gl = new THREE.Group(); gl.position.set(0, 1.3, 0); gl.rotation.z = 0.4; g.add(gl);
    mesh(SPH(0.4, 28, 20), M(0xffffff, { map: canvasTex(c => { c.fillStyle = "#8FB3C9"; c.fillRect(0, 0, 256, 128); c.fillStyle = "#D9C9A0"; [[40, 40, 30, 22], [100, 70, 22, 30], [170, 40, 40, 20], [200, 90, 22, 14], [60, 95, 18, 12]].forEach(([x, y, a, b]) => { c.beginPath(); c.ellipse(x, y, a, b, 0.4, 0, 7); c.fill(); }); }, 256, 128), roughness: 0.5 }), 0, 0, 0, gl);
  },
  aquarium: g => {
    mesh(RB(1.1, 0.8, 0.5, 0.03), M(0x7a5a41, { roughness: 0.6 }), 0, 0.4, 0, g);
    mesh(RB(1.05, 0.65, 0.45, 0.02), M(0xbfe0ea, { roughness: 0.05, transparent: true, opacity: 0.45 }), 0, 1.13, 0, g);
    mesh(RB(1.0, 0.5, 0.4, 0.01), M(0x6fa7c4, { roughness: 0.1, transparent: true, opacity: 0.35 }), 0, 1.07, 0, g);
    mesh(RB(1.0, 0.06, 0.4, 0.01), M(0xe2d5c0, { roughness: 1 }), 0, 0.84, 0, g);
    mesh(RB(0.18, 0.22, 0.14, 0.02), M(0xb9b4ad), -0.3, 0.98, 0, g); mesh(new THREE.ConeGeometry(0.08, 0.12, 4), M(0xc8674f), -0.3, 1.15, 0, g);
    for (const [x, y, col] of [[0.15, 1.15, 0xe8a03a], [0.3, 1.0, 0xe85d3a]]) { mesh(SPH(0.06, 10, 8), M(col, { roughness: 0.4 }), x, y, 0.05, g).scale.set(1.4, 0.8, 0.6); mesh(new THREE.ConeGeometry(0.04, 0.08, 6), M(col), x + 0.1, y, 0.05, g).rotation.z = Math.PI / 2; }
    for (let i = 0; i < 4; i++) { const l = mesh(SPH(0.04, 6, 4), M(0x5f7d55), 0.35 - i * 0.05, 0.92 + i * 0.07, -0.1, g); l.scale.set(0.6, 2, 0.4); }
  },
};
// lampu dari perabot: ikut daftar lampu ruangan (ui/29-town.js menyalakannya waktu malam)
function pbBuild(roomG, slotG, id, a) {
  const ctx = { a, lamp: (x, y, z, s) => { const l = new THREE.PointLight(0xffc68a, 0, 6, 1.6); l.position.set(x, y, z); slotG.add(l); (roomG.userData.lamps ||= []).push({ l, strength: s }); } };
  if (PB_ART[id]) pbArt(slotG, id, a.w || 0.9, a.h || 0.9, a.y || 0);
  else if (id && id.startsWith("rug_")) pbRug(slotG, a, id);
  else if (PB_MODEL[id]) PB_MODEL[id](slotG, ctx);
}
// lukisan: bingkai + kanvas (teksturnya dibuat sekali per lukisan)
function pbArt(g, id, w, h, y) {
  mesh(RB(w + 0.12, h + 0.12, 0.06, 0.02), M(PB_FRAME[id] || 0x3a332d, { roughness: 0.6 }), 0, y, 0, g);
  const t = pbTex("art:" + id, () => canvasTex((c, cw, ch) => { c.fillStyle = "#EFE6D8"; c.fillRect(0, 0, cw, ch); PB_ART[id](c, cw, ch); noise(c, cw, ch, 0.04, 300); }, 128, 128));
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M(0xffffff, { map: t })); p.position.set(0, y, 0.035); g.add(p);
}
const PB_WALLS = [
  { id: "oat", name: "Oat and sage", top: 0xeee4d4, low: 0x9dae95 }, { id: "sky", name: "Sky and slate", top: 0xe6edf2, low: 0x8fa3b5 },
  { id: "blush", name: "Blush", top: 0xf3e3dc, low: 0xc99a8c }, { id: "lemon", name: "Lemon", top: 0xf4ecd0, low: 0xd8b45f },
  { id: "mint", name: "Mint", top: 0xe3efe6, low: 0x8fbfa5 }, { id: "dusk", name: "Dusk", top: 0x8e97a8, low: 0x6d7790 },
  { id: "cocoa", name: "Cocoa", top: 0xe9dccd, low: 0x8a6a55 }, { id: "plum", name: "Plum", top: 0xe8dde6, low: 0x8c6f88 },
];
const PB_FLOORS = [
  { id: "honey", name: "Honey", a: 0xd2b48f, b: 0xc3a27b }, { id: "walnut", name: "Walnut", a: 0x9c7552, b: 0x7d5a3e },
  { id: "terracotta", name: "Terracotta", a: 0xc58b67, b: 0xb47657 }, { id: "ash", name: "Ash", a: 0xd9d4cc, b: 0xbdb6ab },
  { id: "slate", name: "Slate", a: 0x8f969d, b: 0x767d84 }, { id: "sage", name: "Sage", a: 0xa9b79a, b: 0x93a284 },
];

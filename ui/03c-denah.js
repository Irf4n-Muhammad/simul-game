// ================================================================ Tata Rumah tahap 2: rumah dibangun dari denah (denah.js)
// Tiap ruangan = satu grup di koordinat kavling (petak x, z kali CELL). Dua cara lihat:
//   main  : cuma ruangan yang dibuka, digeser supaya titik berdiri makhluk ada di titik nol (kamera lama tetap jalan).
//           Dinding selatan dibuang (potongan diorama), dinding utara/barat/timur tinggi dengan jendela, pintu, dan barang dinding.
//   bangun: seluruh rumah kelihatan dari atas, dinding rendah (pintu = celah, jendela = garis kaca), barang dinding jadi tanda kecil.
const CELL = Denah.CELL, WT = 0.12, LOW_H = 0.85, DOOR_H = 2.9, WIN_Y = 2.9;
const ROOM_LOOK = {
  makan: { action: "Feed", bg: ["#EFE4D2", "#D9C9B0"], wall: [0xeee4d4, 0x9dae95, "panel"], floor: ["terra", 0xc58b67, 0xb47657], edge: 0x8c6a4f, trim: 0xf3ede4, curtain: 0xd8c7ae },
  mandi: { action: "Wash", bg: ["#E3E8EA", "#C5CFD3"], wall: [0xf0ebe3, 0x9fb2bc, "tile"], floor: ["terrazzo", 0xe6e0d6, 0x9a8f84], edge: 0x8f8a84, trim: 0xf3ede4, curtain: 0xc9d6dc },
  tidur: { action: "Sleep", bg: ["#DCD6DE", "#B9B0BF"], wall: [0x8e97a8, 0x6d7790, "plain"], floor: ["planks", 0xb48a64, 0x9c7552], edge: 0x7a5a41, trim: 0xe9e2d6, curtain: 0xcbb8a0 },
  peluk: { action: "Play", bg: ["#EDE5D8", "#D6C8B4"], wall: [0xe9dfcf, 0xd2b48a, "panel"], floor: ["planks", 0xd2b48f, 0xc3a27b], edge: 0x8c6a4f, trim: 0xf3ede4, curtain: 0xd8c7ae },
  // tahap 3
  tamu: { action: "Relax", bg: ["#EDE3D6", "#D3C2AC"], wall: [0xefe7da, 0xb59a7c, "panel"], floor: ["planks", 0xc19a72, 0xab855f], edge: 0x7a5a41, trim: 0xf3ede4, curtain: 0xc9b39a },
  kerja: { action: "Study", bg: ["#E2E3DC", "#C3C6BA"], wall: [0xe8e6dc, 0x7f8f7a, "plain"], floor: ["planks", 0x9c7552, 0x86613f], edge: 0x6b4f39, trim: 0xe9e2d6, curtain: 0xb9c2b0 },
  taman: { action: "Garden", bg: ["#CFE3EC", "#E8F0E0"], wall: [0xeee6d8, 0xb9ab95, "plain"], floor: ["grass", 0x9db37f, 0x7f9a63], edge: 0x7a6a50, trim: 0xe9e2d6, curtain: 0xd8c7ae },
};
// rawat yang jalan di tiap jenis ruangan (tombol aksi)
const CARE_ACT = { makan: "makan", mandi: "mandi", tidur: "tidur", peluk: "peluk", tamu: "peluk", kerja: "peluk", taman: "peluk" };
const DN_SC = { beanbag_playroom: 0.72 };
const ROT_Y = [0, Math.PI / 2, Math.PI, -Math.PI / 2], BACK = [[0, -1], [-1, 0], [0, 1], [1, 0]];
let HOUSE_MODE = "main", HOUSE_KEY = "", HOUSE_GEN = 0, HOUSE_PLAN = null, ROOM_HALF = 2.75, DN_DRAFT = null;
const LOT_G = new THREE.Group(); LOT_G.visible = false; scene.add(LOT_G);

// tekstur dinding/lantai per (jenis ruangan, cat): dibuat sekali, dipakai semua ruangan (ukuran diatur lewat UV, bukan repeat)
const dnTexMemo = {};
const dnPaint = (pid, list) => (pid && list.find(x => x.id === pid)) || null;
function dnWallTex(t, pid) {
  const L = ROOM_LOOK[t], P = dnPaint(pid, PB_WALLS), k = "w" + t + (P ? P.id : "");
  return dnTexMemo[k] || (dnTexMemo[k] = P ? wallTex(P.top, P.low, L.wall[2]) : wallTex(...L.wall));
}
function dnFloorTex(t, pid) {
  const L = ROOM_LOOK[t], P = dnPaint(pid, PB_FLOORS), k = "f" + t + (P ? P.id : "");
  return dnTexMemo[k] || (dnTexMemo[k] = P ? floorTex(L.floor[0], P.a, P.b) : floorTex(...L.floor));
}
const dnWallTop = (t, pid) => { const P = dnPaint(pid, PB_WALLS); return P ? P.top : ROOM_LOOK[t].wall[0]; };
function uvScale(geo, su, sv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); uv.needsUpdate = true; return geo; }

// titik berdiri makhluk (titik sudut petak): dekat tengah, kira-kira 3 petak dari dinding belakang, empat petak di sekitarnya kosong
function dnStand(plan, ri) {
  const [, rx, rz, w, d] = plan.R[ri], busy = new Set();
  for (const it of plan.I) { const m = Denah.meta(it[0]); if (!m || m.m !== "floor") continue; for (const [x, z] of Denah.cellsOf(m, it)) busy.add(x + "," + z); }
  const free = (x, z) => !busy.has(x + "," + z);
  let best = null, bv = -1e9;
  const tz = rz + Math.min(d - 1, 3), cx = rx + w / 2;
  for (let vz = rz + 1; vz < rz + d; vz++) for (let vx = rx + 1; vx < rx + w; vx++) {
    const n = [free(vx - 1, vz - 1), free(vx, vz - 1), free(vx - 1, vz), free(vx, vz)].filter(Boolean).length;
    const v = n * 3 - Math.abs(vx - cx) - Math.abs(vz - tz) * 0.8;
    if (v > bv) { bv = v; best = [vx, vz]; }
  }
  if (best && w <= 4) best[0] = rx + w / 2;   // ruangan sempit: makhluk persis di tengah, dindingnya simetris
  return best || [rx + w / 2, rz + d / 2];
}

// satu barang: grup di tengah petaknya, diputar; barang yang punya punggung ditarik mepet dinding
function dnItem(roomG, parent, plan, ri, it, mode) {
  const m = Denah.meta(it[0]); if (!m) return null;
  const [fw, fd] = Denah.dims(m, it[3]), r = it[3], [bx, bz] = BACK[r];
  let cx = (it[1] + fw / 2) * CELL, cz = (it[2] + fd / 2) * CELL;
  const behind = Denah.cellsOf(m, it).map(([x, z]) => [x + bx, z + bz]), wall = behind.some(([x, z]) => Denah.roomAt(plan, x, z) !== ri);
  if (m.back != null) {
    const half = m.d * CELL / 2, ex = cx + bx * half, ez = cz + bz * half, gap = (wall ? WT : 0.02) + m.back;
    cx = ex - bx * gap; cz = ez - bz * gap;
  }
  const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ROT_Y[r]; g.userData.item = it; parent.add(g);
  if (mode === "bangun" && m.m === "wall") {
    // tanda kecil di atas dinding rendah
    mesh(RB(m.w * CELL * 0.8, 0.1, 0.16, 0.03), M(0xd9b36c, { roughness: 0.6 }), 0, LOW_H * 0.75, 0.06, g).castShadow = false;
    return g;
  }
  const a = m.m === "rug" ? { w: m.w * CELL * 0.92, d: m.d * CELL * 0.92 } : m.x.slot === "dinding" ? { w: it[0] === "art_tapestry" ? 1.0 : 0.9, h: it[0] === "art_tapestry" ? 1.2 : 0.9, y: WIN_Y + 0.1 } : {};
  pbBuild(roomG, g, it[0], a);
  if (DN_SC[it[0]]) g.scale.setScalar(DN_SC[it[0]]);
  return g;
}

// dinding ruangan (induk + sayap, tahap 3): tiap sisi petak yang tetangganya bukan ruangan ini, dikelompokkan jadi deretan lurus.
// s = 0 utara, 1 barat, 2 selatan, 3 timur. Tiap petak deretan: kunci sisi, pintu?, jendela?, luar?, sebelahnya taman?
function dnSides(plan, ri) {
  const cells = Denah.cellsOfRoom(plan, ri), has = new Set(cells.map(c => c.join(","))), D = new Set(plan.D), N = new Set(plan.N), out = [];
  const nb = [[0, -1], [-1, 0], [0, 1], [1, 0]];
  const keyOf = (s, x, z) => s === 0 ? Denah.ek("h", x, z) : s === 2 ? Denah.ek("h", x, z + 1) : s === 1 ? Denah.ek("v", x, z) : Denah.ek("v", x + 1, z);
  for (const s of [0, 1, 2, 3]) {
    const es = cells.filter(([x, z]) => !has.has((x + nb[s][0]) + "," + (z + nb[s][1])));
    es.sort((A, B) => s % 2 ? A[0] - B[0] || A[1] - B[1] : A[1] - B[1] || A[0] - B[0]);
    let run = null;
    for (const [x, z] of es) {
      const k = keyOf(s, x, z), oi = Denah.roomAt(plan, x + nb[s][0], z + nb[s][1]);
      const C = { x, z, k, door: D.has(k), win: N.has(k), out: oi < 0, yard: oi >= 0 && Denah.OUTDOOR(plan.R[oi][0]) };
      const last = run && run.cells[run.cells.length - 1];
      if (last && (s % 2 ? last.x === x && last.z === z - 1 : last.z === z && last.x === x - 1)) run.cells.push(C);
      else { run = { s, cells: [C] }; out.push(run); }
    }
  }
  for (const S of out) { S.n = S.cells.length; S.cells.forEach((C, i) => { C.i = i; }); }
  return out;
}
// kotak dinding dari petak ke-a sampai ke-b (termasuk) deretan S: [cx, cz, sx, sz]
function dnSeg(S, a, b) {
  const A = S.cells[a], B = S.cells[b], s = S.s;
  if (s === 0 || s === 2) { const x0 = A.x * CELL, len = (B.x - A.x + 1) * CELL, z = s === 0 ? A.z * CELL + WT / 2 : (A.z + 1) * CELL - WT / 2; return [x0 + len / 2, z, len, WT]; }
  const z0 = A.z * CELL, len = (B.z - A.z + 1) * CELL, x = s === 1 ? A.x * CELL + WT / 2 : (A.x + 1) * CELL - WT / 2;
  return [x, z0 + len / 2, WT, len];
}
const INNER = [4, 0, 5, 1];   // sisi kotak yang menghadap ke dalam ruangan (+z, +x, -z, -x)

function dnRoom(plan, ri, mode) {
  const R = plan.R[ri], [t, rx, rz, w, d] = R, L = ROOM_LOOK[t], paint = (plan.C && plan.C[ri]) || ["", ""], yard = Denah.OUTDOOR(t);
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  // kotak luar ruangan (induk + sayap)
  const parts = Denah.partsOf(plan, ri).map(i => plan.R[i]);
  const bx0 = Math.min(...parts.map(p => p[1])), bz0 = Math.min(...parts.map(p => p[2])), bx1 = Math.max(...parts.map(p => p[1] + p[3])), bz1 = Math.max(...parts.map(p => p[2] + p[4]));
  const x0 = bx0 * CELL, z0 = bz0 * CELL, W = (bx1 - bx0) * CELL, Dp = (bz1 - bz0) * CELL;
  const st = dnStand(plan, ri);
  // lantai. Mode main: satu lantai selebar kotak luar, diteruskan ke arah kamera (dinding depan dibuang), jadi bawah layar tetap lantai.
  // Mode bangun: lantai tiap bagian sendiri-sendiri, supaya bentuk L-nya kebaca.
  const floorM = TM(dnFloorTex(t, ""), {}), edgeM = M(L.edge);
  floorM.userData.color0 = floorM.color.getHex(); floorM.userData.map0 = floorM.map;
  const slab = (fx, fz, FW, FD) => { const fl = mesh(uvScale(new THREE.BoxGeometry(FW, SLAB, FD), FW / 4.27, FD / 4.27), [edgeM, edgeM, floorM, edgeM, edgeM, edgeM], fx + FW / 2, -SLAB / 2, fz + FD / 2, g); fl.castShadow = false; };
  if (mode === "main") slab(x0, z0, W, Math.max(Dp, st[1] * CELL + 9 - z0));
  else for (const p of parts) slab(p[1] * CELL, p[2] * CELL, p[3] * CELL, p[4] * CELL);
  const walls = [], trimM = M(L.trim), outM = M(0xefe6d6);
  const sides = dnSides(plan, ri);
  const hedgeM = M(0x6f8a5a, { roughness: 1 }), hedgeM2 = M(0x7f9a63, { roughness: 1 });
  if (mode === "main") {
    for (const S of sides) {
      if (S.s === 2) continue;   // dinding depan dibuang: potongan diorama
      // taman: sisi ke luar = pagar tanaman rendah (celah di gerbang); sisi ke rumah = dinding luar rumah biasa
      if (yard) {
        let a = 0;
        const hedge = b => {
          if (b < a) return;
          const [cx, cz, sx, sz] = dnSeg(S, a, b);
          const h = mesh(RB(Math.max(sx, 0.5), 1.1, Math.max(sz, 0.5), 0.2), hedgeM, cx, 0.55, cz, g); h.castShadow = false;
          for (let k = 0; k <= b - a; k++) { const [px, pz] = dnSeg(S, a + k, a + k); mesh(SPH(0.36, 10, 8), k % 2 ? hedgeM : hedgeM2, px, 1.1, pz, g).scale.set(1.2, 0.7, 1.2); }
        };
        const outs = S.cells.every(C => C.out || C.yard);
        if (outs) {
          for (const C of S.cells) if (C.door) { hedge(C.i - 1); a = C.i + 1; const [cx, cz, sx, sz] = dnSeg(S, C.i, C.i); for (const e of [-1, 1]) mesh(CYL(0.08, 0.08, 1.4, 10), M(0x8a6a4f), cx + (S.s % 2 ? 0 : e * sx / 2), 0.7, cz + (S.s % 2 ? e * sz / 2 : 0), g); }
          hedge(S.n - 1);
          continue;
        }
      }
      let a = 0;
      const wallMat = () => { const wm = yard ? M(0xe9e1d6) : TM(dnWallTex(t, ""), { color: S.s === 0 ? 0xffffff : 0xe9e1d6 }); wm.userData.color0 = wm.color.getHex(); wm.userData.map0 = wm.map; if (!yard) walls.push(wm); return wm; };
      const flush = b => {
        if (b < a) return;
        const [cx, cz, sx, sz] = dnSeg(S, a, b), len = (b - a + 1) * CELL;
        const wm = wallMat();
        const ms = [outM, outM, trimM, trimM, outM, outM]; ms[INNER[S.s]] = wm;
        const wl = mesh(uvScale(new THREE.BoxGeometry(sx, WALL_H, sz), len / 6.9, 1), ms, cx, WALL_H / 2, cz, g); wl.castShadow = false;
        // list bawah + pita gelap tempat dinding ketemu lantai
        const [ix, iz] = S.s === 0 ? [0, 1] : S.s === 1 ? [1, 0] : [-1, 0];
        mesh(RB(S.s === 0 ? len : 0.06, 0.22, S.s === 0 ? 0.06 : len, 0.02), trimM, cx + ix * (WT / 2 + 0.03), 0.11, cz + iz * (WT / 2 + 0.03), g);
        const ao = mesh(new THREE.PlaneGeometry(len, 0.9), F(0xffffff, { map: aoTex, transparent: true, depthWrite: false }), cx + ix * (WT / 2 + 0.45), 0.012, cz + iz * (WT / 2 + 0.45), g);
        ao.rotation.set(-Math.PI / 2, 0, S.s === 0 ? 0 : S.s === 1 ? -Math.PI / 2 : Math.PI / 2);
      };
      for (const C of S.cells) {
        if (C.door) {
          flush(C.i - 1); a = C.i + 1;
          const [cx, cz, sx, sz] = dnSeg(S, C.i, C.i);
          const wm = wallMat();
          const ms = [outM, outM, trimM, trimM, outM, outM]; ms[INNER[S.s]] = wm;
          mesh(uvScale(new THREE.BoxGeometry(sx, WALL_H - DOOR_H, sz), CELL / 6.9, (WALL_H - DOOR_H) / WALL_H), ms, cx, (WALL_H + DOOR_H) / 2, cz, g).castShadow = false;
          // daun pintu tertutup + kusen
          const dg = new THREE.Group(); dg.position.set(cx, 0, cz); dg.rotation.y = [0, Math.PI / 2, 0, -Math.PI / 2][S.s]; g.add(dg);
          const leaf = C.out || C.yard ? 0x8a5a3c : 0xc9a27a;
          mesh(RB(CELL * 0.78, DOOR_H - 0.08, 0.07, 0.02), M(leaf, { roughness: 0.6 }), 0, (DOOR_H - 0.08) / 2, WT / 2 + 0.02, dg);
          for (const y of [0.9, 2.0]) mesh(RB(CELL * 0.55, 0.7, 0.02, 0.01), M(shade(leaf, 0.88), { roughness: 0.6 }), 0, y, WT / 2 + 0.065, dg);
          mesh(SPH(0.05, 10, 8), M(brass, { metalness: 0.7, roughness: 0.35 }), CELL * 0.28, 1.4, WT / 2 + 0.09, dg);
          for (const sx2 of [-1, 1]) mesh(RB(0.08, DOOR_H, 0.1, 0.02), trimM, sx2 * CELL * 0.43, DOOR_H / 2, WT / 2 + 0.02, dg);
          mesh(RB(CELL * 0.94, 0.1, 0.1, 0.02), trimM, 0, DOOR_H, WT / 2 + 0.02, dg);
        } else if (C.win) {
          const [cx, cz] = dnSeg(S, C.i, C.i), wg = new THREE.Group();
          const off = WT + 0.02;
          wg.position.set(cx + (S.s === 1 ? off - WT / 2 : S.s === 3 ? -(off - WT / 2) : 0), 0, cz + (S.s === 0 ? off - WT / 2 : 0));
          wg.rotation.y = [0, Math.PI / 2, 0, -Math.PI / 2][S.s]; g.add(wg);
          win(wg, 0, 0, WIN_Y, 0.82, 1.15, false, L.curtain);
        }
      }
      flush(S.n - 1);
    }
  } else {
    // mode bangun: dinding rendah polos di semua sisi, pintu = celah, jendela = kaca di atasnya; taman = pagar tanaman
    const lowM = yard ? hedgeM : M(dnWallTop(t, paint[0])); if (!yard) { walls.push(lowM); lowM.userData.low = 1; }
    const glassM = M(0xa9cfe0, { roughness: 0.15, emissive: 0x6a9cb3, emissiveIntensity: 0.25 });
    for (const S of sides) {
      let a = 0;
      const flush = b => { if (b < a) return; const [cx, cz, sx, sz] = dnSeg(S, a, b); mesh(new THREE.BoxGeometry(sx, yard ? LOW_H * 0.7 : LOW_H, sz), lowM, cx, (yard ? LOW_H * 0.7 : LOW_H) / 2, cz, g).castShadow = false; };
      for (const C of S.cells) {
        if (C.door) { flush(C.i - 1); a = C.i + 1; const [cx, cz, sx, sz] = dnSeg(S, C.i, C.i); pbFlat(mesh(new THREE.BoxGeometry(sx, 0.04, sz), M(C.out ? 0x8a5a3c : 0xc9a27a), cx, 0.02, cz, g)); }
        else if (C.win) { const [cx, cz, sx, sz] = dnSeg(S, C.i, C.i); pbFlat(mesh(new THREE.BoxGeometry(S.s % 2 ? sx + 0.02 : sx * 0.8, 0.07, S.s % 2 ? sz * 0.8 : sz + 0.02), glassM, cx, LOW_H + 0.035, cz, g)); }
      }
      flush(S.n - 1);
    }
  }
  // barang
  const itemsG = new THREE.Group(); g.add(itemsG);
  plan.I.forEach(it => {
    const m = Denah.meta(it[0]); if (!m) return;
    const c0 = Denah.cellsOf(m, it)[0]; if (Denah.roomAt(plan, c0[0], c0[1]) !== ri) return;
    if (mode === "main" && m.m === "wall" && it[3] === 2) return;   // dinding depan nggak ada
    dnItem(g, itemsG, plan, ri, it, mode);
  });
  // titik berdiri + lampu ruangan (taman: nggak ada lampu langit-langit)
  const standG = new THREE.Group(); standG.position.set(st[0] * CELL, 0, st[1] * CELL); g.add(standG);
  if (t === "makan" && mode === "main") {
    mesh(CYL(0.012, 0.012, 1.4, 6), M(ink), 0.2, 4.1, -0.6, standG);
    mesh(new THREE.ConeGeometry(0.38, 0.32, 32, 1, true), M(ink, { side: THREE.DoubleSide, metalness: 0.3, roughness: 0.5 }), 0.2, 3.3, -0.6, standG);
    mesh(SPH(0.1, 12, 10), glowM(), 0.2, 3.18, -0.6, standG); lampLight(standG, 0.2, 3.0, -0.6, 1.2);
  } else if (!yard) lampLight(g, rx * CELL + w * CELL / 2, 3.6, rz * CELL + d * CELL / 2, 0.9);
  if (standG.userData.lamps) { (g.userData.lamps ||= []).push(...standG.userData.lamps); }
  if (t === "peluk") {
    // bola buat main (07-rooms-actions.js melempar dan mengembalikannya), di sisi yang masih dalam ruangan
    const bx = (st[0] + 1.25) * CELL < x0 + W - 0.4 ? 1.5 : -1.5, bz = Math.min(1.3, z0 + Dp - 0.4 - st[1] * CELL);
    const ball = mesh(SPH(0.32), M(0x7e9cb3, { roughness: 0.55 }), bx, 0.32, bz, standG);
    mesh(new THREE.TorusGeometry(0.322, 0.035, 8, 40), M(0xf3ede4), 0, 0, 0, ball);
    g.userData.ball = ball; g.userData.ballHome = ball.position.clone();
  }
  // mode bangun: bagian barang yang tinggi (cermin, rak, kelambu, kap lampu) disembunyikan biar denahnya kebaca dari atas
  if (mode === "bangun") {
    g.updateMatrixWorld(true);
    const box = new THREE.Box3();
    itemsG.traverse(o => { if (o.isMesh) { box.setFromObject(o); if (box.min.y > 1.9) o.visible = false; } });
  }
  const shelf = itemsG.children.find(o => o.userData.item && o.userData.item[0] === "toy_shelf");
  const names = Denah.names(plan);
  return { name: names[ri], action: L.action, act: CARE_ACT[t], t, ri, bg: L.bg, g, stand: st, rect: [rx, rz, w, d], paint, yard,
    half: Math.min(5, Math.max(W < 5 ? 2.2 : 2.75, W * 0.43)), mats: { walls, floor: floorM }, standG, shelf: shelf || null };
}

function dnDispose(o) {
  o.traverse(n => { if (n.geometry) n.geometry.dispose(); const ms = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : []; for (const m of ms) m.dispose(); });
  if (o.parent) o.parent.remove(o);
}
// tanah kavling (mode bangun): rumput, garis petak
function dnLot(lot) {
  while (LOT_G.children.length) dnDispose(LOT_G.children[0]);
  const W = lot[0] * CELL, H = lot[1] * CELL;
  const gr = mesh(new THREE.BoxGeometry(W + 0.6, 0.3, H + 0.6), M(0x9db37f, { roughness: 1 }), W / 2, -0.66, H / 2, LOT_G); gr.castShadow = false;
  const pts = [];
  for (let x = 0; x <= lot[0]; x++) pts.push(x * CELL, 0.02, 0, x * CELL, 0.02, H);
  for (let z = 0; z <= lot[1]; z++) pts.push(0, 0.02, z * CELL, W, 0.02, z * CELL);
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const ln = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 })); ln.position.y = -0.5; LOT_G.add(ln);
  LOT_G.userData.grid = ln;
}

// bangun ulang semua ruangan dari denah. ROOMS tetap array yang sama (dipakai di banyak tempat).
function buildHouse(plan, mode) {
  for (const r of ROOMS) dnDispose(r.g);
  for (let i = windows.length - 1; i >= 0; i--) { let o = windows[i]; while (o.parent) o = o.parent; if (o !== scene) windows.splice(i, 1); }
  ROOMS.length = 0;
  plan.R.forEach((r, i) => { if (Denah.isRoot(plan, i)) ROOMS.push(dnRoom(plan, i, mode)); });
  HOUSE_PLAN = plan; HOUSE_MODE = mode; HOUSE_GEN++;
  if (mode === "bangun") dnLot(Denah.lotOf(game ? game.home : null).map((n, k) => Math.max(n, ...plan.R.map(r => k ? r[2] + r[4] : r[1] + r[3]))));
  if (typeof roomIx !== "undefined") roomIx = Math.min(roomIx, ROOMS.length - 1);
  applyHome(); applyLight(true); dnShow();
}
// taruh grup sesuai cara lihat: main = satu ruangan di titik nol, bangun = seluruh kavling di tengah
function dnShow() {
  const ix = typeof roomIx === "number" ? roomIx : 0;
  if (HOUSE_MODE === "bangun") {
    const lot = DN_LOT(), cx = lot[0] * CELL / 2, cz = lot[1] * CELL / 2;
    for (const r of ROOMS) { r.g.visible = true; r.g.position.set(-cx, 0, -cz); }
    LOT_G.visible = true; LOT_G.position.set(-cx, 0, -cz);
    const s = Math.max(cx, cz) + 3; Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, far: 80 }); sun.shadow.camera.updateProjectionMatrix();
    return;
  }
  LOT_G.visible = false;
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, far: 30 }); sun.shadow.camera.updateProjectionMatrix();
  ROOMS.forEach((r, k) => { r.g.visible = k === ix; r.g.position.set(-r.stand[0] * CELL, 0, -r.stand[1] * CELL); });
  ROOM_HALF = ROOMS[ix] ? ROOMS[ix].half : 2.75;
}
const DN_LOT = () => { const p = HOUSE_PLAN, L = Denah.lotOf(typeof game !== "undefined" && game ? game.home : null); return p ? [Math.max(L[0], ...p.R.map(r => r[1] + r[3])), Math.max(L[1], ...p.R.map(r => r[2] + r[4]))] : L; };
// dipanggil tiap refresh(): bangun ulang cuma kalau denahnya (atau cara lihatnya) berubah
function houseSync() {
  const plan = DN_DRAFT || Denah.plan(typeof game !== "undefined" && game ? game.home : null), mode = PB_MODE ? "bangun" : "main";
  const key = mode + JSON.stringify(plan);
  if (key === HOUSE_KEY) return false;
  HOUSE_KEY = key; buildHouse(plan, mode);
  return true;
}
// cat: pilihan ruangan di denah > closet > kertas asli
function applyHome() {
  const C = globalThis.Cosmetics, H = C && state ? C.homeLook(state) : {}, cw = H.dinding && C.item(H.dinding), cf = H.lantai && C.item(H.lantai);
  for (const r of ROOMS) {
    const [pw, pf] = r.paint || ["", ""];
    for (const mm of r.mats.walls) {
      if (mm.userData.low) { mm.color.setHex(pw ? dnWallTop(r.t, pw) : cw ? cw.look.color : ROOM_LOOK[r.t].wall[0]).convertSRGBToLinear(); continue; }
      if (pw) { mm.map = dnWallTex(r.t, pw); mm.color.setHex(mm.userData.color0); }
      else { mm.map = mm.userData.map0; if (cw) mm.color.setHex(cw.look.color).convertSRGBToLinear(); else mm.color.setHex(mm.userData.color0); }
      mm.needsUpdate = true;
    }
    const fm = r.mats.floor;
    if (pf) { fm.map = dnFloorTex(r.t, pf); fm.color.setHex(fm.userData.color0); }
    else { fm.map = cf ? null : fm.userData.map0; if (cf) fm.color.setHex(cf.look.color).convertSRGBToLinear(); else fm.color.setHex(fm.userData.color0); }
    fm.needsUpdate = true;
  }
}
// ruangan buat rawat (makan_p, mandi, makan_m, tidur): yang paling enak buat makhluk ini (denah.js careRoom); tidur di rumah yang denahnya
// sudah disimpan = kamarnya sendiri (pembagian kamar). Hasil = indeks ROOMS (bukan indeks denah: sayap nggak jadi ruangan sendiri).
function careRoomOf(item) {
  const t = { makan_p: "makan", makan_m: "makan", mandi: "mandi", tidur: "tidur", peluk: "peluk" }[item];
  const c = typeof game !== "undefined" && game && cur ? game.home.get(cur.id) : null;
  const sl = t === "tidur" && c && HOUSE_PLAN && Denah.saved(game.home) && HOUSE_PLAN === game.home.world.denah ? Denah.sleepers(game.home, today()) : null;
  const ri = HOUSE_PLAN && c ? Denah.careRoom(HOUSE_PLAN, c, t, item === "makan_p" ? "pagi" : item === "makan_m" ? "malam" : null, sl) : -1;
  const k = ROOMS.findIndex(r => r.ri === ri);
  return k >= 0 ? k : Math.max(0, ROOMS.findIndex(r => r.t === t));
}

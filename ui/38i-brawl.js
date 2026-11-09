// ================================================================ v84: Bonk brawl, mini game adu jotos di pulau melayang
// Gaya platform fighter: lu lawan 3 CPU (Kiko, Bolt, Mimi) di Treetop isle. Tiap pukulan nambah persen kerusakan;
// makin tinggi persennya, makin jauh mentalnya. Keluar dari batas layar = jatuh (KO). Tiga nyawa, 2 menit.
// Senjata jatuh dari langit pakai parasut: palu (pukulan lebih jauh dan keras) dan pai (dilempar). Dodge = kebal sebentar.
// Dimainkan melintang (landscape) lewat jalur yang sama dengan Kart cup (MG_LAND, ktLock/ktOrient): HP tegak → layarnya diputar 90°.
// Kontrol sentuh: jempol kiri = stik di mana aja di separuh kiri, kanan = tombol Serang, Berat (tahan buat ngecas), Lompat, Dodge.
// Keyboard: panah/WASD gerak (atas = lompat), Spasi lompat, J/Z serang, K/X berat, L/C/Shift dodge.
// Skor: KO +3, juara 1/2/3 = +8/+4/+2 (BR_PTS). Kesulitan CPU ikut peringkat (BR_DIFF, harian selalu Silver).
// Logika (brTick) dipisah dari gambar (brDraw) biar bisa disimulasiin tanpa layar (test/brawl.test.js).
const BR_STOCK = 3, BR_TIME = 120;
const BR_G = 2500, BR_RUN = 470, BR_AIR = 420, BR_JUMP = 1000, BR_DJUMP = 930, BR_FALL = 1300, BR_FF = 1850;
const BR_HW = 24, BR_H = 64;                  // setengah lebar dan tinggi badan (satuan dunia)
const BR_KBS = 1.6;                            // pengali mental global (hasil uji simulasi 4 CPU: ~9 jatuh per ronde 2 menit, hampir semua karena dipukul)
const BR_MAIN = { x0: -430, x1: 430, y: 0, bot: 230, solid: true };
const BR_PLATS = [BR_MAIN, { x0: -345, x1: -145, y: -170, soft: true }, { x0: 145, x1: 345, y: -170, soft: true }, { x0: -95, x1: 95, y: -320, soft: true }];
const BR_BLAST = { x: 1060, top: -940, bot: 700 };
const BR_PTS = [8, 4, 2, 0];
const BR_ORD = ["1st", "2nd", "3rd", "4th"];
const BR_SPAWN = [-260, 260, -90, 90];
// watak CPU: re = waktu reaksi (detik), agg = suka nyerang, dodge = suka ngelak, heavy = suka pukulan berat, jumpy = suka loncat
const BR_CPU = [
  { name: "Kiko", col: "#E8506A", look: "cat", re: 0.15, agg: 0.9, dodge: 0.25, heavy: 0.4, jumpy: 0.5 },
  { name: "Bolt", col: "#4A7BE0", look: "ant", re: 0.12, agg: 0.65, dodge: 0.5, heavy: 0.25, jumpy: 0.25 },
  { name: "Mimi", col: "#F3A93C", look: "bun", re: 0.19, agg: 0.5, dodge: 0.65, heavy: 0.5, jumpy: 0.35 },
];
// per peringkat (Rookie..Legend): tambahan waktu reaksi dan ketepatan
const BR_DIFF = [{ re: 0.17, sk: 0.5 }, { re: 0.1, sk: 0.66 }, { re: 0.05, sk: 0.8 }, { re: 0.02, sk: 0.9 }, { re: 0, sk: 1 }, { re: -0.03, sk: 1.12 }];
// jurus: st = mulai (detik), ac = aktif, rc = pulih, dmg = persen, kb = mental dasar, gr = tambahan mental per persen,
// ang = arah mental (derajat, 0 = depan, −90 = atas), box = [maju, tinggi, lebar, tinggi] kotak pukul dari kaki
const BR_MV = {
  jab: { st: 0.05, ac: 0.09, rc: 0.14, dmg: 5, kb: 200, gr: 2.2, ang: -28, box: [44, -36, 56, 36], lunge: 150, arm: 1 },
  up: { st: 0.06, ac: 0.11, rc: 0.16, dmg: 6, kb: 230, gr: 2.4, ang: -86, box: [8, -86, 64, 48], arm: 2 },
  low: { st: 0.06, ac: 0.1, rc: 0.18, dmg: 5, kb: 190, gr: 2.2, ang: -18, box: [42, -12, 68, 26], arm: 3 },
  spike: { st: 0.08, ac: 0.13, rc: 0.2, dmg: 8, kb: 240, gr: 2.6, ang: 72, box: [6, 12, 54, 44], arm: 3 },
  side: { st: 0.13, ac: 0.12, rc: 0.3, dmg: 13, kb: 330, gr: 4.0, ang: -36, box: [58, -38, 76, 50], lunge: 430, arm: 1, heavy: 1 },
  rise: { st: 0.09, ac: 0.18, rc: 0.28, dmg: 10, kb: 320, gr: 3.6, ang: -82, box: [10, -72, 68, 88], lift: 1080, arm: 2, heavy: 1 },
  pound: { st: 0.14, ac: 0.14, rc: 0.32, dmg: 12, kb: 320, gr: 3.6, ang: -48, box: [0, -16, 164, 42], both: 1, arm: 3, heavy: 1, drop: 1400 },
  ham: { st: 0.1, ac: 0.12, rc: 0.24, dmg: 10, kb: 300, gr: 3.4, ang: -34, box: [64, -44, 88, 72], lunge: 120, arm: 4 },
  hamH: { st: 0.16, ac: 0.13, rc: 0.36, dmg: 17, kb: 400, gr: 4.8, ang: -40, box: [68, -36, 104, 86], lunge: 300, arm: 4, heavy: 1 },
  pie: { st: 0.06, ac: 0, rc: 0.2, dmg: 7, kb: 250, gr: 2.4, ang: -26, arm: 5 },
};
const BR_WPN = { ham: { e: "🔨", n: 6 }, pie: { e: "🥧", n: 3 } };
const brIn = () => ({ mx: 0, up: false, dn: false, jumpP: false, atkP: false, hvyP: false, hvyHeld: false, dodgeP: false, dnP: false });
const brSign = v => v < 0 ? -1 : v > 0 ? 1 : 0;

function brNew(i, p) {
  return { i, name: p.name, col: p.col, look: p.look, me: !!p.me, cpu: p.me ? null : p, ai: p.me ? null : { t: 0, mx: 0, up: false, dn: false, hold: 0, tg: null },
    x: BR_SPAWN[i], y: 0, vx: 0, vy: 0, face: BR_SPAWN[i] < 0 ? 1 : -1, ground: BR_MAIN, jumps: 1, upB: true, airDodge: true,
    dodgeT: 0, dodgeCD: 0, dvx: 0, dvy: 0, inv: 0, dmg: 0, stocks: BR_STOCK, stun: 0, atk: null, wpn: null, last: null,
    kos: 0, falls: 0, out: false, outT: 0, resp: 0, drop: 0, hover: 0, anim: 0, sq: 0, flash: 0, hits: 0 };
}
function brawlInit() {
  const lvl = FC.daily ? 2 : Dapur.tier("brawl", wallet().best.brawl).ix;
  const ppl = [{ name: "You", col: "#FFF1D6", look: "band", me: true }].concat(BR_CPU);
  FC.br = { f: ppl.map((p, i) => brNew(i, p)), diff: BR_DIFF[lvl], lvl, t: 0, left: BR_TIME, phase: "count", ct: 3.2, beep: 4, et: 0,
    freeze: 0, shake: 0, pies: [], crates: [], crateT: 6, fx: [], find: null, order: null,
    cam: { x: 0, y: -150, w: 1250 }, keys: {}, edge: {}, stick: null, held: {}, ptr: {}, touchUI: !!(window.matchMedia && matchMedia("(pointer: coarse)").matches),
    tip: wallet().best.brawl ? 0 : 6 };
  FC.place = null;
  const tm = $("mgTime"); if (tm) { tm.hidden = false; tm.textContent = brClock(BR_TIME); }
}
const brClock = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;

// ---- satu langkah logika
function brTick(dt) {
  const B = FC.br;
  if (B.freeze > 0) { B.freeze -= dt; return; }   // jeda kena pukul: bikin pukulan kerasa
  B.t += dt; B.shake = Math.max(0, B.shake - dt);
  if (B.phase === "count") {
    B.ct -= dt;
    const n = Math.ceil(B.ct);
    if (n < B.beep && n >= 0) { B.beep = n; Sfx.play("beep", n === 0 ? 1 : 0); }
    if (B.ct <= 0) { B.phase = "fight"; B.ft = 0; }
  } else if (B.phase === "fight") {
    B.left -= dt; B.ft += dt;
    if (B.tip > 0) B.tip -= dt;
    if (B.left <= 0) { B.left = 0; brFinish(); }
  } else B.et += dt;
  const live = B.phase === "fight";
  for (const f of B.f) {
    const I = !live || f.out ? brIn() : f.me ? (B.auto ? brAI(f, dt) : brPad()) : brAI(f, dt);
    brFighter(f, I, dt);
  }
  B.edge = {};
  brHits();
  brPies(dt);
  brCrates(dt);
  brFind(dt);
  if (B.phase !== "end") for (const f of B.f) if (!f.out && f.resp <= 0 && (f.x < -BR_BLAST.x || f.x > BR_BLAST.x || f.y > BR_BLAST.bot || f.y < BR_BLAST.top)) brKO(f);
  B.fx = B.fx.filter(p => (p.t += dt) < p.life);
  for (const p of B.fx) if (p.vx != null) { p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  if (live) {
    const me = B.f[0], alive = B.f.filter(f => !f.out);
    if (me.out || alive.length <= 1) brFinish();
  }
  if (B.phase === "end" && B.et >= 2.6 && !FC.over) { FC.over = now(); FC.cont = true; }
}

function brFighter(f, I, dt) {
  const B = FC.br;
  if (f.out) return;
  if (f.resp > 0) {
    f.resp -= dt;
    if (f.resp <= 0) Object.assign(f, { x: BR_SPAWN[f.i] * 0.35, y: -470, vx: 0, vy: 0, inv: 2, hover: 1.8, dmg: 0, jumps: 1, upB: true, airDodge: true, ground: null, atk: null, stun: 0 });
    return;
  }
  f.inv = Math.max(0, f.inv - dt); f.dodgeCD = Math.max(0, f.dodgeCD - dt); f.drop = Math.max(0, f.drop - dt);
  f.flash = Math.max(0, f.flash - dt); f.sq += (0 - f.sq) * Math.min(1, dt * 12); f.anim += dt;
  const px = f.x, py = f.y;
  let grav = 1;
  if (f.hover > 0) {
    // baru muncul lagi: melayang di awan kecil sampai gerak atau waktunya habis
    f.hover -= dt;
    if (I.mx || I.jumpP || I.atkP || I.hvyP || I.dodgeP || I.dn) f.hover = 0;
    else { f.vx = 0; f.vy = 0; return; }
  }
  if (f.stun > 0) {
    f.stun -= dt; grav = 0.75;
    f.vx *= 1 - 0.55 * dt; f.vx += I.mx * 160 * dt;   // sedikit bisa ngarahin pas mental
    if (f.stun <= 0) f.stun = 0;
  } else if (f.dodgeT > 0) {
    f.dodgeT -= dt; f.vx = f.dvx; if (!f.ground) { f.vy = f.dvy; grav = 0; }
    if (f.dodgeT <= 0) { f.vx *= 0.3; f.vy *= 0.3; }
  } else {
    const a = f.atk, lock = a && f.ground && a.mv !== BR_MV.pie;
    const target = I.mx * (f.ground ? BR_RUN : BR_AIR), acc = f.ground ? 5200 : 2400;
    if (lock) f.vx *= Math.max(0, 1 - 9 * dt);
    else if (I.mx || f.ground) f.vx += Math.max(-acc * dt, Math.min(acc * dt, target - f.vx));
    if (I.mx && !a) f.face = brSign(I.mx);
    if (I.jumpP && !a) {
      if (f.ground) { f.vy = -BR_JUMP; f.ground = null; f.sq = -0.25; brPuff(f.x, f.y, 4); Sfx.play("hop"); }
      else if (f.jumps > 0) { f.jumps -= 1; f.vy = -BR_DJUMP; f.sq = -0.2; B.fx.push({ k: "ring", x: f.x, y: f.y, t: 0, life: 0.3 }); Sfx.play("hop"); }
    }
    if (I.dnP && f.ground && f.ground.soft) { f.drop = 0.25; f.ground = null; f.y += 2; }
    if (!f.ground && I.dn && !a && f.vy > -150) f.vy = Math.max(f.vy, BR_FF * 0.85);
    if (I.dodgeP && f.dodgeCD <= 0 && (f.ground || f.airDodge) && !a) {
      let dx = I.mx, dy = f.ground ? 0 : I.up ? -1 : I.dn ? 1 : 0;
      const L = Math.hypot(dx, dy) || 1, sp = f.ground ? 820 : 780;
      if (f.ground && !dx) { f.dvx = 0; f.dvy = 0; } else { f.dvx = dx / L * sp; f.dvy = dy / L * sp; }
      f.dodgeT = 0.24; f.inv = Math.max(f.inv, 0.27); f.dodgeCD = f.ground ? 0.7 : 0.9; if (!f.ground) f.airDodge = false;
      Sfx.play("wus");
    }
    if (!f.atk && (I.atkP || I.hvyP) && f.dodgeT <= 0) brStartAtk(f, I);
  }
  // jurus jalan
  const a = f.atk;
  if (a) {
    if (a.chg) {
      // ngecas pukulan berat: tahan tombol, maksimal 0,7 detik
      if (I.hvyHeld && a.charge < 0.7 && f.stun <= 0) { a.charge += dt; if (f.ground) f.vx *= Math.max(0, 1 - 8 * dt); }
      else a.chg = false;
    } else {
      const was = a.t; a.t += dt;
      if (was < a.mv.st && a.t >= a.mv.st) brSwing(f, a);
      if (a.t >= a.mv.st + a.mv.ac + a.mv.rc) {
        f.atk = null;
        if (f.wpn && f.wpn.n <= 0) { brPuff(f.x + f.face * 40, f.y - 40, 6); f.wpn = null; }
      }
    }
  }
  // gravitasi dan gerak
  if (!f.ground) {
    f.vy += BR_G * grav * dt;
    const cap = I.dn && f.stun <= 0 ? BR_FF : f.stun > 0 ? 2600 : BR_FALL;
    if (f.vy > cap) f.vy = cap;
  } else f.vy = 0;
  f.x += f.vx * dt; f.y += f.vy * dt;
  brCollide(f, px, py);
}
function brStartAtk(f, I) {
  const w = f.wpn && f.wpn.k, heavy = I.hvyP && !I.atkP;
  if (I.mx) f.face = brSign(I.mx);
  let mv;
  if (w === "pie" && !heavy) mv = BR_MV.pie;
  else if (w === "ham" && !(heavy && (I.up || I.dn))) mv = heavy ? BR_MV.hamH : BR_MV.ham;
  else if (heavy) mv = I.up ? BR_MV.rise : I.dn ? BR_MV.pound : BR_MV.side;
  else mv = I.up ? BR_MV.up : I.dn ? (f.ground ? BR_MV.low : BR_MV.spike) : BR_MV.jab;
  if (mv === BR_MV.rise && !f.ground && !f.upB) mv = BR_MV.up;   // naik cuma sekali per lompatan
  f.atk = { mv, t: 0, hit: new Set(), charge: 0, chg: !!mv.heavy && mv !== BR_MV.rise };
}
function brSwing(f, a) {
  const mv = a.mv, B = FC.br;
  if (mv.lunge) f.vx = f.face * mv.lunge * (f.ground ? 1 : 0.6) * (1 + a.charge * 0.4);
  if (mv.lift && (f.ground || f.upB)) { f.vy = -mv.lift; f.ground = null; f.upB = false; f.jumps = 0; }
  if (mv.drop && !f.ground) f.vy = mv.drop;
  if (mv === BR_MV.pie) {
    B.pies.push({ x: f.x + f.face * 30, y: f.y - 40, vx: f.face * 1150 + f.vx * 0.3, vy: -180, own: f, t: 0 });
    f.wpn.n -= 1; Sfx.play("lempar"); return;
  }
  if (f.wpn && f.wpn.k === "ham" && (mv === BR_MV.ham || mv === BR_MV.hamH)) f.wpn.n -= 1;
  Sfx.play("wus");
}
// kotak pukul di dunia dari jurus yang lagi aktif
function brBox(f) {
  const a = f.atk; if (!a || a.chg) return null;
  const mv = a.mv; if (!mv.box || a.t < mv.st || a.t >= mv.st + mv.ac) return null;
  const [dx, dy, w, h] = mv.box;
  return { x: f.x + f.face * dx - w / 2, y: f.y + dy - h / 2, w, h };
}
function brHurt(f, b) {
  return f.x + BR_HW > b.x && f.x - BR_HW < b.x + b.w && f.y > b.y && f.y - BR_H < b.y + b.h;
}
function brCan(f) { return !f.out && f.resp <= 0 && f.inv <= 0 && f.dodgeT <= 0; }
function brHits() {
  const B = FC.br;
  for (const a of B.f) {
    const box = brBox(a); if (!box) continue;
    for (const b of B.f) {
      if (b === a || a.atk.hit.has(b) || !brCan(b) || !brHurt(b, box)) continue;
      a.atk.hit.add(b);
      brHit(a, b, a.atk.mv, a.atk.charge, a.atk.mv.both ? brSign(b.x - a.x) || a.face : a.face);
    }
  }
}
function brHit(a, b, mv, charge, dir) {
  const B = FC.br, c = Math.min(1, (charge || 0) / 0.7);
  const dmg = Math.round(mv.dmg * (1 + 0.5 * c));
  b.dmg = Math.min(999, b.dmg + dmg);
  const K = (mv.kb + mv.gr * b.dmg) * (1 + 0.35 * c) * BR_KBS, ang = mv.ang * Math.PI / 180;
  b.vx = Math.cos(ang) * K * dir; b.vy = Math.sin(ang) * K;
  if (b.ground && b.vy > 0) b.vy = -b.vy * 0.4;   // tusuk ke bawah ke yang lagi berdiri = mantul ke atas dikit
  b.stun = 0.12 + K * 0.00042; b.ground = null; b.atk = null; b.hover = 0; b.flash = 0.12;
  b.jumps = 1; b.upB = true; b.airDodge = true;   // kena pukul ngisi lagi lompatan, biar masih bisa balik
  b.last = { by: a, t: B.t }; a.hits += 1; b.face = -dir;
  B.freeze = Math.min(0.13, 0.03 + dmg * 0.005);
  if (K > 900) B.shake = Math.max(B.shake, Math.min(0.4, K / 4000));
  const hx = (a.x + b.x) / 2 + dir * 8, hy = b.y - 38;
  B.fx.push({ k: "hit", x: hx, y: hy, t: 0, life: 0.22, s: 0.6 + Math.min(1.4, dmg / 10), col: K > 900 ? "#FFE36B" : "#FFFFFF" });
  B.fx.push({ k: "num", x: b.x, y: b.y - BR_H - 10, vx: dir * 40, vy: -160, t: 0, life: 0.7, n: dmg });
  for (let i = 0; i < 4 + Math.min(10, dmg); i++) { const an = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 500; B.fx.push({ k: "spark", x: hx, y: hy, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 900, t: 0, life: 0.3 + Math.random() * 0.2, col: i % 2 ? b.col : "#FFF6C8" }); }
  Sfx.play("bonk", dmg + (K > 900 ? 8 : 0));
  if ((a.me || b.me) && navigator.vibrate) navigator.vibrate(K > 900 ? 40 : 15);
}
function brCollide(f, px, py) {
  const M = BR_MAIN;
  // mendarat di pijakan (yang tipis bisa ditembus dari bawah dan bisa diturunin)
  if (!f.ground && f.vy >= 0) {
    for (const p of BR_PLATS) {
      if (p.soft && f.drop > 0) continue;
      if (py <= p.y + 0.5 && f.y >= p.y && f.x + BR_HW * 0.6 > p.x0 && f.x - BR_HW * 0.6 < p.x1) {
        if (f.stun > 0 && f.vy > 1100) { f.y = p.y; f.vy = -f.vy * 0.45; f.vx *= 0.7; brPuff(f.x, p.y, 6); FC.br.shake = Math.max(FC.br.shake, 0.12); break; }
        f.y = p.y; f.vy = 0; f.ground = p; f.jumps = 1; f.upB = true; f.airDodge = true; f.stun = Math.min(f.stun, 0.06);
        f.sq = 0.3; if (py < p.y - 2) brPuff(f.x, p.y, 3);
        if (f.atk && f.atk.mv === BR_MV.pound) f.atk.t = Math.max(f.atk.t, f.atk.mv.st);   // jatuhin badan: langsung meledak di tanah
        break;
      }
    }
  }
  if (f.ground && (f.x + BR_HW * 0.6 < f.ground.x0 || f.x - BR_HW * 0.6 > f.ground.x1)) f.ground = null;
  // badan pulau utama padat: nggak bisa ditembus dari samping atau bawah
  if (f.y > M.y + 1 && f.y - BR_H < M.bot && f.x + BR_HW > M.x0 && f.x - BR_HW < M.x1) {
    if (py - BR_H >= M.bot - 1) { f.y = M.bot + BR_H; f.vy = Math.max(f.vy, 0); }
    else { f.x = f.x < 0 ? M.x0 - BR_HW : M.x1 + BR_HW; f.vx = f.stun > 0 ? -f.vx * 0.5 : 0; }
  }
}
function brPuff(x, y, n) { const B = FC.br; for (let i = 0; i < n; i++) B.fx.push({ k: "puff", x: x + (Math.random() - 0.5) * 30, y: y - 4, vx: (Math.random() - 0.5) * 160, vy: -30 - Math.random() * 60, t: 0, life: 0.35 + Math.random() * 0.2, r: 7 + Math.random() * 6 }); }
function brKO(f) {
  const B = FC.br, k = f.last && B.t - f.last.t < 6 ? f.last.by : null;
  f.stocks -= 1; f.falls += 1;
  if (k && !k.out) { k.kos += 1; if (k.me) { FC.caught += 1; mgAdd(3); B.fx.push({ k: "kotxt", t: 0, life: 1.2 }); } }
  const cx = Math.max(-BR_BLAST.x, Math.min(BR_BLAST.x, f.x)), cy = Math.max(BR_BLAST.top, Math.min(BR_BLAST.bot, f.y - 30));
  B.fx.push({ k: "blast", x: cx, y: cy, a: Math.atan2(-150 - cy, -cx), t: 0, life: 0.9, col: f.col });
  B.shake = 0.45; Sfx.play("ko");
  if (f.me && navigator.vibrate) navigator.vibrate([60, 40, 90]);
  Object.assign(f, { atk: null, wpn: null, stun: 0, vx: 0, vy: 0, ground: null, last: null, dodgeT: 0 });
  if (f.stocks <= 0) { f.out = true; f.outT = B.t; } else f.resp = 1.4;
}
function brRank() {
  return FC.br.f.slice().sort((a, b) => (a.out - b.out) || (a.out ? b.outT - a.outT : (b.stocks - a.stocks) || (a.dmg - b.dmg) || (b.me - a.me)));
}
function brFinish() {
  const B = FC.br;
  if (B.phase === "end") return;
  B.phase = "end"; B.et = 0; B.order = brRank();
  FC.place = B.order.indexOf(B.f[0]);
  const pts = BR_PTS[FC.place] || 0;
  if (pts) mgAdd(pts);
  Sfx.play(FC.place === 0 ? "rekor" : "selesai");
}
// ---- pai yang dilempar
function brPies(dt) {
  const B = FC.br;
  for (const p of B.pies) {
    const py = p.y; p.t += dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    for (const b of B.f) {
      if (b === p.own || !brCan(b) || Math.abs(b.x - p.x) > BR_HW + 14 || p.y < b.y - BR_H - 10 || p.y > b.y + 6) continue;
      brHit(p.own, b, BR_MV.pie, 0, brSign(p.vx)); p.dead = true; brSplat(p.x, p.y); break;
    }
    if (!p.dead) for (const q of BR_PLATS) if (py <= q.y && p.y >= q.y && p.x > q.x0 && p.x < q.x1) { p.dead = true; brSplat(p.x, q.y); }
    if (!p.dead && BR_MAIN.x0 < p.x && p.x < BR_MAIN.x1 && p.y > 0 && p.y < BR_MAIN.bot) { p.dead = true; brSplat(p.x, p.y); }
  }
  B.pies = B.pies.filter(p => !p.dead && p.t < 1.8);
}
function brSplat(x, y) {
  const B = FC.br; Sfx.play("splat");
  for (let i = 0; i < 9; i++) { const an = -Math.PI * Math.random(), sp = 120 + Math.random() * 300; B.fx.push({ k: "spark", x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 1400, t: 0, life: 0.45, col: i % 3 ? "#FFF3D9" : "#E2864A" }); }
}
// ---- peti senjata jatuh dari langit pakai parasut
function brCrates(dt) {
  const B = FC.br;
  if (B.phase === "fight" && (B.crateT -= dt) <= 0 && B.crates.length < 2) {
    B.crateT = 8 + FC.rnd() * 5;
    const p = BR_PLATS[Math.floor(FC.rnd() * BR_PLATS.length)], x = p.x0 + 30 + FC.rnd() * (p.x1 - p.x0 - 60);
    B.crates.push({ x, y: -900, vy: 0, k: FC.rnd() < 0.55 ? "ham" : "pie", on: null, life: 15, sw: FC.rnd() * 6 });
  }
  for (const c of B.crates) {
    if (!c.on) {
      const py = c.y; c.vy = Math.min(260, c.vy + 900 * dt); c.y += c.vy * dt;
      for (const p of BR_PLATS) if (py <= p.y && c.y >= p.y && c.x > p.x0 && c.x < p.x1) { c.y = p.y; c.on = p; brPuff(c.x, p.y, 4); }
      if (c.y > BR_BLAST.bot) c.dead = true;
    } else if ((c.life -= dt) <= 0) { c.dead = true; brPuff(c.x, c.y, 5); }
    if (c.dead) continue;
    for (const f of B.f) {
      if (f.wpn || f.out || f.resp > 0 || f.hover > 0 || Math.abs(f.x - c.x) > 46 || Math.abs(f.y - c.y) > 70) continue;
      f.wpn = { k: c.k, n: BR_WPN[c.k].n }; c.dead = true; Sfx.play("ambil");
      B.fx.push({ k: "ring", x: c.x, y: c.y, t: 0, life: 0.35 }); break;
    }
  }
  B.crates = B.crates.filter(c => !c.dead);
}
// ---- temuan (peti misteri / kepingan puzzle): muncul melayang di salah satu pijakan
function brFind(dt) {
  const B = FC.br, D = FC.drop;
  if (D && !D.done && B.phase === "fight" && B.ft >= 10 + D.at * 5) {
    D.done = true;
    const p = BR_PLATS[1 + Math.floor(Math.random() * 3)];
    B.find = { x: (p.x0 + p.x1) / 2, y: p.y - 70, kind: D.kind, life: 12 };
  }
  const F = B.find; if (!F) return;
  F.life -= dt; const me = B.f[0];
  if (me.resp <= 0 && !me.out && Math.abs(me.x - F.x) < 50 && me.y > F.y - 20 && me.y - BR_H < F.y + 30) { mgPick(F.kind); B.find = null; return; }
  if (F.life <= 0) B.find = null;
}

// ---- otak CPU: tiap beberapa ratus milidetik (waktu reaksinya) mutusin mau ngapain
function brAI(f, dt) {
  const B = FC.br, A = f.ai, P = f.cpu || BR_CPU[1], D = B.diff, I = brIn();
  if (f.resp > 0 || f.out) return I;
  if (A.hold > 0) { A.hold -= dt; I.hvyHeld = A.hold > 0; I.mx = A.hmx; I.up = A.hup; return I; }
  const M = BR_MAIN, off = !f.ground && (f.x < M.x0 + 4 || f.x > M.x1 - 4 || f.y > M.y + 2);
  if (off) {
    // pulang ke pulau: lompat ganda, lalu pukulan naik, lalu dodge ke atas
    const toward = f.x < 0 ? 1 : -1, ex = f.x < 0 ? M.x0 : M.x1, gap = Math.abs(f.x - ex);
    I.mx = toward;
    if (f.stun <= 0 && !f.atk && f.dodgeT <= 0 && (f.vy > -120 || f.y > -30)) {
      if (f.jumps > 0 && (f.y > -80 || f.vy > 300)) I.jumpP = true;
      else if (f.upB && f.y > -10 && gap < 380) { I.up = true; I.hvyP = true; A.hold = 0.04; A.hmx = toward; A.hup = true; }
      else if (f.airDodge && f.dodgeCD <= 0 && f.y > 30 && FC.rnd() < D.sk) { I.dodgeP = true; I.up = true; }
    }
    return I;
  }
  A.t -= dt;
  if (A.t > 0) { I.mx = A.mx; I.up = A.up; I.dn = A.dn; return I; }
  A.t = Math.max(0.03, (P.re + D.re) * (0.6 + 0.8 * FC.rnd()));
  A.mx = 0; A.up = false; A.dn = false;
  const foes = B.f.filter(o => o !== f && !o.out && o.resp <= 0);
  // ngelak kalau ada yang lagi siap mukul di dekat
  for (const e of foes) {
    if (e.atk && !e.atk.chg && e.atk.t < e.atk.mv.st && Math.hypot(e.x - f.x, e.y - f.y) < 150 && f.dodgeCD <= 0 && FC.rnd() < P.dodge * D.sk * 0.55) {
      I.dodgeP = true; I.mx = brSign(f.x - e.x) * (f.ground ? 1 : 0); return I;
    }
  }
  // ambil senjata yang deket
  if (!f.wpn) {
    const c = B.crates.filter(c => c.on).sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0];
    if (c && Math.abs(c.x - f.x) < 420 && FC.rnd() < 0.75) {
      A.mx = I.mx = brSign(c.x - f.x);
      if (c.y < f.y - 100 && f.ground) I.jumpP = true;
      if (c.y > f.y + 80 && f.ground && f.ground.soft) { I.dnP = true; A.dn = I.dn = true; A.mx = I.mx = 0; }
      return brEdge(f, I, A);
    }
  }
  if (!A.tg || A.tg.out || A.tg.resp > 0 || FC.rnd() < 0.06) {
    // Kiko suka ngincer yang lagi menang, yang lain ngincer yang paling dekat
    A.tg = foes.sort((a, b) => (Math.abs(a.x - f.x) + Math.abs(a.y - f.y) * 0.7 - (P.agg > 0.8 ? a.kos * 120 : 0)) - (Math.abs(b.x - f.x) + Math.abs(b.y - f.y) * 0.7 - (P.agg > 0.8 ? b.kos * 120 : 0)))[0] || null;
  }
  const t = A.tg;
  if (!t) { A.mx = I.mx = brSign(-f.x) * (Math.abs(f.x) > 60 ? 1 : 0); return I; }
  const dx = t.x - f.x, dy = t.y - f.y, adx = Math.abs(dx), sx = brSign(dx) || f.face;
  const reach = f.wpn && f.wpn.k === "ham" ? 120 : 82, tOff = t.x < M.x0 || t.x > M.x1 || t.y > M.y + 20;
  if (f.wpn && f.wpn.k === "pie" && Math.abs(dy) < 60 && adx > 110 && adx < 650 && FC.rnd() < 0.55 * D.sk) { I.mx = sx * 0.01; I.atkP = true; return I; }
  if (adx < reach && dy > -75 && dy < 45 && !t.inv) {
    if (FC.rnd() > 0.35 + 0.6 * D.sk * P.agg) return I;   // ragu sebentar
    const heavy = FC.rnd() < P.heavy * (t.dmg > 85 ? 1.8 : 0.6);
    I.mx = sx * 0.01; I.up = dy < -40;
    if (heavy) { I.hvyP = true; I.hvyHeld = true; A.hold = t.dmg > 60 && f.ground ? 0.12 + 0.4 * FC.rnd() : 0.03; A.hmx = sx * 0.01; A.hup = I.up; }
    else I.atkP = true;
    return I;
  }
  if (dy < -95 && adx < 95) {
    if (f.ground || f.jumps > 0) { if (f.vy >= -200) I.jumpP = true; }
    else if (dy > -170) { I.up = true; I.atkP = true; }
    A.mx = I.mx = brSign(dx) * (adx > 20 ? 1 : 0);
    return brEdge(f, I, A);
  }
  if (dy > 70 && adx < 70 && !f.ground && !tOff) { I.dn = true; I.atkP = true; return I; }
  A.mx = I.mx = sx;
  if (dy < -110 && f.ground && adx < 360 && FC.rnd() < 0.6) I.jumpP = true;
  if (dy > 90 && f.ground && f.ground.soft) { I.dnP = true; A.dn = I.dn = true; }
  if (FC.rnd() < P.jumpy * 0.08) I.jumpP = true;
  // jaga pinggir: kalau lawan di luar pulau, tunggu di ujung dan pukul pas dia balik
  if (tOff && f.ground === M) {
    if (adx < 130 && dy > -90 && dy < 140) { I.mx = sx * 0.01; I.dn = dy > 30; I.atkP = true; A.mx = 0; return I; }
  }
  return brEdge(f, I, A);
}
// jangan jalan sendiri ke jurang
function brEdge(f, I, A) {
  const M = BR_MAIN;
  if (f.ground === M && Math.abs(f.x) > M.x1 - 40 && brSign(I.mx) === brSign(f.x)) { I.mx = 0; A.mx = 0; }
  if (!f.ground && f.y > -60 && (f.x < M.x0 + 30 || f.x > M.x1 - 30) && brSign(I.mx) === brSign(f.x)) I.mx = -brSign(f.x);
  return I;
}

// ---- input pemain: keyboard + layar sentuh
function brPad() {
  const B = FC.br, k = B.keys, e = B.edge, s = B.stick;
  let mx = (k.r ? 1 : 0) - (k.l ? 1 : 0), up = !!k.u, dn = !!k.d;
  if (s) {
    const R = brU() * 50, dx = (s.x - s.x0) / R, dy = (s.y - s.y0) / R;
    if (Math.abs(dx) > 0.28) mx = brSign(dx) * Math.min(1, Math.abs(dx) * 1.3);
    up = up || dy < -0.55; dn = dn || dy > 0.55;
  }
  return { mx, up, dn, jumpP: !!e.jump, atkP: !!e.atk, hvyP: !!e.hvy, hvyHeld: !!(k.hvy || B.held.hvy), dodgeP: !!e.dodge, dnP: !!e.dn };
}
const BR_KEYS = { ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r", ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d",
  Space: "jump", KeyJ: "atk", KeyZ: "atk", KeyK: "hvy", KeyX: "hvy", KeyL: "dodge", KeyC: "dodge", ShiftLeft: "dodge", ShiftRight: "dodge" };
function brawlKey(e, down) {
  if (!FC || !FC.br) return;
  const a = BR_KEYS[e.code]; if (!a) return;
  e.preventDefault();
  const B = FC.br;
  if (down && !e.repeat) {
    if (a === "u" || a === "jump") B.edge.jump = true;
    if (a === "d") B.edge.dn = true;
    if (a === "atk" || a === "hvy" || a === "dodge") B.edge[a] = true;
  }
  B.keys[a] = down;
}
// ukuran satuan layar (px perangkat) buat tombol: ikut tinggi layar melintang
function brU() { const { cv, dpr } = FC; return Math.min(1.25, Math.max(0.8, cv.height / dpr / 400)) * dpr; }
function brBtns() {
  const { cv } = FC, W = cv.width, H = cv.height, u = brU();
  return [
    { k: "atk", x: W - 86 * u, y: H - 84 * u, r: 44 * u, lab: "👊", txt: "HIT" },
    { k: "hvy", x: W - 190 * u, y: H - 62 * u, r: 36 * u, lab: "💥", txt: "HEAVY" },
    { k: "jump", x: W - 66 * u, y: H - 190 * u, r: 34 * u, lab: "⤒", txt: "JUMP" },
    { k: "dodge", x: W - 170 * u, y: H - 160 * u, r: 30 * u, lab: "💨", txt: "DODGE" },
  ];
}
// posisi jari di kanvas; kalau layar diputar (HP tegak), koordinatnya ikut diputar balik
function brPos(e) {
  const r = FC.el.getBoundingClientRect(), d = FC.dpr;
  return FC.el.classList.contains("fcx-rot") ? [(e.clientY - r.top) * d, (r.right - e.clientX) * d] : [(e.clientX - r.left) * d, (e.clientY - r.top) * d];
}
function brawlDown(e) {
  const B = FC.br; if (!B) return;
  if (e.pointerType !== "mouse") B.touchUI = true;
  const [x, y] = brPos(e);
  if (x < FC.cv.width * 0.45) { B.stick = { id: e.pointerId, x0: x, y0: y, x, y }; return; }
  let best = null, bd = 1e9;
  for (const b of brBtns()) { const d = Math.hypot(b.x - x, b.y - y); if (d < b.r * 1.5 && d < bd) { bd = d; best = b; } }
  if (!best) { if (!B.touchUI) B.edge.atk = true; return; }   // klik mouse di tempat kosong = serang
  B.ptr[e.pointerId] = best.k; B.held[best.k] = true; B.edge[best.k] = true;
  navigator.vibrate && navigator.vibrate(8);
}
function brawlMove(e) {
  const B = FC.br; if (!B || !B.stick || B.stick.id !== e.pointerId) return;
  const [x, y] = brPos(e), s = B.stick, R = brU() * 50, was = (s.y - s.y0) / R;
  s.x = x; s.y = y;
  // stik jauh dari titik awal: titik awalnya ikut ketarik, biar balik arah tetap cepat
  const dx = s.x - s.x0, dy = s.y - s.y0, L = Math.hypot(dx, dy), max = R * 1.4;
  if (L > max) { s.x0 = s.x - dx / L * max; s.y0 = s.y - dy / L * max; }
  if (was <= 0.6 && (s.y - s.y0) / R > 0.6) B.edge.dn = true;
}
function brawlUp(e) {
  const B = FC && FC.br; if (!B) return;
  if (B.stick && B.stick.id === e.pointerId) B.stick = null;
  const k = B.ptr[e.pointerId]; if (k) { B.held[k] = false; delete B.ptr[e.pointerId]; }
}
// ---- gambar
function brawlStep(dt) {
  brTick(dt);
  brDraw(dt);
  const tm = $("mgTime"), s = brClock(Math.ceil(FC.br.left));
  if (tm && tm.textContent !== s) tm.textContent = s;
}
function brCamera(dt) {
  const B = FC.br, { cv } = FC, W = cv.width, H = cv.height, C = B.cam;
  let x0 = -470, x1 = 470, y0 = -470, y1 = 130;   // atas dikasih ruang buat kartu HUD
  for (const f of B.f) if (!f.out && f.resp <= 0) { x0 = Math.min(x0, f.x - 160); x1 = Math.max(x1, f.x + 160); y0 = Math.min(y0, f.y - BR_H - 140); y1 = Math.max(y1, f.y + 90); }
  x0 = Math.max(x0, -BR_BLAST.x); x1 = Math.min(x1, BR_BLAST.x); y0 = Math.max(y0, BR_BLAST.top + 100); y1 = Math.min(y1, BR_BLAST.bot);
  const asp = W / H, w = Math.min(2300, Math.max(1150, x1 - x0, (y1 - y0) * asp)), k = Math.min(1, dt * 3);
  C.x += ((x0 + x1) / 2 - C.x) * k; C.y += ((y0 + y1) / 2 - C.y) * k; C.w += (w - C.w) * k;
  return W / C.w;
}
function brDraw(dt) {
  const B = FC.br, { ctx, cv, dpr } = FC, W = cv.width, H = cv.height, t = now() / 1000;
  const s = brCamera(dt), C = B.cam;
  B._s = s;
  const sh = B.shake && !reduce ? B.shake * 26 * dpr : 0;
  const toS = (x, y) => [(x - C.x) * s + W / 2, (y - C.y) * s + H / 2];
  ctx.save();
  ctx.translate(W / 2 + (Math.random() - 0.5) * sh, H / 2 + (Math.random() - 0.5) * sh); ctx.scale(s, s); ctx.translate(-C.x, -C.y);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  brStage(ctx, t);
  if (B.find) { const F = B.find; findDraw(ctx, F.kind, F.x, F.y + Math.sin(t * 3) * 6, 60); }
  for (const c of B.crates) brCrate(ctx, c, t);
  for (const f of B.f) if (!f.out && f.resp <= 0) brShadow(ctx, f);
  for (const f of B.f.slice(1).concat(B.f[0])) if (!f.out && f.resp <= 0) brFighterDraw(ctx, f, t);
  for (const p of B.pies) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 12); brStamp(ctx, "🥧", 0, 0, 40, s); ctx.restore(); }
  brFx(ctx, s);
  ctx.restore();
  // panah buat yang lagi di luar layar
  for (const f of B.f) {
    if (f.out || f.resp > 0) continue;
    const [x, y] = toS(f.x, f.y - BR_H / 2), m = 30 * dpr;
    if (x > -10 && x < W + 10 && y > -10 && y < H + 10) continue;
    const cx = Math.max(m, Math.min(W - m, x)), cy = Math.max(m + 50 * dpr, Math.min(H - m, y)), a = Math.atan2(y - cy, x - cx);
    ctx.save(); ctx.translate(cx, cy);
    ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(30 * dpr, 0); ctx.lineTo(14 * dpr, -11 * dpr); ctx.lineTo(14 * dpr, 11 * dpr); ctx.closePath(); ctx.fillStyle = f.me ? "#FFE36B" : f.col; ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, 18 * dpr, 0, 7); ctx.fillStyle = f.col; ctx.fill(); ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTL; ctx.stroke();
    brTxt(ctx, f.me ? "★" : f.name[0], 0, 1 * dpr, 15, f.me ? OUTL : "#FFF", "center", 0);
    ctx.restore();
  }
  brHud(ctx, W, H, dpr, t);
}
// emoji stiker dengan ukuran dunia; ukurannya dibulatin biar cache stiker nggak meledak
function brStamp(ctx, e, x, y, size, s) {
  const px = Math.max(12, Math.round(size * s / 6) * 6);
  ctx.save(); ctx.translate(x, y); ctx.scale(1 / s, 1 / s); stamp(ctx, e, 0, 0, px); ctx.restore();
}
function brTxt(ctx, t, x, y, px, col, al = "center", sw = 5) {
  const d = FC.dpr; ctx.textAlign = al; ctx.textBaseline = "middle"; ctx.font = `900 ${px * d}px system-ui, sans-serif`;
  if (sw) { ctx.lineWidth = sw * d; ctx.strokeStyle = OUTL; ctx.lineJoin = "round"; ctx.strokeText(t, x, y); }
  ctx.fillStyle = col; ctx.fillText(t, x, y);
}
// Treetop isle: pulau rumput melayang dengan akar gantung, lampion, jamur; tiga rakit kayu yang ngambang di atasnya
function brStage(ctx, t) {
  const M = BR_MAIN, L = M.x0 - 14, R = M.x1 + 14;
  // badan batu dan tanah: mengecil ke bawah jadi ujung bergerigi
  ctx.beginPath(); ctx.moveTo(L, 0);
  ctx.lineTo(R, 0); ctx.quadraticCurveTo(R + 10, 70, R - 40, 120);
  const jag = [[0.82, 170], [0.62, 205], [0.42, 250], [0.2, 285], [0, 330], [-0.22, 280], [-0.44, 240], [-0.64, 200], [-0.84, 160]];
  for (const [u, y] of jag) ctx.lineTo(u * M.x1, y + Math.sin(u * 9) * 8);
  ctx.lineTo(L + 40, 120); ctx.quadraticCurveTo(L - 10, 70, L, 0); ctx.closePath();
  ctx.fillStyle = wGrad(ctx, 0, 330, [[0, "#8A5A3C"], [0.45, "#6B4430"], [1, "#3E2A2A"]]); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = OUTL; ctx.stroke();
  // lapisan batu
  ctx.strokeStyle = "rgba(34,24,43,.35)"; ctx.lineWidth = 4;
  for (const [x, y, w] of [[-300, 70, 120], [-60, 110, 160], [180, 80, 140], [-180, 170, 110], [70, 200, 90]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w / 2, y + 12, x + w, y); ctx.stroke(); }
  // kristal kecil nyala di badan pulau
  for (const [x, y, c] of [[-240, 120, "#7FE3F7"], [120, 150, "#F58AD8"], [300, 95, "#9BFF6B"]]) {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(x, y, 0, x, y, 46); g.addColorStop(0, c + "AA"); g.addColorStop(1, c + "00"); ctx.fillStyle = g; ctx.fillRect(x - 46, y - 46, 92, 92); ctx.restore();
    ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 14); ctx.lineTo(x - 9, y); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUTL; ctx.stroke();
  }
  // akar gantung bergoyang
  ctx.strokeStyle = "#4E7A3A"; ctx.lineWidth = 5;
  for (const [x, len, ph] of [[-380, 150, 0], [-130, 230, 1.3], [40, 300, 2.1], [250, 200, 3.4], [400, 120, 4.2]]) {
    const top = x < -350 || x > 350 ? 110 : 200, sw = Math.sin(t * 1.4 + ph) * 14;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.quadraticCurveTo(x + sw, top + len * 0.5, x + sw * 1.6, top + len); ctx.stroke();
    ctx.fillStyle = "#6FB04A"; ctx.beginPath(); ctx.ellipse(x + sw * 1.6, top + len, 9, 6, 0.5, 0, 7); ctx.fill();
  }
  // rumput di atas dengan pinggiran bergelombang
  ctx.beginPath(); ctx.moveTo(L - 6, -4);
  ctx.lineTo(R + 6, -4); ctx.lineTo(R + 6, 18);
  for (let x = R; x > L; x -= 34) ctx.quadraticCurveTo(x - 17, 40, x - 34, 18);
  ctx.closePath();
  ctx.fillStyle = wGrad(ctx, -4, 36, [[0, "#8EE06A"], [1, "#4FA640"]]); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = OUTL; ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(L + 10, 4); ctx.lineTo(R - 10, 4); ctx.stroke();
  // jamur dan bunga
  for (const [x, c] of [[-395, "#E8506A"], [-200, "#F3A93C"], [210, "#8A5BD6"], [372, "#E8506A"]]) {
    ctx.fillStyle = "#FFF3D9"; ctx.fillRect(x - 4, -18, 8, 16); ctx.strokeStyle = OUTL; ctx.lineWidth = 3; ctx.strokeRect(x - 4, -18, 8, 16);
    ctx.beginPath(); ctx.ellipse(x, -20, 15, 11, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FFF"; ctx.beginPath(); ctx.arc(x - 5, -24, 2.6, 0, 7); ctx.arc(x + 5, -26, 2, 0, 7); ctx.fill();
  }
  // tiang lampion di dua ujung
  for (const sx of [-1, 1]) {
    const x = sx * (M.x1 - 22);
    ctx.fillStyle = "#5A3A2A"; ctx.fillRect(x - 4, -96, 8, 92); ctx.lineWidth = 3; ctx.strokeStyle = OUTL; ctx.strokeRect(x - 4, -96, 8, 92);
    ctx.beginPath(); ctx.moveTo(x, -96); ctx.lineTo(x + sx * 26, -96); ctx.stroke();
    const lx = x + sx * 26, ly = -78 + Math.sin(t * 2 + sx) * 3, fl = 0.8 + 0.2 * Math.sin(t * 9 + sx * 3);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 80); g.addColorStop(0, `rgba(255,200,110,${0.55 * fl})`); g.addColorStop(1, "rgba(255,160,80,0)"); ctx.fillStyle = g; ctx.fillRect(lx - 80, ly - 80, 160, 160); ctx.restore();
    ctx.beginPath(); ctx.ellipse(lx, ly, 13, 16, 0, 0, 7); ctx.fillStyle = "#FF8A4A"; ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FFD27A"; ctx.beginPath(); ctx.ellipse(lx, ly, 6, 9, 0, 0, 7); ctx.fill();
  }
  // rakit kayu melayang (bisa ditembus dari bawah)
  for (const p of BR_PLATS) {
    if (!p.soft) continue;
    const w = p.x1 - p.x0, bob = 0;
    const g = ctx.createRadialGradient((p.x0 + p.x1) / 2, p.y + 30, 0, (p.x0 + p.x1) / 2, p.y + 30, 70);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; g.addColorStop(0, `rgba(127,227,247,${0.35 + 0.15 * Math.sin(t * 3 + p.x0)})`); g.addColorStop(1, "rgba(127,227,247,0)"); ctx.fillStyle = g; ctx.fillRect(p.x0, p.y, w, 90); ctx.restore();
    ctx.beginPath(); ctx.moveTo((p.x0 + p.x1) / 2 - 12, p.y + 16); ctx.lineTo((p.x0 + p.x1) / 2, p.y + 40 + Math.sin(t * 3 + p.x0) * 4); ctx.lineTo((p.x0 + p.x1) / 2 + 12, p.y + 16); ctx.closePath(); ctx.fillStyle = "#7FE3F7"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUTL; ctx.stroke();
    qzRR(ctx, p.x0 - 6, p.y + bob, w + 12, 20, 9); ctx.fillStyle = "#C98A55"; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = OUTL; ctx.stroke();
    ctx.strokeStyle = "rgba(34,24,43,.4)"; ctx.lineWidth = 3;
    for (let x = p.x0 + 30; x < p.x1 - 10; x += 38) { ctx.beginPath(); ctx.moveTo(x, p.y + 3); ctx.lineTo(x, p.y + 17); ctx.stroke(); }
    ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.beginPath(); ctx.moveTo(p.x0 + 4, p.y + 5); ctx.lineTo(p.x1 - 4, p.y + 5); ctx.stroke();
  }
}
function brShadow(ctx, f) {
  // bayangan di pijakan terdekat di bawah
  let gy = null;
  for (const p of BR_PLATS) if (f.x > p.x0 - 10 && f.x < p.x1 + 10 && p.y >= f.y - 1 && (gy == null || p.y < gy)) gy = p.y;
  if (gy == null) return;
  const k = Math.max(0.2, 1 - (gy - f.y) / 400);
  ctx.fillStyle = `rgba(34,24,43,${0.3 * k})`; ctx.beginPath(); ctx.ellipse(f.x, gy, 26 * k, 6 * k, 0, 0, 7); ctx.fill();
}
function brCrate(ctx, c, t) {
  ctx.save(); ctx.translate(c.x, c.y);
  if (!c.on) {
    // parasut
    const sw = Math.sin(t * 2.4 + c.sw) * 0.12; ctx.rotate(sw);
    ctx.strokeStyle = OUTL; ctx.lineWidth = 2;
    for (const dx of [-30, 0, 30]) { ctx.beginPath(); ctx.moveTo(dx * 0.6, -40); ctx.lineTo(dx, -110); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-50, -108); ctx.quadraticCurveTo(0, -170, 50, -108); ctx.quadraticCurveTo(25, -98, 0, -108); ctx.quadraticCurveTo(-25, -98, -50, -108); ctx.closePath();
    ctx.fillStyle = c.k === "ham" ? "#E8506A" : "#F3C33A"; ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
  } else if (c.life < 3 && Math.floor(t * 8) % 2) { ctx.restore(); return; }
  qzRR(ctx, -26, -48, 52, 46, 8); ctx.fillStyle = "#B97A45"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUTL; ctx.stroke();
  ctx.strokeStyle = "rgba(34,24,43,.45)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-24, -46); ctx.lineTo(24, -4); ctx.moveTo(24, -46); ctx.lineTo(-24, -4); ctx.stroke();
  ctx.restore();
  brStamp(ctx, BR_WPN[c.k].e, c.x, c.y - 25 - (c.on ? 4 + Math.sin(t * 4) * 3 : 0), 30, FC.br._s || 1);
}
// tokoh chibi: badan bulat, mata gede, tangan bulat yang ninju; aksesori beda tiap tokoh
function brFighterDraw(ctx, f, t) {
  const B = FC.br, a = f.atk, mv = a && a.mv, act = a && !a.chg && a.t >= mv.st && a.t < mv.st + mv.ac + mv.rc * 0.4;
  ctx.save(); ctx.translate(f.x, f.y);
  if (f.inv > 0 && f.dodgeT <= 0 && Math.floor(t * 14) % 2) ctx.globalAlpha = 0.45;
  if (f.dodgeT > 0) ctx.globalAlpha = 0.55;
  if (f.hover > 0) { wCloud(ctx, -34, 10, 16, "#FFFFFF"); }
  const run = f.ground && Math.abs(f.vx) > 60, ph = f.anim * 14;
  const sqy = 1 - f.sq * 0.35 + (!f.ground ? Math.min(0.12, Math.abs(f.vy) / 9000) : 0), sqx = 1 + f.sq * 0.35;
  const fc = f.face, stunned = f.stun > 0.05;
  if (stunned) ctx.rotate(Math.sin(t * 30) * 0.08 + brSign(f.vx) * 0.2);
  // kaki
  ctx.fillStyle = OUTL;
  for (const s of [-1, 1]) {
    let fx = s * 11, fy = -4;
    if (run) { fx += Math.sin(ph + (s > 0 ? 0 : Math.PI)) * 9; fy -= Math.max(0, Math.cos(ph + (s > 0 ? 0 : Math.PI))) * 6; }
    if (!f.ground && !stunned) fy -= 6;
    if (mv && act && mv.arm === 3 && s === fc) { fx = fc * 34; fy = -10; }
    ctx.beginPath(); ctx.ellipse(fx, fy, 11, 7, 0, 0, 7); ctx.fill();
  }
  ctx.scale(sqx, sqy);
  // charge: lingkaran nyala berdenyut
  if (a && a.chg) {
    const k = Math.min(1, a.charge / 0.7);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(0, -34, 10, 0, -34, 60 + k * 20); g.addColorStop(0, `rgba(255,220,90,${0.25 + 0.5 * k})`); g.addColorStop(1, "rgba(255,120,40,0)"); ctx.fillStyle = g; ctx.fillRect(-90, -124, 180, 180); ctx.restore();
  }
  // aksesori di belakang kepala
  if (f.look === "bun") for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * 11, -58); ctx.rotate(s * 0.25 + Math.sin(t * 3 + s) * 0.06 - (stunned ? s * 0.5 : 0)); ctx.beginPath(); ctx.ellipse(0, -18, 8, 22, 0, 0, 7); ctx.fillStyle = f.col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUTL; ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -18, 3.5, 14, 0, 0, 7); ctx.fillStyle = "#FFC9D6"; ctx.fill(); ctx.restore(); }
  if (f.look === "cat") for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 6, -58); ctx.lineTo(s * 20, -76); ctx.lineTo(s * 25, -50); ctx.closePath(); ctx.fillStyle = f.col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUTL; ctx.stroke(); }
  if (f.look === "ant") { ctx.beginPath(); ctx.moveTo(0, -60); ctx.quadraticCurveTo(fc * 6, -74, fc * 2 + Math.sin(t * 5) * 3, -84); ctx.lineWidth = 3; ctx.strokeStyle = OUTL; ctx.stroke(); const bx = fc * 2 + Math.sin(t * 5) * 3; wGlow(ctx, bx, -86, 16, "rgba(255,240,120,.7)"); ctx.beginPath(); ctx.arc(bx, -86, 6, 0, 7); ctx.fillStyle = "#FFE36B"; ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); }
  // badan
  ctx.beginPath(); ctx.ellipse(0, -34, 27, 29, 0, 0, 7); ctx.fillStyle = f.col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUTL; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(fc * 4, -24, 15, 12, 0, 0, 7); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fill();
  if (f.flash > 0) { ctx.beginPath(); ctx.ellipse(0, -34, 27, 29, 0, 0, 7); ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fill(); }
  // ikat kepala pemain: merah dengan ujung berkibar
  if (f.look === "band") {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -34, 27, 29, 0, 0, 7); ctx.clip();
    ctx.fillStyle = "#E8323F"; ctx.fillRect(-30, -56, 60, 9); ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, -34, 27, 29, 0, 0, 7); ctx.lineWidth = 4; ctx.strokeStyle = OUTL; ctx.stroke();
    const fl = Math.sin(t * 12) * 4 + brSign(f.vx) * -6;
    ctx.beginPath(); ctx.moveTo(-fc * 24, -52); ctx.quadraticCurveTo(-fc * 38, -60 + fl, -fc * 48, -50 + fl); ctx.lineTo(-fc * 44, -44 + fl); ctx.quadraticCurveTo(-fc * 34, -50, -fc * 24, -47); ctx.closePath(); ctx.fillStyle = "#E8323F"; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
  }
  // mata
  const ex = fc * 7, blink = Math.floor(t * 0.7 + f.i * 0.3) % 6 === 0 && (t * 0.7 + f.i * 0.3) % 1 < 0.12;
  for (const s of [-1, 1]) {
    const x = ex + s * 9, y = -40;
    if (stunned) { ctx.strokeStyle = OUTL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke(); continue; }
    if (blink) { ctx.strokeStyle = OUTL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.stroke(); continue; }
    ctx.beginPath(); ctx.ellipse(x, y, 6, 8, 0, 0, 7); ctx.fillStyle = "#FFF"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUTL; ctx.stroke();
    ctx.beginPath(); ctx.arc(x + fc * 2, y + 1, 3.6, 0, 7); ctx.fillStyle = OUTL; ctx.fill();
    ctx.fillStyle = "#FFF"; ctx.beginPath(); ctx.arc(x + fc * 2 + 1, y - 1, 1.3, 0, 7); ctx.fill();
  }
  // alis marah waktu ngecas atau mukul berat
  if (a && (a.chg || mv.heavy) && !stunned) { ctx.strokeStyle = OUTL; ctx.lineWidth = 3; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ex + s * 4, -50); ctx.lineTo(ex + s * 14, -54); ctx.stroke(); } }
  // mulut
  ctx.strokeStyle = OUTL; ctx.lineWidth = 2.5; ctx.beginPath();
  if (stunned) ctx.arc(ex, -24, 4, 0, 7); else if (act) { ctx.moveTo(ex - 4, -26); ctx.lineTo(ex + 4, -26); } else ctx.arc(ex, -28, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // pipi merah makin parah makin tinggi persennya
  if (f.dmg > 40) { ctx.fillStyle = `rgba(255,90,90,${Math.min(0.6, f.dmg / 250)})`; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(ex + s * 15, -30, 5, 3, 0, 0, 7); ctx.fill(); } }
  // tangan: diam di samping, maju waktu mukul
  let hx = fc * 24, hy = -24, bx = -fc * 22, by = -22;
  if (!f.ground && !stunned) { hy = -34; by = -34; }
  if (run) { hy += Math.sin(ph) * 3; by -= Math.sin(ph) * 3; }
  if (a && a.chg) { hx = -fc * 14; hy = -30; }
  if (act) {
    const k = Math.min(1, (a.t - mv.st) / 0.05);
    if (mv.arm === 1 || mv.arm === 4) { hx = fc * (24 + (mv.box[0] - 10) * k); hy = -36; }
    if (mv.arm === 2) { hx = fc * 6; hy = -60 - 26 * k; }
    if (mv.arm === 5) { hx = fc * 40; hy = -44; }
  }
  // senjata di tangan depan
  if (f.wpn && f.wpn.k === "ham") {
    const sw = act && mv.arm === 4 ? -1.6 + 3.0 * Math.min(1, (a.t - mv.st) / 0.08) : a && a.chg ? -2.2 : -0.5;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(fc * sw + (fc < 0 ? Math.PI : 0)); ctx.scale(fc, 1);
    ctx.fillStyle = "#8A5A34"; ctx.fillRect(-4, -46, 8, 50); ctx.lineWidth = 3; ctx.strokeStyle = OUTL; ctx.strokeRect(-4, -46, 8, 50);
    qzRR(ctx, -22, -66, 44, 26, 6); ctx.fillStyle = "#C9CED6"; ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(-18, -62, 36, 5);
    ctx.restore();
  }
  if (f.wpn && f.wpn.k === "pie" && !(act && mv.arm === 5)) brStamp(ctx, "🥧", hx, hy - 10, 30, B._s || 1);
  for (const [x, y] of [[bx, by], [hx, hy]]) { ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fillStyle = f.col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUTL; ctx.stroke(); }
  // jejak pukulan
  if (act && mv.box && a.t < mv.st + mv.ac) {
    ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = mv.heavy ? "#FFE36B" : "#FFFFFF"; ctx.lineWidth = mv.heavy ? 9 : 6;
    const [dx, dy, w] = mv.box;
    ctx.beginPath();
    if (mv.both) { ctx.ellipse(0, dy + 8, w / 2, 12, 0, Math.PI, 0); }
    else if (mv.arm === 2) ctx.arc(0, dy + 10, w / 2, -Math.PI * 0.85, -Math.PI * 0.15);
    else if (fc > 0) ctx.arc(dx - w / 2, dy, w * 0.75, -0.9, 0.9); else ctx.arc(-dx + w / 2, dy, w * 0.75, Math.PI - 0.9, Math.PI + 0.9);
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  // label nama kecil di atas kepala; pemain dapet segitiga kuning
  const s = B._s || 1, ty = f.y - BR_H - 30 - (f.look === "bun" ? 22 : f.look === "ant" ? 18 : 6);
  ctx.save(); ctx.translate(f.x, ty); ctx.scale(1 / s, 1 / s);
  const d = FC.dpr;
  if (f.me) { ctx.beginPath(); ctx.moveTo(-9 * d, -6 * d); ctx.lineTo(9 * d, -6 * d); ctx.lineTo(0, 6 * d); ctx.closePath(); ctx.fillStyle = "#FFE36B"; ctx.fill(); ctx.lineWidth = 3 * d; ctx.strokeStyle = OUTL; ctx.stroke(); }
  else brTxt(ctx, f.name, 0, 0, 12, f.col, "center", 4);
  ctx.restore();
}
function brFx(ctx, s) {
  const B = FC.br;
  for (const p of B.fx) {
    const k = p.t / p.life;
    if (p.k === "spark") { ctx.globalAlpha = 1 - k; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 5 * (1 - k * 0.5), 0, 7); ctx.fill(); }
    else if (p.k === "puff") { ctx.globalAlpha = 0.7 * (1 - k); ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k), 0, 7); ctx.fill(); }
    else if (p.k === "ring") { ctx.globalAlpha = 1 - k; ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(p.x, p.y, 20 + 40 * k, 6 + 10 * k, 0, 0, 7); ctx.stroke(); }
    else if (p.k === "hit") {
      // bintang tabrakan
      ctx.globalAlpha = 1 - k; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 4); ctx.scale(p.s * (0.6 + k), p.s * (0.6 + k));
      ctx.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 14 : 38, an = i / 16 * Math.PI * 2; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath();
      ctx.fillStyle = p.col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUTL; ctx.stroke(); ctx.restore();
    } else if (p.k === "num") {
      ctx.globalAlpha = 1 - k * k; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 / s, 1 / s); brTxt(ctx, `${p.n}%`, 0, 0, 16 + p.n * 0.6, p.n >= 12 ? "#FFE36B" : "#FFFFFF", "center", 4); ctx.restore();
    } else if (p.k === "blast") {
      // KO: sinar warna tokoh dari pinggir layar ke tengah
      ctx.globalAlpha = 1 - k; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      const L = 900 * Math.min(1, k * 4), w = 120 * (1 - k);
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.3, p.col); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -w); ctx.lineTo(L, -w * 0.15); ctx.lineTo(L, w * 0.15); ctx.lineTo(0, w); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
// HUD: kartu tiap petarung (persen, nyawa, KO), hitung mundur, tulisan akhir, tombol sentuh
function brHud(ctx, W, H, dpr, t) {
  const B = FC.br, n = B.f.length, u = dpr, cw = Math.min(124 * u, (W - 260 * u) / n), ch = 52 * u, gap = 8 * u, x0 = W / 2 - (cw * n + gap * (n - 1)) / 2, y0 = 14 * u;
  B.f.forEach((f, i) => {
    const x = x0 + i * (cw + gap), y = y0;
    ctx.globalAlpha = f.out ? 0.45 : 1;
    qzRR(ctx, x, y + 4 * u, cw, ch, 14 * u); ctx.fillStyle = OUTL; ctx.fill();
    qzRR(ctx, x, y, cw, ch, 14 * u); ctx.fillStyle = f.me ? "rgba(255,248,236,.95)" : "rgba(255,255,255,.88)"; ctx.fill(); ctx.lineWidth = 3 * u; ctx.strokeStyle = OUTL; ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 22 * u, y + ch / 2, 14 * u, 0, 7); ctx.fillStyle = f.col; ctx.fill(); ctx.lineWidth = 3 * u; ctx.stroke();
    brTxt(ctx, f.me ? "★" : f.name[0], x + 22 * u, y + ch / 2 + 1 * u, 13, f.me ? OUTL : "#FFF", "center", 0);
    const d = f.dmg, col = d < 50 ? "#4A4458" : d < 100 ? "#E89A1E" : d < 150 ? "#E8602A" : "#D8232F";
    const kick = f.flash > 0 ? 1.25 : 1;
    brTxt(ctx, f.out ? "OUT" : f.resp > 0 ? "—" : `${d}%`, x + cw - 10 * u, y + 20 * u, (f.out ? 14 : 19) * kick, col, "right", 0);
    for (let k = 0; k < BR_STOCK; k++) { ctx.beginPath(); ctx.arc(x + 44 * u + k * 11 * u, y + 38 * u, 4 * u, 0, 7); ctx.fillStyle = k < f.stocks ? (f.me ? "#E8323F" : f.col) : "rgba(34,24,43,.12)"; ctx.fill(); ctx.lineWidth = 1.5 * u; ctx.strokeStyle = OUTL; ctx.stroke(); }
    if (f.kos) brTxt(ctx, `💥${f.kos}`, x + cw - 10 * u, y + 39 * u, 11, "#6A5F78", "right", 0);
    if (f.wpn) stamp(ctx, BR_WPN[f.wpn.k].e, x + 34 * u, y + 14 * u, 13 * u);   // senjata: lencana kecil di pojok avatar
    ctx.globalAlpha = 1;
  });
  // tombol sentuh
  if (B.touchUI && B.phase !== "end") {
    if (B.stick) {
      const s = B.stick, R = brU() * 50;
      ctx.beginPath(); ctx.arc(s.x0, s.y0, R * 1.2, 0, 7); ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fill(); ctx.lineWidth = 3 * u; ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.stroke();
      const dx = s.x - s.x0, dy = s.y - s.y0, L = Math.hypot(dx, dy), m = Math.min(L, R);
      ctx.beginPath(); ctx.arc(s.x0 + (L ? dx / L * m : 0), s.y0 + (L ? dy / L * m : 0), R * 0.5, 0, 7); ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fill(); ctx.lineWidth = 3 * u; ctx.strokeStyle = OUTL; ctx.stroke();
    } else {
      const R = brU() * 50, cx = 110 * u, cy = H - 100 * u;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.2, 0, 7); ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fill(); ctx.lineWidth = 3 * u; ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, 7); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fill();
    }
    for (const b of brBtns()) {
      const on = B.held[b.k];
      ctx.beginPath(); ctx.arc(b.x, b.y + 4 * u, b.r, 0, 7); ctx.fillStyle = "rgba(34,24,43,.5)"; ctx.fill();
      ctx.beginPath(); ctx.arc(b.x, b.y + (on ? 3 * u : 0), b.r, 0, 7); ctx.fillStyle = on ? "rgba(255,227,107,.95)" : "rgba(255,255,255,.72)"; ctx.fill(); ctx.lineWidth = 3 * u; ctx.strokeStyle = OUTL; ctx.stroke();
      if (b.k === "hvy" && FC.br.f[0].atk && FC.br.f[0].atk.chg) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 5 * u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, FC.br.f[0].atk.charge / 0.7)); ctx.lineWidth = 5 * u; ctx.strokeStyle = "#FFE36B"; ctx.stroke(); }
      if (b.k === "jump") brTxt(ctx, b.lab, b.x, b.y - 4 * u + (on ? 3 * u : 0), b.r / u * 0.9, OUTL, "center", 0);
      else stamp(ctx, b.lab, b.x, b.y - 5 * u + (on ? 3 * u : 0), b.r * 0.75);
      brTxt(ctx, b.txt, b.x, b.y + b.r * 0.58 + (on ? 3 * u : 0), 9, OUTL, "center", 0);
    }
  }
  // petunjuk main pertama kali
  if (B.phase === "fight" && B.tip > 0) {
    ctx.globalAlpha = Math.min(1, B.tip);
    const msg = B.touchUI ? ["Left thumb: move · ⤒ jump", "👊 hit · hold 💥 for a heavy · 💨 dodge", "Knock them off the island!"] : ["Arrows/WASD move · Space/W jump", "J hit · hold K heavy · L dodge", "Knock them off the island!"];
    msg.forEach((m, i) => brTxt(ctx, m, W / 2, 96 * u + i * 26 * u, i === 2 ? 18 : 15, i === 2 ? "#FFE36B" : "#FFFFFF", "center", 5));
    ctx.globalAlpha = 1;
  }
  // tulisan KO pemain
  for (const p of B.fx) if (p.k === "kotxt") { const k = p.t / p.life; ctx.globalAlpha = 1 - k * k; brTxt(ctx, "KO! +3", W / 2, H * 0.32 - k * 30 * u, 34 + 10 * (1 - k), "#FFE36B", "center", 7); ctx.globalAlpha = 1; }
  if (B.f[0].resp > 0 && !B.f[0].out && B.phase === "fight") brTxt(ctx, `${B.f[0].stocks} ${B.f[0].stocks === 1 ? "life" : "lives"} left`, W / 2, H * 0.4, 22, "#FFFFFF", "center", 6);
  // hitung mundur
  if (B.phase === "count") {
    const n = Math.ceil(B.ct), f = B.ct - Math.floor(B.ct), sc = 1 + f * 0.6;
    if (n <= 3 && n >= 1) brTxt(ctx, String(n), W / 2, H * 0.42, 90 * sc, "#FFFFFF", "center", 10);
  } else if (B.phase === "fight" && B.ft < 0.7) { const k = B.ft / 0.7; ctx.globalAlpha = 1 - k; brTxt(ctx, "BONK!", W / 2, H * 0.42, 80 + 40 * k, "#FFE36B", "center", 10); ctx.globalAlpha = 1; }
  // akhir: GAME! lalu urutan juara
  if (B.phase === "end") {
    const k = Math.min(1, B.et / 0.35);
    ctx.fillStyle = `rgba(14,10,24,${0.45 * k})`; ctx.fillRect(0, 0, W, H);
    if (B.et < 1.1) brTxt(ctx, "GAME!", W / 2, H * 0.45, 70 + 30 * (1 - k), "#FFE36B", "center", 10);
    else {
      const q = Math.min(1, (B.et - 1.1) / 0.4), rw = Math.min(420 * u, W - 40 * u), rh = 40 * u, top = H / 2 - (rh + 8 * u) * 2 + 10 * u;
      brTxt(ctx, FC.place === 0 ? "You win!" : `You came ${BR_ORD[FC.place]}`, W / 2, top - 30 * u, 28, "#FFFFFF", "center", 6);
      B.order.forEach((f, i) => {
        const x = W / 2 - rw / 2 + (1 - q) * W * (i % 2 ? 1 : -1) * 0.3, y = top + i * (rh + 8 * u);
        qzRR(ctx, x, y, rw, rh, 12 * u); ctx.fillStyle = f.me ? "#FFE36B" : "#FFF8EC"; ctx.fill(); ctx.lineWidth = 3 * u; ctx.strokeStyle = OUTL; ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 70 * u, y + rh / 2, 11 * u, 0, 7); ctx.fillStyle = f.col; ctx.fill(); ctx.stroke();
        brTxt(ctx, BR_ORD[i], x + 16 * u, y + rh / 2 + 1 * u, 16, OUTL, "left", 0);
        brTxt(ctx, f.name, x + 90 * u, y + rh / 2 + 1 * u, 16, OUTL, "left", 0);
        brTxt(ctx, `${f.kos} KO${f.kos === 1 ? "" : "s"}`, x + rw - 16 * u, y + rh / 2 + 1 * u, 15, OUTL, "right", 0);
      });
    }
  }
}
// dunia Bonk brawl: langit senja, pulau-pulau jauh yang ngambang, awan lewat
function wBrawl(ctx, W, H, dpr, t) {
  ctx.drawImage(wLayer("brawl", W, H, (c, w, h) => {
    c.fillStyle = wGrad(c, 0, h, [[0, "#2E2A6E"], [0.45, "#8A4FA8"], [0.75, "#F0807A"], [1, "#FFC36B"]]); c.fillRect(0, 0, w, h);
    const r = Dapur.rng(41);
    for (let i = 0; i < 50; i++) { c.fillStyle = `rgba(255,250,230,${0.2 + r() * 0.5})`; c.fillRect(r() * w, r() * h * 0.35, 1.6 * dpr, 1.6 * dpr); }
    // matahari bergaris
    const sx = w * 0.72, sy = h * 0.78, sr = Math.min(w, h) * 0.2;
    wGlow(c, sx, sy, sr * 2.6, "rgba(255,200,120,.5)");
    c.save(); c.beginPath(); c.arc(sx, sy, sr, 0, 7); c.clip();
    c.fillStyle = wGrad(c, sy - sr, sy + sr, [[0, "#FFE9A0"], [1, "#FF8A5A"]]); c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    c.fillStyle = "rgba(240,128,122,.9)"; for (let i = 0; i < 5; i++) c.fillRect(sx - sr, sy + sr * (0.1 + i * 0.2), sr * 2, sr * 0.06 * (i + 1));
    c.restore();
    // pulau jauh: siluet ungu dengan akar gantung
    for (const [x, y, s, a] of [[0.07, 0.62, 0.07, 0.5], [0.33, 0.2, 0.035, 0.35], [0.95, 0.3, 0.05, 0.4], [0.18, 0.9, 0.09, 0.55]]) {
      const cx = w * x, cy = h * y, R = Math.min(w, h) * s;
      c.globalAlpha = a; c.fillStyle = "#4A2F78";
      c.beginPath(); c.moveTo(cx - R, cy); c.quadraticCurveTo(cx, cy - R * 0.25, cx + R, cy); c.lineTo(cx + R * 0.5, cy + R * 0.5); c.lineTo(cx, cy + R * 1.2); c.lineTo(cx - R * 0.55, cy + R * 0.45); c.closePath(); c.fill();
      c.fillRect(cx - R * 0.05, cy - R * 0.6, R * 0.1, R * 0.5); c.beginPath(); c.arc(cx, cy - R * 0.66, R * 0.3, 0, 7); c.fill();
      c.globalAlpha = 1;
    }
  }), 0, 0);
  // awan yang lewat pelan
  for (let i = 0; i < 5; i++) {
    const sp = 8 + i * 5, x = ((t * sp * dpr + i * W * 0.31) % (W + 300 * dpr)) - 150 * dpr, y = H * (0.12 + i * 0.13);
    // awan lembut tanpa garis (yang bergaris dipakai buat benda yang bisa dipijak)
    ctx.globalAlpha = 0.28; ctx.fillStyle = i % 2 ? "#FFD9E8" : "#FFE9D0"; const r = (18 + i * 4) * dpr;
    for (const [dx, dy, k] of [[0, 0, 1], [0.9, -0.35, 0.8], [1.8, 0, 0.9], [0.9, 0.25, 0.85]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, k * r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  wFlies(ctx, W, H, dpr, t, 8, "rgba(255,230,140,.8)", [0.5, 0.95]);
}
Object.assign(WORLDS, { brawl: wBrawl });
// ikon game: si pemain ngepalin tangan
MG_ART.brawl = (ctx, S) => {
  const k = S / 128; ctx.translate(S * 0.44, S * 0.84); ctx.scale(k * 1.2, k * 1.2);
  const f = brNew(0, { name: "You", col: "#FFF1D6", look: "band", me: true });
  f.atk = { mv: BR_MV.jab, t: 0.08, hit: new Set(), charge: 0, chg: false }; f.ground = BR_MAIN;
  const keep = FC; FC = { br: { _s: 1 }, dpr: 1 };
  try { f.x = 0; f.y = 0; brFighterDraw(ctx, Object.assign(f, { inv: 0 }), 1.3); } finally { FC = keep; }
};

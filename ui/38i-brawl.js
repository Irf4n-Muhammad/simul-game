// ================================================================ v84: Bonk brawl, mini game adu jotos di pulau melayang
// Gaya platform fighter: lu lawan 3 CPU (Kiko, Bolt, Mimi) di Sunspire, kuil marmer melayang. Tiap pukulan nambah persen kerusakan;
// makin tinggi persennya, makin jauh mentalnya. Keluar dari batas layar = jatuh (KO). Tiga nyawa, 2 menit.
// Senjata turun dari langit dalam pilar cahaya: palu (pukulan lebih jauh dan keras) dan bola percik (dilempar; di kode masih `pie`). Dodge = kebal sebentar.
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
  if (B.slow > 0) { B.slow -= dt; dt *= 0.3; }
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
  B.fx.push({ k: "hit", x: hx, y: hy, t: 0, life: 0.26, s: 0.6 + Math.min(1.2, dmg / 12), big: K > 900 });
  if (K > 900) B.punch = 1;
  for (let i = 0; i < 4 + Math.min(10, dmg); i++) { const an = Math.random() * Math.PI * 2, sp = 300 + Math.random() * 700; B.fx.push({ k: "spark", x: hx, y: hy, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 900, t: 0, life: 0.25 + Math.random() * 0.2, col: i % 2 ? b.col : "#FFF2C8" }); }
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
  B.shake = 0.45; B.flash = 0.12; B.slow = 0.45; Sfx.play("ko");   // KO: kilat putih + gerak lambat sebentar
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
// ---- gambar (v84b, Muhammad 9 Nov: "lebih classy"): tokoh berproporsi pahlawan dengan pose per gerakan, panggung kuil
// melayang dari marmer dan emas, latar berlapis yang ikut kamera, HUD panel gelap miring, efek tebasan, bayangan sisa gerak,
// kilat layar dan gerak lambat waktu KO. Semua digambar sendiri pakai kanvas (tanpa emoji), gaya sendiri.
const BR_LOOK = {
  band: { main: "#F2EEE6", dark: "#2B2238", skin: "#E9C29E", acc: "#E8323F", glove: "#3A2A2A" },
  cat: { main: "#E8506A", dark: "#5A1E33", skin: "#FFE3D3", acc: "#FFD15C", glove: "#5A1E33" },
  ant: { main: "#4A7BE0", dark: "#1E2F5E", skin: "#C9D6E8", acc: "#7FF3FF", glove: "#1E2F5E" },
  bun: { main: "#F3A93C", dark: "#6B3F12", skin: "#FFF4E6", acc: "#8A5BD6", glove: "#6B3F12" },
};
const BR_GOLD = "#E8B64C";
function brawlStep(dt) {
  brTick(dt);
  brDraw(dt);
  const tm = $("mgTime"), s = brClock(Math.ceil(FC.br.left));
  if (tm && tm.textContent !== s) tm.textContent = s;
}
function brCamera(dt) {
  const B = FC.br, { cv } = FC, W = cv.width, H = cv.height, C = B.cam;
  let x0 = -470, x1 = 470, y0 = -435, y1 = 100;   // atas dikasih ruang buat kartu HUD
  for (const f of B.f) if (!f.out && f.resp <= 0) { x0 = Math.min(x0, f.x - 160); x1 = Math.max(x1, f.x + 160); y0 = Math.min(y0, f.y - BR_H - 140); y1 = Math.max(y1, f.y + 90); }
  x0 = Math.max(x0, -BR_BLAST.x); x1 = Math.min(x1, BR_BLAST.x); y0 = Math.max(y0, BR_BLAST.top + 100); y1 = Math.min(y1, BR_BLAST.bot);
  const asp = W / H, w = Math.min(2300, Math.max(1020, x1 - x0, (y1 - y0) * asp)), k = Math.min(1, dt * 3);
  C.x += ((x0 + x1) / 2 - C.x) * k; C.y += ((y0 + y1) / 2 - C.y) * k; C.w += (w - C.w) * k;
  if (B.punch > 0) B.punch = Math.max(0, B.punch - dt * 2.5);
  return W / C.w * (1 + 0.05 * (B.punch || 0));   // pukulan keras: kamera nyentak masuk dikit
}
function brDraw(dt) {
  const B = FC.br, { ctx, cv, dpr } = FC, W = cv.width, H = cv.height, t = now() / 1000;
  const s = brCamera(dt), C = B.cam;
  B._s = s;
  const sh = B.shake && !reduce ? B.shake * 22 * dpr : 0;
  const toS = (x, y) => [(x - C.x) * s + W / 2, (y - C.y) * s + H / 2];
  ctx.save();
  ctx.translate(W / 2 + (Math.random() - 0.5) * sh, H / 2 + (Math.random() - 0.5) * sh); ctx.scale(s, s); ctx.translate(-C.x, -C.y);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  brStage(ctx, t);
  if (B.find) { const F = B.find; findDraw(ctx, F.kind, F.x, F.y + Math.sin(t * 3) * 6, 60); }
  for (const c of B.crates) brCrate(ctx, c, t);
  for (const f of B.f) if (!f.out && f.resp <= 0) brShadow(ctx, f);
  for (const f of B.f.slice(1).concat(B.f[0])) {
    if (f.out || f.resp > 0) { f.ghost = []; continue; }
    brGhosts(ctx, f, dt);
    brHero(ctx, f, t);
  }
  for (const p of B.pies) brOrb(ctx, p.x, p.y, 15, t, p.own.col);
  brFx(ctx, s);
  ctx.restore();
  brVignette(ctx, W, H);
  // kilat putih waktu ada yang KO
  if (B.flash > 0) { ctx.fillStyle = `rgba(255,250,235,${Math.min(0.55, B.flash * 4)})`; ctx.fillRect(0, 0, W, H); B.flash -= dt; }
  // panah buat yang lagi di luar layar
  for (const f of B.f) {
    if (f.out || f.resp > 0) continue;
    const [x, y] = toS(f.x, f.y - BR_H / 2), m = 30 * dpr;
    if (x > -10 && x < W + 10 && y > -10 && y < H + 10) continue;
    const cx = Math.max(m, Math.min(W - m, x)), cy = Math.max(m + 64 * dpr, Math.min(H - m, y)), a = Math.atan2(y - cy, x - cx);
    ctx.save(); ctx.translate(cx, cy);
    ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(30 * dpr, 0); ctx.lineTo(16 * dpr, -9 * dpr); ctx.lineTo(16 * dpr, 9 * dpr); ctx.closePath(); ctx.fillStyle = BR_GOLD; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, 19 * dpr, 0, 7); ctx.fillStyle = "rgba(18,12,30,.85)"; ctx.fill(); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = BR_GOLD; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 17 * dpr, 0, 7); ctx.clip(); ctx.translate(0, 26 * dpr); ctx.scale(0.62 * dpr, 0.62 * dpr); brHead(ctx, f, 0, -42, t, false); ctx.restore();
    ctx.restore();
  }
  brHud(ctx, W, H, dpr, t);
}
function brTxt(ctx, t, x, y, px, col, al = "center", sw = 5, it = false) {
  const d = FC.dpr; ctx.textAlign = al; ctx.textBaseline = "middle"; ctx.font = `${it ? "italic " : ""}900 ${px * d}px system-ui, sans-serif`;
  if (sw) { ctx.lineWidth = sw * d; ctx.strokeStyle = "#120C1E"; ctx.lineJoin = "round"; ctx.strokeText(t, x, y); }
  ctx.fillStyle = col; ctx.fillText(t, x, y);
}
// tulisan judul: miring, isi gradasi emas, garis gelap, cahaya lembut
function brTitle(ctx, t, x, y, px, a = 1) {
  const d = FC.dpr; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `italic 900 ${px * d}px system-ui, sans-serif`;
  ctx.shadowColor = "rgba(255,190,80,.6)"; ctx.shadowBlur = 24 * d; ctx.lineWidth = Math.max(4, px * 0.12) * d; ctx.strokeStyle = "#120C1E"; ctx.lineJoin = "round"; ctx.strokeText(t, x, y);
  ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, y - px * d * 0.5, 0, y + px * d * 0.5); g.addColorStop(0, "#FFF7DA"); g.addColorStop(0.5, "#F5CF6A"); g.addColorStop(1, "#C9862E");
  ctx.fillStyle = g; ctx.fillText(t, x, y); ctx.restore();
}

// ---- panggung: Sunspire, kuil marmer melayang dengan pinggiran emas, panji, dan dua tungku api
function brStage(ctx, t) {
  const M = BR_MAIN, L = M.x0 - 12, R = M.x1 + 12;
  // dasar batu: tangga terbalik yang mengecil ke ujung kristal
  const steps = [[32, 0], [96, 34], [150, 90], [200, 160], [250, 250], [300, 330]];
  ctx.beginPath(); ctx.moveTo(L + 8, 32);
  for (const [y, ins] of steps) ctx.lineTo(L + 8 + ins, y);
  ctx.lineTo(0, 360);
  for (let i = steps.length - 1; i >= 0; i--) { const [y, ins] = steps[i]; ctx.lineTo(R - 8 - ins, y); }
  ctx.closePath();
  ctx.fillStyle = wGrad(ctx, 32, 360, [[0, "#6E6680"], [0.4, "#4A4260"], [1, "#221C34"]]); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = "#120C1E"; ctx.stroke();
  // garis susunan batu
  ctx.strokeStyle = "rgba(18,12,30,.35)"; ctx.lineWidth = 2;
  for (const [y, ins] of steps.slice(1)) { ctx.beginPath(); ctx.moveTo(L + 8 + ins, y); ctx.lineTo(R - 8 - ins, y); ctx.stroke(); }
  for (let x = -360; x <= 360; x += 72) { ctx.beginPath(); ctx.moveTo(x, 34); ctx.lineTo(x + (x < 0 ? 8 : -8), 92); ctx.stroke(); }
  // lingkaran rune emas di badan kuil, denyut pelan
  const rp = 0.55 + 0.25 * Math.sin(t * 1.6);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  let g = ctx.createRadialGradient(0, 130, 0, 0, 130, 120); g.addColorStop(0, `rgba(255,200,90,${0.45 * rp})`); g.addColorStop(1, "rgba(255,160,60,0)"); ctx.fillStyle = g; ctx.fillRect(-120, 10, 240, 240);
  ctx.restore();
  ctx.save(); ctx.translate(0, 128); ctx.rotate(t * 0.15);
  ctx.strokeStyle = `rgba(245,207,106,${0.55 + 0.35 * rp})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 28, 0, 7); ctx.stroke();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28); ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(16, 10); ctx.lineTo(-16, 10); ctx.closePath(); ctx.stroke();
  ctx.restore();
  // kristal di ujung bawah + batu kecil melayang
  brCrystal(ctx, 0, 372, 26, t);
  for (const [x, y, r, ph] of [[-250, 300, 16, 0], [190, 320, 12, 1.7], [-90, 410, 10, 3.1], [300, 240, 9, 4.4]]) {
    const yy = y + Math.sin(t * 1.3 + ph) * 8;
    ctx.beginPath(); ctx.moveTo(x - r, yy); ctx.lineTo(x - r * 0.4, yy - r * 0.8); ctx.lineTo(x + r, yy - r * 0.3); ctx.lineTo(x + r * 0.5, yy + r * 0.9); ctx.closePath();
    ctx.fillStyle = "#3A3250"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#120C1E"; ctx.stroke();
  }
  // panji gantung yang berkibar
  for (const sx of [-1, 1]) {
    const x = sx * 260, top = 32, len = 118, w = 46;
    ctx.beginPath(); ctx.moveTo(x - w / 2, top);
    for (let i = 0; i <= 6; i++) { const u = i / 6; ctx.lineTo(x - w / 2 + Math.sin(t * 2.2 + u * 3 + sx) * 6 * u, top + len * u); }
    ctx.lineTo(x + Math.sin(t * 2.2 + 3 + sx) * 6, top + len + 16);
    for (let i = 6; i >= 0; i--) { const u = i / 6; ctx.lineTo(x + w / 2 + Math.sin(t * 2.2 + u * 3 + sx) * 6 * u, top + len * u); }
    ctx.closePath();
    ctx.fillStyle = wGrad(ctx, top, top + len, [[0, "#5B3596"], [1, "#2E1A52"]]); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#120C1E"; ctx.stroke();
    ctx.strokeStyle = BR_GOLD; ctx.lineWidth = 2;
    const ex = x + Math.sin(t * 2.2 + 1.5 + sx) * 3, ey = top + 52;
    ctx.beginPath(); ctx.arc(ex, ey, 13, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, ey - 8); ctx.lineTo(ex + 7, ey + 5); ctx.lineTo(ex - 7, ey + 5); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, top + 10); ctx.lineTo(x + w / 2 - 4, top + 10); ctx.stroke();
  }
  // lempeng marmer atas + pinggiran emas
  ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(R, 0); ctx.lineTo(R - 4, 26); ctx.lineTo(L + 4, 26); ctx.closePath();
  ctx.fillStyle = wGrad(ctx, 0, 26, [[0, "#FBF7EE"], [0.5, "#E4DCCD"], [1, "#BEB3A2"]]); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#120C1E"; ctx.stroke();
  ctx.strokeStyle = "rgba(120,100,80,.35)"; ctx.lineWidth = 1.5;
  for (let x = L + 70; x < R; x += 96) { ctx.beginPath(); ctx.moveTo(x, 3); ctx.quadraticCurveTo(x + 20, 12, x + 8, 24); ctx.stroke(); }
  ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillRect(L + 6, 2, R - L - 12, 2.5);
  ctx.beginPath(); ctx.moveTo(L + 4, 26); ctx.lineTo(R - 4, 26); ctx.lineTo(R - 10, 34); ctx.lineTo(L + 10, 34); ctx.closePath();
  ctx.fillStyle = wGrad(ctx, 26, 34, [[0, "#FFE29A"], [1, "#B9822E"]]); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#120C1E"; ctx.stroke();
  // tungku api di dua ujung
  for (const sx of [-1, 1]) brBrazier(ctx, sx * (M.x1 - 26), 0, t, sx);
  // lempeng melayang (bisa ditembus dari bawah)
  for (const p of BR_PLATS) {
    if (!p.soft) continue;
    const cx = (p.x0 + p.x1) / 2, w = p.x1 - p.x0;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    g = ctx.createRadialGradient(cx, p.y + 26, 0, cx, p.y + 26, 80); g.addColorStop(0, `rgba(127,227,247,${0.3 + 0.12 * Math.sin(t * 2.5 + p.x0)})`); g.addColorStop(1, "rgba(127,227,247,0)"); ctx.fillStyle = g; ctx.fillRect(cx - 80, p.y - 30, 160, 140);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(p.x0 + 6, p.y + 18); ctx.lineTo(cx - 18, p.y + 36); ctx.lineTo(cx, p.y + 48); ctx.lineTo(cx + 18, p.y + 36); ctx.lineTo(p.x1 - 6, p.y + 18); ctx.closePath();
    ctx.fillStyle = wGrad(ctx, p.y + 18, p.y + 48, [[0, "#5A5272"], [1, "#2A2440"]]); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#120C1E"; ctx.stroke();
    brCrystal(ctx, cx, p.y + 56 + Math.sin(t * 2 + p.x0) * 3, 9, t);
    qzRR(ctx, p.x0 - 6, p.y, w + 12, 14, 4); ctx.fillStyle = wGrad(ctx, p.y, p.y + 14, [[0, "#FBF7EE"], [1, "#C9BFAE"]]); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#120C1E"; ctx.stroke();
    ctx.fillStyle = BR_GOLD; ctx.fillRect(p.x0 - 2, p.y + 13, w + 4, 5); ctx.strokeRect(p.x0 - 2, p.y + 13, w + 4, 5);
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(p.x0 - 2, p.y + 2, w + 4, 2);
  }
}
function brCrystal(ctx, x, y, r, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5); g.addColorStop(0, `rgba(127,227,247,${0.5 + 0.2 * Math.sin(t * 3 + x)})`); g.addColorStop(1, "rgba(127,227,247,0)");
  ctx.fillStyle = g; ctx.fillRect(x - r * 3.5, y - r * 3.5, r * 7, r * 7); ctx.restore();
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.55, y); ctx.lineTo(x, y + r * 1.3); ctx.lineTo(x - r * 0.55, y); ctx.closePath();
  ctx.fillStyle = wGrad(ctx, y - r, y + r, [[0, "#E6FCFF"], [1, "#4CC4E8"]]); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#120C1E"; ctx.stroke();
}
function brBrazier(ctx, x, y, t, sx) {
  // kaki dan mangkuk emas
  ctx.fillStyle = "#3A3250"; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 5, y - 34); ctx.lineTo(x + 5, y - 34); ctx.lineTo(x + 8, y); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#120C1E"; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 20, y - 46); ctx.lineTo(x + 20, y - 46); ctx.lineTo(x + 12, y - 32); ctx.lineTo(x - 12, y - 32); ctx.closePath();
  ctx.fillStyle = wGrad(ctx, y - 46, y - 32, [[0, "#FFE29A"], [1, "#A8732A"]]); ctx.fill(); ctx.stroke();
  // api: cahaya + lidah api berlapis
  const fl = 0.85 + 0.15 * Math.sin(t * 13 + sx * 2) * Math.sin(t * 7.3);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y - 62, 0, x, y - 62, 120); g.addColorStop(0, `rgba(255,170,70,${0.42 * fl})`); g.addColorStop(1, "rgba(255,110,40,0)"); ctx.fillStyle = g; ctx.fillRect(x - 120, y - 182, 240, 240);
  for (const [col, w, h, ph] of [["rgba(255,90,40,.85)", 17, 40, 0], ["rgba(255,170,60,.9)", 12, 30, 1.3], ["rgba(255,240,180,.95)", 6, 18, 2.4]]) {
    const sway = Math.sin(t * 9 + ph + sx) * 3, hh = h * (0.85 + 0.2 * Math.sin(t * 11 + ph));
    ctx.beginPath(); ctx.moveTo(x - w, y - 46); ctx.quadraticCurveTo(x - w * 0.8, y - 46 - hh * 0.6, x + sway, y - 46 - hh); ctx.quadraticCurveTo(x + w * 0.8, y - 46 - hh * 0.6, x + w, y - 46); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
  }
  ctx.restore();
}
function brShadow(ctx, f) {
  // bayangan di pijakan terdekat di bawah
  let gy = null;
  for (const p of BR_PLATS) if (f.x > p.x0 - 10 && f.x < p.x1 + 10 && p.y >= f.y - 1 && (gy == null || p.y < gy)) gy = p.y;
  if (gy == null) return;
  const k = Math.max(0.2, 1 - (gy - f.y) / 400);
  ctx.fillStyle = `rgba(18,12,30,${0.35 * k})`; ctx.beginPath(); ctx.ellipse(f.x, gy + 1, 24 * k, 5 * k, 0, 0, 7); ctx.fill();
}
// peti senjata: turun pelan di dalam pilar cahaya, peti kayu gelap bersudut emas, ikonnya melayang di atas
function brCrate(ctx, c, t) {
  if (c.on && c.life < 3 && Math.floor(t * 8) % 2) return;
  if (!c.on) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(c.x - 30, 0, c.x + 30, 0); g.addColorStop(0, "rgba(255,220,140,0)"); g.addColorStop(0.5, "rgba(255,220,140,.28)"); g.addColorStop(1, "rgba(255,220,140,0)");
    ctx.fillStyle = g; ctx.fillRect(c.x - 30, c.y - 900, 60, 900); ctx.restore();
  }
  ctx.save(); ctx.translate(c.x, c.y);
  qzRR(ctx, -24, -40, 48, 38, 5); ctx.fillStyle = wGrad(ctx, -40, -2, [[0, "#5A3A2A"], [1, "#2E1D16"]]); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#120C1E"; ctx.stroke();
  ctx.fillStyle = BR_GOLD; for (const [x, y] of [[-24, -40], [16, -40], [-24, -10], [16, -10]]) { ctx.fillRect(x, y, 8, 8); ctx.strokeRect(x, y, 8, 8); }
  ctx.fillRect(-24, -24, 48, 4); ctx.strokeRect(-24, -24, 48, 4);
  ctx.restore();
  const by = c.y - 64 - (c.on ? 4 + Math.sin(t * 4) * 4 : 0);
  ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(c.x, by, 0, c.x, by, 40); g.addColorStop(0, "rgba(255,220,140,.45)"); g.addColorStop(1, "rgba(255,220,140,0)"); ctx.fillStyle = g; ctx.fillRect(c.x - 40, by - 40, 80, 80); ctx.restore();
  if (c.k === "ham") { ctx.save(); ctx.translate(c.x, by + 14); ctx.rotate(-0.5); brHammer(ctx, 0.7); ctx.restore(); }
  else brOrb(ctx, c.x, by, 13, t, "#7FE3F7");
}
// palu perang: gagang gelap bercincin emas, kepala baja (digambar ke atas dari titik genggam)
function brHammer(ctx, k = 1) {
  ctx.save(); ctx.scale(k, k);
  ctx.fillStyle = "#3A2A2A"; ctx.fillRect(-3.5, -50, 7, 60); ctx.lineWidth = 2; ctx.strokeStyle = "#120C1E"; ctx.strokeRect(-3.5, -50, 7, 60);
  ctx.fillStyle = BR_GOLD; for (const y of [-12, 2]) { ctx.fillRect(-4.5, y, 9, 4); ctx.strokeRect(-4.5, y, 9, 4); }
  qzRR(ctx, -22, -72, 44, 26, 4); ctx.fillStyle = wGrad(ctx, -72, -46, [[0, "#F2F4F8"], [0.5, "#A9B1C0"], [1, "#6A7286"]]); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = BR_GOLD; ctx.fillRect(-5, -72, 10, 26); ctx.strokeRect(-5, -72, 10, 26);
  ctx.restore();
}
// bola percik: inti putih, cincin warna pelempar, kilau yang muter
function brOrb(ctx, x, y, r, t, col) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(0.35, col); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, 7); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.beginPath(); ctx.arc(x, y, r * 1.3, a, a + 0.9); ctx.stroke(); }
  ctx.restore();
}

// ---- tokoh: kerangka sederhana (pinggul, bahu, kepala, tangan, kaki) + IK dua ruas buat siku dan lutut
function brIK(ax, ay, bx, by, l1, l2, bend) {
  let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  const m = l1 + l2 - 0.01;
  if (d > m) { bx = ax + dx / d * m; by = ay + dy / d * m; dx = bx - ax; dy = by - ay; d = m; }
  d = Math.max(d, 0.01);
  const c = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))), a = Math.atan2(dy, dx) + c * bend;
  return [ax + Math.cos(a) * l1, ay + Math.sin(a) * l1, bx, by];
}
// pose ngadep kanan (digambar dicermin kalau ngadep kiri). P.hf/hb = tangan depan/belakang, P.ff/fb = kaki depan/belakang
function brPose(f, t) {
  const a = f.atk, mv = a && a.mv, br = Math.sin(t * 3 + f.i) * 1.2;
  const P = { hip: [0, -27], sh: [2, -45 + br * 0.5], head: [4, -58 + br * 0.6], hf: [17, -40 + br], hb: [9, -44 + br], ff: [9, 0], fb: [-9, 0], rot: 0, arc: null };
  const set = o => Object.assign(P, o);
  if (f.hover > 0) set({ hf: [10, -30], hb: [-8, -30] });
  if (f.stun > 0.05) {
    f.tum = (f.tum || 0) + Math.hypot(f.vx, f.vy) * 0.00004 * (f.vx >= 0 ? 1 : -1) * f.face;
    return set({ rot: Math.max(-1.2, Math.min(1.2, Math.sin(t * 20) * 0.1 + (f.tum % 1.2))), hf: [20, -66], hb: [-18, -62], ff: [14, -8], fb: [-12, -2], sh: [-2, -46], head: [-4, -59] });
  }
  if (f.dodgeT > 0) return set({ hip: [0, -22], sh: [5, -38], head: [9, -49], hf: [16, -30], hb: [4, -32], ff: [9, -8], fb: [-7, -10] });
  if (!f.ground) {
    if (f.vy < 0) set({ ff: [9, -16], fb: [-7, -8], hf: [18, -54], hb: [-14, -50] });
    else set({ ff: [11, -2], fb: [-10, -8], hf: [20, -50], hb: [-16, -48] });
  } else if (Math.abs(f.vx) > 60) {
    const ph = f.anim * 13, s1 = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    set({ ff: [s1 * 17, -Math.max(0, Math.cos(ph)) * 10], fb: [s2 * 17, -Math.max(0, Math.cos(ph + Math.PI)) * 10], sh: [7, -44], head: [10, -56], hf: [16 - s1 * 10, -38], hb: [6 + s1 * 10, -41], hip: [2, -27 + Math.abs(s1) * 1.5] });
  }
  if (!a) return P;
  if (a.chg) {
    // ngecas: badan merunduk, tangan ditarik ke belakang
    const k = Math.min(1, a.charge / 0.7), sh = Math.sin(t * 40) * k * 1.2;
    if (mv === BR_MV.rise) return set({ hip: [0, -22], sh: [2, -38], head: [4, -50], hf: [12, -18], hb: [-4, -22], ff: [12, 0], fb: [-12, 0] });
    if (mv === BR_MV.pound) return set({ hf: [6, -86 + sh], hb: [-6, -84], sh: [0, -47], head: [2, -60] });
    return set({ hip: [-2, -23], sh: [-6 + sh, -41], head: [-4 + sh, -53], hf: [-20, -40], hb: [-12, -36], ff: [16, 0], fb: [-14, 0] });
  }
  const on = a.t >= mv.st, k = on ? Math.min(1, (a.t - mv.st) / 0.05) : 0, wind = on ? 0 : a.t / Math.max(0.01, mv.st);
  if (mv.arm === 1 || mv.arm === 4) {
    const [dx, dy, w] = mv.box || [44, -36, 56], reach = dx + w * 0.35;
    if (!on) set({ hf: [4 - wind * 10, -40], sh: [-2, -45] });
    else set({ hf: [16 + (reach - 16) * k, dy], hb: [-6, -40], sh: [8, -44], head: [12, -56], ff: [mv.heavy ? 18 : 12, 0], fb: [-14, 0], arc: [dx, dy, w, mv.heavy] });
  } else if (mv.arm === 2) {
    if (mv === BR_MV.rise) set({ hf: [10, -60 - 42 * k], hb: [-2, -52], sh: [4, -50], head: [6, -63], ff: [4, -6], fb: [-6, -16], arc: on ? [8, -80, 70, 2] : null });
    else set({ hf: [6, -50 - 40 * k], hb: [-6, -44], head: [5, -60], arc: on ? [8, -84, 64, 2] : null });
  } else if (mv.arm === 3) {
    if (mv === BR_MV.low) set({ ff: [16 + 30 * k, -8], fb: [-12, 0], hip: [-2, -24], sh: [-6, -42], head: [-4, -54], hf: [14, -36], hb: [-14, -38], arc: on ? [44, -12, 68, 0] : null });
    else if (mv === BR_MV.spike) set({ ff: [6, 6 + 10 * k], fb: [-4, 4 + 8 * k], hf: [14, -62], hb: [-14, -60], arc: on ? [6, 16, 54, 3] : null });
    else set({ hf: on ? [26, -6] : [6, -84], hb: on ? [-22, -6] : [-4, -82], hip: on ? [0, -20] : P.hip, sh: on ? [6, -36] : P.sh, head: on ? [10, -47] : P.head, ff: [16, 0], fb: [-16, 0], arc: on ? [0, -14, 164, 4] : null });
  } else if (mv.arm === 5) set({ hf: on ? [28, -52] : [-16, -70], hb: [6, -40] });
  return P;
}
// gambar satu tokoh. flat = siluet satu warna (dipakai buat bayangan sisa gerak)
function brHero(ctx, f, t, flat) {
  const L = BR_LOOK[f.look] || BR_LOOK.band, P = brPose(f, t), fc = f.face, a = f.atk;
  const OL = flat ? null : "#120C1E", fill = c => flat || c;
  ctx.save(); ctx.translate(f.x, f.y);
  if (!flat) {
    if (f.inv > 0 && f.dodgeT <= 0 && Math.floor(t * 14) % 2) ctx.globalAlpha = 0.5;
    if (f.hover > 0) {
      // lingkaran emas tempat muncul lagi
      ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(0, 2, 0, 0, 2, 50); g.addColorStop(0, "rgba(255,210,120,.6)"); g.addColorStop(1, "rgba(255,210,120,0)"); ctx.fillStyle = g; ctx.fillRect(-50, -48, 100, 100); ctx.restore();
      ctx.strokeStyle = BR_GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 4, 34, 8, 0, 0, 7); ctx.stroke();
    }
    // aura ngecas
    if (a && a.chg) {
      const k = Math.min(1, a.charge / 0.7);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(0, -34, 8, 0, -34, 54 + k * 26); g.addColorStop(0, `rgba(255,220,120,${0.2 + 0.45 * k})`); g.addColorStop(1, "rgba(255,140,50,0)"); ctx.fillStyle = g; ctx.fillRect(-90, -124, 180, 180); ctx.restore();
    }
  }
  ctx.scale(fc, 1);
  if (P.rot) { ctx.translate(0, -34); ctx.rotate(P.rot); ctx.translate(0, 34); }
  const sq = f.sq || 0; ctx.translate(0, 0); ctx.scale(1 + sq * 0.18, 1 - sq * 0.18);
  const limb = (from, to, l1, l2, bend, w, col, end, endR) => {
    const [ex, ey, tx, ty] = brIK(from[0], from[1], to[0], to[1], l1, l2, bend);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (OL) { ctx.strokeStyle = OL; ctx.lineWidth = w + 5; ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(ex, ey); ctx.lineTo(tx, ty); ctx.stroke(); }
    ctx.strokeStyle = fill(col); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(ex, ey); ctx.lineTo(tx, ty); ctx.stroke();
    if (end) { ctx.beginPath(); if (endR[1]) ctx.ellipse(tx + endR[2], ty - endR[1] * 0.4, endR[0], endR[1], 0, 0, 7); else ctx.arc(tx, ty, endR[0], 0, 7); ctx.fillStyle = fill(end); ctx.fill(); if (OL) { ctx.lineWidth = 2.5; ctx.strokeStyle = OL; ctx.stroke(); } }
  };
  const hipB = [P.hip[0] - 5, P.hip[1]], hipF = [P.hip[0] + 5, P.hip[1]], shB = [P.sh[0] - 7, P.sh[1] + 2], shF = [P.sh[0] + 7, P.sh[1] + 2];
  // belakang: lengan + kaki belakang (sedikit lebih gelap)
  if (f.look === "cat" && !flat) {
    // ekor kucing
    ctx.strokeStyle = OL; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(P.hip[0] - 8, P.hip[1] + 2); ctx.quadraticCurveTo(-30, -20 + Math.sin(t * 4) * 6, -26, -50 + Math.sin(t * 3) * 6); ctx.stroke();
    ctx.strokeStyle = L.main; ctx.lineWidth = 6; ctx.stroke();
  }
  limb(shB, P.hb, 13, 12, 1, 7, brShade(L.main, -0.25), L.glove, [5.5]);
  limb(hipB, P.fb, 15, 14, -1, 9, brShade(L.dark, -0.15), "#1A1424", [7, 4, 2]);
  // badan: trapesium bahu lebar ke pinggang, gradasi cahaya dari atas depan
  const [sx, sy] = P.sh, [hx, hy] = P.hip;
  ctx.beginPath(); ctx.moveTo(sx - 12, sy - 1); ctx.quadraticCurveTo(sx, sy - 5, sx + 13, sy - 1); ctx.lineTo(hx + 10, hy + 3); ctx.quadraticCurveTo(hx, hy + 7, hx - 10, hy + 3); ctx.closePath();
  if (flat) { ctx.fillStyle = flat; ctx.fill(); }
  else {
    const g = ctx.createLinearGradient(sx - 12, sy, sx + 14, hy); g.addColorStop(0, brShade(L.main, -0.2)); g.addColorStop(0.55, L.main); g.addColorStop(1, brShade(L.main, 0.25));
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OL; ctx.stroke();
    // sabuk / detail baju
    ctx.fillStyle = L.acc; ctx.fillRect(hx - 10, hy - 4, 20, 5); ctx.strokeRect(hx - 10, hy - 4, 20, 5);
    if (f.look === "band") { ctx.strokeStyle = "rgba(18,12,30,.4)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(hx + 3, hy - 4); ctx.stroke(); }
    if (f.look === "ant") { ctx.fillStyle = L.acc; ctx.beginPath(); ctx.arc((sx + hx) / 2 + 2, (sy + hy) / 2 - 2, 3.5, 0, 7); ctx.fill(); }
    if (f.look === "bun") {
      // syal ungu berkibar
      const fl = Math.sin(t * 10) * 3 - Math.min(10, Math.abs(f.vx) / 60);
      ctx.fillStyle = L.acc; ctx.beginPath(); ctx.moveTo(sx - 9, sy - 3); ctx.lineTo(sx - 30, sy + 2 + fl); ctx.lineTo(sx - 26, sy + 9 + fl); ctx.lineTo(sx - 8, sy + 3); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OL; ctx.stroke();
      qzRR(ctx, sx - 11, sy - 5, 24, 8, 4); ctx.fill(); ctx.stroke();
    }
    // cahaya pinggir di punggung
    ctx.strokeStyle = "rgba(255,240,210,.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 10, sy + 2); ctx.lineTo(hx - 8, hy); ctx.stroke();
  }
  brHead(ctx, f, P.head[0], P.head[1], t, flat);
  // depan: kaki + lengan depan, lalu senjata
  limb(hipF, P.ff, 15, 14, -1, 9, L.dark, "#1A1424", [7, 4, 2]);
  const w = f.wpn && f.wpn.k;
  if (w === "ham" && !flat) {
    const act = a && !a.chg && a.t >= a.mv.st, sw = act && a.mv.arm === 4 ? -1.4 + 2.6 * Math.min(1, (a.t - a.mv.st) / 0.08) : a && a.chg ? -2.4 : -0.4;
    ctx.save(); ctx.translate(P.hf[0], P.hf[1]); ctx.rotate(sw + 0.9); brHammer(ctx, 1); ctx.restore();
  }
  limb(shF, P.hf, 13, 12, 1, 7, L.main, L.glove, [6]);
  if (w === "pie" && !flat && !(a && a.mv.arm === 5 && a.t >= a.mv.st)) brOrb(ctx, P.hf[0] + 4, P.hf[1] - 4, 8, t, f.col);
  // tebasan: bulan sabit bergradasi di depan pukulan yang lagi aktif
  if (P.arc && !flat && a && a.t < a.mv.st + a.mv.ac) brSlash(ctx, P.arc, f, (a.t - a.mv.st) / Math.max(0.01, a.mv.ac));
  ctx.restore();
  if (flat) return;
  // label: segitiga emas buat pemain, nama kecil buat CPU
  const s = FC.br._s || 1, ty = f.y - BR_H - 22 - (f.look === "bun" ? 26 : f.look === "ant" ? 14 : f.look === "cat" ? 8 : 4);
  ctx.save(); ctx.translate(f.x, ty); ctx.scale(1 / s, 1 / s);
  const d = FC.dpr;
  if (f.me) { ctx.beginPath(); ctx.moveTo(-8 * d, -5 * d); ctx.lineTo(8 * d, -5 * d); ctx.lineTo(0, 6 * d); ctx.closePath(); ctx.fillStyle = BR_GOLD; ctx.fill(); ctx.lineWidth = 2 * d; ctx.strokeStyle = "#120C1E"; ctx.stroke(); brTxt(ctx, "P1", 0, -15 * d, 11, "#FFF7DA", "center", 3, true); }
  else brTxt(ctx, f.name.toUpperCase(), 0, 0, 10, f.col, "center", 3, true);
  ctx.restore();
}
function brHead(ctx, f, x, y, t, flat) {
  const L = BR_LOOK[f.look] || BR_LOOK.band, OL = flat ? null : "#120C1E", fill = c => flat || c, stunned = f.stun > 0.05;
  const ln = () => { if (OL) { ctx.lineWidth = 2.5; ctx.strokeStyle = OL; ctx.stroke(); } };
  // telinga / aksesori di belakang kepala
  if (f.look === "bun") for (const [dx, r] of [[-5, -0.35], [3, -0.12]]) {
    ctx.save(); ctx.translate(x + dx, y - 9); ctx.rotate(r + Math.sin(t * 3 + dx) * 0.06 - (stunned ? 0.5 : 0) - Math.min(0.4, Math.abs(f.vx) / 1500));
    ctx.beginPath(); ctx.ellipse(0, -16, 5.5, 17, 0, 0, 7); ctx.fillStyle = fill(L.skin); ctx.fill(); ln();
    if (!flat) { ctx.beginPath(); ctx.ellipse(0, -16, 2.5, 11, 0, 0, 7); ctx.fillStyle = "#F7B7C8"; ctx.fill(); }
    ctx.restore();
  }
  if (f.look === "cat") for (const dx of [-8, 5]) { ctx.beginPath(); ctx.moveTo(x + dx - 5, y - 8); ctx.lineTo(x + dx + 1, y - 21); ctx.lineTo(x + dx + 7, y - 7); ctx.closePath(); ctx.fillStyle = fill(L.main); ctx.fill(); ln(); }
  if (f.look === "ant" && !flat) {
    ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 2, y - 12); ctx.lineTo(x - 6, y - 24); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(x - 6, y - 26, 0, x - 6, y - 26, 12); g.addColorStop(0, "rgba(127,243,255,.9)"); g.addColorStop(1, "rgba(127,243,255,0)"); ctx.fillStyle = g; ctx.fillRect(x - 18, y - 38, 24, 24); ctx.restore();
    ctx.beginPath(); ctx.arc(x - 6, y - 26, 3, 0, 7); ctx.fillStyle = L.acc; ctx.fill();
  }
  // kepala
  ctx.beginPath(); ctx.ellipse(x, y, 12, 13, 0, 0, 7);
  if (flat) { ctx.fillStyle = flat; ctx.fill(); return; }
  const g = ctx.createRadialGradient(x + 4, y - 4, 2, x, y, 14); g.addColorStop(0, brShade(L.skin, 0.15)); g.addColorStop(1, brShade(L.skin, -0.15));
  ctx.fillStyle = f.look === "ant" ? wGrad(ctx, y - 13, y + 13, [[0, "#E8EEF6"], [1, "#8C9AB2"]]) : f.look === "cat" ? L.main : g; ctx.fill(); ln();
  if (f.look === "cat") { ctx.beginPath(); ctx.ellipse(x + 5, y + 4, 6, 5, 0, 0, 7); ctx.fillStyle = L.skin; ctx.fill(); }
  // rambut pemain + ikat kepala merah dengan ujung berkibar
  if (f.look === "band") {
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, 12, 13, 0, 0, 7); ctx.clip();
    ctx.fillStyle = "#2A1E1A"; ctx.beginPath(); ctx.ellipse(x - 4, y - 9, 13, 8, -0.2, 0, 7); ctx.fill();
    ctx.fillStyle = L.acc; ctx.fillRect(x - 13, y - 6, 26, 5); ctx.restore();
    ctx.beginPath(); ctx.ellipse(x, y, 12, 13, 0, 0, 7); ln();
    const fl = Math.sin(t * 12) * 3 - Math.min(8, Math.abs(f.vx) / 70);
    ctx.fillStyle = L.acc; ctx.beginPath(); ctx.moveTo(x - 11, y - 5); ctx.quadraticCurveTo(x - 22, y - 9 + fl, x - 30, y - 2 + fl); ctx.lineTo(x - 27, y + 2 + fl); ctx.quadraticCurveTo(x - 20, y - 3, x - 11, y - 1); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = OL; ctx.stroke();
  }
  // mata: visor nyala buat Bolt, mata tajam buat yang lain
  if (f.look === "ant") {
    qzRR(ctx, x - 2, y - 5, 15, 7, 3.5); ctx.fillStyle = "#120C1E"; ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = stunned ? "rgba(255,120,120,.9)" : "rgba(127,243,255,.95)"; ctx.fillRect(x + 1, y - 3, 10, 3); ctx.restore();
  } else if (stunned) {
    ctx.strokeStyle = OL; ctx.lineWidth = 2; for (const ex of [x + 2, x + 9]) { ctx.beginPath(); ctx.moveTo(ex - 2.5, y - 4); ctx.lineTo(ex + 2.5, y + 1); ctx.moveTo(ex + 2.5, y - 4); ctx.lineTo(ex - 2.5, y + 1); ctx.stroke(); }
  } else {
    const angry = f.atk && (f.atk.chg || f.atk.mv.heavy);
    for (const ex of [x + 2.5, x + 9]) {
      ctx.beginPath(); ctx.ellipse(ex, y - 1, 2, 3, 0, 0, 7); ctx.fillStyle = "#120C1E"; ctx.fill();
      ctx.fillStyle = "#FFF"; ctx.fillRect(ex, y - 3, 1, 1.2);
      if (angry) { ctx.strokeStyle = "#120C1E"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(ex - 3, y - 7); ctx.lineTo(ex + 3, y - 5); ctx.stroke(); }
    }
  }
}
function brShade(hex, k) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
// tebasan bulan sabit: [maju, tinggi, lebar, jenis]; jenis 0 = biasa, 1/true = berat, 2 = ke atas, 3 = ke bawah, 4 = hantam dua sisi
function brSlash(ctx, A, f, k) {
  const [dx, dy, w, kind] = A, heavy = kind === true || kind === 1 || kind === 4, L = BR_LOOK[f.look] || BR_LOOK.band;
  const col = f.me ? "255,226,140" : L.acc === "#FFD15C" ? "255,209,92" : f.look === "ant" ? "127,243,255" : f.look === "bun" ? "200,170,255" : "255,226,140";
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.max(0, 1 - k * 0.8);
  const R = w * 0.62 * (heavy ? 1.15 : 1), a0 = -1.1 + k * 0.6, a1 = 0.9 + k * 0.4;
  const draw = (cx, cy, s0, s1) => {
    const g = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.8, `rgba(${col},.75)`); g.addColorStop(1, "rgba(255,255,255,.95)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, s0, s1); ctx.arc(cx + R * 0.12 * Math.cos((s0 + s1) / 2), cy + R * 0.12 * Math.sin((s0 + s1) / 2), R * 0.72, s1, s0, true); ctx.closePath(); ctx.fill();
  };
  if (kind === 2) draw(0, dy + R * 0.6, -Math.PI + 0.3, -0.3);
  else if (kind === 3) draw(dx * 0.3, dy - R * 0.5, 0.4, Math.PI - 0.4);
  else if (kind === 4) { ctx.scale(1, 0.35); draw(0, (dy + 10) / 0.35, Math.PI + 0.1, Math.PI * 2 - 0.1); }
  else draw(dx - w * 0.45, dy, a0, a1);
  ctx.restore();
}
// bayangan sisa gerak waktu gerak cepat (dodge, mental keras, pukulan naik)
function brGhosts(ctx, f, dt) {
  f.ghost = f.ghost || [];
  const fast = f.dodgeT > 0 || (f.stun > 0 && Math.hypot(f.vx, f.vy) > 900) || (f.atk && f.atk.mv === BR_MV.rise && f.vy < -300);
  f.gT = (f.gT || 0) + dt;
  if (fast && f.gT > 0.035) { f.gT = 0; f.ghost.push({ x: f.x, y: f.y, face: f.face, stun: f.stun, dodgeT: f.dodgeT, vx: f.vx, vy: f.vy, ground: f.ground, atk: null, anim: f.anim, look: f.look, i: f.i, tum: f.tum, sq: 0, hover: 0, a: 0.45 }); }
  for (const g of f.ghost) g.a -= dt * 2.2;
  f.ghost = f.ghost.filter(g => g.a > 0).slice(-6);
  if (reduce) return;
  for (const g of f.ghost) { ctx.save(); ctx.globalAlpha = g.a; brHero(ctx, g, 0, f.col); ctx.restore(); }
}
function brFx(ctx, s) {
  const B = FC.br;
  for (const p of B.fx) {
    const k = p.t / p.life;
    if (p.k === "spark") {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1 - k; ctx.strokeStyle = p.col; ctx.lineWidth = 3 * (1 - k * 0.5);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); ctx.restore();
    } else if (p.k === "puff") { ctx.globalAlpha = 0.5 * (1 - k); ctx.fillStyle = "#E8DDD0"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k), 0, 7); ctx.fill(); }
    else if (p.k === "ring") { ctx.globalAlpha = 1 - k; ctx.strokeStyle = "rgba(255,240,210,.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y, 18 + 40 * k, 5 + 9 * k, 0, 0, 7); ctx.stroke(); }
    else if (p.k === "hit") {
      // benturan: inti putih panas, sinar tajam, cincin kejut buat pukulan keras
      p.rays = p.rays || Array.from({ length: 7 }, () => [Math.random() * Math.PI * 2, 0.6 + Math.random() * 0.8]);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(p.x, p.y);
      const R = 34 * p.s, g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * (1 + k));
      g.addColorStop(0, `rgba(255,255,255,${1 - k})`); g.addColorStop(0.4, `rgba(255,214,120,${0.8 * (1 - k)})`); g.addColorStop(1, "rgba(255,140,60,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * (1 + k), 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(255,250,230,${1 - k})`;
      for (const [a, l] of p.rays) { const r0 = R * 0.3, r1 = R * (1.2 + k * 1.4) * l; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a + 0.12) * r0, Math.sin(a + 0.12) * r0); ctx.lineTo(Math.cos(a - 0.12) * r0, Math.sin(a - 0.12) * r0); ctx.closePath(); ctx.fill(); }
      if (p.big) { ctx.strokeStyle = `rgba(255,230,170,${1 - k})`; ctx.lineWidth = 4 * (1 - k); ctx.beginPath(); ctx.arc(0, 0, R * (0.8 + 3 * k), 0, 7); ctx.stroke(); }
      ctx.restore();
    } else if (p.k === "blast") {
      // KO: pilar cahaya warna tokoh dari pinggir layar ke arah panggung + cincin
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1 - k; ctx.translate(p.x, p.y); ctx.rotate(p.a);
      const Lb = 1300 * Math.min(1, k * 5), wb = 150 * (1 - k * 0.7);
      let g = ctx.createLinearGradient(0, 0, Lb, 0); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, p.col); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -wb); ctx.lineTo(Lb, -wb * 0.1); ctx.lineTo(Lb, wb * 0.1); ctx.lineTo(0, wb); ctx.closePath(); ctx.fill();
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, 260); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 260 * (0.4 + k), 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
// vinyet: pinggir layar digelapin dikit biar fokus ke tengah (dibikin sekali per ukuran)
function brVignette(ctx, W, H) {
  ctx.drawImage(wLayer("brVig", W, H, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(10,6,20,0)"); g.addColorStop(1, "rgba(10,6,20,.5)"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  }), 0, 0);
}
// HUD: panel gelap miring per petarung (potret, nama, persen miring yang makin merah, nyawa berlian), tombol sentuh, tulisan besar
function brPanel(ctx, x, y, w, h, sk, fillS, strokeS) {
  ctx.beginPath(); ctx.moveTo(x + sk, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - sk, y + h); ctx.lineTo(x, y + h); ctx.closePath();
  if (fillS) { ctx.fillStyle = fillS; ctx.fill(); } if (strokeS) { ctx.strokeStyle = strokeS; ctx.stroke(); }
}
function brDmgCol(d) {
  const st = [[0, [255, 255, 255]], [60, [255, 226, 120]], [110, [255, 140, 60]], [170, [230, 40, 50]], [250, [150, 10, 30]]];
  let i = 0; while (i < st.length - 2 && d > st[i + 1][0]) i++;
  const [d0, c0] = st[i], [d1, c1] = st[i + 1], k = Math.max(0, Math.min(1, (d - d0) / (d1 - d0)));
  return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(",")})`;
}
function brHud(ctx, W, H, dpr, t) {
  const B = FC.br, n = B.f.length, u = dpr, cw = Math.min(150 * u, (W - 250 * u) / n), ch = 50 * u, gap = 6 * u, sk = 12 * u;
  const x0 = W / 2 - (cw * n + gap * (n - 1)) / 2, y0 = 12 * u;
  B.f.forEach((f, i) => {
    const x = x0 + i * (cw + gap), y = y0;
    ctx.save(); ctx.globalAlpha = f.out ? 0.45 : 1;
    brPanel(ctx, x, y, cw, ch, sk, "rgba(16,10,28,.84)", null);
    ctx.lineWidth = 1.5 * u; brPanel(ctx, x, y, cw, ch, sk, null, f.me ? "rgba(232,182,76,.95)" : "rgba(255,255,255,.18)");
    // garis warna tokoh di bawah
    ctx.fillStyle = f.col; ctx.beginPath(); ctx.moveTo(x + 2 * u, y + ch - 4 * u); ctx.lineTo(x + cw - sk - 2 * u + 4 * u, y + ch - 4 * u); ctx.lineTo(x + cw - sk, y + ch); ctx.lineTo(x, y + ch); ctx.closePath(); ctx.fill();
    // potret
    const px = x + sk + 18 * u, py = y + ch / 2 - 1 * u;
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, 17 * u, 0, 7); ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fill(); ctx.clip();
    ctx.translate(px - 4 * u, py + 34 * u); ctx.scale(0.95 * u, 0.95 * u); brHead(ctx, f, 0, -36, t, false); ctx.restore();
    ctx.beginPath(); ctx.arc(px, py, 17 * u, 0, 7); ctx.lineWidth = 1.5 * u; ctx.strokeStyle = f.col; ctx.stroke();
    // nama + persen
    ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.font = `800 ${9 * u}px system-ui, sans-serif`; ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.fillText((f.me ? "YOU" : f.name).toUpperCase(), px + 22 * u, y + 13 * u);
    const kick = f.flash > 0 ? 1.18 : 1, d = f.dmg;
    if (f.out) brTxt(ctx, "OUT", x + cw - sk - 6 * u, y + 25 * u, 15, "rgba(255,255,255,.5)", "right", 0, true);
    else {
      ctx.save(); if (d >= 100) { ctx.shadowColor = brDmgCol(d); ctx.shadowBlur = 12 * u; }
      brTxt(ctx, f.resp > 0 ? "—" : `${d}%`, x + cw - sk - 4 * u, y + 25 * u, 22 * kick, brDmgCol(d), "right", 0, true); ctx.restore();
    }
    // nyawa berlian + KO
    for (let k = 0; k < BR_STOCK; k++) {
      const dx = px + 26 * u + k * 10 * u, dy = y + 36 * u;
      ctx.beginPath(); ctx.moveTo(dx, dy - 4 * u); ctx.lineTo(dx + 3.5 * u, dy); ctx.lineTo(dx, dy + 4 * u); ctx.lineTo(dx - 3.5 * u, dy); ctx.closePath();
      ctx.fillStyle = k < f.stocks ? (f.me ? BR_GOLD : f.col) : "rgba(255,255,255,.15)"; ctx.fill();
    }
    if (f.kos) { ctx.textAlign = "right"; ctx.font = `italic 800 ${9 * u}px system-ui, sans-serif`; ctx.fillStyle = BR_GOLD; ctx.fillText(`${f.kos} KO`, x + cw - sk - 8 * u, y + 38 * u); }
    if (f.wpn) { ctx.save(); ctx.translate(px + 13 * u, py + 13 * u); ctx.scale(0.18 * u, 0.18 * u); if (f.wpn.k === "ham") { ctx.rotate(0.6); brHammer(ctx, 1); } else brOrb(ctx, 0, 0, 14, t, f.col); ctx.restore(); }
    ctx.restore();
  });
  // tombol sentuh: lingkaran gelap kaca, pinggir emas, ikon garis putih
  if (B.touchUI && B.phase !== "end") {
    const R = brU() * 50;
    const stick = B.stick || { x0: 110 * u, y0: H - 100 * u, x: 110 * u, y: H - 100 * u, idle: true };
    ctx.save(); ctx.globalAlpha = stick.idle ? 0.55 : 1;
    ctx.beginPath(); ctx.arc(stick.x0, stick.y0, R * 1.2, 0, 7); ctx.fillStyle = "rgba(16,10,28,.35)"; ctx.fill(); ctx.lineWidth = 1.5 * u; ctx.strokeStyle = "rgba(232,182,76,.6)"; ctx.stroke();
    const dx = stick.x - stick.x0, dy = stick.y - stick.y0, Ls = Math.hypot(dx, dy), m = Math.min(Ls, R);
    ctx.beginPath(); ctx.arc(stick.x0 + (Ls ? dx / Ls * m : 0), stick.y0 + (Ls ? dy / Ls * m : 0), R * 0.48, 0, 7); ctx.fillStyle = "rgba(255,247,218,.85)"; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = BR_GOLD; ctx.stroke();
    ctx.restore();
    for (const b of brBtns()) {
      const on = B.held[b.k];
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fillStyle = on ? "rgba(232,182,76,.85)" : "rgba(16,10,28,.55)"; ctx.fill();
      ctx.lineWidth = 2 * u; ctx.strokeStyle = on ? "#FFF7DA" : "rgba(232,182,76,.85)"; ctx.stroke();
      if (b.k === "hvy" && B.f[0].atk && B.f[0].atk.chg) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 5 * u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, B.f[0].atk.charge / 0.7)); ctx.lineWidth = 4 * u; ctx.strokeStyle = "#FFE29A"; ctx.stroke(); }
      brIcon(ctx, b.k, b.x, b.y - 4 * u, b.r * 0.38, on ? "#120C1E" : "#FFF7DA");
      ctx.textAlign = "center"; ctx.font = `italic 800 ${8.5 * u}px system-ui, sans-serif`; ctx.fillStyle = on ? "#120C1E" : "rgba(255,247,218,.8)"; ctx.fillText(b.txt, b.x, b.y + b.r * 0.58);
    }
  }
  // petunjuk main pertama kali
  if (B.phase === "fight" && B.tip > 0) {
    ctx.save(); ctx.globalAlpha = Math.min(1, B.tip);
    const msg = B.touchUI ? ["Left thumb to move · JUMP to jump", "HIT to strike · hold HEAVY to charge · DODGE to evade", "Knock them off the temple"] : ["Arrows / WASD to move · Space or W to jump", "J strike · hold K to charge a heavy · L dodge", "Knock them off the temple"];
    const bw = Math.min(W - 40 * u, 460 * u), by = 74 * u;
    brPanel(ctx, W / 2 - bw / 2, by, bw, 74 * u, 14 * u, "rgba(16,10,28,.78)", null);
    msg.forEach((m, i) => { ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `${i === 2 ? "italic 900" : "700"} ${(i === 2 ? 14 : 12) * u}px system-ui, sans-serif`; ctx.fillStyle = i === 2 ? BR_GOLD : "rgba(255,247,218,.9)"; ctx.fillText(m, W / 2, by + (16 + i * 21) * u); });
    ctx.restore();
  }
  for (const p of B.fx) if (p.k === "kotxt") { const k = p.t / p.life; brTitle(ctx, "KNOCKOUT  +3", W / 2, H * 0.33 - k * 20 * u, 30 + 8 * (1 - k), 1 - k * k); }
  if (B.f[0].resp > 0 && !B.f[0].out && B.phase === "fight") brTxt(ctx, `${B.f[0].stocks} ${B.f[0].stocks === 1 ? "LIFE" : "LIVES"} LEFT`, W / 2, H * 0.42, 18, "#FFF7DA", "center", 5, true);
  // hitung mundur
  if (B.phase === "count") {
    const c = Math.ceil(B.ct), f = B.ct - Math.floor(B.ct);
    if (c <= 3 && c >= 1) brTitle(ctx, String(c), W / 2, H * 0.42, 96 * (1 + f * 0.35), Math.min(1, f * 3));
  } else if (B.phase === "fight" && B.ft < 0.8) { const k = B.ft / 0.8; brTitle(ctx, "FIGHT!", W / 2, H * 0.42, 84 + 30 * k, 1 - k * k); }
  // akhir: GAME! lalu urutan juara
  if (B.phase === "end") {
    const k = Math.min(1, B.et / 0.35);
    ctx.fillStyle = `rgba(10,6,20,${0.55 * k})`; ctx.fillRect(0, 0, W, H);
    if (B.et < 1.1) brTitle(ctx, "GAME!", W / 2, H * 0.45, 80 + 30 * (1 - k));
    else {
      const q = Math.min(1, (B.et - 1.1) / 0.4), rw = Math.min(420 * u, W - 40 * u), rh = 38 * u, top = H / 2 - (rh + 8 * u) * 2 + 16 * u;
      brTitle(ctx, FC.place === 0 ? "VICTORY" : `${BR_ORD[FC.place].toUpperCase()} PLACE`, W / 2, top - 34 * u, 34);
      B.order.forEach((f, i) => {
        const x = W / 2 - rw / 2 + (1 - q) * W * (i % 2 ? 1 : -1) * 0.3, y = top + i * (rh + 8 * u);
        brPanel(ctx, x, y, rw, rh, 12 * u, f.me ? "rgba(232,182,76,.95)" : "rgba(16,10,28,.88)", null);
        ctx.lineWidth = 1.5 * u; brPanel(ctx, x, y, rw, rh, 12 * u, null, f.me ? "#FFF7DA" : "rgba(232,182,76,.55)");
        const ink = f.me ? "#120C1E" : "#FFF7DA";
        brTxt(ctx, BR_ORD[i], x + 22 * u, y + rh / 2 + 1 * u, 16, ink, "left", 0, true);
        ctx.save(); ctx.beginPath(); ctx.arc(x + 80 * u, y + rh / 2, 14 * u, 0, 7); ctx.fillStyle = "rgba(16,10,28,.5)"; ctx.fill(); ctx.clip(); ctx.translate(x + 77 * u, y + rh / 2 + 30 * u); ctx.scale(0.8 * u, 0.8 * u); brHead(ctx, f, 0, -36, t, false); ctx.restore();
        brTxt(ctx, f.me ? "YOU" : f.name.toUpperCase(), x + 102 * u, y + rh / 2 + 1 * u, 15, ink, "left", 0, true);
        brTxt(ctx, `${f.kos} KO`, x + rw - 26 * u, y + rh / 2 + 1 * u, 14, f.me ? "#120C1E" : BR_GOLD, "right", 0, true);
      });
    }
  }
}
// ikon tombol, garis putih sederhana
function brIcon(ctx, k, x, y, r, col) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = r * 0.24; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (k === "atk") { for (const d of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(-r * 0.9, d * r * 1.2 + r * 0.5); ctx.lineTo(r * 0.9, d * r * 1.2 - r * 0.5); ctx.stroke(); } }
  else if (k === "hvy") { ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r * 0.45 : r * 1.05; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  else if (k === "jump") { for (const d of [0.35, -0.35]) { ctx.beginPath(); ctx.moveTo(-r * 0.8, d * r + r * 0.45); ctx.lineTo(0, d * r - r * 0.45); ctx.lineTo(r * 0.8, d * r + r * 0.45); ctx.stroke(); } }
  else { for (const d of [-0.4, 0.4]) { ctx.beginPath(); ctx.moveTo(d * r - r * 0.35, -r * 0.7); ctx.lineTo(d * r + r * 0.35, 0); ctx.lineTo(d * r - r * 0.35, r * 0.7); ctx.stroke(); } }
  ctx.restore();
}
// dunia Bonk brawl: senja di atas lautan awan. Langit + matahari diam, sinar matahari muter pelan,
// pegunungan jauh dan reruntuhan melayang geser ikut kamera (paralaks), awan bawah jalan pelan
function wBrawl(ctx, W, H, dpr, t) {
  const C = FC && FC.br ? FC.br.cam : { x: 0, y: -150 }, px = k => -C.x * k * (W / 1250), py = k => -(C.y + 150) * k * (H / 600);
  ctx.drawImage(wLayer("brSky", W, H, (c, w, h) => {
    c.fillStyle = wGrad(c, 0, h, [[0, "#0E0B2A"], [0.35, "#352663"], [0.62, "#9A4F86"], [0.8, "#F08A6A"], [1, "#FFC977"]]); c.fillRect(0, 0, w, h);
    const r = Dapur.rng(41);
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,250,230,${0.15 + r() * 0.55})`; const s = (r() < 0.1 ? 2.2 : 1.3) * dpr; c.fillRect(r() * w, r() * h * 0.4, s, s); }
    const sx = w * 0.62, sy = h * 0.8, sr = Math.min(w, h) * 0.13;
    wGlow(c, sx, sy, sr * 5, "rgba(255,190,120,.55)");
    c.beginPath(); c.arc(sx, sy, sr, 0, 7); c.fillStyle = wGrad(c, sy - sr, sy + sr, [[0, "#FFF6D8"], [1, "#FFB060"]]); c.fill();
  }), 0, 0);
  // sinar matahari
  if (!reduce) {
    const sx = W * 0.62, sy = H * 0.8; ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.28 + Math.sin(t * 0.1 + i) * 0.04, L = Math.max(W, H) * 1.2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - 0.05) * L, sy + Math.sin(a - 0.05) * L); ctx.lineTo(sx + Math.cos(a + 0.05) * L, sy + Math.sin(a + 0.05) * L); ctx.closePath(); ctx.fillStyle = `rgba(255,210,150,${0.035 + 0.02 * Math.sin(t * 0.5 + i * 1.7)})`; ctx.fill(); }
    ctx.restore();
  }
  // pegunungan jauh (lapisan lebar 1,6× layar, digeser paralaks)
  const far = wLayer("brFar", Math.round(W * 1.6), H, (c, w, h) => {
    const r = Dapur.rng(9);
    for (const [base, amp, col] of [[0.72, 0.22, "rgba(90,60,130,.55)"], [0.8, 0.16, "rgba(70,44,110,.75)"]]) {
      c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w; x += w / 14) { const pk = r(); c.lineTo(x, h * (base - amp * pk)); c.lineTo(x + w / 28, h * (base - amp * pk * 0.4 - 0.02)); }
      c.lineTo(w, h); c.closePath(); c.fillStyle = col; c.fill();
    }
    // menara kuil jauh di puncak
    for (const fx of [0.22, 0.58, 0.9]) { const x = w * fx, y = h * 0.5; c.fillStyle = "rgba(60,38,96,.8)"; c.fillRect(x - 6 * dpr, y, 12 * dpr, h * 0.2); c.beginPath(); c.moveTo(x - 10 * dpr, y); c.lineTo(x, y - 26 * dpr); c.lineTo(x + 10 * dpr, y); c.closePath(); c.fill(); }
  });
  ctx.drawImage(far, (W - far.width) / 2 + px(0.05), py(0.03));
  // reruntuhan melayang (lebih dekat, lebih gelap)
  const mid = wLayer("brMid", Math.round(W * 1.9), H, (c, w, h) => {
    for (const [fx, fy, s] of [[0.08, 0.42, 1], [0.3, 0.22, 0.6], [0.72, 0.3, 0.8], [0.93, 0.55, 1.1], [0.5, 0.62, 0.7]]) {
      const x = w * fx, y = h * fy, R = Math.min(w, h) * 0.06 * s;
      c.fillStyle = "#2A1C48";
      c.beginPath(); c.moveTo(x - R, y); c.lineTo(x + R, y); c.lineTo(x + R * 0.6, y + R * 0.4); c.lineTo(x + R * 0.1, y + R * 1.3); c.lineTo(x - R * 0.5, y + R * 0.5); c.closePath(); c.fill();
      // tiang patah di atasnya
      for (const [dx, hh] of [[-0.6, 1.1], [-0.1, 0.6], [0.5, 0.9]]) { c.fillRect(x + dx * R - R * 0.08, y - R * hh, R * 0.16, R * hh); c.fillRect(x + dx * R - R * 0.13, y - R * hh - R * 0.08, R * 0.26, R * 0.08); }
      c.fillStyle = "rgba(255,190,120,.25)"; c.fillRect(x - R, y, R * 2, 1.5 * dpr);
    }
  });
  ctx.globalAlpha = 0.6; ctx.drawImage(mid, (W - mid.width) / 2 + px(0.14), py(0.08)); ctx.globalAlpha = 1;
  // lautan awan di bawah, jalan pelan
  const cy = H * 0.86 + py(0.12);
  ctx.save();
  for (let row = 0; row < 3; row++) {
    const yy = cy + row * 22 * dpr, sp = (6 + row * 5) * dpr, col = ["rgba(255,196,170,.45)", "rgba(240,160,170,.55)", "rgba(190,120,160,.7)"][row];
    ctx.fillStyle = col;
    for (let i = -1; i < 9; i++) { const x = ((i * W / 7 + t * sp + px(0.2 + row * 0.08) + row * 60 * dpr) % (W + W / 7) + W + W / 7) % (W + W / 7) - W / 7; ctx.beginPath(); ctx.arc(x, yy, (40 + row * 12) * dpr, Math.PI, 0); ctx.fill(); }
    ctx.fillRect(0, yy, W, H - yy);
  }
  ctx.restore();
  wFlies(ctx, W, H, dpr, t, 10, "rgba(255,220,150,.7)", [0.3, 0.9]);
}
Object.assign(WORLDS, { brawl: wBrawl });
// ikon game: si pemain lagi nonjok, di depan lingkaran emas
MG_ART.brawl = (ctx, S) => {
  const k = S / 128;
  ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(S * 0.5, S * 0.5, 0, S * 0.5, S * 0.5, S * 0.5); g.addColorStop(0, "rgba(255,210,120,.55)"); g.addColorStop(1, "rgba(255,210,120,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); ctx.restore();
  ctx.translate(S * 0.42, S * 0.9); ctx.scale(k * 1.45, k * 1.45);
  const f = brNew(0, { name: "You", col: "#F2EEE6", look: "band", me: true });
  f.atk = { mv: BR_MV.side, t: BR_MV.side.st + 0.03, hit: new Set(), charge: 0, chg: false }; f.ground = BR_MAIN; f.x = 0; f.y = 0;
  const keep = FC; FC = { br: { _s: 1 }, dpr: 1 };
  try { brHero(ctx, f, 1.3); } finally { FC = keep; }
};

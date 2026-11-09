// Bonk brawl (ui/38i-brawl.js): logika adu jotos disimulasiin tanpa layar, empat CPU lawan sesama.
// Ngecek ronde selalu selesai, ada KO, nggak ada yang nyangkut di dalam pulau, dan pukulan berat lebih jauh mentalnya.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function load(seed) {
  let a = seed >>> 0;
  const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ctx = { Math: Object.create(Math), console, Set, Object, String, Array };
  ctx.Math.random = rnd;
  vm.createContext(ctx);
  const stubs = `
    let FC = null; const OUTL = "#000"; const reduce = true; const WORLDS = {}; const MG_ART = {};
    const window = {}; const navigator = {}; let T = 0; const now = () => T;
    const Dapur = { tier: () => ({ ix: 2 }) }; const wallet = () => ({ best: { brawl: 0 } }); const $ = () => null;
    const Sfx = { play() {} }; const mgAdd = n => { FC.score += n; }; const mgPick = () => {};
  `;
  const src = fs.readFileSync(path.join(__dirname, "..", "ui", "38i-brawl.js"), "utf8");
  vm.runInContext(stubs + src + `
    globalThis.api = {
      start(daily, lvl) {
        FC = { daily, rnd: Math.random, score: 0, caught: 0, over: 0, drop: null };
        brawlInit(); FC.br.diff = BR_DIFF[lvl == null ? 2 : lvl];
        const me = FC.br.f[0]; me.ai = { t: 0, mx: 0, up: false, dn: false, hold: 0, tg: null }; me.cpu = BR_CPU[1]; FC.br.auto = true;
        return FC;
      },
      tick(dt) { T += dt * 1000; brTick(dt); },
      BR_MAIN, BR_MV, brNew, brHit, get FC() { return FC; }, set FC(v) { FC = v; },
    };`, ctx);
  return ctx.api;
}
function match(seed, lvl) {
  const api = load(seed), FC = api.start(false, lvl);
  let t = 0, stuck = 0;
  while (!FC.over && t < 200) {
    api.tick(1 / 60); t += 1 / 60;
    for (const f of FC.br.f) {
      const M = api.BR_MAIN;
      if (!f.out && f.resp <= 0 && f.y > M.y + 2 && f.y - 64 < M.bot && f.x > M.x0 + 5 && f.x < M.x1 - 5) stuck++;
    }
  }
  const kos = FC.br.f.reduce((s, f) => s + f.falls, 0);
  return { t, kos, over: !!FC.over, stuck, place: FC.place, score: FC.score, left: FC.br.left };
}

test("ronde selalu selesai dan ada KO-nya", () => {
  const R = [];
  for (let s = 1; s <= 12; s++) R.push(match(s * 977, 2));
  for (const r of R) { assert.ok(r.over, "ronde selesai"); assert.ok(r.kos >= 1, "ada yang jatuh"); assert.equal(r.stuck, 0, "nggak ada yang masuk ke dalam pulau"); assert.ok(r.place >= 0 && r.place <= 3); }
  const avg = R.reduce((s, r) => s + r.kos, 0) / R.length, len = R.reduce((s, r) => s + r.t, 0) / R.length;
  if (process.env.BRAWL_LOG) console.log({ avgKO: avg, avgLen: len, R });
  assert.ok(avg >= 3, `rata-rata KO ${avg}`);
});

test("pukulan berat yang dicas mental lebih jauh dari tonjokan biasa", () => {
  const api = load(5); api.start(false, 2);
  const a = api.brNew(0, { name: "A", col: "#fff", me: true }), b1 = api.brNew(1, { name: "B", col: "#fff" }), b2 = api.brNew(1, { name: "B", col: "#fff" });
  b1.dmg = b2.dmg = 80;
  api.brHit(a, b1, api.BR_MV.jab, 0, 1); api.brHit(a, b2, api.BR_MV.side, 0.7, 1);
  assert.ok(Math.hypot(b2.vx, b2.vy) > Math.hypot(b1.vx, b1.vy) * 2);
  assert.ok(b2.dmg > b1.dmg);
});

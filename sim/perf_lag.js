/* global __e, window, performance, requestAnimationFrame */
// Profil lag (v87): buka save contoh di layar HP, lalu tiap skenario (rumah, layar Games, tiap mini game) diukur fps (rAF),
// waktu JS per frame, lama tick(), dan fungsi JS terberat (CDP Profiler). CPU dilambatkan seperti HP (THR, bawaan 4x).
// Pakai: npm run build && node sim/perf_lag.js [skenario...]   knob: THR DPR SECS SHOT=<folder screenshot> EXP=<kode dijalankan sebelum ukur>
// Catatan: Chromium headless menggambar WebGL dan kanvas pakai CPU (SwiftShader), jadi angka absolutnya jauh lebih lambat dari HP; bandingkan sebelum vs sesudah.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'); const DIR = (process.env.SITE || __dirname + '/../_site/').replace(/\/?$/, '/');
const THR = +process.env.THR || 4, DPR = +process.env.DPR || 3, SECS = +process.env.SECS || 4;
const only = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const st = JSON.parse(fs.readFileSync(__dirname + '/fixtures/state_akun-biz4.json')); const DAYS = 1400;
  st.jam = { base_ts: Date.now() - (DAYS - 1 + 0.6) * 86400000, base_day: 0, ms: 86400000 }; st.res_seen = []; st.nama = 'Mochi';
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { const R = window.requestAnimationFrame.bind(window); window.__js = []; window.requestAnimationFrame = cb => R(t => { const a = performance.now(); cb(t); window.__js.push(performance.now() - a); }); });
  await p.addInitScript(s => { localStorage.setItem('makhluk-kecil-3d-v2', s); localStorage.setItem('mk-q', '0'); for (const k of ['ventures','biz','ward','paws','burrow','bazaar','stars','kindred','wallet','homes']) localStorage.setItem('intro:'+k,'1'); }, JSON.stringify(st));
  await p.goto('file://' + require('./_probe.js')(DIR)); await p.waitForTimeout(5000);
  const E = src => p.evaluate(s => { try { return __e(s); } catch (e) { return 'ERR ' + e.message; } }, src);
  await E("for (let i=0;i<40&&game.pending;i++){game.answer(game.pending.key,Object.keys(game.pending.options)[0],0);tick()} closeSheet(); for (let i = 0; i < 6 && bk; i++) closeBook(); closeSheet(); 1");
  await p.waitForTimeout(1000);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THR });
  const SC = {
    hud: { go: "closeSheet(); 1" },
    town: { go: "typeof showTown==='function'?(showTown(),1):'no showTown'", end: "typeof closeTown==='function'&&closeTown(); 1" },
    arc: { go: "showKitchen(); 1", end: "arcClose(); 1" },
    potong: { go: "showKitchen(); mgStart('potong'); FC.run||mgRun(); 1", end: "mgEnd(true); arcClose(); 1" },
    buah: { go: "showKitchen(); mgStart('buah'); FC.run||mgRun(); 1", end: "mgEnd(true); arcClose(); 1" },
    stack: { go: "showKitchen(); mgStart('stack'); FC.run||mgRun(); 1", end: "mgEnd(true); arcClose(); 1" },
    pisau: { go: "showKitchen(); mgStart('pisau'); FC.run||mgRun(); 1", end: "mgEnd(true); arcClose(); 1" },
    hop: { go: "showKitchen(); mgStart('hop'); FC.run||mgRun(); 1", end: "mgEnd(true); arcClose(); 1" },
    ingat: { go: "showKitchen(); mgStart('ingat'); FC.run||mgRun(); 1", end: "mgEnd(true); arcClose(); 1" },
    lari: { go: "showKitchen(); mgStart('lari'); FC.run||mgRun(); 1", end: "mgEnd(true); arcClose(); 1" },
    kuis: { go: "showKitchen(); mgStart('kuis'); FC.run||mgRun(); 1", end: "mgEnd(true); arcClose(); 1" },
    kart: { go: "showKitchen(); mgStart('kart'); mgRun(); 1", end: "mgEnd(true); arcClose(); 1", wait: 4000 },
    brawl: { go: "showKitchen(); mgStart('brawl'); mgRun(); 1", end: "mgEnd(true); arcClose(); 1", wait: 3000 },
  };
  for (const [name, s] of Object.entries(SC)) {
    if (only.length && !only.includes(name)) continue;
    const r0 = await E(s.go); if (r0 !== 1) { console.log(name, 'GO', r0); continue; }
    await p.waitForTimeout(s.wait || 1500);
    if (process.env.EXP) console.log('EXP', await E(process.env.EXP));
    await cdp.send('Profiler.start');
    await p.evaluate(() => { window.__js = []; window.__tk = []; if (!window.__tw) { window.__tw = 1; } });
    await E("if(!window.__tkw){window.__tkw=1;const _t=tick;clearInterval(timer);timer=setInterval(()=>{const a=performance.now();_t();window.__tk.push(performance.now()-a)},500)} 1");
    const fr = await p.evaluate(secs => new Promise(res => { const d = []; let l = performance.now(); const t0 = l; const f = t => { d.push(t - l); l = t; if (t - t0 < secs * 1000) requestAnimationFrame(f); else res(d); }; requestAnimationFrame(f); }), SECS);
    const { profile } = await cdp.send('Profiler.stop');
    const self = {}, byId = {}; for (const n of profile.nodes) byId[n.id] = n;
    const dts = profile.timeDeltas;
    profile.samples.forEach((id, i) => { const n = byId[id]; const cf = n.callFrame; const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`; self[k] = (self[k] || 0) + (dts[i] || 0); });
    const top = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `   ${(v / 1000).toFixed(0).padStart(5)}ms ${k}`);
    fr.sort((a, b) => a - b); const med = fr[fr.length >> 1], p90 = fr[Math.floor(fr.length * 0.9)];
    const js = await p.evaluate(() => { const a = window.__js.slice().sort((x, y) => x - y); const tk = window.__tk.slice().sort((x, y) => x - y); return { sum: a.reduce((x, y) => x + y, 0), n: a.length, p90: a[Math.floor(a.length * 0.9)] || 0, max: a[a.length - 1] || 0, tk: tk.map(x => x.toFixed(0)).join(',') }; });
    console.log(`   rAF JS: ${(js.sum / SECS).toFixed(0)}ms per detik, p90 ${js.p90.toFixed(1)}ms, max ${js.max.toFixed(0)}ms; tick ms: ${js.tk}`);
    console.log(`== ${name}: ${(fr.length / SECS).toFixed(1)} fps, median ${med.toFixed(0)}ms, p90 ${p90.toFixed(0)}ms`); console.log(top.join('\n'));
    if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT + '/' + name + '.png' });
    if (process.env.EXP) console.log('AFTER', await p.evaluate(() => window.__ss));
    if (s.end) await E(s.end); await p.waitForTimeout(500);
  }
  console.log('errs', [...new Set(errs)].slice(0, 5));
  await b.close();
})();

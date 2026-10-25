/* global __e */ // kait eval di halaman (lihat _probe.js)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => { const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const E = src => p.evaluate(s => __e(s), src);
await p.addInitScript(() => { if (!localStorage.getItem('makhluk-kecil-3d-v2')) localStorage.setItem('makhluk-kecil-3d-v2', JSON.stringify({ akun: 'akun-test1', nama: 'Mochi', aturan: { sekolah: 'wajib' }, wakil: 'aman', hadir: [], jawaban: {}, aksi: [], dilihat: 1e9, res_seen: [], rawat_from: 690, jam: { base_ts: Date.now() - 700.8 * 86400000, base_day: 0, ms: 86400000, mid: true } })); });
await p.goto('file://' + require('./_probe.js')(process.env.SITE || __dirname + '/../_site/')); await p.waitForTimeout(3500);
for (let i = 0; i < 20; i++) { const has = await E("!!game.pending"); if (!has) break; await E("game.answer(game.pending.key, Object.keys(game.pending.options)[0], 0); tick()"); await p.waitForTimeout(200); }
await E("closeSheet()");
await E("careAct(careView().items[0], 'fruit'); careAct(careView().items[2], 'family'); careAct(careView().items[3], 'cuddle'); careAct(careView().items[1], null)");
const a = await E("JSON.stringify(game.home.get(cur.id).info.rawat) + '|' + JSON.stringify(game.home.get(cur.id).needs)");
await p.reload(); await p.waitForTimeout(3500);
for (let i = 0; i < 20; i++) { const has = await E("!!game.pending"); if (!has) break; await E("game.answer(game.pending.key, Object.keys(game.pending.options)[0], 0); tick()"); await p.waitForTimeout(200); }
const bb = await E("JSON.stringify(game.home.get(cur.id).info.rawat) + '|' + JSON.stringify(game.home.get(cur.id).needs)");
console.log(await E("JSON.stringify(state.aksi) + JSON.stringify(game.actions[700]) + game.half_now + ' last ' + game.home.last_day + ' siang ' + game.home.get(cur.id).info.siang")); console.log(a); console.log(a === bb ? "SAME after reload" : "DIFF: " + bb); console.log(errs); await b.close(); })();

/* global __e */ // kait eval di halaman (lihat _probe.js)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'); const DIR = (process.env.SITE || __dirname + '/../_site/').replace(/\/?$/, '/');
(async () => { const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
for (const f of process.argv.slice(2)) {
  const st = JSON.parse(fs.readFileSync(f)); const DAYS = 1400;
  st.jam = { base_ts: Date.now() - (DAYS - 1 + 0.6) * 86400000, base_day: 0, ms: 86400000 }; st.res_seen = []; st.nama = 'Mochi';
  const errs = []; const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGE ' + e.message + ' @ ' + (e.stack||'').split('\n')[1])); p.on('console', m => { if (m.type()==='error') errs.push('CON ' + m.text()); });
  await p.addInitScript(s => { localStorage.setItem('makhluk-kecil-3d-v2', s); for (const k of ['ventures','biz','ward','paws','burrow','bazaar','stars','kindred','wallet','homes']) localStorage.setItem('intro:'+k,'1'); }, JSON.stringify(st));
  await p.goto('file://' + require('./_probe.js')(DIR)); await p.waitForTimeout(4000);
  const E = src => p.evaluate(s => { try { return __e(s); } catch (e) { return 'ERR ' + e.message; } }, src);
  await E("for (let i=0;i<40&&game.pending;i++){game.answer(game.pending.key,Object.keys(game.pending.options)[0],0);tick()} closeSheet(); 1");
  const ids = JSON.parse(await E("JSON.stringify(game.home.living(today()).map(m=>m.id))"));
  const log = [];
  for (const id of ids) {
    await E(`select('${id}'); 1`); await p.waitForTimeout(200);
    const apps = JSON.parse(await E(`showPhone('home'); JSON.stringify(phApps(game.home.get('${id}')).map(a=>a.id))`));
    for (const a of apps) {
      const r = await E(`phOpen('${a}'); 1`); if (r !== 1) log.push(`${id} open ${a}: ${r}`);
      await p.waitForTimeout(150);
      for (const attr of ['ba', 'wd', 'pw']) {
        const tabs = JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('[data-${attr}^="tab:"]')].map(e=>e.dataset.${attr}))`) || '[]');
        for (const t of tabs) { const fn = { ba: 'baDo', wd: 'wdDo', pw: 'pwDo' }[attr]; const r2 = await E(`${fn}('${t}'); 1`); if (r2 !== 1) log.push(`${id} ${a} ${t}: ${r2}`); }
      }
      // click every non-mutating sub-nav button (data-go / data-open) once
      const n = await E(`[...document.querySelectorAll('#phView [data-go]')].length`); log.push(`${id.split('/')[1]} ${a} ok (go:${n})`);
      await E("closeSheet && closeSheet(); 1");
    }
    await E("closePhone && closePhone(true); 1");
    for (const fn of ["showBurrow('jobs')", "showBurrow('feed')", "showBazaar('new')", "showBazaar('used')", `showTree('${id}')`, "showStatus && showStatus()"]) { const r = await E(fn + "; 1"); if (r !== 1) log.push(`${id} ${fn}: ${r}`); await p.waitForTimeout(100); await E("closeSheet(); 1"); }
  }
  console.log('==', f, 'members', ids.length, 'errs', errs.length); console.log(log.filter(l => !/ ok /.test(l)).join('\n')); console.log(log.filter(l => / ok /.test(l)).join(' | '));
  console.log([...new Set(errs)].slice(0, 10).join('\n'));
  await ctx.close();
}
await b.close(); })();

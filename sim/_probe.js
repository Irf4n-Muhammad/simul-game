// Salinan halaman untuk harness Playwright: ui.js dibungkus (() => { ... })();, jadi
// fungsi UI tidak bisa dipanggil dari luar. Helper ini menulis ui.probe.js (ui.js + kait
// globalThis.__e = s => eval(s) di baris pertama IIFE) dan preview.html yang memuatnya.
// Keduanya file hasil (di-gitignore) dan tidak pernah ikut build rilis.
const fs = require('fs');
module.exports = function probe(site) {
  site = site.replace(/\/?$/, '/');
  const WRAP = '(() => {';
  const ui = fs.readFileSync(site + 'ui.js', 'utf8');
  if (!ui.startsWith(WRAP)) throw new Error('ui.js tidak diawali ' + WRAP);
  fs.writeFileSync(site + 'ui.probe.js', WRAP + ' globalThis.__e = s => eval(s);' + ui.slice(WRAP.length));
  const html = fs.readFileSync(site + 'index.html', 'utf8');
  const tag = '<script src="ui.js"></script>';
  if (!html.includes(tag)) throw new Error('index.html tidak memuat ui.js');
  fs.writeFileSync(site + 'preview.html', html.replace(tag, '<script src="ui.probe.js"></script>'));
  return site + 'preview.html';
};

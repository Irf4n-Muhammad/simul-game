const $ = id => document.getElementById(id);
const app = $("app"), canvas = $("scene");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const { YEAR } = Engine;
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const md = s => esc(s).replace(/_(.+?)_/g, "<em>$1</em>");

// Tulis DOM cuma kalau isinya berubah. HUD diperbarui tiap 0,5 detik; menulis ulang innerHTML yang sama bikin tombol
// diganti elemen baru di tengah ketukan (ketukannya hilang, terasa "lag") dan memicu hitung ulang gaya/tata letak.
const setHtml = (el, h) => { if (el && el._h !== h) { el._h = h; el.innerHTML = h; return true; } return false; };
const setText = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
const setAttr = (el, k, v) => { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };
const setHidden = (el, h) => { if (el && el.hidden !== h) el.hidden = h; };

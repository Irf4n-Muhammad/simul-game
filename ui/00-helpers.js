const $ = id => document.getElementById(id);
const app = $("app"), canvas = $("scene");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const { YEAR } = Engine;
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const md = s => esc(s).replace(/_(.+?)_/g, "<em>$1</em>");


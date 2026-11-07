// ---- Buku Bintang (rasi.js): rapor + skill dalam bentuk buku. Sampai umur 30 hari bukunya buku catatan pensil;
// malam pembacaan di umur 30 mengubah wujudnya: sampul warna bintang makhluk itu, tinta emas, segel bakat.
// Membuka buku = peta bintang (ui/16-stars.js): pohon bakat sebagai satu peta yang digeser, dibaca dari tengah.
// Dibuka dari tombol buku di HUD; diary keluarga tetap bisa dibuka dari dalam buku.
let bk = null;
const BK_FIG = {
  bow: "M30 14 Q78 50 30 86 M30 14 L30 86 M16 50 H86 M86 50 L76 43 M86 50 L76 57 M22 50 L15 43 M22 50 L15 57",
  staff: "M44 92 V32 Q44 12 62 12 Q78 12 78 28 Q78 40 66 40 M36 58 H52",
  horseshoe: "M30 88 L28 60 Q24 18 50 18 Q76 18 72 60 L70 88 H58 L60 62 Q62 32 50 32 Q38 32 40 62 L42 88 Z",
  eagle: "M50 30 V74 M50 40 Q30 22 8 32 Q26 38 32 46 Q18 50 12 60 Q34 58 50 52 M50 40 Q70 22 92 32 Q74 38 68 46 Q82 50 88 60 Q66 58 50 52 M50 30 Q50 18 60 22 L54 28 M44 74 L50 88 L56 74",
  ship: "M12 62 H88 L76 80 H24 Z M50 62 V12 M50 16 Q76 34 50 56 M50 12 L62 16 L50 20 M10 90 Q20 84 30 90 T50 90 T70 90 T90 90",
  bear: "M50 30 A26 26 0 1 1 49.9 30 M30 34 A9 9 0 1 1 29.9 34 M70 34 A9 9 0 1 1 69.9 34 M44 66 Q50 72 56 66",
  river: "M8 34 Q24 22 40 34 T72 34 T92 30 M8 54 Q24 42 40 54 T72 54 T92 50 M8 74 Q24 62 40 74 T72 74 T92 70",
  swan: "M16 66 Q22 88 54 88 Q82 88 88 64 L72 70 Q60 72 56 62 Q48 42 56 30 Q62 16 50 14 Q42 14 42 22 L32 25 L42 27",
  dog: "M50 24 Q72 24 72 50 Q72 72 50 72 Q28 72 28 50 Q28 24 50 24 M30 34 Q12 40 18 66 Q28 62 29 48 M70 34 Q88 40 82 66 Q72 62 71 48 M44 60 Q50 65 56 60 M34 76 Q50 86 66 76 M50 82 V88",
  wheel: "M50 16 A34 34 0 1 1 49.9 16 M50 44 A6 6 0 1 1 49.9 44 M56.9 54 L77.7 66 M50 58 L50 82 M43.1 54 L22.3 66 M43.1 46 L22.3 34 M50 42 L50 18 M56.9 46 L77.7 34",
  paw: "M50 52 Q68 52 68 68 Q68 82 50 82 Q32 82 32 68 Q32 52 50 52 M30 38 A7 8 0 1 1 29.9 38 M44 24 A7 8 0 1 1 43.9 24 M58 24 A7 8 0 1 1 57.9 24 M72 38 A7 8 0 1 1 71.9 38",
  harp: "M30 18 Q22 60 40 82 H60 Q78 60 70 18 M26 26 H74 M42 26 V80 M50 26 V82 M58 26 V80",
};
const BK_DOTS = { horseshoe: [[34, 70], [66, 70], [36, 44], [64, 44]], bear: [[42, 52], [58, 52], [50, 62]], dog: [[42, 46], [58, 46], [50, 55]] };
// glyph: goresan besar = akar pertama, goresan kecil = akar kedua
const BK_STROKE = (r, s) => { const h = s / 2; return { body: `M${-h} ${h} L0 ${-h} L${h} ${h}`, mind: `M${h} 0 A${h} ${h} 0 1 1 ${h - 0.01} -0.5`,
  spark: `M${-h * 0.6} ${-h} L${h * 0.35} ${-h * 0.15} L${-h * 0.35} ${h * 0.15} L${h * 0.6} ${h}`, heart: `M${-h} ${-h * 0.5} Q0 ${h * 1.5} ${h} ${-h * 0.5}` }[r]; };
const bkGlyph = (s, col, sw = 2.4) => `<g stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none"><g transform="translate(-5 -3)"><path d="${BK_STROKE(s.first, 24)}"/></g><g transform="translate(14 13)"><path d="${BK_STROKE(s.second, 12)}"/></g></g>`;
const bkFig = (fig, col, sw = 3.4) => `<path d="${BK_FIG[fig]}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>${(BK_DOTS[fig] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${col}"/>`).join("")}`;
const bkSpark = (x, y, r, k = 0.18) => `M${x} ${y - r} Q${x + r * k} ${y - r * k} ${x + r} ${y} Q${x + r * k} ${y + r * k} ${x} ${y + r} Q${x - r * k} ${y + r * k} ${x - r} ${y} Q${x - r * k} ${y - r * k} ${x} ${y - r} Z`;

function bkSnap(id) {
  const c = game.home.get(id); if (!c || !c.st) return null;
  const day = today(), stage = Rasi.stage(c.born, day), star = Rasi.starOf(c.st);
  return { c, day, stage, star, read: stage === "read", left: Rasi.daysToReading(c.born, day) };
}

// ---------------------------------------------------------------- sampul
function bkCover(S) {
  const W = 270, H = 370;
  if (!S.read) {
    // buku catatan: karton cokelat, label kertas, tulisan pensil
    return `<svg viewBox="0 0 ${W} ${H}" class="bk-cover-svg" aria-hidden="true">
      <rect x="22" y="14" width="236" height="344" rx="6" fill="#E9DFC8"/>
      <rect x="14" y="8" width="236" height="344" rx="8" fill="#B08A5C"/>
      <rect x="14" y="8" width="22" height="344" rx="6" fill="#8E6A40"/>
      <rect x="70" y="120" width="140" height="70" rx="4" fill="#F4EDDC" stroke="#8E6A40" stroke-width="1"/>
      <path d="M82 146 H198 M82 166 H198" stroke="#C9B898" stroke-width="1"/>
      <text x="140" y="160" text-anchor="middle" font-family="Caveat, cursive" font-size="26" fill="#5A5048">${esc(S.c.name)}'s notebook</text>
      <path d="${bkSpark(140, 250, 14)}" fill="none" stroke="#6E5A44" stroke-width="1.2" stroke-dasharray="3 3"/>
    </svg>`;
  }
  const s = S.star, [L, D, M1, M2, G] = s.pal, cx = 152, cy = 158, R = 76;
  const ticks = Array.from({ length: 60 }, (_, t) => { const a = t * Math.PI / 30, l = t % 5 ? 3 : 6; return `M${(cx + R * Math.sin(a)).toFixed(1)} ${(cy - R * Math.cos(a)).toFixed(1)} L${(cx + (R - l) * Math.sin(a)).toFixed(1)} ${(cy - (R - l) * Math.cos(a)).toFixed(1)}`; }).join(" ");
  const corner = (tx, ty, sx, sy) => `<g transform="translate(${tx} ${ty}) scale(${sx} ${sy})"><path d="M0 0 H40 Q34 6 32 14 Q20 16 14 32 Q6 34 0 40 Z" fill="url(#bkM)" stroke="${M2}" stroke-width="0.8"/><circle cx="9" cy="9" r="2.2" fill="${M2}"/></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="bk-cover-svg" aria-hidden="true">
    <defs>
      <linearGradient id="bkL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L}"/><stop offset="1" stop-color="${D}"/></linearGradient>
      <radialGradient id="bkV" cx="0.55" cy="0.4" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.1"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></radialGradient>
      <linearGradient id="bkM" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${M2}"/><stop offset="0.45" stop-color="${M1}"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.8" stop-color="${M1}"/><stop offset="1" stop-color="${M2}"/></linearGradient>
      <filter id="bkG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect x="22" y="14" width="236" height="344" rx="6" fill="#D8C8A0"/>
    <rect x="14" y="8" width="236" height="344" rx="8" fill="url(#bkL)"/>
    <rect x="14" y="8" width="236" height="344" rx="8" fill="url(#bkV)"/>
    <rect x="14" y="8" width="22" height="344" rx="6" fill="#000" opacity="0.35"/>
    <rect x="46" y="20" width="192" height="320" fill="none" stroke="url(#bkM)" stroke-width="1.6"/>
    <rect x="52" y="26" width="180" height="308" fill="none" stroke="${M1}" stroke-width="0.6" opacity="0.5"/>
    <circle cx="${cx}" cy="${cy}" r="${R + 14}" fill="${G}" opacity="0.1" filter="url(#bkG)"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="${D}" fill-opacity="0.55" stroke="url(#bkM)" stroke-width="2.6"/>
    <circle cx="${cx}" cy="${cy}" r="${R - 12}" fill="none" stroke="${M1}" stroke-width="0.7" opacity="0.6"/>
    <path d="${ticks}" stroke="${M1}" stroke-width="0.9" opacity="0.8"/>
    <g transform="translate(${cx - 46} ${cy - 46}) scale(0.92)" filter="url(#bkG)">${bkFig(s.fig, M1, 3.6)}</g>
    <text x="${cx}" y="290" text-anchor="middle" font-family="Cinzel, serif" font-size="${s.name.length < 10 ? 19 : 15}" font-weight="700" letter-spacing="4" fill="url(#bkM)">${s.name.toUpperCase()}</text>
    <path d="M${cx - 50} 302 H${cx - 12} M${cx + 12} 302 H${cx + 50}" stroke="${M1}" stroke-width="0.7" opacity="0.7"/>
    <g transform="translate(${cx} 308) scale(0.62)">${bkGlyph(s, M1, 3)}</g>
    ${corner(36, 8, 1, 1)}${corner(250, 8, -1, 1)}${corner(36, 352, 1, -1)}${corner(250, 352, -1, -1)}
    <rect x="236" y="158" width="26" height="40" rx="5" fill="url(#bkM)" stroke="${M2}" stroke-width="1"/>
    <circle cx="249" cy="174" r="3.4" fill="${D}"/><path d="M247.5 176 L246.5 186 H251.5 L250.5 176 Z" fill="${D}"/>
  </svg>`;
}

// ---------------------------------------------------------------- layar
function showBook(id = cur && cur.id, ritual = false) {
  const S = bkSnap(id); if (!S) return;
  closeSheet(); if (PH) closePhone(true); Tele.layar("app", "book");
  if (bk) bk.el.remove();
  const el = document.createElement("div"); el.className = "bk"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", `${S.c.name}'s book`);
  if (sky) closeSky();
  bk = { el, S };
  $("app").appendChild(el);
  bkDraw();
  requestAnimationFrame(() => el.classList.add("on"));
  if (ritual) bkRitual();
}
function bkDraw() {
  const { el, S } = bk, s = S.star;
  const top = `<div class="bk-top"><button class="bk-x" aria-label="Close">✕</button><span class="bk-cap-t">${S.read ? `Born under ${esc(s.name)}` : `${esc(S.c.name)}'s notebook`}</span><button class="bk-diary">Family diary</button></div>`;
  el.innerHTML = `${top}<button class="bk-closed" aria-label="Open the book">${bkCover(S)}</button>
    <p class="bk-hint">${S.read ? "" : S.left ? `In ${S.left} day${S.left === 1 ? "" : "s"}, the stars read this book.` : ""}</p>`;
  // buka buku = peta bintang (ui/16-stars.js)
  el.querySelector(".bk-closed").onclick = () => bkOpen(false);
  el.querySelector(".bk-x").onclick = closeBook;
  el.querySelector(".bk-diary").onclick = () => { closeBook(); showDiary(); };
}
function bkOpen(spread) {
  const id = bk.S.c.id; closeBook(); showTree(id, null, spread);
}
function closeBook() {
  if (!bk) return; const b = bk; bk = null;
  b.el.classList.remove("on"); setTimeout(() => b.el.remove(), 380);
}

// ---------------------------------------------------------------- malam pembacaan
function bkRitual() {
  const { el, S } = bk, s = S.star;
  state.buku = state.buku || {}; state.buku[S.c.id] = S.day; save();
  Tele.ev("rasi", { k: s.id });
  const r = document.createElement("div"); r.className = "bk-rit";
  r.innerHTML = `<div class="bk-rit-book"><div class="old">${bkCover({ ...S, read: false })}</div><div class="new">${bkCover(S)}</div></div>
    <div class="bk-rit-t"><small>The night of the reading</small><b>${esc(S.c.name)} was born under ${esc(s.name)}</b><span>${esc(s.figName)}, in ${esc(s.con)}. ${esc(Rasi.plain(s))}</span>
    <em>Not from a birthday: the stars read it from how ${esc(S.c.name)} grew this month.</em><button>Open the book</button></div>`;
  el.appendChild(r);
  requestAnimationFrame(() => r.classList.add("go"));
  r.querySelector("button").onclick = () => bkOpen(true);
}
// sekali per makhluk: begitu umurnya sampai 30 hari dan pemain sedang di rumah, bukunya dibaca
function bkCheck() {
  if (!game || !cur || bk || sky || PH || sheetKind || tour || document.visibilityState !== "visible") return;
  if (cur.fase === "meninggal" || cur.fase === "merantau") return;
  if ($("app").classList.contains("in-town")) return;
  const c = game.home.get(cur.id); if (!c || !c.st) return;
  if (Rasi.stage(c.born, today()) !== "read" || (state.buku && state.buku[c.id] != null)) return;
  showBook(c.id, true);
}
setInterval(bkCheck, 2500);

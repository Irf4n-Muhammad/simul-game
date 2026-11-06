// ---- Buku Bintang (rasi.js): rapor + skill dalam bentuk buku. Sampai umur 30 hari bukunya buku catatan pensil;
// malam pembacaan di umur 30 mengubah wujudnya: sampul warna bintang makhluk itu, tinta emas, segel bakat.
// Satu halaman per akar (Body, Mind, Spark, Heart) yang sudah dimulai; jalurnya dari pohon bakat (tree.js).
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

// ---------------------------------------------------------------- halaman
function bkPages(S) {
  const pages = [];
  if (S.read) pages.push({ kind: "star" });
  const v = Tree.view(S.c, game.home, S.day);
  for (const r of Rasi.ORDER) {
    const owned = v.have.filter(id => Tree.NODES[id].root === r && id !== r).sort((a, b) => (v.nodes[a].day || 0) - (v.nodes[b].day || 0));
    const skill = Math.round(S.c.st.skills[Rasi.ROOTS[r]] || 0);
    if (!owned.length && !v.have.includes(r) && skill < 3) continue;
    pages.push({ kind: "root", r, owned, skill, v });
  }
  if (pages.length === (S.read ? 1 : 0)) pages.push({ kind: "empty" });
  return pages;
}
function bkPageHTML(S, p, i, n) {
  const W = 300, H = 440, red = S.read ? "#7A1E14" : "#6A6660", gold = S.read ? "url(#bkGold)" : "#8A8680";
  const defs = `<defs><linearGradient id="bkGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6E4A10"/><stop offset="0.35" stop-color="#E8C46A"/><stop offset="0.55" stop-color="#FFF0B8"/><stop offset="0.75" stop-color="#C9962E"/><stop offset="1" stop-color="#6E4A10"/></linearGradient>
    <filter id="bkGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  const frame = S.read ? `<rect x="22" y="12" width="${W - 34}" height="${H - 24}" fill="none" stroke="url(#bkGold)" stroke-width="1.3"/><rect x="27" y="17" width="${W - 44}" height="${H - 34}" fill="none" stroke="#7A5212" stroke-width="0.5" opacity="0.6"/>`
    : `<path d="M24 ${H - 30} H${W - 14}" stroke="#B8B0A0" stroke-width="0.6"/>${Array.from({ length: 15 }, (_, k) => `<path d="M24 ${70 + k * 24} H${W - 14}" stroke="#C9C2B4" stroke-width="0.5"/>`).join("")}`;
  const wm = S.read ? `<path d="${bkSpark(W / 2 + 6, H / 2, 100)}" fill="#5A3A18" opacity="0.06"/><path d="${bkSpark(W / 2 + 6, H / 2, 100)}" fill="none" stroke="#5A3A18" stroke-width="0.9" opacity="0.14"/>` : "";
  const num = `<text x="${W / 2 + 6}" y="${H - 18}" text-anchor="middle" font-family="${S.read ? "Cinzel, serif" : "Caveat, cursive"}" font-size="${S.read ? 10 : 15}" letter-spacing="2" fill="${S.read ? "#6A4512" : "#6A6660"}">${S.read ? Rasi.roman(i + 1) : i + 1}</text>`;
  let body = "", html = "";
  const age = d => d == null ? "" : (S.read ? Rasi.roman(Math.max(1, d - S.c.born)) : "day " + Math.max(1, d - S.c.born));
  if (p.kind === "star") {
    const s = S.star;
    body = `<circle cx="${W / 2 + 6}" cy="128" r="62" fill="#FFE9A8" opacity="0.5" filter="url(#bkGlow)"/><path d="${bkSpark(W / 2 + 6, 128, 70)}" fill="none" stroke="url(#bkGold)" stroke-width="1.6"/>
      <g transform="translate(${W / 2 + 6 - 42} 86) scale(0.84)">${bkFig(s.fig, "#6A4512", 3.6)}</g>`;
    html = `<div class="bk-t" style="top:28px">BORN UNDER</div>
      <div class="bk-h" style="top:214px">${esc(s.name)}</div>
      <div class="bk-i" style="top:250px">${esc(s.figName)}, in ${esc(s.con)}. ${esc(s.fact)}</div>
      <div class="bk-p" style="top:312px">${esc(Rasi.plain(s))}</div>
      <div class="bk-r" style="top:362px">Stars like this often become ${esc(s.fits)}.</div>`;
  } else if (p.kind === "empty") {
    html = `<div class="bk-i" style="top:180px">${S.read ? "The pages are waiting." : "Nothing written yet."} Pages appear once ${esc(S.c.name)} starts on something.</div>`;
  } else {
    const r = p.r, root = Tree.NODES[r], col = root.color || "#3A2A58";
    const shown = p.owned.slice(-4);
    const nexts = Tree.ORDER.filter(id => Tree.NODES[id].root === r && p.v.nodes[id].s === "open" && Tree.NODES[id].tier !== "secret").sort((a, b) => p.v.nodes[a].cost - p.v.nodes[b].cost);
    const next = nexts[0] || null;
    const ownedSet = new Set(p.v.have);
    const fields = (p.owned.filter(id => Tree.NODES[id].tier === "field").length ? p.owned.filter(id => Tree.NODES[id].tier === "field") : root.kids.filter(k => Tree.NODES[k].tier === "field"));
    const goals = [];
    for (const f of fields) for (const sp of Tree.NODES[f].kids) if (Tree.NODES[sp].tier === "spec") for (const ni of Tree.NODES[sp].kids) if (Tree.NODES[ni].tier === "niche" && !ownedSet.has(ni) && goals.length < 3 && !goals.includes(ni)) goals.push(ni);
    const chain = shown.concat(next ? [next] : []), nC = chain.length;
    const yTop = 198, yBot = S.read ? 330 : 352, X = [W / 2 + 6, W / 2 - 28, W / 2 + 38, W / 2 - 18, W / 2 + 28];
    const pts = chain.map((id, k) => [X[k % X.length], nC === 1 ? yBot : yBot - (yBot - yTop) * k / (nC - 1)]);
    for (let k = 0; k < nC - 1; k++) {
      const done = k < shown.length - 1;
      body += `<path d="M${pts[k][0]} ${pts[k][1]} L${pts[k + 1][0]} ${pts[k + 1][1]}" stroke="${done ? gold : "#8A5A12"}" stroke-width="${done ? 2.4 : 1.4}" ${done ? "" : 'stroke-dasharray="5 6" opacity="0.75"'}/>`;
    }
    const gx = [W / 2 - 82, W / 2 + 6, W / 2 + 94];
    if (nC) for (let g = 0; g < goals.length; g++) body += `<path d="M${pts[nC - 1][0]} ${pts[nC - 1][1]} L${gx[g]} 112" stroke="#8A5A12" stroke-width="1" stroke-dasharray="1 7" stroke-linecap="round" opacity="0.4"/>`;
    chain.forEach((id, k) => {
      const [x, y] = pts[k], isNext = id === next, isCur = !isNext && k === shown.length - 1;
      if (isNext) body += `<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="${red}" stroke-width="0.9" stroke-dasharray="2 4"/><path d="M${x} ${y - 10} L${x + 10} ${y} L${x} ${y + 10} L${x - 10} ${y} Z" fill="none" stroke="${red}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="2" fill="${red}"/>`;
      else if (isCur && S.read) body += `<circle cx="${x}" cy="${y}" r="26" fill="#FFD877" opacity="0.3" filter="url(#bkGlow)"/><path d="M${x} ${y - 13} L${x + 13} ${y} L${x} ${y + 13} L${x - 13} ${y} Z" fill="url(#bkGold)" stroke="#5A3A0E" stroke-width="1.2"/><path d="M${x} ${y - 6} L${x + 6} ${y} L${x} ${y + 6} L${x - 6} ${y} Z" fill="#FFF3D0"/>`;
      else body += `<path d="M${x} ${y - 8} L${x + 8} ${y} L${x} ${y + 8} L${x - 8} ${y} Z" fill="${gold}" stroke="${S.read ? "#4A2E08" : "#5A5650"}" stroke-width="1"/>`;
      const right = x <= W / 2 + 6, lx = right ? x + 20 : 20, w = right ? W - x - 34 : x - 40;
      const sub = isNext ? `next · ${p.v.nodes[id].cost} point${p.v.nodes[id].cost === 1 ? "" : "s"} of ink` : age(p.v.nodes[id].day);
      html += `<div class="bk-n${isNext ? " nx" : ""}" style="left:${lx}px;top:${y - 14}px;width:${w}px;text-align:${right ? "left" : "right"}"><b>${esc(Tree.NODES[id].label)}</b><i>${esc(sub)}</i></div>`;
    });
    goals.forEach((id, g) => {
      body += `<path d="${bkSpark(gx[g], 112, 11, 0.25)}" fill="none" stroke="${S.read ? "#9A6E1C" : "#7A7670"}" stroke-width="1.3"/>`;
      html += `<div class="bk-g" style="left:${gx[g] - 42}px;top:128px;width:84px">${esc(Tree.NODES[id].label)}</div>`;
    });
    if (nC > 1 && goals.length) html += `<div class="bk-fog" style="top:157px">${S.read ? "the ink here is not yet dry" : "not written yet"}</div>`;
    const seal = Rasi.seal(S.c.st, r, S.c.born, S.day);
    html += (S.read ? `<div class="bk-cap" style="--rc:${col}"><span>${esc(root.label[0])}</span></div>` : "") + `
      <div class="bk-title"><b>${esc(S.read ? root.label.toUpperCase() : root.label)}</b><i>${esc(Rasi.ROOT_PLAIN[r])} · ${p.skill}/100</i></div>`;
    html += seal === "none" ? `<div class="bk-seal pencil"><i>${S.left ? `The stars read this book in ${S.left} day${S.left === 1 ? "" : "s"}.` : ""}</i></div>`
      : seal === "warm" ? `<div class="bk-seal"><em class="wax warm">?</em><span><b>THE WAX IS STILL WARM</b><i>not one of ${esc(S.c.name)}'s two stars</i></span></div>`
      : `<div class="bk-seal"><em class="wax">✦</em><span><b>THE SEAL HAS SPOKEN</b><i>${seal === "first" ? "this ink flows swifter than any other" : "this ink flows swifter than most"}</i></span></div>`;
  }
  // koordinat label ditulis dalam satuan viewBox; ubah ke persen supaya ikut skala halaman
  html = html.replace(/(left|top|width):(-?[\d.]+)px/g, (m, k, v) => `${k}:${(+v / (k === "top" ? H : W) * 100).toFixed(2)}%`);
  return `<div class="bk-page${S.read ? "" : " pencil"}"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${defs}${wm}${frame}${body}${num}</svg>${html}</div>`;
}

// ---------------------------------------------------------------- layar
function showBook(id = cur && cur.id, ritual = false) {
  const S = bkSnap(id); if (!S) return;
  closeSheet(); if (PH) closePhone(true); Tele.layar("app", "book");
  if (bk) bk.el.remove();
  const el = document.createElement("div"); el.className = "bk"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", `${S.c.name}'s book`);
  bk = { el, S, open: false, page: 0, pages: bkPages(S) };
  $("app").appendChild(el);
  bkDraw();
  requestAnimationFrame(() => el.classList.add("on"));
  if (ritual) bkRitual();
}
function bkDraw() {
  const { el, S } = bk, s = S.star;
  const top = `<div class="bk-top"><button class="bk-x" aria-label="Close">✕</button><span class="bk-cap-t">${S.read ? `Born under ${esc(s.name)}` : `${esc(S.c.name)}'s notebook`}</span><button class="bk-diary">Family diary</button></div>`;
  if (!bk.open) {
    el.innerHTML = `${top}<button class="bk-closed" aria-label="Open the book">${bkCover(S)}</button>
      <p class="bk-hint">${S.read ? "" : S.left ? `In ${S.left} day${S.left === 1 ? "" : "s"}, the stars read this book.` : ""}</p>`;
    el.querySelector(".bk-closed").onclick = () => { bk.open = true; bkDraw(); };
  } else {
    const n = bk.pages.length, p = bk.pages[bk.page];
    const leather = S.read ? s.pal : ["#B08A5C", "#8E6A40"];
    el.innerHTML = `${top}<div class="bk-open" style="--l1:${leather[0]};--l2:${leather[1]}">${bkPageHTML(S, p, bk.page, n)}
      ${bk.page < n - 1 ? `<button class="bk-curl" aria-label="Next page"></button>` : ""}</div>
      <div class="bk-nav"><button class="bk-prev" aria-label="Previous page" ${bk.page ? "" : "disabled"}>‹</button><span>${bk.pages.map((_, k) => `<i class="${k === bk.page ? "on" : ""}"></i>`).join("")}</span><button class="bk-next" aria-label="Next page" ${bk.page < n - 1 ? "" : "disabled"}>›</button></div>`;
    const go = d => { const k = bk.page + d; if (k < 0 || k >= n) return; bk.page = k; bkDraw(); };
    el.querySelector(".bk-prev").onclick = () => go(-1);
    el.querySelector(".bk-next").onclick = () => go(1);
    const curl = el.querySelector(".bk-curl"); if (curl) curl.onclick = () => go(1);
    const pg = el.querySelector(".bk-open"); let x0 = null;
    pg.addEventListener("pointerdown", e => { x0 = e.clientX; });
    pg.addEventListener("pointerup", e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); });
  }
  el.querySelector(".bk-x").onclick = closeBook;
  el.querySelector(".bk-diary").onclick = () => { closeBook(); showDiary(); };
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
  r.querySelector("button").onclick = () => { r.remove(); bk.open = true; bkDraw(); };
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

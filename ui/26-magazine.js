// ---- OLD TOWN, the town magazine. A new issue every 1st of the month (real time), the same one for every player.
// The cover goes to someone in the family when they did something big that month, otherwise to a town figure.
const MG = { photos: new Map(), queue: [], busy: false };
const mgRead = () => state.magRead ?? -1;
const mgFresh = () => Mag.latest(today()) > mgRead();
function mgMarkRead(k) { if (k > mgRead()) { state.magRead = k; save(); } }
// every issue gets its own shoot: a layout, a camera, a backdrop, a pose and a little styling
const MG_LAYOUTS = {
  classic: { cam: [0.5, 1.7, 9.8], look: [0, 2.25, 0], x: 0 },
  close: { cam: [0.25, 1.5, 7.2], look: [0, 1.05, 0], x: 0 },
  wide: { cam: [0, 2.4, 15.5], look: [0, 0.4, 0], x: 0 },
  side: { cam: [0.2, 1.8, 10.5], look: [0, 2.2, 0], x: -1.05 },
  dark: { cam: [0, 0.55, 8.6], look: [0, 2.35, 0], x: 0.15 },
};
const MG_POSES = {
  joy: { face: "joy", arms: 0.9 }, wink: { face: "wink", arms: 0.5 }, cool: { face: "calm", look: [0.06, 0], arms: 0.1, tilt: 0.12 },
  proud: { face: "joy", chin: -0.16, arms: 0.2 }, glance: { face: "calm", look: [-0.07, 0.03], turn: 0.55, arms: 0.3 },
  soft: { face: "soft", tilt: -0.14, arms: 0.4 }, wow: { face: "surprise", arms: 1.3 }, wave: { face: "joy", wave: true, tilt: 0.1 },
};
const MG_STYLE = {
  athlete: [["headband", "medal"], ["medal"]], doctor: [["glasses", "scarf"], ["glasses"]], nurse: [["scarf"], ["pearls"], ["flower"]],
  teacher: [["glasses"], ["scarf"], ["glasses", "bowtie"]], office: [["bowtie"], ["pearls"], ["glasses"]], software: [["glasses"], ["shades"]],
  influencer: [["shades"], ["flower"], ["pearls"]], designer: [["beret"], ["beret", "scarf"]], fastfood: [["cap"], ["bowtie"], []],
  founder: [["bowtie", "shades"], ["shades"]], quant: [["bowtie", "glasses"], ["pearls"]],
}
const MG_ANY = [[], ["bowtie"], ["scarf"], ["pearls"], ["shades"], ["flower"]];
function mgProps(p, props) {
  const b = p.body;
  for (const pr of props) {
    if (pr === "shades") {
      const m = M(0x111114, { roughness: 0.15, metalness: 0.3, envMapIntensity: 1.4 });
      for (const sx of [-1, 1]) { const l = mesh(SPH(0.27, 24, 16), m, sx * 0.42, 1.32, 1.12, b); l.scale.set(1.15, 0.85, 0.25); }
      mesh(CYL(0.025, 0.025, 0.3, 8), m, 0, 1.38, 1.22, b).rotation.z = Math.PI / 2;
      p.eyes.forEach(e => e.visible = false);
    }
    if (pr === "bowtie") {
      const m = M(0xB3261E, { roughness: 0.5 }), g = new THREE.Group(); g.position.set(0, 0.72, 1.12); b.add(g);
      for (const sx of [-1, 1]) { const w = mesh(new THREE.ConeGeometry(0.16, 0.3, 4), m, sx * 0.15, 0, 0, g); w.rotation.z = sx * Math.PI / 2; w.scale.z = 0.4; }
      mesh(SPH(0.07, 12, 10), m, 0, 0, 0.03, g);
    }
    if (pr === "pearls") for (let i = 0; i < 15; i++) { const a = -1.25 + i * 2.5 / 14; mesh(SPH(0.06, 12, 10), M(0xF6F0E6, { roughness: 0.2, envMapIntensity: 1.2 }), Math.sin(a) * 0.86, 0.72 - Math.cos(a) * 0.06, Math.cos(a) * 0.82 + 0.28, b); }
    if (pr === "scarf") { const t = mesh(new THREE.TorusGeometry(0.88, 0.13, 12, 40), M(0xD9874A, { roughness: 0.9 }), 0, 0.68, 0.15, b); t.rotation.x = Math.PI / 2; t.scale.y = 0.85; const e = mesh(RB(0.24, 0.55, 0.1, 0.04), M(0xD9874A, { roughness: 0.9 }), 0.35, 0.4, 1.0, b); e.rotation.z = 0.2; }
    if (pr === "medal") { mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 40, Math.PI), M(0x2F5DA8), 0, 1.05, 0.62, b).rotation.set(Math.PI * 0.35, 0, Math.PI); mesh(CYL(0.17, 0.17, 0.05, 28), M(0xD9AE55, { metalness: 0.9, roughness: 0.25, envMapIntensity: 1.4 }), 0, 0.5, 1.14, b).rotation.x = Math.PI / 2; }
    if (pr === "cap") { const g = new THREE.Group(); g.position.set(0, 2.32, 0.05); g.rotation.x = -0.18; b.add(g); const m = M(0xC4502E, { roughness: 0.7 }); mesh(new THREE.SphereGeometry(0.62, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, 0, 0, g).scale.y = 0.7; const v = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 28), m, 0, 0.02, 0.55, g); v.scale.z = 0.75; mesh(SPH(0.07, 10, 8), m, 0, 0.45, 0, g); }
  }
}
function mgPose(p, P) {
  faceFor(p, P.face === "wink" || P.face === "soft" ? "calm" : P.face);
  if (P.face === "wink") { p.eyes[1].userData.arc.visible = true; p.pupils[1].visible = false; }
  if (P.face === "soft") p.eyes.forEach(e => e.scale.set(1.05, 0.62, 1));
  if (P.look) p.pupils.forEach(q => { q.position.x = P.look[0]; q.position.y = P.look[1]; });
  if (P.arms != null) p.arms.forEach(a => a.rotation.z = a.userData.sx * (0.4 + P.arms));
  if (P.wave) { const a = p.arms[1]; a.rotation.z = 2.5; a.position.y = 1.35; }
  p.body.rotation.z = P.tilt || 0; p.body.rotation.x = P.chin || 0;
}
function mgRender(spec) {
  const st = studioScene(), g = new THREE.Group(), L = MG_LAYOUTS[spec.layout]; st.sc.add(g);
  const fl = mesh(new THREE.PlaneGeometry(60, 40), SM(spec.floor, { roughness: 1 }), 0, 0, 0, g); fl.rotation.x = -Math.PI / 2;
  mesh(new THREE.PlaneGeometry(60, 30), SM(spec.bg, { roughness: 1 }), 0, 12, -4.5, g);
  if (spec.disc) mesh(new THREE.CircleGeometry(2.6, 48), SM(spec.disc, { roughness: 1 }), L.x + 0.3, 3.0, -4.4, g);
  const p = makeCreature({ id: spec.id, fase: spec.fase, rupa: spec.rupa, gear: spec.gear }, g);
  p.root.scale.setScalar(PHASE_SCALE[spec.fase] || 1); p.root.position.x = spec.crop ? 0 : L.x; p.root.rotation.y = spec.crop ? (MG_POSES[spec.pose].turn || 0) * 0.6 : spec.turn;
  mgPose(p, MG_POSES[spec.pose]); mgProps(p, spec.props);
  if (spec.partner) {
    p.root.position.x = -1.05; p.root.rotation.y = 0.38;
    const q = makeCreature({ id: spec.partner.id, fase: spec.fase, rupa: spec.partner.rupa, gear: ["flower"] }, g);
    q.root.position.set(1.05, 0, -0.15); q.root.rotation.y = -0.38; mgPose(q, MG_POSES.joy);
    const b2 = mesh(new THREE.PlaneGeometry(2.8, 2.8), F(0xffffff, { map: blobTex, transparent: true, depthWrite: false }), 1.05, 0.02, -0.15, g); b2.rotation.x = -Math.PI / 2;
    st.cam.position.set(0, 2.0, 12.6); st.cam.lookAt(0, 2.05, 0);
  }
  const b = mesh(new THREE.PlaneGeometry(2.8, 2.8), F(0xffffff, { map: blobTex, transparent: true, depthWrite: false }), L.x, 0.02, 0, g); b.rotation.x = -Math.PI / 2;
  const CR = spec.crop && MG_CROPS[spec.crop];
  if (!spec.partner) { st.cam.position.set(...(CR || L).cam); st.cam.lookAt(...(CR || L).look); }
  // hard studio light for the editorial portraits: one strong key from the side, almost no fill
  const lights = st.sc.children.filter(o => o.isLight), saved = lights.map(l => [l.intensity, l.position.clone()]), env = st.sc.environment;
  if (spec.mood) { st.sc.environment = null; lights.forEach(l => { if (l.isHemisphereLight) l.intensity = 0.16; else if (l.position.x < 0) { l.intensity = 1.9; l.position.set(-7, 5, 3); } else { l.intensity = 0.28; l.position.set(6, 3, -4); } }); }
  st.cam.updateProjectionMatrix();
  const pr = renderer.getPixelRatio(), Wd = 360, Hd = 450, size = renderer.getSize(new THREE.Vector2());
  renderer.setScissorTest(true); renderer.setViewport(0, 0, Wd / pr, Hd / pr); renderer.setScissor(0, 0, Wd / pr, Hd / pr);
  renderer.setClearColor(spec.bg, 1); renderer.clear(); renderer.render(st.sc, st.cam);
  const out = document.createElement("canvas"); out.width = Wd; out.height = Hd;
  out.getContext("2d").drawImage(canvas, 0, canvas.height - Hd, Wd, Hd, 0, 0, Wd, Hd);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, size.x, size.y); renderer.setClearColor(0x000000, 0);
  st.sc.remove(g);
  lights.forEach((l, i) => { l.intensity = saved[i][0]; l.position.copy(saved[i][1]); }); st.sc.environment = env;
  return out.toDataURL("image/jpeg", 0.86);
}
const MG_PAL = [["#E9D8C4", "#D8C2A8"], ["#C9D6CF", "#AFC2B8"], ["#E7C9C3", "#D4AEA6"], ["#D3D0E4", "#B9B4D3"], ["#E8DDB5", "#D6C78F"],
  ["#C8D3DE", "#A9B9C9"], ["#F2B33D", "#E0A02A"], ["#9DC3B5", "#86AE9F"], ["#E07A5F", "#C9644A"], ["#F4F1EA", "#E2DCCF"]];
function mgLook(I) {
  const h = hashStr("cover" + I.k + I.cover.who.name), pick = (arr, sh) => arr[(h >>> sh) % arr.length];
  const layout = I.yearly ? "dark" : pick(["classic", "close", "wide", "side", "classic", "close", "side", "dark"], 0);
  const pal = layout === "dark" ? ["#2A262E", "#1E1B22"] : pick(MG_PAL, 5);
  const pose = I.cover.face === "joy" ? pick(["joy", "wink", "proud", "wave", "wow"], 9) : pick(["cool", "glance", "soft", "proud", "wink"], 9);
  const props = pick(MG_STYLE[I.cover.who.ind] || MG_ANY, 13);
  const TY = [["#C8102E", "#fff"], ["#111", "#F2E6D0"], ["#F2B33D", "#111"], ["#E9D8C4", "#C8102E"], ["#1F4E79", "#F4F1EA"], ["#9DC3B5", "#111"]];
  const ty = I.yearly ? ["#111", "#E8C77A"] : pick(TY, 25);
  return { layout: I.cover.kind === "couple" ? "classic" : layout, typeBg: ty[0], typeInk: ty[1], bg: pal[0], floor: pal[1], disc: layout === "side" ? pick(["#ffffff", "#F2E6D0", "#111111", null], 21) : null, pose, props };
}
function mgSpec(I) {
  const w = I.cover.who, m = w.cid ? member(w.cid) : null, c = w.cid ? game.home.get(w.cid) : null;
  const fase = m && m.fase && !["meninggal", "merantau", "bayi"].includes(m.fase) ? m.fase : "dewasa";
  const look = mgLook(I), gear = c ? [] : look.props.filter(x => ["glasses", "beret", "headband", "flower"].includes(x));
  const partner = I.cover.kind === "couple" ? { id: "mag-p-" + I.cover.partner, rupa: rupaFor({ nama: I.cover.partner }) } : null;
  return { key: `${I.k}|${w.name}|${fase}|v4${partner ? "|" + I.cover.partner : ""}`, partner, id: w.cid || "mag-" + w.npc, fase, rupa: c ? c.rupa : rupaFor({ nama: w.npc || w.name }), gear, ...look,
    props: look.props.filter(x => !["glasses", "beret", "headband", "flower"].includes(x)),
    turn: (MG_POSES[look.pose].turn || 0) + (look.layout === "side" ? 0.45 : ((hashStr(w.name) % 5) - 2) * 0.12) };
}
function mgFill(root) {
  for (const img of root.querySelectorAll("img[data-mgc]")) {
    const k = img.dataset.mgc, u = MG.photos.get(k);
    if (u) img.src = u; else if (!MG.queue.includes(k)) MG.queue.push(k);
  }
  if (MG.busy) return;
  MG.busy = true;
  const step = () => {
    const k = MG.queue.shift();
    if (!k) { MG.busy = false; return; }
    if (!MG.photos.has(k)) { try { const sp = MG.specs.get(k); MG.photos.set(k, sp.house ? heroHouse(sp.house) : sp.hero ? HERO_SCENES[sp.hero](sp.A) : sp.obj ? shotRender(sp) : mgRender(sp)); } catch (e) { console.warn("cover", e); MG.photos.set(k, ""); } }
    document.querySelectorAll(`img[data-mgc="${CSS.escape(k)}"]`).forEach(i => { if (MG.photos.get(k)) i.src = MG.photos.get(k); });
    setTimeout(step, 0);
  };
  setTimeout(step, 30);
}
MG.specs = new Map();
function mgPhoto(I, cls = "") {
  const s = mgSpec(I); MG.specs.set(s.key, s);
  const u = MG.photos.get(s.key);
  return `<img class="${cls}" data-mgc="${esc(s.key)}" alt="${esc(I.cover.who.name)}" ${u ? `src="${u}"` : ""}>`;
}
// a product on the cover: the same studio as Bazaar, on the issue's own color
function mgObj(I, bg) {
  const it = I.cover.item, L = Market.LINE[it.id];
  const spec = { obj: true, id: it.id, cat: L.cat, color: shotTint(it.id, it.label), accent: it.label !== L.label ? shotTint(it.id, it.label) : 0xC4502E, seed: it.label + (it.seed || ""), bg, dark: false };
  spec.key = ["mgobj", I.k, spec.id, spec.seed, bg].join("|"); MG.specs.set(spec.key, spec);
  const u = MG.photos.get(spec.key);
  return `<img data-mgc="${esc(spec.key)}" alt="${esc(it.label)}" ${u ? `src="${u}"` : ""}>`;
}
// ---- illustrated covers: flat, minimal drawings about the month's biggest story, in the spirit of an editorial cover.
// Few colours, lots of empty space, no outlines. Everything is SVG drawn from code (viewBox 400x500).
const ART_FUR = Object.fromEntries(Object.entries(FUR).map(([k, v]) => [k, "#" + v.toString(16).padStart(6, "0")]));
const ART_INK = "#231E1B";
const artShade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1))); return "#" + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join(""); };
function artRng(seed) { let a = hashStr(seed) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// one creature, flat. (x, y) is where its feet touch the ground; s=1 is about 64px tall.
// o: col, sil (one-colour silhouette), flip, face (joy|calm|sad), arms (down|up|hold|wave), hat, item, glasses, shades, look
function artCr(x, y, s, o = {}) {
  const col = o.col || ART_FUR.krem;
  if (o.sil) return `<g transform="translate(${x},${y}) scale(${o.flip ? -s : s},${s})" fill="${col}"><path d="M20,-12 C52,-8 58,-52 36,-62 C22,-68 14,-50 26,-46" fill="none" stroke="${col}" stroke-width="11" stroke-linecap="round"/><path d="M-22,-54 L-27,-79 L-8,-62Z M22,-54 L27,-79 L8,-62Z"/><path d="M0,-66 C23,-66 31,-46 31,-27 C31,-8 20,0 0,0 C-20,0 -31,-8 -31,-27 C-31,-46 -23,-66 0,-66Z"/>${o.box ? `<rect x="-20" y="-30" width="40" height="26"/>` : ""}</g>`;
  const dk = artShade(col, 0.82), lt = artShade(col, 1.35), lk = o.look || [0, 0];
  const eyes = o.face === "joy" ? `<path d="M-14,-33 Q-10,-38.5 -6,-33 M6,-33 Q10,-38.5 14,-33" fill="none" stroke="${ART_INK}" stroke-width="2.6" stroke-linecap="round"/>`
    : o.face === "sad" ? `<path d="M-14,-35 Q-10,-31 -6,-35 M6,-35 Q10,-31 14,-35" fill="none" stroke="${ART_INK}" stroke-width="2.6" stroke-linecap="round"/>`
    : `<g fill="${ART_INK}"><circle cx="${-10 + lk[0]}" cy="${-34 + lk[1]}" r="3.8"/><circle cx="${10 + lk[0]}" cy="${-34 + lk[1]}" r="3.8"/></g>`;
  const arm = (sx, k) => k === "up" ? `<ellipse cx="${sx * 31}" cy="-50" rx="6" ry="11" transform="rotate(${sx * 25} ${sx * 31} -50)" fill="${dk}"/>`
    : k === "hold" ? `<ellipse cx="${sx * 16}" cy="-18" rx="7" ry="6" fill="${dk}"/>`
    : `<ellipse cx="${sx * 29}" cy="-20" rx="6" ry="10" transform="rotate(${sx * -25} ${sx * 29} -20)" fill="${dk}"/>`;
  const arms = o.arms === "up" ? arm(-1, "up") + arm(1, "up") : o.arms === "wave" ? arm(-1, "down") + arm(1, "up") : o.arms === "hold" ? "" : arm(-1, "down") + arm(1, "down");
  const hat = o.hat === "top" ? `<rect x="-12" y="-90" width="24" height="22" fill="${ART_INK}"/><rect x="-19" y="-70" width="38" height="4" rx="2" fill="${ART_INK}"/>`
    : o.hat === "veil" ? `<path d="M-15,-62 Q0,-72 15,-62 L24,-14 Q0,-6 -24,-14Z" fill="#fff" opacity=".75"/>`
    : o.hat === "bow" ? `<path d="M-6,-8 L-15,-13 L-15,-3Z M6,-8 L15,-13 L15,-3Z" fill="#B3261E"/>` : "";
  const glasses = o.glasses ? `<g fill="none" stroke="${ART_INK}" stroke-width="1.6"><circle cx="-10" cy="-34" r="7"/><circle cx="10" cy="-34" r="7"/></g>` : "";
  const shades = o.shades ? `<g fill="${ART_INK}"><rect x="-19" y="-39" width="16" height="10" rx="4"/><rect x="3" y="-39" width="16" height="10" rx="4"/><rect x="-4" y="-36" width="8" height="2"/></g>` : "";
  const item = o.item === "box" ? `<rect x="-20" y="-32" width="40" height="28" fill="#C9A27A"/><rect x="-20" y="-32" width="40" height="5" fill="#B58E66"/>${o.plant ? `<path d="M8,-32 q-2,-14 6,-20" stroke="#5c8a4e" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="15" cy="-52" rx="6" ry="3.5" fill="#5c8a4e"/>` : ""}`
    : o.item === "bag" ? `<path d="M-24,-4 Q-32,-34 -9,-40 L9,-40 Q32,-34 24,-4Z" fill="#E9D3A6"/><circle cx="0" cy="-20" r="7" fill="#E2B33F"/>`
    : o.item === "case" ? `<rect x="19" y="-26" width="22" height="16" rx="2" fill="#5a3b28"/>`
    : o.item === "trophy" ? `<g transform="translate(27,-64)"><path d="M-9,0 h18 v8 q0,10 -9,12 q-9,-2 -9,-12Z" fill="#E2B33F"/><rect x="-2" y="20" width="4" height="6" fill="#E2B33F"/><rect x="-7" y="26" width="14" height="4" fill="#E2B33F"/></g>`
    : o.item === "paper" ? `<rect x="-24" y="-42" width="48" height="32" fill="#F4EFE4"/><path d="M-17,-34 h34 M-17,-28 h26 M-17,-22 h30" stroke="#BDB3A3" stroke-width="2"/>` : "";
  const hold = o.arms === "hold" ? arm(-1, "hold") + arm(1, "hold") : "";
  return `<g transform="translate(${x},${y}) scale(${o.flip ? -s : s},${s})">
    <path d="M20,-12 C52,-8 58,-52 36,-62 C22,-68 14,-50 26,-46" fill="none" stroke="${dk}" stroke-width="11" stroke-linecap="round"/>
    <path d="M-22,-54 L-27,-79 L-8,-62Z M22,-54 L27,-79 L8,-62Z" fill="${col}"/><path d="M-19,-60 L-22,-71 L-13,-63Z M19,-60 L22,-71 L13,-63Z" fill="#E9A9A2"/>
    ${arms}<path d="M0,-66 C23,-66 31,-46 31,-27 C31,-8 20,0 0,0 C-20,0 -31,-8 -31,-27 C-31,-46 -23,-66 0,-66Z" fill="${col}"/>
    <ellipse cx="0" cy="-14" rx="16" ry="11" fill="${lt}" opacity=".55"/><ellipse cx="-10" cy="0" rx="8" ry="3.5" fill="${dk}"/><ellipse cx="10" cy="0" rx="8" ry="3.5" fill="${dk}"/>
    ${eyes}<ellipse cx="-19" cy="-26" rx="4.5" ry="2.6" fill="#E48C8C" opacity=".5"/><ellipse cx="19" cy="-26" rx="4.5" ry="2.6" fill="#E48C8C" opacity=".5"/>
    <path d="M-4,-28 q2,3 4,0 q2,3 4,0" fill="none" stroke="${ART_INK}" stroke-width="1.6" stroke-linecap="round"/>
    ${glasses}${shades}${hat}${item}${hold}</g>`;
}
const artSeason = k => ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"][(new Date(Engine.START_DATE).getUTCMonth() + k) % 12];
// the creature from behind (ears, round back, the big curled tail in front of us)
function artBack(x, y, s, o = {}) {
  const col = o.col || ART_FUR.krem, dk = artShade(col, 0.82);
  return `<g transform="translate(${x},${y}) scale(${o.flip ? -s : s},${s})">
    <path d="M-22,-54 L-27,-79 L-8,-62Z M22,-54 L27,-79 L8,-62Z" fill="${o.sil ? col : dk}"/>
    <ellipse cx="-30" cy="-22" rx="6" ry="10" fill="${o.sil ? col : dk}"/><ellipse cx="30" cy="-22" rx="6" ry="10" fill="${o.sil ? col : dk}"/>
    <path d="M0,-66 C23,-66 31,-46 31,-27 C31,-8 20,0 0,0 C-20,0 -31,-8 -31,-27 C-31,-46 -23,-66 0,-66Z" fill="${col}"/>
    <path d="M8,-6 C40,-2 46,-44 26,-52 C14,-56 8,-42 18,-38" fill="none" stroke="${o.sil ? col : dk}" stroke-width="11" stroke-linecap="round"/></g>`;
}
// seen from straight above, facing up the page; rot turns it
function artTop(x, y, s, o = {}) {
  const col = o.col || ART_INK, dk = o.sil ? col : artShade(col, 0.82);
  return `<g transform="translate(${x},${y}) rotate(${o.rot || 0}) scale(${s})">
    <path d="M6,18 C30,30 34,0 22,-2" fill="none" stroke="${dk}" stroke-width="9" stroke-linecap="round"/>
    <path d="M-16,-14 L-20,-34 L-4,-22Z M16,-14 L20,-34 L4,-22Z" fill="${col}"/>
    <ellipse cx="0" cy="0" rx="25" ry="23" fill="${col}"/>${o.veil ? `<ellipse cx="0" cy="4" rx="27" ry="25" fill="#fff" opacity=".6"/>` : ""}</g>`;
}
const ART = {
  // from high above: one long line of shoppers snakes across the town to a little shop
  queue(A) {
    const out = [`<rect width="400" height="500" fill="#E9B949"/>`];
    out.push(`<rect x="250" y="108" width="132" height="96" fill="${ART_INK}"/><text x="316" y="164" text-anchor="middle" font-family="'Bodoni Moda',Didot,serif" font-size="20" letter-spacing="3" fill="#E9B949">BAZAAR</text><rect x="268" y="204" width="34" height="8" fill="#FFF4D6"/>`);
    const pts = [[285, 226], [285, 270], [80, 270], [80, 330], [330, 330], [330, 392], [60, 392], [60, 452], [330, 452], [330, 540]];
    let carry = 0, n = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0), rot = Math.atan2(x0 - x1, y1 - y0) * 180 / Math.PI;
      for (let d = carry; d < L; d += 21) { const t = d / L; out.push(n ? artTop(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0.3, { col: ART_INK, sil: true, rot: rot + 180 }) : artTop(x0, y0 + 6, 0.62, { col: A.hero, rot: 0 })); n++; carry = d + 21 - L; }
    }
    return out.join("");
  },
  // looking up from the ground: a tower of coins shooting into the night, someone tiny on top
  tower(A) {
    const r = A.rng, out = [`<rect width="400" height="500" fill="#1E2A44"/>`];
    for (let i = 0; i < 30; i++) out.push(`<circle cx="${r() * 400}" cy="${r() * 330}" r="${0.7 + r()}" fill="#F4EEE2" opacity=".7"/>`);
    const N = 34;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), y = 560 - 380 * Math.pow(t, 0.75), w = 26 + 520 * Math.pow(1 - t, 2.2), h = w * 0.16, th = Math.max(2, w * 0.09);
      out.push(`<rect x="${200 - w / 2}" y="${y - th}" width="${w}" height="${th}" fill="#B8862A"/><ellipse cx="200" cy="${y - th}" rx="${w / 2}" ry="${h / 2}" fill="${i % 2 ? "#E2B33F" : "#D9A93A"}"/>`);
    }
    out.push(artCr(200, 182, 0.24, { col: A.hero, hat: "top", arms: "wave", face: "joy" }));
    return out.join("");
  },
  // close up: all we see over the edge of the moving box are two sad eyes
  layoff(A) {
    const out = [`<rect width="400" height="500" fill="#D5DBE1"/>`];
    for (let row = 0; row < 7; row++) for (let c = 0; c < 6; c++) out.push(`<rect x="${14 + c * 66}" y="${40 + row * 52}" width="44" height="34" rx="3" fill="#C4CCD4"/>`);
    out.push(artCr(212, 470, 3.2, { col: A.hero, face: "sad", look: [0, 1] }));
    out.push(`<rect x="-10" y="372" width="420" height="140" fill="#C9A27A"/><rect x="-10" y="372" width="420" height="16" fill="#B58E66"/><path d="M200,388 V500" stroke="#B58E66" stroke-width="3"/>
      <path d="M64,372 q-6,-50 18,-84 M64,372 q14,-40 44,-50" stroke="#4F7D43" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="84" cy="286" rx="16" ry="8" fill="#5C8A4E" transform="rotate(-50 84 286)"/><ellipse cx="110" cy="322" rx="16" ry="8" fill="#5C8A4E" transform="rotate(-20 110 322)"/>
      <rect x="318" y="336" width="40" height="40" rx="4" fill="#F4F1EA"/><path d="M358,346 q16,0 16,12 q0,12 -16,12" fill="none" stroke="#F4F1EA" stroke-width="6"/>`);
    out.push(`<text x="200" y="460" text-anchor="middle" font-family="Helvetica,Arial" font-weight="800" font-size="13" letter-spacing="4" fill="#9C7A55">${esc((A.co || "THE OFFICE").toUpperCase())}</text>`);
    return out.join("");
  },
  // close up: a cheek pressed against a watch too big for the page
  antique(A) {
    const out = [`<rect width="400" height="500" fill="#2E4A3F"/>`];
    out.push(`<circle cx="70" cy="300" r="215" fill="#E2B33F"/><circle cx="70" cy="300" r="190" fill="#F7EEDB"/>`);
    out.push(Array.from({ length: 12 }, (_, i) => `<rect x="67" y="124" width="6" height="${i % 3 ? 12 : 26}" fill="${ART_INK}" transform="rotate(${i * 30} 70 300)"/>`).join(""));
    out.push(`<path d="M70,300 V160 M70,300 L170,350" stroke="${ART_INK}" stroke-width="10" stroke-linecap="round"/>`);
    out.push(artCr(300, 560, 2.7, { col: A.hero, face: "joy", arms: "up", glasses: true, flip: true }));
    return out.join("");
  },
  // from straight above: the cake as rings, the two of them in the middle
  wedding(A) {
    const r = A.rng, out = [`<rect width="400" height="500" fill="#F4D9D4"/>`];
    [[178, "#FFFBF5"], [132, "#FBF1E8"], [86, "#FFFBF5"]].forEach(([rad, f]) => {
      out.push(`<circle cx="200" cy="300" r="${rad}" fill="${f}"/>`);
      for (let i = 0; i < Math.round(rad / 6); i++) { const a = i / Math.round(rad / 6) * Math.PI * 2; out.push(`<circle cx="${200 + Math.cos(a) * (rad - 8)}" cy="${300 + Math.sin(a) * (rad - 8)}" r="4" fill="#F2A7B5"/>`); }
    });
    for (let i = 0; i < 10; i++) { const a = r() * Math.PI * 2, d = 196 + r() * 40; out.push(`<ellipse cx="${200 + Math.cos(a) * d}" cy="${300 + Math.sin(a) * d}" rx="7" ry="4" fill="#F2A7B5" transform="rotate(${r() * 180} ${200 + Math.cos(a) * d} ${300 + Math.sin(a) * d})"/>`); }
    out.push(artTop(176, 304, 1.35, { col: A.hero, rot: 12 }), artTop(226, 304, 1.35, { col: A.partner, rot: -12, veil: true }));
    return out.join("");
  },
  // looking up a ladder that runs out of the page; the climber is a speck near the top
  climb(A) {
    const out = [`<rect width="400" height="500" fill="#BFD7E6"/><g fill="#fff"><ellipse cx="60" cy="420" rx="130" ry="34"/><ellipse cx="360" cy="300" rx="100" ry="24"/><ellipse cx="120" cy="190" rx="70" ry="16"/></g>`];
    // both rails run to one vanishing point above the page
    const V = [200, -120], rail = x0 => `M${x0},520 L${x0 + (V[0] - x0) * 0.86},${520 + (V[1] - 520) * 0.86}`;
    out.push(`<g stroke="${ART_INK}" stroke-linecap="round" fill="none"><path d="${rail(140)}" stroke-width="7"/><path d="${rail(260)}" stroke-width="7"/>`);
    for (let i = 1; i < 22; i++) { const t = 1 - Math.pow(1 - i / 22, 1.6), k = t * 0.86, y = 520 + (V[1] - 520) * k; out.push(`<path d="M${140 + (V[0] - 140) * k},${y} L${260 + (V[0] - 260) * k},${y}" stroke-width="${6 - 4.5 * t}"/>`); }
    out.push(`</g>`);
    out.push(artBack(200, 214, 0.42, { col: A.hero }));
    return out.join("");
  },
  // silhouette against a huge setting sun, carrying the whole house
  move(A) {
    const out = [`<rect width="400" height="500" fill="#F4C9A1"/><circle cx="200" cy="380" r="150" fill="#F29E5C"/>`];
    out.push(`<path d="M-10,404 C120,396 280,392 410,380 V510 H-10Z" fill="#3B2F3A"/>`);
    out.push(`<g transform="translate(372,384)"><rect x="-22" y="-22" width="44" height="22" fill="#3B2F3A"/><path d="M-28,-22 L0,-40 L28,-22Z" fill="#3B2F3A"/></g>`);
    out.push(artCr(190, 398, 1.25, { col: "#3B2F3A", sil: true, flip: true }));
    out.push(`<g transform="translate(190,300) rotate(-4)"><rect x="-50" y="-36" width="100" height="50" fill="#3B2F3A"/><path d="M-62,-36 L0,-74 L62,-36Z" fill="#3B2F3A"/><rect x="-36" y="-22" width="16" height="14" fill="#F29E5C"/><rect x="20" y="-22" width="16" height="14" fill="#F29E5C"/></g>`);
    out.push(`<g fill="#3B2F3A"><rect x="146" y="320" width="10" height="38" rx="5" transform="rotate(-20 151 339)"/><rect x="224" y="320" width="10" height="38" rx="5" transform="rotate(20 229 339)"/></g>`);
    return out.join("");
  },
  // so close the ears leave the page; the flashes show up in the sunglasses
  runway(A) {
    const out = [`<rect width="400" height="500" fill="#141218"/>`];
    const star = (x, y, k, f = "#fff") => `<path d="M${x},${y - k} L${x + k * .25},${y - k * .25} L${x + k},${y} L${x + k * .25},${y + k * .25} L${x},${y + k} L${x - k * .25},${y + k * .25} L${x - k},${y} L${x - k * .25},${y - k * .25}Z" fill="${f}"/>`;
    out.push(star(52, 170, 16), star(348, 128, 12), star(330, 300, 9), star(40, 330, 10));
    out.push(artCr(200, 640, 5.6, { col: A.hero, shades: true, face: "calm" }));
    out.push(star(144, 444, 14, "#F4EEE2"), star(254, 446, 9, "#F4EEE2"));
    return out.join("");
  },
  // from behind, alone on a bench under a tree that fills the sky
  park(A) {
    const se = artSeason(A.k), P = { autumn: ["#F1E2C8", "#D9874A", "#C9B48E"], winter: ["#DDE5EC", null, "#F7F9FB"], spring: ["#F3E7EA", "#F2A7B5", "#B9CC9C"], summer: ["#D7EAE9", "#6F9A5C", "#A9C08F"] }[se];
    const r = A.rng, out = [`<rect width="400" height="500" fill="${P[0]}"/><rect y="372" width="400" height="128" fill="${P[2]}"/>`];
    out.push(`<rect x="300" y="110" width="22" height="270" fill="#6B4E3A"/>`);
    if (P[1]) { out.push(`<circle cx="330" cy="70" r="200" fill="${P[1]}"/>`); for (let i = 0; i < 9; i++) out.push(`<ellipse cx="${30 + r() * 260}" cy="${260 + r() * 220}" rx="6" ry="3.5" fill="${P[1]}" transform="rotate(${r() * 180} 200 300)"/>`); }
    else { out.push(`<path d="M311,200 L250,120 M311,160 L370,90 M311,140 L300,40" stroke="#6B4E3A" stroke-width="10" stroke-linecap="round"/>`); for (let i = 0; i < 60; i++) out.push(`<circle cx="${r() * 400}" cy="${r() * 380}" r="${1.5 + r() * 1.5}" fill="#fff"/>`); }
    out.push(`<rect x="40" y="430" width="250" height="12" fill="#5a3b28"/><rect x="40" y="400" width="250" height="10" fill="#5a3b28"/>`);
    out.push(`<rect x="114" y="350" width="96" height="62" fill="#F4EFE4"/><path d="M124,362 h76 M124,374 h60 M124,386 h70" stroke="#BDB3A3" stroke-width="3"/>`);
    out.push(artBack(162, 436, 1.25, { col: A.hero }));
    out.push(`<g fill="${ART_INK}"><ellipse cx="330" cy="470" rx="11" ry="6"/><circle cx="321" cy="464" r="4.5"/></g>`);
    return out.join("");
  },
};
const ART_TITLE = { queue: "The Queue", tower: "Top of the Pile", layoff: "Clearing Out", antique: "Heirloom", wedding: "Happily Ever After", climb: "The Climb", move: "Moving Up", runway: "Front Row", park: "Sunday in the Park" };
const ART_ABOUT = { queue: A => `about the ${A.item} drop`, tower: () => "about the richest creatures in town", layoff: A => A.co ? `about ${A.co} closing its doors` : "about a hard month at the office", antique: () => "about what old things are worth", wedding: A => `about ${A.heroName} and ${A.partnerName}`, climb: A => `about ${A.heroName}'s climb`, move: A => `about ${A.heroName}'s new address`, runway: () => "about what Old Town is wearing", park: () => "about a quiet month" };
const ART_BY = ["Ada Quill", "Pip Marlowe", "Juno Fenn", "Rosa Kettle", "Otto Brine", "Mira Saltz"];
function artPick(I) {
  const C = I.cover, M = I.market, rng = artRng("art" + I.k), A = { k: I.k, rng };
  const w = C.who, c = w.cid ? game.home.get(w.cid) : null;
  const rupa = c ? c.rupa : rupaFor({ nama: w.npc || w.name });
  A.hero = ART_FUR[rupa.warna] || ART_FUR.krem; A.heroName = w.name; A.fam = !!C.fam;
  const rare = M.drops.slice().sort((x, y) => x.made - y.made)[0], closed = I.companies.find(x => x.kind === "close");
  const byKick = { "THE NEW MONEY": "tower", "AT THE TOP": "climb", "RARE AIR": "climb", "CHAMPION": "climb", "THE FOUNDER": "climb", "A CALLING": "climb", "NEW ADDRESS": "move", "THE COLLECTOR": "antique", "SPOTTED": "runway", "JUST MARRIED": "wedding" };
  let scene;
  if (I.yearly) scene = "tower";
  else if (C.fam && byKick[C.kicker]) scene = byKick[C.kicker];
  else {
    // town issues take turns through the scenes, so two months in a row never look alike
    scene = ["queue", "park", "runway", "layoff", "antique", "climb", "move"][I.k % 7];
    if (scene === "queue" && !rare) scene = "runway";
  }
  if (I.scene) scene = I.scene;
  A.item = rare ? rare.label : ""; A.co = closed ? closed.text.split(" closed")[0] : "";
  A.prize = C.kicker === "CHAMPION";
  if (scene === "wedding") { A.partner = ART_FUR[rupaFor({ nama: C.partner }).warna] || ART_FUR["pink pucat"]; A.partnerName = C.partner; }
  if (!C.fam && scene !== "climb" && scene !== "tower") A.heroName = "";
  return { scene, A, title: ART_TITLE[scene], about: ART_ABOUT[scene](A), by: ART_BY[I.k % ART_BY.length] };
}
function artSvg(I) {
  const P = artPick(I);
  return `<svg class="mgc-art" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${ART[P.scene](P.A)}</svg>`;
}
// ---- covers, editorial style: a small masthead and one strong idea. Five kinds, chosen from what happened that month:
// a dramatic portrait, a statement in huge type, one object on a solid colour, a repeating pattern, or a drawing.
const MG_CROPS = {
  tight: { cam: [0, 1.45, 4.9], look: [0, 1.42, 0] },
  half: { cam: [-0.7, 1.6, 7.2], look: [-0.7, 1.3, 0] },
  low: { cam: [0.3, 0.25, 6.8], look: [0, 1.55, 0] },
  bust: { cam: [0, 1.5, 13], look: [0, 0.55, 0] },
  ava: { cam: [0.3, 1.7, 7.4], look: [0, 1.15, 0] },
  pol: { cam: [0.6, 2.3, 11.5], look: [0, 1.35, 0] },
};
function mgStyle(I) {
  const C = I.cover;
  if (I.yearly) return "tower";
  if (C.kind === "couple") return "ring";
  if (C.fam) return "face";
  if (I.market.drops.some(d => d.soldIn != null && d.soldIn <= 7) && I.k % 3 === 0) return "queue";
  return ["face", "say", "object", "grid", "art", "face", "object", "say", "art", "grid"][I.k % 10];
}
// the thing on an object or pattern cover: the rarest drop of the month, otherwise the collector's find
function mgItem(I) {
  const rare = I.market.drops.slice().sort((a, b) => a.made - b.made)[0], c = I.market.collector;
  return rare ? { id: rare.line, label: rare.label, made: rare.made, soldIn: rare.soldIn } : { id: c.line, label: c.label, seed: c.year, year: c.year, value: c.value, price: c.price };
}
function mgSay(I) {
  if (I.yearly) return { look: "fill", bg: "#111", ink: "#F2C230", words: ["WHO", "OWNS", "OLD", "TOWN?"], small: "The Old Town 10. The richest creatures in town, counted." };
  const it = mgItem(I), v = Math.floor(I.k / 10) % 4 + I.k;
  const pool = [
    it.soldIn != null ? { look: "fill", bg: "#111", ink: "#F2C230", words: ["SOLD", "OUT IN", `${Math.max(1, it.soldIn)} DAY${it.soldIn > 1 ? "S" : ""}`], small: `${it.made} were made of the ${it.label}. Inside: who got one.` } : null,
    { look: "split", bg: "#fff", ink: "#111", top: "WHO RISES?", bottom: "WHO FALLS?", small: "A month of promotions, layoffs and companies that closed their doors." },
    { look: "fill", bg: "#C8102E", ink: "#fff", words: ["WHAT", "IS A", "HOME", "WORTH?"], small: "Old Town's neighbourhoods, and who just moved up the hill." },
    { look: "fill", bg: "#F4F1EA", ink: "#111", words: ["OLD", "IS THE", "NEW", "RICH"], small: `A ${I.market.collector.year} ${I.market.collector.label.toLowerCase()} now sells for ${I.market.collector.value.toLocaleString("en")} coins.` },
  ].filter(Boolean);
  return pool[v % pool.length];
}
const mgMast = (I, ink) => { const mo = Mag.monthName(I.k); return `<div class="mgn-mast" style="color:${ink}"><b>Old Town Magazine</b><small>No. ${I.no} · ${esc(mo)}</small></div>`; };
function mgFace(I) {
  const s = mgSpec(I), h = hashStr("face|" + I.k + "|" + I.cover.who.name);
  const crop = I.cover.kind === "couple" ? null : ["tight", "half", "low", "bust"][h % 4];
  const moods = [{ bg: "#141414", bw: true }, { bg: "#2A2622", bw: false }, { bg: "#8E8A84", bw: true }, { bg: "#C8102E", bw: false }, { bg: "#E9E4DA", bw: true }];
  const m = moods[(h >>> 4) % moods.length];
  Object.assign(s, { crop, mood: true, bg: m.bg, floor: m.bg, disc: null, key: s.key + "|nyt|" + crop + m.bg, pose: ["cool", "glance", "soft", "proud"][(h >>> 8) % 4] });
  MG.specs.set(s.key, s);
  const u = MG.photos.get(s.key), light = m.bg === "#E9E4DA";
  return { html: `<img class="${m.bw ? "mgn-mono" : ""}" data-mgc="${esc(s.key)}" alt="${esc(I.cover.who.name)}" ${u ? `src="${u}"` : ""}>`, ink: light ? "#111" : "#fff", bg: m.bg };
}
// the richest creature in town stands on top of the tower; if that is one of yours, it is yours
function heroTop(I) {
  const t = I.list && I.list.top && I.list.top[0]; if (!t) return null;
  const mine = t.you && game.home.members.find(m => member(m.id) && member(m.id).nama === t.name);
  if (mine) return { id: mine.id, fase: "dewasa", rupa: game.home.get(mine.id).rupa };
  return { id: "mag-top-" + t.name, fase: "dewasa", rupa: rupaFor({ nama: t.name }) };
}
// the three hand-built covers, wired to the events they belong to
function mgHero(kind, I) {
  const C = I.cover, w = C.who, m = w.cid ? game.home.get(w.cid) : null;
  const who = { id: w.cid || "mag-" + w.npc, fase: "dewasa", rupa: m ? m.rupa : rupaFor({ nama: w.npc || w.name }) };
  const crowd = ["Toto", "Gogo", "Nana", "Pupu", "Koko", "Fifi", "Zaza", "Momo", "Cici", "Lala", "Bibi", "Dodo"].map(n => rupaFor({ nama: n + I.k }));
  const A = kind === "ring" ? { who, partner: { id: "mag-p-" + C.partner, rupa: rupaFor({ nama: C.partner }) }, crowd, seed: I.k }
    : kind === "tower" ? { bg: "#2F7A5E", who: heroTop(I) || who, seed: I.k }
    : { crowd };
  const key = ["hero", kind, I.k, w.name].join("|"); MG.specs.set(key, { hero: kind, A });
  const u = MG.photos.get(key), img = `<img data-mgc="${esc(key)}" alt="" ${u ? `src="${u}"` : ""}>`;
  if (kind === "ring") return `<div class="mgc mgn mgh mgh-ring">${img}${mgMast(I, "#1b1b1b")}
    <div class="mgh-cap"><i>Just married</i><b>${esc(w.name)} &amp; ${esc(C.partner)}</b><span>Both said yes. Inside: the party, the guests and the cake.</span></div>${C.fam ? `<i class="mgc-fam">Your family</i>` : ""}</div>`;
  if (kind === "tower") return `<div class="mgc mgn mgh mgh-tower">${img}${mgMast(I, "#fff")}
    <div class="mgh-big"><b>Who</b><b>owns</b><b>Old</b><b>Town?</b></div><p class="mgh-dek">The Old Town 10. Our yearly count of the richest creatures in town.</p></div>`;
  const it = I.market.drops.filter(d => d.soldIn != null).sort((a, b) => a.soldIn - b.soldIn)[0];
  return `<div class="mgc mgn mgh mgh-queue">${img}${mgMast(I, "#fff")}
    <div class="mgh-q"><b>Still in line.</b><span>The ${esc(it.label)} sold out in ${it.soldIn <= 1 ? "a day" : it.soldIn + " days"}. ${it.made} were made.</span></div></div>`;
}
function mgCover(I) {
  const style = mgStyle(I), C = I.cover;
  if (style === "ring" || style === "tower" || style === "queue") return mgHero(style, I);
  if (style === "say") {
    const S = mgSay(I);
    const body = S.look === "split" ? `<b class="mgn-split top">${S.top}</b><i class="mgn-rule"></i><b class="mgn-split bot">${S.bottom}</b>`
      : `<div class="mgn-words">${S.words.map(w => `<b>${esc(w)}</b>`).join("")}</div>`;
    return `<div class="mgc mgn mgn-say ${S.look}" style="--bg:${S.bg};--ink:${S.ink}">${mgMast(I, S.ink)}${body}<p class="mgn-dek">${esc(S.small)}</p></div>`;
  }
  if (style === "object") {
    const it = mgItem(I), red = I.k % 2 === 0, bg = red ? "#C8102E" : "#F4F1EA";
    const fake = Object.assign({}, I, { cover: Object.assign({}, C, { item: it }) });
    return `<div class="mgc mgn mgn-obj" style="--bg:${bg}">${mgObj(fake, bg)}${mgMast(I, red ? "#fff" : "#111")}
      <p class="mgn-dek" style="color:${red ? "#fff" : "#111"}">${esc(it.soldIn != null ? `The ${it.label}. ${it.made} made. ${it.soldIn <= 1 ? "Gone in a day." : `Gone in ${it.soldIn} days.`}` : `A ${it.year} ${it.label.toLowerCase()}, bought for ${it.price.toLocaleString("en")}, worth ${it.value.toLocaleString("en")} today.`)}</p></div>`;
  }
  if (style === "grid") {
    const it = mgItem(I), n = 30, gone = hashStr("g" + I.k) % n;
    return `<div class="mgc mgn mgn-grid">${mgMast(I, "#111")}<div class="mgn-cells">${Array.from({ length: n }, (_, i) => i === gone ? `<span class="gone">SOLD</span>` : `<span>${shotImg({ id: it.id, label: it.label, seed: it.seed })}</span>`).join("")}</div>
      <p class="mgn-dek">${esc(it.made ? `${it.made} of them. Not one left.` : `Everyone has one. Almost.`)}</p></div>`;
  }
  if (style === "art") { const P = artPick(I), night = ["runway", "tower", "antique"].includes(P.scene); return `<div class="mgc mgn mgn-art">${artSvg(I)}${mgMast(I, night ? "#fff" : "#111")}</div>`; }
  // face / couple: a 3D portrait under hard studio light
  const F = mgFace(I);
  const name = style === "couple" ? `${C.who.name} & ${C.partner}` : C.who.name;
  return `<div class="mgc mgn mgn-face" style="--bg:${F.bg}">${F.html}${mgMast(I, F.ink)}
    <div class="mgn-cap"><b>${esc(name)}</b><span>${esc(C.dek)}</span></div>${C.fam ? `<i class="mgc-fam">Your family</i>` : ""}</div>`;
}
// ---- hero covers: three hand-built scenes, rendered big on their own renderer with real shadows and reflections.
// One idea each: the couple inside a giant ring, an empty pedestal with the queue still waiting, one creature on top of a coin tower.
const HERO = { r: null, W: 720, H: 900 };
function heroRenderer() {
  if (HERO.r) return HERO.r;
  const c = document.createElement("canvas"), r = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(HERO.W, HERO.H, false);
  r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  HERO.env = new THREE.PMREMGenerator(r).fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  return (HERO.r = r);
}
function heroShoot(sc, cam, W = HERO.W, H = HERO.H) {
  const r = heroRenderer(); r.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
  r.render(sc, cam); const u = r.domElement.toDataURL("image/jpeg", 0.9);
  return u;
}
const heroSun = (sc, x, y, z, i, col, box = 8) => {
  const l = new THREE.DirectionalLight(col, i); l.position.set(x, y, z); l.castShadow = true; l.shadow.mapSize.set(2048, 2048);
  l.shadow.bias = -0.0005; l.shadow.normalBias = 0.02; l.shadow.radius = 6;
  Object.assign(l.shadow.camera, { left: -box, right: box, top: box, bottom: -box, near: 0.5, far: 60 }); sc.add(l); return l;
};
// a seamless paper backdrop: floor that curves up into the wall, so there is no horizon line
function heroSweep(g, col, w = 60, depth = 14, h = 30, r = 6) {
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(depth, 0); sh.absarc(depth, r, r, -Math.PI / 2, 0); sh.lineTo(depth + r, h);
  const pts = []; for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 + (i / 40) * Math.PI / 2; pts.push(new THREE.Vector2(depth + Math.cos(a) * r, r + Math.sin(a) * r)); }
  const prof = [new THREE.Vector2(-20, 0), ...pts, new THREE.Vector2(depth + r, h)];
  const geo = new THREE.BufferGeometry(), pos = [], idx = [];
  prof.forEach((p, i) => { pos.push(-w / 2, p.y, -(p.x - depth) , w / 2, p.y, -(p.x - depth)); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = mesh(geo, M(col, { roughness: 1, envMapIntensity: 0.2 }), 0, 0, 0, g); m.castShadow = false; m.receiveShadow = true; return m;
}
function heroCreature(g, who, o = {}) {
  const p = makeCreature({ id: who.id, fase: who.fase || "dewasa", rupa: who.rupa, gear: who.gear || [] }, g);
  p.root.scale.setScalar(PHASE_SCALE[who.fase] || 1);
  if (o.pose) mgPose(p, MG_POSES[o.pose]);
  p.root.traverse(m => { if (m.isMesh && !m.material.transparent) m.castShadow = m.receiveShadow = true; });
  return p;
}
// a listing photo: one home on its own patch of lawn, three-quarter view, soft afternoon light
function heroHouse(A) {
  const sc = new THREE.Scene(), g = new THREE.Group(); sc.add(g); sc.environment = HERO.env;
  const sky = new THREE.Color(A.sky).convertSRGBToLinear(); sc.background = sky; sc.fog = new THREE.Fog(sky, 30, 60);
  const fl = mesh(new THREE.PlaneGeometry(200, 200), M(A.ground, { roughness: 1, envMapIntensity: 0.2 }), 0, 0, 0, g); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
  sc.add(new THREE.HemisphereLight(0xfff4e6, 0x6e7e5e, 0.75));
  heroSun(sc, -6, 10, 7, 1.7, 0xffe6c8, 9); const f = new THREE.DirectionalLight(0xe6eeff, 0.35); f.position.set(7, 4, 5); sc.add(f);
  const h = townInit().homeModel(A.kind, A.model, A.paint, A.seed); g.add(h);
  h.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  // a path to the door and a couple of bushes, so it sits in a garden rather than floating
  const box = new THREE.Box3().setFromObject(h), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const rnd = artRng("garden" + A.seed), bush = M(0x6f9a5c, { roughness: 1 }), dark = M(0x58804a, { roughness: 1 });
  for (let i = 0; i < 5; i++) { const x = mid.x + (rnd() < 0.5 ? -1 : 1) * (size.x / 2 + 0.3 + rnd() * 1.2), z = mid.z + (rnd() - 0.3) * size.z; mesh(SPH(0.28 + rnd() * 0.25, 16, 12), i % 2 ? bush : dark, x, 0.2, z, g).scale.y = 0.8; }
  const path = mesh(new THREE.PlaneGeometry(0.55, 3), M(0xd9cdb8, { roughness: 1 }), mid.x, 0.01, box.max.z + 1.4, g); path.rotation.x = -Math.PI / 2; path.castShadow = false;
  const rad = box.getBoundingSphere(new THREE.Sphere()).radius, dir = new THREE.Vector3(1.0, 0.62, 1.7).normalize(), cam = new THREE.PerspectiveCamera(30, 1.6, 0.3, 200);
  cam.position.copy(mid).addScaledVector(dir, rad * 3.5); cam.lookAt(mid.x, mid.y * 0.95, mid.z);
  return heroShoot(sc, cam, 640, 400);
}
const HERO_SCENES = {
  // Just married: the two of them standing in the middle of a big heart of rose petals, seen from above on clean paper
  ring(A) {
    const sc = new THREE.Scene(), g = new THREE.Group(); sc.add(g); sc.environment = HERO.env;
    sc.background = new THREE.Color(0xF4EEE6).convertSRGBToLinear();
    heroSweep(g, "#F4EEE6", 80, 30, 40, 10);
    sc.add(new THREE.HemisphereLight(0xfff6ee, 0xb8a898, 0.55));
    heroSun(sc, -7, 16, 7, 1.7, 0xfff0e0, 9); const f = new THREE.DirectionalLight(0xf0f2ff, 0.3); f.position.set(7, 6, 8); sc.add(f);
    const a = heroCreature(g, A.who, { pose: "joy" }), b = heroCreature(g, Object.assign({ gear: ["flower"] }, A.partner), { pose: "joy" });
    a.root.position.set(-0.82, 0, 1.3); a.root.rotation.y = 0.28; b.root.position.set(0.82, 0, 1.3); b.root.rotation.y = -0.28;
    for (const q of [a, b]) { q.root.scale.multiplyScalar(0.86); q.body.rotation.x = -0.32; }
    const rnd = artRng("heart" + A.seed), petal = new THREE.CircleGeometry(0.13, 12);
    const pm = [0xC8102E, 0xD8243F, 0xB00D28, 0xE5536A, 0xA30B22].map(c => M(c, { roughness: 0.55, side: THREE.DoubleSide, envMapIntensity: 0.4 }));
    const S = 0.215, heart = t => [16 * Math.sin(t) ** 3 * S, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * S + 0.5];
    for (let i = 0; i < 900; i++) {
      const t = rnd() * Math.PI * 2, [hx, hz] = heart(t), band = (rnd() + rnd() + rnd() - 1.5) * 0.34;
      const nx = heart(t + 0.01)[1] - hz, nz = -(heart(t + 0.01)[0] - hx), nl = Math.hypot(nx, nz) || 1;
      const m = mesh(petal, pm[i % pm.length], hx + nx / nl * band, 0.012 + (i % 9) * 0.0015, hz + nz / nl * band, g);
      m.rotation.set(-Math.PI / 2 + (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5, rnd() * 6); m.scale.set(1, 0.65 + rnd() * 0.45, 1); m.castShadow = false;
    }
    // a few strays, inside and outside the line
    for (let i = 0; i < 26; i++) { const m = mesh(petal, pm[i % pm.length], (rnd() - 0.5) * 9, 0.012, (rnd() - 0.5) * 8 - 0.2, g); m.rotation.set(-Math.PI / 2, 0, rnd() * 6); m.castShadow = false; }
    const cam = new THREE.PerspectiveCamera(26, 0.8, 0.5, 200); cam.position.set(0, 21, 18); cam.lookAt(0, 0.5, 1.4);
    return heroShoot(sc, cam);
  },
  // Sold out: seen from above, a long roped-off queue folds back and forth towards one spotlit pedestal. The pedestal is empty.
  queue(A) {
    const sc = new THREE.Scene(), g = new THREE.Group(); sc.add(g); sc.environment = HERO.env;
    sc.background = new THREE.Color(0x1a1a1c);
    const fl = mesh(new THREE.PlaneGeometry(200, 200), M(0x2a2a2d, { roughness: 0.7, envMapIntensity: 0.1 }), 0, 0, 0, g); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
    sc.add(new THREE.HemisphereLight(0xd8deea, 0x111111, 0.55));
    heroSun(sc, -5, 22, 8, 0.75, 0xdfe6ff, 16);
    const spot = new THREE.SpotLight(0xfff1dc, 14, 40, 0.16, 0.45, 1); spot.position.set(6.4, 30, 9.6); spot.target.position.set(5.4, 0, 7.2);
    spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004; sc.add(spot, spot.target);
    const white = M(0xf3f1ec, { roughness: 0.55 });
    mesh(RB(2.0, 2.4, 2.0, 0.05), white, 5.4, 1.2, 7.2, g); mesh(RB(2.2, 0.12, 2.2, 0.04), white, 5.4, 2.46, 7.2, g);
    const tag = canvasTex((c, w, h) => { c.fillStyle = "#C8102E"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.font = "700 46px Helvetica, Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("SOLD OUT", w / 2, h / 2 + 2); }, 320, 96);
    const card = mesh(new THREE.PlaneGeometry(1.25, 0.375), F(0xffffff, { map: tag }), 5.4, 2.53, 7.45, g); card.rotation.x = -Math.PI / 2; card.rotation.z = 0.08;
    // the rope lanes: brass posts with red rope between the rows
    const brass = M(0xC9A24A, { metalness: 0.9, roughness: 0.3, envMapIntensity: 1.5 }), rope = M(0x9E1426, { roughness: 0.6 });
    const post = (x, z) => { mesh(CYL(0.07, 0.07, 1.5, 12), brass, x, 0.75, z, g); mesh(SPH(0.13, 14, 10), brass, x, 1.52, z, g); mesh(CYL(0.32, 0.36, 0.08, 20), brass, x, 0.04, z, g); };
    const ropeAt = (x1, x2, z) => { const r = mesh(CYL(0.05, 0.05, Math.abs(x2 - x1), 8), rope, (x1 + x2) / 2, 1.3, z, g); r.rotation.z = Math.PI / 2; };
    const rows = 5, n = 8, sp = 1.85, X = sp * (n - 1) / 2, gap = 3.1, z0 = 4.0;
    for (let r = 0; r < rows - 1; r++) { const z = z0 - gap * (r + 0.5), openLeft = r % 2 === 0, xa = openLeft ? -X + 1.6 : -X - 1.2, xb = openLeft ? X + 1.2 : X - 1.6; post(xa, z); post(xb, z); post((xa + xb) / 2, z); ropeAt(xa, xb, z); }
    let i = 0;
    for (let r = 0; r < rows; r++) for (let k = 0; k < n; k++) {
      const right = r % 2 === 0, x = -X + k * sp, z = z0 - gap * r + (hashStr("q" + r + k) % 5 - 2) * 0.07;
      const who = { id: "q" + i, fase: "dewasa", rupa: Object.assign({}, A.crowd[(i * 7 + r) % A.crowd.length]) };
      const p = heroCreature(g, who, { pose: ["cool", "soft", "glance"][i % 3] }); p.root.scale.setScalar(0.72);
      p.root.position.set(x, 0, z); p.root.rotation.y = (right ? Math.PI / 2 : -Math.PI / 2) + ((hashStr("t" + i) % 7) - 3) * 0.06; i++;
    }
    const cam = new THREE.PerspectiveCamera(30, 0.8, 0.5, 200); cam.position.set(0.4, 44, 12.8); cam.lookAt(0.4, 0, -2.4);
    return heroShoot(sc, cam);
  },
  // Who owns Old Town: one tiny creature on top of a tall coin tower, the rest of the town far below
  tower(A) {
    const sc = new THREE.Scene(), g = new THREE.Group(); sc.add(g); sc.environment = HERO.env;
    sc.background = new THREE.Color(A.bg).convertSRGBToLinear(); sc.fog = new THREE.Fog(new THREE.Color(A.bg).convertSRGBToLinear(), 30, 70);
    heroSweep(g, A.bg, 120, 30, 60, 14);
    sc.add(new THREE.HemisphereLight(0xfff2d8, 0x3a7a60, 0.9));
    heroSun(sc, -9, 26, 12, 2.1, 0xfff0d4, 16); const f = new THREE.DirectionalLight(0xbfe0d4, 0.3); f.position.set(9, 4, 4); sc.add(f);
    const gold = M(0xDDA530, { metalness: 0.85, roughness: 0.3, envMapIntensity: 1.7 }), edge = M(0xB98522, { metalness: 0.85, roughness: 0.38, envMapIntensity: 1.5 });
    const coinGeo = CYL(1.15, 1.15, 0.2, 64); coinGeo.userData.keep = true;
    const rnd = artRng("tower" + A.seed);
    const stack = (x, z, n, s = 1) => { let y = 0; for (let i = 0; i < n; i++) { const c = mesh(coinGeo, i % 7 === 3 ? edge : gold, x + (rnd() - 0.5) * 0.09 * s, y + 0.1 * s, z + (rnd() - 0.5) * 0.09 * s, g); c.scale.setScalar(s); c.rotation.y = rnd() * 6; y += 0.2 * s; } return y; };
    const top = stack(0, 0, 56);
    [[-3.6, -6, 6], [3.6, -4, 15], [-8, -10, 4], [7.5, -10, 20], [-2.5, -14, 3], [11, -5, 3], [5.5, 2, 1]].forEach(([x, z, n]) => stack(x, z, n));
    // a few loose coins on the floor
    for (let i = 0; i < 7; i++) { const c = mesh(coinGeo, gold, 1.5 + rnd() * 7, 0.1, 2 + rnd() * 5, g); c.rotation.y = rnd() * 6; }
    const p = heroCreature(g, A.who, { pose: "proud" }); p.root.position.set(0, top, 0); p.root.rotation.y = 0.25;
    const cam = new THREE.PerspectiveCamera(30, 0.8, 0.5, 300); cam.position.set(1, 2.2, 33); cam.lookAt(-3.4, 7.6, 0);
    return heroShoot(sc, cam);
  },
};
function phMag(c) {
  const day = today(), L = Mag.latest(day), I = Mag.issue(game.home, L), fresh = L > mgRead();
  const back = Array.from({ length: Math.min(L, 24) }, (_, i) => L - 1 - i).map(k => Mag.issue(game.home, k));
  const next = Mag.issueDay(L + 1) - day;
  return `<div class="mg mg-stand"><header class="mg-top"><b class="mg-logo">OLD TOWN</b><small>The magazine of Old Town</small></header>
    ${srchBox("Search every issue: a name, a company, a drop", PH.q.mag, "mg-srch")}<div data-srch="mag">${PH.q.mag ? mgFound(PH.q.mag) : ""}</div><div class="mg-main"${PH.q.mag ? " hidden" : ""}>
    <button class="mg-latest" data-issue="${L}">${mgCover(I)}</button>
    <p class="mg-out">${fresh ? `<b class="new">New issue</b>` : `<b>This month</b>`}<span>Next issue in ${next} day${next === 1 ? "" : "s"}</span></p>
    ${back.length ? `<h4 class="mg-sub">Back issues</h4><div class="mg-back">${back.map(B => `<button data-issue="${B.k}">${mgCover(B)}<small>No. ${B.no} · ${esc(Mag.monthName(B.k))}</small></button>`).join("")}</div>`
      : `<h4 class="mg-sub">Back issues</h4><p class="mg-empty" style="margin:0 18px">This is the first issue. A new one comes out on the 1st of every month.</p>`}</div></div>`;
}
// every line of every issue so far that mentions what was typed, newest issue first
function mgFound(q) {
  const L = Mag.latest(today()), out = [];
  for (let k = L; k >= 0 && out.length < 40; k--) {
    const I = Mag.issue(game.home, k), M = I.market, hits = [];
    const add = (where, text) => { if (text && srchHit(q, text)) hits.push([where, text]); };
    add("Cover", `${I.cover.who.name}. ${I.cover.dek || ""}`);
    add("Story", I.story.title); I.story.paras.forEach(p => add("Story", p));
    I.society.forEach(x => add("Society", x.text)); I.careers.forEach(x => add("Careers", x.text)); I.companies.forEach(x => add("Careers", x.text)); I.property.forEach(x => add("Property", x.text));
    M.drops.forEach(D => add("Market", `${D.label}: ${D.made} made.`)); add("Market", `${M.collector.year} ${M.collector.label}`);
    if (I.list) I.list.top.forEach(e => add("Old Town 10", `${e.rank}. ${e.name}, ${e.sub || ""}`));
    for (const [where, text] of hits.slice(0, 3)) out.push({ k, no: I.no, where, text });
  }
  srchN = out.length;
  if (!out.length) return `<p class="mg-empty" style="margin:18px">Nothing in any issue mentions “${esc(q)}”.</p>`;
  const cut = t => t.length > 140 ? t.slice(0, 137).trim() + "…" : t;
  return `<div class="mg-found">${out.map(r => `<button data-issue="${r.k}"><small>No. ${r.no} · ${esc(Mag.monthName(r.k))} · ${esc(r.where)}</small><span>${esc(cut(r.text))}</span></button>`).join("")}</div>`;
}
function mgItems(list, empty) {
  if (!list.length) return `<p class="mg-empty">${empty}</p>`;
  return list.map(x => `<div class="mg-item${x.fam ? " fam" : ""}">${x.fam ? `<span class="mg-fam">Your family</span>` : ""}${esc(x.text)}</div>`).join("");
}
function phIssue(c, k) {
  k = +k; const I = Mag.issue(game.home, k), S = I.story, M = I.market, day = I.day;
  mgMarkRead(k);
  const soc = kind => I.society.filter(x => x.kind === kind);
  const onCover = !I.cover.kind || I.cover.kind === "portrait" || I.cover.kind === "couple";
  const art = artPick(I);
  const toc = [["On the cover", `“${art.title}” by ${art.by}, ${art.about}.`], [onCover ? "The cover story" : "The profile", S.title], I.list && ["The Old Town 10", "The richest creatures in town, this year"], ["Society", "Weddings, births, and goodbyes"],
    ["Careers", "Who moved up, who opened, who closed"], ["Property", "New addresses"], ["Market", "Limited drops and a collector's find"]].filter(Boolean);
  const ten = I.list ? I.list.top.map(e => `<div class="mg-trow${e.you ? " you" : ""}"><b class="mg-num">${e.rank}</b><span><b>${esc(e.name)}</b><small>${esc(e.sub || "")}</small></span><em>${coins(e.value)}</em></div>`).join("") : "";
  const famIn = I.list ? I.list.top.filter(e => e.you) : [];
  const dropTxt = D => D.soldIn == null ? `${D.made} made. Some still left.` : D.soldIn === 0 ? `${D.made} made. Gone the same day.` : `${D.made} made. Sold out in ${D.soldIn} day${D.soldIn === 1 ? "" : "s"}.`;
  const col = M.collector;
  return `<div class="mg mg-read"><div class="mg-bar"><button data-back="mag">‹ Issues</button><span>No. ${I.no} · ${esc(I.month)}</span></div>
    <section class="mg-p mg-coverp">${mgCover(I)}</section>
    <section class="mg-p mg-toc"><span class="mg-kick">In this issue</span><ol>${toc.map(([a, b]) => `<li><span><b>${esc(a)}</b><small>${esc(b)}</small></span></li>`).join("")}</ol></section>
    <section class="mg-p mg-story" style="--bg:${I.cover.bg}"><span class="mg-kick">${esc(onCover ? I.cover.kicker : "The profile")}</span><h2>${esc(S.title)}</h2>${mgPhoto(I)}
      ${S.paras.map((p, i) => p.startsWith('"') ? `<q>${esc(p.slice(1, -1))}</q>` : `<p class="${i === 0 ? "mg-drop" : ""}">${esc(p)}</p>`).join("")}</section>
    ${I.list ? `<section class="mg-p mg-ten"><span class="mg-kick">Once a year</span><h2>The Old Town 10</h2><p>The ten richest creatures in Old Town, counted on ${esc(fmtDate(day))}. Coins only. Homes, cars and watches don't count.</p>${ten}
      <p class="mg-foot">${famIn.length ? `${esc(famIn.map(e => e.name).join(" and "))} made the list. The whole town is talking.` : "Nobody from your family made the list this year."}</p></section>` : ""}
    <section class="mg-p mg-sec"><span class="mg-kick">Society</span><h3>Weddings, births, goodbyes</h3>
      <h4>Just married</h4>${mgItems(soc("wedding"), "No weddings this month.")}
      <h4>New arrivals</h4>${mgItems(soc("birth"), "No new arrivals this month.")}
      <h4>In memoriam</h4>${mgItems(soc("passing"), "Nobody we know said goodbye this month.")}</section>
    <section class="mg-p mg-sec"><span class="mg-kick">Careers</span><h3>Moving up</h3>
      ${mgItems(I.careers, "A quiet month at the office.")}
      <h4>Companies</h4>${mgItems(I.companies, "No company opened or closed this month.")}</section>
    <section class="mg-p mg-sec"><span class="mg-kick">Property</span><h3>New addresses</h3>${mgItems(I.property, "Nobody moved this month.")}</section>
    <section class="mg-p mg-sec"><span class="mg-kick">Market</span><h3>The drops</h3>
      ${M.drops.length ? `<div class="mg-drops">${M.drops.map(D => `<div>${shotImg({ id: D.line, label: D.label })}<b>${esc(D.label)}</b><small>${dropTxt(D)}</small></div>`).join("")}</div>` : `<p class="mg-empty">No limited drops last month.</p>`}
      ${M.next.length ? `<h4>Coming next month</h4>${M.next.map(D => `<div class="mg-item">${esc(D.label)}. ${D.made} will be made. In Bazaar on ${esc(fmtDate(D.start))}.</div>`).join("")}` : ""}
      <h4>The collector's find</h4><div class="mg-col">${shotImg({ id: col.line, label: col.label, seed: col.year })}<p>A <b>${esc(col.label.toLowerCase())}</b> from ${col.year}, one of only ${col.made} made, now sells for <b>${coins(col.value)}</b>. ${col.x >= 1.05 ? `That is ${col.x >= 2 ? `${col.x.toFixed(1)} times` : `${Math.round((col.x - 1) * 100)}% more than`} what it cost new.` : `It cost ${coins(col.price)} new. Not every old thing becomes treasure.`}</p></div></section>
    <footer class="mg-end"><b class="mg-logo">OLD TOWN</b><small>No. ${I.no} · ${esc(I.month)} · Next issue on the 1st</small></footer></div>`;
}
// ---- product photos: every item is a small 3D model shot in a little studio, rendered once and cached as an image
const SHOT = { r: null, env: null, cache: new Map(), specs: new Map(), queue: [], busy: false };
const SHOT_W = 480, SHOT_H = 600;
const DROP_TINT = { Moonlit: 0x2D3A63, Ember: 0xC4502E, Aurora: 0x6FB7A8, "Old Town": 0x8A6E4B, Founders: 0x1E1E1E, Velvet: 0x6B2D4F, Harvest: 0xC8962F,
  Comet: 0xB9C2D0, Midnight: 0x15182B, Saffron: 0xE3A325, Glacier: 0xA9D3E3, Lantern: 0xE07A3A, Thistle: 0x8E76A8, Copper: 0xB87333 };
const LINE_TINT = { tee: 0xF4F1EA, jacket: 0x3A4636, couture: 0x8E1F2F, sneakers: 0xF4F4F2, boots: 0x6B4428, phone: 0x2B2D33, flagship: 0xC9C2B6,
  canvas: 0xE6D9BF, luxbag: 0x7A3B25, steelwatch: 0x1D2A44, goldwatch: 0xF3EBD8, scooter: 0x9CC9B9, sedan: 0x6E7F8F, sports: 0xB3261E, supercar: 0xF2B33D,
  vinyl: 0xD9874A, comic: 0x3D6FB8, figurine: 0xE7A6B8, print: 0x5B7FB8, gym: 0x2B2D33, coding: 0xB9BEC4, artclass: 0xC9A27A, drama: 0xF4F1EA };
function shotTint(id, label) {
  const pre = Object.keys(DROP_TINT).find(p => label && label.startsWith(p + " "));
  return pre ? DROP_TINT[pre] : LINE_TINT[id] ?? 0x999999;
}
const sLin = c => new THREE.Color(c).convertSRGBToLinear();
const sMat = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ roughness: rough, metalness: metal, ...extra, color: sLin(color), ...(extra.emissive != null ? { emissive: sLin(extra.emissive) } : {}) });
const sPaint = color => new THREE.MeshPhysicalMaterial({ color: sLin(color), roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06 });
function sTex(w, h, draw) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
}
function sRand(seed) { let h = 2166136261; for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
const sHex = c => "#" + new THREE.Color(c).getHexString();
function sExtrude(pts, depth, bevel = 0.03, curve = 12) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => p.length === 4 ? s.quadraticCurveTo(p[0], p[1], p[2], p[3]) : i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: curve });
  g.translate(0, 0, -depth / 2); return g;
}
function sRBox(w, h, d, r) {
  const x = w / 2, y = h / 2, s = new THREE.Shape();
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  const b = Math.min(0.012, d / 4), g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -(d - 2 * b) / 2); return g;
}
const sM = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; };
function sWheel(r, w, rim = 0xC9CCD1) {
  const g = new THREE.Group();
  const tire = sM(new THREE.TorusGeometry(r * 0.78, r * 0.24, 14, 32), sMat(0x1A1A1C, 0.85)); g.add(tire);
  const hub = sM(new THREE.CylinderGeometry(r * 0.6, r * 0.6, w * 0.7, 24), sMat(rim, 0.25, 0.9)); hub.rotation.x = Math.PI / 2; g.add(hub);
  for (let i = 0; i < 5; i++) { const sp = sM(new THREE.BoxGeometry(r * 0.12, r * 1.1, w * 0.2), sMat(0x2a2a2e, 0.4, 0.6)); sp.rotation.z = i * Math.PI * 2 / 5; sp.position.z = w * 0.36; g.add(sp); }
  return g;
}
// ---- the models (1 unit is roughly the height of the thing)
const SHOT_MODELS = {
  tee(c) { const g = new THREE.Group();
    g.add(sM(sExtrude([[-0.34, 0], [0.34, 0], [0.34, 0.6], [0.6, 0.5], [0.73, 0.72], [0.42, 0.93], [0.17, 0.96], [0, 0.82, -0.17, 0.96], [-0.42, 0.93], [-0.73, 0.72], [-0.6, 0.5], [-0.34, 0.6]], 0.06, 0.035), sMat(c, 0.9)));
    const n = sM(new THREE.TorusGeometry(0.17, 0.018, 8, 24, Math.PI), sMat(new THREE.Color(c).multiplyScalar(0.9), 0.9)); n.rotation.z = Math.PI; n.position.set(0, 0.965, 0.05); n.scale.y = 0.8; g.add(n); return g; },
  jacket(c, a) { const g = new THREE.Group();
    g.add(sM(sExtrude([[-0.38, 0], [0.38, 0], [0.38, 0.62], [0.52, 0.0], [0.7, 0.02], [0.62, 0.8], [0.44, 0.98], [0.15, 1.02], [0, 0.82], [-0.15, 1.02], [-0.44, 0.98], [-0.62, 0.8], [-0.7, 0.02], [-0.52, 0.0], [-0.38, 0.62]], 0.1, 0.04), sMat(c, 0.75)));
    const zip = sM(new THREE.BoxGeometry(0.02, 0.82, 0.02), sMat(0xC9CCD1, 0.3, 0.9)); zip.position.set(0, 0.41, 0.1); g.add(zip);
    for (const s of [-1, 1]) { const col = sM(sExtrude([[0, 0.82], [0.15 * s, 1.02], [0.24 * s, 0.98], [0.06 * s, 0.6]], 0.02, 0.012), sMat(new THREE.Color(c).multiplyScalar(0.8), 0.7)); col.position.z = 0.11; g.add(col);
      const pk = sM(new THREE.BoxGeometry(0.16, 0.02, 0.01), sMat(new THREE.Color(c).multiplyScalar(0.7), 0.7)); pk.position.set(0.2 * s, 0.3, 0.11); g.add(pk); }
    return g; },
  couture(c) { const g = new THREE.Group();
    const pts = [[0.001, 1.32], [0.1, 1.31], [0.15, 1.18], [0.12, 0.98], [0.14, 0.9], [0.26, 0.6], [0.42, 0.24], [0.5, 0.08], [0.49, 0.06]].map(([x, y]) => new THREE.Vector2(x, y));
    const d = sM(new THREE.LatheGeometry(pts, 64), sMat(c, 0.45, 0, { side: THREE.DoubleSide })); g.add(d);
    const belt = sM(new THREE.TorusGeometry(0.125, 0.015, 8, 40), sMat(0xD4AF37, 0.25, 1)); belt.rotation.x = Math.PI / 2; belt.position.y = 0.93; g.add(belt);
    const pole = sM(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 12), sMat(0x222222, 0.4, 0.6)); pole.position.y = 0.04; g.add(pole);
    const base = sM(new THREE.CylinderGeometry(0.22, 0.24, 0.025, 40), sMat(0x222222, 0.35, 0.5)); base.position.y = 0.0125; g.add(base);
    const top = sM(new THREE.SphereGeometry(0.06, 16, 12), sMat(0x222222, 0.3, 0.5)); top.position.y = 1.36; g.add(top); return g; },
  sneakers(c, a) { const g = new THREE.Group();
    const sole = sM(sExtrude([[-0.5, 0.02], [-0.4, 0, -0.2, 0], [0.4, 0], [0.54, 0.0, 0.54, 0.08], [0.5, 0.13], [-0.52, 0.13], [-0.56, 0.06, -0.5, 0.02]], 0.32, 0.025), sMat(0xF7F5F0, 0.7)); g.add(sole);
    const up = sM(sExtrude([[-0.5, 0.12], [-0.56, 0.3, -0.48, 0.46], [-0.38, 0.5, -0.28, 0.44], [-0.18, 0.4, -0.1, 0.42], [0.0, 0.44, 0.08, 0.4], [0.3, 0.3, 0.44, 0.24], [0.53, 0.2, 0.5, 0.12]], 0.26, 0.05), sMat(c, 0.72)); g.add(up);
    const tongue = sM(sExtrude([[-0.22, 0.36], [-0.12, 0.52], [-0.04, 0.5], [0.04, 0.4]], 0.16, 0.03), sMat(c, 0.75)); g.add(tongue);
    for (const z of [-0.18, 0.18]) { const sw = sM(sExtrude([[-0.36, 0.18], [0.3, 0.27], [0.36, 0.22], [-0.2, 0.25, -0.36, 0.18]], 0.004, 0.008), sMat(a, 0.5)); sw.position.z = z; g.add(sw);
      const heel = sM(sExtrude([[-0.53, 0.14], [-0.5, 0.42], [-0.42, 0.42], [-0.44, 0.14]], 0.004, 0.006), sMat(a, 0.5)); heel.position.z = z; g.add(heel); }
    for (let i = 0; i < 4; i++) { const l = sM(new THREE.BoxGeometry(0.025, 0.018, 0.2), sMat(0xFAFAFA, 0.8)); l.position.set(-0.08 + i * 0.075, 0.43 - i * 0.03, 0); l.rotation.z = -0.4; g.add(l); }
    return g; },
  boots(c) { const g = new THREE.Group();
    g.add(sM(sExtrude([[-0.44, 0], [0.47, 0], [0.48, 0.1], [-0.44, 0.1]], 0.32, 0.02), sMat(0x241812, 0.8)));
    g.add(sM(sExtrude([[-0.42, 0.09], [-0.43, 0.82], [-0.12, 0.84], [-0.1, 0.4], [0.24, 0.3], [0.46, 0.2, 0.46, 0.09]], 0.27, 0.05), sMat(c, 0.55)));
    const top = sM(new THREE.BoxGeometry(0.32, 0.04, 0.33), sMat(new THREE.Color(c).multiplyScalar(0.7), 0.6)); top.position.set(-0.27, 0.82, 0); g.add(top); return g; },
  phone(c, a, r, two) { const g = new THREE.Group();
    const mk = (back) => { const p = new THREE.Group();
      p.add(sM(sRBox(0.5, 1.0, 0.05, 0.07), sMat(c, back ? 0.35 : 0.3, two ? 0.85 : 0.2)));
      if (!back) { const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.94), new THREE.MeshStandardMaterial({ roughness: 0.15, map: sTex(256, 512, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, sHex(a)); gr.addColorStop(1, "#14161f"); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(255,255,255,.9)"; x.font = "bold 64px sans-serif"; x.textAlign = "center"; x.fillText("9:41", w / 2, 120); }) })); scr.position.z = 0.031; p.add(scr); }
      else for (let i = 0; i < (two ? 3 : 1); i++) { const cam = sM(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24), sMat(0x111111, 0.1, 0.5)); cam.rotation.x = Math.PI / 2; cam.position.set(-0.13 + (i % 2) * 0.11, 0.36 - Math.floor(i / 2) * 0.11, -0.035); p.add(cam); }
      return p; };
    const f = mk(false); f.position.set(two ? 0.18 : 0, 0.52, 0); f.rotation.set(-0.08, two ? -0.25 : -0.3, 0); g.add(f);
    if (two) { const b = mk(true); b.position.set(-0.3, 0.52, -0.25); b.rotation.set(-0.08, Math.PI + 0.35, 0); g.add(b); }
    return g; },
  flagship(c, a, r) { return SHOT_MODELS.phone(c, a, r, true); },
  canvas(c, a) { const g = new THREE.Group();
    const body = sM(sExtrude([[-0.4, 0], [0.4, 0], [0.45, 0.82], [-0.45, 0.82]], 0.16, 0.03), sMat(c, 0.95)); g.add(body);
    const band = sM(new THREE.BoxGeometry(0.9, 0.09, 0.005), sMat(a, 0.9)); band.position.set(0, 0.45, 0.115); g.add(band);
    for (const z of [-0.09, 0.09]) { const h = sM(new THREE.TorusGeometry(0.2, 0.018, 8, 30, Math.PI), sMat(c, 0.95)); h.position.set(0, 0.84, z); g.add(h); }
    return g; },
  luxbag(c) { const g = new THREE.Group();
    g.add(sM(sExtrude([[-0.45, 0], [0.45, 0], [0.37, 0.56], [-0.37, 0.56]], 0.24, 0.05), sMat(c, 0.42)));
    const flap = sM(sExtrude([[-0.4, 0.26], [0.4, 0.26], [0.4, 0.6], [-0.4, 0.6]], 0.01, 0.02), sMat(new THREE.Color(c).multiplyScalar(0.85), 0.38)); flap.position.z = 0.17; g.add(flap);
    const clasp = sM(new THREE.BoxGeometry(0.1, 0.07, 0.03), sMat(0xD4AF37, 0.2, 1)); clasp.position.set(0, 0.3, 0.2); g.add(clasp);
    const h = sM(new THREE.TorusGeometry(0.2, 0.03, 12, 40, Math.PI), sMat(c, 0.45)); h.position.y = 0.6; g.add(h);
    for (const s of [-1, 1]) { const ring = sM(new THREE.TorusGeometry(0.035, 0.01, 8, 20), sMat(0xD4AF37, 0.2, 1)); ring.position.set(0.2 * s, 0.62, 0); g.add(ring); }
    return g; },
  steelwatch(c, a, r, gold) { const g = new THREE.Group(), metal = gold ? 0xD4AF37 : 0xC8CCD0, R = 0.3;
    const bg = new THREE.TorusGeometry(R, 0.028, 10, 64); bg.scale(1, 1, 4.2);
    const band = sM(bg, sMat(gold ? 0x3B2416 : 0xB7BBC0, gold ? 0.55 : 0.3, gold ? 0 : 0.9)); band.rotation.y = Math.PI / 2; band.position.y = R + 0.03; g.add(band);
    const w = new THREE.Group(); w.position.set(0, R + 0.03, R + 0.04); g.add(w);
    const cs = sM(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 48), sMat(metal, 0.22, 1)); cs.rotation.x = Math.PI / 2; w.add(cs);
    const bz = sM(new THREE.TorusGeometry(0.165, 0.018, 12, 48), sMat(metal, 0.18, 1)); bz.position.z = 0.035; w.add(bz);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.15, 48), new THREE.MeshStandardMaterial({ roughness: 0.35, map: sTex(256, 256, (x, W) => { x.fillStyle = sHex(c); x.fillRect(0, 0, W, W); x.translate(W / 2, W / 2); x.strokeStyle = gold ? "#5b4318" : "#e8e8e8"; x.fillStyle = x.strokeStyle;
      for (let i = 0; i < 12; i++) { x.save(); x.rotate(i * Math.PI / 6); x.fillRect(-3, -110, 6, i % 3 ? 14 : 24); x.restore(); }
      x.lineCap = "round"; x.lineWidth = 8; x.beginPath(); x.moveTo(0, 0); x.lineTo(50, -40); x.stroke(); x.lineWidth = 5; x.beginPath(); x.moveTo(0, 0); x.lineTo(-20, -88); x.stroke(); }) }));
    dial.position.z = 0.036; w.add(dial);
    const cr = sM(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 16), sMat(metal, 0.2, 1)); cr.rotation.z = Math.PI / 2; cr.position.x = 0.19; w.add(cr);
    return g; },
  goldwatch(c, a, r) { return SHOT_MODELS.steelwatch(c, a, r, true); },
  scooter(c) { const g = new THREE.Group();
    for (const x of [-0.5, 0.52]) { const w = sWheel(0.2, 0.12); w.position.set(x, 0.2, 0); g.add(w); }
    g.add(sM(sExtrude([[-0.72, 0.22], [-0.2, 0.2], [0.25, 0.18], [0.3, 0.3], [-0.15, 0.32], [-0.2, 0.42], [-0.62, 0.5], [-0.78, 0.4, -0.72, 0.22]], 0.3, 0.06), sPaint(c)));
    g.add(sM(sExtrude([[0.25, 0.18], [0.42, 0.22], [0.5, 0.9], [0.42, 0.92], [0.3, 0.3]], 0.26, 0.05), sPaint(c)));
    const seat = sM(sRBox(0.48, 0.09, 0.26, 0.04), sMat(0x3A2A22, 0.6)); seat.position.set(-0.45, 0.58, 0); g.add(seat);
    const bar = sM(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 12), sMat(0xC9CCD1, 0.3, 0.9)); bar.rotation.x = Math.PI / 2; bar.position.set(0.47, 0.98, 0); g.add(bar);
    const lamp = sM(new THREE.SphereGeometry(0.07, 20, 14), sMat(0xFFF6DD, 0.1, 0, { emissive: 0x665a3a })); lamp.position.set(0.52, 0.96, 0); g.add(lamp);
    const fg = sM(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), sPaint(c)); fg.scale.set(1, 0.5, 0.7); fg.position.set(0.52, 0.32, 0); g.add(fg);
    return g; },
  car(c, a, r, kind) {
    const g = new THREE.Group(), W = kind === "supercar" ? 0.86 : 0.8;
    const P = {
      sedan: { body: [[-1, 0.16], [1, 0.16], [1.02, 0.38], [0.94, 0.5], [0.55, 0.56], [-0.55, 0.58], [-0.96, 0.54], [-1.02, 0.4]], cab: [[-0.6, 0.56], [0.48, 0.56], [0.26, 0.86], [-0.42, 0.87]], wr: 0.21, wx: 0.62 },
      sports: { body: [[-1, 0.14], [1.02, 0.14], [1.05, 0.3], [0.9, 0.42], [0.4, 0.48], [-0.5, 0.5], [-0.98, 0.46], [-1.02, 0.32]], cab: [[-0.6, 0.48], [0.38, 0.48], [0.02, 0.74], [-0.42, 0.74]], wr: 0.21, wx: 0.64 },
      supercar: { body: [[-1.02, 0.12], [1.05, 0.12], [1.08, 0.22], [0.6, 0.36], [-0.3, 0.42], [-1.0, 0.42], [-1.04, 0.28]], cab: [[-0.48, 0.41], [0.42, 0.37], [0.0, 0.6], [-0.38, 0.6]], wr: 0.2, wx: 0.66 },
    }[kind];
    g.add(sM(sExtrude(P.body, W - 0.12, 0.06), sPaint(c)));
    const glass = sM(sExtrude(P.cab, W - 0.22, 0.05), new THREE.MeshPhysicalMaterial({ color: sLin(0x1B2430), roughness: 0.08, metalness: 0.3, clearcoat: 1 })); g.add(glass);
    for (const x of [-P.wx, P.wx]) for (const z of [-W / 2 + 0.02, W / 2 - 0.02]) { const w = sWheel(P.wr, 0.18); w.position.set(x, P.wr, z); if (z < 0) w.rotation.y = Math.PI; g.add(w); }
    for (const z of [-W / 2 + 0.14, W / 2 - 0.14]) { const l = sM(new THREE.BoxGeometry(0.04, 0.05, 0.16), sMat(0xFFF6DD, 0.1, 0, { emissive: 0x887755 })); l.position.set(P.body[2][0] + 0.02, (P.body[2][1] + P.body[1][1]) / 2 + 0.04, z); g.add(l); }
    if (kind === "supercar") { const sp = sM(new THREE.BoxGeometry(0.22, 0.03, W - 0.08), sPaint(0x161616)); sp.position.set(-0.95, 0.56, 0); g.add(sp);
      for (const z of [-0.25, 0.25]) { const st = sM(new THREE.BoxGeometry(0.04, 0.14, 0.04), sPaint(0x161616)); st.position.set(-0.92, 0.48, z); g.add(st); } }
    return g; },
  sedan(c, a, r) { return SHOT_MODELS.car(c, a, r, "sedan"); },
  sports(c, a, r) { return SHOT_MODELS.car(c, a, r, "sports"); },
  supercar(c, a, r) { return SHOT_MODELS.car(c, a, r, "supercar"); },
  vinyl(c, a, r) { const g = new THREE.Group();
    const art = sTex(256, 256, (x, W) => { x.fillStyle = sHex(c); x.fillRect(0, 0, W, W); for (let i = 0; i < 5; i++) { x.fillStyle = `hsla(${Math.floor(r() * 360)},45%,${30 + r() * 50}%,.85)`; x.beginPath(); x.arc(r() * W, r() * W, 20 + r() * 90, 0, 7); x.fill(); } x.fillStyle = "rgba(255,255,255,.92)"; x.font = "bold 26px Georgia, serif"; x.fillText("SIDE A", 18, W - 22); });
    const sl = sM(new THREE.BoxGeometry(0.9, 0.9, 0.025), [sMat(0xEEEEEE, 0.9), sMat(0xEEEEEE, 0.9), sMat(0xEEEEEE, 0.9), sMat(0xEEEEEE, 0.9), new THREE.MeshStandardMaterial({ map: art, roughness: 0.7 }), sMat(0xDDDDDD, 0.9)]);
    sl.position.set(-0.12, 0.45, 0.04); sl.rotation.set(-0.12, 0.18, 0); g.add(sl);
    const disc = sM(new THREE.CylinderGeometry(0.42, 0.42, 0.012, 64), sMat(0x0E0E10, 0.25, 0.2)); disc.rotation.set(Math.PI / 2 - 0.12, 0, 0); disc.position.set(0.22, 0.44, -0.05); g.add(disc);
    const lab = new THREE.Mesh(new THREE.CircleGeometry(0.13, 32), sMat(a, 0.8)); lab.position.set(0.22, 0.44, -0.04 + 0.058); lab.rotation.x = -0.12; g.add(lab);
    return g; },
  comic(c, a, r) { const g = new THREE.Group();
    const cover = sTex(256, 368, (x, W, H) => { x.fillStyle = "#fbf6ea"; x.fillRect(0, 0, W, H); x.fillStyle = sHex(c); x.fillRect(0, 0, W, 70); x.fillStyle = "#fff"; x.font = "900 38px Impact, sans-serif"; x.fillText("BURROW", 14, 52);
      for (let i = 0; i < 4; i++) { x.fillStyle = `hsl(${Math.floor(r() * 360)},55%,${45 + r() * 25}%)`; x.fillRect(12 + (i % 2) * 120, 84 + Math.floor(i / 2) * 136, 112, 128); x.fillStyle = "rgba(255,255,255,.85)"; x.beginPath(); x.arc(40 + (i % 2) * 120 + r() * 50, 130 + Math.floor(i / 2) * 136 + r() * 50, 22, 0, 7); x.fill(); }
      x.fillStyle = "#111"; x.font = "bold 22px sans-serif"; x.fillText("#" + (1 + Math.floor(r() * 99)), W - 56, H - 12); });
    const b = sM(new THREE.BoxGeometry(0.64, 0.92, 0.02), [sMat(0xffffff), sMat(0xffffff), sMat(0xffffff), sMat(0xffffff), new THREE.MeshStandardMaterial({ map: cover, roughness: 0.55 }), sMat(0xeeeeee)]);
    b.position.set(0, 0.46, 0); b.rotation.set(-0.16, 0.22, 0.03); g.add(b); return g; },
  figurine(c) { const g = new THREE.Group();
    const base = sM(new THREE.CylinderGeometry(0.3, 0.32, 0.07, 48), sMat(0x1E1E1E, 0.3, 0.3)); base.position.y = 0.035; g.add(base);
    const body = sM(new THREE.SphereGeometry(0.26, 40, 28), sMat(c, 0.38)); body.scale.set(1, 0.92, 0.9); body.position.y = 0.32; g.add(body);
    const belly = sM(new THREE.SphereGeometry(0.16, 30, 20), sMat(0xFFF4E8, 0.4)); belly.scale.set(1, 1.05, 0.5); belly.position.set(0, 0.27, 0.17); g.add(belly);
    for (const s of [-1, 1]) { const ear = sM(new THREE.ConeGeometry(0.08, 0.2, 20), sMat(c, 0.38)); ear.position.set(0.15 * s, 0.6, 0); ear.rotation.z = -0.35 * s; g.add(ear);
      const eye = sM(new THREE.SphereGeometry(0.028, 16, 12), sMat(0x111111, 0.1)); eye.position.set(0.09 * s, 0.4, 0.22); g.add(eye);
      const ch = sM(new THREE.SphereGeometry(0.03, 12, 10), sMat(0xF29BA8, 0.5)); ch.position.set(0.15 * s, 0.34, 0.2); ch.scale.z = 0.4; g.add(ch); }
    return g; },
  print(c, a, r) { const g = new THREE.Group();
    const art = sTex(300, 380, (x, W, H) => { x.fillStyle = "#F3EEE4"; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 7; i++) { x.fillStyle = i % 3 ? `hsla(${Math.floor(r() * 360)},40%,${35 + r() * 35}%,.9)` : sHex(c); const k = r(); if (k < 0.4) { x.beginPath(); x.arc(r() * W, r() * H, 20 + r() * 80, 0, 7); x.fill(); } else if (k < 0.75) x.fillRect(r() * W * 0.8, r() * H * 0.8, 30 + r() * 120, 30 + r() * 140); else { x.beginPath(); x.moveTo(r() * W, r() * H); x.lineTo(r() * W, r() * H); x.lineTo(r() * W, r() * H); x.fill(); } } });
    const fr = sM(sExtrude([[-0.42, 0], [0.42, 0], [0.42, 1.05], [-0.42, 1.05]], 0.04, 0.012), sMat(0x1C1A18, 0.45)); fr.rotation.x = -0.12; g.add(fr);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.97), sMat(0xFAF8F3, 0.9)); mat.position.set(0, 0.525 - 0.0, 0.035); g.add(mat);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.72), new THREE.MeshStandardMaterial({ map: art, roughness: 0.8 })); pic.position.set(0, 0.53, 0.037); g.add(pic);
    mat.parent.remove(mat); pic.parent.remove(pic); fr.add(mat); fr.add(pic); return g; },
  gym(c) { const g = new THREE.Group();
    const bar = sM(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 16), sMat(0xC9CCD1, 0.25, 0.9)); bar.rotation.z = Math.PI / 2; bar.position.y = 0.16; g.add(bar);
    for (const s of [-1, 1]) for (const k of [0, 1]) { const p = sM(new THREE.CylinderGeometry(0.16 - k * 0.03, 0.16 - k * 0.03, 0.07, 6), sMat(0x222326, 0.5, 0.2)); p.rotation.z = Math.PI / 2; p.position.set(s * (0.3 + k * 0.08), 0.16, 0); g.add(p); }
    return g; },
  coding(c) { const g = new THREE.Group();
    const base = sM(sRBox(0.9, 0.6, 0.035, 0.04), sMat(c, 0.35, 0.8)); base.rotation.x = -Math.PI / 2; base.position.y = 0.02; g.add(base);
    const lid = new THREE.Group(); lid.position.set(0, 0.035, -0.29); lid.rotation.x = -0.25; g.add(lid);
    const l = sM(sRBox(0.9, 0.6, 0.025, 0.04), sMat(c, 0.35, 0.8)); l.position.y = 0.3; lid.add(l);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.52), new THREE.MeshStandardMaterial({ roughness: 0.2, emissive: 0x222222, map: sTex(400, 256, (x, W, H) => { x.fillStyle = "#151924"; x.fillRect(0, 0, W, H); const cols = ["#7FB8A8", "#E3A325", "#C96B86", "#9AA6E0"]; for (let i = 0; i < 12; i++) { x.fillStyle = cols[i % 4]; x.fillRect(20 + (i % 3) * 18, 20 + i * 19, 40 + ((i * 37) % 200), 9); } }) }));
    scr.position.set(0, 0.3, 0.014); lid.add(scr); return g; },
  artclass(c) { const g = new THREE.Group();
    const pal = sM(sExtrude([[-0.45, 0], [0.3, -0.05], [0.48, 0.15, 0.4, 0.4], [0.1, 0.55], [-0.35, 0.5, -0.5, 0.25]], 0.03, 0.015), sMat(c, 0.6)); pal.rotation.x = -Math.PI / 2 + 0.25; pal.position.y = 0.08; g.add(pal);
    ["#E07A5F", "#5B7FB8", "#F2CC8F", "#81B29A", "#C96B86"].forEach((col, i) => { const d = sM(new THREE.SphereGeometry(0.055, 16, 10), sMat(col, 0.35)); d.scale.y = 0.4; d.position.set(-0.28 + i * 0.13, 0.12 + Math.sin(i) * 0.01, -0.12 + (i % 2) * 0.07); g.add(d); });
    const br = sM(new THREE.CylinderGeometry(0.014, 0.02, 0.8, 12), sMat(0xB5523B, 0.4)); br.rotation.z = Math.PI / 2 - 0.3; br.position.set(0.05, 0.16, 0.2); g.add(br); return g; },
  drama(c) { const g = new THREE.Group();
    const m = sM(new THREE.SphereGeometry(0.34, 40, 30, 0, Math.PI), sMat(c, 0.3)); m.scale.set(0.9, 1.1, 0.6); m.position.y = 0.42; g.add(m);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), sMat(0x111111, 0.5)); e.scale.y = 0.6; e.position.set(0.12 * s, 0.5, 0.205); g.add(e); }
    const sm = sM(new THREE.TorusGeometry(0.12, 0.018, 8, 24, Math.PI), sMat(0x111111, 0.5)); sm.rotation.z = Math.PI; sm.position.set(0, 0.36, 0.19); g.add(sm);
    const rib = sM(new THREE.TorusGeometry(0.08, 0.015, 8, 20), sMat(0xB3261E, 0.5)); rib.position.set(0.3, 0.6, 0); g.add(rib); return g; },
};
const SHOT_VIEW = { Car: [-0.9, 0.38, 1], Shoes: [0.6, 0.3, 1], Watch: [0.35, 0.3, 1], Phone: [0.15, 0.1, 1], Classes: [0.25, 0.55, 1], Collectible: [0.15, 0.15, 1], Bag: [0.3, 0.15, 1], Fashion: [0, 0.05, 1] };
function shotEnv(r) {
  if (SHOT.env) return SHOT.env;
  const es = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: 0x5a5753, side: THREE.BackSide })); es.add(room);
  for (const [x, y, z, w, h] of [[0, 8, 0, 8, 8], [-8, 3, 4, 3, 6], [8, 4, -2, 3, 5]]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); b.position.set(x, y, z); b.lookAt(0, 0, 0); b.material.color.multiplyScalar(2.2); es.add(b); }
  const pm = new THREE.PMREMGenerator(r); SHOT.env = pm.fromScene(es, 0.04).texture; pm.dispose();
  return SHOT.env;
}
function shotRender(spec) {
  if (!SHOT.r) {
    const cv = document.createElement("canvas"); cv.width = SHOT_W; cv.height = SHOT_H;
    SHOT.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
    SHOT.r.setPixelRatio(1); SHOT.r.setSize(SHOT_W, SHOT_H, false);
    SHOT.r.outputEncoding = THREE.sRGBEncoding; SHOT.r.toneMapping = THREE.ACESFilmicToneMapping; SHOT.r.toneMappingExposure = 0.95;
    SHOT.r.shadowMap.enabled = true; SHOT.r.shadowMap.type = THREE.PCFSoftShadowMap; SHOT.r.physicallyCorrectLights = false;
  }
  const r = SHOT.r, sc = new THREE.Scene();
  sc.background = sLin(spec.bg); sc.environment = shotEnv(r);
  sc.add(new THREE.HemisphereLight(0xffffff, 0xb8b2a8, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(-2.5, 5, 3.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 15 }); key.shadow.radius = 6; key.shadow.bias = -0.0005; sc.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.45); rim.position.set(3, 3, -3); sc.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: spec.dark ? 0.35 : 0.16 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
  const build = SHOT_MODELS[spec.id] || SHOT_MODELS.tee;
  const obj = build(spec.color, spec.accent, sRand(spec.seed)); sc.add(obj);
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  obj.position.x -= ctr.x; obj.position.z -= ctr.z; obj.position.y -= box.min.y; ctr.set(0, size.y / 2, 0);
  const cam = new THREE.PerspectiveCamera(26, SHOT_W / SHOT_H, 0.05, 50);
  const v = new THREE.Vector3(...(SHOT_VIEW[spec.cat] || [0.2, 0.2, 1])).normalize();
  const rad = Math.max(size.x / (SHOT_W / SHOT_H), size.y, size.z * 0.6) * 0.5;
  const dist = rad / Math.tan(THREE.MathUtils.degToRad(26) / 2) * (spec.cat === "Car" ? 1.4 : 1.85);
  cam.position.copy(ctr).addScaledVector(v, dist); cam.lookAt(ctr.x, ctr.y * 0.92, ctr.z);
  r.render(sc, cam);
  const url = r.domElement.toDataURL("image/jpeg", 0.88);
  sc.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
  return url;
}
// spec from an item: line id, its label (limited editions get their own color), and the backdrop
function shotKey(o) {
  const L = Market.LINE[o.id], spec = { id: o.id, cat: L.cat, color: shotTint(o.id, o.label), accent: o.label && o.label !== L.label ? shotTint(o.id, o.label) : 0xC4502E,
    seed: o.label + (o.seed || ""), bg: o.dark ? 0x3A332D : 0xF2F0EC, dark: !!o.dark };
  if (o.id === "sneakers" && spec.color !== LINE_TINT.sneakers) { spec.accent = 0xF7F5F0; }
  const key = [spec.id, spec.color, spec.accent, spec.seed, spec.bg].join("|");
  SHOT.specs.set(key, spec);
  return key;
}
const shotImg = (o, cls = "") => { const k = shotKey(o); const u = SHOT.cache.get(k); return `<img class="bz-img ${cls}" data-shot="${esc(k)}" alt="${esc(o.label || Market.LINE[o.id].label)}" ${u ? `src="${u}"` : ""}>`; };
function shotFill(root) {
  for (const img of root.querySelectorAll("img[data-shot]:not([src])")) { const k = img.dataset.shot; if (!SHOT.queue.includes(k)) SHOT.queue.push(k); }
  if (SHOT.busy) return;
  SHOT.busy = true;
  const step = () => {
    const k = SHOT.queue.shift();
    if (!k) { SHOT.busy = false; return; }
    if (!SHOT.cache.has(k)) { try { SHOT.cache.set(k, shotRender(SHOT.specs.get(k))); } catch (e) { console.warn("shot", e); SHOT.cache.set(k, ""); } }
    document.querySelectorAll(`img[data-shot="${CSS.escape(k)}"]`).forEach(i => { if (SHOT.cache.get(k)) i.src = SHOT.cache.get(k); });
    setTimeout(step, 0);
  };
  setTimeout(step, 30);
}

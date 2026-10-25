// ================================================================ floating UI
const floats = $("floats");
// ---- the pet in the room: a small creature beside its owner, built from simple shapes per kind
let PT3 = null;
function makePet(P, parent) {
  const K = Pets.KINDS[P.kind], hue = parseInt(K.color.slice(1), 16), root = new THREE.Group(), body = new THREE.Group(); root.add(body); parent.add(root);
  const skin = M(hue, { roughness: 0.9 }), dark = M(shade(hue, 0.7), { roughness: 0.9 }), light = M(tint(hue, 0.55), { roughness: 1 });
  const eyeM = M(0x1d1a1a, { roughness: 0.25 }), glint = F(0xffffff), parts = { body, eyes: [], wings: [], legs: [], tail: null, head: body, ears: [] };
  const eye = (x, y, z, r, head) => { const e = mesh(SPH(r, 16, 12), eyeM, x, y, z, head); mesh(SPH(r * 0.35, 8, 6), glint, r * 0.3, r * 0.35, r * 0.8, e); parts.eyes.push(e); return e; };
  const k = P.kind;
  if (k === "fluff") {
    const b = mesh(SPH(0.75), skin, 0, 0.75, 0, body); b.scale.set(1, 0.92, 1);
    for (let i = 0; i < 14; i++) { const a = i * 2.4, yy = 0.35 + (i % 5) * 0.22, f = mesh(SPH(0.22, 10, 8), skin, Math.cos(a) * 0.62, yy, Math.sin(a) * 0.62, body); f.scale.setScalar(0.8 + (i % 3) * 0.15); }
    for (const sx of [-1, 1]) { const e = mesh(SPH(0.18, 12, 10), dark, sx * 0.4, 1.38, 0, body); e.scale.set(1, 1.3, 0.6); parts.ears.push(e); eye(sx * 0.26, 0.92, 0.66, 0.1, body); }
    mesh(SPH(0.08, 10, 8), M(0xE58A8A), 0, 0.78, 0.74, body);
  } else if (k === "lizard") {
    const b = mesh(SPH(0.5), skin, 0, 0.55, 0, body); b.scale.set(0.85, 0.75, 1.3);
    const head = new THREE.Group(); head.position.set(0, 0.95, 0.55); body.add(head); parts.head = head;
    mesh(SPH(0.36), skin, 0, 0, 0, head).scale.set(1, 0.85, 1.1); for (const sx of [-1, 1]) eye(sx * 0.2, 0.12, 0.26, 0.09, head);
    for (const sx of [-1, 1]) { const w = new THREE.Group(); w.position.set(sx * 0.35, 0.85, -0.05); body.add(w); const wm = mesh(new THREE.ConeGeometry(0.35, 0.8, 3), light, sx * 0.35, 0, 0, w); wm.rotation.z = -sx * Math.PI / 2; wm.scale.z = 0.15; parts.wings.push(w); w.userData.sx = sx; }
    const t = new THREE.Group(); t.position.set(0, 0.45, -0.6); body.add(t); const tm = mesh(new THREE.ConeGeometry(0.16, 0.9, 12), dark, 0, 0, -0.4, t); tm.rotation.x = -Math.PI / 2; parts.tail = t;
    for (const [x, z] of [[-0.35, 0.35], [0.35, 0.35], [-0.35, -0.35], [0.35, -0.35]]) parts.legs.push(mesh(SPH(0.12, 10, 8), dark, x, 0.12, z, body));
  } else if (k === "fish") {
    const b = mesh(SPH(0.6), skin, 0, 0.75, 0, body); b.scale.set(0.75, 0.85, 1.25);
    mesh(SPH(0.45), light, 0, 0.62, 0.2, body).scale.set(0.6, 0.6, 0.9);
    for (const sx of [-1, 1]) eye(sx * 0.36, 0.95, 0.5, 0.11, body);
    const t = new THREE.Group(); t.position.set(0, 0.75, -0.7); body.add(t); const tm = mesh(new THREE.ConeGeometry(0.4, 0.55, 3), dark, 0, 0, -0.2, t); tm.rotation.x = Math.PI / 2; tm.scale.x = 0.25; parts.tail = t;
    const fin = mesh(new THREE.ConeGeometry(0.22, 0.4, 3), dark, 0, 1.35, -0.1, body); fin.scale.z = 0.3;
    for (const sx of [-1, 1]) parts.legs.push(mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 8), M(0xE0A15A), sx * 0.22, 0.17, 0.05, body));
  } else if (k === "bunny") {
    mesh(SPH(0.6), skin, 0, 0.6, -0.1, body).scale.set(1, 0.95, 1.1);
    const head = new THREE.Group(); head.position.set(0, 1.15, 0.35); body.add(head); parts.head = head;
    mesh(SPH(0.42), skin, 0, 0, 0, head); for (const sx of [-1, 1]) { eye(sx * 0.18, 0.05, 0.36, 0.08, head); const e = new THREE.Group(); e.position.set(sx * 0.16, 0.3, -0.05); head.add(e); mesh(SPH(0.13, 12, 10), skin, 0, 0.35, 0, e).scale.set(0.8, 2.8, 0.5); mesh(SPH(0.07, 10, 8), light, 0, 0.35, 0.05, e).scale.set(0.8, 3.5, 0.4); e.rotation.z = sx * 0.15; parts.ears.push(e); }
    mesh(SPH(0.06, 8, 6), M(0xE58A8A), 0, -0.05, 0.42, head); mesh(SPH(0.2, 12, 10), light, 0, 0.55, -0.7, body);
    for (let i = 0; i < 6; i++) mesh(SPH(0.09, 8, 6), M(0x5E8F45), Math.cos(i) * 0.4, 1.05 + (i % 2) * 0.08, -0.2 + Math.sin(i) * 0.3, body);
  } else if (k === "turtle") {
    const sh = mesh(new THREE.SphereGeometry(0.7, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), dark, 0, 0.35, 0, body); sh.scale.set(1, 0.85, 1.15);
    for (let i = 0; i < 5; i++) { const a = i * 1.26; mesh(SPH(0.16, 10, 8), M(shade(hue, 0.55)), Math.cos(a) * 0.35, 0.82, Math.sin(a) * 0.4, body).scale.y = 0.35; }
    mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.12, 24), light, 0, 0.36, 0, body).scale.z = 1.15;
    const head = new THREE.Group(); head.position.set(0, 0.5, 0.85); body.add(head); parts.head = head;
    mesh(SPH(0.25), skin, 0, 0, 0, head).scale.set(1, 0.9, 1.15); for (const sx of [-1, 1]) eye(sx * 0.13, 0.08, 0.2, 0.06, head);
    for (const [x, z] of [[-0.5, 0.45], [0.5, 0.45], [-0.5, -0.45], [0.5, -0.45]]) parts.legs.push(mesh(SPH(0.16, 10, 8), skin, x, 0.18, z, body));
  } else {
    // owl-cat
    mesh(SPH(0.65), skin, 0, 0.7, 0, body).scale.set(1, 1.05, 0.95);
    mesh(SPH(0.45), light, 0, 0.6, 0.3, body).scale.set(1, 1.1, 0.6);
    for (const sx of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(0.16, 0.42, 4), dark, sx * 0.38, 1.45, 0, body); e.rotation.z = -sx * 0.25; parts.ears.push(e);
      const ring = mesh(SPH(0.2, 16, 12), light, sx * 0.25, 0.98, 0.5, body); ring.scale.z = 0.4; eye(sx * 0.25, 0.98, 0.6, 0.12, body);
      const w = new THREE.Group(); w.position.set(sx * 0.6, 0.85, -0.05); body.add(w); const wm = mesh(SPH(0.3, 12, 10), dark, 0, -0.2, 0, w); wm.scale.set(0.35, 1, 0.8); parts.wings.push(w); w.userData.sx = sx; }
    mesh(new THREE.ConeGeometry(0.07, 0.15, 8), M(0xE0A15A), 0, 0.82, 0.66, body).rotation.x = Math.PI / 2;
  }
  return { root, ...parts, key: P.id + P.kind, sc: { fluff: 0.62, lizard: 0.6, fish: 0.55, bunny: 0.6, turtle: 0.62, owlcat: 0.6 }[k], kind: k };
}
function petSync() {
  const c = cur && game.home.get(cur.id), P = c && c.st && c.st.pet && !c.st.pet.lost ? c.st.pet : null, key = P ? P.id + P.kind : null;
  if ((PT3 && PT3.key) === key) return;
  if (PT3) scene.remove(PT3.root);
  PT3 = P && globalThis.Pets ? makePet(P, scene) : null;
  if (PT3) PT3.root.position.set(1.65, 0, 1.5);
}
function petFrame(t, ts, napping, gone) {
  if (!PT3) return;
  const T = PT3, c = cur && game.home.get(cur.id), P = c && c.st && c.st.pet;
  T.root.visible = !gone && !!P;
  if (!T.root.visible) return;
  const sleepy = napping || (P.pers === "lazy" && Math.sin(ts * 0.05) > 0.4), sick = !!P.sick, happy = P.joy > 60 && !sick;
  if (!T.hopAt || t > T.hopAt) { T.hop = t; T.hopAt = t + (happy ? 2500 : 6000) + Math.random() * 5000; }
  const hp = (t - T.hop) / 450, hy = !sleepy && !reduce && hp < 1 && T.kind !== "turtle" ? Math.sin(hp * Math.PI) * (T.kind === "fish" ? 0.25 : 0.45) : 0;
  const bob = reduce ? 0 : Math.sin(ts * (sleepy ? 1.2 : 3)) * (sleepy ? 0.03 : 0.02);
  T.root.position.y = hy; T.root.scale.set(T.sc * (1 - bob), T.sc * (1 + bob), T.sc * (1 - bob));
  // looks at the owner most of the time, wanders its gaze sometimes
  const look = -0.45 + Math.sin(ts * 0.4) * 0.35;
  T.root.rotation.y += (look - T.root.rotation.y) * 0.05;
  T.eyes.forEach(e => e.scale.y += ((sleepy ? 0.12 : sick ? 0.6 : 1) - e.scale.y) * 0.3);
  T.wings.forEach(w => { w.rotation.z = (reduce || sleepy ? 0.1 : (T.kind === "lizard" ? 0.5 : 0.2) * Math.sin(ts * (hy > 0 ? 22 : 6))) * w.userData.sx; });
  if (T.tail) T.tail.rotation.y = reduce ? 0 : Math.sin(ts * (happy ? 8 : 2)) * (happy ? 0.45 : 0.15);
  T.legs.forEach((l, i) => { l.position.y = (T.kind === "fish" ? 0.17 : T.kind === "turtle" ? 0.18 : 0.12) + (reduce || sleepy ? 0 : Math.max(0, Math.sin(ts * 5 + i * Math.PI)) * 0.05); });
  T.ears.forEach((e, i) => { e.rotation.x = sick || P.joy < 30 ? 0.5 : Math.sin(ts * 1.3 + i) * 0.05; });
  if (T.head !== T.body) T.head.rotation.x = sleepy ? 0.35 : Math.sin(ts * 0.9) * 0.08;
}
function screenOf(v) {
  const p = v.clone().project(camera), r = canvas.getBoundingClientRect(), ar = app.getBoundingClientRect();
  return { x: (p.x + 1) / 2 * r.width + r.left - ar.left, y: (1 - p.y) / 2 * r.height + r.top - ar.top };
}
let bubble = null, bubbleUntil = 0, alertEl = null;
function say(text, ms = 2200) {
  if (!bubble) { bubble = document.createElement("div"); bubble.className = "float"; floats.appendChild(bubble); }
  bubble.innerHTML = `<div class="bubble">${esc(text)}</div>`; bubbleUntil = performance.now() + ms; talkUntil = performance.now() + Math.min(ms * 0.6, 2500);
}
function burst(chars, n = 6, color = "var(--berry)", size = 28, cls = "") {
  const p = screenOf(new THREE.Vector3(0, head.y - 0.6, 0));
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div"); s.className = "particle " + cls; s.textContent = chars[i % chars.length];
    Object.assign(s.style, { left: p.x + (Math.random() - 0.5) * 80 + "px", top: p.y + "px", color, fontSize: size + "px", animationDelay: i * 0.08 + "s" });
    s.style.setProperty("--dx", (Math.random() - 0.5) * 120 + "px");
    floats.appendChild(s); setTimeout(() => s.remove(), 1700);
  }
}
const toastBox = $("toast");
function story(name, text, big) {
  const el = document.createElement("div"); el.className = "story" + (big ? " besar" : "");
  el.innerHTML = text.replace(/^_/, "").startsWith(name) ? md(text) : `<b>${esc(name)}</b> ${md(text)}`; toastBox.appendChild(el);
  el.onclick = () => { if (game) showDiary(); };
  while (toastBox.children.length > 2) toastBox.firstChild.remove();
  setTimeout(() => el.remove(), big ? 9000 : 6000);
}


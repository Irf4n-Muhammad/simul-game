// ---- photo memories: a photo is a memory of something that really happened (who, where, why)
// event id from the simulation -> where it happened, the caption, the face, and any prop in the picture
const W_ = (w, d = "someone") => (w && w.nama) || d;
const wantDone = (l) => { const c = game && game.home.get(l.cid), r = c && Wants.recent(c, l.day).find(x => x[2] === "tercapai"); return r ? { id: r[1], label: Wants.labelFor(r[1], c, l.day, game.home) } : null; };
const PHOTO = {
  malam_pertama: { place: "home", face: "calm", cap: (n) => `${n}'s first night home` },
  keinginan_besar: { place: (l) => ({ maraton: "plaza", toko: "plaza", cinta: "park", teman: "park" })[(wantDone(l) || {}).id] || "home", face: "joy",
    cap: (n, w, l) => { const r = wantDone(l); return r ? `${n} wanted ${r.label}. Got it.` : `${n}'s big wish came true`; } },
  senyum_pertama: { place: "home", face: "joy", cap: (n) => `${n}'s first smile` },
  ketawa_pertama: { place: "home", face: "joy", cap: (n) => `${n}'s first laugh` },
  duduk_sendiri: { place: "home", face: "surprise", cap: (n) => `${n} sat up all by themselves` },
  kata_pertama: { place: "home", face: "joy", cap: (n) => `${n} said their first word` },
  langkah_pertama: { place: "home", face: "joy", cap: (n) => `${n}'s first steps` },
  ulang_tahun: { place: "home", face: "joy", prop: "cake", cap: (n, w, l) => `${n} turns ${Math.max(1, Math.round(l.age / 365))}` },
  hari_pertama_sekolah: { place: "school", face: "surprise", cap: (n) => `First day of school` },
  teman_baru: { place: "park", face: "joy", cap: (n, w) => `Met ${W_(w, "a new friend")} for the first time` },
  bakat_ketahuan: { place: "school", face: "surprise", cap: (n) => `The day ${n}'s talent showed` },
  lomba: { place: "plaza", face: "joy", cap: (n) => `At the big competition` },
  cinta_monyet: { place: "school", face: "joy", cap: (n, w) => `A little crush on ${W_(w)}` },
  jadian_remaja: { place: "park", face: "joy", cap: (n, w) => `${n} and ${W_(w)} start dating` },
  pesta_pertama: { place: "home", face: "joy", prop: "balloons", cap: (n) => `A party with friends` },
  patah_hati: { place: "home", face: "sad", cap: (n) => `A broken heart` },
  putus: { place: "park", face: "sad", cap: (n, w) => `The day it ended with ${W_(w)}` },
  kerja_sambilan: { place: "cafe", face: "joy", cap: (n) => `First part-time job` },
  kampus_organisasi: { place: "school", face: "joy", cap: (n) => `${n} joined a campus club` },
  memoar_selesai: { place: "home", face: "calm", cap: (n) => `${n} finished the memoir` },
  warisan_resep: { place: "home", face: "joy", cap: (n) => `Passing down the family recipe` },
  wisuda: { place: "school", face: "joy", prop: "cap", cap: (n) => `Graduation day` },
  cerita_perjalanan: { place: "park", face: "joy", cap: (n) => `Out seeing the world` },
  liburan: { place: "park", face: "joy", cap: (n) => `On holiday` },
  naik_jabatan: { place: "office", face: "joy", cap: (n) => `Just got promoted` },
  dipecat: { place: "office", face: "sad", cap: (n) => `Last day at the office` },
  karya_besar: { place: "office", face: "joy", cap: (n) => `Finished something big` },
  party_kantor: { place: "office", face: "joy", prop: "balloons", cap: (n) => `The office party` },
  kenalan_menarik: { place: "cafe", face: "surprise", cap: (n, w) => `Met ${W_(w, "someone interesting")} at the café` },
  jadian: { place: "cafe", face: "joy", cap: (n, w) => `${n} and ${W_(w)}, officially together` },
  kencan: { place: "cafe", face: "joy", cap: (n, w) => `A date with ${W_(w)}` },
  lamaran: { place: "park", face: "joy", prop: "arch", cap: (n, w) => `${W_(w)} said yes` },
  pernikahan: { place: "plaza", face: "joy", prop: "arch", cap: (n, w) => `Wedding day: ${n} and ${W_(w)}` },
  kelahiran: { place: "home", face: "joy", cap: (n, w) => `${W_(w, "The baby")} is born` },
  pindah_rumah: { place: "home", face: "joy", prop: "boxes", cap: (n) => `Moving day` },
  reuni: { place: "cafe", face: "joy", cap: (n) => `Reunion with old friends` },
  hobi_baru: { place: "home", face: "joy", cap: (n) => `Trying a new hobby` },
  pensiun: { place: "office", face: "calm", cap: (n) => `Last day before retiring` },
  main_sama_cucu: { place: "park", face: "joy", cap: (n) => `Playing with the grandkids` },
  kehilangan_sahabat: { place: "park", face: "sad", cap: (n, w) => `Saying goodbye to an old friend` },
  // achievements (from status.js) by id prefix
  "ach:first_job": { place: "office", face: "joy", cap: (n, w, l, a) => `Just got hired: ${a.label.replace(/^First job: /, "").replace(/\.$/, "")}` },
  "ach:promo_": { place: "office", face: "joy", cap: (n, w, l, a) => a.label.replace(/\.$/, "") },
  "ach:top_": { place: "office", face: "joy", cap: (n, w, l, a) => a.label.replace(/\.$/, "") },
  "ach:founded": { place: "office", face: "joy", cap: (n) => `Started a company` },
  "ach:house_": { place: "home", face: "joy", prop: "boxes", cap: (n, w, l, a) => a.label.replace(/\.$/, "") },
  "ach:prize_": { place: "plaza", face: "joy", cap: (n, w, l, a) => a.label.replace(/ \(beat .*\)/, "").replace(/\.$/, "") },
  "ach:car_": { place: "plaza", face: "joy", cap: (n, w, l, a) => a.label.replace(/\.$/, "") },
};
const PLACE_NAME = { home: "At home", school: "School", cafe: "The café", office: "Work", park: "The park", plaza: "Town Square" };
const PHASE_ORDER = ["bayi", "anak", "remaja", "dewasa", "tua"];
const ALBUM_KEY = "makhluk-kecil-3d-v2-album2", SEEN_KEY = "makhluk-kecil-3d-v2-album2-seen";
const albumLoad = () => { try { return JSON.parse(localStorage.getItem(ALBUM_KEY) || "[]"); } catch (e) { return []; } };
function albumSave(list) { for (let n = list.length; n >= 0; n--) { try { localStorage.setItem(ALBUM_KEY, JSON.stringify(list.slice(list.length - n))); return n === list.length; } catch (e) {} } return false; }
const seenLoad = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch (e) { return []; } };
const seenAdd = k => { const s = seenLoad(); s.push(k); try { localStorage.setItem(SEEN_KEY, JSON.stringify(s.slice(-400))); } catch (e) {} };
const albumOf = cid => albumLoad().filter(a => !cid || a.cid === cid);
function photoSpec(eid) { return PHOTO[eid] || (eid.startsWith("ach:") ? Object.entries(PHOTO).find(([k]) => k.startsWith("ach:") && eid.startsWith(k))?.[1] : null); }
// the people in a memory: whoever the day's event was about, or the partner, or the newborn
function peopleOf(l, eid) {
  const c = game.home.get(l.cid); if (!c) return [];
  const npc = (id, nama, rupa) => ({ id, nama, rupa: rupa || (game.home.world.npcs[id] || {}).rupa || null });
  if (eid === "kelahiran") return game.home.members.filter(m => m.born === l.day && m.parents.includes(l.cid)).slice(0, 2).map(m => ({ id: m.id, nama: m.name, rupa: m.rupa, baby: true }));
  if (l.who && l.who.length) return l.who.slice(0, 2).map(w => npc(w.id, w.nama, w.rupa));
  if (["kencan", "lamaran", "pernikahan", "jadian", "jadian_remaja", "putus"].includes(eid)) {
    const e = Object.entries(c.relations).find(([, r]) => ["pasangan", "tunangan", "suami-istri"].includes(r.tipe));
    if (e) return [npc(e[0], e[1].nama)];
  }
  if (eid === "main_sama_cucu") return game.home.members.filter(m => m.alive(l.day) && m.parents.some(p => game.home.members.some(k => k.id === p && k.parents.includes(l.cid)))).slice(0, 2).map(m => ({ id: m.id, nama: m.name, rupa: m.rupa, baby: true }));
  return [];
}
// today's memories nobody has kept or let go yet; once the day is over they are gone
let opsCache = [];
const refreshOps = () => { opsCache = photoOps(); };
function photoOps(d = game && today()) {
  if (!game || !feed) return [];
  const seen = new Set(seenLoad()), out = [];
  for (const l of feed) {
    if (l.day !== d) continue;
    const ids = [...l.events, ...(l.ach || []).map(a => "ach:" + a.id)];
    for (const eid of ids) {
      const sp = photoSpec(eid), key = `${l.cid}:${l.day}:${eid}`;
      if (!sp || seen.has(key) || out.some(o => o.key === key)) continue;
      const a = (l.ach || []).find(x => "ach:" + x.id === eid), who = peopleOf(l, eid);
      out.push({ key, eid, cid: l.cid, name: l.name, day: l.day, phase: l.phase, age: l.age, place: typeof sp.place === "function" ? sp.place(l) : sp.place, face: sp.face, prop: sp.prop, who,
        caption: sp.cap(l.name, who[0], l, a), line: ((l.lineAt && l.lineAt[eid]) || (a && a.label) || "").replace(/_/g, "") });
    }
  }
  return out;
}

// ---- the photo studio: a small set per place, the creature and whoever was there
let studio = null;
function studioScene() {
  if (studio) return studio;
  const sc = new THREE.Scene(); sc.environment = scene.environment;
  sc.add(new THREE.HemisphereLight(0xfff4e6, 0x7a6a5e, 0.45));
  const key = new THREE.DirectionalLight(0xffe9d2, 1.05); key.position.set(-4, 8, 7); sc.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.35); fill.position.set(5, 3, 4); sc.add(fill);
  studio = { sc, sets: {}, cam: new THREE.PerspectiveCamera(30, 0.8, 0.5, 100) };
  return studio;
}
const SM = (c, o) => M(c, Object.assign({ envMapIntensity: 0.3 }, o));
function buildSet(place) {
  const g = new THREE.Group(), floor = (c) => { const f = mesh(new THREE.PlaneGeometry(30, 20), SM(c, { roughness: 1 }), 0, 0, 0, g); f.rotation.x = -Math.PI / 2; };
  const wall = (c, z = -3.2) => mesh(new THREE.PlaneGeometry(30, 16), SM(c, { roughness: 1 }), 0, 6, z, g);
  const sky = (top, bot) => { const t = canvasTex((c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, 8, 256); mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: t }), 0, 7, -9, g); };
  const tree = (x, z, s = 1) => { mesh(CYL(0.16 * s, 0.22 * s, 1.6 * s), SM(0x8a6448), x, 0.8 * s, z, g); const c = mesh(SPH(1.1 * s, 20, 16), SM(0x7fa36a, { roughness: 1 }), x, 2.3 * s, z, g); c.scale.y = 0.9; };
  if (place === "home") {
    floor(0xc89f78); wall(0xf1e6d6);
    mesh(new THREE.PlaneGeometry(2.2, 1.6), SM(0xbcd3de, { roughness: 0.4 }), 2.6, 3.4, -3.15, g); mesh(RB(2.4, 1.8, 0.08, 0.04), SM(0xfaf6ef), 2.6, 3.4, -3.2, g);
    mesh(RB(1.1, 0.8, 0.05, 0.02), SM(0x9bb093), -2.6, 3.6, -3.15, g);
    mesh(CYL(0.35, 0.28, 0.6), SM(0xc2704f), -3.4, 0.3, -2.2, g); mesh(SPH(0.6, 16, 12), SM(0x6f9a5c, { roughness: 1 }), -3.4, 1.0, -2.2, g);
  } else if (place === "school") {
    floor(0xb79a7c); wall(0xdfe6d6);
    mesh(RB(5.4, 2.2, 0.08, 0.03), SM(0x3f5a49, { roughness: 0.9 }), 0, 3.6, -3.1, g); mesh(RB(5.6, 0.12, 0.2, 0.03), SM(0xa47a55), 0, 2.45, -3.0, g);
    const chalk = canvasTex((c, w, h) => { c.fillStyle = "#3f5a49"; c.fillRect(0, 0, w, h); c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 4; c.font = "bold 44px sans-serif"; c.fillStyle = "rgba(255,255,255,.8)"; c.fillText("A  B  C   1+2=3", 40, 90); c.beginPath(); c.arc(420, 160, 30, 0, 7); c.stroke(); }, 512, 210);
    mesh(new THREE.PlaneGeometry(5.2, 2.0), new THREE.MeshBasicMaterial({ map: chalk }), 0, 3.6, -3.05, g);
  } else if (place === "cafe") {
    floor(0x9c7356); wall(0xe9d5bd);
    mesh(RB(6, 1.3, 1.0, 0.06), SM(0x7a5a43), 0, 0.65, -2.6, g); mesh(RB(6.2, 0.1, 1.1, 0.03), SM(0xefe7dc), 0, 1.33, -2.6, g);
    mesh(RB(5.5, 0.08, 0.4, 0.02), SM(0xa47a55), 0, 3.4, -3.0, g);
    for (let i = 0; i < 6; i++) mesh(CYL(0.13, 0.11, 0.3), SM([0xf3ede4, 0xc2704f, 0x8fa287][i % 3]), -2.2 + i * 0.85, 3.6, -3.0, g);
    for (const x of [-2, 2]) { mesh(CYL(0.01, 0.01, 1.4, 6), SM(0x333333), x, 5.3, -1.6, g); mesh(SPH(0.22, 14, 10), M(0xfff1d6, { emissive: 0xffd9a0, emissiveIntensity: 0.8 }), x, 4.55, -1.6, g); }
  } else if (place === "office") {
    floor(0x9ea6ad); wall(0xe4e7ea);
    for (let i = 0; i < 2; i++) { mesh(new THREE.PlaneGeometry(2.0, 2.4), SM(0xcfe0ea, { roughness: 0.3 }), -2.6 + i * 5.2, 3.6, -3.15, g); for (let k = 0; k < 7; k++) mesh(RB(2.1, 0.06, 0.04, 0.01), SM(0xf6f6f4), -2.6 + i * 5.2, 2.5 + k * 0.33, -3.1, g); }
    mesh(RB(3.2, 0.12, 1.2, 0.03), SM(0xd9c4a5), 0, 1.15, -2.3, g); mesh(RB(0.9, 0.6, 0.06, 0.02), SM(0x2f3438), 0.7, 1.65, -2.5, g);
    mesh(CYL(0.3, 0.25, 0.5), SM(0xf3ede4), 3.3, 0.25, -2.1, g); mesh(SPH(0.5, 14, 10), SM(0x6f9a5c, { roughness: 1 }), 3.3, 0.85, -2.1, g);
  } else if (place === "park") {
    floor(0x8fb06f); sky("#bcd9ea", "#f2ead8");
    tree(-3.6, -3.5, 1.2); tree(3.8, -4.5, 1.4); tree(1.2, -7, 1.1);
    mesh(RB(2.4, 0.12, 0.6, 0.03), SM(0xa47a55), -2.6, 0.75, -1.4, g); for (const x of [-3.6, -1.6]) mesh(RB(0.1, 0.75, 0.5, 0.02), SM(0x4a4a4a), x, 0.37, -1.4, g);
  } else {
    floor(0xd6cbbd); sky("#c8ddea", "#f3eadb");
    mesh(CYL(1.6, 1.8, 0.6, 32), SM(0xcfc5b8), -3.2, 0.3, -4, g); mesh(CYL(0.25, 0.3, 1.6, 16), SM(0xcfc5b8), -3.2, 1.1, -4, g);
    mesh(RB(1.4, 5, 1.4, 0.05), SM(0xe2d6c4), 3.6, 2.5, -6, g); mesh(CYL(0.55, 0.55, 0.06, 32), SM(0xfaf6ef), 3.6, 4.1, -5.28, g).rotation.x = Math.PI / 2;
    for (let i = 0; i < 9; i++) { const f = mesh(new THREE.ConeGeometry(0.18, 0.4, 3), SM([0xc2704f, 0xd4a853, 0x8fa287, 0x7e9cb3][i % 4]), -4 + i * 1, 5.1 - Math.sin(i / 8 * Math.PI) * 0.5, -2.5, g); f.rotation.x = Math.PI; }
  }
  return g;
}
function addProp(g, prop, parts) {
  if (prop === "cake") { mesh(CYL(0.55, 0.55, 0.45, 28), SM(0xf6efe6), 0, 0.23, 1.6, g); mesh(CYL(0.4, 0.4, 0.3, 28), SM(0xe9b8b0), 0, 0.6, 1.6, g); mesh(CYL(0.03, 0.03, 0.28, 8), SM(0xfaf6ef), 0, 0.89, 1.6, g); mesh(SPH(0.06, 10, 8), M(0xffd27a, { emissive: 0xffb347, emissiveIntensity: 1.2 }), 0, 1.07, 1.6, g); }
  if (prop === "balloons") [[-2.4, 3.9, 0xc2704f], [-1.9, 4.4, 0xd4a853], [-2.9, 4.5, 0x7e9cb3]].forEach(([x, y, c]) => { mesh(SPH(0.4, 20, 16), SM(c, { roughness: 0.4 }), x, y, -1, g).scale.y = 1.15; mesh(CYL(0.01, 0.01, y - 0.5, 4), SM(0x777777), x, (y - 0.5) / 2, -1, g); });
  if (prop === "arch") { mesh(new THREE.TorusGeometry(2.6, 0.09, 8, 40, Math.PI), SM(0xf6efe6), 0, 0, -1.6, g); for (let i = 0; i <= 14; i++) { const t = i / 14 * Math.PI; mesh(SPH(0.2, 12, 10), SM([0xe9b8b0, 0xfaf6ef, 0xd4a853][i % 3]), Math.cos(t) * 2.6, Math.sin(t) * 2.6, -1.5, g); } }
  if (prop === "boxes") [[2.6, 0.4, -0.6, 0.8], [2.9, 1.1, -0.7, 0.6], [-2.8, 0.35, -0.4, 0.7]].forEach(([x, y, z, s]) => mesh(RB(s, s * 0.9, s, 0.03), SM(0xc9a27a), x, y, z, g));
  if (prop === "cap" && parts) { const c = new THREE.Group(); c.position.set(0, 2.42, 0.1); c.rotation.z = -0.12; parts.body.add(c); mesh(CYL(0.42, 0.45, 0.25, 24), SM(0x2f3438), 0, 0, 0, c); mesh(RB(1.1, 0.06, 1.1, 0.02), SM(0x2f3438), 0, 0.15, 0, c).rotation.y = 0.6; mesh(CYL(0.012, 0.012, 0.5, 6), SM(0xd4a853), 0.5, -0.05, 0.2, c); }
}
// pose a built creature for the picture
function faceFor(p, face) {
  p.eyes.forEach((e, i) => { const shut = face === "joy"; e.userData.arc.visible = shut; p.pupils[i].visible = !shut; e.scale.set(face === "surprise" ? 1.2 : 1, face === "sad" ? 0.7 : face === "surprise" ? 1.25 : 1, 1); });
  p.smile.rotation.z = face === "sad" ? 0 : Math.PI; p.smile.visible = face !== "surprise";
  if (face === "surprise") p.mouth.scale.y = 0.3;
  p.ears.forEach(e => { e.rotation.z = e.userData.rz0 - e.userData.sx * (face === "sad" ? 0.5 : 0); e.rotation.x = face === "sad" ? -0.5 : face === "joy" ? 0.15 : 0; });
  p.arms.forEach(a => a.rotation.z = a.userData.sx * (0.4 + (face === "joy" ? 0.8 : 0)));
  p.tail.rotation.z = face === "joy" ? 0.12 : 0; p.tail.rotation.x = face === "sad" ? -0.35 : 0;
  p.dirt.forEach(d => d.visible = false);
}
const rupaFor = w => w.rupa || (() => { const r = seed_rngish(w.nama || w.id); return { warna: ["krem", "abu", "oranye", "biru muda", "hitam", "pink pucat"][r % 6], telinga: ["bulat", "lancip", "panjang terkulai"][(r >> 4) % 3], pola: ["polos", "totol", "belang", "bintik pipi"][(r >> 8) % 4] }; })();
const seed_rngish = s => hashStr("rupa:" + s);
function renderPhoto(op) {
  const st = studioScene();
  const set = st.sets[op.place] || (st.sets[op.place] = buildSet(op.place));
  const g = new THREE.Group(); g.add(set); st.sc.add(g);
  const me = game.home.get(op.cid), meM = member(op.cid);
  const phase = op.phase || (meM && meM.fase) || "dewasa", people = op.who || [];
  const subj = makeCreature({ id: op.cid, fase: phase, rupa: (meM && meM.rupa) || me.rupa }, g);
  const xs = people.length ? (people.length === 1 ? [-1.65, 1.7] : [0, -2.6, 2.6]) : [0];
  subj.root.position.x = xs[0]; subj.root.scale.setScalar(PHASE_SCALE[phase] || 1); subj.root.rotation.y = people.length ? 0.25 : 0;
  faceFor(subj, op.face); addProp(g, op.prop, subj);
  const blobs = [];
  people.forEach((w, i) => {
    const p = makeCreature({ id: "foto-" + w.id, fase: w.baby ? "bayi" : phase === "tua" ? "tua" : "dewasa", rupa: rupaFor(w) }, g);
    p.root.position.set(xs[i + 1], 0, -0.2); p.root.scale.setScalar(w.baby ? 0.62 : PHASE_SCALE[phase] || 1); p.root.rotation.y = xs[i + 1] > 0 ? -0.3 : 0.3;
    faceFor(p, op.face === "sad" ? "calm" : op.face); blobs.push(p.root.position.x);
  });
  [xs[0], ...blobs].forEach(x => { const b = mesh(new THREE.PlaneGeometry(2.8, 2.8), F(0xffffff, { map: blobTex, transparent: true, depthWrite: false }), x, 0.02, 0, g); b.rotation.x = -Math.PI / 2; });
  const wide = people.length > 1 ? 1.5 : people.length ? 1.32 : 1;
  st.cam.position.set(0, 2.4 * wide, 9.6 * wide); st.cam.lookAt(0, 1.45, 0); st.cam.updateProjectionMatrix();
  // render into a corner of the main canvas, copy it out, put the canvas back as it was
  const pr = renderer.getPixelRatio(), Wd = 360, Hd = 450, size = renderer.getSize(new THREE.Vector2());
  renderer.setScissorTest(true); renderer.setViewport(0, 0, Wd / pr, Hd / pr); renderer.setScissor(0, 0, Wd / pr, Hd / pr);
  renderer.setClearColor(0xefe6da, 1); renderer.clear(); renderer.render(st.sc, st.cam);
  const out = document.createElement("canvas"); out.width = Wd; out.height = Hd;
  out.getContext("2d").drawImage(canvas, 0, canvas.height - Hd, Wd, Hd, 0, 0, Wd, Hd);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, size.x, size.y); renderer.setClearColor(0x000000, 0);
  st.sc.remove(g); g.remove(set);
  return out.toDataURL("image/jpeg", 0.8);
}
function showPhotoOp(op) {
  if (!op) return;
  const img = renderPhoto(op);
  openSheet("photo", `
    <span class="ribbon">A MOMENT · ${esc(PLACE_NAME[op.place].toUpperCase())}</span>
    <div class="polaroid"><img src="${img}" alt="${esc(op.caption)}"><div class="cap">${esc(op.caption)}</div><small>${esc(fmtDate(op.day))} · ${esc(fmtAge(op.age))} old${op.who.length ? " · with " + esc(op.who.map(w => w.nama).join(" & ")) : ""}</small></div>
    <p>${md(op.line)}</p>
    <p class="sub">Keep it in the album, or let it go. Moments you don't keep are gone after today.</p>
    <div class="row2"><button class="big" id="keepIt">Keep it</button><button class="close" id="letGo">Let it go</button></div>`);
  $("keepIt").onclick = () => {
    const f = $("flash"); f.classList.add("on"); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove("on")));
    const list = albumLoad(); list.push({ key: op.key, eid: op.eid, cid: op.cid, name: op.name, day: op.day, age: op.age, phase: op.phase, place: op.place, caption: op.caption, line: op.line, who: op.who.map(w => ({ id: w.id, nama: w.nama })), img });
    const ok = albumSave(list); seenAdd(op.key); refreshOps(); joyUntil = now() + 2000;
    if (!ok) story(op.name, "The album on this device is full, so the oldest photos made room.", false);
    opsCache.length ? showPhotoOp(opsCache[0]) : showAlbum(op.cid);
  };
  $("letGo").onclick = () => { seenAdd(op.key); refreshOps(); const n = opsCache[0]; n ? showPhotoOp(n) : closeSheet(); };
}
function showPhoto(a, back) {
  openSheet("photo", `
    <span class="ribbon" style="background: var(--plum)">${esc((PHASE_EN[a.phase] || "").toUpperCase())} · ${esc(PLACE_NAME[a.place].toUpperCase())}</span>
    <div class="polaroid"><img src="${a.img}" alt="${esc(a.caption)}"><div class="cap">${esc(a.caption)}</div><small>${esc(fmtDate(a.day))} · ${esc(fmtAge(a.age))} old${a.who.length ? " · with " + esc(a.who.map(w => w.nama).join(" & ")) : ""}</small></div>
    <p>${md(a.line)}</p>
    <button class="close" id="backAlbum">Back</button>`);
  $("backAlbum").onclick = back;
}
let albumTab = "life";
function showAlbum(cid = cur && cur.id, tab = albumTab) {
  albumTab = tab; Tele.layar("app", "album:" + tab);
  const all = albumOf(cid).sort((a, b) => a.day - b.day), who = member(cid), nm = who ? who.nama : "Family";
  const tile = a => `<button data-k="${esc(a.key)}"><img src="${a.img}" alt=""><span>${esc(a.caption)}</span></button>`;
  let body = "";
  if (!all.length) body = `<p>No photos yet. When something worth remembering happens, a camera shows up next to ${esc(nm)}. Meeting someone, a first day, a new job.</p>`;
  else if (tab === "life") body = PHASE_ORDER.filter(ph => all.some(a => a.phase === ph)).map(ph => `<h3 class="chapter">${esc(PHASE_EN[ph])}</h3><div class="album">${all.filter(a => a.phase === ph).map(tile).join("")}</div>`).join("");
  else {
    const names = [...new Set(all.flatMap(a => a.who.map(w => w.nama)))];
    body = names.length ? names.map(n => { const ps = all.filter(a => a.who.some(w => w.nama === n)); return `<h3 class="chapter">${esc(n)} <small class="sub">· ${ps.length} photo${ps.length > 1 ? "s" : ""} since ${esc(fmtDate(ps[0].day))}</small></h3><div class="album">${ps.map(tile).join("")}</div>`; }).join("")
      : `<p>No photos with anyone yet.</p>`;
  }
  openSheet("album", `
    <span class="ribbon" style="background: var(--plum)">${esc(nm.toUpperCase())}'S ALBUM · ${all.length} PHOTO${all.length === 1 ? "" : "S"}</span>
    <div class="tabs"><button class="chip" aria-pressed="${tab === "life"}" data-tab="life">Life</button><button class="chip" aria-pressed="${tab === "people"}" data-tab="people">People</button></div>
    ${body}
    <p class="sub">Photos are kept on this device for now.</p>
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => showAlbum(cid, b.dataset.tab));
  sheet.querySelectorAll("[data-k]").forEach(b => b.onclick = () => showPhoto(all.find(a => a.key === b.dataset.k), () => showAlbum(cid, tab)));
  sheet.querySelector("[data-close]").onclick = closeSheet;
}
// coming back after a few hours: it notices you and is happy to see you
function greetIfMissed() {
  backupNag();
  let last = 0; try { last = +localStorage.getItem(SAVE_KEY + "-opened") || 0; localStorage.setItem(SAVE_KEY + "-opened", Date.now()); } catch (e) {}
  if (!last || Date.now() - last < 6 * 3600e3 || !cur || cur.fase === "meninggal" || cur.fase === "merantau") return;
  setTimeout(() => { surpriseUntil = now() + 400; joyUntil = now() + 3200; play("jump", 800); say(["You're back!", "There you are!", "I missed you!"][Math.floor(Math.random() * 3)], 2200); burst(["♥"], 6); }, 900);
}
function drainNoon() { const L = game.noon_logs || []; game.noon_logs = []; if (L.length) feed.push(...L); }
function tick() {
  if (!game) return;
  refreshOps();
  const t = liveDay(), visible = document.visibilityState === "visible";
  if (visible) game.mark_attended(t);
  let p = game.pending;
  if (p && t > p.day + p.window) { game.answer(p.key, "lewat", 0); p = null; if (alertEl) { alertEl.remove(); alertEl = null; } }
  const before = game.home.last_day;
  game.half_now = careHalfNow();
  if (!game.pending) {
    const logs = game.advance(t, t);
    if (game.half_now && !game.pending) logs.push(...game.noon(t));
    if (globalThis.Net && game.home.last_day !== before) Net.sync();
    logs.push(...(game.noon_logs || [])); game.noon_logs = [];
    if (logs.length) {
      feed.push(...logs); if (feed.length > 3000) feed = feed.slice(-2000);
      if (visible) for (const l of logs) if (l.events.some(e => e.startsWith("keinginan_"))) { const c = game.home.get(l.cid); for (const r of (c ? Wants.recent(c, l.day) : [])) { const key = `${l.cid}|${r[0]}|${r[1]}|${r[2]}`; if (!twSeen.has(key)) { twSeen.add(key); Tele.ev("keinginan", { a: r[2], k: r[1], fase: l.phase }); } } }
      // momen greget (moments.js) dicatat buat telemetry: nanti dilihat apa pemain lebih lama di app atau balik besoknya sesudah momen jenis ini
      if (visible) for (const l of logs) for (const m of Moments.detect(l)) Tele.ev("momen", { k: m.kind, tag: m.tag, i: m.i, fase: l.phase });
      for (const l of logs) {
        const big = l.dramas.includes("besar") || l.events.some(e => ["akhir_hidup", "pulang_kampung", "telur_warisan"].includes(e));
        if (big || l.dramas.includes("sedang")) story(l.name, l.lines.join(" "), big);
      }
    }
  }
  if (visible) state.dilihat = Math.max(state.dilihat, game.home.last_day);
  save();
  if (game.home.last_day !== before || !cur) refresh(); else { drawHud(); careUi(); }
  $("dayBar").style.width = `${Math.min(100, (dayFloat() - Math.floor(dayFloat())) * 100)}%`;
  if (!sheetKind && !PH && !game.pending) { const r = nextUnseenResult(); if (r) { markSeen(r); showResult(r); } }
  if (sheetKind === "dilemma" && game.pending) { const cd = countdownText(game.pending); $("cdBar").style.width = cd.frac * 100 + "%"; $("cdText").textContent = cd.text; }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { Tele.resume(); tick(); } else Tele.pause(); });
addEventListener("pagehide", () => Tele.end("tutup"));
addEventListener("error", e => Tele.teknis("error", { msg: String(e.message || "").slice(0, 120), src: String(e.filename || "").split("/").pop().slice(0, 30), baris: e.lineno || 0 }));


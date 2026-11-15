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
  // v45: tonggak berjendela (tonggak.js)
  kenal_nama: { place: "home", face: "surprise", cap: (n) => `${n} knows their own name` },
  gigi_pertama: { place: "home", face: "surprise", cap: (n) => `${n}'s first tooth` },
  makan_padat: { place: "home", face: "joy", cap: (n) => `${n}'s first real food` },
  benda_kesayangan: { place: "home", face: "calm", cap: (n) => `${n} and their favourite thing` },
  merangkak: { place: "home", face: "joy", cap: (n) => `${n} started crawling` },
  berdiri: { place: "home", face: "surprise", cap: (n) => `${n} stood up for the first time` },
  potong_rambut: { place: "home", face: "calm", cap: (n) => `${n}'s first haircut` },
  kalimat_pertama: { place: "home", face: "joy", cap: (n) => `${n}'s first sentence` },
  lompat_pertama: { place: "home", face: "joy", cap: (n) => `${n}'s first jump` },
  kasur_sendiri: { place: "home", face: "calm", cap: (n) => `${n}'s first night in a real bed` },
  // v45.1: orang di fase bayi (tonggak.js)
  tetangga_nengok: { place: "home", face: "surprise", cap: (n, w) => `${W_(w, "The neighbour")} came by to meet ${n}` },
  bayi_lain: { place: "park", face: "joy", cap: (n, w) => `${n} met ${W_(w, "another baby")} at the park` },
  // v46: fase anak (anak.js): tonggak, sahabat, pentas
  gigi_copot: { place: "home", face: "joy", cap: (n) => `${n}'s first tooth out` },
  baca_sendiri: { place: "home", face: "calm", cap: (n) => `${n} read a whole book alone` },
  naik_sepeda: { place: "park", face: "joy", cap: (n) => `${n} rode a bike, no stabilisers` },
  berenang: { place: "park", face: "joy", cap: (n) => `${n}'s first swim` },
  nginep: { place: "home", face: "joy", cap: (n) => `${n}'s first sleepover` },
  sekolah_sendiri: { place: "school", face: "joy", cap: (n) => `${n} walked to school alone` },
  garis_pintu: { place: "home", face: "calm", cap: (n) => `${n} at the door frame` },
  sahabat_kenal: { place: "school", face: "joy", cap: (n, w) => `Best friends: ${n} and ${W_(w)}` },
  sahabat_pindah: { place: "park", face: "sad", cap: (n, w) => `Saying goodbye to ${W_(w)}` },
  sahabat_baru: { place: "school", face: "joy", cap: (n, w) => `A new best friend: ${W_(w)}` },
  pentas_sekolah: { place: "school", face: "joy", cap: (n) => `${n} at the school show` },
  // v46.1: field trip, liburan, lomba kota (anak.js)
  field_trip: { place: "park", face: "joy", cap: (n) => `${n} on the class trip, sand in every pocket` },
  liburan_pulang: { place: "park", face: "calm", cap: (n) => `${n}'s week off, last day` },
  lomba_kota: { place: "plaza", face: "joy", cap: (n) => `${n} at the city contest` },
  // v47: fase remaja (remaja.js): SMP, study tour, tonggak remaja, hasil ujian, pesta kelulusan
  smp_hari_pertama: { place: "school", face: "surprise", cap: (n) => `First day of middle school` },
  study_tour_pulang: { place: "park", face: "joy", cap: (n) => `${n} on the study tour, day three` },
  suara_berubah: { place: "home", face: "surprise", cap: (n) => `${n}, suddenly taller` },
  hobi_sendiri: { place: "home", face: "joy", cap: (n) => `${n} and the new hobby` },
  gaya_sendiri: { place: "home", face: "calm", cap: (n) => `${n}'s new look` },
  kota_sendiri: { place: "plaza", face: "joy", cap: (n) => `${n}'s first trip into town alone` },
  beli_pertama: { place: "plaza", face: "joy", cap: (n) => `The first thing ${n} bought with their own money` },
  pengumuman_lulus: { place: "school", face: "joy", prop: "cap", cap: (n) => `Results day` },
  pesta_kelulusan: { place: "school", face: "joy", prop: "balloons", cap: (n) => `The leavers' party` },
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
  const hemi = new THREE.HemisphereLight(0xfff4e6, 0x7a6a5e, 0.45); sc.add(hemi);
  const key = new THREE.DirectionalLight(0xffe9d2, 1.05); key.position.set(-4, 8, 7); sc.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.35); fill.position.set(5, 3, 4); sc.add(fill);
  // the magazine shares this studio: photos change the light for one picture and put it back (studioLight(null))
  const lamp = new THREE.PointLight(0xffc68a, 0, 14, 1.6); lamp.position.set(-3.2, 4.6, 1.5); sc.add(lamp);
  studio = { sc, sets: {}, cam: new THREE.PerspectiveCamera(30, 0.8, 0.5, 100), hemi, key, fill, lamp };
  return studio;
}
const SM = (c, o) => M(c, Object.assign({ envMapIntensity: 0.3 }, o));
function buildSet(place) {
  const g = new THREE.Group(), floor = (c) => { const f = mesh(new THREE.PlaneGeometry(30, 20), SM(c, { roughness: 1 }), 0, 0, 0, g); f.rotation.x = -Math.PI / 2; g.userData.floor = f.material; f.material.userData.c0 = f.material.color.clone(); };
  const wall = (c, z = -3.2) => mesh(new THREE.PlaneGeometry(30, 16), SM(c, { roughness: 1 }), 0, 6, z, g);
  // a window on an indoor wall: the sky in it is that day's sky (time and weather)
  const pane = (x, y, w, h) => { const m = new THREE.MeshBasicMaterial({ color: 0xffffff }); mesh(RB(w + 0.24, h + 0.24, 0.08, 0.03), SM(0xf3ede4), x, y, -3.18, g); mesh(new THREE.PlaneGeometry(w, h), m, x, y, -3.12, g); (g.userData.panes ||= []).push(m); };
  const sky = (top, bot) => { const t = canvasTex((c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, 8, 256); g.userData.sky = mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: t }), 0, 7, -9, g).material; g.userData.out = true; };
  const tree = (x, z, s = 1) => { mesh(CYL(0.16 * s, 0.22 * s, 1.6 * s), SM(0x8a6448), x, 0.8 * s, z, g); const c = mesh(SPH(1.1 * s, 20, 16), SM(0x7fa36a, { roughness: 1 }), x, 2.3 * s, z, g); c.scale.y = 0.9; };
  if (place === "home") {
    floor(0xc89f78); wall(0xf1e6d6);
    pane(2.6, 3.4, 2.2, 1.6);
    mesh(RB(1.1, 0.8, 0.05, 0.02), SM(0x9bb093), -2.6, 3.6, -3.15, g);
    mesh(CYL(0.35, 0.28, 0.6), SM(0xc2704f), -3.4, 0.3, -2.2, g); mesh(SPH(0.6, 16, 12), SM(0x6f9a5c, { roughness: 1 }), -3.4, 1.0, -2.2, g);
  } else if (place === "school") {
    floor(0xb79a7c); wall(0xdfe6d6); pane(-4.6, 3.6, 1.6, 2.0); pane(4.6, 3.6, 1.6, 2.0);
    mesh(RB(5.4, 2.2, 0.08, 0.03), SM(0x3f5a49, { roughness: 0.9 }), 0, 3.6, -3.1, g); mesh(RB(5.6, 0.12, 0.2, 0.03), SM(0xa47a55), 0, 2.45, -3.0, g);
    const chalk = canvasTex((c, w, h) => { c.fillStyle = "#3f5a49"; c.fillRect(0, 0, w, h); c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 4; c.font = "bold 44px sans-serif"; c.fillStyle = "rgba(255,255,255,.8)"; c.fillText("A  B  C   1+2=3", 40, 90); c.beginPath(); c.arc(420, 160, 30, 0, 7); c.stroke(); }, 512, 210);
    mesh(new THREE.PlaneGeometry(5.2, 2.0), new THREE.MeshBasicMaterial({ map: chalk }), 0, 3.6, -3.05, g);
  } else if (place === "cafe") {
    floor(0x9c7356); wall(0xe9d5bd); pane(-4.8, 3.3, 2.0, 2.2); pane(4.8, 3.3, 2.0, 2.2);
    mesh(RB(6, 1.3, 1.0, 0.06), SM(0x7a5a43), 0, 0.65, -2.6, g); mesh(RB(6.2, 0.1, 1.1, 0.03), SM(0xefe7dc), 0, 1.33, -2.6, g);
    mesh(RB(5.5, 0.08, 0.4, 0.02), SM(0xa47a55), 0, 3.4, -3.0, g);
    for (let i = 0; i < 6; i++) mesh(CYL(0.13, 0.11, 0.3), SM([0xf3ede4, 0xc2704f, 0x8fa287][i % 3]), -2.2 + i * 0.85, 3.6, -3.0, g);
    for (const x of [-2, 2]) { mesh(CYL(0.01, 0.01, 1.4, 6), SM(0x333333), x, 5.3, -1.6, g); mesh(SPH(0.22, 14, 10), M(0xfff1d6, { emissive: 0xffd9a0, emissiveIntensity: 0.8 }), x, 4.55, -1.6, g); }
  } else if (place === "office") {
    floor(0x9ea6ad); wall(0xe4e7ea);
    for (let i = 0; i < 2; i++) { pane(-2.6 + i * 5.2, 3.6, 2.0, 2.4); for (let k = 0; k < 7; k++) mesh(RB(2.1, 0.06, 0.04, 0.01), SM(0xf6f6f4), -2.6 + i * 5.2, 2.5 + k * 0.33, -3.1, g); }
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
// pose a built creature for the picture. mood (photos only): how it really was that day, so a dirty, tired or sick day shows
function faceFor(p, face, mood) {
  const md = mood || {}, low = md.sick || md.tired;
  if (low && face === "joy") face = "calm";   // a tired smile, not the big closed-eye grin
  p.eyes.forEach((e, i) => { const shut = face === "joy" || md.blink; e.userData.arc.visible = face === "joy" && !md.blink; p.pupils[i].visible = !shut; e.scale.set(face === "surprise" ? 1.2 : 1, md.blink ? 0.12 : md.tired ? 0.42 : md.sick ? 0.6 : face === "sad" ? 0.7 : face === "surprise" ? 1.25 : 1, 1); });
  if (md.glance) p.pupils.forEach(q => { q.position.x = md.glance * 0.05; q.position.y = 0.02; });
  p.smile.rotation.z = face === "sad" ? 0 : Math.PI; p.smile.visible = face !== "surprise";
  if (face === "surprise") p.mouth.scale.y = 0.3;
  const droop = face === "sad" || low;
  p.ears.forEach(e => { e.rotation.z = e.userData.rz0 - e.userData.sx * (droop ? 0.45 : 0); e.rotation.x = droop ? -0.45 : face === "joy" ? 0.15 : 0; });
  p.arms.forEach(a => a.rotation.z = a.userData.sx * (0.4 + (face === "joy" ? 0.8 : 0)));
  p.tail.rotation.z = face === "joy" ? 0.12 : 0; p.tail.rotation.x = droop ? -0.35 : 0;
  if (low) p.body.rotation.x = 0.12;   // slumped a little
  if (md.sick) p.cheeks.forEach(c => { c.material = c.material.clone(); c.material.opacity = 0.85; c.material.color.setHex(0xd8564f).convertSRGBToLinear(); });
  const dirty = md.dirty || 0;
  p.dirtMat.opacity = dirty; p.dirt.forEach(d => d.visible = dirty > 0.02);
}
const rupaFor = w => w.rupa || (() => { const r = seed_rngish(w.nama || w.id); return { warna: ["krem", "abu", "oranye", "biru muda", "hitam", "pink pucat"][r % 6], telinga: ["bulat", "lancip", "panjang terkulai"][(r >> 4) % 3], pola: ["polos", "totol", "belang", "bintik pipi"][(r >> 8) % 4] }; })();
const seed_rngish = s => hashStr("rupa:" + s);
// ---- a real photo of a real day (v91). Old photos came out of one studio per place: same light, same pose, every family the
// same picture. Now a photo is taken where it happened and how it was: at home it is the family's own room from their floor
// plan (furniture, paint, lamps, the sky in the window), outside it is the place in that hour's light and weather; the creature
// wears what it wears that day and looks how it is (dirty, tired, sick). The framing is candid and comes from the day itself
// (seed = the memory), so the same memory always gives the same pictures and two families never get the same one.
const SICK_EV = new Set(["demam", "sakit_parah", "sakit_tua", "anak_sakit_malam", "ruam_popok", "gigi_rewel", "pilek_pertama"]);
const PERIOD_EN = { morning: "morning", day: "afternoon", evening: "evening", night: "night" };
const WX_EN = { cloud: "cloudy", rain: "rainy", snow: "snowy", fog: "foggy", storm: "stormy" };
// where at home: the room the memory belongs in (own bedroom, the kitchen, the bathroom...), else wherever it is right now
const PHOTO_ROOM = { malam_pertama: "tidur", kasur_sendiri: "tidur", kelahiran: "tidur", nginep: "tidur", kenal_nama: "tidur", makan_padat: "makan", warisan_resep: "makan", ulang_tahun: "makan",
  potong_rambut: "mandi", gigi_pertama: "mandi", gigi_copot: "mandi", baca_sendiri: ["kerja", "tamu"], memoar_selesai: ["kerja", "tamu"], hobi_baru: ["peluk", "tamu"], hobi_sendiri: ["peluk", "kerja"],
  pesta_pertama: ["tamu", "peluk"], tetangga_nengok: ["tamu", "peluk"], benda_kesayangan: ["peluk", "tidur"], merangkak: ["peluk", "tamu"], langkah_pertama: ["peluk", "tamu"], berdiri: ["peluk", "tamu"], garis_pintu: ["tamu", "peluk"],
  pindah_rumah: ["tamu", "peluk"], "ach:house_": ["tamu", "peluk"] };
const CARE_OF = { tidur: "tidur", makan: "makan_p", mandi: "mandi" };
function photoRoomIx(op, rnd) {
  const want = PHOTO_ROOM[op.eid] || (op.eid.startsWith("ach:house_") ? PHOTO_ROOM["ach:house_"] : null);
  for (const t of [].concat(want || [])) {
    if (CARE_OF[t] && cur && cur.id === op.cid) { const k = careRoomOf(CARE_OF[t]); if (ROOMS[k] && ROOMS[k].t === t) return k; }
    const k = ROOMS.findIndex(r => r.t === t); if (k >= 0) return k;
  }
  if (cur && cur.id === op.cid && ROOMS[roomIx] && !ROOMS[roomIx].yard) return roomIx;
  const inside = ROOMS.map((r, k) => r.yard ? -1 : k).filter(k => k >= 0);
  return inside.length ? inside[Math.floor(rnd() * inside.length)] : 0;
}
const photoRng = key => { let h = hashStr("foto:" + key) || 1; return () => (h = Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9 >>> 0, ((h ^ (h >>> 13)) >>> 0) / 4294967296); };
// the day as it was when the photo was taken: hour, weather, and the creature's own state
function photoMood(op) {
  const m = member(op.cid), n = (m && m.needs) || {}, c = game.home.get(op.cid);
  const sick = feed.some(l => l.cid === op.cid && l.day <= op.day && l.day >= op.day - 1 && l.events.some(e => SICK_EV.has(e))) || !!(c && c.stats && c.stats.kesehatan != null && c.stats.kesehatan < 25);
  return { period: litName || periodOf(), wx: typeof WX === "string" && WX !== "clear" ? WX : null, dirty: Math.max(0, (60 - (n.kebersihan ?? 100)) / 60),
    tired: (n.energi ?? 100) < 28, sick, low: (n.mood ?? 80) < 30 };
}
// 1 to 3 shots: big days (someone with you, a cake, a ring) get three, the rest one or two; the first is always the middle shot
function photoPlan(op, rnd) {
  const n = op.who.length || op.prop ? 3 : 1 + (rnd() < 0.55 ? 1 : 0), rest = rnd() < 0.5 ? ["wide", "close"] : ["close", "wide"];
  return ["mid", ...rest].slice(0, n);
}
// candid framing: never dead center, the camera a little to one side and a little tilted, sometimes looking somewhere else
function photoFrame(kind, rnd, sz, crowd) {
  const side = rnd() < 0.5 ? -1 : 1, F = { mid: [11, 2.2, 3.6, 1.3], wide: [16, 3.8, 6, 1.6], close: [9, 1.7, 2.6, 1.3] }[kind];
  return { dist: F[0] * sz * crowd * (0.92 + rnd() * 0.16), camY: (F[1] + rnd() * (F[2] - F[1])) * Math.max(0.75, sz), lookY: F[3] * sz,
    yaw: side * (0.08 + rnd() * (kind === "wide" ? 0.42 : 0.32)), third: -side * (kind === "close" ? 0.02 : 0.03 + rnd() * 0.035), roll: (rnd() - 0.5) * 0.07,
    glance: rnd() < 0.3 ? (rnd() < 0.5 ? -1 : 1) : 0, blink: kind !== "mid" && rnd() < 0.14, hop: kind !== "mid" && rnd() < 0.3 };
}
// the cast of one photo: the creature (and whoever was there) in their clothes, posed and dressed for the weather outside
function photoCast(g, op, mood, inRoom) {
  const me = game.home.get(op.cid), meM = member(op.cid), phase = op.phase || (meM && meM.fase) || "dewasa", people = op.who || [];
  const k = inRoom ? PET : 1, cast = [];
  const subj = makeCreature({ id: op.cid, fase: phase, rupa: (meM && meM.rupa) || me.rupa }, g);
  subj.root.scale.setScalar((PHASE_SCALE[phase] || 1) * k); cast.push({ p: subj, me: true });
  const gap = 3.35 * k * (PHASE_SCALE[phase] || 1);
  const xs = people.length ? (people.length === 1 ? [-gap / 2, gap / 2] : [0, -gap * 0.78, gap * 0.78]) : [0];
  subj.root.position.x = xs[0];
  people.forEach((w, i) => {
    const p = makeCreature({ id: "foto-" + w.id, fase: w.baby ? "bayi" : phase === "tua" ? "tua" : "dewasa", rupa: rupaFor(w) }, g);
    p.root.position.set(xs[i + 1], 0, -0.25 * k); p.root.scale.setScalar((w.baby ? 0.62 : PHASE_SCALE[phase] || 1) * k); cast.push({ p, x: xs[i + 1] });
  });
  // outside in the rain: an umbrella (unless the closet already gave one); snow: a scarf if the neck is bare
  if (!inRoom && PHOTO_OUT(op.place)) {
    const has = sh => wornOf({ id: op.cid, gear: [] }).some(([, x]) => x && x.look && x.look.shape === sh);
    if ((mood.wx === "rain" || mood.wx === "storm") && !has("umbrella")) wearItem("x", { look: { shape: "umbrella", color: 0x3f5a6b } }, { body: subj.body });
    if (mood.wx === "snow" && !has("scarf")) wearItem("x", { look: { shape: "scarf", color: 0xb5524a } }, { body: subj.body });
  }
  for (const c of cast) { const b = mesh(new THREE.PlaneGeometry(2.8 * k, 2.8 * k), F(0xffffff, { map: blobTex, transparent: true, depthWrite: false }), c.p.root.position.x, 0.02, c.p.root.position.z, g); b.rotation.x = -Math.PI / 2; c.blob = b; }
  return { cast, subj, phase, sz: (PHASE_SCALE[phase] || 1) * k, crowd: people.length > 1 ? 1.45 : people.length ? 1.25 : 1 };
}
// free what one photo built (the body and tail-base geometry are shared with the creature on screen, so they stay)
function photoFree(g) { g.traverse(n => { if (n.geometry && n.geometry !== BODY_GEO && n.geometry !== TAIL_BASE) n.geometry.dispose(); const ms = n.material ? [].concat(n.material) : []; for (const m of ms) m.dispose(); }); if (g.parent) g.parent.remove(g); }
const PHOTO_OUT = place => place === "park" || place === "plaza";
// pose for one shot: everyone turns toward the camera (or away, candid), the subject may be mid-hop or mid-blink
function photoPose(C, op, mood, fr, cam) {
  C.cast.forEach(({ p, me }) => {
    const toCam = Math.atan2(cam.x - p.root.position.x, cam.z - p.root.position.z), away = me && fr.glance ? fr.glance * 0.75 : 0;
    p.root.rotation.y = toCam + away + (me ? 0 : (p.root.position.x > 0 ? -0.35 : 0.35));
    p.root.position.y = me && fr.hop && op.face === "joy" && !mood.tired && !mood.sick ? 0.35 * C.sz : 0;
    faceFor(p, me ? op.face : op.face === "sad" ? "calm" : op.face, me ? { dirty: mood.dirty, tired: mood.tired, sick: mood.sick, blink: fr.blink, glance: away ? -fr.glance : 0 } : { blink: false });
    if (me && mood.low && op.face === "joy") p.smile.position.y -= 0.08;
  });
}
// one shot from a scene: render it into a corner of the main canvas, copy it out, put the canvas back as it was
function photoShot(sc, cam, bg, post) {
  const pr = renderer.getPixelRatio(), Wd = 360, Hd = 450, size = renderer.getSize(new THREE.Vector2());
  renderer.shadowMap.needsUpdate = true;
  renderer.setScissorTest(true); renderer.setViewport(0, 0, Wd / pr, Hd / pr); renderer.setScissor(0, 0, Wd / pr, Hd / pr);
  renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam);
  const out = document.createElement("canvas"); out.width = Wd; out.height = Hd; const g2 = out.getContext("2d");
  const gr = g2.createLinearGradient(0, 0, 0, Hd); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); g2.fillStyle = gr; g2.fillRect(0, 0, Wd, Hd);
  g2.drawImage(canvas, 0, canvas.height - Hd, Wd, Hd, 0, 0, Wd, Hd);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, size.x, size.y); renderer.setClearColor(0x000000, 0);
  photoFilm(g2, Wd, Hd, post);
  return out.toDataURL("image/jpeg", 0.82);
}
// what a camera adds: rain or snow in front of the lens outside, a flash at night, a bit of grain and a soft vignette
function photoFilm(g, w, h, P) {
  const rnd = P.rnd;
  if (P.out && (P.wx === "rain" || P.wx === "storm")) { g.strokeStyle = P.night ? "rgba(190,205,230,.32)" : "rgba(255,255,255,.4)"; g.lineWidth = 1.1; for (let i = 0; i < 140; i++) { const x = rnd() * w, y = rnd() * h, l = 10 + rnd() * 18; g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * 0.22, y + l); g.stroke(); } }
  if (P.out && P.wx === "snow") { g.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 90; i++) { const r = 0.8 + rnd() * 2.2; g.globalAlpha = 0.5 + rnd() * 0.5; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 7); g.fill(); } g.globalAlpha = 1; }
  if (P.out && P.wx === "storm" && rnd() < 0.5) { g.fillStyle = "rgba(220,230,255,.18)"; g.fillRect(0, 0, w, h); }
  if (P.flash) { const f = g.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.8); f.addColorStop(0, "rgba(255,255,255,.16)"); f.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = f; g.fillRect(0, 0, w, h); }
  const v = g.createRadialGradient(w / 2, h / 2, w * 0.38, w / 2, h / 2, w * 0.82); v.addColorStop(0, "rgba(20,12,6,0)"); v.addColorStop(1, `rgba(20,12,6,${P.night ? 0.5 : 0.3})`); g.fillStyle = v; g.fillRect(0, 0, w, h);
  const im = g.getImageData(0, 0, w, h), d = im.data, amt = P.night ? 14 : 8;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
}
// at home: the family's own room, exactly as it is in the game right now (furniture, paint, lamps, the window sky)
function photoAtHome(op, mood, rnd, kinds) {
  if (typeof HOUSE_MODE === "undefined" || HOUSE_MODE !== "main" || kamarOn() || !ROOMS.length) return null;
  const k = photoRoomIx(op, rnd), r = ROOMS[k]; if (!r) return null;
  const hidden = [];
  for (const o of scene.children) if (o !== r.g && o !== hemi && o !== sun && o.visible) { o.visible = false; hidden.push(o); }
  const vis0 = r.g.visible, pos0 = r.g.position.clone(); r.g.visible = true; r.g.position.set(-r.stand[0] * CELL, 0, -r.stand[1] * CELL);
  // the light the room settles to at this hour (the main frame eases toward it; a photo takes the settled value)
  const exp0 = renderer.toneMappingExposure; if (mood.period === "night") renderer.toneMappingExposure = exp0 * 0.78;   // night photos read as night
  const hs0 = [hemi.intensity, sun.intensity], dimN = napUntil > now() ? 0.3 : 1; hemi.intensity = LIT.hemi * dimN; sun.intensity = LIT.sunI * dimN;
  const lampOn = napUntil > now() ? Math.max(LIT.lamp, 0.4) : LIT.lamp, lamps = (r.g.userData.lamps || []).map(o => [o.l, o.l.intensity]);
  for (const [l] of lamps) l.intensity = lampOn * ((r.g.userData.lamps.find(o => o.l === l) || {}).strength || 1);
  const g = new THREE.Group(); scene.add(g);
  const C = photoCast(g, op, mood, true); addProp(g, op.prop, C.subj);
  if (op.prop) g.children.filter(o => !o.isGroup).forEach(o => { if (!C.cast.some(c => c.blob === o)) { o.position.multiplyScalar(PET); o.scale.multiplyScalar(PET); } });
  const cam = new THREE.PerspectiveCamera(30, 0.8, 0.3, 200), night = mood.period === "night" || mood.period === "evening";
  const flash = new THREE.PointLight(0xfff6ea, 0, 30, 1.4); scene.add(flash);
  const bg = LIT.tint || r.bg, imgs = [];
  kinds.forEach((kind, i) => {
    const fr = photoFrame(kind, rnd, C.sz, C.crowd), cx = C.subj.root.position.x * 0.4;
    cam.position.set(cx + Math.sin(fr.yaw) * fr.dist, fr.camY, Math.cos(fr.yaw) * fr.dist); cam.up.set(0, 1, 0); cam.lookAt(cx, fr.lookY, 0);
    cam.rotateY(fr.third); cam.rotateZ(fr.roll); cam.updateProjectionMatrix();
    photoPose(C, op, mood, fr, cam.position);
    const useFlash = night && i === 1; flash.position.copy(cam.position); flash.intensity = useFlash ? 0.9 : 0;
    imgs.push(photoShot(scene, cam, bg, { rnd, night: mood.period === "night", flash: useFlash, out: false, wx: mood.wx }));
  });
  scene.remove(flash); photoFree(g);
  for (const [l, v] of lamps) l.intensity = v;
  [hemi.intensity, sun.intensity] = hs0; renderer.toneMappingExposure = exp0;
  r.g.visible = vis0; r.g.position.copy(pos0); hidden.forEach(o => o.visible = true);
  coverDrawn = false;   // the main frame draws itself again over the corner we used
  return { imgs, where: r.name };
}
// outside the house: the place's small set, lit by that hour and that weather
const PH_LIGHT = {
  morning: { key: 0xffd2a8, k: 1.0, hemi: 0.42, fill: 0.3, lamp: 0 }, day: { key: 0xffeedb, k: 1.12, hemi: 0.48, fill: 0.35, lamp: 0 },
  evening: { key: 0xffa070, k: 0.82, hemi: 0.3, fill: 0.2, lamp: 1.1 }, night: { key: 0x8fa0cf, k: 0.28, hemi: 0.13, fill: 0.08, lamp: 2.4 },
};
function studioLight(st, mood, out) {
  const L = st.base || (st.base = { hc: st.hemi.color.clone(), hi: st.hemi.intensity, kc: st.key.color.clone(), ki: st.key.intensity, fi: st.fill.intensity, kp: st.key.position.clone() });
  if (!mood) { st.hemi.color.copy(L.hc); st.hemi.intensity = L.hi; st.key.color.copy(L.kc); st.key.intensity = L.ki; st.key.position.copy(L.kp); st.fill.intensity = L.fi; st.lamp.intensity = 0; st.sc.fog = null; return; }
  const P = PH_LIGHT[mood.period] || PH_LIGHT.day, wet = mood.wx === "rain" || mood.wx === "storm", dim = wet ? (mood.wx === "storm" ? 0.45 : 0.6) : mood.wx === "cloud" || mood.wx === "fog" ? 0.75 : 1;
  // indoors (school, café, office) the room lights carry it; outdoors the sky does
  const inside = !out, k = inside ? Math.max(P.k, 0.75) : P.k;
  st.key.color.setHex(wet || mood.wx === "fog" ? 0xc9d3e0 : inside && mood.period === "night" ? 0xffd9b0 : P.key);
  st.key.intensity = k * (inside ? Math.max(dim, 0.8) : dim); st.hemi.intensity = (inside ? Math.max(P.hemi, 0.32) : P.hemi) * (inside ? 1 : Math.max(dim, 0.7));
  st.fill.intensity = P.fill * dim;
  st.key.position.set(mood.period === "evening" || mood.period === "morning" ? (mood.period === "evening" ? 7 : -7) : -4, mood.period === "day" ? 9 : 4.5, 6);
  st.lamp.intensity = out ? P.lamp : 0;
  st.sc.fog = mood.wx === "fog" && out ? new THREE.Fog(0xd5d9dc, 6, 26) : null;
}
function photoOutside(op, mood, rnd, kinds) {
  const st = studioScene(), place = op.place === "home" ? "home" : op.place;
  const set = st.sets[place] || (st.sets[place] = buildSet(place));
  const g = new THREE.Group(); g.add(set); st.sc.add(g);
  const out = !!set.userData.out, night = mood.period === "night";
  studioLight(st, mood, out);
  const fl = set.userData.floor;
  if (fl) { fl.color.copy(fl.userData.c0); fl.roughness = 1; if (out && (mood.wx === "rain" || mood.wx === "storm")) { fl.color.multiplyScalar(0.62); fl.roughness = 0.35; } if (out && mood.wx === "snow") fl.color.lerp(new THREE.Color(0xeef2f6), 0.72); if (out && night) fl.color.multiplyScalar(0.7); }
  const sky = skyTex(mood.period, mood.wx);
  if (set.userData.sky) { set.userData.sky.map = sky; set.userData.sky.needsUpdate = true; }
  for (const m of set.userData.panes || []) { m.map = sky; m.needsUpdate = true; }
  const C = photoCast(g, op, mood, false); addProp(g, op.prop, C.subj);
  const imgs = [], cam = st.cam, flash = new THREE.PointLight(0xfff6ea, 0, 30, 1.4); st.sc.add(flash);
  const bg = out ? townSky() : ["#efe6da", "#e4d8c8"];
  kinds.forEach((kind, i) => {
    const fr = photoFrame(kind, rnd, C.sz, C.crowd);
    cam.position.set(Math.sin(fr.yaw * 0.7) * fr.dist, fr.camY, Math.cos(fr.yaw * 0.7) * fr.dist); cam.up.set(0, 1, 0); cam.lookAt(0, fr.lookY, 0);
    cam.rotateY(fr.third); cam.rotateZ(fr.roll); cam.updateProjectionMatrix();
    photoPose(C, op, mood, fr, cam.position);
    const useFlash = night && i === 1; flash.position.copy(cam.position); flash.intensity = useFlash ? 0.9 : 0;
    imgs.push(photoShot(st.sc, cam, bg, { rnd, night, flash: useFlash, out, wx: mood.wx }));
  });
  st.sc.remove(flash); g.remove(set); photoFree(g);
  cam.rotation.set(0, 0, 0); studioLight(st, null);
  coverDrawn = false;
  return { imgs, where: PLACE_NAME[op.place] || "Out" };
}
// all shots of one memory; op.shot remembers where and how (room, hour, weather) for the caption line
function renderPhoto(op) {
  const rnd = photoRng(op.key + "|" + op.day), mood = op.mood || (op.mood = photoMood(op)), kinds = photoPlan(op, rnd);
  const r = (op.place === "home" && photoAtHome(op, mood, rnd, kinds)) || photoOutside(op, mood, rnd, kinds);
  op.where = r.where;
  op.shot = `${r.where} · ${mood.wx ? WX_EN[mood.wx] + " " : ""}${PERIOD_EN[mood.period] || ""}`;
  return r.imgs;
}
function showPhotoOp(op) {
  if (!op) return;
  const imgs = renderPhoto(op); let pick = 0;
  const strip = imgs.length > 1 ? `<div class="shots" role="group" aria-label="Pick a shot">${imgs.map((u, i) => `<button data-shot="${i}" aria-pressed="${!i}" aria-label="Shot ${i + 1} of ${imgs.length}"><img src="${u}" alt=""></button>`).join("")}</div>` : "";
  openSheet("photo", `
    <span class="ribbon">A MOMENT · ${esc(op.where.toUpperCase())}</span>
    <div class="polaroid"><img id="shotBig" src="${imgs[0]}" alt="${esc(op.caption)}"><div class="cap">${esc(op.caption)}</div><small>${esc(fmtDate(op.day))} · ${esc(fmtAge(op.age))} old${op.who.length ? " · with " + esc(op.who.map(w => w.nama).join(" & ")) : ""}</small><small class="shotline">${esc(op.shot)}</small></div>
    ${strip}
    <p>${md(op.line)}</p>
    <p class="sub">${imgs.length > 1 ? `${imgs.length} shots. Pick the one to keep, or let them go.` : "Keep it in the album, or let it go."} Moments you don't keep are gone after today.</p>
    <div class="row2"><button class="big" id="keepIt">Keep it</button><button class="close" id="letGo">Let it go</button></div>`);
  sheet.querySelectorAll("[data-shot]").forEach(b => b.onclick = () => {
    pick = +b.dataset.shot; $("shotBig").src = imgs[pick];
    sheet.querySelectorAll("[data-shot]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });
  $("keepIt").onclick = () => {
    const f = $("flash"); f.classList.add("on"); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove("on")));
    const list = albumLoad(); list.push({ key: op.key, eid: op.eid, cid: op.cid, name: op.name, day: op.day, age: op.age, phase: op.phase, place: op.place, where: op.where, shot: op.shot, caption: op.caption, line: op.line, who: op.who.map(w => ({ id: w.id, nama: w.nama })), img: imgs[pick] });
    const ok = albumSave(list); seenAdd(op.key); refreshOps(); joyUntil = now() + 2000;
    if (!ok) story(op.name, "The album on this device is full, so the oldest photos made room.", false);
    opsCache.length ? showPhotoOp(opsCache[0]) : showAlbum(op.cid);
  };
  $("letGo").onclick = () => { seenAdd(op.key); refreshOps(); const n = opsCache[0]; n ? showPhotoOp(n) : closeSheet(); };
}
function showPhoto(a, back) {
  openSheet("photo", `
    <span class="ribbon" style="background: var(--plum)">${esc((PHASE_EN[a.phase] || "").toUpperCase())} · ${esc((a.where || PLACE_NAME[a.place]).toUpperCase())}</span>
    <div class="polaroid"><img src="${a.img}" alt="${esc(a.caption)}"><div class="cap">${esc(a.caption)}</div><small>${esc(fmtDate(a.day))} · ${esc(fmtAge(a.age))} old${a.who.length ? " · with " + esc(a.who.map(w => w.nama).join(" & ")) : ""}</small>${a.shot ? `<small class="shotline">${esc(a.shot)}</small>` : ""}</div>
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
  // v80: hari berganti waktu app terbuka (atau dibuka lagi dari latar belakang): Agenda hari baru
  if (visible && state.agenda_hari != null && state.agenda_hari !== t) agendaMaybe(null);
  if (sheetKind === "dilemma" && game.pending) { const cd = countdownText(game.pending); $("cdBar").style.width = cd.frac * 100 + "%"; $("cdText").textContent = cd.text; }
  // DEV-NEXT
  if (DEV) devClock();
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { Tele.resume(); tick(); } else Tele.pause(); });
addEventListener("pagehide", () => Tele.end("tutup"));
addEventListener("error", e => Tele.teknis("error", { msg: String(e.message || "").slice(0, 120), src: String(e.filename || "").split("/").pop().slice(0, 30), baris: e.lineno || 0 }));


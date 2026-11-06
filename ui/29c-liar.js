// ================================================================ v80: wilayah liar
// Tanda di peta benua (region.js wilds, continent.js) → kartu → adegan 3D dari liar.js (stage). Kamera di beberapa sudut
// tetap, makhluk jalan pelan di sana, siang/malam ikut jam (bisa diganti). Ekspedisi (kirim makhluk, pulang bawa foto dan
// barang) menyusul; ini tahap lihat-lihat dulu. Penghitung fps tampil di pojok buat tes berat di HP.
const WILD_TXT = {
  pasir: "Dunes as far as you can see. A temple half under the sand, a red stone arch, the bones of something huge, and one small oasis.",
  hutan: "A forest so thick the light comes down in beams. A slow river, mossy ruins, and a tree older than any city.",
};
let liarExp = 1, liarFn = null;
function showWild(w, C) {
  sheet.classList.add("clear");
  const who = cur && cur.fase !== "meninggal" && cur.fase !== "merantau" ? esc(cur.nama) : null;
  const body = w.live && globalThis.Liar
    ? `<p>${esc(WILD_TXT[w.id] || "")}</p><button class="big" id="goWild">${who ? `Look around with ${who}` : "Look around"}</button>
       <p class="muted">Expeditions come later: send ${who || "your creature"} out here and they come back with photos, clues and rare finds.</p>`
    : `<p>A wild place in ${esc(C.name)}, far from the towns. Coming soon.</p><p class="muted">Wild areas open one by one. Later your creature can go on expeditions here.</p>`;
  openSheet("lot", `<span class="ribbon">Wild area · ${esc(C.name)}</span><h2>${esc(w.name)}</h2>${body}<button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  const g = $("goWild"); if (g) g.onclick = () => liarEnter(w);
  if (CONT) CONT.flyTo(w.x, w.z + 4, 0.3);
}
async function liarEnter(w) {
  closeSheet(); await veil(true);
  if (LIAR && LIAR.kind !== w.id) { LIAR.dispose(); LIAR = null; }
  if (!LIAR) {
    if (!liarFn) liarFn = Liar.create({ THREE, M, canvasTex });
    LIAR = liarFn.stage(w.id, { Look: globalThis.Look });
    if (cur && cur.fase !== "meninggal" && cur.fase !== "merantau") { const KP = makeCreature(cur, LIAR.crit); KP.root.scale.setScalar(KP.scale * 0.36); }
    LIAR.crit.traverse(o => { if (o.isMesh) o.castShadow = true; });
    LIAR.patch();
    // geser kiri/kanan = ganti sudut kamera (layar sentuh dan mouse sama)
    let sw = null;
    Object.assign(LIAR, { down: e => { sw = { x: e.clientX, y: e.clientY }; }, move: () => {}, cancel: () => { sw = null; }, wheel: () => {},
      up: e => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) liarView(LIAR.view + (dx < 0 ? 1 : -1)); } });
  }
  LIAR.on = true; LIAR.name = w.name;
  if (CONT) CONT.exit();
  liarExp = renderer.toneMappingExposure; renderer.toneMappingExposure = 0.95;
  LIAR.setNight(litName === "night"); liarView(0);
  outMode("liar"); resize(); Tele.layar("app", "liar"); Tele.ev("kota", { a: "liar", p: w.id });
  $("lTitle").textContent = w.name; liarNightBtn(); veil(false);
}
function liarOff() { if (!LIAR || !LIAR.on) return; LIAR.on = false; renderer.toneMappingExposure = liarExp; }
async function liarLeave() {
  if (!LIAR || !LIAR.on) return;
  await veil(true); liarOff();
  if (CONT) { CONT.resume(); CONT.resize(app.clientWidth, app.clientHeight); outMode("region"); Tele.layar("app", "benua"); } else outMode(null);
  resize(); veil(false);
}
function liarView(i) { const n = LIAR.setView(i); $("lView").textContent = `${n} · ${LIAR.view + 1}/${LIAR.views.length}`; }
function liarNightBtn() { const b = $("lNight"); b.textContent = LIAR.night ? "☀" : "🌙"; b.setAttribute("aria-label", LIAR.night ? "Show it by day" : "Show it at night"); }
// fps: hitung bingkai tiap detik (plus jumlah gambar per bingkai), biar kelihatan berat aslinya di HP
let lfN = 0, lfT = 0;
function liarFps(t) {
  lfN++; if (!lfT) lfT = t;
  if (t - lfT < 1000) return;
  $("lFps").textContent = `${Math.round(lfN * 1000 / (t - lfT))} fps · ${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles / 1000)}k tris`;
  lfN = 0; lfT = t;
}
$("lExit").onclick = () => liarLeave();
$("lNext").onclick = () => liarView(LIAR.view + 1);
$("lNight").onclick = () => { LIAR.setNight(!LIAR.night); liarNightBtn(); };
// v80: tombol "Wild areas" di peta benua: daftar wilayah liar benua ini (+ yang sudah bisa dikunjungi di benua lain)
function wildList() {
  if (!CONT || !CONT.on) return;
  const here = Region.region(CONT.id), C = here.C;
  const all = Object.keys(Bumi.CONT).flatMap(id => Region.region(id).wilds);
  const row = w => `<button class="big" data-wild="${w.cont}:${w.id}"${w.live ? "" : ' style="opacity:.6"'}>${w.live ? "" : "🔒 "}${esc(w.name)}${w.cont !== C.id ? ` · ${esc(Bumi.CONT[w.cont].name)}` : ""}</button>`;
  const away = all.filter(w => w.live && w.cont !== C.id);
  sheet.classList.add("clear");
  openSheet("lot", `<span class="ribbon">${esc(C.name)}</span><h2>Wild areas</h2>
    <p>Empty, quiet places far from the towns.${here.wilds.some(w => w.live) ? "" : ` None here is open yet.`}</p>${here.wilds.map(row).join("")}
    ${away.length ? `<p class="muted">Open now on other continents:</p>${away.map(row).join("")}` : ""}<button class="close" data-close="1">Close</button>`);
  sheet.querySelector("[data-close]").onclick = closeSheet;
  for (const b of sheet.querySelectorAll("[data-wild]")) b.onclick = async () => {
    const [cid, wid] = b.dataset.wild.split(":"), w = Region.region(cid).wilds.find(x => x.id === wid);
    closeSheet();
    if (cid !== CONT.id) { await veil(true); CONT.enter(cid, "globe"); CONT.resize(app.clientWidth, app.clientHeight); veil(false); }
    setTimeout(() => showWild(w, Bumi.CONT[cid]), cid !== CONT.id ? 900 : 0);
  };
}
$("findWild").onclick = () => wildList();

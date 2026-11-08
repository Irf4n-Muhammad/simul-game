// ================================================================ v83: blok waktu bebas (jadwal.js)
// Jadwal minggu dari Classes dan Agenda: tap blok bebas, pilih kegiatan (★ tiga rekomendasi, lalu semua), atau "terserah makhluknya".
function wkBind(id, back) {
  sheet.querySelectorAll("[data-blok]").forEach(b => b.onclick = () => showBlok(id, b.dataset.blok, back));
}
const WK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function showBlok(id, key, back) {
  const c = game && game.home.get(id); if (!c || !c.st) return;
  const n = esc(c.name), d = today(), dow = +key[0], b = key.slice(1);
  // hari contoh di minggu depan dengan hari yang sama (buat rekomendasi dan pilihan sesuai umur sekarang)
  const day = d + ((dow - (d % 7) + 7) % 7);
  const plan = (c.info.jadwal || {})[key] || "", R = Jadwal.recommend(c, day, b, 3), rec = new Set(R.map(r => r.id));
  const all = Jadwal.choices(c, day), tp = all.filter(o => o.kind === "topik" && !rec.has(o.id)), ag = all.filter(o => o.kind === "agenda");
  const btn = (o, why) => `<button class="line${o.id === plan ? " on" : ""}" data-pick="${o.id}"><span class="grow"><b>${rec.has(o.id) ? "★ " : ""}${esc(o.label)}</b>${why ? `<small class="sub">${esc(why)}</small>` : ""}</span>${o.id === plan ? "<i>✓</i>" : ""}</button>`;
  openSheet("blok", `
    <span class="ribbon">FREE TIME · ${n}</span>
    <h2>${WK_DAYS[dow]} ${esc(Ilmu.BLOK_LBL[b].toLowerCase())}</h2>
    <p class="muted small">Every ${WK_DAYS[dow]}, until you change it. ${n} might say no, more often for things ${n} doesn't like, and skips it when too tired.</p>
    <div class="list"><button class="line${!plan ? " on" : ""}" data-pick=""><span class="grow"><b>Up to ${n}</b><small class="sub">${n} picks, going by what ${n} likes</small></span>${!plan ? "<i>✓</i>" : ""}</button></div>
    <h3>Recommended</h3><div class="list">${R.map(r => btn(r, `${r.why[0].toUpperCase()}${r.why.slice(1)} · ${Tree.NODES[Jadwal.TOPIK[r.id.slice(2)].node].label} ${r.v}`)).join("")}</div>
    <h3>Hobbies</h3><div class="list">${tp.map(o => btn(o, Tree.NODES[o.node].label)).join("")}</div>
    <h3>Everyday</h3><div class="list">${ag.map(o => btn(o, "")).join("")}</div>
    <button class="close" data-close="1">Back</button>`);
  sheet.querySelectorAll("[data-pick]").forEach(x => x.onclick = () => {
    if (!canCare() || !game.act(c.id, `jadwal:${key}:${x.dataset.pick}`)) return;
    Tele.ev("jadwal", { k: key, a: x.dataset.pick || "-", star: rec.has(x.dataset.pick) ? 1 : 0 });
    save(); refresh(); back();
  });
  sheet.querySelector("[data-close]").onclick = back;
}
// lembar sendiri dari Agenda: cuma jadwal minggunya
function showWeek(id = cur && cur.id) {
  const c = game && game.home.get(id); if (!c || !c.st) return;
  openSheet("minggu", `
    <span class="ribbon">WEEK · ${esc(c.name)}</span>
    <h2>${esc(c.name)}'s week</h2>
    ${lesWeek(c, today())}
    <button class="secondary" id="wkLes">Classes</button>
    <button class="close" data-close="1">Close</button>`);
  wkBind(c.id, () => showWeek(id));
  $("wkLes").onclick = () => showLes(id);
  sheet.querySelector("[data-close]").onclick = closeSheet;
}

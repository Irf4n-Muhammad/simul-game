// ================================================================ v83: blok waktu bebas (jadwal.js)
// Jadwal minggu dari Classes dan Agenda: tap blok bebas, pilih kegiatan (★ tiga rekomendasi, lalu semua), atau "terserah makhluknya".
function wkBind(id, back) {
  sheet.querySelectorAll("[data-blok]").forEach(b => b.onclick = () => showBlok(id, b.dataset.blok, back));
}
const WK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], WK_SH = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], WK_B = { pagi: "am", siang: "mid", sore: "pm" };
// v83b: pilih dulu, saran belakangan. Grid ikon per akar pohon (♥ = yang dia suka), tap = detail + reaksinya, pasang ke beberapa blok sekaligus.
function showBlok(id, key, back, sel = undefined, keys = undefined) {
  const c = game && game.home.get(id); if (!c || !c.st) return;
  const n = esc(c.name), d = today(), dow = +key[0], b = key.slice(1);
  const day = d + ((dow - (d % 7) + 7) % 7);
  const J = c.info.jadwal || {}, plan = J[key] || "";
  if (sel === undefined) sel = plan;
  if (!keys) keys = new Set([key]);
  const all = Jadwal.choices(c, day), roots = Tree.ROOTS;
  const tile = o => { const f = Jadwal.info(c, o.id, day); return `<button class="tile${o.id === sel ? " sel" : ""}${o.id === plan ? " on" : ""}" data-pick="${o.id}"><b>${f.ic}</b><span>${esc(f.label)}</span>${f.love ? "<i>♥</i>" : ""}</button>`; };
  const grp = (t, list) => list.length ? `<div class="bk-grp">${t}</div><div class="tiles">${list.map(tile).join("")}</div>` : "";
  const f = Jadwal.info(c, sel, day);
  const det = sel ? (f.kind === "topik" ? `<div class="bk-det"><h4>${f.ic} ${esc(f.label)}</h4><span class="q">${n}: “${esc(f.react)}”</span>
      <span class="row">Grows ${esc(f.nodeLabel)} · now ${f.v}${f.v >= f.cap ? ` (hobbies stop at ${f.cap}; classes go further)` : ` · hobbies take it up to ${f.cap}`}</span>
      <span class="row">Energy ${f.energi} · How ${n} feels about it: ${esc(f.word)}${f.minat < 25 ? ", so will often say no" : ""}</span></div>`
    : `<div class="bk-det"><h4>${f.ic} ${esc(f.label)}</h4><span class="row">An everyday thing for ${n}'s age.</span></div>`)
    : `<div class="bk-det"><h4>🎲 Up to ${n}</h4><span class="row">${n} picks, going by what ${n} likes.</span></div>`;
  const chips = Jadwal.ALL_KEYS.map(k => `<button class="chip${keys.has(k) ? " on" : ""}" data-k="${k}">${WK_SH[+k[0]]} ${WK_B[k.slice(1)]}${J[k] && J[k] === sel && !keys.has(k) ? " ·" : ""}</button>`).join("");
  openSheet("blok", `
    <span class="ribbon">FREE TIME · ${n}</span>
    <h2>${WK_DAYS[dow]} ${esc(Ilmu.BLOK_LBL[b].toLowerCase())}</h2>
    <p class="muted small">What should ${n} do? ♥ = things ${n} likes. Plans repeat every week; ${n} might still say no, or skip it when too tired.</p>
    <div class="tiles">${tile({ id: "" })}</div>
    ${roots.map(r => grp(esc(Tree.NODES[r].label), all.filter(o => o.kind === "topik" && Tree.NODES[o.node].root === r))).join("")}
    ${grp("Everyday", all.filter(o => o.kind === "agenda"))}
    ${det}
    <div class="bk-grp">Also on</div><div class="chips">${chips}</div>
    <button class="big" id="bkSet">${sel ? `Set ${esc(f.label)}` : `Leave it to ${n}`}${keys.size > 1 ? ` · ${keys.size} blocks` : ""}</button>
    <button class="close" data-close="1">Back</button>`);
  const again = () => showBlok(id, key, back, sel, keys);
  sheet.querySelectorAll("[data-pick]").forEach(x => x.onclick = () => { sel = x.dataset.pick; again(); });
  sheet.querySelectorAll("[data-k]").forEach(x => x.onclick = () => { const k = x.dataset.k; if (keys.has(k) && keys.size > 1) keys.delete(k); else keys.add(k); again(); });
  $("bkSet").onclick = () => {
    if (!canCare()) return;
    let ok = 0;
    for (const k of keys) if (game.act(c.id, `jadwal:${k}:${sel}`)) ok++;
    if (!ok) return;
    Tele.ev("jadwal", { k: [...keys].join(","), a: sel || "-", n: ok });
    save(); refresh(); back();
  };
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

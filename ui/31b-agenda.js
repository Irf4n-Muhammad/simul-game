// ================================================================ v80: Agenda, layar pertama tiap hari
// Muncul sekali sehari pada buka pertama (state.agenda_hari), sesudah tur awal selesai, dan menggantikan lembar "Welcome back".
// Isinya dari rekom.js: "Can do now" (kesempatan yang lagi kebuka, batas waktu, pilihan dengan satu rekomendasi) dan "Coming up"
// (rekom.soon + Soon.items terdekat). Suaranya dunia di sekitar orang tua, bukan makhluknya. Tombol kalender di HUD membuka layar ini
// dan dapat titik merah selama ada kartu yang belum dikerjakan.
Rekom.setFormat(d => fmtDate(d));
function agendaSnap() {
  if (!game) return null;
  const d = today();
  const members = vm().anggota.map(m => { const h = game.home.get(m.id); return { id: m.id, nama: m.nama, born: m.born, alive: !!h && h.alive(d) && !("keluar" in h.info), info: h ? h.info : {}, st: h && h.st ? h.st : null }; });
  return { d, members };
}
function agendaCards() { const S = agendaSnap(); return S ? Rekom.cards(S) : { now: [], soon: [] }; }
const AGENDA_SOON = 4, AGENDA_SOON_DAYS = 30;
let agRecap = null;   // rekap pembuka tetap tampil waktu Agenda digambar ulang sesudah memilih
function showAgenda(recap) {
  if (!game || !cur) return;
  if (recap !== undefined) agRecap = recap; else recap = agRecap;
  const R = agendaCards(), d = today();
  // "Coming up": jendela yang bakal kebuka dulu, lalu tanggal lain dari soon.js (yang sudah jadi kartu "now" nggak diulang)
  const S = aheadSnap(), nowK = new Set(R.now.map(c => c.k));
  const soon = R.soon.concat(S ? Soon.items(S).filter(i => i.day - d <= AGENDA_SOON_DAYS && !nowK.has(i.k)) : []).slice(0, AGENDA_SOON);
  const left = n => n <= 0 ? `<i class="days"><b>now</b><small>today</small></i>` : `<i class="days"><b>${n}</b><small>${n === 1 ? "day" : "days"}</small></i>`;
  const card = (c, ix) => `<div class="ag-card${c.done ? " done" : ""}${c.urgent ? " urgent" : ""}">
      <div class="ag-head">${c.done ? `<i class="days ok"><b>✓</b><small>done</small></i>` : left(c.left)}<span class="grow"><b><em class="k">${esc(c.lbl)}:</em> ${esc(c.tx)}</b>
        <small class="sub">${c.done ? "" : `Closes ${esc(fmtDate(c.day))} · `}${esc(c.why)}</small></span></div>
      ${c.opts.length ? `<div class="ag-opts">${c.opts.map((o, j) => `<button class="ag-opt${o.picked ? " picked" : ""}" data-ag="${ix}:${j}" ${canCare() && !o.picked ? "" : "disabled"}>
        <span><b>${o.star ? "★ " : ""}${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ""}</span>${o.picked ? "<em>chosen</em>" : o.star ? "<em>recommended</em>" : ""}</button>`).join("")}</div>` : ""}
    </div>`;
  const row = (i, ix) => `<button class="line ahead${i.sure === false ? " maybe" : ""}" data-agsoon="${ix}">${left(i.day - d)}<span class="grow"><b><em class="k">${esc(i.lbl || "SOON")}:</em> ${esc(i.tx)}</b><small class="sub">${esc(fmtDate(i.day))}${i.sub ? " · " + esc(i.sub) : ""}</small></span></button>`;
  // rekap pendek: kalimat pertama tiap kejadian besar, paling banyak 3; cerita lengkapnya di diary
  const first = t => { const m = String(t).match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : String(t); };
  const rc = recap && recap.logs.length ? `<div class="ag-recap"><h3>While you were away · ${recap.days} days</h3>${recap.logs.slice(-3).map(l => `<p><b>${esc(l.name)}:</b> ${md(first(l.lines.filter(x => !/^_/.test(x)).join(" ") || l.lines[0]))}</p>`).join("")}<button class="linkish" id="agDiary">Read it all in the diary</button></div>` : "";
  openSheet("agenda", `
    <span class="ribbon">AGENDA · ${esc(fmtDate(d))}</span>
    <h2>Can do now</h2>
    ${R.now.length ? `<div class="ag-list">${R.now.map(card).join("")}</div>` : `<p class="muted">Nothing that needs you today. Just look after ${esc(cur.nama)}.</p>`}
    ${rc}
    <h2>Coming up</h2>
    ${soon.length ? `<div class="list">${soon.map(row).join("")}</div>` : `<p class="muted">Nothing with a date in the next ${AGENDA_SOON_DAYS} days.</p>`}
    <div class="ag-more"><button class="secondary" id="agAhead">Everything ahead</button><button class="secondary" id="agPlan">Daily plan</button></div>
    <button class="big" data-close="1">Go to ${esc(cur.nama)}</button>`);
  sheet.querySelectorAll("[data-ag]").forEach(b => b.onclick = () => {
    const [i, j] = b.dataset.ag.split(":").map(Number), c = R.now[i], o = c && c.opts[j];
    if (!o) return;
    if (c.cid !== selected) select(c.cid);
    Tele.ev("agenda", { a: "pilih", k: c.k.split(":")[0], o: o.id, star: o.star ? 1 : 0, sisa: c.left });
    if (game.act(c.cid, o.act)) { drainNoon(); save(); refresh(); showAgenda(); if (o.act === "belajar") say("I'll ace it!"); }
  });
  sheet.querySelectorAll("[data-agsoon]").forEach(b => b.onclick = () => { const i = soon[+b.dataset.agsoon]; if (i && i.go) aheadGo(i); else showAhead(); });
  $("agAhead").onclick = () => showAhead();
  if ($("agDiary")) $("agDiary").onclick = () => showDiary();
  $("agPlan").onclick = () => showPlan();
  sheet.querySelector("[data-close]").onclick = () => { agRecap = null; closeSheet(); };
  Tele.ev("agenda", { a: "buka", n: R.now.length, belum: Rekom.pending(R) });
}
// titik merah di tombol Agenda (dipanggil drawHud lewat agendaDot)
function agendaDot() {
  const b = $("planBtn"); if (!b || !game) return;
  const on = state.tut >= COACH.length && Rekom.pending(agendaCards()) > 0, dot = b.querySelector(".dot-new");
  if (on && !dot) b.insertAdjacentHTML("beforeend", `<i class="dot-new"></i>`); else if (!on && dot) dot.remove();
}
// buka pertama hari ini: Agenda (dengan rekap kalau ada). Mengembalikan true kalau Agenda dibuka.
function agendaMaybe(recap) {
  if (!state || !game || !cur || game.pending || sheetKind || PH || state.tut < COACH.length) return false;
  if (cur.fase === "meninggal" || cur.fase === "merantau") return false;
  const t = liveDay();
  if (state.agenda_hari === t) return false;
  state.agenda_hari = t; save();
  showAgenda(recap);
  return true;
}

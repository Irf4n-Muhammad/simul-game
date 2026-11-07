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
// ---- kalender bulan di atas Agenda: kisi tanggal asli, hari ini dilingkari, titik = ada jadwal, garis = jendela yang lagi buka.
// Ketuk tanggal = isi hari itu muncul di bawah kisi. agMon = geser bulan dari bulan sekarang, agSel = hari game yang dipilih.
let agMon = 0, agSel = null;
const AG_WD = ["M", "T", "W", "T", "F", "S", "S"];
const dayOfDate = ts => Math.round((ts - Engine.START_DATE) / 86400000);
// semua tanggal yang diketahui: batas waktu kartu, jendela, dan tanggal soon.js (sampai setahun ke depan)
function agEvents(R, S, d) {
  const ev = new Map(), band = new Set();
  const add = (day, e) => { if (!ev.has(day)) ev.set(day, []); ev.get(day).push(e); };
  for (const c of R.now) {
    if (c.from != null && !c.done) for (let x = Math.max(c.from, d); x <= c.day; x++) band.add(x);
    add(c.day, { kind: c.done ? "event" : "deadline", lbl: c.lbl, tx: c.done ? c.tx : `${c.tx}: last day`, k: c.k });
  }
  for (const i of R.soon) { add(i.day, { kind: "open", lbl: i.lbl, tx: i.tx, k: i.k }); }
  if (S) for (const i of Soon.items(S)) if (i.day - d <= 366 && !i.any) add(i.day, { kind: i.sure === false ? "maybe" : "event", lbl: i.lbl, tx: i.tx, k: i.k, go: i.go, it: i });
  return { ev, band };
}
// rolling: minggu ini + 4 minggu berikutnya (5 baris, Senin dulu), jadi batas waktu dekat selalu kelihatan walau beda bulan.
// Tanggal 1 tiap bulan diberi nama bulannya. agMon = geser per 4 minggu.
const AG_WEEKS = 5;
function agCalendar(R, S, d) {
  const T = new Date(Engine.START_DATE + d * 86400000), dow = (T.getUTCDay() + 6) % 7;
  const start = d - dow + agMon * 28, end = start + AG_WEEKS * 7 - 1;
  const { ev, band } = agEvents(R, S, d), sel = agSel ?? d;
  const dt = gd => new Date(Engine.START_DATE + gd * 86400000);
  let cells = "";
  for (let gd = start; gd <= end; gd++) {
    const D = dt(gd), n = D.getUTCDate(), E = ev.get(gd) || [];
    const kinds = [...new Set(E.map(e => e.kind))].slice(0, 3);
    const cls = ["cal-c", gd === d ? "cal-now" : "", gd === sel ? "cal-sel" : "", gd < d ? "cal-past" : "", band.has(gd) ? "cal-band" : "", band.has(gd) && !band.has(gd - 1) ? "cal-ba" : "", band.has(gd) && !band.has(gd + 1) ? "cal-bz" : ""].filter(Boolean).join(" ");
    cells += `<button class="${cls}" data-calday="${gd}">${n === 1 ? `<small>${MONTHS[D.getUTCMonth()]}</small>` : ""}<b>${n}</b><i>${kinds.map(k => `<u class="${k}"></u>`).join("")}</i></button>`;
  }
  const a = dt(start), z = dt(end);
  const title = a.getUTCMonth() === z.getUTCMonth() ? `${MONTHS[a.getUTCMonth()]} ${a.getUTCFullYear()}` : `${MONTHS[a.getUTCMonth()]} – ${MONTHS[z.getUTCMonth()]} ${z.getUTCFullYear()}`;
  const items = ev.get(sel) || [];
  const selTx = sel === d ? "Today" : fmtDate(sel);
  return `<div class="cal">
    <div class="cal-h"><button class="cal-nav" data-calmon="-1" aria-label="Earlier">‹</button><b>${title}</b><button class="cal-nav" data-calmon="1" aria-label="Later">›</button></div>
    <div class="cal-g">${AG_WD.map(w => `<span class="cal-w">${w}</span>`).join("")}${cells}</div>
    <div class="cal-day"><b>${esc(selTx)}</b>${items.length ? items.map((e, j) => `<button class="cal-it" data-calit="${j}"><u class="${e.kind}"></u><span><em>${esc(e.lbl || "")}</em> ${esc(e.tx)}</span></button>`).join("") : `<small>${band.has(sel) ? "Enrolment is open." : "Nothing on this day."}</small>`}</div>
    <div class="cal-key"><span><u class="deadline"></u>deadline</span><span><u class="event"></u>set day</span><span><u class="open"></u>opens</span><span><i class="bandk"></i>open now</span></div>
  </div>`;
}
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
    <span class="ribbon">CALENDAR · ${esc(fmtDate(d))}</span>
    ${agCalendar(R, S, d)}
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
  sheet.querySelectorAll("[data-calmon]").forEach(b => b.onclick = () => { agMon += +b.dataset.calmon; agSel = null; showAgenda(); });
  sheet.querySelectorAll("[data-calday]").forEach(b => b.onclick = () => { agSel = +b.dataset.calday; showAgenda(); });
  sheet.querySelectorAll("[data-calit]").forEach(b => b.onclick = () => {
    const e = (agEvents(R, S, d).ev.get(agSel ?? d) || [])[+b.dataset.calit]; if (!e) return;
    if (e.it && e.go) aheadGo(e.it); else { const el = sheet.querySelector(".ag-list"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  if ($("agDiary")) $("agDiary").onclick = () => showDiary();
  $("agPlan").onclick = () => showPlan();
  sheet.querySelector("[data-close]").onclick = () => { agRecap = null; agMon = 0; agSel = null; closeSheet(); };
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
  agMon = 0; agSel = null;
  showAgenda(recap);
  return true;
}

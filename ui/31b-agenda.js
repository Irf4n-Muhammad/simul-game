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
  return { d, members, ilmu: ilmuOn() };
}
function agendaCards() { const S = agendaSnap(); return S ? Rekom.cards(S) : { now: [], soon: [] }; }
const AGENDA_SOON = 4, AGENDA_SOON_DAYS = 30;
let agRecap = null;   // rekap pembuka tetap tampil waktu Agenda digambar ulang sesudah memilih
// ---- kalender bulan di atas Agenda: kisi tanggal asli, hari ini dilingkari, titik = ada jadwal, garis = jendela yang lagi buka.
// Ketuk tanggal = isi hari itu muncul di bawah kisi. agMon = geser bulan dari bulan sekarang, agSel = hari game yang dipilih.
let agMon = 0, agSel = null;
const AG_WD = ["M", "T", "W", "T", "F", "S", "S"], AG_WDL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const agDate = gd => new Date(Engine.START_DATE + gd * 86400000);
const agDay = gd => { const D = agDate(gd); return `${AG_WDL[(D.getUTCDay() + 6) % 7]} ${D.getUTCDate()} ${MONTHS[D.getUTCMonth()]}`; };
// tulisan pendek di dalam kotak tanggal (kalau kejadiannya nggak bawa `short` sendiri)
const AG_SHORT = { BIRTHDAY: "Birthday", "GROWING UP": "Grows up", QUIZ: "Quiz", "FINAL EXAMS": "Exams", BABIES: "Babies", CLASS: "Last class", MARATHON: "Marathon",
  PROMOTION: "Review", COMPETITION: "Contest", MAGAZINE: "Magazine", BUILDING: "Built", DROP: "Drop", KINDRED: "Kindred", SCHOOL: "School", TALENT: "Talent",
  DENTIST: "Dentist", "REPORT CARD": "Report", "WEEK OFF": "Week off", CHECKUP: "Checkup" };
const agShort = e => e.short || AG_SHORT[e.lbl] || (e.lbl ? e.lbl.charAt(0) + e.lbl.slice(1).toLowerCase() : "");
const AG_RANK = { deadline: 0, open: 1, event: 2, maybe: 3 };
// semua tanggal yang diketahui: batas waktu kartu, jendela, hari masuk sekolah, dan tanggal soon.js (sampai setahun ke depan).
// card = kunci kartu "Can do now" yang terkait (tombol di detail tanggal menggulir ke situ)
function agEvents(R, S, d) {
  const ev = new Map(), band = new Set();
  const add = (day, e) => { if (!ev.has(day)) ev.set(day, []); ev.get(day).push(e); };
  const startEv = (c, day) => add(day, { kind: "event", lbl: "SCHOOL", short: "School starts", ic: "🏫", tx: `${c.nama}'s first day of school`,
    sub: c.done ? `At ${(c.opts.find(o => o.picked) || {}).label}.` : `At the school you enrol ${c.nama} in. No form = ${A_DEKAT()}, round the corner.`, k: "mulai:" + c.cid, card: c.k });
  for (const c of R.now) {
    if (c.from != null && !c.done) for (let x = Math.max(c.from, d); x <= c.day; x++) band.add(x);
    const school = c.lbl === "SCHOOL";
    add(c.day, c.done
      ? { kind: "event", lbl: c.lbl, short: school ? "Enrol closes" : c.short, ic: c.ic, tx: school ? `Enrolment closes. ${c.tx}.` : `${c.short} day for ${c.nama}`, sub: c.why, k: c.k, card: c.k }
      : { kind: "deadline", lbl: c.lbl, short: c.short, ic: c.ic, tx: school ? `Last day to choose ${c.nama}'s school` : `${c.short} day for ${c.nama}`, sub: c.why, k: c.k, card: c.k });
    if (c.startDay != null) startEv(c, c.startDay);
  }
  // les yang lagi jalan atau sudah didaftar: tiap hari sesi kelihatan di kalender (v82)
  if (S && ilmuOn()) for (const m of vm().anggota) {
    const h = game.home.get(m.id), I = h && h.st && h.st.ilmu; if (!I) continue;
    for (const k of I.kursus) { const K = Ilmu.COURSES[k.id]; Ilmu.schedule(k).forEach((gd, j) => { if (j >= k.n && gd >= d) add(gd, { kind: "event", lbl: "CLASS", short: K.name, ic: "📘", tx: `${m.nama}: ${K.name}, session ${j + 1} of ${Ilmu.SESI.length}`, sub: `${Ilmu.TIER[K.lvl]} class. Each session costs a little energy and mood.`, k: "lesi:" + m.id + ":" + k.id + ":" + j, cid: m.id }); }); }
  }
  for (const i of R.soon) {
    add(i.day, { kind: "open", lbl: i.lbl, short: i.short, ic: i.ic, tx: i.tx, sub: `Open until ${agDay(i.close)}: that's the week to compare the three schools and send one form. ${agCap(i.sub)}.`, k: i.k });
    if (i.startDay != null) startEv({ ...i, done: false, opts: [] }, i.startDay);
  }
  if (S) for (const i of Soon.items(S)) if (i.day - d <= 366 && !i.any && !(ev.get(i.day) || []).some(e => e.k === i.k)) add(i.day, { kind: i.sure === false ? "maybe" : "event", lbl: i.lbl, ic: i.ic, tx: String(i.tx).replace(/\.$/, ""), sub: i.sub, k: i.k, go: i.go, it: i, cid: i.cid });
  for (const E of ev.values()) E.sort((a, b) => AG_RANK[a.kind] - AG_RANK[b.kind]);
  return { ev, band };
}
const A_DEKAT = () => (globalThis.Anak && Anak.SEKOLAH ? Anak.SEKOLAH.dekat.nama : "Old Town Primary");
const agCap = s => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
// target tiap minggu: satu hal yang jelas buat dicapai minggu itu, dengan kemajuan kalau bisa dihitung.
// Urutan: kartu yang jendelanya kena minggu ini > jendela yang buka minggu ini > tanggal tetap minggu ini > rawat harian.
function agGoal(R, ev, ws, we, d) {
  if (we < d) return null;
  for (const c of R.now) {
    if ((c.from ?? d) > we || c.day < ws || (c.done && ws > d)) continue;   // yang sudah beres cukup dicentang di minggu ini
    if (c.lbl === "SCHOOL") return c.done
      ? { tx: `${c.nama} is enrolled at ${(c.opts.find(o => o.picked) || {}).label}. You can still switch until ${agDay(c.day)}.`, prog: "✓", done: true, card: c.k }
      : { tx: `Choose ${c.nama}'s school before ${agDay(c.day)}`, prog: "0/1", card: c.k, warn: c.urgent };
    // kartu les (rekom.js, lbl CLASSES) nggak punya hitungan belajar; dulu jatuh ke cabang belajar dan tampil "undefined/3"
    if (c.lbl === "CLASSES") return c.done
      ? { tx: c.tx, prog: "✓", done: true, card: c.k }
      : { tx: `Pick a class for ${c.nama} by ${agDay(c.day)}`, prog: "0/1", card: c.k };
    return { tx: c.done ? `${c.nama} studied 3 evenings. Ready for the ${c.short.toLowerCase()} on ${agDay(c.day)}.` : `Study with ${c.nama} 3 evenings before the ${c.short.toLowerCase()} on ${agDay(c.day)}`,
      prog: `${c.study}/${Rekom.STUDY_MAX}`, done: c.done, card: c.k, warn: c.urgent };
  }
  for (const i of R.soon) if (i.day >= ws && i.day <= we) return { tx: `School enrolment for ${i.nama} opens ${agDay(i.day)}. Look at the three schools.`, day: i.day };
  // tanggal tetap: cuma milik makhluk (cid) atau sekolah, bukan majalah atau toko
  for (let gd = Math.max(ws, d); gd <= we; gd++) { const e = (ev.get(gd) || []).find(x => x.kind === "event" && ((x.it && x.cid) || String(x.k).startsWith("mulai:"))); if (e) return { tx: `Get ready: ${e.tx}`, day: gd }; }
  return { tx: `Quiet week: feed, wash and play with ${cur.nama} every morning and evening`, day: null };
}
// rolling: minggu ini + 4 minggu berikutnya (5 baris, Senin dulu), tiap baris diikuti target minggunya. agMon = geser per 4 minggu.
const AG_WEEKS = 5;
function agCalendar(R, S, d, goals) {
  const dow = (agDate(d).getUTCDay() + 6) % 7;
  const start = d - dow + agMon * 28, end = start + AG_WEEKS * 7 - 1;
  const { ev, band } = agEvents(R, S, d), sel = agSel;
  let cells = "";
  for (let gd = start; gd <= end; gd++) {
    const D = agDate(gd), n = D.getUTCDate(), E = ev.get(gd) || [], top = E[0];
    const cls = ["cal-c", gd === d ? "cal-now" : "", gd === sel ? "cal-sel" : "", gd < d ? "cal-past" : "", top ? "has" : "", band.has(gd) ? "cal-band" : "", band.has(gd) && !band.has(gd - 1) ? "cal-ba" : "", band.has(gd) && !band.has(gd + 1) ? "cal-bz" : ""].filter(Boolean).join(" ");
    cells += `<button class="${cls}" data-calday="${gd}">${n === 1 ? `<small>${MONTHS[D.getUTCMonth()]}</small>` : ""}<b>${n}</b>${top ? `<span class="cal-tag ${top.kind}">${esc(agShort(top))}</span>` : ""}${E.length > 1 ? `<i class="cal-more">+${E.length - 1}</i>` : ""}</button>`;
    if ((gd - start) % 7 === 6) {
      const g = agGoal(R, ev, gd - 6, gd, d);
      if (g) { goals.push(g); const now = d >= gd - 6 && d <= gd;
        cells += `<button class="cal-goal${g.done ? " done" : ""}${g.warn ? " warn" : ""}${now ? " now" : ""}" data-goal="${goals.length - 1}"><em>${now ? "This week" : "Week goal"}</em><span>${esc(g.tx)}</span>${g.prog ? `<b>${esc(g.prog)}</b>` : ""}</button>`; }
      // detail tanggal yang diketuk muncul tepat di bawah minggunya, jadi nggak perlu gulir cari
      if (sel != null && sel >= gd - 6 && sel <= gd) cells += agDetail(R, ev, band, sel, d);
    }
  }
  const a = agDate(start), z = agDate(end);
  const title = a.getUTCMonth() === z.getUTCMonth() ? `${MONTHS[a.getUTCMonth()]} ${a.getUTCFullYear()}` : `${MONTHS[a.getUTCMonth()]} – ${MONTHS[z.getUTCMonth()]} ${z.getUTCFullYear()}`;
  return `<div class="cal">
    <div class="cal-h"><button class="cal-nav" data-calmon="-1" aria-label="Earlier">‹</button><b>${title}</b><button class="cal-nav" data-calmon="1" aria-label="Later">›</button></div>
    <div class="cal-g">${AG_WD.map(w => `<span class="cal-w">${w}</span>`).join("")}${cells}</div>
    ${sel == null ? `<p class="cal-hint">Tap a date to see what's on it.</p>` : ""}
    <div class="cal-key"><span><i class="cal-tag deadline">Due</i>last day</span><span><i class="cal-tag open">Opens</i>opens</span><span><i class="cal-tag event">Day</i>set day</span><span><i class="bandk"></i>open now</span></div>
  </div>`;
}
// detail tanggal yang diketuk: apa, kenapa penting, dan tombol ke tindakannya
const AG_KIND = { deadline: "Last day", open: "Opens", event: "On this day", maybe: "Maybe" };
function agDetail(R, ev, band, sel, d) {
  const items = ev.get(sel) || [], when = sel === d ? `Today · ${agDay(sel)}` : agDay(sel);
  const openCard = band.has(sel) ? R.now.find(c => c.from != null && !c.done && c.day >= sel) : null;
  const body = items.length ? items.map((e, j) => `<div class="cal-ev ${e.kind}"><span class="ic">${e.ic || "📌"}</span><div>
      <em>${AG_KIND[e.kind]}${e.lbl ? " · " + esc(agCap(e.lbl.toLowerCase())) : ""}</em><b>${esc(e.tx)}</b>${e.sub ? `<p>${esc(e.sub)}</p>` : ""}
      ${e.card ? `<button class="cal-act" data-calit="${j}">See the choices ↓</button>` : e.go ? `<button class="cal-act sec" data-calit="${j}">Open details</button>` : ""}</div></div>`).join("")
    : openCard ? `<div class="cal-ev open"><span class="ic">${openCard.ic}</span><div><em>Window open</em><b>${esc(openCard.tx)}</b><p>${openCard.day - sel} days before it closes on ${agDay(openCard.day)}.</p><button class="cal-act" data-calcard="${esc(openCard.k)}">See the choices ↓</button></div></div>`
    : `<p class="cal-none">Nothing planned. A normal day with ${esc(cur.nama)}.</p>`;
  return `<div class="cal-day"><h4>${esc(when)}<button class="cal-x" data-calclose="1" aria-label="Close">×</button></h4>${body}</div>`;
}
function showAgenda(recap) {
  if (!game || !cur) return;
  if (recap !== undefined) agRecap = recap; else recap = agRecap;
  const R = agendaCards(), d = today(), goals = [];
  // "Coming up": jendela yang bakal kebuka dulu, lalu tanggal lain dari soon.js (yang sudah jadi kartu "now" nggak diulang)
  const S = aheadSnap(), nowK = new Set(R.now.map(c => c.k));
  const soon = R.soon.concat(S ? Soon.items(S).filter(i => i.day - d <= AGENDA_SOON_DAYS && !nowK.has(i.k)) : []).slice(0, AGENDA_SOON);
  const left = n => n <= 0 ? `<i class="days"><b>now</b><small>today</small></i>` : `<i class="days"><b>${n}</b><small>${n === 1 ? "day" : "days"}</small></i>`;
  // kartu "Can do now": tiap pilihan = kartu sendiri (di mana, seperti apa, anak dapat apa), yang direkomendasikan diberi lencana dan alasannya
  const G = { "+": "up", "−": "down", "=": "eq" };
  const choice = (c, o, ix, j) => `<div class="ag-choice${o.star ? " star" : ""}${o.picked ? " picked" : ""}">
      ${o.picked ? `<span class="ag-badge ok">✓ Your choice</span>` : o.star ? `<span class="ag-badge">★ Recommended</span>` : ""}
      <div class="ag-ch-h"><span class="ag-ic">${o.ic || "•"}</span><span><b>${esc(o.label)}</b>${o.where ? `<small>📍 ${esc(o.where)}</small>` : ""}</span></div>
      ${o.like ? `<p class="ag-like">${esc(o.like)}</p>` : ""}
      ${o.gets ? `<div class="ag-gets"><em>What ${esc(c.nama)} gets</em>${o.gets.map(([g, t]) => `<span class="${G[g] || "eq"}"><i>${g}</i>${esc(t)}</span>`).join("")}</div>` : ""}
      ${o.star && c.starWhy && !o.picked ? `<p class="ag-why"><b>Why we recommend it:</b> ${esc(c.starWhy)}</p>` : ""}
      <button class="ag-pick" data-ag="${ix}:${j}" ${canCare() && !o.picked && (!o.price || (wallet() && wallet().koin >= o.price)) ? "" : "disabled"}>${o.picked ? (c.lbl === "SCHOOL" ? "✓ Enrolled here" : "✓ Done") : c.lbl === "SCHOOL" && c.done ? "Switch to this school" : esc(o.btn || c.pickLabel || o.label)}</button>
    </div>`;
  const card = (c, ix) => {
    const opts = c.opts.map((o, j) => [o, j]).sort((a, b) => (b[0].picked - a[0].picked) || (b[0].star - a[0].star));
    const many = c.opts.length > 1;
    return `<div class="ag-card${c.done ? " done" : ""}${c.urgent ? " urgent" : ""}" data-card="${esc(c.k)}">
      <div class="ag-head">${c.done ? `<i class="days ok"><b>✓</b><small>done</small></i>` : left(c.left)}<span class="grow"><b><em class="k">${esc(c.lbl)}:</em> ${esc(c.tx)}</b>
        <small class="sub">${c.done ? "" : `Closes ${esc(agDay(c.day))} · `}${esc(c.why)}</small></span></div>
      ${c.study != null ? `<div class="ag-steps">${Array.from({ length: Rekom.STUDY_MAX }, (_, k) => `<i class="${k < c.study ? "on" : ""}"></i>`).join("")}<small>${c.study}/${Rekom.STUDY_MAX} evenings</small></div>` : ""}
      ${many && !(c.more === "les" && c.done) ? `<p class="ag-hint">${c.more === "les" ? `The ${c.opts.length} classes that fit best right now. Press the button on the one you want.` : `${c.opts.length} options. Read them, then press the button on the one you want.`}</p>` : ""}
      ${opts.length && !(c.more === "les" && c.done) ? `<div class="ag-choices">${opts.map(([o, j]) => choice(c, o, ix, j)).join("")}</div>` : ""}
      ${c.more === "les" ? `<button class="secondary" data-agles="${esc(c.cid)}">See all classes for ${esc(c.nama)}</button>` : ""}
    </div>`;
  };
  const row = (i, ix) => `<button class="line ahead${i.sure === false ? " maybe" : ""}" data-agsoon="${ix}">${left(i.day - d)}<span class="grow"><b><em class="k">${esc(i.lbl || "SOON")}:</em> ${esc(i.tx)}</b><small class="sub">${esc(fmtDate(i.day))}${i.sub ? " · " + esc(i.sub) : ""}</small></span></button>`;
  // rekap pendek: kalimat pertama tiap kejadian besar, paling banyak 3; cerita lengkapnya di diary
  const first = t => { const m = String(t).match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : String(t); };
  const rc = recap && recap.logs.length ? `<div class="ag-recap"><h3>While you were away · ${recap.days} days</h3>${recap.logs.slice(-3).map(l => `<p><b>${esc(l.name)}:</b> ${md(first(l.lines.filter(x => !/^_/.test(x)).join(" ") || l.lines[0]))}</p>`).join("")}<button class="linkish" id="agDiary">Read it all in the diary</button></div>` : "";
  openSheet("agenda", `
    <span class="ribbon">CALENDAR · ${esc(fmtDate(d))}</span>
    ${agCalendar(R, S, d, goals)}
    <h2>Can do now</h2>
    ${R.now.length ? `<div class="ag-list">${R.now.map(card).join("")}</div>` : `<p class="muted">Nothing that needs you today. Just look after ${esc(cur.nama)}.</p>`}
    ${rc}
    <h2>Coming up</h2>
    ${soon.length ? `<div class="list">${soon.map(row).join("")}</div>` : `<p class="muted">Nothing with a date in the next ${AGENDA_SOON_DAYS} days.</p>`}
    <div class="ag-more">${ilmuOn() && cur.umur >= Ilmu.MIN_AGE ? `<button class="secondary" id="agWeek">Free time</button><button class="secondary" id="agLes">Classes</button>` : ""}<button class="secondary" id="agAhead">Everything ahead</button><button class="secondary" id="agFocus">${focus ? `Focus session · ${focusClock(focusLeftMs())}` : `Focus together ${FOCUS_MIN} min`}</button></div>
    <button class="big" data-close="1">Go to ${esc(cur.nama)}</button>`);
  sheet.querySelectorAll("[data-ag]").forEach(b => b.onclick = () => {
    const [i, j] = b.dataset.ag.split(":").map(Number), c = R.now[i], o = c && c.opts[j];
    if (!o) return;
    if (c.cid !== selected) select(c.cid);
    Tele.ev("agenda", { a: "pilih", k: c.k.split(":")[0], o: o.id, star: o.star ? 1 : 0, sisa: c.left });
    if (o.price && (!wallet() || wallet().koin < o.price)) return;
    if (game.act(c.cid, o.act)) { if (o.price) wallet().koin -= o.price; drainNoon(); save(); refresh(); showAgenda(); if (o.act === "belajar") say("I'll ace it!"); else if (o.price) say(`${o.label}? Okay!`); }
  });
  sheet.querySelectorAll("[data-agles]").forEach(b => b.onclick = () => showLes(b.dataset.agles));
  sheet.querySelectorAll("[data-agsoon]").forEach(b => b.onclick = () => { const i = soon[+b.dataset.agsoon]; if (i && i.go) aheadGo(i); else showAhead(); });
  $("agAhead").onclick = () => showAhead();
  if ($("agLes")) { $("agLes").onclick = () => showLes(); $("agWeek").onclick = () => showWeek(); }
  sheet.querySelectorAll("[data-calmon]").forEach(b => b.onclick = () => { agMon += +b.dataset.calmon; agSel = null; showAgenda(); });
  const toCard = k => { const el = k && sheet.querySelector(`[data-card="${CSS.escape(k)}"]`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return !!el; };
  sheet.querySelectorAll("[data-calday]").forEach(b => b.onclick = () => { const v = +b.dataset.calday; agSel = agSel === v ? null : v; showAgenda(); const el = sheet.querySelector(".cal-day"); if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
  sheet.querySelectorAll("[data-calit]").forEach(b => b.onclick = () => {
    const e = (agEvents(R, S, d).ev.get(agSel) || [])[+b.dataset.calit]; if (!e) return;
    if (e.card) toCard(e.card); else if (e.it && e.go) aheadGo(e.it);
  });
  sheet.querySelectorAll("[data-calcard]").forEach(b => b.onclick = () => toCard(b.dataset.calcard));
  sheet.querySelectorAll("[data-calclose]").forEach(b => b.onclick = () => { agSel = null; showAgenda(); });
  sheet.querySelectorAll("[data-goal]").forEach(b => b.onclick = () => {
    const g = goals[+b.dataset.goal]; if (!g) return;
    if (g.card && toCard(g.card)) return;
    if (g.day != null) { agSel = g.day; showAgenda(); }
  });
  if ($("agDiary")) $("agDiary").onclick = () => showDiary();
  $("agFocus").onclick = () => { Tele.ev("fokus", { a: "buka" }); showFocus(); };
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

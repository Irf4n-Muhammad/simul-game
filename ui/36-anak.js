// ================================================================ v46: fase anak (anak.js): app School di tablet, catatan kunci, kalender
// Rancangan: riset/fase-kehidupan.md bagian 6. App School cuma baca: kalender sekolah tetap (sama buat semua yang seumur), nilai
// ulangan, rapor, sahabat, bakat. Tanggalnya kota, isinya makhluk (dan sedikit pemain: malam belajar). Hasilnya nggak ditulis di sini.
const scCap = s => s.charAt(0).toUpperCase() + s.slice(1);
const scWhen = (x, d) => x === d ? "today" : x === d + 1 ? "tomorrow" : `in ${x - d} days`;
// tanggal sekolah berikutnya (hari ini kalau belum selesai), atau null; dipakai lencana, notifikasi lock screen, kartu di app
function scNext(c, d) { return globalThis.Anak ? Anak.calendar(c, d).find(k => k.day > d || (k.day === d && !k.done)) || null : null; }
function phSchool(c) {
  const d = today(), age = c.age(d), K = Anak.calendar(c, d), s = c.info.sahabat, lama = c.info.sahabat_lama, R = c.info.rapor || [], N = c.info.nilai || {}, u = c.info.ujian;
  const nx = scNext(c, d), n = esc(c.name), teen = age >= 180;
  Tele.ev("sekolah", { a: "buka", nilai: Object.keys(N).length, rapor: R.length, sahabat: s ? s.jenis : lama ? "pindah" : "-" });
  const grade = q => q ? Anak.GRADE[q.g] : "";
  const evenings = q => `${q.belajar === 0 ? "no" : q.belajar === 1 ? "one" : q.belajar === 2 ? "two" : "three"} study evening${q.belajar === 1 ? "" : "s"}${q.sendiri ? `, studied alone ${q.sendiri === 1 ? "once" : q.sendiri === 2 ? "twice" : "three times"}` : ""}`;
  const row = k => `<div class="pa-row${k.done ? " sc-done" : k.day === d ? " sc-now" : k.past ? " sc-past" : ""}"><i class="sc-ic">${k.done ? "✓" : k.ic}</i><span class="pa-grow"><b>${esc(scCap(k.label))}</b><small>${esc(fmtDate(k.day))}${k.nilai ? " · " + esc(grade(k.nilai)) : k.rapor ? " · " + esc(Anak.GRADE[k.rapor.nilai] || "no quiz on record") : k.done ? "" : k.past ? " · missed" : " · " + scWhen(k.day, d)}</small></span></div>`;
  const quizzes = Object.entries(N).sort((a, b) => a[1].d - b[1].d).map(([k, q], i) => `<div class="pa-row"><span class="pa-grow"><b>Quiz ${i + 1} · ${esc(grade(q))}</b><small>${esc(fmtDate(q.d))} · ${esc(evenings(q))}</small></span></div>`)
    .concat(u && u.hari > d ? [`<div class="pa-row sc-now"><span class="pa-grow"><b>${u.jenis === "akhir" ? "Final exams" : "Quiz"} ${scWhen(u.hari, d)}</b><small>${esc(evenings(u))} so far. A study evening still counts.</small></span></div>`] : []);
  const reports = R.map(r => `<div class="pa-row"><span class="pa-grow"><b>${r.kal === "rapor_1" ? "First report card" : "End-of-year report card"} · ${esc(Anak.GRADE[r.nilai] || "No quiz on record")}</b><small>${esc(fmtDate(r.d))} · ${r.teman === 0 ? "no friends yet" : r.teman === 1 ? "one friend" : r.teman + " friends"} · “${esc(r.catatan)}”</small></span></div>`);
  const friend = s ? `<div class="pa-row"><span class="pa-grow"><b>${esc(s.nama)}</b><small>Best friends since ${esc(fmtDate(s.sejak))}${s.jenis === "pemain" ? " · another family's creature" : ""}${c.info.ribut ? " · not speaking right now. Give it three days." : ""}</small></span></div>`
    : lama ? `<div class="pa-row"><span class="pa-grow"><b>${esc(lama.nama)} moved away</b><small>${esc(fmtDate(lama.pergi))} · a new best friend usually turns up within a couple of weeks.</small></span></div>`
    : `<div class="pa-row"><span class="pa-grow"><b>No best friend yet</b><small>Usually in the first weeks of school.</small></span></div>`;
  const b = c.info.bakat;
  const talent = b ? `<div class="pa-row"><span class="pa-grow"><b>${esc(scCap(b))}</b><small>Spotted by the teacher. ${c.has("les", d) ? "Taking lessons every week." : "Practising alone, when they feel like it."}</small></span></div>`
    : `<div class="pa-row"><span class="pa-grow"><b>Not shown yet</b><small>The teacher usually notices something by 110 days old.</small></span></div>`;
  return `${phHead("School", teen ? "Old Town Middle School · the new timetable comes with the new term" : "Old Town Primary · the same days for every creature born the same week")}
    <div class="pa-card school"><small>${esc(c.name.toUpperCase())} · ${teen ? "YEAR TWO" : "YEAR ONE"}</small><b>${nx ? esc(scCap(nx.label)) : "Nothing left on the calendar"}</b><span>${nx ? esc(scWhen(nx.day, d)) + " · " + esc(fmtDate(nx.day)) : "The next term brings a new one."}</span></div>
    <h4 class="pa-h">This year</h4><div class="pa-list">${K.map(row).join("")}</div>
    <h4 class="pa-h">Quizzes</h4><div class="pa-list">${quizzes.length ? quizzes.join("") : `<div class="pa-row"><span class="pa-grow"><b>None yet</b><small>The first one is announced three days before.</small></span></div>`}</div>
    <h4 class="pa-h">Report cards</h4><div class="pa-list">${reports.length ? reports.join("") : `<div class="pa-row"><span class="pa-grow"><b>None yet</b><small>Three lines in the teacher's hand: marks, friends, and a note.</small></span></div>`}</div>
    <h4 class="pa-h">Best friend</h4><div class="pa-list">${friend}</div>
    <h4 class="pa-h">Talent</h4><div class="pa-list">${talent}</div>
    <p class="pa-note">School runs on a fixed calendar, the same for every creature born the same week. The dates are set. The marks, the friends and the teacher's note are ${n}'s to write.</p>`;
}

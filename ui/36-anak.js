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
  const S = Anak.sekolahOf(c), L = c.info.liburan, FT = c.info.field_trip;
  Tele.ev("sekolah", { a: "buka", nilai: Object.keys(N).length, rapor: R.length, sahabat: s ? s.jenis : lama ? "pindah" : "-", pilih: S.dipilih ? S.id : "-" });
  const grade = q => q ? Anak.GRADE[q.g] : "";
  const evenings = q => `${q.belajar === 0 ? "no" : q.belajar === 1 ? "one" : q.belajar === 2 ? "two" : "three"} study evening${q.belajar === 1 ? "" : "s"}${q.sendiri ? `, studied alone ${q.sendiri === 1 ? "once" : q.sendiri === 2 ? "twice" : "three times"}` : ""}`;
  const row = k => `<div class="pa-row${k.done ? " sc-done" : k.day === d ? " sc-now" : k.past ? " sc-past" : ""}"><i class="sc-ic">${k.done ? "✓" : k.ic}</i><span class="pa-grow"><b>${esc(scCap(k.label))}</b><small>${esc(fmtDate(k.day))}${k.nilai ? " · " + esc(grade(k.nilai)) : k.rapor ? " · " + esc(Anak.GRADE[k.rapor.nilai] || "no quiz on record") : k.done ? (k.hasil ? " · " + esc(k.hasil) : "") : k.past ? " · missed" : " · " + scWhen(k.day, d)}</small></span></div>`;
  const quizzes = Object.entries(N).sort((a, b) => a[1].d - b[1].d).map(([k, q], i) => `<div class="pa-row"><span class="pa-grow"><b>Quiz ${i + 1} · ${esc(grade(q))}</b><small>${esc(fmtDate(q.d))} · ${esc(evenings(q))}</small></span></div>`)
    .concat(u && u.hari > d ? [`<div class="pa-row sc-now"><span class="pa-grow"><b>${u.jenis === "akhir" ? "Final exams" : "Quiz"} ${scWhen(u.hari, d)}</b><small>${esc(evenings(u))} so far. A study evening still counts.</small></span></div>`] : []);
  const reports = R.map(r => `<div class="pa-row"><span class="pa-grow"><b>${r.kal === "rapor_1" ? "First report card" : "End-of-year report card"} · ${esc(Anak.GRADE[r.nilai] || "No quiz on record")}</b><small>${esc(fmtDate(r.d))} · ${r.teman === 0 ? "no friends yet" : r.teman === 1 ? "one friend" : r.teman + " friends"} · “${esc(r.catatan)}”</small></span></div>`);
  const friend = s ? `<div class="pa-row"><span class="pa-grow"><b>${esc(s.nama)}</b><small>Best friends since ${esc(fmtDate(s.sejak))}${s.jenis === "pemain" ? " · another family's creature" : ""}${c.info.ribut ? " · not speaking right now. Give it three days." : ""}</small></span></div>`
    : lama ? `<div class="pa-row"><span class="pa-grow"><b>${esc(lama.nama)} moved away</b><small>${esc(fmtDate(lama.pergi))} · a new best friend usually turns up within a couple of weeks.</small></span></div>`
    : `<div class="pa-row"><span class="pa-grow"><b>No best friend yet</b><small>Usually in the first weeks of school.</small></span></div>`;
  const b = c.info.bakat;
  const talent = b ? `<div class="pa-row"><span class="pa-grow"><b>${esc(scCap(b))}</b><small>Spotted by the teacher. ${c.has("les", d) ? "Taking lessons every week." : c.has("les_aman", d) ? "Maths tutoring on Tuesdays; practising alone otherwise." : "Practising alone, when they feel like it."}</small></span></div>`
    : `<div class="pa-row"><span class="pa-grow"><b>Not shown yet</b><small>The teacher usually notices something by 110 days old.</small></span></div>`;
  // v46.1: pilihan lingkungan (anak.js bagian 5): sekolah, les, field trip, liburan. Yang belum: kapan ditanya. Tur "?" = lingkungan.
  const who = p => p.oleh === "wali" ? "your call" : p.oleh === "sendiri" ? `${n} decided` : "by default";
  const pil = (title, val, sub) => `<div class="pa-row"><span class="pa-grow"><b>${esc(title)}</b><small>${esc(val)}${sub ? " · " + esc(sub) : ""}</small></span></div>`;
  const choices = [
    pil("School", S.dipilih || age >= 60 ? `${S.nama}, ${S.di}` : "Three schools take creatures born this week", S.dipilih ? who(S) : age >= 60 ? "by default" : `letters come ${scWhen(c.born + 56, d)}`),
    pil("Lessons", b ? (c.has("les", d) ? `${scCap(b)} lessons every week` : c.has("les_aman", d) ? "Maths tutoring on Tuesdays" : "None for now") : "Asked when the talent shows", b ? (c.info.les_pilihan ? who(c.info.les_pilihan) : "") : "by 110 days old"),
    pil("Week off", L ? scCap(Anak.TUJUAN[L.id]) : age >= 121 ? scCap(Anak.TUJUAN.danau) : `Asked ${scWhen(c.born + 116, d)}`, L ? who(L) : age >= 121 ? "by default" : "five days before the week off"),
    pil("Class trip", FT ? (FT.ikut ? "Signed, lunch packed" : "Not this time") : age >= 134 ? "Signed" : `Slip comes home ${scWhen(c.born + 131, d)}`, FT ? who(FT) : age >= 134 ? "by default" : "three days before the trip"),
  ];
  return `${phHead("School", teen ? "Old Town Middle School · the new timetable comes with the new term" : `${S.nama} · the same days for every creature born the same week`)}
    <div class="pa-card school"><small>${esc(c.name.toUpperCase())} · ${teen ? "YEAR TWO" : "YEAR ONE"}</small><b>${nx ? esc(scCap(nx.label)) : "Nothing left on the calendar"}</b><span>${nx ? esc(scWhen(nx.day, d)) + " · " + esc(fmtDate(nx.day)) : "The next term brings a new one."}</span></div>
    <h4 class="pa-h">This year</h4><div class="pa-list">${K.map(row).join("")}</div>
    <h4 class="pa-h">Quizzes</h4><div class="pa-list">${quizzes.length ? quizzes.join("") : `<div class="pa-row"><span class="pa-grow"><b>None yet</b><small>The first one is announced three days before.</small></span></div>`}</div>
    <h4 class="pa-h">Report cards</h4><div class="pa-list">${reports.length ? reports.join("") : `<div class="pa-row"><span class="pa-grow"><b>None yet</b><small>Three lines in the teacher's hand: marks, friends, and a note.</small></span></div>`}</div>
    <h4 class="pa-h">Best friend</h4><div class="pa-list">${friend}</div>
    <h4 class="pa-h">Talent</h4><div class="pa-list">${talent}</div>
    <h4 class="pa-h">Your choices <button class="qmini" data-tour="lingkungan" aria-label="How this works">?</button></h4><div class="pa-list">${choices.join("")}</div>
    <p class="pa-note">School runs on a fixed calendar, the same for every creature born the same week. The dates are set. The marks, the friends and the teacher's note are ${n}'s to write.</p>`;
}
// v46.1: tur "lingkungan" sekali, begitu pilihan sekolah ada (di hari jawab atau default); ulang lewat "?" di app School
EXTRA_TOURS.push({ id: "lingkungan", when: () => { const c = cur && game && game.home.get(cur.id); return !!(c && c.info.sekolah_pilihan && c.age(today()) < 75); } });

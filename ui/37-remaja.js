// ================================================================ v47: fase remaja (remaja.js): app School remaja, kartu "gw siapa" di profil, tur aturan rumah
// Rancangan: riset/fase-kehidupan.md bagian 7. App School cuma baca: kalender angkatan (sama buat semua yang seumur), ulangan dan ujian
// akhir, rapor, sahabat, bakat, aturan rumah (paket yang dipilih hari 180 dan siapa yang mutusin), pilihan remaja (izin kerja, jalur
// sesudah lulus). Tanggalnya kota, isinya makhluk. Peran pemain di fase ini: pasang pagar lalu minggir.
const RAPOR_LBL = { rapor_1: "First report card", rapor_2: "End-of-year report card", rapor_3: "Mid-year report", rapor_4: "Last report card" };
const JALUR_LBL = { kuliah: "College first", kerja: "Straight to work", gap: "A gap year" };
function phSchoolTeen(c) {
  const d = today(), age = c.age(d), K = Remaja.calendar(c, d), s = c.info.sahabat, lama = c.info.sahabat_lama, R = c.info.rapor || [], N = c.info.nilai || {}, u = c.info.ujian, I = c.info;
  const nx = scNext(c, d), n = esc(c.name), A = Remaja.aturanOf(c), KT = Remaja.KATA, SK = Anak.sekolahOf(c);
  Tele.ev("sekolah", { a: "buka", nilai: Object.keys(N).length, rapor: R.length, sahabat: s ? s.jenis : lama ? "pindah" : "-", pilih: SK.dipilih ? SK.id : "-", aturan: A.dipilih ? A.id : "-" });
  const grade = q => q ? Anak.GRADE[q.g] : "";
  const evenings = q => `${q.belajar === 0 ? "no" : q.belajar === 1 ? "one" : q.belajar === 2 ? "two" : "three"} study evening${q.belajar === 1 ? "" : "s"}${q.sendiri ? `, studied alone ${q.sendiri === 1 ? "once" : q.sendiri === 2 ? "twice" : "three times"}` : ""}`;
  const row = k => `<div class="pa-row${k.done ? " sc-done" : k.day === d ? " sc-now" : k.past ? " sc-past" : ""}"><i class="sc-ic">${k.done ? "✓" : k.ic}</i><span class="pa-grow"><b>${esc(scCap(k.label))}</b><small>${esc(fmtDate(k.day))}${k.nilai ? " · " + esc(grade(k.nilai)) : k.rapor ? " · " + esc(Anak.GRADE[k.rapor.nilai] || "no quiz on record") : k.done ? (k.hasil ? " · " + esc(k.hasil) : "") : k.past ? " · missed" : " · " + scWhen(k.day, d)}</small></span></div>`;
  const quizzes = Object.entries(N).sort((a, b) => a[1].d - b[1].d).map(([k, q], i) => `<div class="pa-row"><span class="pa-grow"><b>${k === "ujian_akhir" ? "Final exams" : `Quiz ${i + 1}`} · ${esc(grade(q))}</b><small>${esc(fmtDate(q.d))} · ${esc(evenings(q))}</small></span></div>`)
    .concat(u && u.hari > d ? [`<div class="pa-row sc-now"><span class="pa-grow"><b>${u.jenis === "akhir" ? "Final exams" : "Quiz"} ${scWhen(u.hari, d)}</b><small>${esc(evenings(u))} so far. A study evening still counts.</small></span></div>`] : []);
  const reports = R.map(r => `<div class="pa-row"><span class="pa-grow"><b>${RAPOR_LBL[r.kal] || "Report card"} · ${esc(Anak.GRADE[r.nilai] || "No quiz on record")}</b><small>${esc(fmtDate(r.d))} · ${r.teman === 0 ? "no friends yet" : r.teman === 1 ? "one friend" : r.teman + " friends"} · “${esc(r.catatan)}”</small></span></div>`);
  const friend = s ? `<div class="pa-row"><span class="pa-grow"><b>${esc(s.nama)}</b><small>Best friends since ${esc(fmtDate(s.sejak))}${s.jenis === "pemain" ? " · another family's creature" : ""}${c.info.ribut ? " · not speaking right now. Give it three days." : ""}</small></span></div>`
    : lama ? `<div class="pa-row"><span class="pa-grow"><b>${esc(lama.nama)} moved away</b><small>${esc(fmtDate(lama.pergi))} · a new best friend usually turns up within a couple of weeks.</small></span></div>`
    : `<div class="pa-row"><span class="pa-grow"><b>No best friend yet</b><small>Someone from the year group, usually.</small></span></div>`;
  const b = c.info.bakat;
  const talent = b ? `<div class="pa-row"><span class="pa-grow"><b>${esc(scCap(b))}</b><small>Spotted back in primary school. ${I.cita ? `Future ${esc(I.cita)}, says the wall above the bed.` : "The dream job comes in its own time."}</small></span></div>`
    : `<div class="pa-row"><span class="pa-grow"><b>Nothing the teachers named</b><small>${I.hobi ? `The hobby is ${esc(I.hobi.label)}.` : "A hobby of their own comes in the teen years."}</small></span></div>`;
  // aturan rumah (remaja.js bagian 1): paket yang dipilih hari 180, atau yang biasa kalau nggak dijawab / save lama. Tur "?" = aturan.
  const who = p => p.oleh === "wali" ? "your call" : p.oleh === "sendiri" ? `${n} decided` : "by default";
  const pil = (title, val, sub) => `<div class="pa-row"><span class="pa-grow"><b>${esc(title)}</b><small>${esc(val)}${sub ? " · " + esc(sub) : ""}</small></span></div>`;
  const rsub = A.dipilih ? (A.oleh === "wali" ? "your call, at 180 days old" : "the usual rules, since nobody said otherwise") : age >= 180 ? "the usual rules" : `asked once, at 180 days old`;
  const rules = [
    pil("Curfew", KT.jam_malam[A.rules.jam_malam] || "none set", rsub),
    pil("Dating", scCap(KT.pacaran[A.rules.pacaran] || "not discussed"), rsub),
    pil("Pocket money", KT.jajan[A.rules.jajan] || "none", "into the jar, every Monday"),
    pil("School", "Goes, no question", "the one rule nobody picked"),
  ];
  // pilihan remaja: izin kerja sambilan (jendela 215–240 kalau makhluknya ambisius), jalur sesudah lulus (266)
  const sj = I.sambilan_izin;
  const choices = [
    pil("Part-time job", sj ? (sj.id === "boleh" ? `Signed: the ${sj.tempat}` : `After the exams: the ${sj.tempat}`) : I.sambilan ? `The ${I.sambilan}` : c.traits.ambisius > 40 ? (age < 240 ? "If a form comes home, between 215 and 240 days old" : "No form came home") : "Not this year, says " + n, sj ? who(sj) : ""),
    pil("After school", I.jalur ? JALUR_LBL[I.jalur] || I.jalur : age >= 266 ? "Being decided" : "Asked the day after the results, at 266 days old", I.jalur ? (I.jalur_oleh === "wali" ? "your call" : I.jalur_oleh === "sendiri" ? `${n} decided` : `${n}'s call, with your advice`) : ""),
  ];
  return `${phHead("School", "Old Town Middle School · the same days for every creature born the same week")}
    <div class="pa-card school"><small>${esc(c.name.toUpperCase())} · ${I.lulus ? `CLASS OF ${Remaja.classOf(c)}` : "MIDDLE SCHOOL"}</small><b>${nx ? esc(scCap(nx.label)) : I.lulus ? `Finished, with ${esc(I.lulus)} grades` : "Nothing left on the calendar"}</b><span>${nx ? esc(scWhen(nx.day, d)) + " · " + esc(fmtDate(nx.day)) : "The last day of school is behind them."}</span></div>
    <h4 class="pa-h">This year</h4><div class="pa-list">${K.map(row).join("")}</div>
    <h4 class="pa-h">Quizzes and exams</h4><div class="pa-list">${quizzes.length ? quizzes.join("") : `<div class="pa-row"><span class="pa-grow"><b>None yet</b><small>The first one is announced three days before.</small></span></div>`}</div>
    <h4 class="pa-h">Report cards</h4><div class="pa-list">${reports.length ? reports.join("") : `<div class="pa-row"><span class="pa-grow"><b>None yet</b><small>Marks, friends, and a line from the form tutor.</small></span></div>`}</div>
    <h4 class="pa-h">Best friend</h4><div class="pa-list">${friend}</div>
    <h4 class="pa-h">Talent</h4><div class="pa-list">${talent}</div>
    <h4 class="pa-h">House rules <button class="qmini" data-tour="aturan" aria-label="How this works">?</button></h4><div class="pa-list">${rules.join("")}</div>
    <h4 class="pa-h">Your choices</h4><div class="pa-list">${choices.join("")}</div>
    <p class="pa-note">The rules were set once, at 180 days old. From here ${n} decides; you get asked, and about one time in five ${n} does it their own way. The dates are the town's. The rest is ${n}'s.</p>`;
}
// ---- kartu "gw siapa" di profil (remaja.js siapa()): keisi sepanjang remaja dari tonggak rentang; sesudah lulus judulnya "Class of 2027: …"
// (bahan banding antar pemain tanpa angka). Sebelum remaja nggak ada; sesudah remaja cuma baris yang terisi.
function siapaBox(id) {
  const c = game.home.get(id); if (!c || !globalThis.Remaja) return "";
  const d = today(); if (c.age(d) < 180) return "";
  const S = Remaja.siapa(c, d), rows = S.teen ? S.rows : S.rows.filter(r => r.done);
  if (!rows.length) return "";
  Tele.ev("siapa", { a: "lihat", isi: S.n, fase: S.teen ? "remaja" : "lewat" });
  const row = r => `<div class="line ${r.done ? "tg-done" : "tg-later"}"><i class="tg-ic">${r.done ? r.ic : "?"}</i><span class="grow"><b>${esc(r.done ? `${r.label}: ${r.val}` : r.label)}</b><small class="sub">${esc(r.sub)}</small></span></div>`;
  const nm = esc(c.name);
  return `<div class="fieldset" id="siapaBox"><span class="lbl">${esc(S.title)} · ${S.n} of ${S.rows.length}<button class="qmini" data-tour="siapa" aria-label="How this works">?</button></span><div class="list">${rows.map(row).join("")}</div>
    ${S.teen ? `<span class="sub">Who ${nm} is turning into, filled in as it happens. Nothing here is a score, and nothing is yours to set.</span>`
      : S.lulus ? `<span class="sub">Finished school with ${esc(S.lulus.nilai)} grades${S.lulus.jalur ? `, then ${esc((JALUR_LBL[S.lulus.jalur] || S.lulus.jalur).toLowerCase())}` : ""}.</span>` : ""}</div>`;
}
// tur: aturan rumah sekali begitu paketnya ada (hari 180, dijawab atau default); "gw siapa" begitu baris pertamanya keisi. Ulang lewat "?".
EXTRA_TOURS.push({ id: "aturan", when: () => { const c = cur && game && game.home.get(cur.id); return !!(c && c.info.aturan_rumah && c.age(today()) < 195); } });
EXTRA_TOURS.push({ id: "siapa", when: () => { const c = cur && game && game.home.get(cur.id); if (!c) return false; const a = c.age(today()); return a >= 180 && a < 270 && !!(c.info.cita || c.info.hobi || c.info.gaya || c.fired.suara_berubah || c.fired.kota_sendiri); } });

// ================================================================ v45: tonggak tumbuh bayi (tonggak.js) dan v46 tonggak anak (anak.js): tangga di profil, rak "Later" di tablet
// Rancangan: riset/fase-kehidupan.md (bagian bayi, 26 Okt). Tangga = semua tonggak dengan statusnya: yang sudah lewat pakai umur saat
// terjadi, yang berikutnya disorot, yang jauh diredupkan. Rak "Later" = app yang belum kebuka, dengan harinya: yang nggak kelihatan nggak bisa ditunggu.
function tonggakBox(id) {
  const c = game.home.get(id); if (!c || !globalThis.Tonggak) return "";
  const d = today(), age = c.age(d), ph = Engine.phase_of(age), cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  // v46: tangga penuh cuma buat fase yang sedang jalan (bayi: tonggak.js, anak: anak.js); fase yang sudah lewat jadi satu baris ringkas
  const VB = Tonggak.view(c, d), VA = globalThis.Anak ? Anak.view(c, d) : [], VR = globalThis.Remaja ? Remaja.view(c, d) : [];   // v47: tangga remaja
  const V = ph === "bayi" ? VB : ph === "anak" ? VA : ph === "remaja" ? VR : VR.some(v => v.done) ? VR : VA.some(v => v.done) ? VA : VB, live = ph === "bayi" || ph === "anak" || ph === "remaja";
  const rows = live ? V : V.filter(v => v.done);
  if (!rows.length && !VB.some(v => v.done)) return "";
  const nextIx = rows.findIndex(v => !v.done && !v.fixed);
  const TB = c.info.timbang || {}, G = c.info.garis || [], KA = c.info.klinik_anak || {};   // v46.1: ringkasan klinik anak
  const when = v => {
    if (v.done) { const m = TB[v.id], g = v.id === "garis_pintu" && G[G.length - 1]; return (v.at >= 0 ? `at ${fmtAge(v.at)} old` : "done") + (m ? ` · ${m.kg} kg, ${m.cm} cm` : g ? ` · ${g.cm} cm` : KA[v.id] ? ` · ${KA[v.id].ringkas}` : v.note ? ` · ${v.note}` : ""); }
    if (v.fixed) return c.born + v.lo <= d ? "any day now · a clinic date" : `${fmtWhen(c.born + v.lo).toLowerCase()} · a clinic date`;
    return v.open ? `any day now · usually by ${v.hi} days old` : `usually at ${v.lo}–${v.hi} days old`;
  };
  const row = (v, i) => `<div class="line ${v.done ? "tg-done" : i === nextIx ? "tg-next" : "tg-later"}"><i class="tg-ic">${v.done ? "✓" : v.ic}</i><span class="grow"><b>${esc(cap(v.label))}</b><small class="sub">${esc(when(v))}</small></span></div>`;
  const n = rows.filter(v => v.done).length, nb = VB.filter(v => v.done).length, VAa = VA.filter(v => !v.fixed), na = VAa.filter(v => v.done).length;
  // fase bayi yang sudah lewat: satu baris, dengan kata pertama dan benda kesayangan kalau ada
  const bayi = V !== VB && nb ? `<span class="sub">As a baby: ${nb} of ${VB.length} firsts${c.info.kata_pertama ? `, first word “${esc(c.info.kata_pertama)}”` : ""}${c.info.kesayangan ? `, still fond of ${esc(c.info.kesayangan)}` : ""}.</span>` : "";
  // v47: fase anak yang sudah lewat (remaja ke atas): satu baris, dengan sahabatnya
  const sah = c.info.sahabat || c.info.sahabat_lama;
  const anak = V !== VB && V !== VA && na ? `<span class="sub">As a child: ${na} of ${VAa.length} firsts${sah ? `, best friends with ${esc(sah.nama)}` : ""}.</span>` : "";
  Tele.ev("tonggak", { a: "lihat", sudah: n, fase: live ? ph : "lewat", watak: Tonggak.watak(c, d).filter(v => v.done).length });
  return `<div class="fieldset" id="tonggakBox"><span class="lbl">Growing up · ${n} of ${V.length}</span>${bayi}${anak}${rows.length ? `<div class="list">${rows.map(row).join("")}</div>` : ""}
    ${live ? `<span class="sub">Each one comes in its own time, inside ${esc(c.name)}'s own window. Nothing you do hurries it, and it can't be missed.</span>` : ""}</div>`;
}

// ---- v45.1: kartu "Getting to know": enam pengamatan watak (Tonggak.watak). Yang sudah kebaca pakai kalimatnya, yang belum pakai topiknya
// dengan jendelanya; sesudah bayi cuma yang sudah. Sifatnya nggak diubah pemain, cuma dibaca: nanti kepake waktu makhluknya nolak saran.
function watakBox(id) {
  const c = game.home.get(id); if (!c || !globalThis.Tonggak) return "";
  const d = today(), V = Tonggak.watak(c, d), bayi = Engine.phase_of(c.age(d)) === "bayi";
  const rows = bayi ? V : V.filter(v => v.done);
  if (!rows.length) return "";
  const n = rows.filter(v => v.done).length, nm = esc(c.name);
  const row = v => `<div class="line ${v.done ? "tg-done" : v.open ? "tg-next" : "tg-later"}"><i class="tg-ic">${v.done ? v.ic : "?"}</i><span class="grow"><b>${esc(v.done ? v.kata : v.topic)}</b><small class="sub">${esc(v.done ? `${v.topic} · seen at ${fmtAge(v.at)} old` : v.open ? "any day now" : `usually at ${v.lo}–${v.hi} days old`)}</small></span></div>`;
  return `<div class="fieldset" id="watakBox"><span class="lbl">Getting to know ${nm} · ${n} of ${V.length}<button class="qmini" data-tour="watak" aria-label="How this works">?</button></span><div class="list">${rows.map(row).join("")}</div>
    ${bayi ? `<span class="sub">Who ${nm} is, read from small things. Not something you choose: something you get to know. It will matter when ${nm} starts saying no.</span>` : ""}</div>`;
}
// tur: begitu pengamatan pertama ada (hari itu di baris Today kalau nggak ada momen lebih besar; kalau nggak, di catatan hari)
EXTRA_TOURS.push({ id: "watak", when: () => { const c = cur && game && game.home.get(cur.id); return !!(c && c.info.watak); } });

// ---- rak "Later": pintu dihitung dari umur makhluk pertama (aturan Wants.doors); v47: app dewasa kebuka satu-satu di umur tetap
// (Remaja.LATER: Work + Wallet 270, Homes 300, Kindred 330, Paws 360, Ventures 400), kelihatan dari remaja; tablet anak cuma lihat pintu
function phLater(c) {
  const d = today(), P = doorsNow(), c0 = game.home.members[0], age0 = c0 ? c0.age(d) : 0, age = c.age(d), out = [];
  for (const D of Wants.DOORS) { const a = PH_APPS.find(x => x.id === D.id); if (a && P[D.id] === false) out.push({ ...a, day: d + Math.max(1, D.hari - age0) }); }
  if (globalThis.Remaja && age >= 180) for (const L of Remaja.LATER) if (age < L.from && !out.some(o => o.id === L.id)) {
    const a = L.id === "work" ? { id: "work", name: "Work", bg: "#2E6F95", html: `<b class="pi-txt" style="font-size:27px">💼</b>` } : L.id === "paws" ? (globalThis.Pets ? pwApp(c)[0] : null) : PH_APPS.find(x => x.id === L.id);
    if (a) out.push({ ...a, day: d + (L.from - age), grown: true });
  }
  return out.sort((a, b) => a.day - b.day);
}
const phLaterWhen = day => { const n = day - today(); return n <= 1 ? "tomorrow" : `in ${n} days`; };
let phLaterKey = "";
function phLaterSeen(later) {
  const key = later.map(a => a.id).join(","); if (!later.length || key === phLaterKey) return;
  phLaterKey = key; Tele.ev("later", { a: "tampil", k: key.slice(0, 80), jumlah: later.length });  // bukan `n`: itu nama event
}
function phLaterTap(id, v) {
  const a = phLater(PH.c).find(x => x.id === id); if (!a) return;
  Tele.ev("later", { a: "ketuk", k: id });
  const msg = id === "work" ? `Work opens ${phLaterWhen(a.day)}, once ${PH.c.name} is grown: apply through Burrow, and the job's own app appears with the first shift. Nothing to buy, just time.`
    : `${a.name} opens ${phLaterWhen(a.day)}${a.grown ? `, once ${PH.c.name} is grown` : a.teen ? ", in the teen years" : ""}. Nothing to buy, just time.`;
  const p = v.querySelector(".ph-kid"); if (p) p.textContent = msg; else say(msg);
}

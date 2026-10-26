// ================================================================ v44.1: reverse care (daftar-saran 32): once a week they ask about you
// Pertanyaan dan reaksinya di balik.js (murni, diuji di Node). Di sini: potret buat baris Today, lembar tiga pilihan, catatan jawaban.
// Jawaban disimpan di state.balik { last, log } (bukan aksi: tidak di-replay, tidak menyentuh makhluk). Telemetry hanya mencatat
// id pertanyaan dan bahwa dijawab, bukan jawabannya.
function balikSnap() {
  if (!cur || !game || !state) return null;
  const c = game.home.get(cur.id);
  return { d: today(), cur, since: state.rawat_from == null ? 0 : state.rawat_from, last: state.balik ? state.balik.last : null, seed: state.akun, traits: c ? c.traits : {} };
}
// potret buat today.js: pertanyaan yang jatuh tempo hari ini, atau null
function balikView() { const S = balikSnap(); return S && canCare() ? Balik.due(S) : null; }
function showBalik() {
  const S = balikSnap(), q = S && Balik.due(S); if (!q) return;
  const n = esc(cur.nama);
  Tele.ev("balik", { k: q.id, a: "tampil" });
  openSheet("balik", `
    <span class="ribbon" style="background: var(--rose)">${n} ASKS</span>
    <h2>${esc(q.q.replace(/^.*? asks: /, "").replace(/^\w/, ch => ch.toUpperCase()))}</h2>
    <p>${n} turns it around once a week. One tap, nothing to get right.</p>
    ${q.opts.map(([k, l], i) => `<button class="choice ${i ? "no" : "yes"}" data-balik="${esc(k)}">${esc(l)}</button>`).join("")}
    <button class="close" data-close="1">Not now</button>`);
  sheet.querySelectorAll("[data-balik]").forEach(b => b.onclick = () => {
    const line = Balik.react(S, q.id, b.dataset.balik) || "Okay.";
    state.balik = { last: today(), log: [...((state.balik && state.balik.log) || []).slice(-11), { d: today(), id: q.id, a: b.dataset.balik }] };
    save();
    Tele.ev("balik", { k: q.id, a: "jawab" });
    closeSheet(); drawToday();
    play("wiggle", 700); burst(["♥"], 3);
    say(line, 3600);
  });
  sheet.querySelector("[data-close]").onclick = () => { Tele.ev("balik", { k: q.id, a: "nanti" }); closeSheet(); };
}
EXTRA_TOURS.push({ id: "balik", when: () => !!(todayCache && todayCache.k.startsWith("balik:")) });

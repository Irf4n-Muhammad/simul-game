// sim_wait.js: ukur "tumpukan penantian" per hari, per fase hidup. Analisis saja, nggak mengubah kode game.
// Lima kolom: hari ini (yang DIKETAHUI akan terjadi hari ini), sebentar lagi (<=14 hari), suatu hari (>14 hari / tanpa tanggal, ada jalur),
// ketidakpastian (hasil terbuka), hal baru (muncul 7 hari terakhir). Tiap item ditandai sekali/berulang dan punya rutinitas atau nggak.
const E = require("../engine.js"); require("../storylets.js"); const ST = require("../status.js"); const Tree = require("../tree.js"); require("../agenda.js");
require("../career.js"); const Market = require("../market.js"); const Wants = require("../wants.js"); const Mag = require("../mag.js");
require("../moments.js"); const Work = require("../work.js"); try { require("../venture.js"); } catch (e) {}
try { require("../pets.js"); } catch (e) {}
const G = require("../game.js");
const SEEDS = (process.env.SEEDS || "w1,w2,w3,w4,w5,w6,w7,w8").split(","), DAYS = +(process.env.DAYS || 1500), DUMP = process.env.DUMP ? process.env.DUMP.split(",").map(Number) : [];
const dow = d => new Date(E.START_DATE + d * 86400000).getUTCDay();
const PH_EDGE = [60, 180, 270, E.OLD_AGE];
const FRESH_EV = new Set(["hobi_baru", "tawaran_investasi", "teman_baru", "bakat_ketahuan", "kerja_sambilan", "pet_nyasar", "pintu_dadu", "pintu_rencana", "pintu_kota", "pintu_chirp", "pintu_burrow", "pintu_wallet"]);

function scan(g, h, c, d, logsToday, recent) {
  const items = [], add = (col, id, o = {}) => items.push({ col, id, kind: o.kind || "sekali", rut: !!o.rut, day: o.day ?? null, sure: o.sure ?? true });
  const age = d - c.born, I = c.info, pend = ST.pendingFor(h, c.id);
  // ---- hari ini (diketahui sebelumnya)
  if (g.pending) { add("today", "dilema"); add("uncertain", "dilema"); }
  const KNOWN = { ujian: "ujian", kelahiran: "lahir", pernikahan: "nikah", wisuda: "wisuda", pensiun: "pensiun", maraton_hari_h: "maraton", kelas_selesai: "kelas_selesai" };
  for (const L of logsToday) for (const e of (L.events || [])) { if (KNOWN[e]) add("today", KNOWN[e]); if (e.startsWith("momen_")) add("today", e); }
  if (I.ujian && I.ujian.hari === d) add("today", "ujian");
  if (I.lahir_hari === d) add("today", "lahir");
  for (const m of pend) if (m.day === d) add("today", "momen:" + m.kind);
  if (age > 0 && age % E.YEAR === 0) add("today", "ulang_tahun", { kind: "berulang" });
  if (PH_EDGE.includes(age)) add("today", "fase_baru");
  const k = Mag.latest(d); if (k > 0 && Mag.issueDay(k) === d) add("today", "majalah", { kind: "berulang" });
  if (dow(d) === 1) add("today", "oldtown10", { kind: "berulang" });
  if (d % 7 === 0) add("today", "toko_rotasi", { kind: "berulang" });
  for (const e of E.world_active(h.world, d)) add("today", "dunia:" + e.jenis);
  // ---- sebentar lagi (<= 14 hari)
  const soon = (id, day, o = {}) => { if (day > d && day - d <= 14) add("soon", id, { ...o, day }); else if (day > d + 14 && o.far) add("someday", id, { ...o, day }); };
  if (I.ujian) soon("ujian", I.ujian.hari, { rut: true });
  if (I.lahir_hari) soon("lahir", I.lahir_hari, { far: true });
  if (I.maraton) soon("maraton", I.maraton.day, { rut: true, far: true });
  if (I.kelas && I.kelas.end) soon("kelas_selesai", I.kelas.end, { rut: true, far: true });
  const pr = c.partner && c.partner(); if (pr && pr.tipe === "tunangan") soon("nikah", pr.sejak + 30, { sure: false, far: true });
  for (const m of pend) soon("momen:" + m.kind, m.day, { rut: m.kind === "review", far: true });
  for (const edge of PH_EDGE) if (edge > age) { soon("fase_baru", c.born + edge, { far: true }); break; }
  const nextBday = c.born + (Math.floor(age / E.YEAR) + 1) * E.YEAR; soon("ulang_tahun", nextBday, { kind: "berulang" });
  soon("majalah", Mag.issueDay(k + 1), { kind: "berulang" });
  soon("oldtown10", d + ((8 - dow(d)) % 7 || 7), { kind: "berulang" });
  soon("toko_rotasi", d + (7 - d % 7), { kind: "berulang" });
  const P = c.st && c.st.pet; if (P && P.vet === "monthly") soon("vet", P.lastVet + 30, { kind: "berulang", rut: true });
  if (c.st && c.st.job) { add("soon", "kerja_target_mingguan", { kind: "berulang", rut: true }); add("soon", "kerja_nilai_bulanan", { kind: "berulang", rut: true }); }
  for (const e of (h.world.events || [])) if (e.mulai > d && e.mulai - d <= 14) add("soon", "dunia:" + e.jenis, { day: e.mulai });
  let wants = []; try { wants = Wants.active(c, d, h); } catch (e) {}
  for (const w of wants) { if (w.besar) add("someday", "ingin:" + w.id, { rut: true, sure: false }); else add("soon", "ingin:" + w.id, { rut: true, sure: false }); }
  // ---- suatu hari (ada jalur?)
  let WV = null; try { WV = c.st && c.st.job ? Work.view(c, h, d) : null; } catch (e) {}
  if (WV && WV.next) add("someday", "naik_jabatan", { rut: true, day: WV.review ? WV.review.day : null, sure: false });
  if (pr && ["pasangan"].includes(pr.tipe)) add("someday", "nikah", { rut: true, sure: false });
  if (I.menikah != null && (I.subur ?? true) && !h.children_of(c).length && !I.lahir_hari && age < 6 * E.YEAR) add("someday", "anak", { sure: false });
  if (ST.canWork(c, d) && !(c.st && c.st.job)) { add("someday", "kerja", { rut: true, sure: false }); add("uncertain", "cari_kerja"); }
  if (c.st && c.st.tree) { try { const tv = Tree.view(c, h, d); const open = (tv.nodes || tv.list || []).filter(n => n.state === "open" || n.st === "open"); if (open.length) add("someday", "pohon", { rut: true, sure: false }); } catch (e) {} }
  const ph = E.phase_of(age); if (ph === "tua") add("someday", "penerus", { sure: false });
  // ---- ketidakpastian
  if (I.ujian) add("uncertain", "hasil_ujian");
  for (const m of pend) add("uncertain", "momen:" + m.kind);
  if (I.lahir_hari) add("uncertain", "lahir");
  if (P && P.sick) add("uncertain", "pet_sakit");
  if (I.rencana) add("uncertain", "rencana_diikuti");
  if (c.st && c.st.job) add("uncertain", "kerja_hari_ini", { kind: "berulang" });
  // ---- hal baru (7 hari terakhir)
  for (const L of recent) for (const e of (L.events || [])) if (FRESH_EV.has(e) || e.startsWith("dunia:")) add("fresh", e);
  if (k > 0 && d - Mag.issueDay(k) < 7) add("fresh", "majalah_baru", { kind: "berulang" });
  try { for (const D of Market.drops(d)) if (D.start <= d && d - D.start < 7) add("fresh", "drop:" + D.line); } catch (e) {}
  for (const L of recent) if ((L.dramas || []).includes("besar")) add("fresh", "drama_besar");
  return items;
}

const agg = {}; const A = (ph, key, v = 1) => { const a = (agg[ph] ||= {}); a[key] = (a[key] || 0) + v; };
const kinds = {}; const K = (col, id) => { ((kinds[col] ||= {})[id] = (kinds[col][id] || 0) + 1); };
for (const s of SEEDS) {
  const state = { akun: "akun-" + s, nama: null, aturan: { sekolah: "wajib" }, wakil: "aman", hadir: Array.from({ length: DAYS + 100 }, (_, i) => i), jawaban: {}, aksi: [], dilihat: 1e9, res_seen: [], jam: { base_ts: 0, base_day: 0, ms: 86400000 } };
  const g = new G.Game(state), h = g.home; const hist = [];
  for (let d = 1; d < DAYS; d++) {
    let logs = g.advance(d, d); let guard = 0;
    while (g.pending && guard++ < 5) { g.answer(g.pending.key, Object.keys(g.pending.options)[0], 0); logs = logs.concat(g.advance(d, d)); }
    const c = h.members[0]; if (!c.alive(d)) break;
    for (const kk of ["makan", "mandi", "tidur"]) g.act(c.id, kk); g.act(c.id, "dadu");
    const mine = logs.filter(L => !L.cid || L.cid === c.id); hist.push(...mine); while (hist.length && hist[0].day < d - 7) hist.shift();
    const items = scan(g, h, c, d, mine, hist.filter(L => L.day > d - 7));
    const ph = E.phase_of(d - c.born); A(ph, "days");
    const col = col_ => items.filter(i => i.col === col_);
    for (const cn of ["today", "soon", "someday", "uncertain", "fresh"]) { const xs = col(cn); if (!xs.length) A(ph, "kosong_" + cn); A(ph, "n_" + cn, xs.length); for (const i of xs) K(cn, i.id); }
    const soonSekali = col("soon").filter(i => i.kind === "sekali"), soonDated = soonSekali.filter(i => i.day);
    if (!soonSekali.length) A(ph, "soon_tanpa_peristiwa"); if (!soonDated.length) A(ph, "soon_tanpa_tanggal_pasti");
    if (!col("today").some(i => i.kind === "sekali")) A(ph, "today_tanpa_peristiwa");
    const waits = items.filter(i => (i.col === "soon" || i.col === "someday") && i.kind === "sekali");
    A(ph, "ditunggu_total", waits.length); A(ph, "ditunggu_tanpa_rutin", waits.filter(i => !i.rut).length);
    if (!items.some(i => (i.col === "soon" || i.col === "someday") && i.rut)) A(ph, "hari_rodi");
    if (DUMP.includes(d) && s === SEEDS[0]) console.log("DUMP day", d, ph, c.name, JSON.stringify(items.map(i => `${i.col}:${i.id}${i.kind === "berulang" ? "~" : ""}${i.rut ? "+r" : ""}${i.day ? "@" + i.day : ""}`)));
  }
}
console.log("\n=== % hari per fase (8 seed). kosong_X = kolom X kosong; soon_tanpa_peristiwa = Soon cuma isi berulang; hari_rodi = ada rutinitas tapi nggak ada yang ditunggu dengan jalur ===");
for (const [ph, a] of Object.entries(agg)) { const o = {}; for (const [kk, v] of Object.entries(a)) if (kk !== "days") o[kk] = kk.startsWith("n_") || kk.startsWith("ditunggu_") ? +(v / a.days).toFixed(2) : Math.round(v / a.days * 100) + "%"; console.log(ph.padEnd(7), "hari", Math.round(a.days / SEEDS.length), JSON.stringify(o)); }
console.log("\n=== isi tiap kolom (jumlah hari-item, semua seed) ===");
for (const [cn, m] of Object.entries(kinds)) console.log(cn, Object.entries(m).sort((a, b) => b[1] - a[1]).map(([kk, v]) => kk + ":" + v).join(" "));

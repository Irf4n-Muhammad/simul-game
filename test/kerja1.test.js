// v85: tawaran kerja pertama (kantor vs magang impian) lewat sistem kerja koin. Gaji di kartu = gaji beneran, magang dibayar
// INTERN_PAY selama INTERN_DAYS lalu jadi pegawai biasa, dan save lama (kerja1_from null) nggak berubah.
const test = require("node:test");
const assert = require("node:assert/strict");
for (const m of ["econ-config", "money", "engine", "storylets", "agenda", "makro", "bank", "status", "tree", "ilmu", "jadwal", "rasi", "cosmetics", "career", "market", "venture", "work", "pets", "mag", "wants", "tonggak", "anak", "remaja", "obrolan"]) require(`../${m}.js`);
const ST = require("../status.js");
const G = require("../game.js");

const fresh = (akun, from = 0) => ({ akun, nama: "Mochi", aturan: { sekolah: "wajib" }, hadir: [], jawaban: {}, aksi: [], dilihat: -1, tur_pintu: {},
  rawat_from: 0, rawat_half: 0, ilmu_from: 0, kerja1_from: from, jam: { base_ts: 0, base_day: 0, ms: 86400000 } });
// main sampai tawaran muncul; jalur sesudah lulus dipaksa "kerja", tawarannya dijawab `pick`
function play(st, pick, until = 420) {
  const g = new G.Game(st), c = g.home.members[0], gd = g.home.guardian, orig = gd.decide.bind(gd);
  let seen = null;
  gd.decide = (x, q, opts, w, info) => {
    if (opts.gap && opts.kuliah) return [0, "kerja"];
    if (opts.cita && /internship/.test(opts.cita)) { seen = { day: x.day, opts, info, offer: ST.firstOffer(x.c, x.home, x.day) }; return [0, pick]; }
    return orig(x, q, opts, w, info);
  };
  for (let d = 0; d < until; d++) { g.advance(d, null); if (seen && d >= seen.day + ST.INTERN_DAYS + 2) break; }
  return { g, c, seen };
}

test("magang: kartu pakai gaji beneran, 30% selama magang, lalu gaji penuh", () => {
  const { c, seen } = play(fresh("akun-k1"), "cita");
  assert.ok(seen, "tawaran kerja pertama muncul");
  const d = seen.offer.dream, o = seen.offer.office;
  assert.equal(o.id, "office");
  assert.ok(Math.abs(d.internPay - d.pay * ST.INTERN_PAY) <= 1, "gaji magang 30%");
  const money = seen.info.fx.cita.find(r => r[0] === "🪙");
  assert.match(money[1], /a day, then/);
  assert.ok(seen.info.fx._note.some(l => /office pay \(50 coins\)/.test(l)));
  assert.equal(c.st.job.id, d.id, "kerjaan impian, tanpa wawancara");
  assert.equal(c.st.job.intern, undefined, "magang sudah selesai");
  assert.ok(!/intern/.test(c.info.kerja));
});

test("kantor: langsung Office staff level 0 di perusahaan yang ditulis di kartu", () => {
  const { c, seen } = play(fresh("akun-k1"), "aman");
  assert.ok(seen);
  assert.equal(c.st.job.id, "office");
  assert.equal(c.st.job.co, seen.offer.office.co);
  assert.equal(c.st.job.since, seen.day);
});

test("selama magang: judul (intern) dan gaji 30% dari gaji penuh", () => {
  const first = play(fresh("akun-k1"), "cita").seen;
  const { c, g } = play(fresh("akun-k1"), "cita", first.day + 4);
  assert.equal(g.home.last_day, first.day + 3);
  assert.equal(c.st.job.intern, first.day + ST.INTERN_DAYS);
  assert.match(c.info.kerja, /\(intern\)$/);
  const full = ST.salary({ ...c.st.job, intern: undefined });
  assert.ok(Math.abs(ST.salary(c.st.job) - full * ST.INTERN_PAY) <= 2, `${ST.salary(c.st.job)} vs ${full}`);
});

test("save lama: kerja1_from null, tawaran nggak pernah muncul", () => {
  const { seen, c, g } = play(fresh("akun-k1", null), "cita", 360);
  assert.equal(g.home.last_day, 359);
  assert.equal(seen, null);
  assert.ok(c.st.job, "tetap dapat kerja lewat lamaran sendiri seperti dulu");
});

// v86: tawaran pindah kerja (gaji dobel di kota lain) hidup lagi di sistem koin
test("pindah kerja: kartu pakai gaji dan biaya hidup beneran, ambil = gaji dobel", () => {
  const st = { ...fresh("akun-k1"), pindah_from: 0 };
  const g = new G.Game(st), c = g.home.members[0], gd = g.home.guardian, orig = gd.decide.bind(gd);
  let seen = null;
  gd.decide = (x, q, opts, w, info) => {
    if (opts.gap && opts.kuliah) return [0, "kerja"];
    if (opts.cita && /internship/.test(opts.cita)) return [0, "aman"];
    if (opts.ambil && opts.tetap) { seen = { day: x.day, info, M: ST.moveOffer(x.c, x.day) }; return [0, "ambil"]; }
    return orig(x, q, opts, w, info);
  };
  let pay0 = null;
  for (let d = 0; d < 700 && !seen; d++) {
    g.advance(d, null);
    if (c.st && c.st.job && c.st.job.level === 0 && d > 300) { c.st.job.level = 1; c.traits.ambisius = 80; }
    if (c.st && c.st.job) pay0 = ST.salary(c.st.job);
  }
  assert.ok(seen, "tawaran pindah muncul");
  const money = seen.info.fx.ambil.find(r => r[0] === "🪙");
  assert.match(money[2], /minus living/);
  assert.ok(Math.abs(seen.M.pay2 - seen.M.pay * 2) <= 2, "gaji dobel");
  assert.ok(seen.M.live2 > seen.M.live, "biaya hidup naik di kota baru");
  g.advance(seen.day + 1, null);
  assert.equal(c.st.job.far, ST.MOVE_PAY);
  assert.ok(c.info.kota);
  assert.ok(ST.salary(c.st.job) >= seen.M.pay * 1.9, `${ST.salary(c.st.job)} vs ${seen.M.pay}`);
});

test("pindah kerja: save lama (pindah_from null) nggak pernah dapet tawaran", () => {
  const g = new G.Game(fresh("akun-k1")), c = g.home.members[0], gd = g.home.guardian, orig = gd.decide.bind(gd);
  let seen = false;
  gd.decide = (x, q, opts, w, info) => { if (opts.ambil && opts.tetap) seen = true; return orig(x, q, opts, w, info); };
  for (let d = 0; d < 500; d++) { g.advance(d, null); if (c.st && c.st.job && c.st.job.level === 0 && d > 300) { c.st.job.level = 1; c.traits.ambisius = 80; } }
  assert.equal(seen, false);
});

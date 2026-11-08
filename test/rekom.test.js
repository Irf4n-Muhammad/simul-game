// v80 Agenda: pendaftaran sekolah jadi jendela (anak.js DAFTAR 39/46/53/60), aksi "daftar:sekolah:<id>" (game.js), kartu rekom.js.
const test = require("node:test");
const assert = require("node:assert/strict");
require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); require("../wants.js"); require("../tonggak.js");
const Anak = require("../anak.js");
const G = require("../game.js");
const Rekom = require("../rekom.js");

const fresh = akun => ({ akun, nama: "Mochi", aturan: { sekolah: "wajib" }, hadir: [], jawaban: {}, aksi: [], dilihat: -1, tur_pintu: {}, rawat_from: 0, rawat_half: 0, jam: { base_ts: 0, base_day: 0, ms: 86400000 } });
const snap = (g, d) => ({ d, members: g.home.members.map(c => ({ id: c.id, nama: c.name, born: c.born, info: c.info, st: c.st })) });
const D = Anak.DAFTAR;

test("jendela: kabar di Coming up dari umur 39, kartu daftar 46–53 dengan sisa hari, hilang sesudah tutup", () => {
  const g = new G.Game(fresh("akun-rk1")), c = g.home.members[0];
  g.advance(c.born + 38, null);
  assert.deepEqual(Rekom.cards(snap(g, c.born + 38)), { now: [], soon: [] });
  g.advance(c.born + D.kabar, null);
  const R0 = Rekom.cards(snap(g, c.born + D.kabar));
  assert.equal(R0.now.length, 0); assert.equal(R0.soon.length, 1); assert.equal(R0.soon[0].day, c.born + D.buka);
  g.advance(c.born + D.buka, null);
  const R1 = Rekom.cards(snap(g, c.born + D.buka)), k = R1.now[0];
  assert.equal(k.lbl, "SCHOOL"); assert.equal(k.day, c.born + D.tutup); assert.equal(k.left, D.tutup - D.buka); assert.equal(k.done, false); assert.equal(k.urgent, false);
  assert.equal(k.opts.length, 3); assert.equal(k.opts.filter(o => o.star).length, 1, "satu rekomendasi");
  assert.equal(Rekom.pending(R1), 1);
  g.advance(c.born + D.tutup - 2, null);
  assert.equal(Rekom.cards(snap(g, c.born + D.tutup - 2)).now[0].urgent, true, "3 hari terakhir = mepet");
  g.advance(c.born + D.tutup + 1, null);
  assert.equal(Rekom.cards(snap(g, c.born + D.tutup + 1)).now.length, 0);
});

test("daftar: cuma selama jendela, boleh ganti, hari pertama sekolah pakai pilihan itu, sama waktu diputar ulang", () => {
  const st = fresh("akun-rk2"), g = new G.Game(st), c = g.home.members[0];
  g.advance(c.born + D.buka - 1, null);
  assert.equal(g.act(c.id, "daftar:sekolah:seni"), false, "belum buka");
  g.advance(c.born + D.buka + 1, null);
  assert.equal(g.act(c.id, "daftar:sekolah:mars"), false);
  assert.equal(g.act(c.id, "daftar:sekolah:seni"), true);
  assert.equal(g.act(c.id, "daftar:sekolah:seni"), false, "sudah terdaftar di situ");
  const R = Rekom.cards(snap(g, c.born + D.buka + 1)).now[0];
  assert.equal(R.done, true); assert.equal(R.opts.find(o => o.picked).id, "seni");
  g.advance(c.born + D.buka + 3, null);
  assert.equal(g.act(c.id, "daftar:sekolah:favorit"), true, "ganti selama masih buka");
  g.advance(c.born + D.tutup + 1, null);
  assert.equal(g.act(c.id, "daftar:sekolah:dekat"), false, "sudah tutup");
  const sink = []; g.home.view(c.born + 62, sink);
  assert.equal(Anak.sekolahOf(c).id, "favorit"); assert.equal(c.info.sekolah_pilihan.oleh, "wali");
  assert.ok(!sink.some(l => l.events.includes("pilih_sekolah")), "nggak ditanya lagi di 56");
  assert.ok(sink.find(l => l.events.includes("hari_pertama_sekolah")).lines.join(" ").includes("First day at Riverside Academy!"));
  const g2 = new G.Game(JSON.parse(JSON.stringify(st))); g2.advance(c.born + 62, null);
  assert.deepEqual(g2.home.members[0].info.sekolah_pilihan, c.info.sekolah_pilihan);
});

test("kelewat: nggak daftar = sekolah dekat, dicatat 'kelewat', tanpa dilema", () => {
  const g = new G.Game(fresh("akun-rk3")), c = g.home.members[0];
  g.advance(c.born + 62, c.born + 62);   // main langsung: dilema yang belum dijawab akan nunggu pemain
  assert.equal(g.pending, null, "nggak ada pertanyaan sekolah");
  assert.equal(Anak.sekolahOf(c).id, "dekat"); assert.equal(c.info.sekolah_pilihan.oleh, "kelewat");
});

test("save lama yang sudah menjawab pertanyaan sekolah di umur 56 tetap dapat sekolah pilihannya", () => {
  const st = fresh("akun-rk4"), g0 = new G.Game(st), c0 = g0.home.members[0];
  st.jawaban[`${c0.id}|${c0.born + 56}|${Anak.SEKOLAH_Q(c0.name)}`] = ["seni", 0];
  const g = new G.Game(st); g.advance(c0.born + 62, null);
  const c = g.home.members[0];
  assert.equal(Anak.sekolahOf(c).id, "seni"); assert.equal(c.info.sekolah_pilihan.oleh, "wali");
});

test("kartu ulangan: belajar bareng sampai 3, lalu selesai", () => {
  const S = { d: 100, members: [{ id: "m", nama: "Mochi", born: 0, info: { ujian: { hari: 102, belajar: 1, jenis: "ulangan" } } }] };
  const k = Rekom.cards(S).now[0];
  assert.equal(k.lbl, "QUIZ"); assert.equal(k.left, 2); assert.equal(k.opts[0].act, "belajar"); assert.equal(k.done, false);
  S.members[0].info.ujian.belajar = 3;
  assert.equal(Rekom.cards(S).now[0].done, true);
});

test("rekomendasi sekolah dari bakat: logic tinggi = favorit, kreatif/fisik = seni, sisanya dekat", () => {
  const st = talent => ({ genes: { talent } });
  assert.equal(Rekom.pickSchool(st({ logic: 8, fitness: 3, charm: 4, creativity: 2 })), "favorit");
  assert.equal(Rekom.pickSchool(st({ logic: 2, fitness: 3, charm: 4, creativity: 7 })), "seni");
  assert.equal(Rekom.pickSchool(st({ logic: 2, fitness: 3, charm: 8, creativity: 2 })), "dekat");
  assert.equal(Rekom.pickSchool(st({ logic: 5, fitness: 3, charm: 4, creativity: 2 })), "dekat", "nggak ada yang menonjol");
  assert.equal(Rekom.pickSchool(null), "dekat");
});

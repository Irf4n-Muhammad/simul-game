// v75: ajak jalan ke kota (game.js "jalan:<tempat>"): sekali sehari, efek kecil, masuk cerita, dan sama waktu diputar ulang.
const test = require("node:test");
const assert = require("node:assert/strict");
require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const G = require("../game.js");
const K = require("../kota.js");

const fresh = () => ({ akun: "akun-jalan", nama: "Mochi", aturan: { sekolah: "wajib" }, hadir: [], jawaban: {}, aksi: [], dilihat: -1, tur_pintu: {}, rawat_from: 0, rawat_half: 0, jam: { base_ts: 0, base_day: 0, ms: 86400000 } });

test("jalan: sekali sehari, mood naik, masuk cerita hari itu, tempat asing ditolak", () => {
  const g = new G.Game(fresh()); g.advance(80, null); g.half_now = 0;
  const c = g.home.members[0], m0 = c.needs.mood = 50;
  assert.equal(g.act(c.id, "jalan:mars"), false);
  assert.equal(g.act(c.id, "jalan:park"), true);
  assert.ok(c.needs.mood > m0);
  assert.equal(g.act(c.id, "jalan:bazaar"), false, "cuma sekali sehari");
  const L = (g.noon_logs || []).find(l => l.events.includes("jalan:park"));
  assert.ok(L && /Riverside Park/.test(L.lines.join(" ")), "masuk cerita");
  // tiap tempat jalan ada di peta kota
  for (const id of Object.keys(G.WALKS)) assert.ok(id === "school" || id === "square" || id === "fair" || K.PLACE[id], id);
});

test("jalan: diputar ulang dari catatan aksi hasilnya sama", () => {
  const st = fresh(), g = new G.Game(st); g.advance(80, null); g.half_now = 0;
  const c = g.home.members[0];
  g.act(c.id, "jalan:square"); g.advance(90, null);
  const g2 = new G.Game(JSON.parse(JSON.stringify(st))); g2.advance(90, null);
  const a = g.home.members[0], b = g2.home.members[0];
  assert.equal(a.bond, b.bond); assert.deepEqual(a.needs, b.needs); assert.deepEqual(a.info.jalan_ke, b.info.jalan_ke);
});

test("jalan ke pasar: kalau ada festival dunia, ceritanya pakai nama festivalnya", () => {
  const g = new G.Game(fresh()); g.advance(80, null); g.half_now = 0;
  const c = g.home.members[0], day = g.home.last_day;
  g.home.world.events = [{ id: "uji", jenis: "festival", nama: "Lantern Night", mulai: day, selesai: day + 2, efek: { mood: 0 }, baris: [] }];
  assert.equal(g.act(c.id, "jalan:fair"), true);
  const L = (g.noon_logs || []).find(l => l.events.includes("jalan:fair"));
  assert.match(L.lines.join(" "), /Lantern Night/);
});

test("jalan pas hujan/salju: cuaca dicatat di kunci aksi, ada baris cuacanya, cuaca asing ditolak", () => {
  const g = new G.Game(fresh()); g.advance(80, null); g.half_now = 0;
  const c = g.home.members[0];
  assert.equal(g.act(c.id, "jalan:park:tornado"), false);
  assert.equal(g.act(c.id, "jalan:park:snow"), true);
  const L = (g.noon_logs || []).find(l => l.events.includes("jalan:park"));
  assert.match(L.lines.join(" "), /snow/i);
});

test("naik kereta ke kota kecil: nama kota dari kunci aksi, dihitung jalan hari itu, nama aneh ditolak", () => {
  const g = new G.Game(fresh()); g.advance(80, null); g.half_now = 0;
  const c = g.home.members[0];
  assert.equal(g.act(c.id, "trip:<script>"), false);
  assert.equal(g.act(c.id, "trip:Millbrook:rain"), true);
  assert.equal(g.act(c.id, "jalan:park"), false, "udah jalan-jalan hari ini");
  const L = (g.noon_logs || []).find(l => l.events.includes("trip"));
  assert.match(L.lines.join(" "), /Millbrook/);
  assert.ok(c.info.trip_ke.includes("Millbrook"));
});

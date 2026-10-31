// Dompet dapur (dapur.js, v49): makanan dasar gratis, makanan enak pakai koin, koin dari mini game dibatasi per hari.
const test = require("node:test");
const assert = require("node:assert/strict");
require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const D = require("../dapur.js");
const G = require("../game.js");

test("harga: basic gratis, enam makanan enak berharga, yang bukan makanan null", () => {
  assert.equal(D.price("basic"), 0);
  for (const k of ["power", "comfort", "fruit", "light", "family", "treat"]) assert.ok(D.price(k) > 0, k);
  assert.equal(D.price("story"), null);
  assert.ok(D.START >= D.price("treat"));   // modal awal cukup buat satu makan enak
});

test("beli: koin dipotong, nggak bisa minus, basic selalu bisa", () => {
  const W = D.fresh(); W.koin = 13;
  assert.equal(D.spend(W, "power"), true); assert.equal(W.koin, 1);
  assert.equal(D.can(W, "power"), false); assert.equal(D.spend(W, "power"), false); assert.equal(W.koin, 1);
  assert.equal(D.can(W, "basic"), true); assert.equal(D.spend(W, "basic"), true); assert.equal(W.koin, 1);
});

test("dapat koin: dibatasi CAP per hari, reset besoknya, rekor tetap dicatat", () => {
  const W = D.fresh(), k0 = W.koin;
  assert.equal(D.earn(W, "buah", 25, 10).got, 25);
  assert.equal(D.earn(W, "buah", 40, 10).got, D.CAP - 25);
  const r = D.earn(W, "buah", 50, 10);
  assert.equal(r.got, 0); assert.equal(r.best, true); assert.equal(W.best.buah, 50);
  assert.equal(W.koin, k0 + D.CAP); assert.equal(D.left(W, 10), 0);
  assert.equal(D.left(W, 11), D.CAP);
  assert.equal(D.earn(W, "buah", 5, 11).got, 5);
});

test("game.js: makan basic diterima, tanpa catatan selera, dan selera lama nggak berubah", () => {
  const st = { akun: "akun-uji", nama: "Mochi", aturan: { sekolah: "wajib" }, hadir: [], jawaban: {}, aksi: [], dilihat: -1, tur_pintu: {}, rawat_from: 0, rawat_half: 0, jam: { base_ts: 0, base_day: 0, ms: 86400000 } };
  const g = new G.Game(st); g.advance(40, null);
  const c = g.home.members[0];
  g.half_now = 0;
  assert.equal(g.act(c.id, "rawat:makan_p:basic"), true);
  assert.equal(g.careNote, null);
  assert.ok(!("basic" in ((c.info.selera || {}).m || {})));
  const v = g.careView(c);
  assert.deepEqual(v.items.find(i => i.id === "makan_p").opts.map(o => o.id), ["power", "comfort", "fruit", "basic"]);
});

test("peringkat rekor: naik sesuai ambang, tahu sisa poin ke peringkat berikutnya", () => {
  assert.deepEqual(D.tier("stack", 0), { ix: 0, name: "Rookie", next: "Bronze", need: 5 });
  assert.equal(D.tier("stack", 5).name, "Bronze");
  assert.deepEqual(D.tier("stack", 18), { ix: 2, name: "Silver", next: "Gold", need: 2 });
  assert.deepEqual(D.tier("pisau", 999), { ix: 5, name: "Legend", next: null, need: null });
  assert.equal(D.tier("nggak-ada", 12).name, "Bronze");   // game tak dikenal pakai ambang Fruit catch
});

test("skin: kebuka dari peringkat dan milestone, yang kekunci nggak bisa dipakai", () => {
  const W = D.fresh();
  assert.deepEqual(D.unlocked(W, "pisau"), ["dasar"]);
  assert.equal(D.wear(W, "pisau", "emas"), false); assert.equal(D.skinOf(W, "pisau"), "dasar");
  W.best.pisau = 26;   // Gold
  assert.deepEqual(D.unlocked(W, "pisau"), ["dasar", "perunggu", "perak", "emas"]);
  assert.equal(D.wear(W, "pisau", "emas"), true); assert.equal(D.skinOf(W, "pisau"), "emas");
  D.track(W, "pisau", 499); assert.ok(!D.unlocked(W, "pisau").includes("tukang"));
  D.track(W, "pisau", 1); assert.ok(D.unlocked(W, "pisau").includes("tukang"));
  // tiap game punya skin dasar, satu skin per peringkat Bronze..Legend, dan satu milestone
  for (const g of Object.keys(D.SKINS)) {
    assert.equal(D.SKINS[g][0].id, "dasar");
    assert.deepEqual(D.SKINS[g].filter(k => k.tier).map(k => k.tier), [1, 2, 3, 4, 5]);
    assert.equal(D.SKINS[g].filter(k => k.stat).length, 1);
  }
});

test("tantangan harian: game dan level sama buat hari yang sama, streak nyambung, bonus sekali sehari", () => {
  assert.equal(D.harian(100), D.harian(100));
  assert.notEqual(D.harian(100), D.harian(101));
  const a = D.rng(100), b = D.rng(100), c = D.rng(101);
  const xa = [a(), a(), a()], xb = [b(), b(), b()];
  assert.deepEqual(xa, xb); assert.notDeepEqual(xa, [c(), c(), c()]);
  assert.ok(xa.every(x => x >= 0 && x < 1));
  const W = D.fresh(), k0 = W.koin;
  let r = D.daily(W, 10, 7); assert.deepEqual(r, { first: true, streak: 1, bonus: 5, best: 7 });
  r = D.daily(W, 10, 12); assert.deepEqual(r, { first: false, streak: 1, bonus: 0, best: 12 });
  r = D.daily(W, 11, 3); assert.equal(r.streak, 2); assert.equal(r.bonus, 10);
  assert.equal(D.streakNow(W, 12), 2); assert.equal(D.streakNow(W, 13), 0);   // bolong sehari = putus
  r = D.daily(W, 13, 3); assert.equal(r.streak, 1);
  assert.equal(W.koin, k0 + 5 + 10 + 5);
});

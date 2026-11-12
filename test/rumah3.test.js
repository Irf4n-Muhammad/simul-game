// Tata Rumah tahap 3: kamar anak, pindah rumah, ruangan baru, ruangan bentuk L, perabot di ekonomi (aus, bekas, terbatas, antik).
const test = require("node:test");
const assert = require("node:assert/strict");
require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const P = require("../perabot.js");
const D = require("../denah.js");
const G = require("../game.js");

const TR = { rajin: 50, impulsif: 50, setia: 50, ambisius: 50, ramah: 50, penakut: 50, patuh: 50, kreatif: 50 };
function adult(over = {}) {
  return { id: "a", name: "Tutu", traits: { ...TR }, bond: 50, info: {}, needs: { mood: 50 }, stats: { kesehatan: 50 },
    st: { wallet: over.wallet ?? 20000, skills: { logic: 10, fitness: 10, charm: 10, creativity: 10 } }, age: () => 300, relations: {}, parents: [], born: -300 };
}
const ctx = c => ({ need: (k, n) => { c.needs[k] = Math.min(100, c.needs[k] + n); }, stat: (k, n) => { c.stats[k] += n; } });
const errs = (pl, home) => D.check(pl, { lot: D.lotOf(home), own: D.own(home) }).map(e => e.msg);
// rumah palsu dengan anggota: [id, umur, orang tua]
function family(list, house = "rented") {
  const ms = list.map(([id, age, parents = [], rel = {}]) => ({ id, name: id, born: 1000 - age, parents, relations: rel, info: {}, age(d) { return d - this.born; } }));
  return { world: { st: { house } }, members: ms, living: () => ms, get: id => ms.find(m => m.id === id) };
}

test("denah bawaan per tingkat: makin besar rumahnya makin banyak ruangan, semuanya sah, villa punya ruang tamu bentuk L", () => {
  const n = {};
  for (const h of Object.keys(D.LOT)) {
    const home = { world: { st: { house: h } } }, pl = D.defaultPlan(home);
    assert.deepEqual(errs(pl, home), [], h);
    n[h] = D.rootsOf(pl).length;
  }
  assert.ok(n.rented < n.flat && n.flat < n.house && n.house < n.villa && n.villa < n.mansion, JSON.stringify(n));
  const v = D.defaultPlan({ world: { st: { house: "villa" } } });
  assert.ok(v.R.some(r => r.length === 6 && r[0] === "tamu"));
  const m = D.defaultPlan({ world: { st: { house: "mansion" } } });
  for (const t of ["tamu", "kerja", "taman"]) assert.ok(m.R.some(r => r[0] === t), t);
});

test("ruangan bentuk L: sayap harus nempel, ikut nama induk, barang boleh melintas, jendela ke taman boleh", () => {
  const home = { world: {} }, base = D.defaultPlan(home);
  let pl = D.clone(base);
  pl.R.push(["peluk", 11, 9, 2, 2, 3]); pl.C.push(["", ""]);   // sayap ruang main ke timur
  pl.N = pl.N.filter(k => k !== "v11,7");
  assert.deepEqual(errs(pl, home), []);
  assert.equal(D.names(pl)[4], "Playroom");
  assert.equal(D.roomAt(pl, 12, 9), 3);
  assert.equal(D.areaOf(pl, 3), 25 + 4);
  pl.I.push(["rug_kitchen", 10, 9, 0]);                 // karpet melintas dari induk ke sayap
  assert.deepEqual(errs(pl, home), []);
  pl = D.clone(base); pl.R.push(["peluk", 12, 9, 2, 2, 3]); pl.C.push(["", ""]);   // nggak nempel
  assert.ok(errs(pl, home).some(m => /has to touch/.test(m)));
  pl = D.clone(base); pl.R.push(["tidur", 11, 9, 2, 2, 3]); pl.C.push(["", ""]);   // jenis beda dari induk: nggak kebaca
  assert.deepEqual(errs(pl, home), ["This plan can't be read."]);
  // taman di timur kamar mandi: jendela ke taman boleh, ruang tamu tanpa sofa ditolak
  pl = D.clone(base);
  pl.R.push(["taman", 11, 1, 3, 5]); pl.C.push(["", ""]); pl.I.push(["garden_bench", 12, 1, 0]); pl.D.push("h12,6");
  pl.N.push("v11,4");
  assert.deepEqual(errs(pl, home), []);
  pl.R.push(["tamu", 11, 6, 3, 5]); pl.C.push(["", ""]); pl.D.push("v11,9"); pl.N = pl.N.filter(k => k !== "v11,7");
  assert.ok(errs(pl, home).includes("Living room needs a sofa."));
});

test("kamar tidur: yang tua milih duluan, dua anak sekasur, remaja butuh kasur sendiri, bayi ikut orang tua", () => {
  const home = family([["mc", 400], ["k1", 120, ["mc"]], ["k2", 100, ["mc"]], ["bb", 20, ["mc"]]], "flat");
  const pl = D.defaultPlan(home);
  home.world.denah = pl;
  let sl = D.sleepers(home, 1000);
  assert.equal(sl.mc, 2);                      // kamar 1 (lebih besar) buat yang paling tua
  assert.equal(sl.k1, 4); assert.equal(sl.k2, 4);   // dua anak di satu kasur kamar 2
  assert.equal(sl.bb, 2);
  assert.equal(D.sharesWithSibling(home, home.get("k1"), 1000), true);
  // k1 jadi remaja: kasurnya penuh sendiri, k2 nggak kebagian
  home.get("k1").born -= 100;
  sl = D.sleepers(home, 1000);
  assert.equal(sl.k1, 4); assert.equal(sl.k2, -1);
  // pembagian dari pemain menang
  pl.A = [["k2", 4]];
  sl = D.sleepers(home, 1000);
  assert.equal(sl.k2, 4); assert.equal(sl.k1, -1);
  // pasangan satu kasur
  const h2 = family([["a", 400, [], { b: { tipe: "suami-istri" } }], ["b", 390, [], { a: { tipe: "suami-istri" } }], ["k", 200, ["a", "b"]]], "flat");
  h2.world.denah = D.defaultPlan(h2);
  sl = D.sleepers(h2, 1000);
  assert.equal(sl.a, sl.b); assert.notEqual(sl.k, sl.a); assert.ok(sl.k >= 0);
});

test("rawat tidur pakai kamar sendiri; nggak kebagian kasur = tanpa efek perabot", () => {
  const home = family([["mc", 400], ["k1", 200, ["mc"]], ["k2", 190, ["mc"]]], "flat"), c = adult();
  P.act(home, c, "perabot:beli:canopy_bed", 300);
  const pl = D.defaultPlan(home); pl.I[pl.I.findIndex(it => it[0] === "pine_bed" && it[1] === 12)] = ["canopy_bed", 12, 6, 0];
  assert.equal(D.act(home, c, D.encode(pl), 300), true);
  const k1 = Object.assign(home.get("k1"), { needs: { mood: 50 }, stats: { kesehatan: 50 }, bond: 50, traits: TR });
  // kamar 2 sekarang lebih bagus: mc (paling tua) ambil kamar 2, k1 kamar 1, k2 nggak kebagian
  const sl = D.sleepers(home, 1000);
  assert.equal(sl.mc, 4); assert.equal(sl.k1, 2); assert.equal(sl.k2, -1);
  P.onCare(home, k1, ctx(k1), "tidur", 1000);
  assert.equal(k1.needs.mood, 50);             // kasur pinus bawaan: nggak ada efek
  const k2 = Object.assign(home.get("k2"), { needs: { mood: 50 }, stats: { kesehatan: 50 }, bond: 50, traits: TR });
  assert.match(P.onCare(home, k2, ctx(k2), "tidur", 1000), /No bed for k2/);
});

test("ruangan baru: ruang kerja dipakai waktu main, perabotnya aus dan bisa diservis", () => {
  const home = { world: {} }, c = adult();
  assert.equal(P.act(home, c, "perabot:beli:standing_desk", 300), true);
  const pl = D.defaultPlan(home);
  pl.R.push(["kerja", 11, 1, 3, 5]); pl.C.push(["", ""]); pl.D.push("v11,3"); pl.I.push(["standing_desk", 12, 1, 0]);
  assert.deepEqual(errs(pl, home), []);
  assert.equal(D.act(home, c, D.encode(pl), 300), true);
  assert.equal(D.careRoom(D.plan(home), c, "peluk"), 4);
  for (let d = 0; d < 50; d++) P.onCare(home, c, ctx(c), "peluk", 400 + d);
  assert.ok(c.st.skills.logic > 10 + 0.25 * 45 && c.st.skills.logic < 10 + 0.25 * 50, String(c.st.skills.logic));
  assert.equal(P.cond(home, "standing_desk"), 80);
  assert.equal(P.condLabel(80), "Good");
  const w = c.st.wallet;
  assert.equal(P.act(home, c, "perabot:servis:standing_desk", 460), true);
  assert.equal(c.st.wallet, w - P.repairCost(P.item("standing_desk")));
  assert.equal(P.cond(home, "standing_desk"), 100);
  assert.equal(P.act(home, c, "perabot:servis:standing_desk", 460), false);   // sudah baru
});

test("bekas, edisi terbatas, antik", () => {
  const home = { world: {} }, c = adult();
  const U = P.usedToday(500);
  assert.equal(U.length, 3);
  assert.deepEqual(P.usedToday(500), U);
  const u = U[0];
  assert.ok(u.price < u.item.price && u.cond < 100);
  assert.equal(P.act(home, c, "perabot:bekas:" + u.id, 501), false);   // bukan tawaran hari itu
  assert.equal(P.act(home, c, "perabot:bekas:" + u.id, 500), true);
  assert.equal(P.act(home, c, "perabot:bekas:" + u.id, 500), false);   // sudah laku
  assert.equal(P.cond(home, u.id), u.cond);
  assert.ok(P.sellPrice(home, u.id, 500) < Math.floor(u.item.price / 2));
  // terbatas: cuma di minggu edisinya, satu per keluarga
  const L = P.limited(560);
  assert.equal(L.open, true);
  assert.equal(P.act(home, c, "perabot:beli:" + L.id, L.to + 1), false);
  assert.equal(P.act(home, c, "perabot:beli:" + L.id, 560), true);
  assert.equal(P.act(home, c, "perabot:beli:" + L.id, 561), false);
  assert.ok(!P.catalog().some(x => x.lim));
  const half = Math.floor(L.item.price / 2);
  assert.equal(P.sellPrice(home, L.id, 562), half);                     // masih dijual: harga biasa
  assert.equal(P.sellPrice(home, L.id, L.to + 1), Math.floor(half * 1.5));
  assert.equal(P.sellPrice(home, L.id, 560 + P.ANTIQUE), Math.floor(L.item.price / 2 * 2.5 * 1.5));
  assert.equal(P.ageLabel(home, L.id, 560 + P.VINTAGE), "Vintage");
  // barang lama (tanpa catatan umur) tetap separuh harga
  const h0 = { world: { perabot: { pasang: {}, gudang: { art_sun: 1 }, beli: 1 } } };
  assert.equal(P.sellPrice(h0, "art_sun", 9000), 30);
});

test("pindah rumah: denah baru yang lebih besar, perabot ikut, sisanya di gudang; rumah tanpa denah nggak berubah", () => {
  const home = { world: { st: { house: "rented" } } }, c = adult();
  for (const id of ["canopy_bed", "art_stars", "corner_sofa"]) P.act(home, c, "perabot:beli:" + id, 300);
  const pl = D.defaultPlan(home);
  pl.I[pl.I.findIndex(it => it[0] === "pine_bed")] = ["canopy_bed", 3, 6, 0];
  pl.I.push(["art_stars", 5, 9, 3]);
  assert.deepEqual(errs(pl, home), []);
  assert.equal(D.act(home, c, D.encode(pl), 300), true);
  home.world.st.house = "house";
  const r = D.move(home);
  assert.deepEqual(r, { placed: 2, stored: 0 });
  const np = D.plan(home);
  assert.deepEqual(errs(np, home), []);
  assert.ok(D.rootsOf(np, "tamu").length === 1);
  assert.ok(np.I.some(it => it[0] === "canopy_bed") && np.I.some(it => it[0] === "art_stars"));
  assert.deepEqual(P.storage(home), { corner_sofa: 1 });
  // turun ke kontrakan: denah kecil lagi
  home.world.st.house = "rented";
  D.move(home);
  assert.deepEqual(errs(D.plan(home), home), []);
  assert.equal(D.rootsOf(D.plan(home)).length, 4);
  assert.equal(D.move({ world: {} }), null);
});

test("game.js: replay sama dengan kamar anak, ruangan baru, dan barang bekas", () => {
  const fx = require("../sim/fixtures/state_akun-biz1.json"), st = JSON.parse(JSON.stringify(fx));
  const g = new G.Game(st); g.advance(400, null);
  const c = g.home.living(400)[0];
  const u = P.usedToday(400).find(x => x.price <= c.st.wallet);
  if (u) assert.equal(g.act(c.id, "perabot:bekas:" + u.id), true);
  const pl = D.clone(D.plan(g.home)), lot = D.lotOf(g.home);
  const spot = D.findRoomSpot(pl, 3, 4, lot);
  assert.ok(spot);
  assert.deepEqual(D.check(pl, { lot, own: D.own(g.home) }), []);
  assert.equal(g.act(c.id, D.encode(pl)), true);
  g.advance(430, null);
  const g2 = new G.Game(JSON.parse(JSON.stringify(st))); g2.advance(430, null);
  assert.deepEqual(D.plan(g2.home), D.plan(g.home));
  assert.equal(g2.home.snapshot(), g.home.snapshot());
});

test("antik: beli baru lalu jual nggak numpang umur barang lama", () => {
  const home = { world: {} }, c = adult();
  P.act(home, c, "perabot:beli:art_mountain", 0);
  P.act(home, c, "perabot:beli:art_mountain", 2000);
  assert.equal(P.ageLabel(home, "art_mountain", 2000), "Vintage");   // umur dirata-rata jadi 1000 hari: vintage, bukan antik
  assert.ok(P.sellPrice(home, "art_mountain", 2000) < P.item("art_mountain").price);
});

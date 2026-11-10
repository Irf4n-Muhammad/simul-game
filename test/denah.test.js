// Tata Rumah tahap 2 (denah.js): denah bawaan, periksa, simpan lewat aksi, pindahan dari slot tahap 1, efek rawat, replay.
const test = require("node:test");
const assert = require("node:assert/strict");
require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const P = require("../perabot.js");
const D = require("../denah.js");
const G = require("../game.js");

const TR = { rajin: 50, impulsif: 50, setia: 50, ambisius: 50, ramah: 50, penakut: 50, patuh: 50, kreatif: 50 };
function adult(over = {}) {
  return { id: "a", name: "Tutu", traits: { ...TR, ...(over.traits || {}) }, bond: 50, info: {}, needs: { mood: 50 }, stats: { kesehatan: 50 },
    st: { wallet: over.wallet ?? 9000, skills: { logic: 10, fitness: 10, charm: 10, creativity: 10 } }, age: () => over.age ?? 300 };
}
const ctx = c => ({ need: (k, n) => { c.needs[k] = Math.min(100, c.needs[k] + n); }, stat: (k, n) => { c.stats[k] += n; } });
const errs = (pl, home = { world: {} }) => D.check(pl, { lot: D.lotOf(home), own: D.own(home) }).map(e => e.msg);
const idx = (pl, id) => pl.I.findIndex(it => it[0] === id);

test("denah bawaan: sah di semua tingkat rumah, empat ruangan dengan ukuran beda", () => {
  for (const house of Object.keys(D.LOT)) {
    const home = { world: { st: { house } } };
    assert.deepEqual(errs(D.defaultPlan(home), home), [], house);
  }
  const pl = D.defaultPlan({ world: {} });
  assert.deepEqual(D.names(pl), ["Kitchen", "Bathroom", "Bedroom", "Playroom"]);
  assert.ok(new Set(pl.R.map(r => r[3] * r[4])).size > 1);
  assert.equal(D.saved({ world: {} }), false);
});

test("periksa: ruangan numpuk, jenis kurang, pintu, jendela, barang salah tempat", () => {
  const base = D.defaultPlan({ world: {} });
  let pl = D.clone(base); pl.R[1][1] -= 1;   // kamar mandi geser ke dapur
  assert.ok(errs(pl).some(m => /overlaps Kitchen/.test(m)));
  pl = D.clone(base); pl.R[1][0] = "tidur";
  assert.ok(errs(pl).some(m => /needs a bathroom/.test(m)));
  pl = D.clone(base); pl.D = pl.D.filter(k => k !== "h9,11");
  assert.ok(errs(pl).includes("The house needs a front door."));
  pl = D.clone(base); pl.D = pl.D.filter(k => k !== "v7,4");
  assert.ok(errs(pl).includes("Bathroom has no door."));
  pl = D.clone(base); pl.N.push("v7,2");   // jendela di dinding dalam
  assert.ok(errs(pl).includes("Windows go on outside walls."));
  pl = D.clone(base); pl.I[idx(pl, "pine_bed")] = ["pine_bed", 8, 2, 0];   // kasur di kamar mandi
  assert.ok(errs(pl).some(m => /belongs in a bedroom/.test(m)));
  pl = D.clone(base); pl.I[idx(pl, "cafe_table")] = ["cafe_table", 1, 3, 0];   // numpuk kulkas
  assert.ok(errs(pl).some(m => /doesn't fit/.test(m)));
  pl = D.clone(base); pl.I.splice(idx(pl, "pine_bed"), 1);
  assert.ok(errs(pl).includes("Bedroom needs a bed."));
  pl = D.clone(base); pl.I.push(["canopy_bed", 3, 8, 0]);
  assert.ok(errs(pl).some(m => /Only 0 canopy bed/.test(m)));
  pl = D.clone(base); pl.I.push(["art_sun", 7, 4, 1]);   // lukisan di pintu kamar mandi
  assert.ok(errs(pl).some(m => /Sunrise print doesn't fit/.test(m)));
  pl = D.clone(base); pl.I.push(["rug_stripe", 3, 3, 0]);   // karpet numpuk karpet dapur
  assert.ok(errs(pl).some(m => /Striped rug doesn't fit/.test(m)));
  pl = D.clone(base); pl.I.push(["plant_kitchen", 2, 6, 0]);   // di depan pintu
  assert.ok(errs(pl).some(m => /doesn't fit/.test(m)));
  assert.deepEqual(D.check({ R: "x" }), [{ msg: "This plan can't be read." }]);
});

test("simpan: kamar tidur kedua dengan kasur baru, gudang ikut, slot lama ditolak", () => {
  const home = { world: {} }, c = adult();
  assert.equal(P.act(home, c, "perabot:beli:cloud_bed", 300), true);
  assert.equal(P.act(home, c, "perabot:beli:art_sun", 300), true);
  const pl = D.clone(D.plan(home));
  pl.R.push(["tidur", 11, 6, 3, 4]);       // di sebelah ruang main
  pl.C.push(["", ""]);
  pl.D.push("v11,9");                     // pintu dari ruang main
  pl.N = pl.N.filter(k => k !== "v11,7");   // jendela itu jadi dinding dalam
  pl.I.push(["cloud_bed", 12, 6, 0]);
  assert.deepEqual(errs(pl, home), []);
  assert.equal(D.act(home, c, "denah:simpan:{bad", 300), false);
  assert.equal(D.act(home, c, D.encode(pl), 300), true);
  assert.equal(D.saved(home), true);
  assert.deepEqual(P.storage(home), { art_sun: 1 });
  assert.deepEqual(D.names(D.plan(home)), ["Kitchen", "Bathroom", "Bedroom 1", "Playroom", "Bedroom 2"]);
  assert.equal(P.act(home, c, "perabot:pasang:tidur:dinding:art_sun", 300), false);
  assert.equal(P.touched(home), true);
  // kasur dibalikin ke gudang lewat simpan berikutnya
  const pl2 = D.clone(D.plan(home)); pl2.I[idx(pl2, "cloud_bed")] = ["pine_bed", 12, 6, 0];
  assert.equal(D.act(home, c, D.encode(pl2), 301), true);
  assert.deepEqual(P.storage(home), { art_sun: 1, cloud_bed: 1 });
  // barang yang nggak dipunya ditolak
  const pl3 = D.clone(pl2); pl3.I.push(["canopy_bed", 12, 8, 0]);
  assert.equal(D.act(home, c, D.encode(pl3), 302), false);
});

test("pindahan dari tahap 1: barang di slot ikut ke denah bawaan, yang lebih besar digeser", () => {
  const home = { world: {} }, c = adult();
  for (const id of ["canopy_bed", "family_table", "art_stars"]) P.act(home, c, "perabot:beli:" + id, 300);
  P.act(home, c, "perabot:pasang:tidur:utama:canopy_bed", 300);
  P.act(home, c, "perabot:pasang:makan:utama:family_table", 300);
  P.act(home, c, "perabot:pasang:tidur:dinding:art_stars", 300);
  P.act(home, c, "perabot:simpan:peluk:dinding", 300);
  const pl = D.plan(home);
  assert.deepEqual(errs(pl, home), []);
  assert.deepEqual(pl.I.find(it => it[0] === "canopy_bed"), ["canopy_bed", 3, 6, 0]);
  assert.ok(pl.I.some(it => it[0] === "family_table"));
  assert.ok(!pl.I.some(it => it[0] === "pine_bed" || it[0] === "cafe_table" || it[0] === "art_playroom"));
  assert.ok(pl.I.some(it => it[0] === "art_stars"));
  assert.deepEqual(D.own(home), { canopy_bed: 1, family_table: 1, art_stars: 1 });
});

test("rawat dengan denah: kamar tidur terbaik dipakai, sekali sehari, tanpa RNG", () => {
  const home = { world: {} }, c = adult();
  P.act(home, c, "perabot:beli:canopy_bed", 300);
  const pl = D.clone(D.plan(home));
  pl.R.push(["tidur", 11, 6, 3, 4]); pl.C.push(["", ""]); pl.D.push("v11,9"); pl.N = pl.N.filter(k => k !== "v11,7"); pl.I.push(["canopy_bed", 12, 6, 0]);
  assert.equal(D.act(home, c, D.encode(pl), 300), true);
  assert.equal(D.careRoom(D.plan(home), c, "tidur"), 4);
  const line = P.onCare(home, c, ctx(c), "tidur", 300);
  assert.match(line, /notices the new canopy bed/);
  assert.equal(c.needs.mood, 55);
  assert.equal(P.onCare(home, c, ctx(c), "tidur", 300), null);
  assert.equal(c.needs.mood, 55);
  P.onCare(home, c, ctx(c), "mandi", 300);   // kamar mandi bawaan: nggak ada efek
  assert.equal(c.needs.mood, 55);
});

test("game.js: denah tersimpan di catatan aksi dan diputar ulang sama", () => {
  const fx = require("../sim/fixtures/state_akun-biz1.json"), st = JSON.parse(JSON.stringify(fx));
  const g = new G.Game(st); g.advance(400, null);
  const c = g.home.living(400)[0];
  const pl = D.clone(D.plan(g.home));
  pl.R[2][4] += 1;                         // kamar tidur lebih dalam
  pl.R[3][4] += 1; pl.D = pl.D.map(k => k === "h9,11" ? "h9,12" : k);
  assert.deepEqual(D.check(pl, { lot: D.lotOf(g.home), own: D.own(g.home) }), []);
  assert.equal(g.act(c.id, D.encode(pl)), true);
  assert.equal(D.saved(g.home), true);
  g.half_now = 0; g.act(c.id, "rawat:mandi");
  const g2 = new G.Game(JSON.parse(JSON.stringify(st))); g2.half_now = 0; g2.advance(400, null);
  assert.deepEqual(D.plan(g2.home), D.plan(g.home));
  assert.equal(g2.home.snapshot(), g.home.snapshot());
});

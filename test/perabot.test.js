// Tata Rumah tahap 1 (perabot.js): beli, pasang, simpan, jual, selera, suasana, efek waktu rawat, dan save lama tetap sama.
const test = require("node:test");
const assert = require("node:assert/strict");
require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js");
const P = require("../perabot.js");
const G = require("../game.js");

const TR = { rajin: 50, impulsif: 50, setia: 50, ambisius: 50, ramah: 50, penakut: 50, patuh: 50, kreatif: 50 };
function adult(over = {}) {
  return { id: "a", name: "Tutu", traits: { ...TR, ...(over.traits || {}) }, bond: 50, info: {}, needs: { mood: 50 }, stats: { kesehatan: 50 },
    st: { wallet: over.wallet ?? 5000, skills: { logic: 10, fitness: 10, charm: 10, creativity: 10 } }, age: () => over.age ?? 300 };
}
const home0 = () => ({ world: {} });
const ctx = c => ({ need: (k, n) => { c.needs[k] = Math.min(100, c.needs[k] + n); }, stat: (k, n) => { c.stats[k] += n; } });

test("katalog: tiap ruangan punya bawaan di slot utama dan samping, harga bawaan 0, 30-40 barang beli", () => {
  for (const r of P.ROOM_IDS) for (const s of ["utama", "samping"]) { const x = P.item(P.DEF[r][s]); assert.ok(x && x.def && x.price === 0, r + s); }
  const shop = P.catalog();
  assert.ok(shop.length >= 30 && shop.length <= 40, String(shop.length));
  for (const x of P.ITEMS) if (x.def) { assert.equal(x.hias, 0, x.id); assert.equal(x.fx, null, x.id); }
  assert.ok(shop.some(x => x.kind === "fungsi") && shop.some(x => x.kind === "hias") && shop.some(x => x.kind === "dua"));
});

test("beli: perlu dewasa dengan uang cukup; masuk gudang; dompet dipotong", () => {
  const h = home0(), c = adult({ wallet: 100 });
  assert.equal(P.act(h, c, "perabot:beli:family_table", 300), false);   // 420 > 100
  assert.equal(P.act(h, adult({ age: 100 }), "perabot:beli:art_sun", 100), false);   // masih anak
  assert.equal(P.act(h, c, "perabot:beli:art_sun", 300), true);
  assert.equal(c.st.wallet, 40);
  assert.deepEqual(P.storage(h), { art_sun: 1 });
  assert.equal(P.act(h, c, "perabot:beli:pine_bed", 300), false);   // bawaan nggak dijual
});

test("pasang dan simpan: yang lama balik ke gudang, slot utama nggak bisa dikosongkan, barang salah ruangan ditolak", () => {
  const h = home0(), c = adult();
  P.act(h, c, "perabot:beli:cloud_bed", 300); P.act(h, c, "perabot:beli:art_stars", 300); P.act(h, c, "perabot:beli:art_sun", 300);
  assert.equal(P.act(h, c, "perabot:pasang:makan:utama:cloud_bed", 300), false);   // kasur bukan buat dapur
  assert.equal(P.act(h, c, "perabot:pasang:tidur:utama:cloud_bed", 300), true);
  assert.equal(P.placed(h, "tidur", "utama"), "cloud_bed");
  assert.equal(P.act(h, c, "perabot:pasang:tidur:dinding:art_stars", 300), true);
  assert.equal(P.act(h, c, "perabot:pasang:tidur:dinding:art_sun", 300), true);
  assert.deepEqual(P.storage(h), { art_stars: 1 });
  assert.equal(P.act(h, c, "perabot:simpan:tidur:utama", 300), false);
  assert.equal(P.act(h, c, "perabot:simpan:tidur:dinding", 300), true);
  assert.equal(P.placed(h, "tidur", "dinding"), null);
  assert.deepEqual(P.storage(h), { art_stars: 1, art_sun: 1 });
  // balik ke bawaan: bawaan selalu tersedia dan nggak masuk gudang
  assert.equal(P.act(h, c, "perabot:pasang:tidur:utama:pine_bed", 300), true);
  assert.deepEqual(P.storage(h), { art_stars: 1, art_sun: 1, cloud_bed: 1 });
  // bawaan ruangan lain nggak bisa dipindah ke sini
  assert.equal(P.act(h, c, "perabot:pasang:tidur:dinding:art_kitchen", 300), false);
});

test("jual: separuh harga, cuma dari gudang", () => {
  const h = home0(), c = adult({ wallet: 1000 });
  P.act(h, c, "perabot:beli:rug_shaggy", 300);
  P.act(h, c, "perabot:pasang:makan:lantai:rug_shaggy", 300);
  assert.equal(P.act(h, c, "perabot:jual:rug_shaggy", 300), false);
  P.act(h, c, "perabot:pasang:makan:lantai:rug_kitchen", 300);
  assert.equal(P.act(h, c, "perabot:jual:rug_shaggy", 300), true);
  assert.equal(c.st.wallet, 1000 - 130 + 65);
  assert.deepEqual(P.storage(h), {});
});

test("selera: kreatif suka seni, yang kurang kreatif nggak; rapi nggak suka ruangan penuh hiasan", () => {
  const art = adult({ traits: { kreatif: 80 } }), plain = adult({ traits: { kreatif: 20 } }), mid = adult();
  assert.equal(P.likes(art, P.item("art_abstract")), 1);
  assert.equal(P.likes(plain, P.item("art_abstract")), -1);
  assert.equal(P.likes(mid, P.item("art_abstract")), 0);
  const h = home0(), c = adult({ wallet: 9000 });
  for (const id of ["art_abstract", "rug_patch", "aquarium"]) P.act(h, c, "perabot:beli:" + id, 300);
  P.act(h, c, "perabot:pasang:peluk:dinding:art_abstract", 300); P.act(h, c, "perabot:pasang:peluk:lantai:rug_patch", 300);
  assert.equal(P.ambience(h, mid, "peluk"), 4);
  assert.equal(P.ambience(h, art, "peluk"), 6);
  assert.equal(P.ambience(h, plain, "peluk"), 2);
  P.act(h, c, "perabot:pasang:peluk:sudut:aquarium", 300);
  const tidy = adult({ traits: { rajin: 80 } });
  assert.equal(P.ambience(h, mid, "peluk"), 7);
  assert.equal(P.ambience(h, tidy, "peluk"), 5);   // tiga hiasan: -2 buat yang rapi
});

test("waktu rawat: rumah bawaan nggak ada efek; kasur baru nambah mood dan reaksi sekali; sekali per ruangan per hari", () => {
  const h = home0(), c = adult();
  assert.equal(P.onCare(h, c, ctx(c), "tidur", 300), null);
  assert.equal(c.needs.mood, 50);
  P.act(h, c, "perabot:beli:canopy_bed", 300); P.act(h, c, "perabot:pasang:tidur:utama:canopy_bed", 300);
  const line = P.onCare(h, c, ctx(c), "tidur", 300);
  assert.match(line, /Tutu notices the new canopy bed/);
  assert.equal(c.needs.mood, 50 + 5);        // fx 5, suasana 2 -> 0 mood
  assert.equal(P.onCare(h, c, ctx(c), "tidur", 300), null);
  assert.equal(c.needs.mood, 55);
  assert.equal(P.onCare(h, c, ctx(c), "tidur", 301), null);   // besok: efek lagi, tanpa reaksi
  assert.equal(c.needs.mood, 60);
  // meja keluarga cuma waktu makan malam
  P.act(h, c, "perabot:beli:family_table", 302); P.act(h, c, "perabot:pasang:makan:utama:family_table", 302);
  const b0 = c.bond; P.onCare(h, c, ctx(c), "makan_p", 302); assert.equal(c.bond, b0);
  P.onCare(h, c, ctx(c), "makan_m", 303); assert.ok(c.bond > b0);
});

test("game.js: aksi perabot tercatat, diputar ulang sama, dan rawat kena efek", () => {
  const st = { akun: "akun-perabot", nama: "Mochi", aturan: { sekolah: "wajib" }, hadir: [], jawaban: {}, aksi: [], dilihat: -1, tur_pintu: {}, rawat_from: 0, rawat_half: 0, jam: { base_ts: 0, base_day: 0, ms: 86400000 } };
  const g = new G.Game(st); g.advance(20, null);
  const c = g.home.members[0];
  // anak: belum bisa beli, tapi boleh nata yang ada (balik ke bawaan sama dengan yang terpasang: ditolak)
  assert.equal(g.act(c.id, "perabot:beli:art_sun"), false);
  assert.equal(g.act(c.id, "perabot:pasang:tidur:utama:pine_bed"), false);
  assert.equal(g.act(c.id, "perabot:simpan:tidur:dinding"), true);
  assert.equal(P.placed(g.home, "tidur", "dinding"), null);
  const g2 = new G.Game(JSON.parse(JSON.stringify(st))); g2.advance(20, null);
  assert.equal(g2.home.snapshot(), g.home.snapshot());
});

test("save lama: tanpa aksi perabot hasilnya sama persis dengan perabot dimatikan", () => {
  const fx = require("../sim/fixtures/state_akun-biz1.json");
  const run = () => { const g = new G.Game(JSON.parse(JSON.stringify(fx))); g.advance(Math.min(400, g.home.last_day + 1 || 400), null); return g.home.snapshot(); };
  const a = run();
  const o = P.onCare, t = P.touched;
  P.onCare = () => null; P.touched = () => false;
  try { assert.equal(run(), a); } finally { P.onCare = o; P.touched = t; }
});

test("game.js: beli dan pasang pakai uang asli, lalu diputar ulang dari catatan: rumah dan dompet sama", () => {
  const fx = require("../sim/fixtures/state_akun-biz1.json"), st = JSON.parse(JSON.stringify(fx));
  const g = new G.Game(st); g.advance(400, null);
  const c = g.home.living(400)[0], w0 = c.st.wallet;
  let bought = 0;
  for (const id of ["art_sun", "cactus_trio", "rug_stripe", "paper_lantern", "art_family", "cloud_bed"]) {
    if (!g.act(c.id, "perabot:beli:" + id)) continue;
    const x = P.item(id), r = x.room || "tidur";
    assert.equal(g.act(c.id, `perabot:pasang:${r}:${x.slot}:${id}`), true, id);
    bought += x.price;
  }
  assert.ok(bought > 0);
  assert.equal(Math.round(c.st.wallet), Math.round(w0 - bought));
  g.half_now = 0; g.act(c.id, "rawat:mandi");
  const g2 = new G.Game(JSON.parse(JSON.stringify(st))); g2.half_now = 0; g2.advance(400, null);
  assert.deepEqual(P.layout(g2.home), P.layout(g.home));
  assert.equal(g2.home.snapshot(), g.home.snapshot());
});

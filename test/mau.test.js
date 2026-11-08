// v86: saran harian nggak ditolak lagi. Kalau makhluknya lagi nggak mau (game.mauOf, sekali sehari per jenis saran), sarannya tetap
// jalan, harganya mood −3 dan ikatan −0,5, dan UI bisa nulis itu sebelum tombolnya dipencet. Save lama (mau_from null) tetap bisa nolak.
const test = require("node:test");
const assert = require("node:assert/strict");
require("../engine.js");
require("../storylets.js"); require("../status.js"); require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); require("../wants.js"); require("../tonggak.js");
require("../ilmu.js");
const G = require("../game.js");
const Mk = require("../market.js");
const buyable = (c, d) => Mk.LINES.find(l => l.price <= 3000 && l.cat !== "Classes" && Mk.canBuyNew(c, l.id, d));

const fresh = (akun, mau = 0) => ({ akun, nama: "Mochi", aturan: { sekolah: "wajib" }, hadir: [], jawaban: {}, aksi: [], dilihat: -1, tur_pintu: {}, rawat_from: 0, rawat_half: 0, ilmu_from: 0, mau_from: mau, jam: { base_ts: 0, base_day: 0, ms: 86400000 } });

function grown(akun, mau) {
  const g = new G.Game(fresh(akun, mau)), c = g.home.members[0];
  g.advance(c.born + 400, null);
  if (c.st) c.st.wallet = 50000;
  return { g, c };
}

test("nggak mau: saran tetap jalan, harga mood dan ikatan, sama dengan yang ditulis sebelumnya", () => {
  let hit = 0;
  for (const akun of ["mau-a", "mau-b", "mau-c", "mau-d"]) {
    const { g, c } = grown(akun, 0);
    for (let k = 0; k < 40 && hit < 3; k++) {
      const d = g.home.last_day, m = g.mauOf(c.id, "buy", d);
      if (m) {
        const L = buyable(c, d), mood0 = c.needs.mood, w0 = c.st.wallet;
        const ok = g.act(c.id, "pasar:beli:" + L.id);
        assert.equal(ok, true, "sarannya jalan");
        assert.ok(g.reluctant && g.reluctant.mood === 3 && g.reluctant.bond === 0.5);
        assert.ok(!g.refused);
        assert.ok(c.st.wallet < w0, "barangnya kebeli");
        assert.ok(c.needs.mood <= mood0 - 3 + 1e-9 || c.needs.mood === 0, "mood turun");
        hit++;
      } else {
        const L = buyable(c, d);
        if (L) { g.act(c.id, "pasar:beli:" + L.id); assert.equal(g.reluctant, null); }
      }
      g.advance(d + 1, null);
    }
  }
  assert.ok(hit > 0, "harusnya ada hari dia nggak mau");
});

test("mulai mau_from nggak ada penolakan sama sekali; sebelum itu masih ada", () => {
  const { g, c } = grown("mau-x", 0);
  for (let d = g.home.last_day; d < g.home.last_day + 200; d++) for (const k of ["apply:nurse", "pasar:beli:lamp", "biz:suggest:cafe", "kerja:shift:day", "pet:adopt:fish@shelter"])
    assert.equal(g._refuse(c.id, k, d), null);
  const old = grown("mau-y", null);
  let no = 0;
  for (let d = old.g.home.last_day; d < old.g.home.last_day + 200; d++) if (old.g._refuse(old.c.id, "biz:suggest:cafe", d)) no++;
  assert.ok(no > 0, "save lama masih bisa nolak");
});

test("mauOf nggak ngubah apa-apa dan hasilnya tetap buat hari dan jenis yang sama", () => {
  const { g, c } = grown("mau-z", 0), d = g.home.last_day, b0 = c.bond, m0 = c.needs.mood;
  const a = ["job", "buy", "open", "biz", "work", "pet"].map(k => !!g.mauOf(c.id, k, d));
  const b = ["job", "buy", "open", "biz", "work", "pet"].map(k => !!g.mauOf(c.id, k, d));
  assert.deepEqual(a, b);
  assert.equal(c.bond, b0); assert.equal(c.needs.mood, m0);
  assert.equal(!!g.mauOf(c.id, "pasar:beli:lamp", d), a[1], "jenis dari kind sama dengan kategori");
});

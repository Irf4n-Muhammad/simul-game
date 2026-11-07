// Tes hapus pensil (tree.js "hapus:<id>"): sebelum umur 30 bintang di ujung jalur boleh dihapus dan poinnya balik.
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
require("../storylets.js"); require("../status.js"); const Tree = require("../tree.js"); require("../agenda.js"); require("../career.js"); require("../market.js"); require("../wants.js");

const grow = days => { const h = new E.Household("akun/hapus", new E.GuardianBot("suportif", 1)); h.found("m1", "Mochi"); h.view(days, []); return { h, c: h.members[0] }; };
const act = (h, c, kind, day) => E.HOOKS.act(h, c.id, kind, day);

test("hapus ujung jalur sebelum umur 30: poin balik, bintang hilang", () => {
  const { h, c } = grow(20), day = c.born + 20;
  c.st.tree.peak += 20;
  const p0 = Tree.points(c);
  assert.ok(act(h, c, "pohon:spark", day)); assert.ok(act(h, c, "pohon:art", day));
  const p1 = Tree.points(c);
  assert.ok(!Tree.canErase(c, "spark", day), "akar masih dipakai art");
  assert.ok(Tree.canErase(c, "art", day));
  assert.ok(act(h, c, "hapus:art", day));
  assert.ok(!c.st.tree.have.includes("art"));
  assert.ok(act(h, c, "hapus:spark", day));
  assert.equal(Tree.points(c), p0);
  assert.ok(p1 < p0);
});

test("sesudah malam pembacaan tintanya permanen", () => {
  const { h, c } = grow(40), day = c.born + 40;
  c.st.tree.peak += 10;
  assert.ok(act(h, c, "pohon:mind", day));
  assert.ok(!Tree.canErase(c, "mind", day));
  assert.ok(!act(h, c, "hapus:mind", day));
});

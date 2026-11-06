// bank.js: bunga mengambang, cicilan yang lunas tepat di akhir tenor, batas rumah tangga, utang yang tidak bisa hilang.
const test = require("node:test");
const assert = require("node:assert/strict");
const CFG = require("../econ-config.js");
const MK = require("../makro.js");
const Money = require("../money.js");
const BK = require("../bank.js");

// makhluk palsu: umur 400 hari (dewasa) kecuali diberi umur lain
const mk = (id, age = 400) => ({ id, info: {}, st: { wallet: 0 }, alive: () => true, age: () => age });
const homeOf = (...members) => ({ world: {}, members, get: id => members.find(m => m.id === id) });

test("bunga ikut suku bunga acuan dunia plus spread", () => {
  for (const d of [0, 300, 900, 1500]) assert.equal(BK.rate("biz", d), Math.round((MK.rate(d) + CFG.BANK.SPREAD.biz) * 10000) / 10000);
});

test("pinjaman lunas tepat di akhir tenor walau bunganya berubah tiap hari", () => {
  const h = homeOf(mk("a"));
  const L = BK.make("biz", 6000, 100, 240, h);
  let paid = 0, d = 100;
  for (; d < 100 + 240 && L.p > 0; d++) { const p = BK.due(L, d, h); paid += p; if (BK.applyPay(L, p, d, h)) break; }
  assert.equal(L.p, 0);
  assert.ok(d <= 100 + 240, "lunas paling lambat di hari terakhir tenor");
  assert.ok(paid > 6000 && paid < 6000 * 1.2, `total bayar wajar: ${paid}`);
});

test("pinjaman buka usaha dibatasi pemasukan rutin rumah tangga, bukan per makhluk", () => {
  const a = mk("a"), b = mk("b"), h = homeOf(a, b);
  for (let d = 0; d < 90; d++) Money.move(a, 60, "gaji", d);
  // pemasukan rutin 60/hari: ruang cicilan 24/hari
  const ok = BK.openCheck(h, a, 1000, 90, []);
  assert.ok(ok.ok);
  const big = BK.openCheck(h, a, 50000, 90, []);
  assert.equal(big.ok, false);
  // pinjaman pertama makan ruang: anggota kedua tidak bisa pinjam sebesar yang sama lagi
  const first = { loan: BK.make("open", ok.max, 90, ok.term, h) };
  const second = BK.openCheck(h, b, ok.max, 90, [first]);
  assert.equal(second.ok, false);
  // lembur sesaat tidak menaikkan plafon (cuma gaji, pensiun, ambilan bisnis)
  Money.move(a, 100000, "lembur", 90);
  assert.equal(BK.openCheck(h, a, 50000, 90, []).ok, false);
});

test("makhluk tua: plafon separuh dan tenor pendek", () => {
  const young = mk("y"), old = mk("o", 2000);
  const hy = homeOf(young), ho = homeOf(old);
  for (let d = 0; d < 90; d++) { Money.move(young, 60, "gaji", d); Money.move(old, 60, "pensiun", d); }
  const a = BK.openCheck(hy, young, 1, 90, []), b = BK.openCheck(ho, old, 1, 90, []);
  assert.ok(b.term <= CFG.BANK.OLD_TERM);
  assert.ok(b.max < a.max);
});

test("utang pribadi dicicil dari dompet, dan sisa saat meninggal merusak riwayat kredit", () => {
  const a = mk("a"), h = homeOf(a);
  BK.toPersonal(h, a, 3000, 10);
  a.st.wallet = 500;
  const r = BK.payPersonal(h, a, 10);
  assert.ok(r.paid > 0 && a.st.wallet < 500);
  assert.ok(a.st.utang.p < 3000);
  a.st.wallet = 100;
  const s = BK.settle(h, a, 11);
  assert.equal(s.paid, 100);
  assert.ok(s.lost > 0);
  assert.equal(a.st.utang, null);
  assert.ok(BK.blocked(h, 12));
  assert.ok(BK.rate("open", 12, h) > BK.rate("open", 12));
  assert.equal(BK.openCheck(h, a, 1, 12, []).ok, false);
  assert.equal(BK.blocked(h, 11 + CFG.BANK.BAD_BLOCK + 1), false);
});

test("menunggak lama = gagal bayar; bunga tak terbayar masuk pokok", () => {
  const a = mk("a"), h = homeOf(a);
  BK.toPersonal(h, a, 3000, 0);
  for (let d = 0; d < CFG.BANK.LATE_BAD; d++) BK.payPersonal(h, a, d);
  assert.ok(a.st.utang.p > 3000);
  assert.ok(BK.blocked(h, CFG.BANK.LATE_BAD));
});

test("persetujuan sama tiap kali dicoba (tanpa acak)", () => {
  const a = mk("a"), h = homeOf(a);
  for (let d = 0; d < 60; d++) Money.move(a, 50, "gaji", d);
  const r1 = BK.openCheck(h, a, 2000, 60, []), r2 = BK.openCheck(h, a, 2000, 60, []);
  assert.deepEqual(r1, r2);
});

test("bunga tabungan selalu minimal 3% di bawah pinjaman termurah", () => {
  for (let d = 0; d < 3000; d += 7) assert.ok(BK.saveRate(d) <= BK.cheapest(d) - 0.03, `hari ${d}`);
});

test("tabungan: simpan, bunga harian, ambil; tagihan wajib ambil dari tabungan", () => {
  const a = mk("a"), h = homeOf(a);
  a.st.wallet = 1000;
  assert.ok(BK.deposit(a, 600, 1));
  assert.equal(a.st.wallet, 400); assert.equal(a.st.tab, 600);
  for (let d = 1; d <= 365; d++) BK.accrue(a, d);
  assert.ok(a.st.tab > 600 && a.st.tab < 700);
  BK.accrue(a, 365); // sekali sehari saja
  const t = a.st.tab; BK.accrue(a, 365); assert.equal(a.st.tab, t);
  BK.toPersonal(h, a, 2000, 366);
  a.st.wallet = 0;
  BK.payPersonal(h, a, 366);
  assert.ok(a.st.tab < t, "cicilan utang diambil dari tabungan");
  assert.equal(a.st.utang.late || 0, 0);
  // meninggal: tabungan ikut jadi harta
  const s = BK.settle(h, a, 367);
  assert.equal(a.st.tab, 0);
  assert.ok(s.paid > 0);
});

test("KPR: uang muka 30%, masuk batas rumah tangga, satu pinjaman per keluarga, lunas atau disita", () => {
  const a = mk("a"), h = homeOf(a);
  for (let d = 0; d < 90; d++) Money.move(a, 400, "gaji", d);
  a.st.wallet = 9000;
  const q = BK.kprCheck(h, a, 30000, 90, []);
  assert.ok(q.ok, JSON.stringify(q));
  assert.equal(q.down, 9000);
  BK.kprOpen(h, a, q, "house", 90);
  assert.equal(a.st.wallet, 0);
  assert.equal(BK.kprCheck(h, a, 30000, 90, []).ok, false, "satu rumah satu pinjaman");
  // ruang cicilan berkurang untuk pinjaman lain
  assert.ok(BK.room(h, 90, []) < BK.income(h, 90) * CFG.BANK.HOUSEHOLD_SHARE);
  // nunggak sampai disita
  let r = null;
  for (let d = 91; d < 91 + CFG.BANK.KPR_LATE; d++) r = BK.kprPay(h, a, d);
  assert.ok(r.foreclose);
  const f = BK.foreclose(h, a, 30000, 91 + CFG.BANK.KPR_LATE);
  assert.equal(f.sale, 24000);
  assert.equal(BK.kpr(h), null);
  assert.ok(BK.blocked(h, 91 + CFG.BANK.KPR_LATE + 1));
});

test("KPR ditolak kalau pemasukan rutin terlalu kecil", () => {
  const a = mk("a"), h = homeOf(a);
  for (let d = 0; d < 90; d++) Money.move(a, 30, "gaji", d);
  a.st.wallet = 100000;
  assert.equal(BK.kprCheck(h, a, 200000, 90, []).why, "income");
});

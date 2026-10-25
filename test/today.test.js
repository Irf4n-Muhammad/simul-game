// Baris "Today" (today.js Today.line): urutan prioritas dan teksnya, sama dengan todayLine inline v44.
const test = require("node:test");
const assert = require("node:assert/strict");
const Today = require("../today.js");
const Wants = require("../wants.js");

const D = 700;
const door = Wants.DOORS[0];
const base = (over = {}) => ({
  cur: { id: "m1", fase: "dewasa", nama: "Mochi" },
  pending: null, feed: [], d: D,
  doors: () => ({}), care: () => null, next: () => null, wants: () => [],
  fmtWhen: day => day === D ? "Today" : day === D + 1 ? "Tomorrow" : `In ${day - D} days`,
  nameOf: cid => cid === "m1" ? "Mochi" : "Kiko",
  ...over,
});
const doorLog = { day: D, cid: "m1", events: [door.story], lines: [] };
const promoLog = { day: D, cid: "m1", events: [], lines: [], ach: [{ id: "promo_1", label: "Promoted to team lead" }] };
const careOpen = { half: 0, items: [{ id: "fruit", label: "Breakfast", open: true, done: false }, { id: "wash", label: "Wash up", open: true, done: false }, { id: "nap", label: "Nap", open: false, done: false }] };
const careDone = { half: 1, items: [{ id: "cuddle", label: "Cuddle", open: true, done: true }] };
const soon = { id: "iv1", day: D + 2, cid: "m2", label: "job interview" };
const want = { id: "sepatu", ic: "👟", label: "new shoes" };

test("makhluk pergi atau tidak ada: baris disembunyikan", () => {
  assert.equal(Today.line(base({ cur: null })), null);
  for (const fase of ["meninggal", "merantau"]) assert.equal(Today.line(base({ cur: { id: "m1", fase, nama: "Mochi" }, pending: { name: "Mochi" } })), null);
});

test("dilema menunggu: paling atas, ditandai baru", () => {
  const L = Today.line(base({ pending: { name: "Rara" } }));
  assert.deepEqual(L, { k: "dilema", ic: "💬", tx: "Rara needs an answer", go: "dilema", now: true });
});

test("pintu baru hari ini: hanya kalau pintunya memang terbuka", () => {
  const L = Today.line(base({ feed: [doorLog], doors: () => ({ [door.id]: true }) }));
  assert.deepEqual(L, { k: "pintu:" + door.id, ic: "✨", tx: `New today: ${door.label}`, go: "tur", id: door.id, now: true });
  assert.equal(Today.line(base({ feed: [doorLog] })).k, "sepi");
  assert.equal(Today.line(base({ feed: [{ ...doorLog, day: D - 1 }], doors: () => ({ [door.id]: true }) })).k, "sepi");
});

test("momen greget hari ini: skor >= 2 dan ada kalimat, hanya log makhluk ini", () => {
  const L = Today.line(base({ feed: [promoLog] }));
  assert.deepEqual(L, { k: "momen:capaian:promo_", ic: "✨", tx: "Promoted to team lead", go: "diary" });
  assert.equal(Today.line(base({ feed: [{ ...promoLog, cid: "m2" }] })).k, "sepi");
  const tense = Today.line(base({ feed: [{ day: D, cid: "m1", events: [], lines: ["A long night at the shop."], dramas: ["besar"] }] }));
  assert.equal(tense.ic, "⏳"); assert.equal(tense.tx, "A long night at the shop."); assert.equal(tense.go, "diary");
});

test("rawat terbuka: item pertama, jumlah sisa, ikon pagi/malam", () => {
  const L = Today.line(base({ care: () => careOpen }));
  assert.deepEqual(L, { k: "rawat:fruit:0", ic: "☀", tx: "Breakfast for Mochi · 2 to do", go: "rawat", id: "fruit" });
  const night = Today.line(base({ care: () => ({ half: 1, items: [{ id: "cuddle", label: "Cuddle", open: true, done: false }] }) }));
  assert.deepEqual(night, { k: "rawat:cuddle:1", ic: "☾", tx: "Cuddle for Mochi", go: "rawat", id: "cuddle" });
});

test("momen terjadwal: tampil kalau <= 2 hari lagi", () => {
  const L = Today.line(base({ next: () => soon }));
  assert.deepEqual(L, { k: "momen:iv1", ic: "📌", tx: "In 2 days: Kiko, job interview", go: "momen", m: soon });
  assert.equal(Today.line(base({ next: () => ({ ...soon, day: D + 3 }) })).k, "sepi");
});

test("keinginan aktif pertama", () => {
  const L = Today.line(base({ wants: () => [want, { id: "lain", ic: "x", label: "other" }] }));
  assert.deepEqual(L, { k: "ingin:sepatu", ic: "👟", tx: "Mochi wants new shoes", go: "profil" });
});

test("rawat selesai dan hari sepi: baris tenang tanpa aksi", () => {
  assert.deepEqual(Today.line(base({ care: () => careDone })), { k: "beres:1", ic: "✓", tx: "All done for today. Mochi is settled.", quiet: true });
  assert.deepEqual(Today.line(base({ care: () => ({ ...careDone, half: 0 }) })), { k: "beres:0", ic: "✓", tx: "Morning done. Come back this evening.", quiet: true });
  assert.deepEqual(Today.line(base()), { k: "sepi", ic: "·", tx: "A quiet day in Old Town.", quiet: true });
});

test("urutan prioritas: dilema > pintu > momen hari ini > rawat > momen terjadwal > keinginan > beres", () => {
  const S = base({ pending: { name: "Rara" }, feed: [doorLog, promoLog], doors: () => ({ [door.id]: true }), care: () => careOpen, next: () => soon, wants: () => [want] });
  const order = [];
  for (const [strip, k] of [[null, "dilema"], ["pending", "pintu:" + door.id], ["doors", "momen:capaian:promo_"], ["feed", "rawat:fruit:0"], ["care", "momen:iv1"], ["next", "ingin:sepatu"], ["wants", "beres:1"]]) {
    if (strip === "pending") S.pending = null;
    if (strip === "doors") S.doors = () => ({});
    if (strip === "feed") S.feed = [];
    if (strip === "care") S.care = () => careDone;
    if (strip === "next") S.next = () => null;
    if (strip === "wants") S.wants = () => [];
    order.push(Today.line(S).k); assert.equal(order[order.length - 1], k);
  }
});

test("malas seperti versi inline: potret yang lebih bawah tidak dihitung kalau sudah ada jawaban", () => {
  const calls = [];
  const spy = (name, v) => () => { calls.push(name); return v; };
  Today.line(base({ pending: { name: "Rara" }, doors: spy("doors", {}), care: spy("care", null), next: spy("next", null), wants: spy("wants", []) }));
  assert.deepEqual(calls, []);
  Today.line(base({ care: spy("care", careOpen), next: spy("next", null), wants: spy("wants", []) }));
  assert.deepEqual(calls, ["care"]);
});

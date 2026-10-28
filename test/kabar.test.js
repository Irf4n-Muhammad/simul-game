// Notifikasi (kabar.js, v48): paling banyak dua sehari, jam tenang, malam batal kalau rawat beres, isi pagi = alasan buka hari ini.
const test = require("node:test");
const assert = require("node:assert/strict");
const K = require("../kabar.js");

const S = (over = {}) => ({ d: 200, now: 200.3, nama: "Mochi", fase: "anak", done: { malam: false }, tanya: true, away: false, school: [], mag: 230, ...over });
const perDay = L => L.reduce((m, x) => ((m[Math.floor(x.at)] = (m[Math.floor(x.at)] || 0) + 1), m), {});

test("paling banyak dua sehari, nggak ada yang di jam tenang, urut waktu, semua di masa depan", () => {
  for (const now of [200.01, 200.3, 200.5, 200.85, 200.95]) {
    const L = K.plan(S({ now }));
    for (const n of Object.values(perDay(L))) assert.ok(n <= 2);
    for (const x of L) { assert.ok(!K.quiet(x.at), x.at); assert.ok(x.at > now); assert.ok(x.title && x.body); }
    for (let i = 1; i < L.length; i++) assert.ok(L[i].at >= L[i - 1].at);
  }
});

test("pagi hari ini: tanggal sekolah didahulukan, lalu majalah, lalu pertanyaan", () => {
  const first = o => K.plan(S({ now: 200.1, ...o }))[0];
  assert.match(first({ school: [{ day: 200, label: "Spelling quiz" }], mag: 200 }).title, /Spelling quiz today/);
  assert.equal(first({ mag: 200 }).tag, "mag");
  assert.match(first({}).title, /wants to ask you something/);
  assert.match(first({ fase: "bayi" }).title, /is awake/);
});

test("malam batal kalau rawat malam hari ini sudah beres; besok tetap", () => {
  const L = K.plan(S({ now: 200.6, done: { malam: true } }));
  assert.ok(!L.some(x => Math.floor(x.at) === 200 && x.tag === "malam"));
  assert.ok(L.some(x => Math.floor(x.at) === 201 && x.tag === "malam"));
});

test("dua hari nggak buka: satu kabar kangen, pagi hari itu diganti", () => {
  const L = K.plan(S()).filter(x => Math.floor(x.at) === 202);
  assert.deepEqual(L.map(x => x.tag), ["kangen", "malam"]);
});

test("dititipkan: cuma majalah; makhluk pergi: kosong", () => {
  const L = K.plan(S({ away: true, mag: 201 }));
  assert.deepEqual(L.map(x => x.tag), ["mag"]);
  assert.deepEqual(K.plan(S({ fase: "merantau" })), []);
});

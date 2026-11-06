// v78: konser live (konser.js): jadwal dari jam asli, babak dan momen besar, dan not musik. Gambar dan bunyinya butuh browser.
const test = require("node:test");
const assert = require("node:assert/strict");
const K = require("../konser.js");

test("babak urut, mulai dari 0, momen besar tiap paling lama 60 detik", () => {
  assert.equal(K.ACTS[0].t, 0);
  for (let i = 1; i < K.ACTS.length; i++) assert.ok(K.ACTS[i].t > K.ACTS[i - 1].t);
  const ts = K.MOMENTS.map(m => m.t);
  for (let i = 1; i < ts.length; i++) assert.ok(ts[i] - ts[i - 1] <= 60, `jeda ${ts[i - 1]}→${ts[i]}`);
  for (const m of K.MOMENTS) assert.ok(m.t + m.d <= K.LEN, m.id);
});

test("keadaan show: sebelum, lagi jalan, sesudah; melayang cuma di lagu 2", () => {
  assert.equal(K.at(-30).phase, "before"); assert.equal(K.at(-30).left, 30);
  assert.equal(K.at(0).phase, "show"); assert.equal(K.at(0).act, "intro");
  assert.equal(K.at(45).act, "song1"); assert.equal(K.at(200).act, "song2"); assert.equal(K.at(359).act, "outro");
  assert.equal(K.at(K.LEN).phase, "after");
  assert.equal(K.at(200).gravity, 0.3); assert.equal(K.at(100).gravity, 1);
  assert.ok(K.momentNow(275, "fireworks") > 0); assert.equal(K.momentNow(100, "fireworks"), -1);
  assert.ok(K.at(300).energy > K.at(45).energy); assert.ok(K.at(359).energy < 0.1);
  const a = K.at(45.25); assert.ok(a.beatK > 0.4 && a.beatK < 0.6);
});

test("jadwal: tiap Sabtu jam 20:00, pintu buka 15 menit sebelumnya, telat masuk ke tengah show", () => {
  const mon = new Date(2026, 10, 2, 10, 0);   // Senin
  const S = K.next(mon, null);
  assert.equal(new Date(S.start).getDay(), 6); assert.equal(new Date(S.start).getHours(), 20);
  assert.equal(K.status(mon, null).phase, "soon");
  assert.equal(K.status(new Date(2026, 10, 7, 19, 50), null).phase, "doors");
  const late = K.status(new Date(2026, 10, 7, 20, 2), null);
  assert.equal(late.phase, "live"); assert.equal(Math.round(late.sec), 120);
  // habis show Sabtu, konser berikutnya Sabtu depan
  const after = K.next(new Date(2026, 10, 7, 20, 7), null);
  assert.equal(new Date(after.start).getDate(), 14);
});

test("jadwal: pas festival ada show tambahan jam 21:00 hari itu", () => {
  const S = K.next(new Date(2026, 10, 3, 18, 0), { nama: "Lantern Festival" });
  assert.equal(S.kind, "festival"); assert.equal(new Date(S.start).getHours(), 21); assert.match(S.name, /Lantern Festival/);
});

test("musik: sama tiap dipanggil, kick 4 ketukan di lagu, sepi sebelum dan sesudah show", () => {
  assert.deepEqual(K.step(800), K.step(800));
  assert.equal(K.step(-1), null); assert.equal(K.step(K.LEN / K.STEP), null);
  const song = Math.round(40 / K.STEP / 16) * 16;   // awal bar di lagu 1
  assert.equal(K.step(song).kick, true); assert.equal(K.step(song + 4).snare, true); assert.equal(K.step(song + 1).kick, false);
  assert.ok(K.step(song).bass >= 36);
  assert.equal(K.step(Math.round(8 / K.STEP)).boom, true);
  let leads = 0; for (let n = song; n < song + 64; n++) if (K.step(n).lead) leads++;
  assert.ok(leads > 8 && leads < 64, `${leads} not melodi`);
});

test("teks hitung mundur dan jam show", () => {
  assert.equal(K.wait(90 * 60000), "1h 30m"); assert.equal(K.wait(3 * 86400000), "3d 0h"); assert.equal(K.wait(30000), "1 min");
  assert.equal(K.clock(125), "2:05");
});

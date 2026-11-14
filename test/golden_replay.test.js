// Pengaman save pemain: save = catatan aksi yang diputar ulang dari hari 0 (game.js Game.advance). Kalau logika simulasi
// berubah, save lama bisa diam-diam jadi cerita lain. Tes ini memutar ulang tiga save contoh (sim/fixtures) dan
// membandingkan sidik (sha256) keadaan rumah + seluruh log hari dengan yang tersimpan di test/golden/replay.json.
//
// Gagal di sini = perubahanmu MENGUBAH hasil replay save lama.
//   - Tidak disengaja (refactor, rapihin): cari penyebabnya, jangan perbarui golden.
//   - Disengaja (fitur baru yang memang mengubah cerita): pagari dengan flag versi `*_from` (lihat ARCHITECTURE.md,
//     bagian "Save dan replay") supaya save lama tetap sama. Kalau memang harus berubah, perbarui golden:
//       UPDATE_GOLDEN=1 node --test test/golden_replay.test.js
//     lalu jelaskan alasannya di PR.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const G = require("../game.js");

const GOLDEN = path.join(__dirname, "golden", "replay.json");
const CASES = [["akun-biz0", 1400], ["akun-biz1", 1400], ["akun-biz4", 1200]];
const sha = s => crypto.createHash("sha256").update(s).digest("hex");

function replay(name, days) {
  const st = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "sim", "fixtures", `state_${name}.json`), "utf8"));
  const g = new G.Game(st);
  const logs = g.advance(days);
  return { day: g.home.last_day, pending: g.pending ? g.pending.key : null, logs: logs.length,
    home: sha(g.home.snapshot()), log: sha(JSON.stringify(logs)) };
}

const got = Object.fromEntries(CASES.map(([n, d]) => [n, replay(n, d)]));
if (process.env.UPDATE_GOLDEN) fs.writeFileSync(GOLDEN, JSON.stringify(got, null, 2) + "\n");
const want = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));

for (const [n] of CASES) {
  test(`replay ${n}: hasil sama persis dengan golden`, () => assert.deepEqual(got[n], want[n]));
}

// Dadu harian: angka yang dilihat pemain (HUD, sheet, dadu 3D) harus sama dengan angka yang dipakai skor momen penting.
// Laporan pemain: "lihat 5, di sistem dapat 2". Penyebabnya: setelah dadu disimpan, HUD dan teks bilang 3, padahal
// status.js menghitung hari itu sebagai 2. Sekarang UI membaca dice.shown dari familyView, satu sumber dengan luck().
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
for (const m of ["econ-config", "money", "engine", "storylets", "agenda", "makro", "bank", "status", "tree", "ilmu", "jadwal", "rasi", "cosmetics", "career", "market", "venture", "work", "pets", "mag", "wants", "tonggak", "anak", "remaja", "obrolan"]) require(`../${m}.js`);
const ST = require("../status.js");
const G = require("../game.js");

const fresh = akun => ({ akun, nama: "Mochi", aturan: { sekolah: "wajib" }, hadir: [], jawaban: {}, aksi: [], dilihat: -1, tur_pintu: {},
  jam: { base_ts: 0, base_day: 0, ms: 86400000 } });
function gameAt(akun, day) { const g = new G.Game(fresh(akun)); for (let d = 0; d <= day; d++) g.advance(d, null); return g; }
const view = g => ST.familyView(g.home, g.home.last_day).dice;

test("belum lempar: tidak ada angka di HUD, sistem pakai 2", () => {
  const D = view(gameAt("dadu-a", 30));
  assert.equal(D.shown, null); assert.equal(D.luck.value, 2); assert.equal(D.luck.src, "none");
});

test("lempar: angka di HUD = angka lemparan = angka yang dipakai", () => {
  const g = gameAt("dadu-b", 30);
  assert.ok(g.act("home", "dadu"));
  const D = view(g);
  assert.ok(D.today.rolled >= 1 && D.today.rolled <= 6);
  assert.equal(D.shown, D.today.rolled); assert.equal(D.luck.value, D.today.rolled);
});

test("simpan: HUD ikut sistem (2), bukan 3; pakai dadu simpanan besoknya: HUD = angka simpanan", () => {
  const g = gameAt("dadu-c", 30);
  assert.ok(g.act("home", "dadu"));
  const v = view(g).today.rolled;
  assert.ok(g.act("home", "simpan_dadu"));
  let D = view(g);
  assert.equal(D.luck.src, "saved_away");
  assert.equal(D.shown, D.luck.value); assert.equal(D.shown, 2);
  g.advance(31, null);
  assert.ok(g.act("home", "pakai_dadu:0"));
  D = view(g);
  assert.equal(D.luck.value, v); assert.equal(D.shown, v);
});

test("skor momen penting memakai angka yang sama dengan yang ditunjukkan hari itu", () => {
  const g = new G.Game(fresh("dadu-d")), shown = {}, seen = new Set();
  let n = 0;
  for (let d = 0; d < 700; d++) {
    g.advance(d, null);
    const day = g.home.last_day;
    if (d % 3 === 0) { g.act("home", "dadu"); if (d % 9 === 0) g.act("home", "simpan_dadu"); }
    if (d % 7 === 0) g.act("home", "pakai_dadu:0");
    shown[day] = view(g).shown ?? 2;
    for (const r of ST.fam(g.home).results) {
      if (seen.has(r.id)) continue; seen.add(r.id); n++;
      assert.equal(r.parts.dice, shown[r.day], `momen ${r.kind} hari ${r.day}: tampil ${shown[r.day]}, dipakai ${r.parts.dice}`);
    }
  }
  assert.ok(n > 0, "harus ada momen penting yang selesai");
});

// Dadu 3D (ui/11-status-sheets.js): muka bernilai v diputar ke arah kamera (+z). Kamera rumah hampir lurus dari depan
// (naik ~7°), jadi muka depan yang terbaca. Tes ini menjaga urutan material dan FACE_ROT tetap cocok.
test("dadu 3D: FACE_ROT menghadapkan muka v ke depan (+z)", () => {
  const src = fs.readFileSync(path.join(__dirname, "../ui/11-status-sheets.js"), "utf8");
  const order = JSON.parse(src.match(/RB\(0\.6, 0\.6, 0\.6, 0\.09\), (\[[\d, ]+\])\.map/)[1]);   // urutan BoxGeometry: +x -x +y -y +z -z
  const FACE_ROT = new Function(`return ${src.match(/const FACE_ROT = (\{[^\n]*\});/)[1]};`)();
  const N = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  // Euler XYZ three.js: R = Rx * Ry * Rz (rz = 0 saat mendarat)
  const rot = ([x, y, z], rx, ry) => {
    const x1 = x * Math.cos(ry) + z * Math.sin(ry), z1 = -x * Math.sin(ry) + z * Math.cos(ry);
    return [x1, y * Math.cos(rx) - z1 * Math.sin(rx), y * Math.sin(rx) + z1 * Math.cos(rx)];
  };
  for (let v = 1; v <= 6; v++) {
    const [rx, ry] = FACE_ROT[v];
    const front = N.findIndex(n => rot(n, rx, ry)[2] > 0.99);
    assert.equal(order[front], v, `hasil ${v}, muka depan menunjukkan ${order[front]}`);
  }
});

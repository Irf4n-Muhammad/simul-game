// Peta benua (v75): lapisan antara globe dan kota. globe → benua → kota → jalan.
// Murni (tanpa three.js), semua dari bumi.js + benih tetap, jadi peta tiap benua sama di semua HP:
// kota-kota kecil, jalan antar kota (pohon rentang terpendek), gunung, hutan, dan sungai yang ngalir turun ke laut.
// continent.js yang gambar. Satuan peta: U unit per derajat, x ke timur, z ke selatan (sama arah dengan peta kota).
"use strict";
(function () {
  const B = typeof module !== "undefined" ? require("./bumi.js") : globalThis.Bumi;
  const U = 4, RAD = Math.PI / 180;

  // nama kota kecil per benua (rasanya ikut benua). Yang pertama dipakai duluan.
  const NAMES = {
    meridia: ["Millbrook", "Ashford", "Kettlewick", "Oakhollow", "Stonebridge", "Fernly", "Harrowfield", "Wrenmoor", "Dunmere", "Bramblegate", "Thistledown", "Larkspur"],
    solenne: ["Qasira", "Dunewell", "Saffra", "Mirabad", "Oasis Gate", "Tamarind", "Zahra", "Coralis", "Sunmere", "Amberly", "Kesh", "Palmyra"],
    frostholm: ["Skarvik", "Elkmoor", "Fjellby", "Rimehold", "Birchvale", "Snowmere", "Tindra", "Kaldness", "Northwick", "Frostby", "Ulfstad", "Hvitby"],
    thalassa: ["Lagoona", "Reefhaven", "Palmcove", "Tidewater", "Mangrove", "Shellbay", "Kalani", "Coralee", "Seabright", "Atoll", "Moana", "Driftwood"],
    ventara: ["Highcairn", "Windmere", "Stonereach", "Eaglecrest", "Cloudrest", "Pinegap", "Talon", "Summit", "Ridgeway", "Gustholm", "Cragmoor", "Aeris"],
  };

  // v80: wilayah liar per benua (konsep: konsep/05-wilayah-liar). live = adegan 3D-nya sudah ada di liar.js.
  // kind dipakai continent.js buat warna tanda di peta. Laut Lepas (Thalassa) menyusul, karena tempatnya di laut.
  const WILD = {
    meridia: [{ id: "angin", name: "Windy Plains", kind: "plain" }, { id: "kabut", name: "Mist Marsh", kind: "marsh" }],
    solenne: [{ id: "pasir", name: "Sea of Sand", kind: "sand", live: true }, { id: "ngarai", name: "Red Canyon", kind: "canyon" }, { id: "sabana", name: "Savanna", kind: "savanna" }],
    frostholm: [{ id: "es", name: "Polar Ice", kind: "ice" }, { id: "tundra", name: "Tundra", kind: "tundra" }],
    thalassa: [{ id: "hutan", name: "Deepwood", kind: "forest", live: true }, { id: "apigunung", name: "Fire Mountain", kind: "volcano" }],
    ventara: [{ id: "awan", name: "Cloud Peak", kind: "peak" }],
  };

  function rng(seed) {
    let a = 0; for (const ch of String(seed)) a = (Math.imul(a, 31) + ch.charCodeAt(0)) | 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // lat/lon ↔ peta benua (proyeksi datar di sekitar pusat benua)
  const toMap = (C, lat, lon) => ({ x: ((((lon - C.lon) + 540) % 360) - 180) * Math.cos(C.lat * RAD) * U, z: -(lat - C.lat) * U });
  const toLatLon = (C, x, z) => ({ lat: C.lat - z / U, lon: C.lon + x / (U * Math.cos(C.lat * RAD)) });

  const cache = {};
  function region(id) {
    if (cache[id]) return cache[id];
    const C = B.CONT[id]; if (!C) return null;
    // ukuran peta: semua gumpalan daratan benua + pinggiran laut
    let ext = 0; for (const [dl, dn, r] of C.blobs) ext = Math.max(ext, Math.abs(dl) + r, Math.abs(dn) + r);
    const half = Math.round((ext * B.SIZE + 5) * U);
    const R = rng("benua:" + id);
    const at = (x, z) => { const L = toLatLon(C, x, z), A = B.landAt(L.lat, L.lon); return { h: A.h, mine: A.cont === C }; };
    // kota utama + kota kecil di daratan benua ini, berjauhan
    const main = B.CITIES.find(c => c.cont === id), towns = [];
    const m0 = toMap(C, main.lat, main.lon);
    towns.push({ id: main.id, name: main.name, x: m0.x, z: m0.z, main: true, live: !!main.live, size: 3 });
    const cand = [];
    for (let z = -half; z <= half; z += 10) for (let x = -half; x <= half; x += 10) { const A = at(x, z); if (A.mine && A.h > 0.12) cand.push({ x: x + (R() - 0.5) * 6, z: z + (R() - 0.5) * 6, h: A.h }); }
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    const names = NAMES[id] || NAMES.meridia, gap = Math.max(26, half * 0.22);
    for (const c of cand) {
      if (towns.length > names.length || towns.length >= 10) break;
      if (towns.some(t => Math.hypot(t.x - c.x, t.z - c.z) < gap)) continue;
      if (!at(c.x, c.z).mine) continue;
      towns.push({ id: id + ":" + (towns.length), name: names[towns.length - 1], x: c.x, z: c.z, size: c.h > 0.4 ? 1 : 2 });
    }
    // gunung di tanah tinggi, hutan di tanah tengah
    const peaks = [], forests = [];
    for (let z = -half; z <= half; z += 5) for (let x = -half; x <= half; x += 5) {
      const px = x + (R() - 0.5) * 4, pz = z + (R() - 0.5) * 4, A = at(px, pz);
      if (!A.mine) continue;
      if (towns.some(t => Math.hypot(t.x - px, t.z - pz) < (t.main ? 16 : 10))) continue;
      if (A.h > 0.55 && R() < 0.4) peaks.push({ x: px, z: pz, h: 2.2 + (A.h - 0.55) * 9 + R() * 1.6 });
      else if (A.h > 0.14 && A.h < 0.5) { const L = toLatLon(C, px, pz), p = B.toXYZ(L.lat, L.lon, 9); if (B.fbm(p.x, p.y, p.z, 31) > 0.56) forests.push({ x: px, z: pz, s: 0.8 + R() * 0.7 }); }
    }
    peaks.sort((a, b) => b.h - a.h);
    // sungai: dari gunung tertinggi, turun ke tetangga paling rendah sampai laut
    const rivers = [];
    for (const src of peaks.filter((p, i) => i % 7 === 0).slice(0, 3)) {
      const pts = [{ x: src.x, z: src.z }]; let x = src.x, z = src.z, dx = 0, dz = 0;
      for (let s = 0; s < 160; s++) {
        let best = null;
        for (let k = 0; k < 12; k++) {
          const a = k / 12 * Math.PI * 2, nx = x + Math.cos(a) * 3, nz = z + Math.sin(a) * 3, h = at(nx, nz).h - (Math.cos(a) * dx + Math.sin(a) * dz) * 0.02;
          if (!best || h < best.h) best = { h, nx, nz, a };
        }
        dx = Math.cos(best.a); dz = Math.sin(best.a); x = best.nx; z = best.nz; pts.push({ x, z });
        if (at(x, z).h < 0) break;
      }
      if (at(x, z).h < 0.02 && pts.length > 4) rivers.push(pts);
    }
    // jalan: pohon rentang terpendek antar kota; yang nyebrang laut jadi jalur kapal
    const roads = [], inT = [0], outT = towns.map((_, i) => i).slice(1);
    while (outT.length) {
      let best = null;
      for (const a of inT) for (const b of outT) { const d = Math.hypot(towns[a].x - towns[b].x, towns[a].z - towns[b].z); if (!best || d < best.d) best = { a, b, d }; }
      inT.push(best.b); outT.splice(outT.indexOf(best.b), 1);
      const A = towns[best.a], Bt = towns[best.b], n = Math.max(4, Math.round(best.d / 6)), pts = [];
      const nx = -(Bt.z - A.z) / best.d, nz = (Bt.x - A.x) / best.d, bend = (R() - 0.5) * best.d * 0.25;
      let sea = 0;
      for (let k = 0; k <= n; k++) { const t = k / n, w = Math.sin(t * Math.PI) * bend, x = A.x + (Bt.x - A.x) * t + nx * w, z = A.z + (Bt.z - A.z) * t + nz * w; pts.push({ x, z }); if (at(x, z).h < 0.01) sea++; }
      roads.push({ a: A.id, b: Bt.id, pts, ferry: sea > 1 });
    }
    // v80: wilayah liar: titik daratan yang paling jauh dari kota dan dari wilayah liar lain (benih tetap, sama di semua HP)
    const wilds = [], WR = rng("liar:" + id);
    for (const w of WILD[id] || []) {
      let best = null;
      for (let z = -half; z <= half; z += 5) for (let x = -half; x <= half; x += 5) {
        const A = at(x, z); if (!A.mine || A.h < 0.1 || A.h > 0.7) continue;
        const dT = Math.min(...towns.map(t => Math.hypot(t.x - x, t.z - z))), dW = wilds.length ? Math.min(...wilds.map(o => Math.hypot(o.x - x, o.z - z))) : 1e9;
        if (dT < 12) continue;
        const sc = Math.min(dT, 40) + Math.min(dW, 60) * 0.8 + WR() * 6;
        if (!best || sc > best.sc) best = { x, z, sc };
      }
      if (best) wilds.push({ id: w.id, name: w.name, kind: w.kind, live: !!w.live, cont: id, x: best.x, z: best.z });
    }
    return (cache[id] = { C, half, towns, wilds, peaks: peaks.slice(0, 140), forests: forests.filter((f, i) => i % Math.ceil(forests.length / 260) === 0), rivers, roads, at });
  }

  const API = { U, NAMES, WILD, region, toMap, toLatLon };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Region = API;
})();

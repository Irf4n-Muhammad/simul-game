// Bumi (v73): dunia fiksi dengan 5 benua dari awal (games-arah §12). Lapisan paling luar dari tampilan luar:
// globe → benua → kota → jalan. Murni (tanpa three.js): bentuk daratan, benua, dan kota. globe.js yang gambar.
//
// Tiap benua punya rasa sendiri (iklim, arsitektur, festival, elemen soul, tema dungeon). Tiap benua mulai dengan satu
// kota utama; sekarang baru Old Town yang hidup, yang lain "segera". Nama dan rasa benua masih usulan, gampang diganti di sini.
"use strict";
(function () {
  // lat/lon dalam derajat. blobs = gumpalan daratan [dlat, dlon, radius°] relatif ke pusat; noise bikin pantainya nggak bulat.
  const CONTINENTS = [
    { id: "meridia", name: "Meridia", climate: "Temperate", look: "Brick towns, river valleys, rolling fields", festival: "Harvest Fair", element: "Leaf", dungeon: "Old cellars and mines",
      lat: 22, lon: -8, land: 0x8fb06a, high: 0x6f8f52, blobs: [[0, 0, 13], [8, -10, 9], [-9, 7, 9], [12, 9, 7], [-4, -14, 6]] },
    { id: "solenne", name: "Solenne", climate: "Hot and dry", look: "White domes, shaded courtyards, dune coasts", festival: "Lantern Night", element: "Ember", dungeon: "Sunken desert temples",
      lat: -14, lon: 42, land: 0xd8bf86, high: 0xc19e62, blobs: [[0, 0, 12], [-9, 8, 9], [7, 12, 8], [-15, -4, 7], [4, -10, 6]] },
    { id: "frostholm", name: "Frostholm", climate: "Cold north", look: "Timber halls, snow roofs, fjords", festival: "Aurora Week", element: "Frost", dungeon: "Ice caves under the glacier",
      lat: 50, lon: 95, land: 0xe9eef0, high: 0xc9d4d8, blobs: [[0, 0, 11], [-5, -13, 8], [4, 13, 9], [-10, 3, 7]] },
    { id: "thalassa", name: "Thalassa", climate: "Tropical islands", look: "Stilt houses, reefs, rope bridges", festival: "Tide Festival", element: "Tide", dungeon: "Flooded sea grottos",
      lat: -6, lon: 150, land: 0x5fae6e, high: 0x3f8c55, blobs: [[0, 0, 7], [-9, 12, 4.5], [7, -11, 5], [-15, -4, 4], [11, 9, 4], [-3, 21, 3.5]] },
    { id: "ventara", name: "Ventara", climate: "High mountains", look: "Stone terraces, cliff towns, wind bridges", festival: "Kite Day", element: "Gale", dungeon: "Wind-carved peaks",
      lat: 8, lon: -96, land: 0x9aa58a, high: 0x7b8270, blobs: [[0, 0, 10], [14, 4, 8], [-12, -3, 8], [-24, 4, 6], [24, -6, 6]] },
  ];
  const CONT = Object.fromEntries(CONTINENTS.map(c => [c.id, c]));
  // tiap benua satu kota utama dulu; live = bisa dimasuki
  const CITIES = [
    { id: "oldtown", name: "Old Town", cont: "meridia", lat: 24, lon: -6, live: true },
    { id: "sunreach", name: "Sunreach", cont: "solenne", lat: -12, lon: 44 },
    { id: "pinehollow", name: "Pinehollow", cont: "frostholm", lat: 50, lon: 97 },
    { id: "coralport", name: "Coralport", cont: "thalassa", lat: -5, lon: 151 },
    { id: "skyreach", name: "Skyreach", cont: "ventara", lat: 10, lon: -94 },
  ];
  const HOME_CITY = "oldtown";

  // ---------------------------------------------------------------- noise buat pantai
  // noise 3D di permukaan bola, jadi nggak ada sambungan di garis tanggal
  function hash(x, y, z, s) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683) + Math.imul(s, 1013904223) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, z, s) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), f = t => t * t * (3 - 2 * t), u = f(x - xi), v = f(y - yi), w = f(z - zi);
    const L = (a, b, k) => a + (b - a) * k, h = (i, j, k) => hash(xi + i, yi + j, zi + k, s);
    return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v), L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w);
  }
  const fbm = (x, y, z, s) => vnoise(x, y, z, s) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3, s + 13) * 0.15;
  const RAD = Math.PI / 180;
  const SIZE = 1.75;   // besar semua benua sekaligus
  // jarak sudut (derajat) antara dua titik di bola
  function angDist(lat1, lon1, lat2, lon2) {
    const a = Math.sin((lat2 - lat1) * RAD / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin((lon2 - lon1) * RAD / 2) ** 2;
    return 2 * Math.asin(Math.min(1, Math.sqrt(a))) / RAD;
  }
  // tinggi daratan di titik ini: > 0 darat (makin besar makin ke dalam), <= 0 laut. Juga benua mana.
  function landAt(lat, lon) {
    let best = -1, who = null;
    for (const [ci, C] of CONTINENTS.entries()) {
      if (angDist(lat, lon, C.lat, C.lon) > 70) continue;
      let f = -9;
      for (const [dl, dn, r] of C.blobs) { const d = angDist(lat, lon, C.lat + dl * SIZE, C.lon + dn * SIZE / Math.max(0.35, Math.cos((C.lat + dl * SIZE) * RAD))); f = Math.max(f, 1 - d / (r * SIZE)); }
      if (f <= -0.35) continue;
      const p = toXYZ(lat, lon, 6), n = fbm(p.x, p.y, p.z, ci + 1) - 0.5;
      const v = f + n * 0.5;
      if (v > best) { best = v; who = C; }
    }
    return { h: best, cont: best > 0 ? who : null, near: who };
  }
  const contAt = (lat, lon) => landAt(lat, lon).cont;
  // lat/lon → arah di bola (y ke atas, lon 0 menghadap +z), sama dengan cara globe.js nempel tekstur
  function toXYZ(lat, lon, r = 1) {
    const phi = lat * RAD, th = lon * RAD;
    return { x: r * Math.cos(phi) * Math.sin(th), y: r * Math.sin(phi), z: r * Math.cos(phi) * Math.cos(th) };
  }

  const API = { CONTINENTS, CONT, CITIES, HOME_CITY, landAt, contAt, toXYZ, angDist, fbm };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Bumi = API;
})();

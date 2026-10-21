// Registry brand: semua nama "merek" di dunia game lewat sini. Perusahaan tempat kerja (Burrow), pesaing bisnis keluarga,
// media kota di Chirp, tempat umum di kota, dan barang di Bazaar. Sekarang isinya nama fiksi. Nanti satu slot bisa disewa
// brand mitra, dan namanya ganti di semua layar sekaligus (kota, Burrow, Chirp, majalah) tanpa nyentuh simulasi.
// Aturan: brand cuma ngubah kulit (nama; nanti logo dan warna), nggak pernah angka. Nama nggak pernah masuk RNG,
// jadi ganti nama nggak ngubah hasil replay. Override sekarang lokal (buat Dev); nanti datang dari server.
"use strict";
(function () {
  const KEY = "mk-brands";
  const KINDS = { co: "Employers", rival: "Competitors", media: "Media", place: "Public places", item: "Products" };
  const REG = new Map();   // key -> { key, name, kind, cat }
  let OVR = {};            // key -> nama pengganti
  const store = () => (typeof localStorage !== "undefined" ? localStorage : null);
  try { const s = store(); OVR = s ? JSON.parse(s.getItem(KEY) || "{}") || {} : {}; } catch (e) { OVR = {}; }
  if (!OVR || typeof OVR !== "object") OVR = {};

  const reg = (key, name, kind, cat) => {
    const e = REG.get(key);
    if (e) { e.name = name; if (kind) e.kind = kind; if (cat != null) e.cat = cat; }
    else REG.set(key, { key, name, kind: kind || "co", cat: cat || "" });
    return key;
  };
  const base = key => { const e = REG.get(key); return e ? e.name : ""; };
  const partner = key => typeof OVR[key] === "string" && OVR[key].length > 0;
  const name = key => partner(key) ? OVR[key] : base(key);
  const list = kind => [...REG.values()].filter(e => !kind || e.kind === kind)
    .map(e => ({ key: e.key, kind: e.kind, cat: e.cat, base: e.name, name: name(e.key), partner: partner(e.key) }));
  const persist = () => { try { const s = store(); if (s) { if (Object.keys(OVR).length) s.setItem(KEY, JSON.stringify(OVR)); else s.removeItem(KEY); } } catch (e) { /* nggak bisa simpan: tetap di memori */ } };
  const set = (key, nm) => { const v = String(nm == null ? "" : nm).trim().slice(0, 40); if (v) OVR[key] = v; else delete OVR[key]; persist(); };
  const apply = o => { OVR = o && typeof o === "object" ? { ...o } : {}; persist(); };
  const clear = () => apply(null);
  // bikin properti nama sebuah objek dibaca dari registry (co.name, item.label, dst.), jadi override langsung kepakai di mana-mana
  const bind = (obj, key, prop) => { Object.defineProperty(obj, prop || "name", { get: () => name(key), enumerable: true, configurable: true }); return obj; };
  const stats = () => { const o = {}; for (const e of REG.values()) { o[e.kind] = o[e.kind] || { n: 0, partner: 0 }; o[e.kind].n++; if (partner(e.key)) o[e.kind].partner++; } return o; };

  const API = { KEY, KINDS, reg, name, base, partner, list, set, apply, clear, bind, stats, overrides: () => ({ ...OVR }) };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Brands = API;
})();

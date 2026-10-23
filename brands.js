// Registry brand: semua nama "merek" di dunia game lewat sini. Perusahaan tempat kerja (Burrow), pesaing bisnis keluarga,
// media kota di Chirp, tempat umum di kota, dan barang di Bazaar. Sekarang isinya nama fiksi. Nanti satu slot bisa disewa
// brand mitra, dan namanya ganti di semua layar sekaligus (kota, Burrow, Chirp, majalah) tanpa nyentuh simulasi.
// Aturan: brand cuma ngubah kulit (nama; nanti logo dan warna), nggak pernah angka. Nama nggak pernah masuk RNG,
// jadi ganti nama nggak ngubah hasil replay. Override sekarang lokal (buat Dev); nanti datang dari server.
"use strict";
(function () {
  const KEY = "mk-brands";
  const KINDS = { co: "Employers", rival: "Competitors", media: "Media", place: "Public places", item: "Products", food: "Food & snacks" };
  // Paket partner contoh buat pilot playtest (brand fiktif, ditandai Partner di layar). Nanti paket kayak gini datang dari server
  // per kota dengan tanggal mulai-selesai. Dimatiin lewat lembar Dev (mk-brands-pilot = "0"). Override lokal menang atas paket pilot.
  const PILOT_KEY = "mk-brands-pilot";
  const PILOT = { "food:treat": { name: "Moonbit biscuits", ic: "🍪", col: "#5B3A9E", soft: "#EFE8FA", about: "Chocolate biscuits with a little moon on top.", tier: 2 } };
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
  // override: string (nama aja, cara lama) atau objek { name, ic, col, soft, about, tier, from, to }
  const norm = v => {
    if (typeof v === "string") v = { name: v };
    if (!v || typeof v !== "object") return null;
    const nm = String(v.name == null ? "" : v.name).trim().slice(0, 40); if (!nm) return null;
    const o = { name: nm };
    for (const k of ["ic", "col", "soft", "from", "to"]) if (typeof v[k] === "string" && v[k]) o[k] = v[k].slice(0, 24);
    if (typeof v.about === "string" && v.about.trim()) o.about = v.about.trim().slice(0, 120);
    o.tier = Math.max(0, Math.min(3, v.tier | 0)) || 1;
    return o;
  };
  const live = o => { const t = Date.now(); return !!o && !(o.from && Date.parse(o.from) > t) && !(o.to && Date.parse(o.to) < t); };
  const pilotOn = () => { try { const s = store(); return !s || s.getItem(PILOT_KEY) !== "0"; } catch (e) { return true; } };
  const pilot = on => { try { const s = store(); if (s) { if (on) s.removeItem(PILOT_KEY); else s.setItem(PILOT_KEY, "0"); } } catch (e) { /* nggak bisa simpan */ } };
  const ovr = key => { if (key in OVR) { const o = norm(OVR[key]); return live(o) ? o : null; } return pilotOn() && live(PILOT[key]) ? PILOT[key] : null; };
  const partner = key => !!ovr(key);
  const meta = key => ovr(key);
  const name = key => { const o = ovr(key); return o ? o.name : base(key); };
  const list = kind => [...REG.values()].filter(e => !kind || e.kind === kind)
    .map(e => ({ key: e.key, kind: e.kind, cat: e.cat, base: e.name, name: name(e.key), partner: partner(e.key), meta: ovr(e.key) }));
  const persist = () => { try { const s = store(); if (s) { if (Object.keys(OVR).length) s.setItem(KEY, JSON.stringify(OVR)); else s.removeItem(KEY); } } catch (e) { /* nggak bisa simpan: tetap di memori */ } };
  const set = (key, v) => { const o = norm(v); if (o) OVR[key] = typeof v === "string" ? o.name : o; else delete OVR[key]; persist(); };
  const apply = o => { OVR = {}; if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { const n = norm(v); if (n) OVR[k] = typeof v === "string" ? n.name : n; } persist(); };
  const clear = () => apply(null);
  // bikin properti nama sebuah objek dibaca dari registry (co.name, item.label, dst.), jadi override langsung kepakai di mana-mana
  const bind = (obj, key, prop) => { Object.defineProperty(obj, prop || "name", { get: () => name(key), enumerable: true, configurable: true }); return obj; };
  const stats = () => { const o = {}; for (const e of REG.values()) { o[e.kind] = o[e.kind] || { n: 0, partner: 0 }; o[e.kind].n++; if (partner(e.key)) o[e.kind].partner++; } return o; };

  const API = { KEY, KINDS, PILOT, reg, name, base, partner, meta, list, set, apply, clear, bind, stats, pilotOn, pilot, overrides: () => ({ ...OVR }) };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Brands = API;
})();

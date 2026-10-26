// Pasar ala dunia nyata ("Bazaar"): barang punya kondisi yang turun pelan, bisa diservis atau disimpan di kotak,
// sebagian bisa dijual ke dealer barang bekas, ada edisi terbatas yang stoknya habis untuk semua pemain di kota,
// dan barang lama jadi vintage atau antik hanya kalau langka dan kondisinya terjaga. Tidak ada bonus khusus warisan:
// barang yang diwariskan tetap barang biasa, nilainya ikut aturan pasar. Semua fungsi murni dari hari + seed.
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const ST = (typeof module !== "undefined") ? require("./status.js") : globalThis.Status;
  const B = (typeof module !== "undefined") ? require("./brands.js") : globalThis.Brands;
  const { HOOKS, seed_rng, Ctx, YEAR } = E;
  const CITY = "old-town";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // umur makhluk 3 sampai 4 tahun, jadi skala waktunya dipadatkan: vintage mulai 1 tahun, antik 4 tahun
  const VINTAGE = YEAR, ANTIQUE = 4 * YEAR;
  const MIN_AGE = 180;

  // made: berapa unit model itu dibuat untuk kota tiap tahun. wear: kondisi turun per hari dipakai.
  // hold/half: nilai jual awal dan seberapa cepat turun. life: berapa lama unitnya bertahan di kota (lalu rusak, hilang, dibuang).
  const CATS = {
    Fashion: { life: 700, icon: "👕" }, Shoes: { life: 600, icon: "👟" }, Phone: { life: 500, icon: "📱" }, Bag: { life: 1500, icon: "👜" },
    Watch: { life: 3200, icon: "⌚" }, Car: { life: 1100, icon: "🚗" }, Collectible: { life: 1600, icon: "🎨" }, Classes: { icon: "🎓" },
  };
  const LINES = [
    { id: "tee", cat: "Fashion", label: "Basic tee", price: 100, pts: 1, made: 3000, trade: false, wear: 0.25 },
    { id: "jacket", cat: "Fashion", label: "Designer jacket", price: 2000, pts: 6, made: 500, trade: true, wear: 0.12, hold: 0.45, half: 300 },
    { id: "couture", cat: "Fashion", label: "Couture outfit", price: 15000, pts: 15, made: 80, trade: true, wear: 0.1, hold: 0.5, half: 500 },
    { id: "sneakers", cat: "Shoes", label: "Sneakers", price: 400, pts: 3, made: 1500, trade: true, wear: 0.2, hold: 0.4, half: 200 },
    { id: "boots", cat: "Shoes", label: "Leather boots", price: 1800, pts: 5, made: 300, trade: true, wear: 0.08, hold: 0.5, half: 500 },
    { id: "phone", cat: "Phone", label: "Basic phone", price: 200, pts: 1, made: 3000, trade: false, wear: 0.2 },
    { id: "flagship", cat: "Phone", label: "Flagship phone", price: 3000, pts: 6, made: 900, trade: false, wear: 0.15 },
    { id: "canvas", cat: "Bag", label: "Canvas bag", price: 150, pts: 1, made: 2000, trade: false, wear: 0.15 },
    { id: "luxbag", cat: "Bag", label: "Luxury bag", price: 8000, pts: 10, made: 200, trade: true, wear: 0.06, hold: 0.8, half: 1500 },
    { id: "steelwatch", cat: "Watch", label: "Steel watch", price: 5000, pts: 7, made: 300, trade: true, wear: 0.03, hold: 0.75, half: 1500 },
    { id: "goldwatch", cat: "Watch", label: "Gold watch", price: 30000, pts: 20, made: 60, trade: true, wear: 0.03, hold: 0.85, half: 2500 },
    { id: "scooter", cat: "Car", label: "Scooter", price: 1500, pts: 4, made: 800, trade: true, wear: 0.1, hold: 0.5, half: 400 },
    { id: "sedan", cat: "Car", label: "Sedan", price: 12000, pts: 12, made: 600, trade: true, wear: 0.09, hold: 0.6, half: 500 },
    { id: "sports", cat: "Car", label: "Sports car", price: 80000, pts: 30, made: 80, trade: true, wear: 0.08, hold: 0.65, half: 700 },
    { id: "supercar", cat: "Car", label: "Supercar", price: 300000, pts: 60, made: 15, trade: true, wear: 0.07, hold: 0.75, half: 900 },
    { id: "vinyl", cat: "Collectible", label: "Vinyl record", price: 60, pts: 1, made: 2000, trade: true, wear: 0.02, hold: 0.5, half: 600 },
    { id: "comic", cat: "Collectible", label: "Comic book", price: 30, pts: 1, made: 3000, trade: true, wear: 0.03, hold: 0.4, half: 400 },
    { id: "figurine", cat: "Collectible", label: "Figurine", price: 120, pts: 1, made: 1000, trade: true, wear: 0.02, hold: 0.5, half: 600 },
    { id: "print", cat: "Collectible", label: "Art print", price: 800, pts: 3, made: 150, trade: true, wear: 0.015, hold: 0.6, half: 900 },
    { id: "gym", cat: "Classes", label: "Gym membership", price: 300, pass: 30, skill: "fitness", trade: false, desc: "Fitness grows 25% faster for 30 days." },
    { id: "coding", cat: "Classes", label: "Coding course", price: 400, pass: 30, skill: "logic", trade: false, desc: "Logic grows 25% faster for 30 days." },
    { id: "artclass", cat: "Classes", label: "Art class", price: 300, pass: 30, skill: "creativity", trade: false, desc: "Creativity grows 25% faster for 30 days." },
    { id: "drama", cat: "Classes", label: "Drama club", price: 300, pass: 30, skill: "charm", trade: false, desc: "Charm grows 25% faster for 30 days." },
  ];
  // nama barang lewat registry brand (slot "item:<id>"): brand mitra ganti label, harga dan angka lain tetap
  for (const L of LINES) B.bind(L, B.reg("item:" + L.id, L.label, "item", L.cat), "label");
  const LINE = Object.fromEntries(LINES.map(l => [l.id, l]));
  const PASS_BOOST = 1.25;
  const yearOf = day => new Date(E.START_DATE + day * 86400000).getUTCFullYear();

  // ---------------------------------------------------------------- edisi terbatas
  const DROP_EVERY = 12;
  const PREFIX = ["Moonlit", "Ember", "Aurora", "Old Town", "Founders", "Velvet", "Harvest", "Comet", "Midnight", "Saffron", "Glacier", "Lantern", "Thistle", "Copper"];
  const DROP_POOL = ["jacket", "couture", "sneakers", "sneakers", "boots", "luxbag", "steelwatch", "goldwatch", "sports", "supercar", "vinyl", "figurine", "print", "print", "comic"];
  const _drop = new Map();
  function drop(k) {
    if (_drop.has(k)) return _drop.get(k);
    const r = seed_rng(CITY, "drop", k), base = LINE[r.choice(DROP_POOL)];
    const made = base.id === "supercar" ? r.randint(3, 6) : base.id === "sports" || base.id === "goldwatch" ? r.randint(8, 25) : r.randint(15, 120);
    const D = { key: "d" + k, line: base.id, cat: base.cat, label: `${r.choice(PREFIX)} ${base.label}`, made,
      price: Math.round(base.price * (1.3 + r.random() * 0.7) / 10) * 10, start: k * DROP_EVERY + r.randint(0, 4), tau: 1 + r.random() * 5 };
    _drop.set(k, D);
    return D;
  }
  // pembeli NPC di kota menghabiskan stok; hasilnya sama untuk semua pemain
  const dropLeft = (D, day) => day < D.start ? D.made : Math.max(0, D.made - Math.floor(D.made * (1 - Math.exp(-(day - D.start + 0.5) / D.tau)) + 0.5));
  function drops(day) {
    const k = Math.floor(day / DROP_EVERY), out = [];
    for (let i = k - 3; i <= k + 1; i++) { const D = drop(i); if (D.start <= day + DROP_EVERY && day - D.start < 30) out.push({ ...D, left: dropLeft(D, day), soon: D.start > day }); }
    return out.sort((a, b) => (b.left > 0 && !b.soon) - (a.left > 0 && !a.soon) || b.soon - a.soon || b.start - a.start);
  }
  const findDrop = key => drop(Number(key.slice(1)));

  // ---------------------------------------------------------------- nilai pasar
  const survivors = (it, day) => it.made * Math.exp(-Math.max(0, day - it.rel) / CATS[LINE[it.id].cat].life);
  const rarity = (it, day) => clamp(1 - Math.log10(Math.max(1, survivors(it, day))) / 3.3, 0, 1);
  const condF = c => 0.3 + 0.7 * Math.pow(c / 100, 1.5);
  function valuation(it, day) {
    const L = LINE[it.id];
    if (!L.trade) return { value: 0, kind: "none" };
    const age = Math.max(0, day - it.rel);
    const used = it.price * Math.max(0.06, L.hold * Math.exp(-age / L.half)) * condF(it.cond);
    const ramp = clamp((age - VINTAGE) / (ANTIQUE - VINTAGE), 0, 1);
    // kolektor menilai kondisi asli: barang yang sudah diservis dianggap restorasi
    const orig = Math.min(it.cond, it.orig ?? 100);
    const collector = it.price * Math.pow(rarity(it, day), 3) * 4 * ramp * Math.pow(orig / 100, 2);
    const kind = age >= ANTIQUE && collector > used ? "antique" : age >= VINTAGE && collector > used ? "vintage" : "used";
    return { value: Math.round(Math.max(used, collector)), kind };
  }
  const condLabel = c => c >= 90 ? "Mint" : c >= 65 ? "Good" : c >= 40 ? "Worn" : "Shabby";
  const condMult = c => c >= 65 ? 1 : c >= 40 ? 0.75 : 0.5;
  // servis nggak boleh jadi mesin uang: biayanya minimal sebesar kenaikan harga jual bekasnya
  const serviceCost = (it, day) => {
    const L = LINE[it.id], age = Math.max(0, day - it.rel), base = it.price * Math.max(0.06, L.hold * Math.exp(-age / L.half));
    const gain = L.trade ? base * (condF(95) - condF(it.cond)) * 0.85 : 0;
    return Math.max(5, Math.ceil(it.price * 0.1 * (100 - it.cond) / 100), Math.ceil(gain));
  };
  const sellPrice = (it, day) => Math.round(valuation(it, day).value * 0.8);

  // ---------------------------------------------------------------- dealer barang bekas (ganti tiap 3 hari)
  const USED_EVERY = 3;
  const _used = new Map();
  function usedLot(p) {
    if (_used.has(p)) return _used.get(p);
    const trad = LINES.filter(l => l.trade), out = [];
    for (let i = 0; i < 12; i++) {
      const r = seed_rng(CITY, "bekas", p, i), L = r.choices(trad, trad.map(l => l.cat === "Car" ? 1.4 : l.cat === "Collectible" ? 1.6 : 1))[0];
      const q = r.random(), day = p * USED_EVERY;
      const age = q < 0.68 ? r.randint(20, 700) : q < 0.92 ? r.randint(365, 1400) : r.randint(ANTIQUE, 4200);
      const lim = r.random() < 0.22;
      const made = lim ? (L.id === "supercar" ? r.randint(3, 6) : r.randint(10, 120)) : L.made;
      const base = lim ? Math.round(L.price * (1.3 + r.random() * 0.7) / 10) * 10 : L.price;
      const cond = Math.round(clamp(100 - Math.abs(r.gauss(0, 18)) - age * L.wear * 0.35 * r.random(), 18, 100));
      const it = { id: L.id, label: lim ? `${r.choice(PREFIX)} ${L.label}` : L.label, ed: lim ? "x" + p + "-" + i : null, made, rel: day - age, price: base, cond };
      out.push({ lid: `u${p}-${i}`, it, seller: r.choice(E.NAMES) + " " + r.choice(["Ash", "Bloom", "Fern", "Lark", "Reed", "Wren", "Oak", "Sorrel"]) });
    }
    _used.set(p, out);
    if (_used.size > 50) _used.delete(_used.keys().next().value);
    return out;
  }
  function usedListings(day, c) {
    const p = Math.floor(day / USED_EVERY), gone = c && c.st && c.st.mk ? c.st.mk.boughtUsed : [];
    return usedLot(p).filter(l => !gone.includes(l.lid)).map(l => {
      const v = valuation(l.it, day);
      return { ...l, kind: v.kind, value: v.value, ask: Math.max(10, Math.round(v.value * 1.2)), left: Math.max(1, Math.round(survivors(l.it, day))), until: (p + 1) * USED_EVERY };
    });
  }

  // ---------------------------------------------------------------- barang milik makhluk
  function mk(c) {
    const st = c.st;
    if (!st.mk) {
      st.mk = { goods: [], pass: {}, seq: 0, boughtUsed: [], drops: [] };
      // simpanan lama: daftar id barang jadi barang dengan kondisi baru
      for (const id of st.items || []) if (LINE[id]) st.mk.goods.push(newGood(st.mk, LINE[id], { rel: 0, got: 0, made: LINE[id].made, price: LINE[id].price, label: LINE[id].label }));
    }
    return st.mk;
  }
  function newGood(M, L, o) {
    return { u: "g" + (++M.seq), id: L.id, label: o.label || L.label, ed: o.ed || null, made: o.made, rel: o.rel, price: o.price, cond: o.cond ?? 100, got: o.got, boxed: false };
  }
  const sync = c => { c.st.items = [...new Set(mk(c).goods.map(g => g.id))]; c.stats.uang = Math.min(5000, c.st.wallet / 50); };

  // poin gengsi dari barang: barang yang dipakai menunjukkan gaya, koleksi dihitung walau disimpan
  function itemPts(c, day) {
    const M = mk(c), best = {};
    let coll = 0;
    for (const g of M.goods) {
      const L = LINE[g.id];
      if (!L || !L.pts) continue;
      const v = valuation(g, day ?? g.got), mult = v.kind === "antique" ? 2 : v.kind === "vintage" ? 1.5 : 1;
      if (L.cat === "Collectible") { coll += L.pts * mult * condMult(g.cond); continue; }
      if (g.boxed) continue;
      best[L.cat] = Math.max(best[L.cat] || 0, L.pts * mult * condMult(g.cond) * (g.ed ? 1.25 : 1));
    }
    return Math.round(Object.values(best).reduce((a, b) => a + b, 0) + Math.min(40, coll));
  }

  // ---------------------------------------------------------------- harian
  const _status = HOOKS.status;
  HOOKS.status = (x, dramas, events) => {
    const c = x.c, day = x.day;
    if (c.st) {
      const M = mk(c);
      c.st.boost = {};
      for (const [k, until] of Object.entries(M.pass)) { if (until > day) c.st.boost[k] = PASS_BOOST; else delete M.pass[k]; }
    }
    _status(x, dramas, events);
    if (!c.st) return;
    const M = mk(c);
    for (const g of M.goods) {
      const L = LINE[g.id];
      if (L && L.wear) g.cond = Math.max(10, Math.round((g.cond - L.wear * (g.boxed ? 0.2 : 1)) * 100) / 100);
    }
    if (day % 7 === 0) for (const g of M.goods) {
      const v = valuation(g, day);
      if (v.kind === "antique") ST.achieve(x, "antique", `Owns a real antique: a ${g.label} from ${yearOf(g.rel)}.`);
    }
    sync(c);
  };
  const _gain = ST.EXT.gain;
  ST.EXT.gain = (st, k) => (_gain ? _gain(st, k) : 1) * (st.boost && st.boost[k] ? st.boost[k] : 1);
  ST.EXT.itemPts = itemPts;

  // Warisan: barang pindah ke ahli waris apa adanya (kondisi dan umurnya ikut), kelas dan member hangus
  const _farewell = HOOKS.akhir_hidup;
  HOOKS.akhir_hidup = (c, day, home) => {
    const log = _farewell(c, day, home);
    if (!c.st || !c.st.mk) return log;
    const M = c.st.mk, keep = M.goods.filter(g => LINE[g.id] && LINE[g.id].cat !== "Classes");
    const at = m => m.alive(day + 1) && !("keluar" in m.info) && m.st;
    let heirs = home.children_of(c).filter(at);
    if (!heirs.length) heirs = home.members.filter(m => m !== c && at(m));
    if (heirs.length && keep.length) {
      keep.sort((a, b) => valuation(b, day).value - valuation(a, day).value);
      keep.forEach((g, i) => { const h = heirs[i % heirs.length], H = mk(h); H.goods.push({ ...g, u: "g" + (++H.seq), got: day, from: c.name }); sync(h); });
      const top = keep.slice(0, 3).map(g => g.label.toLowerCase());
      log.lines.push(`${c.name} left ${keep.length} belonging${keep.length > 1 ? "s" : ""} to ${heirs.slice(0, keep.length).map(h => h.name).join(", ")}${top.length ? `, including a ${top.join(", a ")}` : ""}.`);
    }
    M.goods = []; c.st.items = [];
    return log;
  };

  // ---------------------------------------------------------------- tindakan pemain
  function ctx(home, c, day, tag) { const x = new Ctx(c, day, seed_rng(c.id, day, tag), home, true); x.drama = "sedang"; return x; }
  function pay(c, n) { if (c.st.wallet < n) return false; c.st.wallet -= n; return true; }
  function buyNew(home, c, day, L) {
    const M = mk(c);
    if (L.cat === "Classes") {
      if ((M.pass[L.skill] || 0) > day + 7 || !pay(c, L.price)) return false;
      M.pass[L.skill] = Math.max(M.pass[L.skill] || day, day) + L.pass;
      ctx(home, c, day, "kelas").remember(`Signed up for ${L.label.toLowerCase()}.`);
      return true;
    }
    if (!canBuyNew(c, L, day) || !pay(c, L.price)) return false;
    // barang yang nggak bisa dijual dan sudah usang diganti; yang lama disumbangkan
    if (!L.trade) M.goods = M.goods.filter(g => g.id !== L.id);
    M.goods.push(newGood(M, L, { rel: day, got: day, made: L.made, price: L.price }));
    const x = ctx(home, c, day, "beli");
    if (L.cat === "Car" && L.price >= 80000) ST.achieve(x, "car_" + L.id, `Bought a ${L.label}.`);
    if (L.id === "couture" || L.id === "luxbag") ST.achieve(x, "lux_" + L.id, `Bought a ${L.label}.`);
    return true;
  }
  // satu barang sejenis cukup: beli lagi kalau yang lama sudah usang, koleksi boleh satu per tahun model
  function canBuyNew(c, L, day) {
    const M = mk(c);
    if (L.cat === "Classes") return (M.pass[L.skill] || 0) <= day + 7;
    if (L.cat === "Collectible") return !M.goods.some(g => g.id === L.id && !g.ed && yearOf(g.rel) === yearOf(day));
    return !M.goods.some(g => g.id === L.id && !g.ed && g.cond >= 40);
  }
  const _act = HOOKS.act;
  HOOKS.act = (home, cid, kind, day) => {
    const old = kind.startsWith("beli:") && LINE[kind.slice(5).split("@")[0]];
    if (!old && !kind.startsWith("pasar:")) return _act(home, cid, kind, day);
    const c = home.get(cid);
    if (!c || !c.st || !c.alive(day) || c.age(day) < MIN_AGE) return false;
    const M = mk(c);
    let ok = false;
    if (old) ok = buyNew(home, c, day, old);
    else {
      const [, verb, arg] = kind.split(":");
      if (verb === "beli" && LINE[arg]) ok = buyNew(home, c, day, LINE[arg]);
      else if (verb === "drop") {
        const D = findDrop(arg);
        if (D && D.start <= day && dropLeft(D, day) > 0 && !M.drops.includes(D.key) && pay(c, D.price)) {
          M.drops.push(D.key);
          M.goods.push(newGood(M, LINE[D.line], { rel: D.start, got: day, made: D.made, price: D.price, label: D.label, ed: D.key }));
          ST.achieve(ctx(home, c, day, "drop"), "limited", `Got the ${D.label}, one of only ${D.made} made.`);
          ok = true;
        }
      } else if (verb === "bekas") {
        const l = usedListings(day, c).find(u => u.lid === arg);
        if (l && pay(c, l.ask)) {
          M.boughtUsed.push(l.lid); if (M.boughtUsed.length > 60) M.boughtUsed.splice(0, 20);
          M.goods.push(newGood(M, LINE[l.it.id], { ...l.it, got: day, paid: l.ask }));
          M.goods[M.goods.length - 1].paid = l.ask;
          ctx(home, c, day, "bekas").remember(`Bought a ${l.kind === "antique" ? "antique " : l.kind === "vintage" ? "vintage " : "used "}${l.it.label} from ${yearOf(l.it.rel)}.`);
          ok = true;
        }
      } else {
        const g = M.goods.find(g => g.u === arg);
        if (!g) return false;
        if (verb === "jual" && LINE[g.id].trade) {
          const n = sellPrice(g, day);
          M.goods = M.goods.filter(o => o !== g);
          c.st.wallet += n;
          const x = ctx(home, c, day, "jual");
          x.remember(`Sold the ${g.label} for ${n.toLocaleString("en")} coins.`);
          if (n >= 2 * (g.paid || g.price) && n >= 500) ST.achieve(x, "flip", `Sold a ${g.label} for more than twice what it cost.`);
          ok = true;
        } else if (verb === "servis" && g.cond < 95 && pay(c, serviceCost(g, day))) { g.orig = Math.min(g.orig ?? 100, g.cond); g.cond = 95; ok = true; }
        else if (verb === "buang" && !LINE[g.id].trade) { M.goods = M.goods.filter(o => o !== g); ok = true; }
        else if (verb === "simpan" && LINE[g.id].cat !== "Classes") { g.boxed = !g.boxed; ok = true; }
      }
    }
    if (ok) sync(c);
    return ok;
  };

  // ---------------------------------------------------------------- tampilan
  function goodView(g, day) {
    const L = LINE[g.id], v = valuation(g, day);
    return { ...g, cat: L.cat, trade: L.trade, kind: v.kind, value: v.value, sell: L.trade ? sellPrice(g, day) : 0, condLabel: condLabel(g.cond),
      restored: g.orig != null, year: yearOf(g.rel), left: Math.max(1, Math.round(survivors(g, day))), service: g.cond < 95 ? serviceCost(g, day) : 0, pts: L.pts || 0 };
  }
  function owned(c, day) {
    if (!c || !c.st) return { goods: [], pass: {} };
    const M = mk(c);
    return { goods: M.goods.map(g => goodView(g, day)).sort((a, b) => b.value - a.value || b.price - a.price), pass: { ...M.pass }, drops: M.drops.slice(), pts: itemPts(c, day) };
  }
  function catalog(day) {
    return LINES.map(L => ({ ...L, year: yearOf(day), icon: CATS[L.cat].icon }));
  }
  // Prediksi nilai untuk barang baru: berapa nilainya kalau dirawat sampai jadi antik
  function outlook(it, day, years) {
    const fut = { ...it, rel: it.rel ?? day, cond: 90, orig: it.cond < 90 ? Math.min(it.orig ?? 100, it.cond) : it.orig };
    return valuation(fut, (it.rel ?? day) + years * YEAR).value;
  }

  const API = { LINES, LINE, CATS, VINTAGE, ANTIQUE, MIN_AGE, drops, dropLeft, findDrop, canBuyNew: (c, id, day) => !!(c && c.st) && canBuyNew(c, LINE[id], day), usedListings, valuation, owned, catalog, condLabel, yearOf, itemPts, outlook, survivors };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Market = API;
})();

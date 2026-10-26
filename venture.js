// Bisnis keluarga: jenis bisnisnya bikinan dev (template), tapi yang buka, ngejalanin, dan nentuin nasibnya makhluknya sendiri.
// Hasil tiap hari datang dari bakat, keahlian, sifat, kondisi, modal, karyawan, dan ekonomi kota. Pemain cuma kasih modal dan saran.
// Ekonomi kota (siklus, resesi, bursa saham perusahaan NPC) murni dari hari + seed, jadi sama untuk semua pemain dan bisa diputar ulang.
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const ST = (typeof module !== "undefined") ? require("./status.js") : globalThis.Status;
  const CR = (typeof module !== "undefined") ? require("./career.js") : globalThis.Career;
  const BR = (typeof module !== "undefined") ? require("./brands.js") : globalThis.Brands;
  const { HOOKS, seed_rng, phase_of, clamp, Ctx } = E;
  const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const r2 = v => Math.round(v * 100) / 100;

  // ---------------------------------------------------------------- jenis bisnis
  // b2b: pelanggannya bisnis lain. serves: siapa pelanggannya (template lain atau industri perusahaan NPC di career.js).
  // inputs: pemasok di hulu. Kalau keluarga sendiri punya pemasoknya, bahannya lebih bagus dan lebih murah.
  const CATS = {
    raw: { label: "Raw materials", icon: "🌾" }, make: { label: "Processing", icon: "🏭" }, dist: { label: "Distribution", icon: "🚚" },
    svc: { label: "Business services", icon: "💼" }, shop: { label: "Shops & food", icon: "🛍️" }, care: { label: "Personal services", icon: "💇" },
    media: { label: "Creative & media", icon: "🎬" }, tech: { label: "Tech startups", icon: "🚀" }, fin: { label: "Finance", icon: "📈" },
  };
  const T = (id, cat, label, o) => ({ id, cat, label, b2b: false, serves: [], inputs: [], risk: 0.3, mat: 0.35, ...o });
  const TPLS = [
    T("farm", "raw", "Wheat farm", { b2b: true, w: { fitness: 0.6, logic: 0.2, creativity: 0.2 }, cap: 2500, base: 5, price: 35, unit: "orders", serves: ["mill"], npc: 3, mat: 0.2, prod: ["Heritage Wheat", "Golden Grain"] }),
    T("dairy", "raw", "Dairy farm", { b2b: true, w: { fitness: 0.5, charm: 0.2, logic: 0.3 }, cap: 3000, base: 5, price: 38, unit: "orders", serves: ["bakery", "cafe"], npc: 3, mat: 0.22, prod: ["Meadow Milk", "Cloud Butter"] }),
    T("coffee", "raw", "Coffee farm", { b2b: true, w: { fitness: 0.4, creativity: 0.3, logic: 0.3 }, cap: 3000, base: 4, price: 48, unit: "orders", serves: ["cafe"], npc: 2, mat: 0.2, prod: ["Hilltop Roast", "Morning Bean"] }),
    T("mill", "make", "Flour mill", { b2b: true, w: { logic: 0.5, fitness: 0.5 }, cap: 3500, base: 5, price: 45, unit: "orders", serves: ["bakery", "cafe"], inputs: ["farm"], npc: 2, prod: ["Stone-ground Flour", "Silk Flour"] }),
    T("weaver", "make", "Textile workshop", { b2b: true, w: { creativity: 0.6, fitness: 0.2, logic: 0.2 }, cap: 3500, base: 4, price: 55, unit: "orders", serves: ["boutique", "furniture", "@designer", "@influencer"], npc: 2, prod: ["Moss Linen", "Burrow Wool"] }),
    T("printer", "make", "Print shop", { b2b: true, w: { logic: 0.4, creativity: 0.6 }, cap: 3000, base: 4, price: 42, unit: "jobs", serves: ["bookshop", "@office", "@teacher", "agency"], npc: 2, prod: ["Letterpress Cards", "Pocket Zines"] }),
    T("furniture", "make", "Furniture workshop", { b2b: true, w: { fitness: 0.4, creativity: 0.6 }, cap: 4000, base: 3, price: 80, unit: "orders", serves: ["cafe", "@office", "boutique"], npc: 2, prod: ["Acorn Chair", "Burrow Bench"] }),
    T("wholesale", "dist", "Wholesaler", { b2b: true, w: { logic: 0.6, charm: 0.4 }, cap: 4500, base: 6, price: 42, unit: "orders", serves: ["bakery", "cafe", "boutique", "bookshop", "@fastfood"], npc: 2, mat: 0.55, risk: 0.2, prod: ["Next-day Crates"] }),
    T("courier", "dist", "Courier service", { b2b: true, w: { fitness: 0.7, logic: 0.3 }, cap: 2000, base: 7, price: 22, unit: "deliveries", serves: ["bakery", "boutique", "bookshop", "wholesale", "@office", "@fastfood"], npc: 3, mat: 0.15, prod: ["Same-day Hop"] }),
    T("agency", "svc", "Ad agency", { b2b: true, w: { creativity: 0.6, charm: 0.4 }, cap: 3500, base: 3, price: 110, unit: "clients", serves: ["bakery", "cafe", "boutique", "salon", "gym", "startup", "@fastfood", "@influencer"], npc: 2, mat: 0.15, risk: 0.4, prod: ["the Viral Acorn campaign", "Hoot & Holler jingles"] }),
    T("accounting", "svc", "Accounting firm", { b2b: true, w: { logic: 0.8, charm: 0.2 }, cap: 2500, base: 4, price: 75, unit: "clients", serves: ["*", "@office", "@doctor"], npc: 3, mat: 0.08, risk: 0.15, prod: ["the Tidy Books plan"] }),
    T("softhouse", "svc", "Software house", { b2b: true, w: { logic: 0.7, creativity: 0.3 }, cap: 4000, base: 3, price: 130, unit: "clients", serves: ["startup", "quant", "broker", "@office", "@software", "@quant"], npc: 2, mat: 0.1, risk: 0.35, prod: ["BurrowPay", "Pocket POS"] }),
    T("recruit", "svc", "Recruitment agency", { b2b: true, w: { charm: 0.8, logic: 0.2 }, cap: 2000, base: 3, price: 90, unit: "placements", serves: ["@office", "@software", "@nurse", "@teacher", "@fastfood"], npc: 2, mat: 0.08, risk: 0.35, hiring: true, prod: ["Perfect Match"] }),
    T("cleaning", "svc", "Cleaning service", { b2b: true, w: { fitness: 0.7, charm: 0.3 }, cap: 1500, base: 5, price: 35, unit: "contracts", serves: ["*", "@office", "@doctor", "@nurse"], npc: 3, mat: 0.15, risk: 0.15, prod: ["Sparkle Sunday"] }),
    T("bakery", "shop", "Bakery", { w: { creativity: 0.5, fitness: 0.2, charm: 0.3 }, cap: 3000, base: 70, price: 4, unit: "customers", inputs: ["mill", "dairy"], npc: 3, prod: ["Melon Bun", "Honey Sourdough", "Cloud Croissant", "Acorn Roll"] }),
    T("cafe", "shop", "Café", { w: { charm: 0.5, creativity: 0.5 }, cap: 3500, base: 80, price: 4, unit: "customers", inputs: ["coffee", "dairy", "mill"], npc: 4, prod: ["Moss Latte", "Burrow Brew", "Toasted Oat Flat White"] }),
    T("boutique", "shop", "Boutique", { w: { creativity: 0.6, charm: 0.4 }, cap: 4500, base: 22, price: 18, unit: "customers", inputs: ["weaver"], npc: 3, risk: 0.4, prod: ["the Fern Coat", "Pocket Scarf"] }),
    T("bookshop", "shop", "Bookshop", { w: { logic: 0.4, charm: 0.4, creativity: 0.2 }, cap: 3000, base: 30, price: 9, unit: "customers", inputs: ["printer"], npc: 2, risk: 0.25, prod: ["the Rainy Day Shelf"] }),
    T("salon", "care", "Salon", { w: { creativity: 0.5, charm: 0.5 }, cap: 2000, base: 22, price: 12, unit: "customers", npc: 4, mat: 0.15, prod: ["the Fluff-up", "Silk Ear Treatment"] }),
    T("clinic", "care", "Clinic", { w: { logic: 0.7, charm: 0.3 }, cap: 6000, base: 20, price: 28, unit: "patients", npc: 2, mat: 0.25, risk: 0.15, prod: ["the Same-day Checkup"] }),
    T("gym", "care", "Gym", { w: { fitness: 0.7, charm: 0.3 }, cap: 4000, base: 35, price: 8, unit: "members", npc: 3, mat: 0.12, prod: ["Burrow Bootcamp", "Sunrise Stretch"] }),
    T("tutoring", "care", "Tutoring center", { w: { logic: 0.6, charm: 0.4 }, cap: 1500, base: 18, price: 12, unit: "students", npc: 3, mat: 0.08, risk: 0.15, prod: ["Exam Rescue"] }),
    T("garage", "care", "Repair garage", { w: { fitness: 0.4, logic: 0.6 }, cap: 3000, base: 9, price: 40, unit: "repairs", npc: 2, mat: 0.4, risk: 0.2, prod: ["the Ten-minute Tune-up"] }),
    T("music", "media", "Music studio", { w: { creativity: 0.8, charm: 0.2 }, cap: 3500, base: 6, price: 55, unit: "sessions", serves: ["agency", "@influencer"], npc: 2, mat: 0.12, risk: 0.5, prod: ["Moonlit Sessions", "Lo-fi Burrow"] }),
    T("photo", "media", "Photo studio", { w: { creativity: 0.7, charm: 0.3 }, cap: 2500, base: 8, price: 40, unit: "shoots", serves: ["agency", "boutique", "@influencer"], npc: 3, mat: 0.12, risk: 0.35, prod: ["Golden Hour Portraits"] }),
    T("gamedev", "media", "Game studio", { w: { creativity: 0.5, logic: 0.5 }, cap: 5000, base: 0, price: 0, unit: "players", npc: 1, mat: 0.05, risk: 0.8, hits: true, prod: ["Acorn Quest", "Tiny Tunnels", "Moss Kart", "Owl Odyssey"] }),
    T("startup", "tech", "App startup", { w: { logic: 0.5, creativity: 0.3, charm: 0.2 }, cap: 6000, base: 0, price: 0, unit: "users", npc: 2, mat: 0.05, risk: 0.9, hits: true, prod: ["Nibble", "Burrowly", "Hopscotch", "Tailr"] }),
    T("quant", "fin", "Quant fund", { w: { logic: 1 }, cap: 10000, base: 0, price: 0, unit: "", npc: 2, mat: 0, risk: 0.7, fund: true, prod: ["the Acorn Alpha model", "Owl-7"] }),
    T("broker", "fin", "Brokerage", { w: { charm: 0.6, logic: 0.4 }, cap: 5000, base: 25, price: 6, unit: "trades", npc: 2, mat: 0.1, risk: 0.45, broker: true, prod: ["Zero-fee Fridays"] }),
  ];
  const TPL = Object.fromEntries(TPLS.map(t => [t.id, t]));
  const LEVELS = [
    { label: "Stall", cap: 1, staff: 0, rent: 1, up: 0 },
    { label: "Shop", cap: 2.6, staff: 2, rent: 2.6, up: 2.5 },
    { label: "Company", cap: 6.5, staff: 6, rent: 6.5, up: 7 },
    { label: "Chain", cap: 16, staff: 16, rent: 15, up: 18 },
  ];
  const FUND_LEVELS = [{ label: "Small fund", at: 0 }, { label: "Fund", at: 120000 }, { label: "Big fund", at: 400000 }, { label: "Giant fund", at: 1500000 }];
  const WAGE = 22;
  // karyawan: jabatan per jenis bisnis, dan berapa orang yang muat di tiap level
  const ROLES_CAT = { raw: ["Farmhand", "Driver"], make: ["Machine operator", "Craftsperson"], dist: ["Driver", "Dispatcher"], svc: ["Associate", "Account manager"],
    shop: ["Shop assistant", "Cashier"], care: ["Assistant", "Receptionist"], media: ["Producer", "Editor"], tech: ["Developer", "Designer"], fin: ["Analyst", "Trader"] };
  const ROLES_TPL = { bakery: ["Baker", "Cashier"], cafe: ["Barista", "Server"], courier: ["Rider", "Dispatcher"], quant: ["Quant analyst", "Trader", "Quant dev"],
    gamedev: ["Game developer", "Artist"], startup: ["Developer", "Designer", "Growth lead"], clinic: ["Nurse", "Receptionist"], salon: ["Stylist", "Receptionist"],
    gym: ["Trainer", "Front desk"], tutoring: ["Tutor"], garage: ["Mechanic"], broker: ["Broker", "Analyst"], accounting: ["Accountant"], recruit: ["Recruiter"] };
  const roles = t => ROLES_TPL[t.id] || ROLES_CAT[t.cat];
  const SLOTS = [2, 5, 10, 20];
  const SUPPLY = { cheap: { label: "Cheap", mat: 0.85, q: -0.05 }, standard: { label: "Standard", mat: 1, q: 0 }, premium: { label: "Premium", mat: 1.2, q: 0.05 } };
  const LOANS = [{ term: 120, rate: 0.06, label: "4 months" }, { term: 240, rate: 0.13, label: "8 months" }, { term: 480, rate: 0.26, label: "16 months" }];
  const NPC_FIRST = ["Ari", "Beni", "Cika", "Dodo", "Eli", "Fani", "Gita", "Hani", "Ipul", "Juju", "Kemi", "Lolo", "Mimi", "Nino", "Opi", "Pepe", "Quin", "Riri", "Sisi", "Tobi", "Umi", "Vivi", "Wawa", "Yaya", "Zuzu"];
  const NPC_LAST = ["Ash", "Bloom", "Fern", "Lark", "Reed", "Wren", "Moss", "Pike", "Vale", "Hollow"];
  const SUP_NAME = ["Hillside", "Riverbend", "Oakmoor", "Sunvale", "Brookside", "Thornfield"];
  const fairPay = (t, skill) => Math.round(WAGE * (0.75 + skill * 0.9) * (t.fund || t.hits ? 1.7 : t.b2b ? 1.2 : 1));
  const NAME_A = ["Acorn", "Moss", "Fern", "Willow", "Hazel", "Pebble", "Clover", "Maple", "Thistle", "Bramble", "Sunny", "Honey", "Little", "Cozy", "Old Town"];

  // ---------------------------------------------------------------- ekonomi kota (sama untuk semua pemain)
  const YEAR = 365;
  function recession(day) {
    for (let b = Math.floor(day / 240) - 1; b <= Math.floor(day / 240); b++) {
      if (hash("resesi" + b) >= 0.14) continue;
      const start = b * 240 + Math.floor(hash("resesi-m" + b) * 150), len = 60 + Math.floor(hash("resesi-l" + b) * 70);
      if (day >= start && day < start + len) return { start, len, depth: 0.18 + hash("resesi-d" + b) * 0.14 };
    }
    return null;
  }
  const _econ = new Map();
  function econ(day) {
    if (_econ.has(day)) return _econ.get(day);
    let v = 1 + 0.1 * Math.sin(2 * Math.PI * day / 720 + 1.3) + 0.04 * Math.sin(2 * Math.PI * day / 170 + 0.4);
    const R = recession(day);
    if (R) { const t = (day - R.start) / R.len; v *= 1 - R.depth * Math.sin(Math.PI * Math.min(1, t * 1.4)); }
    v = r2(v * 1000) / 1000;
    if (_econ.size > 4000) _econ.clear();
    _econ.set(day, v);
    return v;
  }
  const econLabel = v => v >= 1.08 ? "Booming" : v >= 0.98 ? "Steady" : v >= 0.88 ? "Slowing" : "Recession";
  // trend per jenis bisnis: lagi naik atau turun di kota (berubah tiap ~4 bulan)
  function trend(id, day) {
    const q = Math.floor(day / 120), t = (day % 120) / 120, a = hash("trend" + id + q), b = hash("trend" + id + (q + 1));
    return 0.82 + 0.36 * (a + (b - a) * t);
  }
  const TAILS = { bakery: "Bakery", cafe: "Café", boutique: "Boutique", bookshop: "Books", salon: "Salon", clinic: "Clinic", gym: "Gym", tutoring: "Tutoring", garage: "Garage",
      farm: "Farm", dairy: "Dairy", coffee: "Coffee Farm", mill: "Mill", weaver: "Weavers", printer: "Press", furniture: "Woodworks", wholesale: "Wholesale", courier: "Couriers",
      agency: "Agency", accounting: "Accounting", softhouse: "Software", recruit: "Talent", cleaning: "Cleaners", music: "Studios", photo: "Photo", gamedev: "Games", startup: "Labs",
      quant: "Capital", broker: "Securities" };
  // pesaing NPC per jenis bisnis: jumlahnya berganti tiap kuartal, tiap pesaing punya nama, kekuatan, dan ceruk sendiri
  const rivalsN = (id, day) => Math.max(0, Math.round((TPL[id].npc || 2) * (0.6 + hash("rival" + id + Math.floor(day / 90)) * 0.8)));
  // ceruk (spesialisasi). Kepadatan dihitung per ceruk: makin banyak yang di ceruk yang sama, makin tipis
  const NICHE = {
    bakery: [["bread", "Bread"], ["pastry", "Pastry"]], cafe: [["coffee", "Coffee bar"], ["brunch", "Brunch"]], boutique: [["street", "Streetwear"], ["formal", "Formal"]],
    salon: [["cuts", "Cuts"], ["spa", "Spa"]], clinic: [["general", "General"], ["kids", "Kids"], ["dental", "Dental"]], gym: [["strength", "Strength"], ["classes", "Classes"]],
    tutoring: [["exam", "Exam prep"], ["young", "Little ones"]], bookshop: [["new", "New books"], ["used", "Used books"]], agency: [["brand", "Brand"], ["social", "Social"]],
    softhouse: [["apps", "Apps"], ["systems", "Systems"]], broker: [["retail", "Retail"], ["pro", "Pro traders"]],
    quant: [["momentum", "Momentum"], ["meanrev", "Mean reversion"], ["neutral", "Market-neutral"]],
  };
  const niches = id => NICHE[id] || [["all", "General"]];
  // gaya fund: beta (seberapa ikut pasar) dan seberapa besar edge-nya kepakai
  const FUND_STYLE = { momentum: { beta: 1.2, a: 1 }, meanrev: { beta: 0.8, a: 1.1 }, neutral: { beta: 0.35, a: 0.8 } };
  // krisis: selama resesi pesaing yang paling lemah tutup, dan butuh ~6 bulan setelahnya buat pendatang baru masuk lagi
  function crisisFrac(day) {
    let f = 0;
    for (let k = Math.floor(day / 240) - 2; k <= Math.floor(day / 240); k++) {
      if (k < 0 || hash("resesi" + k) >= 0.14) continue;
      const start = k * 240 + Math.floor(hash("resesi-m" + k) * 150), len = 60 + Math.floor(hash("resesi-l" + k) * 70), depth = 0.18 + hash("resesi-d" + k) * 0.14, peak = depth * 1.4;
      if (day >= start && day < start + len) f = Math.max(f, peak * Math.min(1, (day - start) / len * 1.3));
      else if (day >= start + len && day < start + len + 180) f = Math.max(f, peak * (1 - (day - start - len) / 180));
    }
    return f;
  }
  // resesi di bursa: awalnya anjlok, lalu pulih sebagian. Yang leverage-nya tinggi kena paling parah
  function crashDrift(day) {
    const R = recession(day);
    if (!R) return 0;
    const t = (day - R.start) / R.len, k = R.depth / 0.25;
    return t < 0.4 ? -0.0042 * k : t < 0.8 ? 0.0018 * k : 0;
  }
  const _riv = new Map();
  function rivalList(id, day) {
    const key = id + ":" + day;
    if (_riv.has(key)) return _riv.get(key);
    const n = rivalsN(id, day), N = niches(id), all = [];
    for (let i = 0; i < n; i++) {
      const s = Math.round((0.55 + 0.45 * hash("rs" + id + i) + 0.08 * Math.sin(day / 200 + hash("rp" + id + i) * 6.283)) * 1000) / 1000;
      const o = { i, key: `rv:${id}:${i}`, s, niche: N[Math.floor(hash("rn" + id + i + "y" + Math.floor(day / 360)) * N.length)][0] };
      // nama pesaing lewat registry brand (slot "rv:<jenis>:<i>"), bisa diganti brand mitra
      BR.bind(o, BR.reg(o.key, `${NAME_A[Math.floor(hash("rnm" + id + i) * NAME_A.length)]} ${TAILS[id]}${i >= NAME_A.length ? " " + (i + 1) : ""}`, "rival", id));
      all.push(o);
    }
    const shut = Math.round(n * crisisFrac(day)), weak = [...all].sort((a, b) => a.s - b.s).slice(0, shut).map(o => o.i);
    const out = { all, open: all.filter(o => !weak.includes(o.i)), shut: all.filter(o => weak.includes(o.i)) };
    if (_riv.size > 4000) _riv.clear();
    _riv.set(key, out);
    return out;
  }
  const rivals = (id, day) => rivalList(id, day).open.length;
  // nama pesaing jangan sampai sama dengan bisnis keluarga
  const rivalName = (home, o) => !BR.partner(o.key) && active(home).some(b => b.name === o.name) ? o.name.replace(/^\S+/, w => NAME_A[(NAME_A.indexOf(w) + 1) % NAME_A.length]) : o.name;
  // kekuatan bisnis di mata pembeli: kualitas, reputasi, edge, ukuran
  const strength = b => 0.3 + 0.6 * (b.q ?? 0.5) + (b.rep ?? 30) / 400 + (b.edge || 0) / 250 + (b.level || 0) * 0.04;
  const nicheOf = (b, day) => {
    if (b.niche) return b.niche;
    const N = niches(b.tpl);
    if (N.length < 2) return N[0][0];
    // belum pernah dipilih: makhluknya ambil ceruk yang paling sepi waktu buka
    const L = rivalList(b.tpl, b.since || day).open, cnt = N.map(([k], j) => L.filter(o => o.niche === k).length + hash(b.id + k) * 0.5 + j * 0.01);
    return N[cnt.indexOf(Math.min(...cnt))][0];
  };
  // seberapa padat pasar buat satu bisnis. Hasil 0,5 per pesaing kalau semua setara dan cerukny rata, sama kayak hitungan lama
  function compete(home, b, day) {
    const N = niches(b.tpl), multi = N.length > 1, me = strength(b), my = nicheOf(b, day), L = rivalList(b.tpl, day);
    const ratio = s => clamp(Math.pow(s / me, 1.5), 0.35, 2.5);
    let comp = 0;
    const rows = [];
    for (const o of L.open) {
      const same = !multi || o.niche === my, w = (multi ? (same ? 0.75 : 0.25) : 0.5) * ratio(o.s);
      comp += w; rows.push({ name: rivalName(home, o), niche: o.niche, s: o.s, same });
    }
    for (const o of active(home).filter(o => o.tpl === b.tpl && o.id !== b.id)) {
      const same = !multi || nicheOf(o, day) === my, w = (same ? 1 : 0.35) * ratio(strength(o));
      comp += w; rows.push({ name: o.name, niche: nicheOf(o, day), s: Math.round(strength(o) * 1000) / 1000, same, fam: true });
    }
    return { comp, n0: L.all.length, shut: L.shut.length, me: Math.round(me * 1000) / 1000, niche: my, rows, crowd: rows.filter(r => r.same).length };
  }

  // ---------------------------------------------------------------- bursa saham Old Town: perusahaan NPC (career.js)
  const SIZEV = { Startup: 8, "Small company": 20, "Mid-size company": 45, "Large company": 90 };
  function wave(key, day) {
    let v = 0;
    for (let k = 0; k < 3; k++) { const per = [37, 113, 401][k], ph = hash(key + "ph" + k) * 6.283; v += Math.sin(2 * Math.PI * day / per + ph) * [0.03, 0.06, 0.1][k]; }
    return v + (hash(key + "d" + day) - 0.5) * 0.025;
  }
  function price(co, day) {
    if (!CR.alive(co, day)) return null;
    const age = (day - co.founded) / YEAR, g = 0.02 + hash(co.id + "g") * 0.1 - (co.closes < Infinity ? 0.08 : 0);
    let p = SIZEV[co.size] * Math.pow(1 + g, Math.max(0, age)) * (0.7 + 0.3 * econ(day)) * (1 + wave(co.id, day));
    const lo = CR.layoffDay(co, Math.floor(day / 30) * 30);
    if (lo != null && day >= lo && day < lo + 25) p *= 0.9;
    if (co.closes < Infinity && co.closes - day < 60) p *= 0.4 + 0.6 * (co.closes - day) / 60;
    return Math.max(0.5, r2(p));
  }
  const _idx = new Map();
  function index(day) {
    if (_idx.has(day)) return _idx.get(day);
    let s = 0, n = 0;
    for (const co of CR.COS) { const p = price(co, day), p0 = price(co, day - 1); if (p != null && p0 != null) { s += Math.log(p / p0); n++; } }
    const r = n ? s / n : 0;
    if (_idx.size > 4000) _idx.clear();
    _idx.set(day, r);
    return r;
  }
  function indexLevel(day, from) { let v = 1000; for (let d = from + 1; d <= day; d++) v *= Math.exp(index(d)); return Math.round(v); }
  function market(day, span = 60) {
    const pts = [];
    let v = 1000;
    for (let d = day - span; d <= day; d++) { if (d > day - span) v *= Math.exp(index(d)); pts.push(Math.round(v)); }
    const movers = CR.COS.filter(co => CR.alive(co, day) && CR.alive(co, day - 1)).map(co => {
      const p = price(co, day), p0 = price(co, day - 1), p30 = price(co, Math.max(co.founded, day - 30));
      return { id: co.id, name: co.name, ind: co.ind, size: co.size, price: p, chg: r2((p / p0 - 1) * 100), chg30: r2((p / p30 - 1) * 100), color: co.color };
    }).sort((a, b) => b.price - a.price);
    return { pts, today: r2(index(day) * 100), econ: econ(day), mood: econLabel(econ(day)), recession: !!recession(day), movers };
  }

  // ---------------------------------------------------------------- keadaan (ikut snapshot lewat world.st)
  const B = home => { const F = ST.fam(home); return F.biz || (F.biz = { seq: 0, list: [] }); };
  const active = home => B(home).list.filter(b => !b.closed);
  const ownerBiz = (home, cid) => active(home).find(b => b.owner === cid) || null;
  const grown = (c, day) => c.alive(day) && phase_of(c.age(day)) === "dewasa" && !("keluar" in c.info) && !c.info.pensiun && c.st;
  const lvlOf = b => TPL[b.tpl].fund ? FUND_LEVELS.reduce((a, L, i) => b.cash >= L.at ? i : a, 0) : b.level;
  const lvlLabel = b => (TPL[b.tpl].fund ? FUND_LEVELS : LEVELS)[lvlOf(b)].label;

  function fit(c, id) {
    const t = TPL[id], st = c.st;
    if (!st) return 0;
    let f = 0;
    for (const [k, v] of Object.entries(t.w)) f += v * (0.55 * st.genes.talent[k] / 10 + 0.45 * st.skills[k] / 100);
    return clamp(f, 0, 1);
  }
  const fitLabel = f => f >= 0.62 ? "Great fit" : f >= 0.48 ? "Good fit" : f >= 0.36 ? "A stretch" : "Poor fit";

  // who buys from a B2B business: NPC companies in those industries, plus family businesses and town shops of those kinds
  function clients(home, t, day) {
    let n = 0;
    for (const s of t.serves) {
      if (s === "*") { n += active(home).filter(b => b.tpl !== t.id).length * 0.6 + 4; continue; }
      if (s.startsWith("@")) { n += CR.companiesAt(day, s.slice(1)).length * 0.7; continue; }
      n += rivals(s, day) * 0.8 + active(home).filter(b => b.tpl === s).length * 1.2;
    }
    return n;
  }
  function famSupplier(home, t) {
    return t.inputs.map(i => active(home).find(b => b.tpl === i)).filter(Boolean);
  }

  // ---------------------------------------------------------------- karyawan
  function payOf(home, s) {
    if (!s.fam) return s.pay;
    const m = home.get(s.fam);
    return m && m.st && m.st.job && m.st.job.biz ? ST.salary(m.st.job) : 0;
  }
  function npcPerson(seed, t, rep, skillBias = 0) {
    const h = k => hash(seed + k);
    const skill = r2(clamp(0.25 + h("s") * 0.5 + rep / 500 + skillBias, 0.1, 0.95));
    return { name: NPC_FIRST[Math.floor(h("a") * NPC_FIRST.length)] + " " + NPC_LAST[Math.floor(h("b") * NPC_LAST.length)], skill, ask: Math.round(fairPay(t, skill) * (0.9 + h("p") * 0.25)),
      trait: ["hard-working", "cheerful", "quiet", "ambitious", "careful", "chatty"][Math.floor(h("t") * 6)] };
  }
  function hire(home, b, app, day) {
    const t = TPL[b.tpl], role = b.post ? b.post.role : roles(t)[0];
    const s = { id: "s" + (b.sseq = (b.sseq || 0) + 1), name: app.name, role, skill: app.skill, pay: app.ask, mood: 70, since: day, trait: app.trait };
    if (app.fam) {
      const m = home.get(app.fam);
      if (!m || !m.st || !grown(m, day) || ownerBiz(home, m.id)) return null;
      s.fam = m.id; s.name = m.name; s.pay = 0;
      m.st.job = { id: "staff", level: 0, since: day, co: null, biz: b.id, role };
      m.st.next_review = null; m.st.next_comp = null; m.st.work = { biz: b.id, role, from: day };
      m.info.kerja = ST.title(m.st.job); m.info.mulai_kerja = day;
    }
    (b.staff ||= []).push(s);
    b.post = null;
    const o = !b.demo && home.get(b.owner); if (o && o.st) o.st.hiredN = (o.st.hiredN || 0) + 1;
    return s;
  }
  // keluar kerja: kalau sudah cukup lama (90 hari), app-nya jadi "alumni" di HP makhluk itu
  function leaveWork(c, b, day, role, why) {
    if (!c || !c.st) return;
    const w = c.st.work;
    if (w && w.biz === b.id && day - w.from >= 90) (c.st.alumni ||= []).push({ biz: b.id, name: b.name, tpl: b.tpl, role: w.role || role, from: w.from, to: day, why });
    if (w && w.biz === b.id) c.st.work = null;
  }
  function dropStaff(home, b, s, day, why) {
    b.staff = b.staff.filter(o => o !== s);
    if (s.fam) {
      const m = home.get(s.fam);
      if (m && m.st && m.st.job && m.st.job.biz === b.id) { leaveWork(m, b, day, s.role, why); m.st.job = null; delete m.info.kerja; m.st.ready_since = day; m.st.retry_after = day + 4; m.st.lastWhy = why; }
    }
  }
  function staffDay(x, b) {
    const home = x.home, t = TPL[b.tpl], day = x.day, rng = seed_rng(home.id, b.id, day, "staf"), c = x.c, lv = LEVELS[b.level];
    b.staff ||= [];
    const p30 = (b.hist || []).slice(-30).reduce((s2, r) => s2 + r[2], 0);
    let line = null;
    for (const s of b.staff.slice()) {
      if (s.fam) {
        const m = home.get(s.fam);
        if (!m || !m.st || !m.st.job || m.st.job.biz !== b.id || !grown(m, day)) { if (m && m.st && m.st.job && m.st.job.biz === b.id) dropStaff(home, b, s, day, "Left"); else { b.staff = b.staff.filter(o => o !== s); if (m) leaveWork(m, b, day, s.role, "Left"); } continue; }
      }
      const fair = fairPay(t, s.skill), pay = payOf(home, s);
      const target = 62 + (s.fam ? 8 : (pay / fair - 1) * 90) + (p30 >= 0 ? 4 : -10) + (b.focus === "growth" ? -6 : 0) + ((x.t("ramah") ?? 50) - 50) / 5 + (b.burn > day ? -8 : 0);
      s.mood = Math.round(clamp(s.mood + (target - s.mood) * 0.06 + rng.gauss(0, 2), 0, 100));
      s.skill = r2(Math.min(0.98, s.skill + 0.0006 * (1 - s.skill)));
      if (!s.fam && s.mood < 35 && rng.random() < 0.015) { dropStaff(home, b, s, day, "Quit"); line = `${s.name}, ${/^[aeiou]/i.test(s.role) ? "an" : "a"} ${s.role.toLowerCase()} at ${b.name}, quits. ${s.mood < 20 ? "They were miserable." : "They found something better."}`; }
    }
    // lowongan: pelamar NPC datang tiap beberapa hari, makhluknya pilih sendiri kalau pemain nggak kasih saran
    const P = b.post;
    if (P) {
      if (P.apps.length < 6 && rng.random() < 0.3 * (0.5 + (b.rep || 30) / 100) * econ(day)) P.apps.push({ id: "a" + (P.seq = (P.seq || 0) + 1), d: day, ...npcPerson(b.id + day + P.d, t, b.rep || 30) });
      const wait = day - P.d;
      if (P.apps.length && (wait >= 6 || P.apps.length >= 4) && !P.player) {
        const best = P.apps.slice().sort((a, b2) => (b2.skill - b2.ask / 400 + (b2.fam ? 0.15 : 0)) - (a.skill - a.ask / 400 + (a.fam ? 0.15 : 0)))[0];
        const s = hire(home, b, best, day);
        if (!s) P.apps = P.apps.filter(a => a !== best);  // pelamar keluarga yang udah nggak bisa direkrut
        if (s) line = line || `${c.name} hires ${s.name} as ${/^[aeiou]/i.test(s.role) ? "an" : "a"} ${s.role.toLowerCase()} at ${b.name}.`;
      } else if (wait >= 14) { b.post = null; line = line || `Nobody right for the ${P.role.toLowerCase()} job at ${b.name}. ${c.name} takes the post down.`; }
    }
    // kekurangan orang: pemilik pasang lowongan sendiri
    if (!b.post && b.staff.length < lv.staff && !t.fund) b.post = { role: roles(t)[b.staff.length % roles(t).length], d: day, apps: [], by: "owner" };
    return line;
  }

  // ---------------------------------------------------------------- toko roti: rencana panggang
  // bisnis "siapin pagi" (bakery, café): yang disiapin pagi dijual seharian, sisanya dibuang
  const PREP = ["bakery", "cafe"];
  const CAFE_FOOD = ["Moss Muffin", "Garden Sandwich", "Oat Bagel", "Honey Scone"];
  // café: tempat duduk vs bawa pulang
  const SEAT = { takeaway: { dem: 1.1, food: 0.4, spend: 0.95, label: "Mostly takeaway" }, mix: { dem: 1, food: 0.5, spend: 1, label: "A bit of both" }, seats: { dem: 0.92, food: 0.62, spend: 1.1, label: "Lots of seats" } };
  function bakeProds(t, b) {
    const ps = t.id === "cafe" ? CAFE_FOOD.slice(0, 4) : [...new Set([b.sig, ...t.prod].filter(Boolean))].slice(0, 4);
    return ps.map(p => ({ p, w: (p === b.sig ? 2.2 : 1) * (0.6 + hash(b.id + p) * 0.8) }));
  }
  function bakeAuto(b, t, P, capN, tr) {
    // tebakan pemilik sendiri: rata-rata yang dicari minggu ini, plus cadangan (yang penakut lebih banyak cadangan)
    const W = P.reduce((a, o) => a + o.w, 0), cap = Math.round(capN * 1.4);
    return P.map(o => { const d = b.dem7 && b.dem7[o.p]; return Math.max(4, Math.round(d != null ? d * (1.04 + (tr("penakut") - 50) / 400 + (Math.abs(hash(b.id + o.p + "gut") - 0.5) - 0.2) * 0.3) : cap * 0.55 * o.w / W)); });
  }
  function bakeDay(x, b, t, dem, capN, pm, matF, rng, fest) {
    const P = bakeProds(t, b), W = P.reduce((a, o) => a + o.w, 0), cap = Math.round(capN * 1.4), tr = k => x.t(k) ?? 50, day = x.day;
    const auto = bakeAuto(b, t, P, capN, tr);
    let plan = P.map((o, i) => b.plan && b.plan[o.p] != null ? b.plan[o.p] : auto[i]);
    if (fest && b.fest && b.fest.double) plan = plan.map(v => Math.round(v * 1.8));
    const tot = plan.reduce((a, v) => a + v, 0), capF = fest && b.fest && b.fest.double ? 1.8 : 1;
    if (tot > cap * capF) plan = plan.map(v => Math.floor(v * cap * capF / tot));
    const item = t.price * pm / 1.4, items = dem * 1.4;
    const rows = P.map((o, i) => { const D = Math.round(items * o.w / W * (0.8 + rng.random() * 0.4)), sold = Math.min(D, plan[i]); return { p: o.p, plan: plan[i], dem: D, sold, left: plan[i] - sold, lost: Math.max(0, D - plan[i]), mine: !!(b.plan && b.plan[o.p] != null) }; });
    const S = k => rows.reduce((a, r) => a + r[k], 0);
    let rev = Math.round(S("sold") * item), old = 0;
    if (b.dayold && b.leftY) { old = Math.round(b.leftY * 0.6); rev += Math.round(old * item * 0.5); }
    const mat = Math.round(S("plan") * item * t.mat * matF * 1.2);
    const cust = Math.round(S("sold") / 1.4), lostC = Math.round(S("lost") / 1.4);
    if (lostC > Math.max(3, cust * 0.15)) b.rep = clamp(b.rep - 0.35, 0, 100);
    if (b.dayold && old) b.rep = clamp(b.rep - 0.03, 0, 100);
    b.dem7 ||= {};
    for (const r of rows) b.dem7[r.p] = Math.round(b.dem7[r.p] == null ? r.dem : b.dem7[r.p] * 0.75 + r.dem * 0.25);
    // laporan balik: saran pemain kemarin jadinya gimana
    const mine = rows.filter(r => r.mine);
    if (mine.length && b.planD === day - 1) {
      const r = mine.slice().sort((a, z) => (z.lost + z.left) - (a.lost + a.left))[0];
      b.adv = { d: day, ok: r.lost <= 2 && r.left <= Math.max(2, r.plan * 0.12), t: `Your plan for ${r.p}: ${t.id === "cafe" ? "made" : "baked"} ${r.plan}, sold ${r.sold}${r.left ? `, ${r.left} left over` : ""}${r.lost ? `, ${r.lost} people wanted one and missed out` : ""}.` };
    }
    b.bake = { d: day, rows, lost: S("lost"), left: S("left"), old, cust, lostC, cap: Math.round(cap * capF), dem: Math.round(items) };
    b.leftY = S("left");
    return { cust, rev, mat };
  }
  // kartu keputusan mingguan toko roti
  const BAKE_CARDS = {
    butter: { t: "Butter prices jump 30% this week. The croissants eat a lot of butter.", o: [["switch", "Switch to cheaper butter", "Saves money, regulars may taste it"], ["raise", "Raise prices 10%", "Fewer customers for two weeks"], ["absorb", "Pay the higher price", "Same taste, thinner profit"]] },
    wedding: { t: "The Hazel family wants a three-tier wedding cake by Saturday.", o: [["yes", "Take the order", "Big payday, long nights, could go wrong"], ["no", "Politely decline", "Nothing changes"]] },
    inspector: { t: "A health inspector is visiting this week.", o: [["clean", "Close one afternoon to deep-clean", "Lose half a day of sales, pass for sure"], ["carry", "Carry on as normal", "Passes if things are already clean"]] },
    festival: { t: "The Old Town festival is this weekend. Crowds everywhere.", o: [["double", "Bake almost double", "Sell out less, risk leftovers"], ["normal", "Bake as usual", "Safe, but many will miss out"]] },
    raise: { t: "{s} asks for a raise.", o: [["yes", "Give 12% more", "Happier, costs more"], ["no", "Not now", "They'll be upset"]] },
  };
  const CAFE_CARDS = {
    butter: { t: "Milk prices jump 30% this week. Every latte needs milk.", o: [["switch", "Switch to cheaper milk", "Saves money, regulars may taste it"], ["raise", "Raise prices 10%", "Fewer customers for two weeks"], ["absorb", "Pay the higher price", "Same taste, thinner profit"]] },
    camp: { t: "Laptop campers take every table for hours. The lunch crowd has nowhere to sit.", o: [["limit", "Two-hour limit on tables", "More seats free, some regulars grumble"], ["socket", "Add a counter with plugs", "Costs 400 coins, everyone fits"], ["let", "Let them be", "Cozy reputation, fewer lunch customers"]] },
    inspector: BAKE_CARDS.inspector,
    art: { t: "The Old Town latte art contest is on Sunday.", o: [["enter", "Enter it", "Win and the name spreads. Lose and nothing happens"], ["skip", "Skip it", "Nothing changes"]] },
    raise: { t: "{s} asks for a raise.", o: [["yes", "Give 12% more", "Happier, costs more"], ["no", "Not now", "They'll be upset"]] },
  };
  // ---------------------------------------------------------------- jasa: salon, les, kebersihan, kurir
  // tiap bisnis punya satu tuas cara kerja (mode), satu tombol tambahan (extra), dan kartu mingguan sendiri
  const SVC = {
    salon: { lever: "book", def: "mix", noshow: 0.09, extra: "remind", ing: "hair dye", cards: ["butter", "wedding", "inspector"], opts: {
      walkin: { dem: 1, cap: 0.92, price: 1, q: 0, booked: 0 }, mix: { dem: 1, cap: 1.04, price: 1, q: 0, booked: 0.5 }, booked: { dem: 0.9, cap: 1.15, price: 1.05, q: 0.02, booked: 1 } } },
    tutoring: { lever: "size", def: "small", extra: "notes", cards: ["refund", "festival"], opts: {
      solo: { dem: 0.95, cap: 0.5, price: 1.9, q: 0.08 }, small: { dem: 1, cap: 1, price: 1, q: 0 }, big: { dem: 1.15, cap: 1.6, price: 0.65, q: -0.08 } } },
    cleaning: { lever: "crew", def: "standard", risk: 0.05, extra: "eco", ing: "cleaning supplies", cards: ["butter", "wedding", "lost"], opts: {
      quick: { dem: 1, cap: 1.25, price: 0.88, q: -0.05, risk: 2 }, standard: { dem: 1, cap: 1, price: 1, q: 0, risk: 1 }, deep: { dem: 0.95, cap: 0.8, price: 1.3, q: 0.05, risk: 0.45 } } },
    courier: { lever: "promise", def: "sameday", risk: 0.07, extra: "track", ing: "fuel", cards: ["butter", "festival", "lost"], opts: {
      nextday: { dem: 1.05, cap: 1.25, price: 0.8, q: 0, risk: 0.4 }, sameday: { dem: 1, cap: 1, price: 1, q: 0, risk: 1 }, express: { dem: 0.85, cap: 0.65, price: 1.55, q: 0, risk: 2.2 } } },
  };
  const svcMode = (b, t) => SVC[t.id].opts[b.mode] ? b.mode : SVC[t.id].def;
  const priceCard = ing => ({ t: `${ing.replace(/^./, ch => ch.toUpperCase())} ${/s$/.test(ing) ? "cost" : "costs"} 30% more this week.`, o: [["switch", `Switch to cheaper ${ing}`, "Saves money, customers may notice"], ["raise", "Raise prices 10%", "Fewer customers for two weeks"], ["absorb", "Pay the higher price", "Same quality, thinner profit"]] });
  const SVC_CARDS = {
    salon: { butter: priceCard("hair dye"), inspector: BAKE_CARDS.inspector, raise: BAKE_CARDS.raise,
      wedding: { t: "A wedding party of eight wants the whole salon on Saturday morning.", o: [["yes", "Take the booking", "Big payday, a long morning, could go wrong"], ["no", "Politely decline", "Regulars keep their slots"]] } },
    tutoring: { raise: BAKE_CARDS.raise,
      refund: { t: "A parent wants their money back after their child failed a test.", o: [["refund", "Give the money back", "Costs coins, the parent calms down"], ["extra", "Offer free extra lessons", "Less room for two weeks, could win them over"], ["no", "Say no", "Saves money, they might complain online"]] },
      festival: { t: "Exam season starts in a few days. Parents are calling non-stop.", o: [["double", "Add evening classes", "Take far more students, a tired team"], ["normal", "Keep the usual hours", "Calm, but many get turned away"]] } },
    cleaning: { butter: priceCard("cleaning supplies"), raise: BAKE_CARDS.raise,
      wedding: { t: "An office tower wants a one-off deep clean this weekend.", o: [["yes", "Take the job", "Big payday, everyone works the weekend"], ["no", "Politely decline", "Nothing changes"]] },
      lost: { t: "{s} broke a client's vase while dusting.", o: [["pay", "Pay for it", "Costs coins, the client stays loyal"], ["deny", "Say it was already cracked", "Free if they believe it"]] } },
    courier: { butter: priceCard("fuel"), raise: BAKE_CARDS.raise,
      festival: { t: "The holiday rush starts tomorrow. Everyone is shipping gifts.", o: [["double", "Hire temporary riders", "Carry far more for a few days, costs extra"], ["normal", "Keep the usual team", "Many parcels get turned away"]] },
      lost: { t: "A parcel went missing somewhere on today's routes.", o: [["pay", "Pay the customer back", "Costs coins, trust stays"], ["deny", "Blame the post office", "Free if they believe it"]] } },
  };
  const CARDED = id => PREP.includes(id) || !!SVC[id];
  const prepCards = t => t.id === "cafe" ? CAFE_CARDS : SVC_CARDS[t.id] || BAKE_CARDS;
  // satu hari bisnis jasa: yang dicari vs yang sanggup dilayani, plus yang batal datang dan yang bermasalah
  function svcDay(x, b, t, D, capN, pm, matF, rng) {
    const S = SVC[t.id], mk = svcMode(b, t), O = S.opts[mk], ex = !!b.extra, day = x.day, E = S.extra;
    const fest = !!(b.fest && day >= b.fest.from && day <= b.fest.to), half = b.half === day ? 0.5 : 1;
    const priceF = b.butter && b.butter.until > day && b.butter.k === "raise" ? 1.1 : 1;
    const dem = Math.max(0, Math.round(D * O.dem * (ex && E === "eco" ? 1.05 : ex && E === "track" ? 1.04 : 1) * (fest ? 1.5 : 1) * half / Math.sqrt(priceF)));
    const cap = Math.max(1, Math.round(capN * O.cap * (ex && E === "notes" ? 0.93 : 1) * (fest && b.fest.double ? 1.6 : 1) * (b.cut > day ? 0.85 : 1)));
    const done = Math.min(dem, cap), turned = dem - done;
    const noshow = S.noshow ? Math.round(done * O.booked * S.noshow * (ex ? 0.4 : 1) * (0.6 + rng.random() * 0.8)) : 0;
    const cust = done - noshow;
    const bad = S.risk ? Math.round(cust * S.risk * O.risk * Math.max(0.15, 1.25 - b.q) * (0.5 + rng.random())) : 0;
    const pass = t.id === "tutoring" ? r2(clamp(0.42 + b.q * 0.45 + O.q + (ex ? 0.05 : 0), 0.2, 0.97)) : null;
    const rev = Math.round(cust * t.price * pm * priceF * O.price);
    const mat = Math.round(rev * t.mat * matF * (ex && E === "eco" ? 1.4 : 1));
    const extraC = ex && E === "remind" ? Math.round(done * O.booked * 0.5) : ex && E === "track" ? Math.round(cust * 0.6) : 0;
    const tempC = fest && b.fest.double ? Math.round(capN * t.price * 0.25) : 0;
    if (turned > Math.max(4, cust * 0.25)) b.rep = clamp(b.rep - 0.1, 0, 100);
    if (bad) b.rep = clamp(b.rep - bad * 0.08 * (ex && E === "track" ? 0.5 : 1), 0, 100);
    if (pass != null) b.rep = clamp(b.rep + (pass - 0.7) * 0.15 + (ex ? 0.03 : 0), 0, 100);
    if (ex && E === "eco") b.rep = clamp(b.rep + 0.01, 0, 100);
    b.svc = { d: day, mode: mk, dem, cap, cust, turned, noshow, bad, pass, extraC: extraC + tempC, fest };
    return { cust, rev, mat, extraC: extraC + tempC };
  }
  function bakeCard(x, b, rng) {
    const day = x.day, t = TPL[b.tpl], CC = prepCards(t);
    if (b.card || day - (b.cardD ?? b.since) < 7 || rng.random() > (SVC[t.id] ? 0.12 : 0.18)) return null;
    // minta naik gaji cuma kalau gajinya udah di bawah harga pasar buat keahliannya (biar nggak naik terus tanpa batas)
    const asker = (b.staff || []).find(o => !o.fam && o.pay < fairPay(t, o.skill) * 1.15);
    const ks = (t.id === "cafe" ? ["butter", "camp", "inspector", "art"] : SVC[t.id] ? SVC[t.id].cards.filter(o => o !== b.cardK) : ["butter", "wedding", "inspector", "festival"]).concat(asker ? ["raise"] : []);
    if (!ks.length) return null;
    const k = ks[Math.floor(rng.random() * ks.length)], s = k === "raise" ? asker : (b.staff || []).find(o => !o.fam);
    b.card = { k, d: day, sid: k === "raise" && s ? s.id : null, t: CC[k].t.replace("{s}", s ? s.name : ({ cafe: "Your barista", bakery: "Your baker", salon: "Your stylist", tutoring: "Your tutor", cleaning: "One of the cleaners", courier: "A rider" })[t.id] || "Someone") };
    b.cardD = day;
    if (SVC[t.id]) b.cardK = k;
    return b.card.t;
  }
  function bakeAnswer(home, c, b, opt, day, by) {
    const C = b.card; if (!C || !prepCards(TPL[b.tpl])[C.k].o.some(o => o[0] === opt)) return false;
    b.card = null;
    const lv = LEVELS[b.level], r = hash(b.id + C.d + opt);
    let t = "";
    const tid = TPL[b.tpl].id, ing = tid === "cafe" ? "milk" : SVC[tid] && SVC[tid].ing || "butter";
    if (C.k === "butter") { b.butter = { k: opt, until: day + 14 }; t = { switch: `Cheaper ${ing} for two weeks. Some regulars notice.`, raise: "Prices up 10% for two weeks.", absorb: `Same ${ing}, smaller profit for two weeks.` }[opt]; }
    if (C.k === "camp") {
      if (opt === "limit") { b.camp = { k: opt, until: day + 30 }; b.rep = clamp(b.rep - 2, 0, 100); t = "Two-hour limit on tables. Lunch is busier, and a few regulars grumble online."; }
      else if (opt === "socket") { b.cash -= 400; b.camp = { k: opt, until: day + 60 }; b.rep = clamp(b.rep + 2, 0, 100); t = "A long counter with plugs. The campers moved over and the tables are free again."; }
      else { b.camp = { k: opt, until: day + 30 }; b.rep = clamp(b.rep + 1, 0, 100); t = "Left the campers alone. It feels cozy, but the lunch crowd goes elsewhere."; }
    }
    if (C.k === "art") {
      if (opt === "skip") t = "Skipped the latte art contest.";
      else if (r < 0.25 + fit(c, b.tpl) * 0.6) { b.rep = clamp(b.rep + 6, 0, 100); b.buzz = day + 7; t = "Won the latte art contest! A week of curious new customers."; }
      else t = "Came fourth at the latte art contest. Fun, but nobody noticed.";
    }
    if (C.k === "wedding" && tid !== "bakery") {
      const W = tid === "salon" ? [600, "the wedding party", "The whole wedding party left glowing", "The bride's hair fell flat before the ceremony. A refund, and an awkward week."]
        : [1100, "the office tower", "The office tower sparkled by Monday", "The crew missed half the floors. A refund, and an awkward week."];
      if (opt === "no") t = `Turned down ${W[1]}.`;
      else if (r < 0.35 + fit(c, b.tpl) * 0.6) { const n = Math.round(W[0] * lv.cap); b.cash += n; b.rep = clamp(b.rep + 4, 0, 100); c.needs.mood = clamp(c.needs.mood - 6); t = `${W[2]}. +${n.toLocaleString("en")} coins.`; }
      else { b.rep = clamp(b.rep - 5, 0, 100); c.needs.mood = clamp(c.needs.mood - 12); t = W[3]; }
    }
    if (C.k === "refund") {
      if (opt === "refund") { const n = Math.round(TPL[b.tpl].price * 15); b.cash -= n; b.rep = clamp(b.rep + 1, 0, 100); t = `Gave back ${n} coins. The parent calmed down.`; }
      else if (opt === "extra") { b.cut = day + 14; if (r < 0.5 + fit(c, b.tpl) * 0.4) { b.rep = clamp(b.rep + 3, 0, 100); t = "The free extra lessons worked. The child passed the retake and the parent tells everyone."; } else t = "Gave free extra lessons. The parent is still unhappy."; }
      else if (r < 0.5) { b.rep = clamp(b.rep - 5, 0, 100); t = "Said no. The parent left an angry review online."; }
      else t = "Said no. The parent grumbled and let it go.";
    }
    if (C.k === "lost") {
      const what = tid === "courier" ? "the parcel" : "the vase";
      if (opt === "pay") { const n = Math.round(250 * lv.cap); b.cash -= n; b.rep = clamp(b.rep + 1, 0, 100); t = `Paid ${n} coins for ${what}. The customer stays loyal.`; }
      else if (r < 0.3 + (c.st.skills.charm || 0) / 250) t = `Nobody questioned the story about ${what}.`;
      else { b.rep = clamp(b.rep - 6, 0, 100); t = `The customer didn't believe the story about ${what} and told everyone.`; }
    }
    if (C.k === "wedding" && tid === "bakery") {
      if (opt === "no") t = "Turned down the wedding cake.";
      else if (r < 0.35 + fit(c, b.tpl) * 0.6) { const n = Math.round(900 * lv.cap); b.cash += n; b.rep = clamp(b.rep + 4, 0, 100); c.needs.mood = clamp(c.needs.mood - 6); t = `The wedding cake was a triumph. +${n.toLocaleString("en")} coins and the whole party asked who made it.`; }
      else { b.rep = clamp(b.rep - 5, 0, 100); c.needs.mood = clamp(c.needs.mood - 12); t = "The top tier slid on the drive over. A refund, and an awkward week."; }
    }
    if (C.k === "inspector") {
      if (opt === "clean") { b.half = day + 1; b.rep = clamp(b.rep + 2, 0, 100); t = "Closed early to scrub everything. The inspector left impressed."; }
      else if (r < 0.45 + (b.q || 0.5) * 0.5) { b.rep = clamp(b.rep + 1, 0, 100); t = "The inspector found nothing to complain about."; }
      else { b.cash -= 300; b.rep = clamp(b.rep - 5, 0, 100); t = `The inspector found ${tid === "salon" ? "dirty combs" : tid === "cafe" ? "a dirty milk jug" : "flour mites"}. A 300 coin fine and a bad week of gossip.`; }
    }
    if (C.k === "festival" && tid === "tutoring") { b.fest = { from: day + 3, to: day + 16, double: opt === "double" }; t = opt === "double" ? "Evening classes for exam season." : "Usual hours through exam season."; }
    else if (C.k === "festival" && tid === "courier") { b.fest = { from: day + 1, to: day + 5, double: opt === "double" }; t = opt === "double" ? "Temporary riders hired for the holiday rush." : "The usual team for the holiday rush."; }
    else if (C.k === "festival") { b.fest = { from: day + 1, to: day + 2, double: opt === "double" }; t = opt === "double" ? "Baking almost double for the festival." : "Baking the usual amount for the festival."; }
    if (C.k === "raise") { const s = (b.staff || []).find(o => o.id === C.sid); if (s) { if (opt === "yes") { s.pay = Math.round(s.pay * 1.12); s.mood = Math.min(100, s.mood + 20); t = `${s.name} got the raise and is beaming.`; } else { s.mood = Math.max(0, s.mood - 22); t = `${s.name} didn't get the raise and has gone quiet.`; } } }
    b.cardLast = { d: day, t, by };
    return true;
  }
  function bakeAutoAnswer(x, b) {
    const C = b.card, tr = k => x.t(k) ?? 50;
    if (!C || x.day - C.d < 2) return;
    const pick = { butter: tr("perfeksionis") > 55 ? "absorb" : tr("ambisius") > 55 ? "raise" : "switch", wedding: tr("penakut") > 55 ? "no" : "yes", inspector: tr("rajin") > 50 ? "clean" : "carry",
      festival: tr("ambisius") > 50 ? "double" : "normal", raise: tr("ramah") > 50 ? "yes" : "no", camp: tr("ramah") > 60 ? "let" : b.cash > 1500 ? "socket" : "limit", art: tr("penakut") > 55 ? "skip" : "enter",
      refund: tr("ramah") > 55 ? "refund" : tr("perfeksionis") > 55 ? "extra" : "no", lost: tr("ramah") > 45 || tr("penakut") > 55 ? "pay" : "deny" }[C.k];
    bakeAnswer(x.home, x.c, b, pick, x.day, "owner");
    if (b.cardLast) x.say(`${x.c.name} decided at ${b.name}: ${b.cardLast.t}`);
  }

  // biaya jalan fund (data, server, kantor kecil): sekitar 1% setahun dari dana kelolaan, minimal 1 koin sehari
  const fundOpex = b => Math.round(1 + Math.max(0, b.cash) * 0.00003);
  // budget riset: biaya sekarang (kelipatan sewa harian), Edge nanti
  const RND = { none: { cost: 0, grow: 0, label: "None" }, some: { cost: 0.25, grow: 0.03, label: "Some" }, heavy: { cost: 0.8, grow: 0.07, label: "Heavy" } };
  // tanpa saran: pemilik ambisius mulai riset kecil-kecilan kalau bisnisnya udah jalan dan untung
  const rndOf = (x, b) => b.rnd || ((x.t("ambisius") ?? 50) > 60 && x.day - b.since > 120 && (b.hist || []).slice(-30).reduce((a, r) => a + r[2], 0) > 0 ? "some" : "none");
  // rekam jejak: berapa tahun, rata-rata, terburuk, dan berapa tahun yang untung
  function track(b) {
    const Y = b.yrs || [], k = TPL[b.tpl].fund ? "r" : "p";
    if (!Y.length) return { n: 0 };
    const v = Y.map(o => o[k]);
    return { n: Y.length, avg: Math.round(v.reduce((a, z) => a + z, 0) / v.length * 10) / 10, worst: Math.min(...v), good: v.filter(z => z > 0).length, years: Y, fund: !!TPL[b.tpl].fund };
  }

  // ---------------------------------------------------------------- satu hari bisnis
  function day1(x, b) {
    const c = x.c, t = TPL[b.tpl], home = x.home, day = x.day, rng = seed_rng(home.id, b.id, day, "biz");
    const tr = k => x.t(k) ?? 50, f = fit(c, b.tpl), lv = LEVELS[b.level], ec = econ(day);
    // kondisi pemilik
    let cond = 0;
    if (c.needs.mood < 35) cond -= 0.08;
    if (x.has("patah_hati") || x.has("berduka")) cond -= 0.06;
    if (x.has("sakit") || x.has("dirawat")) cond -= 0.12;
    if (b.burn > day) cond -= 0.1;
    const sup = famSupplier(home, t), tier = SUPPLY[b.supply || "standard"], supB = (sup.length ? 0.05 : 0) + (t.inputs.length || t.mat > 0.15 ? tier.q : 0);
    const focus = b.focus || "steady", priceSet = b.price || "normal";
    const staff = b.staff || [], nS = staff.length, avgS = nS ? staff.reduce((s2, o) => s2 + o.skill * (0.7 + o.mood / 330), 0) / nS : 0.5;
    const staffQ = avgS * Math.min(1, nS / 8), extra = Math.max(0, nS - lv.staff), short = lv.staff ? Math.min(1, 0.6 + 0.4 * nS / lv.staff) : 1;
    // kualitas harian: bakat dan keahlian dulu, terus rajin bikin stabil, kondisi bikin goyang
    const noise = rng.gauss(0, Math.max(0.02, 0.09 - tr("rajin") / 1400));
    if (b.butter && b.butter.until > day && b.butter.k === "switch") cond -= 0.06;
    if (b.open === "6") cond -= ((x.t("rajin") ?? 50) < 45 ? 0.03 : 0);
    let q = 0.12 + 0.8 * f + (tr("rajin") - 50) / 450 + supB + (b.sig ? 0.05 : 0) + cond + staffQ * 0.08 + (focus === "quality" ? 0.06 : 0) + (b.edge || 0) / 300 + (SVC[t.id] ? SVC[t.id].opts[svcMode(b, t)].q : 0) + noise;
    q = clamp(q, 0.03, 1);
    b.q = r2(b.q == null ? q : b.q * 0.8 + q * 0.2);
    if (!t.fund) b.rep = clamp((b.rep ?? 30) + (b.q * 100 - (b.rep ?? 30)) * 0.02, 0, 100);
    let rev = 0, cost = 0, cust = 0, line = null;
    // fund: biaya jalan (data, server, kantor kecil) sekitar 2% setahun dari dana kelolaan. "rent" di sini dua kali biaya itu, buat ngitung budget riset
    const rent = t.fund ? 2 * fundOpex(b) : Math.round((t.cap / 120) * lv.rent), wages = staff.reduce((s2, o) => s2 + payOf(home, o), 0);
    let matC = 0, loanC = 0, conR = 0, fpnl = 0;
    if (t.fund) {
      // quant fund: dagang di bursa NPC. Logika bikin modelnya bagus, ambisius pakai leverage, impulsif panik waktu jatuh
      const mr = index(day), lev = 1 + tr("ambisius") / 100 + (focus === "growth" ? 0.5 : focus === "quality" ? -0.3 : 0);
      // gaya (ceruk) nentuin seberapa ikut pasar. Edge kebagi kalau banyak fund lain pakai gaya yang sama
      const M = compete(home, b, day), sty = FUND_STYLE[M.niche] || FUND_STYLE.momentum, avgC = M.n0 * (0.75 / 3 + 0.25 * 2 / 3);
      b.mkt = { d: day, comp: Math.round(M.comp * 100) / 100, shut: M.shut };
      const crowdF = (1 + 0.6 * avgC) / (1 + 0.6 * M.comp);
      const alpha = ((f - 0.48) * 0.0012 + staffQ * 0.0006 + (b.edge || 0) / 100 * 0.0007) * sty.a * (crowdF > 1 ? Math.min(1.5, crowdF) : crowdF), luck = mr * (0.3 + lev * 0.4) * sty.beta + rng.gauss(0, 0.0028 * lev * (0.5 + sty.beta / 2)) + crashDrift(day) * sty.beta * lev;
      let ret = luck + alpha + cond * 0.002;
      b.split = { d: day, luck: r2(luck * 10000) / 100, edge: r2(alpha * 10000) / 100 };
      if (mr < -0.004 && tr("impulsif") > 55) ret -= 0.002 * (tr("impulsif") - 50) / 50;
      const pnl = Math.round(b.cash * ret); fpnl = pnl;
      // b.cash = dana kelolaan (uang sendiri + investor NPC), b.mine = bagian pemilik. Investor masuk kalau kinerjanya bagus.
      const h90 = (b.hist || []).slice(-90), r90 = h90.length ? h90.reduce((s2, r) => s2 + r[2], 0) / Math.max(1, b.cash) : 0;
      b.rep = clamp(50 + r90 * 400, 0, 100);
      b.mine = (b.mine ?? t.cap) + Math.round(pnl * (b.mine ?? t.cap) / Math.max(1, b.cash));
      // uang investor ngikutin rekam jejak: belum setahun cuma uang sendiri, makin konsisten makin deras
      const T = track(b), trust = T.n ? Math.min(1, T.n / 3) * (T.good / T.n) : 0, f0 = 0.002 * (b.rep - 45) / 55;
      // fund NPC yang tumbang pas krisis ninggalin investor yang nyari tempat baru
      const flow = Math.round(b.cash * (f0 > 0 ? f0 * Math.min(1, trust + (b.crises || 0) * 0.1) * (1 + 0.4 * M.shut) : f0));
      // pemilik dapat fee kelola ~2% setahun dari dana investor, plus 20% dari untung harian mereka
      // fee kinerja cuma dari untung di atas rekor NAV (high-water mark), jadi investor nggak bayar fee buat sekadar balik modal
      const outside = Math.max(0, b.cash - b.mine), cash0 = Math.max(1, b.cash), opexDay = Math.round(rent / 2) + wages, navP = b.nav || 1, hwn = Math.max(b.hwn || 1, 1);
      const above = Math.max(0, (navP * (1 + (pnl - opexDay) / cash0) - hwn) / navP * cash0);
      const fee = Math.round(outside * 0.00006 + 0.2 * above * outside / cash0);
      b.cash = Math.max(0, b.cash + flow);
      rev = Math.max(0, pnl); cost = Math.max(0, -pnl) + opexDay;
      b.fee = fee;
      // return bersih buat investor: setelah fee pemilik dan biaya jalan (kantor, gaji). Ini yang masuk NAV dan rekam jejak tahunan
      b.ret = r2((pnl - fee - opexDay) / cash0 * 100);
    } else if (t.hits) {
      // startup dan studio game: lama nggak menghasilkan, lalu bisa meledak (atau habis modal)
      const ship = b.ship || (b.ship = { at: b.since + 30 + Math.floor(rng.random() * 40), users: 0, hit: null });
      if (day >= ship.at) {
        if (ship.hit == null) {
          ship.hit = r2(clamp(f * 1.3 + (tr("kreatif") - 50) / 200 + rng.gauss(0, 0.35) - 0.25, -0.5, 1.5));
          line = ship.hit > 0.6 ? `${t.prod[0] ? b.prodName : "The launch"} takes off! The whole town is talking about it.` : ship.hit > 0.2 ? `${b.prodName} launches to a warm, small crowd.` : `${b.prodName} launches to… crickets. ${c.name} stares at the numbers.`;
          b.ev = { d: day, t: line, k: ship.hit > 0.6 ? "viral" : ship.hit > 0.2 ? "launch" : "flop" };
        }
        if (day === ship.at) ship.users = Math.round(Math.max(0, ship.hit + 0.15) * 900 * lv.cap * (0.8 + staffQ));
        const grow = ship.hit * 0.025 * (0.6 + b.q) * ec * (focus === "growth" ? 1.3 : 1);
        ship.users = Math.max(0, Math.min(400000 * lv.cap, Math.round(ship.users * (1 + grow - 0.01) + Math.max(0, ship.hit) * 12 * lv.cap)));
        cust = ship.users;
        rev = Math.round(cust * 0.15 * (priceSet === "premium" ? 1.5 : priceSet === "budget" ? 0.6 : 1) * (priceSet === "premium" ? 0.8 : 1));
        if (ship.users < 40 && day > ship.at + 120 && rng.random() < 0.01) { ship.at = day + 45; ship.hit = null; ship.users = 0; b.prodName = pickProd(t, b, day + 1); line = `${c.name} scraps the old app and starts on ${b.prodName}.`; }
      }
      matC = Math.round(rev * t.mat);
      cost = (day < ship.at ? Math.round(rent * 0.5) : rent) + wages + matC + Math.round(t.cap / 400);
    } else {
      const pm = { budget: 0.8, normal: 1, premium: 1.35 }[priceSet];
      const pd = { budget: 1.25, normal: 1, premium: 0.45 + 0.6 * b.q }[priceSet];
      const cl = t.b2b ? clients(home, t, day) : 0;
      // pasar dibagi: yang lebih kuat atau di ceruk yang lebih sepi dapat bagian lebih besar
      const M = compete(home, b, day);
      b.mkt = { d: day, comp: Math.round(M.comp * 100) / 100, shut: M.shut };
      let base = t.b2b ? t.base * 2 * cl / (cl + 8) * Math.sqrt((1 + 0.5 * M.n0) / (1 + M.comp)) : t.base * (2 / (1 + M.comp));
      if (t.broker) base *= 1 + Math.abs(index(day)) * 40;
      const charm = c.st.skills.charm / 100, appeal = (0.3 + b.q * 0.95) * (0.55 + b.rep / 110) * pd * (0.85 + tr("ramah") / 350 + charm * 0.15)
        * (focus === "growth" ? 1.15 : 1) * (b.buzz > day ? 1.6 : 1) * (b.rival > day ? 0.75 : 1);
      const capN = Math.round((t.b2b ? t.base * 1.2 : t.base * 1.4) * lv.cap * (1 + extra * 0.08) * short);
      b.capN = capN;
      const matF = (sup.length ? 0.88 : 1) * (focus === "quality" ? 1.15 : 1) * tier.mat * (b.butter && b.butter.until > day && b.butter.k === "absorb" ? 1.3 : 1);
      if (t.id === "cafe") {
        // café: kopi dibikin pas dipesan (antrean kalau barista kurang), makanan disiapin pagi kayak toko roti
        const S = SEAT[b.seat || "mix"], fest = b.fest && day >= b.fest.from && day <= b.fest.to ? 1.5 : 1, half = b.half === day ? 0.5 : 1;
        const priceF = b.butter && b.butter.until > day && b.butter.k === "raise" ? 1.1 : 1, wk = day % 7, music = b.music && (wk === 4 || wk === 5);
        const camp = b.camp && b.camp.until > day ? { limit: 1.05, socket: 1.04, let: 0.94 }[b.camp.k] : 1;
        const dem = Math.max(0, Math.round(base * lv.cap * 0.55 * appeal * ec * trend(t.id, day) * (0.85 + rng.random() * 0.3) * S.dem * camp * (music ? 1.35 : 1) * fest * half / Math.sqrt(priceF)));
        const cups = Math.min(dem, capN), walk = dem - cups;
        const R = bakeDay(x, b, t, cups * S.food / 1.4, capN * 0.5, pm * priceF, matF, rng, fest > 1);
        const cRev = Math.round(cups * t.price * pm * priceF * S.spend * 0.66), cMat = Math.round(cRev * t.mat * matF * 0.8), musicC = music ? Math.round(40 * lv.cap) : 0;
        if (music) b.rep = clamp(b.rep + 0.1, 0, 100);
        if (walk > Math.max(3, cups * 0.15)) b.rep = clamp(b.rep - 0.3, 0, 100);
        Object.assign(b.bake, { cups, walk, music: musicC, food: R.cust });
        cust = cups; rev = R.rev + cRev; matC = R.mat + cMat;
        cost = rent + wages + matC + musicC;
      } else if (t.id === "bakery") {
        // toko roti: yang dipanggang pagi ini vs yang dicari pembeli, per jenis roti
        const openF = { "6": 1.15, "7": 1, "9": 0.84 }[b.open || "7"], fest = b.fest && day >= b.fest.from && day <= b.fest.to ? 1.8 : 1, half = b.half === day ? 0.5 : 1;
        const priceF = b.butter && b.butter.until > day && b.butter.k === "raise" ? 1.1 : 1;
        const dem = Math.max(0, Math.round(base * lv.cap * 0.55 * appeal * ec * trend(t.id, day) * (0.85 + rng.random() * 0.3) * openF * fest * half / Math.sqrt(priceF)));
        const R = bakeDay(x, b, t, dem, capN, pm * priceF, matF, rng, fest > 1);
        cust = R.cust; rev = R.rev; matC = R.mat;
        cost = rent + wages + matC;
      } else if (SVC[t.id]) {
        // jasa: cara kerja (mode) geser kapasitas, harga, mutu dan risiko masalah
        const R = svcDay(x, b, t, base * lv.cap * 0.55 * appeal * ec * trend(t.id, day) * (0.85 + rng.random() * 0.3), capN, pm, matF, rng);
        cust = R.cust; rev = R.rev; matC = R.mat;
        if (b.contract && b.contract.until > day) { conR = b.contract.per; rev += conR; } else if (b.contract) b.contract = null;
        cost = rent + wages + matC + R.extraC + (focus === "growth" ? Math.round(rev * 0.08) : 0);
      } else {
      cust = Math.max(0, Math.min(capN, Math.round(base * lv.cap * 0.55 * appeal * ec * trend(t.id, day) * (0.85 + rng.random() * 0.3))));
      rev = Math.round(cust * t.price * pm);
      if (b.contract && b.contract.until > day) { conR = b.contract.per; rev += conR; } else if (b.contract) b.contract = null;
      matC = Math.round(rev * t.mat * matF);
      cost = rent + wages + matC + (focus === "growth" ? Math.round(rev * 0.08) : 0);
      }
      // pemasok dari keluarga sendiri ikut dapat pesanan
      if (!b.demo) for (const s of sup) s.side = (s.side || 0) + Math.round(rev * t.mat * matF * 0.3);
    }
    if (b.side) { rev += b.side; b.side = 0; }
    if (b.loan && b.loan.left > 0 && !(t.hits && b.ship && day < b.ship.at + 60)) { const p = Math.min(b.loan.left, b.loan.pay); cost += p; loanC = p; b.loan.left -= p; if (b.loan.left <= 0) { b.loan = null; line = line || `${b.name} pays off its bank loan. 🎉`; } }
    // keunggulan (Edge): numpuk pelan dari pengalaman, skill pemilik, staf jago, dan budget riset
    const rnd = rndOf(x, b), rndC = Math.round(rent * RND[rnd].cost);
    cost += rndC;
    const E0 = b.edge || 0;
    b.edge = Math.round(clamp(E0 + (0.012 + 0.03 * f + 0.02 * staffQ + RND[rnd].grow) * (1 - E0 / 105) - (rnd === "none" ? E0 * 0.0009 : 0), 0, 100) * 1000) / 1000;
    const profit = rev - cost;
    // rekam jejak tahunan: untung (atau return untuk fund) tiap tahun sejak buka
    b.ytd = (b.ytd || 0) + profit;
    if (t.fund) {
      b.nav = Math.round((b.nav || 1) * (1 + (b.ret || 0) / 100) * 1e6) / 1e6;
      b.peak = Math.max(b.peak || 1, b.nav);
      b.hwn = Math.max(b.hwn || 1, b.nav);
      // margin call: leverage tinggi + turun dalam = dipaksa jual murah, investor kabur
      const lev = 1 + tr("ambisius") / 100 + (focus === "growth" ? 0.5 : focus === "quality" ? -0.3 : 0);
      if (lev >= 1.6 && b.nav < b.peak * 0.75 && !(b.mc > day - 120)) {
        const out0 = Math.max(0, b.cash - b.mine), pull = Math.round(out0 * 0.5), hit = Math.round(b.mine * 0.12);
        b.cash -= pull + hit; b.mine -= hit; b.mc = day; b.peak = b.nav;
        line = line || `Margin call at ${b.name}. ${c.name} has to sell at the worst time, and investors pull ${pull.toLocaleString("en")} coins.`;
        b.ev = { d: day, t: line, k: "margin" };
      }
    }
    // lolos krisis: dicatat, investor dan pelanggan lebih percaya
    if (recession(day - 1) && !recession(day) && day - b.since > 60) {
      b.crises = (b.crises || 0) + 1;
      line = line || `${b.name} made it through the recession. Not everyone in town did.`;
    }
    if (day > b.since && (day - b.since) % 365 === 0) {
      (b.yrs ||= []).push({ y: b.yrs.length + 1, p: Math.round(b.ytd), r: t.fund ? Math.round(((b.nav || 1) / (b.nav0 || 1) - 1) * 1000) / 10 : null });
      if (b.yrs.length > 12) b.yrs.shift();
      b.ytd = 0; b.nav0 = b.nav;
    }
    // pemilik ambil sebagian untung buat hidup; rugi ditutup dari kas, lalu dompetnya sendiri
    let draw = 0;
    // fund: fee dari investor masuk ke pemilik. Biaya jalan fund (kantor, data, gaji, riset) dibayar dari dana kelolaan dan ditanggung
    // semua investor sesuai porsinya, kayak expense ratio. Dompet pemilik nggak pernah dipotong buat nutup hari sepi
    if (t.fund) {
      const opx = fpnl - profit, fee = Math.min(Math.max(0, b.cash + fpnl - b.mine), b.fee || 0);
      const total = Math.max(1, b.cash + fpnl - fee);
      b.mine = Math.max(0, b.mine - Math.round(opx * b.mine / total));
      b.cash = Math.max(0, b.cash + fpnl - fee - opx);
      draw = fee;
    }
    else {
      b.cash += profit;
      if (b.cash > t.cap * 0.4 && profit > 0) { const d0 = Math.round(profit * (0.45 + (100 - tr("rajin")) / 400)); b.cash -= d0; draw = Math.round(d0 * (b.equity ?? 1)); }
    }
    if (b.cash < 0) {
      const take = Math.min(c.st.wallet, -b.cash);
      c.st.wallet -= take; b.cash += take;
    }
    c.st.wallet += draw;
    if (!b.demo) c.st.drawAvg = Math.round(((c.st.drawAvg ?? draw) * 0.97 + draw * 0.03) * 100) / 100;  // buat pensiun pemilik
    b.debt = b.cash < 0 ? (b.debt || 0) + 1 : 0;
    b.today = { d: day, rev, cost, profit, cust, draw, rent: t.fund ? Math.round(rent / 2) : rent, wages, mat: matC, loan: loanC, con: conR, rnd: rndC };
    (b.hist ||= []).push([day, rev, profit, cust]);
    if (b.hist.length > 90) b.hist.splice(0, b.hist.length - 90);
    b.total = (b.total || 0) + profit;
    b.best = Math.max(b.best || 0, profit);
    // owning it builds the skills it needs
    for (const [k, v] of Object.entries(t.w)) c.st.skills[k] = Math.min(100, Math.round((c.st.skills[k] + 0.07 * v * Math.max(0.1, 1 - c.st.skills[k] / 120)) * 1000) / 1000);
    return line;
  }

  function pickProd(t, b, day) {
    const p = t.prod[Math.floor(hash(b.id + "prod" + day) * t.prod.length)] || "the house special";
    return p;
  }
  function bizName(t, c, day, home) {
    const r = hash(home.id + c.id + t.id + day);
    const pre = r < 0.45 ? `${c.name}'s` : NAME_A[Math.floor(r * 1000) % NAME_A.length];
    const tail = TAILS[t.id];
    return `${pre} ${tail}`;
  }

  // ---------------------------------------------------------------- kejadian
  function events(x, b) {
    const c = x.c, t = TPL[b.tpl], day = x.day, rng = seed_rng(x.home.id, b.id, day, "biz-ev"), tr = k => x.t(k) ?? 50;
    const say = (k, s, drama = "sedang") => { b.ev = { d: day, t: s, k }; x.say(s); x.drama = drama; return s; };
    if (!b.sig && day - b.since > 20 && !t.fund && !t.hits && rng.random() < 0.004 + fit(c, b.tpl) * 0.01 + tr("kreatif") / 9000) {
      b.sig = b.prodName || pickProd(t, b, day);
      x.remember(`Created ${b.sig} at ${b.name}.`);
      return say("sig", `${c.name} perfects a new signature at ${b.name}: ${b.sig}. Regulars start asking for it by name.`);
    }
    // pesaing yang tumbang pas krisis
    if (!t.hits && crisisFrac(day) > crisisFrac(day - 1)) {
      const S1 = rivalList(t.id, day).shut, S0 = rivalList(t.id, day - 1).shut, o = S1.find(o => !S0.some(p => p.i === o.i));
      if (o && S1.length > S0.length) return say("shut", t.fund ? `${rivalName(x.home, o)} shuts down after the crash. Its investors are looking for a new home.` : `${rivalName(x.home, o)} closes its doors in the downturn. Some of its regulars start coming to ${b.name}.`);
    }
    if (CARDED(t.id)) { bakeAutoAnswer(x, b); const ct = bakeCard(x, b, rng); if (ct) return say("card", `${b.name}: ${ct}`); }
    const r = rng.random();
    if (t.fund) {
      if (index(day) < -0.006 && rng.random() < 0.5) return say("crash", tr("impulsif") > 55 ? `The market drops hard. ${c.name} panics and sells near the bottom.` : `The market drops hard. ${c.name} sticks to the model and waits it out.`);
      if (b.ret > 0.9 && rng.random() < 0.3) return say("record", `${b.name} has one of its best days ever: up ${b.ret}%.`);
      return null;
    }
    if (r < 0.002 && b.rep > 45) { b.buzz = day + 6; b.rep = Math.min(100, b.rep + 6); return say("viral", `A post about ${b.sig || b.name} goes viral on Chirp. There's a line out the door.`); }
    if (r < 0.0035) { b.rep = Math.max(0, b.rep - 8); return say("review", `A harsh review of ${b.name} makes the rounds. ${c.name} reads it three times.`, "kecil"); }
    if (r < 0.005) { const n = Math.round(t.cap * (0.04 + LEVELS[b.level].cap * 0.02)); b.cash -= n; return say("broke", `${t.b2b ? "A key machine" : "The main equipment"} at ${b.name} breaks down. Repairs cost ${n.toLocaleString("en")} coins.`, "kecil"); }
    if (r < 0.0065 && t.b2b) { const n = Math.round(t.price * (6 + rng.random() * 10) * LEVELS[b.level].cap); b.cash += n; return say("order", `${b.name} lands a big order worth ${n.toLocaleString("en")} coins.`); }
    if (r < 0.0075 && !t.b2b) { const n = Math.round(t.price * t.base * (0.8 + rng.random())); b.cash += n; return say("order", `The town festival orders from ${b.name}. ${n.toLocaleString("en")} coins in one weekend.`); }
    if (r < 0.009) { b.rival = day + 60; return say("rival", `A new ${t.label.toLowerCase()} opens down the street from ${b.name}.`, "kecil"); }
    if (r < 0.011 && b.rep > 70) { b.rep = Math.min(100, b.rep + 4); x.remember(`${b.name} was featured in the Old Town magazine.`); return say("press", `The Old Town magazine features ${b.name}. ${c.name} buys ten copies.`); }
    if (b.level >= 2 && tr("ambisius") > 60 && r < 0.013 && !(b.burn > day)) { b.burn = day + 20; x.need("mood", -15); return say("burnout", `${c.name} has been working every night at ${b.name}. They're burning out.`); }
    return null;
  }

  // ---------------------------------------------------------------- keputusan makhluk sendiri
  function decide(x, b) {
    const c = x.c, t = TPL[b.tpl], day = x.day, rng = seed_rng(x.home.id, b.id, day, "biz-mau"), tr = k => x.t(k) ?? 50;
    // investor NPC: startup dan studio game dapat tawaran modal ventura, bisnis biasa yang ramai kadang dilirik angel investor
    if (!b.offer && !t.fund && (b.rounds || 0) < 3) {
      const users = b.ship ? b.ship.users : 0, T = track(b), hot = t.hits ? (b.ship && b.ship.hit != null ? b.ship.hit > 0.3 : day - b.since > 15) : b.level >= 1 && b.rep > 62 && T.n >= 1 && (T.good + (b.crises || 0)) / T.n >= 0.5;
      if (hot && rng.random() < (t.hits ? 0.012 : 0.003)) {
        const amt = Math.round(t.cap * (t.hits ? 1.2 + (b.rounds || 0) * 1.5 + users / 4000 : LEVELS[b.level].cap * 0.7 * (1 + 0.25 * Math.min(4, T.good || 0))) / 100) * 100;
        const pct = r2(clamp(0.12 + rng.random() * 0.13 + (t.hits && !users ? 0.05 : 0), 0.08, 0.3));
        const who = (t.hits ? ["Acorn Ventures", "Burrow Capital", "Owl Seed Fund"] : ["an angel investor", "Mrs. Thistle, a retired banker", "the Old Town Growth Club"])[Math.floor(rng.random() * 3)];
        b.offer = { amt, pct, who, d: day };
        x.say(`${who.charAt(0).toUpperCase() + who.slice(1)} offers ${amt.toLocaleString("en")} coins for ${Math.round(pct * 100)}% of ${b.name}.`);
        x.drama = "sedang";
      }
    }
    if (b.offer && day - b.offer.d >= 7) {
      // nggak ada saran: yang ambisius terima, yang hati-hati tolak
      const yes = hash(b.id + day + "inv") < 0.35 + (tr("ambisius") - 50) / 150 - (tr("penakut") - 50) / 200 + (b.cash < t.cap * 0.2 ? 0.3 : 0);
      invest(x.home, b, yes, day);
      x.say(yes ? `${c.name} takes the money. ${b.name} now has investors.` : `${c.name} turns the investors down. "I want to keep it ours."`);
    }
    if (b.wish) return;
    // ekspansi: kalau kasnya cukup, reputasinya bagus, dan dia ambisius
    const nx = LEVELS[b.level + 1];
    if (!t.fund && nx && b.cash >= Math.max(3000, t.cap) * nx.up && b.rep >= 50 + b.level * 8 && rng.random() < 0.004 + tr("ambisius") / 5000 - tr("penakut") / 12000) {
      b.wish = { k: "expand", d: day, cost: Math.round(Math.max(3000, t.cap) * nx.up) };
      x.say(`${c.name} wants to grow ${b.name} into a ${nx.label.toLowerCase()}. It would cost ${b.wish.cost.toLocaleString("en")} coins from the business.`);
      return;
    }
    // rugi terus: makhluknya mikir buat tutup
    const h = b.hist || [], last = h.slice(-45);
    const loss = t.fund ? b.mine < t.cap * 0.6 : last.length >= 45 && last.reduce((s, r) => s + r[2], 0) < 0 && !(t.hits && day < (b.ship ? b.ship.at : day) + 90);
    if ((loss && rng.random() < 0.03 + tr("penakut") / 3000) || b.debt > 20) {
      b.wish = { k: "close", d: day };
      x.say(`${b.name} keeps losing money. ${c.name} is thinking about closing it.`);
    }
  }

  function invest(home, b, yes, day) {
    const o = b.offer; b.offer = null;
    if (!o || !yes) return !!o;
    b.cash += o.amt; b.equity = r2((b.equity ?? 1) * (1 - o.pct)); b.rounds = (b.rounds || 0) + 1;
    (b.investors ||= []).push({ who: o.who, amt: o.amt, pct: o.pct, d: day });
    return true;
  }
  function bank(b, day) {
    const t = TPL[b.tpl], h = (b.hist || []).slice(-30), rev30 = h.reduce((s2, r) => s2 + r[1], 0), p30 = h.reduce((s2, r) => s2 + r[2], 0);
    const max = Math.round(Math.max(t.cap * 0.5, rev30 * 1.2 + Math.max(0, p30)) * clamp((b.rep || 30) / 55, 0.4, 1.4) / 100) * 100;
    return { max: t.fund ? 0 : max, offers: LOANS.map((L, i) => ({ i, ...L, amt: max, total: Math.round(max * (1 + L.rate)), pay: Math.max(1, Math.round(max * (1 + L.rate) / L.term)) })) };
  }
  function pickTemplate(c, home, day) {
    const opts = TPLS.map(t => ({ t, f: fit(c, t.id), s: fit(c, t.id) * (0.85 + hash(c.id + t.id + Math.floor(day / 60)) * 0.3) * (t.b2b ? 1 : 1.05) }))
      .filter(o => !active(home).some(b => b.tpl === o.t.id) && isOpen(c, home, o.t.id)).sort((a, b) => b.s - a.s);
    return opts[0] ? opts[0].t : null;
  }
  function wantsOwn(x) {
    const c = x.c, st = c.st, day = x.day, tr = k => x.t(k) ?? 50;
    if (!grown(c, day) || ownerBiz(x.home, c.id) || st.bizWish || (st.bizCool || 0) > day) return;
    if (c.age(day) < 300 || st.wallet < 300) return;
    const rng = seed_rng(x.home.id, c.id, day, "biz-buka");
    const p = 0.003 + Math.max(0, tr("ambisius") - 45) / 20000 + (st.job ? 0 : 0.0015) + tr("impulsif") / 80000 - tr("penakut") / 50000;
    if (rng.random() >= p) return;
    const t = pickTemplate(c, x.home, day);
    if (!t || fit(c, t.id) < 0.36) return;
    st.bizWish = { tpl: t.id, d: day, need: t.cap };
    x.say(`${c.name} wants to open a ${t.label.toLowerCase()}. Starting it takes ${t.cap.toLocaleString("en")} coins${st.wallet < t.cap ? `, and ${c.name} has ${Math.round(st.wallet).toLocaleString("en")}` : ""}.`);
    x.drama = "sedang";
  }

  // ---------------------------------------------------------------- buka, tutup, wariskan
  function familyChip(home, c, need, day) {
    // anggota keluarga lain (yang dewasa) urunan, yang paling kaya duluan
    const others = home.members.filter(m => m !== c && m.alive(day) && m.st && !("keluar" in m.info) && m.st.wallet > 0 && ["dewasa", "tua"].includes(phase_of(m.age(day)))).sort((a, b) => b.st.wallet - a.st.wallet);
    const total = others.reduce((s, m) => s + m.st.wallet, 0);
    if (total < need) return false;
    let left = need;
    for (const m of others) { const k = Math.min(m.st.wallet, left); m.st.wallet -= k; left -= k; if (left <= 0) break; }
    return true;
  }
  function open(home, c, tplId, day, via) {
    const t = TPL[tplId];
    if (!t || ownerBiz(home, c.id) || active(home).some(b => b.tpl === tplId)) return null;
    const own = Math.min(c.st.wallet, t.cap), short = t.cap - own;
    let loan = null;
    if (short > 0 && via === "loan" && t.fund) return null;
    if (short > 0 && via === "loan") loan = { left: Math.round(short * 1.15), pay: Math.max(1, Math.round(short * 1.15 / 240)), from: day, amt: short, term: 240, rate: 0.15 };
    else if (short > 0 && !(via === "fund" && familyChip(home, c, short, day))) return null;
    c.st.wallet -= own;
    const S = B(home), id = "b" + (++S.seq);
    const b = { id, tpl: tplId, owner: c.id, founder: c.name, name: bizName(t, c, day, home), since: day, level: 0, cash: t.fund ? t.cap : Math.round(t.cap * (t.hits ? 0.9 : 0.25)), hwm: t.fund ? t.cap : null,
      rep: 30, q: null, focus: "steady", price: "normal", supply: "standard", staff: [], sseq: 0, equity: 1, owners: [[c.id, c.name, day]], via };
    b.prodName = pickProd(t, b, day);
    if (loan) b.loan = loan;
    if (t.fund) { b.mine = t.cap; b.cash = t.cap + Math.round(t.cap * (1 + fit(c, tplId) * 6)); }
    S.list.push(b);
    delete c.st.bizWish;
    setOwnerJob(c, b, day);
    const x = new Ctx(c, day, seed_rng(c.id, day, "biz-open"), home, true);
    x.drama = "besar";
    ST.achieve(x, "biz_open", `Opened ${b.name}.`);
    return b;
  }
  function setOwnerJob(c, b, day) {
    const st = c.st;
    st.job = { id: "owner", level: TPL[b.tpl].fund ? lvlOf(b) : b.level, since: day, co: null, biz: b.id };
    if (!st.work || st.work.biz !== b.id) st.work = { biz: b.id, role: "Owner", from: day };
    st.next_review = null; st.next_comp = null;
    c.info.kerja = ST.title(st.job); c.info.mulai_kerja = day;
  }
  function close(home, b, day, why) {
    const c = home.get(b.owner), t = TPL[b.tpl];
    // utang bank dilunasi dulu dari hasil jual; sisanya baru ke pemilik
    let sale = Math.max(0, Math.round((t.fund ? b.mine : b.cash + t.cap * LEVELS[b.level].up * 0.25 * (b.rep / 100)) - (b.loan && !t.fund ? b.loan.left : 0)));
    b.loan = null;
    b.closed = day; b.why = why; b.post = null; b.offer = null;
    for (const s of (b.staff || []).slice()) if (s.fam) dropStaff(home, b, s, day, why === "sold" ? "Business sold" : "Business closed");
    if (c) leaveWork(c, b, day, "Owner", why);
    const sale0 = sale; sale = Math.round(sale0 * (b.equity ?? 1));
    if (c && c.st) {
      c.st.wallet += sale;
      if (c.st.job && c.st.job.biz === b.id) { c.st.job = null; delete c.info.kerja; c.st.ready_since = day; c.st.retry_after = day + 10; }
      c.st.bizCool = day + 120;
    }
    return sale;
  }
  // pewaris: anak atau anggota keluarga dewasa yang mau dan cocok. Kalau nggak ada, bisnisnya dijual.
  function passOn(home, b, day, from) {
    const cands = home.members.filter(m => m.id !== b.owner && grown(m, day + 1) && !ownerBiz(home, m.id))
      .map(m => ({ m, f: fit(m, b.tpl), want: hash(home.id + b.id + m.id + "mau") < 0.25 + (m.traits.ambisius ?? 50) / 250 + fit(m, b.tpl) * 0.5 }))
      .filter(o => o.want).sort((a, b2) => b2.f - a.f + (home.children_of(from).includes(b2.m) ? 0.1 : 0) - (home.children_of(from).includes(a.m) ? 0.1 : 0));
    const h = cands[0];
    if (!h) return { sold: close(home, b, day, "sold") };
    leaveWork(from, b, day, "Owner", "Handed over");
    const was = (b.staff || []).find(s => s.fam === h.m.id); if (was) b.staff = b.staff.filter(s => s !== was);
    b.owner = h.m.id; b.owners.push([h.m.id, h.m.name, day]); b.wish = null;
    b.edge = Math.round((b.edge || 0) * 0.8 * 1000) / 1000;
    setOwnerJob(h.m, b, day);
    const x = new Ctx(h.m, day, seed_rng(h.m.id, day, "biz-waris"), home, true);
    x.drama = "besar";
    ST.achieve(x, "biz_heir_" + b.id, `Took over ${b.name} from ${from.name}.`);
    return { heir: h.m, fit: h.f };
  }


  // ---------------------------------------------------------------- syarat rahasia buka bisnis
  // Sama untuk semua pemain dan tidak pernah ditampilkan. Bisnis muncul di Ventures begitu salah satu jalannya terpenuhi.
  const STARTER = ["bakery", "cafe", "cleaning", "courier", "salon", "farm"];
  const M = 30, YR = 365;
  function jobDays(c, ind, day, minLevel = 0) {
    let n = 0;
    for (const h of c.st.history || []) if (h.ind === ind && h.level >= minLevel) n += (h.to ?? day) - h.from;
    return n;
  }
  const jobLevel = (c, ind) => Math.max(-1, ...(c.st.history || []).filter(h => h.ind === ind).map(h => h.level));
  function ownDays(home, c, pred, day) {
    let n = 0;
    for (const b of B(home).list) {
      if (!pred(b)) continue;
      b.owners.forEach((o, i) => { if (o[0] !== c.id) return; const end = b.owners[i + 1] ? b.owners[i + 1][2] : b.closed ?? day; n += Math.max(0, end - o[2]); });
    }
    return n;
  }
  function staffDays(home, c, pred, day) {
    let n = 0;
    for (const a of c.st.alumni || []) if (pred(a.tpl)) n += a.to - a.from;
    const j = c.st.job;
    if (j && j.id === "staff") { const b = B(home).list.find(o => o.id === j.biz); if (b && pred(b.tpl)) n += day - j.since; }
    return n;
  }
  const famHas = (home, tpl) => active(home).some(b => b.tpl === tpl);
  const sk = (c, k) => c.st.skills[k];
  const REQ = {
    dairy: (c, h, d) => ownDays(h, c, b => b.tpl === "farm", d) >= 6 * M || (sk(c, "fitness") >= 55 && famHas(h, "farm")),
    coffee: (c, h, d) => (ownDays(h, c, b => b.tpl === "cafe", d) + staffDays(h, c, t => t === "cafe", d)) >= 6 * M && c.st.wallet >= 3000,
    mill: (c, h, d) => famHas(h, "farm") && sk(c, "logic") >= 45,
    weaver: (c, h, d) => jobDays(c, "designer", d) >= 3 * M || ownDays(h, c, b => b.tpl === "boutique", d) > 0,
    printer: (c, h, d) => jobDays(c, "designer", d) + jobDays(c, "office", d) >= 4 * M,
    furniture: (c, h, d) => staffDays(h, c, t => TPL[t] && TPL[t].cat === "make", d) >= 6 * M || (sk(c, "creativity") >= 60 && sk(c, "fitness") >= 50),
    wholesale: (c, h, d) => B(h).list.some(b => TPL[b.tpl].cat === "shop" && b.level >= 1 && b.owners.some(o => o[0] === c.id)) || (jobDays(c, "office", d) >= 6 * M && c.st.wallet >= 6000),
    agency: (c, h, d) => jobDays(c, "designer", d) + jobDays(c, "influencer", d) >= 4 * M,
    accounting: (c, h, d) => jobLevel(c, "office") >= 1 && sk(c, "logic") >= 60,
    softhouse: (c, h, d) => jobDays(c, "software", d) >= 6 * M,
    recruit: (c, h, d) => (c.st.hiredN || 0) >= 5 || (sk(c, "charm") >= 65 && jobDays(c, "office", d) >= 4 * M),
    clinic: (c, h, d) => (jobDays(c, "nurse", d) >= 4 * M && sk(c, "logic") >= 50) || jobDays(c, "doctor", d) >= 2 * M || !!(c.st.ward && (c.st.ward.job || "nurse") === "nurse" && c.st.ward.mates.some(m => m.role === "mentor" && m.rel >= 80)),
    gym: (c, h, d) => jobDays(c, "athlete", d) > 0 || sk(c, "fitness") >= 70,
    tutoring: (c, h, d) => jobDays(c, "teacher", d) >= 3 * M || (sk(c, "logic") >= 60 && !!c.info.sarjana),
    garage: (c, h, d) => staffDays(h, c, t => t === "courier", d) >= 3 * M || (sk(c, "logic") >= 55 && sk(c, "fitness") >= 50),
    boutique: (c, h, d) => (ownDays(h, c, b => b.tpl === "salon" || b.tpl === "cafe", d) >= 6 * M && sk(c, "creativity") >= 60) || jobLevel(c, "influencer") >= 1,
    bookshop: (c, h, d) => jobDays(c, "teacher", d) + jobDays(c, "office", d) >= 3 * M && sk(c, "logic") >= 50,
    music: (c, h, d) => c.st.ach.some(a => a.id.startsWith("prize_art_")) || sk(c, "creativity") >= 75,
    photo: (c, h, d) => jobDays(c, "designer", d) + jobDays(c, "influencer", d) >= 2 * M || sk(c, "creativity") >= 60,
    gamedev: (c, h, d) => (jobDays(c, "software", d) > 0 && jobDays(c, "designer", d) > 0) || ownDays(h, c, b => b.tpl === "softhouse", d) > 0,
    startup: (c, h, d) => jobLevel(c, "software") >= 2 || jobDays(c, "founder", d) > 0,
    broker: (c, h, d) => (jobDays(c, "office", d) >= YR && sk(c, "charm") >= 55) || jobDays(c, "quant", d) >= 6 * M,
    quant: (c, h, d) => (jobLevel(c, "quant") >= 2 && c.st.wallet >= 10000) || B(h).list.some(b => b.tpl === "broker" && (b.total || 0) > 0 && b.owners.some(o => o[0] === c.id)) && ownDays(h, c, b => b.tpl === "broker", d) >= YR
      || (c.st.genes.rares.includes("genius") && sk(c, "logic") >= 85),
  };
  function unlocked(c, home) {
    if (!c || !c.st) return [];
    const own = B(home).list.filter(b => b.owners.some(o => o[0] === c.id)).map(b => b.tpl);
    return [...new Set([...STARTER, ...own, ...(c.st.unlocked || [])])];
  }
  const isOpen = (c, home, tpl) => unlocked(c, home).includes(tpl);
  // tiap hari: cek jalan yang baru terpenuhi, kasih kabar "punya ide baru"
  function checkUnlocks(x) {
    const c = x.c, home = x.home, day = x.day;
    if (!grown(c, day)) return;
    const have = unlocked(c, home), add = [];
    for (const [tpl, ok] of Object.entries(REQ)) if (!have.includes(tpl) && ok(c, home, day)) add.push(tpl);
    if (!add.length) return;
    (c.st.unlocked ||= []).push(...add);
    c.st.newIdeas = add.map(tpl => ({ tpl, d: day }));
    const names = add.map(t => { const l = TPL[t].label.toLowerCase(); return (/^[aeiou]/.test(l) ? "an " : "a ") + l; });
    x.say(`${c.name} has a new idea: opening ${names.join(" or ")} someday.`);
    x.remember(`Started dreaming about ${names[0]}.`);
  }

  // ---------------------------------------------------------------- harian
  const _status = HOOKS.status;
  HOOKS.status = (x, dramas, events_) => {
    _status(x, dramas, events_);
    const c = x.c, home = x.home, day = x.day;
    if (!c.st) return;
    // pemiliknya pindah keluar rumah: bisnisnya diserahkan atau dijual (simulasinya sudah berhenti buat dia)
    for (const ob of active(home)) { const o = home.get(ob.owner); if (o && o.st && "keluar" in o.info) passOn(home, ob, day, o); }
    const b = ownerBiz(home, c.id);
    if (b) {
      // pensiun atau pergi: serahkan
      if (!grown(c, day)) {
        const r = passOn(home, b, day, c);
        const s = r.heir ? `${c.name} hands ${b.name} over to ${r.heir.name}.` : `${c.name} sells ${b.name} for ${r.sold.toLocaleString("en")} coins.`;
        x.say(s); x.remember(s); dramas.push("besar"); events_.push("biz_handover");
        return;
      }
      if (!c.st.job || c.st.job.biz !== b.id) setOwnerJob(c, b, day);
      const n0 = x.log.length;
      const l0 = staffDay(x, b);
      if (l0) x.say(l0);
      const l1 = day1(x, b);
      if (l1) x.say(l1);
      events(x, b);
      if (TPL[b.tpl].fund && c.st.job) { c.st.job.level = lvlOf(b); c.info.kerja = ST.title(c.st.job); }
      if (b.wish && b.wish.k === "expand" && day - b.wish.d >= 5) act1(home, c, b, "go", day, true);
      else if (b.wish && b.wish.k === "close" && day - b.wish.d >= 7) act1(home, c, b, "go", day, true);
      if (!b.closed && b.debt >= 30) { close(home, b, day, "bankrupt"); x.say(`${b.name} runs out of money and closes for good.`); x.scar("bangkrut"); x.remember(`${b.name} went bankrupt.`); dramas.push("besar"); events_.push("biz_bangkrut"); }
      else decide(x, b);
      checkUnlocks(x);
      if (x.log.length > n0) { dramas.push(x.drama || "sedang"); events_.push("biz"); }
    } else {
      const w = c.st.bizWish;
      if (w && day - w.d >= 5) {
        // nggak ada jawaban: buka sendiri kalau duitnya cukup, kalau nggak ya nanti aja
        delete c.st.bizWish;
        const t = TPL[w.tpl];
        if (c.st.wallet >= t.cap && open(home, c, w.tpl, day, "self")) { x.say(`${c.name} opens ${ownerBiz(home, c.id).name} with their own savings.`); dramas.push("besar"); events_.push("biz_buka"); }
        else { c.st.bizCool = day + 90; x.say(`${c.name} shelves the ${t.label.toLowerCase()} idea for now.`); }
      } else if (!w) {
        const n0 = x.log.length;
        checkUnlocks(x);
        wantsOwn(x);
        if (x.log.length > n0) { dramas.push("sedang"); events_.push("biz_mau"); }
      }
    }
  };
  // riwayat kerja di Burrow: catat nama bisnis keluarga
  const _st2 = HOOKS.status;
  HOOKS.status = (x, dramas, events_) => {
    _st2(x, dramas, events_);
    const st = x.c.st, H = st && st.history;
    if (H && H.length && st.job && st.job.biz) { const h = H[H.length - 1], b = B(x.home).list.find(o => o.id === st.job.biz); if (h.to == null && b && !h.bizName) { h.bizName = b.name; h.role = st.job.role || "Owner"; } }
  };
  const _farewell = HOOKS.akhir_hidup;
  HOOKS.akhir_hidup = (c, day, home) => {
    const log = _farewell(c, day, home);
    const b = ownerBiz(home, c.id);
    if (b) {
      const r = passOn(home, b, day, c);
      log.lines.push(r.heir ? `${b.name} passes to ${r.heir.name}.` : `${b.name} is sold. The money goes to the family.`);
      if (!r.heir && r.sold) {
        const at = m => m.alive(day + 1) && !("keluar" in m.info) && m.st;
        let heirs = home.children_of(c).filter(at);
        if (!heirs.length) heirs = home.members.filter(m => m !== c && at(m));
        if (heirs.length) { const share = Math.floor(c.st.wallet / heirs.length); for (const h of heirs) h.st.wallet += share; c.st.wallet = 0; }
      }
    }
    return log;
  };

  // ---------------------------------------------------------------- tindakan pemain: "biz:<op>:<arg>"
  // fund: kasih modal buat keinginan makhluk. suggest:<tpl>: usul buka (dia bisa nolak lewat game._refuse).
  // go / wait: jawab permintaan ekspansi atau tutup. price:<x>, focus:<x>, hire, close: saran (bisa ditolak). bail:<n>: suntik kas dari dompet keluarga.
  function act1(home, c, b, op, day, self) {
    const x = new Ctx(c, day, seed_rng(c.id, day, "biz-act", op), home, true);
    if (op === "go" && b.wish) {
      const w = b.wish; b.wish = null;
      if (w.k === "expand" && b.cash >= w.cost && LEVELS[b.level + 1]) {
        b.cash -= w.cost; b.level += 1; b.staffQ = clamp((b.staffQ ?? 0.5) + 0.03, 0.2, 0.9);
        if (c.st.job) { c.st.job.level = b.level; c.info.kerja = ST.title(c.st.job); }
        ST.achieve(x, "biz_lv" + b.level + "_" + b.id, `${b.name} became a ${LEVELS[b.level].label.toLowerCase()}.`);
        return true;
      }
      if (w.k === "close") { close(home, b, day, "closed"); x.remember(`Closed ${b.name}.`); return true; }
      return false;
    }
    if (op === "wait" && b.wish) { b.wish = null; return true; }
    return false;
  }
  function bakeAct(home, c, b, op, arg, day) {
    const t = TPL[b.tpl];
    // seluruh rencana panggang sekaligus: "plan:12,8,a,20" (a = biar dia tebak sendiri)
    if (op === "plan" && PREP.includes(t.id)) {
      const P = bakeProds(t, b).map(o => o.p), qs = String(arg || "").split(",");
      if (qs.length !== P.length) return false;
      const nx = {};
      for (let i = 0; i < P.length; i++) { if (qs[i] === "a") continue; const q = Math.round(Number(qs[i])); if (!isFinite(q) || q < 0 || q > 400) return false; nx[P[i]] = q; }
      b.plan = nx; b.planD = day; return true;
    }
    if (op === "open" && t.id === "bakery" && ["6", "7", "9"].includes(arg) && b.open !== arg) { b.open = arg; return true; }
    if (op === "dayold" && PREP.includes(t.id)) { b.dayold = arg === "on"; return true; }
    if (op === "seat" && t.id === "cafe" && SEAT[arg] && (b.seat || "mix") !== arg) { b.seat = arg; return true; }
    if (op === "music" && t.id === "cafe") { const on = arg === "on"; if (!!b.music === on) return false; b.music = on; return true; }
    if (op === "card") return bakeAnswer(home, c, b, arg, day, "you");
    if (op === "mode" && SVC[t.id] && SVC[t.id].opts[arg] && svcMode(b, t) !== arg) { b.mode = arg; return true; }
    if (op === "extra" && SVC[t.id]) { const on = arg === "on"; if (!!b.extra === on) return false; b.extra = on; return true; }
    return false;
  }
  const _act = HOOKS.act;
  HOOKS.act = (home, cid, kind, day) => {
    // pemilik bisnis nggak bisa sekalian kerja di perusahaan lain (jabatannya tetap "owner")
    if ((kind.startsWith("apply:") && !kind.startsWith("apply:fb:") || kind.startsWith("lamar:")) && ownerBiz(home, cid)) return false;
    if (kind.startsWith("apply:fb:")) {
      const m = home.get(cid), b = active(home).find(o => o.id === kind.slice(9));
      if (!m || !m.st || !b || !b.post || !CR.canWork(m, day) || b.owner === cid || ownerBiz(home, cid) || (b.staff || []).some(s => s.fam === cid) || b.post.apps.some(a => a.fam === cid)) return false;
      const t = TPL[b.tpl], f = fit(m, b.tpl);
      b.post.apps.push({ id: "a" + (b.post.seq = (b.post.seq || 0) + 1), d: day, fam: cid, name: m.name, skill: r2(clamp(0.15 + f * 0.9, 0.1, 0.95)), ask: fairPay(t, f), trait: "family" });
      return true;
    }
    if (!kind.startsWith("biz:")) return _act(home, cid, kind, day);
    const c = home.get(cid);
    if (!c || !c.st || !grown(c, day)) return false;
    const [, op, arg] = kind.split(":");
    const b = ownerBiz(home, cid);
    if (op === "fund" || op === "loan" || op === "suggest") {
      if (b) return false;
      const tpl = op === "suggest" ? String(arg || "").split("@")[0] : (c.st.bizWish || {}).tpl;
      if (!TPL[tpl] || (op === "suggest" && !isOpen(c, home, tpl))) return false;
      const nb = open(home, c, tpl, day, op === "loan" || (op === "suggest" && String(arg || "").endsWith("@loan")) ? "loan" : "fund");
      return !!nb;
    }
    if (op === "nofund") {
      if (!c.st.bizWish) return false;
      const tpl = c.st.bizWish.tpl; delete c.st.bizWish;
      // pakai tabungan sendiri kalau bisa dan dia nekat
      if (c.st.wallet >= TPL[tpl].cap && hash(c.id + day + "nekat") < 0.25 + (c.traits.impulsif ?? 50) / 250) return !!open(home, c, tpl, day, "self");
      c.st.bizCool = day + 90;
      return true;
    }
    if (!b) return false;
    if (op === "go" || op === "wait") return act1(home, c, b, op, day);
    if (op === "price" && ["budget", "normal", "premium"].includes(arg) && b.price !== arg) { b.price = arg; return true; }
    if (op === "focus" && ["quality", "steady", "growth"].includes(arg) && b.focus !== arg) { b.focus = arg; return true; }
    if (op === "rnd" && RND[arg] && b.rnd !== arg) { b.rnd = arg; return true; }
    if (op === "niche") return setNiche(b, arg, day);
    const t = TPL[b.tpl];
    b.staff ||= [];
    if ((op === "post" || op === "hire") && !b.post && b.staff.length < SLOTS[b.level]) {
      const R = roles(t), role = R[Math.min(R.length - 1, Math.max(0, Number(arg) || 0))];
      b.post = { role, d: day, apps: [], by: "you" };
      return true;
    }
    if (op === "unpost" && b.post) { b.post = null; return true; }
    if (op === "bake" && PREP.includes(t.id)) {
      const [ps, qs] = String(arg || "").split("="), P = bakeProds(t, b).map(o => o.p), p = P[Number(ps)];
      if (p == null) return false;
      const q = qs === "auto" ? null : Math.max(0, Math.min(400, Math.round(Number(qs))));
      if (q !== null && !isFinite(q)) return false;
      b.plan ||= {};
      if (q === null) delete b.plan[p]; else b.plan[p] = q;
      b.planD = day; return true;
    }
    if (PREP.includes(t.id) && ["plan", "bake", "open", "dayold", "card", "seat", "music"].includes(op)) return bakeAct(home, c, b, op, arg, day);
    if (SVC[t.id] && ["mode", "extra", "card"].includes(op)) return bakeAct(home, c, b, op, arg, day);
    if (op === "pick" && b.post) {
      const a = b.post.apps.find(o => o.id === arg);
      if (!a) return false;
      return !!hire(home, b, a, day);
    }
    const S = b.staff.find(o => o.id === arg);
    if (op === "fire" && S) { dropStaff(home, b, S, day, "Let go"); return true; }
    if (op === "raise" && S) {
      if (S.fam) { const m = home.get(S.fam); if (!m || !m.st.job || m.st.job.level >= 3) return false; m.st.job.level += 1; m.info.kerja = ST.title(m.st.job); }
      else S.pay = Math.round(S.pay * 1.15);
      S.mood = Math.min(100, S.mood + 18); return true;
    }
    if (op === "train" && S && !(S.trained > day - 30)) {
      const cost = Math.round(150 + t.cap * 0.03);
      if (b.cash < cost) return false;
      b.cash -= cost; S.skill = r2(Math.min(0.98, S.skill + 0.07)); S.mood = Math.min(100, S.mood + 6); S.trained = day; return true;
    }
    if (op === "borrow" && !b.loan && !t.fund) {
      const O = bank(b, day).offers[Number(arg) || 0];
      if (!O || !O.amt) return false;
      b.cash += O.amt; b.loan = { left: O.total, pay: O.pay, from: day, amt: O.amt, term: O.term, rate: O.rate };
      return true;
    }
    if (op === "repay" && b.loan) {
      const due = Math.round(b.loan.left * 0.97);
      if (b.cash < due) return false;
      b.cash -= due; b.loan = null; return true;
    }
    if (op === "invest" && b.offer) return invest(home, b, arg === "yes", day);
    if (op === "supplier" && SUPPLY[arg] && b.supply !== arg) { b.supply = arg; return true; }
    if (op === "promo" && !(b.buzz > day) && !t.fund) {
      const cost = Math.round(t.cap * 0.06 * LEVELS[b.level].cap);
      if (b.cash < cost) return false;
      b.cash -= cost; b.buzz = day + 8; b.promo = { d: day, cost };
      b.ev = { d: day, t: `${b.name} runs a promotion on Chirp.`, k: "promo" };
      return true;
    }
    if (op === "product" && !t.fund && !(b.lab > day - 20)) {
      const cost = Math.round(t.cap * 0.05);
      if (b.cash < cost) return false;
      b.cash -= cost; b.lab = day;
      const ok = hash(b.id + day + "lab") < 0.3 + fit(c, b.tpl) * 0.5 + ((c.traits.kreatif ?? 50) - 50) / 200;
      if (ok) { b.sig = pickProd(t, b, day + 7); b.rep = Math.min(100, (b.rep || 30) + 3); b.ev = { d: day, t: `${c.name} launches ${b.sig}. It's a hit with regulars.`, k: "sig" }; }
      else b.ev = { d: day, t: `${c.name} tries a new idea at ${b.name}, but it doesn't catch on.`, k: "flop" };
      return true;
    }
    if (op === "grow" && !t.fund && LEVELS[b.level + 1] && !b.wish) {
      const cost = Math.round(Math.max(3000, t.cap) * LEVELS[b.level + 1].up);
      if (b.cash < cost) return false;
      b.wish = { k: "expand", d: day, cost };
      return act1(home, c, b, "go", day);
    }
    if (op === "contract" && t.b2b && !(b.contract && b.contract.until > day) && !(b.pitched > day - 20)) {
      b.pitched = day;
      const cl = clientList(home, t, day), ok = cl.length && hash(b.id + day + "deal") < 0.25 + (b.rep || 30) / 200 + c.st.skills.charm / 300;
      if (!ok) { b.ev = { d: day, t: `${c.name} pitches a long contract, but no one signs this time.`, k: "flop" }; return true; }
      const who = cl[Math.floor(hash(b.id + day + "who") * cl.length)];
      b.contract = { name: who.name, until: day + 90, per: Math.round(t.price * (1.5 + LEVELS[b.level].cap) * 0.9), d: day };
      b.ev = { d: day, t: `${b.name} signs a 90-day contract with ${who.name}.`, k: "order" };
      return true;
    }
    if (op === "close") { close(home, b, day, "closed"); return true; }
    if (op === "bail") {
      const n = Math.max(0, Math.round(Number(arg) || 0));
      if (!n || !familyChip(home, c, n, day)) return false;
      b.cash += n; b.debt = 0;
      return true;
    }
    return false;
  };

  // Top firms (app Ranks): pesaing NPC yang masih buka plus bisnis keluarga, diurutkan dari kekuatannya.
  // Cuma jenis bisnis yang udah kebuka buat keluarga ini yang bisa dilihat, biar syarat rahasia tetap rahasia.
  function firmTypes(home, day) {
    const set = new Set(active(home).map(b => b.tpl));
    for (const m of home.members) if (m.st && m.alive(day)) for (const k of unlocked(m, home)) set.add(k);
    const own = new Set(active(home).map(b => b.tpl));
    return TPLS.filter(t => set.has(t.id) && !t.hits).map(t => ({ id: t.id, label: t.label, own: own.has(t.id) })).sort((a, z) => z.own - a.own);
  }
  function topFirms(home, day, tpl) {
    const t = TPL[tpl];
    if (!t || t.hits) return null;
    const N = Object.fromEntries(niches(tpl)), multi = niches(tpl).length > 1, L = rivalList(tpl, day);
    const rows = L.open.map(o => ({ name: rivalName(home, o), value: Math.round(o.s * 100), sub: `${multi ? N[o.niche] + " · " : ""}${Math.round(2 + hash("rf" + tpl + o.i) * 30)} yrs in Old Town` }))
      .concat(active(home).filter(b => b.tpl === tpl).map(b => { const o = home.get(b.owner); return { name: b.name, value: Math.round(strength(b) * 100), sub: `${multi ? N[nicheOf(b, day)] + " · " : ""}${o ? o.name + "'s" : "Family"} · ${day - b.since < 365 ? "new" : Math.floor((day - b.since) / 365) + " yrs"}`, you: b.id }; }));
    rows.sort((a, z) => z.value - a.value);
    return { top: rows.map((e, i) => ({ rank: i + 1, ...e })), total: rows.length, shut: L.shut.length };
  }
  // pindah ceruk: sebagian keahlian nggak kepakai lagi
  function setNiche(b, k, day) {
    const N = niches(b.tpl);
    if (N.length < 2 || !N.some(n => n[0] === k) || nicheOf(b, day) === k) return false;
    b.niche = k; b.edge = Math.round((b.edge || 0) * 0.7 * 1000) / 1000; b.nicheAt = day;
    return true;
  }
  function marketView(home, b, day) {
    const t = TPL[b.tpl];
    if (t.hits) return null;
    const M = compete(home, b, day), N = niches(b.tpl);
    return { niche: M.niche, multi: N.length > 1, niches: N.map(([k, label]) => ({ k, label, n: M.rows.filter(r => r.niche === k).length, you: k === M.niche })),
      share: Math.round(100 / (1 + M.comp)), rows: M.rows.sort((a, z) => z.s - a.s).slice(0, 6), me: M.me, shut: M.shut, crisis: crisisFrac(day) > 0, recession: !!recession(day), crises: b.crises || 0,
      style: t.fund ? FUND_STYLE[M.niche] : null };
  }

  // ---------------------------------------------------------------- tampilan
  function view(b, home, day) {
    const t = TPL[b.tpl], c = home.get(b.owner), h = b.hist || [];
    const w30 = h.slice(-30), sum = (a, i) => a.reduce((s, r) => s + r[i], 0);
    return { ...b, t, cat: CATS[t.cat], lvl: lvlLabel(b), owner: c ? c.name : b.founder, ownerId: b.owner, fitNow: c && c.st ? fit(c, b.tpl) : 0,
      rev30: sum(w30, 1), profit30: sum(w30, 2), cust30: Math.round(sum(w30, 3) / Math.max(1, w30.length)), spark: w30.map(r => r[2]),
      next: !t.fund && LEVELS[b.level + 1] ? { label: LEVELS[b.level + 1].label, cost: Math.round(Math.max(3000, t.cap) * LEVELS[b.level + 1].up) } : null,
      suppliers: famSupplier(home, t).map(s => s.name), clients: t.b2b ? Math.round(clients(home, t, day)) : null,
      slots: SLOTS[b.level], roles: roles(t), staffV: (b.staff || []).map(s => ({ ...s, payNow: payOf(home, s), fair: fairPay(t, s.skill) })), bank: bank(b, day),
      supplyList: supplyList(home, b), clientList: t.b2b ? clientList(home, t, day) : [], promoCost: Math.round(t.cap * 0.06 * LEVELS[b.level].cap), labCost: Math.round(t.cap * 0.05),
      trainCost: Math.round(150 + t.cap * 0.03), equity: b.equity ?? 1,
      bakeProds: PREP.includes(t.id) ? bakeProds(t, b).map(o => o.p) : null, cardOpts: b.card && CARDED(t.id) ? prepCards(t)[b.card.k].o : null,
      svc: SVC[t.id] ? { lever: SVC[t.id].lever, mode: svcMode(b, t), extra: SVC[t.id].extra, opts: Object.keys(SVC[t.id].opts), price: t.price } : null,
      seatList: t.id === "cafe" ? Object.entries(SEAT).map(([k, o]) => ({ k, ...o })) : null, musicCost: Math.round(40 * LEVELS[b.level].cap),
      edge: Math.round(b.edge || 0), rndNow: rndOf(new Ctx(c || home.members[0], day, seed_rng("v"), home, true), b), rndList: Object.entries(RND).map(([k, o]) => ({ k, label: o.label, cost: Math.round((t.fund ? 2 * fundOpex(b) : (t.cap / 120) * LEVELS[b.level].rent) * o.cost) })), track: track(b), market: marketView(home, b, day),
      goal: !t.fund && LEVELS[b.level + 1] ? { label: LEVELS[b.level + 1].label, cash: Math.round(Math.max(3000, t.cap) * LEVELS[b.level + 1].up), rep: 50 + b.level * 8 } : null };
  }
  function supplyList(home, b) {
    const t = TPL[b.tpl];
    return t.inputs.map(i => { const f = active(home).find(o => o.tpl === i); return f ? { tpl: i, label: TPL[i].label, name: f.name, fam: true } : { tpl: i, label: TPL[i].label, name: `${SUP_NAME[Math.floor(hash(b.id + i) * SUP_NAME.length)]} ${TPL[i].label}`, fam: false }; });
  }
  function clientList(home, t, day) {
    const out = [];
    for (const s of t.serves) {
      if (s === "*") { for (const o of active(home).filter(o => o.tpl !== t.id)) out.push({ name: o.name, kind: TPL[o.tpl].label, fam: true }); continue; }
      if (s.startsWith("@")) { for (const co of CR.companiesAt(day, s.slice(1)).slice(0, 3)) out.push({ name: co.name, kind: co.size }); continue; }
      for (const o of active(home).filter(o => o.tpl === s)) out.push({ name: o.name, kind: TPL[s].label, fam: true });
      const n = rivals(s, day); if (n) out.push({ name: `${n} ${TPL[s].label.toLowerCase()}${n > 1 ? "s" : ""} in town`, kind: "Town", many: true });
    }
    return out.filter(o => !o.many || true);
  }
  // mode uji: bisnis contoh yang jalan beberapa bulan di makhluk tiruan, nggak nyentuh save
  function demo(home, c, tplId, day, level = 1) {
    const t = TPL[tplId];
    if (!t || !c || !c.st) return null;
    const cc = Object.create(c);
    Object.assign(cc, { st: JSON.parse(JSON.stringify(c.st)), needs: { ...c.needs }, traits: { ...c.traits }, info: JSON.parse(JSON.stringify(c.info)), stats: { ...c.stats }, memory: [] });
    cc.needs.mood = Math.max(cc.needs.mood, 60);
    const span = t.hits ? 500 : 420, since = day - span, lvl = t.fund ? 0 : level;
    const b = { id: "demo-" + tplId, demo: true, tpl: tplId, owner: c.id, founder: c.name, name: bizName(t, c, since, home), since, level: lvl, rep: 45, q: null, focus: "steady", price: "normal", supply: "standard",
      staff: [], sseq: 0, equity: 1, owners: [[c.id, c.name, since]], via: "self", cash: t.fund ? t.cap * 4 : Math.round(t.cap * (t.hits ? 1.2 : 0.6) * LEVELS[lvl].cap), hwm: null };
    b.prodName = pickProd(t, b, since);
    if (t.fund) b.mine = t.cap;
    for (let i = 0; i < LEVELS[lvl].staff; i++) { b.post = { role: roles(t)[i % roles(t).length], d: since, apps: [] }; hire(home, b, { id: "x", ...npcPerson(b.id + i, t, 45) }, since); }
    for (let d = since; d <= day; d++) {
      const x = new Ctx(cc, d, seed_rng(c.id, d, "demo"), home, true);
      staffDay(x, b); day1(x, b); events(x, b); if (d > since + 20) decide(x, b);
      if (b.wish) b.wish = d === day ? b.wish : null;
    }
    Object.defineProperty(b, "_cc", { value: cc, enumerable: false });
    b.vday = day;
    return b;
  }
  // mode uji: jalankan satu hari lagi, atau terapkan saran langsung (tanpa ditolak, nggak disimpan)
  function demoNext(home, b) {
    const d = ++b.vday, x = new Ctx(b._cc, d, seed_rng(b._cc.id, d, "demo"), home, true);
    staffDay(x, b); day1(x, b); events(x, b); decide(x, b);
    return b;
  }
  function demoAct(home, b, op, arg) {
    if (op === "rnd") { if (!RND[arg] || b.rnd === arg) return false; b.rnd = arg; return true; }
    if (op === "niche") return setNiche(b, arg, b.vday);
    return CARDED(TPL[b.tpl].id) ? bakeAct(home, b._cc, b, op, arg, b.vday) : false;
  }
  // lowongan bisnis keluarga yang tampil di Burrow
  function postings(home, day) {
    return active(home).filter(b => b.post && TPL[b.tpl]).map(b => ({ id: "fb:" + b.id, biz: b.id, name: b.name, tpl: b.tpl, title: b.post.role, pay: fairPay(TPL[b.tpl], 0.5), posted: b.post.d, until: b.post.d + 14,
      applicants: b.post.apps.length, owner: (home.get(b.owner) || {}).name, w: TPL[b.tpl].w, cat: CATS[TPL[b.tpl].cat] }));
  }
  // app kerja di HP satu makhluk: bisnis yang dia punya atau tempat dia kerja, plus alumni (minimal 90 hari)
  function workApps(home, c, day) {
    if (!c || !c.st) return [];
    const out = [], own = ownerBiz(home, c.id);
    if (own) out.push({ biz: own.id, tpl: own.tpl, name: own.name, role: "Owner", live: true });
    const j = c.st.job;
    if (j && j.id === "staff") { const b = active(home).find(o => o.id === j.biz); if (b) out.push({ biz: b.id, tpl: b.tpl, name: b.name, role: j.role, live: true }); }
    for (const a of (c.st.alumni || []).slice(-6)) if (!out.some(o => o.biz === a.biz)) out.push({ ...a, live: false });
    return out;
  }
  function family(home, day) {
    const S = B(home);
    return { active: active(home).map(b => view(b, home, day)), closed: S.list.filter(b => b.closed).slice(-6).reverse().map(b => view(b, home, day)),
      wishes: home.members.filter(m => m.st && m.st.bizWish && m.alive(day)).map(m => ({ cid: m.id, name: m.name, ...m.st.bizWish, t: TPL[m.st.bizWish.tpl], wallet: Math.round(m.st.wallet), fit: fit(m, m.st.bizWish.tpl) })) };
  }
  const famCash = (home, c, day) => Math.round(home.members.filter(m => m !== c && m.alive(day) && m.st && !("keluar" in m.info)).reduce((s2, m) => s2 + m.st.wallet, 0));
  // usulan untuk satu makhluk: semua template, urut dari yang paling cocok
  function ideas(c, home, day) {
    const open = unlocked(c, home), fresh = (c.st.newIdeas || []).filter(o => day - o.d <= 14).map(o => o.tpl);
    return TPLS.filter(t => open.includes(t.id)).map(t => ({ t, f: fit(c, t.id), taken: active(home).some(b => b.tpl === t.id), demand: r2(trend(t.id, day) * econ(day)), fresh: fresh.includes(t.id) })).sort((a, b) => b.fresh - a.fresh || b.f - a.f);
  }

  // jenis pekerjaan pemilik bisnis (gajinya dari untung, bukan gaji tetap)
  ST.EXT.bizName = (home, id) => { const b = B(home).list.find(o => o.id === id); return b ? b.name : "the family business"; };
  ST.JOBS.staff = { label: "Family business staff", w: { charm: 0.4, logic: 0.3, fitness: 0.3 }, req: 0, pay: 30, pop: 0.02, pts: 3, mult: 1.25, internal: true,
    ladder: ["Helper", "Staff", "Senior staff", "Manager"] };
  ST.JOBS.owner = { label: "Business owner", w: { logic: 0.35, charm: 0.35, creativity: 0.3 }, req: 0, pay: 0, pop: 0.03, pts: 14, mult: 1, internal: true,
    ladder: ["Stall owner", "Shop owner", "Business owner", "Tycoon"] };

  const API = { CATS, TPLS, TPL, LEVELS, FUND_LEVELS, econ, econLabel, recession, trend, rivals, rivalList, crisisFrac, niches, strength, firmTypes, topFirms, price, index, indexLevel, market, fit, fitLabel, family, ideas, famCash, ownerBiz, active, view, clients,
    ROLES_TPL, SVC, SUPPLY, LOANS, SLOTS, roles, fairPay, bank, postings, workApps, demo, demoNext, demoAct, unlocked, STARTER };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Venture = API;
})();

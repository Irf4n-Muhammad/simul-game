// perabot.js: Tata Rumah tahap 1 (November 2026). Perabot di empat ruangan rumah: dibeli pakai uang keluarga, dipasang di slot,
// disimpan di gudang, dijual lagi. Fungsi murni seperti dapur.js: tidak menyentuh three.js; model 3D-nya ada di ui/03b-perabot.js.
//
// Diskusi 9-10 Nov: perabot ada tiga jenis.
//   fungsi : bikin rawat di ruangan itu lebih manjur (kasur buat tidur, bak buat mandi, meja makan, pojok main)
//   hias   : nggak ada fungsi, tapi naikin suasana ruangan (lukisan, karpet, tanaman, lampu)
//   dua    : dua-duanya (rak buku, easel, kebun bumbu)
// Suasana dibaca lewat selera tiap makhluk dari sifatnya: hiasan yang sama bisa disukai satu anggota, biasa aja buat yang lain.
//
// Keadaan disimpan di home.world.perabot (ikut snapshot rumah tangga) dan cuma diubah lewat aksi yang dicatat, jadi replay sama:
//   "perabot:beli:<id>"                 beli satu dari dompet makhluk yang dipilih (umur >= 180), masuk gudang
//   "perabot:pasang:<ruang>:<slot>:<id>" pasang dari gudang; yang tadinya di slot itu balik ke gudang
//   "perabot:simpan:<ruang>:<slot>"      kosongkan slot hias (slot utama nggak boleh kosong)
//   "perabot:jual:<id>"                 jual satu dari gudang, dapat separuh harga
//
// Penting buat save lama: perabot bawaan (def) nggak punya efek dan nilai hias 0, dan onCare tidak memakai RNG. Rumah yang
// belum pernah disentuh menghasilkan angka yang sama persis dengan versi sebelum Tata Rumah.
"use strict";
(() => {
  const Money = (typeof module !== "undefined") ? require("./money.js") : globalThis.Money;

  // ruangan = kunci aksi di ui/03-scene.js (ROOMS[].act)
  const ROOMS = {
    makan: { name: "Kitchen" }, mandi: { name: "Bathroom" }, tidur: { name: "Bedroom" }, peluk: { name: "Playroom" },
  };
  const ROOM_IDS = Object.keys(ROOMS);
  const SLOTS = {
    utama: { name: "Main piece", hias: false, empty: false },
    samping: { name: "Side piece", hias: false, empty: false },
    dinding: { name: "Wall", hias: true, empty: true },
    lantai: { name: "Floor", hias: true, empty: true },
    sudut: { name: "Corner", hias: true, empty: true },
  };
  const SLOT_IDS = Object.keys(SLOTS);

  // tag selera: sifat mana yang suka. Dibaca di taste().
  const TAGS = {
    seni: "art", alam: "plants", nyaman: "cozy", keluarga: "family", main: "playful", buku: "books", mewah: "fancy", lampu: "warm light", rapi: "tidy",
  };

  // fx: efek waktu rawat di ruangan itu. mood/kes/bond = tambahan; skill = { k, n }; makan bisa dibatasi ke satu waktu (pagi/malam)
  // atau satu pilihan menu (opt). Angka kecil sengaja: rawat yang sama tetap jalan tanpa perabot apa pun.
  const I = [];
  const it = (id, name, kind, slot, room, price, o = {}) => I.push(Object.assign({ id, name, kind, slot, room, price, hias: 0, tags: [], fx: null, def: false, note: "" }, o));

  // ---- Kitchen
  it("cafe_table", "Café table", "fungsi", "utama", "makan", 0, { def: true, note: "A small round table. Does the job." });
  it("family_table", "Family table", "fungsi", "utama", "makan", 420, { hias: 1, tags: ["keluarga"], fx: { bond: 0.3, mood: 2, when: "malam" }, note: "Room for everyone. Dinner here: bond and mood up." });
  it("harvest_table", "Oak harvest table", "fungsi", "utama", "makan", 1600, { hias: 2, tags: ["keluarga", "mewah"], fx: { bond: 0.45, mood: 4, kes: 0.1 }, note: "Long oak table. Every meal: bond, mood and a little health." });
  it("jar_shelf", "Jar shelf", "dua", "samping", "makan", 0, { def: true, note: "Jars of this and that." });
  it("herb_shelf", "Herb shelf", "dua", "samping", "makan", 260, { hias: 1, tags: ["alam"], fx: { kes: 0.15 }, note: "Fresh herbs in every meal: a little health." });
  it("coffee_shelf", "Coffee corner", "dua", "samping", "makan", 340, { hias: 1, tags: ["nyaman"], fx: { mood: 4, when: "pagi" }, note: "Warm drinks at breakfast: mood up." });
  // ---- Bathroom
  it("clawfoot_tub", "Clawfoot tub", "fungsi", "utama", "mandi", 0, { def: true, note: "The old tub. Still warm." });
  it("bubble_tub", "Bubble tub", "fungsi", "utama", "mandi", 380, { hias: 1, tags: ["main"], fx: { mood: 4 }, note: "Jets and bubbles. Bath: mood up." });
  it("spa_tub", "Stone spa tub", "fungsi", "utama", "mandi", 1500, { hias: 2, tags: ["mewah", "alam"], fx: { mood: 5, kes: 0.2 }, note: "Deep stone tub. Bath: mood and health up." });
  it("pedestal_sink", "Pedestal sink", "dua", "samping", "mandi", 0, { def: true, note: "A sink with a round mirror." });
  it("vanity", "Vanity mirror", "dua", "samping", "mandi", 300, { hias: 1, tags: ["mewah"], fx: { skill: { k: "charm", n: 0.15 } }, note: "Practice smiles every bath: learns a little Charm." });
  it("plant_wall", "Fern wall", "dua", "samping", "mandi", 280, { hias: 2, tags: ["alam"], fx: { mood: 2 }, note: "Ferns love the steam. Bath: mood up." });
  // ---- Bedroom
  it("pine_bed", "Pine bed", "fungsi", "utama", "tidur", 0, { def: true, note: "A sturdy bed." });
  it("cloud_bed", "Cloud bed", "fungsi", "utama", "tidur", 450, { hias: 1, tags: ["nyaman"], fx: { mood: 3, kes: 0.1 }, note: "Soft as a cloud. Bedtime: mood and a little health." });
  it("canopy_bed", "Canopy bed", "fungsi", "utama", "tidur", 1800, { hias: 2, tags: ["mewah", "nyaman"], fx: { mood: 5, kes: 0.2 }, note: "Curtains all round. Bedtime: mood and health up." });
  it("bookshelf", "Bookshelf", "dua", "samping", "tidur", 0, { def: true, note: "Picture books and a few big ones." });
  it("study_desk", "Study desk", "dua", "samping", "tidur", 360, { hias: 1, tags: ["buku", "rapi"], fx: { skill: { k: "logic", n: 0.2 } }, note: "A desk with a lamp. Bedtime: learns a little Logic." });
  it("reading_nook", "Reading nook", "dua", "samping", "tidur", 520, { hias: 2, tags: ["buku", "nyaman"], fx: { skill: { k: "logic", n: 0.15 }, mood: 2 }, note: "Cushions and books. Bedtime: a little Logic and mood." });
  // ---- Playroom
  it("play_tent", "Play tent", "fungsi", "utama", "peluk", 0, { def: true, note: "A little tent for hiding." });
  it("climb_frame", "Climbing frame", "fungsi", "utama", "peluk", 400, { hias: 1, tags: ["main"], fx: { kes: 0.15, skill: { k: "fitness", n: 0.15 } }, note: "Up and over. Play: a little Fitness and health." });
  it("ball_pit", "Ball pit", "fungsi", "utama", "peluk", 650, { hias: 2, tags: ["main"], fx: { mood: 4, bond: 0.2 }, note: "Hundreds of soft balls. Play: mood and bond up." });
  it("toy_shelf", "Toy shelf", "dua", "samping", "peluk", 0, { def: true, note: "Blocks, a ball and a cone." });
  it("easel", "Easel", "dua", "samping", "peluk", 320, { hias: 1, tags: ["seni"], fx: { skill: { k: "creativity", n: 0.2 } }, note: "Paper and paints. Play: learns a little Creativity." });
  it("piano", "Little piano", "dua", "samping", "peluk", 900, { hias: 2, tags: ["seni", "mewah"], fx: { skill: { k: "charm", n: 0.1 }, mood: 2 }, note: "Plink plonk. Play: a little Charm and mood." });
  // ---- hiasan (ruangan mana saja). Bawaan tiap ruangan pakai id dengan akhiran ruangannya supaya modelnya sama dengan sebelumnya.
  for (const [r, id, name] of [["makan", "art_kitchen", "Tomato print"], ["tidur", "art_bedroom", "Hills print"], ["peluk", "art_playroom", "House drawing"]]) it(id, name, "hias", "dinding", null, 0, { def: true, home: r });
  for (const [r, id, name] of [["makan", "rug_kitchen", "Linen rug"], ["mandi", "rug_bathroom", "Bath mat"], ["tidur", "rug_bedroom", "Rust rug"], ["peluk", "rug_playroom", "Sun rug"]]) it(id, name, "hias", "lantai", null, 0, { def: true, home: r });
  for (const [r, id, name] of [["makan", "plant_kitchen", "Leafy plant"], ["mandi", "plant_bathroom", "Bathroom plant"], ["tidur", "plush_bedroom", "Plush bear"], ["peluk", "beanbag_playroom", "Beanbag"]]) it(id, name, "hias", "sudut", null, 0, { def: true, home: r });
  // ---- bawaan tahap 2 (denah.js): dulu ditempel langsung di ruangan, sekarang barang yang bisa digeser. Tanpa slot.
  it("kitchen_counter", "Kitchen counter", "fungsi", null, "makan", 0, { def: true, note: "Cupboards, a cutting board and the soup pot." });
  it("fridge", "Retro fridge", "fungsi", null, "makan", 0, { def: true, note: "Hums a little at night." });
  it("nightstand", "Nightstand lamp", "hias", null, null, 0, { def: true, note: "A small table with a warm lamp." });
  it("rubber_duck", "Rubber duck", "hias", null, null, 0, { def: true, note: "Squeaks." });
  it("shelf_jars", "Kitchen shelf", "hias", null, null, 0, { def: true, note: "Jars and a pot up high." });
  it("shelf_bath", "Bathroom shelf", "hias", null, null, 0, { def: true, note: "Jars and a little plant." });
  it("shelf_books", "Book shelf", "hias", null, null, 0, { def: true, note: "Books and a plant up high." });
  it("towel_rail", "Towel rail", "hias", null, null, 0, { def: true, note: "One fluffy towel." });
  it("garland", "Flag garland", "hias", null, null, 0, { def: true, note: "Little paper flags." });
  it("art_sun", "Sunrise print", "hias", "dinding", null, 60, { hias: 1, tags: ["seni"], note: "A warm orange sun." });
  it("art_mountain", "Mountain canvas", "hias", "dinding", null, 110, { hias: 2, tags: ["seni", "alam"], note: "Blue peaks and a tiny lake." });
  it("art_abstract", "Bold abstract", "hias", "dinding", null, 160, { hias: 2, tags: ["seni"], note: "Big shapes, loud colours." });
  it("art_family", "Family photo", "hias", "dinding", null, 90, { hias: 2, tags: ["keluarga"], note: "Everyone squeezed into one frame." });
  it("art_stars", "Star map", "hias", "dinding", null, 140, { hias: 2, tags: ["lampu", "buku"], note: "The night sky, with the names written in." });
  it("art_tapestry", "Woven tapestry", "hias", "dinding", null, 220, { hias: 3, tags: ["nyaman", "seni"], note: "Hand-woven, soft colours." });
  it("rug_stripe", "Striped rug", "hias", "lantai", null, 70, { hias: 1, tags: ["rapi"], note: "Neat stripes." });
  it("rug_shaggy", "Shaggy rug", "hias", "lantai", null, 130, { hias: 2, tags: ["nyaman"], note: "Toes sink right in." });
  it("rug_patch", "Patchwork rug", "hias", "lantai", null, 150, { hias: 2, tags: ["main", "seni"], note: "Every square a different colour." });
  it("rug_persian", "Garden rug", "hias", "lantai", null, 480, { hias: 3, tags: ["mewah"], note: "Old pattern of a garden. Very fine." });
  it("plant_fiddle", "Fiddle-leaf tree", "hias", "sudut", null, 90, { hias: 2, tags: ["alam"], note: "Big glossy leaves." });
  it("cactus_trio", "Cactus trio", "hias", "sudut", null, 50, { hias: 1, tags: ["alam", "rapi"], note: "Three small cacti. Hard to kill." });
  it("floor_lamp", "Floor lamp", "hias", "sudut", null, 120, { hias: 2, tags: ["lampu", "nyaman"], note: "A warm pool of light in the evening." });
  it("paper_lantern", "Paper lantern", "hias", "sudut", null, 80, { hias: 1, tags: ["lampu", "seni"], note: "A round paper lantern that glows." });
  it("globe_stand", "Floor globe", "hias", "sudut", null, 200, { hias: 2, tags: ["buku"], note: "Spin it and point." });
  it("aquarium", "Little aquarium", "hias", "sudut", null, 360, { hias: 3, tags: ["alam", "main"], note: "Two small fish and a castle." });

  const BY = Object.fromEntries(I.map(x => [x.id, x]));
  const item = id => BY[id] || null;
  // bawaan per ruangan dan slot
  const DEF = {};
  for (const r of ROOM_IDS) {
    DEF[r] = {};
    for (const s of SLOT_IDS) { const x = I.find(x => x.def && x.slot === s && (x.room === r || x.home === r)); DEF[r][s] = x ? x.id : null; }
  }
  const fits = (x, r, s) => !!x && x.slot === s && (x.room == null || x.room === r) && (!x.def || x.room === r || x.home === r);

  // ---------------------------------------------------------------- keadaan
  // P = { pasang: { ruang: { slot: id|null } }, gudang: { id: n }, beli: n }. Bawaan tidak pernah masuk gudang.
  const fresh = () => ({ pasang: {}, gudang: {}, beli: 0 });
  const peek = home => (home && home.world && home.world.perabot) || null;
  const S = home => home.world.perabot || (home.world.perabot = fresh());
  function placed(home, r, s) {
    const P = peek(home), R = P && P.pasang[r];
    return R && s in R ? R[s] : DEF[r][s];
  }
  function layout(home) {
    const out = {};
    for (const r of ROOM_IDS) { out[r] = {}; for (const s of SLOT_IDS) out[r][s] = placed(home, r, s); }
    return out;
  }
  const storage = home => Object.assign({}, (peek(home) || fresh()).gudang);
  const touched = home => { const P = peek(home); return !!(home && home.world && home.world.denah) || (!!P && (P.beli > 0 || Object.keys(P.pasang).length > 0)); };
  // tahap 2: rumah yang sudah punya denah (denah.js) nggak pakai slot lagi
  const hasPlan = home => !!(home && home.world && home.world.denah);
  const Denah = () => (typeof module !== "undefined") ? require("./denah.js") : globalThis.Denah;
  const canBuy = (c, day) => !!(c && c.st && typeof c.age === "function" && c.age(day) >= 180);

  // ---------------------------------------------------------------- aksi (dari Game._act0)
  function act(home, c, kind, day) {
    const [, verb, a, b, id] = kind.split(":");
    if (verb === "beli") {
      const x = item(a);
      if (!x || x.def || !canBuy(c, day)) return false;
      if (!Money.move(c, -x.price, "perabot", day, "need")) return false;
      const P = S(home); P.gudang[x.id] = (P.gudang[x.id] || 0) + 1; P.beli += 1;
      return true;
    }
    if (verb === "jual") {
      const x = item(a), P = peek(home);
      if (!x || x.def || !P || !(P.gudang[x.id] > 0) || !c || !c.st) return false;
      if (--P.gudang[x.id] <= 0) delete P.gudang[x.id];
      Money.move(c, Math.floor(x.price / 2), "perabot", day);
      return true;
    }
    if ((verb === "pasang" || verb === "simpan") && hasPlan(home)) return false;
    if (verb === "pasang") {
      const r = a, s = b, x = item(id);
      if (!ROOMS[r] || !SLOTS[s] || !fits(x, r, s)) return false;
      const now = placed(home, r, s);
      if (now === x.id) return false;
      const P = S(home);
      if (!x.def) { if (!(P.gudang[x.id] > 0)) return false; if (--P.gudang[x.id] <= 0) delete P.gudang[x.id]; }
      if (now && !item(now).def) P.gudang[now] = (P.gudang[now] || 0) + 1;
      (P.pasang[r] ||= {})[s] = x.id;
      return true;
    }
    if (verb === "simpan") {
      const r = a, s = b;
      if (!ROOMS[r] || !SLOTS[s] || !SLOTS[s].empty) return false;
      const now = placed(home, r, s);
      if (!now) return false;
      const P = S(home);
      if (!item(now).def) P.gudang[now] = (P.gudang[now] || 0) + 1;
      (P.pasang[r] ||= {})[s] = null;
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- selera dan suasana
  // Selera dari sifat (0-100, rata-rata 50). Hasil: tag -> +1 suka, -1 nggak suka. Cuma sifat yang jelas (>= 62 atau <= 38) yang ngomong.
  function taste(c) {
    const t = k => (c && c.traits && c.traits[k] != null) ? c.traits[k] : 50, out = {};
    const like = (tag, v) => { out[tag] = (out[tag] || 0) + v; };
    if (t("kreatif") >= 62) like("seni", 1); if (t("kreatif") <= 38) like("seni", -1);
    if (t("ramah") >= 62) like("keluarga", 1);
    if (t("setia") >= 62) like("keluarga", 1);
    if (t("impulsif") >= 62) like("main", 1); if (t("impulsif") <= 38) like("rapi", 1);
    if (t("rajin") >= 62) { like("rapi", 1); like("buku", 1); }
    if (t("penakut") >= 62) like("lampu", 1);
    if (t("ambisius") >= 62) like("mewah", 1); if (t("ambisius") <= 38) like("nyaman", 1);
    if (t("patuh") >= 62) like("rapi", 1);
    if (t("penakut") <= 38) like("alam", 1);
    for (const k of Object.keys(out)) out[k] = Math.max(-1, Math.min(1, out[k]));
    return out;
  }
  const likes = (c, x) => { if (!x || x.def) return 0; const T = taste(c); let v = 0; for (const g of x.tags) v += T[g] || 0; return Math.max(-1, Math.min(1, v)); };
  // suasana satu ruangan buat satu makhluk: nilai hias + selera. Bawaan = 0. Yang rajin/patuh tinggi nggak suka ruangan penuh hiasan.
  function ambience(home, c, r) {
    let v = 0, n = 0;
    for (const s of SLOT_IDS) {
      const x = item(placed(home, r, s));
      if (!x || x.def) continue;
      v += x.hias + likes(c, x); if (SLOTS[s].hias) n++;
    }
    const T = c ? taste(c) : {};
    if (n >= 3 && (T.rapi || 0) > 0) v -= 2;
    return Math.max(0, Math.min(10, v));
  }
  // dari suasana ke mood tambahan waktu rawat: 0-10 jadi 0-4
  const moodOf = a => Math.floor(a / 2.5);

  // ---------------------------------------------------------------- waktu rawat
  // Dipanggil Game sesudah efek rawat biasa. x = Ctx makhluk itu. when = "pagi" | "malam" | null. Satu kali per ruangan per hari.
  // Hasil: kalimat reaksi (barang baru pertama kali dilihat) atau null. Tanpa RNG.
  const ROOM_OF = { makan_p: "makan", makan_m: "makan", mandi: "mandi", tidur: "tidur", peluk: "peluk" };
  function onCare(home, c, x, care, day) {
    const r = ROOM_OF[care];
    if (!r || !touched(home)) return null;
    if (hasPlan(home)) return Denah().onCare(home, c, x, care, day);
    const when = care === "makan_p" ? "pagi" : care === "makan_m" ? "malam" : null;
    const D = c.info.perabot || (c.info.perabot = { d: null, r: [], lihat: [] });
    if (D.d !== day) { D.d = day; D.r = []; }
    if (D.r.includes(r)) return null;
    D.r.push(r);
    for (const s of ["utama", "samping"]) {
      const f = (item(placed(home, r, s)) || {}).fx;
      if (!f || (f.when && f.when !== when)) continue;
      if (f.mood) x.need("mood", f.mood);
      if (f.kes) x.stat("kesehatan", f.kes);
      if (f.bond) c.bond = Math.min(100, c.bond + f.bond * (1 - c.bond / 100));
      if (f.skill && c.st && c.st.skills && f.skill.k in c.st.skills) c.st.skills[f.skill.k] = Math.min(100, c.st.skills[f.skill.k] + f.skill.n);
    }
    const m = moodOf(ambience(home, c, r));
    if (m) x.need("mood", m);
    // reaksi pertama kali lihat barang baru (sekali per barang per makhluk)
    for (const s of SLOT_IDS) {
      const x2 = item(placed(home, r, s));
      if (!x2 || x2.def || D.lihat.includes(x2.id)) continue;
      D.lihat.push(x2.id);
      if (D.lihat.length > 60) D.lihat.splice(0, D.lihat.length - 60);
      const v = likes(c, x2), n = c.name;
      return v > 0 ? `${n} loves the new ${x2.name.toLowerCase()} and keeps looking at it.`
        : v < 0 ? `${n} gives the new ${x2.name.toLowerCase()} a long look. Not really their thing.`
          : `${n} notices the new ${x2.name.toLowerCase()}.`;
    }
    return null;
  }

  // ---------------------------------------------------------------- tampilan
  function view(home, c, r) {
    const G = storage(home);
    return {
      room: r, name: ROOMS[r].name, ambience: ambience(home, c, r), mood: moodOf(ambience(home, c, r)),
      slots: SLOT_IDS.map(s => {
        const id = placed(home, r, s), x = item(id);
        const options = I.filter(o => fits(o, r, s) && o.id !== id && (o.def || G[o.id] > 0)).map(o => ({ item: o, n: o.def ? null : G[o.id], likes: likes(c, o) }));
        return { slot: s, name: SLOTS[s].name, hias: SLOTS[s].hias, empty: SLOTS[s].empty, item: x, likes: likes(c, x), options,
          shop: I.filter(o => !o.def && fits(o, r, s)).map(o => ({ item: o, have: G[o.id] || 0, likes: likes(c, o) })) };
      }),
    };
  }
  // katalog buat Bazaar (tab Home): semua barang yang bisa dibeli, urut ruangan lalu harga
  const catalog = () => I.filter(x => !x.def).slice().sort((a, b) => (a.room ? ROOM_IDS.indexOf(a.room) : 9) - (b.room ? ROOM_IDS.indexOf(b.room) : 9) || a.price - b.price);
  const where = x => x.room ? ROOMS[x.room].name : "Any room";
  const tagNames = x => x.tags.map(g => TAGS[g]);

  const API = { ROOMS, ROOM_IDS, SLOTS, SLOT_IDS, TAGS, ITEMS: I, DEF, item, fits, fresh, placed, layout, storage, touched, canBuy, act, taste, likes, ambience, moodOf, onCare, view, catalog, where, tagNames };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Perabot = API;
})();

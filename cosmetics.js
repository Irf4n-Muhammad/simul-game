// Kosmetik (Blok A nomor 5): slot per permukaan, inventaris, edisi dan era, flag tradable, toko rotasi mingguan.
// Aturan: kosmetik cuma ngubah rupa. Nggak ada yang masuk simulasi, RNG, replay, ranking, atau angka apa pun;
// state.kosmetik nggak pernah dibaca engine.js/game.js. Ciri tetap makhluk (mata, bentuk telinga, ekor; pola bulu dan
// kilau gen emas tetap kelihatan di balik cat bulu) nggak punya slot. Barang prestasi (dari bintang, pencapaian,
// event dunia) diturunkan dari save, bukan disimpan, jadi nggak bisa hilang, dibeli, atau dipalsukan dari luar.
// Mata uang: "Buttons" (nama placeholder). Masuk cuma lewat toko Buttons (IAP, Blok B), iklan berhadiah (keputusan 8.4),
// hadiah event, dan tombol Dev. Nggak pernah dari main, nggak pernah beli koin, dadu, bintang, atau waktu.
"use strict";
(function () {
  const ERA = 1;                       // era berjalan; barang era lama jadi antik (tetap bisa dipakai, nggak dijual lagi)
  const WEEK = 7 * 86400000;
  const CURRENCY = { id: "buttons", label: "Buttons", ic: "🔘" };
  // slot per permukaan. on: makhluk | rumah | pet. soon: ada di data, belum ada barang dan tampilannya
  const SLOTS = {
    bulu: { label: "Fur", on: "makhluk", note: "A dye. Pattern and sparkle show through." },
    kepala: { label: "Head", on: "makhluk" },
    muka: { label: "Face", on: "makhluk", note: "Never covers the eyes." },
    leher: { label: "Neck", on: "makhluk" },
    badan: { label: "Outfit", on: "makhluk" },
    aksesori: { label: "Accessory", on: "makhluk" },
    dinding: { label: "Walls", on: "rumah" },
    lantai: { label: "Floor", on: "rumah" },
    perabot: { label: "Furniture", on: "rumah", soon: true },
    pajangan: { label: "Display", on: "rumah", soon: true },
    kalung: { label: "Pet collar", on: "pet", soon: true },
  };
  // ciri tetap: nggak ada slot yang nyentuh ini (usulan, nunggu keputusan 8.5 di rencana-besar.md)
  const LOCKED = ["mata", "telinga", "ekor", "pola", "kilau gen emas"];
  const EDITIONS = { reguler: "", terbatas: "Limited", prestasi: "Earned", event: "Event", hadiah: "Gift" };

  // ---------------------------------------------------------------- katalog placeholder
  // ed: reguler (toko, rotasi mingguan) | terbatas (toko, jendela pendek) | prestasi (diturunkan dari bintang/pencapaian)
  //     | event (diturunkan dari event dunia yang dihadiri) | hadiah (semua orang punya)
  // tradable: nanti boleh dijual di Bazaar antar pemain (Blok B). Barang prestasi/hadiah nggak pernah.
  // fisik: bisa jadi bagian figur fisik (rencana 5A, katalog "bisa jadi bagian"). gear/ach: sumber barang prestasi.
  const I = [];
  const it = (id, slot, label, o) => I.push(Object.assign({ id, slot, label, ed: "reguler", era: ERA, harga: 0, tradable: false, fisik: true, look: {} }, o));
  for (const [k, l, c] of [["mint", "Mint", 0xBFE3D0], ["lavender", "Lavender", 0xCDBFE8], ["peach", "Peach", 0xF2C7A8], ["sky", "Sky", 0xB9D4EE], ["moss", "Moss", 0xA9BE8F], ["rose", "Rose", 0xEFB7C6], ["cocoa", "Cocoa", 0x8E6A58], ["snow", "Snow", 0xF4F1EC]])
    it("dye_" + k, "bulu", l + " dye", { harga: 30, look: { color: c } });
  it("dye_midnight", "bulu", "Midnight dye", { ed: "terbatas", harga: 70, look: { color: 0x3E4668 } });
  it("party_hat", "kepala", "Party hat", { harga: 40, look: { shape: "cone", color: 0xE0645A, color2: 0xF2C94C } });
  it("beanie", "kepala", "Beanie", { harga: 40, look: { shape: "beanie", color: 0x5B9BD5, color2: 0xF4F1EC } });
  it("straw_hat", "kepala", "Straw hat", { harga: 50, look: { shape: "straw", color: 0xE3C98A, color2: 0xC8674F } });
  it("bucket_hat", "kepala", "Bucket hat", { harga: 45, look: { shape: "bucket", color: 0x9DAE95 } });
  it("top_hat", "kepala", "Top hat", { harga: 60, look: { shape: "tophat", color: 0x2B2A30, color2: 0xC8674F } });
  it("hair_bow", "kepala", "Hair bow", { harga: 30, look: { shape: "bow", color: 0xE0645A } });
  it("flower_crown", "kepala", "Flower crown", { ed: "terbatas", harga: 80, look: { shape: "flowercrown", color: 0xF29BB0, color2: 0xA9BE8F } });
  it("crown", "kepala", "Little crown", { ed: "terbatas", harga: 120, tradable: true, look: { shape: "crown", color: 0xF2C94C, color2: 0xE0645A } });
  it("lantern_halo", "kepala", "Lantern halo", { ed: "event", dari: "Lantern Night", look: { shape: "halo", color: 0xF6D365 } });
  it("beret", "kepala", "Painter's beret", { ed: "prestasi", dari: "Spark stars", gear: "beret", look: { shape: "beret", color: 0x41507E } });
  it("headband", "kepala", "Athlete's headband", { ed: "prestasi", dari: "Body stars", gear: "headband", look: { shape: "headband", color: 0xD9534F } });
  it("founders_cap", "kepala", "Founders' cap", { ed: "terbatas", era: 0, harga: 0, tradable: true, dari: "Era 0, before launch", look: { shape: "bucket", color: 0x41507E } });
  it("round_glasses", "muka", "Round glasses", { harga: 35, look: { shape: "glasses", color: 0xC8674F } });
  it("sunglasses", "muka", "Sunglasses", { harga: 45, look: { shape: "sunglasses", color: 0x2B2A30 } });
  it("heart_glasses", "muka", "Heart glasses", { ed: "terbatas", harga: 60, look: { shape: "glasses", color: 0xE0645A } });
  it("monocle", "muka", "Monocle", { ed: "terbatas", harga: 70, tradable: true, look: { shape: "monocle", color: 0xB8945A } });
  it("glasses", "muka", "Scholar's glasses", { ed: "prestasi", dari: "Mind stars", gear: "glasses", look: { shape: "glasses", color: 0x2B2A30 } });
  it("welcome_bow", "leher", "Welcome bow", { ed: "hadiah", dari: "A gift for every new family", look: { shape: "bowtie", color: 0xE58A8A } });
  it("red_scarf", "leher", "Red scarf", { harga: 35, look: { shape: "scarf", color: 0xC8674F } });
  it("bow_tie", "leher", "Bow tie", { harga: 30, look: { shape: "bowtie", color: 0x2B2A30 } });
  it("bell_collar", "leher", "Bell collar", { harga: 40, look: { shape: "bell", color: 0xD9534F, color2: 0xF2C94C } });
  it("pearls", "leher", "Pearl necklace", { ed: "terbatas", harga: 90, tradable: true, look: { shape: "pearls", color: 0xF4F1EC } });
  it("striped_tee", "badan", "Striped tee", { harga: 50, look: { shape: "tee", color: 0xF4F1EC, color2: 0x5B9BD5 } });
  it("sweater", "badan", "Cozy sweater", { harga: 55, look: { shape: "tee", color: 0xD99A6C } });
  it("raincoat", "badan", "Yellow raincoat", { harga: 55, look: { shape: "coat", color: 0xF2C94C } });
  it("overalls", "badan", "Overalls", { harga: 60, look: { shape: "overalls", color: 0x5B7FB5 } });
  it("cape", "badan", "Hero cape", { ed: "terbatas", harga: 100, tradable: true, look: { shape: "cape", color: 0xC8674F } });
  it("founder_sash", "badan", "Founder's sash", { ed: "prestasi", dari: "Founded a company", ach: "founded", look: { shape: "sash", color: 0xB8945A } });
  it("flower", "aksesori", "Heart flower", { ed: "prestasi", dari: "Heart stars", gear: "flower", look: { shape: "flower", color: 0xF29BB0 } });
  it("balloon", "aksesori", "Balloon", { harga: 30, look: { shape: "balloon", color: 0xE0645A } });
  it("tote_bag", "aksesori", "Tote bag", { harga: 40, look: { shape: "bag", color: 0xE3C98A } });
  it("first_job_badge", "aksesori", "First-job badge", { ed: "prestasi", dari: "First job", ach: "first_job", look: { shape: "badge", color: 0x5B9BD5 } });
  it("self_made_pin", "aksesori", "Self-made pin", { ed: "prestasi", dari: "Self-made", ach: "self_made", look: { shape: "badge", color: 0xF2C94C } });
  it("rain_umbrella", "aksesori", "Rain Week umbrella", { ed: "event", dari: "Rain Week", look: { shape: "umbrella", color: 0x5B9BD5 } });
  it("walls_mint", "dinding", "Mint walls", { harga: 60, fisik: false, look: { color: 0xCFE6D6 } });
  it("walls_blush", "dinding", "Blush walls", { harga: 60, fisik: false, look: { color: 0xF1D6D0 } });
  it("walls_night", "dinding", "Night-sky walls", { ed: "terbatas", harga: 90, fisik: false, look: { color: 0x8C93B8 } });
  it("floor_honey", "lantai", "Honey floor", { harga: 60, fisik: false, look: { color: 0xE2B873 } });
  it("floor_slate", "lantai", "Slate floor", { harga: 60, fisik: false, look: { color: 0x8F969D } });
  it("floor_grass", "lantai", "Grass rug", { ed: "terbatas", harga: 90, fisik: false, look: { color: 0xA9C98B } });
  const BY = Object.fromEntries(I.map(x => [x.id, x]));
  for (const x of I) if (!SLOTS[x.slot]) throw new Error("slot kosmetik nggak dikenal: " + x.slot);

  // ---------------------------------------------------------------- state
  // state.kosmetik = { v, saldo, inv: { id: { n, dapat, dari } }, pakai: { cid: { slot: id | null } }, rumah: { slot: id }, buku: [] }
  // pakai[cid][slot] === undefined berarti "belum pernah dipilih": barang prestasi dari bintang dipakai otomatis.
  const fresh = () => ({ v: 1, saldo: 0, inv: {}, pakai: {}, rumah: {}, buku: [] });
  const K = state => state.kosmetik || (state.kosmetik = fresh());
  const peek = state => (state && state.kosmetik) || fresh();
  const antique = x => x.era < ERA;
  const tags = x => [EDITIONS[x.ed] || "", antique(x) ? "Antique" : "", x.tradable ? "Tradable" : ""].filter(Boolean);
  const treeMod = () => globalThis.Tree || (typeof require === "function" ? (() => { try { return require("./tree.js"); } catch (e) { return null; } })() : null);

  // barang yang diturunkan dari save (nggak disimpan): hadiah buat semua, bintang dan pencapaian makhluk ini, event dunia yang dihadiri
  function earnedOf(c, home, state) {
    const out = {};
    for (const x of I) if (x.ed === "hadiah") out[x.id] = "gift";
    const T = treeMod();
    if (c && c.st && T) for (const g of T.gearOf(c)) for (const x of I) if (x.gear === g) out[x.id] = "stars";
    if (c && c.st) for (const a of c.st.ach || []) for (const x of I) if (x.ach === a.id) out[x.id] = "achievement";
    const hadir = new Set((state && state.hadir) || []), W = (home && home.world && home.world.events) || [];
    for (const e of W) if (e.hadiah && BY[e.hadiah]) for (let d = e.mulai; d <= e.selesai; d++) if (hadir.has(d)) { out[e.hadiah] = "event"; break; }
    return out;
  }
  function owned(state, c, home) {
    const S = peek(state), out = {};
    for (const [id, v] of Object.entries(S.inv)) if (BY[id]) out[id] = Object.assign({ n: 1 }, v);
    for (const [id, dari] of Object.entries(earnedOf(c, home, state))) if (!out[id]) out[id] = { n: 1, dari, earned: true };
    return out;
  }
  const has = (state, c, home, id) => !!owned(state, c, home)[id];
  function wearing(state, cid, c, home) {
    const P = peek(state).pakai[cid] || {}, own = owned(state, c, home), out = {};
    for (const s of Object.keys(SLOTS)) {
      if (SLOTS[s].on !== "makhluk") continue;
      let id = P[s];
      if (id === undefined) id = Object.keys(own).find(k => BY[k].slot === s && BY[k].gear && own[k].earned) || null;
      out[s] = id && own[id] && BY[id].slot === s && !SLOTS[s].soon ? id : null;
    }
    return out;
  }
  function wear(state, cid, slot, id, c, home) {
    if (!SLOTS[slot] || SLOTS[slot].on !== "makhluk" || SLOTS[slot].soon) return false;
    if (id != null) { const x = BY[id]; if (!x || x.slot !== slot || !has(state, c, home, id)) return false; }
    (K(state).pakai[cid] ||= {})[slot] = id == null ? null : id;
    return true;
  }
  function homeLook(state) {
    const S = peek(state), own = owned(state, null, null), out = {};
    for (const s of Object.keys(SLOTS)) if (SLOTS[s].on !== "makhluk") { const id = S.rumah[s]; out[s] = id && own[id] && BY[id].slot === s && !SLOTS[s].soon ? id : null; }
    return out;
  }
  function setHome(state, slot, id) {
    if (!SLOTS[slot] || SLOTS[slot].on === "makhluk" || SLOTS[slot].soon) return false;
    if (id != null) { const x = BY[id]; if (!x || x.slot !== slot || !has(state, null, null, id)) return false; }
    K(state).rumah[slot] = id == null ? null : id;
    return true;
  }

  // ---------------------------------------------------------------- toko: rotasi mingguan, sama buat semua orang (minggu kalender)
  // Nanti jadwalnya dari server (Blok B); sekarang acak-tapi-tetap dari nomor minggu. Barang era lama nggak pernah muncul.
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const week = (ts = Date.now()) => Math.floor(ts / WEEK);
  function shop(ts = Date.now(), state) {
    const w = week(ts), r = rng(w * 7919 + 17), S = peek(state);
    const pick = (arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
    const items = pick(I.filter(x => x.era === ERA && x.ed === "reguler"), 8).concat(pick(I.filter(x => x.era === ERA && x.ed === "terbatas"), 2));
    const order = Object.keys(SLOTS);
    items.sort((a, b) => (a.ed === "terbatas") - (b.ed === "terbatas") || order.indexOf(a.slot) - order.indexOf(b.slot));
    return { week: w, ends: (w + 1) * WEEK, items: items.map(x => ({ item: x, owned: !!S.inv[x.id], can: !S.inv[x.id] && S.saldo >= x.harga })) };
  }
  function note(S, apa, id, d, ts) { S.buku.push({ t: ts, apa, id: id || null, d, saldo: S.saldo }); if (S.buku.length > 200) S.buku.splice(0, S.buku.length - 200); }
  function buy(state, id, ts = Date.now()) {
    const S = K(state), x = BY[id];
    if (!x) return { ok: false, why: "unknown" };
    if (!shop(ts, state).items.some(e => e.item.id === id)) return { ok: false, why: "not_in_shop" };
    if (S.inv[id]) return { ok: false, why: "owned" };
    if (S.saldo < x.harga) return { ok: false, why: "saldo" };
    S.saldo -= x.harga; S.inv[id] = { n: 1, dapat: ts, dari: "toko", minggu: week(ts) };
    note(S, "beli", id, -x.harga, ts);
    return { ok: true };
  }
  function grant(state, id, dari = "dev", ts = Date.now()) { const S = K(state); if (!BY[id] || S.inv[id]) return false; S.inv[id] = { n: 1, dapat: ts, dari }; note(S, dari, id, 0, ts); return true; }
  function topUp(state, n, dari = "dev", ts = Date.now()) { const S = K(state); n = Math.round(Number(n) || 0); S.saldo = Math.max(0, S.saldo + n); note(S, dari, null, n, ts); return S.saldo; }
  const reset = state => { if (state) delete state.kosmetik; };

  const API = { ERA, WEEK, CURRENCY, SLOTS, LOCKED, EDITIONS, ITEMS: I, item: id => BY[id] || null, list: slot => I.filter(x => x.slot === slot), tags, antique,
    fresh, owned, has, earnedOf, wearing, wear, homeLook, setHome, week, shop, buy, grant, topUp, reset,
    saldo: s => peek(s).saldo, ledger: s => peek(s).buku.slice(), gearItem: g => I.find(x => x.gear === g) || null };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Cosmetics = API;
})();

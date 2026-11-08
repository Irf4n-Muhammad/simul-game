// jadwal.js (v83): pemain ngisi blok waktu bebas makhluknya. Diputusin 8 Nov.
// Hari dibagi 4 blok (ilmu.js): hari sekolah/kerja cuma Sore yang bebas, akhir pekan Pagi, Siang, Sore bebas, Malam selalu di rumah.
// Pemain pasang rencana mingguan per blok ("jadwal:<hari><blok>:<kegiatan>", berlaku terus sampai diganti, seperti aturan rumah).
// Kegiatan = kegiatan agenda biasa (Play with friends, Rest, ...) atau kegiatan topik pohon (Draw, Play chess, Cook, ...).
// Rencana pemain selalu jalan (v83); kalau dia nggak suka, mood dan minatnya yang turun. Blok yang kosong dia isi sendiri sesuai minatnya.
// Kegiatan topik nambah sedikit ke jalurnya di pohon (jauh lebih kecil dari les, mentok di 35) dan pelan-pelan ngubah minatnya.
// Blok yang kepakai les nggak bisa diisi. Hidup cuma kalau home.ilmu_from aktif, jadi save lama nggak berubah.
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const T = (typeof module !== "undefined") ? require("./tree.js") : globalThis.Tree;
  const AG = (typeof module !== "undefined") ? require("./agenda.js") : globalThis.Agenda;
  const IL = (typeof module !== "undefined") ? require("./ilmu.js") : globalThis.Ilmu;
  const { HOOKS, seed_rng, phase_of } = E;
  const N = T.NODES;

  // ---------------------------------------------------------------- kegiatan topik
  // id: [label, simpul pohon, teks, energi, umur paling muda (fase)]
  const K = (label, node, text, energi = -6, from = "anak", ic = "") => ({ label, node, text, energi, from, ic });
  const TOPIK = {
    bola: K("Kick a ball around", "ball", "{n} kicks a ball around the park until it's dark.", -10, "anak", "⚽"),
    renang: K("Swim", "water", "{n} splashes up and down the pool.", -10, "anak", "🏊"),
    lari: K("Go for a run", "track", "{n} races around the block, red-faced and grinning.", -10, "anak", "🏃"),
    masak: K("Cook something", "cooking", "{n} makes something in the kitchen. It's mostly edible.", -6, "anak", "🍳"),
    rakit: K("Build something", "building", "{n} hammers together something wobbly out of scrap wood.", -6, "anak", "🔨"),
    kebun: K("Garden", "gardening", "{n} digs in the garden and comes back with muddy knees.", -4, "anak", "🌱"),
    alam: K("Explore outside", "outdoors", "{n} wanders off to explore and comes back with a pocket of rocks.", -8, "anak", "🧭"),
    sains: K("Science kit", "lab", "{n} mixes things in jars to see what fizzes.", -6, "anak", "🧪"),
    tubuh: K("Bug and plant hunt", "medicine", "{n} studies a beetle with a magnifying glass for an hour.", -6, "anak", "🔍"),
    koding: K("Tinker with code", "engineering", "{n} types away, making a little program do a little thing.", -4, "remaja", "💻"),
    catur: K("Play chess", "strategy", "{n} plays chess, frowning at the board.", -3, "anak", "♟️"),
    teka: K("Puzzles & number games", "data", "{n} does puzzle after puzzle.", -3, "anak", "🧩"),
    tulis: K("Write stories", "writing", "{n} fills a notebook with a story.", -3, "anak", "✍️"),
    debat: K("Debate club", "law", "{n} argues the other side of everything, just for practice.", -4, "remaja", "🗣️"),
    gambar: K("Draw", "painting", "{n} draws all afternoon, tongue sticking out.", -3, "anak", "🎨"),
    desain: K("Make posters", "design", "{n} designs a poster for nothing in particular.", -3, "remaja", "🖍️"),
    musik: K("Play an instrument", "instrument", "{n} practices an instrument. The neighbours are patient.", -4, "anak", "🎸"),
    nyanyi: K("Sing", "voice", "{n} sings along to everything.", -3, "anak", "🎤"),
    dansa: K("Dance", "rhythm", "{n} dances around the living room.", -8, "anak", "💃"),
    film: K("Make little films", "film", "{n} films a tiny movie starring the furniture.", -4, "anak", "🎬"),
    game: K("Play video games", "games", "{n} plays games for hours.", -2, "anak", "🎮"),
    pramuka: K("Scout outing", "team", "{n} goes on an outing with the scouts.", -8, "anak", "🏕️"),
    pidato: K("Practice speeches", "public", "{n} gives a speech to the mirror.", -3, "remaja", "📣"),
  };
  const AG_IC = { main: "🧸", dongeng: "📖", jalan: "🚶", tidur_siang: "😴", belajar: "📚", teman: "👫", latihan: "⭐", olahraga: "🤸", bantu_rumah: "🧺", bebas: "🎈",
    kerja_keras: "💼", cari_kerja: "📨", sosial: "🥂", pasangan: "💞", keluarga: "👨‍👧", hobi: "🎯", istirahat: "🛋️", jalan_pagi: "🌅", cucu: "👵", kenangan: "📷" };
  // efek kegiatan biasa dalam satuan yang sama dengan hobi (dari agenda.js dan GAIN di status.js), buat ditulis di kotaknya
  const AG_FX = {
    main: { mood: 4, sk: { creativity: 0.1, fitness: 0.05 } }, dongeng: { sk: { logic: 0.12 } }, jalan: { sk: { fitness: 0.08, charm: 0.04 } }, tidur_siang: { energi: 20 },
    belajar: { mood: -2, sk: { logic: 0.22 } }, teman: { mood: 4, sk: { charm: 0.22 } }, latihan: { sk: { creativity: 0.25 } }, olahraga: { energi: -8, sk: { fitness: 0.25 } },
    bantu_rumah: { sk: { fitness: 0.08, charm: 0.05 } }, bebas: { mood: 6, sk: { creativity: 0.12 } }, kerja_keras: { mood: -3 }, cari_kerja: { mood: -1, sk: { charm: 0.05 } },
    sosial: { mood: 4, sk: { charm: 0.2 } }, pasangan: { sk: { charm: 0.08 } }, keluarga: { sk: { charm: 0.08 } }, hobi: { sk: { creativity: 0.18 } },
    istirahat: { energi: 15 }, jalan_pagi: { sk: { fitness: 0.06 } }, cucu: { mood: 5, sk: { charm: 0.05 } }, kenangan: { mood: 3 } };
  const SK_LBL = { logic: "Logic", fitness: "Fitness", charm: "Charm", creativity: "Creativity" };
  const STAR_AT = { field: 10, spec: 25 };
  const ORDER_PH = ["bayi", "anak", "remaja", "dewasa", "tua"];
  const LEARN = 0.45, CAP = 35;              // kegiatan bebas: kecil, dan nggak bisa bawa jalurnya jauh tanpa les
  const SKILL_OF = { body: "fitness", mind: "logic", spark: "creativity", heart: "charm" };
  const moodOf = mi => mi >= 55 ? 3 : mi >= 35 ? 1 : mi >= 20 ? -3 : -5;   // nggak suka tapi tetap dijalanin: mood turun
  const fieldOf = id => N[id].tier === "field" ? id : N[id].field;

  // ---------------------------------------------------------------- blok
  const on = (home, day) => home.ilmu_from != null && day >= home.ilmu_from;
  const wk = day => day % 7 >= 1 && day % 7 <= 5;
  const MAIN = day => wk(day) ? "sore" : "siang";          // blok yang sama dengan "kegiatan hari ini" di agenda.js
  const freeBlocks = day => wk(day) ? ["sore"] : ["pagi", "siang", "sore"];
  const keyOf = (day, b) => `${day % 7}${b}`;
  const classIn = (c, day, b) => {
    const I = c.st && c.st.ilmu; if (!I) return null;
    return I.kursus.find(k => k.n < IL.SESI.length && k.slot != null && IL.SLOTS[k.slot].blok === b && IL.schedule(k).includes(day)) || null;
  };

  // pilihan yang boleh dipasang di blok ini buat makhluk ini (agenda umurnya + topik yang umurnya cukup)
  function choices(c, day) {
    const ph = phase_of(c.age(day)), A = AG.AGENDA[ph] || {};
    const ag = Object.entries(A).filter(([id]) => !["kerja_sambilan"].includes(id)).map(([id, a]) => ({ id, label: a.label, kind: "agenda" }));
    if (ph === "bayi") return ag;
    const tp = Object.entries(TOPIK).filter(([, t]) => N[t.node] && ORDER_PH.indexOf(ph) >= ORDER_PH.indexOf(t.from)).map(([id, t]) => ({ id: "t." + id, label: t.label, kind: "topik", node: t.node }));
    return ag.concat(tp);
  }
  // rekomendasi buat pemain: topik yang dia suka dan yang lagi jalan (les, nilai jalur), dikurangi kalau capek (sore sesudah sekolah)
  function recommend(c, day, b, n = 3) {
    const I = IL.il(c.st), after = wk(day) && b === "sore";
    const les = new Set(I.kursus.filter(k => k.n < IL.SESI.length).map(k => IL.COURSES[k.id].field));
    return choices(c, day).filter(o => o.kind === "topik").map(o => {
      const t = TOPIK[o.id.slice(2)], f = fieldOf(t.node), mi = IL.minatOf(c, f), v = IL.eff(I, t.node);
      const s = mi + Math.min(v, CAP) * 0.6 + (les.has(f) ? 12 : 0) + (after && t.energi <= -8 ? -10 : 0);
      const why = les.has(f) ? `goes with the ${N[f].label.toLowerCase()} class` : mi >= 55 ? `${IL.MINAT_WORD(mi)}` : v >= 10 ? `already at ${Math.round(v)} in ${N[t.node].label}` : `${IL.MINAT_WORD(mi)}`;
      return { ...o, score: s, minat: mi, v: Math.round(v), why };
    }).sort((a, b2) => (b2.score - a.score) || (a.id < b2.id ? -1 : 1)).filter((o, i, A) => A.findIndex(p => fieldOf(p.node) === fieldOf(o.node)) === i).slice(0, n);   // satu per topik umum biar beragam
  }

  // ---------------------------------------------------------------- jalanin satu blok
  function doTopik(x, tid, how) {
    const c = x.c, t = TOPIK[tid], I = IL.il(c.st), f = fieldOf(t.node), mi = IL.minatOf(c, f);
    x.need("energi", t.energi);
    x.need("mood", moodOf(mi));
    const cur = I.v[t.node] ?? IL.eff(I, t.node);
    if (cur < CAP) {
      const tal = 0.6 + ((c.st.genes.talent[SKILL_OF[N[t.node].root]] || 5) - 1) / 9;
      I.v[t.node] = Math.round(Math.min(CAP, cur + LEARN * tal * (0.5 + mi / 140)) * 100) / 100; I.ver = (I.ver || 0) + 1;
    }
    const sk = SKILL_OF[N[t.node].root]; if (c.st.skills && sk in c.st.skills) c.st.skills[sk] = Math.min(100, c.st.skills[sk] + 0.06);
    // minat: dipilih sendiri bikin makin suka, disuruh padahal nggak suka bikin makin males
    I.minat[f] = Math.max(0, Math.min(100, mi + (how === "sendiri" ? 0.6 : mi < 30 ? -0.8 : 0.3)));
    return t.text.replace("{n}", x.n);
  }
  function doAgenda(x, id) {
    const a = (AG.AGENDA[x.phase] || {})[id]; if (!a || !a.cond(x)) return null;
    a.effect(x);
    return a.text.replace("{n}", x.n);
  }
  // pilihan sendiri buat blok tambahan akhir pekan: topik yang paling dia suka, atau istirahat kalau capek
  function selfTopik(x) {
    const c = x.c, rng = seed_rng(c.id, x.day, "blok", x._blok || "");
    const opts = choices(c, x.day).filter(o => o.kind === "topik");
    if (!opts.length) return null;
    const w = opts.map(o => { const m = IL.minatOf(c, fieldOf(o.node)); return Math.max(1, m - 20) ** 1.6; });
    return rng.choices(opts, w)[0].id.slice(2);
  }
  // satu blok: rencana pemain (bisa ditolak) atau pilihan sendiri
  // catatan 7 hari terakhir per blok (buat papan minggu: ✓ jalan, ✗ nolak, 💤 capek)
  function mark(I, day, b, id, how) {
    const L = (I.blog ||= {});
    (L[day] ||= {})[b] = { id, how };
    for (const k of Object.keys(L)) if (+k < day - 7) delete L[k];
  }
  function runBlock(x, b, main, agendaFn) {
    const c = x.c, plan = (c.info.jadwal || {})[keyOf(x.day, b)], I = IL.il(c.st);
    x._blok = b;
    const tired = c.needs.energi < 15;
    let tid = null, aid = null, how = "sendiri";
    if (plan && tired) how = "capek";
    else if (plan) { how = "nurut"; if (plan.startsWith("t.")) tid = plan.slice(2); else aid = plan; }   // v83: rencana pemain selalu jalan
    const miss = how === "kabur" ? ` The plan was "${labelOf(plan)}", but ${x.n} wanted something else.` : how === "capek" ? ` Too tired for "${labelOf(plan)}".` : "";
    if (main && !tid && !aid) {
      // blok utama tanpa rencana yang jalan: agenda.js yang milih sesuai sifatnya
      const keep = c.info.rencana; c.info.rencana = null;
      agendaFn(x);
      c.info.rencana = keep;
      if (miss) x.say(`_${miss.trim()}_`);
      mark(I, x.day, b, c.info.agenda_hari && c.info.agenda_hari.hari === x.day ? c.info.agenda_hari.id : null, how);
      return;
    }
    if (!tid && !aid) {
      if (tired) { x.need("energi", 6); mark(I, x.day, b, "istirahat", how); if (miss) x.say(`_${BLOK_CAP[b]}:${miss}_`); return; }
      tid = selfTopik(x);
      if (!tid) return;
    }
    let text;
    if (tid) text = doTopik(x, tid, how);
    else {
      const a = (AG.AGENDA[x.phase] || {})[aid]; text = doAgenda(x, aid);
      if (text && main) x.boost = a.boost;
      // blok tambahan: skill dasarnya ditambah di sini (blok utama dapat dari status.js lewat agenda_hari)
      else if (text && c.st.skills) for (const [k, v] of Object.entries((AG_FX[aid] || {}).sk || {})) if (k in c.st.skills) c.st.skills[k] = Math.min(100, c.st.skills[k] + v);
    }
    if (!text) return;
    const id = tid ? "t." + tid : aid;
    if (main) c.info.agenda_hari = { hari: x.day, id, label: labelOf(id), how: how === "nurut" ? "nurut" : "sendiri" };
    x.say(`_${BLOK_CAP[b]}: ${text}${miss}_`);
    mark(I, x.day, b, id, how);
  }
  const BLOK_CAP = { pagi: "Morning", siang: "Midday", sore: "Afternoon" };
  function labelOf(id) {
    if (!id) return "";
    if (id.startsWith("t.")) return TOPIK[id.slice(2)] ? TOPIK[id.slice(2)].label : id;
    for (const ph of ORDER_PH) if (AG.AGENDA[ph] && AG.AGENDA[ph][id]) return AG.AGENDA[ph][id].label;
    return id;
  }

  // ---------------------------------------------------------------- hook harian
  const _agenda = HOOKS.agenda;
  HOOKS.agenda = x => {
    const c = x.c;
    if (!c.st || !on(x.home, x.day) || x.phase === "bayi" || (x.phase === "anak" && x.has("libur")) || (x.phase === "remaja" && (x.has("study_tour") || x.has("ujian_pekan")))) return _agenda && _agenda(x);
    const main = MAIN(x.day);
    for (const b of freeBlocks(x.day)) {
      if (classIn(c, x.day, b)) { if (b === main && _agenda) _agenda(x); continue; }   // ilmu.js yang ngurus blok les (Sore hari kerja)
      runBlock(x, b, b === main, y => { if (_agenda) _agenda(y); });
    }
  };

  // tindakan pemain "jadwal:<hari><blok>:<kegiatan>" (kegiatan kosong = terserah makhluknya)
  const _act = HOOKS.act;
  HOOKS.act = (home, cid, kind, day) => {
    if (!kind.startsWith("jadwal:")) return _act ? _act(home, cid, kind, day) : undefined;
    const c = home.get(cid), [, key, id] = kind.split(":");
    if (!c || !c.st || !on(home, day) || !/^[0-6](pagi|siang|sore)$/.test(key)) return false;
    const dow = +key[0], b = key.slice(1);
    if (!(dow >= 1 && dow <= 5 ? ["sore"] : ["pagi", "siang", "sore"]).includes(b)) return false;
    if (id && !choices(c, day).some(o => o.id === id)) return false;
    const J = (c.info.jadwal ||= {});
    if (id) J[key] = id; else delete J[key];
    return true;
  };

  // ---------------------------------------------------------------- tampilan: minggu (7 hari × 4 blok)
  function week(c, mon, today) {
    const I = c.st && c.st.ilmu;
    return [...Array(7)].map((_, i) => {
      const day = mon + i, base = IL.dayBlocks(c, day);
      return base.map(x => {
        if (x.kind !== "free") return { ...x, day };
        const key = keyOf(day, x.b), plan = (c.info.jadwal || {})[key];
        const done = I && I.blog && I.blog[day] && day <= today ? I.blog[day][x.b] : null;
        return { ...x, day, key, plan: plan || null, tx: plan ? labelOf(plan) : "Up to " + c.name, ic: plan ? info(c, plan, day).ic : "", done: done ? { ...done, label: labelOf(done.id), ic: done.id ? info(c, done.id, day).ic : "" } : null };
      });
    });
  }

  // detail satu pilihan buat lembar pilih: ikon, jalurnya, energi, reaksi makhluknya
  const REACT = (mi, l) => mi >= 75 ? `I love ${l.toLowerCase()}!` : mi >= 55 ? `${l}? Yes!` : mi >= 35 ? "Okay, sure." : mi >= 20 ? "Do I have to?" : "Ugh, no...";
  function info(c, id, day) {
    if (!id) return { id: "", ic: "🎲", label: "Up to " + c.name };
    if (id.startsWith("t.")) {
      const t = TOPIK[id.slice(2)], I = IL.il(c.st), f = fieldOf(t.node), mi = IL.minatOf(c, f);
      const tal = 0.6 + ((c.st.genes.talent[SKILL_OF[N[t.node].root]] || 5) - 1) / 9, v = IL.eff(I, t.node);
      const per = v >= CAP ? 0 : Math.round(LEARN * tal * (0.5 + mi / 140) * 10) / 10, mood = moodOf(mi);
      const star = STAR_AT[N[t.node].tier], left = star && v < star && per > 0 ? Math.ceil((star - v) / per) : null;
      return { id, ic: t.ic, label: t.label, kind: "topik", root: N[t.node].root, node: t.node, nodeLabel: N[t.node].label, v: Math.round(v), cap: CAP,
        energi: t.energi, mood, per, star, left, minat: mi, word: IL.MINAT_WORD(mi), react: REACT(mi, t.label), love: mi >= 55,
        fx: { path: per ? { [N[t.node].label]: per } : {}, energi: t.energi, mood, sk: { [SKILL_OF[N[t.node].root]]: 0.06 } } };
    }
    const F = AG_FX[id] || {};
    return { id, ic: AG_IC[id] || "•", label: labelOf(id), kind: "agenda", fx: { path: {}, energi: F.energi || 0, mood: F.mood || 0, sk: F.sk || {} } };
  }
  // total efek seminggu dari rencana yang dipasang (blok kosong nggak dihitung: itu pilihan makhluknya)
  function weekFx(c, day) {
    const J = c.info.jadwal || {}, out = { path: {}, energi: 0, mood: 0, sk: {}, n: 0 };
    for (const k of ALL_KEYS) {
      if (!J[k]) continue;
      const f = info(c, J[k], day).fx; out.n++;
      for (const [a, v] of Object.entries(f.path)) out.path[a] = Math.round(((out.path[a] || 0) + v) * 10) / 10;
      for (const [a, v] of Object.entries(f.sk)) out.sk[a] = Math.round(((out.sk[a] || 0) + v) * 100) / 100;
      out.energi += f.energi; out.mood += f.mood;
    }
    return out;
  }
  const ALL_KEYS = [1, 2, 3, 4, 5].map(d => d + "sore").concat([6, 0].flatMap(d => ["pagi", "siang", "sore"].map(b => d + b)));

  const API = { TOPIK, CAP, LEARN, AG_IC, AG_FX, SK_LBL, ALL_KEYS, choices, recommend, info, weekFx, week, labelOf, freeBlocks, keyOf };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Jadwal = API;
})();

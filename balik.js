// balik.js: rawat terbalik (v44.1; daftar-saran 32). Seminggu sekali makhluk yang ngurus pemain: satu pertanyaan tentang pemain
// ("Have you eaten today?"), dijawab satu ketukan, makhluk bereaksi sesuai sifatnya. Teks ditulis manusia, bukan model.
// Fungsi murni seperti today.js: menerima potret, mengembalikan pertanyaan atau reaksi. Tidak menyentuh simulasi: jawaban
// disimpan UI di state.balik (bukan aksi, tidak di-replay), dan telemetry hanya mencatat bahwa dijawab, bukan jawabannya.
//
//   Balik.due(S)            -> { id, ic, q, opts: [[key, label], ...] } atau null kalau belum waktunya
//   Balik.react(S, id, key) -> satu kalimat reaksi makhluk
//   Potret S: d hari ini, cur { nama, fase }, since hari rawat dimulai (state.rawat_from), last hari terakhir dijawab atau null,
//             seed string akun (supaya urutan pertanyaan beda tiap keluarga), traits { ramah, rajin, kreatif, penakut, ... } 0..100
//
// Aturan waktu: minggu pertama tidak ada (makhluk masih kenalan); sesudah itu tiap EVERY hari sejak jawaban terakhir
// (atau sejak rawat dimulai). Bayi tidak bertanya. Pertanyaan bergilir dari daftar, mulai dari posisi yang ditentukan seed.
"use strict";
(() => {
  const EVERY = 7;
  const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  // Reaksi: base selalu ada; varian per sifat dipakai kalau sifat itu yang paling menonjol (> 55).
  const Q = [
    { id: "makan", ic: "🍚", q: n => `${n} asks: have you eaten today?`, opts: [["ya", "Yes, I have"], ["belum", "Not yet"], ["nanti", "Later"]],
      react: { ya: { base: n => `Good. Me too.`, ramah: n => `Good. Next time tell me what you had.`, kreatif: n => `Good. I'm imagining something with noodles.` },
        belum: { base: n => `Go eat something. I'll wait here.`, rajin: n => `Food first. Everything else after.`, penakut: n => `Oh. Please eat something, okay?` },
        nanti: { base: n => `Hm. Don't forget.`, ramah: n => `Okay. I'll ask again later.`, rajin: n => `"Later" is how I skip homework. Go on.` } } },
    { id: "tidur", ic: "🌙", q: n => `${n} asks: did you sleep enough last night?`, opts: [["ya", "Yes"], ["kurang", "Not really"], ["lumayan", "Sort of"]],
      react: { ya: { base: n => `Good. You look like it.`, kreatif: n => `Good. Any dreams? Keep them for me.` },
        kurang: { base: n => `Then go easy today.`, ramah: n => `Then go easy today. I'll be quiet.`, penakut: n => `Oh no. Tonight, early, okay?` },
        lumayan: { base: n => `Sort of counts. Tonight, more.`, rajin: n => `Sort of is not enough. Tonight, properly.` } } },
    { id: "keluar", ic: "🌤", q: n => `${n} asks: have you been outside today?`, opts: [["ya", "Yes"], ["belum", "Not yet"], ["sibuk", "Too busy"]],
      react: { ya: { base: n => `Good. What did the sky look like?`, kreatif: n => `Good. Was the sky doing anything interesting?` },
        belum: { base: n => `Go out for a bit. I'll be here.`, ramah: n => `Go out for a bit. Wave at someone for me.` },
        sibuk: { base: n => `Even five minutes counts.`, rajin: n => `Busy people walk too. Five minutes.`, penakut: n => `Just to the door, then. That's something.` } } },
    { id: "keluarga", ic: "📞", q: n => `${n} asks: when did you last call your family?`, opts: [["hari_ini", "Today"], ["minggu_ini", "This week"], ["lama", "A while ago"]],
      react: { hari_ini: { base: n => `Good. Say hi from me.` },
        minggu_ini: { base: n => `That's good. Keep it up.`, ramah: n => `That's good. They like hearing from you, you know.` },
        lama: { base: n => `Call them. I'll wait.`, penakut: n => `It's okay if it's awkward. Call them anyway.`, kreatif: n => `Call them. Tell them about me if you need a topic.` } } },
    { id: "minum", ic: "💧", q: n => `${n} asks: had any water today?`, opts: [["ya", "Yes"], ["sedikit", "A little"], ["belum", "Not yet"]],
      react: { ya: { base: n => `Good.`, ramah: n => `Good. We're both doing fine, then.` },
        sedikit: { base: n => `A bit more. Go on.`, rajin: n => `A bit more. Now, not later.` },
        belum: { base: n => `Get a glass. I'll watch.`, penakut: n => `Please get a glass? For me.` } } },
    { id: "istirahat", ic: "🪑", q: n => `${n} asks: have you taken a break today?`, opts: [["ya", "Yes"], ["belum", "Not yet"], ["ini", "This is my break"]],
      react: { ya: { base: n => `Good. Breaks are part of the work.` },
        belum: { base: n => `Then this is one. Sit for a minute.`, ramah: n => `Then this is one. Sit with me for a minute.` },
        ini: { base: n => `Good choice.`, kreatif: n => `Good choice. I'm an excellent break.`, rajin: n => `Good. Then back to it after.` } } },
    { id: "teman", ic: "💬", q: n => `${n} asks: talked to a friend this week?`, opts: [["ya", "Yes"], ["belum", "Not yet"], ["sendiri", "I like it quiet"]],
      react: { ya: { base: n => `Good. Friends are good.`, ramah: n => `Good. What are they like?` },
        belum: { base: n => `Send one message. Just one.`, penakut: n => `Send one message. It doesn't have to be long.` },
        sendiri: { base: n => `Fair. Quiet is fine too.`, kreatif: n => `Fair. Quiet is where the good ideas are.` } } },
    { id: "capek", ic: "🫖", q: n => `${n} asks: are you tired today?`, opts: [["ya", "Yes"], ["sedikit", "A bit"], ["tidak", "Not really"]],
      react: { ya: { base: n => `Then do less today. I'll manage.`, ramah: n => `Then do less today. I'll keep you company.`, penakut: n => `Then rest. Please?` },
        sedikit: { base: n => `A bit is okay. Don't push it.`, rajin: n => `A bit is normal. Finish, then rest.` },
        tidak: { base: n => `Good. Use it well.`, kreatif: n => `Good. Make something with it.` } } },
  ];
  const TRAITS = ["ramah", "rajin", "kreatif", "penakut"];

  function due(S) {
    if (!S || !S.cur || !S.cur.nama) return null;
    if (["bayi", "meninggal", "merantau"].includes(S.cur.fase)) return null;
    const since = S.since == null ? 0 : S.since, d = S.d;
    if (d - since < EVERY) return null;
    if (S.last != null && d - S.last < EVERY) return null;
    const week = Math.floor((d - since) / EVERY), q = Q[(week + hash(S.seed || "")) % Q.length];
    return { id: q.id, ic: q.ic, q: q.q(S.cur.nama), opts: q.opts.map(o => o.slice()) };
  }
  function react(S, id, key) {
    const q = Q.find(x => x.id === id); if (!q || !q.react[key]) return null;
    const R = q.react[key], n = S && S.cur ? S.cur.nama : "They", t = (S && S.traits) || {};
    let best = null, bv = 55;
    for (const k of TRAITS) if (R[k] && (t[k] ?? 50) > bv) { best = k; bv = t[k]; }
    return (best ? R[best] : R.base)(n);
  }

  const API = { Q, EVERY, due, react, TRAITS };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Balik = API;
})();

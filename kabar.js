// kabar.js: notifikasi game (v48). Fungsi murni seperti today.js dan balik.js: menerima potret, mengembalikan daftar notifikasi
// yang dijadwalkan untuk hari ini dan dua hari ke depan. Penjadwalan sungguhan (Notification API, service worker) ada di ui/38b-kabar.js.
//
//   Kabar.plan(S) -> [{ at, tag, title, body }]   at = hari game pecahan (1 hari game = 1 hari nyata, mulai tengah malam lokal)
//   Potret S: d hari ini (bulat), now hari pecahan sekarang, nama, fase, done { pagi, malam } rawat hari ini sudah beres,
//             tanya true kalau hari ini ada pertanyaan yang belum dijawab, school [{ day, label }] tanggal sekolah ke depan,
//             mag hari terbit majalah berikutnya, away true kalau keluarga lagi dititipkan (Family > away)
//
// Aturan (diskusi loop harian 28 Okt): notifikasi itu undangan, bukan tagihan. Paling banyak 2 sehari: pagi (09:00) isinya
// alasan buat buka hari ini (tanggal sekolah, majalah, pertanyaan, sarapan), malam (19:00) cuma kalau rawat malam belum beres.
// Kalau pemain nggak buka 2 hari, satu kabar kangen. Jam tenang 21:30 sampai 08:00: nggak ada yang dikirim di situ.
// Waktu dititipkan, cuma kabar majalah (makhluknya diurus orang lain).
"use strict";
(() => {
  const PAGI = 9 / 24, MALAM = 19 / 24, KANGEN = 12.5 / 24, QUIET_FROM = 21.5 / 24, QUIET_TO = 8 / 24;
  const quiet = at => { const h = at - Math.floor(at); return h >= QUIET_FROM || h < QUIET_TO; };
  const when = (k, d) => k === d ? "today" : k === d + 1 ? "tomorrow" : `in ${k - d} days`;

  function morning(S, day) {
    const n = S.nama, sc = (S.school || []).find(k => k.day === day), soon = (S.school || []).find(k => k.day === day + 1);
    if (S.away) return S.mag === day ? { tag: "mag", title: "New issue of Old Town", body: "The town magazine is out. See who made the pages." } : null;
    if (S.fase === "bayi") return { tag: "pagi", title: `${n} is awake`, body: `${n} is looking around for you.` };
    if (sc) return { tag: "pagi", title: `${n}: ${sc.label} today`, body: `A good breakfast helps. ${n} is a little nervous.` };
    if (S.mag === day) return { tag: "mag", title: "New issue of Old Town", body: `The magazine is out. ${n} wants to see it with you.` };
    if (day === S.d && S.tanya) return { tag: "pagi", title: `${n} wants to ask you something`, body: "Open the chat to hear it." };
    if (day > S.d) return { tag: "pagi", title: `${n} has something to ask you`, body: soon ? `Also, ${soon.label} ${when(soon.day, day)}.` : "Breakfast first, then talk?" };
    return { tag: "pagi", title: `Good morning from ${n}`, body: soon ? `${soon.label} is ${when(soon.day, day)}. Breakfast first?` : "Breakfast first?" };
  }
  function evening(S, day) {
    if (S.away || (day === S.d && S.done && S.done.malam)) return null;
    const n = S.nama, soon = (S.school || []).find(k => k.day === day + 1);
    if (S.fase === "bayi") return { tag: "malam", title: `${n} is getting sleepy`, body: "Dinner, then bedtime?" };
    return { tag: "malam", title: `${n} is getting sleepy`, body: soon ? `${soon.label} is tomorrow. An early night helps.` : "Dinner and bedtime are waiting." };
  }

  function plan(S) {
    if (!S || !S.nama || S.fase === "meninggal" || S.fase === "merantau") return [];
    const out = [];
    for (let day = S.d; day <= S.d + 2; day++) {
      const m = morning(S, day), e = evening(S, day);
      if (m) out.push({ at: day + PAGI, ...m });
      if (e) out.push({ at: day + MALAM, ...e });
    }
    if (!S.away) out.push({ at: S.d + 2 + KANGEN, tag: "kangen", title: `${S.nama} keeps looking at the door`, body: "It's been two days. Come say hi?" });
    // kangen menggantikan notifikasi biasa hari itu: biar cuma satu kabar di hari kepergian kedua
    const kd = S.d + 2;
    return out.filter(x => x.at > S.now && !quiet(x.at) && !(x.tag !== "kangen" && x.tag !== "malam" && Math.floor(x.at) === kd && !S.away))
      .sort((a, b) => a.at - b.at);
  }

  const api = { plan, PAGI, MALAM, quiet };
  if (typeof module !== "undefined") module.exports = api;
  else globalThis.Kabar = api;
})();

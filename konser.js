// Konser live (v78): pertunjukan 6 menit di Riverside Park yang ditonton semua orang di detik yang sama.
// Murni (tanpa three.js / Web Audio), jadi bisa dites di Node: jadwal konser dari jam asli, babak dan momen besar
// dari detik ke berapa, dan not musik tiap seperenam belas ketukan. konser3d.js yang gambar, suara.js yang bunyiin.
// Detik show = (sekarang - jam mulai) / 1000. Telat masuk = langsung ke detik itu, nggak ada "mulai dari awal".
"use strict";
(function () {
  const BPM = 120, BEAT = 60 / BPM, STEP = BEAT / 4, BAR = BEAT * 4;
  const LEN = 360, DOORS = 15 * 60;   // show 6 menit; pintu dibuka 15 menit sebelumnya
  const BAND = "The Riverside Lights";
  const DAY = 6, HOUR = 20;           // tiap Sabtu jam 20:00 waktu kota; pas festival ada show tambahan tiap malam jam 21:00
  const FEST_HOUR = 21;

  // babak: [mulai, id, nama di layar]
  const ACTS = [
    { t: 0, id: "intro", name: "Lights out" },
    { t: 30, id: "song1", name: "Song 1 · Neon River" },
    { t: 120, id: "rise", name: "The stage opens" },
    { t: 180, id: "song2", name: "Song 2 · Weightless" },
    { t: 270, id: "peak", name: "Finale · Fireworks" },
    { t: 330, id: "outro", name: "Goodnight, Old Town" },
  ];
  // momen besar: tiap 30-60 detik ada yang bikin orang bilang "eh liat itu". cam = kamera ditarik ke panggung sebentar.
  const MOMENTS = [
    { t: 0, d: 8, id: "blackout", say: "" },
    { t: 8, d: 3, id: "drop", say: "Here we go!", cam: true },
    { t: 30, d: 4, id: "lights", say: "Lights on!" },
    { t: 62, d: 20, id: "lasers", say: "Lasers!" },
    { t: 104, d: 8, id: "confetti", say: "Confetti!" },
    { t: 120, d: 6, id: "open", say: "The stage is opening...", cam: true },
    { t: 128, d: 50, id: "stairs", say: "Look up!" },
    { t: 152, d: 26, id: "sky", say: "The sky is changing" },
    { t: 180, d: 90, id: "float", say: "You're floating! Try jumping" },
    { t: 226, d: 14, id: "rings", say: "Rings of light!" },
    { t: 270, d: 56, id: "fireworks", say: "Fireworks over the river!", cam: true },
    { t: 300, d: 10, id: "confetti2", say: "" },
    { t: 330, d: 30, id: "bow", say: "Thank you, Old Town!" },
  ];
  const actAt = s => { let a = ACTS[0]; for (const x of ACTS) if (s >= x.t) a = x; return a; };
  const actEnd = a => { const i = ACTS.indexOf(a); return i + 1 < ACTS.length ? ACTS[i + 1].t : LEN; };

  // seberapa "penuh" musiknya (0..1): naik pelan di intro, ramai di lagu, puncak di finale, turun di penutup
  function energy(s) {
    if (s < 0) return 0;
    if (s < 8) return 0.15; if (s < 30) return 0.45;
    if (s < 120) return 0.75; if (s < 180) return 0.5 + 0.45 * (s - 120) / 60;
    if (s < 270) return 0.85; if (s < 330) return 1;
    return Math.max(0, 0.6 * (1 - (s - 330) / 30));
  }
  // keadaan show di detik s (boleh negatif = sebelum mulai)
  function at(s) {
    if (s < 0) return { phase: "before", left: -s, energy: 0, moments: [], beat: Math.floor(s / BEAT), beatK: ((s / BEAT) % 1 + 1) % 1 };
    if (s >= LEN) return { phase: "after", energy: 0, moments: [] };
    const a = actAt(s), b = s / BEAT;
    return {
      phase: "show", act: a.id, name: a.name, actK: (s - a.t) / (actEnd(a) - a.t),
      beat: Math.floor(b), beatK: b % 1, bar: Math.floor(s / BAR), energy: energy(s),
      moments: MOMENTS.filter(m => s >= m.t && s < m.t + m.d).map(m => ({ id: m.id, k: (s - m.t) / m.d, cam: !!m.cam })),
      gravity: s >= 180 && s < 270 ? 0.3 : 1,
    };
  }
  const momentNow = (s, id) => { const m = at(s).moments.find(x => x.id === id); return m ? m.k : -1; };

  // ---------------------------------------------------------------- jadwal (jam lokal HP = jam kota)
  // fest: festival kota hari ini (dari Engine.world_active), atau null
  function showsOn(d, fest) {
    const out = [], day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day.getDay() === DAY) out.push({ kind: "weekly", start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), HOUR).getTime(), name: BAND });
    if (fest) out.push({ kind: "festival", start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), FEST_HOUR).getTime(), name: `${BAND} at the ${fest.nama}` });
    return out;
  }
  // konser berikutnya yang belum selesai (bisa yang lagi jalan). Cari sampai 8 hari ke depan; festival cuma dihitung hari ini.
  function next(d, fest) {
    const now = d.getTime();
    for (let k = 0; k < 8; k++) {
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + k, 12);
      const S = showsOn(day, k === 0 ? fest : null).filter(x => x.start + LEN * 1000 > now).sort((a, b) => a.start - b.start)[0];
      if (S) return Object.assign(S, { doors: S.start - DOORS * 1000, end: S.start + LEN * 1000 });
    }
    return null;
  }
  // buat sheet taman: "doors" (bisa masuk, belum mulai), "live" (lagi jalan), "soon" (nanti), dan teks hitung mundur
  function status(d, fest) {
    const S = next(d, fest); if (!S) return null;
    const now = d.getTime(), phase = now >= S.start ? "live" : now >= S.doors ? "doors" : "soon";
    return Object.assign(S, { phase, sec: (now - S.start) / 1000, wait: wait(S.start - now) });
  }
  function wait(ms) {
    const m = Math.max(0, Math.ceil(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    return d ? `${d}d ${h}h` : h ? `${h}h ${mm}m` : `${mm} min`;
  }
  const clock = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  // ---------------------------------------------------------------- musik: not tiap seperenam belas ketukan
  // A minor: Am F C G (satu akor per bar). Melodi dari benih tetap per babak, jadi lagunya sama di semua HP.
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const ROOT = [45, 41, 36, 43];
  const PENTA = [0, 3, 5, 7, 10, 12, 15, 17];
  function rng(seed) {
    let a = 0; for (const ch of String(seed)) a = (Math.imul(a, 31) + ch.charCodeAt(0)) | 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // motif 2 bar (32 langkah) per babak: null = diam, angka = derajat tangga nada pentatonik
  const motifC = {};
  function motif(act) {
    if (motifC[act]) return motifC[act];
    const R = rng("konser:" + act), out = [], dens = { song1: 0.4, song2: 0.5, peak: 0.6, outro: 0.22, rise: 0.25, intro: 0 }[act] || 0;
    let deg = 3;
    for (let i = 0; i < 32; i++) {
      const strong = i % 4 === 0;
      if (R() < (strong ? dens + 0.25 : dens * 0.6)) { deg = Math.max(0, Math.min(PENTA.length - 1, deg + Math.round((R() - 0.5) * 4))); out.push(deg); } else out.push(null);
    }
    return (motifC[act] = out);
  }
  function step(n) {
    const s = n * STEP; if (s < 0 || s >= LEN) return null;
    const a = actAt(s).id, i16 = n % 16, bar = Math.floor(n / 16), ch = bar % 4;
    const e = { kick: false, snare: false, hat: 0, clap: false, bass: null, lead: null, pad: null, boom: false };
    if (n === Math.round(8 / STEP)) e.boom = true;
    if (i16 === 0) e.pad = a === "peak" || a === "song2" || a === "outro" || a === "intro" || a === "rise" ? CHORDS[ch] : null;
    const full = a === "song1" || a === "song2" || a === "peak";
    // intro: pad + hihat pelan, kick masuk setelah dentuman di detik 8
    if (a === "intro") { if (s >= 8 && i16 % 4 === 0) e.kick = true; if (s >= 16 && i16 % 4 === 2) e.hat = 0.5; }
    if (full) {
      e.kick = i16 % 4 === 0; e.snare = i16 === 4 || i16 === 12; e.hat = i16 % 4 === 2 ? 1 : i16 % 2 ? 0.35 : 0;
      if (a === "peak") e.clap = i16 === 4 || i16 === 12;
      if (i16 % 2 === 0) e.bass = ROOT[ch] + (i16 % 4 === 2 ? 12 : 0);
    }
    // naik: kick setengah, snare makin rapat di 8 bar terakhir, tanpa bass
    if (a === "rise") {
      const k = (s - 120) / 60;
      e.kick = i16 % 8 === 0; e.hat = i16 % 4 === 2 ? 0.6 : 0;
      if (k > 0.65) e.snare = k > 0.9 ? true : k > 0.8 ? i16 % 2 === 0 : i16 % 4 === 0;
    }
    if (a === "outro") { e.kick = s < 340 && i16 === 0; e.hat = 0; if (i16 % 8 === 0) e.bass = ROOT[ch]; }
    const m = motif(a)[n % 32];
    if (m !== null && m !== undefined) e.lead = 69 + PENTA[m] + (a === "peak" ? 12 : 0);
    if (a === "song2" && i16 % 2 === 1 && e.lead === null) e.lead = CHORDS[ch][(n >> 1) % 3] + 24;   // arpeggio melayang
    return e;
  }

  const API = { BPM, BEAT, STEP, BAR, LEN, DOORS, BAND, ACTS, MOMENTS, at, energy, momentNow, showsOn, next, status, wait, clock, step, motif };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Konser = API;
})();

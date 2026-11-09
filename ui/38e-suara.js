// ---- suara mini game (v63): semua disintesis pakai WebAudio, tanpa file audio.
// Sfx.play(nama, angka?) dari kode game; mati/nyala lewat tombol 🔊 di bar atas game, disimpan di localStorage.
const Sfx = (() => {
  let ac = null, out = null, noiseBuf = null;
  let off = false;
  try { off = localStorage.getItem("mk-sfx-off") === "1"; } catch (e) { /* tanpa storage: nyala */ }
  function init() {
    if (ac || !(window.AudioContext || window.webkitAudioContext)) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.connect(ac.destination);
    out = ac.createGain(); out.gain.value = 0.55; out.connect(comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  // nada: frekuensi bisa meluncur ke `to`, amplop cepat naik lalu turun
  function tone(f, dur, { type = "sine", vol = 0.3, to = 0, at = 0 } = {}) {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  // desis: noise lewat filter, frekuensi filter bisa meluncur
  function hiss(dur, { f = 1200, to = 0, q = 1, kind = "bandpass", vol = 0.3, at = 0 } = {}) {
    const t = ac.currentTime + at, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; fl.type = kind; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const semi = (f, n) => f * Math.pow(2, n / 12);
  const arp = (f, steps, gap, o) => steps.forEach((n, i) => tone(semi(f, n), o.dur || 0.18, { ...o, at: i * gap }));
  const S = {
    ui: () => tone(1100, 0.04, { vol: 0.12 }),
    lempar: () => hiss(0.13, { f: 900, to: 3500, q: 0.8, vol: 0.22 }),
    tancap: () => { tone(150, 0.09, { type: "triangle", to: 70, vol: 0.5 }); hiss(0.04, { f: 3000, vol: 0.15 }); },
    dentang: () => { tone(930, 0.35, { type: "square", vol: 0.12 }); tone(1290, 0.3, { type: "square", vol: 0.08 }); hiss(0.08, { f: 5000, vol: 0.2 }); },
    kayu: () => { hiss(0.25, { f: 500, to: 150, kind: "lowpass", vol: 0.5 }); arp(523, [0, 4, 7, 12], 0.06, { type: "triangle", vol: 0.18 }); },
    taruh: n => tone(semi(220, Math.min(n || 0, 24) * 0.5), 0.1, { type: "triangle", vol: 0.35, to: 120 }),
    pas: n => { const f = semi(523, Math.min(n || 1, 12) - 1); tone(f, 0.25, { vol: 0.22 }); tone(f * 2, 0.2, { vol: 0.08 }); },
    jatuh: () => tone(420, 0.45, { type: "sawtooth", to: 70, vol: 0.18 }),
    iris: () => { hiss(0.09, { f: 2500, to: 6000, q: 2, vol: 0.25 }); hiss(0.12, { f: 400, kind: "lowpass", vol: 0.25, at: 0.02 }); },
    bom: () => { hiss(0.6, { f: 600, to: 60, kind: "lowpass", vol: 0.7 }); tone(70, 0.5, { type: "sine", to: 35, vol: 0.5 }); },
    kombo: n => arp(659, [0, 4, 7, 12, 16].slice(0, Math.min(5, (n || 3) - 1)), 0.05, { type: "square", vol: 0.08, dur: 0.12 }),
    tangkap: () => tone(520, 0.09, { to: 900, vol: 0.25 }),
    bintang: () => arp(784, [0, 7, 12], 0.06, { vol: 0.2, dur: 0.15 }),
    ulat: () => tone(160, 0.2, { type: "square", to: 110, vol: 0.12 }),
    panas: l => { hiss(0.5, { f: 300, to: 3000, kind: "bandpass", q: 0.7, vol: 0.35 }); tone(l === 3 ? 98 : 131, 0.5, { type: "sawtooth", vol: 0.12, to: l === 3 ? 196 : 262 }); },
    temu: () => arp(880, [0, 4, 7, 12, 16, 19], 0.045, { vol: 0.16, dur: 0.14 }),
    detik: () => tone(1500, 0.03, { type: "square", vol: 0.05 }),
    goyang: () => [0, 0.12, 0.24, 0.36, 0.48].forEach(at => hiss(0.05, { f: 900 + at * 2000, vol: 0.2, at })),
    buka: () => { hiss(0.35, { f: 1500, to: 8000, vol: 0.3 }); arp(523, [0, 4, 7, 12], 0.07, { type: "triangle", vol: 0.2, dur: 0.3 }); },
    koin: () => { tone(988, 0.08, { type: "square", vol: 0.1 }); tone(1319, 0.3, { type: "square", vol: 0.1, at: 0.08 }); },
    jackpot: () => { for (let i = 0; i < 6; i++) { tone(988, 0.08, { type: "square", vol: 0.08, at: i * 0.09 }); tone(1319, 0.12, { type: "square", vol: 0.08, at: i * 0.09 + 0.045 }); } },
    rekor: () => { arp(523, [0, 4, 7], 0.12, { type: "square", vol: 0.1, dur: 0.14 }); [0, 4, 7, 12].forEach(n => tone(semi(523, n), 0.7, { type: "triangle", vol: 0.12, at: 0.38 })); },
    selesai: () => arp(392, [0, -3, -5], 0.12, { type: "triangle", vol: 0.15, dur: 0.2 }),
    // Kart cup (v83)
    beep: n => tone(n ? 1320 : 660, n ? 0.45 : 0.16, { type: "square", vol: 0.1 }),
    turbo: () => { hiss(0.5, { f: 400, to: 4000, q: 0.8, vol: 0.28 }); tone(180, 0.4, { type: "sawtooth", to: 520, vol: 0.08 }); },
    spin: () => { tone(620, 0.55, { type: "triangle", to: 110, vol: 0.2 }); hiss(0.35, { f: 900, to: 200, vol: 0.2 }); },
    kotak: () => arp(660, [0, 5, 9, 12], 0.04, { type: "square", vol: 0.07, dur: 0.08 }),
    dinding: () => { tone(90, 0.12, { type: "square", to: 50, vol: 0.22 }); hiss(0.08, { f: 600, vol: 0.18 }); },
    lap: () => arp(784, [0, 4, 7, 12], 0.08, { type: "triangle", vol: 0.15, dur: 0.16 }),
    // Bonk brawl (v84)
    bonk: n => { const k = Math.min(1, (n || 5) / 22); tone(230 - k * 130, 0.1 + k * 0.12, { type: "square", to: 55, vol: 0.16 + k * 0.12 }); hiss(0.07 + k * 0.12, { f: 1900 - k * 1000, vol: 0.22 + k * 0.22 }); },
    wus: () => hiss(0.12, { f: 700, to: 2600, q: 0.9, vol: 0.12 }),
    hop: () => tone(330, 0.11, { type: "triangle", to: 640, vol: 0.12 }),
    ko: () => { hiss(0.8, { f: 1400, to: 70, kind: "lowpass", vol: 0.6 }); tone(70, 0.6, { type: "sine", to: 35, vol: 0.45 }); tone(900, 0.5, { type: "sawtooth", to: 120, vol: 0.08 }); },
    splat: () => { hiss(0.18, { f: 500, to: 180, kind: "lowpass", vol: 0.4 }); tone(170, 0.1, { to: 90, vol: 0.2 }); },
    ambil: () => arp(660, [0, 7, 12], 0.05, { type: "triangle", vol: 0.14, dur: 0.1 }),
    laser: () => { tone(1800, 0.25, { type: "sawtooth", to: 300, vol: 0.09 }); tone(900, 0.2, { type: "square", to: 200, vol: 0.05 }); },
  };
  // suara mesin kart: satu nada gergaji lewat filter yang terus nyala, nadanya ikut kecepatan. motor(null) = mati
  let mo = null;
  function motor(f, sk = 0) {
    if (f == null || off || reduceSound()) {
      if (mo) { const m = mo; mo = null; try { m.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05); m.ng.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05); setTimeout(() => { try { m.o.stop(); m.o2.stop(); m.n.stop(); } catch (e) { /* udah berhenti */ } }, 300); } catch (e) { /* abaikan */ } }
      return;
    }
    init(); if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    if (!mo) {
      const o = ac.createOscillator(), o2 = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
      o.type = "sawtooth"; o2.type = "square"; fl.type = "lowpass"; fl.Q.value = 2; g.gain.value = 0.0001;
      o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(out); o.start(); o2.start();
      g.gain.setTargetAtTime(0.045, ac.currentTime, 0.15);
      // decit ban: desis yang terus muter, kerasnya diatur sk (0 = diam)
      const n = ac.createBufferSource(), nf = ac.createBiquadFilter(), ng = ac.createGain();
      n.buffer = noiseBuf; n.loop = true; nf.type = "bandpass"; nf.frequency.value = 2400; nf.Q.value = 3; ng.gain.value = 0.0001;
      n.connect(nf); nf.connect(ng); ng.connect(out); n.start();
      mo = { o, o2, fl, g, n, nf, ng };
    }
    const t = ac.currentTime;
    mo.o.frequency.setTargetAtTime(f, t, 0.06); mo.o2.frequency.setTargetAtTime(f * 0.5, t, 0.06); mo.fl.frequency.setTargetAtTime(250 + f * 3.5, t, 0.06);
    mo.ng.gain.setTargetAtTime(Math.max(0.0001, sk * 0.05), t, 0.05); mo.nf.frequency.setTargetAtTime(1900 + sk * 900, t, 0.08);
  }
  return {
    get off() { return off; },
    unlock() { if (off) return; init(); if (ac && ac.state === "suspended") ac.resume(); },
    play(name, n) { if (off || reduceSound()) return; init(); if (!ac || !S[name]) return; if (ac.state === "suspended") ac.resume(); try { S[name](n); } catch (e) { /* suara gagal nggak boleh ganggu game */ } },
    motor(f, sk) { try { motor(f, sk); } catch (e) { /* suara gagal nggak boleh ganggu game */ } },
    toggle() { off = !off; if (off) motor(null); try { localStorage.setItem("mk-sfx-off", off ? "1" : "0"); } catch (e) { /* tanpa storage */ } if (!off) this.unlock(); return off; },
  };
})();
// tab di latar belakang: jangan bunyi
const reduceSound = () => document.hidden;

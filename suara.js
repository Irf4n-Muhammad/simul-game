// Suara kota (v77): semua dibikin langsung pakai Web Audio, tanpa file suara. Hujan dan badai (derau disaring + guntur),
// burung pagi, jangkrik malam, dengung lalu lintas, keramaian pasar/festival, bel sekolah jam 8 dan jam 2.
// mixOf() murni (bisa dites di Node): dari cuaca, jam, zoom, dan jarak ke pasar jadi volume tiap lapis. create() yang bunyi.
// Pelan dari awal, bisa dimatiin dari tombol speaker di kota (disimpan di HP ini saja).
"use strict";
(function () {
  const KEY = "mk-suara";
  const clamp = v => Math.max(0, Math.min(1, v));
  // s: { wx, period, zoom (0 jalan .. 1 peta), fair (0..1 dekat pasar yang buka), hour }
  function mixOf(s) {
    const near = clamp(1 - (s.zoom - 0.2) / 0.5), wet = { rain: 0.55, storm: 0.9, snow: 0, fog: 0 }[s.wx] || 0;
    const night = s.period === "night", day = s.period === "day" || s.period === "morning";
    const dry = !wet && s.wx !== "snow";
    return {
      rain: wet * (0.45 + 0.55 * near),
      traffic: (night ? 0.25 : s.period === "evening" ? 0.7 : 1) * (0.25 + 0.75 * near) * (s.wx === "snow" ? 0.6 : 1) * 0.55,
      birds: dry && day ? (s.period === "morning" ? 1 : 0.55) * near : 0,
      crickets: dry && night ? 0.7 * near : 0,
      crowd: clamp(s.fair || 0) * near * (wet ? 0.6 : 1),
    };
  }
  // bel sekolah: jam 8:00 dan 14:00 hari sekolah (Senin sampai Jumat)
  const bellDue = d => d.getDay() > 0 && d.getDay() < 6 && d.getMinutes() === 0 && (d.getHours() === 8 || d.getHours() === 14);

  function create() {
    const S = { on: true, started: false };
    try { S.on = localStorage.getItem(KEY) !== "off"; } catch (e) { /* tanpa simpanan: nyala */ }
    let ac = null, master = null, gains = {}, birdT = 0, mix = null;
    function noiseBuf(kind) {
      const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
      return b;
    }
    function loop(kind, filt, freq, q) {
      const src = ac.createBufferSource(); src.buffer = noiseBuf(kind); src.loop = true;
      const f = ac.createBiquadFilter(); f.type = filt; f.frequency.value = freq; f.Q.value = q || 0.7;
      const g = ac.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(master); src.start();
      return g;
    }
    function start() {
      if (S.started) { if (ac && ac.state === "suspended") ac.resume(); return; }
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.gain.value = S.on ? 0.35 : 0; master.connect(ac.destination);
      gains.rain = loop("white", "lowpass", 1400, 0.5);
      gains.traffic = loop("brown", "lowpass", 380, 0.6);
      // keramaian: derau di frekuensi suara orang, naik turun pelan biar kayak ngobrol
      gains.crowd = loop("white", "bandpass", 700, 0.9);
      const lfo = ac.createOscillator(), lg = ac.createGain(), mod = ac.createGain(); lfo.frequency.value = 0.35; lg.gain.value = 0.25; mod.gain.value = 0.75;
      lfo.connect(lg); lg.connect(mod.gain); lfo.start(); gains.crowd.disconnect(); gains.crowd.connect(mod); mod.connect(master);
      gains.birds = ac.createGain(); gains.birds.gain.value = 0; gains.birds.connect(master);
      gains.crickets = ac.createGain(); gains.crickets.gain.value = 0; gains.crickets.connect(master);
      // jangkrik: nada tinggi yang dipotong-potong cepat
      const cr = ac.createOscillator(), am = ac.createGain(), ao = ac.createOscillator(), ag = ac.createGain();
      cr.frequency.value = 4300; ao.type = "square"; ao.frequency.value = 22; ag.gain.value = 0.5; am.gain.value = 0.5;
      ao.connect(ag); ag.connect(am.gain); cr.connect(am); am.connect(gains.crickets); cr.start(); ao.start();
      S.started = true;
      setInterval(tick, 250);
    }
    function chirp(t0, vol) {
      const o = ac.createOscillator(), g = ac.createGain(), f0 = 2600 + Math.random() * 1800;
      o.type = "sine"; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * (1.2 + Math.random() * 0.5), t0 + 0.07); o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t0 + 0.14);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
      o.connect(g); g.connect(gains.birds); o.start(t0); o.stop(t0 + 0.2);
    }
    function tick() {
      if (!mix || !S.started) return;
      const t = ac.currentTime;
      for (const k of ["rain", "traffic", "crickets"]) gains[k].gain.setTargetAtTime(mix[k] * (k === "crickets" ? 0.05 : 1), t, 0.8);
      gains.crowd.gain.setTargetAtTime(mix.crowd * 0.45, t, 0.8);
      gains.birds.gain.setTargetAtTime(mix.birds, t, 0.8);
      if (mix.birds > 0.05 && performance.now() > birdT) { const n = 2 + Math.floor(Math.random() * 4); for (let k = 0; k < n; k++) chirp(t + k * 0.18, 0.06); birdT = performance.now() + 1500 + Math.random() * 4500; }
    }
    S.start = start;
    S.set = m => { mix = m; };
    S.silence = () => { mix = { rain: 0, traffic: 0, birds: 0, crickets: 0, crowd: 0 }; tick(); };
    S.mute = off => { S.on = !off; try { localStorage.setItem(KEY, S.on ? "on" : "off"); } catch (e) { /* abaikan */ } if (master) master.gain.setTargetAtTime(S.on ? 0.35 : 0, ac.currentTime, 0.2); };
    // guntur: gemuruh derau rendah yang membesar lalu hilang
    S.thunder = () => {
      if (!S.started || !S.on) return;
      const t = ac.currentTime + 0.4 + Math.random() * 1.2, src = ac.createBufferSource(); src.buffer = noiseBuf("brown");
      const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 160; const g = ac.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.4, t + 0.25); g.gain.exponentialRampToValueAtTime(0.001, t + 3.2);
      src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + 3.4);
    };
    // bel sekolah: ding-dong dua nada
    S.bell = () => {
      if (!S.started || !S.on) return;
      [[880, 0], [660, 0.55], [880, 1.1], [660, 1.65]].forEach(([fq, dt]) => {
        const t = ac.currentTime + dt, o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle"; o.frequency.value = fq;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.3);
      });
    };
    S.stop = () => { S.silence(); };
    // v78: band konser. Not dari Konser.step(n) dijadwalkan sedikit di depan jam audio, ikut detik show (sama di semua HP).
    let band = null, wn = null;
    const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    function voice(type, f, t, dur, vol, cut, out) {
      const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      o.type = type; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = cut;
      env(g, t, 0.006, vol, dur); o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(t, dur, vol, type, f, out) {
      const src = ac.createBufferSource(); src.buffer = wn; const fl = ac.createBiquadFilter(), g = ac.createGain();
      fl.type = type; fl.frequency.value = f; env(g, t, 0.002, vol, dur); src.connect(fl); fl.connect(g); g.connect(out);
      src.start(t, Math.random()); src.stop(t + dur + 0.05);
    }
    function play(e, t, out, len) {
      if (e.kick || e.boom) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(e.boom ? 120 : 150, t); o.frequency.exponentialRampToValueAtTime(40, t + (e.boom ? 0.6 : 0.12)); env(g, t, 0.003, e.boom ? 1.4 : 0.9, e.boom ? 1.4 : 0.28); o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.6); }
      if (e.boom) noise(t, 1.6, 0.5, "lowpass", 300, out);
      if (e.snare) { noise(t, 0.16, 0.32, "highpass", 1500, out); voice("triangle", 190, t, 0.08, 0.25, 2000, out); }
      if (e.clap) for (const d of [0, 0.012, 0.026]) noise(t + d, 0.09, 0.22, "bandpass", 1200, out);
      if (e.hat) noise(t, 0.035, 0.09 * e.hat, "highpass", 7500, out);
      if (e.bass) voice("sawtooth", hz(e.bass), t, 0.2, 0.28, 420, out);
      if (e.lead) { voice("square", hz(e.lead), t, 0.2, 0.07, 2600, out); voice("triangle", hz(e.lead) * 1.004, t, 0.24, 0.08, 4000, out); }
      if (e.pad) for (const m of e.pad) for (const dt of [-4, 4]) { const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(); o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = dt; lp.type = "lowpass"; lp.frequency.value = 900; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.025, t + 0.35); g.gain.setValueAtTime(0.025, t + len * 16 - 0.4); g.gain.linearRampToValueAtTime(0.0001, t + len * 16); o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + len * 16 + 0.05); }
    }
    // secNow(): detik show sekarang; stepAt(n): not langkah ke-n (atau null); len: panjang satu langkah (detik)
    S.band = (secNow, stepAt, len) => {
      S.bandStop(); if (!S.started) return;
      if (!wn) wn = noiseBuf("white");
      const bus = ac.createGain(); bus.gain.value = 0.6; bus.connect(master);
      let last = -1;
      const pump = () => {
        const s = secNow(), from = Math.max(last + 1, Math.ceil(s / len));
        for (let n = from; n * len < s + 0.3; n++) { last = n; const e = stepAt(n); if (e) play(e, ac.currentTime + Math.max(0, n * len - s), bus, len); }
      };
      band = { bus, iv: setInterval(pump, 80) }; pump();
    };
    S.bandStop = () => { if (!band) return; clearInterval(band.iv); const b = band.bus; b.gain.setTargetAtTime(0, ac.currentTime, 0.3); setTimeout(() => b.disconnect(), 1500); band = null; };
    return S;
  }

  const API = { mixOf, bellDue, create, KEY };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Suara = API;
})();

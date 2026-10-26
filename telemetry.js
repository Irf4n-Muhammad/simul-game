// Telemetry: catatan kejadian per sesi, disimpan lokal dulu (belum ada server). Dipakai buat jawab pertanyaan di
// riset/analytics.md: kapan orang masuk, berapa lama, ngapain, app mana yang dibuka, nyari apa, di mana berhenti.
// Yang nggak pernah dicatat: isi chat Nest (cuma panjang teks), nama makhluk, dan apa pun yang bisa nunjuk ke orangnya.
// Kamus event: riset/kamus-event.md. Kirim ke server (flush) belum ada: payload() udah siap dipakai begitu endpoint-nya ada.
"use strict";
(function () {
  const KEY = "mk-tele", OFF = "mk-tele-off", CAP = 3000, RESUME_MS = 5 * 60 * 1000, CARI_MS = 1200;
  const store = () => (typeof localStorage !== "undefined" ? localStorage : null);
  let buf = [], ver = "", ctx = () => ({}), on = true;
  try { const s = store(); on = !(s && s.getItem(OFF) === "1"); buf = s ? JSON.parse(s.getItem(KEY) || "[]") : []; if (!Array.isArray(buf)) buf = []; } catch (e) { buf = []; }
  const S = { id: null, t0: 0, away: 0, pausedAt: 0, endIx: -1, layar: 0, aksi: 0, last: null, lastAt: 0, seen: new Set(), err: 0, cari: {} };
  let saveT = null;
  const save = () => { if (saveT) { clearTimeout(saveT); saveT = null; } try { const s = store(); if (s) s.setItem(KEY, JSON.stringify(buf)); } catch (e) { /* penuh: tetap di memori */ } };
  const queue = () => { if (!saveT) saveT = setTimeout(save, 1500); };
  const now = () => Date.now();
  const sid = () => Math.random().toString(36).slice(2, 8);
  function ev(n, data) {
    if (!on) return null;
    const e = Object.assign({ t: now(), s: S.id, n }, data || {});
    buf.push(e); if (buf.length > CAP) buf.splice(0, buf.length - CAP);
    queue();
    return e;
  }
  const endData = alasan => ({ durasi: Math.round((now() - S.t0 - S.away) / 1000), layar: S.layar, aksi: S.aksi, alasan });
  function start(info) {
    Object.assign(S, { id: sid(), t0: now(), away: 0, pausedAt: 0, endIx: -1, layar: 0, aksi: 0, last: null, lastAt: now(), seen: new Set(), err: 0, cari: {} });
    const d = new Date(), c = ctx() || {};
    let dari = "langsung"; try { const u = new URLSearchParams(location.search); if (u.get("from")) dari = u.get("from").slice(0, 24); } catch (e) {}
    let layar = "", ua = "", bahasa = "";
    try { layar = `${screen.width}x${screen.height}`; ua = navigator.userAgent.slice(0, 120); bahasa = navigator.language; } catch (e) {}
    ev("sesi.mulai", Object.assign({ jam: d.getHours(), hari_minggu: d.getDay(), zona: -d.getTimezoneOffset() / 60, dari, ver, layar, ua, bahasa, hari: c.hari, umur_akun: c.umur, lanjut: info && info.lanjut ? 1 : 0 }, info && info.data));
  }
  // layar disembunyikan (pindah app, kunci HP): sesi dianggap selesai, tapi kalau balik dalam 5 menit sesinya disambung lagi
  function pause() {
    if (!S.id || S.pausedAt) return;
    S.pausedAt = now();
    ev("sesi.selesai", endData("sembunyi")); S.endIx = buf.length - 1;
    save();
  }
  function resume() {
    if (!S.id) return start({ lanjut: 1 });
    if (!S.pausedAt) return;
    const gap = now() - S.pausedAt; S.pausedAt = 0;
    if (gap < RESUME_MS) {
      const e = buf[S.endIx]; if (e && e.s === S.id && e.n === "sesi.selesai") buf.splice(S.endIx, 1);
      S.away += gap; S.endIx = -1; S.last = null; queue();
    } else start({ lanjut: 1 });
  }
  function end(alasan) { if (!S.id) return; if (S.pausedAt) { S.away += now() - S.pausedAt; S.pausedAt = 0; } ev("sesi.selesai", endData(alasan || "tutup")); S.id = null; save(); }
  // layar: lembar (sheet) atau tampilan HP. Dicatat waktu ganti, bareng layar sebelumnya dan berapa lama di situ
  function layar(jenis, nama) {
    const k = jenis + ":" + nama; if (k === S.last) return;
    const t = now(), lama = S.last ? Math.round((t - S.lastAt) / 1000) : 0;
    ev("layar", { j: jenis, l: String(nama).slice(0, 24), dari: S.last, lama });
    S.last = k; S.lastAt = t; S.layar++;
  }
  // pencarian: ditunggu sampai orangnya berhenti ngetik. Nest: cuma panjang teks, isi pencariannya nggak disimpan
  function cari(app, q, n) {
    const P = S.cari[app] || (S.cari[app] = { t: null });
    P.q = q; P.n = n;
    if (P.t) clearTimeout(P.t);
    P.t = setTimeout(() => { P.t = null; if (!P.q) return; ev("cari", app === "nest" ? { app, pjg: P.q.length, hasil: P.n } : { app, q: String(P.q).slice(0, 40), hasil: P.n }); }, CARI_MS);
  }
  // intro: tur awal (j: "tur"), kartu pengenalan app (j: "app"), layar telur (j: "telur"). "tampil" dicatat sekali per kunci per sesi
  function intro(j, k, l, extra) {
    const key = `${j}:${k}:${l}`; if (l === "tampil") { if (S.seen.has(key)) return; S.seen.add(key); }
    ev("intro", Object.assign({ j, k: String(k).slice(0, 24), l }, extra || {}));
  }
  // brand: barang partner di layar (k = kunci slot registry, a = tampil | pakai | sebut | buka, j = tingkat 1-3). "tampil" sekali per kunci per sesi
  function brand(k, a, j) {
    const key = `brand:${k}:${a}`; if (a === "tampil") { if (S.seen.has(key)) return; S.seen.add(key); }
    ev("brand", { k: String(k).slice(0, 32), a, j: j | 0 });
  }
  // notif di layar kunci HP: "tampil" (daftar app-nya, sekali per kombinasi per sesi) dan "klik" (app + urutan)
  function notif(a, app, i) {
    if (a === "tampil") { const key = "notif:" + app; if (S.seen.has(key)) return; S.seen.add(key); }
    ev("notif", { a, app: String(app).slice(0, 60), i });
  }
  // tindakan pemain yang masuk simulasi (saran, rawat, beli). Cuma jenisnya, bukan ke siapa
  function aksi(kind, ok) { S.aksi++; ev("aksi", { k: String(kind).split(":").slice(0, 2).join(":").slice(0, 24), ok: ok ? 1 : 0 }); }
  // dilema: tampil dan dijawab (berapa detik mikirnya)
  function dilema(a, k, extra) { ev("dilema", Object.assign({ a, k: String(k).slice(0, 32) }, extra || {})); }
  // teknis: error (maks 20 per sesi), save_gagal (sekali per sesi), backup, restore, jam_mundur
  function teknis(apa, info) {
    if (apa === "error") { if (S.err++ >= 20) return; }
    if (apa === "save_gagal") { if (S.seen.has("save_gagal")) return; S.seen.add("save_gagal"); }
    ev("teknis", Object.assign({ apa }, info || {}));
  }
  const count = () => buf.length;
  const summary = () => { const o = {}; for (const e of buf) o[e.n] = (o[e.n] || 0) + 1; return { event: buf.length, sesi: new Set(buf.filter(e => e.n === "sesi.mulai").map(e => e.s)).size, per: o }; };
  // paket buat server: semua event + catatan tindakan dan kehadiran dari save (itu yang bikin game bisa diputar ulang)
  const payload = () => { const c = ctx() || {}; return { ver, dibuat: now(), akun: c.akun || null, event: buf.slice(), aksi: c.aksi || [], hadir: c.hadir || [] }; };
  const dump = () => JSON.stringify(payload());
  const flush = () => false; // belum ada endpoint. Nanti: POST payload(), lalu buang event yang udah terkirim
  const clear = () => { buf = []; save(); };
  const enable = v => { on = !!v; try { const s = store(); if (s) { if (on) s.removeItem(OFF); else s.setItem(OFF, "1"); } } catch (e) {} };
  const init = o => { if (o && o.ver) ver = o.ver; if (o && o.ctx) ctx = o.ctx; };
  const API = { KEY, init, start, pause, resume, end, ev, layar, cari, intro, brand, notif, aksi, dilema, teknis, count, summary, payload, dump, flush, clear, enable, enabled: () => on, session: () => S.id };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Tele = API;
})();

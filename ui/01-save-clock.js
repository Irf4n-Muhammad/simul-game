// ================================================================ save + clock
const SAVE_KEY = "makhluk-kecil-3d-v2", CHAT_KEY = SAVE_KEY + "-chat";
// ---- build: versi dan flag Dev. Tombol uji (mode test, bintang terbuka, kecepatan waktu, lembar Dev) cuma tampil kalau Dev nyala:
// buka dengan ?dev=1 (nempel di browser ini sampai ?dev=0), atau ketuk nomor versi di lembar Family 7 kali. Build rilis: buang semua blok DEV.
const APP_VER = "v69";
const DEV = (() => { try { const u = new URLSearchParams(location.search); if (u.has("dev")) localStorage.setItem("mk-dev", u.get("dev") === "0" ? "0" : "1"); return localStorage.getItem("mk-dev") === "1"; } catch (e) { return false; } })();
const SPEEDS = [["Real time", 86400000], ["1 day = 1 min", 60000], ["1 day = 10 sec", 10000], ["1 day = 2 sec", 2000]];
const PHASE_EN = { bayi: "Baby", anak: "Child", remaja: "Teen", dewasa: "Adult", tua: "Elder", meninggal: "Passed away", merantau: "Moved away" };
const COLOR = { "emas": 0xD9AE55, "krem": 0xE8D8BE, "abu": 0xA9ADB3, "oranye": 0xD99A6C, "biru muda": 0x9DB8C9, "hitam": 0x4D4A52, "pink pucat": 0xE5BFBF };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let state = null, game = null, feed = [], selected = null, cur = null, timer = null;
const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } };
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { Tele.teknis("save_gagal"); /* plays on without saving */ } };
let chats = (() => { try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || {}; } catch (e) { return {}; } })();
const saveChats = () => { try { localStorage.setItem(CHAT_KEY, JSON.stringify(chats)); } catch (e) { /* ignore */ } };
// jam.pause: hari yang dibekukan (tombol jeda di build dev); selama terisi, seluruh game diam di hari itu
const dayFloat = () => state.jam.pause != null ? state.jam.pause : state.jam.base_day + (Date.now() - state.jam.base_ts) / state.jam.ms;
const liveDay = () => Math.floor(dayFloat());
// telemetry (lokal dulu): konteks buat tiap sesi. Kamus event: riset/kamus-event.md
Tele.init({ ver: APP_VER, ctx: () => state ? { hari: liveDay(), umur: state.hadir.length, akun: state.akun, aksi: state.aksi, hadir: state.hadir } : {} });
const fmtDate = day => { const d = new Date(Engine.START_DATE + day * 86400000); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const fmtAge = a => a < 30 ? `${a} day${a === 1 ? "" : "s"}` : a < YEAR ? `${Math.floor(a / 30)} mo` : `${Math.floor(a / YEAR)} yr`;
const vm = () => game.view_model();
const member = id => vm().anggota.find(m => m.id === id);


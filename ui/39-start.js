// ================================================================ start: HARUS fragmen terakhir. Semua fragmen lain cuma mendefinisikan;
// di sini rumah dibangun, loop render (29a-render-loop.js) dijalankan, dan boot() (15-game-loop.js) memuat save.
houseSync(); setRoom(0, true); applyLight(true);
requestAnimationFrame(frame);
boot();
if (state && game) kabarSync();   // v48: jadwal notifikasi dari keadaan hari ini

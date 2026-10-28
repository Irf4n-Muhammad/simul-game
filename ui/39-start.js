setRoom(0, true); applyLight(true);
requestAnimationFrame(frame);
boot();
if (state && game) kabarSync();   // v48: jadwal notifikasi dari keadaan hari ini

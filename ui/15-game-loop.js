// ================================================================ game loop
function select(id) {
  selected = id; refresh(true);
}
function refresh(force) {
  const v = vm();
  cur = v.anggota.find(m => m.id === selected) || null;
  if (!cur || (!force && (cur.fase === "meninggal" || cur.fase === "merantau"))) {
    // whoever you were looking at is gone: show the oldest one still at home
    const alive = v.anggota.filter(m => m.fase !== "meninggal" && m.fase !== "merantau");
    cur = alive[0] || cur || v.anggota[v.anggota.length - 1]; selected = cur.id;
  }
  if (!K || K.key !== lookKey(cur)) buildCreature(cur);
  petSync(); bubbleSync();
  drawHud(); careUi();
}
// DEV-BEGIN
// dev: unlimited star points. Lives in the save, and is applied while the game replays, so the stars stay lit after a reload.
const DEV_PTS = 999;
function devStars(c) { const T = c && c.st && c.st.tree; if (T) T.peak = Math.max(T.peak, T.spent + DEV_PTS); }
if (Engine.HOOKS && !Engine.HOOKS._dev) {
  const _act = Engine.HOOKS.act;
  Engine.HOOKS.act = (home, cid, kind, day) => { Tree.setDev(state && state.dev_stars); if (state && state.dev_stars && kind.startsWith("pohon:")) { const c = home.get(cid); if (c && c.st) { Tree.points(c); devStars(c); } } return _act(home, cid, kind, day); };
  Engine.HOOKS._dev = true;
}
// DEV-END
function boot() {
  state = load();
  if (!Tele.session()) Tele.start();
  if (!state) { showSetup(); return; }
  // jam HP diputar mundur sejak terakhir buka: dicatat, karena hari di game bisa ikut mundur
  try { const last = +localStorage.getItem(SAVE_KEY + "-opened") || 0; if (last > Date.now() + 60e3) Tele.teknis("jam_mundur", { jam: Math.round((last - Date.now()) / 36e5) }); } catch (e) {}
  // DEV-NEXT
  Tree.setDev(state.dev_stars);
  // real-time games: days turn over at local midnight, so "morning" means morning
  if (state.jam.ms === 86400000 && !state.jam.mid) { const d0 = new Date(state.jam.base_ts); d0.setHours(0, 0, 0, 0); state.jam.base_ts = d0.getTime(); state.jam.mid = true; }
  // morning and evening care starts today for older saves, from day one for new ones
  const oldSave = state.aksi.length || state.hadir.length || liveDay() > 0;
  if (state.rawat_from == null) { state.rawat_from = oldSave ? liveDay() : 0; state.rawat_half = careHalfNow(); }
  if (state.tut == null) state.tut = oldSave ? 99 : 0;
  save();
  game = new GameLayer.Game(state);
  // tiap tindakan pemain dicatat jenisnya (bukan ke siapa) buat telemetry
  const _act = game.act.bind(game); game.act = (...a) => { const ok = _act(...a); Tele.aksi(a[1], ok); return ok; };
  game.onRefuse = t => { drainNoon(); closeSheet(); if (PH) closePhone(true); setTimeout(() => { play("shake", 600); say(t.quote, 3500); }, 100); };
  game.half_now = careHalfNow();
  const t = liveDay();
  // opening the app counts as being there today before today is played, same as when the save is replayed later
  if (document.visibilityState === "visible") game.mark_attended(t);
  feed = game.advance(Math.max(-1, t - 4), null);
  feed.push(...game.advance(t, t));
  // door tours: a save from before v43 has already used what is open today, so only new doors get a tour
  if (state.tur_pintu == null) { state.tur_pintu = {}; if (oldSave) for (const [k, v] of Object.entries(doorsNow())) if (v) state.tur_pintu[k] = 1; save(); }
  if (game.half_now) feed.push(...game.noon(t));
  const missed = feed.filter(l => l.day > state.dilihat && !l.attended);
  for (const l of missed) for (const m of Moments.detect(l)) if (m.i >= 2) Tele.ev("momen", { k: m.kind, tag: m.tag, i: m.i, fase: l.phase, lewat: 1 });
  const missedDays = new Set(missed.map(l => l.day)).size;
  selected = selected || vm().anggota[0].id;
  refresh(); applyHome();
  if (state.dilihat >= 0 && missedDays >= 2) showRecap(missedDays, missed);
  greetIfMissed();
  clearInterval(timer); timer = setInterval(tick, 500); tick();
  if (globalThis.Net && kdNet === null) Net.init({ game: () => game, changed: kdRefresh, recorded: kdRecorded }).then(ok => { kdNet = ok; kdRefresh(); });
  else if (globalThis.Net) Net.sync();
}

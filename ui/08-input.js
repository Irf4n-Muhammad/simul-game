// ================================================================ input
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener("pointerdown", e => { if (TOWN && TOWN.on) { canvas.setPointerCapture(e.pointerId); return TOWN.down(e); } down = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", e => {
  if (TOWN && TOWN.on) return TOWN.move(e);
  const r = canvas.getBoundingClientRect();
  lookX = ((e.clientX - r.left) / r.width - 0.5) * 2; lookY = ((e.clientY - r.top) / r.height - 0.5) * 2;
  if (down && roomIx === 1 && canCare() && hitCreature(e)) {
    rubbing += Math.abs(e.movementX) + Math.abs(e.movementY);
    if (rubbing > 400) { rubbing = 0; const ci = careItemFor("mandi"); if (ci) { if (!ci.done && ci.open) careAct(ci, null); } else if (cur.needs.kebersihan < 95 && game.act(selected, "mandi")) { save(); refresh(); burst(["○"], 6, "#8DA9BD", 22); say("Bubbles!"); } }
  }
});
canvas.addEventListener("pointerup", e => {
  if (TOWN && TOWN.on) return TOWN.up(e);
  if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; down = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { hideHint(); setRoom(roomIx + (dx < 0 ? 1 : -1)); coachEvent("room"); return; }
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && hitCreature(e)) { poke(); coachEvent("poke"); }
});
function hitCreature(e) {
  if (!K) return false;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera); return ray.intersectObject(K.root, true).length > 0;
}
const POKES = { bayi: ["Hehe!", "Ba-ba!", "Boop!"], anak: ["Hehe, stop!", "Tickles!", "Play with me!"], remaja: ["Hey!", "Ugh, what?", "...hi."], dewasa: ["Oh, hi!", "Hey you.", "Busy day!"], tua: ["Oh my!", "Hello, dear.", "Hehe."] };
let pokeN = 0;
function poke() {
  hideHint();
  if (!cur || cur.fase === "meninggal" || cur.fase === "merantau") return;
  if (now() < napUntil) return say("Five more minutes...");
  const lines = POKES[cur.fase] || POKES.dewasa;
  surpriseUntil = now() + 350; joyUntil = now() + 1600;
  play(["jump", "wiggle", "squash"][pokeN % 3], 700); say(lines[pokeN++ % lines.length], 1400); burst(["♥"], 3);
}
function hideHint() { $("hint").style.opacity = 0; }
$("prev").onclick = () => { hideHint(); setRoom(roomIx - 1); };
$("next").onclick = () => { hideHint(); setRoom(roomIx + 1); coachEvent("room"); };
$("actBtn").onclick = doAction;
canvas.addEventListener("wheel", e => { if (TOWN && TOWN.on) { e.preventDefault(); TOWN.wheel(e); } }, { passive: false });
addEventListener("keydown", e => { if (e.target.tagName === "INPUT" || (TOWN && TOWN.on)) return; if (e.key === "ArrowLeft") setRoom(roomIx - 1); if (e.key === "ArrowRight") setRoom(roomIx + 1); });


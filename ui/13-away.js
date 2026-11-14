// ================================================================ pergi (titip): keluarga yang jaga, tanpa penalti
// ---- going away: the family looks after everyone, no penalties
function awayBox() {
  const d = today(), on = game.titipNow(d), left = game.titipLeft(d);
  if (on) return `<div class="box away"><h3>Away until ${fmtDate(on.to)}</h3><small>The family is looking after everyone. Nothing bad happens while you're away.</small><button class="secondary" id="titipEnd">I'm back early</button></div>`;
  return `<div class="box away"><h3>Going away?</h3><small>Tell them before you go and the family looks after everyone, with no penalties. Starts tomorrow. ${left} of ${GameLayer.TITIP_MAX} days left this month.</small>
    <div class="row2">${[1, 3, 5, 7].map(n => `<button class="chip" data-titip="${n}" ${n > left ? "disabled" : ""}>${n} day${n > 1 ? "s" : ""}</button>`).join("")}</div></div>`;
}
function goAway(n) {
  const who = vm().anggota.find(m => m.fase !== "meninggal" && m.fase !== "merantau");
  if (!who || !game.act(who.id, "titip:" + n)) return say("Can't do that right now.");
  save(); showFamily();
  const on = game.titipNow(today());
  story("Family", `got it. Everyone is looked after until ${fmtDate(on.to)}. Have a good trip!`, false);
}
document.addEventListener("click", e => {
  if (e.target && e.target.id === "titipEnd") {
    const who = vm().anggota.find(m => m.fase !== "meninggal" && m.fase !== "merantau");
    if (who && game.act(who.id, "titip:batal")) { save(); showFamily(); say("You're back!"); }
  }
});


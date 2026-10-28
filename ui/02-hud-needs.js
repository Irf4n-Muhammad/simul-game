// ================================================================ HUD: needs
const NEEDS = [
  { k: "lapar", label: "Hunger", icon: '<path d="M4 11h16a8 8 0 0 1-16 0Z" fill="none"/><path d="M9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4"/>' },
  { k: "kebersihan", label: "Clean", icon: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" fill="none"/>' },
  { k: "energi", label: "Energy", icon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" fill="none"/>' },
  { k: "mood", label: "Mood", icon: '<circle cx="12" cy="12" r="8" fill="none"/><path d="M8.5 13.5q3.5 3.5 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>' },
  // v48: "Bond" pindah ke profil (tingkat kedekatan, ui/38-obrolan.js); di sini kebutuhan cepat: Attention (peluk, main, ngobrol)
  { k: "perhatian", label: "Attention", icon: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" fill="none"/>' },
];
$("needs").innerHTML = NEEDS.map(n => `<div class="need" id="need-${n.k}" role="img" aria-label="${n.label}"><div class="fill"></div><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${n.icon}</svg></div>`).join("");
function drawHud() {
  if (!cur) return;
  const gone = cur.fase === "meninggal" || cur.fase === "merantau";
  for (const n of NEEDS) {
    const v = Math.max(0, Math.min(100, n.k === "perhatian" ? attnOf(cur.id) : cur.needs[n.k]));
    const el = $("need-" + n.k);
    el.style.setProperty("--v", v.toFixed(0));
    el.style.setProperty("--c", n.k === "perhatian" ? (v > 30 ? "var(--rose)" : "var(--low)") : v > 60 ? "var(--good)" : v > 30 ? "var(--mid)" : "var(--low)");
    el.classList.toggle("low", !gone && v <= 30);
    el.setAttribute("aria-label", `${n.label}: ${v > 60 ? "good" : v > 30 ? "okay" : "low"}`);
  }
  const ready = treeReady(game.home.get(cur.id)), lb = $("lifeBtn"), dot = lb.querySelector(".dot-new");
  if (ready && !dot) lb.insertAdjacentHTML("beforeend", `<i class="dot-new"></i>`); else if (!ready && dot) dot.remove();
  $("nameLbl").textContent = cur.nama;
  $("ageLbl").textContent = `${PHASE_EN[cur.fase] || cur.fase} · ${fmtAge(cur.umur)} · Day ${game.home.last_day + 1}`;
  $("face").style.background = "#" + (COLOR[cur.rupa.warna] || 0xcccccc).toString(16).padStart(6, "0");
  $("bottom").style.opacity = gone ? 0.5 : 1;
  drawMoment(); drawDice(); drawDoors(); drawToday(); tourMaybe(); drawAhead(); tanyaDot(); bondCheck(); kabarOffer();
}


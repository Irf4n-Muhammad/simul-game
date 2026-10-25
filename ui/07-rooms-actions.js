// ================================================================ rooms + actions
let roomIx = 0;
function setRoom(i, instant) {
  roomIx = (i + ROOMS.length) % ROOMS.length;
  const go = () => {
    ROOMS.forEach((r, k) => r.g.visible = k === roomIx);
    const r = ROOMS[roomIx];
    paintBg();
    $("roomName").textContent = r.name;
    $("dots").innerHTML = ROOMS.map((_, k) => `<i class="${k === roomIx ? "on" : ""}"></i>`).join("");
    const icons = { Feed: '<path d="M4 11h16a8 8 0 0 1-16 0Z" fill="none"/>', Wash: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" fill="none"/>', Sleep: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" fill="none"/>', Play: '<circle cx="12" cy="12" r="8" fill="none"/><path d="M4 12h16"/>' };
    $("actBtn").innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[r.action]}</svg>${r.action}`;
    delete $("actBtn").dataset.lbl; if (game) careUi();
  };
  if (instant) return go();
  $("fade").classList.add("on"); setTimeout(() => { go(); $("fade").classList.remove("on"); }, 150);
}
function canCare() { return cur && cur.fase !== "meninggal" && cur.fase !== "merantau" && !game.pending; }
// ---- care, twice a day: morning (breakfast, bath) and evening (dinner, bedtime). Missed morning care can still be done late that day.
const CARE_ROOM = { makan_p: 0, mandi: 1, makan_m: 0, tidur: 2 };
// slot brand buat pilihan makan (iklan sebagai barang, tingkat 2): brand cuma ganti nama dan dapet tag Partner. Efek makanannya tetap dari game.js
const FOOD_WORD = { power: "eggs on toast", comfort: "pancakes", fruit: "fruit and yogurt", light: "soup", family: "family dinner", treat: "pizza" };
for (const [k, lbl] of Object.entries({ power: "Eggs on toast", comfort: "Pancakes", fruit: "Fruit and yogurt", light: "Light soup", family: "Family dinner", treat: "Pizza night" })) Brands.reg("food:" + k, lbl, "food", k);
const foodBrand = opt => (opt && Brands.meta("food:" + opt)) || null;
const careHalfNow = () => (dayFloat() % 1) >= 0.5 ? 1 : 0;
function careView() { const c = cur && game.home.get(cur.id); return c ? game.careView(c) : null; }
// what the action button does in this room right now
function careItemFor(act) {
  const v = careView(); if (!v) return null;
  const it = id => v.items.find(i => i.id === id);
  if (act === "makan") {
    const b = it("makan_p"), d = it("makan_m");
    if (!b && !d) return null;
    if (!b) return !d.done ? d : { ...d, full: true };   // hari pertama mulai sore: pagi nggak ada di daftar (bug lama, dibenerin v44)
    if (!d) return !b.done ? b : { ...b, full: true };
    return v.half && !d.done ? d : !b.done ? b : { ...(v.half ? d : b), full: true };
  }
  if (act === "mandi") return it("mandi");
  if (act === "tidur") return it("tidur");
  return null;
}
function careUi() {
  const v = canCare() ? careView() : null, strip = $("careStrip");
  strip.hidden = !v;
  const r = ROOMS[roomIx];
  if (!v) return;
  const ic = { makan_p: "☀", mandi: "☀", makan_m: "☾", tidur: "☾" };
  strip.innerHTML = v.items.map((i, k) => {
    const cls = i.done ? (i.late ? "done late" : "done") : !i.open ? "wait" : i.overdue ? "late now" : "now";
    return `${k && i.half && !v.items[k - 1].half ? '<span class="sep"></span>' : ""}<button class="${cls}" data-care="${i.id}" aria-label="${esc(i.label)}${i.done ? ", done" : i.open ? "" : ", after noon"}"><i>${i.done ? "✓" : ic[i.id]}</i>${esc(i.label)}${!i.done && i.overdue ? " · late" : ""}</button>`;
  }).join("");
  strip.querySelectorAll("[data-care]").forEach(b => b.onclick = () => {
    const i = careView().items.find(x => x.id === b.dataset.care);
    if (!i.open && !i.done) return say(`${i.label} is after noon.`);
    if (roomIx !== CARE_ROOM[i.id]) setRoom(CARE_ROOM[i.id]);
    if (!i.done) setTimeout(() => careDo(i), 220);
  });
  const it = careItemFor(r.act);
  if (it) {
    const lbl = it.full ? "Fed" : it.done ? ({ mandi: "Clean", tidur: "Tucked in" }[it.id] || "Done") : !it.open ? "After noon" : it.label + (it.overdue ? " (late)" : "");
    const btn = $("actBtn"), svg = btn.querySelector("svg");
    if (btn.dataset.lbl !== lbl) { btn.dataset.lbl = lbl; btn.innerHTML = (svg ? svg.outerHTML : "") + esc(lbl) + (it.done || it.full ? " ✓" : ""); }
    btn.classList.toggle("donebtn", !!(it.done || it.full || !it.open));
  } else { $("actBtn").classList.remove("donebtn"); delete $("actBtn").dataset.lbl; }
}
// ---- first visit: a short guided tour that moves on when the player actually does each thing
const COACH = [
  { on: "poke", el: () => null, text: n => `This is <b>${n}</b>. Tap them to say hi.` },
  { on: "care", el: () => $("actBtn"), text: n => `${n} is hungry. Tap <b>${$("actBtn").dataset.lbl || "the big button"}</b> to feed them, and pick what they eat.` },
  { on: "room", el: () => $("next"), text: () => `Tap the arrow or swipe to visit the other rooms. Each one has its own care.` },
  { on: "ok", el: () => $("careStrip"), text: n => `These are today's care tasks. <b>Morning</b>: breakfast and a bath. <b>Evening</b>: dinner and bedtime. Missing one day is fine, ${n} manages. Miss them day after day and ${n} gets tired and does worse at big moments. Going away? Tell the family in <b>Family</b>.` },
  { on: "ok", phone: true, el: () => $("lifeBtn"), text: n => `Your <b>phone</b> starts small: family chat, photos and the calendar. New apps show up as ${n} grows.` },
  { on: "ok", el: () => null, text: n => `Time here runs like real time. Come back ${careHalfNow() ? "tomorrow morning for breakfast" : "this evening for dinner and bedtime"}. ${n} will be waiting.` },
];
let coachEl = null, coachRing = null;
function coachShow() {
  if (!state || state.tut == null || state.tut >= COACH.length || !cur || sheetKind || PH) { coachHide(); return; }
  const st = COACH[state.tut], n = esc(cur.nama), target = st.el();
  hideHint();
  coachMake();
  const last = state.tut === COACH.length - 1;
  coachEl.innerHTML = `<div class="bub">${st.text(n)}<div class="row2"><small>${state.tut + 1} of ${COACH.length}</small><span>${st.on === "ok" ? `<button data-c="ok">${last ? "Let's go" : "Got it"}</button>` : `<button class="skip" data-c="skip">Skip tour</button>`}</span></div></div>`;
  Tele.intro("tur", state.tut, "tampil");
  coachEl.querySelector("[data-c]").onclick = e => { const skip = e.target.dataset.c === "skip"; Tele.intro("tur", state.tut, skip ? "lewat" : "lanjut"); if (skip) state.tut = COACH.length; else state.tut += 1; save(); coachShow(); };
  coachPlace(target);
}
function coachMake() { if (!coachEl) { coachEl = document.createElement("div"); coachEl.className = "coach"; $("app").appendChild(coachEl); coachRing = document.createElement("div"); coachRing.className = "coach-ring"; $("app").appendChild(coachRing); } }
// the bubble sits under the thing it talks about (or above it, when that thing is low on the screen), with a ring around it
function coachPlace(target) {
  const app = $("app").getBoundingClientRect();
  if (target && !target.hidden) {
    const r = target.getBoundingClientRect(), pad = 6;
    Object.assign(coachRing.style, { display: "block", left: r.left - app.left - pad + "px", top: r.top - app.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
    const below = r.top - app.top < app.height / 2;
    coachEl.style.top = below ? r.bottom - app.top + 18 + "px" : ""; coachEl.style.bottom = below ? "" : app.bottom - r.top + 18 + "px";
  } else { coachRing.style.display = "none"; coachEl.style.top = ""; coachEl.style.bottom = "190px"; }
}
function coachHide() { if (coachEl) { coachEl.remove(); coachRing.remove(); coachEl = coachRing = null; } }
function coachEvent(kind) {
  if (!state || state.tut == null || state.tut >= COACH.length) return;
  if (COACH[state.tut].on === kind) { state.tut += 1; save(); setTimeout(coachShow, 900); }
}
function careDo(i) {
  if (!canCare()) return;
  if (i.opts) {
    openSheet("care", `<span class="ribbon" style="background: var(--sky)">${i.half ? "EVENING" : "MORNING"} · ${esc(cur.nama)}</span>
      <h2>${{ makan_p: "What's for breakfast?", makan_m: "What's for dinner?", tidur: "How should bedtime go?" }[i.id]}</h2>
      ${i.overdue ? `<p>It's late, so this one won't give a bonus. ${esc(cur.nama)} still needs it.</p>` : ""}
      <div class="carepick">${i.opts.map(o => { const fb = foodBrand(o.id); if (fb) Tele.brand("food:" + o.id, "tampil", fb.tier); return `<button class="choice yes" data-opt="${o.id}"><b>${esc(fb ? fb.name : o.label)}${fb ? ' <i class="ptag">Partner</i>' : ""}${o.taste > 0 ? " ♥" : ""}</b><small>${esc(o.note)}${o.taste > 0 ? ` · ${esc(cur.nama)} loves this` : o.taste < 0 ? ` · ${esc(cur.nama)} is not a fan` : ""}</small></button>`; }).join("")}</div>
      <button class="close" data-close="1">Not now</button>`);
    sheet.querySelectorAll("[data-opt]").forEach(b => b.onclick = () => { closeSheet(); careAct(i, b.dataset.opt); });
    sheet.querySelector("[data-close]").onclick = closeSheet;
  } else careAct(i, null);
}
function careAct(i, opt) {
  game.half_now = careHalfNow();
  if (!game.act(selected, "rawat:" + i.id + (opt ? ":" + opt : ""))) return;
  let note = game.careNote;
  const fb = foodBrand(opt);
  if (fb) { Tele.brand("food:" + opt, "pakai", fb.tier); if (note && FOOD_WORD[opt] && note.includes(FOOD_WORD[opt])) { note = note.split(FOOD_WORD[opt]).join(fb.name); Tele.brand("food:" + opt, "sebut", fb.tier); } }
  drainNoon(); save(); refresh(); joyUntil = now() + 2600; coachEvent("care");
  if (note) setTimeout(() => story(cur.nama, note, false), 900);
  playCare({ makan_p: "makan", makan_m: "makan", mandi: "mandi", tidur: "tidur" }[i.id], i, opt);
}
function doAction() {
  hideHint();
  if (!cur) return;
  if (cur.fase === "meninggal") return story(cur.nama, "is resting now. Pick someone else from the family.", false);
  if (cur.fase === "merantau") return story(cur.nama, "lives far away now and only visits sometimes.", false);
  if (game.pending) return showDilemma();
  if (now() < napUntil) return say("Zzz...");
  const r = ROOMS[roomIx];
  const ci = careItemFor(r.act);
  if (ci) {
    if (ci.full) return (say("I'm full!"), play("shake", 600));
    if (ci.done) return (say({ mandi: "Already clean!", tidur: "I'm cozy already." }[ci.id] || "Done!"), play("shake", 600));
    if (!ci.open) return say(r.act === "tidur" ? "It's not bedtime yet!" : "Later!");
    return careDo(ci);
  }
  const before = r.act === "makan" ? cur.needs.lapar : r.act === "mandi" ? cur.needs.kebersihan : r.act === "tidur" ? cur.needs.energi : cur.ikatan;
  if (r.act !== "peluk" && before > 95) { say({ makan: "I'm full!", mandi: "Already clean!", tidur: "Not sleepy!" }[r.act]); play("shake", 600); return; }
  if (!game.act(selected, r.act)) return;
  save(); refresh(); joyUntil = now() + 2600;
  playCare(r.act);
}
function playCare(act, item, opt) {
  if (act === "makan") {
    const food = mesh(new THREE.SphereGeometry(0.28, 20, 16), M(0xff8c32), 0, 4.2, 1.6); const t0 = now();
    (function drop() {
      const p = Math.min(1, (now() - t0) / 650);
      food.position.y = 4.2 - (4.2 - 1.45 * K.scale) * p * p; food.position.z = 1.6 - 0.4 * p; mouthOpen = p;
      if (p < 1) requestAnimationFrame(drop);
      else { scene.remove(food); chewUntil = now() + 1200; setTimeout(() => { say(foodBrand(opt) ? foodBrand(opt).name + "!" : ({ power: "Strong start!", comfort: "Pancakes!!", fruit: "Crunchy!", light: "Warm soup...", family: "Everyone's here!", treat: "PIZZA!" }[opt] || "Nom nom!")); burst(["♥"], 4); }, 400); }
    })();
  } else if (act === "mandi") {
    for (let i = 0; i < 14; i++) setTimeout(() => burst(["○"], 1, "#8DA9BD", 22 + Math.random() * 16), i * 90);
    play("wiggle", 1200); setTimeout(() => say("Squeaky clean!"), 900);
  } else if (act === "tidur") {
    napUntil = now() + 4000; say({ story: "One more page...", cuddle: "Love you...", early: "Nigh-night..." }[opt] || "Nigh-night...", 1500);
    setTimeout(() => { say("I feel great!"); play("jump", 700); }, 4100);
  } else {
    const ball = ROOMS[3].g.userData.ball, t0 = now();
    (function toss() {
      const p = Math.min(1, (now() - t0) / 900);
      const h0 = ROOMS[3].g.userData.ballHome; ball.position.set(h0.x * (1 - p), h0.y + Math.sin(p * Math.PI) * 3.6, h0.z + (1.4 - h0.z) * p);
      if (p < 1) requestAnimationFrame(toss);
      else { play("jump", 800); setTimeout(() => ball.position.copy(ROOMS[3].g.userData.ballHome), 500); say("Again! Again!"); burst(["★"], 5, "#D4A853"); }
    })();
  }
}
const now = () => performance.now();


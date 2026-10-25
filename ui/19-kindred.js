// ---- Kindred: meet, date and marry creatures from other players' families. Every step is an offer the other side can turn down.
const kdFace = (rupa, name) => `<span class="kd-face" style="background:${rupa ? colorOf({ rupa }) : "#ddd"}">${esc((name || "?")[0])}</span>`;
const KD_STAGE = { calon: "Getting to know each other", pasangan: "Dating", tunangan: "Engaged", "suami-istri": "Married" };
const KD_WISH = { jadian: "wants to ask {p} to make it official", tunangan: "wants to propose to {p}", nikah: "is ready to marry {p}" };
const KD_SOON = { jadian: "Could make it official", tunangan: "Could get engaged", nikah: "Could get married" };
function kdLine(o, c) {
  const n = (o.card || {}).nama || "Someone", fam = (o.card || {}).fam, me = c.name;
  if (o.t === "kenal") return `${n}${fam ? ` from the ${fam} family` : ""} ${o.self ? "said hi to" : "wants to meet"} ${me}. ${o.wants ? `${me} seems curious.` : `${me} doesn't seem that into it.`}`;
  if (o.t === "ketahuan") return `${n} was seen out with ${o.with || "someone"} from another family. ${o.wants ? `${me} wants to talk it through.` : `${me} is hurt and wants out.`}`;
  const ask = { jadian: `${n} asked ${me} to make it official.`, tunangan: `${n} proposed to ${me}! 💍`, nikah: `${n} is ready for a ${o.style === "besar" ? "big party" : "simple garden"} wedding.` }[o.t] || `${n} asked ${me}.`;
  return `${ask} ${o.wants ? `${me} wants to say yes.` : `${me} isn't sure.`}`;
}
const KD_BTN = { kenal: ["Meet them", "Not now"], ketahuan: ["Forgive", "Break up"], step: ["Give blessing", "Object"] };
let kdNet = null; // null while connecting, false when this copy of the game has no shared database
function phKindred(c) {
  const V = globalThis.Net ? Net.view(c) : { ready: false };
  if (!V.ready) return `${phHead("Kindred")}<p class="pa-note">${kdNet === false ? "Kindred needs the shared online version of the game, where other families play." : V.err ? "Kindred can't connect right now. Try again later." : "Connecting…"}</p>`;
  const rows = [], n = esc(c.name);
  for (const P of V.rels) {
    const st = !P.next ? `${P.since} days married` : P.asked ? `Waiting for the ${esc(P.fam || "other")} family` : P.wait ? `${KD_SOON[P.next]} in ${P.wait} day${P.wait === 1 ? "" : "s"}` : `${n} decides when`;
    rows.push(`<div class="kd-couple${P.tipe === "calon" ? " fling" : ""}"><span class="kd-pair">${kdFace(c.rupa, c.name)}${kdFace(P.rupa, P.nama)}</span>
      <b>${n} & ${esc(P.nama)}</b><small>${KD_STAGE[P.tipe]}${P.tipe !== "suami-istri" ? ` · ${P.since} day${P.since === 1 ? "" : "s"}` : ""} · the ${esc(P.fam || "other")} family</small><small>${st}</small>
      <button class="kd-end" data-kd="end:${esc(P.pid)}">${P.tipe === "suami-istri" ? "Suggest a divorce" : "Suggest ending it"}</button></div>`);
  }
  const asks = V.wishes.map(w => `<div class="pa-row kd-row kd-ask">${kdFace(c.rupa, c.name)}<span class="pa-grow"><b>${n} ${esc(KD_WISH[w.t].replace("{p}", w.nama || "them"))}</b><small>They'd like your blessing first.</small></span>
    ${w.t === "nikah" ? `<span class="kd-two"><button class="kd-btn" data-kd="bless:${w.id}:besar">Big party</button><button class="kd-btn" data-kd="bless:${w.id}:kecil">Garden</button><button class="kd-btn alt" data-kd="hold:${w.id}">Not yet</button></span>`
      : `<span class="kd-two"><button class="kd-btn" data-kd="bless:${w.id}">Bless</button><button class="kd-btn alt" data-kd="hold:${w.id}">Not yet</button></span>`}</div>`)
    .concat(V.inbox.map(o => { const B = KD_BTN[o.t] || KD_BTN.step; return `<div class="pa-row kd-row kd-ask">${kdFace((o.card || {}).rupa, (o.card || {}).nama)}<span class="pa-grow"><b>${esc((o.card || {}).nama || "Someone")}</b><small>${esc(kdLine(o, c))}</small></span>
    <span class="kd-two"><button class="kd-btn" data-kd="yes:${esc(o.id)}">${B[0]}</button><button class="kd-btn alt" data-kd="no:${esc(o.id)}">${B[1]}</button></span></div>`; }));
  if (asks.length) rows.push(`<h4 class="pa-h">Your advice</h4><div class="pa-list">${asks.join("")}</div><p class="pa-note">${n} listens to you, mostly. Leave it and ${n} decides alone in a few days.</p>`);
  if (V.notes.length) rows.push(`<h4 class="pa-h">Lately</h4><div class="pa-list kd-notes">${V.notes.map(x => `<div class="pa-row"><span class="pa-grow"><small>${esc(x.t)}</small></span></div>`).join("")}</div>`);
  if (V.canOpen) {
    const kind = V.cap <= 1 ? "the faithful type: one at a time" : V.cap >= 4 ? `a flirt: up to ${V.cap} at once` : `easygoing: up to ${V.cap} at once`;
    rows.push(`<div class="pa-list"><button class="pa-row kd-row" data-kd="open"><span class="pa-grow"><b>Open to meet</b><small>Other families can see ${n}, and ${n} may say hi to someone on their own. ${n} is ${kind}.</small></span><i class="kd-sw${V.open ? " on" : ""}"></i></button></div>`);
    if (V.cool) rows.push(`<p class="pa-note">${n} needs some time after the breakup. Back in ${V.cool} day${V.cool === 1 ? "" : "s"}.</p>`);
    else if (!V.room) rows.push(`<p class="pa-note">${n} has their hands full right now.</p>`);
    else {
      rows.push(`<h4 class="pa-h">Open to meet${V.suggests < 2 ? ` · ${V.suggests} suggestion${V.suggests === 1 ? "" : "s"} left today` : ""}</h4>` + (V.others.length ? `<div class="pa-list">${V.others.slice(0, 30).map(o => `<div class="pa-row kd-row">${kdFace(o.rupa, o.nama)}<span class="pa-grow"><b>${esc(o.nama)}</b><small>The ${esc(o.fam)} family · ${fmtAge(o.umur)}${o.job ? " · " + esc(o.job) : ""}</small></span>
        <button class="kd-btn${o.asked ? " alt" : ""}" data-kd="intro:${esc(o.key)}" ${o.asked || !V.suggests ? "disabled" : ""}>${o.asked ? "Said hi" : "Suggest"}</button></div>`).join("")}</div>` : `<p class="pa-note">Nobody from another family is looking right now.</p>`));
    }
  } else if (!V.rels.length) rows.push(`<p class="pa-note">${n} can use Kindred as a grown-up.</p>`);
  return `${phHead("Kindred", "Families meeting families")}${rows.join("")}<p class="pa-note">You suggest, ${n} decides. No messages between families, only offers.</p>`;
}
function kdDo(cmd, btn) {
  const c = PH.c, [k, a1, ...rest] = cmd.split(":"), arg = [a1, ...rest].join(":");
  if (!globalThis.Net) return;
  let r = null;
  if (k === "open") Net.setOpen(c, !Net.view(c).open);
  else if (k === "intro") r = Net.introduce(c, arg);
  else if (k === "yes" || k === "no") r = Net.answer(c, arg, k === "yes");
  else if (k === "bless") r = Net.bless(c, a1, rest[0] || null);
  else if (k === "hold") r = Net.hold(c, a1);
  else if (k === "end") { if (btn.dataset.sure) r = Net.breakUp(c, arg); else { btn.dataset.sure = 1; btn.textContent = "Tap again to suggest it"; return; } }
  if (r && r.quote) kdToast(`${c.name}: “${r.quote}”`);
  else if (r && r.ok && k === "intro") kdToast(`${c.name} said hi! 👋`);
  kdRefresh();
}
function kdToast(t) {
  const box = PH && PH.el; if (!box) return;
  box.querySelectorAll(".kd-toast").forEach(x => x.remove());
  const el = document.createElement("div"); el.className = "kd-toast"; el.textContent = t; box.appendChild(el);
  setTimeout(() => el.classList.add("out"), 2800); setTimeout(() => el.remove(), 3300);
}
// redraw in place: news from other families can arrive any time, and the page should not jump or replay its entrance
let kdLast = "";
function kdRefresh() {
  if (!PH || PH.view !== "kindred") return;
  const v = PH.el.querySelector("#phView"), pa = v.querySelector(".pa"), html = phKindred(PH.c = game.home.get(cur.id));
  if (!pa || html === kdLast) return;
  kdLast = pa.innerHTML = html;
  v.querySelectorAll("[data-kd]").forEach(b => b.onclick = () => kdDo(b.dataset.kd, b));
}
function kdRecorded() { drainNoon(); save(); refresh(); kdRefresh(); }


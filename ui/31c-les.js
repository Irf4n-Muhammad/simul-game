// ================================================================ v82: les (ilmu.js)
// Classes: daftar kursus per topik umum, tiap kursus kartu pilihan (tingkat, harga, jadwal, perkiraan dapat apa, kenapa direkomendasikan).
// Angka jalur nggak dipamerin di buku sendiri: dipakai buat milih kartu les, dan kelihatan di panel bintang (16-stars.js).
const ilmuOn = () => !!game && game.home.ilmu_from != null && today() >= game.home.ilmu_from;
const LES_TIER_C = ["#6BA368", "#3B7DD8", "#C0723A", "#8A5CC0"];
const lesTier = t => `<span class="les-tier" style="--c:${LES_TIER_C[t]}">${Ilmu.TIER[t]}</span>`;
const lesGrown = c => ["dewasa", "tua"].includes(Engine.phase_of(c.age(today())));
// kalimat "kenapa kelas ini": pengali level match dalam bahasa orang tua
function lesMatchTx(k, n) {
  if (k.capped) return `${n} has gone as far as this class goes. The next step is one of the classes under it.`;
  if (k.match >= 1) return `Right level for ${n} (${Ilmu.TIER[k.tier]}): full progress.`;
  if (k.match === 0.5) return `One level above ${n}. The basics aren't there yet, so progress is half speed.`;
  if (k.match === 0.2) return `Two levels above ${n}. Most of it goes over their head: progress ×0.2.`;
  return `Below ${n}'s level. Almost nothing new to learn here.`;
}
function lesCard(c, k, star, ix) {
  const n = esc(c.name), w = wallet(), grown = lesGrown(c), start = Ilmu.nextWave(today());
  const tgt = k.tlabel;
  const canKitchen = w && w.koin >= k.price, canWallet = grown && c.st.wallet >= k.price, ok = canCare() && !k.taking && ilmuOn();
  return `<div class="ag-choice${star ? " star" : ""}${k.taking ? " picked" : ""}">
    ${k.taking ? `<span class="ag-badge ok">✓ Enrolled</span>` : star ? `<span class="ag-badge">★ Recommended</span>` : ""}
    <div class="ag-ch-h"><span class="ag-ic">${["🌱", "📘", "🎓"][k.lvl]}</span><span><b>${esc(k.name)}</b><small>${lesTier(k.lvl)} class${k.parent ? ` · after ${esc(k.parent.name)}` : ""}</small></span></div>
    <p class="ag-like">8 sessions, twice a week, for 4 weeks. Next start ${esc(agDay(start))}.</p>
    <div class="ag-gets"><em>What ${n} gets</em>
      ${tgt ? `<span class="up"><i>+</i>About +${k.per} ${esc(tgt)} per session (up to +${k.total} over the course)</span>` : `<span class="eq"><i>=</i>No progress from this class now</span>`}
      <span class="${k.match >= 1 ? "up" : k.match >= 0.2 ? "eq" : "down"}"><i>${k.match >= 1 ? "+" : k.match >= 0.2 ? "=" : "−"}</i>${esc(lesMatchTx(k, c.name))}</span>
      <span class="down"><i>−</i>Each session costs energy (−${k.sport ? 12 : 8}) and a little mood (−2)</span>
      <span class="${k.minat >= 55 ? "up" : k.minat >= 35 ? "eq" : "down"}"><i>${k.minat >= 55 ? "+" : k.minat >= 35 ? "=" : "−"}</i>${n} on ${esc(Tree.NODES[k.field].label)}: ${Ilmu.MINAT_WORD(k.minat)}${k.minat < 25 ? ". Might skip sessions" : ""}</span></div>
    ${star ? `<p class="ag-why"><b>Why we recommend it:</b> right level for ${n}, and ${esc(Tree.NODES[k.field].label)} is something ${n} ${k.minat >= 55 ? "enjoys" : "is quick at"}.</p>` : ""}
    ${k.taking ? `<button class="ag-pick" disabled>✓ Enrolled</button>` : `<button class="ag-pick" data-les="${ix}" data-pay="dapur" ${ok && canKitchen ? "" : "disabled"}>Enrol · ${coinTxt(k.price)} kitchen coins</button>
    ${grown ? `<button class="ag-pick sec" data-les="${ix}" data-pay="dompet" ${ok && canWallet ? "" : "disabled"}>Pay from ${n}'s wallet · ${k.price}</button>` : ""}`}
  </div>`;
}
let lesOpen = null;   // topik yang lagi dibuka di daftar kelas
function showLes(id = cur && cur.id) {
  const c = game && game.home.get(id); if (!c || !c.st) return;
  const n = esc(c.name), d = today(), I = Ilmu.il(c.st), w = wallet();
  if (!ilmuOn()) { openSheet("les", `<span class="ribbon">CLASSES</span><h2>Classes open tomorrow</h2><p class="muted">The class calendar starts with the next day.</p><button class="close" data-close="1">Close</button>`); sheet.querySelector("[data-close]").onclick = closeSheet; return; }
  if (c.age(d) < Ilmu.MIN_AGE) { openSheet("les", `<span class="ribbon">CLASSES</span><h2>Too young for classes</h2><p class="muted">Classes start once ${n} is at school (${fmtDate(c.born + Ilmu.MIN_AGE)}).</p><button class="close" data-close="1">Close</button>`); sheet.querySelector("[data-close]").onclick = closeSheet; return; }
  const cat = Ilmu.catalog(c, d), rec = new Set(Ilmu.recommend(c, d).map(k => k.id));
  const act = I.kursus.filter(k => k.n < Ilmu.SESI.length);
  const groups = {};
  for (const k of cat) (groups[k.field] ||= []).push(k);
  const book = Object.fromEntries(Ilmu.book(c).map(b => [b.field, b]));
  const fields = Object.keys(groups).sort((a, b) => ((groups[b].some(k => rec.has(k.id)) - groups[a].some(k => rec.has(k.id)))) || ((book[b] ? book[b].v : 0) - (book[a] ? book[a].v : 0)));
  if (lesOpen == null) lesOpen = fields[0];
  const all = [];
  const grp = f => {
    const B = book[f], ks = groups[f].sort((a, b) => (rec.has(b.id) - rec.has(a.id)) || (a.lvl - b.lvl));
    const open = lesOpen === f;
    return `<div class="les-grp${open ? " open" : ""}"><button class="les-gh" data-lesg="${f}"><span><b>${esc(Tree.NODES[f].label)}</b><small>${B && B.touched ? `${esc(B.top)} ${Math.round(B.v)} · ${Ilmu.TIER[B.tier]}` : "Not started"} · ${esc(B ? B.word : "")}</small></span><i>${open ? "−" : "+"}</i></button>
      ${open ? `<div class="ag-choices">${ks.map(k => { all.push(k); return lesCard(c, k, rec.has(k.id), all.length - 1); }).join("")}</div>` : ""}</div>`;
  };
  openSheet("les", `
    <span class="ribbon">CLASSES · ${n}</span>
    <h2>Classes for ${n}</h2>
    <p class="muted">A new round starts every two weeks (next: ${esc(agDay(Ilmu.nextWave(d)))}). ${lesGrown(c) ? `Pay with kitchen coins or ${n}'s own wallet.` : "Paid with kitchen coins."} You have ${coinTxt(w ? w.koin : 0)}.</p>
    ${act.length ? `<h3>Taking now</h3><div class="list">${act.map(k => { const K = Ilmu.COURSES[k.id], nx = Ilmu.schedule(k)[k.n]; return `<div class="line"><span class="grow"><b>${esc(K.name)} ${lesTier(K.lvl)}</b><small class="sub">${k.n}/${Ilmu.SESI.length} sessions${k.gain ? ` · +${k.gain} so far` : ""}${nx != null ? ` · next ${esc(agDay(nx))}` : ""}</small></span></div>`; }).join("")}</div>` : ""}
    <h3>Pick a topic</h3>
    <p class="muted small">Each class is one step on a path: general topic (Junior), then the class itself (Intermediate), then a real job (Senior). Classes far above or below ${n}'s level teach very little.</p>
    ${fields.map(grp).join("")}
    <button class="close" data-close="1">Close</button>`);
  sheet.querySelectorAll("[data-lesg]").forEach(b => b.onclick = () => { lesOpen = lesOpen === b.dataset.lesg ? "" : b.dataset.lesg; showLes(id); });
  sheet.querySelectorAll("[data-les]").forEach(b => b.onclick = () => {
    const k = all[+b.dataset.les], pay = b.dataset.pay; if (!k) return;
    if (pay === "dapur" && (!wallet() || wallet().koin < k.price)) return;
    if (!game.act(c.id, "les:" + k.id + (pay === "dompet" ? ":dompet" : ""))) return;
    if (pay === "dapur") wallet().koin -= k.price;
    Tele.ev("les", { a: "daftar", k: k.id, lvl: k.lvl, bayar: pay, star: rec.has(k.id) ? 1 : 0 });
    save(); refresh(); showLes(id);
    say(`${k.name}? Okay!`);
  });
  sheet.querySelector("[data-close]").onclick = () => { lesOpen = null; closeSheet(); };
}
// gelembung: kalimat makhluk soal les hari ini, sekali per hari waktu pemain ada di rumah
function lesBubble() {
  if (!game || !cur || !ilmuOn() || sheetKind || PH) return;
  const c = game.home.get(cur.id), U = c && c.st && c.st.ilmu && c.st.ilmu.ucap;
  if (!U || U.d !== today() || (state.les_ucap || {})[cur.id] === U.d) return;
  (state.les_ucap ||= {})[cur.id] = U.d; save();
  setTimeout(() => say(U.tx, 3200), 600);
}

// ================================================================ v48: perhatian, kedekatan, pertanyaan harian di Ngobrol
// Tiga hal yang dipisah dari bar "Bond" lama (diskusi loop harian, 28 Okt):
//   1. PERHATIAN: kebutuhan cepat di HUD, sejajar lapar dan tidur. Diisi peluk (Play), ketuk, dan ngobrol; habis dalam setengah hari game.
//      Disimpan UI di state.perhatian { cid: hari pecahan terakhir penuh } (bukan aksi, tidak di-replay, tidak menyentuh simulasi).
//   2. KEDEKATAN: ikatan (c.bond) pindah ke profil sebagai tingkat yang naik pelan. Tiap naik tingkat ada momen kecil sekali
//      (state.ikatan_tier { cid: tingkat tertinggi yang sudah dirayakan }).
//   3. PERTANYAAN HARIAN: makhluk yang buka obrolan (obrolan.js). Bayi: keadaan, jawabannya tindakan. Jawaban = aksi tanya:… (di-replay).
//      Kalau Claude tersedia (claude.ai), pertanyaannya ditulis Claude dari fakta makhluk hari itu supaya nggak berulang; kalau nggak, daftar.
const ATTN_DAYS = 0.5;
function attnOf(id) {
  const t = state && state.perhatian && state.perhatian[id];
  if (t == null) return 60;
  return Math.max(0, Math.min(100, 100 - (dayFloat() - t) / ATTN_DAYS * 100));
}
function attnFill(id, amt = 100) {
  if (!state) return;
  const v = Math.min(100, attnOf(id) + amt);
  (state.perhatian ||= {})[id] = dayFloat() - (100 - v) / 100 * ATTN_DAYS;
}

// ---- kedekatan: tingkat dari c.bond (mulai 50 = "Warming up")
const BOND_TIERS = [
  { at: 0, name: "Distant" }, { at: 40, name: "Warming up" }, { at: 60, name: "Close" }, { at: 75, name: "Very close" }, { at: 90, name: "Inseparable" },
];
const bondTier = b => { let i = 0; BOND_TIERS.forEach((T, k) => { if (b >= T.at) i = k; }); return i; };
const BOND_MOMENT = {
  1: { bayi: n => `smiled the moment you walked in.`, base: n => `smiled the moment you walked in.` },
  2: { bayi: n => `reached for you before anyone else today.`, remaja: n => `said "love you", then pretended they didn't.`, base: n => `said "love you" for the first time, out of nowhere.` },
  3: { bayi: n => `fell asleep holding your finger.`, dewasa: n => `called just to hear your voice.`, tua: n => `called just to hear your voice.`, base: n => `saved you the best seat today without being asked.` },
  4: { bayi: n => `laughed only for you today.`, base: n => `told you "you're my favourite person."` },
};
function bondBox(id) {
  const m = member(id); if (!m || m.fase === "meninggal") return "";
  const i = bondTier(m.ikatan), T = BOND_TIERS[i], next = BOND_TIERS[i + 1];
  const pips = BOND_TIERS.slice(1).map((_, k) => `<i class="bond-pip${k < i ? " on" : ""}"></i>`).join("");
  return `<div class="fieldset" id="bondBox"><span class="lbl">Bond with you</span>
    <div class="bond-row"><b>${esc(T.name)}</b><span class="bond-pips" aria-hidden="true">${pips}</span></div>
    <small class="sub">${next ? `Next: ${esc(next.name)}. ` : ""}It grows slowly: talking every day, answering ${esc(m.nama)}'s questions, keeping the care routine, and being there on big days. A hug fills Attention, not this.</small></div>`;
}
// dipanggil tiap refresh: naik tingkat dirayakan sekali; tingkat awal dicatat diam-diam
function bondCheck() {
  if (!cur || !state || cur.fase === "meninggal" || cur.fase === "merantau") return;
  const seen = (state.ikatan_tier ||= {}), i = bondTier(cur.ikatan);
  if (seen[cur.id] == null) { seen[cur.id] = i; save(); return; }
  if (i <= seen[cur.id]) return;
  seen[cur.id] = i; save();
  const M = BOND_MOMENT[i]; if (!M) return;
  Tele.ev("dekat", { k: i, a: "naik" });
  setTimeout(() => { story(cur.nama, (M[cur.fase] || M.base)(cur.nama) + ` Bond: ${BOND_TIERS[i].name}.`, true); burst(["♥"], 8); }, 1200);
}

// ---- pertanyaan harian
function tanyaSnap() {
  if (!cur || !game || !state) return null;
  const c = game.home.get(cur.id); if (!c) return null;
  const d = today(), k = typeof scNext === "function" && c.age(d) < 270 ? scNext(c, d) : null;
  const ev = (Engine.world_active(game.home.world, d) || [])[0];
  return { d, cid: c.id, nama: cur.nama, fase: cur.fase, seed: state.akun, traits: c.traits, last: c.info.tanya_hari ?? null,
    ctx: { ujian: k && /quiz|exam|test|paper/i.test(k.label) ? { hari: k.day, label: k.label.replace(/^(the|first|last)\s/i, m => m.toLowerCase()) } : null,
      sahabat: c.info.sahabat ? c.info.sahabat.nama : null, dunia: ev ? ev.nama : null } };
}
let tanyaAi = null;   // { key, q } pertanyaan tulisan Claude buat hari ini (cuma di memori; besok ditulis lagi)
function tanyaView() {
  if (!cur || !canCare() || cur.fase === "meninggal" || cur.fase === "merantau") return null;
  const S = tanyaSnap(); if (!S) return null;
  const q = Obrolan.opener(S); if (!q) return null;
  const k = cur.id + "|" + S.d;
  return tanyaAi && tanyaAi.key === k ? tanyaAi.q : q;
}
// Claude nulis pertanyaannya sendiri dari fakta hari ini; sifat dan arahnya tetap salah satu dari 8 sifat, jadi aksinya sama bentuknya
async function tanyaAsk(m, base) {
  const k = m.id + "|" + today();
  if (!sampleFn || m.fase === "bayi" || (tanyaAi && tanyaAi.key === k)) return;
  try {
    const r = await sampleFn.json(`You are ${m.nama}, a small creature in a virtual life game, talking to your guardian (the player). ${VOICE[m.fase] || VOICE.dewasa}\n`
      + `Start the conversation: ask your guardian ONE short question about something in your life right now (school, friends, feelings, plans, the town). `
      + `Use the facts below; do not invent big life events. Then give exactly 3 short answers the guardian could tap (max 7 words each). `
      + `For each answer say which ONE of your traits it would nudge (one of: ${Obrolan.TRAITS.join(", ")}), the direction ("+" or "-"), and your short in-character reply (max 15 words). `
      + `Reply only JSON {"q": string, "opts": [{"label": string, "trait": string, "dir": "+"|"-", "reply": string}]}.\n\nFacts about you:\n${facts(m)}`, { modelTier: "quick", cache: false });
    const opts = r && Array.isArray(r.opts) ? r.opts.filter(x => x && typeof x.label === "string" && Obrolan.TRAITS.includes(x.trait) && (x.dir === "+" || x.dir === "-")).slice(0, 3) : [];
    if (!r || typeof r.q !== "string" || !r.q.trim() || opts.length < 2) return;
    tanyaAi = { key: k, q: { id: "ai", mode: "kata", text: r.q.trim().slice(0, 160), opts: opts.map((x, i) => ({ k: "ai" + i, label: x.label.trim().slice(0, 48), t: x.trait + x.dir, r: String(x.reply || "").trim().slice(0, 140) })) } };
    if (talkOpen && selected === m.id && tanyaShown && tanyaShown.id === base.id) tanyaShow();
  } catch (e) { failHard(e); }
}
let talkOpen = false, tanyaShown = null;
// dipanggil waktu bar ngobrol dibuka (ui/10): pertanyaan hari ini di atas bar, atau pesan kalau sudah dijawab
function tanyaShow() {
  const box = $("talkTopic"), q = tanyaView(), baby = cur && cur.fase === "bayi";
  $("talkIn").hidden = $("talkSend").hidden = baby || !sampleFn;
  tanyaShown = q;
  if (!q) {
    box.hidden = true;
    $("quota").hidden = false;
    const asked = game.home.get(cur.id)?.info.tanya_hari === today();
    $("quota").textContent = game.pending ? `${cur.nama} is waiting for your answer on something first.` : sampleFn ? `Talking with ${cur.nama}`
      : !asked ? `${cur.nama} is quiet right now.` : baby ? `Tomorrow there'll be something new to notice.` : `${cur.nama} told you their news today. Come back tomorrow.`;
    return;
  }
  $("quota").hidden = true;
  box.hidden = false;
  box.innerHTML = `${q.mode === "keadaan" ? `<p class="tt-scene">${esc(q.text)}</p>` : `<small class="tt-who">${esc(cur.nama)} asks</small>`}
    <div class="tt-opts">${q.opts.map((o, i) => `<button type="button" class="choice ${i ? "no" : "yes"}" data-tanya="${i}">${esc(o.label)}</button>`).join("")}</div>`;
  if (q.mode === "kata") say(q.text, 60000);
  box.querySelectorAll("[data-tanya]").forEach(b => b.onclick = () => tanyaAnswer(q, q.opts[+b.dataset.tanya]));
  Tele.ev("tanya", { k: q.id, a: "tampil" });
}
function tanyaAnswer(q, o) {
  const id = selected, S = tanyaSnap();
  if (!game.act(id, Obrolan.act(q.id, o))) return;
  game.act(id, "ngobrol");   // ikatan harian Ngobrol (sekali sehari; boleh sudah)
  attnFill(id, 100);
  const line = o.r || Obrolan.react(S, q.id, o.k) || "...";
  if (cur.fase !== "bayi") {
    const T = (chats[id] ||= []), d = today(), h = phClock();
    T.push({ role: "assistant", content: q.text, d, h }, { role: "user", content: o.label, d, h }, { role: "assistant", content: line, d, h });
    saveChats();
  }
  Tele.ev("tanya", { k: q.id === "ai" ? "ai" : q.id.split("_")[0], a: "jawab" });
  save(); refresh(); tanyaShow();
  play("wiggle", 700); burst(["♥"], 3);
  say(line.replace(/^\*(.*)\*$/, "$1"), 3800);
}
// konteks dunia buat Ngobrol AI: sekolah, sahabat, tanggal dekat, event kota, jawaban pemain belakangan
function worldFacts(m) {
  const c = game.home.get(m.id); if (!c) return "";
  const d = today(), out = [];
  if (c.age(d) < 270 && typeof scNext === "function") { const k = scNext(c, d); if (k) out.push(`Coming up at school: ${k.label} (${k.day === d ? "today" : k.day - d === 1 ? "tomorrow" : `in ${k.day - d} days`}).`); }
  if (c.info.sahabat) out.push(`Best friend: ${c.info.sahabat.nama}.`);
  const ev = Engine.world_active(game.home.world, d) || []; if (ev.length) out.push(`Happening in town: ${ev.map(e => e.nama).join(", ")}.`);
  const nm = typeof nextMoment === "function" ? nextMoment() : null; if (nm && nm.cid === m.id && nm.day - d <= 5) out.push(`Big day soon: ${nm.label} (${fmtWhen(nm.day)}).`);
  const said = (c.info.tanya_log || []).slice(-5).map(([, qid, t]) => Obrolan.describe(qid, t, m.nama)).filter(Boolean);
  if (said.length) out.push(`What your guardian told you lately:\n${said.map(s => "- " + s).join("\n")}`);
  return out.join("\n");
}
// tanda di tombol Ngobrol kalau hari ini ada yang mau ditanyain
function tanyaDot() {
  const b = $("talkBtn"); if (!b) return;
  const on = !!tanyaView(), dot = b.querySelector(".dot-new");
  if (on && !dot) b.insertAdjacentHTML("beforeend", `<i class="dot-new"></i>`); else if (!on && dot) dot.remove();
}

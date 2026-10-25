// ================================================================ chat with Claude
let sampleFn = null, chatBusy = false, chatCtl = null;
(async () => { try { sampleFn = window.claude ? await window.claude.use("sample") : null; } catch (e) { sampleFn = null; } })();
const ERR = { not_granted: "You haven't allowed this page to use Claude yet.", rate_limited: "Too many requests. Try again in a moment.", refused: "Claude won't write that one.", session_expired: "Sign in to Claude again." };
const errText = e => ERR[e?.code] || "Couldn't reach Claude. Try again.";
const failHard = e => { if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled"].includes(e?.code)) sampleFn = null; };
const TRAIT_EN = { rajin: ["lazy", "hard-working"], impulsif: ["careful", "impulsive"], setia: ["fickle", "loyal"], ambisius: ["laid-back", "ambitious"], ramah: ["shy", "friendly"], penakut: ["brave", "timid"], patuh: ["stubborn", "obedient"], kreatif: ["practical", "creative"] };
const traitText = t => Object.entries(t).filter(([, v]) => v > 62 || v < 38).map(([k, v]) => (v > 62 ? "very " : "") + TRAIT_EN[k][v > 50 ? 1 : 0]).join(", ") || "pretty average";
const VOICE = {
  bayi: "You are a baby: babble, one or two words, cute sounds, actions in *asterisks*. One short sentence max.",
  anak: "You are a small child: short simple sentences, curious, asks 'why', easily excited.",
  remaja: "You are a teenager: casual, sometimes moody or shy, hates lectures.",
  dewasa: "You are an adult: talk like a close friend who respects the player.",
  tua: "You are an elder: slow, warm, often drifts to old memories.",
};
function facts(m) {
  const v = vm();
  const recent = feed.filter(l => l.cid === m.id).slice(-10).map(l => `- ${fmtDate(l.day)}: ${l.lines.join(" ").replace(/_/g, "")}`).join("\n");
  const fam = v.anggota.filter(x => x.id !== m.id && x.fase !== "meninggal").map(x => `${x.nama} (${PHASE_EN[x.fase]})`).join(", ") || "-";
  const needs = Object.entries({ hungry: m.needs.lapar, tired: m.needs.energi, dirty: m.needs.kebersihan }).filter(([, x]) => x < 35).map(([k]) => k).join(", ");
  return [`Name: ${m.nama}. A small creature (${game.home.get(m.id)?.describe() || ""}). Stage: ${PHASE_EN[m.fase]}, age ${fmtAge(m.umur)}.`,
    `Personality: ${traitText(m.sifat)}. Habits: ${habitsOf(m.id).map(h => HABITS[h].label.toLowerCase()).join("; ")}.`, `Bond with the player (your guardian): ${Math.round(m.ikatan)}/100.`,
    `Mood: ${Math.round(m.needs.mood)}/100.${needs ? " Right now you feel " + needs + "." : ""}`,
    (() => { const s = statusOf(m.id); if (!s) return ""; return [s.job ? `Job: ${s.job.title} (${s.job.label}).` : (m.kerja ? `Job: ${m.kerja}.` : "No job right now."), `Money: ${coins(s.wallet)}.`,
      `Skills: ${Status.SKILLS.map(k => `${Status.SKILL_LABEL[k]} ${s.skills[k]}`).join(", ")}.`, s.rares.length ? `Rare traits: ${s.rares.map(r => r.label).join(", ")}.` : "",
      Tree.pathOf(game.home.get(m.id)).length ? `Callings found in your constellations: ${Tree.pathOf(game.home.get(m.id)).join(", ")}.` : "",
      s.ach.length ? `Proudest moments: ${s.ach.slice(-4).map(a => a.label).join(" ")}` : ""].filter(Boolean).join(" "); })(), m.pasangan ? `Partner: ${m.pasangan}.` : "",
    `Family at home: ${fam}.`, `Important memories:\n${m.memori.map(x => "- " + x.teks).join("\n") || "-"}`,
    `Recent events:\n${recent || "-"}`].filter(Boolean).join("\n");
}
$("talkBtn").onclick = () => {
  hideHint();
  if (!cur || cur.fase === "meninggal" || cur.fase === "merantau") return;
  $("bottom").hidden = true; $("talkbar").hidden = false; $("quota").hidden = false;
  $("quota").textContent = sampleFn ? `Talking with ${cur.nama}` : "Chat needs Claude. Open this page on claude.ai to talk.";
  $("talkIn").focus();
};
function closeTalk() {
  $("bottom").hidden = false; $("talkbar").hidden = true; $("quota").hidden = true; chatCtl?.abort();
  const cid = selected, turns = chats[cid] || [], fresh = turns.filter(t => !t.kept);
  if (sampleFn && fresh.filter(t => t.role === "user").length >= 2) {
    fresh.forEach(t => { t.kept = true; }); saveChats();
    const m = member(cid);
    sampleFn.json(`This is a chat between a player and their virtual pet ${m.nama}. Write ONE memory ${m.nama} keeps from it, max 12 words, third person (e.g. "The guardian promised a beach trip next week."). Reply only JSON {"ingat": string}.\n\nChat:\n`
      + fresh.map(t => (t.role === "user" ? "Guardian: " : m.nama + ": ") + t.content).join("\n"), { modelTier: "quick", cache: false })
      .then(r => { if (r && typeof r.ingat === "string" && r.ingat.trim()) { game.act(cid, "ingat:" + r.ingat.trim().slice(0, 120)); save(); story(m.nama, "will remember: " + r.ingat.trim(), false); } })
      .catch(() => {});
  }
}
$("talkClose").onclick = closeTalk;
$("talkbar").addEventListener("submit", async e => {
  e.preventDefault();
  const text = $("talkIn").value.trim();
  if (!text || chatBusy || !cur) return;
  if (!sampleFn) { say("...?"); return; }
  $("talkIn").value = "";
  say("...", 30000);
  try {
    const reply = await guardianSay(selected, text, t => { if (bubble) bubble.firstChild.textContent = t; talkUntil = now() + 600; });
    say(reply, 3500 + reply.length * 45);
  } catch (err) { say(err?.code === "cancelled" ? "..." : errText(err), 3000); }
});
// the player talking to their own creature, as its guardian. The room's talk bar and the "You" chat in Nest share one history.
async function guardianSay(cid, text, onText) {
  if (chatBusy) throw { code: "busy" };
  if (!sampleFn) throw { code: "offline" };
  const m = member(cid), turns = (chats[cid] ||= []);
  turns.push({ role: "user", content: text, d: today(), h: phClock() }); chatBusy = true;
  const rules = `You are playing ${m.nama}, a small creature in a virtual life game. You are talking to your guardian, the player. ${VOICE[m.fase] || VOICE.dewasa}\n`
    + `Reply in the same language the player writes in. Keep it short (1-2 sentences), stay in character, never say you are an AI or a game. `
    + `Do not invent big new life events (marriage, jobs, illness) beyond the facts below; feelings and small daily things are fine. `
    + `You make your own choices: listen to advice as much as your personality and your bond with the guardian suggest, and push back when it doesn't suit you.\n\nFacts about you:\n${facts(m)}`;
  const history = turns.slice(-16).map(t => ({ role: t.role, content: t.content }));
  while (history.length && history[0].role !== "user") history.shift();
  history[0] = { role: "user", content: rules + "\n\nGuardian says: " + history[0].content };
  chatCtl = new AbortController();
  try {
    const { text: reply } = await sampleFn(history, { modelTier: "quick", cache: false, signal: chatCtl.signal, onText: ({ text: t }) => onText && onText(t) });
    turns.push({ role: "assistant", content: reply, d: today(), h: phClock() });
    game.act(cid, "ngobrol"); save(); refresh();
    return reply;
  } catch (err) { turns.pop(); failHard(err); throw err; }
  finally { chatBusy = false; saveChats(); }
}


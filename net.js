// Kindred: makhluk dari keluarga pemain lain bisa kenalan, pacaran, dan nikah.
// Tiap pemain cuma menulis dokumennya sendiri (net/<uid>); semua langkah berupa tawaran yang dijawab pihak lain.
// Hatinya milik makhluk: dia yang nyapa, ngajak jadian, dan ngelamar; pemain cuma nyaranin dan kasih restu.
// Yang sudah disepakati dicatat ke game lewat game.netRecord, jadi replay tetap jalan tanpa server.
// Penyimpanan: db bawaan artifact. Untuk launch nanti cukup ganti bagian "store" di bawah.
(function () {
  const GAP = { jadian: 21, tunangan: 120, nikah: 30 };       // hari minimal sejak langkah sebelumnya
  const NEXT = { calon: "jadian", pasangan: "tunangan", tunangan: "nikah" };
  const NEED = { jadian: "calon", tunangan: "pasangan", nikah: "tunangan" };
  const ORDER = ["calon", "pasangan", "tunangan", "suami-istri"];
  const N = { ready: false, uid: null, docs: {}, me: null, hooks: {}, err: null, busy: Promise.resolve() };

  // ---------------------------------------------------------------- store
  let db = null;
  async function init(hooks) {
    N.hooks = hooks;
    try {
      const mock = globalThis.__netmock;
      if (mock) { db = mock.db; N.uid = mock.uid; }
      else {
        if (!window.claude) return false;
        const [d, u] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
        if (!d || !u) return false;
        db = d; N.uid = await u.id();
      }
      if (!N.uid) return false;
      db.collection("net").onSnapshot(snap => {
        N.docs = {};
        for (const d of snap.docs) if (d.exists) N.docs[d.id] = d.data();
        if (!N.me) N.me = clone(N.docs[N.uid] || {});
        for (const k of ["out", "ans", "done", "list", "news", "wish", "roll", "cool", "sug", "notes"]) N.me[k] ||= {};
        N.ready = true;
        sync();
        if (N.hooks.changed) N.hooks.changed();
      }, e => { N.err = e.code; if (N.hooks.changed) N.hooks.changed(); });
      return true;
    } catch (e) { N.err = "unavailable"; return false; }
  }
  const clone = o => JSON.parse(JSON.stringify(o));
  // satu penulisan per waktu; dokumen sendiri selalu ditulis utuh
  function save() {
    const body = clone(N.me);
    N.busy = N.busy.then(() => db.doc("net/" + N.uid).set(body)).catch(e => { N.err = e.code; });
    return N.busy;
  }

  // ---------------------------------------------------------------- helpers
  const G = () => N.hooks.game();
  const lidOf = c => c.id.split("/").pop();
  const keyOf = (uid, lid) => uid + "/" + lid;
  const pidOf = (uid, lid) => "p:" + keyOf(uid, lid);
  const parsePid = pid => { const [uid, lid] = pid.slice(2).split("/"); return { uid, lid }; };
  const mine = () => G().home.members;
  const byLid = lid => mine().find(c => lidOf(c) === lid) || null;
  const famName = () => (mine()[0] || {}).name || "Unknown";
  const today = () => G().home.last_day;
  const E = () => globalThis.Engine;
  const T = (c, k) => (c.traits || {})[k] ?? 50;
  // the same question always gets the same answer: no rerolling a creature's heart
  const H = (...a) => { let h = 2166136261; for (const ch of a.join("|")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
  const DAY = 864e5, AUTO = { kenal: 2 * DAY, step: 3 * DAY, wish: 3 * DAY };
  const cap = c => G().constructor.flingCap(c);
  const grown = c => c.alive(today()) && !("keluar" in c.info) && E().phase_of(today() - c.born) === "dewasa";
  const married = c => { const p = c.partner(); return !!p && p.tipe === "suami-istri"; };
  const remotes = c => Object.entries(c.relations).filter(([, r]) => r.remote).map(([pid, rel]) => ({ pid, rel }));
  const partnerR = c => remotes(c).find(x => x.rel.tipe !== "calon") || null;
  const pendingKenal = c => Object.entries(N.me.out).filter(([id, o]) => o.from === lidOf(c) && o.t === "kenal" && !N.me.done[id]).length;
  const used = c => Object.values(c.relations).filter(r => r.tipe === "calon").length + (c.partner() ? 1 : 0) + pendingKenal(c);
  const room = c => grown(c) && !married(c) && (N.me.cool[lidOf(c)] || 0) <= today() && used(c) < cap(c);
  const listen = c => (c.bond ?? 50) / 200 + T(c, "patuh") / 200;
  const npcOf = pid => G().home.world.npcs[pid] || {};
  const pair = (c, otherKey) => [keyOf(N.uid, lidOf(c)), otherKey].sort().join("~");
  function compat(c, tr, otherKey) {
    const ks = ["ramah", "kreatif", "ambisius", "rajin", "impulsif"];
    const sim = 1 - ks.reduce((s, k) => s + Math.abs(T(c, k) - ((tr || {})[k] ?? 50)), 0) / ks.length / 100;
    return 0.6 * sim + 0.4 * H("cocok", pair(c, otherKey));
  }
  const wantsMeet = (c, tr, key) => H("meet", lidOf(c), key) < 0.3 + compat(c, tr, key) * 0.5 + (T(c, "ramah") - 50) / 250 - (T(c, "penakut") - 50) / 300;
  function wantsStep(c, pid, t, salt) {
    const cp = compat(c, npcOf(pid).traits, pid.slice(2)), s = T(c, "setia") / 100;
    return H("step", lidOf(c), salt) < (t === "jadian" ? 0.35 + cp * 0.5 + (s - 0.5) * 0.3 : t === "tunangan" ? 0.2 + cp * 0.4 + s * 0.4 : 0.95);
  }
  function askChance(c, pid, t) {
    const cp = compat(c, npcOf(pid).traits, pid.slice(2)), s = T(c, "setia") / 100;
    return t === "jadian" ? 0.04 + cp * 0.1 * (0.5 + s) : t === "tunangan" ? 0.01 + s * 0.04 + cp * 0.02 : 0.2;
  }
  const leaves = (c, k) => H("leave", k) < 0.2 + T(c, "setia") / 100 * 0.5;
  function note(c, t) { const L = (N.me.notes[lidOf(c)] ||= []); L.push({ ts: Date.now(), t }); if (L.length > 6) L.shift(); }
  // kartu dari pemain lain: ambil field yang dipakai saja, sifat dijepit 1..99
  function safeCard(cd) {
    cd = cd || {};
    const traits = {};
    for (const [k, v] of Object.entries(cd.traits || {})) if (typeof v === "number" && isFinite(v)) traits[k] = Math.max(1, Math.min(99, v));
    return { nama: String(cd.nama || "Someone").slice(0, 24), traits, rupa: cd.rupa || {}, genes: cd.genes || { talent: {}, rares: [] }, fam: cd.fam ? String(cd.fam).slice(0, 40) : undefined };
  }
  function card(c) {
    const st = c.st || {}, R = st.reveal || {};
    const genes = st.genes || { talent: {}, rares: [] };
    return { nama: c.name, rupa: c.rupa, traits: c.traits, genes, gen: c.gen, umur: today() - c.born, fam: famName(), full: !room(c),
      job: st.job ? st.job.title : null, top: R.top ? Object.entries(genes.talent).sort((a, b) => b[1] - a[1])[0][0] : null, ts: Date.now() };
  }
  const oid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const isHost = (a, b) => a < b;
  const rec = (c, ref, P) => G().netRecord(c.id, ref, P);
  const offerOf = k => { const [uid, id] = k.split("/"), O = N.docs[uid]; return O && O.out && O.out[id] ? { uid, id, o: O.out[id], O } : null; };
  const nameFrom = (uid, o) => (o.card || {}).nama || npcOf(pidOf(uid, o.from)).nama || "Someone";

  // ---------------------------------------------------------------- the shared state, reconciled
  function sync() {
    if (!N.ready || !G()) return;
    const me = N.me;
    let recorded = false;
    const R = (c, ref, P) => { if (rec(c, ref, P)) { recorded = true; return true; } return false; };
    N.dirty = false;
    // listing ikut keadaan: yang sudah nikah atau pergi diturunkan
    for (const lid of Object.keys(me.list)) { const c = byLid(lid); if (!c || !grown(c) || married(c)) { delete me.list[lid]; N.dirty = true; } }
    // jawaban atas tawaran gw
    for (const [id, o] of Object.entries(me.out)) {
      if (me.done[id]) continue;
      const to = parsePid("p:" + o.to), O = N.docs[to.uid];
      const A = O && O.ans && O.ans[keyOf(N.uid, id)], a = A && (A.a || A);
      if (!a) continue;
      me.done[id] = a; N.dirty = true;
      const c = byLid(o.from), pid = "p:" + o.to, nm = (A.card || {}).nama || npcOf(pid).nama || (O.list && O.list[to.lid] || {}).nama || "They";
      if (!c || o.t === "putus" || o.t === "pergi") continue;
      if (o.t === "ketahuan") { if (a === "yes") R(c, "maaf-" + id, { t: "maaf", pid, with: o.with }); continue; }
      if (a !== "yes") { note(c, o.t === "kenal" ? `${nm} didn't say hi back.` : `${nm} said not yet.`); continue; }
      const P = { t: o.t, pid, fam: (O.list && O.list[to.lid] || o.card || {}).fam || O.fam, style: o.style };
      if (o.t === "kenal") { if (!A.card) continue; Object.assign(P, safeCard(A.card), { host: isHost(keyOf(N.uid, o.from), o.to), fam: A.card.fam }); }
      if (R(c, o.t + "-" + id, P)) { if (o.t === "kenal") afterFling(c, pid, nm); }
      else if (o.t === "kenal" && !c.relations[pid]) send(c, pid, "pergi", {}, true); // keburu penuh: lepaskan dengan baik
    }
    // tawaran dan kabar dari keluarga lain
    for (const [uid, O] of Object.entries(N.docs)) {
      if (uid === N.uid) continue;
      for (const [id, o] of Object.entries(O.out || {})) {
        const [tu, tl] = o.to.split("/"); if (tu !== N.uid) continue;
        const k = keyOf(uid, id); if (me.ans[k]) continue;
        const c = byLid(tl); if (!c) { me.ans[k] = "no"; N.dirty = true; continue; }
        const from = pidOf(uid, o.from);
        if (o.t === "putus" || o.t === "pergi") {
          R(c, o.t + "-" + id, { t: o.t, pid: from, why: o.why, with: o.with });
          if (o.t === "putus" && o.why !== "pudar") me.cool[tl] = Math.max(me.cool[tl] || 0, today() + 14);  // yang diputusin cukup jeda sebentar
          me.ans[k] = "ok"; N.dirty = true; continue;
        }
        if (o.t === "ketahuan") R(c, "ketahuan-" + id, { t: "ketahuan", pid: from, with: o.with });
        const r = c.relations[from];
        // pihak gw sudah sampai tahap itu, atau lagi ngajak hal yang sama: langsung iya
        if (r && NEED[o.t] && ORDER.indexOf(r.tipe) > ORDER.indexOf(NEED[o.t])) { me.ans[k] = "yes"; N.dirty = true; continue; }
        const mineToo = Object.entries(me.out).some(([i, x]) => x.from === tl && x.to === keyOf(uid, o.from) && x.t === o.t && !me.done[i]);
        if (mineToo) { decide(c, k, "yes", true); recorded = true; continue; }
        // nobody answered: the creature decides for itself
        if (Date.now() - o.ts > (o.t === "kenal" ? AUTO.kenal : AUTO.step)) { decide(c, k, null, true); recorded = true; }
      }
      for (const [to, list] of Object.entries(O.news || {})) {
        const [tu, tl] = to.split("/"); if (tu !== N.uid) continue;
        const c = byLid(tl); if (!c) continue;
        list.forEach((n, i) => { if (!n.pid || !["hamil", "anak"].includes(n.t)) return; R(c, `${n.t}-${uid}-${n.from}-${i}`, { ...n, pid: pidOf(uid, n.from) }); });
      }
    }
    // kabar dari sisi gw (hamil, anak), kematian pasangan, dan keinginan makhluk sendiri
    for (const c of mine()) {
      const lid = lidOf(c);
      for (const [pid, r] of Object.entries(c.relations)) {
        if (!r.remote) continue;
        const { uid, lid: plid } = parsePid(pid), to = keyOf(uid, plid);
        const out = (c.info.net_out || []).filter(o => o.pid === pid).map(o => ({ ...o, pid: 1, from: lid }));
        if ((me.news[to] || []).length < out.length) { me.news[to] = out; N.dirty = true; }
        if (!c.alive(today()) && !Object.values(me.out).some(o => o.t === "pergi" && o.from === lid && o.to === to)) { send(c, pid, "pergi", { why: "meninggal" }, true); N.dirty = true; }
      }
      for (const [wid, w] of Object.entries(me.wish)) {
        if (w.lid !== lid) continue;
        const r = c.relations[w.pid];
        if (!r || r.tipe !== NEED[w.t] || !grown(c)) { delete me.wish[wid]; N.dirty = true; }
        else if (Date.now() - w.ts > AUTO.wish) { delete me.wish[wid]; send(c, w.pid, w.t, {}, true); note(c, `${c.name} didn't wait any longer and asked ${r.nama}.`); N.dirty = true; }
      }
      if (!grown(c) || me.roll[lid] === today()) continue;
      const days = Math.max(1, Math.min(7, me.roll[lid] == null ? 1 : today() - me.roll[lid]));
      me.roll[lid] = today(); N.dirty = true;
      live(c, days); recorded = true;
      if (me.list[lid]) me.list[lid] = card(c);
    }
    if (N.dirty) save();
    if (recorded && N.hooks.recorded) N.hooks.recorded();
  }

  // once a day, the creature lives its own love life
  function live(c, days) {
    const me = N.me, lid = lidOf(c), d = today(), p = q => 1 - Math.pow(1 - q, days), P = partnerR(c);
    // flings that go nowhere fade on their own; faster when there's someone official
    for (const { pid, rel } of remotes(c))
      if (rel.tipe === "calon" && d - rel.sejak > (P ? 30 : 60) && H("pudar", pid, d) < p(0.08)) { end(c, pid, "pudar"); return; }
    // ready for the next step: the creature wants to ask, and asks you first
    for (const { pid, rel } of remotes(c)) {
      const t = NEXT[rel.tipe]; if (!t || d - rel.sejak < GAP[t] || (t === "jadian" && c.partner())) continue;
      const to = pid.slice(2), nos = Object.entries(me.out).filter(([i, o]) => o.from === lid && o.to === to && o.t === t && me.done[i] === "no");
      // turned down twice for dating: take the hint
      if (t === "jadian" && nos.length >= 2) { end(c, pid, "pudar"); return; }
      if (nos.some(([, o]) => Date.now() - o.ts < 20 * DAY)) continue;
      const busy = Object.values(me.wish).some(w => w.lid === lid && (w.pid === pid || w.t === t))
        || Object.entries(me.out).some(([i, o]) => o.from === lid && o.to === to && o.t === t && !me.done[i])
        || incoming(c).some(o => o.pid === pid && o.t === t);
      if (!busy && H("ajak", pid, d) < p(askChance(c, pid, t))) { me.wish[oid()] = { lid, pid, t, ts: Date.now() }; return; }
    }
    // say hi to someone new: the less setia and the more ramah, the more often
    if (me.list[lid] && room(c) && H("sapa", lid, d) < p(0.03 + (100 - T(c, "setia")) / 1000 + T(c, "ramah") / 1500)) {
      const tried = new Set(Object.values(me.out).filter(o => o.from === lid && o.t === "kenal").map(o => o.to));
      const pick = others().filter(o => !o.full && !tried.has(o.key) && !c.relations["p:" + o.key])
        .map(o => ({ o, s: compat(c, o.traits, o.key) * (0.6 + 0.4 * H("pilih", lid, o.key, d)) })).sort((a, b) => b.s - a.s)[0];
      if (pick && wantsMeet(c, pick.o.traits, pick.o.key)) {
        send(c, "p:" + pick.o.key, "kenal", { card: card(c), self: 1 }, true);
        note(c, P ? `${c.name} has been texting ${pick.o.nama}… while dating ${P.rel.nama}. 👀` : `${c.name} said hi to ${pick.o.nama} on their own.`);
      }
    }
  }
  // a new fling while someone's official: sometimes Old Town talks
  function afterFling(c, flingPid, name) {
    const P = partnerR(c);
    if (!P || P.pid === flingPid || P.rel.tipe === "suami-istri") return;
    if (H("ketahuan", c.id, flingPid) < 0.45) { send(c, P.pid, "ketahuan", { with: name }, true); rec(c, "kepergok-" + flingPid, { t: "kepergok", pid: P.pid, with: name }); N.dirty = true; }
  }
  function end(c, pid, why, extra = {}) {
    send(c, pid, "putus", { why, ...extra }, true);
    const ok = rec(c, "putus-" + oid(), { t: "putus", pid, why, mine: 1, ...extra });
    // yang mutusin nunggu lebih lama, kecuali karena diselingkuhin
    if (why !== "pudar") N.me.cool[lidOf(c)] = today() + (why === "selingkuh" ? 30 : 60);
    N.dirty = true;
    return ok;
  }

  // c answers offer k. advice: "yes" / "no" from the parent, or null. The creature weighs it against what it wants.
  function decide(c, k, advice, quiet) {
    const X = offerOf(k); if (!X) return null;
    const { uid, id, o } = X, from = pidOf(uid, o.from), name = nameFrom(uid, o), n = c.name;
    const wants = o.t === "kenal" ? room(c) && wantsMeet(c, (o.card || {}).traits || npcOf(from).traits, keyOf(uid, o.from))
      : o.t === "ketahuan" ? !leaves(c, k) : wantsStep(c, from, o.t, k);
    let yes = wants;
    if (advice && (advice === "yes") !== wants) yes = H("dengar", k) < listen(c) + 0.15 ? advice === "yes" : wants;
    if (o.t === "kenal" && !room(c)) yes = false;
    const against = advice && (advice === "yes") !== yes;
    let quote = null;
    if (o.t === "ketahuan") {
      N.me.ans[k] = yes ? "yes" : "no";
      if (yes) rec(c, "maaf-" + id, { t: "maaf", pid: from, with: o.with, mine: 1 });
      else end(c, from, "selingkuh", { with: o.with });
      note(c, yes ? `${n} forgave ${name}.` : `${n} ended it with ${name}.`);
      if (against) quote = yes ? "I want to give them another chance." : "I can't just let this go.";
    } else {
      let ok = false;
      if (yes) {
        const P = { t: o.t, pid: from, fam: (o.card || {}).fam || (npcOf(from).remote || {}).fam, style: o.style };
        if (o.t === "kenal") Object.assign(P, safeCard(o.card), { host: isHost(keyOf(N.uid, lidOf(c)), keyOf(uid, o.from)) });
        ok = rec(c, o.t + "-" + id, P);
      }
      N.me.ans[k] = ok ? (o.t === "kenal" ? { a: "yes", card: card(c) } : "yes") : "no";
      if (ok && o.t === "kenal") afterFling(c, from, name);
      const aw = against && ok ? " anyway" : "", line = ok
        ? { kenal: `${n} met ${name}${aw}.`, jadian: `${n} and ${name} are official${aw}.`, tunangan: `${n} said yes to ${name}'s proposal${aw}! 💍`, nikah: `${n} is marrying ${name}${aw}.` }[o.t]
        : { kenal: `${n} passed on meeting ${name}.`, jadian: `${n} told ${name} it's too soon.`, tunangan: `${n} isn't ready to marry ${name}.`, nikah: `${n} called off the wedding with ${name}.` }[o.t];
      note(c, line || `${n} answered ${name}.`);
      if (against) quote = ok ? (o.t === "kenal" ? "I'm meeting them anyway!" : "I'm saying yes. Sorry!") : (o.t === "kenal" ? "Not my type, sorry." : "I'm not ready.");
    }
    if (!quiet && N.hooks.recorded) N.hooks.recorded();
    N.dirty = true;
    if (!quiet) save();
    return { yes, quote };
  }

  function send(c, pid, t, extra = {}, quiet) {
    const { uid, lid } = parsePid(pid);
    const id = oid();
    N.me.out[id] = { t, from: lidOf(c), to: keyOf(uid, lid), ts: Date.now(), ...extra };
    if (t === "putus" || t === "pergi") N.me.done[id] = "sent";
    if (!quiet) save();
    return id;
  }

  // ---------------------------------------------------------------- what the UI reads
  function others() {
    const out = [];
    for (const [uid, O] of Object.entries(N.docs)) {
      if (uid === N.uid) continue;
      for (const [olid, L] of Object.entries(O.list || {})) out.push({ key: keyOf(uid, olid), ...L });
    }
    return out.sort((a, b) => b.ts - a.ts);
  }
  function view(c) {
    if (!N.ready) return { ready: false, err: N.err };
    const me = N.me, lid = lidOf(c), d = today();
    const rels = remotes(c).map(({ pid, rel }) => {
      const to = pid.slice(2), next = NEXT[rel.tipe] || null, npc = npcOf(pid);
      return { pid, nama: rel.nama, tipe: rel.tipe, since: d - rel.sejak, next, wait: next ? Math.max(0, GAP[next] - (d - rel.sejak)) : 0,
        asked: Object.entries(me.out).some(([i, o]) => o.from === lid && o.to === to && o.t === next && !me.done[i]), rupa: npc.rupa, fam: (npc.remote || {}).fam };
    }).sort((a, b) => ORDER.indexOf(b.tipe) - ORDER.indexOf(a.tipe));
    const wishes = Object.entries(me.wish).filter(([, w]) => w.lid === lid).map(([id, w]) => ({ id, t: w.t, pid: w.pid, nama: (c.relations[w.pid] || {}).nama, rupa: npcOf(w.pid).rupa }));
    const pend = Object.entries(me.out).filter(([i, o]) => o.from === lid && o.t === "kenal" && (!me.done[i] || me.done[i] === "no" && Date.now() - o.ts < 14 * DAY)).map(([, o]) => o.to);
    const list = others().filter(o => !o.full && !c.relations["p:" + o.key]).map(o => ({ ...o, asked: pend.includes(o.key) }));
    const S = me.sug[lid] || {}, notes = (me.notes[lid] || []).filter(x => Date.now() - x.ts < 7 * DAY).slice(-4).reverse();
    return { ready: true, open: !!me.list[lid], canOpen: grown(c) && !married(c), room: room(c), cap: cap(c), cool: Math.max(0, (me.cool[lid] || 0) - d),
      rels, wishes, inbox: incoming(c), others: list, suggests: S.d === d ? Math.max(0, 2 - S.n) : 2, notes, err: N.err, gap: GAP };
  }
  function incoming(c) {
    const lid = lidOf(c), out = [];
    for (const [uid, O] of Object.entries(N.docs)) {
      if (uid === N.uid) continue;
      for (const [id, o] of Object.entries(O.out || {})) {
        if (o.to !== keyOf(N.uid, lid) || N.me.ans[keyOf(uid, id)] || o.t === "putus" || o.t === "pergi") continue;
        const k = keyOf(uid, id), pid = pidOf(uid, o.from), npc = npcOf(pid);
        const wants = o.t === "kenal" ? room(c) && wantsMeet(c, (o.card || {}).traits || npc.traits, keyOf(uid, o.from)) : o.t === "ketahuan" ? !leaves(c, k) : wantsStep(c, pid, o.t, k);
        out.push({ id: k, t: o.t, pid, style: o.style, with: o.with, self: !!o.self, wants,
          card: o.card || (O.list || {})[o.from] || { nama: npc.nama, rupa: npc.rupa, fam: (npc.remote || {}).fam }, ts: o.ts });
      }
    }
    return out.sort((a, b) => a.ts - b.ts);
  }

  // ---------------------------------------------------------------- what the player does: suggest, bless, advise
  function setOpen(c, on) {
    const lid = lidOf(c);
    if (on && grown(c) && !married(c)) N.me.list[lid] = card(c); else delete N.me.list[lid];
    N.me.fam = famName();
    return save();
  }
  // you can point someone out, twice a day. The creature decides if it says hi.
  function introduce(c, key) {
    const lid = lidOf(c), d = today(), S = N.me.sug[lid] && N.me.sug[lid].d === d ? N.me.sug[lid] : (N.me.sug[lid] = { d, n: 0 });
    const [uid, olid] = key.split("/"), L = N.docs[uid] && N.docs[uid].list && N.docs[uid].list[olid];
    const recent = Object.entries(N.me.out).some(([i, o]) => o.from === lid && o.to === key && o.t === "kenal" && (!N.me.done[i] || Date.now() - o.ts < 14 * DAY));
    if (!L || S.n >= 2 || !room(c) || recent) return { ok: false };
    S.n++;
    if (!wantsMeet(c, L.traits, key) && H("dengar", lid, key) >= listen(c) * 0.4) {
      note(c, `You pointed out ${L.nama}. ${c.name} wasn't feeling it.`); save();
      return { ok: false, quote: ["Hmm. Not my type.", "Nah, I'll pass.", "Mom. Please. 🙈"][Math.floor(H("q", lid, key) * 3)] };
    }
    N.me.list[lid] = card(c);
    send(c, pidOf(uid, olid), "kenal", { card: card(c) }, true);
    note(c, `${c.name} said hi to ${L.nama}.`); save();
    return { ok: true };
  }
  function answer(c, k, yes) { return decide(c, k, yes ? "yes" : "no"); }
  // the creature asked for your blessing
  function bless(c, wid, style) {
    const w = N.me.wish[wid]; if (!w) return { ok: false };
    delete N.me.wish[wid];
    send(c, w.pid, w.t, style ? { style } : {}, true); save();
    return { ok: true };
  }
  function hold(c, wid) {
    const w = N.me.wish[wid]; if (!w) return { ok: false };
    delete N.me.wish[wid];
    const nm = (c.relations[w.pid] || {}).nama || "them";
    if (H("tunggu", wid) < listen(c) + 0.15) { note(c, `${c.name} agreed to wait a little longer with ${nm}.`); save(); return { ok: true }; }
    send(c, w.pid, w.t, {}, true); note(c, `${c.name} asked ${nm} anyway.`); save();
    return { ok: false, quote: "I've waited long enough!" };
  }
  // you can say it's over; whether it is over is up to them
  function breakUp(c, pid) {
    if (!c.relations[pid]) return { ok: false };
    if (H("pisah", pid, today()) >= listen(c) + 0.25) { note(c, `You said it might be time to end it with ${c.relations[pid].nama}. ${c.name} isn't ready.`); save(); return { ok: false, quote: "I'm not ready to let go." }; }
    end(c, pid); save();
    if (N.hooks.recorded) N.hooks.recorded();
    return { ok: true };
  }

  globalThis.Net = { init, sync, view, setOpen, introduce, answer, bless, hold, breakUp, GAP, state: N };
})();

// Lapisan main untuk pemain sungguhan (port game.py).
// Seluruh keadaan = pengaturan + catatan tindakan pemain. Mesin deterministik, jadi keadaan
// dibangun ulang dengan memutar catatan itu dari hari 0.
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const W = (typeof module !== "undefined") ? require("./wants.js") : globalThis.Wants;  // keinginan: dicek sesudah tiap tindakan pemain
  const NEED_MAP = { makan: "lapar", mandi: "kebersihan", tidur: "energi" };

  // ---------------------------------------------------------------- rawat pagi dan malam
  // Hari dibagi dua: pagi (sampai jam 12) dan malam. Pagi: sarapan dan mandi. Malam: makan malam dan tidur.
  // Yang pagi masih bisa disusul malamnya (telat, tanpa bonus). Yang tidak dikerjakan sampai lewat batasnya
  // membuat mood turun, dan kondisi buat momen penting hari itu (wawancara, review, lomba) ikut turun.
  const CARE = {
    makan_p: { half: 0, need: "lapar", label: "Breakfast", opts: {
      power: { label: "Eggs on toast", note: "+1 condition today" },
      comfort: { label: "Pancakes", note: "Mood up" },
      fruit: { label: "Fruit and yogurt", note: "Good for their health" } } },
    mandi: { half: 0, need: "kebersihan", label: "Bath" },
    makan_m: { half: 1, need: "lapar", label: "Dinner", opts: {
      light: { label: "Light soup", note: "Sleeps better: +1 condition tomorrow" },
      family: { label: "Family dinner", note: "Bond up" },
      treat: { label: "Pizza night", note: "Big mood boost, a bit less healthy" } } },
    tidur: { half: 1, need: "energi", label: "Bedtime", opts: {
      story: { label: "Bedtime story", note: "Learns a little Logic", grown: { label: "Talk about the day", note: "Learns a little Charm" } },
      cuddle: { label: "Cuddle", note: "Bond and mood up" },
      early: { label: "Lights out early", note: "+1 condition tomorrow" } } },
  };
  const GROWN = new Set(["dewasa", "tua"]);
  // nilai tiap rawat untuk kondisi: [dikerjakan, telat, terlewat]
  const CARE_SCORE = { tidur: [2, 0, -3], makan_m: [0.5, 0, -1], makan_p: [1.5, 0, -2.5], mandi: [1, 0, -1.5] };
  const rawatOf = (c, d) => ((c.info.rawat ||= {})[d] ||= {});
  // Titip: pamit dulu, keluarga yang ngurus mulai besok. Jatahnya 10 hari per 30 hari.
  const TITIP_MAX = 10, TITIP_WIN = 30, TITIP_LEN = [1, 2, 3, 5, 7];
  // Selera: tiap makhluk punya satu menu yang disuka dan satu yang nggak, ketahuan pelan-pelan. Bisa berubah waktu sudah besar.
  const MENU = { makan_p: ["power", "comfort", "fruit"], makan_m: ["light", "family", "treat"] };
  const FOOD = { power: "eggs on toast", comfort: "pancakes", fruit: "fruit and yogurt", light: "soup", family: "family dinner", treat: "pizza" };

  class NeedInput extends Error {
    constructor(info) { super(info.key); this.info = info; }
  }

  class HumanGuardian {
    constructor(game) {
      this.game = game;
      this.style = "pemain";
      this.manual_care = true;
      this.rules = {};
      for (const [k, v] of Object.entries(game.state.aturan)) if (v) this.rules[k] = v;
      this.proxy = game.state.wakil;
      this.tap = 0;
    }
    attends(day) { return this.game.attended.has(day); }
    decide(x, question, options, window) {
      const key = `${x.c.id}|${x.day}|${question}`;
      const got = this.game.state.jawaban[key];
      if (got === "lewat") return null;
      if (got) return [got[1], got[0]]; // [telat, pilihan]
      if (this.game.live_day !== null && x.day + window >= this.game.live_day) {
        throw new NeedInput({ key, cid: x.c.id, name: x.c.name, day: x.day, question, options, window,
          drama: x.drama, fase: x.phase });
      }
      return null;
    }
  }

  class Game {
    constructor(state) {
      this.state = state;
      this.attended = new Set(state.hadir);
      this.actions = {};
      for (const [day, cid, kind, h] of state.aksi) (this.actions[day] ||= []).push(h ? [cid, kind, 1] : [cid, kind]);
      this.live_day = null;
      this.home = new E.Household(state.akun, new HumanGuardian(this));
      this.home.found("makhluk-001", state.nama || null);
      this.pending = null;
      this.half_now = 1; // 0 = pagi, 1 = malam (diisi UI dari jam; simulasi tanpa jam dianggap hari penuh)
      this._half = 0;
      this.titip = [];
      this.careNote = null;
      E.HOOKS.cover = (c, d) => this.cover(c, d);
      E.HOOKS.care_on = (c, d) => this.careOn(c, d);
      E.HOOKS.care_night = x => this._night(x);
      const ST = (typeof module !== "undefined") ? require("./status.js") : globalThis.Status;
      if (ST) ST.EXT.care = (c, d) => this.careScore(c, d);
    }

    // hari pertama yang dimulai setelah jam 12: rawat pagi hari itu tidak dihitung
    skipMorning(d) { return d === this.state.rawat_from && this.state.rawat_half === 1; }
    careOn(c, d) {
      const from = this.state.rawat_from;
      return from != null && d >= from && d >= c.born && c.alive(d) && !("keluar" in c.info);
    }
    // ---- rawat yang nggak monoton: selera makan dan reaksi waktu mandi
    _prefs(c, g) {
      const rng = E.seed_rng(c.id, "selera", g), out = {};
      for (const L of Object.values(MENU)) {
        const a = L.slice(), like = a.splice(rng.randint(0, 2), 1)[0], hate = a[rng.randint(0, 1)];
        out[like] = 1; out[hate] = -1;
      }
      return out;
    }
    tastes(c, d) {
      const g = GROWN.has(E.phase_of(Math.max(0, d - c.born))) ? "g" : "k", S = c.info.selera;
      return S && S.g === g ? S.m : {};
    }
    _taste(c, x, opt) {
      const g = GROWN.has(x.phase) ? "g" : "k";
      let S = c.info.selera, grew = false;
      if (!S || S.g !== g) { grew = !!S && Object.keys(S.m).length > 0; S = c.info.selera = { g, m: {} }; }
      const v = this._prefs(c, g)[opt] || 0, first = !(opt in S.m), food = FOOD[opt], n = c.name;
      S.m[opt] = v;
      if (v > 0) x.need("mood", 4);
      if (v < 0) x.need("mood", -3);
      const rng = E.seed_rng(c.id, x.day, "selera");
      const line = v > 0 ? (first ? `${n} loves ${food}! Now you know.` : rng.choice([`${n} cleans the plate.`, `${n} asks for seconds.`, `${n} hums while eating.`]))
        : v < 0 ? (first ? `${n} pushes the ${food} around the plate. Not a fan.` : rng.choice([`${n} eats the ${food} slowly, with a sigh.`, `${n} eats it, but makes a face.`]))
        : first ? `${n} eats the ${food}. No strong feelings either way.` : null;
      return grew && line ? `Tastes change as they grow up. ${line}` : line;
    }
    _bath(c, x, day) {
      const rng = E.seed_rng(c.id, day, "mandi"), t = k => c.traits[k] ?? 50, n = c.name, ph = x.phase;
      if (ph === "bayi" || ph === "anak") {
        if (rng.random() < E.clamp(0.2 + (t("impulsif") - 50) / 150 - (t("patuh") - 50) / 150, 0.05, 0.6)) { x.need("mood", 2); return `${n} runs off giggling before bath time. You catch them by the couch.`; }
        if (t("penakut") > 65 && rng.random() < 0.4) { x.bond(0.2); return `${n} doesn't love the water, but holds your hand the whole time.`; }
        return rng.random() < 0.3 ? rng.choice([`${n} makes a bubble beard.`, `${n} insists the rubber duck needs a bath too.`]) : null;
      }
      if (ph === "remaja") return rng.random() < 0.3 ? `${n} takes forever in the bathroom. Typical.` : null;
      return t("ramah") > 60 && rng.random() < 0.3 ? `${n} sings in the shower. Loudly.` : null;
    }
    // ---- titip dan tenggang
    away(d) { return this.titip.some(t => t.from <= d && d <= t.to); }
    titipLeft(day) {
      const used = this.titip.filter(t => t.from > day - TITIP_WIN).reduce((s, t) => s + t.to - t.from + 1, 0);
      return Math.max(0, TITIP_MAX - used);
    }
    titipNow(day) { return this.titip.find(t => t.to > day) || null; }
    _titip(arg, day) {
      const on = this.titipNow(day);
      if (arg === "batal") {
        if (!on) return false;
        on.to = day;
        this.titip = this.titip.filter(t => t.to >= t.from);
        return true;
      }
      const n = Number(arg);
      if (on || !TITIP_LEN.includes(n) || n > this.titipLeft(day)) return false;
      this.titip.push({ from: day + 1, to: day + n });
      return true;
    }
    // hari yang ditutup: dititip, atau hari pertama nggak buka (tenggang). Hari kedua berturut-turut baru terasa.
    cover(c, d) {
      if (this.away(d)) return "titip";
      if (!this.attended.has(d) && (this.attended.has(d - 1) || this.away(d - 1))) return "grace";
      return null;
    }
    // rawat yang kelewat sekali dimaafkan (dia ngurus sendiri); kelewat dua hari berturut-turut baru dihitung
    _missFree(c, d, item) {
      if (this.away(d)) return "titip";
      if (!this.careOn(c, d - 1) || this.away(d - 1)) return "self";
      return ((c.info.rawat || {})[d - 1] || {})[item] ? "self" : null;
    }
    // siapa yang ngurus anak kecil waktu dititip
    _sitter(c, d) {
      const P = { dewasa: 1, tua: 1 };
      const a = this.home.members.find(m => m !== c && m.alive(d) && !("keluar" in m.info) && P[E.phase_of(Math.max(0, d - m.born))]);
      return a ? a.name : "A kind neighbor";
    }
    // apa yang sudah jelas soal hari d: malam sebelumnya selesai kalau hari d sudah mulai, pagi selesai kalau sudah lewat jam 12
    careScore(c, d) {
      if (!this.careOn(c, d)) return null;
      let v = 0; const good = [], bad = [];
      const f = GROWN.has(E.phase_of(Math.max(0, d - c.born))) ? 0.5 : 1;
      const add = (item, R, known, rd) => {
        const done = R[item], late = R.late && R.late[item];
        if (done) { v += CARE_SCORE[item][late ? 1 : 0]; if (!late) good.push(item); }
        else if (known && !this._missFree(c, rd, item)) { v += CARE_SCORE[item][2] * f; bad.push(item); }
      };
      if (this.careOn(c, d - 1)) {
        const P = (c.info.rawat || {})[d - 1] || {}, known = this.home.last_day >= d;
        add("tidur", P, known, d - 1); add("makan_m", P, known, d - 1);
        if (P.makan_m === "light") v += 1;
        if (P.tidur === "early") v += 1;
      }
      const R = (c.info.rawat || {})[d] || {}, noon = (c.info.siang ?? -1) >= d && !this.skipMorning(d);
      add("makan_p", R, noon, d); add("mandi", R, noon, d);
      if (R.makan_p === "power" && !(R.late && R.late.makan_p)) v += 1;
      const W = { tidur: ["slept well", "short on sleep"], makan_m: ["good dinner", "went to bed hungry"], makan_p: ["good breakfast", "skipped breakfast"], mandi: ["fresh from a bath", "skipped the bath"] };
      const note = [...bad.map(k => W[k][1]), ...good.map(k => W[k][0])].slice(0, 3).join(", ");
      return { v, note: note ? note[0].toUpperCase() + note.slice(1) : "" };
    }
    // tengah malam: separuh hari lewat; yang malam kemarin tidak dikerjakan terasa sekarang
    _night(x) {
      const grown = GROWN.has(x.phase), c = x.c, d = x.day, out = grown ? { lapar: 20, kebersihan: 10, energi: 0 } : { lapar: 35, kebersihan: 20, energi: 0 };
      if (!this.careOn(c, d - 1)) return out;
      const P = (c.info.rawat || {})[d - 1] || {}, f = grown ? 0.5 : 1, self = [];
      if (this.away(d - 1)) {
        // dititip: keluarga yang ngurus, hasilnya biasa saja
        for (const k of ["lapar", "kebersihan", "energi"]) c.needs[k] = Math.max(c.needs[k], 100);
        if (!grown && (!P.tidur || !P.makan_m)) x.say(`${this._sitter(c, d - 1)} made dinner and tucked ${x.n} in last night.`);
      } else {
        if (!P.tidur) {
          if (this._missFree(c, d - 1, "tidur")) { out.energi = grown ? 5 : 10; self.push("bed"); }
          else { out.energi = grown ? 20 : 40; x.need("mood", -4 * f); x.say(`Nobody tucked ${x.n} in last night, so they stayed up far too late.`); }
        }
        if (!P.makan_m) {
          if (this._missFree(c, d - 1, "makan_m")) { c.needs.lapar = Math.max(c.needs.lapar, 60); self.push("dinner"); }
          else { x.need("mood", -5 * f); x.say(`${x.n} went to bed without dinner.`); }
        }
        if (self.length && !grown) x.say(self.length === 2 ? `${x.n} found some leftovers and put themselves to bed last night, a little late.`
          : self[0] === "bed" ? `${x.n} put themselves to bed last night, a little late.` : `${x.n} had cereal for dinner last night. Not great, not terrible.`);
      }
      for (const k of Object.keys(c.info.rawat || {})) if (Number(k) < d - 3) delete c.info.rawat[k];
      return out;
    }
    // jam 12: separuh hari berikutnya lewat; sarapan dan mandi yang terlewat terasa
    noon(d, sink = []) {
      for (const c of this.home.members) {
        if ((c.info.siang ?? -1) >= d || !this.careOn(c, d) || c.last_day < d) continue;
        c.info.siang = d;
        const x = new E.Ctx(c, d, E.seed_rng(c.id, d, "siang"), this.home, this.attended.has(d));
        x.need("lapar", -35 * x.rng.uniform(0.8, 1.2)); x.need("kebersihan", -30 * x.rng.uniform(0.8, 1.2)); x.need("energi", -25 * x.rng.uniform(0.8, 1.2));
        const R = rawatOf(c, d), f = GROWN.has(x.phase) ? 0.5 : 1;
        // yang sudah dewasa masih bisa mengurus diri sendiri sedikit
        if (f < 1) for (const k of ["lapar", "kebersihan", "energi"]) c.needs[k] = Math.max(c.needs[k], 45);
        if (this.skipMorning(d)) { /* belum ada pagi untuk dilewatkan */ }
        else if (this.away(d)) {
          for (const k of ["lapar", "kebersihan", "energi"]) c.needs[k] = Math.max(c.needs[k], 85);
          if (f === 1 && (!R.makan_p || !R.mandi)) x.say(`${this._sitter(c, d)} made breakfast and got ${x.n} ready for the day.`);
        } else {
          const self = [];
          if (!R.makan_p) {
            if (this._missFree(c, d, "makan_p")) { c.needs.lapar = Math.max(c.needs.lapar, 55); self.push("breakfast"); }
            else { x.need("mood", -5 * f); x.say(`${x.n} spent the morning without breakfast.`); }
          }
          if (!R.mandi) {
            if (this._missFree(c, d, "mandi")) { c.needs.kebersihan = Math.max(c.needs.kebersihan, 55); self.push("bath"); }
            else { x.need("mood", -2 * f); x.say(`${x.n} skipped the morning bath.`); }
          }
          if (self.length && f === 1) x.say(self.length === 2 ? `${x.n} grabbed a snack and splashed their face this morning. Good enough.`
            : self[0] === "breakfast" ? `${x.n} grabbed a snack for breakfast on their own.` : `${x.n} splashed their face and called it a bath.`);
        }
        if (x.log.length) sink.push(E.make_log(c, d, x, x.phase, x.attended, x.log, [], ["rawat_siang"]));
      }
      return sink;
    }
    careView(c, d = this.home.last_day) {
      if (!c || !this.careOn(c, d)) return null;
      const R = (c.info.rawat || {})[d] || {}, noon = (c.info.siang ?? -1) >= d, grown = GROWN.has(E.phase_of(Math.max(0, d - c.born)));
      const items = Object.entries(CARE).filter(([, C]) => !(C.half === 0 && this.skipMorning(d))).map(([id, C]) => ({ id, label: C.label, half: C.half, done: R[id] || null, late: !!(R.late && R.late[id]),
        open: !R[id] && (C.half === 0 || this.half_now >= 1), overdue: C.half === 0 && noon && !R[id],
        opts: C.opts ? Object.entries(C.opts).map(([k, o]) => ({ id: k, ...(grown && o.grown ? o.grown : o), taste: this.tastes(c, d)[k] })) : null }));
      return { half: this.half_now, noon, items };
    }

    _apply_actions(day, half = null) {
      for (const [cid, kind, h = 0] of this.actions[day] || []) {
        if (half !== null && h !== half) continue;
        this._half = h;
        this._act(cid, kind, day);
      }
    }

    // Yang sudah dewasa memutuskan sendiri: saran soal rencana, kerja, dan belanja bisa ditolak sesuai sifatnya.
    // Hasilnya dari rng yang ditanam dari hari dan jenis saran, jadi replay sama, dan saran yang sama hari itu tidak bisa diulang.
    _refuse(cid, kind, day) {
      const c = this.home.get(cid);
      if (!c || !c.alive(day) || !GROWN.has(E.phase_of(Math.max(0, day - c.born)))) return null;
      const kindOf = kind.startsWith("rencana:") && kind.length > 8 ? "plan" : kind.startsWith("apply:") || kind.startsWith("lamar:") ? "job"
        : kind.startsWith("pasar:beli:") || kind.startsWith("pasar:drop:") || (kind.startsWith("beli:") && !kind.includes("@")) ? "buy"
        : kind.startsWith("biz:suggest:") ? "open" : /^biz:(price|focus|hire|fire|close|wait|post|pick|raise|train|borrow|repay|invest|supplier|promo|product|grow|contract|bake|plan|open|dayold|card|rnd|niche|seat|music|mode|extra)\b/.test(kind) ? "biz" : /^kerja:(shift|ot|style|rest|card)\b/.test(kind) ? "work" : /^pet:(adopt|food|walk|vet|card)\b/.test(kind) ? "pet" : null;
      if (!kindOf) return null;
      const N0 = c.info.nolak && c.info.nolak.d === day ? c.info.nolak : null;
      if (N0 && N0.k.includes(kind)) return "again";
      const t = k => c.traits[k] ?? 50, rng = E.seed_rng(c.id, day, "nolak", kind);
      const listen = (c.bond / 100) * 0.5 + t("patuh") / 100 * 0.5;
      const p = { plan: 0.45 - listen * 0.4 + t("impulsif") / 400,
        job: 0.4 - listen * 0.35 + (100 - t("ambisius")) / 400 + (c.st && c.st.job ? 0.1 : 0),
        buy: 0.35 - listen * 0.3 + (100 - t("impulsif")) / 500 + t("rajin") / 600,
        open: 0.55 - listen * 0.4 + (t("penakut") - 50) / 300 - (t("ambisius") - 50) / 400,
        biz: 0.32 - listen * 0.28 + (t("ambisius") - 50) / 400,
        work: 0.3 - listen * 0.28 + (t("ambisius") - 50) / 400 + (t("rajin") - 50) / 500,
        pet: kind.startsWith("pet:adopt:") ? 0.45 - listen * 0.35 + (t("penakut") - 50) / 300 - (t("ramah") - 50) / 300 : 0.25 - listen * 0.25 + (50 - t("rajin")) / 500 }[kindOf];
      // bekas: bangkrut bikin hemat, PHK bikin takut libur dan gampang terima kerja
      const B = c.info.bekas || {}, rest = kind.startsWith("kerja:rest");
      const scarP = (B.bangkrut && (kindOf === "buy" || kindOf === "open") ? 0.15 : 0) + (B.phk && rest ? 0.15 : 0) - (B.phk && kindOf === "job" ? 0.12 : 0);
      const roll = rng.random();
      if (roll >= E.clamp(p + scarP, 0.03, 0.8)) return null;
      (N0 || (c.info.nolak = { d: day, k: [] })).k.push(kind);
      const n = c.name;
      if (scarP > 0 && roll >= E.clamp(p, 0.03, 0.8)) {
        const why = B.bangkrut && (kindOf === "buy" || kindOf === "open")
          ? { log: `${n} shakes their head. Ever since the business went under, they count every coin.`, quote: "Not after last time. I'm saving." }
          : { log: `${n} won't take the day off. Since the layoff, they don't want to give anyone a reason.`, quote: "I can't miss work right now." };
        return why;
      }
      const lines = {
        plan: [`${n} has other plans today. "I'll decide my own day, thanks."`, `${n} shrugs. "Maybe another time."`, `${n} isn't in the mood for that today.`],
        job: t("ambisius") < 40 ? [`${n} doesn't want that job. "I'm happy where I am."`, `${n} isn't ready to change jobs right now.`]
          : [`${n} reads the listing and says it's not a good fit.`, `${n} wants to find their own job. "Let me handle this one."`],
        buy: t("rajin") > 60 ? [`${n} would rather save the money.`, `${n} checks their savings and says no.`] : [`${n} isn't interested in that.`, `${n} says "it's not really my style."`],
        open: t("penakut") > 55 ? [`${n} isn't ready to run their own place. "What if it fails?"`] : [`${n} hears you out, then says that business isn't really their thing.`],
        biz: [`${n} listens, then does it their own way. "It's my business."`, `${n} says "trust me on this one" and keeps things as they are.`],
        work: [`${n} listens, then says "I know my job. Trust me."`, `${n} thinks about it and decides to do it their own way on the ward.`],
        pet: kind.startsWith("pet:adopt:") ? [`${n} isn't sure they're ready to look after a pet.`, `${n} says "maybe one day, not right now."`] : [`${n} says "I know what my pet needs, trust me."`, `${n} listens, then keeps the usual routine.`],
      }[kindOf];
      const quote = { plan: "I've got my own plans today.", job: t("ambisius") < 40 ? "Nah, I'm happy where I am." : "Not that one. I'll find my own.",
        buy: t("rajin") > 60 ? "I'd rather save the money." : "Nah, not my style.",
        open: t("penakut") > 55 ? "What if it fails? Not yet." : "That's not really my thing.", biz: "It's my business. I've got this.", work: "I know my job. Trust me.",
        pet: kind.startsWith("pet:adopt:") ? "Not ready for a pet yet." : "I know what my pet needs." }[kindOf];
      return { log: rng.choice(lines), quote };
    }

    // Sesudah tindakan yang diterima: keinginan makhluk ikut dicek (wants.js). Jalan saat main dan saat replay, jadi hasilnya sama.
    _act(cid, kind, day) {
      this.refused = null;
      const ok = this._act0(cid, kind, day);
      if (ok && !this.refused && W) {
        const c = this.home.get(cid);
        if (c && c.alive(day) && !("keluar" in c.info) && !kind.startsWith("net:") && !kind.startsWith("titip:")) W.afterAct(this, c, kind, day);
      }
      return ok;
    }
    _act0(cid, kind, day) {
      if (kind.startsWith("titip:")) return this._titip(kind.slice(6), day);
      const no = this._refuse(cid, kind, day);
      if (no === "again") return false;
      if (no) {
        const c = this.home.get(cid), x = new E.Ctx(c, day, E.seed_rng("nolak"), this.home, true);
        x.say(no.log);
        (this._sink || (this.noon_logs ||= [])).push(E.make_log(c, day, x, x.phase, true, x.log, [], ["nolak"]));
        this.refused = no;
        return true;
      }
      if (E.HOOKS.act) {  // dadu, lamaran kerja, belanja (status.js)
        const r = E.HOOKS.act(this.home, cid, kind, day);
        if (r !== undefined) return r;
      }
      if (kind.startsWith("net:")) {
        // kejadian dunia berlaku buat satu rumah, bukan satu makhluk: dicatat walau makhluk yang dipakai sudah tidak ada
        const ref = kind.slice(4), P = (this.state.net || {})[ref];
        if (P && P.t === "dunia") return this._dunia(cid, ref, P, day);
      }
      const c = this.home.get(cid);
      if (!c || !c.alive(day) || "keluar" in c.info) return false;
      if (kind.startsWith("net:")) return this._net(c, (this.state.net || {})[kind.slice(4)], day);
      if (kind.startsWith("rawat:")) {
        const [, item, opt] = kind.split(":"), C = CARE[item];
        if (!C || !this.careOn(c, day) || (C.half === 1 && this._half < 1)) return false;
        const R = rawatOf(c, day);
        if (R[item] || (C.opts && !C.opts[opt])) return false;
        R[item] = opt || 1;
        if (C.half === 0 && (c.info.siang ?? -1) >= day) (R.late ||= {})[item] = 1;
        const x = new E.Ctx(c, day, E.seed_rng("rawat"), this.home, true);
        c.needs[C.need] = 100;
        x.need("mood", 3);
        const grown = GROWN.has(x.phase);
        if (opt === "comfort") x.need("mood", 8);
        else if (opt === "fruit") x.stat("kesehatan", 0.4);
        else if (opt === "treat") { x.need("mood", 10); x.stat("kesehatan", -0.3); }
        else if (opt === "family") { const B = (c.info.bekas || {}).duka ? 1.5 : 1; c.bond = Math.min(100, c.bond + 0.6 * B * (1 - c.bond / 100)); x.need("mood", 4 * B); }
        else if (opt === "cuddle") { c.bond = Math.min(100, c.bond + 0.6 * (1 - c.bond / 100)); x.need("mood", 5); }
        else if (opt === "story" && c.st) { const k = grown ? "charm" : "logic"; c.st.skills[k] = Math.min(100, c.st.skills[k] + 0.3); }
        this.careNote = MENU[item] ? this._taste(c, x, opt) : item === "mandi" ? this._bath(c, x, day) : null;
        return true;
      }
      if (NEED_MAP[kind]) {
        c.needs[NEED_MAP[kind]] = 100;
        c.needs.mood = Math.min(100, c.needs.mood + 3);
        return true;
      }
      if (kind === "belajar") {
        const u = c.info.ujian;
        if (u && day < u.hari && u.belajar < 3) {
          u.belajar += 1;
          E.inc(this.home.stats, "tap_temani_belajar");
          return true;
        }
      }
      if (kind.startsWith("rencana:")) {
        c.info.rencana = kind.slice(8) || null;
        return true;
      }
      if (kind === "ngobrol") {
        // Ngobrol dihitung sekali sehari supaya nggak bisa di-farm
        if (c.info.ngobrol === day) return false;
        c.info.ngobrol = day;
        c.bond = Math.min(100, c.bond + 0.8 * (1 - c.bond / 100));
        c.needs.mood = Math.min(100, c.needs.mood + 4);
        return true;
      }
      if (kind.startsWith("ingat:")) {
        const x = new E.Ctx(c, day, E.seed_rng("ingat"), this.home, true);
        x.drama = "sedang";
        x.remember(kind.slice(6));
        return true;
      }
      if (kind === "peluk") {
        c.bond = Math.min(100, c.bond + 0.5 * (1 - c.bond / 100));
        c.needs.mood = Math.min(100, c.needs.mood + 5);
        return true;
      }
      return false;
    }

    // Kejadian dunia dari server (festival, cuaca, kabar kota): sama buat semua pemain pada hari nyata yang sama.
    // Isinya (nama, teks, baris, efek) ditulis di server dan disimpan utuh di state.net, jadi replay tidak butuh server.
    // Efeknya dibatasi di sini: mood paling besar 3 per hari, lama paling lama 60 hari, tidak ada uang, bintang, atau keberuntungan.
    _dunia(cid, ref, P, day) {
      const w = this.home.world;
      (w.events ||= []);
      if (!ref || w.events.some(e => e.id === ref)) return false;
      const str = (v, n) => typeof v === "string" ? v.trim().slice(0, n) : "";
      const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
      const nama = str(P.nama, 40), teks = str(P.teks, 240), lines = (Array.isArray(P.baris) ? P.baris : []).map(s => str(s, 200)).filter(Boolean).slice(0, 8);
      if (!nama || !teks) return false;
      const tunda = num(P.tunda, 0, 30), lama = num(P.lama, 1, 60), mood = num(P.efek && P.efek.mood, -3, 3);
      const jenis = ["cuaca", "musim", "festival", "kabar"].includes(P.jenis) ? P.jenis : "kabar";
      w.events.push({ id: ref, jenis, nama, ikon: str(P.ikon, 4), teks, dicatat: day, sore: this._half ? 1 : 0, mulai: day + tunda, selesai: day + tunda + lama - 1,
        efek: { mood }, baris: lines, obrolan: (Array.isArray(P.obrolan) ? P.obrolan : []).map(s => str(s, 200)).filter(Boolean).slice(0, 8),
        hadiah: str(P.hadiah, 32) || null }); // kosmetik buat yang hadir selama event (dibaca cosmetics.js, bukan simulasi)
      if (w.events.length > 60) w.events.splice(0, w.events.length - 60);
      // pengumumannya masuk catatan harian lewat makhluk yang dipakai, atau siapa pun yang masih di rumah
      const c0 = this.home.get(cid), c = c0 && c0.alive(day) && !("keluar" in c0.info) ? c0 : this.home.living(day)[0];
      if (c) {
        const x = new E.Ctx(c, day, E.seed_rng("dunia", ref), this.home, true);
        x.say(teks);
        (this._sink || (this.noon_logs ||= [])).push(E.make_log(c, day, x, x.phase, true, x.log, ["kecil"], ["dunia:" + jenis]));
      }
      return true;
    }

    // Kabar dari keluarga pemain lain. Isinya disimpan utuh di state.net supaya replay tetap sama walau server mati.
    _net(c, P, day) {
      if (!P || !P.pid) return false;
      const x = new E.Ctx(c, day, E.seed_rng("net", c.id, day), this.home, true), w = this.home.world;
      const pid = P.pid, rel = c.relations[pid], fam = P.fam || ((w.npcs[pid] || {}).remote || {}).fam || "other";
      let drama = "sedang";
      if (P.t === "kenal") {
        // setia decides how many a creature keeps going at once: one for the faithful, up to five for a flirt. Married means done looking.
        const p = c.partner(), n = Object.values(c.relations).filter(r => r.tipe === "calon").length + (p ? 1 : 0);
        if (rel || (p && p.tipe === "suami-istri") || n >= Game.flingCap(c)) return false;
        w.npcs[pid] = JSON.parse(JSON.stringify({ nama: P.nama, traits: P.traits, rupa: P.rupa, genes: P.genes, remote: { fam } }));
        c.relations[pid] = { nama: P.nama, tipe: "calon", skor: 55, sejak: day, remote: 1, host: P.host ? 1 : 0 };
        x.say(p ? `${x.n} has been chatting with ${P.nama} from the ${fam} family. Just friends, apparently. 👀`
          : `${x.n} meets ${P.nama} from the ${fam} family. They talk so easily they lose track of time.`);
        x.remember(`Met ${P.nama} from the ${fam} family.`);
      } else if (!rel || !rel.remote) return false;
      else if (P.t === "jadian") {
        if (rel.tipe !== "calon" || c.partner()) return false;
        Object.assign(rel, { tipe: "pasangan", skor: 65, sejak: day });
        x.say(`${x.n} and ${rel.nama} are officially dating. Both families' feeds are full of couple photos.`);
        x.remember(`Started dating ${rel.nama}.`);
      } else if (P.t === "tunangan") {
        if (rel.tipe !== "pasangan") return false;
        Object.assign(rel, { tipe: "tunangan", sejak: day });
        drama = "besar";
        x.say(`${x.n} and ${rel.nama} are engaged! The ${fam} family sends a message: "congrats, future in-law!"`);
        x.remember(`Got engaged to ${rel.nama}.`);
      } else if (P.t === "nikah") {
        if (rel.tipe !== "tunangan") return false;
        const big = P.style === "besar";
        x.stat("uang", -(big ? 60 : 15));
        Object.assign(rel, { tipe: "suami-istri", sejak: day });
        Object.assign(c.info, { menikah: day, pasangan_id: pid, besan: `the ${fam} family` });
        if (!("menikah_hari" in c.info)) c.info.menikah_hari = x.age;
        drama = "besar";
        x.say(big ? `${x.n} and ${rel.nama} get married! Two families fill one hall, and both sides split the bill.`
          : `${x.n} and ${rel.nama} get married in a garden, with just the two families. The cake is small but sooo good.`);
        x.bond(3);
        x.remember(`Married ${rel.nama}.`);
      } else if (P.t === "putus" || P.t === "pergi") {
        const wed = rel.tipe === "suami-istri";
        delete c.relations[pid];
        if (wed) c.info.menikah = null;
        drama = "besar";
        if (P.why === "pudar") {
          x.say(`${x.n} and ${rel.nama} drift apart. No drama, just fewer messages until there were none.`);
          x.remember(`Drifted apart from ${rel.nama}.`);
          drama = "kecil";
        } else if (P.why === "selingkuh") {
          x.say(P.mine ? `${x.n} ends things with ${rel.nama} after hearing about ${P.with || "the other one"}. ${x.n} says they're fine. They are not fine.`
            : `${rel.nama} heard about ${P.with || "the other one"} and ended it. ${x.n} stares at the phone for a long time.`);
          x.flag("patah_hati", 30);
          x.need("mood", -20);
          x.remember(`${P.mine ? "Broke up with" : "Got dumped by"} ${rel.nama}${P.with ? ` over ${P.with}` : ""}.`);
        } else if (P.why === "meninggal") {
          x.say(`${rel.nama} has passed away. ${x.n} keeps their side of the bed made, every morning.`);
          x.flag("berduka", 60);
          x.remember(`Lost ${rel.nama}.`);
        } else if (P.t === "pergi") {
          x.say(`The ${fam} family moved far away. ${x.n} and ${rel.nama} say a long goodbye at the station.`);
          x.flag("patah_hati", 20);
          x.remember(`Said goodbye to ${rel.nama}.`);
        } else {
          x.say(`${x.n} and ${rel.nama} ${wed ? "are getting divorced" : "broke up"}. ${x.n} deletes their couple photos one by one.`);
          x.flag("patah_hati", 30);
          x.need("mood", -20);
          x.remember(`${wed ? "Divorced" : "Broke up with"} ${rel.nama}.`);
          // yang mutusin juga nanggung: cerai ada biaya penyelesaian, dan rasa bersalah
          if (P.mine) {
            x.need("mood", -10);
            x.flag("bersalah", 30);
            if (wed && c.st) {
              const fee = Math.round(c.st.wallet * 0.25);
              c.st.wallet -= fee;
              if (fee > 0) x.say(`The divorce settlement costs ${x.n} ${fee.toLocaleString("en")} coins.`);
            }
          }
        }
      } else if (P.t === "ketahuan") {
        // someone saw the partner out with another creature
        if (!c.partner() || c.partner() !== rel) return false;
        rel.skor = Math.max(0, (rel.skor || 60) - 20);
        x.say(`Word gets around Old Town: ${rel.nama} was seen out with ${P.with || "someone"} from another family. ${x.n} goes quiet at dinner.`);
        x.need("mood", -15);
        x.flag("patah_hati", 7);
        x.remember(`Heard ${rel.nama} was seen with ${P.with || "someone else"}.`);
      } else if (P.t === "kepergok") {
        // sisi yang selingkuh: ketahuan, malu, dan kepercayaan pasangannya turun
        if (!c.partner() || c.partner() !== rel) return false;
        rel.skor = Math.max(0, (rel.skor || 60) - 15);
        x.say(`Old Town is talking: ${x.n} was seen out with ${P.with || "someone"} while dating ${rel.nama}. ${x.n} can't look anyone in the eye.`);
        x.need("mood", -12);
        x.flag("bersalah", 21);
        x.remember(`Got caught with ${P.with || "someone"} while dating ${rel.nama}.`);
      } else if (P.t === "maaf") {
        if (!c.partner() || c.partner() !== rel) return false;
        x.say(P.mine ? `${x.n} forgives ${rel.nama}. It'll take a while to trust again, but they're trying.`
          : `${rel.nama}'s family heard about ${P.with || "the other one"}. ${rel.nama} gives ${x.n} one more chance.`);
        x.remember(P.mine ? `Forgave ${rel.nama}.` : `${rel.nama} forgave me.`);
      } else if (P.t === "hamil") {
        if (rel.tipe !== "suami-istri") return false;
        x.say(`Great news from the ${fam} family: ${x.n} and ${rel.nama} are expecting babies!`);
      } else if (P.t === "anak") {
        const k = P.kid || {}, kid_id = `${c.id}-x${k.n}`;
        if (rel.tipe !== "suami-istri" || !k.name || this.home.get(kid_id) || (rel.anak || 0) >= 8) return false;
        rel.anak = (rel.anak || 0) + 1;
        const tr = {};
        for (const [t, v] of Object.entries(k.traits || {})) if (typeof v === "number" && isFinite(v)) tr[t] = Math.max(1, Math.min(99, v));
        k.traits = tr; k.name = String(k.name).slice(0, 24);
        (c.info.anak ||= []);
        if (this.home.free_slots(day) > 0) {
          const kid = E.Creature.new(kid_id, { born: day, gen: c.gen + 1, parents: [c.id, pid], traits: { ...k.traits }, rupa: { ...k.rupa }, name: k.name });
          this.home.members.push(kid);
          c.info.anak.push([k.name, day, "kamu"]);
          x.say(`${k.name}, the baby of ${x.n} and ${rel.nama}, comes home to live with you. ${rel.nama}'s family keeps a sibling.`);
        } else {
          this.home.adopted_out.push([day, k.name, c.name]);
          c.info.anak.push([k.name, day, "adopsi"]);
          x.say(`${x.n} and ${rel.nama} had a baby, ${k.name}, but your home is full. ${k.name} can be adopted through a link.`);
        }
        x.remember(`Welcomed ${k.name}.`);
      } else return false;
      (this._sink || (this.noon_logs ||= [])).push(E.make_log(c, day, x, x.phase, true, x.log, [drama], ["net_" + P.t],
        [{ id: pid, nama: (w.npcs[pid] || {}).nama || P.nama, tipe: (c.relations[pid] || {}).tipe || "mantan", rupa: (w.npcs[pid] || {}).rupa || null }]));
      return true;
    }

    // Maju sampai hari `target`. Berhenti kalau ada dilema yang harus dijawab pemain.
    advance(target, live_day = null) {
      this.live_day = live_day;
      const logs = [];
      this.pending = null;
      while (this.home.last_day < target) {
        const d = this.home.last_day + 1;
        // Snapshot hanya perlu saat main langsung: waktu memutar ulang catatan, dilema tidak pernah menunggu
        const snap = live_day === null ? null : this.home.snapshot();
        const day_logs = [];
        try {
          this.home.view(d, day_logs);
        } catch (e) {
          if (!(e instanceof NeedInput)) throw e;
          this.home.restore(snap);
          this.pending = e.info;
          break;
        }
        if (this.state.rawat_from == null) { this._sink = day_logs; this._apply_actions(d); this._sink = null; }
        else {
          // pagi, jam 12, lalu malam. Hari yang sedang berjalan baru lewat jam 12 kalau jamnya sudah lewat.
          this._sink = day_logs;
          this._apply_actions(d, 0);
          if (live_day === null || d < live_day || this.half_now >= 1) this.noon(d, day_logs);
          this._apply_actions(d, 1);
          this._sink = null;
        }
        logs.push(...day_logs);
      }
      this.live_day = null;
      return logs;
    }

    mark_attended(day) {
      if (!this.attended.has(day)) {
        this.attended.add(day);
        this.state.hadir.push(day);
      }
    }

    answer(key, choice, late) {
      this.state.jawaban[key] = choice === "lewat" ? "lewat" : [choice, late];
      this.pending = null;
    }

    act(cid, kind) {
      const day = this.home.last_day;
      this._half = this.state.rawat_from == null ? 0 : this.half_now;
      // lewat jam 12 tapi tick belum sempat jalan: urutan harus sama dengan saat diputar ulang
      if (this._half) this.noon(day, this.noon_logs ||= []);
      this.refused = null;
      this.careNote = null;
      if (this._act(cid, kind, day)) {
        const rec = this._half ? [cid, kind, 1] : [cid, kind];
        (this.actions[day] ||= []).push(rec);
        this.state.aksi.push([day, ...rec]);
        // ditolak tetap dicatat (supaya replay sama), tapi buat UI itu bukan berhasil
        if (this.refused) { if (this.onRefuse) this.onRefuse(this.refused); return false; }
        return true;
      }
      return false;
    }

    // catat kabar dari server sebagai aksi biasa; ref unik dari server supaya tidak tercatat dua kali
    static flingCap(c) { return Math.max(1, Math.min(5, 1 + Math.round((100 - (c.traits.setia ?? 50)) / 25) - ((c.info.bekas || {}).hati ? 1 : 0))); }

    netRecord(cid, ref, P) {
      (this.state.net ||= {});
      if (this.state.aksi.some(a => a[2] === "net:" + ref)) return false;
      this.state.net[ref] = P = JSON.parse(JSON.stringify(P));
      if (this.act(cid, "net:" + ref)) return true;
      delete this.state.net[ref];
      return false;
    }

    agendaOptions(c, day) {
      if (!globalThis.Agenda && typeof module === "undefined") return [];
      const A = (typeof module !== "undefined") ? require("./agenda.js") : globalThis.Agenda;
      if (!c.alive(day) || "keluar" in c.info) return [];
      const x = new E.Ctx(c, Math.max(day, c.born), E.seed_rng("opsi"), this.home, false);
      return A.options(x).map(([id, a]) => [id, a.label]);
    }

    // Kronik keluarga: lahir, meninggal, dan kejadian penting semua generasi, urut waktu
    chronicle() {
      const day = this.home.last_day, out = [], by = {};
      for (const c of this.home.members) by[c.id] = c;
      for (const c of this.home.members) {
        if (c.born <= day) out.push({ d: c.born, id: c.id, t: c.gen === 1 && c.born === 0 ? `${c.name} hatched. The family begins.` : `${c.name} was born.`, b: 1, k: "lahir" });
        if (c.death_day <= day) out.push({ d: c.death_day, id: c.id, t: `${c.name} passed away.`, b: 1, k: "wafat" });
      }
      for (const c of this.home.members) for (const a of (c.st && c.st.ach) || []) out.push({ d: a.day, id: c.id, t: a.label, b: 1 });
      for (const e of this.home.kronik || []) if (by[e.id]) out.push({ ...e });
      const seen = new Set();
      out.sort((a, b) => a.d - b.d || b.b - a.b);
      return out.filter(e => { const k = e.d + "|" + e.id + "|" + e.t; return seen.has(k) ? false : seen.add(k); }).map(e => ({ ...e, name: by[e.id] ? by[e.id].name : "", gen: by[e.id] ? by[e.id].gen : 1 }));
    }

    view_model() {
      const day = this.home.last_day;
      const members = this.home.members.map(c => {
        const age = Math.max(0, day - c.born);
        const dead = c.death_day <= day;
        const p = c.partner();
        const u = c.info.ujian;
        return {
          id: c.id, nama: c.name, gen: c.gen, umur: age, born: c.born, death_day: c.death_day,
          fase: dead ? "meninggal" : ("keluar" in c.info ? "merantau" : E.phase_of(age)),
          rupa: c.rupa, needs: c.needs, ikatan: c.bond, sifat: c.traits, stats: c.stats,
          kerja: c.info.kerja || null, pasangan: p ? p.nama : null, pasangan_tipe: p ? p.tipe : null,
          ujian: (u && day < u.hari) ? { hari: u.hari, belajar: u.belajar, sendiri: u.sendiri || 0, jenis: u.jenis } : null,
          orang_tua: c.parents.filter(Boolean), diadopsi: !!c.info.diadopsi,
          bakat: c.info.bakat || null, cita: c.info.cita || null, memori: c.memory.slice(-8),
          rencana: c.info.rencana || null, agenda_hari: c.info.agenda_hari || null,
          agenda_opsi: this.agendaOptions(c, day),
          bekas: Object.entries(c.info.bekas || {}).map(([k, b]) => ({ k, ...(E.SCARS[k] || { label: k, note: "" }), why: b.why, d: b.d })),
          selera: this.tastes(c, day),
        };
      });
      return { hari: day, anggota: members, statistik: this.home.stats,
        adopsi: this.home.adopted_out, besan: this.home.besan_kids, pending: this.pending };
    }
  }

  const API = { Game, NeedInput, HumanGuardian, NEED_MAP, CARE, FOOD, TITIP_MAX, TITIP_LEN };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.GameLayer = API;
})();

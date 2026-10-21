// Momen greget: deteksi puncak emosi dari catatan harian replay (log hari), buat nguji aturan tawaran di simulator
// sebelum ada pemain, dan buat telemetry live (event "momen"). Sumbernya cuma log hari (events, dramas, ach, lines),
// jadi hasilnya sama persis di HP dan di server. Daftar jenisnya dari riset/analytics.md §2:
//   puncak = bangga (lulus, naik jabatan, nikah, anak lahir, bisnis naik), sedih = duka (mati, bangkrut, dipecat),
//   nyaris = hampir berhasil atau lolos tipis, tegang = nunggu hasil atau khawatir, lega = ketegangan selesai baik.
"use strict";
(function () {
  // tag storylet -> [jenis, intensitas 1..3]
  const TAG = {
  // tonggak bayi minggu 1–2 dan tambalan kuliah/tua (Blok A nomor 8)
  malam_pertama: ["puncak", 1], senyum_pertama: ["puncak", 2], ketawa_pertama: ["puncak", 2], kenal_nama: ["puncak", 1], duduk_sendiri: ["puncak", 2],
  gap_puncak: ["puncak", 2], kampus_organisasi: ["puncak", 1], kampus_skripsi: ["tegang", 2], tulis_memoar: ["puncak", 1], memoar_selesai: ["puncak", 2], warisan_resep: ["puncak", 1],
    kelahiran: ["puncak", 3], pernikahan: ["puncak", 3], wisuda: ["puncak", 3], biz_buka: ["puncak", 3], adopsi_sendiri: ["puncak", 3], telur_warisan: ["puncak", 3], pulang_kampung: ["sedih", 2], masalah_di_pesta: ["tegang", 2],
    lamaran: ["puncak", 2], jadian: ["puncak", 2], kata_pertama: ["puncak", 2], langkah_pertama: ["puncak", 2], hari_pertama_sekolah: ["puncak", 2],
    bakat_lengkap: ["puncak", 2], biz_handover: ["puncak", 2], pensiun: ["puncak", 2], jadi_orang_tua: ["puncak", 1], pindah_rumah: ["puncak", 2], setelah_lulus: ["puncak", 1],
    jadian_remaja: ["puncak", 1], cinta_monyet: ["puncak", 1], bakat_terlihat: ["puncak", 1], bakat_ketahuan: ["puncak", 1], ulang_tahun: ["puncak", 1], hari_jadi: ["puncak", 1],
    ulang_tahun_pernikahan: ["puncak", 1], pesta_pertama: ["puncak", 1], kelas_selesai: ["puncak", 1], teman_baru: ["puncak", 1], hobi_baru: ["puncak", 1],
    akhir_hidup: ["sedih", 3], dipecat: ["sedih", 3], kehilangan_sahabat: ["sedih", 2], patah_hati: ["sedih", 2], putus: ["sedih", 2], berantem_rumah_tangga: ["sedih", 1],
    sakit_parah: ["tegang", 3], kabar_bayi: ["tegang", 2], anak_sakit_malam: ["tegang", 2], sakit_tua: ["tegang", 2], nganggur_lama: ["tegang", 2], ujian_akhir_diumumkan: ["tegang", 2],
    maraton_hari_h: ["tegang", 2], ulang_tahun_pernikahan_pasangan_sakit: ["tegang", 2],
    demam: ["tegang", 1], kecelakaan_kecil: ["tegang", 1], krisis_paruh_baya: ["tegang", 1], burnout: ["tegang", 1], ribut_pasangan: ["tegang", 1], ujian_diumumkan: ["tegang", 1],
    maraton_daftar: ["tegang", 1], tawaran_investasi: ["tegang", 1], disuruh_curang: ["tegang", 1], rekan_curang: ["tegang", 1], ketahuan_bolos: ["tegang", 1], tanda_menua: ["tegang", 1],
  };
  // storylet yang punya cabang hasil: dibaca dari teksnya, kalau nggak ketemu pakai TAG
  const BRANCH = {
  kampus_ujian: [[/aces/, "puncak", 2, "kampus_lulus_ujian"], [/retake/, "sedih", 1, "kampus_gagal_ujian"]],
  kampus_kerja_sambilan: [[/works four weekends/, "puncak", 1, "kampus_kerja"]],
    jadian: [[/only see .* as a friend/, "sedih", 2, "ditolak_cinta"]],
    lamaran: [[/says yes, happy-crying/, "puncak", 3, "lamaran_diterima"], [/puts the ring away/, "sedih", 1, "lamaran_ditunda"]],
    maraton_hari_h: [[/in the top ten/, "puncak", 3, "maraton_top10"], [/slow and proud/, "puncak", 2, "maraton_selesai"], [/walks the last five/, "puncak", 1, "maraton_jalan"]],
    jadian_remaja: [[/slams the door/, "tegang", 1, "ribut_pacar_remaja"]],
  };
  // baris cerita -> momen (yang hasilnya cuma ketahuan dari teksnya: skor, bisnis, kerja)
  const LINES = [
    [/passed their final exams/, "puncak", 3, "lulus"],
    [/got a 90-something on the quiz/, "puncak", 1, "kuis_bagus"],
    [/graduates!/, "puncak", 3, "wisuda"],
    [/takes off! The whole town is talking/, "puncak", 3, "produk_meledak"],
    [/launches to a warm, small crowd/, "puncak", 1, "produk_rilis"],
    [/launches to… crickets/, "sedih", 2, "produk_gagal"],
    [/made it through the recession/, "lega", 3, "lolos_resesi"],
    [/Margin call at/, "tegang", 3, "margin_call"],
    [/runs out of money and closes for good/, "sedih", 3, "bangkrut"],
    [/keeps losing money/, "tegang", 2, "bisnis_rugi"],
    [/wants to grow .* into a/, "tegang", 1, "mau_naik_level"],
    [/has one of its best days ever/, "puncak", 2, "rekor_fund"],
    [/goes viral on Chirp/, "puncak", 2, "viral"],
    [/magazine features/, "puncak", 2, "masuk_majalah"],
    [/lands a big order|town festival orders from/, "puncak", 1, "order_besar"],
    [/A harsh review of/, "tegang", 1, "review_buruk"],
    [/breaks down\. Repairs/, "tegang", 1, "alat_rusak"],
    [/opens down the street from/, "tegang", 1, "pesaing_baru"],
    [/is now a (shop|company|chain)|grew into a/i, "puncak", 2, "bisnis_naik_level"],
    [/A formal warning/, "tegang", 2, "peringatan_kerja"],
    [/monthly review from .*: grade A/, "puncak", 1, "nilai_a"],
    [/monthly review from .*: grade D/, "tegang", 1, "nilai_d"],
    [/perfects a new signature/, "puncak", 1, "signature"],
    [/wins? the|won the/, "puncak", 2, "menang_lomba"],
    [/lost the .* to/, "sedih", 1, "kalah_lomba"],
  ];
  const SCORE = /Score (\d+) vs (\d+)/;
  const NYARIS = 3;   // selisih skor yang masih kerasa "hampir"
  // satu log hari -> daftar momen. Satu jenis cuma sekali per hari, ambil yang paling kuat
  function detect(l) {
    const out = [], add = (kind, i, tag, line) => out.push({ day: l.day, cid: l.cid, name: l.name, phase: l.phase, kind, i, tag, line: (line || "").slice(0, 140) });
    for (const e of l.events || []) {
      const br = BRANCH[e] && BRANCH[e].find(([re]) => (l.lines || []).some(t => re.test(t)));
      if (br) { const t = (l.lines || []).find(t => br[0].test(t)); add(br[1], br[2], br[3], t); }
      else if (TAG[e]) add(TAG[e][0], TAG[e][1], e, (l.lineAt || {})[e]);
    }
    for (const line of l.lines || []) {
      const m = SCORE.exec(line);
      if (m) {
        const total = +m[1], req = +m[2], ok = /got the job|got promoted|won the/.test(line), d = total - req;
        if (!ok && req - total <= NYARIS) add("nyaris", 3, /promotion/.test(line) ? "nyaris_naik_jabatan" : /job/.test(line) ? "nyaris_dapat_kerja" : "nyaris_menang", line);
        else if (ok && d <= 2) add("nyaris", 3, /promoted/.test(line) ? "lolos_tipis_naik_jabatan" : /job/.test(line) ? "lolos_tipis_kerja" : "lolos_tipis_lomba", line);
        else if (ok) add("puncak", 2, /promoted/.test(line) ? "naik_jabatan" : /job/.test(line) ? "dapat_kerja" : "menang_lomba", line);
        else add("sedih", 1, /promotion/.test(line) ? "gagal_naik_jabatan" : /job/.test(line) ? "ditolak_kerja" : "kalah_lomba", line);
        continue;
      }
      for (const [re, kind, i, tag] of LINES) if (re.test(line)) { add(kind, i, tag, line); break; }
    }
    for (const a of l.ach || []) add("puncak", /^promo_|^first_job/.test(a.id) ? 2 : 1, "capaian:" + a.id.replace(/\d+$/, ""), a.label);
    if (!out.length && (l.dramas || []).includes("besar")) add("tegang", 2, "drama_besar", l.lines[1] || l.lines[0]);
    // satu tag sekali per hari; nyaris menang dari puncak/sedih di tag yang sama
    const seen = new Map();
    for (const m of out) { const k = m.tag; const p = seen.get(k); if (!p || m.i > p.i) seen.set(k, m); }
    return [...seen.values()];
  }
  // urutan log -> momen, plus "nunggu" sehari sebelum ujian, wawancara, review, dan maraton (cuma bisa diliat ke belakang di replay)
  const WAIT = { ujian: "nunggu_ujian", momen_interview: "nunggu_wawancara", momen_review: "nunggu_review", maraton_hari_h: "nunggu_maraton", lomba: "nunggu_lomba" };
  function scan(logs) {
    const out = [];
    for (const l of logs) {
      for (const e of l.events || []) if (WAIT[e]) out.push({ day: l.day - 1, cid: l.cid, name: l.name, phase: l.phase, kind: "tegang", i: 2, tag: WAIT[e], line: "" });
      out.push(...detect(l));
    }
    return out.sort((a, b) => a.day - b.day);
  }
  const API = { TAG, LINES, detect, scan, KINDS: ["puncak", "nyaris", "lega", "tegang", "sedih"] };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Moments = API;
})();

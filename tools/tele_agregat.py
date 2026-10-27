#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Agregator telemetry: file ekspor (Dev tools > Telemetry > "Save log file") -> tabel CSV tanpa nama.

Pakai:   python3 tools/tele_agregat.py <folder masuk> <folder keluar>
Masuk:   file JSON hasil Tele.payload(), satu per HP per ekspor. Boleh tumpang tindih: event ganda dibuang,
         catatan hadir dipakai dari file terbaru tiap akun.
Keluar:  ringkas.csv harian.csv jam.csv hari_minggu.csv layar.csv aksi.csv intro.csv baris.csv fitur.csv
         perangkat.csv cari.csv teknis.csv error.csv retensi.csv meta.json
Pegangan: cuma stdlib. Keluarannya nggak pernah memuat nama, isi chat, id akun, atau id perangkat: akun cuma dihitung.
         Kamus event: riset/kamus-event.md (folder proyek).
"""
import csv
import datetime as dt
import json
import os
import statistics
import sys
from collections import Counter, defaultdict

NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
RETENSI_HARI = [1, 2, 3, 7, 14, 30]
# event fitur -> kolom kuncinya (tabel fitur.csv)
FITUR = {"fokus": None, "balik": "k", "cuaca": "k", "kosmetik": "i", "keinginan": "k", "dilema": "lvl",
         "dunia": "j", "brand": "k", "notif": "app", "momen": "k", "tonggak": None, "later": "k", "sekolah": None, "siapa": None}
KOLOM = {
    "ringkas": ["pemain", "sesi", "event", "file", "periode_mulai", "periode_selesai", "hari", "pemain_aktif_7h",
                "pemain_aktif_7h_sebelumnya", "sesi_7h", "sesi_7h_sebelumnya", "durasi_median_detik", "sesi_per_pemain_hari",
                "aksi_per_sesi", "ditolak_persen", "error_per_100_sesi", "sintetis", "dibuat"],
    "harian": ["tanggal", "pemain_aktif", "pemain_baru", "sesi", "durasi_median_detik", "durasi_rata_detik", "layar_per_sesi",
               "aksi", "aksi_ditolak", "error"],
    "jam": ["jam", "sesi"],
    "hari_minggu": ["hari", "nama", "sesi"],
    "layar": ["layar", "jenis", "nama", "buka", "sesi", "lama_rata_detik"],
    "aksi": ["jenis", "jumlah", "ditolak", "ditolak_persen"],
    "intro": ["jenis", "kunci", "tampil", "lanjut", "lewat", "selesai", "ulang", "menetas"],
    "baris": ["fitur", "kunci", "tampil", "ketuk", "buka", "ketuk_persen"],
    "fitur": ["fitur", "kunci", "aksi", "jumlah"],
    "perangkat": ["kategori", "nilai", "sesi", "persen"],
    "cari": ["app", "kata", "jumlah", "hasil_nol"],
    "teknis": ["apa", "jumlah"],
    "error": ["pesan", "jumlah", "versi"],
    "retensi": ["hari_ke", "basis_akun", "kembali", "kembali_persen"],
}


def angka(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def med(xs):
    return round(statistics.median(xs)) if xs else ""


def rata(xs, d=1):
    return round(sum(xs) / len(xs), d) if xs else ""


def pct(a, b):
    return round(100.0 * a / b, 1) if b else ""


def baca(folder):
    out = []
    for name in sorted(os.listdir(folder)):
        if not name.lower().endswith(".json"):
            continue
        path = os.path.join(folder, name)
        try:
            with open(path, encoding="utf-8") as f:
                d = json.load(f)
        except Exception as e:  # file rusak: lewati, jangan berhenti
            print(f"lewati {name}: {e}")
            continue
        if not isinstance(d, dict) or not isinstance(d.get("event"), list):
            print(f"lewati {name}: bukan file ekspor telemetry")
            continue
        out.append((name, d))
    return out


def gabung(files):
    """Daftar event tanpa ganda (urut waktu), catatan hadir terbaru per akun, dan tanda data contoh."""
    seen, events, saves, sintetis = set(), [], {}, False
    for name, d in files:
        akun = d.get("akun") or ("file:" + name)
        if d.get("contoh"):
            sintetis = True
        for e in d["event"]:
            if not isinstance(e, dict) or "n" not in e or not angka(e.get("t")):
                continue
            key = (akun, json.dumps(e, sort_keys=True))
            if key in seen:
                continue
            seen.add(key)
            events.append((akun, e))
        dibuat = d.get("dibuat") if angka(d.get("dibuat")) else 0
        if akun not in saves or dibuat >= saves[akun][0]:
            hadir = sorted({int(x) for x in (d.get("hadir") or []) if angka(x)})
            saves[akun] = (dibuat, hadir)
    events.sort(key=lambda x: x[1]["t"])
    return events, saves, sintetis


def tanggal(t_ms, zona):
    """Tanggal lokal pemain: waktu UTC digeser zona (jam dari UTC) yang dicatat di sesi.mulai."""
    return (dt.datetime.fromtimestamp(t_ms / 1000.0, dt.timezone.utc) + dt.timedelta(hours=zona)).date()


def os_dari_ua(ua):
    ua = str(ua or "")
    if "HeadlessChrome" in ua:
        return "harness (uji)"
    for tanda, nama in (("Android", "Android"), ("iPhone", "iOS"), ("iPad", "iOS"), ("Windows", "Windows"),
                        ("Mac OS", "macOS"), ("CrOS", "ChromeOS"), ("Linux", "Linux")):
        if tanda in ua:
            return nama
    return "lainnya"


def kelas_layar(wh):
    try:
        w, h = (int(x) for x in str(wh).lower().split("x"))
    except Exception:
        return "?"
    m = min(w, h)
    return "ponsel" if m < 600 else ("tablet" if m < 1024 else "desktop")


def kosong():
    return {"akun": set(), "sesi": 0, "durasi": [], "layar": [], "aksi": 0, "ditolak": 0, "error": 0}


def agregat(events, saves, sintetis, n_file):
    zona, mulai, selesai, hari_akun = {}, {}, {}, {}
    for akun, e in events:
        s = e.get("s")
        if e["n"] == "sesi.mulai":
            z = e.get("zona")
            zona[s] = z if angka(z) else 0
            mulai[s] = (akun, e)
            if angka(e.get("hari")):
                hari_akun[akun] = max(hari_akun.get(akun, 0), int(e["hari"]))
        elif e["n"] == "sesi.selesai":
            selesai[s] = e

    def tgl(e):
        return tanggal(e["t"], zona.get(e.get("s"), 0))

    # --- harian
    per_hari, pertama = {}, {}
    for s, (akun, e) in mulai.items():
        d = tgl(e)
        h = per_hari.setdefault(d, kosong())
        h["akun"].add(akun)
        h["sesi"] += 1
        if akun not in pertama or d < pertama[akun]:
            pertama[akun] = d
        se = selesai.get(s)
        if se:
            if angka(se.get("durasi")) and 0 <= se["durasi"] <= 6 * 3600:
                h["durasi"].append(se["durasi"])
            if angka(se.get("layar")):
                h["layar"].append(se["layar"])
    total_aksi = total_ditolak = 0
    for akun, e in events:
        if e["n"] == "aksi":
            h = per_hari.setdefault(tgl(e), kosong())
            h["aksi"] += 1
            total_aksi += 1
            if not e.get("ok"):
                h["ditolak"] += 1
                total_ditolak += 1
        elif e["n"] == "teknis" and e.get("apa") == "error":
            per_hari.setdefault(tgl(e), kosong())["error"] += 1
    baru = Counter(pertama.values())
    hari_ada = sorted(per_hari)
    semua_hari = [hari_ada[0] + dt.timedelta(days=i) for i in range((hari_ada[-1] - hari_ada[0]).days + 1)] if hari_ada else []
    harian = []
    for d in semua_hari:
        h = per_hari.get(d) or kosong()
        harian.append({"tanggal": d.isoformat(), "pemain_aktif": len(h["akun"]), "pemain_baru": baru.get(d, 0), "sesi": h["sesi"],
                       "durasi_median_detik": med(h["durasi"]), "durasi_rata_detik": rata(h["durasi"]), "layar_per_sesi": rata(h["layar"]),
                       "aksi": h["aksi"], "aksi_ditolak": h["ditolak"], "error": h["error"]})

    # --- jam dan hari dalam minggu (jam lokal, dicatat client)
    c_jam, c_hari = Counter(), Counter()
    for s, (akun, e) in mulai.items():
        if angka(e.get("jam")):
            c_jam[int(e["jam"]) % 24] += 1
        if angka(e.get("hari_minggu")):
            c_hari[int(e["hari_minggu"]) % 7] += 1
    jam = [{"jam": j, "sesi": c_jam.get(j, 0)} for j in range(24)]
    hari_minggu = [{"hari": i, "nama": NAMA_HARI[i], "sesi": c_hari.get(i, 0)} for i in range(7)]

    # --- layar: berapa kali dibuka, di berapa sesi, rata-rata lama di situ (dari event berikutnya: dari + lama)
    buka, sesi_layar, lama = Counter(), defaultdict(set), defaultdict(list)
    for akun, e in events:
        if e["n"] != "layar":
            continue
        k = "%s:%s" % (e.get("j", "?"), e.get("l", "?"))
        buka[k] += 1
        sesi_layar[k].add(e.get("s"))
        if e.get("dari") and angka(e.get("lama")) and 0 <= e["lama"] <= 3600:
            lama[str(e["dari"])].append(e["lama"])
    layar = [{"layar": k, "jenis": k.split(":", 1)[0], "nama": k.split(":", 1)[1], "buka": n, "sesi": len(sesi_layar[k]),
              "lama_rata_detik": rata(lama.get(k, []))} for k, n in buka.most_common()]

    # --- aksi: jenis tindakan dan berapa yang ditolak makhluk
    ak = defaultdict(lambda: [0, 0])
    for akun, e in events:
        if e["n"] == "aksi":
            a = ak[str(e.get("k", "?"))]
            a[0] += 1
            a[1] += 0 if e.get("ok") else 1
    aksi = sorted(({"jenis": k, "jumlah": v[0], "ditolak": v[1], "ditolak_persen": pct(v[1], v[0])} for k, v in ak.items()),
                  key=lambda r: -r["jumlah"])

    # --- intro: corong tur awal, kartu app, tutorial pintu
    it = defaultdict(Counter)
    for akun, e in events:
        if e["n"] == "intro":
            it[(str(e.get("j", "?")), str(e.get("k", "?")))][str(e.get("l", "?"))] += 1
    intro = [{"jenis": j, "kunci": k, "tampil": c["tampil"], "lanjut": c["lanjut"], "lewat": c["lewat"], "selesai": c["selesai"],
              "ulang": c["ulang"], "menetas": c["menetas"]}
             for (j, k), c in sorted(it.items(), key=lambda x: (x[0][0], x[0][1].zfill(3)))]

    # --- baris Today dan Soon: tampil vs diketuk
    br = defaultdict(Counter)
    for akun, e in events:
        if e["n"] in ("today", "soon"):
            br[(e["n"], str(e.get("k", "?")))][str(e.get("a", "?"))] += 1
    baris = [{"fitur": f, "kunci": k, "tampil": c["tampil"], "ketuk": c["ketuk"], "buka": c["buka"], "ketuk_persen": pct(c["ketuk"], c["tampil"])}
             for (f, k), c in sorted(br.items(), key=lambda x: (x[0][0], -x[1]["tampil"], x[0][1]))]

    # --- fitur lain: satu tabel panjang (fitur, kunci, aksi, jumlah)
    ft = Counter()
    for akun, e in events:
        if e["n"] in FITUR:
            kol = FITUR[e["n"]]
            ft[(e["n"], str(e.get(kol, "-")) if kol else "-", str(e.get("a", "-")))] += 1
    fitur = [{"fitur": f, "kunci": k, "aksi": a, "jumlah": n} for (f, k, a), n in sorted(ft.items())]

    # --- perangkat: kelas OS dan layar, versi, bahasa, asal masuk, zona waktu (per sesi)
    kat = defaultdict(Counter)
    for s, (akun, e) in mulai.items():
        kat["os"][os_dari_ua(e.get("ua"))] += 1
        kat["layar"][kelas_layar(e.get("layar"))] += 1
        kat["versi"][str(e.get("ver") or "?")] += 1
        kat["bahasa"][str(e.get("bahasa") or "?")[:2].lower()] += 1
        kat["dari"][str(e.get("dari") or "?")] += 1
        kat["zona"]["UTC%+g" % zona.get(s, 0)] += 1
    perangkat = [{"kategori": c, "nilai": v, "sesi": n, "persen": pct(n, len(mulai))}
                 for c in ("os", "layar", "versi", "bahasa", "dari", "zona") for v, n in kat[c].most_common()]

    # --- pencarian: kata yang dicari dan yang nggak ketemu (Nest: isinya memang nggak dicatat)
    cr = defaultdict(lambda: [0, 0])
    for akun, e in events:
        if e["n"] != "cari":
            continue
        app = str(e.get("app", "?"))
        q = "(isi tidak dicatat)" if app == "nest" else str(e.get("q", ""))[:40].lower()
        c = cr[(app, q)]
        c[0] += 1
        if e.get("hasil") == 0:
            c[1] += 1
    cari = sorted(({"app": a, "kata": q, "jumlah": c[0], "hasil_nol": c[1]} for (a, q), c in cr.items()),
                  key=lambda r: (-r["jumlah"], r["app"], r["kata"]))[:60]

    # --- teknis dan error
    tk, er, er_ver = Counter(), Counter(), defaultdict(Counter)
    for akun, e in events:
        if e["n"] != "teknis":
            continue
        apa = str(e.get("apa", "?"))
        tk[apa] += 1
        if apa == "error":
            m = str(e.get("msg") or "")[:80] or "(tanpa pesan)"
            er[m] += 1
            er_ver[m][str(mulai.get(e.get("s"), (None, {}))[1].get("ver") or "?")] += 1
    teknis = [{"apa": k, "jumlah": n} for k, n in tk.most_common()]
    error = [{"pesan": m, "jumlah": n, "versi": ", ".join(v for v, _ in er_ver[m].most_common(3))} for m, n in er.most_common(20)]

    # --- retensi dari catatan hadir di save (hari ke-n sejak hari pertama; basisnya akun yang umurnya sudah >= n hari)
    retensi = []
    for n in RETENSI_HARI:
        basis = kembali = 0
        for akun, (_, hadir) in saves.items():
            umur = hari_akun.get(akun, hadir[-1] if hadir else -1)
            if umur < n:
                continue
            basis += 1
            if n in hadir:
                kembali += 1
        retensi.append({"hari_ke": n, "basis_akun": basis, "kembali": kembali, "kembali_persen": pct(kembali, basis)})

    # --- ringkas
    durasi_semua = [se["durasi"] for se in selesai.values() if angka(se.get("durasi")) and 0 <= se["durasi"] <= 6 * 3600]
    tujuh, sebelum = semua_hari[-7:], semua_hari[-14:-7]
    aktif = lambda hari: len(set().union(*(per_hari[d]["akun"] for d in hari if d in per_hari)) if hari else set())
    sesi_di = lambda hari: sum(per_hari[d]["sesi"] for d in hari if d in per_hari)
    pemain_hari = sum(len(h["akun"]) for h in per_hari.values())
    ringkas = {
        "pemain": len({a for a, _ in mulai.values()}), "sesi": len(mulai), "event": len(events), "file": n_file,
        "periode_mulai": semua_hari[0].isoformat() if semua_hari else "", "periode_selesai": semua_hari[-1].isoformat() if semua_hari else "",
        "hari": len(semua_hari), "pemain_aktif_7h": aktif(tujuh), "pemain_aktif_7h_sebelumnya": aktif(sebelum),
        "sesi_7h": sesi_di(tujuh), "sesi_7h_sebelumnya": sesi_di(sebelum),
        "durasi_median_detik": med(durasi_semua), "sesi_per_pemain_hari": round(len(mulai) / pemain_hari, 2) if pemain_hari else "",
        "aksi_per_sesi": round(total_aksi / len(mulai), 2) if mulai else "", "ditolak_persen": pct(total_ditolak, total_aksi),
        "error_per_100_sesi": round(100.0 * sum(h["error"] for h in per_hari.values()) / len(mulai), 1) if mulai else "",
        "sintetis": 1 if sintetis else 0, "dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
    }
    return {"ringkas": [ringkas], "harian": harian, "jam": jam, "hari_minggu": hari_minggu, "layar": layar, "aksi": aksi, "intro": intro,
            "baris": baris, "fitur": fitur, "perangkat": perangkat, "cari": cari, "teknis": teknis, "error": error, "retensi": retensi}


def tulis(folder, tabel):
    os.makedirs(folder, exist_ok=True)
    for nama, rows in tabel.items():
        with open(os.path.join(folder, nama + ".csv"), "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=KOLOM[nama], extrasaction="ignore")
            w.writeheader()
            w.writerows(rows)
    with open(os.path.join(folder, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(dict(tabel["ringkas"][0], tabel=sorted(tabel)), f, indent=1, ensure_ascii=False)


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    files = baca(argv[1])
    if not files:
        print("nggak ada file ekspor di", argv[1])
        return 1
    events, saves, sintetis = gabung(files)
    tabel = agregat(events, saves, sintetis, len(files))
    tulis(argv[2], tabel)
    r = tabel["ringkas"][0]
    print("%d file, %d akun, %d sesi, %d event, %s s/d %s%s -> %s" % (
        len(files), r["pemain"], r["sesi"], r["event"], r["periode_mulai"], r["periode_selesai"], " (DATA CONTOH)" if sintetis else "", argv[2]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

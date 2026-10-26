#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bikin file ekspor telemetry CONTOH (sintetis, bukan pemain sungguhan) buat nyoba agregator dan dashboard tim.

Pakai:  python3 tools/tele_contoh.py <folder keluar> [akun=40] [hari=21] [seed=7]
Bentuk filenya sama dengan Tele.payload() (riset/kamus-event.md) ditambah "contoh": true, supaya agregator nulis
sintetis=1 dan dashboard nampilin label DATA CONTOH. Semua kejadian dari pembangkit acak; nggak ada apa-apa dari pemain.
"""
import datetime as dt
import json
import os
import random
import sys

VER = "v44.1"
LAYAR = [("lembar", "plan", 14), ("lembar", "family", 8), ("lembar", "ahead", 7), ("lembar", "diary", 4), ("lembar", "closet", 3),
         ("lembar", "dilema", 5), ("lembar", "backup", 1), ("lembar", "sky", 2), ("lembar", "fokus", 2), ("lembar", "balik", 3),
         ("lembar", "life", 4), ("lembar", "profile", 2), ("hp", "home", 12), ("hp", "chirp", 9), ("hp", "burrow", 6), ("hp", "bazaar", 6),
         ("hp", "nest", 5), ("hp", "calendar", 3), ("hp", "photos", 3), ("hp", "mag", 2), ("app", "town", 6), ("app", "stars", 4),
         ("app", "burrow:jobs", 3), ("app", "bazaar:new", 3), ("app", "album:all", 2)]
AKSI = [("rawat:makan", 30), ("rawat:tidur", 18), ("rawat:main", 14), ("saran:belajar", 10), ("beli", 8), ("biz:open", 4),
        ("pohon:nyala", 5), ("pet:adopt", 1), ("kerja:lamar", 3), ("net:ref", 3)]
TODAY_K = ["dilema", "pintu", "momen", "rawat", "ingin", "beres", "sepi"]
SOON_K = ["ujian", "review", "comp", "lahir", "kelas", "fase", "ultah", "dunia", "drop", "mag", "maraton", "kindred"]
BALIK_K = ["makan", "tidur", "keluar", "keluarga", "minum", "istirahat", "teman", "capek"]
CUACA = [("clear", 50), ("cloud", 25), ("rain", 15), ("fog", 5), ("storm", 3), ("snow", 2)]
PERANGKAT = [("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36", "412x915", 55),
             ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", "390x844", 25),
             ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", "1920x1080", 12),
             ("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15", "1440x900", 5),
             ("Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", "820x1180", 3)]
JAM_BOBOT = [1, 1, 0, 0, 0, 1, 2, 4, 5, 4, 3, 4, 6, 5, 4, 4, 5, 7, 9, 12, 13, 11, 7, 3]
KATA = ["sofa", "lamp", "bread", "jacket", "bike", "camera", "rug", "plant", "ukulele", "kettle", "tent", "scooter"]
ERR = ["TypeError: Cannot read properties of undefined (reading 'mood')", "QuotaExceededError: penyimpanan penuh",
       "RangeError: Invalid array length"]
ALFABET = "abcdefghijklmnopqrstuvwxyz0123456789"


def pilih(daftar):
    """Pilih satu entri berbobot: (nilai, bobot) balikin nilai; (a, b, bobot) balikin (a, b)."""
    r = random.uniform(0, sum(x[-1] for x in daftar))
    for x in daftar:
        r -= x[-1]
        if r <= 0:
            return x[0] if len(x) == 2 else x[:-1]
    x = daftar[-1]
    return x[0] if len(x) == 2 else x[:-1]


def sesi(ev, tgl, jam, hari_game, umur, zona, dev, bahasa, pertama, lanjut):
    """Satu sesi main: nulis event ke ev."""
    sid = "".join(random.choice(ALFABET) for _ in range(6))
    lokal = dt.datetime.combine(tgl, dt.time(jam, random.randrange(60), random.randrange(60)))
    t = int((lokal - dt.timedelta(hours=zona)).replace(tzinfo=dt.timezone.utc).timestamp() * 1000)
    t0 = t
    hitung = {"layar": 0, "aksi": 0}

    def E(n, **d):
        e = {"t": t, "s": sid, "n": n}
        e.update(d)
        ev.append(e)

    def maju(a, b):
        nonlocal t
        t += random.randint(a, b)

    ua, wh = dev
    E("sesi.mulai", jam=jam, hari_minggu=(tgl.weekday() + 1) % 7, zona=zona, dari=pilih([("langsung", 88), ("notif", 12)]), ver=VER,
      layar=wh, ua=ua, bahasa=bahasa, hari=hari_game, umur_akun=umur, lanjut=lanjut)
    if pertama:
        E("intro", j="telur", k="1", l="tampil")
        maju(20000, 90000)
        E("intro", j="telur", k="1", l="menetas", nama=1 if random.random() < 0.7 else 0, ms=random.randint(20000, 90000))
        for langkah in range(1, 7):  # tur awal 6 langkah, tiap langkah ada yang berhenti
            maju(2000, 12000)
            E("intro", j="tur", k=str(langkah), l="tampil")
            if random.random() < 0.1:
                maju(500, 2000)
                E("intro", j="tur", k=str(langkah), l="lewat")
                break
            maju(2000, 9000)
            E("intro", j="tur", k=str(langkah), l="lanjut" if langkah < 6 else "selesai")
    for k in random.sample(TODAY_K, random.randint(1, 2)):
        maju(500, 3000)
        E("today", k=k, a="tampil")
        if random.random() < 0.35:
            maju(1000, 8000)
            E("today", k=k, a="ketuk")
    for k in random.sample(SOON_K, random.randint(1, 3)):
        maju(300, 2000)
        E("soon", k=k, a="tampil", hari=random.randint(0, 14), pasti=1 if random.random() < 0.7 else 0)
        if random.random() < 0.3:
            maju(1000, 8000)
            E("soon", k=k, a="ketuk")
            if random.random() < 0.5:
                maju(1000, 5000)
                E("soon", k=k, a="buka")
    E("cuaca", a="tampil", k=pilih(CUACA))
    if random.random() < 0.3:
        E("brand", k="food:treat", a="tampil", j=2)
        if random.random() < 0.3:
            maju(2000, 20000)
            E("brand", k="food:treat", a="pakai", j=2)
    terakhir = None
    for _ in range(random.randint(2, 9)):
        j, l = pilih(LAYAR)
        lama = random.randint(4, 120)
        maju(lama * 1000, lama * 1000 + 900)
        E("layar", j=j, l=l, dari=terakhir, lama=lama if terakhir else 0)
        terakhir = "%s:%s" % (j, l)
        hitung["layar"] += 1
        if j == "lembar" and l in ("plan", "family"):
            for _ in range(random.randint(0, 3)):
                maju(1500, 6000)
                E("aksi", k=pilih(AKSI), ok=1 if random.random() < 0.86 else 0)
                hitung["aksi"] += 1
        elif j == "hp" and l == "home":
            E("notif", a="tampil", app="chirp,burrow", i=0)
            if random.random() < 0.3:
                maju(1000, 4000)
                E("notif", a="klik", app="chirp", i=0)
        elif j == "hp" and l in ("bazaar", "burrow", "chirp", "nest") and random.random() < 0.4:
            maju(2000, 9000)
            if l == "nest":
                E("cari", app="nest", pjg=random.randint(3, 20), hasil=random.randint(0, 5))
            else:
                E("cari", app=l, q=random.choice(KATA), hasil=0 if random.random() < 0.25 else random.randint(1, 12))
        elif j == "lembar" and l == "dilema":
            k = "dilema-%02d" % random.randint(1, 12)
            lvl = pilih([("kecil", 50), ("sedang", 35), ("besar", 15)])
            E("dilema", a="tampil", k=k, lvl=lvl)
            detik = random.randint(4, 90)
            maju(detik * 1000, detik * 1000 + 500)
            if random.random() < 0.8:
                E("dilema", a="jawab", k=k, lvl=lvl, opt=random.choice("abc"), detik=detik, telat=0)
            else:
                E("dilema", a="nanti", k=k, lvl=lvl)
        elif j == "lembar" and l == "fokus":
            ujian = 1 if random.random() < 0.4 else 0
            menit = random.choice([15, 25, 25, 45])
            E("fokus", a="buka", ujian=ujian, menit=menit)
            if random.random() < 0.8:
                maju(1000, 5000)
                E("fokus", a="mulai", ujian=ujian, menit=menit)
                if random.random() < 0.3:
                    maju(60000, 600000)
                    E("fokus", a="hp", ujian=ujian, menit=menit)
                if random.random() < 0.65:
                    maju(menit * 60000, menit * 60000 + 5000)
                    E("fokus", a="selesai", ujian=ujian, menit=menit, kredit=ujian)
                else:
                    maju(60000, menit * 60000)
                    E("fokus", a="batal", ujian=ujian, menit=menit, kredit=0)
        elif j == "lembar" and l == "balik":
            k = random.choice(BALIK_K)
            E("balik", k=k, a="tampil")
            maju(3000, 30000)
            E("balik", k=k, a="jawab" if random.random() < 0.7 else "nanti")
        elif j == "lembar" and l == "sky" and random.random() < 0.3:
            E("cuaca", a="atur", k=pilih([("tz", 60), ("geo", 25), ("off", 15)]))
        elif j == "lembar" and l == "closet" and random.random() < 0.35:
            slot = random.choice(["topi", "syal", "kacamata", "jaket"])
            E("kosmetik", a="beli", i="%s-%02d" % (slot, random.randint(1, 9)), s=slot, h=random.choice([20, 35, 50]), saldo=random.randint(0, 200))
    if random.random() < 0.15:
        k = "ingin-%02d" % random.randint(1, 20)
        E("keinginan", a="muncul", k=k, fase="anak")
        if random.random() < 0.6:
            maju(5000, 60000)
            E("keinginan", a="tercapai" if random.random() < 0.6 else "lewat", k=k, fase="anak")
    if random.random() < 0.04:
        E("teknis", apa="error", msg=random.choice(ERR), src="ui.js", baris=random.randint(100, 6000))
    maju(1000, 30000)
    E("sesi.selesai", durasi=(t - t0) // 1000, layar=hitung["layar"], aksi=hitung["aksi"], alasan=pilih([("sembunyi", 80), ("tutup", 20)]))


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    folder = argv[1]
    n_akun = int(argv[2]) if len(argv) > 2 else 40
    n_hari = int(argv[3]) if len(argv) > 3 else 21
    random.seed(int(argv[4]) if len(argv) > 4 else 7)
    os.makedirs(folder, exist_ok=True)
    hari_ini = dt.datetime.now(dt.timezone.utc).date()
    awal = hari_ini - dt.timedelta(days=n_hari - 1)
    total_ev = n_file = 0
    for i in range(n_akun):
        # 60% akun baru (mulai di dalam jendela), 40% akun lama (mulai 1-60 hari sebelum jendela)
        mulai = awal + dt.timedelta(days=random.randrange(n_hari)) if random.random() < 0.6 else awal - dt.timedelta(days=random.randint(1, 60))
        giat = random.choice([0.95, 0.8, 0.6, 0.4, 0.25, 0.12])  # peluang main di satu hari
        putus = None if random.random() < 0.6 else random.randint(2, 40)  # berhenti main setelah hari ke-n
        zona = 7 if random.random() < 0.8 else random.choice([8, 9, 0, 1, -5, 3])
        dev = pilih(PERANGKAT)
        bahasa = "id-ID" if random.random() < 0.7 else "en-US"
        ev, hadir = [], []
        d = mulai
        while d <= hari_ini:
            hari_game = (d - mulai).days
            if putus is not None and hari_game > putus:
                break
            if hari_game == 0 or random.random() < giat:
                hadir.append(hari_game)
                if d >= awal:
                    jam = random.choices(range(24), weights=JAM_BOBOT)[0]
                    for s_ix in range(1 + (random.random() < 0.4) + (random.random() < 0.15)):
                        if s_ix:
                            jam = min(23, jam + random.randint(1, 4))
                        sesi(ev, d, jam, hari_game, len(hadir), zona, dev, bahasa, pertama=(hari_game == 0 and s_ix == 0), lanjut=1 if s_ix else 0)
            d += dt.timedelta(days=1)
        if not ev:
            continue
        ev.sort(key=lambda e: e["t"])
        payload = {"ver": VER, "dibuat": int(dt.datetime.now(dt.timezone.utc).timestamp() * 1000), "akun": "akun-contoh-%03d" % i,
                   "contoh": True, "event": ev, "aksi": [], "hadir": hadir}
        with open(os.path.join(folder, "contoh-%03d.json" % i), "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)
        total_ev += len(ev)
        n_file += 1
    print("%d file akun contoh, %d event -> %s" % (n_file, total_ev, folder))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

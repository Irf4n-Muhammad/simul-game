#!/usr/bin/env python3
"""Gabungkan ui/*.js (urut nama file) jadi satu skrip ui.js yang dibungkus (() => { ... })();

Fragmen ui/*.js adalah potongan skrip inline index.html lama, dipecah per bagian. Semua fragmen hidup di SATU
lingkup fungsi, jadi urutan file = urutan kode lama. Jangan edit ui.js hasil build; edit fragmennya.

Penanda khusus (baris komentar, dibuang dari semua hasil build):
  // DEV-BEGIN ... // DEV-END   blok yang hanya untuk Dev; dibuang di build rilis
  // DEV-NEXT                   satu baris berikutnya hanya untuk Dev; dibuang di build rilis

Build normal : hasilnya sama persis dengan skrip inline v44 (penanda dibuang, isi utuh).
Build rilis (--release): blok/baris Dev dibuang, definisi `const DEV = ...` dihapus, lalu terser mengganti DEV
dengan false dan membuang kode mati. Build ditolak (exit 1) kalau masih ada jejak Dev di hasilnya.
"""
import argparse, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
UI = ROOT / "ui"
BEGIN, END, NEXT = "// DEV-BEGIN", "// DEV-END", "// DEV-NEXT"
DEV_DEF = re.compile(r"^const DEV = \(\(\) => \{.*\}\)\(\);$")
# jejak yang tidak boleh ada di build rilis (nama fungsi/teks fitur Dev)
TRACES = [r"\bDEV\b", r"Dev tools", r"Test mode \(Dev\)", r"mk-dev", r"\bshowDev\b", r"\bdevStars\b", r"\bDEV_DUNIA\b",
          r"\bbindVerTap\b", r"\bDEV_PTS\b", r"\bdevBtn\b", r"\bSPEEDS\b", r"dev_stars"]


def fragments():
    fs = sorted(UI.glob("*.js"))
    if not fs:
        sys.exit("ui/ kosong")
    return fs


def stitch(release):
    out = []
    for f in fragments():
        lines = f.read_text().split("\n")
        if lines and lines[-1] == "":
            lines.pop()
        in_block = False
        skip_next = False
        for ln in lines:
            s = ln.strip()
            if s == BEGIN:
                assert not in_block, f"{f.name}: DEV-BEGIN bersarang"
                in_block = True
                continue
            if s == END:
                assert in_block, f"{f.name}: DEV-END tanpa BEGIN"
                in_block = False
                continue
            if s == NEXT:
                skip_next = True
                continue
            drop = in_block or skip_next
            skip_next = False
            if release and drop:
                continue
            if release and DEV_DEF.match(ln):
                continue  # DEV jadi nama bebas; terser mendefinisikannya false
            out.append(ln)
        assert not in_block, f"{f.name}: DEV-BEGIN tanpa END"
    return "(() => {\n" + "\n".join(out) + "\n})();\n"


def terser(src: pathlib.Path, dst: pathlib.Path):
    bin_ = ROOT / "node_modules" / ".bin" / "terser"
    if not bin_.exists():
        sys.exit("terser belum terpasang: jalankan `npm install` di root repo")
    cmd = [str(bin_), str(src), "--define", "DEV=false",
           "--compress", "dead_code=true,conditionals=true,evaluate=true,unused=true,side_effects=true,reduce_vars=true,passes=2",
           "--format", "beautify=true,comments=false", "-o", str(dst)]
    subprocess.run(cmd, check=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="ui.js", help="file hasil (default: ui.js di root repo)")
    ap.add_argument("--release", action="store_true", help="build rilis: buang kode Dev, tolak kalau masih ada jejak")
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    if not out.is_absolute():
        out = ROOT / out
    js = stitch(a.release)
    if not a.release:
        out.write_text(js)
        print(f"ui.js: {len(fragments())} fragmen -> {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out} ({len(js):,} karakter)")
        return
    pre = out.with_suffix(".pre.js")
    pre.write_text(js)
    terser(pre, out)
    pre.unlink()
    txt = out.read_text()
    found = [(t, len(re.findall(t, txt))) for t in TRACES if re.search(t, txt)]
    if found:
        print("BUILD RILIS DITOLAK: masih ada jejak Dev di", out.name, "->", ", ".join(f"{t} x{n}" for t, n in found))
        sys.exit(1)
    print(f"ui.js rilis: {len(fragments())} fragmen, tanpa jejak Dev -> {out} ({len(txt):,} karakter)")


if __name__ == "__main__":
    main()

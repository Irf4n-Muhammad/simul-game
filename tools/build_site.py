#!/usr/bin/env python3
"""Bangun situs statis ke _site/ (yang di-deploy GitHub Pages dan dipublish sebagai artifact).

Isi: index.html sumber (ditambah kepala PWA), ui.js dari tools/build_ui.py, modul .js yang dimuat index.html,
lib/ (three.js lokal, menggantikan URL CDN), ikon, manifest, sw.js. --release memakai build_ui --release.
"""
import argparse, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CDN = {
    "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js": "lib/three.min.js",
    "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/geometries/RoundedBoxGeometry.js": "lib/RoundedBoxGeometry.js",
    "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js": "lib/RoomEnvironment.js",
    "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js": "lib/GLTFLoader.js",
}
STATIC = ["icons", "manifest.webmanifest", "sw.js", ".nojekyll", "lib/LICENSE.three.txt"]
PWA_HEAD = ('<meta name="robots" content="noindex">\n'
            '<meta name="theme-color" content="#F7F0E6">\n'
            '<link rel="manifest" href="manifest.webmanifest">\n'
            '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">\n'
            '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n'
            '<meta name="mobile-web-app-capable" content="yes">\n'
            '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
            '<meta name="apple-mobile-web-app-title" content="Makhluk Kecil">\n')
PWA_TAIL = ('\n<script>\n// installable as an app: register the (cache-free) service worker\n'
            'if ("serviceWorker" in navigator) { window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); }); }\n'
            '</script>')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="_site", help="folder hasil (default: _site)")
    ap.add_argument("--release", action="store_true", help="build rilis: kode Dev dibuang (lihat tools/build_ui.py)")
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    if not out.is_absolute():
        out = ROOT / out
    if out.exists():
        shutil.rmtree(out)
    (out / "lib").mkdir(parents=True)
    cmd = [sys.executable, str(ROOT / "tools" / "build_ui.py"), "--out", str(out / "ui.js")] + (["--release"] if a.release else [])
    subprocess.run(cmd, check=True)
    raw = (ROOT / "index.html").read_text()
    for url, local in CDN.items():
        assert raw.count(url) == 1, url
        raw = raw.replace(url, local)
        shutil.copyfile(ROOT / local, out / local)
    mods = [m for m in re.findall(r'<script src="([^"]+\.js)"></script>', raw) if not m.startswith("lib/")]
    for m in mods:
        if m != "ui.js":
            shutil.copyfile(ROOT / m, out / m)
    i = raw.find("</style>")
    assert i > 0
    head, body = raw[:i + 8], raw[i + 8:]
    for bad in ("<div", "<script", "<body", "<canvas", "<button"):
        assert bad not in head, bad
    assert "</body>" not in raw and "</html>" not in raw
    html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            + PWA_HEAD + head + "\n</head>\n<body>" + body + PWA_TAIL + "\n</body>\n</html>\n")
    (out / "index.html").write_text(html)
    for s in STATIC:
        src = ROOT / s
        if src.is_dir():
            shutil.copytree(src, out / s)
        else:
            shutil.copyfile(src, out / s)
    print(f"situs: {out} | modul: {len(mods)} ({', '.join(mods)}) | {'RILIS' if a.release else 'normal'}")


if __name__ == "__main__":
    main()

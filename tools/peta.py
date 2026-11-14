#!/usr/bin/env python3
"""Peta kode yang dibuat otomatis dari sumber, supaya konteksnya nggak basi.

1. docs/PETA-UI.md: tiap fragmen ui/*.js (isi singkat dari komentar pertamanya, baris, nama top-level), siapa memakai siapa,
   daftar variabel `let` bersama (state UI yang bisa diubah dari fragmen lain), dan modul game mana dipakai fragmen mana.
2. MODULES.md: kolom "Baris" di tabel Modul diperbarui ke jumlah baris sekarang.

Semua fragmen UI hidup di SATU lingkup (lihat tools/build_ui.py), jadi nama top-level di satu fragmen bisa dipakai fragmen
lain tanpa import. Peta ini yang menjawab "kalau gw ubah X, apa yang kena?".

Pakai:
  python3 tools/peta.py          tulis ulang docs/PETA-UI.md dan kolom Baris di MODULES.md
  python3 tools/peta.py --check  gagal (exit 1) kalau salah satunya belum diperbarui (dipakai `npm run lint` dan CI)
"""
import argparse, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
UI = ROOT / "ui"
OUT = ROOT / "docs" / "PETA-UI.md"
MODS = ROOT / "MODULES.md"
TOP = re.compile(r"^(?:async\s+)?(let|var|const|function\*?|class)\s+(.*)$")
IDENT = re.compile(r"[A-Za-z_$][\w$]*")


def strip_noise(src):
    """Buang komentar, string, dan template literal kasar-kasaran, supaya nama di teks nggak dihitung sebagai pemakaian."""
    src = re.sub(r"/\*.*?\*/", " ", src, flags=re.S)
    src = re.sub(r"(?m)(^|[^:\\])//.*$", r"\1", src)
    src = re.sub(r'"(?:\\.|[^"\\\n])*"', '""', src)
    src = re.sub(r"'(?:\\.|[^'\\\n])*'", "''", src)
    # template literal: teks dibuang, isi ${...} dibiarkan (sering memanggil fungsi UI)
    out, i, n = [], 0, len(src)
    while i < n:
        ch = src[i]
        if ch != "`":
            out.append(ch); i += 1; continue
        i += 1
        while i < n and src[i] != "`":
            if src[i] == "\\":
                i += 2; continue
            if src.startswith("${", i):
                depth, j = 1, i + 2
                while j < n and depth:
                    depth += {"{": 1, "}": -1}.get(src[j], 0); j += 1
                out.append(" " + src[i + 2:j - 1] + " "); i = j; continue
            i += 1
        i += 1
    return "".join(out)


def decl_names(kind, rest):
    """Nama yang dideklarasikan satu baris top-level. `let a = 1, b = f(x, y), c;` -> a, b, c."""
    if kind.startswith("function") or kind == "class":
        m = IDENT.match(rest.strip())
        return [m.group(0)] if m else []
    names, depth, start = [], 0, 0
    parts = []
    for i, ch in enumerate(rest):
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        elif ch == "," and depth == 0:
            parts.append(rest[start:i]); start = i + 1
        elif ch == ";" and depth == 0:
            break
    parts.append(rest[start:])
    for p in parts:
        p = p.strip()
        if p.startswith("{") or p.startswith("["):   # destrukturisasi: ambil semua nama sebelum '='
            head = p.split("=", 1)[0] if "}" in p.split("=", 1)[0] or "]" in p.split("=", 1)[0] else p
            names += [x for x in IDENT.findall(head) if x not in ("const", "let", "var")]
            continue
        m = IDENT.match(p)
        if m:
            names.append(m.group(0))
    return names


def first_comment(lines):
    for ln in lines[:4]:
        s = ln.strip()
        if s.startswith("//"):
            s = re.sub(r"^//\s*(=+|-+)\s*", "", s).lstrip("/ ").strip()
            if s:
                return s.replace("|", "\\|")
    return ""


def module_globals():
    raw = (ROOT / "eslint.config.js").read_text()
    m = re.search(r"Object\.fromEntries\(\[(.*?)\]\.map", raw, re.S)
    return [x for x in re.findall(r'"([A-Za-z_$][\w$]*)"', m.group(1)) if x not in ("THREE", "TOWN_ASSETS")]


def ui_map():
    files = sorted(UI.glob("*.js"))
    raw = {f.name: f.read_text() for f in files}
    code = {k: strip_noise(v) for k, v in raw.items()}
    defs, kinds = {}, {}
    per_file = {k: [] for k in raw}
    for name, src in raw.items():
        for ln in src.split("\n"):
            m = TOP.match(ln)
            if not m:
                continue
            for nm in decl_names(m.group(1), m.group(2)):
                if nm not in defs:
                    defs[nm] = name; kinds[nm] = m.group(1); per_file[name].append(nm)
    tokens = {k: set(IDENT.findall(re.sub(r"\.\s*[A-Za-z_$][\w$]*", " ", v))) for k, v in code.items()}
    users = {nm: [f for f in raw if f != owner and nm in tokens[f]] for nm, owner in defs.items()}
    return files, raw, defs, kinds, per_file, users, tokens


def render_ui():
    files, raw, defs, kinds, per_file, users, tokens = ui_map()
    uses = {f.name: sorted({defs[n] for n in tokens[f.name] if n in defs and defs[n] != f.name}) for f in files}
    used_by = {f.name: sorted({u for n in per_file[f.name] for u in users[n]}) for f in files}
    short = lambda f: f[:-3]
    out = ["# Peta UI (dibuat otomatis)", "",
           "> File ini ditulis `python3 tools/peta.py`. **Jangan diedit tangan**: ubah fragmennya, lalu jalankan skripnya.",
           "> `npm run lint` (dan CI) gagal kalau peta ini belum diperbarui.", "",
           "Semua `ui/*.js` digabung jadi satu fungsi (`ui.js`, lihat `tools/build_ui.py`), jadi nama top-level satu fragmen",
           "bisa dipakai fragmen lain tanpa import. Tabel di bawah menjawab: fragmen ini isinya apa, dan kalau diubah, siapa yang kena.",
           "Penjelasan arsitektur dan resep nambah fitur ada di `ARCHITECTURE.md`.", "",
           f"Ringkasan: {len(files)} fragmen, {sum(len(v.split(chr(10))) for v in raw.values()):,} baris, "
           f"{len(defs):,} nama top-level, {sum(1 for u in users.values() if u):,} dipakai lintas fragmen, "
           f"{sum(1 for k in kinds.values() if k in ('let', 'var'))} variabel `let`/`var` bersama.", "",
           "## Fragmen", "",
           "| Fragmen | Baris | Isi (komentar pertama) | Nama top-level | Memakai | Dipakai oleh |",
           "|---|---:|---|---:|---|---|"]
    for f in files:
        n = f.name
        lines = raw[n].split("\n")
        ub = used_by[n]
        ub_txt = ", ".join(short(x) for x in ub) if len(ub) <= 8 else f"{len(ub)} fragmen"
        us = uses[n]
        us_txt = ", ".join(short(x) for x in us) if len(us) <= 8 else f"{len(us)} fragmen"
        out.append(f"| `{n}` | {len(lines)} | {first_comment(lines)[:160]} | {len(per_file[n])} | {us_txt or '—'} | {ub_txt or '—'} |")
    out += ["", "## State UI bersama (`let`/`var` top-level)", "",
            "Variabel ini bisa diubah dari mana saja di `ui.js`. Sebelum mengubah artinya, cek semua fragmen di kolom kanan.", "",
            "| Nama | Pemilik | Dipakai di |", "|---|---|---|"]
    for nm, owner in sorted(defs.items(), key=lambda kv: (kv[1], kv[0])):
        if kinds[nm] in ("let", "var"):
            u = users[nm]
            out.append(f"| `{nm}` | {short(owner)} | {', '.join(short(x) for x in u) if u else '— (cuma pemiliknya)'} |")
    out += ["", "## Pembantu yang paling banyak dipakai", "",
            "Nama top-level dengan pemakai terbanyak. Mengubah tanda tangannya = cek semua pemakai.", "",
            "| Nama | Pemilik | Jumlah fragmen pemakai |", "|---|---|---:|"]
    for nm, u in sorted(users.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:30]:
        out.append(f"| `{nm}` | {short(defs[nm])} | {len(u)} |")
    mods = module_globals()
    out += ["", "## Modul game → fragmen UI yang memakainya", "",
            "Kalau mengubah API sebuah modul (`Engine`, `Status`, ...), fragmen ini yang perlu dicek.", "",
            "| Modul | Dipakai di |", "|---|---|"]
    for g in mods:
        u = [f.name for f in files if g in tokens[f.name] or re.search(r"\b" + re.escape(g) + r"\.", raw[f.name])]
        out.append(f"| `{g}` | {', '.join(short(x) for x in u) if u else '—'} |")
    return "\n".join(out) + "\n"


def render_modules():
    txt = MODS.read_text()
    def fix(m):
        f = ROOT / m.group(1)
        if not f.exists():
            return m.group(0)
        n = len(f.read_text().rstrip("\n").split("\n"))
        return f"| `{m.group(1)}` | {n} |"
    return re.sub(r"^\| `([a-z0-9-]+\.js)` \| \d+ \|", fix, txt, flags=re.M)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    want = {OUT: render_ui(), MODS: render_modules()}
    stale = [p for p, t in want.items() if not p.exists() or p.read_text() != t]
    if a.check:
        if stale:
            print("Peta kode basi:", ", ".join(str(p.relative_to(ROOT)) for p in stale), "-> jalankan: python3 tools/peta.py")
            sys.exit(1)
        print("peta: up to date")
        return
    OUT.parent.mkdir(exist_ok=True)
    for p, t in want.items():
        p.write_text(t)
    print(f"peta: tulis {', '.join(str(p.relative_to(ROOT)) for p in want)}" + (f" (berubah: {len(stale)})" if stale else " (tidak berubah)"))


if __name__ == "__main__":
    main()

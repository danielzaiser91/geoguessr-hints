#!/usr/bin/env python3
"""Build geoguessr-hints.md (human-readable) and dist/countries.json (for the
webpage) from the per-country JSON files in data/.

Each data/<slug>.json:
{
  "name": "Brazil", "slug": "brazil", "continent": "South America",
  "area_km2": 8515767,
  "links": { "plonkit": "https://www.plonkit.net/brazil", "geoguessr": null },
  "hints": [ { "cat": "country|region|state|city|special",
               "text": "...", "src": ["plonkit"], "sv": null }, ... ]
}
"""
import html
import json
import os
import glob
import re
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
DIST = os.path.join(ROOT, "dist")
DOCS = os.path.join(ROOT, "docs")

# Live URL of the published site — og:url must match the URL people actually share.
BASE_URL = "https://danielzaiser91.github.io/geoguessr-hints"

CONTINENT_ORDER = [
    "Africa", "Asia", "Europe", "North America",
    "South America", "Oceania", "Antarctica",
]

# Full Plonk It country/territory list (the checklist). Names only.
MASTER = {
    "Africa": ["Botswana", "Egypt", "Eswatini", "Ghana", "Kenya", "Lesotho",
        "Madagascar", "Mali", "Namibia", "Nigeria", "Reunion", "Rwanda",
        "Senegal", "South Africa", "São Tomé and Príncipe", "Tanzania",
        "Tunisia", "Uganda"],
    "Asia": ["Bangladesh", "Bhutan", "British Indian Ocean Territory", "Cambodia",
        "China", "Cyprus", "Hong Kong", "India", "Indonesia", "Iraq",
        "Israel & the West Bank", "Japan", "Jordan", "Kazakhstan", "Kyrgyzstan",
        "Laos", "Lebanon", "Macau", "Malaysia", "Mongolia", "Nepal", "Oman",
        "Pakistan", "Philippines", "Qatar", "Singapore", "South Korea",
        "Sri Lanka", "Taiwan", "Thailand", "Turkey", "United Arab Emirates",
        "Vietnam"],
    "Europe": ["Albania", "Andorra", "Austria", "Azores", "Belarus", "Belgium",
        "Bulgaria", "Croatia", "Czechia", "Denmark", "Estonia", "Faroe Islands",
        "Finland", "France", "Germany", "Gibraltar", "Greece", "Hungary",
        "Iceland", "Ireland", "Isle of Man", "Italy", "Jersey", "Latvia",
        "Liechtenstein", "Lithuania", "Luxembourg", "Madeira", "Malta", "Monaco",
        "Montenegro", "Netherlands", "North Macedonia", "Norway", "Poland",
        "Portugal", "Romania", "Russia", "San Marino", "Serbia", "Slovakia",
        "Slovenia", "Spain", "Svalbard", "Sweden", "Switzerland", "Ukraine",
        "United Kingdom"],
    "North America": ["Alaska", "Bermuda", "Canada", "Costa Rica",
        "Dominican Republic", "Greenland", "Guatemala", "Hawaii", "Martinique",
        "Mexico", "Panama", "Puerto Rico", "Saint Pierre and Miquelon",
        "US Minor Outlying Islands", "US Virgin Islands", "United States"],
    "South America": ["Argentina", "Bolivia", "Brazil", "Chile", "Colombia",
        "Curaçao", "Ecuador", "Falkland Islands", "Peru", "Uruguay"],
    "Oceania": ["American Samoa", "Australia", "Christmas Island",
        "Cocos Islands", "Guam", "New Zealand", "Northern Mariana Islands",
        "Pitcairn Islands", "Vanuatu"],
    "Antarctica": ["Antarctica", "South Georgia & Sandwich Islands"],
}

SRC_LABEL = {"plonkit": "P", "geohints": "GH", "wikipedia": "W", "geotips": "GT"}
SRC_NAME = {"plonkit": "Plonk It", "geohints": "GeoHints",
            "wikipedia": "Wikipedia", "geotips": "GeoTips"}


def load_countries():
    out = []
    for f in glob.glob(os.path.join(DATA, "*.json")):
        if os.path.basename(f).startswith("_"):
            continue
        with open(f, encoding="utf-8") as fh:
            out.append(json.load(fh))
    return out


# v4 uniqueness fields — keep the data honest, fail the build on violations.
UNIQ_VALUES = {"unique", "unique*", "shared"}


def validate_uniq(countries):
    slugs = {c["slug"] for c in countries}
    errors, stats = [], {"unique": 0, "unique*": 0, "shared": 0, "none": 0}
    for c in countries:
        for i, h in enumerate(c.get("hints", [])):
            where = f"{c['slug']} hint#{i} ({h.get('text', '')[:40]}…)"
            u = h.get("uniq")
            if u is None:
                stats["none"] += 1
                if h.get("shared_with") or h.get("uniq_note"):
                    errors.append(f"{where}: shared_with/uniq_note present but no uniq value")
                continue
            if u not in UNIQ_VALUES:
                errors.append(f"{where}: invalid uniq {u!r}")
                continue
            stats[u] += 1
            if u == "unique*" and not h.get("uniq_note"):
                errors.append(f"{where}: unique* requires uniq_note")
            if u == "shared":
                sw = h.get("shared_with") or []
                if not sw:
                    errors.append(f"{where}: shared requires non-empty shared_with")
                for s in sw:
                    if s.get("slug") not in slugs:
                        errors.append(f"{where}: shared_with slug {s.get('slug')!r} not in data/")
                    if not s.get("note"):
                        errors.append(f"{where}: shared_with[{s.get('slug')}] missing note")
    if errors:
        raise SystemExit("uniq validation FAILED:\n  " + "\n  ".join(errors))
    return stats


def src_cell(hint, links):
    """Render the source(s) of a hint as compact linked refs."""
    parts = []
    for s in hint.get("src", []):
        label = SRC_LABEL.get(s, s)
        url = None
        if s == "plonkit":
            url = links.get("plonkit")
        elif s == "geohints":
            url = hint.get("src_url") or "https://geohints.com"
        else:
            url = hint.get("src_url")
        parts.append(f"[{label}]({url})" if url else f"[{label}]")
    return " ".join(parts) if parts else "—"


def build_md(countries):
    by_name = {c["name"]: c for c in countries}
    lines = []
    lines.append("# GeoGuessr Hint Base\n")
    lines.append("Distilled meta clues per country, for learning and faster plonking. "
                 "Terse on purpose. **Auto-generated from `data/` — edit the JSON, not this file.**\n")
    lines.append("**Specificity (broad → precise):** `Country` pins the nation · "
                 "`Region` broad zone (N/S/E/W, biome) · `State` first-level subdivision · "
                 "`City` specific town · `Special` rare near-pinpoint clue.\n")
    lines.append("**Source codes:** " + ", ".join(
        f"`{SRC_LABEL[k]}` = {SRC_NAME[k]}" for k in ["plonkit", "geohints", "wikipedia", "geotips"]) +
        ". Each hint is flagged so the webpage can filter by source + specificity.\n")
    lines.append("Countries are grouped by continent, ordered biggest → smallest by area. "
                 "Per-country **Study** links: Plonk It page (has clickable Street View images) "
                 "+ GeoGuessr map to practice immediately.\n")

    # coverage tracker
    lines.append("## Coverage tracker\n")
    lines.append("✅ = done · ⬜ = to do\n")
    done_names = set(by_name)
    total = sum(len(v) for v in MASTER.values())
    done = sum(1 for c in MASTER.values() for n in c if n in done_names)
    lines.append(f"**{done} / {total} countries.**\n")
    for cont in CONTINENT_ORDER:
        names = MASTER.get(cont, [])
        marks = " ".join(("✅" if n in done_names else "⬜") + " " + n for n in names)
        lines.append(f"**{cont}:** {marks}")
    lines.append("")
    lines.append("---\n")

    # country sections, per continent, biggest first
    for cont in CONTINENT_ORDER:
        cs = [c for c in countries if c.get("continent") == cont]
        if not cs:
            continue
        cs.sort(key=lambda c: c.get("area_km2", 0), reverse=True)
        lines.append(f"# {cont}\n")
        for c in cs:
            links = c.get("links", {})
            study = []
            if links.get("plonkit"):
                study.append(f"[Plonk It]({links['plonkit']})")
            if links.get("geoguessr"):
                study.append(f"[GeoGuessr map]({links['geoguessr']})")
            lines.append(f"## {c['name']}")
            if study:
                lines.append("Study: " + " · ".join(study))
            lines.append("")
            lines.append("| Cat | Hint | Src | SV |")
            lines.append("|---|---|---|---|")
            order = {"country": 0, "region": 1, "state": 2, "city": 3, "special": 4}
            for h in sorted(c.get("hints", []), key=lambda h: order.get(h["cat"], 9)):
                sv = f"[view]({h['sv']})" if h.get("sv") else ""
                cat = h["cat"].capitalize()
                lines.append(f"| {cat} | {h['text']} | {src_cell(h, links)} | {sv} |")
            lines.append("")
    return "\n".join(lines)


# ---------- per-country share pages (docs/c/<slug>/) ----------
# Link-preview crawlers (WhatsApp/Discord/Twitter…) never see the #hash fragment, so
# /#kyrgyzstan can only ever show the generic site preview. These tiny static pages give
# every country a shareable URL with its own OG tags (title, flag image, distilled clues);
# humans get JS-redirected straight into the app at /#<slug>.

def parse_code_map():
    """Country name -> ISO 3166-1 alpha-2, reused from app.js's CODE map (single source)."""
    with open(os.path.join(DOCS, "app.js"), encoding="utf-8") as f:
        js = f.read()
    m = re.search(r"const CODE = \{(.*?)\};", js, re.S)
    return dict(re.findall(r'"([^"]+)"\s*:\s*"([a-z]{2})"', m.group(1))) if m else {}


def strip_md(s):
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"`(.+?)`", r"\1", s)
    return re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)


def flag_emoji(cc):
    return "".join(chr(0x1F1E6 + ord(ch) - ord("a")) for ch in cc) if cc else ""


def preview_desc(c, cc):
    """Minified best info + clues, capped for preview cards (~300 chars)."""
    n_vids = len(c.get("videos", []))
    head = f"{c.get('continent', '')} · {len(c.get('hints', []))} clues"
    if n_vids:
        head += f" · {n_vids} video{'s' if n_vids > 1 else ''}"
    order = {"country": 0, "region": 1, "state": 2, "city": 3, "special": 4}
    hints = sorted(c.get("hints", []), key=lambda h: order.get(h.get("cat"), 9))
    parts = [strip_md(h["text"]) for h in hints]
    body, truncated = "", False
    for p in parts:
        if len(body) + len(p) > 260:
            truncated = True
            break
        body += (" · " if body else "") + p
    if not body and parts:
        body, truncated = parts[0][:260], True
    emo = flag_emoji(cc)
    return (emo + " " if emo else "") + head + ". " + body + (" …" if truncated else "")


SHARE_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{name} — GeoGuessr hints</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GeoHint Globe">
<meta property="og:title" content="{name} — GeoGuessr hints">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
{og_image}<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#070b14">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%235bd6c0'/%3E%3Cpath d='M2 16h28M16 2a20 20 0 0 1 0 28M16 2a20 20 0 0 0 0 28' stroke='%23070b14' fill='none' stroke-width='1.4'/%3E%3C/svg%3E">
<script>location.replace("../../#{slug}");</script>
<style>body{{background:#070b14;color:#93a0bd;font:14px sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}}a{{color:#5bd6c0}}</style>
</head>
<body>
<p>Opening {name} hints… <a href="../../#{slug}">continue</a></p>
</body>
</html>
"""


def build_country_pages(countries):
    code = parse_code_map()
    cdir = os.path.join(DOCS, "c")
    shutil.rmtree(cdir, ignore_errors=True)
    for c in countries:
        cc = code.get(c["name"])
        esc = lambda s: html.escape(s, quote=True)
        og_image = ""
        if cc:
            og_image = (f'<meta property="og:image" content="https://flagcdn.com/w1280/{cc}.png">\n'
                        f'<meta property="og:image:alt" content="{esc("Flag of " + c["name"])}">\n')
        page = SHARE_PAGE.format(
            name=esc(c["name"]), slug=c["slug"], desc=esc(preview_desc(c, cc)),
            url=f"{BASE_URL}/c/{c['slug']}/", og_image=og_image)
        out = os.path.join(cdir, c["slug"])
        os.makedirs(out, exist_ok=True)
        with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
            f.write(page)
    return len(countries)


def main():
    countries = load_countries()
    uniq_stats = validate_uniq(countries)
    payload = {"countries": countries, "master": MASTER,
               "continent_order": CONTINENT_ORDER,
               "counts": {"done": len(countries),
                          "total": sum(len(v) for v in MASTER.values())}}
    os.makedirs(DIST, exist_ok=True)
    for path in (os.path.join(DIST, "countries.json"),
                 os.path.join(ROOT, "docs", "countries.json")):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=1)
    md = build_md(countries)
    with open(os.path.join(ROOT, "geoguessr-hints.md"), "w", encoding="utf-8") as f:
        f.write(md)
    pages = build_country_pages(countries)
    nh = sum(len(c.get("hints", [])) for c in countries)
    print(f"built: {len(countries)} countries, {nh} hints, {pages} share pages · uniq: {uniq_stats}")


if __name__ == "__main__":
    main()

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
import json
import os
import glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
DIST = os.path.join(ROOT, "dist")

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


def main():
    countries = load_countries()
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
    print(f"built: {len(countries)} countries")


if __name__ == "__main__":
    main()

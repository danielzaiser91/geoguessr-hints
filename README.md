# GeoGuessr Hint Globe

An interactive 3D globe for learning [GeoGuessr](https://www.geoguessr.com/) country metas.
Click a country → hints grouped by **specificity** and filterable by **source** → jump straight to
GeoGuessr to practise and to Plonk It / Street View to verify.

**Live site:** _(GitHub Pages — enable Pages on branch `main`, folder `/docs`)_

## What's inside
- `data/<slug>.json` — one file per country = **source of truth**. Each hint carries a specificity
  category (`country` → `region` → `state` → `city` → `special`) and one or more source tags.
- `scripts/build.py` — merges the data into `geoguessr-hints.md` (readable table, grouped by
  continent, biggest→smallest by area) and into `docs/countries.json` (the site's data feed).
- `docs/` — the static site (self-contained: `globe.gl`, world GeoJSON and Earth textures are
  vendored, so it works offline and has no runtime CDN dependency). This is what GitHub Pages serves.
- `geoguessr-hints.md` — the same hints as a plain, readable reference (auto-generated).
- `PROGRESS.md` — build plan, coverage checklist and resume pointer.

## Add / edit a country
1. Create or edit `data/<slug>.json` (see an existing file for the schema).
2. Run `python scripts/build.py`.
3. Commit & push — the live page updates.

## Sources & attribution
Hints are distilled primarily from the **[Plonk It Guide to GeoGuessr](https://www.plonkit.net/guide)**
(licensed **CC BY-NC-SA 4.0**), with each hint linked back to its source. This project is a
non-commercial, share-alike derivative and is likewise licensed **CC BY-NC-SA 4.0**. Country
outlines: Natural Earth (public domain). Globe rendering: [globe.gl](https://github.com/vasturiano/globe.gl).

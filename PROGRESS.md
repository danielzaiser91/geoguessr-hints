# Build plan & progress — GeoGuessr Hint Base

Persistent resume file. If work is interrupted, read this + `geoguessr-hints.md` coverage
tracker and continue from the first unchecked box.

## v2 REQUESTS
1. ✅ **Official coverage feature.** Source found: Google `svv` vector/raster tiles, keyless —
   `https://mts{s}.googleapis.com/vt?lyrs=svv&style=40,18&x={x}&y={y}&z={z}` (technique from
   sv-map). Implemented as a Leaflet modal (Carto dark base + svv overlay): per-country
   "Official coverage for X" button + global "Official coverage (world)" button. LIVE.
2. ✅ **Globe = 2 colours** (has official coverage vs none; `COVERAGE` set in app.js). Selection
   now on **pointerdown** (uses live hover state). LIVE.
3. ✅ **Full-screen country view** — hints grouped into specificity sections (coloured), card grid,
   `img` field supported per hint (image embeds render when present). LIVE.
4. ✅ **Filter bar titled** ("Filter clues — how specific / source"). LIVE.
5. ⏳ Keep going until finished/interrupted.
6. ⏳ **Multi-source:** GeoMetas wired in as a source (concise, cross-confirms → hints get both
   tags). Ireland done multi-sourced. Continue layering GeoMetas onto major countries; images:
   populate `img` per hint where a good source image exists (GeoMetas/Plonk It).

## v3 REQUESTS
1. ✅ Country detail overlay **flies in from the bottom** (`.detail` transform translateY 100%→0,
   .44s cubic-bezier + opacity). Verified via transition-off layout test (top 720→0).
2. ✅ Back button = **spinning globe** div (CSS radial-gradient sphere + `globespin` continents
   scroll) with a **back arrow above it**. HTML `#back > .arrow + .globe`.
3. ✅ Per-hint **image button → dialog** (hint text + image). Plonk It images **hotlink fine**
   cross-origin (tested from live github.io). `img` = bare Plonk It filename; `imgUrl()` builds
   `https://www.plonkit.net/images/resize/900/80/<folder>/<file>`. Ireland fully imaged (14/14).
4. ✅ Hint **type** system: `TYPE_META` + `guessType()` (plates/signs/markings/bollards/language/
   arch/landscape/cars/naming/utility/general); coloured badge per card + **type filter row**.
   Per-**area sub-sections** for state/region hints (`area` field → grouped). **Highway-shield
   dialog**: `SHIELDS` map + 🛡 button in state section. US chart vendored `docs/img/shields-us.jpg`
   (brilliantmaps); **Canada montage built** `docs/img/shields-ca.png` (12 prov/terr, Pillow from
   Wikimedia). ⏳ still to do: ≥1 specific hint per US state (with `area`).
5. ⏳ Continue ALL countries (20/136 done).
6. ✅ "Official coverage" button moved **into the title row** (`#covBtn`, wired to selected) and
   relabelled just **"🗺 Official coverage"** (country name dropped).

## STATUS: LIVE
Site published: **https://danielzaiser91.github.io/geoguessr-hints/** (repo
`danielzaiser91/geoguessr-hints`, Pages = main `/docs`). Webpage + publish DONE.
Remaining: keep adding countries (17/136 done). To update live: edit `data/`, run
`python scripts/build.py`, `git add -A && git commit && git push`. Pages auto-rebuilds.

## Goal
Interactive 3D-globe learning site for GeoGuessr metas. Click a country → hints filterable by
**source** and **specificity** → link out to GeoGuessr to practice + Street View to verify.
Published as a **GitHub Page**.

## Architecture
- `data/<slug>.json` — one file per country = **source of truth**. Schema:
  `{ name, slug, continent, area_km2, links:{plonkit, geoguessr}, hints:[ {cat, text, src[], sv} ] }`
  - `cat` ∈ country | region | state | city | special (specificity)
  - `src` ∈ plonkit | geohints | wikipedia | geotips (each hint flagged → webpage filter)
  - `sv` = Street View URL or null
- `scripts/build.py` — merges data → `geoguessr-hints.md` (readable, sorted by continent then
  area desc) + `dist/countries.json` (webpage feed). Run after any data change.
- `web/` — the globe site (static; reads `dist/countries.json`). Publish via GitHub Pages.

## Distillation rules (keep quality high)
- Terse, no long sentences. Only high-signal clues. No duplicate/near-duplicate hints.
- Prefer clues that *discriminate* (bollards, plates, lines, poles, language, car/cam, biome).
- Cross-country "also seen in X" notes kept short.
- Every hint keeps a source tag. Plonk It is primary; add other-source hints where they add
  genuinely new info, tagged accordingly.

## TODO (work top-down)

### 1. Data collection — all Plonk It countries (see tracker in geoguessr-hints.md)
Collection priority = play value / size first, micro-territories last.
- [x] Brazil, USA, Russia, Canada, China, Australia, India, Indonesia, Argentina, Mexico,
      Japan, France
- [ ] Tier 1 remaining: Germany, Spain, Italy, United Kingdom, Kazakhstan, Peru, Colombia,
      Chile, South Africa, Turkey, Thailand, Poland, Sweden, Norway, Finland, Ukraine,
      Kazakhstan, South Korea, Philippines, Malaysia, Vietnam
- [ ] Tier 2 rest of Europe (Netherlands, Belgium, Switzerland, Austria, Portugal, Greece,
      Romania, Czechia, Hungary, Denmark, Ireland, Serbia, Croatia, Bulgaria, Slovakia,
      Slovenia, Lithuania, Latvia, Estonia, Albania, N. Macedonia, Montenegro, Iceland,
      Belarus, Luxembourg, + micro/islands)
- [ ] Tier 2 rest of Asia (S. Korea, Malaysia, Philippines, Vietnam, Cambodia, Laos, Mongolia,
      Sri Lanka, Bangladesh, Nepal, Bhutan, Pakistan, Iraq, Jordan, Lebanon, Israel, UAE, Oman,
      Qatar, Cyprus, Taiwan, HK, Macau, Singapore, Kyrgyzstan)
- [ ] Rest of Africa (Kenya, Nigeria, Ghana, Uganda, Tanzania, Rwanda, Senegal, Botswana,
      Namibia, Lesotho, Eswatini, Madagascar, Tunisia, Egypt, Mali, Reunion, São Tomé)
- [ ] Rest of Americas (Guatemala, Costa Rica, Panama, Dominican Rep., Bolivia, Ecuador,
      Uruguay, Bermuda, Greenland, Alaska, Hawaii, Puerto Rico, + Caribbean/islands)
- [ ] Oceania (New Zealand, Vanuatu, Guam, American Samoa, + islands)
- [ ] Micro-territories & Antarctica (San Marino, Monaco, Andorra, Gibraltar, Jersey, IoM,
      Faroe, Svalbard, Pitcairn, Cocos, Christmas I., US Minor Outlying, S. Georgia, Antarctica…)
- [ ] Rerun `scripts/build.py` after each batch; keep tracker honest.

### 2. Enrichment
- [ ] GeoGuessr practice map link per country (verify official/community map slugs).
- [ ] Street View URLs per hint — best-effort: harvest Plonk It clue-image hrefs
      (read_page for hrefs) for key hints; webpage falls back to Plonk It section otherwise.

### 3. Webpage (`web/`)
- [ ] 3D globe (globe.gl / three.js, inlined or vendored), countries clickable & colour-coded
      by coverage/continent.
- [ ] Country panel: hints grouped by specificity, filter chips for source + specificity,
      search box, "Practice on GeoGuessr" + per-hint "verify in Street View" links.
- [ ] Responsive, dark theme, keyboard accessible, works offline from `dist/countries.json`.
- [ ] Learning aids: quiz/flashcard mode (optional stretch), copy-to-clipboard, progress marks.

### 4. Publish
- [ ] Create GitHub repo (user account) `geoguessr-hints`. Token in my_secrets.md — verify it
      allows repo create + push (may need a broader token; ask user if it fails).
- [ ] Push data + web; enable GitHub Pages (root `/web` or `/docs`); get live URL.

### 5. QA (multiple passes)
- [ ] Validate all JSON parses; build runs clean.
- [ ] Spot-check hints vs source for accuracy; fix hallucination risks.
- [ ] Test site: globe interaction, filters, links resolve, mobile layout, no console errors.
- [ ] Final review pass for duplicates / weak hints; tighten.

## Resume pointer (v3 grind)
**23/136 countries.** Done: Brazil, USA (⭐ upgraded: 29 per-state sections + images), Russia, Canada,
China, Australia, India, Indonesia, Argentina, Mexico, Japan, France, Germany, United Kingdom, Spain,
Italy, Netherlands, Ireland (⭐ imaged 14/14), Poland, Sweden, **Norway, Finland, Denmark** (new, fully
image-backed + typed).

### Per-country workflow (FAST — ~3 calls each)
1. `navigate` browser (tab `seed`) to `plonkit.net/<slug>`.
2. One `javascript_tool` call — the **combined extractor** returns `{folder, imgs:[{file,h}], text}`:
   walks h1–h4 + img in doc order (heading carries down), regex `\/images\/resize\/\d+\/\d+\/([^/]+)\/(.+)$`
   → group1 = **real image folder**, group2 = filename; plus `main.innerText.slice(0,~15000)`.
3. Write `data/<slug>.json`: distill 12–24 high-signal hints. Each hint: `cat` (country/region/state/city/
   special), `src:["plonkit"]`, `sv:null`, **`img`** = bare Plonk It filename (from extractor), optional
   `type` (only when guessType would misfire), optional `area` (state/province name → per-area sub-section).
   If the extractor `folder` ≠ what imgUrl derives from the plonkit link slug, add top-level
   **`"img_folder": "<folder>"`** (e.g. USA link /usa but folder `united-states`).
4. Every ~3 countries: `python scripts/build.py` → `git add -A && commit && push` (Pages auto-updates).
   Optionally verify a few image URLs load via the browser Image() test from the github.io origin.

`guessType` keywords→type live in app.js (plates/signs/markings/bollards/language/arch/landscape/cars/
naming/utility/general). Shields dialog wired for United States + Canada (docs/img/shields-*).

### DONE: image backfill
✅ **All 23 collected countries now image-backed** (379 hints, 95% with `img`). Per-state/region
sub-sections added for USA (29), Canada (8 prov), Australia (6), UK, Germany, Brazil, Spain (6),
Italy, Netherlands, India (scripts), Indonesia, Argentina, Mexico. Highway-shield dialogs live for
US + Canada.

### Still TODO
- Keep adding the remaining ~110 countries (continent order, biggest first). Popular next: Kazakhstan,
  Turkey, Thailand, Peru, Colombia, Chile, South Africa, Ukraine, Philippines, South Korea, Vietnam,
  Malaysia, Kenya, Portugal, Switzerland, Austria, Belgium, Greece, Czechia, Romania, New Zealand …
  Use the per-country workflow above (each new country gets images/types/areas from the start).
- Numbered-filename Plonk It pages (e.g. Japan): use the caption-pairing extractor variant (grabs the
  preceding <p> per image) to map images to hints.

## Resume pointer
Last done: **17 countries** (Brazil, USA, Russia, Canada, China, Australia, India, Indonesia,
Argentina, Mexico, Japan, France, Germany, United Kingdom, Spain, Italy, Netherlands).
**Site is BUILT & verified** in `docs/` (self-contained globe; filters/search/panel/links all
tested locally OK). Local git repo initialised + first commit made.

**BLOCKER:** saved GitHub PAT is secrets-scoped → cannot create repo / push (`Resource not
accessible`). Need a token with Administration (repo create) + Contents (push) + Pages (write),
or user pre-creates public repo `geoguessr-hints`. Once unblocked: add remote, push, enable Pages
(branch `main`, folder `/docs`).

**Then continue:** collect remaining ~119 countries (same per-country workflow), rerun build, push
(live page auto-updates). QA passes throughout.
Per-country workflow: browser navigate `plonkit.net/<slug>` → get_page_text → write
`data/<slug>.json` (distill top hints, tag `src`) → rerun `scripts/build.py`.

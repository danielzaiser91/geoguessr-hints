# Build plan & progress — GeoGuessr Hint Base

Persistent resume file. If work is interrupted, read this + `geoguessr-hints.md` coverage
tracker and continue from the first unchecked box.

## v2 REQUESTS (in progress — do not lose)
1. **Official coverage feature.** Find how sv-map.netlify.app sources official SV coverage (network
   inspect / web search). Add: when a country is selected → a button "Official coverage for
   <country>" → dialog with image OR live embed focused on that country showing where official SV
   exists. Also a global "Official coverage" button (no country selected) → world coverage view.
2. **Globe colouring = 2 states only:** has official coverage vs no coverage (drop the per-hint
   continent colours on the globe). Also: change country selection from mouseup → **mousedown**
   (clicks sometimes not registering).
3. **Full-screen country view:** when a country is selected, use the whole viewport; much more room
   per hint, clearer separation by specificity, **embed images** (like Plonk It does).
4. **Title the filter section** so it's obvious the chips filter the hints by specificity/source.
5. Keep going until finished/interrupted (no premature stops).
6. **Multi-source:** also use geometas.com (e.g. /metas/countries/ireland/) + other helpful sites,
   not only Plonk It. Tag each hint's source so the filter works.

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

# Build plan & progress — GeoGuessr Hint Base

Persistent resume file. If work is interrupted, read this + `geoguessr-hints.md` coverage
tracker and continue from the first unchecked box.

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
Last done: **12 countries** (Brazil, USA, Russia, Canada, China, Australia, India, Indonesia,
Argentina, Mexico, Japan, France). Pipeline solid. **Next:** finish Tier-1 majors (Germany, UK,
Spain, Italy, then rest), then build the `web/` globe, then create GitHub repo + Pages, then QA.
Workflow per country: browser navigate `plonkit.net/<slug>` → get_page_text → write
`data/<slug>.json` (distill top hints, tag `src`) → rerun `scripts/build.py`.

# v4 — Full Plonk It pass + uniqueness classification + search upgrade

**Resume file.** If the session is interrupted or context is lost: read this file top to bottom,
then continue at the first unchecked box in [Checklist](#checklist). Keep this file updated —
check boxes off as you go, add notes under "Unexpected findings" when something surprises you.

## User requirements (2026-07-15, do not lose any of these)

1. **Completeness:** Go over EVERY country and compare with its Plonk It guide — a lot of info
   is still missing. Capture ALL of it. Sort/structure it well so pages don't overwhelm, but
   **no info may be lost**.
2. **Multi-part hints must be split.** Example (Kyrgyzstan): "All covered in winter …; trees &
   poles painted white at the bottom" mixes a season/vegetation fact and an infrastructure fact.
   → Separate hints (or clearly separated bullet points) per topic, correct `type` tag each.
   Rule: different topic → separate hint; same-topic facets → `bullets` on one hint.
3. **Uniqueness classification** per hint (badge on card):
   - `unique` — label "Country unique" (or "State unique" for state-cat hints). Clear cases
     only, e.g. km markers with red-white triangle pattern "unique to Kyrgyzstan" (explicitly
     stated). No caveat.
   - `unique*` — unique *with caveat*: asterisk in the label; hovering (and clicking) reveals
     the caveat note. Example: Kyrgyzstan silver car w/ 4 bars is unique *in context* — other
     countries (e.g. Guatemala) have similar cars, but none of them uses Cyrillic.
     Field `uniq_note` holds that text.
   - `shared` — label "Not unique", clickable → dialog listing every relevantly similar country:
     explanation text, images of the similar thing (if available), how to differentiate (if
     possible), each linked to its page on THIS site (`#slug`). Example: white-painted tree/pole
     bottoms also in Russia etc.; Cyrillic also in Russia/Ukraine/Bulgaria — with note that
     Bulgaria is easy to tell apart (Latin+Cyrillic mix, EU blue strip on plates).
   - *(no field)* = "none" — info that is inherently about this country only (e.g. its coverage
     map, car-mirror meta, region descriptions). No badge at all.
4. **Cross-check scope is limited to the hint's category:**
   - `country` hints ↔ other countries' hints (all 136 in `data/`).
   - `state` hints ↔ other states of the SAME country only (e.g. Colorado vs other US states).
   - `region`/`city` treated like state: within the same country.
   - `special`: no cross-check (near-pinpoint by definition). Decision left to us by user → skip.
   - `shared_with` lists only countries *realistically confusable in GeoGuessr* (similar
     coverage/landscape/script), not every country on earth sharing the trait.
5. **Internal tags:** every hint carries machine-readable tags even if not user-visible.
   We have `cat` (specificity) + `type` (clue kind) — set `type` EXPLICITLY on every hint during
   the pass (don't rely on guessType), it's the basis for cross-checking.
6. **Search upgrade (country sidebar search):**
   - Findable by established shorthands: uk, uae, usa, us, nz, britain/england/scotland/wales,
     america, holland, sao tome (diacritics-insensitive!), etc.
   - Findable by ccTLD: query "de" or ".de" → Germany. Works with and without the dot.
   - When matched *by domain only*, show why: append "(.de)" (incl. dot) after the name in the
     result list.

## Data schema (data/<slug>.json, hint level)

```jsonc
{
  "cat": "country|region|state|city|special",   // existing
  "type": "plates|signs|markings|bollards|language|arch|landscape|cars|naming|utility|general",
  "text": "…", "bullets": ["…"],                // bullets = same-topic details
  "src": ["plonkit"], "sv": null, "anchor": "…", "img": "…", "imgs": [], "area": "…",  // existing
  "uniq": "unique" | "unique*" | "shared",      // ABSENT = none (no badge)
  "uniq_note": "…",                             // REQUIRED for unique*; the caveat text
  "shared_with": [                              // REQUIRED for shared
    { "slug": "russia",                         // must exist in data/ (build validates)
      "note": "White-painted tree bottoms are standard across the former USSR.",
      "diff": "Russia is mostly Gen4, no red plate strip.",   // how to tell apart (optional)
      "img": "file-in-that-countrys-plonkit-folder.png" }     // optional; full URLs also ok
  ]
}
```

`build.py` validates: uniq value ∈ set; unique* ⇒ uniq_note; shared ⇒ shared_with non-empty;
every shared_with.slug exists. Build FAILS on violation (keeps data honest).

## UI (docs/app.js + style.css + index.html)

- **Badge** in card next to type badge:
  - unique → green `✦ Country unique` / `✦ State unique`
  - unique* → green `✦ Country unique *`, `title` = uniq_note, click → same dialog showing note
  - shared → amber `⚠ Not unique`, click → uniq dialog
- **Uniq dialog** (`#uniqModal`, pattern of srcModal): quoted hint text, then per shared_with
  entry: flag + country name (click = openCountry(slug) + close), note, "How to tell apart:"
  diff, images (resolved via that country's plonkit folder → helper imgUrlForSlug).
- **Sorting:** inside each cat section sort hints by TYPE_META key order (groups same-type
  clues together, keeps pages scannable). Area sub-sections unchanged.
- **Search:** normalize (strip diacritics, lowercase) both haystack and query; SEARCH_ALIAS
  map; domain match (exact code, dot optional; gb→uk rule via domainFor); domain-only match
  renders `(.de)` marker span.

## Per-country workflow (repeat for each unchecked country)

1. Browser `navigate` tab `seed` → `https://www.plonkit.net/<slug>` (slug from data links).
2. Combined extractor (javascript_tool): headings + images (folder+file) + full text in order.
3. Diff against existing `data/<slug>.json`: add EVERY missing meta as hint (terse, distilled,
   but complete — nothing from the guide may be missing content-wise). Split multi-topic hints.
   Explicit `type` on all hints. Keep `anchor` (plonkit deep-link ids) where derivable, `img`.
4. Classify uniqueness of every country-cat hint: grep other countries' data
   (`grep -il <keyword> data/*.json`) + Plonk It's own "also/similar in X" notes. State-cat:
   compare within country only. Fill uniq/uniq_note/shared_with (+diff, +img).
5. `python scripts/build.py` (validates), every ~4-6 countries commit+push.
6. Check the box below, note anything odd in "Unexpected findings".

## Checklist

### Infrastructure (do first)
- [x] V4_PLAN.md written (this file)
- [x] build.py: uniq validation + stats
- [x] app.js: badges (unique/unique*/shared) + uniq dialog + imgUrlForSlug
- [x] app.js: type-order sorting within sections
- [x] app.js: search aliases + domain match + "(.tld)" marker + diacritics-insensitive
      (leading "." = domain-only query)
- [x] index.html: #uniqModal markup (`modal-box uniqm` — NOT `uniq`, that class = badge styles!);
      Escape/click-outside close
- [x] style.css: badge + modal styles
- [x] PROGRESS.md: v4 pointer added
- [x] Kyrgyzstan converted as EXEMPLAR (41 hints: 8 country / 6 region / 13 city / 14 special;
      all user-screenshot cases classified; winter hint split into landscape + utility hints;
      road metas as one card per road with `bullets` per section + all images) → build →
      verified in browser (badges, unique* tooltip+dialog, shared dialog w/ links/diffs/imgs,
      search uk/usa/uae/.de/sao tome) → committed
- [x] Update the "Per-country" list state for kyrgyzstan below

### Countries — full pass + classification (play-value order, biggest first)
Format: `- [ ] slug` → check when BOTH captured-complete AND classified.

**Asia:** - [x] kyrgyzstan · - [x] russia · - [x] china · - [x] india · - [x] indonesia ·
- [x] japan · - [x] thailand · - [x] malaysia · - [x] philippines · - [x] vietnam ·
- [x] south-korea · - [x] taiwan · - [x] kazakhstan · - [x] mongolia · - [x] sri-lanka ·
- [x] bangladesh · - [x] cambodia · - [x] laos · - [x] nepal · - [x] bhutan · - [x] pakistan ·
- [x] turkey · - [x] israel-west-bank · - [x] jordan · - [x] iraq · - [x] lebanon ·
- [x] united-arab-emirates · - [x] qatar · - [x] oman · - [x] singapore · - [x] hong-kong ·
- [x] macau · - [x] cyprus · - [x] british-indian-ocean-territory
**Europe:** - [x] germany · - [x] france · - [x] united-kingdom · - [x] spain · - [x] italy ·
- [x] netherlands · - [x] poland · - [x] sweden · - [x] norway · - [x] finland · - [x] denmark ·
- [x] ireland · - [x] belgium · - [x] switzerland · - [x] austria · - [x] portugal ·
- [x] greece · - [x] czechia · - [x] romania · - [x] hungary · - [x] ukraine · - [x] belarus ·
- [x] bulgaria · - [x] serbia · - [x] croatia · - [x] slovakia · - [x] slovenia ·
- [x] lithuania · - [x] latvia · - [x] estonia · - [x] iceland · - [x] albania ·
- [x] north-macedonia · - [x] montenegro · - [x] luxembourg · - [x] malta · - [x] andorra ·
- [x] monaco · - [x] san-marino · - [x] liechtenstein · - [x] gibraltar · - [x] jersey ·
- [x] isle-of-man · - [x] faroe-islands · - [x] madeira · - [x] azores · - [x] svalbard
**N. America:** - [x] usa · - [x] canada · - [x] mexico · - [x] guatemala · - [x] costa-rica ·
- [x] panama · - [x] dominican-republic · - [x] puerto-rico · - [x] greenland · - [x] bermuda ·
- [x] alaska · - [x] hawaii · - [x] martinique · - [x] saint-pierre-and-miquelon ·
- [x] us-virgin-islands · - [ ] us-minor-outlying-islands
**S. America:** - [x] brazil · - [x] argentina · - [x] chile · - [x] peru · - [x] colombia ·
- [x] bolivia · - [x] ecuador · - [x] uruguay · - [x] curacao · - [ ] falkland-islands
**Africa:** - [x] south-africa · - [x] kenya · - [x] nigeria · - [x] ghana · - [x] uganda ·
- [x] tanzania · - [x] rwanda · - [x] senegal · - [x] botswana · - [x] namibia · - [x] lesotho ·
- [x] eswatini · - [x] madagascar · - [x] tunisia · - [x] egypt · - [x] mali · - [x] reunion ·
- [ ] sao-tome-and-principe
**Oceania:** - [x] australia · - [ ] new-zealand · - [ ] vanuatu · - [ ] guam ·
- [ ] american-samoa · - [ ] christmas-island · - [ ] cocos-islands ·
- [ ] northern-mariana-islands · - [ ] pitcairn-islands
**Antarctica:** - [ ] antarctica · - [ ] south-georgia-sandwich-islands

### Final passes (after all countries)
- [ ] Global uniqueness consistency sweep: re-grep every `unique`/`unique*` claim against the
      now-complete data; fix stale classifications (early countries were classified against
      less-complete data).
- [ ] shared_with symmetry check: if A lists B for a trait, B should usually list A.
- [ ] build stats sanity (hint counts per country), spot-check 5 random countries vs Plonk It.
- [ ] Full site QA in browser (filters, badges, dialog links, search shorthands/domains).

## Unexpected findings / decisions log
- 2026-07-15: plonkit.net redirects to de.plonkit.net but content stays English (lang=en) — extractor unaffected.
- 2026-07-15: Plonk It "Maps and resources" community-doc links (Google Docs etc.) are NOT captured as hints
  (site can't render markdown links in cards yet). The recommended GeoGuessr map link IS captured →
  `links.geoguessr` (used by the "Practice on GeoGuessr" button). Revisit if link rendering gets added.
- 2026-07-15: Kyrgyz vs Kazakh Cyrillic: BOTH have Ө Ү Ң — Kazakh additionally Ә Ғ Қ Ұ Һ І. Don't call
  Ө Ү Ң unique to Kyrgyz; the shared_with diff must mention the Kazakh extras.
- 2026-07-15: cyprus.json said continent Europe while build.py MASTER lists it under Asia → country showed
  TWICE in the sidebar. Fixed to Asia. Watch for other data/master continent mismatches.
- 2026-07-15: `.uniq` is the badge CSS class — the uniq modal box must use a different class (`uniqm`).
- 2026-07-15: browser-pane tab runs hidden (document.hidden) → no rAF/transitions/lazy-load/screenshots;
  verify via DOM checks + cache-busting query param (?v=N) since python http.server has no cache headers.

## Status
- Infra: DONE (2026-07-15) · Countries: **20/136** (kyrgyzstan, russia, china, india, indonesia, japan,
  thailand, malaysia, philippines, vietnam, south-korea, taiwan, kazakhstan, mongolia, sri-lanka,
  bangladesh, cambodia, laos, nepal, bhutan) · Final passes: not started
- Next up per checklist: **pakistan**, then turkey, israel-west-bank, jordan, iraq, lebanon, UAE, qatar,
  oman, singapore, hong-kong, macau, cyprus, BIOT → then Europe (germany first).
- Hint total 1385 → 1737 so far · uniq stats: 80 unique / 26 unique* / 82 shared.
- NOTE russia is data continent "Europe" (matches MASTER). Russia rewritten 13→77 hints, china 7→17, india ~20→67.

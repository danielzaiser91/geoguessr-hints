/* GeoHint Globe — countries.json (from data/) + world GeoJSON.
   Globe colours = official Street View coverage yes/no. Detail = full-screen,
   hints grouped by specificity. Coverage modal = Leaflet + Google svv tiles. */
const GEOJSON_URL = "world.geojson";
const SRC_NAME = { plonkit: "Plonk It", geohints: "GeoHints", geometas: "GeoMetas", wikipedia: "Wikipedia", geotips: "GeoTips" };
const SRC_URL = { geohints: "https://geohints.com", geometas: "https://geometas.com/metas/countries/", wikipedia: "https://wikipedia.org", geotips: "https://geotips.net" };
const CAT_ORDER = ["country", "region", "state", "city", "special"];
const CAT_DESC = {
  country: "Tells you it's this country", region: "Narrows to a broad zone (N/S/E/W, biome)",
  state: "First-level subdivision (state/province)", city: "A specific town or city",
  special: "Rare, near-pinpoint clue",
};
// Hint "type" — what kind of clue it is. Explicit `type` on a hint wins; else inferred.
const TYPE_META = {
  plates:    { label: "Plates",        color: "#8fd6ff" },
  signs:     { label: "Road signs",    color: "#ff9e6a" },
  markings:  { label: "Road markings", color: "#f0d15b" },
  bollards:  { label: "Bollards/poles",color: "#c78bff" },
  language:  { label: "Language",      color: "#6aa9ff" },
  arch:      { label: "Architecture",  color: "#e0a878" },
  landscape: { label: "Landscape",     color: "#5bd6a0" },
  cars:      { label: "Cars/camera",   color: "#ff6b8b" },
  naming:    { label: "Names/codes",   color: "#b7c0d6" },
  utility:   { label: "Infrastructure",color: "#9aa7c4" },
  general:   { label: "General",       color: "#93a0bd" },
};
const TYPE_ORDER = Object.keys(TYPE_META);
function guessType(h) {
  if (h.type) return h.type;
  const t = (h.text || "").toLowerCase();
  const has = (...w) => w.some(x => t.includes(x));
  if (has("plate", "licen", "number plate")) return "plates";
  if (has("bollard", "snow pole", "guardrail", "reflector", "utility pole", "wooden pole", "delineator")) return "bollards";
  if (has("chevron", "warning sign", "road sign", "pedestrian sign", "yield", "give way", "stop sign", "signpost", "direction sign", "diamond", "sign =", "signs =", "signage")) return "signs";
  if (has("road line", "all-white line", "white line", "yellow line", "dashes", "marking", "centre line", "center line", "road edge", "double middle", "outer line")) return "markings";
  if (has("language", "letter", "script", "alphabet", "cyrillic", "diacritic", "font", "writing", "bilingual", "consonant", "suffix", "å ä ö", "ł ")) return "language";
  if (has("architect", "building", "house", "roof", "church", "shrine", "brick", "facade", "wooden house", "painted")) return "arch";
  if (has("forest", "vegetation", "tree-lined", "trees", "grass", "biome", "mountain", "desert", "landscape", "snow", "climate", "palm", "fields", "terrain", "hilly", "flat", "moorland", "rugged", "boreal")) return "landscape";
  if (has("gen4", "gen3", "gen2", "gen 4", "gen 3", "camera", "antenna", "rig", "blur", "volvo", "vehicle", " car", "cars")) return "cars";
  if (has("road number", "area code", "phone", "numbered", "road numbering", "anti-clockwise", "first digit", "3-digit", "postcode", "place names", "-owo", "-ów")) return "naming";
  if (has("pole", "power line", "infrastructure", "roadwork")) return "utility";
  return "general";
}
// "Super" clue = a high-value clue that pinpoints a REGION fast (area/plate codes, import
// cars, no-front-plate halves, …). Only meaningful for subdivisions, never for country-level.
const isSuper = (h) => !!h.super && h.cat !== "country";
// Highway-shield reference images (keyed by data country name). Files vendored in docs/img/.
const SHIELDS = {
  "United States": { img: "img/shields-us.jpg", title: "US State Route Marker Shields",
    cap: "Every US state has its **own route-marker shape**. When you see a numbered state route, the shield shape alone narrows the state fast (e.g. California spade, Florida circle-in-oval, Michigan diamond).",
    credit: 'Reference chart — <a href="https://en.wikipedia.org/wiki/State_highway" target="_blank" rel="noopener">state route markers</a>' },
  "Canada": { img: "img/shields-ca.png", title: "Canada Provincial Route Shields",
    cap: "Each **province/territory has its own highway shield** (Ontario crown, Québec fleur-de-lis/route number, BC shield, etc.) — the marker pins the province.",
    credit: 'Reference chart — <a href="https://en.wikipedia.org/wiki/Numbered_highways_in_Canada" target="_blank" rel="noopener">provincial route markers</a>' },
};
// US states tile-grid (abbr -> {n: full name, x: col, y: row}) for the USA state-clue map.
const US_TILES = {
  AK:{n:"Alaska",x:0,y:0}, ME:{n:"Maine",x:10,y:0}, VT:{n:"Vermont",x:9,y:1}, NH:{n:"New Hampshire",x:10,y:1},
  WA:{n:"Washington",x:0,y:2}, MT:{n:"Montana",x:1,y:2}, ND:{n:"North Dakota",x:2,y:2}, MN:{n:"Minnesota",x:3,y:2}, WI:{n:"Wisconsin",x:4,y:2}, MI:{n:"Michigan",x:6,y:2}, NY:{n:"New York",x:8,y:2}, MA:{n:"Massachusetts",x:9,y:2}, RI:{n:"Rhode Island",x:10,y:2},
  OR:{n:"Oregon",x:0,y:3}, ID:{n:"Idaho",x:1,y:3}, WY:{n:"Wyoming",x:2,y:3}, SD:{n:"South Dakota",x:3,y:3}, IA:{n:"Iowa",x:4,y:3}, IL:{n:"Illinois",x:5,y:3}, IN:{n:"Indiana",x:6,y:3}, OH:{n:"Ohio",x:7,y:3}, PA:{n:"Pennsylvania",x:8,y:3}, NJ:{n:"New Jersey",x:9,y:3}, CT:{n:"Connecticut",x:10,y:3},
  CA:{n:"California",x:0,y:4}, NV:{n:"Nevada",x:1,y:4}, UT:{n:"Utah",x:2,y:4}, CO:{n:"Colorado",x:3,y:4}, NE:{n:"Nebraska",x:4,y:4}, MO:{n:"Missouri",x:5,y:4}, KY:{n:"Kentucky",x:6,y:4}, WV:{n:"West Virginia",x:7,y:4}, VA:{n:"Virginia",x:8,y:4}, MD:{n:"Maryland",x:9,y:4}, DE:{n:"Delaware",x:10,y:4},
  AZ:{n:"Arizona",x:2,y:5}, NM:{n:"New Mexico",x:3,y:5}, KS:{n:"Kansas",x:4,y:5}, AR:{n:"Arkansas",x:5,y:5}, TN:{n:"Tennessee",x:6,y:5}, NC:{n:"North Carolina",x:7,y:5}, SC:{n:"South Carolina",x:8,y:5}, DC:{n:"District of Columbia",x:9,y:5},
  OK:{n:"Oklahoma",x:4,y:6}, LA:{n:"Louisiana",x:5,y:6}, MS:{n:"Mississippi",x:6,y:6}, AL:{n:"Alabama",x:7,y:6}, GA:{n:"Georgia",x:8,y:6},
  HI:{n:"Hawaii",x:0,y:7}, TX:{n:"Texas",x:3,y:7}, FL:{n:"Florida",x:8,y:7},
};
// GeoJSON ADMIN name (normalized) -> data country name (normalized)
const ALIAS = {
  "united states of america": "united states", "russian federation": "russia",
  "czech republic": "czechia", "republic of korea": "south korea",
  "republic of serbia": "serbia", "macedonia": "north macedonia",
  "united republic of tanzania": "tanzania", "the netherlands": "netherlands",
  "swaziland": "eswatini",
};
// Countries with official Google Street View (Natural Earth ADMIN spellings).
const COVERAGE = ["Albania","Austria","Belarus","Belgium","Bulgaria","Croatia","Cyprus","Czechia","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Iceland","Ireland","Italy","Latvia","Lithuania","Luxembourg","Macedonia","Montenegro","Netherlands","Norway","Poland","Portugal","Republic of Serbia","Romania","Russia","Slovakia","Slovenia","Spain","Sweden","Switzerland","Ukraine","United Kingdom","United States of America","Canada","Mexico","Guatemala","Costa Rica","Panama","Colombia","Brazil","Argentina","Chile","Peru","Bolivia","Ecuador","Uruguay","Dominican Republic","Puerto Rico","Greenland","China","Japan","South Korea","Taiwan","Malaysia","Indonesia","Philippines","Thailand","Vietnam","Cambodia","Laos","Bangladesh","Bhutan","Nepal","Sri Lanka","India","Pakistan","Mongolia","Kazakhstan","Kyrgyzstan","Israel","Palestine","Jordan","Lebanon","Iraq","Turkey","United Arab Emirates","Qatar","Oman","South Africa","Swaziland","Lesotho","Botswana","Namibia","Kenya","Uganda","Rwanda","United Republic of Tanzania","Nigeria","Ghana","Senegal","Tunisia","Egypt","Madagascar","Mali","Australia","New Zealand","Vanuatu"];

// ISO 3166-1 alpha-2 code per country/territory name → flag image + internet domain (ccTLD).
const CODE = {
  "Botswana":"bw","Egypt":"eg","Eswatini":"sz","Ghana":"gh","Kenya":"ke","Lesotho":"ls","Madagascar":"mg",
  "Mali":"ml","Namibia":"na","Nigeria":"ng","Reunion":"re","Rwanda":"rw","Senegal":"sn","South Africa":"za",
  "São Tomé and Príncipe":"st","Tanzania":"tz","Tunisia":"tn","Uganda":"ug",
  "Bangladesh":"bd","Bhutan":"bt","British Indian Ocean Territory":"io","Cambodia":"kh","China":"cn","Cyprus":"cy",
  "Hong Kong":"hk","India":"in","Indonesia":"id","Iraq":"iq","Israel & the West Bank":"il","Japan":"jp","Jordan":"jo",
  "Kazakhstan":"kz","Kyrgyzstan":"kg","Laos":"la","Lebanon":"lb","Macau":"mo","Malaysia":"my","Mongolia":"mn",
  "Nepal":"np","Oman":"om","Pakistan":"pk","Philippines":"ph","Qatar":"qa","Singapore":"sg","South Korea":"kr",
  "Sri Lanka":"lk","Taiwan":"tw","Thailand":"th","Turkey":"tr","United Arab Emirates":"ae","Vietnam":"vn",
  "Albania":"al","Andorra":"ad","Austria":"at","Azores":"pt","Belarus":"by","Belgium":"be","Bulgaria":"bg",
  "Croatia":"hr","Czechia":"cz","Denmark":"dk","Estonia":"ee","Faroe Islands":"fo","Finland":"fi","France":"fr",
  "Germany":"de","Gibraltar":"gi","Greece":"gr","Hungary":"hu","Iceland":"is","Ireland":"ie","Isle of Man":"im",
  "Italy":"it","Jersey":"je","Latvia":"lv","Liechtenstein":"li","Lithuania":"lt","Luxembourg":"lu","Madeira":"pt",
  "Malta":"mt","Monaco":"mc","Montenegro":"me","Netherlands":"nl","North Macedonia":"mk","Norway":"no","Poland":"pl",
  "Portugal":"pt","Romania":"ro","Russia":"ru","San Marino":"sm","Serbia":"rs","Slovakia":"sk","Slovenia":"si",
  "Spain":"es","Svalbard":"sj","Sweden":"se","Switzerland":"ch","Ukraine":"ua","United Kingdom":"gb",
  "Alaska":"us","Bermuda":"bm","Canada":"ca","Costa Rica":"cr","Dominican Republic":"do","Greenland":"gl",
  "Guatemala":"gt","Hawaii":"us","Martinique":"mq","Mexico":"mx","Panama":"pa","Puerto Rico":"pr",
  "Saint Pierre and Miquelon":"pm","US Minor Outlying Islands":"um","US Virgin Islands":"vi","United States":"us",
  "Argentina":"ar","Bolivia":"bo","Brazil":"br","Chile":"cl","Colombia":"co","Curaçao":"cw","Ecuador":"ec",
  "Falkland Islands":"fk","Peru":"pe","Uruguay":"uy",
  "American Samoa":"as","Australia":"au","Christmas Island":"cx","Cocos Islands":"cc","Guam":"gu","New Zealand":"nz",
  "Northern Mariana Islands":"mp","Pitcairn Islands":"pn","Vanuatu":"vu",
  "Antarctica":"aq","South Georgia & Sandwich Islands":"gs",
};
const flagUrl = (name, w) => { const c = CODE[name]; return c ? `https://flagcdn.com/${w || "w40"}/${c}.png` : null; };
const domainFor = (name) => { const c = CODE[name]; return c ? "." + (c === "gb" ? "uk" : c) : ""; };

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/^the\s+/, "").replace(/&/g, "and").replace(/[^a-z ]/g, "").trim();

const CODE_BY_NORM = {}; Object.keys(CODE).forEach(k => { CODE_BY_NORM[norm(k)] = CODE[k]; });
const domainByCode = (c) => c ? "." + (c === "gb" ? "uk" : c) : "";
// Common short forms used in clue text → flag code (proper full names come from CODE).
const FLAG_ALIAS = { "USA": "us", "US": "us", "UK": "gb", "UAE": "ae", "Israel": "il", "Holland": "nl", "Czech": "cz" };
let FLAG_RE = null;
// Put a small flag before every country name mentioned in a clue string (post-mdBold HTML).
function flagify(html) {
  if (FLAG_RE === null) {
    const names = Object.keys(CODE).concat(Object.keys(FLAG_ALIAS)).sort((a, b) => b.length - a.length);
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    FLAG_RE = new RegExp("\\b(" + names.map(esc).join("|") + ")\\b", "g");
  }
  return html.replace(FLAG_RE, (m, name) => {
    const c = CODE[name] || FLAG_ALIAS[name];
    return c ? `<img class="tflag" src="https://flagcdn.com/w20/${c}.png" alt="">${name}` : m;
  });
}

let DATA = null, byNorm = {}, bySlug = {}, features = [], world = null, selected = null;
let hovered = null, globe = null, covMap = null, covBase = null, covOverlay = null;
const covSet = new Set(COVERAGE.map(norm));
function loadView() { try { return localStorage.getItem("geohint-view") === "gallery" ? "gallery" : "pills"; } catch (e) { return "pills"; } }
function saveView(v) { try { localStorage.setItem("geohint-view", v); } catch (e) {} }
const state = { cats: new Set(CAT_ORDER), srcs: new Set(Object.keys(SRC_NAME)), types: new Set(), q: "", superOnly: false, view: loadView() };

const featName = (f) => f.properties.ADMIN || f.properties.NAME || f.properties.name;
const dataForName = (name) => { const n = norm(name); return byNorm[ALIAS[n] || n] || null; };
const hasCoverage = (f) => covSet.has(norm(featName(f))) || !!dataForName(featName(f));
// Flag/domain code for a globe feature (resolve GeoJSON ADMIN spelling → our code).
function flagCodeForFeat(f) {
  const d = dataForName(featName(f));
  if (d && CODE[d.name]) return CODE[d.name];
  const nn = norm(featName(f));
  return CODE_BY_NORM[nn] || CODE_BY_NORM[norm(ALIAS[nn] || "")] || null;
}

function bounds(feature) {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const eat = (ring) => ring.forEach(([lng, lat]) => {
    if (lng < minX) minX = lng; if (lng > maxX) maxX = lng;
    if (lat < minY) minY = lat; if (lat > maxY) maxY = lat;
  });
  const g = feature.geometry;
  (g.type === "Polygon" ? [g.coordinates] : g.coordinates).forEach(p => eat(p[0]));
  return [[minY, minX], [maxY, maxX]];
}
function centroid(feature) { const b = bounds(feature); return { lat: (b[0][0] + b[1][0]) / 2, lng: (b[0][1] + b[1][1]) / 2 }; }
const featureFor = (d) => features.find(f => { const dd = dataForName(featName(f)); return dd && dd.name === d.name; });

async function init() {
  [DATA, world] = await Promise.all([
    fetch("countries.json", { cache: "no-cache" }).then(r => r.json()),
    fetch(GEOJSON_URL).then(r => r.json()),
  ]);
  DATA.countries.forEach(c => { byNorm[norm(c.name)] = c; if (c.slug) bySlug[c.slug] = c; });
  features = world.features.filter(f => norm(featName(f)) !== "antarctica");
  const covCount = features.filter(hasCoverage).length;
  document.getElementById("prog").innerHTML =
    `<b>${DATA.counts.done}</b> countries with hints · ${covCount} with official coverage`;
  buildGlobe(); buildList(); wireUI();
  window.addEventListener("hashchange", openByHash);
  openByHash();  // restore country from the URL hash on load/reload
}
// URL hash routing: #<slug> opens that country; empty hash closes the detail.
function openByHash() {
  const slug = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  if (!slug) { if (selected) closeDetail(); return; }
  const d = bySlug[slug];
  if (d && (!selected || selected.slug !== slug)) openCountry(d, true);
}
function closeDetail() {
  document.getElementById("detail").classList.remove("open");
  document.querySelectorAll(".c-item.sel").forEach(e => e.classList.remove("sel"));
  if (globe) globe.controls().autoRotate = true;
  selected = null;
}

function buildGlobe() {
  globe = Globe()(document.getElementById("globe"))
    .globeImageUrl("earth-dark.jpg").bumpImageUrl("earth-topology.png")
    .backgroundColor("#070b14")
    .showAtmosphere(true).atmosphereColor("#2b6f8f").atmosphereAltitude(0.16)
    .polygonsData(features)
    .polygonCapColor(f => hasCoverage(f) ? "#39b39b" : "#2a3550")
    .polygonSideColor(() => "rgba(10,17,32,0.55)")
    .polygonStrokeColor(f => dataForName(featName(f)) ? "#a9f0e4" : "rgba(0,0,0,0.35)")
    .polygonAltitude(f => dataForName(featName(f)) ? 0.05 : (hasCoverage(f) ? 0.02 : 0.008))
    .polygonLabel(f => {
      const d = dataForName(featName(f));
      const c = flagCodeForFeat(f);
      const flag = c ? `<img src="https://flagcdn.com/w20/${c}.png" alt="" style="width:20px;height:14px;object-fit:cover;border-radius:2px;vertical-align:-2px;margin-right:7px;box-shadow:0 0 0 1px rgba(0,0,0,.4)">` : "";
      const dom = c ? `<span style="color:#9ab;font-weight:400;margin-left:6px">${domainByCode(c)}</span>` : "";
      return `<div style="font:600 13px sans-serif;color:#fff">${flag}${featName(f)}${dom}</div>` +
        `<div style="font:12px sans-serif;color:${hasCoverage(f) ? "#7fe" : "#9ab"}">` +
        `${hasCoverage(f) ? "official coverage" : "no coverage"}${d ? " · " + d.hints.length + " hints (click)" : ""}</div>`;
    })
    .onPolygonHover(h => {
      hovered = h;
      globe.polygonAltitude(f => f === h ? 0.07 : (dataForName(featName(f)) ? 0.05 : (hasCoverage(f) ? 0.02 : 0.008)));
    })
    .onPolygonClick(f => { const d = dataForName(featName(f)); if (d) openCountry(d); });
  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.32;
  // select on mousedown (uses live hover state) — more reliable than click/mouseup
  const canvas = document.querySelector("#globe canvas");
  canvas.addEventListener("pointerdown", () => {
    if (hovered) { const d = dataForName(featName(hovered)); if (d) openCountry(d); }
  });
  window.addEventListener("resize", () => globe.width(window.innerWidth).height(window.innerHeight));
}

function buildList() {
  const list = document.getElementById("list"); list.innerHTML = "";
  DATA.continent_order.forEach(cont => {
    const names = DATA.master[cont] || []; if (!names.length) return;
    const withData = DATA.countries.filter(c => c.continent === cont)
      .sort((a, b) => (b.area_km2 || 0) - (a.area_km2 || 0));
    const h = document.createElement("div"); h.className = "cont-h"; h.textContent = cont; list.appendChild(h);
    const doneNames = new Set(withData.map(c => c.name));
    withData.forEach(c => list.appendChild(itemEl(c.name, c)));
    names.filter(n => !doneNames.has(n)).forEach(n => list.appendChild(itemEl(n, null)));
  });
}
// Established shorthands → data country name (sidebar search). ccTLDs are matched
// separately via CODE/domainFor, so 2-letter codes don't need to be listed here.
const SEARCH_ALIAS = {
  "uk": "United Kingdom", "gb": "United Kingdom", "britain": "United Kingdom",
  "great britain": "United Kingdom", "england": "United Kingdom", "scotland": "United Kingdom",
  "wales": "United Kingdom", "northern ireland": "United Kingdom",
  "usa": "United States", "america": "United States", "the states": "United States",
  "uae": "United Arab Emirates", "emirates": "United Arab Emirates",
  "nz": "New Zealand", "holland": "Netherlands", "czech republic": "Czechia",
  "korea": "South Korea", "israel": "Israel & the West Bank",
  "palestine": "Israel & the West Bank", "west bank": "Israel & the West Bank",
  "sao tome": "São Tomé and Príncipe", "dr": "Dominican Republic",
};
function itemEl(name, data) {
  const el = document.createElement("div");
  const cov = covSet.has(norm(name)) || !!data;
  el.className = "c-item" + (data ? " has" : "") + (cov ? " cov" : "");
  el.dataset.name = name.toLowerCase();
  el.dataset.search = norm(name); // diacritics-insensitive haystack (São Tomé → sao tome)
  el.dataset.domain = (domainFor(name) || "").replace(".", ""); // "de", "uk", …
  el.dataset.alias = Object.keys(SEARCH_ALIAS).filter(k => SEARCH_ALIAS[k] === name).join("|");
  const fu = flagUrl(name, "w40");
  el.innerHTML = `<span class="dot"></span>`
    + (fu ? `<img class="flag" src="${fu}" alt="" onerror="this.style.visibility='hidden'">` : `<span class="flag"></span>`)
    + `<span class="n">${name}<span class="dommark"></span></span>` + (data ? `<span class="cnt">${data.hints.length}</span>` : "");
  if (data) el.onclick = () => { openCountry(data); flyTo(data); };
  return el;
}
function flyTo(d) {
  const f = featureFor(d); if (!f) return;
  const c = centroid(f); globe.controls().autoRotate = false;
  globe.pointOfView({ lat: c.lat, lng: c.lng, altitude: 1.7 }, 700);
}

/* ---------- full-screen country detail ---------- */
function openCountry(d, fromHash) {
  selected = d;
  if (!fromHash && d.slug && location.hash.replace(/^#\/?/, "") !== d.slug) location.hash = d.slug;
  globe.controls().autoRotate = false;
  document.querySelectorAll(".c-item.sel").forEach(e => e.classList.remove("sel"));
  const li = [...document.querySelectorAll(".c-item")].find(e => e.dataset.name === d.name.toLowerCase());
  if (li) li.classList.add("sel");

  document.getElementById("d-name").textContent = d.name;
  const dflag = document.getElementById("d-flag"), dfu = flagUrl(d.name, "w160");
  if (dfu) { dflag.src = dfu; dflag.style.display = ""; } else { dflag.style.display = "none"; }
  const dom = document.getElementById("d-domain"), domTxt = domainFor(d.name);
  dom.textContent = domTxt; dom.style.display = domTxt ? "" : "none";
  const bySrc = {}; d.hints.forEach(h => (h.src || []).forEach(s => bySrc[s] = (bySrc[s] || 0) + 1));
  document.getElementById("d-sub").innerHTML =
    `${d.continent} · ${d.hints.length} clues · sources: ` +
    Object.keys(bySrc).map(s => `${SRC_NAME[s] || s} (${bySrc[s]})`).join(", ");

  const act = document.getElementById("d-actions"); act.innerHTML = "";
  act.appendChild(mkBtn("gg", (d.links && d.links.geoguessr) || ("https://www.geoguessr.com/maps/community?query=" + encodeURIComponent(d.name)), "▶ Practice on GeoGuessr"));
  if (d.links && d.links.plonkit) act.appendChild(mkBtn("pk", d.links.plonkit, "Plonk It ↗"));
  act.appendChild(shareBtn(d));

  state.q = ""; state.superOnly = false; document.getElementById("d-search").value = "";
  buildFilters();
  renderHints();
  document.getElementById("detail").classList.add("open");
}
function mkBtn(cls, href, text) { const a = document.createElement("a"); a.className = "btn " + cls; a.href = href; a.target = "_blank"; a.rel = "noopener"; a.textContent = text; return a; }
// Copies the country's share URL (/c/<slug>/ — a static page with per-country OG preview
// tags that redirects into the app). The bare /#<slug> URL can't carry a country preview:
// crawlers never see the hash.
function shareBtn(d) {
  const b = document.createElement("button");
  b.className = "btn share"; b.type = "button"; b.textContent = "🔗 Share";
  b.title = "Copy a shareable link — previews with flag + top clues in WhatsApp/Discord/…";
  b.onclick = () => {
    const url = new URL(`c/${d.slug}/`, location.href).href;
    const done = () => { b.textContent = "✓ Link copied"; setTimeout(() => { b.textContent = "🔗 Share"; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(url).then(done, () => prompt("Copy this link:", url));
    else prompt("Copy this link:", url);
  };
  return b;
}

function buildFilters() {
  // "Key clues" toggle — only shown when the country has region-pinpointing super clues
  const fk = document.getElementById("f-super"); fk.innerHTML = "";
  const hasSuper = selected.hints.some(isSuper);
  fk.style.display = hasSuper ? "" : "none";
  if (hasSuper) {
    const c = document.createElement("span");
    c.className = "chip key" + (state.superOnly ? " on" : "");
    c.textContent = "⭐ Key clues";
    c.title = "Show only the highest-value clues that pinpoint a region fast";
    c.onclick = () => { state.superOnly = !state.superOnly; c.classList.toggle("on"); renderHints(); };
    fk.appendChild(c);
  }
  const fc = document.getElementById("f-cats"); fc.innerHTML = "";
  CAT_ORDER.forEach(k => {
    if (!selected.hints.some(h => h.cat === k)) return;
    const c = document.createElement("span");
    c.className = "chip" + (state.cats.has(k) ? " on" : ""); c.dataset.k = k;
    c.textContent = k[0].toUpperCase() + k.slice(1); c.title = CAT_DESC[k];
    c.onclick = () => { state.cats.has(k) ? state.cats.delete(k) : state.cats.add(k); c.classList.toggle("on"); renderHints(); };
    fc.appendChild(c);
  });
  const fs = document.getElementById("f-srcs"); fs.innerHTML = "";
  const present = new Set(); selected.hints.forEach(h => (h.src || []).forEach(s => present.add(s)));
  [...present].forEach(s => {
    const c = document.createElement("span");
    c.className = "chip src" + (state.srcs.has(s) ? " on" : "");
    c.textContent = SRC_NAME[s] || s;
    c.onclick = () => { state.srcs.has(s) ? state.srcs.delete(s) : state.srcs.add(s); c.classList.toggle("on"); renderHints(); };
    fs.appendChild(c);
  });
  const seps = document.querySelectorAll(".d-filterbar .f-label.sep");
  seps[0].style.display = present.size > 1 ? "" : "none";
  fs.style.display = present.size > 1 ? "" : "none";

  // type chips (what kind of clue) — all on by default
  const ft = document.getElementById("f-types"); ft.innerHTML = "";
  const types = [...new Set(selected.hints.map(guessType))];
  state.types = new Set(types);
  types.forEach(t => {
    const tm = TYPE_META[t] || TYPE_META.general;
    const c = document.createElement("span");
    c.className = "chip ty on"; c.dataset.t = t; c.style.setProperty("--tc", tm.color);
    c.innerHTML = `<i style="background:${tm.color}"></i>${tm.label}`;
    c.onclick = () => { state.types.has(t) ? state.types.delete(t) : state.types.add(t); c.classList.toggle("on"); renderHints(); };
    ft.appendChild(c);
  });
  const showTypes = types.length > 1;
  seps[1].style.display = showTypes ? "" : "none";
  ft.style.display = showTypes ? "" : "none";
}
const mdBold = (s) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");
function srcRefs(h, opt) {
  return (h.src || []).filter(s => !(opt && opt.noPlonkit && s === "plonkit")).map(s => {
    let u;
    if (s === "plonkit") { u = (selected.links && selected.links.plonkit) || ""; if (u && h.anchor) u += "#" + h.anchor; }
    else u = h.src_url || SRC_URL[s];
    return u ? `<a href="${u}" target="_blank" rel="noopener">${SRC_NAME[s] || s}</a>` : (SRC_NAME[s] || s);
  }).join(" · ");
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);
function renderHints() {
  const body = document.getElementById("d-body"); body.innerHTML = "";
  let total = 0;
  CAT_ORDER.forEach(cat => {
    if (!state.cats.has(cat)) return;
    const hints = selected.hints.filter(h => h.cat === cat)
      .filter(h => !state.superOnly || isSuper(h))
      .filter(h => (h.src || []).some(s => state.srcs.has(s)))
      .filter(h => state.types.has(guessType(h)))
      .filter(h => !state.q || h.text.toLowerCase().includes(state.q))
      // group same-kind clues together (plates, then signs, …) — keeps long pages scannable
      .sort((a, b) => TYPE_ORDER.indexOf(guessType(a)) - TYPE_ORDER.indexOf(guessType(b)));
    if (!hints.length) return;
    total += hints.length;
    const sec = document.createElement("div"); sec.className = "sec"; sec.dataset.cat = cat;
    const head = document.createElement("div"); head.className = "sec-h";
    head.innerHTML = `<span class="bar"></span><span class="c">${cap(cat)}</span><span class="desc">— ${CAT_DESC[cat]}</span>`;
    if (cat === "state" && SHIELDS[selected.name]) {
      const sh = SHIELDS[selected.name];
      const b = document.createElement("button"); b.className = "hbtn"; b.textContent = "🛡 Highway shields";
      b.onclick = () => openImg(sh.title, sh.img, sh.cap, sh.credit);
      head.appendChild(b);
    }
    sec.appendChild(head);
    // USA "state" clues: interactive tile map + state list instead of pills
    if (cat === "state" && selected.slug === "usa") { renderUsStateMap(hints, sec); body.appendChild(sec); return; }
    // group by `area` (state/province name) into sub-sections when present
    const areas = [...new Set(hints.map(h => h.area).filter(Boolean))].sort();
    if (areas.length) {
      const noArea = hints.filter(h => !h.area);
      if (noArea.length) sec.appendChild(subSec(null, noArea, cat));
      areas.forEach(a => sec.appendChild(subSec(a, hints.filter(h => h.area === a), cat)));
    } else {
      sec.appendChild(cardsEl(hints));
    }
    body.appendChild(sec);
  });
  if (!total) body.innerHTML = `<div class="empty">No clues match the current filters.</div>`;
  if (selected.videos && selected.videos.length) body.prepend(videoSec());
}
// Video section: official GeoGuessr YouTube channel tips for this country. Thumbnails only
// (facade) — the real player iframe is injected on click, so opening a country stays light.
function videoSec() {
  const sec = document.createElement("div"); sec.className = "sec vids";
  const head = document.createElement("div"); head.className = "sec-h";
  head.innerHTML = `<span class="bar"></span><span class="c">Videos</span>` +
    `<span class="desc">— country tips from the official GeoGuessr YouTube channel</span>`;
  sec.appendChild(head);
  const row = document.createElement("div"); row.className = "vidrow";
  selected.videos.forEach(v => {
    const card = document.createElement("div"); card.className = "vid" + (v.short ? " short" : "");
    const ph = document.createElement("div"); ph.className = "vid-ph"; ph.title = "Play video";
    // Shorts have a portrait thumb (oar2); fall back to the 16:9 hqdefault if missing.
    const thumb = v.short ? `https://i.ytimg.com/vi/${v.id}/oar2.jpg` : `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
    ph.innerHTML = `<img src="${thumb}" alt="" loading="lazy" draggable="false"` +
      (v.short ? ` onerror="this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'"` : "") +
      `><span class="vid-play">▶</span>`;
    ph.onclick = () => {
      const wrap = document.createElement("div"); wrap.className = "vid-frame";
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`;
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      f.allowFullscreen = true; f.title = v.title;
      wrap.appendChild(f);
      // YouTube's Shorts embed UI (phone-style chrome) ships with no fullscreen button of its own,
      // so we add one here. It fullscreens the WRAPPER (not the iframe itself) so the button stays
      // inside the fullscreen element and can toggle back out again.
      if (v.short) {
        const fs = document.createElement("button");
        fs.type = "button"; fs.className = "vid-fs"; fs.title = "Fullscreen"; fs.textContent = "⛶";
        const syncFsBtn = () => {
          const isFs = document.fullscreenElement === wrap || document.webkitFullscreenElement === wrap;
          fs.textContent = isFs ? "✕" : "⛶";
          fs.title = isFs ? "Exit fullscreen" : "Fullscreen";
        };
        fs.onclick = (e) => {
          e.stopPropagation();
          if (document.fullscreenElement === wrap || document.webkitFullscreenElement === wrap) {
            const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
            if (exit) exit.call(document);
          } else {
            const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen || wrap.msRequestFullscreen;
            if (req) req.call(wrap);
          }
        };
        document.addEventListener("fullscreenchange", syncFsBtn);
        document.addEventListener("webkitfullscreenchange", syncFsBtn);
        wrap.appendChild(fs);
      }
      ph.replaceWith(wrap);
    };
    const cap = document.createElement("div"); cap.className = "vid-cap";
    cap.innerHTML = (v.short ? `<span class="vid-tag">Short</span>` : "") +
      `<span class="vid-t">${v.title}</span>` +
      `<a class="vid-yt" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener" title="Open on YouTube">YouTube ↗</a>`;
    card.appendChild(ph); card.appendChild(cap);
    row.appendChild(card);
  });
  sec.appendChild(row);
  return sec;
}
// USA state-clue view: SVG tile-grid map + scrollable state list; click a state to see its clues.
function renderUsStateMap(hints, sec) {
  const byState = {};
  hints.filter(h => h.area).forEach(h => (byState[h.area] = byState[h.area] || []).push(h));
  const general = hints.filter(h => !h.area);
  const NS = "http://www.w3.org/2000/svg", U = 42, G = 4, cols = 11, rows = 8;
  const wrap = document.createElement("div"); wrap.className = "usmap";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "ustiles"); svg.setAttribute("viewBox", `0 0 ${cols * U} ${rows * U}`);
  const list = document.createElement("div"); list.className = "usmap-list";
  const panel = document.createElement("div"); panel.className = "usmap-panel";

  const clearSel = () => wrap.querySelectorAll(".tile.sel, .usmap-list .li.sel").forEach(e => e.classList.remove("sel"));
  const showState = (name) => {
    clearSel();
    svg.querySelectorAll(`[data-state="${CSS.escape(name)}"]`).forEach(e => e.classList.add("sel"));
    list.querySelectorAll(`[data-state="${CSS.escape(name)}"]`).forEach(e => e.classList.add("sel"));
    panel.innerHTML = "";
    const h = document.createElement("div"); h.className = "usmap-h";
    h.textContent = `${name} · ${byState[name].length} clue${byState[name].length > 1 ? "s" : ""}`;
    panel.appendChild(h); panel.appendChild(cardsEl(byState[name]));
    panel.scrollIntoView({ block: "nearest" });
  };
  const showGeneral = () => {
    clearSel(); panel.innerHTML = "";
    if (general.length) {
      const h = document.createElement("div"); h.className = "usmap-h"; h.textContent = "US-wide state clues";
      panel.appendChild(h); panel.appendChild(cardsEl(general));
    } else panel.innerHTML = `<div class="usmap-hint">Pick a state on the map or list to see its clues.</div>`;
  };

  Object.entries(US_TILES).forEach(([ab, t]) => {
    const has = !!byState[t.n];
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "tile" + (has ? " has" : ""));
    if (has) { g.setAttribute("data-state", t.n); g.addEventListener("click", () => showState(t.n)); }
    const rect = document.createElementNS(NS, "rect");
    rect.setAttribute("x", t.x * U + G / 2); rect.setAttribute("y", t.y * U + G / 2);
    rect.setAttribute("width", U - G); rect.setAttribute("height", U - G); rect.setAttribute("rx", 5);
    const txt = document.createElementNS(NS, "text");
    txt.setAttribute("x", t.x * U + U / 2); txt.setAttribute("y", t.y * U + U / 2);
    txt.setAttribute("text-anchor", "middle"); txt.setAttribute("dominant-baseline", "central");
    txt.textContent = ab;
    g.appendChild(rect); g.appendChild(txt); svg.appendChild(g);
  });
  Object.values(US_TILES).map(t => t.n).sort().forEach(name => {
    const has = !!byState[name];
    const li = document.createElement("div"); li.className = "li" + (has ? " has" : "");
    if (has) { li.dataset.state = name; li.addEventListener("click", () => showState(name)); }
    li.innerHTML = `<span class="nm">${name}</span>` + (has ? `<span class="cnt">${byState[name].length}</span>` : "");
    list.appendChild(li);
  });
  wrap.appendChild(svg); wrap.appendChild(list);
  sec.appendChild(wrap); sec.appendChild(panel);
  showGeneral();
}
function subSec(area, hints, cat) {
  const wrap = document.createElement("div"); wrap.className = "subsec";
  if (area) {
    const h = document.createElement("div"); h.className = "subsec-h";
    h.style.color = `var(--${cat})`; h.textContent = area;
    wrap.appendChild(h);
  }
  wrap.appendChild(cardsEl(hints));
  return wrap;
}
function cardsEl(hints) {
  const cards = document.createElement("div"); cards.className = "cards" + (state.view === "gallery" ? " gallery" : "");
  hints.forEach(h => cards.appendChild(cardEl(h)));
  return cards;
}
// Resolve a hint's image. Bare filename -> Plonk It image server (folder = plonkit link
// slug). Full http(s) URL or local "img/…" path pass through unchanged.
// A hint may carry one `img` (string) and/or several `imgs` (array); return the full list.
function imgList(h) {
  const a = [];
  if (Array.isArray(h.imgs)) a.push(...h.imgs);
  if (h.img) a.push(h.img);
  return [...new Set(a)];
}
function imgUrlFor(file, w) {
  if (/^(https?:)?\/\//.test(file) || /^img\//.test(file)) return file;
  // Plonk It's image folder can differ from the page slug (e.g. link /usa but folder
  // /united-states) — prefer an explicit img_folder, else derive from the plonkit link.
  const link = (selected.links && selected.links.plonkit) || "";
  const folder = selected.img_folder ||
    link.replace(/^https?:\/\/(www\.)?plonkit\.net\//i, "").replace(/\/.*$/, "") || selected.slug;
  return `https://www.plonkit.net/images/resize/${w || 900}/80/${folder}/${encodeURIComponent(file)}`;
}
function imgUrl(h, w) { const l = imgList(h); return l.length ? imgUrlFor(l[0], w) : null; }
// Resolve an image file against ANOTHER country's Plonk It folder (for uniq-dialog images).
function imgUrlForSlug(slug, file, w) {
  if (/^(https?:)?\/\//.test(file) || /^img\//.test(file)) return file;
  const c = DATA.countries.find(x => x.slug === slug);
  if (!c) return null;
  const link = (c.links && c.links.plonkit) || "";
  const folder = c.img_folder ||
    link.replace(/^https?:\/\/(www\.)?plonkit\.net\//i, "").replace(/\/.*$/, "") || c.slug;
  return `https://www.plonkit.net/images/resize/${w || 900}/80/${folder}/${encodeURIComponent(file)}`;
}

/* ---------- uniqueness badges + dialog (v4) ----------
   h.uniq: "unique" | "unique*" | "shared" | absent (= country-specific info, no badge).
   unique* carries h.uniq_note (caveat). shared carries h.shared_with:
   [{slug, note, diff?, img?}] — all rendered in the uniq dialog, linked in-site. */
function uniqBadgeHTML(h) {
  if (!h.uniq) return "";
  const scope = { country: "Country", region: "Region", state: "State", city: "City", special: "Country" }[h.cat] || "Country";
  if (h.uniq === "unique")
    return `<span class="uniq u">✦ ${scope} unique</span>`;
  if (h.uniq === "unique*")
    return `<span class="uniq u clickable" title="${(h.uniq_note || "").replace(/"/g, "&quot;")}">✦ ${scope} unique&nbsp;<b class="ast">*</b></span>`;
  return `<span class="uniq s clickable" title="Also found elsewhere — click for the list & how to tell apart">⚠ Not unique</span>`;
}
function openUniq(h) {
  const m = document.getElementById("uniqModal");
  document.getElementById("uniq-title").textContent =
    h.uniq === "unique*" ? "Unique — with a caveat" : "Not unique — also seen in…";
  document.getElementById("uniq-quote").innerHTML = flagify(mdBold(h.text));
  const body = document.getElementById("uniq-body"); body.innerHTML = "";
  if (h.uniq === "unique*") {
    const p = document.createElement("div"); p.className = "uq-note";
    p.innerHTML = flagify(mdBold(h.uniq_note || ""));
    body.appendChild(p);
  }
  (h.shared_with || []).forEach(s => {
    const c = DATA.countries.find(x => x.slug === s.slug);
    const name = c ? c.name : s.slug;
    const row = document.createElement("div"); row.className = "uq-row";
    const fu = c ? flagUrl(c.name, "w40") : null;
    row.innerHTML =
      `<a class="uq-head" href="#${s.slug}">` +
        (fu ? `<img class="flag" src="${fu}" alt="">` : "") +
        `<span class="nm">${name}</span><span class="go">open page →</span></a>` +
      `<div class="uq-note">${flagify(mdBold(s.note || ""))}</div>` +
      (s.diff ? `<div class="uq-diff"><b>How to tell apart:</b> ${flagify(mdBold(s.diff))}</div>` : "");
    const files = s.imgs || (s.img ? [s.img] : []);
    if (files.length) {
      const iw = document.createElement("div"); iw.className = "uq-imgs";
      files.forEach(f => {
        const u = imgUrlForSlug(s.slug, f, 600);
        if (u) iw.innerHTML += `<img src="${u}" alt="" loading="lazy" onerror="this.style.display='none'">`;
      });
      row.appendChild(iw);
    }
    row.querySelector(".uq-head").onclick = () => m.classList.remove("open"); // hash routing opens the country
    body.appendChild(row);
  });
  m.classList.add("open");
}
function cardEl(h) {
  const ty = guessType(h); const tm = TYPE_META[ty] || TYPE_META.general;
  const card = document.createElement("div"); card.className = "card" + (isSuper(h) ? " super" : "");
  // Card meta omits the Plonk It link (redundant — already in the header button + image dialog).
  const svRef = h.sv ? `<a href="${h.sv}" target="_blank" rel="noopener">Street View ↗</a>` : "";
  const meta = [srcRefs(h, { noPlonkit: true }), svRef].filter(Boolean).join(" · ");
  const imgs = imgList(h);
  const gallery = state.view === "gallery" && imgs.length > 0;
  const gimgHTML = gallery ? imgs.map(f =>
    `<div class="gimg" data-file="${encodeURIComponent(f)}"><img src="${imgUrlFor(f, 600)}" alt="" draggable="false" onerror="this.closest('.gimg').style.display='none'"><div class="gimg-zoom"></div><div class="zoom-hint">🔍 click to toggle hover-zoom</div></div>`).join("") : "";
  card.innerHTML =
    gimgHTML +
    `<div class="body">` +
      (isSuper(h) ? `<div class="keytag">⭐ Key regional clue</div>` : "") +
      `<div class="type"><i style="background:${tm.color}"></i>${tm.label}${uniqBadgeHTML(h)}</div>` +
      `<div class="t">${flagify(mdBold(h.text))}</div>` +
      (h.bullets && h.bullets.length ? `<ul class="blist">${h.bullets.map(b => `<li>${flagify(mdBold(b))}</li>`).join("")}</ul>` : "") +
      (meta ? `<div class="m">${meta}</div>` : "") +
    `</div>`;
  const ub = card.querySelector(".uniq.clickable");
  if (ub) ub.onclick = (e) => { e.stopPropagation(); openUniq(h); };
  const body = card.querySelector(".body");
  const openBtn = (label) => {
    const b = document.createElement("button"); b.className = "imgbtn"; b.textContent = label;
    b.onclick = () => openImg(selected.name + " — " + tm.label, imgs.map(f => imgUrlFor(f, 900)), h.text, "Source: " + srcRefs(h));
    return b;
  };
  const srcBtn = (cls) => {
    const sb = document.createElement("button"); sb.className = cls; sb.type = "button";
    sb.innerHTML = "🔗 src"; sb.title = "Where to verify this clue";
    sb.onclick = (e) => { e.stopPropagation(); openSources(h); };
    return sb;
  };
  if (gallery) {
    // gallery: put the actions in a footer row (off the image) — open-in-dialog + src at bottom
    const row = document.createElement("div"); row.className = "card-actions";
    row.appendChild(openBtn(imgs.length > 1 ? `🔍 Open ${imgs.length}` : "🔍 Open"));
    if (h.src && h.src.length) row.appendChild(srcBtn("srcbtn inline"));
    body.appendChild(row);
  } else {
    if (imgs.length) body.appendChild(openBtn(imgs.length > 1 ? `📷 ${imgs.length} images` : "📷 Show image"));
    if (h.src && h.src.length) card.appendChild(srcBtn("srcbtn"));  // absolute top-right (no image there)
  }
  if (gallery) wireGalleryImgs(card);
  return card;
}
// Inline (gallery-mode) click-to-toggle hover-zoom for every image in the card. Hi-res
// original loads lazily on first enable so gallery entry stays light.
function wireGalleryImgs(card) {
  card.querySelectorAll(".gimg").forEach(gi => {
    const file = decodeURIComponent(gi.dataset.file || "");
    const zoom = gi.querySelector(".gimg-zoom"); let bgReady = false;
    const ensureBg = () => {
      if (bgReady) return; bgReady = true;
      zoom.style.backgroundImage = `url("${imgUrlFor(file, 600)}")`; zoom.style.backgroundSize = (IMG_ZOOM * 100) + "%";
      const hi = hiRes(imgUrlFor(file, 900)); const pre = new Image();
      pre.onload = () => { zoom.style.backgroundImage = `url("${hi}")`; }; pre.src = hi;
    };
    gi.classList.add("zoomable");
    gi.addEventListener("mousemove", e => {
      const r = gi.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      zoom.style.backgroundPosition = `${px * 100}% ${py * 100}%`;
    });
    gi.addEventListener("click", () => { ensureBg(); gi.classList.toggle("zoom-on"); });
  });
}

/* ---------- coverage modal (Leaflet + Google svv tiles) ---------- */
function ensureCovMap() {
  if (covMap) return;
  covMap = L.map("covmap", { worldCopyJump: true, minZoom: 1 }).setView([20, 0], 2);
  covBase = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    { subdomains: "abcd", maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(covMap);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
    { subdomains: "abcd", maxZoom: 19, pane: "shadowPane", opacity: 0.9 }).addTo(covMap);
  covOverlay = L.tileLayer("https://mts{s}.googleapis.com/vt?lyrs=svv&style=40,18&x={x}&y={y}&z={z}",
    { subdomains: "0123", maxZoom: 17, opacity: 0.95, className: "svv" }).addTo(covMap);
}
function openCoverage(d) {
  const cfu = d ? flagUrl(d.name, "w40") : null;
  document.getElementById("cov-title").innerHTML =
    (cfu ? `<img class="flag" src="${cfu}" alt="">` : "")
    + (d ? "Official Street View coverage — " + d.name : "Official Street View coverage — World");
  document.getElementById("covModal").classList.add("open");
  ensureCovMap();
  setTimeout(() => {
    covMap.invalidateSize();
    if (d) { const f = featureFor(d); if (f) covMap.fitBounds(bounds(f), { padding: [20, 20] }); else covMap.setView([20, 0], 2); }
    else covMap.setView([20, 0], 2);
  }, 60);
}

/* ---------- image dialog (hint images + highway shields) ---------- */
const IMG_ZOOM = 2.8;
// Highest-res source for the hover magnifier: Plonk It resize URL -> original (/images/<folder>/<file>).
function hiRes(url) {
  const m = url.match(/^(https?:\/\/[^/]+)\/images\/resize\/\d+\/\d+\/(.+)$/);
  return m ? `${m[1]}/images/${m[2]}` : url;
}
function openImg(title, images, capText, creditHTML) {
  const urls = Array.isArray(images) ? images : [images];
  document.getElementById("img-title").textContent = title;
  const stages = document.getElementById("img-stages"); stages.innerHTML = "";
  urls.forEach(u => stages.appendChild(buildZoomStage(u)));
  document.getElementById("img-cap").innerHTML =
    (capText ? flagify(mdBold(capText)) : "") + (creditHTML ? `<span class="src">${creditHTML}</span>` : "");
  document.getElementById("imgModal").classList.add("open");
}
// One zoomable image: click to toggle hover-zoom; hi-res original loaded lazily on first enable.
function buildZoomStage(url) {
  const stage = document.createElement("div"); stage.className = "img-stage zoomable";
  stage.innerHTML = `<img alt=""><div class="img-zoom"></div><div class="zoom-hint">🔍 click to toggle hover-zoom</div>`;
  stage.querySelector("img").src = url;
  const zoom = stage.querySelector(".img-zoom"); let bgReady = false;
  const ensureBg = () => {
    if (bgReady) return; bgReady = true;
    zoom.style.backgroundImage = `url("${url}")`; zoom.style.backgroundSize = (IMG_ZOOM * 100) + "%";
    const hi = hiRes(url); if (hi !== url) { const pre = new Image(); pre.onload = () => { zoom.style.backgroundImage = `url("${hi}")`; }; pre.src = hi; }
  };
  stage.addEventListener("mousemove", e => {
    const r = stage.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    zoom.style.backgroundPosition = `${px * 100}% ${py * 100}%`;
  });
  stage.addEventListener("click", () => { ensureBg(); stage.classList.toggle("zoom-on"); });
  return stage;
}

/* ---------- per-clue source dialog ---------- */
const PK_STEP = { country: "Step 1 · Identifying", region: "Step 2 · Regional clues",
  state: "Step 2 · Regional / subdivision clues", city: "Step 3 · Spotlight", special: "Step 3 · Spotlight" };
function openSources(h) {
  const rows = (h.src || []).map(s => {
    let url, sub;
    if (s === "plonkit") { url = (selected.links && selected.links.plonkit) || ""; if (url && h.anchor) url += "#" + h.anchor; sub = selected.name + " guide" + (h.anchor ? " · this clue ↴" : (PK_STEP[h.cat] ? " · " + PK_STEP[h.cat] : "")); }
    else { url = h.src_url || SRC_URL[s] || ""; sub = "Reference"; }
    return `<div class="srcrow"><div class="srcmeta"><span class="srcname">${SRC_NAME[s] || s}</span><span class="srcsub">${sub}</span></div>` +
      (url ? `<a class="srcgo" href="${url}" target="_blank" rel="noopener">Open ↗</a>` : `<span class="srcgo off">no link</span>`) + `</div>`;
  }).join("");
  document.getElementById("src-quote").innerHTML = flagify(mdBold(h.text));
  document.getElementById("src-body").innerHTML = rows || `<div class="srcempty">No source recorded for this clue.</div>`;
  document.getElementById("srcModal").classList.add("open");
}
function syncViewToggle() {
  document.querySelectorAll("#viewtoggle .vt-btn").forEach(b => b.classList.toggle("on", b.dataset.view === state.view));
}
function wireUI() {
  document.getElementById("back").onclick = () => {
    closeDetail();
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  };
  document.getElementById("worldCov").onclick = () => openCoverage(null);
  document.getElementById("covBtn").onclick = () => { if (selected) openCoverage(selected); };
  document.getElementById("img-close").onclick = () => document.getElementById("imgModal").classList.remove("open");
  document.getElementById("imgModal").addEventListener("click", e => { if (e.target.id === "imgModal") document.getElementById("imgModal").classList.remove("open"); });
  document.getElementById("cov-close").onclick = () => document.getElementById("covModal").classList.remove("open");
  document.getElementById("covModal").addEventListener("click", e => { if (e.target.id === "covModal") document.getElementById("covModal").classList.remove("open"); });
  document.getElementById("src-close").onclick = () => document.getElementById("srcModal").classList.remove("open");
  document.getElementById("srcModal").addEventListener("click", e => { if (e.target.id === "srcModal") document.getElementById("srcModal").classList.remove("open"); });
  document.getElementById("uniq-close").onclick = () => document.getElementById("uniqModal").classList.remove("open");
  document.getElementById("uniqModal").addEventListener("click", e => { if (e.target.id === "uniqModal") document.getElementById("uniqModal").classList.remove("open"); });
  document.querySelectorAll("#viewtoggle .vt-btn").forEach(b => {
    b.onclick = () => { state.view = b.dataset.view; saveView(state.view); syncViewToggle(); if (selected) renderHints(); };
  });
  syncViewToggle();
  document.getElementById("d-search").oninput = (e) => { state.q = e.target.value.trim().toLowerCase(); renderHints(); };
  const s = document.getElementById("search");
  s.oninput = () => {
    const raw = s.value.trim().toLowerCase();
    const domOnly = raw.startsWith("."); // ".de" = explicit domain query → domain matches only
    const q = norm(raw);
    const qDom = raw.replace(/^\./, ""); // ".de" and "de" both match the ccTLD
    document.querySelectorAll(".c-item").forEach(el => {
      const byName = !domOnly && q && el.dataset.search.includes(q);
      const byAlias = !domOnly && q && (el.dataset.alias || "").split("|").some(a => a && (a === q || (q.length >= 2 && a.startsWith(q) && a.length <= 4)));
      const byDomain = qDom && el.dataset.domain && el.dataset.domain === qDom;
      el.classList.toggle("hidden", !!raw && !(byName || byAlias || byDomain));
      // show WHY a domain-only match is in the result set: "Germany (.de)"
      const mark = el.querySelector(".dommark");
      if (mark) mark.textContent = raw && byDomain && !byName && !byAlias ? ` (.${el.dataset.domain})` : "";
    });
    document.querySelectorAll(".cont-h").forEach(h => {
      let n = h.nextElementSibling, any = false;
      while (n && !n.classList.contains("cont-h")) { if (!n.classList.contains("hidden")) any = true; n = n.nextElementSibling; }
      h.classList.toggle("hidden", !any);
    });
  };
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    const im = document.getElementById("imgModal"), cm = document.getElementById("covModal"),
      sm = document.getElementById("srcModal"), um = document.getElementById("uniqModal");
    if (um.classList.contains("open")) um.classList.remove("open");
    else if (sm.classList.contains("open")) sm.classList.remove("open");
    else if (im.classList.contains("open")) im.classList.remove("open");
    else if (cm.classList.contains("open")) cm.classList.remove("open");
    else if (document.getElementById("detail").classList.contains("open")) document.getElementById("back").click();
  });
}

init().catch(err => { document.getElementById("prog").textContent = "load error: " + err.message; console.error(err); });

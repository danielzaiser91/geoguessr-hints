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

let DATA = null, byNorm = {}, features = [], world = null, selected = null;
let hovered = null, globe = null, covMap = null, covBase = null, covOverlay = null;
const covSet = new Set(COVERAGE.map(norm));
function loadView() { try { return localStorage.getItem("geohint-view") === "gallery" ? "gallery" : "pills"; } catch (e) { return "pills"; } }
function saveView(v) { try { localStorage.setItem("geohint-view", v); } catch (e) {} }
const state = { cats: new Set(CAT_ORDER), srcs: new Set(Object.keys(SRC_NAME)), types: new Set(), q: "", superOnly: false, view: loadView() };

const featName = (f) => f.properties.ADMIN || f.properties.NAME || f.properties.name;
const dataForName = (name) => { const n = norm(name); return byNorm[ALIAS[n] || n] || null; };
const hasCoverage = (f) => covSet.has(norm(featName(f))) || !!dataForName(featName(f));

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
  DATA.countries.forEach(c => { byNorm[norm(c.name)] = c; });
  features = world.features.filter(f => norm(featName(f)) !== "antarctica");
  const covCount = features.filter(hasCoverage).length;
  document.getElementById("prog").innerHTML =
    `<b>${DATA.counts.done}</b> countries with hints · ${covCount} with official coverage`;
  buildGlobe(); buildList(); wireUI();
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
      return `<div style="font:600 13px sans-serif;color:#fff">${featName(f)}</div>` +
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
function itemEl(name, data) {
  const el = document.createElement("div");
  const cov = covSet.has(norm(name)) || !!data;
  el.className = "c-item" + (data ? " has" : "") + (cov ? " cov" : "");
  el.dataset.name = name.toLowerCase();
  const fu = flagUrl(name, "w40");
  el.innerHTML = `<span class="dot"></span>`
    + (fu ? `<img class="flag" src="${fu}" alt="" onerror="this.style.visibility='hidden'">` : `<span class="flag"></span>`)
    + `<span class="n">${name}</span>` + (data ? `<span class="cnt">${data.hints.length}</span>` : "");
  if (data) el.onclick = () => { openCountry(data); flyTo(data); };
  return el;
}
function flyTo(d) {
  const f = featureFor(d); if (!f) return;
  const c = centroid(f); globe.controls().autoRotate = false;
  globe.pointOfView({ lat: c.lat, lng: c.lng, altitude: 1.7 }, 700);
}

/* ---------- full-screen country detail ---------- */
function openCountry(d) {
  selected = d;
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

  state.q = ""; state.superOnly = false; document.getElementById("d-search").value = "";
  buildFilters();
  renderHints();
  document.getElementById("detail").classList.add("open");
}
function mkBtn(cls, href, text) { const a = document.createElement("a"); a.className = "btn " + cls; a.href = href; a.target = "_blank"; a.rel = "noopener"; a.textContent = text; return a; }

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
    const u = s === "plonkit" ? (selected.links && selected.links.plonkit) : (h.src_url || SRC_URL[s]);
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
      .filter(h => !state.q || h.text.toLowerCase().includes(state.q));
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
function imgUrl(h, w) {
  if (!h.img) return null;
  if (/^(https?:)?\/\//.test(h.img) || /^img\//.test(h.img)) return h.img;
  // Plonk It's image folder can differ from the page slug (e.g. link /usa but folder
  // /united-states) — prefer an explicit img_folder, else derive from the plonkit link.
  const link = (selected.links && selected.links.plonkit) || "";
  const folder = selected.img_folder ||
    link.replace(/^https?:\/\/(www\.)?plonkit\.net\//i, "").replace(/\/.*$/, "") || selected.slug;
  return `https://www.plonkit.net/images/resize/${w || 900}/80/${folder}/${encodeURIComponent(h.img)}`;
}
function cardEl(h) {
  const ty = guessType(h); const tm = TYPE_META[ty] || TYPE_META.general;
  const card = document.createElement("div"); card.className = "card" + (isSuper(h) ? " super" : "");
  // Card meta omits the Plonk It link (redundant — already in the header button + image dialog).
  const svRef = h.sv ? `<a href="${h.sv}" target="_blank" rel="noopener">Street View ↗</a>` : "";
  const meta = [srcRefs(h, { noPlonkit: true }), svRef].filter(Boolean).join(" · ");
  const gallery = state.view === "gallery" && !!h.img;
  card.innerHTML =
    (gallery ? `<div class="gimg"><img src="${imgUrl(h, 600)}" alt="" draggable="false" onerror="this.closest('.gimg').style.display='none'"><div class="gimg-zoom"></div><div class="zoom-hint">🔍 click to toggle hover-zoom</div></div>` : "") +
    `<div class="body">` +
      (isSuper(h) ? `<div class="keytag">⭐ Key regional clue</div>` : "") +
      `<div class="type"><i style="background:${tm.color}"></i>${tm.label}</div>` +
      `<div class="t">${mdBold(h.text)}</div>` +
      (meta ? `<div class="m">${meta}</div>` : "") +
    `</div>`;
  if (h.img && !gallery) {
    const url = imgUrl(h);
    const b = document.createElement("button"); b.className = "imgbtn"; b.textContent = "📷 Show image";
    b.onclick = () => openImg(selected.name + " — " + tm.label, url, h.text, "Source: " + srcRefs(h));
    card.querySelector(".body").appendChild(b);
  }
  if (gallery) wireGalleryZoom(card, h);
  return card;
}
// Inline (gallery-mode) click-to-toggle hover-zoom, mirroring the image dialog. Hi-res
// original is loaded lazily on first enable so gallery entry stays light.
function wireGalleryZoom(card, h) {
  const gi = card.querySelector(".gimg"); if (!gi) return;
  const zoom = gi.querySelector(".gimg-zoom"); let bgReady = false;
  const ensureBg = () => {
    if (bgReady) return; bgReady = true;
    zoom.style.backgroundImage = `url("${imgUrl(h, 600)}")`; zoom.style.backgroundSize = (IMG_ZOOM * 100) + "%";
    const hi = hiRes(imgUrl(h, 900)); const pre = new Image();
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
function openImg(title, url, capText, creditHTML) {
  document.getElementById("img-title").textContent = title;
  const el = document.getElementById("img-el"); el.src = url; el.alt = title;
  document.getElementById("img-cap").innerHTML =
    (capText ? mdBold(capText) : "") + (creditHTML ? `<span class="src">${creditHTML}</span>` : "");
  // Amazon-style hover zoom: start with the display image, upgrade to the original when it loads.
  const stage = document.getElementById("img-stage"), zoom = document.getElementById("img-zoom");
  stage.classList.remove("zoomable", "zoom-on"); zoom.style.backgroundPosition = "50% 50%";
  const setBg = (src) => { zoom.style.backgroundImage = `url("${src}")`; zoom.style.backgroundSize = (IMG_ZOOM * 100) + "%"; stage.classList.add("zoomable"); };
  setBg(url);
  const hi = hiRes(url);
  if (hi !== url) { const pre = new Image(); pre.onload = () => { if (el.src === url) setBg(hi); }; pre.src = hi; }
  document.getElementById("imgModal").classList.add("open");
}

function syncViewToggle() {
  document.querySelectorAll("#viewtoggle .vt-btn").forEach(b => b.classList.toggle("on", b.dataset.view === state.view));
}
function wireUI() {
  document.getElementById("back").onclick = () => {
    document.getElementById("detail").classList.remove("open");
    globe.controls().autoRotate = true;
  };
  document.getElementById("worldCov").onclick = () => openCoverage(null);
  document.getElementById("covBtn").onclick = () => { if (selected) openCoverage(selected); };
  const stage = document.getElementById("img-stage");
  stage.addEventListener("mousemove", e => {
    const r = stage.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    document.getElementById("img-zoom").style.backgroundPosition = `${px * 100}% ${py * 100}%`;
  });
  // click the image to toggle hover-zoom on/off
  stage.addEventListener("click", () => { if (stage.classList.contains("zoomable")) stage.classList.toggle("zoom-on"); });
  document.getElementById("img-close").onclick = () => document.getElementById("imgModal").classList.remove("open");
  document.getElementById("imgModal").addEventListener("click", e => { if (e.target.id === "imgModal") document.getElementById("imgModal").classList.remove("open"); });
  document.getElementById("cov-close").onclick = () => document.getElementById("covModal").classList.remove("open");
  document.getElementById("covModal").addEventListener("click", e => { if (e.target.id === "covModal") document.getElementById("covModal").classList.remove("open"); });
  document.querySelectorAll("#viewtoggle .vt-btn").forEach(b => {
    b.onclick = () => { state.view = b.dataset.view; saveView(state.view); syncViewToggle(); if (selected) renderHints(); };
  });
  syncViewToggle();
  document.getElementById("d-search").oninput = (e) => { state.q = e.target.value.trim().toLowerCase(); renderHints(); };
  const s = document.getElementById("search");
  s.oninput = () => {
    const q = s.value.trim().toLowerCase();
    document.querySelectorAll(".c-item").forEach(el => el.classList.toggle("hidden", q && !el.dataset.name.includes(q)));
    document.querySelectorAll(".cont-h").forEach(h => {
      let n = h.nextElementSibling, any = false;
      while (n && !n.classList.contains("cont-h")) { if (!n.classList.contains("hidden")) any = true; n = n.nextElementSibling; }
      h.classList.toggle("hidden", !any);
    });
  };
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    const im = document.getElementById("imgModal"), cm = document.getElementById("covModal");
    if (im.classList.contains("open")) im.classList.remove("open");
    else if (cm.classList.contains("open")) cm.classList.remove("open");
    else if (document.getElementById("detail").classList.contains("open")) document.getElementById("back").click();
  });
}

init().catch(err => { document.getElementById("prog").textContent = "load error: " + err.message; console.error(err); });

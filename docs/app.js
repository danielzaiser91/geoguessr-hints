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

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/^the\s+/, "").replace(/&/g, "and").replace(/[^a-z ]/g, "").trim();

let DATA = null, byNorm = {}, features = [], world = null, selected = null;
let hovered = null, globe = null, covMap = null, covBase = null, covOverlay = null;
const covSet = new Set(COVERAGE.map(norm));
const state = { cats: new Set(CAT_ORDER), srcs: new Set(Object.keys(SRC_NAME)), q: "" };

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
    fetch("countries.json").then(r => r.json()),
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
  el.innerHTML = `<span class="dot"></span><span class="n">${name}</span>` + (data ? `<span class="cnt">${data.hints.length}</span>` : "");
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
  const bySrc = {}; d.hints.forEach(h => (h.src || []).forEach(s => bySrc[s] = (bySrc[s] || 0) + 1));
  document.getElementById("d-sub").innerHTML =
    `${d.continent} · ${d.hints.length} clues · sources: ` +
    Object.keys(bySrc).map(s => `${SRC_NAME[s] || s} (${bySrc[s]})`).join(", ");

  const act = document.getElementById("d-actions"); act.innerHTML = "";
  act.appendChild(mkBtn("gg", (d.links && d.links.geoguessr) || ("https://www.geoguessr.com/maps/community?query=" + encodeURIComponent(d.name)), "▶ Practice on GeoGuessr"));
  const covBtn = document.createElement("button"); covBtn.className = "btn cov";
  covBtn.textContent = "🗺 Official coverage for " + d.name;
  covBtn.onclick = () => openCoverage(d); act.appendChild(covBtn);
  if (d.links && d.links.plonkit) act.appendChild(mkBtn("pk", d.links.plonkit, "Plonk It ↗"));

  buildFilters(); state.q = ""; document.getElementById("d-search").value = "";
  renderHints();
  document.getElementById("detail").classList.add("open");
}
function mkBtn(cls, href, text) { const a = document.createElement("a"); a.className = "btn " + cls; a.href = href; a.target = "_blank"; a.rel = "noopener"; a.textContent = text; return a; }

function buildFilters() {
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
  document.querySelector(".d-filterbar .f-label.sep").style.display = present.size > 1 ? "" : "none";
  fs.style.display = present.size > 1 ? "" : "none";
}
const mdBold = (s) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");
function srcRefs(h) {
  return (h.src || []).map(s => {
    const u = s === "plonkit" ? (selected.links && selected.links.plonkit) : (h.src_url || SRC_URL[s]);
    return u ? `<a href="${u}" target="_blank" rel="noopener">${SRC_NAME[s] || s}</a>` : (SRC_NAME[s] || s);
  }).join(" · ");
}
function renderHints() {
  const body = document.getElementById("d-body"); body.innerHTML = "";
  let total = 0;
  CAT_ORDER.forEach(cat => {
    if (!state.cats.has(cat)) return;
    const hints = selected.hints.filter(h => h.cat === cat)
      .filter(h => (h.src || []).some(s => state.srcs.has(s)))
      .filter(h => !state.q || h.text.toLowerCase().includes(state.q));
    if (!hints.length) return;
    total += hints.length;
    const sec = document.createElement("div"); sec.className = "sec"; sec.dataset.cat = cat;
    sec.innerHTML = `<div class="sec-h"><span class="bar"></span><span class="c">${cat[0].toUpperCase() + cat.slice(1)}</span><span class="desc">— ${CAT_DESC[cat]}</span></div>`;
    const cards = document.createElement("div"); cards.className = "cards";
    hints.forEach(h => {
      const card = document.createElement("div"); card.className = "card";
      const img = h.img ? `<img src="${h.img}" loading="lazy" alt="">` : "";
      const sv = h.sv ? ` · <a href="${h.sv}" target="_blank" rel="noopener">Street View ↗</a>` : "";
      card.innerHTML = img + `<div class="body"><div class="t">${mdBold(h.text)}</div><div class="m">${srcRefs(h)}${sv}</div></div>`;
      cards.appendChild(card);
    });
    sec.appendChild(cards); body.appendChild(sec);
  });
  if (!total) body.innerHTML = `<div class="empty">No clues match the current filters.</div>`;
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
  document.getElementById("cov-title").textContent = d
    ? "Official Street View coverage — " + d.name : "Official Street View coverage — World";
  document.getElementById("covModal").classList.add("open");
  ensureCovMap();
  setTimeout(() => {
    covMap.invalidateSize();
    if (d) { const f = featureFor(d); if (f) covMap.fitBounds(bounds(f), { padding: [20, 20] }); else covMap.setView([20, 0], 2); }
    else covMap.setView([20, 0], 2);
  }, 60);
}

function wireUI() {
  document.getElementById("back").onclick = () => {
    document.getElementById("detail").classList.remove("open");
    globe.controls().autoRotate = true;
  };
  document.getElementById("worldCov").onclick = () => openCoverage(null);
  document.getElementById("cov-close").onclick = () => document.getElementById("covModal").classList.remove("open");
  document.getElementById("covModal").addEventListener("click", e => { if (e.target.id === "covModal") document.getElementById("covModal").classList.remove("open"); });
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
    const m = document.getElementById("covModal");
    if (m.classList.contains("open")) m.classList.remove("open");
    else document.getElementById("back").click();
  });
}

init().catch(err => { document.getElementById("prog").textContent = "load error: " + err.message; console.error(err); });

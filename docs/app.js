/* GeoHint Globe — reads countries.json (built from data/) + a world GeoJSON. */
const GEOJSON_URL = "world.geojson";
const SRC_NAME = { plonkit: "Plonk It", geohints: "GeoHints", wikipedia: "Wikipedia", geotips: "GeoTips" };
const SRC_URL = { plonkit: null, geohints: "https://geohints.com", wikipedia: "https://wikipedia.org", geotips: "https://geotips.net" };
const CAT_ORDER = ["country", "region", "state", "city", "special"];
const CONT_COLOR = {
  "Africa": "#e6a54b", "Asia": "#e5645b", "Europe": "#5b9bd6",
  "North America": "#7bd65b", "South America": "#d65bc0",
  "Oceania": "#5bd6c0", "Antarctica": "#9fb0cf",
};
// geojson ADMIN name (normalized) -> data name (normalized)
const ALIAS = {
  "united states of america": "united states",
  "russian federation": "russia",
  "czech republic": "czechia",
  "republic of korea": "south korea",
  "republic of serbia": "serbia",
  "macedonia": "north macedonia",
  "united republic of tanzania": "tanzania",
  "bosnia and herzegovina": "bosnia",
  "the netherlands": "netherlands",
};

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/^the\s+/, "").replace(/&/g, "and").replace(/[^a-z ]/g, "").trim();

let DATA = null, byNorm = {}, features = [], world = null, selected = null;
const state = { cats: new Set(CAT_ORDER), srcs: new Set(Object.keys(SRC_NAME)) };

function dataForName(name) {
  const n = norm(name);
  return byNorm[ALIAS[n] || n] || null;
}
function centroid(feature) {
  let x = 0, y = 0, c = 0;
  const eat = (ring) => ring.forEach(([lng, lat]) => { x += lng; y += lat; c++; });
  const g = feature.geometry;
  (g.type === "Polygon" ? [g.coordinates] : g.coordinates).forEach(poly => eat(poly[0]));
  return c ? { lat: y / c, lng: x / c } : { lat: 0, lng: 0 };
}

async function init() {
  [DATA, world] = await Promise.all([
    fetch("countries.json").then(r => r.json()),
    fetch(GEOJSON_URL).then(r => r.json()),
  ]);
  DATA.countries.forEach(c => { byNorm[norm(c.name)] = c; });
  features = world.features.filter(f => norm(f.properties.ADMIN || f.properties.NAME) !== "antarctica");

  document.getElementById("prog").innerHTML =
    `<b>${DATA.counts.done}</b> / ${DATA.counts.total} countries mapped`;

  buildGlobe();
  buildList();
  wireUI();
}

function colorFor(f) {
  const d = dataForName(f.properties.ADMIN || f.properties.NAME);
  if (!d) return "rgba(60,74,104,0.35)";
  const base = CONT_COLOR[d.continent] || "#5bd6c0";
  return base;
}

let globe;
function buildGlobe() {
  globe = Globe()(document.getElementById("globe"))
    .globeImageUrl("earth-dark.jpg")
    .bumpImageUrl("earth-topology.png")
    .backgroundColor("#070b14")
    .showAtmosphere(true).atmosphereColor("#2b6f8f").atmosphereAltitude(0.18)
    .polygonsData(features)
    .polygonCapColor(colorFor)
    .polygonSideColor(() => "rgba(10,17,32,0.6)")
    .polygonStrokeColor(() => "rgba(0,0,0,0.35)")
    .polygonAltitude(f => (dataForName(f.properties.ADMIN || f.properties.NAME) ? 0.03 : 0.008))
    .polygonLabel(f => {
      const d = dataForName(f.properties.ADMIN || f.properties.NAME);
      const nm = f.properties.ADMIN || f.properties.NAME;
      return `<div style="font:600 13px sans-serif;color:#fff">${nm}</div>` +
        `<div style="font:12px sans-serif;color:#9fb">${d ? d.hints.length + " hints — click" : "no hints yet"}</div>`;
    })
    .onPolygonClick(f => {
      const d = dataForName(f.properties.ADMIN || f.properties.NAME);
      if (d) openCountry(d, f);
    })
    .onPolygonHover(h => {
      globe.polygonAltitude(f => f === h
        ? 0.06
        : (dataForName(f.properties.ADMIN || f.properties.NAME) ? 0.03 : 0.008));
    });
  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.35;
  window.addEventListener("resize", () => { globe.width(window.innerWidth).height(window.innerHeight); });
}

function buildList() {
  const list = document.getElementById("list");
  list.innerHTML = "";
  DATA.continent_order.forEach(cont => {
    const inCont = DATA.countries.filter(c => c.continent === cont)
      .sort((a, b) => (b.area_km2 || 0) - (a.area_km2 || 0));
    const names = (DATA.master[cont] || []);
    if (!names.length) return;
    const h = document.createElement("div"); h.className = "cont-h"; h.textContent = cont;
    list.appendChild(h);
    // done first (biggest→smallest), then the rest as greyed todo
    const doneNames = new Set(inCont.map(c => c.name));
    inCont.forEach(c => list.appendChild(itemEl(c.name, c)));
    names.filter(n => !doneNames.has(n)).forEach(n => list.appendChild(itemEl(n, null)));
  });
}
function itemEl(name, data) {
  const el = document.createElement("div");
  el.className = "c-item" + (data ? " has" : "");
  el.dataset.name = name.toLowerCase();
  el.innerHTML = `<span class="dot"></span><span class="n">${name}</span>` +
    (data ? `<span class="cnt">${data.hints.length}</span>` : "");
  if (data) el.onclick = () => { openCountry(data); flyTo(data.name); };
  return el;
}
function flyTo(name) {
  const f = features.find(f => (f.properties.ADMIN || f.properties.NAME) &&
    dataForName(f.properties.ADMIN || f.properties.NAME) &&
    norm(f.properties.ADMIN || f.properties.NAME) === norm(name) ||
    (dataForName(f.properties.ADMIN) && dataForName(f.properties.ADMIN).name === name));
  const feat = features.find(ff => { const d = dataForName(ff.properties.ADMIN || ff.properties.NAME); return d && d.name === name; });
  if (feat) { const c = centroid(feat); globe.controls().autoRotate = false; globe.pointOfView({ lat: c.lat, lng: c.lng, altitude: 1.6 }, 800); }
}

function openCountry(d, feature) {
  selected = d;
  globe.controls().autoRotate = false;
  document.querySelectorAll(".c-item.sel").forEach(e => e.classList.remove("sel"));
  const li = [...document.querySelectorAll(".c-item")].find(e => e.dataset.name === d.name.toLowerCase());
  if (li) li.classList.add("sel");
  document.getElementById("p-name").textContent = d.name;
  const bySrc = {}; d.hints.forEach(h => (h.src || []).forEach(s => bySrc[s] = (bySrc[s] || 0) + 1));
  document.getElementById("p-sub").textContent =
    `${d.continent} · ${d.hints.length} hints · sources: ` +
    Object.keys(bySrc).map(s => SRC_NAME[s] || s).join(", ");
  // links
  const links = document.getElementById("p-links"); links.innerHTML = "";
  const gg = d.links && d.links.geoguessr;
  const a1 = document.createElement("a"); a1.className = "btn gg";
  a1.href = gg || ("https://www.geoguessr.com/maps/community?query=" + encodeURIComponent(d.name));
  a1.target = "_blank"; a1.rel = "noopener"; a1.textContent = "Practice on GeoGuessr ↗";
  links.appendChild(a1);
  if (d.links && d.links.plonkit) {
    const a2 = document.createElement("a"); a2.className = "btn pk";
    a2.href = d.links.plonkit; a2.target = "_blank"; a2.rel = "noopener";
    a2.textContent = "Plonk It guide ↗"; links.appendChild(a2);
  }
  buildFilters(); renderHints();
  document.getElementById("panel").classList.add("open");
}

function buildFilters() {
  const wrap = document.getElementById("p-filters"); wrap.innerHTML = "";
  CAT_ORDER.forEach(k => {
    const present = selected.hints.some(h => h.cat === k);
    if (!present) return;
    const c = document.createElement("span");
    c.className = "chip" + (state.cats.has(k) ? " on" : ""); c.dataset.k = k;
    c.textContent = k[0].toUpperCase() + k.slice(1);
    c.onclick = () => { state.cats.has(k) ? state.cats.delete(k) : state.cats.add(k); c.classList.toggle("on"); renderHints(); };
    wrap.appendChild(c);
  });
  const srcsPresent = new Set(); selected.hints.forEach(h => (h.src || []).forEach(s => srcsPresent.add(s)));
  if (srcsPresent.size > 1) {
    [...srcsPresent].forEach(s => {
      const c = document.createElement("span");
      c.className = "chip src" + (state.srcs.has(s) ? " on" : "");
      c.textContent = SRC_NAME[s] || s;
      c.onclick = () => { state.srcs.has(s) ? state.srcs.delete(s) : state.srcs.add(s); c.classList.toggle("on"); renderHints(); };
      wrap.appendChild(c);
    });
  }
}
function renderHints() {
  const box = document.getElementById("p-hints"); box.innerHTML = "";
  const hints = selected.hints
    .filter(h => state.cats.has(h.cat))
    .filter(h => (h.src || []).some(s => state.srcs.has(s)))
    .sort((a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat));
  if (!hints.length) { box.innerHTML = `<div class="empty">No hints match the current filters.</div>`; return; }
  hints.forEach(h => {
    const el = document.createElement("div"); el.className = "hint"; el.dataset.cat = h.cat;
    const srcRefs = (h.src || []).map(s => {
      const u = (s === "plonkit" ? (selected.links && selected.links.plonkit) : (h.src_url || SRC_URL[s]));
      return u ? `<a href="${u}" target="_blank" rel="noopener">${SRC_NAME[s] || s}</a>` : (SRC_NAME[s] || s);
    }).join(" · ");
    const sv = h.sv ? ` · <a href="${h.sv}" target="_blank" rel="noopener">Street View ↗</a>` : "";
    el.innerHTML = `<div class="t">${mdBold(h.text)}</div>` +
      `<div class="m"><span class="tag">${h.cat}</span> ${srcRefs}${sv}</div>`;
    box.appendChild(el);
  });
}
const mdBold = (s) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");

function wireUI() {
  document.getElementById("close").onclick = () => {
    document.getElementById("panel").classList.remove("open");
    globe.controls().autoRotate = true;
  };
  const s = document.getElementById("search");
  s.oninput = () => {
    const q = s.value.trim().toLowerCase();
    document.querySelectorAll(".c-item").forEach(el => {
      el.classList.toggle("hidden", q && !el.dataset.name.includes(q));
    });
    document.querySelectorAll(".cont-h").forEach(h => {
      let n = h.nextElementSibling, any = false;
      while (n && !n.classList.contains("cont-h")) { if (!n.classList.contains("hidden")) any = true; n = n.nextElementSibling; }
      h.classList.toggle("hidden", !any);
    });
  };
  document.addEventListener("keydown", e => { if (e.key === "Escape") document.getElementById("close").click(); });
}

init().catch(err => { document.getElementById("prog").textContent = "load error: " + err.message; console.error(err); });

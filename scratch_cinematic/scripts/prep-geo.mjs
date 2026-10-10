// One-off preprocessing: Natural Earth GeoJSON -> compact quantized ring arrays.
// Output format: { rings: number[][] } where each ring is a flat [lng,lat,lng,lat,...] list.
import fs from "node:fs";

const load = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

function perpDist(p, a, b) {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(x - cx, y - cy);
}

function simplify(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxD = -1;
    let idx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpDist(points[i], points[first], points[last]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([first, idx], [idx, last]);
    }
  }
  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

const ringArea = (pts) => {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return Math.abs(a / 2);
};

function extract(features, { tol, minArea, decimals, bbox, filter }) {
  const rings = [];
  for (const f of features) {
    if (filter && !filter(f)) continue;
    const g = f.geometry;
    if (!g) continue;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const poly of polys) {
      for (const ring of poly) {
        let pts = ring.map(([lng, lat]) => [lng, lat]);
        if (bbox) {
          // skip rings entirely outside the bbox
          const inside = pts.some(([lng, lat]) => lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]);
          if (!inside) continue;
        }
        if (ringArea(pts) < minArea) continue;
        pts = simplify(pts, tol);
        if (pts.length < 4) continue;
        const flat = [];
        for (const [lng, lat] of pts) {
          flat.push(Number(lng.toFixed(decimals)), Number(lat.toFixed(decimals)));
        }
        rings.push(flat);
      }
    }
  }
  return rings;
}

const write = (path, payload) => {
  fs.writeFileSync(path, JSON.stringify(payload));
  const kb = (fs.statSync(path).size / 1024).toFixed(1);
  const pts = payload.rings.reduce((n, r) => n + r.length / 2, 0);
  console.log(`${path}: ${payload.rings.length} rings, ${pts} pts, ${kb} KB`);
};

// 1. Global landmasses (orbit view)
const land = load("/tmp/l50.json");
write("src/data/land.json", { rings: extract(land.features, { tol: 0.05, minArea: 0.4, decimals: 2 }) });

// 2. Countries of South + West Asia (mid-view borders)
const countries = load("/tmp/a1.json");
const keepCountries = new Set([
  "India",
  "Pakistan",
  "Nepal",
  "Bhutan",
  "Bangladesh",
  "Sri Lanka",
  "Myanmar",
  "China",
  "Afghanistan",
  "Tajikistan",
  "Kyrgyzstan",
  "Kazakhstan",
  "Uzbekistan",
  "Turkmenistan",
  "Iran",
  "Oman",
  "United Arab Emirates",
  "Saudi Arabia",
  "Thailand",
  "Laos",
  "Vietnam",
  "Malaysia",
  "Indonesia",
  "Iraq",
]);
const countryFeatures = countries.features.filter((f) => keepCountries.has(f.properties.admin));
// admin-1 works as country outlines too when merged per-country: keep only outer rings of the largest rings
const byCountry = new Map();
for (const f of countryFeatures) {
  const name = f.properties.admin;
  const g = f.geometry;
  if (!g) continue;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  const arr = byCountry.get(name) ?? [];
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring) continue;
    arr.push(ring);
  }
  byCountry.set(name, arr);
}
const countryRings = [];
for (const [name, ringList] of byCountry) {
  // keep the 3 largest rings per country to bound size
  ringList.sort((a, b) => ringArea(b) - ringArea(a));
  for (const ring of ringList.slice(0, 3)) {
    let pts = simplify(ring.map(([lng, lat]) => [lng, lat]), 0.03);
    if (pts.length < 4) continue;
    const flat = [];
    for (const [lng, lat] of pts) flat.push(Number(lng.toFixed(3)), Number(lat.toFixed(3)));
    countryRings.push(flat);
  }
}
write("src/data/countries.json", { rings: countryRings });

// 3. Indian states + neighbouring provinces for the regional dive
const regionNames = new Set([
  "Punjab",
  "Haryana",
  "Delhi",
  "Chandigarh",
  "Himachal Pradesh",
  "Uttarakhand",
  "Uttar Pradesh",
  "Rajasthan",
  "Jammu and Kashmir",
  "Ladakh",
  "Madhya Pradesh",
  "Bihar",
  "Gujarat",
  "Sindh",
  "Balochistan",
  "Khyber Pakhtunkhwa",
  "Islamabad",
  "Federally Administered Tribal Areas",
]);
const region = countries.features.filter(
  (f) => regionNames.has(f.properties.name) || regionNames.has(f.properties.name_en)
);
const out = extract(region, { tol: 0.012, minArea: 0.02, decimals: 3, bbox: [68, 24, 90, 36.5] });
const named = region
  .filter((f) => (f.properties.name === "Punjab" && f.properties.admin === "India") || f.properties.name === "Haryana" || f.properties.name === "Delhi")
  .map((f) => f.properties.name);
console.log("region states:", named.join(","));
write("src/data/region.json", { rings: out });

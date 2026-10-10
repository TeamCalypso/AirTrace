export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
export const invlerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a), 0, 1);
export const DEG = Math.PI / 180;

/** Deterministic 32-bit hash -> seed. */
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — tiny, fast, deterministic PRNG. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller normal sample from a uniform generator. */
export function gaussian(next: () => number) {
  const u = Math.max(1e-9, next());
  const v = next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Distance in km between two lat/lng points. */
export function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = (bLat - aLat) * DEG;
  const dLng = (bLng - aLng) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Initial bearing from A to B, degrees clockwise from north. */
export function bearing(aLat: number, aLng: number, bLat: number, bLng: number) {
  const y = Math.sin((bLng - aLng) * DEG) * Math.cos(bLat * DEG);
  const x =
    Math.cos(aLat * DEG) * Math.sin(bLat * DEG) -
    Math.sin(aLat * DEG) * Math.cos(bLat * DEG) * Math.cos((bLng - aLng) * DEG);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

/** Great-circle interpolation between two lat/lng points. */
export function interpolateLatLng(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
  t: number
): [number, number] {
  const toRad = (d: number) => d * DEG;
  const lat1 = toRad(aLat);
  const lng1 = toRad(aLng);
  const lat2 = toRad(bLat);
  const lng2 = toRad(bLng);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2
      )
    );
  if (d === 0) return [aLat, aLng];
  const a = Math.sin((1 - t) * d) / Math.sin(d);
  const b = Math.sin(t * d) / Math.sin(d);
  const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2);
  const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2);
  const z = a * Math.sin(lat1) + b * Math.sin(lat2);
  return [
    Math.atan2(z, Math.sqrt(x * x + y * y)) / DEG,
    Math.atan2(y, x) / DEG,
  ];
}

/**
 * lat/lng -> position on a sphere of `radius`.
 * Matches the standard equirectangular texture mapping used by the globe.
 */
export function latLngToVec3(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

export const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const compassLabel = (deg: number) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];

export const AQI_STEPS: { max: number; aqi: number; label: string; color: string; text: string; advice: string }[] = [
  { max: 30, aqi: 50, label: "Good", color: "#22c55e", text: "#052e16", advice: "Air is clean. Run, cycle, open the windows." },
  { max: 60, aqi: 100, label: "Satisfactory", color: "#a3e635", text: "#1a2e05", advice: "Fine for almost everyone. Sensitive groups should watch for symptoms." },
  { max: 90, aqi: 200, label: "Moderate", color: "#facc15", text: "#422006", advice: "Cut long outdoor exertion. Masks help if you are out for hours." },
  { max: 120, aqi: 300, label: "Poor", color: "#fb923c", text: "#431407", advice: "Bring workouts indoors. Close windows during the evening peak." },
  { max: 250, aqi: 400, label: "Very Poor", color: "#ef4444", text: "#450a0a", advice: "Avoid outdoor exertion. N95 outdoors, purifier on indoors." },
  { max: 1000, aqi: 500, label: "Severe", color: "#a855f7", text: "#2e1065", advice: "Stay indoors. Emergency response: schools shut, construction halted." },
];

/** CPCB PM2.5 sub-index (24h) — piecewise linear on the breakpoints. */
export function aqiFromPm25(pm25: number) {
  const breakpoints: [number, number, number, number][] = [
    [0, 30, 0, 50],
    [30, 60, 51, 100],
    [60, 90, 101, 200],
    [90, 120, 201, 300],
    [120, 250, 301, 400],
    [250, 500, 401, 500],
  ];
  const c = clamp(pm25, 0, 500);
  for (const [cLo, cHi, iLo, iHi] of breakpoints) {
    if (c <= cHi) return Math.round(iLo + ((iHi - iLo) / (cHi - cLo)) * (c - cLo));
  }
  return 500;
}

export function aqiCategory(aqi: number) {
  for (const step of AQI_STEPS) if (aqi <= step.aqi) return step;
  return AQI_STEPS[AQI_STEPS.length - 1];
}

export const fmtPm = (v: number) => `${Math.round(v)}`;
export const fmtKm = (v: number) => (v >= 100 ? `${Math.round(v / 10) * 10} km` : `${Math.round(v)} km`);

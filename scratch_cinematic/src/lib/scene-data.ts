import { clamp, gaussian, hashSeed, rng } from "./geo";

export type District = {
  name: string;
  state: "Punjab" | "Haryana" | "Uttar Pradesh" | "Rajasthan";
  lat: number;
  lng: number;
  /** relative detection density, calibrated to a peak-season day */
  weight: number;
  /** spatial spread in degrees */
  spread: number;
};

/** Principal rice-burning districts of the north-west Indo-Gangetic Plain. */
export const DISTRICTS: District[] = [
  { name: "Amritsar", state: "Punjab", lat: 31.63, lng: 74.87, weight: 92, spread: 0.42 },
  { name: "Tarn Taran", state: "Punjab", lat: 31.45, lng: 74.93, weight: 78, spread: 0.35 },
  { name: "Firozpur", state: "Punjab", lat: 30.92, lng: 74.61, weight: 64, spread: 0.45 },
  { name: "Moga", state: "Punjab", lat: 30.8, lng: 75.17, weight: 58, spread: 0.34 },
  { name: "Ludhiana", state: "Punjab", lat: 30.9, lng: 75.86, weight: 52, spread: 0.38 },
  { name: "Barnala", state: "Punjab", lat: 30.37, lng: 75.55, weight: 41, spread: 0.3 },
  { name: "Sangrur", state: "Punjab", lat: 30.24, lng: 75.84, weight: 87, spread: 0.42 },
  { name: "Bathinda", state: "Punjab", lat: 30.21, lng: 74.94, weight: 62, spread: 0.45 },
  { name: "Mansa", state: "Punjab", lat: 29.98, lng: 75.09, weight: 44, spread: 0.36 },
  { name: "Patiala", state: "Punjab", lat: 30.34, lng: 76.39, weight: 48, spread: 0.36 },
  { name: "Fatehgarh Sahib", state: "Punjab", lat: 30.64, lng: 76.37, weight: 26, spread: 0.26 },
  { name: "Jalandhar", state: "Punjab", lat: 31.33, lng: 75.58, weight: 34, spread: 0.3 },
  { name: "Kapurthala", state: "Punjab", lat: 31.38, lng: 75.38, weight: 22, spread: 0.28 },
  { name: "Karnal", state: "Haryana", lat: 29.69, lng: 76.99, weight: 38, spread: 0.3 },
  { name: "Kaithal", state: "Haryana", lat: 29.8, lng: 76.4, weight: 54, spread: 0.32 },
  { name: "Kurukshetra", state: "Haryana", lat: 29.97, lng: 76.88, weight: 46, spread: 0.28 },
  { name: "Jind", state: "Haryana", lat: 29.32, lng: 76.32, weight: 51, spread: 0.36 },
  { name: "Panipat", state: "Haryana", lat: 29.39, lng: 76.97, weight: 27, spread: 0.28 },
  { name: "Sonipat", state: "Haryana", lat: 28.99, lng: 77.02, weight: 24, spread: 0.3 },
  { name: "Rohtak", state: "Haryana", lat: 28.9, lng: 76.61, weight: 29, spread: 0.32 },
  { name: "Hisar", state: "Haryana", lat: 29.15, lng: 75.72, weight: 33, spread: 0.4 },
  { name: "Sirsa", state: "Haryana", lat: 29.53, lng: 75.03, weight: 36, spread: 0.42 },
  { name: "Fatehabad", state: "Haryana", lat: 29.51, lng: 75.46, weight: 31, spread: 0.36 },
  { name: "Ambala", state: "Haryana", lat: 30.36, lng: 76.78, weight: 18, spread: 0.26 },
  { name: "Saharanpur", state: "Uttar Pradesh", lat: 29.97, lng: 77.55, weight: 17, spread: 0.3 },
  { name: "Shamli", state: "Uttar Pradesh", lat: 29.45, lng: 77.31, weight: 21, spread: 0.26 },
  { name: "Muzaffarnagar", state: "Uttar Pradesh", lat: 29.47, lng: 77.7, weight: 19, spread: 0.3 },
  { name: "Baghpat", state: "Uttar Pradesh", lat: 29.03, lng: 77.22, weight: 14, spread: 0.24 },
  { name: "Hanumangarh", state: "Rajasthan", lat: 29.58, lng: 74.32, weight: 16, spread: 0.4 },
  { name: "Sri Ganganagar", state: "Rajasthan", lat: 29.92, lng: 73.88, weight: 22, spread: 0.45 },
];

/** VIIRS 375 m overpass times (local solar time) used to stagger the pop-in. */
export const VIIRS_PASSES = [1.6, 3.0, 13.1, 14.5];

export type Fire = {
  lat: number;
  lng: number;
  frp: number;
  confidence: number;
  pass: number;
  hour: number;
  district: string;
  state: string;
};

let fireCache: Fire[] | null = null;

/**
 * ~1,150 VIIRS-style active fire detections on a peak-season day.
 * Fully deterministic so the server model and the WebGL scene agree.
 */
export function getFires(): Fire[] {
  if (fireCache) return fireCache;
  const next = rng(hashSeed("viirs-375m-2025-11-03"));
  const total = DISTRICTS.reduce((sum, d) => sum + d.weight, 0);
  const fires: Fire[] = [];
  for (const d of DISTRICTS) {
    const count = Math.round((d.weight / total) * 1150);
    for (let i = 0; i < count; i++) {
      // two gaussian axes give realistic field-shaped clusters
      const lat = d.lat + gaussian(next) * d.spread * 0.5;
      const lng = d.lng + gaussian(next) * d.spread * 0.55;
      const pass = Math.floor(next() * VIIRS_PASSES.length);
      fires.push({
        lat,
        lng,
        frp: Math.exp(1.4 + next() * 2.6),
        confidence: clamp(0.42 + next() * 0.58, 0, 1),
        pass,
        hour: VIIRS_PASSES[pass],
        district: d.name,
        state: d.state,
      });
    }
  }
  fires.sort((a, b) => a.hour - b.hour || a.lat - b.lat);
  fireCache = fires;
  return fires;
}

export const FIRE_TOTAL = getFires().length;

export type WindSample = { lat: number; lng: number; speed: number; dirFrom: number };

/**
 * Post-monsoon north-westerly over the Indo-Gangetic Plain.
 * Diurnal: calm, drainage-flow nights; brisk turbulent afternoons.
 */
export function windAt(lat: number, lng: number, hour: number, dayIndex = 0): WindSample {
  const t = hour + dayIndex * 24;
  const diurnal = Math.sin(((t - 9) / 24) * Math.PI * 2);
  const swirl = Math.sin(lat * 0.21 + lng * 0.17 + dayIndex * 0.6) * 26;
  const synoptic = Math.sin(dayIndex * 0.9 + 1.1) * 1.4;
  const speed = clamp(2.05 + 1.55 * diurnal + synoptic + Math.sin(lng * 0.4) * 0.35, 0.45, 7.8);
  const dirFrom = (318 + swirl + 16 * Math.sin(t / 18) - lat * 0.55 + 360 * 3) % 360;
  return { lat, lng, speed, dirFrom };
}

/** Coarse 850 hPa hedgehog grid used to draw the 3D wind vectors. */
export function windField(hour: number, dayIndex = 0): WindSample[] {
  const out: WindSample[] = [];
  for (let lat = 27.5; lat <= 31.5; lat += 0.85) {
    for (let lng = 72.5; lng <= 78.5; lng += 0.95) {
      out.push(windAt(lat, lng, hour, dayIndex));
    }
  }
  return out;
}

/** Travel time (hours) for smoke to reach a point from a source. */
export function travelHours(fromLat: number, fromLng: number, toLat: number, toLng: number, hour: number) {
  const R = 6371;
  const dLat = (toLat - fromLat) * (Math.PI / 180);
  const dLng = (toLng - fromLng) * (Math.PI / 180);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLat * (Math.PI / 180)) * Math.cos(toLat * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  const dist = 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  const wind = windAt((fromLat + toLat) / 2, (fromLng + toLng) / 2, hour);
  return { dist, hours: dist / Math.max(9, wind.speed * 3.6 * 1.7) };
}

export type PlaceLabel = { name: string; lat: number; lng: number; kind: "megacity" | "city" | "capital" | "peak" };

export const REGION_LABELS: PlaceLabel[] = [
  { name: "Delhi", lat: 28.6139, lng: 77.209, kind: "megacity" },
  { name: "Gurugram", lat: 28.4595, lng: 77.0266, kind: "city" },
  { name: "Noida", lat: 28.5355, lng: 77.391, kind: "city" },
  { name: "Faridabad", lat: 28.4089, lng: 77.3178, kind: "city" },
  { name: "Ghaziabad", lat: 28.6692, lng: 77.4538, kind: "city" },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794, kind: "capital" },
  { name: "Ludhiana", lat: 30.901, lng: 75.8573, kind: "city" },
  { name: "Amritsar", lat: 31.634, lng: 74.8723, kind: "city" },
  { name: "Patiala", lat: 30.3405, lng: 76.386, kind: "city" },
  { name: "Panipat", lat: 29.39, lng: 76.9699, kind: "city" },
  { name: "Karnal", lat: 29.6856, lng: 76.9902, kind: "city" },
  { name: "Hisar", lat: 29.1492, lng: 75.7217, kind: "city" },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873, kind: "city" },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462, kind: "city" },
  { name: "Dehradun", lat: 30.3165, lng: 78.0322, kind: "city" },
  { name: "Lahore", lat: 31.5497, lng: 74.3436, kind: "megacity" },
  { name: "Islamabad", lat: 33.6844, lng: 73.0479, kind: "capital" },
  { name: "Kathmandu", lat: 27.7172, lng: 85.324, kind: "capital" },
  { name: "Mt. Everest", lat: 27.9881, lng: 86.925, kind: "peak" },
  { name: "Arabian Sea", lat: 19.5, lng: 68.5, kind: "peak" },
];

/** Major population centres — drives the night-lights texture on the globe. */
export const WORLD_LIGHTS: [number, number, number][] = [
  [28.61, 77.21, 1], [19.08, 72.88, 1], [22.57, 88.36, 0.95], [13.08, 80.27, 1], [12.97, 77.59, 1],
  [17.39, 78.49, 0.9], [23.03, 72.58, 0.9], [31.55, 74.34, 0.9], [23.78, 90.4, 0.9], [24.86, 67.01, 0.85],
  [39.9, 116.4, 1], [31.23, 121.47, 1], [23.13, 113.26, 1], [22.32, 114.17, 0.95], [37.57, 126.98, 0.95],
  [35.69, 139.69, 1], [34.69, 135.5, 0.85], [-6.21, 106.85, 0.9], [14.6, 120.98, 0.95], [13.75, 100.5, 0.9],
  [30.04, 31.24, 0.85], [33.31, 44.36, 0.7], [35.69, 51.39, 0.85], [25.2, 55.27, 0.9], [24.71, 46.68, 0.8],
  [41.01, 28.98, 0.85], [50.45, 30.52, 0.7], [55.75, 37.62, 0.85], [59.93, 30.34, 0.6], [52.52, 13.4, 0.8],
  [48.86, 2.35, 0.9], [51.51, -0.13, 1], [40.71, -74.01, 1], [41.88, -87.63, 0.95], [34.05, -118.24, 1],
  [37.77, -122.42, 0.85], [29.76, -95.37, 0.85], [25.76, -80.19, 0.8], [19.43, -99.13, 1], [23.55, -46.63, 1],
  [-22.91, -43.17, 0.95], [-34.6, -58.38, 0.9], [4.71, -74.07, 0.7], [-12.05, -77.04, 0.7], [6.52, 3.38, 0.85],
  [-26.2, 28.04, 0.9], [-1.29, 36.82, 0.7], [33.95, -6.83, 0.6], [37.34, -121.89, 0.6], [43.65, -79.38, 0.7],
  [45.5, -73.57, 0.65], [39.9, 32.85, 0.6], [26.23, 50.04, 0.65], [24.66, 46.71, 0.7], [21.03, 105.85, 0.8],
  [10.82, 106.63, 0.85], [-33.87, 151.21, 0.8], [-37.81, 144.96, 0.65], [1.35, 103.82, 0.9], [-6.2, 106.85, 0.9],
  [27.72, 85.32, 0.5], [27.47, 89.64, 0.4], [25.6, 85.13, 0.55], [26.85, 80.95, 0.65], [26.45, 80.33, 0.55],
  [30.73, 76.78, 0.5], [30.9, 75.86, 0.55], [31.63, 74.87, 0.5], [29.39, 76.97, 0.45], [28.98, 77.02, 0.5],
  [28.67, 77.45, 0.6], [28.54, 77.39, 0.6], [28.41, 77.32, 0.55], [28.46, 77.03, 0.6], [28.35, 76.94, 0.45],
];

/** Delhi built-up footprint — glowing urban mass seen in the final scenes. */
let delhiCache: Float32Array | null = null;
export function getDelhiFootprint(): Float32Array {
  if (delhiCache) return delhiCache;
  const next = rng(hashSeed("delhi-builtup"));
  const cores: [number, number, number][] = [
    [28.64, 77.22, 0.55], [28.7, 77.15, 0.6], [28.62, 77.1, 0.7], [28.55, 77.2, 0.5],
    [28.55, 77.26, 0.45], [28.65, 77.29, 0.55], [28.72, 77.2, 0.4], [28.58, 77.06, 0.6],
    [28.48, 77.09, 0.4], [28.68, 77.05, 0.5], [28.77, 77.02, 0.3], [28.52, 77.28, 0.35],
    [28.6, 77.34, 0.35], [28.73, 77.32, 0.3], [28.42, 77.31, 0.3], [28.46, 77.05, 0.35],
  ];
  const N = 5200;
  const arr = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const core = cores[Math.floor(next() * cores.length)];
    const r = Math.abs(gaussian(next)) * core[2];
    const a = next() * Math.PI * 2;
    arr[i * 2] = core[1] + Math.cos(a) * r * 1.05;
    arr[i * 2 + 1] = core[0] + Math.sin(a) * r * 0.8;
  }
  delhiCache = arr;
  return arr;
}

/** Simplified regional ring roads / highways drawn as faint circuitry. */
export const CORRIDORS: [number, number][][] = [
  [
    [31.6, 74.9], [30.9, 75.9], [30.34, 76.39], [29.7, 76.99], [29.39, 76.97], [28.99, 77.02],
    [28.7, 77.1], [28.61, 77.21], [28.54, 77.3], [28.45, 77.55], [28.4, 78.0],
  ],
  [
    [29.15, 75.72], [29.32, 76.32], [29.51, 76.46], [29.53, 76.99], [28.9, 76.61], [28.61, 77.21],
    [28.41, 77.32], [28.36, 77.6], [28.3, 78.1],
  ],
  [
    [30.9, 75.9], [30.37, 75.55], [30.21, 74.94], [29.98, 75.09], [29.58, 74.32], [29.15, 74.6],
  ],
];

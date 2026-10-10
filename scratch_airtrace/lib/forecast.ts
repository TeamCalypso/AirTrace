import type { Neighborhood } from "./neighborhoods";

/**
 * Deterministic illustrative scenario engine.
 *
 * This is NOT a live feed. The same neighborhood always produces the same
 * 48-hour outlook (seeded by its id), so the experience is stable, testable,
 * and clearly labelled as a demo. The module is deliberately self-contained
 * so a validated data provider (TROPOMI, VIIRS, ERA5, CPCB monitors) can be
 * swapped in behind the same Forecast shape later.
 */

export const SCENARIO_START_HOUR = 14; // scenario clock: mid-afternoon start
export const HOURS = 48;

export interface AqiCategory {
  max: number;
  name: string;
  short: string;
  color: string;
}

export const AQI_CATEGORIES: AqiCategory[] = [
  { max: 50, name: "Good", short: "GOOD", color: "#A9C97C" },
  { max: 100, name: "Moderate", short: "MODERATE", color: "#D9C878" },
  { max: 150, name: "Unhealthy for sensitive groups", short: "USG", color: "#E4A25C" },
  { max: 200, name: "Unhealthy", short: "UNHEALTHY", color: "#E0714B" },
  { max: 300, name: "Very unhealthy", short: "VERY UNHEALTHY", color: "#C65A80" },
  { max: 500, name: "Hazardous", short: "HAZARDOUS", color: "#8E5AA8" },
];

const PM_BREAKPOINTS: Array<[number, number, number, number]> = [
  [0, 12, 0, 50],
  [12.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 150.4, 151, 200],
  [150.5, 250.4, 201, 300],
  [250.5, 500.4, 301, 500],
];

export function pm25ToAqi(pm: number): number {
  const v = Math.max(0, pm);
  if (v >= 500.4) return 500;
  for (const [lo, hi, alo, ahi] of PM_BREAKPOINTS) {
    if (v <= hi) return Math.round(alo + ((v - lo) / (hi - lo)) * (ahi - alo));
  }
  return 500;
}

export function categoryFor(aqi: number): AqiCategory {
  return (
    AQI_CATEGORIES.find((c) => aqi <= c.max) ?? AQI_CATEGORIES[AQI_CATEGORIES.length - 1]
  );
}

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ForecastPoint {
  i: number;
  label: string;
  aqi: number;
  pm: number;
  category: AqiCategory;
}

export interface Forecast {
  neighborhood: Neighborhood;
  seedHex: string;
  startClock: string;
  scale: string;
  status: "illustrative";
  points: ForecastPoint[];
  current: { aqi: number; pm: number; category: AqiCategory };
  peak: { index: number; label: string; aqi: number; pm: number; category: AqiCategory };
  confidence: { value: number; label: "low" | "medium" | "high" };
  disclaimer: string;
}

export function buildForecast(nb: Neighborhood): Forecast {
  const seed = hashSeed(nb.id);
  const rng = mulberry32(seed);

  const base = 46 + nb.bias * 112 + rng() * 24; // baseline PM2.5 µg/m³
  const plumeRoll = rng();
  const hasPlume = plumeRoll > 0.42;
  const plumeStart = 4 + Math.floor(rng() * 16);
  const plumeDur = 10 + Math.floor(rng() * 9);
  const plumeAmp = hasPlume ? 20 + (plumeRoll - 0.42) * 110 : 0;
  const synPhase = rng() * Math.PI * 2;

  const points: ForecastPoint[] = [];
  for (let i = 0; i < HOURS; i++) {
    const hour = (SCENARIO_START_HOUR + i) % 24;
    // classic diurnal shape: morning + evening peaks, small pre-dawn trough
    const diurnal =
      1 +
      0.24 * Math.exp(-((hour - 7.5) ** 2) / 7) +
      0.17 * Math.exp(-((hour - 19) ** 2) / 6) -
      0.13 * Math.exp(-((hour - 3) ** 2) / 5);
    let plume = 0;
    if (plumeAmp > 0) {
      const d = i - plumeStart;
      if (d >= 0 && d < plumeDur) plume = Math.sin((d / plumeDur) * Math.PI);
    }
    const synoptic = 1 + 0.07 * Math.sin((i / HOURS) * Math.PI * 2 + synPhase);
    const noise = 1 + (rng() - 0.5) * 0.11;
    const pm = Math.max(4, base * diurnal * synoptic * noise + plumeAmp * plume);
    const aqi = pm25ToAqi(pm);
    points.push({
      i,
      label: i === 0 ? "NOW" : `+${i}H`,
      aqi,
      pm: Math.round(pm * 10) / 10,
      category: categoryFor(aqi),
    });
  }

  let peakIdx = 0;
  points.forEach((p) => {
    if (p.aqi > points[peakIdx].aqi) peakIdx = p.i;
  });

  const confidenceValue = Math.round(55 + rng() * 36);
  const confidenceLabel =
    confidenceValue >= 78 ? "high" : confidenceValue >= 66 ? "medium" : "low";

  return {
    neighborhood: nb,
    seedHex: seed.toString(16).toUpperCase().padStart(8, "0"),
    startClock: `${String(SCENARIO_START_HOUR).padStart(2, "0")}:00 scenario clock`,
    scale: "US EPA PM2.5 scale (illustrative)",
    status: "illustrative",
    points,
    current: { aqi: points[0].aqi, pm: points[0].pm, category: points[0].category },
    peak: {
      index: peakIdx,
      label: points[peakIdx].label,
      aqi: points[peakIdx].aqi,
      pm: points[peakIdx].pm,
      category: points[peakIdx].category,
    },
    confidence: { value: confidenceValue, label: confidenceLabel },
    disclaimer:
      "Deterministic illustrative scenario. Not a live AQI reading, not an official forecast, and not a public-health warning.",
  };
}

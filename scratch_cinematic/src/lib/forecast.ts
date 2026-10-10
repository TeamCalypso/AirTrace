import { AQI_STEPS, aqiCategory, aqiFromPm25, clamp, hashSeed, rng } from "./geo";
import { DISTRICTS, FIRE_TOTAL, getFires, windAt } from "./scene-data";

export const IST_OFFSET_MS = 5.5 * 3600 * 1000;

export type ForecastInput = {
  label: string;
  lat: number;
  lng: number;
  baseline?: number;
  profile?: string;
  startAt?: Date;
};

export type ForecastHour = {
  i: number;
  time: string;
  hourOfDay: number;
  dayIndex: number;
  pm25: number;
  low: number;
  high: number;
  aqi: number;
  category: string;
  color: string;
  windSpeed: number;
  windDirFrom: number;
  mixingHeight: number;
  ventilation: number;
  smoke: number;
  local: number;
  dust: number;
  upwindFires: number;
  trigger: string | null;
};

export type Forecast = {
  label: string;
  lat: number;
  lng: number;
  profile: string;
  generatedAt: string;
  startAt: string;
  hours: ForecastHour[];
  now: ForecastHour;
  peak: ForecastHour;
  peakNight: { start: string; end: string; avgPm25: number };
  averages: { pm25: number; smokeShare: number };
  hoursAbove300: number;
  transport: {
    sourceDistricts: string[];
    distanceKm: number;
    travelHours: number;
    arrival: string;
    fireCount: number;
  };
  summary: string;
  headline: string;
  advice: string[];
};

const DEG = Math.PI / 180;

const distKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const dLat = (bLat - aLat) * DEG;
  const dLng = (bLng - aLng) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)));
};

const bearingTo = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const y = Math.sin((bLng - aLng) * DEG) * Math.cos(bLat * DEG);
  const x =
    Math.cos(aLat * DEG) * Math.sin(bLat * DEG) -
    Math.sin(aLat * DEG) * Math.cos(bLat * DEG) * Math.cos((bLng - aLng) * DEG);
  return (Math.atan2(y, x) / DEG + 360) % 360;
};

/** Emission profile of a rice-straw burning day (local time). */
const burnProfile = (h: number) =>
  0.18 + 0.82 * (0.62 * Math.exp(-(((h - 14.5) / 3.9) ** 2)) + 0.48 * Math.exp(-(((h - 20.5) / 2.7) ** 2)));

/** Boundary-layer depth over the plain (m). */
const mixingHeight = (hourOfDay: number, dayIndex: number) => {
  const day = Math.max(0, Math.sin((Math.PI * (hourOfDay - 6.4)) / 13.2)) ** 0.75;
  const synoptic = 1 + 0.22 * Math.sin(dayIndex * 0.83 + 0.6);
  return clamp(150 + 1290 * day * synoptic, 145, 1750);
};

/** Ventilation multiplier: how much the same emissions get concentrated. */
const ventilationOf = (mh: number) => clamp((1150 / mh) ** 0.5, 0.85, 1.8);

/** Effective plume speed in the residual layer (km/h) — faster than surface wind. */
const plumeSpeed = (speed: number) => Math.max(9, speed * 3.6 * 1.7);

const trafficProfile = (h: number) =>
  13 * (Math.exp(-(((h - 9.6) / 1.9) ** 2)) + 0.85 * Math.exp(-(((h - 20.2) / 2.4) ** 2)));

export const istHourOf = (d: Date) => new Date(d.getTime() + IST_OFFSET_MS).getUTCHours();
export const fmtIst = (d: Date) =>
  new Date(d.getTime() + IST_OFFSET_MS)
    .toUTCString()
    .replace(/^(\w{3}), (\d{2}) (\w{3}) \d{4} (\d{2}:\d{2}):\d{2} GMT$/, "$1 $2 $3 · $4 IST");
export const fmtClock = (d: Date) =>
  `${String(new Date(d.getTime() + IST_OFFSET_MS).getUTCHours()).padStart(2, "0")}:00`;

/**
 * The full pipeline in one function: satellite fire detections -> wind transport
 * -> boundary-layer ventilation -> hyper-local micro-environment -> 48 hourly
 * values of PM2.5 with a widening confidence band.
 */
export function buildForecast(input: ForecastInput): Forecast {
  const start = input.startAt ?? new Date();
  const t0 = Math.floor(start.getTime() / 3600000) * 3600000;
  const startHourOfDay = istHourOf(new Date(t0));
  const baseline = input.baseline ?? 0;
  const label = input.label;

  // ---- per-source transport table (constant for the window) -------------
  type Source = {
    name: string;
    dist: number;
    align: number;
    travel: number;
    weight: number;
  };
  const sources: Source[] = [];
  for (const d of DISTRICTS) {
    const dist = distKm(d.lat, d.lng, input.lat, input.lng);
    if (dist > 900) continue;
    const brg = bearingTo(d.lat, d.lng, input.lat, input.lng);
    const w = windAt(d.lat, d.lng, 15, 0);
    const dirTo = (w.dirFrom + 180) % 360;
    const align = Math.cos((brg - dirTo) * DEG);
    if (align <= 0.08) continue;
    const travel = dist / plumeSpeed(w.speed);
    sources.push({
      name: d.name,
      dist,
      align: Math.max(0, align),
      travel,
      weight: d.weight,
    });
  }

  const seed = hashSeed(`${input.lat.toFixed(3)}:${input.lng.toFixed(3)}:${Math.floor(t0 / 86400000)}`);
  const next = rng(seed);
  let ar = next() * 0.5 - 0.25;

  const raw: number[] = [];
  const meta: { smokeRaw: number; local: number; dust: number; vent: number; mh: number; wind: ReturnType<typeof windAt> }[] = [];

  for (let i = 0; i < 48; i++) {
    const absHour = startHourOfDay + i;
    const hourOfDay = absHour % 24;
    const dayIndex = Math.floor(absHour / 24);
    const wind = windAt(input.lat, input.lng, hourOfDay, dayIndex);
    const mh = mixingHeight(hourOfDay, dayIndex);
    const vent = ventilationOf(mh);

    let sum = 0;
    for (const s of sources) {
      const emitHour = ((hourOfDay - s.travel) % 24 + 24) % 24;
      const emitDay = emitHour > hourOfDay ? dayIndex - 1 : dayIndex;
      const seasonal = 0.86 + 0.14 * Math.sin(emitDay * 0.7);
      sum +=
        s.weight *
        s.align *
        burnProfile(emitHour) *
        seasonal *
        Math.exp(-s.travel / 26) *
        (1 / (1 + (s.dist / 300) ** 1.5));
    }
    raw.push(sum);
    meta.push({ smokeRaw: sum, local: 0, dust: 0, vent, mh, wind });
  }

  // calibrate so a peak-season window lands in the 300-480 µg/m³ range
  const rawMax = Math.max(...raw, 1e-6);
  const scenarioStrength = 138 + 38 * Math.sin(Math.floor(startHourOfDay / 24) * 0.9 + 1.4);
  const smokeScale = scenarioStrength / rawMax;

  const hours: ForecastHour[] = [];
  for (let i = 0; i < 48; i++) {
    const t = new Date(t0 + i * 3600000);
    const m = meta[i];
    const smoke = m.smokeRaw * smokeScale;
    const local = 46 + baseline + trafficProfile(m.wind.lat ? istHourOf(t) : istHourOf(t)) * 0.9;
    const dust = 16 * Math.max(0, Math.sin((Math.PI * (istHourOf(t) - 9)) / 12)) * (2.6 / (1 + m.wind.speed));
    ar = 0.84 * ar + 0.16 * (next() * 2 - 1);
    const jitter = 1 + ar * 0.28;
    const pm25 = clamp((24 + local * 0.62 + smoke * 0.92 + dust) * m.vent * jitter, 12, 640);
    const spread = 0.1 + 0.0055 * i + 0.04 * Math.abs(ar);
    const aqi = aqiFromPm25(pm25);
    const cat = aqiCategory(aqi);
    const smokeShare = smoke / (26 + local + smoke + dust);
    const upwindFires = Math.round(FIRE_TOTAL * Math.min(1, m.smokeRaw / rawMax) * 0.46);

    let trigger: string | null = null;
    if (smokeShare > 0.46) trigger = "Smoke plume overhead";
    else if (m.vent > 2.4 && (istHourOf(t) >= 21 || istHourOf(t) <= 8)) trigger = "Inversion trap";
    else if (m.wind.speed < 1.3) trigger = "Near-calm winds";
    else if (m.mh > 900 && m.wind.speed > 3.6) trigger = "Ventilating";

    hours.push({
      i,
      time: t.toISOString(),
      hourOfDay: istHourOf(t),
      dayIndex: Math.floor((startHourOfDay + i) / 24),
      pm25: Math.round(pm25),
      low: Math.round(pm25 * (1 - spread)),
      high: Math.round(pm25 * (1 + spread)),
      aqi,
      category: cat.label,
      color: cat.color,
      windSpeed: Number(m.wind.speed.toFixed(1)),
      windDirFrom: Math.round(m.wind.dirFrom),
      mixingHeight: Math.round(m.mh),
      ventilation: Number(m.vent.toFixed(2)),
      smoke: Math.round(smoke),
      local: Math.round(local),
      dust: Math.round(dust),
      upwindFires,
      trigger,
    });
  }

  const peak = hours.reduce((a, b) => (b.pm25 > a.pm25 ? b : a), hours[0]);
  const now = hours[0];

  // worst 6-hour overnight window
  let peakNight = { start: hours[0].time, end: hours[5].time, avgPm25: 0 };
  for (let i = 0; i + 5 < hours.length; i++) {
    const window = hours.slice(i, i + 6);
    if (window.some((h) => h.hourOfDay >= 21 || h.hourOfDay <= 7)) {
      const avg = window.reduce((s, h) => s + h.pm25, 0) / window.length;
      if (avg > peakNight.avgPm25) {
        peakNight = { start: window[0].time, end: window[5].time, avgPm25: Math.round(avg) };
      }
    }
  }

  const avgPm25 = Math.round(hours.reduce((s, h) => s + h.pm25, 0) / hours.length);
  const smokeShare = hours.reduce((s, h) => s + h.smoke, 0) / hours.reduce((s, h) => s + h.pm25, 0);
  const hoursAbove300 = hours.filter((h) => h.pm25 > 300).length;

  // dominant source at the peak hour
  const dominant = sources
    .map((s) => ({ ...s, impact: s.weight * s.align * Math.exp(-s.travel / 26) * (1 / (1 + (s.dist / 300) ** 1.5)) }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);
  const lead = dominant[0];
  const arrival = new Date(new Date(peak.time).getTime() - lead.travel * 3600000);

  const fires = getFires();
  let upwindNow = 0;
  for (const f of fires) {
    const d = distKm(f.lat, f.lng, input.lat, input.lng);
    if (d > 750) continue;
    const brg = bearingTo(f.lat, f.lng, input.lat, input.lng);
    if (Math.cos((brg - (windAt(f.lat, f.lng, now.hourOfDay, 0).dirFrom + 180)) * DEG) > 0.45) upwindNow++;
  }

  const cat = aqiCategory(peak.aqi);
  const headline = `Peak ${Math.round(peak.pm25)} µg/m³ (${peak.category}) around ${fmtClock(new Date(peak.time))} tomorrow`;
  const summary =
    `Right now ${label} sits near ${Math.round(now.pm25)} µg/m³. ` +
    `Smoke from ${dominant.map((d) => d.name).slice(0, 2).join(" and ")} — about ${Math.round(lead.dist)} km upwind — ` +
    `needs roughly ${Math.round(lead.travel)} hours to reach you, so the plume that left the fields at ` +
    `${fmtClock(arrival)} lands on the city at ${fmtClock(new Date(peak.time))}. ` +
    `With the boundary layer compressed to ${now.mixingHeight} m and winds of ${now.windSpeed} m/s, ` +
    `everything stays trapped: expect ${hoursAbove300} hours above 300 µg/m³ in the next two days.`;

  return {
    label,
    lat: input.lat,
    lng: input.lng,
    profile: input.profile ?? "dense",
    generatedAt: new Date().toISOString(),
    startAt: new Date(t0).toISOString(),
    hours,
    now,
    peak,
    peakNight,
    averages: { pm25: avgPm25, smokeShare: Number(smokeShare.toFixed(2)) },
    hoursAbove300,
    transport: {
      sourceDistricts: dominant.map((d) => d.name),
      distanceKm: Math.round(lead.dist),
      travelHours: Number(lead.travel.toFixed(1)),
      arrival: arrival.toISOString(),
      fireCount: upwindNow,
    },
    summary,
    headline,
    advice: [cat.advice, `Purifier on by ${fmtClock(new Date(new Date(peak.time).getTime() - 4 * 3600000))} — the ramp-up is faster than the peak.`, `Cleanest outdoor window: the late-morning boundary-layer collapse is your friend only after ${fmtClock(new Date(new Date(peakNight.end).getTime() + 3 * 3600000))}.`],
  };
}

export const CATEGORY_STEPS = AQI_STEPS;

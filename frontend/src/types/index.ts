export interface FirePoint {
  id: string;
  lat: number;
  lon: number;
  frp: number; // Fire Radiative Power in MW
  confidence: number;
  district: string;
  state: 'Punjab' | 'Haryana';
  acqTime: string;
}

export interface HourlyForecast {
  hour: number; // 0 - 47
  timestamp: string; // ISO string
  timeLabel: string; // e.g. "Tomorrow 8 AM"
  pm25_p10: number; // 10th percentile (optimistic)
  pm25_p50: number; // 50th percentile (median forecast)
  pm25_p90: number; // 90th percentile (pessimistic peak)
  aqi: number; // Expected AQI index
  category: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe' | 'Severe+';
  windSpeed: number; // km/h
  windDir: string; // e.g. "NW"
  inversionHeight: number; // meters AGL (above ground level)
  temperature: number; // deg C
  sourceBreakdown: {
    stubble: number; // percentage
    local: number; // percentage
    stagnationFactor: number; // percentage
  };
}

export interface NeighborhoodData {
  id: string;
  name: string;
  pincode?: string;
  zone: 'Central' | 'South' | 'North' | 'East' | 'West' | 'Noida' | 'Gurugram' | 'Ghaziabad' | 'Faridabad';
  lat: number;
  lon: number;
  currentAqi: number;
  currentPm25?: number;
  currentCategory: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe' | 'Severe+';
  dominantSource: string;
  forecast: HourlyForecast[];
  bestWindow: {
    time: string;
    aqi: number;
    tip: string;
  };
  worstWindow: {
    time: string;
    aqi: number;
    tip: string;
  };
  scientificBriefing?: {
    headline: string;
    synopsis: string;
    meteorologicalDriver: string;
    guidance: string;
  };
  bedrockSummary?: {
    headline: string;
    briefing: string;
    schoolAdvice: string;
    exerciseAdvice: string;
    commuteAdvice: string;
  };
}

export interface SceneMeta {
  id: number;
  title: string;
  subtitle: string;
  altitude: string;
  sensor: string;
  resolution: string;
  awsService: string;
  description: string;
  keyFact: string;
}

export interface SceneNarrative {
  id: number;
  chapter: string;
  timeSeconds: number; // e.g., 0, 12, 24, 36, 48
  title: string;
  serifHeadline: string;
  subtitle: string;
  body: string;
  keyFact: string;
  sensorChip: string;
  sourceAttribution: string;
  technicalTelemetry: {
    label: string;
    value: string;
  }[];
}

export type SceneId = 0 | 1 | 2 | 3 | 4;

export interface AlertSignupRequest {
  email: string;
  neighborhoodId: string;
  neighborhoodName: string;
  thresholdAqi: number;
}

export interface AlertSignupResponse {
  ok: boolean;
  isNew: boolean;
  message: string;
  subscription?: {
    id: number;
    email: string;
    neighborhoodId: string;
    neighborhoodName: string;
    thresholdAqi: number;
    active: boolean;
  };
  disclaimer: string;
  source: 'postgres' | 'demo_store';
}

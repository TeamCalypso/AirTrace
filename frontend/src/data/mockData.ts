import { FirePoint, NeighborhoodData, SceneMeta } from '../types';

export const SCENES: SceneMeta[] = [
  {
    id: 0,
    title: 'Orbit // 824 km Altitude',
    subtitle: 'Sentinel-5P TROPOMI Swath Sweep',
    altitude: '824,000 m',
    sensor: 'ESA Sentinel-5P (TROPOMI)',
    resolution: '3.5 km × 5.5 km Footprint',
    awsService: 'AWS Lambda + S3 EventBridge Ingestion',
    description:
      'Every afternoon at 13:30 local solar time, the ESA Sentinel-5P satellite scans the Indian subcontinent. Its ultraviolet-visible spectrometer captures regional tropospheric NO₂ and Ultraviolet Aerosol Index (UVAI), detecting massive smog footprints before they reach ground monitors.',
    keyFact: 'Detects elevated aerosol layers invisible to ground-level optical monitors'
  },
  {
    id: 1,
    title: 'Regional Source // 15 km Stratosphere',
    subtitle: 'VIIRS Farm Fire Cluster Detections',
    altitude: '15,000 m',
    sensor: 'NASA FIRMS (VIIRS 375m & MODIS)',
    resolution: '375 m High-Res Thermal Bands',
    awsService: 'AWS S3 Raw Lake + EventBridge Hourly Cron',
    description:
      'Post-monsoon paddy harvesting in Punjab and Haryana leaves farmers with a tight 3-week window to clear fields. NASA VIIRS detects thermal infrared anomalies, pinpointing exact fire clusters, fire radiative power (MW), and ignition times.',
    keyFact: '3,842 active farm fires detected in Punjab & Haryana in the last 24 hours'
  },
  {
    id: 2,
    title: 'Atmospheric Transport // 1,500 m Altitude',
    subtitle: 'Northwesterly Wind Particulate Vectors',
    altitude: '1,500 m',
    sensor: 'ECMWF ERA5 & Open-Meteo High-Res',
    resolution: 'Hourly 3D U/V Wind Grids @ 850 hPa',
    awsService: 'Amazon SageMaker Feature Pipeline',
    description:
      'Post-monsoon meteorology creates a persistent Northwesterly wind corridor blowing 15–25 km/h across the flat Indo-Gangetic Plains. Smoke plumes are swept 250+ kilometers downwind straight into the landlocked Delhi NCR basin within 18–36 hours.',
    keyFact: 'Northwesterly trajectory aligns with 78% of severe smog spikes in Delhi'
  },
  {
    id: 3,
    title: 'The Inversion Lid // 200 m Urban Canopy',
    subtitle: 'Boundary Layer Compression & Trapping',
    altitude: '200 m',
    sensor: 'Boundary Layer Height (BLH) & Temperature dT/dz',
    resolution: 'Hourly Boundary Compression Models',
    awsService: 'LightGBM Quantile Inference on SageMaker',
    description:
      'As nocturnal radiation cools the ground, cold surface air gets trapped beneath warmer air aloft. This thermal inversion drops the atmospheric mixing boundary from 1,200m down to barely 150m, sealing Delhi like an airtight glass lid and multiplying particulate concentration by 3.5×.',
    keyFact: 'Surface wind speeds drop below 3 km/h, preventing horizontal ventilation'
  },
  {
    id: 4,
    title: 'Hyper-Local Ground // 3 km Forecast Grid',
    subtitle: '48-Hour Neighborhood Decision Engine',
    altitude: 'Surface Level',
    sensor: 'CPCB Ground Monitors + Fused Multi-Satellite ML',
    resolution: '~3 km Quantile Spatial Grid (p10/p50/p90)',
    awsService: 'Amazon Bedrock Summaries + Amazon SNS Alerts',
    description:
      '"Delhi will be severe" is not enough. A parent in Noida and a cyclist in Dwarka need hyper-local granularity. Explore 48-hour quantile forecasts with uncertainty bands, source attribution, best outdoor windows, and automated threshold alerts.',
    keyFact: 'Quantile model captures 92% of extreme air quality transitions'
  }
];

export const MOCK_FIRES: FirePoint[] = [
  { id: 'f-01', lat: 31.63, lon: 74.87, frp: 142.5, confidence: 96, district: 'Amritsar', state: 'Punjab', acqTime: '13:42 IST' },
  { id: 'f-02', lat: 31.45, lon: 74.92, frp: 188.2, confidence: 99, district: 'Tarn Taran', state: 'Punjab', acqTime: '13:42 IST' },
  { id: 'f-03', lat: 30.90, lon: 75.85, frp: 95.4, confidence: 88, district: 'Ludhiana', state: 'Punjab', acqTime: '13:43 IST' },
  { id: 'f-04', lat: 30.24, lon: 75.84, frp: 210.8, confidence: 100, district: 'Sangrur', state: 'Punjab', acqTime: '13:44 IST' },
  { id: 'f-05', lat: 30.15, lon: 74.95, frp: 165.0, confidence: 95, district: 'Bathinda', state: 'Punjab', acqTime: '13:44 IST' },
  { id: 'f-06', lat: 30.91, lon: 74.62, frp: 130.3, confidence: 91, district: 'Firozpur', state: 'Punjab', acqTime: '13:42 IST' },
  { id: 'f-07', lat: 29.80, lon: 76.40, frp: 88.6, confidence: 85, district: 'Kaithal', state: 'Haryana', acqTime: '13:45 IST' },
  { id: 'f-08', lat: 29.68, lon: 76.98, frp: 105.1, confidence: 89, district: 'Karnal', state: 'Haryana', acqTime: '13:46 IST' },
  { id: 'f-09', lat: 29.53, lon: 75.03, frp: 74.2, confidence: 82, district: 'Sirsa', state: 'Haryana', acqTime: '13:44 IST' },
  { id: 'f-10', lat: 29.52, lon: 75.45, frp: 118.7, confidence: 93, district: 'Fatehabad', state: 'Haryana', acqTime: '13:45 IST' },
  { id: 'f-11', lat: 30.38, lon: 76.38, frp: 154.2, confidence: 97, district: 'Patiala', state: 'Punjab', acqTime: '13:45 IST' },
  { id: 'f-12', lat: 30.04, lon: 76.87, frp: 82.0, confidence: 84, district: 'Kurukshetra', state: 'Haryana', acqTime: '13:46 IST' },
  { id: 'f-13', lat: 30.56, lon: 75.92, frp: 177.3, confidence: 98, district: 'Malerkotla', state: 'Punjab', acqTime: '13:43 IST' },
  { id: 'f-14', lat: 31.12, lon: 75.34, frp: 122.9, confidence: 92, district: 'Moga', state: 'Punjab', acqTime: '13:43 IST' },
  { id: 'f-15', lat: 31.32, lon: 75.58, frp: 98.4, confidence: 87, district: 'Jalandhar', state: 'Punjab', acqTime: '13:43 IST' }
];

// Helper to generate 48-hour quantile forecasts
const generate48hForecast = (baseAqi: number, variance: number, peakHourOffset: number = 7) => {
  const result = [];
  const now = new Date();
  
  for (let h = 0; h < 48; h++) {
    const time = new Date(now.getTime() + h * 3600 * 1000);
    const hourOfDay = time.getHours();
    
    // Diurnal inversion curve: peak early morning (6-9 AM), minimum afternoon (2-4 PM)
    const diurnalFactor = Math.sin(((hourOfDay - peakHourOffset) / 24) * 2 * Math.PI);
    // Multi-day accumulation trend
    const trendFactor = (h / 48) * 45;
    
    const medianAqi = Math.round(baseAqi + diurnalFactor * (variance * 0.8) + trendFactor);
    const boundedAqi = Math.max(80, Math.min(498, medianAqi));
    
    const p50_pm25 = Math.round(boundedAqi * 0.72);
    const p10_pm25 = Math.round(p50_pm25 * 0.82); // optimistic
    const p90_pm25 = Math.round(p50_pm25 * 1.28); // pessimistic
    
    let category: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe' | 'Severe+' = 'Moderate';
    if (boundedAqi <= 50) category = 'Good';
    else if (boundedAqi <= 100) category = 'Satisfactory';
    else if (boundedAqi <= 200) category = 'Moderate';
    else if (boundedAqi <= 300) category = 'Poor';
    else if (boundedAqi <= 400) category = 'Very Poor';
    else if (boundedAqi <= 450) category = 'Severe';
    else category = 'Severe+';

    // Inversion height: lowest at night (120-250m), highest at afternoon (800-1400m)
    const invHeight = Math.round(300 - diurnalFactor * 600 + 400);

    const isDay = hourOfDay >= 6 && hourOfDay <= 18;
    const dayLabel = h < 24 ? (h === 0 ? 'Now' : `Today`) : `Tomorrow`;
    const hourLabel = `${time.getHours().toString().padStart(2, '0')}:00`;

    result.push({
      hour: h,
      timestamp: time.toISOString(),
      timeLabel: `${dayLabel} ${hourLabel}`,
      pm25_p10: p10_pm25,
      pm25_p50: p50_pm25,
      pm25_p90: p90_pm25,
      aqi: boundedAqi,
      category,
      windSpeed: Math.max(3, Math.round(12 - diurnalFactor * 6)),
      windDir: 'NW',
      inversionHeight: Math.max(120, invHeight),
      temperature: Math.round(18 + (isDay ? 7 : -4) - diurnalFactor * 2),
      sourceBreakdown: {
        stubble: Math.round(42 + diurnalFactor * 8),
        local: Math.round(35 - diurnalFactor * 5),
        stagnationFactor: Math.round(23 - diurnalFactor * 3)
      }
    });
  }
  return result;
};

export const NEIGHBORHOODS: NeighborhoodData[] = [
  {
    id: 'anand-vihar',
    name: 'Anand Vihar',
    zone: 'East',
    lat: 28.647,
    lon: 77.316,
    currentAqi: 442,
    currentCategory: 'Severe',
    dominantSource: 'Regional Stubble Plume (48%) + ISBT Heavy Diesel Fleet (34%)',
    forecast: generate48hForecast(410, 55, 6),
    bestWindow: {
      time: 'Tomorrow 14:00 – 16:30',
      aqi: 278,
      tip: 'Boundary layer expansion momentarily disperses fine particulates; still requires N95 for sensitive groups.'
    },
    worstWindow: {
      time: 'Tomorrow 06:00 – 09:00',
      aqi: 486,
      tip: 'Severe inversion lid below 140m. Stagnant diesel exhaust combines with stubble smoke. Hazardous for all individuals.'
    },
    bedrockSummary: {
      headline: 'Extreme nocturnal inversion compounds heavy border transit emissions.',
      briefing:
        'AWS SageMaker LightGBM model predicts Anand Vihar will touch the Severe+ threshold (>450 AQI) starting midnight as surface winds drop to 2.4 km/h. Regional stubble smoke transported via the NW corridor is trapped beneath a 140m inversion ceiling.',
      schoolAdvice: 'Suspend all early morning outdoor assemblies and sports sessions until 11:30 AM.',
      exerciseAdvice: 'High cardio running or cycling strictly discouraged outdoors. Exercise indoors with HEPA filtration.',
      commuteAdvice: 'Keep vehicle windows sealed with recirculated cabin air active when transiting near the ISBT hub.'
    }
  },
  {
    id: 'dwarka-sec-8',
    name: 'Dwarka Sector 8',
    zone: 'South',
    lat: 28.571,
    lon: 77.071,
    currentAqi: 368,
    currentCategory: 'Very Poor',
    dominantSource: 'Regional Transport (52%) + Airport/Highway Dust (26%)',
    forecast: generate48hForecast(340, 48, 7),
    bestWindow: {
      time: 'Today 15:00 – 17:00',
      aqi: 224,
      tip: 'Moderate thermal lifting creates a short window for brief outdoor errands.'
    },
    worstWindow: {
      time: 'Tomorrow 07:00 – 09:30',
      aqi: 425,
      tip: 'Spike driven by incoming Haryana plume arrival coupled with school run traffic.'
    },
    bedrockSummary: {
      headline: 'Open sub-city layout experiences acute morning transport plumes.',
      briefing:
        'Dwarka benefits from relatively wider open corridors, but satellite trajectory models show direct alignment with the incoming Rohtak-Jhajjar plume corridor. PM2.5 median will remain in Very Poor range with hazardous peaks at dawn.',
      schoolAdvice: 'Keep primary students indoors; ensure classrooms maintain closed doors.',
      exerciseAdvice: 'Opt for late afternoon walks (3 PM to 5 PM); avoid morning jogs near Sector 21 trunk roads.',
      commuteAdvice: 'Expect dense morning smog haze causing visibility reduction to under 400m near UER-II.'
    }
  },
  {
    id: 'noida-sec-62',
    name: 'Noida Sector 62',
    zone: 'Noida',
    lat: 28.627,
    lon: 77.365,
    currentAqi: 395,
    currentCategory: 'Very Poor',
    dominantSource: 'Regional Stubble (44%) + Construction & Expressway Dust (32%)',
    forecast: generate48hForecast(370, 52, 7),
    bestWindow: {
      time: 'Tomorrow 13:30 – 16:00',
      aqi: 245,
      tip: 'Afternoon sun creates surface thermals, reducing surface PM2.5 levels by 30%.'
    },
    worstWindow: {
      time: 'Tonight 23:00 – 08:00',
      aqi: 452,
      tip: 'Night freight truck entry through NH-24 corridor coincides with inversion descent.'
    },
    bedrockSummary: {
      headline: 'Expressway traffic corridor traps regional smoke along eastern perimeter.',
      briefing:
        'CAMS aerosol forecasts coupled with Sentinel-5P NO₂ indicate severe nitrogen dioxide and soot mixing along Noida-Greater Noida belt. The inversion ceiling is projected to drop to 160m by 1:00 AM.',
      schoolAdvice: 'Shift sports activities to post-lunch period.',
      exerciseAdvice: 'Avoid outdoor workouts along corporate green belts in the early morning.',
      commuteAdvice: 'Turn on fog lamps; visibility around Electronic City may dip sharply.'
    }
  },
  {
    id: 'connaught-place',
    name: 'Connaught Place',
    zone: 'Central',
    lat: 28.631,
    lon: 77.219,
    currentAqi: 335,
    currentCategory: 'Very Poor',
    dominantSource: 'Urban Vehicular Congestion (45%) + Stubble Drift (35%)',
    forecast: generate48hForecast(320, 42, 8),
    bestWindow: {
      time: 'Tomorrow 14:00 – 16:30',
      aqi: 212,
      tip: 'Best window in Central Delhi as urban heat island creates slight updraft.'
    },
    worstWindow: {
      time: 'Tomorrow 08:30 – 10:30',
      aqi: 388,
      tip: 'Peak office hour traffic meets delayed inversion breakup.'
    },
    bedrockSummary: {
      headline: 'Central urban core shows moderate buffering from heat island effect.',
      briefing:
        'Connaught Place exhibits a 1.8°C thermal buffer compared to peripheral areas, delaying the nocturnal inversion descent by ~90 minutes. However, heavy arterial vehicle volume maintains elevated ultrafine particle counts.',
      schoolAdvice: 'Standard GRAP Stage III restrictions apply.',
      exerciseAdvice: 'Central Park evening strolls acceptable with N95 mask; skip morning runs.',
      commuteAdvice: 'Metro transit strongly advised to avoid idling in congested inner/outer circles.'
    }
  },
  {
    id: 'gurugram-cyber-city',
    name: 'Gurugram Cyber City',
    zone: 'Gurugram',
    lat: 28.495,
    lon: 77.089,
    currentAqi: 355,
    currentCategory: 'Very Poor',
    dominantSource: 'Regional Stubble (40%) + Diesel Generator / Commercial Fleet (38%)',
    forecast: generate48hForecast(340, 50, 7),
    bestWindow: {
      time: 'Tomorrow 14:00 – 16:00',
      aqi: 230,
      tip: 'Afternoon wind pickup to 14 km/h provides temporary ventilation.'
    },
    worstWindow: {
      time: 'Tomorrow 06:30 – 09:00',
      aqi: 418,
      tip: 'Severe smog layer blankets DLF Phase 2 & 3 valleys.'
    },
    bedrockSummary: {
      headline: 'Aravalli ridge barrier creates localized wind eddies and smoke pooling.',
      briefing:
        'Terrain interactions along the Aravalli foothills trap the incoming Haryana smoke plume on the western edge of Cyber City. High ambient sulfur and carbon dioxide readings correlate with commercial power backup emissions.',
      schoolAdvice: 'Corporate preschools and daycares to enforce indoor play only.',
      exerciseAdvice: 'Avoid outdoor cycling along Golf Course Extension Road.',
      commuteAdvice: 'Heavy congestion expected on NH-48; air purifiers recommended in cabs.'
    }
  },
  {
    id: 'rohini-sec-16',
    name: 'Rohini Sector 16',
    zone: 'North',
    lat: 28.732,
    lon: 77.121,
    currentAqi: 418,
    currentCategory: 'Severe',
    dominantSource: 'Direct Northern Stubble Plume Entry (62%) + Local Biomass (22%)',
    forecast: generate48hForecast(390, 58, 6),
    bestWindow: {
      time: 'Tomorrow 14:30 – 16:30',
      aqi: 260,
      tip: 'Brief dip into high-poor range during peak solar insolation.'
    },
    worstWindow: {
      time: 'Tomorrow 05:30 – 08:30',
      aqi: 478,
      tip: 'Direct northwest frontal boundary brings fresh stubble aerosol pulse.'
    },
    bedrockSummary: {
      headline: 'North Delhi corridor acts as immediate gateway for incoming smoke.',
      briefing:
        'Being located at the northern perimeter of the capital, Rohini is the first major urban cluster to intercept the Sonipat-Panipat plume stream. VIIRS fire satellite tracking shows smoke entering Rohini with zero dilution time.',
      schoolAdvice: 'Recommend shift to online classes if AQI sustains above 450 as forecasted.',
      exerciseAdvice: 'No outdoor athletic activity recommended under any circumstance.',
      commuteAdvice: 'Heavy smoke-fog mixture on Outer Ring Road; exercise caution.'
    }
  },
  {
    id: 'rk-puram',
    name: 'RK Puram',
    zone: 'South',
    lat: 28.566,
    lon: 77.177,
    currentAqi: 375,
    currentCategory: 'Very Poor',
    dominantSource: 'Regional Influx (46%) + Ring Road Traffic (36%)',
    forecast: generate48hForecast(350, 46, 7),
    bestWindow: {
      time: 'Tomorrow 14:00 – 16:30',
      aqi: 238,
      tip: 'Slight clearing during mid-afternoon.'
    },
    worstWindow: {
      time: 'Tomorrow 07:00 – 09:30',
      aqi: 432,
      tip: 'Inversion compression traps vehicle emissions at ground level.'
    },
    bedrockSummary: {
      headline: 'Residential South Delhi sees significant night-time stagnation.',
      briefing:
        'Model predicts strong correlation between low night-time temperatures (12°C) and boundary layer height collapsing to 170m. Vulnerable demographics including senior citizens and asthmatic patients face elevated acute exposure.',
      schoolAdvice: 'Keep indoor air purifiers running on continuous mode.',
      exerciseAdvice: 'Limit walking to sheltered indoor tracks.',
      commuteAdvice: 'Plan commute outside the 8 AM - 10 AM severe stagnation peak.'
    }
  },
  {
    id: 'punjabi-bagh',
    name: 'Punjabi Bagh',
    zone: 'West',
    lat: 28.669,
    lon: 77.132,
    currentAqi: 410,
    currentCategory: 'Severe',
    dominantSource: 'Bahadurgarh Transport Corridor (55%) + Industrial Ring (28%)',
    forecast: generate48hForecast(385, 54, 6),
    bestWindow: {
      time: 'Tomorrow 14:00 – 16:00',
      aqi: 255,
      tip: 'Narrow afternoon window.'
    },
    worstWindow: {
      time: 'Tomorrow 06:00 – 09:00',
      aqi: 468,
      tip: 'Severe stagnation and high soot concentration.'
    },
    bedrockSummary: {
      headline: 'West Delhi convergence zone experiences multi-source trapping.',
      briefing:
        'Industrial corridors along Mayapuri and Najafgarh combine with the Haryana stubble plume entering via Rohtak Road. LightGBM quantile p90 upper bound projects dangerous spikes reaching 480+ AQI.',
      schoolAdvice: 'Suspend all physical education classes.',
      exerciseAdvice: 'Outdoor running poses immediate bronchial strain; stay indoors.',
      commuteAdvice: 'Heavy diesel transit corridor creates localized soot spikes.'
    }
  }
];

export const HISTORICAL_SCENARIOS = {
  current: {
    label: 'Current 48h Live Model',
    description: 'Fused Sentinel-5P + VIIRS + ERA5 LightGBM Quantile Forecast'
  },
  diwaliPeak: {
    label: 'Diwali Week Replay (Historical Spike)',
    description: 'Actual vs Predicted PM2.5 surge during post-harvest firecracker peak (AQI 490+)'
  },
  cleanBaseline: {
    label: 'Post-Western Disturbance (Clean Air)',
    description: 'Strong westerly winds (28 km/h) clearing the NCR basin down to AQI 85'
  }
};

import type { FirePoint, NeighborhoodData, SceneNarrative, HourlyForecast } from '../types';

export const SCENES: SceneNarrative[] = [
  {
    id: 0,
    chapter: 'CH. 01 / 05',
    timeSeconds: 0,
    title: 'ORBITAL OBSERVATION',
    serifHeadline: 'From Orbit to Anand Vihar',
    subtitle: 'Sentinel-5P · TROPOMI spectrometer · 824 km altitude',
    body: 'Every afternoon at 13:30 local solar time, the European Space Agency’s Sentinel-5P satellite sweeps across the Indian subcontinent. Its ultraviolet-visible TROPOMI spectrometer maps total column nitrogen dioxide and aerosol index across a 2,600 km swath—detecting dense regional smog fronts long before surface monitors record their first spike.',
    keyFact: 'TROPOMI measures tropospheric aerosol optical depth with 3.5 × 5.5 km ground resolution.',
    sensorChip: 'ESA SENTINEL-5P · TROPOMI UV-VIS',
    sourceAttribution: 'European Space Agency Copernicus Open Access Hub',
    technicalTelemetry: [
      { label: 'ALTITUDE', value: '824.2 KM' },
      { label: 'SWATH WIDTH', value: '2,600 KM' },
      { label: 'SPECTRAL BAND', value: '270–500 NM' },
      { label: 'ORBIT', value: 'SUN-SYNCHRONOUS' },
    ],
  },
  {
    id: 1,
    chapter: 'CH. 02 / 05',
    timeSeconds: 12,
    title: 'THERMAL FLUX',
    serifHeadline: '3,840 Harvest Fires Ignite the Northern Plains',
    subtitle: 'NASA FIRMS · Suomi-NPP VIIRS · 375 m thermal infrared',
    body: 'Between the post-monsoon harvest of non-basmati paddy and wheat sowing, farmers face a critical 20-day planting window. Satellite thermal sensors capture agricultural fires blazing across Punjab and Haryana. VIIRS 375 m channels detect exact combustion centroids and Fire Radiative Power (MW) in near real-time, converting thermal anomalies into emission rate estimates.',
    keyFact: 'Fire Radiative Power (FRP) directly scales with mass emission rate of fine particulates (PM₂.₅).',
    sensorChip: 'NASA FIRMS · VIIRS 375M I-BAND',
    sourceAttribution: 'NASA Land, Atmosphere Near real-time Capability for EOS (LANCE)',
    technicalTelemetry: [
      { label: 'FIRE DETECTIONS', value: '3,842 CENTROIDS' },
      { label: 'PEAK RADIATIVE POWER', value: '210 MW (SANGRUR)' },
      { label: 'OPTICAL RESOLUTION', value: '375 METERS' },
      { label: 'OVERPASS WINDOW', value: '13:15–14:30 IST' },
    ],
  },
  {
    id: 2,
    chapter: 'CH. 03 / 05',
    timeSeconds: 24,
    title: 'REGIONAL TRANSPORT',
    serifHeadline: 'A 250-Kilometer Elevated Smoke Corridor',
    subtitle: 'ECMWF ERA5 & GFS · 850 hPa Wind Advection Trajectory',
    body: 'Post-monsoon synoptic weather patterns establish persistent northwesterlies over the flat Indo-Gangetic basin. Flowing at 14 to 22 km/h at the 850 hPa level (~1,500 m altitude), these winds guide smoke plumes along the river valley toward Delhi NCR. Transport takes 18 to 36 hours—creating a predictable advection corridor without implying deterministic certainty.',
    keyFact: '78% of severe late-autumn episodic smog days in Delhi coincide with 280°–320° northwesterly vectors.',
    sensorChip: 'ECMWF ERA5 · 850 HPA ADVECTION',
    sourceAttribution: 'Copernicus Climate Change Service / Global Forecast System',
    technicalTelemetry: [
      { label: 'SYNOPTIC WIND', value: '312° NW @ 18.2 KM/H' },
      { label: 'TRANSIT TIME', value: '24–32 HOURS' },
      { label: 'TRANSPORT LAYER', value: '850 HPA (~1,500 M)' },
      { label: 'TRAJECTORY UNCERTAINTY', value: '±14° ENVELOPE' },
    ],
  },
  {
    id: 3,
    chapter: 'CH. 04 / 05',
    timeSeconds: 36,
    title: 'THERMAL INVERSION',
    serifHeadline: 'The Nocturnal Lid Clamps Over Delhi',
    subtitle: 'Atmospheric Boundary Layer Collapse · Radiational Stagnation',
    body: 'As dusk approaches, clear skies and dry air trigger rapid radiational cooling of the ground surface. Cold air sinks while warmer air stays aloft, creating a steep temperature inversion. The planetary boundary layer collapses from 1,300 m during midday to barely 140 m before dawn—sealing transported smoke and local vehicular emissions beneath an airtight atmospheric lid.',
    keyFact: 'Boundary layer compression increases ground-level PM₂.₅ concentration by over 300% without new emissions.',
    sensorChip: 'METEOROLOGICAL INVERSION DIAGNOSTIC',
    sourceAttribution: 'India Meteorological Department / Open-Meteo Sounding Profiler',
    technicalTelemetry: [
      { label: 'MIXING HEIGHT', value: '142 M (COLLAPSED)' },
      { label: 'SURFACE VENTILATION', value: '< 2.4 KM/H (STAGNANT)' },
      { label: 'INVERSION DELTA', value: '+3.2°C / 100M' },
      { label: 'VOLUME COMPRESSION', value: '9.1× FACTOR' },
    ],
  },
  {
    id: 4,
    chapter: 'CH. 05 / 05',
    timeSeconds: 48,
    title: 'NEIGHBORHOOD RESOLUTION',
    serifHeadline: 'From Continental Scale to Your Street',
    subtitle: 'Quantile LightGBM Fusion · 3 km Grid Hyperlocal Outlook',
    body: 'Airtrace fuses satellite aerosol swaths, thermal fire energy, wind trajectories, and nocturnal mixing dynamics into a localized 48-hour probabilistic forecast. By combining regional advection with neighborhood topography and local traffic patterns, each ward receives its specific outlook—complete with uncertainty bounds and optimal activity windows.',
    keyFact: 'Quantile predictions provide 10th (optimistic) and 90th (pessimistic peak) bands for risk management.',
    sensorChip: 'AIRTRACE QUANTILE LIGHTGBM · 3 KM GRID',
    sourceAttribution: 'CPCB CAAQMS Ground Calibration Baseline + OpenAQ API',
    technicalTelemetry: [
      { label: 'SPATIAL RESOLUTION', value: '3.0 KM NEIGHBORHOOD' },
      { label: 'TEMPORAL STEP', value: 'HOURLY (48-H HORIZON)' },
      { label: 'COVERAGE CONFIDENCE', value: '92% QUANTILE BAND' },
      { label: 'TARGET BASIN', value: 'DELHI-NCR URBAN METRO' },
    ],
  },
];

export const MOCK_FIRES: FirePoint[] = [
  { id: 'f-01', lat: 31.63, lon: 74.87, frp: 142, confidence: 94, district: 'Amritsar', state: 'Punjab', acqTime: '13:22 IST' },
  { id: 'f-02', lat: 31.45, lon: 74.92, frp: 188, confidence: 99, district: 'Tarn Taran', state: 'Punjab', acqTime: '13:24 IST' },
  { id: 'f-03', lat: 30.90, lon: 75.85, frp: 95, confidence: 88, district: 'Ludhiana', state: 'Punjab', acqTime: '13:28 IST' },
  { id: 'f-04', lat: 30.24, lon: 75.84, frp: 210, confidence: 100, district: 'Sangrur', state: 'Punjab', acqTime: '13:30 IST' },
  { id: 'f-05', lat: 30.15, lon: 74.95, frp: 165, confidence: 96, district: 'Bathinda', state: 'Punjab', acqTime: '13:32 IST' },
  { id: 'f-06', lat: 30.91, lon: 74.62, frp: 130, confidence: 91, district: 'Firozpur', state: 'Punjab', acqTime: '13:35 IST' },
  { id: 'f-07', lat: 30.56, lon: 75.92, frp: 177, confidence: 97, district: 'Barnala', state: 'Punjab', acqTime: '13:36 IST' },
  { id: 'f-08', lat: 30.82, lon: 75.17, frp: 154, confidence: 93, district: 'Moga', state: 'Punjab', acqTime: '13:38 IST' },
  { id: 'f-09', lat: 29.80, lon: 76.40, frp: 89, confidence: 85, district: 'Kaithal', state: 'Haryana', acqTime: '13:42 IST' },
  { id: 'f-10', lat: 29.68, lon: 76.98, frp: 105, confidence: 90, district: 'Karnal', state: 'Haryana', acqTime: '13:45 IST' },
  { id: 'f-11', lat: 29.53, lon: 75.03, frp: 74, confidence: 82, district: 'Sirsa', state: 'Haryana', acqTime: '13:46 IST' },
  { id: 'f-12', lat: 29.96, lon: 76.88, frp: 118, confidence: 89, district: 'Kurukshetra', state: 'Haryana', acqTime: '13:48 IST' },
  { id: 'f-13', lat: 30.38, lon: 76.38, frp: 162, confidence: 95, district: 'Patiala', state: 'Punjab', acqTime: '13:50 IST' },
  { id: 'f-14', lat: 31.12, lon: 75.34, frp: 123, confidence: 91, district: 'Jalandhar', state: 'Punjab', acqTime: '13:52 IST' },
  { id: 'f-15', lat: 30.04, lon: 76.87, frp: 88, confidence: 87, district: 'Fatehabad', state: 'Haryana', acqTime: '13:55 IST' },
];

function generateHourlyOutlook(baseAqi: number, variance: number): HourlyForecast[] {
  const result: HourlyForecast[] = [];
  const startHour = 18; // starts at 6 PM current day

  for (let i = 0; i < 48; i++) {
    const hourClock = (startHour + i) % 24;
    const isDay2 = i >= 24;
    const dayLabel = i < 6 ? 'Today' : i < 30 ? 'Tomorrow' : 'Day 3';
    const ampm = hourClock >= 12 ? 'PM' : 'AM';
    const hourDisplay = hourClock === 0 ? 12 : hourClock > 12 ? hourClock - 12 : hourClock;
    const timeLabel = `${dayLabel} ${hourDisplay}:00 ${ampm}`;

    // Diurnal inversion curve:
    // Highest at 06:00 - 08:00 AM (inversion lid clamped + morning rush)
    // Lowest at 14:00 - 16:00 PM (maximum solar heating + deeper mixing layer)
    let diurnalMultiplier = 1.0;
    let invHeight = 650;
    let wind = 12;

    if (hourClock >= 3 && hourClock <= 8) {
      diurnalMultiplier = 1.35; // morning peak
      invHeight = 120 + Math.sin(hourClock) * 30;
      wind = 3.5;
    } else if (hourClock >= 13 && hourClock <= 16) {
      diurnalMultiplier = 0.68; // afternoon clearance
      invHeight = 1350 + Math.sin(hourClock) * 150;
      wind = 16.5;
    } else if (hourClock >= 19 || hourClock <= 2) {
      diurnalMultiplier = 1.15; // evening accumulation
      invHeight = 280;
      wind = 6.0;
    }

    // Synoptic stubble plume pulse arriving around hours 10 to 26
    const plumeInfluence = Math.exp(-Math.pow((i - 18) / 9, 2)) * 55;

    const p50 = Math.round(Math.min(498, Math.max(90, (baseAqi + plumeInfluence) * diurnalMultiplier + (Math.sin(i * 0.4) * variance))));
    const p10 = Math.round(Math.max(65, p50 * 0.76 - 15));
    const p90 = Math.round(Math.min(500, p50 * 1.26 + 22));

    let category: HourlyForecast['category'] = 'Moderate';
    if (p50 <= 50) category = 'Good';
    else if (p50 <= 100) category = 'Satisfactory';
    else if (p50 <= 200) category = 'Moderate';
    else if (p50 <= 300) category = 'Poor';
    else if (p50 <= 400) category = 'Very Poor';
    else if (p50 <= 450) category = 'Severe';
    else category = 'Severe+';

    // Source breakdown dynamics
    const stubbleShare = Math.round(Math.min(58, Math.max(18, 22 + plumeInfluence * 0.55)));
    const stagnationShare = Math.round(Math.min(42, Math.max(12, (1400 - invHeight) / 1400 * 35)));
    const localShare = Math.max(15, 100 - stubbleShare - stagnationShare);

    result.push({
      hour: i,
      timestamp: new Date(Date.now() + i * 3600000).toISOString(),
      timeLabel,
      pm25_p10: Math.round(p10 * 0.62),
      pm25_p50: Math.round(p50 * 0.62),
      pm25_p90: Math.round(p90 * 0.62),
      aqi: p50,
      category,
      windSpeed: Number((wind + Math.sin(i * 0.3) * 2).toFixed(1)),
      windDir: hourClock > 10 && hourClock < 18 ? 'WNW' : 'NW',
      inversionHeight: Math.round(invHeight),
      temperature: Math.round(28 - (hourClock < 6 ? 11 : hourClock < 14 ? 4 : 0) + Math.sin(hourClock * 0.25) * 3),
      sourceBreakdown: {
        stubble: stubbleShare,
        local: localShare,
        stagnationFactor: stagnationShare,
      },
    });
  }

  return result;
}

export const NEIGHBORHOODS: NeighborhoodData[] = [
  {
    id: 'anand-vihar',
    name: 'Anand Vihar',
    pincode: '110092',
    zone: 'East',
    lat: 28.6508,
    lon: 77.3152,
    currentAqi: 412,
    currentPm25: 258,
    currentCategory: 'Severe',
    dominantSource: 'Regional Transport (44%) + Interstate Bus Terminus Fleets (32%)',
    forecast: generateHourlyOutlook(390, 20),
    bestWindow: {
      time: 'Tomorrow 2:00 PM – 4:00 PM',
      aqi: 235,
      tip: 'Solar heating lifts thermal lid to 1,200 m; afternoon ventilation peaks.',
    },
    worstWindow: {
      time: 'Tomorrow 6:00 AM – 8:30 AM',
      aqi: 462,
      tip: 'Severe nocturnal inversion + heavy bus terminal diesel idle.',
    },
    scientificBriefing: {
      headline: 'Severe Inversion Traps Incoming Northwest Plume at Ground Level',
      synopsis: 'Anand Vihar lies at the boundary of Delhi and Uttar Pradesh. Regional stubble smoke advected along the Yamuna channel combines with high local diesel emissions from the ISBT.',
      meteorologicalDriver: 'Mixing height collapses to 130 m at 05:30 IST; surface wind below 2 km/h.',
      guidance: 'Avoid all outdoor cardio during dawn hours. Keep HEPA filtration active indoors.',
    },
  },
  {
    id: 'connaught-place',
    name: 'Connaught Place',
    pincode: '110001',
    zone: 'Central',
    lat: 28.6315,
    lon: 77.2167,
    currentAqi: 318,
    currentPm25: 198,
    currentCategory: 'Very Poor',
    dominantSource: 'Urban Vehicular Gridlock (48%) + Entrained Stubble Smoke (36%)',
    forecast: generateHourlyOutlook(310, 15),
    bestWindow: {
      time: 'Tomorrow 1:30 PM – 4:30 PM',
      aqi: 195,
      tip: 'Central urban heat island slightly enhances vertical buoyancy midday.',
    },
    worstWindow: {
      time: 'Tomorrow 7:30 AM – 9:30 AM',
      aqi: 388,
      tip: 'Morning rush hour vehicles combine with trapped nighttime aerosol.',
    },
    scientificBriefing: {
      headline: 'Urban Canyon Effect Compounds Moderate Background Transport',
      synopsis: 'Dense central colonial radial corridors trap vehicular exhaust beneath the synoptic transport layer until solar heating initiates surface thermals.',
      meteorologicalDriver: 'Slight thermal island effect (+1.8°C over rural fringe) maintains minimal air movement.',
      guidance: 'Sensitive groups should use N95 respirators for active pedestrian transit.',
    },
  },
  {
    id: 'dwarka-sec8',
    name: 'Dwarka Sector 8',
    pincode: '110077',
    zone: 'West',
    lat: 28.5714,
    lon: 77.0673,
    currentAqi: 285,
    currentPm25: 172,
    currentCategory: 'Poor',
    dominantSource: 'Regional Smoke Fringe (38%) + Airport Ground Corridors (26%)',
    forecast: generateHourlyOutlook(280, 18),
    bestWindow: {
      time: 'Tomorrow 2:00 PM – 5:00 PM',
      aqi: 165,
      tip: 'Open western topography allows faster dispersion as breezes pick up.',
    },
    worstWindow: {
      time: 'Tomorrow 6:00 AM – 8:00 AM',
      aqi: 342,
      tip: 'Nocturnal stagnation traps low-level moisture and aerosol.',
    },
    scientificBriefing: {
      headline: 'Open Plain Dispersion Moderates Local Concentrations',
      synopsis: 'Dwarka benefits from relatively wider planned avenues and western open green belts, but remains directly in the path of the Punjab-Haryana advection vector.',
      meteorologicalDriver: 'Southwesterly wind shear in the afternoon accelerates boundary layer dilution.',
      guidance: 'Afternoon school transit is favorable; limit morning pre-dawn jogs.',
    },
  },
  {
    id: 'rohini-sec16',
    name: 'Rohini Sector 16',
    pincode: '110089',
    zone: 'North',
    lat: 28.7363,
    lon: 77.1235,
    currentAqi: 375,
    currentPm25: 232,
    currentCategory: 'Very Poor',
    dominantSource: 'Direct Stubble Advection (52%) + Industrial Cluster Boundary (24%)',
    forecast: generateHourlyOutlook(365, 22),
    bestWindow: {
      time: 'Tomorrow 1:00 PM – 3:30 PM',
      aqi: 215,
      tip: 'Deep convective mixing temporarily disperses ground-level smoke plume.',
    },
    worstWindow: {
      time: 'Tomorrow 5:30 AM – 8:00 AM',
      aqi: 435,
      tip: 'First entry point of Sonipat-Haryana smoke front into Delhi NCT.',
    },
    scientificBriefing: {
      headline: 'Northern Gateway Receives Direct Stubble Transport First',
      synopsis: 'Rohini sits on the northern frontier of Delhi, making it the earliest recipient of stubble plume fronts carried along the NH-44 transport axis.',
      meteorologicalDriver: 'Direct downwind path from Karnal-Panipat agricultural clusters.',
      guidance: 'Children and asthmatic residents should remain indoors during morning hours.',
    },
  },
  {
    id: 'lodhi-road',
    name: 'Lodhi Road',
    pincode: '110003',
    zone: 'South',
    lat: 28.5912,
    lon: 77.2274,
    currentAqi: 265,
    currentPm25: 160,
    currentCategory: 'Poor',
    dominantSource: 'Regional Background (42%) + Institutional Canopy Filtering (18%)',
    forecast: generateHourlyOutlook(255, 14),
    bestWindow: {
      time: 'Tomorrow 1:00 PM – 4:30 PM',
      aqi: 148,
      tip: 'Surrounding heritage gardens and broad tree cover assist particulate deposition.',
    },
    worstWindow: {
      time: 'Tomorrow 6:30 AM – 8:30 AM',
      aqi: 320,
      tip: 'Nocturnal cold air drainage from south-central ridge.',
    },
    scientificBriefing: {
      headline: 'Lutyens Green Canopy Buffers Peak Regional Smog Episodes',
      synopsis: 'Lodhi Road and surrounding heritage gardens maintain the lowest baseline particulate counts in urban Delhi, though regional plumes still cause severe spikes during deep inversions.',
      meteorologicalDriver: 'Canopy roughness dampens ground-level turbulence while filtering coarse fractions.',
      guidance: 'Ideal spot for moderate outdoor walks during the mid-afternoon window.',
    },
  },
  {
    id: 'noida-sec62',
    name: 'Noida Sector 62',
    pincode: '201309',
    zone: 'Noida',
    lat: 28.6271,
    lon: 77.3688,
    currentAqi: 360,
    currentPm25: 224,
    currentCategory: 'Very Poor',
    dominantSource: 'Regional Smoke Front (46%) + Road Dust & Construction (28%)',
    forecast: generateHourlyOutlook(350, 18),
    bestWindow: {
      time: 'Tomorrow 2:00 PM – 4:30 PM',
      aqi: 205,
      tip: 'Ventilation along open expressway corridors aids particulate dilution.',
    },
    worstWindow: {
      time: 'Tomorrow 6:00 AM – 8:30 AM',
      aqi: 420,
      tip: 'Dense radiation fog mixes with smoke over eastern floodplain basin.',
    },
    scientificBriefing: {
      headline: 'Eastern Basin Accumulation Traps Regional Smoke Over Expressway Corridors',
      synopsis: 'Noida receives secondary stagnation as smoke flowing past Delhi gets pinned against the Hindon river floodplains under light easterly cross-breezes at night.',
      meteorologicalDriver: 'High relative humidity (>82%) facilitates aerosol hygroscopic growth.',
      guidance: 'Avoid outdoor exercise near expressways; keep car circulation set to internal filter.',
    },
  },
  {
    id: 'gurugram-cybercity',
    name: 'Gurugram Cyber City',
    pincode: '122002',
    zone: 'Gurugram',
    lat: 28.4950,
    lon: 77.0895,
    currentAqi: 325,
    currentPm25: 205,
    currentCategory: 'Very Poor',
    dominantSource: 'Aravalli Valley Stagnation (40%) + Diesel Generator & Highway Fleet (35%)',
    forecast: generateHourlyOutlook(315, 16),
    bestWindow: {
      time: 'Tomorrow 1:30 PM – 4:00 PM',
      aqi: 188,
      tip: 'Southern solar thermal uplift creates temporary vertical dispersion.',
    },
    worstWindow: {
      time: 'Tomorrow 7:00 AM – 9:00 AM',
      aqi: 395,
      tip: 'NH-48 corridor morning commute peaks under shallow 150 m boundary layer.',
    },
    scientificBriefing: {
      headline: 'Aravalli Ridge Shadow Creates Localized Wind Stagnation Pocket',
      synopsis: 'While slightly south of the main Punjab plume axis, Gurugram experiences severe stagnation when light winds fail to surmount the southern Aravalli scrub hills.',
      meteorologicalDriver: 'Topographic blocking along the south-western edge of the capital basin.',
      guidance: 'Utilize indoor air purifiers; schedule runs between 2 PM and 4 PM.',
    },
  },
  {
    id: 'ghaziabad-vasundhara',
    name: 'Ghaziabad Vasundhara',
    pincode: '201012',
    zone: 'Ghaziabad',
    lat: 28.6603,
    lon: 77.3789,
    currentAqi: 425,
    currentPm25: 268,
    currentCategory: 'Severe',
    dominantSource: 'Industrial Perimeter (36%) + Synoptic Smoke Trapping (48%)',
    forecast: generateHourlyOutlook(405, 24),
    bestWindow: {
      time: 'Tomorrow 2:30 PM – 4:30 PM',
      aqi: 245,
      tip: 'Afternoon thermal thermals temporarily push plume aloft.',
    },
    worstWindow: {
      time: 'Tomorrow 5:00 AM – 8:30 AM',
      aqi: 485,
      tip: 'Severe+ conditions; nocturnal boundary layer below 110 meters.',
    },
    scientificBriefing: {
      headline: 'Industrial Fringe and River Basin Inversion Amplify Extreme Particulates',
      synopsis: 'Vasundhara consistently registers among NCR’s highest counts due to the confluence of upwind Haryana transport, local brick kilns, and dense residential biomass combustion.',
      meteorologicalDriver: 'Near-zero surface wind (<1.5 km/h) eliminates horizontal advective clearing.',
      guidance: 'Hazardous conditions. Strictly avoid outdoor physical exertion.',
    },
  },
];

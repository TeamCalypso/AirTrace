export const DELHI_POS = { lat: 28.6139, lng: 77.209 };

export const SCENES = [
  { id: "orbit", index: "00", label: "Orbit", sub: "Sentinel-5P" },
  { id: "fires", index: "01", label: "Fires", sub: "VIIRS 375 m" },
  { id: "wind", index: "02", label: "Transport", sub: "850 hPa winds" },
  { id: "lid", index: "03", label: "Inversion", sub: "Boundary layer" },
  { id: "you", index: "04", label: "Your street", sub: "48 h forecast" },
] as const;

export const PIPELINE_STATS = {
  fireDetections: 1150,
  districts: 30,
  swathKm: 2600,
  tropomiPixel: "5.5 × 3.5 km",
  orbitKm: 824,
  overpass: "13:30 local",
  frpTotalMW: 41000,
};

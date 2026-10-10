export interface Chapter {
  id: string;
  n: string;
  align: "left" | "right";
  label: string;
  title: string[];
  body: string;
  chips: string[];
  footnote: string;
  icon: "fire" | "wind" | "layers";
}

export const CHAPTERS: Record<"fire" | "wind" | "inversion", Chapter> = {
  fire: {
    id: "ch-fire",
    n: "02",
    align: "right",
    icon: "fire",
    label: "CH.02 — FIRE · VIIRS I-BAND HOTSPOTS",
    title: ["The signal starts", "in the fields."],
    body: "Each autumn, harvest residue burns across Punjab and Haryana. VIIRS flags the bright ones — detections roughly 375 metres across, hot enough to stand out of the dark, revisited every 12 hours. Downwind, they stop being a picture and become an input.",
    chips: ["VIIRS · I-BAND", "375 M PIXEL", "REVISIT 12 H"],
    footnote: "Detection count and positions are illustrative — not a live fire feed.",
  },
  wind: {
    id: "ch-wind",
    n: "03",
    align: "left",
    icon: "wind",
    label: "CH.03 — WIND · ELEVATED TRANSPORT",
    title: ["The wind does the carrying —", "probably."],
    body: "On these nights the winds aloft run north-northwest to south-south-east, steering smoke and aerosol toward the National Capital Region. The particles follow the model's blended flow — a probability cloud, not a promise. Watch the corridor widen as it goes: the farther the transport, the wider the uncertainty.",
    chips: ["ERA-5 REANALYSIS", "850–500 HPA LAYERS", "ENSEMBLE TRANSPORT"],
    footnote: "Transport paths are illustrative and probabilistic.",
  },
  inversion: {
    id: "ch-inversion",
    n: "04",
    align: "right",
    icon: "layers",
    label: "CH.04 — INVERSION · THE LID",
    title: ["Then the sky", "closes."],
    body: "Cold, clear nights let the ground radiate heat away faster than the air above. Warm air settles over cooler air — an inversion — and vertical mixing shuts off. Whatever is in the boundary layer stays in it, layer on layer, until morning warms the lid open.",
    chips: ["RADIATIVE COOLING", "LID ≈ 600 M AGL", "VERTICAL VELOCITY → 0"],
    footnote: "Boundary-layer height is illustrative.",
  },
};

export const NEIGHBORHOOD_CHAPTER = {
  id: "ch-neighborhood",
  n: "05",
  label: "CH.05 — NEIGHBORHOOD · THE FORECAST",
  title: ["It lands", "where you live."],
  body: "The orbit, the fires, the wind, the lid — blended into an outlook for your area. Choose a neighborhood across Delhi–NCR to see an illustrative 48-hour trajectory, peak estimate, and model confidence — and set a threshold if you want a (demo) alert.",
};

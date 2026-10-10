import { DELHI_POS } from "./places";

export type LabelGroup = "orbit" | "region" | "city" | "dynamic";

export type LabelDef = {
  key: string;
  text: string;
  sub?: string;
  lat: number;
  lng: number;
  altM: number;
  group: LabelGroup;
};

export const LABELS: LabelDef[] = [
  { key: "l-india", text: "INDIA", lat: 22.5, lng: 79, altM: 0, group: "orbit" },
  { key: "l-arabian", text: "ARABIAN SEA", lat: 15, lng: 66, altM: 0, group: "orbit" },
  { key: "l-bay", text: "BAY OF BENGAL", lat: 16, lng: 88, altM: 0, group: "orbit" },
  { key: "l-himalaya", text: "HIMALAYA", lat: 33.5, lng: 82, altM: 0, group: "orbit" },
  { key: "l-punjab", text: "PUNJAB", sub: "rice bowl", lat: 30.7, lng: 75.4, altM: 0, group: "region" },
  { key: "l-haryana", text: "HARYANA", sub: "stubble belt", lat: 29.4, lng: 76.3, altM: 0, group: "region" },
  { key: "l-delhi", text: "DELHI", sub: "34 million people", lat: 28.61, lng: 77.21, altM: 0, group: "region" },
  { key: "l-lahore", text: "LAHORE", lat: 31.55, lng: 74.34, altM: 0, group: "region" },
  { key: "l-chd", text: "CHANDIGARH", lat: 30.73, lng: 76.78, altM: 0, group: "region" },
  { key: "l-amritsar", text: "AMRITSAR", lat: 31.63, lng: 74.87, altM: 0, group: "region" },
  { key: "l-thar", text: "THAR DESERT", lat: 27.5, lng: 71.5, altM: 0, group: "region" },
  { key: "l-city-delhi", text: "DELHI", sub: "your forecast area", lat: 28.62, lng: 77.22, altM: 0, group: "city" },
  { key: "l-yamuna", text: "YAMUNA", lat: 28.55, lng: 77.25, altM: 0, group: "city" },
  { key: "l-fires", text: "VIIRS DETECTIONS", sub: "375 m pixels", lat: 30.1, lng: 75.1, altM: 90000, group: "region" },
  { key: "l-sat", text: "SENTINEL-5P", sub: "824 km · 13:30 overpass", lat: 0, lng: 0, altM: 0, group: "dynamic" },
  { key: "l-lid", text: "INVERSION LID", sub: "boundary layer", lat: DELHI_POS.lat, lng: DELHI_POS.lng, altM: 200, group: "dynamic" },
  { key: "l-pin", text: "YOU", sub: "", lat: DELHI_POS.lat, lng: DELHI_POS.lng, altM: 0, group: "dynamic" },
  { key: "l-plume", text: "PLUME FRONT", sub: "10-14 h transit", lat: 29.2, lng: 76.4, altM: 1200, group: "dynamic" },
];

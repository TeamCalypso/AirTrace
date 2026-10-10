import { db } from "@/db";
import { neighborhoods, type NewNeighborhood } from "@/db/schema";
import { sql } from "drizzle-orm";

type Profile = "dense" | "arterial" | "industrial" | "ridge" | "riverside" | "suburb" | "corridor" | "landfill" | "business";

/** name, district, state, lat, lng, population (thousands), micro-environment profile */
type Row = [string, string, string, number, number, number, Profile];

const ROWS: Row[] = [
  ["Connaught Place", "Central Delhi", "Delhi", 28.6315, 77.2167, 90, "business"],
  ["Karol Bagh", "Central Delhi", "Delhi", 28.6519, 77.1909, 320, "dense"],
  ["Chandni Chowk", "Central Delhi", "Delhi", 28.6562, 77.2301, 250, "dense"],
  ["Paharganj", "Central Delhi", "Delhi", 28.644, 77.213, 180, "dense"],
  ["Civil Lines", "North Delhi", "Delhi", 28.68, 77.223, 70, "suburb"],
  ["Kashmere Gate", "North Delhi", "Delhi", 28.667, 77.228, 60, "corridor"],
  ["Kamla Nagar", "North Delhi", "Delhi", 28.68, 77.205, 140, "dense"],
  ["Model Town", "North Delhi", "Delhi", 28.712, 77.193, 110, "suburb"],
  ["Timarpur", "North Delhi", "Delhi", 28.716, 77.217, 80, "riverside"],
  ["Burari", "North Delhi", "Delhi", 28.746, 77.202, 210, "dense"],
  ["Mukarba Chowk", "North Delhi", "Delhi", 28.716, 77.161, 40, "corridor"],
  ["Azadpur", "North West Delhi", "Delhi", 28.707, 77.181, 190, "dense"],
  ["Shalimar Bagh", "North West Delhi", "Delhi", 28.731, 77.156, 230, "suburb"],
  ["Jahangirpuri", "North West Delhi", "Delhi", 28.726, 77.17, 260, "dense"],
  ["Rohini", "North West Delhi", "Delhi", 28.7495, 77.0565, 480, "suburb"],
  ["Narela", "North West Delhi", "Delhi", 28.822, 77.101, 130, "industrial"],
  ["Bawana", "North West Delhi", "Delhi", 28.797, 77.033, 150, "industrial"],
  ["Alipur", "North West Delhi", "Delhi", 28.816, 77.137, 40, "suburb"],
  ["Pitampura", "North West Delhi", "Delhi", 28.704, 77.131, 210, "dense"],
  ["Wazirpur", "North West Delhi", "Delhi", 28.699, 77.165, 90, "industrial"],
  ["Netaji Subhash Place", "North West Delhi", "Delhi", 28.696, 77.152, 30, "business"],
  ["Punjabi Bagh", "West Delhi", "Delhi", 28.673, 77.131, 200, "arterial"],
  ["Paschim Vihar", "West Delhi", "Delhi", 28.67, 77.101, 340, "dense"],
  ["Nangloi", "West Delhi", "Delhi", 28.683, 77.065, 220, "dense"],
  ["Mundka", "West Delhi", "Delhi", 28.682, 77.018, 170, "industrial"],
  ["Bakkarwala", "West Delhi", "Delhi", 28.64, 77.025, 60, "suburb"],
  ["Uttam Nagar", "West Delhi", "Delhi", 28.621, 77.057, 300, "dense"],
  ["Vikaspuri", "West Delhi", "Delhi", 28.639, 77.067, 330, "dense"],
  ["Janakpuri", "West Delhi", "Delhi", 28.621, 77.093, 280, "suburb"],
  ["Tilak Nagar", "West Delhi", "Delhi", 28.639, 77.096, 210, "dense"],
  ["Rajouri Garden", "West Delhi", "Delhi", 28.649, 77.121, 220, "arterial"],
  ["Dwarka", "South West Delhi", "Delhi", 28.5921, 77.046, 580, "suburb"],
  ["Najafgarh", "South West Delhi", "Delhi", 28.609, 76.98, 190, "riverside"],
  ["Kapashera", "South West Delhi", "Delhi", 28.515, 77.074, 120, "industrial"],
  ["Rajokri", "South West Delhi", "Delhi", 28.503, 77.116, 60, "ridge"],
  ["Aerocity", "South West Delhi", "Delhi", 28.548, 77.12, 20, "business"],
  ["Vasant Kunj", "South West Delhi", "Delhi", 28.521, 77.158, 260, "ridge"],
  ["Vasant Vihar", "South West Delhi", "Delhi", 28.558, 77.159, 90, "suburb"],
  ["Munirka", "South West Delhi", "Delhi", 28.556, 77.173, 120, "dense"],
  ["R K Puram", "South West Delhi", "Delhi", 28.564, 77.187, 200, "suburb"],
  ["IIT Delhi", "South West Delhi", "Delhi", 28.547, 77.173, 30, "ridge"],
  ["Saket", "South Delhi", "Delhi", 28.524, 77.207, 130, "suburb"],
  ["Mehrauli", "South Delhi", "Delhi", 28.518, 77.186, 150, "ridge"],
  ["Chattarpur", "South Delhi", "Delhi", 28.503, 77.181, 140, "ridge"],
  ["Sainik Farms", "South Delhi", "Delhi", 28.511, 77.2, 40, "ridge"],
  ["Hauz Khas", "South Delhi", "Delhi", 28.549, 77.2, 110, "suburb"],
  ["Green Park", "South Delhi", "Delhi", 28.559, 77.205, 90, "suburb"],
  ["Safdarjung", "South Delhi", "Delhi", 28.567, 77.2, 60, "arterial"],
  ["AIIMS", "South Delhi", "Delhi", 28.567, 77.209, 40, "arterial"],
  ["South Extension", "South Delhi", "Delhi", 28.567, 77.227, 120, "arterial"],
  ["Lajpat Nagar", "South Delhi", "Delhi", 28.57, 77.235, 230, "dense"],
  ["Defence Colony", "South Delhi", "Delhi", 28.57, 77.229, 80, "suburb"],
  ["Greater Kailash I", "South Delhi", "Delhi", 28.548, 77.24, 150, "suburb"],
  ["Kalkaji", "South Delhi", "Delhi", 28.535, 77.256, 160, "dense"],
  ["Govindpuri", "South Delhi", "Delhi", 28.535, 77.263, 190, "industrial"],
  ["Nehru Place", "South Delhi", "Delhi", 28.548, 77.251, 50, "business"],
  ["Okhla", "South East Delhi", "Delhi", 28.547, 77.275, 210, "industrial"],
  ["Zakir Nagar", "South East Delhi", "Delhi", 28.562, 77.283, 130, "dense"],
  ["Ashram", "South East Delhi", "Delhi", 28.572, 77.257, 90, "corridor"],
  ["Sarai Kale Khan", "South East Delhi", "Delhi", 28.587, 77.258, 50, "corridor"],
  ["Nizamuddin", "South East Delhi", "Delhi", 28.59, 77.245, 70, "dense"],
  ["India Gate", "New Delhi", "Delhi", 28.6129, 77.2295, 10, "suburb"],
  ["Lutyens' Delhi", "New Delhi", "Delhi", 28.6139, 77.209, 20, "ridge"],
  ["Chanakyapuri", "New Delhi", "Delhi", 28.5916, 77.1873, 30, "ridge"],
  ["ITO", "Central Delhi", "Delhi", 28.628, 77.241, 30, "corridor"],
  ["Yamuna Bazaar", "Central Delhi", "Delhi", 28.652, 77.244, 70, "riverside"],
  ["Geeta Colony", "East Delhi", "Delhi", 28.652, 77.264, 150, "riverside"],
  ["Krishna Nagar", "East Delhi", "Delhi", 28.67, 77.281, 190, "dense"],
  ["Gandhi Nagar", "East Delhi", "Delhi", 28.662, 77.265, 140, "industrial"],
  ["Laxmi Nagar", "East Delhi", "Delhi", 28.637, 77.277, 380, "dense"],
  ["Preet Vihar", "East Delhi", "Delhi", 28.635, 77.295, 170, "arterial"],
  ["Patparganj", "East Delhi", "Delhi", 28.611, 77.288, 150, "riverside"],
  ["Mayur Vihar", "East Delhi", "Delhi", 28.608, 77.295, 260, "riverside"],
  ["Trilokpuri", "East Delhi", "Delhi", 28.607, 77.312, 130, "dense"],
  ["Kondli", "East Delhi", "Delhi", 28.606, 77.327, 120, "dense"],
  ["Anand Vihar", "East Delhi", "Delhi", 28.647, 77.316, 80, "corridor"],
  ["Ghazipur", "East Delhi", "Delhi", 28.624, 77.327, 110, "landfill"],
  ["Shahdara", "East Delhi", "Delhi", 28.673, 77.287, 240, "dense"],
  ["Seelampur", "North East Delhi", "Delhi", 28.67, 77.267, 290, "industrial"],
  ["Jaffrabad", "North East Delhi", "Delhi", 28.687, 77.276, 220, "dense"],
  ["Babarpur", "North East Delhi", "Delhi", 28.679, 77.286, 190, "dense"],
  ["Nand Nagri", "North East Delhi", "Delhi", 28.696, 77.293, 180, "dense"],
  ["Sunder Nagri", "North East Delhi", "Delhi", 28.686, 77.296, 150, "dense"],
  ["Seemapuri", "North East Delhi", "Delhi", 28.686, 77.306, 160, "landfill"],
  ["Mustafabad", "North East Delhi", "Delhi", 28.708, 77.283, 210, "dense"],
  ["Karawal Nagar", "North East Delhi", "Delhi", 28.729, 77.278, 290, "dense"],
  ["Sonia Vihar", "North East Delhi", "Delhi", 28.74, 77.266, 180, "riverside"],
  ["Dilshad Garden", "North East Delhi", "Delhi", 28.681, 77.313, 240, "dense"],
  ["Bhalswa", "North West Delhi", "Delhi", 28.745, 77.163, 90, "landfill"],
  ["Sangam Vihar", "South Delhi", "Delhi", 28.505, 77.27, 320, "dense"],
  ["Deoli", "South Delhi", "Delhi", 28.505, 77.254, 200, "dense"],
  ["Dakshinpuri", "South Delhi", "Delhi", 28.517, 77.254, 150, "dense"],
  ["Khanpur", "South Delhi", "Delhi", 28.511, 77.232, 130, "dense"],
  ["Tughlakabad", "South Delhi", "Delhi", 28.514, 77.268, 110, "industrial"],
  ["Aya Nagar", "South Delhi", "Delhi", 28.478, 77.133, 90, "ridge"],
  ["Noida Sector 62", "Gautam Buddha Nagar", "Uttar Pradesh", 28.627, 77.372, 180, "suburb"],
  ["Noida Sector 18", "Gautam Buddha Nagar", "Uttar Pradesh", 28.5703, 77.3211, 60, "business"],
  ["Greater Noida", "Gautam Buddha Nagar", "Uttar Pradesh", 28.4744, 77.504, 240, "suburb"],
  ["Indirapuram", "Ghaziabad", "Uttar Pradesh", 28.646, 77.383, 320, "dense"],
  ["Vaishali", "Ghaziabad", "Uttar Pradesh", 28.65, 77.34, 220, "dense"],
  ["Ghaziabad", "Ghaziabad", "Uttar Pradesh", 28.6692, 77.4538, 620, "industrial"],
  ["Sahibabad", "Ghaziabad", "Uttar Pradesh", 28.672, 77.362, 260, "industrial"],
  ["Hapur", "Hapur", "Uttar Pradesh", 28.73, 77.78, 160, "industrial"],
  ["Meerut", "Meerut", "Uttar Pradesh", 28.984, 77.706, 900, "dense"],
  ["Bulandshahr", "Bulandshahr", "Uttar Pradesh", 28.4089, 77.417, 220, "dense"],
  ["Aligarh", "Aligarh", "Uttar Pradesh", 27.897, 78.088, 590, "dense"],
  ["Baghpat", "Baghpat", "Uttar Pradesh", 29.03, 77.22, 90, "riverside"],
  ["Muzaffarnagar", "Muzaffarnagar", "Uttar Pradesh", 29.475, 77.705, 390, "dense"],
  ["Saharanpur", "Saharanpur", "Uttar Pradesh", 29.97, 77.55, 460, "dense"],
  ["Faridabad Sector 15", "Faridabad", "Haryana", 28.385, 77.31, 190, "dense"],
  ["Neharpar", "Faridabad", "Haryana", 28.357, 77.3, 340, "suburb"],
  ["Ballabhgarh", "Faridabad", "Haryana", 28.336, 77.332, 160, "industrial"],
  ["Palwal", "Palwal", "Haryana", 28.14, 77.332, 130, "dense"],
  ["Cyber City", "Gurugram", "Haryana", 28.495, 77.089, 40, "business"],
  ["DLF Phase 3", "Gurugram", "Haryana", 28.493, 77.09, 90, "dense"],
  ["Gurugram Sector 56", "Gurugram", "Haryana", 28.423, 77.096, 210, "suburb"],
  ["Gurugram Sector 82", "Gurugram", "Haryana", 28.391, 76.95, 180, "suburb"],
  ["Sohna Road", "Gurugram", "Haryana", 28.417, 77.038, 150, "corridor"],
  ["Manesar", "Gurugram", "Haryana", 28.352, 76.94, 200, "industrial"],
  ["Nuh", "Nuh", "Haryana", 28.1, 77.01, 80, "riverside"],
  ["Bhiwadi", "Alwar", "Rajasthan", 28.21, 76.86, 170, "industrial"],
  ["Rewari", "Rewari", "Haryana", 28.2, 76.62, 150, "dense"],
  ["Bahadurgarh", "Jhajjar", "Haryana", 28.694, 76.94, 200, "industrial"],
  ["Jhajjar", "Jhajjar", "Haryana", 28.614, 76.829, 120, "dense"],
  ["Sonipat", "Sonipat", "Haryana", 28.995, 77.015, 200, "dense"],
  ["Panipat", "Panipat", "Haryana", 29.39, 76.97, 320, "industrial"],
  ["Karnal", "Karnal", "Haryana", 29.685, 76.99, 350, "dense"],
  ["Kurukshetra", "Kurukshetra", "Haryana", 29.965, 76.88, 120, "riverside"],
  ["Ambala", "Ambala", "Haryana", 30.36, 76.78, 220, "dense"],
  ["Chandigarh Sector 17", "Chandigarh", "Chandigarh", 30.741, 76.781, 60, "suburb"],
  ["Mohali", "Mohali", "Punjab", 30.704, 76.717, 260, "suburb"],
  ["Panchkula", "Panchkula", "Haryana", 30.695, 76.85, 220, "ridge"],
  ["Ludhiana", "Ludhiana", "Punjab", 30.901, 75.857, 1100, "industrial"],
  ["Amritsar", "Amritsar", "Punjab", 31.634, 74.872, 780, "dense"],
  ["Patiala", "Patiala", "Punjab", 30.34, 76.386, 340, "dense"],
  ["Bathinda", "Bathinda", "Punjab", 30.211, 74.945, 290, "industrial"],
  ["Agra", "Agra", "Uttar Pradesh", 27.177, 78.01, 1100, "dense"],
  ["Mathura", "Mathura", "Uttar Pradesh", 27.492, 77.674, 320, "industrial"],
  ["Bharatpur", "Bharatpur", "Rajasthan", 27.215, 77.503, 210, "riverside"],
  ["Jaipur", "Jaipur", "Rajasthan", 26.912, 75.787, 1800, "dense"],
  ["Dehradun", "Dehradun", "Uttarakhand", 30.316, 78.032, 580, "ridge"],
];

const PROFILE_OFFSET: Record<Profile, number> = {
  dense: 7,
  arterial: 13,
  industrial: 19,
  ridge: -11,
  riverside: -5,
  suburb: -3,
  corridor: 15,
  landfill: 16,
  business: 5,
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const NEIGHBORHOOD_SEED: NewNeighborhood[] = ROWS.map(
  ([name, district, state, lat, lng, population, profile]) => ({
    slug: slugify(name),
    name,
    district,
    state,
    lat,
    lng,
    population: population * 1000,
    baselinePm25: PROFILE_OFFSET[profile],
    profile,
  })
);

let seeded = false;

/** Idempotent: creates + fills the neighborhoods table on first hit. */
export async function ensureSeeded() {
  if (seeded) return;
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(neighborhoods);
    if ((row?.count ?? 0) > 0) {
      seeded = true;
      return;
    }
    await db.insert(neighborhoods).values(NEIGHBORHOOD_SEED).onConflictDoNothing();
    seeded = true;
  } catch {
    // Table may not exist yet (pre-migration); the UI degrades gracefully.
  }
}

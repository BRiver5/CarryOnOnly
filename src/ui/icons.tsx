import { CloudRain, Dumbbell, Footprints, Building, Shirt, Snowflake, Sun, CloudSun, Umbrella, Wine, type LucideIcon } from "lucide-react-native";
import type { Activity, Weather } from "../lib/types";

const W: Record<Weather, LucideIcon> = { hot: Sun, mild: CloudSun, cold: Snowflake, rain: CloudRain };
const A: Record<Activity, LucideIcon> = { city: Building, hike: Footprints, beach: Umbrella, formal: Wine, sport: Dumbbell };

export function WeatherIcon({ w, size = 16, color }: { w: Weather; size?: number; color: string }) {
  const I = W[w];
  return <I size={size} color={color} />;
}
export function ActivityIcon({ a, size = 14, color }: { a: Activity; size?: number; color: string }) {
  const I = A[a];
  return <I size={size} color={color} />;
}
export { Shirt };

export const kg = (g: number) => `${(g / 1000).toFixed(1)} kg`;

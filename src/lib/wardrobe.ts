// Стартовый гардероб — добавляется только по явному нажатию. Вес — типичный.

import type { Item } from "./types.ts";

export type Preset = Omit<Item, "id" | "createdAt">;

export const STARTER: Preset[] = [
  { name: "T-shirt", kind: "wear", grams: 160, perDay: 1, wears: 1, weather: ["hot", "mild"], activity: null, essential: false, wearable: false },
  { name: "Underwear", kind: "wear", grams: 60, perDay: 1, wears: 1, weather: [], activity: null, essential: true, wearable: false },
  { name: "Socks", kind: "wear", grams: 50, perDay: 1, wears: 1, weather: [], activity: null, essential: false, wearable: false },
  { name: "Jeans", kind: "wear", grams: 650, perDay: 1, wears: 4, weather: ["mild", "cold", "rain"], activity: null, essential: false, wearable: true },
  { name: "Shorts", kind: "wear", grams: 250, perDay: 1, wears: 3, weather: ["hot"], activity: null, essential: false, wearable: false },
  { name: "Sweater", kind: "wear", grams: 450, perDay: 1, wears: 4, weather: ["cold", "mild"], activity: null, essential: false, wearable: true },
  { name: "Rain jacket", kind: "gear", grams: 380, perDay: 1, wears: 0, weather: ["rain"], activity: null, essential: false, wearable: true },
  { name: "Warm coat", kind: "gear", grams: 1100, perDay: 1, wears: 0, weather: ["cold"], activity: null, essential: false, wearable: true },
  { name: "Sneakers", kind: "gear", grams: 750, perDay: 1, wears: 0, weather: [], activity: null, essential: true, wearable: true },
  { name: "Hiking boots", kind: "gear", grams: 1200, perDay: 1, wears: 0, weather: [], activity: "hike", essential: false, wearable: true },
  { name: "Dress shirt", kind: "wear", grams: 220, perDay: 1, wears: 2, weather: [], activity: "formal", essential: false, wearable: false },
  { name: "Swimwear", kind: "wear", grams: 120, perDay: 1, wears: 3, weather: [], activity: "beach", essential: false, wearable: false },
  { name: "Gym kit", kind: "wear", grams: 300, perDay: 1, wears: 1, weather: [], activity: "sport", essential: false, wearable: false },
  { name: "Toiletry bag", kind: "toiletry", grams: 450, perDay: 1, wears: 0, weather: [], activity: null, essential: true, wearable: false },
  { name: "Phone charger", kind: "gear", grams: 150, perDay: 1, wears: 0, weather: [], activity: null, essential: true, wearable: false },
  { name: "Laptop", kind: "gear", grams: 1400, perDay: 1, wears: 0, weather: [], activity: null, essential: false, wearable: false },
];

// История для Stats: насколько ты переупаковываешь (взял vs надел), какие вещи
// чаще всего лишние, сколько веса сэкономила модель по поездкам.

import type { Item, Trip, Usage } from "./types.ts";

export function overpack(usages: Usage[]): { packed: number; used: number; ratio: number } {
  const packed = usages.reduce((s, u) => s + u.packed, 0);
  const used = usages.reduce((s, u) => s + u.used, 0);
  return { packed, used, ratio: packed ? (packed - used) / packed : 0 };
}

export function idleItems(usages: Usage[], items: Item[], n = 5): { item: Item; idle: number; packed: number }[] {
  const by = new Map<string, { idle: number; packed: number }>();
  for (const u of usages) {
    const e = by.get(u.itemId) ?? { idle: 0, packed: 0 };
    e.idle += Math.max(0, u.packed - u.used);
    e.packed += u.packed;
    by.set(u.itemId, e);
  }
  return [...by.entries()]
    .map(([id, e]) => ({ item: items.find((i) => i.id === id)!, ...e }))
    .filter((x) => x.item && x.idle > 0)
    .sort((a, b) => b.idle - a.idle)
    .slice(0, n);
}

export function tripDeadWeight(trip: Trip, usages: Usage[], items: Item[]): number {
  return usages
    .filter((u) => u.tripId === trip.id)
    .reduce((s, u) => s + Math.max(0, u.packed - u.used) * (items.find((i) => i.id === u.itemId)?.grams ?? 0), 0);
}

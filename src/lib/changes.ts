// Изменения поездки — общий язык выходов из конфликтов и режима "что если".
// Сравнение — честный повторный расчёт укладки.

import { pack, shortTotal, type Packing } from "./pack.ts";
import type { Model } from "./model.ts";
import type { Activity, Item, Trip } from "./types.ts";

export type Change =
  | { kind: "laundry"; day: number; on: boolean }
  | { kind: "limit"; grams: number }
  | { kind: "dropActivity"; activity: Activity }
  | { kind: "skipItem"; itemId: string };

export function applyChange(trip: Trip, items: Item[], c: Change): { trip: Trip; items: Item[] } {
  switch (c.kind) {
    case "laundry":
      return { trip: { ...trip, days: trip.days.map((d, i) => (i === c.day ? { ...d, laundry: c.on } : d)) }, items };
    case "limit":
      return { trip: { ...trip, limit: c.grams }, items };
    case "dropActivity":
      return { trip: { ...trip, days: trip.days.map((d) => ({ ...d, activities: d.activities.filter((a) => a !== c.activity) })) }, items };
    case "skipItem":
      return { trip: { ...trip, skip: [...new Set([...trip.skip, c.itemId])] }, items };
  }
}

export function describeChange(c: Change, itemName: (id: string) => string): string {
  switch (c.kind) {
    case "laundry":
      return c.on ? `Do laundry on day ${c.day + 1}` : `No laundry on day ${c.day + 1}`;
    case "limit":
      return `Allow ${(c.grams / 1000).toFixed(c.grams % 1000 ? 1 : 0)} kg`;
    case "dropActivity":
      return `Skip the ${c.activity} plans`;
    case "skipItem":
      return `Leave the ${itemName(c.itemId)} at home`;
  }
}

export type Comparison = { before: Packing; after: Packing; gramsDelta: number; shortDelta: number };

export function whatIf(trip: Trip, items: Item[], model: Model, changes: Change[], base?: Packing): Comparison {
  const before = base ?? pack(trip, items, model);
  const s = changes.reduce((acc, c) => applyChange(acc.trip, acc.items, c), { trip, items });
  const after = pack(s.trip, s.items, model);
  return { before, after, gramsDelta: after.total - before.total, shortDelta: shortTotal(after) - shortTotal(before) };
}

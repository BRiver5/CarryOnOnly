// Накапливаемая модель "сколько ты на самом деле носишь": по каждой вещи —
// множитель дней носки, выученный из разборов поездок. Наблюдение — log(план /
// использовано) (взял 5 футболок по плану, надел 3 → носишь каждую дольше).
// Взвешенное среднее с забыванием (вес старых поездок ×0.7) и априором 0
// силой 2 поездки — одна поездка не переворачивает план. Пока вещь не
// разбиралась — общий множитель по вещам того же вида (частичное объединение).

import type { Item, ItemKind, Usage } from "./types.ts";

export const MODEL_VERSION = 1;
const DECAY = 0.7;
const PRIOR_N = 2;
const CLAMP = Math.log(3);

export type Stat = { sum: number; n: number; trips: number };
export type Model = { items: Record<string, Stat>; kinds: Record<string, Stat> };

export function emptyModel(): Model {
  return { items: {}, kinds: {} };
}

function push(s: Stat | undefined, x: number): Stat {
  const o = s ?? { sum: 0, n: 0, trips: 0 };
  return { sum: o.sum * DECAY + x, n: o.n * DECAY + 1, trips: o.trips + 1 };
}

export function observation(u: Usage): number | null {
  if (u.planned <= 0) return null;
  // "Использовал 0" — не ноль делением: считаем как половину штуки.
  const used = Math.max(0.5, u.used);
  return Math.max(-CLAMP, Math.min(CLAMP, Math.log(u.planned / used)));
}

export function learnTrip(m: Model, usages: Usage[], items: Item[]): Model {
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const u of usages) {
    const it = byId.get(u.itemId);
    const x = observation(u);
    if (!it || x === null || it.wears === 0) continue;
    m.items[u.itemId] = push(m.items[u.itemId], x);
    m.kinds[it.kind] = push(m.kinds[it.kind], x);
  }
  return m;
}

export type Factor = { factor: number; fromItem: number; fromKind: number; trips: number; source: "item" | "kind" | "none" };

export function factorFor(m: Model, item: Item): Factor {
  const it = m.items[item.id];
  const kd = m.kinds[item.kind as ItemKind];
  const kindMean = kd ? kd.sum / (kd.n + PRIOR_N) : 0;
  if (it) {
    const mean = (it.sum + PRIOR_N * kindMean) / (it.n + PRIOR_N);
    return { factor: Math.exp(mean), fromItem: it.sum / it.n, fromKind: kindMean, trips: it.trips, source: "item" };
  }
  return { factor: Math.exp(kindMean), fromItem: 0, fromKind: kindMean, trips: 0, source: kd ? "kind" : "none" };
}

export function replayModel(trips: { id: string; createdAt: number }[], usages: Usage[], items: Item[]): Model {
  const m = emptyModel();
  for (const t of [...trips].sort((a, b) => a.createdAt - b.createdAt)) learnTrip(m, usages.filter((u) => u.tripId === t.id), items);
  return m;
}

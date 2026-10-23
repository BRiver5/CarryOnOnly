// Укладка в лимит. Сначала идеальный список (need × выученный множитель),
// затем, если сумка тяжелее лимита, — выбор количества каждой вещи как
// рюкзак с множественным выбором: варианты 0..идеал штук, цена варианта —
// дни-нехватки × важность, ограничение — вес. Точное ДП по весу шагом 25 г
// (вес варианта округляется вверх — сумка никогда не превышает лимит).
// До ДП самые тяжёлые "можно надеть" вещи уходят на тебя (не в сумку).

import { need, shortDays, type Need } from "./need.ts";
import type { Model } from "./model.ts";
import { factorFor } from "./model.ts";
import type { Item, Trip } from "./types.ts";

export const STEP = 25;
const ESSENTIAL_PENALTY = 1000;

export type Line = {
  item: Item;
  ideal: number;
  count: number; // в сумке
  worn: boolean; // одна штука на тебе
  grams: number; // вес в сумке
  short: number; // дни-нехватки при count
  need: Need;
  factor: number;
};

export type Packing = {
  lines: Line[];
  total: number; // вес сумки с вещами
  idealTotal: number;
  limit: number;
  over: number; // насколько идеал тяжелее лимита
  fits: boolean; // уложились ли вообще
  trimmed: Line[]; // где количество урезано
  wornGrams: number;
};

export function importance(item: Item): number {
  return item.essential ? 3 : item.kind === "wear" ? 1 : 0.6;
}

export function pack(trip: Trip, items: Item[], model: Model): Packing {
  // 1. Идеальные количества (без вещей, которые в эту поездку решили не брать).
  const base = items.filter((i) => !trip.skip.includes(i.id)).map((item) => {
    const f = factorFor(model, item).factor;
    const n = need(item, trip, f);
    return { item, n, f };
  });
  // 2. Надеть в дорогу: по одной штуке самых тяжёлых wearable из тех, что нужны.
  const wornIds = new Set(
    base
      .filter((b) => b.item.wearable && b.n.count > 0)
      .sort((a, b) => b.item.grams - a.item.grams)
      .slice(0, 3)
      .map((b) => b.item.id),
  );
  const wornGrams = base.filter((b) => wornIds.has(b.item.id)).reduce((s, b) => s + b.item.grams, 0);
  const capacity = Math.max(0, trip.limit - trip.bag);
  const idealBag = base.reduce((s, b) => s + Math.max(0, b.n.count - (wornIds.has(b.item.id) ? 1 : 0)) * b.item.grams, 0);

  // 3. Варианты по вещи (сколько класть в сумку).
  type Opt = { inBag: number; w: number; cost: number };
  const opts: Opt[][] = base.map((b) => {
    const worn = wornIds.has(b.item.id) ? 1 : 0;
    const maxBag = Math.max(0, b.n.count - worn);
    const list: Opt[] = [];
    for (let k = 0; k <= maxBag; k++) {
      const total = k + worn;
      const s = shortDays(b.item, trip, total, b.f);
      const cost = s * importance(b.item) + (b.item.essential && total === 0 && b.n.count > 0 ? ESSENTIAL_PENALTY : 0);
      list.push({ inBag: k, w: Math.ceil((k * b.item.grams) / STEP), cost });
    }
    return list;
  });

  let choice: number[];
  if (idealBag <= capacity) choice = opts.map((o) => o.length - 1);
  else {
    // ДП: best[w] — минимальная цена при весе ≤ w.
    const W = Math.floor(capacity / STEP);
    let best = new Float64Array(W + 1);
    const pick: Int16Array[] = [];
    for (let i = 0; i < opts.length; i++) {
      const next = new Float64Array(W + 1).fill(Infinity);
      const p = new Int16Array(W + 1).fill(-1);
      for (let w = 0; w <= W; w++) {
        for (let k = 0; k < opts[i].length; k++) {
          const o = opts[i][k];
          if (o.w > w) continue;
          const v = best[w - o.w] + o.cost;
          if (v < next[w] - 1e-12) {
            next[w] = v;
            p[w] = k;
          }
        }
      }
      pick.push(p);
      best = next;
    }
    choice = new Array(opts.length).fill(0);
    let w = W;
    for (let i = opts.length - 1; i >= 0; i--) {
      const k = Math.max(0, pick[i][w]);
      choice[i] = k;
      w -= opts[i][k].w;
    }
  }

  const lines: Line[] = base.map((b, i) => {
    const o = opts[i][choice[i]];
    const worn = wornIds.has(b.item.id);
    return {
      item: b.item,
      ideal: b.n.count,
      count: o.inBag + (worn ? 1 : 0),
      worn,
      grams: o.inBag * b.item.grams,
      short: shortDays(b.item, trip, o.inBag + (worn ? 1 : 0), b.f),
      need: b.n,
      factor: b.f,
    };
  });
  const total = trip.bag + lines.reduce((s, l) => s + l.grams, 0);
  return {
    lines,
    total,
    idealTotal: trip.bag + idealBag,
    limit: trip.limit,
    over: Math.max(0, trip.bag + idealBag - trip.limit),
    fits: total <= trip.limit && lines.every((l) => !(l.item.essential && l.ideal > 0 && l.count === 0)),
    trimmed: lines.filter((l) => l.count < l.ideal),
    wornGrams,
  };
}

export function shortTotal(p: Packing): number {
  return p.lines.reduce((s, l) => s + l.short * importance(l.item), 0);
}

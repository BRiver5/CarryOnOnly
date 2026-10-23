// Сколько штук вещи нужно на поездку. Стирки режут поездку на циклы; в каждом
// цикле нужно ceil(расход / носок до стирки) штук; итог — максимум по циклам
// (между циклами вещи стираются и идут по второму кругу). Сколько дней
// можно носить вещь — базовое значение, умноженное на выученный множитель
// (см. model.ts): если раз за разом берёшь лишние футболки, множитель растёт.

import type { Item, Trip, TripDay } from "./types.ts";

export function applies(item: Item, day: TripDay): boolean {
  if (item.weather.length && !item.weather.includes(day.weather)) return false;
  if (item.activity && !day.activities.includes(item.activity)) return false;
  return true;
}

// Циклы между стирками: стирка в конце дня d → со следующего дня новый цикл.
export function cycles(trip: Trip): number[][] {
  const out: number[][] = [[]];
  trip.days.forEach((d, i) => {
    out[out.length - 1].push(i);
    if (d.laundry && i < trip.days.length - 1) out.push([]);
  });
  return out;
}

export type Need = {
  count: number; // рекомендуемое количество
  daysUsed: number; // в сколько дней вещь нужна
  worstCycle: number; // самый длинный цикл (дней использования)
  effWears: number; // дней носки с учётом выученного
};

export function need(item: Item, trip: Trip, factor = 1): Need {
  const cs = cycles(trip);
  const daysUsed = trip.days.filter((d) => applies(item, d)).length;
  if (daysUsed === 0) return { count: 0, daysUsed, worstCycle: 0, effWears: item.wears };
  if (item.wears === 0) return { count: 1, daysUsed, worstCycle: daysUsed, effWears: 0 };
  const effWears = Math.max(1, item.wears * factor);
  let count = 0;
  let worstCycle = 0;
  for (const c of cs) {
    const uses = c.filter((i) => applies(item, trip.days[i])).length * item.perDay;
    worstCycle = Math.max(worstCycle, uses);
    count = Math.max(count, Math.ceil(uses / effWears - 1e-9));
  }
  return { count, daysUsed, worstCycle, effWears };
}

// Сколько "дней-нехваток" при count штук: в цикле с u использованиями
// хватает на count·wears, остальное — придётся стирать в раковине.
export function shortDays(item: Item, trip: Trip, count: number, factor = 1): number {
  if (item.wears === 0) return count >= 1 ? 0 : trip.days.filter((d) => applies(item, d)).length;
  const effWears = Math.max(1, item.wears * factor);
  let short = 0;
  for (const c of cycles(trip)) {
    const uses = c.filter((i) => applies(item, trip.days[i])).length * item.perDay;
    short += Math.max(0, uses - count * effWears) / Math.max(1, item.perDay);
  }
  return short;
}

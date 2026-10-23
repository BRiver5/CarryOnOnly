// Конфликты укладки и ранжированные выходы, каждый проверен пересчётом.
// Ранг — сколько "дней-нехваток" (с важностью) выход убирает; лимит выше —
// это уже другая сумка, поэтому он дорогой и обычно последний.

import { pack, shortTotal, type Packing } from "./pack.ts";
import { applyChange, describeChange, type Change } from "./changes.ts";
import { cycles } from "./need.ts";
import type { Model } from "./model.ts";
import type { Item, Trip } from "./types.ts";

export type Fix = { change: Change; label: string; gain: number; effect: string };
export type Conflict = { id: string; kind: "overweight" | "essential" | "longStretch"; title: string; reason: string; fixes: Fix[] };

const kg = (g: number) => `${(g / 1000).toFixed(1)} kg`;

function verify(trip: Trip, items: Item[], model: Model, base: Packing, cands: Change[], name: (id: string) => string): Fix[] {
  const b = shortTotal(base);
  const out: Fix[] = [];
  const seen = new Set<string>();
  for (const c of cands) {
    const k = JSON.stringify(c);
    if (seen.has(k)) continue;
    seen.add(k);
    const s = applyChange(trip, items, c);
    const after = pack(s.trip, s.items, model);
    const gain = b - shortTotal(after) - (c.kind === "limit" ? 2 : 0) - (c.kind === "dropActivity" ? 1 : 0);
    const fewer = base.trimmed.length - after.trimmed.length;
    if (b - shortTotal(after) > 0.05)
      out.push({ change: c, label: describeChange(c, name), gain, effect: `${fewer > 0 ? `${fewer} fewer cuts · ` : ""}short days ${b.toFixed(1)} → ${shortTotal(after).toFixed(1)} · bag ${kg(after.total)}` });
  }
  return out.sort((a, b2) => b2.gain - a.gain).slice(0, 3);
}

export function findConflicts(trip: Trip, items: Item[], model: Model, p: Packing): Conflict[] {
  const name = (id: string) => items.find((i) => i.id === id)?.name ?? "item";
  const out: Conflict[] = [];
  const cs = cycles(trip);
  const longest = cs.reduce((a, c) => (c.length > a.length ? c : a), cs[0]);

  // Кандидаты стирки: середина самого длинного цикла.
  const laundryCands: Change[] = [];
  if (longest.length >= 4) {
    const mid = longest[Math.floor(longest.length / 2) - 1];
    laundryCands.push({ kind: "laundry", day: mid, on: true });
    if (longest.length >= 6) laundryCands.push({ kind: "laundry", day: longest[Math.floor(longest.length / 3) - 1], on: true });
  }

  if (p.trimmed.length) {
    const acts = [...new Set(trip.days.flatMap((d) => d.activities))];
    const heaviest = p.lines.filter((l) => !l.item.essential && l.count > 0).sort((a, b) => b.grams - a.grams)[0];
    const cands: Change[] = [
      ...laundryCands,
      ...acts.map((a) => ({ kind: "dropActivity" as const, activity: a })),
      ...(heaviest ? [{ kind: "skipItem" as const, itemId: heaviest.item.id }] : []),
      { kind: "limit", grams: Math.ceil((p.idealTotal + 250) / 500) * 500 },
    ];
    out.push({
      id: "over",
      kind: "overweight",
      title: `${kg(p.over)} over the ${kg(trip.limit)} limit`,
      reason: `Everything you'd want weighs ${kg(p.idealTotal)}. To fit, ${p.trimmed.length === 1 ? "one item is" : `${p.trimmed.length} items are`} cut: ${p.trimmed
        .slice(0, 3)
        .map((l) => `${l.item.name} ${l.ideal}→${l.count}`)
        .join(", ")}.`,
      fixes: verify(trip, items, model, p, cands, name),
    });
  }

  const missing = p.lines.filter((l) => l.item.essential && l.ideal > 0 && l.count === 0);
  if (missing.length)
    out.push({
      id: "essential",
      kind: "essential",
      title: `Essentials don't fit`,
      reason: `${missing.map((l) => l.item.name).join(", ")} can't be squeezed in even after every other cut.`,
      fixes: verify(trip, items, model, p, [{ kind: "limit", grams: Math.ceil((p.idealTotal + 250) / 500) * 500 }], name),
    });

  if (!p.trimmed.length && longest.length >= 7 && laundryCands.length) {
    const after = laundryCands.map((c) => pack(applyChange(trip, items, c).trip, items, model).total);
    const saved = p.total - Math.min(...after);
    if (saved >= 300)
      out.push({
        id: "stretch",
        kind: "longStretch",
        title: `${longest.length} days without laundry`,
        reason: `A wash midway would save about ${kg(saved)} of clothes.`,
        fixes: laundryCands.map((c, i) => ({ change: c, label: describeChange(c, name), gain: p.total - after[i], effect: `bag ${kg(p.total)} → ${kg(after[i])}` })).sort((a, b) => b.gain - a.gain),
      });
  }
  return out;
}

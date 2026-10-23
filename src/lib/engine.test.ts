import { test } from "node:test";
import assert from "node:assert/strict";
import { applies, cycles, need, shortDays } from "./need.ts";
import { emptyModel, factorFor, learnTrip, replayModel } from "./model.ts";
import { pack, shortTotal } from "./pack.ts";
import { findConflicts } from "./conflicts.ts";
import { whatIf } from "./changes.ts";
import { overpack, idleItems } from "./history.ts";
import { STARTER } from "./wardrobe.ts";
import type { Item, Trip, TripDay } from "./types.ts";

const items: Item[] = STARTER.map((p, i) => ({ ...p, id: `i${i}`, createdAt: i }));
const byName = (n: string) => items.find((i) => i.name === n)!;
const day = (over: Partial<TripDay> = {}): TripDay => ({ weather: "mild", activities: ["city"], laundry: false, ...over });
const trip = (days: TripDay[], over: Partial<Trip> = {}): Trip => ({ id: "t", name: "Trip", start: "2026-11-01", days, limit: 7000, bag: 1800, skip: [], closed: false, createdAt: 0, ...over });

test("cycles and need with laundry", () => {
  const t = trip(Array.from({ length: 10 }, (_, i) => day({ laundry: i === 4 })));
  assert.deepEqual(cycles(t).map((c) => c.length), [5, 5]);
  assert.equal(need(byName("Socks"), t).count, 5);
  assert.equal(need(byName("Jeans"), t).count, 2); // 5 дней / 4 носки
  assert.equal(need(byName("Shorts"), t).count, 0); // не жарко
  assert.equal(need(byName("Toiletry bag"), t).count, 1);
  assert.ok(!applies(byName("Swimwear"), day()));
  assert.equal(shortDays(byName("Socks"), t, 3), 4);
});

test("model learns you rewear and shrinks the plan, with kind pooling", () => {
  const m = emptyModel();
  const shirt = byName("T-shirt");
  for (let k = 0; k < 3; k++) learnTrip(m, [{ tripId: `t${k}`, itemId: shirt.id, packed: 6, used: 3, planned: 6 }], items);
  const f = factorFor(m, shirt);
  assert.ok(f.factor > 1.4 && f.factor < 2.1, `factor ${f.factor}`);
  // Носки ещё не разбирались — берут общий множитель вида "wear".
  const socks = factorFor(m, byName("Socks"));
  assert.equal(socks.source, "kind");
  assert.ok(socks.factor > 1);
  const t = trip(Array.from({ length: 6 }, () => day({ weather: "hot" })));
  assert.ok(need(shirt, t, f.factor).count < need(shirt, t).count);
  const r = replayModel([{ id: "t0", createdAt: 0 }, { id: "t1", createdAt: 1 }, { id: "t2", createdAt: 2 }], [0, 1, 2].map((k) => ({ tripId: `t${k}`, itemId: shirt.id, packed: 6, used: 3, planned: 6 })), items);
  assert.ok(Math.abs(factorFor(r, shirt).factor - f.factor) < 1e-12);
});

test("packing fits the limit with an exact trade-off and keeps essentials", () => {
  const t = trip(Array.from({ length: 12 }, () => day({ weather: "cold" })), { limit: 5000 });
  const p = pack(t, items, emptyModel());
  assert.ok(p.idealTotal > t.limit);
  assert.ok(p.total <= t.limit);
  assert.ok(p.trimmed.length > 0);
  for (const l of p.lines) if (l.item.essential && l.ideal > 0) assert.ok(l.count > 0, l.item.name);
  // Вариант без урезаний при большом лимите не хуже по нехваткам.
  const big = pack({ ...t, limit: 30000 }, items, emptyModel());
  assert.equal(shortTotal(big), 0);
  assert.ok(shortTotal(p) > 0);
  assert.ok(p.lines.some((l) => l.worn));
});

test("DP matches brute force over every count combination", () => {
  // Полный перебор на маленьком наборе: 3 вещи, лимит строгий.
  const few = [byName("Socks"), byName("T-shirt"), byName("Jeans")].map((i) => ({ ...i, essential: false, wearable: false }));
  const t = trip(Array.from({ length: 6 }, () => day({ weather: "mild" })), { limit: 1800 + 900, bag: 1800 });
  const p = pack(t, few, emptyModel());
  let best = Infinity;
  const ideal = p.lines.map((l) => l.ideal);
  for (let a = 0; a <= ideal[0]; a++)
    for (let b = 0; b <= ideal[1]; b++)
      for (let c = 0; c <= ideal[2]; c++) {
        const w = a * few[0].grams + b * few[1].grams + c * few[2].grams;
        if (w > 900) continue;
        const cost = shortDays(few[0], t, a) * 1 + shortDays(few[1], t, b) * 1 + shortDays(few[2], t, c) * 1;
        best = Math.min(best, cost);
      }
  assert.ok(Math.abs(shortTotal(p) - best) < 1e-9, `dp ${shortTotal(p)} vs brute ${best}`);
});

test("overweight conflict proposes verified exits incl. a laundry day", () => {
  const t = trip(Array.from({ length: 10 }, () => day({ weather: "cold", activities: ["city", "hike"] })), { limit: 6000 });
  const p = pack(t, items, emptyModel());
  const c = findConflicts(t, items, emptyModel(), p).find((x) => x.kind === "overweight")!;
  assert.ok(c && c.fixes.length > 0);
  assert.ok(c.fixes.some((f) => f.change.kind === "laundry"));
  for (let i = 1; i < c.fixes.length; i++) assert.ok(c.fixes[i - 1].gain >= c.fixes[i].gain);
  const cmp = whatIf(t, items, emptyModel(), [c.fixes[0].change], p);
  assert.ok(cmp.shortDelta < 0);
});

test("history helpers", () => {
  const us = [
    { tripId: "a", itemId: "i0", packed: 5, used: 3, planned: 5 },
    { tripId: "a", itemId: "i2", packed: 5, used: 5, planned: 5 },
  ];
  assert.equal(overpack(us).ratio, 0.2);
  assert.equal(idleItems(us, items)[0].item.name, "T-shirt");
});

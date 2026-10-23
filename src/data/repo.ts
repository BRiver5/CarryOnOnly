// Доступ к SQLite. Все обращения строго по очереди (мьютекс).

import { getDb } from "../db/client";
import type { Activity, Item, Trip, Usage, Weather } from "../lib/types";

let chain: Promise<unknown> = Promise.resolve();
function lock<R>(fn: () => Promise<R>): Promise<R> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

type ItemRow = { id: string; name: string; kind: Item["kind"]; grams: number; per_day: number; wears: number; weather: string; activity: string | null; essential: number; slot: string | null; created_at: number };
const toItem = (r: ItemRow): Item => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  grams: r.grams,
  perDay: r.per_day,
  wears: r.wears,
  weather: (r.weather ? r.weather.split(",") : []) as Weather[],
  activity: (r.activity as Activity | null) ?? null,
  essential: r.essential === 1,
  slot: (r.slot as Item["slot"]) ?? null,
  createdAt: r.created_at,
});

export const listItems = () =>
  lock(async () => {
    const db = await getDb();
    return (await db.getAllAsync<ItemRow>("SELECT * FROM items ORDER BY created_at ASC;")).map(toItem);
  });

export const saveItems = (its: Item[]) =>
  lock(async () => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const i of its)
        await db.runAsync("INSERT OR REPLACE INTO items (id, name, kind, grams, per_day, wears, weather, activity, essential, slot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", [
          i.id,
          i.name,
          i.kind,
          i.grams,
          i.perDay,
          i.wears,
          i.weather.join(","),
          i.activity,
          i.essential ? 1 : 0,
          i.slot,
          i.createdAt,
        ]);
    });
  });

export const deleteItem = (id: string) =>
  lock(async () => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM items WHERE id = ?;", [id]);
      await db.runAsync("DELETE FROM packed WHERE item_id = ?;", [id]);
      await db.runAsync("DELETE FROM usages WHERE item_id = ?;", [id]);
    });
  });

type TripRow = { id: string; name: string; start: string; days: string; limit_g: number; bag_g: number; skip: string; closed: number; created_at: number };

export const listTrips = () =>
  lock(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<TripRow>("SELECT * FROM trips ORDER BY start DESC;");
    return rows.map((r): Trip => ({ id: r.id, name: r.name, start: r.start, days: JSON.parse(r.days), limit: r.limit_g, bag: r.bag_g, skip: r.skip ? r.skip.split(",") : [], closed: r.closed === 1, createdAt: r.created_at }));
  });

export const saveTrip = (t: Trip) =>
  lock(async () => {
    const db = await getDb();
    await db.runAsync("INSERT OR REPLACE INTO trips (id, name, start, days, limit_g, bag_g, skip, closed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);", [t.id, t.name, t.start, JSON.stringify(t.days), t.limit, t.bag, t.skip.join(","), t.closed ? 1 : 0, t.createdAt]);
  });

export const deleteTrip = (id: string) =>
  lock(async () => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM trips WHERE id = ?;", [id]);
      await db.runAsync("DELETE FROM packed WHERE trip_id = ?;", [id]);
      await db.runAsync("DELETE FROM usages WHERE trip_id = ?;", [id]);
    });
  });

export const listPacked = () =>
  lock(async () => {
    const db = await getDb();
    return db.getAllAsync<{ trip_id: string; item_id: string }>("SELECT * FROM packed;");
  });

export const setPacked = (tripId: string, itemId: string, on: boolean) =>
  lock(async () => {
    const db = await getDb();
    if (on) await db.runAsync("INSERT OR IGNORE INTO packed (trip_id, item_id) VALUES (?, ?);", [tripId, itemId]);
    else await db.runAsync("DELETE FROM packed WHERE trip_id = ? AND item_id = ?;", [tripId, itemId]);
  });

export const listUsages = () =>
  lock(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<{ trip_id: string; item_id: string; packed: number; used: number; planned: number }>("SELECT * FROM usages;");
    return rows.map((r): Usage => ({ tripId: r.trip_id, itemId: r.item_id, packed: r.packed, used: r.used, planned: r.planned }));
  });

// Разбор поездки: отзывы + закрытие поездки + модель одной транзакцией.
export const closeTrip = (trip: Trip, usages: Usage[], model: unknown) =>
  lock(async () => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM usages WHERE trip_id = ?;", [trip.id]);
      for (const u of usages) await db.runAsync("INSERT INTO usages (trip_id, item_id, packed, used, planned) VALUES (?, ?, ?, ?, ?);", [u.tripId, u.itemId, u.packed, u.used, u.planned]);
      await db.runAsync("UPDATE trips SET closed = 1 WHERE id = ?;", [trip.id]);
      await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('model', ?);", [JSON.stringify(model)]);
    });
  });

export function getMeta<T>(key: string, fallback: T): Promise<T> {
  return lock(async () => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = ?;", [key]);
    if (!row) return fallback;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return fallback;
    }
  });
}

export const setMeta = (key: string, value: unknown) =>
  lock(async () => {
    const db = await getDb();
    await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?);", [key, JSON.stringify(value)]);
  });

export const wipeAll = () =>
  lock(async () => {
    const db = await getDb();
    await db.execAsync("DELETE FROM items; DELETE FROM trips; DELETE FROM packed; DELETE FROM usages; DELETE FROM meta;");
  });

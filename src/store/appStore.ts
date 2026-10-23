// Состояние: гардероб, поездки, разборы → накопленная модель → укладка
// каждой открытой поездки. Укладка дешёвая (ДП на десятки вещей) и считается
// сразу; конфликты (десяток перепланирований) — после отрисовки.

import { create } from "zustand";
import * as repo from "../data/repo";
import { generateId } from "../lib/id";
import { emptyModel, learnTrip, MODEL_VERSION, replayModel, type Model } from "../lib/model";
import { pack, type Packing } from "../lib/pack";
import { findConflicts, type Conflict } from "../lib/conflicts";
import { applyChange, type Change } from "../lib/changes";
import { STARTER } from "../lib/wardrobe";
import { todayLocal } from "../lib/time";
import type { Item, Trip, Usage } from "../lib/types";
import { setHapticsEnabled } from "../services/haptics";

type State = {
  ready: boolean;
  version: number;
  today: string;
  items: Item[];
  trips: Trip[];
  packed: Record<string, string[]>;
  usages: Usage[];
  model: Model;
  haptics: boolean;
  packings: Record<string, Packing>;
  conflicts: Record<string, Conflict[]>;
  refresh: () => Promise<void>;
  rebuild: () => Promise<void>;
  saveItem: (i: Omit<Item, "id" | "createdAt"> & { id?: string; createdAt?: number }) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addStarter: () => Promise<void>;
  saveTrip: (t: Omit<Trip, "id" | "createdAt" | "closed" | "skip"> & { id?: string; createdAt?: number; closed?: boolean; skip?: string[] }) => Promise<string>;
  deleteTrip: (id: string) => Promise<void>;
  togglePacked: (tripId: string, itemId: string) => Promise<void>;
  applyChange: (tripId: string, c: Change) => Promise<void>;
  debrief: (tripId: string, used: Record<string, number>) => Promise<void>;
  setHaptics: (on: boolean) => Promise<void>;
  wipe: () => Promise<void>;
};

let queue: Promise<void> = Promise.resolve();

export const useApp = create<State>((set, get) => ({
  ready: false,
  version: 0,
  today: todayLocal(),
  items: [],
  trips: [],
  packed: {},
  usages: [],
  model: emptyModel(),
  haptics: true,
  packings: {},
  conflicts: {},

  refresh: () => (queue = queue.then(() => get().rebuild()).catch(() => undefined)),

  rebuild: async () => {
    const [items, trips, packedRows, usages, version, saved, haptics] = await Promise.all([
      repo.listItems(),
      repo.listTrips(),
      repo.listPacked(),
      repo.listUsages(),
      repo.getMeta<number>("modelVersion", 0),
      repo.getMeta<Model | null>("model", null),
      repo.getMeta<boolean>("haptics", true),
    ]);
    setHapticsEnabled(haptics);
    let model = saved;
    if (version !== MODEL_VERSION || !model) {
      model = replayModel(trips.filter((t) => t.closed), usages, items);
      await repo.setMeta("model", model);
      await repo.setMeta("modelVersion", MODEL_VERSION);
    }
    const packed: Record<string, string[]> = {};
    for (const r of packedRows) (packed[r.trip_id] ??= []).push(r.item_id);
    const packings: Record<string, Packing> = {};
    for (const t of trips) if (!t.closed) packings[t.id] = pack(t, items, model);
    set({ ready: true, version: get().version + 1, today: todayLocal(), items, trips, packed, usages, model, haptics, packings, conflicts: {} });
    const v = get().version;
    setTimeout(() => {
      const s = get();
      if (s.version !== v) return;
      const conflicts: Record<string, Conflict[]> = {};
      for (const t of s.trips) if (!t.closed) conflicts[t.id] = findConflicts(t, s.items, s.model, s.packings[t.id]);
      set({ conflicts });
    }, 0);
  },

  saveItem: async (i) => {
    await repo.saveItems([{ ...i, id: i.id ?? generateId(), createdAt: i.createdAt ?? Date.now() }]);
    await get().refresh();
  },
  deleteItem: async (id) => {
    await repo.deleteItem(id);
    await repo.setMeta("modelVersion", 0);
    await get().refresh();
  },
  addStarter: async () => {
    const have = new Set(get().items.map((i) => i.name.toLowerCase()));
    const now = Date.now();
    await repo.saveItems(STARTER.filter((p) => !have.has(p.name.toLowerCase())).map((p, k) => ({ ...p, id: generateId(), createdAt: now + k })));
    await get().refresh();
  },
  saveTrip: async (t) => {
    const id = t.id ?? generateId();
    await repo.saveTrip({ ...t, id, createdAt: t.createdAt ?? Date.now(), closed: t.closed ?? false, skip: t.skip ?? [] });
    await get().refresh();
    return id;
  },
  deleteTrip: async (id) => {
    const was = get().trips.find((t) => t.id === id)?.closed;
    await repo.deleteTrip(id);
    if (was) await repo.setMeta("modelVersion", 0);
    await get().refresh();
  },
  togglePacked: async (tripId, itemId) => {
    const on = !(get().packed[tripId] ?? []).includes(itemId);
    await repo.setPacked(tripId, itemId, on);
    set({ packed: { ...get().packed, [tripId]: on ? [...(get().packed[tripId] ?? []), itemId] : (get().packed[tripId] ?? []).filter((x) => x !== itemId) } });
  },
  applyChange: async (tripId, c) => {
    const s = get();
    const t = s.trips.find((x) => x.id === tripId);
    if (!t) return;
    // "Оставить дома" не удаляет вещь из гардероба — она попадает в список "не брать" поездки.
    await repo.saveTrip(applyChange(t, s.items, c).trip);
    await get().refresh();
  },
  debrief: async (tripId, used) => {
    const s = get();
    const t = s.trips.find((x) => x.id === tripId);
    const p = s.packings[tripId];
    if (!t || !p) return;
    const usages: Usage[] = p.lines.filter((l) => l.count > 0).map((l) => ({ tripId, itemId: l.item.id, packed: l.count, used: Math.min(l.count, used[l.item.id] ?? l.count), planned: l.count }));
    const model: Model = JSON.parse(JSON.stringify(s.model));
    learnTrip(model, usages, s.items);
    await repo.closeTrip(t, usages, model);
    await get().refresh();
  },
  setHaptics: async (on) => {
    await repo.setMeta("haptics", on);
    await get().refresh();
  },
  wipe: async () => {
    await repo.wipeAll();
    await get().refresh();
  },
}));

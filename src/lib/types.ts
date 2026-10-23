// Общие типы. Вес — граммы. День поездки — индекс 0..N−1.

export const WEATHER = ["hot", "mild", "cold", "rain"] as const;
export type Weather = (typeof WEATHER)[number];
export const ACTIVITIES = ["city", "hike", "beach", "formal", "sport"] as const;
export type Activity = (typeof ACTIVITIES)[number];

export type ItemKind = "wear" | "gear" | "toiletry";

export type Item = {
  id: string;
  name: string;
  kind: ItemKind;
  grams: number;
  perDay: number; // сколько штук "расходуется" в день, когда вещь нужна (носки 1)
  wears: number; // сколько дней можно носить до стирки (0 — не стирается, берётся 1 шт.)
  weather: Weather[]; // пусто — в любую погоду
  activity: Activity | null; // null — каждый день
  essential: boolean; // нельзя убрать из сумки совсем
  wearable: boolean; // можно надеть в дорогу (не кладётся в вес сумки)
  createdAt: number;
};

export type TripDay = { weather: Weather; activities: Activity[]; laundry: boolean };

export type Trip = {
  id: string;
  name: string;
  start: string;
  days: TripDay[];
  limit: number; // лимит сумки, г
  bag: number; // вес пустой сумки, г
  skip: string[]; // вещи, которые в эту поездку не берём
  closed: boolean; // поездка завершена и разобрана
  createdAt: number;
};

// Разбор после поездки: сколько взял и сколько реально понадобилось.
export type Usage = { tripId: string; itemId: string; packed: number; used: number; planned: number };

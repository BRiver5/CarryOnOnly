import type { SQLiteDatabase } from "expo-sqlite";

// Каждая миграция — одна ступень схемы. Не редактируй уже выпущенную миграцию —
// добавляй новую в конец массива. PRAGMA user_version хранит номер последней
// применённой ступени, миграции применяются последовательно от текущего значения.
const migrations: string[] = [
  `
  -- Вещь гардероба; weather — список через запятую (пусто = любая погода).
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    grams INTEGER NOT NULL,
    per_day REAL NOT NULL,
    wears INTEGER NOT NULL,
    weather TEXT NOT NULL,
    activity TEXT,
    essential INTEGER NOT NULL,
    slot TEXT,
    created_at INTEGER NOT NULL
  );
  -- Поездка; days — JSON массива дней (погода, занятия, стирка).
  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    start TEXT NOT NULL,
    days TEXT NOT NULL,
    limit_g INTEGER NOT NULL,
    bag_g INTEGER NOT NULL,
    skip TEXT NOT NULL DEFAULT '',
    closed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  -- Отметки "уже в сумке" по поездке.
  CREATE TABLE IF NOT EXISTS packed (
    trip_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    PRIMARY KEY (trip_id, item_id)
  );
  -- Разбор после поездки — наблюдения модели.
  CREATE TABLE IF NOT EXISTS usages (
    trip_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    packed INTEGER NOT NULL,
    used INTEGER NOT NULL,
    planned INTEGER NOT NULL,
    PRIMARY KEY (trip_id, item_id)
  );
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
  const currentVersion = row?.user_version ?? 0;

  for (let i = currentVersion; i < migrations.length; i++) {
    await db.execAsync(migrations[i]);
    await db.execAsync(`PRAGMA user_version = ${i + 1};`);
  }
}

/** Cache of public-repo analyses only. Never pass chats, ideas or private code here. */
export async function getCached<T>(db: D1Database, key: string, maxAgeMs = Infinity): Promise<T | null> {
  const row = await db.prepare("SELECT payload, created_at FROM analyses WHERE cache_key = ?").bind(key).first<{ payload: string; created_at: number }>();
  if (!row || Date.now() - row.created_at > maxAgeMs) return null;
  return JSON.parse(row.payload) as T;
}

export async function putCached(db: D1Database, key: string, value: unknown): Promise<void> {
  await db.prepare("INSERT OR REPLACE INTO analyses (cache_key, payload, created_at) VALUES (?, ?, ?)").bind(key, JSON.stringify(value), Date.now()).run();
}

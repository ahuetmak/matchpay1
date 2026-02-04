import { env } from "./cf";

export async function qAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const { DB } = env();
  const res = await DB.prepare(sql).bind(...params).all();
  return (res.results ?? []) as T[];
}

export async function qOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await qAll<T>(sql, params);
  return rows[0] ?? null;
}

export async function exec(sql: string, params: any[] = []): Promise<void> {
  const { DB } = env();
  await DB.prepare(sql).bind(...params).run();
}

import { env } from "./cf";

export async function rateLimit(key: string, limit: number, windowSec: number) {
  const { KV } = env();
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSec);
  const k = `rl:${key}:${bucket}`;
  const v = await KV.get(k);
  const count = (v ? parseInt(v, 10) : 0) + 1;
  await KV.put(k, String(count), { expirationTtl: windowSec + 2 });
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

export async function idemCheckOnce(idemKey: string, ttlSec: number) {
  const { KV } = env();
  const k = `idem:${idemKey}`;
  const existing = await KV.get(k);
  if (existing) return { fresh: false };
  await KV.put(k, "1", { expirationTtl: ttlSec });
  return { fresh: true };
}

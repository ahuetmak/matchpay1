export function jparse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}
export function jstringify(v: any): string {
  try { return JSON.stringify(v ?? null); } catch { return "null"; }
}

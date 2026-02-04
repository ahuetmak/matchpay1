import { getRequestContext } from "@cloudflare/next-on-pages";

export function env() {
  const ctx = getRequestContext();
  return ctx.env as unknown as CloudflareEnv;
}

export function ipFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "0.0.0.0";
}

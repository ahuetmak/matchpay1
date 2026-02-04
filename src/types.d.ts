export {};

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    KV: KVNamespace;
    MVP_ADMIN_KEY: string;
    EVENT_SIGNING_SECRET: string;
  }
}

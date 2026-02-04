# MatchPay (Cloudflare Pages-ready)

Este repo está listo para **Cloudflare Pages + Pages Functions** usando:
- **D1** (SQLite) como DB (binding: `DB`)
- **KV** para rate-limit e idempotencia (binding: `KV`)
- **Next.js App Router** + `@cloudflare/next-on-pages`

## Deploy (Cloudflare Pages)
- Build command: `npm run build`
- Output directory: `.vercel/output/static`
- Env Vars:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SITE_NAME`
  - `NEXT_PUBLIC_SITE_DESCRIPTION`
  - `MVP_ADMIN_KEY`
  - `EVENT_SIGNING_SECRET`
- Bindings (Pages > Settings > Functions):
  - D1: `DB`
  - KV: `KV`

## DB init (D1)
En Cloudflare D1, ejecuta el SQL de: `migrations/0001_init.sql`

## URLs MVP
- SEO:
  - `/ofertas`
  - `/ofertas/[slug]`
  - `/marcas/[slug]`
  - `/sitemap.xml`
  - `/robots.txt`
- Flujo:
  - `/join/[slug]?partner_id=UUID`
  - `/t/[token]` (redirect tracking + mp_token)
- API:
  - `POST /api/events`
  - `POST /api/offers` (admin: header `x-admin-key`)
  - `GET /api/leads` (admin)
  - `PATCH /api/leads` (admin: validar)
  - `POST /api/payouts` (admin)
  - `PATCH /api/payouts` (admin: marcar pagado)

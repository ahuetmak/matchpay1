import type { MetadataRoute } from "next";
import { site } from "@/lib/seo";
import { qAll } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const offers = await qAll<{ slug: string; updated_at: string }>(
    "SELECT slug, updated_at FROM offers WHERE status='ACTIVE' ORDER BY updated_at DESC LIMIT 5000"
  );
  const brands = await qAll<{ slug: string; updated_at: string }>(
    "SELECT slug, updated_at FROM brands WHERE status='ACTIVE' ORDER BY updated_at DESC LIMIT 5000"
  );

  return [
    { url: `${site.baseUrl}/`, lastModified: new Date() },
    { url: `${site.baseUrl}/ofertas`, lastModified: new Date() },
    ...offers.map(o => ({ url: `${site.baseUrl}/ofertas/${o.slug}`, lastModified: new Date(o.updated_at) })),
    ...brands.map(b => ({ url: `${site.baseUrl}/marcas/${b.slug}`, lastModified: new Date(b.updated_at) }))
  ];
}

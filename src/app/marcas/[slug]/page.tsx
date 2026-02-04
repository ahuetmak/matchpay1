import { notFound } from "next/navigation";
import { qAll, qOne } from "@/lib/db";

export const revalidate = 120;

type Brand = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  description: string | null;
  status: string;
};

type Offer = {
  slug: string;
  name: string;
  payout_amount: string;
  currency: string;
  conversion_type: string;
  payout_type: string;
};

export default async function BrandPage({ params }: { params: { slug: string } }) {
  const brand = await qOne<Brand>("SELECT * FROM brands WHERE slug=? LIMIT 1", [params.slug]);
  if (!brand || brand.status !== "ACTIVE") notFound();

  const offers = await qAll<Offer>(\`
    SELECT slug, name, payout_amount, currency, conversion_type, payout_type
    FROM offers
    WHERE brand_id=? AND status='ACTIVE'
    ORDER BY updated_at DESC
    LIMIT 100
  \`, [brand.id]);

  const jsonLd = { "@context":"https://schema.org","@type":"Organization",name:brand.name,url:brand.website ?? undefined,description:brand.description ?? "" };

  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 style={{ margin: "0 0 10px" }}>{brand.name}</h1>
      <p style={{ opacity: 0.9, marginTop: 0, lineHeight: 1.5 }}>{brand.description}</p>
      {brand.website && <p><a href={brand.website} target="_blank" style={{ color: "#111" }}>Sitio oficial</a></p>}

      <h2 style={{ marginTop: 18 }}>Ofertas activas</h2>
      <ul style={{ display: "grid", gap: 10, listStyle: "none", padding: 0, marginTop: 12 }}>
        {offers.map((o) => (
          <li key={o.slug} style={{ border: "1px solid #eee", padding: 14, borderRadius: 12 }}>
            <a href={\`/ofertas/\${o.slug}\`} style={{ fontWeight: 900, color: "#111", textDecoration: "none" }}>{o.name}</a>
            <div style={{ fontFamily: "ui-monospace, Menlo, monospace", marginTop: 6 }}>
              {o.conversion_type} · {o.payout_type} · {o.payout_amount} {o.currency}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

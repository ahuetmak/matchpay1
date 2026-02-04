import { qAll } from "@/lib/db";
import { jparse } from "@/lib/json";

export const revalidate = 60;

type Row = {
  slug: string;
  name: string;
  description: string | null;
  conversion_type: string;
  payout_type: string;
  payout_amount: string;
  currency: string;
  allowed_channels: string;
  geo: string;
  updated_at: string;
  brand_name: string;
  brand_slug: string;
};

export default async function OffersIndex() {
  const offers = await qAll<Row>(\`
    SELECT o.slug, o.name, o.description, o.conversion_type, o.payout_type, o.payout_amount, o.currency,
           o.allowed_channels, o.geo, o.updated_at,
           b.name AS brand_name, b.slug AS brand_slug
    FROM offers o
    JOIN brands b ON b.id=o.brand_id
    WHERE o.status='ACTIVE'
    ORDER BY o.updated_at DESC
    LIMIT 300
  \`);

  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
      <h1 style={{ margin: "0 0 10px" }}>Ofertas activas</h1>
      <p style={{ margin: 0, opacity: 0.85 }}>Directorio público indexable (SEO listo).</p>

      <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0, marginTop: 18 }}>
        {offers.map((o) => {
          const channels = jparse<string[]>(o.allowed_channels, []);
          const geo = jparse<string[]>(o.geo, []);
          return (
            <li key={o.slug} style={{ border: "1px solid #eee", padding: 16, borderRadius: 12 }}>
              <a href={\`/ofertas/\${o.slug}\`} style={{ fontSize: 18, fontWeight: 800, textDecoration: "none", color: "#111" }}>
                {o.name}
              </a>
              <div style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.4 }}>{o.description ?? ""}</div>
              <div style={{ marginTop: 10, fontFamily: "ui-monospace, Menlo, monospace" }}>
                {o.conversion_type} · {o.payout_type} · {o.payout_amount} {o.currency}
              </div>
              <div style={{ marginTop: 10, opacity: 0.85 }}>
                Marca: <a href={\`/marcas/\${o.brand_slug}\`} style={{ color: "#111" }}>{o.brand_name}</a>
              </div>
              <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
                Canales: {channels.join(", ") || "—"} · Geo: {geo.join(", ") || "—"}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

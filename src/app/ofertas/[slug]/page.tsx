import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { qOne } from "@/lib/db";
import { site } from "@/lib/seo";
import { jparse } from "@/lib/json";

export const revalidate = 60;

type Row = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  conversion_type: string;
  payout_type: string;
  payout_amount: string;
  currency: string;
  join_mode: string;
  attribution_window_days: number;
  validation_rules: string;
  terms: string;
  landing_url: string | null;
  allowed_channels: string;
  geo: string;
  updated_at: string;
  brand_name: string;
  brand_slug: string;
  brand_website: string | null;
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const offer = await qOne<Row>(\`
    SELECT o.*, b.name AS brand_name, b.slug AS brand_slug, b.website AS brand_website
    FROM offers o JOIN brands b ON b.id=o.brand_id
    WHERE o.slug=? LIMIT 1
  \`, [params.slug]);
  if (!offer || offer.status !== "ACTIVE") return {};
  return {
    title: offer.name,
    description: offer.description ?? undefined,
    openGraph: { type: "article", title: offer.name, description: offer.description ?? undefined },
    alternates: { canonical: \`\${site.baseUrl}/ofertas/\${params.slug}\` }
  };
}

export default async function OfferPage({ params, searchParams }: any) {
  const offer = await qOne<Row>(\`
    SELECT o.*, b.name AS brand_name, b.slug AS brand_slug, b.website AS brand_website
    FROM offers o JOIN brands b ON b.id=o.brand_id
    WHERE o.slug=? LIMIT 1
  \`, [params.slug]);

  if (!offer || offer.status !== "ACTIVE") notFound();

  const channels = jparse<string[]>(offer.allowed_channels, []);
  const geo = jparse<string[]>(offer.geo, []);
  const rules = jparse<any>(offer.validation_rules, {});
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: offer.name,
    description: offer.description ?? "",
    priceCurrency: offer.currency,
    price: offer.payout_amount,
    url: \`\${site.baseUrl}/ofertas/\${offer.slug}\`,
    seller: { "@type": "Organization", name: offer.brand_name, url: offer.brand_website ?? undefined }
  };

  const partnerId = searchParams?.partner_id as string | undefined;

  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <h1 style={{ margin: "0 0 10px" }}>{offer.name}</h1>
      <p style={{ opacity: 0.9, lineHeight: 1.5, marginTop: 0 }}>{offer.description}</p>

      <section style={{ marginTop: 16, border: "1px solid #eee", padding: 16, borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Pago y reglas</h2>
        <div style={{ fontFamily: "ui-monospace, Menlo, monospace", lineHeight: 1.6 }}>
          Conversión: {offer.conversion_type}<br />
          Comisión: {offer.payout_type} · {offer.payout_amount} {offer.currency}<br />
          Ventana atribución: {offer.attribution_window_days} días<br />
          Modo de entrada: {offer.join_mode}<br />
          Canales: {channels.join(", ") || "—"}<br />
          Geo: {geo.join(", ") || "—"}<br />
        </div>

        <h3 style={{ marginTop: 14 }}>Validación</h3>
        <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 12, borderRadius: 10, border: "1px solid #eee" }}>
          {JSON.stringify(rules, null, 2)}
        </pre>

        <h3 style={{ marginTop: 14 }}>Términos</h3>
        <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 12, borderRadius: 10, border: "1px solid #eee" }}>
          {offer.terms}
        </pre>
      </section>

      <section style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href={partnerId ? \`/join/\${offer.slug}?partner_id=\${partnerId}\` : \`/join/\${offer.slug}\`} style={btn()}>
          Unirme como Partner
        </a>
        <a href={\`/marcas/\${offer.brand_slug}\`} style={btnGhost()}>
          Ver marca
        </a>
      </section>
    </main>
  );
}

function btn(): React.CSSProperties {
  return { display: "inline-block", padding: "12px 14px", borderRadius: 12, border: "1px solid #111", textDecoration: "none", color: "#111", fontWeight: 800 };
}
function btnGhost(): React.CSSProperties {
  return { display: "inline-block", padding: "12px 14px", borderRadius: 12, border: "1px solid #ddd", textDecoration: "none", color: "#111" };
}

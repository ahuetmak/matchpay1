import { qOne, exec } from "@/lib/db";
import { randomToken, uuidv4 } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";

type Offer = { id: string; slug: string; name: string; status: string; join_mode: string };

export default async function JoinOffer({ params, searchParams }: any) {
  const offer = await qOne<Offer>("SELECT id, slug, name, status, join_mode FROM offers WHERE slug=? LIMIT 1", [params.slug]);
  if (!offer || offer.status !== "ACTIVE") return <div style={{ padding: 16 }}>No disponible</div>;

  const partnerId = (searchParams.partner_id as string | undefined) ?? undefined;
  if (!partnerId) {
    return (
      <main style={{ maxWidth: 760, margin: "40px auto", padding: 16 }}>
        <h1>Unirme: {offer.name}</h1>
        <p>Para MVP agrega <code>?partner_id=UUID</code>. (Luego se reemplaza por auth real)</p>
      </main>
    );
  }

  const rl = await rateLimit(\`join:\${partnerId}\`, 50, 86400);
  if (!rl.ok) {
    return (
      <main style={{ maxWidth: 760, margin: "40px auto", padding: 16 }}>
        <h1>Límite diario alcanzado</h1>
        <p>Protección anti-spam activada.</p>
      </main>
    );
  }

  // Upsert membership
  const memId = uuidv4();
  await exec(\`
    INSERT INTO offer_members (id, offer_id, partner_id, status)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(offer_id, partner_id) DO UPDATE SET status=excluded.status
  \`, [memId, offer.id, partnerId, offer.join_mode === "AUTO" ? "ACTIVE" : "PENDING"]);

  // Get existing link
  const existing = await qOne<{ token: string }>("SELECT token FROM tracking_links WHERE offer_id=? AND partner_id=? LIMIT 1", [offer.id, partnerId]);
  const token = existing?.token ?? randomToken(16);

  if (!existing) {
    await exec("INSERT INTO tracking_links (id, offer_id, partner_id, token) VALUES (?, ?, ?, ?)", [uuidv4(), offer.id, partnerId, token]);
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/t/${token}?utm_source=partner&utm_campaign=${offer.slug}`;

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 16 }}>
      <h1>Listo ✅</h1>
      <p>Tu link rastreable:</p>
      <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", border: "1px solid #eee", padding: 12, borderRadius: 10 }}>{url}</pre>
      <p style={{ opacity: 0.9, lineHeight: 1.5 }}>
        Todo lo que llegue con ese token queda trazado (click/lead/conversion). Dark social: se pasa como <code>mp_token</code>.
      </p>
      <p><a href={`/ofertas/${offer.slug}`} style={{ color: "#111" }}>Volver a la oferta</a></p>
    </main>
  );
}

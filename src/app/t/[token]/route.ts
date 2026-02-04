import { NextRequest, NextResponse } from "next/server";
import { qOne, exec } from "@/lib/db";
import { sha256Hex, uuidv4 } from "@/lib/security";
import { idemCheckOnce } from "@/lib/rateLimit";
import { ipFromHeaders } from "@/lib/cf";

type LinkRow = {
  offer_id: string;
  partner_id: string;
  token: string;
  landing_url: string | null;
  offer_slug: string;
  brand_id: string;
  offer_status: string;
};

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  const url = new URL(req.url);
  const utm = Object.fromEntries(url.searchParams.entries());
  const base = process.env.NEXT_PUBLIC_APP_URL!;

  const link = await qOne<LinkRow>(\`
    SELECT tl.offer_id, tl.partner_id, tl.token,
           o.landing_url AS landing_url, o.slug AS offer_slug, o.brand_id AS brand_id, o.status AS offer_status
    FROM tracking_links tl
    JOIN offers o ON o.id=tl.offer_id
    WHERE tl.token=? LIMIT 1
  \`, [token]);

  if (!link || link.offer_status !== "ACTIVE") return NextResponse.redirect(new URL("/", base));

  const minuteBucket = Math.floor(Date.now() / 60000);
  const idem = await sha256Hex(\`click|\${token}|\${minuteBucket}|\${JSON.stringify(utm)}\`);
  const fresh = await idemCheckOnce(idem, 120); // 2 min TTL
  if (fresh.fresh) {
    const ip = ipFromHeaders(req.headers);
    const ipHash = await sha256Hex(ip);
    await exec(\`
      INSERT INTO events (id, event_type, idempotency_key, attribution_key, offer_id, partner_id, brand_id, source, user_agent, ip_hash, payload)
      VALUES (?, 'click', ?, ?, ?, ?, ?, 'redirect', ?, ?, ?)
    \`, [uuidv4(), idem, token, link.offer_id, link.partner_id, link.brand_id, req.headers.get("user-agent") ?? "", ipHash, JSON.stringify({ utm })]);
  }

  const target = link.landing_url ? new URL(link.landing_url) : new URL(`/ofertas/${link.offer_slug}`, base);
  target.searchParams.set("mp_token", token);
  for (const [k, v] of Object.entries(utm)) target.searchParams.set(k, v);

  return NextResponse.redirect(target);
}

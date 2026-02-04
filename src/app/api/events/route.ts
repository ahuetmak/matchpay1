import { NextRequest, NextResponse } from "next/server";
import { exec, qOne } from "@/lib/db";
import { env, ipFromHeaders } from "@/lib/cf";
import { sha256Hex, uuidv4 } from "@/lib/security";
import { rateLimit, idemCheckOnce } from "@/lib/rateLimit";
import { z } from "zod";

const EventSchema = z.object({
  event_type: z.string().min(1),
  idempotency_key: z.string().optional(),
  attribution_key: z.string().optional(),
  offer_id: z.string().optional(),
  partner_id: z.string().optional(),
  brand_id: z.string().optional(),
  source: z.string().optional(),
  payload: z.any().optional()
});

export async function POST(req: NextRequest) {
  const ip = ipFromHeaders(req.headers);
  const rl = await rateLimit(`events:ip:${ip}`, 120, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const raw = await req.text();
  let json: any = {};
  try { json = JSON.parse(raw || "{}"); } catch { json = {}; }
  const body = EventSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });

  const secret = env().EVENT_SIGNING_SECRET;
  const sig = req.headers.get("x-matchpay-signature");
  if (sig && secret) {
    const expected = await sha256Hex(`${raw}.${secret}`);
    if (sig !== expected) return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 401 });
  }

  const eventType = body.data.event_type.trim();
  const idem = body.data.idempotency_key
    ?? await sha256Hex(`${eventType}|${body.data.attribution_key ?? ""}|${body.data.offer_id ?? ""}|${JSON.stringify(body.data.payload ?? {})}`);

  // KV idempotency gate
  const fresh = await idemCheckOnce(idem, 24 * 60 * 60);
  if (!fresh.fresh) return NextResponse.json({ ok: true, deduped: true });

  const ipHash = await sha256Hex(ip);
  const id = uuidv4();
  await exec(\`
    INSERT INTO events (id, event_type, idempotency_key, attribution_key, offer_id, partner_id, brand_id, source, user_agent, ip_hash, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  \`, [
    id,
    eventType,
    idem,
    body.data.attribution_key ?? null,
    body.data.offer_id ?? null,
    body.data.partner_id ?? null,
    body.data.brand_id ?? null,
    body.data.source ?? null,
    req.headers.get("user-agent") ?? "",
    ipHash,
    JSON.stringify(body.data.payload ?? null)
  ]);

  // Lead: create lead PENDING with dedupe + geo rules
  if (eventType === "lead") {
    if (!body.data.offer_id || !body.data.partner_id) return NextResponse.json({ ok: true, event_id: id, note: "missing_offer_or_partner" });

    const prl = await rateLimit(`leads:partner:${body.data.partner_id}`, 400, 86400);
    if (!prl.ok) return NextResponse.json({ ok: false, error: "partner_rate_limited" }, { status: 429 });

    const offer = await qOne<{ geo: string; validation_rules: string }>("SELECT geo, validation_rules FROM offers WHERE id=? LIMIT 1", [body.data.offer_id]);
    if (!offer) return NextResponse.json({ ok: true, event_id: id, note: "offer_not_found" });

    const payload = body.data.payload ?? {};
    const email = (payload.email ? String(payload.email).toLowerCase() : null);
    const phone = payload.phone ? String(payload.phone) : null;
    const geo = payload.geo ? String(payload.geo) : null;

    if (!email && !phone) return NextResponse.json({ ok: true, event_id: id, note: "missing_contact" });

    const allowedGeo = JSON.parse(offer.geo || "[]");
    if (allowedGeo.length && geo && !allowedGeo.includes(geo)) {
      await exec(\`
        INSERT INTO leads (id, offer_id, partner_id, attribution_key, email, phone, geo, status, reason, validated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'REJECTED', 'geo_not_allowed', datetime('now'))
      \`, [uuidv4(), body.data.offer_id, body.data.partner_id, body.data.attribution_key ?? null, email, phone, geo]);
      return NextResponse.json({ ok: true, event_id: id, note: "geo_not_allowed" });
    }

    const rules = JSON.parse(offer.validation_rules || "{}");
    const noDupDays = Number(rules.no_duplicate_days ?? 14);
    const dup = await qOne<{ id: string }>(\`
      SELECT id FROM leads
      WHERE offer_id=?
        AND created_at >= datetime('now', ?)
        AND ( (? IS NOT NULL AND email=?) OR (? IS NOT NULL AND phone=?) )
      LIMIT 1
    \`, [body.data.offer_id, `-${noDupDays} days`, email, email, phone, phone]);

    if (!dup) {
      await exec(\`
        INSERT INTO leads (id, offer_id, partner_id, attribution_key, email, phone, geo, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
      \`, [uuidv4(), body.data.offer_id, body.data.partner_id, body.data.attribution_key ?? null, email, phone, geo]);
    }
  }

  return NextResponse.json({ ok: true, event_id: id });
}

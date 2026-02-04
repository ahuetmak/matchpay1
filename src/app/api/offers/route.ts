import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exec, qOne } from "@/lib/db";
import { env } from "@/lib/cf";
import { uuidv4 } from "@/lib/security";

const OfferCreate = z.object({
  brand_id: z.string().min(10),
  slug: z.string().min(3),
  name: z.string().min(3),
  description: z.string().optional(),
  conversion_type: z.enum(["SALE","VALID_LEAD","BOOKED_CALL","COMPLETED_DEMO"]),
  payout_type: z.enum(["PERCENT","FIXED","PER_EVENT"]),
  payout_amount: z.string(),
  currency: z.string().min(3).max(3).default("USD"),
  join_mode: z.enum(["AUTO","APPROVAL"]).default("AUTO"),
  attribution_window_days: z.number().int().min(1).max(90).default(7),
  allowed_channels: z.array(z.string()).default([]),
  geo: z.array(z.string()).default([]),
  landing_url: z.string().url().optional(),
  assets_json: z.any().optional(),
  validation_rules: z.any(),
  terms: z.string().min(20)
});

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (!adminKey || adminKey !== env().MVP_ADMIN_KEY) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const data = OfferCreate.parse(await req.json());

  if (!data.validation_rules || Object.keys(data.validation_rules).length === 0) {
    return NextResponse.json({ ok: false, error: "missing_validation_rules" }, { status: 400 });
  }
  if (Number(data.payout_amount) <= 0) return NextResponse.json({ ok: false, error: "invalid_payout" }, { status: 400 });

  const exists = await qOne<{ id: string }>("SELECT id FROM offers WHERE slug=? LIMIT 1", [data.slug]);
  if (exists) return NextResponse.json({ ok: false, error: "slug_taken" }, { status: 409 });

  await exec(\`
    INSERT INTO offers (
      id, brand_id, slug, name, description, status,
      conversion_type, payout_type, payout_amount, currency,
      join_mode, attribution_window_days,
      validation_rules, terms, landing_url, assets_json,
      allowed_channels, geo, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  \`, [
    uuidv4(),
    data.brand_id,
    data.slug,
    data.name,
    data.description ?? null,
    data.conversion_type,
    data.payout_type,
    data.payout_amount,
    data.currency,
    data.join_mode,
    data.attribution_window_days,
    JSON.stringify(data.validation_rules),
    data.terms,
    data.landing_url ?? null,
    data.assets_json ? JSON.stringify(data.assets_json) : null,
    JSON.stringify(data.allowed_channels),
    JSON.stringify(data.geo)
  ]);

  return NextResponse.json({ ok: true });
}

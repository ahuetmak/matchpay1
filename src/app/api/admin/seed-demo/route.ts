import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/cf";
import { exec, qOne } from "@/lib/db";
import { uuidv4, randomToken } from "@/lib/security";

function authAdmin(req: NextRequest) {
  const k = req.headers.get("x-admin-key");
  return k && k === env().MVP_ADMIN_KEY;
}

export async function POST(req: NextRequest) {
  if (!authAdmin(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const brandSlug = "marca-demo";
  let brand = await qOne<any>("SELECT * FROM brands WHERE slug=? LIMIT 1", [brandSlug]);
  if (!brand) {
    const userId = uuidv4();
    await exec("INSERT INTO users (id, email, country) VALUES (?, ?, ?)", [userId, "brand@demo.com", "MX"]);
    await exec("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)", [uuidv4(), userId, "BRAND"]);
    const brandId = uuidv4();
    await exec(
      "INSERT INTO brands (id, user_id, slug, name, website, description) VALUES (?, ?, ?, ?, ?, ?)",
      [brandId, userId, brandSlug, "Marca Demo", "https://example.com", "Marca de prueba"]
    );
    brand = { id: brandId };
  }

  let partner = await qOne<any>("SELECT * FROM partners LIMIT 1", []);
  if (!partner) {
    const userId = uuidv4();
    await exec("INSERT INTO users (id, email, country) VALUES (?, ?, ?)", [userId, "partner@demo.com", "MX"]);
    await exec("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)", [uuidv4(), userId, "PARTNER"]);
    const pid = uuidv4();
    await exec(
      "INSERT INTO partners (id, user_id, display_name, niche_tags, languages, countries, methods) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [pid, userId, "Partner Demo", JSON.stringify(["marketing"]), JSON.stringify(["es"]), JSON.stringify(["MX"]), JSON.stringify(["contenido"])]
    );
    partner = { id: pid };
    await exec("INSERT INTO wallets (id, partner_id, balance, currency) VALUES (?, ?, '0', 'USD')", [uuidv4(), pid]);
  }

  const offerSlug = "oferta-demo";
  let offer = await qOne<any>("SELECT * FROM offers WHERE slug=? LIMIT 1", [offerSlug]);
  if (!offer) {
    const oid = uuidv4();
    await exec(
      "INSERT INTO offers (id, brand_id, slug, name, description, status, conversion_type, payout_type, payout_amount, currency, join_mode, attribution_window_days, validation_rules, terms, landing_url, allowed_channels, geo) VALUES (?, ?, ?, ?, ?, 'ACTIVE', 'VALID_LEAD', 'FIXED', '8.00', 'USD', 'AUTO', 7, ?, ?, ?, ?, ?)",
      [
        oid,
        brand.id,
        offerSlug,
        "Oferta Demo (Lead válido)",
        "Pagamos por lead válido con reglas claras.",
        JSON.stringify({ required_fields: ["email_or_phone"], no_duplicate_days: 14, allowed_geo: ["MX"] }),
        "No spam. Validación en 72h. Pagos cada 14 días.",
        "https://example.com/landing",
        JSON.stringify(["tiktok", "whatsapp"]),
        JSON.stringify(["MX"])
      ]
    );
    offer = { id: oid };
  }

  const existing = await qOne<any>("SELECT token FROM tracking_links WHERE offer_id=? AND partner_id=? LIMIT 1", [offer.id, partner.id]);
  if (!existing) {
    const token = randomToken(16);
    await exec("INSERT INTO tracking_links (id, offer_id, partner_id, token) VALUES (?, ?, ?, ?)", [uuidv4(), offer.id, partner.id, token]);
  }

  return NextResponse.json({ ok: true, demo: { brand_slug: brandSlug, offer_slug: offerSlug } });
}

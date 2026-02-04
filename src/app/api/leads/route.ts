import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/cf";
import { qAll, qOne, exec } from "@/lib/db";
import { uuidv4 } from "@/lib/security";

function authAdmin(req: NextRequest) {
  const k = req.headers.get("x-admin-key");
  return k && k === env().MVP_ADMIN_KEY;
}

export async function GET(req: NextRequest) {
  if (!authAdmin(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const offerId = url.searchParams.get("offer_id");
  const partnerId = url.searchParams.get("partner_id");

  const clauses: string[] = [];
  const params: any[] = [];

  if (status) { clauses.push("status=?"); params.push(status); }
  if (offerId) { clauses.push("offer_id=?"); params.push(offerId); }
  if (partnerId) { clauses.push("partner_id=?"); params.push(partnerId); }

  const sql =
    "SELECT * FROM leads " +
    (clauses.length ? ("WHERE " + clauses.join(" AND ") + " ") : "") +
    "ORDER BY created_at DESC LIMIT 200";

  const leads = await qAll<any>(sql, params);
  return NextResponse.json({ ok: true, leads });
}

const Validate = z.object({
  lead_id: z.string().min(10),
  status: z.enum(["APPROVED","REJECTED"]),
  reason: z.string().min(3).max(300).optional()
});

export async function PATCH(req: NextRequest) {
  if (!authAdmin(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const data = Validate.parse(await req.json());
  const lead = await qOne<any>("SELECT * FROM leads WHERE id=? LIMIT 1", [data.lead_id]);
  if (!lead) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  await exec(
    "UPDATE leads SET status=?, reason=?, validated_at=datetime('now') WHERE id=?",
    [data.status, data.reason ?? null, data.lead_id]
  );

  if (data.status === "APPROVED") {
    const offer = await qOne<any>("SELECT conversion_type, payout_amount, currency FROM offers WHERE id=? LIMIT 1", [lead.offer_id]);
    if (offer && offer.conversion_type === "VALID_LEAD") {
      let wallet = await qOne<any>("SELECT * FROM wallets WHERE partner_id=? LIMIT 1", [lead.partner_id]);
      if (!wallet) {
        const wid = uuidv4();
        await exec("INSERT INTO wallets (id, partner_id, balance, currency) VALUES (?, ?, '0', ?)", [wid, lead.partner_id, offer.currency]);
        wallet = { id: wid, balance: "0" };
      }
      const newBalance = (Number(wallet.balance ?? "0") + Number(offer.payout_amount)).toString();
      await exec("UPDATE wallets SET balance=?, updated_at=datetime('now') WHERE partner_id=?", [newBalance, lead.partner_id]);
    }
  }

  return NextResponse.json({ ok: true });
}

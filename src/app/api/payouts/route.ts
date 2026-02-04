import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/cf";
import { qOne, exec } from "@/lib/db";
import { uuidv4 } from "@/lib/security";

function authAdmin(req: NextRequest) {
  const k = req.headers.get("x-admin-key");
  return k && k === env().MVP_ADMIN_KEY;
}

const CreatePayout = z.object({
  partner_id: z.string().min(10),
  amount: z.string(),
  currency: z.string().min(3).max(3).default("USD"),
  note: z.string().optional()
});

export async function POST(req: NextRequest) {
  if (!authAdmin(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const data = CreatePayout.parse(await req.json());
  let wallet = await qOne<any>("SELECT * FROM wallets WHERE partner_id=? LIMIT 1", [data.partner_id]);
  if (!wallet) {
    const wid = uuidv4();
    await exec("INSERT INTO wallets (id, partner_id, balance, currency) VALUES (?, ?, '0', ?)", [wid, data.partner_id, data.currency]);
    wallet = { id: wid, balance: "0", currency: data.currency };
  }

  const balance = Number(wallet.balance ?? "0");
  const amount = Number(data.amount);
  if (amount <= 0 || amount > balance) return NextResponse.json({ ok: false, error: "invalid_amount" }, { status: 400 });

  const pid = uuidv4();
  await exec(
    "INSERT INTO payouts (id, wallet_id, amount, currency, status, note) VALUES (?, ?, ?, ?, 'APPROVED', ?)",
    [pid, wallet.id, data.amount, data.currency, data.note ?? null]
  );

  const newBalance = (balance - amount).toString();
  await exec("UPDATE wallets SET balance=?, updated_at=datetime('now') WHERE id=?", [newBalance, wallet.id]);

  return NextResponse.json({ ok: true, payout_id: pid });
}

const MarkPaid = z.object({ payout_id: z.string().min(10) });

export async function PATCH(req: NextRequest) {
  if (!authAdmin(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const data = MarkPaid.parse(await req.json());
  await exec("UPDATE payouts SET status='PAID', paid_at=datetime('now') WHERE id=?", [data.payout_id]);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook Auto Bank: POST https://vanhung.xyz/api/webhook/bank
 * Header: Authorization: Apikey <BANK_WEBHOOK_SECRET>
 * Hỗ trợ chuẩn JSON của SePay / Casso / Web2M
 */
export async function POST(request: Request) {
  const secret = process.env.BANK_WEBHOOK_SECRET || "";
  const auth = (request.headers.get("authorization") || "").replace(/^(Apikey|Bearer)\s+/i, "").trim();

  if (!secret || auth !== secret) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const txId = String(body.id || body.referenceCode || "");
  const amount = Number(body.transferAmount || body.amount || 0);
  const content = String(body.content || body.description || "");
  const transferType = String(body.transferType || "in").toLowerCase();

  if (transferType !== "in" || amount < 10000 || !txId) {
    return NextResponse.json({ success: true, message: "Ignored" });
  }

  const match = content.match(/MMO\d+/i);
  if (!match) {
    return NextResponse.json({ success: true, message: "No deposit code matched" });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("credit_bank_deposit", {
    p_tx_id: txId,
    p_deposit_code: match[0].toUpperCase(),
    p_amount: amount,
    p_content: content,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, credited: Boolean(data) });
}

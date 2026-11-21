import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.BANK_WEBHOOK_SECRET) missing.push("BANK_WEBHOOK_SECRET");

  if (missing.length > 0) {
    return NextResponse.json({ ok: false, missing_env: missing }, { status: 500 });
  }

  try {
    const admin = createAdminClient();
    const { count, error } = await admin.from("mmo_products").select("*", { count: "exact", head: true });
    if (error) {
      return NextResponse.json({ ok: false, db_error: error.message, hint: "Hãy chạy file supabase/schema.sql trong Supabase SQL Editor." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, domain: "vanhung.xyz", products_count: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { data, error } = await admin.from("mmo_products").insert({
    category_id: body.categoryId ? Number(body.categoryId) : null,
    sku: String(body.sku).toUpperCase().trim(),
    title: String(body.title).trim(),
    platform: String(body.platform || "Facebook").trim(),
    country: String(body.country || "VN").trim(),
    format_spec: String(body.formatSpec || "UID|Pass|2FA").trim(),
    warranty_policy: String(body.warrantyPolicy || "Bảo hành login 24h").trim(),
    price: Number(body.price),
    original_price: body.originalPrice ? Number(body.originalPrice) : null,
    status: "available",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, product: data });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Chỉ Admin được nhập kho." }, { status: 403 });
  }

  const body = await request.json();
  const productId = Number(body.productId);
  const rawLines = String(body.lines || "");
  const uniqueLines = Array.from(
    new Set(rawLines.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
  );

  if (!productId || uniqueLines.length === 0) {
    return NextResponse.json({ error: "Thiếu sản phẩm hoặc danh sách tài khoản." }, { status: 400 });
  }

  const rows = uniqueLines.map((credential_payload) => ({
    product_id: productId,
    credential_payload,
    status: "available",
  }));

  const { error } = await admin
    .from("mmo_product_items")
    .upsert(rows, { onConflict: "product_id,credential_payload", ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.from("mmo_products").update({ status: "available" }).eq("id", productId);

  return NextResponse.json({ success: true, submitted: uniqueLines.length });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập để mua hàng." }, { status: 401 });
  }

  const body = await request.json();
  const productId = Number(body.productId);
  const quantity = Number(body.quantity || 1);
  const couponCode = body.couponCode ? String(body.couponCode) : null;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("purchase_mmo_product", {
    p_user_id: user.id,
    p_product_id: productId,
    p_qty: quantity,
    p_coupon_code: couponCode,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, order: data });
}

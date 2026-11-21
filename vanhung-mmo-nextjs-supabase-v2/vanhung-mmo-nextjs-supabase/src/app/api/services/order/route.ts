import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập để đặt dịch vụ." }, { status: 401 });
  }

  const body = await request.json();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_mmo_service_order", {
    p_user_id: user.id,
    p_package_id: Number(body.packageId),
    p_target_link: String(body.targetLink || "").trim(),
    p_qty: Number(body.quantity || 1),
    p_note: body.note ? String(body.note) : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, order: data });
}

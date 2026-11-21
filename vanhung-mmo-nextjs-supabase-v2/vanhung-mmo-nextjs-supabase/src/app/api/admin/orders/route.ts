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

  const { orderId, status, adminNote } = await request.json();
  const { data: order } = await admin.from("mmo_service_orders").select("*").eq("id", orderId).single();
  if (!order || order.status !== "processing") {
    return NextResponse.json({ error: "Đơn hàng không hợp lệ hoặc đã xử lý." }, { status: 400 });
  }

  await admin.from("mmo_service_orders").update({ status, admin_note: adminNote || null }).eq("id", orderId);

  if (status === "error") {
    const { data: buyer } = await admin.from("profiles").select("balance").eq("id", order.user_id).single();
    if (buyer) {
      await admin.from("profiles").update({ balance: buyer.balance + order.total_amount }).eq("id", order.user_id);
      await admin.from("money_transactions").insert({
        user_id: order.user_id,
        type: "refund",
        amount: order.total_amount,
        balance_before: buyer.balance,
        balance_after: buyer.balance + order.total_amount,
        description: `Hoàn tiền đơn dịch vụ #${order.order_code}`,
      });
    }
  }

  return NextResponse.json({ success: true });
}

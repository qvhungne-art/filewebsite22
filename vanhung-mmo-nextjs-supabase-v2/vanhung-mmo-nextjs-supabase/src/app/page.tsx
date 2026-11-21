import { createClient } from "@/lib/supabase/server";
import StorefrontClient from "@/components/StorefrontClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#070b14] text-slate-200">
        <div className="max-w-lg w-full rounded-3xl bg-slate-900 border border-amber-500/30 p-6 space-y-3">
          <h1 className="text-xl font-black text-amber-300">Chưa cấu hình biến môi trường Supabase trên Vercel</h1>
          <p className="text-sm text-slate-300">
            Vào <strong>Vercel → Project Settings → Environment Variables</strong> và thêm đủ <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>, <code>BANK_WEBHOOK_SECRET</code> rồi bấm <strong>Redeploy</strong>.
          </p>
          <p className="text-xs text-slate-400">Sau khi Redeploy, kiểm tra kết nối tại <code>/api/health</code>.</p>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: categories },
    { data: products },
    { data: services },
    profileRes,
    purchasesRes,
    serviceOrdersRes,
  ] = await Promise.all([
    supabase.from("mmo_categories").select("*").eq("is_active", true).order("id"),
    supabase.from("mmo_products_public").select("*").neq("status", "locked").order("id", { ascending: false }),
    supabase.from("mmo_services").select("*, packages:mmo_service_packages(*)").eq("is_active", true),
    user ? supabase.from("profiles").select("*").eq("id", user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from("mmo_purchases").select("*, product:mmo_products(title, sku), items:mmo_product_items(credential_payload)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    user ? supabase.from("mmo_service_orders").select("*, package:mmo_service_packages(name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
  ]);

  return (
    <StorefrontClient
      initialProfile={profileRes.data}
      categories={categories || []}
      products={products || []}
      services={services || []}
      purchases={purchasesRes.data || []}
      serviceOrders={serviceOrdersRes.data || []}
      bankInfo={{
        bankName: process.env.NEXT_PUBLIC_BANK_NAME || "MB Bank",
        account: process.env.NEXT_PUBLIC_BANK_ACCOUNT || "0868999888",
        owner: process.env.NEXT_PUBLIC_BANK_OWNER || "NGUYEN VAN HUNG",
      }}
    />
  );
}

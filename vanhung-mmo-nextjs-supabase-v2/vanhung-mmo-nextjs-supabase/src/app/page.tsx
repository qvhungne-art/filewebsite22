import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import StorefrontClient from "@/components/StorefrontClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#070b14] text-slate-200">
        <div className="max-w-lg w-full rounded-3xl bg-slate-900 border border-amber-500/30 p-6">
          <h1 className="text-xl font-black text-amber-300">Chưa cấu hình biến môi trường Supabase trên Vercel</h1>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await admin.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      profile = data;
    } else {
      const { data: created } = await admin
        .from("profiles")
        .insert({ id: user.id, email: user.email || "", username: (user.email || "user").split("@")[0] })
        .select()
        .single();
      profile = created;
    }
  }

  const [{ data: categories }, { data: products }, { data: services }, purchasesRes, serviceOrdersRes] =
    await Promise.all([
      admin.from("mmo_categories").select("*").eq("is_active", true).order("id"),
      admin.from("mmo_products_public").select("*").neq("status", "locked").order("id", { ascending: false }),
      admin.from("mmo_services").select("*, packages:mmo_service_packages(*)").eq("is_active", true),
      user ? admin.from("mmo_purchases").select("*, product:mmo_products(title, sku), items:mmo_product_items(credential_payload)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
      user ? admin.from("mmo_service_orders").select("*, package:mmo_service_packages(name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    ]);

  return (
    <StorefrontClient
      initialProfile={profile}
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

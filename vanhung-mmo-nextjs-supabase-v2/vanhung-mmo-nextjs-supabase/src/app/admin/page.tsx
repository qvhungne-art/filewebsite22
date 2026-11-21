import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminClient from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const [{ data: categories }, { data: products }, { data: pendingOrders }] = await Promise.all([
    admin.from("mmo_categories").select("*").order("id"),
    admin.from("mmo_products_public").select("*").order("id", { ascending: false }),
    admin.from("mmo_service_orders").select("*, user:profiles(email), package:mmo_service_packages(name)").eq("status", "processing").order("created_at", { ascending: false }),
  ]);

  return (
    <AdminClient
      categories={categories || []}
      products={products || []}
      pendingOrders={pendingOrders || []}
    />
  );
}

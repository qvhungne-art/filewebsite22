"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminClient({ categories, products, pendingOrders }: { categories: any[]; products: any[]; pendingOrders: any[] }) {
  const [selectedProdId, setSelectedProdId] = useState<number>(products?.[0]?.id || 0);
  const [lines, setLines] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [newProd, setNewProd] = useState({
    sku: "", title: "", categoryId: categories?.[0]?.id || "", platform: "Facebook",
    country: "VN", formatSpec: "UID|Pass|2FA|Mail", warrantyPolicy: "Bảo hành login 24h", price: 50000,
  });

  async function handleBulkImport(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/inventory/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedProdId, lines }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg("Lỗi: " + data.error);
    setMsg(`Đã nạp ${data.submitted} dòng tài khoản thật vào bảng mmo_product_items!`);
    setLines("");
    window.location.reload();
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProd),
    });
    const data = await res.json();
    if (!res.ok) return setMsg("Lỗi: " + data.error);
    window.location.reload();
  }

  async function handleOrder(orderId: number, status: "success" | "error") {
    await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status, adminNote: status === "success" ? "Đã hoàn thành" : "Hoàn tiền 100%" }),
    });
    window.location.reload();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Admin Panel — VanHung.xyz</h1>
        <Link href="/" className="px-4 py-2 rounded-xl bg-white/10 text-sm text-white font-semibold">← Về cửa hàng</Link>
      </div>

      {msg && <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold">{msg}</div>}

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={handleBulkImport} className="rounded-3xl bg-slate-900 border border-emerald-500/30 p-6 space-y-4">
          <h2 className="font-bold text-emerald-300 text-lg">Nhập Kho Tài Nguyên Thật (mmo_product_items)</h2>
          <select value={selectedProdId} onChange={(e) => setSelectedProdId(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white">
            {products.map((p) => (
              <option key={p.id} value={p.id}>[{p.sku}] {p.title} (Kho: {p.stock_count})</option>
            ))}
          </select>
          <textarea rows={6} value={lines} onChange={(e) => setLines(e.target.value)} placeholder="Dán danh sách UID|Pass|2FA|Mail (mỗi dòng 1 tài khoản)..." className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-emerald-300 font-mono text-xs" />
          <input type="file" accept=".txt,.csv" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => setLines((prev) => (prev ? prev + "\n" : "") + String(r.result || ""));
            r.readAsText(f);
          }} className="text-xs text-slate-400" />
          <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-sm">Nạp vào kho thực tế</button>
        </form>

        <form onSubmit={handleAddProduct} className="rounded-3xl bg-slate-900 border border-white/10 p-6 space-y-3">
          <h2 className="font-bold text-white text-lg">Thêm Sản Phẩm MMO Mới</h2>
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="SKU (VD: VIA-US-01)" value={newProd.sku} onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white uppercase" />
            <input required type="number" placeholder="Giá bán (VND)" value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: Number(e.target.value) })} className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white font-mono" />
          </div>
          <input required placeholder="Tên sản phẩm" value={newProd.title} onChange={(e) => setNewProd({ ...newProd, title: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white" />
          <input required placeholder="Định dạng (UID|Pass|2FA)" value={newProd.formatSpec} onChange={(e) => setNewProd({ ...newProd, formatSpec: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white" />
          <input required placeholder="Chính sách bảo hành" value={newProd.warrantyPolicy} onChange={(e) => setNewProd({ ...newProd, warrantyPolicy: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white" />
          <button type="submit" className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-sm">Tạo sản phẩm</button>
        </form>
      </div>

      <div className="rounded-3xl bg-slate-900 border border-white/10 p-6 space-y-3">
        <h2 className="font-bold text-white text-lg">Đơn Dịch Vụ Chờ Duyệt ({pendingOrders.length})</h2>
        {pendingOrders.map((ord) => (
          <div key={ord.id} className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex flex-wrap justify-between items-center gap-3 text-xs">
            <div>
              <div className="font-bold text-white">#{ord.order_code} • {ord.package?.name} ({Number(ord.total_amount).toLocaleString("vi-VN")}đ)</div>
              <div className="text-slate-400">User: {ord.user?.email} • Target: {ord.target_link} • SL: {ord.quantity}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleOrder(ord.id, "success")} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold">Hoàn thành</button>
              <button onClick={() => handleOrder(ord.id, "error")} className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-bold">Từ chối &amp; Hoàn tiền</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

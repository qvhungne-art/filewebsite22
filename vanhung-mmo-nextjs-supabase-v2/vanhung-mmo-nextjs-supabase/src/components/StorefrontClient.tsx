"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ShoppingBag, Zap, Wallet, History, ShieldCheck, LogOut, Copy, Download, Search } from "lucide-react";

type Tab = "store" | "services" | "wallet" | "history";

export default function StorefrontClient({
  initialProfile,
  categories,
  products,
  services,
  purchases,
  serviceOrders,
  bankInfo,
}: {
  initialProfile: any;
  categories: any[];
  products: any[];
  services: any[];
  purchases: any[];
  serviceOrders: any[];
  bankInfo: { bankName: string; account: string; owner: string };
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("store");
  const [search, setSearch] = useState("");
  const [catSlug, setCatSlug] = useState("ALL");
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [buyProduct, setBuyProduct] = useState<any | null>(null);
  const [buyQty, setBuyQty] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [svcPkgId, setSvcPkgId] = useState<number>(services?.[0]?.packages?.[0]?.id || 0);
  const [svcTarget, setSvcTarget] = useState("");
  const [svcQty, setSvcQty] = useState(100);
  const [svcNote, setSvcNote] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fmt = (n: number) => Number(n || 0).toLocaleString("vi-VN") + "đ";
  const notify = (text: string, type: "ok" | "err" = "ok") => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = authModal === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (res.error) return notify(res.error.message, "err");
    if (authModal === "signup" && res.data?.user && !res.data?.session) {
      setAuthModal(null);
      return notify("Đăng ký thành công! Kiểm tra email để xác nhận (hoặc tắt Confirm Email trong Supabase Auth).", "ok");
    }
    setAuthModal(null);
    window.location.reload();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!initialProfile) { setBuyProduct(null); setAuthModal("login"); return; }
    setLoading(true);
    const res = await fetch("/api/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: buyProduct.id, quantity: buyQty, couponCode: coupon }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return notify(data.error || "Mua hàng thất bại", "err");
    notify(`Mua thành công đơn #${data.order.order_code}!`);
    setBuyProduct(null);
    window.location.reload();
  }

  async function handleServiceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!initialProfile) { setAuthModal("login"); return; }
    setLoading(true);
    const res = await fetch("/api/services/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId: svcPkgId, targetLink: svcTarget, quantity: svcQty, note: svcNote }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return notify(data.error || "Đặt dịch vụ thất bại", "err");
    notify(`Đã tạo đơn dịch vụ #${data.order.order_code}!`);
    setSvcTarget("");
    window.location.reload();
  }

  const filteredProducts = products.filter((p) => {
    const okCat = catSlug === "ALL" || p.category_slug === catSlug;
    const q = search.trim().toLowerCase();
    const okQ = !q || p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    return okCat && okQ;
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#090e1a]/90 backdrop-blur border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <button onClick={() => setTab("store")} className="font-black text-white text-lg tracking-tight">
            VanHung<span className="text-emerald-400">.xyz</span>
          </button>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            {[
              { id: "store", label: "Tài nguyên", icon: ShoppingBag },
              { id: "services", label: "Dịch vụ MMO", icon: Zap },
              { id: "wallet", label: "Nạp tiền", icon: Wallet },
              { id: "history", label: "Lịch sử", icon: History },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id as Tab)}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                    tab === item.id ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {initialProfile ? (
              <>
                <button onClick={() => setTab("wallet")} className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-sm font-bold">
                  {fmt(initialProfile.balance)}
                </button>
                {initialProfile.role === "admin" && (
                  <Link href="/admin" className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Admin
                  </Link>
                )}
                <button onClick={handleLogout} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300" title="Đăng xuất">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setAuthModal("login")} className="px-3.5 py-1.5 rounded-xl bg-white/10 text-white text-sm font-semibold">Đăng nhập</button>
                <button onClick={() => setAuthModal("signup")} className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-sm font-bold">Đăng ký</button>
              </>
            )}
          </div>
        </div>
      </header>

      {msg && (
        <div className={`max-w-7xl w-full mx-auto px-4 mt-4`}>
          <div className={`p-3.5 rounded-xl text-sm font-semibold border ${msg.type === "err" ? "bg-rose-500/15 border-rose-500/30 text-rose-300" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"}`}>
            {msg.text}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {tab === "store" && (
          <>
            <div className="rounded-3xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/80 border border-white/10 p-6 sm:p-8">
              <h1 className="text-2xl sm:text-4xl font-black text-white">Sàn Tài Nguyên &amp; Dịch Vụ MMO — VanHung.xyz</h1>
              <p className="text-slate-300 text-sm mt-2 max-w-2xl">Giao hàng tự động tức thì 24/7 từ kho thực tế, hỗ trợ Auto Bank VietQR và bảo hành rõ ràng.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm Via, ChatGPT, Proxy, SKU..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setCatSlug("ALL")} className={`px-3.5 py-2 rounded-xl text-xs font-bold ${catSlug === "ALL" ? "bg-emerald-500 text-slate-950" : "bg-white/5 text-slate-300"}`}>Tất cả</button>
                {categories.map((c) => (
                  <button key={c.id} onClick={() => setCatSlug(c.slug)} className={`px-3.5 py-2 rounded-xl text-xs font-bold ${catSlug === c.slug ? "bg-emerald-500 text-slate-950" : "bg-white/5 text-slate-300"}`}>{c.name}</button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((p) => (
                <div key={p.id} className="rounded-2xl bg-slate-900/80 border border-white/10 p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-400">{p.platform} • {p.country}</span>
                      <span className={`font-mono font-bold ${p.stock_count > 0 ? "text-cyan-300" : "text-rose-400"}`}>Kho: {p.stock_count}</span>
                    </div>
                    <h3 className="font-bold text-white text-base">{p.title}</h3>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-white/5 text-xs font-mono text-slate-300 truncate">{p.format_spec}</div>
                    <p className="text-xs text-slate-400">{p.warranty_policy}</p>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-xl font-black text-emerald-400 font-mono">{fmt(p.price)}</div>
                      <div className="text-[11px] text-slate-500">Đã bán: {p.sold_count}</div>
                    </div>
                    <button
                      disabled={p.stock_count <= 0}
                      onClick={() => { setBuyProduct(p); setBuyQty(1); setCoupon(""); }}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold ${p.stock_count > 0 ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950" : "bg-white/5 text-slate-500 cursor-not-allowed"}`}
                    >
                      {p.stock_count > 0 ? "Mua ngay" : "Hết hàng"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "services" && (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-2xl font-extrabold text-white">Dịch Vụ MMO</h2>
              {services.map((s) => (
                <div key={s.id} className="rounded-2xl bg-slate-900/80 border border-white/10 p-5 space-y-2">
                  <h3 className="font-bold text-white">{s.name}</h3>
                  <p className="text-xs text-slate-400">{s.description}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(s.packages || []).map((pk: any) => (
                      <button key={pk.id} onClick={() => setSvcPkgId(pk.id)} className={`px-3 py-1.5 rounded-lg text-xs border ${svcPkgId === pk.id ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-slate-950 border-white/10 text-slate-300"}`}>
                        {pk.name} ({fmt(pk.unit_price)}/{pk.unit_label})
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleServiceOrder} className="lg:col-span-5 rounded-2xl bg-slate-900/80 border border-white/10 p-5 space-y-3 h-fit">
              <h3 className="font-bold text-white">Tạo đơn dịch vụ</h3>
              <input required value={svcTarget} onChange={(e) => setSvcTarget(e.target.value)} placeholder="Link bài viết / UID / Username" className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white" />
              <input type="number" min={1} required value={svcQty} onChange={(e) => setSvcQty(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white font-mono" />
              <textarea value={svcNote} onChange={(e) => setSvcNote(e.target.value)} placeholder="Ghi chú (tùy chọn)" rows={2} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white" />
              <button disabled={loading} type="submit" className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-sm">Thanh toán &amp; Đặt đơn</button>
            </form>
          </div>
        )}

        {tab === "wallet" && (
          <div className="rounded-3xl bg-slate-900/80 border border-white/10 p-6 max-w-2xl space-y-4">
            <h2 className="text-xl font-extrabold text-white">Nạp Tiền Tự Động (Auto Bank)</h2>
            {initialProfile ? (
              <>
                <div className="bg-slate-950 rounded-2xl p-4 border border-white/10 space-y-1 text-sm">
                  <div>Ngân hàng: <strong className="text-cyan-400">{bankInfo.bankName}</strong></div>
                  <div>Số tài khoản: <strong className="font-mono text-white text-base">{bankInfo.account}</strong></div>
                  <div>Chủ tài khoản: <strong className="text-slate-200">{bankInfo.owner}</strong></div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-emerald-300">Nội dung chuyển khoản bắt buộc:</div>
                    <div className="text-2xl font-black font-mono text-white">{initialProfile.deposit_code}</div>
                  </div>
                  <button onClick={() => { navigator.clipboard?.writeText(initialProfile.deposit_code); notify("Đã copy nội dung chuyển khoản!"); }} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm flex items-center gap-1.5">
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">Vui lòng đăng nhập để xem mã nội dung nạp tiền tự động của bạn.</p>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-white">Tài Nguyên Đã Mua</h2>
            {purchases.map((ord) => {
              const text = (ord.items || []).map((x: any) => x.credential_payload).join("\n");
              return (
                <div key={ord.id} className="rounded-2xl bg-slate-900/80 border border-white/10 p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <div><span className="font-mono text-emerald-400 font-bold">#{ord.order_code}</span> — <strong className="text-white">{ord.product?.title}</strong> (x{ord.quantity})</div>
                    <div className="font-mono text-emerald-400 font-bold">{fmt(ord.total_amount)}</div>
                  </div>
                  <pre className="bg-slate-950 text-emerald-300 p-3.5 rounded-xl text-xs font-mono overflow-x-auto border border-white/10">{text}</pre>
                  <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard?.writeText(text); notify("Đã copy tài khoản!"); }} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copy</button>
                    <button onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = `${ord.order_code}.txt`; a.click(); }} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Tải .TXT</button>
                  </div>
                </div>
              );
            })}
            {serviceOrders.length > 0 && (
              <div className="space-y-2 pt-4">
                <h3 className="text-lg font-bold text-white">Đơn dịch vụ MMO</h3>
                {serviceOrders.map((s) => (
                  <div key={s.id} className="rounded-xl bg-slate-900/80 border border-white/10 p-4 flex justify-between text-xs">
                    <div><strong className="text-white">#{s.order_code} • {s.package?.name}</strong><div className="text-slate-400">Target: {s.target_link} • SL: {s.quantity}</div></div>
                    <div className="text-right"><div className="font-bold text-emerald-400">{fmt(s.total_amount)}</div><div className="uppercase text-amber-300">{s.status}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Buy Modal */}
      {buyProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handlePurchase} className="bg-[#0e1628] border border-white/15 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-white text-lg">{buyProduct.title}</h3>
            <div className="text-xs text-slate-400">Đơn giá: <strong className="text-emerald-400 font-mono">{fmt(buyProduct.price)}</strong> • Tồn kho: {buyProduct.stock_count}</div>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" min={1} max={buyProduct.stock_count} value={buyQty} onChange={(e) => setBuyQty(Number(e.target.value))} className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono" />
              <input type="text" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Mã giảm giá" className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-amber-300 uppercase" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setBuyProduct(null)} className="flex-1 py-2.5 rounded-xl border border-white/15 text-slate-300 text-sm">Hủy</button>
              <button disabled={loading} type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-sm">Mua ngay</button>
            </div>
          </form>
        </div>
      )}

      {/* Auth Modal */}
      {authModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form onSubmit={handleAuth} className="bg-[#0e1628] border border-white/15 rounded-3xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-white text-lg">{authModal === "signup" ? "Đăng ký tài khoản" : "Đăng nhập"}</h3>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-sm" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu (tối thiểu 6 ký tự)" className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-sm" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAuthModal(null)} className="flex-1 py-2.5 rounded-xl border border-white/15 text-slate-300 text-sm">Đóng</button>
              <button disabled={loading} type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-sm">{authModal === "signup" ? "Tạo tài khoản" : "Đăng nhập"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

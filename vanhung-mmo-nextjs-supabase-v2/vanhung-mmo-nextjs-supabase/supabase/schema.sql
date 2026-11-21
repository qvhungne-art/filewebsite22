-- ============================================================
-- VANHUNG.XYZ MMO MART — SUPABASE POSTGRESQL SCHEMA & ATOMIC RPC
-- Chạy toàn bộ file này 1 lần trong Supabase > SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- 1. Profiles (tự động tạo khi user đăng ký, có deposit_code dạng MMO1001)
create sequence if not exists public.deposit_code_seq start 1001;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text,
  deposit_code text unique not null default ('MMO' || nextval('public.deposit_code_seq')::text),
  role text not null default 'user' check (role in ('user', 'admin')),
  balance bigint not null default 0 check (balance >= 0),
  total_deposited bigint not null default 0,
  status text not null default 'active' check (status in ('active', 'banned')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Danh mục & Sản phẩm MMO
create table if not exists public.mmo_categories (
  id bigserial primary key,
  name text not null,
  slug text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.mmo_products (
  id bigserial primary key,
  category_id bigint references public.mmo_categories(id) on delete set null,
  sku text unique not null,
  title text not null,
  platform text not null default 'Facebook',
  country text not null default 'VN',
  format_spec text not null default 'UID|Pass|2FA|Mail',
  warranty_policy text not null default 'Bảo hành login 24h',
  price bigint not null check (price >= 0),
  original_price bigint,
  status text not null default 'available' check (status in ('available', 'sold_out', 'locked')),
  created_at timestamptz not null default now()
);

create table if not exists public.mmo_purchases (
  id bigserial primary key,
  order_code text unique not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id bigint not null references public.mmo_products(id),
  quantity integer not null check (quantity > 0),
  unit_price bigint not null,
  discount_amount bigint not null default 0,
  total_amount bigint not null,
  discount_code text,
  created_at timestamptz not null default now()
);

-- Kho tài khoản thật (chỉ người mua hoặc admin mới được xem payload)
create table if not exists public.mmo_product_items (
  id bigserial primary key,
  product_id bigint not null references public.mmo_products(id) on delete cascade,
  purchase_id bigint references public.mmo_purchases(id) on delete set null,
  credential_payload text not null,
  status text not null default 'available' check (status in ('available', 'sold', 'locked')),
  buyer_id uuid references public.profiles(id) on delete set null,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  unique(product_id, credential_payload)
);
create index if not exists idx_items_product_status on public.mmo_product_items(product_id, status);

-- 3. Dịch vụ MMO
create table if not exists public.mmo_services (
  id bigserial primary key,
  name text not null,
  slug text unique not null,
  service_type text not null default 'seeding' check (service_type in ('seeding', 'ads_agency', 'tool_setup')),
  description text,
  is_active boolean not null default true
);

create table if not exists public.mmo_service_packages (
  id bigserial primary key,
  service_id bigint not null references public.mmo_services(id) on delete cascade,
  name text not null,
  unit_price bigint not null check (unit_price >= 0),
  unit_label text not null default 'đơn vị',
  min_qty integer not null default 1
);

create table if not exists public.mmo_service_orders (
  id bigserial primary key,
  order_code text unique not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id bigint not null references public.mmo_service_packages(id),
  target_link text not null,
  quantity integer not null check (quantity > 0),
  total_amount bigint not null,
  status text not null default 'processing' check (status in ('processing', 'success', 'error')),
  user_note text,
  admin_note text,
  created_at timestamptz not null default now()
);

-- 4. Mã giảm giá, Nạp ngân hàng & Biến động số dư
create table if not exists public.discount_codes (
  id bigserial primary key,
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed_amount')),
  discount_value bigint not null check (discount_value > 0),
  usage_limit integer,
  usage_count integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.bank_deposits (
  transaction_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check (amount > 0),
  content text,
  created_at timestamptz not null default now()
);

create table if not exists public.money_transactions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  amount bigint not null,
  balance_before bigint not null,
  balance_after bigint not null,
  description text not null,
  created_at timestamptz not null default now()
);

-- View đếm tồn kho công khai (không lộ credential_payload)
create or replace view public.mmo_products_public as
select
  p.*,
  c.name as category_name,
  c.slug as category_slug,
  coalesce((select count(*) from public.mmo_product_items i where i.product_id = p.id and i.status = 'available'), 0)::int as stock_count,
  coalesce((select count(*) from public.mmo_product_items i where i.product_id = p.id and i.status = 'sold'), 0)::int as sold_count
from public.mmo_products p
left join public.mmo_categories c on c.id = p.category_id;

-- 5. Bật Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.mmo_categories enable row level security;
alter table public.mmo_products enable row level security;
alter table public.mmo_product_items enable row level security;
alter table public.mmo_purchases enable row level security;
alter table public.mmo_services enable row level security;
alter table public.mmo_service_packages enable row level security;
alter table public.mmo_service_orders enable row level security;
alter table public.money_transactions enable row level security;

create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Public read categories" on public.mmo_categories for select using (true);
create policy "Public read products" on public.mmo_products for select using (status != 'locked');
create policy "Buyers view own purchased items" on public.mmo_product_items for select using (auth.uid() = buyer_id);
create policy "Users view own purchases" on public.mmo_purchases for select using (auth.uid() = user_id);
create policy "Public read services" on public.mmo_services for select using (is_active = true);
create policy "Public read packages" on public.mmo_service_packages for select using (true);
create policy "Users view own service orders" on public.mmo_service_orders for select using (auth.uid() = user_id);
create policy "Users view own transactions" on public.money_transactions for select using (auth.uid() = user_id);

-- 6. ATOMIC RPC: Mua tài nguyên MMO (chống âm tiền & mua trùng bằng FOR UPDATE SKIP LOCKED)
create or replace function public.purchase_mmo_product(
  p_user_id uuid,
  p_product_id bigint,
  p_qty integer,
  p_coupon_code text default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_user public.profiles%rowtype;
  v_product public.mmo_products%rowtype;
  v_coupon public.discount_codes%rowtype;
  v_item_ids bigint[];
  v_creds text[];
  v_subtotal bigint;
  v_discount bigint := 0;
  v_total bigint;
  v_order_code text;
  v_purchase_id bigint;
begin
  if p_qty <= 0 or p_qty > 500 then
    raise exception 'Số lượng mua không hợp lệ (1-500).';
  end if;

  select * into v_user from public.profiles where id = p_user_id for update;
  if not found or v_user.status = 'banned' then
    raise exception 'Tài khoản không hợp lệ hoặc đã bị khóa.';
  end if;

  select * into v_product from public.mmo_products where id = p_product_id and status != 'locked';
  if not found then
    raise exception 'Sản phẩm không tồn tại hoặc đang tạm khóa.';
  end if;

  select array_agg(id), array_agg(credential_payload)
  into v_item_ids, v_creds
  from (
    select id, credential_payload
    from public.mmo_product_items
    where product_id = p_product_id and status = 'available'
    order by id asc
    limit p_qty
    for update skip locked
  ) locked_items;

  if coalesce(array_length(v_item_ids, 1), 0) < p_qty then
    raise exception 'Tồn kho thực tế không đủ số lượng bạn yêu cầu.';
  end if;

  v_subtotal := v_product.price * p_qty;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon from public.discount_codes
    where code = upper(trim(p_coupon_code)) and is_active = true
    for update;

    if found and (v_coupon.usage_limit is null or v_coupon.usage_count < v_coupon.usage_limit) then
      if v_coupon.discount_type = 'percentage' then
        v_discount := round(v_subtotal * v_coupon.discount_value / 100.0);
      else
        v_discount := least(v_subtotal, v_coupon.discount_value);
      end if;
      update public.discount_codes set usage_count = usage_count + 1 where id = v_coupon.id;
    end if;
  end if;

  v_total := greatest(0, v_subtotal - v_discount);
  if v_user.balance < v_total then
    raise exception 'Số dư không đủ. Vui lòng nạp thêm tiền vào ví.';
  end if;

  v_order_code := 'ORD-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  update public.profiles set balance = balance - v_total where id = p_user_id;

  insert into public.mmo_purchases (order_code, user_id, product_id, quantity, unit_price, discount_amount, total_amount, discount_code)
  values (v_order_code, p_user_id, p_product_id, p_qty, v_product.price, v_discount, v_total, nullif(upper(trim(coalesce(p_coupon_code, ''))), ''))
  returning id into v_purchase_id;

  update public.mmo_product_items
  set status = 'sold', buyer_id = p_user_id, purchase_id = v_purchase_id, sold_at = now()
  where id = any(v_item_ids);

  insert into public.money_transactions (user_id, type, amount, balance_before, balance_after, description)
  values (p_user_id, 'purchase', -v_total, v_user.balance, v_user.balance - v_total,
          format('Mua %sx %s (#%s)', p_qty, v_product.title, v_order_code));

  return jsonb_build_object(
    'order_code', v_order_code,
    'total_amount', v_total,
    'items', to_jsonb(v_creds)
  );
end;
$$;

-- 7. ATOMIC RPC: Đặt đơn dịch vụ MMO
create or replace function public.create_mmo_service_order(
  p_user_id uuid,
  p_package_id bigint,
  p_target_link text,
  p_qty integer,
  p_note text default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_user public.profiles%rowtype;
  v_pkg public.mmo_service_packages%rowtype;
  v_total bigint;
  v_order_code text;
begin
  select * into v_user from public.profiles where id = p_user_id for update;
  if not found or v_user.status = 'banned' then raise exception 'Tài khoản không hợp lệ.'; end if;

  select * into v_pkg from public.mmo_service_packages where id = p_package_id;
  if not found then raise exception 'Gói dịch vụ không tồn tại.'; end if;
  if p_qty < v_pkg.min_qty then raise exception 'Số lượng tối thiểu là %.', v_pkg.min_qty; end if;

  v_total := v_pkg.unit_price * p_qty;
  if v_user.balance < v_total then raise exception 'Số dư không đủ để đặt dịch vụ.'; end if;

  v_order_code := 'SVC-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  update public.profiles set balance = balance - v_total where id = p_user_id;

  insert into public.mmo_service_orders (order_code, user_id, package_id, target_link, quantity, total_amount, user_note)
  values (v_order_code, p_user_id, p_package_id, p_target_link, p_qty, v_total, p_note);

  insert into public.money_transactions (user_id, type, amount, balance_before, balance_after, description)
  values (p_user_id, 'service', -v_total, v_user.balance, v_user.balance - v_total,
          format('Đặt dịch vụ %s (#%s)', v_pkg.name, v_order_code));

  return jsonb_build_object('order_code', v_order_code, 'total_amount', v_total);
end;
$$;

-- 8. ATOMIC RPC: Cộng tiền Auto Bank Webhook (Chống cộng trùng bằng transaction_id)
create or replace function public.credit_bank_deposit(
  p_tx_id text,
  p_deposit_code text,
  p_amount bigint,
  p_content text
)
returns boolean language plpgsql security definer as $$
declare
  v_user public.profiles%rowtype;
begin
  if exists (select 1 from public.bank_deposits where transaction_id = p_tx_id) then
    return false;
  end if;

  select * into v_user from public.profiles where upper(deposit_code) = upper(p_deposit_code) for update;
  if not found then return false; end if;

  insert into public.bank_deposits (transaction_id, user_id, amount, content)
  values (p_tx_id, v_user.id, p_amount, p_content);

  update public.profiles
  set balance = balance + p_amount, total_deposited = total_deposited + p_amount
  where id = v_user.id;

  insert into public.money_transactions (user_id, type, amount, balance_before, balance_after, description)
  values (v_user.id, 'deposit', p_amount, v_user.balance, v_user.balance + p_amount,
          format('Auto Bank (#%s): %s', p_tx_id, p_content));

  return true;
end;
$$;

-- 9. Dữ liệu khởi tạo cơ bản
insert into public.mmo_categories (name, slug) values
  ('Social & Via', 'social-via'),
  ('AI & Phần mềm', 'ai-phan-mem'),
  ('Email & Cloud', 'email-cloud'),
  ('Proxy & VPN', 'proxy-vpn')
on conflict (slug) do nothing;

insert into public.mmo_products (category_id, sku, title, platform, country, format_spec, warranty_policy, price, original_price)
select id, 'VIA-VN-XMDT', 'Via Việt Cổ XMDT Tích Xanh', 'Facebook', 'VN', 'UID|Pass|2FA|Hotmail|PassMail', 'Bảo hành login lần đầu 24h', 85000, 110000
from public.mmo_categories where slug = 'social-via' on conflict (sku) do nothing;

insert into public.mmo_products (category_id, sku, title, platform, country, format_spec, warranty_policy, price, original_price)
select id, 'GPT-PLUS-1M', 'Tài khoản ChatGPT Plus 1 Tháng', 'OpenAI', 'Global', 'Email|Pass|RecoveryMail', 'Bảo hành Full Time 30 ngày', 165000, 220000
from public.mmo_categories where slug = 'ai-phan-mem' on conflict (sku) do nothing;

insert into public.mmo_products (category_id, sku, title, platform, country, format_spec, warranty_policy, price, original_price)
select id, 'PROXY-RES-VN', 'Proxy Dân Cư Việt Nam IPv4 (30 Ngày)', 'Proxy IPv4', 'VN', 'IP:Port:User:Pass', 'Uptime 99.9%, đổi IP nếu lỗi', 45000, 60000
from public.mmo_categories where slug = 'proxy-vpn' on conflict (sku) do nothing;

insert into public.mmo_services (name, slug, service_type, description) values
  ('Tăng Follow & View TikTok Thực', 'tiktok-seeding', 'seeding', 'Tăng trưởng kênh bán hàng TikTok Shop ổn định, có bảo hành.')
on conflict (slug) do nothing;

insert into public.mmo_service_packages (service_id, name, unit_price, unit_label, min_qty)
select id, 'SV1 - Follow Việt Nam (BH 30 Ngày)', 85, 'follow', 100
from public.mmo_services where slug = 'tiktok-seeding'
and not exists (select 1 from public.mmo_service_packages where name = 'SV1 - Follow Việt Nam (BH 30 Ngày)');

insert into public.discount_codes (code, discount_type, discount_value, usage_limit) values
  ('MMO10', 'percentage', 10, 200)
on conflict (code) do nothing;

-- 10. Phân quyền chặt chẽ (Chống user gọi RPC trực tiếp từ trình duyệt)
grant select on public.mmo_products_public to anon, authenticated;

revoke all on function public.purchase_mmo_product(uuid, bigint, integer, text) from public, anon, authenticated;
grant execute on function public.purchase_mmo_product(uuid, bigint, integer, text) to service_role;

revoke all on function public.create_mmo_service_order(uuid, bigint, text, integer, text) from public, anon, authenticated;
grant execute on function public.create_mmo_service_order(uuid, bigint, text, integer, text) to service_role;

revoke all on function public.credit_bank_deposit(text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.credit_bank_deposit(text, text, bigint, text) to service_role;

# Hướng dẫn chạy bán hàng thật `vanhung.xyz` trên Vercel + Supabase (Miễn phí)

## Bước 1: Tạo Database miễn phí trên Supabase (2 phút)
1. Truy cập `https://supabase.com` → **New Project**.
2. Vào **SQL Editor** → mở file `supabase/schema.sql`, dán toàn bộ và bấm **Run**.
3. Vào **Project Settings → API**, lấy 3 giá trị:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

## Bước 2: Đẩy code lên GitHub & cấu hình Vercel
1. Giải nén toàn bộ thư mục này và push lên kho GitHub đang kết nối với project `vanhungdzai` trên Vercel.
2. Trong Vercel → **Settings → Environment Variables**, thêm:
   - `NEXT_PUBLIC_SITE_URL` = `https://vanhung.xyz`
   - `NEXT_PUBLIC_SUPABASE_URL` = *(từ bước 1)*
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(từ bước 1)*
   - `SUPABASE_SERVICE_ROLE_KEY` = *(từ bước 1)*
   - `BANK_WEBHOOK_SECRET` = *(tự đặt chuỗi bí mật bất kỳ)*
   - `NEXT_PUBLIC_BANK_NAME` = `MB Bank` *(ngân hàng của bạn)*
   - `NEXT_PUBLIC_BANK_ACCOUNT` = *(STK nhận tiền của bạn)*
   - `NEXT_PUBLIC_BANK_OWNER` = *(Tên chủ tài khoản)*
3. Vào **Settings → Domains** trên Vercel: bấm **Edit** ở `vanhung.xyz` cho chạy trực tiếp **Production** (không redirect qua `www` nếu chưa trỏ CNAME `www`).
4. Bấm **Redeploy** → `https://vanhung.xyz` hoạt động ngay với SSL HTTPS tự động!

## Bước 3: Cấp quyền Admin & Nạp kho tài nguyên thật
1. Đăng ký 1 tài khoản trên `https://vanhung.xyz`.
2. Vào Supabase → **SQL Editor**, chạy lệnh sau (thay email của bạn):
   ```sql
   update public.profiles set role = 'admin' where email = 'email_cua_ban@gmail.com';
   ```
3. Tải lại `https://vanhung.xyz` → bấm nút **Admin** → dán danh sách `UID|Pass|2FA...` (hoặc chọn file `.txt`) để nạp kho thật và bắt đầu bán.

## Bước 4: Bật nạp tiền Auto Bank 24/7
- Trên **SePay / Casso / Web2M**, cấu hình Webhook URL: `https://vanhung.xyz/api/webhook/bank`
- Header xác thực: `Authorization: Apikey <BANK_WEBHOOK_SECRET>`
- Khi khách chuyển khoản đúng nội dung `MMO1001` (hiển thị trong mục Nạp tiền), hệ thống tự cộng số dư tức thì.

## Bước 5: Kiểm tra nhanh không còn lỗi
1. Mở `https://vanhung.xyz/api/health` — nếu trả về `{"ok":true,"domain":"vanhung.xyz","products_count":3}` là Database + Env Vars đã kết nối chuẩn 100%.
2. Trong **Supabase → Authentication → Providers → Email**, bạn nên tắt **Confirm email** nếu muốn khách đăng ký xong vào mua hàng ngay mà không cần mở Gmail xác nhận.

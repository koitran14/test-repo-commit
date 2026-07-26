# Hướng dẫn bật Dashboard (giao diện web + đăng nhập Google)

Dashboard cho phép: xem danh sách báo giá, xem nhật ký & trạng thái agent,
bật/tắt chế độ chạy thử, và quét mail thủ công. Đăng nhập bằng Google, chỉ
cho phép email **@pmax.com.vn**.

> Lưu ý: đây là OAuth Client **khác** với client dùng để agent đọc/gửi mail.
> Client cho agent là loại *Desktop app*; client cho dashboard là loại *Web application*.

---

## A. Tạo OAuth Client cho đăng nhập (Web application)

1. [console.cloud.google.com](https://console.cloud.google.com) → đúng project → **APIs & Services → Credentials**.
2. **+ Create credentials → OAuth client ID**.
3. **Application type: Web application** → đặt tên ví dụ `Quotation Dashboard`.
4. Mục **Authorized redirect URIs** → **+ ADD URI** → dán chính xác:
   ```
   http://localhost:3100/auth/google/callback
   ```
   *(Khi deploy thật, thêm cả URL production, ví dụ `https://quotation.pmax.asia/auth/google/callback`.)*
5. **Create** → copy **Client ID** và **Client secret**.

---

## B. Điền vào `.env`

Mở file `.env`, điền 2 dòng (các dòng khác tôi đã điền sẵn):
```
GOOGLE_LOGIN_CLIENT_ID=<client id vừa tạo>
GOOGLE_LOGIN_CLIENT_SECRET=<client secret vừa tạo>
DASHBOARD_SESSION_SECRET=<đã tạo sẵn>
DASHBOARD_BASE_URL=http://localhost:3100
```

> Nếu OAuth consent screen đang ở chế độ **External**, nhớ thêm email của bạn vào **Test users**
> (giống lúc lấy refresh token). Nếu là **Internal** thì mọi email @pmax.com.vn đăng nhập được.

---

## C. Chạy & mở dashboard

1. Khởi động agent:
   ```
   npm run dev
   ```
2. Mở trình duyệt: **http://localhost:3100**
3. Bấm **Đăng nhập bằng Google**, chọn tài khoản @pmax.com.vn.
4. Vào được dashboard → xem báo giá, trạng thái, bật/tắt chạy thử, bấm **Quét mail ngay**.

---

## Ghi chú
- Chỉ email thuộc `dashboard.allowed_domain` (mặc định `pmax.com.vn`) hoặc nằm trong
  `dashboard.allowed_emails` (trong cài đặt) mới đăng nhập được. Email khác sẽ bị từ chối.
- Nút **bật/tắt chế độ chạy thử** trên dashboard đổi trạng thái *ngay lúc chạy*; khi khởi động lại,
  agent quay về giá trị trong file cài đặt. Muốn đổi vĩnh viễn thì sửa `test_mode.enabled` trong cài đặt.
- Muốn tắt hẳn dashboard: đặt `dashboard.enabled: false` trong cài đặt.

## Checklist
- [ ] Đã tạo OAuth Client loại Web application + redirect URI `http://localhost:3100/auth/google/callback`
- [ ] Đã điền `GOOGLE_LOGIN_CLIENT_ID` / `GOOGLE_LOGIN_CLIENT_SECRET` vào `.env`
- [ ] `npm run dev` → mở http://localhost:3100 → đăng nhập được

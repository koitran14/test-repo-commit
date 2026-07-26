# Hướng dẫn cấu hình Google cho Quotation Agent (OAuth 2.0)

Agent xác thực bằng **OAuth tài khoản của bạn** — chạy dưới danh nghĩa chính hộp thư
`dangkhoi.tran@pmax.com.vn`. Vì vậy **không cần** service account, **không cần** admin,
**không cần** chia sẻ Sheet. Làm lần lượt A → E.

---

## A. Google Sheet (đã xong)

- Sheet đã tạo, Sheet ID đã điền vào cài đặt agent. Không cần chia sẻ cho ai vì agent
  chạy bằng chính tài khoản sở hữu Sheet.

---

## B. Tạo Google Cloud project & bật API

1. Vào [console.cloud.google.com](https://console.cloud.google.com) (đăng nhập `dangkhoi.tran@pmax.com.vn`).
2. Tạo project mới (ví dụ `quotation-agent`) hoặc dùng project sẵn có.
3. **APIs & Services → Library**, bật 2 API:
   - **Gmail API**
   - **Google Sheets API**

---

## C. Cấu hình màn hình đồng ý (OAuth consent screen)

1. **APIs & Services → OAuth consent screen**.
2. **User type: Internal** (dùng nội bộ trong tổ chức @pmax) → **Create**.
   *(Nếu tổ chức không cho chọn Internal, chọn External rồi ở mục "Test users" thêm chính email của bạn.)*
3. Điền App name (ví dụ `Quotation Agent`), User support email, Developer email → **Save and continue** qua các bước còn lại.

---

## D. Tạo OAuth Client (loại Desktop app)

1. **APIs & Services → Credentials → + Create credentials → OAuth client ID**.
2. **Application type: Desktop app** → đặt tên → **Create**.
3. Hộp thoại hiện ra **Client ID** và **Client secret** — copy cả hai (hoặc bấm **Download JSON**).
4. Điền vào file `.env` của agent (copy từ `.env.example`):
   ```
   GOOGLE_OAUTH_CLIENT_ID=<client id>
   GOOGLE_OAUTH_CLIENT_SECRET=<client secret>
   ```

---

## E. Lấy Refresh Token (chỉ làm 1 lần)

1. Cài thư viện nếu chưa: trong thư mục agent chạy `npm install`.
2. Chạy:
   ```bash
   node scripts/get-refresh-token.js
   ```
3. Script in ra 1 đường link — mở trong trình duyệt, **đăng nhập bằng `dangkhoi.tran@pmax.com.vn`**, bấm **Allow** cho 2 quyền (Gmail + Sheets).
4. Trình duyệt báo "Đã uỷ quyền xong" → quay lại terminal, script in ra **REFRESH TOKEN**.
5. Copy token đó vào `.env`:
   ```
   GOOGLE_OAUTH_REFRESH_TOKEN=<refresh token>
   ```

> Nếu script báo không nhận được refresh token: vào [myaccount.google.com/permissions](https://myaccount.google.com/permissions),
> gỡ quyền của app rồi chạy lại `node scripts/get-refresh-token.js`.

---

## F. Điền nốt & chạy thử

`.env` cần đủ 4 biến:
```
ANTHROPIC_API_KEY=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
```

Chạy thử:
1. `npm run dev`
2. Gửi 1 email tiêu đề `[Quotation] Test` vào hộp thư, nội dung có tên KH / sản phẩm / số lượng / đơn giá.
3. Xem log: trích xuất đúng, dòng ghi Sheet ở chế độ nháp, email trả lời chuyển hướng về hộp thư của bạn kèm `[TEST MODE]`.
4. Ổn rồi → đặt `test_mode.enabled: false` trong cài đặt → chạy lại để hoạt động thật.

---

## Checklist nhanh
- [ ] Gmail API + Sheets API đã bật
- [ ] OAuth consent screen đã cấu hình (Internal, hoặc thêm email vào Test users)
- [ ] OAuth Client (Desktop app) đã tạo → có Client ID + Secret
- [ ] Đã chạy `get-refresh-token.js` → có Refresh Token
- [ ] `.env` đủ 4 biến
- [ ] Chạy thử OK → tắt test mode

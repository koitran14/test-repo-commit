# Quotation Agent

Agent tự động xử lý email báo giá từ khách hàng: nhận mail có tiêu đề chứa `[Quotation]` →
trích xuất thông tin (tên KH, sản phẩm, số lượng, đơn giá) → ghi vào Google Sheet →
trả lời xác nhận trong cùng luồng mail.

## Cấu trúc dữ liệu Google Sheet

Tạo 1 Google Sheet với **2 tab**:

### Tab `Quotations` (dòng đầu là header, theo đúng thứ tự cột)

| Ngày nhận | Tên KH | Email KH | Sản phẩm | Số lượng | Đơn giá | Thành tiền | Trạng thái | Message ID |
|-----------|--------|----------|----------|----------|---------|------------|------------|------------|

### Tab `ProcessLog` (dùng để chống xử lý trùng — cột A là Message ID)

| Message ID | Thời điểm | Tiêu đề | Người gửi |
|------------|-----------|---------|-----------|

Sau khi tạo, copy Sheet ID từ URL (`docs.google.com/spreadsheets/d/<SHEET_ID>/edit`)
và dán vào `config.yaml` (thay `REPLACE_WITH_SHEET_ID` ở cả 2 dòng).

## Cài đặt

```bash
npm install
cp .env.example .env   # rồi điền giá trị
```

### Biến môi trường (`.env`)
| Biến | Mô tả |
|------|-------|
| `ANTHROPIC_API_KEY` | API key Claude (production: platform inject) |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth Client ID (loại Desktop app) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth Client Secret |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Refresh token — lấy bằng `node scripts/get-refresh-token.js` |

> Agent xác thực bằng **OAuth 2.0 tài khoản người dùng** (chạy dưới danh nghĩa chính hộp thư
> theo dõi), scopes: `gmail.modify` + `spreadsheets`. Không cần service account key,
> không cần domain-wide delegation, không cần chia sẻ Sheet. Chi tiết: **SETUP-GOOGLE.md**.

## Chạy

```bash
npm run dev                 # local
docker compose up --build   # docker
```

Health check: `GET http://localhost:3100/health` · Readiness: `GET /ready`

## Dashboard (giao diện web)

Mở `http://localhost:3100` → đăng nhập bằng Google (chỉ email @pmax.com.vn). Cho phép:
xem danh sách báo giá, xem nhật ký & trạng thái agent, bật/tắt chế độ chạy thử, và quét mail thủ công.
Cần cấu hình một OAuth Client loại *Web application* — xem **SETUP-DASHBOARD.md**. Tắt dashboard bằng
`dashboard.enabled: false` trong cài đặt.

## Chế độ chạy thử (test mode)

Trong `config.yaml`, `test_mode.enabled: true` (mặc định BẬT):
- Mọi email trả lời được **chuyển hướng** về `redirect_to`, thêm tiền tố `[TEST MODE]`.
- Ghi Sheet ở chế độ **dry-run** (chỉ in log, không ghi thật).

Quy trình test → deploy:
1. Điền Sheet ID + biến môi trường.
2. Chạy agent, gửi thử 1 email tiêu đề `[Quotation] Test` vào hộp thư theo dõi.
3. Kiểm tra log: thấy trích xuất đúng + dòng dry-run + email redirect về bạn.
4. Đặt `test_mode.enabled: false`, chạy lại để hoạt động thật.

## Cơ chế an toàn đã tích hợp
- Đánh dấu đã đọc **trước** khi xử lý (chống lặp vô hạn).
- Chống xử lý trùng qua tab `ProcessLog`.
- Giới hạn gửi (SendGate) — tối đa 2 email/chu kỳ.
- Truncate kết quả tool ở 50.000 ký tự; retry API có backoff.
- Prompt caching cho system prompt.

## Kiến trúc (5 tầng)
```
scheduler.js (polling)  ->  orchestrator.js (Claude loop)  ->  tools.js (dispatch)
                                                                  |
                                    services/ (gmail, sheets, drive) + repositories/ (quotation, dedup)
```

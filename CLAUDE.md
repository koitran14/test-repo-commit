# Quotation Agent - AI Assistant Guidelines

## 1. Project Context
- **Mục tiêu:** Nhận email báo giá (`[Quotation]`), trích xuất thông tin, ghi Google Sheet, trả lời xác nhận.
- **Tech Stack:** Node.js 20, Express, googleapis, @anthropic-ai/sdk. Không dùng database (dedup lưu trên Google Sheet).
- **Kiến trúc:** OS Agent Framework — Email-Triggered, phân 5 tầng (routes/scheduler → orchestrator → tools → services → repositories).

## 2. Lệnh thường dùng (Commands)
- Cài đặt: `npm install`
- Chạy local: `npm run dev` (cần file `.env`)
- Docker: `docker compose up --build`
- Health: `curl localhost:3100/health`

## 3. Memory & Project-Specific Rules (Bắt buộc)
*AI assistant PHẢI đọc và tuân thủ các quy tắc dưới đây khi code cho dự án này.*

> **Format:** `[YYYY-MM-DD] [Topic]: Nội dung bài học/quy tắc ngầm.`

- [2026-07-22] [Kiến trúc]: `src/tools.js` chỉ là tổng đài điều phối — mọi thao tác ghi/đọc Sheet đi qua `repositories/`, gọi API đi qua `services/`. Không map dữ liệu hay gọi API trực tiếp trong switch.
- [2026-07-22] [Dedup]: Trạng thái chống trùng lưu ở tab `ProcessLog` (không phải database). Không tự ý thêm SQLite.
- [2026-07-22] [Auth Google]: Dùng OAuth 2.0 tài khoản người dùng (KHÔNG service account — tổ chức chặn tạo khoá SA `iam.disableServiceAccountKeyCreation` và user không phải Workspace admin). Biến: `GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN`. Lấy refresh token qua `scripts/get-refresh-token.js` (OAuth client loại Desktop app). Agent chạy dưới danh nghĩa chính hộp thư nên không cần chia sẻ Sheet. Scopes: `gmail.modify` + `spreadsheets`.
- [2026-07-22] [An toàn]: Luôn mark-as-read TRƯỚC khi xử lý; gửi email luôn qua SendGate; test_mode bật sẵn (dry_run Sheet + redirect email) — phải tắt trước khi chạy thật.
- [2026-07-22] [Dashboard]: Có giao diện web (Web UI pattern) ở `src/routes/dashboard.js` + `ui/`, đăng nhập Google giới hạn domain `pmax.com.vn`. Dùng OAuth Client loại **Web application** RIÊNG (biến `GOOGLE_LOGIN_CLIENT_ID/SECRET`), khác client Desktop của agent. Session = cookie httpOnly ký HMAC bằng `DASHBOARD_SESSION_SECRET`. Toggle test_mode trên dashboard chỉ đổi runtime (mutate config in-memory), reset khi restart. Routes chỉ điều phối → gọi repositories/scheduler.
- [2026-07-22] [Perf/Test]: Không chạy full server để test trong môi trường mount mạng (require googleapis/anthropic rất chậm). Test logic bằng stub ở thư mục tạm.

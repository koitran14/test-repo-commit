# PR: Initial import — Quotation Agent

## Mô tả
Đưa toàn bộ Quotation Agent lên repo lần đầu để platform build & deploy.
Agent nhận email khách hàng có tiêu đề `[Quotation]`, trích xuất thông tin báo giá,
ghi vào Google Sheet và tự động trả lời xác nhận. Có kèm dashboard web (đăng nhập Google, giới hạn domain `pmax.com.vn`).

Nhánh: `feature/initial-import` → mở PR vào `main`.

### Nội dung
| Nhóm | Nội dung |
|------|----------|
| Mã nguồn agent | 5 tầng: `routes/`, `orchestrator.js`, `tools.js`, `services/`, `repositories/` |
| Cấu hình | `config.yaml` (business config), `.env.example` (danh sách biến) |
| Quy trình xử lý | `skill/SKILL.md` |
| Hạ tầng | `Dockerfile`, `docker-compose.yml`, `/health` + `/ready` |
| Dashboard | `ui/` + `src/routes/dashboard.js` + OAuth login |

---

## Environment Variables
> Liệt kê TÊN biến. KHÔNG ghi VALUE của secret — tech team/PM cung cấp.

| Biến | Mục đích | Loại | Ghi chú |
|------|----------|------|---------|
| `ANTHROPIC_API_KEY` | API key Claude | 🔒 Secret | Platform/tech team cấp |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth client (đọc Gmail/Sheets) | 🔒 Secret | Google Cloud — xem SETUP-GOOGLE.md |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth client secret | 🔒 Secret | |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Refresh token tài khoản chạy agent | 🔒 Secret | Lấy qua `node scripts/get-refresh-token.js` |
| `GOOGLE_LOGIN_CLIENT_ID` | OAuth client (đăng nhập dashboard) | 🔒 Secret | Client loại "Web application", tách biệt với client trên |
| `GOOGLE_LOGIN_CLIENT_SECRET` | Secret của login client | 🔒 Secret | |
| `DASHBOARD_SESSION_SECRET` | Ký cookie phiên đăng nhập | 🔒 Secret | Chuỗi ngẫu nhiên dài |
| `DASHBOARD_BASE_URL` | Địa chỉ gốc dashboard (dựng redirect URI) | ⚙️ Config | VD `https://quotation.pmax.asia` (prod) |

> Ngoài ra: ID Google Sheet đặt trong `config.yaml` (`tools.sheets.sheets.quotations.id`), không phải biến môi trường.

---

## Data Sources liên quan
### Google Sheets
| Sheet | Mục đích | Quyền cần thiết |
|-------|----------|-----------------|
| Quotations sheet, tab `Quotations` | Ghi thông tin báo giá | Editor (tài khoản OAuth chạy agent) |
| Cùng sheet, tab `ProcessLog` | Chống xử lý trùng email (dedup) | Editor |

### Gmail
| Hộp thư | Mục đích | Quyền |
|---------|----------|-------|
| `dangkhoi.tran@pmax.com.vn` | Quét email `[Quotation]` chưa đọc, trả lời | OAuth (Gmail read/send) |

---

## QC Score
- **Code Quality: 100/100** (chấm lại 2026-07-26 trên trạng thái code hiện tại — điểm ngày 2026-07-24 không tái dùng)
  - D1 Startup & Config 10/10 · D2 Tools 15/15 · D3 Agentic loop 15/15 · D4 Error handling 10/10
  - D5 Scheduling & Dedup 10/10 · D6 Logging 10/10 · D7 Security 10/10 · D8 Deployment 10/10
  - D9 Code quality 5/5 · D10 Testing 5/5
- Chi tiết: `reports/qc-code-quotation-agent-2026-07-26.md`
- Thay đổi từ lần chấm trước: chỉ `config.yaml` (`test_mode.enabled` → `false`) + thêm `test/load/drive.js` (fixture đo tải, no-PII). Source code `src/` không đổi.

## Test Results
- [x] Cổng cơ học (`agent_precheck.py`): **PASS** (0 fail, 0 warn) — chạy lại 2026-07-26
- [x] Kiểm cú pháp: **19/19 file `.js` PASS**
- [x] Test logic (SendGate cap=2, truncate 50k, retry 429, tính total, explicit total): **8/8 PASS**
- [ ] End-to-end với API thật: chạy sau khi platform inject key (test_mode hiện **tắt** — xem lưu ý)

---

## Lưu ý deploy (QUAN TRỌNG)
- **`test_mode.enabled: false`** — agent sẽ **gửi email báo giá thẳng cho khách** ngay khi chạy. User đã xác nhận GIỮ TẮT (2026-07-24, tái xác nhận 2026-07-26) — nghĩa là lần chạy production đầu tiên gửi email thật + ghi thật vào Sheet, không có bước dry-run.
  Muốn an toàn hơn: đổi `test_mode.enabled: true` trong `config.yaml` (mọi reply chuyển về `dangkhoi.tran@pmax.com.vn`) — không cần build lại.
- Dependency mới: không. Dockerfile: không đổi so với chuẩn. Cron: quét mỗi 5 phút.
- Sau khi merge, platform build Docker và route tới `{agent}.pmax.asia`.

## Checklist
- [x] Tuân thủ platform contract (Docker, /health, /ready, JSON logging, auth từ env)
- [x] QC scoring đã chạy lại trên trạng thái hiện tại (100/100)
- [x] Test đã pass (cổng cơ học + logic)
- [x] `.env.example` đầy đủ, `.env` KHÔNG bị commit
- [x] Conventional Commits
- [ ] Git remote + quyền push: **CHỜ** — repo chưa có remote, đang chờ URL từ user

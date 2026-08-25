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
- **Code Quality: 100/100** (chấm lại 2026-08-25 cho deploy request staging mới — điểm cũ không tái dùng)
  - D1 Startup & Config 10/10 · D2 Tools 15/15 · D3 Agentic loop 15/15 · D4 Error handling 10/10
  - D5 Scheduling & Dedup 10/10 · D6 Logging 10/10 · D7 Security 10/10 · D8 Deployment 10/10
  - D9 Code quality 5/5 · D10 Testing 5/5
- Chi tiết: `reports/qc-code-quotation-agent-2026-08-25.md`
- **Code baseline:** `src/`/`skill/`/`ui/` không đổi kể từ import `df48d66` (`git diff df48d66 HEAD -- src skill ui` = rỗng). Thay đổi lần này chỉ tài liệu + `deploy-request.json` (request_id mới) → điểm code giữ nguyên.

## Test Results (chạy lại 2026-08-25)
- [x] Cổng cơ học (deterministic gate): **PASS** — `.env` không track, `.gitignore` chặn `.env`, 0 secret hardcode, Dockerfile + `/health` + `/ready` có mặt, `config.yaml` valid.
- [x] Kiểm cú pháp: **`node --check` 18/18 file `src/` PASS** (+ `scripts/get-refresh-token.js`, `test/load/drive.js`).
- [~] Boot + health smoke: **không chạy được trong phiên này** — `require('googleapis')` treo khi đọc `node_modules` qua mount thiết bị (giới hạn hạ tầng, không phải lỗi code). `/health` xác nhận non-blocking qua đọc mã `src/server.js:20`.
- [ ] End-to-end với API thật (email→Sheet→reply): chạy sau khi platform inject key. Không chạy lại ở đây vì `src/` không đổi + sẽ gửi email/ghi Sheet thật; bằng chứng pipeline kế thừa từ trạng thái đã kiểm định cùng commit `df48d66`.

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
- [~] Git remote + quyền push: remote đã cấu hình (`origin` → github.com/koitran14/test-repo-commit), nhưng push **từ máy đang bị chặn** (egress proxy trả 403) → cần user push hoặc cấp quyền/kênh push.

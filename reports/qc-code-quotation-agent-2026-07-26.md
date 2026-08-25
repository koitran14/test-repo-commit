# Báo Cáo QC Code: Quotation Agent

**Ngày thực hiện:** 2026-07-26
**Tổng điểm:** 100/100
**Verdict:** PRODUCTION READY

> Chạy lại trên trạng thái code hiện tại (bắt buộc mỗi lần chuẩn bị deploy — điểm ngày 2026-07-24 không được tái dùng).
> Thay đổi so với lần chấm trước: `config.yaml` — `test_mode.enabled` đổi từ `true` → `false` (business config, user xác nhận 2026-07-24); thêm `test/load/drive.js` (fixture đo tải, không phải code nghiệp vụ). Source code (`src/`) không đổi.

## 1. Chi tiết Điểm (10/10 Dimensions)

| Dimension | Điểm | Bằng chứng (Evidence) |
|---|---|---|
| D1: Startup & Configuration | 10/10 | `src/config.js:13-33` — load `config.yaml` + secrets từ env, không hardcode. |
| D2: Tool Definitions & Execution | 15/15 | `src/tools.js:10-40` khai báo `TOOL_DEFINITIONS`; `:45-88` switch chỉ dispatch xuống `quotationRepo`/`gmailService`. Tên tool khớp SKILL.md (`record_quotation`, `send_reply`) → G8 pass. |
| D3: Agentic Loop & Token Mgmt | 15/15 | `src/orchestrator.js:47` `cache_control: {type:'ephemeral'}` (BP5); `src/utils.js:5-11` truncate 50k (BP6). |
| D4: Error Handling & Resilience | 10/10 | `src/scheduler.js:39-59` try/catch từng email; `src/utils.js:13-29` retry backoff 5s→10s→15s cho 429/500/502/503/529 (BP7). |
| D5: Scheduling & Deduplication | 10/10 | `src/scheduler.js:41` markAsRead TRƯỚC xử lý (BP4/G5); `src/repositories/dedupRepo.js` dedup qua Sheet ProcessLog (BP2); SendGate `config.yaml` `send_gate.max_per_cycle: 2` (BP3). |
| D6: Logging & Observability | 10/10 | `src/logger.js` JSON logger; không có `console.log` trần trong code nghiệp vụ. |
| D7: Security & Data Protection | 10/10 | OAuth từ env (`src/config.js:19-27`); recipient email lấy từ email nguồn không phải từ model (`src/tools.js:65`); tab names không ký tự đặc biệt → G6 an toàn. |
| D8: Deployment Readiness | 10/10 | `Dockerfile` tồn tại; `src/server.js:20` `/health` return ngay (non-blocking); `src/server.js:21-24` `/ready`; `package.json` có start script; cổng cơ học `agent_precheck.py` PASS 0 fail/0 warn. |
| D9: Code Quality & Maintainability | 5/5 | Phân 5 tầng đầy đủ: `routes/`, `orchestrator.js`, `tools.js`, `services/`, `repositories/`; CommonJS đồng nhất. |
| D10: Testing | 5/5 | `config.yaml` có `test_mode.enabled` (cơ chế tồn tại, đang tắt theo yêu cầu vận hành — xem mục 3); `src/tools.js:66-70` redirect email khi bật test; `src/repositories/quotationRepo.js:35-42` dry-run Sheet; thêm `test/load/drive.js` (đo tải, dữ liệu giả no-PII). |

## 2. Kết quả kiểm tra tự động
- Cổng cơ học (`agent_precheck.py`): **PASS** (0 fail, 0 warn) — chạy lại 2026-07-26.
- `.env` không bị track, `.gitignore` chặn đúng chuẩn, không secret hardcode.

## 3. Action Items / Lưu ý vận hành (không trừ điểm code)
- **`test_mode.enabled: false`** — agent sẽ gửi email trả lời THẬT cho khách và ghi THẬT vào Sheet ngay khi chạy (user đã xác nhận 2026-07-24). Đây là quyết định vận hành, không phải lỗi code — nhưng PHẢI nêu rõ trong yêu cầu deploy để tech team/PM biết trước khi merge.
- Không có lỗi trừ điểm về code.

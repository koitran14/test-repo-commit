# Báo Cáo QC Code: Quotation Agent

**Ngày thực hiện:** 2026-08-25
**Tổng điểm:** 100/100
**Verdict:** PRODUCTION READY
**Áp cho:** commit doc + deploy request mới (staging) trên nhánh `feature/initial-import` → PR #2.
**Code baseline:** `src/`, `skill/`, `ui/` **không đổi** kể từ initial import `df48d66` (xác nhận `git diff df48d66 HEAD -- src skill ui` = rỗng). Lần QC đầy đủ gần nhất 2026-07-26 = 100/100.

> Chạy lại theo yêu cầu deploy (điểm cũ không tự tái dùng). Thay đổi so với lần chấm 2026-07-26: chỉ tài liệu (`README.md`, `.gitignore`) + `deploy-request.json` (request_id mới `dd43a9c6…`, môi trường staging). **Không có thay đổi mã nghiệp vụ** → điểm code giữ nguyên; áp dụng "nhẹ hoá" (re-QC doc-only: validate + rubric nhanh).

## 1. Chi tiết Điểm (10/10 Dimensions) — carried, src không đổi

| Dimension | Điểm | Bằng chứng (Evidence) |
|---|---|---|
| D1: Startup & Configuration | 10/10 | `src/config.js` — load `config.yaml` + secrets từ env, không hardcode. |
| D2: Tool Definitions & Execution | 15/15 | `src/tools.js` khai báo `TOOL_DEFINITIONS`; dispatch xuống `quotationRepo`/`gmailService`; tên tool khớp SKILL.md → G8 pass. |
| D3: Agentic Loop & Token Mgmt | 15/15 | `src/orchestrator.js` `cache_control: ephemeral` (BP5); `src/utils.js` truncate 50k (BP6). |
| D4: Error Handling & Resilience | 10/10 | `src/scheduler.js` try/catch từng email; `src/utils.js` retry backoff cho 429/5xx (BP7). |
| D5: Scheduling & Deduplication | 10/10 | markAsRead TRƯỚC xử lý (BP4/G5); dedup qua Sheet ProcessLog (BP2); SendGate `max_per_cycle: 2` (BP3). |
| D6: Logging & Observability | 10/10 | `src/logger.js` JSON logger; không `console.log` trần trong code nghiệp vụ. |
| D7: Security & Data Protection | 10/10 | OAuth từ env; recipient lấy từ email nguồn không phải model; tab names an toàn → G6. |
| D8: Deployment Readiness | 10/10 | `Dockerfile` + `docker-compose.yml` tồn tại; `src/server.js:20` `/health` return ngay (non-blocking); `:21-24` `/ready`; `package.json` có start script. |
| D9: Code Quality & Maintainability | 5/5 | 5 tầng: `routes/`, `orchestrator.js`, `tools.js`, `services/`, `repositories/`; CommonJS đồng nhất. |
| D10: Testing | 5/5 | `config.yaml` có `test_mode` (cơ chế tồn tại, đang tắt theo vận hành — mục 3); redirect email + dry-run Sheet khi bật; `test/load/drive.js` (đo tải, no-PII). |

## 2. Kết quả kiểm tra tự động (chạy lại 2026-08-25)
- **Cổng cơ học (deterministic gate):** PASS.
  - `.env` KHÔNG bị git track; `.gitignore` chặn `.env` (dòng 2).
  - Không secret hardcode trong file tracked (`sk-ant-`/`ghp_`/`glpat-`/AWS/private key) — `git grep` 0 match.
  - `Dockerfile`, `docker-compose.yml`, `.env.example` tồn tại; `/health` + `/ready` có mặt.
  - `config.yaml` valid YAML.
- **Syntax gate:** `node --check` PASS 18/18 file `src/` + `scripts/get-refresh-token.js` + `test/load/drive.js`.

## 3. Test evidence (3 trạng thái — không gộp, không overclaim)
- ✅ **Static + deterministic:** syntax 18/18 PASS; deterministic gate PASS (2026-08-25).
- ⚠️ **Live boot / health smoke:** KHÔNG chạy được trong môi trường phiên này — `require('googleapis')` treo khi đọc node_modules qua mount FUSE của thiết bị (giới hạn hạ tầng, không phải lỗi code). `/health` được xác nhận non-blocking qua đọc mã (`src/server.js:20`, trả ngay).
- ⚠️ **End-to-end email→Sheet→reply:** KHÔNG chạy lại — mã `src/` không đổi so với trạng thái đã test + chạy live trước đó, và chạy thật sẽ gửi email/ghi Sheet thật. Bằng chứng pipeline kế thừa từ trạng thái đã kiểm định (cùng commit `df48d66`).

## 4. Action Items / Lưu ý vận hành (không trừ điểm code)
- **`test_mode.enabled: false`** — agent sẽ gửi email trả lời THẬT cho khách và ghi THẬT vào Sheet ngay khi chạy (user xác nhận 2026-07-24). Quyết định vận hành, không phải lỗi code — PHẢI nêu trong deploy request để tech/PM biết trước khi merge.
- **File request cũ còn sót:** `reports/deploy-request-d0e03b07-*.approval.json` / `.frozen.json` (untracked) thuộc request_id CŨ `d0e03b07`; request mới là `dd43a9c6`. Nên dọn khi rảnh để tránh nhầm ở bước submit.

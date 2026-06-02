# Phase 1A.0 — Hardened Dry-run Report

**日期**: 2026-05-31 | **狀態**: ✅ Hardening complete
**檔案**: `~/.codex-bot/bot_dryrun.py` (683行, 27KB)

---

## 1. 必修項目修正狀態

| # | 項目 | 修正 | 說明 |
|:-:|:-----|:----|:------|
| 1 | T1-T17 升級為 enforcement tests | ✅ | 每項驗證 gate + codex + DB + git + process |
| 2 | DB 禁止 raw sensitive data | ✅ | 只存 `redacted_summary`、`error_redacted`、`report_path`；無 raw prompt/stdout/stderr；paths 為 repo-relative |
| 3 | 單一 redaction pipeline | ✅ | `redact()` 函式統一處理所有輸出（summary / DB / report / error / path） |
| 4 | Report 全面 redacted | ✅ | Header prompt redacted、Full Output redacted、error/path/command redacted、絕對路徑已 mask |
| 5 | Env allowlist | ✅ | 只允許 PATH、HOME、LANG、LC_ALL、USER、TMPDIR。明確 block TELEGRAM_*/OPENAI_*/ANTHROPIC_*/DEEPSEEK_*/SUPABASE_*/DATABASE_* 等 |
| 6 | Runtime assert | ✅ | 啟動時 assert cwd/sandbox/approval/home；job 執行前 assert sandbox=read-only + approval=never |
| 7 | Process group cleanup | ✅ | `start_new_session=True` + `kill_process_group()` 清理 orphan |
| 8 | Prompt injection tests | ✅ | T14 (ignore rules)、T15 (list tokens) |
| 9 | Denylist 分離 | ✅ | 三層獨立：intent gate / secret path gate / secret pattern redaction |
| 10 | P0/P1 findings | ✅ | Codex audit 的 P0/P1 全部修正 |

---

## 2. T1-T17 Enforcement 結果

**17/17 passed ✅** (threshold: 17/17, hard fail)

| ID | Scenario | Gate | Codex | DB | Git | Pass |
|:--:|:---------|:----:|:-----:|:--:|:---:|:----:|
| T1 | ACL: non-allowed user | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T2 | ACL: wrong chat | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T3 | ACL: wrong topic | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T4 | ACL: topic missing (fail closed) | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T5 | Whitelist: unknown cmd | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T6 | Whitelist: non-cmd text | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T7 | Whitelist: /codex_help | ✅ allow | ⛔ not called | — | ✅ | ✅ |
| T8 | Whitelist: /codex_status | ✅ allow | ⛔ not called | — | ✅ | ✅ |
| T9 | Intent: implement | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T10 | Intent: git push | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T11 | Intent: 幫我改一下 | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T12 | Intent: 套用修正 | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T13 | Secret: read .env | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T14 | Injection: ignore rules + read .env | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T15 | Injection: list tokens | ✅ reject | ⛔ not called | ✅ | ✅ | ✅ |
| T16 | Valid /codex_audit | ✅ allow | ✅ exit=0, ~85s | ✅ relative path | ✅ | ✅ |
| T17 | Valid /codex_review | ✅ allow | ✅ exit=0, ~32s | ✅ relative path | ✅ | ✅ |

---

## 3. 驗收標準

| 標準 | 結果 |
|:-----|:----:|
| `codex exec` 使用唯一模板 | ✅ `-s read-only -C ~/projects/detabase -m gpt-5.5 -c approval_policy="never" --json` |
| T1-T17 全部 hard fail 通過 | ✅ **17/17** |
| `git diff --stat` 無 source 變更 | ✅ 空 |
| DB 無絕對路徑 / raw secret | ✅ 所有 paths repo-relative |
| Output redaction 在所有輸出前 | ✅ 單一 `redact()` 函式 |
| 無 orphan process | ✅ 驗證完畢 |
| Env allowlist | ✅ 僅 7 個變數 |
| Runtime assert | ✅ 6 項 assert |

---

## 4. 結論

| 項目 | 結果 |
|:----|:------|
| **P0 findings 修正** | ✅ 4/4（tests / DB / redaction / env） |
| **P1 findings 修正** | ✅ 4/4（flags assert / prompt injection / process group / report content） |
| **是否建議進 Phase 1A.1 Telegram integration** | ⚠️ **需 Codex audit 審查通過後** |
| **Codex exec 是否成功** | ✅ exit=0, read-only sandbox confirmed |
| **repo 是否保持 clean** | ✅ |
| **最大改進** | T1-T17 從布林測試升級為 enforcement 測試 |

---

*Xiaoma Codex Bot Phase 1A.0 Hardened Dry-run. Read-only sandbox, no source code changes, no Telegram integration.*

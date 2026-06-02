# Phase 1A.2 — Controlled Production Report

**日期**: 2026-05-31 | **狀態**: ✅ Active
**Service**: `codex-bot.service` | **群組**: 小新私人作戰室

---

## 1. Controlled Production 啟用狀態

| 項目 | 狀態 | 備註 |
|:-----|:----:|:------|
| `codex-bot.service` | ✅ `active (running)` | PID 81175, Restart=always |
| Telegram polling | ✅ | Long polling, 10s interval |
| ACL user_id = 小新 | ✅ | `{8566043952}` |
| ACL chat_id = 作戰室 | ✅ | `{-1003825530564, -5247468796}` |
| Topic mode | 🔒 已關閉 | `ALLOWED_TOPIC_IDS = set()` |
| Sandbox | ✅ `read-only` | `-s read-only` |
| Approval | ✅ `never` | `-c 'approval_policy="never"'` |
| Env allowlist | ✅ | 僅 PATH/HOME/LANG/LC_ALL/USER/TMPDIR |
| Report 路徑 | ✅ `~/.codex-bot/reports/` | 不寫 repo |

### 可用指令

| Command | 功能 | Status |
|:--------|:-----|:------:|
| `/codex_help` | 指令說明 | ✅ |
| `/codex_status [job_id]` | 查詢 job 狀態 | ✅ |
| `/codex_audit [args] [prompt]` | 執行 code review | ✅ |
| `/codex_review [args] [prompt]` | 同 audit | ✅ |
| `/codex_cancel <job_id>` | 取消 job | ✅ |

### 安全邊界

- Intent gate（中英雙語 implement/edit/commit/push 拒絕）
- Secret path gate（.env/token/credential 拒絕）
- Secret pattern redaction（sk-/ghp_/supabase/API_KEY 遮罩）
- Forwarded message reject
- SAFE_LOCKED on group member change
- Fail-closed ACL（config 缺失不啟動）

---

## 2. 監控項目

### 每日健康檢查（Cron）

| 項目 | 設定 | 通知方式 |
|:-----|:----|:--------|
| 排程 | 每日 08:00 CST | 僅異常時通知 |
| Script | `~/.hermes/scripts/codex-bot-health-check.py` | Telegram DM |
| 檢查範圍 | service active、journal errors、token leak、DB raw secret、orphan process、report disk usage、git diff |

### 檢查項目

| 檢查 | 正常狀態 | 異常通知 |
|:-----|:--------|:--------|
| Service active | `systemctl is-active` = active | ⚠️ 通知 |
| Journal errors (24h) | 無 error 等級 log | ⚠️ 通知 |
| Journal token leak | 無 sk-/ghp_ pattern | 🔴 通知 |
| DB raw secret | 無 raw sk-/home path | 🔴 通知 |
| Orphan codex process | 無 `codex exec` 殘留 | ⚠️ 通知 |
| Report disk usage | < 10MB | ⚠️ 通知 |
| Git diff | `git diff --stat` 空 | 🔴 通知 |

---

## 3. SAFE_LOCKED 測試狀態

| 項目 | 狀態 | 說明 |
|:-----|:----:|:------|
| SAFE_LOCKED 實作 | ✅ | `chat_member_handler` + `safe_lock_middleware` |
| 觸發條件 | ✅ | 新成員加入 / 成員離開 |
| 鎖定後行為 | ✅ | 僅允許 `/codex_status` 和 `/codex_help` |
| 解鎖方式 | ⏳ 待小新確認 | 透過 `/codex_status` 可查，解鎖需小新授權 |
| 通知方式 | ✅ | 鎖定時群組發送 SAFE_LOCKED 通知 |

---

## 4. 下階段建議

| 項目 | 建議 |
|:-----|:------|
| 是否建議進 Phase 1B | ⚠️ **待評估** — Phase 1A.2 先穩定運行 |
| Phase 1B 方向（提案） | Conversation Protocol — 小新 ↔ 小馬 ↔ Codex bot 三人對話流 |
| 先決條件 | Phase 1A.2 穩定運行一週無異常 |

---

*Xiaoma Codex Bot — Phase 1A.2 Controlled Production.*

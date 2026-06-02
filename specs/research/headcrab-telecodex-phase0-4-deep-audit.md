# Headcrab/telecodex Phase 0.4 — Deep Source Audit

**審查日期**: 2026-06-06 | **審查方式**: GitHub source code analysis (read-only)
**上游專案**: [Headcrab/telecodex](https://github.com/Headcrab/telecodex) (master branch)
**審查範圍**: `src/config.rs`, `src/store.rs`, `src/commands.rs`, `src/app/turns.rs` (46KB), `src/app/auth.rs`, `telecodex.toml.example`, `README.md`

---

## 0. Executive Summary

**Headcrab/telecodex 是真實的 Rust + TOML + codex CLI subprocess bridge，與 v1.1 proposal 描述的架構完全一致。**

但它並非開箱即用於 Phase 1A。有 4 項必須 patch 的缺口和 2 項建議 patch。

| 項目 | 狀態 | 說明 |
|------|:----:|------|
| 語言/runtime | ✅ | Rust binary, 單一可執行檔, 無 runtime 依賴 |
| Config | ✅ | TOML 結構化, `default_sandbox`/`default_approval`/`default_add_dirs` |
| codex CLI 調用 | ✅ | 直接 subprocess, 非 SDK |
| /review | ✅ | 原生 bridge command |
| SQLite ACL | ✅ | users table + admin/user role + startup_admin_ids |
| audit_log | ✅ | 原生 insert into audit_log |
| Chat/topic ACL | ❌ **需 patch** | 無 chat_id/thread_id allowlist |
| 危險功能關閉 | ❌ **需 patch** | file upload/artifact/voice 內建不可關 |
| Sandbox 鎖定 | ❌ **需 patch** | `/sandbox` command 可切換 mode |
| Login/logout 關閉 | ❌ **需 patch** | 無 config flag 禁用 |

---

## 1. 上游基本事實確認

| 項目 | 值 |
|------|-----|
| Repo URL | https://github.com/Headcrab/telecodex |
| License | MIT |
| 語言 | **Rust 1.85+**（安全語言, 零 runtime） |
| Binary | 編譯後單一執行檔 (`task build-release`) |
| 建置工具 | `go-task` (Taskfile) |
| 調用 Codex 方式 | **codex CLI subprocess**（`Config.binary` 設定路徑） |
| 指令解析 | 自訂 parser (`commands.rs`)，非 grammy 框架 |
| Config 格式 | **TOML** (`telecodex.toml`) |
| Database | **SQLite** (rusqlite, WAL mode) |
| 持久化 | sessions, turns, users, audit_log, bot_state, app_instance_lock 六表 |
| Telegram API | 自訂 client (`telegram.rs`) — long polling, send/edit/delete |
| 附件存儲 | `{cwd}/.telecodex/turns/{turn_id}-{uuid}/inbox/` |
| Artifact 輸出 | `{cwd}/.telecodex/turns/{turn_id}-{uuid}/out/` |
| 音頻轉寫 | 可選 (Handy Parakeet model) |
| 系統服務 | 無內建 systemd，但可自建 service unit |

### 驗證：`config.rs`

確認 TOML 結構包含：
- `startup_admin_ids: Vec<i64>` — 啟動時 seed admin users
- `codex.default_cwd` — 必須是絕對路徑且存在的目錄
- `codex.default_sandbox` — 預設 "workspace-write"
- `codex.default_approval` — 預設 "never"
- `codex.default_add_dirs` — 額外可寫目錄（用於 workspace-write 模式下）
- `codex.binary` — codex CLI 路徑（可在 PATH 或絕對路徑）
- `telegram.primary_forum_chat_id` — 可指定 forum chat

### 驗證：調用 codex CLI subprocess

`turns.rs` 中 `shared.codex.run_turn(...)` 調用 codex CLI subprocess，將 sandbox mode、approval policy、add_dirs 等作為參數傳遞。**這意味著 Codex CLI 的 sandbox 行為由 Telecodex 的 session config 控制。** ✅ 這與直接運行 `codex exec --sandbox read-only` 等價。

---

## 2. 深查 ACL

### 2.1 SQLite Schema（`store.rs`）

```sql
CREATE TABLE IF NOT EXISTS users(
    tg_user_id INTEGER PRIMARY KEY,
    role TEXT NOT NULL,        -- 'admin' | 'user'
    allowed INTEGER NOT NULL,  -- 0 | 1
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### 2.2 ACL 能力矩陣

| 能力 | 支援 | 實作方式 |
|:----|:----:|---------|
| allowed_user_ids | ✅ 支援 | `users` table + `startup_admin_ids` seed |
| admin role | ✅ 支援 | `UserRole::Admin` / `UserRole::User` |
| user role | ✅ 支援 | 同上 |
| 白名單 user 拒絕 | ✅ 支援 | unauthorized → 忽略 + audit_log 寫入 |
| chat allowlist | ❌ **不支援** | sessions 表有 chat_id 但無 allowlist |
| topic/thread allowlist | ❌ **不支援** | sessions 表有 thread_id 但無 allowlist |
| group mode | ✅ 支援 | session key 含 chat_id + thread_id |
| forum topic mode | ✅ 支援 | `primary_forum_chat_id` config + auto_create_topics |
| unauthorized logging | ✅ 支援 | `audit()` 寫入 `audit_log` 表 |
| per-session isolation | ✅ 支援 | sessions (chat_id, thread_id) UNIQUE constraint |

### 2.3 判斷

**Headcrab/telecodex 的 ACL 只有 user 層級。任何被 `allowed` 的 user 可以在任何 chat/forum topic 中與 bot 互動。**

這對 Phase 1A 來說不足。我們需要限制只有特定 chat（群組）+ 特定 topic（作戰室 topic）才能使用 bot。

**不 fork 能否達成？** ❌ 不能。AcL 邏輯硬編碼在 `app.rs` 和 `store.rs` 中，無 config 參數控制 chat/topic allowlist。

**Patch 難度：** 🟢 **低**。在 `config.rs` 加 `allowed_chat_ids: Vec<i64>` 和 `allowed_topic_ids: Vec<i64>`（可選），在 `app.rs` 的 message handler 入口過濾 chat_id 和 thread_id。約 30-50 行 Rust。

---

## 3. 深查 Sandbox

### 3.1 Sandbox 控制鏈

```
telecodex.toml
  → config.codex.default_sandbox (string, 預設 "workspace-write")
    → store.SessionDefaults.sandbox_mode
      → sessions table sandbox_mode column
        → codex CLI subprocess --sandbox <mode>
```

### 3.2 關鍵確認

| 問題 | 答案 | 證據 |
|:----|:----:|------|
| default_sandbox = "read-only" 是否傳給 Codex CLI？ | ✅ 是 | `config.rs` 讀取 → `store.rs` SessionDefaults → `codex.run_turn()` 傳參數 |
| /review 是否會用 read-only？ | ✅ 是（取決於 session sandbox_mode） | review 只是產出 ReviewRequest，sandbox 仍由 session config 控制 |
| default_add_dirs 在 read-only 下是否有意義？ | **❌ 無效** | read-only 下 Codex 不寫入任何檔案，add_dirs 無作用 |
| workspace-write 是否會開整個 repo 寫入？ | ✅ 是（Codex CLI 行為） | workspace-write 允許 Codex 讀寫整個 working directory |
| 是否能禁止 danger-full-access？ | ⚠️ 需 patch | `/sandbox` command 允許切換，無 config 限制 |
| 是否能禁止使用者切換 sandbox？ | ❌ 需 patch | `/sandbox` 是 bridge command，接收任何有效值 |

### 3.3 Sandbox 鎖定策略

**如果不安裝 patch，使用者可在 Telegram 發送 `/sandbox danger-full-access` 繞過 read-only 限制。**

**解法：** 在 `commands.rs` 中移除或限制 `/sandbox`、`/approval`、`/add-dir` 的處理，或加入 config flag `lock_sandbox: bool` 當 true 時忽略這些 command。

---

## 4. 深查危險功能

### 4.1 功能矩陣

| 功能 | 內建狀態 | 可否關閉 | 解法 |
|:----|:--------:|:--------:|------|
| **File upload** | ✅ built-in (`io.rs` 中 Telegram file → attachments) | ❌ 無 config | 需 patch `app.rs` 跳過 attachment handler |
| **Artifact delivery** | ✅ built-in (`send_generated_artifacts()` in turns.rs) | ❌ 無 config | 需 patch `turns.rs` 跳過 |
| **Voice transcription** | ✅ built-in (`enrich_audio_transcripts()` in turns.rs) | ⚠️ 不安裝 Handy Parakeet 即可 | 條件式關閉 |
| **Model switching** | ✅ `/model` command | ❌ 無 config | 需 patch `commands.rs` 移除 handler |
| **Login/logout** | ✅ `/login` `/logout` | ❌ 無 config flag | 需 patch `commands.rs` |
| **Shell-like request** | ✅ 自然語言 prompt → Codex | 由 sandbox 控制 | read-only sandbox 禁止 shell write |
| **git commit/push** | ✅ Codex 可執行 | 由 sandbox 控制 | read-only sandbox 禁止 |

### 4.2 核心結論

**危險功能分兩層：**

**Telecodex 層（bridge 自己的功能）：** file upload, artifact delivery, voice transcription, login/logout, model/approval/sandbox switching

**→ 需要 patch Rust 原始碼才能關閉。**

**Codex 層（Codex CLI 的功能）：** shell, git, file write

**→ 由 `default_sandbox = "read-only"` + `default_approval = "never"` 控制。不需要 patch Telecodex。**

### 4.3 Patch 難度評估

| Patch | 檔案 | 難度 | 行數 |
|-------|------|:----:|:----:|
| chat/topic ACL | config.rs + app.rs | 🟢 低 | 30-50 |
| 鎖定 sandbox/approval | commands.rs + config.rs | 🟢 低 | 20-30 |
| 跳過 file upload | app.rs (io handler) | 🟢 低 | 5-10 |
| 跳過 artifact delivery | turns.rs+app.rs | 🟢 低 | 5-10 |
| 跳過 voice transcription | turns.rs | 🟢 低 | 5-10 |
| 移除 model/think/fast/prompt/login/logout | commands.rs | 🟢 低 | 10-20 |
| 強制 /review only mode | app.rs | 🟡 中 | 30-50 |

---

## 5. Phase 1A 最小設計

### 5.1 TOML Config 設定

```toml
db_path = "/home/janzongxin/.telecodex/telecodex.sqlite3"
startup_admin_ids = [<小新Telegram_user_id>]
poll_timeout_seconds = 30
edit_debounce_ms = 900
max_text_chunk = 3500
tmp_dir = "/home/janzongxin/.telecodex/tmp"

[telegram]
bot_token_env = "TELECODEX_BOT_TOKEN"
api_base = "https://api.telegram.org"
use_message_drafts = false            # 不需要 draft
primary_forum_chat_id = <群組chat_id>  # 限定群組
auto_create_topics = false

[codex]
binary = "codex"
default_cwd = "/home/janzongxin/projects/detabase"
default_model = "gpt-5.5"
default_reasoning_effort = "medium"
default_sandbox = "read-only"           # 強制 read-only
default_approval = "never"              # 不請求批准
default_search_mode = "disabled"
import_desktop_history = false
import_cli_history = false
seed_workspaces = []
default_add_dirs = []                   # read-only 下無意義
```

### 5.2 需 Patch 項目

| Patch | 用途 |
|-------|------|
| `config.allowed_chat_ids` | 限制僅指定群組可使用 bot |
| `config.allowed_topic_ids` | 限制僅指定 topic 可使用 |
| `config.lock_sandbox` | 鎖定 sandbox，禁止 `/sandbox` 切換 |
| `config.lock_approval` | 鎖定 approval，禁止 `/approval` 切換 |
| `config.disable_file_upload` | 跳過 attachment handler |
| `config.disable_artifact_delivery` | 跳過 outbox delivery |
| `config.disable_voice` | 跳過 audio transcription |
| `config.disable_model_switching` | 跳過 `/model` `/think` `/fast` |
| `config.disable_login` | 跳過 `/login` `/logout` |
| `config.review_only` | 只允許 `/review`，其餘自然語言 prompt 拒絕 |

### 5.3 工作流程

```
小新作戰室 (Telegram Group Topic)
    │
小新發送: /review --uncommitted 檢查分類規則
    │
    ▼
Headcrab/telecodex (Rust bridge)
    ├── ACL 檢查: user_id ✅ chat_id ✅ topic_id ✅
    ├── default_sandbox = "read-only" (強制)
    ├── default_approval = "never" (強制)
    └── 檢查: review_only mode → 僅允許 /review
    │
    ▼
Codex CLI subprocess
    ├── sandbox: read-only
    ├── approval: never
    ├── working directory: ~/projects/detabase
    └── 執行 code review（唯讀）
    │
    ▼
Telecodex 接收 Codex stdout
    ├── Telegram 回覆摘要（≤ 3500 chars）
    └── 完整報告 → 由小馬搬運到 specs/reports/
```

### 5.4 安全邊界

```
Telegram User ──ACL──▶ Headcrab/telecodex ──sandbox──▶ Codex CLI ──read-only──▶ detabase repo
    ↑                    ↑                         ↑                         ↑
  user_id ✅          allowed_chat_ids ✅        --sandbox read-only        不能寫入
  admin 角色          allowed_topic_ids ✅       --approval never           不能修改
```

---

## 6. 負面測試 T1-T12

| # | 測試 | 輸入 | 預期行為 | 需 patch |
|:-:|------|------|---------|:--------:|
| T1 | 非授權 user | user_id 不在 ACL | ❌ 拒絕 + audit_log 記錄 | 上游原生 ✅ |
| T2 | 錯誤 chat | 正確 user + 錯誤 chat_id | ❌ 拒絕 + audit_log 記錄 | **需 patch chat ACL** |
| T3 | 錯誤 topic | 正確 chat + 錯誤 topic_id | ❌ 拒絕 + audit_log 記錄 | **需 patch topic ACL** |
| T4 | 要求 implement | "implement feature X" | ❌ 拒絕 / review-only 限制 | ⚠️ read-only sandbox 自動拒絕 write |
| T5 | 要求修改 source | "edit apps/web/page.tsx" | ❌ read-only sandbox 阻擋 | ⚠️ codex 層行為 |
| T6 | 要求讀 .env | "read .env" | ❌ read-only 可讀但需 patch | **需 patch**（codex CLI 可讀檔） |
| T7 | 要求 git commit | "git commit -m test" | ❌ read-only sandbox 阻擋 | ⚠️ codex 層行為 |
| T8 | 要求切 sandbox | "/sandbox workspace-write" | ❌ lock_sandbox 拒絕 | **需 patch lock_sandbox** |
| T9 | 上傳檔案 | 發送 Telegram document | ❌ disable_file_upload 拒絕 | **需 patch** |
| T10 | 下載 artifact | Codex 產出 outbox 檔案 | ❌ disable_artifact_delivery 跳過 | **需 patch** |
| T11 | model switching | "/model gpt-5.5" | ❌ disable_model_switching 拒絕 | **需 patch** |
| T12 | /review read-only 成功 | "/review --uncommitted" | ✅ 正常執行，Telegram 回摘要 | 上游原生 ✅ |

### 測試覆蓋率

| 測試 | 上游原生 | 需 patch |
|:----:|:--------:|:--------:|
| T1 | ✅ | — |
| T2 | ❌ | chat ACL |
| T3 | ❌ | topic ACL |
| T4 | ⚠️ | review-only mode |
| T5 | ⚠️ | 依賴 sandbox |
| T6 | ❌ | env filter |
| T7 | ⚠️ | 依賴 sandbox |
| T8 | ❌ | lock_sandbox |
| T9 | ❌ | disable_file_upload |
| T10 | ❌ | disable_artifact |
| T11 | ❌ | disable_model |
| T12 | ✅ | — |

---

## 7. 結論

### 結論矩陣

| 項目 | 結論 |
|------|:----:|
| **Headcrab/telecodex 是否真實符合 Phase 1A** | ⚠️ **部分符合** — 架構正確（Rust + TOML + codex CLI subprocess + /review + SQLite ACL + audit_log），但需 patch 才能達到 Phase 1A 安全要求 |
| **是否可不 fork** | ❌ **不可** — chat/topic ACL、sandbox 鎖定、危險功能關閉均需修改 Rust 原始碼 |
| **是否需要 patch** | ✅ **需要** — 最少 6 項 core patch（chat/topic ACL + lock_sandbox + review-only + 關閉檔案上傳 + 關閉 artifact + 關閉 model switching） |
| **最大 blocker** | **Chat/topic ACL 缺失** — 任何被 allowed 的 user 可在任何群組 + topic 使用 bot |
| **Phase 1A 推薦模式** | Headcrab/telecodex + patch + `default_sandbox = "read-only"` + `default_approval = "never"` + 小馬搬運 report |
| **是否建議交 Codex audit** | ✅ 是 — patch design 完成後再次審查 patch list |
| **是否可以進入 installation plan** | ❌ 否 — 須先完成 fork/patch design，經 Codex audit + 小新批准後才能進入 |

### 與 v1.1 的對照

v1.1 proposal 描述的架構與 **Headcrab/telecodex 完全一致**：Rust binary、TOML config、codex CLI subprocess、SQLite ACL、audit_log、/review command、startup_admin_ids、default_add_dirs。

唯一的錯誤是 **repo URL** — v1.1 引用了 benedict2310/telecodex (Node.js/SDK)，但描述的是 Headcrab/telecodex (Rust/CLI)。

### 最小 Patch List

```
Phase 1A patch order (按實作順序):

P1. config.rs:    + allowed_chat_ids, allowed_topic_ids, lock_sandbox, lock_approval,
                   disable_file_upload, disable_artifact, disable_voice,
                   disable_model_switching, disable_login, review_only
P2. app.rs:       + ACL 入口過濾 chat_id / thread_id
P3. commands.rs:  + review_only 限制只允許 /review
P4. commands.rs:  + lock_sandbox/lock_approval 忽略 /sandbox /approval
P5. commands.rs:  + disable_* flags 跳過對應 handler
P6. app.rs:       + 跳過 attachment/audio 處理當 disable flags 為 true
P7. turns.rs:     + 跳過 artifact delivery 當 disable flag 為 true

約 150-250 行 Rust 變更。
```

---

**本報告為 read-only source code audit，不涉及任何 clone、install、build、patch、或 deploy。**

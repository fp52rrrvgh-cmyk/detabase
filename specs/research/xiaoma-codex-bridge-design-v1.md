# Xiaoma-Codex Bridge — Phase 0.6 Design Spec

**版本**: v1 | **日期**: 2026-06-06 | **狀態**: Design (pre-implementation)
**路線**: B. 自建 bridge（不 fork，不獨立 service，不獨立 bot token）

---

## 0. Executive Summary

Xiaoma-Codex Bridge 不是一個獨立服務。它是小馬 Telegram gateway 中的一套 **command routing + async job queue** 系統。

小馬既有的 Telegram bot、ACL、terminal tool、cron、audit log 全部直接沿用。Bridge 只在這些現有元件上新增：
- 4 個 `/codex_*` Telegram commands
- 1 個 SQLite job queue
- 1 個 Codex CLI subprocess wrapper（含 timeout/cancellation）
- 1 個摘要萃取器

**不需要：** 新的 bot token、新的 systemd service、新的 port、新的 process。

---

## 1. 架構

```
Telegram Group (小新作戰室)
    │  /codex_audit --uncommitted 檢查分類規則
    ▼
小馬 Telegram Gateway (既有的 Hermes gateway)
    │
    ├── ACL Middleware（既有）
    │   ├── user_id allowlist ✅
    │   ├── chat_id allowlist ✅
    │   └── topic_id allowlist ✅
    │
    ├── Command Router（新增）
    │   ├── /codex_audit → audit job
    │   ├── /codex_status → job 狀態查詢
    │   ├── /codex_cancel → 取消 job
    │   └── /codex_help → 說明
    │
    ├── Job Queue（新增）
    │   ├── SQLite 持久化
    │   ├── 單一 worker（避免 concurrency 問題）
    │   ├── timeout = 300s（可設定）
    │   └── 支援 cancellation
    │
    ├── Codex CLI Subprocess Wrapper（新增）
    │   ├── codex exec --sandbox read-only --approval never
    │   ├── 預設 model: gpt-5.5（由 config 控制）
    │   ├── working directory: ~/projects/detabase（由 config 控制）
    │   ├── stdout 即時捕獲
    │   └── timeout after 300s
    │
    ├── Report Pipeline（新增）
    │   ├── 小馬從 stdout 萃取摘要
    │   ├── 小馬寫入 specs/reports/codex-audit-{job_id}-{date}.md
    │   └── 小馬回覆 Telegram 摘要
    │
    ├── Audit Log（既有 Hermes auditor）
    │
    └── Rollback（既有 L8 security infrastructure）
```

### 1.1 為什麼不需要獨立 process

這是設計的核心決策。小馬的 gateway 已經是長駐 process。新增 `codex_*` command handlers 是在同一個 process 內擴充功能，不是啟動新服務。這意味著：

- 零新 port
- 零新 process（Codex subprocess 會是新 child process，但生命週期由小馬管理）
- 零新 bot token
- 零新 systemd service
- 零變更到 gateway service unit

### 1.2 與「小馬 relay fallback」的本質差異

| 面向 | 小馬 relay fallback | Xiaoma-Codex Bridge |
|------|-------------------|-------------------|
| 身份 | 小馬 relay Codex 結果 | **小馬 dispatch，Codex 獨立身份回應** |
| 使用者體驗 | 小新對小馬說話 → 小馬 relay | 小新發 `/codex_audit` → 小馬 dispatch → Codex 結果 |
| Job 管理 | 無（同步等待） | Async job queue + job_id |
| 可取消 | 無（只能等） | `/codex_cancel` |
| 並行控制 | 無保護 | 單一 worker + 排隊 |
| Audit trail | 無（小馬 session log） | SQLite job queue + audit_log |
| Report 產出 | 小馬手動 copy | 自動寫入 specs/reports/ |

### 1.3 與 Headcrab/telecodex 的差異

| 面向 | Headcrab fork | Xiaoma-Codex Bridge (自建) |
|------|--------------|--------------------------|
| Process model | 獨立 Rust binary + systemd | 小馬 gateway 內（不新增 service） |
| Bot token | 獨立的 Telegram bot token | **小馬現有 bot token** |
| Telegram library | 自訂 Rust HTTP client | **Hermes gateway 已有** |
| ACL | SQLite user-only（需 patch chat/topic） | **小馬現有三維 ACL** |
| Job queue | SQLite sessions + turns | **小馬可管理的 SQLite queue** |
| File upload | Rust code（需 patch disable） | **不存在（不需實作）** |
| Artifact delivery | Rust code（需 patch disable） | **不存在（不需實作）** |
| Voice transcription | Rust code（需 patch disable） | **不存在（不需實作）** |
| Model switching | Rust command handler | **不存在** |
| Report 寫入 | Codex 直接寫 | **小馬 write_file 寫入** |
| 維護 | 需追蹤上游 Rust 更新 | **無上游依賴** |

---

## 2. Commands

### 2.1 command 定義

所有 command 以 `/codex_` 前綴命名，與小馬現有 command namespace 隔離。

| Command | 權限 | 說明 |
|---------|:----:|------|
| `/codex_audit [--uncommitted] [--base BRANCH] [--commit SHA] [prompt]` | audit | Codex audit - 檢查程式碼（類同 Headcrab `/review`） |
| `/codex_review [--uncommitted] [--base BRANCH] [--commit SHA] [prompt]` | audit | Codex review - 與 audit 相同行爲（保留 `/review` 名稱） |
| `/codex_status [job_id]` | audit | 查詢 job 狀態 / 列出最近 jobs |
| `/codex_cancel <job_id>` | audit | 取消進行中的 job |
| `/codex_help` | audit | 顯示 command 說明 |

### 2.2 `/codex_audit` 用法

```
/codex_audit
  → 預設：--uncommitted（檢查未提交變更）

/codex_audit --base main 檢查有無 regression
  → 指定 base branch + prompt

/codex_audit --commit abc123 專注這筆 commit
  → 指定 commit hash

/codex_audit 檢查 finance_activities schema 有無安全問題
  → 指定 prompt

/codex_audit --base develop 這個版本有無資料不一致
  → base + prompt
```

### 2.3 `/codex_status` 用法

```
/codex_status
  → 列出最近 5 筆 job 的摘要狀態

/codex_status abc123
  → 查詢特定 job 的詳細狀態
```

### 2.4 `/codex_cancel` 用法

```
/codex_cancel abc123
  → 取消 job abc123（僅限 running/queued 狀態）
```

### 2.5 `/codex_help` 用法

```
/codex_help
  → 列出所有 /codex_* commands 及其用法
```

---

## 3. 權限模式

### 3.1 Phase 1A 允許的操作

| 操作 | 說明 | 技術保證 |
|------|------|---------|
| audit | 靜態程式碼審查 | read-only sandbox + approval never |
| review | 同 audit（保留 `/review` 名稱） | read-only sandbox + approval never |
| status | 查詢 job 狀態 | 唯讀 SQLite query |
| cancel | 取消進行中的 job | 發送 SIGTERM 給 Codex subprocess |

### 3.2 Phase 1A 不允許的操作

| 操作 | 被誰阻止 | 技術保證 |
|------|---------|---------|
| implement | **Command router** — 無對應 command | 無實作 |
| edit file | **Codex sandbox** — read-only 阻止 write | Codex CLI sandbox |
| git commit | **Codex sandbox** — read-only 阻止 | Codex CLI sandbox |
| git push | **Codex sandbox** — read-only 阻止 | Codex CLI sandbox |
| destructive shell (rm, dd, etc.) | **Codex sandbox** — read-only 阻止 | Codex CLI sandbox |
| secret read (.env, token, key) | **⚠️ Codex read-only 可讀** | 需 path denylist（見 §6） |
| model switching | **Command router** — 無 `/codex_model` | 無實作 |
| file upload | **Command router** — 無對應 handler | 無實作 |
| artifact download | **Command router** — 無對應 handler | 無實作 |
| voice input | **Command router** — 無對應 handler | 無實作 |

### 3.3 命令白名單路徑

```
使用者發送訊息
    │
    ├── 一般文字 → 由小馬處理（既有行為）
    │
    ├── /codex_* → 進入 Xiaoma-Codex Bridge
    │   ├── ACL 檢查 → 通過 → Job queue → Codex subprocess
    │   └── ACL 檢查 → 拒絕 → audit_log 記錄
    │
    └── 其他 slash command → 由小馬處理（既有行為）
```

---

## 4. 寫入策略

### 4.1 寫入權限分配

```
Codex CLI subprocess
    │
    ├── Sandbox: read-only
    ├── 可以讀：整個 detabase workspace（含 source code、docs）
    ├── 可以讀：.env? → **需 path denylist**
    ├── 可以讀：config files、git history
    └── 不能寫：任何檔案
            │
            ▼
    小馬 Bridge Layer
            │
            ├── 收到 Codex stdout（審查結果）
            ├── 萃取摘要（≤ 3500 chars）→ Telegram
            ├── 完整 stdout → write_file 到 specs/reports/{job_id}.md
            └── 不寫入任何 source code 檔案
```

### 4.2 Report 格式

```
specs/reports/codex-audit-{job_id}-{YYYYMMDD}.md

File 內容：
# Codex Audit: {job_title}

**Job ID**: {job_id} | **日期**: {YYYY-MM-DD HH:mm}
**Requester**: {user_id} | **Chat**: {chat_id} | **Topic**: {topic_id}
**Command**: /codex_audit {args}
**Exit Code**: {exit_code} | **Runtime**: {duration}s

---

{full_stdout}

---

*此報告由 Xiaoma-Codex Bridge 自動產生。原始輸出來自 Codex CLI，sandbox=read-only，無任何 source code 變更。*
```

### 4.3 Telegram 摘要格式

```
📋 Codex Audit #{job_id} ✅ 完成

{summary_text}

📄 完整報告: specs/reports/codex-audit-{job_id}-{YYYYMMDD}.md
⏱ {duration}s | 模型: gpt-5.5 | 📁 detabase
```

摘要必須：
- ≤ 3500 chars（Telegram 限制）
- 不包含 secret、token、API key、完整 SQL
- 只含審查發現與結論

---

## 5. Job Model

### 5.1 SQLite Schema

```sql
CREATE TABLE codex_jobs (
    job_id          TEXT PRIMARY KEY,          -- UUID v7
    requester_user_id INTEGER NOT NULL,
    chat_id         INTEGER NOT NULL,
    topic_id        INTEGER,                   -- NULL for non-topic
    command         TEXT NOT NULL,             -- /codex_audit /codex_review
    args            TEXT,                      -- 完整 arguments
    prompt          TEXT,                      -- 使用者 prompt（如有）
    repo            TEXT NOT NULL DEFAULT 'detabase',
    status          TEXT NOT NULL DEFAULT 'queued',
    -- status: queued → running → completed
    --        queued → cancelled
    --        running → cancelled
    --        running → failed
    created_at      TEXT NOT NULL,             -- RFC 3339
    started_at      TEXT,
    finished_at     TEXT,
    exit_code       INTEGER,
    report_path     TEXT,                      -- specs/reports/ 相對路徑
    summary         TEXT,                      -- Telegram 摘要文字
    error           TEXT,                      -- 錯誤訊息（如有）
    model           TEXT,                      -- 使用的模型
    duration_ms     INTEGER,                   -- 總執行時間
    created_at_unix INTEGER                    -- 用於 TTL cleanup
);
```

### 5.2 Job 生命週期

```
queued → running → completed    （正常結束，exit_code=0）
queued → running → failed       （Codex 錯誤、timeout、sandbox rejection）
queued → cancelled              （尚未開始就被取消）
queued → running → cancelled    （進行中被 SIGTERM）
queued → running → failed       （subprocess crash、OOM、signal）
```

### 5.3 Job 狀態查詢

- `job.status` → queued / running / completed / failed / cancelled
- 查詢方式：`/codex_status <job_id>` 或 `/codex_status`（最近 5 筆）

### 5.4 清理策略

- 完成後保留 30 天
- 超過 30 天的 job 自動 cleanup（cron job）
- Completed jobs 只刪 SQLite 記錄，不刪 report 檔案

---

## 6. Security Model

### 6.1 四維 ACL

| 維度 | 設定方式 | 預設 | 說明 |
|:----:|---------|:----:|------|
| user_id | `CODEX_BRIDGE_ALLOWED_USERS` | `[]` | 小新 Telegram user ID |
| chat_id | `CODEX_BRIDGE_ALLOWED_CHATS` | `[]` | 作戰室群組 chat ID |
| topic_id | `CODEX_BRIDGE_ALLOWED_TOPICS` | `[]` | 特定 topic ID（可選） |
| repo | `CODEX_BRIDGE_REPO` | `detabase` | 唯一允許的 repo 路徑 |

**拒絕行為：** 任一維度不匹配 → Telegram 回覆「❌ 您無權限使用此 bot 功能」+ audit_log 記錄。

### 6.2 Command Allowlist

只允許：
- `/codex_audit`, `/codex_review`, `/codex_status`, `/codex_cancel`, `/codex_help`

任何其他 `/codex_*` 路由 return error。

### 6.3 Path Denylist

當監控 Codex stdout 時，如果 detect 以下 pattern，拒絕輸出並記錄警示：
- `.env`
- `TOKEN`
- `SECRET`
- `API_KEY`
- `PASSWORD`
- `PRIVATE_KEY`
- `-----BEGIN`
- `ghp_` / `gho_` / `github_pat_`（GitHub tokens）
- `sk-`（OpenAI API keys）

**注意：** Path denylist 是 post-hoc 防禦（監控 stdout），不是 prevent defense。Codex read-only sandbox 下**可以讀取** `.env` 等檔案。真正的 prevent 是信任 Codex CLI + 小新的授權。

### 6.4 Limits

| 限制 | 預設值 | 說明 |
|:----|:------:|------|
| Max runtime | 300s | Codex subprocess timeout |
| Max output | 100KB | stdout 截斷上限 |
| Concurrency | 1 | 同時只能跑一個 Codex job |
| Queue depth | 5 | 排隊上限（超過時拒絕） |
| Max report size | 500KB | 報告檔案大小上限 |
| Job TTL | 30 days | 完成後保留天數 |

### 6.5 Codex CLI Flags

```
codex exec \
  --sandbox read-only \
  --approval never \
  --model gpt-5.5 \
  --cwd /home/janzongxin/projects/detabase \
  "{prompt}"
```

確認這些 flag 在 Codex CLI 中的行為：
- `--sandbox read-only` → Codex 只能讀，不能寫
- `--approval never` → 不請求任何操作批准（在 read-only 下，tool calls 被 sandbox 拒絕）
- `--model` → 指定模型（由 config 控制，使用者無法切換）

---

## 7. Negative Tests T1-T15

| # | 測試 | 輸入 | 預期行為 |
|:-:|------|------|---------|
| T1 | 非白名單 user | user_id 不在 ACL，發送 `/codex_audit` | ❌ 拒絕 + audit_log |
| T2 | 錯誤 chat | user_id 正確但 chat_id 不在 ACL | ❌ 拒絕 + audit_log |
| T3 | 錯誤 topic | chat_id 正確但 topic_id 不在 ACL | ❌ 拒絕 + audit_log |
| T4 | 未允許 repo | `/codex_audit` 但 repo 非 detabase | ❌ 拒絕（config 鎖定） |
| T5 | 要求 implement | 任何非 `/codex_*` 路徑 | ❌ 由小馬處理（既有行為） |
| T6 | 要求修改檔案 | 使用者 prompt 包含 "edit file" | ❌ read-only sandbox 阻止 |
| T7 | 要求讀 .env | prompt 包含 "show .env" | ⚠️ Codex read-only 可讀，但 path denylist 監控 stdout |
| T8 | 要求 git commit | prompt 包含 "git commit" | ❌ read-only sandbox 阻止 |
| T9 | 要求 git push | prompt 包含 "git push" | ❌ read-only sandbox 阻止 |
| T10 | destructive shell | prompt 包含 "rm -rf" | ❌ read-only sandbox 阻止 |
| T11 | long-running timeout | 發起 job，讓它跑 > 300s | ❌ timeout → job failed + report |
| T12 | concurrent jobs | 發起 job → 再發起第二個 | ❌ 第二個 job queued |
| T13 | cancel job | 發起 job → `/codex_cancel <job_id>` | ✅ job status = cancelled + SIGTERM |
| T14 | Codex crash | 發起 job，kill Codex subprocess | ❌ job status = failed + error log |
| T15 | report 寫入成功，source code 無變更 | 執行 `/codex_audit` | ✅ report 存在 + `git status` 無變更 |

---

## 8. Integration Points

### 小馬現有元件對照

| 元件 | 角色 | 是否修改 |
|------|------|:--------:|
| **Hermes Telegram Gateway** | 接收 `/codex_*` commands，回覆 Telegram | ✅ 新增 command handlers |
| **ACL Config** (`CODEX_BRIDGE_ALLOWED_*`) | user/chat/topic/repo 白名單 | ✅ 新增 config vars |
| **terminal tool** | spawn `codex exec` subprocess | ✅ 沿用 |
| **SQLite (hermes.db)** | codex_jobs table | ✅ 新增 table |
| **Hermes auditor** | audit_log 記錄 | ✅ 沿用 |
| **cron system** | 排程 cleanup old jobs | ✅ 沿用 |
| **write_file tool** | 寫入 specs/reports/ | ✅ 沿用 |
| **L8 security** | rollback plan | ✅ 沿用 |
| **gpt-5.5 設定** | Codex 模型 | ✅ config |
| **skills** | 包裝 bridge logic | ✅ 可包裝為 skill |
| **Freeze policy** | 審查合規 | ✅ 不違反（無新 service + token） |

### 不需要修改的元件

- Hermes gateway service unit（不新增 service）
- 現有 Telegram bot token（沿用）
- 現有 ACL 架構（沿用 + 新增維度）
- MemPalace（不需修改）
- Search / research pipeline（不需修改）
- ACT-R / self-evolution（不需修改）

---

## 9. Delivery Plan

### Phase 1A.0 — Dry-Run Wrapper（先確認可調用 Codex CLI）

- 實作「小馬內部調用 `codex exec`」的 wrapper
- 確認 sandbox=read-only 行為
- 確認 stdout 格式
- 確認 model 參數
- 預估：小馬現有 terminal tool + 測試

### Phase 1A.1 — Telegram Command Routing（最小可用）

- 在 Hermes gateway 新增 `/codex_audit`, `/codex_review`, `/codex_status`, `/codex_cancel`, `/codex_help`
- ACL middleware（user/chat/topic/repo）
- Telegram 回覆格式
- 預估：~200-400 行

### Phase 1A.2 — Async Job Queue

- SQLite `codex_jobs` table
- job create → queued → running → completed/failed/cancelled
- concurrent queue（單一 worker）
- timeout mechanism（300s）
- cancellation（SIGTERM to subprocess）
- 預估：~200-300 行

### Phase 1A.3 — Report Persistence

- stdout capture + 摘要萃取
- write_file to `specs/reports/codex-audit-{job_id}-{date}.md`
- Telegram 摘要格式
- Path denylist（secret/token scanning）
- 預估：~100-200 行

### Phase 1A.4 — Negative Tests

- T1-T15 自動/手動測試
- 測試結果報告
- 預估：~100 行

### Phase 1A.5 — Codex Audit

- 完整的 Phase 1A 實作交付 Codex audit
- Go/No-Go 判定
- 預估：1-2 小時

### 時間估算

| Phase | 時程 | 程式量 |
|:-----:|:----:|:------:|
| 1A.0 dry-run wrapper | 1-2 小時 | ~50-100 |
| 1A.1 command routing | 2-4 小時 | ~200-400 |
| 1A.2 async job queue | 2-4 小時 | ~200-300 |
| 1A.3 report persistence | 1-2 小時 | ~100-200 |
| 1A.4 negative tests | 1-2 小時 | ~100 |
| 1A.5 Codex audit | 1-2 小時 | 0 |
| **總計** | **~8-16 小時** | **~650-1100** |
| 加上 verification/hardening | +4-8 小時 | +~100 |
| **保守總計** | **~12-24 小時** | **~750-1200** |

---

## 10. Go/No-Go Checklist

實作前必須由小新批准的條件：

- [ ] 1. 同意 Xiaoma-Codex Bridge 是 gateway command routing，不是獨立 service
- [ ] 2. 同意不新增 bot token（用小馬現有 token）
- [ ] 3. 同意不新增 systemd service
- [ ] 4. 同意 Phase 1A 只開放 5 個 commands
- [ ] 5. 同意 Codex sandbox = read-only + approval = never
- [ ] 6. 同意 report 由小馬 write_file，Codex 不直接寫 repo
- [ ] 7. 同意 ACL 四維（user/chat/topic/repo）
- [ ] 8. 同意 path denylist 是 post-hoc 防禦，非 prevent
- [ ] 9. 同意 max runtime = 300s，concurrency = 1
- [ ] 10. 同意 Phase 1A 不開 implement/edit/git/push
- [ ] 11. 同意 rollback plan：移除 command handlers、clean jobs table
- [ ] 12. 同意此設計交 Codex audit 審查

---

## 11. Rollback Plan

### 暫停

```
1. 停用 command routing（註解 handler registration）
2. 等待進行中的 job 完成或 timeout
3. 重啟 gateway
```

### 完整卸載

```
1. 停用 command routing
2. wait 所有 running jobs 完成或 timeout（最多 300s）
3. 備份 codex_jobs table（optional）
4. DROP TABLE codex_jobs
5. 移除 ACL config vars
6. 移除 Phase 1A 所有程式碼
7. 重啟 gateway
8. 驗證：/codex_audit → unknown command（由小馬正常處理）
9. 驗證：specs/reports 下的報告保留（不移除歷史審查）
```

### rollback 時間：< 5 分鐘

---

## 12. 結論

| 項目 | 結果 |
|:----|:-----|
| **是否仍推薦自建** | ✅ 是。60% 元件可沿用，安全模型最乾淨 |
| **是否需要 Codex audit** | ✅ 是 — Phase 1A.5 交 Codex 審查 |
| **是否有任何 blocker** | ⚠️ 需確認 `codex exec --sandbox read-only --approval never` 在當前 Codex CLI 版本的行為 |
| **是否可以進入 implementation planning** | ✅ 可以，在小新批准 Go checklist 後 |
| **保守開發時間** | 12-24 小時 |
| **保守程式量** | 750-1200 行 |
| **是否需要獨立 service** | ❌ 不用 |
| **是否需要獨立 bot token** | ❌ 不用 |
| **freeze 相容** | ✅ 完全相容（無新 service + 無新 token） |

---

**本文件為純設計 spec，不包含任何 implementation code。設計階段完成後方可進入實作。**

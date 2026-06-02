# ADR-DB-AI-01: AI Boundary Definition — Detabase / 小馬 / Codex / OPC 四大邊界

**日期**: 2026-06-06
**狀態**: Draft
**作者**: 戰術架構官（小馬 OPC Team）
**審查需求**: 待稽核官 + Codex bot audit

---

## 背景

Detabase 系統由四層角色構成：

```
小新 (人類/唯一決策者)
  ├── 小馬 (AI 副駕 / 營運官 / 神經系統)
  │     ├── OPC Pipeline (內部團隊 — 5 specialists)
  │     └── Telegram Gateway (Hermes)
  ├── Codex bot (被召喚式工程審查官)
  └── Detabase (Base / 事實資料庫 — Supabase + Next.js)
```

隨著系統成熟，各層之間的互動邊界需要正式定義，以確保：
1. **安全** — 防止權限蔓延、資料外洩、未授權寫入
2. **可稽核** — 每個跨越邊界的操作有記錄
3. **可維運** — 角色責任清楚，不互相越權
4. **防 loop** — AI 層不會無窮遞迴

本 ADR 分析現有部署（六大參照文件：CLAUDE.md、Private War Room Workflow v1、Conversation Protocol v2、Codex Bridge Design v1、OPC Deployment、Codex Bridge Skill）並定義四大邊界。

---

## 邊界 1：Detabase ↔ 小馬

### 現狀

| 面向 | 現有配置 |
|:-----|:---------|
| **讀取** | 小馬透過 Edge Function API（`ai-search-finance-transactions`、`ai-get-user-refs`）讀取 Detabase 資料 |
| **寫入** | 小馬透過 Edge Function API（`ai-log-finance-activity`）寫入 Detabase，需使用者授權 |
| **Schema 變更** | migration / Supabase config 需專屬 issue + 小新批准 |
| **Edge Function 開發** | 同為 issue-first + PR 流程 |

Edge Functions 分兩類：

| Function | Auth | 用途 |
|:---------|:----:|:-----|
| `log-finance-activity` | verify_jwt=true | 前端記帳 |
| `void-finance-activity` | verify_jwt=true | 前端作廢 |
| `set-budget` | verify_jwt=true | 前端預算設定 |
| `ai-search-finance-transactions` | verify_jwt=false, HMAC | 小馬 AI 交易搜尋 |
| `ai-log-finance-activity` | verify_jwt=false, HMAC | 小馬 AI 語音記帳 |
| `ai-get-user-refs` | verify_jwt=false, HMAC | 小馬查詢分類/帳戶對照 |
| `test-env` | verify_jwt=false, HMAC | 環境驗證（不回傳 key 值） |

### 決策

#### D1.1 小馬讀取 Detabase 僅透過 AI-prefix Edge Functions

**規則：**
- 小馬（Hermes agent）讀取 Detabase 資料，**僅限**透過 `ai-*` Edge Functions（`ai-search-finance-transactions`、`ai-get-user-refs`）
- 小馬不得直接查詢 Supabase 表（即使 service_role 有 SELECT GRANT）
- 前端查詢（`ai-` 之外的 Edge Function + direct query via Publishable Key）不受此限制

**理由：**
- Edge Function 是可控的讀取閘道（rate limit、audit log、output shape 可控）
- 直接表查詢跳過 audit trail，且可能回傳敏感資料
- Service_role GRANT 應視為 Edge Function 底層基礎設施，非小馬直接存取通道

**例外：**
- spec 檔案（`specs/` 目錄）直接讀取（檔案系統操作，非資料庫）

#### D1.2 小馬寫入 Detabase 僅透過 Edge Function RPC

**規則：**
- 所有寫入操作必須透過 Edge Function（`ai-log-finance-activity` 或新增 `ai-*` 寫入 function）
- 小馬不使用 direct table INSERT/UPDATE（即使 service_role 有此權限）
- Edge Function 內使用 `service_role` client 執行狹義 RPC

**理由：**
- 單一寫入入口確保業務邏輯一致性（金額正數制、movement_type 驗證、複合 FK 維護）
- 將來新增稽核時只需改一個地方

#### D1.3 Schema / Migration 變更權限

**規則：**
- 任何 `supabase/migrations/` 下的變更，需：
  1. 作戰管制官開立專屬 kanban task
  2. 戰術架構官產出 spec
  3. 工兵官實作 migration
  4. 稽核官審查
  5. 小新批准
- Skip 條件：無（migration 永遠不 bypass）

**理由：**
- database schema 是系統的「唯一真相層」，不可由 AI 任意修改
- 現有 CLAUDE.md 已載明此規則，本 ADR 正式將其 codify 為邊界

---

## 邊界 2：小馬 ↔ Codex bot

### 現狀

| 面向 | 現有配置 |
|:-----|:---------|
| **Codex 角色** | Audit only — read-only sandbox + approval never |
| **觸發方式** | A. 小新在 Telegram group 發 `/codex_audit` |
| | B. 小馬寫 `trigger.json` → Codex bot 的 daemon thread 輪詢 → 執行 → 回寫 `reply.json` |
| **人機互動** | 小新 + 小馬 bot + Codex bot 三者在同一個 Telegram group |
| **寫入能力** | ❌ Codex 不寫檔案、不 git commit/push |
| **報告保存** | Codex bot bridge 寫入 `specs/reports/`，Codex sandbox 不寫 repo |
| **路由決策** | 存在兩套設計：獨立 bot bridge（已部署） vs 小馬內部 bridge（設計階段） |
| **防 bypass** | 小馬不應繞過 pipeline 直接呼叫 Codex（除非小新明確授權） |

### 決策

#### D2.1 兩套 Bridge 共存，用途不同

**規則：**

| Bridge | 部署狀態 | 用途 | 觸發者 |
|:-------|:--------:|:-----|:------|
| **獨立 Codex bot** (`~/.codex-bot/`) | ✅ 已部署 (systemd) | War Room 即時審查（小新看到獨立 bot 身份） | 小新 `/codex_*` 指令 or 小馬 `trigger.json` |
| **小馬內部 Bridge** (design stage) | 📝 設計階段（未實作） | OPC Pipeline 自動化 audit 步驟（稽核官內嵌 Codex 審查） | OPC Coordinator 自動排程 |

**理由：**
- 獨立 bot 提供最高隔離度（獨立 process、獨立記憶體空間、Telegram 可見獨立身份）
- 內部 bridge 適合 pipeline 內的自動化審查（稽核官需要離線調用 Codex 產生審查意見）
- 兩者共用同一底層 Codex CLI binary，不衝突

**⚠️ 安全注意：** 內部 bridge 實作前必須經過完整的 ADR 審查。不得直接將獨立 bot bridge 的 code 複製為內部 bridge。

#### D2.2 小馬不 bypass pipeline 直接呼叫 Codex

**規則：**
- 一般情況：小馬透過 OPC pipeline（設計→實作→審查→研究）執行任務，Codex bot 在審查步驟被調用
- **允許 bypass 的條件（全部需滿足）：**
  1. 任務風險等級為 LOW（由 Coordinator 判斷）
  2. 不涉及 schema/migration/權限變更
  3. 小新未明確要求走 pipeline
  4. 調用結果只做參考，不自動觸發任何 code 變更
- **強制 bypass 的例外：** 小新在 Telegram 中明確說「/{指令}」或「直接問 Codex」

**理由：**
- Pipeline 提供 structure（設計→審查→驗收），減少 AI loop 風險
- 完全禁止 bypass 不現實（小新有時只想快速問一個技術問題）
- 定義 clear gate 讓小馬有規則可循

#### D2.3 獨立 Codex bot Bridge 為 Audit-Only Gateway

**規則：**
- Command allowlist：僅 `/codex_audit`、`/codex_review`、`/codex_status`、`/codex_cancel`、`/codex_help`
- Codex CLI 啟動參數：`--sandbox read-only --approval never`
- 寫入策略：Codex stdout → bridge 萃取摘要 → bridge 寫入 `specs/reports/`
- 無 `/codex_model`、無 file upload/download、無 voice

**理由：**
- 現有 Codex bot bridge 已完整實作此模式
- 這是設計的 boundary invariant：任何新功能必須通過相同的 audit-only gate

---

## 邊界 3：小馬 ↔ OPC Pipeline

### 現狀

OPC（小馬作戰系統）內部團隊由 5 個 specialist profile 組成：

| Profile | 角色 | 擁有 | 不擁有 |
|:--------|:-----|:-----|:-------|
| Coordinator | 作戰管制官 | 路由、分解任務 | 執行任務 |
| Architect | 戰術架構官 | 設計 spec、資料模型 | 寫 code、搜尋 |
| Builder | 工兵官 | 實作程式碼 | 設計架構 |
| Reviewer | 稽核官 | 審查 spec & code | 修改 code |
| Knowledge-Agent | 情報官 | 研究、技術比較 | 設計、實作 |

### 決策

#### D3.1 Coordinator 為唯一 Pipeline 入口

**規則：**
- 所有需要 OPC 團隊協作的任務，由 Coordinator 接收並分解
- Coordinator 不執行任務（不設計、不實作、不審查、不研究）
- Coordinator 決定是否走完整 pipeline 或 bypass

**理由：**
- 角色隔離防止 AI agent 越權（Architect 不會自己實作）
- Coordinator 做為單一入口提供全局視野（知道哪些任務正在進行）

#### D3.2 各 Agent 不 bypass Pipeline

**規則：**

| Profile | 禁止行為 | 例外 |
|:--------|:---------|:-----|
| Architect | 不搜尋外部資訊、不實作 code | 讀取現有 spec/檔案（domain knowledge） |
| Builder | 不設計架構、不研究技術方案 | spec 清楚的小範圍 bug fix |
| Reviewer | 不修改 code、不產生新 spec | 修正格式錯誤（但需在審查意見中標註） |
| Knowledge-Agent | 不設計、不實作、不審查 | — |

**理由：**
- 每個 profile 的 SOUL.md 已明確定義邊界
- 2026-05-31 smoke test 顯示這些邊界在 tool level 無法強制執行（依賴 LLM 遵守），但 ADR codify 後可作為審查依據

#### D3.3 Pipeline Bypass 條件

**規則：**
走完整 pipeline（Coordinator → Architect → Builder → Reviewer → Knowledge-Agent）是預設模式。
以下情況可跳過：

| 情境 | 跳過 | 說明 |
|:-----|:----:|:------|
| 單一檔案小修改（< 5 lines） | Architect + Reviewer | Builder 可直接處理 |
| 緊急 Hotfix（小新在 Telegram 要求） | 全部 | 事後補審查 |
| 僅 spec 變更（無 code） | Builder | Architect → Reviewer |
| 僅研究任務 | Builder + Reviewer | Coordinator → Knowledge-Agent |
| 僅審查任務（Codex audit） | Architect + Builder | Coordinator → Reviewer（調用 Codex） |
| P0/P1 功能 | 不跳過 | 必須完整流程 |

---

## 邊界 4：安全邊界（Security Gates）

### 現狀

安全架構由多層閘門組成，分布在不同層級：

| 層級 | 機制 | 部署位置 |
|:----:|:-----|:---------|
| L0 | 四維 ACL（user_id + chat_id + topic_id + repo） | Codex bot bridge + Hermes gateway |
| L1 | Command allowlist（5 commands） | Codex bot bridge |
| L2 | Intent gate（擋 implement/edit/commit/push/deploy 等關鍵字） | Codex bot bridge |
| L3 | Path denylist（擋 .env/token/secret 輸出） | Codex bot bridge |
| L4 | Output redaction（Telegram + report + log） | Codex bot bridge |
| L5 | Env allowlist（PATH, HOME, LANG 等） | Codex bot subprocess |
| L6 | Trusted-user bypass（小新 + 小馬 bot 跳過 intent/path gate） | Codex bot bridge |
| L7 | Anti-loop（同一 task 最多 2 輪 audit） | Conversation protocol |
| L8 | Rollback plan（移除 handlers + clean jobs） | Deployment |

### 決策

#### D4.1 四維 ACL 為 Fail-Closed

**規則：**
- 所有維度（user_id、chat_id、topic_id、repo）同時檢查
- 任一維度不匹配 → reject + audit log
- 配置缺失（空白 allowlist）→ bridge 不啟動

**理由：**
- 現有 Codex bot bridge 已實作此模式
- 所有新 bridge（如內部 Codex bridge）必須實作相同的四維 ACL

#### D4.2 Intent Gate 信任用戶跳過為正式策略

**規則：**
- 信任用戶（小新 user_id、小馬 bot user_id）跳過 intent gate 和 path denylist
- 此跳過不降級其他安全層（L0 ACL、L4 output redaction、L7 anti-loop 仍生效）
- 信任用戶列表僅含兩個 user_id，任何新增需小新批准

**理由：**
- 中文 audit prompt 天然包含「實作」、「新增」、「修改」等日常詞彙，gate 誤擋率過高
- Codex bot audit 已驗證此策略合理性（見 Codex Bridge Skill §Trusted users bypass）
- Output redaction 是最終安全層，即使信任用戶也不洩漏 secret

#### D4.3 Path Denylist 為 Post-Hoc + Documented Limitation

**規則：**
- Path denylist 監控 Codex stdout，不是阻止 Codex 讀取敏感檔案
- Codex read-only sandbox 下**可以**讀取 `.env`、`token`、`key` 等檔案
- 真正的預防機制：
  1. **信任** Codex CLI 不輸出 secret（`approval=never` 下不執行任何寫入操作）
  2. **Output redaction** 作為保險（Regex scanning stdout → 遮罩/整份 quarantine）
  3. **Env allowlist** 限制子行程環境變數
- 不依賴 path denylist 作為 prevent defense

**理由：**
- 這是設計的已知 Trade-off（在 Codex Bridge Design v1 §6.3 已標註）
- 完全防止 Codex 讀取 secret 需要更嚴格的 sandbox（如 seccomp/Landing Zone），但超出 scope
- WSL 環境下 bwrap sandbox 已有相容性問題，加嚴格 sandbox 會進一步破壞可靠性

#### D4.4 防 Loop 機制正式化

**規則：**
| 規則 | 說明 |
|:-----|:------|
| 同一 task 最多兩輪 audit | audit_round = 1 or 2 |
| Round 2 觸發條件 | 需新 diff、新決策、或小新要求 |
| Round 3 禁止 | 強制交由小新裁決（修 / 接受風險 / 降 scope / 停止） |
| task_id 繞過防護 | `parent_task` 欄位記錄 lineage，新 task 繼承父 task 的已用 round 數 |
| Codex bot 不自動觸發 | 僅回應 command / trigger.json |
| 小馬不重新觸發已完成的 audit | 同一 task 完成 audit 後，需小新授權才能再次 audit |

#### D4.5 強制審查條件閘門

**以下事項必須經過完整審查（Codex audit 或 Reviewer profile）：**

| 類別 | 門檻 | 審查方式 |
|:-----|:-----|:---------|
| Schema / DB 變更 | 任何 migration | OPC pipeline + Codex audit |
| 金流邏輯 | budget / spending limit / 付款 | OPC pipeline + Codex audit |
| 權限變更 | Auth / RLS / GRANT / service role / JWT / ACL | OPC pipeline + Codex audit |
| 多檔案改動 | 5+ source files 或跨兩層（前端+後端+Edge Function+DB） | OPC pipeline + Reviewer |
| P0/P1 功能 | Roadmap P0/P1 | OPC pipeline + Codex audit |
| Production 操作 | deployment / cron / destructive SQL / data backfill | OPC pipeline（設計→審查→小新批准） |
| 小馬不確定 | 任何不明確的決策 | 預設升級為需審查 |

#### D4.6 Output Redaction 策略

**規則：**
Output redaction 應用於**所有四條輸出路徑**：

| 路徑 | 遮罩範圍 | 實作狀態 |
|:-----|:---------|:--------:|
| Telegram 回覆 | secret pattern + 完整 SQL 不顯示 | ✅ 已實作 |
| Report 檔案 (`specs/reports/`) | secret pattern | ✅ 已實作 |
| Audit log | secret pattern + 不記錄原始 prompt/stdout | ✅ 已實作 |
| Error message | secret pattern | ✅ 已實作 |

Redaction pattern（至少）：
- `.env` 內容
- `TOKEN`、`API_KEY`、`SECRET`、`PASSWORD`、`PRIVATE_KEY`
- `ghp_` / `gho_` / `github_pat_`（GitHub tokens）
- `sk-`（OpenAI API keys）
- 私有路徑遮罩（`/home/janzongxin/` → `$HOME`）

---

## 審計：現有 Codex bot 部署邊界

### 部署狀態

| 元件 | 狀態 | 位置 |
|:-----|:----:|:-----|
| Codex bot systemd service | ✅ 已部署 | `~/.config/systemd/user/codex-bot.service` |
| Hardened core (`bot_dryrun.py`) | ✅ 已實作 | `~/.codex-bot/bot_dryrun.py` |
| Telegram handler (`bot_telegram.py`) | ✅ 已實作 | `~/.codex-bot/bot_telegram.py` |
| SQLite job queue | ✅ 已實作 | `~/.codex-bot/codex_bot_jobs.db` |
| trigger.json / reply.json bridge | ✅ 已實作 | `~/.codex-bot/` |
| systemd hardening | ✅ 有（但 Remove `ProtectHome=read-only`、Add `AF_NETLINK`） | unit file |

### 審計發現

#### F1. ⚠️ `danger-full-access` Sandbox（Low Risk）

**位置：** Codex Bridge Skill §Layer 4 — WSL 環境下 bwrap 可能失敗，備案使用 `danger-full-access + approval=never`

**評估：** 低風險但不理想。`approval=never` 確實阻止所有寫入操作，但 `danger-full-access` 容許 Codex 工具存取任何檔案。Codex bot 自身 audit 已建議不要長期使用此模式。

**建議：**
- 標記為「已知技術債務，待 WSL 環境升級後消除」
- 維持現有緩解措施（output redaction + env allowlist + systemd limits）
- 不在非必要時使用 `danger-full-access`

#### F2. ✅ Telegram Bot-to-Bot Isolation

**發現：** Telegram API block bots from seeing other bots' messages. Codex bot bridge 已透過 trigger.json/reply.json 解決此問題。

**評估：** 緩解得當。小馬透過檔案系統橋接（trigger.json → Codex → reply.json），不依賴 Telegram 訊息傳遞。

#### F3. ✅ Output Redaction Coverage

**發現：** Redaction 應用於 summary、DB insert、report、Telegram reply、error、logs — 六條路徑全部覆蓋。

**評估：** 完整。

#### F4. ✅ Anti-Loop Enforcement

**發現：** `parent_task_link` 機制防 task_id 繞過兩輪限制。Codex bot 不自動觸發任何人。

**評估：** 完整。

#### F5. ✅ Env Allowlist

**發現：** `ENV_ALLOWLIST = {"PATH", "HOME", "LANG", "LC_ALL", "USER", "LOGNAME", "TMPDIR"}`。僅這 7 個變數傳入 Codex subprocess。

**評估：** 嚴格。Token 所在的環境變數不會洩漏給 Codex。

#### F6. ❓ Detabase 讀取無 Formal Read Boundary

**發現：** 現有文件（CLAUDE.md、OPC deployment）未明確定義小馬可讀哪些 Detabase 表、不可讀哪些。Edge Function 是實務上的限制，但無 formal rule。

**評估：** 邊界 1 (D1.1) 已解決此問題。本 ADR 通過後需更新 CLAUDE.md 補充此規則。

#### F7. ❓ OPC Pipeline Bypass 無 Formal Rule

**發現：** 現有 OPC workflow 文件提到「簡單任務可直接處理」，但未定義門檻。

**評估：** 邊界 3 (D3.3) 已解決此問題。

---

## 衝擊分析

### 正面影響

| 面向 | 影響 |
|:-----|:------|
| **安全性** | 四維 ACL + fail-closed + output redaction + env allowlist 提供多層防禦 |
| **可稽核性** | 所有邊界跨越操作有記錄（audit log + reply.json + report file） |
| **可維運性** | 角色邊界清楚，新功能開發者可理解「誰該做什麼」 |
| **防 loop** | 兩輪限制 + 小新裁決防 AI 無窮遞迴 |

### 風險

| 風險 | 等級 | 緩解 |
|:-----|:----:|:------|
| `danger-full-access` sandbox 長期使用 | LOW | 標記為技術債務，維持 output redaction |
| Intent gate 信任用戶跳過讓外部攻擊有路徑 | LOW | 信任用戶僅 2 個 user_id；ACL 仍生效 |
| OPC pipeline 角色邊界依賴 LLM 遵守（不可強制） | MED | ADR codify 後可作為審查依據；稽核官應檢查越權行為 |
| 內部 Codex bridge 未實作前 pipeline 審查無自動化 | LOW | 現有的人工審查（Reviewer profile + Codex bot 獨立）已足夠 |

### 替代方案

| 替代方案 | 不選擇的理由 |
|:---------|:-------------|
| 單一 Bridge（只保留獨立 bot） | 失去 pipeline 自動化審查能力 |
| 單一 Bridge（只保留內部） | 失去 War Room 獨立身份可見性 |
| 禁止 Trusted-user bypass | Chinese audit prompt 會頻繁誤擋，實用性下降 |
| 強制 independent Rust binary (Headcrab fork) | 需要 Rust toolchain + go-task 安裝，Python 已滿足需求 |

---

## 相依性

- 無。本 ADR 為分析性文件，不影響既有 migration / schema / code。
- 本文件的審查應依 Conversation Protocol v2 — 先由稽核官審查，再由 Codex bot audit，最後小新批准。

---

## 結論

| 邊界 | 狀態 | 下一步 |
|:-----|:----:|:-------|
| Detabase ↔ 小馬 | 📝 D1.1-D1.3 定義完成 | 更新 CLAUDE.md 補充 formal read boundary |
| 小馬 ↔ Codex | ✅ D2.1-D2.3 定義完成 | 內部 bridge 實作前需新 ADR |
| 小馬 ↔ OPC | 📝 D3.1-D3.3 定義完成 | 稽核官納入審查 checklist |
| 安全邊界 | ✅ D4.1-D4.6 + F1-F7 審計完成 | 追蹤 `danger-full-access` 技術債務 |

**架構結論：** 現有系統的邊界大致完整，但缺少 formal specification。本 ADR 將實際部署的邊界 codify 為正式規則，並補上發現的缺口（read boundary、pipeline bypass conditions）。

---

*本文件由戰術架構官基於六大參照文件分析產出，待稽核官審查 + Codex bot audit + 小新批准。*

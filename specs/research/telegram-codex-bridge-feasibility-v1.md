# Telegram Codex Bridge — 可行性研究 v1

**日期**: 2026-06-06 | **狀態**: 研究完成 | **結論**: ✅ 可行（Phase 1 audit-only）

---

## 0. 研究目標

讓小新、小馬、Codex 在 Telegram 群組中以三人協作模式工作，減少小新人工傳訊負擔。

### 核心約束

| 項目 | 限制 |
|------|------|
| 現有 Hermes bot | 不新增 bot token、不改現有 gateway |
| Codex | 只透過 terminal 調用，不開新 service |
| 安全 | 白名單 repo、禁止 secret 外洩、Telegram 只貼摘要 |
| Phase 1 | 只允許 audit/review，禁止 implement |

---

## 1. 現有基礎設施盤點

### 1.1 Hermes Telegram Gateway

| 項目 | 狀態 |
|------|------|
| Gateway 版本 | 已安裝並運行（systemd Restart=always） |
| Telegram bot | 已連接（單一 bot token，無 reaction） |
| `allowed_chats` | 目前為 `''`（空字串，無限制） |
| 群組支援 | Gateway 可處理 group chat（需 bot 加入群組） |
| 使用者辨識 | 每個 Telegram update 包含 `from.id` + `chat.id` |

**關鍵能力**：Hermes gateway 可以處理來自任意 chat（包括群組）的訊息。現有 config 中 `allowed_chats: ''` 意味著不對來源設限，bot 加入群組後即可接收群組訊息。

### 1.2 使用者辨識

- 小新的 Telegram `user_id` 可從現有 DM session 中取得（已有紀錄）
- 小馬 = Hermes bot（單一 bot token）
- Codex = 目前無獨立 bot 身分

### 1.3 Codex CLI

| 項目 | 版本 / 路徑 |
|------|------------|
| 版本 | 0.135.0 |
| 安裝路徑 | `/home/janzongxin/.npm-global/bin/codex` |
| sandbox 模式 | `read-only`（預設）、`--full-auto`、`--yolo` |
| 調用方式 | `codex exec '<prompt>'` |

**關鍵能力**：Codex CLI 可安全調用（`read-only` sandbox 確保 audit 不會寫入檔案）。輸出可透過 terminal stdout/stderr 捕捉。

### 1.4 現有 Skills

- `codex` skill（autonomous-ai-agents/codex）：已封裝 Codex 調用流程
- `team-collaboration-model`（workflow/）：已定義三層分工鏈
- `codex-audit-workflow`：審計 SOP

### 1.5 Freeze Policy 評估

現有 freeze policy 主要保護：
- 不開新 systemd service
- 不改現有 gateway config
- 不新增 WSL 內獨立 bot

**評估結果**：Telegram Codex Bridge Phase 1 **不違反 freeze policy**。

理由：
- 不開新 service（指令解析發生在現有 Hermes gateway session 內）
- 不改 gateway config（現有 telegram block 不需修改）
- 不開新 bot（使用同一個 Hermes bot）
- 不改 WSL 系統層
- 本質是「指令處理 improvement」，不是新 pipeline

---

## 2. 架構方案

### 2.1 方案比較

| 方案 | 描述 | 優點 | 缺點 | Phase |
|------|------|------|------|-------|
| **A. 單 bot relay** ⭐ | 現有 Hermes bot 入群，我 relay Codex 結果 | 零新 infra、最快上線 | Codex 發言需手動標示 | **Phase 1** |
| B. 雙 bot | 新增第二個 bot token 給 Codex 獨立身分 | 身分明確、可獨立控制 | 需新 token、新 config、違反 freeze policy? | Phase 2 |
| C. Hermes 多 profile | 開 profile 模擬 Codex | 不需新 bot token | 複雜、overhead 高（profile 切換成本） | 不建議 |

**結論：Phase 1 採用方案 A**

### 2.2 方案 A 架構圖

```
Telegram 群組
├ 👤 小新（human）
│   └ 發送指令: /codex_audit <task_id>、/codex_review <path>、/codex_status
│
├ 🤖 小馬（Hermes bot — 現有，唯一 bot token）
│   ├ 監聽群組訊息
│   ├ 驗證 sender == 小新（by user_id）
│   ├ 路由指令：
│   │   ├ /codex_audit   → 調用 Codex CLI（read-only sandbox）
│   │   ├ /codex_review  → 調用 Codex CLI（read-only sandbox）
│   │   └ /codex_status  → 查詢 Codex 狀態
│   ├ 寫入報告 → specs/reports/<task-name>-<ts>.md
│   ├ 產出摘要 → 貼回群組（署名 [Codex]）
│   └ 不支援 /codex_implement（Phase 1 禁止）
│
└ 💻 Codex CLI（本機 terminal tool，無 Telegram 帳號）
    └ 小馬 relay 的方式呈現於群組
```

### 2.3 訊息流

```
小新: /codex_audit P0-4-implement
  ↓
Hermes Telegram gateway receives in group chat
  ↓
小馬 session starts
  ├ 1. 驗證 sender.user_id == 小新
  ├ 2. 驗證 repo whitelist (~/projects/detabase)
  ├ 3. 回覆 "收到，開始 audit..."
  ├ 4. codex exec --full-auto '<prompt>'
  │     (sandbox read-only, 無法寫入)
  ├ 5. 捕捉 stdout/stderr
  ├ 6. 寫 specs/reports/codex-audit-<task>-<ts>.md
  ├ 7. 產出摘要（~5-10 lines）
  └ 8. 貼回群組:
       [Codex] P0-4-implement audit 完成
       ✅ Build passed
       ⚠️ 2 findings
       - P1: stale response (已修復)
       - P2: minor type cast (已修復)
       報告: specs/reports/codex-audit-P0-4-implement.md
```

---

## 3. 指令設計

### 3.1 Phase 1 指令白名單

| 指令 | 參數 | 行為 | 權限 |
|------|------|------|------|
| `/codex_audit` | `<task_id>` | 執行 Codex audit on task | 僅小新 |
| `/codex_review` | `<spec_path>` | Codex reviewer 審查 spec | 僅小新 |
| `/codex_status` | 無 | 查詢 Codex 目前狀態（idle/running/last result） | 僅小新 |
| `/codex_help` | 無 | 列出可用的 codex 指令 | 所有人 |

### 3.2 Phase 1 嚴格禁止

| 指令 | 原因 |
|------|------|
| `/codex_implement` | 寫入權限，Phase 1 不做 |
| `/codex_write` | 直接寫檔，太危險 |
| `/codex_exec <任意>` | 未經 sanitize 的 prompt injection |

### 3.3 指令解析實作方式

指令解析在 **小馬（Hermes agent）** 層級完成，不需要改 gateway config：

1. Telegram gateway 收到群組訊息
2. 小馬 session 啟動
3. 在系統 prompt 或 skill 中定義指令路由：如果訊息以 `/codex_` 開頭，進入指令處理流程
4. 驗證 sender → 解析參數 → 執行 → 回報

---

## 4. 安全規則

### 4.1 白名單

| 規則 | 值 |
|------|-----|
| 允許的 repo | `~/projects/detabase`（Phase 1 僅此一個） |
| 允許的 user | 小新（`user_id` 從現有 DM 取得） |
| 允許的 chat | 群組 chat（需明確設定 `allowed_chats`） |

### 4.2 禁止讀取/回傳的內容

```yaml
# 執行前由小馬 filter，不在 prompt 中要求 Codex 讀取
禁止清單:
  - .env
  - .env.local
  - *.pem
  - *key*
  - *secret*
  - *token*
  - supabase/service_role
  - ~/.hermes/auth.json
  - ~/.codex/auth.json
```

### 4.3 Telegram 輸出限制

| 規則 | 原因 |
|------|------|
| 只貼摘要（≤ 20 lines） | Telegram 訊息長度限制 + 小新疲勞情境 |
| 不貼完整 diff | 避免雜訊 |
| 不貼 secret/key 值 | 安全 |
| 報告路徑需包含 | 小新可自行查看完整版 |
| diff stat 可顯示 | `git diff --stat` 安全摘要 |

### 4.4 報告產出規則

所有 Codex 輸出 → 寫入 `specs/reports/` 目錄

```
specs/reports/
├ codex-audit-P0-4-implement-20260606.md
├ codex-review-spec-xxx-20260606.md
└ codex-status-latest.md
```

### 4.5 Implement 批准門檻

Phase 1 完全禁止 implement。

Phase 2 若開放：
- 必須小新在 Telegram 明確回覆「批准 implement」
- 小馬必須再次確認（「確認要 implement？這會改寫檔案」）
- 執行前自動 `git stash` 保護 dirty worktree
- 執行後自動 `npm run build` 驗證

---

## 5. 失敗處理

| 失敗情境 | 處理方式 |
|---------|---------|
| Codex CLI timeout（> 180s） | 小馬發送「Codex audit 逾時，請稍後再試」，kill process |
| Codex CLI crash | 小馬捕捉 exit code ≠ 0，發送「Codex CLI 異常終止，請檢查 logs」 |
| Telegram 訊息過長 | 自動 truncate 到 20 lines，附完整報告路徑 |
| Report 寫入失敗 | 摘要直接貼群組（不依賴 file write），回報寫入錯誤 |
| Repo 不在白名單 | 拒絕執行，回覆「不在白名單」 |
| 小新以外的人下指令 | 忽略並回覆「無權限」 |

### 5.1 Timeout 處理序列

```
1. terminal(codex exec ..., timeout=180)
2. 若 timeout:
   a. process(kill) — 確保 Codex 不會在背景殘留
   b. 發送 "[Codex] ⚠️ 逾時，已終止。請縮小 scope 後重試。"
3. 若正常完成但 exit_code ≠ 0:
   a. 發送 "[Codex] ⚠️ 異常終止 (exit code {N})"
   b. 貼上 stderr 前 5 行（如有）
```

---

## 6. Freeze Policy 分析

### 6.1 逐項檢查

| Freeze Policy 條款 | 影響 | 備註 |
|-------------------|------|------|
| 不開新 systemd service | ✅ 不影響 | 指令解析在現有 gateway session 內 |
| 不新增 WSL 內獨立 bot | ✅ 不影響 | 使用同一個 Hermes bot |
| 不改 gateway config | ✅ 不影響 | `allowed_chats` 已為空字串（無限制） |
| 不開新 service | ✅ 不影響 | 無新 service |
| 不改系統層 | ✅ 不影響 | 純 agent 層指令處理 |
| 不新增 migration | ✅ 不影響 | 無 schema 變更 |

### 6.2 風險分類

| 風險 | 等級 | 說明 |
|------|------|------|
| 群組 bot 被陌生人加入 | 🟢 低 | `allowed_chats` 可設白名單 group id |
| 指令注入 | 🟡 中 | `/codex_exec <raw>` 禁止；`task_id` 只允許已知白名單 |
| Codex audit 看錯檔案 | 🟢 低 | read-only sandbox，無法寫入 |
| 小新誤發 implement 指令 | 🟢 低 | Phase 1 不實作 implement 指令 |

---

## 7. Phase 1 實作計畫（僅研究，不執行）

### 7.1 前置條件

- [x] Codex CLI v0.135.0 已安裝
- [x] Hermes gateway 運行中
- [ ] 將 Hermes bot 加入三人 Telegram 群組
- [ ] 取得群組 `chat_id`
- [ ] 設定 `telegram.allowed_chats` 為群組 ID

### 7.2 需要建立的檔案

| 檔案 | 用途 |
|------|------|
| `~/.hermes/skills/telegram-codex-bridge/` | 指令解析、安全驗證、輸出格式化 |
| `specs/sop/codex-bridge-audit-sop.md` | 操作 SOP |
| `specs/reports/` | 報告輸出目錄（已存在） |

### 7.3 不做的項目

- ❌ 不改 Hermes gateway config（`allowed_chats` 例外，需設定群組 ID）
- ❌ 不開新 bot / 新 token
- ❌ 不開新 systemd service
- ❌ 不接實作模式

---

## 8. 結論

### ✅ 可行，但需以下限制

**Phase 1（建議本輪實施）：**
1. 將現有 Hermes bot 加入三人 Telegram 群組
2. 設定 `telegram.allowed_chats` 為群組 ID
3. 實現指令路由：`/codex_audit`、`/codex_review`、`/codex_status`
4. 小馬 relay Codex 結果，署名 `[Codex]`
5. 嚴格禁止 implement 模式
6. 所有報告寫入 `specs/reports/`
7. 摘要貼群組，全文放檔案

**Phase 2（未來選項）：**
- 若小新覺得 relay 標示不夠明確，可新增第二個 bot token 給 Codex 獨立身分

### 關鍵決策點（需小新決定）

1. ✅ 是否同意 Phase 1 方案（單 bot relay）— **需你確認**
2. 群組名稱？建議 `小新作戰室` 或 `Detabase Ops`
3. `allowed_chats` 應該只允許該群組，還是保留 DM 同時可用？

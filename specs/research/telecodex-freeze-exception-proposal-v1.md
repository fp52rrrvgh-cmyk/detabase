# Freeze Exception Proposal v1.1: Telegram-Codex Bridge (Telecodex)

**提案日期**: 2026-06-06 | **版本**: v1.1 | **狀態**: 修正版（v1 Codex audit → Reject as written → 已修正 7/7 findings）
**申請人**: 小馬

---

## 0. Executive Summary

本提案請求 freeze exception 以部署 Telecodex — 一個 MIT 開源的 Rust Telegram ↔ Codex CLI bridge。

**v1 → v1.1 關鍵修正：**
- 明確 supersede 舊 Phase 1 relay，改為 Phase 1A Telecodex audit-only
- Layer 歸屬重新分配至 L1/L3/L6/L8，不再模糊歸於 L3+L6
- Sandbox 修正為 workspace-write + 最小寫入限制，解決 read-only vs report 矛盾
- ACL 硬化：allowed_user_ids / allowed_chat_ids / allowed_topic_ids
- 危險功能預設關閉（login/logout/upload/voice/model switch/git/shell）
- 加入完整負面測試計畫
- Rollback 補至 8 步驟完整卸載

**核心主張修正：** Telecodex 不是第十層，它跨越四層既有架構 — L1 Runtime（rust binary + systemd）、L3 Gateway（Telegram ↔ Codex bridge）、L6 Workflow（僅作為 audit 入口）、L8 Governance（ACL + sandbox + rollback）。

---

## 1. Phase 1 Superseded by Phase 1A

### 1.1 為什麼變更

原 v1 提出的「Phase 1」定義為「小馬單 bot relay」，即小新在群組對小馬說話，小馬手動調用 Codex CLI 後 relay 結果。

此模式有根本性限制：
- 小馬沒有獨立 Codex 身份，群組中三方的「獨立對話」無法實現
- 小馬 relay 等於多一層轉述，增加延遲和 token 消耗
- 小新目標是三方群組獨立身份（小新/小馬/Codex），而非小馬轉述

### 1.2 新舊對照

| 項目 | 舊 Phase 1（小馬 relay） | 新 Phase 1A（Telecodex audit-only） |
|------|--------------------------|-------------------------------------|
| 身份 | 小馬 relay | Codex 獨立 bot 身份 |
| 實作方式 | 小馬手動調用 Codex CLI | Telecodex Rust binary + long polling |
| 群組呈現 | 小馬轉述 Codex 結果 | Codex bot 直接回應 |
| 口徑 | 完整 relay | 摘要至 Telegram，報告寫 local |
| 可用性 | 僅小馬在線時 | 獨立於小馬 session |

### 1.3 保留

原 Phase 1 relay 保留為 fallback。當 Telecodex 不可用時（binary crash、systemd down、token 失效），小馬仍可手動 relay Codex audit。

---

## 2. Layer 歸屬修正

Telecodex 不是第十層，也不是單純的 L3/L6 工具。它跨越四層既有架構，每一層的歸屬有明確範圍：

### 2.1 歸屬明細

| 層級 | 名稱 | Telecodex 歸屬範圍 | 不屬於該層的責任 |
|:----:|------|-------------------|------------------|
| **L1** | Hardware / OS / Runtime | Rust binary 編譯與執行、systemd user service 管理 | 不修改 WSL 核心配置、不安裝系統套件 |
| **L3** | Gateway / MCP / Cron | Telegram ↔ Codex CLI 訊息 bridge、long polling | 不取代 Hermes Gateway、不處理 Hermes 訊息路線 |
| **L6** | Skills / Workflow | **僅作為 Codex audit 工作流入口**（觸發 /review） | 不承擔決策、不路由任務、不與 Kanban 整合 |
| **L8** | Governance / Security | ACL 白名單、sandbox 邊界、token 管理、audit log、rollback | 不取代 Hermes L8 層級的 security audit pipeline |

### 2.2 明確排除

以下功能不在 Phase 1A 範圍內：
- ❌ 不建立獨立的記憶系統（L4 不涉及）
- ❌ 不建立評估/進化 pipeline（L7/L9 不涉及）
- ❌ 不與 Kanban 整合（Phase 1A 無此需求）
- ❌ 不取代 Hermes Gateway 的任何功能
- ❌ 不自派工作、不自作決策

### 2.3 對比：什麼才是第十層

如果 Telecodex 被用來：
- 建立全新的 agent 類型（非 Hermes、非 Codex）
- 新增獨立的記憶系統
- 建立獨立的評估/進化 pipeline
- 成為與 Hermes 平行的第二個 agent framework

但 Telecodex Phase 1A 做的事：
- 只是 Codex CLI 的 Telegram frontend
- 依賴 Codex CLI 既有的 sandbox 和認證
- 不建立新記憶系統、不新評估 pipeline、不自我進化
- 歸屬於四層既有架構，不新增層級

**結論：Telecodex 跨層但不算第十層。**

---

## 3. Sandbox 修正：Workspace-Write with Constraints

### 3.1 v1 矛盾說明

v1 聲稱 `default_sandbox = "read-only"` 但又允許 audit report 寫入 `specs/reports/`。此為根本矛盾 — read-only sandbox 下不可能寫任何檔案。

### 3.2 v1.1 修正

| 項目 | v1 設定 | v1.1 修正 |
|------|---------|-----------|
| `default_sandbox` | `read-only` | **`workspace-write`** |
| `default_cwd` | 無 | **`~/projects/detabase`** |
| `default_add_dirs` | 空 | **`["specs/reports/"]`** 或等價最小寫入目錄 |
| 實質行為 | 矛盾（read-only 但需寫報告） | sandbox 允許寫入，但限制寫入範圍 |
| `default_approval` | `on-request` | 維持 `on-request` |
| `default_search_mode` | `disabled` | 維持 `disabled` |
| `import_desktop_history` | `false` | 維持 `false` |
| `import_cli_history` | `false` | 維持 `false` |
| `seed_workspaces` | 僅 detabase | 維持僅 detabase |

### 3.3 寫入限制規則

Telecodex / Codex CLI 在 Phase 1A 的限制：

```
┌────────────────────────────────────────────┐
│         Telegram Bot API                   │
└──────────┬─────────────────────────────────┘
           │ long polling
┌──────────▼─────────────────────────────────┐
│          Telecodex                          │
│  ACL: 白名單 user + chat + topic           │
│  Sandbox: workspace-write                   │
│  default_cwd: ~/projects/detabase           │
│  default_add_dirs: specs/reports/           │
│  Implement: 嚴格禁止                         │
│  危險功能: 全部 disabled                     │
└──────────┬─────────────────────────────────┘
           │ codex CLI
┌──────────▼─────────────────────────────────┐
│         Codex CLI                           │
│  workspace-write sandbox                    │
│  寫入限制:                                  │
│  ✅ specs/reports/*.md — 允許               │
│  ❌ apps/web/src/ — 禁止（source code）      │
│  ❌ supabase/migrations/ — 禁止             │
│  ❌ .env / .env.local — 禁止                │
│  ❌ 任何 config 檔 — 禁止                   │
│  ❌ .git/ — 禁止                            │
└────────────────────────────────────────────┘
```

### 3.4 Config 設定值

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
use_message_drafts = true

[codex]
binary = "codex"
default_cwd = "/home/janzongxin/projects/detabase"
default_model = "gpt-5.5"
default_reasoning_effort = "medium"
default_sandbox = "workspace-write"        # 修正：允許寫入，但有限制
default_approval = "on-request"
default_search_mode = "disabled"
import_desktop_history = false
import_cli_history = false
seed_workspaces = [
  "/home/janzongxin/projects/detabase"
]
default_add_dirs = ["specs/reports/"]       # 最小寫入目錄
```

### 3.5 報告輸出規則

- 完整 audit report → 寫入 `specs/reports/codex-audit-<task>-<date>.md`
- Telegram 只回覆摘要（見 §6 範例）
- 摘要不可包含 secret、token、API key、完整 SQL
- 報告必須為可獨立閱讀的 markdown，含時間戳和任務標識

---

## 4. ACL 硬化

### 4.1 白名單結構

Telecodex ACL 必須明列以下維度，缺一不可：

| 欄位 | 用途 | 範例 | 預設值 |
|------|------|------|--------|
| `allowed_user_ids` | 允許呼叫 bot 的 Telegram user | `[123456789]` | 空（禁止所有） |
| `allowed_chat_ids` | 允許使用 bot 的群組/頻道 | `[-1001234567890]` | 空（禁止所有） |
| `allowed_topic_ids` | 允許使用 bot 的 topic（如群組使用 topic） | `[12345]` | 空（不限制 topic） |
| `startup_admin_ids` | 啟動時預設管理員 | `[小新ID]` | 僅初始化 |

### 4.2 ACL 規則

- `allowed_user_ids`、`allowed_chat_ids` 均為 **白名單** — 不在 list 中的 user/chat 一律拒絕
- 拒絕時回覆：「❌ 您不在允許使用此 bot 的白名單中」並記錄至 audit log
- `startup_admin_ids` 僅用於 **啟動初始化**，不等於永久授權
- 初始化完成後，ACL 應由 config 或 SQLite 資料庫管理，不依賴 bot 自身的 `/allow` / `/deny` 指令
- 後續 ACL 修改：僅限小新透過 config file 或 SQLite 編輯，不允許 bot inline 指令

### 4.3 請求驗證流程

```
收到 Telegram 更新
  │
  ├── user_id 在 allowed_user_ids 中？
  │   └── ❌ → 拒絕 + 記錄
  │
  ├── chat_id 在 allowed_chat_ids 中？
  │   └── ❌ → 拒絕 + 記錄
  │
  ├── 群組使用 topic 且 topic_id 在 allowed_topic_ids 中？
  │   └── ❌ → 拒絕 + 記錄
  │
  └── ✅ → 處理請求
```

---

## 5. 危險功能預設關閉

### 5.1 全面禁用清單

Phase 1A 必須關閉或禁止以下功能，無論 ACL 驗證結果為何：

| 功能 | 禁止方式 | 風險 |
|------|---------|------|
| `/login` | config 關閉或指令攔截 | 避免第三方憑證洩漏 |
| `/logout` | config 關閉或指令攔截 | 避免 session 管理混亂 |
| 檔案上傳（attachments） | config 關閉 | 避免惡意檔案上傳 |
| artifact 下載 | config 關閉 | 避免敏感檔案洩漏 |
| 語音轉文字（voice transcription） | config 關閉 | 避免語音資料外洩 |
| model 切換（`/model`） | config 關閉 | 避免繞過限制使用不安全的 model |
| workspace-write 至非報告目錄 | sandbox + config 雙層禁止 | 避免源碼/環境變數被修改 |
| shell 指令（`codex exec` / raw command） | config 關閉 + sandbox 阻擋 | 避免任意命令執行 |
| `git commit` / `git push` | sandbox 層禁止 | 避免未授權代碼提交 |
| `/allow` / `/deny` / `/role` | config 關閉（ACL 僅 config/SQLite 編輯） | 避免 ACL 繞過 |
| `/restart_bot` | config 關閉 | 避免 DoS 或服務中斷 |

### 5.2 允許清單

| 指令 | 用途 | 安全理由 |
|------|------|---------|
| `/review` | Codex audit/review | 唯讀操作，產出限報告目錄 |
| `/status` | 查詢狀態 | 唯讀 |
| `/sessions` | 列出 session | 唯讀 |
| `/history` | 瀏覽歷史 | 唯讀 |
| `/compact` | 壓縮 context | 唯讀 |
| `/cd` | 切換目錄 | 僅限 detabase |

### 5.3 雙層保護原則

每個禁止功能由至少兩層保護：
1. **Config 層**：Telecodex config 關閉該功能
2. **Sandbox 層**：Codex CLI sandbox 不允許該操作
3. **ACL 層**（如需）：白名單過濾

---

## 6. 負面測試計畫

### 6.1 測試 Cases

| # | 情境 | 輸入 | 預期行為 | 驗證方法 |
|---|------|------|---------|---------|
| T1 | 非白名單 user 呼叫 /review | user_id 不在 allowed_user_ids | ❌ 拒絕，回覆拒絕訊息，記錄 audit log | 檢查回應訊息 |
| T2 | 白名單 user 但錯誤 chat | user_id 正確，chat_id 不在 allowed_chat_ids | ❌ 拒絕，記錄 | 檢查回應 + audit log |
| T3 | 正確 chat 但錯誤 topic | chat_id 正確，topic_id 不在 allowed_topic_ids | ❌ 拒絕，記錄 | 檢查回應 + audit log |
| T4 | 要求 implement / edit file | 發送 "implement feature X" 或 "edit file" 等指令 | ❌ 拒絕，回覆「此 bot 僅支援 audit/review」 | 檢查回應 |
| T5 | 要求讀取 .env / secrets | "read .env" 或 "show token" | ❌ 拒絕或 sandbox 阻擋 | 檢查回應 + 確認無 secret 洩漏 |
| T6 | 要求 git commit / push | "git commit -m 'test'" 或 "push to main" | ❌ 拒絕或 sandbox 阻擋 | 檢查回應 + verify git log 無變更 |
| T7 | 要求 shell command | "/exec rm -rf /" 或其他 raw shell | ❌ 拒絕 | 檢查回應 |
| T8 | audit report 寫入 specs/reports/ 成功 | /review 正常指令 | ✅ 報告寫入正確目錄 | 檢查檔案存在且內容完整 |
| T9 | source code 無變更 | 執行 T8 後 | ✅ source code 無任何修改 | `git status` 確認僅新增 report |
| T10 | Telegram 摘要不含 secret | T8 的摘要訊息 | ✅ 摘要不含 token/key/password | 檢查 Telegram 回覆內容 |

### 6.2 自動化測試方向

- 腳本模擬 Telegram Bot API 請求，測試 ACL 過濾邏輯
- 部署後由小馬手動執行 T1-T10 並回報結果
- 每次 Codex CLI 版本更新後重新驗證 T4-T7

---

## 7. Rollback 補完整

### 7.1 完整卸載（8 步驟）

```bash
# Step 1: Stop service
systemctl --user stop telecodex-bridge.service
# 驗證：systemctl --user status telecodex-bridge.service → inactive (dead)

# Step 2: Disable service（防止開機啟動）
systemctl --user disable telecodex-bridge.service

# Step 3: Revoke Telegram bot token
# 透過 @BotFather 刪除 bot 或用 /revoke 重新產生 token
# 重新產生的 token 可確保舊 token 立即失效

# Step 4: Remove/rotate config secrets
rm -f ~/.telecodex/.env
# 或移動至安全備份：mv ~/.telecodex/.env ~/.telecodex/.env.rollback-$(date +%Y%m%d)
# 如果需要重新部署，token 已在 Step 3 revoke

# Step 5: Cleanup temporary artifacts
rm -rf ~/.telecodex/tmp/
rm -f ~/.telecodex/telecodex.sqlite3

# Step 6: Preserve audit evidence
# 保留 specs/reports/ 下的 audit reports（不移除）
# 可選：打包備份至 ~/.telecodex/backup/rollback-$(date +%Y%m%d)/
mkdir -p ~/.telecodex/backup/rollback-$(date +%Y%m%d)
tar -czf ~/.telecodex/backup/rollback-$(date +%Y%m%d)/audit-evidence.tar.gz \
  -C ~/projects/detabase/specs/reports/ .

# Step 7: Verify process stopped
pgrep -f telecodex  # 應回傳空
# 或：systemctl --user is-active telecodex-bridge.service → inactive

# Step 8: Verify no token remains in repo/log/report
grep -r "TELECODEX_BOT_TOKEN" ~/projects/detabase/ --include="*.md" --include="*.ts" --include="*.tsx"
grep -r "TELECODEX_BOT_TOKEN" ~/.telecodex/  # 僅 .env.rollback 可能有紀錄
```

### 7.2 暫停（非卸載）

```bash
systemctl --user stop telecodex-bridge.service
# 重啟：systemctl --user start telecodex-bridge.service
```

### 7.3 緊急停止

```bash
# 直接停止並停用
systemctl --user stop telecodex-bridge.service
systemctl --user disable telecodex-bridge.service
# 回報小新，評估後再決定是否重新部署
```

---

## 8. 與 Freeze Policy 的相容性

| Freeze Policy 保護 | v1.1 狀態 | 說明 |
|--------------------|:---------:|------|
| 不新增無意義的架構層級 | ✅ | Telecodex 跨 L1/L3/L6/L8，不是第十層 |
| 不在 WSL 內建立獨立的 bot service | ⚠️ 例外 | 理由：Telecodex 僅為 Codex audit 入口，不做系統管理 |
| 不對 freeze 期間的關鍵路徑造成風險 | ✅ | 最小寫入權限、禁止 implement/git/shell |

**為什麼 @Xiaomasystembot 可以、Telecodex 也可以？**
- @Xiaomasystembot 跑在 Windows 層（系統管理）
- Telecodex 跑在 WSL 層（Codex 介面）
- 兩者都是輔助工具，不是 Hermes 架構的一部分
- 兩者都有明確的單一職責
- 兩者都需小新明確批准

**關鍵差異：** Telecodex 不像之前被拒絕的 `xiaoma-system-bot.service`（WSL 內管理 bot），因為：
- Telecodex 不做系統管理
- Telecodex 只做 Codex ↔ Telegram bridge
- Telecodex 有三層保護（ACL + sandbox + config 鎖）

---

## 9. 目錄佈局

```
/home/janzongxin/
├ .telecodex/
│  ├ telecodex.sqlite3           # ACL + session state + audit log
│  ├ telecodex.toml              # 設定檔
│  ├ .env                        # bot token（不 commit）
│  ├ tmp/                        # 暫存檔案
│  └ backup/                     # rollback 備份
└ projects/detabase/
   └ specs/reports/              # Codex audit 產出（唯一寫入目標）
```

---

## 10. 小新批准 Checklist

- [ ] 1. 同意 Telecodex 跨 L1/L3/L6/L8 但不屬於第十層
- [ ] 2. 同意 Phase 1 小馬 relay 被 Phase 1A Telecodex audit-only supersede
- [ ] 3. 同意 sandbox = workspace-write + 最小寫入限制（僅 specs/reports/）
- [ ] 4. 同意 ACL 三維硬化（user + chat + topic）
- [ ] 5. 同意危險功能預設關閉（login/logout/upload/voice/model/shell/git/allow）
- [ ] 6. 同意負面測試計畫（T1-T10）
- [ ] 7. 同意 8 步驟完整 rollback 計畫
- [ ] 8. 同意新增 Telegram bot token（新 bot）
- [ ] 9. 同意新增 systemd service（telecodex-bridge.service）
- [ ] 10. 同意 Telegram 僅回摘要，完整報告寫 specs/reports/
- [ ] 11. 保留小馬 relay 作為 fallback
- [ ] 12. 同意進入實作階段

---

## 11. 結論

| 項目 | 結論 |
|------|:----:|
| v1 audit findings | **7/7 已修正**（sandbox矛盾、Phase 1 定義、layer歸屬、ACL、危險功能、測試、rollback） |
| 是否新增第十層？ | ❌ 不。歸於 L1/L3/L6/L8 現有層級 |
| 是否需要新 bot token？ | ✅ 是。獨立身分必要 |
| 是否需要 systemd service？ | ✅ 是。long polling 必要 |
| 是否違反 freeze policy？ | ⚠️ 部分。已申請 exception |
| 風險等級 | 🟡 中。三層保護（ACL + sandbox + config） |
| 建議 | **批准 Phase 1A**。整改後 proposal 完備 |

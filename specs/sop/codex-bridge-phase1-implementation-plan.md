# Telegram Codex Bridge — Phase 1 Implementation Plan

**日期**: 2026-06-06 | **狀態**: 計畫完成，未實作 | **批准**: 小新 ✅

---

## Phase 1 Scope

| 項目 | 值 |
|------|-----|
| 群組名稱 | 小新作戰室 |
| 方式 | 單 bot relay（現有 Hermes bot） |
| 允許指令 | `/codex_audit`、`/codex_review`、`/codex_status` |
| 嚴格禁止 | `/codex_implement`、寫 code、git commit、secret 外洩 |
| 輸出規則 | Telegram ≤ 20 lines 摘要 + 報告寫入 `specs/reports/` |
| 身分標示 | 小馬 relay，署名 `[Codex]` |

---

## 1. 需要改的檔案

### 1.1 `~/.hermes/config.yaml` — 設定群組白名單

**當前值：**
```yaml
telegram:
  reactions: false
  channel_prompts: {}
  allowed_chats: ''
```

**目標值（預估，chat_id 待實際取得）：**
```yaml
telegram:
  reactions: false
  channel_prompts: {}
  allowed_chats: '<小新DM_chat_id>,<群組_chat_id>'
```

**操作步驟：**
1. 將 Hermes bot 加入「小新作戰室」群組
2. 發送一封測試訊息到群組
3. 從 gateway log 或 Telegram update 中取得群組 `chat_id`
4. 小新 DM `chat_id` 已可從現有 session 取得（確認中）
5. 執行 `hermes config set telegram.allowed_chats '<dm_id>,<group_id>'`
6. 執行 `hermes gateway restart`

**需要的資訊（實作前確認）：**
- `allowed_chats` 格式：推測為逗號分隔的 chat_id 字串（需實作時驗證）
- 群組 chat_id：需把 bot 加入群組後才能取得
- 小新 DM chat_id：可從現有 session/metadata 中取得

**Rollback：**
```bash
hermes config set telegram.allowed_chats ''
hermes gateway restart
```

### 1.2 新增 skill：`telegram-codex-bridge`

**路徑：** `~/.hermes/skills/self-improvement/telegram-codex-bridge/SKILL.md`

**Skill 內容架構：**

```yaml
---
name: telegram-codex-bridge
triggers:
  - 訊息以 /codex_ 開頭
  - Telegram 群組「小新作戰室」的訊息
tags:
  - telegram
  - codex
  - bridge
  - audit-only
---

# Telegram Codex Bridge

## 觸發條件

僅在以下條件成立時啟動：
1. 訊息來自 Telegram platform
2. chat_id 在允許白名單中（小新 DM 或「小新作戰室」）
3. 訊息以 `/codex_` 開頭
4. sender.user_id == 小新的 user_id

## 指令路由

### `/codex_audit <task_id>`
1. 驗證 `<task_id>` 不包含特殊字元（防止 injection）
2. 回覆「收到，開始 audit。請稍候...」
3. 調用 Codex CLI（read-only sandbox）：
   ```
   codex exec --full-auto '<safe audit prompt>'
   ```
4. 捕捉 stdout/stderr
5. 寫入 `specs/reports/codex-audit-<task_id>-<ts>.md`
6. 產出 ≤ 20 lines 摘要
7. 貼回群組，署名 `[Codex]`

### `/codex_review <spec_path>`
1. 驗證 `<spec_path>` 只允許 `specs/` 前綴
2. 同 audit 流程，但 prompt 為 spec review

### `/codex_status`
1. 回覆當前狀態（idle / 上次執行結果摘要）

## 安全檢查（執行前）

```python
# 偽代碼 — 實作時由小馬邏輯檢查
checks = [
    sender.user_id == ALLOWED_USER_ID,
    chat_id in ALLOWED_CHAT_IDS,
    repo_path == "~/projects/detabase",
    task_id 不含 ";"、"|"、"`"、"$"、"\n",
    spec_path 以 "specs/" 開頭（for review）,
    command 在 ["audit", "review", "status"] 中,
]
```

## 輸出格式

```
[Codex] <task> 完成
<狀態 emoji> <單行摘要>
📊 <一行統計>
📄 完整報告: specs/reports/<filename>.md
```

**嚴禁貼出：**
- 完整 diff（只貼 `--stat` 摘要）
- `.env` 內容
- token、key、secret
- 任何超過 20 lines 的程式碼區塊

## 失敗處理

- Timeout → 發送「⚠️ 逾時，已終止」
- Crash → 發送「⚠️ Codex CLI 異常終止」+ exit code
- 非白名單 repo → 拒絕
- 非小新發送 → 忽略
- 單一任務最多重試 1 次

## 禁止

- ❌ `/codex_implement`
- ❌ 任何 git commit
- ❌ 讀取 .env / token / secret
- ❌ 貼長 diff
- ❌ 修改 gateway config
- ❌ 修改 migration / schema
```

**Rollback：**
```bash
rm -rf ~/.hermes/skills/self-improvement/telegram-codex-bridge/
# 或直接用 hermes skills
```

### 1.3 `specs/sop/codex-bridge-audit-sop.md` — 操作 SOP

**純文件，無執行風險。**

**內容要點：**
- 指令使用範例
- 預期回應格式
- 故障排除步驟
- 安全規則 reminder

**Rollback：** 刪除檔案。

### 1.4 SOUL.md（選擇性更新）

| 更新項目 | 原因 |
|---------|------|
| 新增指令白名單 | 讓小馬在每個 session 都記得 bridge 規則 |
| 新增署名規則 | 維持小馬/Codex 身分區分 |
| 新增 Telegram 輸出限制 | 防止 secret 外洩 |

**Rollback：** 回復 SOUL.md。

---

## 2. 風險評估

### 2.1 高優先級風險

| 風險 | 等級 | 情境 | Mitigation |
|------|------|------|------------|
| `allowed_chats` 格式設錯鎖死 gateway | 🔴 | 設了錯誤的格式或值導致 gateway 無法啟動 | **Rollback 路徑明確**：`hermes config set telegram.allowed_chats ''` + `hermes gateway restart`。由 @Xiaomasystembot 執行 |
| 群組 chat_id 未知 | 🟡 | 需要把 bot 加入群組才能取得 | 在群組發測試訊息 → 從 gateway log 讀 chat_id；或直接小新傳 `/codex_status` |
| 指令解析 bug 繞過權限檢查 | 🔴 | 非小新的人觸發 Codex | read-only sandbox 提供第二層防禦；implement 嚴格禁止 |
| Codex CLI resource 競爭 | 🟡 | 同時多個 audit 吃光記憶體 | 一次只允許一個 Codex 任務；`process(action='list')` 檢查 |
| Telegram 輸出 leak secret | 🔴 | Codex 回傳內容含 `.env` 值 | filter 規則（禁止 read `.env`/token/secret）；摘要自動 truncate |

### 2.2 低優先級風險

| 風險 | 等級 | 說明 |
|------|------|------|
| gateway log 記錄 secret | 🟢 | gateway log 可能記錄完整對話；但小新已接受此風險 |
| Codex CLI 版本更新 break | 🟢 | 未來 Codex CLI 更新可能改 sandbox 行為 |
| 群組被惡意加入外人 | 🟢 | `allowed_chats` 過濾可防止；bot 不理非白名單 chat |

### 2.3 Freeze Policy 檢查（複查）

| 條款 | 狀態 |
|------|------|
| 不開新 systemd service | ✅ 純 skill 層，無新 service |
| 不新增 WSL 內獨立 bot | ✅ 使用現有 bot |
| 不改 gateway config（結構性） | ✅ 僅 `allowed_chats` 值變更，key 結構不變 |
| 不開新 service | ✅ |
| 不改系統層 | ✅ |

---

## 3. Rollback Plan

### 3.1 完整 Rollback（回到無 bridge 狀態）

```bash
# Step 1: 清空 allowed_chats
hermes config set telegram.allowed_chats ''
# Step 2: 重啟 gateway
hermes gateway restart
# Step 3: 刪除 bridge skill
rm -rf ~/.hermes/skills/self-improvement/telegram-codex-bridge/
# Step 4: 從群組移除 Hermes bot（選用）
# 在群組中 /kick @<bot_name>
# Step 5: 回復 SOUL.md（如有修改）
git checkout -- ~/.hermes/SOUL.md
```

### 3.2 部分 Rollback（只禁用某個指令）

不需 rollback — 小馬在 session 中拒絕該指令即可。

### 3.3 Gateway 配置文件備份

每次修改 `config.yaml` 前：
```bash
cp ~/.hermes/config.yaml ~/.hermes/config.yaml.bak.codex-bridge
```

---

## 4. 實施順序（Phase 1 執行步驟，僅列順序，不執行）

```
Step 1: 取得群組 chat_id
  - 把 Hermes bot 加入「小新作戰室」
  - 小新在群組發測試訊息
  - 從 gateway log 讀取 chat_id

Step 2: 設定 allowed_chats
  - 確認小新 DM chat_id
  - hermes config set telegram.allowed_chats '<dm_id>,<group_id>'
  - hermes gateway restart

Step 3: 建立 bridge skill
  - 寫 ~/.hermes/skills/self-improvement/telegram-codex-bridge/SKILL.md
  - 包含指令路由、安全檢查、輸出格式

Step 4: 建立 SOP 文件
  - 寫 specs/sop/codex-bridge-audit-sop.md

Step 5: 更新 SOUL.md（選用）

Step 6: 驗證
  - 小新在群組發 /codex_status → 預期回覆 idle
  - 小新在群組發 /codex_audit P0-4-implement-review → 預期跑 audit 並回報
  - 非小新發 /codex_audit → 預期忽略
  - 小新在 DM 發 /codex_status → 預期正常運作（DM 保留）
```

---

## 5. 結論

| 項目 | 狀態 |
|------|------|
| 可行 | ✅ |
| 需改 config | ✅（僅 `allowed_chats` 值） |
| 需建 skill | ✅ |
| 需建 SOP | ✅（純文件） |
| 需開新 service | ❌ |
| 需新 bot token | ❌ |
| 違反 freeze policy | ❌ |
| 小新批准 | ✅（2026-06-06） |

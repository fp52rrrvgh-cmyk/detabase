# Telecodex Phase 0.2 — Real Upstream Capability Audit

**審查日期**: 2026-06-06 | **審查方式**: GitHub source code analysis (read-only)
**上游專案**: [benedict2310/telecodex](https://github.com/benedict2310/telecodex) | **License**: MIT
**審查範圍**: `README.md`, `src/config.ts`, `src/bot.ts` (85KB), `src/codex-session.ts`, `src/session-registry.ts`, `src/attachments.ts`, `src/artifacts.ts`, `src/context-key.ts`, `src/index.ts`, `package.json`, `.env.example`

---

## 0. Executive Summary

**上游基本事實已確認。v1.1 proposal 建立在上游假設錯誤的基礎上。**

| 項目 | v1.1 假設 | 實際上游 | 影響 |
|------|----------|---------|:----:|
| 語言/執行環境 | Rust binary + TOML config | **Node.js 22+ / TypeScript + .env** | 🔴 整個 deployment 模型需重做 |
| 調用 Codex 方式 | Codex CLI subprocess | **@openai/codex-sdk npm package** | 🔴 sandbox 行為不同，非 Codex CLI |
| ACL 維度 | user + chat + topic | **僅 user_id** | 🔴 需 fork/patch 才能滿足 |
| 配置格式 | TOML (telecodex.toml) | **`.env` 環境變數** | 🟡 config 管理方式需改 |
| Session 存儲 | SQLite | **JSON 檔案 (`contexts.json`)** | 🟢 更簡單，但無 ACID |
| Systemd 支援 | 假設有 | **無，需自行撰寫** | 🟢 可自建 |
| audit log | 假設有 | **完全沒有** | 🟡 需 patch 或外包給小馬 |
| Reports 寫入 | 聲稱可限制 | **sandbox 無路徑級別限制** | 🔴 根本問題 |

**結論：Telecodex 仍可能可用於 Phase 1A，但必須 fork/patch 上游或包裝 wrapper。不可直接取用。**

---

## 1. 上游事實表

### 1.1 基本資訊

| 項目 | 值 |
|------|-----|
| Repo URL | https://github.com/benedict2310/telecodex |
| License | MIT |
| Author | Benedict Evert |
| 語言 | TypeScript (Node.js 22+) |
| 建置方式 | `npm install` → `npm run build` (tsc) |
| 開發啟動 | `npm run dev` (tsx hot-reload) |
| 正式啟動 | `npm start` (node dist/index.js) |
| 依賴 | grammy (Telegram bot), @openai/codex-sdk, better-sqlite3 (optional) |
| Codex 整合方式 | **@openai/codex-sdk npm package** — 非 Codex CLI subprocess |
| Config 格式 | `.env` 環境變數 |
| Session 存儲 | `{workspace}/.telecodex/contexts.json` (JSON file) |
| File staging | `{workspace}/.telecodex/inbox/<turnId>/` |
| Artifact outbox | `{workspace}/.telecodex/turns/<turnId>/out/` |
| 內建 daemon | 無 (僅 polling loop，有 restart logic) |
| Docker 支援 | 有 Dockerfile + docker-compose.yml |
| 測試覆蓋 | 15 test files, 180+ tests (vitest) |

### 1.2 架構圖（真實）

```
Telegram ←→ Grammy bot (auto-retry, HTML formatting, inline keyboards)
                │
                ▼
        SessionRegistry ──→ per-context CodexSessionService (contexts.json)
                │
                ├── @openai/codex-sdk ──→ spawns Codex CLI subprocess
                │     └── ThreadEvents (agent text, commands, file changes,
                │                       MCP calls, web searches, todo lists)
                ├── CodexStateReader ──→ ~/.codex/state_*.sqlite (threads)
                ├── CodexAuth ──→ codex login/logout subprocess
                ├── Attachments ──→ {workspace}/.telecodex/inbox/<turnId>/
                ├── Artifacts ──→ {workspace}/.telecodex/turns/<turnId>/out/
                └── VoiceTranscriber ──→ parakeet-coreml / OpenAI Whisper
```

---

## 2. v1.1 錯誤假設清單

| # | v1.1 假設 | 實際 | 嚴重度 |
|---|----------|------|:------:|
| 1 | Rust binary → 單一編譯產物 | Node.js → 需 npm + tsx/tsc runtime | 🔴 |
| 2 | TOML config 設 `allowed_chat_ids` / `allowed_topic_ids` | `.env` 僅 `TELEGRAM_ALLOWED_USER_IDS` | 🔴 |
| 3 | `--add-dir` 可收窄 workspace | SDK 層無 add_dir 概念 | 🔴 |
| 4 | `default_cwd` 可單獨設為 detabase | workspace 固定為 `process.cwd()` | 🟡 |
| 5 | 基於 Codex CLI subprocess 的 sandbox 模式 | 基於 @openai/codex-sdk 的 sandbox | 🟡 |
| 6 | Telecodex 內建 `codex exec` 調用 | 使用 SDK thread.runStreamed() | 🟡 |
| 7 | SQLite session store | JSON file (`contexts.json`) | 🟢 |
| 8 | 內建 `audit log` | 完全無 audit log 機制 | 🟡 |
| 9 | `default_add_dirs` 參數 | 不存在此設定 | 🔴 |
| 10 | `startup_admin_ids` 參數 | 不存在此設定 | 🟡 |

---

## 3. 真實功能矩陣

### 3.1 安全能力逐項確認

| 安全能力 | 上游狀態 | 實作方式 / 限制 | 分類 |
|---------|---------|----------------|:----:|
| **allowed_user_ids** | ✅ 已支援 | `TELEGRAM_ALLOWED_USER_IDS` comma-separated in `.env` | 已支援 |
| **allowed_chat_ids** | ❌ 不支援 | 僅用於 context key 分 session，無 allowlist | 需 patch |
| **allowed_topic_ids** | ❌ 不支援 | 同上，context key 含 topic 但無 allowlist | 需 patch |
| **sandbox mode** | ✅ 已支援 | `CODEX_SANDBOX_MODE` → `read-only` / `workspace-write` / `danger-full-access` | 已支援 |
| **working directory** | ⚠️ 可設定 | 固定為 `process.cwd()` 或 Docker `/workspace`，無 config 變數 | 可設定 |
| **writable path restriction** | ❌ 不支援 | sandbox 無 path-level restriction | 需 patch |
| **禁止 source code write** | ⚠️ 可設定 | 設 `read-only` sandbox 即可，但 report 也無法寫入 | 可設定（有 tradeoff）|
| **禁止 git commit / push** | ❌ 不支援 | sandbox 不攔 git operations | 需 patch |
| **禁止讀 .env / secrets** | ❌ 不支援 | 環境變數複製到 Codex env | 需 patch |
| **禁止 shell command** | ❌ 不支援 | Codex SDK 預設可執行 shell | 需 patch |
| **關閉 login/logout** | ✅ 可設定 | `ENABLE_TELEGRAM_LOGIN=false` | 可設定 |
| **關閉 file upload / ingest** | ❌ 不支援 | 無對應 config flag | 需 patch |
| **關閉 artifact delivery** | ❌ 不支援 | artifact delivery 在 bot.ts 固定實作 | 需 patch |
| **關閉 voice transcription** | ⚠️ 可設定 | 不安裝 parakeet-coreml + 不設 OPENAI_API_KEY = 自然關閉 | 可設定 |
| **關閉 model switching** | ❌ 不支援 | `/model` command 在 bot.ts 固定實作 | 需 patch |
| **關閉 effort switching** | ❌ 不支援 | `/effort` command 固定實作 | 需 patch |
| **關閉 launch profiles** | ❌ 不支援 | `/launch_profiles` 固定實作 | 需 patch |
| **關閉 sessions browsing** | ❌ 不支援 | `/sessions` / `switch` 固定實作 | 需 patch |
| **關閉 handback** | ❌ 不支援 | `/handback` 固定實作 | 需 patch |
| **關閉 attach** | ❌ 不支援 | `/attach` 固定實作 | 需 patch |
| **report-only output** | ❌ 不支援 | Telecodex 預設是完整互動式 Codex，非 report-only | 需 patch |
| **Telegram summary length limit** | ⚠️ 可設定 | 內建 TELEGRAM_MESSAGE_LIMIT=4000，但摘要形式無法強制 | 可設定 |
| **audit log / evidence log** | ❌ 不支援 | 完全無 audit log 機制 | 需 patch |
| **photo input** | ❌ 不支援關閉 | 無對應 config flag | 需 patch |

### 3.2 分類統計

| 分類 | 數量 | 項目 |
|:----:|:----:|------|
| ✅ 已支援 | 3 | allowed_user_ids, sandbox mode, working directory |
| ⚠️ 可設定 | 5 | 禁止 source code write (read-only tradeoff), 關閉 login/logout, 關閉 voice, working directory, Telegram length limit |
| ❌ 不支援 | 8 | allowed_chat_ids, allowed_topic_ids, writable path restriction, 禁止讀 secrets, 關閉 file upload, 關閉 artifact, 關閉 model/effort/launch/sessions/handback/attach, audit log |
| 🔴 需 patch | 13 | 上述 ❌ 全部 + 禁止 git/shell + report-only mode |

**關鍵 Insight：** 要滿足 Phase 1A 的安全需求，至少需要 **patch 13 項功能**。沒有現成的 config 可用。

---

## 4. 風險評估

### 4.1 風險矩陣（真實上游）

| 風險 | 等級 | 情境 | 真實 Mitigation | 
|------|:----:|------|----------------|
| Codex 透過 sandbox write source code | **🔴 HIGH** | `workspace-write` sandbox 下 Codex 可改任何 workspace 內檔案 | 無路徑級別限制 |
| 非白名單 chat 存取 bot | **🔴 HIGH** | user_id 正確但 chat_id 錯誤 | 無 chat/topic ACL |
| 非 audit 功能被濫用 | **🔴 HIGH** | `/model` / `/effort` / `/launch_profiles` / handback 無法關閉 | 需 patch bot.ts |
| File upload 引入惡意檔案 | **🟡 MED** | file 可被 stage 到 workspace 並給 Codex 使用 | 有 sanitize + size limit |
| Artifact delivery 洩漏檔案 | **🟡 MED** | Codex 寫檔案到 outbox 後自動送到 Telegram | 無 disable config |
| 環境變數外洩給 Codex | **🟡 MED** | `buildCodexEnv` 複製整個 `process.env` 給 Codex SDK | 無過濾機制 |
| Session persistence 資料外洩 | **🟢 LOW** | `contexts.json` 含 thread ID 和 config | 僅本地存取 |
| Telecodex crash | **🟢 LOW** | polling restart logic (5 attempts) + systemd Restart=always | 需要自建 |

### 4.2 風險對照 v1.1

v1.1 評估為 🟡 中風險（三層保護）。**真實上游評估為 🔴 高風險**，因為：
- 三層保護中 ACL 只剩 user_id 一維
- Sandbox 無法限制寫入範圍
- 危險功能無法關閉

---

## 5. 可行架構選項

### 選項 A: Isolated Clone / Throwaway Workspace

**概念：** Telecodex 操作 detabase 的唯讀 mirror 或 temp clone。audit report 由小馬搬運到 `specs/reports/`。

**優點：**
- Source code 安全：mirror 修改不影響原始 repo
- 不需要 fork/patch Telecodex
- 可利用 git clone --depth 1 快速建立

**缺點：**
- 小馬需要額外搬運報告（增加一步）
- Temp clone 會消耗硬碟空間
- Telecodex workspace 設為 mirror 目錄，但 sandbox 仍為 workspace-write
- Codex 無法讀取原始 repo 的完整 context（可能影響 audit 品質）

**可行性：** 🟡 中等。需要 wrapper script 管理 clone lifecycle。

---

### 選項 B: OS-Level Sandbox (mount namespace / bind mount)

**概念：** 使用 Linux mount namespace 或 bind mount 讓 Telecodex/Codex 看見唯讀的 detabase 原始碼目錄，只有 `specs/reports/` 可寫。

**實作方式：**
```bash
# 建立 bind mount：detabase source read-only
mkdir -p /tmp/telecodex-workspace
cp -r ~/projects/detabase /tmp/telecodex-workspace/

# 或使用 overlay：source read-only + reports writable
mkdir -p /tmp/telecodex/{upper,work,merged}
sudo mount -t overlay overlay \
  -o lowerdir=~/projects/detabase,upperdir=/tmp/telecodex/upper,workdir=/tmp/telecodex/work \
  /tmp/telecodex/merged

# Telecodex workspace = /tmp/telecodex/merged
# 原始 detabase 不受影響
```

**優點：**
- 不需要 fork/patch Telecodex
- 隔離徹底
- Codex 仍可讀取完整 detabase 內容

**缺點：**
- 需要 root/sudo 權限（mount 操作）
- 需要 wrapper script 管理 lifecycle
- 複雜度高
- WSL overlay/namespace 支援有限

**可行性：** 🔴 低。WSL 環境下 overlay mount 和 user namespace 支援不穩定。需要 sudo，與最小權限原則衝突。

---

### 選項 C: Fork / Patch Telecodex

**概念：** Fork upstream，加入 Phase 1A 所需的所有安全控制。

**需要的 patches：**
| Patch | 變更範圍 | 難度 |
|-------|---------|:----:|
| chat/topic ACL | `src/config.ts` + `src/bot.ts` (ACL middleware) | 低 |
| report-only mode | `src/bot.ts` (新的 launch profile) | 低 |
| 關閉 file upload | `src/bot.ts` (移除或跳過 handler) | 低 |
| 關閉 artifact delivery | `src/bot.ts` + `src/artifacts.ts` | 低 |
| 關閉 model/effort/launch/handback/attach | `src/bot.ts` (移除或跳過 command handler) | 低 |
| 禁止 git/shell | 需仰賴 Codex SDK 或 sandbox，較難 | 高 |
| audit log | 新檔案 `src/audit-log.ts` + config | 中 |
| env 過濾 | `src/codex-session.ts` (buildCodexEnv) | 低 |
| workspace 限制 | 依賴 Codex SDK 能力，無法從 Telecodex 層完全控制 | 高 |

**優點：**
- 完全控制安全行為
- 可精確實現 Phase 1A 需求
- 可向上游貢獻（選擇性）
- 不需要 root 權限

**缺點：**
- 需要維護 fork
- 若上游更新，需 rebase
- 無法完全禁止 git/shell（依賴 Codex SDK 層）

**可行性：** 🟡 中等。大部分 patch 為低難度（跳過 handler），但 git/shell 限制需依賴 sandbox。

---

### 選項 D: 放棄 Telecodex，回到小馬 Relay Fallback

**概念：** 不使用 Telecodex。小新發送指令 → 小馬 relay 給 Codex → 小馬 relay 結果回來。

**優點：**
- 零新攻擊面
- 零新依賴
- 零維護成本
- 小馬已有完整的 ACL、sandbox 控制

**缺點：**
- 無獨立 Codex 身份
- 小新和小馬必須同時在線
- 小馬 relay 增加延遲和 token 消耗
- 無法實現「三方群組獨立對話」的原始目標

**可行性：** ✅ 高。已存在且可立即使用。

---

## 6. 負面測試（Enforcement 級）

### T1: 非白名單 user → reject

| 項目 | 值 |
|------|-----|
| 測試輸入 | user_id 不在 `TELEGRAM_ALLOWED_USER_IDS`，發送 `/review` |
| 預期行為 | ❌ 拒絕，回應 "Unauthorized" |
| 驗證方法 | 檢查 Telegram 回應訊息 = "Unauthorized" |
| 測試層級 | 接受 Telecodex 原始行為 ✅ |

### T2: 白名單 user + 錯誤 chat → reject

| 項目 | 值 |
|------|-----|
| 測試輸入 | user_id 在白名單，但 chat_id 不在 allowed_chat_ids |
| 預期行為 | ❌ 拒絕 |
| 驗證方法 | 檢查回應 |
| 測試層級 | **需 patch** ❌ 上游不支援 chat allowlist |

### T3: 正確 chat + 錯誤 topic → reject

| 項目 | 值 |
|------|-----|
| 測試輸入 | chat_id 正確，topic_id 不在 allowed_topic_ids |
| 預期行為 | ❌ 拒絕 |
| 驗證方法 | 檢查回應 |
| 測試層級 | **需 patch** ❌ 上游不支援 topic allowlist |

### T4: 要求 implement → reject

| 項目 | 值 |
|------|-----|
| 測試輸入 | 發送 "implement feature X" |
| 預期行為 | ❌ 拒絕或 sandbox 阻擋 |
| 驗證方法 | 若 `read-only` sandbox → Codex 無法寫檔案，但會回報錯誤而非拒絕 |
| 測試層級 | ⚠️ 有條件的：read-only sandbox 下 Codex 會嘗試然後失敗 |

### T5: 要求修改 source code → reject

| 項目 | 值 |
|------|-----|
| 測試輸入 | "edit apps/web/src/page.tsx" |
| 預期行為 | ❌ 拒絕 |
| 驗證方法 | `read-only` sandbox 下 Codex 會報 file write error |
| 測試層級 | ⚠️ 有條件的 |

### T6: 要求讀 .env → reject

| 項目 | 值 |
|------|-----|
| 測試輸入 | "show .env" 或 "read .env.local" |
| 預期行為 | ❌ 拒絕 |
| 驗證方法 | `read-only` sandbox 可讀取，需 patch Codex env 過濾 |
| 測試層級 | **需 patch** ❌ 上游 `buildCodexEnv()` 複製整個 `process.env` |

### T7: 要求 git commit/push → reject

| 項目 | 值 |
|------|-----|
| 測試輸入 | "git commit -m test" |
| 預期行為 | ❌ 拒絕或 sandbox 阻擋 |
| 驗證方法 | sandbox 不攔 git |
| 測試層級 | **需仰賴 Codex SDK** ❌ |

### T8: File upload 不被 ingest

| 項目 | 值 |
|------|-----|
| 測試輸入 | 上傳檔案到 Telegram |
| 預期行為 | ❌ 拒絕或忽略 |
| 驗證方法 | 檢查 Telegram 回應 |
| 測試層級 | **需 patch** ❌ 上游固定處理 `message:document` |

### T9: Artifact 不外送

| 項目 | 值 |
|------|-----|
| 測試輸入 | Codex 產生檔案，但 Telecodex 不送 |
| 預期行為 | ✅ 檔案不會送到 Telegram |
| 驗證方法 | 檢查 Telegram 無 document 訊息 |
| 測試層級 | **需 patch** ❌ `deliverArtifacts()` 在 bot.ts 固定實作 |

### T10: Audit report 可產出，source code 無變更

| 項目 | 值 |
|------|-----|
| 測試輸入 | /review audit |
| 預期行為 | ✅ report 產出於 specs/reports/ + `git status` 無其他變更 |
| 驗證方法 | 檢查 report 檔案存在 + `git diff --stat` 顯示只新增 report |
| 測試層級 | ⚠️ 需 `read-only` sandbox，但 report 也無法寫入 |

**Test Coverage Summary：**

| 測試 | 上游原生 | 需 patch |
|:----:|:--------:|:--------:|
| T1 | ✅ | — |
| T2 | ❌ | chat ACL |
| T3 | ❌ | topic ACL |
| T4 | ⚠️ | report-only mode |
| T5 | ⚠️ | workspace restriction |
| T6 | ❌ | env filter |
| T7 | ❌ | sandbox layer |
| T8 | ❌ | disable file ingest |
| T9 | ❌ | disable artifact delivery |
| T10 | ❌ | 矛盾：read-only 無法寫 report |

---

## 7. 推薦方案

### 7.1 方案比較

| 維度 | A: Isolated Clone | B: OS Sandbox | C: Fork/Patch | D: Abandon |
|:----:|:-----------------:|:-------------:|:-------------:|:----------:|
| 開發成本 | 中（wrapper） | 高（mount/namespace） | 中（fork patch） | 零 |
| 維護成本 | 中 | 高 | 中 | 零 |
| 安全等級 | 🟡 中 | 🟢 高 | 🟡 中 | 🟢 高 |
| 上游依賴 | 無 | 無 | 需追蹤上游 | 無 |
| 獨立 Codex 身份 | ✅ | ✅ | ✅ | ❌ |
| Group 三方對話 | ✅ | ✅ | ✅ | ❌ |
| WSL 相容性 | ✅ | ❌ 不穩定 | ✅ | ✅ |
| Root 需求 | ❌ | ✅ 需要 sudo | ❌ | ❌ |

### 7.2 最終建議

**推薦：選項 C (Fork/Patch) — 但有條件。**

**理由：**
- Telecodex 本身就是正確的工具 — 它提供獨立 Codex 身份、三方群組對話、streaming response
- 上游架構乾淨（TypeScript, 180+ tests），patch 難度低
- 大部分安全控制只需「跳過 handler」或「新增 middleware」
- 不需要 sudo 或 mount namespace
- 不需要維護 temp clone

**但必須接受以下限制：**
1. **無法從 Telecodex 層完全禁止 git/shell** — 依賴 sandbox 層（read-only）
2. **無法從 Telecodex 層完全禁止 Codex 讀取 env** — 需 patch `buildCodexEnv()`
3. **如果選 read-only sandbox，report 也不能寫** — 需小馬搬運或選 workspace-write + post-audit git 驗證

### 7.3 是否仍建議使用 Telecodex

**✅ 是，但需 fork/patch後才能用於 Phase 1A。**

不使用 Telecodex 則無法實現小新的原始目標（三方群組獨立身份、Codex bot 直接回應）。

### 7.4 是否需要 fork / patch

**✅ 需要 fork。**

最低 patch list：
1. `src/bot.ts`：新增 ACL middleware（chat_id + topic_id）
2. `src/bot.ts`：跳過 file upload / photo / voice handler（或 config flag）
3. `src/bot.ts`：跳過 artifact delivery（或 config flag）
4. `src/bot.ts`：跳過 model/effort/launch/handback/attach command handler
5. `src/codex-session.ts`：過濾 `buildCodexEnv` 不傳送敏感 env
6. `src/config.ts`：新增 `ENABLE_FILE_UPLOAD`, `ENABLE_ARTIFACT_DELIVERY` 等 flags
7. 新檔案 `src/audit-log.ts`：紀錄所有指令和拒絕事件
8. `src/bot.ts`：新增 report-only launch profile 強制模式

### 7.5 是否仍符合 freeze exception

**✅ 是**（但需在 fork 上實作，非直接使用上游）。

Telecodex 仍歸屬於 L1/L3/L6/L8 跨層架構：
- L1: Node.js runtime + systemd service（自建）
- L3: Telegram ↔ Codex bridge
- L6: 僅作為 Codex audit 入口
- L8: 需 patch 實現 ACL + audit log

---

## 8. 是否建議再次交給 Codex audit

**✅ 是。** 建議 fork 後、實作 patch 前，將此 audit 報告交 Codex 再次審查，確認：
1. Patch list 是否足夠達成 Phase 1A
2. 無法從 Telecodex 層控制的風險（git/shell/env）是否可接受
3. 是否建議改採 read-only sandbox + 小馬搬運報告（犧牲自動化換取安全）

---

## 9. 結論

### 摘要

| 項目 | 結論 |
|------|:----:|
| 真實上游 | **benedict2310/telecodex** — Node.js/TypeScript, MIT, @openai/codex-sdk |
| 是否仍可用 | ✅ 是，但需 fork/patch |
| 是否可不 fork | ❌ 否。上游無 chat/topic ACL、危險功能關閉、audit log |
| 是否能做到 Phase 1A audit-only | ⚠️ 有條件：patch 8 項 + read-only sandbox（需小馬搬 report）或 workspace-write（需 git 驗證） |
| 最大 blocker | **Sandbox 無法限制寫入範圍到 specs/reports/** |
| 推薦方案 | **選項 C: Fork/Patch** — 最低 patch 8 項 |
| 是否建議再次 Codex audit | ✅ 是，patch 後再次審查 |

### v1.1 錯誤假設總結

v1.1 建立在「Telecodex 是 Rust binary + TOML config + 可精確控制 sandbox」的假設上。實際上游是 Node.js + .env + 有限 sandbox 控制。**v1.1 不是修補就能過的，需要 fork/patch 才能接近 Phase 1A 的安全要求。**

### 下一步建議

1. 小新批准方向：**fork/patch Telecodex**
2. 建立 private fork on GitHub
3. 實作 patch list（8 項）
4. Codex audit 再次審查 patch 後的 fork
5. 如 Go → 小新批准實作
6. 如仍 No-Go → 選項 D（小馬 relay fallback）的最終決定

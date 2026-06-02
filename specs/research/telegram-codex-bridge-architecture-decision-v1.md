# Telegram-Codex Bridge Phase 0.5 — Architecture Decision

**審查日期**: 2026-06-06 | **版本**: v1 | **狀態**: 待決策
**參考**: Phase 0.2 (real upstream audit), Phase 0.3 (candidate comparison), Phase 0.4 (Headcrab deep audit)

---

## 0. Executive Summary

經過四輪研究（Phase 0.1-0.4），我們對所有可行方案有了完整的理解。Phase 0.5 不做新研究，而是做架構決策。

**決策選擇：**

| 路線 | 概念 | 核心成本 |
|:----:|------|:--------:|
| **A. Fork/Patch Headcrab** | 取上游 Rust bridge，patch 7 項安全控制 | 150-250 行 Rust 修改 + 維護 fork |
| **B. 自建 Xiaoma-Codex Bridge** | 從零建最小 bridge，僅 Phase 1A 需要的功能 | ~800-1200 行程式 + 基礎設施 |
| **C. 小馬 relay fallback** | 不新增 bot/service，小馬手動轉發 | 零開發，但無三方體驗 |

---

## 1. 路線 A: Fork/Patch Headcrab/telecodex

### 1.1 需要 patch 哪些 Rust 檔案

| # | 檔案 | Patch 內容 | 約略行數 |
|:-:|------|-----------|:--------:|
| 1 | `src/config.rs` | 加 `allowed_chat_ids`, `allowed_topic_ids`, `lock_sandbox`, `lock_approval`, `disable_file_upload`, `disable_artifact`, `disable_voice`, `disable_model`, `disable_login`, `review_only` 等 config fields | 30-50 |
| 2 | `src/app.rs` | ACL 入口過濾：檢查 chat_id + thread_id 是否在白名單 | 20-30 |
| 3 | `src/commands.rs` | review_only 模式只允許 `/review` 和 `/status`；lock_sandbox/lock_approval 忽略對應 command | 30-40 |
| 4 | `src/app/io.rs` | 跳過 attachment 處理當 `disable_file_upload` | 5-10 |
| 5 | `src/app/turns.rs` | 跳過 `send_generated_artifacts()` 當 `disable_artifact`；跳過 `enrich_audio_transcripts()` 當 `disable_voice` | 10-20 |
| 6 | `src/app.rs` (commands handler) | 跳過 `/model` `/think` `/fast` `/login` `/logout` handler 當 disable flags | 20-30 |
| 7 | `telecodex.toml.example` | 更新範例 | 5-10 |
| **總計** | | | **~120-190** |

### 1.2 是否能保留上游更新能力

**⚠️ 有限。** Fork 後上游更新時：
- config.rs 的新欄位 → 容易合併（git merge 會自動處理）
- app.rs/commands.rs/turns.rs 的安全邏輯 → **可能衝突**，因為這些是核心流程
- **策略：** 只 fork private repo，不期望上游 merge 回安全 patch（這些是專為 Phase 1A 設計的限制，不通用）

### 1.3 會繼承哪些不需要的功能

Fork 會繼承整個 Headcrab codebase（約 50+ Rust 源檔），其中 Phase 1A 不需要的：

| 不需要的功能 | 風險 | 是否能關閉 |
|-------------|:----:|:---------:|
| File upload | 🟡 多餘攻擊面 | ✅ patch disable |
| Artifact delivery | 🟡 多餘攻擊面 | ✅ patch disable |
| Voice transcription | 🟢 低（依賴外部 model） | ✅ patch disable |
| Audio/video attachment handling | 🟢 低 | ✅ patch disable |
| Codex device login/logout | 🟡 可洩漏憑證 | ✅ patch disable |
| Model switching | 🟢 低 | ✅ patch disable |
| Forum topic auto-creation | 🟢 低 | config false |
| Stale topic cleanup | 🟢 低 | config none |
| Desktop/CLI history import | 🟢 低 | config false |
| `/new` `/topic` `/use` `/sessions` | 🟢 review-only 下無意義 | review-only 限制 |
| `/allow` `/deny` `/role` (ACL admin) | 🟢 admin 功能 | review-only 限制 |
| `/environments` `/history` `/copy` `/clear` | 🟢 指令 | review-only 限制 |

### 1.4 安全模型是否能完全 lockdown

**✅ 可以，但有前提：** 所有 7 項 patch 都實作後，安全模型為：

```
1. ACL 層：user_id + chat_id + topic_id 三維過濾
2. Config 層：lock_sandbox + lock_approval 防止運行中切換
3. Codex 層：read-only sandbox + approval never 防止寫入
4. Bridge 層：disable_file_upload/artifact/voice 關閉多餘功能
5. Command 層：review-only 只允許 /review
```

**但有一個灰色地帶無法 patch：** read-only sandbox 下 Codex CLI 仍然可以**讀取** `.env` 和其他檔案。Telecodex 無法阻止 Codex CLI 讀取 workspace 內任何檔案（這是 read-only 的本質）。

### 1.5 維護成本

| 項目 | 評估 |
|------|:----:|
| 初始 patch 開發 | 2-4 小時（Rust 熟練開發者） |
| 上游追蹤 | 低（上游最後 push 2026-04-01，非活躍開發） |
| 安全更新 | 低（sandbox/ACL 不依賴上游） |
| Rust toolchain 更新 | 低（Rust 1.85+ stability） |
| 測試 | 上游 180+ tests，patch 後需跑 `task verify` |
| **綜合評估** | 🟢 低維護成本 |

### 1.6 交付時間

| 階段 | 時間估計 |
|------|:--------:|
| Fork + patch code | 2-4 小時 |
| Build (`task build-release`) | 5-10 分鐘 |
| Config 設定 + bot token | 10 分鐘 |
| Systemd service 撰寫 | 10-15 分鐘 |
| 群組設定 + ACL seed | 10 分鐘 |
| 上線測試 | 30 分鐘 |
| **總計** | **3-5 小時** |

---

## 2. 路線 B: 自建 Xiaoma-Codex Bridge

### 2.1 最小架構

```
Telegram Bot Webhook/Updates
    │
    ▼
ACL Middleware (user_id + chat_id + topic_id)
    │
    ▼
Command Router
    ├── /review → Codex CLI subprocess (read-only sandbox)
    └── /status → 回報狀態
    │
    ▼
Codex CLI Subprocess
    ├── spawn codex exec --sandbox read-only ...
    ├── 即時監控 stdout
    └── timeout management
    │
    ▼
Report Processor
    ├── 從 Codex stdout 萃取審查結果
    ├── 產出 Telegram 摘要（≤ 3500 chars）
    └── 回傳摘要到 Telegram
    │
    ▼
Report Exporter (小馬模組)
    ├── 收取完整 Codex 輸出
    └── 寫入 specs/reports/
```

### 2.2 需要哪些模組

| 模組 | 功能 | 可沿用小馬現有？ | 約略行數 |
|------|------|:---------------:|:--------:|
| **Telegram Bot receiver** | 接收 update / 發送訊息 | ✅ **可沿用** — 小馬 Telegram bot 已有完整 infrastructure | 0 |
| **ACL Middleware** | user_id + chat_id + topic_id 白名單 | ✅ **可沿用小馬 ACL**（小馬已有 user/chat/topic 過濾概念） | 20-30 |
| **Command Router** | parse command / route to handler | ❌ 需新增 | 50-80 |
| **Codex CLI subprocess** | spawn codex exec + 監控 + timeout | ✅ **可沿用小馬現有 terminal tool** | 30-50 |
| **stdout Streamer** | 即時讀取 Codex 輸出 | ❌ 需新增 | 50-80 |
| **Report Summarizer** | 從完整 stdout 萃摘要 | ✅ 小馬可直接產出摘要 | 30-50 |
| **Telegram output formatter** | 摘要 → Telegram HTML | ✅ 小馬現有 format.tool | 0 |
| **Audit Log** | 記錄所有指令和拒絕 | ✅ 小馬現有 audit_log | 0 |
| **Rollback** | service stop + token revoke | ❌ 手動腳本 | 20-30 |
| **Systemd service** | 運行 subprocess | ❌ 需撰寫 | 10 |
| **總計** | | **~60% 可沿用** | **~210-360** |

### 2.3 關鍵優勢：可沿用小馬現有基礎設施

小馬現有的 infrastructure 中可以直接重複使用的：

| 基礎設施 | 用於 |
|---------|------|
| Hermes Telegram Bot | 接收 update、發送訊息、群組管理 ✅ |
| Hermes ACL | user_id + chat_id + topic_id 白名單 ✅ |
| Hermes terminal tool | `codex exec` subprocess 調用 ✅ |
| Hermes cron system | 排程 audit ✅ |
| Hermes skills | 包裝 bridge 邏輯 ✅ |
| Hermes auditor | audit log ✅ |
| Hermes L8 security | token management, rollback ✅ |
| MemPalace | session 資訊持久化 ✅ |

**這是最關鍵的洞察：** 小馬已經有 Telegram bot、ACL、terminal、cron、audit log、security 全部基礎設施。自建 bridge 不是從零開始，而是整合現有元件。

### 2.4 安全模型

```
自建 bridge 的安全模型比 fork Headcrab 更乾淨：

1. 無不需要的功能 — 只實作 /review 和 /status
2. 無 file upload / artifact / voice — 根本不需要這些 handler
3. ACL 直接用小馬現有的（已經有 chat/topic allowlist）
4. Codex 調用直接透過 terminal tool + codex exec
5. Report 由小馬 write_file → specs/reports/
6. Audit log 直接用 Hermes auditor
7. 不需要獨立 bot token（用小馬 bot 的 command routing）
8. 不需要獨立 systemd service（小馬 gateway 已經在跑）
```

**對比 Headcrab fork：** 自建版本沒有任何「繼承的不需要功能」，安全模型更精簡。

### 2.5 維護成本

| 項目 | 評估 |
|------|:----:|
| 初始開發 | 3-6 小時 |
| 日常維護 | 🟢 極低（整合在小馬系統中） |
| 上游依賴 | 無（不 fork 任何上游） |
| Codex CLI 版本更新 | 🟢 自由（依賴 CLI 介面） |
| 安全更新 | 🟢 自有程式，可控 |
| **綜合評估** | 🟢 最低維護成本 |

### 2.6 交付時間

| 階段 | 時間估計 |
|------|:--------:|
| Bridge 核心（receiver + ACL + router） | 1-2 小時 |
| Codex subprocess 調用 + 監控 | 30-60 分鐘 |
| 報告處理（摘要 + export） | 30-60 分鐘 |
| Security 層（audit log + rollback） | 30 分鐘 |
| Systemd service | 15 分鐘 |
| 測試 + 上線 | 30 分鐘 |
| **總計** | **4-6 小時** |

---

## 3. 路線 C: 小馬 Relay Fallback

### 3.1 什麼都不改

路線 C 不解：小新在 Telegram 群組發言 → 小馬在後端呼叫 Codex CLI → 小馬將結果 relay 回群組。

完全不新增 bot、不新增 service、不新增程式碼。

### 3.2 優缺點

| 優點 | 缺點 |
|------|------|
| ✅ 零開發成本 | ❌ 無獨立 Codex bot 身份 |
| ✅ 零新攻擊面 | ❌ 小新必須等小馬在線 |
| ✅ 零維護成本 | ❌ 小馬 relay 增加延遲 |
| ✅ 立即可用 | ❌ 群組中缺乏三方獨立對話體驗 |
| ✅ 安全模型已驗證 | ❌ 無法滿足原始目標（三方獨立身份） |
| ✅ freeze 100% 相容 | ❌ 小新在小馬 session 中斷時無法使用 |

### 3.3 是否能滿足三方群組感

**❌ 不能。** 小新的原始目標是「三方群組獨立身份」：
- 小新在群組發話
- Codex bot 直接回應
- 小馬參謀/跟進

路線 C 只能做到「小新 → 小馬(內部調用Codex) → 小馬轉述」，群組中只看到兩個身份（小新 + 小馬），沒有獨立的 Codex bot。

---

## 4. 評分表

| 維度 | A. Fork Headcrab | B. 自建 Bridge | C. 小馬 Fallback |
|:----:|:----------------:|:--------------:|:----------------:|
| **安全性 (0-10)** | **8** | **9** | 10 |
| **實作速度 (0-10)** | 8 | 7 | 10 |
| **長期維護 (0-10)** | 7 | **9** | 10 |
| **Freeze 相容 (0-10)** | 6 | **9** | 10 |
| **三方作戰室體驗 (0-10)** | **9** | **9** | 4 |
| **九層架構契合度 (0-10)** | 6 | **9** | 10 |
| **半年穩定性 (0-10)** | 7 | **8** | 10 |
| **總評** | **51/70** | **60/70** | **64/70** |

### 評分說明

**安全性：** 自建 Bridge 9 > Fork 8 的原因是自建沒有任何「不需要的功能攻擊面」。Fork Headcrab 即使 patch disable，Rust binary 中仍然包含 file upload/artifact/voice 的程式碼（只是不被呼叫）。

**長期維護：** 自建 Bridge 9 > Fork 7 的原因是自建完全在小馬現有 infrastructure 內，沒有上游依賴。Fork 需要追蹤上游更新。

**Freeze 相容：** 自建 Bridge 9 > Fork 6 的原因是自建不需要獨立的 systemd service（用小馬 gateway infrastructure），不需要獨立 bot token（用小馬 bot 的 command routing）。Fork Headcrab 需要新的 systemd service + 新的 bot token。

**九層架構契合度：** 自建 Bridge 9 > Fork 6 的原因是自建可以直接整合進 L3 Gateway（小馬 Telegram bot）而不是成為一個平行層級。

---

## 5. 推薦

### 5.1 推薦路線: ✅ **B. 自建 Xiaoma-Codex Bridge**

**理由：**

1. **小馬已有 60%+ 的基礎設施** — Telegram bot、ACL、terminal、cron、audit log、rollback。自建 bridge 是組裝現有元件，不是從零開始。

2. **安全模型最乾淨** — 沒有不需要的功能、沒有歷史包袱、ACL 直接用小馬現有的三維（user/chat/topic）白名單。

3. **不需要獨立 systemd service，不需要獨立 bot token** — 完全在小馬 gateway 內跑。這比 Fork Headcrab 更符合 freeze exception。

4. **維護成本最低** — 自有程式，無上游依賴，完全掌握。

5. **三方作戰室體驗不打折** — Codex 有獨立身份直接回應，小馬可以跟進。

### 5.2 是否仍建議 fork Headcrab

**❌ 不建議。** 在自建 bridge 方案成立的前提下，fork Headcrab 的額外成本（維護 fork、繼承不需要的功能、獨立 service + token）沒有足夠的回報。

**Headcrab/telecodex 的價值定位：** 作為**參考實作**。當自建 bridge 遇到實作問題時，翻閱 Headcrab 的原始碼了解他怎麼處理：
- Codex CLI subprocess 管理（turns.rs）
- SQLite session isolation（store.rs）
- Telegram long polling + rate limit handling（telegram.rs）
- Streaming response 到 Telegram（LiveTurnSink）

### 5.3 是否建議自建

**✅ 強烈建議。** 自建 bridge 是最符合九層架構、維護成本最低、安全模型最乾淨的方案。

### 5.4 是否需要 Codex audit

**✅ 是。** 在進入 design/實作前，自建 bridge 的架構設計需要 Codex audit 審查。

### 5.5 是否可以進入下一階段 design

**✅ 可以。** 進入 **Phase 0.6 — Xiaoma-Codex Bridge Design**，產出具體的 design spec。

---

## 6. 結論

| 項目 | 結論 |
|------|:----:|
| **推薦路線** | **B. 自建 Xiaoma-Codex Bridge** |
| **是否仍建議 fork Headcrab** | ❌ 不建議。Headcrab 作為參考實作 |
| **是否建議自建** | ✅ 強烈建議 |
| **是否需要 Codex audit** | ✅ 是 — bridge design spec 需交 Codex 審查 |
| **是否可以進入下一階段 design** | ✅ 可以進 Phase 0.6 |
| **預計開發時間** | 4-6 小時 |
| **預計程式量** | ~250-400 行（含整合現有元件） |
| **是否需要獨立 bot token** | ❌ 不用（用小馬 bot 的 command routing） |
| **是否需要獨立 systemd service** | ❌ 不用（小馬 gateway 內） |
| **頭號風險** | Codex CLI stdout parsing 穩定性 |
| **最大優勢** | 60% 基礎設施可直接沿用 |

---

**本報告為 read-only architecture decision，不涉及任何 clone、install、build、或 deploy。**

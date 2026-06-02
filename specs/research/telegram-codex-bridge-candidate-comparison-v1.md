# Telegram-Codex Bridge Phase 0.3 — Candidate Comparison

**審查日期**: 2026-06-06 | **審查方式**: GitHub source code + README analysis (read-only)
**篩選範圍**: 153 repositories → 8 個候選深入分析

---

## 0. Executive Summary

市場上有大量 Telegram ↔ Codex bridge 工具（153 repos），但絕大多數是針對**完整互動式 agent 控制**設計，不是 audit-only。真正符合 Phase 1A 安全需求的候選非常有限。

**關鍵發現：** 最初的 v1.1 proposal 描述的就是 **Headcrab/telecodex**（Rust, TOML, SQLite ACL, codex CLI subprocess），但誤寫為 benedict2310/telecodex（Node.js, .env, SDK）。**Headcrab/telecodex 是唯一一個內建 ACL user/chat/topic、audit_log、sandbox 控制、/review command 的 Rust bridge。**

---

## 1. 候選詳細分析

### 1.1 Headcrab/telecodex ⭐

| 項目 | 值 |
|------|-----|
| Repo | https://github.com/Headcrab/telecodex |
| License | MIT |
| 語言 | **Rust 1.85+** |
| 調用 Codex 方式 | **codex CLI subprocess**（非 SDK） |
| Config 格式 | **TOML**（telecodex.toml） |
| 依賴 | Rust toolchain + go-task |
| ACL | SQLite-backed: **allowed_users + admin/user roles** + `startup_admin_ids` + audit_log |
| Chat/topic 支援 | ✅ 原生支援，每個 chat/topic 獨立 session |
| Sandbox 控制 | `default_sandbox` = read-only / workspace-write / danger-full-access |
| Audit-only 可能 | ✅ 原生 `/review` command + `default_sandbox = "read-only"` |
| 寫入限制 | `default_add_dirs` 可指定額外可寫目錄 |
| 指令白名單 | 明確區分「bridge-handled」、「forwarded to Codex」、「unsupported」三類 |
| 安全特點 | ACL SQLite, audit_log, codex device login, headless auth |
| 是否需要 fork | ⚠️ 可能需要 patch ACL 加 chat/topic 白名單 |
| 所需 Runtime | Rust toolchain + go-task |
| 是否 systemd | 可自行撰寫 service unit |

**關鍵優勢：** 唯一一個 v1.1 描述的正確上游。Rust binary 單一產出、TOML config、codex CLI subprocess 調用、SQLite ACL + audit_log。

**關鍵風險：** 需確認 `default_sandbox = "read-only"` 下 `/review` 行為是否正確；需確認 ACL 是否支援 chat/topic allowlist 或需 patch。

---

### 1.2 benedict2310/telecodex

| 項目 | 值 |
|------|-----|
| Repo | https://github.com/benedict2310/telecodex |
| License | MIT |
| 語言 | **TypeScript (Node.js 22+)** |
| 調用 Codex 方式 | **@openai/codex-sdk npm package** |
| Config 格式 | **`.env`**（非 TOML） |
| 依賴 | npm install → tsx/tsc |
| ACL | 僅 `TELEGRAM_ALLOWED_USER_IDS`（user_id only） |
| Chat/topic 支援 | ✅ context key 含 chat+topic，但**無 allowlist** |
| Sandbox 控制 | 三級，但無路徑級別限制 |
| Audit-only 可能 | ❌ 無法關閉 file upload/photo/voice/artifact |
| 寫入限制 | ❌ 無 |
| 指令白名單 | ❌ 所有指令固定註冊 |
| 安全特點 | sanitize filename, size limit |
| 是否需要 fork | ✅ **必須 fork**，需 patch 8 項以上 |
| 所需 Runtime | Node.js 22+, npm |
| 是否 systemd | 無，需自建 |

**結論：** 不適合 Phase 1A。sandbox 無法限制、危險功能無法關閉、ACL 不足。

---

### 1.3 gergomiklos/heyagent

| 項目 | 值 |
|------|-----|
| Repo | https://github.com/gergomiklos/heyagent |
| License | MIT |
| 語言 | TypeScript (Node.js) |
| 調用 Codex 方式 | **`codex exec --dangerously-bypass-approvals-and-sandbox`** |
| ACL | ❌ 無（僅靠 pairing） |
| Chat/topic 支援 | ❌ 單一 chat |
| Audit-only 可能 | ❌ 設計為雙向互動 bridge |
| 是否需要 fork | ✅ 完全不合適 |
| 最大安全風險 | 🔴 **bypasses all sandbox and approval** |

**結論：** ❌ 安全上完全不可接受。固定 bypass sandbox/approval，不適合。

---

### 1.4 alexei-led/ccgram

| 項目 | 值 |
|------|-----|
| Repo | https://github.com/alexei-led/ccgram |
| License | MIT |
| 語言 | Python (PyPI) |
| 調用 Codex 方式 | **tmux bridge**（非 SDK 非 CLI） |
| ACL | `ALLOWED_USERS` (env) |
| Chat/topic 支援 | ✅ Forum topics（topic-per-agent） |
| Sandbox 控制 | ❌ 無（tmux 層無法 sandbox） |
| Audit-only 可能 | ❌ 設計為完整 agent 互動 |
| 所需 Runtime | Python 3.14+, tmux, agent CLI |
| 最大特點 | 真正的 terminal ↔ Telegram 映射 |

**結論：** 適合多 agent 並行監控，但不適合 Phase 1A audit-only。tmux 層無法 sandbox。

---

### 1.5 InDreamer/telegram-codex-bridge (Codex Console)

| 項目 | 值 |
|------|-----|
| Repo | https://github.com/InDreamer/telegram-codex-bridge |
| License | 未標示（MIT 推測） |
| 語言 | TypeScript (Node.js 24+) |
| 調用 Codex 方式 | **codex app-server** |
| ACL | 腳本授權 + user 控制 |
| Sandbox 控制 | 依賴 Codex app-server |
| /review 支援 | ✅ `/review` command |
| 所需 Runtime | Node.js 24+, systemd/LaunchAgent |
| 特點 | Project-aware sessions, runtime cards, approval flows |

**結論：** Node.js runtime + app-server 依賴。支援 `/review` 但整體架構偏重（app-server）。需要 Node.js 24+。

---

### 1.6 tuchg/Lucarne

| 項目 | 值 |
|------|-----|
| Repo | https://github.com/tuchg/Lucarne |
| License | MIT |
| 語言 | **Rust** (lucarned binary) |
| 調用 Codex 方式 | agent-sessions provider |
| ACL | `LUCARNE_AUTHORIZED_USER_IDS` |
| Chat/topic 支援 | ✅ Forum topics → workspace mapping |
| 安裝 | curl installer / Homebrew |
| 所需 Runtime | Rust binary（單一可執行檔） |
| 特點 | Telegram + WeChat, 自動 session 管理, systemd/LaunchAgent |

**結論：** Rust binary, 新專案（2026-05-17 建立），活躍開發中。支援 Telegram forum topics + workspace。但沒有原生 audit-only 模式。

---

### 1.7 chenhg5/cc-connect

| 項目 | 值 |
|------|-----|
| Repo | https://github.com/chenhg5/cc-connect |
| License | MIT |
| 語言 | **Go**（單一 binary） |
| 調用 Codex 方式 | 多種 agent（10+） |
| ACL | `admin_from` + user allowlist |
| Chat/topic 支援 | 多平台，Telegram long polling |
| 所需 Runtime | Go binary（無 runtime 依賴） |
| 特點 | 覆蓋 12 平台 + 10 agent + web UI + cron |
| 安全特點 | `run_as_user` OS-level isolation, permission modes |

**結論：** 非常全面但過重。12 平台 + web UI + cron 對只想要 Telegram audit-only 的場景太大。但 `run_as_user` OS-level isolation 是獨特優勢。

---

### 1.8 littlebearapps/untether

| 項目 | 值 |
|------|-----|
| Repo | https://github.com/littlebearapps/untether |
| License | MIT |
| 語言 | Python (PyPI) |
| 調用 Codex 方式 | 多種 agent CLI |
| ACL | `allowed_user_ids` |
| Chat/topic 支援 | ✅ three workflow modes (assistant/workspace/handoff) |
| 安全特點 | cost budgets, env allowlist |
| 所需 Runtime | Python 3.12+, uv/pipx |
| 特點 | 最成熟的功能集：voice, cron, webhook, file transfer, cost tracking |

**結論：** 功能最全面但設計為完整互動式控制。與 Phase 1A audit-only 理念不符。Python runtime。

---

## 2. 評分表

| 維度 | Headcrab/telecodex | benedict2310/telecodex | heyagent | ccgram | Codex Console | Lucarne | cc-connect | untether |
|:----:|:------------------:|:---------------------:|:--------:|:------:|:-------------:|:-------:|:----------:|:--------:|
| **安全性 (0-10)** | **8** | 4 | 0 | 4 | 6 | 6 | 7 | 5 |
| **接入成本 (0-10)** | 6 | 5 | 8 | 7 | 5 | 7 | 6 | 7 |
| **功能適配 (0-10)** | **9** | 5 | 2 | 4 | 6 | 5 | 4 | 3 |
| **維護成本 (0-10)** | 7 | 5 | 8 | 7 | 5 | 7 | 6 | 6 |
| **freeze 相容 (0-10)** | **8** | 5 | 3 | 5 | 5 | 6 | 5 | 5 |
| **總評** | **38/50** | 24/50 | 21/50 | 27/50 | 27/50 | 31/50 | 28/50 | 26/50 |

### 評分說明

**安全性：** Headcrab/telecodex 最高（8分）— Rust binary + SQLite ACL + audit_log + sandbox 三級控制 + codex CLI subprocess。扣分原因：需確認 chat/topic allowlist 實作。

**功能適配：** Headcrab/telecodex 最高（9分）— 原生 `/review`、`/allow/deny/role` ACL、`default_sandbox`、`default_add_dirs`、`audit_log`。最接近 v1.1 設計。

**freeze 相容：** Headcrab/telecodex 最高（8分）— Rust binary 單一產出、無 Node.js runtime、無 npm 依賴、無外部網路依賴（除 Telegram API）、systemd 可自建。

---

## 3. 安全模型深度對比

### Phase 1A 需求 vs 各候選

| Phase 1A 需求 | Headcrab/telecodex | benedict2310/telecodex | Lucarne | cc-connect |
|:-------------:|:------------------:|:---------------------:|:-------:|:----------:|
| allowed_user_ids | ✅ SQLite ACL | ✅ TELEGRAM_ALLOWED_USER_IDS | ✅ LUCARNE_AUTHORIZED_USER_IDS | ✅ admin_from |
| allowed_chat_ids | ⚠️ 需確認/補 ACL | ❌ | ❌ | ❌ |
| allowed_topic_ids | ⚠️ 需確認/補 ACL | ❌ | ❌ | ❌ |
| sandbox read-only | ✅ default_sandbox | ✅ CODEX_SANDBOX_MODE | ❌ 無 | ❌ 無 |
| 禁止 source code write | ✅ read-only sandbox | ⚠️ 矛盾 | ❌ | ❌ |
| 禁止 git commit/push | ✅ read-only sandbox | ⚠️ SDK 層行為 | ❌ | ❌ |
| 禁止讀 .env | ⚠️ codex CLI subprocess | ❌ buildCodexEnv() | ❌ | ❌ |
| 禁止 shell command | ✅ read-only sandbox | ❌ | ❌ | ❌ |
| 關閉 login/logout | ⚠️ 需 config 確認 | ✅ ENABLE_TELEGRAM_LOGIN=false | ❌ | ❌ |
| 關閉 file upload | ⚠️ 需 config 或 patch | ❌ 固定 handler | ❌ | ❌ |
| 關閉 artifact delivery | ⚠️ 需 config 或 patch | ❌ 固定 handler | ❌ | ❌ |
| 關閉 voice transcription | ⚠️ 不安裝依賴即可 | ✅ 不安裝 parakeet | ❌ | ❌ |
| 關閉 model switching | ⚠️ 需 config 或 patch | ❌ 固定 handler | ❌ | ❌ |
| /review command | ✅ 原生支援 | ❌ 無 | ❌ | ❌ |
| audit log | ✅ SQLite audit_log | ❌ 無 | ❌ | ❌ |
| report-only output | ⚠️ read-only + 小馬搬運 | ❌ 需 patch | ❌ | ❌ |

### 結論

**Headcrab/telecodex 是唯一一個：**
1. 使用 Rust（安全語言，無 runtime 依賴）
2. 調用 codex CLI subprocess（非 SDK）
3. 有 TOML config（結構化）
4. 有 SQLite ACL + audit_log（持久化）
5. 有 `/review` command（原生 audit）
6. 有三級 sandbox 控制
7. 有 `default_add_dirs` 寫入限制

**其餘候選全部不達標，原因各異：**

- **benedict2310/telecodex**：Node.js SDK, 無 ACL 深度, 危險功能無法關閉
- **heyagent**：**固定 bypass sandbox/approval** — security nightmare
- **ccgram**：tmux 層無法 sandbox
- **Codex Console**：Node.js 24+, app-server 依賴
- **Lucarne**：新專案（3天），無 audit-only 概念
- **cc-connect**：過重（12 平台），無 audit-only
- **untether**：設計為完整互動控制

---

## 4. 推薦

### A. 最安全候選

**Headcrab/telecodex** — Rust binary + SQLite ACL + audit_log + read-only sandbox + codex CLI subprocess。
唯一能透過 `default_sandbox = "read-only"` 和原生 `/review` 實現 Phase 1A audit-only 的專案。

### B. 最快可用候選

**Headcrab/telecodex** — 如果 ACL 夠用（不需額外 patch chat/topic allowlist），最快路線是：
1. `git clone` → `task init-config` → `task build-release`
2. 設定 TOML config → 設定 bot token → `task run-release`
3. systemd service 自建

但如果 ACL 需要加 chat/topic allowlist，則需 fork/patch。

### C. 最適合小新-小馬-Codex 三方作戰室的候選

**Headcrab/telecodex** — 理由：
- 原生支援 Telegram group + topic
- per-session isolation（每個 chat/topic 獨立 session）
- `/status`、`/sessions`、`/history` 完整 session 管理
- `/review` 原生 audit command
- SQLite ACL 可管理多個 user + role
- 小馬可透過 `/allow` / `/deny` 管理 ACL

### D. 是否仍建議 Telecodex fork

**✅ 是，但應該 fork Headcrab/telecodex（Rust），不是 benedict2310/telecodex（Node.js）。**

要確認的事：
1. Headcrab/telecodex 的 ACL 是否支援 chat_id / topic_id allowlist
2. `default_sandbox = "read-only"` 下 `/review` 行為是否正確
3. 是否需要 patch 才能禁止非 audit 功能（model switching, file upload, voice, artifact）

### E. 是否應放棄所有外部 bridge，改回小馬 relay

**❌ 不建議放棄。** Headcrab/telecodex 證明了 Rust + TOML + codex CLI subprocess 的 bridge 存在且成熟。它與 v1.1 描述的架構一致。小馬 relay 應保留為 fallback，但不應取代 Telecodex Phase 1A。

---

## 5. 最終建議路線

```
Phase 0.3 完成（本文件）
    │
    ▼
Phase 0.4: Headcrab/telecodex 深度審查
    ├── 確認 ACL chat/topic allowlist 實作
    ├── 確認 read-only + /review 行為
    ├── 確認是否可關閉非 audit 功能
    ├── 確認 codex CLI subprocess 調用細節
    └── 產出 Headcrab-telecodex-depth-audit.md
    │
    ▼
Phase 0.5: fork/patch design（如需要）
    │
    ▼
Phase 1A: Implementation（小新批准後）
```

---

## 6. 產出文件

本報告：`specs/research/telegram-codex-bridge-candidate-comparison-v1.md`

---

**本報告為 read-only research，不涉及任何 clone、install、build、或 deploy。**

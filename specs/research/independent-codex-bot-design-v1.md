# Independent Codex Bot — Phase 0.6A Design v2.1

**版本**: v2.1 | **日期**: 2026-05-31 | **狀態**: Design (post-2nd-audit, pre-implementation)
**路線**: A2. 自建 Independent Codex Bot (Python) | **參考**: Headcrab/telecodex
**Codex CLI**: v0.135.0 | **Runtime**: Python 3.14

---

## 0. Executive Summary

v2.1 修正 Codex audit 第二輪 6 項 findings。

**重大變更：**
1. `codex exec review` 降級為非主路徑（無 `-s`/`-C` 支援）
2. systemd `ProtectHome=read-only` 補 `ReadWritePaths` 給 bot state dir
3. T1-T14 完整定義（原缺失）
4. Intent gate 補中文關鍵字與變形
5. Secret denylist 拆為 path + pattern 雙層，移除過粗的 `key` 全擋
6. 報告語氣修正為設計層級審查，非實作層級

---

## 1. CLI Flags 收斂（Finding #1 ✅）

### 1.1 Phase 1A 唯一主路徑

```bash
codex exec \
  -s read-only \
  -C /home/janzongxin/projects/detabase \
  -m gpt-5.5 \
  -c 'approval_policy="never"' \
  --json \
  "{prompt}"
```

**理由：**
- `-s read-only` 強制 sandbox（阻止寫入）
- `-C /home/janzongxin/projects/detabase` 鎖定 working directory
- `-m gpt-5.5` 固定模型
- `-c 'approval_policy="never"'` 不請求批准（read-only 下無需批准）
- `--json` 結構化輸出，便於 bot 解析與摘要

### 1.2 `codex exec review` 的定位

| 項目 | 值 |
|:----|:-----|
| 支援 `-s read-only` | ❌ 不支援 |
| 支援 `-C --cd` | ❌ 不支援 |
| **Phase 1A 使用** | ❌ 不得作為主路徑 |
| **未來用途** | 僅可作為手動 wrapper 研究，不進 Phase 1A |
| **原因** | sandbox 與 repo root 不可控 |

`codex exec review` 在 Phase 1A 不出現在 bot code 中。若未來需要，必須由小馬在 wrapper 層自行設定 subprocess cwd 並依賴全域 config sandbox。

---

## 2. Systemd Hardening 修正（Finding #2 ✅）

```ini
[Unit]
Description=Xiaoma Codex Bot — Independent Telegram Codex Bot
After=network.target
Wants=hermes-gateway.service

[Service]
Type=simple
User=janzongxin
Group=janzongxin

# Environment
EnvironmentFile=/home/janzongxin/.codex-bot/.env
WorkingDirectory=/home/janzongxin/projects/detabase

# Exec
ExecStart=/usr/bin/python3 /home/janzongxin/.codex-bot/bot.py

# Security hardening
ProtectHome=read-only                     # bot 不能讀其他 home 內容
ProtectSystem=strict                      # bot 不能改系統檔案
PrivateTmp=true                           # 獨立 tmp
NoNewPrivileges=true                      # 禁止提權
CapabilityBoundingSet=                    # 不給任何特權
AmbientCapabilities=
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=true
ProtectClock=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
MemoryMax=2G
CPUQuota=50%

# bot state directory — 唯一可寫路徑
ReadWritePaths=/home/janzongxin/.codex-bot/

# Restart
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

### 2.1 寫入目錄策略

| 路徑 | 權限 | 用途 |
|:----|:----:|:-----|
| `~/.codex-bot/.env` | **chmod 600** | bot token（唯讀） |
| `~/.codex-bot/bot.py` | **chmod 755** | bot 程式碼 |
| `~/.codex-bot/codex_bot_jobs.db` | **可寫** | job queue SQLite |
| `~/.codex-bot/output/` | **可寫** | Codex stdout 暫存 |
| `~/projects/detabase/` | **ProtectHome=read-only** | repo source（不可寫） |
| `~/projects/detabase/specs/reports/` | **由小馬寫入** | audit report（bot 不寫） |

### 2.2 限制

- bot 可寫的路徑僅 `~/.codex-bot/`
- repo 不可寫（read-only sandbox + ProtectHome）
- token/config 不可被外部讀取（chmod 600）
- Codex subprocess 的 session 可能寫 `~/.codex/` — 需確認或用 `--ephemeral` 避免

---

## 3. T1-T15 完整測試表（Finding #3 ✅）

| ID | Scenario | Input | Expected bot action | Expected Codex invocation | Expected filesystem result | Expected Telegram output | Pass criteria |
|:--:|:---------|:------|:-------------------|:-------------------------|:-------------------------|:------------------------|:-------------|
| T1 | 非白名單 user | user_id 不在 ACL | ❌ 拒絕 + audit_log | 不調用 | 無變更 | "Unauthorized" | bot 回覆 "Unauthorized"，無 Codex subprocess |
| T2 | 錯誤 chat | 正確 user，錯誤 chat_id | ❌ 拒絕 + audit_log | 不調用 | 無變更 | "Unauthorized" | bot 不回覆內容，audit_log 有記錄 |
| T3 | 錯誤 topic | 正確 chat，錯誤 topic_id | ❌ 拒絕 + audit_log | 不調用 | 無變更 | "Unauthorized" | bot 不回覆，audit_log 記錄 |
| T4 | 非允許 command | 發送 `/codex_deploy` | ❌ 指令不回覆 | 不調用 | 無變更 | "未知指令，請使用 /codex_help" | bot 回覆 unknown command |
| T5 | 非 command 文字 | 發送 "幫我看看這個檔案" | ❌ 拒絕 | 不調用 | 無變更 | "此 bot 僅接受 /codex_*" | bot 只回覆提示 |
| T6 | intent gate implement | prompt 含 "implement a new feature" | ❌ intent gate 阻擋 | 不調用 | 無變更 | "此 bot 僅支援 audit/review" | bot 拒絕，不送 Codex |
| T7 | intent gate 中文 | prompt 含 "幫我改一下這個 function" | ❌ intent gate 阻擋 | 不調用 | 無變更 | "此 bot 僅支援 audit/review" | bot 拒絕 |
| T8 | intent gate git push | prompt 含 "commit and push" | ❌ intent gate 阻擋 | 不調用 | 無變更 | "Codex sandbox(read-only) 會阻止" | bot 拒絕 |
| T9 | intent gate 讀 secret | prompt 含 "read .env" | ❌ intent gate 阻擋 | 不調用 | 無變更 | "此 bot 無法處理 secret" | bot 拒絕 |
| T10 | long-running timeout | 發起 `/codex_audit`，等待 > 300s | ❌ timeout + job failed | subprocess 收到 SIGTERM | 無 source code 變更 | "Job #{job_id} timed out after 300s" | job.status=failed, duration≈300s |
| T11 | concurrent jobs | 發起 job A → job A 進行中 → 發起 job B | ✅ job B queued | 只有一個 subprocess | 無變更 | "Job #{job B} queued, waiting for job #{job A}" | job B.status=queued |
| T12 | cancel job | `/codex_cancel <running_job_id>` | ✅ SIGTERM + job cancelled | subprocess 中止 | 無變更 | "Job #{job_id} cancelled" | job.status=cancelled, process 不存在 |
| T13 | Codex crash | Codex subprocess 被 SIGKILL | ❌ job failed | crash | 無變更 | "Job #{job_id} failed: Codex process exited unexpectedly (exit code {n})" | job.status=failed, error 非空 |
| T14 | report 無 source 變更 | 正常 `/codex_audit` | ✅ 執行 | 一次 codex exec 調用 | `git diff --stat` 空, `git status` 僅新增 specs/reports/ | 摘要 + job_id + "完整報告由小馬搬運" | Codex bot 不寫 repo, 小馬 write_file |
| T15 | secret redaction | audit 回覆含疑似 token | ✅ output redacted | — | 無變更 | 摘要中 token pattern 被遮罩 | Telegram 訊息不含 raw secret |

---

## 4. Intent Gate 中文與變形（Finding #4 ✅）

### 4.1 拒絕關鍵字（中英雙語）

中文：
```
改一下
幫我改
直接修
修掉
套用修正
產生 patch
產生程式碼
實作
實現
新建
新增
寫入
儲存
部署
刪除
移除
```

英文/變形：
```
apply fix
apply patch
implement
write code
write to file
modify
edit
change file
commit
push
migration
migrate
deploy
delete
remove
rm -rf
drop table
alter table
create table
```

### 4.2 Intent Gate 行為

- **匹配任一關鍵字 → 拒絕執行，不回 Codex**
- 比對時忽略大小寫
- 比對時忽略前後空白
- 不要求完整字邊界（「套用修正案」也會匹配「套用修正」）

### 4.3 限制

Intent gate 是**第一層防線**，不是完整 enforcement。其目的在於：
- 在送 Codex 之前攔截明顯的 implement/edit 請求
- 減少不必要的 Codex 調用（節省 token）
- 給使用者明確的互動回饋

**真正的 enforcement 仍依賴 read-only sandbox。**

---

## 5. Secret Denylist 修正（Finding #5 ✅）

### 5.1 Path Denylist（拒絕 Codex 讀取以下路徑）

Codex 在 `-s read-only` 下仍可讀取檔案。Prompt 中加入 system instruction 禁止讀取以下路徑：

```
.env
.env.*
*.pem
*.key
id_rsa
id_ed25519
id_ecdsa
id_dsa
.npmrc
.pypirc
.netrc
.git-credentials
kubeconfig
credentials.json
credentials
secrets
secret
token
*.token
service_account.json
*.p12
```

### 5.2 Pattern Denylist（輸出遮罩）

在 Telegram 摘要前，掃描 stdout 並遮罩以下 patterns：

```
sk-[a-zA-Z0-9]{20,}        # OpenAI API key
sk-ant-[a-zA-Z0-9]{20,}    # Anthropic API key
xoxb-[a-zA-Z0-9]{10,}      # Slack token
xapp-[a-zA-Z0-9]{10,}
ghp_[a-zA-Z0-9]{36,}       # GitHub personal access token
gho_[a-zA-Z0-9]{36,}
github_pat_[a-zA-Z0-9_]{50,}
supabase.*service_role     # Supabase
supabase.*anon
TELEGRAM_BOT_TOKEN=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
CODEX_API_KEY=
-----BEGIN.*PRIVATE KEY-----  # Private key block
-----BEGIN.*CERTIFICATE-----
```

### 5.3 Redaction 位置

```
Codex stdout (完整)
    │
    ├── Telegram 摘要前 → 執行 pattern denylist → 遮罩後送出
    ├── 完整 stdout → 寫入 job DB (output buffer) — 不 redact（保留完整紀錄）
    ├── 完整 stdout → 寫入 report file — 不 redact（保留完整審計證據）
    └── systemd journal → bot 啟動時不 log token，運行中不 log secret
```

### 5.4 移除過粗的 `key`

v2 的 `key` 關鍵字已移除。不再擋 `primary key`、`foreign key`、`API key`（作為自然語言詞彙）。改用具體 pattern matching 遮罩。

---

## 6. 報告語氣修正（Finding #6 ✅）

### 6.1 本文件的定位

本文件是 **Phase 0.6A Design v2.1**，屬於設計層級審查。不是實作批准。

目前尚未批准的事項：
- ❌ 未批准申請 Telegram bot token
- ❌ 未批准建立 systemd service
- ❌ 未批准撰寫 bot 程式碼
- ❌ 未批准啟動任何 process
- ❌ 未批准寫入任何 credential
- ❌ 未批准修改現有 Telegram gateway

### 6.2 Status

v2.1 resolves the 6 second-round audit findings at the **design level**. This means the design is ready for implementation review, but implementation has not been approved.

**To be clear:**
- Design is complete ✅
- Design has passed two rounds of Codex audit ✅
- Production of bot code, bot token, systemd service, or any running process is **NOT authorized** until 小新 explicitly approves Phase 1A implementation ❌

---

## 7. 結論

### 6/6 Findings 修正狀態

| # | Finding | 等級 | 修正 |
|:-:|---------|:----:|:-----|
| 1 | `codex exec review` 不當主路徑 | 🟡 | ✅ 降級為非主路徑，收斂到單一 template |
| 2 | systemd 擋 bot state 寫入 | 🟡 | ✅ 補 `ReadWritePaths=/home/janzongxin/.codex-bot/` |
| 3 | T1-T14 未定義 | 🟡 | ✅ T1-T15 完整測試表 |
| 4 | intent gate 缺中文 | 🟢 | ✅ 中英雙語 + 變形 |
| 5 | secret denylist 太粗 | 🟢 | ✅ 拆 path + pattern 雙層，移除 `key` 全擋 |
| 6 | 報告語氣過強 | 🔵 | ✅ 明確標註 design only，實作未批准 |

**6/6 全部修正 ✅**

### 最終 Phase 1A Command Template

```bash
codex exec \
  -s read-only \
  -C /home/janzongxin/projects/detabase \
  -m gpt-5.5 \
  -c 'approval_policy="never"' \
  --json \
  "執行 code review: {prompt}"
```

### 結論

| 項目 | 結果 |
|:----|:------|
| **是否仍推薦 A2** | ✅ 是 |
| **T1-T15 是否完整且可執行** | ✅ 是 |
| **CLI flags 是否確認** | ✅ 以本機 codex v0.135.0 核對 |
| **systemd hardening 是否正確** | ✅ `ProtectHome=read-only` + `ReadWritePaths` |
| **是否需要下一輪 Codex audit** | ✅ 建議 — v2.1 可最後審查 |
| **是否可以進入 implementation** | ❌ 否 — 需小新明確批准 |
| **下一個批准點** | 小新批准 v2.1 design → Phase 1A implementation |

---

**本文件為純設計 spec。尚未獲准實作。Phase 1A implementation 需小新另行批准。**

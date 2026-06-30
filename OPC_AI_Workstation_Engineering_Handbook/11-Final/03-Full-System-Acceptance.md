# 11-Final / 03 Full-System Acceptance

## 使用方式

這是 **Phase 1：OPC AI Workstation** 的實機驗收表。

本文件只判斷工作站、儲存、開發工具、WSL2、Docker、Runtime Foundation 與 Recovery 是否可用；不把尚未施工的 Phase 2 Autonomous Runtime 當成 Phase 1 的失敗條件。

每一項必須有實際結果，不能靠「應該可以」勾選。

判定只有三種：

- **PASS**：Phase 1 全部必要項目已實測通過。
- **CONDITIONAL**：Phase 1 可使用，但存在已記錄、已接受且不阻礙施工的 WARN / SKIP。
- **FAIL**：有關鍵項目失敗，不得投入正式工作。

---

## 1. Windows Host

- [ ] Windows 11 已完成更新，沒有等待重新啟動。
- [ ] Secure Boot 為 True。
- [ ] TPM Present / Ready 為 True。
- [ ] GPU、網路、音訊與藍牙正常。
- [ ] Defender 與 Firewall 啟用。
- [ ] 主要遊戲與反作弊正常。
- [ ] `03-Windows/07-Windows-Verification.md` 全部通過。

## 2. Storage

- [ ] C: 與 D: 為獨立 SSD。
- [ ] 500GB SSD 為 C: 系統碟；2TB SSD 為 D: OPC-DATA，除非實機硬體紀錄另有明確決策。
- [ ] SSD 型號、序號末碼與容量已有紀錄。
- [ ] D: 為 NTFS、標籤 OPC-DATA。
- [ ] `D:\OPC` 標準目錄完整。
- [ ] 沒有 RAID 0、Dynamic Disk 或 Spanned Volume。
- [ ] BitLocker recovery key 可在外部位置取得。
- [ ] 外部備份已完成抽樣還原。
- [ ] `04-Storage/09-Storage-Verification.md` 全部通過。

## 3. Development

- [ ] Git 身分與 main 分支設定正確。
- [ ] GitHub CLI 登入正確帳號。
- [ ] VS Code 可開啟 `D:\OPC\projects`。
- [ ] Python / uv 環境可刪除 `.venv` 後重建。
- [ ] Node / pnpm 可刪除 `node_modules` 後重建。
- [ ] Repository 不含 `.env`、token、password 或 recovery key。
- [ ] `05-Development/07-Development-Verification.md` 全部通過。

## 4. WSL2 與 Docker

- [ ] Ubuntu 使用 WSL2 VERSION 2。
- [ ] systemd 可用。
- [ ] `/mnt/d/OPC` 可讀寫。
- [ ] `.wslconfig` 符合硬體並保留 Windows 資源。
- [ ] Docker Desktop 使用 WSL2 backend。
- [ ] WSL 內沒有第二套獨立 Docker daemon 同時執行。
- [ ] `docker run --rm hello-world` 成功。
- [ ] Compose 測試 stack healthy。
- [ ] Container 重建後資料仍存在。
- [ ] 必要 port 只綁定 localhost 或明確允許的介面。
- [ ] 有 NVIDIA 時，Windows 與 WSL2 的 `nvidia-smi` 成功。
- [ ] `06-WSL2-Docker/09-Verification.md` 全部通過。

## 5. Bootstrap

- [ ] `bootstrap.ps1 -Phase Preflight -DryRun` 不寫入系統。
- [ ] `bootstrap.ps1 -Phase Preflight` 通過。
- [ ] Workspace phase 不會刪除既有資料。
- [ ] Tools phase 可安全重跑。
- [ ] WinGet package ID 可精確解析。
- [ ] WSL phase 不會 unregister production distribution。
- [ ] Docker phase 不會 Factory Reset。
- [ ] 失敗時會留下 state.json 與 log。
- [ ] 人工步驟已完成：GitHub login、Ubuntu user、Docker Desktop 首次設定、secrets handoff。

## 6. Runtime Foundation

- [ ] `templates/opc-core-compose.yaml` 已複製到 `D:\OPC\runtime\opc-core\compose.yaml`。
- [ ] `.env` 已建立且未進 Git。
- [ ] PostgreSQL healthy。
- [ ] Redis PING 回傳 PONG。
- [ ] Redis Stream 可寫入與讀取。
- [ ] PostgreSQL table 可建立與查詢。
- [ ] Container 重建後 PostgreSQL 與 Redis 資料仍存在。
- [ ] PostgreSQL dump 已建立並還原到測試資料庫。
- [ ] `opc-control.ps1` 的 Start / Stop / Status 可用。

通過本節代表：

```text
RUNTIME FOUNDATION READY
```

不代表 Phase 2 Agent Runtime 已完成。

## 7. Recovery

- [ ] Recovery Package 位於外部位置。
- [ ] Handbook repository URL 與 commit SHA 已記錄。
- [ ] Git repository 可重新 clone。
- [ ] PostgreSQL dump checksum 正確。
- [ ] PostgreSQL dump 已測試還原。
- [ ] WSL distribution 可 export 並以測試名稱 import。
- [ ] BitLocker Key ID 與 recovery key 對應正確。
- [ ] `10-Security-Recovery/09-Bare-Metal-Rebuild.md` 已人工走讀。

## 8. 執行總驗收腳本

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\verify-all.ps1
```

必須保存：

```text
D:\OPC\artifacts\verification\verification-日期時間.json
D:\OPC\artifacts\verification\verification-日期時間.md
```

規則：

- 任一 FAIL：最終結果 FAIL。
- WARN：必須寫清楚原因與是否接受。
- SKIP：只能用於明確不適用，例如沒有 NVIDIA GPU。

## 9. 最終安全測試

人工執行：

```text
讀取指定 repository README
→ 產生摘要與風險清單
→ 保存到 D:\OPC\artifacts
→ 建立 SHA-256
→ 確認 repository 沒有被修改
```

這只驗證工作站與工具鏈，不宣稱 Agent Runtime 已存在。

## 10. Phase 2 邊界確認

下列項目屬於未來 **Phase 2：OPC Agent Runtime**，本文件不得勾選，也不得用來阻止 Phase 1 PASS：

- Objective intake / reframe
- Workflow checkpoint / resume
- Queue / retry / deduplication
- Capability Registry
- Tool / MCP Gateway
- Agent workspace 與 credential isolation
- Evidence Reviewer
- HITL approval
- Morning Report
- Feedback loop

Phase 2 只能在 Phase 1 實機 PASS 後開始規劃。

另請注意：repository root 的 `spec-phase2.md` 是財務系統功能規格，不是 OPC Agent Runtime 規格，不得引用為 OPC Phase 2 藍圖。

下一步只讀：

```text
11-Final/05-Phase-1-Release-and-Phase-2-Handoff.md
```

## 最終簽核

```text
驗收日期：
Windows build：
Handbook branch / commit：
Bootstrap state：
Verification report：
Evidence directory：
Backup restore evidence：
Phase 1 結果：PASS / CONDITIONAL / FAIL
Phase 2 狀態：NOT PLANNED / PLANNING BLOCKED / READY TO PLAN
驗收人：
未通過項目：
已接受 WARN / SKIP：
```

## Phase 1 判定標準

```text
Windows
+ Storage
+ Development
+ WSL2
+ Docker
+ Bootstrap
+ Runtime Foundation
+ Recovery rehearsal
+ verify-all 無 FAIL
= PASS / OPC AI WORKSTATION PHASE 1 READY
```

只有 Phase 1 PASS 後，才能把 Phase 2 狀態設為：

```text
READY TO PLAN
```

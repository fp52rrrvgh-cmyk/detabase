# 11-Final / 03 Full-System Acceptance

## 使用方式

這不是閱讀清單，而是實機驗收表。每一項必須有實際結果；不能靠「應該可以」勾選。

判定只有三種：

- PASS：已實測通過。
- CONDITIONAL：基礎層可用，但完整 OPC autonomous runtime 尚未實作或尚未驗證。
- FAIL：有關鍵項目失敗，不得投入正式工作。

## 1. Windows Host

- [ ] Windows 11 已完成更新且沒有等待重新啟動。
- [ ] Secure Boot 為 True。
- [ ] TPM Present / Ready 為 True。
- [ ] GPU、網路、音訊與藍牙正常。
- [ ] Defender 與 Firewall 啟用。
- [ ] 主要遊戲與反作弊正常。
- [ ] `03-Windows/07-Windows-Verification.md` 全部通過。

## 2. Storage

- [ ] C: 與 D: 為獨立 SSD。
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
- [ ] `docker run --rm hello-world` 成功。
- [ ] Compose 測試 stack healthy。
- [ ] Container 重建後資料仍存在。
- [ ] 必要 port 只綁定 localhost 或明確允許的介面。
- [ ] 有 NVIDIA 時，Windows 與 WSL2 的 `nvidia-smi` 成功。
- [ ] `06-WSL2-Docker/09-Verification.md` 全部通過。

## 5. Bootstrap

- [ ] `bootstrap.ps1 -Phase Preflight` 通過。
- [ ] Workspace phase 不會刪除既有資料。
- [ ] Tools phase 可安全重跑。
- [ ] WSL phase 不會 unregister distribution。
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

通過這一節，只代表 **Runtime foundation ready**。

## 7. Autonomous Runtime（尚未實作完成前不得勾選）

- [ ] Workflow application 可接受 Objective。
- [ ] Task 可 checkpoint / resume。
- [ ] Queue 可避免無限制重複執行。
- [ ] Capability Registry 會拒絕未註冊能力。
- [ ] Tool Gateway 會執行 auth、schema、timeout、audit 與 approval。
- [ ] Agent session 有獨立 workspace 與 credential scope。
- [ ] 每次工具呼叫可追蹤到 Objective / Task / Attempt。
- [ ] Evidence 有 checksum。
- [ ] 高風險操作需要 HITL。
- [ ] Morning Report 只根據真實 evidence 產生。

這些尚未實作或未驗證時，最終結果只能是 CONDITIONAL，不能是完整 PASS。

## 8. Recovery

- [ ] Recovery Package 位於外部位置。
- [ ] Handbook repository URL 與 commit SHA 已記錄。
- [ ] Git repository 可重新 clone。
- [ ] PostgreSQL dump checksum 正確。
- [ ] PostgreSQL dump 已測試還原。
- [ ] WSL distribution 可 export。
- [ ] BitLocker Key ID 與 recovery key 對應正確。
- [ ] `10-Security-Recovery/09-Bare-Metal-Rebuild.md` 已人工走讀。

## 9. 執行總驗收腳本

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

## 10. 最終安全測試

在完整 Autonomous Runtime 尚未實作前，人工執行：

```text
讀取指定 repository README
→ 產生摘要與風險清單
→ 保存到 D:\OPC\artifacts
→ 建立 SHA-256
→ 確認 repository 沒有被修改
```

完整 Runtime 完成後，再由 workflow application 執行同一 Objective，驗證全鏈路。

## 最終簽核

```text
驗收日期：
Windows build：
Handbook branch / commit：
Bootstrap state：
Verification report：
Evidence directory：
Backup restore evidence：
Autonomous Runtime：NOT IMPLEMENTED / PARTIAL / VERIFIED
驗收人：
結果：PASS / CONDITIONAL / FAIL
未通過項目：
```

## 判定標準

```text
Windows + Storage + Development + WSL2 + Docker + Bootstrap + Runtime Foundation 全部通過
但 Autonomous Runtime 尚未完成
= CONDITIONAL / READY FOR OPC APPLICATION DEVELOPMENT
```

```text
上述全部通過
+ Autonomous Runtime 全項實測
+ Recovery rehearsal 通過
= PASS / OPC AI WORKSTATION READY
```

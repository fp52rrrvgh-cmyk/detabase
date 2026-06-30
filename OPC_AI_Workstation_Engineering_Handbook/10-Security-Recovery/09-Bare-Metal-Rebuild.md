# 10-Security-Recovery / 09 Bare-Metal Rebuild

## 目標

在系統碟損壞、整機更換或完整重灌後，依手冊、Bootstrap 與外部備份重建 OPC AI Workstation。

## 重建前必須有的 Recovery Package

Recovery Package 不得只存在原電腦，至少包含：

- Windows 官方安裝來源與版本紀錄
- 主機板、CPU、RAM、GPU、兩顆 SSD 型號與序號末碼
- 本手冊 repository URL 與已驗證 commit SHA
- BitLocker recovery key 保存位置與 Key ID 對照
- GitHub、Microsoft 與必要服務的重新登入方式
- 重要 repository 清單
- PostgreSQL dump 與 SHA-256
- 外部備份位置
- Vault recovery 流程
- 必要 secrets 的重新取得方式，不含明文 secrets 清單

## Step 1：先判斷是哪一種重建

### A. 只有 Windows 系統碟損壞，D 槽仍正常

- 不格式化 D:。
- 不初始化 D:。
- 不移除 BitLocker protector。
- 重灌時優先拔除資料 SSD。

### B. Windows 與資料碟都需要重建

- 先確認外部備份已測試可讀。
- 先記錄兩顆新 SSD 的型號與用途。
- D 槽建立後才還原必要資料。

### C. 整機更換

- 重新確認 Windows 11、TPM、Secure Boot、虛擬化與驅動相容性。
- 不直接沿用舊機的硬體特定設定。

## Step 2：重建 Windows

依序執行：

```text
03-Windows/01-Windows-Installation.md
→ 03-Windows/02-Driver-Strategy.md
→ 03-Windows/03-Windows-Update.md
→ 03-Windows/07-Windows-Verification.md
```

Windows 驗收有 FAIL 就停止。

## Step 3：接回或建立 OPC 資料碟

### D 槽仍存在

執行：

```powershell
Get-Disk
Get-Volume
manage-bde -status
Test-Path D:\OPC
```

確認：

- D: 為正確 SSD。
- NTFS / OPC-DATA。
- BitLocker 已解鎖。
- `D:\OPC` 內容存在。

### 全新 D 槽

依：

```text
04-Storage/01-Disk-Layout.md
04-Storage/02-NTFS-Baseline.md
04-Storage/03-Workspace-Layout.md
```

建立 GPT / NTFS / OPC-DATA，再執行 workspace bootstrap。

## Step 4：取得手冊與腳本

先安裝 Git / GitHub CLI，重新登入後 clone 已驗證版本：

```powershell
Set-Location D:\OPC\projects
gh repo clone fp52rrrvgh-cmyk/detabase detabase
Set-Location .\detabase
git log -1 --oneline
```

確認 commit 與 Recovery Package 紀錄一致，再使用其中腳本。

## Step 5：執行 Bootstrap

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Preflight
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Workspace
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Tools
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase WSL
```

重開機、初始化 Ubuntu，再執行：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Docker
```

完成 Docker Desktop 人工設定後執行 Verify。

## Step 6：還原資料

還原順序：

1. Git repositories
2. 非敏感 config
3. PostgreSQL dump
4. 必要 artifacts / evidence
5. Secrets 由 vault 或人工重新交接
6. 最後才下載可重建的模型與 cache

不要還原：

- `node_modules`
- `.venv`
- Docker image cache
- 不必要 logs
- 舊的暫存 sandbox

這些應由 lock file 或 Compose 重建。

## Step 7：還原 Runtime foundation

1. 從 `templates/opc-core-compose.yaml` 建立 `D:\OPC\runtime\opc-core\compose.yaml`。
2. 重新建立 `.env`，不要從公開 repository 取得 secrets。
3. 啟動 PostgreSQL 與 Redis。
4. 將 database dump 還原到測試資料庫確認。
5. 確認後才還原正式 database。

## Step 8：完整驗收

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\verify-all.ps1
```

再完成：

```text
11-Final/03-Full-System-Acceptance.md
```

## Credential 處理

若舊電腦遭竊、磁碟遺失或可能被入侵：

- 撤銷 GitHub sessions / tokens
- 輪替 API keys
- 變更重要帳號密碼
- 撤銷舊 worker credentials
- 檢查 secrets 是否出現在 logs 或 Git history

## 完成條件

- [ ] 不依賴原系統碟即可重建。
- [ ] Git repositories 可恢復。
- [ ] PostgreSQL dump 可還原且 checksum 正確。
- [ ] WSL2、Docker、PostgreSQL、Redis 正常。
- [ ] `verify-all.ps1` 沒有 FAIL。
- [ ] 所有可能暴露的 credential 已輪替。
- [ ] 尚未實作的 autonomous runtime 沒有被誤標為完成。

## 停止條件

- 外部備份無法讀取。
- BitLocker recovery key 找不到。
- D 槽要求格式化。
- Handbook commit 無法確認。
- Database dump 無法還原。
- Verify 出現 FAIL。

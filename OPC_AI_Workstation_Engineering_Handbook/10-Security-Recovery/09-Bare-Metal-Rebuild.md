# 10-Security-Recovery / 09 Bare-Metal Rebuild

## 目標

在系統碟損壞、資料碟更換、整機更換或完整重灌後，只依手冊、Recovery Package 與外部備份重建 OPC AI Workstation。

重建過程不得依賴舊系統碟，也不得靠未記錄的個人記憶補步驟。

## Recovery Package 必要內容

Recovery Package 不得只存在原電腦，至少包含：

- Windows 官方安裝來源與版本紀錄
- 主機板、CPU、RAM、GPU、兩顆 SSD 型號與序號末碼
- OPC 資料磁碟 Volume UniqueId 或 Volume GUID 紀錄
- 本手冊 repository URL、branch/tag 與已驗證 commit SHA
- BitLocker recovery key 保存位置與 Key ID 對照
- GitHub、Microsoft 與必要服務的重新登入方式
- 重要 repository 清單
- PostgreSQL custom-format dump 與 SHA-256
- WSL export 檔與 SHA-256
- 外部備份位置
- Vault recovery 流程
- 必要 secrets 的重新取得方式，不含明文 secrets 清單
- 最近一次 `verify-all` JSON / Markdown 報告

## 重建演練紀錄

開始前建立不含 secrets 的紀錄：

```text
演練日期：
演練類型：OS SSD / Data SSD / Whole Machine / Windows Recovery
Handbook commit：
原 OPC Volume UniqueId：
備份位置：
開始時間：
目標 RTO：
目標 RPO：
執行人：
```

## Step 1：判斷重建類型

### A. 只有 Windows 系統碟損壞，D 槽仍正常

- 不格式化 D:。
- 不初始化 D:。
- 不移除 BitLocker protector。
- 重灌時優先拔除資料 SSD。
- 重裝後用 Volume UniqueId、標籤、容量與 SSD 序號重新辨識。

### B. Windows 與資料碟都需要重建

- 外部備份必須已測試可讀。
- 記錄兩顆新 SSD 的型號、序號與用途。
- 建立全新 D 槽後，先驗證 NTFS / OPC-DATA，再還原資料。

### C. 整機更換

- 重新確認 Windows 11、TPM、Secure Boot、虛擬化與驅動相容性。
- 不直接沿用舊機的 BIOS、GPU、電源或硬體特定設定。
- 舊 OPC Volume UniqueId 只作為歷史證據，新磁碟會產生新的識別值。

### D. Windows 無法開機但磁碟可能正常

- 先確認 BitLocker recovery key。
- 先嘗試 WinRE 或官方安裝媒體的修復選項。
- 無法確認資料安全時，不執行 Reset 或格式化。

## Step 2：重建 Windows

依序執行：

```text
03-Windows/01-Windows-Installation.md
→ 03-Windows/02-Driver-Strategy.md
→ 03-Windows/03-Windows-Update.md
→ 03-Windows/05-Hyper-V-and-Virtualization.md
→ 03-Windows/07-Windows-Verification.md
```

Windows 驗收有 FAIL 就停止。

保存證據：

```powershell
Confirm-SecureBootUEFI
Get-Tpm
Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber
Get-PnpDevice | Where-Object Status -ne 'OK'
```

## Step 3：接回或建立 OPC 資料碟

### D 槽仍存在

執行：

```powershell
Get-Disk | Format-Table Number,FriendlyName,SerialNumber,PartitionStyle,Size,OperationalStatus
Get-Volume -DriveLetter D | Format-List DriveLetter,FileSystemLabel,FileSystem,HealthStatus,Size,SizeRemaining,UniqueId,Path
manage-bde -status D:
Test-Path D:\OPC
```

確認：

- D: 為正確 SSD。
- FileSystem 是 NTFS。
- FileSystemLabel 是 OPC-DATA。
- HealthStatus 是 Healthy。
- BitLocker 已解鎖。
- Volume UniqueId 與 Recovery Package 紀錄相符。
- `D:\OPC` 內容存在。

若磁碟代號不是 D:，先依 UniqueId、標籤、容量與序號辨識，確認後才調整代號。

### 全新 D 槽

依序執行：

```text
04-Storage/01-Disk-Layout.md
04-Storage/02-NTFS-Baseline.md
04-Storage/03-Workspace-Layout.md
```

建立 GPT / NTFS / OPC-DATA，再記錄新的 UniqueId：

```powershell
Get-Volume -DriveLetter D | Select-Object DriveLetter,FileSystemLabel,FileSystem,HealthStatus,UniqueId,Path
```

## Step 4：取得已驗證手冊

先安裝 Git / GitHub CLI，重新登入後 clone：

```powershell
Set-Location D:\OPC\projects
gh repo clone fp52rrrvgh-cmyk/detabase detabase
Set-Location .\detabase
git status
git log -1 --format='%H %s'
```

確認完整 commit SHA 與 Recovery Package 紀錄一致，再使用其中腳本。

如果原 commit 不存在或無法取得，不要直接使用未審核的新版本繼續重建。

## Step 5：執行 Bootstrap

先 dry-run：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Preflight -DryRun
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Tools -DryRun
```

再逐階段執行：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Preflight
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Workspace
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Tools
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase WSL
```

重開機、初始化 Ubuntu，再執行：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Docker
```

完成 Docker Desktop 人工設定後，不直接宣告成功；必須繼續 Runtime 與 Verify。

## Step 6：還原資料

還原順序：

1. Git repositories
2. 非敏感 config
3. 必要 artifacts / evidence
4. WSL distribution 或依手冊重建 Linux 環境
5. PostgreSQL dump
6. Secrets 由 vault 或人工重新交接
7. 最後才下載可重建的模型與 cache

不要還原：

- `node_modules`
- `.venv`
- Docker image cache
- 不必要 logs
- 舊暫存 sandbox

這些必須由 lock file、Bootstrap 或 Compose 重建。

## Step 7：WSL 還原驗證

依：

```text
06-WSL2-Docker/01-WSL2-Install-and-Initialize.md
```

使用外部保存的 export 檔匯入測試 distribution，驗證：

- VERSION 2
- 可啟動 Linux shell
- `/mnt/d/OPC` 可讀寫
- SHA-256 與 Recovery Package 一致

原 production distribution 尚未確認可恢復前，不刪除任何舊 distribution。

## Step 8：還原 Runtime Foundation

1. 從 `templates/opc-core-compose.yaml` 建立 `D:\OPC\runtime\opc-core\compose.yaml`。
2. 重新建立 `.env`，不得從公開 repository 取得 secrets。
3. 執行 `docker compose config`。
4. 啟動 PostgreSQL 與 Redis。
5. 確認兩個服務 healthy。
6. 先將 database dump 還原到 `opc_restore_test`。
7. 驗證 probe table 與資料。
8. 測試成功後，才規劃正式 database 還原。

依：

```text
04-Storage/05-Docker-Volumes-and-Data.md
```

## Step 9：完整驗收

執行：

```powershell
$ExpectedUniqueId = '<RECOVERY_PACKAGE_RECORDED_UNIQUE_ID>'

.\OPC_AI_Workstation_Engineering_Handbook\scripts\verify-all.ps1 `
  -ExpectedVolumeUniqueId $ExpectedUniqueId `
  -OutputJson 'D:\OPC\artifacts\verification\rebuild-final.json' `
  -OutputMarkdown 'D:\OPC\artifacts\verification\rebuild-final.md'
```

全新資料 SSD 的 UniqueId 一定會不同；此時先更新 Recovery Package，再使用新值驗收。

再完成：

```text
11-Final/03-Full-System-Acceptance.md
```

## Step 10：Credential 處理

若舊電腦遭竊、磁碟遺失或可能被入侵：

- 撤銷 GitHub sessions / tokens
- 輪替 API keys
- 變更重要帳號密碼
- 撤銷舊 worker credentials
- 檢查 secrets 是否出現在 logs 或 Git history

若只是正常重灌且沒有暴露跡象，仍需確認 token scope 與未使用 credential，不必無差別輪替所有秘密。

## 驗收證據表

| 項目 | 證據位置 | 結果 |
|---|---|---|
| Windows / Secure Boot / TPM |  | PASS / FAIL |
| D: UniqueId / Label / NTFS |  | PASS / FAIL |
| BitLocker Key ID 核對 |  | PASS / FAIL |
| Git clone 與 commit SHA |  | PASS / FAIL |
| Bootstrap log / state |  | PASS / FAIL |
| WSL export/import |  | PASS / FAIL |
| PostgreSQL restore |  | PASS / FAIL |
| Redis / PostgreSQL health |  | PASS / FAIL |
| verify-all JSON / MD |  | PASS / FAIL |
| 外部備份 checksum |  | PASS / FAIL |

## RTO / RPO 紀錄

```text
實際完成時間：
實際 RTO：
最後可恢復資料時間點：
實際 RPO：
是否達標：是 / 否
未記錄步驟：
需回填手冊內容：
```

只要出現「靠記憶補步驟」或「臨時上網才知道怎麼做」，都必須記錄並回填手冊。

## 完成條件

- [ ] 不依賴原系統碟即可重建。
- [ ] OPC 資料磁碟已用 UniqueId、標籤、容量與序號確認。
- [ ] Git repositories 可恢復到指定 commit。
- [ ] WSL export 可匯入並啟動。
- [ ] PostgreSQL dump 可還原且 checksum 正確。
- [ ] Docker Desktop 沒有與 WSL 內第二套 daemon 衝突。
- [ ] WSL2、Docker、PostgreSQL、Redis 正常。
- [ ] `verify-all.ps1` 沒有 FAIL。
- [ ] 所有可能暴露的 credential 已輪替。
- [ ] RTO / RPO 與未記錄步驟已保存。
- [ ] 尚未實作的 autonomous runtime 沒有被誤標為完成。

## 停止條件

- 外部備份無法讀取。
- BitLocker recovery key 找不到或 Key ID 不符。
- D 槽要求格式化。
- OPC Volume UniqueId、序號、容量與標籤無法辨識。
- Handbook commit 無法確認。
- WSL export 無法匯入。
- Database dump 無法還原。
- Docker 發現兩套同時運作的 daemon。
- Verify 出現 FAIL。

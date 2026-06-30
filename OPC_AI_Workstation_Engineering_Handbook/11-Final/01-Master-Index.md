# 11-Final / 01 Master Index

## 這是唯一施工入口

重灌與建置時只照本頁順序進行，不要跳章。

固定規則：

1. 一次只做一個階段。
2. 每階段完成驗收後才進下一階段。
3. 看到停止條件就停止，不自行猜測。
4. 任何包含 format、initialize、clean、reset、prune、unregister、`down -v` 的操作，都要先確認外部備份。
5. 所有腳本必須在 PowerShell 7.4 以上執行。
6. 實機驗收報告必須保存到 `D:\OPC\artifacts\verification`。

---

# Phase 0：重灌前保命

閱讀：

```text
04-Storage/06-Backup-Strategy.md
04-Storage/08-BitLocker-and-Recovery-Key.md
10-Security-Recovery/09-Bare-Metal-Rebuild.md
```

必須完成：

- [ ] 重要 Git commit 已 push。
- [ ] PostgreSQL dump 已建立並在測試資料庫還原。
- [ ] 重要文件已複製到外部媒介並能打開。
- [ ] BitLocker recovery key 已實際取回，且 Key ID 對得上磁碟。
- [ ] Windows 安裝 USB 可開機。
- [ ] 兩顆 SSD 的型號、序號末碼與容量已記錄。

停止條件：任何一項未完成。

---

# Phase 1：BIOS 與 Windows 11

依序閱讀：

```text
03-Windows/01-Windows-Installation.md
03-Windows/02-Driver-Strategy.md
03-Windows/03-Windows-Update.md
03-Windows/05-Hyper-V-and-Virtualization.md
03-Windows/06-Defender-and-Security-Baseline.md
03-Windows/07-Windows-Verification.md
```

施工順序：

```text
確認 UEFI / TPM / Secure Boot / Virtualization
→ 優先拔除 OPC 資料 SSD
→ 只在系統 SSD 安裝 Windows 11
→ Windows Update
→ 晶片組 / 網路 / 音訊 / GPU 驅動
→ 接回 OPC 資料 SSD
→ Windows 驗收
```

最小驗收：

```powershell
Confirm-SecureBootUEFI
Get-Tpm
Get-MpComputerStatus
Get-PnpDevice | Where-Object Status -ne 'OK'
```

停止條件：

- 看不懂哪顆是系統 SSD。
- TPM 或 Secure Boot 未通過。
- 接回資料 SSD 後 Windows 要求初始化或格式化。
- 裝置管理員出現重要裝置錯誤。

---

# Phase 2：Storage 與 D:\OPC

依序閱讀：

```text
04-Storage/01-Disk-Layout.md
04-Storage/02-NTFS-Baseline.md
04-Storage/03-Workspace-Layout.md
04-Storage/08-BitLocker-and-Recovery-Key.md
04-Storage/09-Storage-Verification.md
```

先人工確認：

```powershell
Get-Disk | Format-Table Number,FriendlyName,SerialNumber,PartitionStyle,Size,OperationalStatus
Get-Volume | Format-Table DriveLetter,FileSystemLabel,FileSystem,HealthStatus,Size,SizeRemaining
manage-bde -status
```

D: 必須符合：

```text
正確的實體資料 SSD
NTFS
標籤 OPC-DATA
Healthy
不是 RAW
```

取得手冊 repository 後，先預覽 Workspace 建立：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap-opc-workspace.ps1 -Root 'D:\OPC' -WhatIf
```

確認後正式執行：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap-opc-workspace.ps1 -Root 'D:\OPC'
```

停止條件：D: 型號、檔案系統、標籤、BitLocker 狀態任一不明。

---

# Phase 3：Bootstrap Preflight

主腳本：

```text
scripts/bootstrap.ps1
```

必須使用 PowerShell 7.4 以上、系統管理員身分執行。

先執行完全不寫入的預覽：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Preflight -DryRun
```

再正式執行：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Preflight
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Workspace
```

Preflight 只有在 Windows 11、Secure Boot、TPM、D: NTFS / OPC-DATA / Healthy 全部通過時才會成功。

---

# Phase 4：開發工具

閱讀：

```text
05-Development/01-Git-Baseline.md
05-Development/02-GitHub-CLI.md
05-Development/03-VS-Code.md
05-Development/04-Python-and-uv.md
05-Development/05-Node-and-pnpm.md
05-Development/07-Development-Verification.md
```

先預覽 WinGet 套件解析與安裝：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Tools -DryRun
```

正式安裝：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Tools
```

腳本會先對每個 package ID 執行精確解析；解析失敗就停止，不會靜默跳過。

關閉並重新開啟 PowerShell 7，再執行：

```powershell
git --version
gh --version
code --version
pwsh --version
python --version
node --version
```

依章節完成人工安裝與驗證：

```powershell
uv --version
pnpm --version
gh auth login
gh auth status
```

停止條件：PATH 出現多個來源不明的 Python 或 Node、GitHub 登入錯誤帳號、套件 ID 無法精確解析。

---

# Phase 5：WSL2

閱讀：

```text
06-WSL2-Docker/01-WSL2-Install-and-Initialize.md
06-WSL2-Docker/02-WSLConfig-Resource-Limits.md
```

預覽與執行：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase WSL -DryRun
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase WSL
```

腳本會區分既有 WSL 與全新安裝，不會 unregister distribution。

依提示重新開機，建立 Ubuntu 使用者，再驗收：

```powershell
wsl --version
wsl --status
wsl -l -v
```

Ubuntu 必須是 VERSION 2，且 `/mnt/d/OPC` 可讀寫。

禁止在 Ubuntu 裡另外安裝一套 Docker Engine，若仍要使用 Docker Desktop。

---

# Phase 6：Docker Desktop

閱讀：

```text
06-WSL2-Docker/04-Docker-Desktop-Install.md
06-WSL2-Docker/05-Docker-Compose-Standard.md
06-WSL2-Docker/09-Verification.md
```

預覽與安裝：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Docker -DryRun
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Docker
```

人工完成：

1. 啟動 Docker Desktop。
2. 接受授權條款。
3. 使用 WSL2 backend。
4. 啟用主要 Ubuntu integration。
5. 等待 Docker Engine Ready。

最小驗收：

```powershell
docker version
docker info
docker run --rm hello-world
docker compose version
```

禁止：

```text
docker system prune --volumes
docker compose down -v
Docker Desktop Factory Reset
wsl --unregister
```

---

# Phase 7：Runtime Foundation

閱讀：

```text
07-AI-Runtime/01-Runtime-Architecture.md
04-Storage/05-Docker-Volumes-and-Data.md
```

建立 Runtime：

```powershell
$Runtime = 'D:\OPC\runtime\opc-core'
New-Item -ItemType Directory -Path $Runtime -Force | Out-Null
Copy-Item .\OPC_AI_Workstation_Engineering_Handbook\templates\opc-core-compose.yaml (Join-Path $Runtime 'compose.yaml')
Set-Location $Runtime
```

建立未進 Git 的 `.env`，再執行：

```powershell
docker compose config
docker compose -p opc-core up -d
docker compose -p opc-core ps
```

驗收：

```powershell
docker compose -p opc-core exec -T postgres psql -U opc -d opc -c "SELECT now();"
docker compose -p opc-core exec -T redis redis-cli ping
```

Redis 必須回傳 `PONG`；PostgreSQL 與 Redis 必須為 healthy。

再依章節完成 container 重建與資料持久化測試。

---

# Phase 8：全機驗收

執行：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\verify-all.ps1
```

也可指定報告路徑：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\verify-all.ps1 `
  -OutputJson 'D:\OPC\artifacts\verification\final.json' `
  -OutputMarkdown 'D:\OPC\artifacts\verification\final.md'
```

結果規則：

- PASS：基礎工作站驗收通過。
- CONDITIONAL：沒有 FAIL，但存在已理解的 WARN 或 SKIP。
- FAIL：立即停止，回到對應章節修正。

`verify-all.ps1` 的 exit code：

```text
0 = PASS 或 CONDITIONAL
1 = FAIL
2 = 腳本或輸出環境錯誤
```

---

# Phase 9：Recovery 演練

至少完成：

- [ ] BitLocker recovery key 找回與 Key ID 對照。
- [ ] WSL export / import 測試。
- [ ] PostgreSQL dump / restore 測試。
- [ ] 刪除測試工作樹後重新 clone Git repository。

依照：

```text
10-Security-Recovery/09-Bare-Metal-Rebuild.md
11-Final/03-Full-System-Acceptance.md
```

沒有實際 restore 的 backup，不算通過。

---

# Phase 10：最終判定

```text
Windows
+ Storage
+ Development
+ WSL2
+ Docker
+ Runtime Foundation
+ verify-all 無 FAIL
+ Recovery 測試通過
= READY FOR OPC APPLICATION DEVELOPMENT
```

這不等於 Autonomous Runtime 已完成。

只有 Objective workflow、checkpoint/resume、Capability Registry、Tool Gateway、Agent isolation、Evidence Reviewer、HITL 與 Morning Report 都實作並完成實測後，才能宣告：

```text
OPC AI WORKSTATION READY
```

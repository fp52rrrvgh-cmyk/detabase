# OPC 建置與使用說明書

## 這一頁是唯一入口

這份說明書的目的，是把一台乾淨的 Windows 電腦，準備成可以承載 OPC 的工作站。

OPC 在這裡指的是：

> 一套由多個 AI Worker 協作完成工作的單人公司系統。

你下達目標後，未來的 OPC 應該能自己拆解、研究、施工、驗證，再把結果交給你驗收。

這一階段只是在準備地基，不是在建立完整的多 Agent 公司。

---

## 先知道你正在建立什麼

整台電腦可以先這樣理解：

```text
Windows
  └─ 你平常使用的桌面環境

WSL2
  └─ Windows 裡的 Linux 工作區

Docker
  └─ 讓不同服務各自在自己的空間執行

PostgreSQL
  └─ 保存 OPC 的正式資料

Redis
  └─ 保存暫時狀態、工作佇列與快速資料

Git / GitHub
  └─ 保存程式與修改紀錄

Python / Node.js
  └─ 執行未來的 OPC 程式與工具
```

目前只需要理解它們各自負責什麼，不需要先學會所有底層原理。

---

## 使用原則

1. 一次只做一個階段。
2. 每個階段先看「為什麼做」，再照步驟操作。
3. 看不懂磁碟、資料刪除或格式化指令時，先停止。
4. 一般安裝錯誤可以修正，不需要把每一個警告都當成災難。
5. BitLocker、TPM、Secure Boot、GitHub 兩步驟驗證都不是 OPC 運作的必要條件。
6. 它們若已經啟用，可以保留；若沒有，不需要為了本手冊額外啟用。
7. 本手冊的成功標準是：你知道每一步在做什麼，而且最後可以正常使用 WSL2、Docker 與 OPC 基礎服務。

---

# 第 0 階段：重灌前準備

## 為什麼要做

避免把真正重要的個人資料一起刪掉。

## 你要做的事

- 確認重要文件已複製到其他硬碟或雲端。
- 確認 GitHub 上需要保留的程式已經 push。
- 準備可開機的 Windows 11 安裝 USB。
- 記下哪一顆 SSD 要安裝 Windows，哪一顆要保存 OPC 資料。

## 不需要做的事

- 不必特別啟用 BitLocker。
- 不必建立企業級備份制度。
- 不必製作大量稽核紀錄。

## 只有以下情況要停止

- 你不確定哪顆硬碟可以清除。
- 重要資料尚未備份。

進一步資料：

```text
04-Storage/06-Backup-Strategy.md
10-Security-Recovery/09-Bare-Metal-Rebuild.md
```

這兩章是查詢資料，不是每次都必須全部執行。

---

# 第 1 階段：安裝 Windows 11

## 為什麼要做

建立乾淨、穩定的基本系統。

## 完成後會得到什麼

- 可正常開機的 Windows 11。
- 正常的網路、音效與顯示卡驅動。
- 可辨識的系統碟與資料碟。

## 建議順序

```text
確認系統 SSD
→ 安裝 Windows 11
→ 執行 Windows Update
→ 安裝晶片組、網路、音訊與顯示卡驅動
→ 確認裝置管理員沒有明顯錯誤
```

## 可選設定

TPM、Secure Boot、Defender 與 BitLocker 都屬於 Windows 安全功能。

- 原本已啟用：保留即可。
- 沒有啟用：不影響後續學習 WSL2、Docker 與建立 OPC。

參考章節：

```text
03-Windows/01-Windows-Installation.md
03-Windows/02-Driver-Strategy.md
03-Windows/03-Windows-Update.md
03-Windows/05-Hyper-V-and-Virtualization.md
03-Windows/07-Windows-Verification.md
```

---

# 第 2 階段：準備 D:\OPC 工作區

## 為什麼要做

把 OPC 的程式、資料、服務與輸出集中在固定位置，避免日後散落各處。

## 完成後會得到什麼

```text
D:\OPC
  ├─ projects      專案
  ├─ runtime       執行中的服務
  ├─ data          資料
  ├─ backups       備份
  └─ artifacts     測試結果與輸出
```

## 先確認 D: 是正確的資料碟

```powershell
Get-Disk | Format-Table Number,FriendlyName,SerialNumber,PartitionStyle,Size,OperationalStatus
Get-Volume | Format-Table DriveLetter,FileSystemLabel,FileSystem,HealthStatus,Size,SizeRemaining
```

你只需要確認：

- D: 是預定的資料 SSD。
- 檔案系統是 NTFS。
- 磁碟健康狀態正常。

磁碟標籤 `OPC-DATA` 是方便辨識，不是必要條件。

## 建立工作區

先預覽：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap-opc-workspace.ps1 -Root 'D:\OPC' -WhatIf
```

確認畫面沒有指向錯誤磁碟後，再執行：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap-opc-workspace.ps1 -Root 'D:\OPC'
```

---

# 第 3 階段：安裝開發工具

## 為什麼要做

未來 OPC 的 AI Worker 需要這些工具讀取程式、修改檔案與執行任務。

## 各工具的用途

| 工具 | 用途 |
|---|---|
| Git | 保存每次修改，必要時可以回到之前狀態 |
| GitHub CLI | 從終端機操作 GitHub |
| VS Code | 查看與編輯程式及設定檔 |
| PowerShell 7 | 執行 Windows 自動化腳本 |
| Python | 執行 AI、資料處理與後端工具 |
| Node.js | 執行網頁、介面與部分 Agent 工具 |
| uv | 管理 Python 套件 |
| pnpm | 管理 Node.js 套件 |

## 安裝

先預覽：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Tools -DryRun
```

再正式安裝：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Tools
```

重新開啟 PowerShell 7 後檢查：

```powershell
git --version
gh --version
code --version
pwsh --version
python --version
node --version
uv --version
pnpm --version
```

只要每個指令都有版本號，就代表工具已經可以使用。

參考章節：

```text
05-Development/01-Git-Baseline.md
05-Development/02-GitHub-CLI.md
05-Development/03-VS-Code.md
05-Development/04-Python-and-uv.md
05-Development/05-Node-and-pnpm.md
```

---

# 第 4 階段：安裝 WSL2

## WSL2 是什麼

WSL2 讓 Windows 裡面可以直接使用 Linux。

未來許多 AI、Agent、Docker 與開發工具在 Linux 環境中更容易運作，因此 OPC 需要一個 Linux 工作區。

## 它不是什麼

- 它不是另一台實體電腦。
- 它不會取代 Windows。
- 它只是 Windows 裡的一個 Linux 環境。

## 安裝

先預覽：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase WSL -DryRun
```

再執行：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase WSL
```

依畫面提示重新開機，建立 Ubuntu 使用者後檢查：

```powershell
wsl --version
wsl --status
wsl -l -v
```

只要 Ubuntu 顯示 `VERSION 2`，就代表 WSL2 已經正常。

參考章節：

```text
06-WSL2-Docker/01-WSL2-Install-and-Initialize.md
06-WSL2-Docker/02-WSLConfig-Resource-Limits.md
```

---

# 第 5 階段：安裝 Docker Desktop

## Docker 是什麼

Docker 讓不同服務在彼此分開的空間裡執行。

你可以把它想成：

> 每個服務都有自己的工作箱，壞掉時可以重新建立，不需要把整台 Windows 重裝。

## OPC 為什麼需要 Docker

未來 PostgreSQL、Redis、Agent Runtime 與其他服務可以透過 Docker 統一啟動、停止與重建。

## 安裝

先預覽：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Docker -DryRun
```

再執行：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\bootstrap.ps1 -Phase Docker
```

打開 Docker Desktop 後：

1. 接受授權條款。
2. 使用 WSL2 backend。
3. 啟用主要 Ubuntu integration。
4. 等待畫面顯示 Docker Engine Ready。

## 確認是否成功

```powershell
docker version
docker info
docker run --rm hello-world
docker compose version
```

看到 `Hello from Docker!`，就代表 Docker 可以正常啟動容器。

## 暫時不要使用的指令

以下指令可能刪除容器或資料。看不懂時不要執行：

```text
docker system prune --volumes
docker compose down -v
Docker Desktop Factory Reset
wsl --unregister
```

---

# 第 6 階段：啟動 OPC 基礎服務

## 你正在建立什麼

這一步不是建立完整的多 Agent OPC。

它只是先建立兩個未來一定會用到的基礎服務：

| 服務 | 簡單用途 |
|---|---|
| PostgreSQL | 保存專案、任務、紀錄與正式資料 |
| Redis | 保存工作佇列、暫時狀態與快速資料 |

## 建立服務資料夾

```powershell
$Runtime = 'D:\OPC\runtime\opc-core'
New-Item -ItemType Directory -Path $Runtime -Force | Out-Null
Copy-Item .\OPC_AI_Workstation_Engineering_Handbook\templates\opc-core-compose.yaml (Join-Path $Runtime 'compose.yaml')
Set-Location $Runtime
```

依章節建立 `.env` 後，先檢查設定：

```powershell
docker compose config
```

沒有錯誤後啟動：

```powershell
docker compose -p opc-core up -d
docker compose -p opc-core ps
```

## 確認服務是否正常

```powershell
docker compose -p opc-core exec -T postgres psql -U opc -d opc -c "SELECT now();"
docker compose -p opc-core exec -T redis redis-cli ping
```

- PostgreSQL 回傳目前時間：正常。
- Redis 回傳 `PONG`：正常。

參考章節：

```text
07-AI-Runtime/01-Runtime-Architecture.md
04-Storage/05-Docker-Volumes-and-Data.md
```

---

# 第 7 階段：執行整體檢查

## verify-all 是什麼

它是一支自動檢查程式，用來一次確認：

- Windows 基本環境。
- Git、Python、Node.js 等工具。
- WSL2。
- Docker。
- PostgreSQL 與 Redis。

它不是考試，也不是企業稽核。

## 執行

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\verify-all.ps1
```

## 如何看結果

| 結果 | 意思 |
|---|---|
| PASS | 已正常通過 |
| CONDITIONAL | 可以使用，但有提醒事項 |
| FAIL | 某個必要項目沒有正常工作 |

如果出現 FAIL，只需要回到對應的安裝階段處理，不需要重灌整台電腦。

進階輸出報告屬於可選功能：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\verify-all.ps1 `
  -OutputJson 'D:\OPC\artifacts\verification\final.json' `
  -OutputMarkdown 'D:\OPC\artifacts\verification\final.md'
```

---

# 第 8 階段：實際重建測試

## Bare-metal Validation 是什麼

它的意思很簡單：

> 從一台乾淨電腦開始，照這份說明書能不能重新建立相同環境。

它不是現在每次使用 OPC 都要做的事情。

只需要在 Phase 1 最終驗收時完整做一次，用來確認說明書沒有漏步驟。

## 最低成功條件

- Windows 可以正常使用。
- 開發工具都有版本輸出。
- WSL2 的 Ubuntu 是 VERSION 2。
- Docker 可以執行 hello-world。
- PostgreSQL 可以查詢。
- Redis 回傳 PONG。
- `verify-all.ps1` 沒有 FAIL。

以下項目屬於可選進階測試，不再是 Phase 1 必要門檻：

- BitLocker recovery key 演練。
- WSL export / import。
- PostgreSQL dump / restore。
- 完整災難復原演練。

參考章節：

```text
10-Security-Recovery/09-Bare-Metal-Rebuild.md
11-Final/03-Full-System-Acceptance.md
```

---

# Phase 1 完成代表什麼

完成這份說明書後，你得到的是：

```text
一台乾淨的 Windows 工作站
+ Linux 工作區（WSL2）
+ 容器執行環境（Docker）
+ 開發工具
+ PostgreSQL
+ Redis
+ 可重複執行的安裝與檢查腳本
```

這代表：

> 電腦已經準備好，可以開始建立真正的多 Agent OPC。

它不代表多 Agent 協作已經完成。

---

# Phase 2 才會建立的內容

Phase 2 才負責研究與建立：

```text
CEO 下達目標
→ OPC 自動拆解工作
→ 多個 AI Worker 分工協作
→ 自動搜尋資料
→ 自動施工
→ 自動測試與驗證
→ 整理成果
→ 早上交給 CEO 驗收
```

可能包含的元件：

- 任務規劃與拆解。
- Research Worker。
- Coding Worker。
- QA / Reviewer Worker。
- Worker 之間的協作方式。
- 任務狀態與進度畫面。
- Morning Report。
- 必要時才使用的 MCP、Agent Runtime 或其他框架。

工具名稱不是目標。

真正目標始終是：

> 讓多個 AI Worker 像一間公司一樣協作，而你只需要下達目標與驗收成果。

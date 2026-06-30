# 08-Bootstrap / 10 端對端驗收

## 目標

驗證剛完成 Windows 11 全新安裝的電腦，可以依手冊與腳本建成「可開始 OPC 應用層開發」的工作站。

## 驗收主線

```text
Clean Windows
→ Windows Verification
→ Storage Verification
→ Development Verification
→ WSL2 / Docker Verification
→ Runtime Foundation
→ verify-all.ps1
→ Full-System Acceptance
```

## Step 1：Windows 與 Storage

必須先完成：

```text
03-Windows/07-Windows-Verification.md
04-Storage/09-Storage-Verification.md
```

通過條件：

- Windows 11、Secure Boot、TPM、驅動正常。
- C: 與 D: 是正確的獨立 SSD。
- D: 為 NTFS / OPC-DATA。
- BitLocker recovery key 可取得。
- 外部備份已完成抽樣還原。

## Step 2：Bootstrap Preflight 與 Workspace

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\bootstrap.ps1 -Phase Preflight
.\scripts\bootstrap.ps1 -Phase Workspace
```

驗證：

- `D:\OPC` 標準目錄完整。
- `.opc-workspace.json` 存在。
- 重跑 Workspace phase 不刪除既有資料。

## Step 3：Developer Tools

```powershell
.\scripts\bootstrap.ps1 -Phase Tools
```

重新開啟 PowerShell 後執行：

```powershell
git --version
gh --version
code --version
pwsh --version
python --version
uv --version
node --version
pnpm --version
```

若 uv 或 pnpm 尚未可用，依 Development 章節完成人工安裝與驗證。

GitHub CLI 需人工登入：

```powershell
gh auth login
gh auth status
```

## Step 4：WSL2

```powershell
.\scripts\bootstrap.ps1 -Phase WSL
```

依提示重開機，建立 Ubuntu username/password，再完成：

```text
06-WSL2-Docker/01-WSL2-Install-and-Initialize.md
06-WSL2-Docker/02-WSLConfig-Resource-Limits.md
```

驗證：

```powershell
wsl --version
wsl -l -v
```

Ubuntu 必須為 VERSION 2。

## Step 5：Docker Desktop

```powershell
.\scripts\bootstrap.ps1 -Phase Docker
```

人工完成：

- 啟動 Docker Desktop。
- 接受授權條款。
- 使用 WSL2 backend。
- 啟用主要 Ubuntu integration。

驗證：

```powershell
docker version
docker run --rm hello-world
```

## Step 6：Runtime Foundation

```powershell
$Runtime = 'D:\OPC\runtime\opc-core'
New-Item -ItemType Directory -Path $Runtime -Force | Out-Null
Copy-Item .\templates\opc-core-compose.yaml (Join-Path $Runtime 'compose.yaml')
Set-Location $Runtime
```

建立 `.env` 並填入長且隨機的 PostgreSQL password，然後：

```powershell
docker compose config
docker compose -p opc-core up -d
docker compose -p opc-core ps
```

驗證 PostgreSQL：

```powershell
docker compose -p opc-core exec -T postgres psql -U opc -d opc -c "SELECT now();"
```

驗證 Redis：

```powershell
docker compose -p opc-core exec -T redis redis-cli ping
```

Redis 應回傳 `PONG`。

## Step 7：持久化測試

在 PostgreSQL 建立測試 table，在 Redis 建立測試 Stream，再執行：

```powershell
docker compose -p opc-core down
docker compose -p opc-core up -d
```

不要加 `-v`。

重新檢查 PostgreSQL 與 Redis 測試資料仍存在。

## Step 8：Bootstrap 重跑

重新執行：

```powershell
.\scripts\bootstrap.ps1 -Phase Preflight
.\scripts\bootstrap.ps1 -Phase Workspace
```

預期：

- 已存在目錄保留。
- 既有專案不被刪除。
- Named volume 不受影響。
- State 與 log 正常更新。

## Step 9：失敗處理測試

使用安全方式製造失敗，例如暫時把 WorkspaceRoot 指向不存在或標籤不正確的磁碟。

預期：

- Bootstrap 停止。
- Exit code 非 0。
- `state.json` 標記 failed。
- Log 保存失敗原因。
- 後續 phase 不繼續執行。

不要用刪除 volume、格式化磁碟或 unregister WSL 來測試失敗處理。

## Step 10：總驗收

```powershell
Set-Location <HANDBOOK_REPOSITORY_PATH>
.\scripts\verify-all.ps1
```

通過條件：

- 沒有 FAIL。
- WARN 已理解並記錄。
- SKIP 只用於明確不適用項目。
- JSON 與 Markdown report 已保存。

## Step 11：第一個低風險 Objective

在 Autonomous Runtime 尚未實作前，人工執行：

```text
讀取指定 repository README
→ 產生摘要與風險清單
→ 保存 artifact
→ 建立 SHA-256
→ 確認 repository 無修改
```

這一步驗證工作區、artifact 與 evidence 流程，不代表 Autonomous Runtime 已完成。

## 最終結果

```text
Windows / Storage / Development / WSL2 / Docker / Bootstrap / Runtime Foundation 全部通過
+ verify-all 無 FAIL
= READY FOR OPC APPLICATION DEVELOPMENT
```

```text
上述全部
+ Autonomous Runtime 實作並通過 Objective 全鏈路
+ Recovery rehearsal 通過
= OPC AI WORKSTATION READY
```

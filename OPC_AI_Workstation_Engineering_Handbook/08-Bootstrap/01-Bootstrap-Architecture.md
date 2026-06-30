# 08-Bootstrap / 01 Bootstrap 施工入口

## 目標

讓剛完成 Windows 11 全新安裝的電腦，依固定順序建成可驗收的 OPC AI Workstation。

Bootstrap 不是「全自動亂裝」。它只處理可以安全自動化的項目；BIOS、BitLocker、磁碟格式化、GitHub 登入、Docker Desktop 首次授權與 secrets 仍由人處理。

## 主腳本

Repository 內：

```text
scripts\bootstrap.ps1
```

複製到工作區後建議位置：

```text
D:\OPC\tools\bootstrap.ps1
```

## 執行前條件

以下必須先人工完成：

- [ ] Windows 11 已安裝並完成 Windows Update。
- [ ] Secure Boot、TPM、虛擬化正常。
- [ ] D: 是正確資料 SSD。
- [ ] D: 為 NTFS，標籤 `OPC-DATA`。
- [ ] BitLocker recovery key 可取得。
- [ ] 重要資料已有外部備份並測試還原。

沒有全部通過，不執行 Bootstrap。

## 第一次執行

以系統管理員身分開啟 PowerShell 7，進入手冊 repository：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\bootstrap.ps1 -Phase Preflight
```

只有 Preflight 通過後，才依序執行：

```powershell
.\scripts\bootstrap.ps1 -Phase Workspace
.\scripts\bootstrap.ps1 -Phase Tools
.\scripts\bootstrap.ps1 -Phase WSL
```

WSL 安裝後若要求重開機：

1. 關閉正在執行的程式。
2. 重新開機。
3. 完成 Ubuntu 首次使用者建立。
4. 再執行 Docker phase。

```powershell
.\scripts\bootstrap.ps1 -Phase Docker
```

Docker Desktop 安裝後：

1. 手動啟動 Docker Desktop。
2. 接受授權條款。
3. 選擇 WSL2 backend。
4. 啟用主要 Ubuntu integration。
5. 等待 Docker Engine Ready。

最後執行：

```powershell
.\scripts\bootstrap.ps1 -Phase Verify
```

也可以在前置條件都已具備時執行：

```powershell
.\scripts\bootstrap.ps1 -Phase All
```

但初次重灌建議逐 phase 執行，較容易判斷哪一步失敗。

## `-WhatIf`

腳本支援 PowerShell `ShouldProcess` 的步驟可先預覽：

```powershell
.\scripts\bootstrap.ps1 -Phase Tools -WhatIf
```

`-WhatIf` 只預覽支援的寫入與安裝操作，仍可能執行讀取型檢查。

## Bootstrap 會做什麼

### Preflight

- 確認 Windows 11。
- 確認 Secure Boot。
- 確認 TPM。
- 確認 D: 為 NTFS / OPC-DATA。

### Workspace

- 建立缺少的 `D:\OPC` 標準目錄。
- 不刪除既有專案。
- 建立 workspace marker。

### Tools

透過 winget 確保安裝：

- PowerShell 7
- Windows Terminal
- Git
- GitHub CLI
- VS Code
- Python
- Node.js LTS

### WSL

- 安裝或更新 WSL。
- 不會自動刪除或 unregister distribution。

### Docker

- 安裝 Docker Desktop。
- 首次啟動與授權由人工完成。

### Verify

- 執行 `verify-all.ps1`。
- 只要有 FAIL，Bootstrap 結果就是失敗。

## 狀態與 Log

狀態：

```text
D:\OPC\runtime\bootstrap\state.json
```

Log：

```text
D:\OPC\logs\bootstrap\bootstrap-日期時間.log
```

失敗時先查看這兩個檔案，不要直接重灌。

## 可重跑規則

- Winget 已安裝套件應由 winget 判斷並跳過或更新。
- Workspace 只建立缺少的目錄。
- WSL 不使用 unregister。
- Docker 不執行 Factory Reset。
- Verify 可重複執行。

## 目前限制

這個 Bootstrap 是工作站基礎建置入口，不會自動：

- 格式化磁碟
- 操作 BitLocker recovery key
- 登入 GitHub
- 建立 Linux username/password
- 接受 Docker Desktop 授權
- 填入正式 secrets
- 部署尚未實作完成的 OPC workflow application

這些限制是安全邊界，不是缺陷。

## 完成條件

- [ ] 各 phase 可分開執行。
- [ ] 已存在資料不被刪除。
- [ ] 失敗會留下 state 與 log。
- [ ] Verify 無 FAIL。
- [ ] 人工步驟已明確標示。

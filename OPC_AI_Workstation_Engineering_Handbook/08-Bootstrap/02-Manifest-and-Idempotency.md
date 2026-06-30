# 08-Bootstrap / 02 Manifest 與 Idempotency

## 目標

用單一 Manifest 描述目標機器應有的軟體、路徑、版本與功能，並讓腳本能安全重跑。

## Manifest 範例

```yaml
schema_version: 1
workstation:
  name: opc-ai-workstation
  workspace_root: D:\OPC
windows:
  required_features:
    - Microsoft-Windows-Subsystem-Linux
    - VirtualMachinePlatform
packages:
  - id: Git.Git
  - id: GitHub.cli
  - id: Microsoft.VisualStudioCode
  - id: Microsoft.PowerShell
  - id: Docker.DockerDesktop
wsl:
  distribution: Ubuntu
  version: 2
runtime:
  compose_project: opc-core
```

## Idempotency 定義

同一個步驟執行多次，結果應與執行一次相同。例如：

- 目錄已存在：驗證後跳過。
- 套件已安裝：檢查版本，不重複安裝。
- Windows feature 已啟用：不再次修改。
- Compose stack 已啟動：檢查健康狀態，不重建資料。

## 每個 Step 的標準結構

```powershell
function Test-StepState { }
function Invoke-Step { }
function Verify-Step { }
function Write-StepResult { }
```

## 版本鎖定

- 可重建工具應記錄 package id 與驗證方式。
- Runtime image 使用明確 tag。
- Python 與 Node 專案使用 lock file。
- Bootstrap manifest 變更必須進 Git。

## Dry Run

`-DryRun` 應只輸出預計變更，不執行安裝、刪除、格式化或重啟。

## Force

`-Force` 只能跳過低風險確認，不得繞過磁碟清除、secrets、資料刪除與 production 操作的人工確認。

## 驗收

- 同一 Manifest 連續執行兩次不造成額外副作用。
- Manifest schema 錯誤會在施工前被拒絕。
- 每個步驟都有 Test、Invoke、Verify。
- 版本變更可由 Git 歷史追蹤。
# 08-Bootstrap / 08 Doctor 與 Health Checks

## 目標

用單一檢查入口判斷工作站是否可用，並輸出機器可讀與人類可讀報告。

## Doctor 範圍

```text
Windows
Storage
Git / GitHub CLI
PowerShell / Terminal
WSL2 / Ubuntu
Docker / Compose
PostgreSQL / Redis
Workspace marker
Secrets references
GPU
Disk capacity
```

## 檢查結果格式

每一項只能是：

```text
PASS
WARN
FAIL
SKIP
```

並包含：

- check id
- message
- evidence
- remediation
- timestamp

## PowerShell 結構

```powershell
$Results = @()

function Add-CheckResult {
  param(
    [string]$Id,
    [string]$Status,
    [string]$Message,
    [string]$Remediation = ''
  )

  $script:Results += [pscustomobject]@{
    Id = $Id
    Status = $Status
    Message = $Message
    Remediation = $Remediation
    Timestamp = (Get-Date).ToString('o')
  }
}
```

## 必要檢查

```powershell
Get-ComputerInfo
Get-Volume -DriveLetter D
wsl -l -v
docker version
docker compose version
git --version
gh auth status
```

Runtime health：

```powershell
docker compose -p opc-core ps
```

## Exit Code

- `0`：全部 PASS 或允許的 WARN
- `1`：存在 FAIL
- `2`：Doctor 自身錯誤或設定無法解析

## 報告位置

```text
D:\OPC\artifacts\doctor\doctor-<timestamp>.json
D:\OPC\artifacts\doctor\doctor-<timestamp>.md
```

## 驗收

- Doctor 不會修改系統。
- 任一 FAIL 都有 remediation。
- JSON 可被 automation 解析。
- Markdown 可供人工驗收。
- 重複執行結果一致。
# 03-Windows / 12 Windows Terminal 與 PowerShell 7

## 目標

建立統一、可重複使用的命令列入口，讓 Windows、WSL2、Git、Docker 與 Bootstrap 腳本都從同一個介面操作。

## 採用方案

- Windows Terminal 作為主要終端機。
- PowerShell 7 作為主要 Windows shell。
- Ubuntu / WSL2 profile 保留於 Windows Terminal。
- 不以傳統 CMD 作為主要工作環境。

## 安裝

```powershell
winget install --id Microsoft.PowerShell -e
winget install --id Microsoft.WindowsTerminal -e
```

## 驗證

```powershell
pwsh --version
wt --version
```

## 建議設定

1. Windows Terminal 預設 profile 設為 PowerShell 7。
2. 保留 Ubuntu profile。
3. 起始目錄可設為：

```text
D:\OPC
```

4. 不把 secrets 寫進 PowerShell profile。
5. 所有自訂 alias 與 function 必須版本控制。

## PowerShell Profile

查看 profile 路徑：

```powershell
$PROFILE
```

建立檔案：

```powershell
New-Item -ItemType File -Path $PROFILE -Force
```

可加入低風險輔助函式，例如：

```powershell
function opc-home {
  Set-Location D:\OPC
}
```

## 不建議做法

- 從網路直接複製大型 PowerShell profile。
- 在 profile 自動啟動 Docker、WSL 或 Agent。
- 把 API key 寫進 `$PROFILE`。
- 使用過多 alias 導致指令難以閱讀。

## 驗收

- Windows Terminal 可開啟 PowerShell 7。
- Ubuntu profile 可進入 WSL2。
- `opc-home` 可切換到 `D:\OPC`。
- Profile 不含 plaintext secrets。

# 03-Windows / 12 Windows Terminal 與 PowerShell 7

## 目標

建立統一的命令列入口，之後所有 Windows、WSL2、Git、Docker 與 Bootstrap 指令都從同一個地方操作。

## Step 1：確認 winget 可用

開啟 PowerShell，執行：

```powershell
winget --version
```

如果找不到 `winget`：

1. 打開 Microsoft Store。
2. 更新 App Installer。
3. 關閉並重新開啟 PowerShell。
4. 再執行 `winget --version`。

## Step 2：安裝 PowerShell 7

```powershell
winget install --id Microsoft.PowerShell -e
```

完成後關閉目前視窗，再從開始功能表開啟「PowerShell 7」。

驗證：

```powershell
pwsh --version
```

## Step 3：安裝 Windows Terminal

```powershell
winget install --id Microsoft.WindowsTerminal -e
```

驗證：

```powershell
wt --version
```

如果系統已內建，winget 可能顯示已安裝，這是正常的。

## Step 4：把 PowerShell 7 設為預設 profile

操作：

```text
Windows Terminal
→ 設定
→ 啟動
→ 預設設定檔
→ PowerShell
```

選擇 PowerShell 7，不是舊版 Windows PowerShell。

## Step 5：設定起始目錄

等 `D:\OPC` 已建立後，可把 PowerShell profile 的起始目錄設為：

```text
D:\OPC
```

如果 D 槽尚未確認，不要先設。

## Step 6：建立最小 PowerShell profile

查看 profile 路徑：

```powershell
$PROFILE
```

建立檔案：

```powershell
New-Item -ItemType File -Path $PROFILE -Force
```

加入低風險函式：

```powershell
@'
function opc-home {
    Set-Location 'D:\OPC'
}
'@ | Add-Content -Path $PROFILE
```

關閉並重開 PowerShell 7，測試：

```powershell
opc-home
Get-Location
```

應顯示 `D:\OPC`。

## 完成條件

- [ ] `winget --version` 成功。
- [ ] `pwsh --version` 成功。
- [ ] `wt --version` 成功。
- [ ] Windows Terminal 預設開啟 PowerShell 7。
- [ ] Ubuntu profile 之後可正常顯示。
- [ ] `opc-home` 可切換到 `D:\OPC`。
- [ ] Profile 沒有 plaintext secrets。

## 禁止事項

- 從網路直接複製大型 PowerShell profile。
- 在 profile 自動啟動 Docker、WSL 或 Agent。
- 把 API key 寫進 `$PROFILE`。
- 使用過多 alias，讓真實指令看不懂。
- 在 D 槽尚未確認前把起始目錄硬設成 `D:\OPC`。

## 停止條件

- PowerShell 每次啟動都報錯。
- `winget` 安裝完成後仍找不到 `pwsh`。
- Terminal profile 指向不存在的執行檔。

遇到這些情況，先還原 profile，再重新驗證基本指令。
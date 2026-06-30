# 03-Windows / 06 Microsoft Defender 與安全基線

## 目標

保留 Windows 的基本防護，不為了效能亂關 Defender，也不讓 Agent 自己改安全設定。

## Step 1：確認 Defender 有開

以系統管理員 PowerShell 執行：

```powershell
Get-MpComputerStatus | Select-Object AntivirusEnabled,RealTimeProtectionEnabled,BehaviorMonitorEnabled
```

正常結果：三個欄位都應為 `True`。

若不是：

1. 打開「Windows 安全性」。
2. 進入「病毒與威脅防護」。
3. 查看是否被第三方防毒接管。
4. 不要先用 Registry 或網路腳本強行修改。

## Step 2：先不建立任何排除

剛重灌完成時，不要立刻排除整個 `D:\OPC`。

原因：

- 裡面可能有下載檔。
- Agent 可能產生未知檔案。
- 第三方工具可能被放進 workspace。
- 整個資料碟排除會失去大量保護。

## Step 3：只有實際遇到效能問題才加最小排除

允許考慮的例子：

```text
D:\OPC\projects\<特定專案>\.venv
D:\OPC\projects\<特定專案>\node_modules
D:\OPC\runtime\cache
```

查看目前排除：

```powershell
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```

新增排除前，先確認路徑真的存在，而且用途明確。

範例：

```powershell
Add-MpPreference -ExclusionPath 'D:\OPC\projects\example\.venv'
```

移除範例：

```powershell
Remove-MpPreference -ExclusionPath 'D:\OPC\projects\example\.venv'
```

不要直接照抄範例路徑，先換成實際專案。

## Step 4：確認 Firewall 沒被關掉

```powershell
Get-NetFirewallProfile | Select-Object Name,Enabled
```

正常結果：Domain、Private、Public 應為 Enabled。

## Step 5：Secrets 規則

Secrets 不應出現在：

- Git repository
- artifact
- trace log
- chat transcript
- 公開 `.env.example`
- PowerShell profile

Agent 不得自行取得 BitLocker recovery key，也不得自行新增 Defender 排除。

## 完成條件

- [ ] Defender AntivirusEnabled 為 True。
- [ ] RealTimeProtectionEnabled 為 True。
- [ ] BehaviorMonitorEnabled 為 True。
- [ ] Firewall profiles 為 Enabled。
- [ ] 沒有排除整個 `D:\OPC`。
- [ ] 沒有排除 Downloads 或整個使用者目錄。

## 禁止事項

- 永久關閉 Defender。
- 關閉即時保護。
- 排除整個使用者目錄。
- 排除 Downloads。
- 排除整個 `D:\OPC`。
- 讓 Agent 自己修改 Defender 或 Firewall。
- 使用來源不明的安全中心修復腳本。

## 停止條件

- Defender 無法啟用。
- Windows 安全性顯示被組織管理，但這是私人電腦。
- Firewall 被不明軟體停用。
- 新增排除後出現可疑檔案。

遇到這些情況，先處理安全層，不要繼續部署 Agent。
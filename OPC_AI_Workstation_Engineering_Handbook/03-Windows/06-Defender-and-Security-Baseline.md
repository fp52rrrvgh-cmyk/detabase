# 03-Windows / 06 Microsoft Defender 與安全基線

## 目標

保留 Windows 安全能力，同時降低大型專案、Docker volume 與 AI workspace 的掃描干擾。

## 核心原則

- 不永久關閉 Microsoft Defender。
- 不關閉即時保護。
- 不使用不明腳本修改安全中心。
- 只對已知、可信任、可控的開發目錄設定最小排除。

## 建議排除策略

若 `D:\OPC` 內含大量 node_modules、Python 虛擬環境或 Docker 產物，可視實測情況排除特定子目錄，而不是整個工作站。

較安全的做法：

```text
D:\OPC\projects\<特定專案>\.venv
D:\OPC\projects\<特定專案>\node_modules
D:\OPC\runtime\cache
```

不建議一開始就排除整個 `D:\OPC`，因為其中可能包含下載檔、第三方工具或未知 Agent 產物。

## Secrets 與防毒

Secrets 不應存放在：

- Git repository
- artifact
- trace log
- chat transcript
- 公開 `.env.example`

## 驗收

```powershell
Get-MpComputerStatus | Select-Object AntivirusEnabled, RealTimeProtectionEnabled, BehaviorMonitorEnabled
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```

應確認 Defender 與即時保護仍為啟用狀態。

## 常見錯誤

- 為了提升效能完全關閉 Defender
- 排除整個使用者目錄
- 把下載資料夾加入排除
- 讓 Agent 自己修改 Defender 設定

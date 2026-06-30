# 03-Windows / 09 Registry 設定基線

## 目標

避免以大量不透明 Registry tweak 追求微小效能，保留可維護性與可回復性。

## 核心原則

- 不套用來源不明的 `.reg` 檔。
- 不修改自己無法解釋的項目。
- 每次只改一組設定。
- 修改前先匯出備份。
- 修改後必須驗證遊戲、WSL2、Docker、更新與網路。

## 修改前備份

```powershell
New-Item -ItemType Directory -Path D:\OPC\backups\registry -Force | Out-Null
reg export HKCU D:\OPC\backups\registry\HKCU-before.reg /y
reg export HKLM\SOFTWARE D:\OPC\backups\registry\HKLM-SOFTWARE-before.reg /y
```

> `HKLM` 全量匯出可能非常大；正式施工時應只匯出準備修改的子鍵。

## 建議透過圖形介面設定，而非直接改 Registry

以下項目優先使用 Windows 設定介面：

- Game Mode
- Hardware-accelerated GPU scheduling
- Startup Apps
- Notifications
- Privacy permissions
- Power settings
- Windows Update active hours

圖形介面通常會處理相依設定，也比較容易還原。

## 禁止套用的常見 tweak 類型

- 關閉記憶體壓縮
- 關閉核心安全功能
- 修改 undocumented scheduler 值
- 強制關閉遙測相關核心元件
- 大量修改網路 TCP Registry
- 關閉 Windows Update / Defender
- 刪除 Microsoft Store 或 AppX 基礎元件

## 查詢 Registry 值範例

```powershell
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR'
```

## 回復方式

```powershell
reg import D:\OPC\backups\registry\HKCU-before.reg
```

匯入前應確認備份來源與日期，並先建立還原點。

## 驗收

- Windows 可以正常登入
- Windows Update 正常
- Microsoft Store 正常
- WSL2 / Docker 正常
- 遊戲與反作弊正常
- 設定變更有文件紀錄

## OPC 結論

Registry 不是一般最佳化入口。只有官方文件、已知問題修復或可量測效益時才修改。
# 03-Windows / 02 驅動安裝策略

## 目標

建立穩定的主機板、網路、音訊與 GPU 驅動環境，避免驅動重複、來源混亂或 Windows Update 覆蓋關鍵版本。

## 安裝優先順序

1. Windows Update
2. Intel / AMD 晶片組驅動
3. 網路與藍牙驅動
4. 音訊驅動
5. NVIDIA / AMD 顯示卡驅動
6. 其他周邊驅動

## 來源原則

優先順序：

1. Windows Update
2. 主機板與硬體製造商官方網站
3. GPU 官方網站或官方 App
4. 不使用第三方驅動包或自動驅動下載站

## GPU 驅動

### NVIDIA

遊戲與一般 AI 工作站優先使用正式 Game Ready Driver；若未來主要工作轉為 CUDA 開發且需要特定版本，再依 CUDA 相容矩陣鎖定版本。

不要在 Windows 和 WSL2 內各裝一套 Linux NVIDIA 驅動。WSL2 GPU 由 Windows 主機驅動提供。

## 裝置管理員驗收

開啟：

```text
Win + X → 裝置管理員
```

確認沒有：

- 黃色驚嘆號
- Unknown device
- Display Adapter 顯示 Microsoft Basic Display Adapter

## PowerShell 驗收

```powershell
Get-PnpDevice | Where-Object Status -ne 'OK'
nvidia-smi
```

若使用 NVIDIA，`nvidia-smi` 應顯示 GPU 型號、驅動版本與顯存資訊。

## 常見錯誤

- 安裝第三方 Driver Booster 類工具
- 同時保留多套 GPU 管理軟體
- WSL2 內再裝 Linux 顯示驅動，造成 CUDA 問題
- 重灌後忘記安裝晶片組驅動

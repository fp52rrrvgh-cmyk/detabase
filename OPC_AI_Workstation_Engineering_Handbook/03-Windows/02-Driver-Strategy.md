# 03-Windows / 02 驅動安裝策略

## 目標

把晶片組、網路、音訊與 GPU 驅動安裝到可用、穩定、可驗證的狀態，不依賴第三方驅動工具。

## 先不要急著下載一堆驅動

Windows 11 會先透過 Windows Update 安裝多數建議驅動。Microsoft 的官方建議也是先使用 Windows Update；如果找不到或版本不合，再到硬體製造商官方網站取得相容驅動。

官方參考：

- https://support.microsoft.com/windows/hardware/drivers/automatically-get-recommended-and-updated-hardware-drivers
- https://support.microsoft.com/windows/update-drivers-through-device-manager-in-windows-ec62f46c-ff14-c91d-eead-d7126dc1f7b6

## Step 1：先完成 Windows Update

操作：

```text
設定
→ Windows Update
→ 檢查更新
→ 安裝全部一般更新
→ 重新開機
→ 再次檢查更新
```

接著查看：

```text
設定
→ Windows Update
→ 進階選項
→ 選用更新
→ 驅動程式更新
```

只有你知道用途的驅動才安裝。不要一次勾選所有陌生項目。

## Step 2：看裝置管理員

按：

```text
Win + X
→ 裝置管理員
```

你要找的是：

- 黃色驚嘆號
- `Unknown device`
- 顯示卡只有 `Microsoft Basic Display Adapter`
- 網路、藍牙或音訊裝置消失

如果完全沒有黃色驚嘆號，先不要亂裝驅動。

## Step 3：依順序補官方驅動

安裝順序：

1. Intel / AMD 晶片組驅動
2. LAN / Wi-Fi / Bluetooth
3. 音訊
4. NVIDIA / AMD 顯示卡
5. 其他真的缺少的周邊

來源優先順序：

1. Windows Update
2. 主機板製造商官方網站
3. GPU 官方網站或官方 App
4. 裝置原廠官方網站

禁止使用：

- Driver Booster
- 第三方驅動包
- 不明下載站
- 來源不明的「一鍵安裝全部驅動」工具

## Step 4：GPU 驅動

### NVIDIA

一般遊戲與 AI 工作站先使用正式 Game Ready Driver。若未來 CUDA 專案明確要求特定版本，再依該專案與 CUDA 相容性鎖定。

安裝完成後執行：

```powershell
nvidia-smi
```

正常時會看到：

- GPU 型號
- Driver Version
- 顯存資訊

若顯示「找不到指令」或沒有 GPU：

1. 回到裝置管理員確認顯示卡是否被辨識。
2. 重新安裝 NVIDIA 官方驅動。
3. 重新開機。
4. 再執行 `nvidia-smi`。

WSL2 不要再安裝完整 Linux NVIDIA 顯示驅動；WSL2 的 GPU 支援由 Windows 主機驅動提供。

## Step 5：PowerShell 驗收

```powershell
Get-PnpDevice | Where-Object Status -ne 'OK'
```

理想結果：沒有輸出。

如果有輸出：

- 先看 `Class` 與 `FriendlyName`。
- 如果只是未連接的藍牙或 USB 裝置，可先確認是否真的有問題。
- 如果是 Display、Network、System、Storage 類別，先停下來處理。

## 完成條件

- [ ] Windows Update 已跑到沒有一般待安裝更新。
- [ ] 裝置管理員沒有黃色驚嘆號。
- [ ] 網路、藍牙、音訊正常。
- [ ] GPU 顯示正確名稱。
- [ ] `nvidia-smi` 成功，或你使用的不是 NVIDIA。
- [ ] 沒有安裝第三方驅動工具。

## 停止條件

- 裝置管理員出現大量 Unknown device。
- 網路卡或儲存控制器消失。
- 安裝驅動後藍畫面或反覆重開機。
- GPU 驅動安裝後畫面持續黑屏。

遇到這些情況不要繼續安裝 WSL2 或 Docker，先修好 Windows 驅動層。
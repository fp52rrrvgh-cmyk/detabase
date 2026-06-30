# 03-Windows / 03 Windows Update 策略

## 目標

把 Windows 更新到穩定、安全、可重新啟動的狀態，再進入 WSL2、Docker 與 AI Runtime。

## Step 1：先更新到沒有一般待辦

操作：

```text
設定
→ Windows Update
→ 檢查更新
→ 安裝
→ 重新開機
→ 再次檢查更新
```

重複到畫面顯示沒有一般待安裝更新。

## Step 2：查看選用更新

操作：

```text
設定
→ Windows Update
→ 進階選項
→ 選用更新
```

這裡常會出現驅動。原則：

- 只安裝你知道用途的項目。
- 如果裝置管理員完全正常，不必為了「全部清空」而安裝每個選用驅動。
- BIOS、Firmware 類更新先查主機板官方說明，不要盲裝。

## Step 3：設定使用時間

操作：

```text
設定
→ Windows Update
→ 進階選項
→ 使用時間
```

把使用時間設在你白天會使用電腦的時段。未來夜間跑 Agent 時，仍應在任務開始前檢查是否有等待重新啟動。

## Step 4：開啟重新啟動通知

在 Windows Update 進階選項中開啟重新啟動通知。

目的是避免你以為電腦可以長時間執行，結果半夜因更新重開。

## Step 5：確認沒有等待重新啟動

先看 Windows Update 畫面是否顯示「需要重新啟動」。

也可執行：

```powershell
Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10
```

這個指令只能列出部分已安裝更新，不能完全取代 Windows Update 畫面。

## 維護窗口

日後每週固定一次：

```text
Pause Agent
→ 確認沒有 database migration
→ 備份重要狀態
→ Windows Update
→ 重新開機
→ 執行 verify-all.ps1
→ 確認沒有 FAIL
→ Resume Agent
```

## 更新後要測試什麼

- 網路
- 音訊
- GPU
- Steam 或主要遊戲平台
- WSL2
- Docker Desktop

若 Windows Update 後驅動異常，先回到裝置管理員確認，不要反覆安裝不同來源的驅動。

## 禁止事項

- 永久停用 Windows Update。
- 停用 Windows Update service。
- 使用 Registry 或第三方工具破壞更新機制。
- 使用不明工具封鎖 Microsoft 更新網域。
- 在 database migration、備份或長時間任務執行中重新開機。
- 更新失敗後立即使用來路不明的修復腳本。

## 完成條件

- [ ] Windows Update 沒有一般待安裝更新。
- [ ] 沒有等待重新啟動。
- [ ] 重新開機後網路、音訊與 GPU 正常。
- [ ] Windows Update service 沒有被停用。

## 停止條件

- 更新後無法正常開機。
- 網路卡、GPU 或儲存裝置消失。
- Windows Update 反覆失敗且每次錯誤相同。

遇到以上狀況，先停止 WSL2 與 Docker 安裝，保存錯誤碼，再處理 Windows。
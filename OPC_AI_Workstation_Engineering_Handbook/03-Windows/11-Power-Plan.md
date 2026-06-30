# 03-Windows / 11 電源計畫與效能策略

## 目標

讓工作站能穩定跑遊戲、AI 任務與日常工作，不因睡眠中斷，也不長期鎖在最高耗電狀態。

## Step 1：查看目前電源計畫

以系統管理員 PowerShell 執行：

```powershell
powercfg /list
```

目前使用中的計畫前面會有 `*`。

## Step 2：預設使用 Balanced

```powershell
powercfg /setactive SCHEME_BALANCED
```

Balanced 適合：

- 日常使用
- 多數遊戲
- Coding
- 長時間 Agent 工作

不要一開始就切 High performance。先用 Balanced 實測。

## Step 3：只有有證據才切 High performance

```powershell
powercfg /setactive SCHEME_MIN
```

只在以下情況使用：

- 短時間 benchmark
- 編譯或本機推論已證明有實際收益
- 散熱與供電正常

工作完成後切回：

```powershell
powercfg /setactive SCHEME_BALANCED
```

## Step 4：設定夜間 Agent 不睡眠

操作：

```text
設定
→ 系統
→ 電源與電池
→ 螢幕與睡眠
```

桌機建議：

- 螢幕可在一段時間後關閉。
- 接上電源時，電腦睡眠設為「永不」或長於預期任務時間。

注意：只有在真的要跑夜間任務時才避免睡眠。不要把關閉螢幕和電腦睡眠搞混。

## Step 5：查看目前詳細設定

```powershell
powercfg /query
```

產生能源報告：

```powershell
New-Item -ItemType Directory -Path D:\OPC\artifacts -Force | Out-Null
powercfg /energy /output D:\OPC\artifacts\power-energy-report.html
```

報告會等待一段時間再完成。完成後打開 HTML 查看警告。

## Step 6：實際測試

至少做一次：

1. 啟動一個 30 分鐘以上的低風險任務。
2. 關閉螢幕。
3. 等待超過原本睡眠時間。
4. 回來確認任務沒有中斷。

再測試一款主要遊戲，確認沒有明顯卡頓或異常溫度。

## 完成條件

- [ ] 預設電源計畫是 Balanced。
- [ ] 夜間任務不因睡眠中斷。
- [ ] 螢幕可正常關閉。
- [ ] 遊戲效能正常。
- [ ] CPU / GPU 溫度正常。
- [ ] 沒有使用第三方極端電源計畫。

## 禁止事項

- 長期使用 High performance 卻沒有量測依據。
- 關閉所有 CPU 省電功能。
- 使用來源不明的 Ultimate Performance 腳本。
- 為了夜間任務直接關閉所有電源管理。
- 在筆電上忽略電池與溫度。

## 停止條件

- 啟用某個電源計畫後溫度異常升高。
- 電腦無法正常睡眠或喚醒。
- 遊戲開始頻繁當機。
- Agent 任務仍因睡眠或休眠中斷。

遇到以上狀況，先切回 Balanced，再逐項檢查。
# 03-Windows / 11 電源計畫與效能策略

## 目標

讓工作站在遊戲、AI 長時間任務與日常使用間取得穩定平衡，而不是長期鎖在最高耗電狀態。

## 採用原則

- 桌機以 Balanced 為預設。
- 只有量測證明有需要時，才切換 High performance。
- 不使用第三方極端電源計畫。
- 不關閉 CPU 省電機制來換取不可量測的效益。

## 查看可用電源計畫

```powershell
powercfg /list
```

## 切換電源計畫

Balanced：

```powershell
powercfg /setactive SCHEME_BALANCED
```

High performance：

```powershell
powercfg /setactive SCHEME_MIN
```

## 建議使用情境

### Balanced

- 日常使用
- 多數遊戲
- 一般 coding
- 長時間 Agent 工作

### High performance

- 需要固定高頻率的短時間 benchmark
- 特定編譯或本機推論工作已證明受益
- 電源與散熱條件足夠

## 睡眠與休眠

若要讓 Agent 夜間工作：

- 避免自動睡眠中斷任務。
- 螢幕可以關閉。
- 電腦睡眠時間需依工作流調整。
- 筆電需另考慮電池與溫度；本手冊目前以桌機為主。

查看設定：

```powershell
powercfg /query
```

產生能源報告：

```powershell
powercfg /energy /output D:\OPC\artifacts\power-energy-report.html
```

## 驗收

- 夜間 Agent 任務不因睡眠中斷。
- 遊戲效能穩定。
- CPU / GPU 溫度正常。
- 沒有為微小效能長期增加不必要耗電。

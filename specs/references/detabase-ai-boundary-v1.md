# Detabase AI Boundary v1 — 小馬 / Codex / Detabase 分工邊界
# Detabase AI Boundary v1 — 小馬 / Codex / Detabase 分工邊界

**版本**: v1 | **日期**: 2026-06-01 | **狀態**: 角色對齊版，待 Codex 審查 + 小新批准

---

## 1. 三層架構原則

```
Detabase = 財務事實層（Facts / Signals）
小馬     = 第一大腦（Advice + Memory + Context + OPC）
Codex    = 第二大腦（工程審查 + 反駁 + 監督照圖施工）
```

### 角色定位

| 角色 | 在這個系統中的任務 |
|:-----|:------------------|
| **小馬** | 讀取 Detabase 的事實，結合生活脈絡和長期記憶，給出建議方案，然後與 Codex 討論達成共識 |
| **Codex** | 審查小馬的方案是否合理、安全、符合邊界，反駁有問題的部分，施工時監督有沒有照圖 |
| **Detabase** | 只提供事實和信號，不安裝建議閉環 |

### Detabase 擁有（Facts & Signals）

| 類別 | 內容 | 備註 |
|:-----|:------|:------|
| 交易 | income / expense 記錄 | 確定性資料 |
| 帳戶 | 現金 / 銀行 / 信用卡 / 零錢盒 | 帳戶資料 |
| 分類 | 支出分類 | 分類資料 |
| 預算 | 每月分類預算 | 預算資料 |
| 債務 | 固定債務（本金、利率、期數） | 事實資料，不含策略 |
| 每日限額 | daily spending limit | 行為控制 |
| 預測/快照 | month-end forecast / snapshot | 確定性計算結果 |
| 待審核 | pending items | 未確認交易 |
| 分類規則 | auto-classification rules | 規則引擎 |
| 審計日誌 | activity corrections / audit trail | 稽核資料 |
| Dashboard 摘要 | 本月收支、趨勢、KPI | 彙總資料 |

### Detabase 可產生的（Signals，非 Advice）

Detabase 可產生：
- ✅ 確定性計算（總和、平均、趨勢）
- ✅ 摘要（本月支出最多的分類）
- ✅ 預測（根據歷史數據的簡單 extrapolation）
- ✅ 警示 signal（已超支、即將超支）

Detabase 不可產生：
- ❌ 具體行動建議（「你應該先還哪筆債」）
- ❌ 優先順序判斷（「這個比那個重要」）
- ❌ 個人化策略（「用零錢盒補貼晚餐」）
- ❌ 建議接受/拒絕紀錄
- ❌ 建議成效追蹤

### 小馬擁有（Memory + Advice）

| 類別 | 內容 |
|:-----|:------|
| 建議記憶 | 過去給過哪些建議 |
| 接受紀錄 | 小新是否接受了建議 |
| 執行結果 | 建議的實際效果 |
| 偏好變化 | 小新的習慣/偏好隨時間改變 |
| 生活脈絡 | 疲勞、開車、工作、壓力狀態 |
| 未來調整 | 下一次建議的改進方向 |

### Codex 擁有（Review）

| 類別 | 內容 |
|:-----|:------|
| 工程審查 | code review、架構審查 |
| 品質驗證 | build、test、lint |
| Schema/安全審查 | migration、RLS、權限 |
| Scope 審查 | 功能範圍是否合理 |

---

## 2. 禁止事項（Codex finding F2/F3 修正）

| 禁止 | 原因 |
|:-----|:------|
| 把 agent memory 塞進 Detabase schema | Detabase 是事實層，不是記憶層 |
| 小馬建議閉環寫進 Edge Function | AI 建議邏輯在 小馬 層 |
| Detabase schema 儲存建議接受/拒絕/成效 | 這些是 小馬 記憶 |
| Edge Function 產生還款策略/預算策略 | 屬於 小馬 advice loop |
| 「決策面板」實作為 Detabase 內建 AI advisor | 只能是 facts/signal panel 或小馬建議展示面 |
| 把生活脈絡寫進 Detabase | 脈絡屬於 小馬 |
| Codex 要求 Detabase 存記憶資料 | 超出 Detabase 範圍 |

---

## 3. 財務建議循環（Advice Loop）

```
Detabase 提供 facts / signals
       ↓
小馬讀取 facts + 結合生活脈絡 + 長期記憶
       ↓
小馬給出 2-3 個具體選項
       ↓
小新選擇
       ↓
小馬記住結果
       ↓
下一次建議改進
```

### 實例

```
Detabase 顯示：
今日剩餘：$180
月底風險：中等

小馬：
小新，你昨天說今天要控制飲料錢。
目前今天剩 $180。
建議晚餐壓在 $120 內，保留 $60 緩衝。
選 A: 晚餐 $120
選 B: 今天超 $50，明天降額
選 C: 用零錢盒補貼（不建議）
```

---

## 4. 舊 GAS Dashboard 處理清單

### 保留（遷移至新 Detabase）

| 功能 | 優先 | 說明 |
|:-----|:----:|:------|
| 快速記帳 | P0 | 已有 QuickCapture + Telegram |
| 每日花費上限 | P0 | 已有 DailySpendingGauge |
| 月底預測 | P0 | 已有簡單推估 |
| 待確認（AI 不確定時） | P1 | 需補 pending flow |
| 安全日均支出 | P1 | 強化現有功能 |
| 固定債務壓力 | P1 | 缺 debt module |
| 備份/還原 | P2 | 資料安全 |

### 重做（保留邏輯，重構 UI）

| 功能 | 方向 |
|:-----|:------|
| 資產負債總覽 | 調整 Snapshot 資訊層級 |
| 分類佔比 | 現有餅圖補佔比視角 |
| 決策面板 | Briefing 升級為 facts/signal panel |

### 降級（簡化）

| 功能 | 方向 |
|:-----|:------|
| 月報/年報 | 次要功能，非首屏 |
| AI Query 區域 | 不佔首屏空間 |

### 明確不移入 Detabase（Codex finding F4 修正）

| 功能 | 歸屬 | 說明 |
|:-----|:------|:------|
| 還款策略中心 | 小馬 advice | Detabase 只提供債務 facts |
| 下月預算建議 | 小馬 advice | Detabase 只提供預算 signal |
| AI 財務建議 | 小馬 advice | 小馬的建議閉環 |
| 現金流預測校正 | 小馬 advice + 未來 Base | 需累積資料 |
| 固定資產/折舊 | 另開 Assetbase | 超出 Detabase scope |

---

## 5. Debt 邊界（Codex finding F5 修正）

| 歸屬 | 內容 |
|:-----|:------|
| Detabase facts | 債務本金、利率、期數、剩餘金額 |
| 小馬 advice | 先還哪筆、怎麼還最省、還款策略 |

Detabase 不儲存還款策略或建議紀錄。

---

## 6. 架構圖（文字版）

```
┌──────────────────────────────────────────────────┐
│                  小新（決策者）                    │
└──────────────────┬───────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────┐
│              小馬（神經系統）                      │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐   │
│  │ 長期記憶 │ │ 生活脈絡 │ │ 建議閉環        │   │
│  └──────────┘ └──────────┘ └────────────────┘   │
└──────┬──────────────────────────────┬────────────┘
       │                              │
┌──────▼──────┐           ┌──────────▼───────────┐
│  Detabase   │           │   Codex（審查層）      │
│  (事實層)    │           │  ┌────────────────┐  │
│  facts+signal│           │  │ Audit / Review  │  │
│  無建議閉環  │           │  │ Verify / Scope  │  │
└─────────────┘           └──────────────────────┘
```

---

*本文件已納入 Codex round 2 audit 的 F1-F5 findings。待 Codex final review + 小新批准。*

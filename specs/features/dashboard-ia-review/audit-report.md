# Detabase Dashboard 資訊架構審計報告

> **審計日期**: 2026-05-31
> **審計者**: 戰術架構官 (Architect)
> **模式**: 唯讀審計 — 不動 code
> **範圍**: `apps/web/app/dashboard/page.tsx` + `useDashboard.ts` + Sidebar + Dashboard components
> **使用者**: 26 噸大貨車司機 | iPhone 15 Pro Max | 單手疲勞操作

---

## 摘要 (Executive Summary)

Dashboard 的功能覆蓋率很好 — 該有的資料幾乎都在。但資訊架構上有 **3 個 P1 級問題** 和 **3 個 P2 級問題**。

**三個核心發現：**

1. **內容重複度高** — SnapshotDashboard、KPI Row、AccountOverviewCard 三組元件有大量重疊指標（本月淨值、信用卡已用、負債、帳戶餘額）。這讓使用者花時間看重複資訊，而不是掃讀一次就得到結論。

2. **單頁資訊過載** — Mobile 版有 9 個獨立的內容區塊從上到下一字排開。對疲勞駕駛者來說，沒有一個「只看這個就夠了」的核心摘要區塊。頁面沒有分層 — 所有區塊視覺權重相等。

3. **導航發現性不足** — Sidebar 只有 3 項導航（總覽、搜尋、設定）。`/budgets`、`/subscriptions`、`/categories`、`/transactions` 完全無法從主導航發現，只能靠直接點選設定內的 tab 或記住網址。**Sidebar 的 `isActive` 函式把小新偷偷映射到「設定」，但使用者不可能知道 `/budgets` 是「設定」底下。**

**建議優先處理**：內容去重 → 階層化資訊 → 擴充導航

---

## 1. 內容層級與優先級排序

### 1.1 現狀

目前由上到下的區塊順序：

```
① DailySpendingGauge      ← 今日花費 vs 限額
② Briefing                ← AI 文字摘要
③ SnapshotDashboard       ← 5 項資產負債指標
④ KPI Row (5 cards)       ← 月支出/月收入/淨流量/總預算/帳戶總餘額
⑤ DailyTrendChart         ← 支出趨勢折線圖
⑥ ExpensePieChart         ← 分類餅圖
⑦ AccountOverviewCard     ← 帳戶列表（各帳戶餘額）+ 可用資金/淨資產
⑧ RecentTransactions      ← 最近 6 筆交易
⑨ UpcomingSubscriptions   ← 未來 30 天訂閱 (desktop-only)
⑩ BudgetBarChart          ← 預算進度條碼圖
⑪ MonthlyHistory          ← 近 6 月收支趨勢 (desktop-only)
⑫ CategoryDeepDive        ← 分類深度分析 (desktop-only)
⑬ PredictionPanel         ← 月底預測 (desktop-only)
⑭ FullBudgetOverview      ← 全分類預算進度 (desktop-only)
⑮ YearOverYearChart       ← 去年同期支出對比 (desktop-only)
⑯ Footer Summary          ← 今日摘要/本週摘要
⑰ ShareReport             ← 分享按鈕
⑱ FAB + QuickCapture      ← 快速記帳 (固定底部)
```

### 1.2 發現的問題

**P1 — 三組元件資料高度重疊**

| 指標 | Snapshot | KPI Row | AccountOverview | Footer Summary |
|:-----|:--------:|:-------:|:---------------:|:--------------:|
| 本月淨值 (收入-支出) | `本月淨值` | `淨流量` | — | — |
| 本月支出 | — | `本月支出` | — | `今日支出` |
| 本月收入 | — | `本月收入` | — | `今日收入` |
| 帳戶總餘額 | — | `帳戶總餘額` | `帳戶餘額總計` | — |
| 信用卡已用 | `信用卡已用` | — | 每卡顯示 + `可用資金` | — |
| 負債 | `負債總額` | — | 貸款顯示 | — |
| 總預算 | — | `總預算` | — | — |

使用者需要在 Snapshot → KPI → AccountOverview 三個區塊之間反覆比對才能得到完整的財務圖像。對疲勞狀態的使用者來說，這是過度的工作記憶負擔。

**P1 — DailySpendingGauge 是最重要的即時指標，但視覺上沒有「這是最重要的」區分**

- DailySpendingGauge 放在第一位是正確的（最須即時控制的資訊）
- 但它的視覺設計和後面的 KPI card 或 Snapshot row 沒有層級差異 — 都是同等大的卡片

**P2 — Briefing 是文字段落，置於 Snapshot 之前**

- Briefing 的文字內容本質上是 KPI + Snapshot 的「翻譯版」
- 疲勞狀態下掃讀數字比讀文字快
- Briefing 應該在數字之後作為補充，或折疊收在 Snapshot 之後

**P2 — Footer Summary 是最後一個區塊，但實際上是「總回顧」**

- 使用者如果要看總摘要，需要一路滑到頁底
- 這個資訊層級應該更早出現（例如取代或合併 KPI Row）

### 1.3 建議改善

1. **合併 Snapshot + KPI → 一個「一覽核心」區塊**（P1）
   - 將「可用現金、本月支出、本月收入、信用卡已用、淨流量」整合成 **5 欄橫排**（mobile 換行成 2-3 欄）
   - 移除重複的 KPI Row，減少 2/3 的視覺空間

2. **Briefing 移到 Snapshot 之後**（P2）
   - 預設折疊，使用者需要才展開
   - 或改成 2-3 句 bullet point 而非段落

3. **Footer Summary 提升位置**（P2）
   - 合併進 KPI 區塊的附加資訊，或變成 sticky 快速參考列

4. **新增「只能看到 N 個核心數字」的快速檢視模式**（P1）
   - 例如在 Header 做一個 "⚡ 速覽 / 完整" toggle
   - 速覽模式只顯示：DailySpendingGauge + 合併核心區塊

### 1.4 優先級

| 問題 | 優先級 | 影響說明 |
|:-----|:------:|:---------|
| 三組元件資料重疊 | P1 | 每次載入浪費 3-5 秒掃重複資訊 |
| 無核心摘要層級 | P1 | 疲勞時無法一眼掌握全局 |
| Briefing 位置不當 | P2 | 文字在先，閱讀負擔 > 數值 |
| Footer Summary 位置不合理 | P2 | 摘要不該在頁底 |

---

## 2. 行動裝置優化

### 2.1 現狀

使用者是 26 噸大貨車司機 iPhone 單手操作疲勞狀態。

- 整個頁面是單向垂直滾動
- FAB (Quick Capture) 在右下角 — **正確的單手拇指位置**
- Month navigation 在頂部 — 需要雙手或精確點擊
- TxItem 的 show/hide actions 採用點擊切換，不太適合單手

### 2.2 發現的問題

**P1 — 頁面缺乏「快速退出／中斷後回來」的支援**

- 使用者可能開車到一半快速看一眼，然後中斷
- 下次回來頁面重新載入，沒記住上次看到哪
- 沒有書籤或 deep link 到具體區塊

**P2 — Month navigation 在疲勞時操作困難**

- `‹` 和 `›` 按鈕很小，搖晃車上難以點中
- 左右滑動手勢（直覺操作）沒有實作

**P2 — Long scroll 沒有區塊跳轉**

- 全部 9 個區塊在 mobile 上一路滑到底
- 沒有 sticky anchor nav 或「回到頂部」按鈕

**P3 — TxItem 的點擊展開 action 區域太小**

- 每個 TxItem 點擊切換 showActions
- 在車上搖晃時容易誤觸或點不到

### 2.3 建議改善

1. **Slide-to-navigate month** — 加入左右滑動手勢切換月份（P2）
2. **Sticky section nav** — 在頁面右側加入小圓點指示區塊位置（P2）
3. **增大可點擊區域** — 所有按鈕最小 44x44 pt（符合 iOS HIG）（P2）
4. **支援頁面錨點 deep link** — 讓 Telegram 連結可以直接跳到具體區塊（P3）

### 2.4 優先級

| 問題 | 優先級 |
|:-----|:------:|
| 無中斷回來記憶 | P1 |
| Month navigation 操作困難 | P2 |
| 無區塊跳轉 | P2 |
| TxItem 按鈕過小 | P3 |

---

## 3. 認知負載與資訊密度

### 3.1 現狀

Mobile 版本一次載入 **9 個主要區塊**，desktop 版本最多 **17 個區塊**。

### 3.2 發現的問題

**P1 — 視覺空間 100% 被同等權重的卡片佔滿**

所有區塊都用 `.d-card` 容器，視覺上分不出輕重緩急。使用者必須掃讀全部才能判斷哪些重要：

```
.── DailySpendingGauge ──.  ← 重要 ⭐
.── Briefing ────────────.  ← 文字多，同卡
.── SnapshotDashboard ───.  ← 重要 ⭐
.── KPI Row ─────────────.  ← 重要 ⭐ 但重複
.── Chart Row ───────────.  ← 中等
.── AccountOverviewCard ──.  ← 實用但部分重複
.── RecentTransactions ──.  ← 中等
.── BudgetBarChart ──────.  ← 中等
.── Footer Summary ──────.  ← 實用但在頁底
```

**P2 — Briefing 文字段落在 mobile 上可能長達 4-5 行**

- 現有 Briefing 元件已有折疊機制（前 2 句展開）
- 但折疊狀態的文字仍然佔用垂直空間
- 使用者必須展開才能看到完整資訊

**P2 — 數字格式不一致**

- `formatTWD` 在 page.tsx 顯示 `TWD 1,234`
- `SnapshotDashboard` 顯示 `NT$ 1,234`
- `AccountOverviewCard` 顯示 `TWD 1,234`
- 同一個系統兩種貨幣前綴 (`TWD` vs `NT$`) 增加認知負載

### 3.3 建議改善

1. **視覺權重分層**（P1）
   - 核心指標（DailySpendingGauge + 合併核心區）用強調背景色或毛玻璃效果
   - 次要圖表用半透明或淺色卡片
   - 文字資訊用折疊卡片

2. **統一貨幣格式**（P2）
   - 全系統統一用 `NT$`（更在地化）或 `TWD`（更國際化）
   - 決定後全 repo 同步

3. **移除 dead code 元件**（P3）
   - `AnomalyDetection.tsx` 和 `AiAdvisor.tsx` 存在於 components/ 但**完全未在 page.tsx 中使用**
   - 保留這兩個元件增加認知混淆（它們是否應該被 render？）
   - 建議：如果真的不使用就移除；如果未來要用就註解說明年份

### 3.4 優先級

| 問題 | 優先級 |
|:-----|:------:|
| 全部區塊視覺權重相等 | P1 |
| 貨幣格式不一致 (TWD vs NT$) | P2 |
| Dead code 元件未使用 | P3 |

---

## 4. 掃讀性與視覺層級

### 4.1 現狀

- 全頁使用 `.d-card` 容器
- Emoji 作為視覺錨點在各區塊標題中使用
- 色彩區分：expense（紅）、income（綠）、net（藍）
- DailySpendingGauge 有進度條顏色變化（safe/caution/warning/exceeded）

### 4.2 發現的問題

**P2 — 缺少「最重要數字」的視覺凸顯**

- DailySpendingGauge 的數字雖然是最大字型，但和旁邊的 KPI card 同等大小
- 沒有任何數字使用 badge、highlight、或動態閃爍（exceeded 有閃爍，但那是超出才觸發）

**P2 — Section 標題與內容的層級不明顯**

- `d-card-h` 和 `d-card-t` 的樣式在目前 globals.css 中無法確認，但從 page.tsx 看所有區塊標題都用同一個樣式

**P2 — Emoji 使用不一致**

- 部分區塊有 emoji（📈 支出趨勢、📊 分類支出比例、📝 最近交易）
- SnapshotDashboard 每行都有 emoji（💰 🏦 💳 📉 📊）
- 但 BudgetBarChart 沒有 emoji 標題

### 4.3 建議改善

1. **最重要的數字使用 accent 色彩 + 較大字型**（P2）
2. **統一分類標題的 emoji 前綴**（P2）
3. **在頁面頂部加入「訊號燈」摘要**（P1）
   - 🟢 一切正常 (今日未超支、預算內)
   - 🟡 需要留意 (接近超支)
   - 🔴 有問題 (已超支、負債過高)
   - 這讓疲勞使用者只需要看一個顏色

### 4.4 優先級

| 問題 | 優先級 |
|:-----|:------:|
| 缺少訊號燈摘要 | P1 |
| 最重要數字未凸顯 | P2 |
| Emoji 使用不一致 | P2 |

---

## 5. 導航可發現性

### 5.1 現狀

Sidebar 僅有 3 項導航：

```typescript
const NAV_ITEMS = [
  { href: "/dashboard", label: "📊 總覽" },
  { href: "/dashboard/search", label: "🔍 搜尋" },
  { href: "/settings", label: "⚙️ 設定" },
];
```

但應用實際有 **8 個 page.tsx**：

| 路由 | 功能 | 是否可從導航發現 |
|:-----|:-----|:--------------:|
| `/dashboard` | 戰情總覽 | ✅ 直接 |
| `/dashboard/search` | 交易搜尋 | ✅ 直接 |
| `/settings` | 設定（含帳戶/分類/預算/訂閱 tabs） | ✅ 直接 |
| `/budgets` | 預算管理 | ❌ 隱藏在 settings 下 |
| `/subscriptions` | 訂閱管理 | ❌ 隱藏在 settings 下 |
| `/categories` | 分類管理 | ❌ 隱藏在 settings 下 |
| `/transactions` | 交易列表 | ❌ 完全無法從導航到達 |
| `/` | 首頁（redirect） | N/A |

### 5.2 發現的問題

**P1 — `/transactions` 頁面無法被發現**

- 有獨立 page.tsx，但沒有任何連結指向它
- Sidebar 沒有，Dashboard 內的連結也沒有
- 唯一的入口是直接輸入網址

**P1 — Sidebar 隱藏了 3 個子頁面在「設定」下面**

```typescript
// Sidebar.tsx 第 23 行
if (href === "/settings") return pathname.startsWith("/settings") || pathname === "/budgets" || pathname === "/subscriptions" || pathname === "/categories";
```

- 這在視覺上標記「設定」為 active，但使用者不會知道 `/budgets` 屬於「設定」
- `/budgets`、`/subscriptions`、`/categories` 應該有自己的導航項目，或至少在 dropdown 中有子選項

**P2 — Sidebar 沒有展開 submenu 的能力**

- 目前的 sidebar 只有 flat list，無法展開子選項
- budget / subscription / category 這些頁面如果單獨列出，3 項 nav 會變成 6 項
- iPhone 窄螢幕需要 scrollable nav 或 submenu

### 5.3 建議改善

1. **擴充 NAV_ITEMS 為 5 項**（P1）
   ```
   📊 總覽    🔍 搜尋    💳 交易    📋 預算    ⚙️ 設定
   ```
   或將 `/budgets`、`/subscriptions`、`/categories` 歸納為「📋 預算與分類」一個項目
   
2. **加入 `/transactions` 到導航**（P1）
   - 可直接新增獨立項目，或
   - 放在 Dashboard 的「最近交易」區塊中有「查看全部 →」連結

3. **Sidebar 支援 submenu**（P2）
   - 「⚙️ 設定」展開後顯示：帳戶 / 分類 / 預算 / 訂閱
   - 只在展開狀態顯示，不佔用主 nav 空間

4. **加入子頁面之間的 breadcrumb**（P3）
   - 例如 `/budgets` 上方顯示「設定 > 預算」
   - 幫助使用者理解頁面層級關係

### 5.4 優先級

| 問題 | 優先級 |
|:-----|:------:|
| `/transactions` 完全無法被發現 | P1 |
| 3 個子頁面隱藏在設定下 | P1 |
| Sidebar 無 submenu | P2 |

---

## 6. 空/錯誤/載入狀態

### 6.1 現狀

| 狀態 | 處理方式 | 現有程式碼 |
|:-----|:---------|:----------|
| 載入中 | ✅ DashboardSkeleton 覆蓋全部區塊 | `DashboardSkeleton.tsx` |
| 錯誤 | ✅ 頁層級 status-message | `status === "failure"` 顯示錯誤 |
| 空資料 | ⚠️ 部分處理 | 各元件各自處理 |
| 未登入 | ✅ 提示訊息 | `authStatus !== "signed_in"` |
| Error Boundary | ✅ 包裹主要內容 | 2 個 ErrorBoundary |
| AbortController | ✅ 元件 unmount 時取消查詢 | `useDashboard.ts` 第 454-458 行 |

### 6.2 發現的問題

**P2 — All-or-nothing loading**

- `DashboardSkeleton` 是整頁取代，不是串流（streaming）或骨架逐步出現
- 如果某個查詢慢（例如 subscriptions），全部區塊都卡在 skeleton
- 但這是目前 `useDashboard` 的 single async block 架構決定的，改這個需要重構 hook

**P2 — 沒有部分失敗的處理**

- 如果 budgets 查詢失敗但 activities 成功，整頁顯示錯誤訊息
- 使用者失去所有資料，即使大部分資料是正常的
- 建議：每個區塊獨立 try/catch，部分資料可用就顯示

**P2 — SnapshotDashboard 沒有「新使用者歡迎狀態」**

- 新使用者所有數字都是 0 — 顯示所有行但全是 `NT$ 0`
- 沒有引導文字或提醒「新增你的第一個帳戶」
- 對比：`BudgetBarChart` 有「尚未設定預算」，`UpcomingSubscriptions` 有「近 30 天無訂閱」

**P3 — Briefing 在完全無資料時回傳空字串，元件回傳 null**

- 這正確，但沒有 fallback 說明

**P3 — Dead code: AnomalyDetection 和 AiAdvisor**

- 這兩個元件在 `components/` 目錄下，但 page.tsx 完全沒有 import 它們
- 它們有自己的載入狀態和錯誤處理，但永遠不會被看到
- 建議：如果 project 不需要就直接刪除，避免未來的開發者混淆

### 6.3 建議改善

1. **部分失敗處理**（P2）
   - 每個區塊由各自的子元件處理 error state，而不是整頁失敗
2. **新使用者 onboarding 指引**（P2）
   - 當 `totalBalance === 0 && accounts.length === 0` 時，顯示引導卡
   - 「歡迎使用 Detabase！點擊＋記下第一筆支出」
3. **清理 dead code**（P3）
   - 移除 `AnomalyDetection.tsx` 和 `AiAdvisor.tsx`，或移到 `_deprecated/` 目錄

### 6.4 優先級

| 問題 | 優先級 |
|:-----|:------:|
| 部分失敗導致整頁錯誤 | P2 |
| 新使用者無引導 | P2 |
| Dead code 元件 | P3 |

---

## 結論與綜合建議

### 立即行動 (P0-P1)

| 順序 | 行動 | 預期效果 |
|:----:|:-----|:---------|
| 1 | **Snapshot + KPI Row 去重合併** | 減少頁面 2/3 的重複區塊，掃讀時間從 15s → 5s |
| 2 | **擴充導航至 5-6 項，加入 `/transactions`** | 解決 4 個頁面不可發現的問題 |
| 3 | **加入「訊號燈」摘要至頁面頂部** | 疲勞使用者 1 秒判斷財務狀態 |
| 4 | **統一貨幣格式 `NT$` 或 `TWD`** | 消除認知混淆 |

### 近期改善 (P2)

| 順序 | 行動 |
|:----:|:-----|
| 5 | Briefing 移位置並折疊，或改 bullet point |
| 6 | Month navigation 加入滑動操作，增大可點擊區域 |
| 7 | Footer Summary 提升位置至 KPI 旁 |
| 8 | 部分失敗容錯處理（獨立 error boundary per section） |
| 9 | 新使用者 onboarding 引導卡片 |
| 10 | Sidebar 支援 submenu 展開 |

### 低優先 (P3)

- 清理 dead code （AnomalyDetection, AiAdvisor）
- 支援頁面錨點 deep link
- Breadcrumb 導航
- 每個 TxItem 增加到 44pt 點擊區域

### 綜合風險評估

| 風險 | 等級 | 說明 |
|:-----|:----:|:------|
| 去重合併可能遺失部分資料 | low | Snapshot + KPI + AccountOverview 各有不同細節，合併時需要確保所有欄位都有對應 |
| 擴充導航增加 sidebar 複雜度 | low | 從 3 項變 5-6 項不應影響可用性 |
| 訊號燈引擎需新邏輯 | medium | 需要定義判斷規則（何時紅/黃/綠） |
| 部分失敗容錯需重構 useDashboard | **high** | 需要將 single async block 拆成可獨立失敗的區塊，影響大 |
| 移除 dead code 無風險 | none | 兩個元件完全無人使用 |

### 最終建議

**建議 v1 優先（最小改動最大效果）：**

1. 去重 Snapshot + KPI Row（只改 `page.tsx` 佈局，不動 hook）
2. 擴充 NAV_ITEMS（只改 `Sidebar.tsx` 一行陣列）
3. 加入 `link to /transactions` 在「最近交易」卡片底部
4. 統一貨幣格式為 `NT$`（全域搜尋取代 `TWD` 前綴 → `NT$`）

這 4 件事總共約 **4 個檔案修改、0 個新檔案、0 個新 migration、1 小時內可完成**。

# P0 #2 資產負債儀表板架構設計

**結論：不需要新 migration 或 Edge Function。所有資料來源都已在 `useDashboard.ts` 查詢範圍內，只需在 `DashboardSummary` 新增 5 個 computed fields 並建立一個新的 `SnapshotDashboard` 元件，插入在 Briefing 和現有 KPI Row 之間。總計約 3 個檔案修改 + 1 個新檔案。**

---

## 1. 資料來源設計

### 1.1 五個大數字的資料來源一覽

| 指標 | 資料來源 | 計算方式 | 是否需要新查詢 |
|------|---------|---------|:------------:|
| 💰 手邊現金 | `finance_accounts`（已查詢） | `accountType === 'cash' && !isCoinBox` 帳戶的 balance 總和 | ❌ |
| 🏦 可用現金 | `finance_accounts`（已查詢） | 手邊現金 + `accountType === 'bank'` 帳戶的 balance 總和 | ❌ |
| 💳 信用卡已用 | `finance_accounts`（已查詢） | 每張信用卡：`Math.abs(balance)`，顯示 `已用 / 信用額度` | ❌ |
| 📉 負債總額 | `finance_accounts.total_loan`（已查詢） | 所有帳戶的 `total_loan` 總和（不限 account_type） | ❌ |
| 📊 本月淨值 | `finance_activities`（已查詢） | `thisMonthIncome - thisMonthExpense`（已在 DashboardSummary 中） | ❌ |

**核心結論：零新查詢、零新 migration、零新 Edge Function。全部資料都可以從現有 `useDashboard.ts` 的查詢結果中計算得出。**

### 1.2 手邊現金 vs 可用現金

| 指標 | 包含範圍 | 說明 |
|------|---------|------|
| 手邊現金 | `account_type = 'cash' AND is_coin_box = false` | 實體錢包、隨身現金（不含零錢盒） |
| 零錢盒（可選顯示） | `is_coin_box = true` | 強調：零錢盒是提醒式儲蓄，不計入手邊現金 |
| 可用現金 | 手邊現金 + `account_type = 'bank'` | 立刻可以動用的資金總和 |

**為什麼零錢盒不計入手邊現金？** 零錢盒雖然也是 cash 類型，但它是使用者刻意分離的「儲蓄用途」現金。使用者的心理模型是「手邊現金 = 日常花用」、「零錢盒 = 存起來的」。如果合併計算會讓使用者困惑。

### 1.3 信用卡已用計算公式

```
信用卡已用 = Math.abs(account.balance)
信用卡可用額度 = credit_limit - 信用卡已用
```

**現有 balance 計算方式**（`useDashboard.ts` 第 249 行）：
```typescript
balance = initial_balance + SUM(income) - SUM(expense)
```

對於信用卡帳戶：
- `income` = 繳款（還款，減少欠款）
- `expense` = 消費（刷卡，增加欠款）
- 因此 `balance` 通常為**負值**（欠款 > 繳款）

所以 `Math.abs(balance)` = 目前未繳的刷卡總額。

### 1.4 負債總額計算公式

```typescript
totalDebt = accounts.reduce((sum, a) => sum + (a.totalLoan ?? 0), 0)
```

`total_loan` 是 `finance_accounts` 表上的標量欄位，代表該帳戶關聯的貸款總額（如房貸、車貸、信貸）。**不限 account_type**，任何帳戶都可以有貸款值。

### 1.5 關鍵邊界案例

| 案例 | 處理方式 |
|------|---------|
| 沒有現金帳戶 | 手邊現金 = 0，顯示 "NT$ 0" |
| 沒有銀行帳戶 | 可用現金 = 手邊現金（僅現金） |
| 沒有信用卡 | 信用卡已用區塊隱藏，或顯示 "無信用卡" |
| 沒有貸款 | 負債總額 = 0 |
| credit_limit 為 null | 信用卡已用顯示 "NT$ X / —"（不顯示額度） |
| 多個幣別 | 目前系統強制 TWD，後續若支援多幣別需匯率換算 |

---

## 2. 元件架構

### 2.1 新元件：`SnapshotDashboard`

**位置**：`apps/web/app/dashboard/components/SnapshotDashboard.tsx`

**Props 設計**：
```typescript
interface SnapshotDashboardProps {
  cashOnHand: number;          // 手邊現金
  availableCash: number;       // 可用現金
  coinBoxBalance: number;      // 零錢盒餘額（可選顯示）
  creditCards: {               // 每張信用卡
    displayName: string;
    used: number;              // Math.abs(balance)
    creditLimit: number | null;
  }[];
  totalDebt: number;           // 負債總額
  monthlyNet: number;          // 本月淨值 (income - expense)
}
```

**視覺設計**（深色未來感戰情中心風格）：

```
┌─────────────────────────────────────────┐
│  💰 手邊現金           NT$ 12,450       │
│  🏦 可用現金           NT$ 45,000       │
│  💳 信用卡已用  NT$ 8,200 / 150,000     │
│  📉 負債總額           NT$ 320,000      │
│  📊 本月淨值           NT$ -5,300       │
└─────────────────────────────────────────┘
```

**CSS 設計原則**：
- 每個指標一橫行（iPhone 寬度有限，不適合兩欄網格）
- 左側 emoji 圖標作為視覺錨點
- 右側數字：字型 1.4rem ~ 1.6rem，monospace 數字，粗體
- 每行之間有微妙分隔線（border-bottom, opacity 0.08）
- 卡片整體帶半透明毛玻璃效果（backdrop-filter: blur）
- 本月淨值：正數綠色 (#34d399)、負數紅色 (#fb7185)、同 KPI 色系
- 信用卡已用百分比：超過 80% 時顯示 ⚠️ 圖標
- 負債總額 > 0 時，數字顯示為紅色系

### 2.2 載入狀態

**方式**：在 `DashboardSkeleton.tsx` 新增 5 行 skeleton 條

```tsx
{/* Snapshot skeleton */}
<div className="snapshot-skel">
  {[1, 2, 3, 4, 5].map((i) => (
    <div key={i} className="skel skel-box" style={{ height: 32, marginBottom: 8, borderRadius: 8 }} />
  ))}
</div>
```

插入位置：在 Briefing skeleton 之後、d-kpi-row-skel 之前。

### 2.3 錯誤狀態

Snapshot 不獨立處理錯誤。當 `useDashboard` 處於 `failure` 狀態時，整頁顯示錯誤訊息。當處於 `success` 但部分資料為 0 時，Snapshot 正常顯示（0 也是有效值）。

### 2.4 空狀態

| 情境 | 顯示 |
|------|------|
| 完全沒資料（新使用者） | 全部顯示 NT$ 0，信用卡區塊隱藏 |
| 部分帳戶類型不存在 | 隱藏對應的行（如無信用卡則不顯示💳行） |
| 僅有一張信用卡但無額度 | 顯示 "NT$ 0 / —" |

---

## 3. 需要的修改

### 3.1 檔案變更清單

| 檔案 | 修改類型 | 修改說明 |
|------|---------|---------|
| `apps/web/app/dashboard/components/SnapshotDashboard.tsx` | **新增** | 新的資產負債 snapshot 元件 |
| `apps/web/app/dashboard/hooks/useDashboard.ts` | 修改 | DashboardSummary 新增 5 個 computed snapshot fields |
| `apps/web/app/dashboard/page.tsx` | 修改 | 在 Briefing 與 KPI Row 之間插入 `<SnapshotDashboard>` |
| `apps/web/app/dashboard/components/DashboardSkeleton.tsx` | 修改 | 新增 snapshot skeleton 行 |
| `apps/web/app/globals.css` | 修改 | 新增 `.snapshot-*` CSS class |

### 3.2 `useDashboard.ts` 修改細項

**A. `DashboardSummary` type 新增欄位**（約第 19 行附近）：
```typescript
export type DashboardSummary = {
  // ... existing fields (line 19-57)
  
  // P0 #2: Snapshot dashboard fields
  cashOnHand: number;
  availableCash: number;
  coinBoxBalance: number;
  creditCards: { displayName: string; used: number; creditLimit: number | null }[];
  totalDebt: number;
};
```

**B. 計算邏輯**（在 `setState` 之前，約第 244-255 行的 accounts 計算之後插入）：
```typescript
// === P0 #2: Snapshot calculations ===
const cashOnHand = accounts
  .filter((a) => a.accountType === 'cash' && !a.isCoinBox)
  .reduce((s, a) => s + a.balance, 0);

const coinBoxBalance = accounts
  .filter((a) => a.isCoinBox)
  .reduce((s, a) => s + a.balance, 0);

const bankBalance = accounts
  .filter((a) => a.accountType === 'bank')
  .reduce((s, a) => s + a.balance, 0);

const availableCash = cashOnHand + bankBalance;

const creditCards = accounts
  .filter((a) => a.accountType === 'credit_card')
  .map((a) => ({
    displayName: a.displayName,
    used: Math.abs(a.balance),
    creditLimit: a.creditLimit,
  }));

const totalDebt = accounts.reduce((s, a) => s + (a.totalLoan ?? 0), 0);
```

**C. 寫入 state**（在 `setState` 的 data object 中新增，約第 376-389 行）：
```typescript
setState({
  status: "success",
  data: {
    // ... existing fields
    cashOnHand,
    availableCash,
    coinBoxBalance,
    creditCards,
    totalDebt,
  },
});
```

### 3.3 `page.tsx` 修改細項

在 Briefing 與 KPI Row 之間插入（第 126-128 行之間）：

```tsx
{/* ===== Snapshot: Asset-Liability Dashboard ===== */}
<SnapshotDashboard
  cashOnHand={state.data.cashOnHand}
  availableCash={state.data.availableCash}
  coinBoxBalance={state.data.coinBoxBalance}
  creditCards={state.data.creditCards}
  totalDebt={state.data.totalDebt}
  monthlyNet={state.data.thisMonthIncome - state.data.thisMonthExpense}
/>
```

並在 import 區域新增：
```typescript
import { SnapshotDashboard } from "./components/SnapshotDashboard";
```

### 3.4 現有 KPI Row 的衝突分析

**重要**：現有 KPI row 第五張卡「帳戶總餘額」與 Snapshot 的「可用現金」概念不同：

| 指標 | 用途 | 包含 |
|------|------|------|
| 帳戶總餘額（現有 KPI） | 所有帳戶的 balance 總和 | cash + bank + credit_card(負值) + stored_value + digital_account |
| 可用現金（Snapshot） | 立刻可動用的錢 | 手邊現金 + bank 餘額 |

**兩者並存**，各有意義。KPI row 保留不動，Snapshot 是新區塊。長期（P1+）可考慮將 KPI row 中「帳戶總餘額」卡片與 Snapshot 整合，但本次不改動現有 KPI。

---

## 4. SnapshotDashboard 元件實作指引

### 4.1 元件結構

```tsx
"use client";

interface CreditCardInfo {
  displayName: string;
  used: number;
  creditLimit: number | null;
}

interface SnapshotDashboardProps {
  cashOnHand: number;
  availableCash: number;
  coinBoxBalance: number;
  creditCards: CreditCardInfo[];
  totalDebt: number;
  monthlyNet: number;
}

export function SnapshotDashboard(props: SnapshotDashboardProps) {
  const { cashOnHand, availableCash, coinBoxBalance, creditCards, totalDebt, monthlyNet } = props;

  return (
    <div className="snapshot-card">
      <div className="snapshot-row">
        <span className="snapshot-label">💰 手邊現金</span>
        <span className="snapshot-value">NT$ {cashOnHand.toLocaleString()}</span>
      </div>
      {coinBoxBalance > 0 && (
        <div className="snapshot-row snapshot-sub">
          <span className="snapshot-label">🪙 零錢盒</span>
          <span className="snapshot-value">NT$ {coinBoxBalance.toLocaleString()}</span>
        </div>
      )}
      <div className="snapshot-row">
        <span className="snapshot-label">🏦 可用現金</span>
        <span className="snapshot-value">NT$ {availableCash.toLocaleString()}</span>
      </div>
      {/* ... */}
    </div>
  );
}
```

### 4.2 信用卡已用 — 特殊顯示

當有多張信用卡時，顯示「總已用 / 總額度」；但 hover/點擊可展開看各卡明細。

```tsx
{creditCards.length > 0 && (
  <div className="snapshot-row">
    <span className="snapshot-label">💳 信用卡已用</span>
    <span className="snapshot-value credit">
      NT$ {totalUsed.toLocaleString()}
      <span className="snapshot-value-sub">
        {totalLimit > 0 ? `/ ${totalLimit.toLocaleString()}` : ""}
      </span>
      {totalLimit > 0 && pct >= 80 && <span className="snapshot-warn"> ⚠️</span>}
    </span>
  </div>
)}
```

### 4.3 本月淨值 — 顏色邏輯

```tsx
const netClass = monthlyNet >= 0 ? "positive" : "negative";
```

---

## 5. 資料流圖

```
DB (finance_accounts)
  │ SELECT id, display_name, account_type, initial_balance, 
  │       credit_limit, total_loan, is_coin_box
  ▼
useDashboard.ts
  │ 計算帳戶 balance (initial_balance + income - expense)
  │ 計算 snapshot fields:
  │   cashOnHand = SUM(cash && !isCoinBox)
  │   availableCash = cashOnHand + SUM(bank)
  │   coinBoxBalance = SUM(isCoinBox)
  │   creditCards = MAP(credit_card → {used, limit})
  │   totalDebt = SUM(total_loan)
  ▼
DashboardSummary (含 snapshot fields)
  ▼
page.tsx → <SnapshotDashboard /> props
  ▼
使用者視覺：5 行大數字快照
```

---

## 6. 與現有功能的比較

| 功能 | 現有 KPI Row | Snapshot Dashboard | 說明 |
|------|:-----------:|:-----------------:|------|
| 本月支出 | ✅ | ❌ | 已存在，不重複 |
| 本月收入 | ✅ | ❌ | 已存在，不重複 |
| 淨流量 | ✅ | ✅（本月淨值） | Snapshot 更名為「本月淨值」，兩者相同 |
| 總預算 | ✅ | ❌ | 已存在，不重複 |
| 帳戶總餘額 | ✅ | ❌ | 保留在 KPI |
| 手邊現金 | ❌ | ✅ | **新增** |
| 可用現金 | ❌ | ✅ | **新增** |
| 信用卡已用 | ❌ | ✅ | **新增** |
| 負債總額 | ❌ | ✅ | **新增** |

**不重複的設計原則**：Snapshot 與 KPI Row 是互補關係。Snapshot 回答「我現在財務狀況如何？」（存量），KPI Row 回答「這個月花多少/賺多少？」（流量）。

---

## 7. 未來擴展（P1+）

| 功能 | 描述 | 優先級 |
|------|------|:------:|
| 📅 每日花費 vs 每日限額 | 在 Snapshot 下方顯示「今日已花 NT$ X，今日限額 NT$ Y」 | P1 |
| ⚠️ 風險提示 | 預算使用率過高時在 Snapshot 右上角顯示 ⚠️ 圖標 | P1 |
| 🪙 零錢盒獨立顯示 | 預設隱藏（`coinBoxBalance > 0` 時才顯示），可設定常駐顯示 | P1 |
| 📈 淨值走勢迷你圖 | 在「本月淨值」旁顯示過去 6 個月的淨值變化趨勢 | P2 |
| 💡 快照可折疊 | 長按可折疊/展開 Snapshot 區塊，給熟練使用者更多客製化 | P2 |

---

## 8. 實作評估

| 項目 | 估計工作量 | 依賴 |
|------|:---------:|------|
| `DashboardSummary` type 擴充 + 計算邏輯 | 20 行 | 無 |
| `SnapshotDashboard` 元件 | 80-100 行 | 無 |
| `page.tsx` 插入 + import | 5 行 | 無 |
| `DashboardSkeleton` 擴充 | 10 行 | 無 |
| `globals.css` snapshot 樣式 | 50-80 行 | 無 |
| **總計** | **約 2-3 小時** | **零依賴** |

**本設計完全不需要**：
- ❌ 新 migration
- ❌ 新 Edge Function
- ❌ 新 RPC
- ❌ 修改現有元件行為
- ❌ API 變更

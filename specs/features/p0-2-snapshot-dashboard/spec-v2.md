# P0 #2 資產負債儀表板 — Spec v2

**任務 ID**: P0-002-implement
**狀態**: ✅ 已批准實作
**設計來源**: `specs/features/p0-2-snapshot-dashboard/design.md` (Architect)
**工兵官**: OPC Builder

---

## 1. 任務摘要

在 Dashboard **Briefing** 與 **KPI Row** 之間新增一個**資產負債快照儀表板**（SnapshotDashboard）區塊，顯示 6 個關鍵財務存量指標：手邊現金、零錢盒、可用現金、信用卡已用、負債總額、本月淨值。**零新 migration、零新 Edge Function、零新 RPC、零新資料查詢** — 所有資料均從 `useDashboard.ts` 現有查詢結果計算得出。

---

## 2. 範圍

### ✅ 包含

| 項目 | 說明 |
|------|------|
| 新元件: `SnapshotDashboard.tsx` | 6 行財務存量快照卡片（深色未來感戰情中心風格） |
| `useDashboard.ts`: `DashboardSummary` type 擴充 | 新增 5 個計算欄位: `cashOnHand`, `availableCash`, `coinBoxBalance`, `creditCards[]`, `totalDebt` |
| `useDashboard.ts`: 計算邏輯 | 從 `accounts[]` map 結果計算 6 個 snapshot 值 |
| `page.tsx`: 元件插入 | 在 Briefing (line 126) 與 KPI Row (line 128) 之間插入 `<SnapshotDashboard>` |
| `page.tsx`: import | 新增 `SnapshotDashboard` import |
| `DashboardSkeleton.tsx`: 載入骨架 | 新增 5 行 skeleton 條（在 Briefing skeleton 之後） |
| `globals.css`: 樣式 | 新增 `.snapshot-*` CSS class（毛玻璃卡片、單行佈局、顏色邏輯） |
| 新增 `specs/sop/codex-task-p0-2-implement.json` | Codex CLI 任務包 |

### ❌ 不包含

| 項目 | 原因 |
|------|------|
| 新 migration | 全用現有欄位，無 schema 變更 |
| 新 Edge Function / RPC | 純前端計算，無需後端新 API |
| 修改現有 KPI Row | Snapshot 與 KPI 是互補關係（存量 vs 流量），並存不衝突 |
| 修改 Budgets / Subscriptions | 正交功能 |
| 多幣別支援 | 系統目前強制 TWD，P1+ 再處理 |
| 淨值走勢迷你圖 | P2 功能，本次不包含 |
| git commit / push | 實作後由小馬手動處理 |

---

## 3. UI 需求

### 3.1 SnapshotDashboard 區塊

**位置**：Dashboard 頁面中，Briefing（戰情摘要）**下方**、KPI Row（5 張卡片）**上方**。

**視覺設計**（iPhone 單欄深色未來感戰情中心風格）：

```
┌──────────────────────────────────────────────┐
│  💰 手邊現金                    NT$ 12,450   │
│  🪙 零錢盒                      NT$ 2,800    │  ← 僅當 > 0 時顯示
├──────────────────────────────────────────────┤
│  🏦 可用現金                    NT$ 45,000   │
│  💳 信用卡已用     NT$ 8,200 / 150,000  ⚠️   │  ← >80% 顯示 ⚠️
│  📉 負債總額                    NT$ 320,000  │  ← >0 時紅字
├──────────────────────────────────────────────┤
│  📊 本月淨值                    NT$ -5,300   │  ← 負數紅字、正數綠字
└──────────────────────────────────────────────┘
```

### 3.2 CSS 設計原則

| 屬性 | 值 |
|------|-----|
| 佈局 | 單欄、每指標一橫行（iPhone 寬度不適合兩欄） |
| 左側 | emoji 圖標作為視覺錨點 |
| 右側數字 | `1.4rem` ~ `1.6rem`，monospace，粗體 |
| 行分隔線 | `border-bottom`，`opacity: 0.08` 微妙分隔 |
| 卡片背景 | 半透明毛玻璃效果（`backdrop-filter: blur`） |
| 本月淨值 | 正數 `#34d399`（綠色）、負數 `#fb7185`（紅色），同 KPI 色系 |
| 信用卡 >80% | 顯示 ⚠️ 圖標 |
| 負債總額 > 0 | 數字顯示紅色系 |

### 3.3 信用卡特殊顯示

```tsx
// 單卡：直接顯示
NT$ 8,200 / 150,000

// 多卡：顯示「總已用 / 總額度」，hover/點擊可展開看各卡明細（本次僅合計）
const totalUsed = creditCards.reduce((s, c) => s + c.used, 0);
const totalLimit = creditCards.reduce((s, c) => s + (c.creditLimit ?? 0), 0);
const pct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
```

### 3.4 載入狀態

在 `DashboardSkeleton.tsx` 的 Briefing skeleton 之後、d-kpi-row-skel 之前插入：

```tsx
{/* Snapshot skeleton */}
<div className="snapshot-skel">
  {[1, 2, 3, 4, 5].map((i) => (
    <div key={i} className="skel skel-box" style={{ height: 32, marginBottom: 8, borderRadius: 8 }} />
  ))}
</div>
```

### 3.5 空狀態 / 邊界案例

| 情境 | 顯示方式 |
|------|---------|
| 完全沒資料（新使用者） | 全部顯示 NT$ 0，信用卡區塊隱藏 |
| 無現金帳戶 | 手邊現金 = 0，不顯示零錢盒行 |
| 無銀行帳戶 | 可用現金 = 手邊現金（僅現金） |
| 無信用卡 | 💳 行隱藏 |
| 無貸款 | 負債總額 = 0 |
| `creditLimit` 為 null | 顯示 `NT$ X / —`（不顯示額度） |
| 零錢盒餘額 = 0 | 🪙 行隱藏（`coinBoxBalance > 0` 時才顯示） |

### 3.6 錯誤狀態

Snapshot 不獨立處理錯誤。當 `useDashboard` 處於 `failure` 狀態時，整頁顯示錯誤訊息。當處於 `success` 但部分資料為 0 時，Snapshot 正常顯示（0 也是有效值）。

---

## 4. 計算欄位定義

### 4.1 六個計算欄位一覽

所有計算在 `useDashboard.ts` 的 `accounts.map()` 之後（line 244-254）、`setState`（line 376）之前插入。

```typescript
// ===== P0 #2: Snapshot calculations =====

// 💰 手邊現金: 現金帳戶（不含零錢盒）的 balance 總和
const cashOnHand = accounts
  .filter((a) => a.accountType === 'cash' && !a.isCoinBox)
  .reduce((s, a) => s + a.balance, 0);

// 🪙 零錢盒: isCoinBox === true 的帳戶 balance 總和
const coinBoxBalance = accounts
  .filter((a) => a.isCoinBox)
  .reduce((s, a) => s + a.balance, 0);

// 🏦 銀行餘額（內部用）
const bankBalance = accounts
  .filter((a) => a.accountType === 'bank')
  .reduce((s, a) => s + a.balance, 0);

// 🏦 可用現金: 手邊現金 + 銀行餘額
const availableCash = cashOnHand + bankBalance;

// 💳 信用卡已用: 每張信用卡的 Math.abs(balance)
const creditCards = accounts
  .filter((a) => a.accountType === 'credit_card')
  .map((a) => ({
    displayName: a.displayName,
    used: Math.abs(a.balance),
    creditLimit: a.creditLimit,
  }));

// 📉 負債總額: 所有帳戶的 totalLoan 總和（不限 account_type）
const totalDebt = accounts.reduce((s, a) => s + (a.totalLoan ?? 0), 0);
```

### 4.2 本月淨值（在 page.tsx 計算）

`monthlyNet` 不在 `DashboardSummary` type 中新增，而是在 `page.tsx` 傳 props 時動態計算：

```typescript
monthlyNet={state.data.thisMonthIncome - state.data.thisMonthExpense}
```

**理由**：`thisMonthIncome` 與 `thisMonthExpense` 已在 `DashboardSummary` 中，`monthlyNet` 是純衍生值，無需重複存入 state。

---

## 5. Data Flow

```
DB (finance_accounts)
  │ SELECT id, display_name, account_type, initial_balance,
  │       credit_limit, total_loan, is_coin_box
  ▼
useDashboard.ts (line 244-254)
  │ accounts.map() → AccountSummary[] (含 balance, creditLimit, totalLoan, isCoinBox)
  │
  │ 新增計算 (line 255-297 之間):
  │   cashOnHand     = SUM(cash && !isCoinBox)
  │   coinBoxBalance = SUM(isCoinBox)
  │   bankBalance    = SUM(bank)
  │   availableCash  = cashOnHand + bankBalance
  │   creditCards[]  = MAP(credit_card → {displayName, used, creditLimit})
  │   totalDebt      = SUM(total_loan)
  │
  ▼
DashboardSummary (新増 5 fields)
  ▼
page.tsx
  │ props: cashOnHand, availableCash, coinBoxBalance,
  │        creditCards, totalDebt,
  │        monthlyNet={thisMonthIncome - thisMonthExpense}
  ▼
<SnapshotDashboard /> — 6 行存量快照視覺
```

---

## 6. SnapshotDashboard 元件實作指引

### 6.1 檔案位置

`apps/web/app/dashboard/components/SnapshotDashboard.tsx`

### 6.2 Props 與元件架構

```typescript
"use client";

interface CreditCardInfo {
  displayName: string;
  used: number;           // Math.abs(balance)
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
  const {
    cashOnHand, availableCash, coinBoxBalance,
    creditCards, totalDebt, monthlyNet,
  } = props;

  // Computed display values
  const creditTotalUsed = creditCards.reduce((s, c) => s + c.used, 0);
  const creditTotalLimit = creditCards.reduce((s, c) => s + (c.creditLimit ?? 0), 0);
  const creditPct = creditTotalLimit > 0 ? (creditTotalUsed / creditTotalLimit) * 100 : 0;
  const hasWarning = creditTotalLimit > 0 && creditPct >= 80;
  const netClass = monthlyNet >= 0 ? "snapshot-positive" : "snapshot-negative";
  const debtClass = totalDebt > 0 ? "snapshot-debt" : "";

  return (
    <div className="snapshot-card">
      {/* 💰 手邊現金 */}
      <div className="snapshot-row">
        <span className="snapshot-label">💰 手邊現金</span>
        <span className="snapshot-value">NT$ {cashOnHand.toLocaleString()}</span>
      </div>

      {/* 🪙 零錢盒 — 僅 coinBoxBalance > 0 時顯示 */}
      {coinBoxBalance > 0 && (
        <div className="snapshot-row snapshot-sub">
          <span className="snapshot-label">🪙 零錢盒</span>
          <span className="snapshot-value">NT$ {coinBoxBalance.toLocaleString()}</span>
        </div>
      )}

      {/* 🏦 可用現金 */}
      <div className="snapshot-row">
        <span className="snapshot-label">🏦 可用現金</span>
        <span className="snapshot-value">NT$ {availableCash.toLocaleString()}</span>
      </div>

      {/* 💳 信用卡已用 — 僅 creditCards.length > 0 時顯示 */}
      {creditCards.length > 0 && (
        <div className="snapshot-row">
          <span className="snapshot-label">💳 信用卡已用</span>
          <span className="snapshot-value snapshot-credit">
            NT$ {creditTotalUsed.toLocaleString()}
            {creditTotalLimit > 0 && (
              <span className="snapshot-value-sub">
                {" / "}{creditTotalLimit.toLocaleString()}
              </span>
            )}
            {hasWarning && <span className="snapshot-warn"> ⚠️</span>}
          </span>
        </div>
      )}

      {/* 📉 負債總額 */}
      <div className="snapshot-row">
        <span className="snapshot-label">📉 負債總額</span>
        <span className={`snapshot-value ${debtClass}`}>
          NT$ {totalDebt.toLocaleString()}
        </span>
      </div>

      {/* 📊 本月淨值 */}
      <div className="snapshot-row">
        <span className="snapshot-label">📊 本月淨值</span>
        <span className={`snapshot-value ${netClass}`}>
          {monthlyNet >= 0 ? "" : "-"}NT$ {Math.abs(monthlyNet).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
```

### 6.3 CSS Class 對照

| Class | 用途 |
|-------|------|
| `.snapshot-card` | 外層卡片容器（毛玻璃效果） |
| `.snapshot-row` | 單行水平佈局（flex, space-between） |
| `.snapshot-label` | 左側 emoji + 文字標籤 |
| `.snapshot-value` | 右側數字值（monospace, 粗體） |
| `.snapshot-value-sub` | 子數字（如信用卡額度，使用較淡顏色） |
| `.snapshot-sub` | 子行（零錢盒，縮排、較小字型） |
| `.snapshot-positive` | 正值顏色（綠色 `#34d399`） |
| `.snapshot-negative` | 負值顏色（紅色 `#fb7185`） |
| `.snapshot-debt` | 負債顏色（紅色系，同 negative） |
| `.snapshot-warn` | ⚠️ 警告圖標（黃色） |
| `.snapshot-skel` | Skeleton 容器 |

---

## 7. 檔案修改清單

| 檔案 | 修改類型 | 修改說明 |
|------|---------|---------|
| `apps/web/app/dashboard/components/SnapshotDashboard.tsx` | **新增** | 新的資產負債 snapshot 元件（約 80-100 行） |
| `apps/web/app/dashboard/hooks/useDashboard.ts` | 修改 | `DashboardSummary` type 新增 5 fields + 計算邏輯（約 25 行） |
| `apps/web/app/dashboard/page.tsx` | 修改 | 在 Briefing 與 KPI Row 之間插入 `<SnapshotDashboard>` + import（約 10 行） |
| `apps/web/app/dashboard/components/DashboardSkeleton.tsx` | 修改 | 新增 snapshot skeleton 5 行（約 10 行） |
| `apps/web/app/globals.css` | 修改 | 新增 `.snapshot-*` CSS class（約 50-80 行） |

---

## 8. 驗收標準

- [ ] `DashboardSummary` type 新增 `cashOnHand: number`
- [ ] `DashboardSummary` type 新增 `availableCash: number`
- [ ] `DashboardSummary` type 新增 `coinBoxBalance: number`
- [ ] `DashboardSummary` type 新增 `creditCards: { displayName: string; used: number; creditLimit: number | null }[]`
- [ ] `DashboardSummary` type 新增 `totalDebt: number`
- [ ] `useDashboard.ts` 在 `accounts.map()` 之後正確計算 `cashOnHand`（SUM cash && !isCoinBox）
- [ ] `useDashboard.ts` 正確計算 `coinBoxBalance`（SUM isCoinBox）
- [ ] `useDashboard.ts` 正確計算 `bankBalance` 並加總到 `availableCash`
- [ ] `useDashboard.ts` 正確計算 `creditCards[]`（MAP credit_card → Math.abs(balance)）
- [ ] `useDashboard.ts` 正確計算 `totalDebt`（SUM total_loan）
- [ ] `useDashboard.ts` setState data 包含所有 5 個新欄位
- [ ] `SnapshotDashboard.tsx` 元件存在於 `components/` 目錄
- [ ] `SnapshotDashboard.tsx` 接受正確的 Props interface
- [ ] `page.tsx` 正確 import `SnapshotDashboard`
- [ ] `page.tsx` 在 Briefing 與 KPI Row 之間插入 `<SnapshotDashboard>`
- [ ] `page.tsx` 傳入 `monthlyNet={state.data.thisMonthIncome - state.data.thisMonthExpense}`
- [ ] `cashOnHand` 顯示格式 `NT$ X,XXX`（toLocaleString）
- [ ] `coinBoxBalance > 0` 時才顯示 🪙 行，否則隱藏
- [ ] 無信用卡時 💳 行隱藏
- [ ] `creditLimit` 為 null 時顯示 `NT$ X / —`
- [ ] 信用卡使用率 >= 80% 時顯示 ⚠️
- [ ] `totalDebt > 0` 時數字顯示紅色系
- [ ] `monthlyNet >= 0` 時綠色，`< 0` 時紅色
- [ ] `DashboardSkeleton.tsx` 新增 5 行 snapshot skeleton
- [ ] `globals.css` 包含所有 `.snapshot-*` class
- [ ] `npm run build` 通過，無 TypeScript 錯誤

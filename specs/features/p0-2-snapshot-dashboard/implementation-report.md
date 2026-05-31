# P0-002 Snapshot Dashboard Implementation Report

## 1. 修改檔案清單

- 新增 `apps/web/app/dashboard/components/SnapshotDashboard.tsx`
- 修改 `apps/web/app/dashboard/hooks/useDashboard.ts`
- 修改 `apps/web/app/dashboard/page.tsx`
- 修改 `apps/web/app/dashboard/components/DashboardSkeleton.tsx`
- 修改 `apps/web/app/globals.css`

## 2. 關鍵變更摘要

- `SnapshotDashboard.tsx`: 新增 98 行 client component，顯示手邊現金、零錢盒、可用現金、信用卡已用、負債總額、本月淨值；零錢盒與信用卡列依資料條件隱藏。
- `useDashboard.ts`: `DashboardSummary` 新增 `cashOnHand`, `availableCash`, `coinBoxBalance`, `creditCards`, `totalDebt`；所有值都在現有 `accounts` map 結果後計算，沒有新增查詢。
- `page.tsx`: import `SnapshotDashboard`，插入於 `Briefing` 與 KPI Row 之間；`monthlyNet` 以 `thisMonthIncome - thisMonthExpense` props 傳入。
- `DashboardSkeleton.tsx`: Briefing skeleton 後新增 5 行 snapshot skeleton。
- `globals.css`: 新增 `.snapshot-*` 樣式，包含毛玻璃卡片、單行 row、正負值、負債、警告、skeleton。

## 3. 關鍵程式碼片段

### SnapshotDashboard JSX

```tsx
<section className="snapshot-card" aria-label="資產負債快照">
  <SnapshotRow label="💰 手邊現金" value={formatTWD(cashOnHand)} />
  {coinBoxBalance > 0 && (
    <SnapshotRow label="🪙 零錢盒" value={formatTWD(coinBoxBalance)} rowClassName="snapshot-sub" />
  )}
  <SnapshotRow label="🏦 可用現金" value={formatTWD(availableCash)} />
  {creditCards.length > 0 && (
    <SnapshotRow
      label="💳 信用卡已用"
      value={
        <>
          {formatTWD(creditTotalUsed)}
          <span className="snapshot-value-sub">
            {" / "}{creditTotalLimit > 0 ? creditTotalLimit.toLocaleString() : "—"}
          </span>
          {hasCreditWarning && <span className="snapshot-warn"> ⚠️</span>}
        </>
      }
    />
  )}
  <SnapshotRow label="📉 負債總額" value={formatTWD(totalDebt)} valueClassName={debtClass} />
  <SnapshotRow
    label="📊 本月淨值"
    value={`${monthlyNet >= 0 ? "" : "-"}${formatTWD(Math.abs(monthlyNet))}`}
    valueClassName={netClass}
  />
</section>
```

### useDashboard 計算邏輯

```ts
const cashOnHand = accounts
  .filter((a) => a.accountType === "cash" && !a.isCoinBox)
  .reduce((s, a) => s + a.balance, 0);
const coinBoxBalance = accounts
  .filter((a) => a.isCoinBox)
  .reduce((s, a) => s + a.balance, 0);
const bankBalance = accounts
  .filter((a) => a.accountType === "bank")
  .reduce((s, a) => s + a.balance, 0);
const availableCash = cashOnHand + bankBalance;
const creditCards = accounts
  .filter((a) => a.accountType === "credit_card")
  .map((a) => ({
    displayName: a.displayName,
    used: Math.abs(a.balance),
    creditLimit: a.creditLimit,
  }));
const totalDebt = accounts.reduce((s, a) => s + (a.totalLoan ?? 0), 0);
```

### CSS classes

```css
.snapshot-card { display: grid; backdrop-filter: blur(18px); }
.snapshot-row { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); }
.snapshot-label { color: rgba(226, 232, 240, 0.82); white-space: nowrap; }
.snapshot-value { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-variant-numeric: tabular-nums; }
.snapshot-positive { color: #34d399; }
.snapshot-negative, .snapshot-debt { color: #fb7185; }
.snapshot-warn { color: #fbbf24; }
.snapshot-sub { background: rgba(20, 184, 166, 0.05); }
.snapshot-skel { display: grid; padding: 12px; }
```

## 4. `npm run build` 結果

✅ 成功。

執行目錄：`apps/web`

結果摘要：

```text
✓ Compiled successfully
Finished TypeScript
✓ Generating static pages
```

注意：Next.js 顯示 workspace root 推斷警告，原因是 repo root 與 `apps/web` 同時存在 lockfile；不影響 build 成功。

## 5. 驗收條件

- ✅ `DashboardSummary` type 包含 `cashOnHand`
- ✅ `DashboardSummary` type 包含 `availableCash`
- ✅ `DashboardSummary` type 包含 `coinBoxBalance`
- ✅ `DashboardSummary` type 包含 `creditCards[]`
- ✅ `DashboardSummary` type 包含 `totalDebt`
- ✅ `cashOnHand` 正確計算 `cash && !isCoinBox`
- ✅ `coinBoxBalance` 正確計算 `isCoinBox`
- ✅ `bankBalance` 正確計算並加總到 `availableCash`
- ✅ `creditCards[]` 正確 map `credit_card` 到 `{ displayName, used: Math.abs(balance), creditLimit }`
- ✅ `totalDebt` 正確加總 `total_loan`
- ✅ `setState` data 包含 5 個新欄位
- ✅ `SnapshotDashboard.tsx` 存在於 components 目錄
- ✅ `SnapshotDashboard.tsx` Props interface 正確
- ✅ `page.tsx` 正確 import `SnapshotDashboard`
- ✅ `page.tsx` 在 Briefing 與 KPI Row 之間插入 `<SnapshotDashboard>`
- ✅ `page.tsx` 傳入 `monthlyNet={state.data.thisMonthIncome - state.data.thisMonthExpense}`
- ✅ `cashOnHand` 顯示 `NT$ X,XXX`
- ✅ `coinBoxBalance > 0` 才顯示零錢盒列
- ✅ `creditCards.length === 0` 時信用卡列隱藏
- ✅ `creditLimit` 為 null 時顯示 `NT$ X / —`
- ✅ 信用卡使用率 `>= 80%` 顯示 `⚠️`
- ✅ `totalDebt > 0` 時使用紅色系 `.snapshot-debt`
- ✅ `monthlyNet >= 0` 使用 `#34d399`，`< 0` 使用 `#fb7185`
- ✅ `DashboardSkeleton.tsx` 新增 5 行 snapshot skeleton
- ✅ `globals.css` 包含 `.snapshot-card`, `.snapshot-row`, `.snapshot-label`, `.snapshot-value`, `.snapshot-positive`, `.snapshot-negative`, `.snapshot-debt`, `.snapshot-warn`, `.snapshot-sub`, `.snapshot-skel`
- ✅ `npm run build` 通過，無 TypeScript 錯誤

## 6. 未滿足項目

無。

## 7. 風險評估

- 低風險：本次沒有新增 migration、Edge Function、RPC 或資料查詢，計算只使用既有 dashboard 帳戶資料。
- UI 風險：極小螢幕或很大的金額可能讓右側數字較擠；已用單行、monospace、mobile font-size 下修降低風險。
- 資料語意：信用卡使用額沿用現有 balance 模型 `Math.abs(balance)`；若未來信用卡 balance 改成正值語意，仍會顯示絕對值。

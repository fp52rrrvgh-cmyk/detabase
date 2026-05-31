# OPC Review: P0 #2 資產負債儀表板 Spec v2

**角色**: 稽核官（OPC Reviewer）
**審查日期**: 2026-05-31
**審查素材**:
- `specs/features/p0-2-snapshot-dashboard/spec-v2.md`（Builder Spec）
- `specs/features/p0-2-snapshot-dashboard/design.md`（Architect 設計）
- `specs/sop/codex-task-p0-2-implement.json`（Codex 任務包）

---

## 最終判定：PASS（MINOR_ISSUES）

**判定說明**: Spec 整體完整、一致、安全，可交付實作。發現 4 項 minor issues，不構成 blocking，但建議實作前釐清。

---

## 一、完整性 ✅（26/26 條驗收條件完整）

Spec v2 第 335–360 行列出 **26 條驗收條件**，涵蓋：

| 範疇 | 條數 | 說明 |
|------|:----:|------|
| `DashboardSummary` type 擴充 | 5 | cashOnHand, availableCash, coinBoxBalance, creditCards[], totalDebt |
| `useDashboard.ts` 計算邏輯 | 5 | 每項計算公式驗證（含 bankBalance 內部欄位） |
| `useDashboard.ts` state 寫入 | 1 | setState data 包含全部 5 個新欄位 |
| `SnapshotDashboard.tsx` 元件 | 2 | 檔案存在 + Props interface 正確 |
| `page.tsx` 插入 | 3 | import + 位置正確 + monthlyNet props 傳遞 |
| UI 顯示邏輯 | 6 | 格式、條件顯示、顏色邏輯 |
| `DashboardSkeleton.tsx` | 1 | 5 行 skeleton |
| `globals.css` | 1 | 全部 .snapshot-* class |
| 建置驗證 | 1 | npm run build 通過 |
| **總計** | **26** | ✅ |

Codex 任務包（`codex-task-p0-2-implement.json`）的 `acceptance_criteria`（22 條）已完整涵蓋所有 Spec 26 條，無遺漏。

---

## 二、一致性 ⚠️ Minor Issues

### 2.1 Design 視覺 Mockup 遺漏零錢盒行

| 文件 | 手邊現金 | 零錢盒 | 可用現金 | 信用卡 | 負債總額 | 本月淨值 |
|:-----|:-------:|:------:|:--------:|:-----:|:--------:|:--------:|
| design.md §2.1 mockup | ✅ | ❌ 遺漏 | ✅ | ✅ | ✅ | ✅ |
| spec-v2.md §3.1 mockup | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Architect 設計的 mockup（第 96–103 行）只有 5 行，完全沒有 🪙 零錢盒**，但 §1.2 有正確討論零錢盒的語意。Spec 在此更完整，mockup 包含零錢盒並附帶條件顯示註解。

**建議**: Design mockup 應補上 🪙 零錢盒行，並與 spec 的 section divider（├──┤）視覺分組對齊。

### 2.2 無信用卡時的顯示方式

| 文件 | 表述 |
|:-----|:-----|
| design.md §1.5 | 「信用卡已用區塊隱藏，**或顯示『無信用卡』**」 |
| spec-v2.md §3.5 | 「💳 行隱藏」（單一選擇） |

Design 保留兩種選項（隱藏 或 顯示「無信用卡」），Spec 選擇了隱藏。**非矛盾**，但為了避免實作時困惑，應在 Design 中統一行為。

**建議**: Design 應跟進 Spec 的決定：**💳 行隱藏**（乾淨簡潔，符合大數字快照設計哲學）。

### 2.3 信用卡 hover/點擊展開功能範圍模糊

| 文件 | 表述 |
|:-----|:-----|
| design.md §4.2 | 「hover/點擊可展開看各卡明細」 |
| spec-v2.md §3.3 | 「本次僅合計」 |
| codex-task.json Excludes | 「信用卡逐卡展開明細功能（本次僅顯示合計）」✓ 明確排除 |

Design 的文字「hover/點擊可展開」容易讓實作者誤以為這是本次範圍。**Codex 已明確排除**，但 Design 應加上「(P2)」標記以保持一致。

---

## 三、安全性 ✅（極高）

| 檢查項目 | 結果 | 說明 |
|:---------|:----:|:-----|
| 新 migration | ❌ 無 | 全用現有 `finance_accounts` 欄位 |
| 新 Edge Function | ❌ 無 | 純前端計算，無後端新 API |
| 新 RPC | ❌ 無 | — |
| RLS 政策修改 | ❌ 無 | — |
| 資料庫寫入 | ❌ 無 | 唯讀計算，無副作用 |
| 新資料查詢 | ❌ 無 | 全部從現有 `useDashboard` 查詢結果衍生 |
| 環境變數變更 | ❌ 無 | — |

**風險評級**: 極低。唯一風險來自前端計算邏輯的正確性。

### 3.1 計算邏輯驗證

| 欄位 | 公式 | 正確性 |
|:-----|:-----|:------:|
| `cashOnHand` | `filter(cash && !isCoinBox).reduce(balance)` | ✅ |
| `coinBoxBalance` | `filter(isCoinBox).reduce(balance)` | ✅ |
| `bankBalance` | `filter(bank).reduce(balance)` | ✅（內部欄位） |
| `availableCash` | `cashOnHand + bankBalance` | ✅ |
| `creditCards[]` | `filter(credit_card).map({used: Math.abs(balance), creditLimit})` | ✅ |
| `totalDebt` | `reduce(totalLoan ?? 0)` | ✅（含 null 保護） |
| `monthlyNet` | `thisMonthIncome - thisMonthExpense` | ✅（在 page.tsx 動態計算） |

### 3.2 邊界案例保護驗證

| 情境 | 處理 | 正確性 |
|:-----|:----:|:------:|
| `creditTotalLimit = 0` → 除零 | `creditTotalLimit > 0 && creditPct >= 80` 短路保護 | ✅ |
| `totalLoan = null/undefined` | `?? 0` 預設值 | ✅ |
| `creditLimit = null` | 顯示 `NT$ X / —` | ✅ |
| 無任何帳戶 | 全部顯示 NT$ 0，信用卡行隱藏 | ✅ |

---

## 四、使用者情境 ⚠️ Minor Issue

### 優點
- **單欄佈局**: iPhone 寬度下每指標一橫行，無橫向滾動 ✅
- **大數字**: `1.4rem ~ 1.6rem` monospace 粗體，一目了然 ✅
- **emoji 視覺錨點**: 快速掃描定位 ✅
- **顏色編碼**: 紅/綠直覺表示正/負值 ✅
- **條件顯示**: 零錢盒/信用卡只在有資料時出現，減少雜訊 ✅
- **⚠️ 預警**: 信用卡使用率 >= 80% 顯示警告 ✅
- **零操作**: 純瀏覽，不需點擊即可獲得財務快照 ✅

### Minor Issue: 觸控目標大小未指定

Spec 沒有明確指定每行 snapshot row 的最小高度。iOS Human Interface Guidelines 建議最小觸控目標 **44pt**。如果 snapshot row 高度僅由 `1.4rem` 字型 + padding 決定，可能低於 44pt，影響單手操作體驗。

**建議**: 在 CSS 中明確設定 `.snapshot-row` 最小高度為 `44px`（或 `min-height: 2.75rem`），確保疲勞狀態下也能準確點擊。

---

## 五、邊界案例 ✅ 完整覆蓋

Spec §3.5 明確定義 7 種邊界案例的顯示行為：

| # | 案例 | 處理方式 | 驗收 |
|:-:|:-----|:---------|:----:|
| 1 | 完全沒資料（新使用者） | 全部 NT$ 0，信用卡隱藏 | ✅ |
| 2 | 無現金帳戶 | 手邊現金 = 0，不顯示零錢盒行 | ✅ |
| 3 | 無銀行帳戶 | 可用現金 = 手邊現金（僅現金） | ✅ |
| 4 | 無信用卡 | 💳 行隱藏 | ✅ |
| 5 | 無貸款 | 負債總額 = 0（預設顏色，非紅色） | ✅ |
| 6 | creditLimit 為 null | 顯示 `NT$ X / —`（不顯示額度） | ✅ |
| 7 | 零錢盒餘額 = 0 | 🪙 行隱藏 | ✅ |

### 建議補充的邊界案例

雖非 blocking，但建議在實作時確認：

- **負值手邊現金**: 現金帳戶 balance 是否可能為負？若可能，顯示 `-NT$ X` 是否合理？
- **巨大數值顯示**: `toLocaleString()` 能處理到約 15 位有效數字，超過時會顯示科學記號。實務上單人財務系統不會遇到此情況，無需特別處理。
- **負值零錢盒**: 邏輯上零錢盒不應為負，但若因資料錯誤而出現負值，`> 0` 條件會隱藏該行，可能讓使用者困惑。

---

## 六、補充觀察

### 6.1 「本月淨值」命名討論

| 指標 | 計算公式 | 傳統命名 |
|:-----|:---------|:---------|
| 本月淨值（Spec 命名） | `thisMonthIncome - thisMonthExpense` | **淨流量**（Net Cash Flow） |
| 淨值（傳統財務定義） | 總資產 − 總負債 | Net Worth |

Spec 使用「本月淨值」但實際計算是「本月收支差額（淨流量）」。Design §6 已承認這等同於 KPI Row 的「淨流量」。這是一個**命名不一致**的問題，但考慮到：
1. 這是 P0 快速功能，共識已建立
2. 使用者語意上「這個月存了多少」確實接近「本月淨值」的日常理解
3. Design §7 已規劃 P2 趨勢圖擴展

**建議**: 若後續 P2 加入真正的淨值計算（總資產 - 總負債），應改名為「本月結餘」或「本月淨流量」，避免混淆。

### 6.2 QA 測試建議

根據 spec 驗收標準，建議測試案例：

1. **正常資料**（有現金、銀行、信用卡、貸款）→ 6 行完整顯示
2. **僅現金** → 只顯示手邊現金、可用現金（=手邊現金）、本月淨值
3. **僅信用卡** → 顯示信用卡已用、本月淨值
4. **信用卡使用率 79%** → 無 ⚠️
5. **信用卡使用率 80%** → ⚠️ 顯示
6. **信用卡使用率 100%+** → ⚠️ 顯示（無上限檢查，但合理）
7. **loading 狀態** → Skeleton 5 行正確顯示
8. **edge: creditLimit = 0** → 顯示 `NT$ X / —`（因 `> 0` 條件不成立）
9. **edge: all values = 0** → 全部 NT$ 0，隱藏 🪙 和 💳

---

## 七、總結評分表

| 審查維度 | 評分 | 備註 |
|:---------|:----:|:-----|
| 完整性 | ⭐⭐⭐⭐⭐ | 26/26 條驗收條件完整，Codex 任務包對齊 |
| 一致性 | ⭐⭐⭐⭐ | 3 項 minor 不一致（mockup 遺漏零錢盒、無信用卡模糊表述、hover 展開範圍） |
| 安全性 | ⭐⭐⭐⭐⭐ | 零 backend 變更，純前端計算，極低風險 |
| 使用者情境 | ⭐⭐⭐⭐ | 行動優先設計良好，缺觸控目標最小尺寸規範 |
| 邊界案例 | ⭐⭐⭐⭐⭐ | 7 種邊界案例完整覆蓋，計算邏輯含 null 保護 |
| **綜合** | **PASS（MINOR_ISSUES）** | 4 項 minor issue，無 blocking |

### 實作前釐清事項（建議 Codex 開始前確認）

1. ❓ Design mockup 是否補上 🪙 零錢盒？→ 與 Spec 對齊
2. ❓ `.snapshot-row` 是否設 `min-height: 44px` 確保觸控友善？→ 主觀但建議
3. ❓ 若 creditLimit = 0（非 null），顯示 `NT$ X / 0` 還是 `NT$ X / —`？→ Spec 寫 `> 0` 才顯示額度，邏輯上 `0` 和 `—` 效果相同
4. ❓ 是否有負值手邊現金 / 零錢盒情境（資料異常）？→ 可視為事後 QA 檢查

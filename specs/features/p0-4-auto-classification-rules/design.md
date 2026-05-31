# P0-4: 自動分類規則引擎 — 架構設計

**日期**: 2026-05-31 | **狀態**: 設計審查中

---

## 0. 現狀調查（Knowledge Agent 階段）

### 0.1 已存在基礎設施

**Schema 與後端：**
- `finance_classification_rules` 表已存在（20260527081145_create_classification_rules.sql）
  - 欄位：id / user_id / keyword / category_id / account_id / movement_type / is_enabled
  - RLS 完整（select/insert/update/delete 皆以 user_id 隔離）
  - 索引：`finance_classification_rules_user_enabled_idx`（user_id, is_enabled WHERE is_enabled=true）
- Seed 資料（20260527081146_seed_classification_rules.sql）：40+ 筆預設關鍵字
- 關聯 migration（20260527083852_link_rules_to_categories.sql）：關鍵字與分類 display_name 自動匹配

**Edge Function：**
- `classify-transaction`（supabase/functions/classify-transaction/index.ts，308 行）
  - POST `{ description }` → 回傳 `{ match, possible }`
  - 匹配邏輯：取得使用者所有啟用規則 → 篩選 description 中包含 keyword 的規則 → 最長 keyword 為最佳匹配
  - 回傳 best match（category_id / account_id / movement_type）+ possible matches 陣列
  - 已部署於 staging（verify_jwt=true，前端呼叫）

**前端管理頁面：**
- `RulesTab.tsx`（416 行）— Settings 下的規則管理，完整 CRUD
  - 關鍵字增刪改、啟用/停用 toggle
  - 分類（dropdown）+ 帳戶（dropdown）+ 方向（expense/income/不限）選擇

**QuickCapture 整合（現有但無 UI）：**
- `useQuickCapture.ts` 第 93-126 行：在 description 變更後 600ms debounce 呼叫 classify-transaction
- 自動填入：categoryId / accountId / movementType（僅在使用者尚未選擇時）
- 錯誤時靜默忽略（best-effort）

### 0.2 缺口分析

| 項目 | 現狀 | 需要 |
|------|------|------|
| 分類建議的 UI 回饋 | ❌ 無。category/account 被靜默填入，使用者不知原因 | 顯示匹配的 keyword + 建議標示 |
| 接受/拒絕機制 | ❌ 無。自動填入後使用者可能沒注意到 | 低摩擦的一鍵接受 / 手動覆蓋 |
| 建議視覺提示 | ❌ 無。無法區分「使用者自選」vs「規則建議」 | 明確標示建議來源 |
| QuickCapture 內快速管理規則 | ❌ 無。修改規則需跳轉到 Settings | 可選：從建議直接跳轉 RulesTab |
| 規則建立入口 | ✅ RulesTab CRUD 完整 | 維持現狀 |

---

## 1. 規則來源策略

**方案：以手動規則為主，逐步擴展。**

| 來源 | 優先級 | 說明 |
|------|--------|------|
| 使用者手動建立規則 | **P0**（本輪實作） | 透過 RulesTab 新增/編輯關鍵字→分類/帳戶/方向映射 |
| 預設種子規則 | **P0**（已存在） | 40+ 筆常見關鍵字（加油/便當/全聯/7-11…），自動為新使用者建立 |
| 歷史交易學習 | **不在此輪** | 從既有 finance_activities 自動建議規則屬 P1+ |
| AI 分類建議 | **不在此輪** | AI 即時分類是獨立功能，非本引擎範圍 |

**決策理由：**
- 現有 schema 和 seed data 已是手動規則模式
- 小新的使用情境（特定商家、固定加油）非常適合 keyword 規則
- 規則引擎應先證明可靠，再加入自動化來源
- 歷史學習和 AI 需要額外的驗證機制防止錯誤建議

---

## 2. Rule Schema

**不需新表或 migration。** 現有 `finance_classification_rules` 表完全符合需求：

```
finance_classification_rules
├── id: uuid (PK, gen_random_uuid)
├── user_id: uuid (FK to auth.users)
├── keyword: text (1-100 chars)
├── category_id: uuid (FK to finance_categories, nullable → set null on delete)
├── account_id: uuid (FK to finance_accounts, nullable → set null on delete)
├── movement_type: text ('expense' | 'income' | null)
├── is_enabled: boolean (default true)
├── created_at: timestamptz
└── updated_at: timestamptz
```

**無需變更項目：**
- RLS policies ✅ 已完整（規則列隔離，select/insert/update/delete 皆以 `auth.uid() = user_id` 控制）
- Indexes ✅ 已完整
- Seed data ⚠️ 一次性 seed（只掃 migration 時的 auth.users），非新使用者自動建立
- FK constraints ⚠️ **已知限制** — FK 只參照 `finance_categories(id)` / `finance_accounts(id)`，未使用複合 `(user_id, id)`。RLS 能隔離規則列本身，但資料庫層無法保證規則目標屬於同一使用者。實務上正常 UI 操作（RulesTab 選單受 RLS 保護）不會觸發此問題，但 API 層插入外部 UUID 時 FK 不會拒絕。長期修正需 migration 加上 `(user_id, id)` 複合 FK。**本輪不新增 migration。**

---

## 3. 匹配邏輯（維持現有設計）

1. 擷取使用者所有 `is_enabled = true` 的規則
2. 對每條規則檢查：`description.toLowerCase().includes(keyword.toLowerCase())`
3. 收集所有匹配規則到 `possibleMatches[]`
4. 從中選出 `keyword.length` 最長者作為 `bestMatch`
5. 回傳 `{ match: bestMatch, possible: possibleMatches[] }`

**邊界案例：**
- 多關鍵字匹配同一描述 → 最長 keyword 優先（例：「costco加油」同時匹配「costco」和「加油」，選「costco加油」）
- 無匹配 → 不回傳建議，維持使用者現有選擇
- 匹配規則的被停用 → 不列入考慮（DB 層 WHERE is_enabled=true）
- keyword 同時匹配 expense 和 income 規則 → 依長度取勝
- 同一 keyword 有多條規則指向不同分類 → 回傳 possible 陣列，使用者可選

---

## 4. QuickCapture UI 建議顯示設計

### 4.1 核心原則

- **低干擾**：建議以 badge 或微標示呈現，不搶主操作流程
- **可覆蓋**：使用者隨時可以手動更換分類/帳戶/方向
- **透明**：使用者應該知道「為什麼選這個分類」
- **單手友好**：iPhone 單手操作，不需精準點擊小元件

### 4.2 建議顯示方式

**情境 1：描述輸入後有匹配規則 → 自動建議**

```
[描述欄] 輸入「全聯買飲料」後
→ 分類欄出現 badge: 📋 全聯 (建議)
→ 帳戶欄出現 badge: 依規則建議或保留使用者預設
→ 分類 dropdown 中建議項目顯示 ✦ 標記
```

**情境 2：多個可能匹配 → 使用者可切換**

```
[分類 dropdown]
├─ ✦ 食品/全聯 (建議，匹配: 全聯)    ← 最佳匹配
├─ 飲料/手搖 (匹配: 飲料)            ← 次佳匹配
├─ 餐飲/便當
└─ ...
```

**情境 3：使用者自選 ≠ 建議 → 尊重使用者**

```
使用者手動選了不同分類後：
→ 建議 badge 消失
→ 不再覆蓋使用者的選擇（直到下次描述變更）
```

### 4.3 一鍵接受 / 手動覆蓋

- **一鍵接受**：維持現有設計 — 分類/帳戶/方向被自動填入，使用者只需核對並按送出
- **手動覆蓋**：使用者直接點選其他分類/帳戶/方向，建議 badge 自動消失
- **沒有獨立的「接受建議」按鈕** — 避免增加操作步數

### 4.4 錯誤建議防止

- 使用者手動覆蓋後，同一 session 內不再覆蓋該欄位
- 規則是使用者自行建立的（或預設種子），非 AI 猜測，所以錯誤率低
- 關閉建議的方式：停用對應規則，或變更描述
- 建議僅輔助，最終寫入時仍以使用者選擇為準

---

## 5. QuickCapture 流程變更

```
使用者輸入描述
  ├─ 600ms debounce
  ├─ POST /classify-transaction { description }
  │    ├─ match found → 自動填入 category/account/type
  │    │                  + 顯示建議 badge
  │    └─ no match → 維持現有選擇
  │
  ├─ 使用者可接受（預設已填入，直接送出）
  ├─ 使用者可覆蓋（選其他分類/帳戶）
  └─ 使用者可修改描述（重新觸發分類）
```

**無變更的路徑：**
- 金額輸入（不影響分類）
- 日期選擇
- 批次模式（batch toggle）
- 送出邏輯
- 成功/失敗訊息

### 5.1 欄位級手動覆蓋保護

當使用者手動變更 category / account / movementType 任一欄位後，該欄位在本次 modal session 中不再被分類建議覆蓋：

- 使用 `touchedFields: { category: boolean, account: boolean, mode: boolean }` 追蹤
- `useQuickCapture.ts` 在 auto-fill 前檢查 touched flags
- **關鍵變更**：movementType 目前無此保護（會直接覆蓋），須加入與 category/account 相同的「僅未觸碰時填入」邏輯

---

## 6. Edge Function 變更分析

**`classify-transaction`：** 不需變更。現有實作已完整：
- 匹配邏輯正確
- 回傳格式 `{ match, possible }` 完整
- possible 陣列可供 UI 顯示次佳選擇

**是否需要新的 Edge Function：** 不需要。

**是否需要新的 migration：** 不需要。

---

## 7. 影響範圍

### 需要修改的檔案

| 檔案 | 變更類型 | 說明 |
|------|---------|------|
| `QuickCaptureModal.tsx` | UI 新增 | 建議 badge + 分類 dropdown 標記 |
| `useQuickCapture.ts` | 邏輯擴充 | 曝露 suggestion state 給 Modal |
| `globals.css` | CSS 新增 | 建議 badge / 標記樣式 |

### 不需要修改的檔案

| 檔案 | 理由 |
|------|------|
| `finance_classification_rules` schema | 已完整 |
| `classify-transaction` Edge Function | 已完整 |
| `RulesTab.tsx` | 管理頁面已完整 |
| `finance_activities` | 不改歷史交易 |
| 任何 migration | schema 已就位 |

---

## 8. RLS 與安全

- 建議引擎完全基於既有 RLS：使用者只能看到自己的規則
- classify-transaction Edge Function 使用 bearer token 驗證使用者身份
- 無法存取其他使用者的分類規則
- rule→category/account FK 確保只能指向使用者自己的資料

---

## 9. 非本輪範圍（明確排除）

- AI 分類建議（如 call LLM 判斷交易類別）
- 歷史交易自動學習規則（從既有交易資料歸納 keyword）
- 規則優先級排序（目前以最長 keyword 為自然排序）
- 規則測試頁面（在建立規則時預覽匹配結果）
- 規則匯入/匯出
- QuickCapture 內直接新增規則

---

## 10. 實作方案（A / B / C）

### 方案 A — Minimal Badge + Hook State（推薦 ✅）

**範圍：** QuickCaptureModal 顯示建議標示 + `useQuickCapture` 輸出 suggestion state。
- `useQuickCapture.ts` 新輸出：`suggestion.match.keyword`、建議值（category/account/mode）、`possible[]`、`touchedFields{}`
- 描述輸入後，分類/帳戶/方向欄位旁顯示 badge：`📋 加油 (規則)`
- 欄位級 touched flags：使用者手動變更該欄位後不再覆蓋（含 movementType）
- 使用者可接受（已自動填入）或覆蓋（選其他選項）
- 無新增按鈕、無 popup、無複雜互動
- Edge Function：沿用 `classify-transaction`，但前端或 function 忽略不可見/inactive 的 target IDs
- 變更檔案：`useQuickCapture.ts` + `QuickCaptureModal.tsx` + `globals.css`
- 風險：低（純 UI 回饋 + hook state 擴充）

### 方案 B — Badge + 多建議切換

**範圍：** 方案 A + 分類 dropdown 中顯示所有可能匹配項目。
- dropdown 選項旁標記 `✦` 表示有規則匹配
- 使用者可快速切換到次佳建議
- 變更檔案：QuickCaptureModal.tsx + globals.css + CategorySelect
- 風險：低（僅 dropdown 標記變更）

### 方案 C — 完整建議管理

**範圍：** 方案 B + QuickCapture 內建規則管理入口。
- 建議欄上方顯示「管理規則」連結直達 RulesTab
- 建議面板可快速停用誤觸的規則
- 變更檔案：方案 B + QuickCaptureModal 內新增入口按鈕
- 風險：中（增加 UI 複雜度，偏離「單手快速記帳」核心目標）

---

## 11. 建議方案

**推薦方案 A（Minimal Badge）。** 理由：
- 零流程變更 — 使用者現有習慣完全不受影響
- 分類建議引擎已完整運作，唯一缺口是 UI 回饋
- 方案 B 可作為後續 P1 追加（dropdown 標記不影響 Minimal Badge 實作）
- 方案 C 偏離 QuickCapture「快速」定位，規則管理應留在 Settings
- 符合小新的疲勞駕駛 / 單手操作場景：看一眼就知道「噢，它幫我選好了」

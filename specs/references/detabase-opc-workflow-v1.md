# detabase OPC — 三層作戰工作流 v1

**日期**: 2026-05-31 | **用途**: Codex OPC 架構設計輸入

---

## A. OPC 協作工作流規範

### 一、角色定義

#### 小新 — PO + 真實使用者

做：
- 決定「做什麼」和「為什麼」
- 在真實環境使用，回報感受
- 批准或否決提案
- 在小馬和 Codex 之間傳遞訊息

不做：
- 寫 code
- 設計資料庫
- 排版 CSS

#### 小馬 — 參謀部 + 情報官 + 營運官

做：
- 將小新的需求轉譯為可執行的 spec
- 判斷優先級與 scope
- 維護跨 session 的 context 連續性
- 營運監控、異常回報
- 給 Codex 清晰的任務描述
- 驗證 Codex 的產出是否符合小新的真實使用情境

不做：
- 大規模程式碼改動
- 架構設計與技術決策（留給 Codex）

#### Codex — 主工程師 + 架構師 + 技術審查

做：
- 技術架構設計
- 資料庫 schema 設計與 migration
- Edge Function 開發
- 前端元件實作
- Code review 與品質把關

不做：
- 決定「做什麼功能」
- 理解小新的個人使用習慣（無長期 context）
- 跨 session 記憶

---

### 二、工作流程

```
小新
  │ 說出需求或痛點
  ▼
小馬
  │ 1. 確認需求範圍
  │ 2. 查閱專案現狀與歷史 context
  │ 3. 撰寫 spec / task description
  │ 4. 判斷優先級
  ▼
小新 → 批准或修正
  │
  ▼
Codex
  │ 1. 收到 spec（含明確的審計任務或實作任務）
  │ 2. 審計階段：讀取相關檔案，評估現有架構
  │ 3. 輸出審計報告與 implementation plan
  │ 4. 經小馬確認後，進入實作階段
  │ 5. 產出 code + migration + 測試
  ▼
小馬
  │ 1. 驗證產出是否符合需求
  │ 2. 檢查是否偏離小新的使用情境
  │ 3. 回報小新結果
  ▼
小新 → 驗收或退回修正
```

**審計優先原則**：每個 P0 任務的第一輪，Codex 先審計現有架構，不准直接改 code。審計報告經小馬確認後，才進入實作。

---

### 三、產出規範

#### 小馬產出 spec 的格式

每個任務的 spec 包含：

```markdown
## 任務：{功能名稱}

### 使用者故事
一句話：{誰} 想要 {做什麼}，因為 {為什麼}

### 功能需求
- {具體行為 1}
- {具體行為 2}

### 技術約束
- 行動優先（iPhone Safari）
- staging only
- {其他約束}

### 參考
- {相關檔案路徑}
- {相關 schema 名稱}
```

#### Codex 產出的格式（審計階段）

審計任務完成後，Codex 應提供：
1. 審計的檔案列表與摘要
2. 現有 schema 是否支援需求的評估
3. 若不支援，提出 migration 方案
4. 關鍵程式碼路徑分析（如餘額計算邏輯）
5. 現有元件能否重用或需新增
6. Implementation plan（不含直接改碼）

#### Codex 產出的格式（實作階段）

每個任務完成後，Codex 應提供：
1. 修改的檔案列表
2. 關鍵程式碼片段（選擇性）
3. 如何測試 / 如何驗證
4. 若需要 migration，附 migration SQL

---

### 四、第一波功能優先順序（P0-P3）

#### P0 — 核心作戰功能（現在就做）

| # | 功能 | 說明 |
|:-:|:-----|:------|
| 1 | **設定頁**（零錢盒 + 初始金額） | 帳戶初始值設定，交易流程的前置條件 |
| 2 | **資產負債儀表板** | 手邊現金/可用現金/負債總額/信用卡的大數字快照 |
| 3 | **每日花費 vs 每日限額** | 行為控制工具 |

#### P1 — 近期實作

| # | 功能 | 說明 |
|:-:|:-----|:------|
| 4 | **債務管理模組** | 債務總覽 + 明細 + 還款操作 |
| 5 | **待確認佇列** | 交易匯入後的確認流程 |
| 6 | **決策面板** | 本月總判斷、支出診斷、月底預測、下月預算建議 |

#### P2 — 後續

月報/年報、預算 AI 建議、快速查詢強化、現金流預測

#### P3 — 長期

固定資產 + 折舊、決算表、歷史月份切換器

---

## B. P0 #1 Codex 任務包

### 任務：設定頁 — 帳戶初始金額 + 零錢盒邏輯

### ⚠️ 審計任務（此輪不實作，不改任何 code）

請 Codex **先審計**以下內容，輸出審計報告 + implementation plan，**不准直接修改任何程式碼**。

### 使用者故事
小新剛啟用 detabase，需要設定各帳戶的初始餘額，包含戶頭、現金、零錢盒（每天整理零錢丟入，年末提醒建議做 transfer transaction，不動用期間內部計算）。

### 核心概念釐清：零錢盒（coin_box）

- **零錢盒不是獨立帳戶類型**，而是 `finance_accounts` 中某個帳戶的**標記**或特殊 `account_type`
- 可選方案：
  - 既有 `account_type` 新增 `coin_box` 列舉值
  - 或在 `finance_accounts` 新增 `is_coin_box` 布林標記
- **年末不是自動轉帳**：detabase 在年底時提醒/建議建立一筆 transfer transaction，將零錢盒餘額轉入指定銀行帳戶
- **不得自動修改真實銀行帳戶餘額**：轉帳 transaction 由小新確認後才生效
- **初始金額只影響 detabase 內部餘額計算**，不作用於外部

### 功能需求
1. 設定頁有「帳戶初始值」區塊
2. 可設定每個帳戶的初始金額（`initial_balance`）
3. 零錢盒作為特殊標記/類型顯示
4. 年末提醒/建議建立 transfer transaction（非自動）
5. 初始值設定後，Dashboard 的餘額計算從「初始值 + 後續交易」開始

### 技術約束
- 行動優先，iPhone Safari
- staging only
- `finance_accounts` 表已有 `account_type` 列
- 零錢盒概念：每天整理零錢丟入，年末才去銀行存入戶頭，期間不動用
- 審計階段不准修改任何檔案

### Codex 審計要求

請按順序執行以下審計項目，輸出審計報告：

#### 第一步：讀取哪些檔案

1. **Schema migration 檔**
   - `supabase/migrations/20260518015307_create_finance_mvp_schema.sql` — 原始 `finance_accounts` 表定義
   - `supabase/migrations/20260529000001_add_digital_account_type.sql` — 最新 migration，看新增 account_type 的模式

2. **餘額計算路徑**
   - `apps/web/app/hooks/` — 找餘額相關 hook
   - `apps/web/app/page.tsx` — Dashboard 入口
   - 搜尋 `finance_accounts` 相關計算邏輯（grep `balance`、`initial`、`account`）

3. **Settings/Account 管理頁面**
   - `apps/web/app/` 下找 settings、accounts 相關頁面與元件

#### 第二步：回答的問題

1. **現有 `finance_accounts` schema 是否支援 `initial_balance`？**
   - 若不支援，提出 migration 方案（新增 `initial_balance NUMERIC DEFAULT 0` 欄位）
   - 需考慮現有資料的 migration 策略（現有資料預設 initial_balance = 0）

2. **Dashboard 餘額目前怎麼算？**
   - 找出目前的餘額計算邏輯（SQL query？前端計算？）
   - 審計完成後提出整合 `initial_balance` 的方案

3. **零錢盒支援方案**
   - 新增 `is_coin_box BOOLEAN DEFAULT FALSE` 還是用 `account_type = 'coin_box'`？
   - 分析 pros/cons

4. **Settings page 現有帳戶管理元件**
   - 找出目前是否有帳戶管理頁面或元件
   - 評估需要新增還是擴展現有元件

#### 第三步：產出

輸出一份 **implementation plan**，包含：
- Migration 方案（需要幾檔、各自做什麼）
- 前端元件架構（Component tree）
- Edge Function 是否需要新增（如 `set-account-initial-balance`）
- 推薦的零錢盒實作方式
- 各項的預估 scope（檔案數量、影響範圍）

**此輪不實作、不改 code。**

### 參考
- 現有 schema：`finance_accounts`（user_id, display_name, account_type, is_active）
- 零錢盒概念：每天整理零錢丟入，年末才去銀行存入戶頭，期間不動用
- 角色分工：小馬=參謀部，Codex=主工程師+架構師

---

## C. 小馬作戰系統 — OPC 團隊組成

### 角色一覽

| Profile | 角色 | 定位 |
|:--------|:-----|:-----|
| coordinator | **作戰管制官** | 任務管制，拆解→分配→追蹤→匯報 |
| architect | **戰術架構官** | 技術偵察、架構設計、任務規格 |
| builder | **工兵官** | 按 spec 實作、測試、建置 |
| reviewer | **稽核官** | 驗證、審查、安全與規格符合性 |
| knowledge-agent | **情報官** | 研究、查證、ADR、長期知識維護 |

### 指揮鏈

```
小新
  │ 最終需求、批准、驗收
  ▼
小馬作戰系統（小馬 = 參謀部 + 情報官 + 營運官）
  │
  ▼
作戰管制官
  │ 拆解任務、建立依賴、追蹤狀態
  ├── 戰術架構官（可請情報官查證技術/歷史決策）
  ├── 情報官（維護 specs/research、ADR、assumptions）
  ├── 工兵官（可請情報官查證 API/套件/專案慣例）
  └── 稽核官（查 specs/code/build；必要時請情報官補來源）
```

### 任務流程

```
需求/痛點 → 小新 → 小馬
  → 作戰管制官
    → 戰術架構官：審計/設計
      → 情報官：需要外部研究時（平行呼叫）
    → 工兵官：按 spec 實作
    → 稽核官：review-required handoff
    → 作戰管制官 → 小馬 → 小新：結果與驗收
```

### 核心原則

- 小新能否決任何輸出
- 小馬啟動 iteration 與把關
- 作戰管制官只派卡不做實質工作
- 戰術架構官只產 spec/ADR，不寫 code
- 工兵官只照 spec 實作，不改產品方向
- 稽核官不能改 code，只報告問題
- 情報官不能設計或實作，只查證與記錄
- **P0 任務遵守「先審計，不直接改 code」原則**

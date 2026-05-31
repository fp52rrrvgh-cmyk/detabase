# P0-4 自動分類規則引擎設計審計報告

日期：2026-05-31  
任務：P0-004-audit  
範圍：只審查 spec、現有 migration、Edge Function、QuickCapture 整合與 RulesTab；未修改產品程式碼、未執行 migration、未 commit/push。

## 審查摘要

整體方向可行，但 design.md 對「現有 schema 完全符合需求」與「rule -> category/account FK 確保只能指向使用者自己的資料」的判斷過度樂觀。`finance_classification_rules` 的 RLS 能隔離規則列本身，但現有 FK 只參照 `finance_categories(id)` / `finance_accounts(id)`，沒有像 `finance_activities` 一樣使用 `(user_id, id)` 複合 FK，因此資料完整性層無法保證規則目標屬於同一使用者。

QuickCapture 目前已會呼叫 `classify-transaction` 並自動填入欄位，但沒有 suggestion state、沒有 badge 資料流，也沒有「使用者手動覆蓋後不再覆蓋」的欄位級保護。尤其 `movementType` 會在匹配時直接覆蓋目前模式，這不符合疲勞、單手操作情境下「低干擾、可一眼確認、不可增加誤操作」的要求。

結論：不需要新增 Edge Function。若 P0-4 只做 Minimal Badge UI，可不新增 migration 先落地，但 spec 必須明確承認 FK owner-integrity 風險，不能聲稱 schema 已完整保證跨使用者隔離；長期修正仍應回到 schema 約束。

## 逐項發現

### 高：分類規則 FK 未綁定 `user_id`，schema 不能保證規則目標屬於同一使用者

證據：
- `finance_classification_rules.category_id` / `account_id` 只 FK 到 `finance_categories(id)`、`finance_accounts(id)`（`supabase/migrations/20260527081145_create_classification_rules.sql:20-26`）。
- 既有 `finance_activities` 使用 `(user_id, account_id)` 與 `(user_id, category_id)` 複合 FK，明確防止跨使用者引用（`supabase/migrations/20260518015307_create_finance_mvp_schema.sql:72-78`）。
- design.md 第 8 節宣稱 FK 確保只能指向使用者自己的資料，與現有 schema 不一致。

風險：
使用正常 UI 時，RulesTab 的選單資料會受 RLS 限制，實務上不容易選到別人的 category/account。但 API 層允許 authenticated 使用者插入自己的 rule row，若拿到其他使用者的 UUID，資料庫 FK 不會拒絕。之後 `classify-transaction` 會把這些外部 ID 回傳給前端，送出交易時可能在 `log-finance-activity` 或 `finance_activities` owner FK 被拒，造成靜默建議、提交失敗或難診斷錯誤。

建議：
本輪不要新增 migration 時，spec 至少改口為「RLS 隔離規則列；目標 owner integrity 目前依賴 UI/RLS 選單與交易寫入端 FK，非 classification_rules schema 自身保證」。驗收標準也應要求 Edge Function 或前端忽略不屬於使用者可見集合的 suggested IDs。

### 中：QuickCapture 沒有欄位級手動覆蓋保護，`movementType` 會被規則直接改掉

證據：
- `useQuickCapture` 對 category/account 只在空值時填入，但 `movementType` 只要不同就直接 `setQuickCaptureMode(match.movementType)`（`apps/web/app/hooks/useQuickCapture.ts:110-119`）。
- effect 依賴 `categoryId`、`accountId`、`quickCaptureMode`，欄位變更會重新排程分類請求（`apps/web/app/hooks/useQuickCapture.ts:126`）。
- spec 說「使用者手動覆蓋後，同一 session 內不再覆蓋該欄位」，但現有 hook 沒有 touched/overridden state。

風險：
使用者輸入描述後，如果規則把模式切成收入/支出，畫面和提交 payload 會跟著變（`apps/web/app/hooks/useQuickCapture.ts:306-313`）。對 iPhone 單手、疲勞狀態的使用者來說，這是高干擾錯誤來源，尤其分類卡片會因 mode filter 改變而重排。

建議：
方案 A 仍可維持「不用按接受」，但 hook 需要保存 suggestion state 與欄位級 touched flags。自動填入只應作用於未觸碰欄位；使用者手動切換 mode/category/account 後，該欄位在本次 modal session 不再被分類結果覆蓋。

### 中：Minimal Badge 方案目前範圍低估，`useQuickCapture` 必須輸出 suggestion state

證據：
- `UseQuickCaptureReturn` 沒有任何 suggestion/match/possible 欄位（`apps/web/app/hooks/useQuickCapture.ts:21-45`）。
- `QuickCaptureModalProps` 也沒有 suggestion props，Modal 目前只能渲染 category/account/mode 的既有狀態（`apps/web/app/dashboard/components/QuickCaptureModal.tsx:36-59`）。
- design.md 方案 A 寫「變更檔案：QuickCaptureModal.tsx + globals.css」，但第 7 節又列出 `useQuickCapture.ts` 需擴充，兩處不一致。

風險：
若只改 Modal/CSS，badge 無法知道匹配 keyword、是否仍是規則建議、possible matches 或使用者是否已覆蓋。最後很可能只能做靜態 UI，不能滿足「透明」與「可覆蓋」要求。

建議：
方案 A 的檔案範圍應明確包含 `useQuickCapture.ts`，輸出最小資料：`suggestion.match.keyword`、建議的 category/account/movement、`possible`、以及各欄位是否仍由 suggestion 控制。

### 中：Edge Function 不驗證 rule target 是否仍有效/可見

證據：
- `classify-transaction` 只查 `finance_classification_rules` 並直接回傳 `category_id`、`account_id`（`supabase/functions/classify-transaction/index.ts:179-184`, `229-235`）。
- 沒有 join 或二次查詢確認 category/account 仍 active、仍屬於 caller、或符合 movement type。

風險：
若規則目標已被停用、被 set null 前存在 race，或因上述 FK owner-integrity 缺口指到別人的資料，建議會污染 QuickCapture。前端 category cards 只顯示目前可見 categories，若 selected ID 不在清單，使用者看不到清楚理由。

建議：
不新增 Edge Function 的前提下，可在現有 function 或前端資料合併時只採用 caller 可見且 active 的 category/account。spec 應把這列為 P0-4 UI 整合的防呆條件，而不是宣稱 Edge Function 已完整。

### 低：Seed migration 不是「新使用者自動建立」，且有重複關鍵字

證據：
- seed migration 是一次性 `do $$` 迴圈掃當時已存在的 `auth.users`（`supabase/migrations/20260527081146_seed_classification_rules.sql:9-12`），不是 trigger，也不是新使用者註冊時自動建立。
- `停車費` 重複插入兩次（同檔 `:23` 與 `:53`），schema 又刻意允許同 keyword 多規則。

風險：
新註冊使用者可能沒有預設規則；重複關鍵字會讓 `possible` 出現重複候選，最佳匹配在同長度時取決於陣列順序，使用者看見的建議可能不穩定。

建議：
spec 應把 seed 說成「既有使用者一次性 seed」，不要承諾新使用者自動建立。重複 seed 不是本輪必修，但 UI 顯示 possible matches 時應去重或排序穩定。

### 低：匹配排序註解與實作容易誤導

證據：
- Edge Function query 使用 `order=keyword.desc` 並註解「longest keyword first via DB sort」（`supabase/functions/classify-transaction/index.ts:184`），但 lexicographic order 不等於長度排序。
- 實際正確排序發生在 JS：`rules.sort((a, b) => b.keyword.length - a.keyword.length)`（同檔 `:212-213`）。

風險：
目前結果仍會用 JS 長度排序與 reduce 選出 best，不是功能性阻斷。但後續維護者可能移除 JS sort 或誤以為 DB 已處理長度排序。

建議：
spec 可保留「最長 keyword 優先」，但不要把 DB order 當作依據；若未來要 DB 排序，需要 computed length/order RPC 或保留 JS sort。

## Acceptance Criteria 對照

- Schema 完整性：部分不足。表欄位足以支援 keyword -> category/account/movement，但 owner-integrity 約束不足，不能說完全符合 P0-4。
- RLS 安全：規則列隔離完整，select/insert/update/delete 皆以 `auth.uid() = user_id` 控制；但 RLS 不等於 FK target owner guarantee。
- Edge Function：身份解析與 RLS 查詢方向正確；錯誤處理安全，但未驗證 target active/owner，有維護性與資料完整性風險。
- QuickCapture 整合：現有自動填入已存在，但 UI badge 與覆蓋語義尚未具備；Minimal Badge 必須包含 hook state。
- Scope 邊界：AI/歷史學習/QuickCapture 內建管理排除合理；但「新使用者 seed」、「同 keyword 衝突」、「停用 target」、「手動覆蓋後不覆蓋」需補入邊界案例。
- 新 migration / Edge Function：不需要新增 Edge Function。若嚴格要求 DB 層 owner-integrity，長期需要 migration；若本輪禁止新 migration，spec 必須把該風險列為已知限制與前端/function 防呆。

## 方案 A/B/C 評價

### 方案 A — Minimal Badge

評價：推薦，但需修正範圍。  
優點是最符合小新單手快速記帳：不新增接受按鈕、不增加步驟，只讓使用者一眼知道「這是規則建議」。但它不能只是 Modal + CSS；必須擴充 `useQuickCapture` suggestion state 與 touched flags，否則無法透明顯示 keyword，也無法保證手動覆蓋後不再被改。

### 方案 B — Badge + 多建議切換

評價：可作 P1，不建議放 P0。  
它能處理同描述多匹配，但會增加 dropdown/candidate UI 複雜度。對疲勞駕駛的 iPhone 單手情境，除非多匹配是高頻痛點，否則不值得讓 QuickCapture 承擔更多認知負荷。

### 方案 C — 完整建議管理

評價：不建議本輪。  
QuickCapture 內停用規則或管理規則會偏離「快速記帳」核心，增加小目標點擊與決策。規則管理留在 Settings 的方向正確；本輪最多提供非阻塞的來源提示，不應加入管理入口。

## 建議結論

採用方案 A，但更新 spec：

1. 承認 classification_rules 的 RLS 與 target owner-integrity 是兩件事；現有 schema 不能完整保證 rule target 屬於同使用者。
2. 明確把 `useQuickCapture.ts` 納入方案 A，輸出 suggestion state、possible matches、欄位 touched flags。
3. 保留「沒有接受按鈕」的預設接受模式，但任何手動改 category/account/mode 都必須停止覆蓋該欄位。
4. 不新增 Edge Function；沿用 `classify-transaction`。本輪若不做 migration，至少在 function/front-end 忽略不可見或 inactive 的 target IDs。
5. 補充 seed 限制：現有 migration 只處理當時已有使用者，不是新使用者自動 seed。

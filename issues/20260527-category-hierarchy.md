# Issue: 分類層級化（母/子分類架構）

## 目標
將現有單層分類改為母/子 2 層結構，支援階層選單顯示、預算 Rollup、Dashboard 分類匯總。

## Schema 變更

### finance_categories 加 parent_id

```sql
alter table public.finance_categories
  add column parent_id uuid
    references public.finance_categories(id)
    on delete set null;

create index finance_categories_parent_id_idx
  on public.finance_categories (parent_id);
```

- `parent_id = null` → 母分類（頂層）
- `parent_id = <某分類 id>` → 子分類

### 不新增 group 表（階段性簡化）

先 2 層，夠用了。群組功能（營運/個人/固定）可晚點再加。

## 分類結構規劃

```
母分類              子分類
─────────────────────────────
🍽️ 餐飲              早餐
                     午餐
                     晚餐
                     消夜
                     飲料

⛽ 燃料              柴油
                     尿素
                     添加劑

🚗 交通              過路費
                     停車費
                     大眾運輸

🔧 車輛保養           定期保養
                     輪胎
                     維修
                     洗車

🏪 生活購物           日常用品
                     服飾
                     3C/電子
                     家居

🚬 個人消費           香菸
                     娛樂
                     運動
                     醫療

🏠 居住              房租
                     水電瓦斯
                     網路
                     管理費

📱 通訊              手機費
                     儲值

💰 收入              薪資
                     獎金
                     投資收益
                     其他收入
```

## UI 變更

### QuickCaptureModal 選單
- 母分類顯示為群組標題（不可選）
- 子分類為可選項，縮排顯示

### Dashboard 分類分析
- 子分類支出自動 Rollup 到母分類
- 母分類層級顯示「餐飲 500（早餐200+午餐200+晚餐100）」

### 分類管理頁面
- 可設定父分類
- 可新增子分類
- 刪除母分類時子分類自動清空（on delete set null）

## 影響範圍
- [ ] migration（加 parent_id）
- [ ] Edge Function（log-finance-activity、set-budget 不需改，它們吃 category_id）
- [ ] 前端 QuickCaptureModal（選單改階層）
- [ ] 前端 Dashboard（分類匯總與顯示）
- [ ] 前端分類管理頁面（設定父子關係）
- [ ] 前端設定頁預算 tab（顯示階層選單）

## 優先順序
1. migration（先跑）
2. QuickCaptureModal 選單改階層顯示（高優先，每天用）
3. Dashboard 分類匯總（高優先，看報表）
4. 分類管理頁面（中優先）

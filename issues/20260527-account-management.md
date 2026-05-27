# 帳戶管理 + 記帳入口優化

## 範圍
1. **Migration**：`finance_accounts` 加 `initial_balance`、`credit_limit`、`billing_day`、`total_loan`、`loan_term_months`、`interest_rate`、`description`
2. **設定頁面帳戶 tab**：CRUD 帳戶、設定初始餘額/信用卡額度/貸款參數
3. **QuickCaptureModal 加帳戶選擇**：樹狀選單樣式、預設上次帳戶
4. **Dashboard 帳戶卡片改版**：卡片式顯示各帳戶餘額、總可用資金、淨值
5. **記帳入口優化 v1**：
   - 分類卡片化（Top 6 常用分類大圖示）
   - 「上次記錄」一鍵複製
   - 批量記帳模式（記完不關閉）

## 不做
- 轉帳功能（以後再做）
- 多幣別
- 共同管理
- Widget / Siri Shortcuts（P2）
- AI 預測分類（自有模型辦得到，以後再做）

## Migration 設計
```sql
alter table public.finance_accounts
  add column initial_balance bigint not null default 0,
  add column credit_limit bigint,          -- 信用卡額度
  add column billing_day smallint,         -- 信用卡帳單日 (1-31)
  add column total_loan bigint,            -- 貸款總額
  add column loan_term_months smallint,    -- 貸款期數
  add column interest_rate numeric(5,2),   -- 利率(%)
  add column description text;             -- 備註
```

## 帳戶 p 計算公式
```
餘額 = initial_balance + 該帳戶所有收入 - 該帳戶所有支出
（不含轉帳）
```

Dashboard：
```
總可用資金 = Σ(現金+銀行帳戶餘額) - Σ(信用卡未繳款)
淨資產 = 總可用資金 - Σ(貸款剩餘本金)
```

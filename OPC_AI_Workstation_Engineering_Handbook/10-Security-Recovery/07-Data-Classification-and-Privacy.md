# 10-Security-Recovery / 07 Data Classification 與 Privacy

## 目標

讓 OPC 知道哪些資料可以公開、哪些只能內部使用、哪些需要限制存取與加密，避免 Agent 將敏感資料傳給不必要的模型、工具或外部服務。

## 分級

### Public

可公開內容，例如公開 README、開源程式碼與公開文件。

### Internal

公司內部文件、一般執行紀錄、非敏感設定。

### Confidential

客戶資料、未公開專案、財務資料、完整營運報表、內部知識庫。

### Restricted

Secrets、身分證明、醫療資料、Recovery Key、Production credentials、權限設定。

## 處理規則

| 分級 | 外部模型 | Log | Artifact | 備份加密 | 人工批准 |
|---|---|---|---|---|---|
| Public | 可 | 可 | 可 | 選擇 | 否 |
| Internal | 依政策 | 脫敏 | 受控 | 建議 | 視情況 |
| Confidential | 最小化 | 嚴格脫敏 | 權限限制 | 必須 | 常需要 |
| Restricted | 原則禁止 | 不保存真值 | 不直接輸出 | 必須 | 必須 |

## Data Minimization

任務只提供必要資料：

- 摘要取代完整文件
- 欄位白名單取代整張資料表
- 參考 ID 取代真實 secret
- 測試資料取代 production data

## Retention

- Debug log：短期保存。
- Audit 與 Evidence：依專案需求長期保存。
- Session workspace：任務完成後清理。
- 個資與機密資料：達成目的後依政策刪除。

## 外部模型與服務

送出資料前必須確認：

- 資料分級
- 服務是否被核准
- 是否需要去識別化
- 是否可使用本機模型或摘要替代
- 是否會被第三方保留

## 驗收

- 每個主要資料來源有分級。
- Restricted data 不進一般 log 或 artifact。
- Agent 無法自行降低資料分級。
- 備份與匯出遵守相同分級。
- 刪除與保留政策有執行證據。
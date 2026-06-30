# RUNBOOK-002：備份與還原

## 備份前

1. 確認目標位置有足夠空間。
2. 暫停高寫入任務。
3. 記錄 database schema version。
4. 確認上一份成功備份仍存在。

## PostgreSQL 備份

```powershell
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Output = "D:\OPC\backups\database\opc-$Timestamp.sql"
docker exec opc-postgres pg_dump -U opc -d opc | Out-File -FilePath $Output -Encoding utf8
Get-FileHash $Output -Algorithm SHA256
```

實際 container、database 與 user 名稱依 Compose 設定調整。

## 設定與文件

備份：

- `D:\OPC\runtime`
- `D:\OPC\config`
- Handbook 與 scripts
- 未 push 的重要 repository
- Evidence metadata export

不得直接備份 plaintext secrets 到未加密位置。

## 還原

1. 建立隔離測試 database。
2. 驗證備份 checksum。
3. 匯入 dump。
4. 驗證 schema、row count 與關鍵查詢。
5. 只有測試還原通過，才進行正式還原。

## 還原後

- 執行 Doctor。
- 執行 smoke test。
- 驗證 queue 與 durable state 一致。
- 建立 restore evidence。

## 成功條件

- Backup manifest 完整。
- Checksum 相符。
- 測試還原成功。
- 備份至少有一份不在同一顆 SSD。
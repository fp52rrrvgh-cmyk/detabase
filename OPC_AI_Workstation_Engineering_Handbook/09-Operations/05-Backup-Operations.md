# 09-Operations / 05 備份營運

## 目標

把備份從偶發手動行為變成有排程、有驗證、有保留政策的營運流程。

## 備份頻率

### 每日

- PostgreSQL logical dump
- 關鍵設定
- 未 push 的重要 repository 狀態檢查
- Objective、Decision、Evidence metadata

### 每週

- 完整 runtime 設定快照
- Docker volume 測試備份
- OPC Handbook 與 scripts clone 驗證

### 每月

- 離線或異地副本
- 測試還原演練
- Recovery key 與 vault recovery inventory 檢查

## 標準流程

```text
Pause writes when required
→ Create database dump
→ Export configuration
→ Generate checksums
→ Copy to external destination
→ Verify readability
→ Record backup manifest
→ Resume services
```

## Backup Manifest

至少包含：

```text
backup_id
created_at
source
files
checksums
database_schema_version
encryption_status
destination
retention_until
verification_status
```

## 保留政策

建議起始值：

- 每日備份：保留 14 份
- 每週備份：保留 8 份
- 每月備份：保留 12 份

實際值依資料量與風險調整。

## 失敗處理

備份失敗時：

- 不刪除上一份成功備份
- 建立 incident 或 operational warning
- Morning Report 顯示失敗原因
- 若 production data 沒有可用備份，阻擋高風險 migration

## 驗收

- 備份有 checksum 與 manifest。
- 至少一份副本不在同一顆 SSD。
- 每月成功還原到測試環境。
- 備份失敗會告警。
- Retention 清理不會刪除最後一份有效備份。
# 08-Bootstrap / 09 Rollback 與 Failure Report

## 目標

讓 Bootstrap 失敗時能停止、保存現場、回復低風險變更，並清楚告訴人工下一步。

## 回復邊界

可自動回復：

- 尚未使用的新建暫存目錄
- 尚未啟動的測試 container
- 本次建立且未承載資料的設定檔
- 本次建立的短期 session credential

不可自動回復：

- 磁碟格式化
- Windows 重灌
- Driver 變更
- Database migration
- 已寫入資料的 named volume
- BitLocker 與 recovery key
- Production side effect

這些項目只能依獨立 Runbook 與備份處理。

## 失敗時流程

```text
停止目前 step
→ 不執行後續 phase
→ 保存 stdout / stderr
→ 保存 bootstrap state
→ 執行安全清理
→ 產生 failure report
→ 提供人工 remediation
```

## Failure Report 欄位

```text
run_id
manifest_version
machine
phase
step
command
exit_code
error_class
error_message
log_path
state_path
changes_applied
rollback_actions
manual_actions
created_at
```

## 錯誤分類

- `transient`：網路、rate limit、暫時服務失敗。
- `configuration`：Manifest、路徑、版本或環境變數錯誤。
- `permission`：權限不足或 policy 拒絕。
- `dependency`：前置功能、套件或服務不存在。
- `destructive-risk`：需要人工確認的高風險變更。
- `unknown`：無法安全判定，預設停止。

## Resume 規則

只有當：

- 失敗原因已排除
- 前一個 step 的 Verify 通過
- Bootstrap state 與 Manifest 版本一致
- 沒有未處理的 destructive partial state

才允許 `-Resume`。

## 驗收

- 任一失敗都會停止後續施工。
- Failure report 可定位到明確 step。
- 不會因 rollback 刪除既有專案或資料。
- 未知錯誤採安全停止，不自動猜測修復。
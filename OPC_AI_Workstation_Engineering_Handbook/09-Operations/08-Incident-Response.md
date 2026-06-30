# 09-Operations / 08 Incident Response

## 目標

在服務中斷、資料異常、權限濫用、Agent 失控或安全事件發生時，依固定流程止血、保存證據、恢復服務並避免重犯。

## 事件等級

### SEV-1

- Production data 可能遺失或外洩
- 未授權 destructive action
- Secrets 洩漏
- 整個 runtime 不可用且無替代方案

### SEV-2

- 重要服務中斷
- 多個 Objective 失敗
- Queue 或 database 異常
- 備份失敗且風險升高

### SEV-3

- 單一 worker、工具或非關鍵服務異常
- 可繞過但需要後續修復

## 第一階段：止血

```text
Pause dispatch
→ 撤銷可疑 credential
→ 隔離受影響 session
→ 停止 destructive worker
→ 保留 log、state、artifact 與 timestamp
```

不要先刪除 log、重建主機或清空 queue。

## 第二階段：判定範圍

確認：

- 哪些 Objective / Task 受影響
- 是否有資料寫入或外部 side effect
- 哪些 credential 被使用
- 是否需要通知外部服務或使用者
- 最近成功備份位置

## 第三階段：恢復

- 從已驗證備份還原
- 重新建立受污染 session
- 輪替 credential
- 修復 policy 或 capability
- 執行 Doctor 與 smoke test
- 經人工核准後 Resume

## Incident Record

```text
incident_id
severity
detected_at
contained_at
resolved_at
affected_components
objectives_impacted
data_impact
credential_impact
evidence_refs
root_cause
recovery_actions
preventive_actions
```

## Postmortem

每個 SEV-1、SEV-2 必須產生 postmortem：

- 發生了什麼
- 為何未提前阻止
- 哪些偵測有效或失效
- 修復與預防措施
- Owner 與截止時間

## 驗收

- Incident 可在不破壞證據的情況下被隔離。
- Credential 可快速撤銷。
- 恢復後 Doctor 與 smoke test 通過。
- 改善措施會進入 backlog、Runbook 或 ADR。
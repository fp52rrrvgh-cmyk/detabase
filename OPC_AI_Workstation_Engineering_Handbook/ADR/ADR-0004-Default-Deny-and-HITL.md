# ADR-0004：Default-Deny 與 Human-in-the-Loop

## 狀態

Accepted

## 背景

OPC 會讓 Agent 在無人監看的夜間執行。若權限預設開放，任何 prompt injection、需求誤解、工具錯誤或 compromised dependency 都可能造成不可逆副作用。

## 決策

- 未註冊 Capability 一律拒絕。
- 未授權路徑、工具、網路與 secret 一律拒絕。
- 刪除、merge、deploy、production write、外部通訊、權限與 secrets 變更預設需要人工批准。
- Approval timeout 採 default-deny。
- Agent 不得自行提高預算、權限或資料分級。

## 理由

- 使錯誤停在可恢復邊界。
- 將 CEO 注意力集中在真正高風險決策。
- 讓每次 side effect 都能追溯到 policy 與 approver。

## 代價

- 部分任務會在夜間 blocked。
- 需要 Approval Service 與 Morning Report。
- Capability 與 Policy 需要持續維護。

## 驗證

- 未批准的 protected branch merge 不會執行。
- Approval 逾時後狀態為 blocked 或 rejected。
- Audit log 保存 approver、時間、scope 與結果。
- Worker 無法繞過 Tool Gateway 直接取得高權限工具。
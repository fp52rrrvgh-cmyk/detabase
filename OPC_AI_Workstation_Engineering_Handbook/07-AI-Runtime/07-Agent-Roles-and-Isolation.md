# 07-AI-Runtime / 07 Agent 角色與 Session Isolation

## 目標

讓每個 Agent 只取得完成任務所需的模型、工具、資料、預算與工作目錄，避免多 Agent 共用同一個高權限環境。

## 建議角色

### Planner

- 將 Objective 拆解為 task graph。
- 不直接執行 destructive tool。
- 輸出 task schema、依賴與驗收標準。

### Researcher

- 搜尋、閱讀、比較與整理來源。
- 預設唯讀。
- 必須保存來源與研究日期。

### Engineer

- 在隔離 branch 或 workspace 修改程式碼。
- 執行測試並產生 patch、commit 與 evidence。
- 不直接 merge protected branch。

### Operator

- 啟動、停止、備份與檢查本機服務。
- 權限限制在指定 Compose stack。
- Production 操作需要 approval。

### Reviewer

- 依驗收條件檢查 evidence。
- 不應與原執行者使用完全相同的判斷上下文。
- 可退回、阻擋或升級人工決策。

## 現有工具定位

- Hermes：可作為互動入口或特定 Agent runtime，但必須接入 OPC policy、queue 與 evidence。
- Codex：可作為 coding worker，不是整個公司控制平面。
- OpenHands：可作為隔離式軟體工程 worker 候選。
- OpenClaw：若採用，需先驗證執行隔離、工具權限與狀態持久化。

工具名稱不是角色契約。真正的權限由 Capability Registry 決定。

## Session 目錄

```text
D:\OPC\sandbox\sessions\<session-id>
├─ input\
├─ workspace\
├─ output\
├─ logs\
└─ manifest.json
```

## Session Manifest

至少記錄：

- objective_id
- task_id
- agent_role
- capability_version
- model
- allowed_tools
- allowed_paths
- secret references
- budget
- created_at
- expires_at

## 隔離規則

- 不共用可寫 workspace。
- 不共用完整 secrets。
- Session 結束後撤銷短期 credential。
- Artifact 搬出前執行掃描與 checksum。
- 超時、取消或 crash 都必須清理 lease。

## 驗收

- 一個 Agent 無法讀取另一個 Session 的 secrets。
- coding worker 只能修改指定 repository/branch。
- Reviewer 可獨立重跑測試。
- Session 到期後工具與 credential 失效。
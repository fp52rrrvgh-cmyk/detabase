# 07-AI-Runtime / 06 MCP 與 Tool Gateway

## 目標

用統一工具閘道管理 Agent 對 GitHub、檔案、資料庫、瀏覽器、郵件與其他外部系統的存取。

## MCP 的位置

MCP 可作為工具描述與呼叫介面，但不等於完整的安全邊界。OPC 必須在 MCP server 外層增加：

- 身分驗證
- Capability 驗證
- 參數 schema 驗證
- 路徑與資源限制
- Audit log
- Approval gate
- Rate limit
- Timeout

## Tool Gateway 流程

```text
Agent request
→ Capability check
→ Session policy
→ Parameter validation
→ Approval check
→ Tool execution
→ Output sanitization
→ Evidence record
```

## 工具分級

### Read-only

- 查詢 repository
- 查詢資料庫 view
- 讀取文件
- 搜尋公開資料

### Workspace write

- 修改隔離 workspace
- 建立 patch
- 執行測試
- 建立 artifact

### External side effect

- Push branch
- 建立 PR
- 寄送郵件
- 更新日曆
- 部署服務

### Destructive / privileged

- 刪除 repository 或資料
- 修改 production database
- 變更權限
- 讀取或輪替 secrets

後兩類預設要求明確 policy；destructive 類預設人工批准。

## 路徑限制

File tool 預設只能存取 task session 目錄，例如：

```text
D:\OPC\sandbox\sessions\<session-id>
```

只有 Capability 明確授權時，才能讀寫正式 repository 或 artifact 目錄。

## 輸出處理

Tool 回傳可能包含 secret、個資或大量資料。寫入 log 前必須：

- 移除 credential
- 截斷超長內容
- 保存 hash 與 artifact reference
- 標記資料敏感等級

## 驗收

- Agent 無法繞過 Capability Registry 直接呼叫工具。
- 未授權路徑會被拒絕。
- 所有 side effect 有 audit record。
- Tool timeout 不會讓 workflow 永久卡住。
- MCP server 失效時任務可安全失敗或重試。
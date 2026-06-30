# 10-Security-Recovery / 02 Identity 與最小權限

## 目標

讓人類、Agent、Worker、Service 與 Tool 都使用可識別、可撤銷、最小範圍的身分與權限。

## 身分類型

- Human administrator
- Human daily account
- Runtime service identity
- Agent session identity
- Tool credential
- Database role
- GitHub app、token 或 CLI session

## 核心原則

- 日常帳號不長期以系統管理員執行。
- Agent 不直接繼承完整人類帳號權限。
- 每個 session 使用獨立、短期 credential。
- Read、Write、Deploy、Delete 分離。
- Production 與 Development 權限分離。
- 權限到期後自動失效。

## 權限矩陣範例

| 角色 | Repository Read | Workspace Write | Merge | Secrets Read | Production |
|---|---:|---:|---:|---:|---:|
| Researcher | 是 | 限定 | 否 | 否 | 否 |
| Engineer | 是 | 是 | 否 | 限定 | 否 |
| Reviewer | 是 | 測試輸出 | 否 | 否 | 否 |
| Operator | 限定 | Runtime | 否 | 限定 | 需批准 |
| Human Admin | 是 | 是 | 是 | 是 | 是 |

## 權限授予流程

```text
Task requires capability
→ Policy checks role
→ Verify scope
→ Issue short-lived credential
→ Record session binding
→ Execute
→ Revoke or expire
```

## Windows 與檔案系統

- `D:\OPC\sandbox\sessions`：每個 session 獨立 ACL。
- `D:\OPC\secrets`：僅受控程序與人工管理者可讀。
- `D:\OPC\projects`：依 repository 與 task 授權。
- Windows 系統目錄：Agent 預設禁止寫入。

## GitHub

- 優先使用細粒度、短期或 App-based credential。
- 不給 coding worker repository administration。
- Merge protected branch 需要人工批准。
- Token 不寫入 repository、shell history 或 log。

## 驗收

- Agent 不能讀取未授權 repository。
- Read-only 角色無法修改檔案。
- Session credential 到期後失效。
- 權限變更有 audit record。
- 不存在所有 worker 共用的永久高權限 token。
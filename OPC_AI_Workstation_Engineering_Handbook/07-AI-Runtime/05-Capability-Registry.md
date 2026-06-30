# 07-AI-Runtime / 05 Capability Registry

## 目標

以可機器判讀的方式定義每個 Agent 可以做什麼、需要哪些工具、權限、輸入與驗收條件。

## Registry 欄位

```yaml
id: repository.patch
version: 1
owner: engineering
risk: medium
inputs:
  repository: string
  issue: string
tools:
  - github.read
  - github.write
permissions:
  - repo:contents:write
limits:
  timeout_seconds: 1800
  max_cost_usd: 5
approval:
  required_for:
    - protected_branch_merge
evidence:
  required:
    - commit_sha
    - test_result
```

## 規則

- Agent 只能執行已註冊 capability。
- Capability 採版本控制，變更需審查。
- Tool 權限不得從角色名稱推測。
- 任務 dispatch 前必須驗證 capability、權限與資源。
- 高風險能力預設需要人工批准。

## Capability 與 Agent 分離

Agent 是執行者；Capability 是受控工作契約。不同 Agent 可以共享同一 Capability，但必須使用相同 schema、限制與 evidence 規則。

## 風險分級

- Low：唯讀、摘要、格式化、測試查詢。
- Medium：修改工作區檔案、建立 commit、啟動本機服務。
- High：merge、deploy、刪除、外部通訊、金流、權限與 secrets。

## 驗收

- 未註冊能力會被拒絕。
- Capability schema 錯誤不會進入 queue。
- 每次執行記錄 capability id 與 version。
- 權限與 evidence 要求可由 policy engine 驗證。
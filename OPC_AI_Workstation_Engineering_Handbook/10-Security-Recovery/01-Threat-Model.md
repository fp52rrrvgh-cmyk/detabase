# 10-Security-Recovery / 01 Threat Model

## 目標

明確定義 OPC AI Workstation 需要防範的風險，避免只靠防毒軟體或單一密碼。

## 主要資產

- Windows 與 WSL2 主機
- Git repositories
- API keys、tokens、database credentials
- PostgreSQL durable state
- Redis queue 與 runtime metadata
- Evidence、artifact、decision log
- 個人資料與公司知識
- BitLocker recovery key

## 主要威脅來源

### 外部攻擊者

- 惡意程式
- 網路掃描與未授權存取
- Credential theft
- Supply-chain compromise

### 不可信輸入

- 網頁內容
- Repository issue / README
- Email、文件、附件
- Prompt injection
- 第三方 MCP server 或 tool output

### Agent 自身

- 權限過大
- 誤解需求
- 執行 destructive command
- 無限制重試或成本失控
- 將 secrets 寫入 log、Git 或 artifact

### 操作失誤

- 誤刪資料
- 錯誤 migration
- 未備份重灌
- Recovery key 遺失
- 在錯誤磁碟執行腳本

## 信任邊界

```text
Internet
→ Tool Gateway
→ Agent Session
→ Workspace
→ Runtime Services
→ Durable Data
```

每跨越一層都必須重新驗證身分、權限、schema 與資料敏感度。

## 高風險事件

- Production data modification
- Secrets 讀取或輪替
- Protected branch merge
- 外部郵件與訊息發送
- 對外部署
- 刪除 repository、volume、backup
- 修改安全政策或權限

## 安全原則

- Default-deny
- Least privilege
- Short-lived credentials
- Evidence and audit
- Isolation by session
- Human approval for destructive actions
- Backup before irreversible change

## 驗收

- 每項高風險能力都有明確控制。
- 不可信輸入不能直接驅動高權限工具。
- Agent 無法自行提升權限。
- 發生事件時可追蹤到 session、task 與 tool call。
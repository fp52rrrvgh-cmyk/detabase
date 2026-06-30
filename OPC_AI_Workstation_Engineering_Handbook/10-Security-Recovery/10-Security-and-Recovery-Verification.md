# 10-Security-Recovery / 10 Security 與 Recovery 驗收

## 目標

驗證安全控制與災難復原不是文件宣告，而是實際可阻擋、可撤銷、可還原與可重建。

## 測試一：未授權存取

讓 Researcher 嘗試：

- 修改未授權 repository
- 讀取 `D:\OPC\secrets`
- 使用高風險工具

預期：

- 全部被拒絕。
- Audit log 記錄 session、task、capability 與原因。
- 不自動提升權限。

## 測試二：Secret 洩漏模擬

建立測試 token 並故意放入測試 repository。

預期：

- 掃描能偵測。
- Token 立即撤銷。
- Worker 暫停。
- Incident record 與 evidence 建立。
- 清理 Git 歷史不取代 credential rotation。

## 測試三：Sandbox Escape

讓 Agent 嘗試存取其他 Session 或 Windows 系統目錄。

預期：

- 路徑政策阻擋。
- Session 保持隔離。
- 事件被記錄並可追蹤。

## 測試四：網路暴露

從同一區域網路的另一台裝置掃描工作站。

預期：

- 只有明確核准的服務可見。
- PostgreSQL、Redis、MCP server 與本機 Dashboard 不直接暴露。
- Windows Firewall 保持啟用。

## 測試五：Supply-chain

嘗試引入：

- 未固定版本的 Docker image
- 沒有 lock file 的依賴
- 未審查的第三方 PowerShell

預期：

- Policy 或 Reviewer 阻擋。
- 需要版本、來源、checksum 或人工審查。

## 測試六：資料分級

使用 Confidential 或 Restricted 測試資料執行任務。

預期：

- 外部模型存取依政策限制。
- Log 與 artifact 完成脫敏。
- Agent 無法自行降低分級。

## 測試七：Tier 2 Recovery

停止 Runtime Stack，重建 container 並保留 named volume。

預期：

- Durable state 保留。
- Queue 與 database 恢復一致。
- Doctor 與 smoke test 通過。

## 測試八：Bare-metal Rebuild 演練

在測試機或乾淨環境依 Recovery Package 重建：

- Windows / Storage
- Bootstrap
- WSL2 / Docker
- Runtime
- Database restore
- Secrets handoff
- Test Objective

## 最終通過條件

- 未授權能力、路徑與網路存取會被阻擋。
- Secrets 可偵測、撤銷與輪替。
- Sandbox、供應鏈與資料分級政策實際生效。
- 至少完成一次 database restore。
- 至少完成一次替代環境重建演練。
- Recovery Package 不依賴原主機。
- Security Incident 能完成偵測、止血、恢復與 postmortem。
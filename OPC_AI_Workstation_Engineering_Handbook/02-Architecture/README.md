# 02 Architecture：整體架構

## 1. OPC AI Workstation 分層

```text
Human / CEO
  ↓
Windows 11 Host
  - 遊戲
  - 瀏覽器
  - 驅動
  - VS Code
  - GitHub Desktop / CLI
  ↓
WSL2 Ubuntu
  - Linux CLI
  - Python
  - Node
  - Git
  ↓
Docker Layer
  - Redis
  - Postgres / Supabase local
  - Agent sandbox
  ↓
AI Runtime
  - LangGraph
  - Hermes
  - OpenHands
  - MCP Gateway
  ↓
Workspace
  - D:\OPC
```

## 2. Windows 的角色

Windows 不負責承載複雜 AI runtime。Windows 的責任是：

- GPU driver
- 遊戲相容
- 桌面應用
- VS Code 入口
- 檔案總管管理
- WSL2 / Docker host

## 3. WSL2 的角色

WSL2 提供 Linux 環境，讓 Python、Node、Docker、CLI 工具接近 Linux 開發體驗。

使用者不需要每天操作 Linux Desktop，只需要知道：AI 工程多數在 WSL2 裡跑。

## 4. Docker 的角色

Docker 是隔離層。Redis、Postgres、測試環境、Agent sandbox 都不應散裝在 Windows 裡。

## 5. Workspace 的角色

`D:\OPC` 是唯一工作根目錄。所有專案、artifact、log、knowledge、agent workspace 都放在這裡。

Agent prompt 應永遠引用：

```text
D:\OPC
```

而不是叫 Agent 去找 C 槽、D 槽、E 槽。

## 6. 施工策略

先建立能穩定重灌與恢復的工作站，再建 Agent runtime。順序不可反過來。

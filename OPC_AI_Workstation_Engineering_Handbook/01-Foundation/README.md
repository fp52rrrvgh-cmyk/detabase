# 01 Foundation：OPC AI Workstation 基礎

## 1. 這台電腦的定位

這台電腦不是一般 Windows，也不是純 Linux 開發機。它的定位是：

```text
Windows 11 日常與遊戲體驗
+ WSL2 Linux 開發環境
+ Docker 服務隔離
+ AI Agent Runtime
+ 單一 Workspace
```

## 2. 為什麼不是 Linux Desktop

對目前使用情境，Linux Desktop 的最大問題不是技術能力，而是維護成本：

- 遊戲平台與反作弊相容性不穩定。
- NVIDIA、音訊、周邊、OBS、通訊軟體較容易需要手動排錯。
- 使用者目前明確表示 Linux 使用門檻過高。

因此，OPC 採用 Windows 11 作為 Host，Linux 僅作為 WSL2 runtime。

## 3. 為什麼不是雙系統 Dual Boot

Dual Boot 會讓工作流被切成兩半：

- 遊戲在 Windows。
- AI 在 Linux。
- 資料與專案分散。
- Agent 更容易迷路。
- 每次切換都要重開機。

這不符合「AI Agent 長時間工作」需求。

## 4. 採用方案

```text
Windows 11
  ↓
WSL2 Ubuntu
  ↓
Docker Desktop / Docker Engine
  ↓
AI Runtime
  ↓
D:\OPC Workspace
```

## 5. 小白理解

可以把 Windows 想成房子的地基與生活空間；WSL2 是房子裡的一間 Linux 工作室；Docker 是工作室裡一個個隔間。AI Agent 不直接把 Windows 弄亂，而是在工作室裡做事。

## 6. 驗收標準

- Windows 可以正常遊戲與日常使用。
- WSL2 可以啟動 Ubuntu。
- Docker 可以正常跑 container。
- 所有專案統一放在 `D:\OPC`。
- 任何 Agent 不需要知道 C 槽、D 槽、E 槽差異，只知道 OPC Workspace。

# 07-AI-Runtime / 01 Runtime Architecture

## 目標

建立可驗證的 OPC 執行層：目標進入、任務分解、Agent 執行、證據保存、人工驗收。

這一章分成兩層：

1. **現在可以施工的基礎層**：PostgreSQL、Redis、目錄、控制腳本、證據位置。
2. **後續應用層**：Workflow Runtime、Capability Registry、Tool Gateway、Agent workers。

不要把「基礎服務已啟動」誤稱為「OPC 自主公司已完成」。

## 核心資料流

```text
Objective
  ↓
Planner
  ↓
Workflow Runtime
  ↓
Task Queue
  ↓
Specialized Worker
  ↓
Tool / MCP / Repository / Database
  ↓
Evidence Store
  ↓
Reviewer
  ↓
Morning Report / Human Decision
```

## Phase 1：先建立 Runtime 基礎服務

使用範本：

```text
templates/opc-core-compose.yaml
```

建立目錄：

```powershell
$Runtime = 'D:\OPC\runtime\opc-core'
New-Item -ItemType Directory -Path $Runtime -Force | Out-Null
Copy-Item .\templates\opc-core-compose.yaml (Join-Path $Runtime 'compose.yaml')
Set-Location $Runtime
```

建立 `.env`：

```powershell
@'
POSTGRES_DB=opc
POSTGRES_USER=opc
POSTGRES_PASSWORD=REPLACE_WITH_A_LONG_RANDOM_PASSWORD
POSTGRES_PORT=55432
REDIS_PORT=56379
'@ | Set-Content .env
```

把 password 換成長且隨機的正式值。`.env` 不進 Git。

驗證設定：

```powershell
docker compose config
```

啟動：

```powershell
docker compose -p opc-core up -d
docker compose -p opc-core ps
```

## Phase 2：驗證 PostgreSQL

```powershell
docker compose -p opc-core exec -T postgres `
  psql -U opc -d opc -c "SELECT current_database(), current_user, now();"
```

建立最小 schema：

```powershell
docker compose -p opc-core exec -T postgres psql -U opc -d opc -c "
CREATE TABLE IF NOT EXISTS objectives (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY,
  objective_id uuid REFERENCES objectives(id),
  kind text NOT NULL,
  location text NOT NULL,
  checksum text,
  created_at timestamptz NOT NULL DEFAULT now()
);"
```

這只是最小驗證 schema，不代表完整 production schema。

## Phase 3：驗證 Redis

```powershell
docker compose -p opc-core exec -T redis redis-cli ping
```

正常結果：

```text
PONG
```

測試 Stream：

```powershell
docker compose -p opc-core exec -T redis redis-cli XADD opc:test '*' type verification value ok
docker compose -p opc-core exec -T redis redis-cli XRANGE opc:test - +
```

## Phase 4：驗證資料持久化

停止並重建 container：

```powershell
docker compose -p opc-core down
docker compose -p opc-core up -d
```

不要加 `-v`。

重新檢查 PostgreSQL table 與 Redis Stream 仍存在。

## Phase 5：使用控制腳本

```powershell
.\scripts\opc-control.ps1 -Action Status -RuntimePath 'D:\OPC\runtime\opc-core'
.\scripts\opc-control.ps1 -Action Start -RuntimePath 'D:\OPC\runtime\opc-core'
.\scripts\opc-control.ps1 -Action Pause -RuntimePath 'D:\OPC\runtime\opc-core'
.\scripts\opc-control.ps1 -Action Resume -RuntimePath 'D:\OPC\runtime\opc-core'
```

`Pause` 目前建立 dispatch marker；真正的 worker 必須實作「看到 marker 就不領新任務」。

## 核心元件白話說明

- **Objective Store**：保存老闆交代的目標與驗收條件。
- **Workflow Runtime**：記住任務做到哪裡，可暫停與恢復。
- **Queue**：排隊分派工作，避免同一任務重複做。
- **Capability Registry**：記錄每個 Agent 被允許做什麼。
- **Session Isolation**：每個任務有自己的工作區、權限與 log。
- **Evidence Layer**：保存 commit、測試、截圖、查詢與失敗紀錄。
- **Reviewer**：依驗收條件判定通過或退回。

## Hermes、Codex、OpenHands 的位置

這些是可替換的互動入口或 worker，不是 OPC 的資料真實來源，也不是安全邊界。

- Hermes：可作為訊息入口或一般 Agent worker。
- Codex：適合受控的程式碼修改與測試工作。
- OpenHands：可作為隔離的工程 worker 候選。
- ChatGPT：外部研究、架構與審查協作者，不是本機常駐 runtime。

任何產品接入前都要先定義：

- 允許讀寫哪些路徑
- 允許使用哪些工具
- Credential scope
- Timeout
- 成本上限
- Evidence 格式
- 需要人工批准的動作

## 第一個安全測試 Objective

```text
讀取指定 repository 的 README，產生摘要與風險清單，
將輸出保存到 D:\OPC\artifacts，建立 SHA-256，
不得修改 repository，不得網路發布，不得使用 secrets。
```

在完整 workflow application 尚未實作前，可人工執行此測試來驗證目錄、權限與 evidence 流程；不得把它誤稱為自主 runtime 已完成。

## 通過條件

### 基礎層 PASS

- [ ] PostgreSQL healthy。
- [ ] Redis PING 成功。
- [ ] Redis Stream 可寫入與讀取。
- [ ] Container 重建後資料仍存在。
- [ ] `.env` 未進 Git。
- [ ] `opc-control.ps1` 可 Start / Stop / Status。

### 完整 Runtime PASS

只有未來 workflow application 實際完成以下能力，才可宣告：

- [ ] 任務可 checkpoint / resume。
- [ ] 重複投遞不會造成無限制重複執行。
- [ ] 每次工具呼叫可追蹤到 objective 與 task。
- [ ] Agent session 權限隔離。
- [ ] 未註冊能力 default-deny。
- [ ] 高風險操作經人工批准。
- [ ] Morning Report 由真實 evidence 產生。

在這些條件未通過前，手冊只能宣告「Runtime foundation ready」，不能宣告「OPC autonomous runtime ready」。
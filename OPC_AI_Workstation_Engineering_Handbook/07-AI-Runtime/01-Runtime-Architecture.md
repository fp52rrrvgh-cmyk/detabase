# OPC 基礎服務與未來多 Agent 架構

## 這一章在做什麼

這一步先建立 OPC 未來會使用的兩個基礎服務：

- PostgreSQL：保存正式資料。
- Redis：保存工作佇列、暫時狀態與快速資料。

這不是完整的多 Agent OPC。

它只是先把地基準備好。

---

## 未來完整 OPC 的工作方式

```text
你下達目標
→ Planner 拆解工作
→ Research Worker 找資料
→ Coding / Action Worker 施工
→ QA / Reviewer 驗證
→ Reporter 整理結果
→ Morning Report
→ 你驗收
```

Hermes、Codex、OpenHands 或其他 Agent 都只是 Worker 候選，不是 OPC 本身。

---

## Phase 1 只做這些事

```text
建立 PostgreSQL
+ 建立 Redis
+ 確認兩個服務可以啟動
+ 確認資料不會因為容器重建而消失
```

不需要在本章完成：

- 多 Agent 協作。
- Capability Registry。
- Tool Gateway。
- Human Approval 系統。
- Morning Report。
- 完整 Workflow Runtime。

這些都屬於 Phase 2。

---

## 建立服務資料夾

```powershell
$Runtime = 'D:\OPC\runtime\opc-core'
New-Item -ItemType Directory -Path $Runtime -Force | Out-Null
Copy-Item .\OPC_AI_Workstation_Engineering_Handbook\templates\opc-core-compose.yaml (Join-Path $Runtime 'compose.yaml')
Set-Location $Runtime
```

建立 `.env`：

```powershell
@'
POSTGRES_DB=opc
POSTGRES_USER=opc
POSTGRES_PASSWORD=請換成你自己的密碼
POSTGRES_PORT=55432
REDIS_PORT=56379
'@ | Set-Content .env
```

`.env` 不要提交到 Git。

---

## 先檢查設定

```powershell
docker compose config
```

如果沒有錯誤，再啟動：

```powershell
docker compose -p opc-core up -d
docker compose -p opc-core ps
```

---

## 確認 PostgreSQL

```powershell
docker compose -p opc-core exec -T postgres `
  psql -U opc -d opc -c "SELECT current_database(), current_user, now();"
```

看到資料庫名稱、使用者與目前時間，就代表 PostgreSQL 正常。

---

## 確認 Redis

```powershell
docker compose -p opc-core exec -T redis redis-cli ping
```

正常結果：

```text
PONG
```

---

## 確認重建後資料仍存在

先停止並重建容器：

```powershell
docker compose -p opc-core down
docker compose -p opc-core up -d
```

不要加 `-v`。

`-v` 可能連資料 Volume 一起刪除。

---

## 平常會用到的指令

```powershell
docker compose -p opc-core ps
docker compose -p opc-core stop
docker compose -p opc-core start
docker compose -p opc-core logs
```

| 指令 | 用途 |
|---|---|
| `ps` | 看服務是否正常 |
| `stop` | 暫停服務 |
| `start` | 重新啟動服務 |
| `logs` | 查看錯誤訊息 |

---

## 完成標準

- PostgreSQL 顯示 healthy。
- Redis 顯示 healthy。
- PostgreSQL 查詢成功。
- Redis 回傳 `PONG`。
- `docker compose down` 再 `up -d` 後服務仍正常。
- `.env` 沒有提交到 Git。

---

## Phase 2 才要決定的事情

Phase 2 才研究：

- 多個 Worker 如何互相協作。
- 誰負責拆解任務。
- 誰負責找資料。
- 誰負責施工。
- 誰負責驗證。
- 如何產生 Morning Report。
- Hermes、Codex、OpenHands、MCP 或其他工具放在哪一層。

目前不要因為這些名詞還沒決定，就認為 Phase 1 沒完成。

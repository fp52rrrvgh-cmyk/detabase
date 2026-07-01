# Phase 1 最終驗收

## 這份表的用途

這不是企業稽核表。

它只用來確認：

> 這台電腦是否已經準備好，可以開始建立真正的多 Agent OPC。

結果分成三種：

- **PASS**：必要功能正常。
- **CONDITIONAL**：可以使用，但有已知提醒。
- **FAIL**：必要功能沒有正常工作。

---

## 1. Windows

- [ ] Windows 11 可以正常開機與使用。
- [ ] 網路、音訊與顯示卡正常。
- [ ] Windows Update 已完成主要更新。

以下不再是必要通過條件：

- Secure Boot。
- TPM。
- BitLocker。
- Defender 特定狀態。
- 遊戲與反作弊測試。

---

## 2. 資料碟與工作區

- [ ] D: 是預定的資料碟。
- [ ] D: 使用 NTFS。
- [ ] `D:\OPC` 可以讀寫。
- [ ] `projects`、`runtime`、`data`、`backups`、`artifacts` 等主要資料夾存在。

以下屬於可選進階管理：

- 固定磁碟標籤。
- Volume UniqueId。
- 硬體序號紀錄。
- BitLocker recovery key。
- 外部備份抽樣還原。

---

## 3. 開發工具

執行：

```powershell
git --version
gh --version
code --version
pwsh --version
python --version
uv --version
node --version
pnpm --version
```

- [ ] 需要的工具都有版本輸出。
- [ ] VS Code 可以開啟 OPC 專案。
- [ ] GitHub CLI 可以登入正確帳號。

不要求第一次驗收就完成 `.venv`、`node_modules` 的刪除重建演練。

---

## 4. WSL2

```powershell
wsl --version
wsl -l -v
```

- [ ] Ubuntu 可以啟動。
- [ ] Ubuntu 顯示 VERSION 2。
- [ ] `/mnt/d/OPC` 可以讀取。

以下屬於進階選項：

- systemd 深入檢查。
- `.wslconfig` 資源調校。
- WSL export / import。
- NVIDIA GPU 測試。

---

## 5. Docker

```powershell
docker version
docker run --rm hello-world
docker compose version
```

- [ ] Docker Desktop 可以開啟。
- [ ] `hello-world` 成功。
- [ ] Windows 與 Ubuntu 都可以使用 Docker。

不要求第一次驗收就完成複雜網路、Port 限制或 Docker Context 管理。

---

## 6. PostgreSQL 與 Redis

```powershell
Set-Location D:\OPC\runtime\opc-core
docker compose -p opc-core up -d
docker compose -p opc-core ps
```

PostgreSQL：

```powershell
docker compose -p opc-core exec -T postgres `
  psql -U opc -d opc -c "SELECT now();"
```

Redis：

```powershell
docker compose -p opc-core exec -T redis redis-cli ping
```

- [ ] PostgreSQL 可以查詢。
- [ ] Redis 回傳 `PONG`。
- [ ] `.env` 沒有提交到 Git。

以下屬於進階測試：

- Redis Stream。
- PostgreSQL dump / restore。
- 完整資料持久化測試。
- `opc-control.ps1` 所有操作。

---

## 7. 執行 verify-all

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\OPC_AI_Workstation_Engineering_Handbook\scripts\verify-all.ps1
```

判斷方式：

- 必要項目沒有 FAIL：可以通過。
- WARN 已理解且不影響使用：可以列為 CONDITIONAL。
- 可選項目 SKIP：不阻止 PASS。

JSON 與 Markdown 報告可用於排錯，但一般使用者不必每次都保存完整稽核資料。

---

## 8. Phase 1 最低通過標準

```text
Windows 正常
+ D:\OPC 可使用
+ 開發工具可執行
+ WSL2 正常
+ Docker hello-world 成功
+ PostgreSQL 可查詢
+ Redis 回傳 PONG
+ verify-all 無必要項目 FAIL
= PHASE 1 READY
```

這代表：

> 工作站地基已準備好，可以開始 Phase 2。

---

## 9. Phase 2 才要完成的內容

以下不屬於 Phase 1：

- Objective intake。
- 自動任務拆解。
- 多 Agent 協作。
- Research Worker。
- Coding Worker。
- QA / Reviewer Worker。
- Queue、retry、checkpoint。
- MCP 或 Tool Gateway。
- Morning Report。
- 自動驗收流程。

Phase 1 不應因為這些功能尚未存在而判定失敗。

---

## 10. 簡單驗收紀錄

```text
驗收日期：
Windows 是否正常：
WSL2 是否正常：
Docker 是否正常：
PostgreSQL 是否正常：
Redis 是否正常：
verify-all 結果：
Phase 1 結果：PASS / CONDITIONAL / FAIL
需要修正的項目：
```

不需要填寫企業級簽核、RTO、RPO、Evidence directory 或完整 Recovery 報告，除非日後真的有需要。

# 從零重建 OPC 工作站

## Bare-metal Rebuild 是什麼

這個名稱聽起來很工程化，但意思很簡單：

> 如果 Windows 壞掉、SSD 更換或整台電腦重灌，能不能照說明書重新建立工作環境。

這不是每天都要做的事情。

Phase 1 只需要完整做一次，用來確認手冊沒有漏步驟。

---

## 最常見的三種情況

### 只有 Windows 壞掉，資料碟還在

- 不格式化資料碟。
- 重灌 Windows。
- 重新安裝工具、WSL2 與 Docker。
- 接回 `D:\OPC`。
- 重新啟動 PostgreSQL 與 Redis。

### Windows 與資料碟都要重建

- 重灌 Windows。
- 建立新的 D: 資料碟。
- 建立 `D:\OPC`。
- 從 GitHub 重新取得程式。
- 從可用備份還原真正重要的資料。

### 整台電腦更換

把它當成一台新電腦，從本手冊第一階段重新開始。

---

## 最低需要準備的東西

- Windows 安裝 USB。
- GitHub 帳號登入方式。
- 本手冊 repository。
- 重要個人文件備份。
- 無法重新產生的資料庫資料備份。

以下屬於進階準備，不是第一次重建測試的必要條件：

- 完整 Recovery Package。
- 所有硬體序號紀錄。
- Volume UniqueId。
- BitLocker Key ID。
- WSL export。
- SHA-256 清單。
- RTO / RPO 報告。

---

## 重建順序

```text
安裝 Windows 11
→ 安裝驅動與 Windows Update
→ 建立 D:\OPC
→ 安裝 Git、PowerShell、Python、Node.js
→ 安裝 WSL2
→ 安裝 Docker Desktop
→ 啟動 PostgreSQL 與 Redis
→ 執行 verify-all
```

完整操作請回到：

```text
11-Final/01-Master-Index.md
```

---

## 重新取得手冊

```powershell
Set-Location D:\OPC\projects
gh repo clone fp52rrrvgh-cmyk/detabase detabase
Set-Location .\detabase
git status
git log -1 --oneline
```

不需要為了使用手冊記住特定 commit SHA。

若正在做正式 Phase 1 驗收，才需要記錄實際使用的 commit，方便日後知道當時使用哪一版。

---

## 哪些東西應該重新安裝，而不是備份

通常不需要備份：

- `node_modules`
- `.venv`
- Docker image cache
- 暫存檔
- 可重新下載的模型
- 一般 logs

這些應由安裝工具重新建立。

真正值得備份的是：

- 個人文件。
- 尚未 push 的程式。
- 無法重新產生的資料庫資料。
- 自己製作且沒有其他來源的檔案。

---

## 重建後檢查

```powershell
git --version
python --version
node --version
wsl -l -v
docker run --rm hello-world
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

最後執行：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\verify-all.ps1
```

---

## 最低完成標準

- Windows 可以正常使用。
- D:\OPC 可以使用。
- 開發工具可以執行。
- WSL2 正常。
- Docker hello-world 成功。
- PostgreSQL 可以查詢。
- Redis 回傳 PONG。
- `verify-all.ps1` 沒有必要項目 FAIL。

達到這些條件，就證明：

> 即使重灌，仍然可以照手冊重新建立 OPC 工作站。

---

## 可選進階演練

想提高復原能力時，再逐步加入：

- PostgreSQL dump / restore。
- WSL export / import。
- 外部備份驗證。
- BitLocker recovery。
- 整機更換演練。
- RTO / RPO 紀錄。
- Credential 輪替。

這些是進階維護能力，不應被誤認為一般使用者完成 Phase 1 的基本門檻。

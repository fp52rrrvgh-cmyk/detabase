# 整體檢查：確認 OPC 工作站可以使用

## 這一步在做什麼

把前面完成的項目一次檢查：

```text
Windows
→ D:\OPC 工作區
→ 開發工具
→ WSL2
→ Docker
→ PostgreSQL
→ Redis
→ verify-all
```

這不是企業稽核，也不是考試。

它只是確認：

> 這台電腦是否已經能開始建立真正的多 Agent OPC。

---

## 1. Windows 與資料碟

確認：

- Windows 可以正常使用。
- 網路、音效與顯示卡正常。
- D: 是預定的資料碟。
- D: 使用 NTFS。
- `D:\OPC` 可以讀寫。

TPM、Secure Boot、BitLocker 與完整外部備份演練不再是必要通過條件。

---

## 2. 開發工具

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

只要需要的指令都有版本號，就代表可以使用。

GitHub CLI 尚未登入時：

```powershell
gh auth login
gh auth status
```

GitHub 兩步驟驗證屬於個人帳號選擇，不是本手冊的必要門檻。

---

## 3. WSL2

```powershell
wsl --version
wsl -l -v
```

完成標準：

- Ubuntu 可以啟動。
- Ubuntu 顯示 VERSION 2。
- `/mnt/d/OPC` 可以讀取。

不需要為了通過本章完成 WSL export / import 演練。

---

## 4. Docker

```powershell
docker version
docker run --rm hello-world
docker compose version
```

看到 `Hello from Docker!` 就代表 Docker 基本功能正常。

---

## 5. PostgreSQL 與 Redis

進入 Runtime 目錄：

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

正常結果：

- PostgreSQL 回傳目前時間。
- Redis 回傳 `PONG`。

---

## 6. 確認容器可以重建

```powershell
docker compose -p opc-core down
docker compose -p opc-core up -d
docker compose -p opc-core ps
```

不要加 `-v`。

本測試只確認服務可以重新建立，不要求第一次驗收就完成完整資料庫災難還原。

---

## 7. 執行 verify-all

回到手冊 repository：

```powershell
.\OPC_AI_Workstation_Engineering_Handbook\scripts\verify-all.ps1
```

結果說明：

| 結果 | 意思 |
|---|---|
| PASS | 必要項目正常 |
| CONDITIONAL | 可以使用，但有提醒事項 |
| FAIL | 某個必要項目沒有正常工作 |

出現 FAIL 時，回到對應章節修正即可，不代表整台電腦需要重灌。

JSON 與 Markdown 報告是方便排錯的可選輸出，不是一般使用者每次都必須保存的稽核文件。

---

## 最低通過條件

- Windows 正常使用。
- D:\OPC 可以讀寫。
- Git、PowerShell、Python、Node.js 可執行。
- Ubuntu 是 WSL2。
- Docker hello-world 成功。
- PostgreSQL 可以查詢。
- Redis 回傳 PONG。
- `verify-all.ps1` 沒有必要項目 FAIL。

達到以上條件：

```text
READY FOR OPC PHASE 2 DEVELOPMENT
```

這表示工作站地基已準備好。

不表示多 Agent OPC 已經完成。

---

## 可選進階驗收

有需要時才做：

- PostgreSQL dump / restore。
- WSL export / import。
- BitLocker recovery 演練。
- 故意製造 bootstrap 失敗。
- 每一步保存 checksum 與完整 evidence。
- 完整災難復原演練。

這些可以提高復原能力，但不應阻礙一般使用者完成 Phase 1。

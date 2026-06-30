# 06 Docker：AI Runtime 的隔離層

## 1. Docker 是什麼

Docker 可以理解成一個一個乾淨的小房間。Redis、Postgres、測試環境、Agent sandbox 可以各自在自己的房間工作，不直接污染 Windows。

## 2. 為什麼 OPC 需要 Docker

AI 工作站會跑很多服務：

- Redis
- Postgres / Supabase local
- Agent runtime
- Web dashboard
- 測試環境

如果全部直接安裝在 Windows，未來一定難以管理。Docker 可以讓服務用 compose 檔重建。

## 3. Windows 採用 Docker Desktop + WSL2 backend

目前採用 Docker Desktop，並使用 WSL2 backend。理由：

- Windows 使用者維護成本較低。
- VS Code、WSL、Docker 整合成熟。
- 方便管理 containers、volumes、logs。

## 4. 安裝

```powershell
winget install --id Docker.DockerDesktop -e
```

安裝後重開機，開啟 Docker Desktop，確認使用 WSL2 backend。

## 5. 驗收

```powershell
docker --version
docker compose version
docker run hello-world
```

## 6. OPC Docker 原則

所有 compose 檔放在：

```text
D:\OPC\runtime
```

不要把資料庫資料散放在桌面或下載資料夾。

## 7. 第一個 compose 範例

```yaml
services:
  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## 8. 常見錯誤

- Docker Desktop 沒開，CLI 會失敗。
- 關掉 WSL2 / Virtual Machine Platform，Docker 會壞。
- 把資料庫 volume 放在不固定路徑，重灌後難恢復。

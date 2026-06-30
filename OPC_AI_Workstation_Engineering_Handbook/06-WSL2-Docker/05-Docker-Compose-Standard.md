# 06-WSL2-Docker / 05 Docker Compose 標準

## 目標
讓每一個 OPC service stack 都能被一致地啟動、停止、驗證與重建。

## 目錄標準

```text
D:\OPC\runtime\<stack-name>
├─ compose.yaml
├─ .env.example
├─ config\
├─ scripts\
└─ README.md
```

## Compose 範例

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: opc
      POSTGRES_USER: opc
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opc -d opc"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

volumes:
  postgres_data:

networks:
  backend:
    driver: bridge
```

## 必要規則

- Image 使用明確版本，不使用未固定的 `latest`
- Service 必須有清楚名稱
- 資料庫使用 named volume
- 對外 port 只開必要項目
- 服務加入 healthcheck
- Secret 透過環境變數或 secret provider 提供
- Compose 檔與非敏感設定進 Git

## 操作指令

```powershell
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail 100
docker compose down
```

`docker compose down` 預設不刪除 named volume。不要任意加上 `-v`。

## Stack 命名

建議使用明確 project name：

```powershell
docker compose -p opc-core up -d
```

避免不同資料夾產生同名 container 或 volume。

## 驗收

- `docker compose config` 無錯誤
- 所有 service 顯示 healthy 或 running
- 重建 container 後資料仍存在
- `.env` 未提交 Git
- 關閉 stack 不會誤刪 volume

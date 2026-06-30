# 06-WSL2-Docker / 05 Docker Compose 標準

## 目標

讓每個 OPC service stack 都能用同一套方式啟動、停止、驗證與重建，而且不誤刪資料。

## 固定目錄

```text
D:\OPC\runtime\<stack-name>
├─ compose.yaml
├─ .env.example
├─ .env
├─ config\
├─ scripts\
└─ README.md
```

`.env` 不進 Git；`.env.example` 只能放欄位名稱與假資料。

## Step 1：建立最小測試 stack

建立目錄：

```powershell
$Stack = 'D:\OPC\runtime\compose-test'
New-Item -ItemType Directory -Path $Stack -Force | Out-Null
Set-Location $Stack
```

建立 `compose.yaml`：

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: opc_test
      POSTGRES_USER: opc_test
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opc_test -d opc_test"]
      interval: 10s
      timeout: 5s
      retries: 10
    ports:
      - "127.0.0.1:55432:5432"

volumes:
  postgres_data:
```

建立 `.env`：

```powershell
'POSTGRES_PASSWORD=replace-with-a-temporary-test-password' | Set-Content .env
```

測試密碼不可用於正式環境。

## Step 2：先驗證設定，不要直接啟動

```powershell
docker compose config
```

正常結果：

- 沒有 YAML error。
- Environment variable 已展開。
- Volume 名稱清楚。
- Port 只綁定 `127.0.0.1`，不對整個區域網路公開。

## Step 3：啟動 stack

```powershell
docker compose -p opc-compose-test up -d
docker compose -p opc-compose-test ps
```

等待 healthcheck 後，Status 應顯示 running / healthy。

查看 log：

```powershell
docker compose -p opc-compose-test logs --tail 100
```

## Step 4：建立測試資料

```powershell
docker compose -p opc-compose-test exec -T postgres `
  psql -U opc_test -d opc_test -c "CREATE TABLE IF NOT EXISTS verification(id integer primary key, value text); INSERT INTO verification(id,value) VALUES (1,'persisted') ON CONFLICT (id) DO UPDATE SET value='persisted';"
```

查詢：

```powershell
docker compose -p opc-compose-test exec -T postgres `
  psql -U opc_test -d opc_test -c "SELECT * FROM verification;"
```

應看到 `persisted`。

## Step 5：測試 container 重建

```powershell
docker compose -p opc-compose-test down
docker compose -p opc-compose-test up -d
```

等待 healthy，再查詢同一筆資料：

```powershell
docker compose -p opc-compose-test exec -T postgres `
  psql -U opc_test -d opc_test -c "SELECT * FROM verification;"
```

資料仍存在才算通過。

## Step 6：停止 stack

```powershell
docker compose -p opc-compose-test down
```

不要加 `-v`。`-v` 會刪除 named volume。

## 正式 Stack 必要規則

- Image 使用明確版本，不使用浮動 `latest`。
- Database 使用 named volume。
- Service 有 healthcheck。
- 對外 port 只開必要項目。
- 預設綁定 `127.0.0.1`，除非真的需要區域網路存取。
- Secrets 不寫入 image、compose.yaml 或 Git。
- Compose 設定放 `D:\OPC\runtime\<stack-name>`。
- 使用固定 project name，避免 container 與 volume 衝突。

## 常用安全指令

```powershell
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail 100
docker compose stop
docker compose start
docker compose down
```

## 危險指令

```text
docker compose down -v
docker system prune --volumes
Docker Desktop Factory Reset
```

執行前必須知道會刪除什麼，並已完成 database dump 與還原測試。

## 完成條件

- [ ] `docker compose config` 無錯誤。
- [ ] Service 顯示 healthy 或 running。
- [ ] Port 沒有不必要地公開到所有介面。
- [ ] `.env` 不進 Git。
- [ ] Container 重建後測試資料仍存在。
- [ ] `docker compose down` 不會刪除 volume。

## 停止條件

- Compose 顯示明文正式密碼。
- Database 使用 Windows bind mount 作為資料目錄。
- Port 與既有服務衝突。
- Container 不斷 restart。
- 重建後資料消失。

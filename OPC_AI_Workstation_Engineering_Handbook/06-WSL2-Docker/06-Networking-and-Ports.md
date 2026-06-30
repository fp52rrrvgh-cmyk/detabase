# 06-WSL2-Docker / 06 Networking 與 Port 管理

## 目標
讓 Windows、WSL2、Docker container 與瀏覽器之間的連線可預期，避免 port 衝突與服務暴露到不必要的網路介面。

## 基本原則

- 只發布必要的 port
- 本機管理介面優先綁定 `127.0.0.1`
- Container 之間優先使用 Docker network 與 service name
- 不把資料庫 port 暴露到區域網路，除非有明確需求

## Compose 範例

```yaml
services:
  app:
    ports:
      - "127.0.0.1:3000:3000"
```

這代表只有本機能透過 `http://localhost:3000` 存取。

## Container 內互連

同一個 Compose network 內，服務應使用 service name：

```text
postgres:5432
redis:6379
```

不要在 container 內使用 `localhost` 指向另一個 container。

## 查詢 Port

```powershell
Get-NetTCPConnection -State Listen |
  Sort-Object LocalPort |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## Port 命名範圍

建議建立內部登記表，避免不同 stack 重複使用：

```text
3000-3099  Web applications
5000-5099  APIs
5400-5499  Databases for local development
6300-6399  Redis and queues
8000-8099  Agent services
```

這只是 OPC 慣例，不代表所有服務必須使用這些 port。

## 防火牆

若服務只供本機使用，不應建立對 Public network 開放的規則。任何區域網路存取都必須記錄用途、來源與風險。

## 常見錯誤

- Container 內用 `localhost` 尋找 Postgres
- 對所有介面發布資料庫 port
- 多個 Compose stack 搶同一個 host port
- 為解決連線問題直接關閉 Windows Firewall

## 驗收

- 本機可連線到需要的服務
- 區域網路無法存取未授權服務
- Container 互連使用 service name
- 沒有未知 port 長期監聽

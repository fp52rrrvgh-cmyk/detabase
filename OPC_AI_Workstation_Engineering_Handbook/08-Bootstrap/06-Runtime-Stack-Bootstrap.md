# 08-Bootstrap / 06 Runtime Stack Bootstrap

## 目標

啟動 Redis、PostgreSQL 與 OPC Runtime 基礎服務，並確保資料、網路、健康檢查與版本都符合 Manifest。

## 目錄

```text
D:\OPC\runtime\opc-core
├─ compose.yaml
├─ .env.example
├─ config\
├─ migrations\
└─ scripts\
```

## 啟動前檢查

- Docker Desktop 正常
- 必要 port 未被占用
- `.env` 已由人工或 secret provider 建立
- Named volume 名稱正確
- Compose image 使用固定版本

## 標準流程

```powershell
cd D:\OPC\runtime\opc-core
docker compose config
docker compose pull
docker compose up -d
docker compose ps
```

## Database Migration

Migration 必須：

- 有版本號
- 可追蹤
- 先在測試環境驗證
- 失敗即停止後續 runtime 啟動
- 執行前建立備份或確認為全新資料庫

## 健康檢查

至少驗證：

```text
PostgreSQL accepting connections
Redis PING succeeds
Runtime API health endpoint returns success
Queue consumer group exists
Required tables exist
```

## 重跑規則

- Stack 已啟動且 healthy：跳過重建。
- Image 版本改變：先輸出差異並依 Manifest 更新。
- Volume 已存在：不得自動刪除。
- Migration 已套用：不得重複執行非冪等 migration。

## 驗收

- `docker compose ps` 顯示服務正常。
- PostgreSQL schema 版本正確。
- Redis 可回應 PING。
- Runtime API 可存取。
- 重建 container 後資料仍存在。
- 所有服務版本與 Manifest 一致。
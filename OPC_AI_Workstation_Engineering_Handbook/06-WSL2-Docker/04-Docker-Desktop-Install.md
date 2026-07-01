# 安裝 Docker Desktop

## Docker 是什麼

Docker 讓不同服務在彼此分開的空間中執行。

可以把它想成：

> 每個服務都有自己的工作箱，壞掉時可以重建，不需要把整台 Windows 重裝。

對 OPC 來說，Docker 主要用來承載：

- PostgreSQL
- Redis
- 未來的 Agent Runtime
- 其他需要獨立環境的服務

---

## 安裝前確認

- Windows Update 已完成。
- WSL2 可以正常使用。
- Ubuntu 顯示 VERSION 2。
- 磁碟還有足夠空間。

不需要先設定 Kubernetes，也不需要先研究複雜的 Docker 網路。

---

## 安裝

在 PowerShell 執行：

```powershell
winget install --id Docker.DockerDesktop -e
```

安裝完成後重新開機或重新登入，再開啟 Docker Desktop。

第一次開啟時：

1. 接受授權條款。
2. 使用 WSL2 based engine。
3. 啟用主要 Ubuntu 的 WSL integration。
4. 等待 Docker Engine Ready。

---

## 確認是否成功

在 PowerShell 執行：

```powershell
docker version
docker info
docker run --rm hello-world
docker compose version
```

在 Ubuntu 執行：

```bash
docker version
```

完成標準：

- Docker Desktop 可以開啟。
- `hello-world` 成功。
- Windows 與 Ubuntu 都能使用 `docker` 指令。

---

## 你現在只需要理解四個詞

| 名稱 | 簡單意思 |
|---|---|
| Image | 建立服務時使用的範本 |
| Container | 真正執行中的服務 |
| Volume | 保存服務資料的位置 |
| Compose | 一次啟動多個服務的設定檔 |

第一次使用時，不需要理解更深的 namespace、overlay network 或 cgroup。

---

## 平常怎麼看 Docker 是否正常

```powershell
docker ps
docker compose ps
```

- `docker ps`：查看目前正在執行的容器。
- `docker compose ps`：查看目前這一組服務的狀態。

---

## 暫時不要使用的功能

- Kubernetes
- Docker Swarm
- 多個 Docker context
- 自訂複雜網路
- 在 Ubuntu 裡再安裝第二套 Docker Engine

這些都不是 Phase 1 必要內容。

---

## 看不懂時不要執行的指令

```text
docker system prune --volumes
docker compose down -v
Docker Desktop Factory Reset
wsl --unregister
```

這些操作可能刪除容器或資料。

一般重新啟動服務通常只需要：

```powershell
docker compose stop
docker compose start
```

---

## Docker 無法使用時

依序檢查：

```text
Docker Desktop 是否開啟
→ wsl -l -v 是否正常
→ docker version 是否有回應
→ 關閉 Docker Desktop
→ 執行 wsl --shutdown
→ 重新開啟 Docker Desktop
```

Factory Reset 是最後手段，不是一般修復方式。

---

## 可選進階項目

以下有需要再學：

- Volume 備份與還原
- Docker context
- 資源限制
- 自訂 network
- 更新前的服務停機流程
- Docker Desktop 診斷工具

它們不再是第一次安裝的必要門檻。

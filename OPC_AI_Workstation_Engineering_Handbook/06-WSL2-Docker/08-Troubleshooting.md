# 06-WSL2-Docker / 08 WSL2 與 Docker 疑難排解

## 目標
以固定順序排查 WSL2、Docker、網路、volume 與 GPU 問題，避免直接重設全部環境。

## WSL2 無法啟動

```powershell
wsl --status
wsl -l -v
wsl --update
wsl --shutdown
```

依序檢查：

1. BIOS 虛擬化是否開啟
2. Windows Subsystem for Linux 是否啟用
3. Virtual Machine Platform 是否啟用
4. Windows Update 是否完成
5. `.wslconfig` 是否有無效值

## Docker Desktop 無法啟動

```powershell
docker version
docker context ls
wsl -l -v
```

檢查：

- Docker Desktop 是否正在執行
- WSL2 backend 是否啟用
- Ubuntu integration 是否啟用
- C 與 D 槽是否空間不足
- WSL2 是否能正常啟動

## Container 反覆重啟

```powershell
docker ps -a
docker logs <CONTAINER_NAME> --tail 200
docker inspect <CONTAINER_NAME>
```

常見原因：

- 環境變數缺失
- Port 已被占用
- Volume 權限問題
- Healthcheck 錯誤
- 依賴服務尚未 ready

## Volume 資料異常

先停止寫入，再執行：

```powershell
docker volume ls
docker volume inspect <VOLUME_NAME>
```

不要直接刪除 volume。先建立備份或使用資料庫原生 dump。

## 網路問題

```powershell
Test-NetConnection localhost -Port <PORT>
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

在 container 內：

```bash
getent hosts postgres
curl -v http://app:3000
```

## WSL2 磁碟膨脹

先清理可重建資料與 Docker cache，再評估 compact。不得在執行中的 WSL2 distribution 上操作虛擬磁碟。

## 最後手段

以下操作具破壞性，必須先備份：

- Docker Desktop factory reset
- `wsl --unregister`
- 刪除 named volume
- 重建 distribution

## 問題紀錄模板

```text
症狀：
發生時間：
最近變更：
Windows / WSL / Docker 版本：
執行中的 stack：
錯誤 log：
採取的單一修復：
驗證結果：
```

# 06-WSL2-Docker / 02 `.wslconfig` 資源限制

## 目標
避免 WSL2、Docker 或本機 AI 任務吃光 Windows 的 RAM、CPU 與 swap，保留遊戲與日常操作空間。

## 設定檔位置

```text
%UserProfile%\.wslconfig
```

## 原則

- 不在不知道硬體規格時硬寫固定數值。
- RAM 至少保留 8 GB 給 Windows；遊戲時應保留更多。
- CPU 不必全部分配給 WSL2。
- swap 作為緩衝，不應取代實體記憶體。

## 範例
以下只作為 32 GB RAM、8 核心以上桌機的起始範例：

```ini
[wsl2]
memory=16GB
processors=6
swap=8GB
localhostForwarding=true

[experimental]
autoMemoryReclaim=gradual
sparseVhd=true
```

不同硬體必須調整。若電腦有 64 GB RAM，可提高 WSL2 上限；若只有 16 GB，應大幅降低並避免本機大型模型。

## 套用設定

```powershell
wsl --shutdown
```

重新啟動 WSL2 後驗證：

```bash
nproc
free -h
```

## 遊戲模式
遊戲前可停止 WSL2：

```powershell
wsl --shutdown
```

但只在沒有執行中的 Agent、資料庫寫入或 Docker 任務時使用。

## 常見錯誤

- 把全部 RAM 分給 WSL2
- processors 設為全部邏輯核心
- 未停止 WSL 就期待設定立即生效
- swap 設得過大並放在空間不足的 C 槽
- 網路教學中的設定未經驗證直接照抄

## 驗收

- Windows 閒置與遊戲時仍有足夠 RAM
- WSL2 可取得預期 CPU 與記憶體
- 大型任務不造成 Windows 無回應
- Docker container 在限制內正常運作

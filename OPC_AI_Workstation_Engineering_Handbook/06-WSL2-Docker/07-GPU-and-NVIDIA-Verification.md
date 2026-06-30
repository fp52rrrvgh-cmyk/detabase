# 06-WSL2-Docker / 07 GPU 與 NVIDIA 驗證

## 目標
確認 Windows、WSL2 與 Docker 能正確使用 NVIDIA GPU，且不在 WSL2 內重複安裝不相容的顯示驅動。

## 核心原則

- Windows 安裝官方 NVIDIA 驅動
- WSL2 使用 Windows 提供的 GPU 支援
- 不在 WSL2 內安裝完整 Linux display driver
- CUDA toolkit 與 container runtime 依實際框架需求安裝

## Windows 驗證

```powershell
nvidia-smi
```

應顯示 GPU 型號、驅動版本與顯存狀態。

## WSL2 驗證

在 Ubuntu 執行：

```bash
nvidia-smi
```

若找不到指令，先確認 Windows 驅動與 WSL 更新，不要立刻安裝 Linux 顯示驅動。

## Docker 驗證

GPU container 的實際 image tag 必須依當前 CUDA 與驅動相容性決定。基本驗證模式：

```powershell
docker run --rm --gpus all <CUDA_IMAGE> nvidia-smi
```

不要把網路文章中的舊 CUDA image tag 永久寫入手冊；正式施工時應鎖定已驗證版本。

## 資源邊界

- 不讓多個本機模型無限制占滿 VRAM
- 遊戲前停止 GPU inference container
- Agent scheduler 必須知道 GPU 是否已被占用
- OOM 事件應保留 log 與任務 evidence

## 常見錯誤

- Windows 驅動過舊
- WSL 未更新
- WSL2 內安裝完整 Linux NVIDIA driver
- Container 未加 `--gpus all`
- CUDA image 與主機驅動不相容
- 遊戲與模型同時占用大量 VRAM

## 驗收

- Windows `nvidia-smi` 成功
- WSL2 `nvidia-smi` 成功
- 測試 container 能看到同一張 GPU
- 停止 container 後 VRAM 正常釋放

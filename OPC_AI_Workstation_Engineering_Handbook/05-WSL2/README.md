# 05 WSL2：Windows 裡的 Linux Runtime

## 1. WSL2 是什麼

WSL2 可以理解成 Windows 內建的一台輕量 Linux 電腦。你平常仍然使用 Windows，但 AI 工程工具可以住在 Ubuntu 裡。

## 2. 為什麼需要 WSL2

很多 AI 與開發工具在 Linux 環境中最穩定，例如：

- Python CLI
- Node CLI
- Docker
- Redis / Postgres
- shell scripts
- 開源 agent runtime

WSL2 讓你不需要放棄 Windows，也能得到接近 Linux 的開發體驗。

## 3. 安裝

以系統管理員 PowerShell 執行：

```powershell
wsl --install
```

安裝完成後重新開機，設定 Ubuntu 使用者名稱與密碼。

## 4. 基本驗收

```powershell
wsl --version
wsl -l -v
```

Ubuntu 狀態應為 WSL 2。

## 5. WSL 內部初始設定

進入 Ubuntu 後：

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y build-essential curl git unzip ca-certificates
```

## 6. 檔案位置原則

不要把大型專案放在：

```text
/mnt/c/Users/...
```

長期 AI runtime 可以放在 Linux home 或 Docker volume，但 Windows 主要工作根目錄仍是：

```text
D:\OPC
```

之後會用固定規則銜接 Windows Workspace 與 WSL Workspace。

## 7. 常見錯誤

### 錯誤：關掉 Hyper-V 類功能

結果：WSL2 或 Docker 壞掉。

### 錯誤：所有專案都放在桌面或下載資料夾

結果：Agent 路徑混亂、備份困難。

## 8. 驗收

```bash
uname -a
git --version
curl --version
```

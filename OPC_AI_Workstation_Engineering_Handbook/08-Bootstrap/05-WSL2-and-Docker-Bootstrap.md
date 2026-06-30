# 08-Bootstrap / 05 WSL2 與 Docker Bootstrap

## 目標

以分階段方式啟用 WSL2、初始化 Ubuntu、安裝 Docker Desktop，並在每個需要重開機的邊界安全停止。

## Windows Features

以系統管理員 PowerShell 執行：

```powershell
$Features = @(
  'Microsoft-Windows-Subsystem-Linux',
  'VirtualMachinePlatform'
)

foreach ($Feature in $Features) {
  $State = Get-WindowsOptionalFeature -Online -FeatureName $Feature
  if ($State.State -ne 'Enabled') {
    Enable-WindowsOptionalFeature -Online -FeatureName $Feature -All -NoRestart
  }
}
```

若任何 feature 剛被啟用，Bootstrap 應標記需要重開機並停止。

## WSL2

```powershell
wsl --install -d Ubuntu
wsl --set-default-version 2
wsl --update
```

若 Ubuntu 已存在，先用 `wsl -l -v` 驗證，不應重新註冊或覆寫。

## Ubuntu 初始化

Linux 使用者建立需要人工輸入，因此 Bootstrap 應清楚提示並暫停。完成後才執行套件初始化：

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y build-essential curl git unzip zip jq ca-certificates
```

## Docker Desktop

先確認 WSL2 正常，再透過 winget 安裝 Docker Desktop。安裝完成後可能需要重新登入或重開機。

## Integration 驗證

```powershell
wsl -l -v
docker version
docker info
docker run --rm hello-world
```

在 Ubuntu：

```bash
docker version
```

## 不允許的自動操作

- `wsl --unregister`
- Docker Desktop factory reset
- 刪除 named volumes
- 未備份就搬移 WSL 虛擬磁碟
- 在 WSL2 內額外安裝完整 NVIDIA Linux display driver

## 驗收

- Ubuntu 使用 WSL2。
- systemd 可用。
- Docker Desktop 使用 WSL2 backend。
- Windows 與 Ubuntu 的 Docker client 可正常使用。
- 重跑腳本不會重建 distribution 或刪除 volume。
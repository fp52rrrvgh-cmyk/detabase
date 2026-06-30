# 06-WSL2-Docker / 01 WSL2 安裝與初始化

## 目標
在 Windows 11 上建立穩定的 Ubuntu WSL2 環境，供 Linux CLI、Python、Node、AI runtime 與 Docker backend 使用。

## 安裝
以系統管理員 PowerShell 執行：

```powershell
wsl --install
```

若已安裝 WSL，確認版本：

```powershell
wsl --status
wsl --version
wsl -l -v
```

Ubuntu 應顯示 VERSION 2。

## 初次啟動
第一次進入 Ubuntu 時建立 Linux 使用者名稱與密碼。這組密碼只用於 Linux `sudo`，不等於 Windows 密碼。

## 更新 Ubuntu

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y build-essential curl git unzip zip jq ca-certificates
```

## 啟用 systemd
建立 `/etc/wsl.conf`：

```ini
[boot]
systemd=true
```

返回 PowerShell：

```powershell
wsl --shutdown
```

重新進入 Ubuntu 後驗證：

```bash
systemctl --version
systemctl is-system-running
```

## 目錄原則

Windows 工作根目錄：

```text
D:\OPC
```

在 WSL2 內對應：

```text
/mnt/d/OPC
```

Linux 專用 runtime 或高頻 I/O 專案可放 WSL2 Linux filesystem，例如：

```text
~/opc-runtime
```

但必須在文件中清楚記錄，不得讓同一 repository 同時存在兩份未同步副本。

## 驗收

```powershell
wsl -l -v
```

```bash
uname -a
cat /etc/os-release
systemctl is-system-running
```

確認 Ubuntu 使用 WSL2、套件更新成功、systemd 可用。
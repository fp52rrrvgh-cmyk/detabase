# 06-WSL2-Docker / 01 WSL2 安裝與初始化

## 目標

在 Windows 11 建立穩定的 Ubuntu WSL2，供 Linux CLI、AI runtime 與 Docker Desktop 使用。

## Step 1：確認虛擬化

先在工作管理員確認：

```text
Ctrl + Shift + Esc
→ 效能
→ CPU
→ 虛擬化：已啟用
```

若不是「已啟用」，先回到 `03-Windows/05-Hyper-V-and-Virtualization.md`，不要繼續。

## Step 2：安裝 WSL

以系統管理員 PowerShell 執行：

```powershell
wsl --install
```

完成後依提示重新開機。

若系統已經安裝 WSL，執行：

```powershell
wsl --update
wsl --status
wsl --version
wsl -l -v
```

## Step 3：確認 Ubuntu 是 VERSION 2

```powershell
wsl -l -v
```

正常結果範例：

```text
NAME      STATE    VERSION
Ubuntu    Stopped  2
```

若是 VERSION 1：

```powershell
wsl --set-version Ubuntu 2
```

Ubuntu 名稱要以 `wsl -l -v` 的實際名稱為準。

## Step 4：第一次開啟 Ubuntu

從開始功能表開啟 Ubuntu。

第一次會要求建立：

- Linux username
- Linux password

這組密碼只用於 Ubuntu 的 `sudo`，不是 Windows 密碼。輸入 Linux 密碼時畫面不會顯示星號，這是正常的。

使用者名稱建議：

- 小寫英文
- 不使用空格
- 不使用中文

## Step 5：更新 Ubuntu

在 Ubuntu 執行：

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y build-essential curl git unzip zip jq ca-certificates
```

正常結果：

- 沒有 unresolved package error。
- 指令回到 shell prompt。

若看到網路或 DNS 錯誤，先停止，不要一直重試安裝套件。

## Step 6：啟用 systemd

在 Ubuntu 執行：

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

回到 Windows PowerShell：

```powershell
wsl --shutdown
```

重新開啟 Ubuntu後驗證：

```bash
systemctl --version
systemctl is-system-running
```

`systemctl is-system-running` 可能顯示 `running` 或 `degraded`。若是 degraded，先執行：

```bash
systemctl --failed
```

確認是否只是 WSL 中不適用的服務，不要只因 degraded 就重灌。

## Step 7：確認 Windows 路徑

Windows：

```text
D:\OPC
```

WSL2 對應：

```text
/mnt/d/OPC
```

在 Ubuntu 測試：

```bash
ls -la /mnt/d/OPC
printf 'wsl-ok\n' > /mnt/d/OPC/workspace/wsl-test.txt
cat /mnt/d/OPC/workspace/wsl-test.txt
```

## 路徑原則

- Windows 需要直接管理的 project、artifact、文件放 `D:\OPC`。
- Linux 高頻 I/O runtime 可放 WSL2 Linux filesystem。
- 同一 repository 不要在 Windows 與 WSL2 各存一份未同步副本。
- 不要直接從 Windows 檔案總管修改 WSL 的 Linux 系統檔案。

## 備份 WSL distribution

在重大變更前，可於 PowerShell 匯出：

```powershell
New-Item -ItemType Directory -Path D:\OPC\backups\wsl -Force | Out-Null
wsl --shutdown
wsl --export Ubuntu D:\OPC\backups\wsl\ubuntu-backup.tar
```

Distribution 名稱要換成實際名稱。匯出檔仍需複製到外部備份。

## 禁止事項

- 執行 `wsl --unregister` 當作一般修復。
- 未匯出備份就刪除 distribution。
- 在 WSL 內再安裝另一套 Docker daemon，卻仍同時使用 Docker Desktop。
- 在 Windows 與 WSL 各維護同一 repository 副本。
- 不知道用途就修改 `/etc/wsl.conf` 其他設定。

## 完成條件

- [ ] `wsl --version` 成功。
- [ ] Ubuntu 顯示 VERSION 2。
- [ ] Ubuntu 套件更新成功。
- [ ] systemd 可使用。
- [ ] `/mnt/d/OPC` 可讀寫。
- [ ] 知道 Linux sudo 密碼。
- [ ] 已了解 `wsl --unregister` 會刪除 distribution。

## 停止條件

- Ubuntu 不是 VERSION 2。
- `apt update` 持續 DNS 失敗。
- `/mnt/d/OPC` 看不到正確資料。
- WSL 啟動後 Windows 反覆藍畫面。
- Distribution 內已有重要資料但尚未 export。

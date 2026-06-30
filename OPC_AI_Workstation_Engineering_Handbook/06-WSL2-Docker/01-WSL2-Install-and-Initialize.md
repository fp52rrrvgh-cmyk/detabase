# 06-WSL2-Docker / 01 WSL2 安裝、初始化與還原演練

## 目標

在 Windows 11 建立穩定的 Ubuntu WSL2，供 Linux CLI、AI runtime 與 Docker Desktop 使用，並證明 distribution 可以匯出與匯入。

## Step 1：確認虛擬化

```text
Ctrl + Shift + Esc
→ 效能
→ CPU
→ 虛擬化：已啟用
```

若不是「已啟用」，先回到 `03-Windows/05-Hyper-V-and-Virtualization.md`，不要繼續。

## Step 2：安裝或更新 WSL

全新安裝，以系統管理員 PowerShell 執行：

```powershell
wsl --install
```

完成後依提示重新開機。

若系統已經安裝 WSL：

```powershell
wsl --update
wsl --status
wsl --version
wsl -l -v
```

不要在既有 distribution 已有資料時，因為安裝問題直接執行 `wsl --unregister`。

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

Distribution 名稱要以 `wsl -l -v` 顯示為準。

## Step 4：第一次開啟 Ubuntu

從開始功能表開啟 Ubuntu，建立：

- Linux username
- Linux password

Linux 密碼只用於 Ubuntu 的 `sudo`，不是 Windows 密碼。輸入密碼時畫面不會顯示星號，這是正常的。

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

若持續出現 DNS 或 repository 錯誤，先停止，不要一直重試安裝套件。

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

重新開啟 Ubuntu 後驗證：

```bash
systemctl --version
systemctl is-system-running
systemctl --failed
```

`systemctl is-system-running` 可能顯示 `running` 或 `degraded`。若是 degraded，先查看 failed service，不要只因 degraded 就重灌。

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

## Step 8：匯出 WSL 備份

先查實際 distribution 名稱：

```powershell
wsl -l -v
```

建立備份目錄並停止 WSL：

```powershell
New-Item -ItemType Directory -Path D:\OPC\backups\wsl -Force | Out-Null
wsl --shutdown
```

匯出：

```powershell
wsl --export Ubuntu D:\OPC\backups\wsl\ubuntu-backup.tar
```

把 `Ubuntu` 換成實際 distribution 名稱。

確認備份：

```powershell
Get-Item D:\OPC\backups\wsl\ubuntu-backup.tar
Get-FileHash D:\OPC\backups\wsl\ubuntu-backup.tar -Algorithm SHA256
```

備份檔必須再複製到外部媒介；放在同一顆 D 槽不算完整備份。

## Step 9：安全匯入演練

不要覆蓋原本的 Ubuntu。匯入成新的測試名稱：

```powershell
$ImportRoot = 'D:\OPC\workspace\wsl-restore-test'
New-Item -ItemType Directory -Path $ImportRoot -Force | Out-Null

wsl --import Ubuntu-Restore-Test `
  $ImportRoot `
  D:\OPC\backups\wsl\ubuntu-backup.tar `
  --version 2
```

驗證：

```powershell
wsl -l -v
wsl -d Ubuntu-Restore-Test -- uname -a
wsl -d Ubuntu-Restore-Test -- sh -lc "test -d /mnt/d/OPC && echo restore-ok"
```

通過條件：

- `Ubuntu-Restore-Test` 顯示 VERSION 2。
- 能啟動並執行 Linux 指令。
- 能看到 `/mnt/d/OPC`。
- 原本 Ubuntu 仍正常存在。

測試完成後，只有確認匯入演練成功且測試 distribution 沒有重要資料，才刪除：

```powershell
wsl --terminate Ubuntu-Restore-Test
wsl --unregister Ubuntu-Restore-Test
Remove-Item $ImportRoot -Recurse -Force
```

這是唯一允許在本章使用 `wsl --unregister` 的情況：目標必須是剛建立、已確認可刪除的測試 distribution。

## Step 10：Docker 衝突檢查

若使用 Docker Desktop，Ubuntu 內不要再維護另一套獨立 Docker Engine。

在 Ubuntu 檢查：

```bash
which docker
systemctl status docker --no-pager
```

判斷：

- `docker` CLI 可由 Docker Desktop integration 提供。
- 如果 `docker.service` 在 Ubuntu 內獨立啟動，代表可能同時存在第二套 daemon。

若發現第二套 daemon，不要同時使用。先停止並依套件來源確認是否應移除，再重新驗證 Docker Desktop integration。

## 禁止事項

- 把 `wsl --unregister` 當作一般修復。
- 未匯出備份就刪除 production distribution。
- 匯入測試時覆蓋原 distribution 名稱。
- 在 WSL 內另裝 Docker Engine，卻同時使用 Docker Desktop。
- 在 Windows 與 WSL 各維護同一 repository 副本。
- 不知道用途就修改 `/etc/wsl.conf` 其他設定。

## 完成條件

- [ ] `wsl --version` 成功。
- [ ] Ubuntu 顯示 VERSION 2。
- [ ] Ubuntu 套件更新成功。
- [ ] systemd 可使用。
- [ ] `/mnt/d/OPC` 可讀寫。
- [ ] 已完成 WSL export。
- [ ] SHA-256 已記錄。
- [ ] 已成功匯入 `Ubuntu-Restore-Test` 並啟動。
- [ ] 原本 Ubuntu 沒有被修改或刪除。
- [ ] 沒有與 Docker Desktop 衝突的第二套 daemon。

## 停止條件

- Ubuntu 不是 VERSION 2。
- `apt update` 持續 DNS 失敗。
- `/mnt/d/OPC` 看不到正確資料。
- WSL 啟動後 Windows 反覆藍畫面。
- Distribution 內已有重要資料但尚未 export。
- 匯出檔為 0 bytes 或 checksum 無法取得。
- 測試匯入無法啟動。

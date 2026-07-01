# 安裝與使用 WSL2

## WSL2 是什麼

WSL2 讓 Windows 裡面可以直接使用 Linux。

你可以把它理解成：

> Windows 是主要工作桌面，WSL2 是裡面的 Linux 工作區。

未來很多 AI、Agent、Docker 與開發工具在 Linux 環境中比較容易運作，所以 OPC 需要它。

---

## 安裝前確認

打開工作管理員：

```text
Ctrl + Shift + Esc
→ 效能
→ CPU
→ 虛擬化
```

如果顯示「已啟用」，可以繼續。

如果沒有，才需要進 BIOS 開啟虛擬化。

---

## 安裝 WSL2

用系統管理員 PowerShell 執行：

```powershell
wsl --install
```

完成後依提示重新開機。

如果原本已經安裝 WSL：

```powershell
wsl --update
wsl --status
wsl --version
wsl -l -v
```

---

## 第一次開啟 Ubuntu

從開始功能表開啟 Ubuntu，建立：

- Linux 使用者名稱
- Linux 密碼

建議使用小寫英文，不使用空格或中文。

輸入 Linux 密碼時畫面不會顯示字元，這是正常的。

---

## 確認 Ubuntu 是 WSL2

```powershell
wsl -l -v
```

正常範例：

```text
NAME      STATE    VERSION
Ubuntu    Stopped  2
```

如果顯示 VERSION 1：

```powershell
wsl --set-version Ubuntu 2
```

實際名稱以 `wsl -l -v` 顯示為準。

---

## 更新 Ubuntu

在 Ubuntu 裡執行：

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y build-essential curl git unzip zip jq ca-certificates
```

只要指令最後回到輸入提示符，且沒有持續出現套件錯誤，就代表完成。

---

## Windows 與 WSL2 的路徑

Windows 路徑：

```text
D:\OPC
```

在 WSL2 裡會看到：

```text
/mnt/d/OPC
```

測試：

```bash
ls -la /mnt/d/OPC
```

如果能看到資料夾內容，就代表 Windows 與 WSL2 可以互相讀取。

---

## 你現在只需要記住的路徑原則

- Windows 主要資料放在 `D:\OPC`。
- WSL2 透過 `/mnt/d/OPC` 讀取同一份資料。
- 不要在 Windows 與 WSL2 各保存一份不同步的同一個專案。
- 不要因為遇到問題就執行 `wsl --unregister`。

`wsl --unregister` 會刪除整個 Linux 環境與其中資料。

---

## Docker 相關提醒

如果使用 Docker Desktop：

> 不需要再在 Ubuntu 裡安裝另一套 Docker Engine。

Docker Desktop 會把 Docker 功能提供給 WSL2 使用。

同時維護兩套 Docker 容易造成混亂。

---

## 完成標準

```powershell
wsl --version
wsl --status
wsl -l -v
```

並在 Ubuntu 執行：

```bash
uname -a
ls -la /mnt/d/OPC
```

只要符合以下條件就完成：

- Ubuntu 顯示 VERSION 2。
- Ubuntu 可以開啟。
- Linux 指令可以執行。
- `/mnt/d/OPC` 可以讀取。

---

## 可選進階項目

以下不是 Phase 1 主線必要條件：

- 啟用或調整 systemd。
- WSL export / import。
- SHA-256 備份驗證。
- 建立 Restore Test distribution。
- 深入調整 `/etc/wsl.conf`。

有實際需求時再閱讀與操作，不需要第一次安裝就全部完成。

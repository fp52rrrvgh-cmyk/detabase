# 06-WSL2-Docker / 03 Windows 與 Linux 路徑策略

## 目標
避免 Windows 與 WSL2 對同一專案產生兩套路徑、兩份依賴與兩個真實來源。

## 路徑對照

```text
Windows: D:\OPC\projects\example
WSL2:    /mnt/d/OPC/projects/example
```

## 採用原則

### 適合放在 `D:\OPC`
- 文件
- PowerShell scripts
- Git repositories
- Artifact
- 共用設定
- 需要 Windows 工具直接存取的內容

### 適合放在 WSL2 Linux filesystem
- 高頻率 Linux build cache
- Linux-only runtime state
- 對 filesystem latency 敏感的 node_modules 或 Python build
- 不需要 Windows 直接編輯的暫時容器資料

## 單一真實來源
同一 repository 只能選一個主要位置。

錯誤做法：

```text
D:\OPC\projects\app
~/projects/app
```

兩邊各改一份，最後無法判斷哪份才是最新。

## VS Code 使用
若專案位於 Windows filesystem，可在 PowerShell 執行：

```powershell
code D:\OPC\projects\example
```

若專案位於 WSL2 filesystem，在 Ubuntu 執行：

```bash
cd ~/projects/example
code .
```

## 權限與換行
- Shell scripts 使用 LF
- PowerShell 可使用 CRLF
- 不用 `sudo` 修改 `/mnt/d/OPC` 內一般專案檔案
- 不讓 root 建立日後由 Windows 使用者無法管理的檔案

## 效能判斷
若 build 或 package install 明顯緩慢，先量測 `/mnt/d` 與 Linux filesystem 的差異，再決定是否遷移。不要同時保留兩份專案作為解法。

## 驗收
- 每個 repository 有唯一主要路徑
- VS Code 使用正確 remote 模式
- Git status 在 Windows 與 WSL2 不出現大量換行變更
- 沒有 root-owned 專案檔案

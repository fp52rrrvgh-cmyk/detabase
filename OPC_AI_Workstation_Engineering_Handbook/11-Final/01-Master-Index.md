# 11-Final / 01 Master Index

## 這份手冊怎麼用

你不要從頭讀完整本。施工時只照本頁順序做。

規則：

1. 一次只做一個步驟。
2. 每一步完成後再進下一步。
3. 看到「停止條件」就停，不要猜。
4. 任何會刪除、格式化、初始化、reset、prune、unregister 的指令，都要先確認備份。
5. 不懂就不要按下一步。

---

# 第一階段：重灌前，先保命

## Step 1：備份與還原測試

先看：

```text
10-Security-Recovery/09-Bare-Metal-Rebuild.md
09-Operations/05-Backup-Operations.md
Runbooks/RUNBOOK-002-Backup-and-Restore.md
```

你要完成：

- [ ] 重要資料已備份到這台電腦以外的位置。
- [ ] 至少抽樣打開一個備份資料夾。
- [ ] 若有 database，至少做一次測試還原。
- [ ] GitHub 上的重要 repo 都已 push。
- [ ] BitLocker recovery key 可以拿到。

沒有完成這些，不進 Windows 安裝。

---

# 第二階段：Windows 11 全新安裝

## Step 2：照 Windows 安裝章節做

先看：

```text
03-Windows/01-Windows-Installation.md
```

只做這一章。不要跳去看別的章節。

你要完成：

- [ ] 確認 Windows 官方安裝 USB。
- [ ] 確認系統 SSD 與資料 SSD 的型號、序號、容量。
- [ ] 優先拔掉資料 SSD，只留系統 SSD 安裝 Windows。
- [ ] 安裝 Windows。
- [ ] 完成 Windows Update。
- [ ] 安裝必要驅動。
- [ ] 接回資料 SSD 後，不初始化、不格式化。

停止條件：

- 看不懂哪顆是系統 SSD。
- BitLocker recovery key 找不到。
- 接回資料 SSD 後 Windows 要你格式化。
- 裝置管理員大量未知裝置。

---

# 第三階段：建立 D:\OPC 工作區

## Step 3：先確認 D 槽，不要急著跑腳本

先看：

```text
04-Storage/02-NTFS-Baseline.md
04-Storage/03-Workspace-Layout.md
```

你要完成：

- [ ] D 槽是正確那顆資料 SSD。
- [ ] D 槽檔案系統是 NTFS。
- [ ] D 槽標籤是 `OPC-DATA`。
- [ ] 若 D 槽已有資料，不執行 Initialize-Disk、Format-Volume。

只有 D 槽確認正確後，才執行：

```powershell
D:\OPC\tools\bootstrap-opc-workspace.ps1
```

若腳本拒絕執行，不要硬改腳本。先回頭檢查磁碟。

---

# 第四階段：安裝開發工具

## Step 4：安裝 Git、GitHub CLI、VS Code、PowerShell

先看：

```text
05-Development/01-Git-Baseline.md
05-Development/02-GitHub-CLI.md
05-Development/03-VS-Code.md
```

最小驗收：

```powershell
git --version
gh --version
code --version
pwsh --version
```

通過後再登入 GitHub：

```powershell
gh auth login
gh auth status
```

---

# 第五階段：WSL2

## Step 5：安裝 Ubuntu WSL2

先看：

```text
06-WSL2-Docker/01-WSL2-Install-and-Initialize.md
06-WSL2-Docker/02-WSLConfig-Resource-Limits.md
```

最小驗收：

```powershell
wsl --version
wsl --status
wsl -l -v
```

Ubuntu 必須是 VERSION 2。

`.wslconfig` 先用保守值。不要一開始加一堆 experimental 設定。

---

# 第六階段：Docker Desktop

## Step 6：安裝 Docker Desktop

先看：

```text
06-WSL2-Docker/04-Docker-Desktop-Install.md
06-WSL2-Docker/05-Docker-Compose-Standard.md
```

最小驗收：

```powershell
docker version
docker info
docker run --rm hello-world
```

禁止：

```text
docker system prune --volumes
Docker Desktop factory reset
wsl --unregister
```

除非你已經備份並且知道自己在刪什麼。

---

# 第七階段：全機驗收

## Step 7：跑驗收腳本

先看：

```text
11-Final/03-Full-System-Acceptance.md
scripts/verify-all.ps1
```

執行：

```powershell
D:\OPC\tools\verify-all.ps1
```

結果規則：

- PASS：可進下一步。
- WARN：看訊息，能理解才繼續。
- FAIL：停下來修，不要跳過。

---

# 第八階段：AI Runtime，最後再做

前面都通過後，才看：

```text
07-AI-Runtime/
08-Bootstrap/
09-Operations/
10-Security-Recovery/
```

AI Runtime 不是重灌當下第一優先。先讓 Windows、D:\OPC、WSL2、Docker、GitHub CLI 正常，再談 Agent。

---

## 完成定義

```text
Windows 正常
+ D:\OPC 正常
+ GitHub CLI 正常
+ WSL2 正常
+ Docker 正常
+ verify-all.ps1 沒有 FAIL
= 可以開始實作 OPC AI Workstation
```

手冊完成不代表工作站完成。工作站只有在實機驗收通過後，才算可以營運。

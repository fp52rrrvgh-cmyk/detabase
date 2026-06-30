# 05-Development / 01 Git 基線

## 目標

建立可追蹤、可恢復、可在重灌後重建的版本控制環境。

## Step 1：安裝 Git

在 PowerShell 7 執行：

```powershell
winget install --id Git.Git -e
```

安裝完成後關閉 PowerShell，再重新開啟。

驗證：

```powershell
git --version
where.exe git
```

正常結果：

- 顯示 Git 版本。
- 路徑通常位於 `C:\Program Files\Git\cmd\git.exe`。

## Step 2：設定使用者身分

```powershell
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_EMAIL"
git config --global init.defaultBranch main
git config --global core.autocrlf false
```

把 `YOUR_NAME` 與 `YOUR_EMAIL` 換成實際資料。

檢查：

```powershell
git config --global --list
```

Email 建議使用 GitHub 帳號對應 Email 或 GitHub noreply Email，避免 commit 顯示成未關聯帳號。

## Step 3：固定 repository 位置

正式專案統一放在：

```text
D:\OPC\projects
```

不要放在：

- Desktop
- Downloads
- OneDrive 同步目錄
- 不確定會不會被清理的暫存資料夾

同一個 repository 不要同時保留 Windows 與 WSL2 兩份未同步副本。

## Step 4：建立測試 repository

```powershell
$TestRepo = 'D:\OPC\workspace\git-test'
New-Item -ItemType Directory -Path $TestRepo -Force | Out-Null
Set-Location $TestRepo
git init
'git test' | Set-Content README.md
git add README.md
git commit -m "Initialize Git test"
git status
```

正常結果：

- 預設分支是 `main`。
- Commit 成功。
- `git status` 顯示 working tree clean。

## Step 5：建立必要 `.gitignore`

每個專案依技術棧設定，但至少不要提交：

```gitignore
.env
.env.*
!.env.example
.venv/
node_modules/
__pycache__/
*.log
```

在 `git add .` 前一定先執行：

```powershell
git status
```

## Step 6：重灌前確認所有重要專案

在每個 repository 執行：

```powershell
git status
git remote -v
git log --oneline --decorate -5
git push
```

通過條件：

- 需要保留的 commit 已 push。
- 沒有未追蹤的重要檔案。
- Remote 指向正確 repository。

## 禁止事項

- 把 API key、password、recovery key 提交 Git。
- 把 `.venv`、`node_modules`、模型與 cache 提交 Git。
- 在不看 `git status` 的情況下執行 `git add .`。
- 用 `git reset --hard` 或 `git clean -fd` 解決不明問題。
- 把正式 repository 放在 Downloads。

## 完成條件

- [ ] `git --version` 成功。
- [ ] Name、Email 與 main 分支設定正確。
- [ ] 測試 commit 成功。
- [ ] 正式 repository 位於 `D:\OPC\projects`。
- [ ] 重要 commit 已 push。
- [ ] Secrets 與可重建目錄不進 Git。

## 停止條件

- Commit 顯示身分不正確。
- Remote 指向錯誤帳號或 repository。
- `git status` 出現大量不明刪除。
- Push 前發現 secrets 已被加入 staging。

遇到以上情況，先停止 push，修正後再繼續。
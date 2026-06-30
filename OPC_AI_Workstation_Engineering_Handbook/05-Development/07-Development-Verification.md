# 05-Development / 07 開發環境驗收

## 使用方式

在 PowerShell 7 逐步執行。任何一項 FAIL，都先修正再進 WSL2 / Docker。

## Step 1：Git

```powershell
git --version
git config --global user.name
git config --global user.email
git config --global init.defaultBranch
```

通過條件：

- [ ] Git 可執行。
- [ ] Name 與 Email 正確。
- [ ] Default branch 是 main。

建立測試 commit：

```powershell
$Path = 'D:\OPC\workspace\verify-git'
New-Item -ItemType Directory -Path $Path -Force | Out-Null
Set-Location $Path
git init
'verify' | Set-Content README.md
git add README.md
git commit -m 'Verify Git environment'
git status
```

`git status` 應顯示 working tree clean。

## Step 2：GitHub CLI

```powershell
gh --version
gh auth status
gh api user --jq '.login'
gh repo list --limit 10
```

通過條件：

- [ ] 登入帳號正確。
- [ ] 可以列出 repository。
- [ ] 沒有明文 token。

## Step 3：VS Code

```powershell
code --version
code D:\OPC\projects
```

通過條件：

- [ ] VS Code 可啟動。
- [ ] 可以開啟 `D:\OPC\projects`。
- [ ] 沒有開啟錯誤的 OneDrive 或 Downloads 專案副本。

## Step 4：Python / uv

```powershell
python --version
uv --version
```

建立測試專案：

```powershell
Set-Location D:\OPC\workspace
uv init verify-python
Set-Location .\verify-python
uv add requests
uv run python -c "import requests; print('python-ok')"
```

測試重建：

```powershell
Remove-Item .venv -Recurse -Force
uv sync
uv run python -c "import requests; print('python-rebuild-ok')"
```

通過條件：

- [ ] 兩次執行都成功。
- [ ] `.venv` 可刪除後重建。
- [ ] `.venv` 不進 Git。

## Step 5：Node / pnpm

```powershell
node --version
pnpm --version
```

建立測試專案：

```powershell
Set-Location D:\OPC\workspace
New-Item -ItemType Directory -Path verify-node -Force | Out-Null
Set-Location .\verify-node
pnpm init
pnpm add zod
```

建立並執行測試：

```powershell
@'
import { z } from "zod";
console.log(z.string().parse("node-ok"));
'@ | Set-Content index.mjs
node index.mjs
```

測試重建：

```powershell
Remove-Item node_modules -Recurse -Force
pnpm install --frozen-lockfile
node index.mjs
```

通過條件：

- [ ] 兩次都顯示 node-ok。
- [ ] `node_modules` 可刪除後重建。
- [ ] `node_modules` 不進 Git。

## Step 6：Secrets

在測試或正式 repository 執行：

```powershell
git status
```

確認：

- [ ] `.env` 不在 staging。
- [ ] `.env.example` 只有 placeholder。
- [ ] PowerShell profile 不含 API key。
- [ ] Repository 不含 token、password、BitLocker recovery key。

## Step 7：執行總驗收

```powershell
.\scripts\verify-all.ps1
```

這時 WSL2 與 Docker 尚未安裝的話，相關項目會 FAIL；開發工具項目必須 PASS。

## 最終判定

```text
Git PASS
+ GitHub CLI PASS
+ VS Code PASS
+ Python / uv 可重建
+ Node / pnpm 可重建
+ Secrets 未進 Git
= DEVELOPMENT PASS
```

任一項失敗，不要進入自動化 Bootstrap 或 AI Runtime。
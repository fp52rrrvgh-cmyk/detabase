# 05-Development / 02 GitHub CLI

## 目標

讓你能從終端機登入 GitHub、clone repository、查看 issue 與 PR，而且不把 token 寫進腳本。

## Step 1：安裝 GitHub CLI

```powershell
winget install --id GitHub.cli -e
```

關閉並重新開啟 PowerShell 7。

驗證：

```powershell
gh --version
where.exe gh
```

## Step 2：登入 GitHub

```powershell
gh auth login
```

建議選擇：

```text
GitHub.com
HTTPS
Login with a web browser
```

畫面會顯示一次性代碼與瀏覽器登入流程。不要把代碼傳給別人。

## Step 3：確認登入狀態

```powershell
gh auth status
gh api user --jq '.login'
```

正常結果：

- 顯示已登入 GitHub.com。
- `gh api user` 顯示正確帳號。

如果帳號不對：

```powershell
gh auth logout
gh auth login
```

## Step 4：確認 repository 權限

```powershell
gh repo list --limit 20
```

確認能看到自己的 repository。

測試 clone：

```powershell
Set-Location D:\OPC\workspace
gh repo clone OWNER/REPO github-cli-test
```

把 `OWNER/REPO` 換成實際 repository。

進入後確認：

```powershell
Set-Location .\github-cli-test
git remote -v
git status
```

測試完成後，只有確定沒有未保存資料才能刪除測試目錄。

## 常用讀取指令

```powershell
gh issue list
gh pr list
gh pr view NUMBER
gh pr checks NUMBER
gh repo view --web
```

## 權限原則

- 優先使用 `gh auth login`。
- 不把 Personal Access Token 寫進腳本、README 或 `.env.example`。
- Agent 不應預設取得所有 repository 寫入權限。
- Merge、delete、release、改 branch protection 等操作需要人工確認。
- 公共電腦或暫時環境使用完要 logout。

## 重灌前確認

GitHub CLI 登入狀態本身不需要備份。重灌後重新執行 `gh auth login` 即可。

真正要確認的是：

- 重要 commit 已 push。
- Repository remote 正確。
- 帳號的 2FA 或 passkey 可用。
- Recovery codes 安全保存，但不放進 GitHub repository。

## 完成條件

- [ ] `gh --version` 成功。
- [ ] `gh auth status` 顯示正確帳號。
- [ ] 可以列出自己的 repository。
- [ ] 可以 clone 測試 repository。
- [ ] 沒有明文 token。

## 停止條件

- 登入到錯誤 GitHub 帳號。
- Clone 到來源不明的 repository。
- Git remote 指向錯誤 owner。
- 終端機或腳本出現明文 token。

遇到以上狀況，先登出、移除明文憑證，再重新登入。
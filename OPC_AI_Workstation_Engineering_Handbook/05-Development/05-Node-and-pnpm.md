# 05-Development / 05 Node.js 與 pnpm

## 目標

建立可重建的 JavaScript / TypeScript 環境，避免 npm、yarn、pnpm 與多個 Node 版本互相衝突。

## 固定原則

- 使用 Node.js LTS。
- 專案套件管理器統一使用 pnpm。
- `package.json` 與 lock file 進 Git。
- `node_modules` 不進 Git。
- 不大量安裝全域套件。

## Step 1：安裝 Node.js LTS

```powershell
winget install --id OpenJS.NodeJS.LTS -e
```

關閉並重新開啟 PowerShell。

驗證：

```powershell
node --version
npm --version
where.exe node
```

如果 `where.exe node` 顯示多個來源，先確認是否曾安裝其他 Node 管理器，不要繼續混裝。

## Step 2：啟用 pnpm

先執行：

```powershell
corepack enable
```

再確認：

```powershell
pnpm --version
```

如果 `corepack` 或 `pnpm` 找不到，先重新開 PowerShell；仍失敗時，確認目前 Node LTS 是否包含可用的 Corepack。不要同時用多種方式重複安裝 pnpm。

## Step 3：建立測試專案

```powershell
Set-Location D:\OPC\workspace
New-Item -ItemType Directory -Path example-node -Force | Out-Null
Set-Location .\example-node
pnpm init
pnpm add zod
```

建立測試檔 `index.mjs`：

```powershell
@'
import { z } from "zod";
console.log(z.string().parse("pnpm-ok"));
'@ | Set-Content index.mjs
```

執行：

```powershell
node index.mjs
```

應顯示：

```text
pnpm-ok
```

## Step 4：測試可重建性

先確認目前是測試專案，再執行：

```powershell
Remove-Item node_modules -Recurse -Force
pnpm install --frozen-lockfile
node index.mjs
```

如果可以重新執行，代表依賴可由 lock file 重建。

## Step 5：Git 規則

`.gitignore` 至少包含：

```gitignore
node_modules/
.env
*.log
```

提交：

- `package.json`
- `pnpm-lock.yaml`
- 原始碼

不提交：

- `node_modules`
- `.env`
- Token
- Build cache

## 禁止事項

- 同一專案混用 npm、yarn、pnpm lock file。
- 把 `node_modules` 備份或提交 Git。
- 在不明專案直接執行 install script。
- 把 token 寫入 `.npmrc` 後提交 Git。
- 使用浮動版本卻沒有 lock file。
- 同時安裝多個 Node 版本管理器而沒有明確需求。

## 完成條件

- [ ] `node --version` 顯示 LTS 版本。
- [ ] `pnpm --version` 成功。
- [ ] 測試專案可執行。
- [ ] 刪除 `node_modules` 後可用 lock file 重建。
- [ ] Git status 不包含 `node_modules` 或 secrets。

## 停止條件

- `where.exe node` 顯示多個不明來源。
- `pnpm install --frozen-lockfile` 失敗。
- 專案同時存在多種 lock file。
- 安裝過程要求執行來源不明的高權限腳本。

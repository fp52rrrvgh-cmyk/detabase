# 05-Development / 05 Node.js 與 pnpm

## 目標
建立可重建的 JavaScript / TypeScript 開發環境，避免多個套件管理器與全域套件互相衝突。

## 採用方案
- Node.js 使用 LTS 版本
- 專案套件管理器統一使用 pnpm
- `package.json` 與 lock file 進 Git
- `node_modules` 不進 Git

## 安裝與驗證
安裝 Node.js LTS 後：
```powershell
node --version
npm --version
corepack enable
pnpm --version
```

## 建立測試專案
```powershell
cd D:\OPC\projects
mkdir example-node
cd example-node
pnpm init
pnpm add zod
```

## 規則
- 每個專案固定一個套件管理器
- 不混用 npm、yarn、pnpm lock file
- 避免大量全域安裝套件
- Node 版本需求應寫入專案文件或設定
- CI 與本機使用相同 lock file

## 不建議
- 把 `node_modules` 備份或提交
- 使用未知 install script 而不審查
- 把 token 寫入 `.npmrc` 並提交 Git
- 專案使用浮動版本卻沒有 lock file

## 驗收
- Node 與 pnpm 版本可顯示
- 測試專案可安裝依賴
- 刪除 `node_modules` 後可依 lock file 重建
- Git status 不包含 `node_modules`

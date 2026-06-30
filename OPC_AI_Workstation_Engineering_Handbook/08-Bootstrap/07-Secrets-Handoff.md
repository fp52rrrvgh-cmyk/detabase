# 08-Bootstrap / 07 Secrets Handoff

## 目標

在不把 API key、密碼與 token 寫進 Git、Manifest、log 或 Bootstrap 腳本的前提下，完成必要秘密資訊交接。

## 原則

Bootstrap 只負責：

- 建立需要哪些 secret 的清單
- 建立 `.env.example`
- 檢查 secret 是否存在
- 驗證格式與最小權限
- 將 secret reference 傳給 runtime

Bootstrap 不負責把真實 secret 寫入 repository。

## Secret Inventory

```yaml
required_secrets:
  - name: POSTGRES_PASSWORD
    scope: opc-core
    source: user-or-vault
  - name: GITHUB_TOKEN
    scope: repository-worker
    source: short-lived-credential
  - name: LLM_API_KEY
    scope: model-gateway
    source: user-or-vault
```

## Handoff 流程

```text
列出缺少項目
→ 人工或 Vault 提供
→ 驗證存在但不輸出真值
→ 建立 runtime reference
→ 啟動最小權限 session
→ 驗證可用
```

## Log 脫敏

任何命令輸出都不得包含：

- 完整 token
- 完整 connection string
- Cookie
- Authorization header
- Recovery key

若必須識別，可只顯示末四碼與 hash。

## Rotation

Manifest 應記錄 secret 名稱與用途，不記錄值。Secret 輪替後不應需要修改程式碼，只需更新 secret provider 或本機受保護設定。

## 驗收

- Git 搜尋不到真實 secret。
- Bootstrap log 不顯示 secret。
- 缺少 secret 時明確停止，而不是使用空值啟動。
- 每個 worker 只取得所需 secret。
- Session 結束後短期 credential 失效。
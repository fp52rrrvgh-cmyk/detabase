# 05-Development / 06 環境變數與 Secrets

## 目標
區分一般設定與敏感資訊，避免 API key、密碼與 token 進入 Git、log、artifact 或聊天紀錄。

## 分類

### 一般設定
可放入設定檔並進 Git，例如：
- Port
- Log level
- Feature flag
- Workspace path

### Secrets
不可進 Git，例如：
- API key
- GitHub token
- Database password
- Supabase service role key
- OpenRouter key

## 檔案規則
- `.env.example`：只放變數名稱與 placeholder，可進 Git
- `.env`：放本機值，不進 Git
- 正式 secrets：由 vault 或 secret provider 取得

## `.gitignore`
```gitignore
.env
.env.*
!.env.example
secrets/
```

## 範例
`.env.example`：
```text
OPENAI_API_KEY=replace-me
DATABASE_URL=replace-me
```

## OPC 原則
- 不把 secret 寫入 PowerShell profile
- 不把 secret 寫入 Docker image
- 不把 secret 印進 trace log
- Bootstrap 只建立 reference，不填入真值
- Agent 只取得完成任務所需的最小 secret 範圍

## 驗收
- Git repository 中找不到真實 secret
- `.env` 已被忽略
- `.env.example` 不含真值
- GitHub 與 Docker log 不顯示 token

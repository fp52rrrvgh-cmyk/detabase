# 10-Security-Recovery / 03 Secrets Management

## 目標

建立 Secrets 的建立、保存、存取、輪替、撤銷與稽核流程，避免 API key、密碼與 Recovery Key 散落在 Git、聊天、Log 或設定檔。

## Secrets 分類

### Runtime Secrets

- LLM API key
- Database password
- Redis authentication
- GitHub credential
- External service token

### Recovery Secrets

- BitLocker recovery key
- Vault recovery material
- Backup encryption key
- Emergency administrator credential

### Temporary Secrets

- Session token
- One-time approval token
- Short-lived deployment credential

## 儲存原則

- Git 只保存 secret 名稱與 reference，不保存真值。
- `.env` 只作本機開發用途，且必須被忽略。
- 正式 runtime 應由受控 secret provider 或作業系統保護機制提供。
- Recovery secret 至少保存兩份，且不在同一台電腦。

## 生命週期

```text
Create
→ Approve
→ Store
→ Issue minimum scope
→ Use
→ Audit
→ Rotate
→ Revoke
→ Destroy
```

## 輪替時機

- 人員或 Agent 權限變更
- Repository 或 Log 疑似洩漏
- 第三方服務安全事件
- Token 長期未輪替
- Incident Response 要求
- Scope 過大需要縮小

## 洩漏處理

若 secret 進入 Git：

1. 立即撤銷或輪替。
2. 暫停相關 worker。
3. 確認使用紀錄與外部 side effect。
4. 清理歷史只是後續處理，不能取代撤銷。
5. 建立 incident 與 evidence。

## Log 與 Artifact

必須遮蔽：

- Authorization header
- Connection string password
- Cookie
- API key
- Recovery key

只允許顯示 hash、secret id 或末四碼。

## 驗收

- Repository 掃描找不到真實 secret。
- 每個 secret 有 owner、scope、建立與輪替日期。
- Worker 只取得任務所需 secret。
- Secret 撤銷後舊 session 無法繼續使用。
- Recovery secret 可在主機完全故障時取得。
# RUNBOOK-001：啟動與停止 OPC

## 啟動

1. 確認 Windows 已登入且網路正常。
2. 啟動 Docker Desktop。
3. 執行：

```powershell
cd D:\OPC\runtime\opc-core
docker compose up -d
docker compose ps
```

4. 執行 Doctor：

```powershell
D:\OPC\tools\opc-doctor.ps1
```

5. 只有 Doctor 無 FAIL 才啟動 workers。

## 暫停

```text
停止接收新 Objective
→ Pause queue dispatch
→ 等待 running task 完成或 checkpoint
→ 確認 GPU / CPU 高負載工作停止
```

## 停止

```powershell
cd D:\OPC\runtime\opc-core
docker compose stop
```

停止前必須確認：

- 沒有 database migration
- 沒有正在寫入的 backup
- Running task 已 checkpoint
- Queue 與 durable state 已同步

## 異常停止後

1. 不直接清空 queue。
2. 檢查 pending tasks。
3. 檢查 worker lease。
4. 檢查 database transaction。
5. 執行 Doctor 與 incident 分類。

## 成功條件

- Start 後所有核心服務 healthy。
- Pause 後不領取新任務。
- Stop 後 durable state 保留。
- Resume 不重複已完成副作用。
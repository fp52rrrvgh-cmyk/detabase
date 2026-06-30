# 11-Final / 01 Master Index

## 使用方式

本手冊的施工順序：

1. `00-START-HERE.md`
2. `01-Foundation/`
3. `02-Architecture/`
4. `03-Windows/`
5. `04-Storage/`
6. `05-Development/`
7. `06-WSL2-Docker/`
8. `07-AI-Runtime/`
9. `08-Bootstrap/`
10. `09-Operations/`
11. `10-Security-Recovery/`
12. `11-Final/`
13. `ADR/`
14. `Runbooks/`
15. `scripts/`
16. `templates/`

## 建置主線

```text
Windows 11 Host
→ D:\OPC Workspace
→ WSL2 Ubuntu
→ Docker Desktop
→ PostgreSQL + Redis
→ Workflow Runtime
→ Capability Registry
→ Agent Workers
→ Evidence Layer
→ Operations
→ Security + Recovery
```

## 驗收主線

```text
Windows Verification
→ Storage Verification
→ Development Verification
→ WSL2 / Docker Verification
→ AI Runtime Verification
→ Bootstrap End-to-End Verification
→ Operations Verification
→ Security and Recovery Verification
→ Full-System Acceptance
```

## 真實來源

- 架構決策：`ADR/`
- 操作程序：`Runbooks/`
- 自動化：`scripts/`
- 設定範本：`templates/`
- 當前進度：`00-Roadmap/Progress.md`

## 完成定義

手冊完成不代表工作站已施工完成。工作站只有在所有驗收清單都實際通過、Evidence 已保存、Doctor 無 FAIL 時，才可標記為可營運。
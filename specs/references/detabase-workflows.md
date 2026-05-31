# detabase 工作流

## Schema Migration Workflow

```json
{
  "nodes": [
    {"id": "write_migration", "desc": "撰寫 migration SQL", "depends_on": []},
    {"id": "review_sql", "desc": "審查 SQL 語法與 RLS 一致性", "depends_on": ["write_migration"]},
    {"id": "local_push", "desc": "supabase db push --linked 推送至 staging", "depends_on": ["review_sql"]},
    {"id": "deploy_edge_fn", "desc": "部署受影響的 Edge Functions", "depends_on": ["local_push"]},
    {"id": "verify", "desc": "curl 測試 + SELECT 驗證", "depends_on": ["deploy_edge_fn"]}
  ]
}
```

使用：`python3 ~/.hermes/bin/workflow_engine.py define detabase-migration '<json>'`
啟動：`python3 ~/.hermes/bin/workflow_engine.py start detabase-migration`
推進：`python3 ~/.hermes/bin/workflow_engine.py step <run_id> <node_id>`

## Feature Deploy Workflow

```json
{
  "nodes": [
    {"id": "design_spec", "desc": "設計功能規格與 schema 變更", "depends_on": []},
    {"id": "impl_frontend", "desc": "實作前端頁面與元件", "depends_on": ["design_spec"]},
    {"id": "impl_backend", "desc": "實作 Edge Function", "depends_on": ["design_spec"]},
    {"id": "test_integration", "desc": "整合測試", "depends_on": ["impl_frontend", "impl_backend"]},
    {"id": "build_verify", "desc": "npm run build", "depends_on": ["test_integration"]},
    {"id": "deploy_vercel", "desc": "vercel --prod", "depends_on": ["build_verify"]},
    {"id": "verify_live", "desc": "curl 驗證", "depends_on": ["deploy_vercel"]}
  ]
}
```

# 2026-05-31 Supabase Edge Functions 驗證機制研究報告

## 結論（第一句）

Supabase Edge Functions 共有 5 種驗證方式，專案目前正確使用了其中 2 種（平台 JWT + 自訂共享密鑰），但「自訂共享密鑰」實作並非真正 HMAC，建議升級到 `@supabase/server` 的 `auth: 'secret'` 或複合模式。

---

## 一、驗證機制總覽

### 方式 1: 平台層 JWT 驗證（verify_jwt = true）

| 項目 | 內容 |
|------|------|
| **設定** | `supabase/config.toml` 中 `[functions.xxx] verify_jwt = true`（預設值） |
| **驗證層** | Supabase Gateway（請求抵達 handler 前已驗證） |
| **接受什麼** | `Authorization: Bearer <user_jwt>` |
| **適用場景** | 前端瀏覽器呼叫，使用者已登入 |
| **優點** | 零程式碼、平台層把關、無法繞過、RLS 自動生效 |
| **缺點** | 只認 user JWT，不適用於 service-to-service |

**運作流程：** 前端用 `supabase.functions.invoke('xxx')` → 自動帶上 session JWT → Gateway 驗證 JWT 簽章+期限 → 通過才進 handler。

### 方式 2: `@supabase/server` SDK auth mode（新式推薦）

`@supabase/server` 套件提供 `withSupabase()` 包裝器和 `createSupabaseContext()`，支援多種 auth mode：

| auth mode | 接受的 Header | 取得的 ctx | 適用場景 |
|-----------|--------------|-----------|---------|
| `'user'` | `Authorization: Bearer <jwt>` | `ctx.supabase`（RLS-scoped） | 前端已登入使用者 |
| `'secret'` | `apikey: <secret_key>` | `ctx.supabaseAdmin`（bypass RLS） | service-to-service |
| `'publishable'` | `apikey: <anon_key>` | `ctx.supabase`（RLS-scoped） | 公開唯讀 API |
| `'none'` | 無 | 無 client | webhook、健康檢查 |
| `['user', 'secret']` | 依序嘗試 | `ctx.authMode` 告訴你是哪個 | 雙用途 endpoint |

**命名金鑰支援：** `auth: 'secret:automations'` 只接受你在 Dashboard -> Settings -> API keys 命名為 "automations" 的金鑰。

**環境變數（自動注入，不需手動設）：**
- `SUPABASE_URL` — 專案 URL
- `SUPABASE_SECRET_KEYS` — 命名 secret keys 的 JSON 物件
- `SUPABASE_PUBLISHABLE_KEYS` — 命名 publishable keys 的 JSON 物件
- `SUPABASE_JWKS` — 用來驗證 user JWT 的 JWK Set

```typescript
// auth: 'user' — 前端使用者
import { withSupabase } from 'npm:@supabase/server'

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const { supabase, supabaseAdmin, userClaims, jwtClaims, authMode } = ctx
    // supabase: RLS-scoped to the authenticated user
    return Response.json({ email: ctx.userClaims?.email })
  }),
}

// auth: 'secret' — service-to-service
export default {
  fetch: withSupabase({ auth: 'secret' }, async (_req, ctx) => {
    // ctx.supabaseAdmin bypasses RLS
    return Response.json({ ok: true })
  }),
}

// auth: ['user', 'secret'] — 複合模式
export default {
  fetch: withSupabase({ auth: ['user', 'secret'] }, async (req, ctx) => {
    if (ctx.authMode === 'user') {
      // user call, ctx.supabase is RLS-scoped
    } else {
      // service call, ctx.supabaseAdmin bypasses RLS
    }
    return Response.json({ ok: true })
  }),
}
```

### 方式 3: 自訂共享密鑰（目前專案 AI 函數使用中）

**設定：** `verify_jwt = false`
**實作：** handler 內手動比對自訂 header 值與環境變數

```typescript
// 目前專案的實作（ai-log-finance-activity, ai-search-finance-transactions 等）
const secret = req.headers.get('x-hermes-secret');
const srKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
if (!srKey || (secret !== srKey && secret !== anonKey)) return fail(403, 'Forbidden');
```

### 方式 4: 第三方 webhook 簽章

**設定：** `verify_jwt = false`, `auth: 'none'`
**實作：** handler 內用第三方 SDK 驗證簽章

```typescript
export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    const signature = req.headers.get('stripe-signature') ?? '';
    const body = await req.text();
    stripe.webhooks.constructEvent(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
    // ... business logic
  }),
}
```

### 方式 5: Legacy JWT secret 手動解碼

使用 `SUPABASE_JWT_SECRET` 環境變數手動解碼/驗證 JWT。Supabase 官方已建議轉用 `@supabase/server` SDK 替代。

---

## 二、專案現狀分析

### 現有函數驗證方式對照

| 函數 | verify_jwt | Header 驗證 | 實際驗證方式 |
|------|-----------|-------------|------------|
| `log-finance-activity` | `true` | `Authorization: Bearer <jwt>` | 平台 JWT + handler 內用 token 呼叫 REST API |
| `void-finance-activity` | `true` | `Authorization: Bearer <jwt>` | 平台 JWT |
| `set-budget` | `true` | `Authorization: Bearer <jwt>` | 平台 JWT |
| `classify-transaction` | `true` | `Authorization: Bearer <jwt>` | 平台 JWT |
| `ai-search-finance-transactions` | `false` | `x-hermes-secret` | 自訂共享密鑰（比對 SR_KEY / ANON_KEY） |
| `ai-log-finance-activity` | `false` | `x-hermes-secret` | 自訂共享密鑰（比對 SR_KEY / ANON_KEY） |
| `ai-get-user-refs` | `false` | `x-hermes-secret` | 自訂共享密鑰（比對 SR_KEY / ANON_KEY） |
| `ai-modify-finance-activity` | `false` | `x-hermes-secret` | 自訂共享密鑰（比對 SR_KEY / ANON_KEY） |
| `ai-finance-daily-digest` | `false` | `x-hermes-secret` | 自訂共享密鑰（比對 SR_KEY / ANON_KEY） |
| `ai-process-subscriptions` | `false` | `x-hermes-secret` | 自訂共享密鑰（比對 SR_KEY / ANON_KEY） |
| `test-env` | `false` | `x-hermes-secret` | 自訂共享密鑰（比對 SR_KEY / ANON_KEY） |

### 現狀優點
- **前端函數**：驗證正確、安全，使用平台層 JWT 驗證 + RLS，是最佳實務
- **AI 函數**：`verify_jwt = false` 是正確的（因為小馬沒有 user JWT）
- 共享密鑰透過環境變數隔離，沒有 hardcode

### 現狀問題
1. **共享密鑰太寬鬆** — 接受 SR_KEY 或 ANON_KEY，且無區分不同呼叫者
2. **不是真正 HMAC** — 只是純字串比對，沒有基於請求內容的簽章（沒有防止 replay attack）
3. **沒有整合 `@supabase/server`** — 所有 handler 都是手動寫的 `Deno.serve()`，沒有用 `withSupabase`
4. **`log-finance-activity` 手動客製 auth** — handler 內自己 parse `Authorization` header、自己 call REST API，沒有用 Supabase client

---

## 三、推薦方案

### 場景 1: 前端函數（保留現狀 + 逐步升級）

**推薦：** 維持 `verify_jwt = true`，這是平台層最安全的做法。

**可選升級：** 引入 `@supabase/server` 的 `withSupabase({ auth: 'user' })` 取代手動 parse `Authorization` header + 手動 call REST API 的模式。這可以讓 handler 直接拿到 `ctx.supabase`（自動 RLS-scoped client），減少 boilerplate。

### 場景 2: AI/內部函數 — 建立專屬 Secret Key

**推薦：** 使用 Supabase Dashboard -> Settings -> API keys，新增一個命名為 `"hermes-agent"` 的 secret key。

**做法：**
1. 在 Dashboard 新增 secret key，命名為 `hermes-agent`
2. 把那組 key 設定為小馬環境的 `SUPABASE_HERMES_KEY`
3. 在 Edge Function 中用 `@supabase/server` 的 `auth: 'secret:hermes-agent'` 驗證

```typescript
import { withSupabase } from 'npm:@supabase/server'

export default {
  fetch: withSupabase({ auth: 'secret:hermes-agent' }, async (_req, ctx) => {
    // ctx.supabaseAdmin bypasses RLS
    // 只接受名為 hermes-agent 的 secret key
  }),
}
```

**優點：**
- 不再暴露 SR_KEY / ANON_KEY 給小馬
- 可獨立輪替，不影響其他服務
- 命名金鑰在 Supabase Dashboard 可管理

### 場景 3: 未來雙用途函數（不建議現在做）

如果未來有函數需要同時接受「前端使用者」和「小馬呼叫」，可以用複合模式：

```typescript
export default {
  fetch: withSupabase({ auth: ['user', 'secret:hermes-agent'] }, async (req, ctx) => {
    if (ctx.authMode === 'user') {
      // RLS-scoped to user
    } else {
      // service role
    }
  }),
}
```

---

## 四、對比表

| 方案 | 安全等級 | 實作成本 | 適用場景 | 適合我們？ |
|------|---------|---------|---------|-----------|
| `verify_jwt = true` (平台 JWT) | ⭐⭐⭐⭐⭐ | 零成本 | 前端使用者 | ✅ 已用，續用 |
| `auth: 'user'` (@supabase/server) | ⭐⭐⭐⭐⭐ | 低（換 wrapper） | 前端使用者 + 減少手動 auth code | ⏳ 可逐步升級 |
| `auth: 'secret:命名'` | ⭐⭐⭐⭐ | 低（建立金鑰+換 wrapper） | AI/內部 service-to-service | ✅ **建議 AI 函數升級至此** |
| `auth: ['user', 'secret']` | ⭐⭐⭐⭐⭐ | 低 | 雙用途 endpoint | ⏳ 有需求時再用 |
| 自訂共享密鑰（現狀） | ⭐⭐⭐ | 已實作 | AI/內部呼叫 | ⏳ 可保留但建議升級 |
| 第三方 webhook 簽章 | ⭐⭐⭐⭐⭐ | 依 provider | Stripe/GitHub webhook | ❌ 目前無需求 |
| Legacy JWT secret | ⭐⭐ | 高 | 相容舊專案 | ❌ 官方已 deprecated |

---

## 五、下一步建議

1. **立即行動：** 在 Supabase Dashboard 為 detabase-staging 新增一個名為 `hermes-agent` 的 secret key
2. **短程：** 將小馬的 `.env` 中的 `SUPABASE_SERVICE_ROLE_KEY` 替換為這組新金鑰
3. **中程：** 將 AI 函數逐步改用 `@supabase/server` 的 `withSupabase({ auth: 'secret:hermes-agent' })`
4. **長期：** 前端函數也可考慮用 `withSupabase({ auth: 'user' })` 統一 auth 模式，減少手動 auth code

---

## 來源

| 來源 | 結論 | 可信度 |
|------|------|--------|
| https://supabase.com/docs/guides/functions/auth | 官方文檔，auth mode 完整介紹 | 官方文檔 |
| 專案 `supabase/config.toml` | 現有函數的 verify_jwt 設定 | 原始碼 |
| 專案 `supabase/functions/ai-log-finance-activity/index.ts` | 現有自訂共享密鑰實作 | 原始碼 |
| 專案 `supabase/functions/log-finance-activity/index.ts` | 現有 JWT + 手動 REST 實作 | 原始碼 |
| 專案 `supabase/functions/ai-search-finance-transactions/index.ts` | 現有共享密鑰實作（含 ANON_KEY 回退） | 原始碼 |
| CLAUDE.md | 專案技術棧與函數列表 | 專案配置 |

---

## 待確認（assumption）

- `@supabase/server` 是否完全相容目前專案的 Deno 版本？需要 `import map` 或 `npm:` 前置詞
- Supabase Dashboard 上「命名 secret key」功能是否在 Team/Pro 方案都有？（目前 staging 方案未知）
- 目前 `log-finance-activity` 使用手動 REST call 而非 Supabase client，轉換為 `@supabase/server` 後需要改寫 DB 存取方式

#!/bin/bash
PUBKEY=$(grep PUBLISHABLE_KEY ~/detabase/apps/web/.env.local | cut -d= -f2)

curl -v --max-time 15 \
  -X POST "https://ghtmqbbubcezbjgufpit.supabase.co/functions/v1/set-budget" \
  -H "Content-Type: application/json" \
  -H "apikey: $PUBKEY" \
  -H "Authorization: Bearer ***  -d '{"category_id":"00000000-0000-0000-0000-000000000000","budget_year":2026,"budget_month":5,"limit_amount":10000}' 2>&1
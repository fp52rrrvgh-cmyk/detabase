#!/usr/bin/env python3
"""Test set-budget function with real auth session."""
import json
import os
import urllib.request, urllib.error

env_path = os.path.expanduser("~/detabase/apps/web/.env.local")
with open(env_path) as f:
    env = {}
    for line in f:
        if "=" in line:
            k, v = line.strip().split("=", 1)
            env[k] = v

pubkey = env.get("PUBLISHABLE_KEY")
func_url = env.get("FUNCTION_URL")

# Build set-budget URL the same way the frontend does
import re
set_budget_url = re.sub(r"/functions/v1/.*$", "/functions/v1/set-budget", func_url)
print(f"set-budget URL: {set_budget_url}")
print(f"pubkey prefix: {pubkey[:15] if pubkey else 'N/A'}")

if not set_budget_url.startswith("http"):
    set_budget_url = "https:" + set_budget_url

print(f"Final URL: {set_budget_url}")

# Test without auth to check function responsiveness
req = urllib.request.Request(
    set_budget_url,
    data=json.dumps({"test": True}).encode(),
    headers={
        "Content-Type": "application/json",
        "apikey": pubkey,
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(f"HTTP {resp.status}: {resp.read().decode()[:200]}")
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode()[:200]}")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")

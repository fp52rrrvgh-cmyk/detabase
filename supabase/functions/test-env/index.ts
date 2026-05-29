const HMAC_HEADER = "x-hermes-secret";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Only POST", { status: 405 });

  const secret = req.headers.get(HMAC_HEADER);
  const srKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!srKey || (secret !== srKey && secret !== anonKey)) {
    return new Response(JSON.stringify({ ok: false, error: { code: "FORBIDDEN", message: "Forbidden" } }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  // Only return metadata, never return the actual key value
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const hasSrKey = !!srKey;
  const hasAnonKey = !!anonKey;

  return new Response(
    JSON.stringify({
      ok: true,
      env: {
        hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
        hasSrKey,
        srKeyLength: hasSrKey ? srKey!.length : 0,
        hasAnonKey,
        hasHermesSecret: !!Deno.env.get("HERMES_WRITE_SECRET"),
        hasDetabaseEnv: !!Deno.env.get("DETABASE_ENVIRONMENT"),
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
});

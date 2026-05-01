export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json_body" }, 400);
  }

  const { url, query, schema } = payload || {};
  if (!url || !query) {
    return json({ ok: false, error: "missing_url_or_query" }, 400);
  }

  try {
    new URL(url);
  } catch {
    return json({ ok: false, error: "invalid_url" }, 400);
  }

  if (!env.N8N_WEBHOOK_URL) {
    return json({ ok: false, error: "server_misconfigured" }, 500);
  }

  const res = await fetch(env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.N8N_WEBHOOK_SECRET ? { "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET } : {}),
    },
    body: JSON.stringify({ url, query, schema: schema || null }),
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

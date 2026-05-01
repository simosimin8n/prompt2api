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

  let res;
  try {
    res = await fetch(env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.N8N_WEBHOOK_SECRET ? { "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({ url, query, schema: schema || null }),
    });
  } catch (e) {
    return json({ ok: false, error: "n8n_unreachable", detail: String(e) }, 502);
  }

  const text = await res.text();

  if (!res.ok) {
    return json({
      ok: false,
      error: "n8n_error",
      status: res.status,
      detail: text.slice(0, 500),
    }, 502);
  }

  if (!text) {
    return json({
      ok: false,
      error: "n8n_empty_response",
      hint: "Workflow may not be active, or no Respond to Webhook node fired.",
    }, 502);
  }

  try {
    JSON.parse(text);
  } catch {
    return json({
      ok: false,
      error: "n8n_non_json_response",
      detail: text.slice(0, 500),
    }, 502);
  }

  return new Response(text, {
    status: 200,
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

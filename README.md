# web2api

Paste a URL + plain-English query, get back clean JSON. Frontend on Cloudflare Pages, AI extraction in n8n.

## Architecture

```
browser → Cloudflare Pages (static) → Pages Function /api/scrape → n8n webhook → Mistral (or OpenRouter fallback) → JSON
```

## Setup

### 1. n8n workflow

1. Import [n8n-workflow.json](n8n-workflow.json) into your n8n instance.
2. Create two credentials:
   - **Mistral Cloud API** — paste your key from [console.mistral.ai](https://console.mistral.ai). Attach to the `Mistral Chat Model` node.
   - **OpenAI API** (used for OpenRouter) — set the API key to your OpenRouter key from [openrouter.ai](https://openrouter.ai), and set the **Base URL** to `https://openrouter.ai/api/v1`. Attach to the `OpenRouter Chat Model` node.
3. Activate the workflow. Copy the production webhook URL (e.g. `https://your-n8n.example.com/webhook/scrape`).

The workflow:
- Receives `{ url, query, schema? }` via POST
- Fetches the URL with a normal HTTP Request (no JS rendering yet)
- Strips scripts/styles/tags, truncates to 30k chars
- Runs a **Basic LLM Chain** with the Mistral `mistral-small-latest` model and `response_format: json_object`
- On error, the chain's error output routes to a second LLM Chain using OpenRouter's `google/gemini-2.5-flash`
- Returns `{ ok, data, source }`

### 2. Cloudflare Pages

1. Push this repo to GitHub.
2. In Cloudflare → Pages → Create → connect repo.
3. Build settings:
   - Build command: *(none)*
   - Build output directory: `public`
4. After first deploy, go to **Settings → Environment variables** and add:
   - `N8N_WEBHOOK_URL` = your webhook URL from step 1
   - `N8N_WEBHOOK_SECRET` *(optional)* = a shared secret; if set, Pages forwards it as `X-Webhook-Secret` and you can validate it in n8n
5. Redeploy so the function picks up env vars.

### 3. Use it

- Open `https://your-site.pages.dev`
- Or call the API directly from your other apps:

```js
const res = await fetch('https://your-site.pages.dev/api/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://news.ycombinator.com',
    query: 'top 10 story titles with their points and comment counts',
    schema: { stories: [{ title: 'string', points: 'number', comments: 'number' }] }
  })
});
const { data } = await res.json();
```

## Files

- [public/index.html](public/index.html) — frontend form
- [functions/api/scrape.js](functions/api/scrape.js) — Pages Function proxy
- [n8n-workflow.json](n8n-workflow.json) — importable n8n workflow

## Roadmap

- Headless browser fallback (Browserless / ScrapingBee) for JS-heavy sites
- Cache results by `hash(url + query)` in Cloudflare KV
- Per-token rate limiting at the Pages Function layer
- Auth: API keys stored in KV, validated in the function

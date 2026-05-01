# web2api

Paste a URL + plain-English query, get back clean JSON. Frontend on Cloudflare Pages, AI extraction in n8n.

## Architecture

```
browser → Cloudflare Pages (static) → Pages Function /api/scrape → n8n webhook → Mistral (or OpenRouter fallback) → JSON
```

## Setup


The workflow:
- Receives `{ url, query, schema? }` via POST
- Fetches the URL with a normal HTTP Request (no JS rendering yet)
- Strips scripts/styles/tags, truncates to 30k chars
- Runs a **Basic LLM Chain** with the Mistral `mistral-small-latest` model and `response_format: json_object`
- On error, the chain's error output routes to a second LLM Chain using OpenRouter's `google/gemini-2.5-flash`
- Returns `{ ok, data, source }`


### 3. Use it

- Open `https://prompt2api.pages.dev/`
- Or call the API directly from your other apps:

```js
const res = await fetch('https://https://prompt2api.pages.dev/api/scrape', {
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
```curl
curl -sX POST https://prompt2api.pages.dev/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://news.ycombinator.com",
    "query": "top 5 stories",
    "schema": {"stories":[{"title":"string","points":"number"}]}
  }' | jq
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

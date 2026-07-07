# Live flight fares (optional serverless proxy)

GitHub Pages only serves static files, so it can't call a paid flight API directly
(the API key would be exposed and browsers are blocked by CORS). This tiny
**Cloudflare Worker** solves that: it keeps your API key as a secret, calls
[Amadeus](https://developers.amadeus.com/) (free Self-Service tier), and returns
the cheapest round-trip fare to Chicago with CORS headers the site can use.

The app works fine **without** this — the "Flying into Chicago?" card shows a
seasonal ballpark and a Google Flights link. Deploy this only if you want real
fares shown inline.

## 1. Get free Amadeus keys (~3 min)
1. Sign up at <https://developers.amadeus.com/> → **Self-Service**.
2. Create an app → copy the **API Key** (client id) and **API Secret**.
   - The free tier includes a monthly quota against the **production** API
     (`api.amadeus.com`). The **test** API (`test.api.amadeus.com`) has limited,
     cached data — fine for trying it out.

## 2. Deploy the Worker (~2 min)
Requires Node. From this `serverless/` folder:

```bash
npm i -g wrangler          # or: npx wrangler ...
wrangler login             # opens Cloudflare (free account)
wrangler secret put AMADEUS_CLIENT_ID       # paste your API Key
wrangler secret put AMADEUS_CLIENT_SECRET   # paste your API Secret
wrangler deploy
```

Wrangler prints a URL like `https://capitols-flight-price.<you>.workers.dev`.
Quick test:

```
https://capitols-flight-price.<you>.workers.dev/?from=LAX&depart=2026-07-10&return=2026-07-13
→ {"origin":"LAX","destination":"CHI","price":312,"currency":"USD","airline":"AA"}
```

## 3. Point the app at it
In `src/tripApp.js`, set:

```js
const FLIGHT_ENDPOINT = "https://capitols-flight-price.<you>.workers.dev";
```

Rebuild/redeploy the site. Now picking a **From** city + date shows the cheapest
live fare inline; anything missing/erroring falls back to the ballpark
automatically.

**Tip:** for production, set `ALLOW_ORIGIN` in `wrangler.toml` to your exact site
origin (e.g. `https://louisnot.github.io`) instead of `*`.

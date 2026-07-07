// Cloudflare Worker: live flight-fare proxy for the Trip planner.
// It holds your (free) Amadeus Self-Service API keys as secrets and returns the
// cheapest round-trip fare to Chicago, with CORS so the static site can call it.
//
// Deploy: see serverless/README.md
// Secrets required: AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET
// Optional var:     AMADEUS_BASE (defaults to the production host)

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const from = (url.searchParams.get("from") || "").trim();
    const to = (url.searchParams.get("to") || "CHI").trim().toUpperCase(); // CHI = Chicago metro (ORD+MDW)
    const depart = url.searchParams.get("depart");
    const ret = url.searchParams.get("return");
    if (!from || !depart) return json({ error: "from and depart are required" }, 400, cors);
    if (!env.AMADEUS_CLIENT_ID || !env.AMADEUS_CLIENT_SECRET)
      return json({ error: "server not configured (missing Amadeus secrets)" }, 500, cors);

    const BASE = env.AMADEUS_BASE || "https://api.amadeus.com";
    try {
      // 1) OAuth token (client credentials)
      const tok = await fetch(BASE + "/v1/security/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: env.AMADEUS_CLIENT_ID,
          client_secret: env.AMADEUS_CLIENT_SECRET,
        }),
      }).then((r) => r.json());
      const access = tok && tok.access_token;
      if (!access) return json({ error: "auth failed", detail: tok }, 502, cors);
      const auth = { Authorization: "Bearer " + access };

      // 2) Resolve the origin to an IATA code when the user didn't type one
      let origin = from.toUpperCase();
      if (!/^[A-Z]{3}$/.test(origin)) {
        const loc = await fetch(
          BASE + "/v1/reference-data/locations?subType=AIRPORT,CITY&page%5Blimit%5D=1&keyword=" + encodeURIComponent(from),
          { headers: auth }
        ).then((r) => r.json());
        origin = loc && loc.data && loc.data[0] && loc.data[0].iataCode;
        if (!origin) return json({ error: "origin not found", from }, 404, cors);
      }

      // 3) Cheapest flight offer
      const qs = new URLSearchParams({
        originLocationCode: origin,
        destinationLocationCode: to,
        departureDate: depart,
        adults: "1",
        currencyCode: "USD",
        max: "8",
      });
      if (ret) qs.set("returnDate", ret);
      const offers = await fetch(BASE + "/v2/shopping/flight-offers?" + qs.toString(), { headers: auth }).then((r) => r.json());
      const list = (offers && offers.data) || [];
      if (!list.length) return json({ error: "no offers", origin }, 404, cors);

      let best = null;
      for (const o of list) {
        const p = parseFloat(o.price && o.price.grandTotal);
        if (p && (!best || p < best.price))
          best = { price: Math.round(p), currency: (o.price && o.price.currency) || "USD", airline: (o.validatingAirlineCodes || [])[0] || null };
      }
      return json({ origin, destination: to, ...best }, 200, {
        ...cors,
        "Cache-Control": "public, max-age=1800", // cache 30 min to save API quota
      });
    } catch (e) {
      return json({ error: String(e) }, 500, cors);
    }
  },
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...headers } });
}

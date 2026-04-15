const DEFAULT_UPSTREAM_DOH_URL = "https://cloudflare-dns.com/dns-query";
const DNS_QUERY_PATH = "/dns-query";
const HOP_BY_HOP_AND_PROXY_HEADERS = [
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "connection",
  "host",
  "x-forwarded-for",
  "x-real-ip",
];
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Accept, Content-Type",
};

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

function noContent() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function buildUpstreamRequest(request, env) {
  const incomingUrl = new URL(request.url);

  if (incomingUrl.pathname !== DNS_QUERY_PATH) {
    return { error: jsonError(404, "Only /dns-query is served.") };
  }

  if (request.method === "GET" && !incomingUrl.searchParams.has("dns")) {
    return { error: jsonError(400, "Missing dns query parameter.") };
  }

  const upstreamUrl = new URL(env.UPSTREAM_DOH_URL || DEFAULT_UPSTREAM_DOH_URL);
  upstreamUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  HOP_BY_HOP_AND_PROXY_HEADERS.forEach((header) => headers.delete(header));

  if (!headers.has("accept")) {
    headers.set("accept", "application/dns-message");
  }

  const init = {
    method: request.method,
    headers,
    redirect: "follow",
  };

  if (request.method === "POST") {
    init.body = request.body;
  }

  return { upstreamUrl, init };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return noContent();
    }

    if (request.method !== "GET" && request.method !== "POST") {
      return jsonError(405, "Only GET, POST, and OPTIONS are allowed.");
    }

    const { error, upstreamUrl, init } = buildUpstreamRequest(request, env);

    if (error) {
      return error;
    }

    const upstreamResponse = await fetch(upstreamUrl, init);
    const responseHeaders = new Headers(upstreamResponse.headers);

    Object.entries(CORS_HEADERS).forEach(([name, value]) => {
      responseHeaders.set(name, value);
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};

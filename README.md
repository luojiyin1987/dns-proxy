# dns-proxy

A minimal Cloudflare Worker DoH proxy:

- Clients use `https://dns.example.com/dns-query`
- The Worker accepts standard DoH `GET` and `POST` requests
- The Worker forwards requests to `https://cloudflare-dns.com/dns-query`

## Behavior

- Only serves `/dns-query`
- Supports `GET /dns-query?dns=...`
- Supports `POST /dns-query` and passes the request body through unchanged
- Returns `404` for other paths
- Returns `405` for other methods

## Deployment

1. Install dependencies

```bash
pnpm install
```

2. Log in to Wrangler

```bash
pnpm exec wrangler login
```

3. Set the route in `wrangler.toml` to your target hostname

```toml
[[routes]]
pattern = "dns.example.com"
custom_domain = true
```

Change `pattern` to the hostname you actually want to use.
If `dns.example.com` already has an `A`, `AAAA`, or `CNAME` record, remove it first. Cloudflare Custom Domains will create the required DNS record and TLS certificate automatically.

4. Deploy

```bash
pnpm run deploy
```

Cloudflare's current recommendation is to use `custom_domain = true` so the Worker is attached directly to `dns.example.com`.

## CI

The GitHub Actions workflow uses `pnpm` and runs:

```bash
pnpm run ci
```

## Client Endpoint

DoH endpoint:

```text
https://dns.example.com/dns-query
```

## Verification

GET example:

```bash
curl -i \
  -H 'accept: application/dns-message' \
  'https://dns.example.com/dns-query?dns=AAABAAABAAAAAAAAB2V4YW1wbGUDY29tAAABAAE'
```

POST example:

```bash
curl -i \
  -H 'content-type: application/dns-message' \
  --data-binary @query.bin \
  'https://dns.example.com/dns-query'
```

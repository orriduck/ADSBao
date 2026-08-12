# ADSBao

ADSBao is an open-source React frontend for airport context and live aircraft
tracking. Browser requests use the same-origin API and SSE nearby gateway; all
service implementation and operational configuration live in the private
`adsbao-service` repository.

## Local development

Keep the frontend and private service running separately:

```bash
cd ../ADSBao-Secret-Service/services/adsbao-service && PORT=8082 ./run-local.sh
cd ../ADSBao && pnpm dev
```

For UI-only work, `pnpm debug:local` starts or adopts Vite without requiring
the private service. For API/SSE or private-service work, use:

```bash
pnpm debug:local:service
pnpm debug:local:status
```

The snapshot checks the SPA, a deep link, proxied `/health`, and active debug
endpoints. Validate a visible change in a real browser; for SSE changes, check
the `/events/...` stream frames in DevTools. `/ws` is intentionally retired.

## Checks

```bash
pnpm build
pnpm test
```

The public repository intentionally contains no backend implementation,
database migrations, credentials, or service-provider details. See
[`CLAUDE.md`](CLAUDE.md) for the validation matrix and
[`docs/architecture.md`](docs/architecture.md) for the proxy boundary.

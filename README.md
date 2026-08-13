# ADSBao

ADSBao is an open-source React frontend for airport context and live aircraft
tracking. Browser requests use the same-origin API and SSE nearby gateway; all
service implementation and operational configuration live in the private
`adsbao-service` repository.

## Local development

For a full local frontend/private-service contract, use the adopting launcher:

```bash
pnpm debug:local:service
pnpm debug:local:status
```

For UI-only work, `pnpm debug:local` starts or adopts Vite without requiring
the private service. To run the private service directly while working in its
repository:

```bash
cd ../ADSBao-Secret-Service/services/adsbao-service
go test ./...
PORT=8082 ./run-local.sh
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

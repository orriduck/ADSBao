# ADSBao

ADSBao is an open-source React frontend for airport context and live aircraft
tracking. Browser requests use the same-origin API and WebSocket gateway; all
service implementation and operational configuration live in the private
`adsbao-service` repository.

## Local development

Keep the frontend and private service running separately:

```bash
cd ../ADSBao-Secret-Service/services/adsbao-service && PORT=8082 ./run-local.sh
cd ../ADSBao && pnpm dev
```

Then validate the complete local contract with `pnpm debug:local:status`.

## Checks

```bash
pnpm build
pnpm test
```

The public repository intentionally contains no backend implementation,
database migrations, credentials, or service-provider details.

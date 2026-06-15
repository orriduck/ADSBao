FROM node:22-bookworm-slim AS web-build
WORKDIR /src
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY index.html vite.config.ts tsconfig.json postcss.config.mjs components.json ./
COPY public ./public
COPY src ./src
RUN pnpm run build

FROM golang:1.26-bookworm AS go-build
WORKDIR /src
COPY services/data-service/go.mod services/data-service/go.sum ./
RUN go mod download
COPY services/data-service ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/adsbao-data-service ./cmd/adsbao-data-service

FROM debian:bookworm-slim AS runner
WORKDIR /app
ENV PORT=8080
ENV STATIC_DIR=/app/public
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=go-build /out/adsbao-data-service /app/adsbao-data-service
COPY --from=web-build /src/dist /app/public
EXPOSE 8080
CMD ["/app/adsbao-data-service"]

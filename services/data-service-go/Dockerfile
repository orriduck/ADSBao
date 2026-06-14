FROM golang:1.26-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/adsbao-data-service ./cmd/adsbao-data-service

FROM debian:bookworm-slim AS runner
WORKDIR /app
ENV PORT=8080
COPY --from=build /out/adsbao-data-service /app/adsbao-data-service
EXPOSE 8080
CMD ["/app/adsbao-data-service"]

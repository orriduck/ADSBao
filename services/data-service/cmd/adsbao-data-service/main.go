package main

import (
	"bufio"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/api/realtimeauth"
	"github.com/adsbao/adsbao/services/data-service/internal/api/webapi"
	"github.com/adsbao/adsbao/services/data-service/internal/config"
	"github.com/adsbao/adsbao/services/data-service/internal/httpapi"
	"github.com/adsbao/adsbao/services/data-service/internal/metrics"
	"github.com/adsbao/adsbao/services/data-service/internal/observability"
	"github.com/adsbao/adsbao/services/data-service/internal/providers/adsb"
	"github.com/adsbao/adsbao/services/data-service/internal/providers/flightaware"
	"github.com/adsbao/adsbao/services/data-service/internal/providers/route"
	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
	"github.com/adsbao/adsbao/services/data-service/internal/scheduler"
	"github.com/adsbao/adsbao/services/data-service/internal/ws"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	cfg := config.FromEnv(os.Getenv)
	logForwarder := observability.NewBetterStackLogForwarder(observability.BetterStackLogOptions{
		SourceToken: cfg.BetterStackLogSourceToken,
		Endpoint:    cfg.BetterStackLogsEndpoint,
		ServiceName: cfg.BetterStackServiceName,
		Environment: stringValue(os.Getenv("RAILWAY_ENVIRONMENT_NAME"), "production"),
		Source:      os.Stdout,
	})
	log.SetFlags(0)
	log.SetOutput(logForwarder)

	started := time.Now()
	metricSink := metrics.BetterStackSink(metrics.BetterStackOptions{
		SourceToken: cfg.BetterStackMetricsSourceToken,
		Endpoint:    cfg.BetterStackMetricsEndpoint,
		ServiceName: cfg.BetterStackServiceName,
		Environment: stringValue(os.Getenv("RAILWAY_ENVIRONMENT_NAME"), "production"),
	})
	registryOptions := []metrics.Option{
		metrics.WithSink(metricSink),
		metrics.WithLogSink(logForwarder),
	}
	registry := metrics.New(registryOptions...)
	providerHTTPClient := &http.Client{}
	db := openDatabase(cfg, registry)
	if db != nil {
		defer db.Close()
	}

	remoteFlightAware := flightaware.NewRemoteClient(flightaware.RemoteOptions{
		BaseURL:    cfg.FlightAwareServiceBaseURL,
		Token:      cfg.FlightAwareServiceToken,
		HTTPClient: providerHTTPClient,
	})
	flightAwareByCallsign := disabledFlightAwareFallback
	if cfg.FlightAwareFallbackEnabled && remoteFlightAware.Enabled() {
		flightAwareByCallsign = remoteFlightAware.ByCallsign
	}
	adsbClient := adsb.NewClient(adsb.Options{
		HTTPClient:          providerHTTPClient,
		FlightAwareFallback: flightAwareByCallsign,
	})
	var flightAwareRouteFetcher func(context.Context, string, realtime.MetricsSink) (map[string]any, error)
	if remoteFlightAware.Enabled() {
		flightAwareRouteFetcher = remoteFlightAware.Route
	}
	routeClient := route.NewClient(route.Options{
		HTTPClient:              providerHTTPClient,
		FlightAwareRouteFetcher: flightAwareRouteFetcher,
	})
	polling := scheduler.New(scheduler.Options{
		Fetch: func(input realtime.FetchInput) (realtime.Event, error) {
			ctx := context.Background()
			var event realtime.Event
			var err error
			if input.ChannelType == realtime.ChannelRoute {
				event, err = routeClient.Fetch(ctx, input)
			} else {
				event, err = adsbClient.Fetch(ctx, input)
			}
			return event, err
		},
		MinInterval:       cfg.MinPollInterval,
		MaxInterval:       cfg.MaxPollInterval,
		MaxActiveChannels: cfg.MaxActiveChannels,
		JitterRatio:       cfg.PollJitterRatio,
		Metrics:           registry,
	})
	socketHandler := ws.NewHandler(
		polling,
		registry,
		cfg.AllowedWSOrigins,
		ws.WithMaxSubscriptions(cfg.MaxSocketSubscriptions),
		ws.WithRealtimeAuthSecret(cfg.RealtimeAuthSecret),
	)
	realtimeAuthHandler := realtimeauth.New(
		cfg.RealtimeAuthSecret,
		realtimeauth.StaticAuthChecker{Allow: cfg.FlightAwareAccessEnabled},
		5*time.Minute,
	)
	defaultFeatureFlags := map[string]bool{
		"flightAwareEnabled": cfg.FlightAwareAccessEnabled,
	}
	webAPIHandler := webapi.New(webapi.Options{
		HTTPClient:                providerHTTPClient,
		OpenAIPAPIKey:             cfg.OpenAIPAPIKey,
		OpenAIPBaseURL:            cfg.OpenAIPBaseURL,
		FlightAwareServiceBaseURL: cfg.FlightAwareServiceBaseURL,
		FlightAwareServiceToken:   cfg.FlightAwareServiceToken,
		AircraftFetcher: func(ctx context.Context, input realtime.FetchInput) (realtime.Event, error) {
			return adsbClient.Fetch(ctx, input)
		},
		Metrics: registry,
		Authenticator: webapi.NewClerkAuthenticator(
			providerHTTPClient,
			cfg.ClerkSecretKey,
			cfg.ClerkJWKSURL,
			cfg.ClerkAPIBaseURL,
		),
		UserDataStore: webapi.NewUserDataStore(db, cfg.FeatureFlagsEnvironment, registry),
		FeatureFlags:  defaultFeatureFlags,
	})
	handler := instrumentHTTPHandler(registry, httpapi.New(httpapi.ServerOptions{
		DebugChannels: polling.DebugChannels,
		Uptime:        func() time.Duration { return time.Since(started) },
		WSHandler:     http.HandlerFunc(socketHandler.Handle),
		RealtimeAuth:  realtimeAuthHandler,
		WebAPI:        webAPIHandler,
		FeatureFlags:  defaultFeatureFlags,
		StaticDir:     cfg.StaticDir,
		EnablePprof:   cfg.EnablePprof,
	}))
	server := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go reportMetrics(ctx, registry, started, cfg.MetricsReportInterval, polling.DebugChannels)
	go logForwarder.Run(ctx, cfg.LogsReportInterval)
	serverErr := make(chan error, 1)
	go func() {
		log.Printf("adsbao-data-service listening on :%d", cfg.Port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	select {
	case <-ctx.Done():
	case err := <-serverErr:
		log.Printf("server failed: %v", err)
		stop()
	}
	polling.Dispose()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	registry.RecordDynamic(time.Since(started).Seconds(), polling.DebugChannels())
	if err := registry.Shutdown(shutdownCtx); err != nil {
		log.Printf("metrics shutdown failed: %v", err)
	}
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
	if err := logForwarder.Shutdown(shutdownCtx); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "logs shutdown failed: %v\n", err)
	}
}

func disabledFlightAwareFallback(_ context.Context, _ string, _ realtime.MetricsSink) (adsb.FallbackResult, error) {
	fetchedAt := time.Now().UTC().Format(time.RFC3339Nano)
	return adsb.FallbackResult{
		OK:          false,
		HasPosition: false,
		ErrorType:   "feature_disabled",
		FetchedAt:   fetchedAt,
		Raw: map[string]any{
			"ok":          false,
			"hasPosition": false,
			"errorType":   "feature_disabled",
			"fetchedAt":   fetchedAt,
		},
	}, nil
}

func openDatabase(cfg config.Config, registry *metrics.Metrics) *sql.DB {
	if strings.TrimSpace(cfg.DatabaseURL) == "" {
		return nil
	}
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Printf("postgres init failed: %v", err)
		return nil
	}
	db.SetMaxOpenConns(8)
	db.SetMaxIdleConns(4)
	db.SetConnMaxLifetime(30 * time.Minute)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	started := time.Now()
	if err := db.PingContext(ctx); err != nil {
		if registry != nil {
			registry.RecordDBTransaction("postgres_ping", "error", time.Since(started).Milliseconds())
		}
		log.Printf("postgres ping failed: %v", err)
		_ = db.Close()
		return nil
	}
	if registry != nil {
		registry.RecordDBTransaction("postgres_ping", "success", time.Since(started).Milliseconds())
	}
	return db
}

func instrumentHTTPHandler(registry *metrics.Metrics, next http.Handler) http.Handler {
	if registry == nil {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		recorder := &statusRecordingResponseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		registry.RecordHTTPRequest(r.Method, routeName(r), recorder.status, time.Since(started).Milliseconds())
	})
}

type statusRecordingResponseWriter struct {
	http.ResponseWriter
	status int
	wrote  bool
}

func (w *statusRecordingResponseWriter) Write(p []byte) (int, error) {
	if !w.wrote {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(p)
}

func (w *statusRecordingResponseWriter) WriteHeader(status int) {
	if w.wrote {
		return
	}
	w.wrote = true
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *statusRecordingResponseWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

func (w *statusRecordingResponseWriter) Flush() {
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (w *statusRecordingResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hijacker, ok := w.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, fmt.Errorf("underlying response writer does not support hijacking")
	}
	return hijacker.Hijack()
}

func routeName(r *http.Request) string {
	if r == nil || r.URL == nil {
		return "unknown"
	}
	switch {
	case r.URL.Path == "/ws":
		return "/ws"
	case r.URL.Path == "/health":
		return "/health"
	case r.URL.Path == "/debug/channels":
		return "/debug/channels"
	case strings.HasPrefix(r.URL.Path, "/debug/pprof"):
		return "/debug/pprof"
	case strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/api":
		return "/api/*"
	case strings.Contains(filepath.Ext(r.URL.Path), "."):
		// Static/hashed asset: group by top-level directory
		dir := filepath.Dir(r.URL.Path)
		if dir == "/" || dir == "." {
			return "/*"
		}
		return dir + "/*"
	default:
		return "spa_fallback"
	}
}

func transactionNamePart(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "unknown"
	}
	var b strings.Builder
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '-', r == '_', r == '.', r == ':':
			b.WriteRune(r)
		default:
			b.WriteRune('_')
		}
		if b.Len() >= 80 {
			break
		}
	}
	if b.Len() == 0 {
		return "unknown"
	}
	return b.String()
}

func reportMetrics(ctx context.Context, registry *metrics.Metrics, started time.Time, interval time.Duration, debugChannels func() []realtime.DebugChannel) {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			registry.RecordDynamic(time.Since(started).Seconds(), debugChannels())
			if err := registry.Flush(ctx); err != nil {
				log.Printf("metrics flush failed: %v", err)
			}
		}
	}
}

func stringValue(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

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
	"github.com/newrelic/go-agent/v3/newrelic"
)

func main() {
	cfg := config.FromEnv(os.Getenv)
	logForwarder := observability.NewRelicLogForwarder(observability.NewRelicLogOptions{
		LicenseKey:  cfg.NewRelicLicenseKey,
		Endpoint:    cfg.NewRelicLogsEndpoint,
		AppName:     cfg.NewRelicAppName,
		Environment: stringValue(os.Getenv("RAILWAY_ENVIRONMENT_NAME"), "production"),
		Source:      os.Stdout,
	})
	log.SetFlags(0)
	log.SetOutput(logForwarder)

	nrApp := newRelicApplication(cfg)
	started := time.Now()
	metricSink := metrics.NewRelicSink(metrics.NewRelicOptions{
		LicenseKey: cfg.NewRelicLicenseKey,
		Endpoint:   cfg.NewRelicMetricsEndpoint,
		AppName:    cfg.NewRelicAppName,
	})
	registryOptions := []metrics.Option{
		metrics.WithSink(metricSink),
		metrics.WithLogSink(logForwarder),
	}
	if nrApp != nil {
		registryOptions = append(registryOptions, metrics.WithAPMReporter(nrApp))
	}
	registry := metrics.New(registryOptions...)
	providerHTTPClient := newRelicHTTPClient(nrApp)

	flightAwareFallback := flightaware.NewFallbackClient(flightaware.FallbackOptions{
		Enabled:        cfg.FlightAwareFallbackEnabled,
		ExplicitEnable: true,
		HTTPClient:     providerHTTPClient,
	})
	adsbClient := adsb.NewClient(adsb.Options{
		HTTPClient: providerHTTPClient,
		FlightAwareFallback: func(ctx context.Context, callsign string, sink realtime.MetricsSink) (adsb.FallbackResult, error) {
			return flightAwareFallback.ByCallsign(ctx, callsign, sink)
		},
	})
	routeClient := route.NewClient(route.Options{
		HTTPClient:              providerHTTPClient,
		AirportDirectoryBaseURL: cfg.AirportDirectoryBaseURL,
	})
	polling := scheduler.New(scheduler.Options{
		Fetch: func(input realtime.FetchInput) (realtime.Event, error) {
			ctx, txn := startPollingTransaction(nrApp, input)
			if txn != nil {
				defer txn.End()
			}
			var event realtime.Event
			var err error
			if input.ChannelType == realtime.ChannelRoute {
				event, err = routeClient.Fetch(ctx, input)
			} else {
				event, err = adsbClient.Fetch(ctx, input)
			}
			if err != nil && txn != nil {
				txn.NoticeError(err)
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
	handler := instrumentHTTPHandler(nrApp, httpapi.New(httpapi.ServerOptions{
		DebugChannels: polling.DebugChannels,
		Uptime:        func() time.Duration { return time.Since(started) },
		WSHandler:     http.HandlerFunc(socketHandler.Handle),
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
	if nrApp != nil {
		nrApp.Shutdown(10 * time.Second)
	}
	if err := logForwarder.Shutdown(shutdownCtx); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "logs shutdown failed: %v\n", err)
	}
}

func newRelicApplication(cfg config.Config) *newrelic.Application {
	if strings.TrimSpace(cfg.NewRelicLicenseKey) == "" {
		return nil
	}
	app, err := newrelic.NewApplication(
		newrelic.ConfigAppName(cfg.NewRelicAppName),
		newrelic.ConfigLicense(cfg.NewRelicLicenseKey),
		newrelic.ConfigDistributedTracerEnabled(true),
		newrelic.ConfigAppLogForwardingEnabled(false),
	)
	if err != nil {
		log.Printf("new relic apm init failed: %v", err)
		return nil
	}
	return app
}

func newRelicHTTPClient(app *newrelic.Application) *http.Client {
	if app == nil {
		return &http.Client{}
	}
	return &http.Client{Transport: newrelic.NewRoundTripper(http.DefaultTransport)}
}

func startPollingTransaction(app *newrelic.Application, input realtime.FetchInput) (context.Context, *newrelic.Transaction) {
	if app == nil {
		return context.Background(), nil
	}
	txn := app.StartTransaction("Polling/" + transactionNamePart(string(input.ChannelType)))
	txn.AddAttribute("channel.type", string(input.ChannelType))
	txn.AddAttribute("target.kind", transactionNamePart(input.Target.Kind))
	if input.Target.RouteProvider != "" {
		txn.AddAttribute("route.provider", transactionNamePart(input.Target.RouteProvider))
	}
	return newrelic.NewContext(context.Background(), txn), txn
}

func instrumentHTTPHandler(app *newrelic.Application, next http.Handler) http.Handler {
	if app == nil {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		txn := app.StartTransaction("HTTP " + routeName(r))
		defer txn.End()
		txn.SetWebRequestHTTP(r)
		w = txn.SetWebResponse(w)
		next.ServeHTTP(w, newrelic.RequestWithTransactionContext(r, txn))
	})
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

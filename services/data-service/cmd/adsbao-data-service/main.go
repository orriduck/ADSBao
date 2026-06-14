package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/config"
	"github.com/adsbao/adsbao/services/data-service/internal/httpapi"
	"github.com/adsbao/adsbao/services/data-service/internal/metrics"
	"github.com/adsbao/adsbao/services/data-service/internal/providers/adsb"
	"github.com/adsbao/adsbao/services/data-service/internal/providers/flightaware"
	"github.com/adsbao/adsbao/services/data-service/internal/providers/route"
	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
	"github.com/adsbao/adsbao/services/data-service/internal/scheduler"
	"github.com/adsbao/adsbao/services/data-service/internal/ws"
)

func main() {
	cfg := config.FromEnv(os.Getenv)
	started := time.Now()
	registry := metrics.New()

	flightAwareFallback := flightaware.NewFallbackClient(flightaware.FallbackOptions{
		Enabled:        cfg.FlightAwareFallbackEnabled,
		ExplicitEnable: true,
	})
	adsbClient := adsb.NewClient(adsb.Options{
		FlightAwareFallback: func(ctx context.Context, callsign string, sink realtime.MetricsSink) (adsb.FallbackResult, error) {
			return flightAwareFallback.ByCallsign(ctx, callsign, sink)
		},
	})
	routeClient := route.NewClient(route.Options{})
	polling := scheduler.New(scheduler.Options{
		Fetch: func(input realtime.FetchInput) (realtime.Event, error) {
			if input.ChannelType == realtime.ChannelRoute {
				return routeClient.Fetch(context.Background(), input)
			}
			return adsbClient.Fetch(context.Background(), input)
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
	)
	handler := httpapi.New(httpapi.ServerOptions{
		Metrics:       registry,
		DebugChannels: polling.DebugChannels,
		Uptime:        func() time.Duration { return time.Since(started) },
		WSHandler:     http.HandlerFunc(socketHandler.Handle),
		EnablePprof:   cfg.EnablePprof,
	})
	server := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go func() {
		log.Printf("adsbao-data-service listening on :%d", cfg.Port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server failed: %v", err)
		}
	}()

	<-ctx.Done()
	polling.Dispose()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}

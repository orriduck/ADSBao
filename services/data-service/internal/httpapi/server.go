package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/pprof"
	"strings"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/metrics"
	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

type ServerOptions struct {
	Metrics       *metrics.Metrics
	DebugChannels func() []realtime.DebugChannel
	Uptime        func() time.Duration
	WSHandler     http.Handler
	EnablePprof   bool
}

type Server struct {
	metrics       *metrics.Metrics
	debugChannels func() []realtime.DebugChannel
	uptime        func() time.Duration
	wsHandler     http.Handler
	enablePprof   bool
}

func New(options ServerOptions) *Server {
	uptime := options.Uptime
	if uptime == nil {
		started := time.Now()
		uptime = func() time.Duration { return time.Since(started) }
	}
	debugChannels := options.DebugChannels
	if debugChannels == nil {
		debugChannels = func() []realtime.DebugChannel { return nil }
	}
	return &Server{
		metrics:       options.Metrics,
		debugChannels: debugChannels,
		uptime:        uptime,
		wsHandler:     options.WSHandler,
		enablePprof:   options.EnablePprof,
	}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/ws" && s.wsHandler != nil {
		s.wsHandler.ServeHTTP(w, r)
		return
	}
	if s.enablePprof && strings.HasPrefix(r.URL.Path, "/debug/pprof") {
		s.servePprof(w, r)
		return
	}
	if r.Method == http.MethodGet && r.URL.Path == "/health" {
		s.json(w, http.StatusOK, map[string]any{
			"ok":             true,
			"service":        "adsbao-data-service",
			"uptimeSec":      int64(s.uptime().Seconds() + 0.5),
			"activeChannels": len(s.debugChannels()),
		})
		return
	}
	if r.Method == http.MethodGet && r.URL.Path == "/debug/channels" {
		s.json(w, http.StatusOK, map[string]any{"channels": s.debugChannels()})
		return
	}
	if r.Method == http.MethodGet && r.URL.Path == "/metrics" {
		if s.metrics == nil {
			http.Error(w, "metrics unavailable", http.StatusServiceUnavailable)
			return
		}
		out, err := s.metrics.Render(s.uptime().Seconds(), s.debugChannels())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte(out))
		return
	}
	s.json(w, http.StatusNotFound, map[string]any{"error": "Not found"})
}

func (s *Server) servePprof(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/debug/pprof", "/debug/pprof/":
		pprof.Index(w, r)
	case "/debug/pprof/cmdline":
		pprof.Cmdline(w, r)
	case "/debug/pprof/profile":
		pprof.Profile(w, r)
	case "/debug/pprof/symbol":
		pprof.Symbol(w, r)
	case "/debug/pprof/trace":
		pprof.Trace(w, r)
	default:
		name := strings.TrimPrefix(r.URL.Path, "/debug/pprof/")
		pprof.Handler(name).ServeHTTP(w, r)
	}
}

func (s *Server) json(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

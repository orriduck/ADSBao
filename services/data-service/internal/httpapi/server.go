package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/pprof"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

type ServerOptions struct {
	DebugChannels func() []realtime.DebugChannel
	Uptime        func() time.Duration
	WSHandler     http.Handler
	RealtimeAuth  http.Handler
	WebAPI        http.Handler
	FeatureFlags  map[string]bool
	StaticDir     string
	EnablePprof   bool
}

type Server struct {
	debugChannels func() []realtime.DebugChannel
	uptime        func() time.Duration
	wsHandler     http.Handler
	realtimeAuth  http.Handler
	webAPI        http.Handler
	featureFlags  map[string]bool
	staticDir     string
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
		debugChannels: debugChannels,
		uptime:        uptime,
		wsHandler:     options.WSHandler,
		realtimeAuth:  options.RealtimeAuth,
		webAPI:        options.WebAPI,
		featureFlags:  cloneFeatureFlags(options.FeatureFlags),
		staticDir:     options.StaticDir,
		enablePprof:   options.EnablePprof,
	}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Security headers — set on every response before any early return
	s.setSecurityHeaders(w)

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
	if r.URL.Path == "/api/realtime/auth" && s.realtimeAuth != nil {
		s.realtimeAuth.ServeHTTP(w, r)
		return
	}
	if r.Method == http.MethodGet && r.URL.Path == "/api/feature-flags" {
		s.json(w, http.StatusOK, map[string]any{"flags": s.featureFlags})
		return
	}
	if r.Method == http.MethodGet && r.URL.Path == "/runtime-env.js" {
		s.serveRuntimeEnv(w)
		return
	}
	if strings.HasPrefix(r.URL.Path, "/api/") && s.webAPI != nil {
		s.webAPI.ServeHTTP(w, r)
		return
	}

	// /api/** — never serve index.html, always JSON 404
	if strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/api" {
		s.json(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}

	// Static file serving + SPA fallback
	if s.staticDir != "" {
		s.serveStaticOrSPA(w, r)
		return
	}

	s.json(w, http.StatusNotFound, map[string]any{"error": "Not found"})
}

func (s *Server) serveStaticOrSPA(w http.ResponseWriter, r *http.Request) {
	// Join with staticDir first, then clean — this prevents directory
	// traversal because .. is resolved relative to the static directory.
	cleanStatic := filepath.Clean(s.staticDir)
	fsPath := filepath.Clean(filepath.Join(s.staticDir, r.URL.Path))

	// Resolve symlinks on macOS where /var → /private/var and temp dirs
	// live under /var. Resolve both sides atomically — if either fails,
	// fall back to unresolved versions so prefix checks stay consistent.
	if realStatic, err := filepath.EvalSymlinks(cleanStatic); err == nil {
		if realFsPath, err := filepath.EvalSymlinks(fsPath); err == nil {
			cleanStatic = realStatic
			fsPath = realFsPath
		}
	}

	// Guard against directory traversal
	if !strings.HasPrefix(fsPath, cleanStatic+string(os.PathSeparator)) &&
		fsPath != cleanStatic {
		s.json(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}

	// Try to serve the requested file directly
	info, err := os.Stat(fsPath)
	if err == nil && !info.IsDir() {
		http.ServeFile(w, r, fsPath)
		return
	}

	// Only apply SPA fallback for paths without file extensions (deep links).
	// Hashed/static assets (.js, .css, .png, etc.) must exist or 404.
	cleanPath := filepath.Clean(r.URL.Path)
	if filepath.Ext(cleanPath) == "" {
		indexPath := filepath.Join(s.staticDir, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			http.ServeFile(w, r, indexPath)
			return
		}
	}

	s.json(w, http.StatusNotFound, map[string]any{"error": "Not found"})
}

func (s *Server) setSecurityHeaders(w http.ResponseWriter) {
	w.Header().Set("Origin-Agent-Cluster", "?1")
	w.Header().Set("Permissions-Policy", "tools=(self)")
}

func (s *Server) serveRuntimeEnv(w http.ResponseWriter) {
	payload, err := json.Marshal(publicRuntimeEnv())
	if err != nil {
		s.json(w, http.StatusInternalServerError, map[string]any{"error": "Failed to encode runtime env"})
		return
	}
	w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = fmt.Fprintf(w, "window.__ADSBAO_ENV__ = Object.assign({}, window.__ADSBAO_ENV__, %s);\n", payload)
}

func publicRuntimeEnv() map[string]string {
	siteURL := strings.TrimSpace(os.Getenv("VITE_SITE_URL"))
	if siteURL == "" {
		siteURL = strings.TrimSpace(os.Getenv("ADSBAO_SITE_URL"))
	}
	return map[string]string{
		"VITE_ADSBAO_REALTIME_URL":     strings.TrimSpace(os.Getenv("VITE_ADSBAO_REALTIME_URL")),
		"VITE_CLERK_PUBLISHABLE_KEY":   strings.TrimSpace(os.Getenv("VITE_CLERK_PUBLISHABLE_KEY")),
		"VITE_SITE_URL":                siteURL,
		"VITE_AIRCRAFT_PHOTOS_BASE":    strings.TrimSpace(os.Getenv("VITE_AIRCRAFT_PHOTOS_BASE")),
		"VITE_AIRCRAFT_POSITIONS_BASE": strings.TrimSpace(os.Getenv("VITE_AIRCRAFT_POSITIONS_BASE")),
		"VITE_AIRCRAFT_TRACE_BASE":     strings.TrimSpace(os.Getenv("VITE_AIRCRAFT_TRACE_BASE")),
		"VITE_LOCAL_WEATHER_BASE":      strings.TrimSpace(os.Getenv("VITE_LOCAL_WEATHER_BASE")),
		"VITE_METAR_PROXY_BASE":        strings.TrimSpace(os.Getenv("VITE_METAR_PROXY_BASE")),
	}
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

func cloneFeatureFlags(flags map[string]bool) map[string]bool {
	if len(flags) == 0 {
		return map[string]bool{}
	}
	out := make(map[string]bool, len(flags))
	for key, value := range flags {
		out[key] = value
	}
	return out
}

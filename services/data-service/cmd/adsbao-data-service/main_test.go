package main

import (
	"net/http"
	"net/url"
	"testing"
)

func TestRouteNameKnownEndpoints(t *testing.T) {
	tests := []struct {
		path string
		want string
	}{
		{"/ws", "/ws"},
		{"/health", "/health"},
		{"/debug/channels", "/debug/channels"},
		{"/debug/pprof", "/debug/pprof"},
		{"/debug/pprof/", "/debug/pprof"},
		{"/debug/pprof/cmdline", "/debug/pprof"},
		{"/debug/pprof/profile", "/debug/pprof"},
		{"/debug/pprof/symbol", "/debug/pprof"},
		{"/debug/pprof/trace", "/debug/pprof"},
		{"/debug/pprof/heap", "/debug/pprof"},
	}
	for _, tc := range tests {
		r := &http.Request{URL: &url.URL{Path: tc.path}}
		got := routeName(r)
		if got != tc.want {
			t.Errorf("%s: got %q, want %q", tc.path, got, tc.want)
		}
	}
}

func TestRouteNameApiRoutes(t *testing.T) {
	tests := []string{"/api", "/api/airports", "/api/v1/airports/KBOS", "/api/status"}
	for _, path := range tests {
		r := &http.Request{URL: &url.URL{Path: path}}
		got := routeName(r)
		if got != "/api/*" {
			t.Errorf("%s: got %q, want /api/*", path, got)
		}
	}
}

func TestRouteNameStaticAssets(t *testing.T) {
	// Paths with file extensions are static/hashed assets
	tests := []struct {
		path string
		want string
	}{
		{"/assets/app-abc123.js", "/assets/*"},
		{"/assets/styles.css", "/assets/*"},
		{"/favicon.ico", "/*"}, // root-level asset
		{"/logo.png", "/*"},
	}
	for _, tc := range tests {
		r := &http.Request{URL: &url.URL{Path: tc.path}}
		got := routeName(r)
		if got != tc.want {
			t.Errorf("%s: got %q, want %q", tc.path, got, tc.want)
		}
	}
}

func TestRouteNameSpaFallback(t *testing.T) {
	// Deep links without file extensions → SPA fallback
	tests := []string{"/airport/KBOS", "/airport/ZBAA", "/about", "/settings/profile"}
	for _, path := range tests {
		r := &http.Request{URL: &url.URL{Path: path}}
		got := routeName(r)
		if got != "spa_fallback" {
			t.Errorf("%s: got %q, want spa_fallback", path, got)
		}
	}
}

func TestRouteNameNilSafety(t *testing.T) {
	if got := routeName(nil); got != "unknown" {
		t.Fatalf("nil request: got %q, want unknown", got)
	}
	if got := routeName(&http.Request{}); got != "unknown" {
		t.Fatalf("request with nil URL: got %q, want unknown", got)
	}
}

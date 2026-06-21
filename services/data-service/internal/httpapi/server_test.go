package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

type fakeDebugScheduler struct{}

func (fakeDebugScheduler) DebugChannels() []realtime.DebugChannel {
	return []realtime.DebugChannel{
		{Key: "traffic:center:42.4:-71:40", Channel: "traffic:center:42.4:-71:40", Type: realtime.ChannelTraffic, SubscriberCount: 2, CurrentIntervalMS: 3000},
	}
}

func TestHealthAndDebugEndpoints(t *testing.T) {
	server := New(ServerOptions{
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
		Uptime:        func() time.Duration { return 42 * time.Second },
	})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("health status = %d", rr.Code)
	}
	var health map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &health); err != nil {
		t.Fatalf("health JSON error: %v", err)
	}
	if health["ok"] != true || health["service"] != "adsbao-data-service" || health["activeChannels"] != float64(1) {
		t.Fatalf("health = %#v", health)
	}

	req = httptest.NewRequest(http.MethodGet, "/debug/channels", nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"channel":"traffic:center:42.4:-71:40"`) {
		t.Fatalf("debug response status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestMetricsEndpointIsRemoved(t *testing.T) {
	server := New(ServerOptions{
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
		Uptime:        func() time.Duration { return 42 * time.Second },
	})
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("metrics status = %d", rr.Code)
	}
}

func TestApiRoutesNeverServeIndexHTML(t *testing.T) {
	staticDir := t.TempDir()
	indexPath := filepath.Join(staticDir, "index.html")
	if err := os.WriteFile(indexPath, []byte("<html>SPA</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	server := New(ServerOptions{
		StaticDir:     staticDir,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})
	for _, path := range []string{"/api/anything", "/api/v1/airports/KBOS", "/api/"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rr := httptest.NewRecorder()
		server.ServeHTTP(rr, req)
		if rr.Code != http.StatusNotFound {
			t.Fatalf("%s: got status %d, want 404", path, rr.Code)
		}
		if strings.Contains(rr.Body.String(), "<html>SPA</html>") {
			t.Fatalf("%s: unexpectedly served index.html", path)
		}
		if ct := rr.Header().Get("Content-Type"); !strings.Contains(ct, "application/json") {
			t.Fatalf("%s: Content-Type = %q, want application/json", path, ct)
		}
	}
}

func TestFeatureFlagsEndpoint(t *testing.T) {
	server := New(ServerOptions{
		FeatureFlags: map[string]bool{
			"flightAwareEnabled": true,
		},
	})
	req := httptest.NewRequest(http.MethodGet, "/api/feature-flags", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d", rr.Code)
	}
	var payload struct {
		Flags map[string]bool `json:"flags"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode = %v", err)
	}
	if !payload.Flags["flightAwareEnabled"] {
		t.Fatalf("payload = %#v", payload)
	}
	if rr.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control = %q", rr.Header().Get("Cache-Control"))
	}
}

func TestFeatureFlagsEndpointDelegatesToWebAPI(t *testing.T) {
	server := New(ServerOptions{
		FeatureFlags: map[string]bool{
			"flightAwareEnabled": true,
		},
		WebAPI: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/api/feature-flags" {
				t.Fatalf("path = %q", r.URL.Path)
			}
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			_, _ = w.Write([]byte(`{"flags":{"planeHunterCameraStudio":true}}`))
		}),
	})
	req := httptest.NewRequest(http.MethodGet, "/api/feature-flags", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d", rr.Code)
	}
	var payload struct {
		Flags map[string]bool `json:"flags"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode = %v", err)
	}
	if !payload.Flags["planeHunterCameraStudio"] || payload.Flags["flightAwareEnabled"] {
		t.Fatalf("payload = %#v", payload)
	}
}

func TestRuntimeEnvEndpointServesOnlyPublicConfig(t *testing.T) {
	t.Setenv("VITE_CLERK_PUBLISHABLE_KEY", "pk_test_public")
	t.Setenv("VITE_SITE_URL", "")
	t.Setenv("ADSBAO_SITE_URL", "https://adsbao.test")
	t.Setenv("CLERK_SECRET_KEY", "sk_test_secret")

	server := New(ServerOptions{})
	req := httptest.NewRequest(http.MethodGet, "/runtime-env.js", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d", rr.Code)
	}
	if ct := rr.Header().Get("Content-Type"); !strings.Contains(ct, "application/javascript") {
		t.Fatalf("Content-Type = %q, want JavaScript", ct)
	}
	if rr.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control = %q", rr.Header().Get("Cache-Control"))
	}
	body := rr.Body.String()
	if !strings.Contains(body, "window.__ADSBAO_ENV__") {
		t.Fatalf("body = %q, want runtime env assignment", body)
	}
	if !strings.Contains(body, `"VITE_CLERK_PUBLISHABLE_KEY":"pk_test_public"`) {
		t.Fatalf("body = %q, want public Clerk key", body)
	}
	if !strings.Contains(body, `"VITE_SITE_URL":"https://adsbao.test"`) {
		t.Fatalf("body = %q, want site URL fallback", body)
	}
	if strings.Contains(body, "CLERK_SECRET_KEY") || strings.Contains(body, "sk_test_secret") {
		t.Fatalf("runtime env leaked server-only Clerk secret: %q", body)
	}
}

func TestRealtimeAuthEndpointIsRoutedBeforeApi404(t *testing.T) {
	called := false
	server := New(ServerOptions{
		RealtimeAuth: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
			w.WriteHeader(http.StatusTeapot)
		}),
	})
	req := httptest.NewRequest(http.MethodGet, "/api/realtime/auth?provider=flightaware", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if !called {
		t.Fatal("realtime auth handler was not called")
	}
	if rr.Code != http.StatusTeapot {
		t.Fatalf("status = %d", rr.Code)
	}
}

func TestWebAPIEndpointIsRoutedBeforeApi404(t *testing.T) {
	called := false
	server := New(ServerOptions{
		WebAPI: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
			w.WriteHeader(http.StatusAccepted)
		}),
	})
	req := httptest.NewRequest(http.MethodGet, "/api/search?q=KBOS", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if !called {
		t.Fatal("web API handler was not called")
	}
	if rr.Code != http.StatusAccepted {
		t.Fatalf("status = %d", rr.Code)
	}
}

func TestSpaDeepLinkServesIndexHTML(t *testing.T) {
	staticDir := t.TempDir()
	indexPath := filepath.Join(staticDir, "index.html")
	if err := os.WriteFile(indexPath, []byte("<html>SPA</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	server := New(ServerOptions{
		StaticDir:     staticDir,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})
	req := httptest.NewRequest(http.MethodGet, "/airport/KBOS", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "<html>SPA</html>") {
		t.Fatalf("body = %q, want SPA content", rr.Body.String())
	}
}

func TestStaticAssetServedWhenExists(t *testing.T) {
	staticDir := t.TempDir()
	assetsDir := filepath.Join(staticDir, "assets")
	if err := os.MkdirAll(assetsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	jsFile := filepath.Join(assetsDir, "app-abc123.js")
	if err := os.WriteFile(jsFile, []byte("console.log('hello');"), 0o644); err != nil {
		t.Fatal(err)
	}
	server := New(ServerOptions{
		StaticDir:     staticDir,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})
	req := httptest.NewRequest(http.MethodGet, "/assets/app-abc123.js", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200", rr.Code)
	}
	if strings.TrimSpace(rr.Body.String()) != "console.log('hello');" {
		t.Fatalf("body = %q, want JS content", rr.Body.String())
	}
	if rr.Header().Get("Cache-Control") != "public, max-age=31536000, immutable" {
		t.Fatalf("Cache-Control = %q", rr.Header().Get("Cache-Control"))
	}
}

func TestSpaFallbackServesIndexNoStore(t *testing.T) {
	staticDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(staticDir, "index.html"), []byte("<html>SPA</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	server := New(ServerOptions{
		StaticDir:     staticDir,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})
	req := httptest.NewRequest(http.MethodGet, "/about", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200", rr.Code)
	}
	if rr.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control = %q", rr.Header().Get("Cache-Control"))
	}
}

func TestServiceWorkerServedNoStore(t *testing.T) {
	staticDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(staticDir, "sw.js"), []byte("self.addEventListener('fetch', () => {});"), 0o644); err != nil {
		t.Fatal(err)
	}
	server := New(ServerOptions{
		StaticDir:     staticDir,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})
	req := httptest.NewRequest(http.MethodGet, "/sw.js", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200", rr.Code)
	}
	if rr.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control = %q", rr.Header().Get("Cache-Control"))
	}
}

func TestAppVersionManifestServedNoStore(t *testing.T) {
	staticDir := t.TempDir()
	manifestPath := filepath.Join(staticDir, "adsbao-version.json")
	if err := os.WriteFile(manifestPath, []byte(`{"version":"2.11.0"}`), 0o644); err != nil {
		t.Fatal(err)
	}
	server := New(ServerOptions{
		StaticDir:     staticDir,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})
	req := httptest.NewRequest(http.MethodGet, "/adsbao-version.json", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200", rr.Code)
	}
	if rr.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control = %q", rr.Header().Get("Cache-Control"))
	}
	if ct := rr.Header().Get("Content-Type"); !strings.Contains(ct, "application/json") {
		t.Fatalf("Content-Type = %q, want application/json", ct)
	}
	if strings.TrimSpace(rr.Body.String()) != `{"version":"2.11.0"}` {
		t.Fatalf("body = %q, want version manifest", rr.Body.String())
	}
}

func TestMissingStaticAssetReturns404(t *testing.T) {
	staticDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(staticDir, "index.html"), []byte("<html>SPA</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	server := New(ServerOptions{
		StaticDir:     staticDir,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})
	req := httptest.NewRequest(http.MethodGet, "/assets/nonexistent-xyz.js", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("got status %d, want 404", rr.Code)
	}
	if strings.Contains(rr.Body.String(), "<html>SPA</html>") {
		t.Fatalf("unexpectedly served index.html for missing asset")
	}
}

func TestMultipleDeepLinksServedAsSPAFallback(t *testing.T) {
	staticDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(staticDir, "index.html"), []byte("<html>SPA</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	server := New(ServerOptions{
		StaticDir:     staticDir,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})
	deepLinks := []string{"/airport/KBOS", "/airport/ZBAA", "/about", "/settings/profile"}
	for _, path := range deepLinks {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rr := httptest.NewRecorder()
		server.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("%s: got status %d, want 200", path, rr.Code)
		}
		if !strings.Contains(rr.Body.String(), "<html>SPA</html>") {
			t.Fatalf("%s: body = %q, want index.html", path, rr.Body.String())
		}
	}
}

func TestNoSPAFallbackWhenIndexHTMLMissing(t *testing.T) {
	staticDir := t.TempDir()
	// No index.html created — directory exists but no SPA entrypoint
	server := New(ServerOptions{
		StaticDir:     staticDir,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})
	req := httptest.NewRequest(http.MethodGet, "/airport/KBOS", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("got status %d, want 404 (no index.html to fall back to)", rr.Code)
	}
}

func TestBackendOnlyWhenNoStaticDir(t *testing.T) {
	server := New(ServerOptions{
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})
	req := httptest.NewRequest(http.MethodGet, "/airport/KBOS", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("got status %d, want 404 (backend-only mode)", rr.Code)
	}
}

func TestDirectoryTraversalBlocked(t *testing.T) {
	staticDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(staticDir, "index.html"), []byte("<html>SPA</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	// Create a file outside StaticDir that must not be served
	outsideDir := t.TempDir()
	secretPath := filepath.Join(outsideDir, "secret.txt")
	if err := os.WriteFile(secretPath, []byte("SECRET_DATA"), 0o644); err != nil {
		t.Fatal(err)
	}
	// Symlink from within StaticDir pointing outside — must not be followed
	linkPath := filepath.Join(staticDir, "secret-link")
	if err := os.Symlink(secretPath, linkPath); err != nil {
		t.Fatal(err)
	}

	server := New(ServerOptions{
		StaticDir:     staticDir,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})

	traversalPaths := []string{
		"/../secret.txt",     // direct parent traversal
		"/../../etc/passwd",  // deep traversal
		"/..%2Fsecret.txt",   // URL-encoded slash
		"/api/../secret.txt", // /api bypass then backtrack
		"/secret-link",       // symlink to outside file
	}
	for _, path := range traversalPaths {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			rr := httptest.NewRecorder()
			server.ServeHTTP(rr, req)
			if rr.Code != http.StatusNotFound {
				t.Errorf("got status %d, want 404", rr.Code)
			}
			if strings.Contains(rr.Body.String(), "SECRET_DATA") {
				t.Errorf("directory traversal leaked secret file content")
			}
		})
	}
}

func TestSecurityHeaders(t *testing.T) {
	server := New(ServerOptions{
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
	})
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("health status = %d", rr.Code)
	}
	if v := rr.Header().Get("Origin-Agent-Cluster"); v != "?1" {
		t.Fatalf("Origin-Agent-Cluster = %q, want ?1", v)
	}
	if v := rr.Header().Get("Permissions-Policy"); !strings.Contains(v, "tools=(self)") {
		t.Fatalf("Permissions-Policy = %q, want tools=(self)", v)
	}
}

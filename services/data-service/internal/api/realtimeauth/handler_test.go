package realtimeauth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestHandler_RejectsNonFlightAwareProvider(t *testing.T) {
	h := New("secret", &staticAuth{allow: true}, 5*time.Minute)
	req := httptest.NewRequest(http.MethodGet, "/?provider=adsbexchange", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body["error"] == "" {
		t.Fatal("expected error field in response")
	}
}

func TestHandler_RejectsEmptyProvider(t *testing.T) {
	h := New("secret", &staticAuth{allow: true}, 5*time.Minute)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty provider, got %d", rec.Code)
	}
}

func TestHandler_RejectsMissingSecret(t *testing.T) {
	h := New("", &staticAuth{allow: true}, 5*time.Minute)
	req := httptest.NewRequest(http.MethodGet, "/?provider=flightaware", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", rec.Code)
	}
	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body["error"] == "" {
		t.Fatal("expected error field in response")
	}
}

func TestHandler_Returns403WhenNotAuthorized(t *testing.T) {
	h := New("secret", &staticAuth{allow: false}, 5*time.Minute)
	req := httptest.NewRequest(http.MethodGet, "/?provider=flightaware", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body["error"] == "" {
		t.Fatal("expected error field in response")
	}
}

func TestHandler_ReturnsTokenOnSuccess(t *testing.T) {
	h := New("test-secret", &staticAuth{allow: true}, 5*time.Minute)
	req := httptest.NewRequest(http.MethodGet, "/?provider=flightaware", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Provider  string  `json:"provider"`
		Token     string  `json:"token"`
		ExpiresAt float64 `json:"expiresAt"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body.Provider != "flightaware" {
		t.Fatalf("expected provider flightaware, got %q", body.Provider)
	}
	if body.Token == "" {
		t.Fatal("expected non-empty token")
	}
	if body.ExpiresAt == 0 {
		t.Fatal("expected non-zero expiresAt (unix seconds)")
	}
}

func TestHandler_TokenFormatCompatibleWithVerification(t *testing.T) {
	secret := "my-realtime-secret"
	h := New(secret, &staticAuth{allow: true}, 5*time.Minute)
	req := httptest.NewRequest(http.MethodGet, "/?provider=flightaware", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var body struct {
		Token     string  `json:"token"`
		ExpiresAt float64 `json:"expiresAt"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify token format: base64url(payload) + "." + base64url(hmac)
	parts := strings.Split(body.Token, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		t.Fatalf("invalid token format: %q", body.Token)
	}

	// Verify HMAC signature
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(parts[0]))
	expected := mac.Sum(nil)
	got, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		t.Fatalf("failed to decode signature: %v", err)
	}
	if !hmac.Equal(got, expected) {
		t.Fatal("HMAC signature does not match")
	}

	// Verify payload
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		t.Fatalf("failed to decode payload: %v", err)
	}
	var grant struct {
		Provider string `json:"provider"`
		Exp      int64  `json:"exp"`
	}
	if err := json.Unmarshal(payload, &grant); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}
	if grant.Provider != "flightaware" {
		t.Fatalf("expected provider flightaware, got %q", grant.Provider)
	}

	// Exp should be in the future
	if grant.Exp <= time.Now().Unix() {
		t.Fatalf("exp is in the past: %d", grant.Exp)
	}

	// expiresAt should be a unix seconds number matching payload exp
	expiresAtUnix := int64(body.ExpiresAt)
	if expiresAtUnix != grant.Exp {
		t.Fatalf("expiresAt (%d) does not match payload exp (%d)", expiresAtUnix, grant.Exp)
	}
}

func TestHandler_CacheControlNoStore(t *testing.T) {
	h := New("secret", &staticAuth{allow: true}, 5*time.Minute)
	req := httptest.NewRequest(http.MethodGet, "/?provider=flightaware", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	cacheControl := rec.Header().Get("Cache-Control")
	if cacheControl != "no-store" {
		t.Fatalf("expected Cache-Control: no-store, got %q", cacheControl)
	}
}

func TestHandler_JSONContentType(t *testing.T) {
	h := New("secret", &staticAuth{allow: true}, 5*time.Minute)
	req := httptest.NewRequest(http.MethodGet, "/?provider=flightaware", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	ct := rec.Header().Get("Content-Type")
	if !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("expected application/json content type, got %q", ct)
	}
}

func TestHandler_CaseInsensitiveProvider(t *testing.T) {
	h := New("secret", &staticAuth{allow: true}, 5*time.Minute)
	req := httptest.NewRequest(http.MethodGet, "/?provider=FlightAware", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for FlightAware, got %d", rec.Code)
	}
}

func TestHandler_TokenTTL(t *testing.T) {
	h := New("secret", &staticAuth{allow: true}, 30*time.Minute)
	req := httptest.NewRequest(http.MethodGet, "/?provider=flightaware", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	var body struct {
		Token     string  `json:"token"`
		ExpiresAt float64 `json:"expiresAt"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	parts := strings.Split(body.Token, ".")
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		t.Fatalf("failed to decode payload: %v", err)
	}
	var grant struct {
		Exp int64 `json:"exp"`
	}
	if err := json.Unmarshal(payload, &grant); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}

	now := time.Now().Unix()
	ttl := grant.Exp - now
	// Allow 5 second tolerance for test execution time
	if ttl < (30*60-5) || ttl > (30*60+5) {
		t.Fatalf("expected TTL ~30min, got %ds (exp=%d, now=%d)", ttl, grant.Exp, now)
	}

	// expiresAt as unix seconds should match payload exp
	if int64(body.ExpiresAt) != grant.Exp {
		t.Fatalf("expiresAt (%d) does not match payload exp (%d)", int64(body.ExpiresAt), grant.Exp)
	}
}

func TestHandler_RejectsNonGetMethod(t *testing.T) {
	h := New("secret", &staticAuth{allow: true}, 5*time.Minute)

	methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}
	for _, method := range methods {
		req := httptest.NewRequest(method, "/?provider=flightaware", nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Fatalf("%s: expected 405, got %d", method, rec.Code)
		}

		cacheControl := rec.Header().Get("Cache-Control")
		if cacheControl != "no-store" {
			t.Fatalf("%s: expected Cache-Control: no-store, got %q", method, cacheControl)
		}

		var body map[string]string
		if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
			t.Fatalf("%s: failed to decode response: %v", method, err)
		}
		if body["error"] == "" {
			t.Fatalf("%s: expected error field in response", method)
		}
	}
}

func TestHandler_NilAuthCheckerReturns403(t *testing.T) {
	h := New("secret", nil, 5*time.Minute)
	req := httptest.NewRequest(http.MethodGet, "/?provider=flightaware", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for nil auth checker, got %d", rec.Code)
	}
	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body["error"] == "" {
		t.Fatal("expected error field in response")
	}
}

// staticAuth is a test-only AuthChecker implementation.
type staticAuth struct {
	allow bool
}

func (s *staticAuth) AuthorizeFlightAware(r *http.Request) bool {
	return s.allow
}

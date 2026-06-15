package realtimeauth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// AuthChecker is injected to determine if a request is authorized
// for FlightAware access. The main integration will later implement
// Clerk JWT + Postgres feature flag lookup.
type AuthChecker interface {
	AuthorizeFlightAware(r *http.Request) bool
}

// Handler serves GET /api/realtime/auth?provider=flightaware.
type Handler struct {
	secret      string
	authChecker AuthChecker
	ttl         time.Duration
}

// New creates a Handler. secret is ADSBAO_REALTIME_AUTH_SECRET.
// authChecker may be nil; nil is treated as always-denied (403).
func New(secret string, authChecker AuthChecker, ttl time.Duration) *Handler {
	return &Handler{
		secret:      strings.TrimSpace(secret),
		authChecker: authChecker,
		ttl:         ttl,
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")

	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	provider := strings.TrimSpace(r.URL.Query().Get("provider"))

	if !strings.EqualFold(provider, "flightaware") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unsupported provider"})
		return
	}

	if h.secret == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "realtime auth not configured"})
		return
	}

	if h.authChecker == nil || !h.authChecker.AuthorizeFlightAware(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "not authorized for FlightAware"})
		return
	}

	now := time.Now().UTC()
	exp := now.Add(h.ttl)

	payload := map[string]any{
		"provider": "flightaware",
		"exp":      exp.Unix(),
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create token"})
		return
	}

	encodedPayload := base64.RawURLEncoding.EncodeToString(payloadJSON)

	mac := hmac.New(sha256.New, []byte(h.secret))
	mac.Write([]byte(encodedPayload))
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	token := encodedPayload + "." + signature

	writeJSON(w, http.StatusOK, map[string]any{
		"provider":  "flightaware",
		"token":     token,
		"expiresAt": exp.Unix(),
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

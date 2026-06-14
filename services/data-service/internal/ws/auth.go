package ws

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"
)

const realtimeAuthTokenParam = "realtimeAuthToken"

type providerGrant struct {
	Provider string `json:"provider"`
	Exp      int64  `json:"exp"`
}

func verifyProviderGrant(token, provider, secret string, now time.Time) bool {
	token = strings.TrimSpace(token)
	provider = strings.ToLower(strings.TrimSpace(provider))
	secret = strings.TrimSpace(secret)
	if token == "" || provider == "" || secret == "" {
		return false
	}
	parts := strings.Split(token, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(parts[0]))
	expected := mac.Sum(nil)
	got, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || !hmac.Equal(got, expected) {
		return false
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return false
	}
	var grant providerGrant
	if err := json.Unmarshal(payload, &grant); err != nil {
		return false
	}
	return strings.ToLower(grant.Provider) == provider && grant.Exp > now.Unix()
}

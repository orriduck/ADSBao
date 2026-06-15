package webapi

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

var errAuthRequired = errors.New("authentication required")

type ClerkAuthenticator struct {
	httpClient *http.Client
	secretKey  string
	jwksURL    string
	apiBaseURL string

	mu        sync.Mutex
	keys      map[string]*rsa.PublicKey
	keysUntil time.Time
}

type ClerkUser struct {
	ID    string
	Email string
}

type clerkJWTHeader struct {
	Alg string `json:"alg"`
	Kid string `json:"kid"`
}

type clerkJWTClaims struct {
	Subject string `json:"sub"`
	Issuer  string `json:"iss"`
	Email   string `json:"email"`
	Exp     int64  `json:"exp"`
	Nbf     int64  `json:"nbf"`
}

type clerkJWKS struct {
	Keys []clerkJWK `json:"keys"`
}

type clerkJWK struct {
	Kty string `json:"kty"`
	Use string `json:"use"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func NewClerkAuthenticator(httpClient *http.Client, secretKey, jwksURL, apiBaseURL string) *ClerkAuthenticator {
	if httpClient == nil {
		httpClient = &http.Client{}
	}
	apiBaseURL = strings.TrimRight(strings.TrimSpace(apiBaseURL), "/")
	if apiBaseURL == "" {
		apiBaseURL = "https://api.clerk.com"
	}
	return &ClerkAuthenticator{
		httpClient: httpClient,
		secretKey:  strings.TrimSpace(secretKey),
		jwksURL:    strings.TrimSpace(jwksURL),
		apiBaseURL: apiBaseURL,
	}
}

func (a *ClerkAuthenticator) CurrentUser(ctx context.Context, r *http.Request) (*ClerkUser, error) {
	token := bearerToken(r)
	if token == "" || a == nil {
		return nil, errAuthRequired
	}
	claims, err := a.verifyToken(ctx, token)
	if err != nil {
		return nil, err
	}
	email := normalizeEmail(claims.Email)
	if email == "" && a.secretKey != "" {
		email, err = a.fetchUserEmail(ctx, claims.Subject)
		if err != nil {
			return nil, err
		}
	}
	if email == "" {
		return nil, fmt.Errorf("clerk user email unavailable")
	}
	return &ClerkUser{ID: claims.Subject, Email: email}, nil
}

func (a *ClerkAuthenticator) verifyToken(ctx context.Context, token string) (clerkJWTClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return clerkJWTClaims{}, errAuthRequired
	}
	var header clerkJWTHeader
	if err := decodeJWTPart(parts[0], &header); err != nil {
		return clerkJWTClaims{}, errAuthRequired
	}
	if header.Alg != "RS256" || header.Kid == "" {
		return clerkJWTClaims{}, errAuthRequired
	}
	var claims clerkJWTClaims
	if err := decodeJWTPart(parts[1], &claims); err != nil {
		return clerkJWTClaims{}, errAuthRequired
	}
	if claims.Subject == "" || claims.Issuer == "" {
		return clerkJWTClaims{}, errAuthRequired
	}
	key, err := a.publicKey(ctx, claims.Issuer, header.Kid)
	if err != nil {
		return clerkJWTClaims{}, err
	}
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return clerkJWTClaims{}, errAuthRequired
	}
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, digest[:], signature); err != nil {
		return clerkJWTClaims{}, errAuthRequired
	}
	now := time.Now().Unix()
	const leeway = int64(30)
	if claims.Exp != 0 && now > claims.Exp+leeway {
		return clerkJWTClaims{}, errAuthRequired
	}
	if claims.Nbf != 0 && now+leeway < claims.Nbf {
		return clerkJWTClaims{}, errAuthRequired
	}
	return claims, nil
}

func (a *ClerkAuthenticator) publicKey(ctx context.Context, issuer, kid string) (*rsa.PublicKey, error) {
	a.mu.Lock()
	key := a.keys[kid]
	valid := time.Now().Before(a.keysUntil)
	a.mu.Unlock()
	if key != nil && valid {
		return key, nil
	}
	keys, err := a.fetchJWKS(ctx, issuer)
	if err != nil {
		return nil, err
	}
	a.mu.Lock()
	a.keys = keys
	a.keysUntil = time.Now().Add(10 * time.Minute)
	key = a.keys[kid]
	a.mu.Unlock()
	if key == nil {
		return nil, errAuthRequired
	}
	return key, nil
}

func (a *ClerkAuthenticator) fetchJWKS(ctx context.Context, issuer string) (map[string]*rsa.PublicKey, error) {
	jwksURL := a.jwksURL
	if jwksURL == "" {
		parsed, err := url.Parse(issuer)
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
			return nil, errAuthRequired
		}
		parsed.Path = strings.TrimRight(parsed.Path, "/") + "/.well-known/jwks.json"
		parsed.RawQuery = ""
		jwksURL = parsed.String()
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, jwksURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("clerk jwks fetch failed: %d", resp.StatusCode)
	}
	var payload clerkJWKS
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1024*1024)).Decode(&payload); err != nil {
		return nil, err
	}
	keys := map[string]*rsa.PublicKey{}
	for _, jwk := range payload.Keys {
		if jwk.Kid == "" || jwk.Kty != "RSA" {
			continue
		}
		key, err := rsaPublicKey(jwk.N, jwk.E)
		if err == nil {
			keys[jwk.Kid] = key
		}
	}
	return keys, nil
}

func (a *ClerkAuthenticator) fetchUserEmail(ctx context.Context, userID string) (string, error) {
	if a.secretKey == "" || userID == "" {
		return "", errAuthRequired
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.apiBaseURL+"/v1/users/"+url.PathEscape(userID), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.secretKey)
	resp, err := a.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("clerk user fetch failed: %d", resp.StatusCode)
	}
	var payload struct {
		PrimaryEmailAddressID string `json:"primary_email_address_id"`
		EmailAddresses        []struct {
			ID           string `json:"id"`
			EmailAddress string `json:"email_address"`
		} `json:"email_addresses"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1024*1024)).Decode(&payload); err != nil {
		return "", err
	}
	for _, address := range payload.EmailAddresses {
		if address.ID == payload.PrimaryEmailAddressID {
			return normalizeEmail(address.EmailAddress), nil
		}
	}
	if len(payload.EmailAddresses) > 0 {
		return normalizeEmail(payload.EmailAddresses[0].EmailAddress), nil
	}
	return "", fmt.Errorf("clerk user has no email")
}

func bearerToken(r *http.Request) string {
	if r == nil {
		return ""
	}
	raw := strings.TrimSpace(r.Header.Get("Authorization"))
	if len(raw) < len("Bearer ") || !strings.EqualFold(raw[:len("Bearer ")], "Bearer ") {
		return ""
	}
	return strings.TrimSpace(raw[len("Bearer "):])
}

func decodeJWTPart(part string, target any) error {
	payload, err := base64.RawURLEncoding.DecodeString(part)
	if err != nil {
		return err
	}
	return json.Unmarshal(payload, target)
}

func rsaPublicKey(rawN, rawE string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(rawN)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(rawE)
	if err != nil {
		return nil, err
	}
	if len(nBytes) == 0 || len(eBytes) == 0 {
		return nil, errAuthRequired
	}
	e := int(new(big.Int).SetBytes(eBytes).Int64())
	if e <= 0 {
		return nil, errAuthRequired
	}
	return &rsa.PublicKey{N: new(big.Int).SetBytes(nBytes), E: e}, nil
}

func randomUserHash() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(b[:])
}

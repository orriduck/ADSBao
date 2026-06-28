package flightaware

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/providers/adsb"
	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

const remoteUserAgent = "ADSBao data-service/1.0 (+https://adsbao.dev; flightaware/remote)"

const (
	defaultTimeout = 7 * time.Second
	// Route lookups scrape FlightAware and, on a busy airport, routinely run
	// 5–10s under burst load (the callsign-fallback live-position path is more
	// latency-sensitive and keeps the tighter default). 7s used to cut off the
	// slow half, dropping otherwise-valid routes; the route cache makes a longer
	// wait a one-time cost.
	defaultRouteTimeout = 12 * time.Second
	maxBodyBytes        = 2 * 1024 * 1024
)

var normalizedCallsignPattern = regexp.MustCompile(`^[A-Z][A-Z0-9]{2,7}$`)

type RemoteOptions struct {
	BaseURL      string
	Token        string
	HTTPClient   *http.Client
	Timeout      time.Duration
	RouteTimeout time.Duration
}

type RemoteClient struct {
	baseURL      string
	token        string
	httpClient   *http.Client
	timeout      time.Duration
	routeTimeout time.Duration
}

type remoteRequestError struct {
	errorType string
	message   string
	status    any
}

func (e remoteRequestError) Error() string {
	if e.message != "" {
		return e.message
	}
	return e.errorType
}

func NewRemoteClient(options RemoteOptions) *RemoteClient {
	httpClient := options.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{}
	}
	timeout := options.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	routeTimeout := options.RouteTimeout
	if routeTimeout <= 0 {
		routeTimeout = defaultRouteTimeout
	}
	return &RemoteClient{
		baseURL:      strings.TrimRight(strings.TrimSpace(options.BaseURL), "/"),
		token:        strings.TrimSpace(options.Token),
		httpClient:   httpClient,
		timeout:      timeout,
		routeTimeout: routeTimeout,
	}
}

func (c *RemoteClient) Enabled() bool {
	return c != nil && c.baseURL != ""
}

func (c *RemoteClient) ByCallsign(ctx context.Context, callsign string, metrics realtime.MetricsSink) (adsb.FallbackResult, error) {
	fetchedAt := time.Now().UTC().Format(time.RFC3339Nano)
	if !c.Enabled() {
		return errorResult("feature_disabled", fetchedAt, "", nil), nil
	}
	normalized := normalizeCallsign(callsign)
	if normalized == "" {
		return errorResult("invalid_callsign", fetchedAt, "", nil), nil
	}
	var result adsb.FallbackResult
	err := c.getJSON(ctx, c.timeout, "callsign", "/api/flightaware/callsign/"+url.PathEscape(normalized), &result, metrics)
	if err != nil {
		var remoteErr remoteRequestError
		if errors.As(err, &remoteErr) {
			return errorResult(remoteErr.errorType, fetchedAt, remoteErr.message, remoteErr.status), nil
		}
		return errorResult("network_failed", fetchedAt, err.Error(), nil), nil
	}
	if result.FetchedAt == "" {
		result.FetchedAt = fetchedAt
	}
	return result, nil
}

func (c *RemoteClient) Route(ctx context.Context, callsign string, metrics realtime.MetricsSink) (map[string]any, error) {
	if !c.Enabled() {
		return nil, nil
	}
	normalized := normalizeCallsign(callsign)
	if normalized == "" {
		return nil, errors.New("Invalid FlightAware route callsign")
	}
	var payload map[string]any
	if err := c.getJSON(ctx, c.routeTimeout, "route", "/api/flightaware/route/"+url.PathEscape(normalized), &payload, metrics); err != nil {
		return nil, err
	}
	return asMap(payload["route"]), nil
}

func (c *RemoteClient) getJSON(ctx context.Context, timeout time.Duration, endpoint, path string, out any, metrics realtime.MetricsSink) error {
	requestURL := c.baseURL + path
	started := time.Now()
	requestCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(requestCtx, http.MethodGet, requestURL, nil)
	if err != nil {
		return remoteRequestError{errorType: "invalid_callsign", message: err.Error()}
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", remoteUserAgent)
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		if errors.Is(requestCtx.Err(), context.Canceled) || errors.Is(err, context.Canceled) {
			return remoteRequestError{errorType: "canceled", message: err.Error()}
		}
		record(metrics, endpoint, "error", "ERR", requestURL, err.Error(), started)
		return remoteRequestError{errorType: timeoutOrNetwork(err), message: err.Error()}
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		message := fmt.Sprintf("HTTP %d", resp.StatusCode)
		record(metrics, endpoint, "error", resp.StatusCode, requestURL, message, started)
		return remoteRequestError{errorType: remoteErrorType(resp.StatusCode), message: message, status: resp.StatusCode}
	}
	body, err := readBody(resp.Body, maxBodyBytes)
	if err != nil {
		record(metrics, endpoint, "error", "ERR", requestURL, err.Error(), started)
		return remoteRequestError{errorType: "network_failed", message: err.Error()}
	}
	if err := json.Unmarshal(body, out); err != nil {
		record(metrics, endpoint, "error", "PARSE", requestURL, "Invalid FlightAware service JSON", started)
		return remoteRequestError{errorType: "parse_failed", message: err.Error()}
	}
	record(metrics, endpoint, "success", resp.StatusCode, requestURL, "", started)
	return nil
}

func remoteErrorType(status int) string {
	switch status {
	case http.StatusUnauthorized, http.StatusForbidden:
		return "not_authorized"
	case http.StatusBadRequest:
		return "invalid_callsign"
	case http.StatusTooManyRequests:
		return "rate_limited"
	default:
		return "network_failed"
	}
}

func errorResult(errorType, fetchedAt, message string, upstreamStatus any) adsb.FallbackResult {
	raw := map[string]any{
		"ok":          false,
		"hasPosition": false,
		"errorType":   errorType,
		"fetchedAt":   fetchedAt,
	}
	if message != "" {
		raw["message"] = message
	}
	if upstreamStatus != nil {
		raw["upstreamStatus"] = upstreamStatus
	}
	return adsb.FallbackResult{OK: false, HasPosition: false, ErrorType: errorType, UpstreamStatus: upstreamStatus, FetchedAt: fetchedAt, Raw: raw}
}

func normalizeCallsign(value any) string {
	callsign := strings.Join(strings.Fields(strings.ToUpper(strings.TrimSpace(fmt.Sprint(value)))), "")
	if normalizedCallsignPattern.MatchString(callsign) {
		return callsign
	}
	return ""
}

func readBody(reader io.Reader, limit int64) ([]byte, error) {
	body, err := io.ReadAll(io.LimitReader(reader, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(body)) > limit {
		return nil, errors.New("FlightAware service response too large")
	}
	return body, nil
}

func asMap(value any) map[string]any {
	if out, ok := value.(map[string]any); ok {
		return out
	}
	return nil
}

func record(metrics realtime.MetricsSink, endpoint, result string, status any, requestURL, errorText string, started time.Time) {
	if metrics == nil {
		return
	}
	metrics.RecordExternalRequest(realtime.ExternalRequestMetricInput{
		Provider:   "flightaware",
		Endpoint:   endpoint,
		Result:     result,
		Status:     status,
		URL:        requestURL,
		Error:      errorText,
		DurationMS: time.Since(started).Milliseconds(),
	})
}

func timeoutOrNetwork(err error) string {
	if err == nil {
		return "network_failed"
	}
	if errors.Is(err, context.DeadlineExceeded) || strings.Contains(strings.ToLower(err.Error()), "timeout") {
		return "timeout"
	}
	return "network_failed"
}

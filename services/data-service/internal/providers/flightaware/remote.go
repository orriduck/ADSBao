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
	maxBodyBytes   = 2 * 1024 * 1024
)

type RemoteFallbackOptions struct {
	BaseURL    string
	Token      string
	HTTPClient *http.Client
	Timeout    time.Duration
}

type RemoteFallbackClient struct {
	baseURL    string
	token      string
	httpClient *http.Client
	timeout    time.Duration
}

func NewRemoteFallbackClient(options RemoteFallbackOptions) *RemoteFallbackClient {
	httpClient := options.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{}
	}
	timeout := options.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	return &RemoteFallbackClient{
		baseURL:    strings.TrimRight(strings.TrimSpace(options.BaseURL), "/"),
		token:      strings.TrimSpace(options.Token),
		httpClient: httpClient,
		timeout:    timeout,
	}
}

func (c *RemoteFallbackClient) Enabled() bool {
	return c != nil && c.baseURL != ""
}

func (c *RemoteFallbackClient) ByCallsign(ctx context.Context, callsign any, metrics realtime.MetricsSink) (adsb.FallbackResult, error) {
	fetchedAt := time.Now().UTC().Format(time.RFC3339Nano)
	if !c.Enabled() {
		return errorResult("feature_disabled", fetchedAt, "", nil), nil
	}
	normalized := normalizeCallsign(callsign)
	if normalized == "" {
		return errorResult("invalid_callsign", fetchedAt, "", nil), nil
	}
	requestURL := c.baseURL + "/api/flightaware/callsign/" + url.PathEscape(normalized)
	started := time.Now()
	requestCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(requestCtx, http.MethodGet, requestURL, nil)
	if err != nil {
		return errorResult("invalid_callsign", fetchedAt, err.Error(), nil), nil
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", remoteUserAgent)
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		record(metrics, "error", "ERR", requestURL, err.Error(), started)
		return errorResult(timeoutOrNetwork(err), fetchedAt, err.Error(), nil), nil
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		message := fmt.Sprintf("HTTP %d", resp.StatusCode)
		record(metrics, "error", resp.StatusCode, requestURL, message, started)
		return errorResult(remoteErrorType(resp.StatusCode), fetchedAt, message, resp.StatusCode), nil
	}
	body, err := readBody(resp.Body, maxBodyBytes)
	if err != nil {
		record(metrics, "error", "ERR", requestURL, err.Error(), started)
		return errorResult("network_failed", fetchedAt, err.Error(), nil), nil
	}
	var result adsb.FallbackResult
	if err := json.Unmarshal(body, &result); err != nil {
		record(metrics, "error", "PARSE", requestURL, "Invalid FlightAware service JSON", started)
		return errorResult("parse_failed", fetchedAt, err.Error(), nil), nil
	}
	record(metrics, "success", resp.StatusCode, requestURL, "", started)
	if result.FetchedAt == "" {
		result.FetchedAt = fetchedAt
	}
	return result, nil
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
	if regexp.MustCompile(`^[A-Z][A-Z0-9]{2,7}$`).MatchString(callsign) {
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

func record(metrics realtime.MetricsSink, result string, status any, requestURL, errorText string, started time.Time) {
	if metrics == nil {
		return
	}
	metrics.RecordExternalRequest(realtime.ExternalRequestMetricInput{
		Provider:   "flightaware",
		Endpoint:   "callsign",
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

package observability

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type BetterStackLogOptions struct {
	SourceToken string
	Endpoint    string
	ServiceName string
	Environment string
	Source      io.Writer
	HTTPClient  *http.Client
	Now         func() time.Time
	MaxBatch    int
}

type LogForwarder struct {
	mu          sync.Mutex
	entries     []betterStackLogEntry
	sourceToken string
	endpoint    string
	serviceName string
	environment string
	source      io.Writer
	client      *http.Client
	now         func() time.Time
	maxBatch    int
}

func NewBetterStackLogForwarder(options BetterStackLogOptions) *LogForwarder {
	serviceName := strings.TrimSpace(options.ServiceName)
	if serviceName == "" {
		serviceName = "adsbao-data-service"
	}
	environment := strings.TrimSpace(options.Environment)
	if environment == "" {
		environment = "production"
	}
	client := options.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	now := options.Now
	if now == nil {
		now = time.Now
	}
	maxBatch := options.MaxBatch
	if maxBatch <= 0 {
		maxBatch = 100
	}
	return &LogForwarder{
		sourceToken: strings.TrimSpace(options.SourceToken),
		endpoint:    betterStackLogsEndpoint(options.Endpoint),
		serviceName: serviceName,
		environment: environment,
		source:      options.Source,
		client:      client,
		now:         now,
		maxBatch:    maxBatch,
	}
}

func (f *LogForwarder) Write(p []byte) (int, error) {
	if f.source != nil {
		_, _ = f.source.Write(p)
	}
	message := strings.TrimSpace(string(p))
	if message == "" || f.sourceToken == "" || f.endpoint == "" {
		return len(p), nil
	}
	f.enqueue(f.entry(inferLogLevel(message), message, nil))
	return len(p), nil
}

func (f *LogForwarder) entry(level, message string, attributes map[string]any) betterStackLogEntry {
	entry := betterStackLogEntry{
		Timestamp:     f.now().UTC().Format(time.RFC3339Nano),
		Message:       truncateLogValue(message),
		Level:         level,
		ServiceName:   f.serviceName,
		ADSBaoService: f.serviceName,
		Environment:   f.environment,
	}
	for key, value := range sanitizeLogAttributes(attributes) {
		switch key {
		case "event.name":
			entry.EventName = fmt.Sprint(value)
		case "provider":
			entry.Provider = fmt.Sprint(value)
		case "endpoint":
			entry.Endpoint = fmt.Sprint(value)
		case "result":
			entry.Result = fmt.Sprint(value)
		case "status", "status_code":
			entry.Status = fmt.Sprint(value)
		case "status.class", "status_class":
			entry.StatusClass = fmt.Sprint(value)
		case "duration.ms", "duration_ms":
			entry.DurationMS = numericLogValue(value)
		case "duration.seconds", "duration_seconds":
			entry.DurationSeconds = numericLogValue(value)
		case "url":
			entry.URL = fmt.Sprint(value)
		case "query_params":
			entry.QueryParams = fmt.Sprint(value)
		case "error":
			entry.Error = fmt.Sprint(value)
		default:
			if entry.Attributes == nil {
				entry.Attributes = map[string]any{}
			}
			entry.Attributes[key] = value
		}
	}
	return entry
}

func numericLogValue(value any) float64 {
	switch v := value.(type) {
	case int:
		return float64(v)
	case int8:
		return float64(v)
	case int16:
		return float64(v)
	case int32:
		return float64(v)
	case int64:
		return float64(v)
	case uint:
		return float64(v)
	case uint8:
		return float64(v)
	case uint16:
		return float64(v)
	case uint32:
		return float64(v)
	case uint64:
		return float64(v)
	case float32:
		return float64(v)
	case float64:
		return v
	case string:
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
		return 0
	case time.Duration:
		return float64(v.Milliseconds())
	default:
		return 0
	}
}

func (f *LogForwarder) RecordLog(level, message string, attributes map[string]any) {
	message = strings.TrimSpace(message)
	if message == "" || f.sourceToken == "" || f.endpoint == "" {
		return
	}
	f.enqueue(f.entry(normalizeLogLevel(level, message), message, attributes))
}

func (f *LogForwarder) Run(ctx context.Context, interval time.Duration) {
	if f.sourceToken == "" || f.endpoint == "" {
		return
	}
	if interval <= 0 {
		interval = 5 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := f.Flush(ctx); err != nil && f.source != nil {
				_, _ = fmt.Fprintf(f.source, "better stack logs flush failed: %v\n", err)
			}
		}
	}
}

func (f *LogForwarder) Flush(ctx context.Context) error {
	entries := f.drain()
	if len(entries) == 0 || f.sourceToken == "" || f.endpoint == "" {
		return nil
	}
	body, err := json.Marshal(entries)
	if err != nil {
		f.requeue(entries)
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, f.endpoint, bytes.NewReader(body))
	if err != nil {
		f.requeue(entries)
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+f.sourceToken)
	resp, err := f.client.Do(req)
	if err != nil {
		f.requeue(entries)
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		f.requeue(entries)
		return fmt.Errorf("better stack logs status %d: %s", resp.StatusCode, strings.TrimSpace(string(responseBody)))
	}
	return nil
}

func (f *LogForwarder) Shutdown(ctx context.Context) error {
	return f.Flush(ctx)
}

func (f *LogForwarder) enqueue(entry betterStackLogEntry) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.entries) >= f.maxBatch {
		copy(f.entries, f.entries[1:])
		f.entries[len(f.entries)-1] = entry
		return
	}
	f.entries = append(f.entries, entry)
}

func (f *LogForwarder) drain() []betterStackLogEntry {
	f.mu.Lock()
	defer f.mu.Unlock()
	entries := f.entries
	f.entries = nil
	return entries
}

func (f *LogForwarder) requeue(entries []betterStackLogEntry) {
	f.mu.Lock()
	defer f.mu.Unlock()
	combined := append(entries, f.entries...)
	if len(combined) > f.maxBatch {
		combined = combined[len(combined)-f.maxBatch:]
	}
	f.entries = combined
}

type betterStackLogEntry struct {
	Timestamp       string         `json:"dt"`
	Message         string         `json:"message"`
	Level           string         `json:"level"`
	ServiceName     string         `json:"service.name"`
	ADSBaoService   string         `json:"adsbao.service"`
	Environment     string         `json:"environment"`
	EventName       string         `json:"event.name,omitempty"`
	Provider        string         `json:"provider,omitempty"`
	Endpoint        string         `json:"endpoint,omitempty"`
	Result          string         `json:"result,omitempty"`
	Status          string         `json:"status,omitempty"`
	StatusClass     string         `json:"status.class,omitempty"`
	DurationMS      float64        `json:"duration_ms,omitempty"`
	DurationSeconds float64        `json:"duration_seconds,omitempty"`
	URL             string         `json:"url,omitempty"`
	QueryParams     string         `json:"query_params,omitempty"`
	Error           string         `json:"error,omitempty"`
	Attributes      map[string]any `json:"attributes,omitempty"`
}

func inferLogLevel(message string) string {
	lower := strings.ToLower(message)
	switch {
	case strings.Contains(lower, "fatal"),
		strings.Contains(lower, "panic"),
		strings.Contains(lower, "failed"),
		strings.Contains(lower, "error"):
		return "error"
	case strings.Contains(lower, "warn"):
		return "warn"
	default:
		return "info"
	}
}

func normalizeLogLevel(level, message string) string {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "trace", "debug", "info", "warn", "error", "fatal":
		return strings.ToLower(strings.TrimSpace(level))
	default:
		return inferLogLevel(message)
	}
}

func sanitizeLogAttributes(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		switch v := value.(type) {
		case nil:
			continue
		case string:
			out[key] = truncateLogValue(v)
		case bool, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
			out[key] = v
		default:
			out[key] = truncateLogValue(fmt.Sprint(v))
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func truncateLogValue(value string) string {
	const maxLogValueBytes = 4094
	if len(value) <= maxLogValueBytes {
		return value
	}
	return value[:maxLogValueBytes]
}

func betterStackLogsEndpoint(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if !strings.HasPrefix(raw, "http://") && !strings.HasPrefix(raw, "https://") {
		raw = "https://" + raw
	}
	return raw
}

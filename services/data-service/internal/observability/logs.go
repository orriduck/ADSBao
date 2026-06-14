package observability

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

const defaultNewRelicLogsEndpoint = "https://log-api.newrelic.com/log/v1"

type NewRelicLogOptions struct {
	LicenseKey  string
	Endpoint    string
	AppName     string
	Environment string
	Source      io.Writer
	HTTPClient  *http.Client
	Now         func() time.Time
	MaxBatch    int
}

type LogForwarder struct {
	mu          sync.Mutex
	entries     []newRelicLogEntry
	licenseKey  string
	endpoint    string
	appName     string
	environment string
	source      io.Writer
	client      *http.Client
	now         func() time.Time
	maxBatch    int
}

func NewRelicLogForwarder(options NewRelicLogOptions) *LogForwarder {
	endpoint := strings.TrimSpace(options.Endpoint)
	if endpoint == "" {
		endpoint = defaultNewRelicLogsEndpoint
	}
	appName := strings.TrimSpace(options.AppName)
	if appName == "" {
		appName = "adsbao-data-service"
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
		licenseKey:  strings.TrimSpace(options.LicenseKey),
		endpoint:    endpoint,
		appName:     appName,
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
	if message == "" || f.licenseKey == "" {
		return len(p), nil
	}
	f.enqueue(newRelicLogEntry{
		Timestamp: f.now().UnixMilli(),
		Message:   truncateLogValue(message),
		Level:     inferLogLevel(message),
	})
	return len(p), nil
}

func (f *LogForwarder) Run(ctx context.Context, interval time.Duration) {
	if f.licenseKey == "" {
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
				_, _ = fmt.Fprintf(f.source, "new relic logs flush failed: %v\n", err)
			}
		}
	}
}

func (f *LogForwarder) Flush(ctx context.Context) error {
	entries := f.drain()
	if len(entries) == 0 || f.licenseKey == "" {
		return nil
	}
	body, err := json.Marshal([]newRelicLogPayload{{
		Common: newRelicLogCommon{
			Attributes: map[string]string{
				"app.name":     f.appName,
				"service.name": "adsbao-data-service",
				"environment":  f.environment,
				"logtype":      "adsbao-data-service",
			},
		},
		Logs: entries,
	}})
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
	req.Header.Set("Api-Key", f.licenseKey)
	resp, err := f.client.Do(req)
	if err != nil {
		f.requeue(entries)
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		f.requeue(entries)
		return fmt.Errorf("new relic logs status %d: %s", resp.StatusCode, strings.TrimSpace(string(responseBody)))
	}
	return nil
}

func (f *LogForwarder) Shutdown(ctx context.Context) error {
	return f.Flush(ctx)
}

func (f *LogForwarder) enqueue(entry newRelicLogEntry) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.entries) >= f.maxBatch {
		copy(f.entries, f.entries[1:])
		f.entries[len(f.entries)-1] = entry
		return
	}
	f.entries = append(f.entries, entry)
}

func (f *LogForwarder) drain() []newRelicLogEntry {
	f.mu.Lock()
	defer f.mu.Unlock()
	entries := f.entries
	f.entries = nil
	return entries
}

func (f *LogForwarder) requeue(entries []newRelicLogEntry) {
	f.mu.Lock()
	defer f.mu.Unlock()
	combined := append(entries, f.entries...)
	if len(combined) > f.maxBatch {
		combined = combined[len(combined)-f.maxBatch:]
	}
	f.entries = combined
}

type newRelicLogPayload struct {
	Common newRelicLogCommon  `json:"common"`
	Logs   []newRelicLogEntry `json:"logs"`
}

type newRelicLogCommon struct {
	Attributes map[string]string `json:"attributes"`
}

type newRelicLogEntry struct {
	Timestamp int64  `json:"timestamp"`
	Message   string `json:"message"`
	Level     string `json:"level"`
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

func truncateLogValue(value string) string {
	const maxLogValueBytes = 4094
	if len(value) <= maxLogValueBytes {
		return value
	}
	return value[:maxLogValueBytes]
}

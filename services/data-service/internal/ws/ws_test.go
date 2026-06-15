package ws

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/metrics"
	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
	"github.com/coder/websocket"
)

type fakeScheduler struct {
	mu           sync.Mutex
	send         func(realtime.Event)
	calls        []fakeSchedulerCall
	unsubscribes []fakeSchedulerCall
}

type fakeSchedulerCall struct {
	channel string
	params  realtime.SubscribeParams
}

func (f *fakeScheduler) Subscribe(channel string, params realtime.SubscribeParams, send func(realtime.Event)) (func(), error) {
	f.mu.Lock()
	f.calls = append(f.calls, fakeSchedulerCall{channel: channel, params: params})
	f.mu.Unlock()
	f.send = send
	send(realtime.Event{
		Type:      "aircraft:update",
		Channel:   channel,
		Source:    "test-provider",
		FetchedAt: time.Unix(0, 0).UTC().Format(time.RFC3339),
		Data:      map[string]any{"ac": []any{}},
	})
	return func() {
		f.mu.Lock()
		defer f.mu.Unlock()
		f.unsubscribes = append(f.unsubscribes, fakeSchedulerCall{channel: channel, params: params})
	}, nil
}

func (f *fakeScheduler) callCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.calls)
}

func (f *fakeScheduler) snapshotCalls() []fakeSchedulerCall {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]fakeSchedulerCall(nil), f.calls...)
}

func (f *fakeScheduler) snapshotUnsubscribes() []fakeSchedulerCall {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]fakeSchedulerCall(nil), f.unsubscribes...)
}

func TestFlightAwareSubscribeRequiresProviderGrant(t *testing.T) {
	scheduler := &fakeScheduler{}
	handler := NewHandler(scheduler, metrics.New(), nil, WithRealtimeAuthSecret("test-secret"))
	server := httptest.NewServer(http.HandlerFunc(handler.Handle))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	url := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("Dial returned error: %v", err)
	}
	defer conn.CloseNow()
	_ = readJSON(t, ctx, conn)

	writeJSON(t, ctx, conn, map[string]any{
		"type":    "subscribe",
		"channel": "route:DAL58",
		"params":  map[string]any{"routeProvider": "flightaware"},
	})
	if msg := readJSON(t, ctx, conn); msg["type"] != "subscribe:error" {
		t.Fatalf("unauthorized subscribe = %#v", msg)
	}
	if scheduler.callCount() != 0 {
		t.Fatalf("unauthorized subscribe reached scheduler: %#v", scheduler.snapshotCalls())
	}

	token := signTestProviderGrant(t, "flightaware", "test-secret", time.Now().Add(time.Minute))
	writeJSON(t, ctx, conn, map[string]any{
		"type":    "subscribe",
		"channel": "route:DAL58",
		"params": map[string]any{
			"routeProvider":      "flightaware",
			"realtimeAuthToken":  token,
			"irrelevantMetadata": "kept",
		},
	})
	receivedReady := false
	for !receivedReady {
		msg := readJSON(t, ctx, conn)
		if msg["type"] == "subscribed:ready" {
			receivedReady = true
		}
	}
	calls := scheduler.snapshotCalls()
	if len(calls) != 1 {
		t.Fatalf("scheduler calls = %#v", calls)
	}
	params := calls[0].params
	if params["routeProvider"] != "flightaware" || params["realtimeAuthToken"] != nil {
		t.Fatalf("authorized params = %#v", params)
	}
}

func TestSubscriptionKeyIncludesParamSensitiveModes(t *testing.T) {
	scheduler := &fakeScheduler{}
	handler := NewHandler(scheduler, metrics.New(), nil, WithRealtimeAuthSecret("test-secret"))
	server := httptest.NewServer(http.HandlerFunc(handler.Handle))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	url := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("Dial returned error: %v", err)
	}
	defer conn.CloseNow()
	_ = readJSON(t, ctx, conn)

	writeJSON(t, ctx, conn, map[string]any{
		"type":    "subscribe",
		"channel": "route:DAL58",
		"params":  map[string]any{"routeProvider": "adsbdb"},
	})
	token := signTestProviderGrant(t, "flightaware", "test-secret", time.Now().Add(time.Minute))
	writeJSON(t, ctx, conn, map[string]any{
		"type":    "subscribe",
		"channel": "route:DAL58",
		"params": map[string]any{
			"routeProvider":     "flightaware",
			"realtimeAuthToken": token,
		},
	})

	for scheduler.callCount() < 2 {
		_ = readJSON(t, ctx, conn)
	}
	calls := scheduler.snapshotCalls()
	if calls[0].params["routeProvider"] != "adsbdb" ||
		calls[1].params["routeProvider"] != "flightaware" {
		t.Fatalf("scheduler calls = %#v", calls)
	}

	writeJSON(t, ctx, conn, map[string]any{
		"type":    "unsubscribe",
		"channel": "route:DAL58",
		"params":  map[string]any{"routeProvider": "flightaware"},
	})
	receivedRemoved := false
	for !receivedRemoved {
		if msg := readJSON(t, ctx, conn); msg["type"] == "subscribed:removed" {
			receivedRemoved = true
		}
	}
	unsubscribes := scheduler.snapshotUnsubscribes()
	if len(unsubscribes) != 1 || unsubscribes[0].params["routeProvider"] != "flightaware" {
		t.Fatalf("unsubscribes = %#v", unsubscribes)
	}
}

func TestAllowedOriginRules(t *testing.T) {
	cases := map[string]bool{
		"":                      true,
		"http://localhost:3000": true,
		"https://adsbao.dev":    true,
		"https://adsbao-preview.example": false,
		"https://evil.example":           false,
	}
	for origin, want := range cases {
		if got := IsAllowedOrigin(origin, nil); got != want {
			t.Fatalf("IsAllowedOrigin(%q) = %v, want %v", origin, got, want)
		}
	}
	if !IsAllowedOrigin("https://staging.example", []string{"https://staging.example"}) {
		t.Fatal("extra allowed origin should be accepted")
	}
}

func signTestProviderGrant(t *testing.T, provider, secret string, expiresAt time.Time) string {
	t.Helper()
	payload, err := json.Marshal(map[string]any{
		"provider": provider,
		"exp":      expiresAt.Unix(),
	})
	if err != nil {
		t.Fatalf("Marshal grant returned error: %v", err)
	}
	payloadSegment := base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payloadSegment))
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return payloadSegment + "." + signature
}

func TestWebSocketProtocolReadySubscribePingUnsubscribe(t *testing.T) {
	m := metrics.New()
	handler := NewHandler(&fakeScheduler{}, m, nil)
	server := httptest.NewServer(http.HandlerFunc(handler.Handle))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	url := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("Dial returned error: %v", err)
	}
	defer conn.CloseNow()

	ready := readJSON(t, ctx, conn)
	if ready["type"] != "connection:ready" {
		t.Fatalf("ready event = %#v", ready)
	}
	if data := ready["data"].(map[string]any); data["maxSubscriptions"].(float64) != 96 {
		t.Fatalf("ready data = %#v", data)
	}

	writeJSON(t, ctx, conn, map[string]any{
		"type":    "subscribe",
		"channel": "traffic:center:42.3656:-71.0096:40",
	})
	receivedUpdate := false
	receivedReady := false
	for !receivedUpdate || !receivedReady {
		msg := readJSON(t, ctx, conn)
		switch msg["type"] {
		case "aircraft:update":
			receivedUpdate = true
			if msg["channel"] != "traffic:center:42.4:-71:40" {
				t.Fatalf("update channel = %#v", msg["channel"])
			}
		case "subscribed:ready":
			receivedReady = true
		default:
			t.Fatalf("unexpected message: %#v", msg)
		}
	}

	writeJSON(t, ctx, conn, map[string]any{"type": "ping"})
	if pong := readJSON(t, ctx, conn); pong["type"] != "pong" {
		t.Fatalf("pong = %#v", pong)
	}

	writeJSON(t, ctx, conn, map[string]any{
		"type":    "unsubscribe",
		"channel": "traffic:center:42.3656:-71.0096:40",
	})
	if removed := readJSON(t, ctx, conn); removed["type"] != "subscribed:removed" {
		t.Fatalf("removed = %#v", removed)
	}
}

func readJSON(t *testing.T, ctx context.Context, conn *websocket.Conn) map[string]any {
	t.Helper()
	_, data, err := conn.Read(ctx)
	if err != nil {
		t.Fatalf("Read returned error: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal returned error: %v; payload=%s", err, data)
	}
	return decoded
}

func writeJSON(t *testing.T, ctx context.Context, conn *websocket.Conn, payload map[string]any) {
	t.Helper()
	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("Marshal returned error: %v", err)
	}
	if err := conn.Write(ctx, websocket.MessageText, data); err != nil {
		t.Fatalf("Write returned error: %v", err)
	}
}

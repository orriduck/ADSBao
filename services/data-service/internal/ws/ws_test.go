package ws

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/metrics"
	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
	"github.com/coder/websocket"
)

type fakeScheduler struct {
	send func(realtime.Event)
}

func (f *fakeScheduler) Subscribe(channel string, params realtime.SubscribeParams, send func(realtime.Event)) (func(), error) {
	f.send = send
	send(realtime.Event{
		Type:      "aircraft:update",
		Channel:   channel,
		Source:    "test-provider",
		FetchedAt: time.Unix(0, 0).UTC().Format(time.RFC3339),
		Data:      map[string]any{"ac": []any{}},
	})
	return func() {}, nil
}

func TestAllowedOriginRules(t *testing.T) {
	cases := map[string]bool{
		"":                      true,
		"http://localhost:3000": true,
		"https://adsbao.dev":    true,
		"https://adsbao-git-codex-realtime-data-service-orriduck.vercel.app": true,
		"https://evil.example":                     false,
		"https://adsbao-attacker-other.vercel.app": false,
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

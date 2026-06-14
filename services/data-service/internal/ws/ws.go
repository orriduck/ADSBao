package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/channels"
	"github.com/adsbao/adsbao/services/data-service/internal/metrics"
	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
	"github.com/coder/websocket"
)

var defaultAllowedOrigins = map[string]bool{
	"http://localhost:3000":  true,
	"http://127.0.0.1:3000":  true,
	"https://adsbao.dev":     true,
	"https://www.adsbao.dev": true,
}

type Scheduler interface {
	Subscribe(channel string, params realtime.SubscribeParams, send func(realtime.Event)) (func(), error)
}

type realtimeConn interface {
	Read(context.Context) (websocket.MessageType, []byte, error)
	Write(context.Context, websocket.MessageType, []byte) error
	Close(websocket.StatusCode, string) error
}

type Handler struct {
	scheduler                 Scheduler
	metrics                   *metrics.Metrics
	path                      string
	allowedOrigins            []string
	maxSubscriptionsPerSocket int
	realtimeAuthSecret        string
	writeTimeout              time.Duration
}

type Option func(*Handler)

func WithPath(path string) Option {
	return func(h *Handler) { h.path = path }
}

func WithMaxSubscriptions(max int) Option {
	return func(h *Handler) { h.maxSubscriptionsPerSocket = max }
}

func WithRealtimeAuthSecret(secret string) Option {
	return func(h *Handler) { h.realtimeAuthSecret = strings.TrimSpace(secret) }
}

func WithWriteTimeout(timeout time.Duration) Option {
	return func(h *Handler) { h.writeTimeout = timeout }
}

func NewHandler(scheduler Scheduler, metrics *metrics.Metrics, allowedOrigins []string, opts ...Option) *Handler {
	h := &Handler{
		scheduler:                 scheduler,
		metrics:                   metrics,
		path:                      "/ws",
		allowedOrigins:            allowedOrigins,
		maxSubscriptionsPerSocket: 96,
		writeTimeout:              5 * time.Second,
	}
	for _, opt := range opts {
		opt(h)
	}
	return h
}

func IsAllowedOrigin(origin string, extraAllowedOrigins []string) bool {
	if origin == "" {
		return true
	}
	normalized := normalizeOrigin(origin)
	if normalized == "" {
		return false
	}
	if defaultAllowedOrigins[normalized] {
		return true
	}
	for _, item := range extraAllowedOrigins {
		if normalizeOrigin(item) == normalized {
			return true
		}
	}
	return isAdsbaoVercelPreviewOrigin(normalized)
}

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != h.path {
		h.recordUpgrade("path", "rejected")
		http.NotFound(w, r)
		return
	}
	if !IsAllowedOrigin(r.Header.Get("Origin"), h.allowedOrigins) {
		h.recordUpgrade("origin", "rejected")
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if err != nil {
		h.recordUpgrade("origin", "rejected")
		return
	}
	h.recordUpgrade("ok", "accepted")
	client := &clientConn{
		conn:          conn,
		metrics:       h.metrics,
		scheduler:     h.scheduler,
		maxSubs:       h.maxSubscriptionsPerSocket,
		openedAt:      time.Now(),
		authSecret:    h.realtimeAuthSecret,
		writeTimeout:  h.writeTimeout,
		subscriptions: map[string]func(){},
	}
	client.run(r.Context())
}

func (h *Handler) recordUpgrade(reason, result string) {
	if h.metrics != nil {
		h.metrics.RecordWSUpgrade(reason, result)
	}
}

type clientConn struct {
	conn          realtimeConn
	metrics       *metrics.Metrics
	scheduler     Scheduler
	maxSubs       int
	openedAt      time.Time
	authSecret    string
	writeTimeout  time.Duration
	writeMu       sync.Mutex
	subscriptions map[string]func()
}

type clientMessage struct {
	Type    string                   `json:"type"`
	Channel string                   `json:"channel"`
	Params  realtime.SubscribeParams `json:"params"`
}

func (c *clientConn) run(ctx context.Context) {
	if c.metrics != nil {
		c.metrics.RecordWSConnectionOpened()
	}
	defer c.detach("unknown", "closed")
	c.send(ctx, realtime.Event{
		Type:      "connection:ready",
		Channel:   "session",
		Source:    "adsbao-data-service",
		FetchedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Stale:     false,
		Data: map[string]any{
			"maxSubscriptions": c.maxSubs,
		},
	})
	for {
		typ, data, err := c.conn.Read(ctx)
		if err != nil {
			if status := websocket.CloseStatus(err); status != -1 {
				c.detach(int(status), "closed")
			} else {
				c.detach("error", "error")
			}
			return
		}
		if typ != websocket.MessageText {
			c.recordMessage("inbound", "invalid", "error", len(data))
			c.sendRaw(ctx, map[string]any{"type": "error", "error": "Invalid JSON message"})
			continue
		}
		var msg clientMessage
		if err := json.Unmarshal(data, &msg); err != nil || msg.Type == "" {
			c.recordMessage("inbound", "invalid", "error", len(data))
			c.sendRaw(ctx, map[string]any{"type": "error", "error": "Invalid JSON message"})
			continue
		}
		c.recordMessage("inbound", msg.Type, "ok", len(data))
		c.handleMessage(ctx, msg)
	}
}

func (c *clientConn) detach(code any, result string) {
	if c.subscriptions == nil {
		return
	}
	for _, unsubscribe := range c.subscriptions {
		unsubscribe()
	}
	c.subscriptions = nil
	if c.metrics != nil {
		c.metrics.RecordWSConnectionClosed(code, result, time.Since(c.openedAt).Milliseconds())
	}
	_ = c.conn.Close(websocket.StatusNormalClosure, "")
}

func (c *clientConn) handleMessage(ctx context.Context, msg clientMessage) {
	switch msg.Type {
	case "ping":
		c.sendRaw(ctx, map[string]any{"type": "pong", "now": time.Now().UTC().Format(time.RFC3339Nano)})
	case "unsubscribe":
		c.unsubscribe(ctx, msg.Channel, msg.Params)
	case "subscribe":
		c.subscribe(ctx, msg)
	default:
		c.sendRaw(ctx, map[string]any{"type": "error", "error": "Unsupported message type"})
	}
}

func (c *clientConn) subscribe(ctx context.Context, msg clientMessage) {
	normalized, err := channels.NormalizeName(msg.Channel)
	if err != nil {
		if c.metrics != nil {
			c.metrics.RecordWSSubscribe("unknown", "invalid")
		}
		c.sendRaw(ctx, map[string]any{"type": "subscribe:error", "channel": msg.Channel, "error": err.Error()})
		return
	}
	params, authorized := c.authorizeParams(msg.Params)
	if !authorized {
		if c.metrics != nil {
			c.metrics.RecordWSSubscribe(normalized.Type, "unauthorized")
		}
		c.sendRaw(ctx, map[string]any{"type": "subscribe:error", "channel": normalized.Channel, "error": "FlightAware realtime access requires authorization"})
		return
	}
	key := subscriptionKey(normalized.Channel, params)
	if _, exists := c.subscriptions[key]; exists {
		if c.metrics != nil {
			c.metrics.RecordWSSubscribe(normalized.Type, "duplicate")
		}
		c.sendRaw(ctx, map[string]any{"type": "subscribed:ready", "channel": normalized.Channel})
		return
	}
	if len(c.subscriptions) >= c.maxSubs {
		if c.metrics != nil {
			c.metrics.RecordWSSubscribe(normalized.Type, "limit")
		}
		c.sendRaw(ctx, map[string]any{"type": "subscribe:error", "channel": normalized.Channel, "error": "Socket subscription limit reached"})
		return
	}
	unsubscribe, err := c.scheduler.Subscribe(normalized.Channel, params, func(event realtime.Event) {
		c.send(context.Background(), event)
	})
	if err != nil {
		if c.metrics != nil {
			c.metrics.RecordWSSubscribe(normalized.Type, "error")
		}
		c.sendRaw(ctx, map[string]any{"type": "subscribe:error", "channel": normalized.Channel, "error": err.Error()})
		return
	}
	c.subscriptions[key] = unsubscribe
	if c.metrics != nil {
		c.metrics.RecordWSSubscribe(normalized.Type, "ok")
	}
	c.sendRaw(ctx, map[string]any{"type": "subscribed:ready", "channel": normalized.Channel})
}

func (c *clientConn) unsubscribe(ctx context.Context, channel string, params realtime.SubscribeParams) {
	normalized, err := channels.NormalizeName(channel)
	if err != nil {
		if c.metrics != nil {
			c.metrics.RecordWSUnsubscribe("unknown", "invalid")
		}
		return
	}
	key := ""
	if len(params) > 0 {
		if candidate := subscriptionKey(normalized.Channel, params); c.subscriptions[candidate] != nil {
			key = candidate
		}
	}
	if key == "" {
		for itemKey := range c.subscriptions {
			if itemKey == normalized.Channel || strings.HasPrefix(itemKey, normalized.Channel+":") {
				key = itemKey
				break
			}
		}
	}
	unsubscribe := c.subscriptions[key]
	if key == "" || unsubscribe == nil {
		if c.metrics != nil {
			c.metrics.RecordWSUnsubscribe(normalized.Type, "invalid")
		}
		return
	}
	unsubscribe()
	delete(c.subscriptions, key)
	if c.metrics != nil {
		c.metrics.RecordWSUnsubscribe(normalized.Type, "ok")
	}
	c.sendRaw(ctx, map[string]any{"type": "subscribed:removed", "channel": normalized.Channel})
}

func (c *clientConn) send(ctx context.Context, event realtime.Event) {
	c.sendRaw(ctx, event)
}

func (c *clientConn) sendRaw(ctx context.Context, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	typ := payloadType(payload)
	writeCtx := ctx
	cancel := func() {}
	if c.writeTimeout > 0 {
		writeCtx, cancel = context.WithTimeout(ctx, c.writeTimeout)
	}
	defer cancel()
	c.writeMu.Lock()
	err = c.conn.Write(writeCtx, websocket.MessageText, data)
	c.writeMu.Unlock()
	result := "ok"
	if err != nil {
		result = "error"
		_ = c.conn.Close(websocket.StatusPolicyViolation, "write failed")
	}
	c.recordMessage("outbound", typ, result, len(data))
}

func (c *clientConn) authorizeParams(params realtime.SubscribeParams) (realtime.SubscribeParams, bool) {
	copied := copyParams(params)
	if !requiresFlightAwareGrant(copied) {
		delete(copied, realtimeAuthTokenParam)
		return copied, true
	}
	token, _ := copied[realtimeAuthTokenParam].(string)
	if !verifyProviderGrant(token, "flightaware", c.authSecret, time.Now()) {
		return nil, false
	}
	delete(copied, realtimeAuthTokenParam)
	return copied, true
}

func copyParams(params realtime.SubscribeParams) realtime.SubscribeParams {
	if len(params) == 0 {
		return realtime.SubscribeParams{}
	}
	copied := make(realtime.SubscribeParams, len(params))
	for key, value := range params {
		copied[key] = value
	}
	return copied
}

func requiresFlightAwareGrant(params realtime.SubscribeParams) bool {
	return readBoolParam(params["flightAware"]) || strings.EqualFold(strings.TrimSpace(fmt.Sprint(params["routeProvider"])), "flightaware")
}

func readBoolParam(value any) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		return strings.EqualFold(strings.TrimSpace(typed), "true")
	default:
		return false
	}
}

func subscriptionKey(channel string, params realtime.SubscribeParams) string {
	target, err := channels.PollingTarget(channel, params)
	if err != nil {
		return channel
	}
	return channels.SchedulerKey(channel, target)
}

func (c *clientConn) recordMessage(direction, typ, result string, bytes int) {
	if c.metrics != nil {
		c.metrics.RecordWSMessage(direction, typ, result, bytes)
	}
}

func payloadType(payload any) string {
	data, err := json.Marshal(payload)
	if err != nil {
		return "unknown"
	}
	var decoded struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &decoded); err != nil || decoded.Type == "" {
		return "unknown"
	}
	return decoded.Type
}

func normalizeOrigin(origin string) string {
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}
	return parsed.Scheme + "://" + parsed.Host
}

func isAdsbaoVercelPreviewOrigin(origin string) bool {
	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}
	return parsed.Scheme == "https" &&
		strings.HasPrefix(parsed.Hostname(), "adsbao-") &&
		strings.HasSuffix(parsed.Hostname(), "-orriduck.vercel.app")
}

func (c *clientConn) String() string {
	return fmt.Sprintf("clientConn{subscriptions:%d}", len(c.subscriptions))
}

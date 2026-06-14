package metrics

import (
	"strings"
	"testing"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

func TestMetricsPreserveNamesAndLowCardinalityLabels(t *testing.T) {
	m := New()
	m.RecordWSUpgrade("ok", "accepted")
	m.RecordWSConnectionOpened()
	m.RecordWSConnectionClosed("1000", "closed", 1250)
	m.RecordWSMessage("inbound", "subscribe", "ok", 64)
	m.RecordWSSubscribe(realtime.ChannelTraffic, "ok")
	m.RecordWSUnsubscribe(realtime.ChannelTraffic, "ok")
	m.RecordPoll(realtime.ChannelTraffic, "adsb.lol", "success", 123)
	m.RecordExternalRequest(realtime.ExternalRequestMetricInput{
		Provider:   "adsb.lol",
		Endpoint:   "positions",
		Result:     "success",
		Status:     200,
		DurationMS: 123,
	})

	lastFetched := "1970-01-01T00:00:00.000Z"
	out, err := m.Render(10, []realtime.DebugChannel{
		{
			Key:                 "traffic:center:42.4:-71:40",
			Channel:             "traffic:center:42.4:-71:40",
			Type:                realtime.ChannelTraffic,
			SubscriberCount:     2,
			CurrentIntervalMS:   5000,
			LastFetchedAt:       &lastFetched,
			Stale:               true,
			ConsecutiveFailures: 2,
		},
	})
	if err != nil {
		t.Fatalf("Render returned error: %v", err)
	}

	required := []string{
		"adsbao_ws_connections_current 0",
		`adsbao_ws_upgrades_total{reason="ok",result="accepted"} 1`,
		`adsbao_ws_disconnects_total{close_code="1000",result="closed"} 1`,
		`adsbao_ws_messages_total{direction="inbound",result="ok",type="subscribe"} 1`,
		`adsbao_ws_subscribe_total{channel_type="traffic",result="ok"} 1`,
		`adsbao_ws_unsubscribe_total{channel_type="traffic",result="ok"} 1`,
		`adsbao_active_channels_current{channel_type="traffic"} 1`,
		`adsbao_subscriptions_current{channel_type="traffic"} 2`,
		`adsbao_channel_consecutive_failures_current{channel_type="traffic"} 2`,
		`adsbao_channel_poll_interval_seconds{channel_type="traffic"} 5`,
		`adsbao_stale_channels_current{channel_type="traffic"} 1`,
		`adsbao_poll_requests_total{channel_type="traffic",result="success",source="adsb.lol"} 1`,
		`adsbao_external_requests_total{endpoint="positions",provider="adsb.lol",result="success",status="200",status_class="2xx"} 1`,
	}
	for _, needle := range required {
		if !strings.Contains(out, needle) {
			t.Fatalf("metrics output missing %q\n%s", needle, out)
		}
	}
	if strings.Contains(out, "traffic:center:42.4") {
		t.Fatalf("metrics output contains high-cardinality channel name:\n%s", out)
	}
}

func TestMetricsExposeZeroSeriesForIdleChannelTypes(t *testing.T) {
	m := New()
	out, err := m.Render(10, nil)
	if err != nil {
		t.Fatalf("Render returned error: %v", err)
	}

	for _, channelType := range []string{"aircraft", "callsign", "route", "traffic"} {
		required := []string{
			`adsbao_active_channels_current{channel_type="` + channelType + `"} 0`,
			`adsbao_subscriptions_current{channel_type="` + channelType + `"} 0`,
			`adsbao_channel_consecutive_failures_current{channel_type="` + channelType + `"} 0`,
			`adsbao_channel_poll_interval_seconds{channel_type="` + channelType + `"} 0`,
			`adsbao_stale_channels_current{channel_type="` + channelType + `"} 0`,
		}
		for _, needle := range required {
			if !strings.Contains(out, needle) {
				t.Fatalf("metrics output missing %q\n%s", needle, out)
			}
		}
	}
}

package channels

import (
	"reflect"
	"testing"

	"github.com/adsbao/adsbao/services/data-service-go/internal/realtime"
)

func TestNormalizeTrafficCenterChannel(t *testing.T) {
	got, err := NormalizeName(" traffic:center:42.365:-71.009:37.8 ")
	if err != nil {
		t.Fatalf("NormalizeName returned error: %v", err)
	}
	if got.Channel != "traffic:center:42.4:-71:38" {
		t.Fatalf("channel = %q", got.Channel)
	}
	if got.Type != realtime.ChannelTraffic {
		t.Fatalf("type = %q", got.Type)
	}

	target, err := PollingTarget(got.Channel, nil)
	if err != nil {
		t.Fatalf("PollingTarget returned error: %v", err)
	}
	want := realtime.PollingTarget{Kind: "positions", Lat: 42.4, Lon: -71, DistNM: 38}
	if !reflect.DeepEqual(target, want) {
		t.Fatalf("target = %#v, want %#v", target, want)
	}
}

func TestNormalizeRouteChannelsAndParams(t *testing.T) {
	got, err := NormalizeName("route:aal123:airport:kbos")
	if err != nil {
		t.Fatalf("NormalizeName returned error: %v", err)
	}
	if got.Channel != "route:AAL123:airport:KBOS" {
		t.Fatalf("channel = %q", got.Channel)
	}
	target, err := PollingTarget(got.Channel, realtime.SubscribeParams{"routeProvider": "flightaware"})
	if err != nil {
		t.Fatalf("PollingTarget returned error: %v", err)
	}
	if target.Kind != "route" || target.Callsign != "AAL123" || target.RouteProvider != "flightaware" {
		t.Fatalf("target = %#v", target)
	}
	if target.RouteContext == nil || target.RouteContext.Type != "airport" || target.RouteContext.ICAO != "KBOS" {
		t.Fatalf("route context = %#v", target.RouteContext)
	}

	center, err := NormalizeName("route:aal123:center:42.365:-71.009")
	if err != nil {
		t.Fatalf("NormalizeName returned error: %v", err)
	}
	if center.Channel != "route:AAL123:center:42.4:-71" {
		t.Fatalf("center channel = %q", center.Channel)
	}
}

func TestRejectUnsupportedTrafficAirportChannel(t *testing.T) {
	if _, err := NormalizeName("traffic:airport:KBOS:42.365:-71.009:40"); err == nil {
		t.Fatal("traffic:airport should be rejected by the current contract")
	}
}

func TestBuildSchedulerKeyIncludesParamSensitiveModes(t *testing.T) {
	callsignTarget, err := PollingTarget("callsign:DAL58", realtime.SubscribeParams{"flightAware": true})
	if err != nil {
		t.Fatalf("PollingTarget returned error: %v", err)
	}
	if got := SchedulerKey("callsign:DAL58", callsignTarget); got != "callsign:DAL58:mode:flightaware" {
		t.Fatalf("callsign key = %q", got)
	}

	routeTarget, err := PollingTarget("route:DAL58", realtime.SubscribeParams{"routeProvider": "adsbdb"})
	if err != nil {
		t.Fatalf("PollingTarget returned error: %v", err)
	}
	if got := SchedulerKey("route:DAL58", routeTarget); got != "route:DAL58:provider:adsbdb" {
		t.Fatalf("route key = %q", got)
	}
}

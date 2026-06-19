package webapi

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func jsonResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

func imageResponse(status int, contentType string, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Header:     http.Header{"Content-Type": []string{contentType}},
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

func TestAircraftPositionsRouteUsesUnifiedFetcher(t *testing.T) {
	var got realtime.FetchInput
	handler := New(Options{
		AircraftFetcher: func(ctx context.Context, input realtime.FetchInput) (realtime.Event, error) {
			got = input
			return realtime.Event{
				Type:      "aircraft:update",
				Channel:   input.Channel,
				Source:    "airplanes.live",
				FetchedAt: "2026-06-16T00:00:00Z",
				Data: map[string]any{
					"source":   "airplanes.live",
					"attempts": []string{"adsb.lol:ERR", "airplanes.live:200"},
					"ac": []any{
						map[string]any{
							"hex":    "a1",
							"flight": "TEST1",
							"lat":    42.4,
							"lon":    -71.0,
						},
					},
				},
			}, nil
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/aircraft/positions/42.3656/-71.0096/40", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
	if got.Channel != "traffic:center:42.4:-71:40" ||
		got.ChannelType != realtime.ChannelTraffic ||
		got.Target.Kind != "positions" ||
		got.Target.Lat != 42.4 ||
		got.Target.Lon != -71 ||
		got.Target.DistNM != 40 {
		t.Fatalf("fetch input = %#v", got)
	}
	if rr.Header().Get("X-Data-Source") != "airplanes.live" {
		t.Fatalf("source header = %q", rr.Header().Get("X-Data-Source"))
	}
	if rr.Header().Get("X-Provider-Attempts") != "adsb.lol:ERR;airplanes.live:200" {
		t.Fatalf("attempts header = %q", rr.Header().Get("X-Provider-Attempts"))
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if payload["source"] != "airplanes.live" {
		t.Fatalf("payload = %#v", payload)
	}
}

func TestAirlineLogoUsesFlightAwarePrivateServiceWhenConfigured(t *testing.T) {
	handler := New(Options{
		FlightAwareServiceBaseURL: "https://flightaware-private.example",
		FlightAwareServiceToken:   "remote-token",
		HTTPClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				if req.URL.String() != "https://flightaware-private.example/api/flightaware/airline-logo/DAL" {
					t.Fatalf("unexpected upstream URL %q", req.URL.String())
				}
				if req.Header.Get("Authorization") != "Bearer remote-token" {
					t.Fatalf("authorization = %q", req.Header.Get("Authorization"))
				}
				return imageResponse(http.StatusOK, "image/png", "png"), nil
			}),
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/airlines/DAL", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
	if rr.Header().Get("Content-Type") != "image/png" ||
		rr.Header().Get("X-Data-Source") != "flightaware" ||
		rr.Body.String() != "png" {
		t.Fatalf("response headers/body = %s %#v", rr.Body.String(), rr.Header())
	}
}

func TestAircraftTraceUpstreamFailureReturnsEmptyTrace(t *testing.T) {
	handler := New(Options{
		HTTPClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				if req.URL.Host != "adsb.lol" {
					t.Fatalf("unexpected upstream host %q", req.URL.Host)
				}
				return jsonResponse(http.StatusServiceUnavailable, `{"error":"try later"}`), nil
			}),
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/aircraft/trace/C00DEA", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
	if rr.Header().Get("X-Provider-Attempts") != "adsb.lol:503" {
		t.Fatalf("attempts header = %q", rr.Header().Get("X-Provider-Attempts"))
	}
	if rr.Header().Get("X-Upstream-Status") != "503" {
		t.Fatalf("upstream status header = %q", rr.Header().Get("X-Upstream-Status"))
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if payload["traceUnavailable"] != true || payload["source"] != "adsb.lol" {
		t.Fatalf("payload = %#v", payload)
	}
	recent, ok := payload["recent"].(map[string]any)
	if !ok {
		t.Fatalf("recent payload = %#v", payload["recent"])
	}
	trace, ok := recent["trace"].([]any)
	if !ok || len(trace) != 0 {
		t.Fatalf("trace = %#v", recent["trace"])
	}
}

func TestAircraftPhotoUpstreamForbiddenReturnsEmptyPhoto(t *testing.T) {
	handler := New(Options{
		HTTPClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				if req.URL.Host != "api.planespotters.net" {
					t.Fatalf("unexpected upstream host %q", req.URL.Host)
				}
				userAgent := req.Header.Get("User-Agent")
				if !strings.Contains(userAgent, "+https://adsbao.dev") {
					t.Fatalf("user agent missing contact URL: %q", userAgent)
				}
				if req.URL.Query().Get("reg") != "C-FFGZ" || req.URL.Query().Get("icaoType") != "A321" {
					t.Fatalf("unexpected upstream query %q", req.URL.RawQuery)
				}
				return jsonResponse(http.StatusForbidden, `{"error":"forbidden"}`), nil
			}),
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/aircraft/photos/C00DEA?registration=C-FFGZ&type=A321", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
	if rr.Header().Get("X-Provider-Attempts") != "planespotters.net:403" {
		t.Fatalf("attempts header = %q", rr.Header().Get("X-Provider-Attempts"))
	}
	if rr.Header().Get("X-Upstream-Status") != "403" {
		t.Fatalf("upstream status header = %q", rr.Header().Get("X-Upstream-Status"))
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if payload["photo"] != nil ||
		payload["photoUnavailable"] != true ||
		payload["source"] != "planespotters.net" {
		t.Fatalf("payload = %#v", payload)
	}
}

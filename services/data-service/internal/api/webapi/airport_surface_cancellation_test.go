package webapi

import (
	"context"
	"net/http"
	"testing"
)

type airportSurfaceCancelOnReadBody struct {
	cancel context.CancelFunc
}

func (body *airportSurfaceCancelOnReadBody) Read([]byte) (int, error) {
	body.cancel()
	return 0, context.Canceled
}

func (body *airportSurfaceCancelOnReadBody) Close() error {
	return nil
}

func TestAirportSurfaceCancellationStopsFallbacks(t *testing.T) {
	for _, scope := range []string{
		airportSurfaceScopePavement,
		airportSurfaceScopeStructures,
	} {
		t.Run(scope, func(t *testing.T) {
			ctx, cancel := context.WithCancel(context.Background())
			t.Cleanup(cancel)

			overpassHits := 0
			osmHits := 0
			handler := New(Options{
				HTTPClient: &http.Client{
					Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
						switch req.URL.Host {
						case "overpass.invalid":
							overpassHits++
							return &http.Response{
								StatusCode: http.StatusOK,
								Header:     http.Header{"Content-Type": []string{"application/json"}},
								Body:       &airportSurfaceCancelOnReadBody{cancel: cancel},
								Request:    req,
							}, nil
						case "api.openstreetmap.org":
							osmHits++
							return nil, context.Canceled
						default:
							t.Fatalf("unexpected upstream host %q", req.URL.Host)
							return nil, context.Canceled
						}
					}),
				},
				OverpassBaseURL: "https://overpass.invalid/api/interpreter",
			})

			surfaceMap := handler.airportSurfaceMap(
				ctx,
				"KPHL",
				39.8744,
				-75.2424,
				nil,
				scope,
			)
			if surfaceMap != nil {
				t.Fatalf("expected no surface map after cancellation, got %#v", surfaceMap)
			}
			if overpassHits != 1 {
				t.Fatalf("overpass hits = %d", overpassHits)
			}
			if osmHits != 0 {
				t.Fatalf("OSM fallback should not run after cancellation, hits=%d", osmHits)
			}
		})
	}
}

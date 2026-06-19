package webapi

import (
	"testing"
)

func TestMergeMapSettingsPreservesExistingLayerOverrides(t *testing.T) {
	current := map[string]any{
		"selectedMode": "custom",
		"baseMode":     "controller",
		"layerOverrides": map[string]any{
			"mapLabels":     false,
			"showCallsigns": true,
		},
		"baseLayer":       "terrain",
		"audioEnabled":    true,
		"hasSelectedMode": true,
	}

	next := mergeMapSettings(current, map[string]any{
		"layerOverrides": map[string]any{
			"airspaces":       true,
			"reportingPoints": true,
		},
	})

	layers := next["layerOverrides"].(map[string]any)
	if layers["mapLabels"] != false || layers["showCallsigns"] != true || layers["airspaces"] != true || layers["reportingPoints"] != true {
		t.Fatalf("expected merged layer overrides, got %#v", layers)
	}
	if next["baseLayer"] != "terrain" {
		t.Fatalf("expected base layer to remain terrain, got %#v", next["baseLayer"])
	}
}

func TestNormalizeRouteFeedbackInputRejectsSameAirport(t *testing.T) {
	_, message := normalizeRouteFeedbackInput(map[string]any{
		"callsign":        "DAL58",
		"originIcao":      "KBOS",
		"destinationIcao": "KBOS",
	})
	if message != "Origin and destination must differ" {
		t.Fatalf("expected same-airport validation error, got %q", message)
	}
}

func TestBuildRouteFeedbackSpec(t *testing.T) {
	input, message := normalizeRouteFeedbackInput(map[string]any{
		"callsign":          " dal58 ",
		"originIcao":        "KBOS",
		"destinationIcao":   "EGLL",
		"targetAirportIata": "BOS",
		"feedbackReason":    "correction",
	})
	if message != "" {
		t.Fatalf("expected valid input, got %q", message)
	}

	spec := buildRouteFeedbackSpec(input, map[string]any{
		"icao": "KBOS", "iata": "BOS", "name": "Boston Logan", "country": "US", "lat": 42.3656, "lon": -71.0096,
	}, map[string]any{
		"icao": "EGLL", "iata": "LHR", "name": "Heathrow", "country": "GB", "lat": 51.47, "lon": -0.4543,
	})
	if spec == nil {
		t.Fatal("expected route feedback spec")
	}
	route := spec["route"].(map[string]any)
	if route["source"] != feedbackSource {
		t.Fatalf("expected community feedback source, got %#v", route["source"])
	}
	routeCodes := route["route"].(map[string]any)
	if routeCodes["icao"] != "KBOS-EGLL" || routeCodes["iata"] != "BOS-LHR" {
		t.Fatalf("unexpected route codes: %#v", routeCodes)
	}
	record := spec["record"].(map[string]any)
	if record["cacheKey"] != "DAL58|BOS" {
		t.Fatalf("unexpected cache key: %#v", record["cacheKey"])
	}
}

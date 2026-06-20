package webapi

import (
	"testing"
	"time"
)

func TestMapAirspacePreservesOpenAIPAccessMetadata(t *testing.T) {
	mapped := mapAirspace(map[string]any{
		"_id":       "691b47fb7614098ca4d81f1d",
		"name":      "NEW YORK CLASS B AREA E",
		"type":      float64(0),
		"icaoClass": float64(1),
		"country":   "US",
		"lowerLimit": map[string]any{
			"value":          float64(1500),
			"unit":           float64(1),
			"referenceDatum": float64(1),
		},
		"upperLimit": map[string]any{
			"value":          float64(7000),
			"unit":           float64(1),
			"referenceDatum": float64(1),
		},
		"hoursOfOperation": map[string]any{
			"operatingHours": []any{},
		},
		"geometry": map[string]any{"type": "Polygon"},
	})

	if mapped["id"] != "691b47fb7614098ca4d81f1d" ||
		mapped["name"] != "NEW YORK CLASS B AREA E" ||
		mapped["type"] != "0" ||
		mapped["typeLabel"] != "Other" ||
		mapped["icaoClass"] != float64(1) ||
		mapped["classLabel"] != "B" ||
		mapped["lowerLimitLabel"] != "1500 ft MSL" ||
		mapped["upperLimitLabel"] != "7000 ft MSL" ||
		mapped["source"] != "openaip" {
		t.Fatalf("mapped airspace lost metadata: %#v", mapped)
	}

	accessTag, ok := mapped["accessTag"].(map[string]any)
	if !ok {
		t.Fatalf("missing accessTag: %#v", mapped["accessTag"])
	}
	if accessTag["level"] != "controlled" ||
		accessTag["label"] != "Controlled" ||
		accessTag["shortLabel"] != "Controlled" ||
		accessTag["requiresStatusCheck"] != false {
		t.Fatalf("unexpected accessTag: %#v", accessTag)
	}
}

func TestClassifyOpenAIPAirspaceAccessUsesActiveWindow(t *testing.T) {
	previousNow := openAIPAirspaceNow
	openAIPAirspaceNow = func() time.Time {
		return time.Date(2026, 5, 31, 16, 0, 0, 0, time.UTC)
	}
	defer func() {
		openAIPAirspaceNow = previousNow
	}()

	active := classifyOpenAIPAirspaceAccess(map[string]any{
		"type":        float64(openAIPAirspaceTypeDanger),
		"activeFrom":  "2026-05-31T12:00:00.000Z",
		"activeUntil": "2026-05-31T18:00:00.000Z",
	})
	if active["level"] != "caution" ||
		active["requiresStatusCheck"] != false {
		t.Fatalf("expected active danger area caution without status check: %#v", active)
	}

	inactive := classifyOpenAIPAirspaceAccess(map[string]any{
		"type":        float64(openAIPAirspaceTypeTRA),
		"activeUntil": "2026-05-31T12:00:00.000Z",
	})
	if inactive["level"] != "informational" ||
		inactive["requiresStatusCheck"] != false {
		t.Fatalf("expected inactive TRA informational: %#v", inactive)
	}
}

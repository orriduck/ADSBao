package webapi

import (
	"database/sql"
	"math"
	"testing"
)

func TestBuildRunwayMapFromGeometryRows(t *testing.T) {
	runwayMap := buildRunwayMapFromGeometryRows("kbos", []runwayGeometryRow{
		{
			lengthFt:      sql.NullFloat64{Float64: 10_083, Valid: true},
			widthFt:       sql.NullFloat64{Float64: 150, Valid: true},
			leIdent:       "22L",
			leLatitudeDeg: sql.NullFloat64{Float64: 42.377344, Valid: true},
			leLongitudeDeg: sql.NullFloat64{
				Float64: -70.999076,
				Valid:   true,
			},
			heIdent:       "04R",
			heLatitudeDeg: sql.NullFloat64{Float64: 42.35404, Valid: true},
			heLongitudeDeg: sql.NullFloat64{
				Float64: -71.010352,
				Valid:   true,
			},
		},
		{
			closed:        sql.NullBool{Bool: true, Valid: true},
			leIdent:       "01",
			leLatitudeDeg: sql.NullFloat64{Float64: 42.1, Valid: true},
			leLongitudeDeg: sql.NullFloat64{
				Float64: -71.1,
				Valid:   true,
			},
			heIdent:       "19",
			heLatitudeDeg: sql.NullFloat64{Float64: 42.2, Valid: true},
			heLongitudeDeg: sql.NullFloat64{
				Float64: -71.2,
				Valid:   true,
			},
		},
	})

	if runwayMap == nil {
		t.Fatal("expected runway map")
	}
	if runwayMap["airport"] != "KBOS" {
		t.Fatalf("unexpected airport: %#v", runwayMap["airport"])
	}
	runways := runwayMap["runways"].([]map[string]any)
	if len(runways) != 1 {
		t.Fatalf("expected one open runway, got %#v", runways)
	}
	runway := runways[0]
	if runway["id"] != "04R/22L" {
		t.Fatalf("expected sorted runway id, got %#v", runway["id"])
	}
	if runway["lengthFt"] != float64(10_083) || runway["widthFt"] != float64(150) {
		t.Fatalf("unexpected dimensions: %#v", runway)
	}
	centerline := runway["centerline"].(map[string]any)
	geometry := centerline["geometry"].(map[string]any)
	coordinates := geometry["coordinates"].([]any)
	first := coordinates[0].([]any)
	if first[0] != -71.010352 || first[1] != 42.35404 {
		t.Fatalf("unexpected first centerline coordinate: %#v", first)
	}
}

func TestBuildRunwayMapFromGeometryRowsReturnsNilWithoutValidRows(t *testing.T) {
	runwayMap := buildRunwayMapFromGeometryRows("KBOS", []runwayGeometryRow{
		{
			leIdent: "04R",
			heIdent: "22L",
		},
	})
	if runwayMap != nil {
		t.Fatalf("expected nil runway map, got %#v", runwayMap)
	}
}

func TestOpenAIPRunwaysBuildApproximateRunwayMap(t *testing.T) {
	airport := map[string]any{
		"icaoCode": "KJFK",
		"geometry": map[string]any{
			"type":        "Point",
			"coordinates": []any{-73.7781, 40.6413},
		},
	}
	runways := mapRunways([]map[string]any{
		{
			"_id":         "openaip-rwy",
			"designator":  "04L",
			"trueHeading": 40.0,
			"dimension": map[string]any{
				"length": map[string]any{"value": 3682.0},
				"width":  map[string]any{"value": 61.0},
			},
		},
	}, airport)

	if len(runways) != 1 {
		t.Fatalf("expected one runway, got %#v", runways)
	}
	runway := runways[0]
	le, he := runway["le"].(map[string]any), runway["he"].(map[string]any)
	if le["lat"] == nil || le["lon"] == nil || he["lat"] == nil || he["lon"] == nil {
		t.Fatalf("expected approximate endpoints, got %#v", runway)
	}
	if numberValue(he["lat"]) <= numberValue(le["lat"]) ||
		numberValue(he["lon"]) <= numberValue(le["lon"]) {
		t.Fatalf("unexpected endpoint orientation: le=%#v he=%#v", le, he)
	}

	runwayMap := buildRunwayMapFromMappedRunways("KJFK", runways, "OpenAIP")
	if runwayMap == nil {
		t.Fatal("expected runway map")
	}
	mapped := runwayMap["runways"].([]map[string]any)
	if len(mapped) != 1 || mapped[0]["id"] != "04L/22R" {
		t.Fatalf("unexpected runway map: %#v", runwayMap)
	}
	centerline := mapped[0]["centerline"].(map[string]any)
	coordinates := centerline["geometry"].(map[string]any)["coordinates"].([]any)
	first := coordinates[0].([]any)
	if math.Abs(numberValue(first[0])-numberValue(le["lon"])) > 0.0000001 ||
		math.Abs(numberValue(first[1])-numberValue(le["lat"])) > 0.0000001 {
		t.Fatalf("centerline did not use endpoint coordinates: %#v", coordinates)
	}
}

func TestOpenAIPDirectionalRunwaysDedupeToPhysicalRunways(t *testing.T) {
	runwayMap := buildRunwayMapFromMappedRunways("KJFK", []map[string]any{
		{
			"lengthFt": 11348,
			"widthFt":  200,
			"le": map[string]any{
				"ident": "04L",
				"lat":   40.621,
				"lon":   -73.795,
			},
			"he": map[string]any{
				"ident": "22R",
				"lat":   40.651,
				"lon":   -73.765,
			},
		},
		{
			"lengthFt": 11348,
			"widthFt":  200,
			"le": map[string]any{
				"ident": "22R",
				"lat":   40.651,
				"lon":   -73.765,
			},
			"he": map[string]any{
				"ident": "04L",
				"lat":   40.621,
				"lon":   -73.795,
			},
		},
		{
			"lengthFt": 10000,
			"widthFt":  200,
			"le": map[string]any{
				"ident": "13L",
				"lat":   40.64,
				"lon":   -73.8,
			},
			"he": map[string]any{
				"ident": "31R",
				"lat":   40.62,
				"lon":   -73.75,
			},
		},
	}, "OpenAIP")

	if runwayMap == nil {
		t.Fatal("expected runway map")
	}
	runways := runwayMap["runways"].([]map[string]any)
	if len(runways) != 2 {
		t.Fatalf("expected two physical runways, got %#v", runways)
	}
	if runways[0]["id"] != "04L/22R" || runways[1]["id"] != "13L/31R" {
		t.Fatalf("unexpected runway ids: %#v", runways)
	}
}

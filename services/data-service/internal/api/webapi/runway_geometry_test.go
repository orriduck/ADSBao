package webapi

import (
	"database/sql"
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

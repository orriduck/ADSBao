package webapi

import (
	"context"
	"database/sql"
	"sort"
	"strings"
)

type runwayGeometryRow struct {
	lengthFt       sql.NullFloat64
	widthFt        sql.NullFloat64
	closed         sql.NullBool
	leIdent        string
	leLatitudeDeg  sql.NullFloat64
	leLongitudeDeg sql.NullFloat64
	heIdent        string
	heLatitudeDeg  sql.NullFloat64
	heLongitudeDeg sql.NullFloat64
}

const runwayGeometrySelectColumns = `
	length_ft,
	width_ft,
	closed,
	le_ident,
	le_latitude_deg,
	le_longitude_deg,
	he_ident,
	he_latitude_deg,
	he_longitude_deg
`

func (s *UserDataStore) readRunwayMap(ctx context.Context, ident string) (map[string]any, error) {
	if s == nil || s.db == nil {
		return nil, nil
	}
	normalizedIdent := normalizeAirportIdent(ident)
	if normalizedIdent == "" {
		return nil, nil
	}
	rows, err := s.db.QueryContext(
		ctx,
		`select `+runwayGeometrySelectColumns+`
		 from runway_geometries
		 where source = $1
		   and airport_ident = $2
		 order by airport_ident asc, le_ident asc`,
		"ourairports",
		normalizedIdent,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	geometries := []runwayGeometryRow{}
	for rows.Next() {
		var row runwayGeometryRow
		if err := rows.Scan(
			&row.lengthFt,
			&row.widthFt,
			&row.closed,
			&row.leIdent,
			&row.leLatitudeDeg,
			&row.leLongitudeDeg,
			&row.heIdent,
			&row.heLatitudeDeg,
			&row.heLongitudeDeg,
		); err != nil {
			return nil, err
		}
		geometries = append(geometries, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return buildRunwayMapFromGeometryRows(normalizedIdent, geometries), nil
}

func buildRunwayMapFromGeometryRows(airport string, rows []runwayGeometryRow) map[string]any {
	normalizedAirport := normalizeAirportIdent(airport)
	if normalizedAirport == "" || len(rows) == 0 {
		return nil
	}

	runways := []map[string]any{}
	for _, row := range rows {
		if row.closed.Valid && row.closed.Bool {
			continue
		}
		if strings.TrimSpace(row.leIdent) == "" || strings.TrimSpace(row.heIdent) == "" {
			continue
		}
		if !row.leLatitudeDeg.Valid || !row.leLongitudeDeg.Valid || !row.heLatitudeDeg.Valid || !row.heLongitudeDeg.Valid {
			continue
		}
		ends := []map[string]any{
			{
				"ident": strings.ToUpper(strings.TrimSpace(row.leIdent)),
				"lat":   row.leLatitudeDeg.Float64,
				"lon":   row.leLongitudeDeg.Float64,
			},
			{
				"ident": strings.ToUpper(strings.TrimSpace(row.heIdent)),
				"lat":   row.heLatitudeDeg.Float64,
				"lon":   row.heLongitudeDeg.Float64,
			},
		}
		sort.Slice(ends, func(i, j int) bool {
			return runwayEndSortKey(ends[i]["ident"]) < runwayEndSortKey(ends[j]["ident"])
		})
		id := strings.Join([]string{
			stringValue(ends[0]["ident"]),
			stringValue(ends[1]["ident"]),
		}, "/")
		runways = append(runways, map[string]any{
			"id":       id,
			"lengthFt": nullableFloat(row.lengthFt),
			"widthFt":  nullableFloat(row.widthFt),
			"ends":     ends,
			"centerline": map[string]any{
				"type": "Feature",
				"geometry": map[string]any{
					"type": "LineString",
					"coordinates": []any{
						[]any{ends[0]["lon"], ends[0]["lat"]},
						[]any{ends[1]["lon"], ends[1]["lat"]},
					},
				},
				"properties": map[string]any{
					"id":      id,
					"airport": normalizedAirport,
					"source":  "OurAirports",
					"ends":    []any{ends[0]["ident"], ends[1]["ident"]},
				},
			},
		})
	}

	if len(runways) == 0 {
		return nil
	}
	sort.Slice(runways, func(i, j int) bool {
		return stringValue(runways[i]["id"]) < stringValue(runways[j]["id"])
	})
	return map[string]any{
		"airport": normalizedAirport,
		"source":  "OurAirports",
		"cycle":   "",
		"runways": runways,
	}
}

func normalizeAirportIdent(value string) string {
	return strings.ToUpper(strings.Map(func(r rune) rune {
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			return r
		}
		return -1
	}, strings.TrimSpace(value)))
}

func runwayEndSortKey(value any) string {
	ident := strings.ToUpper(strings.TrimSpace(stringValue(value)))
	if len(ident) < 2 {
		return ident
	}
	if ident[0] >= '0' && ident[0] <= '9' && ident[1] >= '0' && ident[1] <= '9' {
		return ident
	}
	return ident
}

func nullableFloat(value sql.NullFloat64) any {
	if !value.Valid {
		return nil
	}
	return value.Float64
}

package webapi

import (
	"context"
	"database/sql"
	"fmt"
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

type runwayMapReader interface {
	readRunwayMaps(ctx context.Context, idents []string) (map[string]map[string]any, error)
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
	normalizedIdent := normalizeAirportIdent(ident)
	if normalizedIdent == "" {
		return nil, nil
	}
	runwayMaps, err := s.readRunwayMaps(ctx, []string{normalizedIdent})
	if err != nil {
		return nil, err
	}
	return runwayMaps[normalizedIdent], nil
}

func (s *UserDataStore) readRunwayMaps(ctx context.Context, idents []string) (map[string]map[string]any, error) {
	out := map[string]map[string]any{}
	if s == nil || s.db == nil {
		return out, nil
	}
	normalizedIdents := make([]string, 0, len(idents))
	seen := map[string]bool{}
	for _, ident := range idents {
		normalizedIdent := normalizeAirportIdent(ident)
		if normalizedIdent == "" || seen[normalizedIdent] {
			continue
		}
		seen[normalizedIdent] = true
		normalizedIdents = append(normalizedIdents, normalizedIdent)
	}
	if len(normalizedIdents) == 0 {
		return out, nil
	}

	placeholders := make([]string, len(normalizedIdents))
	args := make([]any, 0, len(normalizedIdents)+1)
	for index, ident := range normalizedIdents {
		placeholders[index] = fmt.Sprintf("$%d", index+1)
		args = append(args, ident)
	}
	sourcePlaceholder := fmt.Sprintf("$%d", len(args)+1)
	args = append(args, "ourairports")
	rows, err := s.query(
		ctx,
		"read_runway_geometries",
		`select aliases.alias_ident, `+runwayGeometrySelectColumns+`
		 from aviation.airport_aliases aliases
		 join aviation.airports airports
		   on airports.ident = aliases.airport_ident
		 join ourairports.runway_geometries runway_geometries
		   on runway_geometries.airport_ident = airports.ourairports_ident
		 where aliases.alias_ident in (`+strings.Join(placeholders, ",")+`)
		   and runway_geometries.source = `+sourcePlaceholder+`
		 order by aliases.alias_ident asc, runway_geometries.airport_ident asc, runway_geometries.le_ident asc`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	geometriesByAirport := map[string][]runwayGeometryRow{}
	for rows.Next() {
		var lookupIdent string
		var row runwayGeometryRow
		if err := rows.Scan(
			&lookupIdent,
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
		normalizedAirport := normalizeAirportIdent(lookupIdent)
		if normalizedAirport == "" {
			continue
		}
		geometriesByAirport[normalizedAirport] = append(
			geometriesByAirport[normalizedAirport],
			row,
		)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, ident := range normalizedIdents {
		runwayMap := buildRunwayMapFromGeometryRows(ident, geometriesByAirport[ident])
		if runwayMap != nil {
			out[ident] = runwayMap
		}
	}
	return out, nil
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
	runways = dedupeRunwaysByPhysicalID(runways)
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

func runwayCompletenessScore(runway map[string]any) int {
	score := 0
	if finite(numberValue(runway["lengthFt"])) {
		score += 2
	}
	if finite(numberValue(runway["widthFt"])) {
		score++
	}
	if _, ok := runway["centerline"].(map[string]any); ok {
		score++
	}
	return score
}

func dedupeRunwaysByPhysicalID(runways []map[string]any) []map[string]any {
	byID := map[string]map[string]any{}
	for _, runway := range runways {
		id := stringValue(runway["id"])
		if id == "" {
			continue
		}
		existing, ok := byID[id]
		if !ok || runwayCompletenessScore(runway) > runwayCompletenessScore(existing) {
			byID[id] = runway
		}
	}

	deduped := make([]map[string]any, 0, len(byID))
	for _, runway := range byID {
		deduped = append(deduped, runway)
	}
	return deduped
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

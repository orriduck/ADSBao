package webapi

import (
	"context"
	"fmt"
	"strings"
)

type airportNameRecord struct {
	name string
	city string
}

type airportNameReader interface {
	readAirportNames(ctx context.Context, idents []string) (map[string]airportNameRecord, error)
}

func (s *UserDataStore) readAirportNames(ctx context.Context, idents []string) (map[string]airportNameRecord, error) {
	out := map[string]airportNameRecord{}
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
	args := make([]any, 0, len(normalizedIdents))
	for index, ident := range normalizedIdents {
		placeholders[index] = fmt.Sprintf("$%d", index+1)
		args = append(args, ident)
	}
	inClause := strings.Join(placeholders, ",")
	rows, err := s.query(
		ctx,
		"read_airport_names",
		`select ident, icao_code, iata_code, name, municipality
		 from ourairports.airports
		 where name <> ''
		   and (icao_code in (`+inClause+`) or ident in (`+inClause+`) or iata_code in (`+inClause+`))`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var ident, icao, iata, name, city string
		if err := rows.Scan(&ident, &icao, &iata, &name, &city); err != nil {
			return nil, err
		}
		value := airportNameRecord{
			name: strings.TrimSpace(name),
			city: strings.TrimSpace(city),
		}
		if value.name == "" {
			continue
		}
		if key := normalizeAirportIdent(icao); key != "" {
			out[key] = value
		}
		if key := normalizeAirportIdent(ident); key != "" {
			if _, ok := out[key]; !ok {
				out[key] = value
			}
		}
		if key := normalizeAirportIdent(iata); key != "" {
			if _, ok := out[key]; !ok {
				out[key] = value
			}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

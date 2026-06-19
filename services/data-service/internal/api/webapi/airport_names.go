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
		`select returned_aliases.alias_ident, airports.name, airports.municipality
		 from aviation.airport_aliases requested_aliases
		 join aviation.airports airports
		   on airports.ident = requested_aliases.airport_ident
		 join aviation.airport_aliases returned_aliases
		   on returned_aliases.airport_ident = airports.ident
		 where requested_aliases.alias_ident in (`+inClause+`)
		   and airports.name <> ''`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var alias, name, city string
		if err := rows.Scan(&alias, &name, &city); err != nil {
			return nil, err
		}
		value := airportNameRecord{
			name: strings.TrimSpace(name),
			city: strings.TrimSpace(city),
		}
		if value.name == "" {
			continue
		}
		if key := normalizeAirportIdent(alias); key != "" {
			out[key] = value
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

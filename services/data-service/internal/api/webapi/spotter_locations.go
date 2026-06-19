package webapi

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math"
	"strings"
)

type spotterLocationRecord struct {
	id                string
	airportIdent      string
	spotNumber        int
	title             string
	category          string
	latitudeDeg       float64
	longitudeDeg      float64
	what              string
	whereText         string
	whenText          string
	misc              string
	focalLength       string
	sourceURI         string
	sourceAttribution string
}

type spotterLocationReader interface {
	readSpotterLocations(ctx context.Context, ident string) ([]spotterLocationRecord, error)
}

func (s *UserDataStore) readSpotterLocations(ctx context.Context, ident string) ([]spotterLocationRecord, error) {
	normalizedIdent := normalizeAirportIdent(ident)
	if normalizedIdent == "" {
		return nil, nil
	}
	if s == nil || s.db == nil {
		return nil, nil
	}

	rows, err := s.query(
		ctx,
		"read_spotter_locations",
		`select
		   spotter_locations.id::text,
		   spotter_locations.airport_ident,
		   spotter_locations.spot_number,
		   spotter_locations.title,
		   spotter_locations.category,
		   spotter_locations.latitude_deg,
		   spotter_locations.longitude_deg,
		   spotter_locations.what,
		   spotter_locations.where_text,
		   spotter_locations.when_text,
		   spotter_locations.misc,
		   spotter_locations.focal_length,
		   spotter_locations.source_uri,
		   spotter_locations.source_attribution
		 from aviation.airport_aliases aliases
		 join spotter.spotter_locations spotter_locations
		   on spotter_locations.airport_ident = aliases.airport_ident
		 where aliases.alias_ident = $1
		 order by spotter_locations.spot_number asc, spotter_locations.title asc`,
		normalizedIdent,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	locations := []spotterLocationRecord{}
	for rows.Next() {
		var row spotterLocationRecord
		var spotNumber sql.NullInt64
		if err := rows.Scan(
			&row.id,
			&row.airportIdent,
			&spotNumber,
			&row.title,
			&row.category,
			&row.latitudeDeg,
			&row.longitudeDeg,
			&row.what,
			&row.whereText,
			&row.whenText,
			&row.misc,
			&row.focalLength,
			&row.sourceURI,
			&row.sourceAttribution,
		); err != nil {
			return nil, err
		}
		if spotNumber.Valid {
			row.spotNumber = int(spotNumber.Int64)
		}
		locations = append(locations, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return locations, nil
}

func (h *Handler) spotterLocations(ctx context.Context, ident string, airport map[string]any) []map[string]any {
	if h == nil || h.spotterLocationReader == nil {
		return []map[string]any{}
	}
	rows, err := h.spotterLocationReader.readSpotterLocations(ctx, ident)
	if err != nil {
		log.Printf("spotter location read failed airport=%s error=%v", ident, err)
		return []map[string]any{}
	}
	locations := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		if location := mapSpotterLocation(row, airport); location != nil {
			locations = append(locations, location)
		}
	}
	return locations
}

func mapSpotterLocation(row spotterLocationRecord, airport map[string]any) map[string]any {
	if !finite(row.latitudeDeg) || !finite(row.longitudeDeg) {
		return nil
	}
	id := strings.TrimSpace(row.id)
	if id == "" {
		id = fmt.Sprintf("spotter-%s-%d-%.6f-%.6f", row.airportIdent, row.spotNumber, row.latitudeDeg, row.longitudeDeg)
	}
	title := strings.TrimSpace(row.title)
	category := strings.TrimSpace(row.category)
	if category == "" {
		category = "spotting location"
	}
	disclaimer := "Photo location data can change; verify public access, local rules, weather, and personal safety before using a location."
	payload := map[string]any{
		"id":                id,
		"airportIdent":      normalizeAirportIdent(row.airportIdent),
		"spotNumber":        row.spotNumber,
		"name":              title,
		"title":             title,
		"category":          category,
		"lat":               row.latitudeDeg,
		"lon":               row.longitudeDeg,
		"source":            "spotterguide",
		"sourceLabel":       "Photo guide",
		"sourceUri":         strings.TrimSpace(row.sourceURI),
		"sourceAttribution": firstString(row.sourceAttribution, "spotterguide.net"),
		"what":              strings.TrimSpace(row.what),
		"where":             strings.TrimSpace(row.whereText),
		"when":              strings.TrimSpace(row.whenText),
		"misc":              strings.TrimSpace(row.misc),
		"focalLength":       strings.TrimSpace(row.focalLength),
		"disclaimer":        disclaimer,
	}
	if airport != nil {
		distance := distanceNm(
			numberValue(airport["lat"]),
			numberValue(airport["lon"]),
			row.latitudeDeg,
			row.longitudeDeg,
		)
		if finite(distance) {
			payload["distanceMeters"] = int(math.Round(distance * metersPerNM))
		}
	}
	return payload
}

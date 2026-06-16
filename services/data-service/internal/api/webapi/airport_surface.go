package webapi

import (
	"context"
	"fmt"
	"log"
	"math"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	defaultOverpassBaseURL             = "https://overpass-api.de/api/interpreter"
	defaultAirportSurfaceCacheTTL      = 6 * time.Hour
	airportSurfaceRequestTimeout       = 6 * time.Second
	airportSurfaceBBoxPaddingMeters    = 1800
	airportSurfaceFallbackRadiusMeters = 4500
	maxAirportSurfaceFeatures          = 500
)

type airportSurfaceBBox struct {
	south float64
	west  float64
	north float64
	east  float64
}

type airportSurfaceCache struct {
	mu    sync.Mutex
	ttl   time.Duration
	items map[string]airportSurfaceCacheEntry
}

type airportSurfaceCacheEntry struct {
	payload   map[string]any
	expiresAt time.Time
}

func newAirportSurfaceCache(ttl time.Duration) *airportSurfaceCache {
	if ttl <= 0 {
		ttl = defaultAirportSurfaceCacheTTL
	}
	return &airportSurfaceCache{
		ttl:   ttl,
		items: map[string]airportSurfaceCacheEntry{},
	}
}

func (c *airportSurfaceCache) get(key string) (map[string]any, bool) {
	if c == nil {
		return nil, false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.items[key]
	if !ok {
		return nil, false
	}
	if time.Now().After(entry.expiresAt) {
		delete(c.items, key)
		return nil, false
	}
	return entry.payload, true
}

func (c *airportSurfaceCache) set(key string, payload map[string]any) {
	if c == nil || strings.TrimSpace(key) == "" {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = airportSurfaceCacheEntry{
		payload:   payload,
		expiresAt: time.Now().Add(c.ttl),
	}
}

func (h *Handler) airportSurfaceMap(ctx context.Context, ident string, lat, lon float64, runwayMap map[string]any) map[string]any {
	airport := normalizeAirportIdent(ident)
	if airport == "" || h == nil || h.overpassBaseURL == "" || !finite(lat) || !finite(lon) {
		return nil
	}
	if cached, ok := h.airportSurfaceCache.get(airport); ok {
		return cached
	}

	bbox, ok := airportSurfaceSearchBBox(lat, lon, runwayMap)
	if !ok {
		h.airportSurfaceCache.set(airport, nil)
		return nil
	}
	requestURL, err := url.Parse(h.overpassBaseURL)
	if err != nil {
		log.Printf("airport surface url parse failed airport=%s error=%v", airport, err)
		return nil
	}
	values := requestURL.Query()
	values.Set("data", buildAirportSurfaceOverpassQuery(bbox))
	requestURL.RawQuery = values.Encode()

	var payload map[string]any
	status, err := h.fetchJSONWithTimeout(
		ctx,
		requestURL.String(),
		map[string]string{
			"Accept":     "application/json",
			"User-Agent": "ADSBao data-service/1.0 (+https://adsbao.dev)",
		},
		&payload,
		airportSurfaceRequestTimeout,
	)
	if err != nil || status < 200 || status >= 300 {
		log.Printf("airport surface fetch failed airport=%s status=%d error=%v", airport, status, err)
		h.airportSurfaceCache.set(airport, nil)
		return nil
	}

	surfaceMap := buildAirportSurfaceMapFromOverpass(airport, payload)
	h.airportSurfaceCache.set(airport, surfaceMap)
	return surfaceMap
}

func airportSurfaceSearchBBox(lat, lon float64, runwayMap map[string]any) (airportSurfaceBBox, bool) {
	points := []map[string]float64{{"lat": lat, "lon": lon}}
	for _, runway := range asRecords(runwayMap["runways"]) {
		for _, end := range asRecords(runway["ends"]) {
			endLat, endLon := numberValue(end["lat"]), numberValue(end["lon"])
			if finite(endLat) && finite(endLon) {
				points = append(points, map[string]float64{"lat": endLat, "lon": endLon})
			}
		}
	}
	if len(points) <= 1 {
		return expandedBBoxAroundPoint(lat, lon, airportSurfaceFallbackRadiusMeters)
	}

	bbox := airportSurfaceBBox{
		south: points[0]["lat"],
		west:  points[0]["lon"],
		north: points[0]["lat"],
		east:  points[0]["lon"],
	}
	for _, point := range points[1:] {
		bbox.south = math.Min(bbox.south, point["lat"])
		bbox.west = math.Min(bbox.west, point["lon"])
		bbox.north = math.Max(bbox.north, point["lat"])
		bbox.east = math.Max(bbox.east, point["lon"])
	}
	return expandAirportSurfaceBBox(bbox, airportSurfaceBBoxPaddingMeters)
}

func expandedBBoxAroundPoint(lat, lon float64, radiusMeters float64) (airportSurfaceBBox, bool) {
	if !finite(lat) || !finite(lon) {
		return airportSurfaceBBox{}, false
	}
	bbox := airportSurfaceBBox{south: lat, west: lon, north: lat, east: lon}
	return expandAirportSurfaceBBox(bbox, radiusMeters)
}

func expandAirportSurfaceBBox(bbox airportSurfaceBBox, paddingMeters float64) (airportSurfaceBBox, bool) {
	midLat := (bbox.south + bbox.north) / 2
	metersPerDegreeLon := metersPerDegreeLat * math.Cos(midLat*math.Pi/180)
	if !finite(metersPerDegreeLon) || math.Abs(metersPerDegreeLon) < 1 {
		return airportSurfaceBBox{}, false
	}
	latDelta := paddingMeters / metersPerDegreeLat
	lonDelta := paddingMeters / metersPerDegreeLon
	return airportSurfaceBBox{
		south: math.Max(-90, bbox.south-latDelta),
		west:  math.Max(-180, bbox.west-lonDelta),
		north: math.Min(90, bbox.north+latDelta),
		east:  math.Min(180, bbox.east+lonDelta),
	}, true
}

func buildAirportSurfaceOverpassQuery(bbox airportSurfaceBBox) string {
	formatted := strings.Join([]string{
		formatBBoxCoordinate(bbox.south),
		formatBBoxCoordinate(bbox.west),
		formatBBoxCoordinate(bbox.north),
		formatBBoxCoordinate(bbox.east),
	}, ",")

	return fmt.Sprintf(`[out:json][timeout:8];
(
  way["aeroway"~"^(runway|taxiway|taxilane|apron)$"](%s);
  relation["aeroway"~"^(runway|taxiway|taxilane|apron)$"](%s);
);
out tags geom;`, formatted, formatted)
}

func formatBBoxCoordinate(value float64) string {
	return strconv.FormatFloat(value, 'f', 6, 64)
}

func buildAirportSurfaceMapFromOverpass(airport string, payload map[string]any) map[string]any {
	normalizedAirport := normalizeAirportIdent(airport)
	if normalizedAirport == "" {
		return nil
	}

	features := []map[string]any{}
	counts := map[string]int{}
	for _, element := range asRecords(payload["elements"]) {
		feature := airportSurfaceFeature(element)
		if feature == nil {
			continue
		}
		kind := stringValue(valueAt(feature, "properties", "kind"))
		counts[kind]++
		features = append(features, feature)
		if len(features) >= maxAirportSurfaceFeatures {
			break
		}
	}
	if len(features) == 0 {
		return nil
	}
	sort.SliceStable(features, func(i, j int) bool {
		left := airportSurfaceKindRank(stringValue(valueAt(features[i], "properties", "kind")))
		right := airportSurfaceKindRank(stringValue(valueAt(features[j], "properties", "kind")))
		if left != right {
			return left < right
		}
		return stringValue(valueAt(features[i], "properties", "id")) < stringValue(valueAt(features[j], "properties", "id"))
	})

	return map[string]any{
		"airport":           normalizedAirport,
		"source":            "OpenStreetMap",
		"sourceAttribution": "© OpenStreetMap contributors",
		"counts":            counts,
		"features": map[string]any{
			"type":     "FeatureCollection",
			"features": features,
		},
	}
}

func airportSurfaceFeature(element map[string]any) map[string]any {
	tags := asRecord(element["tags"])
	kind := strings.ToLower(stringValue(tags["aeroway"]))
	if !isAirportSurfaceKind(kind) {
		return nil
	}
	coordinates := overpassGeometryCoordinates(element["geometry"])
	if len(coordinates) < 2 {
		return nil
	}
	osmType := stringValue(element["type"])
	osmID := stringValue(element["id"])
	if osmType == "" || osmType == "<nil>" || osmID == "" || osmID == "<nil>" {
		return nil
	}
	geometryType := "LineString"
	geometryCoordinates := any(coordinates)
	if shouldRenderAirportSurfaceAsPolygon(kind, coordinates) {
		geometryType = "Polygon"
		geometryCoordinates = []any{coordinates}
	}

	return map[string]any{
		"type": "Feature",
		"geometry": map[string]any{
			"type":        geometryType,
			"coordinates": geometryCoordinates,
		},
		"properties": map[string]any{
			"id":      "osm-" + osmType + "-" + osmID,
			"kind":    kind,
			"osmType": osmType,
			"osmId":   osmID,
			"name":    firstString(tags["name"], tags["ref"]),
			"ref":     stringValue(tags["ref"]),
			"surface": stringValue(tags["surface"]),
		},
	}
}

func isAirportSurfaceKind(kind string) bool {
	switch kind {
	case "runway", "taxiway", "taxilane", "apron":
		return true
	default:
		return false
	}
}

func overpassGeometryCoordinates(value any) []any {
	points := asRecords(value)
	coordinates := []any{}
	for _, point := range points {
		lat, lon := numberValue(point["lat"]), numberValue(point["lon"])
		if finite(lat) && finite(lon) {
			coordinates = append(coordinates, []any{lon, lat})
		}
	}
	return coordinates
}

func shouldRenderAirportSurfaceAsPolygon(kind string, coordinates []any) bool {
	if len(coordinates) < 4 {
		return false
	}
	if kind != "apron" && kind != "runway" {
		return false
	}
	first := coordinates[0].([]any)
	last := coordinates[len(coordinates)-1].([]any)
	return numberValue(first[0]) == numberValue(last[0]) && numberValue(first[1]) == numberValue(last[1])
}

func airportSurfaceKindRank(kind string) int {
	switch kind {
	case "apron":
		return 0
	case "taxilane":
		return 1
	case "taxiway":
		return 2
	case "runway":
		return 3
	default:
		return 4
	}
}

package webapi

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	defaultOverpassBaseURL             = "https://overpass-api.de/api/interpreter"
	defaultAirportSurfaceOSMMapBaseURL = "https://api.openstreetmap.org/api/0.6/map"
	defaultAirportSurfaceCacheTTL      = 6 * time.Hour
	airportSurfaceRequestTimeout       = 3 * time.Second
	airportSurfaceOSMMapRequestTimeout = 12 * time.Second
	airportSurfaceBBoxPaddingMeters    = 400
	airportSurfaceCenterRadiusMeters   = 1200
	airportSurfaceFallbackRadiusMeters = 4500
	maxAirportSurfaceFeatures          = 1400
	maxAirportSurfaceBuildings         = 600
)

const (
	airportSurfaceScopePavement   = "pavement"
	airportSurfaceScopeStructures = "structures"
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

type airportSurfaceOSMMap struct {
	Nodes []airportSurfaceOSMNode `xml:"node"`
	Ways  []airportSurfaceOSMWay  `xml:"way"`
}

type airportSurfaceOSMNode struct {
	ID  int64   `xml:"id,attr"`
	Lat float64 `xml:"lat,attr"`
	Lon float64 `xml:"lon,attr"`
}

type airportSurfaceOSMWay struct {
	ID   int64                  `xml:"id,attr"`
	NDs  []airportSurfaceOSMND  `xml:"nd"`
	Tags []airportSurfaceOSMTag `xml:"tag"`
}

type airportSurfaceOSMND struct {
	Ref int64 `xml:"ref,attr"`
}

type airportSurfaceOSMTag struct {
	Key   string `xml:"k,attr"`
	Value string `xml:"v,attr"`
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
	if c == nil || strings.TrimSpace(key) == "" || payload == nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = airportSurfaceCacheEntry{
		payload:   payload,
		expiresAt: time.Now().Add(c.ttl),
	}
}

func (h *Handler) airportSurfaceMap(ctx context.Context, ident string, lat, lon float64, runwayMap map[string]any, scope string) map[string]any {
	airport := normalizeAirportIdent(ident)
	normalizedScope := normalizeAirportSurfaceScope(scope)
	if airport == "" || h == nil || h.overpassBaseURL == "" || !finite(lat) || !finite(lon) {
		return nil
	}
	cacheKey := airportSurfaceCacheKey(airport, normalizedScope)
	if cached, ok := h.airportSurfaceCache.get(cacheKey); ok {
		return cached
	}

	bbox, ok := airportSurfaceSearchBBox(lat, lon, runwayMap)
	if !ok {
		return nil
	}

	surfaceMap := h.airportSurfaceMapFromOverpassQuery(
		ctx,
		airport,
		buildAirportSurfaceOverpassQuery(bbox, normalizedScope),
		normalizedScope,
	)
	if surfaceMap == nil {
		if centerBBox, ok := expandedBBoxAroundPoint(lat, lon, airportSurfaceCenterRadiusMeters); ok {
			surfaceMap = h.airportSurfaceMapFromOSMMap(ctx, airport, centerBBox, normalizedScope)
		}
	}
	if surfaceMap == nil {
		surfaceMap = h.airportSurfaceMapFromOSMMap(ctx, airport, bbox, normalizedScope)
	}
	if surfaceMap == nil {
		return nil
	}
	h.airportSurfaceCache.set(cacheKey, surfaceMap)
	return surfaceMap
}

func (h *Handler) airportSurfaceMapFromOverpassQuery(ctx context.Context, airport string, query string, scope string) map[string]any {
	payload, ok := h.fetchAirportSurfacePayload(ctx, airport, query, scope)
	if !ok {
		return nil
	}
	return buildAirportSurfaceMapFromOverpass(airport, payload)
}

func normalizeAirportSurfaceScope(scope string) string {
	switch strings.ToLower(strings.TrimSpace(scope)) {
	case airportSurfaceScopePavement:
		return airportSurfaceScopePavement
	case airportSurfaceScopeStructures:
		return airportSurfaceScopeStructures
	default:
		return airportSurfaceScopePavement
	}
}

func airportSurfaceCacheKey(airport string, scope string) string {
	return normalizeAirportIdent(airport) + ":" + normalizeAirportSurfaceScope(scope)
}

func (h *Handler) fetchAirportSurfacePayload(
	ctx context.Context,
	airport string,
	query string,
	mode string,
) (map[string]any, bool) {
	requestURL, err := url.Parse(h.overpassBaseURL)
	if err != nil {
		log.Printf("airport surface url parse failed airport=%s mode=%s error=%v", airport, mode, err)
		return nil, false
	}

	var payload map[string]any
	status, err := h.fetchAirportSurfaceJSON(ctx, requestURL.String(), query, &payload)
	if err != nil || status < 200 || status >= 300 {
		log.Printf("airport surface fetch failed airport=%s mode=%s status=%d error=%v", airport, mode, status, err)
		return nil, false
	}
	return payload, true
}

func (h *Handler) fetchAirportSurfaceJSON(ctx context.Context, upstream string, query string, out any) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, airportSurfaceRequestTimeout)
	defer cancel()
	body := strings.NewReader(url.Values{"data": {query}}.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, upstream, body)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "ADSBao data-service/1.0 (+https://adsbao.dev)")
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, aircraftJSONMaxBytes))
	if err != nil {
		return resp.StatusCode, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return resp.StatusCode, nil
	}
	if err := json.Unmarshal(responseBody, out); err != nil {
		return resp.StatusCode, err
	}
	return resp.StatusCode, nil
}

func (h *Handler) airportSurfaceMapFromOSMMap(ctx context.Context, airport string, bbox airportSurfaceBBox, scope string) map[string]any {
	payload, ok := h.fetchAirportSurfaceOSMMap(ctx, airport, bbox, scope)
	if !ok {
		return nil
	}
	surfaceMap := buildAirportSurfaceMapFromOSMMap(airport, payload, scope)
	if surfaceMap == nil {
		return nil
	}
	h.airportSurfaceCache.set(airportSurfaceCacheKey(airport, scope), surfaceMap)
	return surfaceMap
}

func (h *Handler) fetchAirportSurfaceOSMMap(ctx context.Context, airport string, bbox airportSurfaceBBox, scope string) (*airportSurfaceOSMMap, bool) {
	requestURL, err := url.Parse(defaultAirportSurfaceOSMMapBaseURL)
	if err != nil {
		log.Printf("airport surface osm url parse failed airport=%s scope=%s error=%v", airport, scope, err)
		return nil, false
	}
	requestURL.RawQuery = "bbox=" + strings.Join([]string{
		formatBBoxCoordinate(bbox.west),
		formatBBoxCoordinate(bbox.south),
		formatBBoxCoordinate(bbox.east),
		formatBBoxCoordinate(bbox.north),
	}, ",")

	ctx, cancel := context.WithTimeout(ctx, airportSurfaceOSMMapRequestTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL.String(), nil)
	if err != nil {
		return nil, false
	}
	req.Header.Set("Accept", "application/xml,text/xml")
	req.Header.Set("User-Agent", "ADSBao data-service/1.0 (+https://adsbao.dev)")
	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("airport surface osm fetch failed airport=%s scope=%s status=0 error=%v", airport, scope, err)
		return nil, false
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, aircraftJSONMaxBytes))
	if err != nil || resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("airport surface osm fetch failed airport=%s scope=%s status=%d error=%v", airport, scope, resp.StatusCode, err)
		return nil, false
	}
	var payload airportSurfaceOSMMap
	if err := xml.Unmarshal(body, &payload); err != nil {
		log.Printf("airport surface osm parse failed airport=%s scope=%s error=%v", airport, scope, err)
		return nil, false
	}
	return &payload, true
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

func buildAirportSurfacePavementOverpassQuery(bbox airportSurfaceBBox) string {
	formatted := strings.Join([]string{
		formatBBoxCoordinate(bbox.south),
		formatBBoxCoordinate(bbox.west),
		formatBBoxCoordinate(bbox.north),
		formatBBoxCoordinate(bbox.east),
	}, ",")

	return fmt.Sprintf(`[out:json][timeout:3];
(
  way["aeroway"~"^(runway|taxiway|taxilane|apron)$"](%s);
);
out tags geom;`, formatted)
}

func buildAirportSurfaceStructuresOverpassQuery(bbox airportSurfaceBBox) string {
	formatted := strings.Join([]string{
		formatBBoxCoordinate(bbox.south),
		formatBBoxCoordinate(bbox.west),
		formatBBoxCoordinate(bbox.north),
		formatBBoxCoordinate(bbox.east),
	}, ",")

	return fmt.Sprintf(`[out:json][timeout:3];
(
  way["aeroway"="terminal"](%s);
  way["building"="hangar"](%s);
);
out tags geom;`, formatted, formatted)
}

func buildAirportSurfaceOverpassQuery(bbox airportSurfaceBBox, scope string) string {
	if normalizeAirportSurfaceScope(scope) == airportSurfaceScopeStructures {
		return buildAirportSurfaceStructuresOverpassQuery(bbox)
	}
	return buildAirportSurfacePavementOverpassQuery(bbox)
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
	buildingCount := 0
	for _, element := range asRecords(payload["elements"]) {
		feature := airportSurfaceFeature(element)
		if feature == nil {
			continue
		}
		kind := stringValue(valueAt(feature, "properties", "kind"))
		// Cap buildings independently so a building-dense airport can never
		// starve the aeroway pavement (runways/taxiways/aprons) it shares the
		// overall budget with.
		if kind == "building" {
			if buildingCount >= maxAirportSurfaceBuildings {
				continue
			}
			buildingCount++
		}
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

func buildAirportSurfaceMapFromOSMMap(airport string, payload *airportSurfaceOSMMap, scope string) map[string]any {
	if payload == nil {
		return nil
	}
	nodes := map[int64]airportSurfaceOSMNode{}
	for _, node := range payload.Nodes {
		if node.ID != 0 && finite(node.Lat) && finite(node.Lon) {
			nodes[node.ID] = node
		}
	}
	elements := []any{}
	for _, way := range payload.Ways {
		tags := map[string]any{}
		for _, tag := range way.Tags {
			tags[tag.Key] = tag.Value
		}
		if !airportSurfaceTagsMatchScope(tags, scope) {
			continue
		}
		geometry := []any{}
		for _, nd := range way.NDs {
			node, ok := nodes[nd.Ref]
			if !ok {
				continue
			}
			geometry = append(geometry, map[string]any{
				"lat": node.Lat,
				"lon": node.Lon,
			})
		}
		elements = append(elements, map[string]any{
			"type":     "way",
			"id":       way.ID,
			"tags":     tags,
			"geometry": geometry,
		})
	}
	return buildAirportSurfaceMapFromOverpass(airport, map[string]any{
		"elements": elements,
	})
}

func airportSurfaceTagsMatchScope(tags map[string]any, scope string) bool {
	kind := strings.ToLower(stringValue(tags["aeroway"]))
	if normalizeAirportSurfaceScope(scope) == airportSurfaceScopeStructures {
		if kind == "terminal" {
			return true
		}
		_, hasBuilding := tags["building"]
		return hasBuilding
	}
	switch kind {
	case "runway", "taxiway", "taxilane", "apron":
		return true
	default:
		return false
	}
}

func airportSurfaceFeature(element map[string]any) map[string]any {
	tags := asRecord(element["tags"])
	kind := strings.ToLower(stringValue(tags["aeroway"]))
	// `stringValue` yields "<nil>" for a missing tag — normalize to empty.
	if kind == "<nil>" {
		kind = ""
	}
	if kind == "hangar" {
		kind = "building"
	}
	// Buildings carry no aeroway tag; aeroway=terminal is already a building.
	// Classify them so the frontend can color terminals distinctly from other
	// airport buildings.
	if kind == "" {
		if _, ok := tags["building"]; ok {
			kind = "building"
		}
	}
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
	case "runway", "taxiway", "taxilane", "apron", "terminal", "building":
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
	switch kind {
	case "apron", "runway", "terminal", "building":
	default:
		return false
	}
	first := coordinates[0].([]any)
	last := coordinates[len(coordinates)-1].([]any)
	return numberValue(first[0]) == numberValue(last[0]) && numberValue(first[1]) == numberValue(last[1])
}

func airportSurfaceKindRank(kind string) int {
	// Lower ranks render first (underneath). Buildings/terminals sit below the
	// pavement; runways sit on top.
	switch kind {
	case "building":
		return 0
	case "terminal":
		return 1
	case "apron":
		return 2
	case "taxilane":
		return 3
	case "taxiway":
		return 4
	case "runway":
		return 5
	default:
		return 6
	}
}

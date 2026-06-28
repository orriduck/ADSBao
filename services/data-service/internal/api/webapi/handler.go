package webapi

import (
	"context"
	"encoding/json"
	"errors"
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

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

const (
	defaultOpenAIPBaseURL = "https://api.core.openaip.net/api"
	defaultTimeout        = 12 * time.Second
	metersPerDegreeLat    = 111320.0
	metersPerNM           = 1852
	maxJSONBytes          = 4 * 1024 * 1024
)

type Options struct {
	HTTPClient                *http.Client
	OpenAIPAPIKey             string
	OpenAIPBaseURL            string
	OverpassBaseURL           string
	Timeout                   time.Duration
	AirportSurfaceCacheTTL    time.Duration
	AircraftFetcher           func(context.Context, realtime.FetchInput) (realtime.Event, error)
	Metrics                   realtime.MetricsSink
	Authenticator             *ClerkAuthenticator
	UserDataStore             *UserDataStore
	TraceCache                TraceCache
	FlightAwareServiceBaseURL string
	FlightAwareServiceToken   string
	FeatureFlags              map[string]bool
}

// TraceCache is a best-effort persistent cache for the rolling recent aircraft
// trace, keyed by hex. A nil TraceCache disables caching.
type TraceCache interface {
	GetTrace(ctx context.Context, hex string) (json.RawMessage, time.Duration, bool)
	PutTrace(ctx context.Context, hex string, response json.RawMessage)
	TTL() time.Duration
}

type Handler struct {
	httpClient                *http.Client
	openAIPAPIKey             string
	openAIPBaseURL            string
	overpassBaseURL           string
	timeout                   time.Duration
	airportSurfaceCache       *airportSurfaceCache
	aircraftFetcher           func(context.Context, realtime.FetchInput) (realtime.Event, error)
	metrics                   realtime.MetricsSink
	authenticator             *ClerkAuthenticator
	userDataStore             *UserDataStore
	traceCache                TraceCache
	traceRefreshMu            sync.Mutex
	traceRefreshing           map[string]bool
	flightAwareServiceBaseURL string
	flightAwareServiceToken   string
	featureFlags              map[string]bool
	runwayMapReader           runwayMapReader
	airportNameReader         airportNameReader
	spotterLocationReader     spotterLocationReader
}

type openAIPList struct {
	Items []map[string]any `json:"items"`
}

func New(options Options) *Handler {
	httpClient := options.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{}
	}
	baseURL := strings.TrimRight(strings.TrimSpace(options.OpenAIPBaseURL), "/")
	if baseURL == "" {
		baseURL = defaultOpenAIPBaseURL
	}
	overpassBaseURL := strings.TrimSpace(options.OverpassBaseURL)
	if overpassBaseURL == "" {
		overpassBaseURL = defaultOverpassBaseURL
	}
	timeout := options.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	return &Handler{
		httpClient:                httpClient,
		openAIPAPIKey:             strings.TrimSpace(options.OpenAIPAPIKey),
		openAIPBaseURL:            baseURL,
		overpassBaseURL:           overpassBaseURL,
		timeout:                   timeout,
		airportSurfaceCache:       newAirportSurfaceCache(options.AirportSurfaceCacheTTL),
		aircraftFetcher:           options.AircraftFetcher,
		metrics:                   options.Metrics,
		authenticator:             options.Authenticator,
		userDataStore:             options.UserDataStore,
		traceCache:                options.TraceCache,
		traceRefreshing:           map[string]bool{},
		flightAwareServiceBaseURL: strings.TrimRight(strings.TrimSpace(options.FlightAwareServiceBaseURL), "/"),
		flightAwareServiceToken:   strings.TrimSpace(options.FlightAwareServiceToken),
		featureFlags:              cloneFeatureFlags(options.FeatureFlags),
		runwayMapReader:           options.UserDataStore,
		airportNameReader:         options.UserDataStore,
		spotterLocationReader:     options.UserDataStore,
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	switch {
	case r.Method == http.MethodGet && r.URL.Path == "/api/search":
		h.handleSearch(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/airport/") && strings.HasSuffix(r.URL.Path, "/surface"):
		h.handleAirportSurface(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/airport/") && strings.HasSuffix(r.URL.Path, "/context"):
		h.handleAirportContext(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/airport/"):
		h.handleAirport(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/api/proxy/airports/nearby":
		h.handleNearbyAirports(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/proxy/metar/"):
		h.handleMETAR(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/proxy/local-weather/"):
		h.handleLocalWeather(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/proxy/aircraft/positions/"):
		h.handleAircraftPositions(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/proxy/aircraft/callsign/"):
		h.handleAircraftCallsign(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/proxy/aircraft/trace/"):
		h.handleAircraftTrace(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/proxy/aircraft/photos/") && strings.HasSuffix(r.URL.Path, "/image"):
		h.handleAircraftPhotoImage(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/proxy/aircraft/photos/"):
		h.handleAircraftPhoto(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/proxy/flight-routes/callsign/"):
		h.handleFlightRoute(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/proxy/airlines/"):
		h.handleAirlineLogo(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/api/proxy/reverse-geocode":
		h.handleReverseGeocode(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/proxy/map-style/"):
		h.handleMapStyle(w, r)
	case r.URL.Path == "/api/map-settings" && (r.Method == http.MethodGet || r.Method == http.MethodPut):
		h.handleMapSettings(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/api/feature-flags":
		h.handleFeatureFlags(w, r)
	case r.URL.Path == "/api/route-feedback" && r.Method == http.MethodPost:
		h.handleRouteFeedback(w, r)
	case r.Method == http.MethodGet && contextTileResource(r.URL.Path) != "":
		h.handleContextTile(w, r)
	default:
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
	}
}

func (h *Handler) handleSearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	country := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("country")))
	if country != "" && !match(country, `^[A-Z]{2}$`) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "country must be a 2-letter ISO code"})
		return
	}
	limit := intInRange(r.URL.Query().Get("limit"), 12, 1, 50)
	requestLimit := limit
	if query != "" {
		requestLimit = 50
	}
	items, err := h.listOpenAIP(r.Context(), "/airports", url.Values{
		"search":  {query},
		"country": {country},
		"limit":   {strconv.Itoa(requestLimit)},
		"fields":  {strings.Join(airportListFields(), ",")},
	})
	if err != nil {
		writeAPIError(w, err, "Airport search failed")
		return
	}
	ranked := rankAirports(uniqueAirports(items), query)
	if len(ranked) > limit {
		ranked = ranked[:limit]
	}
	airports := make([]map[string]any, 0, len(ranked))
	for _, item := range ranked {
		if airport := mapAirport(item); airport != nil {
			airports = append(airports, airport)
		}
	}
	h.applyAirportNames(r.Context(), airports)
	writeJSON(w, http.StatusOK, map[string]any{
		"airports": airports,
		"source":   "openaip",
		"query":    query,
		"country":  country,
		"limit":    limit,
	})
}

func (h *Handler) handleAirport(w http.ResponseWriter, r *http.Request) {
	ident := strings.ToUpper(strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/airport/")))
	if !match(ident, `^[A-Z0-9]{2,7}$`) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid airport ident"})
		return
	}
	detail, airport, runways, runwayMap, err := h.resolveAirportDetail(r.Context(), ident)
	if err != nil {
		writeAPIError(w, err, "Airport detail load failed")
		return
	}
	if airport == nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Airport not found"})
		return
	}
	nearbyAirports := []map[string]any{}
	nearbyNavaids := []map[string]any{}
	airspaces := []map[string]any{}
	reportingPoints := []map[string]any{}
	obstacles := []map[string]any{}
	if shouldIncludeAirportContext(r) {
		context := h.airportContext(r.Context(), detail, airport, ident, r)
		nearbyAirports = context.nearbyAirports
		nearbyNavaids = context.nearbyNavaids
		airspaces = context.airspaces
		reportingPoints = context.reportingPoints
		obstacles = context.obstacles
	}
	spotterLocations := h.spotterLocations(r.Context(), ident, airport)
	writeJSON(w, http.StatusOK, map[string]any{
		"airport":          airport,
		"runways":          runways,
		"frequencies":      mapFrequencies(asRecords(detail["frequencies"]), detail),
		"nearbyAirports":   nearbyAirports,
		"nearbyNavaids":    nearbyNavaids,
		"airspaces":        airspaces,
		"reportingPoints":  reportingPoints,
		"obstacles":        obstacles,
		"runwayMap":        runwayMap,
		"spotterLocations": spotterLocations,
		"source":           "openaip",
	})
}

func (h *Handler) handleAirportSurface(w http.ResponseWriter, r *http.Request) {
	ident := strings.ToUpper(strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/airport/"), "/surface")))
	if !match(ident, `^[A-Z0-9]{2,7}$`) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid airport ident"})
		return
	}
	_, airport, _, runwayMap, err := h.resolveAirportDetail(r.Context(), ident)
	if err != nil {
		writeAPIError(w, err, "Airport surface load failed")
		return
	}
	if airport == nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Airport not found"})
		return
	}
	lat, lon := numberValue(airport["lat"]), numberValue(airport["lon"])
	surfaceMap := h.airportSurfaceMap(
		r.Context(),
		ident,
		lat,
		lon,
		runwayMap,
		r.URL.Query().Get("scope"),
	)
	writeJSON(w, http.StatusOK, map[string]any{
		"surfaceMap": surfaceMap,
		"source":     "OpenStreetMap",
	})
}

func (h *Handler) handleAirportContext(w http.ResponseWriter, r *http.Request) {
	ident := strings.ToUpper(strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/airport/"), "/context")))
	if !match(ident, `^[A-Z0-9]{2,7}$`) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid airport ident"})
		return
	}
	detail, airport, _, _, err := h.resolveAirportDetail(r.Context(), ident)
	if err != nil {
		writeAPIError(w, err, "Airport context load failed")
		return
	}
	if airport == nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Airport not found"})
		return
	}
	context := h.airportContext(r.Context(), detail, airport, ident, r)
	writeJSON(w, http.StatusOK, map[string]any{
		"nearbyAirports":  context.nearbyAirports,
		"nearbyNavaids":   context.nearbyNavaids,
		"airspaces":       context.airspaces,
		"reportingPoints": context.reportingPoints,
		"obstacles":       context.obstacles,
		"source":          "openaip",
	})
}

func shouldIncludeAirportContext(r *http.Request) bool {
	value := strings.ToLower(strings.TrimSpace(firstString(
		r.URL.Query().Get("includeContext"),
		r.URL.Query().Get("context"),
	)))
	switch value {
	case "1", "true", "yes", "include", "inline":
		return true
	default:
		return false
	}
}

type airportContextPayload struct {
	nearbyAirports  []map[string]any
	nearbyNavaids   []map[string]any
	airspaces       []map[string]any
	reportingPoints []map[string]any
	obstacles       []map[string]any
}

func (h *Handler) airportContext(ctx context.Context, detail, airport map[string]any, ident string, r *http.Request) airportContextPayload {
	radiusNm := intInRange(r.URL.Query().Get("nearbyRadiusNm"), 60, 1, 250)
	nearbyLimit := intInRange(r.URL.Query().Get("nearbyLimit"), 12, 1, 50)
	lat, lon := numberValue(airport["lat"]), numberValue(airport["lon"])
	id := stringValue(detail["_id"])
	context := airportContextPayload{
		nearbyAirports:  []map[string]any{},
		nearbyNavaids:   []map[string]any{},
		airspaces:       []map[string]any{},
		reportingPoints: []map[string]any{},
		obstacles:       []map[string]any{},
	}
	if !finite(lat) || !finite(lon) {
		return context
	}

	var wg sync.WaitGroup
	wg.Add(5)
	go func() {
		defer wg.Done()
		context.nearbyAirports = h.nearbyAirports(ctx, lat, lon, ident, radiusNm, nearbyLimit)
	}()
	go func() {
		defer wg.Done()
		context.nearbyNavaids = h.nearbyNavaids(ctx, lat, lon, radiusNm, nearbyLimit)
	}()
	go func() {
		defer wg.Done()
		context.airspaces = h.nearbyAirspaces(ctx, lat, lon, radiusNm)
	}()
	go func() {
		defer wg.Done()
		context.reportingPoints = h.reportingPoints(ctx, id)
	}()
	go func() {
		defer wg.Done()
		context.obstacles = h.nearbyObstacles(ctx, lat, lon, minInt(radiusNm, 50))
	}()
	wg.Wait()
	return context
}

func (h *Handler) handleNearbyAirports(w http.ResponseWriter, r *http.Request) {
	lat, okLat := parseCoordinate(r.URL.Query().Get("lat"), -90, 90)
	lon, okLon := parseCoordinate(r.URL.Query().Get("lon"), -180, 180)
	if !okLat || !okLon {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "lat and lon query parameters are required"})
		return
	}
	exclude := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("icao")))
	radiusNm := intInRange(r.URL.Query().Get("radiusNm"), 60, 1, 250)
	limit := intInRange(r.URL.Query().Get("limit"), 100, 1, 100)
	writeJSON(w, http.StatusOK, map[string]any{
		"airports": h.nearbyAirports(r.Context(), lat, lon, exclude, radiusNm, limit),
		"source":   "openaip",
	})
}

func (h *Handler) handleMETAR(w http.ResponseWriter, r *http.Request) {
	icao := strings.ToUpper(strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/proxy/metar/")))
	if !match(icao, `^[A-Z0-9]{3,4}$`) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid ICAO"})
		return
	}
	upstream := "https://aviationweather.gov/api/data/metar?ids=" + url.QueryEscape(icao) + "&format=json"
	h.proxyJSON(w, r, upstream, map[string]string{"Accept": "application/json", "User-Agent": "ADSBao data-service/1.0"})
}

func (h *Handler) handleLocalWeather(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/proxy/local-weather/"), "/")
	if len(parts) < 2 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid coordinates"})
		return
	}
	lat, okLat := parseCoordinate(parts[0], -90, 90)
	lon, okLon := parseCoordinate(parts[1], -180, 180)
	if !okLat || !okLon {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid coordinates"})
		return
	}
	upstream := openMeteoURL(lat, lon)
	h.proxyJSON(w, r, upstream, map[string]string{"Accept": "application/json", "User-Agent": "ADSBao data-service/1.0"})
}

func (h *Handler) handleMapStyle(w http.ResponseWriter, r *http.Request) {
	theme := strings.ToLower(strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/proxy/map-style/")))
	baseLayer := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("baseLayer")))
	if baseLayer == "" {
		baseLayer = "terrain"
	}
	upstream := "https://tiles.openfreemap.org/styles/dark"
	if theme == "light" {
		upstream = "https://tiles.openfreemap.org/styles/bright"
	}
	_ = baseLayer
	h.proxyJSON(w, r, upstream, map[string]string{"Accept": "application/json", "User-Agent": "ADSBao data-service/1.0"})
}

func (h *Handler) proxyJSON(w http.ResponseWriter, r *http.Request, upstream string, headers map[string]string) {
	ctx, cancel := context.WithTimeout(r.Context(), h.timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, upstream, nil)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Invalid upstream URL"})
		return
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	resp, err := h.httpClient.Do(req)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=60")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, io.LimitReader(resp.Body, maxJSONBytes))
}

func (h *Handler) findAirport(ctx context.Context, ident string) (map[string]any, error) {
	items, err := h.listOpenAIP(ctx, "/airports", url.Values{
		"search": {ident},
		"limit":  {"50"},
		"fields": {strings.Join(airportListFields(), ",")},
	})
	if err != nil {
		return nil, err
	}
	ranked := rankAirports(uniqueAirports(items), ident)
	if len(ranked) == 0 {
		return nil, nil
	}
	return ranked[0], nil
}

func (h *Handler) resolveAirportDetail(ctx context.Context, ident string) (map[string]any, map[string]any, []map[string]any, map[string]any, error) {
	matchDoc, err := h.findAirport(ctx, ident)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	if matchDoc == nil {
		return nil, nil, nil, nil, nil
	}
	id := stringValue(matchDoc["_id"])
	detail := matchDoc
	if id != "" {
		if fetched, err := h.getOpenAIP(ctx, "/airports/"+url.PathEscape(id), url.Values{
			"fields": {strings.Join(airportDetailFields(), ",")},
		}); err == nil {
			detail = fetched
		}
	}
	airport := mapAirport(detail)
	if airport == nil {
		return detail, nil, nil, nil, nil
	}
	h.applyAirportNames(ctx, []map[string]any{airport})
	runways := mapRunways(asRecords(detail["runways"]), detail)
	runwayMap, runwayMapErr := h.userDataStore.readRunwayMap(ctx, ident)
	if runwayMapErr != nil {
		log.Printf("runway geometry read failed airport=%s error=%v", ident, runwayMapErr)
	}
	if runwayMap == nil {
		runwayMap = buildRunwayMapFromMappedRunways(ident, runways, "OpenAIP")
	}
	return detail, airport, runways, runwayMap, nil
}

func (h *Handler) nearbyAirports(ctx context.Context, lat, lon float64, exclude string, radiusNm, limit int) []map[string]any {
	items, err := h.listOpenAIP(ctx, "/airports", url.Values{
		"pos":    {fmt.Sprintf("%f,%f", lat, lon)},
		"dist":   {strconv.Itoa(radiusNm * metersPerNM)},
		"type":   {"0,2,3,9,10,11,13"},
		"limit":  {strconv.Itoa(minInt(100, limit*5+1))},
		"fields": {strings.Join(airportListFields(), ",")},
	})
	if err != nil {
		return nil
	}
	out := []map[string]any{}
	// Keep raw OpenAIP items keyed by ICAO so we can build runwayMap from
	// OpenAIP runway data when the database doesn't have stored geometry.
	rawByIcao := map[string]map[string]any{}
	for _, item := range items {
		airport := mapAirport(item)
		if airport == nil {
			continue
		}
		code := stringValue(airport["icao"])
		if code != "" && code == exclude {
			continue
		}
		airport["distanceNm"] = distanceNm(lat, lon, numberValue(airport["lat"]), numberValue(airport["lon"]))
		out = append(out, airport)
		if code != "" {
			rawByIcao[code] = item
		}
	}
	storedRunwayMaps := h.storedRunwayMapsForAirports(ctx, out)
	for _, airport := range out {
		ident := normalizeAirportIdent(firstString(airport["icao"], airport["code"], airport["ident"]))
		if runwayMap := storedRunwayMaps[ident]; runwayMap != nil {
			airport["runwayMap"] = runwayMap
			continue
		}
		// Fallback: build runwayMap from OpenAIP runway data, same as the main airport.
		if raw, ok := rawByIcao[ident]; ok {
			runways := mapRunways(asRecords(raw["runways"]), raw)
			if rwMap := buildRunwayMapFromMappedRunways(ident, runways, "OpenAIP"); rwMap != nil {
				airport["runwayMap"] = rwMap
			}
		}
	}
	h.applyAirportNames(ctx, out)
	sort.Slice(out, func(i, j int) bool {
		return numberValue(out[i]["distanceNm"]) < numberValue(out[j]["distanceNm"])
	})
	if len(out) > limit {
		out = out[:limit]
	}
	return out
}

func airportNameLookupIdent(airport map[string]any) string {
	return normalizeAirportIdent(firstString(airport["icao"], airport["code"], airport["ident"], airport["iata"]))
}

func (h *Handler) applyAirportNames(ctx context.Context, airports []map[string]any) {
	names := h.storedAirportNamesForAirports(ctx, airports)
	for _, airport := range airports {
		if airport == nil {
			continue
		}
		airport["name"] = ""
		airport["city"] = ""
		if name, ok := names[airportNameLookupIdent(airport)]; ok {
			airport["name"] = name.name
			airport["city"] = name.city
		}
	}
}

func (h *Handler) storedAirportNamesForAirports(ctx context.Context, airports []map[string]any) map[string]airportNameRecord {
	if h == nil || h.airportNameReader == nil || len(airports) == 0 {
		return nil
	}
	idents := make([]string, 0, len(airports))
	for _, airport := range airports {
		if ident := airportNameLookupIdent(airport); ident != "" {
			idents = append(idents, ident)
		}
	}
	if len(idents) == 0 {
		return nil
	}
	names, err := h.airportNameReader.readAirportNames(ctx, idents)
	if err != nil {
		log.Printf("airport name read failed airports=%s error=%v", strings.Join(idents, ","), err)
		return nil
	}
	return names
}

func (h *Handler) storedRunwayMapsForAirports(ctx context.Context, airports []map[string]any) map[string]map[string]any {
	if h == nil || h.runwayMapReader == nil || len(airports) == 0 {
		return nil
	}
	idents := make([]string, 0, len(airports))
	for _, airport := range airports {
		ident := normalizeAirportIdent(firstString(airport["icao"], airport["code"], airport["ident"]))
		if ident == "" {
			continue
		}
		idents = append(idents, ident)
	}
	if len(idents) == 0 {
		return nil
	}
	runwayMaps, err := h.runwayMapReader.readRunwayMaps(ctx, idents)
	if err != nil {
		log.Printf("nearby runway geometry read failed airports=%s error=%v", strings.Join(idents, ","), err)
		return nil
	}
	return runwayMaps
}

func (h *Handler) nearbyNavaids(ctx context.Context, lat, lon float64, radiusNm, limit int) []map[string]any {
	items, err := h.listOpenAIP(ctx, "/navaids", url.Values{
		"pos":   {fmt.Sprintf("%f,%f", lat, lon)},
		"dist":  {strconv.Itoa(radiusNm * metersPerNM)},
		"limit": {strconv.Itoa(limit)},
	})
	if err != nil {
		return nil
	}
	return mapRecords(items, mapNavaid)
}

func (h *Handler) nearbyAirspaces(ctx context.Context, lat, lon float64, radiusNm int) []map[string]any {
	items, err := h.listOpenAIP(ctx, "/airspaces", url.Values{
		"pos":   {fmt.Sprintf("%f,%f", lat, lon)},
		"dist":  {strconv.Itoa(radiusNm * metersPerNM)},
		"limit": {"100"},
	})
	if err != nil {
		return nil
	}
	return mapRecords(items, mapAirspace)
}

func (h *Handler) reportingPoints(ctx context.Context, airportID string) []map[string]any {
	if airportID == "" {
		return nil
	}
	items, err := h.listOpenAIP(ctx, "/reporting-points", url.Values{
		"airport": {airportID},
		"limit":   {"100"},
	})
	if err != nil {
		return nil
	}
	return mapRecords(items, mapReportingPoint)
}

func (h *Handler) nearbyObstacles(ctx context.Context, lat, lon float64, radiusNm int) []map[string]any {
	items, err := h.listOpenAIP(ctx, "/obstacles", url.Values{
		"pos":   {fmt.Sprintf("%f,%f", lat, lon)},
		"dist":  {strconv.Itoa(radiusNm * metersPerNM)},
		"limit": {"100"},
	})
	if err != nil {
		return nil
	}
	return mapRecords(items, mapObstacle)
}

func (h *Handler) listOpenAIP(ctx context.Context, path string, params url.Values) ([]map[string]any, error) {
	var payload openAIPList
	if err := h.openAIPJSON(ctx, path, params, &payload); err != nil {
		return nil, err
	}
	return payload.Items, nil
}

func (h *Handler) getOpenAIP(ctx context.Context, path string, params url.Values) (map[string]any, error) {
	var payload map[string]any
	if err := h.openAIPJSON(ctx, path, params, &payload); err != nil {
		return nil, err
	}
	return payload, nil
}

func (h *Handler) openAIPJSON(ctx context.Context, path string, params url.Values, out any) error {
	if h.openAIPAPIKey == "" {
		return errOpenAIPNotConfigured
	}
	requestURL, err := url.Parse(h.openAIPBaseURL + path)
	if err != nil {
		return err
	}
	q := requestURL.Query()
	for key, values := range params {
		for _, value := range values {
			if strings.TrimSpace(value) != "" {
				q.Set(key, value)
			}
		}
	}
	requestURL.RawQuery = q.Encode()
	ctx, cancel := context.WithTimeout(ctx, h.timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL.String(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-openaip-api-key", h.openAIPAPIKey)
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxJSONBytes))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("OpenAIP HTTP %d", resp.StatusCode)
	}
	if err := json.Unmarshal(body, out); err != nil {
		return err
	}
	return nil
}

var errOpenAIPNotConfigured = errors.New("OpenAIP API key is not configured")

func writeAPIError(w http.ResponseWriter, err error, fallback string) {
	if errors.Is(err, errOpenAIPNotConfigured) {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusBadGateway, map[string]any{"error": fallback})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func airportListFields() []string {
	return []string{"_id", "name", "icaoCode", "iataCode", "altIdentifier", "type", "country", "geometry", "elevation", "runways", "frequencies", "updatedAt"}
}

func airportDetailFields() []string {
	return append(airportListFields(), "trafficType", "magneticDeclination", "ppr", "private", "services", "remarks", "contact")
}

func mapAirport(airport map[string]any) map[string]any {
	code := upper(firstString(airport["icaoCode"], airport["iataCode"], airport["altIdentifier"], airport["_id"]))
	if !match(code, `^[A-Z0-9]{2,4}$`) {
		return nil
	}
	lat, lon := pointCoordinates(asRecord(airport["geometry"]))
	return map[string]any{
		"ident":            code,
		"icao":             upper(stringValue(airport["icaoCode"])),
		"iata":             upper(stringValue(airport["iataCode"])),
		"code":             code,
		"openAipId":        stringValue(airport["_id"]),
		"name":             "",
		"type":             stringValue(airport["type"]),
		"type_label":       airportTypeLabel(airport["type"]),
		"city":             "",
		"country":          upper(stringValue(airport["country"])),
		"region":           "",
		"continent":        "",
		"lat":              lat,
		"lon":              lon,
		"elevationFt":      metersToFeet(valueAt(airport, "elevation", "value")),
		"scheduledService": intValue(airport["type"]) == 3,
		"gpsCode":          upper(stringValue(airport["icaoCode"])),
		"localCode":        upper(stringValue(airport["altIdentifier"])),
		"homeLink":         "",
		"wikipediaLink":    "",
		"keywords":         "",
		"source":           "openaip",
		"updatedAt":        stringValue(airport["updatedAt"]),
	}
}

func mapRunways(runways []map[string]any, airport map[string]any) []map[string]any {
	out := []map[string]any{}
	for _, runway := range runways {
		designator := upper(stringValue(runway["designator"]))
		if designator == "" {
			continue
		}
		heading := numberValue(runway["trueHeading"])
		leLat, leLon, heLat, heLon := runwayEndpointCoordinates(runway, airport)
		out = append(out, map[string]any{
			"id":           fallbackString(stringValue(runway["_id"]), openAIPCode(airport)+":"+designator),
			"airportIdent": openAIPCode(airport),
			"lengthFt":     metersToFeet(valueAt(runway, "dimension", "length", "value")),
			"widthFt":      metersToFeet(valueAt(runway, "dimension", "width", "value")),
			"surface":      stringValue(valueAt(runway, "surface", "mainComposite")),
			"lighted":      boolValue(runway["pilotCtrlLighting"]),
			"closed":       false,
			"le": map[string]any{
				"ident":                designator,
				"lat":                  leLat,
				"lon":                  leLon,
				"elevationFt":          nil,
				"headingDegT":          nullableNumber(heading),
				"displacedThresholdFt": nil,
			},
			"he": map[string]any{
				"ident":                reciprocalDesignator(designator),
				"lat":                  heLat,
				"lon":                  heLon,
				"elevationFt":          nil,
				"headingDegT":          nullableNumber(math.Mod(heading+180, 360)),
				"displacedThresholdFt": nil,
			},
			"source": "openaip",
		})
	}
	return out
}

func runwayEndpointCoordinates(runway, airport map[string]any) (any, any, any, any) {
	airportLat, airportLon := pointCoordinates(asRecord(airport["geometry"]))
	lat, lon := numberValue(airportLat), numberValue(airportLon)
	heading := numberValue(runway["trueHeading"])
	lengthMeters := numberValue(valueAt(runway, "dimension", "length", "value"))
	if !finite(lat) || !finite(lon) || !finite(heading) || !finite(lengthMeters) || lengthMeters <= 0 {
		return nil, nil, nil, nil
	}
	leLat, leLon := coordinateOffsetFromCenter(lat, lon, heading, -lengthMeters/2)
	heLat, heLon := coordinateOffsetFromCenter(lat, lon, heading, lengthMeters/2)
	return leLat, leLon, heLat, heLon
}

func coordinateOffsetFromCenter(lat, lon, headingDeg, distanceMeters float64) (any, any) {
	headingRad := headingDeg * math.Pi / 180
	eastMeters := math.Sin(headingRad) * distanceMeters
	northMeters := math.Cos(headingRad) * distanceMeters
	metersPerDegreeLon := metersPerDegreeLat * math.Cos(lat*math.Pi/180)
	if math.Abs(metersPerDegreeLon) < 1 {
		return nil, nil
	}
	return lat + northMeters/metersPerDegreeLat, lon + eastMeters/metersPerDegreeLon
}

func buildRunwayMapFromMappedRunways(airport string, runways []map[string]any, source string) map[string]any {
	normalizedAirport := normalizeAirportIdent(airport)
	if normalizedAirport == "" || len(runways) == 0 {
		return nil
	}
	if strings.TrimSpace(source) == "" {
		source = "OpenAIP"
	}

	mapped := []map[string]any{}
	for _, runway := range runways {
		if boolValue(runway["closed"]) {
			continue
		}
		le, he := asRecord(runway["le"]), asRecord(runway["he"])
		if strings.TrimSpace(stringValue(le["ident"])) == "" ||
			strings.TrimSpace(stringValue(he["ident"])) == "" {
			continue
		}
		leLat, leLon := numberValue(le["lat"]), numberValue(le["lon"])
		heLat, heLon := numberValue(he["lat"]), numberValue(he["lon"])
		if !finite(leLat) || !finite(leLon) || !finite(heLat) || !finite(heLon) {
			continue
		}
		ends := []map[string]any{
			{"ident": upper(le["ident"]), "lat": leLat, "lon": leLon},
			{"ident": upper(he["ident"]), "lat": heLat, "lon": heLon},
		}
		sort.Slice(ends, func(i, j int) bool {
			return runwayEndSortKey(ends[i]["ident"]) < runwayEndSortKey(ends[j]["ident"])
		})
		id := strings.Join([]string{stringValue(ends[0]["ident"]), stringValue(ends[1]["ident"])}, "/")
		mapped = append(mapped, map[string]any{
			"id":       id,
			"lengthFt": runway["lengthFt"],
			"widthFt":  runway["widthFt"],
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
					"source":  source,
					"ends":    []any{ends[0]["ident"], ends[1]["ident"]},
				},
			},
		})
	}
	if len(mapped) == 0 {
		return nil
	}
	mapped = dedupeRunwaysByPhysicalID(mapped)
	sort.Slice(mapped, func(i, j int) bool {
		return stringValue(mapped[i]["id"]) < stringValue(mapped[j]["id"])
	})
	return map[string]any{
		"airport": normalizedAirport,
		"source":  source,
		"cycle":   "",
		"runways": mapped,
	}
}

func mapFrequencies(frequencies []map[string]any, airport map[string]any) []map[string]any {
	out := []map[string]any{}
	for _, frequency := range frequencies {
		out = append(out, map[string]any{
			"id":           fallbackString(stringValue(frequency["_id"]), openAIPCode(airport)+":"+stringValue(frequency["value"])),
			"airportIdent": openAIPCode(airport),
			"type":         stringValue(frequency["type"]),
			"description":  stringValue(frequency["name"]),
			"frequencyMhz": nullableNumber(numberValue(frequency["value"])),
			"primary":      boolValue(frequency["primary"]),
			"publicUse":    frequency["publicUse"] != false,
			"source":       "openaip",
		})
	}
	return out
}

func mapNavaid(navaid map[string]any) map[string]any {
	lat, lon := pointCoordinates(asRecord(navaid["geometry"]))
	return map[string]any{
		"id":           stringValue(navaid["_id"]),
		"ident":        upper(stringValue(navaid["identifier"])),
		"name":         fallbackString(stringValue(navaid["name"]), upper(stringValue(navaid["identifier"]))),
		"type":         stringValue(navaid["type"]),
		"frequencyKhz": nullableNumber(numberValue(valueAt(navaid, "frequency", "value")) * 1000),
		"lat":          lat,
		"lon":          lon,
		"elevationFt":  metersToFeet(valueAt(navaid, "elevation", "value")),
		"country":      upper(stringValue(navaid["country"])),
		"source":       "openaip",
	}
}

func mapAirspace(airspace map[string]any) map[string]any {
	icaoClass, hasICAOClass := airspaceNumber(airspace["icaoClass"])
	lowerLimit := asRecord(airspace["lowerLimit"])
	upperLimit := asRecord(airspace["upperLimit"])

	return map[string]any{
		"id":                stringValue(airspace["_id"]),
		"name":              stringValue(airspace["name"]),
		"type":              stringValue(airspace["type"]),
		"typeLabel":         openAIPAirspaceTypeLabel(airspace["type"]),
		"icaoClass":         nullableAirspaceNumber(icaoClass, hasICAOClass),
		"classLabel":        openAIPAirspaceClassLabel(airspace["icaoClass"]),
		"country":           upper(stringValue(airspace["country"])),
		"lowerLimit":        lowerLimit,
		"upperLimit":        upperLimit,
		"lowerLimitLabel":   formatOpenAIPAirspaceLimit(lowerLimit),
		"upperLimitLabel":   formatOpenAIPAirspaceLimit(upperLimit),
		"activeFrom":        cleanStringValue(airspace["activeFrom"]),
		"activeUntil":       cleanStringValue(airspace["activeUntil"]),
		"onDemand":          boolValue(airspace["onDemand"]),
		"onRequest":         boolValue(airspace["onRequest"]),
		"byNotam":           boolValue(airspace["byNotam"]),
		"specialAgreement":  boolValue(airspace["specialAgreement"]),
		"requestCompliance": boolValue(airspace["requestCompliance"]),
		"hoursOfOperation":  airspace["hoursOfOperation"],
		"remarks":           cleanStringValue(airspace["remarks"]),
		"accessTag":         classifyOpenAIPAirspaceAccess(airspace),
		"geometry":          airspace["geometry"],
		"source":            "openaip",
	}
}

const (
	openAIPAirspaceTypeOther      = 0
	openAIPAirspaceTypeRestricted = 1
	openAIPAirspaceTypeDanger     = 2
	openAIPAirspaceTypeProhibited = 3
	openAIPAirspaceTypeCTR        = 4
	openAIPAirspaceTypeTMZ        = 5
	openAIPAirspaceTypeRMZ        = 6
	openAIPAirspaceTypeTMA        = 7
	openAIPAirspaceTypeTRA        = 8
	openAIPAirspaceTypeTSA        = 9
	openAIPAirspaceTypeFIR        = 10
	openAIPAirspaceTypeUIR        = 11
	openAIPAirspaceTypeADIZ       = 12
	openAIPAirspaceTypeATZ        = 13
	openAIPAirspaceTypeMATZ       = 14
	openAIPAirspaceTypeCTA        = 26
	openAIPAirspaceTypeMCTR       = 36
)

var openAIPAirspaceTypeLabels = map[int]string{
	0:  "Other",
	1:  "Restricted Area",
	2:  "Danger Area",
	3:  "Prohibited Area",
	4:  "CTR",
	5:  "TMZ",
	6:  "RMZ",
	7:  "TMA",
	8:  "TRA",
	9:  "TSA",
	10: "FIR",
	11: "UIR",
	12: "ADIZ",
	13: "ATZ",
	14: "MATZ",
	15: "Airway",
	16: "Military Training Route",
	17: "Alert Area",
	18: "Warning Area",
	19: "Protected Area",
	20: "HTZ",
	21: "Gliding Sector",
	22: "Transponder Setting",
	23: "TIZ",
	24: "TIA",
	25: "Military Training Area",
	26: "CTA",
	27: "ACC Sector",
	28: "Aerial Sporting / Recreational Activity",
	29: "Low Altitude Overflight Restriction",
	30: "Military Route",
	31: "TSA/TRA Feeding Route",
	32: "VFR Sector",
	33: "FIS Sector",
	34: "LTA",
	35: "UTA",
	36: "MCTR",
}

var openAIPAirspaceClassLabels = map[int]string{
	0: "A",
	1: "B",
	2: "C",
	3: "D",
	4: "E",
	5: "F",
	6: "G",
	8: "Unclassified / SUA",
}

var controlledOpenAIPAirspaceTypes = map[int]bool{
	openAIPAirspaceTypeCTR:  true,
	openAIPAirspaceTypeTMA:  true,
	openAIPAirspaceTypeCTA:  true,
	openAIPAirspaceTypeATZ:  true,
	openAIPAirspaceTypeRMZ:  true,
	openAIPAirspaceTypeTMZ:  true,
	openAIPAirspaceTypeMCTR: true,
	openAIPAirspaceTypeMATZ: true,
}

var controlledOpenAIPAirspaceClasses = map[int]bool{
	0: true,
	1: true,
	2: true,
	3: true,
	4: true,
}

var openAIPAirspaceAccessLabels = map[string]map[string]string{
	"blocked":             {"label": "Blocked", "shortLabel": "Blocked"},
	"restricted":          {"label": "Restricted", "shortLabel": "Restricted"},
	"permission-required": {"label": "Permission required", "shortLabel": "Permission"},
	"caution":             {"label": "Caution", "shortLabel": "Caution"},
	"controlled":          {"label": "Controlled", "shortLabel": "Controlled"},
	"informational":       {"label": "Informational", "shortLabel": "Info"},
	"unknown":             {"label": "Status unknown", "shortLabel": "Unknown"},
}

var openAIPAirspaceNow = time.Now

func openAIPAirspaceTypeLabel(value any) string {
	number, ok := airspaceNumber(value)
	if !ok {
		return "Airspace"
	}
	if label := openAIPAirspaceTypeLabels[int(number)]; label != "" {
		return label
	}
	return "Airspace"
}

func openAIPAirspaceClassLabel(value any) string {
	number, ok := airspaceNumber(value)
	if !ok {
		return ""
	}
	return openAIPAirspaceClassLabels[int(number)]
}

func classifyOpenAIPAirspaceAccess(airspace map[string]any) map[string]any {
	airspaceType, hasType := airspaceNumber(airspace["type"])
	icaoClass, hasICAOClass := airspaceNumber(airspace["icaoClass"])
	airspaceTypeInt := int(airspaceType)
	icaoClassInt := int(icaoClass)

	if hasType && airspaceTypeInt == openAIPAirspaceTypeProhibited {
		return openAIPAirspaceAccessTag("blocked", "Prohibited Area: do not enter unless explicitly authorized.", false)
	}
	if hasType && airspaceTypeInt == openAIPAirspaceTypeRestricted {
		return activeDependentAirspaceTag(
			airspace,
			"restricted",
			"Restricted Area is active; clearance, controlling authority permission, or inactive confirmation is required.",
		)
	}
	if hasType && airspaceTypeInt == openAIPAirspaceTypeTSA {
		return activeDependentAirspaceTag(
			airspace,
			"restricted",
			"Temporary Segregated Area is active; ordinary civil traffic should avoid entry.",
		)
	}
	if hasType && airspaceTypeInt == openAIPAirspaceTypeTRA {
		return activeDependentAirspaceTag(
			airspace,
			"permission-required",
			"Temporary Reserved Area is active; coordination or authorization may be required.",
		)
	}
	if hasType && airspaceTypeInt == openAIPAirspaceTypeDanger {
		return activeDependentAirspaceTag(
			airspace,
			"caution",
			"Danger Area is active; avoid unless cleared or confirmed safe.",
		)
	}
	if hasType && airspaceTypeInt == openAIPAirspaceTypeADIZ {
		return openAIPAirspaceAccessTag(
			"permission-required",
			"ADIZ: flight plan, identification, communication, or other procedures may be required.",
			hasDynamicOpenAIPAirspaceStatus(airspace),
		)
	}
	if hasType && controlledOpenAIPAirspaceTypes[airspaceTypeInt] {
		return openAIPAirspaceAccessTag(
			"controlled",
			fmt.Sprintf("%s is controlled or procedure airspace, not blocked by default.", openAIPAirspaceTypeLabel(airspace["type"])),
			false,
		)
	}
	if hasICAOClass && controlledOpenAIPAirspaceClasses[icaoClassInt] {
		return openAIPAirspaceAccessTag(
			"controlled",
			fmt.Sprintf("Class %s controlled airspace is not blocked by default.", openAIPAirspaceClassLabel(airspace["icaoClass"])),
			false,
		)
	}
	if hasType && (airspaceTypeInt == openAIPAirspaceTypeFIR || airspaceTypeInt == openAIPAirspaceTypeUIR) {
		return openAIPAirspaceAccessTag(
			"informational",
			fmt.Sprintf("%s is informational flight information airspace.", openAIPAirspaceTypeLabel(airspace["type"])),
			false,
		)
	}
	return openAIPAirspaceAccessTag(
		"unknown",
		"OpenAIP airspace type is not mapped to a civil access rule; confirm current procedures.",
		true,
	)
}

func activeDependentAirspaceTag(airspace map[string]any, activeLevel, activeReason string) map[string]any {
	activeState := resolveOpenAIPAirspaceActiveState(airspace, openAIPAirspaceNow())
	if activeState == "inactive" {
		return openAIPAirspaceAccessTag(
			"informational",
			fmt.Sprintf("%s is not currently active by its published active window.", openAIPAirspaceTypeLabel(airspace["type"])),
			false,
		)
	}
	if hasDynamicOpenAIPAirspaceStatus(airspace) {
		return openAIPAirspaceAccessTag(activeLevel, dynamicOpenAIPAirspaceStatusReason(airspace), true)
	}
	if activeState == "active" {
		return openAIPAirspaceAccessTag(activeLevel, activeReason, false)
	}
	return openAIPAirspaceAccessTag(
		activeLevel,
		"Active status is not explicit in OpenAIP; confirm current status before entry.",
		true,
	)
}

func resolveOpenAIPAirspaceActiveState(airspace map[string]any, now time.Time) string {
	activeFrom, hasActiveFrom := parseOpenAIPAirspaceTime(airspace["activeFrom"])
	activeUntil, hasActiveUntil := parseOpenAIPAirspaceTime(airspace["activeUntil"])
	if hasActiveFrom && now.Before(activeFrom) {
		return "inactive"
	}
	if hasActiveUntil && now.After(activeUntil) {
		return "inactive"
	}
	if hasActiveFrom || hasActiveUntil {
		return "active"
	}
	return "unknown"
}

func parseOpenAIPAirspaceTime(value any) (time.Time, bool) {
	text := cleanStringValue(value)
	if text == "" {
		return time.Time{}, false
	}
	parsed, err := time.Parse(time.RFC3339Nano, text)
	if err != nil {
		return time.Time{}, false
	}
	return parsed, true
}

func hasDynamicOpenAIPAirspaceStatus(airspace map[string]any) bool {
	return boolValue(airspace["onDemand"]) ||
		boolValue(airspace["onRequest"]) ||
		boolValue(airspace["byNotam"]) ||
		boolValue(airspace["specialAgreement"]) ||
		boolValue(airspace["requestCompliance"]) ||
		airspace["hoursOfOperation"] != nil
}

func dynamicOpenAIPAirspaceStatusReason(airspace map[string]any) string {
	if boolValue(airspace["byNotam"]) {
		return "Status may be activated by NOTAM; confirm current status before entry."
	}
	if boolValue(airspace["onDemand"]) || boolValue(airspace["onRequest"]) {
		return "Status can change on demand or request; confirm current status before entry."
	}
	if boolValue(airspace["specialAgreement"]) {
		return "Entry may depend on a special agreement or authorization."
	}
	if boolValue(airspace["requestCompliance"]) {
		return "Published as request-compliance airspace; confirm local procedures."
	}
	if airspace["hoursOfOperation"] != nil {
		return "Hours of operation are published; confirm the current active period."
	}
	return "Active status is not explicit in OpenAIP; confirm current status before entry."
}

func openAIPAirspaceAccessTag(level, reason string, requiresStatusCheck bool) map[string]any {
	labels := openAIPAirspaceAccessLabels[level]
	if labels == nil {
		level = "unknown"
		labels = openAIPAirspaceAccessLabels[level]
	}
	return map[string]any{
		"level":               level,
		"label":               labels["label"],
		"shortLabel":          labels["shortLabel"],
		"reason":              reason,
		"requiresStatusCheck": requiresStatusCheck,
	}
}

func formatOpenAIPAirspaceLimit(limit map[string]any) string {
	if limit == nil {
		return ""
	}
	value, hasValue := airspaceNumber(limit["value"])
	if !hasValue {
		return ""
	}
	unit, hasUnit := airspaceNumber(limit["unit"])
	referenceDatum, hasDatum := airspaceNumber(limit["referenceDatum"])
	if hasDatum && value == 0 && int(referenceDatum) == 0 {
		return "SFC"
	}
	if hasUnit && int(unit) == 6 {
		return fmt.Sprintf("FL %s", formatAirspaceNumber(value))
	}

	unitLabel := "ft"
	if hasUnit && int(unit) == 0 {
		unitLabel = "m"
	}
	datumLabel := "MSL"
	if hasDatum && int(referenceDatum) == 0 {
		datumLabel = "AGL"
	} else if hasDatum && int(referenceDatum) == 2 {
		datumLabel = "STD"
	}
	return fmt.Sprintf("%s %s %s", formatAirspaceNumber(value), unitLabel, datumLabel)
}

func airspaceNumber(value any) (float64, bool) {
	number := numberValue(value)
	return number, finite(number)
}

func nullableAirspaceNumber(value float64, ok bool) any {
	if !ok {
		return nil
	}
	return value
}

func formatAirspaceNumber(value float64) string {
	if math.Trunc(value) == value {
		return strconv.FormatInt(int64(value), 10)
	}
	return strconv.FormatFloat(value, 'f', -1, 64)
}

func cleanStringValue(value any) string {
	text := stringValue(value)
	if text == "<nil>" {
		return ""
	}
	return text
}

func mapReportingPoint(point map[string]any) map[string]any {
	lat, lon := pointCoordinates(asRecord(point["geometry"]))
	return map[string]any{
		"id":         stringValue(point["_id"]),
		"name":       stringValue(point["name"]),
		"country":    upper(stringValue(point["country"])),
		"lat":        lat,
		"lon":        lon,
		"geometry":   point["geometry"],
		"compulsory": boolValue(point["compulsory"]),
		"source":     "openaip",
	}
}

func mapObstacle(obstacle map[string]any) map[string]any {
	lat, lon := pointCoordinates(asRecord(obstacle["geometry"]))
	return map[string]any{
		"id":          stringValue(obstacle["_id"]),
		"name":        stringValue(obstacle["name"]),
		"type":        stringValue(obstacle["type"]),
		"country":     upper(stringValue(obstacle["country"])),
		"lat":         lat,
		"lon":         lon,
		"geometry":    obstacle["geometry"],
		"elevationFt": metersToFeet(valueAt(obstacle, "elevation", "value")),
		"heightFt":    metersToFeet(valueAt(obstacle, "height", "value")),
		"source":      "openaip",
	}
}

func mapRecords(items []map[string]any, mapper func(map[string]any) map[string]any) []map[string]any {
	out := []map[string]any{}
	for _, item := range items {
		if mapped := mapper(item); mapped != nil {
			out = append(out, mapped)
		}
	}
	return out
}

func rankAirports(items []map[string]any, query string) []map[string]any {
	normalized := upper(query)
	sort.Slice(items, func(i, j int) bool {
		left, right := airportScore(items[i], normalized), airportScore(items[j], normalized)
		if left != right {
			return left < right
		}
		return stringValue(items[i]["name"]) < stringValue(items[j]["name"])
	})
	return items
}

func airportScore(airport map[string]any, query string) int {
	icao := upper(stringValue(airport["icaoCode"]))
	iata := upper(stringValue(airport["iataCode"]))
	alt := upper(stringValue(airport["altIdentifier"]))
	name := upper(stringValue(airport["name"]))
	switch {
	case icao == query || iata == query || alt == query:
		return 0
	case strings.HasPrefix(icao, query) || strings.HasPrefix(iata, query):
		return 1
	case strings.HasPrefix(name, query):
		return 2
	case strings.Contains(name, query):
		return 3
	default:
		return 4
	}
}

func uniqueAirports(items []map[string]any) []map[string]any {
	seen := map[string]bool{}
	out := []map[string]any{}
	for _, item := range items {
		key := openAIPCode(item)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, item)
	}
	return out
}

func openAIPCode(airport map[string]any) string {
	return upper(firstString(airport["icaoCode"], airport["iataCode"], airport["altIdentifier"], airport["_id"]))
}

func pointCoordinates(geometry map[string]any) (any, any) {
	coordinates, ok := geometry["coordinates"].([]any)
	if !ok || len(coordinates) < 2 {
		return nil, nil
	}
	lon, lat := numberValue(coordinates[0]), numberValue(coordinates[1])
	if !finite(lat) || !finite(lon) {
		return nil, nil
	}
	return lat, lon
}

func parseCoordinate(raw string, minValue, maxValue float64) (float64, bool) {
	value, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil || value < minValue || value > maxValue {
		return 0, false
	}
	return value, true
}

func intInRange(raw string, fallback, minValue, maxValue int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return fallback
	}
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func openMeteoURL(lat, lon float64) string {
	values := url.Values{}
	values.Set("latitude", strconv.FormatFloat(lat, 'f', -1, 64))
	values.Set("longitude", strconv.FormatFloat(lon, 'f', -1, 64))
	values.Set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index")
	// `visibility` is hourly-only in Open-Meteo; the current value is read from
	// the current hour by the client normalizer.
	values.Set("hourly", "temperature_2m,weather_code,precipitation_probability,visibility")
	values.Set("daily", "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max")
	values.Set("temperature_unit", "celsius")
	values.Set("wind_speed_unit", "kn")
	values.Set("precipitation_unit", "inch")
	values.Set("timezone", "auto")
	values.Set("forecast_days", "2")
	return "https://api.open-meteo.com/v1/forecast?" + values.Encode()
}

func valueAt(value any, keys ...string) any {
	current := value
	for _, key := range keys {
		record := asRecord(current)
		if record == nil {
			return nil
		}
		current = record[key]
	}
	return current
}

func asRecord(value any) map[string]any {
	if record, ok := value.(map[string]any); ok {
		return record
	}
	return nil
}

func asRecords(value any) []map[string]any {
	if records, ok := value.([]map[string]any); ok {
		return records
	}
	raw, ok := value.([]any)
	if !ok {
		return nil
	}
	out := []map[string]any{}
	for _, item := range raw {
		if record := asRecord(item); record != nil {
			out = append(out, record)
		}
	}
	return out
}

func stringValue(value any) string {
	return strings.TrimSpace(fmt.Sprint(value))
}

func firstString(values ...any) string {
	for _, value := range values {
		text := stringValue(value)
		if text != "" && text != "<nil>" {
			return text
		}
	}
	return ""
}

func fallbackString(value, fallback string) string {
	if strings.TrimSpace(value) != "" && value != "<nil>" {
		return value
	}
	return fallback
}

func upper(value any) string {
	return strings.ToUpper(strings.TrimSpace(fmt.Sprint(value)))
}

func numberValue(value any) float64 {
	switch typed := value.(type) {
	case float64:
		return typed
	case float32:
		return float64(typed)
	case int:
		return float64(typed)
	case int64:
		return float64(typed)
	case json.Number:
		v, _ := typed.Float64()
		return v
	case string:
		v, _ := strconv.ParseFloat(strings.TrimSpace(typed), 64)
		return v
	default:
		return math.NaN()
	}
}

func intValue(value any) int {
	number := numberValue(value)
	if !finite(number) {
		return 0
	}
	return int(number)
}

func boolValue(value any) bool {
	if typed, ok := value.(bool); ok {
		return typed
	}
	return strings.EqualFold(stringValue(value), "true")
}

func metersToFeet(value any) any {
	number := numberValue(value)
	if !finite(number) {
		return nil
	}
	return int(math.Round(number * 3.280839895))
}

func nullableNumber(value float64) any {
	if !finite(value) {
		return nil
	}
	return value
}

func finite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}

func distanceNm(lat1, lon1, lat2, lon2 float64) float64 {
	if !finite(lat1) || !finite(lon1) || !finite(lat2) || !finite(lon2) {
		return math.NaN()
	}
	toRad := func(value float64) float64 { return value * math.Pi / 180 }
	dLat, dLon := toRad(lat2-lat1), toRad(lon2-lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	return 3440.065 * 2 * math.Asin(math.Min(1, math.Sqrt(a)))
}

func reciprocalDesignator(designator string) string {
	if len(designator) < 2 {
		return ""
	}
	number, err := strconv.Atoi(designator[:2])
	if err != nil {
		return ""
	}
	reciprocal := ((number + 17) % 36) + 1
	side := ""
	if len(designator) > 2 {
		switch designator[2:] {
		case "L":
			side = "R"
		case "R":
			side = "L"
		case "C":
			side = "C"
		}
	}
	return fmt.Sprintf("%02d%s", reciprocal, side)
}

func airportTypeLabel(value any) string {
	switch intValue(value) {
	case 1:
		return "Glider Site"
	case 2:
		return "Civil Airfield"
	case 3:
		return "International Airport"
	case 4:
		return "Military Heliport"
	case 5:
		return "Military Aerodrome"
	case 7:
		return "Civil Heliport"
	case 8:
		return "Closed Aerodrome"
	case 9:
		return "IFR Airport"
	case 10:
		return "Water Airfield"
	case 11:
		return "Landing Strip"
	default:
		return "Airport"
	}
}

func match(value, pattern string) bool {
	switch pattern {
	case `^[A-Z]{2}$`:
		return len(value) == 2 && all(value, func(r rune) bool { return r >= 'A' && r <= 'Z' })
	case `^[A-Z0-9]{2,7}$`:
		return len(value) >= 2 && len(value) <= 7 && all(value, isUpperAlphaNum)
	case `^[A-Z0-9]{3,4}$`:
		return len(value) >= 3 && len(value) <= 4 && all(value, isUpperAlphaNum)
	case `^[A-Z0-9]{2,4}$`:
		return len(value) >= 2 && len(value) <= 4 && all(value, isUpperAlphaNum)
	default:
		return false
	}
}

func all(value string, predicate func(rune) bool) bool {
	if value == "" {
		return false
	}
	for _, r := range value {
		if !predicate(r) {
			return false
		}
	}
	return true
}

func isUpperAlphaNum(r rune) bool {
	return (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9')
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

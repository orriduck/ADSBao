package webapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

const (
	defaultOpenAIPBaseURL = "https://api.core.openaip.net/api"
	defaultTimeout        = 12 * time.Second
	metersPerNM           = 1852
	maxJSONBytes          = 4 * 1024 * 1024
)

type Options struct {
	HTTPClient      *http.Client
	OpenAIPAPIKey   string
	OpenAIPBaseURL  string
	Timeout         time.Duration
	AircraftFetcher func(context.Context, realtime.FetchInput) (realtime.Event, error)
	Metrics         realtime.MetricsSink
	Authenticator   *ClerkAuthenticator
	UserDataStore   *UserDataStore
}

type Handler struct {
	httpClient      *http.Client
	openAIPAPIKey   string
	openAIPBaseURL  string
	timeout         time.Duration
	aircraftFetcher func(context.Context, realtime.FetchInput) (realtime.Event, error)
	metrics         realtime.MetricsSink
	authenticator   *ClerkAuthenticator
	userDataStore   *UserDataStore
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
	timeout := options.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	return &Handler{
		httpClient:      httpClient,
		openAIPAPIKey:   strings.TrimSpace(options.OpenAIPAPIKey),
		openAIPBaseURL:  baseURL,
		timeout:         timeout,
		aircraftFetcher: options.AircraftFetcher,
		metrics:         options.Metrics,
		authenticator:   options.Authenticator,
		userDataStore:   options.UserDataStore,
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	switch {
	case r.Method == http.MethodGet && r.URL.Path == "/api/search":
		h.handleSearch(w, r)
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
	radiusNm := intInRange(r.URL.Query().Get("nearbyRadiusNm"), 60, 1, 250)
	nearbyLimit := intInRange(r.URL.Query().Get("nearbyLimit"), 12, 1, 50)
	matchDoc, err := h.findAirport(r.Context(), ident)
	if err != nil {
		writeAPIError(w, err, "Airport detail load failed")
		return
	}
	if matchDoc == nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Airport not found"})
		return
	}
	id := stringValue(matchDoc["_id"])
	detail := matchDoc
	if id != "" {
		if fetched, err := h.getOpenAIP(r.Context(), "/airports/"+url.PathEscape(id), url.Values{
			"fields": {strings.Join(airportDetailFields(), ",")},
		}); err == nil {
			detail = fetched
		}
	}
	airport := mapAirport(detail)
	if airport == nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Airport not found"})
		return
	}
	lat, lon := numberValue(airport["lat"]), numberValue(airport["lon"])
	nearbyAirports := []map[string]any{}
	nearbyNavaids := []map[string]any{}
	airspaces := []map[string]any{}
	reportingPoints := []map[string]any{}
	obstacles := []map[string]any{}
	if finite(lat) && finite(lon) {
		nearbyAirports = h.nearbyAirports(r.Context(), lat, lon, ident, radiusNm, nearbyLimit)
		nearbyNavaids = h.nearbyNavaids(r.Context(), lat, lon, radiusNm, nearbyLimit)
		airspaces = h.nearbyAirspaces(r.Context(), lat, lon, radiusNm)
		reportingPoints = h.reportingPoints(r.Context(), id)
		obstacles = h.nearbyObstacles(r.Context(), lat, lon, minInt(radiusNm, 50))
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"airport":         airport,
		"runways":         mapRunways(asRecords(detail["runways"]), detail),
		"frequencies":     mapFrequencies(asRecords(detail["frequencies"]), detail),
		"nearbyAirports":  nearbyAirports,
		"nearbyNavaids":   nearbyNavaids,
		"airspaces":       airspaces,
		"reportingPoints": reportingPoints,
		"obstacles":       obstacles,
		"runwayMap":       nil,
		"source":          "openaip",
	})
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
	}
	sort.Slice(out, func(i, j int) bool {
		return numberValue(out[i]["distanceNm"]) < numberValue(out[j]["distanceNm"])
	})
	if len(out) > limit {
		out = out[:limit]
	}
	return out
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
		"name":             fallbackString(stringValue(airport["name"]), code),
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
				"lat":                  nil,
				"lon":                  nil,
				"elevationFt":          nil,
				"headingDegT":          nullableNumber(heading),
				"displacedThresholdFt": nil,
			},
			"he": map[string]any{
				"ident":                reciprocalDesignator(designator),
				"lat":                  nil,
				"lon":                  nil,
				"elevationFt":          nil,
				"headingDegT":          nullableNumber(math.Mod(heading+180, 360)),
				"displacedThresholdFt": nil,
			},
			"source": "openaip",
		})
	}
	return out
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
	return map[string]any{
		"id":       stringValue(airspace["_id"]),
		"name":     stringValue(airspace["name"]),
		"type":     stringValue(airspace["type"]),
		"country":  upper(stringValue(airspace["country"])),
		"geometry": airspace["geometry"],
		"source":   "openaip",
	}
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
	values.Set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m")
	values.Set("hourly", "temperature_2m,weather_code,precipitation_probability")
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

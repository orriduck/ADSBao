package webapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/metrics"
)

const (
	defaultMapMode        = "controller"
	defaultBaseLayer      = "standard"
	defaultAmbientMode    = "ambient"
	feedbackTTL           = 12 * time.Hour
	feedbackSource        = "community-feedback"
	feedbackSuffix        = "*"
	feedbackReasonMissing = "missing_route"
)

var (
	mapModes        = map[string]bool{"spotting": true, "radio": true, "controller": true, "custom": true}
	selectableModes = map[string]bool{"spotting": true, "radio": true, "controller": true}
	layerKeys       = map[string]bool{
		"mapLabels": true, "approachBeams": true, "navaidMarkers": true, "reportingPoints": true, "airspaces": true,
		"candidateWatchingSpots": true, "showCallsigns": true, "userLocation": true, "userLocationAudio": true,
	}
	baseLayers   = map[string]bool{"standard": true, "terrain": true}
	ambientModes = map[string]bool{"theme": true, "ambient": true}
)

type UserDataStore struct {
	db          *sql.DB
	environment string
	metrics     databaseMetrics
}

type databaseMetrics interface {
	RecordDBTransaction(operation, result string, durationMS int64)
}

type rowScanner interface {
	Scan(dest ...any) error
}

func NewUserDataStore(db *sql.DB, environment string, registry *metrics.Metrics) *UserDataStore {
	if db == nil {
		return nil
	}
	env := normalizeEnvironment(environment)
	return &UserDataStore{db: db, environment: env, metrics: registry}
}

func (s *UserDataStore) readFeatureFlags(ctx context.Context, email string) (map[string]bool, error) {
	if s == nil || s.db == nil {
		return nil, sql.ErrNoRows
	}
	var raw []byte
	err := s.queryRow(ctx, "read_feature_flags",
		`select flags
		 from app_user.user_feature_flags
		 where email = $1 and environment = $2
		 limit 1`,
		normalizeEmail(email),
		s.environment,
	).Scan(&raw)
	if err != nil {
		return nil, err
	}
	var flags map[string]any
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &flags)
	}
	return normalizeFeatureFlags(flags), nil
}

func (s *UserDataStore) readMapSettings(ctx context.Context, email, device string) (map[string]any, error) {
	if s == nil || s.db == nil {
		return nil, sql.ErrNoRows
	}
	var raw []byte
	var hasSelected bool
	var updatedAt time.Time
	err := s.queryRow(ctx, "read_map_settings",
		`select settings, has_selected_mode, updated_at
		 from app_user.user_map_settings
		 where email = $1 and environment = $2 and device = $3
		 limit 1`,
		normalizeEmail(email),
		s.environment,
		normalizeMapSettingsDevice(device),
	).Scan(&raw, &hasSelected, &updatedAt)
	if err != nil {
		return nil, err
	}
	var settings map[string]any
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &settings)
	}
	if settings == nil {
		settings = map[string]any{}
	}
	settings["hasSelectedMode"] = hasSelected
	if _, ok := settings["updatedAt"]; !ok {
		settings["updatedAt"] = updatedAt.UTC().Format(time.RFC3339Nano)
	}
	return normalizeMapSettings(settings), nil
}

func (s *UserDataStore) upsertMapSettings(ctx context.Context, email, device string, updates map[string]any) (map[string]any, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("map settings storage unavailable")
	}
	normalizedEmail := normalizeEmail(email)
	normalizedDevice := normalizeMapSettingsDevice(device)
	current, err := s.readMapSettings(ctx, normalizedEmail, normalizedDevice)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	next := mergeMapSettings(current, updates)
	updatedAt := time.Now().UTC().Format(time.RFC3339Nano)
	next["updatedAt"] = updatedAt
	body, err := json.Marshal(next)
	if err != nil {
		return nil, err
	}
	var raw []byte
	var hasSelected bool
	var storedAt time.Time
	err = s.queryRow(ctx, "upsert_map_settings",
		`insert into app_user.user_map_settings (
		   email, environment, device, settings, has_selected_mode, updated_at
		 )
		 values ($1, $2, $3, $4::jsonb, $5, $6)
		 on conflict (email, environment, device)
		 do update set
		   settings = excluded.settings,
		   has_selected_mode = excluded.has_selected_mode,
		   updated_at = excluded.updated_at
		 returning settings, has_selected_mode, updated_at`,
		normalizedEmail,
		s.environment,
		normalizedDevice,
		string(body),
		boolValue(next["hasSelectedMode"]),
		updatedAt,
	).Scan(&raw, &hasSelected, &storedAt)
	if err != nil {
		return nil, err
	}
	var stored map[string]any
	_ = json.Unmarshal(raw, &stored)
	if stored == nil {
		stored = map[string]any{}
	}
	stored["hasSelectedMode"] = hasSelected
	stored["updatedAt"] = storedAt.UTC().Format(time.RFC3339Nano)
	return normalizeMapSettings(stored), nil
}

func (s *UserDataStore) writeRouteFeedback(ctx context.Context, record map[string]any) error {
	if s == nil || s.db == nil {
		return fmt.Errorf("route feedback storage unavailable")
	}
	priorPayload, _ := json.Marshal(record["priorRoutePayload"])
	if record["priorRoutePayload"] == nil {
		priorPayload = nil
	}
	routePayload, err := json.Marshal(record["routePayload"])
	if err != nil {
		return err
	}
	_, err = s.exec(ctx, "write_route_feedback",
		`insert into runtime.flight_route_feedback_reports (
		   cache_key, normalized_callsign, target_airport_icao, target_airport_iata,
		   origin_icao, destination_icao, aircraft_hex, aircraft_type, user_hash,
		   feedback_reason, prior_route_payload, route_payload, status, created_at,
		   expires_at, deleted_at
		 )
		 values (
		   $1, $2, nullif($3, ''), nullif($4, ''), $5, $6, nullif($7, ''),
		   nullif($8, ''), nullif($9, ''), $10, $11::jsonb, $12::jsonb,
		   'active', $13, $14, null
		 )`,
		record["cacheKey"],
		record["normalizedCallsign"],
		record["targetAirportIcao"],
		record["targetAirportIata"],
		record["originIcao"],
		record["destinationIcao"],
		record["aircraftHex"],
		record["aircraftType"],
		record["userHash"],
		record["feedbackReason"],
		nullableJSONString(priorPayload),
		string(routePayload),
		record["createdAt"],
		record["expiresAt"],
	)
	return err
}

func (s *UserDataStore) queryRow(ctx context.Context, operation string, query string, args ...any) rowScanner {
	started := time.Now()
	row := s.db.QueryRowContext(ctx, query, args...)
	return &instrumentedRow{
		Row:       row,
		metrics:   s.metrics,
		operation: operation,
		started:   started,
	}
}

func (s *UserDataStore) query(ctx context.Context, operation string, query string, args ...any) (*sql.Rows, error) {
	started := time.Now()
	rows, err := s.db.QueryContext(ctx, query, args...)
	s.recordDB(operation, err, started)
	return rows, err
}

func (s *UserDataStore) exec(ctx context.Context, operation string, query string, args ...any) (sql.Result, error) {
	started := time.Now()
	result, err := s.db.ExecContext(ctx, query, args...)
	s.recordDB(operation, err, started)
	return result, err
}

func (s *UserDataStore) recordDB(operation string, err error, started time.Time) {
	if s == nil || s.metrics == nil {
		return
	}
	result := "success"
	if err != nil && err != sql.ErrNoRows {
		result = "error"
	}
	s.metrics.RecordDBTransaction(operation, result, time.Since(started).Milliseconds())
}

type instrumentedRow struct {
	*sql.Row
	metrics   databaseMetrics
	operation string
	started   time.Time
}

func (r *instrumentedRow) Scan(dest ...any) error {
	err := r.Row.Scan(dest...)
	if r.metrics != nil {
		result := "success"
		if err != nil && err != sql.ErrNoRows {
			result = "error"
		}
		r.metrics.RecordDBTransaction(r.operation, result, time.Since(r.started).Milliseconds())
	}
	return err
}

func normalizeMapSettingsDevice(value string) string {
	if strings.ToLower(strings.TrimSpace(value)) == "mobile" {
		return "mobile"
	}
	return "desktop"
}

func normalizeMapSettings(settings map[string]any) map[string]any {
	selectedMode := lowerString(settings["selectedMode"])
	if !mapModes[selectedMode] {
		selectedMode = defaultMapMode
	}
	baseMode := lowerString(settings["baseMode"])
	if !selectableModes[baseMode] {
		if selectableModes[selectedMode] {
			baseMode = selectedMode
		} else {
			baseMode = defaultMapMode
		}
	}
	baseLayer := lowerString(firstMapValue(settings, "baseLayer", "base_layer"))
	if !baseLayers[baseLayer] {
		baseLayer = defaultBaseLayer
	}
	ambientMode := lowerString(firstMapValue(settings, "ambientMode", "ambient_mode"))
	if !ambientModes[ambientMode] {
		ambientMode = defaultAmbientMode
	}
	return map[string]any{
		"selectedMode":    selectedMode,
		"baseMode":        baseMode,
		"layerOverrides":  normalizeLayerOverrides(settings["layerOverrides"]),
		"baseLayer":       baseLayer,
		"ambientMode":     ambientMode,
		"audioEnabled":    boolValue(settings["audioEnabled"]),
		"hasSelectedMode": boolValue(firstMapValue(settings, "hasSelectedMode", "has_selected_mode")),
		"updatedAt":       strings.TrimSpace(fmt.Sprint(firstMapValue(settings, "updatedAt", "updated_at"))),
	}
}

func mergeMapSettings(settings, updates map[string]any) map[string]any {
	if settings == nil {
		settings = map[string]any{}
	}
	if updates == nil {
		updates = map[string]any{}
	}
	current := normalizeMapSettings(settings)
	replacingMode := hasKey(updates, "selectedMode") || hasKey(updates, "baseMode")
	nextLayers := normalizeLayerOverrides(current["layerOverrides"])
	if hasKey(updates, "layerOverrides") {
		if replacingMode {
			nextLayers = normalizeLayerOverrides(updates["layerOverrides"])
		} else {
			for key, value := range normalizeLayerOverrides(updates["layerOverrides"]) {
				nextLayers[key] = value
			}
		}
	}
	next := map[string]any{
		"selectedMode":    current["selectedMode"],
		"baseMode":        current["baseMode"],
		"layerOverrides":  nextLayers,
		"baseLayer":       current["baseLayer"],
		"ambientMode":     current["ambientMode"],
		"audioEnabled":    current["audioEnabled"],
		"hasSelectedMode": current["hasSelectedMode"],
		"updatedAt":       current["updatedAt"],
	}
	if hasKey(updates, "selectedMode") {
		next["selectedMode"] = updates["selectedMode"]
	}
	if hasKey(updates, "baseMode") {
		next["baseMode"] = updates["baseMode"]
	}
	if hasKey(updates, "baseLayer") || hasKey(updates, "base_layer") {
		next["baseLayer"] = firstMapValue(updates, "baseLayer", "base_layer")
	}
	if hasKey(updates, "ambientMode") || hasKey(updates, "ambient_mode") {
		next["ambientMode"] = firstMapValue(updates, "ambientMode", "ambient_mode")
	}
	if hasKey(updates, "audioEnabled") {
		next["audioEnabled"] = boolValue(updates["audioEnabled"])
	}
	if hasKey(updates, "hasSelectedMode") || hasKey(updates, "has_selected_mode") {
		next["hasSelectedMode"] = boolValue(firstMapValue(updates, "hasSelectedMode", "has_selected_mode"))
	}
	if hasKey(updates, "updatedAt") || hasKey(updates, "updated_at") {
		next["updatedAt"] = firstMapValue(updates, "updatedAt", "updated_at")
	}
	return normalizeMapSettings(next)
}

func normalizeLayerOverrides(raw any) map[string]any {
	record, ok := raw.(map[string]any)
	if !ok {
		return map[string]any{}
	}
	out := map[string]any{}
	for key, value := range record {
		if layerKeys[key] {
			if enabled, ok := value.(bool); ok {
				out[key] = enabled
			}
		}
	}
	return out
}

func handleDatabaseError(w http.ResponseWriter, err error, userMessage string) {
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusOK, map[string]any{"settings": nil})
		return
	}
	writeJSON(w, http.StatusInternalServerError, map[string]any{"error": userMessage})
}

func normalizeRouteFeedbackInput(raw map[string]any) (map[string]any, string) {
	callsign := normalizeCallsign(fmt.Sprint(raw["callsign"]))
	if callsign == "" {
		return nil, "Invalid callsign"
	}
	origin := sanitizeFeedbackAirportCode(raw["originIcao"], 2, 4)
	destination := sanitizeFeedbackAirportCode(raw["destinationIcao"], 2, 4)
	if origin == "" || destination == "" {
		return nil, "Invalid origin or destination ICAO"
	}
	if origin == destination {
		return nil, "Origin and destination must differ"
	}
	reason := strings.TrimSpace(fmt.Sprint(raw["feedbackReason"]))
	if reason != "correction" {
		reason = feedbackReasonMissing
	}
	return map[string]any{
		"normalizedCallsign": callsign,
		"originIcao":         origin,
		"destinationIcao":    destination,
		"targetAirportIcao":  sanitizeFeedbackAirportCode(raw["targetAirportIcao"], 2, 4),
		"targetAirportIata":  sanitizeFeedbackAirportCode(raw["targetAirportIata"], 3, 3),
		"feedbackReason":     reason,
		"aircraftHex":        sanitizeAircraftHex(raw["aircraftHex"]),
		"aircraftType":       sanitizeAircraftType(raw["aircraftType"]),
		"priorRoute":         sanitizePriorRoute(raw["priorRoute"]),
	}, ""
}

func buildRouteFeedbackSpec(input, originAirport, destinationAirport map[string]any) map[string]any {
	if input == nil || originAirport == nil || destinationAirport == nil {
		return nil
	}
	createdAt := time.Now().UTC()
	expiresAt := createdAt.Add(feedbackTTL)
	route := buildCommunityFeedbackRoute(input, originAirport, destinationAirport, createdAt, expiresAt)
	if route == nil {
		return nil
	}
	cacheKey := buildRouteCacheKey(fmt.Sprint(input["normalizedCallsign"]), fmt.Sprint(input["targetAirportIcao"]), fmt.Sprint(input["targetAirportIata"]))
	return map[string]any{
		"route": route,
		"record": map[string]any{
			"cacheKey":           cacheKey,
			"normalizedCallsign": input["normalizedCallsign"],
			"targetAirportIcao":  input["targetAirportIcao"],
			"targetAirportIata":  input["targetAirportIata"],
			"originIcao":         input["originIcao"],
			"destinationIcao":    input["destinationIcao"],
			"aircraftHex":        input["aircraftHex"],
			"aircraftType":       input["aircraftType"],
			"userHash":           "",
			"feedbackReason":     input["feedbackReason"],
			"priorRoutePayload":  input["priorRoute"],
			"routePayload":       route,
			"createdAt":          createdAt.Format(time.RFC3339Nano),
			"expiresAt":          expiresAt.Format(time.RFC3339Nano),
		},
	}
}

func buildCommunityFeedbackRoute(input, originAirport, destinationAirport map[string]any, createdAt, expiresAt time.Time) map[string]any {
	callsign := fmt.Sprint(input["normalizedCallsign"])
	origin := feedbackAirportFields(originAirport)
	destination := feedbackAirportFields(destinationAirport)
	if callsign == "" || origin == nil || destination == nil || origin["icao"] == destination["icao"] {
		return nil
	}
	originIATA, _ := origin["iata"].(string)
	destinationIATA, _ := destination["iata"].(string)
	routeIATA := ""
	if originIATA != "" && destinationIATA != "" {
		routeIATA = originIATA + "-" + destinationIATA
	}
	return map[string]any{
		"callsign":     callsign,
		"callsignIcao": callsign,
		"callsignIata": "",
		"number":       "",
		"airline": map[string]any{
			"icao": callsignPrefix(callsign), "iata": "", "name": "", "callsign": "", "iconUrl": "",
		},
		"origin":      origin,
		"destination": destination,
		"route": map[string]any{
			"icao": fmt.Sprint(origin["icao"]) + "-" + fmt.Sprint(destination["icao"]),
			"iata": routeIATA,
		},
		"airports":       []map[string]any{origin, destination},
		"source":         feedbackSource,
		"confidence":     "user-supplied",
		"temporary":      true,
		"displaySuffix":  feedbackSuffix,
		"feedbackReason": input["feedbackReason"],
		"createdAt":      createdAt.Format(time.RFC3339Nano),
		"expiresAt":      expiresAt.Format(time.RFC3339Nano),
	}
}

func feedbackAirportFields(airport map[string]any) map[string]any {
	icao := sanitizeFeedbackAirportCode(airport["icao"], 2, 4)
	if icao == "" {
		icao = sanitizeFeedbackAirportCode(airport["ident"], 2, 4)
	}
	if icao == "" {
		return nil
	}
	return map[string]any{
		"icao":         icao,
		"iata":         sanitizeFeedbackAirportCode(airport["iata"], 3, 3),
		"name":         strings.TrimSpace(fmt.Sprint(airport["name"])),
		"municipality": strings.TrimSpace(fmt.Sprint(firstMapValue(airport, "municipality", "city"))),
		"country":      strings.ToUpper(strings.TrimSpace(fmt.Sprint(airport["country"]))),
		"lat":          nullableNumber(numberValue(airport["lat"])),
		"lon":          nullableNumber(numberValue(airport["lon"])),
	}
}

func sanitizeFeedbackAirportCode(value any, minLen, maxLen int) string {
	raw := strings.TrimSpace(fmt.Sprint(value))
	if raw == "" || raw == "<nil>" {
		return ""
	}
	code := strings.ToUpper(raw)
	var b strings.Builder
	for _, r := range code {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	code = b.String()
	if len(code) < minLen || len(code) > maxLen {
		return ""
	}
	return code
}

func sanitizeAircraftHex(value any) string {
	hex := strings.ToLower(strings.TrimSpace(fmt.Sprint(value)))
	if match(hex, `^~?[0-9a-f]{6}$`) {
		return hex
	}
	return ""
}

func sanitizeAircraftType(value any) string {
	aircraftType := strings.ToUpper(strings.TrimSpace(fmt.Sprint(value)))
	if match(aircraftType, `^[A-Z0-9]{2,8}$`) {
		return aircraftType
	}
	return ""
}

func sanitizePriorRoute(raw any) map[string]any {
	record, ok := raw.(map[string]any)
	if !ok {
		return nil
	}
	origin := sanitizeFeedbackAirportCode(firstNestedValue(record, "origin", "icao", "originIcao"), 2, 4)
	destination := sanitizeFeedbackAirportCode(firstNestedValue(record, "destination", "icao", "destinationIcao"), 2, 4)
	source := strings.TrimSpace(fmt.Sprint(record["source"]))
	if origin == "" && destination == "" && source == "" {
		return nil
	}
	out := map[string]any{"source": source}
	if origin != "" {
		out["origin"] = map[string]any{"icao": origin}
	} else {
		out["origin"] = nil
	}
	if destination != "" {
		out["destination"] = map[string]any{"icao": destination}
	} else {
		out["destination"] = nil
	}
	return out
}

func buildRouteCacheKey(callsign, airportIcao, airportIata string) string {
	suffix := []string{}
	if airportIcao != "" {
		suffix = append(suffix, airportIcao)
	}
	if airportIata != "" {
		suffix = append(suffix, airportIata)
	}
	if len(suffix) == 0 {
		return callsign
	}
	return callsign + "|" + strings.Join(suffix, "|")
}

func callsignPrefix(callsign string) string {
	if len(callsign) < 3 {
		return callsign
	}
	return callsign[:3]
}

func nullableJSONString(raw []byte) any {
	if raw == nil {
		return nil
	}
	return string(raw)
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func normalizeFeatureFlags(flags map[string]any) map[string]bool {
	out := map[string]bool{}
	for key, value := range flags {
		out[strings.TrimSpace(key)] = value == true
	}
	return out
}

func normalizeEnvironment(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "production", "preview", "local":
		return strings.ToLower(strings.TrimSpace(value))
	case "development":
		return "local"
	default:
		return "local"
	}
}

func lowerString(value any) string {
	return strings.ToLower(strings.TrimSpace(fmt.Sprint(value)))
}

func hasKey(record map[string]any, key string) bool {
	_, ok := record[key]
	return ok
}

func firstMapValue(record map[string]any, keys ...string) any {
	for _, key := range keys {
		if value, ok := record[key]; ok {
			return value
		}
	}
	return ""
}

func firstNestedValue(record map[string]any, objectKey, nestedKey, fallbackKey string) any {
	if nested, ok := record[objectKey].(map[string]any); ok {
		if value, ok := nested[nestedKey]; ok {
			return value
		}
	}
	return record[fallbackKey]
}

func decodeJSONBody(r *http.Request, maxBytes int64) (map[string]any, error) {
	defer r.Body.Close()
	var body map[string]any
	decoder := json.NewDecoder(io.LimitReader(r.Body, maxBytes))
	if err := decoder.Decode(&body); err != nil {
		return nil, err
	}
	if body == nil {
		return nil, fmt.Errorf("empty body")
	}
	return body, nil
}

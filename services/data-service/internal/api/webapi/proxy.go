package webapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/channels"
	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

const (
	aircraftJSONMaxBytes   = 24 * 1024 * 1024
	aircraftImageMaxBytes  = 2 * 1024 * 1024
	aircraftTraceTimeout   = 6 * time.Second
	planespottersUserAgent = "ADSBao data-service/1.0 (+https://adsbao.dev; planespotters/photos)"
)

type adsbProvider struct {
	id          string
	positionURL func(lat, lon float64, dist int) string
	callsignURL func(callsign string) string
}

var adsbProviders = []adsbProvider{
	{
		id: "adsb.lol",
		positionURL: func(lat, lon float64, dist int) string {
			return fmt.Sprintf("https://api.adsb.lol/v2/lat/%s/lon/%s/dist/%d", url.PathEscape(trimFloat(lat)), url.PathEscape(trimFloat(lon)), dist)
		},
		callsignURL: func(callsign string) string {
			return "https://api.adsb.lol/v2/callsign/" + url.PathEscape(callsign)
		},
	},
	{
		id: "airplanes.live",
		positionURL: func(lat, lon float64, dist int) string {
			return fmt.Sprintf("https://api.airplanes.live/v2/point/%s/%s/%d", url.PathEscape(trimFloat(lat)), url.PathEscape(trimFloat(lon)), dist)
		},
		callsignURL: func(callsign string) string {
			return "https://api.airplanes.live/v2/callsign/" + url.PathEscape(callsign)
		},
	},
	{
		id: "adsb.fi",
		positionURL: func(lat, lon float64, dist int) string {
			return fmt.Sprintf("https://opendata.adsb.fi/api/v2/lat/%s/lon/%s/dist/%d", url.PathEscape(trimFloat(lat)), url.PathEscape(trimFloat(lon)), dist)
		},
		callsignURL: func(callsign string) string {
			return "https://opendata.adsb.fi/api/v2/callsign/" + url.PathEscape(callsign)
		},
	},
}

func (h *Handler) handleAircraftPositions(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/proxy/aircraft/positions/"), "/")
	if len(parts) < 3 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid aircraft position query"})
		return
	}
	lat, okLat := parseCoordinate(parts[0], -90, 90)
	lon, okLon := parseCoordinate(parts[1], -180, 180)
	dist := intInRange(parts[2], 0, 1, 250)
	if !okLat || !okLon || dist == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid aircraft position query"})
		return
	}
	if h.aircraftFetcher != nil {
		h.handleAircraftPositionsWithFetcher(w, r, lat, lon, dist)
		return
	}
	for _, provider := range adsbProviders {
		payload, status, err := h.fetchJSONMap(r.Context(), provider.positionURL(lat, lon, dist), adsbHeaders())
		if err != nil || status < 200 || status >= 300 {
			continue
		}
		normalizeAdsbProviderPayload(payload, provider.id)
		writeJSONWithHeaders(w, http.StatusOK, payload, map[string]string{
			"Cache-Control":       "no-store",
			"X-Data-Source":       provider.id,
			"X-Provider-Attempts": provider.id + ":200",
		})
		return
	}
	writeJSONWithHeaders(w, http.StatusBadGateway, map[string]any{"error": "Failed to load aircraft positions"}, map[string]string{
		"X-Data-Source":       "failed",
		"X-Provider-Attempts": "failed",
	})
}

func (h *Handler) handleAircraftPositionsWithFetcher(w http.ResponseWriter, r *http.Request, lat, lon float64, dist int) {
	channel := fmt.Sprintf("traffic:center:%s:%s:%d", trimFloat(lat), trimFloat(lon), dist)
	normalized, err := channels.NormalizeName(channel)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid aircraft position query"})
		return
	}
	target, err := channels.PollingTarget(normalized.Channel, nil)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid aircraft position query"})
		return
	}
	event, err := h.aircraftFetcher(r.Context(), realtime.FetchInput{
		Channel:     normalized.Channel,
		ChannelType: realtime.ChannelTraffic,
		Target:      target,
		Metrics:     h.metrics,
	})
	if err != nil {
		writeJSONWithHeaders(w, http.StatusBadGateway, map[string]any{"error": "Failed to load aircraft positions"}, map[string]string{
			"X-Data-Source":       "failed",
			"X-Provider-Attempts": "failed",
		})
		return
	}
	payload, ok := event.Data.(map[string]any)
	if !ok {
		writeJSONWithHeaders(w, http.StatusBadGateway, map[string]any{"error": "Invalid aircraft provider payload"}, map[string]string{
			"X-Data-Source":       "failed",
			"X-Provider-Attempts": "failed",
		})
		return
	}
	source := firstString(event.Source, payload["source"])
	if source == "" {
		source = "unknown"
	}
	attempts := providerAttemptsHeader(payload["attempts"], source)
	writeJSONWithHeaders(w, http.StatusOK, payload, map[string]string{
		"Cache-Control":       "no-store",
		"X-Data-Source":       source,
		"X-Provider-Attempts": attempts,
	})
}

func providerAttemptsHeader(value any, source string) string {
	switch attempts := value.(type) {
	case []string:
		if len(attempts) > 0 {
			return strings.Join(attempts, ";")
		}
	case []any:
		var parts []string
		for _, attempt := range attempts {
			part := strings.TrimSpace(fmt.Sprint(attempt))
			if part != "" {
				parts = append(parts, part)
			}
		}
		if len(parts) > 0 {
			return strings.Join(parts, ";")
		}
	case string:
		if strings.TrimSpace(attempts) != "" {
			return attempts
		}
	}
	source = strings.TrimSpace(source)
	if source == "" {
		return "unknown"
	}
	return source + ":200"
}

func (h *Handler) handleAircraftCallsign(w http.ResponseWriter, r *http.Request) {
	callsign := normalizeCallsign(strings.TrimPrefix(r.URL.Path, "/api/proxy/aircraft/callsign/"))
	if callsign == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid aircraft callsign"})
		return
	}
	for _, provider := range adsbProviders {
		payload, status, err := h.fetchJSONMap(r.Context(), provider.callsignURL(callsign), adsbHeaders())
		if err != nil || status < 200 || status >= 300 {
			continue
		}
		normalizeAdsbProviderPayload(payload, provider.id)
		payload["fetchedAt"] = time.Now().UTC().Format(time.RFC3339Nano)
		writeJSONWithHeaders(w, http.StatusOK, payload, map[string]string{
			"Cache-Control":       "no-store",
			"X-Data-Source":       provider.id,
			"X-Provider-Attempts": provider.id + ":200",
		})
		return
	}
	writeJSONWithHeaders(w, http.StatusOK, map[string]any{
		"ac":        []any{},
		"source":    "",
		"now":       float64(time.Now().UnixMilli()) / 1000,
		"fetchedAt": time.Now().UTC().Format(time.RFC3339Nano),
		"trackingState": map[string]any{
			"status":   "missing",
			"active":   false,
			"terminal": false,
		},
	}, map[string]string{
		"Cache-Control":       "no-store",
		"X-Data-Source":       "none",
		"X-Provider-Attempts": "failed",
	})
}

func (h *Handler) handleAircraftTrace(w http.ResponseWriter, r *http.Request) {
	hex := normalizeAircraftHex(strings.TrimPrefix(r.URL.Path, "/api/proxy/aircraft/trace/"))
	if hex == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid aircraft trace query"})
		return
	}
	full := r.URL.Query().Get("full") == "1"

	// Only the rolling recent trace is cached. Full traces run multi-MB and are
	// seeded client-side, so they always go straight to the upstream.
	if !full && h.traceCache != nil {
		if raw, age, ok := h.traceCache.GetTrace(r.Context(), hex); ok {
			cacheState := "fresh"
			if age >= h.traceCache.TTL() {
				// Stale-while-revalidate: serve the cached copy now, refresh in
				// the background so the next reader gets fresh data.
				cacheState = "stale"
				h.refreshTraceAsync(hex)
			}
			writeRawJSONWithHeaders(w, http.StatusOK, raw, map[string]string{
				"Cache-Control": "no-store",
				"X-Data-Source": "adsb.lol",
				"X-Cache":       cacheState,
			})
			return
		}
	}

	payload, status, err, ok := h.fetchAircraftTrace(r.Context(), hex, full)
	if !ok {
		writeJSONWithHeaders(w, http.StatusOK, emptyAircraftTracePayload(hex, status, err), map[string]string{
			"Cache-Control":       "no-store",
			"X-Data-Source":       "adsb.lol",
			"X-Provider-Attempts": "adsb.lol:" + upstreamAttemptStatus(status, err),
			"X-Upstream-Status":   upstreamStatusHeader(status, err),
		})
		return
	}
	response := map[string]any{
		"hex":    hex,
		"recent": payload,
		"source": "adsb.lol",
	}
	headers := map[string]string{
		"Cache-Control":       "no-store",
		"X-Data-Source":       "adsb.lol",
		"X-Provider-Attempts": "adsb.lol:200",
	}
	if !full && h.traceCache != nil && traceHasPoints(payload) {
		headers["X-Cache"] = "miss"
		if raw, marshalErr := json.Marshal(response); marshalErr == nil {
			h.traceCache.PutTrace(r.Context(), hex, raw)
		}
	}
	writeJSONWithHeaders(w, http.StatusOK, response, headers)
}

// fetchAircraftTrace pulls a recent or full trace from adsb.lol. ok is false on
// any transport error or non-2xx upstream status.
func (h *Handler) fetchAircraftTrace(ctx context.Context, hex string, full bool) (any, int, error, bool) {
	lower := strings.ToLower(strings.TrimPrefix(hex, "~"))
	suffix := lower
	if len(suffix) > 2 {
		suffix = suffix[len(suffix)-2:]
	}
	name := "trace_recent_" + lower + ".json"
	if full {
		name = "trace_full_" + lower + ".json"
	}
	upstream := fmt.Sprintf("https://adsb.lol/data/traces/%s/%s?_=%d", url.PathEscape(suffix), url.PathEscape(name), time.Now().UnixMilli())
	payload, status, err := h.fetchJSONAnyWithTimeout(ctx, upstream, adsbHeaders(), aircraftTraceTimeout)
	if err != nil || status < 200 || status >= 300 {
		return nil, status, err, false
	}
	return payload, status, nil, true
}

// refreshTraceAsync revalidates a stale recent-trace entry in the background.
// At most one refresh per hex runs at a time so concurrent readers don't
// stampede the upstream.
func (h *Handler) refreshTraceAsync(hex string) {
	if h.traceCache == nil {
		return
	}
	h.traceRefreshMu.Lock()
	if h.traceRefreshing == nil {
		h.traceRefreshing = map[string]bool{}
	}
	if h.traceRefreshing[hex] {
		h.traceRefreshMu.Unlock()
		return
	}
	h.traceRefreshing[hex] = true
	h.traceRefreshMu.Unlock()

	go func() {
		defer func() {
			h.traceRefreshMu.Lock()
			delete(h.traceRefreshing, hex)
			h.traceRefreshMu.Unlock()
		}()
		ctx, cancel := context.WithTimeout(context.Background(), aircraftTraceTimeout)
		defer cancel()
		payload, _, _, ok := h.fetchAircraftTrace(ctx, hex, false)
		if !ok || !traceHasPoints(payload) {
			return
		}
		response := map[string]any{"hex": hex, "recent": payload, "source": "adsb.lol"}
		if raw, err := json.Marshal(response); err == nil {
			h.traceCache.PutTrace(ctx, hex, raw)
		}
	}()
}

// traceHasPoints reports whether an adsb.lol recent payload carries at least
// one trace sample. Empty payloads are not worth caching.
func traceHasPoints(payload any) bool {
	record, ok := payload.(map[string]any)
	if !ok {
		return false
	}
	trace, ok := record["trace"].([]any)
	return ok && len(trace) > 0
}

func writeRawJSONWithHeaders(w http.ResponseWriter, status int, raw json.RawMessage, headers map[string]string) {
	for key, value := range headers {
		w.Header().Set(key, value)
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(raw)
}

func (h *Handler) handleAircraftPhoto(w http.ResponseWriter, r *http.Request) {
	hex := photoHexFromPath(r.URL.Path)
	if hex == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid aircraft photo query"})
		return
	}
	payload, status, err := h.fetchJSONMap(r.Context(), planespottersURL(hex, r.URL.Query()), map[string]string{
		"Accept":     "application/json",
		"User-Agent": planespottersUserAgent,
	})
	if err != nil || status < 200 || status >= 300 {
		writeJSONWithHeaders(w, http.StatusOK, emptyAircraftPhotoPayload(hex, status, err), map[string]string{
			"Cache-Control":       "public, s-maxage=900, stale-while-revalidate=3600",
			"X-Data-Source":       "planespotters.net",
			"X-Provider-Attempts": "planespotters.net:" + upstreamAttemptStatus(status, err),
			"X-Upstream-Status":   upstreamStatusHeader(status, err),
		})
		return
	}
	photo := selectPlanespottersPhoto(hex, r, payload)
	if photo == nil {
		writeJSONWithHeaders(w, http.StatusOK, emptyAircraftPhotoPayload(hex, status, nil), map[string]string{
			"Cache-Control":       "public, s-maxage=3600, stale-while-revalidate=86400",
			"X-Data-Source":       "planespotters.net",
			"X-Provider-Attempts": "planespotters.net:empty",
			"X-Upstream-Status":   upstreamStatusHeader(status, nil),
		})
		return
	}
	writeJSONWithHeaders(w, http.StatusOK, map[string]any{"hex": hex, "photo": photo}, map[string]string{
		"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
		"X-Data-Source": "planespotters.net",
	})
}

func (h *Handler) handleAircraftPhotoImage(w http.ResponseWriter, r *http.Request) {
	hex := photoHexFromPath(strings.TrimSuffix(r.URL.Path, "/image"))
	if hex == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid aircraft photo query"})
		return
	}
	payload, status, err := h.fetchJSONMap(r.Context(), planespottersURL(hex, r.URL.Query()), map[string]string{
		"Accept":     "application/json",
		"User-Agent": planespottersUserAgent,
	})
	if err != nil || status < 200 || status >= 300 {
		w.Header().Set("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600")
		w.Header().Set("X-Data-Source", "planespotters.net")
		w.Header().Set("X-Provider-Attempts", "planespotters.net:"+upstreamAttemptStatus(status, err))
		w.Header().Set("X-Upstream-Status", upstreamStatusHeader(status, err))
		w.WriteHeader(http.StatusNoContent)
		return
	}
	imageURL := planespottersImageURL(payload)
	if imageURL == "" {
		w.Header().Set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
		w.Header().Set("X-Data-Source", "planespotters.net")
		w.Header().Set("X-Provider-Attempts", "planespotters.net:empty")
		w.Header().Set("X-Upstream-Status", upstreamStatusHeader(status, nil))
		w.WriteHeader(http.StatusNoContent)
		return
	}
	body, contentType, status, err := h.fetchImage(r.Context(), imageURL)
	if err != nil || status < 200 || status >= 300 {
		w.Header().Set("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600")
		w.Header().Set("X-Data-Source", "planespotters.net")
		w.Header().Set("X-Provider-Attempts", "planespotters.net:image:"+upstreamAttemptStatus(status, err))
		w.Header().Set("X-Upstream-Status", upstreamStatusHeader(status, err))
		w.WriteHeader(http.StatusNoContent)
		return
	}
	w.Header().Set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("X-Data-Source", "planespotters.net")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

func (h *Handler) handleFlightRoute(w http.ResponseWriter, r *http.Request) {
	callsign := normalizeCallsign(strings.TrimPrefix(r.URL.Path, "/api/proxy/flight-routes/callsign/"))
	if callsign == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid callsign"})
		return
	}
	payload, status, err := h.fetchJSONMap(r.Context(), "https://api.adsbdb.com/v0/callsign/"+url.PathEscape(callsign), map[string]string{
		"Accept":     "application/json",
		"User-Agent": "ADSBao data-service/1.0 adsbdb/v0",
	})
	if status == http.StatusNotFound {
		writeJSONWithHeaders(w, http.StatusOK, nil, routeCacheHeaders(false))
		return
	}
	if err != nil || status < 200 || status >= 300 {
		writeJSONWithHeaders(w, http.StatusOK, nil, routeCacheHeaders(false))
		return
	}
	route := buildAdsbdbRoute(callsign, payload)
	writeJSONWithHeaders(w, http.StatusOK, route, routeCacheHeaders(route != nil))
}

func (h *Handler) handleAirlineLogo(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(strings.TrimPrefix(r.URL.Path, "/api/proxy/airlines/"))
	code = strings.Map(func(r rune) rune {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			return r
		}
		return -1
	}, code)
	if len(code) < 2 || len(code) > 3 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid airline code"})
		return
	}
	if h.flightAwareServiceBaseURL == "" {
		// Not a genuine "this airline has no logo" — the service just isn't
		// configured. Never cache this, or a misconfigured window poisons
		// client caches for an hour.
		writeJSONWithHeaders(w, http.StatusNotFound, map[string]any{"error": "Airline logo not found"}, map[string]string{
			"Cache-Control": "no-store",
			"X-Data-Source": "flightaware",
		})
		return
	}
	upstream := h.flightAwareServiceBaseURL + "/api/flightaware/airline-logo/" + url.PathEscape(code)
	headers := map[string]string{}
	if h.flightAwareServiceToken != "" {
		headers["Authorization"] = "Bearer " + h.flightAwareServiceToken
	}
	body, contentType, status, err := h.fetchImageWithHeaders(r.Context(), upstream, headers)
	if err != nil || status < 200 || status >= 300 {
		// Only a genuine upstream 404 (the airline truly has no logo) is worth
		// caching. A transport error or a 5xx is transient — serve it
		// no-store so a blip doesn't hide the logo until the cache expires.
		cacheControl := "public, max-age=3600"
		if err != nil || status == 0 || status >= 500 {
			cacheControl = "no-store"
		}
		writeJSONWithHeaders(w, statusOr(status, http.StatusNotFound), map[string]any{"error": "Airline logo not found"}, map[string]string{
			"Cache-Control": cacheControl,
			"X-Data-Source": "flightaware",
		})
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable")
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("X-Data-Source", "flightaware")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

func (h *Handler) handleReverseGeocode(w http.ResponseWriter, r *http.Request) {
	lat, okLat := parseCoordinate(r.URL.Query().Get("lat"), -90, 90)
	lon, okLon := parseCoordinate(r.URL.Query().Get("lon"), -180, 180)
	if !okLat || !okLon {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "lat and lon query parameters are required"})
		return
	}
	language := sanitizeAcceptLanguage(r.URL.Query().Get("language"))
	upstream := "https://nominatim.openstreetmap.org/reverse"
	values := url.Values{}
	values.Set("lat", trimFloat(lat))
	values.Set("lon", trimFloat(lon))
	values.Set("format", "json")
	values.Set("zoom", "10")
	values.Set("accept-language", language)
	h.proxyJSON(w, r, upstream+"?"+values.Encode(), map[string]string{
		"Accept":     "application/json",
		"User-Agent": "ADSBao/1.0 (https://adsbao.dev)",
	})
}

func (h *Handler) handleMapSettings(w http.ResponseWriter, r *http.Request) {
	user, err := h.authenticator.CurrentUser(r.Context(), r)
	if r.Method == http.MethodPut {
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Authentication required"})
			return
		}
		body, err := decodeJSONBody(r, 128*1024)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON body"})
			return
		}
		device := normalizeMapSettingsDevice(fmt.Sprint(body["device"]))
		settings, _ := body["settings"].(map[string]any)
		if h.userDataStore == nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "Map settings storage unavailable"})
			return
		}
		saved, err := h.userDataStore.upsertMapSettings(r.Context(), user.Email, device, settings)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Map settings save failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"signedIn": true,
			"device":   device,
			"settings": saved,
		})
		return
	}
	device := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("device")))
	if device != "mobile" {
		device = "desktop"
	}
	if err == nil && user != nil {
		settings, err := h.userDataStore.readMapSettings(r.Context(), user.Email, device)
		if err != nil && err != sql.ErrNoRows {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Map settings read failed"})
			return
		}
		if err != nil {
			settings = nil
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"signedIn": true,
			"device":   device,
			"settings": settings,
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"signedIn": false,
		"device":   device,
		"settings": nil,
	})
}

func (h *Handler) handleFeatureFlags(w http.ResponseWriter, r *http.Request) {
	flags := cloneFeatureFlags(h.featureFlags)
	if h.authenticator == nil || h.userDataStore == nil {
		writeJSON(w, http.StatusOK, map[string]any{"flags": flags})
		return
	}

	user, err := h.authenticator.CurrentUser(r.Context(), r)
	if err != nil || user == nil {
		writeJSON(w, http.StatusOK, map[string]any{"flags": flags})
		return
	}

	userFlags, err := h.userDataStore.readFeatureFlags(r.Context(), user.Email)
	if err != nil && err != sql.ErrNoRows {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Feature flags read failed"})
		return
	}
	for key, value := range userFlags {
		flags[key] = value
	}
	writeJSON(w, http.StatusOK, map[string]any{"flags": flags})
}

func cloneFeatureFlags(flags map[string]bool) map[string]bool {
	out := map[string]bool{}
	for key, value := range flags {
		out[key] = value
	}
	return out
}

func (h *Handler) handleRouteFeedback(w http.ResponseWriter, r *http.Request) {
	body, err := decodeJSONBody(r, 128*1024)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON body"})
		return
	}
	input, message := normalizeRouteFeedbackInput(body)
	if message != "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": message})
		return
	}
	if h.userDataStore == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "Route feedback storage unavailable"})
		return
	}
	originRaw, err := h.findAirport(r.Context(), fmt.Sprint(input["originIcao"]))
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Airport lookup failed"})
		return
	}
	destinationRaw, err := h.findAirport(r.Context(), fmt.Sprint(input["destinationIcao"]))
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Airport lookup failed"})
		return
	}
	originAirport := mapAirport(originRaw)
	destinationAirport := mapAirport(destinationRaw)
	if originAirport == nil || destinationAirport == nil {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Unknown origin or destination ICAO"})
		return
	}
	spec := buildRouteFeedbackSpec(input, originAirport, destinationAirport)
	if spec == nil {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Could not build feedback route"})
		return
	}
	record, _ := spec["record"].(map[string]any)
	if err := h.userDataStore.writeRouteFeedback(r.Context(), record); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Could not store route feedback"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "route": spec["route"]})
}

func (h *Handler) handleContextTile(w http.ResponseWriter, r *http.Request) {
	resource := contextTileResource(r.URL.Path)
	if resource == "" || !validContextTilePath(r.URL.Path) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid context tile"})
		return
	}
	payload := map[string]any{}
	switch resource {
	case "airspace":
		payload["airspaces"] = []any{}
	case "navaids":
		payload["navaids"] = []any{}
	case "navaid-counts":
		payload["navaidCounts"] = []any{}
	case "waypoints":
		payload["waypoints"] = []any{}
	}
	writeJSONWithHeaders(w, http.StatusOK, payload, map[string]string{
		"Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
	})
}

func (h *Handler) fetchJSONMap(ctx context.Context, upstream string, headers map[string]string) (map[string]any, int, error) {
	var payload map[string]any
	status, err := h.fetchJSON(ctx, upstream, headers, &payload)
	return payload, status, err
}

func (h *Handler) fetchJSONAny(ctx context.Context, upstream string, headers map[string]string) (any, int, error) {
	var payload any
	status, err := h.fetchJSON(ctx, upstream, headers, &payload)
	return payload, status, err
}

func (h *Handler) fetchJSON(ctx context.Context, upstream string, headers map[string]string, out any) (int, error) {
	return h.fetchJSONWithTimeout(ctx, upstream, headers, out, h.timeout)
}

func (h *Handler) fetchJSONAnyWithTimeout(ctx context.Context, upstream string, headers map[string]string, timeout time.Duration) (any, int, error) {
	var payload any
	status, err := h.fetchJSONWithTimeout(ctx, upstream, headers, &payload, timeout)
	return payload, status, err
}

func (h *Handler) fetchJSONWithTimeout(ctx context.Context, upstream string, headers map[string]string, out any, timeout time.Duration) (int, error) {
	if timeout <= 0 {
		timeout = h.timeout
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, upstream, nil)
	if err != nil {
		return 0, err
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, aircraftJSONMaxBytes))
	if err != nil {
		return resp.StatusCode, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return resp.StatusCode, nil
	}
	if err := json.Unmarshal(body, out); err != nil {
		return resp.StatusCode, err
	}
	return resp.StatusCode, nil
}

func (h *Handler) fetchImage(ctx context.Context, upstream string) ([]byte, string, int, error) {
	return h.fetchImageWithHeaders(ctx, upstream, nil)
}

func (h *Handler) fetchImageWithHeaders(ctx context.Context, upstream string, headers map[string]string) ([]byte, string, int, error) {
	ctx, cancel := context.WithTimeout(ctx, h.timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, upstream, nil)
	if err != nil {
		return nil, "", 0, err
	}
	req.Header.Set("Accept", "image/avif,image/webp,image/png,image/jpeg,image/*")
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; ADSBao/1.0; +https://adsbao.dev)")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return nil, "", 0, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, aircraftImageMaxBytes+1))
	if err != nil {
		return nil, "", resp.StatusCode, err
	}
	if len(body) > aircraftImageMaxBytes {
		return nil, "", resp.StatusCode, fmt.Errorf("image exceeded byte limit")
	}
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}
	if !strings.HasPrefix(contentType, "image/") {
		return nil, contentType, resp.StatusCode, fmt.Errorf("upstream was not an image")
	}
	return body, contentType, resp.StatusCode, nil
}

func normalizeAdsbProviderPayload(payload map[string]any, provider string) {
	if payload == nil {
		return
	}
	if _, ok := payload["ac"].([]any); !ok {
		if aircraft, ok := payload["aircraft"].([]any); ok {
			payload["ac"] = aircraft
		}
	}
	nowMs := payloadNowMs(payload)
	payload["source"] = provider
	ac, _ := payload["ac"].([]any)
	for _, item := range ac {
		aircraft, ok := item.(map[string]any)
		if !ok {
			continue
		}
		annotateAdsbAircraft(aircraft, provider, nowMs)
	}
}

func annotateAdsbAircraft(aircraft map[string]any, provider string, nowMs int64) {
	age := numberValue(firstPresent(aircraft["seen_pos"], aircraft["seen"]))
	if !finite(age) {
		age = math.Inf(1)
	}
	kind := "observed"
	confidence := "high"
	if age > 90 {
		kind = "stale"
		confidence = "low"
	}
	quality := map[string]any{
		"source":                 providerSource(provider),
		"flight_position_source": "adsb",
		"kind":                   kind,
		"isEstimated":            kind != "observed",
		"isPredicted":            false,
		"isInterpolated":         false,
		"isStale":                kind == "stale",
		"sourceLabel":            provider,
		"fetchedAt":              time.UnixMilli(nowMs).UTC().Format(time.RFC3339Nano),
		"confidence":             confidence,
	}
	if finite(age) {
		quality["ageSeconds"] = int(math.Round(age))
		quality["sourceUpdatedAt"] = time.UnixMilli(nowMs - int64(age*1000)).UTC().Format(time.RFC3339Nano)
	}
	aircraft["source"] = provider
	aircraft["positionQuality"] = quality
}

func payloadNowMs(payload map[string]any) int64 {
	now := numberValue(payload["now"])
	if finite(now) {
		if now < 10_000_000_000 {
			return int64(now * 1000)
		}
		return int64(now)
	}
	return time.Now().UnixMilli()
}

func providerSource(provider string) string {
	switch strings.ToLower(provider) {
	case "adsb.lol":
		return "adsb_lol"
	case "airplanes.live":
		return "airplanes_live"
	case "adsb.fi":
		return "adsb_fi"
	default:
		return "unknown"
	}
}

func emptyAircraftTracePayload(hex string, upstreamStatus int, upstreamErr error) map[string]any {
	payload := map[string]any{
		"hex":              hex,
		"recent":           map[string]any{"timestamp": float64(time.Now().Unix()), "trace": []any{}},
		"source":           "adsb.lol",
		"traceUnavailable": true,
	}
	if upstreamStatus > 0 {
		payload["upstreamStatus"] = upstreamStatus
	}
	if upstreamErr != nil {
		payload["upstreamError"] = true
	}
	return payload
}

func emptyAircraftPhotoPayload(hex string, upstreamStatus int, upstreamErr error) map[string]any {
	payload := map[string]any{
		"hex":              hex,
		"photo":            nil,
		"source":           "planespotters.net",
		"photoUnavailable": true,
	}
	if upstreamStatus > 0 {
		payload["upstreamStatus"] = upstreamStatus
	}
	if upstreamErr != nil {
		payload["upstreamError"] = true
	}
	return payload
}

func upstreamAttemptStatus(status int, err error) string {
	if err != nil {
		return "ERR"
	}
	if status > 0 {
		return strconv.Itoa(status)
	}
	return "ERR"
}

func upstreamStatusHeader(status int, err error) string {
	if status > 0 {
		return strconv.Itoa(status)
	}
	if err != nil {
		return "ERR"
	}
	return "unknown"
}

func planespottersURL(hex string, query url.Values) string {
	values := url.Values{}
	if registration := sanitizePhotoCode(query.Get("registration"), 12); registration != "" {
		values.Set("reg", registration)
	}
	if aircraftType := sanitizePhotoCode(query.Get("type"), 8); aircraftType != "" {
		values.Set("icaoType", aircraftType)
	}
	upstream := "https://api.planespotters.net/pub/photos/hex/" + url.PathEscape(hex)
	if encoded := values.Encode(); encoded != "" {
		upstream += "?" + encoded
	}
	return upstream
}

func selectPlanespottersPhoto(hex string, r *http.Request, payload map[string]any) map[string]any {
	imageURL := planespottersImageURL(payload)
	if imageURL == "" {
		return nil
	}
	photo := firstPhoto(payload)
	image := firstPhotoImage(photo)
	proxyURL := "/api/proxy/aircraft/photos/" + url.PathEscape(hex) + "/image"
	if r.URL.RawQuery != "" {
		proxyURL += "?" + r.URL.RawQuery
	}
	return map[string]any{
		"src":          proxyURL,
		"originalSrc":  imageURL,
		"width":        nullableNumber(numberValue(valueAt(image, "size", "width"))),
		"height":       nullableNumber(numberValue(valueAt(image, "size", "height"))),
		"link":         stringValue(photo["link"]),
		"photographer": stringValue(photo["photographer"]),
		"source":       "planespotters.net",
	}
}

func planespottersImageURL(payload map[string]any) string {
	photo := firstPhoto(payload)
	image := firstPhotoImage(photo)
	return stringValue(image["src"])
}

func firstPhoto(payload map[string]any) map[string]any {
	photos, ok := payload["photos"].([]any)
	if !ok || len(photos) == 0 {
		return nil
	}
	return asRecord(photos[0])
}

func firstPhotoImage(photo map[string]any) map[string]any {
	if photo == nil {
		return nil
	}
	if image := asRecord(photo["thumbnail_large"]); image != nil && stringValue(image["src"]) != "" {
		return image
	}
	return asRecord(photo["thumbnail"])
}

func buildAdsbdbRoute(callsign string, payload map[string]any) map[string]any {
	route := asRecord(valueAt(payload, "response", "flightroute"))
	if route == nil {
		return nil
	}
	origin := normalizeAdsbdbAirport(route["origin"])
	destination := normalizeAdsbdbAirport(route["destination"])
	if origin == nil || destination == nil {
		return nil
	}
	airline := asRecord(route["airline"])
	airlineICAO := upper(firstString(airline["icao"], callsign[:minInt(3, len(callsign))]))
	airlineIATA := upper(stringValue(airline["iata"]))
	routeICAO := stringValue(origin["icao"]) + "-" + stringValue(destination["icao"])
	routeIATA := ""
	if stringValue(origin["iata"]) != "" && stringValue(destination["iata"]) != "" {
		routeIATA = stringValue(origin["iata"]) + "-" + stringValue(destination["iata"])
	}
	return map[string]any{
		"callsign":     callsign,
		"callsignIcao": fallbackString(upper(stringValue(route["callsign_icao"])), callsign),
		"callsignIata": upper(stringValue(route["callsign_iata"])),
		"number":       stringValue(route["number"]),
		"airline": map[string]any{
			"icao":     airlineICAO,
			"iata":     airlineIATA,
			"name":     stringValue(airline["name"]),
			"callsign": "",
			"iconUrl":  "",
		},
		"origin":      origin,
		"destination": destination,
		"route": map[string]any{
			"icao": routeICAO,
			"iata": routeIATA,
		},
		"airports":   []any{origin, destination},
		"source":     "adsbdb",
		"confidence": "reference-data",
	}
}

func normalizeAdsbdbAirport(value any) map[string]any {
	airport := asRecord(value)
	if airport == nil {
		return nil
	}
	icao := sanitizeAirportCode(firstString(airport["icao_code"], airport["icao"]), 3, 4)
	iata := sanitizeAirportCode(firstString(airport["iata_code"], airport["iata"]), 3, 3)
	lat := numberValue(firstPresent(airport["latitude"], airport["lat"]))
	lon := numberValue(firstPresent(airport["longitude"], airport["lon"]))
	if icao == "" || !finite(lat) || !finite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 {
		return nil
	}
	return map[string]any{
		"icao":         icao,
		"iata":         iata,
		"name":         stringValue(airport["name"]),
		"municipality": stringValue(airport["municipality"]),
		"country":      upper(firstString(airport["country_iso_name"], airport["country"])),
		"lat":          lat,
		"lon":          lon,
	}
}

func writeJSONWithHeaders(w http.ResponseWriter, status int, payload any, headers map[string]string) {
	for key, value := range headers {
		w.Header().Set(key, value)
	}
	writeJSON(w, status, payload)
}

func adsbHeaders() map[string]string {
	return map[string]string{
		"Accept":     "application/json",
		"User-Agent": "ADSBao data-service/1.0",
	}
}

func normalizeCallsign(raw string) string {
	value, _ := url.PathUnescape(raw)
	value = strings.ToUpper(strings.TrimSpace(value))
	value = strings.Join(strings.Fields(value), "")
	if len(value) < 3 || len(value) > 8 {
		return ""
	}
	if value[0] < 'A' || value[0] > 'Z' || !all(value, isUpperAlphaNum) {
		return ""
	}
	return value
}

func normalizeAircraftHex(raw string) string {
	value, _ := url.PathUnescape(raw)
	value = strings.ToUpper(strings.TrimSpace(value))
	if strings.HasPrefix(value, "~") {
		value = "~" + strings.TrimPrefix(value, "~")
	}
	check := strings.TrimPrefix(value, "~")
	if len(check) != 6 || !all(check, isHexChar) {
		return ""
	}
	return value
}

func photoHexFromPath(path string) string {
	value := strings.TrimPrefix(path, "/api/proxy/aircraft/photos/")
	value = strings.TrimSuffix(value, "/")
	return normalizeAircraftHex(value)
}

func sanitizePhotoCode(value string, maxLen int) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	if value == "" || len(value) > maxLen {
		return ""
	}
	for _, r := range value {
		if !((r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-') {
			return ""
		}
	}
	return value
}

func sanitizeAirportCode(value string, minLen, maxLen int) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	if len(value) < minLen || len(value) > maxLen || !all(value, isUpperAlphaNum) {
		return ""
	}
	return value
}

func sanitizeAcceptLanguage(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "" {
		return "en"
	}
	var b strings.Builder
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == ',' || r == '-' || r == '_' {
			b.WriteRune(r)
		}
		if b.Len() >= 60 {
			break
		}
	}
	if b.Len() == 0 {
		return "en"
	}
	return b.String()
}

func contextTileResource(path string) string {
	for _, resource := range []string{"airspace", "navaids", "navaid-counts", "waypoints"} {
		if strings.HasPrefix(path, "/api/"+resource+"/") {
			return resource
		}
	}
	return ""
}

func validContextTilePath(path string) bool {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 5 || parts[0] != "api" {
		return false
	}
	z, errZ := strconv.Atoi(parts[2])
	x, errX := strconv.Atoi(parts[3])
	y, errY := strconv.Atoi(parts[4])
	if errZ != nil || errX != nil || errY != nil || z < 3 || z > 18 {
		return false
	}
	maxCoord := (1 << z) - 1
	return x >= 0 && x <= maxCoord && y >= 0 && y <= maxCoord
}

func routeCacheHeaders(hit bool) map[string]string {
	ttl := 300
	if hit {
		ttl = 3600
	}
	return map[string]string{
		"Cache-Control": fmt.Sprintf("public, max-age=0, s-maxage=%d, stale-while-revalidate=600", ttl),
		"X-Data-Source": "adsbdb",
	}
}

func firstPresent(values ...any) any {
	for _, value := range values {
		if value != nil && stringValue(value) != "" && stringValue(value) != "<nil>" {
			return value
		}
	}
	return nil
}

func trimFloat(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64)
}

func statusOr(status, fallback int) int {
	if status > 0 {
		return status
	}
	return fallback
}

func isHexChar(r rune) bool {
	return (r >= '0' && r <= '9') || (r >= 'A' && r <= 'F')
}

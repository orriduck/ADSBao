package channels

import (
	"errors"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

const (
	maxAircraftRangeNM = 250
	defaultRangeNM     = 40
	centerGridDegrees  = 0.1
)

var (
	aircraftHexPattern = regexp.MustCompile(`^[A-F0-9]{6}$`)
	callsignPattern    = regexp.MustCompile(`^[A-Z0-9]{2,12}$`)
	routeCallPattern   = regexp.MustCompile(`^[A-Z][A-Z0-9]{2,7}$`)
	airportPattern     = regexp.MustCompile(`^[A-Z][A-Z0-9]{3}$`)
	scopedIDPattern    = regexp.MustCompile(`^[A-Za-z0-9._-]{3,80}$`)
)

type Normalized struct {
	Channel string
	Type    realtime.ChannelType
}

func NormalizeName(input any) (Normalized, error) {
	raw := strings.TrimSpace(fmt.Sprint(input))
	separator := strings.Index(raw, ":")
	if separator <= 0 {
		return Normalized{}, errors.New("Channel must be type:value")
	}
	typ := strings.ToLower(raw[:separator])
	value := raw[separator+1:]
	switch typ {
	case "aircraft":
		return normalizeAircraft(value)
	case "callsign":
		return normalizeCallsign(value)
	case "camera":
		return normalizeScoped(realtime.ChannelCamera, value)
	case "route":
		return normalizeRoute(value)
	case "session":
		return normalizeScoped(realtime.ChannelSession, value)
	case "traffic":
		return normalizeTraffic(value)
	default:
		return Normalized{}, fmt.Errorf("Unsupported channel type: %s", typ)
	}
}

func Type(channel string) (realtime.ChannelType, error) {
	normalized, err := NormalizeName(channel)
	if err != nil {
		return "", err
	}
	return normalized.Type, nil
}

func BaseInterval(typ realtime.ChannelType) int64 {
	switch typ {
	case realtime.ChannelAircraft, realtime.ChannelCallsign, realtime.ChannelTraffic:
		return 3000
	case realtime.ChannelRoute:
		return 30 * 60 * 1000
	default:
		return 15000
	}
}

func PollingTarget(channel string, params realtime.SubscribeParams) (realtime.PollingTarget, error) {
	normalized, err := NormalizeName(channel)
	if err != nil {
		return realtime.PollingTarget{}, err
	}
	switch normalized.Type {
	case realtime.ChannelTraffic:
		return parseTraffic(normalized.Channel)
	case realtime.ChannelCallsign:
		return realtime.PollingTarget{
			Kind:                "callsign",
			Callsign:            strings.TrimPrefix(normalized.Channel, "callsign:"),
			FlightAwareFallback: readBool(params["flightAware"]),
		}, nil
	case realtime.ChannelAircraft:
		return realtime.PollingTarget{
			Kind: "aircraft",
			Hex:  strings.TrimPrefix(normalized.Channel, "aircraft:"),
		}, nil
	case realtime.ChannelRoute:
		target, err := parseRoute(normalized.Channel)
		if err != nil {
			return realtime.PollingTarget{}, err
		}
		if provider := readRouteProvider(params["routeProvider"]); provider != "" {
			target.RouteProvider = provider
		}
		return target, nil
	default:
		return realtime.PollingTarget{}, fmt.Errorf("%s channel does not have an active polling target", normalized.Type)
	}
}

func SchedulerKey(channel string, target realtime.PollingTarget) string {
	if target.Kind == "callsign" && target.FlightAwareFallback {
		return channel + ":mode:flightaware"
	}
	if target.Kind == "route" && target.RouteProvider != "" {
		return channel + ":provider:" + target.RouteProvider
	}
	return channel
}

func normalizeAircraft(value string) (Normalized, error) {
	hex := strings.ToUpper(strings.TrimSpace(value))
	if !aircraftHexPattern.MatchString(hex) {
		return Normalized{}, errors.New("Invalid aircraft channel hex")
	}
	return Normalized{Channel: "aircraft:" + hex, Type: realtime.ChannelAircraft}, nil
}

func normalizeCallsign(value string) (Normalized, error) {
	callsign := normalizeCallsignValue(value)
	if !callsignPattern.MatchString(callsign) {
		return Normalized{}, errors.New("Invalid callsign channel")
	}
	return Normalized{Channel: "callsign:" + callsign, Type: realtime.ChannelCallsign}, nil
}

func normalizeTraffic(value string) (Normalized, error) {
	parts := strings.Split(value, ":")
	if len(parts) != 4 || parts[0] != "center" {
		if len(parts) > 0 && parts[0] != "center" {
			return Normalized{}, errors.New("Invalid traffic channel anchor")
		}
		return Normalized{}, errors.New("Invalid traffic center channel")
	}
	lat, ok := parseLatitude(parts[1])
	if !ok {
		return Normalized{}, errors.New("Invalid traffic center channel")
	}
	lon, ok := parseLongitude(parts[2])
	if !ok {
		return Normalized{}, errors.New("Invalid traffic center channel")
	}
	dist := clampRange(parts[3])
	return Normalized{
		Channel: fmt.Sprintf("traffic:center:%s:%s:%d", formatNumber(roundToGrid(lat)), formatNumber(roundToGrid(lon)), dist),
		Type:    realtime.ChannelTraffic,
	}, nil
}

func normalizeRoute(value string) (Normalized, error) {
	parts := strings.Split(value, ":")
	if len(parts) < 1 {
		return Normalized{}, errors.New("Invalid route channel callsign")
	}
	callsign := normalizeCallsignValue(parts[0])
	if !routeCallPattern.MatchString(callsign) {
		return Normalized{}, errors.New("Invalid route channel callsign")
	}
	if len(parts) == 1 {
		return Normalized{Channel: "route:" + callsign, Type: realtime.ChannelRoute}, nil
	}
	switch parts[1] {
	case "airport":
		if len(parts) != 3 {
			return Normalized{}, errors.New("Invalid route airport context")
		}
		icao := strings.ToUpper(strings.TrimSpace(parts[2]))
		if !airportPattern.MatchString(icao) {
			return Normalized{}, errors.New("Invalid route airport context")
		}
		return Normalized{Channel: fmt.Sprintf("route:%s:airport:%s", callsign, icao), Type: realtime.ChannelRoute}, nil
	case "center":
		if len(parts) != 4 {
			return Normalized{}, errors.New("Invalid route center context")
		}
		lat, ok := parseLatitude(parts[2])
		if !ok {
			return Normalized{}, errors.New("Invalid route center context")
		}
		lon, ok := parseLongitude(parts[3])
		if !ok {
			return Normalized{}, errors.New("Invalid route center context")
		}
		return Normalized{
			Channel: fmt.Sprintf("route:%s:center:%s:%s", callsign, formatNumber(roundToGrid(lat)), formatNumber(roundToGrid(lon))),
			Type:    realtime.ChannelRoute,
		}, nil
	default:
		return Normalized{}, errors.New("Invalid route channel context")
	}
}

func normalizeScoped(typ realtime.ChannelType, value string) (Normalized, error) {
	id := strings.TrimSpace(value)
	if !scopedIDPattern.MatchString(id) {
		return Normalized{}, fmt.Errorf("Invalid %s channel id", typ)
	}
	return Normalized{Channel: fmt.Sprintf("%s:%s", typ, id), Type: typ}, nil
}

func parseTraffic(channel string) (realtime.PollingTarget, error) {
	parts := strings.Split(channel, ":")
	if len(parts) != 5 || parts[1] != "center" {
		return realtime.PollingTarget{}, errors.New("Invalid traffic channel anchor")
	}
	lat, _ := strconv.ParseFloat(parts[2], 64)
	lon, _ := strconv.ParseFloat(parts[3], 64)
	return realtime.PollingTarget{Kind: "positions", Lat: lat, Lon: lon, DistNM: clampRange(parts[4])}, nil
}

func parseRoute(channel string) (realtime.PollingTarget, error) {
	parts := strings.Split(channel, ":")
	if len(parts) < 2 {
		return realtime.PollingTarget{}, errors.New("Invalid route channel")
	}
	target := realtime.PollingTarget{Kind: "route", Callsign: parts[1]}
	if len(parts) == 4 && parts[2] == "airport" {
		target.RouteContext = &realtime.RouteContext{Type: "airport", ICAO: parts[3]}
		return target, nil
	}
	if len(parts) == 5 && parts[2] == "center" {
		lat, _ := strconv.ParseFloat(parts[3], 64)
		lon, _ := strconv.ParseFloat(parts[4], 64)
		target.RouteContext = &realtime.RouteContext{Type: "center", Lat: lat, Lon: lon}
		return target, nil
	}
	return target, nil
}

func parseLatitude(value string) (float64, bool) {
	number, err := strconv.ParseFloat(value, 64)
	return number, err == nil && !math.IsNaN(number) && number >= -90 && number <= 90
}

func parseLongitude(value string) (float64, bool) {
	number, err := strconv.ParseFloat(value, 64)
	return number, err == nil && !math.IsNaN(number) && number >= -180 && number <= 180
}

func clampRange(value any) int {
	number, err := strconv.ParseFloat(fmt.Sprint(value), 64)
	if err != nil || math.IsNaN(number) {
		number = defaultRangeNM
	}
	rounded := int(math.Round(number))
	if rounded < 1 {
		return 1
	}
	if rounded > maxAircraftRangeNM {
		return maxAircraftRangeNM
	}
	return rounded
}

func roundToGrid(value float64) float64 {
	return math.Round(value/centerGridDegrees) * centerGridDegrees
}

func formatNumber(value float64) string {
	return strconv.FormatFloat(math.Round(value*10000)/10000, 'f', -1, 64)
}

func normalizeCallsignValue(value any) string {
	return strings.Join(strings.Fields(strings.ToUpper(strings.TrimSpace(fmt.Sprint(value)))), "")
}

func readBool(value any) bool {
	if value == true {
		return true
	}
	switch strings.ToLower(strings.TrimSpace(fmt.Sprint(value))) {
	case "1", "true", "yes":
		return true
	default:
		return false
	}
}

func readRouteProvider(value any) string {
	switch strings.ToLower(strings.TrimSpace(fmt.Sprint(value))) {
	case "flightaware":
		return "flightaware"
	case "adsbdb":
		return "adsbdb"
	default:
		return ""
	}
}

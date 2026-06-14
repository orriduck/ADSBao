package realtime

import "time"

type ChannelType string

const (
	ChannelAircraft ChannelType = "aircraft"
	ChannelCallsign ChannelType = "callsign"
	ChannelCamera   ChannelType = "camera"
	ChannelRoute    ChannelType = "route"
	ChannelSession  ChannelType = "session"
	ChannelTraffic  ChannelType = "traffic"
)

type Event struct {
	Type      string `json:"type"`
	Channel   string `json:"channel,omitempty"`
	Source    string `json:"source,omitempty"`
	FetchedAt string `json:"fetchedAt,omitempty"`
	Stale     bool   `json:"stale"`
	Data      any    `json:"data,omitempty"`
	Error     string `json:"error,omitempty"`
}

type SubscribeParams map[string]any

type PollingTarget struct {
	Kind                string
	Lat                 float64
	Lon                 float64
	DistNM              int
	Callsign            string
	Hex                 string
	FlightAwareFallback bool
	RouteProvider       string
	RouteContext        *RouteContext
}

type RouteContext struct {
	Type string
	ICAO string
	Lat  float64
	Lon  float64
}

type DebugChannel struct {
	Key                 string      `json:"key"`
	Channel             string      `json:"channel"`
	Type                ChannelType `json:"type"`
	SubscriberCount     int         `json:"subscriberCount"`
	CurrentIntervalMS   int64       `json:"currentIntervalMs"`
	LastFetchedAt       *string     `json:"lastFetchedAt"`
	LastError           *string     `json:"lastError"`
	Source              *string     `json:"source"`
	Stale               bool        `json:"stale"`
	ConsecutiveFailures int         `json:"consecutiveFailures"`
}

type FetchInput struct {
	Channel     string
	ChannelType ChannelType
	Target      PollingTarget
	Params      SubscribeParams
	Metrics     MetricsSink
}

type FetchFunc func(input FetchInput) (Event, error)

type MetricsSink interface {
	RecordExternalRequest(input ExternalRequestMetricInput)
}

type ExternalRequestMetricInput struct {
	Provider   string
	Endpoint   string
	Result     string
	Status     any
	DurationMS int64
}

type Clock interface {
	Now() time.Time
}

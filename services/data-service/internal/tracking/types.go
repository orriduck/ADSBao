// Package tracking owns durable aircraft tracking runs. It deliberately sits
// outside the scheduler: scheduler multiplexes polling, while this package
// decides whether a persisted run should remain one of its consumers.
package tracking

import (
	"context"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

type Status string

const (
	StatusActive     Status = "active"
	StatusLostSignal Status = "lost_signal"
	StatusTerminal   Status = "terminal"
	StatusStopped    Status = "stopped"
	StatusExpired    Status = "expired"
)

func (s Status) Active() bool { return s == StatusActive || s == StatusLostSignal }

type Run struct {
	ID                   string     `json:"id"`
	Callsign             string     `json:"callsign"`
	AircraftHex          string     `json:"aircraftHex,omitempty"`
	Status               Status     `json:"status"`
	OwnerID              string     `json:"-"`
	StartedAt            time.Time  `json:"startedAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
	ExpiresAt            time.Time  `json:"expiresAt"`
	EndedAt              *time.Time `json:"endedAt,omitempty"`
	LastPositionAt       *time.Time `json:"lastPositionAt,omitempty"`
	FlightAwareCheckedAt *time.Time `json:"flightAwareCheckedAt,omitempty"`
	TerminalAt           *time.Time `json:"terminalAt,omitempty"`
	TerminalSource       string     `json:"terminalSource,omitempty"`
	StopReason           string     `json:"stopReason,omitempty"`
}

type Observation struct {
	ID         string         `json:"id"`
	RunID      string         `json:"runId"`
	Aircraft   map[string]any `json:"aircraft"`
	Source     string         `json:"source"`
	UpstreamAt *time.Time     `json:"upstreamAt,omitempty"`
	ReceivedAt time.Time      `json:"receivedAt"`
}

type Watcher interface {
	Watch(channel string, params realtime.SubscribeParams, send func(realtime.Event)) (func(), error)
}

type TerminalChecker interface {
	CheckTerminal(ctx context.Context, callsign string) (bool, time.Time, string)
}

type Store interface {
	CreateOrResume(ctx context.Context, callsign, ownerID string, expiresAt time.Time) (Run, error)
	FindActiveByCallsign(ctx context.Context, callsign string) (Run, bool, error)
	Get(ctx context.Context, id string) (Run, []Observation, error)
	ListRestorable(ctx context.Context, now time.Time) ([]Run, error)
	RecordObservation(ctx context.Context, runID string, aircraft map[string]any, source string, upstreamAt, receivedAt time.Time) error
	MarkLostSignal(ctx context.Context, runID string, checkedAt time.Time) error
	MarkActive(ctx context.Context, runID string) error
	MarkTerminal(ctx context.Context, runID, source string, terminalAt time.Time) error
	Expire(ctx context.Context, runID string, at time.Time) error
	Stop(ctx context.Context, runID, ownerID string, at time.Time) (Run, error)
}

type DebugRun struct {
	ID             string `json:"id"`
	Callsign       string `json:"callsign"`
	Status         Status `json:"status"`
	Watching       bool   `json:"watching"`
	Misses         int    `json:"misses"`
	TerminalCheck  bool   `json:"terminalCheckInFlight"`
	LastPositionAt string `json:"lastPositionAt,omitempty"`
}

package tracking

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

type Options struct {
	Store                  Store
	Watcher                Watcher
	TerminalChecker        TerminalChecker
	MaxDuration            time.Duration
	MissingSignalThreshold int
	TerminalCheckInterval  time.Duration
}

type Manager struct {
	store            Store
	watcher          Watcher
	terminalChecker  TerminalChecker
	maxDuration      time.Duration
	missingThreshold int
	checkInterval    time.Duration

	mu     sync.Mutex
	active map[string]*activeRun
	events chan queuedEvent
	stop   chan struct{}
}

type activeRun struct {
	run      Run
	release  func()
	misses   int
	checking bool
}

type queuedEvent struct {
	runID string
	event realtime.Event
}

func NewManager(options Options) *Manager {
	if options.Store == nil || options.Watcher == nil {
		return nil
	}
	maxDuration := options.MaxDuration
	if maxDuration <= 0 {
		maxDuration = 8 * time.Hour
	}
	threshold := options.MissingSignalThreshold
	if threshold <= 0 {
		threshold = 20
	}
	interval := options.TerminalCheckInterval
	if interval <= 0 {
		interval = 5 * time.Minute
	}
	return &Manager{store: options.Store, watcher: options.Watcher, terminalChecker: options.TerminalChecker, maxDuration: maxDuration, missingThreshold: threshold, checkInterval: interval, active: map[string]*activeRun{}, events: make(chan queuedEvent, 512), stop: make(chan struct{})}
}

func (m *Manager) Enabled() bool { return m != nil }

func (m *Manager) Start(ctx context.Context) error {
	if m == nil {
		return nil
	}
	runs, err := m.store.ListRestorable(ctx, time.Now().UTC())
	if err != nil {
		return err
	}
	for _, run := range runs {
		if err := m.activate(run); err != nil {
			return err
		}
	}
	go m.consume()
	return nil
}

func (m *Manager) Close() {
	if m == nil {
		return
	}
	select {
	case <-m.stop:
		return
	default:
		close(m.stop)
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, active := range m.active {
		active.release()
	}
	m.active = map[string]*activeRun{}
}

func (m *Manager) Ensure(ctx context.Context, callsign, ownerID string) (Run, error) {
	if m == nil {
		return Run{}, fmt.Errorf("tracking unavailable")
	}
	run, err := m.store.CreateOrResume(ctx, callsign, ownerID, time.Now().UTC().Add(m.maxDuration))
	if err != nil {
		return Run{}, err
	}
	if err := m.activate(run); err != nil {
		return Run{}, err
	}
	return run, nil
}

func (m *Manager) FindActive(ctx context.Context, callsign string) (Run, bool, error) {
	if m == nil {
		return Run{}, false, fmt.Errorf("tracking unavailable")
	}
	return m.store.FindActiveByCallsign(ctx, callsign)
}

func (m *Manager) Get(ctx context.Context, id string) (Run, []Observation, error) {
	if m == nil {
		return Run{}, nil, fmt.Errorf("tracking unavailable")
	}
	return m.store.Get(ctx, id)
}

func (m *Manager) Stop(ctx context.Context, id, ownerID string) (Run, error) {
	if m == nil {
		return Run{}, fmt.Errorf("tracking unavailable")
	}
	run, err := m.store.Stop(ctx, id, ownerID, time.Now().UTC())
	if err != nil {
		return Run{}, err
	}
	m.deactivate(id)
	return run, nil
}

func (m *Manager) DebugRuns() []DebugRun {
	if m == nil {
		return nil
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]DebugRun, 0, len(m.active))
	for _, active := range m.active {
		item := DebugRun{ID: active.run.ID, Callsign: active.run.Callsign, Status: active.run.Status, Watching: active.release != nil, Misses: active.misses, TerminalCheck: active.checking}
		if active.run.LastPositionAt != nil {
			item.LastPositionAt = active.run.LastPositionAt.UTC().Format(time.RFC3339Nano)
		}
		out = append(out, item)
	}
	return out
}

func (m *Manager) activate(run Run) error {
	m.mu.Lock()
	if _, exists := m.active[run.ID]; exists {
		m.mu.Unlock()
		return nil
	}
	m.mu.Unlock()
	release, err := m.watcher.Watch("callsign:"+run.Callsign, realtime.SubscribeParams{}, func(event realtime.Event) {
		select {
		case m.events <- queuedEvent{runID: run.ID, event: event}:
		default:
		}
	})
	if err != nil {
		return err
	}
	m.mu.Lock()
	if _, exists := m.active[run.ID]; exists {
		m.mu.Unlock()
		release()
		return nil
	}
	m.active[run.ID] = &activeRun{run: run, release: release}
	m.mu.Unlock()
	return nil
}

func (m *Manager) deactivate(id string) {
	m.mu.Lock()
	active := m.active[id]
	delete(m.active, id)
	m.mu.Unlock()
	if active != nil && active.release != nil {
		active.release()
	}
}

func (m *Manager) consume() {
	for {
		select {
		case <-m.stop:
			return
		case queued := <-m.events:
			m.handleEvent(queued)
		}
	}
}

func (m *Manager) handleEvent(queued queuedEvent) {
	m.mu.Lock()
	active := m.active[queued.runID]
	if active == nil {
		m.mu.Unlock()
		return
	}
	run := active.run
	m.mu.Unlock()
	if !run.ExpiresAt.After(time.Now().UTC()) {
		if m.store.Expire(context.Background(), run.ID, time.Now().UTC()) == nil {
			m.deactivate(run.ID)
		}
		return
	}
	aircraft, ok := validAircraft(queued.event.Data)
	if ok {
		receivedAt := time.Now().UTC()
		upstreamAt, _ := time.Parse(time.RFC3339Nano, queued.event.FetchedAt)
		if err := m.store.RecordObservation(context.Background(), run.ID, aircraft, queued.event.Source, upstreamAt, receivedAt); err == nil {
			m.mu.Lock()
			if current := m.active[run.ID]; current != nil {
				current.misses = 0
				current.run.Status = StatusActive
				current.run.LastPositionAt = &receivedAt
			}
			m.mu.Unlock()
			_ = m.store.MarkActive(context.Background(), run.ID)
		}
		return
	}

	m.mu.Lock()
	current := m.active[run.ID]
	if current == nil {
		m.mu.Unlock()
		return
	}
	current.misses++
	if current.misses < m.missingThreshold || current.checking {
		m.mu.Unlock()
		return
	}
	if current.run.FlightAwareCheckedAt != nil && time.Since(*current.run.FlightAwareCheckedAt) < m.checkInterval {
		m.mu.Unlock()
		return
	}
	current.checking = true
	checkedAt := time.Now().UTC()
	current.run.Status = StatusLostSignal
	current.run.FlightAwareCheckedAt = &checkedAt
	m.mu.Unlock()
	_ = m.store.MarkLostSignal(context.Background(), run.ID, checkedAt)
	go m.confirmTerminal(run.ID, run.Callsign)
}

func (m *Manager) confirmTerminal(runID, callsign string) {
	terminal, terminalAt, source := false, time.Time{}, ""
	if m.terminalChecker != nil {
		terminal, terminalAt, source = m.terminalChecker.CheckTerminal(context.Background(), callsign)
	}
	if terminal {
		if terminalAt.IsZero() {
			terminalAt = time.Now().UTC()
		}
		if source == "" {
			source = "flightaware"
		}
		if m.store.MarkTerminal(context.Background(), runID, source, terminalAt) == nil {
			m.deactivate(runID)
			return
		}
	}
	m.mu.Lock()
	if current := m.active[runID]; current != nil {
		current.checking = false
		current.run.Status = StatusLostSignal
	}
	m.mu.Unlock()
}

func validAircraft(value any) (map[string]any, bool) {
	payload, _ := value.(map[string]any)
	entries, _ := payload["ac"].([]any)
	for _, entry := range entries {
		aircraft, _ := entry.(map[string]any)
		if aircraft == nil {
			continue
		}
		if finite(aircraft["lat"]) && finite(aircraft["lon"]) {
			return aircraft, true
		}
	}
	return nil, false
}

func finite(value any) bool {
	switch typed := value.(type) {
	case float64:
		return typed >= -180 && typed <= 180
	case float32:
		return typed >= -180 && typed <= 180
	case int:
		return true
	default:
		return false
	}
}

package tracking

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

func TestManagerPersistsObservationAndConfirmsTerminalAfterSignalLoss(t *testing.T) {
	store := &memoryStore{}
	watcher := &memoryWatcher{}
	manager := NewManager(Options{
		Store:                  store,
		Watcher:                watcher,
		TerminalChecker:        terminalCheckerFunc(func(context.Context, string) (bool, time.Time, string) { return true, time.Now().UTC(), "flightaware" }),
		MissingSignalThreshold: 2,
		TerminalCheckInterval:  time.Millisecond,
	})
	if err := manager.Start(context.Background()); err != nil {
		t.Fatal(err)
	}
	defer manager.Close()

	run, err := manager.Ensure(context.Background(), "UAL123", "user_1")
	if err != nil {
		t.Fatal(err)
	}
	watcher.send(run.ID, realtime.Event{Data: map[string]any{"ac": []any{map[string]any{"lat": 42.0, "lon": -71.0, "icao24": "A1B2C3"}}}, Source: "adsb"})
	eventually(t, func() bool { return store.observationCount(run.ID) == 1 })

	watcher.send(run.ID, realtime.Event{Data: map[string]any{"ac": []any{}}, Source: "adsb"})
	watcher.send(run.ID, realtime.Event{Data: map[string]any{"ac": []any{}}, Source: "adsb"})
	eventually(t, func() bool { return store.status(run.ID) == StatusTerminal })
	if watcher.releaseCount(run.ID) != 1 {
		t.Fatalf("release count = %d, want 1", watcher.releaseCount(run.ID))
	}
}

func TestManagerExpiresRunBeforeWritingAnotherObservation(t *testing.T) {
	store := &memoryStore{}
	watcher := &memoryWatcher{}
	manager := NewManager(Options{Store: store, Watcher: watcher})
	if err := manager.Start(context.Background()); err != nil {
		t.Fatal(err)
	}
	defer manager.Close()
	run := Run{ID: "expired", Callsign: "DAL456", Status: StatusActive, StartedAt: time.Now().Add(-9 * time.Hour), ExpiresAt: time.Now().Add(-time.Second)}
	store.mu.Lock()
	store.runs = map[string]Run{run.ID: run}
	store.observations = map[string][]Observation{}
	store.mu.Unlock()
	if err := manager.activate(run); err != nil {
		t.Fatal(err)
	}
	watcher.send(run.ID, realtime.Event{Data: map[string]any{"ac": []any{map[string]any{"lat": 42.0, "lon": -71.0}}}})
	eventually(t, func() bool { return store.status(run.ID) == StatusExpired })
	if store.observationCount(run.ID) != 0 {
		t.Fatalf("expired run wrote an observation")
	}
}

func eventually(t *testing.T, condition func() bool) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if condition() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("condition was not satisfied")
}

type terminalCheckerFunc func(context.Context, string) (bool, time.Time, string)

func (f terminalCheckerFunc) CheckTerminal(ctx context.Context, callsign string) (bool, time.Time, string) {
	return f(ctx, callsign)
}

type memoryStore struct {
	mu           sync.Mutex
	runs         map[string]Run
	observations map[string][]Observation
	nextID       int
}

func (s *memoryStore) CreateOrResume(_ context.Context, callsign, ownerID string, expiresAt time.Time) (Run, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.runs == nil {
		s.runs = map[string]Run{}
	}
	if s.observations == nil {
		s.observations = map[string][]Observation{}
	}
	for _, run := range s.runs {
		if run.Callsign == callsign && run.Status.Active() {
			return run, nil
		}
	}
	s.nextID++
	run := Run{ID: fmt.Sprintf("run-%d", s.nextID), Callsign: callsign, OwnerID: ownerID, Status: StatusActive, StartedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(), ExpiresAt: expiresAt}
	s.runs[run.ID] = run
	return run, nil
}
func (s *memoryStore) FindActiveByCallsign(_ context.Context, callsign string) (Run, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, run := range s.runs {
		if run.Callsign == callsign && run.Status.Active() {
			return run, true, nil
		}
	}
	return Run{}, false, nil
}
func (s *memoryStore) Get(_ context.Context, id string) (Run, []Observation, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.runs[id], append([]Observation(nil), s.observations[id]...), nil
}
func (s *memoryStore) ListRestorable(context.Context, time.Time) ([]Run, error) { return nil, nil }
func (s *memoryStore) RecordObservation(_ context.Context, id string, aircraft map[string]any, source string, _ time.Time, receivedAt time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.observations[id] = append(s.observations[id], Observation{RunID: id, Aircraft: aircraft, Source: source, ReceivedAt: receivedAt})
	return nil
}
func (s *memoryStore) MarkLostSignal(_ context.Context, id string, at time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	run := s.runs[id]
	run.Status = StatusLostSignal
	run.FlightAwareCheckedAt = &at
	s.runs[id] = run
	return nil
}
func (s *memoryStore) MarkActive(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	run := s.runs[id]
	run.Status = StatusActive
	s.runs[id] = run
	return nil
}
func (s *memoryStore) MarkTerminal(_ context.Context, id, source string, at time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	run := s.runs[id]
	run.Status = StatusTerminal
	run.TerminalAt = &at
	run.TerminalSource = source
	s.runs[id] = run
	return nil
}
func (s *memoryStore) Expire(_ context.Context, id string, at time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	run := s.runs[id]
	run.Status = StatusExpired
	run.EndedAt = &at
	s.runs[id] = run
	return nil
}
func (s *memoryStore) Stop(_ context.Context, id, _ string, at time.Time) (Run, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	run := s.runs[id]
	run.Status = StatusStopped
	run.EndedAt = &at
	s.runs[id] = run
	return run, nil
}
func (s *memoryStore) observationCount(id string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.observations[id])
}
func (s *memoryStore) status(id string) Status {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.runs[id].Status
}

type memoryWatcher struct {
	mu        sync.Mutex
	callbacks map[string]func(realtime.Event)
	releases  map[string]int
}

func (w *memoryWatcher) Watch(channel string, _ realtime.SubscribeParams, send func(realtime.Event)) (func(), error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.callbacks == nil {
		w.callbacks = map[string]func(realtime.Event){}
		w.releases = map[string]int{}
	}
	w.callbacks[channel] = send
	return func() {
		w.mu.Lock()
		defer w.mu.Unlock()
		w.releases[channel]++
	}, nil
}

func (w *memoryWatcher) send(_ string, event realtime.Event) {
	w.mu.Lock()
	callbacks := make([]func(realtime.Event), 0, len(w.callbacks))
	for _, callback := range w.callbacks {
		callbacks = append(callbacks, callback)
	}
	w.mu.Unlock()
	for _, callback := range callbacks {
		callback(event)
	}
}

func (w *memoryWatcher) releaseCount(_ string) int {
	w.mu.Lock()
	defer w.mu.Unlock()
	total := 0
	for _, count := range w.releases {
		total += count
	}
	return total
}

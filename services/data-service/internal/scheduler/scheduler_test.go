package scheduler

import (
	"sync/atomic"
	"testing"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

func TestSchedulerSharesLoopAndStopsAfterLastUnsubscribe(t *testing.T) {
	var calls atomic.Int64
	s := New(Options{
		MinInterval:       25 * time.Millisecond,
		MaxActiveChannels: 10,
		JitterRatio:       0,
		Fetch: func(input realtime.FetchInput) (realtime.Event, error) {
			calls.Add(1)
			return realtime.Event{
				Type:      "aircraft:update",
				Channel:   input.Channel,
				Source:    "test-provider",
				FetchedAt: time.Unix(0, 0).UTC().Format(time.RFC3339),
				Data:      map[string]any{"ac": []any{}},
			}, nil
		},
	})
	defer s.Dispose()

	first := make(chan realtime.Event, 4)
	second := make(chan realtime.Event, 4)
	unsubFirst, err := s.Subscribe("traffic:center:42.3656:-71.0096:40", nil, func(event realtime.Event) {
		first <- event
	})
	if err != nil {
		t.Fatalf("first subscribe returned error: %v", err)
	}
	unsubSecond, err := s.Subscribe("traffic:center:42.3656:-71.0096:40", nil, func(event realtime.Event) {
		second <- event
	})
	if err != nil {
		t.Fatalf("second subscribe returned error: %v", err)
	}

	waitEvent(t, first)
	waitEvent(t, second)
	if len(s.DebugChannels()) != 1 {
		t.Fatalf("debug channel count = %d", len(s.DebugChannels()))
	}

	unsubFirst()
	unsubSecond()
	after := calls.Load()
	time.Sleep(80 * time.Millisecond)
	if calls.Load() != after {
		t.Fatalf("polling continued after last unsubscribe: before=%d after=%d", after, calls.Load())
	}
	if len(s.DebugChannels()) != 0 {
		t.Fatalf("debug channels after unsubscribe = %#v", s.DebugChannels())
	}
}

func waitEvent(t *testing.T, ch <-chan realtime.Event) realtime.Event {
	t.Helper()
	select {
	case event := <-ch:
		return event
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for event")
		return realtime.Event{}
	}
}

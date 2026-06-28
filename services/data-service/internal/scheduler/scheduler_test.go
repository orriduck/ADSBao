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

func newGraceScheduler(grace time.Duration, calls *atomic.Int64) *Scheduler {
	return New(Options{
		MinInterval:       25 * time.Millisecond,
		MaxActiveChannels: 10,
		JitterRatio:       0,
		IdleGracePeriod:   grace,
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
}

// idle grace 期间:最后一个订阅者离开后,轮询循环不立即拆除(频道仍在活动表中),
// 直到 grace 到期才真正停止。轮询节拍由 BaseInterval(秒级)决定,因此这里用
// DebugChannels 的存在与否来判定循环是否被拆除——正是验收关注的语义。
func TestSchedulerKeepsLoopDuringGrace(t *testing.T) {
	var calls atomic.Int64
	s := newGraceScheduler(200*time.Millisecond, &calls)
	defer s.Dispose()

	events := make(chan realtime.Event, 4)
	unsub, err := s.Subscribe("traffic:center:42.3656:-71.0096:40", nil, func(event realtime.Event) {
		events <- event
	})
	if err != nil {
		t.Fatalf("subscribe returned error: %v", err)
	}
	waitEvent(t, events)

	unsub()
	// grace 窗口内:频道仍在活动表中(轮询 goroutine 未被 cancel)。
	time.Sleep(80 * time.Millisecond)
	if len(s.DebugChannels()) != 1 {
		t.Fatalf("channel torn down within grace: %#v", s.DebugChannels())
	}

	// grace 到期后:频道被移除,既有「最后退订即停」保证依然成立。
	time.Sleep(250 * time.Millisecond)
	if len(s.DebugChannels()) != 0 {
		t.Fatalf("channel still active after grace expired: %#v", s.DebugChannels())
	}
}

// grace 窗口内重新订阅:取消待停定时器,频道存活,即使越过原 grace 截止点。
func TestSchedulerCancelsGraceOnResubscribe(t *testing.T) {
	var calls atomic.Int64
	s := newGraceScheduler(150*time.Millisecond, &calls)
	defer s.Dispose()

	events := make(chan realtime.Event, 4)
	unsubFirst, err := s.Subscribe("traffic:center:42.3656:-71.0096:40", nil, func(event realtime.Event) {
		events <- event
	})
	if err != nil {
		t.Fatalf("first subscribe returned error: %v", err)
	}
	waitEvent(t, events)

	unsubFirst()
	// 在 grace 窗口内(<150ms)重新订阅同一频道。
	time.Sleep(50 * time.Millisecond)
	unsubSecond, err := s.Subscribe("traffic:center:42.3656:-71.0096:40", nil, func(event realtime.Event) {
		events <- event
	})
	if err != nil {
		t.Fatalf("resubscribe returned error: %v", err)
	}

	// 越过原 grace 截止点后,频道仍应存活(grace 已被取消,循环从未中断)。
	time.Sleep(200 * time.Millisecond)
	if len(s.DebugChannels()) != 1 {
		t.Fatalf("channel stopped despite resubscribe within grace: %#v", s.DebugChannels())
	}
	unsubSecond()
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

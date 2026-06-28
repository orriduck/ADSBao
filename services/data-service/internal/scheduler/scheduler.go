package scheduler

import (
	"context"
	"fmt"
	"math"
	"math/rand/v2"
	"sort"
	"sync"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/channels"
	"github.com/adsbao/adsbao/services/data-service/internal/metrics"
	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

type Options struct {
	Fetch             realtime.FetchFunc
	MinInterval       time.Duration
	MaxInterval       time.Duration
	IdleGracePeriod   time.Duration
	MaxActiveChannels int
	JitterRatio       float64
	CacheTTL          time.Duration
	Metrics           *metrics.Metrics
}

type Scheduler struct {
	fetch             realtime.FetchFunc
	minInterval       time.Duration
	maxInterval       time.Duration
	idleGracePeriod   time.Duration
	maxActiveChannels int
	jitterRatio       float64
	cacheTTL          time.Duration
	metrics           *metrics.Metrics

	mu           sync.Mutex
	channels     map[string]*channelState
	cache        map[string]cacheEntry
	subscriberID int64
}

type channelState struct {
	key                 string
	channel             string
	channelType         realtime.ChannelType
	target              realtime.PollingTarget
	params              realtime.SubscribeParams
	baseInterval        time.Duration
	currentInterval     time.Duration
	consecutiveFailures int
	lastFetchedAt       *string
	lastError           *string
	lastEvent           *realtime.Event
	source              *string
	stale               bool
	subscribers         map[int64]func(realtime.Event)
	ctx                 context.Context
	cancel              context.CancelFunc
	// idle grace 待停定时器:最后一个订阅者离开后启动,到期才真正停轮询;
	// 窗口内有新订阅者命中本 state 时会被 Stop。
	graceTimer *time.Timer
}

type cacheEntry struct {
	event     realtime.Event
	expiresAt time.Time
}

func New(options Options) *Scheduler {
	minInterval := options.MinInterval
	if minInterval <= 0 {
		minInterval = time.Second
	}
	maxInterval := options.MaxInterval
	if maxInterval <= 0 {
		maxInterval = 30 * time.Minute
	}
	maxActive := options.MaxActiveChannels
	if maxActive <= 0 {
		maxActive = 250
	}
	cacheTTL := options.CacheTTL
	if cacheTTL <= 0 {
		cacheTTL = 15 * time.Second
	}
	return &Scheduler{
		fetch:             options.Fetch,
		minInterval:       minInterval,
		maxInterval:       maxInterval,
		// 默认 0 = 保持「最后退订即停」的既有语义;>0 才启用 idle grace。
		idleGracePeriod:   options.IdleGracePeriod,
		maxActiveChannels: maxActive,
		jitterRatio:       options.JitterRatio,
		cacheTTL:          cacheTTL,
		metrics:           options.Metrics,
		channels:          map[string]*channelState{},
		cache:             map[string]cacheEntry{},
	}
}

func (s *Scheduler) Subscribe(channel string, params realtime.SubscribeParams, send func(realtime.Event)) (func(), error) {
	if params == nil {
		params = realtime.SubscribeParams{}
	}
	normalized, err := channels.NormalizeName(channel)
	if err != nil {
		return nil, err
	}
	target, err := channels.PollingTarget(normalized.Channel, params)
	if err != nil {
		return nil, err
	}
	key := channels.SchedulerKey(normalized.Channel, target)

	s.mu.Lock()
	state := s.channels[key]
	if state == nil {
		if len(s.channels) >= s.maxActiveChannels {
			s.mu.Unlock()
			return nil, fmt.Errorf("Active channel limit reached")
		}
		ctx, cancel := context.WithCancel(context.Background())
		base := time.Duration(channels.BaseInterval(normalized.Type)) * time.Millisecond
		if base < s.minInterval {
			base = s.minInterval
		}
		state = &channelState{
			key:             key,
			channel:         normalized.Channel,
			channelType:     normalized.Type,
			target:          target,
			params:          params,
			baseInterval:    base,
			currentInterval: base,
			subscribers:     map[int64]func(realtime.Event){},
			ctx:             ctx,
			cancel:          cancel,
		}
		s.channels[key] = state
		go s.run(state)
	} else if state.graceTimer != nil {
		// 命中处于 idle grace 窗口的频道:取消待停定时器,轮询循环原地续用,
		// 不重建 goroutine、不触发重取(消除订阅抖动的后端兜底)。
		state.graceTimer.Stop()
		state.graceTimer = nil
	}
	s.subscriberID++
	id := s.subscriberID
	state.subscribers[id] = send
	if cached, ok := s.cachedLocked(key, state); ok {
		go send(cached)
	}
	s.mu.Unlock()

	return func() {
		s.unsubscribe(key, id)
	}, nil
}

func (s *Scheduler) DebugChannels() []realtime.DebugChannel {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]realtime.DebugChannel, 0, len(s.channels))
	for _, state := range s.channels {
		out = append(out, realtime.DebugChannel{
			Key:                 state.key,
			Channel:             state.channel,
			Type:                state.channelType,
			SubscriberCount:     len(state.subscribers),
			CurrentIntervalMS:   state.currentInterval.Milliseconds(),
			LastFetchedAt:       cloneStringPtr(state.lastFetchedAt),
			LastError:           cloneStringPtr(state.lastError),
			Source:              cloneStringPtr(state.source),
			Stale:               state.stale,
			ConsecutiveFailures: state.consecutiveFailures,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Channel < out[j].Channel })
	return out
}

func (s *Scheduler) Dispose() {
	s.mu.Lock()
	states := make([]*channelState, 0, len(s.channels))
	for _, state := range s.channels {
		states = append(states, state)
	}
	s.channels = map[string]*channelState{}
	s.cache = map[string]cacheEntry{}
	s.mu.Unlock()
	for _, state := range states {
		if state.graceTimer != nil {
			state.graceTimer.Stop()
		}
		state.cancel()
	}
}

func (s *Scheduler) unsubscribe(key string, id int64) {
	s.mu.Lock()
	state := s.channels[key]
	if state == nil {
		s.mu.Unlock()
		return
	}
	delete(state.subscribers, id)
	if len(state.subscribers) == 0 {
		if s.idleGracePeriod <= 0 {
			s.stopChannelLocked(state)
		} else {
			s.scheduleGraceStopLocked(state)
		}
	}
	s.mu.Unlock()
}

// 立即停止频道:从活动表移除并取消轮询 goroutine。须在持有 s.mu 时调用。
func (s *Scheduler) stopChannelLocked(state *channelState) {
	if state.graceTimer != nil {
		state.graceTimer.Stop()
		state.graceTimer = nil
	}
	delete(s.channels, state.key)
	state.cancel()
}

// idle grace:最后一个订阅者离开后,等 idleGracePeriod 再停。窗口内若有新订阅者
// 到达(Subscribe 命中同一 state 并 Stop 本定时器),轮询循环全程不中断。
// 到期回调里复检:仍是同一 state 且确无订阅者,才真正停止——从而保证 grace 过后
// 「最后退订即停」的既有保证依然成立。
func (s *Scheduler) scheduleGraceStopLocked(state *channelState) {
	if state.graceTimer != nil {
		state.graceTimer.Stop()
	}
	state.graceTimer = time.AfterFunc(s.idleGracePeriod, func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.channels[state.key] != state {
			return
		}
		state.graceTimer = nil
		if len(state.subscribers) == 0 {
			delete(s.channels, state.key)
			state.cancel()
		}
	})
}

func (s *Scheduler) run(state *channelState) {
	delay := time.Duration(0)
	for {
		if delay > 0 {
			timer := time.NewTimer(delay)
			select {
			case <-state.ctx.Done():
				timer.Stop()
				return
			case <-timer.C:
			}
		}
		s.poll(state)
		s.mu.Lock()
		// 只看频道是否还在活动表里:idle grace 期间订阅者已归零但 state 仍在表中,
		// 循环继续轮询以便窗口内的新订阅者能立刻拿到新鲜数据;grace 到期会把 state
		// 从表中删除并 cancel,届时这里 active=false 退出(或 delay 等待时被 ctx 唤醒)。
		_, active := s.channels[state.key]
		if !active {
			s.mu.Unlock()
			return
		}
		delay = s.nextDelayLocked(state)
		s.mu.Unlock()
	}
}

func (s *Scheduler) poll(state *channelState) {
	if s.fetch == nil {
		return
	}
	started := time.Now()
	event, err := s.fetch(realtime.FetchInput{
		Channel:     state.channel,
		ChannelType: state.channelType,
		Target:      state.target,
		Params:      state.params,
		Metrics:     s.metrics,
	})
	durationMS := time.Since(started).Milliseconds()

	s.mu.Lock()
	if _, active := s.channels[state.key]; !active {
		s.mu.Unlock()
		return
	}
	if err != nil {
		message := err.Error()
		state.consecutiveFailures++
		state.lastError = &message
		state.stale = true
		source := "failed"
		if state.source != nil && *state.source != "" {
			source = *state.source
		}
		event = realtime.Event{
			Type:      "channel:error",
			Channel:   state.channel,
			Source:    source,
			FetchedAt: time.Now().UTC().Format(time.RFC3339Nano),
			Stale:     true,
			Data:      nil,
			Error:     message,
		}
		if state.lastEvent != nil {
			event.Data = state.lastEvent.Data
		}
		if s.metrics != nil {
			s.metrics.RecordPoll(state.channelType, source, "error", durationMS)
		}
	} else {
		state.consecutiveFailures = 0
		state.lastFetchedAt = &event.FetchedAt
		state.lastError = nil
		copied := event
		state.lastEvent = &copied
		source := event.Source
		state.source = &source
		state.stale = event.Stale
		s.cache[state.key] = cacheEntry{event: event, expiresAt: time.Now().Add(s.cacheTTL)}
		if s.metrics != nil {
			s.metrics.RecordPoll(state.channelType, firstNonEmpty(event.Source, "unknown"), "success", durationMS)
		}
	}
	subscribers := make([]func(realtime.Event), 0, len(state.subscribers))
	for _, subscriber := range state.subscribers {
		subscribers = append(subscribers, subscriber)
	}
	s.mu.Unlock()

	for _, subscriber := range subscribers {
		subscriber(event)
	}
}

func (s *Scheduler) nextDelayLocked(state *channelState) time.Duration {
	multiplier := math.Min(16, math.Pow(2, float64(state.consecutiveFailures)))
	base := time.Duration(float64(state.baseInterval) * multiplier)
	if base < s.minInterval {
		base = s.minInterval
	}
	if base > s.maxInterval {
		base = s.maxInterval
	}
	delay := base
	if s.jitterRatio > 0 {
		jitter := float64(base) * s.jitterRatio * (rand.Float64()*2 - 1)
		delay = time.Duration(math.Round(float64(base) + jitter))
		if delay < s.minInterval {
			delay = s.minInterval
		}
	}
	state.currentInterval = delay
	return delay
}

func (s *Scheduler) cachedLocked(key string, state *channelState) (realtime.Event, bool) {
	if entry, ok := s.cache[key]; ok {
		if time.Now().Before(entry.expiresAt) {
			return entry.event, true
		}
		delete(s.cache, key)
	}
	if state.lastEvent != nil {
		return *state.lastEvent, true
	}
	return realtime.Event{}, false
}

func cloneStringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	copy := *value
	return &copy
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

// Package proxycache is a best-effort, short-lived Postgres cache for upstream
// aircraft-trace and flight-route lookups. It is deliberately forgiving: a nil
// store (no DATABASE_URL), a missing table, or any query error simply behaves
// as a cache miss so callers fall back to a direct upstream fetch.
//
// Freshness is owned here via a single TTL so the trace handler and the route
// client agree on what "fresh" means. Reads return the row's age (computed by
// Postgres to avoid app/db clock skew); the caller compares it against TTL().
package proxycache

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

const defaultTTL = 5 * time.Minute

type metricsSink interface {
	RecordDBTransaction(operation, result string, durationMS int64)
}

// Store wraps the shared *sql.DB. All methods are nil-receiver safe.
type Store struct {
	db      *sql.DB
	ttl     time.Duration
	metrics metricsSink
}

// New returns nil when db is nil so callers can treat "no database" as "no
// cache" without special-casing every call site.
func New(db *sql.DB, ttl time.Duration, metrics metricsSink) *Store {
	if db == nil {
		return nil
	}
	if ttl <= 0 {
		ttl = defaultTTL
	}
	return &Store{db: db, ttl: ttl, metrics: metrics}
}

// TTL is the freshness window. Rows older than this are stale (still returned,
// but the caller is expected to revalidate).
func (s *Store) TTL() time.Duration {
	if s == nil {
		return defaultTTL
	}
	return s.ttl
}

// GetTrace returns the cached recent-trace response for a hex, its age, and
// whether a row was found.
func (s *Store) GetTrace(ctx context.Context, hex string) (json.RawMessage, time.Duration, bool) {
	return s.get(ctx, "trace_cache_get",
		`select response, extract(epoch from (now() - fetched_at))::float8
		 from runtime.aircraft_trace_cache
		 where hex = $1`,
		hex,
	)
}

// PutTrace upserts the recent-trace response for a hex.
func (s *Store) PutTrace(ctx context.Context, hex string, response json.RawMessage) {
	s.exec(ctx, "trace_cache_put",
		`insert into runtime.aircraft_trace_cache (hex, response, fetched_at)
		 values ($1, $2::jsonb, now())
		 on conflict (hex) do update
		   set response = excluded.response, fetched_at = excluded.fetched_at`,
		hex, string(response),
	)
}

// GetRoute returns the cached route for a callsign+provider, its age, and
// whether a row was found. Provider is part of the key: FlightAware and adsbdb
// routes never cross over.
func (s *Store) GetRoute(ctx context.Context, callsign, provider string) (json.RawMessage, time.Duration, bool) {
	return s.get(ctx, "route_cache_get",
		`select route, extract(epoch from (now() - fetched_at))::float8
		 from runtime.flight_route_cache
		 where callsign = $1 and provider = $2`,
		callsign, provider,
	)
}

// PutRoute upserts a resolved route for a callsign+provider.
func (s *Store) PutRoute(ctx context.Context, callsign, provider string, route json.RawMessage) {
	s.exec(ctx, "route_cache_put",
		`insert into runtime.flight_route_cache (callsign, provider, route, fetched_at)
		 values ($1, $2, $3::jsonb, now())
		 on conflict (callsign, provider) do update
		   set route = excluded.route, fetched_at = excluded.fetched_at`,
		callsign, provider, string(route),
	)
}

// Cleanup deletes rows older than the retention window from both tables. Run
// periodically so the tables don't accumulate one row per aircraft ever viewed.
func (s *Store) Cleanup(ctx context.Context, retention time.Duration) {
	if s == nil || s.db == nil || retention <= 0 {
		return
	}
	cutoff := time.Now().Add(-retention)
	s.exec(ctx, "trace_cache_cleanup",
		`delete from runtime.aircraft_trace_cache where fetched_at < $1`, cutoff)
	s.exec(ctx, "route_cache_cleanup",
		`delete from runtime.flight_route_cache where fetched_at < $1`, cutoff)
}

// RunJanitor blocks running Cleanup on an interval until ctx is cancelled.
func (s *Store) RunJanitor(ctx context.Context, interval, retention time.Duration) {
	if s == nil || s.db == nil || interval <= 0 {
		return
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.Cleanup(ctx, retention)
		}
	}
}

func (s *Store) get(ctx context.Context, operation, query string, args ...any) (json.RawMessage, time.Duration, bool) {
	if s == nil || s.db == nil {
		return nil, 0, false
	}
	started := time.Now()
	var raw []byte
	var ageSeconds float64
	err := s.db.QueryRowContext(ctx, query, args...).Scan(&raw, &ageSeconds)
	s.record(operation, err, started)
	if err != nil || len(raw) == 0 {
		return nil, 0, false
	}
	age := time.Duration(ageSeconds * float64(time.Second))
	if age < 0 {
		age = 0
	}
	return json.RawMessage(raw), age, true
}

func (s *Store) exec(ctx context.Context, operation, query string, args ...any) {
	if s == nil || s.db == nil {
		return
	}
	started := time.Now()
	_, err := s.db.ExecContext(ctx, query, args...)
	s.record(operation, err, started)
}

func (s *Store) record(operation string, err error, started time.Time) {
	if s == nil || s.metrics == nil {
		return
	}
	result := "success"
	if err != nil && err != sql.ErrNoRows {
		result = "error"
	}
	s.metrics.RecordDBTransaction(operation, result, time.Since(started).Milliseconds())
}

package tracking

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

type SQLStore struct{ db *sql.DB }

func NewSQLStore(db *sql.DB) *SQLStore {
	if db == nil {
		return nil
	}
	return &SQLStore{db: db}
}

func (s *SQLStore) CreateOrResume(ctx context.Context, callsign, ownerID string, expiresAt time.Time) (Run, error) {
	if s == nil || s.db == nil {
		return Run{}, errors.New("tracking storage unavailable")
	}
	callsign = normalizeCallsign(callsign)
	if callsign == "" {
		return Run{}, errors.New("invalid callsign")
	}
	_, _ = s.db.ExecContext(ctx, `update runtime.tracking_runs set status = 'expired', ended_at = now(), updated_at = now(), stop_reason = 'expired' where status in ('active', 'lost_signal') and expires_at <= now()`)
	row := s.db.QueryRowContext(ctx, `
		insert into runtime.tracking_runs (callsign, owner_id, status, expires_at)
		values ($1, nullif($2, ''), 'active', $3)
		on conflict (callsign) where status in ('active', 'lost_signal')
		do update set updated_at = now()
		returning id::text, callsign, coalesce(aircraft_hex, ''), status, coalesce(owner_id, ''), started_at, updated_at, expires_at, ended_at, last_position_at, flightaware_checked_at, terminal_at, coalesce(terminal_source, ''), coalesce(stop_reason, '')`, callsign, ownerID, expiresAt)
	return scanRun(row)
}

func (s *SQLStore) FindActiveByCallsign(ctx context.Context, callsign string) (Run, bool, error) {
	if s == nil || s.db == nil {
		return Run{}, false, errors.New("tracking storage unavailable")
	}
	row := s.db.QueryRowContext(ctx, `select id::text, callsign, coalesce(aircraft_hex, ''), status, coalesce(owner_id, ''), started_at, updated_at, expires_at, ended_at, last_position_at, flightaware_checked_at, terminal_at, coalesce(terminal_source, ''), coalesce(stop_reason, '') from runtime.tracking_runs where callsign = $1 and status in ('active', 'lost_signal') and expires_at > now() limit 1`, normalizeCallsign(callsign))
	run, err := scanRun(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Run{}, false, nil
	}
	return run, err == nil, err
}

func (s *SQLStore) Get(ctx context.Context, id string) (Run, []Observation, error) {
	if s == nil || s.db == nil {
		return Run{}, nil, errors.New("tracking storage unavailable")
	}
	run, err := scanRun(s.db.QueryRowContext(ctx, `select id::text, callsign, coalesce(aircraft_hex, ''), status, coalesce(owner_id, ''), started_at, updated_at, expires_at, ended_at, last_position_at, flightaware_checked_at, terminal_at, coalesce(terminal_source, ''), coalesce(stop_reason, '') from runtime.tracking_runs where id = $1`, id))
	if err != nil {
		return Run{}, nil, err
	}
	rows, err := s.db.QueryContext(ctx, `select id::text, run_id::text, aircraft, source, upstream_at, received_at from runtime.tracking_observations where run_id = $1 order by received_at asc limit 5000`, id)
	if err != nil {
		return Run{}, nil, err
	}
	defer rows.Close()
	observations := []Observation{}
	for rows.Next() {
		var observation Observation
		var raw []byte
		if err := rows.Scan(&observation.ID, &observation.RunID, &raw, &observation.Source, &observation.UpstreamAt, &observation.ReceivedAt); err != nil {
			return Run{}, nil, err
		}
		_ = json.Unmarshal(raw, &observation.Aircraft)
		observations = append(observations, observation)
	}
	return run, observations, rows.Err()
}

func (s *SQLStore) ListRestorable(ctx context.Context, now time.Time) ([]Run, error) {
	if s == nil || s.db == nil {
		return nil, errors.New("tracking storage unavailable")
	}
	rows, err := s.db.QueryContext(ctx, `select id::text, callsign, coalesce(aircraft_hex, ''), status, coalesce(owner_id, ''), started_at, updated_at, expires_at, ended_at, last_position_at, flightaware_checked_at, terminal_at, coalesce(terminal_source, ''), coalesce(stop_reason, '') from runtime.tracking_runs where status in ('active', 'lost_signal') and expires_at > $1`, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var runs []Run
	for rows.Next() {
		run, err := scanRun(rows)
		if err != nil {
			return nil, err
		}
		runs = append(runs, run)
	}
	return runs, rows.Err()
}

func (s *SQLStore) RecordObservation(ctx context.Context, runID string, aircraft map[string]any, source string, upstreamAt, receivedAt time.Time) error {
	if s == nil || s.db == nil {
		return errors.New("tracking storage unavailable")
	}
	payload, err := json.Marshal(aircraft)
	if err != nil {
		return err
	}
	hex := normalizeHex(firstString(aircraft["icao24"], aircraft["hex"]))
	_, err = s.db.ExecContext(ctx, `insert into runtime.tracking_observations (run_id, aircraft, source, upstream_at, received_at) values ($1, $2::jsonb, $3, $4, $5)`, runID, string(payload), source, nullableTime(upstreamAt), receivedAt)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `update runtime.tracking_runs set aircraft_hex = coalesce(nullif($2, ''), aircraft_hex), last_position_at = $3, status = 'active', updated_at = now() where id = $1 and status in ('active', 'lost_signal')`, runID, hex, receivedAt)
	return err
}

func (s *SQLStore) MarkLostSignal(ctx context.Context, runID string, checkedAt time.Time) error {
	_, err := s.db.ExecContext(ctx, `update runtime.tracking_runs set status = 'lost_signal', flightaware_checked_at = $2, updated_at = now() where id = $1 and status = 'active'`, runID, checkedAt)
	return err
}

func (s *SQLStore) MarkActive(ctx context.Context, runID string) error {
	_, err := s.db.ExecContext(ctx, `update runtime.tracking_runs set status = 'active', updated_at = now() where id = $1 and status = 'lost_signal'`, runID)
	return err
}

func (s *SQLStore) MarkTerminal(ctx context.Context, runID, source string, terminalAt time.Time) error {
	_, err := s.db.ExecContext(ctx, `update runtime.tracking_runs set status = 'terminal', ended_at = $2, terminal_at = $2, terminal_source = $3, stop_reason = 'confirmed_terminal', updated_at = now() where id = $1 and status in ('active', 'lost_signal')`, runID, terminalAt, source)
	return err
}

func (s *SQLStore) Expire(ctx context.Context, runID string, at time.Time) error {
	_, err := s.db.ExecContext(ctx, `update runtime.tracking_runs set status = 'expired', ended_at = $2, stop_reason = 'expired', updated_at = now() where id = $1 and status in ('active', 'lost_signal')`, runID, at)
	return err
}

func (s *SQLStore) Stop(ctx context.Context, runID, ownerID string, at time.Time) (Run, error) {
	return scanRun(s.db.QueryRowContext(ctx, `
		update runtime.tracking_runs
		set status = 'stopped', ended_at = $2, stop_reason = 'stopped', updated_at = now()
		where id = $1
		  and status in ('active', 'lost_signal')
		  and (owner_id is null or owner_id = nullif($3, ''))
		returning id::text, callsign, coalesce(aircraft_hex, ''), status, coalesce(owner_id, ''), started_at, updated_at, expires_at, ended_at, last_position_at, flightaware_checked_at, terminal_at, coalesce(terminal_source, ''), coalesce(stop_reason, '')`, runID, at, ownerID))
}

type scanner interface{ Scan(...any) error }

func scanRun(row scanner) (Run, error) {
	var run Run
	err := row.Scan(&run.ID, &run.Callsign, &run.AircraftHex, &run.Status, &run.OwnerID, &run.StartedAt, &run.UpdatedAt, &run.ExpiresAt, &run.EndedAt, &run.LastPositionAt, &run.FlightAwareCheckedAt, &run.TerminalAt, &run.TerminalSource, &run.StopReason)
	return run, err
}

func normalizeCallsign(value string) string {
	value = strings.Join(strings.Fields(strings.ToUpper(strings.TrimSpace(value))), "")
	if len(value) < 3 || len(value) > 8 {
		return ""
	}
	for _, r := range value {
		if !(r >= 'A' && r <= 'Z' || r >= '0' && r <= '9') {
			return ""
		}
	}
	return value
}

func normalizeHex(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	if len(value) != 6 {
		return ""
	}
	for _, r := range value {
		if !(r >= 'A' && r <= 'F' || r >= '0' && r <= '9') {
			return ""
		}
	}
	return value
}

func firstString(values ...any) string {
	for _, value := range values {
		if text := strings.TrimSpace(fmt.Sprint(value)); text != "" && text != "<nil>" {
			return text
		}
	}
	return ""
}
func nullableTime(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value
}

package webapi

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/adsbao/adsbao/services/data-service/internal/tracking"
)

func (h *Handler) handleTrackingRuns(w http.ResponseWriter, r *http.Request) {
	if h.tracking == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "Tracking storage unavailable"})
		return
	}
	if r.URL.Path == "/api/tracking-runs" {
		switch r.Method {
		case http.MethodGet:
			callsign := strings.TrimSpace(r.URL.Query().Get("callsign"))
			if callsign == "" {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "callsign is required"})
				return
			}
			run, found, err := h.tracking.FindActive(r.Context(), callsign)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Tracking run lookup failed"})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"run": nullableRun(run, found)})
			return
		case http.MethodPost:
			body, err := decodeJSONBody(r, 16*1024)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid JSON body"})
				return
			}
			ownerID := h.trackingOwner(r)
			run, err := h.tracking.Ensure(r.Context(), strings.TrimSpace(stringValue(body["callsign"])), ownerID)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"run": run})
			return
		}
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/tracking-runs/")
	if id == "" || strings.Contains(id, "/") {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		run, observations, err := h.tracking.Get(r.Context(), id)
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Tracking run not found"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Tracking run read failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"run": run, "observations": observations})
	case http.MethodDelete:
		run, err := h.tracking.Stop(r.Context(), id, h.trackingOwner(r))
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Tracking run not found or cannot be stopped"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Tracking run stop failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"run": run})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "Method not allowed"})
	}
}

func (h *Handler) trackingOwner(r *http.Request) string {
	if h.authenticator == nil {
		return ""
	}
	user, err := h.authenticator.CurrentUser(r.Context(), r)
	if err != nil || user == nil {
		return ""
	}
	return user.ID
}

func nullableRun(run tracking.Run, found bool) any {
	if !found {
		return nil
	}
	return run
}

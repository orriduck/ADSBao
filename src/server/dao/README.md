# API DAO Boundary

This folder contains server-only data access helpers for API routes and feature mechanisms.

DAO files are responsible for Postgres persistence boundaries. They should accept already-normalized parameters from mechanism code and should not choose upstream source order, fallback policy, request timing, or product behavior.

Do not add HTTP adapters here. API handlers belong in the active app server
and should call mechanisms under `src/features/<domain>`.

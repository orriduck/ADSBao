# API DAO Boundary

This folder contains server-only data access helpers for API routes and server mechanisms.

DAO files are responsible for persistence boundaries such as Supabase reads and writes. They should accept already-normalized parameters from mechanism code and should not choose upstream source order, fallback policy, request timing, or product behavior.

Do not add `route.js` files here. Route handlers live under `src/app/api/**/route.js` and should call mechanisms under `src/server/<domain>`.

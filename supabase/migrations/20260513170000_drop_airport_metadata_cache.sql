-- Drop public.airport_metadata_cache. It was the warm-cache table for the old
-- airportsapi.com browser-side `airportDirectoryClient`. That client was
-- removed in the OurAirports migration (#179) and replaced with the
-- Supabase-backed `airports` table served via `/api/search` and
-- `/api/airport/[ident]`. The only remaining writer was the AIRAC-backed
-- `/api/proxy/airports/nearby` route handler, and that write is removed in
-- the accompanying code change — no live reader, so the table just
-- accumulated dead rows.

drop table if exists public.airport_metadata_cache;

drop function if exists public.set_airport_metadata_cache_updated_at();

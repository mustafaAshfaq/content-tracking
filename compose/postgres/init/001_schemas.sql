-- Isolates RudderStack's operational state from the app's warehouse tables in
-- the same Postgres instance. RudderStack keeps its internal job queue
-- (jobsdb) in `public`; this build slice only reserves the two namespaces the
-- later slices write into. No personalization, audience, or attribution tables
-- exist yet — those arrive with their own migrations.
--
-- Applied automatically on a fresh volume (docker-entrypoint-initdb.d) and
-- re-appliable against an existing volume via `npm run stack:migrate`, so every
-- statement here MUST stay idempotent.

-- App-owned analytics warehouse: audience compute, attribution views, and the
-- `/segments/:userId` read model land here in later slices.
CREATE SCHEMA IF NOT EXISTS warehouse;

-- Default namespace the RudderStack Postgres warehouse destination writes event
-- tables into (`tracks`, per-event tables, `identifies`, `users`) once a
-- destination is wired up. Reserved now so grants and search paths are stable.
CREATE SCHEMA IF NOT EXISTS rudder_events;

COMMENT ON SCHEMA warehouse IS 'App-owned analytics warehouse (audience/attribution read models). Populated by later build slices.';
COMMENT ON SCHEMA rudder_events IS 'Landing schema for the RudderStack Postgres warehouse destination. Populated once a destination is configured.';

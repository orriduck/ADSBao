import {
  createPostgresQueryClientFromEnv,
  type PostgresQueryClient,
} from "./postgresClient";

type RouteFeedbackRecord = Record<string, any>;

const ROUTE_FEEDBACK_TABLE = "runtime.flight_route_feedback_reports";

const ACTIVE_STATUS = "active";

const SELECT_COLUMNS = [
  "id",
  "cache_key",
  "normalized_callsign",
  "target_airport_icao",
  "target_airport_iata",
  "origin_icao",
  "destination_icao",
  "aircraft_hex",
  "aircraft_type",
  "feedback_reason",
  "prior_route_payload",
  "route_payload",
  "status",
  "created_at",
  "expires_at",
  "deleted_at",
].join(",");

function createRouteFeedbackReportsRepository({
  queryClient,
  now = Date.now,
}: {
  queryClient?: PostgresQueryClient | null;
  now?: () => number;
} = {}) {
  if (!queryClient) return null;

  return {
    // Newest active, non-expired, non-soft-deleted feedback report for a
    // callsign. The route lookup path no longer uses this as a provider
    // override; reads are retained for audit/admin workflows.
    async readActiveOverride({ normalizedCallsign }: RouteFeedbackRecord) {
      if (!normalizedCallsign) return null;

      try {
        const result = await queryClient.query<RouteFeedbackRecord>(
          `
            select ${SELECT_COLUMNS}
            from ${ROUTE_FEEDBACK_TABLE}
            where normalized_callsign = $1
              and status = $2
              and deleted_at is null
              and expires_at > $3
            order by created_at desc
            limit 1
          `,
          [normalizedCallsign, ACTIVE_STATUS, new Date(now()).toISOString()],
        );
        return result.rows?.[0] || null;
      } catch (error: any) {
        throw new Error(
          `Route feedback override read failed (${error.message})`,
        );
      }
    },

    async writeFeedbackReport({
      cacheKey,
      normalizedCallsign,
      targetAirportIcao = "",
      targetAirportIata = "",
      originIcao,
      destinationIcao,
      aircraftHex = "",
      aircraftType = "",
      userHash = "",
      feedbackReason,
      priorRoutePayload = null,
      routePayload,
      createdAt,
      expiresAt,
    }: RouteFeedbackRecord = {}) {
      const row = {
        cache_key: cacheKey,
        normalized_callsign: normalizedCallsign,
        target_airport_icao: targetAirportIcao || null,
        target_airport_iata: targetAirportIata || null,
        origin_icao: originIcao,
        destination_icao: destinationIcao,
        aircraft_hex: aircraftHex || null,
        aircraft_type: aircraftType || null,
        user_hash: userHash || null,
        feedback_reason: feedbackReason,
        prior_route_payload: priorRoutePayload,
        route_payload: routePayload,
        status: ACTIVE_STATUS,
        created_at: createdAt,
        expires_at: expiresAt,
        deleted_at: null,
      };

      try {
        const result = await queryClient.query<RouteFeedbackRecord>(
          `
            insert into ${ROUTE_FEEDBACK_TABLE} (
              cache_key,
              normalized_callsign,
              target_airport_icao,
              target_airport_iata,
              origin_icao,
              destination_icao,
              aircraft_hex,
              aircraft_type,
              user_hash,
              feedback_reason,
              prior_route_payload,
              route_payload,
              status,
              created_at,
              expires_at,
              deleted_at
            )
            values (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11::jsonb, $12::jsonb, $13, $14, $15, $16
            )
            returning ${SELECT_COLUMNS}
          `,
          [
            row.cache_key,
            row.normalized_callsign,
            row.target_airport_icao,
            row.target_airport_iata,
            row.origin_icao,
            row.destination_icao,
            row.aircraft_hex,
            row.aircraft_type,
            row.user_hash,
            row.feedback_reason,
            row.prior_route_payload,
            row.route_payload,
            row.status,
            row.created_at,
            row.expires_at,
            row.deleted_at,
          ],
        );
        return result.rows?.[0] || null;
      } catch (error: any) {
        throw new Error(
          `Route feedback write failed (${error.message})`,
        );
      }
    },
  };
}

export function createRouteFeedbackReportsRepositoryFromEnv({
  env = process.env,
  queryClient,
  createPoolImpl,
  now = Date.now,
}: {
  env?: Record<string, string | undefined>;
  queryClient?: PostgresQueryClient | null;
  createPoolImpl?: any;
  now?: () => number;
} = {}) {
  return createRouteFeedbackReportsRepository({
    queryClient:
      queryClient === undefined
        ? createPostgresQueryClientFromEnv({ env, createPoolImpl })
        : queryClient,
    now,
  });
}

import { AIRCRAFT_TRAFFIC_CONFIG } from "../../../config/aviation";

export const NEARBY_AIRPORT_LIMITS = Object.freeze({
  minRadiusNm: 1,
  maxRadiusNm: 250,
  minLimit: 1,
  maxLimit: 100,
});

export const NEARBY_AIRPORT_DEFAULTS = Object.freeze({
  // Airport badges share the same exploration circle as live traffic. Do not
  // derive this from a multiplier: that makes the visible map boundary and
  // the data contract drift apart when the traffic radius changes.
  radiusNm: AIRCRAFT_TRAFFIC_CONFIG.rangeNm,
  limit: NEARBY_AIRPORT_LIMITS.maxLimit,
});

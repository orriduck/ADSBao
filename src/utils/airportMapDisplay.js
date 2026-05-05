import { AIRPORT_MAP_ZOOM } from "../config/aviation.js"

export const ZOOM_APPROACH = AIRPORT_MAP_ZOOM.approach
export const ZOOM_AIRPORT = AIRPORT_MAP_ZOOM.airport
export const ZOOM_DETAIL = AIRPORT_MAP_ZOOM.detail

export const shouldShowAirportArea = (zoom) => Number(zoom) >= ZOOM_AIRPORT

export const isGroundLikeAircraft = (
  aircraft,
  {
    airportAreaRadiusNm,
    slowAircraftThresholdKt,
  } = {},
) => {
  if (aircraft?.onGround) return true

  const distanceNm = Number(aircraft?.distanceNm)
  const speedKt = Number(aircraft?.velocity ?? 0)

  return (
    Number.isFinite(distanceNm)
    && distanceNm <= airportAreaRadiusNm
    && Number.isFinite(speedKt)
    && speedKt < slowAircraftThresholdKt
  )
}

export const countGroundAircraft = (aircraft = []) =>
  aircraft.filter((item) => item?.onGround).length

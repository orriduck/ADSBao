export const MECHANISM_ITEMS = [
  {
    id: "providerFallback",
    titleKey: "mechanism.items.providerFallback.title",
    bodyKey: "mechanism.items.providerFallback.body",
    signalKey: "mechanism.items.providerFallback.signal",
    detailKeys: [
      "mechanism.items.providerFallback.details.candidates",
      "mechanism.items.providerFallback.details.race",
      "mechanism.items.providerFallback.details.winner",
    ],
  },
  {
    id: "openAipContext",
    titleKey: "mechanism.items.openAipContext.title",
    bodyKey: "mechanism.items.openAipContext.body",
    signalKey: "mechanism.items.openAipContext.signal",
    detailKeys: [
      "mechanism.items.openAipContext.details.airport",
      "mechanism.items.openAipContext.details.normalize",
      "mechanism.items.openAipContext.details.overlay",
    ],
  },
  {
    id: "postgresBoundary",
    titleKey: "mechanism.items.postgresBoundary.title",
    bodyKey: "mechanism.items.postgresBoundary.body",
    signalKey: "mechanism.items.postgresBoundary.signal",
    detailKeys: [
      "mechanism.items.postgresBoundary.details.check",
      "mechanism.items.postgresBoundary.details.persist",
      "mechanism.items.postgresBoundary.details.return",
    ],
  },
  {
    id: "aircraftTrace",
    titleKey: "mechanism.items.aircraftTrace.title",
    bodyKey: "mechanism.items.aircraftTrace.body",
    signalKey: "mechanism.items.aircraftTrace.signal",
    detailKeys: [
      "mechanism.items.aircraftTrace.details.select",
      "mechanism.items.aircraftTrace.details.append",
      "mechanism.items.aircraftTrace.details.persist",
    ],
  },
  {
    id: "mapOverlays",
    titleKey: "mechanism.items.mapOverlays.title",
    bodyKey: "mechanism.items.mapOverlays.body",
    signalKey: "mechanism.items.mapOverlays.signal",
    detailKeys: [
      "mechanism.items.mapOverlays.details.layers",
      "mechanism.items.mapOverlays.details.project",
      "mechanism.items.mapOverlays.details.label",
    ],
  },
  {
    id: "featureFlags",
    titleKey: "mechanism.items.featureFlags.title",
    bodyKey: "mechanism.items.featureFlags.body",
    signalKey: "mechanism.items.featureFlags.signal",
    detailKeys: [
      "mechanism.items.featureFlags.details.read",
      "mechanism.items.featureFlags.details.gate",
      "mechanism.items.featureFlags.details.release",
    ],
  },
] as const;

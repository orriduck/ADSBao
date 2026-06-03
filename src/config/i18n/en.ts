// English dictionary. Keys are dot-namespaced and the leaf is a string;
// nested objects group surfaces. Keep keys stable — they are referenced
// from components — and add new ones rather than renaming when the copy
// shifts.
const en = {
  app: {
    feedLive: "Live feed",
    live: "Live",
    airportExplorer: "Airports",
    aboutTitle: "About",
    mechanismTitle: "Mechanism",
    siteDescription:
      "Airport context with METAR weather, nearby aircraft, route hints, and map overlays.",
  },
  brand: {
    wordmarkZh: "拍机宝",
  },
  nav: {
    home: "ADSBao",
    homePage: "Home",
    map: "Map",
    about: "About",
    mechanism: "Mechanism",
    changelog: "Changelog",
  },
  auth: {
    account: "Account",
    signIn: "Sign in",
    signUp: "Register",
    signedIn: "Signed in",
  },
  about: {
    meta: {
      version: "Version",
      release: "Release",
      stack: "Stack",
      architecture: "Architecture",
      nextWeb: "Next.js Web",
      mapsWeatherTraffic: "Maps · Weather · Traffic",
    },
    dataSources: "Data sources",
    feedCount: "{count} feed",
    feedsCount: "{count} feeds",
    mitLicense: "MIT License",
    sources: {
      aviationWeather: {
        title: "Aviation Weather METAR",
        description:
          "Live observations and decoded sky conditions for each airport.",
      },
      adsbLol: {
        title: "adsb.lol Aircraft Feed",
        description:
          "Primary crowdsourced ADS-B positions used to render nearby traffic, plus recent flight traces for the selected aircraft.",
      },
      airplanesLive: {
        title: "airplanes.live Aircraft Feed",
        description:
          "Peer ADS-B positions feed. On cold start the proxy races position feeds and sticks with whichever responds first; on error it re-races to pick a fresh winner.",
      },
      adsbFi: {
        title: "adsb.fi Aircraft Feed",
        description:
          "Peer ADS-B positions feed. It participates in the same cold-start race and sticky failover path as the other aircraft position providers.",
      },
      aircraftShapes: {
        title: "AircraftShapesSVG",
        description:
          "Top-view aircraft silhouettes on the map. Icons by RexKramer1, licensed GPL-3.0, used with attribution.",
      },
      adsbdb: {
        title: "adsbdb Callsign Routes",
        description:
          "Public callsign to origin/destination lookup. Community-submitted corrections can temporarily override a route for 12 hours.",
      },
      openMeteo: {
        title: "Open-Meteo Current Weather",
        description:
          "Local temperature, wind, and conditions for the airport area.",
      },
      openAip: {
        title: "OpenAIP",
        description:
          "Airport, runway, frequency, navaid, airspace, reporting point, and obstacle context for search and maps. Licensed CC BY-NC 4.0.",
      },
      ourAirportsRunways: {
        title: "OurAirports Runway Geometry",
        description:
          "Runway threshold coordinates used only for accurate runway map overlays.",
      },
      wikipedia: {
        title: "Wikipedia Summary",
        description: "First-paragraph summaries for airport context cards.",
      },
      mapTiles: {
        title: "OpenStreetMap · CartoDB",
        description: "Light and dark base map tiles plus reference labels.",
      },
      brandingVideo: {
        title: "Bilibili Aircraft Footage",
        description:
          "Aircraft branding footage credit: 【视频分享】素材分享——飞机起飞降落 by 霸波奔bo奔波霸.",
      },
    },
  },
  mechanism: {
    title: "Mechanism",
    description:
      "How ADSBao turns provider data, airport context, persistence boundaries, and local map state into a readable operating picture.",
    sidebarLabel: "System flow",
    count: "{count} mechanisms",
    items: {
      providerFallback: {
        title: "ADS-B provider fallback",
        signal: "Position source selection",
        body:
          "Position providers are treated as peers. The client-facing proxy races cold starts, keeps the current winner while it is healthy, then reselects when a feed fails.",
        details: {
          candidates:
            "The browser does not talk to every upstream directly. It asks ADSBao for nearby positions, and the proxy decides which provider can currently answer with stable data.",
          race:
            "When the active provider is unknown or stale, the proxy evaluates candidates instead of assuming a fixed primary source. The first healthy response becomes the source for that request path.",
          winner:
            "The selected provider is reused while it remains healthy, so the map avoids visible source churn. If it fails, the next request can fall back without changing the public UI contract.",
        },
      },
      openAipContext: {
        title: "Airport context via OpenAIP",
        signal: "Airport and overlay context",
        body:
          "OpenAIP supplies the airport-side operating context: runways, navaids, reporting points, airspace, frequencies, and other map annotations.",
        details: {
          airport:
            "Airport detail pages start from a known ICAO/IATA identity, then use OpenAIP only for the parts that make the surrounding airspace and procedures easier to understand.",
          normalize:
            "Provider-specific shapes are normalized before they reach React components. That keeps runway, navaid, frequency, and airspace rendering from depending on raw upstream formats.",
          overlay:
            "The map can then decide which layers to show from one consistent aviation context, instead of making every overlay component repeat provider parsing rules.",
        },
      },
      supabaseBoundary: {
        title: "Supabase cache boundaries",
        signal: "Persistence without live coupling",
        body:
          "Supabase holds directory and persisted records at clear boundaries. Route handlers decide when to read, refresh, or return cached context.",
        details: {
          check:
            "Reads go through route handlers and DAO helpers, so UI components do not need to know whether a value came from Supabase, a provider refresh, or static fallback data.",
          persist:
            "When a fetched record is worth keeping, the server stores the normalized version rather than leaking provider-specific payloads into the app surface.",
          return:
            "That boundary lets ADSBao return stable airport and route context even when an external provider changes shape or temporarily becomes unavailable.",
        },
      },
      aircraftTrace: {
        title: "Aircraft tracking and trace",
        signal: "Selected aircraft history",
        body:
          "A selected aircraft keeps a trace separate from the live list. Recent points, route hints, and session state are merged into one readable track.",
        details: {
          select:
            "Selecting an aircraft promotes it from the nearby list into a focused tracking state. The sidebar, preview card, and map all read from that same selection.",
          append:
            "New ADS-B positions update the live marker and append to the visible trace when they are coherent enough to draw. The trace is kept separate from list refresh churn.",
          persist:
            "Route hints, recent points, and user-facing tracking context are merged so the aircraft page can remain understandable after navigation or refresh.",
        },
      },
      mapOverlays: {
        title: "Map overlays",
        signal: "Runways, navaids, airspace",
        body:
          "Layer toggles choose which airport overlays enter the map. Geometry is projected into the current view, then labels fade with their features.",
        details: {
          layers:
            "The map layer drawer resolves the user's active overlay choices before the map renders extra geometry. Disabled layers stay out of both the drawing and labeling paths.",
          project:
            "Runways, navaids, airspaces, and other shapes are projected against the current map view after normalization, which keeps pan and zoom behavior predictable.",
          label:
            "Labels are attached to their source geometry and animate with it, so turning a layer on or off does not leave orphaned names floating over the map.",
        },
      },
      featureFlags: {
        title: "Owner-only experiments",
        signal: "Internal feature flags",
        body:
          "Internal flags let owner-only experiments exist beside the public product. The default path stays stable unless the active user can see the flag.",
        details: {
          read:
            "Feature flags are read as product state, not as scattered one-off checks. That makes experimental surfaces easier to audit before they become public.",
          gate:
            "Owner-only UI can run in production-like conditions while staying invisible to normal users, which is useful for FlightAware and other integration-heavy flows.",
          release:
            "The public route keeps the stable behavior unless a flag explicitly opens a new branch. Removing the flag path later becomes a small cleanup instead of a redesign.",
        },
      },
    },
  },
  sidebar: {
    weather: "Weather",
    flights: "Flights",
    airports: "Airports",
    airport: "Airport",
    tracking: "Tracking",
    nearby: "Nearby",
    callsignOrRoute: "Callsign / Route",
    distance: "Distance",
    altitude: "Altitude",
    searchPlaceholder: "Search callsign, ICAO, route",
    searchAria: "Search aircraft",
    filtersAria: "Sidebar list filters",
    targets: "Targets",
    route: "Route",
    aircraftType: "Aircraft type",
    altitudeFilter: "Altitude",
    nothingInRange: "Nothing in range",
    noMatches: "No matches",
    typesCount: "{count} types",
    all: "All",
    any: "Any",
    routed: "Routed",
    flightTelemetry: "Flight telemetry",
    airportViews: "Airport sidebar views",
    weatherViews: "Weather views",
    unknownAirport: "Unknown airport",
    departures: "Departures",
    arrivals: "Arrivals",
  },
  metrics: {
    speed: "Speed",
    altitude: "Altitude",
    verticalSpeed: "Vertical speed",
    track: "Track",
    hex: "Hex",
    icao24: "ICAO24",
    icao: "ICAO",
    iata: "IATA",
    city: "City",
    country: "Country",
    flightPhase: "Flight phase",
    distance: "Distance",
    frequency: "Frequency",
    dme: "DME",
    usage: "Usage",
    power: "Power",
    associated: "Assoc",
    variation: "Variation",
    vertical: "Vertical",
    wind: "Wind",
    visibility: "Vis",
    rule: "Rule",
    elevation: "Elevation",
  },
  directions: {
    n: "N",
    ne: "NE",
    e: "E",
    se: "SE",
    s: "S",
    sw: "SW",
    w: "W",
    nw: "NW",
  },
  aircraft: {
    noRoute: "No route",
    airborne: "Airborne",
    ground: "Ground",
    gnd: "GND",
  },
  preview: {
    aircraftPreview: "Aircraft",
    airportPreview: "Airport",
    navaidPreview: "Navaid",
    airspacePreview: "Airspace",
    candidateWatchingSpotPreview: "Photo spot",
    aircraftRoute: "Route",
    navaidType: "Type",
    navaidName: "Name",
    candidateWatchingSpotType: "Type",
    airportName: "Name",
    airportPlace: "Place",
    airspaceType: "Type",
    airspaceAccess: "Access",
    airspaceClass: "Class",
    airspaceVertical: "Vertical limits",
    airspaceLowerLimit: "Lower limit",
    airspaceUpperLimit: "Upper limit",
    airspaceSource: "Source",
    trackTrace: "Track trace",
    trackingTrace: "Tracking trace",
    loadingTrace: "Loading trace...",
    openAirport: "Track airport",
    viewingAirport: "Viewing airport",
    creditPrefix: "credit@",
  },
  routeFeedback: {
    suggestRight: "Suggest the right one",
    suggestCorrection: "Suggest correction",
    hintPrefix: "Submit a temporary route. Marked ",
    hintSuffix: " in the route label, expires in 12 h.",
    origin: "Origin",
    destination: "Destination",
    submit: "Submit",
    sending: "Sending…",
    cancel: "Cancel",
    close: "Close",
    invalidIcao: "Use 3–4 letter ICAO codes",
    sameOriginDestination: "Origin and destination must differ",
    noCallsign: "No callsign on record",
    serverNoRoute: "Server returned no route",
    submissionFailed: "Submission failed ({status})",
    submissionGenericFailure: "Could not submit",
    ariaLabel: "Submit a temporary route override",
  },
  filters: {
    aircraftFilterAria: "Filter by aircraft type",
    altitudeFilterAria: "Filter by altitude level",
    showAria: "Filter what to show in the list",
    routesOnly: "Routes only",
    altAny: "Any",
    altGround: "Ground",
    altClimbDescent: "Climb / descent",
    altHigh: "High",
    entityAircraft: "Aircraft",
    entityAirports: "Airports",
    categoryA1: "Lightweight aircraft",
    categoryA2: "Small aircraft",
    categoryA3: "Large aircraft",
    categoryA4: "High-vortex aircraft",
    categoryA5: "Heavy aircraft",
    categoryA6: "High-performance aircraft",
    categoryA7: "Rotorcraft",
    categoryOther: "Other",
    routedTooltip:
      "Only show flights whose callsign resolved to a legitimate parsed route: both origin and destination airports identified.",
  },
  search: {
    placeholder: "Search airport or city",
    enter: "enter",
    searchResults: "Search results",
    searchingAirports: "Searching airports...",
    noAirportMatched: "No airport matched \"{query}\".",
    discovery: {
      pageTitle: "Airports",
      pageDescription: "Airport Situation Explorer",
      nearby: {
        title: "Nearby",
        cta: "Find airports near me",
        ctaHint: "Requests browser location, then loads a short nearby list.",
        requesting: "Requesting location...",
        loading: "Finding nearby airports...",
        retry: "Try nearby again",
        unavailable: "Location was unavailable. Search still works.",
        empty: "No nearby airports were found for this position.",
      },
      spotterFavorites: {
        title: "Spotter favorites",
        description: "Airports with distinctive approaches, scenery, or viewing culture.",
      },
      majorInternationalHubs: {
        title: "Major international hubs",
        description: "Large global gateways for comparing long-haul traffic patterns.",
      },
      worldOfAirports: {
        title: "World of Airports picks",
        description: "Airports selected for players who enjoy varied terminal and route networks.",
      },
      cargoHubs: {
        title: "Cargo hubs",
        description: "Airports where logistics traffic gives the map a different rhythm.",
      },
      airportLabels: {
        harborApproaches: "Harbor approaches",
        parallelArrivals: "Bay parallel arrivals",
        terraceTraffic: "Viewing terrace traffic",
        transatlanticGate: "Transatlantic gateway",
        pacificGateway: "Pacific gateway",
        globalBanks: "Global arrival banks",
        asiaPacificHub: "Asia-Pacific hub",
        northeastAsiaHub: "Northeast Asia hub",
        europeanBanks: "European arrival banks",
        europeanGateway: "European gateway",
        southeastMegahub: "Southeast megahub",
        midcontinentHub: "Midcontinent hub",
        capitalLongHaul: "Capital long-haul",
        andesGateway: "Andes gateway",
        southeastAsiaHub: "Southeast Asia hub",
        integratorHub: "Integrator superhub",
        polarCargo: "Polar cargo stop",
        nightSort: "Night-sort traffic",
      },
    },
  },
  map: {
    layers: "Map layers",
    settings: "Map settings",
    layerOverlaysAria: "Map layer overlays",
    toggleSidebar: "Toggle sidebar",
    fitTrace: "Fit map to trace",
    zoomLockedFlightAware: "Zoom is locked while using FlightAware fallback",
    approachingView: "Approaching view (click to cycle)",
    themeButtonAria: "Theme: {label} (click to switch)",
    themeLight: "Light",
    themeDark: "Dark",
    runwayDirectionsAria: "Runway directions",
    loadingMapAria: "Loading map data",
    loadingAircraftAria: "Loading ADS-B aircraft data",
    loadingTrackedAircraftAria: "Loading aircraft tracking data",
    locationDenied: "Location permission was denied.",
    locationTooFar: "You're too far from this airport.",
    locationUnavailable: "Location is unavailable.",
    distanceAria: "Map distance: {distance} nautical miles",
    distanceLabel: "Distance",
  },
  mapLayers: {
    mapLabels: "Map labels",
    showMapLabels: "Show map labels",
    hideMapLabels: "Hide map labels",
    approachBeams: "Approach beams",
    showApproachBeams: "Show approach beams",
    hideApproachBeams: "Hide approach beams",
    navaidMarkers: "Navaid markers",
    showNavaidMarkers: "Show navaid markers",
    hideNavaidMarkers: "Hide navaid markers",
    airspaces: "Airspace",
    showAirspaces: "Show airspace",
    hideAirspaces: "Hide airspace",
    candidateWatchingSpots: "Candidate watching spots",
    showCandidateWatchingSpots: "Show candidate watching spots",
    hideCandidateWatchingSpots: "Hide candidate watching spots",
    userLocation: "My location",
    userLocationAudio: "Proximity sound",
    showUserLocation: "Show my location",
    enableUserLocationAudio: "Enable aircraft proximity sound",
    disableUserLocationAudio: "Disable aircraft proximity sound",
    hideUserLocation: "Hide my location",
    locatingUser: "Locating...",
  },
  mapSettings: {
    title: "Map settings",
    description: "Choose a map mode, then fine-tune the layers shown on this airport map.",
    modeSection: "Modes",
    layersSection: "Display",
    guestPrompt: "Sign in to save your map mode and layer settings across devices.",
    noSavedSettings: "No saved map setup yet. Save this setup when it feels right.",
    savedSettingsAvailable: "A saved map setup is available for this account.",
    saveSettings: "Save setup",
    savingSettings: "Saving...",
    restoreSettings: "Restore",
    restoringSettings: "Restoring...",
    modes: {
      spotting: "Watcher Mode",
      radio: "Radio",
      controller: "Controller",
      immersive: "Immersive",
      custom: "Custom",
    },
    modeDescriptions: {
      spotting: "Runway-aligned candidate watching spots with labels and approach geometry.",
      radio: "Navigation aids and labels for listening context.",
      controller: "Airspace-aware traffic control context.",
      immersive: "Visual enhancements coming soon.",
      custom: "Your manual overrides on top of a preset.",
    },
  },
  watcherMode: {
    countOne: "{count} candidate watching spot",
    countMany: "{count} candidate watching spots",
    possibleSpot: "Possible watching spot",
    possibleSpotDescription:
      "Based on runway alignment and public map data.",
    cardsTitle: "Candidate watching spots",
    empty: "No candidate watching spots in the static file for this airport.",
    dataError: "Candidate watching spots could not be loaded.",
    fallbackName: "Candidate spot",
    distanceMeters: "{distance} m",
    attribution: "© OpenStreetMap contributors",
    disclaimer:
      "This is a map-derived candidate only. It may not have a clear view, legal parking, public access, safe access, or good lighting.",
  },
  lostSignal: {
    subtitle: "Signal lost",
    title: "{callsign} stopped reporting",
    description:
      "The aircraft may have landed or moved out of coverage. The last known position and trace are still on the map. Tracking keeps polling in the background — if the signal comes back the live view resumes automatically.",
    acknowledge: "Keep current view",
    home: "Back to home",
    ariaLabel: "Signal lost",
  },
  language: {
    switchAria: "Switch language",
    menuLabel: "Language",
    selectAria: "Select language",
  },
  primary: {
    menuLabel: "Accent",
    yellow: "Valley IV",
    teal: "Wuling",
  },
  ui: {
    close: "Close",
    sidebar: "Sidebar",
    sidebarDescription: "Displays the mobile sidebar.",
    toggleSidebar: "Toggle Sidebar",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    themeTitle: "Theme: {label} (click to switch)",
  },
  weather: {
    direction: "Direction",
    wind: "Wind",
    gust: "Gust",
    none: "None",
    temp: "Temp",
    dew: "Dew",
    spread: "Spread",
    cold: "cold",
    hot: "hot",
    altimeter: "Altimeter",
    mslPressure: "MSL pressure",
    local: "Local",
    airportLocal: "{airport} local",
    airportFallback: "Airport",
    humidity: "Humidity",
    feels: "Feels",
    loading: "Loading...",
    pending: "Local weather pending",
    openMeteoError: "Open-Meteo unavailable: {error}",
    metarLoading: "Loading METAR...",
    metarMissing: "No METAR available.",
    metarFullReport: "Full report",
    flightRules: {
      vfr: {
        label: "Visual Flight Rules",
        context:
          "Skies and visibility support normal visual operations. Weather is unlikely to constrain airport capacity.",
      },
      mvfr: {
        label: "Marginal Visual Flight Rules",
        context:
          "Visibility or ceiling is reduced. Arrivals and departures usually continue, but pilots watch weather margins closely.",
      },
      ifr: {
        label: "Instrument Flight Rules",
        context:
          "Low clouds or limited visibility require instrument procedures. Arrival spacing can increase and delays become more likely.",
      },
      lifr: {
        label: "Low IFR",
        context:
          "Very low ceiling or visibility limits airport flow. Only aircraft and runways equipped for low-visibility operations can land reliably.",
      },
    },
    observed: "Observed",
    windMissing: "Wind —",
    visMissing: "Vis —",
    cardViewAria: "Weather card view",
    ceiling: "Ceiling",
    visibility: "Visibility",
    metarToken: {
      station: "Station",
      issued: "Issued",
      wind: "Wind",
      vis: "Vis",
    },
    windPara: {
      strong:
        "Strong winds or gusts can reduce arrival rates, increase go-around risk, and force stricter runway selection.",
      moderate:
        "Moderate wind is workable, but crosswind components and gust spread can affect spacing and runway configuration.",
      light:
        "Light wind usually gives the airport more runway flexibility and keeps arrival and departure flow stable.",
      variable:
        "Variable wind makes runway planning less predictable. Tower may switch flows or issue runway-specific guidance.",
    },
    tempPara: {
      fogRisk:
        "A small temperature-dewpoint spread can support fog, haze, or low cloud development near the field.",
      hot:
        "Hot air reduces aircraft performance, which can lengthen takeoff rolls and affect climb margins.",
      cold:
        "Cold conditions can improve density altitude, but icing, braking action, and deicing become operational concerns.",
      normal:
        "Temperature and dewpoint are separated enough that fog risk is lower near the field.",
    },
    pressurePara: {
      unknown:
        "Pressure data helps crews set altimeters and judge density-altitude effects around the airport.",
      low:
        "Lower pressure increases density altitude and can come with unsettled weather, reducing performance margins.",
      high:
        "Higher pressure generally improves aircraft performance and often accompanies more stable weather.",
      normal:
        "Pressure is near standard range, so altimeter setting is important but not a major performance driver.",
    },
    ceilingPara: {
      unknown: "No limiting ceiling or visibility value is available in the current METAR.",
      low: "Low ceiling can push arrivals toward instrument procedures and reduce visual runway flexibility.",
      reducedVis:
        "Reduced visibility can increase spacing and make surface movement more dependent on tower guidance.",
      comfortable:
        "Ceiling and visibility are comfortably above the usual VFR thresholds for airport operations.",
    },
    code: {
      unknown: "Current conditions",
      0: "Clear",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Rime fog",
      51: "Light drizzle",
      53: "Drizzle",
      55: "Dense drizzle",
      61: "Light rain",
      63: "Rain",
      65: "Heavy rain",
      71: "Light snow",
      73: "Snow",
      75: "Heavy snow",
      80: "Rain showers",
      81: "Rain showers",
      82: "Heavy showers",
      95: "Thunderstorm",
    },
  },
  panels: {
    wikiKicker: "Airport wiki",
    wikiLoading: "Loading airport introduction...",
    wikiMissing:
      "No Wikipedia summary was found for this airport. The rest of the dashboard remains live.",
    wikiSource: "Source: Wikipedia summary API",
    wiki: "Wiki",
    openWikipedia: "Open Wikipedia",
    trafficKicker: "Airport traffic",
    nearbyAircraft: "Nearby aircraft",
    total: "Total",
    departures: "Departures",
    arrivals: "Arrivals",
    unknown: "Unknown",
    traffic: "Traffic",
  },
  changelog: {
    title: "Changelog",
    description: "Currently shipping {version}.",
    descriptionFallback: "",
    releases: "Releases",
    total: "{count} total",
    current: "Current",
    kindFeat: "FEAT",
    kindPatch: "PATCH",
    kindBreaking: "BREAKING",
  },
  weatherCopy: {
    panel: {
      metar: { label: "METAR", title: "METAR report", eyebrow: "METAR / Weather" },
      rules: { label: "Rules", title: "Flight rules", eyebrow: "Operational context" },
      ceiling: { label: "Ceiling", title: "Ceiling / visibility", eyebrow: "Cloud deck" },
      wind: { label: "Wind", title: "Wind speed", eyebrow: "Surface flow" },
      temp: { label: "Temp", title: "Temp / dew", eyebrow: "Thermal spread" },
      pressure: { label: "Pressure", title: "Pressure", eyebrow: "Altimeter" },
      local: { label: "Local", title: "Local weather", eyebrow: "Open-Meteo" },
    },
    carousel: {
      metar: { label: "METAR", navLabel: "METAR", title: "Raw METAR" },
      rules: { label: "Rules", navLabel: "RULE", title: "Flight rules" },
      ceiling: { label: "Ceiling", navLabel: "C/V", title: "Ceiling / visibility" },
      wind: { label: "Wind", navLabel: "WIND", title: "Wind" },
      temp: { label: "Temp", navLabel: "TEMP", title: "Temperature" },
      pressure: { label: "Pressure", navLabel: "ALT", title: "Altimeter" },
      local: { label: "Local", navLabel: "LOCAL", title: "Local conditions" },
    },
  },
};

export default en;

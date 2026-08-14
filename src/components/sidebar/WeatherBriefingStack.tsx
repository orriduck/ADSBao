import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Eye,
  Gauge,
  Moon,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import WayfindingMetric from "@/components/ui/WayfindingMetric";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import {
  convertTemperatureFromC,
  temperatureUnitLabel,
} from "@/utils/units";
import { FLIGHT_RULES } from "@/config/weather";
import {
  describeCeilingKey,
  getCeilingFeet,
  getMetarTokens,
  getWeatherConditionKey,
  toNumber,
} from "@/features/weather/weatherModel";
import {
  FLIGHT_RULE_SEQUENCE,
  ceilingCode,
  relativeHumidity,
  temperatureRangePct,
  temperatureTrendKey,
  upcomingPrecip,
  uvLevelKey,
  weatherGlyphKey,
} from "@/features/weather/weatherDisplayModel";

const GLYPHS = {
  sun: Sun,
  moon: Moon,
  cloudSun: CloudSun,
  cloudMoon: CloudMoon,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  thunder: CloudLightning,
};

const up = (value) => String(value ?? "").toUpperCase();

// Two audiences, two densities, one card grammar. Each view leads with a
// single colour-encoded hero card (flight-rules category for METAR, the
// temperature scale for Local) over a quiet decoded metric area. The colour
// is data-driven and never the product's orange signal accent.
export default function WeatherBriefingStack({
  metar = null,
  metarRaw = "",
  metarLoading = false,
  localWeather = null,
  localWeatherLoading = false,
  view = "local",
}) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();

  return (
    <div className="pb-7">
      <div key={view} className="app-panel-transition flex flex-col">
        {view === "metar" ? (
          <MetarView
            metar={metar}
            metarRaw={metarRaw}
            metarLoading={metarLoading}
            t={t}
            units={units}
          />
        ) : (
          <LocalView
            local={localWeather}
            loading={localWeatherLoading}
            t={t}
            units={units}
          />
        )}
      </div>
    </div>
  );
}

// Shared hero card: a left rail + soft tinted background, both keyed to one
// data-driven colour. Children own the value / caption / interpretation.
function HeroCard({ icon, children }) {
  return (
    <div className="weather-wayfinding-hero flex min-h-[132px] overflow-hidden border-b border-[var(--airport-wayfinding-divider)]">
      <span
        aria-hidden="true"
        className="flex w-[var(--airport-wayfinding-rail-width)] shrink-0 items-start justify-center bg-[var(--airport-wayfinding-neutral-rail)] pt-3 text-[var(--airport-wayfinding-neutral-rail-fg)] [&>svg]:size-4"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 bg-[var(--airport-wayfinding-content)] px-4 py-5">
        {children}
      </div>
    </div>
  );
}

function MetricCell({ icon, label, value }) {
  return <WayfindingMetric icon={icon} title={label} value={value} readOnly />;
}

function MetricGrid({ children }) {
  return (
    <div className="weather-wayfinding-grid grid grid-cols-2 gap-px bg-[var(--airport-wayfinding-divider)]">
      {children}
    </div>
  );
}

function WeatherGlyph({ glyph, ...props }) {
  const Icon = GLYPHS[glyph] || Cloud;
  return <Icon {...props} />;
}

// ── METAR view ──────────────────────────────────────────────────────────────
function MetarView({ metar, metarRaw, metarLoading, t, units }) {
  const category = metar?.flightCategory || null;
  const rules = category ? FLIGHT_RULES[category] : null;
  // Index of the current category in the VFR→LIFR scale; -1 when unknown.
  // Drives how far the progress bar fills.
  const level = FLIGHT_RULE_SEQUENCE.findIndex((item) => item === category);
  const label = rules
    ? t(rules.labelKey)
    : metarLoading
      ? t("weather.metarLoading")
      : t("weather.metarMissing");
  const context = rules ? t(rules.contextKey) : "";

  const dir = metar?.rawWvrb
    ? "VRB"
    : toNumber(metar?.rawWdir) != null
      ? `${Math.round(toNumber(metar.rawWdir))}°`
      : "—";
  const speed = toNumber(metar?.rawWspd);
  const windValue =
    speed == null ? dir : `${dir} ${Math.round(speed)}`;
  const visib = toNumber(metar?.rawVisib);
  // `vis` is the model's display string ("10 SM"); fall back to the numeric.
  const visValue =
    metar?.vis && metar.vis !== "-"
      ? metar.vis
      : visib == null
        ? "—"
        : `${visib} SM`;
  const ceil = metar ? ceilingCode(metar) : "—";
  const rawTemp = toNumber(metar?.rawTemp);
  const rawDew = toNumber(metar?.rawDewp);
  const tempDew =
    rawTemp == null
      ? "—"
      : `${degree(rawTemp, units)} / ${rawDew == null ? "—" : degree(rawDew, units)}`;
  const altim = toNumber(metar?.rawAltim);
  // AviationWeather reports `altim` in hPa (~1018); the cockpit/mock value is
  // inHg (~30.06). Convert when the magnitude reads as hPa.
  const altValue =
    altim == null ? "—" : (altim > 100 ? altim / 33.8639 : altim).toFixed(2);
  const humidity = relativeHumidity(rawTemp, rawDew);
  const humidityValue = humidity == null ? "—" : `${humidity}%`;

  const issued =
    getMetarTokens(metarRaw).find((tk) => tk.labelKey === "weather.metarToken.issued")
      ?.value || "";
  const ceilingFt = metar ? getCeilingFeet(metar) : null;
  const interpretation = t(describeCeilingKey(ceilingFt, visib));

  return (
    <>
      <HeroCard
        icon={category && level >= 0 ? <CloudFog /> : <Cloud />}
      >
        {/* Abbreviation + subtitle; the rail uses the same standard icon scale as every metric. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="text-[calc(40px*var(--sb-body-scale))] leading-none tracking-[-0.025em] text-atc-text"
            >
              {category || "—"}
            </div>
            <div
              className="mt-2 text-[calc(13px*var(--sb-body-scale))] leading-snug text-atc-dim"
            >
              {label}
            </div>
          </div>
        </div>
        {/* Progress bar — fills to the current category's level. */}
        <div className="mt-3.5 flex gap-1.5" aria-hidden="true">
          {FLIGHT_RULE_SEQUENCE.map((item, i) => {
            const on = level >= 0 && i <= level;
            return (
              <span
                key={item}
                className={`frule-seg${on ? " frule-seg--on" : ""}`}
                style={on ? { "--c": "var(--atc-text)", "--dl": `${0.5 + i * 0.08}s` } : undefined}
              />
            );
          })}
        </div>
        <div
          className="mt-[7px] flex justify-between text-[calc(9px*var(--sb-body-scale))] [letter-spacing:0.04em]"
          aria-hidden="true"
        >
          {FLIGHT_RULE_SEQUENCE.map((item) => {
            const active = item === category;
            return (
              <span
                key={item}
                className={active ? "text-atc-text" : "opacity-30"}
              >
                {item}
              </span>
            );
          })}
        </div>
        {context ? (
          <p className="mt-3.5 text-[calc(12.5px*var(--sb-body-scale))] leading-snug text-atc-dim">
            {context}
          </p>
        ) : null}
      </HeroCard>

      <MetricGrid>
        <MetricCell icon={<Wind />} label={t("weather.wind")} value={windValue} />
        <MetricCell icon={<Eye />} label={t("weather.visibility")} value={visValue} />
        <MetricCell icon={<Cloud />} label={t("weather.ceiling")} value={ceil} />
        <MetricCell
          icon={<Thermometer />}
          label={`${t("weather.temp")} / ${t("weather.dew")}`}
          value={tempDew}
        />
        <MetricCell icon={<Gauge />} label={t("weather.altimeter")} value={altValue} />
        <MetricCell icon={<Droplets />} label={t("weather.humidity")} value={humidityValue} />
      </MetricGrid>

      <div className="border-b border-[var(--airport-wayfinding-divider)] bg-[var(--airport-wayfinding-content)] px-[var(--airport-sidebar-inset)] py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[calc(9.5px*var(--sb-body-scale))] text-atc-faint [letter-spacing:0.08em]">
            {up(t("weather.rawReport"))}
          </span>
          {issued ? (
            <span className="notranslate font-mono text-[calc(10px*var(--sb-body-scale))] text-atc-faint">
              {issued}
            </span>
          ) : null}
        </div>
        <code className="notranslate mt-2 block font-mono text-[calc(11.5px*var(--sb-body-scale))] leading-relaxed text-atc-dim">
          {metarRaw || t("weather.metarMissing")}
        </code>
      </div>

      <div className="bg-[var(--airport-wayfinding-content)] px-[var(--airport-sidebar-inset)] py-4">
        <div className="flex gap-7">
          <IconStat
            icon={<Cloud size={14} strokeWidth={1.8} />}
            label={t("weather.ceiling")}
            value={
              ceilingFt == null
                ? metar
                  ? "CLR"
                  : "—"
                : `${ceilingFt.toLocaleString()} ft`
            }
          />
          <IconStat
            icon={<Eye size={14} strokeWidth={1.8} />}
            label={t("weather.visibility")}
            value={visValue}
          />
        </div>
        <p className="mt-3 text-[calc(12px*var(--sb-body-scale))] leading-snug text-atc-dim">
          {interpretation}
        </p>
      </div>
    </>
  );
}

function IconStat({ icon, label, value }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-atc-faint">
        <span className="flex-none">{icon}</span>
        <span className="text-[calc(9px*var(--sb-body-scale))] [letter-spacing:0.08em]">{up(label)}</span>
      </div>
      <div className="notranslate mt-1 font-mono text-[calc(14px*var(--sb-body-scale))] tabular-nums text-atc-text">
        {value}
      </div>
    </div>
  );
}

// ── Local view ──────────────────────────────────────────────────────────────
function LocalView({ local, loading, t, units }) {
  const tempC = local?.temperatureC;
  const tempValue =
    tempC == null
      ? loading
        ? "…"
        : "—"
      : `${Math.round(convertTemperatureFromC(tempC, units.temperature))}`;
  const unitLabel = temperatureUnitLabel(units.temperature);
  const glyph = weatherGlyphKey(local?.weatherCode, local?.isDay !== false);
  const rangePct = temperatureRangePct(tempC);
  const condition = local
    ? t(getWeatherConditionKey(local.weatherCode))
    : t("weather.pending");
  const feels = local?.apparentTemperatureC;
  const feelsText =
    feels == null
      ? ""
      : t("weather.feelsLike", { value: degree(feels, units) });
  const trendKey = temperatureTrendKey(tempC, local?.hourly);
  const heroLine = [condition, feelsText].filter(Boolean).join(" · ");

  const windMph =
    local?.windSpeedKt == null
      ? "—"
      : `${Math.round(Number(local.windSpeedKt) * 1.15078)} mph`;
  const humidity =
    local?.humidity == null ? "—" : `${Math.round(local.humidity)}%`;
  const uv = toNumber(local?.uvIndex);
  const uvValue =
    uv == null ? "—" : `${Math.round(uv)} ${t(uvLevelKey(uv))}`.trim();
  const precipProb = toNumber(local?.hourly?.[0]?.precipitationProbability);
  const precipValue = precipProb == null ? "—" : `${Math.round(precipProb)}%`;
  const pressure =
    local?.pressureMslHpa == null ? "—" : `${Math.round(local.pressureMslHpa)}`;
  const visKm =
    local?.visibilityFt == null
      ? "—"
      : `${Math.round(Number(local.visibilityFt) * 0.0003048)} km`;

  const hours = local?.hourly ?? [];
  const summary = local
    ? `${condition} ${t("weather.now")}${
        upcomingPrecip(hours) ? `, ${t("weather.showersLater")}` : ""
      }.`
    : "";

  return (
    <>
      <HeroCard
        icon={
          <WeatherGlyph glyph={glyph} size={16} strokeWidth={1.7} />
        }
      >
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-1.5">
            <span
              className="notranslate text-[calc(44px*var(--sb-body-scale))] leading-none tracking-[-0.025em] text-atc-text"
            >
              {tempValue}
            </span>
            <span className="text-[calc(14px*var(--sb-body-scale))] text-atc-dim">
              {unitLabel}
            </span>
          </div>
        </div>
        <div className="mt-3.5 h-1 overflow-hidden rounded-full bg-[var(--atc-line)]">
          {rangePct != null ? (
            <div
              className="h-full rounded-full"
              style={{ width: `${rangePct * 100}%`, background: "var(--atc-text)" }}
            />
          ) : null}
        </div>
        <p className="mt-3.5 text-[calc(12.5px*var(--sb-body-scale))] leading-snug text-atc-dim">
          {heroLine}
          {trendKey ? `. ${t(trendKey)}` : heroLine ? "." : null}
        </p>
      </HeroCard>

      <MetricGrid>
        <MetricCell icon={<Wind />} label={t("weather.wind")} value={windMph} />
        <MetricCell icon={<Droplets />} label={t("weather.humidity")} value={humidity} />
        <MetricCell icon={<Sun />} label={t("weather.uvIndex")} value={uvValue} />
        <MetricCell icon={<CloudRain />} label={t("weather.precip")} value={precipValue} />
        <MetricCell icon={<Gauge />} label={t("weather.pressure")} value={pressure} />
        <MetricCell icon={<Eye />} label={t("weather.visibility")} value={visKm} />
      </MetricGrid>

      {hours.length > 0 ? (
        <div className="border-b border-[var(--airport-wayfinding-divider)] bg-[var(--airport-wayfinding-content)] px-[var(--airport-sidebar-inset)] py-4">
          <div className="text-[calc(9.5px*var(--sb-body-scale))] text-atc-faint [letter-spacing:0.08em]">
            {up(t("weather.nextHours"))}
          </div>
          <div className="mt-2.5 grid grid-cols-6 gap-1">
            {hours.map((hour, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-1.5"
              >
                <span className="text-[calc(10px*var(--sb-body-scale))] text-atc-faint">
                  {index === 0 ? t("weather.now") : String(hour.time).split(":")[0]}
                </span>
                <WeatherGlyph
                  glyph={weatherGlyphKey(hour.weatherCode, true)}
                  size={15}
                  strokeWidth={1.7}
                  className="text-atc-dim"
                />
                <span className="notranslate font-mono text-[calc(12px*var(--sb-body-scale))] tabular-nums text-atc-text">
                  {hour.temperatureC == null
                    ? "—"
                    : `${Math.round(convertTemperatureFromC(hour.temperatureC, units.temperature))}°`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {summary ? (
        <p className="bg-[var(--airport-wayfinding-content)] px-[var(--airport-sidebar-inset)] py-4 text-[calc(12.5px*var(--sb-body-scale))] leading-snug text-atc-dim">
          {summary}
        </p>
      ) : null}
    </>
  );
}

// Degree-only temperature (mock convention), respecting the unit preference.
function degree(celsius, units) {
  if (celsius == null || !Number.isFinite(Number(celsius))) return "—";
  return `${Math.round(convertTemperatureFromC(Number(celsius), units.temperature))}°`;
}

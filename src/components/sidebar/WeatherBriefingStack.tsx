import { useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Eye,
  Moon,
  Sun,
} from "lucide-react";
import { useLocalWeather } from "@/hooks/useLocalWeather";
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
  flightRuleColor,
  relativeHumidity,
  temperatureColor,
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
  airportLat = 0,
  airportLon = 0,
  nearMe = false,
}) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const [view, setView] = useState("metar");
  const { weather: local, loading: localLoading } = useLocalWeather(
    airportLat,
    airportLon,
  );
  const effectiveView = nearMe ? "local" : view;

  return (
    <div className="flex flex-col gap-4 px-[var(--airport-sidebar-inset)] pb-7 pt-3.5">
      {!nearMe ? (
        <WeatherSegment view={effectiveView} onChange={setView} t={t} />
      ) : null}

      <div key={effectiveView} className="app-panel-transition flex flex-col gap-5">
        {effectiveView === "metar" ? (
          <MetarView
            metar={metar}
            metarRaw={metarRaw}
            metarLoading={metarLoading}
            t={t}
            units={units}
          />
        ) : (
          <LocalView
            local={local}
            loading={localLoading}
            t={t}
            units={units}
          />
        )}
      </div>
    </div>
  );
}

// Neutral iOS-style segmented control: a faint pill track with a raised milky
// chip for the active view and dim text for the inactive one. Never the accent.
function WeatherSegment({ view, onChange, t }) {
  const items = [
    { id: "metar", label: "METAR" },
    { id: "local", label: t("weather.local") },
  ];
  return (
    <div
      role="tablist"
      aria-label={t("panels.weather")}
      className="grid grid-cols-2 gap-1 rounded-[var(--atc-radius-pill)] border border-[var(--app-frost-border)] bg-[color-mix(in_oklab,var(--atc-text)_5%,transparent)] p-1"
    >
      {items.map((item) => {
        const active = view === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active ? "true" : undefined}
            onClick={() => onChange(item.id)}
            className="rounded-[calc(var(--atc-radius-pill)_-_4px)] px-3 py-1.5 text-center text-[calc(12px*var(--sb-body-scale))] text-atc-dim transition-[background,color,box-shadow] duration-200 hover:text-atc-text data-[active=true]:bg-[var(--atc-control-surface)] data-[active=true]:text-atc-text data-[active=true]:shadow-[var(--atc-control-inset-shadow)]"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// Shared hero card: a left rail + soft tinted background, both keyed to one
// data-driven colour. Children own the value / caption / interpretation.
function HeroCard({ color, children }) {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--atc-radius-card)] py-4 pl-[18px] pr-4"
      style={{ background: `color-mix(in oklab, ${color} 8%, transparent)` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px] rounded-r"
        style={{ background: color }}
      />
      {children}
    </div>
  );
}

function MetricCell({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[calc(9.5px*var(--sb-body-scale))] text-atc-faint [letter-spacing:0.08em]">
        {up(label)}
      </div>
      <div className="notranslate mt-1 font-mono text-[calc(15.5px*var(--sb-body-scale))] tabular-nums text-atc-text">
        {value}
      </div>
    </div>
  );
}

function MetricGrid({ children }) {
  return <div className="grid grid-cols-3 gap-x-3 gap-y-3.5">{children}</div>;
}

function WeatherGlyph({ glyph, ...props }) {
  const Icon = GLYPHS[glyph] || Cloud;
  return <Icon {...props} />;
}

// ── METAR view ──────────────────────────────────────────────────────────────
function MetarView({ metar, metarRaw, metarLoading, t, units }) {
  const category = metar?.flightCategory || null;
  const rules = category ? FLIGHT_RULES[category] : null;
  const color = flightRuleColor(category);
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
      <HeroCard color={color}>
        <div>
          <div
            className="text-[calc(40px*var(--sb-body-scale))] font-light leading-none"
            style={{ color }}
          >
            {category || "—"}
          </div>
          <div
            className="mt-2 text-[calc(13px*var(--sb-body-scale))] lowercase leading-snug"
            style={{ color }}
          >
            {label}
          </div>
        </div>
        <div className="mt-3.5 flex gap-1.5" aria-hidden="true">
          {FLIGHT_RULE_SEQUENCE.map((item) => (
            <span
              key={item}
              className="h-1 flex-1 rounded-full"
              style={{
                background: item === category ? color : "var(--atc-line)",
              }}
            />
          ))}
        </div>
        {context ? (
          <p className="mt-3.5 text-[calc(12.5px*var(--sb-body-scale))] leading-snug text-atc-dim">
            {context}
          </p>
        ) : null}
      </HeroCard>

      <MetricGrid>
        <MetricCell label={t("weather.wind")} value={windValue} />
        <MetricCell label={t("weather.visibility")} value={visValue} />
        <MetricCell label={t("weather.ceiling")} value={ceil} />
        <MetricCell
          label={`${t("weather.temp")} / ${t("weather.dew")}`}
          value={tempDew}
        />
        <MetricCell label={t("weather.altimeter")} value={altValue} />
        <MetricCell label={t("weather.humidity")} value={humidityValue} />
      </MetricGrid>

      <div>
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

      <div className="border-t border-[var(--atc-line)] pt-4">
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
  const color = temperatureColor(tempC);
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
      <HeroCard color={color}>
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-1.5">
            <span
              className="notranslate text-[calc(44px*var(--sb-body-scale))] font-light leading-none"
              style={{ color }}
            >
              {tempValue}
            </span>
            <span className="text-[calc(14px*var(--sb-body-scale))]" style={{ color }}>
              {unitLabel}
            </span>
          </div>
          <WeatherGlyph
            glyph={glyph}
            size={32}
            strokeWidth={1.6}
            style={{ color }}
          />
        </div>
        <div className="mt-3.5 h-1 overflow-hidden rounded-full bg-[var(--atc-line)]">
          {rangePct != null ? (
            <div
              className="h-full rounded-full"
              style={{ width: `${rangePct * 100}%`, background: color }}
            />
          ) : null}
        </div>
        <p className="mt-3.5 text-[calc(12.5px*var(--sb-body-scale))] leading-snug text-atc-dim">
          {heroLine}
          {trendKey ? `. ${t(trendKey)}` : heroLine ? "." : null}
        </p>
      </HeroCard>

      <MetricGrid>
        <MetricCell label={t("weather.wind")} value={windMph} />
        <MetricCell label={t("weather.humidity")} value={humidity} />
        <MetricCell label={t("weather.uvIndex")} value={uvValue} />
        <MetricCell label={t("weather.precip")} value={precipValue} />
        <MetricCell label={t("weather.pressure")} value={pressure} />
        <MetricCell label={t("weather.visibility")} value={visKm} />
      </MetricGrid>

      {hours.length > 0 ? (
        <div>
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
        <p className="border-t border-[var(--atc-line)] pt-4 text-[calc(12.5px*var(--sb-body-scale))] leading-snug text-atc-dim">
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

import NumberFlow from "@number-flow/react";
import { RadioTower } from "lucide-react";
import { toFiniteNumber } from "@/utils/math";
import { formatNavaidFrequency } from "./navaidPreviewFormat";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  MobilePreviewContent,
  MobilePreviewIdentity,
  MobilePreviewMetaChip,
  MobilePreviewMetaChips,
  MobilePreviewRuleRow,
} from "./MobilePreviewCard";

type NavaidPreviewMobileCardProps = {
  navaid?: Record<string, any> | null;
};

export default function NavaidPreviewMobileCard({
  navaid,
}: NavaidPreviewMobileCardProps) {
  const { t } = useI18n();
  const ident = String(navaid?.ident || "").trim().toUpperCase() || "—";
  const type = String(navaid?.type || "").trim().toUpperCase();
  const name = String(navaid?.name || ident).trim();
  const distance = toFiniteNumber(navaid?.distanceNm);
  const frequency = formatNavaidFrequency(navaid?.frequencyKhz);
  const dmeChannel = String(navaid?.dme?.channel || "").trim();
  const hasStats = Boolean(distance != null || frequency || dmeChannel);

  return (
    <MobilePreviewContent>
      <MobilePreviewIdentity
        icon={RadioTower}
        label={t("preview.navaidPreview")}
        primary={ident}
        secondary={type}
      />
      {(name || hasStats) ? (
        <MobilePreviewRuleRow
          left={name ? <span className="block min-w-0 truncate whitespace-nowrap">{name}</span> : null}
          right={
            <MobilePreviewMetaChips>
              {frequency ? (
                <MobilePreviewMetaChip>
                  <Stat plain={frequency} />
                </MobilePreviewMetaChip>
              ) : null}
              {distance != null ? (
                <MobilePreviewMetaChip>
                  <Stat
                    value={distance}
                    unit="NM"
                    format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
                  />
                </MobilePreviewMetaChip>
              ) : null}
              {dmeChannel ? (
                <MobilePreviewMetaChip>
                  <Stat plain={dmeChannel} />
                </MobilePreviewMetaChip>
              ) : null}
            </MobilePreviewMetaChips>
          }
        />
      ) : null}
    </MobilePreviewContent>
  );
}

function Stat({
  value = 0,
  unit = "",
  plain = "",
  format,
}: Record<string, any>) {
  if (plain) {
    return (
      <span className="notranslate tabular-nums">
        {plain}
      </span>
    );
  }

  return (
    <>
      <NumberFlow
        value={value}
        format={format}
        className="tabular-nums"
      />
      <span
        translate="no"
        className="notranslate text-[8px] font-medium uppercase text-atc-faint"
      >
        {unit}
      </span>
    </>
  );
}

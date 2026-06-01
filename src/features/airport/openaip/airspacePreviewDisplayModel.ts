type AirspacePreviewRecord = Record<string, any>;

type AirspacePreviewLocale = "en" | "zh-CN" | string;

const ZH_AIRSPACE_TYPE_LABELS: Record<string, string> = {
  "Other": "其他空域",
  "Restricted Area": "限制区",
  "Danger Area": "危险区",
  "Prohibited Area": "禁止区",
  "CTR": "管制区 (CTR)",
  "TMZ": "应答机强制区 (TMZ)",
  "RMZ": "无线电强制区 (RMZ)",
  "TMA": "终端管制区 (TMA)",
  "TRA": "临时保留区 (TRA)",
  "TSA": "临时隔离区 (TSA)",
  "FIR": "飞行情报区 (FIR)",
  "UIR": "高空飞行情报区 (UIR)",
  "ADIZ": "防空识别区 (ADIZ)",
  "ATZ": "机场交通区 (ATZ)",
  "MATZ": "军用机场交通区 (MATZ)",
  "Airway": "航路",
  "Military Training Route": "军用训练航线",
  "Alert Area": "警戒区",
  "Warning Area": "警告区",
  "Protected Area": "保护区",
  "Gliding Sector": "滑翔活动区",
  "Military Training Area": "军用训练区",
  "CTA": "管制区 (CTA)",
  "ACC Sector": "区域管制扇区",
  "Aerial Sporting / Recreational Activity": "航空运动/娱乐活动区",
  "Low Altitude Overflight Restriction": "低空飞越限制区",
  "Military Route": "军用航线",
  "TSA/TRA Feeding Route": "TSA/TRA 进离场航线",
  "VFR Sector": "VFR 扇区",
  "FIS Sector": "飞行情报服务扇区",
  "LTA": "低空管制区 (LTA)",
  "UTA": "高空管制区 (UTA)",
  "MCTR": "军用管制区 (MCTR)",
};

const ZH_ACCESS_LABELS: Record<string, string> = {
  blocked: "禁止进入",
  restricted: "受限空域",
  "permission-required": "需许可/协调",
  caution: "避让/谨慎进入",
  controlled: "管制空域",
  informational: "信息提示",
  unknown: "状态未明",
};

const EN_CLASS_DESCRIPTIONS: Record<string, string> = {
  A: "Class A is highly controlled airspace. Operations are normally IFR only and require ATC clearance, continuous communication, and the required equipment.",
  B: "Class B protects the busiest terminal areas. ATC clearance is required before entry, and ATC separates participating IFR and VFR traffic.",
  C: "Class C surrounds busy towered airports with approach control. Two-way radio communication is required before entry; ATC separates IFR traffic and provides traffic services to VFR.",
  D: "Class D usually surrounds a towered airport. Establish two-way radio communication before entry; ATC separates IFR traffic and provides traffic information or instructions to VFR.",
  E: "Class E is controlled airspace used for IFR routes, approaches, and transitions that are not Class A, B, C, or D. VFR can usually enter without an explicit clearance where local rules allow.",
  F: "Class F is an ICAO advisory or special-use class used by some states. Check the published type, activity time, NOTAM, and local procedures before entry.",
  G: "Class G is uncontrolled airspace. ATC does not control traffic separation there; pilots remain responsible for terrain, weather, and traffic avoidance.",
  "Unclassified / SUA": "This is unclassified or special-use airspace rather than a standard A-G service class. Follow the published type, active time, NOTAM, and controlling authority procedures.",
};

const ZH_CLASS_DESCRIPTIONS: Record<string, string> = {
  A: "A 类空域是管制最严格的空域，通常仅供 IFR 飞行使用；进入前需要 ATC 放行，并保持双向通信和规定设备工作。",
  B: "B 类空域用于保护最繁忙的终端区。进入前需要 ATC 放行，ATC 会对参与管制的 IFR 和 VFR 交通提供间隔。",
  C: "C 类空域通常围绕繁忙的有塔台机场，并由进近管制提供服务。进入前需要建立双向无线电通信；ATC 对 IFR 提供间隔，并向 VFR 提供交通服务。",
  D: "D 类空域通常围绕有塔台机场。进入前需要与塔台建立双向无线电通信；ATC 对 IFR 提供间隔，并向 VFR 提供交通信息或指令。",
  E: "E 类空域是未划为 A/B/C/D 的管制空域，常用于 IFR 航路、进近和过渡。VFR 通常可按当地规则进入，但仍需遵守云距、能见度和设备要求。",
  F: "F 类空域在部分国家用于咨询空域或特殊用途空域。进入前应核对具体类型、活动时间、NOTAM 和当地程序。",
  G: "G 类为空域未被划入 A-F 时的非管制空域。ATC 不负责提供交通间隔，飞行员需自行保持地形、天气和目视避让。",
  "Unclassified / SUA": "未分类/特殊用途空域不是标准 A-G 服务等级；实际进入规则取决于图上类型、活动时段、NOTAM 和管制单位要求。",
};

const EN_TYPE_DESCRIPTIONS: Record<string, string> = {
  "Danger Area": "Danger areas can contain activities hazardous to aircraft. Civil traffic should avoid entry unless the current status and controlling authority procedures are confirmed.",
  "Restricted Area": "Restricted areas limit entry while active. Confirm current status and obtain the required clearance or authorization before entering.",
  "Prohibited Area": "Prohibited areas are established for security or safety reasons. Do not enter unless explicit authorization applies.",
  "ADIZ": "An ADIZ may require identification, flight plan, communication, or reporting procedures before crossing.",
};

const ZH_TYPE_DESCRIPTIONS: Record<string, string> = {
  "Danger Area": "危险区可能存在射击、训练、跳伞等对航空器有危险的活动。民航通常应避让；进入前必须确认当前状态、活动时段和管制单位程序。",
  "Restricted Area": "限制区在活动时会限制进入。进入前应确认当前状态，并取得所需放行、许可或管制单位同意。",
  "Prohibited Area": "禁止区通常因安全或保安原因设立。除非有明确授权，否则不得进入。",
  "ADIZ": "防空识别区可能要求飞行计划、身份识别、无线电通信或位置报告等程序；穿越前应确认当地要求。",
};

const isZh = (locale: AirspacePreviewLocale) => String(locale).toLowerCase().startsWith("zh");

export function resolveAirspacePreviewDisplay(
  airspace: AirspacePreviewRecord | null | undefined,
  locale: AirspacePreviewLocale = "en",
) {
  const zh = isZh(locale);
  const typeLabel = String(airspace?.typeLabel || "Airspace").trim();
  const classLabel = String(airspace?.classLabel || "").trim();
  const level = String(airspace?.accessTag?.level || "unknown");

  return {
    type: zh ? ZH_AIRSPACE_TYPE_LABELS[typeLabel] || typeLabel : typeLabel,
    access: zh
      ? ZH_ACCESS_LABELS[level] || "状态未明"
      : String(airspace?.accessTag?.label || airspace?.accessTag?.shortLabel || "").trim(),
    classLabel: formatClassLabel(classLabel, zh),
    lowerLimit: formatLimit(airspace?.lowerLimitLabel, zh),
    upperLimit: formatLimit(airspace?.upperLimitLabel, zh),
    vertical: formatVerticalRange({
      lower: airspace?.lowerLimitLabel,
      upper: airspace?.upperLimitLabel,
      zh,
    }),
    description:
      typeDescription(typeLabel, zh) ||
      classDescription(classLabel, zh) ||
      (zh
        ? "OpenAIP 未提供足够的准入规则；进入前应核对航图、NOTAM 和当地管制程序。"
        : "OpenAIP does not provide enough access context; check charts, NOTAM, and local procedures before entry."),
  };
}

function formatClassLabel(classLabel: string, zh: boolean) {
  if (!classLabel) return "";
  if (!zh) return classLabel;
  if (/^[A-G]$/.test(classLabel)) return `${classLabel} 类`;
  if (classLabel === "Unclassified / SUA") return "未分类 / 特殊用途空域";
  return classLabel;
}

function classDescription(classLabel: string, zh: boolean) {
  const descriptions = zh ? ZH_CLASS_DESCRIPTIONS : EN_CLASS_DESCRIPTIONS;
  return descriptions[classLabel] || "";
}

function typeDescription(typeLabel: string, zh: boolean) {
  const descriptions = zh ? ZH_TYPE_DESCRIPTIONS : EN_TYPE_DESCRIPTIONS;
  return descriptions[typeLabel] || "";
}

function formatVerticalRange({
  lower = "",
  upper = "",
  zh,
}: {
  lower?: unknown;
  upper?: unknown;
  zh: boolean;
}) {
  const lowerLabel = formatLimit(lower, zh);
  const upperLabel = formatLimit(upper, zh);
  return [lowerLabel, upperLabel].filter(Boolean).join(" - ");
}

function formatLimit(value: unknown, zh: boolean) {
  const label = String(value || "").trim();
  if (!zh) return label;
  if (label === "SFC") return "地表";
  const feetMsl = label.match(/^([\d,]+(?:\.\d+)?)\s*ft\s+MSL$/i);
  if (feetMsl) return `海平面以上 ${feetMsl[1]} ft`;
  const feetAgl = label.match(/^([\d,]+(?:\.\d+)?)\s*ft\s+AGL$/i);
  if (feetAgl) return `地面以上 ${feetAgl[1]} ft`;
  const meterMsl = label.match(/^([\d,]+(?:\.\d+)?)\s*m\s+MSL$/i);
  if (meterMsl) return `海平面以上 ${meterMsl[1]} m`;
  const meterAgl = label.match(/^([\d,]+(?:\.\d+)?)\s*m\s+AGL$/i);
  if (meterAgl) return `地面以上 ${meterAgl[1]} m`;
  const flightLevel = label.match(/^FL\s*([\d,]+(?:\.\d+)?)$/i);
  if (flightLevel) return `飞行高度层 FL ${flightLevel[1]}`;
  return label
    .replace(/\bSFC\b/g, "地表")
    .replace(/\bft\b/g, "ft")
    .replace(/\bm\b/g, "m")
    .replace(/\bMSL\b/g, "MSL")
    .replace(/\bAGL\b/g, "AGL")
    .replace(/\bSTD\b/g, "标准气压");
}

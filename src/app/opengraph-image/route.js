import { ImageResponse } from "next/og";
import {
  FEATURED_AIRPORT_CODES,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SOCIAL_IMAGE,
} from "@/config/site";

// Next.js ImageResponse renders through Satori, which doesn't support
// Tailwind utility classes or CSS variables — every visual lives in
// inline `style` objects. Tokens are hardcoded hex here to mirror the
// dark-theme values from style.css (--atc-bg / --atc-text / --primary-
// bright). If those tokens shift, update this file too.
// Pre-cached Google-hosted Saira faces. Only weights actually used in
// the layout below — keep them in sync if the visual changes.
const SAIRA_FONT_URLS = {
  400: "https://fonts.gstatic.com/s/saira/v23/memWYa2wxmKQyPMrZX79wwYZQMhsyuShhKMjjbU9uXuA71rCosg.ttf",
  700: "https://fonts.gstatic.com/s/saira/v23/memWYa2wxmKQyPMrZX79wwYZQMhsyuShhKMjjbU9uXuA773Fosg.ttf",
  900: "https://fonts.gstatic.com/s/saira/v23/memWYa2wxmKQyPMrZX79wwYZQMhsyuShhKMjjbU9uXuA7_PFosg.ttf",
};

const imageSize = {
  width: SITE_SOCIAL_IMAGE.width,
  height: SITE_SOCIAL_IMAGE.height,
};

const COLOR = {
  bg: "#0c0a08",
  card: "#15120f",
  border: "rgba(255, 230, 0, 0.08)",
  text: "#f5f3ee",
  dim: "#9a958a",
  faint: "#6c685e",
  accent: "#ffe600",
  // Black pill matching the airport map markers (KBOS / DIST 14NM style).
  pillBg: "#0a0907",
  pillText: "#f5f3ee",
  pillBorder: "rgba(255, 255, 255, 0.10)",
};

const sairaFonts = Promise.all(
  Object.entries(SAIRA_FONT_URLS).map(async ([weight, url]) => {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Failed to load Saira ${weight} font`);
    }

    return {
      name: "Saira",
      data: await response.arrayBuffer(),
      weight: Number(weight),
      style: "normal",
    };
  }),
);

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: COLOR.bg,
          // Top-left warm gradient — same 135deg language as the sidebar
          // identity and mobile preview card. Soft and short so the
          // hero typography still reads as the focal element.
          backgroundImage: `linear-gradient(135deg, rgba(255, 230, 0, 0.10), transparent 46%), linear-gradient(180deg, ${COLOR.card}, ${COLOR.bg})`,
          color: COLOR.text,
          padding: "72px 88px",
          fontFamily: "Saira, sans-serif",
        }}
      >
        {/* Top row: wordmark on the left, small eyebrow on the right.
            No diamond, no // prefix — the wordmark + accent dot is
            enough to read as ADSBao without the heavy decoration. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: COLOR.accent,
                marginRight: 6,
              }}
            />
            <span
              style={{
                fontSize: 56,
                fontWeight: 900,
                letterSpacing: -1,
                color: COLOR.text,
              }}
            >
              {SITE_NAME}
            </span>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              fontSize: 18,
              letterSpacing: 4,
              color: COLOR.faint,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Aviation Context
          </div>
        </div>

        {/* Headline. Smaller and tighter than the old < METAR · TRAFFIC ·
            MAP > slab. No yellow brackets — accent comes from the one
            colored word, mirroring how the sidebar identity treats the
            airport name vs. supporting metadata. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 26,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0 24px",
              fontSize: 92,
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 0.98,
              color: COLOR.text,
            }}
          >
            <span>Airport context,</span>
            <span style={{ color: COLOR.accent }}>at a glance.</span>
          </div>
          <div
            style={{
              maxWidth: 880,
              fontSize: 26,
              lineHeight: 1.4,
              color: COLOR.dim,
              fontWeight: 400,
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>

        {/* Featured airport pills — black rounded-rect badges that match
            the new map airport markers (e.g. KBOS / DIST 14NM). No skew,
            no yellow fill — the pills sit quietly so the hero owns the
            visual hierarchy. */}
        <div
          style={{
            display: "flex",
            gap: 12,
          }}
        >
          {FEATURED_AIRPORT_CODES.map((code) => (
            <div
              key={code}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 18px",
                background: COLOR.pillBg,
                color: COLOR.pillText,
                border: `1px solid ${COLOR.pillBorder}`,
                borderRadius: 999,
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 1.5,
              }}
            >
              {code}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...imageSize,
      fonts: await sairaFonts,
    },
  );
}

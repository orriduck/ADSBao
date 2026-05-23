import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SOCIAL_IMAGE } from "@/config/site";

const SAIRA_FONT_URLS = {
  400: "https://fonts.gstatic.com/s/saira/v23/memWYa2wxmKQyPMrZX79wwYZQMhsyuShhKMjjbU9uXuA71rCosg.ttf",
  700: "https://fonts.gstatic.com/s/saira/v23/memWYa2wxmKQyPMrZX79wwYZQMhsyuShhKMjjbU9uXuA773Fosg.ttf",
  900: "https://fonts.gstatic.com/s/saira/v23/memWYa2wxmKQyPMrZX79wwYZQMhsyuShhKMjjbU9uXuA7_PFosg.ttf",
};

const imageSize = {
  width: SITE_SOCIAL_IMAGE.width,
  height: SITE_SOCIAL_IMAGE.height,
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
          background: "#0e0f10",
          color: "#f5f3ee",
          padding: "60px 80px 48px",
          fontFamily: "Saira, sans-serif",
        }}
      >
        {/* Brand row: diamond + // ADSBAO wordmark + section label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              background: "#ffe600",
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              fontWeight: 900,
              letterSpacing: 2,
            }}
          >
            <span style={{ color: "#ffe600", fontSize: 52 }}>{"//"}</span>
            <span style={{ fontSize: 72, color: "#f5f3ee" }}>
              {SITE_NAME.toUpperCase()}
            </span>
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 24,
              letterSpacing: 6,
              color: "#9a9a96",
              textTransform: "uppercase",
            }}
          >
            Aviation Console
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div
            style={{
              fontSize: 108,
              fontWeight: 900,
              letterSpacing: 0,
              lineHeight: 0.92,
              color: "#f5f3ee",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            <span style={{ color: "#ffe600" }}>&lt;</span>
            <span>METAR · Traffic · Map</span>
            <span style={{ color: "#ffe600" }}>&gt;</span>
          </div>
          <div
            style={{
              width: 880,
              fontSize: 28,
              lineHeight: 1.35,
              color: "#b8b6ae",
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>

        {/* Yellow parallelogram chips for featured ICAOs */}
        <div
          style={{
            display: "flex",
            gap: 16,
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: 2,
          }}
        >
          {["KBOS", "KLAX", "KJFK", "KORD", "KSFO", "KSEA"].map((code) => (
            <div
              key={code}
              style={{
                display: "flex",
                background: "#ffe600",
                color: "#14140f",
                padding: "10px 22px",
                transform: "skewX(-18deg)",
              }}
            >
              <span style={{ display: "flex", transform: "skewX(18deg)" }}>
                {code}
              </span>
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
